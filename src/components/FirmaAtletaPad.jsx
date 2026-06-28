import { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import SignatureCanvas from 'react-signature-canvas';

// Pad de firma genérico (reusa react-signature-canvas). Devuelve la firma como PNG base64 vía onConfirmar.
// `resumen`  = el score que el atleta está aceptando (se muestra GRANDE para que no firme a ciegas).
// `contexto` = equipo / WOD (línea chica de contexto).
// Soporta PANTALLA COMPLETA (atletas cansados firman más cómodo y legible).
export default function FirmaAtletaPad({ onCerrar, onConfirmar, resumen = '', contexto = '' }) {
  const padRef = useRef(null);
  const contRef = useRef(null);
  const [haDibujado, setHaDibujado] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  // Ajustar el buffer del canvas al tamaño renderizado (si no, el trazo se desfasa).
  // Re-medimos al alternar pantalla completa; al cambiar de tamaño el lienzo se limpia.
  useEffect(() => {
    const t = setTimeout(() => {
      const c = padRef.current?.getCanvas();
      const box = contRef.current;
      if (c && box) {
        const r = box.getBoundingClientRect();
        if (r.width && r.height) { c.width = Math.round(r.width); c.height = Math.round(r.height); }
        padRef.current?.clear();
        setHaDibujado(false);
      }
    }, 80);
    return () => clearTimeout(t);
  }, [fullscreen]);

  const confirmar = () => {
    if (!haDibujado || !padRef.current) { alert('Pide al atleta que firme.'); return; }
    onConfirmar?.(padRef.current.getCanvas().toDataURL('image/png'));
  };

  return createPortal(
    <div style={ov} onClick={onCerrar}>
      <div style={fullscreen ? modalFs : modal} onClick={e => e.stopPropagation()}>
        <h4 style={{ margin: '0 0 8px', color: '#fff', textAlign: 'center' }}>Firma del atleta</h4>

        {resumen ? (
          <div style={resumenBox}>
            {contexto && <div style={{ color: '#9aa', fontSize: '0.74rem', marginBottom: '2px' }}>{contexto}</div>}
            <span style={{ color: '#9aa', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '.04em' }}>Estás aceptando este resultado</span>
            <div style={{ color: '#fff', fontSize: fullscreen ? '2.2rem' : '1.5rem', fontWeight: 800, marginTop: '2px' }}>{resumen}</div>
          </div>
        ) : (
          <p style={{ margin: '0 0 10px', textAlign: 'center', color: '#888', fontSize: '0.8rem' }}>El atleta confirma su score firmando.</p>
        )}

        <div ref={contRef} style={{ background: '#fff', borderRadius: '10px', height: fullscreen ? '58vh' : '200px', overflow: 'hidden', flex: fullscreen ? '1 1 auto' : 'none' }}>
          <SignatureCanvas ref={padRef} penColor="black" onEnd={() => setHaDibujado(true)} canvasProps={{ style: { width: '100%', height: '100%', touchAction: 'none' } }} />
        </div>

        <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
          <button style={btnGhost} onClick={() => { padRef.current?.clear(); setHaDibujado(false); }}><i className="fas fa-eraser"></i> Limpiar</button>
          <button style={btnGhost} onClick={() => setFullscreen(f => !f)}>
            <i className={`fas ${fullscreen ? 'fa-compress' : 'fa-expand'}`}></i> {fullscreen ? 'Reducir' : 'Pantalla completa'}
          </button>
          <button style={btnGhost} onClick={onCerrar}>Cancelar</button>
          <button style={btnSolid} onClick={confirmar}><i className="fas fa-check"></i> Confirmar</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

const ov = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 100001, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' };
const modal = { background: '#15171c', border: '1px solid #2a2d35', borderRadius: '16px', padding: '20px', width: '100%', maxWidth: '440px' };
const modalFs = { background: '#15171c', border: '1px solid #2a2d35', borderRadius: '16px', padding: '20px', width: '100%', height: '100%', maxWidth: '100%', display: 'flex', flexDirection: 'column' };
const resumenBox = { textAlign: 'center', background: '#0f1115', border: '1px solid #2a2d35', borderRadius: '10px', padding: '10px 14px', margin: '0 0 12px' };
const btnGhost = { background: 'transparent', border: '1px solid #3a3d45', color: '#fff', borderRadius: '10px', padding: '10px 14px', cursor: 'pointer', fontWeight: 700 };
const btnSolid = { flex: 1, background: '#e63946', border: 'none', color: '#fff', borderRadius: '10px', padding: '10px', cursor: 'pointer', fontWeight: 700 };
