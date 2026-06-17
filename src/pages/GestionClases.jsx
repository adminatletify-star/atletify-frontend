import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import AtletifyLoader from '../components/AtletifyLoader';
import BackButton from '../components/BackButton';
import TimeWheelPicker from '../components/TimeWheelPicker';
import BotonSeguro from '../components/BotonSeguro';
import '../assets/css/GestionClases.css';

const API_BASE = import.meta.env.VITE_API_URL;;

const NIVELES = [
  { value: 'Todos', emoji: '📊', label: 'Todas las categorías', desc: 'Abierto para todos los atletas', color: '#A8B2D1' },
  { value: 'Novato', emoji: '🐣', label: 'Novato', desc: 'Primeras semanas de entrenamiento', color: '#adb5bd' },
  { value: 'Principiante', emoji: '🏃', label: 'Principiante', desc: 'Movimientos básicos dominados', color: '#2ECC71' },
  { value: 'Intermedio', emoji: '💪', label: 'Intermedio', desc: 'Técnica sólida y buena capacidad', color: '#4FC3F7' },
  { value: 'RX', emoji: '🔥', label: 'RX (Avanzado)', desc: 'Atleta avanzado — pesos y tiempos RX', color: '#F5A623' },
];

// Niveles reales seleccionables (sin "Todos"), en orden jerárquico ascendente.
// El orden de este array ES la jerarquía: Novato < Principiante < Intermedio < RX.
const NIVELES_SELECCIONABLES = NIVELES.filter(n => n.value !== 'Todos');
const VALORES_NIVEL = NIVELES_SELECCIONABLES.map(n => n.value);

// CSV del backend ("Principiante, Intermedio") → array canónico ['Principiante','Intermedio'].
// "Todos"/vacío → [] (sin restricción).
const parseNiveles = (str) => {
  if (!str || str.trim().toLowerCase() === 'todos') return [];
  return str.split(',')
    .map(s => VALORES_NIVEL.find(v => v.toLowerCase() === s.trim().toLowerCase()))
    .filter(Boolean);
};

// Ordena un array de niveles según la jerarquía (para mostrar y guardar consistente).
const ordenarNiveles = (arr) => VALORES_NIVEL.filter(v => arr.includes(v));

