import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BackButton from '../components/BackButton';
import BotonSeguro from '../components/BotonSeguro';
import EquipamientoPicker from '../components/EquipamientoPicker';
import MetricaMedidaPicker from '../components/MetricaMedidaPicker';
import NivelRecomendadoPicker from '../components/NivelRecomendadoPicker';
import AtletifyLoader from '../components/AtletifyLoader';
import '../assets/css/DiccionarioEjercicios.css';

const API_BASE = import.meta.env.VITE_API_URL;;

const handleVideoClick = (e) => {
  if (!document.fullscreenElement) {
    e.preventDefault();
    e.currentTarget.requestFullscreen();
  }
};

export default function DiccionarioEjercicios() {
  const navigate = useNavigate();
  const [box, setBox] = useState(null);
  const [ejercicios, setEjercicios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [editandoId, setEditandoId] = useState(null);

  const [form, setForm] = useState({
    nombre: '',
    descripcion: '',
    equipamiento: 'Libre',
    metricaPrincipal: 'Repeticiones',
    esLevantamientoOlimpico: false,
    categoriaRecomendada: 'Todos',
    subnombre: '',
    videoUrl: ''
  });

  useEffect(() => {
    const b = JSON.parse(localStorage.getItem('box'));
    const u = JSON.parse(localStorage.getItem('usuario'));
    if (!b || !u || (u.rol !== 'AdminBox' && u.rol !== 'Coach' && u.rol !== 'Developer')) {
      navigate('/');
      return;
    }
    setBox(b);
    cargarEjercicios(b.idBox);
  }, [navigate]);

  async function cargarEjercicios(idBox) {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/ejercicios/box/${idBox}`);
      if (res.ok) setEjercicios(await res.json());
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  const abrirWidgetCloudinary = () => {
    if (!window.cloudinary) {
      alert('El widget de Cloudinary no ha cargado. Revisa tu conexión a internet.');
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { ...form, idBox: box.idBox };

    const url = editandoId ? `${API_BASE}/ejercicios/${editandoId}` : `${API_BASE}/ejercicios`;
    const method = editandoId ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        alert(editandoId ? "Ejercicio actualizado" : "Ejercicio guardado");
        cancelarEdicion();
        cargarEjercicios(box.idBox);
      } else {
        const error = await res.json();
        alert(error.mensaje || "Error al guardar");
      }
    } catch (err) { alert("Error de red"); }
  };

  const cargarParaEditar = (ej) => {
    setEditandoId(ej.idEjercicio);
    setForm({
      nombre: ej.nombre,
      descripcion: ej.descripcion || '',
      equipamiento: ej.equipamiento,
      metricaPrincipal: ej.metricaPrincipal,
      esLevantamientoOlimpico: ej.esLevantamientoOlimpico,
      categoriaRecomendada: ej.categoriaRecomendada,
      subnombre: ej.subnombre || '',
      videoUrl: ej.videoUrl || ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelarEdicion = () => {
    setEditandoId(null);
    setForm({
      nombre: '', descripcion: '', equipamiento: 'Libre',
      metricaPrincipal: 'Repeticiones', esLevantamientoOlimpico: false, categoriaRecomendada: 'Todos',
      subnombre: '', videoUrl: ''
    });
  };

  const eliminarEjercicio = async (id) => {
    if (!await window.wpConfirm("¿Seguro que deseas eliminar este ejercicio?")) return;
    try {
      const res = await fetch(`${API_BASE}/ejercicios/${id}`, { method: 'DELETE' });
      if (res.ok) cargarEjercicios(box.idBox);
    } catch (err) { console.error(err); }
  };

  const filtrados = ejercicios.filter(e =>
    e.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    (e.subnombre && e.subnombre.toLowerCase().includes(busqueda.toLowerCase()))
  );

  if (loading) return (
    <div className="diccionario-container d-flex justify-content-center align-items-center">
      <AtletifyLoader />
    </div>
  );

  return (
    <div className="diccionario-container">

      {/* ── NAVBAR ── */}
      <nav className="diccionario-nav">
        <BackButton to="/admin-box-panel" />
        <div className="diccionario-nav-icono">
          <i className="fas fa-book-open"></i>
        </div>
        <h1 className="diccionario-nav-titulo">
          Glosario de <span>Ejercicios</span>
        </h1>
      </nav>

      <div className="container-fluid px-3 px-md-4">
        <div className="row g-4">

          {/* ── COLUMNA IZQUIERDA: FORMULARIO ── */}
          <div className="col-lg-4">
            <div className="diccionario-form-panel">

              {/* Header del panel */}
              <div className="diccionario-form-header">
                <div className={`diccionario-form-titulo-dot ${editandoId ? 'diccionario-form-titulo-dot--editar' : ''}`}></div>
                <h2 className={`diccionario-form-titulo ${editandoId ? 'diccionario-form-titulo--editar' : ''}`}>
                  {editandoId ? (
                    <><i className="fas fa-pen me-2"></i>Editar Ejercicio</>
                  ) : (
                    <><i className="fas fa-plus me-2"></i>Nuevo Ejercicio</>
                  )}
                </h2>
              </div>

              {/* Cuerpo del formulario */}
              <div className="diccionario-form-body">
                <form onSubmit={handleSubmit}>

                  <div className="mb-3">
                    <label className="diccionario-field-label">Nombre</label>
                    <input
                      type="text"
                      className="diccionario-input"
                      placeholder="Ej. Devil Press, Clean & Jerk..."
                      required
                      value={form.nombre}
                      onChange={e => setForm({ ...form, nombre: e.target.value })}
                    />
                  </div>

                  <div className="mb-3">
                    <label className="diccionario-field-label">Subnombre o alternativo (Opcional)</label>
                    <input
                      type="text"
                      className="diccionario-input"
                      placeholder="Ej: Squat (si el nombre es Sentadilla)"
                      value={form.subnombre}
                      onChange={e => setForm({ ...form, subnombre: e.target.value })}
                    />
                  </div>

                  <div className="mb-3">
                    <label className="diccionario-field-label">Descripción / Notas</label>
                    <textarea
                      className="diccionario-textarea"
                      rows="2"
                      placeholder="Técnica, estándares de movimiento..."
                      value={form.descripcion}
                      onChange={e => setForm({ ...form, descripcion: e.target.value })}
                    />
                  </div>

                  {/* Video URL */}
                  <div className="mb-3">
                    <label className="diccionario-field-label">Video de Ejemplo</label>
                    <div className="d-flex flex-column gap-2">
                      <button type="button" className="btn btn-outline-secondary w-100" onClick={abrirWidgetCloudinary} style={{ borderStyle: 'dashed' }}>
                        <i className="fas fa-cloud-upload-alt me-2" />
                        {form.videoUrl ? 'Cambiar Video en Cloudinary' : 'Subir Video a Cloudinary'}
                      </button>
                      {form.videoUrl && (
                        <div className="d-flex align-items-center justify-content-between p-2" style={{ background: 'rgba(79, 195, 247, 0.1)', border: '1px solid rgba(79, 195, 247, 0.3)', borderRadius: '8px' }}>
                          <span className="text-truncate" style={{ fontSize: '0.8rem', color: 'var(--accent)', maxWidth: '80%' }}>
                            <i className="fas fa-video me-2"></i>Video cargado correctamente
                          </span>
                          <button type="button" className="btn btn-sm btn-link text-danger p-0" onClick={() => setForm(f => ({ ...f, videoUrl: '' }))}>
                            <i className="fas fa-trash"></i>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="row g-2 mb-3">
                    <div className="col-6">
                      <label className="diccionario-field-label">Equipamiento</label>
                      <EquipamientoPicker
                        valor={form.equipamiento}
                        onCambiar={v => setForm({ ...form, equipamiento: v })}
                      />
                    </div>
                    <div className="col-6">
                      <label className="diccionario-field-label">¿Cómo se mide?</label>
                      <MetricaMedidaPicker
                        valor={form.metricaPrincipal}
                        onCambiar={v => setForm({ ...form, metricaPrincipal: v })}
                      />
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="diccionario-field-label">Nivel Recomendado</label>
                    <NivelRecomendadoPicker
                      valor={form.categoriaRecomendada}
                      onCambiar={v => setForm({ ...form, categoriaRecomendada: v })}
                    />
                  </div>

                  {/* Toggle levantamiento olímpico */}
                  <label className="diccionario-switch-row mb-4">
                    <input
                      type="checkbox"
                      checked={form.esLevantamientoOlimpico}
                      onChange={e => setForm({ ...form, esLevantamientoOlimpico: e.target.checked })}
                    />
                    <div>
                      <span className="diccionario-switch-label">
                        <i className="fas fa-medal me-1" style={{ color: 'var(--accent)' }}></i>
                        Levantamiento Olímpico o de Fuerza
                      </span>
                      <span className="diccionario-switch-hint">
                        Guarda el récord personal (PR) en el perfil del atleta.
                      </span>
                    </div>
                  </label>

                  <div className="d-grid gap-2">
                    <BotonSeguro
                      type="button"
                      onClick={handleSubmit}
                      className={`diccionario-btn-guardar ${editandoId ? 'diccionario-btn-guardar--editar' : ''}`}
                      textoProcesando="Guardando..."
                    >
                      <i className={`fas ${editandoId ? 'fa-check' : 'fa-save'}`}></i>
                      {editandoId ? 'Actualizar Ejercicio' : 'Guardar Ejercicio'}
                    </BotonSeguro>
                    {editandoId && (
                      <button type="button" className="diccionario-btn-cancelar" onClick={cancelarEdicion}>
                        <i className="fas fa-times"></i>Cancelar edición
                      </button>
                    )}
                  </div>

                </form>
              </div>
            </div>
          </div>

          {/* ── COLUMNA DERECHA: BUSCADOR + LISTA ── */}
          <div className="col-lg-8">

            {/* Buscador */}
            <div className="diccionario-search-wrapper">
              <i className="fas fa-search diccionario-search-icon"></i>
              <input
                type="text"
                className="diccionario-search"
                placeholder="Buscar ejercicio por nombre..."
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
              />
            </div>

            {/* Contador */}
            <p className="diccionario-counter">
              <span>{filtrados.length}</span> ejercicio{filtrados.length !== 1 ? 's' : ''} encontrado{filtrados.length !== 1 ? 's' : ''}
            </p>

            {/* Grid de tarjetas */}
            <div className="row g-3">
              {filtrados.length === 0 ? (
                <div className="diccionario-empty">
                  <i className="fas fa-search"></i>
                  <p>No se encontraron ejercicios{busqueda ? ` para "${busqueda}"` : ''}.</p>
                </div>
              ) : (
                filtrados.map(ej => (
                  <div key={ej.idEjercicio} className="col-md-6">
                    <div className={`diccionario-card ${ej.esLevantamientoOlimpico ? 'diccionario-card--olimpico' : 'diccionario-card--regular'}`}>
                      <div className="diccionario-card-body">

                        {/* Nombre + acciones */}
                        <div className="diccionario-card-top">
                          <div className="flex-grow-1 min-w-0">
                            <h3 className="diccionario-card-nombre mb-0">{ej.nombre}</h3>
                            {ej.subnombre && <p style={{margin:0, fontSize:'0.8rem', color:'var(--text-muted)'}}>Alt: {ej.subnombre}</p>}
                          </div>
                          <div className="diccionario-card-acciones">
                            <button
                              className="diccionario-btn-icono diccionario-btn-icono--editar"
                              onClick={() => cargarParaEditar(ej)}
                              title="Editar"
                            >
                              <i className="fas fa-pen"></i>
                            </button>
                            <BotonSeguro
                              className="diccionario-btn-icono diccionario-btn-icono--eliminar"
                              onClick={() => eliminarEjercicio(ej.idEjercicio)}
                              title="Eliminar"
                              textoProcesando=""
                            >
                              <i className="fas fa-trash"></i>
                            </BotonSeguro>
                          </div>
                        </div>

                        {/* Descripción */}
                        <p className="diccionario-card-desc">
                          {ej.descripcion || 'Sin descripción adicional.'}
                        </p>
                        
                        {ej.videoUrl && (
                          <div className="mb-3">
                            <video src={ej.videoUrl} controls autoPlay muted loop onClick={handleVideoClick} onContextMenu={e => e.preventDefault()} controlsList="nodownload noremoteplayback noplaybackrate" disablePictureInPicture style={{ width: '100%', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', cursor: 'zoom-in' }}></video>
                          </div>
                        )}

                        {/* Tags */}
                        <div className="diccionario-tags">
                          <span className="diccionario-tag diccionario-tag--equipo">
                            <i className="fas fa-dumbbell"></i>{ej.equipamiento}
                          </span>
                          <span className="diccionario-tag diccionario-tag--metrica">
                            <i className="fas fa-ruler"></i>{ej.metricaPrincipal}
                          </span>
                          {ej.categoriaRecomendada && ej.categoriaRecomendada !== 'Todos' && (
                            <span className="diccionario-tag diccionario-tag--equipo">
                              <i className="fas fa-layer-group"></i>{ej.categoriaRecomendada}
                            </span>
                          )}
                          {ej.esLevantamientoOlimpico && (
                            <span className="diccionario-tag diccionario-tag--pr">
                              <i className="fas fa-medal"></i>PR Guardable
                            </span>
                          )}
                        </div>

                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

          </div>
        </div>
      </div>

    </div>
  );
}
