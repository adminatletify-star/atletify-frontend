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

  if (accion.includes('ALTA')) { color = '#2ECC71'; icon = 'fa-user-plus'; }
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
      <i className={`fas ${icon} me-1`} /> {accion.replace('_', ' ')}
    </span>
  );
};

export default function AuditoriaUserTab({ boxes }) {
  const [logs, setLogs]       = useState([]);
  const [loading, setLoading] = useState(true);

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
            onChange={e => setFiltroBox(e.target.value)}
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
            onChange={e => setFiltroAccion(e.target.value)}
          >
            <option value="">Todas las Acciones</option>
            <option value="ALTA_USUARIO">Alta de Usuario</option>
            <option value="BAJA_USUARIO">Baja de Usuario</option>
            <option value="COBRO_MENSUALIDAD">Cobro Mensualidad</option>
            <option value="VENTA_PRODUCTO">Venta de Producto</option>
            <option value="CREAR_TIENDITA">Creación Tiendita</option>
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
                {logs.map(log => (
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
            {logs.map(log => (
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
        </>
      )}
    </div>
  );
}
