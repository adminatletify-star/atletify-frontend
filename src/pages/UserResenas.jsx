import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BackButton from '../components/BackButton';
import BotonSeguro from '../components/BotonSeguro';
import '../assets/css/UserResenas.css';
import AtletifyLoader from '../components/AtletifyLoader';

const API_URL = import.meta.env.VITE_API_URL;

// El backend guarda la fecha en UTC; si no trae zona horaria, la tratamos como UTC.
function fechaResena(iso) {
  if (!iso) return '';
  let s = String(iso);
  if (!/[zZ]$|[+-]\d{2}:?\d{2}$/.test(s)) s += 'Z';
  const d = new Date(s);
  if (isNaN(d.getTime())) return '';
  const seg = Math.max(0, (Date.now() - d.getTime()) / 1000);
  if (seg < 60) return 'hace un momento';
  if (seg < 3600) return `hace ${Math.floor(seg / 60)} min`;
  if (seg < 86400) return `hace ${Math.floor(seg / 3600)} h`;
  if (seg < 604800) return `hace ${Math.floor(seg / 86400)} d`;
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Estrellas fijas (1–5) rellenas hasta `valor` — para mostrar la valoración de cada reseña.
function StarRow({ valor }) {
  return (
    <div className="ur-resena-stars">
      {[1, 2, 3, 4, 5].map(n => (
        <i key={n} className={`fas fa-star${n <= valor ? ' filled' : ''}`} />
      ))}
    </div>
  );
}

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

  // Modal de "ver reseñas": guardamos el ID y derivamos el coach desde `coaches`,
  // así las actualizaciones optimistas se reflejan en vivo en la lista abierta.
  const [resenasCoachId, setResenasCoachId] = useState(null);
  const idDe = (c) => c && (c.idUsuario || c.id || c.IdUsuario);
  const coachResenas = resenasCoachId != null ? coaches.find(c => idDe(c) === resenasCoachId) : null;

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

  const abrirResenas = (coach) => setResenasCoachId(idDe(coach));
  const cerrarResenas = () => setResenasCoachId(null);

  // Recalcula el promedio/total de un coach y le antepone la nueva reseña (UI optimista).
  const aplicarResenaLocal = (idCoach, resena) => {
    setCoaches(prev => prev.map(c => {
      if (idDe(c) !== idCoach) return c;
      const ev = c.evaluaciones || { promedio: 0, total: 0, resenas: [] };
      const total = ev.total || 0;
      const nuevoTotal = total + 1;
      const nuevoPromedio = Math.round((((ev.promedio || 0) * total + resena.estrellas) / nuevoTotal) * 10) / 10;
      return { ...c, evaluaciones: { ...ev, promedio: nuevoPromedio, total: nuevoTotal, resenas: [resena, ...(ev.resenas || [])] } };
    }));
  };

  // Envía la reseña con UI optimista: se pinta al instante, se reconcilia SOLO ese coach
  // en segundo plano y se revierte si falla. NO recarga toda la interfaz.
  const enviarResena = async () => {
    const coach = coachSeleccionado;
    if (!coach) return;
    const idCoach = idDe(coach);
    const idAtleta = usuario.idUsuario || usuario.id || usuario.IdUsuario;
    const estrellasEnviadas = estrellas;
    const comentarioEnviado = comentario.trim();

    const resenaOptimista = {
      idEvaluacion: `tmp-${Date.now()}`,
      estrellas: estrellasEnviadas,
      comentario: comentarioEnviado,
      fechaEvaluacion: new Date().toISOString(),
      nombreAtleta: usuario.nombre || 'Tú',
      fotoAtleta: usuario.foto || null,
      _pendiente: true
    };

    const snapshot = coaches;          // para revertir si falla
    aplicarResenaLocal(idCoach, resenaOptimista);
    cerrarModal();                     // cierre instantáneo, sin loader global

    try {
      const res = await fetch(`${API_URL}/evaluaciones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ IdCoach: idCoach, IdAtleta: idAtleta, Estrellas: estrellasEnviadas, Comentario: comentarioEnviado })
      });
      if (!res.ok) throw new Error('post-failed');

      // Reconciliación: re-fetch SOLO este coach para traer ids/datos reales.
      const r = await fetch(`${API_URL}/evaluaciones/coach/${idCoach}`);
      if (r.ok) {
        const data = await r.json();
        setCoaches(prev => prev.map(c => (idDe(c) === idCoach ? { ...c, evaluaciones: data } : c)));
      }
    } catch {
      setCoaches(snapshot);            // revertir el cambio optimista
      alert('No se pudo enviar tu reseña. Inténtalo de nuevo.');
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

                    <div className="ur-card-actions">
                      {(coach.evaluaciones?.total || 0) > 0 && (
                        <button className="ur-ver-btn" onClick={() => abrirResenas(coach)}>
                          <i className="fas fa-star" /> Ver {coach.evaluaciones.total} reseña{coach.evaluaciones.total !== 1 ? 's' : ''}
                        </button>
                      )}
                      <button className="ur-evaluar-btn" onClick={() => abrirModal(coach)}>
                        <i className="fas fa-comment-dots" /> Dejar Reseña
                      </button>
                    </div>
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

      {/* MODAL — VER RESEÑAS */}
      {coachResenas && (
        <div className="ur-modal-overlay" onClick={cerrarResenas}>
          <div className="ur-modal ur-modal--resenas" onClick={e => e.stopPropagation()}>

            <div className="ur-modal-header">
              <div className="ur-modal-avatar">
                {(coachResenas.nombre || '?').charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p className="ur-modal-title">{coachResenas.nombre}</p>
                <p className="ur-modal-sub">
                  {(coachResenas.evaluaciones?.total || 0)} reseña{(coachResenas.evaluaciones?.total || 0) !== 1 ? 's' : ''}
                  {(coachResenas.evaluaciones?.promedio || 0) > 0 && <> · {Number(coachResenas.evaluaciones.promedio).toFixed(1)} ★</>}
                </p>
              </div>
              <button className="ur-modal-close" onClick={cerrarResenas}>
                <i className="fas fa-times" />
              </button>
            </div>

            <div className="ur-modal-body ur-resenas-body">
              {(coachResenas.evaluaciones?.resenas || []).length === 0 ? (
                <div className="ur-resenas-empty">
                  <i className="fas fa-comment-slash" />
                  <p>Este coach aún no tiene reseñas.</p>
                </div>
              ) : (
                (coachResenas.evaluaciones.resenas).map(r => (
                  <div key={r.idEvaluacion} className={`ur-resena-item${r._pendiente ? ' ur-resena-item--pendiente' : ''}`}>
                    <div className="ur-resena-top">
                      <div className="ur-resena-avatar">
                        {r.fotoAtleta
                          ? <img src={r.fotoAtleta} alt={r.nombreAtleta} />
                          : <span>{(r.nombreAtleta || '?').charAt(0).toUpperCase()}</span>}
                      </div>
                      <div className="ur-resena-meta">
                        <span className="ur-resena-autor">{r.nombreAtleta || 'Atleta'}</span>
                        <span className="ur-resena-fecha">
                          {r._pendiente ? 'Enviando…' : fechaResena(r.fechaEvaluacion)}
                        </span>
                      </div>
                      <StarRow valor={r.estrellas} />
                    </div>
                    {r.comentario
                      ? <p className="ur-resena-comentario">{r.comentario}</p>
                      : <p className="ur-resena-comentario ur-resena-comentario--vacio">Sin comentario.</p>}
                  </div>
                ))
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
