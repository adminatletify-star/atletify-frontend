import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import BackButton from '../components/BackButton';
import AtletifyLoader from '../components/AtletifyLoader';
import '../assets/css/PreguntasRespuestasDev.css';

const API = `${import.meta.env.VITE_API_URL}/api/faq`;

const ROLES_VISIBLES = [
  { key: 'AdminBox', label: 'AdminBox', flag: 'visibleAdminBox', color: '#ef4444' },
  { key: 'Coach',    label: 'Coach',    flag: 'visibleCoach',    color: '#22c55e' },
  { key: 'Atleta',   label: 'Atleta',   flag: 'visibleAtleta',   color: '#f59e0b' }
];

const SECCION_INIT = {
  idSeccion: 0, nombre: '', descripcion: '', icono: 'fa-question-circle',
  orden: 0, activa: true, visibleAdminBox: false, visibleCoach: false, visibleAtleta: false
};
const PREGUNTA_INIT = {
  idPregunta: 0, idSeccion: 0, pregunta: '', respuesta: '',
  orden: 0, activa: true, visibleAdminBox: false, visibleCoach: false, visibleAtleta: false
};

const normalizar = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

const PAGE_SIZE = 10;

// Construye los botones de paginación: 1 … 4 5 6 … N (siempre muestra primera, última y vecinos)
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
    <div className="prd-paginacion" role="navigation" aria-label="Paginación">
      <button
        type="button"
        className="prd-pag-btn"
        disabled={pagina === 1}
        onClick={() => onCambio(pagina - 1)}
        aria-label="Página anterior"
      >
        <i className="fas fa-chevron-left"></i>
      </button>
      {paginas.map((p, i) =>
        p === '...' ? (
          <span key={`e${i}`} className="prd-pag-ellipsis">…</span>
        ) : (
          <button
            key={p}
            type="button"
            className={`prd-pag-btn ${pagina === p ? 'prd-pag-btn--active' : ''}`}
            onClick={() => onCambio(p)}
          >
            {p}
          </button>
        )
      )}
      <button
        type="button"
        className="prd-pag-btn"
        disabled={pagina === totalPaginas}
        onClick={() => onCambio(pagina + 1)}
        aria-label="Página siguiente"
      >
        <i className="fas fa-chevron-right"></i>
      </button>
    </div>
  );
}

