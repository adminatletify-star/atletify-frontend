import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { VENTAS_ENDPOINT } from '../services/api';
import BackButton from '../components/BackButton';
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

  // Estado para modal de pago directo en recepción
  const [modalAbonoOpen, setModalAbonoOpen] = useState(false);
  const [montoAbono, setMontoAbono] = useState('');
  const [metodoAbono, setMetodoAbono] = useState('Efectivo');
  const [procesandoAbono, setProcesandoAbono] = useState(false);

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
    } catch(e) { console.error(e); }
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
      alert("Monto inválido. Debe ser mayor a 0 y no superar la deuda total.");
      return;
    }

    setProcesandoAbono(true);
    try {
      const res = await fetch(`${VENTAS_ENDPOINT}/fiados/abonar-global/${box.idBox}/${atletaDetalle.idUsuario}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ monto, metodoPago: metodoAbono })
      });
      if (res.ok) {
        alert("Abono global registrado correctamente.");
        setModalAbonoOpen(false);
        // Actualizamos deuda en memoria de la lista
        cargarDeudores(box.idBox);
        
        // Refrescamos el panel lateral de detalle
        const atletaActualizado = { ...atletaDetalle, totalDeuda: atletaDetalle.totalDeuda - monto };
        setAtletaDetalle(atletaActualizado);
        verDetalleAtleta(atletaActualizado);
      } else {
        const data = await res.json();
        alert(data.mensaje || "Error al abonar.");
      }
    } catch (e) {
      console.error(e);
      alert("Error de red.");
    } finally {
      setProcesandoAbono(false);
    }
  };

  const aprobarAbono = async (abono) => {
    const inputMonto = await window.wpPrompt(`El atleta indica un pago de $${abono.monto.toFixed(2)}.\n¿Cuánto deseas aprobar y descontar de la deuda?`, abono.monto);
    if (!inputMonto) return;
    
    const montoAceptado = parseFloat(inputMonto);
    if (isNaN(montoAceptado) || montoAceptado <= 0 || montoAceptado > abono.deudaRestanteTotal) {
      alert("Monto inválido. Debe ser mayor a 0 y no superar la deuda total del atleta.");
      return;
    }

    if (!await window.wpConfirm(`¿Aprobar abono por $${montoAceptado.toFixed(2)}?`)) return;

    try {
      const res = await fetch(`${VENTAS_ENDPOINT}/fiados/abonos/${abono.idAbono}/aprobar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ montoAceptado })
      });
      if (res.ok) {
        alert("Abono aprobado correctamente.");
        cargarAbonosPendientes(box.idBox);
        cargarDeudores(box.idBox);
      } else {
        const data = await res.json();
        alert(data.mensaje || "Error al aprobar.");
      }
    } catch (e) {
      alert("Error de red.");
    }
  };

  const rechazarAbono = async (idAbono) => {
    if (!await window.wpConfirm("¿Estás seguro de rechazar este comprobante?")) return;
    try {
      const res = await fetch(`${VENTAS_ENDPOINT}/fiados/abonos/${idAbono}/rechazar`, {
        method: 'POST'
      });
      if (res.ok) {
        alert("Abono rechazado.");
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
      <header className="gf-header">
        <div className="d-flex align-items-center gap-3">
          <BackButton to="/gestion-ventas-productos" />
          <div className="gf-header-icon d-none d-sm-flex">
            <i className="fas fa-hand-holding-usd"></i>
          </div>
          <h1 className="gf-header-title">
            Gestión de <span>Fiado</span>
          </h1>
        </div>
      </header>

      <div className="container-xl px-3 px-md-4 pb-5">
        
        {/* Panel lateral: Detalle de Atleta */}
        {atletaDetalle && (
          <div className="gf-detalle-overlay" onClick={cerrarDetalle}>
            <div className="gf-detalle-panel" onClick={e => e.stopPropagation()}>
              <div className="gf-detalle-header">
                <h4>Detalle de Deuda</h4>
                <button className="gf-close-btn" onClick={cerrarDetalle}><i className="fas fa-times"></i></button>
              </div>
              <div className="gf-detalle-info">
                <div className="d-flex align-items-center gap-3 mb-3">
                  {atletaDetalle.fotoPerfilUrl ? (
                    <img src={atletaDetalle.fotoPerfilUrl} alt={atletaDetalle.nombre} className="gf-detalle-foto" />
                  ) : (
                    <div className="gf-detalle-inicial">{atletaDetalle.nombre.charAt(0)}</div>
                  )}
                  <div>
                    <h5 className="mb-0">{atletaDetalle.nombre} {atletaDetalle.apellidos}</h5>
                    <span className="badge bg-danger">Total Debe: ${atletaDetalle.totalDeuda.toFixed(2)}</span>
                  </div>
                </div>

                {atletaDetalle.totalDeuda > 0 && (
                  <button
                    className="btn btn-warning w-100 fw-bold mb-3"
                    onClick={abrirModalAbono}
                  >
                    <i className="fas fa-hand-holding-usd me-2"></i>Abonar a Deuda Total
                  </button>
                )}

                {loadingDetalle ? (
                  <div className="text-center py-4"><div className="spinner-wp"></div></div>
                ) : (
                  <div className="gf-bloques">
                    {ventasAtleta.length === 0 ? (
                      <p className="text-muted text-center py-4">No hay deudas pendientes registradas.</p>
                    ) : (
                      ventasAtleta.map(v => (
                        <div key={v.idVenta} className={`gf-bloque-card ${v.estatus === 'Completada' ? 'gf-bloque-completado' : ''}`}>
                          <div className="gf-bloque-header">
                            <div>
                              <strong>{new Date(v.fechaVenta).toLocaleDateString()}</strong>
                              <span className="text-muted ms-2" style={{fontSize: '0.85rem'}}>#{v.idVenta}</span>
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
                            <div className="gf-finanza-item"><span>Total</span><span>${v.totalVenta.toFixed(2)}</span></div>
                            <div className="gf-finanza-item text-success"><span>Abonado</span><span>${v.montoAbonado.toFixed(2)}</span></div>
                            <div className="gf-finanza-item text-danger fw-bold"><span>Resta</span><span>${v.resta.toFixed(2)}</span></div>
                            {v.fechaLiquidacion && (
                              <div className="gf-finanza-item text-success" style={{fontSize:'0.82rem', marginTop:'0.35rem', paddingTop:'0.35rem', borderTop:'1px dashed rgba(255,255,255,0.1)'}}>
                                <span>✔ Saldado el</span>
                                <span>{new Date(v.fechaLiquidacion).toLocaleDateString('es-MX', {day:'2-digit', month:'short', year:'numeric'})}</span>
                              </div>
                            )}
                          </div>

                          {v.abonos && v.abonos.length > 0 && (
                            <div className="gf-abonos-lista mt-3">
                              <p className="mb-1 text-muted" style={{fontSize:'0.8rem', textTransform:'uppercase', letterSpacing:'1px'}}><strong>Historial de abonos:</strong></p>
                              {v.abonos.map(a => (
                                  <div key={a.idAbono} className="gf-abono-item" style={{opacity: a.estatus === 'Rechazado' ? 0.4 : 1}}>
                                    <span style={{fontSize:'0.8rem'}}>
                                      {new Date(a.fechaAbono).toLocaleDateString('es-MX', {day:'2-digit', month:'short', year:'numeric'})}
                                    </span>
                                    <span style={{fontSize:'0.8rem'}}>{a.metodoPago}</span>
                                    {a.estatus === 'Pendiente' && <span className="badge bg-warning text-dark" style={{fontSize:'0.7rem'}}>⏳ Por aprobar</span>}
                                    {a.estatus === 'Rechazado' && <span className="badge bg-secondary" style={{fontSize:'0.7rem'}}>Rechazado</span>}
                                    {a.estatus === 'Aprobado' && <span className="text-success fw-bold">+${a.monto.toFixed(2)}</span>}
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

        <div className="row justify-content-center mb-4">
          <div className="col-12 col-md-8">
            <div className="gf-resumen-card">
              <div className="gf-resumen-icon"><i className="fas fa-wallet"></i></div>
              <div className="gf-resumen-info">
                <p className="gf-resumen-label">Total por cobrar a fiados</p>
                <p className="gf-resumen-monto">${totalGlobal.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="gf-tabs mb-4">
          <button 
            className={`gf-tab-btn ${tabActual === 'deudores' ? 'active' : ''}`}
            onClick={() => setTabActual('deudores')}
          >
            Deudores
          </button>
          <button 
            className={`gf-tab-btn ${tabActual === 'abonos' ? 'active' : ''}`}
            onClick={() => setTabActual('abonos')}
          >
            Abonos por Aprobar 
            {abonosPendientes.length > 0 && <span className="badge bg-danger ms-2">{abonosPendientes.length}</span>}
          </button>
        </div>

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
              <div className="text-center py-5"><div className="spinner-wp"></div></div>
            ) : filtrados.length === 0 ? (
              <div className="text-center py-5 text-muted">
                <i className="fas fa-check-circle fa-3x mb-3 text-success" style={{opacity: 0.5}}></i>
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
                        <div>
                          <p className="gf-deudor-nombre">{d.nombre} {d.apellidos}</p>
                          <p className="gf-deudor-monto">Debe: <span>${d.totalDeuda.toFixed(2)}</span></p>
                        </div>
                      </div>
                      <i className="fas fa-chevron-right text-muted"></i>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="row g-3">
            {abonosPendientes.length === 0 ? (
              <div className="text-center py-5 text-muted w-100">
                <i className="fas fa-clipboard-check fa-3x mb-3 text-success" style={{opacity: 0.5}}></i>
                <p>No hay comprobantes pendientes de aprobación.</p>
              </div>
            ) : (
              abonosPendientes.map(abono => (
                <div key={abono.idAbono} className="col-12 col-md-6 col-lg-4">
                  <div className="gf-abono-pend-card p-3 border border-secondary rounded" style={{backgroundColor: 'var(--wp-bg-card)'}}>
                    <div className="d-flex justify-content-between mb-2 border-bottom border-secondary pb-2">
                      <strong>{abono.usuarioNombre}</strong>
                      <span className="badge bg-warning text-dark">Pendiente</span>
                    </div>
                    
                    {abono.comprobanteBase64 && (
                      <div className="text-center mb-3">
                        <img src={abono.comprobanteBase64} alt="Comprobante" style={{maxWidth: '100%', maxHeight: '200px', borderRadius: '0.5rem'}} />
                      </div>
                    )}
                    
                    <div className="d-flex justify-content-between text-muted mb-1" style={{fontSize: '0.9rem'}}>
                      <span>Monto solicitado:</span>
                      <strong className="text-white">${abono.monto.toFixed(2)}</strong>
                    </div>
                    <div className="d-flex justify-content-between text-muted mb-3" style={{fontSize: '0.9rem'}}>
                      <span>Deuda total del atleta:</span>
                      <span className="text-danger">${(abono.deudaRestanteTotal ?? 0).toFixed(2)}</span>
                    </div>

                    <div className="d-flex gap-2">
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

      {/* Modal para Abonar Directamente en Recepción */}
      {modalAbonoOpen && atletaDetalle && (
        <div 
          onClick={() => !procesandoAbono && setModalAbonoOpen(false)} 
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1060, padding: '1rem'
          }}
        >
          <div 
            onClick={e => e.stopPropagation()} 
            style={{
              width: '100%', maxWidth: '400px', 
              backgroundColor: '#1e1e1e', 
              border: '1px solid rgba(255,193,7,0.25)', 
              boxShadow: '0 12px 40px rgba(0,0,0,0.8)',
              borderRadius: '12px', overflow: 'hidden'
            }}
          >
            <div className="p-3 border-bottom border-secondary d-flex justify-content-between align-items-center">
              <h5 className="mb-0 text-white">Registrar Abono</h5>
              <button 
                className="btn-close btn-close-white" 
                onClick={() => setModalAbonoOpen(false)} 
                disabled={procesandoAbono}
              ></button>
            </div>
            <div className="p-4 text-white">
              <p className="text-muted small mb-3">Registra un pago realizado directamente en la recepción por {atletaDetalle.nombre}.</p>
              
              <div className="mb-3">
                <label className="form-label">Monto a abonar ($)</label>
                <input 
                  type="number" 
                  className="form-control bg-dark text-white border-secondary" 
                  value={montoAbono}
                  onChange={e => {
                    const val = e.target.value;
                    if (val === '' || parseFloat(val) <= atletaDetalle.totalDeuda) {
                      setMontoAbono(val);
                    }
                  }}
                  placeholder={`Ej. ${atletaDetalle.totalDeuda.toFixed(2)}`}
                  max={atletaDetalle.totalDeuda}
                  min="1"
                />
                <div className="form-text text-warning mt-1">
                  Deuda total actual: ${atletaDetalle.totalDeuda.toFixed(2)}
                </div>
              </div>

              <div className="mb-4">
                <label className="form-label">Método de pago</label>
                <select 
                  className="form-select bg-dark text-white border-secondary"
                  value={metodoAbono}
                  onChange={e => setMetodoAbono(e.target.value)}
                >
                  <option value="Efectivo">Efectivo</option>
                  <option value="Tarjeta en Recepción">Tarjeta en Recepción</option>
                </select>
              </div>

              <button 
                className="btn btn-warning w-100 fw-bold text-dark"
                onClick={enviarAbonoAdmin}
                disabled={procesandoAbono || !montoAbono}
              >
                {procesandoAbono ? <span className="spinner-border spinner-border-sm me-2"></span> : <i className="fas fa-check-circle me-2"></i>}
                {procesandoAbono ? 'Registrando...' : 'Confirmar Abono'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
