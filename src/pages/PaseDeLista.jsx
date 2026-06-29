import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import RedGrayDatePicker from '../components/RedGrayDatePicker';
import BackButton from '../components/BackButton';
import AnimatedList from '../components/ReactBits/AnimatedList';
import WodPicker from '../components/WodPicker';
import '../assets/css/PaseDeLista.css';
import BotonSeguro from '../components/BotonSeguro';
import TimeInputMMSS from '../components/TimeInputMMSS';
import AtletifyLoader from '../components/AtletifyLoader';

const API_BASE = import.meta.env.VITE_API_URL;;

const getFechaLocalString = () => {
  const hoy = new Date();
  return hoy.getFullYear() + '-' +
    String(hoy.getMonth() + 1).padStart(2, '0') + '-' +
    String(hoy.getDate()).padStart(2, '0');
};

export default function PaseDeLista() {
  const navigate = useNavigate();
  const [box, setBox] = useState(null);

  const [fecha, setFecha] = useState(getFechaLocalString());

  const [clasesDelDia, setClasesDelDia] = useState([]);
  const [claseActiva, setClaseActiva] = useState(null);
  const [asistentes, setAsistentes] = useState([]);
  const [loading, setLoading] = useState(false);

  const [wodsDelDia, setWodsDelDia] = useState([]);
  const [wodActivo, setWodActivo] = useState(null);
  const [plantillaBase, setPlantillaBase] = useState(["Score Principal"]);
  const [nuevaMetrica, setNuevaMetrica] = useState('');

  const [pizarraExpandida, setPizarraExpandida] = useState(false);

  const [atletaMover, setAtletaMover] = useState(null);

  // ESTADOS PARA CALIFICACIÓN EN EQUIPO
  const [equipoSeleccionado, setEquipoSeleccionado] = useState([]);
  const [modalEquipoAbierto, setModalEquipoAbierto] = useState(false);
  const [scoreEquipoTemporal, setScoreEquipoTemporal] = useState({});
  const [esRxEquipo, setEsRxEquipo] = useState(true);

  const getModalidadEquipo = () => {
    if (!wodActivo || !wodActivo.bloques || wodActivo.bloques.length === 0) return { esEquipo: false, maxPermitidos: 1 };
    const b = wodActivo.bloques.find(bl => bl.tipoBloque === 'WOD') || wodActivo.bloques[0];
    const modo = (b.modalidadEquipo || "Individual").toLowerCase();

    if (modo.includes("pareja")) return { esEquipo: true, maxPermitidos: 2 };
    if (modo.includes("trío") || modo.includes("trio")) return { esEquipo: true, maxPermitidos: 3 };
    if (modo.includes("squad")) return { esEquipo: true, maxPermitidos: 4 };

    return { esEquipo: false, maxPermitidos: 1 };
  };

  const { esEquipo, maxPermitidos } = getModalidadEquipo();

  useEffect(() => {
    const b = JSON.parse(localStorage.getItem('box'));
    const u = JSON.parse(localStorage.getItem('usuario'));
    if (!b || !u || (u.rol !== 'AdminBox' && u.rol !== 'Coach' && u.rol !== 'Developer')) {
      navigate('/');
      return;
    }
    setBox(b);
    cargarDatosDelDia(b.idBox, getFechaLocalString());
  }, [navigate]);

  async function cargarDatosDelDia(idBox, fechaStr) {
    setLoading(true);
    try {
      const u = JSON.parse(localStorage.getItem('usuario')) || {};
      const idUsuario = u.idUsuario || u.IdUsuario || u.id || 0;

      const [resClases, resWods] = await Promise.all([
        fetch(`${API_BASE}/asistencias/box/${idBox}/fecha/${fechaStr}?idUsuario=${idUsuario}`),
        fetch(`${API_BASE}/entrenamientos/box/${idBox}`)
      ]);

      if (resClases.ok) {
        setClasesDelDia(await resClases.json());
        setClaseActiva(null);
        setAsistentes([]);
        setPizarraExpandida(false);
      }

      if (resWods.ok) {
        const wods = await resWods.json();
        // Los WODs personales no entran al pase de lista de clases (su score es aparte).
        const wodsHoy = wods.filter(w => w.fechaProgramada.includes(fechaStr) && !w.esPersonal);
        setWodsDelDia(wodsHoy);

        if (wodsHoy.length > 0) {
          seleccionarWodActivo(wodsHoy[0]);
        } else {
          setWodActivo(null);
          setPlantillaBase(["Score Principal"]);
        }
      }
    } catch (error) { console.error(error); }
    finally { setLoading(false); }
  }

  const forzarCambioWod = async (idAsistencia, idNuevoWod) => {
    try {
      const res = await fetch(`${API_BASE}/asistencias/${idAsistencia}/cambiar-wod`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ IdWodElegido: parseInt(idNuevoWod) })
      });
      if (res.ok) {
        setAsistentes(prev => prev.map(a => a.idAsistencia === idAsistencia ? { ...a, idWodElegido: idNuevoWod } : a));
      }
    } catch (e) { alert("Error al forzar el cambio"); }
  };

  const seleccionarWodActivo = (wod) => {
    setWodActivo(wod);
    if (wod && wod.bloques) {
      const bloquePrincipal = wod.bloques.find(b => b.tipoBloque === 'WOD') || wod.bloques[0];
      if (bloquePrincipal && bloquePrincipal.plantillaJueceo) {
        let pb = JSON.parse(bloquePrincipal.plantillaJueceo);
        if (pb.length === 1 && pb[0] === 'Rondas + Repeticiones') {
          pb = ['Rondas', 'Repeticiones'];
        }
        setPlantillaBase(pb);
      } else { setPlantillaBase(["Score Principal"]); }
    } else { setPlantillaBase(["Score Principal"]); }
  };

  async function toggleClase(idClase) {
    if (claseActiva === idClase && pizarraExpandida) {
      setPizarraExpandida(false);
      return;
    }

    if (claseActiva !== idClase) {
      setLoading(true);
      setClaseActiva(idClase);
      setEquipoSeleccionado([]); // Limpiar equipo al cambiar de clase

      try {
        const res = await fetch(`${API_BASE}/asistencias/clase/${idClase}/fecha/${fecha}`);
        if (res.ok) {
          const data = await res.json();
          const asistentesConScoreObj = data.map(a => {
            let scoreObj = {};
            let nombreWodGuardado = null;

            try {
              if (a.resultadoWod && a.resultadoWod.startsWith('{')) {
                const paquete = JSON.parse(a.resultadoWod);
                nombreWodGuardado = paquete.nombreWod || null;
                if (paquete.metricasDetalle) {
                  scoreObj = paquete.metricasDetalle;
                } else if (paquete.textoDisplay !== undefined) {
                  scoreObj[plantillaBase[0]] = paquete.textoDisplay;
                } else { scoreObj = paquete; }
              } else if (a.resultadoWod) {
                scoreObj[plantillaBase[0]] = a.resultadoWod;
              }
            } catch (e) { scoreObj[plantillaBase[0]] = a.resultadoWod || ''; }

            plantillaBase.forEach(metrica => {
              if (scoreObj[metrica] === undefined) scoreObj[metrica] = '';
            });

            return { ...a, scoreObj, rxInput: a.esRx || false, nombreWodGuardado };
          });
          setAsistentes(asistentesConScoreObj);
        }
      } catch (error) { console.error(error); }
      finally { setLoading(false); }
    }
    setPizarraExpandida(true);
  }

  async function cambiarEstadoAsistencia(idAsistencia, nuevoEstado) {
    try {
      const res = await fetch(`${API_BASE}/asistencias/marcar/${idAsistencia}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nuevoEstado)
      });
      if (res.ok) {
        setAsistentes(prev => prev.map(a => a.idAsistencia === idAsistencia ? { ...a, estado: nuevoEstado } : a));

        // Auto-seleccionar si es WOD de equipo y apenas asiste
        if (nuevoEstado === 'Asistió' && esEquipo) {
          // Calculamos el límite dinámico usando los asistentes actuales + este nuevo (porque el estado se actualizará en breve)
          const asistentesPrevios = asistentes.filter(a => a.estado === 'Asistió' && !a.esVisitaDropIn && a.idAsistencia !== idAsistencia).length;
          const numAsistentes = asistentesPrevios + 1;
          const sobrantes = numAsistentes % maxPermitidos;
          const limiteDinamico = sobrantes === 0 ? maxPermitidos : maxPermitidos + sobrantes;

          setEquipoSeleccionado(prev => {
            if (!prev.includes(idAsistencia) && prev.length < limiteDinamico) {
              return [...prev, idAsistencia];
            }
            return prev;
          });
        }
      }
    } catch (error) { alert("Error al cambiar estado"); }
  }

  // --- LÓGICA DE CALIFICACIÓN EN EQUIPO ---
  const toggleSeleccionEquipo = (idAsistencia, maxPermitidos) => {
    setEquipoSeleccionado(prev => {
      if (prev.includes(idAsistencia)) return prev.filter(id => id !== idAsistencia);

      const numAsistentes = asistentes.filter(a => a.estado === 'Asistió' && !a.esVisitaDropIn).length;
      const sobrantes = numAsistentes % maxPermitidos;
      const limiteDinamico = sobrantes === 0 ? maxPermitidos : maxPermitidos + sobrantes;

      if (prev.length >= limiteDinamico) {
        if (sobrantes === 0) {
          alert(`Esta clase tiene equipos completos. El límite es estrictamente de ${maxPermitidos} atletas.`);
        } else {
          alert(`Solo puedes incluir a los ${sobrantes} atletas sobrantes (Máximo ${limiteDinamico} selecciones).`);
        }
        return prev;
      }

      return [...prev, idAsistencia];
    });
  };

  const abrirModalEquipo = () => {
    // Inicializar el scoreTemporal con vacíos o basados en la plantilla
    const obj = {};
    plantillaBase.forEach(m => obj[m] = '');
    setScoreEquipoTemporal(obj);
    setEsRxEquipo(true);
    setModalEquipoAbierto(true);
  };

  const guardarScoreEquipo = async () => {
    if (equipoSeleccionado.length === 0) return;
    setLoading(true);

    // Disparar las promesas para guardar el score idéntico en todos los seleccionados
    const promesas = equipoSeleccionado.map(id => guardarScore(id, scoreEquipoTemporal, esRxEquipo, true));
    await Promise.all(promesas);

    setLoading(false);
    setEquipoSeleccionado([]);
    setModalEquipoAbierto(false);
    alert(`¡Score asignado exitosamente a los ${equipoSeleccionado.length} miembros del equipo!`);
  };

  const confirmarMovimiento = async (idNuevaClase) => {
    try {
      const res = await fetch(`${API_BASE}/asistencias/mover/${atletaMover.idAsistencia}/${idNuevaClase}`, { method: 'PUT' });
      if (res.ok) {
        alert(`¡${atletaMover.nombreUsuario} fue movido con éxito! ⚡`);
        setAtletaMover(null);
        cargarDatosDelDia(box.idBox, fecha);
      } else {
        alert("Error al mover al atleta.");
      }
    } catch (e) { alert("Error de conexión"); }
  };

  async function guardarScore(idAsistencia, scoreObj, esRx, silencioso = false) {
    try {
      let tipoMedida = "For Time";
      if (wodActivo && wodActivo.bloques && wodActivo.bloques.length > 0) {
        const bloquePrincipal = wodActivo.bloques.find(b => b.tipoBloque === 'WOD') || wodActivo.bloques[0];
        tipoMedida = wodActivo.modoRanking === 'Auto' ? wodActivo.metricaPrincipal : (bloquePrincipal.tipoModalidad || "For Time");
      }

      const metricasLimpias = {};
      plantillaBase.forEach(metrica => {
        metricasLimpias[metrica] = scoreObj[metrica] || '';
      });

      let scoreTexto = "";
      let valorParaOrdenar = 0;
      const tipoUpper = tipoMedida.toUpperCase();

      if (tipoUpper === 'RONDASREPS' || (plantillaBase.includes('Rondas') && plantillaBase.includes('Repeticiones'))) {
        const rondas = parseInt(metricasLimpias['Rondas']) || 0;
        const reps = parseInt(metricasLimpias['Repeticiones']) || 0;
        valorParaOrdenar = (rondas * 10000) + reps;
        scoreTexto = `${rondas} Rondas + ${reps} Reps`;
      } else {
        const metricaPrincipal = plantillaBase[0];
        scoreTexto = metricasLimpias[metricaPrincipal] || "";

        if (tipoUpper.includes('TIME') || tipoUpper.includes('TIEMPO')) {
          if (scoreTexto.toUpperCase().includes('DNF')) {
            valorParaOrdenar = 999999;
          } else {
            const partes = scoreTexto.split(':');
            if (partes.length === 2) {
              valorParaOrdenar = (parseInt(partes[0]) * 60) + parseInt(partes[1]);
            } else { valorParaOrdenar = parseInt(scoreTexto) || 0; }
          }
        } else {
          valorParaOrdenar = parseFloat(scoreTexto) || 0;
        }
      }

      const paqueteScore = {
        valorOrdenamiento: valorParaOrdenar,
        textoDisplay: scoreTexto.toUpperCase(),
        tipoMedida: tipoMedida,
        nombreWod: wodActivo ? wodActivo.titulo : 'WOD',
        comentarios: null,
        metricasDetalle: metricasLimpias
      };

      const scoreJSON = JSON.stringify(paqueteScore);

      const res = await fetch(`${API_BASE}/asistencias/score/${idAsistencia}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ resultadoWod: scoreJSON, esRx: esRx })
      });

      if (res.ok) {
        if (!silencioso) alert("¡Score validado en la Pizarra Oficial! 🏆");
        setAsistentes(prev => prev.map(a => a.idAsistencia === idAsistencia ? { ...a, resultadoWod: scoreJSON, scoreObj: metricasLimpias, esRx: esRx, nombreWodGuardado: wodActivo.titulo } : a));
      }
    } catch (error) { if (!silencioso) alert("Error al guardar score"); }
  }

  const guardarTodosLosScores = async (e) => {
    e.stopPropagation();
    if (!await window.wpConfirm("¿Guardar y enviar todos los scores que hayas llenado en esta clase?")) return;

    setLoading(true);
    const promesas = asistentes.filter(a => {
      const noBloqueado = !a.nombreWodGuardado || a.nombreWodGuardado === wodActivo.titulo;
      const tieneDatos = plantillaBase.some(m => a.scoreObj[m] !== undefined && a.scoreObj[m].toString().trim() !== '');
      return noBloqueado && tieneDatos && a.estado === 'Asistió';
    }).map(a => guardarScore(a.idAsistencia, a.scoreObj, a.rxInput, true));

    await Promise.all(promesas);
    setLoading(false);
    alert("¡Todos los scores válidos han sido enviados a la Pizarra! 🚀");
  };

  async function limpiarScore(idAsistencia) {
    if (!await window.wpConfirm("¿Eliminar este score por completo de la base de datos?")) return;
    try {
      const res = await fetch(`${API_BASE}/asistencias/score/${idAsistencia}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ resultadoWod: null, esRx: false })
      });
      if (res.ok) {
        alert("Score eliminado 🗑️");
        setAsistentes(prev => prev.map(a => {
          if (a.idAsistencia === idAsistencia) {
            const objLimpio = {};
            plantillaBase.forEach(m => objLimpio[m] = '');
            return { ...a, resultadoWod: null, scoreObj: objLimpio, rxInput: false };
          }
          return a;
        }));
      }
    } catch (e) { alert("Error al eliminar"); }
  }

  const handleScoreObjChange = (idAsistencia, metrica, valor) => {
    let finalValor = valor;
    // La normalización numérica por nombre (rondas/reps/peso) solo aplica a las métricas
    // del sistema (modo Auto). En modo Manual las métricas las define el coach y son texto
    // libre: no se recortan (ej. "30 lb DB", "saltos dobles", "9:40 c/35lb").
    const esAuto = wodActivo?.modoRanking === 'Auto';
    if (esAuto) {
      const mLower = metrica.toLowerCase();
      if (mLower.includes('ronda')) {
        finalValor = valor.replace(/[^0-9]/g, '');
        if (parseInt(finalValor) > 50) finalValor = '50';
      } else if (mLower.includes('rep')) {
        finalValor = valor.replace(/[^0-9]/g, '');
        if (parseInt(finalValor) > 100) finalValor = '100';
      } else if (mLower.includes('peso')) {
        finalValor = valor.replace(/[^0-9.]/g, '');
        if (parseFloat(finalValor) > 500) finalValor = '500';
      }
    }
    setAsistentes(prev => prev.map(a => a.idAsistencia === idAsistencia ? { ...a, scoreObj: { ...a.scoreObj, [metrica]: finalValor } } : a));
  };

  const handleRxChange = (idAsistencia, valorRx) => {
    setAsistentes(prev => prev.map(a => a.idAsistencia === idAsistencia ? { ...a, rxInput: valorRx } : a));
  };

  const agregarMetricaATodos = () => {
    if (!nuevaMetrica.trim()) return;
    const metrica = nuevaMetrica.trim();
    setPlantillaBase([...plantillaBase, metrica]);
    setAsistentes(prev => prev.map(a => ({ ...a, scoreObj: { ...a.scoreObj, [metrica]: '' } })));
    setNuevaMetrica('');
  };

  const renderClaseItem = (clase, index) => (
    <>
      {/* ── CABECERA DE CLASE ── */}
      <div
        key={clase.idClase}
        onClick={() => toggleClase(clase.idClase)}
        className={`pdl-clase-card ${claseActiva === clase.idClase ? 'pdl-clase-card--active' : ''}`}
      >
        <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-2">
          <div className="d-flex align-items-center gap-3">
            <div className="pdl-clase-icon">
              <i className="fas fa-clock"></i>
            </div>
            <div>
              <p className="pdl-clase-nombre">
                {clase.horaInicio.substring(0, 5)} — {clase.nombre}
              </p>
              <p className="pdl-clase-coach">
                <i className="fas fa-user-tie opacity-50"></i> {clase.coach}
              </p>
              {clase.esMiSustitucion && (
                <span className="pdl-relevo-badge">
                  <i className="fas fa-right-left"></i> Estás cubriendo a {clase.coachTitular}
                </span>
              )}
            </div>
          </div>

          <div className="d-flex align-items-center gap-2">
            <span className={`pdl-cap-badge ${clase.inscritos >= clase.maximoAtletas ? 'pdl-cap-badge--full' : ''}`}>
              <i className="fas fa-users"></i>{clase.inscritos}/{clase.maximoAtletas}
            </span>
            <i className={`fas fa-chevron-down pdl-chevron ${claseActiva === clase.idClase && pizarraExpandida ? 'pdl-chevron--up' : ''}`}></i>
          </div>
        </div>
      </div>

      {/* ── PANEL EXPANDIDO (PIZARRA) ── */}
      {claseActiva === clase.idClase && pizarraExpandida && (
        <div className="pdl-pizarra">

          {/* Header de la pizarra */}
          <div className="pdl-pizarra-header d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-2">
            <p className="pdl-pizarra-title">
              <i className="fas fa-trophy"></i> Evaluación de Clase
              {esEquipo ? (
                <span className="badge bg-warning text-dark ms-2 fw-bold border border-warning" style={{ fontSize: '0.65rem', letterSpacing: '0.5px' }}>
                  <i className="fas fa-users me-1"></i>
                  {wodActivo?.bloques?.find(b => b.tipoBloque === 'WOD')?.modalidadEquipo?.toUpperCase() || "EQUIPO"}
                </span>
              ) : (
                <span className="badge bg-secondary bg-opacity-25 text-secondary ms-2 fw-normal border border-secondary border-opacity-25" style={{ fontSize: '0.65rem', letterSpacing: '0.5px' }}>
                  <i className="fas fa-user me-1"></i>
                  INDIVIDUAL
                </span>
              )}
            </p>
            <div className="d-flex gap-2 align-items-center">
              {equipoSeleccionado.length > 0 && !modalEquipoAbierto && (
                <BotonSeguro
                  onClick={abrirModalEquipo}
                  className="pdl-guardar-todos-btn"
                  style={{ background: 'linear-gradient(135deg, var(--accent) 0%, #e09510 100%)', color: '#111', border: '1px solid rgba(245, 166, 35, 0.5)' }}
                  tiempoBloqueo={500}
                  textoProcesando="..."
                >
                  <i className="fas fa-users"></i>
                  <span className="d-none d-sm-inline">Calificar Equipo ({equipoSeleccionado.length})</span>
                </BotonSeguro>
              )}
              {wodActivo && (
                <BotonSeguro onClick={guardarTodosLosScores} className="pdl-guardar-todos-btn" tiempoBloqueo={2000} textoProcesando="Guardando...">
                  <i className="fas fa-rocket"></i>
                  <span>Guardar Todos</span>
                </BotonSeguro>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); setPizarraExpandida(false); }}
                className="pdl-close-pizarra-btn"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
          </div>

          {/* Cuerpo de la pizarra */}
          <div className="p-3 p-md-4">
            {loading ? (
              <div className="pdl-loading">
                <AtletifyLoader />
              </div>
            ) : asistentes.length === 0 ? (
              <div className="pdl-empty">
                <i className="fas fa-user-slash"></i>
                <p>Nadie se ha inscrito a esta clase aún</p>
              </div>
            ) : (
              <div className="d-flex flex-column gap-3">
                {asistentes.map((a) => (
                  <div key={a.idAsistencia} className="pdl-atleta-card">

                    {/* Fila superior: avatar + nombre + asistencia */}
                    <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-3">

                      <div className="d-flex align-items-center gap-3">
                        {esEquipo && !a.esVisitaDropIn && a.estado === 'Asistió' && (
                          <div className="form-check m-0 pdl-team-checkbox">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              style={{ transform: 'scale(1.5)', cursor: 'pointer' }}
                              checked={equipoSeleccionado.includes(a.idAsistencia)}
                              onChange={(e) => { e.stopPropagation(); toggleSeleccionEquipo(a.idAsistencia, maxPermitidos); }}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                        )}
                        <div className="pdl-atleta-avatar">
                          {a.nombreUsuario.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="d-flex align-items-center gap-2">
                            <p className="pdl-atleta-nombre mb-0">{a.nombreUsuario}</p>

                            {a.esVisitaDropIn && (
                              <span className="badge bg-danger text-white rounded-pill px-2 shadow-sm border border-danger border-opacity-50" style={{ fontSize: '0.6rem' }}><i className="fas fa-plane-arrival me-1"></i> TURISTA</span>
                            )}

                            {!a.esVisitaDropIn && a.idWodElegido === null ? (
                              <span className="badge bg-warning text-dark rounded-pill px-2" style={{ fontSize: '0.6rem' }}><i className="fas fa-headphones"></i> OPEN GYM</span>
                            ) : !a.esVisitaDropIn && (
                              <span className="badge bg-info text-dark rounded-pill px-2" style={{ fontSize: '0.6rem' }}><i className="fas fa-dumbbell"></i> WOD</span>
                            )}
                          </div>
                          {!a.esVisitaDropIn && (
                            <div>
                              {a.estado === 'Asistió' && (
                                <span className="badge-estado-activo" style={{ fontSize: '0.72rem' }}>
                                  <i className="fas fa-check me-1"></i>Presente
                                </span>
                              )}
                              {a.estado === 'Faltó' && (
                                <span className="badge-estado-inactivo" style={{ fontSize: '0.72rem' }}>
                                  <i className="fas fa-times me-1"></i>Faltó
                                </span>
                              )}
                              {a.estado === 'Reservado' && (
                                <span className="badge-estado-pendiente" style={{ fontSize: '0.72rem' }}>
                                  <i className="fas fa-clock me-1"></i>Pendiente
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {!a.esVisitaDropIn && (
                        <div className="d-flex gap-2">
                          <BotonSeguro
                            onClick={(e) => { e.stopPropagation(); cambiarEstadoAsistencia(a.idAsistencia, 'Asistió'); }}
                            className={`pdl-asistencia-btn ${a.estado === 'Asistió' ? 'pdl-asistencia-btn--presente' : ''}`}
                            title="Asistió"
                            tiempoBloqueo={1000}
                            textoProcesando={<i className="fas fa-spinner fa-spin"></i>}
                          >
                            <i className="fas fa-check"></i>
                          </BotonSeguro>
                          <BotonSeguro
                            onClick={(e) => { e.stopPropagation(); cambiarEstadoAsistencia(a.idAsistencia, 'Faltó'); }}
                            className={`pdl-asistencia-btn ${a.estado === 'Faltó' ? 'pdl-asistencia-btn--falto' : ''}`}
                            title="Faltó"
                            tiempoBloqueo={1000}
                            textoProcesando={<i className="fas fa-spinner fa-spin"></i>}
                          >
                            <i className="fas fa-times"></i>
                          </BotonSeguro>
                          <button
                            onClick={(e) => { e.stopPropagation(); setAtletaMover(a); }}
                            className="pdl-mover-btn"
                            title="Mover a otra clase"
                          >
                            <i className="fas fa-exchange-alt"></i>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Zona de score (solo si asistió y hay WOD activo) */}
                    {/* Zona de score */}
                    {a.estado === 'Asistió' && (() => {

                      // 🛡️ BLOQUEO POR TURISMO (Drop-In Fase 2)
                      if (a.esVisitaDropIn) {
                        return (
                          <div className="pdl-bloqueado p-3 rounded-4 bg-black bg-opacity-25 border border-danger border-opacity-25 mt-3 d-flex flex-column align-items-center gap-2 text-center">
                            <i className="fas fa-camera text-danger bg-danger bg-opacity-10 p-3 rounded-circle fs-4 mb-2"></i>
                            <p className="text-secondary small m-0 px-md-5">Al ser un atleta visitante, sus puntuaciones no ingresarán al pizarrón local por el momento. <br /><br /><strong className="text-white">¡Asegúrate que tenga la mejor experiencia, Coach! 🐺</strong></p>
                          </div>
                        );
                      }

                      if (!wodActivo) return null;

                      // 🧘 DÍA SIN MÉTRICA: descarga / cardio / pierna libre. Solo se pasa lista.
                      if (wodActivo.requiereScore === false) {
                        return (
                          <div className="pdl-bloqueado p-3 rounded-4 bg-black bg-opacity-25 border border-info border-opacity-25 mt-3 d-flex align-items-center gap-3">
                            <i className="fas fa-mug-hot text-info fs-4"></i>
                            <p className="text-secondary small m-0">
                              Este WOD <strong className="text-white">no requiere score</strong>: con marcar asistencia basta. Queda guardado en su historial.
                            </p>
                          </div>
                        );
                      }

                      // 🛡️ BLOQUEO ESTRICTO BASADO EN LA ELECCIÓN REAL DEL ATLETA
                      const esOpenGym = a.idWodElegido === null;
                      const esOtroWod = a.idWodElegido !== null && a.idWodElegido !== wodActivo.idEntrenamiento;
                      const estaBloqueado = esOpenGym || esOtroWod;

                      if (estaBloqueado) {
                        return (
                          <div className="pdl-bloqueado d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-3">
                            <div>
                              <p className="pdl-bloqueado-title text-warning">
                                <i className={`fas ${esOpenGym ? 'fa-headphones' : 'fa-random'}`}></i>
                                {esOpenGym ? 'OPEN GYM' : 'OTRO WOD'}
                              </p>
                              <p className="pdl-bloqueado-desc">
                                El atleta eligió {esOpenGym ? 'entrenamiento libre' : 'otra programación'}.
                              </p>
                            </div>
                            <BotonSeguro
                              onClick={(e) => { e.stopPropagation(); forzarCambioWod(a.idAsistencia, wodActivo.idEntrenamiento); }}
                              className="pdl-desbloquear-btn px-4"
                              tiempoBloqueo={2000}
                              textoProcesando="Aplicando..."
                            >
                              <i className="fas fa-hand-holding-water me-1"></i>Traer a este WOD
                            </BotonSeguro>
                          </div>
                        );
                      }

                      // ... (Aquí sigue tu código normal del return <div className="pdl-score-zona">) ...

                      return (
                        <div className="pdl-score-zona">
                          <div className="row g-2 align-items-end mb-3">
                            {plantillaBase.map(metrica => {
                              let tipoMedida = "For Time";
                              if (wodActivo && wodActivo.bloques && wodActivo.bloques.length > 0) {
                                const bloquePrincipal = wodActivo.bloques.find(b => b.tipoBloque === 'WOD') || wodActivo.bloques[0];
                                tipoMedida = wodActivo.modoRanking === 'Auto' ? wodActivo.metricaPrincipal : (bloquePrincipal.tipoModalidad || "For Time");
                              }

                              const mLower = metrica.toLowerCase();
                              const isMainMetric = metrica === plantillaBase[0];
                              // Solo la métrica PRINCIPAL puede ser cronómetro. Las métricas extra
                              // son siempre texto libre (las define el coach y no están normalizadas),
                              // aunque su nombre contenga "tiempo".
                              const esTiempo = isMainMetric && (
                                mLower.includes('time') || mLower.includes('tiempo') ||
                                (tipoMedida && (tipoMedida.toLowerCase().includes('time') || tipoMedida.toLowerCase().includes('tiempo'))));

                              return (
                                <div key={metrica} className="col-12 col-md-6 col-lg-4">
                                  <label className="pdl-score-label">{metrica}</label>
                                  {esTiempo ? (
                                    <div onClick={(e) => e.stopPropagation()}>
                                      <TimeInputMMSS
                                        value={a.scoreObj[metrica] || ''}
                                        onChange={(val) => handleScoreObjChange(a.idAsistencia, metrica, val)}
                                        className="pdl-score-input border-0 bg-transparent p-0 d-flex m-0"
                                      />
                                    </div>
                                  ) : (
                                    <input
                                      type="text"
                                      className="pdl-score-input"
                                      value={a.scoreObj[metrica] || ''}
                                      onChange={(e) => handleScoreObjChange(a.idAsistencia, metrica, e.target.value)}
                                      onClick={(e) => e.stopPropagation()}
                                      placeholder="..."
                                    />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                          <div className="d-flex gap-2 align-items-center">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleRxChange(a.idAsistencia, !a.rxInput); }}
                              className={`pdl-rx-btn ${a.rxInput ? 'pdl-rx-btn--active' : ''}`}
                            >
                              {a.rxInput
                                ? <><i className="fas fa-fire me-1"></i>RX</>
                                : <><i className="fas fa-arrow-down me-1"></i>Scaled</>
                              }
                            </button>
                            <BotonSeguro
                              onClick={(e) => { e.stopPropagation(); guardarScore(a.idAsistencia, a.scoreObj, a.rxInput); }}
                              className="pdl-guardar-score-btn"
                              tiempoBloqueo={1500}
                              textoProcesando="Guardando..."
                            >
                              <i className="fas fa-save"></i>
                              <span>Guardar</span>
                            </BotonSeguro>
                            <BotonSeguro
                              onClick={(e) => { e.stopPropagation(); limpiarScore(a.idAsistencia); }}
                              className="pdl-delete-score-btn"
                              title="Eliminar Score"
                              tiempoBloqueo={2000}
                              textoProcesando={<i className="fas fa-spinner fa-spin"></i>}
                            >
                              <i className="fas fa-trash-alt"></i>
                            </BotonSeguro>
                          </div>
                        </div>
                      );
                    })()}

                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );

  // En el pase de lista el coach debe ver TODAS sus clases del día (titular o relevo), sin
  // importar a qué WOD esté asignada cada una. El filtro por WOD solo aplica a la vista admin.
  const usuarioActual = JSON.parse(localStorage.getItem('usuario')) || {};
  const isCoachActual = (usuarioActual.rol || usuarioActual.Rol) === 'Coach';
  const clasesFiltradas = (!isCoachActual && wodActivo && wodActivo.clasesAsignadas && wodActivo.clasesAsignadas.length > 0)
    ? clasesDelDia.filter(c => wodActivo.clasesAsignadas.some(ca => ca.idClase === c.idClase))
    : clasesDelDia;

  return (
    <div className="pdl-page">

      {/* ══════════════════════════════════
          HEADER
      ══════════════════════════════════ */}
      <header className="pdl-header">
        <div className="d-flex align-items-center justify-content-between gap-3">
          <div className="d-flex align-items-center gap-3">
            <BackButton to="/admin-box-panel" />
            <div className="pdl-header-icon d-none d-sm-flex">
              <i className="fas fa-gavel"></i>
            </div>
            <h1 className="pdl-header-title">
              Modo <span>Juez</span>
            </h1>
          </div>
          <RedGrayDatePicker
            value={fecha}
            onChange={(value) => { setFecha(value); cargarDatosDelDia(box.idBox, value); }}
          />
        </div>
      </header>

      <div className="container-xl px-3 px-md-4">

        {/* ══════════════════════════════════
            TARJETA DE SELECCIÓN DE WOD
        ══════════════════════════════════ */}
        {wodsDelDia.length > 0 && wodActivo && (
          <div className="pdl-wod-card">
            <div className="row g-4 align-items-start align-items-lg-center">

              {/* Selector de WOD + badges */}
              <div className="col-12 col-lg-7">
                <label className="pdl-wod-label">
                  <i className="fas fa-list me-2"></i>WODs Disponibles Hoy
                </label>
                <WodPicker
                  wods={wodsDelDia}
                  valor={wodActivo.idEntrenamiento}
                  onCambiar={seleccionarWodActivo}
                />

                <div className="d-flex flex-wrap gap-2 mt-3 align-items-center">
                  {wodActivo.requiereScore === false ? (
                    <span className="pdl-badge-sinscore">
                      <i className="fas fa-mug-hot"></i>
                      Sin score · solo asistencia
                    </span>
                  ) : wodActivo.modoRanking === 'Auto' ? (
                    <span className="pdl-badge-auto">
                      <i className="fas fa-robot"></i>
                      Automático ({wodActivo.metricaPrincipal})
                    </span>
                  ) : (
                    <span className="pdl-badge-manual">
                      <i className="fas fa-gavel"></i>
                      Ranking Manual
                    </span>
                  )}
                  {wodActivo.requiereScore !== false && wodActivo.modoRanking === 'Manual' && (
                    <button
                      onClick={() => navigate(`/ranking-manual/${wodActivo.idEntrenamiento}`)}
                      className="pdl-jueceo-btn"
                    >
                      <i className="fas fa-sort-amount-down me-1"></i>Cuarto de Jueceo
                    </button>
                  )}
                </div>

                <p className="pdl-metricas-count">
                  <i className="fas fa-clipboard-list me-2 opacity-50"></i>
                  {wodActivo.requiereScore === false
                    ? 'Este WOD no requiere score: con marcar asistencia basta.'
                    : `${plantillaBase.length} ${plantillaBase.length === 1 ? 'métrica' : 'métricas'} a evaluar por atleta`}
                </p>
              </div>

              {/* Input de nueva métrica (no aplica en WODs sin score) */}
              {wodActivo.requiereScore !== false && (
                <div className="col-12 col-lg-5">
                  <div className="d-flex gap-2 align-items-center w-100">
                    <input
                      type="text"
                      className="pdl-nueva-metrica-input"
                      placeholder="Nueva métrica..."
                      value={nuevaMetrica}
                      onChange={(e) => setNuevaMetrica(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && agregarMetricaATodos()}
                    />
                    <button onClick={agregarMetricaATodos} className="pdl-agregar-metrica-btn">
                      <i className="fas fa-plus me-1"></i>Agregar
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

        {/* ══════════════════════════════════
            LISTA DE CLASES
        ══════════════════════════════════ */}
        <div className="mb-4">
          {loading ? (
            <div className="pdl-loading">
              <AtletifyLoader />
            </div>
          ) : clasesFiltradas.length === 0 ? (
            <div className="pdl-empty">
              <i className="fas fa-calendar-times"></i>
              <p>Este WOD no aplica a las clases de hoy o nadie se ha inscrito.</p>
            </div>
          ) : (
            <>
              {(() => {
                const usuarioLS = JSON.parse(localStorage.getItem('usuario')) || {};
                const isCoach = usuarioLS.rol === 'Coach' || usuarioLS.Rol === 'Coach';
                const misClases = isCoach ? clasesFiltradas.filter(c => c.esMiClase || c.EsMiClase) : clasesFiltradas;
                const otrasClases = isCoach ? clasesFiltradas.filter(c => !(c.esMiClase || c.EsMiClase)) : [];

                return (
                  <>
                    {misClases.length > 0 && (
                      <div className="mb-4">
                        <p className="pdl-section-label">
                          <i className="fas fa-calendar-day"></i>
                          {isCoach ? 'Mis Clases (Titular)' : 'Clases de este WOD'}
                          <span className="pdl-section-count">{misClases.length}</span>
                        </p>
                        <AnimatedList
                          items={misClases}
                          renderItem={renderClaseItem}
                          keyExtractor={(clase) => clase.idClase}
                          className="d-flex flex-column gap-3"
                          staggerDelay={0.1}
                          animateOnChange={false}
                        />
                      </div>
                    )}

                    {otrasClases.length > 0 && (
                      <div className="mb-4">
                        <p className="pdl-section-label text-muted">
                          <i className="fas fa-calendar-times"></i>
                          Otras Clases (Bloqueadas)
                          <span className="pdl-section-count bg-secondary">{otrasClases.length}</span>
                        </p>
                        <AnimatedList
                          items={otrasClases}
                          renderItem={(clase, index) => (
                            <div
                              key={clase.idClase}
                              className="pdl-clase-card"
                              style={{ opacity: 0.6, cursor: 'not-allowed' }}
                              onClick={() => alert('No puedes pasar lista en clases donde no eres el Coach titular. Pide al Admin que te asigne a esta clase si estás cubriendo una suplencia.')}
                            >
                              <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-2">
                                <div className="d-flex align-items-center gap-3">
                                  <div className="pdl-clase-icon bg-secondary">
                                    <i className="fas fa-lock text-white"></i>
                                  </div>
                                  <div>
                                    <p className="pdl-clase-nombre text-white-50">
                                      {clase.horaInicio.substring(0, 5)} — {clase.nombre}
                                    </p>
                                    <p className="pdl-clase-coach">
                                      <i className="fas fa-user-tie opacity-50"></i> {clase.coach}
                                    </p>
                                  </div>
                                </div>
                                <div className="d-flex align-items-center gap-2">
                                  <span className={`pdl-cap-badge bg-dark text-muted border-secondary ${clase.inscritos >= clase.maximoAtletas ? 'pdl-cap-badge--full' : ''}`}>
                                    <i className="fas fa-users"></i>{clase.inscritos}/{clase.maximoAtletas}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}
                          keyExtractor={(clase) => clase.idClase}
                          className="d-flex flex-column gap-3"
                          staggerDelay={0.1}
                          animateOnChange={false}
                        />
                      </div>
                    )}
                  </>
                );
              })()}
            </>
          )}
        </div>

      </div>

      {/* ══════════════════════════════════
          MODAL DE MOVER ATLETA
      ══════════════════════════════════ */}
      {atletaMover && (
        <div className="pdl-modal-overlay" onClick={() => setAtletaMover(null)}>
          <div className="pdl-modal" onClick={e => e.stopPropagation()}>

            <div className="pdl-modal-header">
              <p className="pdl-modal-title">
                <i className="fas fa-random"></i>Mover Atleta
              </p>
              <button onClick={() => setAtletaMover(null)} className="pdl-modal-close-btn">
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="pdl-modal-body">
              <p className="pdl-modal-sub">
                ¿A qué horario quieres mover a <strong>{atletaMover.nombreUsuario}</strong>?
              </p>

              <div className="d-flex flex-column gap-2">
                {clasesDelDia.filter(c => c.idClase !== claseActiva).length === 0 ? (
                  <div className="pdl-empty" style={{ padding: '2rem 1rem' }}>
                    <i className="fas fa-calendar-times" style={{ fontSize: '2rem' }}></i>
                    <p>No hay otras clases programadas para hoy.</p>
                  </div>
                ) : (
                  clasesDelDia.filter(c => c.idClase !== claseActiva).map(c => (
                    <BotonSeguro
                      key={c.idClase}
                      onClick={() => confirmarMovimiento(c.idClase)}
                      className="pdl-modal-clase-btn"
                      tiempoBloqueo={2000}
                      textoProcesando="Moviendo..."
                    >
                      <span>
                        <i className="far fa-clock me-2"></i>
                        {String(c.horarioInicio || c.horaInicio || '').substring(0, 5)} — {c.nombre}
                      </span>
                      <span className="pdl-modal-clase-badge">{c.inscritos}/{c.maximoAtletas}</span>
                    </BotonSeguro>
                  ))
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ══════════════════════════════════
          MODAL DE CALIFICACIÓN DE EQUIPO
      ══════════════════════════════════ */}
      {modalEquipoAbierto && (
        <div className="pdl-modal-overlay" onClick={() => setModalEquipoAbierto(false)}>
          <div className="pdl-modal pdl-modal--team" onClick={e => e.stopPropagation()}>
            <div className="pdl-modal-header">
              <p className="pdl-modal-title">
                <i className="fas fa-trophy text-warning"></i>Score de Equipo
              </p>
              <button onClick={() => setModalEquipoAbierto(false)} className="pdl-modal-close-btn">
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="pdl-modal-body">
              <p className="pdl-modal-sub text-center mb-4">
                Estás a punto de calificar a <strong>{equipoSeleccionado.length} atletas</strong> al mismo tiempo. ¡Todos recibirán este score!
              </p>

              <div className="row g-3 mb-4">
                {plantillaBase.map(metrica => {
                  let tipoMedida = "For Time";
                  if (wodActivo && wodActivo.bloques && wodActivo.bloques.length > 0) {
                    const bloquePrincipal = wodActivo.bloques.find(b => b.tipoBloque === 'WOD') || wodActivo.bloques[0];
                    tipoMedida = wodActivo.modoRanking === 'Auto' ? wodActivo.metricaPrincipal : (bloquePrincipal.tipoModalidad || "For Time");
                  }

                  const mLower = metrica.toLowerCase();
                  const isMainMetric = metrica === plantillaBase[0];
                  // Solo la métrica PRINCIPAL puede ser cronómetro; las extras son texto libre.
                  const esTiempo = isMainMetric && (
                    mLower.includes('time') || mLower.includes('tiempo') ||
                    (tipoMedida && (tipoMedida.toLowerCase().includes('time') || tipoMedida.toLowerCase().includes('tiempo'))));

                  return (
                    <div key={metrica} className="col-12">
                      <label className="pdl-score-label">{metrica}</label>
                      {esTiempo ? (
                        <div className="pdl-team-input-container">
                          <TimeInputMMSS
                            value={scoreEquipoTemporal[metrica] || ''}
                            onChange={(val) => setScoreEquipoTemporal(prev => ({ ...prev, [metrica]: val }))}
                            className="pdl-score-input pdl-score-input--team border-0 bg-transparent p-0 w-100"
                          />
                        </div>
                      ) : (
                        <input
                          type="text"
                          className="pdl-score-input pdl-score-input--team"
                          value={scoreEquipoTemporal[metrica] || ''}
                          onChange={(e) => setScoreEquipoTemporal(prev => ({ ...prev, [metrica]: e.target.value }))}
                          placeholder="..."
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="d-flex justify-content-center gap-3 mb-4">
                <button
                  onClick={() => setEsRxEquipo(true)}
                  className={`pdl-rx-btn pdl-rx-btn--team ${esRxEquipo ? 'pdl-rx-btn--active' : ''}`}
                >
                  <i className="fas fa-fire me-2"></i>RX
                </button>
                <button
                  onClick={() => setEsRxEquipo(false)}
                  className={`pdl-rx-btn pdl-rx-btn--team ${!esRxEquipo ? 'pdl-rx-btn--active' : ''}`}
                  style={{ opacity: !esRxEquipo ? 1 : 0.5, borderColor: !esRxEquipo ? '#fff' : 'transparent', color: '#fff', background: 'rgba(255,255,255,0.1)' }}
                >
                  <i className="fas fa-arrow-down me-2"></i>Scaled
                </button>
              </div>

              <BotonSeguro
                onClick={guardarScoreEquipo}
                className="pdl-guardar-score-btn w-100 py-3 d-flex justify-content-center fw-bold fs-6"
                tiempoBloqueo={1500}
                textoProcesando="Validando..."
              >
                <i className="fas fa-save me-2"></i>Aplicar a todo el equipo
              </BotonSeguro>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
