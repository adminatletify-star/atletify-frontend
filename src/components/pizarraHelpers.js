// Helpers compartidos entre AdminPizarra y PizarraTop10Card

// Agrupa atletas que comparten la misma posición (empates) en un solo grupo.
// Retorna [{ posicion, atletas: [], textoDisplay, esRx }] ordenado asc por posicion.
export function agruparPorPosicion(atletas) {
  const map = new Map();
  atletas.forEach(a => {
    if (!map.has(a.posicion)) map.set(a.posicion, []);
    map.get(a.posicion).push(a);
  });
  return Array.from(map.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([posicion, ats]) => ({
      posicion,
      atletas: ats,
      textoDisplay: ats[0].textoDisplay,
      esRx: ats[0].esRx,
    }));
}
