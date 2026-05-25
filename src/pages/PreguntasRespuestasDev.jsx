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
  idSeccion: 0, nombre: '', descripcion: '', icono: '',
  orden: 0, activa: true, visibleAdminBox: false, visibleCoach: false, visibleAtleta: false
};
const PREGUNTA_INIT = {
  idPregunta: 0, idSeccion: 0, pregunta: '', respuesta: '',
  orden: 0, activa: true, visibleAdminBox: false, visibleCoach: false, visibleAtleta: false
};

const normalizar = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

const PAGE_SIZE = 10;

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
  const [tab, setTab] = useState('secciones');
  const [secciones, setSecciones] = useState([]);
  const [preguntas, setPreguntas] = useState([]);
  const [loading, setLoading] = useState(true);

  const [buscadorSec, setBuscadorSec] = useState('');
  const [buscadorPreg, setBuscadorPreg] = useState('');
  const [filtroSeccion, setFiltroSeccion] = useState('');
  const [filtroModalAbierto, setFiltroModalAbierto] = useState(false);
  const [pagSec, setPagSec] = useState(1);
  const [pagPreg, setPagPreg] = useState(1);

  useEffect(() => { setPagSec(1); }, [buscadorSec]);
  useEffect(() => { setPagPreg(1); }, [buscadorPreg, filtroSeccion]);

  const [modalSec, setModalSec] = useState({ open: false, data: SECCION_INIT, saving: false });
  const [modalPreg, setModalPreg] = useState({ open: false, data: PREGUNTA_INIT, saving: false });

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

  function nextOrdenSeccion() {
    if (secciones.length === 0) return 1;
    const max = Math.max(...secciones.map(s => Number(s.orden) || 0));
    return Math.min(max + 1, 9999);
  }
  function nextOrdenPregunta(idSeccion) {
    const list = preguntas.filter(p => p.idSeccion === idSeccion);
    if (list.length === 0) return 1;
    const max = Math.max(...list.map(p => Number(p.orden) || 0));
    return Math.min(max + 1, 9999);
  }

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
    const payload = { ...data };
    if (payload.orden == null || isNaN(Number(payload.orden))) {
      payload.orden = nextOrdenSeccion();
    }
    const conflictoSec = secciones.filter(
      s => s.idSeccion !== payload.idSeccion && Number(s.orden) === Number(payload.orden)
    );
    if (conflictoSec.length > 0) return;
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
    const payload = { ...data };
    if (payload.orden == null || isNaN(Number(payload.orden))) {
      payload.orden = nextOrdenPregunta(payload.idSeccion);
    }
    const conflictoPreg = preguntas.filter(
      p => p.idSeccion === payload.idSeccion &&
           p.idPregunta !== payload.idPregunta &&
           Number(p.orden) === Number(payload.orden)
    );
    if (conflictoPreg.length > 0) return;
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

  const seccionesFiltradas = useMemo(() => {
    const tokens = normalizar(buscadorSec).split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return secciones;
    return secciones.filter(s => {
      const roles = ROLES_VISIBLES.filter(r => s[r.flag]).map(r => normalizar(r.label)).join(' ');
      const haystack = normalizar(`${s.nombre} ${s.descripcion || ''} ${roles}`);
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
        const roles = ROLES_VISIBLES.filter(r => p[r.flag]).map(r => normalizar(r.label)).join(' ');
        const haystack = normalizar(`${p.pregunta} ${p.respuesta} ${seccionesIdx.get(p.idSeccion) || ''} ${roles}`);
        return tokens.every(t => haystack.includes(t));
      });
    }
    return lista;
  }, [preguntas, filtroSeccion, buscadorPreg, secciones]);

  const totalPagSec = Math.max(1, Math.ceil(seccionesFiltradas.length / PAGE_SIZE));
  const seccionesPagina = seccionesFiltradas.slice((pagSec - 1) * PAGE_SIZE, pagSec * PAGE_SIZE);
  const totalPagPreg = Math.max(1, Math.ceil(preguntasFiltradas.length / PAGE_SIZE));
  const preguntasPagina = preguntasFiltradas.slice((pagPreg - 1) * PAGE_SIZE, pagPreg * PAGE_SIZE);

  useEffect(() => { if (pagSec > totalPagSec) setPagSec(totalPagSec); }, [pagSec, totalPagSec]);
  useEffect(() => { if (pagPreg > totalPagPreg) setPagPreg(totalPagPreg); }, [pagPreg, totalPagPreg]);

  const seccionPorId = useMemo(() => {
    const m = new Map();
    secciones.forEach(s => m.set(s.idSeccion, s));
    return m;
  }, [secciones]);

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

  if (loading) {
    return <div className="prd-root prd-loading-wrap"><AtletifyLoader /></div>;
  }

  return (
    <div className="prd-root">

      {/* ── HEADER STICKY ── */}
      <header className="prd-header">
        <div className="prd-header-inner">
          <BackButton to="/dashboard" />
          <div className="prd-header-text">
            <h1 className="prd-title">Preguntas <span>&amp;</span> Respuestas</h1>
            <p className="prd-subtitle">Gestiona el FAQ por rol y sección</p>
          </div>
        </div>
      </header>

      {/* ── CONTENIDO ── */}
      <div className="prd-content">

        {/* Tabs */}
        <div className="prd-tabs">
          <button
            className={`prd-tab ${tab === 'secciones' ? 'prd-tab--active' : ''}`}
            onClick={() => setTab('secciones')}
          >
            <i className="fas fa-folder"></i>
            Secciones <span className="prd-tab-count">{secciones.length}</span>
          </button>
          <button
            className={`prd-tab ${tab === 'preguntas' ? 'prd-tab--active' : ''}`}
            onClick={() => setTab('preguntas')}
          >
            <i className="fas fa-question-circle"></i>
            Preguntas <span className="prd-tab-count">{preguntas.length}</span>
          </button>
          <button
            className={`prd-tab ${tab === 'vista-previa' ? 'prd-tab--active' : ''}`}
            onClick={() => setTab('vista-previa')}
          >
            <i className="fas fa-eye"></i>
            Vista previa
          </button>
        </div>

        {/* ════ TAB SECCIONES ════ */}
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
                <i className="fas fa-plus"></i><span className="prd-btn-label">Nueva sección</span>
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

                {/* CARDS — móvil (< 768px) */}
                <div className="prd-cards-list d-md-none">
                  {seccionesPagina.map(s => (
                    <div key={s.idSeccion} className="prd-card">
                      <div className="prd-card-header">
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="prd-card-title">{s.nombre}</div>
                          {s.descripcion && <p className="prd-card-desc">{s.descripcion}</p>}
                        </div>
                        <div className="prd-actions">
                          <button className="prd-icon-btn prd-icon-btn--edit" title="Editar" onClick={() => abrirEditarSeccion(s)}>
                            <i className="fas fa-pen"></i>
                          </button>
                          <button className="prd-icon-btn prd-icon-btn--delete" title="Eliminar" onClick={() => eliminarSeccion(s)}>
                            <i className="fas fa-trash"></i>
                          </button>
                        </div>
                      </div>
                      <div className="prd-card-meta">
                        {ROLES_VISIBLES.map(r => s[r.flag] && (
                          <span key={r.key} className="prd-chip" style={{ background: `${r.color}22`, color: r.color, borderColor: `${r.color}55` }}>
                            {r.label}
                          </span>
                        ))}
                        {!s.visibleAdminBox && !s.visibleCoach && !s.visibleAtleta && (
                          <span className="prd-chip-empty">— Nadie —</span>
                        )}
                      </div>
                      <div className="prd-card-footer">
                        <div className="prd-card-orden">
                          Orden <strong>{s.orden}</strong>
                        </div>
                        <div className="d-flex align-items-center gap-2">
                          <span className="prd-pill">{s.totalPreguntas || 0} preg.</span>
                          {s.activa
                            ? <span className="prd-status prd-status--on">Activa</span>
                            : <span className="prd-status prd-status--off">Inactiva</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* TABLA — desktop (≥ 768px) */}
                <div className="prd-table-wrap d-none d-md-block">
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
                          <td className="prd-cell-center">
                            <span className="prd-orden">{s.orden}</span>
                          </td>
                          <td>
                            <div className="prd-seccion-cell">
                              <div>
                                <div className="prd-seccion-nombre">{s.nombre}</div>
                                {s.descripcion && <div className="prd-seccion-desc">{s.descripcion}</div>}
                              </div>
                            </div>
                          </td>
                          <td className="prd-cell-center">
                            <span className="prd-pill">{s.totalPreguntas || 0}</span>
                          </td>
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
                              <button className="prd-icon-btn prd-icon-btn--edit" title="Editar" onClick={() => abrirEditarSeccion(s)}>
                                <i className="fas fa-pen"></i>
                              </button>
                              <button className="prd-icon-btn prd-icon-btn--delete" title="Eliminar" onClick={() => eliminarSeccion(s)}>
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

        {/* ════ TAB PREGUNTAS ════ */}
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
              <button type="button" className="prd-filtro-btn" onClick={() => setFiltroModalAbierto(true)}>
                <i className="fas fa-filter prd-filtro-btn-icon"></i>
                <span className={`prd-filtro-btn-text ${filtroSeccion ? 'prd-filtro-btn-text--activo' : ''}`}>
                  {filtroSeccion ? (seccionPorId.get(Number(filtroSeccion))?.nombre ?? 'Sección') : 'Todas las secciones'}
                </span>
                <i className="fas fa-chevron-down prd-filtro-arrow"></i>
              </button>
              <button className="prd-btn-primary" onClick={abrirNuevaPregunta} disabled={secciones.length === 0}>
                <i className="fas fa-plus"></i><span className="prd-btn-label">Nueva pregunta</span>
              </button>
            </div>

            {preguntasFiltradas.length === 0 ? (
              <div className="prd-empty">
                <i className="fas fa-question-circle prd-empty-icon"></i>
                <p>
                  {buscadorPreg || filtroSeccion
                    ? 'Sin resultados.'
                    : secciones.length === 0
                      ? 'Primero crea al menos una sección.'
                      : 'Aún no hay preguntas.'}
                </p>
              </div>
            ) : (
              <>
                <div className="prd-pag-summary">
                  Mostrando <strong>{(pagPreg - 1) * PAGE_SIZE + 1}–{Math.min(pagPreg * PAGE_SIZE, preguntasFiltradas.length)}</strong> de <strong>{preguntasFiltradas.length}</strong> {preguntasFiltradas.length === 1 ? 'pregunta' : 'preguntas'}
                </div>

                {/* CARDS — móvil (< 768px) */}
                <div className="prd-cards-list d-md-none">
                  {preguntasPagina.map(p => {
                    const sec = seccionPorId.get(p.idSeccion);
                    return (
                      <div key={p.idPregunta} className="prd-card">
                        <div className="prd-card-header">
                          <div style={{ flex: 1, minWidth: 0 }}>
                            {sec && (
                              <span className="prd-seccion-tag" style={{ marginBottom: '0.35rem', display: 'inline-flex' }}>
                                {sec.nombre}
                              </span>
                            )}
                            <div className="prd-card-title" style={{ marginTop: sec ? '0.3rem' : 0 }}>
                              {p.pregunta}
                            </div>
                          </div>
                          <div className="prd-actions">
                            <button className="prd-icon-btn prd-icon-btn--edit" title="Editar" onClick={() => abrirEditarPregunta(p)}>
                              <i className="fas fa-pen"></i>
                            </button>
                            <button className="prd-icon-btn prd-icon-btn--delete" title="Eliminar" onClick={() => eliminarPregunta(p)}>
                              <i className="fas fa-trash"></i>
                            </button>
                          </div>
                        </div>
                        <div className="prd-card-meta">
                          {ROLES_VISIBLES.map(r => p[r.flag] && (
                            <span key={r.key} className="prd-chip" style={{ background: `${r.color}22`, color: r.color, borderColor: `${r.color}55` }}>
                              {r.label}
                            </span>
                          ))}
                          {!p.visibleAdminBox && !p.visibleCoach && !p.visibleAtleta && (
                            <span className="prd-chip-empty">— Nadie —</span>
                          )}
                        </div>
                        <div className="prd-card-footer">
                          <div className="prd-card-orden">
                            Orden <strong>{p.orden}</strong>
                          </div>
                          {p.activa
                            ? <span className="prd-status prd-status--on">Activa</span>
                            : <span className="prd-status prd-status--off">Inactiva</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* TABLA — desktop (≥ 768px) */}
                <div className="prd-table-wrap d-none d-md-block">
                  <table className="prd-table">
                    <thead>
                      <tr>
                        <th>Orden</th>
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
                            <td className="prd-cell-center">
                              <span className="prd-orden">{p.orden}</span>
                            </td>
                            <td>
                              {sec
                                ? <span className="prd-seccion-tag">{sec.nombre}</span>
                                : <span className="prd-chip-empty">(sin sección)</span>}
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
                                <button className="prd-icon-btn prd-icon-btn--edit" title="Editar" onClick={() => abrirEditarPregunta(p)}>
                                  <i className="fas fa-pen"></i>
                                </button>
                                <button className="prd-icon-btn prd-icon-btn--delete" title="Eliminar" onClick={() => eliminarPregunta(p)}>
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

        {/* ════ TAB VISTA PREVIA ════ */}
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
                      <h3 className="prd-previa-seccion-nombre">{s.nombre}</h3>
                      {s.descripcion && <p className="prd-previa-seccion-desc">{s.descripcion}</p>}
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

      </div>{/* /prd-content */}

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

      {/* MODAL FILTRO SECCIÓN */}
      {filtroModalAbierto && (
        <ModalSeleccionSeccion
          secciones={secciones}
          seleccionadoId={filtroSeccion}
          onSeleccionar={(id) => { setFiltroSeccion(id ? String(id) : ''); setFiltroModalAbierto(false); }}
          onCerrar={() => setFiltroModalAbierto(false)}
          titulo="Filtrar por sección"
          mostrarTodas={true}
        />
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════
// STEPPER DE ORDEN
// ════════════════════════════════════════════════════════
function StepperOrden({ value, onChange }) {
  const num = (value == null || value === '' || isNaN(Number(value))) ? null : Number(value);

  const decrement = () => {
    if (num === null || num <= 0) return;
    onChange(num - 1);
  };

  const increment = () => {
    if (num === null) { onChange(0); return; }
    if (num >= 9999) return;
    onChange(num + 1);
  };

  const handleChange = (e) => {
    const raw = e.target.value;
    if (raw === '') { onChange(null); return; }
    const n = parseInt(raw, 10);
    if (isNaN(n) || n < 0) return;
    if (n > 9999) return;
    onChange(n);
  };

  return (
    <div className="prd-stepper">
      <button
        type="button"
        className="prd-stepper-btn"
        onClick={decrement}
        disabled={num === null || num <= 0}
        tabIndex={-1}
        aria-label="Disminuir"
      >
        <i className="fas fa-minus"></i>
      </button>
      <input
        type="number"
        className="prd-stepper-input"
        value={num ?? ''}
        min={0}
        max={9999}
        step={1}
        placeholder="auto"
        onChange={handleChange}
        onFocus={e => e.target.select()}
        onKeyDown={e => {
          if (['-', '+', 'e', 'E', '.'].includes(e.key)) e.preventDefault();
        }}
      />
      <button
        type="button"
        className="prd-stepper-btn"
        onClick={increment}
        disabled={num !== null && num >= 9999}
        tabIndex={-1}
        aria-label="Aumentar"
      >
        <i className="fas fa-plus"></i>
      </button>
    </div>
  );
}

// ════════════════════════════════════════════════════════
// MODAL DE SELECCIÓN DE SECCIÓN (reutilizable)
// ════════════════════════════════════════════════════════
function ModalSeleccionSeccion({ secciones, seleccionadoId, onSeleccionar, onCerrar, titulo, mostrarTodas = false }) {
  const [buscar, setBuscar] = useState('');

  const seccionesFiltradas = useMemo(() => {
    const tokens = normalizar(buscar).split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return secciones;
    return secciones.filter(s => {
      const roles = ROLES_VISIBLES.filter(r => s[r.flag]).map(r => normalizar(r.label)).join(' ');
      const haystack = normalizar(`${s.nombre} ${s.descripcion || ''} ${roles}`);
      return tokens.every(t => haystack.includes(t));
    });
  }, [secciones, buscar]);

  return createPortal(
    <div className="prd-modal-overlay" onClick={onCerrar}>
      <div className="prd-modal prd-modal--filtro" onClick={e => e.stopPropagation()}>
        <div className="prd-modal-header">
          <h2>{titulo}</h2>
          <button type="button" className="prd-modal-close" onClick={onCerrar}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div className="prd-filtro-search">
          <i className="fas fa-search prd-filtro-search-icon"></i>
          <input
            type="text"
            className="prd-filtro-search-input"
            placeholder="Buscar sección..."
            value={buscar}
            onChange={e => setBuscar(e.target.value)}
            autoFocus
          />
        </div>
        <div className="prd-filtro-list">
          {mostrarTodas && !buscar && (
            <button type="button"
              className={`prd-filtro-opcion ${!seleccionadoId ? 'prd-filtro-opcion--activa' : ''}`}
              onClick={() => onSeleccionar('')}
            >
              <div className="prd-filtro-opcion-info">
                <span className="prd-filtro-opcion-nombre">Todas las secciones</span>
              </div>
              {!seleccionadoId && <i className="fas fa-check prd-filtro-check"></i>}
            </button>
          )}
          {seccionesFiltradas.length === 0 ? (
            <div className="prd-filtro-empty">
              <i className="fas fa-search" style={{ opacity: 0.35, fontSize: '1.4rem', display: 'block', marginBottom: '0.35rem' }}></i>
              Sin resultados para "{buscar}"
            </div>
          ) : (
            seccionesFiltradas.map(s => {
              const activo = String(seleccionadoId) === String(s.idSeccion);
              return (
                <button type="button" key={s.idSeccion}
                  className={`prd-filtro-opcion ${activo ? 'prd-filtro-opcion--activa' : ''}`}
                  onClick={() => onSeleccionar(s.idSeccion)}
                >
                  <div className="prd-filtro-opcion-info">
                    <span className="prd-filtro-opcion-nombre">{s.nombre}</span>
                    {s.descripcion && (
                      <span className="prd-filtro-opcion-desc">{s.descripcion}</span>
                    )}
                    <div className="prd-filtro-opcion-chips">
                      {ROLES_VISIBLES.filter(r => s[r.flag]).map(r => (
                        <span key={r.key} className="prd-chip"
                          style={{ background: `${r.color}22`, color: r.color, borderColor: `${r.color}55` }}>
                          {r.label}
                        </span>
                      ))}
                      {!s.visibleAdminBox && !s.visibleCoach && !s.visibleAtleta && (
                        <span className="prd-chip-empty">Sin roles</span>
                      )}
                    </div>
                  </div>
                  {activo && <i className="fas fa-check prd-filtro-check"></i>}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

// ════════════════════════════════════════════════════════
// MODAL SECCIÓN
// ════════════════════════════════════════════════════════
function ModalSeccion({ modal, setModal, onSubmit, secciones }) {
  const { data, saving } = modal;
  const setField = (field, value) => setModal(prev => ({ ...prev, data: { ...prev.data, [field]: value } }));
  const cerrar = () => setModal({ open: false, data: SECCION_INIT, saving: false });

  const seccionesConMismoOrden = secciones
    .filter(s => s.idSeccion !== data.idSeccion && Number(s.orden) === Number(data.orden))
    .map(s => s.nombre);

  return (
    <div className="prd-modal-overlay" onClick={cerrar}>
      <form className="prd-modal" onClick={e => e.stopPropagation()} onSubmit={onSubmit}>
        <div className="prd-modal-header">
          <h2>{data.idSeccion ? 'Editar sección' : 'Nueva sección'}</h2>
          <button type="button" className="prd-modal-close" onClick={cerrar}>
            <i className="fas fa-times"></i>
          </button>
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
            <div className="col-12">
              <label className="prd-label">Orden</label>
              <StepperOrden
                value={data.orden}
                onChange={v => setField('orden', v)}
              />
              {data.orden == null || isNaN(Number(data.orden)) ? (
                <span className="prd-field-hint">Dejando vacío se asigna automáticamente al final de la lista.</span>
              ) : seccionesConMismoOrden.length > 0 ? (
                <span className="prd-field-error">
                  <i className="fas fa-xmark me-1"></i>
                  El número {data.orden} ya está en uso. Elige otro.
                </span>
              ) : (
                <span className="prd-field-hint">Más bajo = aparece más arriba en la lista.</span>
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
          <button type="submit" className="prd-btn-primary" disabled={saving || seccionesConMismoOrden.length > 0}>
            {saving ? <><i className="fas fa-spinner fa-spin"></i>Guardando…</> : 'Guardar sección'}
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
  const [pickerAbierto, setPicker] = useState(false);

  const seccionActual = secciones.find(s => s.idSeccion === data.idSeccion);
  const seccionPermiteRol = (flag) => !!(seccionActual && seccionActual[flag]);

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

  const preguntasConMismoOrden = preguntas
    .filter(p =>
      p.idSeccion === data.idSeccion &&
      p.idPregunta !== data.idPregunta &&
      Number(p.orden) === Number(data.orden)
    )
    .map(p => p.pregunta);

  const rolesPermitidosPorSeccion = ROLES_VISIBLES.filter(r => seccionPermiteRol(r.flag));

  return (
    <div className="prd-modal-overlay" onClick={cerrar}>
      <form className="prd-modal prd-modal--ancha" onClick={e => e.stopPropagation()} onSubmit={onSubmit}>
        <div className="prd-modal-header">
          <h2>{data.idPregunta ? 'Editar pregunta' : 'Nueva pregunta'}</h2>
          <button type="button" className="prd-modal-close" onClick={cerrar}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div className="prd-modal-body">
          <label className="prd-label">Sección <span className="prd-req">*</span></label>
          <div className="prd-seccion-picker">
            <button
              type="button"
              className={`prd-seccion-picker-btn ${pickerAbierto ? 'prd-seccion-picker-btn--open' : ''}`}
              onClick={() => setPicker(true)}
            >
              <span className={seccionActual ? 'prd-seccion-picker-label' : 'prd-seccion-picker-label--vacia'}>
                {seccionActual ? seccionActual.nombre : '— Selecciona una sección —'}
              </span>
              <i className="fas fa-chevron-down prd-seccion-picker-arrow"></i>
            </button>
          </div>
          {pickerAbierto && (
            <ModalSeleccionSeccion
              secciones={secciones}
              seleccionadoId={data.idSeccion}
              onSeleccionar={(id) => { handleCambioSeccion(Number(id)); setPicker(false); }}
              onCerrar={() => setPicker(false)}
              titulo="Selecciona una sección"
              mostrarTodas={false}
            />
          )}
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
              placeholder={`Ejemplo:\n\n**Hola atleta**, para pagar sigue estos pasos:\n\n1. Ve a la sección Pagos\n2. Selecciona tu plan\n3. Confirma`}
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
                  <tr><td><code>**negrita**</code></td><td><strong>negrita</strong></td></tr>
                  <tr><td><code>*cursiva*</code></td><td><em>cursiva</em></td></tr>
                  <tr>
                    <td><code>- punto uno{'\n'}- punto dos</code></td>
                    <td><ul style={{ margin: 0, paddingLeft: '1.2rem' }}><li>punto uno</li><li>punto dos</li></ul></td>
                  </tr>
                  <tr>
                    <td><code>1. paso uno{'\n'}2. paso dos</code></td>
                    <td><ol style={{ margin: 0, paddingLeft: '1.2rem' }}><li>paso uno</li><li>paso dos</li></ol></td>
                  </tr>
                  <tr><td><code>[texto](https://url.com)</code></td><td><a href="#" onClick={e => e.preventDefault()}>texto</a></td></tr>
                  <tr><td><code>## Subtítulo</code></td><td><strong style={{ fontSize: '1.05em' }}>Subtítulo</strong></td></tr>
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
                <strong>Tips:</strong> Deja una línea en blanco entre párrafos. Para listas, cada elemento va en su propia línea iniciando con <code>-</code> o <code>1.</code>.
              </p>
            </div>
          </details>

          <div className="row g-3 mt-1">
            <div className="col-12 col-md-6">
              <label className="prd-label">Orden dentro de la sección</label>
              <StepperOrden
                value={data.orden}
                onChange={v => setField('orden', v)}
              />
              {data.orden == null || isNaN(Number(data.orden)) ? (
                <span className="prd-field-hint">Dejando vacío se asigna automáticamente al final de la sección.</span>
              ) : preguntasConMismoOrden.length > 0 ? (
                <span className="prd-field-error">
                  <i className="fas fa-xmark me-1"></i>
                  El número {data.orden} ya está en uso en esta sección. Elige otro.
                </span>
              ) : (
                <span className="prd-field-hint">Más bajo = aparece más arriba en la sección.</span>
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
          <button type="submit" className="prd-btn-primary" disabled={saving || preguntasConMismoOrden.length > 0}>
            {saving ? <><i className="fas fa-spinner fa-spin"></i>Guardando…</> : 'Guardar pregunta'}
          </button>
        </div>
      </form>
    </div>
  );
}
