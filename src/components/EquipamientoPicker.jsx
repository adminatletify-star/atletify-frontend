import { useState } from 'react';
import { createPortal } from 'react-dom';
import './EquipamientoPicker.css';

const OPCIONES = [
  { valor: 'Libre',      label: 'Bodyweight',   desc: 'Sin equipo',            icono: 'fas fa-running',         key: 'libre'      },
  { valor: 'Barra',      label: 'Barra Olímpica', desc: 'Barbell',            icono: 'fas fa-dumbbell',        key: 'barra'      },
  { valor: 'Mancuernas', label: 'Mancuernas',   desc: 'Dumbbells',             icono: 'fas fa-dumbbell',        key: 'mancuernas' },
  { valor: 'Kettlebell',  label: 'Kettlebell',   desc: 'Pesa rusa',            icono: 'fas fa-weight-hanging',  key: 'kettlebell'  },
  { valor: 'Máquina',    label: 'Máquina',      desc: 'Remo, Bici, Ski...',    icono: 'fas fa-biking',          key: 'maquina'    },
  { valor: 'Cajón',      label: 'Cajón',        desc: 'Box Jumps',             icono: 'fas fa-box',             key: 'cajon'      },
  { valor: 'Cuerda',     label: 'Cuerda',       desc: 'Jump Rope',             icono: 'fas fa-wave-square',     key: 'cuerda'     },
];

export default function EquipamientoPicker({ valor, onCambiar }) {
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
        className="eqp-trigger"
        onClick={() => setAbierto(true)}
      >
        <span className="eqp-trigger-left">
          <i className={opcionActual.icono}></i>
          {opcionActual.label}
        </span>
        <i className="fas fa-chevron-down eqp-chevron"></i>
      </button>

      {abierto && createPortal(
        <div className="eqp-overlay" onClick={() => setAbierto(false)}>
          <div className="eqp-panel" onClick={e => e.stopPropagation()}>

            <div className="eqp-header">
              <span className="eqp-title">
                <i className="fas fa-dumbbell"></i> Equipamiento
              </span>
              <button type="button" className="eqp-close" onClick={() => setAbierto(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="eqp-options">
              {OPCIONES.map(op => (
                <button
                  key={op.valor}
                  type="button"
                  className={`eqp-option${op.valor === valor ? ' eqp-option--activo' : ''}`}
                  onClick={() => seleccionar(op.valor)}
                >
                  <div className="eqp-icon-wrap">
                    <i className={op.icono}></i>
                  </div>
                  <div className="eqp-info">
                    <span className="eqp-nombre">{op.label}</span>
                    <span className="eqp-desc">{op.desc}</span>
                  </div>
                  {op.valor === valor && <i className="fas fa-check eqp-check"></i>}
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
