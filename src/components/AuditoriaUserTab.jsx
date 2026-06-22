import { useState, useEffect } from 'react';
import AtletifyLoader from './AtletifyLoader';
import OpcionesPicker from './OpcionesPicker';

// Color + ícono por tipo de acción. Compartido entre el badge de la tabla y las opciones del filtro modal.
function estiloAccion(accion = '') {
  if (accion === 'ELIMINAR_CUENTA_TRANSFERENCIA') return { color: '#e63946', icono: 'fa-university' };
  if (accion.includes('CUENTA_TRANSFERENCIA'))     return { color: '#16a085', icono: 'fa-university' };
  if (accion === 'APROBAR_CAMBIO_FACTURACION')     return { color: '#2ECC71', icono: 'fa-file-circle-check' };
  if (accion === 'RECHAZAR_CAMBIO_FACTURACION')    return { color: '#e67e22', icono: 'fa-file-circle-xmark' };
  if (accion === 'SOLICITAR_CAMBIO_FACTURACION')   return { color: '#3498db', icono: 'fa-file-invoice-dollar' };
  if (accion === 'GESTION_SUGERENCIA')             return { color: '#9b59b6', icono: 'fa-comment-dots' };
  if (accion.includes('CUENTA_CAMPANIA'))          return { color: '#16a085', icono: 'fa-building-columns' };
  if (accion === 'APROBAR_DONATIVO')               return { color: '#2ECC71', icono: 'fa-hand-holding-heart' };
  if (accion === 'CORRECCION_DONATIVO')            return { color: '#e67e22', icono: 'fa-rotate-left' };
  if (accion.includes('DONATIVO'))                 return { color: '#f5a623', icono: 'fa-hand-holding-heart' };
  if (accion.includes('CAMPANIA'))                 return { color: '#9b59b6', icono: 'fa-bullhorn' };
  if (accion === 'CREAR_WOD')                      return { color: '#2ECC71', icono: 'fa-calendar-plus' };
  if (accion === 'EDITAR_WOD')                     return { color: '#f5a623', icono: 'fa-pen' };
  if (accion === 'ELIMINAR_WOD')                   return { color: '#e63946', icono: 'fa-dumbbell' };
  if (accion === 'CREAR_CLASE')                    return { color: '#2ECC71', icono: 'fa-calendar-check' };
  if (accion === 'EDITAR_CLASE')                   return { color: '#f5a623', icono: 'fa-pen-to-square' };
  if (accion === 'ELIMINAR_CLASE')                 return { color: '#e63946', icono: 'fa-calendar-xmark' };
  if (accion === 'CREAR_EXPEDIENTE_MEDICO')        return { color: '#2ECC71', icono: 'fa-notes-medical' };
  if (accion === 'ACTUALIZAR_EXPEDIENTE_MEDICO')   return { color: '#f5a623', icono: 'fa-file-medical' };
  if (accion.includes('DESACTIVAR_VISITAS'))       return { color: '#e67e22', icono: 'fa-pause-circle' };
  if (accion.includes('ACTIVAR_VISITAS'))          return { color: '#f5a623', icono: 'fa-gift' };
  if (accion.includes('DESACTIVAR_METODO'))        return { color: '#e67e22', icono: 'fa-toggle-off' };
  if (accion.includes('ACTIVAR_METODO'))           return { color: '#22c55e', icono: 'fa-toggle-on' };
  if (accion.includes('APROBAR'))                  return { color: '#2ECC71', icono: 'fa-user-check' };
  if (accion.includes('BANEAR'))                   return { color: '#e63946', icono: 'fa-ban' };
  if (accion.includes('RECORDAR'))                 return { color: '#f5a623', icono: 'fa-bell' };
  if (accion.includes('RECHAZAR'))                 return { color: '#e67e22', icono: 'fa-user-times' };
  if (accion.includes('ALTA'))                     return { color: '#2ECC71', icono: 'fa-user-plus' };
  if (accion.includes('BAJA') || accion.includes('ELIMINAR')) return { color: '#e63946', icono: 'fa-user-minus' };
  if (accion.includes('VENTA') || accion.includes('COBRO'))   return { color: '#3498db', icono: 'fa-money-bill-wave' };
  if (accion.includes('CREAR_TIENDITA'))           return { color: '#f39c12', icono: 'fa-store' };
  return { color: '#9aa6c4', icono: 'fa-info-circle' };
}

