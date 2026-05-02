import { useState } from 'react';
import { createPortal } from 'react-dom';
import './AñoPicker.css';

export default function AñoPicker({ valor, onCambiar }) {
  const [abierto, setAbierto] = useState(false);
  const añoActual = new Date().getFullYear();
  const años = Array.from({ length: 5 }, (_, i) => añoActual - i);

  const seleccionar = (v) => {
    setAbierto(false);
    if (v !== parseInt(valor)) onCambiar(v);
  };

  return (
    <>
      <button
        type="button"
        className="anp-trigger"
        onClick={() => setAbierto(true)}
      >
        <span className="anp-trigger-left">
          <i className="fas fa-hashtag anp-trigger-icon" />
          <span className="anp-trigger-valor">{valor}</span>
        </span>
        <i className="fas fa-chevron-down anp-chevron" />
      </button>

      {abierto && createPortal(
        <div className="anp-overlay" onClick={() => setAbierto(false)}>
          <div className="anp-panel" onClick={e => e.stopPropagation()}>

            <div className="anp-header">
              <span className="anp-title">
                <i className="fas fa-calendar" /> Año
              </span>
              <button type="button" className="anp-close" onClick={() => setAbierto(false)}>
                <i className="fas fa-times" />
              </button>
            </div>

            <div className="anp-options">
              {años.map(a => (
                <button
                  key={a}
                  type="button"
                  className={`anp-option${a === parseInt(valor) ? ' anp-option--activo' : ''}`}
                  onClick={() => seleccionar(a)}
                >
                  <span className="anp-option-valor">{a}</span>
                  {a === parseInt(valor) && <i className="fas fa-check anp-check" />}
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
