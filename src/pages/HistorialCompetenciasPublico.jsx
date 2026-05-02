import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import '../assets/css/ListaCompetencias.css';
import BackButton from '../components/BackButton';

const API_BASE_URL = import.meta.env.VITE_API_URL;;

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: i => ({ opacity: 1, y: 0, transition: { duration: 0.5, delay: i * 0.08 } }),
};

export default function HistorialCompetenciasPublico() {
  const navigate = useNavigate();
  const [boxes, setBoxes] = useState([]);
  const [cargandoBoxes, setCargandoBoxes] = useState(true);
  const [busqueda, setBusqueda] = useState('');

  // Cargar lista de boxes
  useEffect(() => {
    fetch(`${API_BASE_URL}/box`)
      .then(r => (r.ok ? r.json() : []))
      .then(data => {
        setBoxes(Array.isArray(data) ? data : []);
      })
      .catch(() => setBoxes([]))
      .finally(() => setCargandoBoxes(false));
  }, []);

  const boxesFiltrados = boxes.filter(b =>
    b.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
    b.ubicacion?.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="lc-wrapper">

      {/* Botón volver */}
      <BackButton to="/" className="lc-back-fixed" />

      {/* Hero */}
      <section className="lc-hero">
        <motion.div
          className="lc-hero-content"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          <span className="lc-hero-tag">El Muro del Honor</span>
          <h1 className="lc-hero-titulo">
            HISTO<span>RIAL</span>
          </h1>
          <div className="lc-hero-linea" />
          <p className="lc-hero-sub">Selecciona un Box para ver sus batallas pasadas</p>

          <div className="mt-4 mx-auto" style={{ maxWidth: '500px' }}>
            <div className="input-group">
              <span className="input-group-text bg-dark border-secondary text-secondary">
                <i className="fas fa-search"></i>
              </span>
              <input
                type="text"
                className="form-control bg-dark border-secondary text-white"
                placeholder="Buscar box por nombre o ubicación..."
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                style={{ boxShadow: 'none' }}
              />
            </div>
          </div>
        </motion.div>
      </section>

      {/* Grid de Boxes */}
      <section className="lc-grid-section">
        <div className="container" style={{ maxWidth: '1000px' }}>

          {cargandoBoxes && (
            <div className="lc-loader">
              <div className="lc-loader-spinner" />
              <p className="lc-loader-texto">Cargando recintos...</p>
            </div>
          )}

          {!cargandoBoxes && boxes.length === 0 && (
            <motion.div className="lc-empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <i className="fas fa-warehouse lc-empty-icon"></i>
              <p className="lc-empty-titulo">No hay boxes registrados</p>
            </motion.div>
          )}

          {!cargandoBoxes && boxes.length > 0 && boxesFiltrados.length === 0 && (
            <motion.div className="lc-empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <i className="fas fa-search lc-empty-icon"></i>
              <p className="lc-empty-titulo">No se encontraron resultados</p>
              <p className="lc-empty-sub">Intenta con otro término de búsqueda.</p>
            </motion.div>
          )}

          {!cargandoBoxes && boxesFiltrados.length > 0 && (
            <div className="row g-4">
              {boxesFiltrados.map((b, i) => (
                <div key={b.idBox} className="col-12 col-md-6">
                  <motion.div
                    className="lc-card h-100 cursor-pointer p-4 d-flex align-items-center gap-3"
                    custom={i}
                    variants={fadeUp}
                    initial="hidden"
                    animate="visible"
                    whileHover={{ y: -6, backgroundColor: 'rgba(255,255,255,0.05)' }}
                    onClick={() => navigate(`/historial-competencias/${b.idBox}`)}
                    style={{ background: 'var(--card-bg)', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer' }}
                  >
                    <div style={{ width: '70px', height: '70px', borderRadius: '50%', overflow: 'hidden', background: '#000', flexShrink: 0 }}>
                      {b.logo ? (
                        <img src={`${import.meta.env.VITE_API_URL}${b.logo}`} alt={b.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div className="w-100 h-100 d-flex align-items-center justify-content-center">
                          <i className="fas fa-warehouse text-secondary fs-4"></i>
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="m-0 text-white fs-4">{b.nombre}</h3>
                      <p className="m-0 text-secondary mt-1"><i className="fas fa-map-marker-alt me-1"></i>{b.ubicacion || 'Sin ubicación'}</p>
                    </div>
                    <div className="ms-auto text-secondary">
                      <i className="fas fa-chevron-right"></i>
                    </div>
                  </motion.div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
