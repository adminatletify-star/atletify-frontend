import { useState } from 'react';
import { createPortal } from 'react-dom';
import './MesPicker.css';

const MESES = [
  { valor: 1,  nombre: 'Enero',      icono: 'fas fa-snowflake' },
  { valor: 2,  nombre: 'Febrero',    icono: 'fas fa-heart' },
  { valor: 3,  nombre: 'Marzo',      icono: 'fas fa-seedling' },
  { valor: 4,  nombre: 'Abril',      icono: 'fas fa-cloud-rain' },
  { valor: 5,  nombre: 'Mayo',       icono: 'fas fa-sun' },
  { valor: 6,  nombre: 'Junio',      icono: 'fas fa-fire' },
  { valor: 7,  nombre: 'Julio',      icono: 'fas fa-umbrella-beach' },
  { valor: 8,  nombre: 'Agosto',     icono: 'fas fa-water' },
  { valor: 9,  nombre: 'Septiembre', icono: 'fas fa-leaf' },
  { valor: 10, nombre: 'Octubre',    icono: 'fas fa-ghost' },
  { valor: 11, nombre: 'Noviembre',  icono: 'fas fa-wind' },
  { valor: 12, nombre: 'Diciembre',  icono: 'fas fa-gift' },
];

export default function MesPicker({ valor, onCambiar }) {
  const [abierto, setAbierto] = useState(false);
  const mesActual = MESES.find(m => m.valor === parseInt(valor)) || MESES[0];

  const seleccionar = (v) => {
    setAbierto(false);
    if (v !== parseInt(valor)) onCambiar(v);
  };

  return (
    <>
      <button
        type="button"
        className={`mep-trigger${!valor ? ' mep-trigger--vacio' : ''}`}
        onClick={() => setAbierto(true)}
      >
        <span className="mep-trigger-left">
          <i className={mesActual.icono + ' mep-trigger-icon'} />
          <span className="mep-trigger-nombre">{mesActual.nombre}</span>
        </span>
        <i className="fas fa-chevron-down mep-chevron" />
      </button>

      {abierto && createPortal(
        <div className="mep-overlay" onClick={() => setAbierto(false)}>
          <div className="mep-panel" onClick={e => e.stopPropagation()}>

            <div className="mep-header">
              <span className="mep-title">
                <i className="fas fa-calendar-alt" /> Mes
              </span>
              <button type="button" className="mep-close" onClick={() => setAbierto(false)}>
                <i className="fas fa-times" />
              </button>
            </div>

            <div className="mep-grid">
              {MESES.map(m => (
                <button
                  key={m.valor}
                  type="button"
                  className={`mep-item${m.valor === parseInt(valor) ? ' mep-item--activo' : ''}`}
                  onClick={() => seleccionar(m.valor)}
                >
                  <i className={m.icono + ' mep-item-icon'} />
                  <span className="mep-item-nombre">{m.nombre.substring(0, 3).toUpperCase()}</span>
                  {m.valor === parseInt(valor) && <i className="fas fa-check mep-item-check" />}
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
