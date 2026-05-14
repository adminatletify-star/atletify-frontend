import { useState, useEffect } from 'react';
import AtletifyLoader from './AtletifyLoader';

export default function ExportAuditoriaTab() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarLogs();
  }, []);

  async function cargarLogs() {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/auditoria/exportaciones`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (error) {
      console.error("Error cargando logs:", error);
    } finally {
      setLoading(false);
    }
  }

  const formatearFecha = (fechaUtc) => {
    if (!fechaUtc) return 'N/A';
    const f = new Date(fechaUtc);
    return f.toLocaleString('es-MX', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  if (loading) {
    return <div className="p-5 text-center"><AtletifyLoader /></div>;
  }

  return (
    <div className="p-4" style={{ backgroundColor: 'var(--bg-card)', borderRadius: '12px' }}>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="text-white mb-1"><i className="fas fa-shield-alt text-warning me-2"></i> Auditoría de Seguridad</h4>
          <p className="text-white-50 mb-0 small">Historial de exportaciones de la base de datos y bloqueos por abuso.</p>
        </div>
        <button className="btn btn-sm btn-outline-light" onClick={() => { setLoading(true); cargarLogs(); }}>
          <i className="fas fa-sync-alt me-1"></i> Actualizar
        </button>
      </div>

      {logs.length === 0 ? (
        <div className="text-center p-5 border rounded border-secondary">
          <i className="fas fa-file-signature fa-3x text-secondary mb-3"></i>
          <p className="text-white">No hay registros de auditoría recientes.</p>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="table table-dark table-hover align-middle border-secondary" style={{ backgroundColor: 'transparent' }}>
            <thead style={{ backgroundColor: 'var(--bg-dark)' }}>
              <tr>
                <th className="text-light fw-normal">Fecha</th>
                <th className="text-light fw-normal">Usuario</th>
                <th className="text-light fw-normal">Rol</th>
                <th className="text-light fw-normal">Box Afectado</th>
                <th className="text-light fw-normal">Acción</th>
                <th className="text-light fw-normal">Detalles</th>
                <th className="text-light fw-normal">IP</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.idLog}>
                  <td className="text-light">{formatearFecha(log.fechaHora)}</td>
                  <td>
                    <div className="fw-bold text-white">{log.usuarioNombre}</div>
                    <div className="small text-white-50">{log.usuarioCorreo}</div>
                  </td>
                  <td>
                    <span className={`badge ${log.usuarioRol === 'Developer' ? 'bg-info text-dark' : 'bg-secondary'}`}>
                      {log.usuarioRol}
                    </span>
                  </td>
                  <td className="text-light">{log.boxNombre}</td>
                  <td>
                    {log.accion === 'Bloqueo_Seguridad' ? (
                      <span className="badge bg-danger"><i className="fas fa-lock me-1"></i>Bloqueo</span>
                    ) : (
                      <span className="badge bg-success"><i className="fas fa-download me-1"></i>Exportación</span>
                    )}
                  </td>
                  <td style={{ maxWidth: '300px', whiteSpace: 'normal' }}>
                    {log.accion === 'Bloqueo_Seguridad' ? (
                      <span className="text-danger small">{log.detalles}</span>
                    ) : (
                      <span className="text-white-50 small">{log.detalles}</span>
                    )}
                  </td>
                  <td className="text-white-50 small">{log.ip}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
