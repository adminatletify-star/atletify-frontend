import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import BackButton from '../components/BackButton';
import { api } from '../services/api';
import '../assets/css/Ejercicios.css';

const CATEGORIAS_BASE = ['Todas'];

export default function Ejercicios() {
  const [ejercicios, setEjercicios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [categoriaActiva, setCategoriaActiva] = useState('Todas');
  const [seleccionado, setSeleccionado] = useState(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    cargar();
  }, []);

  async function cargar() {
    setLoading(true);
    try {
      const data = await api.obtenerEjerciciosDiccionario();
      setEjercicios(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Error cargando ejercicios:', e);
      setEjercicios([]);
    } finally {
      setLoading(false);
    }
  }

  const categorias = [...CATEGORIAS_BASE, ...new Set(ejercicios.map(e => e.categoria))];

  const filtrados = ejercicios.filter(ej => {
    const matchNombre = ej.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
                        (ej.subnombre && ej.subnombre.toLowerCase().includes(busqueda.toLowerCase()));
    const matchCategoria = categoriaActiva === 'Todas' || ej.categoria === categoriaActiva;
    return matchNombre && matchCategoria;
  });

  return (
    <div className="ejercicios-wrapper">
      {/* Navbar Removed */}

      {/* Hero */}
      <section className="ej-hero">
        <div className="container text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <span className="ej-tag">Base de Conocimiento</span>
            <h1 className="ej-titulo">
              Ejercicios de <span className="text-danger">CrossFit</span>
            </h1>
            <p className="ej-subtitulo">
              Los movimientos esenciales. Aprende la técnica correcta de cada uno.
            </p>
          </motion.div>

          {/* Buscador */}
          <motion.div
            className="ej-buscador-wrap"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <div className="ej-buscador">
              <i className="fas fa-search ej-buscador-icon" />
              <input
                type="text"
                className="ej-buscador-input"
                placeholder="Buscar ejercicio..."
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
              />
              {busqueda && (
                <button
                  className="ej-buscador-clear"
                  onClick={() => setBusqueda('')}
                  aria-label="Limpiar búsqueda"
                >
                  <i className="fas fa-times" />
                </button>
              )}
            </div>
          </motion.div>

          {/* Filtros por categoría */}
          {!loading && ejercicios.length > 0 && (
            <motion.div
              className="ej-filtros d-flex flex-wrap justify-content-center gap-2 mt-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.45 }}
            >
              {categorias.map(cat => (
                <button
                  key={cat}
                  className={`ej-filtro-btn ${categoriaActiva === cat ? 'activo' : ''}`}
                  onClick={() => setCategoriaActiva(cat)}
                >
                  {cat}
                </button>
              ))}
            </motion.div>
          )}
        </div>
      </section>

      {/* Grid de ejercicios */}
      <section className="ej-seccion">
        <div className="container">

          {loading ? (
            <div className="d-flex justify-content-center align-items-center py-5">
              <div className="spinner-wp" />
            </div>
          ) : ejercicios.length === 0 ? (
            <div className="text-center py-5">
              <i className="fas fa-book-open fa-3x mb-3" style={{ color: 'var(--text-muted)', opacity: 0.4 }} />
              <p style={{ color: 'var(--secondary)', fontFamily: 'var(--font-body)' }}>
                No hay ejercicios publicados todavía.
              </p>
            </div>
          ) : (
            <>
              <div className="ej-contador mb-4">
                <span>{filtrados.length} ejercicio{filtrados.length !== 1 ? 's' : ''}</span>
              </div>

              {filtrados.length === 0 ? (
                <div className="text-center py-5">
                  <i className="fas fa-search fa-3x mb-3" style={{ color: 'var(--text-muted)' }} />
                  <p style={{ color: 'var(--secondary)', fontFamily: 'var(--font-body)' }}>
                    No se encontraron ejercicios con "{busqueda}"
                  </p>
                </div>
              ) : (
                <div className="row g-4">
                  {filtrados.map((ej, i) => (
                    <div key={ej.id} className="col-12 col-md-6 col-lg-4">
                      <motion.div
                        className="ej-card"
                        style={{ '--ej-color': ej.color }}
                        initial={{ opacity: 0, y: 40 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, amount: 0.15 }}
                        transition={{ duration: 0.5, delay: (i % 6) * 0.07 }}
                        onClick={() => setSeleccionado(ej)}
                      >
                        {/* Watermark */}
                        <span className="ej-watermark" aria-hidden="true">
                          {ej.nombre.split(' ')[0]}
                        </span>

                        {/* Header */}
                        <div className="ej-card-header d-flex align-items-start gap-3">
                          <div className="ej-icono">
                            <i className={ej.icono} />
                          </div>
                          <div className="flex-grow-1 min-w-0">
                            <h3 className="ej-nombre mb-0">{ej.nombre}</h3>
                            {ej.subnombre && <p style={{margin:0, fontSize:'0.8rem', color:'var(--text-muted)'}}>Alt: {ej.subnombre}</p>}
                            <span className="ej-categoria">{ej.categoria}</span>
                          </div>
                        </div>

                        {/* Instrucción (truncada) */}
                        <p className="ej-instruccion">{ej.instruccion}</p>

                        {/* Ver más */}
                        <span className="ej-ver-mas">
                          <i className="fas fa-expand-alt" /> Ver técnica completa
                        </span>

                        {/* Glow */}
                        <div className="ej-glow" aria-hidden="true" />
                      </motion.div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="ej-footer text-center">
        <p>Entrena con técnica. Entrena como manada.</p>
      </footer>

      {/* ── MODAL DE DETALLE ── */}
      <AnimatePresence>
        {seleccionado && (
          <motion.div
            className="ej-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setSeleccionado(null)}
          >
            <motion.div
              className="ej-modal"
              style={{ borderTop: `3px solid ${seleccionado.color}` }}
              initial={{ opacity: 0, scale: 0.92, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 24 }}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
              onClick={e => e.stopPropagation()}
            >
              {/* Botón cerrar */}
              <button className="ej-modal-close" onClick={() => setSeleccionado(null)}>
                <i className="fas fa-times" />
              </button>

              {/* Header del modal */}
              <div className="d-flex align-items-start gap-3">
                <div
                  className="ej-modal-icono"
                  style={{
                    background: seleccionado.color + '20',
                    border: `1px solid ${seleccionado.color}40`,
                    color: seleccionado.color,
                  }}
                >
                  <i className={seleccionado.icono} />
                </div>
                <div className="flex-grow-1 min-w-0" style={{ paddingRight: '2rem' }}>
                  <h3 className="ej-modal-nombre">{seleccionado.nombre}</h3>
                  {seleccionado.subnombre && <p style={{margin:0, fontSize:'0.9rem', color:'var(--text-muted)', marginBottom:'0.3rem'}}>Alt: {seleccionado.subnombre}</p>}
                  <span className="ej-categoria" style={{ '--ej-color': seleccionado.color }}>
                    {seleccionado.categoria}
                  </span>
                </div>
              </div>

              <div className="ej-modal-divider" />

              {/* Instrucción completa */}
              <p className="ej-modal-texto">{seleccionado.instruccion}</p>

              {/* Contenedor de Video */}
              <div className="ej-modal-video-container mt-4">
                <h4 style={{fontSize: '1rem', color: 'var(--secondary)', marginBottom: '1rem'}}>
                  <i className="fas fa-video me-2"></i>Ejemplo de Ejecución
                </h4>
                {seleccionado.videoUrl ? (
                  <video 
                    src={seleccionado.videoUrl} 
                    controls 
                    style={{ width: '100%', borderRadius: '8px', border: `1px solid ${seleccionado.color}40`, background: '#000' }}
                  ></video>
                ) : (
                  <div className="d-flex flex-column align-items-center justify-content-center p-4" style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                    <i className="fas fa-film fa-2x mb-2" style={{ color: 'var(--text-muted)', opacity: 0.5 }}></i>
                    <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>Contenido de ejemplo aún no disponible.</p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
