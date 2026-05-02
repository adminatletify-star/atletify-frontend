import { useState } from 'react';
import { createPortal } from 'react-dom';
import './FiltroCategoriaPicker.css';

const COLOR_MAP = {
  'Novato':     'novato',
  'Escalado':   'escalado',
  'Intermedio': 'intermedio',
  'RX':         'rx',
};

function getKey(cat) {
  return COLOR_MAP[cat] || 'otro';
}

export default function FiltroCategoriaPicker({ categorias = [], valor, onCambiar }) {
  const [abierto, setAbierto] = useState(false);

  const seleccionar = (v) => {
    setAbierto(false);
    if (v !== valor) onCambiar(v);
  };

  const isTodas = !valor;

  return (
    <>
      <button
        type="button"
        className={`fcp-trigger${!isTodas ? ' fcp-trigger--activo' : ''}`}
        onClick={() => setAbierto(true)}
      >
        <span className="fcp-trigger-left">
          <span className={`fcp-dot fcp-dot--${isTodas ? 'todas' : getKey(valor)}`}></span>
          {isTodas ? 'Todas las categorías' : valor}
        </span>
        <i className="fas fa-chevron-down fcp-chevron"></i>
      </button>

      {abierto && createPortal(
        <div className="fcp-overlay" onClick={() => setAbierto(false)}>
          <div className="fcp-panel" onClick={e => e.stopPropagation()}>

            <div className="fcp-header">
              <span className="fcp-title">
                <i className="fas fa-filter"></i> Categoría
              </span>
              <button type="button" className="fcp-close" onClick={() => setAbierto(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="fcp-options">

              <button
                type="button"
                className={`fcp-option fcp-option--todas${isTodas ? ' fcp-option--activo' : ''}`}
                onClick={() => seleccionar('')}
              >
                <span className="fcp-dot fcp-dot--todas"></span>
                <span className="fcp-option-label">Todas las categorías</span>
                {isTodas && <i className="fas fa-check fcp-check"></i>}
              </button>

              {categorias.map(cat => (
                <button
                  key={cat}
                  type="button"
                  className={`fcp-option${cat === valor ? ' fcp-option--activo' : ''}`}
                  onClick={() => seleccionar(cat)}
                >
                  <span className={`fcp-dot fcp-dot--${getKey(cat)}`}></span>
                  <span className="fcp-option-label">{cat}</span>
                  {cat === valor && <i className="fas fa-check fcp-check"></i>}
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
