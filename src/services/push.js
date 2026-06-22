// ============================================================
//  Web Push (notificaciones nativas de la PWA)
//
//  Multi-cuenta: un dispositivo tiene UNA suscripción de push (un endpoint),
//  pero puede tener varias cuentas guardadas. Por eso, al activar las
//  notificaciones registramos ese MISMO endpoint para TODAS las cuentas del
//  aparato (cada una con su propio token). Así, cuando le llega un aviso a
//  cualquiera de ellas, el push llega etiquetado con su correo + rol + nombre.
//
//  Nota: el interceptor global de fetch (App.jsx) sobreescribe el header
//  Authorization con el token ACTIVO. Para poder suscribir cada cuenta con SU
//  token usamos XMLHttpRequest (que NO pasa por ese interceptor).
// ============================================================
import { jwtDecode } from 'jwt-decode';
import { API_BASE_URL_CONST } from './api';

const PUSH_BASE = `${API_BASE_URL_CONST}/push`;

let clavePublicaCache = null;

// ---- utilidades ----

export function pushSoportado() {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

function tokenValido(token) {
  if (!token) return false;
  try {
    return jwtDecode(token).exp > Date.now() / 1000;
  } catch {
    return false;
  }
}

// Convierte la clave pública VAPID (base64url) a Uint8Array para pushManager.subscribe.
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

// POST autenticado con un token específico (sin pasar por el interceptor de fetch).
function xhrPost(url, token, body, timeoutMs = 8000) {
  return new Promise((resolve) => {
    try {
      const xhr = new XMLHttpRequest();
      xhr.timeout = timeoutMs; // que no se cuelgue si la red no responde
      xhr.open('POST', url, true);
      xhr.setRequestHeader('Content-Type', 'application/json');
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.onload = () => resolve(xhr.status >= 200 && xhr.status < 300);
      xhr.onerror = () => resolve(false);
      xhr.ontimeout = () => resolve(false);
      xhr.send(JSON.stringify(body || {}));
    } catch {
      resolve(false);
    }
  });
}

async function obtenerClavePublica() {
  if (clavePublicaCache) return clavePublicaCache;
  try {
    const res = await fetch(`${PUSH_BASE}/public-key`);
    if (!res.ok) return null;
    const data = await res.json();
    clavePublicaCache = data?.publicKey || null;
    return clavePublicaCache;
  } catch {
    return null;
  }
}

// Tokens únicos y vigentes de TODAS las cuentas del dispositivo (+ la activa).
function recolectarTokens() {
  const tokens = new Map();
  try {
    const cuentas = JSON.parse(localStorage.getItem('cuentasGuardadas') || '[]');
    if (Array.isArray(cuentas)) {
      for (const c of cuentas) {
        if (c?.token && tokenValido(c.token)) tokens.set(c.token, true);
      }
    }
  } catch { /* corrupto: ignorar */ }
  const activo = localStorage.getItem('token');
  if (activo && tokenValido(activo)) tokens.set(activo, true);
  return [...tokens.keys()];
}

function suscripcionAPayload(sub) {
  const json = sub.toJSON();
  return {
    endpoint: json.endpoint,
    p256dh: json.keys?.p256dh,
    auth: json.keys?.auth,
    userAgent: (navigator.userAgent || '').slice(0, 400),
  };
}

// Registra el endpoint para todas las cuentas del aparato (best-effort).
async function registrarTodasLasCuentas(sub) {
  const payload = suscripcionAPayload(sub);
  if (!payload.endpoint || !payload.p256dh || !payload.auth) return;
  const tokens = recolectarTokens();
  await Promise.allSettled(tokens.map((t) => xhrPost(`${PUSH_BASE}/suscribir`, t, payload)));
}

// ---- API pública del módulo ----

// Estado para la UI del botón: 'no-soportado' | 'bloqueado' | 'activado' | 'desactivado'.
export function estadoPush() {
  if (!pushSoportado()) return 'no-soportado';
  const permiso = Notification.permission;
  if (permiso === 'denied') return 'bloqueado';
  if (permiso === 'granted') return 'activado';
  return 'desactivado';
}

// Activa las notificaciones: pide permiso, se suscribe y registra todas las cuentas.
// Devuelve { ok, motivo }. Debe llamarse desde un gesto del usuario (un tap).
export async function activarPush() {
  if (!pushSoportado()) return { ok: false, motivo: 'no-soportado' };

  let permiso;
  try {
    permiso = await Notification.requestPermission();
  } catch {
    return { ok: false, motivo: 'error' };
  }
  if (permiso !== 'granted') {
    return { ok: false, motivo: permiso === 'denied' ? 'bloqueado' : 'cancelado' };
  }

  let reg;
  try {
    reg = await navigator.serviceWorker.ready;
  } catch {
    return { ok: false, motivo: 'sin-sw' };
  }
  if (!reg || !reg.pushManager) return { ok: false, motivo: 'sin-sw' };

  let sub;
  try {
    sub = await reg.pushManager.getSubscription();
    if (!sub) {
      const clave = await obtenerClavePublica();
      if (!clave) return { ok: false, motivo: 'sin-clave' };
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(clave),
      });
    }
  } catch {
    return { ok: false, motivo: 'error-suscripcion' };
  }

  await registrarTodasLasCuentas(sub);
  return { ok: true };
}

// Best-effort: si el push ya está activo, registra/actualiza el endpoint para
// todas las cuentas. Se llama al iniciar sesión, cambiar de cuenta o al arrancar.
export async function sincronizarSuscripcionesPush() {
  try {
    if (!pushSoportado() || Notification.permission !== 'granted') return;
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg || !reg.pushManager) return;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return;
    await registrarTodasLasCuentas(sub);
  } catch {
    /* silencioso */
  }
}

// Quita el enlace (cuenta, dispositivo) para que esa cuenta deje de recibir push aquí.
// NO cancela la suscripción del navegador (otras cuentas del aparato la siguen usando).
export async function desuscribirCuenta(token) {
  try {
    if (!pushSoportado() || !token) return;
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg || !reg.pushManager) return;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return;
    await xhrPost(`${PUSH_BASE}/desuscribir`, token, { endpoint: sub.endpoint });
  } catch {
    /* silencioso */
  }
}
