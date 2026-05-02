import { useState } from 'react';
import { createPortal } from 'react-dom';
import './TipoEventoPicker.css';

const OPCIONES = [
  { valor: 'Social',               label: 'Comunidad / Social',    desc: 'Posadas, convivios, eventos de comunidad', icono: 'fas fa-users',          key: 'social'   },
  { valor: 'EntrenamientoEspecial', label: 'Entrenamiento Especial', desc: 'WOD especial, competencia interna, reto',  icono: 'fas fa-dumbbell',       key: 'especial' },
  { valor: 'Administrativo',       label: 'Administrativo',         desc: 'Tareas de gestión, pagos, logística',      icono: 'fas fa-clipboard-list', key: 'admin'    },
];

export default function TipoEventoPicker({ valor, onCambiar }) {
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
        className={`tep-trigger tep-trigger--${opcionActual.key}`}
        onClick={() => setAbierto(true)}
      >
        <span className="tep-trigger-left">
          <i className={opcionActual.icono}></i>
          {opcionActual.label}
        </span>
        <i className="fas fa-chevron-down tep-chevron"></i>
      </button>

      {abierto && createPortal(
        <div className="tep-overlay" onClick={() => setAbierto(false)}>
          <div className="tep-panel" onClick={e => e.stopPropagation()}>

            <div className="tep-header">
              <span className="tep-title">
                <i className="fas fa-calendar-alt"></i> Tipo de Evento
              </span>
              <button type="button" className="tep-close" onClick={() => setAbierto(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="tep-options">
              {OPCIONES.map(op => (
                <button
                  key={op.valor}
                  type="button"
                  className={`tep-option tep-option--${op.key}${op.valor === valor ? ' tep-option--activo' : ''}`}
                  onClick={() => seleccionar(op.valor)}
                >
                  <div className="tep-icon-wrap">
                    <i className={op.icono}></i>
                  </div>
                  <div className="tep-info">
                    <span className="tep-nombre">{op.label}</span>
                    <span className="tep-desc">{op.desc}</span>
                  </div>
                  {op.valor === valor && <i className="fas fa-check tep-check"></i>}
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
