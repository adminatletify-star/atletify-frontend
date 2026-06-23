import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register';
import App from './App.jsx'
import GlobalAlertBridge from './components/GlobalAlertBridge.jsx';
import { Analytics } from '@vercel/analytics/react';

// === PWA: auto-actualización ===
// Registra el service worker. En modo autoUpdate, registerSW recarga la app SOLA en
// cuanto se activa una versión nueva, así el PWA no va "un arranque por detrás" de la
// web. Además volvemos a chequear al regresar a la app y cada minuto, para que un PWA
// que queda abierto tome los deploys nuevos en segundos.
// (En `npm run dev` el SW está apagado por devOptions.enabled:false → registerSW es no-op.)
registerSW({
  immediate: true,
  onRegisteredSW(swUrl, registration) {
    if (!registration) return;
    const comprobar = () => { try { registration.update(); } catch (_) { /* noop */ } };
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') comprobar();
    });
    setInterval(comprobar, 60 * 1000);
  },
});

// Bootstrap CSS & JS
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle';

// Global WolfPack Styles
import './assets/css/global.css';
import './assets/css/componentes.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GlobalAlertBridge />
    <App />
    <Analytics />
  </StrictMode>,
)
