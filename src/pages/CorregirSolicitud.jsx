import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { USUARIOS_ENDPOINT } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { switchToAccountByEmail, findSavedAccountByEmail } from '../services/accountSwitch';
import GeneroPicker from '../components/GeneroPicker';
import CategoriaBasePicker from '../components/CategoriaBasePicker';
import TallaPlayeraPicker from '../components/TallaPlayeraPicker';
import BotonSeguro from '../components/BotonSeguro';
import CuentasTransferenciaTrigger from '../components/CuentasTransferenciaTrigger';
import AtletifyLoader from '../components/AtletifyLoader';
import '../assets/css/Register.css';
import '../assets/css/CompletarRegistro.css';

const METODOS_PAGO = [
  { id: 'Efectivo',      label: 'Efectivo en recepción',  icon: 'fa-money-bill-wave', desc: 'Llegas al box y pagas en efectivo cuando la Coach te reciba.' },
  { id: 'Tarjeta',       label: 'Tarjeta en recepción',   icon: 'fa-credit-card',     desc: 'Pagarás con tarjeta presencialmente al llegar al box.' },
  { id: 'Transferencia', label: 'Transferencia bancaria', icon: 'fa-mobile-alt',      desc: 'Adjuntas el comprobante ahora mismo. Tu Coach validará el pago.' }
];

