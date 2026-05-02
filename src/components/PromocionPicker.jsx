import { useState } from 'react';
import { createPortal } from 'react-dom';
import './PromocionPicker.css';

export default function PromocionPicker({ descuentos = [], valor, onCambiar }) {
  const [abierto, setAbierto] = useState(false);

  const actual = valor ? descuentos.find(d => String(d.idDescuento) === String(valor)) : null;

  const seleccionar = (v) => {
    setAbierto(false);
    onCambiar(v);
  };

  return (
    <>
      <button
        type="button"
        className="promp-trigger"
        onClick={() => setAbierto(true)}
      >
        <span className="promp-trigger-left">
          <i className={actual ? 'fas fa-percent' : 'fas fa-ban'}></i>
          {actual ? `${actual.nombre} (−${actual.porcentaje}%)` : '— Sin Descuento —'}
        </span>
        <i className="fas fa-chevron-down promp-chevron"></i>
      </button>

      {abierto && createPortal(
        <div className="promp-overlay" onClick={() => setAbierto(false)}>
          <div className="promp-panel" onClick={e => e.stopPropagation()}>

            <div className="promp-header">
              <span className="promp-title">
                <i className="fas fa-tag"></i> Aplicar Promoción
              </span>
              <button type="button" className="promp-close" onClick={() => setAbierto(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="promp-options">
              {/* Sin descuento */}
              <button
                type="button"
                className={`promp-option promp-option--none${!valor ? ' promp-option--activo' : ''}`}
                onClick={() => seleccionar('')}
              >
                <div className="promp-option-icon promp-option-icon--none">
                  <i className="fas fa-ban"></i>
                </div>
                <div className="promp-option-info">
                  <span className="promp-option-nombre">Sin Descuento</span>
                  <span className="promp-option-desc">Precio de lista completo</span>
                </div>
                {!valor && <i className="fas fa-check promp-check"></i>}
              </button>

              {/* Descuentos disponibles */}
              {descuentos.map(d => (
                <button
                  key={d.idDescuento}
                  type="button"
                  className={`promp-option${String(valor) === String(d.idDescuento) ? ' promp-option--activo' : ''}`}
                  onClick={() => seleccionar(String(d.idDescuento))}
                >
                  <div className="promp-option-icon">
                    <i className="fas fa-percent"></i>
                  </div>
                  <div className="promp-option-info">
                    <span className="promp-option-nombre">{d.nombre}</span>
                    <span className="promp-option-desc">Descuento del {d.porcentaje}% sobre el total</span>
                  </div>
                  {String(valor) === String(d.idDescuento) && <i className="fas fa-check promp-check"></i>}
                </button>
              ))}

              {descuentos.length === 0 && (
                <p className="promp-empty">No hay promociones activas configuradas.</p>
              )}
            </div>

          </div>
        </div>,
        document.body
      )}
    </>
  );
}
