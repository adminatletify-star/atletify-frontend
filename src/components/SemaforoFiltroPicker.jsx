import { useState } from 'react';
import { createPortal } from 'react-dom';
import './SemaforoFiltroPicker.css';

/**
 * Selector modal reutilizable para los filtros del Semáforo (estado / orden).
 * Reemplaza los <select> nativos por un modal centrado del sistema de diseño.
 *
 * Props:
 *  - valor        valor seleccionado (string)
 *  - onCambiar    (valor) => void
 *  - opciones     [{ valor, label, desc, icono, color }]
 *  - titulo       texto del header del modal
 *  - iconoTitulo  clase fontawesome del ícono del header
 */
export default function SemaforoFiltroPicker({ valor = '', onCambiar, opciones = [], titulo = 'Selecciona', iconoTitulo = 'fas fa-filter' }) {
  const [abierto, setAbierto] = useState(false);

  const opcionActual = opciones.find(o => o.valor === valor) || opciones[0];

  const seleccionar = (v) => {
    setAbierto(false);
    onCambiar(v);
  };

  if (!opcionActual) return null;

  return (
    <>
      <button
        type="button"
        className="sfp-trigger"
        onClick={() => setAbierto(true)}
        style={{ '--sfp-accent': opcionActual.color }}
      >
        <span className="sfp-trigger-left">
          <i className={`${opcionActual.icono} sfp-trigger-icon`}></i>
          <span className="sfp-trigger-label">{opcionActual.label}</span>
        </span>
        <i className="fas fa-chevron-down sfp-chevron"></i>
      </button>

      {abierto && createPortal(
        <div className="sfp-overlay" onClick={() => setAbierto(false)}>
          <div className="sfp-panel" onClick={e => e.stopPropagation()}>

            <div className="sfp-header">
              <span className="sfp-title">
                <i className={iconoTitulo}></i> {titulo}
              </span>
              <button type="button" className="sfp-close" onClick={() => setAbierto(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="sfp-lista">
              {opciones.map(op => (
                <button
                  key={op.valor}
                  type="button"
                  className={`sfp-opcion ${op.valor === valor ? 'sfp-opcion--activo' : ''}`}
                  onClick={() => seleccionar(op.valor)}
                  style={{ '--sfp-accent': op.color }}
                >
                  <div className="sfp-opcion-icono-wrap">
                    <i className={op.icono}></i>
                  </div>
                  <div className="sfp-opcion-texto">
                    <span className="sfp-opcion-label">{op.label}</span>
                    {op.desc && <span className="sfp-opcion-desc">{op.desc}</span>}
                  </div>
                  {op.valor === valor && (
                    <i className="fas fa-check sfp-opcion-check"></i>
                  )}
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
