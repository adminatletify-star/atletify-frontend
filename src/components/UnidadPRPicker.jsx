import { useState } from 'react';
import { createPortal } from 'react-dom';
import './UnidadPRPicker.css';

const UNIDADES = [
  { valor: 'kg',   nombre: 'Kilogramos', desc: 'kg',   icono: 'fas fa-weight' },
  { valor: 'lbs',  nombre: 'Libras',     desc: 'lbs',  icono: 'fas fa-weight-hanging' },
  { valor: 'm',    nombre: 'Metros',     desc: 'm',    icono: 'fas fa-road' },
  { valor: 'reps', nombre: 'Repeticiones', desc: 'reps', icono: 'fas fa-redo' },
  { valor: 'min',  nombre: 'Minutos',    desc: 'min',  icono: 'fas fa-stopwatch' },
];

export default function UnidadPRPicker({ valor, onCambiar }) {
  const [abierto, setAbierto] = useState(false);
  const actual = UNIDADES.find(u => u.valor === valor) || UNIDADES[0];

  const seleccionar = (v) => {
    setAbierto(false);
    if (v !== valor) onCambiar(v);
  };

  return (
    <>
      <button type="button" className="upr-trigger" onClick={() => setAbierto(true)}>
        <span className="upr-trigger-left">
          <i className={actual.icono}></i>
          <span className="upr-trigger-valor">{actual.desc}</span>
        </span>
        <i className="fas fa-chevron-down upr-chevron" />
      </button>

      {abierto && createPortal(
        <div className="upr-overlay" onClick={() => setAbierto(false)}>
          <div className="upr-panel" onClick={e => e.stopPropagation()}>
            <div className="upr-header">
              <span className="upr-title"><i className="fas fa-ruler-combined"></i> Unidad de Medida</span>
              <button type="button" className="upr-close" onClick={() => setAbierto(false)}>
                <i className="fas fa-times" />
              </button>
            </div>
            <div className="upr-options">
              {UNIDADES.map(u => (
                <button
                  key={u.valor}
                  type="button"
                  className={`upr-option${u.valor === valor ? ' upr-option--activo' : ''}`}
                  onClick={() => seleccionar(u.valor)}
                >
                  <div className="upr-opt-icon"><i className={u.icono} /></div>
                  <div className="upr-opt-info">
                    <span className="upr-opt-nombre">{u.nombre}</span>
                    <span className="upr-opt-desc">{u.desc}</span>
                  </div>
                  {u.valor === valor && <i className="fas fa-check upr-check" />}
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
