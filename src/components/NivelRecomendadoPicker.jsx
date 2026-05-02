import { useState } from 'react';
import { createPortal } from 'react-dom';
import './NivelRecomendadoPicker.css';

const OPCIONES = [
  { valor: 'Todos',        label: 'Todos',        desc: 'Cualquier nivel',          icono: 'fas fa-users',      key: 'todos'        },
  { valor: 'Novatos',      label: 'Novatos',      desc: 'Principiantes',            icono: 'fas fa-seedling',   key: 'novatos'      },
  { valor: 'Intermedios',  label: 'Intermedios',  desc: 'Dominio estándar',         icono: 'fas fa-fire',       key: 'intermedios'  },
  { valor: 'Avanzados',    label: 'Avanzados',    desc: 'RX — Pesos completos',     icono: 'fas fa-medal',      key: 'avanzados'    },
];

export default function NivelRecomendadoPicker({ valor, onCambiar }) {
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
        className={`nrp-trigger nrp-trigger--${opcionActual.key}`}
        onClick={() => setAbierto(true)}
      >
        <span className="nrp-trigger-left">
          <i className={opcionActual.icono}></i>
          {opcionActual.label}
        </span>
        <i className="fas fa-chevron-down nrp-chevron"></i>
      </button>

      {abierto && createPortal(
        <div className="nrp-overlay" onClick={() => setAbierto(false)}>
          <div className="nrp-panel" onClick={e => e.stopPropagation()}>

            <div className="nrp-header">
              <span className="nrp-title">
                <i className="fas fa-layer-group"></i> Nivel Recomendado
              </span>
              <button type="button" className="nrp-close" onClick={() => setAbierto(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="nrp-grid">
              {OPCIONES.map(op => (
                <button
                  key={op.valor}
                  type="button"
                  className={`nrp-option nrp-option--${op.key}${op.valor === valor ? ' nrp-option--activo' : ''}`}
                  onClick={() => seleccionar(op.valor)}
                >
                  <div className="nrp-icon-wrap">
                    <i className={op.icono}></i>
                  </div>
                  <span className="nrp-nombre">{op.label}</span>
                  <span className="nrp-desc">{op.desc}</span>
                  {op.valor === valor && <i className="fas fa-check nrp-check"></i>}
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
