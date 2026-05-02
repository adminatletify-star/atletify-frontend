import { useState } from 'react';
import './MoverCategoriaModal.css';

export default function MoverCategoriaModal({ categorias, onSeleccionar, disabled }) {
  const [abierto, setAbierto] = useState(false);

  const seleccionar = (idCategoria) => {
    setAbierto(false);
    onSeleccionar(idCategoria);
  };

  return (
    <>
      <button
        type="button"
        className="mcm-trigger"
        onClick={() => setAbierto(true)}
        disabled={disabled}
      >
        Mover...
        <i className="fas fa-chevron-down mcm-chevron"></i>
      </button>

      {abierto && (
        <div className="mcm-overlay" onClick={() => setAbierto(false)}>
          <div className="mcm-panel" onClick={e => e.stopPropagation()}>

            <div className="mcm-header">
              <span className="mcm-title">
                <i className="fas fa-exchange-alt"></i> Mover a categoría
              </span>
              <button type="button" className="mcm-close" onClick={() => setAbierto(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="mcm-options">
              {categorias.map(cat => (
                <button
                  key={cat.idCategoriaComp}
                  type="button"
                  className="mcm-option"
                  onClick={() => seleccionar(cat.idCategoriaComp)}
                >
                  <span className="mcm-option-dot"></span>
                  <div className="mcm-option-info">
                    <span className="mcm-option-nombre">{cat.categoriaNombre}</span>
                    <span className="mcm-option-costo">${cat.costo}</span>
                  </div>
                  <i className="fas fa-arrow-right mcm-arrow"></i>
                </button>
              ))}
            </div>

          </div>
        </div>
      )}
    </>
  );
}
