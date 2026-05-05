import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { VENTAS_ENDPOINT, PRODUCTOS_ENDPOINT } from '../services/api';
import BackButton from '../components/BackButton';
import { useAuth } from '../context/AuthContext';
import '../assets/css/TiendaBox.css';

export default function TiendaBox() {
  const navigate = useNavigate();
  const [apartados, setApartados] = useState([]);
  const [apartadoActivo, setApartadoActivo] = useState('General (Box)');
  const [productosTotales, setProductosTotales] = useState([]);
  const [carrito, setCarrito] = useState([]);
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [boxGuardado, setBoxGuardado] = useState(null);
  const { usuario } = useAuth();
  
  // Novedades: Pestañas, Método de Pago y Mis Pedidos
  const [activeTab, setActiveTab] = useState('catalogo-fisico');
  const [metodoPago, setMetodoPago] = useState('Efectivo en Recepción');
  const [misPedidos, setMisPedidos] = useState([]);
  const [cargandoPedidos, setCargandoPedidos] = useState(false);
  const [pedidoExpandido, setPedidoExpandido] = useState(null);

  const productos = productosTotales.filter(p => activeTab === 'catalogo-fisico' ? !p.esSobrePedido : p.esSobrePedido);

  useEffect(() => {
    const b = JSON.parse(localStorage.getItem('box'));
    if (!b) {
      navigate('/login');
      return;
    }
    setBoxGuardado(b);
    cargarApartados(b.idBox);
  }, [navigate]);

  useEffect(() => {
    if (boxGuardado && apartadoActivo) {
      cargarProductos(boxGuardado.idBox, apartadoActivo);
    }
  }, [apartadoActivo, boxGuardado]);

  useEffect(() => {
    if (activeTab === 'mis-pedidos') {
      cargarMisPedidos();
    }
  }, [activeTab]);

  const cargarMisPedidos = async () => {
    setCargandoPedidos(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${VENTAS_ENDPOINT}/mis-pedidos`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMisPedidos(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCargandoPedidos(false);
    }
  };

  const enviarRecibo = async (idVenta) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${VENTAS_ENDPOINT}/${idVenta}/enviar-recibo`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.mensaje);
      } else {
        alert("Error al enviar recibo.");
      }
    } catch (e) {
      alert("Error de red");
    }
  };

  const cargarApartados = async (idBox) => {
    try {
      const res = await fetch(`${VENTAS_ENDPOINT}/apartados/${idBox}`);
      if (res.ok) {
        const data = await res.json();
        setApartados(data);
      }
    } catch (e) {
      console.error("Error al cargar apartados", e);
    }
  };

  const cargarProductos = async (idBox, apartado) => {
    setLoading(true);
    try {
      const res = await fetch(`${PRODUCTOS_ENDPOINT}/${idBox}?apartado=${encodeURIComponent(apartado)}&soloActivos=true`);
      if (res.ok) {
        const data = await res.json();
        setProductosTotales(data);
      }
    } catch (e) {
      console.error("Error al cargar productos", e);
    } finally {
      setLoading(false);
    }
  };

  const agregarAlCarrito = (producto) => {
    if (!producto.esSobrePedido && producto.stockActual <= 0) return alert("Producto agotado.");
    
    setCarrito(prev => {
      const existente = prev.find(item => item.idProducto === producto.idProducto);
      if (existente) {
        if (!producto.esSobrePedido && existente.cantidad >= producto.stockActual) {
          alert("No puedes agregar más, se alcanzó el stock máximo.");
          return prev;
        }
        return prev.map(item =>
          item.idProducto === producto.idProducto
            ? { ...item, cantidad: item.cantidad + 1 }
            : item
        );
      } else {
        return [...prev, { ...producto, cantidad: 1 }];
      }
    });
  };

  const removerDelCarrito = (idProducto) => {
    setCarrito(prev => prev.filter(item => item.idProducto !== idProducto));
  };

  const modificarCantidad = (idProducto, delta) => {
    setCarrito(prev => {
      return prev.map(item => {
        if (item.idProducto === idProducto) {
          const nuevaCantidad = item.cantidad + delta;
          if (nuevaCantidad <= 0) return item; // Debería usar el botón eliminar
          
          // Verificar contra el stock original
          const prodOriginal = productosTotales.find(p => p.idProducto === idProducto);
          if (prodOriginal && !prodOriginal.esSobrePedido && nuevaCantidad > prodOriginal.stockActual) {
            alert("No hay suficiente stock.");
            return item;
          }
          
          return { ...item, cantidad: nuevaCantidad };
        }
        return item;
      });
    });
  };

  const totalCarrito = carrito.reduce((acc, item) => acc + (item.precioVenta * item.cantidad), 0);

  const realizarPedido = async () => {
    if (carrito.length === 0) return;
    if (!boxGuardado) return;

    setProcesando(true);
    try {
      const token = localStorage.getItem('token');
      const payload = {
        idBox: boxGuardado.idBox,
        apartado: apartadoActivo,
        metodoPago: metodoPago,
        detalles: carrito.map(item => ({
          idProducto: item.idProducto,
          cantidad: item.cantidad
        }))
      };

      const res = await fetch(`${VENTAS_ENDPOINT}/pedido-atleta`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok) {
        alert("¡Pedido realizado con éxito!\nTienes 24 horas para pagarlo en el Box.");
        setCarrito([]);
        setActiveTab('mis-pedidos');
        cargarProductos(boxGuardado.idBox, apartadoActivo);
      } else {
        alert(data.mensaje || "Error al procesar el pedido.");
      }
    } catch (e) {
      alert("Error de conexión. Intenta de nuevo.");
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div className="tienda-atleta-page">
      <header className="tienda-header">
        <div className="d-flex align-items-center gap-3">
          <BackButton to="/user-panel" />
          <div className="tienda-header-icon d-none d-sm-flex">
            <i className="fas fa-shopping-bag"></i>
          </div>
          <h1 className="tienda-header-title">
            Tienda del <span>Box</span>
          </h1>
        </div>
      </header>

      <div className="container-xl px-3 px-md-4 py-4">
        
        {/* Banner de Atleta de Confianza */}
        {usuario?.esDeConfianza && (
          <div className="alert alert-info d-flex align-items-center mb-4 border-info bg-dark text-info shadow-sm" role="alert">
            <i className="fas fa-handshake fa-2x me-3"></i>
            <div>
              <h5 className="alert-heading mb-1 fw-bold">¡Eres un atleta de confianza!</h5>
              <p className="mb-0" style={{ fontSize: '0.9rem' }}>Como agradecimiento a tu lealtad, tienes habilitada la opción especial de <strong>"Fiar"</strong> al pagar. Puedes realizar tu pedido sin saldo y pagarlo después directo en el Box.</p>
            </div>
          </div>
        )}

        {/* NAVEGACIÓN PRINCIPAL (TABS) */}
        <div className="d-flex mb-4 border-bottom border-secondary overflow-auto">
          <button 
            className={`btn fs-5 px-4 py-2 rounded-top ${activeTab === 'catalogo-fisico' ? 'btn-danger' : 'btn-dark text-muted border-bottom-0'}`}
            style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0, marginRight: '4px', whiteSpace: 'nowrap' }}
            onClick={() => setActiveTab('catalogo-fisico')}
          >
            <i className="fas fa-box me-2"></i>Catálogo
          </button>
          <button 
            className={`btn fs-5 px-4 py-2 rounded-top ${activeTab === 'catalogo-sobre-pedido' ? 'btn-danger' : 'btn-dark text-muted border-bottom-0'}`}
            style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0, marginRight: '4px', whiteSpace: 'nowrap' }}
            onClick={() => setActiveTab('catalogo-sobre-pedido')}
          >
            <i className="fas fa-store me-2"></i>Sobre Pedido
          </button>
          <button 
            className={`btn fs-5 px-4 py-2 rounded-top ${activeTab === 'mis-pedidos' ? 'btn-danger' : 'btn-dark text-muted border-bottom-0'}`}
            style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0, whiteSpace: 'nowrap' }}
            onClick={() => setActiveTab('mis-pedidos')}
          >
            <i className="fas fa-list-alt me-2"></i>Mis Pedidos
          </button>
        </div>

        {(activeTab === 'catalogo-fisico' || activeTab === 'catalogo-sobre-pedido') && (
          <>
            {/* Filtro Apartados */}
            {apartados.length > 1 && (
              <div className="apartados-pills mb-4">
                {apartados.map(ap => (
                  <button
                    key={ap}
                    className={`apartado-pill ${apartadoActivo === ap ? 'active' : ''}`}
                    onClick={() => setApartadoActivo(ap)}
                  >
                    {ap}
                  </button>
                ))}
              </div>
            )}

            <div className="row g-4">
          
          {/* CATÁLOGO DE PRODUCTOS */}
          <div className={`col-12 ${activeTab === 'catalogo-fisico' ? '' : 'col-lg-8'}`}>
            <div className="catalogo-container">
              <h4 className="catalogo-title mb-3">
                <i className="fas fa-box-open me-2"></i> Productos Disponibles
              </h4>
              
              {loading ? (
                <div className="text-center py-5 text-white">
                  <div className="spinner-border text-danger mb-2"></div>
                  <p>Cargando inventario...</p>
                </div>
              ) : productos.length === 0 ? (
                <div className="empty-state text-center py-5">
                  <i className="fas fa-ghost fa-3x text-muted mb-3"></i>
                  <p className="text-white">No hay productos en esta tienda.</p>
                </div>
              ) : (
                <div className="row g-3">
                  {productos.map(p => {
                    const cantEnCarrito = carrito.find(c => c.idProducto === p.idProducto)?.cantidad || 0;
                    const agotado = !p.esSobrePedido && p.stockActual <= 0;
                    const sinStockRestante = !p.esSobrePedido && cantEnCarrito >= p.stockActual;

                    return (
                      <div className="col-12 col-sm-6 col-md-4" key={p.idProducto}>
                        <div className={`producto-card h-100 d-flex flex-column ${agotado ? 'agotado' : ''}`}>
                          <div className="producto-img-wrapper">
                            {p.fotoUrl ? (
                              <img src={p.fotoUrl} alt={p.nombre} className="producto-img" />
                            ) : (
                              <div className="producto-img-placeholder">
                                <i className="fas fa-image"></i>
                              </div>
                            )}
                            {agotado && !p.esSobrePedido && <div className="badge-agotado">AGOTADO</div>}
                            {p.esSobrePedido && <div className="badge bg-warning text-dark position-absolute top-0 end-0 m-2"><i className="fas fa-clock"></i> Pedido</div>}
                          </div>
                          <div className="producto-info d-flex flex-column flex-grow-1">
                            <h5 className="producto-nombre">{p.nombre}</h5>
                            
                            {/* Insignias de categoría */}
                            {(p.categoria || p.talla || p.subCategoria) && (
                              <div className="d-flex flex-wrap gap-1 mb-2 mt-1">
                                {p.categoria && <span className="badge bg-secondary">{p.categoria}</span>}
                                {p.subCategoria && <span className="badge bg-info text-dark">{p.subCategoria}</span>}
                                {p.talla && <span className="badge border border-light text-light">Talla {p.talla}</span>}
                              </div>
                            )}

                            {/* Descripción */}
                            {p.descripcion && (
                              <p className="text-light small mb-2 opacity-75" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                {p.descripcion}
                              </p>
                            )}

                            <div className="mt-auto">
                              <p className="producto-precio mb-1">${p.precioVenta.toFixed(2)}</p>
                              <p className="producto-stock mb-2" style={{ color: '#aaa' }}>
                                {p.esSobrePedido ? 'Manejo sobre pedido' : `Stock: ${p.stockActual}`}
                              </p>
                              {activeTab === 'catalogo-fisico' ? (
                                <div className="text-center p-2 rounded mt-2" style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px dashed rgba(255,255,255,0.2)', fontSize: '0.85rem', color: '#ccc' }}>
                                  <i className="fas fa-store me-1 text-danger"></i> De venta en recepción
                                </div>
                              ) : (
                                <button 
                                  className="btn btn-outline-danger w-100"
                                  onClick={() => agregarAlCarrito(p)}
                                  disabled={!p.esSobrePedido && (agotado || sinStockRestante)}
                                >
                                  <i className="fas fa-cart-plus me-1"></i> 
                                  {(!p.esSobrePedido && sinStockRestante && !agotado) ? 'Máximo alcanzado' : 'Agregar'}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* CARRITO Y RESUMEN */}
          {activeTab !== 'catalogo-fisico' && (
            <div className="col-12 col-lg-4">
              <div className="carrito-container">
                <h4 className="carrito-title mb-3">
                  <i className="fas fa-shopping-cart me-2"></i> Mi Pedido
                </h4>
                
                {carrito.length === 0 ? (
                  <div className="carrito-vacio text-center py-4">
                    <i className="fas fa-cart-arrow-down fa-2x mb-2" style={{ color: '#555' }}></i>
                    <p style={{ color: '#aaa' }}>Tu carrito está vacío.</p>
                  </div>
                ) : (
                  <div className="carrito-items-wrapper">
                    {carrito.map(item => (
                      <div className="carrito-item" key={item.idProducto}>
                        <div className="carrito-item-info">
                          <span className="fw-bold">{item.nombre}</span>
                          <span className="text-muted ms-auto">${(item.precioVenta * item.cantidad).toFixed(2)}</span>
                        </div>
                        <div className="carrito-item-controls mt-2 d-flex justify-content-between align-items-center">
                          <div className="cant-controls">
                            <button className="btn-cant" onClick={() => modificarCantidad(item.idProducto, -1)} disabled={item.cantidad <= 1}>
                              <i className="fas fa-minus"></i>
                            </button>
                            <span className="cant-value">{item.cantidad}</span>
                            <button className="btn-cant" onClick={() => modificarCantidad(item.idProducto, 1)}>
                              <i className="fas fa-plus"></i>
                            </button>
                          </div>
                          <button className="btn-remove" onClick={() => removerDelCarrito(item.idProducto)}>
                            <i className="fas fa-trash"></i>
                          </button>
                        </div>
                      </div>
                    ))}
                    
                    <div className="carrito-total mt-4">
                      <span>Total a Pagar:</span>
                      <span className="total-amount">${totalCarrito.toFixed(2)}</span>
                    </div>

                    <div className="mt-3">
                      <label className="form-label text-white fw-bold mb-1">Método de Pago Preferido</label>
                      <select 
                        className="form-select bg-dark text-white border-secondary"
                        value={metodoPago}
                        onChange={(e) => setMetodoPago(e.target.value)}
                      >
                        <option value="Efectivo en Recepción">Efectivo en Recepción</option>
                        
                        {totalCarrito >= 100 && (
                          <option value="Tarjeta en Recepción">Tarjeta en Recepción (Mínimo $100)</option>
                        )}
                        
                        {totalCarrito >= 100 && (
                          <option value="Transferencia">Transferencia (Mínimo $100)</option>
                        )}

                        {usuario?.esDeConfianza && (
                          <option value="Fiar (Anotar en mi cuenta)">Fiar (Anotar a mi Deuda Tienda)</option>
                        )}
                      </select>
                      
                      {totalCarrito < 100 && (
                        <p className="text-danger small mt-1 mb-0"><i className="fas fa-info-circle"></i> Compra mínima de $100 para pago con Tarjeta o Transferencia.</p>
                      )}
                    </div>

                    <div className="carrito-warning mt-3 mb-3 p-3 text-center">
                      <i className="fas fa-info-circle text-info mb-2 fs-5"></i>
                      <p className="small mb-0" style={{ color: '#ddd' }}>Al realizar tu pedido, reservaremos los productos por <strong>24 horas</strong>. Pasa a recepción para realizar el pago y recibir tus artículos.</p>
                    </div>

                    <button 
                      className="btn btn-danger w-100 py-3 fw-bold"
                      onClick={realizarPedido}
                      disabled={procesando}
                    >
                      {procesando ? (
                        <><i className="fas fa-spinner fa-spin me-2"></i> Procesando...</>
                      ) : (
                        <><i className="fas fa-check-circle me-2"></i> Realizar Pedido</>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          </div>
          </>
        )}

        {/* PESTAÑA: MIS PEDIDOS */}
        {activeTab === 'mis-pedidos' && (
            <div className="mis-pedidos-container mt-4 w-100">
              <h4 className="text-white mb-4"><i className="fas fa-history me-2"></i> Historial de Pedidos</h4>
              
              {cargandoPedidos ? (
                <div className="text-center py-5 text-white">
                  <div className="spinner-border text-danger mb-2"></div>
                  <p>Cargando tus pedidos...</p>
                </div>
              ) : misPedidos.length === 0 ? (
                <div className="empty-state text-center py-5">
                  <i className="fas fa-box-open fa-3x text-muted mb-3"></i>
                  <p className="text-white">Aún no has realizado pedidos.</p>
                  <button className="btn btn-outline-danger mt-3" onClick={() => setActiveTab('catalogo')}>
                    Ir al Catálogo
                  </button>
                </div>
              ) : (
                <div className="row g-3">
                  {misPedidos.map(p => (
                    <div className="col-12" key={p.idVenta}>
                      <div className="producto-card p-0 overflow-hidden d-flex flex-column" style={{ cursor: 'pointer' }} onClick={() => setPedidoExpandido(pedidoExpandido === p.idVenta ? null : p.idVenta)}>
                        {/* Cabecera del pedido (siempre visible) */}
                        <div className="p-4 d-flex align-items-center flex-wrap gap-3 w-100" style={{ borderBottom: pedidoExpandido === p.idVenta ? '1px solid #444' : 'none' }}>
                          <div className="flex-grow-1">
                            <div className="d-flex align-items-center gap-3 mb-2">
                              <h5 className="mb-0 text-white fw-bold">Pedido #{p.idVenta}</h5>
                              <span className={`badge bg-${p.estatus === 'Pendiente' ? 'warning text-dark' : p.estatus === 'Listo para Recoger' ? 'info text-dark' : p.estatus === 'Cancelada' ? 'danger' : 'success'}`}>
                                {p.estatus}
                              </span>
                            </div>
                            <p className="text-light small mb-1 opacity-75">
                              <i className="fas fa-calendar-alt me-1"></i> {new Date(p.fechaVenta).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </p>
                            <p className="text-info small mb-0 fw-semibold">
                              <i className="fas fa-money-bill-wave me-1"></i> {p.metodoPago}
                            </p>
                          </div>
                          
                          <div className="text-end me-4">
                            <p className="mb-0 text-light small opacity-75">Total:</p>
                            <h4 className="text-danger fw-bold mb-0">${p.totalVenta.toFixed(2)}</h4>
                            <p className="mb-0 text-light small opacity-75">{p.detalles?.length || 0} artículo(s)</p>
                          </div>
                          
                          <div className="d-flex gap-2">
                            <button 
                              className="btn btn-outline-info" 
                              title="Enviar recibo a mi correo"
                              onClick={(e) => { e.stopPropagation(); enviarRecibo(p.idVenta); }}
                            >
                              <i className="fas fa-envelope"></i>
                            </button>
                            <button 
                              className="btn btn-outline-light" 
                              title="Ver Detalles"
                            >
                              <i className={`fas fa-chevron-${pedidoExpandido === p.idVenta ? 'up' : 'down'}`}></i>
                            </button>
                          </div>
                        </div>

                        {/* Detalles Desplegables */}
                        {pedidoExpandido === p.idVenta && (
                          <div className="p-4 bg-dark">
                            <h6 className="text-white mb-3 fw-bold border-bottom border-secondary pb-2">
                              <i className="fas fa-box-open me-2"></i>Artículos Comprados
                            </h6>
                            <div className="row g-3">
                              {p.detalles?.map(d => (
                                <div className="col-12 col-md-6" key={d.idDetalle}>
                                  <div className="d-flex align-items-center gap-3 p-2 rounded" style={{ backgroundColor: '#2a2a2a' }}>
                                    {d.producto?.fotoUrl ? (
                                      <img src={d.producto.fotoUrl} alt={d.producto.nombre} style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '8px' }} />
                                    ) : (
                                      <div className="d-flex align-items-center justify-content-center bg-secondary" style={{ width: '50px', height: '50px', borderRadius: '8px' }}>
                                        <i className="fas fa-image text-dark"></i>
                                      </div>
                                    )}
                                    <div className="flex-grow-1">
                                      <p className="text-white mb-0 fw-semibold">
                                        {d.producto?.nombre}
                                        {d.producto?.talla && <span className="badge border border-light ms-2 text-light">{d.producto.talla}</span>}
                                        {d.producto?.subCategoria && <span className="badge bg-info text-dark ms-2">{d.producto.subCategoria}</span>}
                                      </p>
                                      <p className="text-light small mb-0 opacity-75">Cant: {d.cantidad} x ${d.precioUnitario.toFixed(2)}</p>
                                    </div>
                                    <div className="text-end">
                                      <p className="text-success fw-bold mb-0">${d.subtotal.toFixed(2)}</p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                            
                            {p.estatus === 'Pendiente' && (
                              <div className="mt-4 p-3 bg-warning text-dark rounded fw-semibold text-center d-flex align-items-center justify-content-center gap-2">
                                <i className="fas fa-exclamation-triangle"></i>
                                Recuerda que tienes hasta {new Date(p.fechaVencimiento).toLocaleTimeString('es-MX', { hour: '2-digit', minute:'2-digit' })} del día de mañana para pagarlo.
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
  );
}
