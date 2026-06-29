import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import AtletifyLoader from './AtletifyLoader';
import ModalComentariosWod from './ModalComentariosWod';
import '../assets/css/WodDelDiaPanel.css';

const API_BASE = import.meta.env.VITE_API_URL;

const SOCIAL_VACIO = { likes: 0, dislikes: 0, miReaccion: null, totalComentarios: 0 };

const fechaHoyLocal = () => {
  const h = new Date();
  return `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, '0')}-${String(h.getDate()).padStart(2, '0')}`;
};

// Colores de acento que rotan por WOD (igual criterio que el panel del atleta).
const WOD_COLORS = ['var(--primary)', 'var(--accent-cool)', 'var(--accent)'];

// Una línea de movimiento (reps · nombre · peso).
function FilaEj({ ej }) {
  return (
    <li className="wdd-ej-item">
      {ej.esquemaRepeticiones && <span className="wdd-ej-reps">{ej.esquemaRepeticiones}</span>}
      <span className="wdd-ej-name">{ej.ejercicio?.nombre}</span>
      {ej.pesoSugerido && <span className="wdd-ej-peso">{ej.pesoSugerido}</span>}
    </li>
  );
}

// Agrupa los ejercicios del bloque mostrando los complex (mismo grupoComplex) como una unidad.
function ListaEjercicios({ ejercicios }) {
  if (!ejercicios?.length) return null;
  const items = [];
  let i = 0;
  while (i < ejercicios.length) {
    const ej = ejercicios[i];
    if (ej.grupoComplex == null) {
      items.push(<FilaEj key={i} ej={ej} />);
      i++;
    } else {
      const grupo = ej.grupoComplex;
      const miembros = [];
      while (i < ejercicios.length && ejercicios[i].grupoComplex === grupo) { miembros.push(ejercicios[i]); i++; }
      const nombre = miembros[0].nombreComplex;
      const esquema = miembros[0].esquemaComplex;
      items.push(
        <li key={`cx-${grupo}`} className="wdd-complex">
          <div className="wdd-complex-title">
            <i className="fas fa-layer-group"></i>
            {nombre ? <strong>{nombre}</strong> : <strong>Complex</strong>}
            {esquema && <span className="wdd-complex-esquema">{esquema}</span>}
          </div>
          <ul className="wdd-ej-list wdd-complex-list">
            {miembros.map((m, k) => <FilaEj key={k} ej={m} />)}
          </ul>
        </li>
      );
    }
  }
  return <ul className="wdd-ej-list">{items}</ul>;
}

