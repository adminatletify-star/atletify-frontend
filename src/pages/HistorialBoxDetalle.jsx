import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import '../assets/css/ListaCompetencias.css';
import BackButton from '../components/BackButton';

const API_BASE_URL = import.meta.env.VITE_API_URL;;

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: i => ({ opacity: 1, y: 0, transition: { duration: 0.5, delay: i * 0.08 } }),
};

export default function HistorialBoxDetalle() {
  const { idBox } = useParams();
  const navigate = useNavigate();
  const [competencias, setCompetencias] = useState([]);
  const [cargandoComp, setCargandoComp] = useState(true);
  const [boxData, setBoxData] = useState(null);
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    // Obtener detalles del box (opcional, solo para el título)
    fetch(`${API_BASE_URL}/box/${idBox}`)
      .then(r => r.json())
      .then(data => setBoxData(data))
      .catch(() => { });

    // Obtener competencias históricas
    fetch(`${API_BASE_URL}/competencias/box/${idBox}/historial-publico`)
      .then(r => (r.ok ? r.json() : []))
      .then(data => setCompetencias(Array.isArray(data) ? data : []))
      .catch(() => setCompetencias([]))
      .finally(() => setCargandoComp(false));
  }, [idBox]);

  const compsFiltradas = competencias.filter(c =>
    c.nombre?.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="lc-wrapper">

      {/* Botón volver */}
      <BackButton to="/historial-competencias" className="lc-back-fixed" />

      {/* Hero */}
      <section className="lc-hero">
        <motion.div
          className="lc-hero-content"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          <span className="lc-hero-tag">Muro del Honor</span>
          <h1 className="lc-hero-titulo text-uppercase" style={{ fontSize: 'clamp(2rem, 5vw, 4rem)' }}>
            {boxData?.nombre || 'BOX'}
          </h1>
          <div className="lc-hero-linea" />
          <p className="lc-hero-sub">Competencias finalizadas y resultados históricos</p>

          <div className="mt-4 mx-auto" style={{ maxWidth: '500px' }}>
            <div className="input-group">
              <span className="input-group-text bg-dark border-secondary text-secondary">
                <i className="fas fa-search"></i>
              </span>
              <input
                type="text"
                className="form-control bg-dark border-secondary text-white"
                placeholder="Buscar competencia por nombre..."
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                style={{ boxShadow: 'none' }}
              />
            </div>
          </div>
        </motion.div>
      </section>

      {/* Grid */}
      <section className="lc-grid-section">
        <div className="container">

          {cargandoComp && (
            <div className="lc-loader">
              <div className="lc-loader-spinner" />
              <p className="lc-loader-texto">Consultando los archivos...</p>
            </div>
          )}

          {!cargandoComp && competencias.length === 0 && (
            <motion.div className="lc-empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <i className="fas fa-archive lc-empty-icon"></i>
              <p className="lc-empty-titulo">No hay competencias en el historial</p>
              <p className="lc-empty-sub">Aún no se han guardado resultados para este box.</p>
            </motion.div>
          )}

          {!cargandoComp && competencias.length > 0 && compsFiltradas.length === 0 && (
            <motion.div className="lc-empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <i className="fas fa-search lc-empty-icon"></i>
              <p className="lc-empty-titulo">No se encontraron resultados</p>
              <p className="lc-empty-sub">Intenta con otro término de búsqueda.</p>
            </motion.div>
          )}

          {!cargandoComp && compsFiltradas.length > 0 && (
            <div className="row g-4">
              {compsFiltradas.map((c, i) => (
                <div key={c.idCompetencia} className="col-12 col-md-6 col-xl-4">
                  <motion.div
                    className="lc-card"
                    custom={i}
                    variants={fadeUp}
                    initial="hidden"
                    animate="visible"
                    whileHover={{ y: -6 }}
                    onClick={() => navigate(`/leaderboard/${c.idCompetencia}`)}
                  >
                    {/* Banner */}
                    <div className="lc-card-banner">
                      {c.logoUrl
                        ? <img src={c.logoUrl} alt={c.nombre} className="lc-card-banner-img" />
                        : (
                          <div className="lc-card-banner-placeholder">
                            <i className="fas fa-trophy"></i>
                          </div>
                        )
                      }
                      <div className="lc-card-banner-overlay" />
                      <span className="lc-badge bg-secondary text-white">
                        HISTORIAL
                      </span>
                    </div>

                    {/* Cuerpo */}
                    <div className="lc-card-body">
                      <h2 className="lc-card-nombre">{c.nombre}</h2>

                      <p className="lc-card-fecha text-secondary mb-4">
                        <i className="fas fa-calendar-check me-2"></i>
                        Finalizada el {new Date(c.fechaFin || c.fechaInicio).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })}
                      </p>

                      <button className="lc-card-cta" style={{ color: 'var(--accent)' }}>
                        <i className="fas fa-trophy me-2"></i> Ver Leaderboard
                      </button>
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
