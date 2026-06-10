import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { VENTAS_ENDPOINT, PRODUCTOS_ENDPOINT } from '../services/api';
import BackButton from '../components/BackButton';
import { useAuth } from '../context/AuthContext';
import AtletifyLoader from '../components/AtletifyLoader';
import '../assets/css/TiendaBox.css';

const APARTADO = 'General (Box)';

function statusClass(estatus) {
  if (!estatus) return 'tb-status--pendiente';
  const s = estatus.toLowerCase();
  if (s.includes('listo') || s.includes('recoger')) return 'tb-status--listo';
  if (s.includes('cancel')) return 'tb-status--cancelado';
  if (s.includes('complet') || s.includes('entregad')) return 'tb-status--completado';
  return 'tb-status--pendiente';
}

export default function TiendaBox() {
  const navigate = useNavigate();
  const { usuario } = useAuth();

  const [productosTotales, setProductosTotales] = useState([]);
  const [carrito, setCarrito] = useState([]);
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [boxGuardado, setBoxGuardado] = useState(null);

  const [activeTab, setActiveTab] = useState('catalogo-fisico');
  const [metodoPago, setMetodoPago] = useState('Efectivo en Recepción');
  const [misPedidos, setMisPedidos] = useState([]);
  const [cargandoPedidos, setCargandoPedidos] = useState(false);
  const [pedidoExpandido, setPedidoExpandido] = useState(null);
  const [comprobanteBase64, setComprobanteBase64] = useState(null);
  const [cfgBox, setCfgBox] = useState(null); // config financiera del box (métodos aceptados, mínimo tarjeta)

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("El comprobante debe pesar menos de 2MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => setComprobanteBase64(reader.result);
      reader.readAsDataURL(file);
    } else {
      setComprobanteBase64(null);
    }
  };

  const productos = productosTotales.filter(p =>
    activeTab === 'catalogo-fisico' ? !p.esSobrePedido : p.esSobrePedido
  );
  const totalCarrito = carrito.reduce((acc, i) => acc + i.precioVenta * i.cantidad, 0);

  // Métodos que el box acepta (autoservicio) + mínimo de tarjeta, desde la config del box.
  // Si no llegó la config, somos permisivos para no bloquear la compra.
  const minTarjeta = cfgBox?.compraMinimaTarjeta ?? 100;
  const metodosTienda = {
    'Efectivo en Recepción': cfgBox ? !!cfgBox.aceptarEfectivo : true,
    'Tarjeta en Recepción': cfgBox ? !!cfgBox.aceptarTarjetaRecepcion : true,
    'Transferencia': cfgBox ? !!cfgBox.aceptarTransferencias : true,
  };

  useEffect(() => {
    const b = JSON.parse(localStorage.getItem('box'));
    if (!b) { navigate('/login'); return; }
    setBoxGuardado(b);
    cargarProductos(b.idBox);
    // Config financiera del box (para respetar métodos aceptados + mínimo de tarjeta).
    fetch(`${import.meta.env.VITE_API_URL}/api/configuracionbox/${b.idBox}`)
      .then(r => (r.ok ? r.json() : null))
      .then(c => setCfgBox(c))
      .catch(() => {});
  }, [navigate]);

  // Si el método seleccionado deja de estar disponible (box lo desactivó), cambiar al primero válido.
  useEffect(() => {
    if (!cfgBox) return;
    if (!metodosTienda[metodoPago]) {
      const primero = Object.keys(metodosTienda).find(m => metodosTienda[m]);
      if (primero) setMetodoPago(primero);
    }
  }, [cfgBox]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (activeTab === 'mis-pedidos') cargarMisPedidos();
  }, [activeTab]);

  const cargarProductos = async (idBox) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${PRODUCTOS_ENDPOINT}/${idBox}?apartado=${encodeURIComponent(APARTADO)}&soloActivos=true`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setProductosTotales(await res.json());
    } catch (e) {
      console.error('Error al cargar productos', e);
    } finally {
      setLoading(false);
    }
  };

  const cargarMisPedidos = async () => {
    setCargandoPedidos(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${VENTAS_ENDPOINT}/mis-pedidos`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setMisPedidos(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setCargandoPedidos(false);
    }
  };

  const enviarRecibo = async (e, idVenta) => {
    e.stopPropagation();
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${VENTAS_ENDPOINT}/${idVenta}/enviar-recibo`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      alert(res.ok ? data.mensaje : 'Error al enviar recibo.');
    } catch {
      alert('Error de red');
    }
  };

  const agregarAlCarrito = (producto) => {
    if (!producto.esSobrePedido && producto.stockActual <= 0) {
      alert('Producto agotado.'); return;
    }
    setCarrito(prev => {
      const existente = prev.find(i => i.idProducto === producto.idProducto);
      if (existente) {
        if (!producto.esSobrePedido && existente.cantidad >= producto.stockActual) {
          alert('No puedes agregar más, se alcanzó el stock máximo.'); return prev;
        }
        return prev.map(i => i.idProducto === producto.idProducto ? { ...i, cantidad: i.cantidad + 1 } : i);
      }
      return [...prev, { ...producto, cantidad: 1 }];
    });
  };

  const removerDelCarrito = (idProducto) =>
    setCarrito(prev => prev.filter(i => i.idProducto !== idProducto));

  const modificarCantidad = (idProducto, delta) => {
    setCarrito(prev => prev.map(item => {
      if (item.idProducto !== idProducto) return item;
      const nuevaCantidad = item.cantidad + delta;
      if (nuevaCantidad <= 0) return item;
      const prod = productosTotales.find(p => p.idProducto === idProducto);
      if (prod && !prod.esSobrePedido && nuevaCantidad > prod.stockActual) {
        alert('No hay suficiente stock.'); return item;
      }
      return { ...item, cantidad: nuevaCantidad };
    }));
  };

  const realizarPedido = async () => {
    if (!carrito.length || !boxGuardado) return;

    if (metodoPago === 'Transferencia' && totalCarrito >= minTarjeta && !comprobanteBase64) {
      alert("Por favor, adjunta tu comprobante de transferencia para proceder.");
      return;
    }

    setProcesando(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${VENTAS_ENDPOINT}/pedido-atleta`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          idBox: boxGuardado.idBox,
          apartado: APARTADO,
          metodoPago,
          comprobanteBase64: (metodoPago === 'Transferencia' && totalCarrito >= minTarjeta) ? comprobanteBase64 : null,
          detalles: carrito.map(i => ({ idProducto: i.idProducto, cantidad: i.cantidad }))
        })
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.mensaje || '¡Pedido realizado con éxito!');
        setCarrito([]);
        setComprobanteBase64(null);
        setActiveTab('mis-pedidos');
        cargarProductos(boxGuardado.idBox);
      } else {
        alert(data.mensaje || 'Error al procesar el pedido.');
      }
    } catch {
      alert('Error de conexión. Intenta de nuevo.');
    } finally {
      setProcesando(false);
    }
  };

  /* ── RENDERS PARCIALES ──────────────────────────────────── */
  const renderProductCard = (p) => {
    const cantEnCarrito = carrito.find(c => c.idProducto === p.idProducto)?.cantidad || 0;
    const agotado = !p.esSobrePedido && p.stockActual <= 0;
    const maxAlcanzado = !p.esSobrePedido && cantEnCarrito >= p.stockActual;
    const esFisico = activeTab === 'catalogo-fisico';

    return (
      <div className={`tb-card${agotado ? ' tb-card--agotado' : ''}`} key={p.idProducto}>
        <div className="tb-card-img">
          {p.fotoUrl
            ? <img src={p.fotoUrl} alt={p.nombre} />
            : <div className="tb-card-img-placeholder"><i className="fas fa-image" /></div>}
          {agotado && <div className="tb-badge-agotado">Agotado</div>}
          {p.esSobrePedido && <div className="tb-badge-pedido"><i className="fas fa-clock" /> Pedido</div>}
        </div>

        <div className="tb-card-body">
          <h5 className="tb-card-name">{p.nombre}</h5>

          {(p.categoria || p.talla || p.subCategoria) && (
            <div className="tb-card-badges">
              {p.categoria    && <span className="tb-pill">{p.categoria}</span>}
              {p.subCategoria && <span className="tb-pill tb-pill--accent">{p.subCategoria}</span>}
              {p.talla        && <span className="tb-pill tb-pill--light">Talla {p.talla}</span>}
            </div>
          )}

          {p.descripcion && <p className="tb-card-desc">{p.descripcion}</p>}

          <p className="tb-card-price">${p.precioVenta.toFixed(2)}</p>
          <p className="tb-card-stock">
            {p.esSobrePedido ? 'Manejo sobre pedido' : `Stock: ${p.stockActual}`}
          </p>

          {esFisico ? (
            <div className="tb-card-notice">
              <i className="fas fa-store" /> De venta en recepción
            </div>
          ) : (
            <button
              className={`tb-add-btn${cantEnCarrito > 0 ? ' tb-add-btn--in-cart' : ''}`}
              onClick={() => agregarAlCarrito(p)}
              disabled={agotado || maxAlcanzado}
            >
              <i className={`fas fa-${cantEnCarrito > 0 ? 'check' : 'cart-plus'}`} />
              {maxAlcanzado && !agotado ? 'Máximo alcanzado' : cantEnCarrito > 0 ? `En carrito (${cantEnCarrito})` : 'Agregar'}
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderCarrito = () => (
    <div className="tb-cart">
      <p className="tb-section-title" style={{ margin: 0 }}>
        <i className="fas fa-shopping-cart" /> Mi Pedido
      </p>

      {carrito.length === 0 ? (
        <div className="tb-cart-empty">
          <i className="fas fa-cart-arrow-down" />
          <p>Tu carrito está vacío.</p>
        </div>
      ) : (
        <>
          <div>
            {carrito.map(item => (
              <div className="tb-cart-item" key={item.idProducto}>
                <div className="tb-cart-item-row">
                  <span className="tb-cart-item-name">{item.nombre}</span>
                  <span className="tb-cart-item-subtotal">${(item.precioVenta * item.cantidad).toFixed(2)}</span>
                </div>
                <div className="tb-cart-controls">
                  <button className="tb-qty-btn" onClick={() => modificarCantidad(item.idProducto, -1)} disabled={item.cantidad <= 1}>
                    <i className="fas fa-minus" />
                  </button>
                  <span className="tb-qty-value">{item.cantidad}</span>
                  <button className="tb-qty-btn" onClick={() => modificarCantidad(item.idProducto, 1)}>
                    <i className="fas fa-plus" />
                  </button>
                  <button className="tb-remove-btn" onClick={() => removerDelCarrito(item.idProducto)}>
                    <i className="fas fa-trash" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="tb-cart-total">
            <span className="tb-cart-total-label">Total a Pagar</span>
            <span className="tb-cart-total-amount">${totalCarrito.toFixed(2)}</span>
          </div>

          <div>
            <label className="tb-metodo-label">Método de Pago</label>
            <select className="tb-metodo-select" value={metodoPago} onChange={e => setMetodoPago(e.target.value)}>
              {metodosTienda['Efectivo en Recepción'] && <option value="Efectivo en Recepción">Efectivo en Recepción</option>}
              {metodosTienda['Tarjeta en Recepción'] && totalCarrito >= minTarjeta && <option value="Tarjeta en Recepción">Tarjeta en Recepción (Mín. ${minTarjeta})</option>}
              {metodosTienda['Transferencia'] && totalCarrito >= minTarjeta && <option value="Transferencia">Transferencia (Mín. ${minTarjeta})</option>}
              {usuario?.esDeConfianza && <option value="Fiar (Anotar en mi cuenta)">Fiar (Anotar a mi Deuda)</option>}
            </select>
            {(metodosTienda['Tarjeta en Recepción'] || metodosTienda['Transferencia']) && totalCarrito < minTarjeta && (
              <p className="tb-cart-min-warn">
                <i className="fas fa-info-circle" /> Mínimo ${minTarjeta} para Tarjeta o Transferencia.
              </p>
            )}

            {metodoPago === 'Transferencia' && totalCarrito >= minTarjeta && (
              <div style={{ marginTop: '1rem', padding: '1rem', background: '#252535', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                <label className="tb-metodo-label" style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <i className="fas fa-file-invoice-dollar text-primary" /> Comprobante de Pago
                </label>
                <input 
                  type="file" 
                  className="form-control form-control-sm"
                  style={{ background: '#1e1e2d', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }}
                  accept="image/*"
                  onChange={handleFileChange}
                />
                <small style={{ color: '#aaa', display: 'block', marginTop: '0.4rem', fontSize: '0.75rem' }}>
                  El admin validará el comprobante (Máx. 2MB).
                </small>
              </div>
            )}
          </div>

          <div className="tb-cart-notice">
            Reservaremos tus productos por <strong>24 horas</strong>. Pasa a recepción a pagar y recoger.
          </div>

          <button className="tb-order-btn" onClick={realizarPedido} disabled={procesando || carrito.length === 0}>
            {procesando
              ? <><i className="fas fa-spinner fa-spin" /> Procesando...</>
              : <><i className="fas fa-check-circle" /> Realizar Pedido</>}
          </button>
        </>
      )}
    </div>
  );

  /* ── RENDER PRINCIPAL ───────────────────────────────────── */
  return (
    <div className="tb-page">

      {/* HEADER */}
      <header className="tb-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <BackButton to="/user-panel" />
          <div>
            <h1 className="tb-header-title">Tienda del <span>Box</span></h1>
            <p className="tb-header-sub">Productos y artículos disponibles para ti</p>
          </div>
        </div>
      </header>

      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 1rem' }}>

        {/* Banner atleta de confianza */}
        {usuario?.esDeConfianza && (
          <div className="tb-trust-banner">
            <i className="fas fa-handshake" />
            <div>
              <p className="tb-trust-title">¡Eres un atleta de confianza!</p>
              <p className="tb-trust-body">
                Como agradecimiento a tu lealtad, tienes habilitada la opción de <strong>Fiar</strong> al pagar. Realiza tu pedido sin saldo y págalo después en el Box.
              </p>
            </div>
          </div>
        )}

        {/* TABS */}
        <div className="tb-tabs">
          <button
            className={`tb-tab${activeTab === 'catalogo-fisico' ? ' tb-tab--active' : ''}`}
            onClick={() => setActiveTab('catalogo-fisico')}
          >
            <i className="fas fa-box" /> Catálogo
          </button>
          <button
            className={`tb-tab${activeTab === 'catalogo-sobre-pedido' ? ' tb-tab--active' : ''}`}
            onClick={() => setActiveTab('catalogo-sobre-pedido')}
          >
            <i className="fas fa-store" /> Sobre Pedido
          </button>
          <button
            className={`tb-tab${activeTab === 'mis-pedidos' ? ' tb-tab--active' : ''}`}
            onClick={() => setActiveTab('mis-pedidos')}
          >
            <i className="fas fa-list-alt" /> Mis Pedidos
            {misPedidos.length > 0 && activeTab !== 'mis-pedidos' && (
              <span style={{
                background: 'var(--primary)', color: '#fff', borderRadius: '50%',
                width: '16px', height: '16px', fontSize: '0.6rem', display: 'flex',
                alignItems: 'center', justifyContent: 'center', fontWeight: 700
              }}>{misPedidos.length}</span>
            )}
          </button>
        </div>

        {/* ── CATÁLOGO FÍSICO ──────────────────────────────── */}
        {activeTab === 'catalogo-fisico' && (
          <>
            {loading ? (
              <div className="tb-loader-wrap"><AtletifyLoader /><p>Cargando inventario...</p></div>
            ) : productos.length === 0 ? (
              <div className="tb-empty">
                <i className="fas fa-ghost" />
                <p>No hay productos disponibles en este momento.</p>
              </div>
            ) : (
              <>
                <p className="tb-section-title">
                  <i className="fas fa-box-open" /> Disponibles en recepción — {productos.length} producto{productos.length !== 1 ? 's' : ''}
                </p>
                <div className="tb-grid">
                  {productos.map(renderProductCard)}
                </div>
              </>
            )}
          </>
        )}

        {/* ── SOBRE PEDIDO ─────────────────────────────────── */}
        {activeTab === 'catalogo-sobre-pedido' && (
          <>
            {loading ? (
              <div className="tb-loader-wrap"><AtletifyLoader /><p>Cargando catálogo...</p></div>
            ) : (
              <div className="tb-sp-layout">
                {/* Productos */}
                <div>
                  {productos.length === 0 ? (
                    <div className="tb-empty">
                      <i className="fas fa-ghost" />
                      <p>No hay productos sobre pedido en este momento.</p>
                    </div>
                  ) : (
                    <>
                      <p className="tb-section-title">
                        <i className="fas fa-store" /> Artículos bajo pedido — {productos.length} producto{productos.length !== 1 ? 's' : ''}
                      </p>
                      <div className="tb-grid">
                        {productos.map(renderProductCard)}
                      </div>
                    </>
                  )}
                </div>

                {/* Carrito */}
                {renderCarrito()}
              </div>
            )}
          </>
        )}

        {/* ── MIS PEDIDOS ──────────────────────────────────── */}
        {activeTab === 'mis-pedidos' && (
          <>
            <p className="tb-section-title">
              <i className="fas fa-history" /> Historial de pedidos
            </p>

            {cargandoPedidos ? (
              <div className="tb-loader-wrap"><AtletifyLoader /><p>Cargando tus pedidos...</p></div>
            ) : misPedidos.length === 0 ? (
              <div className="tb-empty">
                <i className="fas fa-box-open" />
                <p>Aún no has realizado pedidos.</p>
                <button className="tb-empty-btn" onClick={() => setActiveTab('catalogo-sobre-pedido')}>
                  Ir al Catálogo
                </button>
              </div>
            ) : (
              <div>
                {misPedidos.map(p => (
                  <div
                    className="tb-order-card"
                    key={p.idVenta}
                    onClick={() => setPedidoExpandido(pedidoExpandido === p.idVenta ? null : p.idVenta)}
                  >
                    <div className="tb-order-header">
                      <div className="tb-order-info">
                        <p className="tb-order-id">
                          Pedido #{p.idVenta}
                          {' '}
                          <span className={`tb-status ${statusClass(p.estatus)}`}>{p.estatus}</span>
                        </p>
                        <p className="tb-order-date">
                          <i className="fas fa-calendar-alt" />{' '}
                          {new Date(p.fechaVenta).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                        <p className="tb-order-method">
                          <i className="fas fa-money-bill-wave" /> {p.metodoPago}
                        </p>
                      </div>

                      <div className="tb-order-meta">
                        <p className="tb-order-total-label">Total</p>
                        <p className="tb-order-total">${p.totalVenta.toFixed(2)}</p>
                        <p className="tb-order-count">{p.detalles?.length || 0} artículo(s)</p>
                      </div>

                      <div className="tb-order-actions">
                        <button className="tb-icon-btn" title="Enviar recibo a mi correo" onClick={e => enviarRecibo(e, p.idVenta)}>
                          <i className="fas fa-envelope" />
                        </button>
                        <button className="tb-icon-btn" title="Ver detalles" onClick={e => { e.stopPropagation(); setPedidoExpandido(pedidoExpandido === p.idVenta ? null : p.idVenta); }}>
                          <i className={`fas fa-chevron-${pedidoExpandido === p.idVenta ? 'up' : 'down'}`} />
                        </button>
                      </div>
                    </div>

                    {pedidoExpandido === p.idVenta && (
                      <>
                        <hr className="tb-order-divider" />
                        <div className="tb-order-body">
                          <p className="tb-order-body-title"><i className="fas fa-box-open" /> Artículos del pedido</p>
                          <div className="tb-order-items-grid">
                            {p.detalles?.map(d => (
                              <div className="tb-order-item" key={d.idDetalle}>
                                <div className="tb-order-item-thumb">
                                  {d.producto?.fotoUrl
                                    ? <img src={d.producto.fotoUrl} alt={d.producto.nombre} />
                                    : <i className="fas fa-image" />}
                                </div>
                                <div className="tb-order-item-info">
                                  <p className="tb-order-item-name">{d.producto?.nombre}</p>
                                  <p className="tb-order-item-qty">
                                    {d.cantidad} × ${d.precioUnitario.toFixed(2)}
                                    {d.producto?.talla && ` · Talla ${d.producto.talla}`}
                                  </p>
                                </div>
                                <span className="tb-order-item-sub">${d.subtotal.toFixed(2)}</span>
                              </div>
                            ))}
                          </div>

                          {p.estatus === 'Pendiente' && p.fechaVencimiento && (
                            <div className="tb-vencimiento-warn">
                              <i className="fas fa-exclamation-triangle" />
                              Tienes hasta las{' '}
                              {new Date(p.fechaVencimiento).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}{' '}
                              de mañana para pagarlo en el Box.
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
}
