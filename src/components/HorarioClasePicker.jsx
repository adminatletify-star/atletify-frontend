import { useState } from 'react';
import { createPortal } from 'react-dom';
import './HorarioClasePicker.css';

export default function HorarioClasePicker({ clases, valor, onCambiar }) {
  const [abierto, setAbierto] = useState(false);
  const claseActual = clases.find(c => String(c.idClase) === String(valor));

  const seleccionar = (v) => {
    setAbierto(false);
    if (String(v) !== String(valor)) onCambiar(v);
  };

  return (
    <>
      <button
        type="button"
        className={`hcp-trigger${!valor ? ' hcp-trigger--vacio' : ''}`}
        onClick={() => setAbierto(true)}
      >
        <span className="hcp-trigger-left">
          <i className="fas fa-clock"></i>
          {claseActual
            ? <>
                <span className="hcp-hora-badge">
                  {claseActual.horarioInicio?.substring(0, 5)}
                </span>
                {claseActual.nombre}
              </>
            : 'Horario Libre (Open Box)'
          }
        </span>
        <i className="fas fa-chevron-down hcp-chevron"></i>
      </button>

      {abierto && createPortal(
        <div className="hcp-overlay" onClick={() => setAbierto(false)}>
          <div className="hcp-panel" onClick={e => e.stopPropagation()}>

            <div className="hcp-header">
              <span className="hcp-title">
                <i className="fas fa-clock"></i> Horario Fijo
              </span>
              <button type="button" className="hcp-close" onClick={() => setAbierto(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="hcp-options">
              <button
                type="button"
                className={`hcp-option hcp-option--libre${!valor ? ' hcp-option--activo' : ''}`}
                onClick={() => seleccionar('')}
              >
                <div className="hcp-icon-wrap hcp-icon--libre">
                  <i className="fas fa-door-open"></i>
                </div>
                <div className="hcp-info">
                  <span className="hcp-nombre">Open Box</span>
                  <span className="hcp-desc">Sin clase fija — horario libre</span>
                </div>
                {!valor && <i className="fas fa-check hcp-check"></i>}
              </button>

              {clases.map(c => {
                const activo = String(c.idClase) === String(valor);
                return (
                  <button
                    key={c.idClase}
                    type="button"
                    className={`hcp-option${activo ? ' hcp-option--activo' : ''}`}
                    onClick={() => seleccionar(c.idClase)}
                  >
                    <div className="hcp-icon-wrap">
                      <i className="fas fa-dumbbell"></i>
                    </div>
                    <div className="hcp-info">
                      <span className="hcp-nombre">{c.nombre}</span>
                      <span className="hcp-desc">
                        {c.horarioInicio?.substring(0, 5)} – {c.horarioFin?.substring(0, 5)}
                      </span>
                    </div>
                    {activo && <i className="fas fa-check hcp-check"></i>}
                  </button>
                );
              })}
            </div>

          </div>
        </div>,
        document.body
      )}
    </>
  );
}
