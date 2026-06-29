import { createPortal } from 'react-dom';
import { useEffect } from 'react';
import './FotoModal.css';

// Lightbox para ver una foto en grande (estilo Facebook/Instagram).
// Se cierra al hacer clic fuera, en la X, o con Escape.
export default function FotoModal({ src, alt = '', onCerrar }) {
  useEffect(() => {
    if (!src) return;
    const onKey = (e) => { if (e.key === 'Escape') onCerrar?.(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [src, onCerrar]);

  if (!src) return null;

  return createPortal(
    <div className="foto-modal-overlay" onClick={onCerrar} role="dialog" aria-modal="true">
      <button className="foto-modal-close" onClick={onCerrar} aria-label="Cerrar"><i className="fas fa-times"></i></button>
      <img src={src} alt={alt} className="foto-modal-img" onClick={(e) => e.stopPropagation()} />
    </div>,
    document.body
  );
}
