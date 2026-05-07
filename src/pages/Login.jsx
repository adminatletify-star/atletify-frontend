import { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import Particles from '../components/ReactBits/Particles';
import { useAuth } from '../context/AuthContext';
import BackButton from '../components/BackButton';
import '../assets/css/LoginPage.css';

export default function Login() {
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const isAddingAccount = queryParams.get('addAccount') === 'true';

  const { login, logout, usuario } = useAuth();

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
        const userObj = result.usuario || result;
        const token = result.token;

        login(userObj, token);
        const boxObj = result.box || userObj.box || result.boxInfo;
        if (boxObj) localStorage.setItem('box', JSON.stringify(boxObj));

        if (!userObj.aceptoTerminos) {
          navigate('/terminos', { state: { requiereAceptacion: true } });
          return;
        }

        // Redirección inteligente
        switch (userObj.rol) {
          case 'Developer': navigate('/dashboard'); break;
          case 'AdminBox':
          case 'Coach': navigate('/admin-box-panel'); break;
          case 'Usuario': navigate('/sala-espera'); break; // 👈 Los novatos van directo a la sala
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
      } else {
        alert(result.mensaje || "Credenciales incorrectas"); // 👈 Mostramos el motivo real
      }
    } catch (error) {
      alert("Error de conexión con el servidor.");
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
              <input type="text" className="login-input" placeholder="Ej. lobo99 o correo@ejemplo.com" value={correo} onChange={(e) => setCorreo(e.target.value)} required />
            </div>

            <div className="login-form-group">
              <label className="login-label">Contraseña</label>
              <input type="password" className="login-input" placeholder="Tu contraseña" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>

            <div className="text-end mb-4">
              <Link to="/forgot-password" className="text-info small text-decoration-none fw-bold">¿Olvidaste tu contraseña?</Link>
            </div>

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? <i className="fas fa-spinner fa-spin me-2"></i> : <i className="fas fa-arrow-right me-2"></i>}
              {loading ? 'Verificando...' : 'Entrar'}
            </button>
          </form>

          <div className="login-footer">
            <p className="login-footer-text">¿No tienes cuenta?</p>
            <Link to="/registro" className="login-link">Regístrate como Atleta</Link><br />
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