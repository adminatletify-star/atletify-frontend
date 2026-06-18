import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import AtletifyLoader from '../components/AtletifyLoader';
import BackButton from '../components/BackButton';
import BotonSeguro from '../components/BotonSeguro';
import './PagesCSS/BuzonSugerencias.css';

// Categorías para reportes dirigidos al EQUIPO DE DESARROLLO (técnicas)
const CATEGORIAS_DEV = [
  { id: 'Bug', icon: 'fa-bug', label: 'Bug / Error' },
  { id: 'Error de Carga', icon: 'fa-triangle-exclamation', label: 'Error de Carga' },
  { id: 'Texto Mal Escrito', icon: 'fa-spell-check', label: 'Ortografía' },
  { id: 'Sugerencia', icon: 'fa-lightbulb', label: 'Sugerencia' },
  { id: 'Mejora UI', icon: 'fa-palette', label: 'Mejora Visual' },
  { id: 'Problema Móvil', icon: 'fa-mobile-screen', label: 'Problema Móvil' },
  { id: 'Problema de Acceso', icon: 'fa-lock', label: 'Acceso / Permisos' },
  { id: 'Otro', icon: 'fa-circle-question', label: 'Otro' },
];

// Categorías para sugerencias dirigidas al ADMINISTRADOR DEL BOX (operativas).
// Los ids DEBEN coincidir con CategoriasAdmin en SugerenciasController.cs.
const CATEGORIAS_ADMIN = [
  { id: 'Instalaciones', icon: 'fa-building', label: 'Instalaciones' },
  { id: 'Horarios y Clases', icon: 'fa-calendar-days', label: 'Horarios y Clases' },
  { id: 'Equipo y Material', icon: 'fa-dumbbell', label: 'Equipo y Material' },
  { id: 'Limpieza', icon: 'fa-broom', label: 'Limpieza' },
  { id: 'Atención y Trato', icon: 'fa-handshake', label: 'Atención y Trato' },
  { id: 'Cobros y Pagos', icon: 'fa-credit-card', label: 'Cobros y Pagos' },
  { id: 'Sugerencia para el Box', icon: 'fa-lightbulb', label: 'Sugerencia para el Box' },
  { id: 'Otro', icon: 'fa-circle-question', label: 'Otro' },
];

const ALL_CATEGORIAS = [...CATEGORIAS_DEV, ...CATEGORIAS_ADMIN];
const catInfo = (id) => ALL_CATEGORIAS.find(c => c.id === id) || { icon: 'fa-comment-dots', label: id };

const ESTATUS_CONFIG = {
  'Pendiente': { icon: 'fa-clock', color: '#f39c12', label: 'Pendiente' },
  'En Proceso': { icon: 'fa-wrench', color: '#3498db', label: 'En Proceso' },
  'Solucionado': { icon: 'fa-check-circle', color: '#2ecc71', label: 'Solucionado' },
  'No Procede': { icon: 'fa-ban', color: '#e74c3c', label: 'No Procede' },
};

const API_URL = import.meta.env.VITE_API_URL;
const MAX_CHARS = 1000;
const PAGE_SIZE = 10;
const TABS_GESTION = ['Pendiente', 'En Proceso', 'Solucionado', 'No Procede'];

// Acciones disponibles según el estado actual de la sugerencia (botones con ícono + texto)
const ACCIONES_POR_ESTADO = {
  'Pendiente': [
    { target: 'En Proceso', label: 'En proceso', icon: 'fa-wrench', cls: 'act-proceso' },
    { target: 'No Procede', label: 'No procede', icon: 'fa-ban', cls: 'act-noprocede' },
  ],
  'En Proceso': [
    { target: 'Solucionado', label: 'Solucionar', icon: 'fa-check-circle', cls: 'act-solucionado' },
    { target: 'No Procede', label: 'No procede', icon: 'fa-ban', cls: 'act-noprocede' },
  ],
  'Solucionado': [
    { target: 'Pendiente', label: 'Reabrir', icon: 'fa-rotate-left', cls: 'act-reabrir' },
  ],
  'No Procede': [
    { target: 'Pendiente', label: 'Reabrir', icon: 'fa-rotate-left', cls: 'act-reabrir' },
  ],
};

// Fecha + hora legible (ej. "18 jun 2026, 09:49 a.m.")
const fmtFechaHora = (f) =>
  new Date(f).toLocaleString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