export default function PreguntasRespuestasDev() {
  const [tab, setTab] = useState('secciones'); // 'secciones' | 'preguntas' | 'vista-previa'
  const [secciones, setSecciones] = useState([]);
  const [preguntas, setPreguntas] = useState([]);
  const [loading, setLoading] = useState(true);

  const [buscadorSec, setBuscadorSec] = useState('');
  const [buscadorPreg, setBuscadorPreg] = useState('');
  const [filtroSeccion, setFiltroSeccion] = useState(''); // para tab preguntas
  const [pagSec, setPagSec] = useState(1);
  const [pagPreg, setPagPreg] = useState(1);

  // Reset paginación cuando cambian filtros
  useEffect(() => { setPagSec(1); }, [buscadorSec]);
  useEffect(() => { setPagPreg(1); }, [buscadorPreg, filtroSeccion]);

  // Modal sección
  const [modalSec, setModalSec] = useState({ open: false, data: SECCION_INIT, saving: false });
  // Modal pregunta
  const [modalPreg, setModalPreg] = useState({ open: false, data: PREGUNTA_INIT, saving: false });

  // Vista previa: rol a simular
  const [rolPrevia, setRolPrevia] = useState('AdminBox');

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    setLoading(true);
    try {
      const [resSec, resPreg] = await Promise.all([
        fetch(`${API}/secciones`),
        fetch(`${API}/preguntas`)
      ]);
      if (resSec.ok) setSecciones(await resSec.json());
      if (resPreg.ok) setPreguntas(await resPreg.json());
    } catch (e) {
      console.error('Error cargando FAQ:', e);
    } finally {
      setLoading(false);
    }
  }

  // ─────── HELPERS DE ORDEN ───────
  function nextOrdenSeccion() {
    if (secciones.length === 0) return 10;
    const max = Math.max(...secciones.map(s => Number(s.orden) || 0));
    return max + 10;
  }
  function nextOrdenPregunta(idSeccion) {
    const list = preguntas.filter(p => p.idSeccion === idSeccion);
    if (list.length === 0) return 10;
    const max = Math.max(...list.map(p => Number(p.orden) || 0));
    return max + 10;
  }

  // ─────── SECCIONES ───────
  function abrirNuevaSeccion() {
    setModalSec({ open: true, data: { ...SECCION_INIT, orden: nextOrdenSeccion() }, saving: false });
  }
  function abrirEditarSeccion(s) {
    setModalSec({ open: true, data: { ...s, descripcion: s.descripcion || '', icono: s.icono || '' }, saving: false });
  }
  async function guardarSeccion(e) {
    e?.preventDefault();
    const { data } = modalSec;
    if (!data.nombre?.trim()) { alert('El nombre es obligatorio.'); return; }
    // Si el orden vino vacío/nulo, autocompletar con el siguiente disponible
    const payload = { ...data };
    if (payload.orden == null || isNaN(Number(payload.orden))) {
      payload.orden = nextOrdenSeccion();
    }
    setModalSec(prev => ({ ...prev, saving: true }));
    try {
      const url = payload.idSeccion ? `${API}/secciones/${payload.idSeccion}` : `${API}/secciones`;
      const method = payload.idSeccion ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.mensaje || 'Error al guardar la sección.');
      } else {
        setModalSec({ open: false, data: SECCION_INIT, saving: false });
        await cargar();
      }
    } catch {
      alert('Error de conexión.');
    } finally {
      setModalSec(prev => ({ ...prev, saving: false }));
    }
  }
  async function eliminarSeccion(s) {
    const total = s.totalPreguntas || 0;
    const msg = total > 0
      ? `Esto eliminará la sección "${s.nombre}" y sus ${total} pregunta${total === 1 ? '' : 's'}. ¿Continuar?`
      : `¿Eliminar la sección "${s.nombre}"?`;
    if (!window.confirm(msg)) return;
    try {
      const res = await fetch(`${API}/secciones/${s.idSeccion}`, { method: 'DELETE' });
      if (!res.ok) { alert('Error al eliminar.'); return; }
      await cargar();
    } catch {
      alert('Error de conexión.');
    }
  }

  // ─────── PREGUNTAS ───────
  function abrirNuevaPregunta() {
    if (secciones.length === 0) { alert('Primero crea al menos una sección.'); return; }
    const idSecDefault = secciones[0].idSeccion;
    setModalPreg({
      open: true,
      data: { ...PREGUNTA_INIT, idSeccion: idSecDefault, orden: nextOrdenPregunta(idSecDefault) },
      saving: false
    });
  }
  function abrirEditarPregunta(p) {
    setModalPreg({ open: true, data: { ...p }, saving: false });
  }
  async function guardarPregunta(e) {
    e?.preventDefault();
    const { data } = modalPreg;
    if (!data.pregunta?.trim()) { alert('La pregunta es obligatoria.'); return; }
    if (!data.respuesta?.trim()) { alert('La respuesta es obligatoria.'); return; }
    if (!data.idSeccion) { alert('Selecciona una sección.'); return; }
    // Si el orden vino vacío/nulo, autocompletar con el siguiente disponible dentro de la sección
    const payload = { ...data };
    if (payload.orden == null || isNaN(Number(payload.orden))) {
      payload.orden = nextOrdenPregunta(payload.idSeccion);
    }
    setModalPreg(prev => ({ ...prev, saving: true }));
    try {
      const url = payload.idPregunta ? `${API}/preguntas/${payload.idPregunta}` : `${API}/preguntas`;
      const method = payload.idPregunta ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.mensaje || 'Error al guardar la pregunta.');
      } else {
        setModalPreg({ open: false, data: PREGUNTA_INIT, saving: false });
        await cargar();
      }
    } catch {
      alert('Error de conexión.');
    } finally {
      setModalPreg(prev => ({ ...prev, saving: false }));
    }
  }
  async function eliminarPregunta(p) {
    if (!window.confirm(`¿Eliminar la pregunta "${p.pregunta.slice(0, 60)}…"?`)) return;
    try {
      const res = await fetch(`${API}/preguntas/${p.idPregunta}`, { method: 'DELETE' });
      if (!res.ok) { alert('Error al eliminar.'); return; }
      await cargar();
    } catch {
      alert('Error de conexión.');
    }
  }

  // ─────── DATA DERIVADA ───────
  const seccionesFiltradas = useMemo(() => {
    const tokens = normalizar(buscadorSec).split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return secciones;
    return secciones.filter(s => {
      const haystack = normalizar(`${s.nombre} ${s.descripcion || ''}`);
      return tokens.every(t => haystack.includes(t));
    });
  }, [secciones, buscadorSec]);

  const preguntasFiltradas = useMemo(() => {
    let lista = preguntas;
    if (filtroSeccion) lista = lista.filter(p => String(p.idSeccion) === String(filtroSeccion));
    const tokens = normalizar(buscadorPreg).split(/\s+/).filter(Boolean);
    if (tokens.length > 0) {
      const seccionesIdx = new Map(secciones.map(s => [s.idSeccion, normalizar(s.nombre)]));
      lista = lista.filter(p => {
        const haystack = normalizar(`${p.pregunta} ${p.respuesta} ${seccionesIdx.get(p.idSeccion) || ''}`);
        return tokens.every(t => haystack.includes(t));
      });
    }
    return lista;
  }, [preguntas, filtroSeccion, buscadorPreg, secciones]);

  // Slicing por página
  const totalPagSec = Math.max(1, Math.ceil(seccionesFiltradas.length / PAGE_SIZE));
  const seccionesPagina = seccionesFiltradas.slice((pagSec - 1) * PAGE_SIZE, pagSec * PAGE_SIZE);
  const totalPagPreg = Math.max(1, Math.ceil(preguntasFiltradas.length / PAGE_SIZE));
  const preguntasPagina = preguntasFiltradas.slice((pagPreg - 1) * PAGE_SIZE, pagPreg * PAGE_SIZE);

  // Clamp página si quedaron páginas vacías al borrar items
  useEffect(() => { if (pagSec > totalPagSec) setPagSec(totalPagSec); }, [pagSec, totalPagSec]);
  useEffect(() => { if (pagPreg > totalPagPreg) setPagPreg(totalPagPreg); }, [pagPreg, totalPagPreg]);

  const seccionPorId = useMemo(() => {
    const m = new Map();
    secciones.forEach(s => m.set(s.idSeccion, s));
    return m;
  }, [secciones]);

  // Vista previa por rol
  const flagRol = useMemo(() => {
    if (rolPrevia === 'AdminBox') return 'visibleAdminBox';
    if (rolPrevia === 'Coach') return 'visibleCoach';
    return 'visibleAtleta';
  }, [rolPrevia]);
  const previaSecciones = useMemo(() => {
    return secciones
      .filter(s => s.activa && s[flagRol])
      .map(s => ({
        ...s,
        preguntas: preguntas
          .filter(p => p.idSeccion === s.idSeccion && p.activa && p[flagRol])
          .sort((a, b) => a.orden - b.orden)
      }))
      .filter(s => s.preguntas.length > 0)
      .sort((a, b) => a.orden - b.orden);
  }, [secciones, preguntas, flagRol]);

  // ─────── RENDER ───────
  if (loading) {
    return <div className="prd-root prd-loading-wrap"><AtletifyLoader /></div>;
  }

  return (
    <div className="prd-root">
      <header className="prd-header">
        <BackButton to="/dashboard" />
        <div className="prd-header-text">
          <h1 className="prd-title">Preguntas y Respuestas</h1>
          <p className="prd-subtitle">Gestiona el FAQ por rol y por sección</p>
        </div>
      </header>

      <div className="prd-tabs">
        <button className={`prd-tab ${tab === 'secciones' ? 'prd-tab--active' : ''}`} onClick={() => setTab('secciones')}>
          <i className="fas fa-folder me-2"></i>Secciones <span className="prd-tab-count">{secciones.length}</span>
        </button>
        <button className={`prd-tab ${tab === 'preguntas' ? 'prd-tab--active' : ''}`} onClick={() => setTab('preguntas')}>
          <i className="fas fa-question-circle me-2"></i>Preguntas <span className="prd-tab-count">{preguntas.length}</span>
        </button>
        <button className={`prd-tab ${tab === 'vista-previa' ? 'prd-tab--active' : ''}`} onClick={() => setTab('vista-previa')}>
          <i className="fas fa-eye me-2"></i>Vista previa
        </button>
      </div>

      {tab === 'secciones' && (
        <div className="prd-panel">
          <div className="prd-toolbar">
            <div className="prd-search">
              <i className="fas fa-search prd-search-icon"></i>
              <input
                type="text"
                className="prd-search-input"
                placeholder="Buscar sección..."
                value={buscadorSec}
                onChange={e => setBuscadorSec(e.target.value)}
              />
            </div>
            <button className="prd-btn-primary" onClick={abrirNuevaSeccion}>
              <i className="fas fa-plus me-2"></i>Nueva sección
            </button>
          </div>

          {seccionesFiltradas.length === 0 ? (
            <div className="prd-empty">
              <i className="fas fa-folder-open prd-empty-icon"></i>
              <p>{buscadorSec ? 'Sin resultados para tu búsqueda.' : 'Aún no hay secciones. Crea la primera con el botón de arriba.'}</p>
            </div>
          ) : (
            <>
            <div className="prd-pag-summary">
              Mostrando <strong>{(pagSec - 1) * PAGE_SIZE + 1}–{Math.min(pagSec * PAGE_SIZE, seccionesFiltradas.length)}</strong> de <strong>{seccionesFiltradas.length}</strong> {seccionesFiltradas.length === 1 ? 'sección' : 'secciones'}
            </div>
            <div className="prd-table-wrap">
              <table className="prd-table">
                <thead>
                  <tr>
                    <th>Orden</th>
                    <th>Sección</th>
                    <th>Preguntas</th>
                    <th>Visible para</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {seccionesPagina.map(s => (
                    <tr key={s.idSeccion}>
                      <td className="prd-cell-center"><span className="prd-orden">{s.orden}</span></td>
                      <td>
                        <div className="prd-seccion-cell">
                          <span className="prd-seccion-icon">
                            <i className={`fas ${s.icono || 'fa-folder'}`}></i>
                          </span>
                          <div>
                            <div className="prd-seccion-nombre">{s.nombre}</div>
                            {s.descripcion && <div className="prd-seccion-desc">{s.descripcion}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="prd-cell-center"><span className="prd-pill">{s.totalPreguntas || 0}</span></td>
                      <td>
                        <div className="prd-chips">
                          {ROLES_VISIBLES.map(r => s[r.flag] && (
                            <span key={r.key} className="prd-chip" style={{ background: `${r.color}22`, color: r.color, borderColor: `${r.color}55` }}>
                              {r.label}
                            </span>
                          ))}
                          {!s.visibleAdminBox && !s.visibleCoach && !s.visibleAtleta && (
                            <span className="prd-chip-empty">— Nadie —</span>
                          )}
                        </div>
                      </td>
                      <td>
                        {s.activa
                          ? <span className="prd-status prd-status--on">Activa</span>
                          : <span className="prd-status prd-status--off">Inactiva</span>}
                      </td>
                      <td>
                        <div className="prd-actions">
                          <button className="prd-icon-btn" title="Editar" onClick={() => abrirEditarSeccion(s)}>
                            <i className="fas fa-pen"></i>
                          </button>
                          <button className="prd-icon-btn prd-icon-btn--danger" title="Eliminar" onClick={() => eliminarSeccion(s)}>
                            <i className="fas fa-trash"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Paginacion pagina={pagSec} totalPaginas={totalPagSec} onCambio={setPagSec} />
            </>
          )}
        </div>
      )}

      {tab === 'preguntas' && (
        <div className="prd-panel">
          <div className="prd-toolbar">
            <div className="prd-search">
              <i className="fas fa-search prd-search-icon"></i>
              <input
                type="text"
                className="prd-search-input"
                placeholder="Buscar pregunta o respuesta..."
                value={buscadorPreg}
                onChange={e => setBuscadorPreg(e.target.value)}
              />
            </div>
            <select
              className="prd-select"
              value={filtroSeccion}
              onChange={e => setFiltroSeccion(e.target.value)}
            >
              <option value="">Todas las secciones</option>
              {secciones.map(s => <option key={s.idSeccion} value={s.idSeccion}>{s.nombre}</option>)}
            </select>
            <button className="prd-btn-primary" onClick={abrirNuevaPregunta} disabled={secciones.length === 0}>
              <i className="fas fa-plus me-2"></i>Nueva pregunta
            </button>
          </div>

          {preguntasFiltradas.length === 0 ? (
            <div className="prd-empty">
              <i className="fas fa-question-circle prd-empty-icon"></i>
              <p>
                {buscadorPreg || filtroSeccion ? 'Sin resultados.' : (secciones.length === 0 ? 'Primero crea al menos una sección.' : 'Aún no hay preguntas.')}
              </p>
            </div>
          ) : (
            <>
            <div className="prd-pag-summary">
              Mostrando <strong>{(pagPreg - 1) * PAGE_SIZE + 1}–{Math.min(pagPreg * PAGE_SIZE, preguntasFiltradas.length)}</strong> de <strong>{preguntasFiltradas.length}</strong> {preguntasFiltradas.length === 1 ? 'pregunta' : 'preguntas'}
            </div>
            <div className="prd-table-wrap">
              <table className="prd-table">
                <thead>
                  <tr>
                    <th>Sección</th>
                    <th>Pregunta</th>
                    <th>Visible para</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {preguntasPagina.map(p => {
                    const sec = seccionPorId.get(p.idSeccion);
                    return (
                      <tr key={p.idPregunta}>
                        <td>
                          {sec ? (
                            <span className="prd-seccion-tag">
                              <i className={`fas ${sec.icono || 'fa-folder'} me-1`}></i>{sec.nombre}
                            </span>
                          ) : <span className="prd-chip-empty">(sin sección)</span>}
                        </td>
                        <td className="prd-pregunta-cell">{p.pregunta}</td>
                        <td>
                          <div className="prd-chips">
                            {ROLES_VISIBLES.map(r => p[r.flag] && (
                              <span key={r.key} className="prd-chip" style={{ background: `${r.color}22`, color: r.color, borderColor: `${r.color}55` }}>
                                {r.label}
                              </span>
                            ))}
                            {!p.visibleAdminBox && !p.visibleCoach && !p.visibleAtleta && (
                              <span className="prd-chip-empty">— Nadie —</span>
                            )}
                          </div>
                        </td>
                        <td>
                          {p.activa
                            ? <span className="prd-status prd-status--on">Activa</span>
                            : <span className="prd-status prd-status--off">Inactiva</span>}
                        </td>
                        <td>
                          <div className="prd-actions">
                            <button className="prd-icon-btn" title="Editar" onClick={() => abrirEditarPregunta(p)}>
                              <i className="fas fa-pen"></i>
                            </button>
                            <button className="prd-icon-btn prd-icon-btn--danger" title="Eliminar" onClick={() => eliminarPregunta(p)}>
                              <i className="fas fa-trash"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Paginacion pagina={pagPreg} totalPaginas={totalPagPreg} onCambio={setPagPreg} />
            </>
          )}
        </div>
      )}

      {tab === 'vista-previa' && (
        <div className="prd-panel">
          <div className="prd-previa-header">
            <p className="prd-previa-label">Simular como</p>
            <div className="prd-previa-roles">
              {['AdminBox', 'Coach', 'Atleta'].map(r => (
                <button
                  key={r}
                  className={`prd-previa-rol ${rolPrevia === r ? 'prd-previa-rol--active' : ''}`}
                  onClick={() => setRolPrevia(r)}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {previaSecciones.length === 0 ? (
            <div className="prd-empty">
              <i className="fas fa-eye-slash prd-empty-icon"></i>
              <p>El rol <strong>{rolPrevia}</strong> no tiene ninguna pregunta visible asignada.</p>
            </div>
          ) : (
            <div className="prd-previa-stack">
              {previaSecciones.map(s => (
                <div key={s.idSeccion} className="prd-previa-seccion">
                  <div className="prd-previa-seccion-header">
                    <i className={`fas ${s.icono || 'fa-folder'} prd-previa-seccion-icon`}></i>
                    <div>
                      <h3 className="prd-previa-seccion-nombre">{s.nombre}</h3>
                      {s.descripcion && <p className="prd-previa-seccion-desc">{s.descripcion}</p>}
                    </div>
                  </div>
                  <div className="prd-previa-preguntas">
                    {s.preguntas.map(p => (
                      <details key={p.idPregunta} className="prd-previa-pregunta">
                        <summary>{p.pregunta}</summary>
                        <div className="prd-previa-respuesta">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{p.respuesta}</ReactMarkdown>
                        </div>
                      </details>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL SECCIÓN */}
      {modalSec.open && createPortal(
        <ModalSeccion
          modal={modalSec}
          setModal={setModalSec}
          onSubmit={guardarSeccion}
          secciones={secciones}
        />,
        document.body
      )}

      {/* MODAL PREGUNTA */}
      {modalPreg.open && createPortal(
        <ModalPregunta
          modal={modalPreg}
          setModal={setModalPreg}
          onSubmit={guardarPregunta}
          secciones={secciones}
          preguntas={preguntas}
        />,
        document.body
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════
// MODAL SECCIÓN
// ════════════════════════════════════════════════════════
function ModalSeccion({ modal, setModal, onSubmit, secciones }) {
  const { data, saving } = modal;
  const setField = (field, value) => setModal(prev => ({ ...prev, data: { ...prev.data, [field]: value } }));
  const cerrar = () => setModal({ open: false, data: SECCION_INIT, saving: false });

  // Detecta otras secciones con el mismo orden (excluyendo la actual si se está editando)
  const seccionesConMismoOrden = secciones
    .filter(s => s.idSeccion !== data.idSeccion && Number(s.orden) === Number(data.orden))
    .map(s => s.nombre);

  return (
    <div className="prd-modal-overlay" onClick={cerrar}>
      <form className="prd-modal" onClick={e => e.stopPropagation()} onSubmit={onSubmit}>
        <div className="prd-modal-header">
          <h2>{data.idSeccion ? 'Editar sección' : 'Nueva sección'}</h2>
          <button type="button" className="prd-modal-close" onClick={cerrar}><i className="fas fa-times"></i></button>
        </div>
        <div className="prd-modal-body">
          <label className="prd-label">Nombre <span className="prd-req">*</span></label>
          <input
            type="text"
            className="prd-input"
            value={data.nombre}
            onChange={e => setField('nombre', e.target.value)}
            placeholder="Ej. Pagos y mensualidades"
            maxLength={120}
            autoFocus
            required
          />

          <label className="prd-label">Descripción (opcional)</label>
          <textarea
            className="prd-input prd-textarea"
            value={data.descripcion || ''}
            onChange={e => setField('descripcion', e.target.value)}
            placeholder="Una línea que aparece bajo el título de la sección..."
            maxLength={500}
            rows={2}
          />

          <div className="row g-3">
            <div className="col-12 col-md-6">
              <label className="prd-label">Icono (FontAwesome)</label>
              <input
                type="text"
                className="prd-input"
                value={data.icono || ''}
                onChange={e => setField('icono', e.target.value)}
                placeholder="fa-credit-card"
              />
              {data.icono && (
                <div className="prd-icon-preview"><i className={`fas ${data.icono}`}></i> <code>fas {data.icono}</code></div>
              )}
              <div className="prd-icon-suggestions">
                <span className="prd-icon-suggestions-label">Sugerencias rápidas (clic para usar):</span>
                <div className="prd-icon-suggestions-grid">
                  {[
                    { c: 'fa-credit-card',    n: 'Tarjeta' },
                    { c: 'fa-dumbbell',       n: 'Pesas' },
                    { c: 'fa-clipboard-list', n: 'Lista' },
                    { c: 'fa-calendar-days',  n: 'Calendario' },
                    { c: 'fa-money-bill-wave',n: 'Dinero' },
                    { c: 'fa-users',          n: 'Equipo' },
                    { c: 'fa-question-circle',n: 'Pregunta' },
                    { c: 'fa-wrench',         n: 'Herramienta' },
                    { c: 'fa-trophy',         n: 'Trofeo' },
                    { c: 'fa-book',           n: 'Libro' },
                    { c: 'fa-bell',           n: 'Avisos' },
                    { c: 'fa-shopping-cart',  n: 'Tienda' },
                    { c: 'fa-apple-whole',    n: 'Nutrición' },
                    { c: 'fa-door-open',      n: 'Entrada' },
                    { c: 'fa-shield-halved',  n: 'Seguridad' },
                    { c: 'fa-bullseye',       n: 'Meta' }
                  ].map(s => (
                    <button
                      key={s.c}
                      type="button"
                      className={`prd-icon-chip ${data.icono === s.c ? 'prd-icon-chip--active' : ''}`}
                      onClick={() => setField('icono', s.c)}
                      title={s.n}
                    >
                      <i className={`fas ${s.c}`}></i>
                    </button>
                  ))}
                </div>
                <a
                  href="https://fontawesome.com/search?ic=free"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="prd-icon-link"
                >
                  <i className="fas fa-up-right-from-square me-1"></i>
                  Ver catálogo completo en FontAwesome
                </a>
              </div>
            </div>
            <div className="col-12 col-md-6">
              <label className="prd-label">Orden</label>
              <input
                type="number"
                className="prd-input"
                value={data.orden ?? ''}
                onChange={e => {
                  const raw = e.target.value;
                  if (raw === '') setField('orden', null);
                  else setField('orden', parseInt(raw));
                }}
                onFocus={e => e.target.select()}
                placeholder="(automático)"
              />
              {data.orden == null || isNaN(Number(data.orden)) ? (
                <span className="prd-field-hint">Si lo dejas vacío, se asignará automáticamente al final de la lista.</span>
              ) : seccionesConMismoOrden.length > 0 ? (
                <span className="prd-field-warn">
                  <i className="fas fa-exclamation-triangle me-1"></i>
                  Ya hay otra sección con orden {data.orden}: <strong>{seccionesConMismoOrden.join(', ')}</strong>. Se ordenarán por id como desempate.
                </span>
              ) : (
                <span className="prd-field-hint">Más bajo = aparece más arriba. Tip: usa 10, 20, 30 para dejar huecos.</span>
              )}
            </div>
          </div>

          <label className="prd-label">Visible para</label>
          <div className="prd-roles-grid">
            {ROLES_VISIBLES.map(r => (
              <label key={r.key} className={`prd-role-check ${data[r.flag] ? 'prd-role-check--on' : ''}`} style={{ '--rc': r.color }}>
                <input
                  type="checkbox"
                  checked={!!data[r.flag]}
                  onChange={e => setField(r.flag, e.target.checked)}
                />
                <span className="prd-role-check-name">{r.label}</span>
              </label>
            ))}
          </div>

          <label className="prd-toggle">
            <input
              type="checkbox"
              checked={data.activa}
              onChange={e => setField('activa', e.target.checked)}
            />
            <span>Sección activa</span>
          </label>
        </div>
        <div className="prd-modal-footer">
          <button type="button" className="prd-btn-secondary" onClick={cerrar} disabled={saving}>Cancelar</button>
          <button type="submit" className="prd-btn-primary" disabled={saving}>
            {saving ? <><i className="fas fa-spinner fa-spin me-1"></i>Guardando…</> : 'Guardar sección'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ════════════════════════════════════════════════════════
// MODAL PREGUNTA
// ════════════════════════════════════════════════════════
function ModalPregunta({ modal, setModal, onSubmit, secciones, preguntas }) {
  const { data, saving } = modal;
  const setField = (field, value) => setModal(prev => ({ ...prev, data: { ...prev.data, [field]: value } }));
  const cerrar = () => setModal({ open: false, data: PREGUNTA_INIT, saving: false });
  const [previaActiva, setPreviaActiva] = useState(false);

  // Sección seleccionada para conocer qué roles permite
  const seccionActual = secciones.find(s => s.idSeccion === data.idSeccion);
  const seccionPermiteRol = (flag) => !!(seccionActual && seccionActual[flag]);

  // Cambio de sección: auto-desmarca roles que la nueva sección no permite
  const handleCambioSeccion = (nuevoId) => {
    const nuevaSec = secciones.find(s => s.idSeccion === nuevoId);
    setModal(prev => ({
      ...prev,
      data: {
        ...prev.data,
        idSeccion: nuevoId,
        visibleAdminBox: prev.data.visibleAdminBox && (nuevaSec?.visibleAdminBox ?? false),
        visibleCoach: prev.data.visibleCoach && (nuevaSec?.visibleCoach ?? false),
        visibleAtleta: prev.data.visibleAtleta && (nuevaSec?.visibleAtleta ?? false)
      }
    }));
  };

  // Otras preguntas en la MISMA sección con el mismo orden (excluye la actual)
  const preguntasConMismoOrden = preguntas
    .filter(p =>
      p.idSeccion === data.idSeccion &&
      p.idPregunta !== data.idPregunta &&
      Number(p.orden) === Number(data.orden)
    )
    .map(p => p.pregunta);

  // Roles que la sección permite (para mostrar como hint si la sección no permite ninguno)
  const rolesPermitidosPorSeccion = ROLES_VISIBLES.filter(r => seccionPermiteRol(r.flag));

  return (
    <div className="prd-modal-overlay" onClick={cerrar}>
      <form className="prd-modal prd-modal--ancha" onClick={e => e.stopPropagation()} onSubmit={onSubmit}>
        <div className="prd-modal-header">
          <h2>{data.idPregunta ? 'Editar pregunta' : 'Nueva pregunta'}</h2>
          <button type="button" className="prd-modal-close" onClick={cerrar}><i className="fas fa-times"></i></button>
        </div>
        <div className="prd-modal-body">
          <label className="prd-label">Sección <span className="prd-req">*</span></label>
          <select
            className="prd-input"
            value={data.idSeccion}
            onChange={e => handleCambioSeccion(parseInt(e.target.value) || 0)}
            required
          >
            <option value={0}>— Selecciona una sección —</option>
            {secciones.map(s => {
              const visibles = ROLES_VISIBLES.filter(r => s[r.flag]).map(r => r.label).join(', ') || 'nadie';
              return (
                <option key={s.idSeccion} value={s.idSeccion}>
                  {s.nombre} · visible para: {visibles}
                </option>
              );
            })}
          </select>
          {seccionActual && rolesPermitidosPorSeccion.length === 0 && (
            <span className="prd-field-warn">
              <i className="fas fa-exclamation-triangle me-1"></i>
              La sección <strong>{seccionActual.nombre}</strong> no tiene ningún rol activo. Edítala primero para que sus preguntas puedan ser visibles.
            </span>
          )}

          <label className="prd-label">Pregunta <span className="prd-req">*</span></label>
          <input
            type="text"
            className="prd-input"
            value={data.pregunta}
            onChange={e => setField('pregunta', e.target.value)}
            placeholder="Ej. ¿Cómo cancelo una reserva?"
            maxLength={280}
            required
          />

          <div className="prd-respuesta-head">
            <label className="prd-label mb-0">Respuesta (Markdown) <span className="prd-req">*</span></label>
            <button type="button" className="prd-btn-link" onClick={() => setPreviaActiva(p => !p)}>
              <i className={`fas ${previaActiva ? 'fa-edit' : 'fa-eye'} me-1`}></i>
              {previaActiva ? 'Editar' : 'Vista previa'}
            </button>
          </div>
          {previaActiva ? (
            <div className="prd-md-preview">
              {data.respuesta?.trim()
                ? <ReactMarkdown remarkPlugins={[remarkGfm]}>{data.respuesta}</ReactMarkdown>
                : <p className="prd-md-empty">(escribe algo en el editor para previsualizar)</p>}
            </div>
          ) : (
            <textarea
              className="prd-input prd-textarea-md"
              value={data.respuesta}
              onChange={e => setField('respuesta', e.target.value)}
              placeholder={`Ejemplo:\n\n**Hola atleta**, para pagar sigue estos pasos:\n\n1. Ve a la sección Pagos\n2. Selecciona tu plan\n3. Confirma\n\nMás info en [nuestra web](https://atletify.com).`}
              rows={8}
              required
            />
          )}

          <details className="prd-md-cheatsheet">
            <summary>
              <i className="fas fa-info-circle me-2"></i>
              ¿Cómo escribir Markdown? <small>(haz clic para abrir)</small>
            </summary>
            <div className="prd-md-cheatsheet-body">
              <p className="prd-md-cheatsheet-intro">
                Escribe el código del lado izquierdo. Usa <strong>Vista previa</strong> arriba para ver el resultado.
              </p>
              <table className="prd-md-cheatsheet-table">
                <tbody>
                  <tr>
                    <td><code>**negrita**</code></td>
                    <td><strong>negrita</strong></td>
                  </tr>
                  <tr>
                    <td><code>*cursiva*</code></td>
                    <td><em>cursiva</em></td>
                  </tr>
                  <tr>
                    <td><code>- punto uno{'\n'}- punto dos</code></td>
                    <td>
                      <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
                        <li>punto uno</li>
                        <li>punto dos</li>
                      </ul>
                    </td>
                  </tr>
                  <tr>
                    <td><code>1. paso uno{'\n'}2. paso dos</code></td>
                    <td>
                      <ol style={{ margin: 0, paddingLeft: '1.2rem' }}>
                        <li>paso uno</li>
                        <li>paso dos</li>
                      </ol>
                    </td>
                  </tr>
                  <tr>
                    <td><code>[texto](https://url.com)</code></td>
                    <td><a href="#" onClick={e => e.preventDefault()}>texto</a></td>
                  </tr>
                  <tr>
                    <td><code>## Subtítulo</code></td>
                    <td><strong style={{ fontSize: '1.05em' }}>Subtítulo</strong></td>
                  </tr>
                  <tr>
                    <td><code>{'>'} cita corta</code></td>
                    <td><span style={{ borderLeft: '3px solid var(--primary)', paddingLeft: '0.5rem', fontStyle: 'italic' }}>cita corta</span></td>
                  </tr>
                  <tr>
                    <td><code>`código`</code></td>
                    <td><code style={{ background: 'rgba(255,255,255,0.08)', padding: '0.1rem 0.3rem', borderRadius: '4px' }}>código</code></td>
                  </tr>
                </tbody>
              </table>
              <p className="prd-md-cheatsheet-note">
                <strong>Tips:</strong> Deja una línea en blanco entre párrafos. Para listas, cada elemento va en su propia línea iniciando con <code>-</code> o <code>1.</code>. No uses el carácter <code>•</code> directamente — usa <code>-</code> y el sistema lo convierte en bullet.
              </p>
            </div>
          </details>


          <div className="row g-3">
            <div className="col-12 col-md-6">
              <label className="prd-label">Orden dentro de la sección</label>
              <input
                type="number"
                className="prd-input"
                value={data.orden ?? ''}
                onChange={e => {
                  const raw = e.target.value;
                  if (raw === '') setField('orden', null);
                  else setField('orden', parseInt(raw));
                }}
                onFocus={e => e.target.select()}
                placeholder="(automático)"
              />
              {data.orden == null || isNaN(Number(data.orden)) ? (
                <span className="prd-field-hint">Si lo dejas vacío, se asignará automáticamente al final de la sección.</span>
              ) : preguntasConMismoOrden.length > 0 ? (
                <span className="prd-field-warn">
                  <i className="fas fa-exclamation-triangle me-1"></i>
                  Ya hay otra pregunta con orden {data.orden} en esta sección: <strong>«{preguntasConMismoOrden[0].slice(0, 60)}{preguntasConMismoOrden[0].length > 60 ? '…' : ''}»</strong>. Se ordenarán por id como desempate.
                </span>
              ) : (
                <span className="prd-field-hint">Más bajo = aparece más arriba en la sección. Tip: usa 10, 20, 30 para dejar huecos.</span>
              )}
            </div>
            <div className="col-12 col-md-6 d-flex align-items-end">
              <label className="prd-toggle">
                <input
                  type="checkbox"
                  checked={data.activa}
                  onChange={e => setField('activa', e.target.checked)}
                />
                <span>Pregunta activa</span>
              </label>
            </div>
          </div>

          <label className="prd-label">Visible para</label>
          <p className="prd-help">
            Recuerda: el usuario debe tener el rol marcado <strong>aquí Y en la sección</strong> para ver la pregunta.
            {seccionActual && rolesPermitidosPorSeccion.length > 0 && (
              <> La sección actual solo permite: <strong>{rolesPermitidosPorSeccion.map(r => r.label).join(', ')}</strong>.</>
            )}
          </p>
          <div className="prd-roles-grid">
            {ROLES_VISIBLES.map(r => {
              const bloqueado = !seccionPermiteRol(r.flag);
              return (
                <label
                  key={r.key}
                  className={`prd-role-check ${data[r.flag] ? 'prd-role-check--on' : ''} ${bloqueado ? 'prd-role-check--disabled' : ''}`}
                  style={{ '--rc': r.color }}
                  title={bloqueado ? 'La sección no permite este rol. Edítala primero.' : ''}
                >
                  <input
                    type="checkbox"
                    checked={!!data[r.flag]}
                    disabled={bloqueado}
                    onChange={e => setField(r.flag, e.target.checked)}
                  />
                  <span className="prd-role-check-name">
                    {r.label}
                    {bloqueado && <span className="prd-role-check-locked"><i className="fas fa-lock"></i></span>}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
        <div className="prd-modal-footer">
          <button type="button" className="prd-btn-secondary" onClick={cerrar} disabled={saving}>Cancelar</button>
          <button type="submit" className="prd-btn-primary" disabled={saving}>
            {saving ? <><i className="fas fa-spinner fa-spin me-1"></i>Guardando…</> : 'Guardar pregunta'}
          </button>
        </div>
      </form>
    </div>
  );
}
