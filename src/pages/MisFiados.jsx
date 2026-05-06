import { useState, useEffect } from 'react';
import { VENTAS_ENDPOINT } from '../services/api';
import BackButton from '../components/BackButton';
import '../assets/css/MisFiados.css';

export default function MisFiados() {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalAbonoOpen, setModalAbonoOpen] = useState(false);
  const [ventaSeleccionada, setVentaSeleccionada] = useState(null);
  const [montoAbono, setMontoAbono] = useState('');
  const [comprobanteBase64, setComprobanteBase64] = useState(null);
  const [procesando, setProcesando] = useState(false);

  useEffect(() => {
    cargarPedidos();
  }, []);

  const cargarPedidos = async () => {
    setLoading(true);
    try {
      const usuarioObj = JSON.parse(localStorage.getItem('usuario'));
      const idUsuario = usuarioObj?.id || usuarioObj?.idUsuario;

      if (!idUsuario) {
        console.warn('MisFiados: No se encontró el usuario en localStorage');
        setLoading(false);
        return;
      }

      const res = await fetch(`${VENTAS_ENDPOINT}/fiados/mis-deudas/${idUsuario}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setPedidos(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const abrirModalAbono = () => {
    setMontoAbono('');
    setComprobanteBase64(null);
    setModalAbonoOpen(true);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setComprobanteBase64(reader.result);
      };
      reader.readAsDataURL(file);
    } else {
      setComprobanteBase64(null);
    }
  };

  const enviarAbono = async () => {
    if (!montoAbono || isNaN(montoAbono) || parseFloat(montoAbono) <= 0) {
      alert("Ingresa un monto válido mayor a 0.");
      return;
    }
    const monto = parseFloat(montoAbono);
    if (monto > totalDeuda) {
      alert(`No puedes abonar más del monto restante ($${totalDeuda.toFixed(2)}).`);
      return;
    }

    if (!comprobanteBase64) {
      alert("Por favor sube una foto del comprobante de transferencia.");
      return;
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
      
      if (!idUsuario || !idBox) {
        alert("Error: No se pudo identificar tu cuenta o tu box.");
        setProcesando(false);
        return;
      }

      const res = await fetch(`${VENTAS_ENDPOINT}/fiados/solicitar-abono-global/${idBox}/${idUsuario}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          monto: monto,
          comprobanteBase64: comprobanteBase64
        })
      });
      if (res.ok) {
        alert("Abono enviado para revisión del administrador.");
        setModalAbonoOpen(false);
        cargarPedidos();
      } else {
        const err = await res.json();
        alert(err.mensaje || "Error al solicitar abono.");
      }
    } catch (e) {
      alert("Error de red.");
    } finally {
      setProcesando(false);
    }
  };

  // El endpoint fiados/atleta devuelve estatus 'Pendiente' para deudas activas y 'Completada' para saldadas
  const pendientes = pedidos.filter(p => p.estatus === 'Pendiente' || p.estatus === 'Fiado');
  const saldadas = pedidos.filter(p => p.estatus === 'Completada');

  const totalDeuda = pendientes.reduce((acc, p) => acc + (p.resta ?? (p.totalVenta - (p.montoAbonado || 0))), 0);

  return (
    <div className="mdf-page">
      <header className="mdf-header">
        <div className="d-flex align-items-center gap-3">
          <BackButton to="/user-panel" />
          <h1 className="mdf-header-title">Mi Estado de <span>Cuenta</span></h1>
        </div>
      </header>

      <div className="container-xl px-3 px-md-4 pb-5">
        <div className="row justify-content-center mb-4">
          <div className="col-12 col-md-8 col-lg-6">
            <div className="mdf-resumen-card">
              <div className="mdf-resumen-info">
                <p className="mdf-resumen-label">Deuda Total Activa</p>
                <p className="mdf-resumen-monto">${totalDeuda.toFixed(2)}</p>
              </div>
              <div className="mdf-resumen-icon"><i className="fas fa-file-invoice-dollar"></i></div>
            </div>
            {totalDeuda > 0 && (
              <button 
                className="btn btn-warning w-100 fw-bold mt-3 shadow" 
                style={{padding: '1rem', fontSize: '1.1rem'}}
                onClick={abrirModalAbono}
              >
                <i className="fas fa-hand-holding-usd me-2"></i>Abonar a mi Deuda Total
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-5"><div className="spinner-wp"></div></div>
        ) : pedidos.length === 0 ? (
          <div className="text-center py-5 text-muted">
            <i className="fas fa-check-circle fa-3x mb-3 text-success" style={{opacity: 0.5}}></i>
            <p>¡Todo al día! No tienes historial de deudas.</p>
          </div>
        ) : (
          <div className="row g-4">
            
            <div className="col-12 col-lg-6">
              <h4 className="mdf-section-title"><i className="fas fa-clock text-warning me-2"></i>Deudas Pendientes</h4>
              <div className="mdf-lista">
                {pendientes.length === 0 ? (
                  <p className="text-muted">No tienes deudas pendientes.</p>
                ) : (
                  pendientes.map(p => (
                    <div key={p.idVenta} className="mdf-bloque mdf-bloque--pendiente">
                      <div className="mdf-bloque-head">
                        <div>
                          <strong>{new Date(p.fechaVenta).toLocaleDateString()}</strong>
                          <span className="text-muted ms-2" style={{fontSize:'0.85rem'}}>#{p.idVenta}</span>
                        </div>
                        <span className="badge bg-warning text-dark">Pendiente</span>
                      </div>
                      <div className="mdf-bloque-prods">
                        {/* El endpoint devuelve 'productos' en lugar de 'detalles' */}
                        {(p.productos || p.detalles) && (p.productos || p.detalles).map((d, i) => (
                          <div key={d.idDetalle ?? i} className="d-flex justify-content-between">
                            <span>{d.cantidad}x {d.nombre ?? d.producto?.nombre}</span>
                            <span>${d.subtotal.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="mdf-bloque-foot">
                        <div className="d-flex justify-content-between"><span>Total:</span> <span>${p.totalVenta.toFixed(2)}</span></div>
                        <div className="d-flex justify-content-between text-success"><span>Abonado:</span> <span>${(p.montoAbonado || 0).toFixed(2)}</span></div>
                        <div className="d-flex justify-content-between text-danger fw-bold mt-1 pt-1 border-top border-secondary">
                          <span>Resta:</span> <span>${(p.resta ?? (p.totalVenta - (p.montoAbonado || 0))).toFixed(2)}</span>
                        </div>
                      </div>

                      {/* Historial de abonos con fechas */}
                      {p.abonos && p.abonos.length > 0 && (
                        <div className="mt-2 pt-2 border-top border-secondary">
                          <p className="mb-1" style={{fontSize:'0.78rem', color:'var(--wp-text-muted)', textTransform:'uppercase', letterSpacing:'1px'}}>Historial de abonos:</p>
                          {p.abonos.filter(a => a.estatus !== 'Rechazado').map(a => (
                            <div key={a.idAbono} className="d-flex justify-content-between align-items-center py-1" style={{fontSize:'0.82rem', borderBottom:'1px dashed rgba(255,255,255,0.05)'}}>
                              <span className="text-muted">{new Date(a.fechaAbono).toLocaleDateString('es-MX', {day:'2-digit', month:'short', year:'numeric'})}</span>
                              <span className="text-muted">{a.metodoPago}</span>
                              {a.estatus === 'Pendiente'
                                ? <span className="badge bg-warning text-dark" style={{fontSize:'0.72rem'}}>⏳ Por aprobar</span>
                                : <span className="text-success fw-bold">+${a.monto.toFixed(2)}</span>
                              }
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="col-12 col-lg-6">
              <h4 className="mdf-section-title"><i className="fas fa-check-circle text-success me-2"></i>Deudas Saldadas</h4>
              <div className="mdf-lista">
                {saldadas.length === 0 ? (
                  <p className="text-muted">Aún no has liquidado ninguna deuda.</p>
                ) : (
                  saldadas.map(p => (
                    <div key={p.idVenta} className="mdf-bloque mdf-bloque--saldado">
                      <div className="mdf-bloque-head">
                        <div>
                          <strong>{new Date(p.fechaVenta).toLocaleDateString()}</strong>
                          <span className="text-muted ms-2" style={{fontSize:'0.85rem'}}>#{p.idVenta}</span>
                        </div>
                        <span className="badge bg-success">Completada</span>
                      </div>
                      <div className="mdf-bloque-prods">
                        {(p.productos || p.detalles) && (p.productos || p.detalles).map((d, i) => (
                          <div key={d.idDetalle ?? i} className="d-flex justify-content-between">
                            <span>{d.cantidad}x {d.nombre ?? d.producto?.nombre}</span>
                            <span>${d.subtotal.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="mdf-bloque-foot">
                        <div className="d-flex justify-content-between"><span>Pagado Total:</span> <span>${p.totalVenta.toFixed(2)}</span></div>
                        {p.fechaLiquidacion && (
                          <div className="d-flex justify-content-between text-success fw-bold mt-1" style={{fontSize:'0.85rem'}}>
                            <span>✔ Saldado el:</span> <span>{new Date(p.fechaLiquidacion).toLocaleDateString('es-MX', {day:'2-digit', month:'short', year:'numeric'})}</span>
                          </div>
                        )}
                      </div>

                      {/* Pagos realizados */}
                      {p.abonos && p.abonos.length > 0 && (
                        <div className="mt-2 pt-2 border-top border-secondary">
                          <p className="mb-1" style={{fontSize:'0.78rem', color:'var(--wp-text-muted)', textTransform:'uppercase', letterSpacing:'1px'}}>Pagos realizados:</p>
                          {p.abonos.filter(a => a.estatus !== 'Rechazado').map(a => (
                            <div key={a.idAbono} className="d-flex justify-content-between align-items-center py-1" style={{fontSize:'0.82rem', borderBottom:'1px dashed rgba(255,255,255,0.05)'}}>
                              <span className="text-muted">{new Date(a.fechaAbono).toLocaleDateString('es-MX', {day:'2-digit', month:'short', year:'numeric'})}</span>
                              <span className="text-muted">{a.metodoPago}</span>
                              <span className="text-success fw-bold">+${a.monto.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        )}
      </div>

      {/* Modal para reportar pago */}
      {modalAbonoOpen && (
        <div className="mdf-modal-overlay" onClick={() => !procesando && setModalAbonoOpen(false)}>
          <div className="mdf-modal-panel" onClick={e => e.stopPropagation()}>
            <div className="mdf-modal-header">
              <h5 className="mb-0">Abonar a Deuda Total</h5>
              <button className="mdf-close-btn" onClick={() => setModalAbonoOpen(false)} disabled={procesando}><i className="fas fa-times"></i></button>
            </div>
            <div className="mdf-modal-body">
              <p className="text-muted small mb-3">Sube el comprobante de transferencia por el total o una parte de tu deuda. Se descontará automáticamente de las más antiguas.</p>
              
              <div className="mb-3">
                <label className="form-label">Monto a abonar ($)</label>
                <input 
                  type="number" 
                  className="form-control bg-dark text-white border-secondary" 
                  value={montoAbono}
                  onChange={e => {
                    const val = e.target.value;
                    if (val === '' || parseFloat(val) <= totalDeuda) {
                      setMontoAbono(val);
                    }
                  }}
                  placeholder={`Ej. ${totalDeuda.toFixed(2)}`}
                  max={totalDeuda}
                  min="1"
                />
                <div className="form-text text-warning">
                  Deuda total actual: ${totalDeuda.toFixed(2)}
                </div>
              </div>

              <div className="mb-4">
                <label className="form-label">Foto del comprobante</label>
                <input 
                  type="file" 
                  className="form-control bg-dark text-white border-secondary" 
                  accept="image/*"
                  onChange={handleFileChange}
                />
                {comprobanteBase64 && (
                  <div className="mt-3 text-center">
                    <img src={comprobanteBase64} alt="Preview" style={{maxHeight: '150px', borderRadius: '0.5rem'}} />
                  </div>
                )}
              </div>

              <button 
                className="btn btn-warning w-100 fw-bold text-dark"
                onClick={enviarAbono}
                disabled={procesando || !montoAbono || !comprobanteBase64}
              >
                {procesando ? <span className="spinner-border spinner-border-sm me-2"></span> : <i className="fas fa-paper-plane me-2"></i>}
                {procesando ? 'Enviando...' : 'Enviar para Aprobación'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
