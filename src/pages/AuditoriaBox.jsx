import { useState } from 'react';
import BackButton from '../components/BackButton';
import ExportAuditoriaTab from '../components/ExportAuditoriaTab';
import AuditoriaUserTab from '../components/AuditoriaUserTab';
import '../assets/css/GestionClases.css';
import '../assets/css/AdminPreregistros.css';

// Auditoría acotada al propio box, para el entorno de AdminBox (se entra desde
// AdminBoxPanel → "Configuración & Herramientas"). Muestra las mismas dos vistas que
// admin-preregistros (Seguridad y Usuarios), pero el backend acota al box del administrador
// (claim "IdBox") y oculta las acciones hechas por un Developer (esas solo las ve el Developer).
export default function AuditoriaBox() {
  const [subTab, setSubTab] = useState('seguridad');

  return (
    <div className="ap-page">
      <header className="gc-header">
        <div className="d-flex align-items-center gap-3">
          <BackButton />
          <h1 className="gc-header-title">
            Logs de <span>Auditoría</span>
          </h1>
        </div>
      </header>

      <div className="container-xl px-3 px-md-4">
        <div className="ap-tabs-wrap mb-4">
          <nav className="ap-tabs">
            <button
              className={`ap-tab ${subTab === 'seguridad' ? 'ap-tab--active' : ''}`}
              onClick={() => setSubTab('seguridad')}
            >
              <i className="fas fa-shield-alt" />
              Seguridad
            </button>
            <button
              className={`ap-tab ${subTab === 'usuarios' ? 'ap-tab--active' : ''}`}
              onClick={() => setSubTab('usuarios')}
            >
              <i className="fas fa-users-cog" />
              Usuarios
            </button>
          </nav>
        </div>

        {subTab === 'seguridad' && <ExportAuditoriaTab />}
        {subTab === 'usuarios' && <AuditoriaUserTab ocultarFiltroBox />}
      </div>
    </div>
  );
}
