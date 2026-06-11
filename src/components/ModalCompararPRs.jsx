import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList
} from 'recharts';
import AtletifyLoader from './AtletifyLoader';
import '../assets/css/comparar-prs.css';

const API_BASE = import.meta.env.VITE_API_URL;
const LBS_POR_KG = 2.20462;

// Convierte un valor de su unidad de origen a la unidad destino (lbs/kg).
function convertir(valor, desde, hacia) {
  const u = (desde || 'lbs').toLowerCase();
  if (u === hacia) return valor;
  if (u === 'kg' && hacia === 'lbs') return valor * LBS_POR_KG;
  if (u === 'lbs' && hacia === 'kg') return valor / LBS_POR_KG;
  return valor;
}
const redondear = (n) => Math.round(n * 10) / 10;
const norm = (s) => (s || '').toString().normalize('NFD').replace(new RegExp('[\\u0300-\\u036f]', 'g'), '').trim().toLowerCase();

// Colores de las series y del incremento por signo (tema oscuro).
const COL = { tu: '#E63946', compa: '#2ECC71', up: '#2ECC71', flat: '#6B7280', down: '#E63946', base: '#C7C7D1' };

// Construye { txt, signo } del incremento de un punto contra el valor previo real de su serie.
//  valPrev == null  → primer PR real (base): muestra el valor absoluto, sin signo.
//  valActual == null → no hay punto aquí (hueco): se omite la etiqueta.
function deltaInfo(valActual, valPrev) {
  if (valActual == null) return { txt: '', signo: null };
  if (valPrev == null) return { txt: `${valActual}`, signo: 'base' };
  const d = redondear(valActual - valPrev);
  if (d > 0) return { txt: `+${d}`, signo: 'up' };
  if (d < 0) return { txt: `${d}`, signo: 'down' }; // d ya incluye el signo '-'
  return { txt: '=', signo: 'flat' };
}

// Agrupa el historial por ejercicio. Clave: idEjercicio, con fallback al nombre normalizado.
function agruparPorEjercicio(historial) {
  const map = new Map();
  (historial || []).forEach(m => {
    const key = m.idEjercicio != null ? `id:${m.idEjercicio}` : `nom:${norm(m.nombreEjercicio)}`;
    if (!map.has(key)) map.set(key, { key, nombre: m.nombreEjercicio, marcas: [] });
    map.get(key).marcas.push(m);
  });
  return map;
}

