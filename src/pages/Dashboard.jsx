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
  const [loading, setLoading] = useState(true);
  const [guardandoConfig, setGuardandoConfig] = useState(false);
  const [filtroNombre, setFiltroNombre] = useState('');
  const [filtroRol, setFiltroRol] = useState('');

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

      const [resB, resU, resM, resC] = await Promise.all([
        fetch(BOXES_ENDPOINT),
        fetch(USUARIOS_ENDPOINT),
        fetch(`${import.meta.env.VITE_API_URL}/api/developer/metricas-boxes`, { headers: authHeader }),
        fetch(`${import.meta.env.VITE_API_URL}/api/developer/configuracion`, { headers: authHeader })
      ]);
      const dataB = await resB.json();
      const dataU = await resU.json();
      const dataM = resM.ok ? await resM.json() : [];
      const dataC = resC.ok ? await resC.json() : null;

      const boxesList = Array.isArray(dataB) ? dataB : [];
      const usersList = Array.isArray(dataU) ? dataU : (dataU.data || []);

      setBoxes(boxesList);
      setUsuarios(usersList);
      setMetricasBoxes(Array.isArray(dataM) ? dataM : []);
      if(dataC) setConfiguracion(dataC);
      
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
    const coincideTexto = u.nombre.toLowerCase().includes(filtroNombre) || u.correo.toLowerCase().includes(filtroNombre);
    const coincideRol = !filtroRol || u.rol === filtroRol;
    return coincideTexto && coincideRol;
  });

  const handleConfigChange = (e) => {
    const { name, value } = e.target;
    setConfiguracion(prev => ({ ...prev, [name]: value }));
  };

  const guardarConfiguracion = async (e) => {
    e.preventDefault();
    setGuardandoConfig(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/developer/configuracion`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(configuracion)
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
          
          <div className="table-responsive rounded-3 overflow-hidden">
            <table className="table table-dark table-hover mb-0">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>BOX / SUCURSAL</th>
                  <th>ATLETAS</th>
                  <th>COACHES</th>
                  <th>ADMINS</th>
                  <th>ESTATUS</th>
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
                    <td><span className="badge bg-warning text-dark rounded-pill px-3">{b.totalAdmins}</span></td>
                    <td>
                      <span className={`badge-estado ${b.activo ? 'badge-estado-activo' : 'badge-estado-inactivo'}`}>
                        {b.activo ? 'Operando' : 'Suspendido'}
                      </span>
                    </td>
                    <td className="text-center">
                      <button 
                        className={`btn btn-sm ${b.moduloCompetenciasActivo ? 'btn-success' : 'btn-outline-warning'}`}
                        style={{ borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold' }}
                        onClick={async () => {
                          const conf = await window.wpConfirm(
                            b.moduloCompetenciasActivo 
                            ? '¿Seguro que deseas desactivar el módulo de competencias para este Box?'
                            : '¿Seguro que deseas habilitar el módulo de competencias para este Box?'
                          );
                          if(conf) {
                            try {
                              await api.actualizarModulosPremium(b.idBox, { moduloCompetenciasActivo: !b.moduloCompetenciasActivo });
                              cargarDataGlobal();
                            } catch (e) {
                              alert("No se pudo actualizar el módulo.");
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

        {/* TABLA CONFIGURACIÓN B2B Y REDES */}
        {configuracion && (
          <div className="tarjeta-panel p-3 p-md-4 mb-5">
            <h3 className="titulo-seccion mb-4"><i className="fas fa-cogs"></i> Configuración Global (B2B & Redes)</h3>
            <form onSubmit={guardarConfiguracion}>
              <div className="row g-4">
                <div className="col-12 col-md-6">
                  <h5 className="text-info border-bottom border-secondary pb-2">Módulo de Competencias</h5>
                  <div className="mb-3">
                    <label className="form-label text-white-50 small">Precio Base (Ya son clientes de Atletify)</label>
                    <div className="input-group">
                      <span className="input-group-text bg-dark text-white border-secondary">$</span>
                      <input type="number" step="0.01" className="form-control bg-dark text-white border-secondary" name="precioBase_SaaS" value={configuracion.precioBase_SaaS} onChange={handleConfigChange} required />
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label text-white-50 small">Precio Base (Solo vienen por el evento)</label>
                    <div className="input-group">
                      <span className="input-group-text bg-dark text-white border-secondary">$</span>
                      <input type="number" step="0.01" className="form-control bg-dark text-white border-secondary" name="precioBase_NoSaaS" value={configuracion.precioBase_NoSaaS} onChange={handleConfigChange} required />
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label text-white-50 small">Atletas Incluidos en Paquete Base</label>
                    <input type="number" className="form-control bg-dark text-white border-secondary" name="atletasIncluidosBase" value={configuracion.atletasIncluidosBase} onChange={handleConfigChange} required />
                  </div>
                  <div className="mb-3">
                    <label className="form-label text-white-50 small">Precio por Atleta Excedente</label>
                    <div className="input-group">
                      <span className="input-group-text bg-dark text-white border-secondary">$</span>
                      <input type="number" step="0.01" className="form-control bg-dark text-white border-secondary" name="precioPorAtletaExtra" value={configuracion.precioPorAtletaExtra} onChange={handleConfigChange} required />
                    </div>
                  </div>
                </div>

                <div className="col-12 col-md-6">
                  <h5 className="text-info border-bottom border-secondary pb-2">Redes de Contacto (Footer Público)</h5>
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
    </div>
  );
}