export default function GestionClases() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [box, setBox] = useState(null);
  const [clases, setClases] = useState([]);
  const [coaches, setCoaches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [horariosConfig, setHorariosConfig] = useState(null);

  const [claseEditando, setClaseEditando] = useState(null);
  const [mostrarPickerInicio, setMostrarPickerInicio] = useState(false);
  const [mostrarPickerFin, setMostrarPickerFin] = useState(false);
  const [mostrarModalNivel, setMostrarModalNivel] = useState(false);
  const [mostrarModalCoach, setMostrarModalCoach] = useState(false);

  const [diasSeleccionados, setDiasSeleccionados] = useState(['L', 'M', 'X', 'J', 'V']);
  const [form, setForm] = useState({
    nombre: '', descripcion: '', horarioInicio: '06:00', horarioFin: '07:00',
    diasRecurrentes: [], maximoAtletas: 15, idCoach: '', cuentaParaRacha: true, esClaseKids: false,
    admiteDropIns: true, cupoVisitantes: '', niveles: [], nivelObligatorio: false
  });

  // Agrega/quita un nivel de la selección múltiple de la clase.
  const toggleNivel = (value) => {
    setForm(prev => ({
      ...prev,
      niveles: prev.niveles.includes(value)
        ? prev.niveles.filter(n => n !== value)
        : [...prev.niveles, value]
    }));
  };

  const fmt12 = (hhmm) => {
    const [h, m] = hhmm.split(':').map(Number);
    const period = h < 12 ? 'AM' : 'PM';
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${h12}:${String(m).padStart(2, '0')} ${period}`;
  };

  const diasSemana = [
    { id: 'L', nombre: 'Lunes' }, { id: 'M', nombre: 'Martes' }, { id: 'X', nombre: 'Miércoles' },
    { id: 'J', nombre: 'Jueves' }, { id: 'V', nombre: 'Viernes' }, { id: 'S', nombre: 'Sábado' }, { id: 'D', nombre: 'Domingo' }
  ];

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem('usuario'));
    const b = JSON.parse(localStorage.getItem('box'));
    if (!u || (u.rol !== 'AdminBox' && u.rol !== 'Developer')) {
      navigate('/admin-box-panel');
      return;
    }
    setUser(u);
    setBox(b);
    if (b) cargarDatos(b.idBox);
  }, [navigate]);

  async function cargarDatos(idBox) {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const [resClases, resCoaches, resConfig] = await Promise.all([
        fetch(`${API_BASE}/clases/box/${idBox}`),
        fetch(`${API_BASE}/clases/box/${idBox}/coaches`),
        fetch(`${API_BASE}/configuracionbox/${idBox}`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        })
      ]);

      if (resClases.ok) setClases(await resClases.json());
      if (resCoaches.ok) setCoaches(await resCoaches.json());

      if (resConfig.ok) {
        const cfg = await resConfig.json();
        if (cfg?.horariosApertura) {
          try { setHorariosConfig(JSON.parse(cfg.horariosApertura)); }
          catch (e) { console.error("Error parseando horarios de Box"); }
        }
      }
    } catch (error) {
      console.error("🚨 Error de conexión:", error);
    } finally {
      setLoading(false);
    }
  }

  const toggleDia = (diaId) => {
    setDiasSeleccionados(prev =>
      prev.includes(diaId) ? prev.filter(d => d !== diaId) : [...prev, diaId]
    );
  };

  const cargarParaEditar = (clase) => {
    setClaseEditando(clase.idClase);
    setForm({
      nombre: clase.nombre || '',
      descripcion: clase.descripcion || '',
      horarioInicio: clase.horarioInicio ? clase.horarioInicio.substring(0, 5) : '06:00',
      horarioFin: clase.horarioFin ? clase.horarioFin.substring(0, 5) : '07:00',
      diasRecurrentes: clase.diasRecurrentes ? clase.diasRecurrentes.split(', ') : [],
      maximoAtletas: clase.maximoAtletas || '',
      idCoach: clase.idCoach ? clase.idCoach.toString() : '',
      cuentaParaRacha: clase.cuentaParaRacha !== undefined ? clase.cuentaParaRacha : true,
      esClaseKids: clase.esClaseKids || false,
      admiteDropIns: clase.admiteDropIns !== undefined ? clase.admiteDropIns : true,
      cupoVisitantes: clase.cupoVisitantes || '',
      niveles: parseNiveles(clase.nivelesPermitidos),
      nivelObligatorio: clase.nivelObligatorio || false
    });
    setDiasSeleccionados(clase.diasRecurrentes.split(','));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelarEdicion = () => {
    setClaseEditando(null);
    setForm({ nombre: '', descripcion: '', horarioInicio: '06:00', horarioFin: '07:00', maximoAtletas: 15, idCoach: '', cuentaParaRacha: true, esClaseKids: false, admiteDropIns: true, cupoVisitantes: '', niveles: [], nivelObligatorio: false });
    setDiasSeleccionados(['L', 'M', 'X', 'J', 'V']);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (diasSeleccionados.length === 0) {
      alert("Debes seleccionar al menos un día.");
      return;
    }

    const payload = {
      idUsuario: user.id,
      idBox: box.idBox,
      nombre: form.nombre,
      descripcion: form.descripcion,
      horarioInicio: form.horarioInicio + ':00',
      horarioFin: form.horarioFin + ':00',
      diasRecurrentes: diasSeleccionados.join(','),
      maximoAtletas: parseInt(form.maximoAtletas),
      idCoach: form.idCoach ? parseInt(form.idCoach) : null,
      cuentaParaRacha: form.cuentaParaRacha,
      esClaseKids: form.esClaseKids,
      admiteDropIns: form.admiteDropIns,
      cupoVisitantes: form.cupoVisitantes ? parseInt(form.cupoVisitantes) : null,
      // Sin niveles seleccionados = abierto a todos (y el switch deja de aplicar).
      nivelesPermitidos: form.niveles.length ? ordenarNiveles(form.niveles).join(', ') : 'Todos',
      nivelObligatorio: form.niveles.length ? form.nivelObligatorio : false,
      activa: true
    };

    const metodo = claseEditando ? 'PUT' : 'POST';
    const endpoint = claseEditando ? `${API_BASE}/clases/${claseEditando}` : `${API_BASE}/clases`;

    try {
      const response = await fetch(endpoint, {
        method: metodo,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const data = await response.json();
        if (data.advertencia) alert(data.mensaje);
        else alert(claseEditando ? "¡Clase actualizada!" : "¡Clase creada!");
        cargarDatos(box.idBox);
        cancelarEdicion();
      } else {
        const errorData = await response.json().catch(() => null);
        alert(errorData?.mensaje || "Error al guardar la clase.");
      }
    } catch (error) {
      alert("Error de conexión.");
    }
  };

  const eliminarClase = async (idClase) => {
    if (!await window.wpConfirm("¿Seguro de eliminar esta clase? Se borrará del horario.")) return;
    try {
      const res = await fetch(`${API_BASE}/clases/${idClase}`, { method: 'DELETE' });
      if (res.ok) setClases(clases.filter(c => c.idClase !== idClase));
    } catch (error) { console.error(error); }
  };

  // Resumen para el botón que abre el modal de niveles (multi-selección).
  const nivelesOrdenados = ordenarNiveles(form.niveles);
  const nivelResumen = nivelesOrdenados.length === 0
    ? { emoji: '📊', label: 'Todas las categorías', color: '#A8B2D1' }
    : {
        emoji: '🎯',
        label: `${nivelesOrdenados.join(', ')} · ${form.nivelObligatorio ? 'Requerido' : 'Sugerido'}`,
        // color del nivel más bajo (el piso jerárquico)
        color: (NIVELES.find(n => n.value === nivelesOrdenados[0]) || NIVELES[0]).color
      };
  const coachActual = coaches.find(c => c.idUsuario.toString() === form.idCoach) || null;

  if (loading) return (
    <div className="gc-loading">
      <AtletifyLoader />
    </div>
  );

  return (
    <div className="gc-page">

      {/* ── HEADER ── */}
      <header className="gc-header">
        <div className="d-flex align-items-center gap-3">
          <BackButton to="/admin-box-panel" />
          <h1 className="gc-header-title">
            Gestión de <span>Clases</span>
          </h1>
        </div>
      </header>

      <div className="container-xl px-3 px-md-4">
        <div className="row g-4 g-xl-5">

          {/* ── COLUMNA FORMULARIO ── */}
          <div className="col-12 col-lg-5">

            <p className={`gc-section-title ${claseEditando ? 'gc-section-title--editing' : ''}`}>
              <i className={`fas ${claseEditando ? 'fa-pen' : 'fa-plus-circle'}`}></i>
              {claseEditando ? 'Editar clase' : 'Nueva clase'}
            </p>

            <div className={`gc-form-card ${claseEditando ? 'gc-form-card--editing' : ''}`}>

              {/* Horarios del box */}
              <div className="mb-4 p-3 rounded-3" style={{ background: 'rgba(255,193,7,0.08)', border: '1px solid rgba(255,193,7,0.25)' }}>
                <h6 className="text-warning mb-2 small fw-bold">
                  <i className="fas fa-info-circle me-2"></i>Horarios de tu Box
                </h6>
                {horariosConfig ? (
                  <div className="row g-1">
                    {diasSemana.map(dia => {
                      const hd = horariosConfig[dia.nombre];
                      if (!hd) return null;
                      return (
                        <div key={dia.id} className="col-12 col-sm-6 text-white" style={{ fontSize: '0.78rem' }}>
                          <strong>{dia.nombre}:</strong>{' '}
                          {hd.abierto ? `${hd.apertura} – ${hd.cierre}` : <span className="text-danger">Cerrado</span>}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="mb-0 text-white-50" style={{ fontSize: '0.78rem' }}>
                    No has definido los horarios de apertura de tu Box.
                  </p>
                )}
              </div>

              <form onSubmit={handleSubmit}>

                {/* Nombre */}
                <div className="mb-3">
                  <label className="etiqueta-campo">Nombre de la clase</label>
                  <input
                    type="text"
                    className="entrada-oscura"
                    placeholder="Ej. CrossFit 6:00 PM"
                    required
                    maxLength={50}
                    value={form.nombre}
                    onChange={e => setForm({ ...form, nombre: e.target.value })}
                  />
                </div>

                {/* Horas */}
                <div className="row g-3 mb-3">
                  <div className="col-6">
                    <label className="etiqueta-campo">Hora inicio</label>
                    <button
                      type="button"
                      className={`gc-hora-btn${mostrarPickerInicio ? ' gc-hora-btn--open' : ''}`}
                      onClick={() => { setMostrarPickerInicio(true); setMostrarPickerFin(false); }}
                    >
                      <i className="far fa-clock" />
                      {fmt12(form.horarioInicio)}
                    </button>
                  </div>
                  <div className="col-6">
                    <label className="etiqueta-campo">Hora fin</label>
                    <button
                      type="button"
                      className={`gc-hora-btn${mostrarPickerFin ? ' gc-hora-btn--open' : ''}`}
                      onClick={() => { setMostrarPickerFin(true); setMostrarPickerInicio(false); }}
                    >
                      <i className="far fa-clock" />
                      {fmt12(form.horarioFin)}
                    </button>
                  </div>
                </div>

                {/* Portal: picker inicio */}
                {mostrarPickerInicio && createPortal(
                  <div className="twp-overlay" onClick={e => { if (e.target === e.currentTarget) setMostrarPickerInicio(false); }}>
                    <div className="twp-modal">
                      <TimeWheelPicker
                        value={form.horarioInicio}
                        onAccept={t => {
                          const [h, m] = t.split(':').map(Number);
                          const [fh, fm] = form.horarioFin.split(':').map(Number);
                          const updates = { horarioInicio: t };
                          if (h * 60 + m >= fh * 60 + fm) {
                            const finMins = (h * 60 + m + 60) % (24 * 60);
                            updates.horarioFin = `${String(Math.floor(finMins / 60)).padStart(2, '0')}:${String(finMins % 60).padStart(2, '0')}`;
                          }
                          setForm({ ...form, ...updates });
                          setMostrarPickerInicio(false);
                        }}
                        onCancel={() => setMostrarPickerInicio(false)}
                      />
                    </div>
                  </div>,
                  document.body
                )}

                {/* Portal: picker fin */}
                {mostrarPickerFin && createPortal(
                  <div className="twp-overlay" onClick={e => { if (e.target === e.currentTarget) setMostrarPickerFin(false); }}>
                    <div className="twp-modal">
                      <TimeWheelPicker
                        value={form.horarioFin}
                        minTime={form.horarioInicio}
                        onAccept={t => { setForm({ ...form, horarioFin: t }); setMostrarPickerFin(false); }}
                        onCancel={() => setMostrarPickerFin(false)}
                      />
                    </div>
                  </div>,
                  document.body
                )}

                {/* Cupo + Coach */}
                <div className="row g-3 mb-3">
                  <div className="col-12 col-sm-6">
                    <label className="etiqueta-campo">Cupo máximo</label>
                    <input
                      type="number"
                      min="1"
                      max="200"
                      className="entrada-oscura"
                      required
                      value={form.maximoAtletas}
                      onChange={e => {
                        const v = e.target.value;
                        if (v === '' || (Number(v) <= 200 && /^\d*$/.test(v))) {
                          setForm({ ...form, maximoAtletas: v });
                        }
                      }}
                    />
                  </div>
                  <div className="col-12 col-sm-6">
                    <label className="etiqueta-campo">Coach asignado</label>
                    <button
                      type="button"
                      className="gc-coach-btn"
                      onClick={() => setMostrarModalCoach(true)}
                    >
                      <span className="gc-coach-btn__left">
                        {coachActual ? (
                          <>
                            <span className="gc-coach-btn__avatar">{coachActual.nombre.charAt(0).toUpperCase()}</span>
                            <span className="gc-coach-btn__nombre">{coachActual.nombre}</span>
                          </>
                        ) : (
                          <>
                            <span className="gc-coach-btn__avatar gc-coach-btn__avatar--vacio">👤</span>
                            <span className="gc-coach-btn__nombre gc-coach-btn__nombre--vacio">Sin asignar</span>
                          </>
                        )}
                      </span>
                      <i className="fas fa-chevron-right gc-coach-btn__arrow" />
                    </button>
                  </div>
                </div>

                {/* Racha */}
                <div className="mb-4">
                  <div className="form-check form-switch d-flex align-items-center gap-2">
                    <input
                      className="form-check-input m-0"
                      type="checkbox"
                      role="switch"
                      style={{ width: '40px', height: '20px', cursor: 'pointer', flexShrink: 0 }}
                      checked={form.cuentaParaRacha}
                      onChange={e => setForm({ ...form, cuentaParaRacha: e.target.checked })}
                    />
                    <label
                      className="form-check-label text-white"
                      style={{ cursor: 'pointer', fontSize: '0.875rem' }}
                      onClick={() => setForm({ ...form, cuentaParaRacha: !form.cuentaParaRacha })}
                    >
                      ¿Asistencia obligatoria para la Racha 🔥?
                    </label>
                  </div>
                </div>

                {/* Sección Categorías y Drop-Ins */}
                <div className="mb-4 p-3 rounded-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div className="gc-field-heading mb-3">
                    <i className="fas fa-plane-arrival" style={{ color: 'var(--success)' }} />
                    <span style={{ color: 'var(--success)' }}>CATEGORÍAS Y DROP-INS</span>
                  </div>

                  {/* Toggle Drop-Ins */}
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <label className="text-white fw-bold mb-0" style={{ fontSize: '0.875rem' }}>
                      Permitir Turistas / Drop-Ins
                    </label>
                    <div className="form-check form-switch p-0 m-0" style={{ width: '45px', height: '24px', flexShrink: 0 }}>
                      <input
                        className="form-check-input ms-0"
                        type="checkbox"
                        role="switch"
                        name="admiteDropIns"
                        checked={form.admiteDropIns}
                        onChange={handleChange}
                        style={{ width: '100%', height: '100%', cursor: 'pointer' }}
                      />
                    </div>
                  </div>

                  {/* Cupo visitantes */}
                  {form.admiteDropIns && (
                    <div className="mb-3">
                      <label className="etiqueta-campo">Cupo Reservado para Visitantes (Opcional)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        className="entrada-oscura"
                        placeholder="Ej. 2 lugares"
                        value={form.cupoVisitantes}
                        onChange={e => {
                          const v = e.target.value;
                          if (v === '' || (Number(v) <= 100 && /^\d*$/.test(v))) {
                            setForm({ ...form, cupoVisitantes: v });
                          }
                        }}
                      />
                    </div>
                  )}

                  {/* Nivel — botón que abre modal */}
                  <div className="mb-1">
                    <label className="etiqueta-campo">Nivel Sugerido o Requerido</label>
                    <button
                      type="button"
                      className="gc-nivel-btn"
                      onClick={() => setMostrarModalNivel(true)}
                      style={{ '--nivel-color': nivelResumen.color }}
                    >
                      <span className="gc-nivel-btn__left">
                        <span className="gc-nivel-btn__emoji">{nivelResumen.emoji}</span>
                        <span className="gc-nivel-btn__label">{nivelResumen.label}</span>
                      </span>
                      <i className="fas fa-chevron-right gc-nivel-btn__arrow" />
                    </button>
                  </div>
                </div>

                {/* Días */}
                <div className="mb-4">
                  <label className="etiqueta-campo">Días de la semana</label>
                  <div className="gc-dias-row">
                    {diasSemana.map(dia => (
                      <button
                        key={dia.id}
                        type="button"
                        onClick={() => toggleDia(dia.id)}
                        className={`gc-dia-btn ${diasSeleccionados.includes(dia.id) ? 'gc-dia-btn--active' : ''}`}
                        title={dia.nombre}
                      >
                        {dia.id}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Guardar / Cancelar */}
                <div className="d-flex gap-2 align-items-center">
                  <BotonSeguro
                    type="button"
                    onClick={handleSubmit}
                    className={`gc-save-btn ${claseEditando ? 'gc-save-btn--editing' : ''}`}
                    textoProcesando="Guardando..."
                  >
                    <i className={`fas ${claseEditando ? 'fa-save' : 'fa-plus'}`}></i>
                    {claseEditando ? 'Guardar cambios' : 'Crear clase'}
                  </BotonSeguro>
                  {claseEditando && (
                    <button type="button" onClick={cancelarEdicion} className="gc-cancel-btn">
                      <i className="fas fa-times"></i>
                    </button>
                  )}
                </div>

              </form>
            </div>
          </div>

          {/* ── COLUMNA LISTA ── */}
          <div className="col-12 col-lg-7">
            <p className="gc-section-title">
              <i className="fas fa-calendar-week"></i>
              Horario activo — {box?.nombre}
            </p>

            {clases.length === 0 ? (
              <div className="tarjeta-panel empty-state">
                <i className="fas fa-calendar-times"></i>
                <p>No hay clases programadas</p>
              </div>
            ) : (
              <div className="d-flex flex-column gap-3">
                {clases.map(clase => (
                  <div
                    key={clase.idClase}
                    className={`gc-clase-card ${claseEditando === clase.idClase ? 'gc-clase-card--editing' : ''}`}
                  >
                    <div className="d-flex justify-content-between align-items-start gap-3">

                      {/* Info */}
                      <div className="flex-grow-1 min-w-0">

                        <div className="d-flex align-items-center flex-wrap gap-2 mb-2">
                          <p className="gc-clase-nombre mb-0">{clase.nombre}</p>
                          {clase.cuentaParaRacha && (
                            <span className="gc-badge-racha">
                              <i className="fas fa-fire" /> Racha
                            </span>
                          )}
                        </div>

                        <div className="gc-meta-badges">
                          <span className="gc-meta-badge gc-meta-badge--time">
                            <i className="far fa-clock" />
                            {clase.horarioInicio?.substring(0, 5)} — {clase.horarioFin?.substring(0, 5)}
                          </span>
                          <span className="gc-meta-badge gc-meta-badge--cupo">
                            <i className="fas fa-users" />
                            {clase.maximoAtletas} cupos
                          </span>
                          {clase.nombreCoach && (
                            <span className="gc-meta-badge gc-meta-badge--coach">
                              <span className="gc-coach-avatar">{clase.nombreCoach.charAt(0).toUpperCase()}</span>
                              {clase.nombreCoach}
                            </span>
                          )}
                          {clase.nivelesPermitidos && clase.nivelesPermitidos !== 'Todos' && (() => {
                            const nivs = parseNiveles(clase.nivelesPermitidos);
                            if (nivs.length === 0) return null;
                            return (
                              <>
                                {nivs.map(v => {
                                  const niv = NIVELES.find(n => n.value === v);
                                  return (
                                    <span key={v} className="gc-meta-badge" style={{
                                      background: `${niv?.color}18`,
                                      color: niv?.color,
                                      border: `1px solid ${niv?.color}55`,
                                      borderRadius: '20px', padding: '2px 8px',
                                      fontSize: '0.7rem', fontWeight: '700'
                                    }}>
                                      <i className="fas fa-layer-group me-1" style={{ fontSize: '0.65rem' }} />
                                      {v}
                                    </span>
                                  );
                                })}
                                <span className="gc-meta-badge" style={{
                                  background: clase.nivelObligatorio ? 'rgba(230,57,70,0.1)' : 'rgba(245,166,35,0.1)',
                                  color: clase.nivelObligatorio ? 'var(--primary)' : 'var(--accent)',
                                  border: `1px solid ${clase.nivelObligatorio ? 'rgba(230,57,70,0.3)' : 'rgba(245,166,35,0.3)'}`,
                                  borderRadius: '20px', padding: '2px 8px',
                                  fontSize: '0.68rem', fontWeight: '700'
                                }}>
                                  <i className={`fas ${clase.nivelObligatorio ? 'fa-lock' : 'fa-lightbulb'} me-1`} style={{ fontSize: '0.62rem' }} />
                                  {clase.nivelObligatorio ? 'Requerido' : 'Sugerido'}
                                </span>
                              </>
                            );
                          })()}
                        </div>

                        <div className="gc-dias-pips">
                          {diasSemana.map(dia => (
                            <span
                              key={dia.id}
                              className={`gc-dia-pip ${clase.diasRecurrentes.includes(dia.id) ? 'gc-dia-pip--active' : 'gc-dia-pip--inactive'}`}
                            >
                              {dia.nombre}
                            </span>
                          ))}
                        </div>

                      </div>

                      {/* Acciones */}
                      <div className="d-flex flex-column flex-sm-row gap-2 align-items-center flex-shrink-0">
                        <button
                          onClick={() => cargarParaEditar(clase)}
                          className="gc-action-btn gc-action-btn--edit"
                          title="Editar clase"
                        >
                          <i className="fas fa-pen"></i>
                        </button>
                        <BotonSeguro
                          onClick={() => eliminarClase(clase.idClase)}
                          className="gc-action-btn gc-action-btn--delete"
                          title="Eliminar clase"
                          textoProcesando=""
                        >
                          <i className="fas fa-trash"></i>
                        </BotonSeguro>
                      </div>

                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ── MODAL COACH ── */}
      {mostrarModalCoach && createPortal(
        <div
          className="gc-nivel-overlay"
          onClick={e => { if (e.target === e.currentTarget) setMostrarModalCoach(false); }}
        >
          <div className="gc-nivel-modal">

            <div className="gc-nivel-modal__header">
              <div>
                <p className="gc-nivel-modal__supertitle">CLASE</p>
                <h2 className="gc-nivel-modal__title">Coach Asignado</h2>
              </div>
              <button
                type="button"
                className="gc-nivel-modal__close"
                onClick={() => setMostrarModalCoach(false)}
                aria-label="Cerrar"
              >
                <i className="fas fa-times" />
              </button>
            </div>

            <p className="gc-nivel-modal__hint">
              Selecciona el coach responsable de esta clase.
            </p>

            <div className="gc-nivel-modal__list">
              {/* Opción Sin asignar */}
              {[{ idUsuario: '', nombre: 'Sin asignar', vacio: true }, ...coaches].map(c => {
                const val = c.idUsuario ? c.idUsuario.toString() : '';
                const activo = form.idCoach === val;
                return (
                  <button
                    key={val || 'none'}
                    type="button"
                    className={`gc-coach-opcion ${activo ? 'gc-coach-opcion--activo' : ''}`}
                    onClick={() => {
                      setForm({ ...form, idCoach: val });
                      setMostrarModalCoach(false);
                    }}
                  >
                    <span className={`gc-coach-opcion__avatar ${c.vacio ? 'gc-coach-opcion__avatar--vacio' : ''}`}>
                      {c.vacio ? '👤' : c.nombre.charAt(0).toUpperCase()}
                    </span>
                    <span className="gc-coach-opcion__info">
                      <span className="gc-coach-opcion__nombre">{c.nombre}</span>
                      {c.vacio && <span className="gc-coach-opcion__desc">No se asignará coach a esta clase</span>}
                    </span>
                    {activo && <i className="fas fa-check-circle gc-nivel-opcion__check" />}
                  </button>
                );
              })}
            </div>

          </div>
        </div>,
        document.body
      )}

      {/* ── MODAL NIVEL ── */}
      {mostrarModalNivel && createPortal(
        <div
          className="gc-nivel-overlay"
          onClick={e => { if (e.target === e.currentTarget) setMostrarModalNivel(false); }}
        >
          <div className="gc-nivel-modal">

            <div className="gc-nivel-modal__header">
              <div>
                <p className="gc-nivel-modal__supertitle">CLASE</p>
                <h2 className="gc-nivel-modal__title">Nivel Sugerido o Requerido</h2>
              </div>
              <button
                type="button"
                className="gc-nivel-modal__close"
                onClick={() => setMostrarModalNivel(false)}
                aria-label="Cerrar"
              >
                <i className="fas fa-times" />
              </button>
            </div>

            <p className="gc-nivel-modal__hint">
              Selecciona uno o más niveles. La clase quedará disponible para esos niveles y los <strong>superiores</strong> (jerárquico). Si no eliges ninguno, queda abierta a todos.
            </p>

            <div className="gc-nivel-modal__list">
              {NIVELES_SELECCIONABLES.map(nivel => {
                const activo = form.niveles.includes(nivel.value);
                return (
                  <button
                    key={nivel.value}
                    type="button"
                    className={`gc-nivel-opcion ${activo ? 'gc-nivel-opcion--activo' : ''}`}
                    style={{ '--niv-color': nivel.color }}
                    onClick={() => toggleNivel(nivel.value)}
                  >
                    <span className="gc-nivel-opcion__emoji">{nivel.emoji}</span>
                    <span className="gc-nivel-opcion__info">
                      <span className="gc-nivel-opcion__nombre">{nivel.label}</span>
                      <span className="gc-nivel-opcion__desc">{nivel.desc}</span>
                    </span>
                    {activo && <i className="fas fa-check-circle gc-nivel-opcion__check" />}
                  </button>
                );
              })}
            </div>

            {/* Switch Requerido / Sugerido — solo aplica si hay al menos un nivel */}
            {form.niveles.length > 0 && (
              <button
                type="button"
                role="switch"
                aria-checked={form.nivelObligatorio}
                className={`gc-nivel-switch-row ${form.nivelObligatorio ? 'gc-nivel-switch-row--on' : ''}`}
                onClick={() => setForm(f => ({ ...f, nivelObligatorio: !f.nivelObligatorio }))}
              >
                <span className="gc-nivel-switch-text">
                  <span className="gc-nivel-switch-title">
                    {form.nivelObligatorio ? '🔒 Requerido (bloquea)' : '💡 Sugerido (solo advierte)'}
                  </span>
                  <span className="gc-nivel-switch-desc">
                    {form.nivelObligatorio
                      ? 'Los atletas de menor nivel NO podrán reservar esta clase.'
                      : 'Los atletas de menor nivel podrán reservar, pero verán una advertencia clara.'}
                  </span>
                </span>
                <span className={`gc-nivel-switch ${form.nivelObligatorio ? 'gc-nivel-switch--on' : ''}`}>
                  <span className="gc-nivel-switch__knob" />
                </span>
              </button>
            )}

            <button
              type="button"
              className="gc-nivel-modal__done"
              onClick={() => setMostrarModalNivel(false)}
            >
              Listo
            </button>

          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
