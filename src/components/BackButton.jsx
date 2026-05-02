import { useNavigate, useLocation } from 'react-router-dom';
import './BackButton.css';

export default function BackButton({ to, onClick, className = '' }) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (location.key !== 'default') {
      navigate(-1);
    } else {
      navigate(to || '/');
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`back-btn d-inline-flex align-items-center justify-content-center flex-shrink-0 ${className}`}
      title="Volver atrás"
      aria-label="Volver atrás"
    >
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11.5 3.5L5.5 9l6 5.5" />
      </svg>
    </button>
  );
}
