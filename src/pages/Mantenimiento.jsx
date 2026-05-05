import './PagesCSS/Mantenimiento.css';

export default function Mantenimiento() {
  return (
    <div className="mant-page">
      {/* Partículas decorativas */}
      <div className="mant-particles">
        {[...Array(6)].map((_, i) => (
          <div key={i} className={`mant-particle p-${i}`} />
        ))}
      </div>

      <div className="mant-content">
        {/* Mascota */}
        <div className="mant-mascot-wrapper">
          <div className="mant-mascot-glow" />
          <img
            src="/wolf-mantenimiento.png"
            alt="Wolf en mantenimiento"
            className="mant-mascot"
          />
        </div>

        {/* Texto principal */}
        <div className="mant-text">
          <p className="mant-subtitle">
            <i className="fas fa-hard-hat me-2"></i>
            Estamos trabajando para ti
          </p>
          <h1 className="mant-title">
            La página está actualmente en
            <span className="mant-highlight"> mantenimiento</span>
          </h1>
          <p className="mant-desc">
            Nuestro equipo está realizando mejoras para ofrecerte una mejor experiencia.
            <br />Vuelve pronto, no tardaremos mucho. 🐺
          </p>
        </div>

        {/* Barra de progreso animada */}
        <div className="mant-progress-wrapper">
          <div className="mant-progress-bar">
            <div className="mant-progress-fill" />
          </div>
          <small className="mant-progress-label">Progreso estimado...</small>
        </div>

        {/* Info de contacto */}
        <div className="mant-contact">
          <i className="fas fa-envelope me-2"></i>
          ¿Urgente? Contacta a tu administrador de Box
        </div>

        {/* Botón para cerrar sesión y volver al inicio */}
        <button
          className="mant-back-btn"
          onClick={() => {
            localStorage.removeItem('usuario');
            localStorage.removeItem('token');
            localStorage.removeItem('boxActivo');
            window.location.href = '/';
          }}
        >
          <i className="fas fa-arrow-left me-2"></i>
          Cerrar sesión e ir al inicio
        </button>
      </div>
    </div>
  );
}
