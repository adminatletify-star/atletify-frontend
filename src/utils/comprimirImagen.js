// Comprime / redimensiona imágenes ANTES de guardarlas como base64.
//
// Contexto (por qué existe esto): el logo del box y la foto del usuario se
// guardaban como base64 SIN comprimir. Un logo de 7.3 MB hacía que
// `GET /api/box` devolviera ~7.5 MB y tardara 35–60 s; cada query retenía una
// conexión casi un minuto y agotaba el pool (máx. 10) → 500 intermitentes en el
// Dashboard. Tras comprimir, un logo/foto pesa ~30–80 KB.
//
// Regla: nunca guardar imágenes de varios MB en columnas de la BD.

const cargarImagen = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener('load', () => resolve(img));
    img.addEventListener('error', reject);
    img.setAttribute('crossOrigin', 'anonymous');
    img.src = src;
  });

/**
 * Redimensiona una imagen a un máximo de `maxLado` px (manteniendo proporción,
 * solo reduce, nunca agranda) y la re-encodea para comprimirla.
 *
 * Solo actúa sobre dataURLs de imagen (`data:image/...`); URLs remotas o valores
 * vacíos se devuelven tal cual. `tipo: 'image/webp'` conserva transparencia (ideal
 * para logos); si el navegador no soporta WebP en canvas, `toDataURL` cae a PNG.
 *
 * @param {string} src - dataURL de la imagen original
 * @param {{maxLado?: number, calidad?: number, tipo?: string}} [opts]
 * @returns {Promise<string>} dataURL comprimido (o el original si no aplica)
 */
export async function comprimirImagen(src, { maxLado = 512, calidad = 0.85, tipo = 'image/webp' } = {}) {
  if (!src || typeof src !== 'string' || !src.startsWith('data:image')) return src;

  const img = await cargarImagen(src);
  const { width, height } = img;
  if (!width || !height) return src;

  const escala = Math.min(1, maxLado / Math.max(width, height));
  const w = Math.round(width * escala);
  const h = Math.round(height * escala);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return src;
  ctx.drawImage(img, 0, 0, w, h);

  const out = canvas.toDataURL(tipo, calidad);
  return out && out.startsWith('data:image') ? out : src;
}

/**
 * Lee un File de un `<input type="file">` y devuelve un dataURL ya comprimido.
 * Si la compresión falla por cualquier motivo, devuelve la imagen original
 * (nunca rompe la subida).
 *
 * @param {File} file
 * @param {{maxLado?: number, calidad?: number, tipo?: string}} [opts]
 * @returns {Promise<string>}
 */
export async function comprimirArchivoImagen(file, opts) {
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result || '');
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  try {
    return await comprimirImagen(dataUrl, opts);
  } catch {
    return dataUrl;
  }
}
