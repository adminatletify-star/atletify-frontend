import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BackButton from '../components/BackButton';
import BotonSeguro from '../components/BotonSeguro';
import '../assets/css/UserResenas.css';
import AtletifyLoader from '../components/AtletifyLoader';

const API_URL = import.meta.env.VITE_API_URL;

function StarDisplay({ score, total }) {
  const filled = Math.round(score);
  return (
    <div className="ur-rating-display">
      <div className="ur-rating-stars">
        {[1, 2, 3, 4, 5].map(n => (
          <i key={n} className={`fas fa-star${n <= filled ? ' filled' : ''}`} />
        ))}
      </div>
      <div className="ur-rating-meta">
        <span className="ur-rating-score">{score > 0 ? Number(score).toFixed(1) : '—'}</span>
        <span className="ur-rating-count">{total > 0 ? `${total} op.` : 'Sin reseñas'}</span>
      </div>
    </div>
  );
}

export default function UserResenas() {
  const navigate = useNavigate();
  const [coaches, setCoaches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [box, setBox] = useState(null);
  const [usuario, setUsuario] = useState(null);

  const [coachSeleccionado, setCoachSeleccionado] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [estrellas, setEstrellas] = useState(5);
  const [comentario, setComentario] = useState('');

  useEffect(() => {
    const b = JSON.parse(localStorage.getItem('box'));
    const u = JSON.parse(localStorage.getItem('usuario'));
    if (!u) { navigate('/'); return; }
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
          const dataEval = resEval.ok ? await resEval.json() : { promedio: 0, total: 0 };
          return { ...coach, especialidades: Array.isArray(dataEsp) ? dataEsp : [], evaluaciones: dataEval };
        } catch {
          return { ...coach, especialidades: [], evaluaciones: { promedio: 0, total: 0 } };
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
        cargarCoaches(box ? box.idBox : 1);
      } else {
        alert("Ocurrió un error al enviar tu reseña.");
      }
    } catch {
      alert("Error de conexión al enviar reseña.");
    }
  };

  return (
    <div className="ur-page">

      {/* HEADER */}
      <header className="ur-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <BackButton to="/user-panel" />
          <div>
            <h1 className="ur-header-title">Reseñas de <span>Coaches</span></h1>
            <p className="ur-header-sub">Conoce a tu staff y ayúdanos a mejorar</p>
          </div>
        </div>
      </header>

      {/* CONTENIDO */}
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 1rem' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
            <AtletifyLoader />
          </div>
        ) : coaches.length === 0 ? (
          <div className="ur-empty">
            <i className="fas fa-users-slash" />
            <p>Aún no hay coaches registrados en este Box.</p>
          </div>
        ) : (
          <>
            <p className="ur-section-title">
              <i className="fas fa-user-tie" />
              Staff — {coaches.length} coach{coaches.length !== 1 ? 'es' : ''}
            </p>

            <div className="ur-grid">
              {coaches.map(coach => {
                const inicial = (coach.nombre || '?').charAt(0).toUpperCase();
                const espMax = coach.especialidades?.slice(0, 3) || [];
                const espExtra = (coach.especialidades?.length || 0) - 3;

                return (
                  <div key={coach.idUsuario || coach.id} className="ur-card">

                    {/* Avatar + nombre */}
                    <div className="ur-card-top">
                      <div className="ur-avatar">
                        <span className="ur-avatar-initial">{inicial}</span>
                      </div>
                      <div className="ur-coach-info">
                        <h3 className="ur-coach-name">{coach.nombre}</h3>
                        <span className="ur-coach-role">Coach</span>
                      </div>
                    </div>

                    {/* Calificación */}
                    <StarDisplay
                      score={coach.evaluaciones?.promedio || 0}
                      total={coach.evaluaciones?.total || 0}
                    />

                    {/* Especialidades */}
                    <div className="ur-esp-list">
                      {espMax.length > 0 ? (
                        espMax.map(esp => (
                          <span key={esp.idEspecialidad} className="ur-esp-pill">{esp.nombre}</span>
                        ))
                      ) : (
                        <span className="ur-esp-pill" style={{ opacity: 0.5 }}>General</span>
                      )}
                      {espExtra > 0 && (
                        <span className="ur-esp-pill ur-esp-pill--more">+{espExtra}</span>
                      )}
                    </div>

                    <button className="ur-evaluar-btn" onClick={() => abrirModal(coach)}>
                      <i className="fas fa-comment-dots" /> Dejar Reseña
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* MODAL */}
      {modalVisible && coachSeleccionado && (
        <div className="ur-modal-overlay" onClick={cerrarModal}>
          <div className="ur-modal" onClick={e => e.stopPropagation()}>

            <div className="ur-modal-header">
              <div className="ur-modal-avatar">
                {(coachSeleccionado.nombre || '?').charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p className="ur-modal-title">{coachSeleccionado.nombre}</p>
                <p className="ur-modal-sub">Coach</p>
              </div>
              <button className="ur-modal-close" onClick={cerrarModal}>
                <i className="fas fa-times" />
              </button>
            </div>

            <div className="ur-modal-body">
              <p className="ur-modal-question">
                ¿Qué tal tu experiencia entrenando con {coachSeleccionado.nombre.split(' ')[0]}?
              </p>

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
                    <label htmlFor={`star${num}`} className="ur-star-label" title={`${num} estrellas`}>★</label>
                  </React.Fragment>
                ))}
              </div>

              <label className="ur-textarea-label">Comentario (opcional)</label>
              <textarea
                className="ur-textarea"
                placeholder="Escribe tu opinión o sugerencia aquí..."
                value={comentario}
                onChange={e => setComentario(e.target.value)}
              />

              <div className="ur-modal-actions">
                <button className="ur-btn-cancel" onClick={cerrarModal} title="Cancelar">
                  <i className="fas fa-times" />
                </button>
                <BotonSeguro
                  className="ur-submit-btn"
                  onClick={enviarResena}
                  textoProcesando="Enviando..."
                  disabled={estrellas === 0}
                >
                  <i className="fas fa-paper-plane" /> Enviar Reseña
                </BotonSeguro>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
