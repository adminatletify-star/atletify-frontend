import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import '../assets/css/ListaCompetencias.css';
import BackButton from '../components/BackButton';

const API_BASE_URL = 'import.meta.env.VITE_API_URL:7149/api';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: i => ({ opacity: 1, y: 0, transition: { duration: 0.5, delay: i * 0.08 } }),
};

export default function AdminArchivadasDev() {
  const navigate = useNavigate();
  const [boxes, setBoxes] = useState([]);
  const [cargandoBoxes, setCargandoBoxes] = useState(true);
  const [busqueda, setBusqueda] = useState('');

  // Validar rol
  useEffect(() => {
    const u = JSON.parse(localStorage.getItem('usuario'));
    if (!u || u.rol !== 'Developer') {
      navigate('/login');
    }
  }, [navigate]);

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

      <BackButton to="/dashboard" className="lc-back-fixed" />

      <section className="lc-hero" style={{ background: 'linear-gradient(to bottom, rgba(20,0,0,0.9), transparent)' }}>
        <motion.div
          className="lc-hero-content"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          <span className="lc-hero-tag text-danger border-danger">Zona de Peligro (DB)</span>
          <h1 className="lc-hero-titulo text-white">
            ADMINISTRADOR DE <span>COMPETENCIAS</span>
          </h1>
          <div className="lc-hero-linea bg-danger" />
          <p className="lc-hero-sub text-secondary">Selecciona un Box para eliminar definitivamente sus competencias archivadas</p>

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

      <section className="lc-grid-section">
        <div className="container" style={{ maxWidth: '1000px' }}>

          {cargandoBoxes && (
            <div className="lc-loader">
              <div className="lc-loader-spinner border-danger" />
              <p className="lc-loader-texto text-danger">Conectando a la DB...</p>
            </div>
          )}

          {!cargandoBoxes && boxesFiltrados.length === 0 && (
            <motion.div className="lc-empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <i className="fas fa-search lc-empty-icon text-danger"></i>
              <p className="lc-empty-titulo text-white">No se encontraron resultados</p>
            </motion.div>
          )}

          {!cargandoBoxes && boxesFiltrados.length > 0 && (
            <div className="row g-4">
              {boxesFiltrados.map((b, i) => (
                <div key={b.idBox} className="col-12 col-md-6">
                  <motion.div
                    className="lc-card h-100 p-4 d-flex align-items-center gap-3"
                    custom={i}
                    variants={fadeUp}
                    initial="hidden"
                    animate="visible"
                    whileHover={{ y: -6, backgroundColor: 'rgba(255,0,0,0.1)', borderColor: 'red' }}
                    onClick={() => navigate(`/admin-archivadas/${b.idBox}`)}
                    style={{ background: 'var(--card-bg)', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', transition: 'all 0.2s ease' }}
                  >
                    <div style={{ width: '70px', height: '70px', borderRadius: '50%', overflow: 'hidden', background: '#000', flexShrink: 0 }}>
                      {b.logo ? (
                        <img src={`import.meta.env.VITE_API_URL:7149${b.logo}`} alt={b.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div className="w-100 h-100 d-flex align-items-center justify-content-center">
                          <i className="fas fa-warehouse text-secondary fs-4"></i>
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="m-0 text-white fs-4">{b.nombre}</h3>
                      <p className="m-0 text-secondary mt-1"><i className="fas fa-database me-1"></i>Ver Base de Datos</p>
                    </div>
                    <div className="ms-auto text-danger">
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
