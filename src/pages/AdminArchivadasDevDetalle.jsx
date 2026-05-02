import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import '../assets/css/ListaCompetencias.css';
import BackButton from '../components/BackButton';

const API_BASE_URL = 'https://localhost:7149/api';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: i => ({ opacity: 1, y: 0, transition: { duration: 0.5, delay: i * 0.08 } }),
};

export default function AdminArchivadasDevDetalle() {
  const { idBox } = useParams();
  const navigate = useNavigate();
  const [competencias, setCompetencias] = useState([]);
  const [cargandoComp, setCargandoComp] = useState(true);
  const [boxData, setBoxData] = useState(null);
  const [busqueda, setBusqueda] = useState('');

  // Validar rol
  useEffect(() => {
    const u = JSON.parse(localStorage.getItem('usuario'));
    if (!u || u.rol !== 'Developer') {
      navigate('/login');
    }
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
    if (!window.confirm(`⚠️ ADVERTENCIA CRÍTICA ⚠️\n\n¿Estás absolutamente seguro de eliminar "${nombre}"?\n\nEsta acción eliminará EN CASCADA:\n- Categorías y Equipos\n- Atletas\n- WODs y Scores\n- Pagos registrados\n- Préstamos de material\n\n¡ESTA ACCIÓN NO SE PUEDE DESHACER!`)) {
      return;
    }

    // Segunda confirmación por seguridad
    const input = window.prompt(`Escribe "ELIMINAR" para confirmar la destrucción de la base de datos de esta competencia:`);
    if (input !== 'ELIMINAR') {
      alert("Operación cancelada.");
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/competencias/${idCompetencia}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        alert("¡Competencia y todos sus registros eliminados exitosamente!");
        cargarArchivadas(); // Recargar lista
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.mensaje || "No se pudo eliminar"}`);
      }
    } catch (err) {
      console.error(err);
      alert("Error de conexión al intentar eliminar.");
    }
  };

  const compsFiltradas = competencias.filter(c => 
    c.nombre?.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="lc-wrapper">

      <BackButton to="/admin-archivadas" className="lc-back-fixed" />

      <section className="lc-hero" style={{ background: 'linear-gradient(to bottom, rgba(20,0,0,0.9), transparent)' }}>
        <motion.div
          className="lc-hero-content"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          <span className="lc-hero-tag text-danger border-danger">Zona de Peligro (DB)</span>
          <h1 className="lc-hero-titulo text-white text-uppercase" style={{ fontSize: 'clamp(2rem, 5vw, 4rem)' }}>
            {boxData?.nombre || 'BOX'}
          </h1>
          <div className="lc-hero-linea bg-danger" />
          <p className="lc-hero-sub text-secondary">Competencias archivadas listas para purga definitiva</p>

          <div className="mt-4 mx-auto" style={{ maxWidth: '500px' }}>
            <div className="input-group">
              <span className="input-group-text bg-dark border-secondary text-secondary">
                <i className="fas fa-search"></i>
              </span>
              <input 
                type="text" 
                className="form-control bg-dark border-secondary text-white" 
                placeholder="Buscar competencia archivada..." 
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                style={{ boxShadow: 'none' }}
              />
            </div>
          </div>
        </motion.div>
      </section>

      <section className="lc-grid-section">
        <div className="container">

          {cargandoComp && (
            <div className="lc-loader">
              <div className="lc-loader-spinner border-danger" />
              <p className="lc-loader-texto text-danger">Buscando registros...</p>
            </div>
          )}

          {!cargandoComp && competencias.length === 0 && (
            <motion.div className="lc-empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <i className="fas fa-check-circle lc-empty-icon text-success"></i>
              <p className="lc-empty-titulo text-white">Base de datos limpia</p>
              <p className="lc-empty-sub">No hay competencias archivadas en este box.</p>
            </motion.div>
          )}

          {!cargandoComp && compsFiltradas.length === 0 && competencias.length > 0 && (
             <motion.div className="lc-empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <i className="fas fa-search lc-empty-icon text-danger"></i>
              <p className="lc-empty-titulo text-white">No se encontraron resultados</p>
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
                    style={{ border: '1px solid rgba(255,0,0,0.3)' }}
                  >
                    <div className="lc-card-banner" style={{ filter: 'grayscale(100%) opacity(0.5)' }}>
                      {c.logoUrl
                        ? <img src={c.logoUrl} alt={c.nombre} className="lc-card-banner-img" />
                        : (
                          <div className="lc-card-banner-placeholder">
                            <i className="fas fa-archive"></i>
                          </div>
                        )
                      }
                      <div className="lc-card-banner-overlay" />
                      <span className="lc-badge bg-danger text-white">
                        ARCHIVADA
                      </span>
                    </div>

                    <div className="lc-card-body">
                      <h2 className="lc-card-nombre text-danger">{c.nombre}</h2>

                      <p className="lc-card-fecha text-secondary mb-4">
                        <i className="fas fa-database me-2"></i>
                        ID DB: #{c.idCompetencia}
                      </p>

                      <button 
                        className="btn w-100 btn-danger fw-bold" 
                        onClick={() => eliminarDefinitivamente(c.idCompetencia, c.nombre)}
                        style={{ borderRadius: '8px', padding: '12px' }}
                      >
                        <i className="fas fa-trash-alt me-2"></i> Eliminar Definitivamente
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
