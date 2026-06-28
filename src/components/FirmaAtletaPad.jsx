import { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import SignatureCanvas from 'react-signature-canvas';

// Pad de firma genérico (reusa react-signature-canvas). Devuelve la firma como PNG base64 vía onConfirmar.
// No postea a ningún lado (a diferencia de ModalFirmaReglamento, que está acoplado al reglamento del box).
export default function FirmaAtletaPad({ onCerrar, onConfirmar }) {
  const padRef = useRef(null);
  const contRef = useRef(null);
  const [haDibujado, setHaDibujado] = useState(false);

  // Ajustar el buffer del canvas al tamaño renderizado (si no, el trazo se desfasa).
  useEffect(() => {
    const t = setTimeout(() => {
      const c = padRef.current?.getCanvas();
      const box = contRef.current;
      if (c && box) {
        const r = box.getBoundingClientRect();
        if (r.width) { c.width = Math.round(r.width); c.height = Math.round(r.height); }
      }
    }, 50);
    return () => clearTimeout(t);
  }, []);

  const confirmar = () => {
    if (!haDibujado || !padRef.current) { alert('Pide al atleta que firme.'); return; }
    onConfirmar?.(padRef.current.getCanvas().toDataURL('image/png'));
  };

  return createPortal(
    <div style={ov} onClick={onCerrar}>
      <div style={modal} onClick={e => e.stopPropagation()}>
        <h4 style={{ margin: '0 0 4px', color: '#fff', textAlign: 'center' }}>Firma del atleta</h4>
        <p style={{ margin: '0 0 10px', textAlign: 'center', color: '#888', fontSize: '0.8rem' }}>El atleta confirma su score firmando.</p>
        <div ref={contRef} style={{ background: '#fff', borderRadius: '10px', height: '200px', overflow: 'hidden' }}>
          <SignatureCanvas ref={padRef} penColor="black" onEnd={() => setHaDibujado(true)} canvasProps={{ style: { width: '100%', height: '100%', touchAction: 'none' } }} />
        </div>
        <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
          <button style={btnGhost} onClick={() => { padRef.current?.clear(); setHaDibujado(false); }}>Limpiar</button>
          <button style={btnGhost} onClick={onCerrar}>Cancelar</button>
          <button style={btnSolid} onClick={confirmar}>Confirmar</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

const ov = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 100001, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' };
const modal = { background: '#15171c', border: '1px solid #2a2d35', borderRadius: '16px', padding: '20px', width: '100%', maxWidth: '440px' };
const btnGhost = { background: 'transparent', border: '1px solid #3a3d45', color: '#fff', borderRadius: '10px', padding: '10px 14px', cursor: 'pointer', fontWeight: 700 };
const btnSolid = { flex: 1, background: '#e63946', border: 'none', color: '#fff', borderRadius: '10px', padding: '10px', cursor: 'pointer', fontWeight: 700 };
