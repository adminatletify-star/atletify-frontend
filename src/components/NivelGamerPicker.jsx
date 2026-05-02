import { useState } from 'react';
import { createPortal } from 'react-dom';
import './NivelGamerPicker.css';

const NIVELES = [
  { valor: 'Cachorro',        icono: 'fas fa-paw',          desc: 'Principiante',  color: '#81c784' },
  { valor: 'Lobo Alfa',       icono: 'fas fa-wolf-pack-battalion', desc: 'Intermedio', color: '#4fc3f7' },
  { valor: 'Beast',           icono: 'fas fa-dragon',       desc: 'Avanzado',      color: '#f5a623' },
  { valor: 'Máquina',         icono: 'fas fa-robot',        desc: 'Competidor',    color: '#e63946' },
  { valor: 'Dios del Olimpo', icono: 'fas fa-crown',        desc: 'Mutante',       color: '#e040fb' },
];

export default function NivelGamerPicker({ valor, onCambiar }) {
  const [abierto, setAbierto] = useState(false);
  const actual = NIVELES.find(n => n.valor === valor) || NIVELES[0];

  const seleccionar = (v) => {
    setAbierto(false);
    if (v !== valor) onCambiar(v);
  };

  return (
    <>
      <button type="button" className="ngp-trigger" onClick={() => setAbierto(true)} style={{ borderColor: `${actual.color}4d`, background: `${actual.color}0f` }}>
        <span className="ngp-trigger-left">
          <i className={actual.icono} style={{ color: actual.color }} />
          <span className="ngp-trigger-nombre" style={{ color: actual.color }}>{actual.valor}</span>
        </span>
        <i className="fas fa-chevron-down ngp-chevron" />
      </button>

      {abierto && createPortal(
        <div className="ngp-overlay" onClick={() => setAbierto(false)}>
          <div className="ngp-panel" onClick={e => e.stopPropagation()}>
            <div className="ngp-header">
              <span className="ngp-title"><i className="fas fa-gamepad" /> Nivel Gamer</span>
              <button type="button" className="ngp-close" onClick={() => setAbierto(false)}><i className="fas fa-times" /></button>
            </div>
            <div className="ngp-options">
              {NIVELES.map(n => (
                <button key={n.valor} type="button" className={`ngp-option${n.valor === valor ? ' ngp-option--activo' : ''}`} style={{ '--ngp-c': n.color, borderColor: n.valor === valor ? `${n.color}80` : undefined, background: n.valor === valor ? `${n.color}14` : undefined }} onClick={() => seleccionar(n.valor)}>
                  <div className="ngp-opt-icon" style={{ background: `${n.color}18`, color: n.color }}><i className={n.icono} /></div>
                  <div className="ngp-opt-info">
                    <span className="ngp-opt-nombre" style={{ color: n.valor === valor ? n.color : undefined }}>{n.valor}</span>
                    <span className="ngp-opt-desc">{n.desc}</span>
                  </div>
                  {n.valor === valor && <i className="fas fa-check ngp-check" style={{ color: n.color }} />}
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
