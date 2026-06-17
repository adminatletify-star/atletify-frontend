// ============================================================================
// Nivel de clase (jerárquico) — fuente única de verdad para front
// ============================================================================
// Una clase puede permitir uno o varios niveles (CSV: "Principiante, Intermedio").
// El PISO es el nivel MÁS BAJO de la lista: un atleta puede reservar si su nivel
// es >= ese piso (Novato < Principiante < Intermedio < RX).
//   nivelObligatorio = true  → se BLOQUEA a los de menor nivel.
//   nivelObligatorio = false → solo SUGERIDO: se permite con una advertencia clara.
//   "Todos" / vacío          → sin restricción.
//
// Esta lógica DEBE coincidir con el backend (AsistenciasController.ReservarClase y
// PublicDropInController). Mantener ambos lados sincronizados.

export const JERARQUIA_NIVEL = { novato: 1, principiante: 2, intermedio: 3, rx: 4, avanzado: 4 };

// Piso jerárquico = nivel más bajo permitido. 0 = sin restricción ("Todos"/vacío).
export function pisoNivelClase(nivelesPermitidos) {
  if (!nivelesPermitidos || String(nivelesPermitidos).trim().toLowerCase() === 'todos') return 0;
  let piso = Infinity;
  String(nivelesPermitidos).split(',').forEach((tok) => {
    const v = JERARQUIA_NIVEL[tok.trim().toLowerCase()];
    if (v) piso = Math.min(piso, v);
  });
  return piso === Infinity ? 0 : piso;
}

// Rank de la categoría del atleta (default 1 = Novato).
export function rankNivel(categoria) {
  return JERARQUIA_NIVEL[String(categoria || '').trim().toLowerCase()] || 1;
}

// Evalúa el acceso de un atleta a una clase.
//  { cumple, bloqueado, advertencia, piso }
//   - cumple:      llega al piso (o la clase no restringe).
//   - bloqueado:   NO cumple y la clase es Obligatoria → no puede reservar.
//   - advertencia: NO cumple pero la clase es solo Sugerida → puede reservar con aviso.
export function evaluarNivelClase(categoria, nivelesPermitidos, nivelObligatorio) {
  const piso = pisoNivelClase(nivelesPermitidos);
  if (piso === 0) return { cumple: true, bloqueado: false, advertencia: false, piso };
  const cumple = rankNivel(categoria) >= piso;
  if (cumple) return { cumple: true, bloqueado: false, advertencia: false, piso };
  return { cumple: false, bloqueado: !!nivelObligatorio, advertencia: !nivelObligatorio, piso };
}