// Colapsa la paginación con "…" (misma lógica que Ejercicios)
function buildPaginas(pagina, total) {
  return Array.from({ length: total }, (_, idx) => idx + 1)
    .filter(n => n === 1 || n === total || Math.abs(n - pagina) <= 1)
    .reduce((acc, n, i, arr) => {
      if (i > 0 && n - arr[i - 1] > 1) acc.push('...');
      acc.push(n);
      return acc;
    }, []);
}

// Selector modal reutilizable (reemplaza los <select> nativos). Centrado, con buscador
// opcional y opción activa marcada. Se renderiza con createPortal en document.body.
function ModalSelectorBuzon({ titulo, opciones, valor, onSeleccionar, onCerrar, conBusqueda = false, placeholderBusqueda = 'Buscar...' }) {
  const [buscar, setBuscar] = useState('');
  const norm = (s) => (s || '').toString().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const filtradas = conBusqueda && buscar.trim()
    ? opciones.filter(o => norm(o.label).includes(norm(buscar)))
    : opciones;

  return createPortal(
    <div className="buzon-modal-overlay" onClick={onCerrar}>
      <div className="buzon-modal-selector" onClick={e => e.stopPropagation()}>
        <div className="buzon-modal-head">
          <h3>{titulo}</h3>
          <button type="button" className="buzon-modal-close" onClick={onCerrar} aria-label="Cerrar">
            <i className="fas fa-times"></i>
          </button>
        </div>
        {conBusqueda && (
          <div className="buzon-modal-search">
            <i className="fas fa-search buzon-modal-search-icon"></i>
            <input
              type="text"
              className="buzon-modal-search-input"
              placeholder={placeholderBusqueda}
              value={buscar}
              onChange={e => setBuscar(e.target.value)}
              autoFocus
            />
          </div>
        )}
        <div className="buzon-modal-list">
          {filtradas.length === 0 ? (
            <div className="buzon-modal-empty">
              <i className="fas fa-search"></i>
              <span>Sin resultados</span>
            </div>
          ) : (
            filtradas.map(o => {
              const activo = String(valor) === String(o.value);
              return (
                <button
                  type="button"
                  key={o.value || '__todas__'}
                  className={`buzon-modal-opcion ${activo ? 'activa' : ''}`}
                  onClick={() => onSeleccionar(o.value)}
                >
                  <span>{o.label}</span>
                  {activo && <i className="fas fa-check"></i>}
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

export default function BuzonSugerencias() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [box, setBox] = useState(null);

  // ── Envío ──
  const [destinatario, setDestinatario] = useState('');   // 'Dev' | 'Admin' (atleta/coach eligen)
  const [categoria, setCategoria] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [imagenUrl, setImagenUrl] = useState('');

  // ── Historial propio ──
  const [historial, setHistorial] = useState([]);
  const [loadingHistorial, setLoadingHistorial] = useState(true);
  const [pagHist, setPagHist] = useState(1);

  // ── Gestión (Dev / AdminBox) ──
  const [sugerencias, setSugerencias] = useState([]);
  const [sugerenciasPendientes, setSugerenciasPendientes] = useState(0);
  const [filtroTabSug, setFiltroTabSug] = useState('Pendiente');
  const [filtroCatSug, setFiltroCatSug] = useState('');
  const [filtroRolSug, setFiltroRolSug] = useState('');
  const [loadingSug, setLoadingSug] = useState(true);
  const [pagSug, setPagSug] = useState(1);
  const [modalFiltro, setModalFiltro] = useState(null); // null | 'categoria' | 'rol'

  // ── Respuesta del gestor (flujo expandir → confirmar) ──
  const [respuestaDevId, setRespuestaDevId] = useState(null);
  const [respuestaDevText, setRespuestaDevText] = useState('');
  const [respuestaDevTarget, setRespuestaDevTarget] = useState(null);

  // ── Pestaña del AdminBox ──
  const [vistaAdmin, setVistaAdmin] = useState('recibidas');  // 'recibidas' | 'enviar'

  const [lightboxImg, setLightboxImg] = useState(null);

  // Sugerencia a resaltar al venir de una notificación (UserPanel → tap)
  const location = useLocation();
  const destacada = location.state?.sugerenciaDestacada || null;
  const destacadaRef = useRef(null);

  const isDev = user?.rol === 'Developer';
  const isAdmin = user?.rol === 'AdminBox';
  const esGestor = isDev || isAdmin;

  const authHeaders = () => ({ 'Authorization': `Bearer ${localStorage.getItem('token')}` });

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem('usuario'));
    const b = JSON.parse(localStorage.getItem('box'));
    if (!u) { navigate('/login'); return; }
    setUser(u);
    setBox(b);
    if (u.rol === 'Developer') {
      cargarSugerencias();
    } else if (u.rol === 'AdminBox') {
      cargarSugerencias();
      cargarHistorial(u.id);
    } else {
      cargarHistorial(u.id);
    }
  }, [navigate]);

  // Resetear a la primera página al cambiar de filtro o pestaña
  useEffect(() => { setPagSug(1); }, [filtroTabSug, filtroCatSug, filtroRolSug]);

  // Al venir de una notificación, llevar a la página del historial donde está la sugerencia
  useEffect(() => {
    if (!destacada || !historial.length) return;
    const idx = historial.findIndex(h => h.idSugerencia === destacada);
    if (idx >= 0) setPagHist(Math.floor(idx / PAGE_SIZE) + 1);
  }, [destacada, historial]);

  // Scroll suave a la tarjeta resaltada una vez renderizada
  useEffect(() => {
    if (destacada && destacadaRef.current) {
      const t = setTimeout(() => destacadaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 150);
      return () => clearTimeout(t);
    }
  }, [destacada, pagHist, historial]);

  function abrirCloudinary() {
    if (!window.cloudinary) {
      alert('El widget de Cloudinary no ha cargado. Revisa tu conexión a internet.');
      return;
    }
    const widget = window.cloudinary.createUploadWidget(
      {
        cloudName: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME,
        uploadPreset: import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET,
        sources: ['local', 'camera'],
        multiple: false,
        maxFileSize: 5000000,
        resourceType: 'image',
        clientAllowedFormats: ['png', 'jpg', 'jpeg', 'gif', 'webp'],
        cropping: false,
        folder: 'buzon_sugerencias',
        language: 'es',
        text: {
          'es': {
            'or': 'o',
            'menu': { 'files': 'Mis Archivos', 'camera': 'Cámara' },
            'local': { 'browse': 'Buscar archivo', 'dd_title_single': 'Arrastra tu imagen aquí' }
          }
        }
      },
      (error, result) => {
        if (!error && result && result.event === 'success') {
          setImagenUrl(result.info.secure_url);
        }
      }
    );
    widget.open();
  }

  async function cargarHistorial(idUsuario) {
    setLoadingHistorial(true);
    try {
      const res = await fetch(`${API_URL}/sugerencias/mis-sugerencias/${idUsuario}`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setHistorial(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error cargando historial:', err);
    } finally {
      setLoadingHistorial(false);
    }
  }

  async function cargarSugerencias() {
    setLoadingSug(true);
    try {
      const res = await fetch(`${API_URL}/sugerencias`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setSugerencias(data.sugerencias || []);
        setSugerenciasPendientes(data.pendientes || 0);
      }
    } catch (err) {
      console.error('Error cargando sugerencias:', err);
    } finally {
      setLoadingSug(false);
    }
  }

  // destFijo: si viene (ej. 'Dev' para el AdminBox), no se muestra el selector
  async function handleEnviar(destFijo) {
    const dest = destFijo || destinatario;
    if (!dest) return alert('Elige primero a quién quieres enviar tu mensaje.');
    if (dest === 'Admin' && !box?.idBox) return alert('No se encontró tu box para enviar la sugerencia al administrador.');
    if (!categoria) return alert('Selecciona una categoría primero.');
    if (!mensaje.trim()) return alert('Escribe un mensaje describiendo el problema o sugerencia.');
    if (mensaje.length > MAX_CHARS) return alert(`El mensaje no puede superar los ${MAX_CHARS} caracteres.`);

    try {
      const payload = {
        idBox: box?.idBox || null,
        idUsuario: user.id,
        nombre: user.nombre,
        correo: user.correo,
        mensaje: mensaje.trim(),
        rol: user.rol,
        destinatario: dest,
        categoria,
        imagenUrl: imagenUrl || null,
      };
      const res = await fetch(`${API_URL}/sugerencias`, {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.mensaje || '¡Sugerencia enviada con éxito!');
        setMensaje('');
        setCategoria('');
        setImagenUrl('');
        if (!destFijo) setDestinatario('');
        cargarHistorial(user.id);
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.mensaje || 'Error al enviar la sugerencia.');
      }
    } catch (err) {
      alert('Error de conexión con el servidor.');
    }
  }

  function abrirRespuesta(id, target) {
    setRespuestaDevId(id);
    setRespuestaDevText('');
    setRespuestaDevTarget(target);
  }

  function cancelarRespuesta() {
    setRespuestaDevId(null);
    setRespuestaDevText('');
    setRespuestaDevTarget(null);
  }

  async function cambiarEstatusSugerencia(id, nuevoEstatus, respuesta) {
    try {
      const res = await fetch(`${API_URL}/sugerencias/${id}/estatus`, {
        method: 'PUT',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ estatus: nuevoEstatus, respuestaDev: respuesta || null })
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        alert(e.mensaje || 'No se pudo actualizar la sugerencia.');
        return;
      }
      cancelarRespuesta();
      cargarSugerencias();
    } catch (err) {
      console.error(err);
      alert('Error de conexión al actualizar la sugerencia.');
    }
  }

  const sugerenciasFiltradas = sugerencias.filter(s => {
    const matchTab = s.estatus === filtroTabSug;
    const matchCat = !filtroCatSug || s.categoria === filtroCatSug;
    const matchRol = !filtroRolSug || s.rol === filtroRolSug;
    return matchTab && matchCat && matchRol;
  });

  const categoriasUnicas = [...new Set(sugerencias.map(s => s.categoria))];
  const totalPagSug = Math.max(1, Math.ceil(sugerenciasFiltradas.length / PAGE_SIZE));
  const sugPagina = sugerenciasFiltradas.slice((pagSug - 1) * PAGE_SIZE, pagSug * PAGE_SIZE);

  const totalPagHist = Math.max(1, Math.ceil(historial.length / PAGE_SIZE));
  const histPagina = historial.slice((pagHist - 1) * PAGE_SIZE, pagHist * PAGE_SIZE);

  const rutaRegreso = isDev
    ? '/dashboard'
    : isAdmin || user?.rol === 'Coach'
      ? '/admin-box-panel'
      : '/user-panel';

  const charCount = mensaje.length;
  const charClass = charCount > MAX_CHARS ? 'danger' : charCount > MAX_CHARS * 0.85 ? 'warn' : '';

  // ── Paginación reutilizable (estilo Ejercicios) ──
  const renderPaginacion = (pagina, total, setPagina) => {
    if (total <= 1) return null;
    return (
      <div className="buzon-pag">
        <button
          className="buzon-pag-arrow"
          disabled={pagina === 1}
          onClick={() => setPagina(p => Math.max(1, p - 1))}
          aria-label="Anterior"
        >
          <i className="fas fa-chevron-left"></i>
        </button>
        {buildPaginas(pagina, total).map((n, i) =>
          n === '...' ? (
            <span key={`e${i}`} className="buzon-pag-ellipsis">…</span>
          ) : (
            <button
              key={n}
              className={`buzon-pag-num ${n === pagina ? 'active' : ''}`}
              onClick={() => setPagina(n)}
            >
              {n}
            </button>
          )
        )}
        <button
          className="buzon-pag-arrow"
          disabled={pagina === total}
          onClick={() => setPagina(p => Math.min(total, p + 1))}
          aria-label="Siguiente"
        >
          <i className="fas fa-chevron-right"></i>
        </button>
      </div>
    );
  };

  // ── Timeline de estados (creado + cada cambio con fecha/hora y nota) ──
  const renderTimeline = (s) => {
    const pasos = [
      { estatus: 'Creado', fecha: s.fechaCreacion, icon: 'fa-paper-plane', color: 'var(--text-muted)' },
      ...((s.historial || []).map(h => ({
        estatus: h.estatus,
        fecha: h.fecha,
        nota: h.nota,
        icon: ESTATUS_CONFIG[h.estatus]?.icon || 'fa-circle',
        color: ESTATUS_CONFIG[h.estatus]?.color || 'var(--text-muted)',
      }))),
    ];
    return (
      <div className="buzon-timeline">
        {pasos.map((p, i) => (
          <div key={i} className="buzon-timeline-step">
            <span className="buzon-timeline-dot" style={{ color: p.color, borderColor: p.color }}>
              <i className={`fas ${p.icon}`}></i>
            </span>
            <div className="buzon-timeline-body">
              <span className="buzon-timeline-estado" style={{ color: p.color }}>{p.estatus}</span>
              <span className="buzon-timeline-fecha">{fmtFechaHora(p.fecha)}</span>
              {p.nota && (
                <span className="buzon-timeline-nota"><i className="fas fa-reply me-1"></i>{p.nota}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // ── Formulario de envío ──
  const renderFormulario = (destFijo) => {
    const dest = destFijo || destinatario;
    const cats = dest === 'Admin' ? CATEGORIAS_ADMIN : CATEGORIAS_DEV;
    const esAdminDest = dest === 'Admin';

    return (
      <div className="buzon-form-panel">

        {destFijo ? (
          <div className="buzon-dest-note">
            <i className="fas fa-code"></i>
            Estás enviando una sugerencia al <strong>equipo de desarrollo</strong> de Atletify.
          </div>
        ) : (
          <>
            <p className="buzon-section-label">
              <i className="fas fa-paper-plane"></i>¿A quién quieres enviarlo?
            </p>
            <div className="buzon-dest-selector mb-4">
              <button
                type="button"
                className={`buzon-dest-card ${destinatario === 'Dev' ? 'active' : ''}`}
                onClick={() => { setDestinatario('Dev'); setCategoria(''); }}
              >
                <i className="fas fa-code"></i>
                <span className="buzon-dest-card-title">Equipo de desarrollo</span>
                <span className="buzon-dest-card-desc">Bugs, errores o ideas para la app</span>
              </button>
              <button
                type="button"
                className={`buzon-dest-card ${destinatario === 'Admin' ? 'active' : ''}`}
                disabled={!box?.idBox}
                onClick={() => { setDestinatario('Admin'); setCategoria(''); }}
              >
                <i className="fas fa-user-shield"></i>
                <span className="buzon-dest-card-title">Administrador del box</span>
                <span className="buzon-dest-card-desc">
                  {box?.idBox ? `Instalaciones, horarios o trato en ${box?.nombre || 'tu box'}` : 'No disponible (sin box asignado)'}
                </span>
              </button>
            </div>
          </>
        )}

        {dest ? (
          <>
            <p className="buzon-section-label">
              <i className="fas fa-tag"></i>¿Qué tipo de {esAdminDest ? 'sugerencia' : 'reporte'} es?
            </p>
            <div className="buzon-cat-grid mb-4">
              {cats.map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  className={`buzon-cat-btn ${categoria === cat.id ? 'active' : ''}`}
                  onClick={() => setCategoria(cat.id)}
                >
                  <i className={`fas ${cat.icon} cat-icon`}></i>
                  {cat.label}
                </button>
              ))}
            </div>

            <p className="buzon-section-label">
              <i className="fas fa-comment-alt"></i>Describe {esAdminDest ? 'tu sugerencia' : 'el problema o sugerencia'}
            </p>
            <textarea
              className="buzon-textarea"
              placeholder={esAdminDest
                ? 'Ej: Sería bueno agregar una clase de movilidad los sábados por la mañana...'
                : 'Ej: Cuando intento abrir el pase de lista, la página se queda en blanco...'}
              value={mensaje}
              onChange={e => setMensaje(e.target.value)}
              maxLength={MAX_CHARS + 50}
            />
            <p className={`buzon-char-count ${charClass}`}>
              {charCount} / {MAX_CHARS}
            </p>

            <p className="buzon-section-label mt-3">
              <i className="fas fa-camera"></i>Adjuntar captura de pantalla (opcional)
            </p>
            {imagenUrl ? (
              <div className="buzon-img-preview">
                <img src={imagenUrl} alt="Preview" onClick={() => setLightboxImg(imagenUrl)} />
                <button
                  type="button"
                  className="buzon-img-remove"
                  onClick={() => setImagenUrl('')}
                  title="Quitar imagen"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
            ) : (
              <button type="button" className="buzon-upload-btn" onClick={abrirCloudinary}>
                <i className="fas fa-cloud-upload-alt"></i>
                <span>Subir imagen</span>
                <small>PNG, JPG, WEBP — Máx 5MB</small>
              </button>
            )}

            <BotonSeguro
              className="buzon-btn-enviar mt-3"
              onClick={() => handleEnviar(destFijo)}
              disabled={!categoria || !mensaje.trim()}
              textoProcesando={<><i className="fas fa-spinner fa-spin"></i>Enviando...</>}
            >
              <i className="fas fa-paper-plane"></i>
              Enviar {esAdminDest ? 'al administrador' : 'al equipo'}
            </BotonSeguro>

            <div className="buzon-remitente mt-3">
              <i className="fas fa-user-shield"></i>
              Se enviará como <strong>{user?.nombre}</strong> ({user?.rol})
              {box && <> — <strong>{box.nombre}</strong></>}
            </div>
          </>
        ) : (
          <div className="buzon-dest-hint">
            <i className="fas fa-hand-pointer"></i>
            Elige primero a quién va dirigido tu mensaje para ver las opciones.
          </div>
        )}
      </div>
    );
  };

  // ── Historial propio (atleta/coach/admin) ──
  const renderHistorial = () => (
    <>
      <p className="buzon-section-label">
        <i className="fas fa-history"></i>Mis Reportes Enviados
      </p>

      {loadingHistorial ? (
        <div className="d-flex justify-content-center py-5">
          <AtletifyLoader />
        </div>
      ) : historial.length === 0 ? (
        <div className="buzon-empty">
          <i className="fas fa-inbox"></i>
          <h3>Sin reportes</h3>
          <p>Aquí aparecerán los reportes que envíes</p>
        </div>
      ) : (
        <>
          <div className="d-flex flex-column gap-2">
            {histPagina.map(s => {
              const ci = catInfo(s.categoria);
              const estatusCfg = ESTATUS_CONFIG[s.estatus] || ESTATUS_CONFIG['Pendiente'];
              const destLabel = s.destinatario === 'Admin' ? 'Administrador' : 'Desarrollo';
              return (
                <div
                  key={s.idSugerencia}
                  ref={s.idSugerencia === destacada ? destacadaRef : null}
                  className={`buzon-historial-card ${s.idSugerencia === destacada ? 'destacada' : ''}`}
                >
                  <p className="buzon-historial-msg">{s.mensaje}</p>

                  {s.imagenUrl && (
                    <div className="buzon-historial-img" onClick={() => setLightboxImg(s.imagenUrl)}>
                      <img src={s.imagenUrl} alt="Adjunto" />
                    </div>
                  )}

                  {renderTimeline(s)}

                  {s.respuestaDev && !(s.historial && s.historial.length > 0) && (
                    <div className="buzon-historial-respuesta">
                      <i className="fas fa-reply"></i>
                      <span><strong>Respuesta:</strong> {s.respuestaDev}</span>
                    </div>
                  )}

                  <div className="buzon-historial-meta">
                    <span className={`buzon-badge-dest dest-${s.destinatario === 'Admin' ? 'admin' : 'dev'}`}>
                      <i className={`fas ${s.destinatario === 'Admin' ? 'fa-user-shield' : 'fa-code'} me-1`}></i>
                      {destLabel}
                    </span>
                    <span className="buzon-badge-cat"><i className={`fas ${ci.icon} me-1`}></i>{ci.label}</span>
                    <span
                      className="buzon-badge-estatus"
                      style={{
                        background: `${estatusCfg.color}18`,
                        color: estatusCfg.color,
                        border: `1px solid ${estatusCfg.color}44`
                      }}
                    >
                      <i className={`fas ${estatusCfg.icon} me-1`}></i>
                      {estatusCfg.label}
                    </span>
                    <span className="buzon-historial-fecha">
                      {new Date(s.fechaCreacion).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          {renderPaginacion(pagHist, totalPagHist, setPagHist)}
        </>
      )}
    </>
  );

  // ── Panel de gestión (Dev: "Dev" global / AdminBox: "Admin" de su box) ──
  const renderGestion = () => (
    <div className="buzon-dev-panel">

      <div className="buzon-dev-header">
        <h3 className="buzon-dev-title">
          <i className="fas fa-inbox"></i>
          {isAdmin ? 'Sugerencias del Box' : 'Reportes Recibidos'}
        </h3>
        <div className="buzon-dev-filters">
          <button type="button" className="buzon-filtro-btn" onClick={() => setModalFiltro('categoria')}>
            <i className="fas fa-tag buzon-filtro-icon"></i>
            <span className={`buzon-filtro-text ${filtroCatSug ? 'activo' : ''}`}>
              {filtroCatSug || 'Todas las categorías'}
            </span>
            <i className="fas fa-chevron-down buzon-filtro-arrow"></i>
          </button>
          <button type="button" className="buzon-filtro-btn" onClick={() => setModalFiltro('rol')}>
            <i className="fas fa-user-tag buzon-filtro-icon"></i>
            <span className={`buzon-filtro-text ${filtroRolSug ? 'activo' : ''}`}>
              {filtroRolSug || 'Todos los roles'}
            </span>
            <i className="fas fa-chevron-down buzon-filtro-arrow"></i>
          </button>
        </div>
      </div>

      {/* Tabs por estatus */}
      <div className="buzon-dev-tabs">
        {TABS_GESTION.map(tab => {
          const cfg = ESTATUS_CONFIG[tab];
          const count = sugerencias.filter(s => s.estatus === tab).length;
          return (
            <button
              key={tab}
              className={`buzon-dev-tab ${filtroTabSug === tab ? 'active' : ''}`}
              onClick={() => setFiltroTabSug(tab)}
              style={filtroTabSug === tab ? { color: cfg.color, borderBottomColor: cfg.color } : {}}
            >
              <i className={`fas ${cfg.icon} me-1`}></i>
              {cfg.label}
              <span className="buzon-dev-tab-count">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Lista */}
      <div className="buzon-dev-body">
        {loadingSug ? (
          <div className="d-flex justify-content-center py-5">
            <AtletifyLoader />
          </div>
        ) : sugerenciasFiltradas.length === 0 ? (
          <div className="buzon-empty">
            <i className="fas fa-inbox"></i>
            <h3>Sin sugerencias {ESTATUS_CONFIG[filtroTabSug]?.label.toLowerCase()}</h3>
            <p>No hay reportes que coincidan con los filtros</p>
          </div>
        ) : (
          <>
            {sugPagina.map(s => {
              const ci = catInfo(s.categoria);
              const isExpandedResp = respuestaDevId === s.idSugerencia;
              return (
                <div key={s.idSugerencia} className="buzon-dev-item">
                  <div className={`buzon-dev-prio prio-${s.prioridad}`}></div>
                  <div className="buzon-dev-content">
                    <div className="buzon-dev-sender">
                      <span>{s.nombreUsuario || 'Anónimo'}</span>
                      <span className={`buzon-badge-rol ${s.rol?.toLowerCase()}`}>{s.rol}</span>
                      <span className="buzon-badge-cat"><i className={`fas ${ci.icon} me-1`}></i>{ci.label}</span>
                      {isDev && s.nombreBox && (
                        <span className="buzon-dev-boxname">
                          <i className="fas fa-dumbbell me-1"></i>{s.nombreBox}
                        </span>
                      )}
                    </div>
                    <p className="buzon-dev-msg-text">{s.mensaje}</p>

                    {s.imagenUrl && (
                      <div className="buzon-dev-img-thumb" onClick={() => setLightboxImg(s.imagenUrl)}>
                        <img src={s.imagenUrl} alt="Adjunto" />
                        <span className="buzon-dev-img-label"><i className="fas fa-search-plus me-1"></i>Ver imagen</span>
                      </div>
                    )}

                    {renderTimeline(s)}

                    {s.respuestaDev && !(s.historial && s.historial.length > 0) && (
                      <div className="buzon-dev-respuesta-display">
                        <i className="fas fa-reply"></i>
                        <span>{s.respuestaDev}</span>
                      </div>
                    )}

                    {isExpandedResp ? (
                      <div className="buzon-confirm">
                        <label className="buzon-confirm-label">
                          Vas a marcarla como <strong>{respuestaDevTarget}</strong> · nota para {s.rol === 'Atleta' ? 'el atleta' : 'el remitente'} (opcional)
                        </label>
                        <input
                          type="text"
                          className="buzon-confirm-input"
                          placeholder="Escribe una nota/respuesta..."
                          value={respuestaDevText}
                          onChange={e => setRespuestaDevText(e.target.value)}
                          maxLength={300}
                          autoFocus
                        />
                        <div className="buzon-confirm-btns">
                          <BotonSeguro
                            className={`buzon-confirm-ok ok-${(respuestaDevTarget || '').toLowerCase().replace(/\s+/g, '-')}`}
                            tiempoBloqueo={600}
                            textoProcesando={<><i className="fas fa-spinner fa-spin"></i> Guardando...</>}
                            onClick={() => cambiarEstatusSugerencia(s.idSugerencia, respuestaDevTarget, respuestaDevText)}
                          >
                            <i className="fas fa-check"></i> Confirmar: {respuestaDevTarget}
                          </BotonSeguro>
                          <button className="buzon-confirm-cancel" onClick={cancelarRespuesta}>
                            <i className="fas fa-times"></i> Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="buzon-action-row">
                        {(ACCIONES_POR_ESTADO[s.estatus] || []).map(a => (
                          <button
                            key={a.target}
                            className={`buzon-action-btn ${a.cls}`}
                            onClick={() => abrirRespuesta(s.idSugerencia, a.target)}
                          >
                            <i className={`fas ${a.icon}`}></i> {a.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {renderPaginacion(pagSug, totalPagSug, setPagSug)}
          </>
        )}
      </div>
    </div>
  );

  if (!user) {
    return (
      <div className="buzon-page d-flex align-items-center justify-content-center" style={{ minHeight: '60vh' }}>
        <AtletifyLoader />
      </div>
    );
  }

  return (
    <div className="buzon-page">

      {/* ── HEADER ── */}
      <header className="buzon-header">
        <div className="d-flex align-items-center gap-3">
          <BackButton to={rutaRegreso} />
          <div>
            <h1 className="buzon-header-title">
              Buzón de <span>Sugerencias</span>
              {esGestor && sugerenciasPendientes > 0 && (
                <span className="buzon-dev-count ms-2">{sugerenciasPendientes}</span>
              )}
            </h1>
            <p className="buzon-header-sub">
              {isDev
                ? 'Gestiona los reportes enviados al equipo de desarrollo'
                : isAdmin
                  ? 'Recibe sugerencias de tu box y envía reportes al equipo de desarrollo'
                  : 'Reporta bugs al equipo o envía sugerencias al administrador de tu box'}
            </p>
          </div>
        </div>
      </header>

      <div className="container-xl px-3 px-md-4">

        {/* ══ DEVELOPER ══ */}
        {isDev ? (
          renderGestion()

        ) : isAdmin ? (
          /* ══ ADMINBOX: pestañas Recibidas / Enviar al Dev ══ */
          <>
            <div className="buzon-admin-tabs">
              <button
                className={`buzon-admin-tab ${vistaAdmin === 'recibidas' ? 'active' : ''}`}
                onClick={() => setVistaAdmin('recibidas')}
              >
                <i className="fas fa-inbox"></i>
                <span>Recibidas</span>
                {sugerenciasPendientes > 0 && <span className="buzon-admin-tab-badge">{sugerenciasPendientes}</span>}
              </button>
              <button
                className={`buzon-admin-tab ${vistaAdmin === 'enviar' ? 'active' : ''}`}
                onClick={() => setVistaAdmin('enviar')}
              >
                <i className="fas fa-paper-plane"></i>
                <span>Enviar al Dev</span>
              </button>
            </div>

            {vistaAdmin === 'recibidas' ? (
              renderGestion()
            ) : (
              <div className="row g-4">
                <div className="col-12 col-lg-7">{renderFormulario('Dev')}</div>
                <div className="col-12 col-lg-5">{renderHistorial()}</div>
              </div>
            )}
          </>

        ) : (
          /* ══ ATLETA / COACH ══ */
          <div className="row g-4">
            <div className="col-12 col-lg-7">{renderFormulario(null)}</div>
            <div className="col-12 col-lg-5">{renderHistorial()}</div>
          </div>
        )}

      </div>

      {/* ── MODALES DE FILTRO (reemplazan los <select> nativos) ── */}
      {modalFiltro === 'categoria' && (
        <ModalSelectorBuzon
          titulo="Filtrar por categoría"
          conBusqueda
          placeholderBusqueda="Buscar categoría..."
          valor={filtroCatSug}
          opciones={[
            { value: '', label: 'Todas las categorías' },
            ...categoriasUnicas.map(c => ({ value: c, label: c })),
          ]}
          onSeleccionar={(v) => { setFiltroCatSug(v); setModalFiltro(null); }}
          onCerrar={() => setModalFiltro(null)}
        />
      )}
      {modalFiltro === 'rol' && (
        <ModalSelectorBuzon
          titulo="Filtrar por rol"
          valor={filtroRolSug}
          opciones={[
            { value: '', label: 'Todos los roles' },
            ...(!isAdmin ? [{ value: 'AdminBox', label: 'AdminBox' }] : []),
            { value: 'Coach', label: 'Coach' },
            { value: 'Atleta', label: 'Atleta' },
          ]}
          onSeleccionar={(v) => { setFiltroRolSug(v); setModalFiltro(null); }}
          onCerrar={() => setModalFiltro(null)}
        />
      )}

      {/* ── LIGHTBOX ── */}
      {lightboxImg && (
        <div className="buzon-lightbox" onClick={() => setLightboxImg(null)}>
          <div className="buzon-lightbox-content" onClick={e => e.stopPropagation()}>
            <button className="buzon-lightbox-close" onClick={() => setLightboxImg(null)}>
              <i className="fas fa-times"></i>
            </button>
            <img src={lightboxImg} alt="Imagen adjunta" />
          </div>
        </div>
      )}
    </div>
  );
}
