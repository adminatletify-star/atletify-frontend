import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { COMPETENCIAS_ENDPOINT } from '../services/api';
import BackButton from '../components/BackButton';
import '../assets/css/PortalLeaderboard.css';

export default function PortalLeaderboard() {
  const { id } = useParams();
  const [comp, setComp] = useState(null);
  const [roster, setRoster] = useState([]);
  const [wods, setWods] = useState([]);
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);

  const [idCatActiva, setIdCatActiva] = useState('');

  useEffect(() => {
    const cargarLeaderboard = async () => {
      try {
        const resComp = await fetch(`${COMPETENCIAS_ENDPOINT}/${id}`);
        const encontrada = await resComp.json();

        if (encontrada && (encontrada.idCompetencia || encontrada.IdCompetencia)) {
          setComp(encontrada);
          if (encontrada.categorias?.length > 0 && !idCatActiva) {
            setIdCatActiva(encontrada.categorias[0].idCategoriaComp || encontrada.categorias[0].IdCategoriaComp);
          }
        }

        const [resWods, resRoster, resScores] = await Promise.all([
          fetch(`${COMPETENCIAS_ENDPOINT}/${id}/wods`),
          fetch(`${COMPETENCIAS_ENDPOINT}/${id}/roster`),
          fetch(`${COMPETENCIAS_ENDPOINT}/${id}/scores-globales`)
        ]);

        setWods(await resWods.json());
        setRoster(await resRoster.json());
        setScores(await resScores.json());

      } catch (err) { console.error("Error cargando Leaderboard:", err); }
      finally { setLoading(false); }
    };

    cargarLeaderboard();
    const intervalo = setInterval(cargarLeaderboard, 30000); // Refrescar cada 30s
    return () => clearInterval(intervalo);
  }, [id, idCatActiva]);

  // =========================================================================
  // 🧠 EL CEREBRO MATEMÁTICO DE CROSSFIT
  // =========================================================================
  const leaderboardCalculado = useMemo(() => {
    if (!idCatActiva || roster.length === 0) return [];

    const categoriaActual = roster.find(c => (c.idCategoriaComp || c.IdCategoriaComp) == idCatActiva);
    let equiposEnPista = (categoriaActual?.equipos || categoriaActual?.Equipos || []).filter(eq => (eq.estatusPago || eq.EstatusPago) === 'Aprobado');

    // 1. Convertir los resultados de texto ("12:45") a valores matemáticos (segundos o libras)
    const parseScoreValue = (resultado, tipo) => {
      if (!resultado) return tipo === 'For Time' ? Infinity : -1; // Los que no tienen score van al fondo

      if (tipo === 'For Time') {
        // Convierte "12:45" a 765 segundos
        const partes = resultado.split(':');
        if (partes.length === 2) {
          return parseInt(partes[0]) * 60 + parseInt(partes[1]);
        }
        return Infinity; // Si escriben mal el tiempo
      } else if (tipo === 'Rondas + Repeticiones') {
        const regex = /(\d+)\s*Rondas\s*\+\s*(\d+)\s*Reps/i;
        const match = resultado.match(regex);
        if (match) {
          const rondas = parseInt(match[1]) || 0;
          const reps = parseInt(match[2]) || 0;
          return (rondas * 10000) + reps;
        }
        // Si por alguna razón escribieron el formato viejo o raro
        const num = parseFloat(resultado.replace(/[^\d.-]/g, ''));
        return isNaN(num) ? -1 : num;
      } else {
        // AMRAP o Peso (Extrae solo los números, ignora si le ponen " lbs" o " reps")
        const num = parseFloat(resultado.replace(/[^\d.-]/g, ''));
        return isNaN(num) ? -1 : num;
      }
    };

    // 2. Calcular los "Puntos" de cada equipo por WOD (1er lugar = 1 pt, 2do = 2 pts...)
    const rankPorWod = {}; // { idWod: { idEquipo: puntos } }

    wods.forEach(wod => {
      const idWod = wod.idWodComp || wod.IdWodComp;
      const tipo = wod.tipoCalificacion || wod.TipoCalificacion;
      rankPorWod[idWod] = {};

      // Sacar scores matemáticos de todos los equipos en ESTE WOD
      // Sacar scores matemáticos de todos los equipos en ESTE WOD
      let scoresMatematicos = equiposEnPista.map(eq => {
        const idEq = eq.idEquipoComp || eq.IdEquipoComp;
        // 👇 EL DOBLE FILTRO APLICADO AQUÍ (Ignora los pendientes) 👇
        const scoreEncontrado = scores.find(s =>
          s.idEquipoComp === idEq &&
          s.idWodComp === idWod &&
          (s.estatus === 'Aprobado' || s.Estatus === 'Aprobado')
        );

        return {
          idEquipo: idEq,
          valorAbsoluto: parseScoreValue(scoreEncontrado?.resultado, tipo),
          resultadoTexto: scoreEncontrado?.resultado || '--'
        };
      });

      // Ordenar: Para tiempo (menor a mayor). Para Peso/Reps (mayor a menor).
      scoresMatematicos.sort((a, b) => {
        if (tipo === 'For Time') return a.valorAbsoluto - b.valorAbsoluto;
        return b.valorAbsoluto - a.valorAbsoluto;
      });

      // Asignar los puntos (Ranks). Omitiremos empates complejos en esta V1 para no romper la cabeza.
      scoresMatematicos.forEach((scoreObj, index) => {
        // Si no tiene score (Infinity o -1), le damos el último lugar + 1 punto de castigo
        if (scoreObj.valorAbsoluto === Infinity || scoreObj.valorAbsoluto === -1) {
          rankPorWod[idWod][scoreObj.idEquipo] = equiposEnPista.length + 1;
        } else {
          rankPorWod[idWod][scoreObj.idEquipo] = index + 1;
        }
      });
    });

    // 3. Sumar los puntos totales y añadir la info a cada equipo
    const equiposConPuntos = equiposEnPista.map(eq => {
      const idEq = eq.idEquipoComp || eq.IdEquipoComp;
      let puntosTotales = 0;

      wods.forEach(wod => {
        const idWod = wod.idWodComp || wod.IdWodComp;
        puntosTotales += rankPorWod[idWod][idEq] || 0;
      });

      return { ...eq, puntosTotales, rankPorWod };
    });

    // 4. Ordenar la tabla final por quien tiene MENOS puntos totales (El Ganador)
    // 4. Ordenar la tabla: Si está el Modo Suspenso, los revolvemos (Orden Alfabético)
    if (comp?.podioCiego || comp?.PodioCiego) {
      equiposConPuntos.sort((a, b) => (a.nombre || a.Nombre).localeCompare(b.nombre || b.Nombre));
    } else {
      equiposConPuntos.sort((a, b) => a.puntosTotales - b.puntosTotales);
    }

    return equiposConPuntos;
  }, [idCatActiva, roster, wods, scores]);
  // =========================================================================

  if (loading) return (
    <div className="lb-spinner-wrapper">
      <div className="spinner-wp"></div>
    </div>
  );

  if (!comp) return <div className="alert alert-danger m-5">Competencia no encontrada.</div>;

  return (
    <div className="lb-root">

      {/* NAVBAR */}
      <nav className="lb-navbar">
        <div className="d-flex align-items-center gap-3">
          <BackButton to={`/portal-competencias/${id}`} />
          <div>
            <h2 className="lb-comp-name">{comp.nombre}</h2>
            <span className="lb-live-badge">
              <i className="fas fa-circle lb-live-dot"></i>LEADERBOARD EN VIVO
            </span>
          </div>
        </div>
        <img
          src="/wolfpack-logo.png"
          alt="Wolfpack"
          height="38"
          onError={(e) => e.target.style.display = 'none'}
        />
      </nav>

      <div className="container-fluid flex-grow-1 px-3 px-md-4 px-lg-5 py-4">

        {/* TÍTULO DE PÁGINA */}
        <div className="mb-4">
          <h1 className="lb-page-title">LEADER<span>BOARD</span></h1>
          <div className="lb-accent-line"></div>
        </div>

        {/* SELECTOR DE CATEGORÍAS */}
        <div className="lb-cats mb-4">
          {comp.categorias?.map(cat => (
            <button
              key={cat.idCategoriaComp}
              onClick={() => setIdCatActiva(cat.idCategoriaComp)}
              className={`lb-cat-btn ${idCatActiva == cat.idCategoriaComp ? 'activo' : ''}`}
            >
              {cat.nombre.toUpperCase()}
            </button>
          ))}
        </div>

        {/* TABLA DE RESULTADOS */}
        {leaderboardCalculado.length === 0 ? (
          <div className="lb-empty">
            <i className="fas fa-users-slash"></i>
            <h4>Pista Vacía</h4>
            <p>Aún no hay atletas aprobados en esta categoría.</p>
          </div>
        ) : (
          <div className="table-responsive lb-table-wrapper">
            <table className="lb-table">
              <thead>
                <tr>
                  <th className="ps-3">Posición / Equipo</th>
                  <th className="text-center">
                    <i className="fas fa-star me-1" style={{ color: 'var(--accent)' }}></i>
                    Puntos totales
                  </th>
                  {wods.map(w => (
                    <th key={w.idWodComp || w.IdWodComp} className="text-center">
                      <div className="lb-wod-nombre">{w.nombre || w.Nombre}</div>
                      <div className="lb-wod-tipo">{w.tipoCalificacion || w.TipoCalificacion}</div>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {leaderboardCalculado.map((eq, index) => {
                  const idEq = eq.idEquipoComp || eq.IdEquipoComp;
                  const modoSuspenso = comp?.podioCiego || comp?.PodioCiego;

                  const rankClase = modoSuspenso
                    ? 'lb-rank-secret'
                    : index === 0 ? 'lb-rank-1'
                    : index === 1 ? 'lb-rank-2'
                    : index === 2 ? 'lb-rank-3'
                    : 'lb-rank-other';

                  const filaClase = !modoSuspenso
                    ? index === 0 ? 'lb-row-1'
                    : index === 1 ? 'lb-row-2'
                    : index === 2 ? 'lb-row-3'
                    : ''
                    : '';

                  return (
                    <tr key={idEq} className={filaClase}>

                      {/* POSICIÓN + NOMBRE */}
                      <td className="ps-3">
                        <div className="d-flex align-items-center gap-3">
                          <div className={`lb-rank ${rankClase}`}>
                            {modoSuspenso ? '🤫' : index + 1}
                          </div>
                          <div>
                            <div className="lb-team-name">{eq.nombre || eq.Nombre}</div>
                            <div className="lb-team-box">
                              <i className="fas fa-map-marker-alt me-1" style={{ color: 'var(--primary)' }}></i>
                              {eq.boxOrigen || eq.BoxOrigen || 'Independiente'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* PUNTOS TOTALES */}
                      <td className="text-center">
                        {modoSuspenso ? (
                          <span className="lb-pts-secret">???</span>
                        ) : (
                          <div>
                            <div className="lb-pts-total">{eq.puntosTotales}</div>
                            <div className="lb-pts-label">pts totales</div>
                          </div>
                        )}
                      </td>

                      {/* SCORES POR WOD */}
                      {wods.map((w, indexWod) => {
                        const idWod = w.idWodComp || w.IdWodComp;
                        const scoreEncontrado = scores.find(s =>
                          s.idEquipoComp === idEq &&
                          s.idWodComp === idWod &&
                          (s.estatus === 'Aprobado' || s.Estatus === 'Aprobado')
                        );

                        const puntosWod = eq.rankPorWod[idWod]?.[idEq] || 0;
                        const esUltimoWod = indexWod === wods.length - 1;

                        return (
                          <td key={idWod} className="text-center">
                            {modoSuspenso && esUltimoWod ? (
                              <span className="lb-secret-badge">
                                <i className="fas fa-lock"></i>TOP SECRET
                              </span>
                            ) : scoreEncontrado ? (
                              <div>
                                <div className="lb-wod-score">{scoreEncontrado.resultado}</div>
                                <div className="lb-wod-rank">{modoSuspenso ? '?' : puntosWod} pts</div>
                              </div>
                            ) : (
                              <span className="lb-wod-empty">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </div>
  );
}
