import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import BotonSeguro from '../components/BotonSeguro';
import '../assets/css/Register.css';

const ATLETIFY_LOGO = '/LogosDeAtletify/LogoLetrasBlanco.png';

export function Register() {
  const { idBox } = useParams();
  const navigate = useNavigate();
  const API_URL = `${import.meta.env.VITE_API_URL}/api`;

  const [correo, setCorreo] = useState('');
  const [boxSeleccionado, setBoxSeleccionado] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [enviado, setEnviado] = useState(false);
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    if (!idBox) return;
    fetch(`${API_URL}/box/${idBox}`)
      .then(res => res.ok ? res.json() : null)
      .then(setBoxSeleccionado)
      .catch(() => showAlert('Error al cargar el Box'));
  }, [idBox]);

  const showAlert = (mensaje, tipo = 'danger') => {
    const alerta = { id: Date.now(), mensaje, tipo };
    setAlerts(prev => [...prev, alerta]);
    setTimeout(() => setAlerts(prev => prev.filter(a => a.id !== alerta.id)), 5000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!correo) return showAlert('Ingresa tu correo electrónico.');
    try {
      const response = await fetch(`${API_URL}/usuarios/iniciar-registro`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo, idBox: parseInt(idBox) })
      });
      const data = await response.json();
      if (response.ok) {
        setEnviado(true);
      } else {
        showAlert(data.mensaje || 'Error al procesar la solicitud.');
      }
    } catch {
      showAlert('Error de conexión.');
    }
  };

  const tieneLogoBox = !logoError && boxSeleccionado?.logo && boxSeleccionado.logo.trim() !== '';

  if (!idBox) return (
    <div className="reg-root">
      <div className="reg-card text-center">
        <img src={ATLETIFY_LOGO} alt="Atletify" className="reg-brand-logo mb-3" />
        <h3 className="fw-bold" style={{ color: 'var(--primary)' }}>⚠️ Enlace Privado</h3>
        <p style={{ color: 'rgba(255,255,255,0.5)' }}>Para registrarte, pídele a tu Box su enlace de invitación.</p>
        <Link to="/directorio-boxes" className="reg-btn-submit text-decoration-none d-inline-flex mt-3">
          <i className="fas fa-arrow-left me-2" /> Volver
        </Link>
      </div>
    </div>
  );

  return (
    <div className="reg-root">
      <div className="reg-alerts">
        {alerts.map(a => (
          <div key={a.id} className={`reg-alert reg-alert-${a.tipo}`}>{a.mensaje}</div>
        ))}
      </div>

      {enviado ? (
        <div className="reg-card text-center reg-card--sent">
          <div className="reg-sent-icon">
            <i className="fas fa-envelope-open-text" />
          </div>
          <h3 className="reg-sent-title">¡Revisa tu correo!</h3>
          <p className="reg-sent-sub">
            Te enviamos un enlace a <strong>{correo}</strong> para continuar con tu registro.
          </p>
          <p className="reg-sent-hint">Puede tardar unos minutos. Revisa tu carpeta de Spam.</p>
          <Link to="/directorio-boxes" className="reg-btn-back-dir mt-2">
            <i className="fas fa-arrow-left me-2" /> Volver al directorio
          </Link>
        </div>
      ) : (
        <div className="reg-card">

          {/* Logo del box (en anillo) o logo de Atletify (libre) */}
          <div className="reg-logo-area">
            {tieneLogoBox ? (
              <>
                <div className="reg-logo-ring">
                  <img
                    src={boxSeleccionado.logo}
                    alt={boxSeleccionado.nombre}
                    className="reg-logo-img"
                    onError={() => setLogoError(true)}
                  />
                </div>
                <span className="reg-powered">Powered by Atletify</span>
              </>
            ) : (
              <img
                src={ATLETIFY_LOGO}
                alt="Atletify"
                className="reg-atletify-logo"
              />
            )}
          </div>

          <div className="reg-header">
            <h2 className="reg-title">
              Únete a{' '}
              <span className="reg-title-accent">
                {boxSeleccionado?.nombre || 'WolfPack'}
              </span>
            </h2>
            <p className="reg-subtitle">Ingresa tu correo para comenzar</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="reg-field">
              <label className="reg-label">Correo electrónico</label>
              <div className="reg-input-wrap">
                <i className="fas fa-envelope reg-input-icon" />
                <input
                  type="email"
                  className="reg-input"
                  value={correo}
                  onChange={e => setCorreo(e.target.value)}
                  placeholder="tucorreo@ejemplo.com"
                  required
                />
              </div>
            </div>

            <BotonSeguro
              type="submit"
              className="reg-btn-submit w-100"
              textoProcesando={<><i className="fas fa-spinner fa-spin me-2" />Enviando...</>}
            >
              Continuar <i className="fas fa-arrow-right ms-2" />
            </BotonSeguro>
          </form>

          <div className="reg-footer">
            <button
              type="button"
              className="reg-btn-volver"
              onClick={() => navigate(-1)}
            >
              <i className="fas fa-arrow-left me-1" /> Volver
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
