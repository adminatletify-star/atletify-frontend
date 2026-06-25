// ============================================================================
//  BÚSQUEDA DIFUSA — utilidades para el Command Palette
// ============================================================================
//  Tolera errores de escritura (Fuse.js) Y acentos (normalización NFD).
//  Caso obligatorio: "calendaro de wops" => "Calendario de WODs".
// ============================================================================

import Fuse from 'fuse.js';

/**
 * Normaliza un texto para búsqueda: minúsculas + sin acentos/diacríticos.
 * Usa NFD para descomponer cada carácter acentuado en (base + diacrítico) y
 * elimina los diacríticos (rango ̀-ͯ). Importante: la cadena resultante
 * conserva la MISMA longitud e índices que el original (cada "ó" -> "o" en la
 * misma posición), por lo que los índices de coincidencia de Fuse se pueden
 * mapear de vuelta al título original para resaltar. Así "wóds" = "wods" y
 * "calendário" = "calendario".
 */
export const normalizar = (str = '') =>
  String(str)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

/**
 * Config de Fuse afinada con los casos de prueba.
 * - threshold 0.38: tolerante a typos sin volverse ruidoso.
 * - ignoreLocation: matchea en cualquier parte del texto, no solo al inicio.
 * - includeScore/Matches: para ordenar por relevancia y resaltar coincidencias.
 * - keys con pesos: el título manda; las keywords ayudan; la descripción es soporte.
 */
export const FUSE_OPTIONS = {
  includeScore: true,
  includeMatches: true,
  ignoreLocation: true,
  threshold: 0.38,
  minMatchCharLength: 2,
  keys: [
    { name: 'titleNorm', weight: 0.6 },
    { name: 'keywordsNorm', weight: 0.3 },
    { name: 'descriptionNorm', weight: 0.1 },
  ],
};

/**
 * Construye el índice Fuse a partir del catálogo de interfaces.
 * Pre-normaliza cada campo buscable una sola vez (no por tecla).
 * @param {Array} interfaces - entradas del catálogo { id, title, keywords, description, ... }
 * @returns {Fuse}
 */
export function construirIndice(interfaces = []) {
  const dataset = interfaces.map((it) => ({
    ...it,
    titleNorm: normalizar(it.title),
    keywordsNorm: (it.keywords || []).map(normalizar).join(' '),
    descriptionNorm: normalizar(it.description || ''),
  }));
  return new Fuse(dataset, FUSE_OPTIONS);
}

/**
 * Ejecuta la búsqueda difusa con la query normalizada.
 * @param {Fuse} fuse - índice creado con construirIndice
 * @param {string} query - texto crudo del input
 * @returns {Array} resultados de Fuse: { item, score, matches }
 */
export function buscar(fuse, query) {
  const q = normalizar(query).trim();
  if (!fuse || q.length < 2) return [];
  return fuse.search(q);
}

/**
 * A partir de los `matches` de Fuse para un resultado, devuelve los rangos
 * [start, end] (inclusivos) que coincidieron EN EL TÍTULO (key 'titleNorm').
 * Como titleNorm conserva los índices del título original, se pueden usar
 * directamente para resaltar sobre `title`.
 * @param {object} resultado - un elemento de los resultados de Fuse
 * @returns {Array<[number, number]>}
 */
export function rangosCoincidenciaTitulo(resultado) {
  if (!resultado?.matches) return [];
  const m = resultado.matches.find((x) => x.key === 'titleNorm');
  if (!m || !Array.isArray(m.indices)) return [];
  // Fuse entrega múltiples rangos; los ordenamos por inicio.
  return [...m.indices].sort((a, b) => a[0] - b[0]);
}

/**
 * Divide un texto en segmentos { text, match } según rangos de coincidencia.
 * Pensado para renderizar con <mark> sin usar dangerouslySetInnerHTML.
 * @param {string} texto - el título original a resaltar
 * @param {Array<[number, number]>} rangos - rangos [start, end] inclusivos
 * @returns {Array<{ text: string, match: boolean }>}
 */
export function segmentarResaltado(texto = '', rangos = []) {
  if (!rangos.length) return [{ text: texto, match: false }];

  const segmentos = [];
  let cursor = 0;

  for (const [start, end] of rangos) {
    // Ignora rangos fuera de límites o ya consumidos.
    if (end < cursor || start >= texto.length) continue;
    const s = Math.max(start, cursor);
    if (s > cursor) {
      segmentos.push({ text: texto.slice(cursor, s), match: false });
    }
    const e = Math.min(end + 1, texto.length); // end es inclusivo
    segmentos.push({ text: texto.slice(s, e), match: true });
    cursor = e;
  }

  if (cursor < texto.length) {
    segmentos.push({ text: texto.slice(cursor), match: false });
  }
  return segmentos;
}