export default function CorregirSolicitud() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [searchParams] = useSearchParams();
  const correoEsperado = searchParams.get('correo')?.toLowerCase().trim() || null;
  const boxNombre = (() => {
    try {
      const b = JSON.parse(localStorage.getItem('box') || 'null');
      return b?.nombre || b?.Nombre || null;
    } catch { return null; }
  })();
  const boxIdLocal = (() => {
    try {
      const b = JSON.parse(localStorage.getItem('box') || 'null');
      return b?.idBox || b?.IdBox || null;
    } catch { return null; }
  })();
  const [loading, setLoading] = useState(true);
  const [usuarioDB, setUsuarioDB] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [modalExitoOpen, setModalExitoOpen] = useState(false);
  const [conflictoCuenta, setConflictoCuenta] = useState(null); // { correoActual, correoEsperado }

  const [formData, setFormData] = useState({
    nombre: '',
    apellidos: '',
    telefono: '',
    fechaNacimiento: '',
    categoriaBase: 'Novato',
    genero: '',
    peso: '',
    tallaPlayera: ''
  });
  const [metodoPago, setMetodoPago] = useState('Efectivo');
  const [comprobanteB64, setComprobanteB64] = useState('');
  const [comprobantePreview, setComprobantePreview] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem('usuario') || 'null');

    // Construir la URL de regreso (para que el login vuelva aquí con el correo en el link)
    const redirectBack = correoEsperado
      ? `/corregir-solicitud?correo=${encodeURIComponent(correoEsperado)}`
      : `/corregir-solicitud`;

    if (!u) {
      // No logueado → login con redirect de vuelta + correo prellenado si vino del email
      const params = new URLSearchParams();
      params.set('redirect', redirectBack);
      if (correoEsperado) params.set('correo', correoEsperado);
      navigate(`/login?${params.toString()}`, { replace: true });
      return;
    }

    const correoActual = (u.correo || '').toLowerCase().trim();

    // Si el correo del link no coincide con la sesión activa → conflicto.
    // Si la cuenta correcta ya está guardada en cuentasGuardadas, hacemos
    // el cambio automático y recargamos. Si no, mostramos el modal manual.
    if (correoEsperado && correoActual && correoEsperado !== correoActual) {
      if (switchToAccountByEmail(correoEsperado)) {
        window.location.reload();
        return;
      }
      setConflictoCuenta({ correoActual, correoEsperado });
      setLoading(false);
      return;
    }

    const idUsuario = u.id || u.idUsuario;
    (async () => {
      try {
        const res = await fetch(`${USUARIOS_ENDPOINT}/${idUsuario}`);
        if (!res.ok) throw new Error('No se pudo cargar el usuario');
        const data = await res.json();

        const rechazado = data.estatus === 'Rechazado' || data.estadoSolicitud === 'Rechazado';

        if (!rechazado) {
          // Si el usuario logueado NO está rechazado pero vino del correo de rechazo,
          // significa que está logueado con otra cuenta. Bloqueamos y pedimos cambiar.
          if (correoEsperado) {
            setConflictoCuenta({ correoActual: correoActual || data.correo || 'otra cuenta', correoEsperado });
            setLoading(false);
            return;
          }
          // No vino del correo y no está rechazado → mandar a su panel normal
          if (data.rol === 'Usuario') navigate('/sala-espera');
          else if (data.rol === 'Developer') navigate('/dashboard');
          else if (data.rol === 'AdminBox' || data.rol === 'Coach') navigate('/admin-box-panel');
          else navigate('/user-panel');
          return;
        }

        setUsuarioDB(data);
        setFormData({
          nombre: data.nombre || '',
          apellidos: data.apellidos || '',
          telefono: data.telefono || '',
          fechaNacimiento: data.fechaNacimiento ? data.fechaNacimiento.split('T')[0] : '',
          categoriaBase: data.categoriaBase || 'Novato',
          genero: data.genero || '',
          peso: data.peso ?? '',
          tallaPlayera: data.tallaPlayera || ''
        });
      } catch {
        showAlert('Error de conexión al cargar tu solicitud.');
      } finally {
        setLoading(false);
      }
    })();
  }, [navigate, correoEsperado]);

  const showAlert = (mensaje, tipo = 'danger') => {
    const a = { id: Date.now(), mensaje, tipo };
    setAlerts(prev => [...prev, a]);
    setTimeout(() => setAlerts(prev => prev.filter(x => x.id !== a.id)), 5000);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'telefono') {
      setFormData(prev => ({ ...prev, telefono: value.replace(/\D/g, '').slice(0, 10) }));
      return;
    }
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleComprobanteFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return showAlert('El comprobante debe ser una imagen.');
    if (file.size > 5 * 1024 * 1024) return showAlert('El comprobante no puede superar 5MB.');
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result?.toString() || '';
      setComprobanteB64(result);
      setComprobantePreview(result);
    };
    reader.readAsDataURL(file);
  };

  const limpiarComprobante = () => {
    setComprobanteB64('');
    setComprobantePreview('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.nombre.trim())            return showAlert('Ingresa tu nombre.');
    if (formData.telefono.length !== 10)    return showAlert('El teléfono debe tener 10 dígitos.');
    if (!formData.fechaNacimiento)          return showAlert('Selecciona tu fecha de nacimiento.');
    if (!formData.peso || Number(formData.peso) <= 0) return showAlert('Ingresa tu peso (kg).');
    if (!formData.tallaPlayera)             return showAlert('Selecciona tu talla de playera.');
    if (metodoPago === 'Transferencia' && !comprobanteB64) {
      return showAlert('Sube tu nuevo comprobante de transferencia.');
    }

    try {
      const idUsuario = usuarioDB.idUsuario;
      const payload = {
        ...formData,
        peso: formData.peso ? Number(formData.peso) : null,
        metodoPago,
        comprobanteBase64: metodoPago === 'Transferencia' ? comprobanteB64 : null
      };
      const res = await fetch(`${USUARIOS_ENDPOINT}/${idUsuario}/corregir-solicitud`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) return showAlert(data.mensaje || 'Error al enviar la corrección.');
      setModalExitoOpen(true);
    } catch {
      showAlert('Error de conexión.');
    }
  };

  if (loading) {
    return (
      <div className="reg-root d-flex justify-content-center align-items-center min-vh-100">
        <AtletifyLoader />
      </div>
    );
  }

  // Conflicto: estás logueado con otra cuenta distinta a la del correo
  if (conflictoCuenta) {
    return (
      <div className="reg-root d-flex justify-content-center align-items-center min-vh-100 px-3">
        <div className="reg-card text-center p-4 p-md-5 slide-in" style={{ maxWidth: '480px', width: '100%' }}>
          <div style={{
            width: 64, height: 64, margin: '0 auto 1rem', borderRadius: '50%',
            background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#f59e0b', fontSize: '1.6rem'
          }}>
            <i className="fas fa-user-shield"></i>
          </div>
          <h3 className="text-white fw-bold mb-2" style={{ fontSize: '1.2rem' }}>
            Cuenta distinta detectada
          </h3>
          <p className="text-white-50 mb-3" style={{ fontSize: '0.92rem', lineHeight: 1.55 }}>
            Estás conectado con <strong style={{ color: '#fff' }}>{conflictoCuenta.correoActual}</strong>, pero el correo
            de corrección fue enviado a <strong style={{ color: '#fca5a5' }}>{conflictoCuenta.correoEsperado}</strong>.
          </p>
          <p className="text-white-50 mb-4" style={{ fontSize: '0.85rem' }}>
            Cierra esta sesión e inicia con la cuenta correcta para corregir tu solicitud.
          </p>
          <button
            type="button"
            onClick={() => {
              const redirectBack = `/corregir-solicitud?correo=${encodeURIComponent(conflictoCuenta.correoEsperado)}`;
              logout();
              navigate(`/login?correo=${encodeURIComponent(conflictoCuenta.correoEsperado)}&redirect=${encodeURIComponent(redirectBack)}`, { replace: true });
            }}
            className="reg-btn-submit cr-btn-submit w-100"
          >
            <i className="fas fa-sign-out-alt me-2"></i> Cerrar sesión actual y entrar
          </button>
        </div>
      </div>
    );
  }

  if (!usuarioDB) return null;

  return (
    <div className="reg-root cr-root py-5 min-vh-100">
      <div className="container" style={{ maxWidth: '720px' }}>

        {/* Header */}
        <div className="cr-hero">
          <div className="cr-hero-badge" style={{ background: 'rgba(185,28,28,0.15)', borderColor: 'rgba(185,28,28,0.35)', color: '#fca5a5' }}>
            <i className="fas fa-clipboard-list"></i>
            <span>Corrección requerida</span>
          </div>
          <h1 className="cr-hero-title">
            Corrige tu <span className="cr-hero-title-accent">Solicitud</span>
          </h1>
          <p className="cr-hero-sub">
            Tu solicitud{boxNombre ? <> a <strong style={{ color: '#fff' }}>{boxNombre}</strong></> : null} requiere ajustes antes de ser aprobada. Revisa el motivo indicado, corrige los datos y reenvíala para revisión.
          </p>
        </div>

        {/* Motivo del rechazo */}
        <div style={{
          margin: '0 auto 1.25rem',
          padding: '1rem 1.15rem',
          background: 'rgba(185,28,28,0.07)',
          border: '1px solid rgba(185,28,28,0.3)',
          borderLeft: '3px solid #b91c1c',
          borderRadius: '12px'
        }}>
          <p style={{ margin: '0 0 6px', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: '#fca5a5' }}>
            <i className="fas fa-comment-dots me-2"></i>Motivo del rechazo
          </p>
          <p style={{ margin: 0, fontSize: '0.92rem', lineHeight: 1.55, color: '#fff' }}>
            {usuarioDB.motivoRechazo || 'Sin motivo especificado.'}
          </p>
        </div>

        <div className="reg-alerts">
          {alerts.map(a => <div key={a.id} className={`reg-alert reg-alert-${a.tipo}`}>{a.mensaje}</div>)}
        </div>

        <div className="reg-card cr-card">
          <form onSubmit={handleSubmit}>

            {/* Información Personal */}
            <div className="cr-section-head">
              <span className="cr-section-num">01</span>
              <div>
                <p className="cr-section-title">Información Personal</p>
                <p className="cr-section-desc">Verifica que tus datos sean correctos.</p>
              </div>
              <i className="fas fa-id-card cr-section-icon"></i>
            </div>
            <div className="row g-3 mb-4">
              <div className="col-12 col-md-6">
                <label className="reg-label">Nombre(s)</label>
                <input type="text" name="nombre" className="reg-input" value={formData.nombre} onChange={handleChange} required />
              </div>
              <div className="col-12 col-md-6">
                <label className="reg-label">Apellido(s)</label>
                <input type="text" name="apellidos" className="reg-input" value={formData.apellidos} onChange={handleChange} />
              </div>
              <div className="col-12 col-md-6">
                <label className="reg-label d-flex justify-content-between">
                  <span>Teléfono (WhatsApp)</span>
                  <span style={{ fontSize: '0.75rem', color: formData.telefono.length === 10 ? '#22c55e' : 'rgba(255,255,255,0.35)' }}>
                    {formData.telefono.length}/10
                  </span>
                </label>
                <input type="tel" name="telefono" className="reg-input" value={formData.telefono} onChange={handleChange} maxLength={10}
                  style={{ borderColor: formData.telefono.length === 10 ? '#22c55e' : '' }} />
              </div>
              <div className="col-12 col-md-6">
                <label className="reg-label">Fecha de Nacimiento</label>
                <input
                  type="date"
                  name="fechaNacimiento"
                  className="reg-input bg-dark text-white"
                  value={formData.fechaNacimiento}
                  onChange={(e) => {
                    const year = e.target.value.split('-')[0] || '';
                    if (year.length <= 4) handleChange(e);
                  }}
                  max="9999-12-31"
                  required
                />
              </div>
            </div>

            {/* Identidad */}
            <div className="cr-section-head">
              <span className="cr-section-num">02</span>
              <div>
                <p className="cr-section-title">Categoría y Género</p>
                <p className="cr-section-desc">Ajusta tu nivel y género de competencia si es necesario.</p>
              </div>
              <i className="fas fa-gamepad cr-section-icon"></i>
            </div>
            <div className="row g-3 mb-4">
              <div className="col-12 col-md-6">
                <label className="reg-label">Categoría Base</label>
                <CategoriaBasePicker valor={formData.categoriaBase} onCambiar={v => setFormData(prev => ({ ...prev, categoriaBase: v }))} />
              </div>
              <div className="col-12 col-md-6">
                <label className="reg-label">Género de Competencia</label>
                <GeneroPicker valor={formData.genero} onCambiar={v => setFormData(prev => ({ ...prev, genero: v }))} />
              </div>
            </div>

            {/* Datos físicos */}
            <div className="cr-section-head">
              <span className="cr-section-num">03</span>
              <div>
                <p className="cr-section-title">Datos Físicos</p>
                <p className="cr-section-desc">Peso y talla para tu expediente y kit del Box.</p>
              </div>
              <i className="fas fa-weight cr-section-icon"></i>
            </div>
            <div className="row g-3 mb-4">
              <div className="col-12 col-md-6">
                <label className="reg-label d-flex justify-content-between">
                  <span>Peso (kg)</span>
                  <span style={{ fontSize: '0.75rem', color: formData.peso && Number(formData.peso) > 0 ? '#22c55e' : 'rgba(255,255,255,0.35)' }}>
                    {formData.peso ? `${formData.peso} kg` : '—'}
                  </span>
                </label>
                <input
                  type="number"
                  name="peso"
                  step="0.1"
                  min="1"
                  max="999"
                  className="reg-input"
                  value={formData.peso}
                  onChange={e => {
                    const v = e.target.value;
                    if (v === '' || /^\d{0,3}(\.\d{0,2})?$/.test(v)) setFormData(prev => ({ ...prev, peso: v }));
                  }}
                  placeholder="Ej. 70"
                  required
                />
              </div>
              <div className="col-12 col-md-6">
                <label className="reg-label">Talla de Playera</label>
                <TallaPlayeraPicker valor={formData.tallaPlayera} onCambiar={v => setFormData(prev => ({ ...prev, tallaPlayera: v }))} />
              </div>
            </div>

            {/* Método de pago */}
            <div className="cr-section-head">
              <span className="cr-section-num">04</span>
              <div>
                <p className="cr-section-title">Método de Pago</p>
                <p className="cr-section-desc">Confirma o cambia tu método. Si es transferencia, sube un nuevo comprobante.</p>
              </div>
              <i className="fas fa-wallet cr-section-icon"></i>
            </div>
            <div className="cr-metodos-list mb-3">
              {METODOS_PAGO.map(m => (
                <label key={m.id} className={`cr-metodo ${metodoPago === m.id ? 'cr-metodo--active' : ''}`}>
                  <input
                    type="radio"
                    name="metodoPago"
                    value={m.id}
                    checked={metodoPago === m.id}
                    onChange={() => { setMetodoPago(m.id); if (m.id !== 'Transferencia') limpiarComprobante(); }}
                  />
                  <div className="cr-metodo-icon"><i className={`fas ${m.icon}`}></i></div>
                  <div className="cr-metodo-text">
                    <span className="cr-metodo-titulo">{m.label}</span>
                    <span className="cr-metodo-desc">{m.desc}</span>
                  </div>
                  <span className="cr-metodo-radio"></span>
                </label>
              ))}
            </div>

            {metodoPago === 'Transferencia' && (
              <div className="cr-comprobante mb-4">
                <label className="reg-label">Nuevo Comprobante de Transferencia</label>
                <div className="mb-3">
                  <CuentasTransferenciaTrigger idBox={usuarioDB?.idBoxPredeterminado || boxIdLocal || 1} />
                </div>
                {!comprobantePreview ? (
                  <label className="cr-uploader">
                    <i className="fas fa-cloud-upload-alt"></i>
                    <span>Toca para subir la foto del comprobante</span>
                    <small>JPG / PNG · máximo 5MB</small>
                    <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleComprobanteFile} />
                  </label>
                ) : (
                  <div className="cr-comprobante-preview">
                    <img src={comprobantePreview} alt="Comprobante" />
                    <button type="button" className="cr-comprobante-quitar" onClick={limpiarComprobante}>
                      <i className="fas fa-trash"></i> Quitar
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="cr-cta">
              <BotonSeguro
                type="submit"
                className="reg-btn-submit cr-btn-submit w-100"
                textoProcesando={<><i className="fas fa-spinner fa-spin"></i> Enviando...</>}
              >
                <i className="fas fa-paper-plane"></i> Reenviar para revisión
                <span className="cr-btn-shine"></span>
              </BotonSeguro>
              <p className="cr-cta-helper">
                <i className="fas fa-info-circle"></i> Recibirás un correo cuando los administradores revisen tu nueva solicitud.
              </p>
              <button
                type="button"
                onClick={() => { logout(); navigate('/login', { replace: true }); }}
                style={{
                  marginTop: '0.75rem',
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255,255,255,0.45)',
                  fontSize: '0.78rem',
                  textDecoration: 'underline',
                  cursor: 'pointer'
                }}
              >
                Cerrar sesión
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Modal éxito */}
      {modalExitoOpen && createPortal(
        <div className="cr-exito-overlay" role="dialog" aria-modal="true">
          <div className="cr-exito-panel">
            <div className="cr-exito-icon-wrap">
              <i className="fas fa-check"></i>
            </div>
            <h2 className="cr-exito-title">Solicitud reenviada</h2>
            <p className="cr-exito-sub">Tu corrección ha sido enviada para revisión por el administrador del box.</p>
            <div className="cr-exito-box cr-exito-box--info">
              <i className="fas fa-hourglass-half cr-exito-box-icon" />
              <div className="cr-exito-box-text">
                <strong>Espera la confirmación del administrador</strong>
                <span>Te notificaremos por correo cuando se complete la nueva revisión.</span>
              </div>
            </div>
            <button
              type="button"
              className="cr-exito-btn"
              onClick={() => { setModalExitoOpen(false); logout(); navigate('/login', { replace: true }); }}
            >
              <i className="fas fa-sign-out-alt"></i> Cerrar sesión
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
