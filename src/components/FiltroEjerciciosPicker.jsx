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

export default function FiltroEjerciciosPicker({ valor = 'Todas', onCambiar }) {
  const [abierto, setAbierto] = useState(false);
  const esTodas = valor === 'Todas';
  const opcionActual = !esTodas ? CATEGORIAS.find(c => c.valor === valor) : null;

  const seleccionar = (v) => {
    setAbierto(false);
    if (v !== valor) onCambiar(v);
  };

  return (
    <>
      <button
        type="button"
        className={`cep-trigger${opcionActual ? ` cep-trigger--${opcionActual.key}` : ''}`}
        style={esTodas
          ? { background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.12)', color: 'var(--secondary)', width: 'auto', minWidth: '120px' }
          : { width: 'auto', minWidth: '120px' }
        }
        onClick={() => setAbierto(true)}
      >
        <span className="cep-trigger-left">
          <i className={opcionActual ? opcionActual.icono : 'fas fa-layer-group'} />
          {esTodas ? 'Todas' : opcionActual.label}
        </span>
        <i className="fas fa-chevron-down cep-chevron" />
      </button>

      {abierto && createPortal(
        <div className="cep-overlay" onClick={() => setAbierto(false)}>
          <div className="cep-panel" onClick={e => e.stopPropagation()}>

            <div className="cep-header">
              <span className="cep-title">
                <i className="fas fa-filter" /> Filtrar por categoría
              </span>
              <button type="button" className="cep-close" onClick={() => setAbierto(false)}>
                <i className="fas fa-times" />
              </button>
            </div>

            <div className="cep-options">

              <button
                type="button"
                className={`cep-option${esTodas ? ' cep-option--activo' : ''}`}
                style={esTodas
                  ? { borderColor: 'rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.06)' }
                  : undefined}
                onClick={() => seleccionar('Todas')}
              >
                <div className="cep-icon-wrap" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--secondary)' }}>
                  <i className="fas fa-layer-group" />
                </div>
                <div className="cep-info">
                  <span className="cep-nombre" style={{ color: 'var(--text-primary)' }}>Todas</span>
                  <span className="cep-desc">Mostrar todos los ejercicios</span>
                </div>
                {esTodas && <i className="fas fa-check cep-check" style={{ color: 'var(--secondary)' }} />}
              </button>

              {CATEGORIAS.map(cat => (
                <button
                  key={cat.valor}
                  type="button"
                  className={`cep-option cep-option--${cat.key}${cat.valor === valor ? ' cep-option--activo' : ''}`}
                  onClick={() => seleccionar(cat.valor)}
                >
                  <div className="cep-icon-wrap">
                    <i className={cat.icono} />
                  </div>
                  <div className="cep-info">
                    <span className="cep-nombre">{cat.label}</span>
                    <span className="cep-desc">{cat.desc}</span>
                  </div>
                  {cat.valor === valor && <i className="fas fa-check cep-check" />}
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
