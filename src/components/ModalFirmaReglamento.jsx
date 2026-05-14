import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import SignatureCanvas from 'react-signature-canvas';
import { BOXES_ENDPOINT } from '../services/api';
import './ModalFirmaReglamento.css';

export default function ModalFirmaReglamento({ idBox, idUsuario, reglamentoHtml, reglamentoActualizadoEn, onFirmaCompletada }) {
  const [paso, setPaso]           = useState('leer');
  const [guardando, setGuardando] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [hasDrawn, setHasDrawn]   = useState(false);

  const padRef          = useRef(null); // SignatureCanvas instance
  const padContainerRef = useRef(null); // wrapper div
  const savedPngRef     = useRef(null); // PNG data URL saved between mode switches
  const hasDrawnRef     = useRef(false); // ref mirror of hasDrawn (accessible in callbacks without stale closures)

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // ── Resize the canvas buffer to match its rendered size, then restore any saved drawing ──
  // Called after the container's CSS changes (paso mount or fullscreen toggle).
  const syncCanvas = useCallback(() => {
    const canvas = padRef.current?.getCanvas();
    const container = padContainerRef.current;
    if (!canvas || !container) return;

    const { width, height } = container.getBoundingClientRect();
    if (width === 0 || height === 0) return;

    // Capture any current content before the canvas is erased by resizing
    const src = savedPngRef.current
      ?? (hasDrawnRef.current ? canvas.toDataURL('image/png') : null);
    savedPngRef.current = null;

    // Setting width/height clears the canvas buffer — that's intentional here
    canvas.width  = Math.round(width);
    canvas.height = Math.round(height);

    if (src) {
      const img = new Image();
      img.onload = () => canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      img.src = src;
    }
  }, []);

  // Re-sync whenever the pad first appears or fullscreen mode changes
  useEffect(() => {
    if (paso !== 'firmar') return;
    const id = setTimeout(syncCanvas, 60); // 60 ms: enough time for CSS/layout to settle
    return () => clearTimeout(id);
  }, [paso, fullscreen, syncCanvas]);

  // ── Actions ──────────────────────────────────────────────────────────────────

  const onStrokeEnd = useCallback(() => {
    hasDrawnRef.current = true;
    setHasDrawn(true);
  }, []);

  const limpiar = useCallback(() => {
    padRef.current?.clear();
    savedPngRef.current   = null;
    hasDrawnRef.current   = false;
    setHasDrawn(false);
  }, []);

  const toggleFullscreen = useCallback(() => {
    // Save the current drawing BEFORE the container resizes
    const canvas = padRef.current?.getCanvas();
    savedPngRef.current = (canvas && hasDrawnRef.current)
      ? canvas.toDataURL('image/png')
      : null;
    setFullscreen(v => !v);
  }, []);

  const enviarFirma = async () => {
    if (!hasDrawnRef.current || !padRef.current) {
      alert('Por favor, traza tu firma antes de continuar.');
      return;
    }
    const firmaBase64 = padRef.current.getCanvas().toDataURL('image/png');
    setGuardando(true);
    try {
      const res = await fetch(`${BOXES_ENDPOINT}/${idBox}/atletas/${idUsuario}/firmar-reglamento`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firmaBase64 }),
      });
      if (res.ok) {
        onFirmaCompletada();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`Error al guardar: ${err.mensaje || 'Error desconocido'}`);
        setGuardando(false);
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión al guardar la firma.');
      setGuardando(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  return createPortal(
    <div className="mfr-overlay" style={s.overlay}>
      <div className="mfr-modal" style={s.modal}>

        {/* Header */}
        <div className="mfr-header" style={s.header}>
          <h4 style={s.title}>
            <i className="fas fa-file-contract me-2"></i>Reglamento del Box
          </h4>
          {reglamentoActualizadoEn && (
            <p style={s.meta}>
              Última actualización: {new Date(reglamentoActualizadoEn).toLocaleString('es-MX')}
            </p>
          )}
        </div>

        {/* Body */}
        <div className="mfr-body" style={s.body}>
          {paso === 'leer' ? (
            <div
              className="quill-content-renderer"
              dangerouslySetInnerHTML={{ __html: reglamentoHtml }}
              style={s.reglamentoContent}
            />
          ) : (
            <div>
              {!fullscreen && <p style={s.padHint}>Dibuja tu firma con el dedo o el mouse.</p>}

              {/*
                ── UN SOLO SignatureCanvas ──
                El mismo nodo DOM cambia su CSS entre modo normal (dentro del modal)
                y modo pantalla completa (fixed cubriendo la pantalla).
                Al no remontar el componente, el dibujo no se pierde; solo se guarda
                el PNG antes del cambio y se restaura tras el resize del buffer.
              */}
              <div
                ref={padContainerRef}
                style={fullscreen ? s.padWrapperFullscreen : s.padWrapper}
              >
                <SignatureCanvas
                  ref={padRef}
                  penColor="black"
                  onEnd={onStrokeEnd}
                  canvasProps={{ style: { width: '100%', height: '100%', touchAction: 'none' } }}
                />
              </div>

              {/* Barra de controles en pantalla completa */}
              {fullscreen && (
                <div style={s.fullscreenBar}>
                  <button style={s.btnOutline} onClick={limpiar}>
                    <i className="fas fa-eraser me-2"></i>Limpiar
                  </button>
                  <button
                    style={{ ...s.btnOutline, borderColor: 'rgba(230,57,70,0.5)', color: '#ff8896' }}
                    onClick={toggleFullscreen}
                  >
                    <i className="fas fa-compress me-2"></i>Salir de pantalla completa
                  </button>
                </div>
              )}

              {/* Controles en modo normal */}
              {!fullscreen && (
                <div className="mfr-pad-actions" style={s.padActions}>
                  <button style={s.btnOutline} onClick={limpiar}>
                    <i className="fas fa-eraser me-2"></i>Limpiar
                  </button>
                  <button style={s.btnOutline} onClick={toggleFullscreen}>
                    <i className="fas fa-expand me-2"></i>Pantalla completa
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mfr-footer" style={s.footer}>
          {paso === 'leer' ? (
            <button style={s.btnAceptar} onClick={() => setPaso('firmar')}>
              <i className="fas fa-pen me-2"></i>ACEPTAR Y FIRMAR
            </button>
          ) : (
            !fullscreen && (
              <div className="mfr-footer-row" style={s.footerRow}>
                <button
                  className="mfr-btn-volver"
                  style={s.btnVolver}
                  onClick={() => setPaso('leer')}
                  disabled={guardando}
                >
                  <i className="fas fa-arrow-left me-2"></i>Volver
                </button>
                <button style={s.btnEnviar} onClick={enviarFirma} disabled={guardando}>
                  {guardando
                    ? <><i className="fas fa-spinner fa-spin me-2"></i>Guardando...</>
                    : <><i className="fas fa-check me-2"></i>ENVIAR FIRMA</>}
                </button>
              </div>
            )
          )}
        </div>

      </div>
    </div>,
    document.body
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = {
  overlay: {
    position: 'fixed', inset: 0,
    backgroundColor: 'rgba(0,0,0,0.92)',
    backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
    zIndex: 99999,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '1rem',
  },
  modal: {
    backgroundColor: '#0f0f14',
    border: '1px solid #2a2a3a',
    borderTop: '3px solid #e63946',
    borderRadius: '16px',
    width: '100%', maxWidth: '680px', maxHeight: '92dvh',
    display: 'flex', flexDirection: 'column',
    boxShadow: '0 24px 60px rgba(0,0,0,0.85)',
    overflow: 'hidden',
  },
  header: {
    padding: '1.25rem 1.5rem',
    borderBottom: '1px solid #2a2a3a',
    textAlign: 'center', flexShrink: 0,
  },
  title: {
    color: '#e63946', margin: '0 0 0.25rem',
    fontWeight: 800, fontSize: '1.1rem',
    textTransform: 'uppercase', letterSpacing: '1px',
  },
  meta: { fontSize: '0.77rem', color: '#888', margin: 0 },
  body: {
    flex: 1, overflowY: 'auto', overflowX: 'hidden',
    overscrollBehavior: 'contain',
    padding: '1.25rem 1.5rem', minHeight: 0,
  },
  reglamentoContent: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    border: '1px solid #2a2a3a', borderRadius: '12px',
    padding: '1.25rem', color: '#fff',
    fontFamily: 'system-ui, sans-serif',
    lineHeight: 1.65, fontSize: '0.9rem',
    wordBreak: 'break-word', overflowWrap: 'break-word', overflowX: 'hidden',
  },
  padHint: {
    textAlign: 'center', fontSize: '0.8rem',
    color: '#888', marginBottom: '0.85rem',
  },

  // Modo normal: altura responsiva, sin flex que la estire
  padWrapper: {
    backgroundColor: '#fff',
    border: '2px dashed rgba(230,57,70,0.45)',
    borderRadius: '12px',
    overflow: 'hidden',
    width: '100%',
    height: 'clamp(130px, 32dvh, 260px)',
  },

  // Modo pantalla completa: cubre la pantalla dejando espacio para la barra de controles
  padWrapperFullscreen: {
    position: 'fixed',
    top: 0, left: 0, right: 0,
    bottom: '72px', // espacio para la barra de controles
    zIndex: 100001,
    backgroundColor: '#fff',
    cursor: 'crosshair',
  },

  // Barra fija en la parte inferior durante pantalla completa
  fullscreenBar: {
    position: 'fixed',
    bottom: 0, left: 0, right: 0,
    height: '72px',
    zIndex: 100001,
    display: 'flex', alignItems: 'center',
    justifyContent: 'center', gap: '0.75rem',
    background: '#0a0a0e',
    borderTop: '1px solid #2a2a3a',
  },

  padActions: {
    display: 'flex', justifyContent: 'center',
    gap: '0.65rem', marginTop: '1rem', flexWrap: 'wrap',
  },
  footer: {
    padding: '1rem 1.5rem',
    borderTop: '1px solid #2a2a3a', flexShrink: 0,
  },
  footerRow: { display: 'flex', gap: '0.75rem', width: '100%' },
  btnAceptar: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: '100%', background: '#e63946', border: 'none',
    borderRadius: '10px', color: '#fff', fontWeight: 700,
    fontSize: '0.95rem', letterSpacing: '1px',
    textTransform: 'uppercase', padding: '0.85rem', cursor: 'pointer',
  },
  btnVolver: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid #2a2a3a', borderRadius: '10px',
    color: '#fff', fontWeight: 700, fontSize: '0.9rem',
    padding: '0.85rem 1.25rem', cursor: 'pointer', flexShrink: 0,
  },
  btnEnviar: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flex: 1, background: '#2ecc71', border: 'none',
    borderRadius: '10px', color: '#fff', fontWeight: 700,
    fontSize: '0.9rem', letterSpacing: '1px',
    textTransform: 'uppercase', padding: '0.85rem', cursor: 'pointer',
  },
  btnOutline: {
    display: 'inline-flex', alignItems: 'center',
    background: 'none', border: '1px solid #2a2a3a',
    borderRadius: '10px', color: '#aaa', fontWeight: 700,
    fontSize: '0.8rem', padding: '0.5rem 1rem', cursor: 'pointer',
  },
};
