import { useState } from 'react';
import { createPortal } from 'react-dom';
import './CategoriaEjercicioPicker.css';

const CATEGORIAS = [
  { valor: 'Piernas',    label: 'Piernas',    desc: 'Squats, lunges y movimientos de tren inferior', icono: 'fas fa-child',          key: 'piernas'    },
  { valor: 'Full Body',  label: 'Full Body',  desc: 'Ejercicios que involucran todo el cuerpo',       icono: 'fas fa-fire',           key: 'fullbody'   },
  { valor: 'Fuerza',     label: 'Fuerza',     desc: 'Weightlifting y movimientos de fuerza máxima',   icono: 'fas fa-weight-hanging', key: 'fuerza'     },
  { valor: 'Olímpico',   label: 'Olímpico',   desc: 'Clean, Snatch, Jerk y variantes olímpicas',     icono: 'fas fa-bolt',           key: 'olimpico'   },
  { valor: 'Gimnástico', label: 'Gimnástico', desc: 'Pull-ups, muscle-ups, handstands y más',         icono: 'fas fa-hands-helping',  key: 'gimnastico' },
  { valor: 'Cardio',     label: 'Cardio',     desc: 'Running, rowing, bike y doble unders...',        icono: 'fas fa-running',        key: 'cardio'     },
  { valor: 'Core',       label: 'Core',       desc: 'Abdominales, planks y estabilidad central',      icono: 'fas fa-sync-alt',       key: 'core'       },
];

export default function CategoriaEjercicioPicker({ valor, onCambiar }) {
  const [abierto, setAbierto] = useState(false);
  const opcionActual = CATEGORIAS.find(c => c.valor === valor) || CATEGORIAS[0];

  const seleccionar = (v) => {
    setAbierto(false);
    if (v !== valor) onCambiar(v);
  };

  return (
    <>
      <button
        type="button"
        className={`cep-trigger cep-trigger--${opcionActual.key}`}
        onClick={() => setAbierto(true)}
      >
        <span className="cep-trigger-left">
          <i className={opcionActual.icono}></i>
          {opcionActual.label}
        </span>
        <i className="fas fa-chevron-down cep-chevron"></i>
      </button>

      {abierto && createPortal(
        <div className="cep-overlay" onClick={() => setAbierto(false)}>
          <div className="cep-panel" onClick={e => e.stopPropagation()}>

            <div className="cep-header">
              <span className="cep-title">
                <i className="fas fa-tag"></i> Categoría del Ejercicio
              </span>
              <button type="button" className="cep-close" onClick={() => setAbierto(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="cep-options">
              {CATEGORIAS.map(cat => (
                <button
                  key={cat.valor}
                  type="button"
                  className={`cep-option cep-option--${cat.key}${cat.valor === valor ? ' cep-option--activo' : ''}`}
                  onClick={() => seleccionar(cat.valor)}
                >
                  <div className="cep-icon-wrap">
                    <i className={cat.icono}></i>
                  </div>
                  <div className="cep-info">
                    <span className="cep-nombre">{cat.label}</span>
                    <span className="cep-desc">{cat.desc}</span>
                  </div>
                  {cat.valor === valor && <i className="fas fa-check cep-check"></i>}
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
