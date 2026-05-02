import { useState } from 'react';
import { createPortal } from 'react-dom';
import './UnidadPesoPicker.css';

const UNIDADES = [
  { valor: 'lbs', nombre: 'Libras', icono: 'fas fa-weight-hanging', desc: 'lbs' },
  { valor: 'kg',  nombre: 'Kilogramos', icono: 'fas fa-weight', desc: 'kg' },
];

export default function UnidadPesoPicker({ valor, onCambiar }) {
  const [abierto, setAbierto] = useState(false);
  const actual = UNIDADES.find(u => u.valor === valor) || UNIDADES[0];

  const seleccionar = (v) => {
    setAbierto(false);
    if (v !== valor) onCambiar(v);
  };

  return (
    <>
      <button type="button" className="upp-trigger" onClick={() => setAbierto(true)}>
        <span className="upp-trigger-left">
          <span className="upp-trigger-valor">{actual.desc}</span>
        </span>
        <i className="fas fa-chevron-down upp-chevron" />
      </button>

      {abierto && createPortal(
        <div className="upp-overlay" onClick={() => setAbierto(false)}>
          <div className="upp-panel" onClick={e => e.stopPropagation()}>
            <div className="upp-header">
              <span className="upp-title"><i className="fas fa-balance-scale" /> Unidad</span>
              <button type="button" className="upp-close" onClick={() => setAbierto(false)}><i className="fas fa-times" /></button>
            </div>
            <div className="upp-options">
              {UNIDADES.map(u => (
                <button key={u.valor} type="button" className={`upp-option${u.valor === valor ? ' upp-option--activo' : ''}`} onClick={() => seleccionar(u.valor)}>
                  <div className="upp-opt-icon"><i className={u.icono} /></div>
                  <div className="upp-opt-info">
                    <span className="upp-opt-nombre">{u.nombre}</span>
                    <span className="upp-opt-desc">{u.desc}</span>
                  </div>
                  {u.valor === valor && <i className="fas fa-check upp-check" />}
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
