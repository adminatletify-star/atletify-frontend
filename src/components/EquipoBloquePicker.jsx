import { useState } from 'react';
import { createPortal } from 'react-dom';
import './EquipoBloquePicker.css';

const OPCIONES = [
  { valor: 'Individual', label: 'Individual', desc: 'Solo',                icono: 'fas fa-user',        key: 'individual' },
  { valor: 'Parejas',    label: 'Parejas',    desc: 'Equipos de 2',       icono: 'fas fa-user-friends', key: 'parejas'    },
  { valor: 'Tríos',      label: 'Tríos',      desc: 'Equipos de 3',       icono: 'fas fa-users',       key: 'trios'      },
  { valor: 'Squad (4)',   label: 'Squad',      desc: 'Equipos de 4',       icono: 'fas fa-people-carry', key: 'squad'      },
];

export default function EquipoBloquePicker({ valor, onCambiar }) {
  const [abierto, setAbierto] = useState(false);
  const opcionActual = OPCIONES.find(o => o.valor === valor) || OPCIONES[0];

  const seleccionar = (v) => {
    setAbierto(false);
    if (v !== valor) onCambiar(v);
  };

  return (
    <>
      <button
        type="button"
        className={`ebp-trigger ebp-trigger--${opcionActual.key}`}
        onClick={() => setAbierto(true)}
      >
        <span className="ebp-trigger-left">
          <i className={opcionActual.icono}></i>
          {opcionActual.label}
        </span>
        <i className="fas fa-chevron-down ebp-chevron"></i>
      </button>

      {abierto && createPortal(
        <div className="ebp-overlay" onClick={() => setAbierto(false)}>
          <div className="ebp-panel" onClick={e => e.stopPropagation()}>

            <div className="ebp-header">
              <span className="ebp-title">
                <i className="fas fa-users"></i> Equipo
              </span>
              <button type="button" className="ebp-close" onClick={() => setAbierto(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="ebp-grid">
              {OPCIONES.map(op => (
                <button
                  key={op.valor}
                  type="button"
                  className={`ebp-option ebp-option--${op.key}${op.valor === valor ? ' ebp-option--activo' : ''}`}
                  onClick={() => seleccionar(op.valor)}
                >
                  <div className="ebp-icon-wrap">
                    <i className={op.icono}></i>
                  </div>
                  <span className="ebp-nombre">{op.label}</span>
                  <span className="ebp-desc">{op.desc}</span>
                  {op.valor === valor && <i className="fas fa-check ebp-check"></i>}
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
