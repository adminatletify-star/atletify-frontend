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

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem('usuario'));
    const b = JSON.parse(localStorage.getItem('box'));

    if (!u) {
      navigate('/login');
      return;
    }

    setUser(u);
    setBox(b);
    cargarAtletas(b?.idBox);

    const isAdminUser = u.rol === 'AdminBox' || u.rol === 'Developer' || u.Rol === 'AdminBox' || u.Rol === 'Developer';
    if (isAdminUser && b?.idBox) {
      cargarDashboard(b.idBox);
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

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const isAdmin = user?.rol === 'AdminBox' || user?.rol === 'Developer';
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

  if (loading) {
    return (
      <div className="abp-loading">
        <div className="spinner-border text-danger" role="status" style={{ width: '3rem', height: '3rem' }}></div>
      </div>
    );
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
                    <div>
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
                    <div>
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
                    <div>
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
                      <div>
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
                <div className="d-flex justify-content-between align-items-center mb-3">
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
                <div className="d-flex justify-content-between align-items-center mb-3">
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
                  <div className="d-flex justify-content-between align-items-center mb-3">
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
                            <div key={idx} className="abp-debt-item d-flex align-items-center justify-content-between p-2 mb-2 rounded bg-dark-glow">
                              <div>
                                <div className="fw-bold text-white small truncate" style={{ maxWidth: '140px' }}>{m.nombre}</div>
                                <span className="text-danger" style={{ fontSize: '9px' }}>
                                  Vencido hace {diasVencidos} días
                                </span>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  enviarRecordatorioWhatsApp(m.nombre);
                                }}
                                className="btn btn-outline-success btn-xs py-1 px-2 d-flex align-items-center gap-1 border-0"
                                style={{ fontSize: '10px' }}
                                title="Enviar recordatorio de WhatsApp"
                              >
                                <i className="fab fa-whatsapp fs-6"></i>
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
    </div>
  );
}

