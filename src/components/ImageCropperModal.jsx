import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { getCroppedImg } from '../utils/cropImage';
import '../assets/css/ImageCropper.css';

export default function ImageCropperModal({ imageSrc, onCropComplete, onCancel }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const onCropCompleteHandler = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
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

  return (
    <div className="cropper-overlay">
      <div className="cropper-modal">
        <h4 className="cropper-title">Ajusta tu foto</h4>
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
        <div className="cropper-controls">
          <label className="text-light mb-1">Zoom</label>
          <input
            type="range"
            value={zoom}
            min={1}
            max={3}
            step={0.1}
            aria-labelledby="Zoom"
            onChange={(e) => setZoom(e.target.value)}
            className="form-range custom-range"
          />
        </div>
        <div className="cropper-actions">
          <button className="btn btn-outline-light" onClick={onCancel} disabled={isProcessing}>
            Cancelar
          </button>
          <button className="btn btn-danger" onClick={handleAplicar} disabled={isProcessing}>
            {isProcessing ? <i className="fas fa-spinner fa-spin"></i> : 'Aplicar'}
          </button>
        </div>
      </div>
    </div>
  );
}
