import { useState } from 'react';
import { createPortal } from 'react-dom';
import TimeWheelPicker from './TimeWheelPicker';

function format12h(hhmm) {
  const [h, m] = (hhmm || '00:00').split(':').map(Number);
  const periodo = h < 12 ? 'AM' : 'PM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, '0')} ${periodo}`;
}

/**
 * Selector de hora con el mismo lenguaje visual que RedGrayDatePicker
 * (input limpio, ícono a la derecha) + rueda TimeWheelPicker en modal.
 * Reemplaza a los <input type="time"> nativos.
 */
export default function HoraEventoPicker({ value, onChange, titulo }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className={`cd-time-btn${open ? ' cd-time-btn--open' : ''}`}
        onClick={() => setOpen(true)}
        title={titulo}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span>{format12h(value)}</span>
        <i className="far fa-clock cd-time-btn-icon" />
      </button>

      {open && createPortal(
        <div className="twp-overlay" onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
          <div className="twp-modal">
            <TimeWheelPicker
              value={value}
              onAccept={(t) => { onChange(t); setOpen(false); }}
              onCancel={() => setOpen(false)}
            />
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
