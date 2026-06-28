import { useState, useEffect, useMemo } from 'react';
import { COMPETENCIAS_ENDPOINT, JUECES_COMP_ENDPOINT, HEATS_COMP_ENDPOINT } from '../services/api';
import AtletifyLoader from './AtletifyLoader';

const ESTADOS = ['Programado', 'EnCurso', 'Finalizado'];

// Constructor de heats (entidad real): genera heats con horario + carriles, y asigna un juez por carril.
// La FECHA se toma del EVENTO (competencia.fechaInicio..fechaFin); el admin solo elige el DÍA (si hay rango) y la HORA.
export default function GestionHeatsPanel({ idCompetencia, categorias = [], competencia = null }) {
  const [wods, setWods] = useState([]);
  const [jueces, setJueces] = useState([]);
  const [heats, setHeats] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [generando, setGenerando] = useState(false);
  const [cfg, setCfg] = useState({ idWodComp: '', idCategoriaComp: '', numeroCarriles: 5, duracionMinutos: 12, transicionMinutos: 3, dia: '', hora: '08:00' });

  // Días del evento (de fechaInicio a fechaFin). El admin elige uno; la fecha ya NO se teclea a mano.
  const diasEvento = useMemo(() => {
    const iniRaw = competencia?.fechaInicio || competencia?.FechaInicio;
    const finRaw = competencia?.fechaFin || competencia?.FechaFin || iniRaw;
    if (!iniRaw) return [];
    // En UTC para coincidir con el reloj-de-pared guardado (las horas del evento se guardan UTC-naive).
    const iniStr = String(iniRaw).split('T')[0];
    const finStr = String(finRaw || iniRaw).split('T')[0];
    const d = new Date(`${iniStr}T00:00:00Z`);
    const end = new Date(`${finStr}T00:00:00Z`);
    if (isNaN(d) || isNaN(end)) return [];
    const dias = []; let guard = 0;
    while (d <= end && guard < 31) {
      dias.push(d.toISOString().slice(0, 10));
      d.setUTCDate(d.getUTCDate() + 1); guard++;
    }
    return dias;
  }, [competencia]);

  useEffect(() => { if (diasEvento.length && !cfg.dia) setCfg(c => ({ ...c, dia: diasEvento[0] })); }, [diasEvento]); // eslint-disable-line react-hooks/exhaustive-deps

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
        // La fecha sale del evento (cfg.dia ∈ días del evento) + la hora elegida.
        horaInicio: (cfg.dia && cfg.hora) ? `${cfg.dia}T${cfg.hora}:00` : null,
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

  const fmtHora = (iso) => { if (!iso) return '--'; try { return new Date(iso).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }); } catch { return iso; } };

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
          {diasEvento.length > 1 && (
            <div className="col-md-2"><label className="cd-label">Día del evento</label>
              <select className="cd-input" value={cfg.dia} onChange={e => setCfg({ ...cfg, dia: e.target.value })}>
                {diasEvento.map(d => <option key={d} value={d}>{new Date(d + 'T00:00:00Z').toLocaleDateString('es-MX', { weekday: 'short', day: '2-digit', month: 'short', timeZone: 'UTC' })}</option>)}
              </select></div>
          )}
          <div className="col-md-2"><label className="cd-label">Hora de inicio {diasEvento.length === 1 ? `(${new Date(diasEvento[0] + 'T00:00:00Z').toLocaleDateString('es-MX', { day: '2-digit', month: 'short', timeZone: 'UTC' })})` : ''}</label>
            <input type="time" className="cd-input" value={cfg.hora} onChange={e => setCfg({ ...cfg, hora: e.target.value })} disabled={diasEvento.length === 0} /></div>
          {diasEvento.length === 0 && (
            <div className="col-12"><p className="cd-section-sub" style={{ color: 'var(--primary)', margin: 0 }}><i className="fas fa-triangle-exclamation me-1"></i>Define primero las fechas del evento (pestaña Portal Público); de ahí se toma la fecha de los heats.</p></div>
          )}
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
