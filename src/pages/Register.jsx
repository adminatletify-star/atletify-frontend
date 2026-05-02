import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import BackButton from '../components/BackButton';
import GeneroPicker from '../components/GeneroPicker';
import BotonSeguro from '../components/BotonSeguro';
import '../assets/css/Register.css';

export function Register() {
  const navigate = useNavigate();
  const { idBox } = useParams();
  const API_URL = import.meta.env.VITE_API_URL;
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    nombre: '', apellidos: '', correo: '', username: '', contrasena: '', confirmarContrasena: '',
    idBoxPredeterminado: idBox || '', genero: '', idPlan: '',
    esMudanza: false, metodoPago: 'Efectivo', comprobanteBase64: ''
  });

  const [boxSeleccionado, setBoxSeleccionado] = useState(null);
  const [planesList, setPlanesList] = useState([]);
  const [configBox, setConfigBox] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [usernameDisponible, setUsernameDisponible] = useState(null);
  const [nombreArchivo, setNombreArchivo] = useState('');

  useEffect(() => {
    if (!idBox) return;

    // Cargar datos del box
    fetch(`${API_URL}/box/${idBox}`)
      .then(res => res.ok ? res.json() : null)
      .then(setBoxSeleccionado)
      .catch(() => showAlert("Error al cargar el Box"));

    // Cargar planes VISIBLES (filtramos los ocultos)
    fetch(`${API_URL}/finanzas/planes/${idBox}`)
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        // Solo mostrar planes que tienen EsVisible = true (o que no tienen el campo, por compatibilidad)
        const visibles = data.filter(p => p.esVisible === true || p.esVisible === undefined);
        setPlanesList(visibles);
      })
      .catch(() => console.log("Sin planes"));

    // Cargar configuración financiera del box (para la inscripción)
    fetch(`${API_URL}/configuracionbox/${idBox}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => setConfigBox(data))
      .catch(() => console.log("Sin configuración de box"));
  }, [idBox]);

  // Validar Username en tiempo real
  useEffect(() => {
    if (formData.username.length > 3) {
      const timer = setTimeout(async () => {
        try {
          const res = await fetch(`${API_URL}/usuarios/verificar-username/${formData.username}`);
          if (res.ok) {
            const data = await res.json();
            setUsernameDisponible(data.disponible);
          }
        } catch (e) { console.log(e); }
      }, 500); // Espera medio segundo a que deje de escribir
      return () => clearTimeout(timer);
    } else {
      setUsernameDisponible(null);
    }
  }, [formData.username]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    // El username no puede tener espacios
    if (name === 'username' && value.includes(' ')) return;

    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) return showAlert("La imagen es muy pesada (Máx 5MB)");
      setNombreArchivo(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, comprobanteBase64: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const showAlert = (mensaje, tipo = 'danger') => {
    const alerta = { id: Date.now(), mensaje, tipo };
    setAlerts(prev => [...prev, alerta]);
    setTimeout(() => setAlerts(prev => prev.filter(a => a.id !== alerta.id)), 5000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.idPlan) return showAlert('Selecciona un Plan de Entrenamiento.');
    if (formData.contrasena !== formData.confirmarContrasena) return showAlert('Las contraseñas no coinciden.');
    if (usernameDisponible === false) return showAlert('El Username ya está ocupado.');
    if (!formData.esMudanza && formData.metodoPago === 'Transferencia' && !formData.comprobanteBase64) {
      return showAlert('Debes subir la foto de tu comprobante de transferencia.');
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/usuarios/registro`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData, rol: 'Atleta',
          idBoxPredeterminado: parseInt(formData.idBoxPredeterminado),
          idPlan: parseInt(formData.idPlan)
        })
      });

      const data = await response.json();
      if (response.ok) {
        showAlert(formData.esMudanza
          ? '¡Mudanza solicitada! Espera a que tu Coach active tu cuenta.'
          : '¡Cuenta creada! Tu Coach revisará tu pago pronto.', 'success');
        setTimeout(() => navigate('/login'), 4000);
      } else showAlert(data.mensaje || 'Error al registrar.');
    } catch (e) { showAlert('Error de conexión.'); }
    finally { setLoading(false); }
  };

  if (!idBox) return (
    <div className="reg-root d-flex justify-content-center align-items-center">
      <div className="reg-card text-center"><h3 className="text-danger fw-bold">⚠️ Enlace Privado</h3><p>Para registrarte, pídele a tu Box su enlace de invitación.</p><Link to="/login" className="reg-btn-submit text-decoration-none">Ir al Login</Link></div>
    </div>
  );

  const planSeleccionadoObj = planesList.find(p => p.idPlan === parseInt(formData.idPlan));
  const montoInscripcion = configBox?.montoInscripcion || 250;
  const planRequiereInscripcion = planSeleccionadoObj?.requiereInscripcion !== false;
  const totalRegistro = (planSeleccionadoObj?.precio || 0) + ((!formData.esMudanza && planRequiereInscripcion) ? montoInscripcion : 0);

  return (
    <div className="reg-root">
      <div className="reg-page-header">
        <div className="reg-back-row"><BackButton to="/login" /></div>
        <div className="reg-title-row">
          <div className="reg-icon-circle"><i className="fas fa-paw"></i></div>
          <h1 className="reg-page-title">Únete a <span>{boxSeleccionado?.nombre || 'The Wolfpack'}</span></h1>
        </div>
        <p className="reg-page-subtitle">Completa tu perfil para empezar a entrenar</p>
      </div>

      <div className="reg-alerts">{alerts.map(a => <div key={a.id} className={`reg-alert reg-alert-${a.tipo}`}>{a.mensaje}</div>)}</div>

      <div className="reg-card">
        <form onSubmit={handleSubmit}>

          {/* SECCIÓN 1: DATOS PERSONALES */}
          <p className="reg-section-label"><i className="fas fa-user"></i> Datos Personales</p>
          <div className="row g-3 mb-4">
            <div className="col-12 col-md-6">
              <label className="reg-label">Nombre(s)</label>
              <input type="text" name="nombre" className="reg-input" value={formData.nombre} onChange={handleChange} required />
            </div>
            <div className="col-12 col-md-6">
              <label className="reg-label">Apellido(s)</label>
              <input type="text" name="apellidos" className="reg-input" value={formData.apellidos} onChange={handleChange} required />
            </div>
            <div className="col-12 col-md-6">
              <label className="reg-label">Correo Electrónico</label>
              <input type="email" name="correo" className="reg-input" value={formData.correo} onChange={handleChange} required />
            </div>
            <div className="col-12 col-md-6">
              <label className="reg-label d-flex justify-content-between">
                <span>Username (Alias)</span>
                {usernameDisponible === true && <span className="text-success"><i className="fas fa-check-circle"></i> Disponible</span>}
                {usernameDisponible === false && <span className="text-danger"><i className="fas fa-times-circle"></i> Ocupado</span>}
              </label>
              <input type="text" name="username" className={`reg-input ${usernameDisponible === false ? 'border-danger' : ''}`} value={formData.username} onChange={handleChange} placeholder="Ej. lobo99" required />
            </div>
            <div className="col-12">
              <label className="reg-label">Género de Competencia</label>
              <GeneroPicker valor={formData.genero} onCambiar={v => setFormData(prev => ({ ...prev, genero: v }))} />
            </div>
          </div>

          {/* SECCIÓN 2: PLAN Y MUDANZA */}
          <p className="reg-section-label"><i className="fas fa-id-card"></i> Tu Membresía</p>

          <div className="form-check form-switch mb-3 p-3 rounded" style={{ backgroundColor: 'rgba(52, 152, 219, 0.1)', border: '1px solid rgba(52, 152, 219, 0.3)' }}>
            <input className="form-check-input bg-info border-info ms-1" type="checkbox" id="checkMudanza" name="esMudanza" checked={formData.esMudanza} onChange={handleChange} />
            <label className="form-check-label text-info ms-3 fw-bold" htmlFor="checkMudanza">
              <i className="fas fa-truck-moving me-2"></i>Ya soy atleta en este Box (Solo me estoy mudando a la App)
            </label>
          </div>

          <div className="row g-3 mb-4">
            <div className="col-12">
              <label className="reg-label text-warning fw-bold">Selecciona tu Plan de Entrenamiento</label>
              <select name="idPlan" className="reg-input bg-dark text-white border-warning border-opacity-50" value={formData.idPlan} onChange={handleChange} required>
                <option value="">-- Elige un Plan --</option>
                {planesList.map(plan => (
                  <option key={plan.idPlan} value={plan.idPlan}>
                    {plan.nombre} — ${plan.precio}/mes
                    {plan.descripcion ? ` (${plan.descripcion})` : ''}
                  </option>
                ))}
              </select>

              {/* Descripción del plan seleccionado */}
              {planSeleccionadoObj && (
                <div className="mt-2 p-2 rounded" style={{ background: 'rgba(243,156,18,0.08)', border: '1px solid rgba(243,156,18,0.2)' }}>
                  <div className="d-flex justify-content-between mb-1">
                    <small style={{ color: 'var(--text-muted, #aaa)' }}>Membresía mensual</small>
                    <small className="fw-bold" style={{ color: '#2ecc71' }}>${planSeleccionadoObj.precio}</small>
                  </div>
                  {!formData.esMudanza && planRequiereInscripcion && (
                    <div className="d-flex justify-content-between mb-1">
                      <small style={{ color: '#f39c12' }}>
                        <i className="fas fa-id-card me-1"></i>Inscripción anual (una sola vez)
                      </small>
                      <small className="fw-bold" style={{ color: '#f39c12' }}>+${montoInscripcion}</small>
                    </div>
                  )}
                  {formData.esMudanza && (
                    <div className="d-flex justify-content-between mb-1">
                      <small style={{ color: '#3498db' }}>
                        <i className="fas fa-truck-moving me-1"></i>Mudanza — Sin cobro de inscripción
                      </small>
                      <small style={{ color: '#3498db' }}>$0</small>
                    </div>
                  )}
                  <hr style={{ borderColor: 'rgba(255,255,255,0.1)', margin: '6px 0' }} />
                  <div className="d-flex justify-content-between">
                    <small className="fw-bold" style={{ color: '#fff' }}>Total primer pago</small>
                    <span className="fw-bold" style={{ color: '#2ecc71', fontSize: '1.1rem' }}>
                      ${totalRegistro}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* SECCIÓN 3: PAGO (Se oculta si es mudanza) */}
          {!formData.esMudanza && formData.idPlan && (
            <div className="animate__animated animate__fadeIn">
              <p className="reg-section-label text-success"><i className="fas fa-wallet"></i> Método de Pago</p>
              <div className="reg-payment-box mb-4 p-3 rounded bg-dark border border-success border-opacity-25">
                <div className="text-center text-light mb-3">
                  <p className="mb-1" style={{ fontSize: '0.85rem', color: '#aaa' }}>Total primer pago:</p>
                  <span className="fs-2 text-success fw-bold" style={{ fontFamily: 'var(--font-stats, monospace)' }}>
                    ${totalRegistro}
                  </span>
                  {!formData.esMudanza && planRequiereInscripcion && (
                    <p className="mt-1 mb-0" style={{ fontSize: '0.75rem', color: '#f39c12' }}>
                      Incluye ${montoInscripcion} de inscripción anual
                    </p>
                  )}
                </div>
                <label className="reg-label">¿Cómo vas a pagar?</label>
                <select name="metodoPago" className="reg-input mb-3" value={formData.metodoPago} onChange={handleChange}>
                  <option value="Efectivo">💵 Efectivo en Recepción (Pagaré al llegar)</option>
                  <option value="Tarjeta">💳 Tarjeta en Recepción (Pagaré al llegar)</option>
                  <option value="Transferencia">📱 Transferencia Bancaria (Ya pagué)</option>
                </select>

                {formData.metodoPago === 'Transferencia' && (
                  <div className="p-3 bg-black rounded border border-secondary animate__animated animate__fadeIn">
                    <label className="reg-label text-info"><i className="fas fa-cloud-upload-alt me-2"></i>Sube la foto de tu comprobante</label>
                    <input type="file" accept="image/*" className="d-none" ref={fileInputRef} onChange={handleFileUpload} />

                    <button type="button" className="btn btn-outline-info w-100 mb-2" onClick={() => fileInputRef.current.click()}>
                      {nombreArchivo ? 'Cambiar Foto' : 'Seleccionar Imagen'}
                    </button>
                    {nombreArchivo && <p className="text-success text-center small m-0"><i className="fas fa-check-circle me-1"></i> {nombreArchivo}</p>}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SECCIÓN 4: SEGURIDAD */}
          <p className="reg-section-label"><i className="fas fa-lock"></i> Seguridad</p>
          <div className="row g-3 mb-4">
            <div className="col-12 col-md-6">
              <label className="reg-label">Contraseña</label>
              <input type="password" name="contrasena" className="reg-input" value={formData.contrasena} onChange={handleChange} required />
            </div>
            <div className="col-12 col-md-6">
              <label className="reg-label">Confirmar Contraseña</label>
              <input type="password" name="confirmarContrasena" className="reg-input" value={formData.confirmarContrasena} onChange={handleChange} required />
            </div>
          </div>

          <div className="form-check mb-4 p-3 rounded" style={{ backgroundColor: 'rgba(231, 76, 60, 0.05)', border: '1px solid rgba(231, 76, 60, 0.2)' }}>
            <input className="form-check-input ms-1" type="checkbox" id="checkTerminos" required />
            <label className="form-check-label ms-3 text-light" htmlFor="checkTerminos" style={{ fontSize: '0.9rem' }}>
              He leído y acepto los <Link to="/terminos" target="_blank" className="text-info text-decoration-none fw-bold">Términos y Condiciones</Link>
            </label>
          </div>

          <div className="reg-actions">
            <Link to="/login" className="reg-btn-cancel">Cancelar</Link>
            <BotonSeguro type="submit" className="reg-btn-submit" disabled={usernameDisponible === false} textoProcesando={<><i className="fas fa-spinner fa-spin"></i> Registrando...</>}>
              <i className="fas fa-check"></i> Enviar Solicitud
            </BotonSeguro>
          </div>
        </form>
      </div>
    </div>
  );
}