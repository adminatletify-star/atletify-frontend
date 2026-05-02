import { useState } from 'react';
import { createPortal } from 'react-dom';
import './GeneroPicker.css';

const OPCIONES = [
  { valor: 'Hombre', label: 'Hombre', icono: 'fas fa-mars',  key: 'hombre' },
  { valor: 'Mujer',  label: 'Mujer',  icono: 'fas fa-venus', key: 'mujer'  },
];

export default function GeneroPicker({ valor, onCambiar }) {
  const [abierto, setAbierto] = useState(false);
  const opcionActual = OPCIONES.find(o => o.valor === valor);

  const seleccionar = (v) => {
    setAbierto(false);
    if (v !== valor) onCambiar(v);
  };

  return (
    <>
      <button
        type="button"
        className={`gep-trigger${opcionActual ? ` gep-trigger--${opcionActual.key}` : ' gep-trigger--vacio'}`}
        onClick={() => setAbierto(true)}
      >
        <span className="gep-trigger-left">
          <i className={opcionActual ? opcionActual.icono : 'fas fa-venus-mars'}></i>
          {opcionActual ? opcionActual.label : 'Selecciona género...'}
        </span>
        <i className="fas fa-chevron-down gep-chevron"></i>
      </button>

      {abierto && createPortal(
        <div className="gep-overlay" onClick={() => setAbierto(false)}>
          <div className="gep-panel" onClick={e => e.stopPropagation()}>

            <div className="gep-header">
              <span className="gep-title">
                <i className="fas fa-venus-mars"></i> Género
              </span>
              <button type="button" className="gep-close" onClick={() => setAbierto(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="gep-grid">
              {OPCIONES.map(op => (
                <button
                  key={op.valor}
                  type="button"
                  className={`gep-option gep-option--${op.key}${op.valor === valor ? ' gep-option--activo' : ''}`}
                  onClick={() => seleccionar(op.valor)}
                >
                  <div className="gep-icon-wrap">
                    <i className={op.icono}></i>
                  </div>
                  <span className="gep-nombre">{op.label}</span>
                  {op.valor === valor && <i className="fas fa-check gep-check"></i>}
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
