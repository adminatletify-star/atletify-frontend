import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { COMPETENCIAS_ENDPOINT } from '../services/api';
import BackButton from '../components/BackButton';
import '../assets/css/PortalLeaderboard.css';
import AtletifyLoader from '../components/AtletifyLoader';
import { useCompetenciaLive } from '../hooks/useCompetenciaLive';

// El ranking se calcula en el BACKEND (GET {id}/leaderboard). Aquí solo se pinta.
// Se refresca en vivo por SignalR (useCompetenciaLive) + polling de respaldo.
export default function PortalLeaderboard() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [idCatActiva, setIdCatActiva] = useState('');
  const [loading, setLoading] = useState(true);
  const [refrescar, setRefrescar] = useState(0);

  useCompetenciaLive(id, { onScore: () => setRefrescar(r => r + 1) });

  useEffect(() => {
    let activo = true;
    const cargar = async () => {
      try {
        const r = await fetch(`${COMPETENCIAS_ENDPOINT}/${id}/leaderboard`);
        if (r.ok && activo) {
          const d = await r.json();
          setData(d);
          setIdCatActiva(prev => prev || (d.categorias?.[0]?.idCategoriaComp ?? ''));
        }
      } catch (err) { console.error('Error cargando leaderboard:', err); }
      finally { if (activo) setLoading(false); }
    };
    cargar();
    const intervalo = setInterval(cargar, 30000);
    return () => { activo = false; clearInterval(intervalo); };
  }, [id, refrescar]);

  if (loading) return <div className="lb-spinner-wrapper"><AtletifyLoader /></div>;
  if (!data) return <div className="alert alert-danger m-5">Competencia no encontrada.</div>;

  const suspenso = !!data.podioCiego;
  const catActiva = data.categorias?.find(c => String(c.idCategoriaComp) === String(idCatActiva));
  const wodsCat = (data.wods || []).filter(w => w.idCategoriaComp == null || String(w.idCategoriaComp) === String(idCatActiva));
  const equipos = catActiva?.equipos || [];

  return (
    <div className="lb-root">
      <nav className="lb-navbar">
        <div className="d-flex align-items-center gap-3">
          <BackButton to={`/portal-competencias/${id}`} />
          <div>
            <h2 className="lb-comp-name">{data.nombre}</h2>
            <span className="lb-live-badge"><i className="fas fa-circle lb-live-dot"></i>LEADERBOARD EN VIVO</span>
          </div>
        </div>
        <img src="/wolfpack-logo.png" alt="Wolfpack" height="38" onError={(e) => e.target.style.display = 'none'} />
      </nav>

      <div className="container-fluid flex-grow-1 px-3 px-md-4 px-lg-5 py-4">
        <div className="mb-4">
          <h1 className="lb-page-title">LEADER<span>BOARD</span></h1>
          <div className="lb-accent-line"></div>
        </div>

        <div className="lb-cats mb-4">
          {data.categorias?.map(cat => (
            <button
              key={cat.idCategoriaComp}
              onClick={() => setIdCatActiva(cat.idCategoriaComp)}
              className={`lb-cat-btn ${String(idCatActiva) === String(cat.idCategoriaComp) ? 'activo' : ''}`}
            >
              {cat.nombre.toUpperCase()}
            </button>
          ))}
        </div>

        {equipos.length === 0 ? (
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
                  <th className="text-center"><i className="fas fa-star me-1" style={{ color: 'var(--accent)' }}></i>Puntos totales</th>
                  {wodsCat.map(w => (
                    <th key={w.idWodComp} className="text-center">
                      <div className="lb-wod-nombre">{w.nombre}</div>
                      <div className="lb-wod-tipo">{w.tipoScore}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {equipos.map((eq, index) => {
                  const rankClase = suspenso ? 'lb-rank-secret'
                    : index === 0 ? 'lb-rank-1' : index === 1 ? 'lb-rank-2' : index === 2 ? 'lb-rank-3' : 'lb-rank-other';
                  const filaClase = !suspenso ? (index === 0 ? 'lb-row-1' : index === 1 ? 'lb-row-2' : index === 2 ? 'lb-row-3' : '') : '';
                  const wodMap = {};
                  (eq.wods || []).forEach(x => { wodMap[x.idWod] = x; });
                  return (
                    <tr key={eq.idEquipoComp} className={filaClase}>
                      <td className="ps-3">
                        <div className="d-flex align-items-center gap-3">
                          <div className={`lb-rank ${rankClase}`}>{suspenso ? '🤫' : (eq.posicion ?? index + 1)}</div>
                          <div>
                            <div className="lb-team-name">{eq.nombre}</div>
                            <div className="lb-team-box"><i className="fas fa-map-marker-alt me-1" style={{ color: 'var(--primary)' }}></i>{eq.boxOrigen || 'Independiente'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="text-center">
                        {suspenso ? <span className="lb-pts-secret">???</span> : (
                          <div><div className="lb-pts-total">{eq.puntosTotales}</div><div className="lb-pts-label">pts totales</div></div>
                        )}
                      </td>
                      {wodsCat.map(w => {
                        const cell = wodMap[w.idWodComp];
                        return (
                          <td key={w.idWodComp} className="text-center">
                            {suspenso ? (
                              <span className="lb-secret-badge"><i className="fas fa-lock"></i>TOP SECRET</span>
                            ) : cell && cell.resultado !== '--' ? (
                              <div>
                                <div className="lb-wod-score">{cell.resultado}</div>
                                <div className="lb-wod-rank">{cell.posicion}º · {cell.puntos} pts</div>
                              </div>
                            ) : <span className="lb-wod-empty">—</span>}
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
