import { createContext, useContext, useEffect, useState, useCallback } from 'react';

/**
 * PwaInstallContext
 * -----------------
 * Maneja la lógica de instalación de la PWA de forma centralizada:
 *  - Escucha `beforeinstallprompt` (Chrome / Edge / Brave en desktop y Android)
 *    y guarda el evento para dispararlo cuando convenga.
 *  - Detecta iOS (Safari NO dispara el evento — hay que mostrar instrucciones
 *    manuales para "Agregar a pantalla de inicio").
 *  - Detecta si la app ya está instalada (modo standalone).
 *
 * NO toca rutas, fetch, ni nada del flujo existente.
 * Si el navegador no soporta PWA, simplemente queda inerte (canInstall = false).
 */

const PwaInstallContext = createContext({
  canInstall: false,
  isIOS: false,
  isStandalone: false,
  promptInstall: async () => 'unavailable',
});

export function PwaInstallProvider({ children }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  // Detección inicial — solo se ejecuta una vez al montar
  useEffect(() => {
    // ¿Está corriendo ya como app instalada?
    const standaloneMQ = window.matchMedia?.('(display-mode: standalone)').matches;
    const iosStandalone = window.navigator.standalone === true; // iOS legacy flag
    setIsStandalone(Boolean(standaloneMQ || iosStandalone));

    // ¿Es iOS / iPadOS? (iPadOS moderno se identifica como Mac con touch)
    const ua = window.navigator.userAgent || '';
    const isAppleMobile = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
    const isIpadOSDesktopMode =
      ua.includes('Macintosh') && typeof navigator.maxTouchPoints === 'number' && navigator.maxTouchPoints > 1;
    setIsIOS(isAppleMobile || isIpadOSDesktopMode);
  }, []);

  // Listener de beforeinstallprompt — guarda el evento para usarlo cuando queramos
  useEffect(() => {
    const onBeforeInstallPrompt = (e) => {
      // Evita el mini-infobar nativo del navegador; lo dispararemos nosotros.
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const onAppInstalled = () => {
      setDeferredPrompt(null);
      setIsStandalone(true);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

  // Dispara el prompt nativo. Devuelve 'accepted' | 'dismissed' | 'unavailable'.
  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return 'unavailable';
    try {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      setDeferredPrompt(null); // el evento solo se puede usar una vez
      return choice?.outcome || 'dismissed';
    } catch (err) {
      console.warn('[PWA] Error mostrando prompt de instalación:', err);
      return 'dismissed';
    }
  }, [deferredPrompt]);

  return (
    <PwaInstallContext.Provider
      value={{
        canInstall: !!deferredPrompt,
        isIOS,
        isStandalone,
        promptInstall,
      }}
    >
      {children}
    </PwaInstallContext.Provider>
  );
}

export function usePwaInstall() {
  return useContext(PwaInstallContext);
}
