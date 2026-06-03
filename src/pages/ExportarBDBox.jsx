import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BackButton from '../components/BackButton';
import ExportarBDTab from '../components/ExportarBDTab';
import '../assets/css/GestionClases.css';

export default function ExportarBDBox() {
  const navigate = useNavigate();
  const [box, setBox] = useState(null);

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem('usuario'));
    const b = JSON.parse(localStorage.getItem('box'));
    if (!u || !b) {
      navigate('/login');
      return;
    }
    // Verificar que el usuario tenga un rol permitido para exportar (por seguridad extra en UI)
    if (u.rol !== 'AdminBox' && u.rol !== 'Developer') {
      navigate('/login');
      return;
    }
    setBox(b);
  }, [navigate]);

  if (!box) return null;

  return (
    <div className="gc-page fadeIn">

      {/* ── HEADER (mismo patrón que GestionClases) ── */}
      <header className="gc-header">
        <div className="d-flex align-items-center gap-3">
          <BackButton />
          <h1 className="gc-header-title">
            Exportar <span>BD</span>
          </h1>
        </div>
      </header>

      <div className="container-xl px-3 px-md-4">
        <ExportarBDTab fixedBox={box} />
      </div>
    </div>
  );
}
