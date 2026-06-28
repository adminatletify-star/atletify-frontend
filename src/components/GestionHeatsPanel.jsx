import { useState, useEffect } from 'react';
import { COMPETENCIAS_ENDPOINT, JUECES_COMP_ENDPOINT, HEATS_COMP_ENDPOINT } from '../services/api';
import AtletifyLoader from './AtletifyLoader';

const ESTADOS = ['Programado', 'EnCurso', 'Finalizado'];

// Constructor de heats (entidad real): genera heats con horario + carriles, y asigna un juez por carril.
export default function GestionHeatsPanel({ idCompetencia, categorias = [] }) {
  const [wods, setWods] = useState([]);
  const [jueces, setJueces] = useState([]);
  const [heats, setHeats] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [generando, setGenerando] = useState(false);
  const [cfg, setCfg] = useState({ idWodComp: '', idCategoriaComp: '', numeroCarriles: 5, duracionMinutos: 12, transicionMinutos: 3, horaInicio: '' });

  const cargar = async () => {
    setCargando(true);
    try {
      const [rW, rJ, rH] = await Promise.all([
        fetch(`${COMPETENCIAS_ENDPOINT}/${idCompetencia}/wods`),
        fetch(`${JUECES_COMP_ENDPOINT}/${idCompetencia}`),
        fetch(`${HEATS_COMP_ENDPOINT}/${idCompetencia}`),
      ]);
      if (rW.ok) setWods(await rW.json());
      if (rJ.ok) setJueces(await rJ.json());
      if (rH.ok) setHeats(await rH.json());
    } catch { /* ignore */ } finally { setCargando(false); }
  };
  useEffect(() => { cargar(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [idCompetencia]);

  const generar = async () => {
    if (!cfg.idWodComp) return alert('Selecciona un WOD.');
    setGenerando(true);
    try {
      const body = {
        idWodComp: Number(cfg.idWodComp),
        idCategoriaComp: cfg.idCategoriaComp === '' ? null : Number(cfg.idCategoriaComp),
        numeroCarriles: Number(cfg.numeroCarriles) || 1,
        duracionMinutos: Number(cfg.duracionMinutos) || 0,
        transicionMinutos: Number(cfg.transicionMinutos) || 0,
        horaInicio: cfg.horaInicio || null,
        limpiarExistentes: true,
      };
      const res = await fetch(`${HEATS_COMP_ENDPOINT}/${idCompetencia}/generar`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const d = await res.json().catch(() => ({}));
      if (res.ok) cargar(); else alert(d.mensaje || 'No se pudieron generar los heats.');
    } catch { alert('Error de conexión.'); } finally { setGenerando(false); }
  };

  const asignarJuez = async (idCarril, idJuezComp) => {
    try { await fetch(`${HEATS_COMP_ENDPOINT}/carril/${idCarril}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ setJuez: true, idJuezComp: idJuezComp === '' ? null : Number(idJuezComp) }) }); cargar(); } catch { /* ignore */ }
  };
  const cambiarEstado = async (idHeat, estado) => {
    try { await fetch(`${HEATS_COMP_ENDPOINT}/heat/${idHeat}/estado`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(estado) }); cargar(); } catch { /* ignore */ }
  };
  const borrarHeat = async (idHeat) => {
    const ok = window.wpConfirm ? await window.wpConfirm('¿Borrar este heat?') : window.confirm('¿Borrar este heat?');
    if (!ok) return;
    try { await fetch(`${HEATS_COMP_ENDPOINT}/heat/${idHeat}`, { method: 'DELETE' }); cargar(); } catch { /* ignore */ }
  };

  const fmtHora = (iso) => { if (!iso) return '--'; try { return new Date(iso).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch { return iso; } };

  return (
    <div className="cd-tab-fade">
      <div className="cd-section-header"><div>
        <h2 className="cd-section-h">Heats y <span>carriles</span></h2>
        <p className="cd-section-sub">Genera los heats con horario real y asigna un juez a cada carril. El público ve la agenda en vivo.</p>
      </div></div>

      <div className="cd-card cd-card--info mb-5"><div className="cd-card-body-lg">
        <div className="row g-3">
          <div className="col-md-3"><label className="cd-label">WOD</label>
            <select className="cd-input" value={cfg.idWodComp} onChange={e => setCfg({ ...cfg, idWodComp: e.target.value })}>
              <option value="">-- WOD --</option>
              {wods.map(w => <option key={w.idWodComp || w.IdWodComp} value={w.idWodComp || w.IdWodComp}>{w.nombre || w.Nombre}</option>)}
            </select></div>
          <div className="col-md-3"><label className="cd-label">Categoría</label>
            <select className="cd-input" value={cfg.idCategoriaComp} onChange={e => setCfg({ ...cfg, idCategoriaComp: e.target.value })}>
              <option value="">Todas</option>
              {categorias.map(c => <option key={c.idCategoriaComp || c.IdCategoriaComp} value={c.idCategoriaComp || c.IdCategoriaComp}>{c.nombre || c.Nombre}</option>)}
            </select></div>
          <div className="col-md-2"><label className="cd-label">Carriles</label><input type="number" min="1" className="cd-input" value={cfg.numeroCarriles} onChange={e => setCfg({ ...cfg, numeroCarriles: e.target.value })} /></div>
          <div className="col-md-2"><label className="cd-label">Duración (min)</label><input type="number" min="1" className="cd-input" value={cfg.duracionMinutos} onChange={e => setCfg({ ...cfg, duracionMinutos: e.target.value })} /></div>
          <div className="col-md-2"><label className="cd-label">Transición (min)</label><input type="number" min="0" className="cd-input" value={cfg.transicionMinutos} onChange={e => setCfg({ ...cfg, transicionMinutos: e.target.value })} /></div>
          <div className="col-md-4"><label className="cd-label">Hora de inicio</label><input type="datetime-local" className="cd-input" value={cfg.horaInicio} onChange={e => setCfg({ ...cfg, horaInicio: e.target.value })} /></div>
          <div className="col-12 text-end mt-2">
            <button className="cd-btn cd-btn--info-solid" onClick={generar} disabled={generando}><i className="fas fa-bolt"></i> {generando ? 'Generando...' : 'Generar heats'}</button>
          </div>
        </div>
      </div></div>

      {cargando ? (
        <div className="cd-empty"><AtletifyLoader /></div>
      ) : heats.length === 0 ? (
        <div className="cd-empty"><i className="fas fa-stopwatch"></i><p>Aún no hay heats generados.</p></div>
      ) : (
        <div className="d-flex flex-column gap-3">
          {heats.map(h => (
            <div key={h.idHeat} className="cd-card" style={{ padding: '14px' }}>
              <div className="d-flex justify-content-between align-items-center flex-wrap gap-2" style={{ marginBottom: '10px' }}>
                <div>
                  <strong>Heat {h.numero}</strong> · {h.wod} · <span style={{ color: 'var(--text-muted)' }}>{h.categoria}</span>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}><i className="far fa-clock"></i> {fmtHora(h.horaInicio)} · {h.duracionMinutos} min</div>
                </div>
                <div className="d-flex gap-2 align-items-center">
                  <select className="cd-input" style={{ width: 'auto', padding: '4px 8px' }} value={h.estado} onChange={e => cambiarEstado(h.idHeat, e.target.value)}>
                    {ESTADOS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <button className="cd-btn cd-btn--ghost" onClick={() => borrarHeat(h.idHeat)} title="Borrar heat"><i className="fas fa-trash"></i></button>
                </div>
              </div>
              <div className="row g-2">
                {h.carriles.map(c => (
                  <div key={c.idCarril} className="col-md-6 col-lg-4">
                    <div style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '8px' }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 700 }}>Carril {c.numero} — {c.equipo || '(vacío)'}</div>
                      <select className="cd-input" style={{ marginTop: '6px', fontSize: '0.82rem' }} value={c.idJuezComp || ''} onChange={e => asignarJuez(c.idCarril, e.target.value)}>
                        <option value="">— Juez —</option>
                        {jueces.map(j => <option key={j.idJuezComp} value={j.idJuezComp}>{j.nombre} {j.apellidos}</option>)}
                      </select>
                    </div>
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
