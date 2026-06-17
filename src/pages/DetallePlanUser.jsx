import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import BackButton from '../components/BackButton';
import CuentasTransferenciaTrigger from '../components/CuentasTransferenciaTrigger';
import '../assets/css/DetallePlanUser.css';

const API_BASE = import.meta.env.VITE_API_URL;
const ITEMS_POR_PAGINA = 8;

function formatFecha(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

// Lee la respuesta de forma defensiva: si el backend devuelve un cuerpo no-JSON
// (página de error 500, 401 vacío, timeout de proxy…), NO reventamos con un
// SyntaxError que el catch acabaría enmascarando como "Error de red". Devolvemos
// lo que se pueda parsear para poder mostrar el status/mensaje reales.
async function leerRespuesta(res) {
  const texto = await res.text().catch(() => '');
  try { return texto ? JSON.parse(texto) : {}; } catch { return {}; }
}

// Aviso de la solicitud de pago en recepción. El "plazo" ya NO es un reloj fijo de 24h:
// es natural, hasta que vence la mensualidad del atleta.
//   • le quedan > 24h  → solo recordatorio con la fecha de vencimiento (sin prisa).
//   • le quedan < 24h  → cuenta regresiva real (horas y minutos) hasta el vencimiento.
//   • ya venció        → sin plazo; mensaje de "pásate a pagar para reactivar".
function getRecepcionAviso(fechaVencimiento) {
  if (!fechaVencimiento) {
    return { modo: 'mensaje', texto: 'Pasa a recepción a pagar tu mensualidad.' };
  }
  const diff = new Date(fechaVencimiento).getTime() - Date.now();
  if (diff <= 0) {
    return { modo: 'vencida', texto: 'Tu mensualidad venció. Pasa a recepción a pagar cuanto antes para reactivarla.' };
  }
  if (diff < 24 * 60 * 60 * 1000) {
    const horas = Math.floor(diff / (3600 * 1000));
    const minutos = Math.floor((diff % (3600 * 1000)) / (60 * 1000));
    return { modo: 'contador', texto: `${horas}h ${minutos}m`, nota: 'antes de que venza tu mensualidad' };
  }
  const dias = Math.ceil(diff / (24 * 60 * 60 * 1000));
  return { modo: 'mensaje', texto: `Mantente atento: tu mensualidad vence el ${formatFecha(fechaVencimiento)} (${dias} día${dias === 1 ? '' : 's'}).` };
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
  const [enviando, setEnviando] = useState(false);          // guard anti doble-submit
  const [confirmandoPago, setConfirmandoPago] = useState(false); // verificando pago al volver de Stripe

  const cargarMiPlan = useCallback(async () => {
    const raw = localStorage.getItem('usuario');
    const token = localStorage.getItem('token');
    if (!raw || !token) { navigate('/login'); return; }
    try {
      const res = await fetch(`${API_BASE}/usuarios/mi-plan`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Error al cargar');
      const d = await res.json();
      setData(d);
      const boxId = d?.suscripcion?.idBox || JSON.parse(raw)?.idBoxPredeterminado || 1;
      try {
        const planesRes = await fetch(`${API_BASE}/api/homepublic/planes/${boxId}`);
        const planes = await planesRes.json();
        setPlanesBox(planes);
        const currentPlan = planes.find(p => p.idPlan === d?.suscripcion?.idPlan);
        if (currentPlan) setPlanSeleccionado(currentPlan);
        else if (planes.length > 0) setPlanSeleccionado(planes[0]);
      } catch (err) { console.error("Error al cargar planes del box:", err); }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => { cargarMiPlan(); }, [cargarMiPlan]);

  // Retorno desde Stripe Checkout (pago en línea).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = localStorage.getItem('token');

    // Retorno desde el Portal de Stripe (cambio de tarjeta). Confirmamos si la tarjeta cambió.
    if (params.get('portal_return') === '1') {
      window.history.replaceState({}, '', '/detalle-plan-user');
      const idSus = sessionStorage.getItem('portal_sub');
      const pmAntes = sessionStorage.getItem('portal_pm_antes');
      sessionStorage.removeItem('portal_sub');
      sessionStorage.removeItem('portal_pm_antes');
      if (idSus) {
        fetch(`${API_BASE}/finanzas/confirmar-cambio-tarjeta`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ idSuscripcion: Number(idSus), pmAntes: pmAntes || null })
        })
          .then(r => r.json())
          .then(d => { if (d.ok) alert(`Tu tarjeta de pago en línea se actualizó${d.last4 ? ` (•••• ${d.last4})` : ''}.`); })
          .catch(() => {})
          .finally(() => cargarMiPlan());
      } else {
        cargarMiPlan();
      }
      return;
    }

    if (params.get('b2c_cancel') === '1') {
      window.history.replaceState({}, '', '/detalle-plan-user');
      alert('Pago cancelado. No se realizó ningún cargo.');
      return;
    }

    if (params.get('b2c_success') === '1') {
      const sessionId = params.get('session_id');
      const idBox = JSON.parse(localStorage.getItem('usuario') || '{}')?.idBoxPredeterminado || 1;
      window.history.replaceState({}, '', '/detalle-plan-user');
      if (!sessionId) return;
      setConfirmandoPago(true);
      fetch(`${API_BASE}/finanzas/confirmar-b2c`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ idBox, sessionId })
      })
        .then(r => r.json())
        .then(d => alert(d.mensaje || 'Pago procesado.'))
        .catch(() => alert('No pudimos confirmar el pago automáticamente. Si se realizó el cargo, se reflejará en breve.'))
        .finally(() => { setConfirmandoPago(false); cargarMiPlan(); });
    }
  }, [cargarMiPlan]);

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

  // Abre el Portal de Stripe para CAMBIAR/actualizar la tarjeta de la suscripción existente
  // (sin crear una segunda suscripción). Guardamos la tarjeta previa para detectar el cambio al volver.
  const handleAbrirPortalTarjeta = async () => {
    try {
      const token = localStorage.getItem('token');
      const idBox = sub?.idBox || JSON.parse(localStorage.getItem('usuario') || '{}')?.idBoxPredeterminado || 1;
      const res = await fetch(`${API_BASE}/finanzas/portal-tarjeta/${idBox}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ idSuscripcion: sub.idSuscripcion, returnPath: '/detalle-plan-user' })
      });
      const d = await res.json();
      if (res.ok && d.url) {
        sessionStorage.setItem('portal_sub', String(sub.idSuscripcion));
        sessionStorage.setItem('portal_pm_antes', d.pmAntes || '');
        window.location.href = d.url; // portal seguro de Stripe
        return;
      }
      alert(d.mensaje || 'No se pudo abrir el portal para cambiar tu tarjeta.');
    } catch (err) {
      console.error(err);
      alert('Error de red al abrir el portal de pago.');
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSubiendoArchivo(true);
    setErrorSubida(null);

    // Anti-PDFs y anti-archivos pesados: solo imágenes hasta ~5MB.
    if (!file.type || !file.type.startsWith('image/')) {
      setSubiendoArchivo(false);
      setErrorSubida('Solo se aceptan imágenes (JPG o PNG).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setSubiendoArchivo(false);
      setErrorSubida('La imagen no puede superar los 5 MB.');
      return;
    }

    try {
      // El comprobante se guarda como data URL en la BD (igual que registro/tienda),
      // así NO queda como archivo público en wwwroot.
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
      setArchivoComprobante(dataUrl);
    } catch (err) {
      console.error(err);
      setErrorSubida('No se pudo leer la imagen. Intenta de nuevo.');
    } finally {
      setSubiendoArchivo(false);
    }
  };

  const handleCancelarSolicitud = async () => {
    if (enviando) return;
    setEnviando(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/usuarios/suscripcion/${sub.idSuscripcion}/cancelar-solicitud-cambio`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const resData = await res.json();
      if (res.ok) {
        alert(resData.mensaje || 'Solicitud cancelada.');
        await cargarMiPlan();
      } else {
        alert(resData.mensaje || 'No se pudo cancelar la solicitud.');
      }
    } catch (err) {
      console.error(err);
      alert('Error de red al cancelar la solicitud.');
    } finally {
      setEnviando(false);
    }
  };

  const handleCambiarFacturacionSubmit = async (e) => {
    e.preventDefault();
    if (enviando) return; // guard: evita doble-submit / clics repetidos

    // La transferencia SIEMPRE requiere comprobante para que el administrador pueda validarla.
    if (metodoPago === 'Transferencia' && !archivoComprobante) {
      alert('Por favor sube la captura de tu comprobante de transferencia.');
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

    setEnviando(true);
    try {
      const token = localStorage.getItem('token');

      // PAGO EN LÍNEA → Stripe. No se cobra ni se acreditan días aquí.
      // Si todavía tiene mensualidad vigente, Stripe colecta la tarjeta ($0 hoy) y
      // cobra automáticamente al vencimiento. Si ya está vencido, cobra de inmediato.
      if (metodoPago === 'En Línea') {
        const idBox = sub?.idBox || JSON.parse(localStorage.getItem('usuario') || '{}')?.idBoxPredeterminado || 1;
        const res = await fetch(`${API_BASE}/finanzas/checkout-b2c/${idBox}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({
            idSuscripcion: sub.idSuscripcion,
            idPlanDestino: planSeleccionado.idPlan,
            returnPath: '/detalle-plan-user'
          })
        });
        const d = await leerRespuesta(res);
        if (res.ok && d.url) {
          window.location.href = d.url; // redirige al checkout seguro de Stripe
          return;
        }
        alert(d.mensaje || `No se pudo iniciar el pago en línea (error ${res.status}).`);
        return;
      }

      // TRANSFERENCIA / RECEPCIÓN → queda como solicitud pendiente de validación.
      const res = await fetch(`${API_BASE}/usuarios/suscripcion/${sub.idSuscripcion}/cambiar-facturacion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          periodo: planSeleccionado.nombre,
          metodoPago,
          comprobanteUrl: archivoComprobante,
          idPlan: planSeleccionado.idPlan
        })
      });
      const resData = await leerRespuesta(res);
      if (res.ok) {
        alert(resData.mensaje || 'Cambio solicitado exitosamente');
        setShowBillingModal(false);
        setArchivoComprobante(null);
        await cargarMiPlan(); // refetch: refleja el estado pendiente sin dejar la UI stale
      } else {
        alert(resData.mensaje || `Error al solicitar cambio de facturación (error ${res.status}).`);
      }
    } catch (err) {
      // El catch ya solo se alcanza por un fallo REAL de red (fetch rechazado): el
      // parseo defensivo de leerRespuesta() evita que un cuerpo no-JSON caiga aquí.
      console.error(err);
      alert('No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.');
    } finally {
      setEnviando(false);
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

  // Aviso dinámico para la solicitud de pago en recepción (se recalcula en cada render; el
  // intervalo de tiempoTick fuerza el refresco cuando hay una solicitud de recepción pendiente).
  const avisoRecepcion = getRecepcionAviso(sub?.fechaVencimiento);

  // Métodos de pago que el box realmente acepta (enforcement de la config financiera).
  // Si NO llegó la config, somos conservadores: no ofrecemos un método que el backend rechazaría.
  // mi-plan ahora resuelve el box igual que cambiar-facturacion, así que la config llega salvo
  // que el box no tenga ninguna configurada (ahí el atleta paga en recepción a la antigua).
  const cfgBox = data?.configuracionBox;
  const hayCfg = !!cfgBox;
  const metodosDisponibles = {
    'En Línea': hayCfg ? !!(cfgBox.aceptarPagosEnLinea && cfgBox.stripeConectado) : false,
    'Transferencia': hayCfg ? !!cfgBox.aceptarTransferencias : false,
    'Recepción': hayCfg ? !!(cfgBox.aceptarEfectivo || cfgBox.aceptarTarjetaRecepcion) : false,
  };
  const metodosActivos = ['En Línea', 'Transferencia', 'Recepción'].filter(m => metodosDisponibles[m]);

  // No hay cambio real si se mantiene el mismo plan Y el mismo método que ya tiene el atleta.
  // (En Línea queda fuera: re-elegirlo sí tiene sentido — actualiza tarjeta/renueva en Stripe.)
  const sinCambios = !!planSeleccionado
    && planSeleccionado.idPlan === sub?.idPlan
    && metodoPago === sub?.metodoPago
    && metodoPago !== 'En Línea';

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
  if (loading || confirmandoPago) {
    return (
      <div className="dpu-page">
        <nav className="dpu-navbar">
          <BackButton to="/user-panel" />
          <div className="dpu-navbar-icon"><i className="fas fa-id-card"></i></div>
          <p className="dpu-navbar-brand mb-0">Mis <span>Mensualidades</span></p>
        </nav>
        <div className="dpu-loading">
          <div className="dpu-spinner"></div>
          {confirmandoPago && <p className="text-muted mt-3">Confirmando tu pago con Stripe…</p>}
        </div>
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
            {data?.inscripcionPendiente?.debe && (
              <div className="dpu-pending-banner dpu-pending-banner--transfer mb-4">
                <div className="d-flex align-items-start gap-3">
                  <div className="dpu-banner-icon-box text-info">
                    <i className="fas fa-id-badge"></i>
                  </div>
                  <div className="flex-grow-1">
                    <strong className="d-block text-info mb-1" style={{ fontSize: '0.9rem' }}>
                      Anualidad de inscripción {data.inscripcionPendiente.anio} pendiente
                    </strong>
                    <p className="mb-0 text-muted text-xs" style={{ lineHeight: '1.4' }}>
                      Este es el mes para pagar tu inscripción anual (<strong className="text-white">${data.inscripcionPendiente.monto?.toFixed(2)}</strong>).
                      Puedes pagarla en recepción, <strong>aparte</strong> de tu mensualidad o <strong>junto</strong> con ella. No es obligatorio pagarla con tarjeta.
                    </p>
                  </div>
                </div>
              </div>
            )}

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
                      {avisoRecepcion.modo === 'contador' ? (
                        <div className="d-flex align-items-center justify-content-between bg-black bg-opacity-30 rounded px-3 py-2">
                          <span className="text-muted text-xs"><i className="far fa-clock me-1"></i> Te quedan:</span>
                          <strong className="text-warning" style={{ fontFamily: 'var(--font-stats)', fontSize: '0.9rem' }}>
                            {avisoRecepcion.texto} <span className="text-muted" style={{ fontWeight: 400, fontSize: '0.7rem' }}>{avisoRecepcion.nota}</span>
                          </strong>
                        </div>
                      ) : (
                        <div className="bg-black bg-opacity-30 rounded px-3 py-2">
                          <span className={`text-xs ${avisoRecepcion.modo === 'vencida' ? 'text-danger' : 'text-muted'}`}>
                            <i className="far fa-clock me-1"></i> {avisoRecepcion.texto}
                          </span>
                        </div>
                      )}
                      {avisoRecepcion.modo !== 'vencida' && (
                        <p className="text-muted mt-2 mb-2" style={{ fontSize: '0.72rem', lineHeight: '1.4' }}>
                          <i className="fas fa-info-circle me-1"></i>
                          Es solo para el <strong>cambio</strong> que solicitaste; tu mensualidad actual sigue vigente y <strong>no pierdes tus días</strong>.
                        </p>
                      )}
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-light"
                        style={{ borderRadius: '8px', fontSize: '0.72rem' }}
                        disabled={enviando}
                        onClick={handleCancelarSolicitud}
                      >
                        <i className="fas fa-times me-1"></i> Cancelar solicitud
                      </button>
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
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-light mt-2"
                        style={{ borderRadius: '8px', fontSize: '0.72rem' }}
                        disabled={enviando}
                        onClick={handleCancelarSolicitud}
                      >
                        <i className="fas fa-times me-1"></i> Cancelar solicitud
                      </button>
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

                {/* Switch de Renovación Automática (Oculto para miembros no líderes) */}
                {(!data?.grupoFamiliar || data?.grupoFamiliar?.esLider) && (
                  <div className="col-12 col-md-6 d-flex align-items-center justify-content-md-end gap-3 mt-3 mt-md-0">
                    <div className="dpu-switch-wrapper">
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
                )}
              </div>

              {/* Mensajes del Grupo Familiar */}
              {data?.grupoFamiliar && (
                <div className="mt-4 p-3 rounded" style={{ backgroundColor: 'rgba(255, 193, 7, 0.1)', borderLeft: '4px solid var(--warning)' }}>
                  <h6 className="text-warning mb-2"><i className="fas fa-users me-2"></i> Perteneces a un Escuadrón Familiar</h6>
                  <p className="mb-0 text-muted" style={{ fontSize: '0.9rem' }}>
                    {!data.grupoFamiliar.esLider ? (
                      <>
                        Actualmente estás en un grupo familiar. La facturación total del grupo recae sobre: <strong>{data.grupoFamiliar.nombreLider}</strong> por la cantidad de: <strong>${data.grupoFamiliar.facturacionTotal?.toLocaleString()}</strong>.
                        Si deseas salir del grupo acércate a recepción, toma en cuenta que si el grupo queda con menos de 4 integrantes automáticamente el grupo se disolverá y se les cobrará su facturación mensual normal.
                      </>
                    ) : (
                      <>
                        Tú eres el <strong>Líder</strong> del escuadrón <strong>{data.grupoFamiliar.nombreGrupo}</strong>. El pago de la mensualidad total recae sobre ti por la cantidad de <strong>${data.grupoFamiliar.facturacionTotal?.toLocaleString()}</strong>.
                        Toma en cuenta que si algún integrante se sale y el grupo queda con menos de 4 personas, automáticamente el grupo se disolverá y se les cobrará la facturación mensual normal sin beneficios.
                      </>
                    )}
                  </p>
                </div>
              )}

              {/* Acciones del Plan (Solo Líder o Usuarios Individuales) */}
              {(!data?.grupoFamiliar || data?.grupoFamiliar?.esLider) && (
                <div className="d-flex flex-wrap gap-2 mt-4 pt-3 border-top border-secondary border-opacity-10 justify-content-between align-items-center">
                  <div className="d-flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="dpu-btn-action--change"
                      disabled={enviando}
                      onClick={() => {
                        const currentPlan = planesBox.find(p => p.idPlan === sub.idPlan);
                        if (currentPlan) setPlanSeleccionado(currentPlan);
                        // Método inicial: el actual si el box aún lo acepta, si no el primero disponible.
                        setMetodoPago(metodosActivos.includes(sub.metodoPago) ? sub.metodoPago : (metodosActivos[0] || 'Recepción'));
                        setArchivoComprobante(null);
                        setErrorSubida(null);
                        setShowBillingModal(true);
                      }}
                    >
                      <i className="fas fa-sync-alt me-2"></i> Cambiar Facturación
                    </button>

                    {/* Cambiar tarjeta: solo con pago en línea activo y una tarjeta ya registrada en Stripe */}
                    {sub.metodoPago === 'En Línea' && sub.stripeCustomerId && (
                      <button
                        type="button"
                        className="dpu-btn-action--change"
                        onClick={handleAbrirPortalTarjeta}
                      >
                        <i className="fas fa-credit-card me-2"></i> Cambiar tarjeta
                      </button>
                    )}
                  </div>

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
              )}
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
                  {metodosDisponibles['En Línea'] && (
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
                        {sub?.metodoPago === 'En Línea' && (
                          <span style={{ fontSize: '0.5rem', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--success)', marginTop: '3px' }}>● Actual</span>
                        )}
                      </label>
                    </div>
                  )}
                  {metodosDisponibles['Transferencia'] && (
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
                        {sub?.metodoPago === 'Transferencia' && (
                          <span style={{ fontSize: '0.5rem', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--success)', marginTop: '3px' }}>● Actual</span>
                        )}
                      </label>
                    </div>
                  )}
                  {metodosDisponibles['Recepción'] && (
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
                        {sub?.metodoPago === 'Recepción' && (
                          <span style={{ fontSize: '0.5rem', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--success)', marginTop: '3px' }}>● Actual</span>
                        )}
                      </label>
                    </div>
                  )}
                  {metodosActivos.length === 0 && (
                    <div className="col-12">
                      <p className="text-muted text-center text-xs m-0 py-2">
                        Este box no tiene métodos de pago habilitados por ahora. Acércate a recepción.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Paso 3: Detalles específicos */}
              <div className="dpu-checkout-details bg-black bg-opacity-20 rounded p-3 mb-4 border border-secondary border-opacity-10">
                
                {/* === DESGLOSE DINÁMICO LÍDER === */}
                {(() => {
                  if (!data?.grupoFamiliar?.esLider || !data.grupoFamiliar.miembros) return null;
                  
                  let sumaBruta = 0;
                  const miembrosMapeados = data.grupoFamiliar.miembros.map(m => {
                    if (m.rolEnGrupo === 'Lider') {
                      const precioLeader = planSeleccionado ? planSeleccionado.precio : m.precioBase;
                      sumaBruta += precioLeader;
                      return { ...m, precioEfectivo: precioLeader, planNombreEfectivo: planSeleccionado ? planSeleccionado.nombre : m.planNombre };
                    }
                    sumaBruta += m.precioBase;
                    return { ...m, precioEfectivo: m.precioBase, planNombreEfectivo: m.planNombre };
                  });

                  let descuentoMonto = 0;
                  const descGlobal = data.grupoFamiliar.descuentoGlobal;
                  if (descGlobal?.tipo === 'DescuentoPorcentaje') {
                    descuentoMonto = sumaBruta * ((descGlobal.valor || 0) / 100);
                  } else if (descGlobal?.tipo === 'DescuentoPesos') {
                    descuentoMonto = descGlobal.valor || 0;
                  } else if (descGlobal?.tipo === 'PrecioFijo') {
                    descuentoMonto = sumaBruta - (descGlobal.valor || sumaBruta);
                  }

                  let facturacionTotal = sumaBruta - descuentoMonto;
                  const precioMinimo = data.grupoFamiliar.precioMinimoMensual;
                  if (precioMinimo != null && facturacionTotal < precioMinimo) {
                    facturacionTotal = precioMinimo;
                  }

                  return (
                    <div className="dpu-group-breakdown mb-3 bg-black bg-opacity-30 rounded p-3 border border-secondary border-opacity-10 text-xs">
                      <strong className="text-info d-block mb-2"><i className="fas fa-users me-1"></i> Desglose del Escuadrón</strong>
                      {miembrosMapeados.map((m, i) => (
                        <div key={i} className="d-flex justify-content-between mb-1 text-muted">
                          <span>{m.nombre} <span className="opacity-50">({m.planNombreEfectivo})</span></span>
                          <strong className="text-white">${m.precioEfectivo.toFixed(2)}</strong>
                        </div>
                      ))}
                      <div className="d-flex justify-content-between mb-1 mt-2 pt-2 border-top border-secondary border-opacity-10 text-muted">
                        <span>Suma Bruta:</span>
                        <strong className="text-white">${sumaBruta.toFixed(2)}</strong>
                      </div>
                      <div className="d-flex justify-content-between mb-1 text-muted">
                        <span>Descuento Aplicado:</span>
                        <strong className="text-danger">-${descuentoMonto.toFixed(2)}</strong>
                      </div>
                      <div className="d-flex justify-content-between mt-2 pt-2 border-top border-secondary border-opacity-10">
                        <span className="fw-bold text-white">Total a Pagar:</span>
                        <strong className="text-success fs-6">${facturacionTotal.toFixed(2)}</strong>
                      </div>
                    </div>
                  );
                })()}

                {metodoPago === 'En Línea' && (
                  <div className="text-center py-2">
                    <i className="fas fa-credit-card text-success mb-2" style={{ fontSize: '1.8rem' }}></i>
                    <strong className="d-block text-success text-sm">Pago seguro con tarjeta (Stripe)</strong>
                    <p className="text-muted m-0 mt-1 text-xs">
                      Te llevaremos al checkout seguro de Stripe para registrar tu tarjeta. Tu mensualidad es <strong>
                        ${(() => {
                          if (data?.grupoFamiliar?.esLider && data.grupoFamiliar.miembros) {
                            let suma = data.grupoFamiliar.miembros.reduce((acc, m) => acc + (m.rolEnGrupo === 'Lider' ? (planSeleccionado?.precio || 0) : m.precioBase), 0);
                            let desc = 0; const global = data.grupoFamiliar.descuentoGlobal;
                            if (global?.tipo === 'DescuentoPorcentaje') desc = suma * ((global.valor || 0) / 100);
                            else if (global?.tipo === 'DescuentoPesos') desc = global.valor || 0;
                            else if (global?.tipo === 'PrecioFijo') desc = suma - (global.valor || suma);
                            return Math.max(suma - desc, data.grupoFamiliar.precioMinimoMensual || 0).toFixed(2);
                          }
                          return (planSeleccionado?.precio || 0).toFixed(2);
                        })()}
                      </strong> al mes.{' '}
                      {diasRestantes > 0
                        ? <>Como aún tienes <strong>{diasRestantes} día(s)</strong> de mensualidad vigente, <strong>hoy no se te cobra</strong>: el cobro automático se hará al vencer y luego cada mes.</>
                        : <>Tu mensualidad está vencida, así que el cobro se procesa ahora y se renovará automáticamente cada mes.</>}
                    </p>
                  </div>
                )}

                {metodoPago === 'Transferencia' && (
                  <div>
                    <div className="mb-3">
                      <CuentasTransferenciaTrigger
                        idBox={sub?.idBox || JSON.parse(localStorage.getItem('usuario') || '{}')?.idBoxPredeterminado || 1}
                        montoExacto={(() => {
                          if (data?.grupoFamiliar?.esLider && data.grupoFamiliar.miembros) {
                            let suma = data.grupoFamiliar.miembros.reduce((acc, m) => acc + (m.rolEnGrupo === 'Lider' ? (planSeleccionado?.precio || 0) : m.precioBase), 0);
                            let desc = 0; const global = data.grupoFamiliar.descuentoGlobal;
                            if (global?.tipo === 'DescuentoPorcentaje') desc = suma * ((global.valor || 0) / 100);
                            else if (global?.tipo === 'DescuentoPesos') desc = global.valor || 0;
                            else if (global?.tipo === 'PrecioFijo') desc = suma - (global.valor || suma);
                            return Math.max(suma - desc, data.grupoFamiliar.precioMinimoMensual || 0);
                          }
                          return (planSeleccionado?.precio || 0);
                        })()}
                      />
                    </div>

                    {diasRestantes > 0 && (
                      <div className="text-muted text-xs mb-2" style={{ lineHeight: 1.4 }}>
                        <i className="fas fa-info-circle me-1 text-info"></i>
                        Aún tienes <strong>{diasRestantes} día(s)</strong> vigentes: al pagar por adelantado, tu nuevo plan <strong>empieza cuando termine el actual</strong> (no pierdes tus días).
                      </div>
                    )}
                    <label className="dpu-modal-label mb-2"><i className="fas fa-upload me-1 text-info"></i> Sube tu comprobante de transferencia</label>
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
                              <img src={archivoComprobante?.startsWith('data:') || archivoComprobante?.startsWith('http') ? archivoComprobante : `${import.meta.env.VITE_API_URL}${archivoComprobante}`} alt="Comprobante" style={{ maxWidth: '80px', maxHeight: '50px', objectFit: 'cover', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.2)' }} />
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
                    <i className={`fas ${esVencida ? 'fa-exclamation-circle text-danger' : 'fa-store text-warning'} mb-2`} style={{ fontSize: '1.8rem' }}></i>
                    <strong className={`d-block text-sm ${esVencida ? 'text-danger' : 'text-warning'}`}>Pago en recepción</strong>
                    <p className="text-muted m-0 mt-1 text-xs" style={{ lineHeight: '1.4' }}>
                      Al confirmar, registramos tu solicitud para pagar un total de <strong>
                        ${(() => {
                          if (data?.grupoFamiliar?.esLider && data.grupoFamiliar.miembros) {
                            let suma = data.grupoFamiliar.miembros.reduce((acc, m) => acc + (m.rolEnGrupo === 'Lider' ? (planSeleccionado?.precio || 0) : m.precioBase), 0);
                            let desc = 0; const global = data.grupoFamiliar.descuentoGlobal;
                            if (global?.tipo === 'DescuentoPorcentaje') desc = suma * ((global.valor || 0) / 100);
                            else if (global?.tipo === 'DescuentoPesos') desc = global.valor || 0;
                            else if (global?.tipo === 'PrecioFijo') desc = suma - (global.valor || suma);
                            return Math.max(suma - desc, data.grupoFamiliar.precioMinimoMensual || 0).toFixed(2);
                          }
                          return (planSeleccionado?.precio || 0).toFixed(2);
                        })()}
                      </strong> en efectivo o tarjeta en la recepción del Box.{' '}
                      {esVencida
                        ? <>Tu mensualidad está vencida: <strong>pásate a pagar cuanto antes</strong> para reactivarla (sin plazo límite).</>
                        : diasRestantes <= 1
                          ? <>Te queda <strong>menos de 1 día</strong> de mensualidad; pasa a pagar antes de que venza.</>
                          : <>Puedes pagar <strong>antes de que venza tu mensualidad</strong> (el {formatFecha(sub?.fechaVencimiento)}); <strong>no pierdes tus días</strong>.</>}
                    </p>
                  </div>
                )}
              </div>

              {/* Botón de Confirmación */}
              {sinCambios && (
                <p className="text-muted text-center text-xs mb-2" style={{ fontStyle: 'italic' }}>
                  <i className="fas fa-info-circle me-1"></i>
                  Ya tienes este plan con pago en <strong>{sub?.metodoPago}</strong>. Elige un plan o método distinto para solicitar un cambio.
                </p>
              )}
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
                  disabled={subiendoArchivo || enviando || sinCambios || (metodoPago === 'Transferencia' && !archivoComprobante)}
                  style={{ borderRadius: '8px', padding: '0.4rem 1.25rem', background: 'var(--success)', border: 'none' }}
                >
                  {enviando ? 'Procesando…' : subiendoArchivo ? 'Guardando...' : (metodoPago === 'En Línea' ? 'Ir a pagar' : 'Confirmar Cambio')}
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
              src={fotoComprobanteModal?.startsWith('data:') || fotoComprobanteModal?.startsWith('http') ? fotoComprobanteModal : `${import.meta.env.VITE_API_URL}${fotoComprobanteModal}`}
              alt="Comprobante Zoom"
              style={{ width: '100%', maxHeight: '80vh', objectFit: 'contain', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
