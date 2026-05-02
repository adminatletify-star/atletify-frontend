import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BackButton from '../components/BackButton';
import EjercicioOlimpicoPicker from '../components/EjercicioOlimpicoPicker';
import UnidadPRPicker from '../components/UnidadPRPicker';
import BotonSeguro from '../components/BotonSeguro';
import '../assets/css/CalendarioAtleta.css';

const API_BASE = 'import.meta.env.VITE_API_URL:7149/api';

const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

export default function CalendarioAtleta() {
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState(null);

  const [fechaActual, setFechaActual] = useState(new Date());
  const [diaSeleccionado, setDiaSeleccionado] = useState(new Date());
  const [loading, setLoading] = useState(false);

  const [modalCalificarVisible, setModalCalificarVisible] = useState(false);
  const [formCalificar, setFormCalificar] = useState({ idCoach: null, estrellas: 5, comentario: '' });

  const [datosMes, setDatosMes] = useState({
    eventos: [], asistencias: [], wods: [], suscripcion: null, prs: [], cumples: []
  });

  const [mostrarFormPR, setMostrarFormPR] = useState(false);
  const [listaEjercicios, setListaEjercicios] = useState([]);
  const [formPR, setFormPR] = useState({ idMarca: null, idEjercicio: '', valor: '', unidad: 'lbs', notas: '' });
  const [modalAnunciosVisible, setModalAnunciosVisible] = useState(false);

  // 🎟️ CONFIRMAR ASISTENCIA A EVENTOS
  const handleToggleRSVP = async (idEvento) => {
    const userId = usuario.id || usuario.idUsuario || usuario.IdUsuario;
    try {
      const res = await fetch(`${API_BASE}/calendario/evento/${idEvento}/rsvp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(userId)
      });
      if (res.ok) {
        const data = await res.json();
        // Actualizamos el botón instantáneamente sin recargar la pantalla
        setDatosMes(prev => ({
          ...prev,
          eventos: prev.eventos.map(e => e.idEvento === idEvento ? { ...e, yaConfirmo: data.confirmado } : e)
        }));
      }
    } catch (e) { alert("Error de conexión."); }
  };

  const abrirModalCalificar = (idCoach) => {
    if (!idCoach) return alert("Esta clase no tiene un Coach asignado en el sistema.");
    setFormCalificar({ idCoach, estrellas: 5, comentario: '' });
    setModalCalificarVisible(true);
  };

  const guardarCalificacion = async () => {
    try {
      const userId = usuario.id || usuario.idUsuario || usuario.IdUsuario;
      const payload = { IdCoach: formCalificar.idCoach, IdAtleta: userId, Estrellas: formCalificar.estrellas, Comentario: formCalificar.comentario };
      const res = await fetch(`${API_BASE}/evaluaciones`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (res.ok) {
        alert("¡Retroalimentación enviada! Gracias por ayudar a mejorar el Box. ⭐");
        setModalCalificarVisible(false);
      }
    } catch (e) { alert("Error al enviar calificación."); }
  };

  const getFechaLocalString = (fecha) => {
    const offset = fecha.getTimezoneOffset() * 60000;
    return new Date(fecha.getTime() - offset).toISOString().split('T')[0];
  };

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem('usuario'));
    if (!u || u.rol !== 'Atleta') { navigate('/login'); return; }
    setUsuario(u);

    // 👇 LA CURA AL BUG "UNDEFINED": Leemos el ID correctamente 👇
    const userId = u.id || u.idUsuario || u.IdUsuario;
    cargarMiCalendario(userId, fechaActual.getFullYear(), fechaActual.getMonth());

    // 👇 Cargar el Glosario de Ejercicios para los PRs 👇
    const b = JSON.parse(localStorage.getItem('box'));
    if (b) {
      const boxId = b.idBox || b.IdBox;
      fetch(`${API_BASE}/marcaspersonales/ejercicios-olimpicos/${boxId}`)
        .then(res => res.json())
        .then(data => setListaEjercicios(data))
        .catch(e => console.error(e));
    }
  }, [navigate, fechaActual]);

  const cargarMiCalendario = async (idUsuario, anio, mes) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/calendario/atleta/${idUsuario}/mes/${anio}/${mes + 1}`);
      if (res.ok) {
        const data = await res.json();
        data.eventos = data.eventos.map(e => ({ ...e, fechaInicio: new Date(e.fechaInicio), fechaFin: new Date(e.fechaFin) }));
        data.asistencias = data.asistencias.map(a => ({ ...a, fecha: new Date(a.fecha) }));
        data.wods = data.wods.map(w => ({ ...w, fechaProgramada: new Date(w.fechaProgramada) }));
        data.prs = data.prs.map(p => ({ ...p, fechaLogro: new Date(p.fechaLogro) }));
        if (data.suscripcion?.fechaVencimiento) data.suscripcion.fechaVencimiento = new Date(data.suscripcion.fechaVencimiento);

        setDatosMes({
          eventos: data.eventos, asistencias: data.asistencias, wods: data.wods,
          suscripcion: data.suscripcion, prs: data.prs, cumples: data.cumplesDelMes
        });
      }
    } catch (error) { console.error("Error al cargar tu calendario:", error); }
    finally { setLoading(false); }
  };

  const handleGuardarPR = async () => {
    if (!formPR.idEjercicio || !formPR.valor) return alert("Selecciona un ejercicio y pon un peso válido.");
    try {
      const userId = usuario.id || usuario.idUsuario || usuario.IdUsuario;
      const payload = {
        idMarca: formPR.idMarca || 0,
        idUsuario: userId,
        idEjercicio: parseInt(formPR.idEjercicio),
        valor: parseFloat(formPR.valor),
        unidad: formPR.unidad,
        fechaLogro: getFechaLocalString(diaSeleccionado) + 'T12:00:00Z',
        notas: formPR.notas
      };

      const url = formPR.idMarca ? `${API_BASE}/marcaspersonales/${formPR.idMarca}` : `${API_BASE}/marcaspersonales`;
      const method = formPR.idMarca ? 'PUT' : 'POST';

      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (res.ok) {
        alert("¡Récord Personal guardado en la bóveda! 🐺🏆");
        setMostrarFormPR(false);
        setFormPR({ idMarca: null, idEjercicio: '', valor: '', unidad: 'lbs', notas: '' });
        cargarMiCalendario(userId, fechaActual.getFullYear(), fechaActual.getMonth());
      }
    } catch (e) { alert("Error al guardar PR."); }
  };

  const handleEliminarPR = async (idMarca) => {
    if (!window.confirm("¿Seguro que deseas borrar este récord histórico?")) return;
    try {
      const res = await fetch(`${API_BASE}/marcaspersonales/${idMarca}`, { method: 'DELETE' });
      if (res.ok) {
        const userId = usuario.id || usuario.idUsuario || usuario.IdUsuario;
        cargarMiCalendario(userId, fechaActual.getFullYear(), fechaActual.getMonth());
      }
    } catch (e) { alert("Error al borrar PR."); }
  };

  const getDiasDelMes = (anio, mes) => new Date(anio, mes + 1, 0).getDate();
  const getPrimerDiaDelMes = (anio, mes) => new Date(anio, mes, 1).getDay();
  const diasEnMes = getDiasDelMes(fechaActual.getFullYear(), fechaActual.getMonth());
  const primerDia = getPrimerDiaDelMes(fechaActual.getFullYear(), fechaActual.getMonth());

  const cambiarMes = (direccion) => { setFechaActual(new Date(fechaActual.getFullYear(), fechaActual.getMonth() + direccion, 1)); setDiaSeleccionado(null); };
  const esMismoDia = (d1, d2) => d1 && d2 && d1.getDate() === d2.getDate() && d1.getMonth() === d2.getMonth() && d1.getFullYear() === d2.getFullYear();

  const renderCuadricula = () => {
    let dias = [];
    for (let i = 0; i < primerDia; i++) {
      dias.push(<div key={`empty-${i}`} className="cal-dia cal-dia--empty"></div>);
    }

    for (let dia = 1; dia <= diasEnMes; dia++) {
      const fechaIteracion = new Date(fechaActual.getFullYear(), fechaActual.getMonth(), dia);
      const seleccionado = esMismoDia(fechaIteracion, diaSeleccionado);
      const hoy = esMismoDia(fechaIteracion, new Date());

      const asistenciaHoy = datosMes.asistencias.find(a => esMismoDia(a.fecha, fechaIteracion));
      const wodHoy = datosMes.wods.find(w => esMismoDia(w.fechaProgramada, fechaIteracion));
      const prsHoy = datosMes.prs.filter(p => esMismoDia(p.fechaLogro, fechaIteracion));
      const eventoHoy = datosMes.eventos.find(e => {
        const dIter = new Date(fechaIteracion).setHours(0, 0, 0, 0);
        const dIni = new Date(e.fechaInicio).setHours(0, 0, 0, 0);
        const dFin = new Date(e.fechaFin).setHours(23, 59, 59, 999);
        return dIter >= dIni && dIter <= dFin;
      });
      const cumpleHoy = datosMes.cumples.find(c => c.dia === dia);
      const pagoHoy = datosMes.suscripcion && esMismoDia(datosMes.suscripcion.fechaVencimiento, fechaIteracion);

      dias.push(
        <div key={dia}
          onClick={() => {
            setDiaSeleccionado(fechaIteracion);
            setMostrarFormPR(false);
            if (eventoHoy) setModalAnunciosVisible(true);
          }}
          className={`cal-dia${seleccionado ? ' cal-dia--sel' : ''}${hoy && !seleccionado ? ' cal-dia--hoy' : ''}`}>

          <span className={`cal-dia-num${hoy ? ' cal-dia-num--hoy' : ''}`}>{dia}</span>

          <div className="cal-dia-dots">
            {pagoHoy && <span className="cal-dot cal-dot--green" title="Día de Pago"></span>}
            {asistenciaHoy?.estado === 'Asistió' && <span className="cal-dot cal-dot--gold" title="Asistencia"></span>}
            {asistenciaHoy?.estado === 'Faltó' && <span className="cal-dot cal-dot--red" title="Falta"></span>}
            {asistenciaHoy?.estado === 'Cancelada' && <span className="cal-dot cal-dot--blue" title="Racha Protegida"></span>}
            {wodHoy && !asistenciaHoy && <span className="cal-dot cal-dot--gray" title="WOD Publicado"></span>}
            {prsHoy.length > 0 && <span className="cal-dot cal-dot--trophy" title="PR Roto"></span>}
            {eventoHoy && <span className="cal-dot cal-dot--primary" title={eventoHoy.titulo}></span>}
            {cumpleHoy && <span className="cal-dot cal-dot--purple" title={`Cumple de ${cumpleHoy.nombre}`}></span>}
          </div>
        </div>
      );
    }
    return dias;
  };

  return (
    <div className="cal-atleta">

      {/* ── HEADER ── */}
      <header className="cal-header">
        <BackButton to="/user-panel" />
        <div className="cal-header-icon d-none d-sm-flex">
          <i className="fas fa-calendar-check"></i>
        </div>
        <div>
          <h1 className="cal-header-title mb-0">Mi <span>Agenda</span></h1>
          <p className="cal-header-sub mb-0">Tu bitácora de entrenamiento</p>
        </div>
      </header>

      <div className="container px-3 px-md-4 pb-5">

        {/* ── CALENDARIO ── */}
        <div className="cal-card">
          <div className="cal-card-header">
            <h4 className="cal-month-title">
              {meses[fechaActual.getMonth()]} <span className="cal-year-num">{fechaActual.getFullYear()}</span>
            </h4>
            <div className="cal-nav-btns">
              <button onClick={() => cambiarMes(-1)} className="cal-nav-btn"><i className="fas fa-chevron-left"></i></button>
              <button onClick={() => { setFechaActual(new Date()); setDiaSeleccionado(new Date()); }} className="cal-hoy-btn">Hoy</button>
              <button onClick={() => cambiarMes(1)} className="cal-nav-btn"><i className="fas fa-chevron-right"></i></button>
            </div>
          </div>

          <div className="cal-dow-row">
            {diasSemana.map(d => <div key={d} className="cal-dow">{d}</div>)}
          </div>
          <div className="cal-grid">
            {renderCuadricula()}
          </div>

          <div className="cal-leyenda">
            <span className="cal-leg-item"><span className="cal-dot cal-dot--gold"></span>Asistí</span>
            <span className="cal-leg-item"><span className="cal-dot cal-dot--red"></span>Falta</span>
            <span className="cal-leg-item"><span className="cal-dot cal-dot--blue"></span>Cancelada</span>
            <span className="cal-leg-item"><span className="cal-dot cal-dot--primary"></span>Evento</span>
            <span className="cal-leg-item"><span className="cal-dot cal-dot--purple"></span>Cumple</span>
            <span className="cal-leg-item"><span className="cal-dot cal-dot--green"></span>Pago</span>
            <span className="cal-leg-item"><span className="cal-dot cal-dot--trophy"></span>PR</span>
          </div>
        </div>

        {/* ── DETALLE DEL DÍA ── */}
        {diaSeleccionado && (
          <div className="cal-detail cal-fadein">

            <div className="cal-detail-header">
              <div className="cal-detail-date">
                <span className="cal-detail-day-num">{diaSeleccionado.getDate()}</span>
                <div>
                  <p className="cal-detail-mes-name">{meses[diaSeleccionado.getMonth()]}</p>
                  <p className="cal-detail-year-num">{diaSeleccionado.getFullYear()}</p>
                </div>
              </div>
              <span className="cal-detail-dow">{diasSemana[diaSeleccionado.getDay()]}</span>
            </div>

            {loading ? (
              <div className="cal-loading-inline"><div className="cal-spinner-sm"></div></div>
            ) : (
              <div className="cal-detail-body">

                {/* Pago */}
                {datosMes.suscripcion && esMismoDia(datosMes.suscripcion.fechaVencimiento, diaSeleccionado) && (
                  <div className="cal-event-card cal-event-card--green">
                    <div className="cal-event-icon cal-event-icon--green"><i className="fas fa-dollar-sign"></i></div>
                    <div className="cal-event-content">
                      <p className="cal-event-title">Día de Corte</p>
                      <p className="cal-event-desc">Mensualidad ${datosMes.suscripcion.totalAPagar} vence hoy</p>
                    </div>
                  </div>
                )}

                {/* Cumpleaños */}
                {datosMes.cumples.filter(c => c.dia === diaSeleccionado.getDate()).map((c, idx) => (
                  <div key={`cumple-${idx}`} className="cal-event-card cal-event-card--purple">
                    <div className="cal-event-icon cal-event-icon--purple"><i className="fas fa-birthday-cake"></i></div>
                    <div className="cal-event-content">
                      <p className="cal-event-title">Cumpleaños de {c.nombre}</p>
                      <p className="cal-event-desc">¡Prepárate para los burpees de regalo!</p>
                    </div>
                  </div>
                ))}

                {/* Eventos */}
                {datosMes.eventos.filter(e => {
                  const dIter = new Date(diaSeleccionado).setHours(0, 0, 0, 0);
                  const dIni = new Date(e.fechaInicio).setHours(0, 0, 0, 0);
                  const dFin = new Date(e.fechaFin).setHours(23, 59, 59, 999);
                  return dIter >= dIni && dIter <= dFin;
                }).map(ev => (
                  <div key={ev.idEvento} className={`cal-event-card ${ev.bloqueaClases ? 'cal-event-card--red' : 'cal-event-card--blue'}`}>
                    <div className={`cal-event-icon ${ev.bloqueaClases ? 'cal-event-icon--red' : 'cal-event-icon--blue'}`}>
                      <i className={`fas ${ev.bloqueaClases ? 'fa-lock' : 'fa-bullhorn'}`}></i>
                    </div>
                    <div className="cal-event-content">
                      <p className="cal-event-title">{ev.titulo}</p>
                      {ev.bloqueaClases && <span className="cal-badge cal-badge--red">Box Cerrado</span>}
                      {ev.descripcion && <p className="cal-event-desc" style={{ whiteSpace: 'pre-wrap' }}>{ev.descripcion}</p>}
                      {ev.requiereRSVP && (
                        <BotonSeguro onClick={() => handleToggleRSVP(ev.idEvento)}
                          className={`cal-rsvp-btn ${ev.yaConfirmo ? 'cal-rsvp-btn--cancel' : 'cal-rsvp-btn--confirm'}`}
                          textoProcesando={<><i className="fas fa-spinner fa-spin me-1" />Procesando...</>}>
                          {ev.yaConfirmo
                            ? <><i className="fas fa-times me-1"></i>Cancelar</>
                            : <><i className="fas fa-check me-1"></i>Confirmar</>}
                        </BotonSeguro>
                      )}
                    </div>
                  </div>
                ))}

                {/* Asistencia & WOD */}
                {(() => {
                  const asistenciaHoy = datosMes.asistencias.find(a => esMismoDia(a.fecha, diaSeleccionado));
                  const wodHoy = datosMes.wods.find(w => esMismoDia(w.fechaProgramada, diaSeleccionado));

                  if (!asistenciaHoy && !wodHoy && diaSeleccionado < new Date()) return (
                    <p className="cal-empty-day">Día de descanso — sin registro de entrenamiento.</p>
                  );

                  return (
                    <>
                      {asistenciaHoy && (
                        <div className={`cal-asistencia-card ${asistenciaHoy.estado === 'Asistió' ? 'cal-asistencia-card--gold' :
                            asistenciaHoy.estado === 'Faltó' ? 'cal-asistencia-card--red' :
                              'cal-asistencia-card--blue'}`}>
                          <div className="cal-asistencia-icon">
                            {asistenciaHoy.estado === 'Asistió' && <i className="fas fa-fire"></i>}
                            {asistenciaHoy.estado === 'Faltó' && <i className="fas fa-times"></i>}
                            {asistenciaHoy.estado === 'Cancelada' && <i className="fas fa-shield-alt"></i>}
                          </div>
                          <div className="cal-asistencia-content">
                            <p className="cal-asistencia-status">
                              {asistenciaHoy.estado === 'Asistió' && 'Entrenamiento Completado'}
                              {asistenciaHoy.estado === 'Faltó' && 'Falta · Strike'}
                              {asistenciaHoy.estado === 'Cancelada' && 'Racha Protegida'}
                            </p>
                            <p className="cal-asistencia-clase">{asistenciaHoy.nombreClase}</p>
                            {asistenciaHoy.estado === 'Asistió' && (
                              <button onClick={() => abrirModalCalificar(asistenciaHoy.idCoach)} className="cal-calificar-btn">
                                <i className="fas fa-star me-1"></i>Calificar
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                      {wodHoy && (
                        <div className="cal-wod-card">
                          <div className="cal-wod-icon"><i className="fas fa-dumbbell"></i></div>
                          <div>
                            <p className="cal-wod-title">WOD — {wodHoy.titulo}</p>
                            {wodHoy.metricaPrincipal && <p className="cal-wod-metrica">{wodHoy.metricaPrincipal}</p>}
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}

                {/* PRs */}
                {(() => {
                  const esFuturo = new Date(diaSeleccionado).setHours(0, 0, 0, 0) > new Date().setHours(0, 0, 0, 0);
                  return (
                    <div className="cal-pr-section">
                      <div className="cal-pr-header">
                        <p className="cal-pr-title"><i className="fas fa-trophy"></i>PRs del Día</p>
                        {!mostrarFormPR && !esFuturo && (
                          <button onClick={() => setMostrarFormPR(true)} className="cal-pr-add-btn">
                            <i className="fas fa-plus me-1"></i>Añadir
                          </button>
                        )}
                      </div>

                      {esFuturo && <p className="cal-empty-day">No puedes registrar récords en el futuro. 🔮</p>}

                      {mostrarFormPR && !esFuturo && (
                        <div className="cal-pr-form cal-fadein">
                          <p className="cal-pr-form-title">{formPR.idMarca ? 'Editar Récord' : 'Nuevo Récord'}</p>
                          <div className="row g-2 mb-2">
                            <div className="col-12">
                              <label className="cal-pr-label">Movimiento *</label>
                              <EjercicioOlimpicoPicker
                                ejercicios={listaEjercicios}
                                valor={formPR.idEjercicio}
                                onCambiar={v => setFormPR({ ...formPR, idEjercicio: v })}
                              />
                            </div>
                            <div className="col-6">
                              <label className="cal-pr-label">Valor</label>
                              <input type="number" className="cal-input" placeholder="Ej. 225" value={formPR.valor} onChange={e => setFormPR({ ...formPR, valor: e.target.value })} />
                            </div>
                            <div className="col-6">
                              <label className="cal-pr-label">Unidad</label>
                              <UnidadPRPicker
                                valor={formPR.unidad}
                                onCambiar={v => setFormPR({ ...formPR, unidad: v })}
                              />
                            </div>
                            <div className="col-12">
                              <label className="cal-pr-label">Notas (Opcional)</label>
                              <textarea className="cal-input" placeholder="Ej. Nuevo máximo, buen día..." rows="2" value={formPR.notas} onChange={e => setFormPR({ ...formPR, notas: e.target.value })}></textarea>
                            </div>
                          </div>
                          <div className="d-flex gap-2 mt-2">
                            <button onClick={() => { setMostrarFormPR(false); setFormPR({ idMarca: null, idEjercicio: '', valor: '', unidad: 'lbs', notas: '' }); }} className="cal-btn-cancel w-50">Cancelar</button>
                            <BotonSeguro onClick={handleGuardarPR} className="cal-btn-save w-50" textoProcesando={<><i className="fas fa-spinner fa-spin me-1" />Guardando...</>}>Guardar PR</BotonSeguro>
                          </div>
                        </div>
                      )}

                      {datosMes.prs.filter(p => esMismoDia(p.fechaLogro, diaSeleccionado)).length === 0 && !mostrarFormPR && !esFuturo && (
                        <p className="cal-empty-day">Sin récords registrados este día.</p>
                      )}

                      {datosMes.prs.filter(p => esMismoDia(p.fechaLogro, diaSeleccionado)).map(pr => (
                        <div key={pr.idMarca} className="cal-pr-item">
                          <div className="cal-pr-item-info">
                            <p className="cal-pr-nombre">{pr.nombreEjercicio || pr.ejercicio}</p>
                            <span className="cal-pr-valor">{pr.valor} <span className="cal-pr-unidad">{pr.unidad}</span></span>
                            {pr.notas && <p className="cal-pr-notas">"{pr.notas}"</p>}
                          </div>
                          <div className="cal-pr-actions">
                            <button onClick={() => { setFormPR({ ...pr, idEjercicio: pr.idEjercicio }); setMostrarFormPR(true); }} className="cal-icon-btn cal-icon-btn--edit"><i className="fas fa-edit"></i></button>
                            <BotonSeguro onClick={() => handleEliminarPR(pr.idMarca)} className="cal-icon-btn cal-icon-btn--del" textoProcesando=""><i className="fas fa-trash"></i></BotonSeguro>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}

              </div>
            )}
          </div>
        )}

      </div>

      {/* ── MODAL: CALIFICAR COACH ── */}
      {modalCalificarVisible && (
        <div className="cal-modal-overlay" onClick={() => setModalCalificarVisible(false)}>
          <div className="cal-modal" onClick={e => e.stopPropagation()}>
            <h4 className="cal-modal-title">¿Qué tal la clase?</h4>
            <p className="cal-modal-sub">Tu Coach valora tu retroalimentación.</p>
            <div className="cal-stars">
              {[1, 2, 3, 4, 5].map(num => (
                <i key={num}
                  className={`fas fa-star cal-star ${num <= formCalificar.estrellas ? 'cal-star--on' : 'cal-star--off'}`}
                  onClick={() => setFormCalificar({ ...formCalificar, estrellas: num })}>
                </i>
              ))}
            </div>
            <textarea className="cal-input mb-3" rows="3" placeholder="Comentario opcional... Ej: ¡Excelente clase!" value={formCalificar.comentario} onChange={e => setFormCalificar({ ...formCalificar, comentario: e.target.value })}></textarea>
            <BotonSeguro onClick={guardarCalificacion} className="cal-btn-submit" textoProcesando={<><i className="fas fa-spinner fa-spin me-1" />Enviando...</>}>
              <i className="fas fa-paper-plane me-1"></i>Enviar
            </BotonSeguro>
          </div>
        </div>
      )}

      {/* ── MODAL: ANUNCIOS DEL DÍA ── */}
      {modalAnunciosVisible && diaSeleccionado && (
        <div className="cal-modal-overlay" onClick={() => setModalAnunciosVisible(false)}>
          <div className="cal-anuncios-modal" onClick={e => e.stopPropagation()}>

            <div className="cal-anuncios-header">
              <div className="cal-anuncios-icono">
                <i className="fas fa-bullhorn"></i>
              </div>
              <div>
                <p className="cal-anuncios-titulo">Anuncios</p>
                <p className="cal-anuncios-fecha">
                  {diaSeleccionado.getDate()} de {meses[diaSeleccionado.getMonth()]} · {diaSeleccionado.getFullYear()}
                </p>
              </div>
              <button className="cal-anuncios-close" onClick={() => setModalAnunciosVisible(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="cal-anuncios-body">
              {datosMes.eventos.filter(e => {
                const dIter = new Date(diaSeleccionado).setHours(0, 0, 0, 0);
                const dIni = new Date(e.fechaInicio).setHours(0, 0, 0, 0);
                const dFin = new Date(e.fechaFin).setHours(23, 59, 59, 999);
                return dIter >= dIni && dIter <= dFin;
              }).map(ev => (
                <div key={ev.idEvento} className={`cal-anuncio-item ${ev.bloqueaClases ? 'cal-anuncio-item--cerrado' : 'cal-anuncio-item--normal'}`}>
                  <div className={`cal-anuncio-icon-box ${ev.bloqueaClases ? 'cal-anuncio-icon-box--red' : 'cal-anuncio-icon-box--blue'}`}>
                    <i className={`fas ${ev.bloqueaClases ? 'fa-lock' : 'fa-bullhorn'}`}></i>
                  </div>
                  <div className="cal-anuncio-content">
                    <p className="cal-anuncio-titulo">{ev.titulo}</p>
                    {ev.bloqueaClases && (
                      <span className="cal-anuncio-badge cal-anuncio-badge--red">Box Cerrado</span>
                    )}
                    {ev.descripcion && (
                      <p className="cal-anuncio-desc">{ev.descripcion}</p>
                    )}
                    {ev.requiereRSVP && (
                      <BotonSeguro
                        onClick={() => handleToggleRSVP(ev.idEvento)}
                        className={`cal-rsvp-btn ${ev.yaConfirmo ? 'cal-rsvp-btn--cancel' : 'cal-rsvp-btn--confirm'}`}
                        textoProcesando={<><i className="fas fa-spinner fa-spin me-1" />Procesando...</>}
                      >
                        {ev.yaConfirmo
                          ? <><i className="fas fa-times me-1"></i>Cancelar Asistencia</>
                          : <><i className="fas fa-check me-1"></i>Confirmar Asistencia</>}
                      </BotonSeguro>
                    )}
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}