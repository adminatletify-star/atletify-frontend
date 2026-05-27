import { useEffect, useState } from 'react';
import { usePwaInstall } from '../context/PwaInstallContext';
import '../assets/css/BannerInstalarPwa.css';

/**
 * BannerInstalarPwa
 * -----------------
 * Aviso flotante en la esquina superior derecha del Home que invita a
 * instalar la PWA. Aparece SOLO UNA VEZ por dispositivo/navegador
 * (controlado con localStorage). El usuario lo puede cerrar con la X
 * o aceptando la instalación.
 *
 * No se monta si:
 *  - La app ya está corriendo como instalada (display-mode: standalone)
 *  - El usuario ya lo cerró / aceptó antes (flag en localStorage)
 *  - No es iOS y el navegador no expone beforeinstallprompt
 *
 * Pequeño retardo (1.2 s) antes de aparecer para no chocar visualmente
 * con la animación del Hero del Home.
 */

const DISMISS_KEY = 'pwa_install_banner_dismissed_v1';
const APPEAR_DELAY_MS = 1200;

export default function BannerInstalarPwa() {
  const { canInstall, isIOS, isStandalone, promptInstall } = usePwaInstall();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Verifica condiciones de visibilidad
    if (isStandalone) return;                                              // ya instalada
    if (localStorage.getItem(DISMISS_KEY) === '1') return;                 // ya cerrada antes
    if (!canInstall && !isIOS) return;                                     // sin soporte de instalación

    // Pequeño delay para que el banner no aparezca encima del hero al instante
    const t = setTimeout(() => setVisible(true), APPEAR_DELAY_MS);
    return () => clearTimeout(t);
  }, [canInstall, isIOS, isStandalone]);

  // Cierra y marca como "no volver a mostrar"
  const cerrarYRecordar = () => {
    localStorage.setItem(DISMISS_KEY, '1');
    setVisible(false);
  };

  const handleInstalar = async () => {
    const outcome = await promptInstall();
    // Tanto si acepta como si rechaza, no volvemos a insistir.
    // (Chrome puede bloquear el evento durante meses si el usuario rechaza varias veces.)
    if (outcome === 'accepted' || outcome === 'dismissed') {
      cerrarYRecordar();
    }
  };

  if (!visible) return null;

  return (
    <div className="bpwa-banner" role="dialog" aria-label="Instalar Atletify">
      <button
        type="button"
        className="bpwa-close"
        onClick={cerrarYRecordar}
        aria-label="Cerrar aviso"
      >
        <i className="fas fa-times" aria-hidden="true"></i>
      </button>

      <div className="bpwa-header">
        <img
          src="/icons/icon-192.png"
          alt=""
          className="bpwa-icon"
          aria-hidden="true"
        />
        <div>
          <h3 className="bpwa-title">
            Instala <span>Atletify</span>
          </h3>
          <p className="bpwa-subtitle">
            Accede más rápido desde la pantalla de inicio de tu dispositivo.
          </p>
        </div>
      </div>

      {isIOS ? (
        <>
          <div className="bpwa-ios-steps">
            <p className="bpwa-ios-step">
              <span className="bpwa-ios-step-num">1</span>
              Toca&nbsp;
              <i className="fas fa-arrow-up-from-bracket" aria-hidden="true"></i>
              &nbsp;Compartir
            </p>
            <p className="bpwa-ios-step">
              <span className="bpwa-ios-step-num">2</span>
              Selecciona &laquo;Añadir a pantalla de inicio&raquo;
            </p>
          </div>
          <div className="bpwa-actions">
            <button type="button" className="bpwa-btn-primary" onClick={cerrarYRecordar}>
              Entendido
            </button>
          </div>
        </>
      ) : (
        <div className="bpwa-actions">
          <button type="button" className="bpwa-btn-secondary" onClick={cerrarYRecordar}>
            Ahora no
          </button>
          <button type="button" className="bpwa-btn-primary" onClick={handleInstalar}>
            <i className="fas fa-download" aria-hidden="true"></i>
            Instalar
          </button>
        </div>
      )}
    </div>
  );
}
