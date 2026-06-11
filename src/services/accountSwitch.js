import { jwtDecode } from 'jwt-decode';

/**
 * Verifica si un JWT sigue siendo válido (no expirado).
 */
function isTokenValid(token) {
  if (!token) return false;
  try {
    const decoded = jwtDecode(token);
    return decoded.exp > Date.now() / 1000;
  } catch {
    return false;
  }
}

const norm = (s) => String(s || '').toLowerCase().trim();

/**
 * Busca una cuenta guardada cuyo correo coincida con `expectedCorreo`.
 * Devuelve la entrada de `cuentasGuardadas` o null si no existe / token vencido.
 */
export function findSavedAccountByEmail(expectedCorreo) {
  const target = norm(expectedCorreo);
  if (!target) return null;

  let cuentas = [];
  try {
    cuentas = JSON.parse(localStorage.getItem('cuentasGuardadas') || '[]');
  } catch {
    return null;
  }

  const match = cuentas.find(c => norm(c?.usuario?.correo) === target);
  if (!match || !isTokenValid(match.token)) return null;
  return match;
}

/**
 * Si existe una cuenta guardada para `expectedCorreo`, escribe su sesión
 * en localStorage (sin tocar React) y devuelve true. Para que el cambio
 * surta efecto, el llamador debe hacer `window.location.reload()` o
 * navegar a la URL deseada.
 */
export function switchToAccountByEmail(expectedCorreo) {
  const match = findSavedAccountByEmail(expectedCorreo);
  if (!match) return false;

  try {
    localStorage.setItem('usuario', JSON.stringify(match.usuario));
    if (match.token) localStorage.setItem('token', match.token);
    else localStorage.removeItem('token');

    if (match.boxActivo) localStorage.setItem('boxActivo', JSON.stringify(match.boxActivo));
    else localStorage.removeItem('boxActivo');

    if (match.boxData) {
      let data = match.boxData;
      if (typeof data === 'string') {
        try { data = JSON.parse(data); } catch { /* dejar como string */ }
      }
      localStorage.setItem('box', JSON.stringify(data));
    } else {
      localStorage.removeItem('box');
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Sesión deslizante: cuando el backend renueva el JWT (header "X-Nuevo-Token"),
 * además de actualizar `token` en localStorage hay que reflejarlo en la entrada
 * de la cuenta activa dentro de `cuentasGuardadas`, para que al cambiar de cuenta
 * y volver no se cargue un token viejo a punto de vencer.
 * No falla si no hay cuentas guardadas o si el JSON está corrupto.
 */
export function syncTokenToSavedAccount(nuevoToken) {
  if (!nuevoToken) return;
  const activo = getActiveCorreo();
  if (!activo) return;

  try {
    const cuentas = JSON.parse(localStorage.getItem('cuentasGuardadas') || '[]');
    if (!Array.isArray(cuentas) || cuentas.length === 0) return;

    let cambiado = false;
    for (const c of cuentas) {
      if (norm(c?.usuario?.correo) === activo && c.token !== nuevoToken) {
        c.token = nuevoToken;
        cambiado = true;
      }
    }
    if (cambiado) localStorage.setItem('cuentasGuardadas', JSON.stringify(cuentas));
  } catch {
    /* cuentasGuardadas corrupto: ignorar */
  }
}

/**
 * Correo del usuario activo en localStorage (normalizado).
 */
export function getActiveCorreo() {
  try {
    const u = JSON.parse(localStorage.getItem('usuario') || 'null');
    return norm(u?.correo);
  } catch {
    return '';
  }
}
