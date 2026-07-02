import { useState, useMemo } from 'react';

// Simulador de barra COMPACTO para el juez (Max/1RM). Sugerencias OFF: solo dice cómo cargar
// el peso objetivo con los bumpers DE LA COMPETENCIA (no los del box). Si no se puede exacto, lo avisa.
const COLOR = {
  lb: { 2.5: '#8f9aa7', 5: '#e2e8f0', 10: '#43aa8b', 15: '#2a9d8f', 25: '#f4c430', 35: '#1d6df2', 45: '#e63946', 55: '#c1121f' },
  kg: { 0.5: '#d4d8db', 1: '#a8b2d1', 1.5: '#6c8ebf', 2.5: '#8f9aa7', 5: '#e2e8f0', 10: '#2a9d8f', 15: '#f4c430', 20: '#1d6df2', 25: '#e63946' },
};
const textoOscuro = new Set(['5', '25', '2.5', '1', '1.5', '0.5']);

export default function SimuladorBarraJuez({ bumpers = [], unidad = 'kg' }) {
  const barraDefault = unidad === 'kg' ? 20 : 45;
  const [barra, setBarra] = useState(barraDefault);
  const [objetivo, setObjetivo] = useState('');

  // Bumpers de la unidad del WOD, disponibles POR LADO = floor(cantidad / 2) (van a ambos lados).
  const disponibles = useMemo(() => {
    const map = {};
    (bumpers || []).filter(b => (b.unidad || '').toLowerCase() === unidad).forEach(b => {
      map[b.peso] = (map[b.peso] || 0) + Math.floor((b.cantidad || 0) / 2);
    });
    return Object.entries(map)
      .map(([peso, porLado]) => ({ peso: Number(peso), porLado }))
      .filter(x => x.porLado > 0)
      .sort((a, b) => b.peso - a.peso);
  }, [bumpers, unidad]);

  const calc = useMemo(() => {
    const obj = Number(objetivo);
    if (!obj || obj <= barra) return null;
    let resto = (obj - barra) / 2; // por lado
    const usados = [];
    for (const d of disponibles) {
      if (resto <= 0.001) break;
      const n = Math.min(Math.floor((resto + 0.001) / d.peso), d.porLado);
      if (n > 0) { usados.push({ peso: d.peso, n }); resto -= n * d.peso; }
    }
    return { usados, faltaPorLado: Math.max(0, resto), exacto: resto < 0.01 };
  }, [objetivo, barra, disponibles]);

  const disco = (peso) => {
    const fondo = (COLOR[unidad] || COLOR.kg)[peso] || '#6c757d';
    const texto = textoOscuro.has(String(peso)) ? '#111' : '#fff';
    return { fondo, texto };
  };

  const S = {
    wrap: { marginTop: 12, padding: 12, border: '1px dashed rgba(255,255,255,0.2)', borderRadius: 8 },
    inp: { width: 90, padding: '6px 8px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.25)', color: 'inherit' },
  };

  return (
    <div style={S.wrap}>
      <div style={{ fontSize: 13, fontWeight: 700, opacity: 0.85, marginBottom: 8 }}>
        <i className="fas fa-weight-hanging me-1"></i> Simulador de barra (bumpers de la competencia)
      </div>
      {disponibles.length === 0 ? (
        <p style={{ fontSize: 12, opacity: 0.6, margin: 0 }}>Esta competencia no tiene bumpers en {unidad} en su inventario.</p>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 10 }}>
            <label style={{ fontSize: 12 }}>Barra
              <input type="number" style={{ ...S.inp, marginLeft: 6 }} value={barra} onChange={e => setBarra(Number(e.target.value) || 0)} />
            </label>
            <label style={{ fontSize: 12 }}>Objetivo ({unidad})
              <input type="number" inputMode="decimal" style={{ ...S.inp, marginLeft: 6 }} placeholder="Ej: 100" value={objetivo} onChange={e => setObjetivo(e.target.value)} />
            </label>
          </div>

          {calc && (
            <div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, opacity: 0.6 }}>Por lado:</span>
                {calc.usados.length === 0 && <span style={{ fontSize: 12, opacity: 0.6 }}>(solo barra)</span>}
                {calc.usados.map((u, i) => Array.from({ length: u.n }).map((_, k) => {
                  const c = disco(u.peso);
                  return (
                    <span key={`${i}-${k}`} title={`${u.peso} ${unidad}`}
                      style={{ background: c.fondo, color: c.texto, borderRadius: 4, padding: '3px 7px', fontSize: 12, fontWeight: 700 }}>
                      {u.peso}
                    </span>
                  );
                }))}
              </div>
              {calc.exacto ? (
                <p style={{ fontSize: 12, color: '#4ade80', margin: '8px 0 0' }}>
                  ✅ Se arma exacto: barra {barra} + ({calc.usados.map(u => `${u.n}×${u.peso}`).join(' + ') || '—'}) por lado.
                </p>
              ) : (
                <p style={{ fontSize: 12, color: '#fbbf24', margin: '8px 0 0' }}>
                  ⚠️ No se arma exacto con el inventario: faltan <b>{(calc.faltaPorLado).toFixed(2)} {unidad}</b> por lado.
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
