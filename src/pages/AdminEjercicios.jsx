import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import BackButton from '../components/BackButton';
import CategoriaEjercicioPicker from '../components/CategoriaEjercicioPicker';
import EquipamientoPicker from '../components/EquipamientoPicker';
import FiltroEjerciciosPicker from '../components/FiltroEjerciciosPicker';
import MetricaMedidaPicker from '../components/MetricaMedidaPicker';
import NivelRecomendadoPicker from '../components/NivelRecomendadoPicker';
import { api } from '../services/api';
import BotonSeguro from '../components/BotonSeguro';
import '../assets/css/AdminEjercicios.css';

const CATEGORIAS = ['Piernas', 'Full Body', 'Fuerza', 'Olímpico', 'Gimnástico', 'Cardio', 'Core'];

const handleVideoClick = (e) => {
  if (!document.fullscreenElement) {
    e.preventDefault();
    e.currentTarget.requestFullscreen();
  }
};

// Color fijo por categoría — se asigna automáticamente
const CAT_COLOR = {
  'Piernas':    '#4FC3F7',
  'Full Body':  '#E63946',
  'Fuerza':     '#F5A623',
  'Olímpico':   '#2ECC71',
  'Gimnástico': '#4FC3F7',
  'Cardio':     '#2ECC71',
  'Core':       '#F5A623',
};

// Ícono por defecto cuando no hay coincidencia por nombre
const CAT_DEFAULT_ICON = {
  'Piernas':    'fas fa-child',
  'Full Body':  'fas fa-fire',
  'Fuerza':     'fas fa-weight-hanging',
  'Olímpico':   'fas fa-bolt',
  'Gimnástico': 'fas fa-hands-helping',
  'Cardio':     'fas fa-running',
  'Core':       'fas fa-sync-alt',
};

// Reglas de palabras clave → ícono (orden: más específico primero)
const ICON_RULES = [
  { k: ['squat clean','clean squat'],            icon: 'fas fa-bolt' },
  { k: ['squat snatch','snatch squat'],           icon: 'fas fa-star' },
  { k: ['clean & jerk','clean jerk'],             icon: 'fas fa-trophy' },
  { k: ['muscle-up','muscle up','muscleup'],      icon: 'fas fa-crown' },
  { k: ['pull-up','pull up','pullup','chIn-up'],  icon: 'fas fa-hands-helping' },
  { k: ['push-up','push up','pushup'],            icon: 'fas fa-hand-rock' },
  { k: ['handstand','hspu','pino'],               icon: 'fas fa-arrows-alt-v' },
  { k: ['toes-to-bar','t2b','ttb','toes to bar'], icon: 'fas fa-shoe-prints' },
  { k: ['knees-to-elbow','k2e','kte'],            icon: 'fas fa-shoe-prints' },
  { k: ['deadlift'],                              icon: 'fas fa-weight-hanging' },
  { k: ['snatch'],                               icon: 'fas fa-star' },
  { k: ['clean'],                                icon: 'fas fa-bolt' },
  { k: ['jerk'],                                 icon: 'fas fa-arrow-up' },
  { k: ['thruster'],                             icon: 'fas fa-fire' },
  { k: ['pistol'],                               icon: 'fas fa-child' },
  { k: ['squat'],                                icon: 'fas fa-child' },
  { k: ['burpee'],                               icon: 'fas fa-fire-alt' },
  { k: ['box jump','box step','step-up','step up'], icon: 'fas fa-arrow-up' },
  { k: ['wall ball'],                            icon: 'fas fa-basketball-ball' },
  { k: ['rope climb','legless rope'],            icon: 'fas fa-grip-lines-vertical' },
  { k: ['double under','single under'],          icon: 'fas fa-redo' },
  { k: ['kettlebell','kb swing','kb clean'],     icon: 'fas fa-dumbbell' },
  { k: ['dumbbell','mancuerna'],                 icon: 'fas fa-dumbbell' },
  { k: ['press'],                                icon: 'fas fa-arrow-up' },
  { k: ['lunge'],                                icon: 'fas fa-walking' },
  { k: ['run','running','sprint','correr'],      icon: 'fas fa-running' },
  { k: ['rowing','remo'],                        icon: 'fas fa-water' },
  { k: ['bike','biking','assault bike'],         icon: 'fas fa-biking' },
  { k: ['skierg','ski erg','ski'],               icon: 'fas fa-skiing' },
  { k: ['ring dip','ring row'],                  icon: 'fas fa-ring' },
  { k: ['sit-up','situp','sit up','v-up','ghd'], icon: 'fas fa-sync-alt' },
  { k: ['plank'],                                icon: 'fas fa-minus' },
  { k: ['l-sit','l sit'],                        icon: 'fas fa-chair' },
  { k: ['farmer'],                               icon: 'fas fa-weight-hanging' },
  { k: ['sled'],                                 icon: 'fas fa-truck-loading' },
  { k: ['tire'],                                 icon: 'fas fa-circle-notch' },
  { k: ['bear crawl'],                           icon: 'fas fa-walking' },
  { k: ['turkish'],                              icon: 'fas fa-dumbbell' },
  { k: ['wall walk','wall facing'],              icon: 'fas fa-arrows-alt-v' },
  { k: ['hollow rock','hollow'],                 icon: 'fas fa-sync-alt' },
  { k: ['russian twist'],                        icon: 'fas fa-sync-alt' },
  { k: ['hip thrust'],                           icon: 'fas fa-bed' },
];

