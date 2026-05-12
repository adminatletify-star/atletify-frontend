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

export default function ListaCompetencias() {
  const navigate = useNavigate();
  const [competencias, setCompetencias] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE_URL}/competencias/publicas`)
      .then(r => (r.ok ? r.json() : []))
      .then(data => {
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        const vigentes = (Array.isArray(data) ? data : []).filter(c => {
          const fechaFin = c.fechaFin || c.FechaFin || c.fechaInicio || c.FechaInicio;
          return fechaFin ? new Date(fechaFin) >= hoy : true;
        });
        setCompetencias(vigentes);
      })
      .catch(() => setCompetencias([]))
      .finally(() => setCargando(false));
  }, []);

  return (
    <div className="lc-wrapper">

      {/* Botón volver eliminado */}

      {/* Hero */}
      <section className="lc-hero">
        <motion.div
          className="lc-hero-content"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          <span className="lc-hero-tag">Wolf Pack Games</span>
          <h1 className="lc-hero-titulo">
            COMPE<span>TENCIAS</span>
          </h1>
          <div className="lc-hero-linea" />
          <p className="lc-hero-sub">Encuentra tu próxima arena de batalla</p>
        </motion.div>
      </section>

      {/* Grid */}
      <section className="lc-grid-section">
        <div className="container">

          {/* Loader */}
          {cargando && (
            <div className="lc-loader">
              <div className="lc-loader-spinner" />
              <p className="lc-loader-texto">Cargando competencias...</p>
            </div>
          )}

          {/* Sin resultados */}
          {!cargando && competencias.length === 0 && (
            <motion.div
              className="lc-empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <i className="fas fa-trophy lc-empty-icon"></i>
              <p className="lc-empty-titulo">Sin competencias activas por ahora</p>
              <p className="lc-empty-sub">Pronto se anunciarán nuevas competencias. Mantente al pendiente.</p>
            </motion.div>
          )}

          {/* Tarjetas */}
          {!cargando && competencias.length > 0 && (
            <div className="row g-4">
              {competencias.map((c, i) => (
                <div key={c.idCompetencia} className="col-12 col-md-6 col-xl-4">
                  <motion.div
                    className="lc-card"
                    custom={i}
                    variants={fadeUp}
                    initial="hidden"
                    animate="visible"
                    whileHover={{ y: -6 }}
                    onClick={() => navigate(`/portal-competencias/${c.idCompetencia}`)}
                  >
                    {/* Banner */}
                    <div className="lc-card-banner">
                      {c.logoUrl
                        ? <img src={c.logoUrl} alt={c.nombre} className="lc-card-banner-img" />
                        : (
                          <div className="lc-card-banner-placeholder">
                            <i className="fas fa-paw"></i>
                          </div>
                        )
                      }
                      <div className="lc-card-banner-overlay" />
                      <span className={`lc-badge ${c.estatus === 'Activa' ? 'lc-badge--activa' : 'lc-badge--inscripciones'}`}>
                        {c.estatus === 'Activa' ? 'ACTIVA' : 'INSCRIPCIONES'}
                      </span>
                    </div>

                    {/* Cuerpo */}
                    <div className="lc-card-body">
                      <h2 className="lc-card-nombre">{c.nombre}</h2>

                      <p className="lc-card-fecha">
                        <i className="fas fa-calendar-alt"></i>
                        {new Date(c.fechaInicio).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })}
                        {c.fechaFin && c.fechaFin !== c.fechaInicio && (
                          <> — {new Date(c.fechaFin).toLocaleDateString('es-MX', { day: '2-digit', month: 'long' })}</>
                        )}
                      </p>

                      {c.categorias && c.categorias.length > 0 && (
                        <div className="lc-card-cats">
                          {c.categorias.slice(0, 3).map(cat => (
                            <span key={cat.idCategoriaComp} className="lc-cat-chip">{cat.nombre}</span>
                          ))}
                          {c.categorias.length > 3 && (
                            <span className="lc-cat-mas">+{c.categorias.length - 3} más</span>
                          )}
                        </div>
                      )}

                      <button className="lc-card-cta">
                        Ver competencia <i className="fas fa-arrow-right"></i>
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
