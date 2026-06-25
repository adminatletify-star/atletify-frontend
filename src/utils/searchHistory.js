// ============================================================================
//  HISTORIAL DE BÚSQUEDA — Command Palette
// ============================================================================
//  Guarda en localStorage (por usuario) las interfaces que el staff abrió desde
//  el buscador, para mostrarlas como "Recientes" al abrir el palette. Es lo que
//  el usuario buscó/visitó en el pasado, listo para volver con un clic.
// ============================================================================

const MAX_RECIENTES = 8;
const PREFIJO = 'atletify:cmdpalette:recientes:';

const claveDe = (userId) => `${PREFIJO}${userId || 'anon'}`;

/**
 * Lee el historial de un usuario. Devuelve [] ante cualquier error.
 * @param {string|number} userId
 * @returns {Array<{ id, title, path, section, icon, query, ts }>}
 */
export function getRecientes(userId) {
  try {
    const raw = localStorage.getItem(claveDe(userId));
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

/**
 * Registra una interfaz abierta desde el buscador. Mueve al frente, deduplica
 * por id y recorta a MAX_RECIENTES. `query` es el texto que se había escrito.
 * @returns {Array} el nuevo historial (para refrescar estado sin releer)
 */
export function pushReciente(userId, item, query = '') {
  if (!item?.id) return getRecientes(userId);
  const entrada = {
    id: item.id,
    title: item.title,
    path: item.path,
    section: item.section || '',
    icon: item.icon || 'fa-clock-rotate-left',
    query: String(query || '').trim(),
    ts: Date.now(),
  };
  try {
    const actual = getRecientes(userId).filter((r) => r.id !== item.id);
    const siguiente = [entrada, ...actual].slice(0, MAX_RECIENTES);
    localStorage.setItem(claveDe(userId), JSON.stringify(siguiente));
    return siguiente;
  } catch {
    return getRecientes(userId);
  }
}

/** Borra todo el historial del usuario. */
export function clearRecientes(userId) {
  try {
    localStorage.removeItem(claveDe(userId));
  } catch {
    /* noop */
  }
  return [];
}
