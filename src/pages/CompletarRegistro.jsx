import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import GeneroPicker from '../components/GeneroPicker';
import BotonSeguro from '../components/BotonSeguro';
import '../assets/css/Register.css'; // Reusamos los estilos de registro

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
  const [usernameDisponible, setUsernameDisponible] = useState(null);

  const [tokenEstado, setTokenEstado] = useState('cargando'); // 'cargando', 'valido', 'invalido', 'usado', 'expirado'
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
      } catch (error) {
        setTokenEstado('invalido');
        setTokenMensaje('Error al verificar el enlace.');
      }
    };
    
    verificarToken();
  }, [token, correoParam, API_URL]);

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
      }, 500); 
      return () => clearTimeout(timer);
    } else {
      setUsernameDisponible(null);
    }
  }, [formData.username, API_URL]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'username' && value.includes(' ')) return; // No espacios
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const showAlert = (mensaje, tipo = 'danger') => {
    const alerta = { id: Date.now(), mensaje, tipo };
    setAlerts(prev => [...prev, alerta]);
    setTimeout(() => setAlerts(prev => prev.filter(a => a.id !== alerta.id)), 5000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.contrasena !== formData.confirmarContrasena) return showAlert('Las contraseñas no coinciden.');
    if (usernameDisponible === false) return showAlert('El Username ya está ocupado.');
    
    try {
      const response = await fetch(`${API_URL}/usuarios/completar-registro`, {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          correo: correoParam,
          token: token,
          ...formData
        })
      });

      const data = await response.json();
      if (response.ok) {
        showAlert(data.mensaje, 'success');
        setTimeout(() => navigate('/login'), 3000);
      } else {
        showAlert(data.mensaje || 'Error al completar registro.');
      }
    } catch (e) { 
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
            <div className="reg-card text-center p-5 slide-in" style={{maxWidth: '500px'}}>
                {tokenEstado === 'usado' ? (
                    <i className="fas fa-check-circle fa-4x text-success mb-3"></i>
                ) : (
                    <i className="fas fa-exclamation-triangle fa-4x text-warning mb-3"></i>
                )}
                
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
      <div className="container" style={{maxWidth: '700px'}}>
        <div className="reg-page-header">
          <div className="reg-title-row justify-content-center">
            <div className="reg-icon-circle"><i className="fas fa-user-check"></i></div>
            <h1 className="reg-page-title">Último <span>Paso</span></h1>
          </div>
          <p className="reg-page-subtitle">Completa tus datos para tu cuenta asociada a {correoParam}</p>
        </div>

        <div className="reg-alerts">{alerts.map(a => <div key={a.id} className={`reg-alert reg-alert-${a.tipo}`}>{a.mensaje}</div>)}</div>

        <div className="reg-card">
          <form onSubmit={handleSubmit}>
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
              <div className="col-12 col-md-6">
                <label className="reg-label">Teléfono</label>
                <input type="tel" name="telefono" className="reg-input" value={formData.telefono} onChange={handleChange} />
              </div>
              <div className="col-12 col-md-6">
                <label className="reg-label">Fecha de Nacimiento</label>
                <input type="date" name="fechaNacimiento" className="reg-input bg-dark text-white" value={formData.fechaNacimiento} onChange={handleChange} required />
              </div>
            </div>

            <p className="reg-section-label"><i className="fas fa-gamepad"></i> Identidad en la Plataforma</p>
            <div className="row g-3 mb-4">
              <div className="col-12">
                <label className="reg-label d-flex justify-content-between">
                  <span>Username (Alias único sin espacios)</span>
                  {usernameDisponible === true && <span className="text-success"><i className="fas fa-check-circle"></i> Disponible</span>}
                  {usernameDisponible === false && <span className="text-danger"><i className="fas fa-times-circle"></i> Ocupado</span>}
                </label>
                <input type="text" name="username" className={`reg-input ${usernameDisponible === false ? 'border-danger' : ''}`} value={formData.username} onChange={handleChange} placeholder="Ej. lobo99" required />
              </div>
              <div className="col-12 col-md-6">
                <label className="reg-label">Categoría Base</label>
                <select name="categoriaBase" className="reg-input" value={formData.categoriaBase} onChange={handleChange}>
                    <option value="Novato">Novato</option>
                    <option value="Principiante">Principiante</option>
                    <option value="Intermedio">Intermedio</option>
                    <option value="Avanzado">Avanzado</option>
                    <option value="Elite">Elite</option>
                </select>
              </div>
              <div className="col-12 col-md-6">
                <label className="reg-label">Género de Competencia</label>
                <GeneroPicker valor={formData.genero} onCambiar={v => setFormData(prev => ({ ...prev, genero: v }))} />
              </div>
            </div>

            <p className="reg-section-label"><i className="fas fa-lock"></i> Seguridad</p>
            <div className="row g-3 mb-4">
              <div className="col-12 col-md-6">
                <label className="reg-label">Contraseña</label>
                <input type="password" name="contrasena" className="reg-input" value={formData.contrasena} onChange={handleChange} required minLength="6" />
              </div>
              <div className="col-12 col-md-6">
                <label className="reg-label">Confirmar Contraseña</label>
                <input type="password" name="confirmarContrasena" className="reg-input" value={formData.confirmarContrasena} onChange={handleChange} required minLength="6" />
              </div>
            </div>

            <div className="form-check mb-4 p-3 rounded" style={{ backgroundColor: 'rgba(231, 76, 60, 0.05)', border: '1px solid rgba(231, 76, 60, 0.2)' }}>
              <input className="form-check-input ms-1" type="checkbox" id="checkTerminos" required />
              <label className="form-check-label ms-3 text-light" htmlFor="checkTerminos" style={{ fontSize: '0.9rem' }}>
                He leído y acepto los <Link to="/terminos" target="_blank" className="text-info text-decoration-none fw-bold">Términos y Condiciones</Link>
              </label>
            </div>

            <div className="text-center mt-4 pt-2 border-top border-secondary">
              <BotonSeguro type="submit" className="reg-btn-submit w-100" disabled={usernameDisponible === false} textoProcesando={<><i className="fas fa-spinner fa-spin"></i> Guardando...</>}>
                <i className="fas fa-check"></i> Activar Mi Cuenta
              </BotonSeguro>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
