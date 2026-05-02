import { useState, useRef, useEffect } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { BOXES_ENDPOINT } from '../services/api';

export default function ModalFirmaReglamento({ idBox, idUsuario, reglamentoHtml, reglamentoActualizadoEn, onFirmaCompletada }) {
  const [paso, setPaso] = useState('leer'); // 'leer' | 'firmar'
  const [guardando, setGuardando] = useState(false);
  const [fullscreenPad, setFullscreenPad] = useState(false);
  const padRef = useRef(null);

  // Efecto para deshabilitar el scroll del body mientras el modal está abierto
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'auto'; };
  }, []);

  const limpiarFirma = () => {
    if (padRef.current) padRef.current.clear();
  };

  const toggleFullscreen = () => {
    let savedData = null;
    if (padRef.current && !padRef.current.isEmpty()) {
      savedData = padRef.current.toData();
    }
    
    setFullscreenPad(!fullscreenPad);
    
    if (savedData) {
      setTimeout(() => {
        if (padRef.current) {
          padRef.current.fromData(savedData);
        }
      }, 50);
    }
  };

  const enviarFirma = async () => {
    if (padRef.current.isEmpty()) {
      alert("Por favor, traza tu firma antes de continuar.");
      return;
    }

    // Usamos getCanvas() en lugar de getTrimmedCanvas() para evitar problemas
    // de compatibilidad de la librería con los bundlers modernos (Vite).
    const firmaBase64 = padRef.current.getCanvas().toDataURL('image/png');

    setGuardando(true);
    try {
      const res = await fetch(`${BOXES_ENDPOINT}/${idBox}/atletas/${idUsuario}/firmar-reglamento`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firmaBase64 })
      });

      if (res.ok) {
        onFirmaCompletada();
      } else {
        const errData = await res.json();
        alert(`Error al guardar: ${errData.mensaje || 'Error desconocido'}`);
        setGuardando(false);
      }
    } catch (err) {
      console.error(err);
      alert("Error de conexión al guardar la firma.");
      setGuardando(false);
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h4 style={styles.title}>
            <i className="fas fa-file-contract me-2"></i>Reglamento del Box
          </h4>
          {reglamentoActualizadoEn && (
            <p className="text-muted mt-2 mb-0" style={{ fontSize: '0.85rem' }}>
              Última actualización: {new Date(reglamentoActualizadoEn).toLocaleString('es-MX')}
            </p>
          )}
        </div>

        <div style={styles.body}>
          {paso === 'leer' ? (
            <div style={styles.reglamentoContainer}>
              <div 
                className="quill-content-renderer"
                dangerouslySetInnerHTML={{ __html: reglamentoHtml }} 
                style={styles.htmlContent}
              />
            </div>
          ) : (
            <div style={fullscreenPad ? styles.firmaContainerFullscreen : styles.firmaContainer}>
              {!fullscreenPad && (
                <p className="text-muted mb-3 text-center">
                  Dibuja tu firma en el recuadro blanco usando tu dedo o mouse.
                </p>
              )}
              
              <div style={fullscreenPad ? styles.padWrapperFullscreen : styles.padWrapper}>
                <SignatureCanvas 
                  key={fullscreenPad ? 'fullscreen' : 'normal'}
                  ref={padRef} 
                  penColor="black"
                  canvasProps={{ style: styles.canvas }} 
                />
              </div>
              
              <div className={`d-flex justify-content-center mt-3 gap-2 ${fullscreenPad ? 'position-absolute bottom-0 mb-4' : ''}`} style={{ zIndex: 10001 }}>
                <button className={`btn btn-outline-secondary rounded-pill px-3 ${fullscreenPad ? 'bg-dark text-white' : ''}`} onClick={limpiarFirma}>
                  <i className="fas fa-eraser me-2"></i>Limpiar
                </button>
                <button 
                  className={`btn rounded-pill px-3 ${fullscreenPad ? 'btn-primary' : 'btn-outline-primary'}`} 
                  onClick={toggleFullscreen}
                >
                  <i className={`fas ${fullscreenPad ? 'fa-compress' : 'fa-expand'} me-2`}></i>
                  {fullscreenPad ? 'Salir de Pantalla Completa' : 'Pantalla Completa'}
                </button>
              </div>
            </div>
          )}
        </div>

        <div style={styles.footer}>
          {paso === 'leer' ? (
            <button 
              className="btn btn-danger w-100 py-3" 
              style={{ fontSize: '1.1rem', fontWeight: 'bold', borderRadius: '12px' }}
              onClick={() => setPaso('firmar')}
            >
              ACEPTAR Y FIRMAR
            </button>
          ) : (
            <div className="d-flex gap-2 w-100">
              <button 
                className="btn btn-dark w-50 py-3" 
                style={{ fontSize: '1.1rem', fontWeight: 'bold', borderRadius: '12px' }}
                onClick={() => setPaso('leer')}
                disabled={guardando}
              >
                Volver
              </button>
              <button 
                className="btn btn-success w-50 py-3" 
                style={{ fontSize: '1.1rem', fontWeight: 'bold', borderRadius: '12px' }}
                onClick={enviarFirma}
                disabled={guardando}
              >
                {guardando ? 'Guardando...' : 'ENVIAR FIRMA'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    backdropFilter: 'blur(10px)',
    zIndex: 9999, // Debe estar por encima de TODO
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1rem'
  },
  modal: {
    backgroundColor: '#0a0a0e', // Dark theme para que cuadre con la app
    border: '1px solid #333',
    borderRadius: '16px',
    width: '100%',
    maxWidth: '700px',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 20px 50px rgba(0,0,0,0.8)'
  },
  header: {
    padding: '1.5rem',
    borderBottom: '1px solid #333',
    textAlign: 'center'
  },
  title: {
    color: '#e74c3c',
    margin: 0,
    fontWeight: '800'
  },
  body: {
    padding: '1.5rem',
    flexGrow: 1,
    overflowY: 'auto'
  },
  reglamentoContainer: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: '12px',
    padding: '1.5rem',
    color: '#fff'
  },
  htmlContent: {
    fontFamily: 'system-ui, -apple-system, sans-serif',
    lineHeight: '1.6'
  },
  firmaContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  },
  padWrapper: {
    backgroundColor: '#fff',
    border: '2px dashed #666',
    borderRadius: '12px',
    overflow: 'hidden',
    width: '100%',
    maxWidth: '500px',
    aspectRatio: '16/9'
  },
  firmaContainerFullscreen: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#0a0a0e',
    zIndex: 10000,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center'
  },
  padWrapperFullscreen: {
    backgroundColor: '#fff',
    border: 'none',
    width: '100vw',
    height: '100vh'
  },
  canvas: {
    width: '100%',
    height: '100%',
    touchAction: 'none' // Previene que la pantalla baje al firmar en celular
  },
  footer: {
    padding: '1.5rem',
    borderTop: '1px solid #333',
    display: 'flex',
    justifyContent: 'space-between'
  }
};
