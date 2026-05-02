import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import RedGrayDatePicker from '../components/RedGrayDatePicker';
import '../assets/css/global.css';
import BackButton from '../components/BackButton';

export default function MisKids() {
  const { usuario } = useAuth();
  const [kids, setKids] = useState([]);
  const [clases, setClases] = useState([]);
  const [solicitudesKid, setSolicitudesKid] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState([]);
  const [showFormRegistro, setShowFormRegistro] = useState(false);
  const [showInscribirClase, setShowInscribirClase] = useState(null);
  const [comprobante, setComprobante] = useState(null);

  const [formKid, setFormKid] = useState({
    nombreCompleto: '',
    fechaNacimiento: '',
    genero: '',
    tieneDiscapacidad: '',
    foto: ''
  });

  useEffect(() => {
    if (usuario) {
      cargarDatos();
    }
  }, [usuario]);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const [kidsData, clasesData, solicitudesData] = await Promise.all([
        api.obtenerKidsDelTutor(usuario.idUsuario || usuario.id),
        usuario.idBoxPredeterminado ? api.obtenerClasesDelBox(usuario.idBoxPredeterminado) : Promise.resolve([]),
        api.obtenerSolicitudesKidDelTutor(usuario.idUsuario || usuario.id)
      ]);
      setKids(kidsData?.kids || []);
      setClases(Array.isArray(clasesData) ? clasesData.filter(c => c.esClaseKids) : []);
      setSolicitudesKid(solicitudesData?.solicitudes || []);
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const showAlert = (mensaje, tipo = 'danger') => {
    const alerta = { id: Date.now(), mensaje, tipo };
    setAlerts(prev => [...prev, alerta]);
    setTimeout(() => {
      setAlerts(prev => prev.filter(a => a.id !== alerta.id));
    }, 5000);
  };

  const handleRegistrarKid = async (e) => {
    e.preventDefault();
    if (!formKid.nombreCompleto.trim()) {
      showAlert('El nombre es obligatorio');
      return;
    }
    if (!formKid.fechaNacimiento) {
      showAlert('La fecha de nacimiento es obligatoria');
      return;
    }

    try {
      const resultado = await api.registrarKid({
        IdTutor: usuario.idUsuario || usuario.id,
        IdBox: usuario.idBoxPredeterminado,
        NombreCompleto: formKid.nombreCompleto.trim(),
        FechaNacimiento: formKid.fechaNacimiento,
        Genero: formKid.genero || null,
        TieneDiscapacidad: formKid.tieneDiscapacidad || null,
        Foto: formKid.foto || null
      });

      if (resultado.comprobante) {
        setComprobante(resultado.comprobante);
        showAlert('¡Solicitud enviada! Tu solicitud será revisada por el administrador del box.', 'success');
        setShowFormRegistro(false);
        setFormKid({ nombreCompleto: '', fechaNacimiento: '', genero: '', tieneDiscapacidad: '', foto: '' });
        cargarDatos();
      }
    } catch (error) {
      showAlert(error.message || 'Error al enviar solicitud');
    }
  };

  const handleInscribirKidAClase = async (idKid, idClase) => {
    try {
      const resultado = await api.solicitarClaseKid(idKid, idClase);
      if (resultado.idSolicitud) {
        showAlert(`¡Solicitud enviada para ${resultado.nombreKid} a ${resultado.nombreClase}!`, 'success');
        setShowInscribirClase(null);
        cargarDatos();
      }
    } catch (error) {
      showAlert(error.message || 'Error al solicitar inscripción');
    }
  };

  const handleDesactivarKid = async (idKid, nombre) => {
    if (!await window.wpConfirm(`¿Desactivar a ${nombre}?`)) return;
    try {
      await api.desactivarKid(idKid);
      showAlert('Kid desactivado', 'success');
      cargarDatos();
    } catch (error) {
      showAlert(error.message || 'Error al desactivar');
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setFormKid(prev => ({ ...prev, foto: event.target.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  if (loading) {
    return (
      <div className="bg-dark text-white min-vh-100 d-flex align-items-center justify-content-center">
        <div className="spinner-border text-danger" role="status">
          <span className="visually-hidden">Cargando...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-dark text-white min-vh-100">
      {/* Navbar */}
      <nav className="navbar navbar-dark bg-danger-dark sticky-top">
        <div className="container-fluid">
          <a href="/" className="navbar-brand fw-bold">
            <i className="fas fa-arrow-left me-2"></i>
            <span className="text-danger">WOLFPACK</span> SYSTEM
          </a>
          <span className="navbar-text">{usuario?.nombre}</span>
        </div>
      </nav>

      {/* Alertas */}
      <div className="position-fixed top-0 end-0 p-3" style={{ zIndex: 9999 }}>
        {alerts.map(alert => (
          <div key={alert.id} className={`alert alert-${alert.tipo} alert-dismissible fade show`} role="alert">
            {alert.mensaje}
          </div>
        ))}
      </div>

      <div className="container py-5">
        {/* Header */}
        <div className="row mb-4">
          <div className="col-12 d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center gap-3">
              <BackButton />
              <div>
                <h2 className="text-white mb-1">
                  <i className="fas fa-child text-danger me-2"></i>
                  Mis Kids
                </h2>
                <p className="text-muted mb-0">Registra y administra a tus hijos en clases Kids</p>
              </div>
            </div>
            <button className="btn btn-danger" onClick={() => { setShowFormRegistro(!showFormRegistro); setComprobante(null); }}>
              <i className="fas fa-plus-circle me-2"></i>
              {showFormRegistro ? 'Cancelar' : 'Solicitar Registro de Kid'}
            </button>
          </div>
        </div>

        {/* Formulario Registro */}
        {showFormRegistro && (
          <div className="card bg-secondary-dark border-danger mb-4 shadow">
            <div className="card-header bg-danger text-white">
              <h5 className="mb-0"><i className="fas fa-paper-plane me-2"></i>Solicitar Registro de Kid</h5>
            </div>
            <div className="card-body">
              <div className="alert alert-info small mb-3">
                <i className="fas fa-info-circle me-2"></i>
                Tu solicitud será enviada al administrador del box para su aprobación. Recibirás un comprobante con los datos del registro.
              </div>
              <form onSubmit={handleRegistrarKid}>
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label text-light">Nombre Completo *</label>
                    <input
                      type="text"
                      className="form-control bg-darker text-white border-danger"
                      value={formKid.nombreCompleto}
                      onChange={(e) => setFormKid({ ...formKid, nombreCompleto: e.target.value })}
                      placeholder="Nombre del menor"
                    />
                  </div>
                  <div className="col-md-3 mb-3">
                    <label className="form-label text-light">Fecha de Nacimiento *</label>
                    <RedGrayDatePicker
                      required
                      value={formKid.fechaNacimiento}
                      onChange={(value) => setFormKid({ ...formKid, fechaNacimiento: value })}
                      inputClassName="bg-darker text-white border-danger"
                    />
                  </div>
                  <div className="col-md-3 mb-3">
                    <label className="form-label text-light">Género</label>
                    <select
                      className="form-select bg-darker text-white border-danger"
                      value={formKid.genero}
                      onChange={(e) => setFormKid({ ...formKid, genero: e.target.value })}
                    >
                      <option value="">Seleccionar</option>
                      <option value="Masculino">Masculino</option>
                      <option value="Femenino">Femenino</option>
                    </select>
                  </div>
                </div>

                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label text-light">¿Tiene alguna discapacidad?</label>
                    <input
                      type="text"
                      className="form-control bg-darker text-white border-danger"
                      value={formKid.tieneDiscapacidad}
                      onChange={(e) => setFormKid({ ...formKid, tieneDiscapacidad: e.target.value })}
                      placeholder="Dejar vacío si no tiene"
                    />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label text-light">Foto del Kid</label>
                    <input
                      type="file"
                      className="form-control bg-darker text-white border-danger"
                      accept="image/*"
                      onChange={handleFileChange}
                    />
                  </div>
                </div>

                <div className="d-flex gap-2">
                  <button type="submit" className="btn btn-danger">
                    <i className="fas fa-paper-plane me-2"></i>Enviar Solicitud
                  </button>
                  <button type="button" className="btn btn-outline-light" onClick={() => setShowFormRegistro(false)}>
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Lista de Kids */}
        {kids.length === 0 && !showFormRegistro ? (
          <div className="alert alert-info text-center">
            <i className="fas fa-info-circle me-2"></i>
            No tienes kids registrados aún. ¡Registra a tu hijo para inscribirlo en clases Kids!
          </div>
        ) : (
          <div className="row g-4">
            {kids.map(kid => (
              <div key={kid.idKid} className="col-md-6 col-lg-4">
                <div className="card bg-secondary-dark border-danger shadow-sm h-100">
                  <div className="card-header bg-danger text-white d-flex justify-content-between align-items-center">
                    <h6 className="mb-0">
                      <i className="fas fa-child me-2"></i>
                      {kid.nombreCompleto}
                    </h6>
                    <span className="badge bg-light text-dark">{kid.edad} años</span>
                  </div>
                  <div className="card-body text-light">
                    {kid.foto && (
                      <div className="text-center mb-3">
                        <img src={kid.foto} alt={kid.nombreCompleto} className="rounded-circle" style={{ width: '80px', height: '80px', objectFit: 'cover' }} />
                      </div>
                    )}
                    <p className="mb-1">
                      <small className="text-muted"><i className="fas fa-venus-mars me-1"></i> Género:</small> {kid.genero || 'N/A'}
                    </p>
                    {kid.tieneDiscapacidad && (
                      <p className="mb-1">
                        <small className="text-muted"><i className="fas fa-wheelchair me-1"></i> Discapacidad:</small> {kid.tieneDiscapacidad}
                      </p>
                    )}
                    <p className="mb-1">
                      <small className="text-muted"><i className="fas fa-building me-1"></i> Box:</small> {kid.nombreBox}
                    </p>
                    <p className="mb-2">
                      <small className="text-muted"><i className="fas fa-calendar me-1"></i> Registrado:</small>{' '}
                      <small>{new Date(kid.fechaRegistro).toLocaleDateString()}</small>
                    </p>
                  </div>
                  <div className="card-footer bg-transparent border-danger">
                    <div className="d-flex flex-wrap gap-2">
                      <button
                        className="btn btn-sm btn-outline-info"
                        onClick={() => setShowInscribirClase(showInscribirClase === kid.idKid ? null : kid.idKid)}
                      >
                        <i className="fas fa-calendar-plus me-1"></i>Inscribir a Clase
                      </button>
                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => handleDesactivarKid(kid.idKid, kid.nombreCompleto)}
                      >
                        <i className="fas fa-trash me-1"></i>
                      </button>
                    </div>

                    {/* Inscribir a Clase */}
                    {showInscribirClase === kid.idKid && (
                      <div className="mt-3 p-3 border border-info rounded">
                        <h6 className="text-info mb-3">
                          <i className="fas fa-calendar-plus me-2"></i>Inscribir a Clase
                        </h6>
                        {clases.length === 0 ? (
                          <p className="text-muted small">No hay clases disponibles</p>
                        ) : (
                          <div className="list-group">
                            {clases.map(clase => (
                              <button
                                key={clase.idClase}
                                className="list-group-item list-group-item-action bg-darker text-white border-info mb-1 rounded"
                                onClick={() => handleInscribirKidAClase(kid.idKid, clase.idClase)}
                              >
                                <div className="d-flex justify-content-between align-items-center">
                                  <div>
                                    <strong>{clase.nombre}</strong>
                                    <br />
                                    <small className="text-muted">
                                      {clase.horarioInicio} - {clase.horarioFin} | {clase.diasRecurrentes}
                                    </small>
                                  </div>
                                  <i className="fas fa-arrow-right text-info"></i>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Sección de Solicitudes de Registro Pendientes */}
        {solicitudesKid.length > 0 && (
          <div className="mt-5">
            <h4 className="text-white mb-3">
              <i className="fas fa-clipboard-list text-danger me-2"></i>
              Mis Solicitudes de Registro
            </h4>
            <div className="table-responsive">
              <table className="table table-dark table-hover">
                <thead>
                  <tr className="border-danger">
                    <th>ID</th>
                    <th>Nombre del Kid</th>
                    <th>Edad</th>
                    <th>Género</th>
                    <th>Estado</th>
                    <th>Fecha Solicitud</th>
                    <th>Fecha Respuesta</th>
                  </tr>
                </thead>
                <tbody>
                  {solicitudesKid.map(sol => (
                    <tr key={sol.idSolicitudKid} className="border-danger">
                      <td className="text-light">#{sol.idSolicitudKid}</td>
                      <td className="text-light">{sol.nombreCompleto}</td>
                      <td className="text-light">{sol.edad} años</td>
                      <td className="text-light">{sol.genero || 'N/A'}</td>
                      <td>
                        <span className={`badge ${
                          sol.estado === 'Pendiente' ? 'bg-warning text-dark' :
                          sol.estado === 'Aprobada' ? 'bg-success' : 'bg-danger'
                        }`}>
                          {sol.estado}
                        </span>
                      </td>
                      <td className="text-muted small">{new Date(sol.fechaSolicitud).toLocaleDateString()}</td>
                      <td className="text-muted small">
                        {sol.fechaRespuesta ? new Date(sol.fechaRespuesta).toLocaleDateString() : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal Comprobante */}
        {comprobante && (
          <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}>
            <div className="modal-dialog modal-lg modal-dialog-centered">
              <div className="modal-content bg-dark text-white border-danger">
                <div className="modal-header bg-danger text-white">
                  <h5 className="modal-title">
                    <i className="fas fa-file-alt me-2"></i>Comprobante de Solicitud de Registro
                  </h5>
                  <button type="button" className="btn-close btn-close-white" onClick={() => setComprobante(null)}></button>
                </div>
                <div className="modal-body">
                  <div className="alert alert-info">
                    <i className="fas fa-info-circle me-2"></i>
                    Guarda este comprobante. Muéstralo al administrador del box si es necesario.
                  </div>

                  <div className="card bg-secondary-dark border-light mb-3">
                    <div className="card-header bg-danger text-white">
                      <strong>Datos de la Solicitud</strong>
                    </div>
                    <div className="card-body">
                      <div className="row">
                        <div className="col-md-6">
                          <p className="mb-1"><strong>ID Solicitud:</strong> #{comprobante.idSolicitud}</p>
                          <p className="mb-1"><strong>Estado:</strong> <span className="badge bg-warning text-dark">{comprobante.estado}</span></p>
                          <p className="mb-1"><strong>Fecha:</strong> {new Date(comprobante.fechaSolicitud).toLocaleString()}</p>
                          <p className="mb-1"><strong>Box:</strong> {comprobante.nombreBox}</p>
                        </div>
                        <div className="col-md-6">
                          <p className="mb-1"><strong>Tutor:</strong> {comprobante.tutor.nombre}</p>
                          <p className="mb-1"><strong>Correo:</strong> {comprobante.tutor.correo}</p>
                          <p className="mb-1"><strong>Teléfono:</strong> {comprobante.tutor.telefono || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="card bg-secondary-dark border-light">
                    <div className="card-header bg-dark text-white">
                      <strong>Datos del Kid</strong>
                    </div>
                    <div className="card-body">
                      <div className="row">
                        <div className="col-md-4 text-center">
                          {comprobante.kid.foto ? (
                            <img src={comprobante.kid.foto} alt={comprobante.kid.nombreCompleto} className="rounded-circle mb-2" style={{ width: '100px', height: '100px', objectFit: 'cover' }} />
                          ) : (
                            <div className="bg-darker rounded-circle d-flex align-items-center justify-content-center mx-auto mb-2" style={{ width: '100px', height: '100px' }}>
                              <i className="fas fa-child fa-3x text-danger"></i>
                            </div>
                          )}
                        </div>
                        <div className="col-md-8">
                          <p className="mb-1"><strong>Nombre:</strong> {comprobante.kid.nombreCompleto}</p>
                          <p className="mb-1"><strong>Fecha Nacimiento:</strong> {new Date(comprobante.kid.fechaNacimiento).toLocaleDateString()}</p>
                          <p className="mb-1"><strong>Edad:</strong> {comprobante.kid.edad} años</p>
                          <p className="mb-1"><strong>Género:</strong> {comprobante.kid.genero || 'N/A'}</p>
                          <p className="mb-1"><strong>Discapacidad:</strong> {comprobante.kid.tieneDiscapacidad || 'Ninguna'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="modal-footer border-danger">
                  <button className="btn btn-outline-light" onClick={() => {
                    window.print();
                  }}>
                    <i className="fas fa-print me-2"></i>Imprimir
                  </button>
                  <button className="btn btn-danger" onClick={() => setComprobante(null)}>Cerrar</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
