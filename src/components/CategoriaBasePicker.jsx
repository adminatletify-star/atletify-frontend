import { useState } from 'react';
import { createPortal } from 'react-dom';
import './CategoriaBasePicker.css';

const OPCIONES = [
  { valor: 'Novato',     label: 'Novato',     desc: 'Clase técnica — aprendizaje de movimientos', icono: 'fas fa-seedling',      key: 'novato'     },
  { valor: 'Principiante', label: 'Principiante', desc: 'Movimientos modificados a tu nivel',        icono: 'fas fa-chart-line',    key: 'escalado'   },
  { valor: 'Intermedio', label: 'Intermedio', desc: 'Movimientos estándar con buen dominio',        icono: 'fas fa-fire',          key: 'intermedio' },
  { valor: 'RX',         label: 'RX',         desc: 'Avanzado — pesos y movimientos completos',     icono: 'fas fa-medal',         key: 'rx'         },
];

export default function CategoriaBasePicker({ valor, onCambiar }) {
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
        className={`cbp-trigger cbp-trigger--${opcionActual.key}`}
        onClick={() => setAbierto(true)}
      >
        <span className="cbp-trigger-left">
          <i className={opcionActual.icono}></i>
          {opcionActual.label}
        </span>
        <i className="fas fa-chevron-down cbp-chevron"></i>
      </button>

      {abierto && createPortal(
        <div className="cbp-overlay" onClick={() => setAbierto(false)}>
          <div className="cbp-panel" onClick={e => e.stopPropagation()}>

            <div className="cbp-header">
              <span className="cbp-title">
                <i className="fas fa-layer-group"></i> Categoría Base
              </span>
              <button type="button" className="cbp-close" onClick={() => setAbierto(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="cbp-options">
              {OPCIONES.map(op => (
                <button
                  key={op.valor}
                  type="button"
                  className={`cbp-option cbp-option--${op.key}${op.valor === valor ? ' cbp-option--activo' : ''}`}
                  onClick={() => seleccionar(op.valor)}
                >
                  <div className="cbp-icon-wrap">
                    <i className={op.icono}></i>
                  </div>
                  <div className="cbp-info">
                    <span className="cbp-nombre">{op.label}</span>
                    <span className="cbp-desc">{op.desc}</span>
                  </div>
                  {op.valor === valor && <i className="fas fa-check cbp-check"></i>}
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
