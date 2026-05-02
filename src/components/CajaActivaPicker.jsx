import { useState } from 'react';
import { createPortal } from 'react-dom';
import './CajaActivaPicker.css';

export default function CajaActivaPicker({ valor, opciones, onCambiar, onCrear }) {
  const [abierto, setAbierto] = useState(false);

  const seleccionar = (v) => {
    setAbierto(false);
    if (v !== valor) onCambiar(v);
  };

  const handleCrear = () => {
    setAbierto(false);
    onCrear();
  };

  return (
    <>
      <button
        type="button"
        className="cap-trigger"
        onClick={() => setAbierto(true)}
      >
        <span className="cap-trigger-left">
          <i className="fas fa-cash-register"></i>
          {valor}
        </span>
        <i className="fas fa-chevron-down cap-chevron"></i>
      </button>

      {abierto && createPortal(
        <div className="cap-overlay" onClick={() => setAbierto(false)}>
          <div className="cap-panel" onClick={e => e.stopPropagation()}>

            <div className="cap-header">
              <span className="cap-title">
                <i className="fas fa-store-alt"></i> Caja Activa
              </span>
              <button type="button" className="cap-close" onClick={() => setAbierto(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="cap-options">
              {opciones.map(ap => (
                <button
                  key={ap}
                  type="button"
                  className={`cap-option${ap === valor ? ' cap-option--activo' : ''}`}
                  onClick={() => seleccionar(ap)}
                >
                  <div className="cap-icon-wrap">
                    <i className={ap === 'General (Box)' ? 'fas fa-store' : 'fas fa-tag'}></i>
                  </div>
                  <div className="cap-info">
                    <span className="cap-nombre">{ap}</span>
                    {ap === 'General (Box)' && (
                      <span className="cap-desc">Tienda principal del Box</span>
                    )}
                  </div>
                  {ap === valor && <i className="fas fa-check cap-check"></i>}
                </button>
              ))}

              {/* Separador + Crear nueva */}
              <div className="cap-divider"></div>
              <button
                type="button"
                className="cap-option cap-option--crear"
                onClick={handleCrear}
              >
                <div className="cap-icon-wrap cap-icon-wrap--crear">
                  <i className="fas fa-plus"></i>
                </div>
                <div className="cap-info">
                  <span className="cap-nombre">Crear nueva tienda</span>
                  <span className="cap-desc">Agrega un punto de venta</span>
                </div>
              </button>
            </div>

          </div>
        </div>,
        document.body
      )}
    </>
  );
}
