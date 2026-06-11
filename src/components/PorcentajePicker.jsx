import { useState } from 'react';
import { createPortal } from 'react-dom';
import './PorcentajePicker.css';

const PORCENTAJES = [40, 50, 60, 70, 75, 80, 85, 90, 95];

/**
 * Selector modal (on-brand) de porcentaje de entrenamiento.
 * - `valor`: porcentaje seleccionado (number) o null.
 * - `onCambiar(pct)`: callback con el porcentaje elegido.
 * - `calcular(pct)`: opcional; devuelve el peso resultante (string) para mostrarlo
 *   junto a cada opción dentro del modal.
 */
export default function PorcentajePicker({ valor, onCambiar, calcular }) {
  const [abierto, setAbierto] = useState(false);

  const seleccionar = (pct) => {
    setAbierto(false);
    if (pct !== valor) onCambiar(pct);
  };

  return (
    <>
      <button
        type="button"
        className={`pctp-trigger${valor == null ? ' pctp-trigger--vacio' : ''}`}
        onClick={() => setAbierto(true)}
      >
        <span className="pctp-trigger-left">
          <i className="fas fa-percent pctp-trigger-icon" />
          <span className="pctp-trigger-nombre">
            {valor != null ? `${valor}% del récord` : 'Selecciona un porcentaje'}
          </span>
        </span>
        <i className="fas fa-chevron-down pctp-chevron" />
      </button>

      {abierto && createPortal(
        <div className="pctp-overlay" onClick={() => setAbierto(false)}>
          <div className="pctp-panel" onClick={e => e.stopPropagation()}>
            <div className="pctp-header">
              <span className="pctp-title">
                <i className="fas fa-percent" /> Porcentaje de entrenamiento
              </span>
              <button type="button" className="pctp-close" onClick={() => setAbierto(false)}>
                <i className="fas fa-times" />
              </button>
            </div>
            <div className="pctp-options">
              {PORCENTAJES.map(pct => {
                const peso = calcular ? calcular(pct) : '';
                return (
                  <button
                    key={pct}
                    type="button"
                    className={`pctp-option${pct === valor ? ' pctp-option--activo' : ''}`}
                    onClick={() => seleccionar(pct)}
                  >
                    <span className="pctp-opt-pct">{pct}%</span>
                    {peso && <span className="pctp-opt-val">{peso}</span>}
                    {pct === valor && <i className="fas fa-check pctp-check" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
