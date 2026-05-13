import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { VENTAS_ENDPOINT } from '../services/api';
import BackButton from '../components/BackButton';
import AtletifyLoader from '../components/AtletifyLoader';
import '../assets/css/GestionFiado.css';

export default function GestionFiado() {
  const navigate = useNavigate();
  const [box, setBox] = useState(null);
  const [deudores, setDeudores] = useState([]);
  const [abonosPendientes, setAbonosPendientes] = useState([]);
  const [tabActual, setTabActual] = useState('deudores');
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');

  const [atletaDetalle, setAtletaDetalle] = useState(null);
  const [ventasAtleta, setVentasAtleta] = useState([]);
  const [loadingDetalle, setLoadingDetalle] = useState(false);

  const [modalAbonoOpen, setModalAbonoOpen] = useState(false);
  const [montoAbono, setMontoAbono] = useState('');
  const [metodoAbono, setMetodoAbono] = useState('Efectivo');
  const [procesandoAbono, setProcesandoAbono] = useState(false);

  // Visor de comprobante
  const [comprobanteViewer, setComprobanteViewer] = useState(null);

  // Picker de método de pago
  const [modalMetodoOpen, setModalMetodoOpen] = useState(false);

  const METODOS_PAGO = [
    { value: 'Efectivo',             icon: 'fa-money-bill-wave', label: 'Efectivo',              desc: 'Pago con dinero en efectivo en recepción' },
    { value: 'Tarjeta en Recepción', icon: 'fa-credit-card',     label: 'Tarjeta en Recepción',  desc: 'Terminal bancaria del box' },
    { value: 'Transferencia',        icon: 'fa-university',      label: 'Transferencia',         desc: 'Transferencia bancaria confirmada por recepción' },
  ];

  useEffect(() => {
    const b = JSON.parse(localStorage.getItem('box'));
    if (!b) { navigate('/admin-box-panel'); return; }
    setBox(b);
    cargarDeudores(b.idBox);
    cargarAbonosPendientes(b.idBox);
  }, [navigate]);

  const cargarAbonosPendientes = async (idBox) => {
    try {
      const res = await fetch(`${VENTAS_ENDPOINT}/fiados/abonos-pendientes/${idBox}`);
      if (res.ok) {
        const data = await res.json();
        setAbonosPendientes(data);
      }
    } catch (e) { console.error(e); }
  };

  const cargarDeudores = async (idBox) => {
    setLoading(true);
    try {
      const res = await fetch(`${VENTAS_ENDPOINT}/fiados/${idBox}`);
      if (res.ok) {
        const data = await res.json();
        setDeudores(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const verDetalleAtleta = async (atleta) => {
    setAtletaDetalle(atleta);
    setLoadingDetalle(true);
    try {
      const res = await fetch(`${VENTAS_ENDPOINT}/fiados/${box.idBox}/atleta/${atleta.idUsuario}`);
      if (res.ok) {
        const data = await res.json();
        setVentasAtleta(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingDetalle(false);
    }
  };

  const cerrarDetalle = () => {
    setAtletaDetalle(null);
    setVentasAtleta([]);
  };

  const abrirModalAbono = () => {
    setMontoAbono('');
    setMetodoAbono('Efectivo');
    setModalAbonoOpen(true);
  };

  const enviarAbonoAdmin = async () => {
    if (!atletaDetalle) return;
    const monto = parseFloat(montoAbono);
    if (isNaN(monto) || monto <= 0 || monto > atletaDetalle.totalDeuda) {
      alert('Monto inválido. Debe ser mayor a 0 y no superar la deuda total.');
      return;
    }
    setProcesandoAbono(true);
    try {
      const res = await fetch(
        `${VENTAS_ENDPOINT}/fiados/abonar-global/${box.idBox}/${atletaDetalle.idUsuario}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify({ monto, metodoPago: metodoAbono }),
        }
      );
      if (res.ok) {
        alert('Abono global registrado correctamente.');
        setModalAbonoOpen(false);
        cargarDeudores(box.idBox);
        const atletaActualizado = { ...atletaDetalle, totalDeuda: atletaDetalle.totalDeuda - monto };
        setAtletaDetalle(atletaActualizado);
        verDetalleAtleta(atletaActualizado);
      } else {
        const data = await res.json();
        alert(data.mensaje || 'Error al abonar.');
      }
    } catch (e) {
      console.error(e);
      alert('Error de red.');
    } finally {
      setProcesandoAbono(false);
    }
  };

  const aprobarAbono = async (abono) => {
    const inputMonto = await window.wpPrompt(
      `El atleta indica un pago de $${abono.monto.toFixed(2)}.\n¿Cuánto deseas aprobar y descontar de la deuda?`,
      abono.monto
    );
    if (!inputMonto) return;
    const montoAceptado = parseFloat(inputMonto);
    if (isNaN(montoAceptado) || montoAceptado <= 0 || montoAceptado > abono.deudaRestanteTotal) {
      alert('Monto inválido. Debe ser mayor a 0 y no superar la deuda total del atleta.');
      return;
    }
    if (!await window.wpConfirm(`¿Aprobar abono por $${montoAceptado.toFixed(2)}?`)) return;
    try {
      const res = await fetch(`${VENTAS_ENDPOINT}/fiados/abonos/${abono.idAbono}/aprobar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ montoAceptado }),
      });
      if (res.ok) {
        alert('Abono aprobado correctamente.');
        cargarAbonosPendientes(box.idBox);
        cargarDeudores(box.idBox);
      } else {
        const data = await res.json();
        alert(data.mensaje || 'Error al aprobar.');
      }
    } catch (e) {
      alert('Error de red.');
    }
  };

  const rechazarAbono = async (idAbono) => {
    if (!await window.wpConfirm('¿Estás seguro de rechazar este comprobante?')) return;
    try {
      const res = await fetch(`${VENTAS_ENDPOINT}/fiados/abonos/${idAbono}/rechazar`, { method: 'POST' });
      if (res.ok) {
        alert('Abono rechazado.');
        cargarAbonosPendientes(box.idBox);
      }
    } catch (e) {}
  };

  const filtrados = deudores.filter(d =>
    `${d.nombre} ${d.apellidos}`.toLowerCase().includes(busqueda.toLowerCase())
  );

  const totalGlobal = deudores.reduce((acc, curr) => acc + curr.totalDeuda, 0);

  return (
    <div className="gf-page">

      {/* HEADER — igual que GestionClases */}
      <header className="gf-header">
        <div className="d-flex align-items-center gap-3">
          <BackButton to="/gestion-ventas-productos" />
          <h1 className="gf-header-title">
            Gestión de <span>Fiado</span>
          </h1>
        </div>
      </header>

      <div className="container-xl px-3 px-md-4 pb-5">

        {/* ===== MODAL DETALLE DE DEUDA ===== */}
        {atletaDetalle && (
          <div className="gf-detalle-overlay" onClick={cerrarDetalle}>
            <div className="gf-detalle-panel" onClick={e => e.stopPropagation()}>

              <div className="gf-detalle-header">
                <h4>Detalle de Deuda</h4>
                <button className="gf-close-btn" onClick={cerrarDetalle}>
                  <i className="fas fa-times"></i>
                </button>
              </div>

              <div className="gf-detalle-info">
                {/* Perfil del atleta */}
                <div className="d-flex align-items-center gap-3 mb-3">
                  {atletaDetalle.fotoPerfilUrl ? (
                    <img src={atletaDetalle.fotoPerfilUrl} alt={atletaDetalle.nombre} className="gf-detalle-foto" />
                  ) : (
                    <div className="gf-detalle-inicial">{atletaDetalle.nombre.charAt(0)}</div>
                  )}
                  <div>
                    <div className="gf-detalle-nombre">{atletaDetalle.nombre} {atletaDetalle.apellidos}</div>
                    <div className="gf-detalle-deuda-badge">
                      <i className="fas fa-exclamation-triangle"></i>
                      Debe: ${atletaDetalle.totalDeuda.toFixed(2)}
                    </div>
                  </div>
                </div>

                {atletaDetalle.totalDeuda > 0 && (
                  <button className="gf-btn-abonar mb-3" onClick={abrirModalAbono}>
                    <i className="fas fa-hand-holding-usd"></i>
                    Abonar a Deuda Total
                  </button>
                )}

                {loadingDetalle ? (
                  <div className="text-center py-4"><AtletifyLoader /></div>
                ) : (
                  <div className="gf-bloques">
                    {ventasAtleta.length === 0 ? (
                      <p className="text-muted text-center py-4">No hay deudas pendientes registradas.</p>
                    ) : (
                      ventasAtleta.map(v => (
                        <div
                          key={v.idVenta}
                          className={`gf-bloque-card ${v.estatus === 'Completada' ? 'gf-bloque-completado' : ''}`}
                        >
                          <div className="gf-bloque-header">
                            <div>
                              <strong>{new Date(v.fechaVenta).toLocaleDateString()}</strong>
                              <span className="text-muted ms-2" style={{ fontSize: '0.78rem' }}>#{v.idVenta}</span>
                            </div>
                            <span className={`badge ${v.estatus === 'Completada' ? 'bg-success' : 'bg-warning text-dark'}`}>
                              {v.estatus}
                            </span>
                          </div>

                          <div className="gf-bloque-prods">
                            {v.productos.map((p, idx) => (
                              <div key={idx} className="gf-bloque-prod-item">
                                <span>{p.cantidad}x {p.nombre}</span>
                                <span>${p.subtotal.toFixed(2)}</span>
                              </div>
                            ))}
                          </div>

                          <div className="gf-bloque-finanzas">
                            <div className="gf-finanza-item">
                              <span>Total</span><span>${v.totalVenta.toFixed(2)}</span>
                            </div>
                            <div className="gf-finanza-item text-success">
                              <span>Abonado</span><span>${v.montoAbonado.toFixed(2)}</span>
                            </div>
                            <div className="gf-finanza-item text-danger fw-bold">
                              <span>Resta</span><span>${v.resta.toFixed(2)}</span>
                            </div>
                            {v.fechaLiquidacion && (
                              <div className="gf-finanza-item text-success" style={{ fontSize: '0.78rem', marginTop: '0.3rem', paddingTop: '0.3rem', borderTop: '1px dashed rgba(255,255,255,0.1)' }}>
                                <span>✔ Saldado el</span>
                                <span>{new Date(v.fechaLiquidacion).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                              </div>
                            )}
                          </div>

                          {/* Historial de abonos — comprobante como botón */}
                          {v.abonos && v.abonos.length > 0 && (
                            <div className="gf-abonos-lista">
                              <p className="gf-abonos-titulo">Historial de abonos</p>
                              {v.abonos.map(a => (
                                <div
                                  key={a.idAbono}
                                  className="gf-abono-item"
                                  style={{ opacity: a.estatus === 'Rechazado' ? 0.4 : 1 }}
                                >
                                  <span>
                                    {new Date(a.fechaAbono).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                                  </span>
                                  <span>{a.metodoPago}</span>
                                  {a.estatus === 'Pendiente' && (
                                    <span className="badge bg-warning text-dark" style={{ fontSize: '0.62rem' }}>⏳ Por aprobar</span>
                                  )}
                                  {a.estatus === 'Rechazado' && (
                                    <span className="badge bg-secondary" style={{ fontSize: '0.62rem' }}>Rechazado</span>
                                  )}
                                  {a.estatus === 'Aprobado' && (
                                    <span className="text-success fw-bold">+${a.monto.toFixed(2)}</span>
                                  )}
                                  {(a.comprobanteBase64 || a.urlComprobante) && (
                                    <button
                                      className="gf-btn-comprobante"
                                      onClick={() => setComprobanteViewer(a.comprobanteBase64 || a.urlComprobante)}
                                    >
                                      <i className="fas fa-image"></i>Ver comprobante
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ===== RESUMEN ===== */}
        <div className="row justify-content-center mb-4">
          <div className="col-12 col-md-8 col-lg-6">
            <div className="gf-resumen-card">
              <div className="gf-resumen-icon"><i className="fas fa-wallet"></i></div>
              <div className="gf-resumen-info">
                <p className="gf-resumen-label">Total por cobrar a fiados</p>
                <p className="gf-resumen-monto">${totalGlobal.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ===== TABS ===== */}
        <div className="gf-tabs mb-4">
          <button
            className={`gf-tab-btn ${tabActual === 'deudores' ? 'active' : ''}`}
            onClick={() => setTabActual('deudores')}
          >
            <i className="fas fa-users"></i>Deudores
          </button>
          <button
            className={`gf-tab-btn ${tabActual === 'abonos' ? 'active' : ''}`}
            onClick={() => setTabActual('abonos')}
          >
            <i className="fas fa-clock"></i>Abonos por Aprobar
            {abonosPendientes.length > 0 && (
              <span className="badge bg-danger ms-1" style={{ fontSize: '0.65rem' }}>{abonosPendientes.length}</span>
            )}
          </button>
        </div>

        {/* ===== TAB DEUDORES ===== */}
        {tabActual === 'deudores' ? (
          <>
            <div className="gf-search-wrap mb-4">
              <i className="fas fa-search gf-search-icon"></i>
              <input
                type="text"
                placeholder="Buscar atleta deudor..."
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                className="gf-search-input"
              />
            </div>

            {loading ? (
              <div className="text-center py-5"><AtletifyLoader /></div>
            ) : filtrados.length === 0 ? (
              <div className="text-center py-5 text-muted">
                <i className="fas fa-check-circle fa-3x mb-3 text-success" style={{ opacity: 0.5 }}></i>
                <p>No hay deudas pendientes en este momento.</p>
              </div>
            ) : (
              <div className="row g-3">
                {filtrados.map(d => (
                  <div key={d.idUsuario} className="col-12 col-md-6 col-lg-4">
                    <div className="gf-deudor-card" onClick={() => verDetalleAtleta(d)}>
                      <div className="gf-deudor-info">
                        {d.fotoPerfilUrl ? (
                          <img src={d.fotoPerfilUrl} alt={d.nombre} className="gf-deudor-foto" />
                        ) : (
                          <div className="gf-deudor-inicial">{d.nombre.charAt(0)}</div>
                        )}
                        <div style={{ minWidth: 0 }}>
                          <p className="gf-deudor-nombre">{d.nombre} {d.apellidos}</p>
                          <p className="gf-deudor-monto">Debe: <span>${d.totalDeuda.toFixed(2)}</span></p>
                        </div>
                      </div>
                      <i className="fas fa-chevron-right text-muted" style={{ fontSize: '0.8rem', flexShrink: 0 }}></i>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (

          /* ===== TAB ABONOS POR APROBAR ===== */
          <div className="row g-3">
            {abonosPendientes.length === 0 ? (
              <div className="text-center py-5 text-muted w-100">
                <i className="fas fa-clipboard-check fa-3x mb-3 text-success" style={{ opacity: 0.5 }}></i>
                <p>No hay comprobantes pendientes de aprobación.</p>
              </div>
            ) : (
              abonosPendientes.map(abono => (
                <div key={abono.idAbono} className="col-12 col-md-6 col-lg-4">
                  <div className="gf-abono-pend-card">

                    <div className="gf-abono-pend-header">
                      <span className="gf-abono-pend-nombre">{abono.usuarioNombre}</span>
                      <span className="badge bg-warning text-dark" style={{ fontSize: '0.65rem' }}>⏳ Pendiente</span>
                    </div>

                    {/* Comprobante como miniatura clickable → abre el visor */}
                    {abono.comprobanteBase64 && (
                      <>
                        <div
                          className="gf-comprobante-thumb-wrap"
                          onClick={() => setComprobanteViewer(abono.comprobanteBase64)}
                        >
                          <img
                            src={abono.comprobanteBase64}
                            alt="Comprobante de pago"
                            className="gf-comprobante-thumb"
                          />
                          <div className="gf-comprobante-thumb-overlay">
                            <i className="fas fa-expand-alt"></i>
                          </div>
                        </div>
                        <p className="gf-comprobante-hint">
                          <i className="fas fa-expand-alt me-1"></i>Clic para ampliar
                        </p>
                      </>
                    )}

                    <div className="gf-abono-row mb-1">
                      <span>Monto solicitado:</span>
                      <strong>${abono.monto.toFixed(2)}</strong>
                    </div>
                    <div className="gf-abono-row mb-3">
                      <span>Deuda total del atleta:</span>
                      <span className="gf-deuda-valor">${(abono.deudaRestanteTotal ?? 0).toFixed(2)}</span>
                    </div>

                    <div className="d-flex gap-2 mt-auto">
                      <button className="btn btn-sm btn-success w-50" onClick={() => aprobarAbono(abono)}>
                        <i className="fas fa-check me-1"></i>Aprobar
                      </button>
                      <button className="btn btn-sm btn-outline-danger w-50" onClick={() => rechazarAbono(abono.idAbono)}>
                        <i className="fas fa-times me-1"></i>Rechazar
                      </button>
                    </div>

                  </div>
                </div>
              ))
            )}
          </div>
        )}

      </div>

      {/* ===== VISOR DE COMPROBANTE (pantalla emergente) ===== */}
      {comprobanteViewer && (
        <div className="gf-comprobante-overlay" onClick={() => setComprobanteViewer(null)}>
          <div className="gf-comprobante-viewer" onClick={e => e.stopPropagation()}>
            <button
              className="gf-comprobante-close"
              onClick={() => setComprobanteViewer(null)}
              aria-label="Cerrar comprobante"
            >
              <i className="fas fa-times"></i>
            </button>
            <img src={comprobanteViewer} alt="Comprobante de pago" />
          </div>
        </div>
      )}

      {/* ===== MODAL REGISTRAR ABONO ===== */}
      {modalAbonoOpen && atletaDetalle && (
        <div
          className="gf-modal-abono-overlay"
          onClick={() => !procesandoAbono && setModalAbonoOpen(false)}
        >
          <div className="gf-modal-abono-panel" onClick={e => e.stopPropagation()}>

            <div className="gf-modal-abono-header">
              <h5 className="gf-modal-abono-title">Registrar Abono</h5>
              <button
                className="gf-close-btn"
                onClick={() => setModalAbonoOpen(false)}
                disabled={procesandoAbono}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="gf-modal-abono-body">

              <div className="gf-abono-atleta-info">
                {atletaDetalle.fotoPerfilUrl ? (
                  <img src={atletaDetalle.fotoPerfilUrl} alt="" className="gf-abono-atleta-foto" />
                ) : (
                  <div className="gf-abono-atleta-inicial">{atletaDetalle.nombre.charAt(0)}</div>
                )}
                <div>
                  <p className="gf-abono-atleta-nombre">{atletaDetalle.nombre} {atletaDetalle.apellidos}</p>
                  <p className="gf-abono-atleta-sub">Pago directo en recepción</p>
                </div>
              </div>

              <div className="mb-3">
                <label className="etiqueta-campo d-block mb-1">Monto a abonar ($)</label>
                <input
                  type="number"
                  className="entrada-oscura w-100"
                  value={montoAbono}
                  onChange={e => {
                    const val = e.target.value;
                    if (val === '' || parseFloat(val) <= atletaDetalle.totalDeuda) setMontoAbono(val);
                  }}
                  placeholder={`Ej. ${atletaDetalle.totalDeuda.toFixed(2)}`}
                  max={atletaDetalle.totalDeuda}
                  min="1"
                />
                <div style={{ color: 'var(--accent)', fontSize: '0.75rem', marginTop: '0.3rem' }}>
                  Deuda total: ${atletaDetalle.totalDeuda.toFixed(2)}
                </div>
              </div>

              <div className="mb-4">
                <label className="etiqueta-campo d-block mb-1">Método de pago</label>
                <button
                  className="gf-metodo-btn"
                  onClick={() => setModalMetodoOpen(true)}
                  type="button"
                >
                  <span className="gf-metodo-btn__left">
                    <i className={`fas ${METODOS_PAGO.find(m => m.value === metodoAbono)?.icon ?? 'fa-money-bill-wave'} gf-metodo-btn__icon`}></i>
                    <span className="gf-metodo-btn__label">{metodoAbono}</span>
                  </span>
                  <i className="fas fa-chevron-right gf-metodo-btn__arrow"></i>
                </button>
              </div>

              <button
                className="gf-btn-abonar"
                onClick={enviarAbonoAdmin}
                disabled={procesandoAbono || !montoAbono}
              >
                {procesandoAbono ? (
                  <><span className="spinner-border spinner-border-sm me-2"></span>Registrando...</>
                ) : (
                  <><i className="fas fa-check-circle"></i>Confirmar Abono</>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ===== PICKER MÉTODO DE PAGO ===== */}
      {modalMetodoOpen && (
        <div className="gf-metodo-overlay" onClick={() => setModalMetodoOpen(false)}>
          <div className="gf-metodo-modal" onClick={e => e.stopPropagation()}>

            <div className="gf-metodo-modal__header">
              <div>
                <p className="gf-metodo-modal__supertitle">Seleccionar</p>
                <h3 className="gf-metodo-modal__title">Método de Pago</h3>
              </div>
              <button className="gf-close-btn" onClick={() => setModalMetodoOpen(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="gf-metodo-modal__list">
              {METODOS_PAGO.map(m => (
                <button
                  key={m.value}
                  className={`gf-metodo-opcion ${metodoAbono === m.value ? 'gf-metodo-opcion--activo' : ''}`}
                  onClick={() => { setMetodoAbono(m.value); setModalMetodoOpen(false); }}
                >
                  <div className="gf-metodo-opcion__icono">
                    <i className={`fas ${m.icon}`}></i>
                  </div>
                  <div className="gf-metodo-opcion__info">
                    <span className="gf-metodo-opcion__nombre">{m.label}</span>
                    <span className="gf-metodo-opcion__desc">{m.desc}</span>
                  </div>
                  {metodoAbono === m.value && (
                    <i className="fas fa-check-circle gf-metodo-opcion__check"></i>
                  )}
                </button>
              ))}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
