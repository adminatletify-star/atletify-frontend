import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, Link } from 'react-router-dom';
import BackButton from '../components/BackButton';
import CoachPicker from '../components/CoachPicker';
import TimeWheelPicker from '../components/TimeWheelPicker';
import BotonSeguro from '../components/BotonSeguro';
import '../assets/css/GestionClases.css';

const API_BASE = 'import.meta.env.VITE_API_URL:7149/api';

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

  const [diasSeleccionados, setDiasSeleccionados] = useState(['L', 'M', 'X', 'J', 'V']);
  const [form, setForm] = useState({
    nombre: '', descripcion: '', horarioInicio: '06:00', horarioFin: '07:00',
    diasRecurrentes: [], maximoAtletas: 15, idCoach: '', cuentaParaRacha: true, esClaseKids: false,
    admiteDropIns: true, cupoVisitantes: '', nivelesPermitidos: 'Todos'
  });

  /* Convierte "HH:mm" (24h) a "H:mm AM/PM" para mostrar en botón */
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

      if (resClases.ok) {
        const dataClases = await resClases.json();
        setClases(dataClases);
      }

      if (resCoaches.ok) setCoaches(await resCoaches.json());

      if (resConfig.ok) {
        const cfg = await resConfig.json();
        if (cfg?.horariosApertura) {
          try {
            setHorariosConfig(JSON.parse(cfg.horariosApertura));
          } catch (e) { console.error("Error parseando horarios de Box"); }
        }
      }
    } catch (error) {
      console.error("🚨 Error de conexión:", error);
    }
    finally { setLoading(false); }
  }

  const toggleDia = (diaId) => {
    if (diasSeleccionados.includes(diaId)) {
      setDiasSeleccionados(diasSeleccionados.filter(d => d !== diaId));
    } else {
      setDiasSeleccionados([...diasSeleccionados, diaId]);
    }
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
      nivelesPermitidos: clase.nivelesPermitidos || 'Todos'
    });
    setDiasSeleccionados(clase.diasRecurrentes.split(','));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelarEdicion = () => {
    setClaseEditando(null);
    setForm({ nombre: '', descripcion: '', horarioInicio: '06:00', horarioFin: '07:00', maximoAtletas: 15, idCoach: '', cuentaParaRacha: true, esClaseKids: false, admiteDropIns: true, cupoVisitantes: '', nivelesPermitidos: 'Todos' });
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
      nivelesPermitidos: form.nivelesPermitidos,
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

  if (loading) return (
    <div className="gc-loading">
      <div className="spinner-wp"></div>
    </div>
  );

  return (
    <div className="gc-page">

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

          <div className="col-12 col-lg-5">

            <p className={`gc-section-title ${claseEditando ? 'gc-section-title--editing' : ''}`}>
              <i className={`fas ${claseEditando ? 'fa-pen' : 'fa-plus-circle'}`}></i>
              {claseEditando ? 'Editar clase' : 'Nueva clase'}
            </p>

            <div className={`gc-form-card ${claseEditando ? 'gc-form-card--editing' : ''}`}>

              <div className="mb-4 p-3 rounded" style={{ background: 'rgba(255,193,7,0.1)', border: '1px solid rgba(255,193,7,0.3)' }}>
                <h6 className="text-warning mb-2"><i className="fas fa-info-circle me-2"></i>Horarios de tu Box</h6>
                {horariosConfig ? (
                  <div className="row g-2">
                    {diasSemana.map(dia => {
                      const hd = horariosConfig[dia.nombre];
                      if (!hd) return null;
                      return (
                        <div key={dia.id} className="col-12 col-sm-6 text-white small">
                          <strong>{dia.nombre}:</strong> {hd.abierto ? `${hd.apertura} - ${hd.cierre}` : <span className="text-danger">Cerrado</span>}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="small text-white-50 mb-0">No has definido los horarios de apertura de tu Box.</p>
                )}
              </div>

              <form onSubmit={handleSubmit}>

                <div className="mb-3">
                  <label className="etiqueta-campo">Nombre de la clase</label>
                  <input
                    type="text"
                    className="entrada-oscura"
                    placeholder="Ej. CrossFit 6:00 PM"
                    required
                    value={form.nombre}
                    onChange={e => setForm({ ...form, nombre: e.target.value })}
                  />
                </div>

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

                <div className="row g-3 mb-3">
                  <div className="col-6">
                    <label className="etiqueta-campo">Cupo máximo</label>
                    <input
                      type="number"
                      min="1"
                      className="entrada-oscura"
                      required
                      value={form.maximoAtletas}
                      onChange={e => setForm({ ...form, maximoAtletas: e.target.value })}
                    />
                  </div>
                  <div className="col-6">
                    <label className="etiqueta-campo">Coach asignado</label>
                    <select id="gc-coach" name="idCoach" className="entrada-oscura" value={form.idCoach} onChange={handleChange}>
                      <option value="">👤 (Sin asignar)</option>
                      {coaches.map(c => (
                        <option key={c.idUsuario} value={c.idUsuario}>{c.nombre}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="form-check form-switch d-flex align-items-center gap-2">
                    <input
                      className="form-check-input m-0"
                      type="checkbox"
                      role="switch"
                      style={{ width: '40px', height: '20px', cursor: 'pointer' }}
                      checked={form.cuentaParaRacha}
                      onChange={e => setForm({ ...form, cuentaParaRacha: e.target.checked })}
                    />
                    <label className="form-check-label text-white small" style={{ cursor: 'pointer' }} onClick={() => setForm({ ...form, cuentaParaRacha: !form.cuentaParaRacha })}>
                      ¿Asistencia obligatoria para la Racha 🔥?
                    </label>
                  </div>
                </div>

                <div className="mb-4 p-3 rounded-4" style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  <div className="gc-field-heading mb-3">
                    <i className="fas fa-plane-arrival" style={{ color: 'var(--success)' }} />
                    <span style={{ color: 'var(--success)' }}>CATEGORÍAS Y DROP-INS</span>
                  </div>

                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <label className="text-white fw-bold mb-0">Permitir Turistas / Drop-Ins 🌍</label>
                    <div className="form-check form-switch p-0 m-0" style={{ width: '45px', height: '24px' }}>
                      <input className="form-check-input ms-0" type="checkbox" role="switch"
                        name="admiteDropIns"
                        checked={form.admiteDropIns}
                        onChange={handleChange}
                        style={{ width: '100%', height: '100%', cursor: 'pointer' }}
                      />
                    </div>
                  </div>

                  {form.admiteDropIns && (
                    <div className="mb-3 animate__animated animate__fadeIn">
                      <label className="etiqueta-campo">Cupo Específico Reservado para Visitantes (Opcional)</label>
                      <input
                        type="number"
                        min="0"
                        className="entrada-oscura"
                        placeholder="Ej. 2 lugares"
                        value={form.cupoVisitantes}
                        onChange={e => setForm({ ...form, cupoVisitantes: e.target.value })}
                      />
                    </div>
                  )}

                  <div className="mb-2">
                    <label className="etiqueta-campo">Nivel Sugerido o Requerido</label>
                    <select
                      className="entrada-oscura"
                      value={form.nivelesPermitidos}
                      onChange={e => setForm({ ...form, nivelesPermitidos: e.target.value })}
                    >
                      <option value="Todos">📊 Todas las categorías</option>
                      <option value="Novato">🐣 Novato</option>
                      <option value="Principiante">🏃 Principiante</option>
                      <option value="Intermedio">💪 Intermedio</option>
                      <option value="RX">🔥 RX (Avanzado)</option>
                    </select>
                  </div>
                </div>

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
                    <button type="button" onClick={cancelarEdicion} className="gc-cancel-btn"><i className="fas fa-times"></i></button>
                  )}
                </div>

              </form>
            </div>
          </div>

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
                  <div key={clase.idClase} className={`gc-clase-card ${claseEditando === clase.idClase ? 'gc-clase-card--editing' : ''}`}>
                    <div className="d-flex justify-content-between align-items-start gap-3">

                      {/* Info de la clase */}
                      <div className="flex-grow-1 min-w-0">

                        {/* Nombre + badge racha */}
                        <div className="d-flex align-items-center flex-wrap gap-2 mb-2">
                          <p className="gc-clase-nombre mb-0">{clase.nombre}</p>
                          {clase.cuentaParaRacha && (
                            <span className="gc-badge-racha">
                              <i className="fas fa-fire" /> Racha
                            </span>
                          )}
                        </div>

                        {/* Meta badges */}
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
                          {clase.nivelesPermitidos && clase.nivelesPermitidos !== 'Todos' && (
                            <span className="gc-meta-badge" style={{
                              background: clase.nivelesPermitidos === 'RX'
                                ? 'rgba(255,193,7,0.15)' : clase.nivelesPermitidos === 'Intermedio'
                                  ? 'rgba(13,202,240,0.15)' : clase.nivelesPermitidos === 'Principiante'
                                    ? 'rgba(25,135,84,0.15)' : 'rgba(108,117,125,0.15)',
                              color: clase.nivelesPermitidos === 'RX'
                                ? '#ffc107' : clase.nivelesPermitidos === 'Intermedio'
                                  ? '#0dcaf0' : clase.nivelesPermitidos === 'Principiante'
                                    ? '#198754' : '#adb5bd',
                              border: '1px solid currentColor',
                              borderRadius: '20px', padding: '2px 8px', fontSize: '0.7rem', fontWeight: '700'
                            }}>
                              <i className="fas fa-layer-group me-1" style={{ fontSize: '0.65rem' }} />
                              {clase.nivelesPermitidos}
                            </span>
                          )}
                        </div>

                        {/* Pills de días */}
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

                      {/* Botones de acción */}
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

    </div>
  );
}
