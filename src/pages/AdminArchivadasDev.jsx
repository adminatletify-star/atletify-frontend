import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import BackButton from '../components/BackButton';
import '../assets/css/AdminArchivadas.css';

const API_BASE_URL = import.meta.env.VITE_API_URL;

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: i => ({ opacity: 1, y: 0, transition: { duration: 0.4, delay: i * 0.07 } }),
};

export default function AdminArchivadasDev() {
  const navigate = useNavigate();
  const [boxes, setBoxes] = useState([]);
  const [cargandoBoxes, setCargandoBoxes] = useState(true);
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem('usuario'));
    if (!u || u.rol !== 'Developer') {
      navigate('/login');
    }
  }, [navigate]);

  useEffect(() => {
    fetch(`${API_BASE_URL}/box`)
      .then(r => (r.ok ? r.json() : []))
      .then(data => setBoxes(Array.isArray(data) ? data : []))
      .catch(() => setBoxes([]))
      .finally(() => setCargandoBoxes(false));
  }, []);

  const boxesFiltrados = boxes.filter(b =>
    b.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
    b.ubicacion?.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="aa-page">

      {/* HEADER */}
      <header className="aa-header">
        <div className="d-flex align-items-center justify-content-between gap-3">
          <div className="d-flex align-items-center gap-3">
            <BackButton to="/dashboard" />
            <div className="aa-header-icon d-none d-sm-flex">
              <i className="fas fa-database" />
            </div>
            <h1 className="aa-header-title">
              Admin <span>Archivadas</span>
            </h1>
          </div>
          {!cargandoBoxes && (
            <span className="aa-badge-count">{boxes.length}</span>
          )}
        </div>
      </header>

      {/* CONTENIDO */}
      <div className="container px-3 px-md-4">

        {/* Banner de peligro + búsqueda */}
        <div className="aa-danger-banner mb-3">
          <i className="fas fa-exclamation-triangle" />
          <span>Zona de Peligro — Selecciona un Box para eliminar definitivamente sus competencias archivadas</span>
        </div>

        <div className="aa-search-wrap mb-4">
          <i className="fas fa-search aa-search-icon" />
          <input
            type="text"
            className="aa-search-input"
            placeholder="Buscar box por nombre o ubicación..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
          />
        </div>

        {/* Loader */}
        {cargandoBoxes && (
          <div className="aa-loader">
            <div className="aa-loader-spinner" />
            <p className="aa-loader-texto">Conectando a la DB...</p>
          </div>
        )}

        {/* Empty */}
        {!cargandoBoxes && boxesFiltrados.length === 0 && (
          <motion.div className="aa-empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <i className="fas fa-search aa-empty-icon" />
            <p className="aa-empty-titulo">No se encontraron resultados</p>
          </motion.div>
        )}

        {/* Grid de boxes */}
        {!cargandoBoxes && boxesFiltrados.length > 0 && (
          <div className="row g-3">
            {boxesFiltrados.map((b, i) => (
              <div key={b.idBox} className="col-12 col-md-6 col-lg-4">
                <motion.div
                  className="aa-box-card"
                  custom={i}
                  variants={fadeUp}
                  initial="hidden"
                  animate="visible"
                  onClick={() => navigate(`/admin-archivadas/${b.idBox}`)}
                >
                  <div className="aa-box-logo">
                    {b.logo && b.logo.trim() !== '' ? (
                      <img
                        src={b.logo}
                        alt={b.nombre}
                      />
                    ) : (
                      <i className="fas fa-warehouse" />
                    )}
                  </div>

                  <div className="aa-box-info">
                    <h3 className="aa-box-nombre">{b.nombre}</h3>
                    <p className="aa-box-sub">
                      <i className="fas fa-map-marker-alt" />
                      {b.ubicacion || 'Sin ubicación'}
                    </p>
                  </div>

                  <div className="aa-box-arrow">
                    <i className="fas fa-chevron-right" />
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
