import { useState } from 'react';
import './TipoPagoPicker.css';

const OPCIONES = [
  {
    valor: 'PorClase',
    nombre: 'Por Clase',
    desc: 'Se paga por cada clase impartida',
    icono: 'fas fa-chalkboard-teacher',
    key: 'porclase',
  },
  {
    valor: 'MensualFijo',
    nombre: 'Mensual Fijo',
    desc: 'Sueldo base fijo al mes independiente de clases',
    icono: 'fas fa-calendar-check',
    key: 'mensual',
  },
];

export default function TipoPagoPicker({ valor, onCambiar }) {
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
        className={`tpp-trigger tpp-trigger--${opcionActual.key}`}
        onClick={() => setAbierto(true)}
      >
        <span className="tpp-trigger-left">
          <i className={opcionActual.icono}></i>
          {opcionActual.nombre}
        </span>
        <i className="fas fa-chevron-down tpp-chevron"></i>
      </button>

      {abierto && (
        <div className="tpp-overlay" onClick={() => setAbierto(false)}>
          <div className="tpp-panel" onClick={e => e.stopPropagation()}>

            <div className="tpp-header">
              <span className="tpp-title">
                <i className="fas fa-file-contract"></i> Tipo de Salario
              </span>
              <button type="button" className="tpp-close" onClick={() => setAbierto(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="tpp-options">
              {OPCIONES.map(op => (
                <button
                  key={op.valor}
                  type="button"
                  className={`tpp-option tpp-option--${op.key}${op.valor === valor ? ' tpp-option--activo' : ''}`}
                  onClick={() => seleccionar(op.valor)}
                >
                  <div className="tpp-option-icon-wrap">
                    <i className={op.icono}></i>
                  </div>
                  <div className="tpp-option-info">
                    <span className="tpp-option-nombre">{op.nombre}</span>
                    <span className="tpp-option-desc">{op.desc}</span>
                  </div>
                  {op.valor === valor && <i className="fas fa-check tpp-check"></i>}
                </button>
              ))}
            </div>

          </div>
        </div>
      )}
    </>
  );
}
