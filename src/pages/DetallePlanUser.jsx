import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BackButton from '../components/BackButton';
import '../assets/css/DetallePlanUser.css';

const API_BASE = 'https://localhost:7149/api';
const ITEMS_POR_PAGINA = 8;

function formatFecha(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function DetallePlanUser() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [data, setData] = useState(null);
  const [paginaHistorial, setPaginaHistorial] = useState(1);

  useEffect(() => {
    const raw = localStorage.getItem('usuario');
    const token = localStorage.getItem('token');
    if (!raw || !token) { navigate('/login'); return; }

    fetch(`${API_BASE}/usuarios/mi-plan`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => {
        if (!res.ok) throw new Error('Error al cargar');
        return res.json();
      })
      .then(d => setData(d))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [navigate]);

  /* ---------- derived ---------- */
  const sub = data?.suscripcion;
  const membresias = data?.membresias ?? [];
  const historial = data?.historialPagos ?? [];

  const principal = membresias.length > 0 ? membresias[membresias.length - 1] : null;
  const diasRestantes = principal?.diasRestantes ?? 0;
  const porcentaje = principal?.porcentajeTranscurrido ?? 0;
  const esCongelada = sub?.estatus === 'Congelada';
  const esVencida = sub?.estatus === 'Vencida' || diasRestantes < 0;
  const esAlerta = diasRestantes >= 0 && diasRestantes <= 5;

  const daysColor = esVencida ? 'var(--danger)' : esAlerta ? 'var(--warning)' : 'var(--success)';
  const fillClass = esVencida ? 'dpu-progress-fill--vencida' : esAlerta ? 'dpu-progress-fill--alerta' : '';

  const statusMap = {
    Activa: { cls: 'activa', icon: 'fas fa-check-circle' },
    Congelada: { cls: 'congelada', icon: 'fas fa-snowflake' },
    Vencida: { cls: 'vencida', icon: 'fas fa-exclamation-circle' },
    Cancelada: { cls: 'vencida', icon: 'fas fa-times-circle' },
  };
  const statusInfo = statusMap[sub?.estatus] || statusMap.Vencida;

  /* pagination */
  const totalPaginas = Math.ceil(historial.length / ITEMS_POR_PAGINA);
  const histPaginado = historial.slice(
    (paginaHistorial - 1) * ITEMS_POR_PAGINA,
    paginaHistorial * ITEMS_POR_PAGINA
  );

  /* ---------- renders ---------- */
  if (loading) {
    return (
      <div className="dpu-page">
        <nav className="dpu-navbar">
          <BackButton to="/user-panel" />
          <div className="dpu-navbar-icon"><i className="fas fa-id-card"></i></div>
          <p className="dpu-navbar-brand mb-0">Mis <span>Mensualidades</span></p>
        </nav>
        <div className="dpu-loading"><div className="dpu-spinner"></div></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dpu-page">
        <nav className="dpu-navbar">
          <BackButton to="/user-panel" />
          <div className="dpu-navbar-icon"><i className="fas fa-id-card"></i></div>
          <p className="dpu-navbar-brand mb-0">Mis <span>Mensualidades</span></p>
        </nav>
        <div className="dpu-empty">
          <i className="fas fa-exclamation-triangle"></i>
          <p className="dpu-empty-title">Error de conexion</p>
          <p className="dpu-empty-text">No pudimos cargar tu informacion. Intenta de nuevo mas tarde.</p>
        </div>
      </div>
    );
  }

  const sinPlan = !sub;
  const deuda = sub?.deudaRestante ?? 0;
  const saldo = data?.saldoAFavor ?? 0;

  return (
    <div className="dpu-page">
      {/* === NAVBAR === */}
      <nav className="dpu-navbar">
        <BackButton to="/user-panel" />
        <div className="dpu-navbar-icon"><i className="fas fa-id-card"></i></div>
        <p className="dpu-navbar-brand mb-0">Mis <span>Mensualidades</span></p>
      </nav>

      <div className="container py-4" style={{ maxWidth: '800px' }}>

        {/* === EXENTO BADGE === */}
        {data?.exentoDePago && (
          <div className="dpu-exento-badge mb-4">
            <i className="fas fa-star"></i> Pase Libre Activo
          </div>
        )}

        {/* === EMPTY STATE === */}
        {sinPlan && !data?.exentoDePago && (
          <div className="dpu-empty">
            <i className="fas fa-credit-card"></i>
            <p className="dpu-empty-title">Sin plan activo</p>
            <p className="dpu-empty-text">No tienes una membresia activa. Pasa a recepcion para activar tu plan.</p>
          </div>
        )}

        {/* === HERO === */}
        {!sinPlan && (
          <>
            <div className="dpu-hero mb-4">
              <div className="row g-0 align-items-center">
                <div className="col-7 col-md-8 p-4">
                  <p className="dpu-plan-name">{data.nombrePlan}</p>
                  <span className={`dpu-status-badge dpu-status--${statusInfo.cls}`}>
                    <i className={statusInfo.icon}></i> {sub.estatus}
                  </span>
                  <p className="dpu-vencimiento">
                    <i className="fas fa-calendar-alt"></i>
                    {esVencida
                      ? `Vencio el ${formatFecha(sub.fechaVencimiento)}`
                      : `Vence el ${formatFecha(sub.fechaVencimiento)}`
                    }
                  </p>
                </div>
                <div className="col-5 col-md-4 text-center p-3">
                  <span className="dpu-days-big" style={{ color: daysColor }}>
                    {Math.max(diasRestantes, 0)}
                  </span>
                  <span className="dpu-days-label">
                    {diasRestantes === 1 ? 'dia restante' : 'dias restantes'}
                  </span>
                </div>
              </div>
              <div className="dpu-progress-wrap">
                <span className="dpu-progress-pct">{porcentaje}%</span>
                <div className="dpu-progress-track">
                  <div
                    className={`dpu-progress-fill ${fillClass}`}
                    style={{ width: `${porcentaje}%` }}
                  />
                </div>
              </div>
            </div>

            {/* === FREEZE INFO === */}
            {esCongelada && sub.fechaCongelacionInicio && (
              <div className="dpu-freeze-card mb-4">
                <div className="d-flex align-items-center gap-2 mb-2">
                  <i className="fas fa-snowflake" style={{ color: 'var(--accent-cool)', fontSize: '1rem' }}></i>
                  <span className="dpu-freeze-title">Plan Congelado</span>
                </div>
                {sub.motivoCongelacion && (
                  <p className="dpu-freeze-motivo">{sub.motivoCongelacion}</p>
                )}
                <p className="dpu-freeze-dates">
                  Desde {formatFecha(sub.fechaCongelacionInicio)}
                  {sub.fechaCongelacionFin && ` hasta ${formatFecha(sub.fechaCongelacionFin)}`}
                </p>
              </div>
            )}

            {/* === FINANCIAL SUMMARY === */}
            <div className="row g-3 mb-4">
              <div className="col-6">
                <div className="dpu-info-card">
                  <span className="dpu-stat-label">Deuda Pendiente</span>
                  <span
                    className="dpu-stat-value"
                    style={{ color: deuda > 0 ? 'var(--danger)' : 'var(--success)' }}
                  >
                    ${deuda.toFixed(2)}
                  </span>
                </div>
              </div>
              <div className="col-6">
                <div className="dpu-info-card">
                  <span className="dpu-stat-label">Saldo a Favor</span>
                  <span className="dpu-stat-value" style={{ color: 'var(--success)' }}>
                    ${saldo.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* === CLASSES REMAINING (if class-limited plan) === */}
            {sub.clasesRestantes != null && (
              <div className="dpu-clases-badge mb-4">
                <i className="fas fa-dumbbell"></i>
                <span className="dpu-clases-num">{sub.clasesRestantes}</span>
                <span className="dpu-clases-text">
                  {sub.clasesRestantes === 1 ? 'clase restante' : 'clases restantes'}
                </span>
              </div>
            )}

            {/* === ADDITIONAL MEMBERSHIPS === */}
            {membresias.length > 1 && (
              <div className="dpu-info-card mb-4">
                <p className="dpu-section-label">
                  <i className="fas fa-layer-group"></i> Mis Membresias
                </p>
                <div className="d-flex flex-column gap-3">
                  {membresias.map(m => (
                    <div
                      key={m.idSuscripcion}
                      className={`dpu-mb-card ${
                        m.esFutura ? 'dpu-mb-futura' :
                        m.estatus === 'Congelada' ? 'dpu-mb-congelada' : 'dpu-mb-activa'
                      }`}
                    >
                      <div className="d-flex align-items-center justify-content-between mb-2">
                        <span className="dpu-mb-name">{m.nombrePlan}</span>
                        {!m.esFutura && (
                          <span className="dpu-mb-days">{Math.max(m.diasRestantes, 0)}d</span>
                        )}
                      </div>
                      <div className="dpu-mb-dates">
                        <span><i className="fas fa-play"></i> {formatFecha(m.fechaInicio)}</span>
                        <span><i className="fas fa-flag-checkered"></i> {formatFecha(m.fechaVencimiento)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* === PAYMENT HISTORY === */}
            <div className="dpu-info-card">
              <p className="dpu-section-label">
                <i className="fas fa-receipt"></i> Historial de Pagos
              </p>

              {historial.length === 0 ? (
                <div className="dpu-empty" style={{ padding: '2rem 1rem' }}>
                  <i className="fas fa-receipt"></i>
                  <p className="dpu-empty-title">Sin movimientos</p>
                  <p className="dpu-empty-text">Aun no hay pagos registrados en tu cuenta.</p>
                </div>
              ) : (
                <>
                  <div className="table-responsive">
                    <table className="table dpu-table">
                      <thead>
                        <tr>
                          <th>Fecha</th>
                          <th>Tipo</th>
                          <th>Metodo</th>
                          <th className="text-end">Monto</th>
                        </tr>
                      </thead>
                      <tbody>
                        {histPaginado.map((t, i) => (
                          <tr key={i}>
                            <td>{formatFecha(t.fechaPago)}</td>
                            <td><span className="dpu-table-tipo">{t.tipoTransaccion}</span></td>
                            <td><span className="dpu-table-metodo">{t.metodoPago}</span></td>
                            <td className="text-end">
                              <span className="dpu-table-monto">${t.montoPagado.toFixed(2)}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {totalPaginas > 1 && (
                    <div className="dpu-pagination">
                      <button
                        className="dpu-page-btn"
                        disabled={paginaHistorial <= 1}
                        onClick={() => setPaginaHistorial(p => p - 1)}
                      >
                        <i className="fas fa-chevron-left me-1"></i> Anterior
                      </button>
                      <span className="dpu-page-info">
                        {paginaHistorial} / {totalPaginas}
                      </span>
                      <button
                        className="dpu-page-btn"
                        disabled={paginaHistorial >= totalPaginas}
                        onClick={() => setPaginaHistorial(p => p + 1)}
                      >
                        Siguiente <i className="fas fa-chevron-right ms-1"></i>
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
