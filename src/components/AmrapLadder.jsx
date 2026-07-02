import { useState, useMemo, useEffect, useRef } from 'react';

// Tabla cumulativa del AMRAP (Hoja4). El juez palomea cada movimiento por ronda; la tabla crece
// sola con "+Ronda"; al acabar el tiempo mete las reps parciales del movimiento en curso.
// El total (round + reps) lo calcula solo; el servidor lo revalida al guardar.

// Reps de un movimiento en una ronda: "2-4-6-8-10-12" (ladder, extrapola con la última diferencia) o "5" (constante).
export const repsEnRonda = (esquema, ronda) => {
  if (!esquema || ronda < 1) return 0;
  const nums = String(esquema).split('-')
    .map((s) => { const d = (s.match(/\d+/) || [])[0]; return d ? parseInt(d, 10) : null; })
    .filter((n) => n != null);
  if (nums.length === 0) return 0;
  if (nums.length === 1) return nums[0];
  if (ronda <= nums.length) return nums[ronda - 1];
  const diff = nums[nums.length - 1] - nums[nums.length - 2];
  return Math.max(0, nums[nums.length - 1] + diff * (ronda - nums.length));
};

export default function AmrapLadder({ movimientos = [], disabled = false, onChange }) {
  const movs = useMemo(() => (movimientos || [])
    .map((m) => ({ id: m.idWodCompMovimiento, nombre: m.nombreEjercicio || m.nombreCustom || 'Movimiento', esquema: m.esquemaReps || '' }))
    .filter((m) => m.id), [movimientos]);

  const rondasBase = useMemo(() => {
    let max = 3;
    movs.forEach((m) => { const n = String(m.esquema).split('-').filter((x) => /\d/.test(x)).length; if (n > max) max = n; });
    return max;
  }, [movs]);

  const [rondas, setRondas] = useState(rondasBase);
  useEffect(() => { setRondas(rondasBase); }, [rondasBase]);
  const [hechos, setHechos] = useState({}); // `${id}_${r}` => true
  const [parcialMov, setParcialMov] = useState('');
  const [parcialReps, setParcialReps] = useState('');

  const toggle = (id, r) => setHechos((p) => ({ ...p, [`${id}_${r}`]: !p[`${id}_${r}`] }));

  // Ronda "en curso" = nº de rondas completas + 1 (para asignar las reps parciales).
  const rondaActual = useMemo(() => {
    let completas = 0;
    for (let r = 1; r <= rondas; r++) {
      if (movs.length > 0 && movs.every((m) => hechos[`${m.id}_${r}`])) completas = r; else break;
    }
    return completas + 1;
  }, [hechos, rondas, movs]);

  const { total, palomeo, cumulativo } = useMemo(() => {
    let t = 0; const pal = []; const cum = {};
    for (let r = 1; r <= rondas; r++) {
      for (const m of movs) {
        if (hechos[`${m.id}_${r}`]) {
          t += repsEnRonda(m.esquema, r);
          pal.push({ idWodCompMovimiento: m.id, ronda: r, completado: true, repsParciales: null });
          cum[`${m.id}_${r}`] = t;
        }
      }
    }
    const pr = parseInt(parcialReps, 10);
    if (parcialMov && pr > 0) {
      const m = movs.find((x) => String(x.id) === String(parcialMov));
      if (m) {
        t += Math.max(0, Math.min(pr, repsEnRonda(m.esquema, rondaActual)));
        pal.push({ idWodCompMovimiento: m.id, ronda: rondaActual, completado: false, repsParciales: pr });
      }
    }
    return { total: t, palomeo: pal, cumulativo: cum };
  }, [hechos, rondas, movs, parcialMov, parcialReps, rondaActual]);

  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; });
  useEffect(() => { onChangeRef.current?.({ total, palomeo }); }, [total, palomeo]);

  const rondasArr = Array.from({ length: rondas }, (_, i) => i + 1);
  const th = { padding: '4px 6px', fontSize: 11, opacity: 0.6, textAlign: 'center' };
  const td = { padding: '4px 6px', borderTop: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' };

  if (movs.length === 0) return null;

  return (
    <div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13 }}>
          <thead>
            <tr>
              <th style={{ ...th, textAlign: 'left', minWidth: 130 }}>Movimiento</th>
              {rondasArr.map((r) => <th key={r} style={th}>R{r}</th>)}
            </tr>
          </thead>
          <tbody>
            {movs.map((m) => (
              <tr key={m.id}>
                <td style={{ ...td, textAlign: 'left' }}>
                  {m.nombre}
                  <span style={{ display: 'block', fontSize: 10, opacity: 0.5 }}>{m.esquema}</span>
                </td>
                {rondasArr.map((r) => {
                  const on = !!hechos[`${m.id}_${r}`];
                  return (
                    <td key={r} style={{ ...td, background: on ? 'rgba(74,222,128,0.12)' : 'transparent' }}>
                      <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, cursor: disabled ? 'default' : 'pointer' }}>
                        <input type="checkbox" disabled={disabled} checked={on} onChange={() => toggle(m.id, r)} />
                        <span style={{ fontSize: 11, opacity: 0.8 }}>{repsEnRonda(m.esquema, r)}{on && cumulativo[`${m.id}_${r}`] != null ? ` ·${cumulativo[`${m.id}_${r}`]}` : ''}</span>
                      </label>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginTop: 8 }}>
        <button type="button" disabled={disabled} onClick={() => setRondas((r) => r + 1)}
          style={{ background: 'none', border: '1px dashed rgba(255,255,255,0.3)', color: 'inherit', borderRadius: 6, padding: '5px 10px', cursor: 'pointer' }}>
          <i className="fas fa-plus"></i> Ronda
        </button>
        <span style={{ fontSize: 12, opacity: 0.7 }}>A media (ronda {rondaActual}):</span>
        <select disabled={disabled} value={parcialMov} onChange={(e) => setParcialMov(e.target.value)}
          style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.25)', color: 'inherit' }}>
          <option value="">— movimiento —</option>
          {movs.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
        </select>
        <input type="number" inputMode="numeric" disabled={disabled} placeholder="reps" value={parcialReps} onChange={(e) => setParcialReps(e.target.value)}
          style={{ width: 70, padding: '5px 8px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.25)', color: 'inherit' }} />
      </div>

      <div style={{ marginTop: 8, fontWeight: 700 }}>
        Total: <span style={{ color: '#f59e0b' }}>{total} reps</span>
      </div>
    </div>
  );
}
