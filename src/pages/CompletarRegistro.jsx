import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import GeneroPicker from '../components/GeneroPicker';
import BotonSeguro from '../components/BotonSeguro';
import PasswordRulesHint from '../components/PasswordRulesHint';
import { usePasswordStrength } from '../hooks/usePasswordStrength';
import '../assets/css/Register.css';

export default function CompletarRegistro() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const correoParam = searchParams.get('correo');
  const API_URL = `${import.meta.env.VITE_API_URL}/api`;

  const [formData, setFormData] = useState({
    nombre: '',
    apellidos: '',
    telefono: '',
    username: '',
    contrasena: '',
    confirmarContrasena: '',
    genero: '',
    categoriaBase: 'Novato',
    fechaNacimiento: ''
  });

  const [alerts, setAlerts] = useState([]);
  const [showPass, setShowPass] = useState(false);
  const [showPassConfirm, setShowPassConfirm] = useState(false);

  // Indicador de fortaleza de contraseña (mismo que MiPerfil)
  const reglasPassword = usePasswordStrength(formData.contrasena);

  const [tokenEstado, setTokenEstado] = useState('cargando');
  const [tokenMensaje, setTokenMensaje] = useState('');

  useEffect(() => {
    if (!token || !correoParam) {
      setTokenEstado('invalido');
      setTokenMensaje('El enlace está incompleto.');
      return;
    }
    const verificarToken = async () => {
      try {
        const res = await fetch(`${API_URL}/usuarios/verificar-token-preregistro?correo=${encodeURIComponent(correoParam)}&token=${encodeURIComponent(token)}`);
        const data = await res.json();
        setTokenEstado(data.estado?.toLowerCase() || 'invalido');
        setTokenMensaje(data.mensaje);
      } catch {
        setTokenEstado('invalido');
        setTokenMensaje('Error al verificar el enlace.');
      }
    };
    verificarToken();
  }, [token, correoParam, API_URL]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    // Username: eliminar espacios automáticamente
    if (name === 'username') {
      setFormData(prev => ({ ...prev, username: value.replace(/\s+/g, '') }));
      return;
    }
    // Teléfono: solo dígitos, máximo 10
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
    if (!reglasPassword.esValida) return showAlert('La contraseña no cumple los requisitos de seguridad.');
    if (formData.contrasena !== formData.confirmarContrasena) return showAlert('Las contraseñas no coinciden.');

    try {
      const response = await fetch(`${API_URL}/usuarios/completar-registro`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo: correoParam, token, ...formData })
      });
      const data = await response.json();
      if (response.ok) {
        showAlert(data.mensaje, 'success');
        setTimeout(() => navigate('/sala-espera'), 3000);
      } else {
        showAlert(data.mensaje || 'Error al completar registro.');
      }
    } catch {
      showAlert('Error de conexión.');
    }
  };

  if (tokenEstado === 'cargando') {
    return (
      <div className="reg-root d-flex justify-content-center align-items-center min-vh-100">
        <div className="text-center">
          <i className="fas fa-spinner fa-spin fa-3x text-white mb-3"></i>
          <h4 className="text-white">Verificando enlace...</h4>
        </div>
      </div>
    );
  }

  if (tokenEstado !== 'valido') {
    return (
      <div className="reg-root d-flex justify-content-center align-items-center min-vh-100">
        <div className="reg-card text-center p-5 slide-in" style={{ maxWidth: '500px' }}>
          {tokenEstado === 'usado'
            ? <i className="fas fa-check-circle fa-4x text-success mb-3"></i>
            : <i className="fas fa-exclamation-triangle fa-4x text-warning mb-3"></i>
          }
          <h3 className="text-white fw-bold mb-3">
            {tokenEstado === 'usado' ? '¡Cuenta ya activada!' : 'Enlace no disponible'}
          </h3>
          <p className="text-white-50 fs-5 mb-4">{tokenMensaje || 'Este enlace no es válido.'}</p>
          <Link to="/login" className="btn btn-outline-light rounded-pill px-5 py-2 fw-bold w-100">
            {tokenEstado === 'usado' ? 'Ir a Iniciar Sesión' : 'Volver al Inicio'}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="reg-root py-5 min-vh-100">
      <div className="container" style={{ maxWidth: '700px' }}>
        <div className="reg-page-header">
          <div className="reg-title-row justify-content-center">
            <div className="reg-icon-circle"><i className="fas fa-user-check"></i></div>
            <h1 className="reg-page-title">Último <span>Paso</span></h1>
          </div>
          <p className="reg-page-subtitle">Completa tus datos para tu cuenta asociada a {correoParam}</p>
        </div>

        <div className="reg-alerts">
          {alerts.map(a => <div key={a.id} className={`reg-alert reg-alert-${a.tipo}`}>{a.mensaje}</div>)}
        </div>

        <div className="reg-card">
          <form onSubmit={handleSubmit}>

            {/* ── Información Personal ── */}
            <p className="reg-section-label"><i className="fas fa-id-card"></i> Información Personal</p>
            <div className="row g-3 mb-4">
              <div className="col-12 col-md-6">
                <label className="reg-label">Nombre(s) (Si tu Box lo precargó, déjalo en blanco)</label>
                <input type="text" name="nombre" className="reg-input" value={formData.nombre} onChange={handleChange} placeholder="Ej. Juan" />
              </div>
              <div className="col-12 col-md-6">
                <label className="reg-label">Apellido(s)</label>
                <input type="text" name="apellidos" className="reg-input" value={formData.apellidos} onChange={handleChange} placeholder="Ej. Pérez" />
              </div>

              {/* Teléfono — máximo 10 dígitos */}
              <div className="col-12 col-md-6">
                <label className="reg-label d-flex justify-content-between">
                  <span>Teléfono (WhatsApp)</span>
                  <span style={{ fontSize: '0.75rem', color: formData.telefono.length === 10 ? '#22c55e' : 'rgba(255,255,255,0.35)' }}>
                    {formData.telefono.length}/10
                  </span>
                </label>
                <input
                  type="tel"
                  name="telefono"
                  className="reg-input"
                  value={formData.telefono}
                  onChange={handleChange}
                  placeholder="10 dígitos"
                  maxLength={10}
                  style={{ borderColor: formData.telefono.length === 10 ? '#22c55e' : '' }}
                />
              </div>

              <div className="col-12 col-md-6">
                <label className="reg-label">Fecha de Nacimiento</label>
                <input type="date" name="fechaNacimiento" className="reg-input bg-dark text-white" value={formData.fechaNacimiento} onChange={handleChange} required />
              </div>
            </div>

            {/* ── Identidad en la Plataforma ── */}
            <p className="reg-section-label"><i className="fas fa-gamepad"></i> Identidad en la Plataforma</p>
            <div className="row g-3 mb-4">
              <div className="col-12">
                <label className="reg-label">Username (alias único sin espacios)</label>
                <input
                  type="text"
                  name="username"
                  autoComplete="username"
                  className="reg-input"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="Ej. lobo99"
                  required
                />
              </div>
              <div className="col-12 col-md-6">
                <label className="reg-label">Categoría Base</label>
                <select name="categoriaBase" className="reg-input" value={formData.categoriaBase} onChange={handleChange}>
                  <option value="Novato">Novato — aprendizaje de movimientos</option>
                  <option value="Principiante">Principiante — movimientos modificados</option>
                  <option value="Intermedio">Intermedio — buen dominio técnico</option>
                  <option value="RX">RX — avanzado, pesos completos</option>
                </select>
              </div>
              <div className="col-12 col-md-6">
                <label className="reg-label">Género de Competencia</label>
                <GeneroPicker valor={formData.genero} onCambiar={v => setFormData(prev => ({ ...prev, genero: v }))} />
              </div>
            </div>

            {/* ── Seguridad ── */}
            <p className="reg-section-label"><i className="fas fa-lock"></i> Seguridad</p>
            <div className="row g-3 mb-2">

              {/* Contraseña */}
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
                  <button
                    type="button"
                    onClick={() => setShowPass(p => !p)}
                    style={{
                      position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '0.9rem'
                    }}
                  >
                    <i className={showPass ? 'fas fa-eye-slash' : 'fas fa-eye'} />
                  </button>
                </div>
              </div>

              {/* Confirmar Contraseña */}
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
                  <button
                    type="button"
                    onClick={() => setShowPassConfirm(p => !p)}
                    style={{
                      position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '0.9rem'
                    }}
                  >
                    <i className={showPassConfirm ? 'fas fa-eye-slash' : 'fas fa-eye'} />
                  </button>
                </div>
              </div>

              {/* Indicador de fortaleza — igual que MiPerfil */}
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

            {/* Términos y Condiciones */}
            <div className="form-check mb-4 p-3 rounded" style={{ backgroundColor: 'rgba(231,76,60,0.05)', border: '1px solid rgba(231,76,60,0.2)' }}>
              <input className="form-check-input ms-1" type="checkbox" id="checkTerminos" required />
              <label className="form-check-label ms-3 text-light" htmlFor="checkTerminos" style={{ fontSize: '0.9rem' }}>
                He leído y acepto los{' '}
                <Link to="/terminos" target="_blank" className="text-info text-decoration-none fw-bold">Términos y Condiciones</Link>
              </label>
            </div>

            <div className="text-center mt-4 pt-2 border-top border-secondary">
              <BotonSeguro
                type="submit"
                className="reg-btn-submit w-100"
                disabled={!reglasPassword.esValida || formData.contrasena !== formData.confirmarContrasena}
                textoProcesando={<><i className="fas fa-spinner fa-spin"></i> Guardando...</>}
              >
                <i className="fas fa-check"></i> Activar Mi Cuenta
              </BotonSeguro>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
