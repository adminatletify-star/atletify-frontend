import { useState } from 'react';
import { createPortal } from 'react-dom';
import './AccionCambioPicker.css';

const OPCIONES = [
  {
    valor: 'efectivo',
    nombre: 'Devolver en efectivo',
    desc: 'Le regresas físicamente el cambio al atleta',
    icono: 'fas fa-hand-holding-usd',
    key: 'efectivo',
  },
  {
    valor: 'saldo',
    nombre: 'Guardar en Billetera Digital',
    desc: 'Se acumula como saldo a favor en su cuenta',
    icono: 'fas fa-wallet',
    key: 'saldo',
  },
];

export default function AccionCambioPicker({ valor, onCambiar }) {
  const [abierto, setAbierto] = useState(false);

  const actual = OPCIONES.find(o => o.valor === valor) || OPCIONES[0];

  const seleccionar = (v) => {
    setAbierto(false);
    if (v !== valor) onCambiar(v);
  };

  return (
    <>
      <button
        type="button"
        className={`accp-trigger accp-trigger--${actual.key}`}
        onClick={() => setAbierto(true)}
      >
        <span className="accp-trigger-left">
          <i className={actual.icono}></i>
          {actual.nombre}
        </span>
        <i className="fas fa-chevron-down accp-chevron"></i>
      </button>

      {abierto && createPortal(
        <div className="accp-overlay" onClick={() => setAbierto(false)}>
          <div className="accp-panel" onClick={e => e.stopPropagation()}>

            <div className="accp-header">
              <span className="accp-title">
                <i className="fas fa-coins"></i> ¿Qué hacer con el cambio?
              </span>
              <button type="button" className="accp-close" onClick={() => setAbierto(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="accp-options">
              {OPCIONES.map(op => (
                <button
                  key={op.valor}
                  type="button"
                  className={`accp-option accp-option--${op.key}${op.valor === valor ? ' accp-option--activo' : ''}`}
                  onClick={() => seleccionar(op.valor)}
                >
                  <div className="accp-option-icon">
                    <i className={op.icono}></i>
                  </div>
                  <div className="accp-option-info">
                    <span className="accp-option-nombre">{op.nombre}</span>
                    <span className="accp-option-desc">{op.desc}</span>
                  </div>
                  {op.valor === valor && <i className="fas fa-check accp-check"></i>}
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
