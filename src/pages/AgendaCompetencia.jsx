import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { HEATS_COMP_ENDPOINT } from '../services/api';
import AtletifyLoader from '../components/AtletifyLoader';
import '../assets/css/AgendaCompetencia.css';
import { useCompetenciaLive } from '../hooks/useCompetenciaLive';

// Agenda pública: a qué hora pasa cada heat/categoría, su estado en vivo y el score aprobado de cada equipo.
// (Por ahora refresca por polling cada 30s; en Capa 8 pasa a SignalR en vivo.)
export default function AgendaCompetencia() {
  const { id } = useParams();
  const [heats, setHeats] = useState([]);
  const [cargando, setCargando] = useState(true);

  const cargar = async () => {
    try { const r = await fetch(`${HEATS_COMP_ENDPOINT}/${id}/agenda`); if (r.ok) setHeats(await r.json()); } catch { /* ignore */ } finally { setCargando(false); }
  };
  useEffect(() => {
    cargar();
    const i = setInterval(cargar, 30000);
    return () => clearInterval(i);
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [id]);

  // Tiempo real: refresca al instante cuando entra/aprueba un score o cambia un heat.
  useCompetenciaLive(id, { onScore: cargar, onHeat: cargar });

  const fmtHora = (iso) => { if (!iso) return '--'; try { return new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }); } catch { return iso; } };
  const cls = (e) => e === 'EnCurso' ? 'ag-en-curso' : e === 'Finalizado' ? 'ag-finalizado' : 'ag-programado';

  if (cargando) return <div style={{ minHeight: '60vh', display: 'grid', placeItems: 'center' }}><AtletifyLoader /></div>;

  return (
    <div className="ag-wrap">
      <div className="ag-head">
        <h1 className="ag-title">Agenda en vivo</h1>
        <Link to={`/leaderboard/${id}`} className="ag-link"><i className="fas fa-trophy"></i> Leaderboard</Link>
      </div>
      {heats.length === 0 ? (
        <div className="ag-empty"><i className="fas fa-clock"></i><p>Aún no hay horarios publicados.</p></div>
      ) : (
        <div className="ag-list">
          {heats.map(h => (
            <div key={h.idHeat} className={`ag-heat ${cls(h.estado)}`}>
              <div className="ag-heat-head">
                <div className="ag-heat-info">
                  <span className="ag-hora">{fmtHora(h.horaInicio)}</span>
                  <span className="ag-wod">Heat {h.numero} · {h.wod} · {h.categoria}</span>
                </div>
                <span className={`ag-badge ${cls(h.estado)}`}>{h.estado === 'EnCurso' ? 'EN VIVO' : h.estado}</span>
              </div>
              <div className="ag-carriles">
                {h.carriles.map(c => (
                  <div key={c.numero} className="ag-carril">
                    <span className="ag-num">{c.numero}</span>
                    <span className="ag-equipo">{c.equipo || '—'}</span>
                    <span className="ag-score">{c.resultado || ''}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
