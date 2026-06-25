// ============================================================================
//  CATÁLOGO DE INTERFACES BUSCABLES — Command Palette (Buscador global)
// ============================================================================
//  Fuente de la verdad del buscador tipo "Spotlight / Cmd+K" del panel de
//  administración (roles AdminBox, Coach y Developer).
//
//  ⚠️  AL AGREGAR UNA PANTALLA NUEVA AL PANEL: añade su entrada aquí.
//      El routing de la app vive como JSX suelto en App.jsx (no hay un objeto
//      de rutas central del que derivar), por eso este catálogo es manual.
//      Mantenerlo al día es lo único que hace falta para que el buscador la
//      encuentre automáticamente.
//
//  Cada entrada:
//    id          → identificador único y estable
//    title       → encabezado legible tal como lo conoce el usuario
//    path        → ruta de React Router para navegar
//    section     → grupo para mostrar/agrupar (Operaciones | Administración | Ajustes)
//    icon        → clase FontAwesome (fas) — opcional, decorativa
//    description → frase corta: qué se hace en la pantalla (peso bajo en la búsqueda)
//    keywords    → sinónimos del dominio para encontrarla aunque no se escriba el título
//    roles       → roles que pueden ver/abrir la interfaz (debe coincidir con allowedRoles
//                  de App.jsx). El buscador filtra el catálogo por el rol del usuario.
// ============================================================================

const A = 'AdminBox';
const C = 'Coach';
const D = 'Developer';

