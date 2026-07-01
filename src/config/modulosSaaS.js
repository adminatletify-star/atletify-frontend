// =====================================================================
// CATÁLOGO CANÓNICO DE MÓDULOS SaaS (gating por plan) — espejo del backend
// Mantener en sync con atletify-backend/Helpers/ModulosSaaS.cs
//
// CORE     -> núcleo operativo, activo en TODO plan, nunca se gatea.
// PRO      -> claves desbloqueadas desde el plan Pro.
// PREMIUM  -> claves adicionales desde el plan Premium (acumula Pro).
//
// FUENTE DE VERDAD: el backend (GET /api/entitlements/catalogo). Las listas de
// abajo son solo el FALLBACK si el fetch falla; hidratarCatalogoModulos() las
// sobrescribe en runtime con lo que sirva el backend.
// =====================================================================
import { API_BASE_URL_CONST } from '../services/api';

export const MODULOS_CORE = [
  'operacion-clases-wod',
  'onboarding-cobranza-core',
  'calendario-operativo-core',
  'nomina-staff-core',
  'ventas-pdv-core',
  'comunidad-social-core',
  'infra-spine',
];

export const MODULOS_PRO = [
  'finanzas-reportes-globales',
  'wod-plantillas',
  'wod-revelacion-programada',
  'wod-ranking-manual',
  'calendario-metricas-avanzadas',
  'simulador-barra-admin',
  'grupos-familiares',
  'nomina-reportes-avanzados',
  'ventas-avanzado',
  'kids',
  'dropin',
  'social-premium',
  'ejercicios-leaderboards-otros',
];

export const MODULOS_PREMIUM = [
  'competencias',
  'competencias-avanzado',
  'exportaciones',
];

// Metadata por clave gateable (para el menú, el paywall y el modal del dev).
export const CATALOGO_MODULOS = {
  'finanzas-reportes-globales': { nombre: 'Finanzas globales y reportería', tier: 'pro', icono: 'fa-chart-line', descripcion: 'Reportes por rangos, egresos, validación de transferencias' },
  'wod-plantillas': { nombre: 'Plantillas de WOD', tier: 'pro', icono: 'fa-layer-group', descripcion: 'Biblioteca de moldes reutilizables' },
  'wod-revelacion-programada': { nombre: 'Revelación programada del WOD', tier: 'pro', icono: 'fa-clock', descripcion: 'Revelar el WOD a hora fija o por clase' },
  'wod-ranking-manual': { nombre: 'Ranking manual (Cuarto de Guerra)', tier: 'pro', icono: 'fa-ranking-star', descripcion: 'Asignar posiciones a mano + publicar pizarra' },
  'calendario-metricas-avanzadas': { nombre: 'Métricas de asistencia', tier: 'pro', icono: 'fa-fire', descripcion: 'Heatmap, leales, fantasmas, KPIs' },
  'simulador-barra-admin': { nombre: 'Simulador de barra (admin)', tier: 'pro', icono: 'fa-dumbbell', descripcion: 'Cálculo con inventario de bumpers del box' },
  'grupos-familiares': { nombre: 'Grupos familiares', tier: 'pro', icono: 'fa-users', descripcion: 'Cobro consolidado por familia' },
  'nomina-reportes-avanzados': { nombre: 'Nómina avanzada', tier: 'pro', icono: 'fa-file-invoice-dollar', descripcion: 'Auditoría, historial, especialidades' },
  'ventas-avanzado': { nombre: 'Ventas e inventario avanzado', tier: 'pro', icono: 'fa-warehouse', descripcion: 'Reportes, apartados, almacén de herramientas' },
  'kids': { nombre: 'Atletify Kids', tier: 'pro', icono: 'fa-child', descripcion: 'Registro, clases Kids y mensualidades' },
  'dropin': { nombre: 'Drop-in público', tier: 'pro', icono: 'fa-door-open', descripcion: 'Portal de visitantes + paquetes de visitas' },
  'social-premium': { nombre: 'Social premium', tier: 'pro', icono: 'fa-heart', descripcion: 'Likes, reacciones, donaciones, reseñas de coach' },
  'ejercicios-leaderboards-otros': { nombre: 'Leaderboards globales', tier: 'pro', icono: 'fa-trophy', descripcion: 'Ranking de otros atletas + exportar resultados' },
  'competencias': { nombre: 'Competencias', tier: 'premium', icono: 'fa-medal', descripcion: 'Gestión completa de eventos' },
  'competencias-avanzado': { nombre: 'Competencias avanzado', tier: 'premium', icono: 'fa-clipboard-list', descripcion: 'Inventario, tareas de staff, podio ciego' },
  'exportaciones': { nombre: 'Exportaciones', tier: 'premium', icono: 'fa-database', descripcion: 'Exportar toda la base de datos del box' },
};

const TODAS_GATEABLES = [...MODULOS_PRO, ...MODULOS_PREMIUM];

// ── Catálogo HIDRATADO en runtime desde el backend (null = aún sin hidratar → fallback) ──
let _catalogo = null; // { core:[], pro:[], premium:[], meta:{clave:{nombre,tier,icono,descripcion}} }

const _core = () => _catalogo?.core || MODULOS_CORE;
const _pro = () => _catalogo?.pro || MODULOS_PRO;
const _premium = () => _catalogo?.premium || MODULOS_PREMIUM;