export default function ModalCompararPRs({ miId, compa, onCerrar }) {
  const [cargando, setCargando] = useState(true);
  const [histMio, setHistMio] = useState([]);
  const [histCompa, setHistCompa] = useState([]);
  const [unidad, setUnidad] = useState('lbs');           // unidad de comparación elegida
  const [ejercicioSel, setEjercicioSel] = useState(null); // { key, nombre } o null (lista)

  const idCompa = compa.idLobo;
  const compaNombre = compa.apodo || (compa.nombre || '').split(' ')[0] || 'Compa';

  useEffect(() => {
    let activo = true;
    (async () => {
      setCargando(true);
      try {
        const [r1, r2] = await Promise.all([
          fetch(`${API_BASE}/marcaspersonales/usuario/${miId}`),
          fetch(`${API_BASE}/marcaspersonales/usuario/${idCompa}`),
        ]);
        const d1 = r1.ok ? await r1.json() : {};
        const d2 = r2.ok ? await r2.json() : {};
        if (!activo) return;
        setHistMio(d1.historialCompleto || []);
        setHistCompa(d2.historialCompleto || []);
      } catch (e) {
        console.error('Error comparando PRs', e);
      } finally {
        if (activo) setCargando(false);
      }
    })();
    return () => { activo = false; };
  }, [miId, idCompa]);

  // Ejercicios que AMBOS tienen registrados.
  const ejerciciosComunes = useMemo(() => {
    const mapMio = agruparPorEjercicio(histMio);
    const mapCompa = agruparPorEjercicio(histCompa);
    const comunes = [];
    mapMio.forEach((v, key) => {
      if (mapCompa.has(key)) {
        comunes.push({ key, nombre: v.nombre, mias: v.marcas, suyas: mapCompa.get(key).marcas });
      }
    });
    comunes.sort((a, b) => norm(a.nombre).localeCompare(norm(b.nombre)));
    return comunes;
  }, [histMio, histCompa]);

  // Máximo de un set de marcas en la unidad elegida.
  const maxEn = (marcas) => {
    if (!marcas?.length) return 0;
    return redondear(Math.max(...marcas.map(m => convertir(Number(m.valor), m.unidad, unidad))));
  };

  // Serie de un ejercicio ordenada por fecha → valores en la unidad elegida (1 por intento).
  const serieValores = (marcas) => [...marcas]
    .sort((a, b) => new Date(a.fechaLogro) - new Date(b.fechaLogro))
    .map(m => redondear(convertir(Number(m.valor), m.unidad, unidad)));

  // Datos de la gráfica del ejercicio seleccionado. Eje X = número de intento.
  // Cada punto lleva además el incremento vs el PR anterior real de su serie (tuDelta/compaDelta).
  const datosGrafica = useMemo(() => {
    if (!ejercicioSel) return [];
    const ej = ejerciciosComunes.find(e => e.key === ejercicioSel.key);
    if (!ej) return [];
    const mias = serieValores(ej.mias);
    const suyas = serieValores(ej.suyas);
    const n = Math.max(mias.length, suyas.length);

    // Anota el delta de cada punto contra el último valor NO-NULL de la misma serie.
    const conDeltas = (arr) => {
      let prev = null;
      return arr.map((v) => {
        const info = deltaInfo(v ?? null, prev);
        if (v != null) prev = v; // el previo solo avanza con valores reales (ignora huecos)
        return info;
      });
    };
    const dTu = conDeltas(mias);
    const dCo = conDeltas(suyas);

    const data = [];
    for (let i = 0; i < n; i++) {
      data.push({
        intento: `#${i + 1}`,
        tu: mias[i] ?? null,
        compa: suyas[i] ?? null,
        tuDelta: dTu[i]?.txt ?? '', tuSigno: dTu[i]?.signo ?? null,
        compaDelta: dCo[i]?.txt ?? '', compaSigno: dCo[i]?.signo ?? null,
      });
    }
    return data;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ejercicioSel, ejerciciosComunes, unidad]);

  const maxIntentos = datosGrafica.length; // densidad → ajusta tamaño de etiquetas y eje X

  const ejActual = ejercicioSel ? ejerciciosComunes.find(e => e.key === ejercicioSel.key) : null;
  const miMax = ejActual ? maxEn(ejActual.mias) : 0;
  const suMax = ejActual ? maxEn(ejActual.suyas) : 0;
  const ventaja = redondear(Math.abs(miMax - suMax));

  // Nº de PRs (cronológicos) que le tomó a cada quien llegar a su máximo (posición del 1er máximo).
  const prsParaMax = (marcas) => {
    const serie = serieValores(marcas || []);
    if (!serie.length) return 0;
    const mx = Math.max(...serie);
    return serie.findIndex(v => v === mx) + 1;
  };
  const nTuPRs = ejActual ? prsParaMax(ejActual.mias) : 0;
  const nCompaPRs = ejActual ? prsParaMax(ejActual.suyas) : 0;

  // Valor mínimo global del plot: SU etiqueta va siempre arriba para que el primer número
  // (base del punto más bajo) se aprecie bien y no choque con el eje X ni los ticks.
  const valorMin = datosGrafica.length
    ? Math.min(...datosGrafica.flatMap(d => [d.tu, d.compa]).filter(v => v != null))
    : null;

  // Etiqueta SVG del incremento sobre cada punto. Factory por serie (serieKey + signoKey).
  const renderDelta = (serieKey, signoKey) => (props) => {
    const { x, y, value, index } = props;
    // Recharts invoca este content para TODOS los puntos (a los huecos les pone y=0),
    // así que la barrera real anti-etiqueta-fantasma es !value: en un hueco el delta es '' (string vacío).
    if (!value || x == null || y == null || Number.isNaN(x) || Number.isNaN(y)) return null;
    const punto = datosGrafica[index];
    const signo = punto?.[signoKey]; // 'base' | 'up' | 'down' | 'flat'
    const fill = COL[signo] || COL.flat;
    const fs = maxIntentos > 10 ? 9 : maxIntentos > 6 ? 10 : 11;
    // Coloca la etiqueta del lado OPUESTO a la otra serie para que nunca se encimen:
    // en cada intento, el punto más alto lleva su etiqueta arriba y el más bajo, abajo.
    const propio = punto?.[serieKey];
    const otro = serieKey === 'tu' ? punto?.compa : punto?.tu;
    // 1) El punto MÁS BAJO del plot siempre arriba (su número se aprecia sin chocar con el eje X).
    // 2) Si no, lado OPUESTO a la otra serie (más alto arriba, más bajo abajo); empate → tu arriba.
    let arriba;
    if (propio != null && propio === valorMin) {
      arriba = true;
    } else if (otro == null || propio == null) {
      arriba = serieKey === 'tu';
    } else {
      arriba = propio === otro ? serieKey === 'tu' : propio > otro;
    }
    const dy = arriba ? -12 : 16;
    return (
      <text
        x={x} y={y + dy} textAnchor="middle"
        fontSize={fs} fontWeight={700} fill={fill}
        style={{ paintOrder: 'stroke', stroke: '#12121A', strokeWidth: 3, strokeLinejoin: 'round' }}
      >
        {value}
      </text>
    );
  };
  // Memoizadas para conservar la referencia del content entre renders que no cambian los datos.
  // renderDelta solo lee datosGrafica y maxIntentos, que ya están en las deps.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const renderDeltaTu = useMemo(() => renderDelta('tu', 'tuSigno'), [datosGrafica, maxIntentos, valorMin]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const renderDeltaCompa = useMemo(() => renderDelta('compa', 'compaSigno'), [datosGrafica, maxIntentos, valorMin]);

  return createPortal(
    <div className="cpr-overlay" onClick={onCerrar}>
      <div className="cpr-modal" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="cpr-header">
          {ejercicioSel ? (
            <button className="cpr-back" onClick={() => setEjercicioSel(null)} title="Volver">
              <i className="fas fa-arrow-left"></i>
            </button>
          ) : (
            <div className="cpr-header-icon"><i className="fas fa-chart-line"></i></div>
          )}
          <div className="cpr-header-text">
            <h5 className="cpr-title">
              {ejercicioSel ? ejercicioSel.nombre : <>TÚ <span>VS {compaNombre}</span></>}
            </h5>
            <p className="cpr-subtitle">
              {ejercicioSel ? 'Progreso por intento' : 'Récords personales en común'}
            </p>
          </div>
          <button className="cpr-close" onClick={onCerrar} title="Cerrar">
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Body */}
        <div className="cpr-body">
          {cargando ? (
            <div className="cpr-loading"><AtletifyLoader /></div>
          ) : ejerciciosComunes.length === 0 ? (
            <div className="cpr-empty">
              <i className="fas fa-chart-line"></i>
              <p>No tienen ejercicios en común todavía.</p>
              <span>Cuando ambos registren el mismo ejercicio, aquí verás la comparación de su progreso.</span>
            </div>
          ) : !ejercicioSel ? (
            /* LISTA de ejercicios en común */
            <div className="cpr-list">
              {ejerciciosComunes.map(ej => (
                <button
                  key={ej.key}
                  className="cpr-ej-row"
                  onClick={() => setEjercicioSel({ key: ej.key, nombre: ej.nombre })}
                >
                  <span className="cpr-ej-icon"><i className="fas fa-dumbbell"></i></span>
                  <div className="cpr-ej-info">
                    <div className="cpr-ej-name">{ej.nombre}</div>
                    <div className="cpr-ej-vals">
                      <span className="cpr-ej-mio">Tú {maxEn(ej.mias)}</span>
                      <span className="cpr-ej-vs">vs</span>
                      <span className="cpr-ej-suyo">{compaNombre} {maxEn(ej.suyas)}</span>
                      <span className="cpr-ej-unidad">{unidad}</span>
                    </div>
                  </div>
                  <i className="fas fa-chevron-right cpr-ej-arrow"></i>
                </button>
              ))}
            </div>
          ) : (
            /* GRÁFICA de progreso del ejercicio seleccionado */
            <div className="cpr-chart-wrap">
              <div className="cpr-unit-toggle">
                <span className="cpr-unit-label">Unidad</span>
                <div className="cpr-unit-btns">
                  <button className={unidad === 'lbs' ? 'is-active' : ''} onClick={() => setUnidad('lbs')}>lbs</button>
                  <button className={unidad === 'kg' ? 'is-active' : ''} onClick={() => setUnidad('kg')}>kg</button>
                </div>
              </div>

              {/* Leyenda FUERA del plot para no estorbar los datos */}
              <div className="cpr-legend-box">
                <span className="cpr-legend-item"><i className="cpr-legend-dot" style={{ background: COL.tu }} />Tú</span>
                <span className="cpr-legend-item"><i className="cpr-legend-dot" style={{ background: COL.compa }} />{compaNombre}</span>
              </div>

              <div className="cpr-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={datosGrafica} margin={{ top: 24, right: 24, left: 6, bottom: 6 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" />
                    <XAxis
                      dataKey="intento" stroke="#8a8a96" fontSize={12} tickLine={false}
                      axisLine={{ stroke: 'rgba(255,255,255,0.12)' }}
                      padding={{ left: 22, right: 26 }}
                      interval={maxIntentos > 12 ? 'preserveStartEnd' : 0}
                      angle={maxIntentos > 8 ? -35 : 0}
                      textAnchor={maxIntentos > 8 ? 'end' : 'middle'}
                      height={maxIntentos > 8 ? 42 : 24}
                    />
                    <YAxis
                      stroke="#8a8a96" fontSize={12} tickLine={false} width={40}
                      axisLine={{ stroke: 'rgba(255,255,255,0.12)' }}
                      domain={['dataMin - 10', 'dataMax + 16']}
                      tickFormatter={(v) => Math.round(v)}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1C1C26', border: '1px solid #333', borderRadius: '10px', fontSize: '0.8rem' }}
                      labelStyle={{ color: '#9a9aa6' }}
                      formatter={(v, name) => [v == null ? '—' : `${v} ${unidad}`, name]}
                    />
                    <Line
                      type="monotone" dataKey="tu" name="Tú" stroke={COL.tu} strokeWidth={2.5}
                      dot={{ r: 4, strokeWidth: 0, fill: COL.tu }} activeDot={{ r: 6 }}
                      connectNulls isAnimationActive={false}
                    >
                      <LabelList dataKey="tuDelta" content={renderDeltaTu} />
                    </Line>
                    <Line
                      type="monotone" dataKey="compa" name={compaNombre} stroke={COL.compa} strokeWidth={2.5}
                      dot={{ r: 4, strokeWidth: 0, fill: COL.compa }} activeDot={{ r: 6 }}
                      connectNulls isAnimationActive={false}
                    >
                      <LabelList dataKey="compaDelta" content={renderDeltaCompa} />
                    </Line>
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="cpr-resumen">
                <div className="cpr-resumen-row cpr-resumen-mio">
                  <span className="cpr-resumen-dot" style={{ background: COL.tu }} />
                  <span className="cpr-resumen-txt">
                    A ti te costó <strong>{nTuPRs} {nTuPRs === 1 ? 'PR' : 'PRs'}</strong> llegar a <strong>{miMax} {unidad}</strong>
                  </span>
                </div>
                <div className="cpr-resumen-row cpr-resumen-suyo">
                  <span className="cpr-resumen-dot" style={{ background: COL.compa }} />
                  <span className="cpr-resumen-txt">
                    A {compaNombre} le tomó <strong>{nCompaPRs} {nCompaPRs === 1 ? 'PR' : 'PRs'}</strong> llegar a <strong>{suMax} {unidad}</strong>
                  </span>
                </div>
                <div className="cpr-resumen-diff">
                  {miMax === suMax
                    ? <span className="cpr-resumen-tie">Empate en {miMax} {unidad}</span>
                    : <span>{miMax > suMax ? 'Le ganas por' : 'Te gana por'} <strong>{ventaja} {unidad}</strong></span>}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
