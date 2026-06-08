// Tarifa de Stripe (MX) — DEBE coincidir EXACTO con el backend (atletify-backend/Services/ComisionStripe.cs).
// ⚠️ Constantes deducidas en modo TEST; confirmar/recalibrar contra la tarifa real de PRODUCCIÓN.
export const STRIPE_P = 0.041;   // 4.1%
export const STRIPE_C = 3;       // $3 MXN fijos por cargo
export const STRIPE_IVA = 0.16;  // 16% IVA sobre la comisión

// Comisión estimada de Stripe sobre un monto bruto (lo que se cobra). Solo informativa / UI.
export function comisionEstStripe(bruto) {
  const b = Number(bruto) || 0;
  if (b <= 0) return 0;
  return Math.round((STRIPE_P * b + STRIPE_C) * (1 + STRIPE_IVA) * 100) / 100;
}

// Neto que recibe el box si se cobra `bruto` (bruto − comisión estimada).
export function netoEstStripe(bruto) {
  const b = Number(bruto) || 0;
  if (b <= 0) return 0;
  return Math.round((b - comisionEstStripe(b)) * 100) / 100;
}

// Gross-up: cuánto cobrar para que el box reciba `baseNeto` después de la comisión.
//   g = ceil_al_centavo( (B + c*(1+iva)) / (1 - p*(1+iva)) )
// El ceil garantiza que el box reciba >= baseNeto.
export function grossUpStripe(baseNeto) {
  const B = Number(baseNeto) || 0;
  if (B <= 0) return 0;
  const f = 1 + STRIPE_IVA;
  const g = (B + STRIPE_C * f) / (1 - STRIPE_P * f);
  return Math.ceil(g * 100) / 100;
}
