import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import BotonSeguro from './BotonSeguro';
import AtletifyLoader from './AtletifyLoader';
import { api } from '../services/api';
import '../assets/css/ComentariosWod.css';

// Reacciones estilo Facebook (+ dislike)
const REACCIONES = ['👍', '❤️', '😆', '😮', '😢', '😡', '👎'];
const NIVEL_MAX_SANGRIA = 3; // a partir de aquí ya no se sangra más (como Facebook)

function tiempoRelativo(fechaIso) {
  if (!fechaIso) return '';
  let str = String(fechaIso);
  // El backend guarda la fecha en UTC; si no trae zona horaria, la tratamos como UTC.
  if (!/[zZ]$|[+-]\d{2}:?\d{2}$/.test(str)) str += 'Z';
  const d = new Date(str);
  const s = Math.max(0, (Date.now() - d.getTime()) / 1000);
  if (s < 60) return 'hace un momento';
  if (s < 3600) return `hace ${Math.floor(s / 60)} min`;
  if (s < 86400) return `hace ${Math.floor(s / 3600)} h`;
  if (s < 604800) return `hace ${Math.floor(s / 86400)} d`;
  return d.toLocaleDateString();
}

// Calcula localmente el nuevo estado de reacciones replicando el toggle del backend:
// misma reacción => se quita; otra distinta => se cambia; ninguna => se agrega.
function calcularReaccionLocal(reaccionesActuales, miReaccionActual, emoji) {
  const mapa = new Map((reaccionesActuales || []).map(r => [r.emoji, r.count]));
  const prev = miReaccionActual ?? null;
  let nuevaMia;
  if (prev === emoji) {
    nuevaMia = null;
    mapa.set(emoji, (mapa.get(emoji) || 1) - 1);
  } else {
    nuevaMia = emoji;
    if (prev) mapa.set(prev, (mapa.get(prev) || 1) - 1);
    mapa.set(emoji, (mapa.get(emoji) || 0) + 1);
  }
  const reacciones = [...mapa.entries()]
    .filter(([, count]) => count > 0)
    .map(([em, count]) => ({ emoji: em, count }));
  return { reacciones, miReaccion: nuevaMia };
}

// Colapsa la paginación con … (misma lógica que Ejercicios)
function buildPaginas(pagina, total) {
  return Array.from({ length: total }, (_, idx) => idx + 1)
    .filter(n => n === 1 || n === total || Math.abs(n - pagina) <= 1)
    .reduce((acc, n, i, arr) => {
      if (i > 0 && n - arr[i - 1] > 1) acc.push('...');
      acc.push(n);
      return acc;
    }, []);
}

function PaginacionReacciones({ pagina, total, onPagina }) {
  if (total <= 1) return null;
  return (
    <div className="cwc-pag">
      <button type="button" className="cwc-pag-arrow" disabled={pagina <= 1} onClick={() => onPagina(pagina - 1)}>
        <i className="fas fa-chevron-left"></i>
      </button>
      {buildPaginas(pagina, total).map((p, i) => p === '...'
        ? <span key={`e${i}`} className="cwc-pag-ellipsis">…</span>
        : <button key={p} type="button" className={`cwc-pag-num ${p === pagina ? 'is-active' : ''}`} onClick={() => onPagina(p)}>{p}</button>
      )}
      <button type="button" className="cwc-pag-arrow" disabled={pagina >= total} onClick={() => onPagina(pagina + 1)}>
        <i className="fas fa-chevron-right"></i>
      </button>
    </div>
  );
}

