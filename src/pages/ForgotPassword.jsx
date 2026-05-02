import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Particles from '../components/ReactBits/Particles';
import BackButton from '../components/BackButton';
import '../assets/css/LoginPage.css';

export default function ForgotPassword() {
  const [correo, setCorreo] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSolicitar = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMensaje('');

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/usuarios/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo })
      });

      if (response.ok) {
        setMensaje("Si el correo existe en nuestro sistema, hemos enviado un enlace de recuperación. Revisa tu consola (o tu email).");
        setCorreo('');
      } else {
        setMensaje("Hubo un error al procesar tu solicitud.");
      }
    } catch (error) {
      setMensaje("Error de conexión con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-root">
      <div className="login-particles-bg">
        <Particles particleColors={["#ffffff", "#dc3545", "#ff4d4d"]} particleCount={350} particleSpread={15} speed={0.2} particleBaseSize={250} moveParticlesOnHover={true} alphaParticles={true} disableRotation={false} />
      </div>

      <div className="login-content-wrapper">
        <div className="login-card">
          <div className="login-back-nav"><BackButton onClick={() => navigate('/login')} /></div>

          <div className="login-header">
            <div className="login-logo-circle"><i className="fas fa-key login-logo-icon"></i></div>
            <h1 className="login-title">Recuperar Acceso</h1>
            <p className="login-subtitle">Ingresa tu correo para recibir un enlace seguro</p>
          </div>

          <form onSubmit={handleSolicitar} className="login-form">
            <div className="login-form-group">
              <label className="login-label">Correo Electrónico</label>
              <input type="email" className="login-input" placeholder="tu@email.com" value={correo} onChange={(e) => setCorreo(e.target.value)} required disabled={loading} />
            </div>

            {mensaje && <div className="alert alert-info text-center small fw-bold mb-3 bg-black border-info text-info">{mensaje}</div>}

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? <i className="fas fa-spinner fa-spin me-2"></i> : <i className="fas fa-paper-plane me-2"></i>}
              Enviar Enlace
            </button>
          </form>

          <div className="login-footer">
            <Link to="/login" className="login-link-secondary"><i className="fas fa-arrow-left me-1"></i>Volver al Login</Link>
          </div>
        </div>
      </div>
    </div>
  );
}