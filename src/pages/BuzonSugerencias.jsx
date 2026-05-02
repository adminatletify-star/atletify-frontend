import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BackButton from '../components/BackButton';
import './PagesCSS/BuzonSugerencias.css';

const CATEGORIAS = [
  { id: 'Bug', emoji: '🐛', label: 'Bug / Error' },
  { id: 'Error de Carga', emoji: '⚠️', label: 'Error de Carga' },
  { id: 'Texto Mal Escrito', emoji: '✏️', label: 'Ortografía' },
  { id: 'Sugerencia', emoji: '💡', label: 'Sugerencia' },
  { id: 'Mejora UI', emoji: '🎨', label: 'Mejora Visual' },
  { id: 'Problema Móvil', emoji: '📱', label: 'Problema Móvil' },
  { id: 'Problema de Acceso', emoji: '🔒', label: 'Acceso / Permisos' },
  { id: 'Otro', emoji: '❓', label: 'Otro' },
];

const API_URL = import.meta.env.VITE_API_URL;
const MAX_CHARS = 1000;

export default function BuzonSugerencias() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [box, setBox] = useState(null);

  // Formulario (roles no-Dev)
  const [categoria, setCategoria] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [exito, setExito] = useState(false);

  // Historial personal (roles no-Dev)
  const [historial, setHistorial] = useState([]);
  const [loadingHistorial, setLoadingHistorial] = useState(true);

  // Panel Developer
  const [sugerencias, setSugerencias] = useState([]);
  const [sugerenciasPendientes, setSugerenciasPendientes] = useState(0);
  const [filtroTabSug, setFiltroTabSug] = useState('Pendiente');
  const [filtroCatSug, setFiltroCatSug] = useState('');
  const [filtroRolSug, setFiltroRolSug] = useState('');
  const [loadingSug, setLoadingSug] = useState(true);

  const isDev = user?.rol === 'Developer';

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem('usuario'));
    const b = JSON.parse(localStorage.getItem('box'));

    if (!u) {
      navigate('/login');
      return;
    }
    setUser(u);
    setBox(b);

    if (u.rol === 'Developer') {
      cargarSugerencias();
    } else {
      cargarHistorial(u.id);
    }
  }, [navigate]);

  // === LÓGICA DE USUARIOS (Atleta, Coach, AdminBox) ===
  async function cargarHistorial(idUsuario) {
    setLoadingHistorial(true);
    try {
      const res = await fetch(`${API_URL}/sugerencias/mis-sugerencias/${idUsuario}`);
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

  async function handleEnviar(e) {
    e.preventDefault();
    if (!categoria) return alert('Selecciona una categoría primero.');
    if (!mensaje.trim()) return alert('Escribe un mensaje describiendo el problema o sugerencia.');
    if (mensaje.length > MAX_CHARS) return alert(`El mensaje no puede superar los ${MAX_CHARS} caracteres.`);

    setEnviando(true);
    try {
      const payload = {
        idBox: box?.idBox || null,
        idUsuario: user.id,
        nombre: user.nombre,
        correo: user.correo,
        mensaje: mensaje.trim(),
        rol: user.rol,
        categoria: categoria,
      };

      const res = await fetch(`${API_URL}/sugerencias`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setExito(true);
        setMensaje('');
        setCategoria('');
        cargarHistorial(user.id);
        setTimeout(() => setExito(false), 4000);
      } else {
        const errData = await res.json();
        alert(errData.mensaje || 'Error al enviar la sugerencia.');
      }
    } catch (err) {
      alert('Error de conexión con el servidor.');
    } finally {
      setEnviando(false);
    }
  }

  // === LÓGICA DEL DEVELOPER ===
  async function cargarSugerencias() {
    setLoadingSug(true);
    try {
      const res = await fetch(`${API_URL}/sugerencias`);
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

  async function cambiarEstatusSugerencia(id, nuevoEstatus) {
    try {
      await fetch(`${API_URL}/sugerencias/${id}/estatus`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estatus: nuevoEstatus })
      });
      cargarSugerencias();
    } catch (err) { console.error(err); }
  }

  async function eliminarSugerencia(id) {
    if (!window.confirm('¿Eliminar esta sugerencia permanentemente?')) return;
    try {
      await fetch(`${API_URL}/sugerencias/${id}`, { method: 'DELETE' });
      cargarSugerencias();
    } catch (err) { console.error(err); }
  }

  const sugerenciasFiltradas = sugerencias.filter(s => {
    const matchTab = s.estatus === filtroTabSug;
    const matchCat = !filtroCatSug || s.categoria === filtroCatSug;
    const matchRol = !filtroRolSug || s.rol === filtroRolSug;
    return matchTab && matchCat && matchRol;
  });

  const categoriasUnicas = [...new Set(sugerencias.map(s => s.categoria))];
  const rolesUnicosSug = [...new Set(sugerencias.map(s => s.rol))];

  // Rutas de regreso
  const rutaRegreso = isDev
    ? '/dashboard'
    : user?.rol === 'AdminBox' || user?.rol === 'Coach'
      ? '/admin-box-panel'
      : '/user-panel';

  const charCount = mensaje.length;
  const charClass = charCount > MAX_CHARS ? 'danger' : charCount > MAX_CHARS * 0.85 ? 'warn' : '';

  return (
    <div className="buzon-page">
      <div className="container-xl px-3 px-md-4">

        {/* ── HEADER ── */}
        <header className="buzon-header">
          <div className="d-flex align-items-center gap-3">
            <BackButton to={rutaRegreso} />
            <div>
              <h1 className="buzon-header-title">
                <i className="fas fa-envelope-open-text me-2" style={{ color: '#dc3545' }}></i>
                Buzón de Sugerencias
                {isDev && sugerenciasPendientes > 0 && (
                  <span className="buzon-dev-count ms-2">{sugerenciasPendientes}</span>
                )}
              </h1>
              <p className="buzon-header-sub">
                {isDev
                  ? 'Gestiona los reportes y sugerencias de todos los usuarios'
                  : 'Reporta bugs, errores o envía ideas al equipo de desarrollo'
                }
              </p>
            </div>
          </div>
        </header>

        {/* ══════════════════════════════════════════════════
            VISTA DEVELOPER: Panel de lectura y gestión
        ══════════════════════════════════════════════════ */}
        {isDev ? (
          <div className="buzon-dev-panel">
            <div className="buzon-dev-header">
              <h3 className="buzon-dev-title">
                <i className="fas fa-inbox"></i>
                Reportes Recibidos
              </h3>
              <div className="buzon-dev-filters">
                <select
                  className="buzon-dev-filter"
                  style={{ appearance: 'auto', padding: '0.35rem 0.6rem' }}
                  value={filtroCatSug}
                  onChange={e => setFiltroCatSug(e.target.value)}
                >
                  <option value="">Todas las categorías</option>
                  {categoriasUnicas.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select
                  className="buzon-dev-filter"
                  style={{ appearance: 'auto', padding: '0.35rem 0.6rem' }}
                  value={filtroRolSug}
                  onChange={e => setFiltroRolSug(e.target.value)}
                >
                  <option value="">Todos los roles</option>
                  {rolesUnicosSug.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>

            {/* Tabs: Pendientes / Archivados */}
            <div className="buzon-dev-tabs">
              {['Pendiente', 'Archivado'].map(tab => (
                <button
                  key={tab}
                  className={`buzon-dev-tab ${filtroTabSug === tab ? 'active' : ''}`}
                  onClick={() => setFiltroTabSug(tab)}
                >
                  {tab === 'Pendiente' && <><i className="fas fa-clock me-1"></i>Pendientes</>}
                  {tab === 'Archivado' && <><i className="fas fa-archive me-1"></i>Archivados</>}
                  <span className="ms-1" style={{ opacity: 0.5 }}>({sugerencias.filter(s => s.estatus === tab).length})</span>
                </button>
              ))}
            </div>

            {/* Lista de sugerencias */}
            <div className="buzon-dev-body">
              {loadingSug ? (
                <div className="d-flex justify-content-center py-5">
                  <div className="spinner-border text-danger" role="status" style={{ width: '2rem', height: '2rem' }}></div>
                </div>
              ) : sugerenciasFiltradas.length === 0 ? (
                <div className="buzon-empty">
                  <i className="fas fa-inbox"></i>
                  <h3>Sin sugerencias {filtroTabSug.toLowerCase()}s</h3>
                  <p>No hay reportes que coincidan con los filtros</p>
                </div>
              ) : (
                sugerenciasFiltradas.map(s => {
                  const catInfo = CATEGORIAS.find(c => c.id === s.categoria) || { emoji: '📝', label: s.categoria };
                  return (
                    <div key={s.idSugerencia} className="buzon-dev-item">
                      <div className={`buzon-dev-prio prio-${s.prioridad}`}></div>
                      <div className="buzon-dev-content">
                        <div className="buzon-dev-sender">
                          <span>{s.nombreUsuario || 'Anónimo'}</span>
                          <span className={`buzon-badge-rol ${s.rol?.toLowerCase()}`}>{s.rol}</span>
                          <span className="buzon-badge-cat" style={{ fontSize: '0.62rem' }}>{catInfo.emoji} {catInfo.label}</span>
                          {s.nombreBox && (
                            <span style={{ color: '#555', fontSize: '0.68rem' }}>
                              <i className="fas fa-dumbbell me-1"></i>{s.nombreBox}
                            </span>
                          )}
                        </div>
                        <p className="buzon-dev-msg-text">{s.mensaje}</p>
                        <span style={{ fontSize: '0.68rem', color: '#444' }}>
                          {new Date(s.fechaCreacion).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="buzon-dev-actions">
                        {s.estatus === 'Pendiente' && (
                          <button
                            className="buzon-dev-action-btn btn-archive"
                            title="Archivar (Marcar como atendido)"
                            onClick={() => cambiarEstatusSugerencia(s.idSugerencia, 'Archivado')}
                          >
                            <i className="fas fa-check"></i>
                          </button>
                        )}
                        <button
                          className="buzon-dev-action-btn"
                          title="Eliminar"
                          onClick={() => eliminarSugerencia(s.idSugerencia)}
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        ) : (
          /* ══════════════════════════════════════════════════
              VISTA USUARIOS: Formulario de envío + historial
          ══════════════════════════════════════════════════ */
          <div className="row g-4">

            {/* COLUMNA IZQUIERDA: FORMULARIO */}
            <div className="col-12 col-lg-7">
              <div className="buzon-form-panel">

                {/* Éxito */}
                {exito && (
                  <div className="buzon-success-msg mb-3">
                    <i className="fas fa-check-circle"></i>
                    ¡Sugerencia enviada! El equipo de desarrollo la revisará pronto. 🐺
                  </div>
                )}

                {/* Paso 1: Categoría */}
                <p className="buzon-section-label">
                  <i className="fas fa-tag"></i>¿Qué tipo de reporte es?
                </p>
                <div className="buzon-cat-grid mb-4">
                  {CATEGORIAS.map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      className={`buzon-cat-btn ${categoria === cat.id ? 'active' : ''}`}
                      onClick={() => setCategoria(cat.id)}
                    >
                      <span className="cat-emoji">{cat.emoji}</span>
                      {cat.label}
                    </button>
                  ))}
                </div>

                {/* Paso 2: Mensaje */}
                <p className="buzon-section-label">
                  <i className="fas fa-comment-alt"></i>Describe el problema o sugerencia
                </p>
                <textarea
                  className="buzon-textarea"
                  placeholder="Ej: Cuando intento abrir el pase de lista, la página se queda en blanco..."
                  value={mensaje}
                  onChange={e => setMensaje(e.target.value)}
                  maxLength={MAX_CHARS + 50}
                />
                <p className={`buzon-char-count ${charClass}`}>
                  {charCount} / {MAX_CHARS}
                </p>

                {/* Paso 3: Enviar */}
                <button
                  className="buzon-btn-enviar mt-2"
                  onClick={handleEnviar}
                  disabled={enviando || !categoria || !mensaje.trim()}
                >
                  {enviando ? (
                    <><i className="fas fa-spinner fa-spin"></i>Enviando...</>
                  ) : (
                    <><i className="fas fa-paper-plane"></i>Enviar Reporte</>
                  )}
                </button>

                {/* Info del remitente */}
                <div className="mt-3" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#555', fontSize: '0.72rem' }}>
                  <i className="fas fa-user-shield"></i>
                  Se enviará como <strong style={{ color: '#888' }}>{user?.nombre}</strong> ({user?.rol})
                  {box && <> — <strong style={{ color: '#888' }}>{box.nombre}</strong></>}
                </div>

              </div>
            </div>

            {/* COLUMNA DERECHA: HISTORIAL */}
            <div className="col-12 col-lg-5">

              <p className="buzon-section-label">
                <i className="fas fa-history"></i>Mis Reportes Enviados
              </p>

              {loadingHistorial ? (
                <div className="d-flex justify-content-center py-5">
                  <div className="spinner-border text-danger" role="status" style={{ width: '2rem', height: '2rem' }}></div>
                </div>
              ) : historial.length === 0 ? (
                <div className="buzon-empty">
                  <i className="fas fa-inbox"></i>
                  <h3>Sin reportes</h3>
                  <p>Aquí aparecerán los reportes que envíes</p>
                </div>
              ) : (
                <div className="d-flex flex-column gap-2">
                  {historial.map(s => {
                    const catInfo = CATEGORIAS.find(c => c.id === s.categoria) || { emoji: '📝', label: s.categoria };
                    return (
                      <div key={s.idSugerencia} className="buzon-historial-card">
                        <p className="buzon-historial-msg">{s.mensaje}</p>
                        <div className="buzon-historial-meta">
                          <span className="buzon-badge-cat">
                            {catInfo.emoji} {catInfo.label}
                          </span>
                          <span className={`buzon-badge-estatus ${s.estatus?.toLowerCase()}`}>
                            {s.estatus === 'Pendiente' && <i className="fas fa-clock me-1"></i>}
                            {s.estatus === 'Leido' && <i className="fas fa-check me-1"></i>}
                            {s.estatus === 'Archivado' && <i className="fas fa-archive me-1"></i>}
                            {s.estatus}
                          </span>
                          <span className="buzon-historial-fecha">
                            {new Date(s.fechaCreacion).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

            </div>

          </div>
        )}

      </div>
    </div>
  );
}
