import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { VENTAS_ENDPOINT } from '../services/api';
import BackButton from '../components/BackButton';
import RedGrayDatePicker from '../components/RedGrayDatePicker';
import '../assets/css/HistorialVentas.css';

export default function HistorialVentas() {
  const navigate = useNavigate();
  const [box, setBox] = useState(null);
  const [ventas, setVentas] = useState([]);
  const [buscar, setBuscar] = useState('');
  const [loading, setLoading] = useState(true);
  const [expandido, setExpandido] = useState(null); // formato: "Venta-1" o "Abono-1"
  const [fechaFiltro, setFechaFiltro] = useState('');
  const [imgAbierta, setImgAbierta] = useState(null);

  const apartadoActual = localStorage.getItem('apartadoVentas') || 'General (Box)';

  useEffect(() => {
    const b = JSON.parse(localStorage.getItem('box'));
    if (!b) { navigate('/admin-box-panel'); return; }
    setBox(b);
  }, [navigate]);

  const cargarVentas = useCallback(async () => {
    if (!box) return;
    setLoading(true);
    try {
      const url = buscar
        ? `${VENTAS_ENDPOINT}/${box.idBox}?buscar=${encodeURIComponent(buscar)}&apartado=${encodeURIComponent(apartadoActual)}`
        : `${VENTAS_ENDPOINT}/${box.idBox}?apartado=${encodeURIComponent(apartadoActual)}`;

      const res = await fetch(url);
      const data = await res.json();
      setVentas(Array.isArray(data) ? data : []);
    } catch {
      setVentas([]);
    } finally {
      setLoading(false);
    }
  }, [box, buscar, apartadoActual]);

  useEffect(() => { cargarVentas(); }, [cargarVentas]);

  function formatFecha(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  // Flatten the list into Transactions (Ventas and Abonos)
  let transacciones = [];

  ventas.forEach(v => {
    // 1. Si NO es Fiado, es un ingreso directo, así que agregamos la Venta original
    if (v.metodoPago !== 'Fiado') {
      transacciones.push({
        tipo: 'Venta',
        idUnico: `Venta-${v.idVenta}`,
        fecha: v.fechaVenta,
        datos: v
      });
    }

    // 2. Si la Venta tiene abonos (es un Fiado que ha recibido pagos), agregarlos como transacciones individuales
    if (v.abonos && v.abonos.length > 0) {
      v.abonos.forEach(a => {
        transacciones.push({
          tipo: 'Abono',
          idUnico: `Abono-${a.idAbono}`,
          fecha: a.fechaAbono,
          datos: {
            ...a,
            ventaRelacionada: v
          }
        });
      });
    }
  });

  // Ordenar de más reciente a más antigua
  transacciones.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  // Aplicar filtros de fecha y búsqueda (búsqueda aplica a productos/atletas y se filtra en backend, pero si queremos aquí tmb)
  if (fechaFiltro) {
    transacciones = transacciones.filter(t => new Date(t.fecha).toISOString().slice(0, 10) === fechaFiltro);
  }

  const transaccionesPorDia = transacciones.reduce((acc, t) => {
    const fechaObj = new Date(t.fecha);
    const clave = fechaObj.toISOString().slice(0, 10);
    const label = fechaObj.toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    if (!acc[clave]) acc[clave] = { label, items: [] };
    acc[clave].items.push(t);
    return acc;
  }, {});

  return (
    <div className="hv-page">

      <header className="hv-header d-print-none">
          <div className="d-flex align-items-center gap-3">
            <BackButton to="/gestion-ventas-productos" />
            <div className="hv-header-icon d-none d-sm-flex">
              <i className="fas fa-receipt"></i>
            </div>
            <h1 className="hv-header-title">
              Historial de <span>Ventas y Cobros</span>
            </h1>
          </div>
      </header>

      <div className="container-xl px-3 px-md-4 pb-5">

        <div className="hv-filtros-row d-print-none mb-4 d-flex flex-column flex-xl-row gap-3 align-items-xl-center">
          <div className="d-flex align-items-center gap-2 flex-grow-1">
            <button className="btn btn-outline-danger" onClick={cargarVentas} title="Refrescar datos">
                <i className="fas fa-sync-alt"></i>
            </button>
            <div className="hv-search-wrap ms-xl-2 flex-grow-1">
              <span className="hv-search-icon">
                <i className="fas fa-search"></i>
              </span>
              <input
                className="hv-search-input w-100"
                placeholder="Buscar por producto o fecha..."
                value={buscar}
                onChange={e => setBuscar(e.target.value)}
              />
            </div>
          </div>
          <div className="hv-calendar-wrap">
            <RedGrayDatePicker
              value={fechaFiltro}
              onChange={setFechaFiltro}
              placeholder="Filtrar día"
            />
            {fechaFiltro && (
              <button
                className="hv-clear-date-btn"
                onClick={() => setFechaFiltro('')}
                title="Quitar filtro de fecha"
              >
                <i className="fas fa-times"></i>
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="hv-loading">
            <div className="spinner-wp"></div>
          </div>
        ) : transacciones.length === 0 ? (
          <div className="hv-empty">
            <i className="fas fa-receipt"></i>
            <p>{buscar ? 'No se encontraron transacciones con esa búsqueda.' : 'Aún no se han registrado ventas ni abonos.'}</p>
          </div>
        ) : (
          <div className="d-flex flex-column gap-3 gap-sm-4">
            {Object.entries(transaccionesPorDia).map(([clave, { label, items }]) => (
              <div key={clave}>
                <div className="hv-dia-header">
                  <i className="fas fa-calendar-day"></i>
                  {label.charAt(0).toUpperCase() + label.slice(1)}
                  <span className="hv-dia-badge">{items.length} movimiento(s)</span>
                </div>

                <div className="d-flex flex-column gap-2">
                  {items.map(t => {
                    const isVenta = t.tipo === 'Venta';
                    const v = isVenta ? t.datos : t.datos.ventaRelacionada;
                    const a = isVenta ? null : t.datos;

                    return (
                      <div key={t.idUnico} className={`hv-venta-card ${!isVenta ? 'border border-primary' : ''}`} style={!isVenta ? { backgroundColor: 'rgba(13, 110, 253, 0.05)' } : {}}>
                        <div
                          className="hv-venta-header"
                          onClick={() => setExpandido(expandido === t.idUnico ? null : t.idUnico)}
                        >
                          <div className="d-flex align-items-center gap-3">
                            <div className={`hv-venta-icono ${!isVenta ? 'bg-primary' : ''}`}>
                              <i className={`fas ${isVenta ? 'fa-receipt' : 'fa-money-bill-wave'}`}></i>
                            </div>
                            <div>
                              <p className="hv-venta-id">
                                {isVenta ? `Venta #${v.idVenta}` : `Abono a Deuda`} 
                                <span className={`ms-2 badge ${v.usuarioNombre === 'Mostrador' ? 'bg-secondary' : 'bg-info text-dark'}`}>
                                  <i className={`fas ${v.usuarioNombre === 'Mostrador' ? 'fa-store' : 'fa-user'} me-1`}></i>
                                  {v.usuarioNombre}
                                </span>
                              </p>
                              <p className="hv-venta-fecha">
                                <i className="fas fa-clock"></i>
                                {formatFecha(t.fecha)}
                                {!isVenta && (
                                  <span className="ms-2 text-primary small fw-bold">
                                    <i className="fas fa-handshake me-1"></i>Abono de Fiado
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="d-flex align-items-center gap-3">
                            <div className="text-end">
                              <p className={`hv-venta-total ${!isVenta ? 'text-primary fw-bold' : ''}`}>
                                ${parseFloat(isVenta ? v.totalVenta : a.monto).toFixed(2)}
                              </p>
                              
                              {isVenta ? (
                                v.estatus && (
                                  <span className={`badge bg-${v.estatus === 'Pendiente' ? 'warning text-dark' : v.estatus.includes('Fiado') ? 'primary' : v.estatus === 'Cancelada' ? 'danger' : 'success'} mt-1`}>
                                    {v.estatus.includes('Fiado') ? <><i className="fas fa-handshake me-1"></i> {v.estatus}</> : v.estatus}
                                  </span>
                                )
                              ) : (
                                <span className="badge bg-primary mt-1">
                                  <i className="fas fa-check-circle me-1"></i>Abono Aprobado
                                </span>
                              )}
                            </div>
                            <i className={`fas fa-chevron-${expandido === t.idUnico ? 'up' : 'down'} hv-chevron d-print-none`}></i>
                          </div>
                        </div>

                        {expandido === t.idUnico && (
                          <div className="hv-detalle-zona">
                            {!isVenta && (
                              <div className="mb-4 p-3 bg-dark rounded border border-primary">
                                <h6 className="text-primary mb-3"><i className="fas fa-info-circle me-2"></i>Detalle del Abono</h6>
                                <div className="d-flex flex-wrap justify-content-between gap-3">
                                  <div>
                                    <p className="text-muted small mb-1">Método de pago:</p>
                                    <p className="text-white mb-0">
                                      {a.metodoPago === 'Efectivo' && <i className="fas fa-money-bill-wave text-success me-2"></i>}
                                      {a.metodoPago === 'Tarjeta en Recepción' && <i className="fas fa-credit-card text-info me-2"></i>}
                                      {a.metodoPago === 'Transferencia' && <i className="fas fa-university text-primary me-2"></i>}
                                      {a.metodoPago}
                                    </p>
                                  </div>
                                  <div className="text-end">
                                    <p className="text-muted small mb-1">Comprobante:</p>
                                    {a.comprobanteBase64 ? (
                                      <button 
                                        className="btn btn-sm btn-outline-info"
                                        onClick={(e) => { e.stopPropagation(); setImgAbierta(a.comprobanteBase64); }}
                                      >
                                        <i className="fas fa-image me-1"></i> Ver Imagen
                                      </button>
                                    ) : (
                                      <span className="text-muted">- Ninguno -</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}

                            <h6 className="text-white mb-2"><i className="fas fa-shopping-basket me-2"></i>{isVenta ? 'Artículos de la venta' : 'Productos de la Deuda Original'}</h6>
                            <div className="table-responsive mb-4">
                              <table className="hv-detalle-table">
                                <thead>
                                  <tr>
                                    <th className="hv-detalle-th">Producto</th>
                                    <th className="hv-detalle-th text-end">P.Unit</th>
                                    <th className="hv-detalle-th text-center">Cant.</th>
                                    <th className="hv-detalle-th text-end">Subtotal</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {v.detalles?.map(d => (
                                    <tr key={d.idDetalle} className="hv-detalle-row">
                                      <td className="hv-detalle-nombre">{d.producto?.nombre || `Producto #${d.idProducto}`}</td>
                                      <td className="hv-detalle-precio text-end">${parseFloat(d.precioUnitario).toFixed(2)}</td>
                                      <td className="hv-detalle-cell text-center">
                                        <span className="hv-detalle-cant">{d.cantidad}</span>
                                      </td>
                                      <td className="hv-detalle-subtotal text-end">${parseFloat(d.subtotal).toFixed(2)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                            
                            {isVenta && v.metodoPago !== 'Fiado' && (
                              <div className="mt-2 text-muted small">
                                <strong>Método de pago:</strong> {v.metodoPago || 'Efectivo'}
                              </div>
                            )}
                          </div>
                        )}

                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      {imgAbierta && (
        <div 
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.9)', zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
          onClick={() => setImgAbierta(null)}
        >
          <img src={imgAbierta} alt="Comprobante" style={{maxWidth: '90%', maxHeight: '90%', borderRadius: '8px'}} />
          <button 
            style={{ position: 'absolute', top: '20px', right: '20px', background: 'transparent', border: 'none', color: '#fff', fontSize: '2rem', cursor: 'pointer' }}
            onClick={() => setImgAbierta(null)}
          >
            &times;
          </button>
        </div>
      )}

    </div>
  );
}
