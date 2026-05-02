import { useState } from 'react';
import './EstatusPickerModal.css';

const OPCIONES = [
  { valor: 'todos',   label: 'Todos',     icono: 'fas fa-layer-group',        color: 'secondary' },
  { valor: 'pagados', label: 'Pagados',   icono: 'fas fa-check-circle',       color: 'success'   },
  { valor: 'deuda',   label: 'Con Deuda', icono: 'fas fa-exclamation-circle', color: 'danger'    },
];

export default function FiltroEstatusPicker({ valor, onCambiar }) {
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
        className={`epm-trigger epm-trigger--${opcionActual.color}`}
        onClick={() => setAbierto(true)}
      >
        <span className="epm-dot"></span>
        <span className="epm-label">{opcionActual.label.toUpperCase()}</span>
        <i className="fas fa-chevron-down epm-chevron"></i>
      </button>

      {abierto && (
        <div className="epm-overlay" onClick={() => setAbierto(false)}>
          <div className="epm-panel" onClick={e => e.stopPropagation()}>

            <div className="epm-panel-header">
              <span className="epm-panel-title">
                <i className="fas fa-filter me-2"></i>Filtrar por estatus
              </span>
              <button type="button" className="epm-panel-close" onClick={() => setAbierto(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="epm-options">
              {OPCIONES.map(op => (
                <button
                  key={op.valor}
                  type="button"
                  className={`epm-option epm-option--${op.color}${op.valor === valor ? ' epm-option--activo' : ''}`}
                  onClick={() => seleccionar(op.valor)}
                >
                  <span className={`epm-option-dot epm-option-dot--${op.color}`}></span>
                  <i className={`${op.icono} epm-option-icono`}></i>
                  <span className="epm-option-label">{op.label}</span>
                  {op.valor === valor && <i className="fas fa-check epm-option-check"></i>}
                </button>
              ))}
            </div>

          </div>
        </div>
      )}
    </>
  );
}
