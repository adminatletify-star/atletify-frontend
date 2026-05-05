import { useState } from 'react';
import { createPortal } from 'react-dom';
import './ModalidadBloquePicker.css';

const OPCIONES = [
  { valor: 'For Time',     label: 'For Time',     desc: 'Termina lo más rápido posible',  icono: 'fas fa-stopwatch',       key: 'fortime'     },
  { valor: 'AMRAP',        label: 'AMRAP',        desc: 'Máx rondas en X minutos',        icono: 'fas fa-redo',            key: 'amrap'       },
  { valor: 'EMOM',         label: 'EMOM',         desc: 'Cada minuto en el minuto',        icono: 'fas fa-clock',           key: 'emom'        },
  { valor: 'TABATA',       label: 'TABATA',       desc: 'Intervalos 20s/10s',              icono: 'fas fa-bolt',            key: 'tabata'      },
  { valor: 'Fuerza/RM',    label: 'Fuerza / RM',  desc: 'Repetición máxima',               icono: 'fas fa-weight-hanging',  key: 'fuerzarm'    },
  { valor: 'Not For Time', label: 'Not For Time', desc: 'Sin tiempo, a ritmo propio',      icono: 'fas fa-feather-alt',     key: 'notfortime'  },
  { valor: 'Benchmark',    label: 'Benchmark',    desc: 'WOD estándar (Ej. Fran, Murph)',  icono: 'fas fa-medal',           key: 'benchmark'   },
];

export default function ModalidadBloquePicker({ valor, onCambiar }) {
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
        className={`mbp-trigger mbp-trigger--${opcionActual.key}`}
        onClick={() => setAbierto(true)}
      >
        <span className="mbp-trigger-left">
          <i className={opcionActual.icono}></i>
          {opcionActual.label}
        </span>
        <i className="fas fa-chevron-down mbp-chevron"></i>
      </button>

      {abierto && createPortal(
        <div className="mbp-overlay" onClick={() => setAbierto(false)}>
          <div className="mbp-panel" onClick={e => e.stopPropagation()}>

            <div className="mbp-header">
              <span className="mbp-title">
                <i className="fas fa-tag"></i> Modalidad
              </span>
              <button type="button" className="mbp-close" onClick={() => setAbierto(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="mbp-options">
              {OPCIONES.map(op => (
                <button
                  key={op.valor}
                  type="button"
                  className={`mbp-option mbp-option--${op.key}${op.valor === valor ? ' mbp-option--activo' : ''}`}
                  onClick={() => seleccionar(op.valor)}
                >
                  <div className="mbp-icon-wrap">
                    <i className={op.icono}></i>
                  </div>
                  <div className="mbp-info">
                    <span className="mbp-nombre">{op.label}</span>
                    <span className="mbp-desc">{op.desc}</span>
                  </div>
                  {op.valor === valor && <i className="fas fa-check mbp-check"></i>}
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
