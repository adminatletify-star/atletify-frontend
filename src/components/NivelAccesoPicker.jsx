import { useState } from 'react';
import { createPortal } from 'react-dom';
import './NivelAccesoPicker.css';

const OPCIONES = [
  { valor: 'CrossFit', label: 'Clases de CrossFit',    desc: 'Acceso a todas las clases de CrossFit', icono: 'fas fa-fire',     key: 'crossfit' },
  { valor: 'OpenGym',  label: 'Solo Open Gym',         desc: 'Acceso únicamente al área de pesas',    icono: 'fas fa-dumbbell', key: 'opengym'  },
  { valor: 'Hibrido',  label: 'Híbrido (Ambos)',       desc: 'Clases de CrossFit + Open Gym',         icono: 'fas fa-bolt',     key: 'hibrido'  },
];

export default function NivelAccesoPicker({ valor, onCambiar }) {
  const [abierto, setAbierto] = useState(false);
  const actual = OPCIONES.find(o => o.valor === valor) || OPCIONES[0];

  const seleccionar = (v) => {
    setAbierto(false);
    if (v !== valor) onCambiar(v);
  };

  return (
    <>
      <button
        type="button"
        className={`nap-trigger nap-trigger--${actual.key}`}
        onClick={() => setAbierto(true)}
      >
        <span className="nap-trigger-left">
          <i className={actual.icono}></i>
          {actual.label}
        </span>
        <i className="fas fa-chevron-down nap-chevron"></i>
      </button>

      {abierto && createPortal(
        <div className="nap-overlay" onClick={() => setAbierto(false)}>
          <div className="nap-panel" onClick={e => e.stopPropagation()}>

            <div className="nap-header">
              <span className="nap-title">
                <i className="fas fa-shield-alt"></i> Nivel de Acceso
              </span>
              <button type="button" className="nap-close" onClick={() => setAbierto(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="nap-options">
              {OPCIONES.map(op => (
                <button
                  key={op.valor}
                  type="button"
                  className={`nap-option nap-option--${op.key}${op.valor === valor ? ' nap-option--activo' : ''}`}
                  onClick={() => seleccionar(op.valor)}
                >
                  <div className={`nap-icon-wrap nap-icon-wrap--${op.key}`}>
                    <i className={op.icono}></i>
                  </div>
                  <div className="nap-info">
                    <span className={`nap-nombre nap-nombre--${op.key}`}>{op.label}</span>
                    <span className="nap-desc">{op.desc}</span>
                  </div>
                  {op.valor === valor && <i className={`fas fa-check nap-check nap-check--${op.key}`}></i>}
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
