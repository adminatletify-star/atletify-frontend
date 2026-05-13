import { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { getCroppedImg } from '../utils/cropImage';
import '../assets/css/ImageCropper.css';

export default function ImageCropperModal({ imageSrc, onCropComplete, onCancel }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const onCropCompleteHandler = useCallback((_, pixels) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const handleAplicar = async () => {
    if (!croppedAreaPixels) return;
    setIsProcessing(true);
    try {
      const croppedBase64 = await getCroppedImg(imageSrc, croppedAreaPixels);
      onCropComplete(croppedBase64);
    } catch (e) {
      console.error(e);
      alert('Error al recortar la imagen.');
    } finally {
      setIsProcessing(false);
    }
  };

  const zoomPercent = Math.round(((zoom - 1) / 2) * 100);

  return (
    <div className="cropper-overlay" onClick={onCancel}>
      <div className="cropper-modal" onClick={e => e.stopPropagation()}>

        {/* ── Header ── */}
        <div className="cropper-header">
          <span className="cropper-header-icon">
            <i className="fas fa-camera"></i>
          </span>
          <div className="cropper-header-text">
            <h4 className="cropper-title">Ajusta tu foto</h4>
            <p className="cropper-subtitle">Mueve y escala para encuadrar tu foto de perfil</p>
          </div>
        </div>

        {/* ── Área de recorte ── */}
        <div className="cropper-container">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onCropComplete={onCropCompleteHandler}
            onZoomChange={setZoom}
          />
        </div>

        {/* ── Zoom ── */}
        <div className="cropper-controls">
          <div className="cropper-zoom-label">
            <span className="cropper-zoom-text">
              <i className="fas fa-search-plus"></i> Zoom
            </span>
            <span className="cropper-zoom-value">{zoomPercent}%</span>
          </div>
          <input
            type="range"
            className="cropper-range"
            value={zoom}
            min={1}
            max={3}
            step={0.05}
            aria-label="Zoom"
            onChange={e => setZoom(parseFloat(e.target.value))}
          />
        </div>

        {/* ── Hint ── */}
        <p className="cropper-hint">
          <i className="fas fa-hand-paper"></i>
          Arrastra la imagen para reencuadrar · La foto se recortará en círculo
        </p>

        {/* ── Acciones ── */}
        <div className="cropper-actions">
          <button
            className="cropper-btn cropper-btn--cancel"
            onClick={onCancel}
            disabled={isProcessing}
          >
            <i className="fas fa-times"></i> Cancelar
          </button>
          <button
            className="cropper-btn cropper-btn--apply"
            onClick={handleAplicar}
            disabled={isProcessing}
          >
            {isProcessing
              ? <><span className="cropper-spinner"></span> Aplicando...</>
              : <><i className="fas fa-check"></i> Aplicar</>
            }
          </button>
        </div>

      </div>
    </div>
  );
}