// Paleta para diferenciar los boxes en el filtro (color por índice).
const PALETA_BOX = ['#4FC3F7', '#f5a623', '#2ECC71', '#9b59b6', '#FF5D8F', '#16a085', '#e67e22', '#3498db'];

// Opciones del filtro de acción, con color/ícono por tipo (mismo lenguaje visual que el badge de la tabla).
const ACCIONES = [
  { valor: '', label: 'Todas las Acciones', color: '#9aa6c4', icono: 'fa-list' },
  ...[
    ['ALTA_USUARIO', 'Alta de Usuario'],
    ['APROBAR_USUARIO', 'Aprobar Solicitud'],
    ['RECHAZAR_USUARIO', 'Rechazar Solicitud'],
    ['RECORDAR_RECHAZO', 'Recordatorio de Corrección'],
    ['BANEAR_USUARIO', 'Banear Usuario'],
    ['BAJA_USUARIO', 'Baja de Usuario'],
    ['COBRO_MENSUALIDAD', 'Cobro Mensualidad'],
    ['VENTA_PRODUCTO', 'Venta de Producto'],
    ['CREAR_TIENDITA', 'Creación Tiendita'],
    ['CREAR_WOD', 'Crear WOD'],
    ['EDITAR_WOD', 'Editar WOD'],
    ['ELIMINAR_WOD', 'Eliminar WOD'],
    ['CREAR_CLASE', 'Crear Clase'],
    ['EDITAR_CLASE', 'Editar Clase'],
    ['ELIMINAR_CLASE', 'Eliminar Clase'],
    ['CREAR_EXPEDIENTE_MEDICO', 'Crear Expediente Médico'],
    ['ACTUALIZAR_EXPEDIENTE_MEDICO', 'Actualizar Expediente Médico'],
    ['ACTIVAR_VISITAS_REGALO', 'Activar Visitas de Regalo'],
    ['DESACTIVAR_VISITAS_REGALO', 'Pausar Visitas de Regalo'],
    ['ACTIVAR_METODO_PAGO', 'Activar Método de Pago'],
    ['DESACTIVAR_METODO_PAGO', 'Desactivar Método de Pago'],
    ['CREAR_CUENTA_TRANSFERENCIA', 'Crear Cuenta de Transferencia'],
    ['EDITAR_CUENTA_TRANSFERENCIA', 'Editar Cuenta de Transferencia'],
    ['ELIMINAR_CUENTA_TRANSFERENCIA', 'Eliminar Cuenta de Transferencia'],
    ['SOLICITAR_CAMBIO_FACTURACION', 'Solicitar Cambio de Facturación'],
    ['APROBAR_CAMBIO_FACTURACION', 'Aprobar Cambio de Facturación'],
    ['RECHAZAR_CAMBIO_FACTURACION', 'Rechazar Cambio de Facturación'],
    ['GESTION_SUGERENCIA', 'Gestión de Sugerencia'],
    ['CREAR_CAMPANIA', 'Crear Campaña/Anuncio'],
    ['EDITAR_CAMPANIA', 'Editar Campaña/Anuncio'],
    ['ELIMINAR_CAMPANIA', 'Eliminar Campaña/Anuncio'],
    ['DONATIVO_MANUAL', 'Aportación Manual (Campaña)'],
    ['DONATIVO_STRIPE', 'Donativo en Línea (Campaña)'],
    ['APROBAR_DONATIVO', 'Aprobar Comprobante (Campaña)'],
    ['CORRECCION_DONATIVO', 'Comprobante a Corrección (Campaña)'],
    ['ELIMINAR_DONATIVO', 'Eliminar Registro (Campaña)'],
    ['CREAR_CUENTA_CAMPANIA', 'Crear Cuenta (Campaña)'],
    ['EDITAR_CUENTA_CAMPANIA', 'Editar Cuenta (Campaña)'],
    ['ELIMINAR_CUENTA_CAMPANIA', 'Eliminar Cuenta (Campaña)'],
  ].map(([valor, label]) => ({ valor, label, ...estiloAccion(valor) })),
];

