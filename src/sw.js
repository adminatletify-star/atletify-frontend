// ============================================================
//  Service Worker propio de Atletify (estrategia injectManifest)
//  - Mantiene el precache/offline de Workbox que ya teníamos.
//  - AÑADE Web Push: recibe los avisos y los pinta como notificación
//    nativa del sistema, etiquetada con la CUENTA (rol · correo + nombre),
//    y al tocarla mete a esa cuenta y navega a la sección o abre la campanita.
// ============================================================
import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { clientsClaim } from 'workbox-core';

// Activación inmediata (equivale a skipWaiting + clientsClaim que teníamos en generateSW).
self.skipWaiting();
clientsClaim();

// Precache de los assets del build + limpieza de cachés viejas.
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

// Fallback de navegación SPA → index.html (sin tocar /api/).
const navHandler = createHandlerBoundToURL('index.html');
registerRoute(new NavigationRoute(navHandler, { denylist: [/^\/api\//] }));

// ============================================================
//  WEB PUSH
// ============================================================

// Página del panel según el rol (para abrir la campanita cuando el aviso no
// tiene una pantalla propia a la que llevar).
function panelDelRol(rol) {
  if (rol === 'Atleta' || rol === 'Usuario') return '/user-panel';
  // AdminBox, Coach, Developer → panel de administración
  return '/admin-box-panel';
}

// Ruta destino a partir del aviso. Devuelve null si NO hay pantalla propia
// (comentarios de WOD, solicitudes de amistad, campaña en modal…): en ese caso
// se abre el panel del rol y la campanita.
function rutaDesdeData(data) {
  const destino = typeof data.destino === 'string' ? data.destino : '';

  if (destino === 'validaciones') return '/admin-box/validaciones';
  if (destino === 'gestion-solicitudes') return '/gestion-solicitudes';
  if (destino === 'buzon-admin') return '/buzon-sugerencias';
  if (destino === 'mi-sugerencia') return '/buzon-sugerencias';
  if (destino === 'records') return '/mi-perfil#records';
  if (destino.startsWith('control-campania:')) {
    const id = destino.split(':')[1];
    if (id) return `/control-campania/${id}`;
  }
  if (destino.startsWith('sugerencia-coach:')) return '/mis-sugerencias-coach';
  if (destino.startsWith('sug-coach-resp:')) return '/sugerencias-atletas';

  return null;
}

// URL final a abrir. Añade ?correo= para que el guardia de rutas cambie a la
// cuenta correcta (mecanismo AccountConflictResolver ya existente) y, si no hay
// pantalla propia, ?campanita=1 para que el panel abra la campanita.
function construirUrl(data) {
  const origin = self.location.origin;
  let ruta = rutaDesdeData(data);
  let abrirCampanita = false;
  if (!ruta) {
    ruta = panelDelRol(data.rol);
    abrirCampanita = true;
  }

  // Separar el hash (#records) para colocar el query antes de él.
  let hash = '';
  const hashIdx = ruta.indexOf('#');
  if (hashIdx >= 0) {
    hash = ruta.slice(hashIdx);
    ruta = ruta.slice(0, hashIdx);
  }

  const params = new URLSearchParams();
  if (data.correo) params.set('correo', data.correo);
  if (abrirCampanita) params.set('campanita', '1');
  const qs = params.toString();
  return origin + ruta + (qs ? `?${qs}` : '') + hash;
}

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    try { data = { titulo: event.data && event.data.text() }; } catch (_) { data = {}; }
  }

  const rolLabel = data.rolLabel || 'Atletify';
  const correo = data.correo || '';
  // Título = identidad de la cuenta:  "Administrador del box · correo@dominio"
  const titulo = correo ? `${rolLabel} · ${correo}` : rolLabel;

  const nombre = (data.nombre || '').trim();
  const aviso = data.titulo || data.mensaje || 'Tienes una nueva notificación';
  // Cuerpo = nombre y apellidos + el aviso real (en dos líneas).
  const body = nombre ? `${nombre}\n${aviso}` : aviso;

  const options = {
    body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    lang: 'es',
    // tag único por notificación → no se pisan entre sí; renotify para vibrar/alertar.
    tag: data.idNotificacion ? `noti-${data.idNotificacion}` : `noti-${Date.now()}`,
    renotify: true,
    data, // payload completo, disponible al tocar
  };

  event.waitUntil(self.registration.showNotification(titulo, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const url = construirUrl(data);

  event.waitUntil((async () => {
    const clientesVentana = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    // Reutilizar una ventana ya abierta: navegarla (así corre el guardia y cambia de cuenta) y enfocarla.
    for (const client of clientesVentana) {
      if ('navigate' in client) {
        try {
          await client.navigate(url);
          await client.focus();
          return;
        } catch (e) { /* si falla, abrimos una nueva */ }
      }
    }
    if (self.clients.openWindow) {
      await self.clients.openWindow(url);
    }
  })());
});
