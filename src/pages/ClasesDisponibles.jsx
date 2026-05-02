import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import '../assets/css/global.css';
import BackButton from '../components/BackButton';

export default function ClasesDisponibles() {
  const { usuario, loading: authLoading } = useAuth();
  const [clases, setClases] = useState([]);
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState([]);
  const [expandedClaseId, setExpandedClaseId] = useState(null);

  useEffect(() => {
    if (usuario) {
      cargarDatos();
    }
  }, [usuario]);

  

  const cargarDatos = async () => {
    try {
      setLoading(true);
      
      // Obtener clases del box
      if (usuario?.idBoxPredeterminado) {
        const clasesData = await api.obtenerClasesDelBox(usuario.idBoxPredeterminado);
        setClases(Array.isArray(clasesData) ? clasesData.filter(c => !c.esClaseKids) : []);
      }

      // Obtener mis solicitudes
      if (usuario?.idUsuario) {
        const solicitudesData = await api.obtenerSolicitudesDelUsuario(usuario.idUsuario);
        if (solicitudesData?.solicitudes) {
          setSolicitudes(solicitudesData.solicitudes);
        }
      }
    } catch (error) {
      showAlert('Error al cargar clases', 'danger');
      console.error(error);
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

  const handleSolicitarInscripcion = async (idClase) => {
    try {
      const resultado = await api.solicitarInscripcionClase(usuario.idUsuario, idClase);
      if (resultado.idSolicitud) {
        showAlert('¡Solicitud enviada! Espera la aprobación del AdminBox', 'success');
        // Actualizar el estado local
        setSolicitudes(prev => [...prev, {
          idSolicitud: resultado.idSolicitud,
          idClase: idClase,
          estado: 'Pendiente',
          fechaSolicitud: new Date()
        }]);
      } else {
        showAlert(resultado.mensaje || 'Error al enviar solicitud', 'danger');
      }
    } catch (error) {
      showAlert(error.message || 'Error al enviar solicitud', 'danger');
    }
  };

  const getEstadoSolicitud = (idClase) => {
    const solicitud = solicitudes.find(s => s.idClase === idClase);
    return solicitud ? solicitud.estado : null;
  };

  const getDiasDeSemana = (diasString) => {
    if (!diasString) return 'Todos los días';
    return diasString.split(',').join(', ');
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

      {/* Alerts */}
      <div className="position-fixed top-0 end-0 p-3" style={{ zIndex: 9999 }}>
        {alerts.map(alert => (
          <div key={alert.id} className={`alert alert-${alert.tipo} alert-dismissible fade show`} role="alert">
            {alert.mensaje}
          </div>
        ))}
      </div>

      {/* Contenido Principal */}
      <div className="container py-5">
        
        <div className="row mb-4">
          <div className="col-12">
            <div className="d-flex align-items-center gap-3 mb-2">
              <BackButton />
              <h2 className="text-white mb-0">
                <i className="fas fa-calendar-alt text-danger me-2"></i>
                Clases Disponibles
              </h2>
            </div>
            <p className="text-muted">Selecciona una clase y solicita tu inscripción</p>
          </div>
        </div>

        {clases.length === 0 ? (
          <div className="alert alert-info">
            <i className="fas fa-info-circle me-2"></i>
            No hay clases disponibles en tu box
          </div>
        ) : (
          <div className="row g-3">
            {clases.map(clase => {
              const estadoSolicitud = getEstadoSolicitud(clase.idClase);
              const puedeInscribirse = !estadoSolicitud && (clase.inscritosCantidad < (clase.maximoAtletas || 999));

              return (
                <div key={clase.idClase} className="col-md-6 col-lg-4">
                  <div className="card bg-secondary-dark border-danger shadow-sm h-100">
                    <div className="card-header bg-danger text-white py-3">
                      <h5 className="mb-0">
                        <i className="fas fa-dumbbell me-2"></i>
                        {clase.nombre}
                      </h5>
                    </div>

                    <div className="card-body text-light">
                      {/* Horario */}
                      <div className="mb-3">
                        <small className="text-muted d-block">
                          <i className="fas fa-clock text-danger me-2"></i>
                          Horario
                        </small>
                        <p className="mb-0 ps-4">
                          {clase.horarioInicio} - {clase.horarioFin}
                        </p>
                      </div>

                      {/* Días */}
                      <div className="mb-3">
                        <small className="text-muted d-block">
                          <i className="fas fa-calendar text-danger me-2"></i>
                          Días
                        </small>
                        <p className="mb-0 ps-4">
                          {getDiasDeSemana(clase.diasRecurrentes)}
                        </p>
                      </div>

                      {/* Descripción */}
                      {clase.descripcion && (
                        <div className="mb-3">
                          <small className="text-muted d-block">
                            <i className="fas fa-align-left text-danger me-2"></i>
                            Descripción
                          </small>
                          <p className="mb-0 ps-4 small text-light">
                            {clase.descripcion}
                          </p>
                        </div>
                      )}

                      {/* Inscritos */}
                      <div className="mb-3">
                        <small className="text-muted d-block">
                          <i className="fas fa-users text-danger me-2"></i>
                          Inscritos
                        </small>
                        <p className="mb-0 ps-4">
                          {clase.inscritosCantidad} {clase.maximoAtletas && `/ ${clase.maximoAtletas}`}
                        </p>
                      </div>

                      {/* Estado de Solicitud */}
                      {estadoSolicitud && (
                        <div className="mb-3">
                          <small className="text-muted d-block">
                            <i className="fas fa-check-circle text-danger me-2"></i>
                            Estado
                          </small>
                          <p className="mb-0 ps-4">
                            <span className={`badge bg-${
                              estadoSolicitud === 'Aprobada' ? 'success' :
                              estadoSolicitud === 'Rechazada' ? 'danger' :
                              'warning'
                            }`}>
                              {estadoSolicitud}
                            </span>
                            {/* motivo eliminado */}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="card-footer bg-transparent border-danger pt-3">
                      {estadoSolicitud === 'Aprobada' ? (
                        <button className="btn btn-success w-100 disabled">
                          <i className="fas fa-check me-2"></i>
                          Inscrito
                        </button>
                      ) : estadoSolicitud === 'Pendiente' ? (
                        <button className="btn btn-warning w-100 disabled">
                          <i className="fas fa-hourglass-half me-2"></i>
                          Solicitud Pendiente
                        </button>
                      ) : estadoSolicitud === 'Rechazada' ? (
                        <button
                          className="btn btn-danger w-100"
                          onClick={() => handleSolicitarInscripcion(clase.idClase)}
                        >
                          <i className="fas fa-redo me-2"></i>
                          Intentar de Nuevo
                        </button>
                      ) : puedeInscribirse ? (
                        <button
                          className="btn btn-danger w-100"
                          onClick={() => handleSolicitarInscripcion(clase.idClase)}
                        >
                          <i className="fas fa-sign-in-alt me-2"></i>
                          Solicitar Inscripción
                        </button>
                      ) : (
                        <button className="btn btn-secondary w-100 disabled">
                          <i className="fas fa-ban me-2"></i>
                          Clase Llena
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