// Modal "quiénes reaccionaron" (estilo FB): pestañas por emoji + lista paginada 10/10.
function ModalReacciones({ items, cargando, onCerrar }) {
  const [filtro, setFiltro] = useState('todas');
  const [pagina, setPagina] = useState(1);
  const PAGE = 10;

  const conteos = {};
  for (const it of items) conteos[it.emoji] = (conteos[it.emoji] || 0) + 1;
  const emojis = Object.keys(conteos);

  const filtrados = filtro === 'todas' ? items : items.filter(it => it.emoji === filtro);
  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / PAGE));
  const paginaSegura = Math.min(pagina, totalPaginas);
  const visibles = filtrados.slice((paginaSegura - 1) * PAGE, paginaSegura * PAGE);

  const cambiarFiltro = (f) => { setFiltro(f); setPagina(1); };

  return createPortal(
    <div className="cwc-overlay cwc-react-overlay" onClick={onCerrar}>
      <div className="cwc-modal cwc-react-modal" onClick={e => e.stopPropagation()}>
        <div className="cwc-header">
          <h3 className="cwc-title"><i className="fas fa-heart me-2"></i>Reacciones</h3>
          <button className="cwc-close" onClick={onCerrar}><i className="fas fa-times"></i></button>
        </div>

        {cargando ? (
          <div className="cwc-loader-wrap"><AtletifyLoader /></div>
        ) : items.length === 0 ? (
          <div className="cwc-empty"><i className="far fa-smile"></i><p>Aún nadie ha reaccionado.</p></div>
        ) : (
          <>
            <div className="cwc-react-tabs">
              <button type="button" className={`cwc-react-tab ${filtro === 'todas' ? 'is-active' : ''}`} onClick={() => cambiarFiltro('todas')}>
                Todas <span className="cwc-react-tab-count">{items.length}</span>
              </button>
              {emojis.map(em => (
                <button type="button" key={em} className={`cwc-react-tab ${filtro === em ? 'is-active' : ''}`} onClick={() => cambiarFiltro(em)}>
                  <span className="cwc-react-tab-emoji">{em}</span><span className="cwc-react-tab-count">{conteos[em]}</span>
                </button>
              ))}
            </div>

            <div className="cwc-react-lista">
              {visibles.map((it, i) => (
                <div key={`${it.idUsuario}-${it.emoji}-${i}`} className="cwc-react-row">
                  <div className="cwc-avatar">{(it.nombre || '?').charAt(0).toUpperCase()}</div>
                  <span className="cwc-react-nombre">{it.nombre}</span>
                  <span className="cwc-react-emoji">{it.emoji}</span>
                </div>
              ))}
            </div>

            <PaginacionReacciones pagina={paginaSegura} total={totalPaginas} onPagina={setPagina} />
          </>
        )}
      </div>
    </div>,
    document.body
  );
}

