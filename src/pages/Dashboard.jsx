import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { BOXES_ENDPOINT, USUARIOS_ENDPOINT } from '../services/api';
import AtletifyLoader from '../components/AtletifyLoader';
import '../assets/css/dashboard.css';

export default function Dashboard() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('inicio');
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({ boxes: 0, usuarios: 0 });
  const [usuarios, setUsuarios] = useState([]);
  const [boxes, setBoxes] = useState([]);
  const [metricasBoxes, setMetricasBoxes] = useState([]);
  const [configuracion, setConfiguracion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [guardandoConfig, setGuardandoConfig] = useState(false);
  const [filtroNombre, setFiltroNombre] = useState('');
  const [filtroRol, setFiltroRol] = useState('');
  const [filtroBox, setFiltroBox] = useState('');
  const [paginaUsuarios, setPaginaUsuarios] = useState(1);
  const USUARIOS_POR_PAGINA = 20;
  const [filtroSaas, setFiltroSaas] = useState('');

  const [cuentasBloqueadas, setCuentasBloqueadas] = useState([]);
  const [desbloqueando, setDesbloqueando] = useState(null);
  const [tiempoActual, setTiempoActual] = useState(Date.now());
  const [overlayVisible, setOverlayVisible] = useState(false);

  const [modalAdminBox, setModalAdminBox] = useState({ open: false, idBox: null, nombreBox: '' });
  const [formDataAdmin, setFormDataAdmin] = useState({
    nombre: '', apellidos: '', username: '', correo: '', telefono: '', fechaNacimiento: ''
  });
  const [creandoAdmin, setCreandoAdmin] = useState(false);

  const [modalActivarCompe, setModalActivarCompe] = useState({ open: false, idBox: null, planSaaS: null, estatusSaaS: '', fechaVencimientoSaaS: null, nombre: '' });
  const [activandoCompe, setActivandoCompe] = useState(false);

  const [modalSuccessAdmin, setModalSuccessAdmin] = useState({ open: false, username: '', contrasenaGenerada: '' });
  const [modalEliminarPlan, setModalEliminarPlan] = useState({ open: false, index: null, nombre: '' });
  const [modalEliminarBox, setModalEliminarBox] = useState({ open: false, idBox: null, nombre: '' });
  const [eliminandoBox, setEliminandoBox] = useState(false);
  const [copiado, setCopiado] = useState(null);

  const copiar = (texto, campo) => {
    navigator.clipboard.writeText(texto).then(() => {
      setCopiado(campo);
      setTimeout(() => setCopiado(null), 2000);
    });
  };

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem('usuario'));
    if (!u || u.rol !== 'Developer') { navigate('/login'); return; }
    setUser(u);
    cargarDataGlobal();
  }, [navigate]);

  useEffect(() => {
    const handler = () => setSidebarOpen(false);
    window.addEventListener('atletify:cardnav-open', handler);
    return () => window.removeEventListener('atletify:cardnav-open', handler);
  }, []);

  useEffect(() => {
    if (activeSection !== 'configglobal') return;
    cargarCuentasBloqueadas();
    const intervalo = setInterval(() => {
      setTiempoActual(Date.now());
      cargarCuentasBloqueadas();
    }, 15000);
    return () => clearInterval(intervalo);
  }, [activeSection]);

  useEffect(() => {
    if (activeSection !== 'configglobal') return;
    const tick = setInterval(() => setTiempoActual(Date.now()), 1000);
    return () => clearInterval(tick);
  }, [activeSection]);

  async function cargarCuentasBloqueadas() {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/developer/cuentas-bloqueadas`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setCuentasBloqueadas(await res.json());
    } catch (err) { console.error(err); }
  }

  async function desbloquearCuenta(idUsuario, correo) {
    if (!await window.wpConfirm(`¿Desbloquear la cuenta de ${correo}?`)) return;
    setDesbloqueando(idUsuario);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/developer/desbloquear/${idUsuario}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setCuentasBloqueadas(prev => prev.filter(c => c.idUsuario !== idUsuario));
      }
    } catch (err) { console.error(err); }
    finally { setDesbloqueando(null); }
  }

  function tiempoRestante(bloqueadoHasta) {
    const fin = new Date(bloqueadoHasta).getTime();
    const diff = Math.max(0, fin - tiempoActual);
    const mins = Math.floor(diff / 60000);
    const segs = Math.floor((diff % 60000) / 1000);
    return diff === 0 ? 'Expirado' : `${mins}m ${segs.toString().padStart(2, '0')}s`;
  }

  async function eliminarBoxCascade() {
    const { idBox, nombre } = modalEliminarBox;
    setEliminandoBox(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/box/${idBox}/cascade`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setMetricasBoxes(prev => prev.filter(b => b.idBox !== idBox));
        setBoxes(prev => prev.filter(b => b.idBox !== idBox));
        setStats(prev => ({ ...prev, boxes: prev.boxes - 1 }));
        setModalEliminarBox({ open: false, idBox: null, nombre: '' });
        alert(`Box "${nombre}" eliminado con éxito.`);
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.mensaje || 'Error al eliminar el box.');
      }
    } catch { alert('Error de conexión al eliminar el box.'); }
    finally { setEliminandoBox(false); }
  }

  async function eliminarUsuario(id) {
    if (!await window.wpConfirm("¿Estás seguro de eliminar permanentemente a este usuario? Esta acción no se puede deshacer.")) return;
    try {
      const response = await fetch(`${USUARIOS_ENDPOINT}/${id}`, { method: 'DELETE' });
      if (response.ok) { alert("Usuario eliminado con éxito"); cargarDataGlobal(); }
      else alert("No se pudo eliminar al usuario.");
    } catch (err) { console.error(err); alert("Error de conexión con el servidor."); }
  }

  async function cargarDataGlobal() {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const authHeader = { 'Authorization': `Bearer ${token}` };
      const [resB, resU, resM, resC, resPlanes] = await Promise.all([
        fetch(BOXES_ENDPOINT),
        fetch(USUARIOS_ENDPOINT),
        fetch(`${import.meta.env.VITE_API_URL}/api/developer/metricas-boxes`, { headers: authHeader }),
        fetch(`${import.meta.env.VITE_API_URL}/api/developer/configuracion`, { headers: authHeader }),
        fetch(`${import.meta.env.VITE_API_URL}/api/saas/planes`, { headers: authHeader })
      ]);
      const dataB = await resB.json();
      const dataU = await resU.json();
      const dataM = resM.ok ? await resM.json() : [];
      const dataC = resC.ok ? await resC.json() : null;
      const dataPlanes = resPlanes.ok ? await resPlanes.json() : [];

      const boxesList = Array.isArray(dataB) ? dataB : [];
      const usersList = Array.isArray(dataU) ? dataU : (dataU.data || []);

      setBoxes(boxesList);
      setUsuarios(usersList);
      setMetricasBoxes(Array.isArray(dataM) ? dataM : []);
      if (dataC) {
        try { dataC.planesCompetenciaArray = JSON.parse(dataC.planesCompetenciaJson || "[]"); }
        catch (e) { dataC.planesCompetenciaArray = []; }
        setConfiguracion(dataC);
      }
      setStats({ boxes: boxesList.length, usuarios: usersList.length });
    } catch (err) {
      console.error("Error cargando dashboard:", err);
    } finally {
      setLoading(false);
    }
  }

  const rolBadgeClass = (rol) => {
    switch (rol) {
      case 'Developer': return 'badge-estado-primario';
      case 'AdminBox':  return 'badge-estado-pendiente';
      case 'Coach':     return 'badge-estado-activo';
      default:          return 'badge-estado-inactivo';
    }
  };

  const goTo = (section) => { setActiveSection(section); setSidebarOpen(false); };

  const prevNumRef = useRef({});

  const onNumFocus = (e, key) => {
    prevNumRef.current[key] = e.target.value;
    e.target.select();
  };

  const onNumBlurPlanes = (e, key, index, campo, parser) => {
    if (e.target.value === '') {
      const a = [...configuracion.planesCompetenciaArray];
      a[index][campo] = parser(prevNumRef.current[key] ?? 0);
      setConfiguracion(prev => ({ ...prev, planesCompetenciaArray: a }));
    }
  };

  const limitar = (valorStr, maxDigitosEnteros) => {
    const enteros = valorStr.split('.')[0].replace(/\D/g, '');
    return enteros.length <= maxDigitosEnteros;
  };

  const normalizar = s => s?.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase() ?? '';
  const metricasBoxesFiltradas = metricasBoxes.filter(b => {
    if (!filtroSaas) return true;
    const q = normalizar(filtroSaas);
    return normalizar(b.nombre).includes(q) || normalizar(b.ubicacion).includes(q);
  });

  const rolesUnicos = [...new Set(usuarios.map(u => u.rol))];
  const usuariosFiltrados = usuarios.filter(u => {
    const coincideTexto = u.nombre?.toLowerCase().includes(filtroNombre) || u.correo?.toLowerCase().includes(filtroNombre);
    const coincideRol  = !filtroRol  || u.rol === filtroRol;
    const coincideBox  = !filtroBox  || u.idBoxPredeterminado?.toString() === filtroBox;
    return coincideTexto && coincideRol && coincideBox;
  });

  const totalPaginasUsuarios = Math.ceil(usuariosFiltrados.length / USUARIOS_POR_PAGINA);
  const usuariosPaginados = usuariosFiltrados.slice(
    (paginaUsuarios - 1) * USUARIOS_POR_PAGINA,
    paginaUsuarios * USUARIOS_POR_PAGINA
  );

  const handleConfigChange = (e) => {
    const { name, value } = e.target;
    setConfiguracion(prev => ({ ...prev, [name]: value }));
  };

  const guardarConfiguracion = async (e) => {
    e.preventDefault();
    setGuardandoConfig(true);
    try {
      const payloadToSave = { ...configuracion };
      payloadToSave.planesCompetenciaJson = JSON.stringify(configuracion.planesCompetenciaArray || []);
      delete payloadToSave.planesCompetenciaArray;
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/developer/configuracion`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payloadToSave)
      });
      if (res.ok) alert("Configuración Global actualizada con éxito");
      else alert("Error al actualizar la configuración");
    } catch (error) {
      console.error(error); alert("Error de red");
    } finally {
      setGuardandoConfig(false);
    }
  };

  const handleCrearAdminBox = async (e) => {
    e.preventDefault();
    setCreandoAdmin(true);
    try {
      const payload = {
        ...formDataAdmin,
        idBox: modalAdminBox.idBox,
        fechaNacimiento: formDataAdmin.fechaNacimiento
          ? new Date(formDataAdmin.fechaNacimiento).toISOString()
          : new Date().toISOString()
      };
      const token = localStorage.getItem('token');
      const res = await fetch(`${USUARIOS_ENDPOINT}/crear-admin-box`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json();
        setModalSuccessAdmin({ open: true, username: data.username, contrasenaGenerada: data.contrasenaGenerada });
        setModalAdminBox({ open: false, idBox: null, nombreBox: '' });
        setFormDataAdmin({ nombre: '', apellidos: '', username: '', correo: '', telefono: '', fechaNacimiento: '' });
        cargarDataGlobal();
      } else {
        const data = await res.json();
        alert(data.mensaje || "Error al crear AdminBox");
      }
    } catch (err) { alert("Error de conexión"); }
    finally { setCreandoAdmin(false); }
  };

  const handleActivarYCrearCompe = async (e) => {
    e.preventDefault();
    setActivandoCompe(true);
    try {
      const token = localStorage.getItem('token');
      const resSaaS = await fetch(`${import.meta.env.VITE_API_URL}/api/developer/box-saas/${modalActivarCompe.idBox}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          estatusSaaS: modalActivarCompe.estatusSaaS === 'Pendiente' || !modalActivarCompe.estatusSaaS ? 'Activo' : modalActivarCompe.estatusSaaS,
          idPlanSaaS: modalActivarCompe.planSaaS,
          moduloCompetenciasActivo: true,
          fechaVencimientoSaaS: modalActivarCompe.fechaVencimientoSaaS
        })
      });
      if (!resSaaS.ok) throw new Error("Error al habilitar módulo");

      const planSeleccionado = configuracion?.planesCompetenciaArray?.find(p => p.id.toString() === modalActivarCompe.planCompetenciaId);
      const resCompe = await fetch(`${import.meta.env.VITE_API_URL}/api/competencias`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          idBox: modalActivarCompe.idBox,
          nombre: modalActivarCompe.nombre,
          SaaS_Estatus: planSeleccionado ? "Activa" : "Configurando",
          DiasPlanSaaS: planSeleccionado ? planSeleccionado.dias : 1,
          AtletasIncluidos: planSeleccionado ? planSeleccionado.atletasIncluidos : 0,
          PrecioAtletaExtra: planSeleccionado ? planSeleccionado.precioAtletaExtra : 0
        })
      });
      if (!resCompe.ok) throw new Error("Error al crear la competencia");

      alert("Módulo habilitado y competencia creada con éxito.");
      setModalActivarCompe({ open: false, idBox: null, planSaaS: null, estatusSaaS: '', fechaVencimientoSaaS: null, nombre: '' });
      cargarDataGlobal();
    } catch (err) {
      console.error(err); alert(err.message || "No se pudo completar la operación.");
    } finally { setActivandoCompe(false); }
  };

  const updateSaaS = async (idBox, body) => {
    const token = localStorage.getItem('token');
    await fetch(`${import.meta.env.VITE_API_URL}/api/developer/box-saas/${idBox}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body)
    });
    cargarDataGlobal();
  };

  if (loading) return (
    <div className="min-vh-100 d-flex justify-content-center align-items-center" style={{ background: 'var(--bg-base)' }}>
      <AtletifyLoader />
    </div>
  );

  return (
    <div className="dash-page">

      {/* ── Topbar móvil ─────────────────────────────────────── */}
      <header className="dash-topbar d-flex d-lg-none align-items-center gap-3 px-3">
        <button className="dash-topbar-toggle" onClick={() => { setSidebarOpen(true); window.dispatchEvent(new CustomEvent('atletify:dashsidebar-open')); }} aria-label="Abrir menú">
          <i className="fas fa-bars"></i>
        </button>
        <i className="fas fa-terminal" style={{ color: 'var(--primary)', fontSize: '1rem' }}></i>
        <span className="dash-topbar-title">DEV PANEL</span>
      </header>

      {/* ── Layout principal ──────────────────────────────────── */}
      <div className="dash-layout">

        {/* Overlay móvil */}
        <div
          className={`dash-overlay ${sidebarOpen ? 'dash-overlay--visible' : ''}`}
          onClick={() => setSidebarOpen(false)}
        />

        {/* ── Sidebar ──────────────────────────────────────────── */}
        <aside className={`dash-sidebar ${sidebarOpen ? 'dash-sidebar--open' : ''}`}>

          {/* Logo */}
          <div className="dash-sidebar-logo">
            <div className="dash-sidebar-logo-icon">
              <i className="fas fa-terminal"></i>
            </div>
            <div className="dash-sidebar-logo-text">
              <span className="dash-sidebar-logo-title">DEV PANEL</span>
              <span className="dash-sidebar-logo-sub">Atletify System</span>
            </div>
            <button
              className="dash-sidebar-close d-lg-none"
              onClick={() => setSidebarOpen(false)}
              aria-label="Cerrar menú"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>

          {/* Nav */}
          <nav className="dash-nav">

            {/* ── INICIO: botón de sección ── */}
            <button
              className={`dash-nav-section-btn ${activeSection === 'inicio' ? 'dash-nav-section-btn--active' : ''}`}
              onClick={() => goTo('inicio')}
            >
              <div className="dash-nav-section-icon" style={{ '--si': 'var(--primary)' }}>
                <i className="fas fa-house-user"></i>
              </div>
              <div className="dash-nav-section-text">
                <span className="dash-nav-section-name">Inicio</span>
                <span className="dash-nav-section-desc">Control Global de Roles</span>
              </div>
              <i className={`fas fa-chevron-right dash-nav-section-arrow ${activeSection === 'inicio' ? 'dash-nav-section-arrow--active' : ''}`}></i>
            </button>

            {/* Stats — siempre visibles */}
            <div className="dash-nav-stats">
              <div className="dash-nav-stat">
                <span className="dash-nav-stat-val">{stats.boxes}</span>
                <span className="dash-nav-stat-lbl"><i className="fas fa-boxes me-1"></i>Boxes</span>
              </div>
              <div className="dash-nav-stat">
                <span className="dash-nav-stat-val">{stats.usuarios}</span>
                <span className="dash-nav-stat-lbl"><i className="fas fa-users me-1"></i>Usuarios</span>
              </div>
            </div>

            {/* Botones de acción — siempre visibles */}
            <div className="dash-nav-divider"></div>

            {/* ── SaaS Control de Boxes: botón de sección ── */}
            <button
              className={`dash-nav-section-btn ${activeSection === 'saas' ? 'dash-nav-section-btn--active' : ''}`}
              onClick={() => goTo('saas')}
            >
              <div className="dash-nav-section-icon" style={{ '--si': 'var(--accent-cool)' }}>
                <i className="fas fa-boxes"></i>
              </div>
              <div className="dash-nav-section-text">
                <span className="dash-nav-section-name">SaaS Control de Boxes</span>
                <span className="dash-nav-section-desc">Métricas y estados SaaS</span>
              </div>
              <i className={`fas fa-chevron-right dash-nav-section-arrow ${activeSection === 'saas' ? 'dash-nav-section-arrow--active' : ''}`}></i>
            </button>

            {/* ── SaaS & Redes: botón de sección ── */}
            <button
              className={`dash-nav-section-btn ${activeSection === 'config' ? 'dash-nav-section-btn--active' : ''}`}
              onClick={() => goTo('config')}
            >
              <div className="dash-nav-section-icon" style={{ '--si': 'var(--accent)' }}>
                <i className="fas fa-cogs"></i>
              </div>
              <div className="dash-nav-section-text">
                <span className="dash-nav-section-name">SaaS & Redes</span>
                <span className="dash-nav-section-desc">Planes y Configuración</span>
              </div>
              <i className={`fas fa-chevron-right dash-nav-section-arrow ${activeSection === 'config' ? 'dash-nav-section-arrow--active' : ''}`}></i>
            </button>

            {/* ── Configuración Global: botón de sección ── */}
            <button
              className={`dash-nav-section-btn ${activeSection === 'configglobal' ? 'dash-nav-section-btn--active' : ''}`}
              onClick={() => goTo('configglobal')}
            >
              <div className="dash-nav-section-icon" style={{ '--si': '#9b59b6' }}>
                <i className="fas fa-sliders-h"></i>
              </div>
              <div className="dash-nav-section-text">
                <span className="dash-nav-section-name">Configuración Global</span>
                <span className="dash-nav-section-desc">Sistema y Mantenimiento</span>
              </div>
              <i className={`fas fa-chevron-right dash-nav-section-arrow ${activeSection === 'configglobal' ? 'dash-nav-section-arrow--active' : ''}`}></i>
            </button>

            <div className="dash-nav-divider"></div>

            <Link to="/crear-box" className="dash-nav-link" onClick={() => setSidebarOpen(false)}
              style={{ '--lnk': 'var(--primary)' }}>
              <i className="fas fa-plus-circle"></i><span>Nuevo Box</span>
            </Link>
            <Link to="/admin-saas" className="dash-nav-link" onClick={() => setSidebarOpen(false)}
              style={{ '--lnk': '#9b59b6' }}>
              <i className="fas fa-crown"></i><span>Planes y B2B SaaS</span>
            </Link>
            <Link to="/admin-ejercicios" className="dash-nav-link" onClick={() => setSidebarOpen(false)}
              style={{ '--lnk': 'var(--accent)' }}>
              <i className="fas fa-book-open"></i><span>Ejercicios</span>
            </Link>
            <Link to="/admin-archivadas" className="dash-nav-link" onClick={() => setSidebarOpen(false)}
              style={{ '--lnk': '#e74c3c' }}>
              <i className="fas fa-database"></i><span>Administrar Competencias</span>
            </Link>
            <Link to="/admin-preregistros" className="dash-nav-link" onClick={() => setSidebarOpen(false)}
              style={{ '--lnk': 'var(--accent-cool)' }}>
              <i className="fas fa-envelope-open-text"></i>
              <span>Centro de Pre-registros (Mágicos)</span>
            </Link>

          </nav>
        </aside>

        {/* ── Contenido principal ───────────────────────────────── */}
        <main className="dash-main">
          <div className="dash-inner">

            {/* ══ SECCIÓN 1: Control Global de Roles (Inicio) ══ */}
            {activeSection === 'inicio' && <section className="dash-section">
              <div className="dash-section-head">
                <h2 className="dash-section-title">
                  <i className="fas fa-users-cog"></i> Control Global de Roles
                </h2>
                <div className="d-flex flex-column flex-sm-row gap-2 dash-filters">
                  <select className="entrada-oscura dash-filter-select flex-shrink-0"
                    value={filtroBox} onChange={e => { setFiltroBox(e.target.value); setPaginaUsuarios(1); }}>
                    <option value="">Todos los Boxes</option>
                    {boxes.map(b => <option key={b.idBox} value={b.idBox.toString()}>{b.nombre}</option>)}
                  </select>
                  <select className="entrada-oscura dash-filter-select flex-shrink-0"
                    value={filtroRol} onChange={e => { setFiltroRol(e.target.value); setPaginaUsuarios(1); }}>
                    <option value="">Todos los Roles</option>
                    {rolesUnicos.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <div className="dash-search-wrapper flex-grow-1">
                    <i className="fas fa-search dash-search-icon"></i>
                    <input type="text" className="entrada-oscura dash-search-input w-100"
                      placeholder="Buscar por nombre o correo..."
                      onChange={e => { setFiltroNombre(e.target.value.toLowerCase()); setPaginaUsuarios(1); }} />
                  </div>
                </div>
              </div>

              {/* Tabla Desktop */}
              <div className="d-none d-md-block">
                <div className="table-responsive rounded-3 overflow-hidden">
                  <table className="table table-dark table-hover mb-0">
                    <thead>
                      <tr>
                        <th>USUARIO</th>
                        <th>ROL</th>
                        <th>BOX</th>
                        <th className="text-center">ACCIONES</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usuariosPaginados.map(u => (
                        <tr key={u.idUsuario} className="align-middle">
                          <td>
                            <div className="d-flex align-items-center gap-3">
                              <div className="avatar-inicial">{u.nombre?.charAt(0).toUpperCase()}</div>
                              <div>
                                <div className="fw-bold">{u.nombre}</div>
                                <small className="dash-text-muted">{u.correo}</small>
                              </div>
                            </div>
                          </td>
                          <td><span className={`badge-estado ${rolBadgeClass(u.rol)}`}>{u.rol}</span></td>
                          <td className="dash-text-muted">
                            {boxes.find(b => b.idBox === u.idBoxPredeterminado)?.nombre || 'Sin Box'}
                          </td>
                          <td className="text-center">
                            {u.idUsuario !== user.idUsuario && u.rol !== 'Developer' ? (
                              <div className="d-flex justify-content-center gap-2">
                                <Link to={`/editar-usuario/${u.idUsuario}`} className="dash-action-btn dash-action-edit" title="Editar">
                                  <i className="fas fa-pen"></i>
                                </Link>
                                <button className="dash-action-btn dash-action-delete" onClick={() => eliminarUsuario(u.idUsuario)} title="Eliminar">
                                  <i className="fas fa-trash"></i>
                                </button>
                              </div>
                            ) : (
                              <span className="badge-estado badge-estado-primario">DEV</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Cards Móvil */}
              <div className="d-md-none d-flex flex-column gap-3">
                {usuariosPaginados.map(u => (
                  <div key={u.idUsuario} className="dash-user-card p-3">
                    <div className="d-flex align-items-center gap-3 mb-3">
                      <div className="avatar-inicial">{u.nombre?.charAt(0).toUpperCase()}</div>
                      <div className="flex-grow-1 overflow-hidden">
                        <div className="fw-bold text-truncate">{u.nombre}</div>
                        <small className="dash-text-muted text-truncate d-block">{u.correo}</small>
                      </div>
                      <span className={`badge-estado ${rolBadgeClass(u.rol)}`}>{u.rol}</span>
                    </div>
                    <div className="d-flex justify-content-between align-items-center">
                      <small className="dash-text-muted">
                        <i className="fas fa-dumbbell me-1"></i>
                        {boxes.find(b => b.idBox === u.idBoxPredeterminado)?.nombre || 'Sin Box'}
                      </small>
                      {u.idUsuario !== user.idUsuario && u.rol !== 'Developer' ? (
                        <div className="d-flex gap-2">
                          <Link to={`/editar-usuario/${u.idUsuario}`} className="dash-action-btn dash-action-edit" title="Editar">
                            <i className="fas fa-pen"></i>
                          </Link>
                          <button className="dash-action-btn dash-action-delete" onClick={() => eliminarUsuario(u.idUsuario)} title="Eliminar">
                            <i className="fas fa-trash"></i>
                          </button>
                        </div>
                      ) : (
                        <span className="badge-estado badge-estado-primario">DEV</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Paginación */}
              {totalPaginasUsuarios > 1 && (
                <div className="dash-pagination">
                  <button
                    className="dash-page-btn"
                    onClick={() => setPaginaUsuarios(p => Math.max(1, p - 1))}
                    disabled={paginaUsuarios === 1}
                  >
                    <i className="fas fa-chevron-left"></i>
                  </button>

                  {Array.from({ length: totalPaginasUsuarios }, (_, i) => i + 1).map(num => (
                    <button
                      key={num}
                      className={`dash-page-btn${paginaUsuarios === num ? ' dash-page-btn--active' : ''}`}
                      onClick={() => setPaginaUsuarios(num)}
                    >
                      {num}
                    </button>
                  ))}

                  <button
                    className="dash-page-btn"
                    onClick={() => setPaginaUsuarios(p => Math.min(totalPaginasUsuarios, p + 1))}
                    disabled={paginaUsuarios === totalPaginasUsuarios}
                  >
                    <i className="fas fa-chevron-right"></i>
                  </button>

                  <span className="dash-page-info">
                    {(paginaUsuarios - 1) * USUARIOS_POR_PAGINA + 1}–{Math.min(paginaUsuarios * USUARIOS_POR_PAGINA, usuariosFiltrados.length)} de {usuariosFiltrados.length}
                  </span>
                </div>
              )}
            </section>

            }

            {/* ══ SECCIÓN 2: SaaS Control de Boxes ══ */}
            {activeSection === 'saas' && <section className="dash-section">
              <div className="dash-section-head">
                <h2 className="dash-section-title">
                  <i className="fas fa-boxes"></i> SaaS Control de Boxes
                </h2>
              </div>

              {/* Buscador */}
              <div className="dash-search-wrapper mb-4">
                <i className="fas fa-search dash-search-icon"></i>
                <input
                  type="text"
                  className="entrada-oscura dash-search-input w-100"
                  placeholder="Buscar por nombre o ubicación..."
                  value={filtroSaas}
                  onChange={e => setFiltroSaas(e.target.value)}
                />
              </div>

              <div className="scb-grid">
                {metricasBoxesFiltradas.map(b => {
                  const estatus = b.estatusSaaS || 'Pendiente';
                  const estatusClass = `scb-saas-select--${estatus.toLowerCase()}`;
                  return (
                    <div key={b.idBox} className="scb-card">

                      {/* Header: ID + Nombre */}
                      <div className="scb-card-header">
                        <span className="scb-card-id">#{b.idBox}</span>
                        <span className="scb-card-name">{b.nombre}</span>
                      </div>

                      {/* Ubicación */}
                      {b.ubicacion && (
                        <div className="scb-ubicacion">
                          <i className="fas fa-map-marker-alt"></i>
                          {b.ubicacion}
                        </div>
                      )}

                      {/* Stats: Atletas / Coaches / Admins */}
                      <div className="scb-stats-row">
                        <span className="scb-stat scb-stat--atletas">
                          <i className="fas fa-users"></i>{b.totalAtletas}
                        </span>
                        <span className="scb-stat scb-stat--coaches">
                          <i className="fas fa-chalkboard-teacher"></i>{b.totalCoaches}
                        </span>
                        <span className="scb-stat scb-stat--admins">
                          <i className="fas fa-user-shield"></i>{b.totalAdmins}
                        </span>
                        <button
                          className="scb-add-admin-btn"
                          title="Crear AdminBox"
                          onClick={() => setModalAdminBox({ open: true, idBox: b.idBox, nombreBox: b.nombre })}
                        >
                          <i className="fas fa-plus"></i>
                        </button>
                      </div>

                      <div className="scb-divider"></div>

                      {/* SaaS / Connect */}
                      <div className="scb-saas-block">
                        <div className="scb-saas-label">
                          <i className="fas fa-cloud"></i> SaaS / Connect
                        </div>
                        <select
                          className={`scb-saas-select ${estatusClass}`}
                          value={estatus}
                          onChange={async (e) => {
                            const newStatus = e.target.value;
                            let fechaGracia = null;
                            if (newStatus === 'Gracia') {
                              fechaGracia = prompt("Fecha de vencimiento (YYYY-MM-DD):", new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]);
                              if (!fechaGracia) return;
                            }
                            try {
                              await updateSaaS(b.idBox, { estatusSaaS: newStatus, idPlanSaaS: b.idPlanSaaS, moduloCompetenciasActivo: b.moduloCompetenciasActivo, fechaVencimientoSaaS: fechaGracia || b.fechaVencimientoSaaS });
                              alert("Estatus SaaS actualizado");
                            } catch { alert("Error al actualizar estatus SaaS"); }
                          }}
                        >
                          <option value="Pendiente">Pendiente</option>
                          <option value="Activo">Activo</option>
                          <option value="Gracia">Gracia</option>
                          <option value="Vencido">Vencido</option>
                        </select>
                        <div className="scb-meta-row">
                          {b.fechaVencimientoSaaS
                            ? <span className="scb-expiry"><i className="fas fa-calendar-alt"></i>Vence: {new Date(b.fechaVencimientoSaaS).toLocaleDateString()}</span>
                            : <span></span>}
                          {b.stripeConnectActivo
                            ? <span className="scb-connect-ok"><i className="fab fa-stripe-s"></i>Connect OK</span>
                            : <span className="scb-connect-no"><i className="fab fa-stripe-s"></i>Sin Connect</span>}
                        </div>
                      </div>

                      <div className="scb-divider"></div>

                      {/* Competencias toggle */}
                      <div className="scb-compe-row">
                        <div className="scb-compe-label">
                          <i className="fas fa-trophy"></i> Competencias
                        </div>
                        <button
                          className={`scb-compe-btn ${b.moduloCompetenciasActivo ? 'scb-compe-btn--on' : 'scb-compe-btn--off'}`}
                          onClick={async () => {
                            if (!b.moduloCompetenciasActivo) {
                              setModalActivarCompe({ open: true, idBox: b.idBox, planSaaS: b.idPlanSaaS, planCompetenciaId: '', estatusSaaS: b.estatusSaaS, fechaVencimientoSaaS: b.fechaVencimientoSaaS, nombre: '' });
                            } else {
                              const conf = await window.wpConfirm('¿Desactivar el módulo de competencias para este Box?');
                              if (conf) {
                                try {
                                  await updateSaaS(b.idBox, { estatusSaaS: b.estatusSaaS || 'Pendiente', idPlanSaaS: b.idPlanSaaS, moduloCompetenciasActivo: false, fechaVencimientoSaaS: b.fechaVencimientoSaaS });
                                } catch { alert("No se pudo actualizar el módulo."); }
                              }
                            }
                          }}
                        >
                          <i className="fas fa-trophy"></i>
                          {b.moduloCompetenciasActivo ? 'ON' : 'OFF'}
                        </button>
                      </div>

                      <div className="scb-divider"></div>

                      {/* Eliminar Box en cascada */}
                      <button
                        className="scb-delete-box-btn"
                        onClick={() => setModalEliminarBox({ open: true, idBox: b.idBox, nombre: b.nombre })}
                        title="Eliminar Box permanentemente"
                      >
                        <i className="fas fa-trash-alt"></i> Eliminar Box
                      </button>

                    </div>
                  );
                })}
              </div>
            </section>

            }

            {/* ══ SECCIÓN 3: Planes de Competencias SaaS y Redes ══ */}
            {activeSection === 'config' && configuracion && (
              <section className="dash-section">
                <div className="dash-section-head">
                  <h2 className="dash-section-title">
                    <i className="fas fa-layer-group"></i> Planes de Competencias SaaS y Redes
                  </h2>
                </div>

                <form onSubmit={guardarConfiguracion}>
                  <div className="row g-4">

                    {/* ── Planes de Competencias ── */}
                    <div className="col-12 col-lg-6">
                      <div className="cfg-card cfg-card--accent">
                        <div className="cfg-card-head">
                          <div className="cfg-card-title"><i className="fas fa-trophy"></i> Planes SaaS</div>
                          <button type="button" className="cfg-add-btn"
                            onClick={() => {
                              const newPlan = { id: Date.now(), nombre: '', precio: 0, dias: 1, atletasIncluidos: 50, precioAtletaExtra: 0 };
                              setConfiguracion(prev => ({ ...prev, planesCompetenciaArray: [...(prev.planesCompetenciaArray || []), newPlan] }));
                            }}>
                            <i className="fas fa-plus"></i> Añadir Plan
                          </button>
                        </div>

                        {(!configuracion.planesCompetenciaArray || configuracion.planesCompetenciaArray.length === 0) && (
                          <div className="empty-state" style={{ padding: '1.5rem' }}>
                            <i className="fas fa-trophy"></i>
                            <p>No hay planes configurados.</p>
                          </div>
                        )}

                        <div className="cfg-planes-list">
                          {(configuracion.planesCompetenciaArray || []).map((plan, index) => (
                            <div key={plan.id || index} className="cfg-plan-item">
                              <button type="button" className="cfg-plan-delete"
                                onClick={() => setModalEliminarPlan({ open: true, index, nombre: plan.nombre || `Plan #${index + 1}` })}>
                                <i className="fas fa-times"></i>
                              </button>

                              {/* Nombre */}
                              <div className="mb-3 pe-4">
                                <label className="etiqueta-campo">Nombre del Plan *</label>
                                <input type="text" className="entrada-oscura" placeholder="Ej. Básico, Pro"
                                  value={plan.nombre} required
                                  onChange={e => { const a = [...configuracion.planesCompetenciaArray]; a[index].nombre = e.target.value; setConfiguracion(prev => ({ ...prev, planesCompetenciaArray: a })); }} />
                              </div>

                              <div className="row g-2 mb-2">
                                {/* Precio — máx 6 dígitos enteros */}
                                <div className="col-6">
                                  <label className="etiqueta-campo">Precio</label>
                                  <div className="cfg-input-group">
                                    <span className="cfg-input-prefix">$</span>
                                    <input type="number" step="0.01" min="0" className="entrada-oscura cfg-input-inner"
                                      value={plan.precio}
                                      onFocus={e => onNumFocus(e, `${index}-precio`)}
                                      onBlur={e => onNumBlurPlanes(e, `${index}-precio`, index, 'precio', parseFloat)}
                                      onChange={e => {
                                        if (!limitar(e.target.value, 6)) return;
                                        const a = [...configuracion.planesCompetenciaArray];
                                        a[index].precio = parseFloat(e.target.value) || 0;
                                        setConfiguracion(prev => ({ ...prev, planesCompetenciaArray: a }));
                                      }} required />
                                  </div>
                                </div>
                                {/* Plazo — máx 3 dígitos */}
                                <div className="col-6">
                                  <label className="etiqueta-campo">Plazo (Días)</label>
                                  <input type="number" min="1" className="entrada-oscura"
                                    value={plan.dias}
                                    onFocus={e => onNumFocus(e, `${index}-dias`)}
                                    onBlur={e => onNumBlurPlanes(e, `${index}-dias`, index, 'dias', v => parseInt(v) || 1)}
                                    onChange={e => {
                                      if (!limitar(e.target.value, 3)) return;
                                      const a = [...configuracion.planesCompetenciaArray];
                                      a[index].dias = parseInt(e.target.value) || 1;
                                      setConfiguracion(prev => ({ ...prev, planesCompetenciaArray: a }));
                                    }} required />
                                </div>
                              </div>

                              <div className="row g-2">
                                {/* Atletas Incluidos — máx 5 dígitos */}
                                <div className="col-6">
                                  <label className="etiqueta-campo">Atletas Incluidos</label>
                                  <input type="number" min="0" className="entrada-oscura"
                                    value={plan.atletasIncluidos}
                                    onFocus={e => onNumFocus(e, `${index}-atletas`)}
                                    onBlur={e => onNumBlurPlanes(e, `${index}-atletas`, index, 'atletasIncluidos', v => parseInt(v) || 0)}
                                    onChange={e => {
                                      if (!limitar(e.target.value, 5)) return;
                                      const a = [...configuracion.planesCompetenciaArray];
                                      a[index].atletasIncluidos = parseInt(e.target.value) || 0;
                                      setConfiguracion(prev => ({ ...prev, planesCompetenciaArray: a }));
                                    }} required />
                                </div>
                                {/* Precio Atleta Extra — máx 4 dígitos */}
                                <div className="col-6">
                                  <label className="etiqueta-campo">Precio Atleta Extra</label>
                                  <div className="cfg-input-group">
                                    <span className="cfg-input-prefix">$</span>
                                    <input type="number" step="0.01" min="0" className="entrada-oscura cfg-input-inner"
                                      value={plan.precioAtletaExtra}
                                      onFocus={e => onNumFocus(e, `${index}-extra`)}
                                      onBlur={e => onNumBlurPlanes(e, `${index}-extra`, index, 'precioAtletaExtra', parseFloat)}
                                      onChange={e => {
                                        if (!limitar(e.target.value, 4)) return;
                                        const a = [...configuracion.planesCompetenciaArray];
                                        a[index].precioAtletaExtra = parseFloat(e.target.value) || 0;
                                        setConfiguracion(prev => ({ ...prev, planesCompetenciaArray: a }));
                                      }} required />
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* ── Redes + Contrato ── */}
                    <div className="col-12 col-lg-6 d-flex flex-column gap-4">

                      {/* Redes de Contacto */}
                      <div className="cfg-card cfg-card--cool">
                        <div className="cfg-card-head">
                          <div className="cfg-card-title"><i className="fas fa-share-alt"></i> Redes de Contacto</div>
                        </div>
                        <div className="d-flex flex-column gap-3">

                          <div>
                            <label className="etiqueta-campo"><i className="fab fa-instagram" style={{ color: '#e1306c' }}></i> Instagram URL</label>
                            <div className="cfg-net-group">
                              <div className="cfg-net-icon"><i className="fab fa-instagram" style={{ color: '#e1306c' }}></i></div>
                              <input type="text" className="entrada-oscura cfg-input-inner" name="linkInstagram"
                                value={configuracion.linkInstagram} onChange={handleConfigChange} placeholder="https://instagram.com/..." />
                            </div>
                          </div>

                          <div>
                            <label className="etiqueta-campo"><i className="fab fa-facebook" style={{ color: '#1877f2' }}></i> Facebook URL</label>
                            <div className="cfg-net-group">
                              <div className="cfg-net-icon"><i className="fab fa-facebook" style={{ color: '#1877f2' }}></i></div>
                              <input type="text" className="entrada-oscura cfg-input-inner" name="linkFacebook"
                                value={configuracion.linkFacebook} onChange={handleConfigChange} placeholder="https://facebook.com/..." />
                            </div>
                          </div>

                          <div>
                            <label className="etiqueta-campo"><i className="fas fa-envelope" style={{ color: 'var(--accent)' }}></i> Correo de Contacto</label>
                            <div className="cfg-net-group">
                              <div className="cfg-net-icon"><i className="fas fa-envelope" style={{ color: 'var(--accent)' }}></i></div>
                              <input type="email" className="entrada-oscura cfg-input-inner" name="correoContacto"
                                value={configuracion.correoContacto} onChange={handleConfigChange} placeholder="contacto@ejemplo.com" />
                            </div>
                          </div>

                          <div>
                            <label className="etiqueta-campo"><i className="fas fa-phone" style={{ color: '#4caf50' }}></i> Teléfono de Soporte</label>
                            <div className="cfg-net-group">
                              <div className="cfg-net-icon"><i className="fas fa-phone" style={{ color: '#4caf50' }}></i></div>
                              <input type="text" className="entrada-oscura cfg-input-inner" name="telefonoSoporte"
                                value={configuracion.telefonoSoporte} onChange={handleConfigChange} placeholder="+52 55 0000 0000" />
                            </div>
                          </div>

                        </div>
                      </div>

                      {/* Contrato Maestro */}
                      <div className="cfg-card">
                        <div className="cfg-card-head">
                          <div className="cfg-card-title"><i className="fas fa-file-contract"></i> Contrato Maestro Plataforma</div>
                        </div>
                        <label className="etiqueta-campo">Términos y Condiciones (texto plano o HTML simple)</label>
                        <textarea className="entrada-oscura cfg-textarea" name="contratoUsoGlobal"
                          value={configuracion.contratoUsoGlobal} onChange={handleConfigChange}></textarea>
                      </div>

                    </div>
                  </div>

                  <div className="cfg-footer">
                    <button type="submit" className="cfg-save-btn" disabled={guardandoConfig}>
                      {guardandoConfig
                        ? <><i className="fas fa-spinner fa-spin"></i> Guardando...</>
                        : <><i className="fas fa-save"></i> Guardar Configuración</>}
                    </button>
                  </div>
                </form>
              </section>
            )}

            {/* ══ SECCIÓN 4: Configuración Global ══ */}
            {activeSection === 'configglobal' && configuracion && (
              <section className="dash-section">
                <div className="dash-section-head">
                  <h2 className="dash-section-title">
                    <i className="fas fa-sliders-h"></i> Configuración Global
                  </h2>
                </div>

                {/* Modo Mantenimiento */}
                <div className={`cfg-mantenimiento ${configuracion.enMantenimiento ? 'cfg-mantenimiento--activo' : ''}`}>
                  <div className="cfg-mant-info">
                    <i className={`fas fa-hard-hat cfg-mant-icon ${configuracion.enMantenimiento ? 'cfg-mant-icon--activo' : ''}`}></i>
                    <div>
                      <div className="cfg-mant-title">
                        Modo Mantenimiento
                        {configuracion.enMantenimiento && <span className="cfg-mant-badge">ACTIVO</span>}
                      </div>
                      <div className="cfg-mant-desc">
                        {configuracion.enMantenimiento
                          ? '⚠️ Todos los usuarios (excepto tú) están bloqueados'
                          : 'Activa para bloquear el acceso a todos los usuarios excepto Developer'}
                      </div>
                    </div>
                  </div>
                  <div className="form-check form-switch m-0">
                    <input
                      className="form-check-input bg-danger border-danger"
                      type="checkbox" role="switch" id="switchMantenimiento"
                      checked={configuracion.enMantenimiento || false}
                      onChange={async (e) => {
                        const nuevoEstado = e.target.checked;
                        if (nuevoEstado) {
                          const ok = await window.wpConfirm('⚠️ ¿Activar Modo Mantenimiento?\n\nTodos los usuarios serán bloqueados excepto Developer.');
                          if (!ok) return;
                        }
                        try {
                          const token = localStorage.getItem('token');
                          const payload = { ...configuracion, enMantenimiento: nuevoEstado };
                          const res = await fetch(`${import.meta.env.VITE_API_URL}/api/developer/configuracion`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                            body: JSON.stringify(payload)
                          });
                          if (res.ok) setConfiguracion(prev => ({ ...prev, enMantenimiento: nuevoEstado }));
                        } catch (err) { console.error(err); }
                      }}
                      style={{ width: '3rem', height: '1.5rem', cursor: 'pointer' }}
                    />
                  </div>
                </div>

                {/* Cuentas Bloqueadas */}
                <div className="cfg-bloqueadas">
                  <div className="cfg-bloqueadas-header">
                    <div className="cfg-bloqueadas-title">
                      <i className="fas fa-lock"></i> Cuentas Bloqueadas
                      {cuentasBloqueadas.length > 0 && (
                        <span className="cfg-bloqueadas-badge">{cuentasBloqueadas.length}</span>
                      )}
                    </div>
                    <span className="cfg-bloqueadas-sub">Bloqueadas por intentos de login fallidos</span>
                  </div>

                  {cuentasBloqueadas.length === 0 ? (
                    <div className="cfg-bloqueadas-empty">
                      <i className="fas fa-shield-alt"></i>
                      <span>Sin cuentas bloqueadas en este momento</span>
                    </div>
                  ) : (
                    <div className="cfg-bloqueadas-list">
                      {cuentasBloqueadas.map(cuenta => (
                        <div key={cuenta.idUsuario} className="cfg-bloqueada-item">
                          <div className="cfg-bloqueada-avatar">
                            <i className="fas fa-user-lock"></i>
                          </div>
                          <div className="cfg-bloqueada-info">
                            <div className="cfg-bloqueada-correo">{cuenta.correo}</div>
                            <div className="cfg-bloqueada-meta">
                              <span className="cfg-bloqueada-nombre">
                                {cuenta.nombre} {cuenta.apellidos}
                              </span>
                              <span className="cfg-bloqueada-rol">{cuenta.rol}</span>
                            </div>
                            <div className="cfg-bloqueada-tiempo">
                              <i className="fas fa-clock"></i>
                              Se desbloquea en: <strong>{tiempoRestante(cuenta.bloqueadoHasta)}</strong>
                            </div>
                          </div>
                          <button
                            className="cfg-bloqueada-btn"
                            onClick={() => desbloquearCuenta(cuenta.idUsuario, cuenta.correo)}
                            disabled={desbloqueando === cuenta.idUsuario}
                          >
                            {desbloqueando === cuenta.idUsuario
                              ? <><i className="fas fa-spinner fa-spin"></i> Desbloqueando...</>
                              : <><i className="fas fa-lock-open"></i> Desbloquear</>
                            }
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </section>
            )}

          </div>{/* /dash-inner */}
        </main>
      </div>{/* /dash-layout */}

      {/* ══ MODAL: Crear Admin Box ══ */}
      {modalAdminBox.open && (
        <div className="dam-overlay" onClick={e => e.target === e.currentTarget && setModalAdminBox({ open: false, idBox: null, nombreBox: '' })}>
          <div className="dam-panel">

            <div className="dam-header">
              <div className="dam-header-text">
                <span className="dam-supertitle"><i className="fas fa-boxes"></i>{modalAdminBox.nombreBox}</span>
                <h5 className="dam-title"><i className="fas fa-user-plus"></i>Crear Admin Box</h5>
              </div>
              <button className="dam-close" onClick={() => setModalAdminBox({ open: false, idBox: null, nombreBox: '' })} aria-label="Cerrar">
                <i className="fas fa-times"></i>
              </button>
            </div>

            <form onSubmit={handleCrearAdminBox}>
              <div className="dam-grid">

                <div className="dam-field">
                  <label className="etiqueta-campo">Nombre(s) *</label>
                  <input type="text" className="entrada-oscura" required
                    value={formDataAdmin.nombre}
                    onChange={e => setFormDataAdmin({ ...formDataAdmin, nombre: e.target.value })} />
                </div>

                <div className="dam-field">
                  <label className="etiqueta-campo">Apellidos</label>
                  <input type="text" className="entrada-oscura"
                    value={formDataAdmin.apellidos}
                    onChange={e => setFormDataAdmin({ ...formDataAdmin, apellidos: e.target.value })} />
                </div>

                <div className="dam-field dam-grid--full">
                  <label className="etiqueta-campo">Username *</label>
                  <input type="text" className="entrada-oscura" required
                    value={formDataAdmin.username}
                    onChange={e => setFormDataAdmin({ ...formDataAdmin, username: e.target.value })} />
                </div>

                <div className="dam-field dam-grid--full">
                  <label className="etiqueta-campo">Correo (Login) *</label>
                  <input type="email" className="entrada-oscura" required
                    value={formDataAdmin.correo}
                    onChange={e => setFormDataAdmin({ ...formDataAdmin, correo: e.target.value })} />
                </div>

                <div className="dam-nota">
                  <i className="fas fa-magic dam-nota-icon"></i>
                  <div className="dam-nota-text">
                    <span className="dam-nota-label">Contraseña generada automáticamente</span>
                    <span className="dam-nota-desc">Se mostrará en pantalla al finalizar la creación.</span>
                  </div>
                </div>

                <div className="dam-field">
                  <label className="etiqueta-campo">Teléfono</label>
                  <input type="text" className="entrada-oscura" maxLength="10"
                    value={formDataAdmin.telefono}
                    onChange={e => setFormDataAdmin({ ...formDataAdmin, telefono: e.target.value.replace(/\D/g, '') })} />
                </div>

                <div className="dam-field">
                  <label className="etiqueta-campo">Fecha Nacimiento *</label>
                  <input type="date" className="entrada-oscura" required
                    value={formDataAdmin.fechaNacimiento}
                    onChange={e => setFormDataAdmin({ ...formDataAdmin, fechaNacimiento: e.target.value })} />
                </div>

              </div>

              <hr className="dam-divider" />

              <div className="dam-footer">
                <button type="button" className="dam-btn-cancel"
                  onClick={() => setModalAdminBox({ open: false, idBox: null, nombreBox: '' })}>
                  Cancelar
                </button>
                <button type="submit" className="dam-btn-primary" disabled={creandoAdmin}>
                  {creandoAdmin
                    ? <><i className="fas fa-spinner fa-spin"></i>Creando...</>
                    : <><i className="fas fa-user-plus"></i>Crear AdminBox</>}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* ══ MODAL: Éxito Admin Creado ══ */}
      {modalSuccessAdmin.open && (
        <div className="dam-overlay" style={{ zIndex: 1200 }}>
          <div className="dam-panel dam-panel--success">

            <div className="das-icon-wrap">
              <i className="fas fa-check"></i>
            </div>
            <h3 className="das-title">¡AdminBox Creado!</h3>
            <p className="das-subtitle">Guarda estos accesos para entregarlos al cliente.</p>

            <div className="das-creds">

              {/* Username */}
              <div>
                <div className="das-cred-label">
                  <i className="fas fa-user"></i> Username (Login)
                </div>
                <div className="das-cred-row">
                  <span className="das-cred-value">{modalSuccessAdmin.username}</span>
                  <button
                    className={`das-copy-btn ${copiado === 'username' ? 'das-copy-btn--copied' : ''}`}
                    onClick={() => copiar(modalSuccessAdmin.username, 'username')}
                  >
                    <i className={`fas ${copiado === 'username' ? 'fa-check' : 'fa-copy'}`}></i>
                    {copiado === 'username' ? '¡Copiado!' : 'Copiar'}
                  </button>
                </div>
              </div>

              <div className="das-cred-divider"></div>

              {/* Contraseña */}
              <div>
                <div className="das-cred-label das-cred-label--pass">
                  <i className="fas fa-key"></i> Contraseña Segura
                </div>
                <div className="das-cred-row">
                  <span className="das-cred-value das-cred-value--pass">{modalSuccessAdmin.contrasenaGenerada}</span>
                  <button
                    className={`das-copy-btn ${copiado === 'password' ? 'das-copy-btn--copied' : ''}`}
                    onClick={() => copiar(modalSuccessAdmin.contrasenaGenerada, 'password')}
                  >
                    <i className={`fas ${copiado === 'password' ? 'fa-check' : 'fa-copy'}`}></i>
                    {copiado === 'password' ? '¡Copiado!' : 'Copiar'}
                  </button>
                </div>
              </div>

            </div>

            <button className="das-btn-close"
              onClick={() => { setModalSuccessAdmin({ open: false, username: '', contrasenaGenerada: '' }); setCopiado(null); }}>
              <i className="fas fa-check-circle"></i> Entendido, Cerrar
            </button>

          </div>
        </div>
      )}

      {/* ══ MODAL: Eliminar Plan SaaS ══ */}
      {modalEliminarPlan.open && (
        <div className="dam-overlay" style={{ zIndex: 1300 }}>
          <div className="dam-panel dam-panel--danger">

            <div className="dep-icon-wrap">
              <i className="fas fa-trash-alt"></i>
            </div>

            <h5 className="dep-title">¿Eliminar este plan?</h5>
            <p className="dep-msg">
              Estás a punto de eliminar el plan{' '}
              <span className="dep-plan-name">"{modalEliminarPlan.nombre}"</span>.
              Esta acción no se puede deshacer.
            </p>

            <div className="dam-footer" style={{ justifyContent: 'center', gap: '0.75rem', marginTop: 0, paddingTop: 0, borderTop: 'none' }}>
              <button className="dam-btn-cancel"
                onClick={() => setModalEliminarPlan({ open: false, index: null, nombre: '' })}>
                Cancelar
              </button>
              <button className="dam-btn-danger"
                onClick={() => {
                  const a = [...configuracion.planesCompetenciaArray];
                  a.splice(modalEliminarPlan.index, 1);
                  setConfiguracion(prev => ({ ...prev, planesCompetenciaArray: a }));
                  setModalEliminarPlan({ open: false, index: null, nombre: '' });
                }}>
                <i className="fas fa-trash-alt"></i> Sí, eliminar
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ══ MODAL: Eliminar Box en Cascada ══ */}
      {modalEliminarBox.open && (
        <div className="dam-overlay" style={{ zIndex: 1300 }}>
          <div className="dam-panel dam-panel--danger">
            <div className="dep-icon-wrap">
              <i className="fas fa-exclamation-triangle"></i>
            </div>
            <h5 className="dep-title">¿Eliminar Box permanentemente?</h5>
            <p className="dep-msg">
              Esto eliminará <span className="dep-plan-name">"{modalEliminarBox.nombre}"</span> y{' '}
              <strong>todos sus datos</strong> (atletas, clases, ventas, finanzas, etc.) de forma{' '}
              <span style={{ color: 'var(--primary)' }}>irreversible</span>.
            </p>
            <div className="dam-footer" style={{ justifyContent: 'center', gap: '0.75rem' }}>
              <button
                className="dam-btn-cancel"
                disabled={eliminandoBox}
                onClick={() => setModalEliminarBox({ open: false, idBox: null, nombre: '' })}
              >
                Cancelar
              </button>
              <button
                className="dam-btn-danger"
                disabled={eliminandoBox}
                onClick={eliminarBoxCascade}
              >
                {eliminandoBox
                  ? <><i className="fas fa-spinner fa-spin"></i> Eliminando...</>
                  : <><i className="fas fa-trash-alt"></i> Sí, eliminar todo</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL: Activar Competencias ══ */}
      {modalActivarCompe.open && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 1055 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content bg-dark text-white border-secondary">
              <div className="modal-header border-secondary">
                <h5 className="modal-title text-warning">
                  <i className="fas fa-trophy me-2"></i>Habilitar Módulo y Crear Competencia
                </h5>
                <button type="button" className="btn-close btn-close-white"
                  onClick={() => setModalActivarCompe({ open: false, idBox: null, planSaaS: null, estatusSaaS: '', fechaVencimientoSaaS: null, nombre: '' })}></button>
              </div>
              <div className="modal-body">
                <p className="small text-white-50 mb-4">Al habilitar el módulo de competencias, el sistema asignará un plan y creará la primera competencia para este Box.</p>
                <form onSubmit={handleActivarYCrearCompe}>
                  <div className="mb-3">
                    <label className="form-label small text-light">Plan de Competencia a Asignar *</label>
                    <select className="form-select bg-dark text-white border-secondary" required
                      value={modalActivarCompe.planCompetenciaId || ''}
                      onChange={e => setModalActivarCompe({ ...modalActivarCompe, planCompetenciaId: e.target.value })}>
                      <option value="" disabled>-- Selecciona un Plan --</option>
                      {(configuracion?.planesCompetenciaArray || []).map(p => (
                        <option key={p.id || p.nombre} value={p.id}>
                          {p.nombre} (Incluye {p.atletasIncluidos} atletas - ${p.precio})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="mb-4">
                    <label className="form-label small text-light">Nombre de la Competencia *</label>
                    <input type="text" className="form-control bg-dark text-white border-secondary" required
                      value={modalActivarCompe.nombre}
                      onChange={e => setModalActivarCompe({ ...modalActivarCompe, nombre: e.target.value })}
                      placeholder="Ej. Wolfpack Open 2026" autoFocus />
                  </div>
                  <div className="d-flex justify-content-end gap-2">
                    <button type="button" className="btn btn-secondary"
                      onClick={() => setModalActivarCompe({ open: false, idBox: null, planSaaS: null, estatusSaaS: '', fechaVencimientoSaaS: null, nombre: '' })}>
                      Cancelar
                    </button>
                    <button type="submit" className="btn btn-warning fw-bold" disabled={activandoCompe}>
                      {activandoCompe ? <><i className="fas fa-spinner fa-spin me-2"></i>Habilitando...</> : 'Habilitar y Crear'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
