import { useState, useEffect } from 'react';
import AtletifyLoader from './AtletifyLoader';

const formatearFecha = (fechaUtc) => {
  if (!fechaUtc) return 'N/A';
  return new Date(fechaUtc).toLocaleString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

const AccionBadge = ({ accion }) => {
  let color = 'var(--text-muted)';
  let icon = 'fa-info-circle';

  if (accion === 'ELIMINAR_CUENTA_TRANSFERENCIA') { color = 'var(--primary)'; icon = 'fa-university'; }
  else if (accion.includes('CUENTA_TRANSFERENCIA')) { color = '#16a085'; icon = 'fa-university'; }
  else if (accion === 'APROBAR_CAMBIO_FACTURACION') { color = '#2ECC71'; icon = 'fa-file-circle-check'; }
  else if (accion === 'RECHAZAR_CAMBIO_FACTURACION') { color = '#e67e22'; icon = 'fa-file-circle-xmark'; }
  else if (accion === 'SOLICITAR_CAMBIO_FACTURACION') { color = '#3498db'; icon = 'fa-file-invoice-dollar'; }
  else if (accion === 'CREAR_WOD') { color = '#2ECC71'; icon = 'fa-calendar-plus'; }
  else if (accion === 'EDITAR_WOD') { color = '#f5a623'; icon = 'fa-pen'; }
  else if (accion === 'ELIMINAR_WOD') { color = 'var(--primary)'; icon = 'fa-dumbbell'; }
  else if (accion === 'CREAR_CLASE') { color = '#2ECC71'; icon = 'fa-calendar-check'; }
  else if (accion === 'EDITAR_CLASE') { color = '#f5a623'; icon = 'fa-pen-to-square'; }
  else if (accion === 'ELIMINAR_CLASE') { color = 'var(--primary)'; icon = 'fa-calendar-xmark'; }
  else if (accion.includes('DESACTIVAR_VISITAS')) { color = '#e67e22'; icon = 'fa-pause-circle'; }
  else if (accion.includes('ACTIVAR_VISITAS')) { color = '#f5a623'; icon = 'fa-gift'; }
  else if (accion.includes('DESACTIVAR_METODO')) { color = '#e67e22'; icon = 'fa-toggle-off'; }
  else if (accion.includes('ACTIVAR_METODO')) { color = '#22c55e'; icon = 'fa-toggle-on'; }
  else if (accion.includes('APROBAR')) { color = '#2ECC71'; icon = 'fa-user-check'; }
  else if (accion.includes('BANEAR')) { color = 'var(--primary)'; icon = 'fa-ban'; }
  else if (accion.includes('RECORDAR')) { color = '#f5a623'; icon = 'fa-bell'; }
  else if (accion.includes('RECHAZAR')) { color = '#e67e22'; icon = 'fa-user-times'; }
  else if (accion.includes('ALTA')) { color = '#2ECC71'; icon = 'fa-user-plus'; }
  else if (accion.includes('BAJA') || accion.includes('ELIMINAR')) { color = 'var(--primary)'; icon = 'fa-user-minus'; }
  else if (accion.includes('VENTA') || accion.includes('COBRO')) { color = '#3498db'; icon = 'fa-money-bill-wave'; }
  else if (accion.includes('CREAR_TIENDITA')) { color = '#f39c12'; icon = 'fa-store'; }

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
      <i className={`fas ${icon} me-1`} /> {accion.replaceAll('_', ' ')}
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

export default function AuditoriaUserTab({ boxes }) {
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

      {/* Filtros */}
      <div className="row g-2 mb-4">
        <div className="col-12 col-md-6">
          <select 
            className="form-select bg-dark text-white border-secondary" 
            value={filtroBox} 
            onChange={e => { setFiltroBox(e.target.value); setPagina(1); }}
          >
            <option value="">Todos los Boxes</option>
            {boxes?.map(b => (
              <option key={b.idBox} value={b.idBox}>{b.nombre}</option>
            ))}
          </select>
        </div>
        <div className="col-12 col-md-6">
          <select 
            className="form-select bg-dark text-white border-secondary" 
            value={filtroAccion} 
            onChange={e => { setFiltroAccion(e.target.value); setPagina(1); }}
          >
            <option value="">Todas las Acciones</option>
            <option value="ALTA_USUARIO">Alta de Usuario</option>
            <option value="APROBAR_USUARIO">Aprobar Solicitud</option>
            <option value="RECHAZAR_USUARIO">Rechazar Solicitud</option>
            <option value="RECORDAR_RECHAZO">Recordatorio de Corrección</option>
            <option value="BANEAR_USUARIO">Banear Usuario</option>
            <option value="BAJA_USUARIO">Baja de Usuario</option>
            <option value="COBRO_MENSUALIDAD">Cobro Mensualidad</option>
            <option value="VENTA_PRODUCTO">Venta de Producto</option>
            <option value="CREAR_TIENDITA">Creación Tiendita</option>
            <option value="CREAR_WOD">Crear WOD</option>
            <option value="EDITAR_WOD">Editar WOD</option>
            <option value="ELIMINAR_WOD">Eliminar WOD</option>
            <option value="CREAR_CLASE">Crear Clase</option>
            <option value="EDITAR_CLASE">Editar Clase</option>
            <option value="ELIMINAR_CLASE">Eliminar Clase</option>
            <option value="ACTIVAR_VISITAS_REGALO">Activar Visitas de Regalo</option>
            <option value="DESACTIVAR_VISITAS_REGALO">Pausar Visitas de Regalo</option>
            <option value="ACTIVAR_METODO_PAGO">Activar Método de Pago</option>
            <option value="DESACTIVAR_METODO_PAGO">Desactivar Método de Pago</option>
            <option value="CREAR_CUENTA_TRANSFERENCIA">Crear Cuenta de Transferencia</option>
            <option value="EDITAR_CUENTA_TRANSFERENCIA">Editar Cuenta de Transferencia</option>
            <option value="ELIMINAR_CUENTA_TRANSFERENCIA">Eliminar Cuenta de Transferencia</option>
            <option value="SOLICITAR_CAMBIO_FACTURACION">Solicitar Cambio de Facturación</option>
            <option value="APROBAR_CAMBIO_FACTURACION">Aprobar Cambio de Facturación</option>
            <option value="RECHAZAR_CAMBIO_FACTURACION">Rechazar Cambio de Facturación</option>
          </select>
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
