import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import './AnunciosEngine.css';

const AnunciosEngine = ({ box, user, abrirCampania, onConsumirAbrir }) => {
  const [anuncios, setAnuncios] = useState([]);
  const [popupObligatorio, setPopupObligatorio] = useState(null);
  const [anuncioDetalle, setAnuncioDetalle] = useState(null);
  const [tabDetalle, setTabDetalle] = useState('donar'); // 'donar' | 'ranking'
  const [leaderboard, setLeaderboard] = useState([]);
  const [agradecimiento, setAgradecimiento] = useState(null);     // modal de cierre de campaña
  const [colaAgradecimientos, setColaAgradecimientos] = useState([]);
  const [iniciandoPago, setIniciandoPago] = useState(false);
  const [montoDonacion, setMontoDonacion] = useState(50); // Por defecto 50 pesos
  const [ahoraTick, setAhoraTick] = useState(() => Date.now()); // re-render por minuto para la cuenta regresiva del banner

  // Aportación por transferencia (con comprobante)
  const [metodoDonar, setMetodoDonar] = useState('stripe'); // 'stripe' | 'transferencia'
  const [cuentasTransfer, setCuentasTransfer] = useState([]);
  const [montoTransfer, setMontoTransfer] = useState(50);
  const [comprobante, setComprobante] = useState(null);
  const [subiendoComp, setSubiendoComp] = useState(false);
  const [enviandoTransfer, setEnviandoTransfer] = useState(false);

  useEffect(() => {
    if (box && user) {
      fetchAnuncios();
      confirmarDonacionStripe();
      fetchAgradecimientos();
    }
  }, [box, user]);

  // Tick por minuto: mantiene viva la cuenta regresiva ("faltan X h Y min") del banner.
  useEffect(() => {
    const id = setInterval(() => setAhoraTick(Date.now()), 60000);
    return () => clearInterval(id);
  }, []);

  // Campañas finalizadas → modal de agradecimiento (1 vez por usuario por campaña).
  const fetchAgradecimientos = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/anuncios/box/${box.idBox || box.IdBox}/usuario/${user.idUsuario || user.id}/agradecimientos`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setColaAgradecimientos(data);
        setAgradecimiento(data[0]);
      }
    } catch (error) {
      console.error('Error cargando agradecimientos:', error);
    }
  };

  const cerrarAgradecimiento = async () => {
    const actual = agradecimiento;
    // Avanzar a la siguiente de la cola (UI optimista) y marcar la vista en 2.º plano.
    const resto = colaAgradecimientos.filter(a => (a.idAnuncio || a.IdAnuncio) !== (actual.idAnuncio || actual.IdAnuncio));
    setColaAgradecimientos(resto);
    setAgradecimiento(resto[0] || null);
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/api/anuncios/${actual.idAnuncio || actual.IdAnuncio}/marcar-agradecimiento/${user.idUsuario || user.id}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
    } catch (error) { /* best-effort */ }
  };

  // Abrir una campaña concreta cuando llega desde una notificación (campanita).
  useEffect(() => {
    if (!abrirCampania) return;
    const idNum = Number(abrirCampania);
    if (!idNum) { onConsumirAbrir?.(); return; }          // id inválido: limpia el pedido y sal
    // Mientras la lista aún no carga, NO consumimos el pedido: el efecto vuelve a correr al llegar `anuncios`.
    if (anuncios.length === 0) return;
    const found = anuncios.find(a => (a.idAnuncio || a.IdAnuncio) === idNum);
    if (found) {
      // Cierra el popup obligatorio (si estuviera abierto) para que el detalle no quede tapado por él.
      setPopupObligatorio(null);
      abrirDetalle(found);
    }
    onConsumirAbrir?.();
  }, [abrirCampania, anuncios]);

  // Confirma el donativo Stripe al volver de la pasarela (?donacion_success=1&session_id=...),
  // por si el webhook no llegó (local). Idempotente en el backend → nunca cuenta doble.
  const confirmarDonacionStripe = async () => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('donacion_success') !== '1') return;
      const sessionId = params.get('session_id');
      // Limpiar la URL para no reprocesar al recargar.
      const limpia = window.location.pathname;
      window.history.replaceState({}, '', limpia);
      if (!sessionId) { alert('¡Gracias por tu donativo!'); return; }
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/finanzas/confirmar-donacion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ idBox: box.idBox || box.IdBox, sessionId })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && !data.pendiente) {
        alert(data.yaRegistrada ? '¡Gracias! Tu donativo ya estaba registrado.' : '¡Donativo registrado con éxito! Gracias por tu apoyo.');
        fetchAnuncios();
      }
    } catch (error) {
      console.error('Error confirmando donativo:', error);
    }
  };

  const fetchAnuncios = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/anuncios/box/${box.idBox || box.IdBox}/atleta/${user.idUsuario || user.id}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAnuncios(data);
        
        // Buscar si hay alguno que NO ha visto para lanzarlo como popup obligatorio
        const noVisto = data.find(a => !a.yaVisto);
        if (noVisto) {
          setPopupObligatorio(noVisto);
        }
      }
    } catch (error) {
      console.error(error);
    }
  };

  const marcarComoVisto = async (idAnuncio) => {
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/api/anuncios/${idAnuncio}/marcar-visto/${user.idUsuario || user.id}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      // Cerrar popup
      setPopupObligatorio(null);
      // Actualizar estado local para que no vuelva a saltar
      setAnuncios(prev => prev.map(a => a.idAnuncio === idAnuncio ? { ...a, yaVisto: true } : a));
    } catch (error) {
      console.error(error);
      setPopupObligatorio(null);
    }
  };

  const abrirDetalle = async (anuncio) => {
    setAnuncioDetalle(anuncio);
    // Reiniciar el flujo de aportación
    const aceptaStripe = anuncio.aceptarDonacionesStripe || anuncio.AceptarDonacionesStripe;
    const enCorreccion = anuncio.tieneCorreccion || anuncio.TieneCorreccion;
    // Si hay un comprobante devuelto a corrección, lo llevamos directo a transferencia para corregir.
    setMetodoDonar(enCorreccion ? 'transferencia' : (aceptaStripe ? 'stripe' : 'transferencia'));
    setMontoTransfer(50);
    setComprobante(null);
    setTabDetalle('donar');
    cargarCuentas(anuncio.idAnuncio || anuncio.IdAnuncio);
    if (anuncio.mostrarRankingDonadores) {
      cargarLeaderboard(anuncio.idAnuncio);
    } else {
      setLeaderboard([]);
    }
  };

  const cargarCuentas = async (idAnuncio) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/anuncios/${idAnuncio}/cuentas-transferencia`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      setCuentasTransfer(res.ok ? await res.json() : []);
    } catch (error) {
      setCuentasTransfer([]);
    }
  };

  const handleArchivoComprobante = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type || !file.type.startsWith('image/')) { alert('Solo se aceptan imágenes (JPG o PNG).'); return; }
    if (file.size > 5 * 1024 * 1024) { alert('La imagen no puede superar los 5 MB.'); return; }
    setSubiendoComp(true);
    const reader = new FileReader();
    reader.onload = () => { setComprobante(reader.result); setSubiendoComp(false); };
    reader.onerror = () => { setSubiendoComp(false); alert('No se pudo leer la imagen. Intenta de nuevo.'); };
    reader.readAsDataURL(file);
  };

  const copiar = (texto) => {
    try { navigator.clipboard.writeText(texto); alert('Copiado al portapapeles.'); } catch { /* noop */ }
  };

  const handleDonarTransferencia = async () => {
    if (!montoTransfer || parseFloat(montoTransfer) <= 0) return alert('Ingresa el monto que transferiste.');
    if (!comprobante) return alert('Adjunta la captura de tu comprobante de transferencia.');
    setEnviandoTransfer(true);
    try {
      const idA = anuncioDetalle.idAnuncio || anuncioDetalle.IdAnuncio;
      // Si ya tengo un comprobante DEVUELTO A CORRECCIÓN, reenvío sobre el MISMO registro.
      const idCorreccion = anuncioDetalle.idDonacionCorreccion || anuncioDetalle.IdDonacionCorreccion;
      const url = idCorreccion
        ? `${import.meta.env.VITE_API_URL}/api/anuncios/donaciones/${idCorreccion}/reenviar-comprobante`
        : `${import.meta.env.VITE_API_URL}/api/anuncios/${idA}/donar-transferencia`;
      const res = await fetch(url, {
        method: idCorreccion ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ idUsuario: user.idUsuario || user.id, montoReportado: parseFloat(montoTransfer), comprobanteUrl: comprobante })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        alert(data.mensaje || 'Comprobante enviado. Queda en revisión del administrador del box.');
        setAnuncioDetalle(null);
        fetchAnuncios();
      } else {
        alert(data.mensaje || 'No se pudo enviar el comprobante.');
      }
    } catch (error) {
      alert('Error de red al enviar el comprobante.');
    } finally {
      setEnviandoTransfer(false);
    }
  };

  const cargarLeaderboard = async (idAnuncio) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/anuncios/${idAnuncio}/leaderboard`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        setLeaderboard(await res.json());
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleDonarStripe = async () => {
    if (montoDonacion < 20) return alert('El monto mínimo es de $20 MXN.');
    setIniciandoPago(true);
    try {
      const payload = {
        idAnuncio: anuncioDetalle.idAnuncio,
        idUsuario: user.idUsuario || user.id,
        monto: parseFloat(montoDonacion)
      };

      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/finanzas/checkout-donacion/${box.idBox || box.IdBox}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      if (res.ok && data.url) {
        window.location.href = data.url;
      } else {
        alert(data.mensaje || 'Error al conectar con el procesador de pagos.');
      }
    } catch (error) {
      alert('Error de red.');
    } finally {
      setIniciandoPago(false);
    }
  };
  const getDiffDays = (fechaFinStr) => {
    if (!fechaFinStr) return null;
    const fin = new Date(fechaFinStr);
    const hoy = new Date();
    fin.setHours(0,0,0,0);
    hoy.setHours(0,0,0,0);
    const diffTime = fin - hoy;
    if (isNaN(diffTime)) return null;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const formatDateRange = (inicioStr, finStr) => {
    if (!inicioStr || !finStr) return '';
    const inicio = new Date(inicioStr);
    const fin = new Date(finStr);
    if (isNaN(inicio.getTime()) || isNaN(fin.getTime())) return '';
    
    const optionsShort = { day: '2-digit', month: 'short' };
    const optionsLong = { day: '2-digit', month: 'short', year: 'numeric' };
    return `${inicio.toLocaleDateString('es-MX', optionsShort)} al ${fin.toLocaleDateString('es-MX', optionsLong)}`;
  };

  // Fecha + HORA exacta de término de la campaña (lo que pidió el usuario para el banner).
  const formatFechaHoraFin = (finStr) => {
    if (!finStr) return '';
    const fin = new Date(finStr);
    if (isNaN(fin.getTime())) return '';
    return fin.toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  // Cuenta regresiva legible hasta FechaFin. `ahora` (= ahoraTick) avanza cada minuto y mantiene
  // el cálculo puro durante el render: la lectura del reloj vive en el intervalo, no aquí.
  const tiempoRestante = (finStr, ahora) => {
    if (!finStr) return null;
    const fin = new Date(finStr).getTime();
    if (isNaN(fin)) return null;
    const diff = fin - ahora;
    if (diff <= 0) return { vencida: true, dias: 0, texto: 'Finalizada' };
    const dias = Math.floor(diff / 86400000);
    const horas = Math.floor((diff % 86400000) / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    let texto;
    if (dias > 0) texto = `Faltan ${dias} ${dias === 1 ? 'día' : 'días'} ${horas} h`;
    else if (horas > 0) texto = `Faltan ${horas} h ${mins} min`;
    else texto = `Faltan ${mins} min`;
    return { vencida: false, dias, horas, mins, texto };
  };

  // Validaciones de UI paramétricas
  if (!anuncios || anuncios.length === 0) return null;

  // Extracción de datos del Popup Obligatorio de forma segura
  const pTitulo = popupObligatorio ? (popupObligatorio.titulo || popupObligatorio.Titulo) : '';
  const pMensaje = popupObligatorio ? (popupObligatorio.mensaje || popupObligatorio.Mensaje) : '';
  const pAceptarDonaciones = popupObligatorio ? (popupObligatorio.aceptarDonaciones || popupObligatorio.AceptarDonaciones) : false;
  const pMetaDonacion = popupObligatorio ? (popupObligatorio.metaDonacion || popupObligatorio.MetaDonacion || 0) : 0;
  const pTotalRecaudado = popupObligatorio ? (popupObligatorio.totalRecaudado || popupObligatorio.TotalRecaudado || 0) : 0;
  const pFechaInicio = popupObligatorio ? (popupObligatorio.fechaInicio || popupObligatorio.FechaInicio) : null;
  const pFechaFin = popupObligatorio ? (popupObligatorio.fechaFin || popupObligatorio.FechaFin) : null;
  const pIdAnuncio = popupObligatorio ? (popupObligatorio.idAnuncio || popupObligatorio.IdAnuncio) : null;

  // Extracción de datos del Anuncio Detalle de forma segura
  const dTitulo = anuncioDetalle ? (anuncioDetalle.titulo || anuncioDetalle.Titulo) : '';
  const dMensaje = anuncioDetalle ? (anuncioDetalle.mensaje || anuncioDetalle.Mensaje) : '';
  const dAceptarDonaciones = anuncioDetalle ? (anuncioDetalle.aceptarDonaciones || anuncioDetalle.AceptarDonaciones) : false;
  const dMetaDonacion = anuncioDetalle ? (anuncioDetalle.metaDonacion || anuncioDetalle.MetaDonacion || 0) : 0;
  const dTotalRecaudado = anuncioDetalle ? (anuncioDetalle.totalRecaudado || anuncioDetalle.TotalRecaudado || 0) : 0;
  const dFechaInicio = anuncioDetalle ? (anuncioDetalle.fechaInicio || anuncioDetalle.FechaInicio) : null;
  const dFechaFin = anuncioDetalle ? (anuncioDetalle.fechaFin || anuncioDetalle.FechaFin) : null;
  const dIdAnuncio = anuncioDetalle ? (anuncioDetalle.idAnuncio || anuncioDetalle.IdAnuncio) : null;
  const dMostrarRankingDonadores = anuncioDetalle ? (anuncioDetalle.mostrarRankingDonadores || anuncioDetalle.MostrarRankingDonadores) : false;
  const dAceptarStripe = anuncioDetalle ? (anuncioDetalle.aceptarDonacionesStripe || anuncioDetalle.AceptarDonacionesStripe) : false;
  const dTienePendiente = anuncioDetalle ? (anuncioDetalle.tienePendiente || anuncioDetalle.TienePendiente) : false;
  const dTieneCorreccion = anuncioDetalle ? (anuncioDetalle.tieneCorreccion || anuncioDetalle.TieneCorreccion) : false;
  const dNotaCorreccion = anuncioDetalle ? (anuncioDetalle.notaCorreccion || anuncioDetalle.NotaCorreccion) : null;
  const dHayTransferencia = cuentasTransfer.length > 0;

  return (
    <>
      {/* ========================================================
          BANNER PRINCIPAL (Renderiza arriba en el UserPanel)
      ======================================================== */}
      <div className="ae-banners">
        {anuncios.map(anuncio => {
          const esDonativo = anuncio.aceptarDonaciones || anuncio.AceptarDonaciones;
          const bPendiente = anuncio.tienePendiente || anuncio.TienePendiente;
          const bCorreccion = anuncio.tieneCorreccion || anuncio.TieneCorreccion;
          const meta = anuncio.metaDonacion || anuncio.MetaDonacion || 0;
          const recaudado = anuncio.totalRecaudado || anuncio.TotalRecaudado || 0;
          const finStr = anuncio.fechaFin || anuncio.FechaFin;
          const pct = meta > 0 ? Math.min((recaudado / meta) * 100, 100) : 0;
          const restante = tiempoRestante(finStr, ahoraTick);
          return (
            <div
              key={anuncio.idAnuncio || anuncio.IdAnuncio}
              className={`ae-banner ${esDonativo ? 'ae-banner--donativo' : ''}`}
              onClick={() => abrirDetalle(anuncio)}
            >
              <div className="ae-banner-top">
                <div className="ae-banner-left">
                  <div className="ae-banner-icon">
                    <i className={`fas ${esDonativo ? 'fa-hand-holding-heart' : 'fa-bullhorn'}`}></i>
                  </div>
                  <div className="ae-banner-text">
                    <h6 className="ae-banner-title">{anuncio.titulo || anuncio.Titulo}</h6>
                    <small className="ae-banner-msg">
                      {anuncio.mensaje || anuncio.Mensaje}
                    </small>
                  </div>
                </div>
                <div className="ae-banner-right">
                  {esDonativo && (
                    <span className="ae-banner-cta">
                      <i className="fas fa-heart"></i> Apoyar Causa
                    </span>
                  )}
                  {bPendiente && (
                    <span className="ae-banner-chip ae-banner-chip--pendiente">
                      <i className="fas fa-hourglass-half"></i> En revisión
                    </span>
                  )}
                  {bCorreccion && (
                    <span className="ae-banner-chip ae-banner-chip--correccion">
                      <i className="fas fa-triangle-exclamation"></i> Corregir
                    </span>
                  )}
                </div>
              </div>

              {/* Barra de progreso de la recaudación (solo campañas de donativo con meta) */}
              {esDonativo && meta > 0 && (
                <div className="ae-banner-progress">
                  <div className="ae-banner-progress-labels">
                    <span className="ae-banner-progress-recaudado">${recaudado.toFixed(2)}</span>
                    <span className="ae-banner-progress-meta">Meta ${meta}</span>
                  </div>
                  <div className="ae-banner-progress-track">
                    <div className="ae-banner-progress-fill" role="progressbar" style={{ width: `${pct}%` }}></div>
                  </div>
                </div>
              )}

              {/* Fecha y hora exactas de término + cuenta regresiva en vivo */}
              {finStr && (
                <div className="ae-banner-foot">
                  <span className="ae-banner-foot-fecha">
                    <i className="far fa-clock"></i> Termina: {formatFechaHoraFin(finStr)}
                  </span>
                  {restante && (
                    <span className={`ae-banner-foot-restante ${restante.vencida ? 'ae-banner-foot-restante--fin' : (restante.dias === 0 ? 'ae-banner-foot-restante--urgente' : '')}`}>
                      <i className={`fas ${restante.vencida ? 'fa-flag-checkered' : 'fa-hourglass-half'}`}></i> {restante.texto}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ========================================================
          MODAL DE POPUP OBLIGATORIO (Aparece 1 vez)
      ======================================================== */}
      {popupObligatorio && createPortal(
        <div className="ae-overlay">
          <div className={`ae-modal ${pAceptarDonaciones ? 'ae-modal--donativo' : ''}`}>
            <div className="ae-popup-hero">
              <div className="ae-popup-hero-icon">
                <i className={`fas ${pAceptarDonaciones ? 'fa-hand-holding-heart' : 'fa-bullhorn'}`}></i>
              </div>
              <h3 className="ae-popup-hero-title">{pTitulo}</h3>
            </div>
            <div className="ae-modal-body ae-popup-body">
              {/* Fechas de vigencia y Días restantes para Popup */}
              {pFechaInicio && pFechaFin && (
                <div className="ae-fechas ae-fechas--center">
                  <span className="ae-chip ae-chip--vigencia">
                    <i className="far fa-calendar-alt"></i>
                    Vigencia: {formatDateRange(pFechaInicio, pFechaFin)}
                  </span>
                  {(() => {
                    const diffDays = getDiffDays(pFechaFin);
                    if (diffDays === null) return null;
                    if (diffDays > 0) {
                      return (
                        <span className="ae-chip ae-chip--restantes">
                          <i className="fas fa-hourglass-half"></i>
                          {diffDays} {diffDays === 1 ? 'día restante' : 'días restantes'}
                        </span>
                      );
                    } else if (diffDays === 0) {
                      return (
                        <span className="ae-chip ae-chip--ultimo">
                          <i className="fas fa-hourglass-end"></i>
                          ¡Último día hoy!
                        </span>
                      );
                    } else {
                      return (
                        <span className="ae-chip ae-chip--finalizada">
                          Finalizada
                        </span>
                      );
                    }
                  })()}
                </div>
              )}

              <div className="ae-mensaje ae-mensaje--popup">
                {pMensaje}
              </div>

              {pAceptarDonaciones && (
                <div className="ae-recaudacion">
                  <h5 className="ae-recaudacion-title"><i className="fas fa-hand-holding-heart me-2"></i>Campaña de Recaudación</h5>
                  {pMetaDonacion > 0 && (
                    <div className="ae-progress-wrap">
                      <div className="ae-progress-labels">
                        <span className="ae-progress-recaudado">Recaudado: ${pTotalRecaudado.toFixed(2)}</span>
                        <span className="ae-progress-meta">Meta: ${pMetaDonacion}</span>
                      </div>
                      <div className="ae-progress-track">
                        <div className="ae-progress-fill" role="progressbar" style={{ width: `${Math.min((pTotalRecaudado / pMetaDonacion) * 100, 100)}%` }}></div>
                      </div>
                    </div>
                  )}
                  <button
                    className="ae-btn-apoyar"
                    onClick={() => {
                      // Pasar al modal de detalle directamente para que donen ahí
                      const elAnuncio = popupObligatorio;
                      marcarComoVisto(pIdAnuncio).then(() => {
                        abrirDetalle(elAnuncio);
                      });
                    }}
                  >
                    <i className="fas fa-heart"></i> Ver Detalles y Apoyar
                  </button>

                  {/* Banner de donación física en recepción dentro del popup */}
                  <div className="ae-recepcion">
                    <span className="ae-recepcion-title">
                      <i className="fas fa-cash-register"></i>¿Prefieres donar físicamente?
                    </span>
                    <span className="ae-recepcion-text">
                      ¡También es posible! Puedes registrar tu aportación en efectivo, transferencia bancaria o tarjeta directamente en la recepción del Box con el Administrador.
                    </span>
                  </div>
                </div>
              )}
            </div>
            <div className="ae-modal-foot">
              <button type="button" className="ae-btn-secundario" onClick={() => marcarComoVisto(pIdAnuncio)}>
                Entendido
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ========================================================
          MODAL DE DETALLE / LEADERBOARD / DONAR
      ======================================================== */}
      {anuncioDetalle && !popupObligatorio && createPortal(
        <div className="ae-overlay">
          <div className={`ae-modal ${dAceptarDonaciones ? 'ae-modal--donativo' : ''}`}>
            <div className="ae-modal-head">
              <div className="ae-modal-head-icon">
                <i className={`fas ${dAceptarDonaciones ? 'fa-hand-holding-heart' : 'fa-info-circle'}`}></i>
              </div>
              <h5 className="ae-modal-title">{dTitulo}</h5>
              <button type="button" className="ae-close" onClick={() => setAnuncioDetalle(null)} aria-label="Cerrar">
                <i className="fas fa-xmark"></i>
              </button>
            </div>
            <div className="ae-modal-body">

              {/* Período de vigencia y Días restantes en Modal Detalle */}
              {dFechaInicio && dFechaFin && (
                <div className="ae-fechas">
                  <span className="ae-chip ae-chip--vigencia">
                    <i className="far fa-calendar-alt"></i>
                    Vigencia: {formatDateRange(dFechaInicio, dFechaFin)}
                  </span>
                  {(() => {
                    const diffDays = getDiffDays(dFechaFin);
                    if (diffDays === null) return null;
                    if (diffDays > 0) {
                      return (
                        <span className="ae-chip ae-chip--restantes">
                          <i className="fas fa-hourglass-half"></i>
                          {diffDays} {diffDays === 1 ? 'día restante' : 'días restantes'}
                        </span>
                      );
                    } else if (diffDays === 0) {
                      return (
                        <span className="ae-chip ae-chip--ultimo">
                          <i className="fas fa-hourglass-end"></i>
                          ¡Último día hoy!
                        </span>
                      );
                    } else {
                      return (
                        <span className="ae-chip ae-chip--finalizada">
                          Finalizada
                        </span>
                      );
                    }
                  })()}
                </div>
              )}

              <div className="ae-mensaje ae-mensaje--detalle">
                {dMensaje}
              </div>

              {dAceptarDonaciones && (
                <>
                  {/* Pestañas: Donar / Ver Ranking (solo si la campaña muestra leaderboard) */}
                  {dMostrarRankingDonadores && (
                    <div className="ae-tabs">
                      <button type="button" className={`ae-tab ${tabDetalle === 'donar' ? 'ae-tab--activo' : ''}`} onClick={() => setTabDetalle('donar')}>
                        <i className="fas fa-hand-holding-heart"></i> Donar
                      </button>
                      <button type="button" className={`ae-tab ${tabDetalle === 'ranking' ? 'ae-tab--activo' : ''}`} onClick={() => setTabDetalle('ranking')}>
                        <i className="fas fa-medal"></i> Ver Ranking
                      </button>
                    </div>
                  )}

                  {/* Zona de Donación */}
                  {(!dMostrarRankingDonadores || tabDetalle === 'donar') && (
                    <div className="ae-donar-card">
                      <div className="ae-donar-head">
                        <i className="fas fa-hand-holding-usd ae-donar-head-icon"></i>
                        <h5 className="ae-donar-head-title">Apoyar a la causa</h5>
                      </div>

                      {dMetaDonacion > 0 && (
                        <div className="ae-progress-wrap">
                          <div className="ae-progress-labels">
                            <span className="ae-progress-recaudado">${dTotalRecaudado.toFixed(2)}</span>
                            <span className="ae-progress-meta">Meta: ${dMetaDonacion}</span>
                          </div>
                          <div className="ae-progress-track">
                            <div className="ae-progress-fill" role="progressbar" style={{ width: `${Math.min((dTotalRecaudado / dMetaDonacion) * 100, 100)}%` }}></div>
                          </div>
                        </div>
                      )}

                      {/* Estado de mi aportación previa */}
                      {dTienePendiente && (
                        <div className="ae-estado ae-estado--pendiente">
                          <i className="fas fa-hourglass-half"></i>
                          <span>Tu aportación por transferencia está en revisión del administrador.</span>
                        </div>
                      )}
                      {dTieneCorreccion && (
                        <div className="ae-estado ae-estado--correccion">
                          <i className="fas fa-triangle-exclamation"></i>
                          <span>
                            Tu comprobante necesita corrección. Reenvíalo abajo.
                            {dNotaCorreccion && <span className="ae-estado-motivo">Motivo: {dNotaCorreccion}</span>}
                          </span>
                        </div>
                      )}

                      {/* Selector de método (si hay dos disponibles) */}
                      {dAceptarStripe && dHayTransferencia && (
                        <div className="ae-metodos">
                          <button type="button" className={`ae-metodo-btn ${metodoDonar === 'stripe' ? 'ae-metodo-btn--activo' : ''}`} onClick={() => setMetodoDonar('stripe')}>
                            <i className="fas fa-credit-card"></i> En línea
                          </button>
                          <button type="button" className={`ae-metodo-btn ${metodoDonar === 'transferencia' ? 'ae-metodo-btn--activo' : ''}`} onClick={() => setMetodoDonar('transferencia')}>
                            <i className="fas fa-building-columns"></i> Transferencia
                          </button>
                        </div>
                      )}

                      {/* MÉTODO: STRIPE (donante absorbe la comisión) */}
                      {dAceptarStripe && metodoDonar === 'stripe' && (
                        <>
                          <div className="ae-monto-group">
                            <span className="ae-monto-affix">$</span>
                            <input type="number" className="ae-monto-input"
                              value={montoDonacion} onChange={(e) => setMontoDonacion(e.target.value)} min="20" step="10" />
                            <span className="ae-monto-affix">MXN</span>
                          </div>
                          <div className="ae-nota-comision">
                            <i className="fas fa-circle-info me-1"></i> La causa recibe <b>${parseFloat(montoDonacion || 0).toFixed(2)}</b>. La comisión de la pasarela la cubres tú; verás el total exacto en el checkout de Stripe.
                          </div>
                          <button className="ae-btn-donar ae-btn-donar--stripe"
                            onClick={handleDonarStripe} disabled={iniciandoPago}>
                            {iniciandoPago ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-credit-card"></i>}
                            Pagar Donativo
                          </button>
                        </>
                      )}

                      {/* MÉTODO: TRANSFERENCIA con comprobante */}
                      {dHayTransferencia && metodoDonar === 'transferencia' && (
                        <div className="ae-transfer">
                          <span className="ae-transfer-title">
                            <i className="fas fa-building-columns"></i> Transfiere a una de estas cuentas:
                          </span>
                          {cuentasTransfer.map(c => (
                            <div key={c.idCuentaTransferencia} className="ae-cuenta">
                              <div className="ae-cuenta-row">
                                <span className="ae-cuenta-banco">{c.banco}</span>
                                <span className="ae-cuenta-benef">{c.beneficiario}</span>
                              </div>
                              <div className="ae-cuenta-row ae-cuenta-clabe">
                                <span className="ae-cuenta-clabe-val">CLABE {c.clabe}</span>
                                <button type="button" className="ae-copiar-btn" onClick={() => copiar(c.clabe)} title="Copiar CLABE">
                                  <i className="fas fa-copy"></i>
                                </button>
                              </div>
                            </div>
                          ))}

                          <label className="ae-monto-label">Monto que transferiste (MXN)</label>
                          <div className="ae-monto-group">
                            <span className="ae-monto-affix">$</span>
                            <input type="number" className="ae-monto-input"
                              value={montoTransfer} onChange={(e) => setMontoTransfer(e.target.value)} min="1" step="any" />
                          </div>

                          <label htmlFor="ae-comprobante" className="ae-uploader">
                            {subiendoComp ? (
                              <><i className="fas fa-spinner fa-spin ae-uploader-icon ae-uploader-icon--spin"></i><span className="ae-uploader-hint">Cargando...</span></>
                            ) : comprobante ? (
                              <><i className="fas fa-check-circle ae-uploader-icon ae-uploader-icon--ok"></i><span className="ae-uploader-main ae-uploader-main--ok">Comprobante cargado ✓</span><span className="ae-uploader-hint">Toca para cambiar</span></>
                            ) : (
                              <><i className="fas fa-cloud-upload-alt ae-uploader-icon"></i><span className="ae-uploader-main">Sube tu comprobante</span><span className="ae-uploader-hint">JPG o PNG, máx 5 MB</span></>
                            )}
                          </label>
                          <input id="ae-comprobante" type="file" accept="image/*" onChange={handleArchivoComprobante} style={{ display: 'none' }} />

                          <button className="ae-btn-donar ae-btn-donar--transfer"
                            onClick={handleDonarTransferencia} disabled={enviandoTransfer || subiendoComp}>
                            {enviandoTransfer ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-paper-plane"></i>}
                            {dTieneCorreccion ? 'Reenviar comprobante' : 'Enviar comprobante'}
                          </button>
                          <div className="ae-transfer-foot">El administrador del box revisará tu comprobante y confirmará tu aportación.</div>
                        </div>
                      )}

                      {/* Banner alternativo para donar en recepción */}
                      <div className="ae-recepcion">
                        <span className="ae-recepcion-title">
                          <i className="fas fa-cash-register"></i>¿Prefieres aportar en efectivo?
                        </span>
                        <span className="ae-recepcion-text">
                          También puedes registrar tu aportación en efectivo, transferencia o tarjeta directamente en la recepción del Box con el administrador.
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Leaderboard (pestaña Ver Ranking) */}
                  {dMostrarRankingDonadores && tabDetalle === 'ranking' && (
                    <div className="ae-leader-card">
                        <h6 className="ae-leader-title">
                          <i className="fas fa-medal"></i>Top Donadores
                        </h6>

                        {leaderboard.length === 0 ? (
                          <div className="ae-leader-empty">
                            <i className="fas fa-ghost"></i>
                            Aún no hay aportaciones.<br/>¡Sé el primero de la comunidad!
                          </div>
                        ) : (
                          <div className="ae-leader-list">
                            {leaderboard.map((item, index) => (
                              <div key={index} className={`ae-leader-item ${index === 0 ? 'ae-leader-item--top1' : ''}`}>
                                <div className="ae-leader-item-left">
                                  <div className="ae-leader-pos">
                                    {index === 0 ? <i className="fas fa-medal ae-leader-medal"></i> : `#${index + 1}`}
                                  </div>
                                  <div className="ae-leader-avatar">
                                    {(item.atleta?.nombre || '?').charAt(0).toUpperCase()}
                                  </div>
                                  <div className="ae-leader-nombre">
                                    {item.atleta?.nombre.split(' ')[0]}
                                  </div>
                                </div>
                                <div className="ae-leader-monto">
                                  ${item.totalDonado.toFixed(0)}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                  )}
                </>
              )}

            </div>
            <div className="ae-modal-foot">
              <button type="button" className="ae-btn-secundario" onClick={() => setAnuncioDetalle(null)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ========================================================
          MODAL DE AGRADECIMIENTO (al finalizar la campaña)
      ======================================================== */}
      {agradecimiento && !popupObligatorio && createPortal(
        <div className="ae-overlay">
          <div className="ae-modal ae-modal--donativo ae-thanks">
            <div className="ae-thanks-hero">
              <div className="ae-thanks-trophy"><i className="fas fa-trophy"></i></div>
              <span className="ae-thanks-fin"><i className="fas fa-flag-checkered me-1"></i>Campaña finalizada</span>
              <h3 className="ae-thanks-titulo">{agradecimiento.titulo}</h3>
            </div>
            <div className="ae-modal-body ae-thanks-body">
              <div className="ae-thanks-donante">
                <div className="ae-thanks-corona"><i className="fas fa-crown"></i></div>
                <div className="ae-thanks-avatar">
                  {agradecimiento.topDonante?.foto
                    ? <img src={agradecimiento.topDonante.foto} alt="" />
                    : <span>{(agradecimiento.topDonante?.nombre || '?').charAt(0).toUpperCase()}</span>}
                </div>
                <div className="ae-thanks-nombre">
                  {[agradecimiento.topDonante?.nombre, agradecimiento.topDonante?.apellidos].filter(Boolean).join(' ') || 'Donante'}
                </div>
                <div className="ae-thanks-monto">
                  ${Number(agradecimiento.topDonante?.total || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="ae-thanks-rol"><i className="fas fa-medal me-1"></i>Mayor donante</div>
              </div>

              {agradecimiento.esTopDonante ? (
                <div className="ae-thanks-msg ae-thanks-msg--top">
                  <i className="fas fa-heart ae-thanks-msg-icon"></i>
                  <p>¡Gracias por tu apoyo, <b>{agradecimiento.topDonante?.nombre}</b>! 🙌 Fuiste quien más aportó a esta causa. Tu generosidad hizo la diferencia para toda la comunidad del box.</p>
                </div>
              ) : (
                <div className="ae-thanks-msg">
                  <i className="fas fa-hands-clapping ae-thanks-msg-icon"></i>
                  <p>¡Gracias a toda la comunidad por su apoyo! El mayor donante de esta campaña fue <b>{[agradecimiento.topDonante?.nombre, agradecimiento.topDonante?.apellidos].filter(Boolean).join(' ')}</b>. 👏</p>
                </div>
              )}

              {agradecimiento.totalRecaudado > 0 && (
                <div className="ae-thanks-total">
                  <span>Recaudado en total</span>
                  <b>${Number(agradecimiento.totalRecaudado).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b>
                  {agradecimiento.metaDonacion > 0 && agradecimiento.totalRecaudado >= agradecimiento.metaDonacion && (
                    <span className="ae-thanks-meta"><i className="fas fa-circle-check me-1"></i>¡Meta cumplida!</span>
                  )}
                </div>
              )}

              {/* Leaderboard final de donadores (la campaña tenía activado mostrar ranking) */}
              {Array.isArray(agradecimiento.leaderboard) && agradecimiento.leaderboard.length > 1 && (
                <div className="ae-leader-card ae-thanks-leader">
                  <h6 className="ae-leader-title"><i className="fas fa-medal"></i>Leaderboard de donadores</h6>
                  <div className="ae-leader-list">
                    {agradecimiento.leaderboard.map((item, index) => (
                      <div key={item.idUsuario ?? index} className={`ae-leader-item ${index === 0 ? 'ae-leader-item--top1' : ''}`}>
                        <div className="ae-leader-item-left">
                          <div className="ae-leader-pos">
                            {index === 0 ? <i className="fas fa-medal ae-leader-medal"></i> : `#${index + 1}`}
                          </div>
                          <div className="ae-leader-avatar">
                            {item.atleta?.foto
                              ? <img src={item.atleta.foto} alt="" />
                              : (item.atleta?.nombre || '?').charAt(0).toUpperCase()}
                          </div>
                          <div className="ae-leader-nombre">{(item.atleta?.nombre || 'Donante').split(' ')[0]}</div>
                        </div>
                        <div className="ae-leader-monto">${Number(item.totalDonado || 0).toFixed(0)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="ae-modal-foot">
              <button type="button" className="ae-btn-donar ae-btn-donar--stripe" onClick={cerrarAgradecimiento}>
                {agradecimiento.esTopDonante ? '¡Con gusto!' : '¡Listo!'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default AnunciosEngine;
