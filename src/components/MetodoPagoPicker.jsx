import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import './MetodoPagoPicker.css';

const TODAS_LAS_OPCIONES = [
  { valor: 'EnLinea',       nombre: 'Pago en Línea Segura',  desc: 'Paga con tarjeta de crédito/débito',     icono: 'fas fa-credit-card',     key: 'tarjeta'  },
  { valor: 'Transferencia', nombre: 'Transferencia Bancaria', desc: 'Sube tu comprobante de pago', icono: 'fas fa-university',      key: 'transfer' },
  { valor: 'Efectivo',      nombre: 'Efectivo en Recepción', desc: 'Paga en caja el día del evento', icono: 'fas fa-money-bill-wave', key: 'efectivo' }
];

export default function MetodoPagoPicker({ valor, onCambiar, opcionesPermitidas = ['EnLinea', 'Transferencia', 'Efectivo'] }) {
  const [abierto, setAbierto] = useState(false);
  
  const opcionesMostradas = TODAS_LAS_OPCIONES.filter(o => opcionesPermitidas.includes(o.valor));
  const actual = opcionesMostradas.find(o => o.valor === valor) || opcionesMostradas[0];

  // Si el valor del padre no está entre las opciones permitidas, el picker cae a la primera
  // disponible. Sincronizamos el estado del padre para que UI y estado no queden desfasados
  // (p. ej. muestra "Pago en Línea" pero el estado seguía en "Transferencia" y pedía comprobante).
  useEffect(() => {
    if (actual && actual.valor !== valor) {
      onCambiar(actual.valor);
    }
  }, [actual, valor, onCambiar]);

  const seleccionar = (v) => {
    setAbierto(false);
    if (v !== valor) onCambiar(v);
  };

  // Sin métodos habilitados: evita el crash (actual === undefined) y muestra un estado claro.
  if (!actual) {
    return (
      <div className="mpp-trigger mpp-trigger--empty" aria-disabled="true">
        <span className="mpp-trigger-left">
          <i className="fas fa-triangle-exclamation"></i>
          Sin métodos de pago habilitados
        </span>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        className={`mpp-trigger mpp-trigger--${actual.key}`}
        onClick={() => setAbierto(true)}
      >
        <span className="mpp-trigger-left">
          <i className={actual.icono}></i>
          {actual.nombre}
        </span>
        <i className="fas fa-chevron-down mpp-chevron"></i>
      </button>

      {abierto && createPortal(
        <div className="mpp-overlay" onClick={() => setAbierto(false)}>
          <div className="mpp-panel" onClick={e => e.stopPropagation()}>

            <div className="mpp-header">
              <span className="mpp-title">
                <i className="fas fa-wallet"></i> Método de Pago
              </span>
              <button type="button" className="mpp-close" onClick={() => setAbierto(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="mpp-options">
              {opcionesMostradas.map(op => (
                <button
                  key={op.valor}
                  type="button"
                  className={`mpp-option${op.valor === valor ? ' mpp-option--activo' : ''}`}
                  onClick={() => seleccionar(op.valor)}
                >
                  <div className="mpp-option-icon">
                    <i className={op.icono}></i>
                  </div>
                  <div className="mpp-option-info">
                    <span className="mpp-option-nombre">{op.nombre}</span>
                    <span className="mpp-option-desc">{op.desc}</span>
                  </div>
                  {op.valor === valor && <i className="fas fa-check mpp-check"></i>}
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
