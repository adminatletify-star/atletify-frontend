import { useState } from 'react';
import './EstatusPickerModal.css';

const OPCIONES_BASE = [
  { valor: 'Borrador',      label: 'Borrador',      icono: 'fas fa-pen-nib',         color: 'secondary' },
  { valor: 'Inscripciones', label: 'Inscripciones', icono: 'fas fa-clipboard-list',  color: 'success'   },
  { valor: 'Activa',        label: 'En Vivo',       icono: 'fas fa-circle',           color: 'danger'    },
  { valor: 'Finalizada',    label: 'Finalizada',    icono: 'fas fa-flag-checkered',   color: 'info'      },
  { valor: 'Archivada',     label: 'Archivada',     icono: 'fas fa-archive',          color: 'secondary' },
  { valor: 'Historial',     label: 'Historial',     icono: 'fas fa-history',          color: 'secondary' },
];

export default function EstatusPickerModal({ estatus, onCambiar }) {
  const [abierto, setAbierto] = useState(false);

  const opcionActual = OPCIONES_BASE.find(o => o.valor === estatus) || OPCIONES_BASE[0];

  // Estado "cerrado": solo puede moverse entre Historial y Archivada
  const esCerrado = ['Historial', 'Archivada'].includes(estatus);

  const opcionesMostradas = esCerrado
    ? OPCIONES_BASE.filter(o => ['Historial', 'Archivada'].includes(o.valor))
    : OPCIONES_BASE.filter(o => o.valor !== 'Archivada' && o.valor !== 'Historial' && o.valor !== 'Finalizada');

  const seleccionar = (valor) => {
    setAbierto(false);
    if (valor !== estatus) onCambiar(valor);
  };

  return (
    <>
      <button
        type="button"
        className={`epm-trigger epm-trigger--${opcionActual.color}`}
        onClick={() => setAbierto(true)}
      >
        <span className="epm-dot"></span>
        <span className="epm-label">{opcionActual.label.toUpperCase()}</span>
        <i className="fas fa-chevron-down epm-chevron"></i>
      </button>

      {abierto && (
        <div className="epm-overlay" onClick={() => setAbierto(false)}>
          <div className="epm-panel" onClick={e => e.stopPropagation()}>

            <div className="epm-panel-header">
              <span className="epm-panel-title">
                <i className="fas fa-tag me-2"></i>Cambiar Estatus
              </span>
              <button type="button" className="epm-panel-close" onClick={() => setAbierto(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="epm-options">
              {opcionesMostradas.map(op => (
                <button
                  key={op.valor}
                  type="button"
                  className={`epm-option epm-option--${op.color}${op.valor === estatus ? ' epm-option--activo' : ''}`}
                  onClick={() => seleccionar(op.valor)}
                >
                  <span className={`epm-option-dot epm-option-dot--${op.color}`}></span>
                  <i className={`${op.icono} epm-option-icono`}></i>
                  <span className="epm-option-label">{op.label}</span>
                  {op.valor === estatus && <i className="fas fa-check epm-option-check"></i>}
                </button>
              ))}
            </div>

          </div>
        </div>
      )}
    </>
  );
}
