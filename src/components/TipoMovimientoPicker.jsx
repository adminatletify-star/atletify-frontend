import { useState } from 'react';
import { createPortal } from 'react-dom';
import './TipoMovimientoPicker.css';

const OPCIONES = [
  {
    valor:       'Todos',
    label:       'TODOS',
    desc:        'Mostrar todos los movimientos',
    icono:       'fas fa-list',
    colorClass:  'tmp-opcion--todos',
  },
  {
    valor:       'Abono',
    label:       'ABONO',
    desc:        'Pago parcial o completo de plan',
    icono:       'fas fa-hand-holding-usd',
    colorClass:  'tmp-opcion--abono',
  },
  {
    valor:       'Drop-In',
    label:       'DROP-IN',
    desc:        'Visita de turista externo al box',
    icono:       'fas fa-plane-arrival',
    colorClass:  'tmp-opcion--dropin',
  },
  {
    valor:       'Alta Permanente',
    label:       'ALTA PERMANENTE',
    desc:        'Registro de Coach o Staff (Suscripción VIP)',
    icono:       'fas fa-id-badge',
    colorClass:  'tmp-opcion--vip',
  },
];

export default function TipoMovimientoPicker({ valor = 'Todos', onCambiar }) {
  const [abierto, setAbierto] = useState(false);

  const opcionActual = OPCIONES.find(o => o.valor === valor) || OPCIONES[0];

  const seleccionar = (v) => {
    setAbierto(false);
    onCambiar(v);
  };

  return (
    <>
      <button
        type="button"
        className={`tmp-trigger ${opcionActual.colorClass}--trigger`}
        onClick={() => setAbierto(true)}
      >
        <span className="tmp-trigger-left">
          <i className={`${opcionActual.icono} tmp-trigger-icon`}></i>
          <span className="tmp-trigger-label">{opcionActual.label}</span>
        </span>
        <i className="fas fa-chevron-down tmp-chevron"></i>
      </button>

      {abierto && createPortal(
        <div className="tmp-overlay" onClick={() => setAbierto(false)}>
          <div className="tmp-panel" onClick={e => e.stopPropagation()}>

            <div className="tmp-header">
              <span className="tmp-title">
                <i className="fas fa-filter"></i> Tipo de movimiento
              </span>
              <button type="button" className="tmp-close" onClick={() => setAbierto(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="tmp-lista">
              {OPCIONES.map(op => (
                <button
                  key={op.valor}
                  type="button"
                  className={`tmp-opcion ${op.colorClass} ${op.valor === valor ? 'tmp-opcion--activo' : ''}`}
                  onClick={() => seleccionar(op.valor)}
                >
                  <div className={`tmp-opcion-icono-wrap ${op.colorClass}--bg`}>
                    <i className={op.icono}></i>
                  </div>
                  <div className="tmp-opcion-texto">
                    <span className="tmp-opcion-label">{op.label}</span>
                    <span className="tmp-opcion-desc">{op.desc}</span>
                  </div>
                  {op.valor === valor && (
                    <i className="fas fa-check tmp-opcion-check"></i>
                  )}
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
