import { useState, useEffect } from 'react';
import AtletifyLoader from './AtletifyLoader';

const formatearFecha = (fechaUtc) => {
  if (!fechaUtc) return 'N/A';
  return new Date(fechaUtc).toLocaleString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

const AccionBadge = ({ accion }) =>
  accion === 'Bloqueo_Seguridad'
    ? <span className="ap-badge ap-badge--expirado"><i className="fas fa-lock" />Bloqueo</span>
    : <span className="ap-badge ap-badge--completado"><i className="fas fa-download" />Exportación</span>;

const RolBadge = ({ rol }) =>
  rol === 'Developer'
    ? <span className="ap-badge ap-badge--atleta">{rol}</span>
    : <span className="ap-badge ap-badge--pendiente">{rol}</span>;

export default function ExportAuditoriaTab() {
  const [logs, setLogs]       = useState([]);
  const [loading, setLoading] = useState(true);

  async function cargarLogs() {
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/auditoria/exportaciones`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      });
      if (res.ok) setLogs(await res.json());
    } catch (e) {
      console.error('Error cargando logs:', e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { cargarLogs(); }, []);

  if (loading) return <div className="p-5 text-center"><AtletifyLoader /></div>;

  return (
    <div className="ap-card ap-card--info">

      {/* Header */}
      <div className="d-flex align-items-start align-items-sm-center justify-content-between gap-2 flex-wrap mb-3">
        <p className="ap-section-title ap-section-title--info mb-0">
          <i className="fas fa-shield-alt" />
          Auditoría de Seguridad
        </p>
        <button className="ap-refresh-btn" onClick={cargarLogs}>
          <i className="fas fa-sync-alt" />
          Actualizar
        </button>
      </div>

      <p style={{ color: 'var(--text-muted)', fontSize: 'clamp(0.7rem, 2vw, 0.8rem)', marginBottom: '1.25rem' }}>
        Historial de exportaciones de la base de datos y bloqueos por abuso.
      </p>

      {/* Empty */}
      {logs.length === 0 ? (
        <div className="ap-empty flex-column gap-2" style={{ minHeight: '180px' }}>
          <i className="fas fa-file-signature" style={{ fontSize: '2rem', opacity: 0.25 }} />
          <span>No hay registros de auditoría recientes.</span>
        </div>
      ) : (
        <>
          {/* ── TABLA — visible en md+ ── */}
          <div className="ap-table-wrap d-none d-md-block">
            <table className="ap-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Usuario</th>
                  <th>Rol</th>
                  <th>Box afectado</th>
                  <th>Acción</th>
                  <th>Detalles</th>
                  <th>IP</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.idLog}>
                    <td style={{ whiteSpace: 'nowrap', color: 'var(--text-muted)', fontSize: '0.78em' }}>
                      {formatearFecha(log.fechaHora)}
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.85em' }}>{log.usuarioNombre}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.72em' }}>{log.usuarioCorreo}</div>
                    </td>
                    <td><RolBadge rol={log.usuarioRol} /></td>
                    <td style={{ color: 'var(--text-primary)', fontSize: '0.85em' }}>{log.boxNombre}</td>
                    <td><AccionBadge accion={log.accion} /></td>
                    <td style={{ maxWidth: '260px', color: log.accion === 'Bloqueo_Seguridad' ? 'var(--primary)' : 'var(--text-muted)', fontSize: '0.78em', wordBreak: 'break-word' }}>
                      {log.detalles}
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.75em', whiteSpace: 'nowrap' }}>{log.ip}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── CARDS — visible en <md ── */}
          <div className="d-flex flex-column gap-2 d-md-none">
            {logs.map(log => (
              <div
                key={log.idLog}
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderLeft: `3px solid ${log.accion === 'Bloqueo_Seguridad' ? 'var(--primary)' : '#2ECC71'}`,
                  borderRadius: '10px',
                  padding: '0.85rem',
                }}
              >
                {/* Fila 1: acción + fecha */}
                <div className="d-flex align-items-center justify-content-between gap-2 mb-2 flex-wrap">
                  <AccionBadge accion={log.accion} />
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem', whiteSpace: 'nowrap' }}>
                    {formatearFecha(log.fechaHora)}
                  </span>
                </div>

                {/* Fila 2: usuario + rol */}
                <div className="d-flex align-items-center justify-content-between gap-2 mb-2 flex-wrap">
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.85rem' }}>{log.usuarioNombre}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>{log.usuarioCorreo}</div>
                  </div>
                  <RolBadge rol={log.usuarioRol} />
                </div>

                {/* Fila 3: box + IP */}
                <div className="d-flex align-items-center justify-content-between gap-2 mb-2 flex-wrap">
                  <span style={{ color: 'var(--text-primary)', fontSize: '0.78rem' }}>
                    <i className="fas fa-warehouse me-1" style={{ color: 'var(--text-muted)', fontSize: '0.7em' }} />
                    {log.boxNombre}
                  </span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>
                    <i className="fas fa-network-wired me-1" style={{ fontSize: '0.7em' }} />
                    {log.ip}
                  </span>
                </div>

                {/* Fila 4: detalles */}
                {log.detalles && (
                  <p style={{
                    margin: 0,
                    fontSize: '0.74rem',
                    color: log.accion === 'Bloqueo_Seguridad' ? 'var(--primary)' : 'var(--text-muted)',
                    borderTop: '1px solid var(--border)',
                    paddingTop: '0.5rem',
                    marginTop: '0.25rem',
                  }}>
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
