import { useEffect, useRef, useState } from 'react';
import '../assets/css/OfflineIndicator.css';

/**
 * OfflineIndicator
 * ----------------
 * Banner fijo en la parte superior que avisa al usuario cuando se cae
 * la conexión a internet, y muestra un toast verde brevemente cuando
 * la conexión se restablece.
 *
 * Se monta globalmente en App.jsx para que cubra TODAS las páginas.
 *
 * Estados:
 *  - online + nunca se cayó  → no renderiza nada
 *  - offline                 → banner rojo persistente con botón "Ver pantalla offline"
 *  - reconectado (3.5 s)     → banner verde "Conexión restablecida", luego se oculta
 *
 * Usa los eventos nativos `online`/`offline` del navegador. NO hace fetch
 * de prueba para no consumir datos del usuario ni generar logs extra.
 */

const RECONNECT_TOAST_MS = 3500;

export default function OfflineIndicator() {
  // navigator.onLine ya viene del navegador — confiable para el render inicial
  const [online, setOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [showReconnected, setShowReconnected] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const reconnectTimer = useRef(null);

  useEffect(() => {
    const handleOnline = () => {
      setOnline(true);
      setDismissed(false);
      setShowReconnected(true);
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      reconnectTimer.current = setTimeout(() => {
        setShowReconnected(false);
      }, RECONNECT_TOAST_MS);
    };

    const handleOffline = () => {
      setOnline(false);
      setDismissed(false);
      setShowReconnected(false);
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    };
  }, []);

  // No mostrar nada si todo está bien
  if (online && !showReconnected) return null;
  // No mostrar nada si el usuario lo cerró manualmente
  if (dismissed) return null;

  // === RECONECTADO (verde, temporal) ===
  if (online && showReconnected) {
    return (
      <div
        className="oin-banner oin-banner--ok"
        role="status"
        aria-live="polite"
      >
        <div className="oin-icon" aria-hidden="true">
          <i className="fas fa-check"></i>
        </div>
        <div className="oin-text">
          <p className="oin-title">Conexión restablecida</p>
          <p className="oin-subtitle">Ya puedes seguir usando Atletify con normalidad.</p>
        </div>
        <div className="oin-actions">
          <button
            type="button"
            className="oin-btn-close"
            onClick={() => setShowReconnected(false)}
            aria-label="Cerrar aviso"
          >
            <i className="fas fa-times" aria-hidden="true"></i>
          </button>
        </div>
      </div>
    );
  }

  // === OFFLINE (rojo, persistente) ===
  return (
    <div
      className="oin-banner oin-banner--off"
      role="alert"
      aria-live="assertive"
    >
      <div className="oin-icon oin-icon--dot" aria-hidden="true">
        <i className="fas fa-wifi"></i>
      </div>
      <div className="oin-text">
        <p className="oin-title">Sin conexión a internet</p>
        <p className="oin-subtitle">
          Algunas funciones pueden no estar disponibles hasta que vuelva la señal.
        </p>
      </div>
      <div className="oin-actions">
        <a
          href="/offline.html"
          className="oin-btn oin-btn--secondary"
        >
          Ver más
        </a>
        <button
          type="button"
          className="oin-btn-close"
          onClick={() => setDismissed(true)}
          aria-label="Cerrar aviso"
        >
          <i className="fas fa-times" aria-hidden="true"></i>
        </button>
      </div>
    </div>
  );
}
