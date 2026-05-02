import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { COMPETENCIAS_ENDPOINT, API_BASE_URL_CONST } from '../services/api';
import BackButton from '../components/BackButton';
import BotonSeguro from '../components/BotonSeguro';
import TimeInputMMSS from '../components/TimeInputMMSS';
import '../assets/css/PortalJuez.css';

export default function PortalJuez() {
  const { id } = useParams(); // ID de la competencia

  // ──── Auth State ────
  const [juezUser, setJuezUser] = useState(null); // Usuario autenticado del juez
  const navigate = useNavigate();

  // ──── Competition Data ────
  const [comp, setComp] = useState(null);
  const [roster, setRoster] = useState([]);
  const [wods, setWods] = useState([]);
  const [loading, setLoading] = useState(true);

  // ──── Judge Filters ────
  const [nombreJuez, setNombreJuez] = useState('');
  const [idCatSeleccionada, setIdCatSeleccionada] = useState('');
  const [idWodSeleccionado, setIdWodSeleccionado] = useState('');
  const [filtroEquipo, setFiltroEquipo] = useState('');

  // ──── Score State ────
  const [scoresTemporales, setScoresTemporales] = useState({});
  const [procesandoEq, setProcesandoEq] = useState(null);

  // ══════════════════════════════════════════
  // 1. AL MONTAR: checar si hay sesión previa
  // ══════════════════════════════════════════
  useEffect(() => {
    const stored = localStorage.getItem('usuario');
    if (stored) {
      try {
        const userObj = JSON.parse(stored);
        // Validar: ¿Es juez de ESTA competencia estrictamente?
        if (userObj.rol === 'Juez' && String(userObj.idCompetenciaAsignada) === String(id)) {
          setJuezUser(userObj);
          setNombreJuez(userObj.nombre || userObj.username || '');
        }
      } catch (e) { /* sesión corrupta, ignorar */ }
    }
  }, [id]);

  // ══════════════════════════════════════════
  // 2. CARGAR DATOS DE LA COMPETENCIA (siempre)
  // ══════════════════════════════════════════
  useEffect(() => {
    const cargarComp = async () => {
      try {
        const resComp = await fetch(`${COMPETENCIAS_ENDPOINT}/${id}`);
        if (resComp.ok) {
          const dataComp = await resComp.json();
          setComp(dataComp);
          setRoster(dataComp.categorias || dataComp.Categorias || []);
          
          const resWods = await fetch(`${COMPETENCIAS_ENDPOINT}/${id}/wods`);
          if (resWods.ok) {
            setWods(await resWods.json());
          }
        } else {
          setComp(null);
        }
      } catch (err) { 
        console.error("Error al cargar la competencia:", err); 
        setComp(null);
      }
      finally { setLoading(false); }
    };
    cargarComp();
  }, [id]);

  // ══════════════════════════════════════════
  // 4. CERRAR SESIÓN DEL JUEZ
  // ══════════════════════════════════════════
  const handleJuezLogout = () => {
    localStorage.removeItem('usuario');
    localStorage.removeItem('token');
    setJuezUser(null);
    navigate('/login');
  };

  // ══════════════════════════════════════════
  // 5. GUARDAR SCORE
  // ══════════════════════════════════════════
  const handleScoreChange = (idEquipo, valor, tipo = '') => {
    let finalValor = valor;
    const tipoLower = tipo.toLowerCase();
    if (tipoLower.includes('peso') || tipoLower.includes('rm')) {
      finalValor = valor.replace(/[^0-9.]/g, '');
    } else if (tipoLower.includes('amrap') || tipoLower.includes('rep')) {
      finalValor = valor.replace(/[^0-9]/g, '');
    }
    setScoresTemporales(prev => ({ ...prev, [idEquipo]: finalValor }));
  };

  const handleScoreRondasRepsChange = (idEquipo, campo, valor) => {
    let finalValor = valor.replace(/[^0-9]/g, '');
    if (campo === 'rondas' && parseInt(finalValor) > 50) finalValor = '50';
    if (campo === 'reps' && parseInt(finalValor) > 100) finalValor = '100';

    setScoresTemporales(prev => ({
      ...prev,
      [`${idEquipo}_${campo}`]: finalValor
    }));
  };

  const guardarScore = async (idEquipo) => {
    if (!nombreJuez.trim()) return alert("Por favor, ingresa tu nombre de juez arriba.");
    if (!idWodSeleccionado) return alert("Selecciona un WOD.");

    const wodActual = wods.find(w => (w.idWodComp || w.IdWodComp) == idWodSeleccionado);
    const tipo = wodActual ? (wodActual.tipoCalificacion || wodActual.TipoCalificacion || "") : "";

    let resultado = "";

    if (tipo === 'Rondas + Repeticiones') {
      const rondas = scoresTemporales[`${idEquipo}_rondas`] || '';
      const reps = scoresTemporales[`${idEquipo}_reps`] || '';
      if (rondas === '' && reps === '') return alert("Ingresa un resultado válido.");
      resultado = `${rondas || 0} Rondas + ${reps || 0} Reps`;
    } else {
      resultado = scoresTemporales[idEquipo];
      if (!resultado) return alert("Ingresa un resultado válido.");
    }

    setProcesandoEq(idEquipo);
    try {
      const res = await fetch(`${COMPETENCIAS_ENDPOINT}/wods/${idWodSeleccionado}/scores`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idEquipoComp: idEquipo,
          resultado: resultado,
          nombreJuez: nombreJuez
        })
      });

      if (res.ok) {
        alert("¡Score guardado con éxito! ✅");
        if (tipo === 'Rondas + Repeticiones') {
           setScoresTemporales(prev => ({ ...prev, [`${idEquipo}_rondas`]: '', [`${idEquipo}_reps`]: '' }));
        } else {
           setScoresTemporales(prev => ({ ...prev, [idEquipo]: '' }));
        }
      } else {
        alert("Error al guardar.");
      }
    } catch (err) { alert("Error de conexión."); }
    finally { setProcesandoEq(null); }
  };

  // ══════════════════════════════════════════
  // RENDER: LOADING
  // ══════════════════════════════════════════
  if (loading) return (
    <div className="jz-spinner-wrapper">
      <div className="spinner-wp"></div>
    </div>
  );

  if (!comp) return (
    <div className="jz-root">
      {/* Header minimalista con botón de logout si está logueado */}
      <header className="jz-header">
        <div className="jz-header-content">
          <div className="d-flex align-items-center gap-2">
            <BackButton to={`/competencias`} />
            <h2 className="jz-header-title">
              <i className="fas fa-clipboard-check"></i>Portal de Jueceo
            </h2>
          </div>
          {juezUser && (
            <div className="d-flex align-items-center gap-3">
              <div className="jz-user-badge">
                <i className="fas fa-user-shield"></i>
                <span>{juezUser.nombre || juezUser.username}</span>
                <span className="jz-user-role-tag">{juezUser.rol}</span>
              </div>
              <button className="jz-logout-btn" onClick={handleJuezLogout} title="Cerrar sesión">
                <i className="fas fa-sign-out-alt"></i>
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="jz-login-wrapper">
        <div className="jz-login-card">
          <i className="fas fa-exclamation-triangle" style={{ fontSize: '3rem', color: 'var(--primary)', marginBottom: '1rem' }}></i>
          <h2 style={{ color: '#fff', marginBottom: '0.5rem' }}>Competencia no encontrada</h2>
          <p style={{ color: 'var(--secondary)' }}>La competencia que buscas no existe o ya fue archivada.</p>
          <div className="d-flex flex-column gap-2 mt-4">
            <Link to="/competencias" className="jz-login-btn text-decoration-none">
              <i className="fas fa-arrow-left"></i>Ver Competencias
            </Link>
            {juezUser && juezUser.rol === 'Juez' && (
              <button onClick={handleJuezLogout} className="jz-login-btn" style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                <i className="fas fa-sign-out-alt"></i>Cerrar Sesión
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // ══════════════════════════════════════════
  // RENDER: ACCESO DENEGADO (si no hay sesión o no es juez)
  // ══════════════════════════════════════════
  if (!juezUser) {
    return (
      <div className="jz-root">
        <div className="jz-login-wrapper">
          <div className="jz-login-card">
            <i className="fas fa-lock" style={{ fontSize: '3rem', color: 'var(--primary)', marginBottom: '1rem' }}></i>
            <h2 style={{ color: '#fff', marginBottom: '0.5rem' }}>Acceso Denegado</h2>
            <p style={{ color: 'var(--secondary)' }}>Debes iniciar sesión con una cuenta de Juez asignada a esta competencia.</p>
            <div className="d-flex flex-column gap-3 mt-4">
              <Link to="/login" className="jz-login-btn text-decoration-none">
                <i className="fas fa-sign-in-alt"></i>Ir al Login Principal
              </Link>
              <Link to={`/competencias`} className="jz-login-back-link justify-content-center">
                <i className="fas fa-arrow-left"></i>Ver Portal Público
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════
  // RENDER: PANEL DE CALIFICACIÓN (autenticado)
  // ══════════════════════════════════════════
  const categoriaActual = roster.find(c => (c.idCategoriaComp || c.IdCategoriaComp) == idCatSeleccionada);
  const equiposAprobadosBase = categoriaActual?.equipos?.filter(eq => (eq.estatusPago || eq.EstatusPago) === 'Aprobado') ||
    categoriaActual?.Equipos?.filter(eq => (eq.estatusPago || eq.EstatusPago) === 'Aprobado') || [];

  // Filtrado 1: Solo mostrar los que le tocan a este Juez en este WOD
  let equiposAprobados = equiposAprobadosBase;
  if (juezUser?.rol === 'Juez' && idWodSeleccionado) {
    equiposAprobados = equiposAprobadosBase.filter(eq => {
      let asignado = false;
      try {
        const configObj = JSON.parse(comp.heatsConfig || comp.HeatsConfig || "{}");
        const wodTarget = configObj.wods?.find(w => w.idWod == idWodSeleccionado);
        if (wodTarget) {
          wodTarget.lista?.forEach(heat => {
            heat.participantes?.forEach(p => {
               if (p.idEquipo == (eq.idEquipoComp || eq.IdEquipoComp) && p.idJuez == (juezUser.id || juezUser.idUsuario || juezUser.IdUsuario)) {
                 asignado = true;
               }
            });
          });
        }
      } catch(e) {}
      return asignado;
    });
  }

  // Filtrado 2: Búsqueda por nombre de equipo
  if (filtroEquipo.trim() !== '') {
    equiposAprobados = equiposAprobados.filter(eq => 
      (eq.nombre || eq.Nombre).toLowerCase().includes(filtroEquipo.toLowerCase())
    );
  }

  // Filtrar las categorías y wods en el dropdown si es juez
  let wodsPermitidos = wods;
  let categoriasPermitidas = comp.categorias || comp.Categorias || [];

  if (juezUser?.rol === 'Juez') {
    const wodsSet = new Set();
    const catSet = new Set();
    try {
      const configObj = JSON.parse(comp.heatsConfig || comp.HeatsConfig || "{}");
      configObj.wods?.forEach(w => {
        w.lista?.forEach(heat => {
          heat.participantes?.forEach(p => {
            if (p.idJuez == (juezUser.id || juezUser.idUsuario || juezUser.IdUsuario)) {
              wodsSet.add(w.idWod.toString());
              const matchCat = (comp.categorias || comp.Categorias || []).find(c => c.nombre === heat.categoria);
              if (matchCat) catSet.add(matchCat.idCategoriaComp.toString());
            }
          });
        });
      });
    } catch(e) {}

    wodsPermitidos = wods.filter(w => wodsSet.has((w.idWodComp || w.IdWodComp).toString()));
    categoriasPermitidas = (comp.categorias || comp.Categorias || []).filter(c => catSet.has((c.idCategoriaComp || c.IdCategoriaComp).toString()));
  }

  return (
    <div className="jz-root">

      {/* HEADER */}
      <header className="jz-header">
        <div className="jz-header-content">
          <div className="d-flex align-items-center gap-2">
            <BackButton to={`/portal-competencias/${id}`} />
            <h2 className="jz-header-title">
              <i className="fas fa-clipboard-check"></i>Portal de Jueceo
            </h2>
          </div>
          <div className="d-flex align-items-center gap-3">
            <div className="jz-user-badge">
              <i className="fas fa-user-shield"></i>
              <span>{juezUser.nombre || juezUser.username}</span>
              <span className="jz-user-role-tag">{juezUser.rol}</span>
            </div>
            <button className="jz-logout-btn" onClick={handleJuezLogout} title="Cerrar sesión">
              <i className="fas fa-sign-out-alt"></i>
            </button>
          </div>
        </div>
        <div className="jz-header-comp">{comp.nombre}</div>
      </header>

      <div className="container-fluid px-3 px-md-4 px-lg-5">

        {/* PAGE TITLE */}
        <div className="mb-4">
          <h1 className="jz-page-title">CALIF<span>ICA</span></h1>
          <div className="jz-accent-line"></div>
          <p className="jz-subtitle">Ingresa los resultados de los equipos</p>
        </div>

        {/* FILTROS */}
        <div className="jz-filters">
          <div className="row g-3">
            <div className="col-12 col-md-4">
              <div className="jz-filter-group">
                <label className="jz-filter-label">Tu Nombre (Juez)</label>
                <input
                  type="text"
                  className="jz-filter-input"
                  placeholder="Ej. Coach Edwin"
                  value={nombreJuez}
                  onChange={e => setNombreJuez(e.target.value)}
                  disabled={!!(juezUser?.rol === 'Juez')} // 👈 Bloqueamos el input si es un Juez oficial
                />
              </div>
            </div>
            <div className="col-12 col-md-4">
              <div className="jz-filter-group">
                <label className="jz-filter-label">¿Qué WOD estás calificando?</label>
                <select
                  className="jz-filter-select"
                  value={idWodSeleccionado}
                  onChange={e => setIdWodSeleccionado(e.target.value)}
                >
                  <option value="">-- Selecciona el WOD --</option>
                  {wodsPermitidos.map(w => (
                    <option key={w.idWodComp || w.IdWodComp} value={w.idWodComp || w.IdWodComp}>
                      {w.nombre || w.Nombre} ({w.tipoCalificacion || w.TipoCalificacion})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="col-12 col-md-3">
              <div className="jz-filter-group">
                <label className="jz-filter-label">¿A qué categoría estás viendo?</label>
                <select
                  className="jz-filter-select"
                  value={idCatSeleccionada}
                  onChange={e => setIdCatSeleccionada(e.target.value)}
                >
                  <option value="">-- Selecciona Categoría --</option>
                  {categoriasPermitidas.map(c => (
                    <option key={c.idCategoriaComp} value={c.idCategoriaComp}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="col-12 col-md-3">
              <div className="jz-filter-group">
                <label className="jz-filter-label">Buscar Equipo</label>
                <input
                  type="text"
                  className="jz-filter-input"
                  placeholder="Ej. Los Lobos"
                  value={filtroEquipo}
                  onChange={e => setFiltroEquipo(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* LISTA DE EQUIPOS A CALIFICAR */}
        {idCatSeleccionada && idWodSeleccionado ? (
          <div>
            <h3 className="jz-teams-header">
              <i className="fas fa-users"></i>Atletas en Pista
            </h3>

            {equiposAprobados.length === 0 ? (
              <div className="jz-empty-alert">
                No hay equipos aprobados en esta categoría aún.
              </div>
            ) : (
              <div className="row g-3">
                {equiposAprobados.map(eq => {
                  const idEq = eq.idEquipoComp || eq.IdEquipoComp;
                  return (
                    <div key={idEq} className="col-12 col-md-6 col-lg-4">
                      <div className="jz-team-card">

                        {/* TEAM HEADER */}
                        <div className="jz-team-header">
                          <div className="jz-team-info">
                            <h4 className="jz-team-name">{eq.nombre || eq.Nombre}</h4>
                          </div>
                          <span className="jz-team-box-badge">
                            <i className="fas fa-map-marker-alt" style={{ color: 'var(--primary)' }}></i>
                            {eq.boxOrigen || eq.BoxOrigen}
                          </span>
                        </div>

                        {/* SCORE INPUT */}
                        <div className="jz-score-input-group">
                          {(() => {
                            const wodActual = wods.find(w => (w.idWodComp || w.IdWodComp) == idWodSeleccionado);
                            const tipo = wodActual ? (wodActual.tipoCalificacion || wodActual.TipoCalificacion || "") : "";
                            const tipoLower = tipo.toLowerCase();
                            const esTiempo = tipoLower.includes('time') || tipoLower.includes('tiempo');
                            
                            if (tipo === 'Rondas + Repeticiones') {
                              return (
                                <>
                                  <input
                                    type="text"
                                    className="jz-score-input"
                                    placeholder="Rondas"
                                    value={scoresTemporales[`${idEq}_rondas`] || ''}
                                    onChange={(e) => handleScoreRondasRepsChange(idEq, 'rondas', e.target.value)}
                                  />
                                  <input
                                    type="text"
                                    className="jz-score-input"
                                    placeholder="Reps"
                                    value={scoresTemporales[`${idEq}_reps`] || ''}
                                    onChange={(e) => handleScoreRondasRepsChange(idEq, 'reps', e.target.value)}
                                  />
                                </>
                              );
                            }
                            
                            if (esTiempo) {
                              return (
                                <TimeInputMMSS
                                  value={scoresTemporales[idEq] || ''}
                                  onChange={(val) => handleScoreChange(idEq, val)}
                                  className="jz-score-input border-0 bg-transparent p-0 w-auto flex-grow-1"
                                />
                              );
                            }
                            return (
                              <input
                                type="text"
                                className="jz-score-input"
                                placeholder={tipoLower.includes('peso') ? "Ej. 155" : "Ej. 154"}
                                value={scoresTemporales[idEq] || ''}
                                onChange={(e) => handleScoreChange(idEq, e.target.value, tipo)}
                              />
                            );
                          })()}
                          <BotonSeguro
                            className="jz-btn-submit"
                            disabled={procesandoEq === idEq}
                            onClick={() => guardarScore(idEq)}
                            tiempoBloqueo={3000}
                            textoProcesando={<i className="fas fa-spinner fa-spin"></i>}
                          >
                            <><i className="fas fa-arrow-up"></i>Subir</>
                          </BotonSeguro>
                        </div>

                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="jz-empty-state">
            <i className="fas fa-clipboard-list"></i>
            <p>Selecciona WOD y Categoría para empezar a calificar.</p>
          </div>
        )}

      </div>
    </div>
  );
}