function sugerirIcono(nombre, categoria) {
  const n = nombre.toLowerCase();
  for (const regla of ICON_RULES) {
    if (regla.k.some(kw => n.includes(kw))) return regla.icon;
  }
  return CAT_DEFAULT_ICON[categoria] || 'fas fa-dumbbell';
}

const CAT_BADGE_STYLE = {
  'Piernas':    { bg: 'rgba(79,195,247,0.12)',  color: '#4FC3F7' },
  'Full Body':  { bg: 'rgba(230,57,70,0.12)',   color: '#E63946' },
  'Fuerza':     { bg: 'rgba(245,166,35,0.12)',  color: '#F5A623' },
  'Olímpico':   { bg: 'rgba(46,204,113,0.12)',  color: '#2ECC71' },
  'Gimnástico': { bg: 'rgba(79,195,247,0.12)',  color: '#4FC3F7' },
  'Cardio':     { bg: 'rgba(46,204,113,0.12)',  color: '#2ECC71' },
  'Core':       { bg: 'rgba(245,166,35,0.12)',  color: '#F5A623' },
};

const FORM_INIT = {
  id: 0,
  nombre: '',
  subnombre: '',
  categoria: 'Full Body',
  icono: CAT_DEFAULT_ICON['Full Body'],
  color: CAT_COLOR['Full Body'],
  equipamiento: 'Libre',
  metricaPrincipal: 'Repeticiones',
  esLevantamientoOlimpico: false,
  categoriaRecomendada: 'Todos',
  instruccion: '',
  videoUrl: '',
};

import { useNavigate } from 'react-router-dom';

