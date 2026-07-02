import { useState, useEffect, useMemo, useRef } from 'react';
import TimeInputMMSS from './TimeInputMMSS';
import SimuladorBarraJuez from './SimuladorBarraJuez';
import AmrapLadder from './AmrapLadder';
import { COMPETENCIAS_ENDPOINT } from '../services/api';
import './PlantillaJueceo.css';

/*
  PlantillaJueceo — hoja de captura del juez AUTO-GENERADA según la naturaleza del WOD (su TipoScore).
  Componente controlado: emite onChange(ValorJueceo) en cada cambio. NO llama al backend (eso es Capa 6).
  Contrato verificado contra el validador de RegistrarScore y el parser del leaderboard (Capa 3, 2026-06-28).

  El string `resultado` es compatible con: validador backend (numero 0..5000 | "..rondas..reps.." | "M:SS")
  y el parser del leaderboard. tiebreak y checklist se conservan en el valor pero el backend AÚN los ignora
  (se persisten en Capa 6).
*/

const CAP_OFFSET = 10000000;

// ── helpers ──
const toInt = (s) => {
  if (s === '' || s === null || s === undefined) return null;
  const m = String(s).match(/\d+/); // primer bloque de dígitos: "134.5"→134, "abc"→null, "0"→0
  return m ? parseInt(m[0], 10) : null;
};
const toNum = (s) => {
  if (s === '' || s === null || s === undefined) return null;
  const n = parseFloat(String(s).replace(',', '.').replace(/[^\d.]/g, ''));
  return Number.isNaN(n) ? null : n;
};
const tiempoASeg = (str) => {
  if (!str) return null;
  const partes = String(str).split(':');
  if (partes.length !== 2) return null;
  const mm = parseInt(partes[0], 10);
  const ss = parseInt(partes[1], 10);
  if (Number.isNaN(mm) || Number.isNaN(ss) || ss < 0 || ss > 59) return null;
  return mm * 60 + ss;
};
const formatMMSS = (seg) => `${Math.floor(seg / 60)}:${String(seg % 60).padStart(2, '0')}`;

// Mejor esfuerzo: reps por ronda = suma del primer entero del esquema de cada movimiento.
const derivarRepsPorRonda = (movimientos = []) => {
  let total = 0;
  for (const m of movimientos) {
    const match = String(m.esquemaReps || '').match(/\d+/);
    if (match) total += parseInt(match[0], 10);
  }
  return total > 0 ? String(total) : '';
};

