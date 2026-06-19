import { useState, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import Particles from '../components/ReactBits/Particles';
import BotonSeguro from '../components/BotonSeguro';
import PasswordRulesHint from '../components/PasswordRulesHint';
import usePasswordStrength from '../hooks/usePasswordStrength';
import '../assets/css/LoginPage.css';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token'); // Atrapamos el token de la URL
  const navigate = useNavigate();

  const [nuevaContrasena, setNuevaContrasena] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [verPass, setVerPass] = useState(false);
  const [verConfirm, setVerConfirm] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [loading, setLoading] = useState(false);
  const [exito, setExito] = useState(false);
  const procesandoRef = useRef(false);

  // Verificación de fortaleza en tiempo real (mismo hook/componente que Mi Perfil)
  const reglas = usePasswordStrength(nuevaContrasena);
  const coinciden = nuevaContrasena.length > 0 && nuevaContrasena === confirmar;
  const puedeGuardar = reglas.esValida && coinciden;

  const handleReset = async (e) => {
    if (e) e.preventDefault();
    // Guarda síncrona: serializa tanto el Enter (onSubmit) como el clic (BotonSeguro)
    if (procesandoRef.current) return;
    if (!reglas.esValida) return setMensaje('La contraseña no cumple con los requisitos de seguridad.');
    if (nuevaContrasena !== confirmar) return setMensaje('Las contraseñas no coinciden.');

    procesandoRef.current = true;
    setLoading(true);
    setMensaje('');

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/usuarios/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, nuevaContrasena })
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        setExito(true);
        setMensaje('¡Tu contraseña ha sido actualizada con éxito!');
        setTimeout(() => navigate('/login'), 3000);
      } else {
        setMensaje(data.mensaje || 'El enlace es inválido o ha expirado.');
      }
    } catch (error) {
      setMensaje('Error de conexión con el servidor.');
    } finally {
      setLoading(false);
      procesandoRef.current = false;
    }
  };

  if (!token) {
    return (
      <div className="login-root d-flex justify-content-center align-items-center">
        <div className="login-card text-center">
          <h3 className="text-danger fw-bold"><i className="fas fa-exclamation-triangle me-2"></i>Enlace Inválido</h3>
          <p className="text-secondary">No se detectó un código de seguridad seguro.</p>
          <Link to="/login" className="login-btn mt-3 text-decoration-none">Ir al Login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="login-root">
      <div className="login-particles-bg">
        <Particles particleColors={["#ffffff", "#dc3545", "#ff4d4d"]} particleCount={350} particleSpread={15} speed={0.2} particleBaseSize={250} moveParticlesOnHover={true} alphaParticles={true} disableRotation={false} />
      </div>

      <div className="login-content-wrapper">
        <div className="login-card">
          <div className="login-header">
            <div className="login-logo-circle"><i className="fas fa-unlock-alt login-logo-icon"></i></div>
            <h1 className="login-title">Nueva Contraseña</h1>
            <p className="login-subtitle">Crea una nueva contraseña segura para tu cuenta</p>
          </div>

          {!exito ? (
            <form onSubmit={handleReset} className="login-form">
              <div className="login-form-group">
                <label className="login-label">Nueva Contraseña</label>
                <div className="login-input-wrapper">
                  <input
                    type={verPass ? 'text' : 'password'}
                    className="login-input login-input--pass"
                    placeholder="Mínimo 8 caracteres"
                    value={nuevaContrasena}
                    onChange={(e) => setNuevaContrasena(e.target.value)}
                    required
                    disabled={loading}
                    autoFocus
                  />
                  <button type="button" className="login-eye-btn" onClick={() => setVerPass(v => !v)} tabIndex={-1} aria-label={verPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
                    <i className={`fas ${verPass ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                  </button>
                </div>
              </div>

              <div className="login-form-group">
                <label className="login-label">Confirmar Contraseña</label>
                <div className="login-input-wrapper">
                  <input
                    type={verConfirm ? 'text' : 'password'}
                    className="login-input login-input--pass"
                    placeholder="Escríbela de nuevo"
                    value={confirmar}
                    onChange={(e) => setConfirmar(e.target.value)}
                    required
                    disabled={loading}
                  />
                  <button type="button" className="login-eye-btn" onClick={() => setVerConfirm(v => !v)} tabIndex={-1} aria-label={verConfirm ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
                    <i className={`fas ${verConfirm ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                  </button>
                </div>
              </div>

              {(nuevaContrasena.length > 0 || confirmar.length > 0) && (
                <div className="login-form-group">
                  <PasswordRulesHint
                    reglas={reglas}
                    password={nuevaContrasena}
                    passwordConfirm={confirmar}
                  />
                </div>
              )}

              {mensaje && <div className="alert alert-danger text-center small fw-bold mb-3 bg-black border-danger text-danger">{mensaje}</div>}

              <BotonSeguro
                type="button"
                onClick={handleReset}
                className="login-btn"
                textoProcesando="Guardando..."
                tiempoBloqueo={1000}
                disabled={loading || !puedeGuardar}
              >
                <i className="fas fa-save me-2"></i>Guardar Contraseña
              </BotonSeguro>
            </form>
          ) : (
            <div className="text-center py-4">
              <i className="fas fa-check-circle text-success" style={{ fontSize: '4rem' }}></i>
              <h4 className="text-white fw-bold mt-3">¡Misión Cumplida!</h4>
              <p className="text-secondary">{mensaje}</p>
              <p className="small text-info mt-3"><i className="fas fa-spinner fa-spin me-2"></i>Redirigiendo al Login...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
