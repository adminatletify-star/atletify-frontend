import { useNavigate, useLocation } from 'react-router-dom';
import '../assets/css/NotFound.css';

export default function NotFound() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="nf-root">
      {/* Background grid con máscara radial */}
      <div className="nf-grid" />

      {/* Top bar */}
      <header className="nf-header">
        <div className="nf-logo">
          <div className="nf-logo-mark">AS</div>
          <span className="nf-logo-name">atletify system</span>
        </div>
        <span className="nf-eyebrow">error · http 404</span>
      </header>

      {/* Hero */}
      <main className="nf-main">
        <div className="nf-content">
          {/* Badge DNF */}
          <div className="nf-badge">
            <span className="nf-badge-dot" />
            DNF · did not finish
          </div>

          {/* 404 — "0" es disco de pesa */}
          <div className="nf-numeral" aria-label="404">
            <span>4</span>
            <span className="nf-plate">
              <span className="nf-plate-hole" />
            </span>
            <span>4</span>
          </div>

          <p className="nf-title">
            Esta rep <span className="nf-red">no contó</span>.
          </p>
          <p className="nf-desc">
            La página que buscás no existe, o se cambió de box. Volvé al rack
            principal y seguimos con el WOD.
          </p>

          <button className="nf-btn" onClick={() => navigate('/')}>
            ← Volver al home
          </button>
        </div>
      </main>

      {/* Footer status */}
      <footer className="nf-footer">
        <span>STATUS_CODE :: 404</span>
        <span>ruta_solicitada :: {location.pathname}</span>
        <span>session :: atletify · system</span>
      </footer>
    </div>
  );
}
