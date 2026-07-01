import { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import Particles from '../components/ReactBits/Particles';
import { useAuth } from '../context/AuthContext';
import BackButton from '../components/BackButton';
import '../assets/css/LoginPage.css';

// Si no hay Client ID configurado, no mostramos el botón de Google (el login por
// contraseña funciona igual). El valor es público y se inyecta por variable de entorno.
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

export default function Login() {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const isAddingAccount = queryParams.get('addAccount') === 'true';
  const correoPrellenado = queryParams.get('correo') || '';
  const redirectAfter = queryParams.get('redirect') || location.state?.from || null;

  const [correo, setCorreo] = useState(correoPrellenado);
  const [password, setPassword] = useState('');
  const [verPassword, setVerPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const { login, logout, usuario } = useAuth();

  // Lógica compartida tras un login exitoso (por contraseña o por Google): guarda el box,
  // mete la sesión en el contexto (login() mantiene cuentasGuardadas/localStorage/box) y
  // redirige por rol. Es EXACTAMENTE el flujo que ya existía para el login normal.
  const procesarSesion = (result) => {
    const userObj = result.usuario || result;
    const token = result.token;

    const boxObj = result.box || userObj.box || result.boxInfo;
    if (boxObj) {
      localStorage.setItem('box', JSON.stringify(boxObj));
    } else {
      localStorage.removeItem('box');
    }

    login(userObj, token);

    if (!userObj.aceptoTerminos) {
      navigate('/terminos', { state: { requiereAceptacion: true } });
      return;
    }

    // Si venía con redirect específico (ej. desde un correo a /gestion-solicitudes o /corregir-solicitud),
    // y el rol del usuario está permitido en esa ruta, respetamos ese destino.
    if (redirectAfter) {
      navigate(redirectAfter, { replace: true });
      return;
    }

    // Redirección inteligente
    switch (userObj.rol) {
      case 'Developer': navigate('/dashboard'); break;
      case 'AdminBox':
      case 'Coach': navigate('/admin-box-panel'); break;
      case 'Usuario': {
        // Si su solicitud fue rechazada, va directo a corregirla. Si no, a la sala de espera.
        const rechazado = userObj.estadoSolicitud === 'Rechazado' || userObj.estatus === 'Rechazado';
        navigate(rechazado ? '/corregir-solicitud' : '/sala-espera');
        break;
      }
      case 'Juez':
        if (userObj.idCompetenciaAsignada) {
          navigate(`/juez/${userObj.idCompetenciaAsignada}`);
        } else {
          alert("Error: Juez sin competencia asignada.");
          logout();
          navigate('/');
        }
        break;
      default: navigate('/user-panel'); break;
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/usuarios/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo: correo, contrasena: password })
      });

      const result = await response.json(); // 👈 Leemos el JSON siempre

      if (response.ok) {
        procesarSesion(result);
      } else {
        alert(result.mensaje || "Credenciales incorrectas"); // 👈 Mostramos el motivo real
      }
    } catch (error) {
      alert("Error de conexión con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  // "Continuar con Google": el componente <GoogleLogin> nos entrega un id_token
  // (credential). Lo mandamos al backend, que lo verifica y responde EXACTAMENTE igual
  // que /login. Si el correo aún no tiene cuenta (404), lo mandamos al registro normal.
  const handleGoogleSuccess = async (credentialResponse) => {
    const idToken = credentialResponse?.credential;
    if (!idToken) {
      alert('No se recibió la credencial de Google. Intenta de nuevo.');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/usuarios/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken })
      });

      const result = await response.json();

      if (response.ok) {
        procesarSesion(result);
      } else if (response.status === 404 && result.necesitaRegistro) {
        // FASE B: correo sin cuenta → registro con Google. Guardamos el id_token para el
        // asistente (elegir box + completar perfil) y lo mandamos ahí.
        sessionStorage.setItem('googleRegToken', idToken);
        navigate('/registro-google');
      } else {
        alert(result.mensaje || 'No se pudo iniciar sesión con Google.');
      }
    } catch (error) {
      alert('Error de conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-root">
      <div className="login-particles-bg">
        <Particles particleColors={["#ffffff", "#dc3545", "#ff4d4d"]} particleCount={350} particleSpread={15} speed={0.2} particleBaseSize={250} moveParticlesOnHover={true} alphaParticles={true} />
      </div>

      <div className="login-content-wrapper">
        <div className="login-card">
          <div className="login-back-nav"><BackButton onClick={() => navigate('/')} /></div>
          <div className="login-header">
            <Link to="/" className="d-inline-block text-decoration-none">
              <div className="login-logo-circle"><i className="fas fa-paw login-logo-icon"></i></div>
            </Link>
            <h1 className="login-title">{isAddingAccount ? 'Añadir Cuenta' : 'Iniciar Sesión'}</h1>
            {isAddingAccount && <p className="text-white-50 small mt-2">Introduce las credenciales de tu otra cuenta.</p>}
          </div>

          <form onSubmit={handleLogin} className="login-form">
            <div className="login-form-group">
              <label className="login-label">Correo o Username</label>
              {/* 👇 CAMBIO CLAVE: type="text" para que acepte Usernames sin arroba 👇 */}
              <input type="text" className="login-input" placeholder="Ej. atleta99 o correo@ejemplo.com" value={correo} onChange={(e) => setCorreo(e.target.value)} required />
            </div>

            <div className="login-form-group">
              <label className="login-label">Contraseña</label>
              <div className="login-input-wrapper">
                <input type={verPassword ? 'text' : 'password'} className="login-input login-input--pass" placeholder="Tu contraseña" value={password} onChange={(e) => setPassword(e.target.value)} required />
                <button type="button" className="login-eye-btn" onClick={() => setVerPassword(v => !v)} tabIndex={-1} aria-label={verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
                  <i className={`fas ${verPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                </button>
              </div>
            </div>

            <div className="text-end mb-4">
              <Link to="/forgot-password" className="text-info small text-decoration-none fw-bold">¿Olvidaste tu contraseña?</Link>
            </div>

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? <i className="fas fa-spinner fa-spin me-2"></i> : <i className="fas fa-arrow-right me-2"></i>}
              {loading ? 'Verificando...' : 'Entrar'}
            </button>
          </form>

          {GOOGLE_CLIENT_ID && (
            <div className="login-google-section">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '1rem 0' }}>
                <span style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.15)' }} />
                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>o</span>
                <span style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.15)' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => alert('No se pudo conectar con Google. Intenta de nuevo.')}
                  theme="filled_black"
                  size="large"
                  text="continue_with"
                  shape="pill"
                  locale="es"
                  width="280"
                />
              </div>
            </div>
          )}

          <div className="login-footer">
            <p className="login-footer-text">¿No tienes cuenta?</p>
            <Link to="/directorio-boxes" className="login-link">Regístrate como Atleta</Link><br />
            {isAddingAccount && usuario ? (
               <button onClick={() => {
                 const route = usuario.rol === 'Developer' ? '/dashboard'
                              : usuario.rol === 'Atleta' || usuario.rol === 'Usuario' ? '/user-panel'
                                : '/admin-box-panel';
                 navigate(route);
               }} className="btn btn-link text-white-50 mt-2 text-decoration-none p-0 border-0">
                 <i className="fas fa-arrow-left me-1"></i>Volver a mi panel
               </button>
            ) : (
               <Link to="/" className="login-link-secondary"><i className="fas fa-arrow-left me-1"></i>Volver al inicio</Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}