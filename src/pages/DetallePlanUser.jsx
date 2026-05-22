import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BackButton from '../components/BackButton';
import '../assets/css/DetallePlanUser.css';

const API_BASE = import.meta.env.VITE_API_URL;
const ITEMS_POR_PAGINA = 8;

function formatFecha(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getTiempoRestante(fechaSolicitud) {
  if (!fechaSolicitud) return '—';
  const limite = new Date(fechaSolicitud).getTime() + 24 * 60 * 60 * 1000;
  const diff = limite - Date.now();
  if (diff <= 0) return 'Expirado (Procesando...)';
  const horas = Math.floor(diff / (3600 * 1000));
  const minutos = Math.floor((diff % (3600 * 1000)) / (60 * 1000));
  return `${horas}h y ${minutos}m`;
}

export default function DetallePlanUser() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [data, setData] = useState(null);
  const [paginaHistorial, setPaginaHistorial] = useState(1);

  // ── GESTIÓN DE FACTURACIÓN Y CANCELACIONES ──
  const [showBillingModal, setShowBillingModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [fotoComprobanteModal, setFotoComprobanteModal] = useState(null);

  const [planesBox, setPlanesBox] = useState([]);
  const [planSeleccionado, setPlanSeleccionado] = useState(null);
  const [metodoPago, setMetodoPago] = useState('En Línea');
  const [archivoComprobante, setArchivoComprobante] = useState(null);
  const [subiendoArchivo, setSubiendoArchivo] = useState(false);
  const [errorSubida, setErrorSubida] = useState(null);
  const [tiempoTick, setTiempoTick] = useState(0);

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
      .then(d => {
        setData(d);
        const boxId = d?.suscripcion?.idBox || JSON.parse(raw)?.idBoxPredeterminado || 1;
        fetch(`${API_BASE}/api/homepublic/planes/${boxId}`)
          .then(res => res.json())
          .then(planes => {
            setPlanesBox(planes);
            const currentPlan = planes.find(p => p.idPlan === d?.suscripcion?.idPlan);
            if (currentPlan) setPlanSeleccionado(currentPlan);
            else if (planes.length > 0) setPlanSeleccionado(planes[0]);
          })
          .catch(err => console.error("Error al cargar planes del box:", err));
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [navigate]);

  const sub = data?.suscripcion;

  useEffect(() => {
    if (sub?.cambioPeriodoPendiente && sub?.metodoPagoPendiente === 'Recepción') {
      const interval = setInterval(() => {
        setTiempoTick(t => t + 1);
      }, 60000);
      return () => clearInterval(interval);
    }
  }, [sub]);

  const handleToggleAutoRenovacion = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/usuarios/suscripcion/${sub.idSuscripcion}/toggle-autorenovacion`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const resData = await res.json();
      if (res.ok) {
        setData(prev => ({
          ...prev,
          suscripcion: { ...prev.suscripcion, autoRenovacion: resData.autoRenovacion }
        }));
        alert(resData.mensaje);
      } else {
        alert(resData.mensaje || 'Error al cambiar renovación automática');
      }
    } catch (err) {
      console.error(err);
      alert('Error de red al cambiar renovación automática');
    }
  };

  const handleCancelarMensualidad = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/usuarios/suscripcion/${sub.idSuscripcion}/cancelar-mensualidad`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const resData = await res.json();
      if (res.ok) {
        setData(prev => ({
          ...prev,
          suscripcion: { 
            ...prev.suscripcion, 
            cancelacionProgramada: true, 
            autoRenovacion: false 
          }
         }));
        alert(resData.mensaje);
        setShowCancelModal(false);
      } else {
        alert(resData.mensaje || 'Error al programar cancelación');
      }
    } catch (err) {
      console.error(err);
      alert('Error de red al programar cancelación');
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSubiendoArchivo(true);
    setErrorSubida(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/competencias/upload-comprobante`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      if (res.ok) {
        const resData = await res.json();
        setArchivoComprobante(resData.url);
      } else {
        const resData = await res.json().catch(() => ({}));
        setErrorSubida(resData.mensaje || 'Error al subir comprobante');
      }
    } catch (err) {
      console.error(err);
      setErrorSubida('Error de conexión al subir el archivo');
    } finally {
      setSubiendoArchivo(false);
    }
  };

  const handleCambiarFacturacionSubmit = async (e) => {
    e.preventDefault();
    if (metodoPago === 'Transferencia' && !archivoComprobante) {
      alert('Por favor sube la captura de tu comprobante de pago.');
      return;
    }
    if (!planSeleccionado) {
      alert('Por favor selecciona un plan.');
      return;
    }

    if (sub?.metodoPago === 'En Línea' && (metodoPago === 'Recepción' || metodoPago === 'Transferencia')) {
      const isOverdueOrGrace = sub?.estatus === 'Vencida' || sub?.estatus === 'Gracia' || (principal?.diasRestantes ?? 0) < 0;
      if (isOverdueOrGrace) {
        const recargoMonto = data?.configuracionBox?.recargoMontoFijo || 50;
        const confirmacion = await window.wpConfirm(
          `⚠️ ¡Atención! Si dejas de pagar de forma automática "En Línea", perderás tus días de gracia/prórroga y se te aplicará un recargo por pago tardío de $${recargoMonto} MXN de forma inmediata.\n\n¿Estás seguro de que deseas continuar con el cambio?`
        );
        if (!confirmacion) {
          return;
        }
      }
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/usuarios/suscripcion/${sub.idSuscripcion}/cambiar-facturacion`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({
          periodo: planSeleccionado.nombre,
          metodoPago,
          comprobanteUrl: archivoComprobante,
          idPlan: planSeleccionado.idPlan
        })
      });
      const resData = await res.json();
      if (res.ok) {
        setData(prev => ({
          ...prev,
          suscripcion: resData.suscripcion
        }));
        alert(resData.mensaje || 'Cambio solicitado exitosamente');
        setShowBillingModal(false);
        setArchivoComprobante(null);
      } else {
        alert(resData.mensaje || 'Error al solicitar cambio de facturación');
      }
    } catch (err) {
      console.error(err);
      alert('Error de red al solicitar cambio de facturación');
    }
  };

  /* ---------- derived ---------- */
  const membresias = data?.membresias ?? [];
  const historial = data?.historialPagos ?? [];

  const principal = membresias.length > 0 ? membresias[membresias.length - 1] : null;
  const diasRestantes = principal?.diasRestantes ?? 0;
  const porcentaje = principal?.porcentajeTranscurrido ?? 0;
  const esCongelada = sub?.estatus === 'Congelada';
  const esVencida = sub?.estatus === 'Vencida' || diasRestantes < 0;
  const esAlerta = diasRestantes >= 0 && diasRestantes <= 5;

  const pendingPlanName = planesBox.find(p => String(p.idPlan) === String(sub?.cambioPeriodoPendiente))?.nombre || sub?.cambioPeriodoPendiente;

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

            {/* === BANNERS DE SOLICITUDES PENDIENTES === */}
            {sub.cambioPeriodoPendiente && (
              sub.metodoPagoPendiente === 'Recepción' ? (
                <div className="dpu-pending-banner dpu-pending-banner--cash mb-4">
                  <div className="d-flex align-items-start gap-3">
                    <div className="dpu-banner-icon-box text-warning">
                      <i className="fas fa-hourglass-half"></i>
                    </div>
                    <div className="flex-grow-1">
                      <strong className="d-block text-warning mb-1" style={{ fontSize: '0.9rem' }}>Pago en Recepción Pendiente</strong>
                      <p className="mb-2 text-muted text-xs" style={{ lineHeight: '1.4' }}>
                        Solicitaste cambiar a <strong className="text-white">{pendingPlanName}</strong> con pago en Recepción {sub.estatus === 'Vencida' ? '+ atraso ' : ''}por <strong className="text-white">${sub.montoPendiente?.toFixed(2)}</strong>.
                      </p>
                      <div className="d-flex align-items-center justify-content-between bg-black bg-opacity-30 rounded px-3 py-2">
                        <span className="text-muted text-xs"><i className="far fa-clock me-1"></i> Plazo restante:</span>
                        <strong className="text-warning" style={{ fontFamily: 'var(--font-stats)', fontSize: '0.9rem' }}>
                          {getTiempoRestante(sub.fechaSolicitudCambio)}
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>
              ) : sub.metodoPagoPendiente === 'Transferencia' ? (
                <div className="dpu-pending-banner dpu-pending-banner--transfer mb-4">
                  <div className="d-flex align-items-start gap-3">
                    <div className="dpu-banner-icon-box text-info">
                      <i className="fas fa-clock"></i>
                    </div>
                    <div className="flex-grow-1">
                      <strong className="d-block text-info mb-1" style={{ fontSize: '0.9rem' }}>Verificación de Transferencia Pendiente</strong>
                      <p className="mb-2 text-muted text-xs" style={{ lineHeight: '1.4' }}>
                        Solicitaste cambiar a <strong className="text-white">{pendingPlanName}</strong> vía Transferencia por <strong className="text-white">${sub.montoPendiente?.toFixed(2)}</strong>. Nuestro Staff validará tu pago a la brevedad.
                      </p>
                      {sub.comprobanteUrlPendiente && (
                        <div className="mt-2 d-flex align-items-center gap-2">
                          <span className="text-muted text-xs">Comprobante enviado:</span>
                          <button 
                             type="button"
                             className="dpu-receipt-preview-btn"
                             onClick={() => setFotoComprobanteModal(sub.comprobanteUrlPendiente)}
                          >
                            <i className="fas fa-image me-1"></i> Ver Imagen
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : null
            )}

            {/* === BANNER DE CANCELACIÓN PROGRAMADA === */}
            {sub.cancelacionProgramada && (
              <div className="dpu-cancel-banner mb-4">
                <div className="d-flex align-items-start gap-3">
                  <div className="dpu-banner-icon-box text-danger">
                     <i className="fas fa-exclamation-triangle"></i>
                  </div>
                  <div>
                    <strong className="d-block text-danger mb-1" style={{ fontSize: '0.9rem' }}>Cancelación de Suscripción Programada</strong>
                    <p className="mb-0 text-muted text-xs" style={{ lineHeight: '1.4' }}>
                      Tu suscripción actual vencerá definitivamente el <strong className="text-white">{formatFecha(sub.fechaVencimiento)}</strong>. Tu acceso continuará activo para reservar y asistir a tus clases sin interrupción durante los próximos <strong className="text-white">{Math.max(diasRestantes, 0)} días</strong>. No se realizarán más cobros automáticos.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* === GESTIÓN DE SUSCRIPCIÓN === */}
            <div className="dpu-info-card mb-4">
              <p className="dpu-section-label">
                <i className="fas fa-cog"></i> Gestión de Suscripción
              </p>
              
              <div className="row g-3 align-items-center justify-content-between">
                {/* Detalles de Facturación */}
                <div className="col-12 col-md-6">
                  <div className="mb-3">
                    <span className="text-muted d-block text-xs" style={{ textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.2rem' }}>Método de Pago Actual</span>
                    <span className={`dpu-pm-badge dpu-pm--${sub.metodoPago === 'En Línea' ? 'online' : sub.metodoPago === 'Transferencia' ? 'transfer' : 'cash'}`}>
                      <i className={sub.metodoPago === 'En Línea' ? 'fas fa-credit-card' : sub.metodoPago === 'Transferencia' ? 'fas fa-university' : 'fas fa-money-bill-wave'}></i>
                      {sub.metodoPago}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted d-block text-xs" style={{ textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.2rem' }}>Paquete / Plan de Membresía</span>
                    <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                      {sub.periodoFacturacion || data.nombrePlan || 'Mensual'}
                    </strong>
                  </div>
                </div>

                {/* Switch de Renovación Automática */}
                <div className="col-12 col-md-6 d-flex align-items-center justify-content-md-end gap-3 mt-3 mt-md-0">
                  <div className="text-md-end">
                    <strong className="d-block" style={{ fontSize: '0.85rem' }}>Renovación Automática</strong>
                    <span className="text-muted text-xs d-block">
                      {sub.metodoPago === 'En Línea' 
                        ? (sub.autoRenovacion ? 'Activo (Cobro automático)' : 'Desactivado') 
                        : 'Requiere Pago en Línea'}
                    </span>
                  </div>
                  <label className="dpu-switch">
                    <input 
                      type="checkbox" 
                      checked={sub.autoRenovacion || false} 
                      disabled={sub.metodoPago !== 'En Línea'}
                      onChange={handleToggleAutoRenovacion}
                    />
                    <span className="dpu-switch-slider"></span>
                  </label>
                </div>
              </div>

              {/* Acciones del Plan */}
              <div className="d-flex flex-wrap gap-2 mt-4 pt-3 border-top border-secondary border-opacity-10 justify-content-between align-items-center">
                <button 
                  type="button" 
                  className="dpu-btn-action--change"
                  disabled={sub.cambioPeriodoPendiente != null}
                  onClick={() => {
                    const currentPlan = planesBox.find(p => p.idPlan === sub.idPlan);
                    if (currentPlan) setPlanSeleccionado(currentPlan);
                    setMetodoPago(sub.metodoPago === 'En Línea' ? 'En Línea' : sub.metodoPago);
                    setArchivoComprobante(null);
                    setErrorSubida(null);
                    setShowBillingModal(true);
                  }}
                >
                  <i className="fas fa-sync-alt me-2"></i> Cambiar Facturación
                </button>

                {sub.cancelacionProgramada ? (
                  <div className="dpu-cancel-badge-small">
                    <i className="fas fa-exclamation-triangle text-warning me-1"></i> Cancelación Programada
                  </div>
                ) : (
                  <button 
                    type="button" 
                    className="dpu-btn-action--cancel"
                    onClick={() => setShowCancelModal(true)}
                  >
                    <i className="fas fa-ban me-2"></i> Cancelar Membresía
                  </button>
                )}
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
              <div className="col-12">
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
                      className={`dpu-mb-card ${m.esFutura ? 'dpu-mb-futura' :
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

      {/* ======================================================
          MODAL: CAMBIAR FACTURACIÓN
          ====================================================== */}
      {showBillingModal && (
        <div className="dpu-modal-overlay">
          <div className="dpu-modal-container" style={{ maxWidth: '550px' }}>
            <div className="dpu-modal-header">
              <h5 className="m-0"><i className="fas fa-sync-alt me-2 text-primary"></i> Cambiar Plan / Paquete</h5>
              <button type="button" className="dpu-modal-close" onClick={() => setShowBillingModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            <form onSubmit={handleCambiarFacturacionSubmit} className="dpu-modal-body">
              {/* Paso 1: Selección de Plan */}
              <div className="mb-4">
                <label className="dpu-modal-label mb-2"><span className="badge bg-primary me-2">1</span>Selecciona tu nuevo plan o paquete</label>
                <div className="d-flex flex-column gap-2" style={{ maxHeight: '250px', overflowY: 'auto', paddingRight: '4px' }}>
                  {planesBox.length === 0 ? (
                    <div className="text-center py-3 text-muted text-xs">Cargando planes disponibles...</div>
                  ) : planesBox.map(p => (
                    <label key={p.idPlan} className={`dpu-radio-card ${planSeleccionado?.idPlan === p.idPlan ? 'active' : ''}`}>
                      <input 
                        type="radio" 
                        name="plan" 
                        value={p.idPlan} 
                        checked={planSeleccionado?.idPlan === p.idPlan} 
                        onChange={() => setPlanSeleccionado(p)}
                        className="d-none"
                      />
                      <div className="d-flex align-items-center justify-content-between">
                        <div className="text-start">
                          <strong>{p.nombre}</strong>
                          <span className="d-block text-muted text-xs">
                            {p.limiteClasesMensual ? `${p.limiteClasesMensual} clases al mes` : 'Clases ilimitadas'}
                            {p.restriccionHorario ? ` · ${p.restriccionHorario}` : ''}
                          </span>
                        </div>
                        <div className="text-end">
                          <strong className="dpu-radio-price">${p.precio.toFixed(2)}</strong>
                          <span className="d-block text-muted text-xs">/ {p.diasDuracion || 30} días</span>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Paso 2: Método de Pago */}
              <div className="mb-4">
                <label className="dpu-modal-label mb-2"><span className="badge bg-primary me-2">2</span>Selecciona tu método de pago</label>
                <div className="row g-2">
                  <div className="col-4">
                    <label className={`dpu-pm-select-card ${metodoPago === 'En Línea' ? 'active' : ''}`}>
                      <input 
                        type="radio" 
                        name="metodoPago" 
                        value="En Línea" 
                        checked={metodoPago === 'En Línea'} 
                        onChange={(e) => setMetodoPago(e.target.value)}
                        className="d-none"
                      />
                      <i className="fas fa-credit-card"></i>
                      <span>En Línea</span>
                    </label>
                  </div>
                  <div className="col-4">
                    <label className={`dpu-pm-select-card ${metodoPago === 'Transferencia' ? 'active' : ''}`}>
                      <input 
                        type="radio" 
                        name="metodoPago" 
                        value="Transferencia" 
                        checked={metodoPago === 'Transferencia'} 
                        onChange={(e) => setMetodoPago(e.target.value)}
                        className="d-none"
                      />
                      <i className="fas fa-university"></i>
                      <span>Transferencia</span>
                    </label>
                  </div>
                  <div className="col-4">
                    <label className={`dpu-pm-select-card ${metodoPago === 'Recepción' ? 'active' : ''}`}>
                      <input 
                        type="radio" 
                        name="metodoPago" 
                        value="Recepción" 
                        checked={metodoPago === 'Recepción'} 
                        onChange={(e) => setMetodoPago(e.target.value)}
                        className="d-none"
                      />
                      <i className="fas fa-cash-register"></i>
                      <span>Recepción</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Paso 3: Detalles específicos */}
              <div className="dpu-checkout-details bg-black bg-opacity-20 rounded p-3 mb-4 border border-secondary border-opacity-10">
                {metodoPago === 'En Línea' && (
                  <div className="text-center py-2">
                    <i className="fas fa-credit-card text-success mb-2" style={{ fontSize: '1.8rem' }}></i>
                    <strong className="d-block text-success text-sm">Pago Directo e Instantáneo</strong>
                    <p className="text-muted m-0 mt-1 text-xs">
                      Se procesará un cobro automático por un total de <strong>${(planSeleccionado?.precio || 0).toFixed(2)}</strong>. Tu membresía se activará de forma inmediata.
                    </p>
                  </div>
                )}

                {metodoPago === 'Transferencia' && (
                  <div>
                    <div className="bg-black bg-opacity-30 rounded p-3 mb-3 border border-secondary border-opacity-10 text-xs">
                      <strong className="text-info d-block mb-1"><i className="fas fa-university me-1"></i> Datos Bancarios de Transferencia</strong>
                      <div className="text-muted">
                        <div className="d-flex justify-content-between mb-1"><span>Banco:</span> <strong className="text-white">BBVA Bancomer</strong></div>
                        <div className="d-flex justify-content-between mb-1"><span>CLABE:</span> <strong className="text-white">0123 4567 8901 2345 67</strong></div>
                        <div className="d-flex justify-content-between mb-1"><span>Beneficiario:</span> <strong className="text-white">Atletify Box S.A. de C.V.</strong></div>
                        <div className="d-flex justify-content-between border-top border-secondary border-opacity-10 mt-2 pt-2"><span>Monto exacto a transferir:</span> <strong className="text-success">${(planSeleccionado?.precio || 0).toFixed(2)}</strong></div>
                      </div>
                    </div>

                    <label className="dpu-modal-label mb-2"><i className="fas fa-upload me-1 text-info"></i> Sube tu captura o comprobante de pago</label>
                    <div className="dpu-upload-zone">
                      <input 
                        type="file" 
                        onChange={handleFileChange} 
                        accept="image/*" 
                        style={{ display: 'none' }} 
                        id="comprobante-upload"
                      />
                      <label htmlFor="comprobante-upload" className="w-100 h-100 d-flex flex-column align-items-center justify-content-center cursor-pointer m-0" style={{ padding: '1.5rem 1rem' }}>
                        {subiendoArchivo ? (
                          <div className="text-center">
                            <div className="dpu-spinner mb-2" style={{ width: '24px', height: '24px' }}></div>
                            <span className="text-muted text-xs d-block">Subiendo comprobante...</span>
                          </div>
                        ) : archivoComprobante ? (
                          <div className="text-center">
                            <i className="fas fa-check-circle text-success mb-2" style={{ fontSize: '1.5rem' }}></i>
                            <span className="text-success text-xs d-block fw-bold">✓ Comprobante cargado con éxito</span>
                            <span className="text-muted text-xxs d-block mt-1">Pulsa para cambiar de archivo</span>
                            <div className="mt-2 text-center">
                              <img src={`${import.meta.env.VITE_API_URL}${archivoComprobante}`} alt="Comprobante" style={{ maxWidth: '80px', maxHeight: '50px', objectFit: 'cover', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.2)' }} />
                            </div>
                          </div>
                        ) : (
                          <div className="text-center">
                            <i className="fas fa-cloud-upload-alt text-muted mb-2" style={{ fontSize: '1.8rem' }}></i>
                            <span className="text-white text-xs d-block">Haz clic aquí para seleccionar tu imagen</span>
                            <span className="text-muted text-xxs d-block mt-1">Formato JPG, PNG (Max 5MB)</span>
                          </div>
                        )}
                      </label>
                    </div>
                    {errorSubida && <div className="text-danger text-xs mt-2 text-center"><i className="fas fa-exclamation-circle me-1"></i> {errorSubida}</div>}
                  </div>
                )}

                {metodoPago === 'Recepción' && (
                  <div className="text-center py-2">
                    <i className="fas fa-exclamation-triangle text-warning mb-2" style={{ fontSize: '1.8rem' }}></i>
                    <strong className="d-block text-warning text-sm">Plazo Límite de 24 Horas</strong>
                    <p className="text-muted m-0 mt-1 text-xs" style={{ lineHeight: '1.4' }}>
                      Al confirmar esta solicitud, tendrás un plazo de <strong>24 horas</strong> para pagar un total de <strong>${(planSeleccionado?.precio || 0).toFixed(2)}</strong> en efectivo o tarjeta en la recepción del Box. De lo contrario, la solicitud caducará.
                    </p>
                  </div>
                )}
              </div>

              {/* Botón de Confirmación */}
              <div className="d-flex gap-2 justify-content-end">
                <button 
                  type="button" 
                  className="btn btn-outline-secondary btn-sm" 
                  onClick={() => setShowBillingModal(false)}
                  style={{ border: '1px solid var(--border)', borderRadius: '8px' }}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="btn btn-success btn-sm d-flex align-items-center justify-content-center gap-2"
                  disabled={subiendoArchivo || (metodoPago === 'Transferencia' && !archivoComprobante)}
                  style={{ borderRadius: '8px', padding: '0.4rem 1.25rem', background: 'var(--success)', border: 'none' }}
                >
                  {subiendoArchivo ? 'Guardando...' : 'Confirmar Cambio'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================
          MODAL: CANCELAR PLAN
          ====================================================== */}
      {showCancelModal && (
        <div className="dpu-modal-overlay">
          <div className="dpu-modal-container" style={{ maxWidth: '450px' }}>
            <div className="dpu-modal-header">
              <h5 className="m-0 text-danger"><i className="fas fa-ban me-2"></i> Cancelar Suscripción</h5>
              <button type="button" className="dpu-modal-close" onClick={() => setShowCancelModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="dpu-modal-body text-center p-4">
              <div className="dpu-banner-icon-box mx-auto mb-3" style={{ background: 'rgba(231, 76, 60, 0.1)', color: 'var(--danger)', width: '50px', height: '50px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>
                <i className="fas fa-exclamation-triangle"></i>
              </div>
              <strong className="d-block text-white mb-2" style={{ fontSize: '1rem' }}>¿Seguro que deseas programar la cancelación?</strong>
              <p className="text-muted text-xs mb-4" style={{ lineHeight: '1.5' }}>
                Esta acción detendrá las renovaciones automáticas y los cobros futuros de tu membresía. 
                <br /><br />
                <span className="text-white fw-bold">¡Tu acceso continúa!</span> Seguirás disfrutando de tu membresía y reservando clases con normalidad hasta el <strong className="text-white">{formatFecha(sub.fechaVencimiento)}</strong> (los <strong>{Math.max(diasRestantes, 0)} días</strong> que restan de tu plan actual).
              </p>
              
              <div className="d-flex gap-2 justify-content-center">
                <button 
                  type="button" 
                  className="btn btn-outline-secondary btn-sm" 
                  onClick={() => setShowCancelModal(false)}
                  style={{ borderRadius: '8px' }}
                >
                  No, mantener activa
                </button>
                <button 
                  type="button" 
                  className="btn btn-danger btn-sm" 
                  onClick={handleCancelarMensualidad}
                  style={{ borderRadius: '8px', padding: '0.4rem 1.25rem', background: 'var(--danger)', border: 'none' }}
                >
                  Sí, programar cancelación
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================
          MODAL: FOTO COMPROBANTE ZOOM
          ====================================================== */}
      {fotoComprobanteModal && (
        <div className="dpu-modal-overlay" onClick={() => setFotoComprobanteModal(null)}>
          <div className="dpu-modal-container" style={{ maxWidth: '80vw', background: 'transparent', border: 'none', boxShadow: 'none' }} onClick={(e) => e.stopPropagation()}>
            <div className="d-flex justify-content-end mb-2">
              <button type="button" className="btn btn-dark btn-sm rounded-circle" onClick={() => setFotoComprobanteModal(null)} style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <img 
              src={`${import.meta.env.VITE_API_URL}${fotoComprobanteModal}`} 
              alt="Comprobante Zoom" 
              style={{ width: '100%', maxHeight: '80vh', objectFit: 'contain', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }} 
            />
          </div>
        </div>
      )}
    </div>
  );
}
