import { useState } from 'react';
import { createPortal } from 'react-dom';
import './TipoSangrePicker.css';

const TIPOS = [
  { valor: 'A+',  grupo: 'A' },
  { valor: 'A-',  grupo: 'A' },
  { valor: 'B+',  grupo: 'B' },
  { valor: 'B-',  grupo: 'B' },
  { valor: 'O+',  grupo: 'O' },
  { valor: 'O-',  grupo: 'O' },
  { valor: 'AB+', grupo: 'AB' },
  { valor: 'AB-', grupo: 'AB' },
];

export default function TipoSangrePicker({ valor, onCambiar }) {
  const [abierto, setAbierto] = useState(false);

  const seleccionar = (v) => {
    setAbierto(false);
    if (v !== valor) onCambiar(v);
  };

  return (
    <>
      <button
        type="button"
        className={`tsp-trigger${!valor ? ' tsp-trigger--vacio' : ''}`}
        onClick={() => setAbierto(true)}
      >
        <span className="tsp-trigger-left">
          <i className="fas fa-tint" />
          {valor
            ? <><span className="tsp-tipo-badge">{valor}</span></>
            : 'Desconocido'
          }
        </span>
        <i className="fas fa-chevron-down tsp-chevron" />
      </button>

      {abierto && createPortal(
        <div className="tsp-overlay" onClick={() => setAbierto(false)}>
          <div className="tsp-panel" onClick={e => e.stopPropagation()}>

            <div className="tsp-header">
              <span className="tsp-title">
                <i className="fas fa-tint" /> Tipo de Sangre
              </span>
              <button type="button" className="tsp-close" onClick={() => setAbierto(false)}>
                <i className="fas fa-times" />
              </button>
            </div>

            <div className="tsp-options">
              {/* Opción desconocido */}
              <button
                type="button"
                className={`tsp-option tsp-option--desconocido${!valor ? ' tsp-option--activo' : ''}`}
                onClick={() => seleccionar('')}
              >
                <div className="tsp-opt-icon tsp-opt-icon--muted">
                  <i className="fas fa-question" />
                </div>
                <span className="tsp-opt-nombre">Desconocido</span>
                {!valor && <i className="fas fa-check tsp-check" />}
              </button>

              <div className="tsp-divider" />

              <div className="tsp-grid">
                {TIPOS.map(t => (
                  <button
                    key={t.valor}
                    type="button"
                    className={`tsp-blood-btn${t.valor === valor ? ' tsp-blood-btn--activo' : ''}${t.valor.includes('+') ? ' tsp-blood-btn--pos' : ' tsp-blood-btn--neg'}`}
                    onClick={() => seleccionar(t.valor)}
                  >
                    <span className="tsp-blood-label">{t.valor}</span>
                  </button>
                ))}
              </div>
            </div>

          </div>
        </div>,
        document.body
      )}
    </>
  );
}