export const ADMIN_BOX_INTERFACES = [
  // ───────────────────────── OPERACIONES ─────────────────────────
  {
    id: 'pase-de-lista',
    title: 'Pase de Lista',
    path: '/pase-de-lista',
    section: 'Operaciones',
    icon: 'fa-clipboard-check',
    description: 'Registra asistencia y califica los scores de los atletas en clase.',
    keywords: ['pase de lista', 'asistencia', 'jueceo', 'modo juez', 'scores', 'calificar', 'evaluar atletas', 'lista'],
    roles: [A, C, D],
  },
  {
    id: 'calendario-wods',
    title: 'Calendario de WODs',
    path: '/calendario-wods',
    section: 'Operaciones',
    icon: 'fa-calendar-week',
    description: 'Consulta y gestiona los WODs programados de la semana.',
    keywords: ['wods', 'entrenamientos', 'rutinas', 'programacion', 'wod del dia', 'vista semanal', 'calendario', 'workout'],
    roles: [A, C, D],
  },
  {
    id: 'creador-wods',
    title: 'Armar WOD',
    path: '/creador-wods',
    section: 'Operaciones',
    icon: 'fa-pen-ruler',
    description: 'Crea y configura WODs con bloques de ejercicios y plantilla de jueceo.',
    keywords: ['crear wod', 'editor de wods', 'armar entrenamiento', 'bloques', 'ejercicios', 'nuevo wod', 'programar wod'],
    roles: [A, C, D],
  },
  {
    id: 'wods-guardados',
    title: 'WODs Guardados',
    path: '/wods-guardados',
    section: 'Operaciones',
    icon: 'fa-bookmark',
    description: 'Consulta y reutiliza plantillas de WODs guardadas.',
    keywords: ['plantillas', 'wods guardados', 'moldes', 'favoritos', 'reutilizar wod', 'biblioteca de wods'],
    roles: [A, C, D],
  },
  {
    id: 'directorio-atletas',
    title: 'Directorio de Atletas',
    path: '/directorio',
    section: 'Operaciones',
    icon: 'fa-address-book',
    description: 'Consulta el expediente y los datos de cada atleta con filtros avanzados.',
    keywords: ['directorio', 'atletas', 'expediente', 'ficha', 'datos del atleta', 'buscar atleta', 'miembros'],
    roles: [A, C, D],
  },
  {
    id: 'registro-manual',
    title: 'Alta Manual de Atleta',
    path: '/registro-manual',
    section: 'Operaciones',
    icon: 'fa-user-plus',
    description: 'Registra un atleta directamente sin aprobación previa.',
    keywords: ['registro', 'alta', 'inscripcion manual', 'nuevo atleta', 'dar de alta', 'agregar atleta'],
    roles: [A, C, D],
  },
  {
    id: 'admin-calendario',
    title: 'Calendario del Box',
    path: '/admin-calendario',
    section: 'Operaciones',
    icon: 'fa-calendar-days',
    description: 'Gestiona el calendario mensual, eventos, clases, asistencias y métricas.',
    keywords: ['calendario', 'centro de control', 'eventos', 'clases', 'asistencias', 'metricas', 'agenda', 'rachas'],
    roles: [A, C, D],
  },
  {
    id: 'gestion-clases',
    title: 'Gestión de Clases',
    path: '/gestion-clases',
    section: 'Operaciones',
    icon: 'fa-dumbbell',
    description: 'Crea y edita clases recurrentes, asigna coaches, niveles y sustituciones.',
    keywords: ['clases', 'horarios', 'coaches', 'niveles', 'sustituciones', 'recurrentes', 'crear clase'],
    roles: [A, C, D],
  },
  {
    id: 'sugerencias-atletas',
    title: 'Sugerencias a Atletas',
    path: '/sugerencias-atletas',
    section: 'Operaciones',
    icon: 'fa-comment-dots',
    description: 'Envía sugerencias de mejora a los atletas con seguimiento de respuestas.',
    keywords: ['sugerencias', 'coaching', 'feedback', 'mensajes a atletas', 'recomendaciones', 'consejos'],
    roles: [A, C, D],
  },

  // ──────────────────────── ADMINISTRACIÓN ───────────────────────
  {
    id: 'gestion-solicitudes',
    title: 'Solicitudes de Ingreso',
    path: '/gestion-solicitudes',
    section: 'Administración',
    icon: 'fa-user-check',
    description: 'Revisa, aprueba o rechaza solicitudes de nuevos atletas.',
    keywords: ['solicitudes', 'ingreso', 'altas', 'preregistros', 'aprobar', 'rechazar', 'inscripciones'],
    roles: [A, C, D],
  },
  {
    id: 'atletas-box',
    title: 'Atletas del Box',
    path: '/atletas-box',
    section: 'Administración',
    icon: 'fa-users',
    description: 'Lista, busca, filtra y gestiona a todos los atletas, coaches y staff.',
    keywords: ['atletas', 'miembros', 'listado', 'coaches', 'staff', 'personal', 'expulsar', 'gestionar usuarios'],
    roles: [A, C, D],
  },
  {
    id: 'gestion-ventas-productos',
    title: 'Gestión y Ventas',
    path: '/gestion-ventas-productos',
    section: 'Administración',
    icon: 'fa-store',
    description: 'Accede a punto de venta, inventario, historial y cajas múltiples.',
    keywords: ['tienda', 'ventas', 'caja', 'productos', 'punto de venta', 'gestion de ventas', 'cajas'],
    roles: [A, D],
  },
  {
    id: 'punto-de-venta',
    title: 'Punto de Venta',
    path: '/punto-de-venta',
    section: 'Administración',
    icon: 'fa-cash-register',
    description: 'Registra ventas en tiempo real y cobra con múltiples métodos de pago.',
    keywords: ['caja', 'venta', 'cobro', 'carrito', 'pos', 'tienda', 'vender', 'cobrar'],
    roles: [A, C, D],
  },
  {
    id: 'gestion-inventario',
    title: 'Gestión de Inventario',
    path: '/gestion-inventario',
    section: 'Administración',
    icon: 'fa-boxes-stacked',
    description: 'Crea, edita y administra productos, stock, tallas y precios.',
    keywords: ['inventario', 'productos', 'stock', 'existencias', 'tallas', 'precios', 'catalogo'],
    roles: [A, D],
  },
  {
    id: 'almacen-panel',
    title: 'Inventario de Equipamiento',
    path: '/almacen-panel',
    section: 'Administración',
    icon: 'fa-warehouse',
    description: 'Administra el equipamiento del box (pesas, barras, máquinas).',
    keywords: ['equipo', 'equipamiento', 'almacen', 'pesas', 'barras', 'maquinas', 'herramientas'],
    roles: [A, D],
  },
  {
    id: 'historial-ventas',
    title: 'Historial y Pedidos',
    path: '/historial-ventas',
    section: 'Administración',
    icon: 'fa-receipt',
    description: 'Consulta el historial de ventas, reportes financieros y pedidos.',
    keywords: ['historial', 'ventas', 'pedidos', 'reportes', 'analisis', 'tickets', 'compras'],
    roles: [A, D],
  },
  {
    id: 'gestion-fiado',
    title: 'Gestión de Fiado',
    path: '/gestion-fiado',
    section: 'Administración',
    icon: 'fa-hand-holding-dollar',
    description: 'Administra deudores, abonos y comprobantes de pagos en fiado.',
    keywords: ['fiados', 'deudores', 'abonos', 'cuentas pendientes', 'credito', 'pagos diferidos', 'deudas'],
    roles: [A, D],
  },
  {
    id: 'gestion-finanzas',
    title: 'Gestión de Mensualidades',
    path: '/gestion-finanzas',
    section: 'Administración',
    icon: 'fa-money-bill-wave',
    description: 'Gestiona el semáforo de mensualidades, renovaciones, drop-ins y cobros.',
    keywords: ['mensualidades', 'semaforo', 'renovaciones', 'drop-ins', 'visitas', 'cobro', 'pagos', 'finanzas'],
    roles: [A, D],
  },
  {
    id: 'finanzas-globales',
    title: 'Finanzas Globales',
    path: '/finanzas-globales',
    section: 'Administración',
    icon: 'fa-chart-line',
    description: 'Revisa ingresos y egresos por periodo, registra gastos y exporta reportes.',
    keywords: ['finanzas', 'ingresos', 'egresos', 'balance', 'reportes', 'gastos', 'utilidad', 'contabilidad'],
    roles: [A, D],
  },
  {
    id: 'gestion-anuncios',
    title: 'Campañas y Anuncios',
    path: '/gestion-anuncios',
    section: 'Administración',
    icon: 'fa-bullhorn',
    description: 'Crea campañas de recaudación, anuncios y donativos en línea.',
    keywords: ['campañas', 'anuncios', 'donativos', 'recaudacion', 'metas', 'donadores', 'avisos'],
    roles: [A, D],
  },
  {
    id: 'admin-competencias',
    title: 'Gestión de Competencias',
    path: '/admin-competencias',
    section: 'Administración',
    icon: 'fa-trophy',
    description: 'Crea competencias, categorías, inscripciones, pagos y estadísticas.',
    keywords: ['competencias', 'eventos', 'categorias', 'inscripciones', 'roster', 'torneos', 'cobranza'],
    roles: [A, D],
  },
  {
    id: 'admin-competencias-historial',
    title: 'Historial de Competencias',
    path: '/admin-competencias/historial',
    section: 'Administración',
    icon: 'fa-clock-rotate-left',
    description: 'Revisa competencias archivadas o finalizadas y sus datos históricos.',
    keywords: ['historial', 'competencias finalizadas', 'archivadas', 'eventos pasados', 'torneos pasados'],
    roles: [A, D],
  },
  {
    id: 'wolf-beneficios',
    title: 'Estrategia de Membresías',
    path: '/wolf-beneficios',
    section: 'Administración',
    icon: 'fa-tags',
    description: 'Configura planes y estrategias de precios para las membresías del box.',
    keywords: ['membresias', 'planes', 'precios', 'paquetes', 'beneficios', 'suscripciones', 'estrategia'],
    roles: [A, D],
  },
  {
    id: 'admin-roster',
    title: 'Bandeja de Pagos y Roster',
    path: '/admin-roster',
    section: 'Administración',
    icon: 'fa-list-check',
    description: 'Aprueba pagos por transferencia y gestiona el roster de competencias.',
    keywords: ['roster', 'pagos', 'transferencias', 'competencias', 'equipos', 'aprobar pagos', 'bandeja'],
    roles: [A, D],
  },
  {
    id: 'validaciones',
    title: 'Bandeja de Validaciones',
    path: '/admin-box/validaciones',
    section: 'Administración',
    icon: 'fa-file-circle-check',
    description: 'Valida comprobantes de transferencia de atletas y procesa aprobaciones.',
    keywords: ['validaciones', 'transferencias', 'comprobantes', 'aprobar', 'rechazar', 'pagos', 'bandeja'],
    roles: [A, D],
  },
  {
    id: 'grupos-familiares',
    title: 'Escuadrones Familiares',
    path: '/admin-box/grupos-familiares',
    section: 'Administración',
    icon: 'fa-people-roof',
    description: 'Crea grupos familiares con descuentos progresivos y cobro centralizado.',
    keywords: ['grupos', 'familia', 'escuadrones', 'descuentos', 'familiar', 'squad', 'cobro centralizado'],
    roles: [A, C, D],
  },
  {
    id: 'admin-preregistros',
    title: 'Centro de Pre-registros',
    path: '/admin-preregistros',
    section: 'Administración',
    icon: 'fa-id-card-clip',
    description: 'Registra usuarios, carga masiva, auditoría y exportación de datos.',
    keywords: ['preregistros', 'usuarios', 'invitaciones', 'carga masiva', 'excel', 'auditoria', 'registros'],
    roles: [A, D],
  },

  // ─────────────────────────── AJUSTES ───────────────────────────
  {
    id: 'admin-box-panel',
    title: 'Panel de Administración',
    path: '/admin-box-panel',
    section: 'Ajustes',
    icon: 'fa-gauge-high',
    description: 'Dashboard principal del administrador con notificaciones y accesos rápidos.',
    keywords: ['panel', 'dashboard', 'inicio', 'resumen', 'notificaciones', 'principal', 'home'],
    roles: [A, C, D],
  },
  {
    id: 'gestion-staff',
    title: 'Control de Staff',
    path: '/gestion-staff',
    section: 'Ajustes',
    icon: 'fa-users-gear',
    description: 'Gestiona coaches, especialidades, contratos y nóminas del equipo.',
    keywords: ['staff', 'coaches', 'nomina', 'contratos', 'especialidades', 'empleados', 'equipo'],
    roles: [A, D],
  },
  {
    id: 'editar-box',
    title: 'Configuración del Box',
    path: '/editar-box',
    section: 'Ajustes',
    icon: 'fa-gear',
    description: 'Configura identidad, contacto, horarios, políticas y finanzas del box.',
    keywords: ['configuracion', 'ajustes', 'editar box', 'identidad', 'horarios', 'politicas', 'contacto'],
    roles: [A, D],
  },
  {
    id: 'mi-suscripcion',
    title: 'Mi Suscripción',
    path: '/mi-suscripcion',
    section: 'Ajustes',
    icon: 'fa-id-card',
    description: 'Visualiza tu plan SaaS activo, cupo de atletas y módulos incluidos.',
    keywords: ['suscripcion', 'plan', 'saas', 'cupo', 'modulos', 'facturacion', 'membresia saas'],
    roles: [A, C, D],
  },
  {
    id: 'gestion-reglamento',
    title: 'Reglamento del Box',
    path: '/gestion-reglamento',
    section: 'Ajustes',
    icon: 'fa-scale-balanced',
    description: 'Redacta el reglamento con control de firmas y auditoría de atletas.',
    keywords: ['reglamento', 'normas', 'reglas', 'firmas', 'politicas', 'compliance', 'terminos'],
    roles: [A, D],
  },
  {
    id: 'diccionario-ejercicios',
    title: 'Glosario de Ejercicios',
    path: '/diccionario-ejercicios',
    section: 'Ajustes',
    icon: 'fa-book',
    description: 'Crea y gestiona el diccionario de ejercicios disponibles en el box.',
    keywords: ['ejercicios', 'diccionario', 'glosario', 'movimientos', 'tecnica', 'videos'],
    roles: [A, C, D],
  },
  {
    id: 'admin-ejercicios',
    title: 'Gestión de Ejercicios',
    path: '/admin-ejercicios',
    section: 'Ajustes',
    icon: 'fa-list-ol',
    description: 'Administra el diccionario global de ejercicios con categorías y videos.',
    keywords: ['ejercicios', 'catalogo global', 'categorias', 'olimpico', 'fuerza', 'movimientos'],
    roles: [A, C, D],
  },
  {
    id: 'auditoria-box',
    title: 'Logs de Auditoría',
    path: '/admin-box/auditoria',
    section: 'Ajustes',
    icon: 'fa-clipboard-list',
    description: 'Consulta los registros de seguridad y acciones de usuarios del box.',
    keywords: ['auditoria', 'logs', 'seguridad', 'acciones', 'trazabilidad', 'registro de actividad', 'historial'],
    roles: [A, D],
  },
  {
    id: 'exportar-bd-box',
    title: 'Exportar Base de Datos',
    path: '/exportar-bd-box',
    section: 'Ajustes',
    icon: 'fa-file-export',
    description: 'Exporta datos y reportes de la base de datos del box.',
    keywords: ['exportar', 'base de datos', 'bd', 'descargar', 'backup', 'reportes', 'respaldo'],
    roles: [A, D],
  },
  {
    id: 'buzon-sugerencias',
    title: 'Buzón de Sugerencias',
    path: '/buzon-sugerencias',
    section: 'Ajustes',
    icon: 'fa-inbox',
    description: 'Gestiona sugerencias de atletas y reportes de bugs del box o la plataforma.',
    keywords: ['sugerencias', 'buzon', 'feedback', 'reportes', 'bugs', 'incidencias', 'propuestas', 'quejas'],
    roles: [A, C, D],
  },
  {
    id: 'preguntas-frecuentes',
    title: 'Preguntas Frecuentes',
    path: '/preguntas-frecuentes',
    section: 'Ajustes',
    icon: 'fa-circle-question',
    description: 'Consulta la biblioteca de preguntas frecuentes y ayuda.',
    keywords: ['faq', 'preguntas', 'respuestas', 'ayuda', 'soporte', 'dudas', 'manual', 'guia'],
    roles: [A, C, D],
  },
  {
    id: 'perfil-admin',
    title: 'Perfil Administrativo',
    path: '/perfil-admin',
    section: 'Ajustes',
    icon: 'fa-user-gear',
    description: 'Edita tus datos personales, información médica y seguridad de la cuenta.',
    keywords: ['perfil', 'mi cuenta', 'datos', 'seguridad', 'contraseña', 'editar perfil', 'mis datos'],
    roles: [A, C, D],
  },
];

/**
 * Devuelve las interfaces buscables para un rol dado.
 * @param {string} rol - rol del usuario (AdminBox | Coach | Developer | ...)
 */
export function getInterfacesParaRol(rol) {
  if (!rol) return [];
  return ADMIN_BOX_INTERFACES.filter((it) => it.roles.includes(rol));
}

/** Roles del staff que tienen acceso al buscador global. */
export const ROLES_CON_BUSCADOR = [A, C, D];

export default ADMIN_BOX_INTERFACES;
