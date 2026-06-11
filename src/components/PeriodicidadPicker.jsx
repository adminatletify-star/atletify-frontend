import { useState } from 'react';
import './TipoPagoPicker.css';

const OPCIONES = [
  { valor: 'Semanal',   nombre: 'Semanal',   desc: 'Se paga cada semana',                 icono: 'fas fa-calendar-week', key: 'porclase' },
  { valor: 'Quincenal', nombre: 'Quincenal', desc: 'Se paga cada quincena (1–15 y 16–fin)', icono: 'fas fa-calendar-day',  key: 'mensual' },
  { valor: 'Mensual',   nombre: 'Mensual',   desc: 'Se paga una vez al mes',              icono: 'fas fa-calendar-alt',  key: 'mensual' },
];

export default function PeriodicidadPicker({ valor, onCambiar }) {
  const [abierto, setAbierto] = useState(false);
  const opcionActual = OPCIONES.find(o => o.valor === valor) || OPCIONES[0];
  const seleccionar = (v) => { setAbierto(false); if (v !== valor) onCambiar(v); };

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
                <i className="fas fa-clock"></i> Cadencia de Pago
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
