import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import BackButton from '../components/BackButton';
import '../assets/css/AdminArchivadas.css';

const API_BASE_URL = import.meta.env.VITE_API_URL;

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: i => ({ opacity: 1, y: 0, transition: { duration: 0.4, delay: i * 0.07 } }),
};

export default function AdminArchivadasDevDetalle() {
  const { idBox } = useParams();
  const navigate = useNavigate();
  const [competencias, setCompetencias] = useState([]);
  const [cargandoComp, setCargandoComp] = useState(true);
  const [boxData, setBoxData] = useState(null);
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem('usuario'));
    if (!u || u.rol !== 'Developer') navigate('/login');
  }, [navigate]);

  const cargarArchivadas = () => {
    setCargandoComp(true);
    fetch(`${API_BASE_URL}/competencias/box/${idBox}/archivadas`)
      .then(r => (r.ok ? r.json() : []))
      .then(data => setCompetencias(Array.isArray(data) ? data : []))
      .catch(() => setCompetencias([]))
      .finally(() => setCargandoComp(false));
  };

  useEffect(() => {
    fetch(`${API_BASE_URL}/box/${idBox}`)
      .then(r => r.json())
      .then(data => setBoxData(data))
      .catch(() => {});

    cargarArchivadas();
  }, [idBox]);

  const eliminarDefinitivamente = async (idCompetencia, nombre) => {
    if (!window.confirm(`⚠️ ADVERTENCIA CRÍTICA ⚠️\n\n¿Estás absolutamente seguro de eliminar "${nombre}"?\n\nEsta acción eliminará EN CASCADA:\n- Categorías y Equipos\n- Atletas\n- WODs y Scores\n- Pagos registrados\n- Préstamos de material\n\n¡ESTA ACCIÓN NO SE PUEDE DESHACER!`)) return;

    const input = window.prompt('Escribe "ELIMINAR" para confirmar:');
    if (input !== 'ELIMINAR') { alert('Operación cancelada.'); return; }

    try {
      const res = await fetch(`${API_BASE_URL}/competencias/${idCompetencia}`, { method: 'DELETE' });
      if (res.ok) {
        alert('¡Competencia y todos sus registros eliminados exitosamente!');
        cargarArchivadas();
      } else {
        const err = await res.json();
        alert(`Error: ${err.mensaje || 'No se pudo eliminar'}`);
      }
    } catch (err) {
      alert('Error de conexión al intentar eliminar.');
    }
  };

  const compsFiltradas = competencias.filter(c =>
    c.nombre?.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="aa-page">

      {/* HEADER */}
      <header className="aa-header">
        <div className="d-flex align-items-center justify-content-between gap-3">
          <div className="d-flex align-items-center gap-3">
            <BackButton to="/admin-archivadas" />
            <div className="aa-header-icon d-none d-sm-flex">
              <i className="fas fa-trash-alt" />
            </div>
            <h1 className="aa-header-title">
              {boxData?.nombre
                ? <><span>{boxData.nombre}</span> — Archivadas</>
                : <>Admin <span>Archivadas</span></>
              }
            </h1>
          </div>
          {!cargandoComp && (
            <span className="aa-badge-count">{competencias.length}</span>
          )}
        </div>
      </header>

      {/* CONTENIDO */}
      <div className="container px-3 px-md-4">

        {/* Banner de peligro */}
        <div className="aa-danger-banner mb-3">
          <i className="fas fa-exclamation-triangle" />
          <span>Zona de Peligro — Cada eliminación borra todos los datos en cascada e es irreversible</span>
        </div>

        {/* Búsqueda */}
        <div className="aa-search-wrap mb-4">
          <i className="fas fa-search aa-search-icon" />
          <input
            type="text"
            className="aa-search-input"
            placeholder="Buscar competencia archivada..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
          />
        </div>

        {/* Loader */}
        {cargandoComp && (
          <div className="aa-loader">
            <div className="aa-loader-spinner" />
            <p className="aa-loader-texto">Buscando registros...</p>
          </div>
        )}

        {/* DB limpia */}
        {!cargandoComp && competencias.length === 0 && (
          <motion.div className="aa-empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <i className="fas fa-check-circle aa-empty-icon" style={{ color: 'var(--success)', opacity: 1 }} />
            <p className="aa-empty-titulo">Base de datos limpia</p>
            <p className="aa-empty-sub">No hay competencias archivadas en este box.</p>
          </motion.div>
        )}

        {/* Sin resultados de búsqueda */}
        {!cargandoComp && compsFiltradas.length === 0 && competencias.length > 0 && (
          <motion.div className="aa-empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <i className="fas fa-search aa-empty-icon" />
            <p className="aa-empty-titulo">No se encontraron resultados</p>
          </motion.div>
        )}

        {/* Grid de competencias */}
        {!cargandoComp && compsFiltradas.length > 0 && (
          <div className="row g-3">
            {compsFiltradas.map((c, i) => (
              <div key={c.idCompetencia} className="col-12 col-md-6 col-lg-4">
                <motion.div
                  className="aa-comp-card"
                  custom={i}
                  variants={fadeUp}
                  initial="hidden"
                  animate="visible"
                >
                  {/* Banner / logo */}
                  <div className="aa-comp-banner">
                    {c.logoUrl
                      ? <img src={c.logoUrl} alt={c.nombre} className="aa-comp-banner-img" />
                      : <div className="aa-comp-banner-placeholder"><i className="fas fa-archive" /></div>
                    }
                    <div className="aa-comp-banner-overlay" />
                    <span className="aa-comp-badge">ARCHIVADA</span>
                  </div>

                  {/* Info */}
                  <div className="aa-comp-body">
                    <h3 className="aa-comp-nombre">{c.nombre}</h3>
                    <p className="aa-comp-id">
                      <i className="fas fa-database" />
                      ID DB: #{c.idCompetencia}
                    </p>

                    <button
                      className="aa-delete-btn"
                      onClick={() => eliminarDefinitivamente(c.idCompetencia, c.nombre)}
                    >
                      <i className="fas fa-trash-alt" />
                      Eliminar Definitivamente
                    </button>
                  </div>
                </motion.div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
