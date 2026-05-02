import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import RedGrayDatePicker from '../components/RedGrayDatePicker';
import BackButton from '../components/BackButton';

export default function MisClases() {
  const navigate = useNavigate();
  const [clases, setClases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  // Por defecto, carga la fecha de HOY
  const [fechaSeleccionada, setFechaSeleccionada] = useState(new Date().toISOString().split('T')[0]);

  const API_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem('usuario'));

    // EL CHISMEADOR: Esto imprimirá en tu consola (F12) exactamente qué datos tiene el usuario
    console.log("DATOS DEL USUARIO EN MEMORIA:", u);

    if (!u || u.rol !== 'Atleta') {
      navigate('/login');
      return;
    }

    setUser(u);

    // TRIPLE SEGURO ANTI-UNDEFINED: Buscamos el ID sin importar si está en mayúscula, minúscula o recortado
    const userId = u.idUsuario || u.IdUsuario || u.id;

    if (!userId) {
      console.error("¡ALERTA ROJA! El usuario no tiene ID asignado.");
      return;
    }

    if (!u.idBoxPredeterminado || u.idBoxPredeterminado === 0) {
      setLoading(false);
      return;
    }

    cargarClasesDelDia(u.idBoxPredeterminado, userId, fechaSeleccionada);
  }, [navigate, fechaSeleccionada]);
  // Le ponemos este seguro: que tome el idUsuario, y si no existe, que tome el id normal


  async function cargarClasesDelDia(idBox, idUsuario, fecha) {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/asistencias/box/${idBox}/fecha/${fecha}?idUsuario=${idUsuario}`);
      if (res.ok) {
        const data = await res.json();
        setClases(data);
      }
    } catch (err) {
      console.error("Error cargando clases del día:", err);
    } finally {
      setLoading(false);
    }
  }

  async function toggleReserva(idClase) {
    try {
      const res = await fetch(`${API_URL}/asistencias/reservar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idClase: idClase,
          idUsuario: user.idUsuario || user.IdUsuario || user.id, // <--- Triple seguro aquí también
          fecha: fechaSeleccionada
        })
      });

      const data = await res.json();
      if (res.ok) {
        // Recargamos la lista para que se actualice el número de cupos
        cargarClasesDelDia(user.idBoxPredeterminado, user.id, fechaSeleccionada);
      } else {
        alert(data.mensaje); // "La clase está llena"
      }
    } catch (err) {
      alert("Error al procesar la reserva");
    }
  }

  // ESTILOS CUPERTINO
  const glassCard = {
    background: 'rgba(30, 30, 30, 0.6)',
    backdropFilter: 'blur(15px)',
    borderRadius: '24px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.3)'
  };

  return (
    <div className="bg-dark text-white min-vh-100 pb-5" style={{ background: 'linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 100%)' }}>

      <nav className="navbar navbar-dark sticky-top px-4 py-3 mb-4" style={{ background: 'rgba(15, 15, 15, 0.8)', backdropFilter: 'blur(20px)' }}>
        <div className="d-flex align-items-center">
          <BackButton />
          <button onClick={() => navigate('/user-panel')} className="btn btn-link text-white p-0 me-3 d-none d-md-inline-block">
            <i className="fas fa-arrow-left fs-5"></i>
          </button>
          <h4 className="mb-0 fw-bold">Mis <span className="text-danger">Clases</span></h4>
        </div>
      </nav>

      <div className="container" style={{ maxWidth: '800px' }}>

        {/* SELECTOR DE FECHA */}
        <div className="card border-0 p-3 mb-4" style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '16px' }}>
          <div className="d-flex align-items-center justify-content-between">
            <h6 className="mb-0 text-secondary fw-bold"><i className="far fa-calendar-alt me-2"></i>Selecciona un día:</h6>
            <RedGrayDatePicker
              className="w-auto"
              value={fechaSeleccionada}
              onChange={setFechaSeleccionada}
              inputClassName="bg-dark border-secondary text-white shadow-none"
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-5"><div className="spinner-border text-danger"></div></div>
        ) : clases.length === 0 ? (
          <div className="text-center py-5">
            <i className="fas fa-bed text-secondary mb-3" style={{ fontSize: '4rem' }}></i>
            <h5 className="fw-bold text-secondary">No hay clases programadas para este día</h5>
            <p className="text-muted">¡Toca descansar o hacer Open Box libre!</p>
          </div>
        ) : (
          <div className="d-grid gap-3">
            {clases.map(clase => {
              const estaLleno = clase.inscritos >= clase.maximoAtletas;
              const porcentajeLleno = (clase.inscritos / clase.maximoAtletas) * 100;

              return (
                <div key={clase.idClase} className="card text-white border-0 p-4" style={{ ...glassCard, borderLeft: clase.usuarioInscrito ? '5px solid #198754' : '1px solid rgba(255,255,255,0.1)' }}>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <h5 className="fw-bold mb-0">{clase.nombre}</h5>
                    <span className="badge bg-dark text-white border border-secondary px-3 py-2 fs-6">
                      <i className="far fa-clock text-danger me-2"></i>
                      {clase.horarioInicio} - {clase.horarioFin}
                    </span>
                  </div>

                  <div className="text-secondary small mb-3">
                    <i className="fas fa-user-ninja me-2"></i>Coach: {clase.coach}
                  </div>

                  {/* BARRA DE CUPOS */}
                  <div className="mb-4">
                    <div className="d-flex justify-content-between small mb-1">
                      <span className="text-secondary">Cupos ocupados</span>
                      <span className={estaLleno ? 'text-danger fw-bold' : 'text-white'}>
                        {clase.inscritos} / {clase.maximoAtletas}
                      </span>
                    </div>
                    <div className="progress" style={{ height: '8px', background: 'rgba(255,255,255,0.1)' }}>
                      <div className={`progress-bar ${estaLleno ? 'bg-danger' : 'bg-primary'}`}
                        style={{ width: `${porcentajeLleno}%` }}></div>
                    </div>
                  </div>

                  {/* BOTÓN DE ACCIÓN */}
                  {clase.usuarioInscrito ? (
                    <button onClick={() => toggleReserva(clase.idClase)} className="btn btn-outline-danger w-100 py-2 fw-bold" style={{ borderRadius: '12px' }}>
                      <i className="fas fa-times me-2"></i>Cancelar mi reserva
                    </button>
                  ) : estaLleno ? (
                    <button className="btn btn-secondary w-100 py-2 fw-bold" disabled style={{ borderRadius: '12px' }}>
                      <i className="fas fa-lock me-2"></i>Clase Llena
                    </button>
                  ) : (
                    <button onClick={() => toggleReserva(clase.idClase)} className="btn btn-danger w-100 py-2 fw-bold" style={{ borderRadius: '12px' }}>
                      <i className="fas fa-check-circle me-2"></i>Asistir a esta clase
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}