export default function PlantillaJueceo({ wod, nombreJuez = '', soloLectura = false, onChange }) {
  const tipoScore = wod?.tipoScore || 'ForTime';
  const unidadPeso = wod?.unidadPeso === 'lb' ? 'lb' : 'kg'; // estándar fijo del WOD (Carga); el juez no lo cambia
  const cap = Number(wod?.timeCapMinutos) || 0;
  const hayCap = cap > 0;
  const permiteCapReps = !!wod?.permiteCapReps && hayCap && tipoScore === 'ForTime';
  const tiebreakTipo = wod?.tiebreakTipo === 'Reps' ? 'Reps' : 'Tiempo';

  const [st, setSt] = useState(() => ({
    termino: true,
    tiempo: '',
    repsAlCap: '',
    amrapModo: 'reps',
    amrapReps: '',
    amrapRondas: '',
    amrapRepsPorRonda: derivarRepsPorRonda(wod?.movimientos),
    amrapParciales: '',
    amrapTotal: 0,
    amrapPalomeo: [],
    peso: '',
    intentos: [{ peso: '', valido: false, slot: 1 }],
    esDupla: false,
    puntos: '',
    rrRondas: '',
    rrReps: '',
    dnf: false,
    tbStr: '',
    tbNoAplica: false,
    checklist: {},
  }));
  const set = (campo, valor) => setSt((p) => ({ ...p, [campo]: valor }));
  const setCheck = (id, valor) => setSt((p) => ({ ...p, checklist: { ...p.checklist, [id]: valor } }));
  // F3: intentos de Max/1RM
  const setIntento = (idx, patch) => setSt((p) => ({ ...p, intentos: (p.intentos || []).map((it, i) => i === idx ? { ...it, ...patch } : it) }));
  const addIntento = () => setSt((p) => ({ ...p, intentos: [...(p.intentos || []), { peso: '', valido: false, slot: 1 }] }));
  const delIntento = (idx) => setSt((p) => ({ ...p, intentos: (p.intentos || []).filter((_, i) => i !== idx) }));

  // F4: bumpers de ESTA competencia para el simulador de barra (solo WOD tipo Carga).
  const [bumpersComp, setBumpersComp] = useState([]);
  useEffect(() => {
    const idComp = wod?.idCompetencia;
    if (tipoScore !== 'Carga' || !idComp) return;
    let vivo = true;
    fetch(`${COMPETENCIAS_ENDPOINT}/${idComp}/bumpers`)
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => { if (vivo) setBumpersComp(Array.isArray(d) ? d : []); })
      .catch(() => { if (vivo) setBumpersComp([]); });
    return () => { vivo = false; };
  }, [wod, tipoScore]);

  const criteriosActivos = useMemo(
    () => (wod?.criterios || []).filter((c) => c.activo !== false).sort((a, b) => (a.orden || 0) - (b.orden || 0)),
    [wod]
  );

  const valor = useMemo(() => {
    const adv = [];
    let resultado = null;
    let valido = true;
    const e = {
      tipoScore, termino: null, tiempoSegundos: null, repsAlCap: null, repsTotales: null,
      rondasCompletas: null, repsParciales: null, repsPorRonda: null, peso: null, unidad: null,
      puntos: null, valorNumerico: null,
    };

    if (st.dnf) {
      resultado = null; // DNF => se omite el score (queda al fondo)
    } else if (tipoScore === 'ForTime') {
      if (permiteCapReps && !st.termino) {
        const reps = toInt(st.repsAlCap);
        e.termino = false; e.repsAlCap = reps;
        if (reps === null || reps < 0) { valido = false; }
        else if (reps > 5000) { valido = false; adv.push('Reps irreales (>5000), verifica.'); }
        else { resultado = String(reps); e.valorNumerico = CAP_OFFSET - reps; if (reps === 0) adv.push('0 reps: ¿es correcto?'); }
      } else {
        const seg = tiempoASeg(st.tiempo);
        e.termino = true; e.tiempoSegundos = seg;
        if (seg === null) { valido = false; }
        else { resultado = formatMMSS(seg); e.valorNumerico = seg; if (hayCap && seg > cap * 60) adv.push('El tiempo supera el cap: ¿debió ser CAP+reps?'); }
      }
    } else if (tipoScore === 'AMRAP') {
      if (wod?.movimientos?.length > 0) {
        // F5: ladder dinámico — el total (round + reps) viene del palomeo (AmrapLadder).
        const total = st.amrapTotal || 0;
        e.repsTotales = total;
        if (total <= 0) { valido = false; }
        else if (total > 20000) { valido = false; adv.push('Reps irreales, verifica.'); }
        else { resultado = String(total); e.valorNumerico = total; }
      } else {
        // Fallback manual (WOD sin movimientos definidos).
        let total;
        if (st.amrapModo === 'rondas_reps') {
          const r = toInt(st.amrapRondas);
          const rpr = toInt(st.amrapRepsPorRonda);
          const pp = toInt(st.amrapParciales);
          if (r === null && pp === null) {
            total = null;
          } else if ((r ?? 0) > 0 && !(rpr > 0)) {
            total = null; adv.push('Indica las reps por ronda.');
          } else {
            total = (r ?? 0) * (rpr ?? 0) + (pp ?? 0);
            e.rondasCompletas = r ?? 0; e.repsParciales = pp ?? 0; e.repsPorRonda = rpr ?? 0;
            if (rpr > 0 && (pp ?? 0) >= rpr) adv.push('Las reps extra igualan/superan una ronda completa.');
          }
        } else {
          total = toInt(st.amrapReps);
        }
        e.repsTotales = total;
        if (total === null || total < 0) { valido = false; }
        else if (total > 5000) { valido = false; adv.push('Reps irreales (>5000), verifica.'); }
        else { resultado = String(total); e.valorNumerico = total; }
      }
    } else if (tipoScore === 'Carga') {
      // Total = suma del MEJOR intento válido por atleta (slot). Individual = 1 slot.
      const its = st.intentos || [];
      const bySlot = {};
      its.forEach((i) => {
        if (!i.valido) return;
        const pw = toNum(i.peso);
        if (pw === null || pw <= 0) return;
        const s = st.esDupla ? (i.slot || 1) : 1;
        if (!bySlot[s] || pw > bySlot[s]) bySlot[s] = pw;
      });
      const total = Object.values(bySlot).reduce((a, b) => a + b, 0);
      e.peso = total; e.unidad = unidadPeso;
      e.intentos = its.map((i, idx) => ({ numeroIntento: idx + 1, atletaSlot: st.esDupla ? (i.slot || 1) : 1, peso: toNum(i.peso) || 0, valido: !!i.valido }));
      if (total <= 0) { valido = false; }
      else if (total > 10000) { valido = false; adv.push('Peso irreal, verifica.'); }
      else { resultado = String(total); e.valorNumerico = total; }
    } else if (tipoScore === 'RondasReps') {
      const rRaw = toInt(st.rrRondas);
      const repsRaw = toInt(st.rrReps);
      if (rRaw === null && repsRaw === null) { valido = false; } // ambos vacíos/basura
      else {
        const r = rRaw ?? 0;
        const reps = repsRaw ?? 0;
        e.rondasCompletas = r; e.repsParciales = reps;
        if (reps >= 10000) adv.push('Reps muy altas: el desempate por rondas podría descuadrarse.');
        resultado = `${r} Rondas + ${reps} Reps`;
        e.valorNumerico = r * 10000 + reps;
      }
    } else if (tipoScore === 'Puntos') {
      const p = toInt(st.puntos);
      e.puntos = p;
      if (p === null || p < 0) { valido = false; }
      else if (p > 5000) { valido = false; adv.push('Puntaje irreal (>5000), verifica.'); }
      else { resultado = String(p); e.valorNumerico = p; }
    }

    // Tiebreak (aparte del resultado; backend lo ignora hasta Capa 6)
    let tiebreak = null;
    if (wod?.tiebreakActivo) {
      if (st.tbNoAplica) {
        tiebreak = { activo: true, tipo: tiebreakTipo, valorString: null, valorNumerico: null, noAplica: true };
      } else if (tiebreakTipo === 'Tiempo') {
        const seg = tiempoASeg(st.tbStr);
        tiebreak = { activo: true, tipo: 'Tiempo', valorString: seg !== null ? formatMMSS(seg) : null, valorNumerico: seg, noAplica: false };
      } else {
        const n = toInt(st.tbStr);
        tiebreak = { activo: true, tipo: 'Reps', valorString: n !== null ? String(n) : null, valorNumerico: n, noAplica: false };
      }
    }

    // Checklist (snapshot de esDesempate; no afecta resultado)
    const checklist = wod?.usaChecklist
      ? criteriosActivos.map((c) => ({
          idCriterioJueceo: c.idCriterioJueceo,
          descripcion: c.descripcion,
          cumplido: st.checklist[c.idCriterioJueceo] ?? null,
          esDesempate: !!c.esDesempate,
          orden: c.orden || 0,
        }))
      : [];
    if (wod?.usaChecklist && checklist.some((c) => c.esDesempate && c.cumplido === null))
      adv.push('Hay criterios de desempate sin evaluar.');

    return {
      resultado, nombreJuez, estructurado: e, tiebreak, checklist,
      dnf: st.dnf, advertencias: adv, esValido: st.dnf ? true : valido,
      intentos: (tipoScore === 'Carga' && !st.dnf) ? (e.intentos || []) : null,
      palomeo: (tipoScore === 'AMRAP' && !st.dnf && (wod?.movimientos?.length > 0)) ? (st.amrapPalomeo || []) : null,
    };
  }, [wod, st, tipoScore, permiteCapReps, hayCap, cap, tiebreakTipo, nombreJuez, criteriosActivos]);

  // onChange vía ref: dispara solo cuando cambia `valor`, no cuando el padre pasa un onChange nuevo (evita loops).
  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; });
  useEffect(() => { onChangeRef.current?.(valor); }, [valor]);

  const dis = soloLectura;
  const numProps = { inputMode: 'numeric', className: 'pj-input', disabled: dis };

  return (
    <div className="pj-root">
      {/* Cabecera con la naturaleza del WOD */}
      <div className="pj-head">
        <span className="pj-badge">{etiquetaTipo(tipoScore)}</span>
        {hayCap && <span className="pj-cap">{tipoScore === 'ForTime' ? `Cap ${cap}'` : `${cap}:00`}</span>}
      </div>

      {/* DNF */}
      <label className="pj-dnf">
        <input type="checkbox" checked={st.dnf} disabled={dis} onChange={(e) => set('dnf', e.target.checked)} />
        <span>No participó / DNF (se omite el score)</span>
      </label>

      {!st.dnf && (
        <div className="pj-capture">
          {/* ── FOR TIME ── */}
          {tipoScore === 'ForTime' && (
            <>
              {permiteCapReps && (
                <div className="pj-seg">
                  <button type="button" disabled={dis} className={`pj-seg-btn${st.termino ? ' pj-seg-btn--on' : ''}`} onClick={() => set('termino', true)}>Terminó (tiempo)</button>
                  <button type="button" disabled={dis} className={`pj-seg-btn${!st.termino ? ' pj-seg-btn--on' : ''}`} onClick={() => set('termino', false)}>CAP + reps</button>
                </div>
              )}
              {(!permiteCapReps || st.termino) ? (
                <label className="pj-field">
                  <span className="pj-label">Tiempo (MM:SS)</span>
                  <TimeInputMMSS value={st.tiempo} onChange={(v) => set('tiempo', v)} className="pj-input" disabled={dis} />
                </label>
              ) : (
                <label className="pj-field">
                  <span className="pj-label">Reps completadas al cap</span>
                  <input {...numProps} placeholder="Ej: 187" value={st.repsAlCap} onChange={(e) => set('repsAlCap', e.target.value)} />
                </label>
              )}
            </>
          )}

          {/* ── AMRAP ── */}
          {tipoScore === 'AMRAP' && ((wod?.movimientos?.length > 0) ? (
            <AmrapLadder
              movimientos={wod.movimientos}
              disabled={dis}
              onChange={(res) => setSt((p) => (p.amrapTotal === res.total && JSON.stringify(p.amrapPalomeo) === JSON.stringify(res.palomeo)) ? p : { ...p, amrapTotal: res.total, amrapPalomeo: res.palomeo })}
            />
          ) : (
            <>
              <div className="pj-seg">
                <button type="button" disabled={dis} className={`pj-seg-btn${st.amrapModo === 'reps' ? ' pj-seg-btn--on' : ''}`} onClick={() => set('amrapModo', 'reps')}>Reps totales</button>
                <button type="button" disabled={dis} className={`pj-seg-btn${st.amrapModo === 'rondas_reps' ? ' pj-seg-btn--on' : ''}`} onClick={() => set('amrapModo', 'rondas_reps')}>Rondas + reps</button>
              </div>
              {st.amrapModo === 'reps' ? (
                <label className="pj-field">
                  <span className="pj-label">Reps totales</span>
                  <input {...numProps} placeholder="Ej: 134" value={st.amrapReps} onChange={(e) => set('amrapReps', e.target.value)} />
                </label>
              ) : (
                <div className="pj-grid3">
                  <label className="pj-field"><span className="pj-label">Rondas</span><input {...numProps} value={st.amrapRondas} onChange={(e) => set('amrapRondas', e.target.value)} /></label>
                  <label className="pj-field"><span className="pj-label">Reps/ronda</span><input {...numProps} value={st.amrapRepsPorRonda} onChange={(e) => set('amrapRepsPorRonda', e.target.value)} /></label>
                  <label className="pj-field"><span className="pj-label">Reps extra</span><input {...numProps} value={st.amrapParciales} onChange={(e) => set('amrapParciales', e.target.value)} /></label>
                </div>
              )}
            </>
          ))}

          {/* ── CARGA / RM ── (la unidad la fijó el AdminBox al crear el WOD; el juez NO la cambia) */}
          {tipoScore === 'Carga' && (
            <div className="pj-field">
              <span className="pj-label">Intentos — en <b>{unidadPeso}</b> (unidad fija del WOD)</span>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '6px 0' }}>
                <input type="checkbox" disabled={dis} checked={st.esDupla} onChange={(e) => set('esDupla', e.target.checked)} />
                <span>Es dupla (suma el mejor válido de 2 atletas)</span>
              </label>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr style={{ opacity: 0.6, fontSize: 12, textAlign: 'left' }}>
                    <th style={{ padding: '3px 4px' }}>#</th>
                    {st.esDupla && <th style={{ padding: '3px 4px' }}>Atleta</th>}
                    <th style={{ padding: '3px 4px' }}>Peso ({unidadPeso})</th>
                    <th style={{ padding: '3px 4px', textAlign: 'center' }}>Válido</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {(st.intentos || []).map((it, idx) => (
                    <tr key={idx}>
                      <td style={{ padding: '3px 4px', opacity: 0.7 }}>{idx + 1}</td>
                      {st.esDupla && (
                        <td style={{ padding: '3px 4px' }}>
                          <select className="pj-input" disabled={dis} value={it.slot || 1} onChange={(e) => setIntento(idx, { slot: Number(e.target.value) })}>
                            <option value={1}>Atleta 1</option>
                            <option value={2}>Atleta 2</option>
                          </select>
                        </td>
                      )}
                      <td style={{ padding: '3px 4px' }}>
                        <input inputMode="decimal" className="pj-input" disabled={dis} placeholder="Ej: 102.5" value={it.peso} onChange={(e) => setIntento(idx, { peso: e.target.value })} />
                      </td>
                      <td style={{ padding: '3px 4px', textAlign: 'center' }}>
                        <input type="checkbox" disabled={dis} checked={!!it.valido} onChange={(e) => setIntento(idx, { valido: e.target.checked })} />
                      </td>
                      <td style={{ padding: '3px 4px', textAlign: 'center' }}>
                        <button type="button" disabled={dis} onClick={() => delIntento(idx)} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer' }} title="Quitar intento"><i className="fas fa-times"></i></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button type="button" disabled={dis} onClick={addIntento} style={{ marginTop: 6, background: 'none', border: '1px dashed rgba(255,255,255,0.3)', color: 'inherit', borderRadius: 6, padding: '5px 10px', cursor: 'pointer' }}>
                <i className="fas fa-plus"></i> Añadir intento
              </button>
              <SimuladorBarraJuez bumpers={bumpersComp} unidad={unidadPeso} />
            </div>
          )}

          {/* ── RONDAS + REPS ── */}
          {tipoScore === 'RondasReps' && (
            <div className="pj-grid2">
              <label className="pj-field"><span className="pj-label">Rondas</span><input {...numProps} placeholder="Ej: 5" value={st.rrRondas} onChange={(e) => set('rrRondas', e.target.value)} /></label>
              <label className="pj-field"><span className="pj-label">Reps extra</span><input {...numProps} placeholder="Ej: 12" value={st.rrReps} onChange={(e) => set('rrReps', e.target.value)} /></label>
            </div>
          )}

          {/* ── PUNTOS ── */}
          {tipoScore === 'Puntos' && (
            <label className="pj-field">
              <span className="pj-label">Puntos</span>
              <input {...numProps} placeholder="Ej: 87" value={st.puntos} onChange={(e) => set('puntos', e.target.value)} />
            </label>
          )}

          {/* ── TIEBREAK ── */}
          {wod?.tiebreakActivo && (
            <div className="pj-block">
              <div className="pj-block-head"><i className="fas fa-flag-checkered"></i> Desempate {wod.tiebreakDescripcion ? <span className="pj-hint">— {wod.tiebreakDescripcion}</span> : null}</div>
              <div className="pj-grid2">
                {tiebreakTipo === 'Tiempo' ? (
                  <label className="pj-field"><span className="pj-label">Tiempo (MM:SS)</span>
                    <TimeInputMMSS value={st.tbStr} onChange={(v) => set('tbStr', v)} className="pj-input" disabled={dis || st.tbNoAplica} />
                  </label>
                ) : (
                  <label className="pj-field"><span className="pj-label">Reps</span>
                    <input {...numProps} disabled={dis || st.tbNoAplica} value={st.tbStr} onChange={(e) => set('tbStr', e.target.value)} />
                  </label>
                )}
                <label className="pj-check pj-check--end">
                  <input type="checkbox" disabled={dis} checked={st.tbNoAplica} onChange={(e) => set('tbNoAplica', e.target.checked)} />
                  <span>Sin desempate</span>
                </label>
              </div>
            </div>
          )}

          {/* ── CHECKLIST ── */}
          {wod?.usaChecklist && criteriosActivos.length > 0 && (
            <div className="pj-block">
              <div className="pj-block-head"><i className="fas fa-clipboard-check"></i> Criterios de jueceo</div>
              {criteriosActivos.map((c) => {
                const val = st.checklist[c.idCriterioJueceo] ?? null;
                return (
                  <div key={c.idCriterioJueceo} className="pj-crit">
                    <span className="pj-crit-desc">
                      {c.descripcion}
                      {c.esDesempate && <span className="pj-crit-tb">Desempate</span>}
                    </span>
                    <div className="pj-tri">
                      <button type="button" disabled={dis} className={`pj-tri-btn pj-tri-ok${val === true ? ' on' : ''}`} onClick={() => setCheck(c.idCriterioJueceo, true)} title="Cumple"><i className="fas fa-check"></i></button>
                      <button type="button" disabled={dis} className={`pj-tri-btn pj-tri-no${val === false ? ' on' : ''}`} onClick={() => setCheck(c.idCriterioJueceo, false)} title="No cumple"><i className="fas fa-times"></i></button>
                      <button type="button" disabled={dis} className={`pj-tri-btn${val === null ? ' on' : ''}`} onClick={() => setCheck(c.idCriterioJueceo, null)} title="Sin evaluar">—</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Resultado en vivo + advertencias */}
      <div className="pj-foot">
        <div className="pj-result">
          <span className="pj-result-label">Resultado</span>
          <span className="pj-result-val">{valor.dnf ? 'DNF' : (valor.resultado != null ? `${valor.resultado}${tipoScore === 'Carga' ? ' ' + unidadPeso : ''}` : '—')}</span>
        </div>
        {valor.advertencias.map((a, i) => <div key={i} className="pj-warn"><i className="fas fa-triangle-exclamation"></i> {a}</div>)}
      </div>
    </div>
  );
}

function etiquetaTipo(t) {
  switch (t) {
    case 'ForTime': return 'For Time · menor gana';
    case 'AMRAP': return 'AMRAP · mayor gana';
    case 'Carga': return 'Carga / RM · mayor gana';
    case 'RondasReps': return 'Rondas + Reps · mayor gana';
    case 'Puntos': return 'Puntos · mayor gana';
    default: return t;
  }
}
