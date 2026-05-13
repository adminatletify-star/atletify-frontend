import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { BOXES_ENDPOINT, USUARIOS_ENDPOINT, api } from '../services/api';
import '../assets/css/dashboard.css';

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({ boxes: 0, usuarios: 0 });
  const [usuarios, setUsuarios] = useState([]);
  const [boxes, setBoxes] = useState([]);
  const [metricasBoxes, setMetricasBoxes] = useState([]);
  const [configuracion, setConfiguracion] = useState(null);
  const [planesB2B, setPlanesB2B] = useState([]);
  const [loading, setLoading] = useState(true);
  const [guardandoConfig, setGuardandoConfig] = useState(false);
  const [filtroNombre, setFiltroNombre] = useState('');
  const [filtroRol, setFiltroRol] = useState('');
  const [filtroBox, setFiltroBox] = useState('');

  const [modalAdminBox, setModalAdminBox] = useState({ open: false, idBox: null, nombreBox: '' });
  const [formDataAdmin, setFormDataAdmin] = useState({
    nombre: '', apellidos: '', username: '', correo: '', telefono: '', fechaNacimiento: ''
  });
  const [creandoAdmin, setCreandoAdmin] = useState(false);
  
  // Estado para el Modal de Habilitar Competencia
  const [modalActivarCompe, setModalActivarCompe] = useState({ open: false, idBox: null, planSaaS: null, estatusSaaS: '', fechaVencimientoSaaS: null, nombre: '' });
  const [activandoCompe, setActivandoCompe] = useState(false);
  
  // Estado para el Modal de Éxito de Creación de Admin
  const [modalSuccessAdmin, setModalSuccessAdmin] = useState({ open: false, username: '', contrasenaGenerada: '' });

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem('usuario'));
    if (!u || u.rol !== 'Developer') {
      navigate('/login');
      return;
    }
    setUser(u);
    cargarDataGlobal();
  }, [navigate]);

  async function eliminarUsuario(id) {
    if (!await window.wpConfirm("¿Estás seguro de eliminar permanentemente a este usuario? Esta acción no se puede deshacer.")) return;

    try {
      const response = await fetch(`${USUARIOS_ENDPOINT}/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        alert("Usuario eliminado con éxito");
        cargarDataGlobal();
      } else {
        alert("No se pudo eliminar al usuario.");
      }
    } catch (err) {
      console.error("Error al borrar:", err);
      alert("Error de conexión con el servidor.");
    }
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
      if(dataC) {
        try {
          dataC.planesCompetenciaArray = JSON.parse(dataC.planesCompetenciaJson || "[]");
        } catch(e) {
          dataC.planesCompetenciaArray = [];
        }
        setConfiguracion(dataC);
      }
      
      setPlanesB2B(Array.isArray(dataPlanes) ? dataPlanes : []);
      
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
      case 'AdminBox': return 'badge-estado-pendiente';
      case 'Coach': return 'badge-estado-activo';
      default: return 'badge-estado-inactivo';
    }
  };

  const rolesUnicos = [...new Set(usuarios.map(u => u.rol))];

  const usuariosFiltrados = usuarios.filter(u => {
    const coincideTexto = u.nombre?.toLowerCase().includes(filtroNombre) || u.correo?.toLowerCase().includes(filtroNombre);
    const coincideRol = !filtroRol || u.rol === filtroRol;
    const coincideBox = !filtroBox || u.idBoxPredeterminado?.toString() === filtroBox;
    return coincideTexto && coincideRol && coincideBox;
  });

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
      // Remove array from payload just in case (though backend might ignore it)
      delete payloadToSave.planesCompetenciaArray;

      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/developer/configuracion`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payloadToSave)
      });
      if (res.ok) {
        alert("Configuración Global actualizada con éxito");
      } else {
        alert("Error al actualizar la configuración");
      }
    } catch (error) {
      console.error(error);
      alert("Error de red");
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
        fechaNacimiento: formDataAdmin.fechaNacimiento ? new Date(formDataAdmin.fechaNacimiento).toISOString() : new Date().toISOString()
      };
      
      const token = localStorage.getItem('token');
      const res = await fetch(`${USUARIOS_ENDPOINT}/crear-admin-box`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        const data = await res.json();
        // En lugar de alert, mostramos nuestro Modal de Éxito
        setModalSuccessAdmin({ open: true, username: data.username, contrasenaGenerada: data.contrasenaGenerada });
        
        setModalAdminBox({ open: false, idBox: null, nombreBox: '' });
        setFormDataAdmin({ nombre: '', apellidos: '', username: '', correo: '', telefono: '', fechaNacimiento: '' });
        cargarDataGlobal(); // Recargar usuarios
      } else {
        const data = await res.json();
        alert(data.mensaje || "Error al crear AdminBox");
      }
    } catch(err) {
      alert("Error de conexión");
    } finally {
      setCreandoAdmin(false);
    }
  };

  const handleActivarYCrearCompe = async (e) => {
    e.preventDefault();
    setActivandoCompe(true);
    try {
      const token = localStorage.getItem('token');
      // 1. Habilitar el módulo SaaS
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

      // 2. Crear la competencia

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

      alert("Módulo habilitado y competencia creada con éxito. Ya puedes revisarla en Admin Competencias.");
      setModalActivarCompe({ open: false, idBox: null, planSaaS: null, estatusSaaS: '', fechaVencimientoSaaS: null, nombre: '' });
      cargarDataGlobal();
    } catch(err) {
      console.error(err);
      alert(err.message || "No se pudo completar la operación.");
    } finally {
      setActivandoCompe(false);
    }
  };

  if (loading) return (
    <div className="min-vh-100 d-flex justify-content-center align-items-center">
      <div className="spinner-wp" />
    </div>
  );

  return (
    <div className="dash-page min-vh-100 pb-5">

      {/* HERO HEADER */}
      <div className="dash-hero">
        <div className="container py-4 py-md-5">
          <div className="row align-items-center g-4">
            {/* Título */}
            <div className="col-12 col-lg-5">
              <div className="d-flex align-items-center gap-3 mb-2">
                <div className="dash-hero-icon">
                  <i className="fas fa-terminal"></i>
                </div>
                <div>
                  <h1 className="dash-heading mb-0">DASHBOARD</h1>
                  <p className="dash-subheading mb-0">Developer Control Panel</p>
                </div>
              </div>
            </div>
            {/* Stats inline */}
            <div className="col-12 col-lg-7">
              <div className="row g-3">
                <div className="col-6 col-md-4">
                  <div className="dash-stat-card text-center p-3">
                    <div className="stat-number">{stats.boxes}</div>
                    <div className="stat-label">Boxes</div>
                  </div>
                </div>
                <div className="col-6 col-md-4">
                  <div className="dash-stat-card text-center p-3">
                    <div className="stat-number">{stats.usuarios}</div>
                    <div className="stat-label">Usuarios</div>
                  </div>
                </div>
                <div className="col-6 col-md-4">
                  <Link to="/crear-box" className="dash-nuevo-box d-flex align-items-center justify-content-center gap-2 p-3 text-decoration-none h-100">
                    <i className="fas fa-plus-circle"></i>
                    <span className="dash-nuevo-box-text">Nuevo Box</span>
                  </Link>
                </div>
                <div className="col-6 col-md-4">
                  <Link to="/admin-saas" className="dash-nuevo-box d-flex align-items-center justify-content-center gap-2 p-3 text-decoration-none h-100" style={{ '--dash-nuevo-color': '#9b59b6' }}>
                    <i className="fas fa-crown"></i>
                    <span className="dash-nuevo-box-text">Planes y B2B SaaS</span>
                  </Link>
                </div>
                <div className="col-6 col-md-4">
                  <Link to="/admin-ejercicios" className="dash-nuevo-box d-flex align-items-center justify-content-center gap-2 p-3 text-decoration-none h-100" style={{ '--dash-nuevo-color': '#F5A623' }}>
                    <i className="fas fa-book-open"></i>
                    <span className="dash-nuevo-box-text">Ejercicios</span>
                  </Link>
                </div>
                <div className="col-6 col-md-4">
                  <Link to="/admin-archivadas" className="dash-nuevo-box d-flex align-items-center justify-content-center gap-2 p-3 text-decoration-none h-100" style={{ '--dash-nuevo-color': '#e74c3c' }}>
                    <i className="fas fa-database"></i>
                    <span className="dash-nuevo-box-text">Administrar Competencias</span>
                  </Link>
                </div>
                <div className="col-12 col-md-12">
                  <Link to="/admin-preregistros" className="dash-nuevo-box d-flex align-items-center justify-content-center gap-2 p-3 text-decoration-none h-100" style={{ '--dash-nuevo-color': '#3498db' }}>
                    <i className="fas fa-envelope-open-text"></i>
                    <span className="dash-nuevo-box-text">Centro de Pre-registros (Mágicos)</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-4">

        {/* TABLA DE BOXES (SAAS) */}
        <div className="tarjeta-panel p-3 p-md-4 mb-5">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3 mb-4">
            <h3 className="titulo-seccion mb-0">
              <i className="fas fa-boxes"></i> SaaS Control de Boxes
            </h3>
          </div>
          
          {/* Tabla Desktop */}
          <div className="d-none d-md-block">
            <div className="table-responsive rounded-3 overflow-hidden">
              <table className="table table-dark table-hover mb-0">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>BOX / SUCURSAL</th>
                    <th>ATLETAS</th>
                    <th>COACHES</th>
                    <th>ADMINS</th>
                    <th>SAAS / CONNECT</th>
                    <th className="text-center">COMPETENCIAS</th>
                  </tr>
                </thead>
                <tbody>
                  {metricasBoxes.map(b => (
                    <tr key={b.idBox} className="align-middle">
                      <td className="dash-text-muted">#{b.idBox}</td>
                      <td><div className="fw-bold">{b.nombre}</div></td>
                      <td><span className="badge bg-primary rounded-pill px-3">{b.totalAtletas}</span></td>
                      <td><span className="badge bg-info text-dark rounded-pill px-3">{b.totalCoaches}</span></td>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <span className="badge bg-warning text-dark rounded-pill px-3">{b.totalAdmins}</span>
                          <button 
                            className="btn btn-sm btn-outline-warning rounded-circle" 
                            title="Crear AdminBox"
                            onClick={() => setModalAdminBox({ open: true, idBox: b.idBox, nombreBox: b.nombre })}
                            style={{ width: '28px', height: '28px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          >
                            <i className="fas fa-plus"></i>
                          </button>
                        </div>
                      </td>
                      <td>
                        <div className="d-flex flex-column gap-2">
                          <select 
                            className={`form-select form-select-sm bg-dark text-white border-secondary ${b.estatusSaaS === 'Activo' ? 'text-success' : b.estatusSaaS === 'Vencido' ? 'text-danger' : 'text-warning'}`}
                            value={b.estatusSaaS || 'Pendiente'}
                            onChange={async (e) => {
                              const newStatus = e.target.value;
                              let fechaGracia = null;
                              if (newStatus === 'Gracia') {
                                fechaGracia = prompt("Ingresa la fecha de vencimiento/corte del periodo de gracia (YYYY-MM-DD):", new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
                                if (!fechaGracia) return; // Canceló
                              }

                              try {
                                const token = localStorage.getItem('token');
                                await fetch(`${import.meta.env.VITE_API_URL}/api/developer/box-saas/${b.idBox}`, {
                                  method: 'PUT',
                                  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                                  body: JSON.stringify({ 
                                    estatusSaaS: newStatus, 
                                    idPlanSaaS: b.idPlanSaaS,
                                    moduloCompetenciasActivo: b.moduloCompetenciasActivo,
                                    fechaVencimientoSaaS: fechaGracia || b.fechaVencimientoSaaS
                                  })
                                });
                                alert("Estatus SaaS actualizado");
                                cargarDataGlobal(); // RECARGAR ESTADO
                              } catch(err) {
                                alert("Error al actualizar estatus SaaS");
                              }
                            }}
                          >
                            <option value="Pendiente">Pendiente</option>
                            <option value="Activo">Activo</option>
                            <option value="Gracia">Gracia</option>
                            <option value="Vencido">Vencido</option>
                          </select>
                          <div className="d-flex flex-column" style={{fontSize: '0.75rem'}}>
                            {b.fechaVencimientoSaaS && <span className="text-muted"><i className="fas fa-calendar-alt"></i> Vence: {new Date(b.fechaVencimientoSaaS).toLocaleDateString()}</span>}
                            {b.stripeConnectActivo 
                              ? <span className="text-success fw-bold"><i className="fab fa-stripe-s"></i> Connect OK</span> 
                              : <span className="text-danger"><i className="fab fa-stripe-s"></i> Sin Connect</span>}
                          </div>
                        </div>
                      </td>
                      <td className="text-center">
                        <button 
                          className={`btn btn-sm ${b.moduloCompetenciasActivo ? 'btn-success' : 'btn-outline-warning'}`}
                          style={{ borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold' }}
                          onClick={async () => {
                            if (!b.moduloCompetenciasActivo) {
                              // Abrir modal para encender y crear competencia
                              setModalActivarCompe({ 
                                open: true, 
                                idBox: b.idBox, 
                                planSaaS: b.idPlanSaaS, 
                                planCompetenciaId: '',
                                estatusSaaS: b.estatusSaaS, 
                                fechaVencimientoSaaS: b.fechaVencimientoSaaS, 
                                nombre: '' 
                              });
                            } else {
                              const conf = await window.wpConfirm('¿Seguro que deseas desactivar el módulo de competencias para este Box?');
                              if(conf) {
                                try {
                                  const token = localStorage.getItem('token');
                                  const res = await fetch(`${import.meta.env.VITE_API_URL}/api/developer/box-saas/${b.idBox}`, {
                                    method: 'PUT',
                                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                                    body: JSON.stringify({ 
                                      estatusSaaS: b.estatusSaaS || 'Pendiente', 
                                      idPlanSaaS: b.idPlanSaaS,
                                      moduloCompetenciasActivo: false,
                                      fechaVencimientoSaaS: b.fechaVencimientoSaaS
                                    })
                                  });
                                  if (!res.ok) throw new Error("Error en servidor");
                                  cargarDataGlobal();
                                } catch (e) {
                                  console.error(e);
                                  alert("No se pudo actualizar el módulo.");
                                }
                              }
                            }
                          }}
                        >
                          <i className="fas fa-trophy me-1"></i>
                          {b.moduloCompetenciasActivo ? 'ON' : 'OFF'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Cards Mobile */}
          <div className="d-md-none d-flex flex-column gap-3 mt-3">
            {metricasBoxes.map(b => (
              <div key={b.idBox} className="dash-user-card p-3 rounded-3 border border-secondary" style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)' }}>
                <div className="d-flex justify-content-between align-items-start mb-3">
                  <div>
                    <div className="dash-text-muted small">#{b.idBox}</div>
                    <div className="fw-bold fs-5 text-white">{b.nombre}</div>
                  </div>
                  <div className="d-flex flex-column align-items-end gap-1">
                    <span className="badge bg-primary rounded-pill" title="Atletas"><i className="fas fa-users me-1"></i> {b.totalAtletas}</span>
                    <span className="badge bg-info text-dark rounded-pill" title="Coaches"><i className="fas fa-chalkboard-teacher me-1"></i> {b.totalCoaches}</span>
                    <div className="d-flex align-items-center gap-1 mt-1">
                      <span className="badge bg-warning text-dark rounded-pill" title="Admins"><i className="fas fa-user-shield me-1"></i> {b.totalAdmins}</span>
                      <button 
                        className="btn btn-sm btn-warning rounded-circle p-0 d-flex align-items-center justify-content-center" 
                        title="Crear AdminBox"
                        onClick={() => setModalAdminBox({ open: true, idBox: b.idBox, nombreBox: b.nombre })}
                        style={{ width: '22px', height: '22px' }}
                      >
                        <i className="fas fa-plus" style={{ fontSize: '10px' }}></i>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-2 rounded bg-black border border-secondary mb-3">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <div className="small text-white-50"><i className="fas fa-cloud me-1"></i> SaaS / Connect</div>
                  </div>
                  <select 
                    className={`form-select form-select-sm bg-dark text-white border-secondary mb-2 ${b.estatusSaaS === 'Activo' ? 'text-success' : b.estatusSaaS === 'Vencido' ? 'text-danger' : 'text-warning'}`}
                    value={b.estatusSaaS || 'Pendiente'}
                    onChange={async (e) => {
                      const newStatus = e.target.value;
                      let fechaGracia = null;
                      if (newStatus === 'Gracia') {
                        fechaGracia = prompt("Ingresa la fecha de vencimiento/corte del periodo de gracia (YYYY-MM-DD):", new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
                        if (!fechaGracia) return; // Canceló
                      }

                      try {
                        const token = localStorage.getItem('token');
                        await fetch(`${import.meta.env.VITE_API_URL}/api/developer/box-saas/${b.idBox}`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                          body: JSON.stringify({ 
                            estatusSaaS: newStatus, 
                            idPlanSaaS: b.idPlanSaaS,
                            moduloCompetenciasActivo: b.moduloCompetenciasActivo,
                            fechaVencimientoSaaS: fechaGracia || b.fechaVencimientoSaaS
                          })
                        });
                        alert("Estatus SaaS actualizado");
                        cargarDataGlobal(); // RECARGAR ESTADO
                      } catch(err) {
                        alert("Error al actualizar estatus SaaS");
                      }
                    }}
                  >
                    <option value="Pendiente">Pendiente</option>
                    <option value="Activo">Activo</option>
                    <option value="Gracia">Gracia</option>
                    <option value="Vencido">Vencido</option>
                  </select>
                  <div className="d-flex justify-content-between align-items-center" style={{fontSize: '0.75rem'}}>
                    {b.fechaVencimientoSaaS ? <span className="text-muted"><i className="fas fa-calendar-alt"></i> Vence: {new Date(b.fechaVencimientoSaaS).toLocaleDateString()}</span> : <span></span>}
                    {b.stripeConnectActivo 
                      ? <span className="text-success fw-bold"><i className="fab fa-stripe-s"></i> Connect OK</span> 
                      : <span className="text-danger"><i className="fab fa-stripe-s"></i> Sin Connect</span>}
                  </div>
                </div>

                <div className="d-flex justify-content-between align-items-center">
                  <div className="small text-white-50">Competencias:</div>
                  <button 
                    className={`btn btn-sm ${b.moduloCompetenciasActivo ? 'btn-success' : 'btn-outline-warning'} rounded-pill fw-bold px-3`}
                    onClick={async () => {
                      if (!b.moduloCompetenciasActivo) {
                        setModalActivarCompe({ 
                          open: true, 
                          idBox: b.idBox, 
                          planSaaS: b.idPlanSaaS, 
                          planCompetenciaId: '',
                          estatusSaaS: b.estatusSaaS, 
                          fechaVencimientoSaaS: b.fechaVencimientoSaaS, 
                          nombre: '' 
                        });
                      } else {
                        const conf = await window.wpConfirm('¿Seguro que deseas desactivar el módulo de competencias para este Box?');
                        if(conf) {
                          try {
                            const token = localStorage.getItem('token');
                            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/developer/box-saas/${b.idBox}`, {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                              body: JSON.stringify({ 
                                estatusSaaS: b.estatusSaaS || 'Pendiente', 
                                idPlanSaaS: b.idPlanSaaS,
                                moduloCompetenciasActivo: false,
                                fechaVencimientoSaaS: b.fechaVencimientoSaaS
                              })
                            });
                            if (!res.ok) throw new Error("Error en servidor");
                            cargarDataGlobal();
                          } catch (e) {
                            console.error(e);
                            alert("No se pudo actualizar el módulo.");
                          }
                        }
                      }
                    }}
                  >
                    <i className="fas fa-trophy me-1"></i>
                    {b.moduloCompetenciasActivo ? 'ACTIVADO' : 'DESACTIVADO'}
                  </button>
                </div>

              </div>
            ))}
          </div>
        </div>

        {/* TABLA CONFIGURACIÓN B2B Y REDES */}
        {configuracion && (
          <div className="tarjeta-panel p-3 p-md-4 mb-5">
            <h3 className="titulo-seccion mb-4"><i className="fas fa-cogs"></i> Configuración Global (B2B & Redes)</h3>

            {/* === INTERRUPTOR MODO MANTENIMIENTO === */}
            <div
              className="p-3 rounded-3 mb-4 d-flex align-items-center justify-content-between flex-wrap gap-3"
              style={{
                background: configuracion.enMantenimiento ? 'rgba(220,53,69,0.12)' : 'rgba(255,255,255,0.03)',
                border: `1.5px solid ${configuracion.enMantenimiento ? '#dc3545' : 'rgba(255,255,255,0.08)'}`,
                transition: 'all 0.3s ease'
              }}
            >
              <div className="d-flex align-items-center gap-3">
                <i className={`fas fa-hard-hat fs-4 ${configuracion.enMantenimiento ? 'text-danger' : 'text-secondary'}`}></i>
                <div>
                  <div className="fw-bold text-white" style={{ fontSize: '0.9rem' }}>
                    Modo Mantenimiento
                    {configuracion.enMantenimiento && <span className="badge bg-danger ms-2" style={{ fontSize: '0.6rem' }}>ACTIVO</span>}
                  </div>
                  <small className="text-white-50" style={{ fontSize: '0.72rem' }}>
                    {configuracion.enMantenimiento
                      ? '⚠️ Todos los usuarios (excepto tú) están bloqueados'
                      : 'Activa para bloquear el acceso a todos los usuarios excepto Developer'}
                  </small>
                </div>
              </div>
              <div className="form-check form-switch m-0">
                <input
                  className="form-check-input bg-danger border-danger"
                  type="checkbox"
                  role="switch"
                  id="switchMantenimiento"
                  checked={configuracion.enMantenimiento || false}
                  onChange={async (e) => {
                    const nuevoEstado = e.target.checked;
                    if (nuevoEstado) {
                      const ok = await window.wpConfirm('⚠️ ¿Activar Modo Mantenimiento?\n\nTodos los usuarios (Atletas, Coaches, AdminBox, Jueces y Staff) serán bloqueados y verán una página de mantenimiento.\n\nSolo tú (Developer) podrás seguir navegando.');
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
                      if (res.ok) {
                        setConfiguracion(prev => ({ ...prev, enMantenimiento: nuevoEstado }));
                      }
                    } catch (err) {
                      console.error('Error al cambiar modo mantenimiento:', err);
                    }
                  }}
                  style={{ width: '3rem', height: '1.5rem', cursor: 'pointer' }}
                />
              </div>
            </div>

            <form onSubmit={guardarConfiguracion}>
              <div className="row g-4">
                <div className="col-12 col-md-6">
                  <div className="d-flex justify-content-between align-items-center border-bottom border-secondary pb-2 mb-3">
                    <h5 className="text-info m-0">Planes de Competencias SaaS</h5>
                    <button 
                      type="button" 
                      className="btn btn-sm btn-outline-info rounded-pill"
                      onClick={() => {
                        const newPlan = { id: Date.now(), nombre: '', precio: 0, dias: 1, atletasIncluidos: 50, precioAtletaExtra: 0 };
                        setConfiguracion(prev => ({
                          ...prev,
                          planesCompetenciaArray: [...(prev.planesCompetenciaArray || []), newPlan]
                        }));
                      }}
                    >
                      <i className="fas fa-plus me-1"></i> Añadir Plan
                    </button>
                  </div>
                  
                  <div className="d-flex flex-column gap-3" style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: '10px' }}>
                    {(!configuracion.planesCompetenciaArray || configuracion.planesCompetenciaArray.length === 0) && (
                      <div className="text-center text-white-50 p-3 border border-secondary rounded border-dashed">
                        No hay planes configurados.
                      </div>
                    )}
                    {(configuracion.planesCompetenciaArray || []).map((plan, index) => (
                      <div key={plan.id || index} className="p-3 bg-dark border border-secondary rounded position-relative">
                        <button 
                          type="button" 
                          className="btn btn-sm btn-outline-danger position-absolute"
                          style={{ top: '10px', right: '10px' }}
                          onClick={() => {
                            const newArray = [...configuracion.planesCompetenciaArray];
                            newArray.splice(index, 1);
                            setConfiguracion(prev => ({ ...prev, planesCompetenciaArray: newArray }));
                          }}
                        >
                          <i className="fas fa-times"></i>
                        </button>
                        
                        <div className="mb-2 pe-4">
                          <label className="form-label text-white-50 small m-0">Nombre del Plan</label>
                          <input type="text" className="form-control form-control-sm bg-black text-white border-secondary" placeholder="Ej. Básico, Pro" value={plan.nombre} onChange={e => {
                            const newArray = [...configuracion.planesCompetenciaArray];
                            newArray[index].nombre = e.target.value;
                            setConfiguracion(prev => ({ ...prev, planesCompetenciaArray: newArray }));
                          }} required />
                        </div>
                        
                        <div className="row g-2 mb-2">
                          <div className="col-6">
                            <label className="form-label text-white-50 small m-0">Precio</label>
                            <div className="input-group input-group-sm">
                              <span className="input-group-text bg-black text-white border-secondary">$</span>
                              <input type="number" step="0.01" className="form-control bg-black text-white border-secondary" value={plan.precio} onChange={e => {
                                const newArray = [...configuracion.planesCompetenciaArray];
                                newArray[index].precio = parseFloat(e.target.value) || 0;
                                setConfiguracion(prev => ({ ...prev, planesCompetenciaArray: newArray }));
                              }} required />
                            </div>
                          </div>
                          <div className="col-6">
                            <label className="form-label text-white-50 small m-0">Plazo (Días)</label>
                            <input type="number" className="form-control form-control-sm bg-black text-white border-secondary" placeholder="Duración evento" value={plan.dias} onChange={e => {
                                const newArray = [...configuracion.planesCompetenciaArray];
                                newArray[index].dias = parseInt(e.target.value) || 1;
                                setConfiguracion(prev => ({ ...prev, planesCompetenciaArray: newArray }));
                            }} required />
                          </div>
                        </div>

                        <div className="row g-2">
                          <div className="col-6">
                            <label className="form-label text-white-50 small m-0">Atletas Incluidos</label>
                            <input type="number" className="form-control form-control-sm bg-black text-white border-secondary" value={plan.atletasIncluidos} onChange={e => {
                                const newArray = [...configuracion.planesCompetenciaArray];
                                newArray[index].atletasIncluidos = parseInt(e.target.value) || 0;
                                setConfiguracion(prev => ({ ...prev, planesCompetenciaArray: newArray }));
                            }} required />
                          </div>
                          <div className="col-6">
                            <label className="form-label text-white-50 small m-0">Precio Atleta Extra</label>
                            <div className="input-group input-group-sm">
                              <span className="input-group-text bg-black text-white border-secondary">$</span>
                              <input type="number" step="0.01" className="form-control bg-black text-white border-secondary" value={plan.precioAtletaExtra} onChange={e => {
                                const newArray = [...configuracion.planesCompetenciaArray];
                                newArray[index].precioAtletaExtra = parseFloat(e.target.value) || 0;
                                setConfiguracion(prev => ({ ...prev, planesCompetenciaArray: newArray }));
                              }} required />
                            </div>
                          </div>
                        </div>

                      </div>
                    ))}
                  </div>
                </div>

                <div className="col-12 col-md-6">
                  <h5 className="text-info border-bottom border-secondary pb-2">Redes de Contacto</h5>
                  <div className="mb-3">
                    <label className="form-label text-white-50 small"><i className="fab fa-instagram text-danger"></i> Instagram URL</label>
                    <input type="text" className="form-control bg-dark text-white border-secondary" name="linkInstagram" value={configuracion.linkInstagram} onChange={handleConfigChange} />
                  </div>
                  <div className="mb-3">
                    <label className="form-label text-white-50 small"><i className="fab fa-facebook text-primary"></i> Facebook URL</label>
                    <input type="text" className="form-control bg-dark text-white border-secondary" name="linkFacebook" value={configuracion.linkFacebook} onChange={handleConfigChange} />
                  </div>
                  <div className="mb-3">
                    <label className="form-label text-white-50 small"><i className="fas fa-envelope text-warning"></i> Correo de Contacto</label>
                    <input type="email" className="form-control bg-dark text-white border-secondary" name="correoContacto" value={configuracion.correoContacto} onChange={handleConfigChange} />
                  </div>
                  <div className="mb-3">
                    <label className="form-label text-white-50 small"><i className="fas fa-phone text-success"></i> Teléfono de Soporte</label>
                    <input type="text" className="form-control bg-dark text-white border-secondary" name="telefonoSoporte" value={configuracion.telefonoSoporte} onChange={handleConfigChange} />
                  </div>
                </div>
                
                <div className="col-12">
                   <h5 className="text-info border-bottom border-secondary pb-2">Contrato Maestro Plataforma</h5>
                   <div className="mb-3">
                      <label className="form-label text-white-50 small">Términos y Condiciones (Texto plano o HTML simple)</label>
                      <textarea className="form-control bg-dark text-white border-secondary" rows="5" name="contratoUsoGlobal" value={configuracion.contratoUsoGlobal} onChange={handleConfigChange}></textarea>
                   </div>
                </div>
              </div>
              <div className="text-end mt-3">
                <button type="submit" className="btn btn-warning px-5 rounded-pill fw-bold" disabled={guardandoConfig}>
                  {guardandoConfig ? <><i className="fas fa-spinner fa-spin me-2"></i>Guardando...</> : <><i className="fas fa-save me-2"></i>Guardar Configuración Global</>}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TABLA DE USUARIOS */}
        <div className="tarjeta-panel p-3 p-md-4">

          {/* Header + Filtros */}
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3 mb-4">
            <h3 className="titulo-seccion mb-0">
              <i className="fas fa-users-cog"></i> Control Global de Roles
            </h3>
            <div className="d-flex flex-column flex-sm-row gap-2 dash-filters">
              <select
                className="entrada-oscura dash-filter-select flex-shrink-0"
                value={filtroBox}
                onChange={(e) => setFiltroBox(e.target.value)}
              >
                <option value="">Todos los Boxes</option>
                {boxes.map(b => (
                  <option key={b.idBox} value={b.idBox.toString()}>{b.nombre}</option>
                ))}
              </select>
              <select
                className="entrada-oscura dash-filter-select flex-shrink-0"
                value={filtroRol}
                onChange={(e) => setFiltroRol(e.target.value)}
              >
                <option value="">Todos</option>
                {rolesUnicos.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              <div className="dash-search-wrapper flex-grow-1">
                <i className="fas fa-search dash-search-icon"></i>
                <input
                  type="text"
                  className="entrada-oscura dash-search-input w-100"
                  placeholder="Buscar por nombre o correo..."
                  onChange={(e) => setFiltroNombre(e.target.value.toLowerCase())}
                />
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
                  {usuariosFiltrados.map(u => (
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
                      <td>
                        <span className={`badge-estado ${rolBadgeClass(u.rol)}`}>{u.rol}</span>
                      </td>
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

          {/* Cards Mobile */}
          <div className="d-md-none d-flex flex-column gap-3">
            {usuariosFiltrados.map(u => (
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

        </div>

      </div>

      {/* MODAL CREAR ADMIN BOX */}
      {modalAdminBox.open && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content bg-dark text-white border-secondary">
              <div className="modal-header border-secondary">
                <h5 className="modal-title text-warning">
                  <i className="fas fa-user-plus me-2"></i>Crear Admin para {modalAdminBox.nombreBox}
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setModalAdminBox({ open: false, idBox: null, nombreBox: '' })}></button>
              </div>
              <div className="modal-body">
                <form onSubmit={handleCrearAdminBox}>
                  <div className="row g-3">
                    <div className="col-6">
                      <label className="form-label small text-light">Nombre(s) *</label>
                      <input type="text" className="form-control bg-dark text-white border-secondary" required value={formDataAdmin.nombre} onChange={e => setFormDataAdmin({...formDataAdmin, nombre: e.target.value})} />
                    </div>
                    <div className="col-6">
                      <label className="form-label small text-light">Apellidos</label>
                      <input type="text" className="form-control bg-dark text-white border-secondary" value={formDataAdmin.apellidos} onChange={e => setFormDataAdmin({...formDataAdmin, apellidos: e.target.value})} />
                    </div>
                    <div className="col-12">
                      <label className="form-label small text-light">Username *</label>
                      <input type="text" className="form-control bg-dark text-white border-secondary" required value={formDataAdmin.username} onChange={e => setFormDataAdmin({...formDataAdmin, username: e.target.value})} />
                    </div>
                    <div className="col-12">
                      <label className="form-label small text-light">Correo (Login) *</label>
                      <input type="email" className="form-control bg-dark text-white border-secondary" required value={formDataAdmin.correo} onChange={e => setFormDataAdmin({...formDataAdmin, correo: e.target.value})} />
                    </div>
                    <div className="col-12">
                      <div className="p-3 rounded-3" style={{ background: 'rgba(255,255,255,0.05)', border: '1px dashed rgba(255,255,255,0.2)' }}>
                        <label className="form-label small text-warning fw-bold mb-1"><i className="fas fa-magic me-2"></i>Contraseña (Generada Automáticamente)</label>
                        <p className="small text-white-50 mb-0">Se mostrará en pantalla después de crear el AdminBox (Formato: XXX-NNNN*)</p>
                      </div>
                    </div>
                    <div className="col-6">
                      <label className="form-label small text-light">Teléfono</label>
                      <input 
                        type="text" 
                        className="form-control bg-dark text-white border-secondary" 
                        maxLength="10"
                        value={formDataAdmin.telefono} 
                        onChange={e => {
                          const soloNumeros = e.target.value.replace(/\D/g, '');
                          setFormDataAdmin({...formDataAdmin, telefono: soloNumeros});
                        }} 
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label small text-light">Fecha Nacimiento *</label>
                      <input type="date" className="form-control bg-dark text-white border-secondary" required value={formDataAdmin.fechaNacimiento} onChange={e => setFormDataAdmin({...formDataAdmin, fechaNacimiento: e.target.value})} />
                    </div>
                  </div>
                  <div className="d-flex justify-content-end gap-2 mt-4">
                    <button type="button" className="btn btn-secondary" onClick={() => setModalAdminBox({ open: false, idBox: null, nombreBox: '' })}>Cancelar</button>
                    <button type="submit" className="btn btn-warning fw-bold" disabled={creandoAdmin}>
                      {creandoAdmin ? <><i className="fas fa-spinner fa-spin me-2"></i>Creando...</> : 'Crear AdminBox'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE ÉXITO: CONTRASEÑA GENERADA */}
      {modalSuccessAdmin.open && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 1055 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content bg-dark text-white border-success shadow-lg">
              <div className="modal-body text-center p-5">
                <div className="mb-4">
                  <div className="d-inline-flex align-items-center justify-content-center bg-success text-white rounded-circle mb-3" style={{ width: '80px', height: '80px', fontSize: '2rem' }}>
                    <i className="fas fa-check"></i>
                  </div>
                  <h3 className="text-white fw-bold">¡AdminBox Creado!</h3>
                  <p className="text-muted">El usuario ha sido registrado exitosamente. Por favor, guarda estos accesos para entregarlos al cliente.</p>
                </div>
                
                <div className="p-3 rounded-3 text-start mb-4" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <div className="mb-2">
                    <small className="text-muted text-uppercase fw-bold" style={{ letterSpacing: '1px' }}>Username (Login)</small>
                    <div className="fs-5 text-white user-select-all">{modalSuccessAdmin.username}</div>
                  </div>
                  <div>
                    <small className="text-warning text-uppercase fw-bold" style={{ letterSpacing: '1px' }}><i className="fas fa-key me-2"></i>Contraseña Segura</small>
                    <div className="fs-3 fw-bold text-warning user-select-all" style={{ letterSpacing: '2px' }}>{modalSuccessAdmin.contrasenaGenerada}</div>
                  </div>
                </div>

                <button 
                  type="button" 
                  className="btn btn-success px-5 py-2 fw-bold rounded-pill"
                  onClick={() => setModalSuccessAdmin({ open: false, username: '', contrasenaGenerada: '' })}
                >
                  Entendido, Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ACTIVAR COMPETENCIAS Y CREAR */}
      {modalActivarCompe.open && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 1055 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content bg-dark text-white border-secondary">
              <div className="modal-header border-secondary">
                <h5 className="modal-title text-warning">
                  <i className="fas fa-trophy me-2"></i>Habilitar Módulo y Crear Competencia
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setModalActivarCompe({ open: false, idBox: null, planSaaS: null, estatusSaaS: '', fechaVencimientoSaaS: null, nombre: '' })}></button>
              </div>
              <div className="modal-body">
                <p className="small text-white-50 mb-4">
                  Al habilitar el módulo de competencias, el sistema le asignará un plan y creará automáticamente la primera competencia para este Box (como si hubieran hecho la compra). Por favor, selecciona el plan y el nombre del evento.
                </p>
                <form onSubmit={handleActivarYCrearCompe}>
                  <div className="mb-3">
                    <label className="form-label small text-light">Plan de Competencia a Asignar *</label>
                    <select 
                      className="form-select bg-dark text-white border-secondary"
                      required
                      value={modalActivarCompe.planCompetenciaId || ''}
                      onChange={e => setModalActivarCompe({...modalActivarCompe, planCompetenciaId: e.target.value})}
                    >
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
                    <input 
                      type="text" 
                      className="form-control bg-dark text-white border-secondary" 
                      required 
                      value={modalActivarCompe.nombre} 
                      onChange={e => setModalActivarCompe({...modalActivarCompe, nombre: e.target.value})} 
                      placeholder="Ej. Wolfpack Open 2026"
                      autoFocus
                    />
                  </div>
                  <div className="d-flex justify-content-end gap-2">
                    <button type="button" className="btn btn-secondary" onClick={() => setModalActivarCompe({ open: false, idBox: null, planSaaS: null, estatusSaaS: '', fechaVencimientoSaaS: null, nombre: '' })}>Cancelar</button>
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