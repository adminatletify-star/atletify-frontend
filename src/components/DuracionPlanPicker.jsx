import { useState } from 'react';
import { createPortal } from 'react-dom';
import './DuracionPlanPicker.css';

const OPCIONES = [
  { valor: '30',  label: 'Mensual',    desc: '30 días de acceso',  icono: 'fas fa-calendar-alt', key: 'mensual'   },
  { valor: '15',  label: 'Quincenal',  desc: '15 días de acceso',  icono: 'fas fa-calendar-day', key: 'quincenal' },
  { valor: '7',   label: 'Semanal',    desc: '7 días de acceso',   icono: 'fas fa-calendar-week',key: 'semanal'   },
  { valor: '365', label: 'Anual',      desc: '365 días de acceso', icono: 'fas fa-crown',        key: 'anual'     },
];

export default function DuracionPlanPicker({ valor, onCambiar }) {
  const [abierto, setAbierto] = useState(false);
  const opcionActual = OPCIONES.find(o => o.valor === String(valor)) || OPCIONES[0];

  const seleccionar = (v) => {
    setAbierto(false);
    if (v !== String(valor)) onCambiar(v);
  };

  return (
    <>
      <button
        type="button"
        className={`dpp-trigger dpp-trigger--${opcionActual.key}`}
        onClick={() => setAbierto(true)}
      >
        <span className="dpp-trigger-left">
          <i className={opcionActual.icono}></i>
          {opcionActual.label}
        </span>
        <i className="fas fa-chevron-down dpp-chevron"></i>
      </button>

      {abierto && createPortal(
        <div className="dpp-overlay" onClick={() => setAbierto(false)}>
          <div className="dpp-panel" onClick={e => e.stopPropagation()}>

            <div className="dpp-header">
              <span className="dpp-title">
                <i className="fas fa-clock"></i> Duración del Plan
              </span>
              <button type="button" className="dpp-close" onClick={() => setAbierto(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="dpp-options">
              {OPCIONES.map(op => (
                <button
                  key={op.valor}
                  type="button"
                  className={`dpp-option dpp-option--${op.key}${op.valor === String(valor) ? ' dpp-option--activo' : ''}`}
                  onClick={() => seleccionar(op.valor)}
                >
                  <div className={`dpp-icon-wrap dpp-icon-wrap--${op.key}`}>
                    <i className={op.icono}></i>
                  </div>
                  <div className="dpp-info">
                    <span className={`dpp-nombre dpp-nombre--${op.key}`}>{op.label}</span>
                    <span className="dpp-desc">{op.desc}</span>
                  </div>
                  {op.valor === String(valor) && <i className={`fas fa-check dpp-check dpp-check--${op.key}`}></i>}
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
