import { useState } from 'react';
import './TipoCalificacionPicker.css';

const OPCIONES = [
  {
    valor: 'For Time',
    nombre: 'For Time',
    desc: 'El más rápido gana — tiempo como métrica',
    icono: 'fas fa-stopwatch',
    key: 'fortime',
  },
  {
    valor: 'AMRAP',
    nombre: 'AMRAP',
    desc: 'Más repeticiones en el tiempo fijado',
    icono: 'fas fa-redo',
    key: 'amrap',
  },
  {
    valor: 'Peso / RM',
    nombre: 'Peso / RM',
    desc: 'Mayor peso levantado (Libras / Kilos)',
    icono: 'fas fa-weight-hanging',
    key: 'peso',
  },
  {
    valor: 'Rondas + Repeticiones',
    nombre: 'Rondas + Reps',
    desc: 'Rondas completas más repeticiones',
    icono: 'fas fa-sync-alt',
    key: 'rondasreps',
  },
];

export default function TipoCalificacionPicker({ valor, onCambiar }) {
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
        className={`tcp-trigger tcp-trigger--${opcionActual.key}`}
        onClick={() => setAbierto(true)}
      >
        <span className="tcp-trigger-left">
          <i className={opcionActual.icono}></i>
          {opcionActual.nombre}
        </span>
        <i className="fas fa-chevron-down tcp-chevron"></i>
      </button>

      {abierto && (
        <div className="tcp-overlay" onClick={() => setAbierto(false)}>
          <div className="tcp-panel" onClick={e => e.stopPropagation()}>

            <div className="tcp-header">
              <span className="tcp-title">
                <i className="fas fa-trophy"></i> Tipo de Calificación
              </span>
              <button type="button" className="tcp-close" onClick={() => setAbierto(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="tcp-options">
              {OPCIONES.map(op => (
                <button
                  key={op.valor}
                  type="button"
                  className={`tcp-option tcp-option--${op.key}${op.valor === valor ? ` tcp-option--activo` : ''}`}
                  onClick={() => seleccionar(op.valor)}
                >
                  <div className="tcp-option-icon-wrap">
                    <i className={op.icono}></i>
                  </div>
                  <div className="tcp-option-info">
                    <span className="tcp-option-nombre">{op.nombre}</span>
                    <span className="tcp-option-desc">{op.desc}</span>
                  </div>
                  {op.valor === valor && <i className="fas fa-check tcp-check"></i>}
                </button>
              ))}
            </div>

          </div>
        </div>
      )}
    </>
  );
}
