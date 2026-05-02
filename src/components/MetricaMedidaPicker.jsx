import { useState } from 'react';
import { createPortal } from 'react-dom';
import './MetricaMedidaPicker.css';

const OPCIONES = [
  { valor: 'Repeticiones', label: 'Repeticiones', desc: 'Conteo de reps',        icono: 'fas fa-redo',            key: 'reps'      },
  { valor: 'Peso',         label: 'Peso Máximo',  desc: '1RM',                   icono: 'fas fa-weight-hanging',  key: 'peso'      },
  { valor: 'Distancia',    label: 'Distancia',    desc: 'm / km / mi',           icono: 'fas fa-road',            key: 'distancia' },
  { valor: 'Calorías',     label: 'Calorías',     desc: 'Cal quemadas',          icono: 'fas fa-fire',            key: 'calorias'  },
  { valor: 'Tiempo',       label: 'Tiempo',       desc: 'Minutos / Segundos',    icono: 'fas fa-stopwatch',       key: 'tiempo'    },
];

export default function MetricaMedidaPicker({ valor, onCambiar }) {
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
        className={`mmp-trigger mmp-trigger--${opcionActual.key}`}
        onClick={() => setAbierto(true)}
      >
        <span className="mmp-trigger-left">
          <i className={opcionActual.icono}></i>
          {opcionActual.label}
        </span>
        <i className="fas fa-chevron-down mmp-chevron"></i>
      </button>

      {abierto && createPortal(
        <div className="mmp-overlay" onClick={() => setAbierto(false)}>
          <div className="mmp-panel" onClick={e => e.stopPropagation()}>

            <div className="mmp-header">
              <span className="mmp-title">
                <i className="fas fa-ruler"></i> ¿Cómo se mide?
              </span>
              <button type="button" className="mmp-close" onClick={() => setAbierto(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="mmp-options">
              {OPCIONES.map(op => (
                <button
                  key={op.valor}
                  type="button"
                  className={`mmp-option mmp-option--${op.key}${op.valor === valor ? ' mmp-option--activo' : ''}`}
                  onClick={() => seleccionar(op.valor)}
                >
                  <div className="mmp-icon-wrap">
                    <i className={op.icono}></i>
                  </div>
                  <div className="mmp-info">
                    <span className="mmp-nombre">{op.label}</span>
                    <span className="mmp-desc">{op.desc}</span>
                  </div>
                  {op.valor === valor && <i className="fas fa-check mmp-check"></i>}
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
