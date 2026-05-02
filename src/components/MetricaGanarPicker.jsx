import { useState } from 'react';
import { createPortal } from 'react-dom';
import './MetricaGanarPicker.css';

const OPCIONES = [
  { valor: 'Tiempo', label: 'Tiempo',       desc: 'El menor gana',          icono: 'fas fa-stopwatch',    key: 'tiempo' },
  { valor: 'Peso',   label: 'Peso',         desc: 'El mayor gana',          icono: 'fas fa-weight-hanging', key: 'peso' },
  { valor: 'Reps',   label: 'Repeticiones', desc: 'El mayor número gana',   icono: 'fas fa-redo',         key: 'reps'   },
  { valor: 'RondasReps', label: 'Rondas + Reps', desc: 'Mayor ronda o más reps', icono: 'fas fa-ring', key: 'rondasreps' },
];

export default function MetricaGanarPicker({ valor, onCambiar }) {
  const [abierto, setAbierto] = useState(false);
  const opcionActual = OPCIONES.find(o => o.valor === valor) || OPCIONES[0];

  const seleccionar = (v) => {
    setAbierto(false);
    if (v !== valor) onCambiar(v);
  };

  return (
    <>
      <button
        type="button"
        className={`mgp-trigger mgp-trigger--${opcionActual.key}`}
        onClick={() => setAbierto(true)}
      >
        <span className="mgp-trigger-left">
          <i className={opcionActual.icono}></i>
          {opcionActual.label}
        </span>
        <i className="fas fa-chevron-down mgp-chevron"></i>
      </button>

      {abierto && createPortal(
        <div className="mgp-overlay" onClick={() => setAbierto(false)}>
          <div className="mgp-panel" onClick={e => e.stopPropagation()}>

            <div className="mgp-header">
              <span className="mgp-title">
                <i className="fas fa-crosshairs"></i> Métrica para Ganar
              </span>
              <button type="button" className="mgp-close" onClick={() => setAbierto(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="mgp-options">
              {OPCIONES.map(op => (
                <button
                  key={op.valor}
                  type="button"
                  className={`mgp-option mgp-option--${op.key}${op.valor === valor ? ' mgp-option--activo' : ''}`}
                  onClick={() => seleccionar(op.valor)}
                >
                  <div className="mgp-icon-wrap">
                    <i className={op.icono}></i>
                  </div>
                  <div className="mgp-info">
                    <span className="mgp-nombre">{op.label}</span>
                    <span className="mgp-desc">{op.desc}</span>
                  </div>
                  {op.valor === valor && <i className="fas fa-check mgp-check"></i>}
                </button>
              ))}
            </div>

          </div>
        </div>,
        document.body
      )}
    </>
  );
}
