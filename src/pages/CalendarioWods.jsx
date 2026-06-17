import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSwipeGesture } from '../hooks/useSwipeGesture';
import BackButton from '../components/BackButton';
import AtletifyLoader from '../components/AtletifyLoader';
import ModalComentariosWod from '../components/ModalComentariosWod';
import ModalDetallesWod from '../components/ModalDetallesWod';
import { api } from '../services/api';
import '../assets/css/CalendarioWods.css';

const API_BASE = import.meta.env.VITE_API_URL;;

const fechaLocalStr = (d) =>
  d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');

export default function CalendarioWods() {
  const navigate = useNavigate();
  const [box, setBox] = useState(null);
  const [entrenamientos, setEntrenamientos] = useState([]);
  const [loading, setLoading] = useState(true);
  // Estado para controlar qué menú de los 3 puntitos está abierto
  const [menuAbierto, setMenuAbierto] = useState(null);

  // LA SORPRESA: Estado para el Modo Pizarra TV
  const [wodPizarra, setWodPizarra] = useState(null);

  // Control de la semana actual
  const [fechaReferencia, setFechaReferencia] = useState(new Date());

  // Capa social: contadores like/dislike/comentarios por WOD + modal de comentarios (modo admin)
  const [contadoresWod, setContadoresWod] = useState({});
  const [comentariosWod, setComentariosWod] = useState(null);

  // Modal "Ver detalles": historial (quién creó/editó) del WOD seleccionado
  const [detallesWod, setDetallesWod] = useState(null);

  useEffect(() => {
    const b = JSON.parse(localStorage.getItem('box'));
    const u = JSON.parse(localStorage.getItem('usuario'));
    if (!b || !u || (u.rol !== 'AdminBox' && u.rol !== 'Coach' && u.rol !== 'Developer')) {
      navigate('/');
      return;
    }
    setBox(b);
    cargarEntrenamientos(b.idBox);
  }, [navigate]);

  async function cargarEntrenamientos(idBox) {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/entrenamientos/box/${idBox}`);
      if (res.ok) setEntrenamientos(await res.json());
    } catch (err) { console.error("Error al cargar WODs", err); }
    finally { setLoading(false); }
  }

  const eliminarWod = async (id) => {
    if (!await window.wpConfirm("¿Seguro que deseas eliminar este WOD?")) return;
    try {
      const res = await fetch(`${API_BASE}/entrenamientos/${id}`, { method: 'DELETE' });
      if (res.ok) cargarEntrenamientos(box.idBox);
    } catch (err) { alert("Error de conexión"); }
  };

  // Guarda un WOD existente del calendario como plantilla reutilizable (sin fecha ni clases)
  const guardarWodComoPlantilla = async (wod) => {
    setMenuAbierto(null);
    if (!box) return;
    if (!await window.wpConfirm(`¿Guardar "${wod.titulo}" como plantilla reutilizable?`)) return;
    const payload = {
      idBox: box.idBox,
      nombre: wod.titulo,
      descripcion: null,
      modoRanking: wod.modoRanking,
      metricaPrincipal: wod.metricaPrincipal,
      bloques: (wod.bloques || []).map(b => ({
        tipoBloque: b.tipoBloque,
        tipoModalidad: b.tipoModalidad,
        modalidadEquipo: b.modalidadEquipo,
        capTimeMinutos: b.capTimeMinutos,
        minutosExtraCap: b.minutosExtraCap,
        descripcionLibre: b.descripcionLibre,
        plantillaJueceo: b.plantillaJueceo, // ya viene como JSON string del backend
        ejercicios: (b.ejercicios || []).map(ej => ({
          idEjercicioDiccionario: ej.idEjercicioDiccionario,
          idEjercicio: ej.idEjercicio,
          esquemaRepeticiones: ej.esquemaRepeticiones,
          pesoSugerido: ej.pesoSugerido
        }))
      }))
    };
    try {
      await api.crearPlantilla(payload);
      alert(`"${wod.titulo}" guardado como plantilla.`);
    } catch (err) {
      alert(err.message || 'Error al guardar la plantilla');
    }
  };

  // Carga contadores de like/dislike/comentarios de los WODs de la semana visible
  useEffect(() => {
    if (!entrenamientos.length) return;
    const base = new Date(fechaReferencia);
    const diaSemana = base.getDay() || 7;
    base.setDate(base.getDate() - diaSemana + 1);
    const dias = [];
    for (let i = 0; i < 7; i++) { const f = new Date(base); f.setDate(f.getDate() + i); dias.push(fechaLocalStr(f)); }
    const faltantes = entrenamientos
      .filter(e => dias.some(d => e.fechaProgramada?.includes(d)))
      .map(e => e.idEntrenamiento)
      .filter(id => !(id in contadoresWod));
    if (faltantes.length === 0) return;
    let activo = true;
    (async () => {
      const entradas = await Promise.all(faltantes.map(async id => {
        try { return [id, await api.obtenerContadoresWod(id)]; }
        catch { return [id, { likes: 0, dislikes: 0, totalComentarios: 0 }]; }
      }));
      if (activo) setContadoresWod(prev => ({ ...prev, ...Object.fromEntries(entradas) }));
    })();
    return () => { activo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entrenamientos, fechaReferencia]);

  // --- LÓGICA DEL CALENDARIO ---
  const obtenerDiasSemana = (fecha) => {
    const dias = [];
    // Clonamos la fecha para no mutar el estado original
    const fechaBase = new Date(fecha);
    // Ajustamos al Lunes de esta semana
    const diaSemana = fechaBase.getDay() || 7;
    fechaBase.setDate(fechaBase.getDate() - diaSemana + 1);

    for (let i = 0; i < 7; i++) {
      const f = new Date(fechaBase);
      f.setDate(f.getDate() + i);
      dias.push(f);
    }
    return dias;
  };

  const diasSemana = obtenerDiasSemana(fechaReferencia);
  const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  const nombresDias = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

  const avanzarSemana = () => {
    const nueva = new Date(fechaReferencia);
    nueva.setDate(nueva.getDate() + 7);
    setFechaReferencia(nueva);
  };

  const retrocederSemana = () => {
    const nueva = new Date(fechaReferencia);
    nueva.setDate(nueva.getDate() - 7);
    setFechaReferencia(nueva);
  };

  // --- HOOK PARA SWIPE EN MÓVIL ---
  const swipe = useSwipeGesture(avanzarSemana, retrocederSemana, 50);

  // =========================================================================
  // MODO PIZARRA TV
  // =========================================================================
  if (wodPizarra) {
    return (
      <div className="cw-pizarra-page">

        <button onClick={() => setWodPizarra(null)} className="cw-pizarra-close-btn">
          <i className="fas fa-times"></i>
        </button>

        <div className="container-fluid flex-grow-1 d-flex flex-column p-4 p-md-5">

          {/* HEADER TV */}
          <div className="text-center mb-5 pb-4" style={{ borderBottom: '1px solid rgba(230,57,70,0.4)' }}>
            <h1 className="cw-pizarra-wod-title">{wodPizarra.titulo}</h1>
            <div className="d-flex justify-content-center gap-3 mt-3 flex-wrap">
              {wodPizarra.bloques?.filter(b => b.tipoBloque === 'WOD').map((b, i) => (
                <div key={i} className="d-flex gap-3 flex-wrap justify-content-center">
                  <span className="badge px-4 py-2 fs-4 rounded-pill" style={{ background: 'var(--primary)', color: '#fff' }}>
                    {b.tipoModalidad}
                  </span>
                  {b.capTimeMinutos && (
                    <span className="badge px-4 py-2 fs-4 rounded-pill" style={{ background: 'rgba(245,166,35,0.15)', border: '1px solid var(--accent)', color: 'var(--accent)' }}>
                      <i className="fas fa-stopwatch me-2"></i>TC: {b.capTimeMinutos}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* BLOQUES DEL WOD */}
          <div className="row g-4 flex-grow-1 align-items-start justify-content-center">
            {wodPizarra.bloques?.map((bloque, index) => (
              <div key={index} className="col-12 col-xl-10">
                <div className={`cw-pizarra-bloque ${bloque.tipoBloque === 'Warm-Up' ? 'cw-pizarra-bloque--warmup' :
                  bloque.tipoBloque === 'WOD' ? 'cw-pizarra-bloque--wod' :
                    'cw-pizarra-bloque--other'
                  }`}>
                  <p className="cw-pizarra-bloque-tipo">{bloque.tipoBloque}</p>

                  {bloque.descripcionLibre && (
                    <p className="cw-pizarra-desc">{bloque.descripcionLibre}</p>
                  )}

                  {bloque.ejercicios?.length > 0 && (
                    <ul className="list-unstyled mb-0">
                      {bloque.ejercicios.map((ej, i) => (
                        <li key={i} className="cw-pizarra-ejercicio-item">
                          <span className="cw-pizarra-reps">{ej.esquemaRepeticiones}</span>
                          <span>{ej.ejercicio?.nombre}</span>
                          {ej.pesoSugerido && (
                            <span className="cw-pizarra-peso">({ej.pesoSugerido})</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* LOGO EN TV */}
          <div className="cw-pizarra-footer">
            <i className="fas fa-paw"></i>
            <p>{box?.nombre}</p>
          </div>

        </div>
      </div>
    );
  }

  // =========================================================================
  // PANEL DE ADMINISTRACIÓN NORMAL (CALENDARIO SEMANAL)
  // =========================================================================
  return (
    <div className="cw-page">

      {/* ══════════════════════════════════
          HEADER
      ══════════════════════════════════ */}
      <header className="cw-header">
        <div className="d-flex align-items-center gap-3">
          <BackButton to="/admin-box-panel" />
          <h1 className="cw-header-title me-auto">
            Calendario de <span style={{ color: 'var(--primary)' }}>WODs</span>
          </h1>
          <Link to="/wods-guardados" className="cw-plantillas-btn">
            <i className="fas fa-bookmark"></i>
            <span className="d-none d-sm-inline">Plantillas</span>
          </Link>
          <Link to="/creador-wods" className="cw-nuevo-btn">
            <i className="fas fa-plus"></i>
            <span className="d-none d-sm-inline">Nuevo WOD</span>
          </Link>
        </div>
      </header>

      <div className="container-fluid px-3 px-md-4" style={{ maxWidth: '1400px' }}>

        {/* ══════════════════════════════════
            NAVEGADOR DE SEMANA
        ══════════════════════════════════ */}
        <div className="cw-week-navigator">
          <button onClick={retrocederSemana} className="cw-nav-btn" title="Semana anterior">
            <i className="fas fa-chevron-left"></i>
          </button>

          <div className="text-center flex-grow-1">
            <p className="cw-week-label">
              Semana del {diasSemana[0].getDate()} de {meses[diasSemana[0].getMonth()]}
            </p>
            <p className="cw-week-sub">
              al {diasSemana[6].getDate()} de {meses[diasSemana[6].getMonth()]}
            </p>
          </div>

          <button onClick={avanzarSemana} className="cw-nav-btn" title="Próxima semana">
            <i className="fas fa-chevron-right"></i>
          </button>
        </div>

        {/* ══════════════════════════════════
            ZONA DE SWIPE + GRILLA
        ══════════════════════════════════ */}
        <div
          onTouchStart={swipe.handleTouchStart}
          onTouchMove={swipe.handleTouchMove}
          onTouchEnd={swipe.handleTouchEnd}
          style={{ touchAction: 'pan-y' }}
        >
          {loading ? (
            <div className="cw-loading">
              <AtletifyLoader />
            </div>
          ) : (
            <div className="row row-cols-1 row-cols-sm-2 row-cols-md-3 row-cols-lg-4 row-cols-xl-7 g-2 g-md-3 justify-content-center">

              {diasSemana.map((dia, index) => {
                // 👈 EXTRAEMOS LA FECHA LOCAL PURA SIN USAR 'toISOString()'
                const getLocalStr = (d) =>
                  d.getFullYear() + '-' +
                  String(d.getMonth() + 1).padStart(2, '0') + '-' +
                  String(d.getDate()).padStart(2, '0');

                const fechaLocal = getLocalStr(dia);
                const wodsDelDia = entrenamientos.filter(e => e.fechaProgramada.includes(fechaLocal));
                const esHoy = getLocalStr(new Date()) === fechaLocal;

                return (
                  <div key={index} className="col cw-day-col">

                    {/* CABECERA DEL DÍA */}
                    <div className={`cw-day-header ${esHoy ? 'cw-day-header--today' : ''}`}>
                      <p className="cw-day-name">{nombresDias[index]}</p>
                      <span className="cw-day-number">{dia.getDate()}</span>
                    </div>

                    {/* CUERPO DEL DÍA */}
                    <div className="cw-day-body">

                      {wodsDelDia.length === 0 ? (
                        <div className="cw-day-empty">
                          <i className="fas fa-bed"></i>
                          <p>Día libre</p>
                        </div>
                      ) : (
                        wodsDelDia.map(wod => (
                          <div
                            key={wod.idEntrenamiento}
                            className={`cw-wod-card ${wod.estaPublicado ? 'cw-wod-card--published' : 'cw-wod-card--draft'}`}
                          >
                            <div className="cw-wod-body">

                              {/* Título + menú */}
                              <div className="d-flex justify-content-between align-items-start mb-1 gap-1">
                                <h6 className="cw-wod-title">{wod.titulo}</h6>

                                {/* MENÚ 3 PUNTOS */}
                                <div className="dropdown position-relative">
                                  <button
                                    className="cw-menu-btn"
                                    onClick={() => setMenuAbierto(menuAbierto === wod.idEntrenamiento ? null : wod.idEntrenamiento)}
                                  >
                                    <i className="fas fa-ellipsis-v"></i>
                                  </button>

                                  {menuAbierto === wod.idEntrenamiento && (
                                    <ul className="dropdown-menu dropdown-menu-dark shadow show position-absolute end-0 cw-dropdown-menu">
                                      <li>
                                        <button
                                          onClick={() => { setWodPizarra(wod); setMenuAbierto(null); }}
                                          className="dropdown-item"
                                          style={{ color: 'var(--accent-cool)' }}
                                        >
                                          <i className="fas fa-tv me-2"></i>Transmitir a TV
                                        </button>
                                      </li>
                                      <li><hr className="dropdown-divider" /></li>
                                      <li>
                                        <Link
                                          to={`/editar-wod/${wod.idEntrenamiento}`}
                                          className="dropdown-item"
                                        >
                                          <i className="fas fa-pen me-2"></i>Editar WOD
                                        </Link>
                                      </li>
                                      <li>
                                        <button
                                          onClick={() => { setDetallesWod(wod); setMenuAbierto(null); }}
                                          className="dropdown-item"
                                        >
                                          <i className="fas fa-circle-info me-2"></i>Ver detalles
                                        </button>
                                      </li>
                                      <li>
                                        <button
                                          onClick={() => { setComentariosWod(wod); setMenuAbierto(null); }}
                                          className="dropdown-item"
                                          style={{ color: 'var(--accent-cool)' }}
                                        >
                                          <i className="fas fa-comments me-2"></i>Ver comentarios
                                        </button>
                                      </li>
                                      <li>
                                        <button
                                          onClick={() => guardarWodComoPlantilla(wod)}
                                          className="dropdown-item"
                                          style={{ color: 'var(--accent)' }}
                                        >
                                          <i className="fas fa-bookmark me-2"></i>Guardar como plantilla
                                        </button>
                                      </li>
                                      <li>
                                        <button
                                          onClick={() => { eliminarWod(wod.idEntrenamiento); setMenuAbierto(null); }}
                                          className="dropdown-item text-danger"
                                        >
                                          <i className="fas fa-trash me-2"></i>Eliminar
                                        </button>
                                      </li>
                                    </ul>
                                  )}
                                </div>
                              </div>

                              {/* BADGES */}
                              <div className="d-flex flex-wrap gap-1 mb-1">
                                {wod.bloques?.filter(b => b.tipoBloque === 'WOD').map((b, i) => (
                                  <span key={`mod-${i}`} className="cw-badge" style={{ backgroundColor: 'var(--btn-soft-purple, #9153C6)', color: '#fff', border: 'none' }}>
                                    <i className="fas fa-tag me-1"></i>{b.tipoModalidad}
                                  </span>
                                ))}
                                <span className={`cw-badge ${wod.estaPublicado ? 'cw-badge-published' : 'cw-badge-draft'}`}>
                                  {wod.estaPublicado ? 'Público' : 'Borrador'}
                                </span>
                                {wod.clasesAsignadas?.length > 0 ? (
                                  <span
                                    className="cw-badge cw-badge-clases"
                                    title={wod.clasesAsignadas.map(c => c.clase?.nombre).join(', ')}
                                  >
                                    {wod.clasesAsignadas.length} Clases
                                  </span>
                                ) : (
                                  <span className="cw-badge cw-badge-box">Todo el Box</span>
                                )}
                                {(() => {
                                  const c = contadoresWod[wod.idEntrenamiento];
                                  if (!c) return null;
                                  return (
                                    <>
                                      <span className="cw-badge cw-badge-likes" title="Me gusta">
                                        <i className="fas fa-thumbs-up me-1"></i>{c.likes}
                                      </span>
                                      <span className="cw-badge cw-badge-dislikes" title="No me gusta">
                                        <i className="fas fa-thumbs-down me-1"></i>{c.dislikes}
                                      </span>
                                      {c.totalComentarios > 0 && (
                                        <span className="cw-badge cw-badge-coments" title="Comentarios">
                                          <i className="fas fa-comment me-1"></i>{c.totalComentarios}
                                        </span>
                                      )}
                                    </>
                                  );
                                })()}
                              </div>

                              {/* BOTÓN RÁPIDO TV */}
                              <button
                                onClick={() => setWodPizarra(wod)}
                                className="cw-pizarra-quick-btn"
                              >
                                <i className="fas fa-tv"></i>Modo Pizarra
                              </button>

                            </div>
                          </div>
                        ))
                      )}

                      {/* BOTÓN AGREGAR WOD */}
                      <Link to={`/creador-wods?fecha=${fechaLocal}`} className="cw-add-btn">
                        <i className="fas fa-plus"></i>
                      </Link>

                    </div>
                  </div>
                );
              })}

            </div>
          )}
        </div>

      </div>

      {/* Modal de comentarios (modo admin: lee y borra cualquiera) */}
      {comentariosWod && (
        <ModalComentariosWod
          wod={comentariosWod}
          onCerrar={() => setComentariosWod(null)}
          onCountChange={(delta) => setContadoresWod(prev => ({
            ...prev,
            [comentariosWod.idEntrenamiento]: {
              ...(prev[comentariosWod.idEntrenamiento] || { likes: 0, dislikes: 0, totalComentarios: 0 }),
              totalComentarios: Math.max(0, ((prev[comentariosWod.idEntrenamiento]?.totalComentarios) || 0) + delta)
            }
          }))}
        />
      )}

      {/* Modal "Ver detalles": historial de creación/edición del WOD */}
      {detallesWod && (
        <ModalDetallesWod
          wod={detallesWod}
          onCerrar={() => setDetallesWod(null)}
        />
      )}
    </div>
  );
}
