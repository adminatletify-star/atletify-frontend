import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BackButton from '../components/BackButton';
import BotonSeguro from '../components/BotonSeguro';
import '../assets/css/UserResenas.css';

const API_URL = import.meta.env.VITE_API_URL;

export default function UserResenas() {
  const navigate = useNavigate();
  const [coaches, setCoaches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [box, setBox] = useState(null);
  const [usuario, setUsuario] = useState(null);

  // Modal states
  const [coachSeleccionado, setCoachSeleccionado] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [estrellas, setEstrellas] = useState(5);
  const [comentario, setComentario] = useState('');

  useEffect(() => {
    const b = JSON.parse(localStorage.getItem('box'));
    const u = JSON.parse(localStorage.getItem('usuario'));

    if (!u) {
      navigate('/');
      return;
    }

    setBox(b);
    setUsuario(u);
    cargarCoaches(b ? b.idBox : 1);
  }, [navigate]);

  async function cargarCoaches(idBox) {
    setLoading(true);
    try {
      const resUsu = await fetch(`${API_URL}/usuarios`);
      const dataUsu = await resUsu.json();
      const usuariosLista = Array.isArray(dataUsu) ? dataUsu : (dataUsu.data || []);

      const soloCoaches = usuariosLista.filter(u =>
        (u.idBoxPredeterminado === parseInt(idBox) || u.IdBoxPredeterminado === parseInt(idBox)) &&
        u.rol === 'Coach'
      );

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
          return { ...coach, especialidades: [], evaluaciones: { promedio: 0, total: 0, resenas: [] } };
        }
      }));

      setCoaches(coachesArmados);
    } catch (err) {
      console.error("Error cargando coaches:", err);
    } finally {
      setLoading(false);
    }
  }

  const abrirModal = (coach) => {
    setCoachSeleccionado(coach);
    setEstrellas(5);
    setComentario('');
    setModalVisible(true);
  };

  const cerrarModal = () => {
    setModalVisible(false);
    setTimeout(() => setCoachSeleccionado(null), 300);
  };

  const enviarResena = async () => {
    try {
      const payload = {
        IdCoach: coachSeleccionado.idUsuario || coachSeleccionado.id || coachSeleccionado.IdUsuario,
        IdAtleta: usuario.idUsuario || usuario.id || usuario.IdUsuario,
        Estrellas: estrellas,
        Comentario: comentario
      };

      const res = await fetch(`${API_URL}/evaluaciones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        alert("¡Gracias por tu retroalimentación! ⭐");
        cerrarModal();
        cargarCoaches(box ? box.idBox : 1); // Recargar para actualizar el promedio
      } else {
        alert("Ocurrió un error al enviar tu reseña.");
      }
    } catch (error) {
      alert("Error de conexión al enviar reseña.");
    }
  };

  return (
    <div className="ur-container">
      {/* HEADER */}
      <header className="ur-header">
        <div className="container position-relative">
          <div className="position-absolute" style={{ left: 0, top: '50%', transform: 'translateY(-50%)' }}>
            <BackButton to="/user-panel" />
          </div>
          <h1 className="ur-header-title">Reseñas de <span>Coaches</span></h1>
          <p className="ur-header-subtitle">Conoce a tu staff y ayúdanos a mejorar dándoles feedback</p>
        </div>
      </header>

      {/* BODY */}
      <div className="container-xl">
        {loading ? (
          <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '50vh' }}>
            <div className="spinner-wp"></div>
          </div>
        ) : coaches.length === 0 ? (
          <div className="ur-empty">
            <i className="fas fa-users-slash"></i>
            <p>Aún no hay coaches registrados en este Box.</p>
          </div>
        ) : (
          <div className="ur-grid">
            {coaches.map(coach => (
              <div key={coach.idUsuario || coach.id} className="ur-card">

                <div className="ur-avatar-container">
                  <span className="ur-avatar-initial">
                    {coach.nombre.charAt(0).toUpperCase()}
                  </span>
                </div>

                <h3 className="ur-coach-name">{coach.nombre}</h3>
                <span className="ur-coach-role">Coach</span>

                <div className="ur-rating-display">
                  <i className="fas fa-star"></i>
                  <span className="ur-rating-score">{coach.evaluaciones?.promedio || 0}</span>
                  <span className="ur-rating-count">({coach.evaluaciones?.total || 0} opiniones)</span>
                </div>

                <div className="ur-esp-list">
                  {coach.especialidades && coach.especialidades.length > 0 ? (
                    coach.especialidades.slice(0, 3).map(esp => (
                      <span key={esp.idEspecialidad} className="ur-esp-pill">
                        {esp.nombre}
                      </span>
                    ))
                  ) : (
                    <span className="ur-esp-pill" style={{ opacity: 0.5 }}>General</span>
                  )}
                  {coach.especialidades?.length > 3 && (
                    <span className="ur-esp-pill">+{coach.especialidades.length - 3}</span>
                  )}
                </div>

                <button className="ur-evaluar-btn" onClick={() => abrirModal(coach)}>
                  <i className="fas fa-comment-dots"></i> Dejar Reseña
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL */}
      {modalVisible && coachSeleccionado && (
        <div className="ur-modal-overlay" onClick={cerrarModal}>
          <div className="ur-modal" onClick={e => e.stopPropagation()}>
            <div className="ur-modal-header">
              <h3 className="ur-modal-title">Evaluar a {coachSeleccionado.nombre.split(' ')[0]}</h3>
              <button className="ur-modal-close" onClick={cerrarModal}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="ur-modal-body">
              <div className="text-center mb-3 text-muted">
                ¿Qué tal tu experiencia entrenando con {coachSeleccionado.nombre.split(' ')[0]}?
              </div>

              {/* Estrellas (1 a 5) invertidas para el selector CSS */}
              <div className="ur-stars-input">
                {[5, 4, 3, 2, 1].map(num => (
                  <React.Fragment key={num}>
                    <input
                      type="radio"
                      id={`star${num}`}
                      name="rating"
                      value={num}
                      className="ur-star-radio"
                      checked={estrellas === num}
                      onChange={() => setEstrellas(num)}
                    />
                    <label htmlFor={`star${num}`} className="ur-star-label" title={`${num} estrellas`}>
                      ★
                    </label>
                  </React.Fragment>
                ))}
              </div>

              <textarea
                className="ur-textarea"
                placeholder="Escribe tu opinión o sugerencia aquí... (Opcional)"
                value={comentario}
                onChange={e => setComentario(e.target.value)}
              ></textarea>

              <BotonSeguro
                className="ur-submit-btn"
                onClick={enviarResena}
                textoProcesando="Enviando..."
                disabled={estrellas === 0}
              >
                Enviar Reseña
              </BotonSeguro>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
