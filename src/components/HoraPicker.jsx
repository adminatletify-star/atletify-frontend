import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import './HoraPicker.css';

// Selector de hora en formato 12h (AM/PM) con estética de la app (modal centrado).
// IMPORTANTE: hacia afuera (value/onChange) sigue hablando en "HH:mm" 24h para no
// romper la lógica del backend ni del atleta; el 12h es solo presentación.
const HORAS12 = Array.from({ length: 12 }, (_, i) => String(i + 1)); // 1..12
const MINUTOS = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0')); // 00..55

function to12(value) {
  if (typeof value === 'string' && value.includes(':')) {
    const [HH, MM] = value.split(':');
    const h24 = parseInt(HH, 10);
    if (!Number.isNaN(h24)) {
      const period = h24 < 12 ? 'AM' : 'PM';
      let h12 = h24 % 12;
      if (h12 === 0) h12 = 12;
      return { h12: String(h12), mm: (MM || '00').padStart(2, '0'), period };
    }
  }
  return { h12: '', mm: '', period: 'PM' };
}

function to24(h12, mm, period) {
  let h = parseInt(h12, 10) % 12;
  if (period === 'PM') h += 12;
  return `${String(h).padStart(2, '0')}:${(mm || '00').padStart(2, '0')}`;
}

// "16:30" → "4:30 PM" para mostrar en el trigger
export function formatear12(value) {
  const { h12, mm, period } = to12(value);
  return h12 ? `${h12}:${mm} ${period}` : '';
}

export default function HoraPicker({ value, onChange, placeholder = 'Elegir hora', compact = false }) {
  const [abierto, setAbierto] = useState(false);
  const init = to12(value);
  const [h12, setH12] = useState(init.h12);
  const [mm, setMm] = useState(init.mm);
  const [period, setPeriod] = useState(init.period);

  // Sincronizar si el valor cambia desde afuera
  useEffect(() => {
    const t = to12(value);
    setH12(t.h12); setMm(t.mm); setPeriod(t.period);
  }, [value]);

  const emit = (nh, nm, np) => { if (nh) onChange(to24(nh, nm || '00', np)); };
  const pickHora = (h) => { setH12(h); emit(h, mm, period); };
  const pickMin = (m) => { setMm(m); if (h12) emit(h12, m, period); };
  const pickPeriod = (p) => { setPeriod(p); if (h12) emit(h12, mm, p); };

  const textoTrigger = h12 ? `${h12}:${mm || '00'} ${period}` : placeholder;

  return (
    <>
      <button
        type="button"
        className={`hp-trigger ${compact ? 'hp-trigger--compact' : ''} ${h12 ? 'hp-trigger--set' : ''}`}
        onClick={() => setAbierto(true)}
      >
        <i className="far fa-clock hp-trigger-icon"></i>
        <span className="hp-trigger-text">{textoTrigger}</span>
        <i className="fas fa-chevron-down hp-chevron"></i>
      </button>

      {abierto && createPortal(
        <div className="hp-overlay" onClick={() => setAbierto(false)}>
          <div className="hp-panel" onClick={e => e.stopPropagation()}>
            <div className="hp-header">
              <span className="hp-title"><i className="far fa-clock me-2"></i>Hora de revelación</span>
              <button type="button" className="hp-close" onClick={() => setAbierto(false)} aria-label="Cerrar">
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="hp-preview">
              {h12 || '--'}<span className="hp-preview-sep">:</span>{mm || '--'}
              <span className="hp-preview-period">{period}</span>
            </div>

            <div className="hp-cols">
              <div className="hp-col">
                <span className="hp-col-label">Hora</span>
                <div className="hp-list">
                  {HORAS12.map(h => (
                    <button
                      key={h}
                      type="button"
                      className={`hp-cell ${h12 === h ? 'hp-cell--active' : ''}`}
                      onClick={() => pickHora(h)}
                    >{h}</button>
                  ))}
                </div>
              </div>
              <div className="hp-col">
                <span className="hp-col-label">Min</span>
                <div className="hp-list">
                  {MINUTOS.map(m => (
                    <button
                      key={m}
                      type="button"
                      className={`hp-cell ${mm === m ? 'hp-cell--active' : ''}`}
                      onClick={() => pickMin(m)}
                    >{m}</button>
                  ))}
                </div>
              </div>
            </div>

            <div className="hp-period-seg">
              {['AM', 'PM'].map(p => (
                <button
                  key={p}
                  type="button"
                  className={`hp-period-btn ${period === p ? 'hp-period-btn--active' : ''}`}
                  onClick={() => pickPeriod(p)}
                >{p}</button>
              ))}
            </div>

            <button type="button" className="hp-done" onClick={() => setAbierto(false)}>
              <i className="fas fa-check me-1"></i>Listo
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
