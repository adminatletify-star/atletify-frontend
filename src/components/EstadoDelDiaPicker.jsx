import { useState } from 'react';
import { createPortal } from 'react-dom';
import './EstadoDelDiaPicker.css';

const ESTADOS = [
  { valor: '😎 Chill',              emoji: '😎', nombre: 'Chill', desc: 'Tranquilo' },
  { valor: '🔥 Con todo el Hype',   emoji: '🔥', nombre: 'Hype', desc: 'Con todo' },
  { valor: '💀 Destruido',          emoji: '💀', nombre: 'Destruido', desc: 'Día difícil' },
  { valor: '🧟 Modo Zombie',        emoji: '🧟', nombre: 'Zombie', desc: 'Sin energía' },
  { valor: '💪 Rompiendo PRs',      emoji: '💪', nombre: 'PRs', desc: 'Rompiendo records' },
  { valor: '🩹 Lesionado',          emoji: '🩹', nombre: 'Lesionado', desc: 'Cuidando el cuerpo' },
];

export default function EstadoDelDiaPicker({ valor, onCambiar }) {
  const [abierto, setAbierto] = useState(false);
  const actual = ESTADOS.find(e => e.valor === valor) || ESTADOS[0];

  const seleccionar = (v) => {
    setAbierto(false);
    if (v !== valor) onCambiar(v);
  };

  return (
    <>
      <button type="button" className="edp-trigger" onClick={() => setAbierto(true)}>
        <span className="edp-trigger-left">
          <span className="edp-trigger-emoji">{actual.emoji}</span>
          <span className="edp-trigger-nombre">{actual.nombre}</span>
        </span>
        <i className="fas fa-chevron-down edp-chevron" />
      </button>

      {abierto && createPortal(
        <div className="edp-overlay" onClick={() => setAbierto(false)}>
          <div className="edp-panel" onClick={e => e.stopPropagation()}>
            <div className="edp-header">
              <span className="edp-title"><i className="fas fa-theater-masks" /> Estado de Hoy</span>
              <button type="button" className="edp-close" onClick={() => setAbierto(false)}><i className="fas fa-times" /></button>
            </div>
            <div className="edp-grid">
              {ESTADOS.map(e => (
                <button key={e.valor} type="button" className={`edp-item${e.valor === valor ? ' edp-item--activo' : ''}`} onClick={() => seleccionar(e.valor)}>
                  <span className="edp-item-emoji">{e.emoji}</span>
                  <span className="edp-item-nombre">{e.nombre}</span>
                  <span className="edp-item-desc">{e.desc}</span>
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
