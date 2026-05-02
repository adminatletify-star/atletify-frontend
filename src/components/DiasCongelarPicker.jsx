import { useState } from 'react';
import { createPortal } from 'react-dom';
import './DiasCongelarPicker.css';

const OPCIONES = [
  { valor: '7',  label: '1 Semana',   desc: '7 días de congelación',  icono: 'fas fa-calendar-week', key: 'semana'   },
  { valor: '15', label: '1 Quincena', desc: '15 días de congelación', icono: 'fas fa-calendar-day',  key: 'quincena' },
  { valor: '30', label: '1 Mes',      desc: '30 días de congelación', icono: 'fas fa-calendar-alt',  key: 'mes'      },
];

export default function DiasCongelarPicker({ valor, onCambiar }) {
  const [abierto, setAbierto] = useState(false);
  const opcionActual = OPCIONES.find(o => o.valor === String(valor)) || OPCIONES[1];

  const seleccionar = (v) => {
    setAbierto(false);
    if (v !== String(valor)) onCambiar(v);
  };

  return (
    <>
      <button
        type="button"
        className={`dcp-trigger dcp-trigger--${opcionActual.key}`}
        onClick={() => setAbierto(true)}
      >
        <span className="dcp-trigger-left">
          <i className={opcionActual.icono}></i>
          {opcionActual.label} ({opcionActual.valor} días)
        </span>
        <i className="fas fa-chevron-down dcp-chevron"></i>
      </button>

      {abierto && createPortal(
        <div className="dcp-overlay" onClick={() => setAbierto(false)}>
          <div className="dcp-panel" onClick={e => e.stopPropagation()}>

            <div className="dcp-header">
              <span className="dcp-title">
                <i className="fas fa-snowflake"></i> Días a Congelar
              </span>
              <button type="button" className="dcp-close" onClick={() => setAbierto(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="dcp-options">
              {OPCIONES.map(op => (
                <button
                  key={op.valor}
                  type="button"
                  className={`dcp-option dcp-option--${op.key}${op.valor === String(valor) ? ' dcp-option--activo' : ''}`}
                  onClick={() => seleccionar(op.valor)}
                >
                  <div className={`dcp-icon-wrap dcp-icon-wrap--${op.key}`}>
                    <i className={op.icono}></i>
                  </div>
                  <div className="dcp-info">
                    <span className={`dcp-nombre dcp-nombre--${op.key}`}>{op.label}</span>
                    <span className="dcp-desc">{op.desc}</span>
                  </div>
                  {op.valor === String(valor) && <i className={`fas fa-check dcp-check dcp-check--${op.key}`}></i>}
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