export default function ModalComentariosWod({ wod, onCerrar, onCountChange, focus = null }) {
  const idEnt = wod.idEntrenamiento;
  const [comentarios, setComentarios] = useState([]);   // comentarios raíz
  const [hijos, setHijos] = useState({});               // { [idComentario]: { items, siguienteCursor, abierto, cargando } }
  const [siguienteCursor, setSiguienteCursor] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [nuevoTexto, setNuevoTexto] = useState('');
  const [respondiendoA, setRespondiendoA] = useState(null);
  const [pickerAbierto, setPickerAbierto] = useState(null);
  const [resaltadoId, setResaltadoId] = useState(null);
  const [reaccionesView, setReaccionesView] = useState(null); // { idComentario, cargando, items } | null
  const sentinelRef = useRef(null);
  const itemRefs = useRef({});
  const focoResuelto = useRef(false);

  // Cierra el picker de reacciones al tocar fuera de él o al hacer scroll (sin obligar a elegir un emoji)
  useEffect(() => {
    if (pickerAbierto === null) return;
    const cerrar = (e) => {
      // un clic/tap DENTRO del wrap (botón Reaccionar o un emoji) no cierra; el scroll siempre cierra
      if (e.type === 'pointerdown' && e.target.closest && e.target.closest('.cwc-reaccionar-wrap')) return;
      setPickerAbierto(null);
    };
    document.addEventListener('pointerdown', cerrar);
    window.addEventListener('scroll', cerrar, true); // capture: detecta scroll en cualquier contenedor
    return () => {
      document.removeEventListener('pointerdown', cerrar);
      window.removeEventListener('scroll', cerrar, true);
    };
  }, [pickerAbierto]);

  useEffect(() => {
    let activo = true;
    (async () => {
      setCargando(true);
      try {
        const data = await api.obtenerComentariosWod(idEnt, null, 10);
        if (!activo) return;
        setComentarios(data.items || []);
        setSiguienteCursor(data.siguienteCursor ?? null);
      } catch (e) { console.error(e); }
      finally { if (activo) setCargando(false); }
    })();
    return () => { activo = false; };
  }, [idEnt]);

  const cargarMas = useCallback(async () => {
    if (cargandoMas || siguienteCursor == null) return;
    setCargandoMas(true);
    try {
      const data = await api.obtenerComentariosWod(idEnt, siguienteCursor, 10);
      setComentarios(prev => [...prev, ...(data.items || [])]);
      setSiguienteCursor(data.siguienteCursor ?? null);
    } catch (e) { console.error(e); }
    finally { setCargandoMas(false); }
  }, [cargandoMas, siguienteCursor, idEnt]);

  // Scroll infinito de los comentarios raíz (sin botones de paginación)
  useEffect(() => {
    if (!sentinelRef.current || siguienteCursor == null) return;
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) cargarMas();
    }, { threshold: 1 });
    obs.observe(sentinelRef.current);
    return () => obs.disconnect();
  }, [cargarMas, siguienteCursor]);

  // ---- helpers de estado del árbol ----
  const actualizarComentario = (id, patch) => {
    setComentarios(prev => prev.map(c => c.idComentario === id ? { ...c, ...patch } : c));
    setHijos(prev => {
      let changed = false;
      const next = { ...prev };
      for (const k of Object.keys(next)) {
        if (next[k].items.some(c => c.idComentario === id)) {
          next[k] = { ...next[k], items: next[k].items.map(c => c.idComentario === id ? { ...c, ...patch } : c) };
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  };

  // Suma/resta al contador de respuestas de un comentario (donde sea que esté en el árbol)
  const bumpRespuestas = (id, delta) => {
    const ajusta = c => c.idComentario === id ? { ...c, totalRespuestas: Math.max(0, (c.totalRespuestas || 0) + delta) } : c;
    setComentarios(prev => prev.map(ajusta));
    setHijos(prev => {
      let changed = false;
      const next = { ...prev };
      for (const k of Object.keys(next)) {
        if (next[k].items.some(c => c.idComentario === id)) {
          next[k] = { ...next[k], items: next[k].items.map(ajusta) };
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  };

  const irAComentario = (id) => {
    const el = itemRefs.current[id];
    if (!el) return false;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setResaltadoId(id);
    setTimeout(() => setResaltadoId(prev => (prev === id ? null : prev)), 3000);
    return true;
  };

  // ---- acciones ----
  // Nombre para el comentario optimista (se reemplaza por el del servidor al reconciliar).
  const nombreUsuario = (() => {
    try { return JSON.parse(localStorage.getItem('usuario'))?.nombre || 'Tú'; }
    catch { return 'Tú'; }
  })();

  // Publica con UI OPTIMISTA: pinta el comentario al instante, limpia el input y
  // libera el botón de inmediato; el viaje a la red se reconcilia en segundo plano
  // y, si falla, se revierte y se devuelve el texto para reintentar.
  const publicar = () => {
    const texto = nuevoTexto.trim();
    if (!texto) return;

    const reply = respondiendoA;
    const parentId = reply?.idComentario ?? null;
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const hiloExistia = parentId != null && !!hijos[parentId];

    const optimista = {
      idComentario: tempId,
      autor: nombreUsuario,
      texto,
      fechaCreacion: new Date().toISOString(),
      reacciones: [],
      miReaccion: null,
      totalRespuestas: 0,
      puedeBorrar: false,
      eliminado: false,
      pendiente: true,
      idComentarioPadre: parentId,
      respondeA: reply ? reply.autor : null,
    };

    // 1) Pintar al instante + limpiar input + cerrar "respondiendo".
    if (parentId != null) {
      setHijos(prev => {
        const cur = prev[parentId] || { items: [], siguienteCursor: null, abierto: true, cargando: false };
        return { ...prev, [parentId]: { ...cur, items: [...cur.items, optimista], abierto: true } };
      });
      bumpRespuestas(parentId, 1);
    } else {
      setComentarios(prev => [optimista, ...prev]);
    }
    onCountChange && onCountChange(1);
    setNuevoTexto('');
    setRespondiendoA(null);

    // 2) Reconciliar con el servidor en segundo plano (no bloquea el botón).
    (async () => {
      try {
        if (parentId != null) {
          // Si el hilo era nuevo, traer en segundo plano las respuestas previas.
          if (!hiloExistia) {
            try {
              const prevData = await api.obtenerRespuestasComentario(parentId, null, 10);
              setHijos(prev => {
                const cur = prev[parentId];
                if (!cur) return prev;
                const previos = (prevData.items || []).filter(p => !cur.items.some(x => x.idComentario === p.idComentario));
                return { ...prev, [parentId]: { ...cur, items: [...previos, ...cur.items], siguienteCursor: prevData.siguienteCursor ?? null } };
              });
            } catch { /* si falla, al menos queda el comentario optimista visible */ }
          }
          const real = await api.responderComentarioWod(parentId, texto);
          setHijos(prev => {
            const cur = prev[parentId];
            if (!cur) return prev;
            return { ...prev, [parentId]: { ...cur, items: cur.items.map(x => x.idComentario === tempId ? real : x) } };
          });
        } else {
          const real = await api.crearComentarioWod(idEnt, texto);
          setComentarios(prev => prev.map(c => c.idComentario === tempId ? real : c));
        }
      } catch (e) {
        // Revertir: quitar el optimista y devolver el texto para reintentar.
        if (parentId != null) {
          setHijos(prev => {
            const cur = prev[parentId];
            if (!cur) return prev;
            return { ...prev, [parentId]: { ...cur, items: cur.items.filter(x => x.idComentario !== tempId) } };
          });
          bumpRespuestas(parentId, -1);
        } else {
          setComentarios(prev => prev.filter(c => c.idComentario !== tempId));
        }
        onCountChange && onCountChange(-1);
        setNuevoTexto(curr => curr || texto);          // no pisar si ya escribió otra cosa
        setRespondiendoA(curr => curr || reply);
        alert(e.message || 'No se pudo publicar el comentario.');
      }
    })();
  };

  const reaccionar = (comentario, emoji) => {
    setPickerAbierto(null);
    // snapshot para revertir si la red falla
    const snapshot = { reacciones: comentario.reacciones || [], miReaccion: comentario.miReaccion ?? null };
    // 1) pintar al instante (mismo toggle que el backend)
    actualizarComentario(comentario.idComentario, calcularReaccionLocal(snapshot.reacciones, snapshot.miReaccion, emoji));
    // 2) reconciliar con el servidor en segundo plano
    api.reaccionarComentarioWod(comentario.idComentario, emoji)
      .then(res => actualizarComentario(comentario.idComentario, { reacciones: res.reacciones || [], miReaccion: res.miReaccion ?? null }))
      .catch(e => {
        actualizarComentario(comentario.idComentario, snapshot); // revertir
        alert(e.message || 'No se pudo reaccionar.');
      });
  };

  // Abre el modal con la lista de quiénes reaccionaron (estilo FB).
  const verReacciones = (comentario) => {
    if (!comentario.idComentario || comentario.pendiente) return; // ignorar comentarios optimistas
    setReaccionesView({ idComentario: comentario.idComentario, cargando: true, items: [] });
    api.obtenerReaccionesComentario(comentario.idComentario)
      .then(items => setReaccionesView(v => (v && v.idComentario === comentario.idComentario) ? { ...v, cargando: false, items: items || [] } : v))
      .catch(() => setReaccionesView(v => (v && v.idComentario === comentario.idComentario) ? { ...v, cargando: false, items: [] } : v));
  };

  const borrar = async (comentario) => {
    if (!(await window.wpConfirm('¿Borrar este comentario?'))) return;
    try {
      const res = await api.borrarComentarioWod(comentario.idComentario);
      onCountChange && onCountChange(-1); // deja de contar (soft o hard)
      if (res.soft) {
        actualizarComentario(comentario.idComentario, { eliminado: true, texto: '', puedeBorrar: false, reacciones: [], miReaccion: null });
      } else {
        const parentId = comentario.idComentarioPadre ?? null;
        setComentarios(prev => prev.filter(c => c.idComentario !== comentario.idComentario));
        if (parentId != null) {
          setHijos(prev => prev[parentId]
            ? { ...prev, [parentId]: { ...prev[parentId], items: prev[parentId].items.filter(c => c.idComentario !== comentario.idComentario) } }
            : prev);
          bumpRespuestas(parentId, -1);
        }
        // limpiar su propio hilo si lo tenía
        setHijos(prev => {
          if (!prev[comentario.idComentario]) return prev;
          const next = { ...prev }; delete next[comentario.idComentario]; return next;
        });
      }
    } catch (e) { alert(e.message || 'No se pudo borrar.'); }
  };

  const toggleRespuestas = async (c) => {
    const id = c.idComentario;
    const cur = hijos[id];
    if (cur?.abierto) { setHijos(prev => ({ ...prev, [id]: { ...prev[id], abierto: false } })); return; }
    if (cur && cur.items.length > 0) { setHijos(prev => ({ ...prev, [id]: { ...prev[id], abierto: true } })); return; }
    setHijos(prev => ({ ...prev, [id]: { items: [], siguienteCursor: null, abierto: true, cargando: true } }));
    try {
      const data = await api.obtenerRespuestasComentario(id, null, 10);
      setHijos(prev => ({ ...prev, [id]: { items: data.items || [], siguienteCursor: data.siguienteCursor ?? null, abierto: true, cargando: false } }));
    } catch (e) {
      setHijos(prev => ({ ...prev, [id]: { items: [], siguienteCursor: null, abierto: true, cargando: false } }));
    }
  };

  const cargarMasRespuestas = async (id) => {
    const cur = hijos[id];
    if (!cur || cur.siguienteCursor == null || cur.cargando) return;
    setHijos(prev => ({ ...prev, [id]: { ...prev[id], cargando: true } }));
    try {
      const data = await api.obtenerRespuestasComentario(id, cur.siguienteCursor, 10);
      setHijos(prev => ({ ...prev, [id]: { items: [...prev[id].items, ...(data.items || [])], siguienteCursor: data.siguienteCursor ?? null, abierto: true, cargando: false } }));
    } catch (e) {
      setHijos(prev => ({ ...prev, [id]: { ...prev[id], cargando: false } }));
    }
  };

  const iniciarRespuesta = (comentario) => {
    setRespondiendoA(comentario);
    setPickerAbierto(null);
    setTimeout(() => document.getElementById('cwc-composer-input')?.focus(), 50);
  };

  // ---- enfoque desde una notificación: navega por la cadena de ancestros ----
  const enfocar = async (targetId) => {
    try {
      const { ruta } = await api.contextoComentario(targetId);
      if (!ruta || !ruta.length) return;
      const rootId = ruta[0];
      // 1. cargar raíces hasta encontrar la raíz del hilo
      let roots = [...comentarios];
      let cursor = siguienteCursor;
      let g = 0;
      while (!roots.some(c => c.idComentario === rootId) && cursor != null && g++ < 20) {
        const data = await api.obtenerComentariosWod(idEnt, cursor, 10);
        roots = [...roots, ...(data.items || [])];
        cursor = data.siguienteCursor ?? null;
      }
      setComentarios(roots);
      setSiguienteCursor(cursor);
      // 2. expandir cada ancestro cargando hasta encontrar el siguiente nodo
      const nuevosHijos = { ...hijos };
      for (let i = 0; i < ruta.length - 1; i++) {
        const parentId = ruta[i];
        const childId = ruta[i + 1];
        let items = nuevosHijos[parentId]?.items ? [...nuevosHijos[parentId].items] : [];
        let hc = nuevosHijos[parentId]?.siguienteCursor ?? null;
        if (items.length === 0) {
          const first = await api.obtenerRespuestasComentario(parentId, null, 10);
          items = first.items || [];
          hc = first.siguienteCursor ?? null;
        }
        let g2 = 0;
        while (!items.some(c => c.idComentario === childId) && hc != null && g2++ < 20) {
          const data = await api.obtenerRespuestasComentario(parentId, hc, 10);
          items = [...items, ...(data.items || [])];
          hc = data.siguienteCursor ?? null;
        }
        nuevosHijos[parentId] = { items, siguienteCursor: hc, abierto: true, cargando: false };
      }
      setHijos(nuevosHijos);
      setTimeout(() => irAComentario(targetId), 160);
    } catch (e) { console.error('focus', e); }
  };

  useEffect(() => {
    if (focus && focus.idComentario && !cargando && !focoResuelto.current) {
      focoResuelto.current = true;
      enfocar(focus.idComentario);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus, cargando]);

  // ---- render recursivo de un comentario y sus respuestas ----
  const renderComentario = (c, nivel = 0) => {
    const totalReacciones = (c.reacciones || []).reduce((a, r) => a + r.count, 0);
    const inicial = (c.autor || '?').charAt(0).toUpperCase();
    const estado = hijos[c.idComentario];
    const plana = nivel >= NIVEL_MAX_SANGRIA;
    return (
      <div
        key={c.idComentario}
        ref={el => { if (el) itemRefs.current[c.idComentario] = el; }}
        className={`cwc-item ${nivel > 0 ? 'cwc-item--respuesta' : ''} ${resaltadoId === c.idComentario ? 'cwc-item--resaltado' : ''} ${c.pendiente ? 'cwc-item--pendiente' : ''}`}
      >
        <div className="cwc-avatar">{inicial}</div>
        <div className="cwc-item-body">
          <div className="cwc-bubble">
            <div className="cwc-item-head">
              <span className="cwc-autor">{c.autor}</span>
              <span className="cwc-fecha">{c.pendiente ? 'enviando…' : tiempoRelativo(c.fechaCreacion)}</span>
            </div>
            {c.eliminado
              ? <p className="cwc-texto cwc-texto--eliminado"><i className="fas fa-ban me-1"></i>Comentario eliminado</p>
              : <p className="cwc-texto">
                  {c.respondeA && <span className="cwc-responde-a"><i className="fas fa-reply"></i>{c.respondeA}</span>}
                  {c.texto}
                </p>}

            {totalReacciones > 0 && (
              <button type="button" className="cwc-reacciones-resumen" onClick={() => verReacciones(c)}>
                {(c.reacciones || []).map(r => <span key={r.emoji}>{r.emoji}</span>)}
                <span className="cwc-reacciones-count">{totalReacciones}</span>
              </button>
            )}
          </div>

          {!c.eliminado && !c.pendiente && (
            <div className="cwc-acciones">
              <div className="cwc-reaccionar-wrap">
                <button
                  className={`cwc-accion-btn ${c.miReaccion ? 'cwc-accion-btn--activo' : ''}`}
                  onClick={() => setPickerAbierto(pickerAbierto === c.idComentario ? null : c.idComentario)}
                >
                  {c.miReaccion ? <span className="cwc-mi-reaccion">{c.miReaccion}</span> : <><i className="far fa-smile"></i> Reaccionar</>}
                </button>
                {pickerAbierto === c.idComentario && (
                  <div className="cwc-picker">
                    {REACCIONES.map(em => (
                      <button key={em} className="cwc-picker-emoji" onClick={() => reaccionar(c, em)}>{em}</button>
                    ))}
                  </div>
                )}
              </div>
              <button className="cwc-accion-btn" onClick={() => iniciarRespuesta(c)}>
                <i className="fas fa-reply"></i> Responder
              </button>
              {c.puedeBorrar && (
                <button className="cwc-accion-btn cwc-accion-btn--danger" onClick={() => borrar(c)}>
                  <i className="fas fa-trash"></i>
                </button>
              )}
            </div>
          )}

          {/* Respuestas anidadas (recursivo) */}
          {c.totalRespuestas > 0 && (
            <div className="cwc-respuestas">
              <button className="cwc-ver-respuestas" onClick={() => toggleRespuestas(c)}>
                <i className={`fas fa-chevron-${estado?.abierto ? 'up' : 'down'}`}></i>
                {estado?.abierto ? 'Ocultar respuestas' : `Ver ${c.totalRespuestas} ${c.totalRespuestas === 1 ? 'respuesta' : 'respuestas'}`}
              </button>
              {estado?.abierto && (
                <div className={`cwc-respuestas-lista ${plana ? 'cwc-respuestas-lista--plana' : ''}`}>
                  {(estado.items || []).map(h => renderComentario(h, nivel + 1))}
                  {estado.cargando && <div className="cwc-loader-mini"><AtletifyLoader /></div>}
                  {estado.siguienteCursor != null && !estado.cargando && (
                    <button className="cwc-ver-respuestas cwc-ver-mas" onClick={() => cargarMasRespuestas(c.idComentario)}>
                      Ver más respuestas
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      {createPortal(
        <div className="cwc-overlay" onClick={onCerrar}>
      <div className="cwc-modal" onClick={e => e.stopPropagation()}>
        <div className="cwc-header">
          <h3 className="cwc-title"><i className="fas fa-comments me-2"></i>Comentarios</h3>
          <button className="cwc-close" onClick={onCerrar}><i className="fas fa-times"></i></button>
        </div>

        <div className="cwc-aviso">
          <i className="fas fa-triangle-exclamation"></i>
          No se permiten groserías ni lenguaje ofensivo. Los comentarios inapropiados pueden ser eliminados por la administración del box y tu cuenta puede ser penalizada.
        </div>

        <div className="cwc-lista">
          {cargando ? (
            <div className="cwc-loader-wrap"><AtletifyLoader /></div>
          ) : comentarios.length === 0 ? (
            <div className="cwc-empty">
              <i className="fas fa-comment-dots"></i>
              <p>Sé el primero en comentar este WOD.</p>
            </div>
          ) : (
            <>
              {comentarios.map(c => renderComentario(c, 0))}
              {cargandoMas && <div className="cwc-loader-mini"><AtletifyLoader /></div>}
              {siguienteCursor != null && <div ref={sentinelRef} className="cwc-sentinel" />}
            </>
          )}
        </div>

        <div className="cwc-composer">
          {respondiendoA && (
            <div className="cwc-respondiendo">
              <span>Respondiendo a <strong>{respondiendoA.autor}</strong></span>
              <button onClick={() => setRespondiendoA(null)}><i className="fas fa-times"></i></button>
            </div>
          )}
          <div className="cwc-composer-row">
            <textarea
              id="cwc-composer-input"
              className="cwc-input"
              rows="1"
              maxLength={1000}
              placeholder={respondiendoA ? 'Escribe tu respuesta...' : 'Escribe un comentario...'}
              value={nuevoTexto}
              onChange={e => setNuevoTexto(e.target.value)}
            />
            <BotonSeguro
              type="button"
              onClick={publicar}
              className="cwc-publicar"
              textoProcesando="..."
              tiempoBloqueo={400}
              disabled={!nuevoTexto.trim()}
            >
              <i className="fas fa-paper-plane"></i>
            </BotonSeguro>
          </div>
        </div>
      </div>
    </div>,
        document.body
      )}
      {reaccionesView && (
        <ModalReacciones
          items={reaccionesView.items}
          cargando={reaccionesView.cargando}
          onCerrar={() => setReaccionesView(null)}
        />
      )}
    </>
  );
}
