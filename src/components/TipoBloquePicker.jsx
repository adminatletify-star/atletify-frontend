import { useState } from 'react';
import { createPortal } from 'react-dom';
import './TipoBloquePicker.css';

const OPCIONES = [
  { valor: 'Warm-Up',      label: 'Warm-Up',      desc: 'Calentamiento',                   icono: 'fas fa-sun',         key: 'warmup'  },
  { valor: 'Fuerza/Skill', label: 'Fuerza / Skill', desc: 'Trabajo de fuerza o técnica',   icono: 'fas fa-dumbbell',    key: 'fuerza'  },
  { valor: 'WOD',          label: 'WOD',          desc: 'Workout del día',                  icono: 'fas fa-fire',        key: 'wod'     },
  { valor: 'Cash-Out',     label: 'Cash-Out',     desc: 'Cierre del entrenamiento',         icono: 'fas fa-flag-checkered', key: 'cashout' },
];

export default function TipoBloquePicker({ valor, onCambiar }) {
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
        className={`tbp-trigger tbp-trigger--${opcionActual.key}`}
        onClick={() => setAbierto(true)}
      >
        <span className="tbp-trigger-left">
          <i className={opcionActual.icono}></i>
          {opcionActual.label}
        </span>
        <i className="fas fa-chevron-down tbp-chevron"></i>
      </button>

      {abierto && createPortal(
        <div className="tbp-overlay" onClick={() => setAbierto(false)}>
          <div className="tbp-panel" onClick={e => e.stopPropagation()}>

            <div className="tbp-header">
              <span className="tbp-title">
                <i className="fas fa-puzzle-piece"></i> Tipo de Sección
              </span>
              <button type="button" className="tbp-close" onClick={() => setAbierto(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="tbp-grid">
              {OPCIONES.map(op => (
                <button
                  key={op.valor}
                  type="button"
                  className={`tbp-option tbp-option--${op.key}${op.valor === valor ? ' tbp-option--activo' : ''}`}
                  onClick={() => seleccionar(op.valor)}
                >
                  <div className="tbp-icon-wrap">
                    <i className={op.icono}></i>
                  </div>
                  <span className="tbp-nombre">{op.label}</span>
                  <span className="tbp-desc">{op.desc}</span>
                  {op.valor === valor && <i className="fas fa-check tbp-check"></i>}
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
