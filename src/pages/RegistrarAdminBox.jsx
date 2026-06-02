import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import BotonSeguro from '../components/BotonSeguro';
import PasswordRulesHint from '../components/PasswordRulesHint';
import DateWheelPicker from '../components/DateWheelPicker';
import { usePasswordStrength } from '../hooks/usePasswordStrength';
import '../assets/css/Register.css';
import '../assets/css/CompletarRegistro.css';

export default function RegistrarAdminBox() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const correoParam = searchParams.get('correo');
  const API_URL = `${import.meta.env.VITE_API_URL}/api`;

  const [formData, setFormData] = useState({
    nombre: '',
    apellidos: '',
    username: '',
    telefono: '',
    fechaNacimiento: '',
    contrasena: '',
    confirmarContrasena: ''
  });

  const [alerts, setAlerts] = useState([]);
  const [showPass, setShowPass] = useState(false);
  const [showPassConfirm, setShowPassConfirm] = useState(false);
  const [mostrarDatePicker, setMostrarDatePicker] = useState(false);
  const [modalExitoOpen, setModalExitoOpen] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const reglasPassword = usePasswordStrength(formData.contrasena);

  const [tokenEstado, setTokenEstado] = useState('cargando');
  const [tokenMensaje, setTokenMensaje] = useState('');
  const [nombreBox, setNombreBox] = useState('');

  const [usernameEstado, setUsernameEstado] = useState('idle'); // idle|checking|available|taken|short|invalid
  const usernameDebounceRef = useRef(null);

  // ── 1) Verificar token (reutiliza el endpoint de preregistro) ──
  useEffect(() => {
    if (!token || !correoParam) {
      setTokenEstado('invalido');
      setTokenMensaje('El enlace está incompleto.');
      return;
    }
    (async () => {
      try {
        const res = await fetch(`${API_URL}/usuarios/verificar-token-preregistro?correo=${encodeURIComponent(correoParam)}&token=${encodeURIComponent(token)}`);
        const data = await res.json();
        const estado = data.estado?.toLowerCase() || 'invalido';
        setTokenMensaje(data.mensaje);
        // Este formulario es exclusivo de invitaciones de AdminBox
        if (estado === 'valido' && data.rolEsperado && data.rolEsperado !== 'AdminBox') {
          setTokenEstado('invalido');
          setTokenMensaje('Este enlace no corresponde a una invitación de administrador.');
          return;
        }
        setTokenEstado(estado);
      } catch {
        setTokenEstado('invalido');
        setTokenMensaje('Error al verificar el enlace.');
      }
    })();
  }, [token, correoParam, API_URL]);

  // ── 2) Cargar nombre del box (informativo) cuando el token es válido ──
  useEffect(() => {
    if (tokenEstado !== 'valido' || !correoParam || !token) return;
    (async () => {
      try {
        const res = await fetch(`${API_URL}/usuarios/verificar-token-preregistro?correo=${encodeURIComponent(correoParam)}&token=${encodeURIComponent(token)}`);
        const data = await res.json();
        if (data.idBoxAsignado) {
          const resBox = await fetch(`${API_URL}/box/${data.idBoxAsignado}`);
          if (resBox.ok) {
            const box = await resBox.json();
            setNombreBox(box.nombre ?? box.Nombre ?? '');
          }
        }
      } catch { /* informativo, ignorar */ }
    })();
  }, [tokenEstado, correoParam, token, API_URL]);

  // ── 3) Username live-check (debounce 400ms) ──
  useEffect(() => {
    const u = formData.username.trim();
    if (!u) { setUsernameEstado('idle'); return; }
    if (!/^[a-zA-Z0-9._-]+$/.test(u)) { setUsernameEstado('invalid'); return; }
    if (u.length < 3) { setUsernameEstado('short'); return; }

    setUsernameEstado('checking');
    if (usernameDebounceRef.current) clearTimeout(usernameDebounceRef.current);
    usernameDebounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`${API_URL}/usuarios/verificar-username/${encodeURIComponent(u)}`);
        if (!res.ok) { setUsernameEstado('idle'); return; }
        const data = await res.json();
        setUsernameEstado(data.disponible ? 'available' : 'taken');
      } catch {
        setUsernameEstado('idle');
      }
    }, 400);

    return () => { if (usernameDebounceRef.current) clearTimeout(usernameDebounceRef.current); };
  }, [formData.username, API_URL]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'username') {
      setFormData(prev => ({ ...prev, username: value.replace(/\s+/g, '').replace(/[^a-zA-Z0-9._-]/g, '') }));
      return;
    }
    if (name === 'telefono') {
      setFormData(prev => ({ ...prev, telefono: value.replace(/\D/g, '').slice(0, 10) }));
      return;
    }
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const showAlert = (mensaje, tipo = 'danger') => {
    const alerta = { id: Date.now(), mensaje, tipo };
    setAlerts(prev => [...prev, alerta]);
    setTimeout(() => setAlerts(prev => prev.filter(a => a.id !== alerta.id)), 5000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.nombre.trim())    return showAlert('Ingresa tu nombre.');
    if (usernameEstado === 'taken')   return showAlert('El username ya está ocupado. Elige otro.');
    if (usernameEstado === 'short')   return showAlert('El username debe tener al menos 3 caracteres.');
    if (usernameEstado === 'invalid') return showAlert('Username inválido: solo letras, números, punto, guión y guión bajo.');
    if (usernameEstado !== 'available') return showAlert('Elige un username disponible.');
    if (!formData.fechaNacimiento)  return showAlert('Selecciona tu fecha de nacimiento.');
    if (!reglasPassword.esValida)   return showAlert('La contraseña no cumple los requisitos de seguridad.');
    if (formData.contrasena !== formData.confirmarContrasena) return showAlert('Las contraseñas no coinciden.');

    setEnviando(true);
    try {
      const payload = {
        correo: correoParam,
        token,
        nombre: formData.nombre.trim(),
        apellidos: formData.apellidos.trim() || null,
        username: formData.username.trim(),
        telefono: formData.telefono.trim() || null,
        fechaNacimiento: new Date(formData.fechaNacimiento).toISOString(),
        contrasena: formData.contrasena
      };
      const res = await fetch(`${API_URL}/usuarios/completar-admin-box`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        setModalExitoOpen(true);
      } else {
        showAlert(data.mensaje || 'Error al completar el registro.');
      }
    } catch {
      showAlert('Error de conexión.');
    } finally {
      setEnviando(false);
    }
  };

  // ── Estados de carga / token inválido ──
  if (tokenEstado === 'cargando') {
    return (
      <div className="reg-root d-flex justify-content-center align-items-center min-vh-100">
        <div className="cr-loader-card">
          <div className="cr-loader-orbit">
            <div className="cr-loader-dot"></div>
            <div className="cr-loader-dot"></div>
            <div className="cr-loader-dot"></div>
          </div>
          <h4 className="text-white mt-3 mb-1">Verificando enlace</h4>
          <p className="text-white-50 mb-0" style={{ fontSize: '0.85rem' }}>Esto sólo tomará un momento...</p>
        </div>
      </div>
    );
  }

  if (tokenEstado !== 'valido') {
    const estadoVista = {
      usado:       { icono: 'fa-check-circle',       color: 'text-success', titulo: '¡Cuenta ya activada!',            ctaLabel: 'Ir a Iniciar Sesión' },
      reemplazado: { icono: 'fa-envelope-open-text', color: 'text-info',    titulo: 'Hay una invitación más reciente', ctaLabel: 'Volver al Inicio' },
      expirado:    { icono: 'fa-clock',              color: 'text-warning', titulo: 'El enlace expiró',                ctaLabel: 'Volver al Inicio' },
    }[tokenEstado] ?? { icono: 'fa-exclamation-triangle', color: 'text-warning', titulo: 'Enlace no disponible', ctaLabel: 'Volver al Inicio' };

    return (
      <div className="reg-root d-flex justify-content-center align-items-center min-vh-100">
        <div className="reg-card text-center p-5 slide-in" style={{ maxWidth: '500px' }}>
          <i className={`fas ${estadoVista.icono} fa-4x ${estadoVista.color} mb-3`}></i>
          <h3 className="text-white fw-bold mb-3">{estadoVista.titulo}</h3>
          <p className="text-white-50 fs-5 mb-4">{tokenMensaje || 'Este enlace no es válido.'}</p>
          <Link to="/login" className="btn btn-outline-light rounded-pill px-5 py-2 fw-bold w-100">
            {estadoVista.ctaLabel}
          </Link>
        </div>
      </div>
    );
  }

  const usernameHint = (() => {
    switch (usernameEstado) {
      case 'checking':  return { icon: 'fa-circle-notch fa-spin', text: 'Verificando disponibilidad...', clase: 'cr-username-hint cr-username-hint--check' };
      case 'available': return { icon: 'fa-check-circle',          text: '¡Username disponible!',         clase: 'cr-username-hint cr-username-hint--ok' };
      case 'taken':     return { icon: 'fa-times-circle',          text: 'Este username ya está ocupado', clase: 'cr-username-hint cr-username-hint--err' };
      case 'short':     return { icon: 'fa-exclamation-circle',    text: 'Mínimo 3 caracteres',           clase: 'cr-username-hint cr-username-hint--warn' };
      case 'invalid':   return { icon: 'fa-exclamation-circle',    text: 'Solo letras, números, punto, guión y guión bajo', clase: 'cr-username-hint cr-username-hint--warn' };
      default:          return null;
    }
  })();

  const usernameBorderColor =
    usernameEstado === 'available' ? '#22c55e' :
    usernameEstado === 'taken' || usernameEstado === 'invalid' ? '#ef4444' :
    usernameEstado === 'short' || usernameEstado === 'checking' ? '#f59e0b' : '';

  return (
    <div className="reg-root cr-root py-5 min-vh-100">
      <div className="container" style={{ maxWidth: '640px' }}>

        {/* Hero */}
        <div className="cr-hero">
          <div className="cr-hero-badge">
            <i className="fas fa-user-shield"></i>
            <span>Registro de administrador</span>
          </div>
          <h1 className="cr-hero-title">Completa tu registro</h1>
          <p className="cr-hero-sub">
            {nombreBox ? <>Serás administrador de <strong>{nombreBox}</strong>.</> : 'Crea tu cuenta de administrador del box.'}
          </p>
        </div>

        {/* Alerts */}
        {alerts.map(a => (
          <div key={a.id} className={`alert alert-${a.tipo} py-2`} style={{ borderRadius: '12px' }}>
            <i className="fas fa-exclamation-circle me-2"></i>{a.mensaje}
          </div>
        ))}

        <div className="reg-card p-4 p-md-5">
          <form onSubmit={handleSubmit}>

            <div className="row g-3 mb-3">
              <div className="col-12 col-md-6">
                <label className="reg-label">Nombre</label>
                <input type="text" name="nombre" className="reg-input" value={formData.nombre} onChange={handleChange} placeholder="Juan" required />
              </div>
              <div className="col-12 col-md-6">
                <label className="reg-label">Apellidos</label>
                <input type="text" name="apellidos" className="reg-input" value={formData.apellidos} onChange={handleChange} placeholder="Pérez García" />
              </div>
            </div>

            <div className="row g-3 mb-3">
              <div className="col-12">
                <label className="reg-label">Username (alias único sin espacios)</label>
                <div className="cr-username-wrap">
                  <input
                    type="text"
                    name="username"
                    autoComplete="username"
                    className="reg-input cr-username-input"
                    value={formData.username}
                    onChange={handleChange}
                    placeholder="Ej. juanperez"
                    style={{ borderColor: usernameBorderColor }}
                    required
                  />
                  {usernameEstado !== 'idle' && (
                    <span className={`cr-username-indicator cr-username-indicator--${usernameEstado}`}>
                      <i className={`fas ${
                        usernameEstado === 'checking'  ? 'fa-circle-notch fa-spin' :
                        usernameEstado === 'available' ? 'fa-check-circle' :
                        usernameEstado === 'taken' || usernameEstado === 'invalid' ? 'fa-times-circle' :
                        'fa-exclamation-circle'
                      }`}></i>
                    </span>
                  )}
                </div>
                {usernameHint && (
                  <p className={usernameHint.clase}>
                    <i className={`fas ${usernameHint.icon}`}></i> {usernameHint.text}
                  </p>
                )}
              </div>
            </div>

            <div className="row g-3 mb-3">
              <div className="col-12 col-md-6">
                <label className="reg-label">Teléfono</label>
                <input type="tel" name="telefono" className="reg-input" value={formData.telefono} onChange={handleChange} placeholder="10 dígitos" />
              </div>
              <div className="col-12 col-md-6">
                <label className="reg-label">Fecha de Nacimiento</label>
                <button
                  type="button"
                  className="reg-input d-flex align-items-center gap-2 w-100"
                  style={{ textAlign: 'left', cursor: 'pointer' }}
                  onClick={() => setMostrarDatePicker(true)}
                >
                  <i className="fas fa-birthday-cake" style={{ color: 'var(--primary, #e63946)' }}></i>
                  {formData.fechaNacimiento
                    ? <span style={{ flex: 1 }}>{new Date(formData.fechaNacimiento).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                    : <span style={{ flex: 1, color: 'rgba(255,255,255,0.4)' }}>Seleccionar fecha...</span>}
                  <i className="fas fa-chevron-down" style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}></i>
                </button>
              </div>
            </div>

            <div className="row g-3 mb-3">
              <div className="col-12">
                <label className="reg-label">Correo</label>
                <input type="email" className="reg-input" value={correoParam || ''} readOnly disabled style={{ opacity: 0.75 }} />
              </div>
            </div>

            <div className="row g-3 mb-2">
              <div className="col-12 col-md-6">
                <label className="reg-label">Contraseña</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPass ? 'text' : 'password'}
                    name="contrasena"
                    autoComplete="new-password"
                    className="reg-input"
                    value={formData.contrasena}
                    onChange={handleChange}
                    required
                    style={{ paddingRight: '42px' }}
                  />
                  <button type="button" onClick={() => setShowPass(p => !p)} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '0.9rem' }}>
                    <i className={showPass ? 'fas fa-eye-slash' : 'fas fa-eye'} />
                  </button>
                </div>
              </div>
              <div className="col-12 col-md-6">
                <label className="reg-label">Confirmar Contraseña</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassConfirm ? 'text' : 'password'}
                    name="confirmarContrasena"
                    autoComplete="new-password"
                    className="reg-input"
                    value={formData.confirmarContrasena}
                    onChange={handleChange}
                    required
                    style={{ paddingRight: '42px' }}
                  />
                  <button type="button" onClick={() => setShowPassConfirm(p => !p)} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '0.9rem' }}>
                    <i className={showPassConfirm ? 'fas fa-eye-slash' : 'fas fa-eye'} />
                  </button>
                </div>
              </div>

              {(formData.contrasena.length > 0 || formData.confirmarContrasena.length > 0) && (
                <div className="col-12">
                  <PasswordRulesHint
                    reglas={reglasPassword}
                    password={formData.contrasena}
                    passwordConfirm={formData.confirmarContrasena}
                  />
                </div>
              )}
            </div>

            <div className="cr-cta mt-4">
              <BotonSeguro
                type="submit"
                className="reg-btn-submit cr-btn-submit w-100"
                disabled={
                  enviando ||
                  !reglasPassword.esValida ||
                  formData.contrasena !== formData.confirmarContrasena ||
                  usernameEstado !== 'available'
                }
                textoProcesando={<><i className="fas fa-spinner fa-spin"></i> Guardando...</>}
              >
                <i className="fas fa-check-circle"></i> Crear mi cuenta
                <span className="cr-btn-shine"></span>
              </BotonSeguro>
              <p className="cr-cta-helper">
                <i className="fas fa-shield-alt"></i> Tu información se cifra antes de enviarse.
              </p>
            </div>
          </form>
        </div>
      </div>

      {/* DateWheelPicker */}
      {mostrarDatePicker && createPortal(
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setMostrarDatePicker(false); }}
          style={{ position: 'fixed', inset: 0, zIndex: 10010, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', padding: '12px' }}
        >
          <div style={{ width: '100%', maxWidth: '420px', background: 'linear-gradient(160deg, rgba(22,22,32,0.99) 0%, rgba(12,12,18,1) 100%)', border: '1px solid rgba(255,255,255,0.1)', borderTop: '3px solid var(--primary, #e63946)', borderRadius: '20px', boxShadow: '0 24px 60px rgba(0,0,0,0.6)' }}>
            <DateWheelPicker
              initialDate={formData.fechaNacimiento ? new Date(formData.fechaNacimiento) : new Date(2000, 0, 1)}
              onAccept={(date) => { setFormData(prev => ({ ...prev, fechaNacimiento: date.toISOString() })); setMostrarDatePicker(false); }}
              onCancel={() => setMostrarDatePicker(false)}
            />
          </div>
        </div>, document.body
      )}

      {/* Modal de éxito */}
      {modalExitoOpen && createPortal(
        <div className="cr-exito-overlay" role="dialog" aria-modal="true">
          <div className="cr-exito-panel">
            <div className="cr-exito-icon-wrap">
              <i className="fas fa-check"></i>
            </div>
            <h2 className="cr-exito-title">¡Cuenta creada!</h2>
            <p className="cr-exito-sub">Tu cuenta de administrador ya está activa.</p>
            <div className="cr-exito-box cr-exito-box--success" style={{ borderColor: '#22c55e', backgroundColor: 'rgba(34,197,94,0.08)' }}>
              <i className="fas fa-user-shield cr-exito-box-icon" style={{ color: '#22c55e' }} />
              <div className="cr-exito-box-text">
                <strong>Ya puedes iniciar sesión</strong>
                <span>Usa tu correo y la contraseña que acabas de crear.</span>
              </div>
            </div>
            <button type="button" className="reg-btn-submit w-100 mt-3" onClick={() => navigate('/login')}>
              <i className="fas fa-sign-in-alt me-2"></i> Ir a Iniciar Sesión
            </button>
          </div>
        </div>, document.body
      )}
    </div>
  );
}
