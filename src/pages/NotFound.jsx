import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../assets/css/NotFound.css';

export default function NotFound() {
  const navigate = useNavigate();
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const handleGlobalMouseMove = (e) => {
      setMousePos({
        x: (e.clientX / window.innerWidth) * 2 - 1, // Rango de -1 a 1
        y: (e.clientY / window.innerHeight) * 2 - 1
      });
    };
    window.addEventListener('mousemove', handleGlobalMouseMove);
    return () => window.removeEventListener('mousemove', handleGlobalMouseMove);
  }, []);

  // Calcular el desplazamiento de los ojos basado en el mouse
  const eyeOffsetX = mousePos.x * 6;
  const eyeOffsetY = mousePos.y * 6;

  return (
    <div className="okay-notfound-container">
      <div className="okay-content">
        <div 
          className="okay-face-wrapper"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <svg viewBox="0 0 100 100" className="okay-face">
            {/* Cara circular */}
            <circle 
              cx="50" 
              cy="50" 
              r="48" 
              fill={isHovered ? "#ff4757" : "#eccc68"} 
              style={{ transition: 'fill 0.3s ease' }}
            />
            
            {/* Ojos que siguen el cursor */}
            <g style={{ transform: `translate(${eyeOffsetX}px, ${eyeOffsetY}px)`, transition: 'transform 0.1s ease-out' }}>
              <circle cx="32" cy="40" r="6" fill="#1e272e" />
              <circle cx="68" cy="40" r="6" fill="#1e272e" />
            </g>

            {/* Boca (Neutral a Triste) */}
            {isHovered ? (
              <path 
                d="M 30 72 Q 50 55 70 72" 
                stroke="#1e272e" 
                strokeWidth="6" 
                fill="transparent" 
                strokeLinecap="round" 
                style={{ transition: 'd 0.3s ease' }}
              />
            ) : (
              <line 
                x1="32" 
                y1="68" 
                x2="68" 
                y2="68" 
                stroke="#1e272e" 
                strokeWidth="6" 
                strokeLinecap="round" 
                style={{ transition: 'all 0.3s ease' }}
              />
            )}
          </svg>
        </div>

        <h1 className="okay-title">404</h1>
        <p className="okay-subtitle">Page not found.</p>
        <p className="okay-desc">
          The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
        </p>

        <button className="okay-btn" onClick={() => navigate('/')}>
          Return Home
        </button>
      </div>
    </div>
  );
}
