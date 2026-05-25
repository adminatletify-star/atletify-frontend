import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import BackButton from '../components/BackButton';
import AtletifyLoader from '../components/AtletifyLoader';
import '../assets/css/PreguntasFrecuentes.css';

const API = `${import.meta.env.VITE_API_URL}/api/faq`;
const PAGE_SIZE = 10;

const normalizar = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

function buildPaginas(pagina, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const out = [1];
  if (pagina > 3) out.push('...');
  const start = Math.max(2, pagina - 1);
  const end = Math.min(total - 1, pagina + 1);
  for (let i = start; i <= end; i++) out.push(i);
  if (pagina < total - 2) out.push('...');
  out.push(total);
  return out;
}

function Paginacion({ pagina, totalPaginas, onCambio }) {
  if (totalPaginas <= 1) return null;
  const paginas = buildPaginas(pagina, totalPaginas);
  return (
    <div className="faq-paginacion" role="navigation" aria-label="Paginación">
      <button
        type="button"
        className="faq-pag-btn"
        disabled={pagina === 1}
        onClick={() => onCambio(pagina - 1)}
        aria-label="Página anterior"
      >
        <i className="fas fa-chevron-left"></i>
      </button>
      {paginas.map((p, i) =>
        p === '...' ? (
          <span key={`e${i}`} className="faq-pag-ellipsis">…</span>
        ) : (
          <button
            key={p}
            type="button"
            className={`faq-pag-btn ${pagina === p ? 'faq-pag-btn--active' : ''}`}
            onClick={() => onCambio(p)}
          >
            {p}
          </button>
        )
      )}
      <button
        type="button"
        className="faq-pag-btn"
        disabled={pagina === totalPaginas}
        onClick={() => onCambio(pagina + 1)}
        aria-label="Página siguiente"
      >
        <i className="fas fa-chevron-right"></i>
      </button>
    </div>
  );
}

