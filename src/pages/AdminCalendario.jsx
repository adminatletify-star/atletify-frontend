import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BackButton from '../components/BackButton';
import RedGrayDatePicker from '../components/RedGrayDatePicker';
import TipoEventoPicker from '../components/TipoEventoPicker';
import BotonSeguro from '../components/BotonSeguro';
import AdminPizarra from '../components/AdminPizarra';
import '../assets/css/AdminCalendario.css';

const API_BASE = import.meta.env.VITE_API_URL;;

const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

export default function AdminCalendario() {
  const navigate = useNavigate();
  const [box, setBox] = useState(null);

  const [fechaActual, setFechaActual] = useState(new Date());
  const [diaSeleccionado, setDiaSeleccionado] = useState(new Date());

  const [vistaPrincipal, setVistaPrincipal] = useState('operacion');
  const [modoPanel, setModoPanel] = useState('agenda');
  const [loading, setLoading] = useState(false);
  const [listaAsistentes, setListaAsistentes] = useState({}); // Guarda { idEvento: [arreglo de nombres] }

  const [eventos, setEventos] = useState([]);
  const [excepciones, setExcepciones] = useState([]);
  const [cumpleanos, setCumpleanos] = useState([]); // 🎂 NUEVO
  const [clasesDelDia, setClasesDelDia] = useState([]);
  const [clasesBase, setClasesBase] = useState([]); // Clases recurrentes para el calendario

  const [listaAtletas, setListaAtletas] = useState([]);
  const [atletaSeleccionado, setAtletaSeleccionado] = useState(null);
  const [datosAtleta, setDatosAtleta] = useState(null);
  const [busqueda, setBusqueda] = useState('');

  // 📊 NUEVO: Estado para Inteligencia de Negocios
  const [metricas, setMetricas] = useState(null);
  const [diaPopup, setDiaPopup] = useState(null); // Popup de eventos al hacer click en una celda

  const getFechaLocalString = (fecha) => {
    const offset = fecha.getTimezoneOffset() * 60000;
    return new Date(fecha.getTime() - offset).toISOString().split('T')[0];
  };

  const initialFormEvento = {
    idEvento: null, titulo: '', descripcion: '', tipoEvento: 'Social',
    fechaInicio: getFechaLocalString(new Date()), fechaFin: getFechaLocalString(new Date()),
    esTodoElDia: true, horaInicio: '08:00', horaFin: '10:00',
    bloqueaClases: false, protegeRacha: true, esPublico: true, requiereRSVP: false
  };

  const cargarAsistentes = async (idEvento) => {
    // Si ya están visibles, cerramos la lista (Toggle visual)
    if (listaAsistentes[idEvento]) {
      const nuevaLista = { ...listaAsistentes };
      delete nuevaLista[idEvento];
      setListaAsistentes(nuevaLista);
      return;
    }
    // Si no, vamos a la base de datos por los chismosos
    try {
      const res = await fetch(`${API_BASE}/calendario/evento/${idEvento}/asistentes`);
      if (res.ok) {
        const data = await res.json();
        setListaAsistentes(prev => ({ ...prev, [idEvento]: data }));
      }
    } catch (e) { console.error(e); }
  };

  const [formEvento, setFormEvento] = useState(initialFormEvento);

  useEffect(() => {
    const b = JSON.parse(localStorage.getItem('box'));
    if (!b) { navigate('/login'); return; }
    setBox(b);
    cargarDatosDelMes(b.idBox, fechaActual.getFullYear(), fechaActual.getMonth());

    fetch(`${API_BASE}/usuarios/box/${b.idBox}/miembros`)
      .then(res => res.json())
      .then(data => setListaAtletas((data.miembros || []).filter(m => m.rol === 'Atleta' && m.activo)))
      .catch(e => console.error(e));

    const usuarioStorage = JSON.parse(localStorage.getItem('usuario'));
    fetch(`${API_BASE}/clases/box/${b.idBox}`)
      .then(res => res.json())
      .then(data => {
        const isCoachUser = usuarioStorage && (usuarioStorage.rol === 'Coach' || usuarioStorage.Rol === 'Coach');
        if (isCoachUser) {
          const userId = usuarioStorage.idUsuario || usuarioStorage.IdUsuario || usuarioStorage.id;
          setClasesBase(data.filter(c => c.idCoach === userId || c.IdCoach === userId));
        } else {
          setClasesBase(data); // Para Admin, tal vez mostrar todas o no mostrar ninguna
        }
      })
      .catch(e => console.error(e));
  }, [navigate, fechaActual]);

  useEffect(() => {
    if (box && diaSeleccionado && vistaPrincipal === 'operacion') {
      cargarClasesDelDia(box.idBox, diaSeleccionado);
    }
  }, [diaSeleccionado, vistaPrincipal]);

  useEffect(() => {
    if (box && vistaPrincipal === 'francotirador' && atletaSeleccionado) {
      cargarDatosFrancotirador(box.idBox, atletaSeleccionado.idUsuario, fechaActual.getFullYear(), fechaActual.getMonth());
    }
  }, [atletaSeleccionado, vistaPrincipal, fechaActual]);

  // 📊 NUEVO: Cargar Métricas al abrir la pestaña
  useEffect(() => {
    if (box && vistaPrincipal === 'metricas') {
      cargarMetricas(box.idBox, fechaActual.getFullYear(), fechaActual.getMonth());
    }
  }, [vistaPrincipal, fechaActual]);

  const cargarDatosDelMes = async (idBox, anio, mes) => {
    try {
      const res = await fetch(`${API_BASE}/calendario/box/${idBox}/mes/${anio}/${mes + 1}`);
      if (res.ok) {
        const data = await res.json();
        setEventos(data.eventos.map(e => ({ ...e, fechaInicio: new Date(e.fechaInicio), fechaFin: new Date(e.fechaFin) })));
        setExcepciones(data.excepciones.map(ex => ({ ...ex, fechaExacta: new Date(ex.fechaExacta) })));
        setCumpleanos(data.cumpleanos.map(c => ({ ...c, fechaVisual: new Date(c.fechaVisual) })));
      }
    } catch (error) { console.error(error); }
  };

  const cargarClasesDelDia = async (idBox, fechaObj) => {
    const fechaStr = fechaObj.toISOString().split('T')[0];
    try {
      const res = await fetch(`${API_BASE}/asistencias/box/${idBox}/fecha/${fechaStr}?idUsuario=0`);
      if (res.ok) setClasesDelDia(await res.json());
    } catch (error) { console.error(error); }
  };

  const cargarDatosFrancotirador = async (idBox, idUsuario, anio, mes) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/calendario/box/${idBox}/atleta/${idUsuario}/mes/${anio}/${mes + 1}`);
      if (res.ok) {
        const data = await res.json();
        if (data.suscripcion?.fechaVencimiento) data.suscripcion.fechaVencimiento = new Date(data.suscripcion.fechaVencimiento);
        data.asistencias = data.asistencias.map(a => ({ ...a, fecha: new Date(a.fecha) }));
        setDatosAtleta(data);
      }
    } catch (error) { console.error(error); }
    finally { setLoading(false); }
  };

  // 📊 NUEVO: Fetch de Métricas
  const cargarMetricas = async (idBox, anio, mes) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/calendario/box/${idBox}/metricas/${anio}/${mes + 1}`);
      if (res.ok) setMetricas(await res.json());
    } catch (error) { console.error(error); }
    finally { setLoading(false); }
  };

  const handleGuardarEvento = async () => {
    if (!formEvento.titulo) return alert("Ponle un título al evento.");
    let fInicioStr = formEvento.fechaInicio;
    let fFinStr = formEvento.fechaFin;

    if (formEvento.esTodoElDia) { fInicioStr += 'T00:00:00'; fFinStr += 'T23:59:59'; }
    else { fInicioStr += `T${formEvento.horaInicio}:00`; fFinStr += `T${formEvento.horaFin}:00`; }

    if (new Date(fFinStr) < new Date(fInicioStr)) return alert("Error: La fecha/hora de fin es anterior a la de inicio.");

    setLoading(true);
    try {
      const payload = {
        idEvento: formEvento.idEvento || 0, idBox: box.idBox, titulo: formEvento.titulo, descripcion: formEvento.descripcion,
        tipoEvento: formEvento.tipoEvento, fechaInicio: new Date(fInicioStr).toISOString(), fechaFin: new Date(fFinStr).toISOString(),
        esTodoElDia: formEvento.esTodoElDia, esPublico: formEvento.esPublico, requiereRSVP: formEvento.requiereRSVP,
        bloqueaClases: formEvento.bloqueaClases, protegeRacha: formEvento.protegeRacha
      };
      const res = await fetch(formEvento.idEvento ? `${API_BASE}/calendario/evento/${formEvento.idEvento}` : `${API_BASE}/calendario/evento`,
        { method: formEvento.idEvento ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });

      if (res.ok) {
        alert(formEvento.idEvento ? "¡Actualizado!" : "¡Agregado!");
        setFormEvento(initialFormEvento); setModoPanel('agenda');
        cargarDatosDelMes(box.idBox, fechaActual.getFullYear(), fechaActual.getMonth());
      }
    } catch (error) { alert("Error al guardar."); }
    finally { setLoading(false); }
  };

  const handleEditarEvento = (ev) => {
    const pad = (n) => n < 10 ? '0' + n : n;
    setFormEvento({
      idEvento: ev.idEvento, titulo: ev.titulo, descripcion: ev.descripcion || '', tipoEvento: ev.tipoEvento,
      fechaInicio: getFechaLocalString(ev.fechaInicio), fechaFin: getFechaLocalString(ev.fechaFin),
      esTodoElDia: ev.esTodoElDia !== undefined ? ev.esTodoElDia : true,
      horaInicio: `${pad(ev.fechaInicio.getHours())}:${pad(ev.fechaInicio.getMinutes())}`,
      horaFin: `${pad(ev.fechaFin.getHours())}:${pad(ev.fechaFin.getMinutes())}`,
      esPublico: ev.esPublico, requiereRSVP: ev.requiereRSVP, bloqueaClases: ev.bloqueaClases, protegeRacha: ev.protegeRacha
    });
    setModoPanel('nuevoEvento');
  };

  const handleEliminarEvento = async (idEvento) => {
    if (!window.confirm("¿Seguro?")) return;
    try {
      const res = await fetch(`${API_BASE}/calendario/evento/${idEvento}`, { method: 'DELETE' });
      if (res.ok) cargarDatosDelMes(box.idBox, fechaActual.getFullYear(), fechaActual.getMonth());
    } catch (error) { alert("Error."); }
  };

  const handleCancelarClase = async (idClase, nombreClase, cancelar) => {
    if (!window.confirm(`¿Seguro que deseas ${cancelar ? "cancelar" : "restaurar"} la clase de ${nombreClase}?`)) return;
    try {
      const payload = { idClase: idClase, fechaExacta: new Date(diaSeleccionado.setHours(12, 0, 0, 0)).toISOString(), estaCancelada: cancelar, motivo: cancelar ? "Emergencia / Clima" : "Restaurada", protegeRacha: cancelar };
      const res = await fetch(`${API_BASE}/calendario/excepcion-clase`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (res.ok) {
        alert(`¡Clase ${cancelar ? 'cancelada 🚫' : 'restaurada ✅'}!`);
        cargarDatosDelMes(box.idBox, fechaActual.getFullYear(), fechaActual.getMonth());
      }
    } catch (error) { alert("Error."); }
  };

  const getDiasDelMes = (anio, mes) => new Date(anio, mes + 1, 0).getDate();
  const getPrimerDiaDelMes = (anio, mes) => new Date(anio, mes, 1).getDay();
  const diasEnMes = getDiasDelMes(fechaActual.getFullYear(), fechaActual.getMonth());
  const primerDia = getPrimerDiaDelMes(fechaActual.getFullYear(), fechaActual.getMonth());

  const cambiarMes = (direccion) => { setFechaActual(new Date(fechaActual.getFullYear(), fechaActual.getMonth() + direccion, 1)); setDiaSeleccionado(null); };
  const esMismoDia = (d1, d2) => d1 && d2 && d1.getDate() === d2.getDate() && d1.getMonth() === d2.getMonth() && d1.getFullYear() === d2.getFullYear();

  // 📊 Función Helper para el Heatmap
  const renderHeatmap = () => {
    if (!metricas || metricas.heatmap.length === 0) return (
      <p className="ac-empty-text text-center p-4">No hay suficientes datos de asistencia este mes.</p>
    );

    const maxAsistencias = Math.max(...metricas.heatmap.map(h => h.cantidad)) || 1;
    const horasUnicas = [...new Set(metricas.heatmap.map(h => h.horaString))].sort();

    return (
      <div className="table-responsive">
        <table className="table table-dark table-bordered border-secondary border-opacity-25 text-center small mb-0" style={{ fontSize: '0.75rem' }}>
          <thead>
            <tr>
              <th style={{ background: 'var(--bg-elevated)', color: 'var(--secondary)', fontFamily: 'var(--font-heading-alt)', fontSize: '0.65rem', letterSpacing: '0.5px' }}>Hora / Día</th>
              {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => (
                <th key={i} style={{ background: 'var(--bg-elevated)', color: 'var(--secondary)', fontFamily: 'var(--font-heading-alt)', fontSize: '0.65rem' }}>{d}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {horasUnicas.map(hora => (
              <tr key={hora}>
                <td style={{ background: 'var(--bg-elevated)', fontFamily: 'var(--font-stats)', fontWeight: 700, color: 'var(--text-primary)' }}>{hora}</td>
                {[1, 2, 3, 4, 5, 6, 0].map(diaInt => {
                  const celda = metricas.heatmap.find(h => h.diaSemana === diaInt && h.horaString === hora);
                  const cant = celda ? celda.cantidad : 0;
                  const alpha = cant === 0 ? 0 : 0.15 + ((cant / maxAsistencias) * 0.85);
                  return (
                    <td key={diaInt} style={{ backgroundColor: `rgba(230, 57, 70, ${alpha})`, minWidth: '36px', height: '36px' }} title={`${cant} asistencias`}>
                      <span style={{ fontFamily: 'var(--font-stats)', fontWeight: 700, color: cant > 0 ? '#fff' : 'transparent' }}>{cant || ''}</span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderCuadricula = () => {
    let dias = [];
    for (let i = 0; i < primerDia; i++) {
      dias.push(<div key={`empty-${i}`} className="ac-day-cell ac-day-cell--empty ac-day-cell--no-cursor" />);
    }

    for (let dia = 1; dia <= diasEnMes; dia++) {
      const fechaIteracion = new Date(fechaActual.getFullYear(), fechaActual.getMonth(), dia);
      const seleccionado = esMismoDia(fechaIteracion, diaSeleccionado);
      const hoy = esMismoDia(fechaIteracion, new Date());

      let contenidoDia = null;

      if (vistaPrincipal === 'operacion') {
        const eventosDelDia = eventos.filter(e => {
          const dIter = new Date(fechaIteracion).setHours(0, 0, 0, 0);
          const dIni = new Date(e.fechaInicio).setHours(0, 0, 0, 0);
          const dFin = new Date(e.fechaFin).setHours(23, 59, 59, 999);
          return dIter >= dIni && dIter <= dFin;
        });
        const excepcionesDelDia = excepciones.filter(ex => esMismoDia(ex.fechaExacta, fechaIteracion));
        const cumplesHoy = cumpleanos.filter(c => esMismoDia(c.fechaVisual, fechaIteracion));
        
        const mapDias = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
        const diaLetra = mapDias[fechaIteracion.getDay()];
        const usuarioLS = JSON.parse(localStorage.getItem('usuario')) || {};
        const isCoach = usuarioLS.rol === 'Coach' || usuarioLS.Rol === 'Coach';
        const clasesDiaCoach = isCoach ? clasesBase.filter(c => {
          const fechaClase = c.fechaCreacion || c.FechaCreacion;
          if (fechaClase && new Date(fechaClase).setHours(0, 0, 0, 0) > fechaIteracion.setHours(0, 0, 0, 0)) return false;
          return (c.diasRecurrentes || c.DiasRecurrentes || '').includes(diaLetra);
        }) : [];

        contenidoDia = (
          <div className="ac-day-events">
            {cumplesHoy.map(c =>
              <div key={`c-${c.idUsuario}`} className="ac-day-event ac-day-event--birthday">
                <i className="fas fa-birthday-cake me-1" />{c.nombre}
              </div>
            )}
            {eventosDelDia.map(ev =>
              <div key={ev.idEvento} className={`ac-day-event ${ev.bloqueaClases ? 'ac-day-event--danger' : ev.esPublico ? 'ac-day-event--primary' : 'ac-day-event--secondary'}`}>
                {!ev.esPublico && <i className="fas fa-lock me-1" />}
                {ev.requiereRSVP && <i className="fas fa-envelope-open-text me-1" />}
                {!ev.esTodoElDia && <span className="me-1 opacity-75">{ev.fechaInicio.toTimeString().substring(0, 5)}</span>}
                {ev.titulo}
              </div>
            )}
            {clasesDiaCoach.length > 0 && (
              <div className="ac-day-event bg-dark text-light border border-secondary text-center" style={{ fontSize: '0.65rem' }}>
                <i className="fas fa-dumbbell me-1" />
                {clasesDiaCoach.length} clase{clasesDiaCoach.length !== 1 ? 's' : ''}
              </div>
            )}
            {excepcionesDelDia.length > 0 && !isCoach && (
              <div className="ac-day-event ac-day-event--exception">
                <i className="fas fa-exclamation-triangle me-1" />{excepcionesDelDia.length} Mod.
              </div>
            )}
          </div>
        );
      } else if (vistaPrincipal === 'francotirador' && datosAtleta) {
        const asistenciasHoy = datosAtleta.asistencias.filter(a => esMismoDia(a.fecha, fechaIteracion));
        const pagoHoy = datosAtleta.suscripcion && esMismoDia(datosAtleta.suscripcion.fechaVencimiento, fechaIteracion);

        contenidoDia = (
          <div className="ac-day-events">
            {pagoHoy && <div className="ac-day-event ac-day-event--primary"><i className="fas fa-dollar-sign me-1" />PAGO</div>}
            {asistenciasHoy.map((asist, idx) => (
              <div key={idx} className={`ac-day-event ${asist.estado === 'Asistió' ? 'ac-day-event--primary' : asist.estado === 'Faltó' ? 'ac-day-event--danger' : 'ac-day-event--secondary'}`}>
                {asist.estado === 'Asistió' ? <i className="fas fa-check me-1" /> : asist.estado === 'Faltó' ? <i className="fas fa-times me-1" /> : <i className="fas fa-clock me-1" />}
                {asist.nombreClase}
              </div>
            ))}
          </div>
        );
      }

      dias.push(
        <div
          key={dia}
          onClick={() => {
            if (vistaPrincipal === 'operacion') {
              setDiaSeleccionado(fechaIteracion); setModoPanel('agenda');
              setFormEvento({ ...initialFormEvento, fechaInicio: getFechaLocalString(fechaIteracion), fechaFin: getFechaLocalString(fechaIteracion) });
              // Si el día tiene eventos o cumpleaños, abrir popup
              const tieneEventos = eventos.some(e => {
                const dIter = new Date(fechaIteracion).setHours(0, 0, 0, 0);
                const dIni = new Date(e.fechaInicio).setHours(0, 0, 0, 0);
                const dFin = new Date(e.fechaFin).setHours(23, 59, 59, 999);
                return dIter >= dIni && dIter <= dFin;
              }) || cumpleanos.some(c => esMismoDia(c.fechaVisual, fechaIteracion));
              if (tieneEventos) setDiaPopup(fechaIteracion);
            }
          }}
          className={`ac-day-cell ${seleccionado && vistaPrincipal === 'operacion' ? 'ac-day-cell--selected' : ''} ${hoy && (!seleccionado || vistaPrincipal !== 'operacion') ? 'ac-day-cell--today' : ''} ${vistaPrincipal !== 'operacion' ? 'ac-day-cell--no-cursor' : ''}`}
        >
          <span className={hoy ? 'ac-day-number ac-day-number--today' : 'ac-day-number'}>{dia}</span>
          {contenidoDia}
        </div>
      );
    }
    return dias;
  };

  return (
    <div className="ac-page">

      {/* ── HEADER STICKY ── */}
      <header className="ac-header">
        <div className="d-flex align-items-center justify-content-between gap-3">
          <div className="d-flex align-items-center gap-3">
            <BackButton to="/admin-box-panel" />
            <div className="ac-header-icon d-none d-sm-flex">
              <i className="fas fa-calendar-alt" />
            </div>
            <h1 className="ac-header-title">
              Centro de Control <span>Temporal</span>
            </h1>
          </div>
          {box && <span className="ac-badge-box d-none d-md-inline-flex">{box.nombre}</span>}
        </div>
      </header>

      {/* ── BARRA DE TABS ── */}
      <div className="ac-tabs-bar">
        <div className="container-fluid px-3 px-md-4">
          <div className="d-flex gap-1 gap-sm-2 py-2">
            <button
              onClick={() => { setVistaPrincipal('operacion'); setAtletaSeleccionado(null); }}
              className={`ac-tab-btn ${vistaPrincipal === 'operacion' ? 'ac-tab-btn--active' : ''}`}
            >
              <i className="fas fa-cogs" /><span className="d-none d-sm-inline"> Operación</span>
            </button>
            <button
              onClick={() => setVistaPrincipal('francotirador')}
              className={`ac-tab-btn ac-tab-btn--radar ${vistaPrincipal === 'francotirador' ? 'ac-tab-btn--active' : ''}`}
            >
              <i className="fas fa-crosshairs" /><span className="d-none d-sm-inline"> Radar de Atleta</span>
            </button>
            <button
              onClick={() => setVistaPrincipal('metricas')}
              className={`ac-tab-btn ac-tab-btn--intel ${vistaPrincipal === 'metricas' ? 'ac-tab-btn--active' : ''}`}
            >
              <i className="fas fa-chart-line" /><span className="d-none d-sm-inline"> Inteligencia</span>
            </button>
            <button
              onClick={() => { setVistaPrincipal('pizarra'); setAtletaSeleccionado(null); }}
              className={`ac-tab-btn ac-tab-btn--pizarra ${vistaPrincipal === 'pizarra' ? 'ac-tab-btn--active' : ''}`}
            >
              <i className="fas fa-trophy" /><span className="d-none d-sm-inline"> Pizarra</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── CONTENIDO ── */}
      <div className="container-fluid px-3 px-md-4 py-4">

        {/* =====================================================
            VISTAS: OPERACIÓN Y FRANCOTIRADOR (con Calendario)
            ===================================================== */}
        {(vistaPrincipal === 'operacion' || vistaPrincipal === 'francotirador') && (
          <div className="row g-4">

            {/* ── CALENDARIO ── */}
            <div className="col-12 col-xl-8">
              <div className="ac-panel h-100">

                {/* Navegación de mes */}
                <div className="d-flex justify-content-between align-items-center mb-4 gap-2 flex-wrap">
                  <h2 className="ac-mes-titulo mb-0">
                    {meses[fechaActual.getMonth()]}
                    <span className="ac-mes-anio"> {fechaActual.getFullYear()}</span>
                  </h2>
                  <div className="d-flex gap-2 align-items-center">
                    <button onClick={() => cambiarMes(-1)} className="ac-nav-btn" aria-label="Mes anterior">
                      <i className="fas fa-chevron-left" />
                    </button>
                    <button
                      onClick={() => { setFechaActual(new Date()); setDiaSeleccionado(new Date()); }}
                      className="ac-hoy-btn"
                    >
                      Hoy
                    </button>
                    <button onClick={() => cambiarMes(1)} className="ac-nav-btn" aria-label="Mes siguiente">
                      <i className="fas fa-chevron-right" />
                    </button>
                  </div>
                </div>

                {/* Cuadrícula */}
                <div className="ac-grid">
                  {diasSemana.map(d => (
                    <div key={d} className="ac-grid-header">{d}</div>
                  ))}
                  {renderCuadricula()}
                </div>
              </div>
            </div>

            {/* ── PANEL LATERAL ── */}
            <div className="col-12 col-xl-4">
              <div className="ac-panel h-100 d-flex flex-column">

                {/* PANEL: OPERACIÓN */}
                {vistaPrincipal === 'operacion' && (
                  diaSeleccionado ? (
                    <>
                      <div className="ac-panel-header mb-4">
                        <div>
                          <h4 className="ac-panel-title mb-0">
                            {diaSeleccionado.getDate()} de {meses[diaSeleccionado.getMonth()]}
                          </h4>
                          <span className="ac-panel-sub">Gestión Diaria</span>
                        </div>
                        {modoPanel !== 'agenda' && (
                          <button onClick={() => setModoPanel('agenda')} className="ac-back-panel-btn">
                            <i className="fas fa-arrow-left" /> Volver
                          </button>
                        )}
                      </div>

                      {/* SUB-PANEL: AGENDA */}
                      {modoPanel === 'agenda' && (
                        <div className="flex-grow-1 overflow-auto pe-1">
                          <div className="d-flex gap-2 mb-4">
                            <button
                              onClick={() => {
                                setFormEvento({ ...initialFormEvento, fechaInicio: getFechaLocalString(diaSeleccionado), fechaFin: getFechaLocalString(diaSeleccionado) });
                                setModoPanel('nuevoEvento');
                              }}
                              className="ac-btn-primary flex-grow-1"
                            >
                              <i className="fas fa-plus-circle" /> Evento / Tarea
                            </button>
                            <button
                              onClick={() => { cargarClasesDelDia(box.idBox, diaSeleccionado); setModoPanel('cancelarClase'); }}
                              className="ac-btn-danger"
                              title="Emergencias"
                            >
                              <i className="fas fa-cloud-showers-heavy" />
                            </button>
                          </div>

                          {/* Cumpleaños */}
                          {cumpleanos.filter(c => esMismoDia(c.fechaVisual, diaSeleccionado)).map(c => (
                            <div key={`cpanel-${c.idUsuario}`} className="ac-birthday-card mb-3">
                              <i className="fas fa-birthday-cake ac-birthday-icon" />
                              <div>
                                <div className="ac-event-titulo">Cumpleaños de {c.nombre}</div>
                                <p className="ac-event-sub mb-0">¡Prepárale un WOD de regalo! 🎁</p>
                              </div>
                            </div>
                          ))}

                          {/* Clases Programadas */}
                          <p className="ac-section-label"><i className="fas fa-dumbbell" /> Clases Programadas</p>
                          {(() => {
                            const mapDias = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
                            const diaSelLetra = mapDias[new Date(diaSeleccionado).getDay()];
                            const clasesAgenda = clasesBase.filter(c => {
                              const fechaClase = c.fechaCreacion || c.FechaCreacion;
                              if (fechaClase && new Date(fechaClase).setHours(0, 0, 0, 0) > new Date(diaSeleccionado).setHours(0, 0, 0, 0)) return false;
                              return (c.diasRecurrentes || c.DiasRecurrentes || '').includes(diaSelLetra);
                            });
                            
                            return clasesAgenda.length === 0 ? (
                              <p className="ac-empty-text fst-italic ms-3 mb-4">No hay clases este día.</p>
                            ) : (
                              <div className="mb-4">
                                {clasesAgenda.map(clase => {
                                  const cancelada = excepciones.some(ex => esMismoDia(ex.fechaExacta, diaSeleccionado) && (ex.idClase === clase.idClase || ex.idClase === clase.IdClase) && ex.estaCancelada);
                                  return (
                                    <div key={`agenda-clase-${clase.idClase || clase.IdClase}`} className={`ac-event-card mb-2 ${cancelada ? 'ac-event-card--danger text-decoration-line-through opacity-75' : 'bg-dark text-light border border-secondary'}`}>
                                      <div className="d-flex justify-content-between align-items-center">
                                        <div className="fw-bold">
                                          <i className="fas fa-dumbbell me-2" style={{ color: 'var(--accent)' }} />
                                          {clase.nombre || clase.Nombre}
                                          {cancelada && ' (Cancelada)'}
                                        </div>
                                        <span className="badge bg-secondary">
                                          {clase.horarioInicio?.substring(0, 5)} - {clase.horarioFin?.substring(0, 5)}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })()}

                          {/* Eventos del día */}
                          <p className="ac-section-label"><i className="fas fa-flag" /> Eventos y Recordatorios</p>
                          {eventos.filter(e => {
                            const dIter = new Date(diaSeleccionado).setHours(0, 0, 0, 0);
                            const dIni = new Date(e.fechaInicio).setHours(0, 0, 0, 0);
                            const dFin = new Date(e.fechaFin).setHours(23, 59, 59, 999);
                            return dIter >= dIni && dIter <= dFin;
                          }).length === 0 ? (
                            <p className="ac-empty-text fst-italic ms-3">Agenda limpia.</p>
                          ) : (
                            eventos.filter(e => {
                              const dIter = new Date(diaSeleccionado).setHours(0, 0, 0, 0);
                              const dIni = new Date(e.fechaInicio).setHours(0, 0, 0, 0);
                              const dFin = new Date(e.fechaFin).setHours(23, 59, 59, 999);
                              return dIter >= dIni && dIter <= dFin;
                            }).map(ev => (
                              <div
                                key={ev.idEvento}
                                className={`ac-event-card mb-3 ${ev.bloqueaClases ? 'ac-event-card--danger' : ev.esPublico ? 'ac-event-card--primary' : 'ac-event-card--secondary'}`}
                              >
                                <div className="d-flex justify-content-between align-items-start mb-1 gap-2">
                                  <h6 className="ac-event-titulo mb-0">
                                    {!ev.esPublico && <i className="fas fa-lock text-secondary me-2" title="Privado" />}
                                    {ev.titulo}
                                  </h6>
                                  <div className="d-flex gap-1 align-items-center flex-shrink-0">
                                    {ev.bloqueaClases && <span className="ac-badge-danger">Box Cerrado</span>}
                                    <button onClick={() => handleEditarEvento(ev)} className="ac-icon-btn ac-icon-btn--edit"><i className="fas fa-edit" /></button>
                                    <BotonSeguro onClick={() => handleEliminarEvento(ev.idEvento)} className="ac-icon-btn ac-icon-btn--delete" textoProcesando=""><i className="fas fa-trash" /></BotonSeguro>
                                  </div>
                                </div>

                                {!ev.esTodoElDia && (
                                  <p className="ac-event-hora mb-0">
                                    <i className="far fa-clock" />
                                    {ev.fechaInicio.toTimeString().substring(0, 5)} — {ev.fechaFin.toTimeString().substring(0, 5)}
                                  </p>
                                )}
                                {ev.descripcion && (
                                  <p className="ac-event-desc mt-2 mb-0" style={{ whiteSpace: 'pre-wrap' }}>{ev.descripcion}</p>
                                )}

                                <div className="d-flex gap-2 flex-wrap mt-2">
                                  <span className="ac-tag">{ev.tipoEvento}</span>
                                  {ev.requiereRSVP && (
                                    <span className="ac-tag ac-tag--info">
                                      <i className="fas fa-envelope-open-text me-1" />Requiere RSVP
                                    </span>
                                  )}
                                </div>

                                {ev.requiereRSVP && (
                                  <div className="mt-3 pt-2" style={{ borderTop: '1px solid var(--border)' }}>
                                    <button onClick={() => cargarAsistentes(ev.idEvento)} className="ac-btn-secondary w-100">
                                      <i className="fas fa-users" /> Ver Confirmados
                                    </button>
                                    {listaAsistentes[ev.idEvento] && (
                                      <div className="ac-asistentes-panel mt-2">
                                        {listaAsistentes[ev.idEvento].length === 0 ? (
                                          <span className="ac-empty-text fst-italic">Nadie ha confirmado aún. 🦗</span>
                                        ) : (
                                          <div className="d-flex flex-column gap-2">
                                            {listaAsistentes[ev.idEvento].map((a, i) => (
                                              <div key={a.idUsuario} className="d-flex align-items-center gap-2 pb-1" style={{ borderBottom: '1px solid var(--border)' }}>
                                                <span className="ac-rank-num">{i + 1}.</span>
                                                <i className="fas fa-check-circle" style={{ color: 'var(--success)' }} />
                                                <span className="ac-atleta-nombre">{a.nombre}</span>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      )}

                      {/* SUB-PANEL: NUEVO / EDITAR EVENTO */}
                      {modoPanel === 'nuevoEvento' && (
                        <div className="flex-grow-1 overflow-auto pe-1">
                          <h5 className="ac-form-title mb-4">
                            <i className="fas fa-magic" />
                            {formEvento.idEvento ? 'Editar Evento' : 'Crear Evento / Tarea'}
                          </h5>
                          <form>
                            <div className="mb-3">
                              <label className="ac-label">Título</label>
                              <input
                                type="text"
                                className="ac-input"
                                value={formEvento.titulo}
                                onChange={e => setFormEvento({ ...formEvento, titulo: e.target.value })}
                                placeholder="Ej. Murph Day, Pedir Agua..."
                              />
                            </div>

                            <div className="ac-toggle-group mb-3">
                              <div className="form-check form-switch mb-3">
                                <input className="form-check-input" type="checkbox" checked={formEvento.esTodoElDia} onChange={e => setFormEvento({ ...formEvento, esTodoElDia: e.target.checked })} />
                                <label className="form-check-label ac-switch-label" style={{ color: 'var(--accent)' }}>Evento de todo el día</label>
                              </div>
                              <div className="row g-2 mb-3">
                                <div className="col-6">
                                  <label className="ac-label">Fecha Inicio</label>
                                  <RedGrayDatePicker
                                    value={formEvento.fechaInicio}
                                    onChange={v => setFormEvento({ ...formEvento, fechaInicio: v || formEvento.fechaInicio })}
                                    placeholder="Inicio"
                                  />
                                </div>
                                <div className="col-6">
                                  <label className="ac-label">Fecha Fin</label>
                                  <RedGrayDatePicker
                                    value={formEvento.fechaFin}
                                    onChange={v => setFormEvento({ ...formEvento, fechaFin: v || formEvento.fechaFin })}
                                    placeholder="Fin"
                                    min={formEvento.fechaInicio}
                                  />
                                </div>
                              </div>
                              {!formEvento.esTodoElDia && (
                                <div className="row g-2">
                                  <div className="col-6">
                                    <label className="ac-label">Hora Inicio</label>
                                    <input type="time" className="ac-input text-center" value={formEvento.horaInicio} onChange={e => setFormEvento({ ...formEvento, horaInicio: e.target.value })} />
                                  </div>
                                  <div className="col-6">
                                    <label className="ac-label">Hora Fin</label>
                                    <input type="time" className="ac-input text-center" value={formEvento.horaFin} onChange={e => setFormEvento({ ...formEvento, horaFin: e.target.value })} />
                                  </div>
                                </div>
                              )}
                            </div>

                            <div className="mb-3">
                              <label className="ac-label">Tipo</label>
                              <TipoEventoPicker
                                valor={formEvento.tipoEvento}
                                onCambiar={v => setFormEvento({ ...formEvento, tipoEvento: v })}
                              />
                            </div>

                            <div className="mb-3">
                              <label className="ac-label">Descripción / Detalles</label>
                              <textarea
                                className="ac-input ac-textarea"
                                rows="2"
                                value={formEvento.descripcion}
                                onChange={e => setFormEvento({ ...formEvento, descripcion: e.target.value })}
                                placeholder="Instrucciones..."
                              />
                            </div>

                            <div className="ac-toggle-group mb-4">
                              <div className="form-check form-switch mb-3">
                                <input className="form-check-input" type="checkbox" checked={formEvento.esPublico} onChange={e => setFormEvento({ ...formEvento, esPublico: e.target.checked })} disabled={formEvento.bloqueaClases} />
                                <label className="form-check-label ac-switch-label">Público (Visible en la App)</label>
                              </div>
                              {formEvento.esPublico && (
                                <div className="form-check form-switch mb-3">
                                  <input className="form-check-input" type="checkbox" checked={formEvento.requiereRSVP} onChange={e => setFormEvento({ ...formEvento, requiereRSVP: e.target.checked })} />
                                  <label className="form-check-label ac-switch-label" style={{ color: 'var(--accent-cool)' }}>Requiere Confirmación (RSVP)</label>
                                </div>
                              )}
                              <div className="form-check form-switch">
                                <input className="form-check-input" type="checkbox" checked={formEvento.bloqueaClases}
                                  onChange={e => {
                                    const cierraBox = e.target.checked;
                                    setFormEvento({ ...formEvento, bloqueaClases: cierraBox, esPublico: cierraBox ? true : formEvento.esPublico });
                                  }}
                                />
                                <label className="form-check-label ac-switch-label" style={{ color: 'var(--danger)' }}>Cerrar el Box (Bloquear clases)</label>
                              </div>
                            </div>

                            <BotonSeguro
                              onClick={handleGuardarEvento}
                              className="ac-btn-save w-100"
                              textoProcesando={<><i className="fas fa-spinner fa-spin me-2" />Guardando...</>}
                            >
                              <i className="fas fa-save me-2" />Guardar en BD
                            </BotonSeguro>
                          </form>
                        </div>
                      )}

                      {/* SUB-PANEL: CANCELAR CLASE */}
                      {modoPanel === 'cancelarClase' && (
                        <div className="flex-grow-1 overflow-auto pe-1">
                          <h5 className="ac-form-title mb-2" style={{ color: 'var(--danger)' }}>
                            <i className="fas fa-exclamation-triangle" /> Emergencia Operativa
                          </h5>
                          <p className="ac-empty-text mb-4">Cancela clases específicas o restáuralas si el clima mejora.</p>
                          {clasesDelDia.length === 0 ? (
                            <p className="ac-empty-text text-center mt-3">No hay clases programadas para este día.</p>
                          ) : (
                            clasesDelDia.map(clase => {
                              const estaCancelada = excepciones.find(ex => ex.idClase === clase.idClase && esMismoDia(ex.fechaExacta, diaSeleccionado))?.estaCancelada;
                              return (
                                <div key={clase.idClase} className={`ac-clase-card mb-3 ${estaCancelada ? 'ac-clase-card--cancelada' : ''}`}>
                                  <span className={`ac-event-titulo d-block mb-2 ${estaCancelada ? 'text-decoration-line-through' : ''}`}>
                                    {String(clase.horaInicio || clase.horarioInicio || '').substring(0, 5)} — {clase.nombre}
                                  </span>
                                  {!estaCancelada ? (
                                    <BotonSeguro onClick={() => handleCancelarClase(clase.idClase, clase.nombre, true)} className="ac-btn-outline-danger w-100" textoProcesando="Cancelando...">
                                      <i className="fas fa-ban me-1" /> Cancelar clase
                                    </BotonSeguro>
                                  ) : (
                                    <BotonSeguro onClick={() => handleCancelarClase(clase.idClase, clase.nombre, false)} className="ac-btn-outline-success w-100" textoProcesando="Restaurando...">
                                      <i className="fas fa-undo me-1" /> Restaurar clase
                                    </BotonSeguro>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="h-100 d-flex flex-column justify-content-center align-items-center text-center ac-empty-state">
                      <i className="far fa-calendar-check mb-3" />
                      <p>Selecciona un día en el calendario para operar.</p>
                    </div>
                  )
                )}

                {/* PANEL: FRANCOTIRADOR */}
                {vistaPrincipal === 'francotirador' && (
                  <div className="flex-grow-1 overflow-auto d-flex flex-column">
                    <h5 className="ac-form-title mb-4">
                      <i className="fas fa-search" /> Radar de Atleta
                    </h5>
                    <div className="ac-search-wrap mb-4">
                      <i className="fas fa-search ac-search-icon" />
                      <input
                        type="text"
                        className="ac-input ac-search-input"
                        placeholder="Buscar lobo..."
                        value={busqueda}
                        onChange={e => setBusqueda(e.target.value)}
                      />
                    </div>

                    {!atletaSeleccionado ? (
                      <div className="flex-grow-1 overflow-auto d-flex flex-column gap-2">
                        {listaAtletas.filter(a => a.nombre.toLowerCase().includes(busqueda.toLowerCase())).slice(0, 10).map(a => (
                          <button key={a.idUsuario} onClick={() => setAtletaSeleccionado(a)} className="ac-atleta-btn">
                            <div className="ac-atleta-avatar">{a.nombre.charAt(0)}</div>
                            <div className="text-truncate">
                              <div className="ac-atleta-nombre">{a.nombre}</div>
                              <div className="ac-atleta-correo">{a.correo}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="flex-grow-1 overflow-auto">
                        <button
                          onClick={() => { setAtletaSeleccionado(null); setDatosAtleta(null); setBusqueda(''); }}
                          className="ac-back-panel-btn mb-4"
                        >
                          <i className="fas fa-arrow-left" /> Buscar otro
                        </button>
                        {loading ? (
                          <div className="text-center py-4"><div className="ac-spinner" style={{ margin: '0 auto' }} /></div>
                        ) : datosAtleta && (
                          <>
                            <h6 className="d-flex align-items-center gap-2 mb-4 ac-atleta-nombre">
                              <i className="fas fa-user-circle fs-4" style={{ color: 'var(--accent-cool)' }} />
                              {datosAtleta.atleta.nombre}
                            </h6>
                            <div className="row g-3 mb-4">
                              <div className="col-6">
                                <div className="ac-kpi-card text-center">
                                  <i className="fas fa-fire ac-kpi-icon" style={{ color: 'var(--accent)' }} />
                                  <div className="ac-kpi-valor">{datosAtleta.atleta.rachaActual}</div>
                                  <div className="ac-kpi-label">Racha (Días)</div>
                                </div>
                              </div>
                              <div className="col-6">
                                <div className="ac-kpi-card text-center">
                                  <i className="fas fa-times-circle ac-kpi-icon" style={{ color: 'var(--danger)' }} />
                                  <div className="ac-kpi-valor">{datosAtleta.atleta.strikesDelMes}</div>
                                  <div className="ac-kpi-label">Strikes del Mes</div>
                                </div>
                              </div>
                            </div>
                            <p className="ac-section-label"><i className="fas fa-money-bill-wave" /> Estado Financiero</p>
                            <div className={`ac-financiero-card ${datosAtleta.suscripcion?.venceEsteMes ? 'ac-financiero-card--warning' : datosAtleta.suscripcion ? 'ac-financiero-card--ok' : 'ac-financiero-card--danger'}`}>
                              <div className={`ac-financiero-icon ${datosAtleta.suscripcion ? 'ac-financiero-icon--ok' : 'ac-financiero-icon--danger'}`}>
                                <i className={`fas ${datosAtleta.suscripcion ? 'fa-check' : 'fa-times'}`} />
                              </div>
                              <div>
                                {datosAtleta.suscripcion ? (
                                  <>
                                    <p className="ac-event-titulo mb-1">
                                      Vencimiento: <span style={{ color: 'var(--accent-cool)' }}>{datosAtleta.suscripcion.fechaVencimiento.toLocaleDateString()}</span>
                                    </p>
                                    <p className="ac-event-sub mb-0">
                                      Mensualidad: <span style={{ color: 'var(--success)' }}>${datosAtleta.suscripcion.totalAPagar}</span>
                                    </p>
                                  </>
                                ) : (
                                  <p className="ac-event-titulo mb-0" style={{ color: 'var(--danger)' }}>Sin membresía activa.</p>
                                )}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}

              </div>
            </div>

          </div>
        )}

        {/* =====================================================
            VISTA: INTELIGENCIA DE NEGOCIOS (MÉTRICAS)
            ===================================================== */}
        {vistaPrincipal === 'metricas' && (
          <div>
            <div className="d-flex justify-content-between align-items-center mb-4 gap-3 flex-wrap">
              <h2 className="ac-mes-titulo mb-0">
                Inteligencia Operativa
                <span className="ac-mes-anio"> | {meses[fechaActual.getMonth()]} {fechaActual.getFullYear()}</span>
              </h2>
              <div className="d-flex gap-2 align-items-center">
                <button onClick={() => cambiarMes(-1)} className="ac-nav-btn"><i className="fas fa-chevron-left" /></button>
                <button onClick={() => setFechaActual(new Date())} className="ac-hoy-btn">Mes Actual</button>
                <button onClick={() => cambiarMes(1)} className="ac-nav-btn"><i className="fas fa-chevron-right" /></button>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-5"><div className="ac-spinner" style={{ margin: '0 auto' }} /></div>
            ) : metricas && (
              <div className="row g-4">

                {/* KPIs */}
                <div className="col-12">
                  <div className="row g-3">
                    <div className="col-12 col-md-4">
                      <div className="ac-kpi-card-big">
                        <div className="ac-kpi-card-icon" style={{ background: 'rgba(79,195,247,0.12)', color: 'var(--accent-cool)' }}>
                          <i className="fas fa-user-check" />
                        </div>
                        <div>
                          <div className="ac-kpi-big-valor">{metricas.kpis.totalAsistencias}</div>
                          <div className="ac-kpi-label">Asistencias Totales</div>
                        </div>
                      </div>
                    </div>
                    <div className="col-12 col-md-4">
                      <div className="ac-kpi-card-big">
                        <div className="ac-kpi-card-icon" style={{ background: 'rgba(230,57,70,0.12)', color: 'var(--danger)' }}>
                          <i className="fas fa-user-times" />
                        </div>
                        <div>
                          <div className="ac-kpi-big-valor">{metricas.kpis.totalFaltas}</div>
                          <div className="ac-kpi-label">Faltas (Strikes)</div>
                        </div>
                      </div>
                    </div>
                    <div className="col-12 col-md-4">
                      <div className="ac-kpi-card-big">
                        <div className="ac-kpi-card-icon" style={{ background: 'rgba(245,166,35,0.12)', color: 'var(--accent)' }}>
                          <i className="fas fa-cloud-showers-heavy" />
                        </div>
                        <div>
                          <div className="ac-kpi-big-valor">{metricas.kpis.clasesCanceladas}</div>
                          <div className="ac-kpi-label">Clases Canceladas</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Heatmap */}
                <div className="col-12 col-xl-8">
                  <div className="ac-panel h-100">
                    <h5 className="ac-form-title mb-1">
                      <i className="fas fa-fire-alt" style={{ color: 'var(--primary)' }} /> Mapa de Tráfico (Heatmap)
                    </h5>
                    <p className="ac-empty-text mb-4">Identifica los horarios saturados y los muertos para optimizar las horas de tu Staff.</p>
                    {renderHeatmap()}
                  </div>
                </div>

                {/* Columna derecha */}
                <div className="col-12 col-xl-4 d-flex flex-column gap-4">

                  {/* Top Lobos */}
                  <div className="ac-panel">
                    <h5 className="ac-form-title mb-1" style={{ color: 'var(--accent)' }}>
                      <i className="fas fa-trophy" /> Top Lobos (Lealtad)
                    </h5>
                    <p className="ac-empty-text mb-4">Atletas con 0 faltas y rachas altas.</p>
                    {metricas.topLobos.length === 0 ? (
                      <p className="ac-empty-text text-center">Nadie califica aún este mes.</p>
                    ) : (
                      <div className="d-flex flex-column gap-3">
                        {metricas.topLobos.map((lobo, idx) => (
                          <div key={lobo.idUsuario} className="ac-lobo-row">
                            <div className="ac-lobo-rank">{idx + 1}</div>
                            <div className="ac-atleta-nombre flex-grow-1 text-truncate">{lobo.nombre}</div>
                            <span className="ac-badge-accent"><i className="fas fa-fire me-1" />{lobo.rachaActual}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Radar de Deserción */}
                  <div className="ac-panel">
                    <h5 className="ac-form-title mb-1" style={{ color: 'var(--danger)' }}>
                      <i className="fas fa-ghost" /> Radar de Deserción
                    </h5>
                    <p className="ac-empty-text mb-4">Atletas con 3 o más faltas (Strikes).</p>
                    {metricas.fantasmas.length === 0 ? (
                      <p className="ac-empty-text text-center">Excelente. No hay fantasmas este mes.</p>
                    ) : (
                      <div className="d-flex flex-column gap-3">
                        {metricas.fantasmas.map(fantasma => (
                          <div key={fantasma.idUsuario} className="d-flex align-items-center justify-content-between gap-2 pb-2" style={{ borderBottom: '1px solid var(--border)' }}>
                            <div className="text-truncate flex-grow-1">
                              <div className="ac-atleta-nombre text-truncate">{fantasma.nombre}</div>
                              <span className="ac-event-sub" style={{ color: 'var(--danger)' }}>
                                <i className="fas fa-times-circle me-1" />{fantasma.strikesDelMes} Faltas
                              </span>
                            </div>
                            <a
                              href={`https://wa.me/${fantasma.telefono?.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="ac-wa-btn"
                              title="Mandar WhatsApp de rescate"
                            >
                              <i className="fab fa-whatsapp" />
                            </a>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>
              </div>
            )}
          </div>
        )}

        {/* =====================================================
            VISTA: PIZARRA (Ranking por WOD)
            ===================================================== */}
        {vistaPrincipal === 'pizarra' && box && (
          <AdminPizarra box={box} />
        )}

      </div>

      {/* ── POPUP DE EVENTOS DEL DÍA ── */}
      {diaPopup && (
        <div className="ac-popup-overlay" onClick={() => setDiaPopup(null)}>
          <div className="ac-popup" onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="ac-popup-header">
              <div>
                <h4 className="ac-popup-titulo">
                  {diaPopup.getDate()} de {meses[diaPopup.getMonth()]}
                </h4>
                <span className="ac-panel-sub">Eventos del día</span>
              </div>
              <button className="ac-popup-close" onClick={() => setDiaPopup(null)}>
                <i className="fas fa-times" />
              </button>
            </div>

            {/* Body */}
            <div className="ac-popup-body">
              {/* Cumpleaños */}
              {cumpleanos.filter(c => esMismoDia(c.fechaVisual, diaPopup)).map(c => (
                <div key={`popup-c-${c.idUsuario}`} className="ac-birthday-card mb-3">
                  <i className="fas fa-birthday-cake ac-birthday-icon" />
                  <div>
                    <div className="ac-event-titulo">Cumpleaños de {c.nombre}</div>
                    <p className="ac-event-sub mb-0">¡Prepárale un WOD de regalo! 🎁</p>
                  </div>
                </div>
              ))}

              {/* Eventos */}
              {eventos.filter(e => {
                const dIter = new Date(diaPopup).setHours(0, 0, 0, 0);
                const dIni = new Date(e.fechaInicio).setHours(0, 0, 0, 0);
                const dFin = new Date(e.fechaFin).setHours(23, 59, 59, 999);
                return dIter >= dIni && dIter <= dFin;
              }).map(ev => (
                <div key={ev.idEvento} className={`ac-event-card mb-3 ${ev.bloqueaClases ? 'ac-event-card--danger' : ev.esPublico ? 'ac-event-card--primary' : 'ac-event-card--secondary'}`}>
                  <div className="d-flex justify-content-between align-items-start mb-1 gap-2">
                    <h6 className="ac-event-titulo mb-0">
                      {!ev.esPublico && <i className="fas fa-lock text-secondary me-2" title="Privado" />}
                      {ev.titulo}
                    </h6>
                    <div className="d-flex gap-1 align-items-center flex-shrink-0">
                      {ev.bloqueaClases && <span className="ac-badge-danger">Box Cerrado</span>}
                      <button
                        className="ac-icon-btn ac-icon-btn--edit"
                        title="Editar"
                        onClick={() => { handleEditarEvento(ev); setDiaPopup(null); }}
                      >
                        <i className="fas fa-edit" />
                      </button>
                      <BotonSeguro
                        className="ac-icon-btn ac-icon-btn--delete"
                        title="Eliminar"
                        onClick={() => { handleEliminarEvento(ev.idEvento); setDiaPopup(null); }}
                        textoProcesando=""
                      >
                        <i className="fas fa-trash" />
                      </BotonSeguro>
                    </div>
                  </div>
                  {!ev.esTodoElDia && (
                    <p className="ac-event-hora mb-0">
                      <i className="far fa-clock" />
                      {ev.fechaInicio.toTimeString().substring(0, 5)} — {ev.fechaFin.toTimeString().substring(0, 5)}
                    </p>
                  )}
                  {ev.descripcion && (
                    <p className="ac-event-desc mt-2 mb-0" style={{ whiteSpace: 'pre-wrap' }}>{ev.descripcion}</p>
                  )}
                  <div className="d-flex gap-2 flex-wrap mt-2">
                    <span className="ac-tag">{ev.tipoEvento}</span>
                    {ev.requiereRSVP && <span className="ac-tag ac-tag--info"><i className="fas fa-envelope-open-text me-1" />RSVP</span>}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="ac-popup-footer">
              <button
                className="ac-btn-primary flex-grow-1"
                onClick={() => {
                  setFormEvento({ ...initialFormEvento, fechaInicio: getFechaLocalString(diaPopup), fechaFin: getFechaLocalString(diaPopup) });
                  setModoPanel('nuevoEvento');
                  setDiaPopup(null);
                }}
              >
                <i className="fas fa-plus-circle me-2" />Nuevo Evento
              </button>
              <button className="ac-back-panel-btn" onClick={() => setDiaPopup(null)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
