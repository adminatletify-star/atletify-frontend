import { useState } from 'react';
import { createPortal } from 'react-dom';
import './ObjetivoPicker.css';

const OBJETIVOS = [
  { valor: 'Bajar de peso',   emoji: '🔥', nombre: 'Bajar de peso',    desc: 'Quemar grasa' },
  { valor: 'Ganar músculo',   emoji: '💪', nombre: 'Ganar músculo',    desc: 'Hipertrofia' },
  { valor: 'Competir',        emoji: '🏆', nombre: 'Competir',         desc: 'Prepararse para competencias' },
  { valor: 'Salud general',   emoji: '❤️', nombre: 'Salud general',    desc: 'Mantenimiento' },
  { valor: 'Socializar',      emoji: '🍻', nombre: 'Socializar',       desc: 'Desestresarme' },
];

export default function ObjetivoPicker({ valor, onCambiar }) {
  const [abierto, setAbierto] = useState(false);
  const actual = OBJETIVOS.find(o => o.valor === valor);

  const seleccionar = (v) => {
    setAbierto(false);
    if (v !== valor) onCambiar(v);
  };

  return (
    <>
      <button type="button" className={`obp-trigger${!valor ? ' obp-trigger--vacio' : ''}`} onClick={() => setAbierto(true)}>
        <span className="obp-trigger-left">
          {actual ? (
            <>
              <span className="obp-trigger-emoji">{actual.emoji}</span>
              <span className="obp-trigger-nombre">{actual.nombre}</span>
            </>
          ) : (
            <>
              <i className="fas fa-bullseye obp-trigger-icon" />
              <span className="obp-trigger-nombre">Selecciona tu meta</span>
            </>
          )}
        </span>
        <i className="fas fa-chevron-down obp-chevron" />
      </button>

      {abierto && createPortal(
        <div className="obp-overlay" onClick={() => setAbierto(false)}>
          <div className="obp-panel" onClick={e => e.stopPropagation()}>
            <div className="obp-header">
              <span className="obp-title"><i className="fas fa-bullseye" /> Objetivo Principal</span>
              <button type="button" className="obp-close" onClick={() => setAbierto(false)}><i className="fas fa-times" /></button>
            </div>
            <div className="obp-options">
              {OBJETIVOS.map(o => (
                <button key={o.valor} type="button" className={`obp-option${o.valor === valor ? ' obp-option--activo' : ''}`} onClick={() => seleccionar(o.valor)}>
                  <span className="obp-option-emoji">{o.emoji}</span>
                  <div className="obp-option-info">
                    <span className="obp-option-nombre">{o.nombre}</span>
                    <span className="obp-option-desc">{o.desc}</span>
                  </div>
                  {o.valor === valor && <i className="fas fa-check obp-check" />}
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