// Tarjeta "WOD de hoy" para el panel de coach/admin.
// El staff NO pertenece a una clase, así que ve TODOS los WODs publicados del día y
// puede switchear entre ellos, comentar/reaccionar (son comunidad) y adaptar uno ajeno
// clonándolo. Es autocontenida: trae sus propios datos y no depende de UserPanel.
export default function WodDelDiaPanel({ box }) {
  const navigate = useNavigate();
  const [wods, setWods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [idSel, setIdSel] = useState(null);
  const [social, setSocial] = useState({}); // { [idEntrenamiento]: {likes, dislikes, miReaccion, totalComentarios} }
  const [comentariosWod, setComentariosWod] = useState(null);
  const [personales, setPersonales] = useState([]); // rutinas personalizadas del día (sección aparte)

  const idBox = box?.idBox;

  const cargar = useCallback(async () => {
    if (!idBox) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/entrenamientos/box/${idBox}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const all = await res.json();
        const hoy = fechaHoyLocal();
        const publicadosHoy = all.filter(w => (w.fechaProgramada || '').includes(hoy) && w.estaPublicado);
        // Los WODs personales NO van al feed de clases: se muestran en su sección aparte.
        const delDia = publicadosHoy.filter(w => !w.esPersonal);
        setPersonales(publicadosHoy.filter(w => w.esPersonal));
        setWods(delDia);
        setIdSel(prev => delDia.some(w => w.idEntrenamiento === prev)
          ? prev
          : (delDia[0]?.idEntrenamiento ?? null));

        const pares = await Promise.all(delDia.map(async w => {
          try { return [w.idEntrenamiento, await api.obtenerContadoresWod(w.idEntrenamiento)]; }
          catch { return [w.idEntrenamiento, SOCIAL_VACIO]; }
        }));
        setSocial(Object.fromEntries(pares));
      }
    } catch (e) {
      console.error('Error cargando WODs del día', e);
    } finally {
      setLoading(false);
    }
  }, [idBox]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- cargar es un fetch de datos; el setState ocurre dentro del callback async
  useEffect(() => { cargar(); }, [cargar]);

  const wodSel = useMemo(
    () => wods.find(w => w.idEntrenamiento === idSel) || wods[0] || null,
    [wods, idSel]
  );

  const reaccionar = async (idEnt, tipo) => {
    try {
      const c = await api.reaccionarWod(idEnt, tipo);
      setSocial(s => ({
        ...s,
        [idEnt]: {
          likes: c.likes ?? 0,
          dislikes: c.dislikes ?? 0,
          miReaccion: c.miReaccion ?? null,
          totalComentarios: c.totalComentarios ?? (s[idEnt]?.totalComentarios ?? 0)
        }
      }));
    } catch (e) {
      alert(e.message || 'No se pudo reaccionar.');
    }
  };

  const s = (wodSel && social[wodSel.idEntrenamiento]) || SOCIAL_VACIO;

  const idxSel = useMemo(
    () => wods.findIndex(w => w.idEntrenamiento === (wodSel?.idEntrenamiento)),
    [wods, wodSel]
  );
  const acento = WOD_COLORS[idxSel] || 'var(--primary)';

  return (
    <section className="wdd-card">
      <header className="wdd-head">
        <div className="wdd-head-title">
          <span className="wdd-eyebrow"><i className="fas fa-clipboard-list"></i> WOD DE HOY</span>
          <span className="wdd-date">
            {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase()}
          </span>
        </div>
        <div className="wdd-head-actions">
          <button className="wdd-btn wdd-btn--ghost" onClick={() => navigate('/comunidad')} title="Ir a la comunidad del box">
            <i className="fas fa-users"></i><span className="wdd-btn-label">Comunidad</span>
          </button>
          <button className="wdd-btn wdd-btn--ghost" onClick={() => navigate('/calendario-wods')} title="Ir al calendario de WODs">
            <i className="far fa-calendar-alt"></i><span className="wdd-btn-label">Calendario</span>
          </button>
          <button className="wdd-btn wdd-btn--primary" onClick={() => navigate('/creador-wods')} title="Crear un WOD nuevo">
            <i className="fas fa-plus"></i><span className="wdd-btn-label">Crear WOD</span>
          </button>
        </div>
      </header>

      <div className="wdd-body">
        {loading ? (
          <div className="wdd-loading"><AtletifyLoader /></div>
        ) : wods.length === 0 ? (
          <div className="wdd-empty">
            <i className="fas fa-bed"></i>
            <p className="wdd-empty-title">No hay WOD publicado para hoy</p>
            <p className="wdd-empty-sub">Crea uno o reutiliza una plantilla desde el calendario.</p>
          </div>
        ) : (
          <>
            {/* Selector entre los WODs del día (el staff no pertenece a una clase) */}
            {wods.length > 1 && (
              <div className="wdd-tabs" role="tablist">
                {wods.map((w, i) => (
                  <button
                    key={w.idEntrenamiento}
                    role="tab"
                    aria-selected={w.idEntrenamiento === wodSel?.idEntrenamiento}
                    className={`wdd-tab ${w.idEntrenamiento === wodSel?.idEntrenamiento ? 'wdd-tab--active' : ''}`}
                    style={w.idEntrenamiento === wodSel?.idEntrenamiento ? { borderColor: WOD_COLORS[i] || 'var(--primary)' } : {}}
                    onClick={() => setIdSel(w.idEntrenamiento)}
                  >
                    <span className="wdd-tab-dot" style={{ background: WOD_COLORS[i] || 'var(--primary)' }}></span>
                    {w.titulo}
                  </button>
                ))}
              </div>
            )}

            {wodSel && (
              <article className="wdd-wod">
                <div className="wdd-wod-title-row">
                  <i className="fas fa-dumbbell wdd-wod-icon" style={{ color: acento }}></i>
                  <h3 className="wdd-wod-title">{wodSel.titulo}</h3>
                  {wodSel.requiereScore === false && (
                    <span className="wdd-sinscore-badge"><i className="fas fa-mug-hot"></i> Sin score</span>
                  )}
                  {wodSel.autor && (
                    <span className="wdd-autor">
                      <i className="fas fa-user-pen"></i>
                      {wodSel.autor.nombre || wodSel.autor.username}
                    </span>
                  )}
                </div>

                {/* Clases a las que aplica (para que el coach sepa si es de alguna que imparte) */}
                {wodSel.clasesAsignadas?.length > 0 && (
                  <div className="wdd-clases">
                    {wodSel.clasesAsignadas.map(c => (
                      <span key={c.idClase} className="wdd-clase-chip">
                        <i className="far fa-clock"></i>
                        {String(c.clase?.horarioInicio || '').substring(0, 5)} {c.clase?.nombre}
                      </span>
                    ))}
                  </div>
                )}

                {wodSel.bloques?.map(bloque => (
                  <div key={bloque.idBloque} className="wdd-bloque" style={{ borderLeftColor: acento }}>
                    <div className="wdd-bloque-head">
                      <div className="wdd-bloque-tags">
                        <span className="wdd-bloque-tipo">{bloque.tipoBloque}</span>
                        <span className="wdd-bloque-mod">{bloque.tipoModalidad}</span>
                        {bloque.rondas ? <span className="wdd-bloque-rondas"><i className="fas fa-repeat"></i> {bloque.rondas} rondas</span> : null}
                      </div>
                      {bloque.capTimeMinutos && (
                        <span className="wdd-bloque-tc"><i className="fas fa-stopwatch"></i> TC {bloque.capTimeMinutos}</span>
                      )}
                    </div>
                    {bloque.descripcionLibre && (
                      <p className="wdd-bloque-desc">{bloque.descripcionLibre}</p>
                    )}
                    <ListaEjercicios ejercicios={bloque.ejercicios} />
                  </div>
                ))}

                {/* Barra social: el coach/admin también es comunidad */}
                <div className="wdd-social">
                  <button
                    className={`wdd-social-btn ${s.miReaccion === 'like' ? 'wdd-social-btn--like' : ''}`}
                    onClick={() => reaccionar(wodSel.idEntrenamiento, 'like')}
                    aria-label="Me gusta"
                  >
                    <i className="fas fa-thumbs-up"></i><span>{s.likes}</span>
                  </button>
                  <button
                    className={`wdd-social-btn ${s.miReaccion === 'dislike' ? 'wdd-social-btn--dislike' : ''}`}
                    onClick={() => reaccionar(wodSel.idEntrenamiento, 'dislike')}
                    aria-label="No me gusta"
                  >
                    <i className="fas fa-thumbs-down"></i><span>{s.dislikes}</span>
                  </button>
                  <button
                    className="wdd-social-btn wdd-social-btn--comments"
                    onClick={() => setComentariosWod(wodSel)}
                  >
                    <i className="fas fa-comment"></i>
                    <span>{s.totalComentarios > 0 ? `${s.totalComentarios} ` : ''}Comentarios</span>
                  </button>
                  <button
                    className="wdd-social-btn wdd-adaptar ms-auto"
                    onClick={() => navigate(`/editar-wod/${wodSel.idEntrenamiento}`)}
                    title="Abrir este WOD para adaptarlo o clonarlo a tus clases"
                  >
                    <i className="fas fa-clone"></i><span>Adaptar / Clonar</span>
                  </button>
                </div>
              </article>
            )}
          </>
        )}

        {/* Sección aislada: rutinas personalizadas del día (solo staff las ve aquí) */}
        {!loading && personales.length > 0 && (
          <div className="wdd-personales">
            <p className="wdd-personales-title">
              <i className="fas fa-user-check"></i> Rutinas personalizadas de hoy
              <span className="wdd-personales-count">{personales.length}</span>
            </p>
            {personales.map(p => (
              <div key={p.idEntrenamiento} className="wdd-personal-row">
                <div className="wdd-personal-info">
                  <span className="wdd-personal-nombre">{p.titulo}</span>
                  <span className="wdd-personal-atletas">
                    <i className="fas fa-users"></i>
                    {(p.atletasAsignados || []).length > 0
                      ? (p.atletasAsignados || []).map(a => a.usuario?.apodo || a.usuario?.nombre || 'Atleta').join(', ')
                      : 'Sin atletas'}
                  </span>
                </div>
                <button className="wdd-social-btn wdd-adaptar" onClick={() => navigate(`/editar-wod/${p.idEntrenamiento}`)} title="Ver / editar / clonar">
                  <i className="fas fa-pen"></i><span>Ver</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {comentariosWod && (
        <ModalComentariosWod
          wod={comentariosWod}
          onCerrar={() => setComentariosWod(null)}
          onCountChange={(delta) => setSocial(prev => {
            const cur = prev[comentariosWod.idEntrenamiento] || SOCIAL_VACIO;
            return {
              ...prev,
              [comentariosWod.idEntrenamiento]: {
                ...cur,
                totalComentarios: Math.max(0, cur.totalComentarios + delta)
              }
            };
          })}
        />
      )}
    </section>
  );
}
