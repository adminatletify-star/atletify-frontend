import { useState, useEffect } from 'react';
import { COMPETENCIAS_ENDPOINT } from '../services/api';
import AtletifyLoader from './AtletifyLoader';
import { useCompetenciaLive } from '../hooks/useCompetenciaLive';

// Verificación profesional de scores en AdminBox: de qué WOD, qué dato, tiebreak, criterios, firma,
// y aprobar/revertir. Se refresca EN VIVO cuando un juez manda un score (SignalR).
export default function PanelVerificacionScores({ idCompetencia }) {
  const [scores, setScores] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState('Pendiente'); // Pendiente | Todos
  const [firmaVista, setFirmaVista] = useState(null); // { url }

  const cargar = async () => {
    try { const r = await fetch(`${COMPETENCIAS_ENDPOINT}/${idCompetencia}/scores-auditoria`); if (r.ok) setScores(await r.json()); } catch { /* ignore */ } finally { setCargando(false); }
  };
  useEffect(() => { cargar(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [idCompetencia]);
  useCompetenciaLive(idCompetencia, { onScore: cargar });

  const cambiar = async (id, estatus) => {
    try { const r = await fetch(`${COMPETENCIAS_ENDPOINT}/wods/scores/${id}/estatus`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ estatus }) }); if (r.ok) cargar(); } catch { /* ignore */ }
  };
  const verFirma = async (id) => {
    try { const r = await fetch(`${COMPETENCIAS_ENDPOINT}/wods/scores/${id}/firma`); if (r.ok) { const d = await r.json(); setFirmaVista({ url: d.firmaAtletaUrl }); } } catch { /* ignore */ }
  };

  const visibles = scores.filter(s => filtro === 'Todos' || s.estatus === 'Pendiente');
  const fmt = (iso) => { try { return new Date(iso).toLocaleString('es-MX', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' }); } catch { return ''; } };
  const criterios = (json) => { try { return JSON.parse(json || '[]'); } catch { return []; } };

  return (
    <div className="cd-tab-fade" style={{ marginBottom: '24px' }}>
      <div className="cd-section-header" style={{ borderBottom: '1px solid var(--border)', marginBottom: '1rem' }}>
        <div>
          <h2 className="cd-section-h">Verificación de <span>scores</span></h2>
          <p className="cd-section-sub">Revisa y aprueba lo que mandan los jueces. Se actualiza en vivo.</p>
        </div>
        <div className="d-flex gap-2">
          <button className={`cd-btn ${filtro === 'Pendiente' ? 'cd-btn--info-solid' : 'cd-btn--ghost'}`} onClick={() => setFiltro('Pendiente')}>Pendientes</button>
          <button className={`cd-btn ${filtro === 'Todos' ? 'cd-btn--info-solid' : 'cd-btn--ghost'}`} onClick={() => setFiltro('Todos')}>Todos</button>
        </div>
      </div>

      {cargando ? <div className="cd-empty"><AtletifyLoader /></div> : visibles.length === 0 ? (
        <div className="cd-empty"><i className="fas fa-clipboard-check"></i><p>No hay scores {filtro === 'Pendiente' ? 'pendientes' : ''} por verificar.</p></div>
      ) : (
        <div className="d-flex flex-column gap-2">
          {visibles.map(s => {
            const crits = criterios(s.criteriosJson);
            return (
              <div key={s.idPuntuacion} className="cd-card" style={{ padding: '12px 14px' }}>
                <div className="d-flex justify-content-between align-items-start flex-wrap gap-2">
                  <div>
                    <strong>{s.equipoNombre}</strong> · <span style={{ color: 'var(--text-muted)' }}>{s.wodNombre}</span>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{s.tipoScore} · juez: {s.nombreJuez || '—'} · {fmt(s.fechaEnvio)}</div>
                  </div>
                  <span className="cd-tipo-badge" style={{ background: s.estatus === 'Aprobado' ? 'rgba(21,163,74,.15)' : 'rgba(245,185,66,.15)', color: s.estatus === 'Aprobado' ? '#15a34a' : '#f5b942' }}>{s.estatus}</span>
                </div>
                <div className="d-flex align-items-center flex-wrap gap-3" style={{ marginTop: '8px' }}>
                  <span style={{ fontSize: '1.15rem', fontWeight: 800 }}>{s.noTermino ? `CAP ${s.repsAlCap ?? ''}` : s.resultado}</span>
                  {s.tiebreak ? <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>tiebreak: {s.tiebreak}</span> : null}
                  {crits.length > 0 && (
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      criterios: {crits.filter(c => c.cumplido === true).length}/{crits.length} ✓
                    </span>
                  )}
                  {s.tieneFirma
                    ? <button className="cd-btn cd-btn--ghost" onClick={() => verFirma(s.idPuntuacion)}><i className="fas fa-signature"></i> Ver firma</button>
                    : <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}><i className="fas fa-pen-slash"></i> sin firma</span>}
                  <div className="d-flex gap-2 ms-auto">
                    {s.estatus !== 'Aprobado'
                      ? <button className="cd-btn cd-btn--info-solid" onClick={() => cambiar(s.idPuntuacion, 'Aprobado')}><i className="fas fa-check"></i> Aprobar</button>
                      : <button className="cd-btn cd-btn--ghost" onClick={() => cambiar(s.idPuntuacion, 'Pendiente')}><i className="fas fa-undo"></i> Revertir</button>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {firmaVista && (
        <div onClick={() => setFirmaVista(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.8)', zIndex: 100000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: '12px', padding: '16px', maxWidth: '420px', width: '100%' }}>
            <p style={{ margin: '0 0 8px', color: '#111', fontWeight: 700, textAlign: 'center' }}>Firma del atleta</p>
            {firmaVista.url ? <img src={firmaVista.url} alt="firma del atleta" style={{ width: '100%' }} /> : <p style={{ color: '#888', textAlign: 'center' }}>Sin firma.</p>}
            <button className="cd-btn cd-btn--ghost" style={{ marginTop: '10px', width: '100%' }} onClick={() => setFirmaVista(null)}>Cerrar</button>
          </div>
        </div>
      )}
    </div>
  );
}
