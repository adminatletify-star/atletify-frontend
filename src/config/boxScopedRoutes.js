// Rutas que REQUIEREN un box en contexto (scope de box). Un Developer no tiene box propio;
// para entrar a estas debe elegir uno desde el selector del navbar ("Auditar un box").
// Las rutas GLOBALES del Developer (dashboard, SaaS, crear-box, etc.) NO están aquí y se
// navegan libremente. Default = NO requiere box (se permite).
const PREFIJOS_CON_BOX = [
  '/atletas-box',
  '/gestion-clases',
  '/pase-de-lista',
  '/directorio',
  '/admin-calendario',
  '/calendario-wods',
  '/admin-box/auditoria',
  '/admin-box/validaciones',
  '/comunidad',
  '/registro-manual',
  '/gestion-finanzas',
  '/finanzas-globales',
  '/gestion-ventas-productos',
  '/punto-de-venta',
  '/almacen-panel',
  '/historial-ventas',
  '/gestion-fiado',
  '/gestion-inventario',
  '/editar-box',
  '/mi-suscripcion',
  '/admin-roster',
  '/gestion-staff',
  '/creador-wods',
  '/editar-wod',
  '/wods-guardados',
];

export function esRutaConBox(pathname = '') {
  return PREFIJOS_CON_BOX.some((p) => pathname === p || pathname.startsWith(p + '/'));
}
