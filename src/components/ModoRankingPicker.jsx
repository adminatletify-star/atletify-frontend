import { useState } from 'react';
import { createPortal } from 'react-dom';
import './ModoRankingPicker.css';

const OPCIONES = [
  { valor: 'Auto',   label: 'Automático',  desc: 'Ranking en tiempo real',        icono: 'fas fa-robot',       key: 'auto'   },
  { valor: 'Manual', label: 'Manual',       desc: 'Validado por Coach',            icono: 'fas fa-user-check',  key: 'manual' },
];

export default function ModoRankingPicker({ valor, onCambiar }) {
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
        className={`mrp-trigger mrp-trigger--${opcionActual.key}`}
        onClick={() => setAbierto(true)}
      >
        <span className="mrp-trigger-left">
          <i className={opcionActual.icono}></i>
          {opcionActual.label}
        </span>
        <i className="fas fa-chevron-down mrp-chevron"></i>
      </button>

      {abierto && createPortal(
        <div className="mrp-overlay" onClick={() => setAbierto(false)}>
          <div className="mrp-panel" onClick={e => e.stopPropagation()}>

            <div className="mrp-header">
              <span className="mrp-title">
                <i className="fas fa-trophy"></i> Modo de Ranking
              </span>
              <button type="button" className="mrp-close" onClick={() => setAbierto(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="mrp-grid">
              {OPCIONES.map(op => (
                <button
                  key={op.valor}
                  type="button"
                  className={`mrp-option mrp-option--${op.key}${op.valor === valor ? ' mrp-option--activo' : ''}`}
                  onClick={() => seleccionar(op.valor)}
                >
                  <div className="mrp-icon-wrap">
                    <i className={op.icono}></i>
                  </div>
                  <span className="mrp-nombre">{op.label}</span>
                  <span className="mrp-desc">{op.desc}</span>
                  {op.valor === valor && <i className="fas fa-check mrp-check"></i>}
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