// Trae el catálogo canónico del backend y reemplaza el fallback. Best-effort:
// si falla (offline, 404), se queda con las listas hardcodeadas y nada se rompe.
export async function hidratarCatalogoModulos() {
  try {
    const res = await fetch(`${API_BASE_URL_CONST}/entitlements/catalogo`);
    if (!res.ok) return;
    const data = await res.json();
    const gateables = Array.isArray(data?.gateables) ? data.gateables : [];
    if (!gateables.length) return;
    const meta = {};
    const pro = [];
    const premium = [];
    for (const g of gateables) {
      if (!g?.clave) continue;
      meta[g.clave] = { nombre: g.nombre, tier: g.tier, icono: g.icono, descripcion: g.descripcion };
      if (g.tier === 'premium') premium.push(g.clave);
      else pro.push(g.clave);
    }
    _catalogo = {
      core: Array.isArray(data?.core) ? data.core : MODULOS_CORE,
      pro,
      premium,
      meta,
    };
  } catch {
    /* fallback: se conservan las listas hardcodeadas */
  }
}

// Refresca los módulos EFECTIVOS del box logueado desde el backend (/entitlements/me),
// los escribe en localStorage.box.modulos y dispara 'box-actualizado' para que el gating
// del front se re-evalúe SIN recargar. Best-effort: si falla, conserva el snapshot previo.
export async function refrescarEntitlements() {
  const token = localStorage.getItem('token');
  if (!token) return null;
  try {
    const res = await fetch(`${API_BASE_URL_CONST}/entitlements/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data?.modulos)) return null;

    let box = {};
    try {
      let raw = JSON.parse(localStorage.getItem('box') || '{}');
      if (typeof raw === 'string') raw = JSON.parse(raw);
      if (raw && typeof raw === 'object') box = raw;
    } catch { box = {}; }

    box.modulos = data.modulos;
    if (data.limites) box.limites = data.limites;
    if (data.estatusSaaS !== undefined && data.estatusSaaS !== null) box.estatusSaaS = data.estatusSaaS;
    localStorage.setItem('box', JSON.stringify(box));
    window.dispatchEvent(new Event('box-actualizado'));
    return data;
  } catch {
    return null;
  }
}

// Escribe en localStorage.box un objeto de box FRESCO (p. ej. de GET/PUT /api/box/{id}) mezclándolo
// con lo que ya había, pero PRESERVANDO los entitlements (modulos/limites/estatusSaaS) que vienen de
// /entitlements/me y que el endpoint /box NO devuelve. Sin esto, cualquier refresco de /box pisa los
// módulos EFECTIVOS del plan con undefined y el gating (useModulos → ModuloGate) bloquea módulos
// válidos de forma INTERMITENTE (carrera con refrescarEntitlements, que corre en paralelo). Devuelve
// el box ya mezclado para actualizar también el estado de React. Úsalo en TODO sitio que refresque el
// box del backend; para un cambio de cuenta/box completo usa setItem directo (ahí sí se reemplaza).
export function guardarBoxConEntitlements(fresh) {
  if (!fresh || typeof fresh !== 'object') return fresh;
  let actual = {};
  try {
    let raw = JSON.parse(localStorage.getItem('box') || '{}');
    if (typeof raw === 'string') raw = JSON.parse(raw);
    if (raw && typeof raw === 'object') actual = raw;
  } catch { actual = {}; }
  const merged = { ...actual, ...fresh };
  // Preservar SOLO cuando el box fresco no trae el campo (así un cambio de plan que sí lo incluya gana).
  if (actual.modulos !== undefined && fresh.modulos === undefined) merged.modulos = actual.modulos;
  if (actual.limites !== undefined && fresh.limites === undefined) merged.limites = actual.limites;
  if (actual.estatusSaaS !== undefined && fresh.estatusSaaS === undefined) merged.estatusSaaS = actual.estatusSaaS;
  localStorage.setItem('box', JSON.stringify(merged));
  return merged;
}

export const esModuloCore = (clave) => _core().includes(clave);

export const tierDeModulo = (clave) =>
  _premium().includes(clave) ? 'premium' : (_pro().includes(clave) ? 'pro' : 'core');

// Metadata de una clave (hidratada o fallback). Para paywall/menú.
export const getMetaModulo = (clave) => (_catalogo?.meta || CATALOGO_MODULOS)[clave] || null;
export const getCatalogoModulos = () => _catalogo?.meta || CATALOGO_MODULOS;

// Lee el rol y los módulos efectivos del box desde localStorage.
export function leerModulosBox() {
  try {
    const box = JSON.parse(localStorage.getItem('box') || 'null');
    return Array.isArray(box?.modulos) ? box.modulos : [];
  } catch {
    return [];
  }
}

// ¿Ya tenemos la respuesta DEFINITIVA de entitlements del box? box.modulos es un array real solo
// después de /entitlements/me; el snapshot de login NO lo trae. Sirve para que el gating del front no
// muestre el paywall ANTES de saber si el box tiene el módulo (evita el bloqueo falso intermitente).
export function modulosCargados() {
  try {
    const box = JSON.parse(localStorage.getItem('box') || 'null');
    return Array.isArray(box?.modulos);
  } catch {
    return false;
  }
}

export function leerRolUsuario() {
  try {
    const u = JSON.parse(localStorage.getItem('usuario') || 'null');
    return u?.rol || null;
  } catch {
    return null;
  }
}

export const NOMBRES_TIER = { pro: 'Pro', premium: 'Premium', core: 'Núcleo' };
export { TODAS_GATEABLES };
