import { useState } from 'react';
import { createPortal } from 'react-dom';
import './TallaPlayeraPicker.css';

const TALLAS = [
  { valor: 'XS', desc: 'Extra Small' },
  { valor: 'S',  desc: 'Small'       },
  { valor: 'M',  desc: 'Medium'      },
  { valor: 'L',  desc: 'Large'       },
  { valor: 'XL', desc: 'Extra Large' },
];

export default function TallaPlayeraPicker({ valor, onCambiar }) {
  const [abierto, setAbierto] = useState(false);

  const seleccionar = (v) => {
    setAbierto(false);
    if (v !== valor) onCambiar(v);
  };

  return (
    <>
      <button
        type="button"
        className={`tpp-trigger${!valor ? ' tpp-trigger--vacio' : ''}`}
        onClick={() => setAbierto(true)}
      >
        <span className="tpp-trigger-left">
          <i className="fas fa-tshirt"></i>
          {valor
            ? <><span className="tpp-size-badge">{valor}</span> Talla {valor}</>
            : 'Selecciona talla...'
          }
        </span>
        <i className="fas fa-chevron-down tpp-chevron"></i>
      </button>

      {abierto && createPortal(
        <div className="tpp-overlay" onClick={() => setAbierto(false)}>
          <div className="tpp-panel" onClick={e => e.stopPropagation()}>

            <div className="tpp-header">
              <span className="tpp-title">
                <i className="fas fa-tshirt"></i> Talla Playera
              </span>
              <button type="button" className="tpp-close" onClick={() => setAbierto(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="tpp-grid">
              {TALLAS.map(t => (
                <button
                  key={t.valor}
                  type="button"
                  className={`tpp-size-btn${t.valor === valor ? ' tpp-size-btn--activo' : ''}`}
                  onClick={() => seleccionar(t.valor)}
                >
                  <span className="tpp-size-label">{t.valor}</span>
                  <span className="tpp-size-desc">{t.desc.split(' ').map(w => w[0]).join('')}</span>
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
