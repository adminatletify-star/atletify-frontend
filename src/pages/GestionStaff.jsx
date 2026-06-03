import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BackButton from '../components/BackButton';
import TipoPagoPicker from '../components/TipoPagoPicker';
import RedGrayDatePicker from '../components/RedGrayDatePicker';
import BotonSeguro from '../components/BotonSeguro';
import AtletifyLoader from '../components/AtletifyLoader';
import '../assets/css/GestionStaff.css';

export default function GestionStaff() {
  const navigate = useNavigate();
  const [coaches, setCoaches] = useState([]);
  const [catalogo, setCatalogo] = useState([]);
  const [loading, setLoading] = useState(true);
  const [box, setBox] = useState(null);

  // Estados para el Modal Flotante (Glassmorphism)
  const [coachSeleccionado, setCoachSeleccionado] = useState(null);
  const [modalEspVisible, setModalEspVisible] = useState(false);
  const [espSeleccionadas, setEspSeleccionadas] = useState([]); // IDs de las especialidades activas
  const [nuevaEspecialidad, setNuevaEspecialidad] = useState('');

  // 💰 Estados para el Modal de Contratos y Nómina
  const [modalContratoVisible, setModalContratoVisible] = useState(false);
  const [formContrato, setFormContrato] = useState({ tipoPago: 'PorClase', monto: 0, diaCorte: 15 });
  const [nominaActual, setNominaActual] = useState(null);
  const [asistenciasCoach, setAsistenciasCoach] = useState([]);
  const [cargandoAsistencias, setCargandoAsistencias] = useState(false);
  // ⭐ Estados para Evaluaciones
  const [modalResenasVisible, setModalResenasVisible] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL;


  // 🏖️ Estados para Ausencias
  const [modalPermisoVisible, setModalPermisoVisible] = useState(false);
  const [formPermiso, setFormPermiso] = useState({ fechaInicio: '', fechaFin: '', motivo: '', conGoceDeSueldo: false });
  const [historialPermisos, setHistorialPermisos] = useState([]);

  // 🛡️ Estados para Auditoría de Clases Global
  const [vistaActiva, setVistaActiva] = useState('directorio'); // 'directorio' | 'auditoria' | 'nomina'
  const [auditoriaClases, setAuditoriaClases] = useState([]);
  const [cargandoAuditoria, setCargandoAuditoria] = useState(false);
  const [filtroAuditoria, setFiltroAuditoria] = useState('hoy'); // 'hoy' | 'ayer' | 'semana'
  const [filtroCoachAuditoria, setFiltroCoachAuditoria] = useState('');

  const abrirModalPermiso = async (coach) => {
    setCoachSeleccionado(coach);
    setFormPermiso({ fechaInicio: '', fechaFin: '', motivo: '', conGoceDeSueldo: false });
    setModalPermisoVisible(true);
    try {
      const res = await fetch(`${API_URL}/nomina/permisos/${coach.idUsuario || coach.id}`);
      if (res.ok) setHistorialPermisos(await res.json());
    } catch (e) { }
  };

  const guardarPermiso = async () => {
    if (!formPermiso.fechaInicio || !formPermiso.fechaFin || !formPermiso.motivo) return alert("Llena todos los campos");
    try {
      const payload = { ...formPermiso, IdUsuario: coachSeleccionado.idUsuario || coachSeleccionado.id };
      const res = await fetch(`${API_URL}/nomina/permisos`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (res.ok) {
        alert("Ausencia registrada. ✅");
        abrirModalPermiso(coachSeleccionado); // Recargar la lista
      }
    } catch (e) { alert("Error"); }
  };

  useEffect(() => {
    const b = JSON.parse(localStorage.getItem('box'));
    const u = JSON.parse(localStorage.getItem('usuario'));

    // 1. Si de plano no es jefe, lo sacamos
    if (!u || (u.rol !== 'AdminBox' && u.rol !== 'Developer')) {
      navigate('/login');
      return;
    }

    // 2. Si es Liz (AdminBox) y perdió su box, la regresamos a su panel, NO al login
    if (u.rol === 'AdminBox' && !b) {
      navigate('/admin-box-panel');
      return;
    }

    setBox(b);
    // 3. El Developer podría no tener Box. Si no tiene, usamos el Box 1 temporalmente para que vea algo
    const idAUsar = b ? b.idBox : 1;
    cargarTodo(idAUsar);
  }, [navigate]);

  useEffect(() => {
    if ((vistaActiva === 'auditoria' || vistaActiva === 'nomina') && box) {
      cargarAuditoria();
    }
  }, [vistaActiva, filtroAuditoria, box]);

  async function cargarTodo(idBox) {
    if (!idBox) return; // Si no hay ID, no disparamos flechas al aire
    setLoading(true);
    try {
      // 1. Traemos el catálogo de especialidades del Box
      const resCat = await fetch(`${API_URL}/especialidades/box/${idBox}`);
      const dataCat = await resCat.json();
      setCatalogo(Array.isArray(dataCat) ? dataCat : []);

      // 2. Traemos a todos los usuarios.
      // TIP: Si el endpoint /usuarios/box/${idBox} te da 404, usa el general y filtramos en JS
      const resUsu = await fetch(`${API_URL}/usuarios`);
      const dataUsu = await resUsu.json();

      const usuariosLista = Array.isArray(dataUsu) ? dataUsu : (dataUsu.data || []);

      // 3. Filtramos: que sean del Box actual Y que tengan rol 'Coach'
      const soloCoaches = usuariosLista.filter(u =>
        (u.idBoxPredeterminado === parseInt(idBox) || u.IdBoxPredeterminado === parseInt(idBox)) &&
        u.rol === 'Coach'
      );

      // 4. A cada Coach le buscamos sus especialidades
      // 4. A cada Coach le buscamos sus especialidades y sus calificaciones
      const coachesArmados = await Promise.all(soloCoaches.map(async (coach) => {
        const id = coach.idUsuario || coach.id || coach.IdUsuario;
        try {
          const [resEsp, resEval] = await Promise.all([
            fetch(`${API_URL}/especialidades/coach/${id}`),
            fetch(`${API_URL}/evaluaciones/coach/${id}`)
          ]);
          const dataEsp = await resEsp.json();
          const dataEval = resEval.ok ? await resEval.json() : { promedio: 0, total: 0, resenas: [] };
          return { ...coach, especialidades: Array.isArray(dataEsp) ? dataEsp : [], evaluaciones: dataEval };
        } catch {
          return { ...coach, especialidades: [], evaluaciones: { Promedio: 0, Total: 0, Resenas: [] } };
        }
      }));

      setCoaches(coachesArmados);
    } catch (err) {
      console.error("Error cargando staff:", err);
    } finally {
      setLoading(false);
    }
  }

  // --- LÓGICA DEL MODAL ---
  // --- LÓGICA DEL MODAL ---
  const abrirModal = (coach) => {
    setCoachSeleccionado(coach);
    setModalEspVisible(true); // 👈 Encendemos su semáforo
    const idsActivos = coach.especialidades.map(e => e.idEspecialidad || e.IdEspecialidad);
    setEspSeleccionadas(idsActivos);
  };

  const cerrarModal = () => {
    setModalEspVisible(false); // 👈 Apagamos el semáforo ANTES de borrar al coach
    setTimeout(() => { setCoachSeleccionado(null); setNuevaEspecialidad(''); }, 200); // Pequeño delay visual
  };

  const toggleEspecialidad = (idEsp) => {
    if (espSeleccionadas.includes(idEsp)) {
      setEspSeleccionadas(espSeleccionadas.filter(id => id !== idEsp)); // Lo apaga
    } else {
      setEspSeleccionadas([...espSeleccionadas, idEsp]); // Lo prende
    }
  };

  // --- PETICIONES A C# ---
  const guardarEspecialidades = async () => {
    try {
      const idCoach = coachSeleccionado.idUsuario || coachSeleccionado.id;
      const res = await fetch(`${API_URL}/especialidades/asignar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idCoach: idCoach, idEspecialidades: espSeleccionadas })
      });

      if (res.ok) {
        cerrarModal();
        cargarTodo(box.idBox); // Recargamos para ver los cambios brillando en la tarjeta
      }
    } catch (error) {
      alert("Error al guardar especialidades.");
    }
  };

  const crearNuevaEspecialidad = async () => {
    if (!nuevaEspecialidad.trim()) return;
    try {
      const res = await fetch(`${API_URL}/especialidades`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: nuevaEspecialidad, idBox: box.idBox })
      });

      if (res.ok) {
        const nuevaEsp = await res.json();
        setCatalogo([...catalogo, nuevaEsp]); // La agregamos a la lista visual
        setEspSeleccionadas([...espSeleccionadas, nuevaEsp.idEspecialidad]); // Se la asignamos de una vez al coach
        setNuevaEspecialidad('');
      }
    } catch (error) {
      alert("Error al crear la especialidad en la BD.");
    }
  };

  // --- LÓGICA DE CONTRATOS Y NÓMINA ---
  const getWeekBoundaries = (dateObj) => {
    const day = dateObj.getDay();
    const diffToMonday = dateObj.getDate() - day + (day === 0 ? -6 : 1);
    const start = new Date(dateObj.getFullYear(), dateObj.getMonth(), diffToMonday);
    const end = new Date(dateObj.getFullYear(), dateObj.getMonth(), diffToMonday + 6);
    
    const offsetStart = start.getTimezoneOffset() * 60000;
    const offsetEnd = end.getTimezoneOffset() * 60000;
    
    return {
      fInicioStr: new Date(start.getTime() - offsetStart).toISOString().split('T')[0],
      fFinStr: new Date(end.getTime() - offsetEnd).toISOString().split('T')[0]
    };
  };

  const getDatesForFilter = (filter) => {
    const hoyObj = new Date();
    let start, end;
    if (filter === 'hoy') {
      start = new Date(hoyObj);
      end = new Date(hoyObj);
    } else if (filter === 'ayer') {
      start = new Date(hoyObj);
      start.setDate(hoyObj.getDate() - 1);
      end = new Date(start);
    } else if (filter === 'semana') {
      return getWeekBoundaries(hoyObj);
    }
    const offsetStart = start.getTimezoneOffset() * 60000;
    const offsetEnd = end.getTimezoneOffset() * 60000;
    return {
      fInicioStr: new Date(start.getTime() - offsetStart).toISOString().split('T')[0],
      fFinStr: new Date(end.getTime() - offsetEnd).toISOString().split('T')[0]
    };
  };

  const cargarAuditoria = async () => {
    if (!box) return;
    setCargandoAuditoria(true);
    try {
      const { fInicioStr, fFinStr } = getDatesForFilter(filtroAuditoria);
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/nomina/auditoria-clases/${box.idBox}/${fInicioStr}/${fFinStr}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setAuditoriaClases(await res.json());
      }
    } catch (e) {
      console.error("Error al cargar auditoría:", e);
    } finally {
      setCargandoAuditoria(false);
    }
  };

  const validarClaseAuditoria = async (idCoach, idClase, fecha, estado, montoPago) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/nomina/validar-clase`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          IdCoach: idCoach,
          IdClase: idClase,
          Fecha: fecha,
          Estado: estado,
          MontoPago: parseFloat(montoPago)
        })
      });
      if (res.ok) {
        cargarAuditoria(); // recargar la tabla de auditoría
      }
    } catch (e) {
      alert("Error al validar asistencia de la clase");
    }
  };

  const validarMasivo = async () => {
    const pendientes = auditoriaClases.filter(c => c.estado === 'Pendiente' || c.Estado === 'Pendiente');
    if (pendientes.length === 0) return alert("No hay clases pendientes por validar en esta vista.");
    
    if (!window.confirm(`¿Aprobar ${pendientes.length} clases pendientes mostradas en pantalla?`)) return;

    try {
      const peticiones = pendientes.map(c => ({
        IdCoach: c.idCoach || c.IdCoach,
        IdClase: c.idClase || c.IdClase,
        Fecha: c.fecha || c.Fecha,
        Estado: 'Validada',
        MontoPago: c.montoPago || c.MontoPago
      }));

      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/nomina/validar-masivo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(peticiones)
      });
      if (res.ok) {
        alert("Validación masiva completada con éxito. ✅");
        cargarAuditoria();
      }
    } catch (e) {
      alert("Error en validación masiva.");
    }
  };

  const cargarAsistencias = async (idCoach) => {
    setCargandoAsistencias(true);
    try {
      const { fInicioStr, fFinStr } = getWeekBoundaries(new Date());
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/nomina/asistencias-coach-semanal/${idCoach}/${fInicioStr}/${fFinStr}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAsistenciasCoach(data);
      }
    } catch (e) {
      console.error("Error al cargar asistencias:", e);
    } finally {
      setCargandoAsistencias(false);
    }
  };

  const validarAsistenciaClase = async (idClase, fecha, estado, montoPago) => {
    try {
      const idCoach = coachSeleccionado.idUsuario || coachSeleccionado.id;
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/nomina/validar-clase`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          IdCoach: idCoach,
          IdClase: idClase,
          Fecha: fecha,
          Estado: estado,
          MontoPago: parseFloat(montoPago)
        })
      });
      if (res.ok) {
        await cargarAsistencias(idCoach);
        const { fInicioStr, fFinStr } = getWeekBoundaries(new Date());
        const resNomina = await fetch(`${import.meta.env.VITE_API_URL}/api/nomina/calcular-semanal/${idCoach}/${fInicioStr}/${fFinStr}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (resNomina.ok) {
          setNominaActual(await resNomina.json());
        }
      }
    } catch (e) {
      alert("Error al validar asistencia de la clase");
    }
  };

  const pagarNominaMes = async () => {
    if (!window.confirm(`¿Seguro que deseas proceder con el pago definitivo de la nómina semanal de ${coachSeleccionado.nombre} por $${nominaActual.granTotal.toFixed(2)}? Se registrará un Egreso Financiero.`)) return;
    try {
      const idCoach = coachSeleccionado.idUsuario || coachSeleccionado.id;
      const hoy = new Date();
      // En vez de mes/año podríamos mandar la semana, pero para retrocompatibilidad usaremos el mes actual. Idealmente backend también debería tener pagar-semanal.
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/nomina/pagar/${idCoach}/${hoy.getFullYear()}/${hoy.getMonth() + 1}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.mensaje || "Nómina pagada con éxito. ✅");
        setModalContratoVisible(false);
      } else {
        alert(data.mensaje || "Error al pagar la nómina");
      }
    } catch (e) {
      alert("Error al procesar el pago");
    }
  };

  const abrirModalContrato = async (coach) => {
    setCoachSeleccionado(coach);
    setModalContratoVisible(true);
    setNominaActual(null);
    setAsistenciasCoach([]);
    const idCoach = coach.idUsuario || coach.id;
    const token = localStorage.getItem('token');
    
    cargarAsistencias(idCoach);

    try {
      // 1. Traer el Contrato
      const resContrato = await fetch(`${import.meta.env.VITE_API_URL}/api/nomina/contrato/${idCoach}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (resContrato.ok) {
        const data = await resContrato.json();
        setFormContrato({ tipoPago: data.tipoPago, monto: data.monto, diaCorte: data.diaCorte });
      }
      // 2. Traer el cálculo de Nómina de esta SEMANA
      const { fInicioStr, fFinStr } = getWeekBoundaries(new Date());
      const resNomina = await fetch(`${import.meta.env.VITE_API_URL}/api/nomina/calcular-semanal/${idCoach}/${fInicioStr}/${fFinStr}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (resNomina.ok) {
        setNominaActual(await resNomina.json());
      }
    } catch (e) { console.error("Error al cargar finanzas", e); }
  };

  const guardarContrato = async () => {
    try {
      const idCoach = coachSeleccionado.idUsuario || coachSeleccionado.id;
      const token = localStorage.getItem('token');
      const payload = {
        IdUsuario: idCoach,
        TipoPago: formContrato.tipoPago, Monto: parseFloat(formContrato.monto), DiaCorte: parseInt(formContrato.diaCorte), Activo: true
      };
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/nomina/contrato`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        alert("Contrato financiero actualizado. 💸");
        setModalContratoVisible(false);
      }
    } catch (e) { alert("Error al guardar contrato"); }
  };

  const eliminarResena = async (idResena) => {
    if (!window.confirm("¿Seguro que deseas eliminar esta reseña (por lenguaje inapropiado o spam)?")) return;
    try {
      const res = await fetch(`${API_URL}/evaluaciones/${idResena}`, { method: 'DELETE' });
      if (res.ok) {
        alert("Reseña eliminada correctamente.");
        setCoachSeleccionado({
          ...coachSeleccionado,
          evaluaciones: {
            ...coachSeleccionado.evaluaciones,
            resenas: coachSeleccionado.evaluaciones.resenas.filter(r => r.idEvaluacion !== idResena)
          }
        });
        cargarTodo(box ? box.idBox : 1);
      } else {
        alert("No se pudo eliminar la reseña.");
      }
    } catch (e) { alert("Error de conexión"); }
  };

  return (
    <div className="staff-container">

      {/* ── NAVBAR ── */}
      <nav className="staff-nav">
        <BackButton to="/admin-box-panel" />
        <div className="staff-nav-icono">
          <i className="fas fa-users-cog"></i>
        </div>
        <div className="flex-grow-1">
          <h1 className="staff-nav-titulo">
            Control de <span>Staff</span>
          </h1>
          {box && <p className="staff-nav-subtitle">{box.nombre}</p>}
        </div>

        {/* ── TOGGLE TABS ── */}
        <div className="btn-group shadow-sm rounded-pill p-1 border border-secondary" style={{ background: 'rgba(255,255,255,0.05)' }} role="group">
          <button 
            type="button" 
            className={`btn btn-sm rounded-pill px-3 border-0 fw-bold ${vistaActiva === 'directorio' ? 'btn-danger text-white' : 'btn-outline-secondary text-white-50'}`}
            onClick={() => setVistaActiva('directorio')}
          >
            <i className="fas fa-address-card me-2 d-none d-sm-inline"></i>Directorio
          </button>
          <button 
            type="button" 
            className={`btn btn-sm rounded-pill px-3 border-0 fw-bold ${vistaActiva === 'auditoria' ? 'btn-danger text-white' : 'btn-outline-secondary text-white-50'}`}
            onClick={() => { setVistaActiva('auditoria'); setFiltroAuditoria('hoy'); }}
          >
            <i className="fas fa-check-double me-2 d-none d-sm-inline"></i>Auditoría Diaria
          </button>
          <button 
            type="button" 
            className={`btn btn-sm rounded-pill px-3 border-0 fw-bold ${vistaActiva === 'nomina' ? 'btn-danger text-white' : 'btn-outline-secondary text-white-50'}`}
            onClick={() => { setVistaActiva('nomina'); setFiltroAuditoria('semana'); }}
          >
            <i className="fas fa-money-check-alt me-2 d-none d-sm-inline"></i>Nómina / Pagos
          </button>
        </div>
      </nav>

      <div className="container-xl px-3 px-md-4 py-4">

        {vistaActiva === 'directorio' ? (
          <>
            {/* ── LOADING ── */}
            {loading ? (
              <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
                <AtletifyLoader />
              </div>

              /* ── EMPTY STATE ── */
            ) : coaches.length === 0 ? (
              <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
                <div className="staff-empty-card">
                  <i className="fas fa-users-slash staff-empty-icono"></i>
                  <h2 className="staff-empty-titulo">Sin Coaches registrados</h2>
                  <p className="staff-empty-desc">
                    Primero registra usuarios con rol "Coach" en tu Box.
                  </p>
                </div>
              </div>

              /* ── GRID DE COACHES ── */
            ) : (
              <div className="row g-3 g-md-4 justify-content-start">
                {coaches.map(coach => (
                  <div key={coach.idUsuario || coach.id} className="col-12 col-sm-6 col-lg-4 col-xl-3">
                    <div className="staff-card">

                      {/* Cabecera: avatar + nombre + rating + correo */}
                      <div className="staff-card-header">
                        <div className="staff-avatar">
                          <span className="staff-avatar-initial">
                            {coach.nombre.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="staff-badge-rol">Coach</span>
                        <h3 className="staff-nombre">{coach.nombre}</h3>
                        <div className="staff-rating">
                          <i className="fas fa-star staff-rating-star"></i>
                          <span className="staff-rating-score">{coach.evaluaciones?.promedio || 0}</span>
                          <span className="staff-rating-count">({coach.evaluaciones?.total || 0})</span>
                        </div>
                        <p className="staff-correo">{coach.correo}</p>
                      </div>

                      {/* Cuerpo: especialidades + acciones */}
                      <div className="staff-card-body">
                        <div className="staff-esp-section">
                          <p className="staff-esp-label">Especialidades</p>
                          {coach.especialidades && coach.especialidades.length > 0 ? (
                            <div className="staff-esp-pills">
                              {coach.especialidades.map(esp => (
                                <span key={esp.idEspecialidad} className="staff-esp-pill">
                                  {esp.nombre}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <div className="staff-esp-vacio">
                              <i className="fas fa-plus-circle"></i>
                              <p>Sin especialidades</p>
                            </div>
                          )}
                        </div>

                        <div className="staff-actions-grid">
                          <button className="staff-action-btn staff-action-btn--esp" onClick={() => abrirModal(coach)}>
                            <i className="fas fa-sliders-h"></i>
                            <span>Esp.</span>
                          </button>
                          <button className="staff-action-btn staff-action-btn--contrato" onClick={() => abrirModalContrato(coach)}>
                            <i className="fas fa-wallet"></i>
                            <span>Contrato</span>
                          </button>
                          <button className="staff-action-btn staff-action-btn--ausencia" onClick={() => abrirModalPermiso(coach)}>
                            <i className="fas fa-umbrella-beach"></i>
                            <span>Ausencia</span>
                          </button>
                          <button className="staff-action-btn staff-action-btn--resenas" onClick={() => { setCoachSeleccionado(coach); setModalResenasVisible(true); }}>
                            <i className="fas fa-star"></i>
                            <span>Reseñas</span>
                          </button>
                        </div>
                      </div>

                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : vistaActiva === 'auditoria' ? (
          /* ── AUDITORIA DE CLASES ── */
          <div className="auditoria-container fade-in">
            <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
              <div>
                <h3 className="text-white mb-1"><i className="fas fa-clipboard-check text-danger me-2"></i> Auditoría Global</h3>
                <p className="text-white-50 mb-0 small">Verifica que todos los coaches impartieron sus clases correctamente y aprueba la nómina con 1 clic.</p>
              </div>
              
              <div className="d-flex gap-2 align-items-center flex-wrap">
                <select 
                  className="form-select bg-dark text-white border-secondary form-select-sm" 
                  style={{ minWidth: '150px' }}
                  value={filtroCoachAuditoria}
                  onChange={(e) => setFiltroCoachAuditoria(e.target.value)}
                >
                  <option value="">Todos los Coaches</option>
                  {Array.from(new Set(auditoriaClases.map(c => c.idCoach || c.IdCoach))).map(id => {
                    const coachName = auditoriaClases.find(c => (c.idCoach || c.IdCoach) === id)?.nombreCoach || auditoriaClases.find(c => (c.idCoach || c.IdCoach) === id)?.NombreCoach;
                    return <option key={id} value={id}>{coachName}</option>
                  })}
                </select>
                <select 
                  className="form-select bg-dark text-white border-secondary form-select-sm" 
                  style={{ minWidth: '130px' }}
                  value={filtroAuditoria}
                  onChange={(e) => setFiltroAuditoria(e.target.value)}
                >
                  <option value="hoy">Hoy</option>
                  <option value="ayer">Ayer</option>
                  <option value="semana">Esta Semana</option>
                </select>
                <button className="btn btn-sm btn-success fw-bold px-3 d-flex align-items-center shadow-sm" onClick={validarMasivo}>
                  <i className="fas fa-check-double me-2"></i>Validar Pendientes
                </button>
              </div>
            </div>

            {cargandoAuditoria ? (
              <div className="text-center py-5">
                <div className="spinner-border text-danger" role="status"></div>
                <p className="mt-3 text-white-50">Cargando clases...</p>
              </div>
            ) : auditoriaClases.length === 0 ? (
              <div className="staff-empty-card py-5 text-center">
                <i className="fas fa-box-open fs-1 text-white-50 mb-3"></i>
                <h5 className="text-white">Sin clases registradas</h5>
                <p className="text-white-50 small mb-0">No hay clases configuradas para el periodo seleccionado.</p>
              </div>
            ) : (
              <div className="table-responsive shadow-sm rounded-3 border border-secondary" style={{ overflow: 'hidden' }}>
                <table className="table table-dark table-hover mb-0 align-middle" style={{ background: '#1c1c1e' }}>
                  <thead style={{ background: 'rgba(0,0,0,0.4)' }}>
                    <tr>
                      <th className="py-3 text-white-50 fw-normal small px-3">Fecha y Hora</th>
                      <th className="py-3 text-white-50 fw-normal small">Clase</th>
                      <th className="py-3 text-white-50 fw-normal small">Coach Asignado</th>
                      <th className="py-3 text-white-50 fw-normal small text-center">Atletas (Asist / Cupo)</th>
                      <th className="py-3 text-white-50 fw-normal small text-end">Pago Coach</th>
                      <th className="py-3 text-white-50 fw-normal small text-center">Estado</th>
                      <th className="py-3 text-white-50 fw-normal small text-end px-3">Acción Rápida</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(filtroCoachAuditoria ? auditoriaClases.filter(c => (c.idCoach || c.IdCoach).toString() === filtroCoachAuditoria) : auditoriaClases).map((c, i) => {
                      const idClase = c.idClase ?? c.IdClase;
                      const idCoach = c.idCoach ?? c.IdCoach;
                      const fecha = c.fecha ?? c.Fecha;
                      const estado = c.estado ?? c.Estado;
                      const monto = c.montoPago ?? c.MontoPago ?? 0;
                      const totalAsistieron = c.totalAsistieron ?? c.TotalAsistieron ?? 0;
                      const maximoAtletas = c.maximoAtletas ?? c.MaximoAtletas ?? c.totalReservas ?? c.TotalReservas ?? 0;
                      const nombreCoach = c.nombreCoach ?? c.NombreCoach ?? 'C';
                      const nombreClase = c.nombreClase ?? c.NombreClase ?? '';
                      const horario = c.horario ?? c.Horario ?? '';
                      
                      return (
                        <tr key={`${idClase}-${i}`} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <td className="px-3">
                            <span className="d-block text-white fw-bold">{new Date(fecha).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' }).toUpperCase()}</span>
                            <span className="text-danger small"><i className="far fa-clock me-1"></i>{horario}</span>
                          </td>
                          <td className="text-white fw-medium">{nombreClase}</td>
                          <td>
                            <div className="d-flex align-items-center gap-2">
                              <div className="staff-avatar" style={{ width: '30px', height: '30px', minWidth: '30px' }}>
                                <span className="staff-avatar-initial fs-6">{nombreCoach.charAt(0)}</span>
                              </div>
                              <span className="text-white small text-truncate" style={{ maxWidth: '120px' }}>{nombreCoach}</span>
                            </div>
                          </td>
                          <td className="text-center">
                            <div className="badge rounded-pill bg-dark border border-secondary px-3 py-2">
                              <span className="text-success fw-bold">{totalAsistieron}</span>
                              <span className="text-white-50 mx-1">/</span>
                              <span className="text-white">{maximoAtletas}</span>
                            </div>
                          </td>
                          <td className="text-end">
                            <span className="badge rounded-pill bg-success bg-opacity-10 text-success border border-success border-opacity-25 px-2 py-1 font-monospace">
                              ${monto.toFixed(2)}
                            </span>
                          </td>
                          <td className="text-center">
                            {estado === 'Validada' && <span className="badge bg-success bg-opacity-25 text-success border border-success border-opacity-50 px-2 py-1"><i className="fas fa-check me-1"></i>Validada</span>}
                            {estado === 'Falta' && <span className="badge bg-danger bg-opacity-25 text-danger border border-danger border-opacity-50 px-2 py-1"><i className="fas fa-times me-1"></i>Falta</span>}
                            {estado === 'Pendiente' && <span className="badge bg-warning bg-opacity-25 text-warning border border-warning border-opacity-50 px-2 py-1"><i className="fas fa-hourglass-half me-1"></i>Pendiente</span>}
                          </td>
                          <td className="text-end px-3">
                            {estado === 'Pendiente' ? (
                              <div className="btn-group btn-group-sm">
                                <button className="btn btn-outline-success border-success text-success bg-success bg-opacity-10 shadow-sm" title="Validar Asistencia" onClick={() => validarClaseAuditoria(idCoach, idClase, fecha, 'Validada', monto)}>
                                  <i className="fas fa-check"></i>
                                </button>
                                <button className="btn btn-outline-danger border-danger text-danger bg-danger bg-opacity-10 shadow-sm" title="Marcar Falta" onClick={() => validarClaseAuditoria(idCoach, idClase, fecha, 'Falta', 0)}>
                                  <i className="fas fa-times"></i>
                                </button>
                              </div>
                            ) : (
                              <button className="btn btn-sm btn-dark text-white-50" title="Revertir a Pendiente" onClick={() => validarClaseAuditoria(idCoach, idClase, fecha, 'Pendiente', monto)}>
                                <i className="fas fa-undo"></i>
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          /* ── NOMINA / PAGOS ── */
          <div className="nomina-container fade-in">
            <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
              <div>
                <h3 className="text-white mb-1"><i className="fas fa-money-check-alt text-danger me-2"></i> Gestión de Nómina</h3>
                <p className="text-white-50 mb-0 small">Visualiza el subtotal a pagar por coach basado en las clases que ya han sido validadas.</p>
              </div>
              
              <div className="d-flex gap-2 align-items-center flex-wrap">
                <select 
                  className="form-select bg-dark text-white border-secondary form-select-sm" 
                  style={{ minWidth: '130px' }}
                  value={filtroAuditoria}
                  onChange={(e) => setFiltroAuditoria(e.target.value)}
                >
                  <option value="semana">Esta Semana</option>
                  <option value="hoy">Hoy</option>
                  <option value="ayer">Ayer</option>
                </select>
              </div>
            </div>

            {cargandoAuditoria ? (
              <div className="text-center py-5">
                <div className="spinner-border text-danger" role="status"></div>
                <p className="mt-3 text-white-50">Calculando nómina...</p>
              </div>
            ) : Object.values(auditoriaClases.filter(c => (c.estado ?? c.Estado) === 'Validada').reduce((acc, c) => {
              const id = c.idCoach ?? c.IdCoach;
              if (!acc[id]) { acc[id] = { idCoach: id, nombreCoach: c.nombreCoach ?? c.NombreCoach ?? 'Coach', clases: [], totalPagar: 0 }; }
              acc[id].clases.push(c);
              acc[id].totalPagar += (c.montoPago ?? c.MontoPago ?? 0);
              return acc;
            }, {})).length === 0 ? (
              <div className="staff-empty-card py-5 text-center">
                <i className="fas fa-wallet fs-1 text-white-50 mb-3"></i>
                <h5 className="text-white">Sin clases validadas</h5>
                <p className="text-white-50 small mb-0">Primero valida las clases en la pestaña de Auditoría para ver los montos a pagar.</p>
              </div>
            ) : (
              <div className="row g-3">
                {Object.values(auditoriaClases.filter(c => (c.estado ?? c.Estado) === 'Validada').reduce((acc, c) => {
                  const id = c.idCoach ?? c.IdCoach;
                  if (!acc[id]) { acc[id] = { idCoach: id, nombreCoach: c.nombreCoach ?? c.NombreCoach ?? 'Coach', clases: [], totalPagar: 0 }; }
                  acc[id].clases.push(c);
                  acc[id].totalPagar += (c.montoPago ?? c.MontoPago ?? 0);
                  return acc;
                }, {})).map(coachNomina => (
                  <div key={coachNomina.idCoach} className="col-12 col-md-6 col-lg-4">
                    <div className="card bg-dark border-secondary h-100 shadow-sm" style={{ background: 'linear-gradient(145deg, #1c1c1e 0%, #151515 100%)' }}>
                      <div className="card-body p-4 text-center">
                        <div className="staff-avatar mx-auto mb-3" style={{ width: '60px', height: '60px' }}>
                          <span className="staff-avatar-initial fs-4">{coachNomina.nombreCoach.charAt(0)}</span>
                        </div>
                        <h5 className="text-white mb-1">{coachNomina.nombreCoach}</h5>
                        <p className="text-white-50 small mb-3">
                          <i className="fas fa-check-circle text-success me-1"></i>
                          {coachNomina.clases.length} clase(s) validadas
                        </p>
                        
                        <div className="p-3 bg-black rounded-3 border border-secondary mb-3">
                          <p className="text-white-50 mb-1 small text-uppercase fw-bold">Total a Pagar</p>
                          <h3 className="text-success mb-0 fw-bold font-monospace">${coachNomina.totalPagar.toFixed(2)}</h3>
                        </div>
                        
                        <button className="btn btn-outline-danger w-100 btn-sm rounded-pill border-opacity-50" onClick={() => alert('Función de registro de pago de nómina en desarrollo. Por ahora, el monto se muestra de manera informativa.')}>
                          <i className="fas fa-hand-holding-usd me-2"></i>Registrar Pago
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      {/* ── MODAL: ESPECIALIDADES ── */}
      {modalEspVisible && coachSeleccionado && (
        <div className="staff-modal-overlay" onClick={cerrarModal}>
          <div className="staff-modal" onClick={e => e.stopPropagation()}>

            <div className="staff-modal-header">
              <div className="d-flex align-items-center gap-2">
                <div className="staff-modal-icon-box staff-modal-icon-box--cool">
                  <i className="fas fa-sliders-h"></i>
                </div>
                <div>
                  <h2 className="staff-modal-titulo">
                    Especialidades de <span>{coachSeleccionado.nombre.split(' ')[0]}</span>
                  </h2>
                </div>
              </div>
              <button className="staff-modal-cerrar" onClick={cerrarModal} aria-label="Cerrar">
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="staff-modal-body">
              <p className="staff-modal-desc">
                Selecciona las disciplinas que este Coach domina o imparte en el Box:
              </p>

              <div className="staff-pills-grid">
                {catalogo.map(cat => {
                  const activo = espSeleccionadas.includes(cat.idEspecialidad);
                  return (
                    <button
                      key={cat.idEspecialidad}
                      className={`staff-pill-toggle ${activo ? 'staff-pill-toggle--activo' : 'staff-pill-toggle--inactivo'}`}
                      onClick={() => toggleEspecialidad(cat.idEspecialidad)}
                    >
                      {cat.nombre}
                      {activo && <i className="fas fa-check"></i>}
                    </button>
                  );
                })}
                {catalogo.length === 0 && (
                  <span className="staff-catalogo-vacio">El catálogo de tu Box está vacío.</span>
                )}
              </div>

              <div className="staff-nueva-esp">
                <span className="staff-nueva-esp-label">
                  <i className="fas fa-plus-circle me-1"></i>¿Falta alguna especialidad?
                </span>
                <div className="d-flex gap-2">
                  <input
                    type="text"
                    className="staff-nueva-esp-input"
                    placeholder="Ej. Halterofilia, Gimnasia..."
                    value={nuevaEspecialidad}
                    onChange={e => setNuevaEspecialidad(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && crearNuevaEspecialidad()}
                  />
                  <BotonSeguro className="staff-btn-agregar" onClick={crearNuevaEspecialidad} textoProcesando="...">
                    <i className="fas fa-plus"></i>
                    <span className="d-none d-sm-inline">Agregar</span>
                  </BotonSeguro>
                </div>
              </div>

              <BotonSeguro className="staff-btn-guardar" onClick={guardarEspecialidades} textoProcesando="Guardando...">
                <i className="fas fa-save"></i>Guardar Cambios
              </BotonSeguro>
            </div>

          </div>
        </div>
      )}

      {/* ── MODAL: VER RESEÑAS ── */}
      {modalResenasVisible && coachSeleccionado && (
        <div className="staff-modal-overlay" onClick={() => setModalResenasVisible(false)}>
          <div className="staff-modal staff-modal--sm" onClick={e => e.stopPropagation()}>

            <div className="staff-modal-header">
              <div className="d-flex align-items-center gap-2">
                <div className="staff-modal-icon-box staff-modal-icon-box--accent">
                  <i className="fas fa-star"></i>
                </div>
                <div>
                  <h2 className="staff-modal-titulo">Tribunal de Atletas</h2>
                  <p className="staff-modal-subtitle">{coachSeleccionado.nombre.split(' ')[0]}</p>
                </div>
              </div>
              <button className="staff-modal-cerrar" onClick={() => setModalResenasVisible(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="staff-modal-body">
              <div className="staff-rating-hero">
                <div className="staff-rating-hero-score">
                  {coachSeleccionado.evaluaciones?.promedio || 0}
                </div>
                <div className="staff-rating-hero-stars">
                  {'★'.repeat(Math.round(coachSeleccionado.evaluaciones?.promedio || 0))}
                  {'☆'.repeat(5 - Math.round(coachSeleccionado.evaluaciones?.promedio || 0))}
                </div>
                <span className="staff-rating-hero-total">
                  {coachSeleccionado.evaluaciones?.total || 0} reseñas totales
                </span>
              </div>

              <div className="staff-resenas-list">
                {(!coachSeleccionado.evaluaciones?.resenas || coachSeleccionado.evaluaciones.resenas.length === 0) ? (
                  <p className="staff-resenas-vacio">Aún no hay reseñas para este coach.</p>
                ) : (
                  coachSeleccionado.evaluaciones.resenas.map(r => (
                    <div key={r.idEvaluacion} className="staff-resena-card">
                      <div className="staff-resena-header">
                        <div className="d-flex align-items-center gap-2">
                          <div className="staff-resena-avatar">
                            {r.nombreAtleta ? r.nombreAtleta.charAt(0) : 'A'}
                          </div>
                          <span className="staff-resena-nombre">{r.nombreAtleta || 'Atleta Oculto'}</span>
                        </div>
                        <span className="staff-resena-estrellas">{'★'.repeat(r.estrellas || 5)}</span>
                      </div>
                      {r.comentario && <p className="staff-resena-comentario">"{r.comentario}"</p>}
                      <div className="d-flex justify-content-between align-items-center mt-2">
                        <div className="staff-resena-fecha">
                          {new Date(r.fechaEvaluacion).toLocaleDateString()}
                        </div>
                        <button
                          className="btn btn-sm btn-outline-danger border-0"
                          onClick={() => eliminarResena(r.idEvaluacion)}
                          title="Eliminar Reseña"
                        >
                          <i className="fas fa-trash-alt"></i>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ── MODAL: AUSENCIAS / VACACIONES ── */}
      {modalPermisoVisible && coachSeleccionado && (
        <div className="staff-modal-overlay" onClick={() => setModalPermisoVisible(false)}>
          <div className="staff-modal staff-modal--md" onClick={e => e.stopPropagation()}>

            <div className="staff-modal-header">
              <div className="d-flex align-items-center gap-2">
                <div className="staff-modal-icon-box staff-modal-icon-box--accent">
                  <i className="fas fa-plane-departure"></i>
                </div>
                <div>
                  <h2 className="staff-modal-titulo">Registrar Ausencia</h2>
                  <p className="staff-modal-subtitle">{coachSeleccionado.nombre.split(' ')[0]}</p>
                </div>
              </div>
              <button className="staff-modal-cerrar" onClick={() => setModalPermisoVisible(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="staff-modal-body">
              <div className="staff-form-panel">
                <div className="row g-3">
                  <div className="col-6">
                    <label className="staff-form-label">Día de Inicio</label>
                    <RedGrayDatePicker
                      value={formPermiso.fechaInicio}
                      onChange={val => setFormPermiso({ ...formPermiso, fechaInicio: val })}
                      placeholder="dd/mm/aaaa"
                    />
                  </div>
                  <div className="col-6">
                    <label className="staff-form-label">Día Final</label>
                    <RedGrayDatePicker
                      value={formPermiso.fechaFin}
                      onChange={val => setFormPermiso({ ...formPermiso, fechaFin: val })}
                      placeholder="dd/mm/aaaa"
                      min={formPermiso.fechaInicio || undefined}
                    />
                  </div>
                  <div className="col-12">
                    <label className="staff-form-label">Motivo</label>
                    <input
                      type="text"
                      className="staff-modal-input"
                      placeholder="Ej. Permiso por enfermedad, Vacaciones..."
                      value={formPermiso.motivo}
                      onChange={e => setFormPermiso({ ...formPermiso, motivo: e.target.value })}
                    />
                  </div>
                  <div className="col-12">
                    <div className="staff-switch-row">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        role="switch"
                        id="goce-sueldo"
                        checked={formPermiso.conGoceDeSueldo}
                        onChange={e => setFormPermiso({ ...formPermiso, conGoceDeSueldo: e.target.checked })}
                      />
                      <label className="staff-form-label mb-0" htmlFor="goce-sueldo">
                        Con Goce de Sueldo (No descontar de nómina)
                      </label>
                    </div>
                  </div>
                  <div className="col-12">
                    <BotonSeguro onClick={guardarPermiso} className="staff-btn-aprobar" textoProcesando="Guardando...">
                      <i className="fas fa-check-circle"></i>Aprobar Ausencia
                    </BotonSeguro>
                  </div>
                </div>
              </div>

              <div className="staff-modal-section-title">
                <i className="fas fa-history me-2"></i>Historial de Permisos
              </div>

              <div className="staff-historial-list">
                {historialPermisos.length === 0 ? (
                  <p className="staff-historial-vacio">Sin ausencias registradas.</p>
                ) : (
                  historialPermisos.map(p => (
                    <div key={p.idPermiso} className="staff-historial-item">
                      <div>
                        <div className="staff-historial-motivo">
                          {p.motivo}
                          {p.conGoceDeSueldo && <span className="staff-badge-pagado">Pagado</span>}
                        </div>
                        <div className="staff-historial-fechas">
                          {new Date(p.fechaInicio).toLocaleDateString()} — {new Date(p.fechaFin).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ── MODAL: CONTRATOS Y NÓMINA ── */}
      {modalContratoVisible && coachSeleccionado && (
        <div className="staff-modal-overlay" onClick={() => setModalContratoVisible(false)}>
          <div className="staff-modal staff-modal--md" onClick={e => e.stopPropagation()}>

            <div className="staff-modal-header">
              <div className="d-flex align-items-center gap-2">
                <div className="staff-modal-icon-box staff-modal-icon-box--success">
                  <i className="fas fa-wallet"></i>
                </div>
                <div>
                  <h2 className="staff-modal-titulo">Contrato y Nómina</h2>
                  <p className="staff-modal-subtitle">{coachSeleccionado.nombre.split(' ')[0]}</p>
                </div>
              </div>
              <button className="staff-modal-cerrar" onClick={() => setModalContratoVisible(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="staff-modal-body">
              <div className="staff-modal-section-title">
                <i className="fas fa-file-contract me-2"></i>Términos de Pago
              </div>

              <div className="row g-3 mb-4">
                <div className="col-md-6">
                  <label className="staff-form-label">Tipo de Salario</label>
                  <TipoPagoPicker
                    valor={formContrato.tipoPago}
                    onCambiar={val => setFormContrato({ ...formContrato, tipoPago: val })}
                  />
                </div>
                <div className="col-md-3">
                  <label className="staff-form-label">Monto ($)</label>
                  <input
                    type="number"
                    className="staff-modal-input"
                    value={formContrato.monto}
                    onChange={e => setFormContrato({ ...formContrato, monto: e.target.value })}
                  />
                </div>
                <div className="col-md-3">
                  <label className="staff-form-label">Día de Pago (Semanal)</label>
                  <select
                    className="staff-modal-input"
                    value={formContrato.diaCorte}
                    onChange={e => setFormContrato({ ...formContrato, diaCorte: e.target.value })}
                  >
                    <option value="1">Lunes</option>
                    <option value="2">Martes</option>
                    <option value="3">Miércoles</option>
                    <option value="4">Jueves</option>
                    <option value="5">Viernes</option>
                    <option value="6">Sábado</option>
                    <option value="7">Domingo</option>
                  </select>
                </div>
                <div className="col-12">
                  <BotonSeguro onClick={guardarContrato} className="staff-btn-guardar-contrato" textoProcesando="Guardando...">
                    <i className="fas fa-save me-1"></i>Guardar Contrato
                  </BotonSeguro>
                </div>
              </div>

              {formContrato.tipoPago === 'PorClase' && (
                <div className="mt-4">
                  <div className="staff-modal-section-title">
                    <i className="fas fa-calendar-check me-2"></i>Validación de Clases (Esta Semana)
                  </div>
                  {cargandoAsistencias ? (
                    <div className="text-center py-3">
                      <div className="spinner-border text-danger spinner-border-sm" role="status"></div>
                    </div>
                  ) : asistenciasCoach.length === 0 ? (
                    <p className="text-muted small py-2">No hay clases programadas o registradas esta semana.</p>
                  ) : (
                    <div className="table-responsive" style={{ maxHeight: '220px', overflowY: 'auto' }}>
                      <table className="table table-dark table-striped table-hover align-middle mb-0" style={{ fontSize: '11px', background: 'rgba(0,0,0,0.2)' }}>
                        <thead>
                          <tr>
                            <th>Fecha</th>
                            <th>Clase</th>
                            <th>Estado</th>
                            <th className="text-end">Tarifa</th>
                            <th className="text-center">Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {asistenciasCoach.map((ast, idx) => {
                            const dateObj = new Date(ast.fecha);
                            const offsetDate = new Date(dateObj.getTime() + dateObj.getTimezoneOffset() * 60000); // Evitar desfase de zona horaria
                            const fechaFormateada = offsetDate.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', weekday: 'short' });
                            return (
                              <tr key={idx}>
                                <td className="text-white-50 text-capitalize">
                                  {fechaFormateada} <span className="small text-muted d-block">{ast.horario}</span>
                                  {ast.esSustituto && <span className="badge bg-info ms-1" style={{ fontSize: '8px' }}>Sustituto</span>}
                                </td>
                                <td className="fw-bold">{ast.nombreClase}</td>
                                <td>
                                  {ast.estado === 'Validada' && <span className="badge bg-success-glow text-success">Validada</span>}
                                  {ast.estado === 'Falta' && <span className="badge bg-danger-glow text-danger">Falta</span>}
                                  {ast.estado === 'Pendiente' && <span className="badge bg-warning-glow text-warning">Pendiente</span>}
                                </td>
                                <td className="text-end fw-bold text-success">${ast.montoPago.toFixed(2)}</td>
                                <td className="text-center">
                                  <div className="d-flex justify-content-center gap-1">
                                    <button
                                      type="button"
                                      className="btn btn-xs btn-success py-1 px-2"
                                      style={{ fontSize: '10px' }}
                                      onClick={() => validarAsistenciaClase(ast.idClase, ast.fecha, 'Validada', ast.montoPago)}
                                      title="Validar Clase"
                                    >
                                      <i className="fas fa-check"></i>
                                    </button>
                                    <button
                                      type="button"
                                      className="btn btn-xs btn-danger py-1 px-2"
                                      style={{ fontSize: '10px' }}
                                      onClick={() => validarAsistenciaClase(ast.idClase, ast.fecha, 'Falta', ast.montoPago)}
                                      title="Registrar Falta"
                                    >
                                      <i className="fas fa-times"></i>
                                    </button>
                                    <button
                                      type="button"
                                      className="btn btn-xs btn-secondary py-1 px-2"
                                      style={{ fontSize: '10px' }}
                                      onClick={() => validarAsistenciaClase(ast.idClase, ast.fecha, 'Pendiente', ast.montoPago)}
                                      title="Restablecer"
                                    >
                                      <i className="fas fa-undo"></i>
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {nominaActual && (
                <div className="staff-nomina-card mt-4">
                  <div className="staff-modal-section-title">
                    <i className="fas fa-calculator me-2"></i>Nómina Proyectada (Esta Semana)
                  </div>
                  <div className="staff-nomina-row">
                    <span>Sueldo Base Semanal ({nominaActual.tipoPago})</span>
                    <span className="staff-nomina-valor">${nominaActual.sueldoBaseSemanal?.toFixed(2) || (nominaActual.sueldoBaseMensual || 0).toFixed(2)}</span>
                  </div>
                  {nominaActual.tipoPago === 'PorClase' && (
                    <div className="staff-nomina-note">
                      Calculado sobre {nominaActual.clasesValidadas} clases validadas esta semana
                    </div>
                  )}
                  <div className="staff-nomina-row">
                    <span>Bonos Extra</span>
                    <span className="staff-nomina-valor staff-nomina-valor--bono">
                      + ${nominaActual.totalBonos.toFixed(2)}
                    </span>
                  </div>
                  <div className="staff-nomina-row">
                    <span>Penalizaciones / Faltas</span>
                    <span className="staff-nomina-valor staff-nomina-valor--danger">
                      - ${nominaActual.totalPenalizaciones.toFixed(2)}
                    </span>
                  </div>
                  <div className="staff-nomina-total-row">
                    <span className="staff-nomina-total-label">A Pagar</span>
                    <span className="staff-nomina-total-valor">${nominaActual.granTotal.toFixed(2)}</span>
                  </div>
                  <button
                    type="button"
                    onClick={pagarNominaMes}
                    className="btn btn-success w-100 mt-3 py-2 fw-bold text-uppercase"
                    style={{ borderRadius: '12px', fontSize: '12px', letterSpacing: '0.5px' }}
                  >
                    <i className="fas fa-hand-holding-usd me-1"></i> Pagar Nómina de la Semana
                  </button>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