const formatearFecha = (fechaUtc) => {
  if (!fechaUtc) return 'N/A';
  return new Date(fechaUtc).toLocaleString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

const AccionBadge = ({ accion }) => {
  const { color, icono } = estiloAccion(accion);
  return (
    <span style={{
      color: color,
      fontWeight: 'bold',
      fontSize: '0.85em',
      background: `${color}20`,
      padding: '4px 8px',
      borderRadius: '4px',
      whiteSpace: 'nowrap'
    }}>
      <i className={`fas ${icono} me-1`} /> {accion.replaceAll('_', ' ')}
    </span>
  );
};

const ITEMS_POR_PAGINA = 10;

function buildPaginas(pagina, total) {
  return Array.from({ length: total }, (_, idx) => idx + 1)
    .filter(n => n === 1 || n === total || Math.abs(n - pagina) <= 1)
    .reduce((acc, n, i, arr) => {
      if (i > 0 && n - arr[i - 1] > 1) acc.push('...');
      acc.push(n);
      return acc;
    }, []);
}

export default function AuditoriaUserTab({ boxes, ocultarFiltroBox = false }) {
  const [logs, setLogs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagina, setPagina]   = useState(1);

  // Filters
  const [filtroBox, setFiltroBox] = useState('');
  const [filtroAccion, setFiltroAccion] = useState('');

  async function cargarLogs() {
    setLoading(true);
    try {
      const url = new URL(`${import.meta.env.VITE_API_URL}/api/auditoria/usuarios`);
      if (filtroBox) url.searchParams.append('idBox', filtroBox);
      if (filtroAccion) url.searchParams.append('accion', filtroAccion);

      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      });
      if (res.ok) setLogs(await res.json());
    } catch (e) {
      console.error('Error cargando logs:', e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { cargarLogs(); }, [filtroBox, filtroAccion]);

  return (
    <div className="ap-card ap-card--warning mt-4">

      {/* Header */}
      <div className="d-flex align-items-start align-items-sm-center justify-content-between gap-2 flex-wrap mb-3">
        <p className="ap-section-title ap-section-title--warning mb-0" style={{ color: '#f39c12' }}>
          <i className="fas fa-users-cog" />
          Auditoría de Usuarios
        </p>
        <button className="ap-refresh-btn" onClick={cargarLogs}>
          <i className="fas fa-sync-alt" />
          Actualizar
        </button>
      </div>

      <p style={{ color: 'var(--text-muted)', fontSize: 'clamp(0.7rem, 2vw, 0.8rem)', marginBottom: '1.25rem' }}>
        Historial de movimientos y acciones realizadas por administradores o coaches (altas, bajas, cobros, etc).
      </p>

      {/* Filtros — selectores modales (no <select> nativo), responsivos */}
      <div className="row g-2 mb-4">
        {!ocultarFiltroBox && (
          <div className="col-12 col-md-6">
            <OpcionesPicker
              valor={filtroBox}
              onCambiar={v => { setFiltroBox(v); setPagina(1); }}
              opciones={[
                { valor: '', label: 'Todos los Boxes', icono: 'fa-layer-group', color: '#9aa6c4' },
                ...(boxes || []).map((b, i) => ({ valor: String(b.idBox), label: b.nombre, icono: 'fa-warehouse', color: PALETA_BOX[i % PALETA_BOX.length] })),
              ]}
              titulo="Filtrar por box"
              icono="fas fa-warehouse"
              placeholder="Todos los Boxes"
              buscador
              placeholderBuscar="Buscar box..."
            />
          </div>
        )}
        <div className={ocultarFiltroBox ? 'col-12' : 'col-12 col-md-6'}>
          <OpcionesPicker
            valor={filtroAccion}
            onCambiar={v => { setFiltroAccion(v); setPagina(1); }}
            opciones={ACCIONES}
            titulo="Filtrar por acción"
            icono="fas fa-bolt"
            placeholder="Todas las Acciones"
            buscador
            placeholderBuscar="Buscar acción..."
          />
        </div>
      </div>

      {loading ? (
        <div className="p-5 text-center"><AtletifyLoader /></div>
      ) : logs.length === 0 ? (
        <div className="ap-empty flex-column gap-2" style={{ minHeight: '180px' }}>
          <i className="fas fa-search" style={{ fontSize: '2rem', opacity: 0.25 }} />
          <span>No hay movimientos registrados.</span>
        </div>
      ) : (
        (() => {
          const totalPaginas = Math.ceil(logs.length / ITEMS_POR_PAGINA);
          const logsPaginados = logs.slice((pagina - 1) * ITEMS_POR_PAGINA, pagina * ITEMS_POR_PAGINA);

          return (
            <>
              {/* ── TABLA — visible en md+ ── */}
          <div className="ap-table-wrap d-none d-md-block">
            <table className="ap-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Actor (Admin/Coach)</th>
                  <th>Box Afectado</th>
                  <th>Acción</th>
                  <th>Detalles</th>
                </tr>
              </thead>
              <tbody>
                {logsPaginados.map(log => (
                  <tr key={log.idAuditoria}>
                    <td style={{ whiteSpace: 'nowrap', color: 'var(--text-muted)', fontSize: '0.78em' }}>
                      {formatearFecha(log.fechaHora)}
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.85em' }}>
                        {log.actorNombre || `Usuario ID ${log.idUsuarioActor}`}
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-primary)', fontSize: '0.85em' }}>{log.boxNombre}</td>
                    <td><AccionBadge accion={log.accion} /></td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8em', wordBreak: 'break-word', maxWidth: '300px' }}>
                      {log.detalles}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── CARDS — visible en <md ── */}
          <div className="d-flex flex-column gap-2 d-md-none">
            {logsPaginados.map(log => (
              <div
                key={log.idAuditoria}
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderLeft: `3px solid #f39c12`,
                  borderRadius: '10px',
                  padding: '0.85rem',
                }}
              >
                <div className="d-flex align-items-center justify-content-between gap-2 mb-2 flex-wrap">
                  <AccionBadge accion={log.accion} />
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem', whiteSpace: 'nowrap' }}>
                    {formatearFecha(log.fechaHora)}
                  </span>
                </div>
                <div className="mb-2">
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>Actor:</div>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.85rem' }}>
                    {log.actorNombre || `ID ${log.idUsuarioActor}`}
                  </div>
                </div>
                <div className="d-flex align-items-center gap-2 mb-2">
                  <span style={{ color: 'var(--text-primary)', fontSize: '0.78rem' }}>
                    <i className="fas fa-warehouse me-1" style={{ color: 'var(--text-muted)' }} />
                    {log.boxNombre}
                  </span>
                </div>
                {log.detalles && (
                  <p style={{ margin: 0, fontSize: '0.74rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border)', paddingTop: '0.5rem', marginTop: '0.25rem' }}>
                    {log.detalles}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* ── PAGINACIÓN ── */}
          {totalPaginas > 1 && (
            <div className="ap-pagination mt-4">
              <button 
                className="ap-page-btn" 
                onClick={() => setPagina(p => Math.max(1, p - 1))}
                disabled={pagina === 1}
              >
                <i className="fas fa-chevron-left" />
              </button>
              
              {buildPaginas(pagina, totalPaginas).map((num, i) => 
                num === '...' ? (
                  <span key={`e${i}`} className="ap-page-btn" style={{ pointerEvents: 'none', background: 'transparent' }}>…</span>
                ) : (
                  <button
                    key={num}
                    className={`ap-page-btn${pagina === num ? ' ap-page-btn--active' : ''}`}
                    onClick={() => setPagina(num)}
                  >
                    {num}
                  </button>
                )
              )}

              <button 
                className="ap-page-btn" 
                onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
                disabled={pagina === totalPaginas}
              >
                <i className="fas fa-chevron-right" />
              </button>
            </div>
          )}
        </>
      );
    })()
  )}
    </div>
  );
}
