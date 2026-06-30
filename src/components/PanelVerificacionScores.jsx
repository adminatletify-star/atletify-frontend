import { useState, useEffect, useMemo } from 'react';
import { COMPETENCIAS_ENDPOINT } from '../services/api';
import AtletifyLoader from './AtletifyLoader';
import OpcionesPicker from './OpcionesPicker';
import ListaPaginada from './ListaPaginada';
import ModalCapturaScore from './ModalCapturaScore';
import { useCompetenciaLive } from '../hooks/useCompetenciaLive';

// Verificación profesional de scores en AdminBox: de qué WOD, qué dato, tiebreak, criterios, firma,
// FILTROS (atleta/WOD/estatus), CORREGIR el score (hoja por tipo) y aprobar/revertir. En vivo (SignalR).
export default function PanelVerificacionScores({ idCompetencia }) {
  const [scores, setScores] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtros, setFiltros] = useState({ busqueda: '', idWod: 'Todos', estatus: 'Pendiente' }); // Pendiente | Aprobado | Todos
  const [firmaVista, setFirmaVista] = useState(null); // { url }
  const [corregir, setCorregir] = useState(null);     // score que el admin está corrigiendo

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

  const wodsUnicos = useMemo(() => {
    const m = new Map();
    scores.forEach(s => { if (!m.has(s.idWodComp)) m.set(s.idWodComp, s.wodNombre); });
    return Array.from(m, ([id, nombre]) => ({ id, nombre }));
  }, [scores]);

  const visibles = scores.filter(s => {
    if (filtros.estatus !== 'Todos' && s.estatus !== filtros.estatus) return false;
    if (filtros.idWod !== 'Todos' && String(s.idWodComp) !== String(filtros.idWod)) return false;
    if (filtros.busqueda.trim() && !(s.equipoNombre || '').toLowerCase().includes(filtros.busqueda.toLowerCase())) return false;
    return true;
  });

  const fmt = (iso) => { try { return new Date(iso).toLocaleString('es-MX', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' }); } catch { return ''; } };
  const criterios = (json) => { try { return JSON.parse(json || '[]'); } catch { return []; } };
  const conUnidad = (s) => `${s.noTermino ? `CAP ${s.repsAlCap ?? ''}` : s.resultado}${s.tipoScore === 'Carga' && s.unidadPeso ? ' ' + s.unidadPeso : ''}`;

  return (
    <div className="cd-tab-fade" style={{ marginBottom: '24px' }}>
      <div className="cd-section-header" style={{ borderBottom: '1px solid var(--border)', marginBottom: '1rem' }}>
        <div>
          <h2 className="cd-section-h">Verificación de <span>scores</span></h2>
          <p className="cd-section-sub">Revisa, corrige y aprueba lo que mandan los jueces. Se actualiza en vivo.</p>
        </div>
        <button className="cd-btn cd-btn--info cd-btn--sm" onClick={cargar}><i className="fas fa-sync-alt"></i> Refrescar</button>
      </div>

      {/* FILTROS (atleta / WOD / estatus) */}
      <div className="cd-card mb-3"><div className="cd-card-body">
        <div className="row g-3">
          <div className="col-md-5">
            <label className="cd-label">Buscar equipo / atleta</label>
            <input type="text" className="cd-input" placeholder="Buscar por nombre..." value={filtros.busqueda} onChange={e => setFiltros({ ...filtros, busqueda: e.target.value })} />
          </div>
          <div className="col-md-4">
            <label className="cd-label">WOD</label>
            <OpcionesPicker
              valor={filtros.idWod}
              onCambiar={(v) => setFiltros({ ...filtros, idWod: v })}
              titulo="Filtrar por WOD"
              icono="fas fa-dumbbell"
              buscador
              placeholderBuscar="Buscar WOD..."
              opciones={[{ valor: 'Todos', label: 'Todos los WODs' }, ...wodsUnicos.map(w => ({ valor: String(w.id), label: w.nombre }))]}
            />
          </div>
          <div className="col-md-3">
            <label className="cd-label">Estatus</label>
            <OpcionesPicker
              valor={filtros.estatus}
              onCambiar={(v) => setFiltros({ ...filtros, estatus: v })}
              titulo="Filtrar por estatus"
              icono="fas fa-filter"
              opciones={[{ valor: 'Pendiente', label: 'Pendientes' }, { valor: 'Aprobado', label: 'Aprobados' }, { valor: 'Todos', label: 'Todos' }]}
            />
          </div>
        </div>
      </div></div>

      {cargando ? <div className="cd-empty"><AtletifyLoader /></div> : visibles.length === 0 ? (
        <div className="cd-empty"><i className="fas fa-clipboard-check"></i><p>No hay scores que coincidan con los filtros.</p></div>
      ) : (
        <ListaPaginada items={visibles} pageSize={20} resetKey={`${filtros.busqueda}|${filtros.idWod}|${filtros.estatus}`}>
          {(pag) => (
          <div className="d-flex flex-column gap-2">
          {pag.map(s => {
            const crits = criterios(s.criteriosJson);
            return (
              <div key={s.idPuntuacion} className="cd-card" style={{ padding: '12px 14px' }}>
                <div className="d-flex justify-content-between align-items-start flex-wrap gap-2">
                  <div>
                    <strong>{s.equipoNombre}</strong> · <span style={{ color: 'var(--text-muted)' }}>{s.wodNombre}</span>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{s.tipoScore} · juez: {s.nombreJuez || '—'} · {fmt(s.fechaEnvio)}</div>
                  </div>
                  <span className={`cd-badge ${s.estatus === 'Aprobado' ? 'cd-badge--success' : 'cd-badge--warning'}`}>{s.estatus}</span>
                </div>
                <div className="d-flex align-items-center flex-wrap gap-3" style={{ marginTop: '8px' }}>
                  <span style={{ fontSize: '1.15rem', fontWeight: 800 }}>{conUnidad(s)}</span>
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
                    <button className="cd-btn cd-btn--ghost" onClick={() => setCorregir(s)} title="Corregir el score (vuelve a Pendiente)"><i className="fas fa-edit"></i> Corregir</button>
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
        </ListaPaginada>
      )}

      {firmaVista && (
        <div className="opk-overlay" onClick={() => setFirmaVista(null)}>
          <div className="opk-panel" style={{ maxWidth: '480px' }} onClick={e => e.stopPropagation()}>
            <div className="opk-header">
              <span className="opk-title"><i className="fas fa-signature" /> Firma del atleta</span>
              <button className="opk-close" onClick={() => setFirmaVista(null)}><i className="fas fa-times" /></button>
            </div>
            <div style={{ padding: '1rem 1.25rem 1.25rem' }}>
              {firmaVista.url
                ? <img src={firmaVista.url} alt="firma del atleta" style={{ width: '100%', background: '#fff', borderRadius: '10px', border: '1px solid var(--border)' }} />
                : <p style={{ color: 'var(--text-muted)', textAlign: 'center', margin: 0 }}>Sin firma.</p>}
            </div>
          </div>
        </div>
      )}

      {/* CORREGIR: reusa la hoja por tipo (con unidad y firma). Admin = sin token de juez (va por su sesión). */}
      {corregir && (
        <ModalCapturaScore
          idWod={corregir.idWodComp}
          equipo={{ idEquipoComp: corregir.idEquipoComp, nombre: corregir.equipoNombre }}
          nombreJuez="Corrección Admin"
          onCerrar={() => setCorregir(null)}
          onGuardado={() => { setCorregir(null); cargar(); }}
        />
      )}
    </div>
  );
}
