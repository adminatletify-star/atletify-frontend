import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { USUARIOS_ENDPOINT } from '../services/api';
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import '../assets/css/AdminBoxPanel.css';

export default function AdminBoxPanel() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [box, setBox] = useState(null);
  const [atletas, setAtletas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [solicitudes, setSolicitudes] = useState([]);
  const [dashboardData, setDashboardData] = useState(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);

  // Estados para expandir/colapsar accesos rápidos (> 3 opciones)
  const [verMasDiarias, setVerMasDiarias] = useState(false);
  const [verMasClases, setVerMasClases] = useState(false);
  const [verMasFinanzas, setVerMasFinanzas] = useState(false);

  // Filtros (Se conservan variables para estabilidad del componente)
  const [busqueda, setBusqueda] = useState('');
  const [filtroCat, setFiltroCat] = useState('');
  const [filtroEstatus, setFiltroEstatus] = useState('');
  const [filtroPeriodo, setFiltroPeriodo] = useState('6m'); // '6m' = 6 meses, '1m' = 1 mes, '1s' = 1 semana

  // 🐺 Estados para Entorno Coach
  const [clasesCoach, setClasesCoach] = useState([]);
  const [nominaCoach, setNominaCoach] = useState(null);
  const [evaluacionesCoach, setEvaluacionesCoach] = useState(null);
  const [cargandoCoachDashboard, setCargandoCoachDashboard] = useState(false);

  // 💰 Estados para Widget de Aprobación de Clases (Admin)
  const [coachesPendientes, setCoachesPendientes] = useState([]);
  const [cargandoCoachesWidget, setCargandoCoachesWidget] = useState(false);
  
  // 🔍 Estados para Modal de Aprobación Rápida (Admin Dashboard)
  const [quickCoach, setQuickCoach] = useState(null);
  const [quickClases, setQuickClases] = useState([]);
  const [quickNomina, setQuickNomina] = useState(null);
  const [modalQuickValVisible, setModalQuickValVisible] = useState(false);

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem('usuario'));
    const b = JSON.parse(localStorage.getItem('box'));

    if (!u) {
      navigate('/login');
      return;
    }

    setUser(u);
    setBox(b);

    const isAdminUser = u.rol === 'AdminBox' || u.rol === 'Developer' || u.Rol === 'AdminBox' || u.Rol === 'Developer';
    const isCoachUser = !isAdminUser && (u.rol === 'Coach' || u.Rol === 'Coach');

    if (isAdminUser) {
      if (b?.idBox) {
        cargarDashboard(b.idBox);
        cargarAtletas(b.idBox);
      } else {
        setLoading(false);
      }
    } else if (isCoachUser) {
      cargarDashboardCoach(u.idUsuario || u.id || u.IdUsuario);
    } else {
      setLoading(false);
    }
  }, [navigate]);

  async function cargarDashboard(idBox) {
    setDashboardLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/finanzas/dashboard/${idBox}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDashboardData(data);
      }
    } catch (err) {
      console.error("Error al cargar dashboard financiero:", err);
    } finally {
      setDashboardLoading(false);
    }
  }

  async function cargarAtletas(idBox) {
    try {
      const response = await fetch(USUARIOS_ENDPOINT);
      const data = await response.json();
      const usuariosBox = Array.isArray(data) ? data : (data.data || []);

      const atletasFiltrados = usuariosBox.filter(x =>
        (x.idBoxPredeterminado === idBox || x.IdBoxPredeterminado === idBox) &&
        (x.rol === 'Atleta' || x.Rol === 'Atleta')
      );

      const solicitudesFiltradas = usuariosBox.filter(x =>
        (x.idBoxPredeterminado === idBox || x.IdBoxPredeterminado === idBox) &&
        (x.estatus === 'Pendiente' || x.Estatus === 'Pendiente')
      );

      setAtletas(atletasFiltrados);
      setSolicitudes(solicitudesFiltradas);

      // Carga en segundo plano de coaches y sus clases pendientes para el widget del Dashboard
      const coachesBox = usuariosBox.filter(x =>
        (x.idBoxPredeterminado === idBox || x.IdBoxPredeterminado === idBox) &&
        (x.rol === 'Coach' || x.Rol === 'Coach')
      );
      cargarCoachesPendientes(coachesBox);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // 🐺 Cargar Dashboard del Coach
  async function cargarDashboardCoach(idCoach) {
    setCargandoCoachDashboard(true);
    try {
      const token = localStorage.getItem('token');
      
      const hoyObj = new Date();
      const day = hoyObj.getDay(); 
      const diffToMonday = hoyObj.getDate() - day + (day === 0 ? -6 : 1);
      
      // Aseguramos fechas limpias para la semana
      const startOfWeek = new Date(hoyObj.getFullYear(), hoyObj.getMonth(), diffToMonday);
      const endOfWeek = new Date(hoyObj.getFullYear(), hoyObj.getMonth(), diffToMonday + 6);
      
      // YYYY-MM-DD local format
      const offset = startOfWeek.getTimezoneOffset() * 60000;
      const fInicioStr = new Date(startOfWeek.getTime() - offset).toISOString().split('T')[0];
      const fFinStr = new Date(endOfWeek.getTime() - offset).toISOString().split('T')[0];

      // 1. Clases programadas y asistencias de esta SEMANA
      const resClases = await fetch(`${import.meta.env.VITE_API_URL}/api/nomina/asistencias-coach-semanal/${idCoach}/${fInicioStr}/${fFinStr}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (resClases.ok) {
        setClasesCoach(await resClases.json());
      }

      // 2. Nómina estimada y desglose de la SEMANA
      const resNomina = await fetch(`${import.meta.env.VITE_API_URL}/api/nomina/calcular-semanal/${idCoach}/${fInicioStr}/${fFinStr}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (resNomina.ok) {
        setNominaCoach(await resNomina.json());
      }

      // 3. Calificaciones y feedback del coach
      const resEval = await fetch(`${import.meta.env.VITE_API_URL}/api/evaluaciones/coach/${idCoach}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (resEval.ok) {
        setEvaluacionesCoach(await resEval.json());
      }

    } catch (err) {
      console.error("Error al cargar dashboard de coach:", err);
    } finally {
      setCargandoCoachDashboard(false);
      setLoading(false);
    }
  }

  // 💰 Cargar Clases Pendientes de todos los coaches (para Widget del Admin)
  async function cargarCoachesPendientes(coachesBox) {
    if (!coachesBox || coachesBox.length === 0) return;
    setCargandoCoachesWidget(true);
    try {
      const hoy = new Date();
      const year = hoy.getFullYear();
      const month = hoy.getMonth() + 1;
      const token = localStorage.getItem('token');

      const coachesConPendientes = await Promise.all(coachesBox.map(async (coach) => {
        const id = coach.idUsuario || coach.id || coach.IdUsuario;
        try {
          const res = await fetch(`${import.meta.env.VITE_API_URL}/api/nomina/asistencias-coach/${id}/${year}/${month}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            const clases = await res.json();
            const pendientes = clases.filter(c => c.estado === 'Pendiente' || c.Estado === 'Pendiente');
            
            const resNom = await fetch(`${import.meta.env.VITE_API_URL}/api/nomina/calcular/${id}/${year}/${month}`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            const nom = resNom.ok ? await resNom.json() : null;

            return {
              ...coach,
              clases,
              pendientesCount: pendientes.length,
              clasesTotal: clases.length,
              nomina: nom
            };
          }
        } catch (e) {
          console.error("Error cargando clases del coach para widget:", e);
        }
        return { ...coach, clases: [], pendientesCount: 0, clasesTotal: 0, nomina: null };
      }));

      setCoachesPendientes(coachesConPendientes);
    } catch (err) {
      console.error("Error cargando widget de clases de staff:", err);
    } finally {
      setCargandoCoachesWidget(false);
    }
  }

  // 🔄 Recargar un solo coach en tiempo real después de validar clases
  async function recargarCoachWidget(coachId) {
    const token = localStorage.getItem('token');
    const hoy = new Date();
    const year = hoy.getFullYear();
    const month = hoy.getMonth() + 1;
    try {
      const resClases = await fetch(`${import.meta.env.VITE_API_URL}/api/nomina/asistencias-coach/${coachId}/${year}/${month}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (resClases.ok) {
        const clases = await resClases.json();
        const pendientes = clases.filter(c => c.estado === 'Pendiente' || c.Estado === 'Pendiente');
        
        const resNomina = await fetch(`${import.meta.env.VITE_API_URL}/api/nomina/calcular/${coachId}/${year}/${month}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const nomina = resNomina.ok ? await resNomina.json() : null;

        setCoachesPendientes(prev => prev.map(c => {
          const id = c.idUsuario || c.id || c.IdUsuario;
          if (id === coachId) {
            return {
              ...c,
              clases,
              pendientesCount: pendientes.length,
              clasesTotal: clases.length,
              nomina
            };
          }
          return c;
        }));

        // Actualizar el estado local si es el coach del modal actual
        if (quickCoach && (quickCoach.idUsuario === coachId || quickCoach.id === coachId)) {
          setQuickClases(clases);
          setQuickNomina(nomina);
        }
      }
    } catch (err) {
      console.error("Error al recargar coach:", err);
    }
  }

  // 🔍 Acciones del Modal de Aprobación Rápida
  const abrirQuickVal = (coach) => {
    setQuickCoach(coach);
    setQuickClases(coach.clases || []);
    setQuickNomina(coach.nomina);
    setModalQuickValVisible(true);
  };

  const cerrarQuickVal = () => {
    setModalQuickValVisible(false);
    setTimeout(() => {
      setQuickCoach(null);
      setQuickClases([]);
      setQuickNomina(null);
    }, 200);
  };

  const ejecutarQuickValidar = async (idClase, fecha, estado, montoPago) => {
    const coachId = quickCoach.idUsuario || quickCoach.id || quickCoach.IdUsuario;
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/nomina/validar-clase`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          IdCoach: coachId,
          IdClase: idClase,
          Fecha: fecha,
          Estado: estado,
          MontoPago: parseFloat(montoPago)
        })
      });
      if (res.ok) {
        await recargarCoachWidget(coachId);
      }
    } catch (e) {
      alert("Error al validar la asistencia de la clase.");
    }
  };

  const ejecutarQuickPagar = async () => {
    const coachId = quickCoach.idUsuario || quickCoach.id || quickCoach.IdUsuario;
    if (!window.confirm(`¿Seguro que deseas proceder con el pago definitivo de la nómina de ${quickCoach.nombre || quickCoach.Nombre} por $${quickNomina.granTotal.toFixed(2)}? Se registrará un Egreso Financiero en contabilidad y se cerrará el mes.`)) return;
    
    const token = localStorage.getItem('token');
    const hoy = new Date();
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/nomina/pagar/${coachId}/${hoy.getFullYear()}/${hoy.getMonth() + 1}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        alert("Pago de nómina registrado y cerrado con éxito. ¡Egreso emitido! ✅");
        cerrarQuickVal();
        if (box?.idBox) {
          cargarDashboard(box.idBox);
          cargarAtletas(box.idBox);
        }
  } else {
        const error = await res.json();
        alert(error.mensaje || "Error al procesar el pago.");
      }
    } catch (e) {
      alert("Error de red al procesar el pago.");
    }
  };

  const isAdmin = user?.rol === 'AdminBox' || user?.rol === 'Developer';
  const isCoach = !isAdmin && (user?.rol === 'Coach' || user?.Rol === 'Coach');
  const atletasActivos = atletas.filter(a => a.activo);
  const atletasInactivos = atletas.filter(a => !a.activo);

  // Categorías únicas
  const categorias = [...new Set(atletas.map(a => a.categoriaBase).filter(Boolean))].sort();

  // Seleccionar la serie histórica según el filtro de periodo activo
  let trendData = [];
  if (filtroPeriodo === '1s') {
    trendData = dashboardData?.historicoSemana || [
      { mes: 'Lun', ingresos: 0, egresos: 0 },
      { mes: 'Mar', ingresos: 0, egresos: 0 },
      { mes: 'Mié', ingresos: 0, egresos: 0 },
      { mes: 'Jue', ingresos: 0, egresos: 0 },
      { mes: 'Vie', ingresos: 0, egresos: 0 },
      { mes: 'Sáb', ingresos: 0, egresos: 0 },
      { mes: 'Dom', ingresos: 0, egresos: 0 }
    ];
  } else if (filtroPeriodo === '1m') {
    trendData = dashboardData?.historicoMes || Array.from({ length: 30 }, (_, i) => ({
      mes: `${i + 1}`,
      ingresos: 0,
      egresos: 0
    }));
  } else {
    trendData = dashboardData?.historico || [
      { mes: 'Dic', ingresos: 0, egresos: 0 },
      { mes: 'Ene', ingresos: 0, egresos: 0 },
      { mes: 'Feb', ingresos: 0, egresos: 0 },
      { mes: 'Mar', ingresos: 0, egresos: 0 },
      { mes: 'Abr', ingresos: 0, egresos: 0 },
      { mes: 'May', ingresos: 0, egresos: 0 }
    ];
  }

  const formatearDinero = (monto) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(monto || 0);
  };

  const calcularDiasVencidos = (fechaString) => {
    if (!fechaString) return 0;
    const dif = new Date() - new Date(fechaString);
    return Math.max(0, Math.floor(dif / (1000 * 60 * 60 * 24)));
  };

  const enviarRecordatorioWhatsApp = (nombre) => {
    const mensaje = `Hola ${nombre}, te saludamos de ${box?.nombre || 'tu Box'}. Te recordamos que tu mensualidad ha vencido. Te esperamos en recepción para renovar tu plan y seguir entrenando con todo. ¡Que tengas un excelente día! 🐺💪`;
    window.open(`https://wa.me/?text=${encodeURIComponent(mensaje)}`, '_blank');
  };

  const getBadgeEstado = (estado) => {
    switch (estado) {
      case 'Validada':
        return <span className="badge bg-success-glow text-success px-2 py-1"><i className="fas fa-check-circle me-1"></i>Validada</span>;
      case 'Falta':
        return <span className="badge bg-danger-glow text-danger px-2 py-1"><i className="fas fa-times-circle me-1"></i>Falta</span>;
      default:
        return <span className="badge bg-warning-glow text-warning px-2 py-1"><i className="fas fa-clock me-1"></i>Pendiente</span>;
    }
  };

  const renderCoachDashboard = () => {
    const hoy = new Date();
    const hoyStr = hoy.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
    
    // Filtrar clases de hoy
    const clasesHoy = clasesCoach.filter(c => {
      const f = c.fecha || c.Fecha;
      if (!f) return false;
      const claseFecha = new Date(f);
      return claseFecha.getUTCDate() === hoy.getDate() &&
             claseFecha.getUTCMonth() === hoy.getMonth() &&
             claseFecha.getUTCFullYear() === hoy.getFullYear();
    });

    const validatedCount = clasesCoach.filter(c => (c.estado || c.Estado) === 'Validada').length;
    const totalCount = clasesCoach.length;

    return (
      <div className="abp-page coach-dashboard">
        <div className="container-xl px-3 px-md-4">
          
          {/* HERO HEADER */}
          <section className="abp-hero">
            <div className="d-flex justify-content-between align-items-start gap-3">
              <div className="d-flex align-items-center gap-3">
                <div className="position-relative">
                  <div className="coach-avatar-ring">
                    {user?.foto || user?.Foto ? (
                      <img
                        src={user.foto || user.Foto}
                        alt={user.nombre}
                        className="coach-profile-img shadow"
                      />
                    ) : (
                      <div className="coach-avatar-placeholder shadow">
                        {user.nombre?.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <span className="coach-active-badge"></span>
                </div>
                <div>
                  <span className="abp-role-badge mb-1 d-inline-block shadow-sm">
                    <i className="fas fa-dumbbell me-1"></i>COACH STAFF
                  </span>
                  <h1 className="abp-box-title" style={{ lineHeight: '1.1' }}>¡HOLA, {user.nombre?.toUpperCase()}!</h1>
                  <p className="abp-hero-sub mb-0 mt-1 opacity-75">
                    <i className="fas fa-warehouse me-1 text-danger"></i>{box?.nombre || 'Mi Box'} • Panel del Entrenador
                  </p>
                </div>
              </div>
              <Link to="/perfil-admin" className="abp-config-btn mt-1">
                <i className="fas fa-user-edit"></i>
                <span className="d-none d-sm-inline">Mi Expediente</span>
              </Link>
            </div>

            {/* QUICK STATS CARD ROW */}
            <div className="row g-3 abp-stats-row">
              <div className="col-6 col-md-3">
                <div className="abp-stat-card" style={{ '--accent-line': 'var(--accent-cool)' }}>
                  <div className="d-flex justify-content-between align-items-start">
                    <div className="abp-stat-card-content">
                      <div className="abp-stat-number" style={{ color: 'var(--accent-cool)' }}>{totalCount}</div>
                      <div className="abp-stat-label">Clases de la Semana</div>
                    </div>
                    <div className="abp-stat-icon" style={{ background: 'rgba(79,195,247,0.1)', color: 'var(--accent-cool)' }}>
                      <i className="fas fa-calendar-alt"></i>
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-6 col-md-3">
                <div className="abp-stat-card" style={{ '--accent-line': 'var(--success)' }}>
                  <div className="d-flex justify-content-between align-items-start">
                    <div className="abp-stat-card-content">
                      <div className="abp-stat-number" style={{ color: 'var(--success)' }}>{validatedCount}</div>
                      <div className="abp-stat-label">Clases Validadas</div>
                    </div>
                    <div className="abp-stat-icon" style={{ background: 'rgba(46,204,113,0.1)', color: 'var(--success)' }}>
                      <i className="fas fa-check-circle"></i>
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-6 col-md-3">
                <div className="abp-stat-card" style={{ '--accent-line': 'var(--warning)' }}>
                  <div className="d-flex justify-content-between align-items-start">
                    <div className="abp-stat-card-content">
                      <div className="abp-stat-number" style={{ color: 'var(--warning)' }}>
                        {(() => {
                          let pagoEst = 0;
                          const tipoPago = nominaCoach?.tipoPago || nominaCoach?.TipoPago;
                          if (tipoPago === 'PorClase') {
                            pagoEst = clasesCoach.reduce((s, c) => s + (c.montoPago || c.MontoPago || 0), 0);
                          } else {
                            pagoEst = nominaCoach?.sueldoBaseSemanal || nominaCoach?.SueldoBaseSemanal || 0;
                          }
                          const bonos = nominaCoach?.totalBonos || nominaCoach?.TotalBonos || 0;
                          const pens = nominaCoach?.totalPenalizaciones || nominaCoach?.TotalPenalizaciones || 0;
                          const estimado = pagoEst + bonos - pens;
                          return formatearDinero(estimado || 0);
                        })()}
                      </div>
                      <div className="abp-stat-label">Mi Nómina Estimada</div>
                    </div>
                    <div className="abp-stat-icon" style={{ background: 'rgba(243,156,18,0.1)', color: 'var(--warning)' }}>
                      <i className="fas fa-wallet"></i>
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-6 col-md-3">
                <div className="abp-stat-card" style={{ '--accent-line': 'var(--danger)' }}>
                  <div className="d-flex justify-content-between align-items-start">
                    <div className="abp-stat-card-content">
                      <div className="abp-stat-number" style={{ color: 'var(--danger)' }}>
                        {evaluacionesCoach?.total > 0 || evaluacionesCoach?.Total > 0
                          ? `${(evaluacionesCoach?.promedio || evaluacionesCoach?.Promedio || 0).toFixed(1)} ★`
                          : 'S/C'}
                      </div>
                      <div className="abp-stat-label">Mi Calificación</div>
                    </div>
                    <div className="abp-stat-icon" style={{ background: 'rgba(231,76,60,0.1)', color: 'var(--danger)' }}>
                      <i className="fas fa-star"></i>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* TWO COLUMN GRID */}
          <div className="abp-dashboard-grid mt-2">
            
            {/* MAIN COLUMN (LEFT) */}
            <div className="abp-main-col">
              
              {/* MIS CLASES DE HOY */}
              <section className="abp-glass-card mb-4" style={{ borderLeft: '4px solid var(--accent-cool)' }}>
                <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom border-secondary">
                  <div>
                    <h4 className="abp-card-title mb-0">
                      <i className="fas fa-clipboard-list me-2 text-info"></i>Mis Clases de Hoy
                    </h4>
                    <span className="text-muted small mt-1 d-inline-block">{hoyStr}</span>
                  </div>
                  <Link to="/pase-de-lista" className="btn btn-outline-info btn-xs py-1 px-2 rounded-pill d-flex align-items-center gap-1 border-0" style={{ fontSize: '11px' }}>
                    <i className="fas fa-clipboard-check"></i>
                    <span>Ir a Pase de Lista</span>
                  </Link>
                </div>

                {clasesHoy.length === 0 ? (
                  <div className="text-center py-4 text-muted">
                    <i className="fas fa-mug-hot fs-2 text-secondary mb-2 d-block"></i>
                    <span>No tienes clases programadas para hoy. ¡Disfruta tu día de descanso! 🧘‍♂️</span>
                  </div>
                ) : (
                  <div className="row g-3">
                    {clasesHoy.map((c, i) => {
                      const est = c.estado || c.Estado;
                      const nom = c.nombreClase || c.NombreClase || c.nombre || c.Nombre;
                      const hor = c.horario || c.Horario || c.hora || c.Hora;
                      const mon = c.montoPago || c.MontoPago;
                      return (
                        <div key={i} className="col-12 col-md-6 animate-fade-in" style={{ animationDelay: `${i * 0.08}s` }}>
                          <div className="coach-class-card p-3 rounded-12 bg-dark-glow d-flex justify-content-between align-items-center">
                            <div>
                              <div className="fw-bold text-white fs-6">{nom}</div>
                              <div className="text-muted small mt-1">
                                <i className="far fa-clock me-1 text-info"></i>{hor}
                              </div>
                              <div className="text-muted small mt-1">
                                <i className="fas fa-hand-holding-usd me-1 text-success"></i>Tarifa: {formatearDinero(mon)}
                              </div>
                            </div>
                            <div className="d-flex flex-column align-items-end gap-2">
                              {getBadgeEstado(est)}
                              <Link 
                                to="/pase-de-lista" 
                                className="btn btn-xs py-1 px-2 bg-info-glow text-info border-0 rounded-8 font-weight-bold" 
                                style={{ fontSize: '10px' }}
                              >
                                <i className="fas fa-users-cog me-1"></i>Atletas
                              </Link>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* DETALLE DE NOMINA Y LISTADO COMPLETO DEL MES */}
              <section className="abp-glass-card">
                <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom border-secondary">
                  <div>
                    <h4 className="abp-card-title mb-0">
                      <i className="fas fa-wallet me-2 text-warning"></i>Desglose de Nómina Estimada (Esta Semana)
                    </h4>
                    <span className="text-muted small">Cálculos automáticos en base a tus asistencias validadas de Lunes a Domingo</span>
                  </div>
                  <span className="badge bg-warning-glow text-warning font-weight-bold px-2 py-1">
                    Corte: Día {nominaCoach?.diaCorte || 15}
                  </span>
                </div>

                <div className="row g-3 mb-4">
                  {/* Cards de desglose */}
                  <div className="col-12 col-sm-4">
                    <div className="bg-dark-glow p-3 rounded-12 text-center">
                      <div className="text-muted small mb-1">Sueldo Base</div>
                      <h5 className="text-white mb-0 fw-bold">{formatearDinero(nominaCoach?.sueldoBase || 0)}</h5>
                    </div>
                  </div>
                  <div className="col-12 col-sm-4">
                    <div className="bg-dark-glow p-3 rounded-12 text-center" style={{ borderLeft: '2px solid var(--success)' }}>
                      <div className="text-muted small mb-1">Bonos</div>
                      <h5 className="text-success mb-0 fw-bold">+{formatearDinero(nominaCoach?.totalBonos || 0)}</h5>
                    </div>
                  </div>
                  <div className="col-12 col-sm-4">
                    <div className="bg-dark-glow p-3 rounded-12 text-center" style={{ borderLeft: '2px solid var(--danger)' }}>
                      <div className="text-muted small mb-1">Penalizaciones</div>
                      <h5 className="text-danger mb-0 fw-bold">-{formatearDinero(nominaCoach?.totalPenalizaciones || 0)}</h5>
                    </div>
                  </div>
                </div>

                {/* Listado de todas las clases del mes */}
                <h5 className="abp-card-title mb-3" style={{ fontSize: '0.85rem', opacity: '0.9' }}>
                  Historial Completo de Clases del Mes ({totalCount})
                </h5>
                
                {clasesCoach.length === 0 ? (
                  <div className="text-center text-muted py-3">No hay registros de clases este mes.</div>
                ) : (
                  <div className="table-responsive" style={{ maxHeight: '350px', overflowY: 'auto' }}>
                    <table className="table table-dark table-hover table-borderless align-middle mb-0" style={{ fontSize: '12px', background: 'transparent' }}>
                      <thead>
                        <tr className="text-muted border-bottom border-secondary">
                          <th className="py-2">Clase</th>
                          <th className="py-2">Fecha</th>
                          <th className="py-2">Hora</th>
                          <th className="py-2 text-end">Tarifa</th>
                          <th className="py-2 text-center">Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {clasesCoach.map((c, idx) => {
                          const est = c.estado || c.Estado;
                          const nom = c.nombreClase || c.NombreClase || c.nombre || c.Nombre;
                          const f = c.fecha || c.Fecha;
                          const hor = c.horario || c.Horario || c.hora || c.Hora;
                          const mon = c.montoPago || c.MontoPago;
                          const fStr = f ? new Date(f).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) : '-';
                          return (
                            <tr key={idx} className="border-bottom border-secondary-glow">
                              <td className="py-2 fw-bold text-white">{nom}</td>
                              <td className="py-2 text-white-50">{fStr}</td>
                              <td className="py-2 text-white-50">{hor}</td>
                              <td className="py-2 text-end fw-bold text-success">{formatearDinero(mon)}</td>
                              <td className="py-2 text-center">{getBadgeEstado(est)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </div>

            {/* SIDEBAR COLUMN (RIGHT) */}
            <div className="abp-sidebar-col">
              
              {/* ACCESOS RAPIDOS COACH */}
              <section className="abp-glass-card mb-4" style={{ borderLeft: '4px solid var(--danger)' }}>
                <h4 className="abp-card-title mb-3">
                  <i className="fas fa-th-large me-2 text-danger"></i>Operaciones Coach
                </h4>
                <div className="d-flex flex-column gap-2">
                  <Link to="/creador-wods" className="abp-quick-card py-2">
                    <div className="abp-card-icon-wrapper" style={{ '--icon-color': '#e74c3c' }}>
                      <i className="fas fa-file-signature"></i>
                    </div>
                    <div className="abp-card-content">
                      <div className="abp-card-title" style={{ fontSize: '0.8rem' }}>Planificar WODs</div>
                      <div className="abp-card-desc">Crea entrenamientos diarios</div>
                    </div>
                  </Link>
                  <Link to="/admin-calendario" className="abp-quick-card py-2">
                    <div className="abp-card-icon-wrapper" style={{ '--icon-color': '#e67e22' }}>
                      <i className="fas fa-calendar-alt"></i>
                    </div>
                    <div className="abp-card-content">
                      <div className="abp-card-title" style={{ fontSize: '0.8rem' }}>Calendario de Clases</div>
                      <div className="abp-card-desc">Revisa horarios y reservas</div>
                    </div>
                  </Link>
                  <Link to="/atletas-box" className="abp-quick-card py-2">
                    <div className="abp-card-icon-wrapper" style={{ '--icon-color': '#2ecc71' }}>
                      <i className="fas fa-users"></i>
                    </div>
                    <div className="abp-card-content">
                      <div className="abp-card-title" style={{ fontSize: '0.8rem' }}>Directorio de Atletas</div>
                      <div className="abp-card-desc">Ver perfiles y niveles</div>
                    </div>
                  </Link>
                  <Link to="/perfil-admin" className="abp-quick-card py-2">
                    <div className="abp-card-icon-wrapper" style={{ '--icon-color': '#3498db' }}>
                      <i className="fas fa-id-card"></i>
                    </div>
                    <div className="abp-card-content">
                      <div className="abp-card-title" style={{ fontSize: '0.8rem' }}>Mi Perfil de Staff</div>
                      <div className="abp-card-desc">Tus datos médicos y de contrato</div>
                    </div>
                  </Link>
                  <Link to="/preguntas-frecuentes" className="abp-quick-card py-2">
                    <div className="abp-card-icon-wrapper" style={{ '--icon-color': '#22c55e' }}>
                      <i className="fas fa-question-circle"></i>
                    </div>
                    <div className="abp-card-content">
                      <div className="abp-card-title" style={{ fontSize: '0.8rem' }}>Preguntas Frecuentes</div>
                      <div className="abp-card-desc">Guías y respuestas para tu rol</div>
                    </div>
                  </Link>
                </div>
              </section>

              {/* OPINIONES / FEEDBACK */}
              <section className="abp-glass-card">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h4 className="abp-card-title mb-0">
                    <i className="fas fa-star me-2 text-warning"></i>Feedback de Atletas
                  </h4>
                  <span className="badge bg-danger-glow text-danger fw-bold px-2 py-1" style={{ fontSize: '10px' }}>
                    {evaluacionesCoach?.total || evaluacionesCoach?.Total || 0} opiniones
                  </span>
                </div>

                {!evaluacionesCoach?.resenas || evaluacionesCoach.resenas.length === 0 ? (
                  <div className="text-center py-4 text-muted">
                    <i className="far fa-star fs-3 text-secondary mb-2 d-block"></i>
                    <span>Aún no tienes valoraciones registradas en el sistema. ¡Sigue dando lo mejor! 🐺</span>
                  </div>
                ) : (
                  <>
                    {/* Calificación promedio */}
                    <div className="bg-dark-glow p-3 rounded-12 text-center mb-3">
                      <div className="display-4 fw-bold text-white mb-0" style={{ fontFamily: 'var(--font-stats)' }}>
                        {evaluacionesCoach.promedio || evaluacionesCoach.Promedio}
                      </div>
                      <div className="text-warning my-1">
                        {Array.from({ length: 5 }, (_, idxStar) => {
                          const prom = evaluacionesCoach.promedio || evaluacionesCoach.Promedio;
                          return (
                            <i 
                              key={idxStar} 
                              className={`${idxStar < Math.round(prom) ? 'fas' : 'far'} fa-star me-1`}
                            ></i>
                          );
                        })}
                      </div>
                      <div className="text-muted small">Valoración promedio del staff</div>
                    </div>

                    {/* Lista de comentarios */}
                    <div className="coach-reviews-list d-flex flex-column gap-2" style={{ maxHeight: '250px', overflowY: 'auto' }}>
                      {evaluacionesCoach.resenas.map((r, i) => (
                        <div key={i} className="bg-dark-glow p-2 rounded-10 border border-secondary-glow">
                          <div className="d-flex justify-content-between align-items-center mb-1">
                            <span className="fw-bold text-white small truncate" style={{ maxWidth: '100px' }}>
                              {r.nombreAtleta || r.NombreAtleta}
                            </span>
                            <span className="text-warning" style={{ fontSize: '10px' }}>
                              {Array.from({ length: 5 }, (_, idx) => (
                                <i key={idx} className={`${idx < r.estrellas ? 'fas' : 'far'} fa-star`}></i>
                              ))}
                            </span>
                          </div>
                          <p className="text-white-50 mb-0 small" style={{ fontStyle: 'italic', fontSize: '11px', lineHeight: '1.2' }}>
                            "{r.comentario || r.Comentario}"
                          </p>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </section>

            </div>

          </div>

        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="abp-loading">
        <div className="spinner-border text-danger" role="status" style={{ width: '3rem', height: '3rem' }}></div>
      </div>
    );
  }

  if (isCoach) {
    return renderCoachDashboard();
  }

  return (
    <div className="abp-page">
      <div className="container-xl px-3 px-md-4">

        {/* ══════════════════════════════════
            HERO HEADER
        ══════════════════════════════════ */}
        <section className="abp-hero">
          <div className="d-flex justify-content-between align-items-start gap-3">
            <div>
              <span className="abp-role-badge mb-3 d-inline-block shadow-sm">
                <i className="fas fa-shield-alt me-1"></i>{user?.rol}
              </span>
              <div className="d-flex align-items-center gap-3">
                {box?.logo && (
                  <img
                    src={box.logo}
                    alt={box?.nombre || 'Logo Box'}
                    style={{ width: '70px', height: '70px', objectFit: 'cover', borderRadius: '14px', background: '#1c1c24', border: '1px solid rgba(255,255,255,0.1)' }}
                  />
                )}
                <div>
                  <h1 className="abp-box-title mb-0" style={{ lineHeight: '1.1' }}>{box?.nombre || 'MI BOX'}</h1>
                  <p className="abp-hero-sub mb-0 mt-1 opacity-75">Centro de mando y control operativo</p>
                </div>
              </div>
            </div>
            {isAdmin && (
              <Link to="/editar-box" className="abp-config-btn mt-1">
                <i className="fas fa-cog"></i>
                <span className="d-none d-sm-inline">Configurar Box</span>
              </Link>
            )}
          </div>

          {/* ESTADÍSTICAS RÁPIDAS */}
          <div className="row g-3 abp-stats-row">
            <div className="col-6 col-md-3">
              <Link to="/atletas-box" className="text-decoration-none d-block">
                <div className="abp-stat-card" style={{ '--accent-line': 'var(--accent-cool)', cursor: 'pointer' }}>
                  <div className="d-flex justify-content-between align-items-start">
                    <div className="abp-stat-card-content">
                      <div className="abp-stat-number" style={{ color: 'var(--accent-cool)' }}>{atletas.length}</div>
                      <div className="abp-stat-label">Total Atletas</div>
                    </div>
                    <div className="abp-stat-icon" style={{ background: 'rgba(79,195,247,0.1)', color: 'var(--accent-cool)' }}>
                      <i className="fas fa-users"></i>
                    </div>
                  </div>
                </div>
              </Link>
            </div>

            <div className="col-6 col-md-3">
              <Link to="/atletas-box?estatus=activo" className="text-decoration-none d-block">
                <div className="abp-stat-card" style={{ '--accent-line': 'var(--success)', cursor: 'pointer' }}>
                  <div className="d-flex justify-content-between align-items-start">
                    <div className="abp-stat-card-content">
                      <div className="abp-stat-number" style={{ color: 'var(--success)' }}>{atletasActivos.length}</div>
                      <div className="abp-stat-label">Activos</div>
                    </div>
                    <div className="abp-stat-icon" style={{ background: 'rgba(46,204,113,0.1)', color: 'var(--success)' }}>
                      <i className="fas fa-check-circle"></i>
                    </div>
                  </div>
                </div>
              </Link>
            </div>

            <div className="col-6 col-md-3">
              <Link to="/atletas-box?estatus=inactivo" className="text-decoration-none d-block">
                <div className="abp-stat-card" style={{ '--accent-line': 'var(--danger)', cursor: 'pointer' }}>
                  <div className="d-flex justify-content-between align-items-start">
                    <div className="abp-stat-card-content">
                      <div className="abp-stat-number" style={{ color: 'var(--danger)' }}>{atletasInactivos.length}</div>
                      <div className="abp-stat-label">Inactivos</div>
                    </div>
                    <div className="abp-stat-icon" style={{ background: 'rgba(231,76,60,0.1)', color: 'var(--danger)' }}>
                      <i className="fas fa-times-circle"></i>
                    </div>
                  </div>
                </div>
              </Link>
            </div>

            {isAdmin && (
              <div className="col-6 col-md-3">
                <Link to="/gestion-solicitudes" className="text-decoration-none d-block">
                  <div className="abp-stat-card" style={{ '--accent-line': 'var(--warning)', cursor: 'pointer' }}>
                    <div className="d-flex justify-content-between align-items-start">
                      <div className="abp-stat-card-content">
                        <div className="abp-stat-number" style={{ color: solicitudes.length > 0 ? 'var(--warning)' : 'var(--text-muted)' }}>
                          {solicitudes.length}
                        </div>
                        <div className="abp-stat-label">Solicitudes</div>
                      </div>
                      <div className="abp-stat-icon" style={{ background: 'rgba(243,156,18,0.1)', color: 'var(--warning)' }}>
                        <i className="fas fa-bell"></i>
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            )}
          </div>
        </section>

        {/* ══════════════════════════════════
            DISTRIBUCIÓN DEL DASHBOARD
        ══════════════════════════════════ */}
        <div className="abp-dashboard-grid">

          {/* COLUMNA PRINCIPAL (IZQUIERDA) */}
          <div className="abp-main-col">

            {/* GRID DE ACCESOS RÁPIDOS CATEGORIZADOS */}
            <section className="abp-section mb-4">
              <p className="abp-section-label">
                <i className="fas fa-th-large me-2"></i>Accesos Rápidos
              </p>

              <div className="abp-category-container">
                <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                  <h3 className="abp-category-title mb-0">
                    <i className="fas fa-running me-2 text-success"></i>Operaciones Diarias
                  </h3>
                  <button
                    type="button"
                    onClick={() => setVerMasDiarias(!verMasDiarias)}
                    className="btn btn-outline-light btn-xs py-1 px-2 d-flex align-items-center gap-1 border-0"
                    style={{ fontSize: '11px', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.7)', borderRadius: '12px', transition: 'all 0.2s' }}
                  >
                    <span>{verMasDiarias ? 'Ver menos' : 'Más opciones'}</span>
                    <i className={`fas ${verMasDiarias ? 'fa-chevron-up' : 'fa-chevron-down'}`}></i>
                  </button>
                </div>
                <div className="abp-quick-grid">
                  <Link to="/perfil-admin" className="abp-quick-card">
                    <div className="abp-card-icon-wrapper" style={{ '--icon-color': '#3498db' }}>
                      <i className="fas fa-id-card"></i>
                    </div>
                    <div className="abp-card-content">
                      <div className="abp-card-title">Mi Perfil / Expediente</div>
                      <div className="abp-card-desc">Información personal y médica del coach</div>
                    </div>
                  </Link>
                  <Link to="/pase-de-lista" className="abp-quick-card">
                    <div className="abp-card-icon-wrapper" style={{ '--icon-color': '#2ecc71' }}>
                      <i className="fas fa-clipboard-check"></i>
                    </div>
                    <div className="abp-card-content">
                      <div className="abp-card-title">Pase de Lista</div>
                      <div className="abp-card-desc">Registra las asistencias del día</div>
                    </div>
                  </Link>
                  <Link to="/calendario-wods" className="abp-quick-card">
                    <div className="abp-card-icon-wrapper" style={{ '--icon-color': '#e67e22' }}>
                      <i className="fas fa-calendar-plus"></i>
                    </div>
                    <div className="abp-card-content">
                      <div className="abp-card-title">Programar WODs</div>
                      <div className="abp-card-desc">Planifica entrenamientos diarios</div>
                    </div>
                  </Link>
                  {verMasDiarias && (
                    <>
                      <Link to="/registro-manual" className="abp-quick-card animate-fade-in">
                        <div className="abp-card-icon-wrapper" style={{ '--icon-color': '#9b59b6' }}>
                          <i className="fas fa-user-plus"></i>
                        </div>
                        <div className="abp-card-content">
                          <div className="abp-card-title">Nuevo Atleta</div>
                          <div className="abp-card-desc">Da de alta atletas manualmente</div>
                        </div>
                      </Link>
                      <Link to="/atletas-box" className="abp-quick-card animate-fade-in">
                        <div className="abp-card-icon-wrapper" style={{ '--icon-color': '#2ecc71' }}>
                          <i className="fas fa-users"></i>
                        </div>
                        <div className="abp-card-content">
                          <div className="abp-card-title">Directorio de Atletas</div>
                          <div className="abp-card-desc">Listado y control de atletas en el box</div>
                        </div>
                      </Link>
                      <Link to="/admin-roster" className="abp-quick-card animate-fade-in">
                        <div className="abp-card-icon-wrapper" style={{ '--icon-color': '#9b59b6' }}>
                          <i className="fas fa-address-book"></i>
                        </div>
                        <div className="abp-card-content">
                          <div className="abp-card-title">Roster de Coaches</div>
                          <div className="abp-card-desc">Horarios, asignaciones y asistencia de entrenadores</div>
                        </div>
                      </Link>
                    </>
                  )}
                </div>
              </div>

              <div className="abp-category-container mt-4">
                <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                  <h3 className="abp-category-title mb-0">
                    <i className="fas fa-dumbbell me-2 text-info"></i>Administración de Clases
                  </h3>
                  <button
                    type="button"
                    onClick={() => setVerMasClases(!verMasClases)}
                    className="btn btn-outline-light btn-xs py-1 px-2 d-flex align-items-center gap-1 border-0"
                    style={{ fontSize: '11px', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.7)', borderRadius: '12px', transition: 'all 0.2s' }}
                  >
                    <span>{verMasClases ? 'Ver menos' : 'Más opciones'}</span>
                    <i className={`fas ${verMasClases ? 'fa-chevron-up' : 'fa-chevron-down'}`}></i>
                  </button>
                </div>
                <div className="abp-quick-grid">
                  <Link to="/gestion-clases" className="abp-quick-card">
                    <div className="abp-card-icon-wrapper" style={{ '--icon-color': '#e74c3c' }}>
                      <i className="fas fa-dumbbell"></i>
                    </div>
                    <div className="abp-card-content">
                      <div className="abp-card-title">Clases y WODs</div>
                      <div className="abp-card-desc">Horarios, instructores y reservas</div>
                    </div>
                  </Link>
                  <Link to="/gestion-reglamento" className="abp-quick-card">
                    <div className="abp-card-icon-wrapper" style={{ '--icon-color': '#1abc9c' }}>
                      <i className="fas fa-gavel"></i>
                    </div>
                    <div className="abp-card-content">
                      <div className="abp-card-title">Reglamento</div>
                      <div className="abp-card-desc">Políticas y reglamentos internos</div>
                    </div>
                  </Link>
                  <Link to="/admin-calendario" className="abp-quick-card">
                    <div className="abp-card-icon-wrapper" style={{ '--icon-color': '#e67e22' }}>
                      <i className="fas fa-calendar-alt"></i>
                    </div>
                    <div className="abp-card-content">
                      <div className="abp-card-title">Calendario de Clases</div>
                      <div className="abp-card-desc">Calendario semanal de reservas y asistencia</div>
                    </div>
                  </Link>
                  {verMasClases && (
                    <Link to="/creador-wods" className="abp-quick-card animate-fade-in">
                      <div className="abp-card-icon-wrapper" style={{ '--icon-color': '#1abc9c' }}>
                        <i className="fas fa-file-signature"></i>
                      </div>
                      <div className="abp-card-content">
                        <div className="abp-card-title">Creador de WODs</div>
                        <div className="abp-card-desc">Crea y edita plantillas de entrenamientos (WODs)</div>
                      </div>
                    </Link>
                  )}
                </div>
              </div>

              {isAdmin && (
                <div className="abp-category-container mt-4">
                  <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                    <h3 className="abp-category-title mb-0">
                      <i className="fas fa-hand-holding-usd me-2 text-warning"></i>Finanzas & Escuadrones
                    </h3>
                    <button
                      type="button"
                      onClick={() => setVerMasFinanzas(!verMasFinanzas)}
                      className="btn btn-outline-light btn-xs py-1 px-2 d-flex align-items-center gap-1 border-0"
                      style={{ fontSize: '11px', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.7)', borderRadius: '12px', transition: 'all 0.2s' }}
                    >
                      <span>{verMasFinanzas ? 'Ver menos' : 'Más opciones'}</span>
                      <i className={`fas ${verMasFinanzas ? 'fa-chevron-up' : 'fa-chevron-down'}`}></i>
                    </button>
                  </div>
                  <div className="abp-quick-grid">
                    <Link to="/gestion-ventas-productos" className="abp-quick-card">
                      <div className="abp-card-icon-wrapper" style={{ '--icon-color': '#f1c40f' }}>
                        <i className="fas fa-cash-register"></i>
                      </div>
                      <div className="abp-card-content">
                        <div className="abp-card-title">Tienda y POS</div>
                        <div className="abp-card-desc">Venta de suplementos y abono de fiados</div>
                      </div>
                    </Link>
                    <Link to="/finanzas-globales" className="abp-quick-card">
                      <div className="abp-card-icon-wrapper" style={{ '--icon-color': '#2ecc71' }}>
                        <i className="fas fa-chart-line"></i>
                      </div>
                      <div className="abp-card-content">
                        <div className="abp-card-title">Finanzas Globales</div>
                        <div className="abp-card-desc">Ingresos, egresos y balance general</div>
                      </div>
                    </Link>
                    <Link to="/admin-box/grupos-familiares" className="abp-quick-card">
                      <div className="abp-card-icon-wrapper" style={{ '--icon-color': '#e74c3c' }}>
                        <i className="fas fa-users-cog"></i>
                      </div>
                      <div className="abp-card-content">
                        <div className="abp-card-title">Grupos Familiares</div>
                        <div className="abp-card-desc">Planes de descuento para escuadrones</div>
                      </div>
                    </Link>
                    {verMasFinanzas && (
                      <>
                        <Link to="/gestion-finanzas" className="abp-quick-card animate-fade-in">
                          <div className="abp-card-icon-wrapper" style={{ '--icon-color': '#e74c3c' }}>
                            <i className="fas fa-receipt"></i>
                          </div>
                          <div className="abp-card-content">
                            <div className="abp-card-title">Gestión de Mensualidades</div>
                            <div className="abp-card-desc">Control de pagos y semáforo de mensualidades</div>
                          </div>
                        </Link>
                        <Link to="/gestion-inventario" className="abp-quick-card animate-fade-in">
                          <div className="abp-card-icon-wrapper" style={{ '--icon-color': '#34495e' }}>
                            <i className="fas fa-boxes"></i>
                          </div>
                          <div className="abp-card-content">
                            <div className="abp-card-title">Inventario de Almacén</div>
                            <div className="abp-card-desc">Control de stock de productos y suplementos</div>
                          </div>
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              )}

              {isAdmin && (
                <div className="abp-category-container mt-4">
                  <h3 className="abp-category-title">
                    <i className="fas fa-tools me-2 text-secondary"></i>Configuración & Herramientas
                  </h3>
                  <div className="abp-quick-grid">
                    <Link to="/gestion-staff" className="abp-quick-card">
                      <div className="abp-card-icon-wrapper" style={{ '--icon-color': '#e67e22' }}>
                        <i className="fas fa-user-shield"></i>
                      </div>
                      <div className="abp-card-content">
                        <div className="abp-card-title">Gestión de Staff</div>
                        <div className="abp-card-desc">Administra permisos de coaches y personal</div>
                      </div>
                    </Link>
                    <Link to="/exportar-bd-box" className="abp-quick-card">
                      <div className="abp-card-icon-wrapper" style={{ '--icon-color': '#9b59b6' }}>
                        <i className="fas fa-database"></i>
                      </div>
                      <div className="abp-card-content">
                        <div className="abp-card-title">Exportar Datos</div>
                        <div className="abp-card-desc">Descarga respaldos en Excel o JSON</div>
                      </div>
                    </Link>
                    <Link to="/buzon-sugerencias" className="abp-quick-card">
                      <div className="abp-card-icon-wrapper" style={{ '--icon-color': '#34495e' }}>
                        <i className="fas fa-envelope-open-text"></i>
                      </div>
                      <div className="abp-card-content">
                        <div className="abp-card-title">Buzón de Sugerencias</div>
                        <div className="abp-card-desc">Buzón digital para comentarios de atletas</div>
                      </div>
                    </Link>
                  </div>
                </div>
              )}
            </section>

            {/* GRÁFICOS INTERACTIVOS (RECHARTS) */}
            <section className="abp-section mb-4">
              <p className="abp-section-label">
                <i className="fas fa-chart-bar me-2"></i>Métricas y Rendimiento
              </p>

              <div className="row g-3">

                {/* 1. GRÁFICO DE AREA: INGRESOS Y EGRESOS (REALES) */}
                {/* 1. GRÁFICO DE AREA: INGRESOS Y EGRESOS (REALES) */}
                <div className="col-12">
                  <div className="abp-glass-card h-100">
                    <div className="abp-card-header d-flex justify-content-between align-items-center mb-3">
                      <div>
                        <h4 className="abp-card-title mb-0">Rendimiento Histórico Real</h4>
                        <span className="text-muted small">Tendencias de Ingresos vs Egresos del box</span>
                      </div>
                      <div className="d-flex align-items-center gap-2 flex-wrap">
                        {/* Selector de periodos interactivo premium */}
                        <div className="abp-period-selector me-2">
                          <button
                            type="button"
                            onClick={() => setFiltroPeriodo('1s')}
                            className={`abp-period-btn ${filtroPeriodo === '1s' ? 'active' : ''}`}
                          >
                            1 Semana
                          </button>
                          <button
                            type="button"
                            onClick={() => setFiltroPeriodo('1m')}
                            className={`abp-period-btn ${filtroPeriodo === '1m' ? 'active' : ''}`}
                          >
                            1 Mes
                          </button>
                          <button
                            type="button"
                            onClick={() => setFiltroPeriodo('6m')}
                            className={`abp-period-btn ${filtroPeriodo === '6m' ? 'active' : ''}`}
                          >
                            6 Meses
                          </button>
                        </div>
                        <Link to="/finanzas-globales" className="btn btn-outline-success btn-xs py-1 px-2 d-flex align-items-center gap-1 border-0" style={{ fontSize: '11px' }}>
                          <i className="fas fa-chart-line"></i>
                          <span>Ver Finanzas</span>
                        </Link>
                      </div>
                    </div>

                    <div className="abp-chart-container" style={{ height: '300px', width: '100%' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#2ecc71" stopOpacity={0.2}/>
                              <stop offset="95%" stopColor="#2ecc71" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorEgresos" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#e74c3c" stopOpacity={0.2}/>
                              <stop offset="95%" stopColor="#e74c3c" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                          <XAxis dataKey="mes" stroke="#888899" fontSize={11} tickLine={false} />
                          <YAxis stroke="#888899" fontSize={10} tickLine={false} tickFormatter={v => `$${v}`} />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#16161e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                            labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                            formatter={(value, name) => [`$${value}`, name]}
                          />
                          <Area type="monotone" dataKey="ingresos" name="Ingresos" stroke="#2ecc71" strokeWidth={2} fillOpacity={1} fill="url(#colorIngresos)" />
                          <Area type="monotone" dataKey="egresos" name="Egresos" stroke="#e74c3c" strokeWidth={2} fillOpacity={1} fill="url(#colorEgresos)" />
                          <Legend wrapperStyle={{ fontSize: 11, color: '#aaa', paddingTop: '10px' }} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

              </div>
            </section>

          </div>

          {/* COLUMNA SIDEBAR (DERECHA) */}
          <div className="abp-sidebar-col">

            {/* WIDGET 0: BANDEJA DE VALIDACIONES */}
            {isAdmin && (
              <Link to="/admin-box/validaciones" className="text-decoration-none d-block mb-4 abp-clickable-card-link">
                <div className="abp-glass-card abp-clickable-card" style={{ borderLeft: '3px solid var(--primary)' }}>
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h4 className="abp-card-title mb-0">Bandeja de Validaciones</h4>
                    <div className="abp-widget-icon text-primary">
                      <i className="fas fa-university"></i>
                    </div>
                  </div>
                  <p className="text-muted small mb-3">Ver y aprobar transferencias bancarias pendientes (Membresías, Tienda, etc.)</p>
                  
                  <div className="text-primary text-center mt-3 fw-bold" style={{ fontSize: '11px', letterSpacing: '0.5px' }}>
                    <i className="fas fa-check-double me-1"></i>Ir a Bandeja <i className="fas fa-chevron-right ms-1"></i>
                  </div>
                </div>
              </Link>
            )}

            {/* WIDGET 1: TERMÓMETRO DE INGRESOS (Solo Admin) */}
            {isAdmin && (
              <Link to="/finanzas-globales" className="text-decoration-none d-block mb-4 abp-clickable-card-link">
                <div className="abp-glass-card abp-clickable-card" style={{ borderLeft: '3px solid #2ecc71' }}>
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h4 className="abp-card-title mb-0">Facturación Mensual</h4>
                    <div className="abp-widget-icon text-success">
                      <i className="fas fa-hand-holding-usd"></i>
                    </div>
                  </div>
                  <div className="fs-2 fw-bold text-success mb-1">
                    {dashboardLoading ? (
                      <span className="spinner-border spinner-border-sm text-success" role="status"></span>
                    ) : (
                      formatearDinero(dashboardData?.ingresosMes || 0)
                    )}
                  </div>
                  <p className="text-muted small mb-3">Ingresos acumulados de mensualidades y visitas</p>

                  {/* Meta de ingresos */}
                  <div className="abp-revenue-goal">
                    <div className="d-flex justify-content-between text-muted small mb-1" style={{ fontSize: '10px' }}>
                      <span>Meta: $50,000.00</span>
                      <span className="fw-bold text-white">{Math.min(100, Math.round(((dashboardData?.ingresosMes || 0) / 50000) * 100))}%</span>
                    </div>
                    <div className="progress bg-dark-glow" style={{ height: '6px', borderRadius: '4px', overflow: 'hidden' }}>
                      <div
                        className="progress-bar bg-success progress-bar-striped progress-bar-animated"
                        role="progressbar"
                        style={{ width: `${Math.min(100, ((dashboardData?.ingresosMes || 0) / 50000) * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="text-success text-center mt-3 fw-bold" style={{ fontSize: '11px', letterSpacing: '0.5px' }}>
                    <i className="fas fa-chart-line me-1"></i>Ver Finanzas Globales <i className="fas fa-chevron-right ms-1"></i>
                  </div>
                </div>
              </Link>
            )}

            {/* WIDGET: APROBACIÓN DE CLASES DE STAFF */}
            {isAdmin && (
              <div className="abp-glass-card mb-4" style={{ borderLeft: '3px solid var(--warning)' }}>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <div>
                    <h4 className="abp-card-title mb-0">Aprobación de Clases (Staff)</h4>
                    <span className="text-muted small">Mes en curso</span>
                  </div>
                  <div className="abp-widget-icon text-warning">
                    <i className="fas fa-user-check"></i>
                  </div>
                </div>

                {cargandoCoachesWidget ? (
                  <div className="text-center py-3">
                    <span className="spinner-border spinner-border-sm text-warning" role="status"></span>
                  </div>
                ) : coachesPendientes.filter(c => c.pendientesCount > 0).length === 0 ? (
                  <div className="text-center text-muted py-3 small bg-dark-glow rounded-10 border border-success-glow">
                    <i className="fas fa-check-circle text-success fs-3 mb-2 d-block"></i>
                    ¡Todo al día! No hay clases pendientes.
                  </div>
                ) : (
                  <>
                    <div className="abp-debt-list mb-3">
                      {coachesPendientes.filter(c => c.pendientesCount > 0).map((coach, idx) => {
                        const name = coach.nombre || coach.Nombre;
                        const pendCount = coach.pendientesCount;
                        return (
                          <div key={idx} className="abp-debt-item">
                            <div className="abp-debt-info">
                              <div className="abp-debt-name">{name}</div>
                              <span className="abp-debt-sub abp-debt-sub--warning">
                                {pendCount} {pendCount === 1 ? 'clase pendiente' : 'clases pendientes'}
                              </span>
                            </div>
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                abrirQuickVal(coach);
                              }}
                              className="abp-debt-action abp-debt-action--warning"
                            >
                              <i className="fas fa-check"></i>
                              <span>Validar</span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
                
                <Link to="/gestion-staff" className="text-warning text-center mt-3 fw-bold d-block text-decoration-none" style={{ fontSize: '11px', letterSpacing: '0.5px' }}>
                  <i className="fas fa-user-shield me-1"></i>Gestionar Nómina y Roster <i className="fas fa-chevron-right ms-1"></i>
                </Link>
              </div>
            )}

            {/* WIDGET 2: SOLICITUDES DE ACCESO */}
            {isAdmin && solicitudes.length > 0 && (
              <div className="abp-glass-card abp-warning-card mb-4">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <h4 className="abp-card-title mb-0 text-warning">Solicitudes Pendientes</h4>
                  <span className="badge bg-warning-glow text-warning animate-pulse px-2 py-1">{solicitudes.length}</span>
                </div>
                <p className="text-white-50 small mb-3">Hay atletas esperando aprobación para ingresar al Box.</p>
                <Link to="/gestion-solicitudes" className="abp-card-action-btn bg-warning-glow text-warning w-100 text-center py-2 rounded-10 text-decoration-none d-block fw-bold" style={{ fontSize: '12px' }}>
                  <i className="fas fa-check-double me-1"></i>Revisar Solicitudes
                </Link>
              </div>
            )}

            {/* WIDGET 3: LOBOS EN RIESGO / DELINCUENTES */}
            {isAdmin && (
              <Link to="/gestion-finanzas" state={{ fromTab: 'semaforo', filterEstado: 'Rojo' }} className="text-decoration-none d-block mb-4 abp-clickable-card-link">
                <div className="abp-glass-card abp-clickable-card" style={{ borderLeft: '3px solid #e74c3c' }}>
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h4 className="abp-card-title mb-0">Atletas con Adeudos</h4>
                    <div className="abp-widget-icon text-danger">
                      <i className="fas fa-exclamation-triangle"></i>
                    </div>
                  </div>

                  {dashboardLoading ? (
                    <div className="text-center py-3">
                      <span className="spinner-border spinner-border-sm text-danger" role="status"></span>
                    </div>
                  ) : !dashboardData?.topMorosos || dashboardData.topMorosos.length === 0 ? (
                    <div className="text-center text-muted py-3 small">
                      <i className="fas fa-check-circle text-success fs-3 mb-2 d-block"></i>
                      ¡Excelente! Sin mensualidades vencidas.
                    </div>
                  ) : (
                    <>
                      <div className="abp-debt-list mb-3">
                        {dashboardData.topMorosos.map((m, idx) => {
                          const diasVencidos = calcularDiasVencidos(m.fechaVencimiento);
                          return (
                            <div key={idx} className="abp-debt-item">
                              <div className="abp-debt-info">
                                <div className="abp-debt-name">{m.nombre}</div>
                                <span className="abp-debt-sub abp-debt-sub--danger">
                                  Vencido hace {diasVencidos} días
                                </span>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  enviarRecordatorioWhatsApp(m.nombre);
                                }}
                                className="abp-debt-action abp-debt-action--success"
                                title="Enviar recordatorio de WhatsApp"
                              >
                                <i className="fab fa-whatsapp"></i>
                                <span>Cobrar</span>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                      <div className="text-danger text-center fw-bold" style={{ fontSize: '11px', letterSpacing: '0.5px' }}>
                        <i className="fas fa-exclamation-circle me-1"></i>Ver Semáforo de Adeudos <i className="fas fa-chevron-right ms-1"></i>
                      </div>
                    </>
                  )}
                </div>
              </Link>
            )}

            {/* WIDGET 4: VENTAS DE LA TIENDA Y POS */}
            <Link to="/gestion-ventas-productos" className="text-decoration-none d-block abp-clickable-card-link">
              <div className="abp-glass-card abp-clickable-card" style={{ borderLeft: '3px solid #f1c40f' }}>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <div>
                    <h4 className="abp-card-title mb-0">Ventas de la Tienda</h4>
                    <span className="text-muted small">Suplementos, bebidas y más</span>
                  </div>
                  <div className="abp-widget-icon text-warning">
                    <i className="fas fa-store"></i>
                  </div>
                </div>

                <div className="d-flex flex-column gap-2 mb-3">
                  {/* Hoy */}
                  <div className="d-flex align-items-center justify-content-between p-2 rounded bg-dark-glow">
                    <span className="badge bg-warning-glow text-warning px-2 py-1 small">Hoy</span>
                    <span className="fw-bold text-white fs-6">
                      {dashboardLoading ? (
                        <span className="spinner-border spinner-border-sm text-warning" role="status"></span>
                      ) : (
                        formatearDinero(dashboardData?.ventasTienda?.hoy)
                      )}
                    </span>
                  </div>

                  {/* Semana */}
                  <div className="d-flex align-items-center justify-content-between p-2 rounded bg-dark-glow">
                    <span className="badge bg-success-glow text-success px-2 py-1 small">Esta Semana</span>
                    <span className="fw-bold text-white fs-6">
                      {dashboardLoading ? (
                        <span className="spinner-border spinner-border-sm text-success" role="status"></span>
                      ) : (
                        formatearDinero(dashboardData?.ventasTienda?.semana)
                      )}
                    </span>
                  </div>

                  {/* Mes */}
                  <div className="d-flex align-items-center justify-content-between p-2 rounded bg-dark-glow">
                    <span className="badge bg-info-glow text-info px-2 py-1 small">Este Mes</span>
                    <span className="fw-bold text-white fs-6">
                      {dashboardLoading ? (
                        <span className="spinner-border spinner-border-sm text-info" role="status"></span>
                      ) : (
                        formatearDinero(dashboardData?.ventasTienda?.mes)
                      )}
                    </span>
                  </div>
                </div>

                <div className="text-warning text-center fw-bold" style={{ fontSize: '11px', letterSpacing: '0.5px' }}>
                  <i className="fas fa-cash-register me-1"></i>Ir a Tienda y POS <i className="fas fa-chevron-right ms-1"></i>
                </div>
              </div>
            </Link>

          </div>

        </div>

      </div>

      {/* ==========================================
          QUICK APPROVAL MODAL (GLASSMORPHISM)
          ========================================== */}
      {modalQuickValVisible && quickCoach && (
        <div className="quick-val-modal-overlay">
          <div className="quick-val-modal-container shadow-lg animate-fade-in">
            {/* Header */}
            <div className="quick-val-modal-header d-flex justify-content-between align-items-center mb-3">
              <div className="d-flex align-items-center gap-2">
                <i className="fas fa-user-check text-warning fs-5"></i>
                <div>
                  <h4 className="modal-title text-white fw-bold mb-0">Aprobación de Clases</h4>
                  <span className="text-muted small">Coach: {quickCoach.nombre || quickCoach.Nombre}</span>
                </div>
              </div>
              <button 
                type="button" 
                onClick={cerrarQuickVal} 
                className="btn-close-custom"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            {/* Modal Body */}
            <div className="quick-val-modal-body">
              {/* Payroll estimation widget */}
              <div className="bg-dark-glow p-3 rounded-12 mb-3 border border-secondary-glow">
                <h5 className="text-white small fw-bold mb-2">Nómina Acumulada del Mes</h5>
                <div className="row g-2 text-center">
                  <div className="col-4">
                    <div className="small text-muted mb-1">Sueldo Base</div>
                    <span className="text-white fw-bold">{formatearDinero(quickNomina?.sueldoBase || 0)}</span>
                  </div>
                  <div className="col-4">
                    <div className="small text-muted mb-1">Bonos</div>
                    <span className="text-success fw-bold">+{formatearDinero(quickNomina?.totalBonos || 0)}</span>
                  </div>
                  <div className="col-4">
                    <div className="small text-muted mb-1">Total Estimado</div>
                    <span className="text-warning fw-bold">{formatearDinero(quickNomina?.granTotal || 0)}</span>
                  </div>
                </div>
              </div>

              {/* Attendance Table */}
              <h5 className="text-white small fw-bold mb-2">Historial de Clases de este Mes</h5>
              {quickClases.length === 0 ? (
                <div className="text-center text-muted py-3">No hay clases programadas para este coach en el mes actual.</div>
              ) : (
                <div className="qv-class-list">
                  {quickClases.map((c, idx) => {
                    const est = c.estado || c.Estado;
                    const nom = c.nombreClase || c.NombreClase || c.nombre || c.Nombre;
                    const f = c.fecha || c.Fecha;
                    const hor = c.horario || c.Horario || c.hora || c.Hora;
                    const mon = c.montoPago || c.MontoPago;
                    const fStr = f ? new Date(f).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) : '-';
                    return (
                      <div key={idx} className="qv-class-card">
                        <div className="qv-class-card-top">
                          <span className="qv-class-name">{nom}</span>
                          {est === 'Validada' ? (
                            <span className="qv-badge qv-badge--ok"><i className="fas fa-check"></i>Aprobada</span>
                          ) : est === 'Falta' ? (
                            <span className="qv-badge qv-badge--no"><i className="fas fa-times"></i>Falta</span>
                          ) : (
                            <span className="qv-badge qv-badge--pend"><i className="fas fa-clock"></i>Pendiente</span>
                          )}
                        </div>
                        <div className="qv-class-meta">
                          <span><i className="far fa-calendar"></i>{fStr}</span>
                          <span><i className="far fa-clock"></i>{hor}</span>
                          <span className="qv-class-monto"><i className="fas fa-hand-holding-usd"></i>{formatearDinero(mon)}</span>
                        </div>
                        <div className="qv-class-actions">
                          <button
                            onClick={() => ejecutarQuickValidar(c.idClase || c.IdClase, c.fecha || c.Fecha, 'Validada', mon)}
                            className="qv-act qv-act--ok"
                            title="Aprobar clase"
                          >
                            <i className="fas fa-check"></i><span>Aprobar</span>
                          </button>
                          <button
                            onClick={() => ejecutarQuickValidar(c.idClase || c.IdClase, c.fecha || c.Fecha, 'Falta', mon)}
                            className="qv-act qv-act--no"
                            title="Marcar Falta"
                          >
                            <i className="fas fa-times"></i><span>Falta</span>
                          </button>
                          {(est === 'Validada' || est === 'Falta') && (
                            <button
                              onClick={() => ejecutarQuickValidar(c.idClase || c.IdClase, c.fecha || c.Fecha, 'Pendiente', mon)}
                              className="qv-act qv-act--reset"
                              title="Restablecer a pendiente"
                            >
                              <i className="fas fa-undo"></i>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="quick-val-modal-footer d-flex justify-content-between align-items-center mt-3 pt-3 border-top border-secondary">
              <button 
                type="button" 
                onClick={cerrarQuickVal} 
                className="btn btn-outline-light btn-sm rounded-10"
              >
                Cerrar
              </button>
              {quickNomina && !quickNomina.estaPagada && (
                <button
                  type="button"
                  onClick={ejecutarQuickPagar}
                  className="btn btn-warning btn-sm rounded-10 fw-bold d-flex align-items-center gap-1 text-dark"
                >
                  <i className="fas fa-coins"></i>
                  <span>Pagar Nómina del Mes</span>
                </button>
              )}
              {quickNomina && quickNomina.estaPagada && (
                <span className="badge bg-success-glow text-success px-3 py-2 rounded-10 fw-bold">
                  <i className="fas fa-check-double me-1"></i>Nómina Pagada
                </span>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

