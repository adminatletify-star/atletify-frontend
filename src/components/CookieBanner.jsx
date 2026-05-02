import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import '../assets/css/CookieBanner.css';

export default function CookieBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Si no ha aceptado las cookies previamente, mostrar el banner
    const cookiesAceptadas = localStorage.getItem('cookiesAceptadas');
    if (!cookiesAceptadas) {
      // Pequeño retraso para que la animación de entrada se vea más orgánica
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAceptar = () => {
    localStorage.setItem('cookiesAceptadas', 'true');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="cookie-banner-overlay animate__animated animate__fadeInUp">
      <div className="cookie-banner-container">
        <div className="cookie-content">
          <div className="cookie-icon">
            <i className="fas fa-cookie-bite"></i>
          </div>
          <div className="cookie-text">
            <h4>Valoramos tu privacidad</h4>
            <p>
              Utilizamos cookies esenciales para mejorar tu experiencia y mantener tu sesión activa. 
              Al continuar navegando, aceptas nuestra política de cookies.
            </p>
          </div>
        </div>
        <div className="cookie-actions">
          <Link to="/politica-cookies" className="btn btn-outline-light rounded-pill px-3 me-2" style={{ fontSize: '0.9rem' }}>
            Leer Política
          </Link>
          <button onClick={handleAceptar} className="btn btn-success rounded-pill px-4 fw-bold" style={{ fontSize: '0.95rem', color: '#000' }}>
            Aceptar
          </button>
        </div>
      </div>
    </div>
  );
}
