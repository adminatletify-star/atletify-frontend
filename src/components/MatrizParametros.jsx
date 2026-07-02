import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { COMPETENCIAS_ENDPOINT } from '../services/api';

// Matriz de parámetros (Hoja1): filas = skills, columnas = categorías.
// Cada skill es de tipo "Peso" (valor ♀/♂ por categoría) o "Palomita" (booleano: si esa categoría hace el skill).
export default function MatrizParametros({ idCompetencia, onCerrar }) {
  const [categorias, setCategorias] = useState([]);
  const [skills, setSkills] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${COMPETENCIAS_ENDPOINT}/${idCompetencia}/parametros`);
        const d = await r.json();
        setCategorias(d.categorias || []);
        const map = new Map();
        (d.parametros || []).forEach(p => {
          const key = `${p.nombreSkill}||${p.tipoParametro}`;
          if (!map.has(key)) map.set(key, { nombreSkill: p.nombreSkill, tipoParametro: p.tipoParametro, orden: p.orden, celdas: {} });
          map.get(key).celdas[p.idCategoriaComp] = { pesoHombre: p.pesoHombre || '', pesoMujer: p.pesoMujer || '', haceSkill: !!p.haceSkill };
        });
        setSkills(Array.from(map.values()).sort((a, b) => a.orden - b.orden));
      } catch { setMsg('No se pudieron cargar los parámetros.'); }
      finally { setCargando(false); }
    })();
  }, [idCompetencia]);

  const celda = (s, idCat) => s.celdas[idCat] || { pesoHombre: '', pesoMujer: '', haceSkill: false };
  const setCelda = (si, idCat, patch) => setSkills(prev => prev.map((s, i) => i === si ? { ...s, celdas: { ...s.celdas, [idCat]: { ...celda(s, idCat), ...patch } } } : s));
  const setSkill = (si, patch) => setSkills(prev => prev.map((s, i) => i === si ? { ...s, ...patch } : s));
  const addSkill = () => setSkills(prev => [...prev, { nombreSkill: '', tipoParametro: 'Peso', orden: prev.length, celdas: {} }]);
  const delSkill = (si) => setSkills(prev => prev.filter((_, i) => i !== si));

  const guardar = async () => {
    setGuardando(true); setMsg('');
    const payload = [];
    skills.forEach((s, si) => {
      if (!s.nombreSkill.trim()) return;
      categorias.forEach(c => {
        const cel = celda(s, c.idCategoriaComp);
        payload.push({
          idCategoriaComp: c.idCategoriaComp,
          nombreSkill: s.nombreSkill.trim(),
          tipoParametro: s.tipoParametro,
          pesoHombre: s.tipoParametro === 'Peso' ? (cel.pesoHombre || '') : '',
          pesoMujer: s.tipoParametro === 'Peso' ? (cel.pesoMujer || '') : '',
          haceSkill: s.tipoParametro === 'Palomita' ? !!cel.haceSkill : false,
          orden: si
        });
      });
    });
    try {
      const token = localStorage.getItem('token');
      const r = await fetch(`${COMPETENCIAS_ENDPOINT}/${idCompetencia}/parametros`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      const d = await r.json().catch(() => ({}));
      setMsg(r.ok ? '✅ Parámetros guardados.' : (d.mensaje || 'Error al guardar.'));
    } catch { setMsg('Error de red.'); }
    finally { setGuardando(false); }
  };

  const S = {
    overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 },
    modal: { width: '100%', maxWidth: 1000, maxHeight: '90vh', overflow: 'auto', background: '#14141c', color: '#e5e7eb', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: 20 },
    th: { padding: '6px 8px', fontSize: 12, textAlign: 'center', borderBottom: '2px solid rgba(255,255,255,0.15)', whiteSpace: 'nowrap' },
    td: { padding: '5px 6px', borderBottom: '1px solid rgba(255,255,255,0.06)', verticalAlign: 'middle' },
    inp: { width: '100%', minWidth: 54, padding: '5px 6px', borderRadius: 5, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.25)', color: 'inherit', fontSize: 12, boxSizing: 'border-box' },
    btn: { padding: '9px 16px', background: '#f59e0b', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, cursor: 'pointer' },
    ghost: { padding: '7px 12px', background: 'transparent', color: '#e5e7eb', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 6, cursor: 'pointer' },
  };

  return createPortal(
    <div style={S.overlay} onClick={onCerrar}>
      <div style={S.modal} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ margin: 0 }}>Parámetros (Categoría × Skill)</h3>
          <button style={S.ghost} onClick={onCerrar}><i className="fas fa-times"></i></button>
        </div>

        {cargando ? <p>Cargando…</p> : categorias.length === 0 ? (
          <p style={{ opacity: 0.7 }}>Esta competencia no tiene categorías activas. Crea categorías primero.</p>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                <thead>
                  <tr>
                    <th style={{ ...S.th, textAlign: 'left', minWidth: 150 }}>Skill</th>
                    <th style={S.th}>Tipo</th>
                    {categorias.map(c => <th key={c.idCategoriaComp} style={S.th}>{c.nombre}</th>)}
                    <th style={S.th}></th>
                  </tr>
                </thead>
                <tbody>
                  {skills.map((s, si) => (
                    <tr key={si}>
                      <td style={S.td}>
                        <input style={S.inp} placeholder="Ej. Dead Lift / Burpees" value={s.nombreSkill}
                          onChange={e => setSkill(si, { nombreSkill: e.target.value })} />
                      </td>
                      <td style={S.td}>
                        <select style={S.inp} value={s.tipoParametro} onChange={e => setSkill(si, { tipoParametro: e.target.value })}>
                          <option value="Peso">Peso ♀/♂</option>
                          <option value="Palomita">Palomita</option>
                        </select>
                      </td>
                      {categorias.map(c => {
                        const cel = celda(s, c.idCategoriaComp);
                        return (
                          <td key={c.idCategoriaComp} style={{ ...S.td, textAlign: 'center' }}>
                            {s.tipoParametro === 'Peso' ? (
                              <div style={{ display: 'flex', gap: 4 }}>
                                <input style={S.inp} placeholder="♀" value={cel.pesoMujer}
                                  onChange={e => setCelda(si, c.idCategoriaComp, { pesoMujer: e.target.value })} />
                                <input style={S.inp} placeholder="♂" value={cel.pesoHombre}
                                  onChange={e => setCelda(si, c.idCategoriaComp, { pesoHombre: e.target.value })} />
                              </div>
                            ) : (
                              <input type="checkbox" checked={!!cel.haceSkill}
                                onChange={e => setCelda(si, c.idCategoriaComp, { haceSkill: e.target.checked })} />
                            )}
                          </td>
                        );
                      })}
                      <td style={{ ...S.td, textAlign: 'center' }}>
                        <button style={{ ...S.ghost, padding: '4px 8px', color: '#f87171' }} onClick={() => delSkill(si)} title="Quitar skill">
                          <i className="fas fa-trash"></i>
                        </button>
                      </td>
                    </tr>
                  ))}
                  {skills.length === 0 && (
                    <tr><td colSpan={categorias.length + 3} style={{ ...S.td, textAlign: 'center', opacity: 0.6 }}>Sin skills. Agrega el primero.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, flexWrap: 'wrap', gap: 8 }}>
              <button style={S.ghost} onClick={addSkill}><i className="fas fa-plus me-1"></i>Añadir skill</button>
              {msg && <span style={{ fontSize: 13 }}>{msg}</span>}
              <button style={{ ...S.btn, opacity: guardando ? 0.6 : 1 }} disabled={guardando} onClick={guardar}>
                {guardando ? 'Guardando…' : 'Guardar parámetros'}
              </button>
            </div>
            <p style={{ fontSize: 12, opacity: 0.6, marginTop: 8 }}>
              "Peso" = valor por género (ej. <em>95 lb</em>). "Palomita" = marca si esa categoría hace ese skill.
            </p>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}
