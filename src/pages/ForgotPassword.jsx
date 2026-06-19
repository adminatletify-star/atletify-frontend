import { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Particles from '../components/ReactBits/Particles';
import BackButton from '../components/BackButton';
import BotonSeguro from '../components/BotonSeguro';
import '../assets/css/LoginPage.css';
import '../assets/css/ForgotPassword.css';

export default function ForgotPassword() {
  const [correo, setCorreo] = useState('');
  const [aviso, setAviso] = useState(null); // { tipo: 'error' | 'limite', texto }
  const [enviado, setEnviado] = useState(false);
  const [correoEnviado, setCorreoEnviado] = useState('');
  const [loading, setLoading] = useState(false);
  const procesandoRef = useRef(false);
  const navigate = useNavigate();

  const handleSolicitar = async (e) => {
    if (e) e.preventDefault();
    // Doble guarda síncrona: protege tanto el Enter (onSubmit) como el clic (BotonSeguro)
    if (procesandoRef.current) return;
    if (!correo.trim()) return;

    procesandoRef.current = true;
    setLoading(true);
    setAviso(null);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/usuarios/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo })
      });

      if (response.ok) {
        const data = await response.json().catch(() => ({}));
        if (data.limiteExcedido) {
          setAviso({
            tipo: 'limite',
            texto: data.mensaje || 'Has superado el límite de solicitudes de recuperación por hoy. Intenta de nuevo mañana.'
          });
        } else {
          setCorreoEnviado(correo.trim());
          setEnviado(true);
          setCorreo('');
        }
      } else {
        setAviso({ tipo: 'error', texto: 'Hubo un error al procesar tu solicitud. Inténtalo de nuevo.' });
      }
    } catch (error) {
      setAviso({ tipo: 'error', texto: 'No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.' });
    } finally {
      setLoading(false);
      procesandoRef.current = false;
    }
  };

  const usarOtroCorreo = () => {
    setEnviado(false);
    setCorreoEnviado('');
    setAviso(null);
  };

  return (
    <div className="login-root">
      <div className="login-particles-bg">
        <Particles particleColors={["#ffffff", "#dc3545", "#ff4d4d"]} particleCount={350} particleSpread={15} speed={0.2} particleBaseSize={250} moveParticlesOnHover={true} alphaParticles={true} disableRotation={false} />
      </div>

      <div className="login-content-wrapper">
        <div className="login-card">
          <div className="login-back-nav"><BackButton onClick={() => navigate('/login')} /></div>

          {enviado ? (
            <div className="fp-success" role="status">
              <div className="fp-success-icon"><i className="fas fa-envelope-circle-check"></i></div>
              <h1 className="login-title fp-success-title">Revisa tu correo</h1>
              <p className="fp-success-text">
                Si <strong>{correoEnviado}</strong> está registrado en Atletify, te enviamos un enlace seguro para restablecer tu contraseña.
              </p>
              <div className="fp-success-meta">
                <span><i className="fas fa-clock"></i> Caduca en 24 horas</span>
                <span><i className="fas fa-shield-halved"></i> Un solo uso</span>
              </div>
              <p className="fp-success-hint">
                <i className="fas fa-folder-open"></i> ¿No lo encuentras? Revisa tu carpeta de spam o correo no deseado.
              </p>
              <button type="button" className="login-btn fp-btn" onClick={() => navigate('/login')}>
                <i className="fas fa-arrow-left me-2"></i>Volver al login
              </button>
              <button type="button" className="fp-text-btn" onClick={usarOtroCorreo}>
                Usar otro correo
              </button>
            </div>
          ) : (
            <>
              <div className="login-header">
                <div className="login-logo-circle fp-logo"><i className="fas fa-key login-logo-icon"></i></div>
                <h1 className="login-title">Recuperar Acceso</h1>
                <p className="login-subtitle">Ingresa tu correo para recibir un enlace seguro</p>
              </div>

              <form onSubmit={handleSolicitar} className="login-form">
                <div className="login-form-group">
                  <label className="login-label">Correo Electrónico</label>
                  <div className="fp-input-wrapper">
                    <i className="fas fa-envelope fp-input-icon"></i>
                    <input
                      type="email"
                      className="login-input fp-input--icon"
                      placeholder="tu@email.com"
                      value={correo}
                      onChange={(e) => setCorreo(e.target.value)}
                      required
                      disabled={loading}
                      autoFocus
                    />
                  </div>
                  <p className="fp-hint">
                    <i className="fas fa-shield-halved"></i> Te enviaremos un enlace de un solo uso que caduca en 24 horas.
                  </p>
                </div>

                {aviso && (
                  <div className={`fp-msg fp-msg--${aviso.tipo}`} role="alert">
                    <i className={`fas ${aviso.tipo === 'limite' ? 'fa-hourglass-half' : 'fa-circle-exclamation'} fp-msg-icon`}></i>
                    <span>{aviso.texto}</span>
                  </div>
                )}

                <BotonSeguro
                  type="button"
                  onClick={handleSolicitar}
                  className="login-btn fp-btn"
                  textoProcesando="Enviando..."
                  tiempoBloqueo={1000}
                  disabled={loading || !correo.trim()}
                >
                  <i className="fas fa-paper-plane me-2"></i>Enviar Enlace
                </BotonSeguro>
              </form>

              <div className="login-footer">
                <Link to="/login" className="fp-volver"><i className="fas fa-arrow-left me-1"></i>Volver al Login</Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
