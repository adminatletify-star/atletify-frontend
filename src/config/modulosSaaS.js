// =====================================================================
// CATÁLOGO CANÓNICO DE MÓDULOS SaaS (gating por plan) — espejo del backend
// Mantener en sync con atletify-backend/Helpers/ModulosSaaS.cs
//
// CORE     -> núcleo operativo, activo en TODO plan, nunca se gatea.
// PRO      -> claves desbloqueadas desde el plan Pro.
// PREMIUM  -> claves adicionales desde el plan Premium (acumula Pro).
// =====================================================================

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

export const esModuloCore = (clave) => MODULOS_CORE.includes(clave);

export const tierDeModulo = (clave) =>
  MODULOS_PREMIUM.includes(clave) ? 'premium' : (MODULOS_PRO.includes(clave) ? 'pro' : 'core');

// Lee el rol y los módulos efectivos del box desde localStorage.
export function leerModulosBox() {
  try {
    const box = JSON.parse(localStorage.getItem('box') || 'null');
    return Array.isArray(box?.modulos) ? box.modulos : [];
  } catch {
    return [];
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
