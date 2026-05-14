import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BackButton from '../components/BackButton';
import ExportarBDTab from '../components/ExportarBDTab';
import '../assets/css/dashboard.css';
import '../assets/css/AtletasBox.css';

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
    <div className="atb-container fadeIn">
      <header className="atb-header">
        <div className="atb-header-inner">
          <BackButton />
          <div>
            <h1 className="atb-header-title">
              <i className="fas fa-database me-2" style={{ color: 'var(--primary)' }}></i>
              Exportar BD
            </h1>
            <p className="atb-header-sub">{box.nombre}</p>
          </div>
        </div>
      </header>

      <div className="p-4">
        <ExportarBDTab fixedBox={box} />
      </div>
    </div>
  );
}