export default function AdminEjercicios() {
  const navigate = useNavigate();
  const [ejercicios, setEjercicios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(FORM_INIT);
  const [editando, setEditando] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('Todas');
  const [paginaEjercicios, setPaginaEjercicios] = useState(1);
  const EJERCICIOS_POR_PAGINA = 20;
  const [error, setError] = useState('');
  const [iconoAuto, setIconoAuto] = useState(false);
  const [ejDetalle, setEjDetalle] = useState(null);

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem('usuario'));
    if (!u || u.rol !== 'Developer') {
      navigate('/dashboard');
      return;
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
    cargar();
  }, [navigate]);

  async function cargar() {
    setLoading(true);
    try {
      const data = await api.obtenerEjerciciosDiccionario();
      setEjercicios(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const abrirWidgetCloudinary = () => {
    if (!window.cloudinary) {
      setError('El widget de Cloudinary no ha cargado. Revisa tu conexión a internet.');
      return;
    }

    const widget = window.cloudinary.createUploadWidget(
      {
        cloudName: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME,
        uploadPreset: import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET,
        sources: ['local', 'url', 'camera'],
        resourceType: 'video',
        clientAllowedFormats: ['mp4', 'mov', 'webm', 'mkv'],
        maxFileSize: 104857600, // 100MB max
        theme: 'minimal'
      },
      (err, result) => {
        if (!err && result && result.event === 'success') {
          setForm(f => ({ ...f, videoUrl: result.info.secure_url }));
        }
      }
    );
    widget.open();
  };

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(f => {
      const next = { ...f, [name]: value };

      if (name === 'categoria') {
        // Color e ícono asignados automáticamente por categoría
        next.color = CAT_COLOR[value] || f.color;
        next.icono = CAT_DEFAULT_ICON[value] || 'fas fa-dumbbell';
        setIconoAuto(true);
      }

      if (name === 'icono') {
        // Si el usuario edita el ícono manualmente, quitar el badge
        setIconoAuto(false);
      }

      return next;
    });
    setError('');
  }

  function cancelarEdicion() {
    setForm(FORM_INIT);
    setEditando(false);
    setError('');
    setIconoAuto(false);
  }

  function handleCategoriaChange(value) {
    setForm(f => ({
      ...f,
      categoria: value,
      color: CAT_COLOR[value] || f.color,
      icono: CAT_DEFAULT_ICON[value] || 'fas fa-dumbbell',
    }));
    setIconoAuto(true);
    setError('');
  }

  function iniciarEdicion(ej) {
    setForm({
      ...FORM_INIT,
      ...ej,
      equipamiento: ej.equipamiento || 'Libre',
      metricaPrincipal: ej.metricaPrincipal || 'Repeticiones',
      esLevantamientoOlimpico: Boolean(ej.esLevantamientoOlimpico),
      categoriaRecomendada: ej.categoriaRecomendada || 'Todos',
      subnombre: ej.subnombre || '',
      videoUrl: ej.videoUrl || '',
    });
    setEditando(true);
    setIconoAuto(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function guardar(e) {
    e.preventDefault();
    if (!form.nombre.trim()) { setError('El nombre es obligatorio.'); return; }
    if (!form.instruccion.trim()) { setError('La instrucción es obligatoria.'); return; }

    setSaving(true);
    try {
      if (editando) {
        await api.actualizarEjercicioDiccionario(form.id, form);
      } else {
        await api.crearEjercicioDiccionario(form);
      }
      await cargar();
      cancelarEdicion();
    } catch (e) {
      setError(e.message || 'Error al guardar.');
    } finally {
      setSaving(false);
    }
  }

  async function eliminar(id) {
    if (!await window.wpConfirm('¿Eliminar este ejercicio del diccionario? Esta acción no se puede deshacer.')) return;
    try {
      await api.eliminarEjercicioDiccionario(id);
      await cargar();
    } catch (e) {
      console.error(e);
    }
  }

  const filtrados = ejercicios.filter(ej => {
    const matchNombre = ej.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
                        (ej.subnombre && ej.subnombre.toLowerCase().includes(busqueda.toLowerCase()));
    const matchCat = filtroCategoria === 'Todas' || ej.categoria === filtroCategoria;
    return matchNombre && matchCat;
  });

  const totalPaginasEj = Math.ceil(filtrados.length / EJERCICIOS_POR_PAGINA);
  const ejerciciosPaginados = filtrados.slice(
    (paginaEjercicios - 1) * EJERCICIOS_POR_PAGINA,
    paginaEjercicios * EJERCICIOS_POR_PAGINA
  );

  return (
    <div className="ae-page">

      {/* HEADER — igual que PaseDeLista */}
      <header className="ae-header">
        <div className="d-flex align-items-center justify-content-between gap-3">
          <div className="d-flex align-items-center gap-3">
            <BackButton to="/dashboard" />
            <div className="ae-header-icon d-none d-sm-flex">
              <i className="fas fa-book-open" />
            </div>
            <h1 className="ae-header-title">
              Gestión de <span>Ejercicios</span>
            </h1>
          </div>
          <span className="ae-badge-count">{ejercicios.length}</span>
        </div>
      </header>

      {/* CONTENIDO */}
      <div className="container px-3 px-md-4 py-4">
        <div className="row g-4">

          {/* ============ FORMULARIO ============ */}
          <div className="col-12 col-lg-4">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4 }}
            >
              <div className={`ae-form-panel ${editando ? 'editing' : ''}`}>
                <div className="d-flex align-items-center justify-content-between mb-3">
                  <h2 className={`ae-panel-title ${editando ? 'editing' : ''}`}>
                    <i className={editando ? 'fas fa-pen' : 'fas fa-plus-circle'} />
                    {editando ? 'Editar Ejercicio' : 'Nuevo Ejercicio'}
                  </h2>
                  {editando && (
                    <button className="ae-btn-ghost" onClick={cancelarEdicion}>
                      <i className="fas fa-times" />
                    </button>
                  )}
                </div>

                <form onSubmit={guardar} className="d-flex flex-column gap-3">

                  {/* Nombre */}
                  <div>
                    <label className="ae-label">Nombre del movimiento</label>
                    <input
                      className="ae-input"
                      name="nombre"
                      value={form.nombre}
                      onChange={handleChange}
                      placeholder="Ej: Air Squat, Deadlift..."
                      autoComplete="off"
                    />
                  </div>

                  {/* Subnombre */}
                  <div>
                    <label className="ae-label">Subnombre o alternativo (Opcional)</label>
                    <input
                      className="ae-input"
                      name="subnombre"
                      value={form.subnombre}
                      onChange={handleChange}
                      placeholder="Ej: Squat (si el nombre es Sentadilla)"
                      autoComplete="off"
                    />
                  </div>

                  {/* Categoría */}
                  <div>
                    <label className="ae-label">Categoría</label>
                    <CategoriaEjercicioPicker
                      valor={form.categoria}
                      onCambiar={handleCategoriaChange}
                    />
                    <small style={{ color: 'var(--text-muted)', fontSize: '0.72rem', fontFamily: 'var(--font-body)' }}>
                      Color e ícono se asignan automáticamente según la categoría.
                    </small>
                  </div>

                  <div className="row g-2">
                    <div className="col-12">
                      <label className="ae-label">Equipamiento</label>
                      <EquipamientoPicker
                        valor={form.equipamiento}
                        onCambiar={value => setForm(f => ({ ...f, equipamiento: value }))}
                      />
                    </div>
                    <div className="col-12">
                      <label className="ae-label">¿Cómo se mide?</label>
                      <MetricaMedidaPicker
                        valor={form.metricaPrincipal}
                        onCambiar={value => setForm(f => ({ ...f, metricaPrincipal: value }))}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="ae-label">Nivel Recomendado</label>
                    <NivelRecomendadoPicker
                      valor={form.categoriaRecomendada}
                      onCambiar={value => setForm(f => ({ ...f, categoriaRecomendada: value }))}
                    />
                  </div>

                  <label className="ae-olimpico-switch">
                    <input
                      type="checkbox"
                      checked={form.esLevantamientoOlimpico}
                      onChange={e => setForm(f => ({ ...f, esLevantamientoOlimpico: e.target.checked }))}
                    />
                    <span>
                      <strong>Levantamiento Olímpico o de Fuerza</strong>
                      <small>Guarda PR en el perfil del atleta.</small>
                    </span>
                  </label>

                  {/* Instrucción */}
                  <div>
                    <label className="ae-label">Instrucción técnica</label>
                    <textarea
                      className="ae-input ae-input-textarea"
                      name="instruccion"
                      value={form.instruccion}
                      onChange={handleChange}
                      placeholder="Describe la técnica correcta del movimiento..."
                    />
                  </div>

                  {/* Video URL */}
                  <div>
                    <label className="ae-label">Video de Ejemplo</label>
                    <div className="d-flex flex-column gap-2">
                      <button type="button" className="ae-btn-ghost w-100" onClick={abrirWidgetCloudinary} style={{ borderStyle: 'dashed' }}>
                        <i className="fas fa-cloud-upload-alt me-2" />
                        {form.videoUrl ? 'Cambiar Video en Cloudinary' : 'Subir Video a Cloudinary'}
                      </button>
                      {form.videoUrl && (
                        <div className="d-flex align-items-center justify-content-between p-2" style={{ background: 'rgba(79, 195, 247, 0.1)', border: '1px solid rgba(79, 195, 247, 0.3)', borderRadius: '8px' }}>
                          <span className="text-truncate" style={{ fontSize: '0.8rem', color: '#4FC3F7', maxWidth: '80%' }}>
                            <i className="fas fa-video me-2"></i>Video cargado correctamente
                          </span>
                          <button type="button" className="btn btn-sm btn-link text-danger p-0" onClick={() => setForm(f => ({ ...f, videoUrl: '' }))}>
                            <i className="fas fa-trash"></i>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {error && (
                    <p style={{ color: 'var(--danger)', fontFamily: 'var(--font-body)', fontSize: '0.82rem', margin: 0 }}>
                      <i className="fas fa-exclamation-triangle me-1" />{error}
                    </p>
                  )}

                  <div className="d-flex gap-2 align-items-stretch ae-form-actions">
                    <BotonSeguro type="button" onClick={guardar} className="ae-btn-primary flex-grow-1" textoProcesando={<><i className="fas fa-spinner fa-spin" /> Guardando...</>}>
                      {editando
                        ? <><i className="fas fa-save" /> Guardar</>
                        : <><i className="fas fa-plus" /> Publicar Ejercicio</>
                      }
                    </BotonSeguro>
                    {editando && (
                      <button type="button" className="ae-btn-ghost" onClick={cancelarEdicion}>
                        Cancelar
                      </button>
                    )}
                  </div>
                </form>
              </div>
            </motion.div>
          </div>

          {/* ============ LISTA ============ */}
          <div className="col-12 col-lg-8">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              <div className="ae-list-panel">
                {/* Header buscador */}
                <div className="ae-list-header">
                  <p className="ae-panel-title mb-0">
                    <i className="fas fa-list" />
                    Ejercicios publicados
                  </p>
                  <div className="d-flex gap-2 flex-wrap">
                    <div className="ae-search-wrap">
                      <i className="fas fa-search ae-search-icon" />
                      <input
                        className="ae-input ae-search-input"
                        placeholder="Buscar..."
                        value={busqueda}
                        onChange={e => { setBusqueda(e.target.value); setPaginaEjercicios(1); }}
                        style={{ paddingLeft: '2.2rem' }}
                      />
                    </div>
                    <FiltroEjerciciosPicker
                      valor={filtroCategoria}
                      onCambiar={v => { setFiltroCategoria(v); setPaginaEjercicios(1); }}
                    />
                  </div>
                </div>

                {loading ? (
                  <div className="d-flex justify-content-center align-items-center py-5">
                    <div className="ae-spinner" />
                  </div>
                ) : filtrados.length === 0 ? (
                  <div className="ae-empty">
                    <i className="fas fa-book-open d-block" />
                    <p>{ejercicios.length === 0
                      ? 'No hay ejercicios publicados todavía.'
                      : `No se encontraron resultados para "${busqueda}".`
                    }</p>
                  </div>
                ) : (
                  <div className="row g-2 p-3">
                    {ejerciciosPaginados.map(ej => {
                      const cat = CAT_BADGE_STYLE[ej.categoria] || { bg: 'rgba(255,255,255,0.08)', color: '#A8B2D1' };
                      return (
                        <div key={ej.id} className="col-12 col-sm-6">
                          <div
                            className="ae-ej-card"
                            style={{ '--ej-color': ej.color }}
                            onClick={() => setEjDetalle(ej)}
                          >
                            <div className="ae-ej-glow" />
                            <div className="ae-ej-watermark">{ej.nombre}</div>
                            <div className="ae-ej-actions">
                              <button
                                className="ae-action-btn ae-action-edit"
                                title="Editar"
                                onClick={e => { e.stopPropagation(); iniciarEdicion(ej); }}
                              >
                                <i className="fas fa-pen" />
                              </button>
                              <BotonSeguro
                                className="ae-action-btn ae-action-delete"
                                title="Eliminar"
                                onClick={e => { e.stopPropagation(); eliminar(ej.id); }}
                                textoProcesando=""
                              >
                                <i className="fas fa-trash" />
                              </BotonSeguro>
                            </div>
                            <div className="d-flex align-items-center gap-2 mb-2">
                              <div
                                className="ae-table-icon flex-shrink-0"
                                style={{ background: ej.color + '20', color: ej.color }}
                              >
                                <i className={ej.icono} />
                              </div>
                              <span className="ae-table-nombre">{ej.nombre}</span>
                            </div>
                            {ej.subnombre && (
                              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem', marginTop: '-0.3rem' }}>
                                Alt: {ej.subnombre}
                              </div>
                            )}
                            <span
                              className="ae-cat-badge mb-2 d-inline-block"
                              style={{ background: cat.bg, color: cat.color }}
                            >
                              {ej.categoria}
                            </span>

                            <div className="ae-ej-tags">
                              <span className="ae-ej-tag ae-ej-tag--equipo">
                                <i className="fas fa-dumbbell" />{ej.equipamiento || 'Libre'}
                              </span>
                              <span className="ae-ej-tag ae-ej-tag--metrica">
                                <i className="fas fa-ruler" />{ej.metricaPrincipal || 'Repeticiones'}
                              </span>
                              {ej.categoriaRecomendada && ej.categoriaRecomendada !== 'Todos' && (
                                <span className="ae-ej-tag ae-ej-tag--nivel">
                                  <i className="fas fa-layer-group" />{ej.categoriaRecomendada}
                                </span>
                              )}
                              {ej.esLevantamientoOlimpico && (
                                <span className="ae-ej-tag ae-ej-tag--pr">
                                  <i className="fas fa-medal" />PR Guardable
                                </span>
                              )}
                            </div>

                            <p className="ae-ej-instruccion">{ej.instruccion}</p>
                            <span className="ae-ej-ver-mas">
                              <i className="fas fa-expand-alt me-1" />Ver técnica completa
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Paginación */}
                {totalPaginasEj > 1 && (
                  <div className="ae-pagination">
                    <button
                      className="ae-page-btn"
                      onClick={() => setPaginaEjercicios(p => Math.max(1, p - 1))}
                      disabled={paginaEjercicios === 1}
                    >
                      <i className="fas fa-chevron-left" />
                    </button>

                    {Array.from({ length: totalPaginasEj }, (_, i) => i + 1).map(num => (
                      <button
                        key={num}
                        className={`ae-page-btn${paginaEjercicios === num ? ' ae-page-btn--active' : ''}`}
                        onClick={() => setPaginaEjercicios(num)}
                      >
                        {num}
                      </button>
                    ))}

                    <button
                      className="ae-page-btn"
                      onClick={() => setPaginaEjercicios(p => Math.min(totalPaginasEj, p + 1))}
                      disabled={paginaEjercicios === totalPaginasEj}
                    >
                      <i className="fas fa-chevron-right" />
                    </button>

                    <span className="ae-page-info">
                      {(paginaEjercicios - 1) * EJERCICIOS_POR_PAGINA + 1}–{Math.min(paginaEjercicios * EJERCICIOS_POR_PAGINA, filtrados.length)} de {filtrados.length}
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          </div>

        </div>
      </div>

      {/* ── MODAL: DETALLE DEL EJERCICIO ── */}
      {ejDetalle && (
        <div className="ae-detail-overlay" onClick={() => setEjDetalle(null)}>
          <div className="ae-detail-modal" onClick={e => e.stopPropagation()}>
            <button className="ae-detail-close" onClick={() => setEjDetalle(null)}>
              <i className="fas fa-times" />
            </button>
            <div className="d-flex align-items-center gap-3 mb-3">
              <div
                className="ae-detail-icono"
                style={{ background: ejDetalle.color + '20', color: ejDetalle.color }}
              >
                <i className={ejDetalle.icono} />
              </div>
              <div>
                <h3 className="ae-detail-nombre">{ejDetalle.nombre}</h3>
                {ejDetalle.subnombre && (
                  <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>Alt: {ejDetalle.subnombre}</p>
                )}
                <span
                  className="ae-cat-badge"
                  style={{
                    background: (CAT_BADGE_STYLE[ejDetalle.categoria] || { bg: 'rgba(255,255,255,0.08)' }).bg,
                    color: (CAT_BADGE_STYLE[ejDetalle.categoria] || { color: '#A8B2D1' }).color,
                  }}
                >
                  {ejDetalle.categoria}
                </span>
              </div>
            </div>
            <div className="ae-ej-tags ae-ej-tags--detail">
              <span className="ae-ej-tag ae-ej-tag--equipo">
                <i className="fas fa-dumbbell" />{ejDetalle.equipamiento || 'Libre'}
              </span>
              <span className="ae-ej-tag ae-ej-tag--metrica">
                <i className="fas fa-ruler" />{ejDetalle.metricaPrincipal || 'Repeticiones'}
              </span>
              {ejDetalle.categoriaRecomendada && ejDetalle.categoriaRecomendada !== 'Todos' && (
                <span className="ae-ej-tag ae-ej-tag--nivel">
                  <i className="fas fa-layer-group" />{ejDetalle.categoriaRecomendada}
                </span>
              )}
              {ejDetalle.esLevantamientoOlimpico && (
                <span className="ae-ej-tag ae-ej-tag--pr">
                  <i className="fas fa-medal" />PR Guardable
                </span>
              )}
            </div>
            <div className="ae-detail-divider" />
            <p className="ae-detail-texto">{ejDetalle.instruccion}</p>
            {ejDetalle.videoUrl && (
               <div className="mt-3">
                 <video src={ejDetalle.videoUrl} controls autoPlay muted loop onClick={handleVideoClick} onContextMenu={e => e.preventDefault()} controlsList="nodownload noremoteplayback noplaybackrate" disablePictureInPicture style={{ width: '100%', borderRadius: '8px', border: `1px solid ${ejDetalle.color}40`, cursor: 'zoom-in' }}></video>
               </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
