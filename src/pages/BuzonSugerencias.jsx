import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AtletifyLoader from '../components/AtletifyLoader';
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

const ESTATUS_CONFIG = {
  'Pendiente': { icon: 'fa-clock', color: '#f39c12', label: 'Pendiente' },
  'En Proceso': { icon: 'fa-wrench', color: '#3498db', label: 'En Proceso' },
  'Solucionado': { icon: 'fa-check-circle', color: '#2ecc71', label: 'Solucionado' },
  'No Procede': { icon: 'fa-ban', color: '#e74c3c', label: 'No Procede' },
};

const API_URL = import.meta.env.VITE_API_URL;
const MAX_CHARS = 1000;

export default function BuzonSugerencias() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [box, setBox] = useState(null);

  const [categoria, setCategoria] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [imagenUrl, setImagenUrl] = useState('');
  const [enviando, setEnviando] = useState(false);

  const [historial, setHistorial] = useState([]);
  const [loadingHistorial, setLoadingHistorial] = useState(true);

  const [sugerencias, setSugerencias] = useState([]);
  const [sugerenciasPendientes, setSugerenciasPendientes] = useState(0);
  const [filtroTabSug, setFiltroTabSug] = useState('Pendiente');
  const [filtroCatSug, setFiltroCatSug] = useState('');
  const [filtroRolSug, setFiltroRolSug] = useState('');
  const [loadingSug, setLoadingSug] = useState(true);

  const [respuestaDevId, setRespuestaDevId] = useState(null);
  const [respuestaDevText, setRespuestaDevText] = useState('');

  const [lightboxImg, setLightboxImg] = useState(null);

  const isDev = user?.rol === 'Developer';

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem('usuario'));
    const b = JSON.parse(localStorage.getItem('box'));
    if (!u) { navigate('/login'); return; }
    setUser(u);
    setBox(b);
    if (u.rol === 'Developer') cargarSugerencias();
    else cargarHistorial(u.id);
  }, [navigate]);

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
        categoria,
        imagenUrl: imagenUrl || null,
      };
      const res = await fetch(`${API_URL}/sugerencias`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        window.alert('¡Sugerencia enviada! El equipo de desarrollo la revisará pronto.');
        setMensaje('');
        setCategoria('');
        setImagenUrl('');
        cargarHistorial(user.id);
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

  async function cambiarEstatusSugerencia(id, nuevoEstatus, respuesta) {
    try {
      await fetch(`${API_URL}/sugerencias/${id}/estatus`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estatus: nuevoEstatus, respuestaDev: respuesta || null })
      });
      setRespuestaDevId(null);
      setRespuestaDevText('');
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

  const rutaRegreso = isDev
    ? '/dashboard'
    : user?.rol === 'AdminBox' || user?.rol === 'Coach'
      ? '/admin-box-panel'
      : '/user-panel';

  const charCount = mensaje.length;
  const charClass = charCount > MAX_CHARS ? 'danger' : charCount > MAX_CHARS * 0.85 ? 'warn' : '';

  const TABS_DEV = ['Pendiente', 'En Proceso', 'Solucionado', 'No Procede'];

  return (
    <div className="buzon-page">

      {/* ── HEADER ── */}
      <header className="buzon-header">
        <div className="d-flex align-items-center gap-3">
          <BackButton to={rutaRegreso} />
          <div>
            <h1 className="buzon-header-title">
              Buzón de <span>Sugerencias</span>
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

      <div className="container-xl px-3 px-md-4">

        {/* ══ VISTA DEVELOPER ══ */}
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
                  value={filtroCatSug}
                  onChange={e => setFiltroCatSug(e.target.value)}
                >
                  <option value="">Todas las categorías</option>
                  {categoriasUnicas.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select
                  className="buzon-dev-filter"
                  value={filtroRolSug}
                  onChange={e => setFiltroRolSug(e.target.value)}
                >
                  <option value="">Todos los roles</option>
                  <option value="AdminBox">AdminBox</option>
                  <option value="Coach">Coach</option>
                  <option value="Atleta">Atleta</option>
                </select>
              </div>
            </div>

            {/* Tabs */}
            <div className="buzon-dev-tabs">
              {TABS_DEV.map(tab => {
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
                sugerenciasFiltradas.map(s => {
                  const catInfo = CATEGORIAS.find(c => c.id === s.categoria) || { emoji: '📝', label: s.categoria };
                  const isExpandedResp = respuestaDevId === s.idSugerencia;
                  return (
                    <div key={s.idSugerencia} className="buzon-dev-item">
                      <div className={`buzon-dev-prio prio-${s.prioridad}`}></div>
                      <div className="buzon-dev-content">
                        <div className="buzon-dev-sender">
                          <span>{s.nombreUsuario || 'Anónimo'}</span>
                          <span className={`buzon-badge-rol ${s.rol?.toLowerCase()}`}>{s.rol}</span>
                          <span className="buzon-badge-cat">{catInfo.emoji} {catInfo.label}</span>
                          {s.nombreBox && (
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

                        {s.respuestaDev && (
                          <div className="buzon-dev-respuesta-display">
                            <i className="fas fa-reply"></i>
                            <span>{s.respuestaDev}</span>
                          </div>
                        )}

                        <span className="buzon-dev-fecha">
                          {new Date(s.fechaCreacion).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>

                        {isExpandedResp && (
                          <div className="buzon-dev-respuesta-input mt-2">
                            <input
                              type="text"
                              placeholder="Nota/respuesta para el usuario (opcional)..."
                              value={respuestaDevText}
                              onChange={e => setRespuestaDevText(e.target.value)}
                              maxLength={300}
                              autoFocus
                            />
                          </div>
                        )}
                      </div>

                      <div className="buzon-dev-actions-col">
                        {filtroTabSug === 'Pendiente' && (
                          <>
                            <button
                              className="buzon-dev-action-btn btn-proceso"
                              title="Marcar En Proceso"
                              onClick={() => {
                                if (isExpandedResp) cambiarEstatusSugerencia(s.idSugerencia, 'En Proceso', respuestaDevText);
                                else { setRespuestaDevId(s.idSugerencia); setRespuestaDevText(''); }
                              }}
                            >
                              <i className="fas fa-wrench"></i>
                            </button>
                            <button
                              className="buzon-dev-action-btn btn-noprocede"
                              title="No Procede"
                              onClick={() => {
                                if (isExpandedResp) cambiarEstatusSugerencia(s.idSugerencia, 'No Procede', respuestaDevText);
                                else { setRespuestaDevId(s.idSugerencia); setRespuestaDevText(''); }
                              }}
                            >
                              <i className="fas fa-ban"></i>
                            </button>
                          </>
                        )}
                        {filtroTabSug === 'En Proceso' && (
                          <button
                            className="buzon-dev-action-btn btn-solucionado"
                            title="Marcar como Solucionado"
                            onClick={() => {
                              if (isExpandedResp) cambiarEstatusSugerencia(s.idSugerencia, 'Solucionado', respuestaDevText);
                              else { setRespuestaDevId(s.idSugerencia); setRespuestaDevText(''); }
                            }}
                          >
                            <i className="fas fa-check-circle"></i>
                          </button>
                        )}
                        {isExpandedResp && (
                          <button
                            className="buzon-dev-action-btn"
                            title="Cancelar"
                            onClick={() => { setRespuestaDevId(null); setRespuestaDevText(''); }}
                          >
                            <i className="fas fa-times"></i>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        ) : (
          /* ══ VISTA USUARIOS ══ */
          <div className="row g-4">

            {/* FORMULARIO */}
            <div className="col-12 col-lg-7">
              <div className="buzon-form-panel">

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

                <button
                  className="buzon-btn-enviar mt-3"
                  onClick={handleEnviar}
                  disabled={enviando || !categoria || !mensaje.trim()}
                >
                  {enviando
                    ? <><i className="fas fa-spinner fa-spin"></i>Enviando...</>
                    : <><i className="fas fa-paper-plane"></i>Enviar Reporte</>
                  }
                </button>

                <div className="buzon-remitente mt-3">
                  <i className="fas fa-user-shield"></i>
                  Se enviará como <strong>{user?.nombre}</strong> ({user?.rol})
                  {box && <> — <strong>{box.nombre}</strong></>}
                </div>

              </div>
            </div>

            {/* HISTORIAL */}
            <div className="col-12 col-lg-5">
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
                <div className="d-flex flex-column gap-2">
                  {historial.map(s => {
                    const catInfo = CATEGORIAS.find(c => c.id === s.categoria) || { emoji: '📝', label: s.categoria };
                    const estatusCfg = ESTATUS_CONFIG[s.estatus] || ESTATUS_CONFIG['Pendiente'];
                    return (
                      <div key={s.idSugerencia} className="buzon-historial-card">
                        <p className="buzon-historial-msg">{s.mensaje}</p>

                        {s.imagenUrl && (
                          <div className="buzon-historial-img" onClick={() => setLightboxImg(s.imagenUrl)}>
                            <img src={s.imagenUrl} alt="Adjunto" />
                          </div>
                        )}

                        {s.respuestaDev && (
                          <div className="buzon-historial-respuesta">
                            <i className="fas fa-reply"></i>
                            <span><strong>Respuesta del equipo:</strong> {s.respuestaDev}</span>
                          </div>
                        )}

                        <div className="buzon-historial-meta">
                          <span className="buzon-badge-cat">{catInfo.emoji} {catInfo.label}</span>
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
              )}
            </div>

          </div>
        )}

      </div>

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
