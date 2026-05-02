import { useState } from 'react';
import { createPortal } from 'react-dom';
import './CoachPicker.css';

export default function CoachPicker({ valor, coaches, onCambiar }) {
  const [abierto, setAbierto] = useState(false);

  const coachActual = coaches.find(c => String(c.idUsuario) === String(valor));
  const labelActual = coachActual ? coachActual.nombre : '(Sin asignar)';

  const seleccionar = (v) => {
    setAbierto(false);
    if (String(v) !== String(valor)) onCambiar(v);
  };

  return (
    <>
      <button
        type="button"
        className="cop-trigger"
        onClick={() => setAbierto(true)}
      >
        <span className="cop-trigger-left">
          {coachActual ? (
            <span className="cop-trigger-avatar">{coachActual.nombre.charAt(0).toUpperCase()}</span>
          ) : (
            <i className="fas fa-user-slash"></i>
          )}
          {labelActual}
        </span>
        <i className="fas fa-chevron-down cop-chevron"></i>
      </button>

      {abierto && createPortal(
        <div className="cop-overlay" onClick={() => setAbierto(false)}>
          <div className="cop-panel" onClick={e => e.stopPropagation()}>

            <div className="cop-header">
              <span className="cop-title">
                <i className="fas fa-user-tie"></i> Coach Asignado
              </span>
              <button type="button" className="cop-close" onClick={() => setAbierto(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="cop-options">
              {/* Sin asignar */}
              <button
                type="button"
                className={`cop-option${!valor || valor === '' ? ' cop-option--activo' : ''}`}
                onClick={() => seleccionar('')}
              >
                <div className="cop-icon-wrap cop-icon-wrap--none">
                  <i className="fas fa-user-slash"></i>
                </div>
                <div className="cop-info">
                  <span className="cop-nombre">Sin asignar</span>
                  <span className="cop-desc">Clase sin coach fijo</span>
                </div>
                {(!valor || valor === '') && <i className="fas fa-check cop-check"></i>}
              </button>

              {coaches.length > 0 && <div className="cop-divider"></div>}

              {coaches.map(c => (
                <button
                  key={c.idUsuario}
                  type="button"
                  className={`cop-option${String(c.idUsuario) === String(valor) ? ' cop-option--activo' : ''}`}
                  onClick={() => seleccionar(c.idUsuario)}
                >
                  <div className="cop-avatar">
                    {c.nombre.charAt(0).toUpperCase()}
                  </div>
                  <div className="cop-info">
                    <span className="cop-nombre">{c.nombre}</span>
                    <span className="cop-desc">Coach</span>
                  </div>
                  {String(c.idUsuario) === String(valor) && <i className="fas fa-check cop-check"></i>}
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