export default function PreguntasFrecuentes() {
  const navigate = useNavigate();
  const [secciones, setSecciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [seccionAbierta, setSeccionAbierta] = useState(null); // idSeccion expandida
  const [pagSec, setPagSec] = useState(1);
  const [pagsPreg, setPagsPreg] = useState({}); // idSeccion → página actual de sus preguntas

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem('usuario') || 'null');
    if (!u) { navigate('/login'); return; }
    cargar();
  }, [navigate]);

  // Reset paginación de secciones al cambiar búsqueda
  useEffect(() => { setPagSec(1); }, [busqueda]);

  async function cargar() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/mias`);
      if (res.ok) {
        const data = await res.json();
        setSecciones(Array.isArray(data) ? data : []);
        // Si solo hay una sección, ábrela por defecto
        if (Array.isArray(data) && data.length === 1) {
          setSeccionAbierta(data[0].idSeccion);
        }
      }
    } catch (e) {
      console.error('Error cargando FAQ:', e);
    } finally {
      setLoading(false);
    }
  }

  // Filtro por búsqueda: matchea pregunta o respuesta (acentos + espacios insensibles)
  const seccionesFiltradas = useMemo(() => {
    const tokens = normalizar(busqueda).split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return secciones;

    return secciones
      .map(s => {
        const preguntasMatch = s.preguntas.filter(p => {
          const haystack = normalizar(`${p.pregunta} ${p.respuesta}`);
          return tokens.every(t => haystack.includes(t));
        });
        return { ...s, preguntas: preguntasMatch };
      })
      .filter(s => s.preguntas.length > 0);
  }, [secciones, busqueda]);

  // Paginación de secciones
  const totalPagSec = Math.max(1, Math.ceil(seccionesFiltradas.length / PAGE_SIZE));
  const seccionesPagina = seccionesFiltradas.slice((pagSec - 1) * PAGE_SIZE, pagSec * PAGE_SIZE);
  useEffect(() => { if (pagSec > totalPagSec) setPagSec(totalPagSec); }, [pagSec, totalPagSec]);

  // Si hay búsqueda activa, abrir automáticamente todas las secciones con coincidencias
  const seccionesAbiertas = useMemo(() => {
    if (busqueda.trim()) {
      return new Set(seccionesPagina.map(s => s.idSeccion));
    }
    return seccionAbierta ? new Set([seccionAbierta]) : new Set();
  }, [busqueda, seccionAbierta, seccionesPagina]);

  function toggleSeccion(id) {
    if (busqueda.trim()) return; // durante búsqueda, todas abiertas
    setSeccionAbierta(prev => prev === id ? null : id);
  }

  function setPagPregunta(idSeccion, nuevaPag) {
    setPagsPreg(prev => ({ ...prev, [idSeccion]: nuevaPag }));
  }

  if (loading) {
    return <div className="faq-root faq-loading-wrap"><AtletifyLoader /></div>;
  }

  return (
    <div className="faq-root">
      <header className="faq-header">
        <div className="faq-header-inner">
          <BackButton />
          <div className="faq-header-text">
            <h1 className="faq-title">Preguntas <span>Frecuentes</span></h1>
            <p className="faq-subtitle">Encuentra respuestas a las dudas más comunes</p>
          </div>
        </div>
      </header>

      <div className="faq-content">
        {secciones.length > 0 && (
          <div className="faq-search-wrap">
            <i className="fas fa-search faq-search-icon"></i>
            <input
              type="text"
              className="faq-search-input"
              placeholder="Buscar pregunta o tema..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              aria-label="Buscar"
            />
            {busqueda && (
              <button
                type="button"
                className="faq-search-clear"
                onClick={() => setBusqueda('')}
                aria-label="Limpiar búsqueda"
              >
                <i className="fas fa-times"></i>
              </button>
            )}
          </div>
        )}

        {secciones.length === 0 ? (
          <div className="faq-empty">
            <i className="fas fa-circle-question faq-empty-icon"></i>
            <h2 className="faq-empty-title">Aún no hay preguntas</h2>
            <p className="faq-empty-text">El administrador de la plataforma todavía no ha publicado preguntas para tu rol. Vuelve más tarde.</p>
          </div>
        ) : seccionesFiltradas.length === 0 ? (
          <div className="faq-empty">
            <i className="fas fa-search faq-empty-icon"></i>
            <h2 className="faq-empty-title">Sin resultados</h2>
            <p className="faq-empty-text">No se encontró ninguna pregunta que coincida con <strong>"{busqueda}"</strong>.</p>
            <button type="button" className="faq-btn-clear" onClick={() => setBusqueda('')}>
              <i className="fas fa-times"></i>Limpiar búsqueda
            </button>
          </div>
        ) : (
          <>
            <div className="faq-pag-summary">
              Mostrando <strong>{(pagSec - 1) * PAGE_SIZE + 1}–{Math.min(pagSec * PAGE_SIZE, seccionesFiltradas.length)}</strong> de <strong>{seccionesFiltradas.length}</strong> {seccionesFiltradas.length === 1 ? 'sección' : 'secciones'}
            </div>
            <div className="faq-stack">
              {seccionesPagina.map(s => {
                const abierta = seccionesAbiertas.has(s.idSeccion);
                const pagP = pagsPreg[s.idSeccion] || 1;
                const totalPagP = Math.max(1, Math.ceil(s.preguntas.length / PAGE_SIZE));
                const preguntasPagina = s.preguntas.slice((pagP - 1) * PAGE_SIZE, pagP * PAGE_SIZE);
                return (
                  <section key={s.idSeccion} className={`faq-section ${abierta ? 'faq-section--open' : ''}`}>
                    <button
                      type="button"
                      className="faq-section-header"
                      onClick={() => toggleSeccion(s.idSeccion)}
                      aria-expanded={abierta}
                    >
                      <div className="faq-section-text">
                        <h2 className="faq-section-nombre">{s.nombre}</h2>
                        {s.descripcion && <p className="faq-section-desc">{s.descripcion}</p>}
                      </div>
                      <span className="faq-section-count">
                        {s.preguntas.length} {s.preguntas.length === 1 ? 'pregunta' : 'preguntas'}
                      </span>
                      <i className={`fas fa-chevron-down faq-section-chevron ${abierta ? 'faq-section-chevron--open' : ''}`}></i>
                    </button>

                    {abierta && (
                      <div className="faq-preguntas">
                        {preguntasPagina.map(p => (
                          <Pregunta key={p.idPregunta} pregunta={p} />
                        ))}
                        {totalPagP > 1 && (
                          <Paginacion
                            pagina={pagP}
                            totalPaginas={totalPagP}
                            onCambio={(n) => setPagPregunta(s.idSeccion, n)}
                          />
                        )}
                      </div>
                    )}
                  </section>
                );
              })}
            </div>
            <Paginacion pagina={pagSec} totalPaginas={totalPagSec} onCambio={setPagSec} />
          </>
        )}
      </div>
    </div>
  );
}

function Pregunta({ pregunta }) {
  const [abierta, setAbierta] = useState(false);

  return (
    <div className={`faq-pregunta ${abierta ? 'faq-pregunta--open' : ''}`}>
      <button
        type="button"
        className="faq-pregunta-header"
        onClick={() => setAbierta(!abierta)}
        aria-expanded={abierta}
      >
        <span className="faq-pregunta-texto">{pregunta.pregunta}</span>
        <i className={`fas fa-chevron-down faq-pregunta-chevron ${abierta ? 'faq-pregunta-chevron--open' : ''}`}></i>
      </button>
      {abierta && (
        <div className="faq-respuesta">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{pregunta.respuesta}</ReactMarkdown>
        </div>
      )}
    </div>
  );
}
