import { useState, useEffect } from 'react';
import { VENTAS_ENDPOINT } from '../services/api';
import BackButton from '../components/BackButton';
import AtletifyLoader from '../components/AtletifyLoader';
import '../assets/css/MisFiados.css';

export default function MisFiados() {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('pendientes');

  const [modalAbonoOpen, setModalAbonoOpen] = useState(false);
  const [montoAbono, setMontoAbono] = useState('');
  const [comprobanteBase64, setComprobanteBase64] = useState(null);
  const [procesando, setProcesando] = useState(false);

  const [modalRechazados, setModalRechazados] = useState(false);
  const [abonosRechazados, setAbonosRechazados] = useState([]);

  useEffect(() => { cargarPedidos(); }, []);

  const cargarPedidos = async () => {
    setLoading(true);
    try {
      const usuarioObj = JSON.parse(localStorage.getItem('usuario'));
      const idUsuario = usuarioObj?.id || usuarioObj?.idUsuario;
      if (!idUsuario) { setLoading(false); return; }

      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [resPedidos, resRechazados] = await Promise.all([
        fetch(`${VENTAS_ENDPOINT}/fiados/mis-deudas/${idUsuario}`, { headers }),
        fetch(`${VENTAS_ENDPOINT}/fiados/mis-abonos-rechazados/${idUsuario}`, { headers })
      ]);

      if (resPedidos.ok) setPedidos(await resPedidos.json());
      if (resRechazados.ok) {
        const rechazados = await resRechazados.json();
        verificarRechazados(rechazados);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const verificarRechazados = (rechazados) => {
    if (!rechazados.length) return;
    const vistasStr = sessionStorage.getItem('mdf_rechazados_vistos') || '[]';
    const vistas = JSON.parse(vistasStr);
    const nuevas = rechazados.filter(a => !vistas.includes(a.idAbono));
    if (nuevas.length > 0) {
      setAbonosRechazados(nuevas);
      setModalRechazados(true);
    }
  };

  const cerrarModalRechazados = () => {
    const vistasStr = sessionStorage.getItem('mdf_rechazados_vistos') || '[]';
    const vistas = JSON.parse(vistasStr);
    const actualizadas = [...new Set([...vistas, ...abonosRechazados.map(a => a.idAbono)])];
    sessionStorage.setItem('mdf_rechazados_vistos', JSON.stringify(actualizadas));
    setModalRechazados(false);
  };

  const reenviarComprobante = () => {
    cerrarModalRechazados();
    abrirModal();
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) { setComprobanteBase64(null); return; }
    const reader = new FileReader();
    reader.onloadend = () => setComprobanteBase64(reader.result);
    reader.readAsDataURL(file);
  };

  const abrirModal = () => {
    setMontoAbono('');
    setComprobanteBase64(null);
    setModalAbonoOpen(true);
  };

  const enviarAbono = async () => {
    if (!montoAbono || isNaN(montoAbono) || parseFloat(montoAbono) <= 0) {
      alert('Ingresa un monto válido mayor a 0.'); return;
    }
    if (parseFloat(montoAbono) > totalDeuda) {
      alert(`No puedes abonar más del monto restante ($${totalDeuda.toFixed(2)}).`); return;
    }
    if (!comprobanteBase64) {
      alert('Por favor sube una foto del comprobante de transferencia.'); return;
    }
    setProcesando(true);
    try {
      const usuarioObj = JSON.parse(localStorage.getItem('usuario'));
      const idUsuario = usuarioObj?.id || usuarioObj?.idUsuario;
      const boxActivo = localStorage.getItem('boxActivo');
      const boxObj = localStorage.getItem('box');
      let idBox = null;
      if (boxActivo) idBox = JSON.parse(boxActivo);
      else if (boxObj) idBox = JSON.parse(boxObj)?.idBox;
      else if (usuarioObj?.idBoxPredeterminado) idBox = usuarioObj.idBoxPredeterminado;

      if (!idUsuario || !idBox) { alert('Error: No se pudo identificar tu cuenta o tu box.'); return; }

      const res = await fetch(`${VENTAS_ENDPOINT}/fiados/solicitar-abono-global/${idBox}/${idUsuario}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ monto: parseFloat(montoAbono), comprobanteBase64 })
      });
      if (res.ok) {
        alert('Abono enviado para revisión del administrador.');
        setModalAbonoOpen(false);
        cargarPedidos();
      } else {
        const err = await res.json();
        alert(err.mensaje || 'Error al solicitar abono.');
      }
    } catch { alert('Error de red.'); }
    finally { setProcesando(false); }
  };

  const pendientes = pedidos.filter(p => p.estatus === 'Pendiente' || p.estatus === 'Fiado');
  const saldadas   = pedidos.filter(p => p.estatus === 'Completada');
  const totalDeuda = pendientes.reduce((acc, p) => acc + (p.resta ?? (p.totalVenta - (p.montoAbonado || 0))), 0);

  const lista = filtro === 'pendientes' ? pendientes : saldadas;

  const renderCard = (p) => {
    const isPendiente = filtro === 'pendientes';
    const items = p.productos || p.detalles || [];
    const abonos = (p.abonos || []).filter(a => a.estatus !== 'Rechazado');

    return (
      <div key={p.idVenta} className={`mdf-card${isPendiente ? '' : ' mdf-card--saldado'}`}>

        {/* Cabecera */}
        <div className="mdf-card-head">
          <div className="mdf-card-meta">
            <p className="mdf-card-id">Pedido #{p.idVenta}</p>
            <p className="mdf-card-date">
              <i className="fas fa-calendar-alt" style={{ marginRight: '0.3rem', color: 'var(--primary)', fontSize: '0.65rem' }} />
              {new Date(p.fechaVenta).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
            </p>
          </div>
          <span className={`mdf-status mdf-status--${isPendiente ? 'pendiente' : 'saldado'}`}>
            {isPendiente ? 'Pendiente' : 'Saldada'}
          </span>
        </div>

        {/* Productos */}
        {items.length > 0 && (
          <div className="mdf-card-items">
            {items.map((d, i) => (
              <div key={d.idDetalle ?? i} className="mdf-card-item">
                <span className="mdf-card-item-name">{d.cantidad}× {d.nombre ?? d.producto?.nombre}</span>
                <span className="mdf-card-item-sub">${d.subtotal.toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}

        {/* Resumen financiero */}
        <div className="mdf-card-foot">
          {isPendiente ? (
            <>
              <div className="mdf-foot-row">
                <span className="mdf-foot-label">Total original</span>
                <span className="mdf-foot-value">${p.totalVenta.toFixed(2)}</span>
              </div>
              <div className="mdf-foot-row">
                <span className="mdf-foot-label">Abonado</span>
                <span className="mdf-foot-value mdf-foot-value--abonado">${(p.montoAbonado || 0).toFixed(2)}</span>
              </div>
              <div className="mdf-foot-row mdf-foot-row--resta">
                <span className="mdf-foot-label">Resta</span>
                <span className="mdf-foot-value">${(p.resta ?? (p.totalVenta - (p.montoAbonado || 0))).toFixed(2)}</span>
              </div>
            </>
          ) : (
            <>
              <div className="mdf-foot-row">
                <span className="mdf-foot-label">Total pagado</span>
                <span className="mdf-foot-value">${p.totalVenta.toFixed(2)}</span>
              </div>
              {p.fechaLiquidacion && (
                <div className="mdf-liquidacion">
                  <i className="fas fa-check-circle" />
                  Saldada el {new Date(p.fechaLiquidacion).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Historial de abonos */}
        {abonos.length > 0 && (
          <div className="mdf-card-abonos">
            <p className="mdf-abonos-title">
              {isPendiente ? 'Historial de abonos' : 'Pagos realizados'}
            </p>
            {abonos.map(a => (
              <div key={a.idAbono} className="mdf-abono-row">
                <span className="mdf-abono-date">
                  {new Date(a.fechaAbono).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: '2-digit' })}
                </span>
                <span className="mdf-abono-metod">{a.metodoPago}</span>
                {a.estatus === 'Pendiente'
                  ? <span className="mdf-abono-pending">⏳ Por aprobar</span>
                  : <span className="mdf-abono-amount">+${a.monto.toFixed(2)}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="mdf-page">

      {/* HEADER */}
      <header className="mdf-header">
        <BackButton to="/user-panel" />
        <div>
          <h1 className="mdf-header-title">Estado de <span>Cuenta</span></h1>
          <p className="mdf-header-sub">Tienda del Box — deudas y pagos</p>
        </div>
      </header>

      <div className="mdf-content">

        {/* BANNER DEUDA TOTAL */}
        <div className="mdf-summary">
          <div className="mdf-summary-info">
            <p className="mdf-summary-label">Deuda Total Activa</p>
            <p className={`mdf-summary-amount${totalDeuda === 0 ? ' mdf-summary-amount--zero' : ''}`}>
              ${totalDeuda.toFixed(2)}
            </p>
          </div>
          {totalDeuda > 0 && (
            <button className="mdf-abonar-btn" onClick={abrirModal}>
              <i className="fas fa-hand-holding-usd" /> Abonar
            </button>
          )}
        </div>

        {/* TABS */}
        <div className="mdf-tabs">
          <button
            className={`mdf-tab${filtro === 'pendientes' ? ' mdf-tab--active' : ''}`}
            onClick={() => setFiltro('pendientes')}
          >
            <i className="fas fa-clock" />
            Deudas Pendientes
            <span className="mdf-tab-count">{pendientes.length}</span>
          </button>
          <button
            className={`mdf-tab${filtro === 'saldadas' ? ' mdf-tab--active' : ''}`}
            onClick={() => setFiltro('saldadas')}
          >
            <i className="fas fa-check-circle" />
            Deudas Saldadas
            <span className="mdf-tab-count">{saldadas.length}</span>
          </button>
        </div>

        {/* CONTENIDO */}
        {loading ? (
          <div className="mdf-loader-wrap"><AtletifyLoader /></div>
        ) : (
          <>
            <p className={`mdf-section-title${filtro === 'saldadas' ? ' mdf-section-title--saldado' : ''}`}>
              <i className={`fas fa-${filtro === 'pendientes' ? 'clock' : 'check-circle'}`} />
              {filtro === 'pendientes' ? `Deudas pendientes — ${pendientes.length}` : `Deudas saldadas — ${saldadas.length}`}
            </p>

            {lista.length === 0 ? (
              <div className="mdf-empty">
                <i className={`fas fa-${filtro === 'pendientes' ? 'check-circle' : 'box-open'}`} />
                <p>
                  {filtro === 'pendientes'
                    ? '¡Todo al día! No tienes deudas pendientes.'
                    : 'Aún no has liquidado ninguna deuda.'}
                </p>
              </div>
            ) : (
              <div className="mdf-list">
                {lista.map(renderCard)}
              </div>
            )}
          </>
        )}
      </div>

      {/* MODAL COMPROBANTE RECHAZADO */}
      {modalRechazados && abonosRechazados.length > 0 && (
        <div className="mdf-modal-overlay" onClick={cerrarModalRechazados}>
          <div className="mdf-modal mdf-modal--rechazo" onClick={e => e.stopPropagation()}>

            <div className="mdf-modal-header">
              <div className="mdf-modal-icon mdf-modal-icon--warn">
                <i className="fas fa-exclamation-triangle" />
              </div>
              <p className="mdf-modal-title">
                {abonosRechazados.length === 1 ? 'Comprobante rechazado' : `${abonosRechazados.length} comprobantes rechazados`}
              </p>
              <button className="mdf-modal-close" onClick={cerrarModalRechazados}>
                <i className="fas fa-times" />
              </button>
            </div>

            <div className="mdf-modal-body">
              <div className="mdf-rechazados-lista">
                {abonosRechazados.map(a => (
                  <div key={a.idAbono} className="mdf-rechazado-item">
                    <div className="mdf-rechazado-icon">
                      <i className="fas fa-times-circle" />
                    </div>
                    <div className="mdf-rechazado-info">
                      <p className="mdf-rechazado-monto">
                        Tu pago por <strong>${a.monto.toFixed(2)}</strong>
                      </p>
                      <p className="mdf-rechazado-fecha">
                        enviado el{' '}
                        {new Date(a.fechaAbono).toLocaleDateString('es-MX', {
                          day: '2-digit', month: 'long', year: 'numeric'
                        })}
                        {' '}ha sido <span className="mdf-rechazado-estado">rechazado</span>.
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <p className="mdf-rechazado-aviso">
                <i className="fas fa-info-circle" />
                Por favor envía el comprobante de nuevo o acude a recepción para aclarar tu pago.
              </p>

              <div className="mdf-modal-actions">
                <button className="mdf-btn-cancel" onClick={cerrarModalRechazados}>
                  <i className="fas fa-times" />
                </button>
                <button className="mdf-submit-btn mdf-submit-btn--reenviar" onClick={reenviarComprobante}>
                  <i className="fas fa-paper-plane" />
                  Enviar comprobante de nuevo
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* MODAL ABONO */}
      {modalAbonoOpen && (
        <div className="mdf-modal-overlay" onClick={() => !procesando && setModalAbonoOpen(false)}>
          <div className="mdf-modal" onClick={e => e.stopPropagation()}>

            <div className="mdf-modal-header">
              <div className="mdf-modal-icon"><i className="fas fa-hand-holding-usd" /></div>
              <p className="mdf-modal-title">Abonar a Deuda Total</p>
              <button className="mdf-modal-close" onClick={() => setModalAbonoOpen(false)} disabled={procesando}>
                <i className="fas fa-times" />
              </button>
            </div>

            <div className="mdf-modal-body">
              <p className="mdf-modal-hint">
                Sube el comprobante de transferencia. El monto se descontará automáticamente de las deudas más antiguas.
              </p>

              <div>
                <label className="mdf-modal-label">Monto a abonar ($)</label>
                <input
                  type="number"
                  className="mdf-modal-input"
                  value={montoAbono}
                  onChange={e => {
                    const v = e.target.value;
                    if (v === '' || parseFloat(v) <= totalDeuda) setMontoAbono(v);
                  }}
                  placeholder={`Ej. ${totalDeuda.toFixed(2)}`}
                  max={totalDeuda}
                  min="1"
                />
                <p className="mdf-modal-warn">
                  <i className="fas fa-info-circle" /> Deuda total: ${totalDeuda.toFixed(2)}
                </p>
              </div>

              <div>
                <label className="mdf-modal-label">Foto del comprobante</label>
                <input
                  type="file"
                  className="mdf-modal-input"
                  accept="image/*"
                  onChange={handleFileChange}
                />
                {comprobanteBase64 && (
                  <div className="mdf-modal-preview">
                    <img src={comprobanteBase64} alt="Comprobante" />
                  </div>
                )}
              </div>

              <div className="mdf-modal-actions">
                <button className="mdf-btn-cancel" onClick={() => setModalAbonoOpen(false)} disabled={procesando}>
                  <i className="fas fa-times" />
                </button>
                <button
                  className="mdf-submit-btn"
                  onClick={enviarAbono}
                  disabled={procesando || !montoAbono || !comprobanteBase64}
                >
                  {procesando
                    ? <><i className="fas fa-spinner fa-spin" /> Enviando...</>
                    : <><i className="fas fa-paper-plane" /> Enviar para Aprobación</>}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
