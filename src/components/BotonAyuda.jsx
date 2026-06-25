import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import './BotonAyuda.css';

/**
 * Botón de ayuda "?" reutilizable.
 * Al pulsarlo abre un modal centrado (createPortal) que explica, en lenguaje
 * claro para el usuario, para qué sirve esa acción/opción.
 *
 * Sigue el sistema de diseño: card centrada con border-top var(--primary),
 * border-radius 20px, backdrop blur. Nunca usa title="" nativo ni alert.
 *
 * Props:
 *  - titulo:  encabezado del modal de ayuda.
 *  - children: contenido explicativo (JSX o texto).
 *  - className: clases extra para el botón "?".
 *  - ariaLabel: etiqueta accesible (default "Ayuda").
 */
export default function BotonAyuda({ titulo, children, className = '', ariaLabel = 'Ayuda' }) {
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    if (!abierto) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setAbierto(false); };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [abierto]);

  return (
    <>
      <button
        type="button"
        className={`ayuda-btn ${className}`}
        onClick={() => setAbierto(true)}
        aria-label={ariaLabel}
      >
        <i className="fas fa-question" aria-hidden="true"></i>
      </button>

      {abierto && createPortal(
        <div
          className="ayuda-overlay"
          role="presentation"
          onClick={() => setAbierto(false)}
        >
          <div
            className="ayuda-modal"
            role="dialog"
            aria-modal="true"
            aria-label={titulo}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="ayuda-modal-top">
              <span className="ayuda-modal-badge">
                <i className="fas fa-circle-question me-1" aria-hidden="true"></i>
                Ayuda
              </span>
              <button
                type="button"
                className="ayuda-modal-close"
                onClick={() => setAbierto(false)}
                aria-label="Cerrar"
              >×</button>
            </div>

            <h3 className="ayuda-modal-title">{titulo}</h3>
            <div className="ayuda-modal-body">{children}</div>

            <button type="button" className="ayuda-modal-ok" onClick={() => setAbierto(false)}>
              <i className="fas fa-check me-1" aria-hidden="true"></i>Entendido
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
