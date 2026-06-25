import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import BackButton from '../components/BackButton';
import { api } from '../services/api';
import AtletifyLoader from '../components/AtletifyLoader';
import EjercicioDetailModal from '../components/EjercicioDetailModal';
import TextoMarquee from '../components/TextoMarquee';
import '../assets/css/Ejercicios.css';

const CATEGORIAS_BASE = ['Todas'];

const POR_PAGINA = 20;

export default function Ejercicios() {
  const [ejercicios, setEjercicios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [categoriaActiva, setCategoriaActiva] = useState('Todas');
  const [seleccionado, setSeleccionado] = useState(null);
  const [pagina, setPagina] = useState(1);
  const seccionRef = useRef(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    cargar();
  }, []);

  useEffect(() => {
    setPagina(1);
  }, [busqueda, categoriaActiva]);

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

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA));
  const paginados = filtrados.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

  function irAPagina(nueva) {
    setPagina(nueva);
    seccionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

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
      <section className="ej-seccion" ref={seccionRef}>
        <div className="container">

          {loading ? (
            <div className="d-flex justify-content-center align-items-center py-5">
              <AtletifyLoader />
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
              <div className="ej-contador mb-4 d-flex align-items-center justify-content-between flex-wrap gap-2">
                <span>{filtrados.length} ejercicio{filtrados.length !== 1 ? 's' : ''}</span>
                {totalPaginas > 1 && (
                  <span className="ej-contador-pagina">
                    Página {pagina} de {totalPaginas}
                  </span>
                )}
              </div>

              {filtrados.length === 0 ? (
                <div className="text-center py-5">
                  <i className="fas fa-search fa-3x mb-3" style={{ color: 'var(--text-muted)' }} />
                  <p style={{ color: 'var(--secondary)', fontFamily: 'var(--font-body)' }}>
                    No se encontraron ejercicios con "{busqueda}"
                  </p>
                </div>
              ) : (
                <>
                  <div className="row g-3">
                    {paginados.map((ej, i) => (
                      <div key={ej.id} className="col-6 col-md-6 col-lg-4">
                        <motion.div
                          className="ej-card"
                          style={{ '--ej-color': ej.color }}
                          initial={{ opacity: 0, y: 30 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.4, delay: (i % 6) * 0.05 }}
                          onClick={() => setSeleccionado(ej)}
                        >
                          {/* Watermark */}
                          <span className="ej-watermark" aria-hidden="true">
                            {ej.nombre.split(' ')[0]}
                          </span>

                          {/* Header */}
                          <div className="ej-card-header">
                            <div className="ej-icono">
                              <i className={ej.icono} />
                            </div>
                            <div className="ej-card-text">
                              <h3 className="ej-nombre mb-0"><TextoMarquee text={ej.nombre} /></h3>
                              {ej.subnombre && (
                                <p className="ej-subnombre">Alt: {ej.subnombre}</p>
                              )}
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

                  {/* Paginación */}
                  {totalPaginas > 1 && (
                    <div className="ej-pagination">
                      <button
                        className="ej-pag-btn"
                        onClick={() => irAPagina(pagina - 1)}
                        disabled={pagina === 1}
                        aria-label="Página anterior"
                      >
                        <i className="fas fa-chevron-left" />
                      </button>

                      <div className="ej-pag-numeros">
                        {Array.from({ length: totalPaginas }, (_, idx) => idx + 1)
                          .filter(n => n === 1 || n === totalPaginas || Math.abs(n - pagina) <= 1)
                          .reduce((acc, n, i, arr) => {
                            if (i > 0 && n - arr[i - 1] > 1) acc.push('...');
                            acc.push(n);
                            return acc;
                          }, [])
                          .map((item, idx) =>
                            item === '...' ? (
                              <span key={`dots-${idx}`} className="ej-pag-dots">…</span>
                            ) : (
                              <button
                                key={item}
                                className={`ej-pag-num${item === pagina ? ' activo' : ''}`}
                                onClick={() => irAPagina(item)}
                              >
                                {item}
                              </button>
                            )
                          )}
                      </div>

                      <button
                        className="ej-pag-btn"
                        onClick={() => irAPagina(pagina + 1)}
                        disabled={pagina === totalPaginas}
                        aria-label="Página siguiente"
                      >
                        <i className="fas fa-chevron-right" />
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="ej-footer text-center">
        <p>Entrena con técnica. Entrena en comunidad.</p>
      </footer>

      {/* ── MODAL DE DETALLE ── */}
      <EjercicioDetailModal ejercicio={seleccionado} onClose={() => setSeleccionado(null)} />
    </div>
  );
}
