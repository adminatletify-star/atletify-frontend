import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import '../assets/css/Ejercicios.css';

const handleVideoClick = (e) => {
  if (!document.fullscreenElement) {
    e.preventDefault();
    e.currentTarget.requestFullscreen();
  }
};

// Modal de detalle de un ejercicio del diccionario.
// Reutilizado en la pantalla Ejercicios y en el WOD del UserPanel.
// Se renderiza en document.body (portal) para evitar problemas de stacking.
export default function EjercicioDetailModal({ ejercicio, onClose }) {
  const color = ejercicio?.color || 'var(--primary)';
  const colorHex = ejercicio?.color || '#e63946';

  return createPortal(
    <AnimatePresence>
      {ejercicio && (
        <motion.div
          className="ej-modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
        >
          <motion.div
            className="ej-modal"
            style={{ borderTop: `3px solid ${color}` }}
            initial={{ opacity: 0, scale: 0.92, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 24 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            onClick={e => e.stopPropagation()}
          >
            {/* Botón cerrar */}
            <button className="ej-modal-close" onClick={onClose}>
              <i className="fas fa-times" />
            </button>

            {/* Header del modal */}
            <div className="d-flex align-items-start gap-3">
              <div
                className="ej-modal-icono"
                style={{
                  background: colorHex + '20',
                  border: `1px solid ${colorHex}40`,
                  color,
                }}
              >
                <i className={ejercicio.icono} />
              </div>
              <div className="flex-grow-1 min-w-0" style={{ paddingRight: '2rem' }}>
                <h3 className="ej-modal-nombre">{ejercicio.nombre}</h3>
                {ejercicio.subnombre && <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Alt: {ejercicio.subnombre}</p>}
                <span className="ej-categoria" style={{ '--ej-color': color }}>
                  {ejercicio.categoria}
                </span>
              </div>
            </div>

            <div className="ej-modal-divider" />

            {/* Instrucción completa */}
            <p className="ej-modal-texto">{ejercicio.instruccion}</p>

            {/* Contenedor de Video */}
            <div className="ej-modal-video-container mt-4">
              <h4 style={{ fontSize: '1rem', color: 'var(--secondary)', marginBottom: '1rem' }}>
                <i className="fas fa-video me-2"></i>Ejemplo de Ejecución
              </h4>
              {ejercicio.videoUrl ? (
                <video
                  src={ejercicio.videoUrl}
                  controls
                  autoPlay
                  muted
                  loop
                  onClick={handleVideoClick}
                  onContextMenu={e => e.preventDefault()}
                  controlsList="nodownload noremoteplayback noplaybackrate"
                  disablePictureInPicture
                  style={{ width: '100%', borderRadius: '8px', border: `1px solid ${colorHex}40`, background: '#000', cursor: 'zoom-in' }}
                ></video>
              ) : (
                <div className="d-flex flex-column align-items-center justify-content-center p-4" style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                  <i className="fas fa-film fa-2x mb-2" style={{ color: 'var(--text-muted)', opacity: 0.5 }}></i>
                  <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>Contenido de ejemplo aún no disponible.</p>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
