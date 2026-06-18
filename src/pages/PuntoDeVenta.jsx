import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PRODUCTOS_ENDPOINT, VENTAS_ENDPOINT } from '../services/api';
import BackButton from '../components/BackButton';
import BotonSeguro from '../components/BotonSeguro';
import ModalFiar from '../components/ModalFiar';
import '../assets/css/PuntoDeVenta.css';
import AtletifyLoader from '../components/AtletifyLoader';

export default function PuntoDeVenta() {
  const navigate = useNavigate();
  const [box, setBox] = useState(null);
  const [productos, setProductos] = useState([]);
  const [buscar, setBuscar] = useState('');
  const [carrito, setCarrito] = useState([]);
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [modalFiarOpen, setModalFiarOpen] = useState(false);
  const [modalCobrarOpen, setModalCobrarOpen] = useState(false);
  const [metodoCobro, setMetodoCobro] = useState('Efectivo');
  const [config, setConfig] = useState(null); // config del box: métodos de pago + compra mínima tarjeta

  // Modal de opciones (talla + personalización) para sobre-pedido
  const [modalPedido, setModalPedido] = useState(null);
  const [mpTalla, setMpTalla] = useState('');
  const [mpTexto, setMpTexto] = useState('');

  useEffect(() => {
    const b = JSON.parse(localStorage.getItem('box'));
    if (!b) { navigate('/admin-box-panel'); return; }
    setBox(b);
  }, [navigate]);

  // Carga la config del box para habilitar/deshabilitar los métodos de pago igual que en editar-box
  useEffect(() => {
    if (!box) return;
    (async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/configuracionbox/${box.idBox}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) setConfig(await res.json());
      } catch { /* graceful: sin config, todos los métodos quedan habilitados */ }
    })();
  }, [box]);

  const cargarProductos = useCallback(async () => {
    if (!box) return;
    setLoading(true);
    try {
      const apartadoActual = localStorage.getItem('apartadoVentas') || 'General (Box)';
      const url = buscar
        ? `${PRODUCTOS_ENDPOINT}/${box.idBox}?buscar=${encodeURIComponent(buscar)}&apartado=${encodeURIComponent(apartadoActual)}`
        : `${PRODUCTOS_ENDPOINT}/${box.idBox}?apartado=${encodeURIComponent(apartadoActual)}`;

      const token = localStorage.getItem('token');
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setProductos(Array.isArray(data) ? data : []);
    } catch {
      alert('Error al cargar productos.');
    } finally {
      setLoading(false);
    }
  }, [box, buscar]);

  useEffect(() => { cargarProductos(); }, [cargarProductos]);

  // Identidad de línea: mismo producto con distinta talla/nombre = líneas distintas.
  const claveDe = (idProducto, talla, texto) => `${idProducto}|${talla || ''}|${(texto || '').trim().toUpperCase()}`;
  const requiereOpciones = (p) => p.esSobrePedido && (((p.tallasDisponibles || '').trim()) || p.permitePersonalizacion);

  function nuevaLinea(producto, cantidad, talla, texto, cargoPers) {
    return {
      claveLinea: claveDe(producto.idProducto, talla, texto),
      producto,
      cantidad,
      tallaElegida: talla || null,
      textoPersonalizacion: texto || null,
      cargoPers: cargoPers || 0
    };
  }

  function agregarAlCarrito(producto) {
    if (!producto.esSobrePedido && producto.stockActual <= 0) return;
    if (requiereOpciones(producto)) { abrirModalPedido(producto); return; }

    const clave = claveDe(producto.idProducto, '', '');
    setCarrito(prev => {
      const existe = prev.find(i => i.claveLinea === clave);
      if (existe) {
        if (!producto.esSobrePedido && existe.cantidad >= producto.stockActual) return prev;
        return prev.map(i => i.claveLinea === clave ? { ...i, cantidad: i.cantidad + 1 } : i);
      }
      return [...prev, nuevaLinea(producto, 1, null, null, 0)];
    });
  }

  function abrirModalPedido(p) { setModalPedido(p); setMpTalla(''); setMpTexto(''); }
  function cerrarModalPedido() { setModalPedido(null); setMpTalla(''); setMpTexto(''); }

  function confirmarLineaPedido() {
    const p = modalPedido;
    if (!p) return;
    const tallas = (p.tallasDisponibles || '').split(',').map(s => s.trim()).filter(Boolean);
    if (tallas.length && !mpTalla) { alert('Elige una talla.'); return; }
    let texto = mpTexto.trim();
    if (texto.length > 12) { alert('El nombre admite máximo 12 caracteres.'); return; }
    if (!p.permitePersonalizacion) texto = '';
    const cargo = (p.permitePersonalizacion && texto) ? (p.costoPersonalizacion || 0) : 0;
    const clave = claveDe(p.idProducto, mpTalla, texto);
    setCarrito(prev => {
      const existe = prev.find(i => i.claveLinea === clave);
      if (existe) return prev.map(i => i.claveLinea === clave ? { ...i, cantidad: i.cantidad + 1 } : i);
      return [...prev, nuevaLinea(p, 1, mpTalla || null, texto || null, cargo)];
    });
    cerrarModalPedido();
  }

  function cambiarCantidad(claveLinea, valor) {
    const num = parseInt(valor);
    const item = carrito.find(i => i.claveLinea === claveLinea);
    if (!item) return;
    if (isNaN(num) || num < 1) { quitarDelCarrito(claveLinea); return; }
    if (!item.producto.esSobrePedido && num > item.producto.stockActual) return;
    setCarrito(prev => prev.map(i => i.claveLinea === claveLinea ? { ...i, cantidad: num } : i));
  }

  function quitarDelCarrito(claveLinea) {
    setCarrito(prev => prev.filter(i => i.claveLinea !== claveLinea));
  }

  const precioLinea = (it) => it.producto.precioVenta + (it.cargoPers || 0);
  const totalVenta = carrito.reduce((acc, i) => acc + precioLinea(i) * i.cantidad, 0);

  // Métodos de pago según la config del box (editar-box).
  //  - visible: el método está ACTIVO en la config → si no, NO se muestra.
  //  - habilitado: visible y además cumple la regla (Tarjeta requiere compra mínima).
  // Mientras la config no carga (o falla), se muestran todos para no romper el flujo.
  const minTarjeta = config?.compraMinimaTarjeta ?? 0;
  const metodosPago = [
    { value: 'Efectivo', icon: 'fa-money-bill-wave', label: 'Efectivo',
      visible: !config || config.aceptarEfectivo, habilitado: true, motivo: '' },
    { value: 'Tarjeta en Recepción', icon: 'fa-credit-card', label: 'Tarjeta',
      visible: !config || config.aceptarTarjetaRecepcion, habilitado: totalVenta >= minTarjeta,
      motivo: `Mínimo $${minTarjeta}` },
    { value: 'Transferencia', icon: 'fa-university', label: 'Transferencia',
      visible: !config || config.aceptarTransferencias, habilitado: true, motivo: '' },
  ].filter(m => m.visible);
  const metodoCobroHabilitado = metodosPago.some(m => m.value === metodoCobro && m.habilitado);

  const realizarVenta = async (esFiado = false, idUsuario = null, metodo = 'Efectivo') => {
    if (carrito.length === 0) return;
    setProcesando(true);
    const apartadoActual = localStorage.getItem('apartadoVentas') || 'General (Box)';

    try {
      const payload = {
        idBox: box.idBox,
        apartado: apartadoActual,
        detalles: carrito.map(i => ({ idProducto: i.producto.idProducto, cantidad: i.cantidad, tallaElegida: i.tallaElegida || null, textoPersonalizacion: i.textoPersonalizacion || null }))
      };

      if (esFiado && idUsuario) {
        payload.metodoPago = "Fiado";
        payload.idUsuario = idUsuario;
      } else {
        payload.metodoPago = metodo;
      }

      const res = await fetch(VENTAS_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.mensaje || 'Error al procesar la venta.');
      }
      alert(esFiado ? `Deuda registrada con éxito por $${totalVenta.toFixed(2)}` : `Venta registrada con éxito: $${totalVenta.toFixed(2)}`);
      setCarrito([]);
      setModalFiarOpen(false);
      await cargarProductos();
    } catch (err) {
      alert(err.message || 'Error al procesar la venta.');
    } finally {
      setProcesando(false);
    }
  }

  const handleConfirmarFiar = (atleta) => {
    realizarVenta(true, atleta.idUsuario);
  };

    const apartadoActual = localStorage.getItem('apartadoVentas') || 'General (Box)';
    const apartadosDataStr = localStorage.getItem('apartadosData');
    let tienePermiso = true;
    if (apartadosDataStr) {
      try {
        const apartadosData = JSON.parse(apartadosDataStr);
        const currentData = apartadosData.find(a => a.nombre === apartadoActual);
        if (currentData && currentData.esPrivado) {
          const rol = usuario?.rol;
          if (currentData.permisoVenta === "SoloAdmin" && rol !== "AdminBox" && rol !== "Developer") {
            tienePermiso = false;
          } else if (currentData.permisoVenta === "AdminYCoach" && rol !== "AdminBox" && rol !== "Developer" && rol !== "Coach") {
            tienePermiso = false;
          }
        }
      } catch (e) {
        console.error("Error parsing apartados data", e);
      }
    }

    const puedeFiar = tienePermiso && (!localStorage.getItem('apartadoVentas') || localStorage.getItem('apartadoVentas') === 'General (Box)');

  return (
    <div className="pdv-page">

      {/* ══════════════════════════════════
          HEADER
      ══════════════════════════════════ */}
      <header className="pdv-header">
          <div className="d-flex align-items-center justify-content-between gap-3">

            <div className="d-flex align-items-center gap-3">
              <BackButton to="/gestion-ventas-productos" />
              <div className="pdv-header-icon d-none d-sm-flex">
                <i className="fas fa-cash-register"></i>
              </div>
              <h1 className="pdv-header-title">
                Punto de <span>Venta</span>
              </h1>
            </div>

            {/* Badge resumen en móvil */}
            {carrito.length > 0 && (
              <span className="pdv-badge-movil d-lg-none">
                <i className="fas fa-shopping-cart"></i>
                {carrito.length} · ${totalVenta.toFixed(2)}
              </span>
            )}

          </div>
      </header>

      <div className="container-xl px-3 px-md-4 pb-5">
        <div className="row g-3 g-md-4">

          {/* ══════════════════════════════════
              CARRITO — primero en móvil
          ══════════════════════════════════ */}
          <div className="col-12 col-lg-4 order-1 order-lg-2">
            <div className="pdv-carrito-panel">

              <div className="pdv-carrito-header">
                <p className="pdv-carrito-title">
                  <i className="fas fa-shopping-cart"></i>
                  Cuenta actual
                </p>
                {!tienePermiso && (
                  <span className="badge bg-danger rounded-pill px-2">Solo Lectura</span>
                )}
              </div>

              {carrito.length === 0 ? (
                <div className="pdv-carrito-vacio">
                  <i className="fas fa-cart-plus"></i>
                  <p>Toca un producto para agregarlo</p>
                </div>
              ) : (
                <>
                  <div className="pdv-carrito-lista">
                    {carrito.map(item => (
                      <div key={item.claveLinea} className="pdv-carrito-item">

                        <div className="pdv-carrito-item-info">
                          <p className="pdv-carrito-item-nombre">
                            {item.producto.nombre}
                            {item.tallaElegida && <span className="pdv-carrito-variant"> · {item.tallaElegida}</span>}
                          </p>
                          {item.textoPersonalizacion && (
                            <p className="pdv-carrito-pers"><i className="fas fa-pen-nib"></i> &ldquo;{item.textoPersonalizacion}&rdquo;{item.cargoPers > 0 ? ` +$${item.cargoPers.toFixed(2)}` : ''}</p>
                          )}
                          <p className="pdv-carrito-item-pu">
                            ${precioLinea(item).toFixed(2)} c/u
                          </p>
                        </div>

                        <div className="pdv-qty-ctrl">
                          <button
                            className="pdv-qty-btn"
                            onClick={() => cambiarCantidad(item.claveLinea, item.cantidad - 1)}
                          >
                            <i className="fas fa-minus"></i>
                          </button>
                          <span className="pdv-qty-num">{item.cantidad}</span>
                          <button
                            className="pdv-qty-btn"
                            onClick={() => cambiarCantidad(item.claveLinea, item.cantidad + 1)}
                          >
                            <i className="fas fa-plus"></i>
                          </button>
                        </div>

                        <div className="pdv-carrito-item-right">
                          <p className="pdv-carrito-item-subtotal">
                            ${(precioLinea(item) * item.cantidad).toFixed(2)}
                          </p>
                          <button
                            className="pdv-quitar-btn"
                            onClick={() => quitarDelCarrito(item.claveLinea)}
                            title="Quitar del carrito"
                          >
                            <i className="fas fa-trash-alt"></i>
                          </button>
                        </div>

                      </div>
                    ))}
                  </div>

                  <div className="pdv-total-zona">
                    <div className="pdv-total-row">
                      <span className="pdv-total-label">Total a pagar</span>
                      <span className="pdv-total-amount">${totalVenta.toFixed(2)}</span>
                    </div>
                    <div className="d-flex gap-2">
                      <button
                        className="pdv-cobrar-btn w-100"
                        onClick={() => { const habilitado = metodosPago.find(m => m.habilitado); if (habilitado) setMetodoCobro(habilitado.value); setModalCobrarOpen(true); }}
                        disabled={procesando || !tienePermiso}
                        title={!tienePermiso ? "No tienes permisos para vender en esta tienda." : ""}
                      >
                        <i className="fas fa-check-circle"></i>Cobrar
                      </button>
                      {puedeFiar && (
                        <button
                          className="pdv-cobrar-btn btn-warning w-100"
                          style={{backgroundColor: '#ffc107', borderColor: '#ffc107', color: '#000'}}
                          onClick={() => setModalFiarOpen(true)}
                          disabled={!tienePermiso}
                        >
                          <i className="fas fa-hand-holding-usd"></i>Fiar
                        </button>
                      )}
                    </div>
                    <button
                      className="pdv-vaciar-btn"
                      onClick={() => setCarrito([])}
                    >
                      <i className="fas fa-times"></i>Cancelar / Vaciar
                    </button>
                  </div>
                </>
              )}

            </div>
          </div>

          {/* ══════════════════════════════════
              CATÁLOGO — segundo en móvil
          ══════════════════════════════════ */}
          <div className="col-12 col-lg-8 order-2 order-lg-1">

            {/* Buscador */}
            <div className="pdv-search-wrap">
              <span className="pdv-search-icon">
                <i className="fas fa-search"></i>
              </span>
              <input
                className="pdv-search-input"
                placeholder="Buscar producto..."
                value={buscar}
                onChange={e => setBuscar(e.target.value)}
              />
            </div>

            {/* Grid de productos */}
            {loading ? (
              <div className="pdv-loading">
                <AtletifyLoader />
              </div>
            ) : productos.length === 0 ? (
              <div className="pdv-empty">
                <i className="fas fa-box-open"></i>
                <p>{buscar ? 'Sin resultados para tu búsqueda' : 'No hay productos en el catálogo'}</p>
              </div>
            ) : (
              <div className="row g-2 g-md-3">
                {productos.map(p => {
                  const sinStock = !p.esSobrePedido && p.stockActual <= 0;
                  const cantEnCarrito = carrito.filter(i => i.producto.idProducto === p.idProducto).reduce((a, i) => a + i.cantidad, 0);
                  const enCarrito = cantEnCarrito > 0;
                  const tieneImagen = p.fotoUrl && p.fotoUrl.trim() !== '';
                  return (
                    <div key={p.idProducto} className="col-6 col-md-4 col-xl-3">
                      <div
                        className={`pdv-producto-card ${enCarrito ? 'pdv-producto-card--en-carrito' : ''} ${sinStock ? 'pdv-producto-card--sin-stock' : ''}`}
                        onClick={() => !sinStock && agregarAlCarrito(p)}
                      >
                        {enCarrito && (
                          <span className="pdv-en-carrito-badge">
                            {cantEnCarrito}
                          </span>
                        )}

                        {tieneImagen ? (
                          <img
                            src={p.fotoUrl}
                            alt={p.nombre}
                            className="pdv-producto-img"
                            onError={e => { e.target.style.display = 'none'; }}
                          />
                        ) : (
                          <div className="pdv-producto-no-img">
                            <span>{p.nombre.charAt(0)}</span>
                          </div>
                        )}

                        <div className="pdv-precio-strip">
                          <p className="pdv-producto-precio">${parseFloat(p.precioVenta).toFixed(2)}</p>
                        </div>

                        <div className="pdv-producto-content">
                          <p className="pdv-producto-nombre">{p.nombre}</p>
                        </div>

                        <div className="pdv-card-foot">
                          <span className={`pdv-producto-stock ${p.esSobrePedido ? 'pdv-producto-stock--pedido' : (sinStock ? 'pdv-producto-stock--out' : 'pdv-producto-stock--ok')}`}>
                            {p.esSobrePedido ? 'Sobre pedido' : (sinStock ? 'Sin stock' : `${p.stockActual} uds`)}
                          </span>
                          {!sinStock && (
                            <span className="pdv-add-hint">
                              <i className="fas fa-plus"></i>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

          </div>

        </div>
      </div>

      {modalFiarOpen && box && (
        <ModalFiar 
          boxId={box.idBox} 
          onClose={() => setModalFiarOpen(false)} 
          onConfirm={handleConfirmarFiar} 
        />
      )}

      {/* Modal para Confirmar Cobro */}
      {modalCobrarOpen && (
        <div
          className="pdv-cobro-overlay"
          onClick={() => !procesando && setModalCobrarOpen(false)}
        >
          <div className="pdv-cobro-panel" onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="pdv-cobro-header">
              <span className="pdv-cobro-header-icon">
                <i className="fas fa-check-circle"></i>
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p className="pdv-cobro-title">Confirmar Cobro</p>
                <p className="pdv-cobro-subtitle">Revisa el resumen y selecciona el método de pago</p>
              </div>
              <button
                className="pdv-cobro-close"
                onClick={() => setModalCobrarOpen(false)}
                disabled={procesando}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            {/* Body */}
            <div className="pdv-cobro-body">

              {/* Monto total */}
              <div className="pdv-cobro-monto-wrap">
                <p className="pdv-cobro-monto-label">Total a cobrar</p>
                <p className="pdv-cobro-monto">${totalVenta.toFixed(2)}</p>
              </div>

              {/* Resumen del carrito */}
              <div>
                <p className="pdv-cobro-section-label">
                  <i className="fas fa-shopping-cart" style={{ marginRight: '0.4rem' }}></i>
                  {carrito.length} producto{carrito.length !== 1 ? 's' : ''}
                </p>
                <div className="pdv-cobro-items">
                  {carrito.map(item => (
                    <div key={item.claveLinea} className="pdv-cobro-item">
                      <p className="pdv-cobro-item-nombre">
                        {item.producto.nombre}
                        {item.tallaElegida ? ` · ${item.tallaElegida}` : ''}
                        {item.textoPersonalizacion ? ` · "${item.textoPersonalizacion}"` : ''}
                      </p>
                      <span className="pdv-cobro-item-qty">x{item.cantidad}</span>
                      <p className="pdv-cobro-item-precio">
                        ${(precioLinea(item) * item.cantidad).toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Método de pago */}
              <div>
                <p className="pdv-cobro-section-label">
                  <i className="fas fa-wallet" style={{ marginRight: '0.4rem' }}></i>
                  Método de pago
                </p>
                {metodosPago.length === 0 ? (
                  <div className="pdv-metodo-vacio">
                    <i className="fas fa-triangle-exclamation"></i>
                    No hay métodos de pago habilitados. Actívalos en Editar Box → Configuración Financiera.
                  </div>
                ) : (
                  <div className="pdv-metodo-grid" style={{ gridTemplateColumns: `repeat(${metodosPago.length}, minmax(0, 1fr))` }}>
                    {metodosPago.map(m => (
                      <button
                        key={m.value}
                        type="button"
                        disabled={!m.habilitado}
                        title={!m.habilitado ? m.motivo : ''}
                        className={`pdv-metodo-btn ${metodoCobro === m.value && m.habilitado ? 'pdv-metodo-btn--activo' : ''} ${!m.habilitado ? 'pdv-metodo-btn--off' : ''}`}
                        onClick={() => setMetodoCobro(m.value)}
                      >
                        <i className={`fas ${m.icon}`}></i>
                        <span>{m.label}</span>
                        {!m.habilitado && <small className="pdv-metodo-motivo">{m.motivo}</small>}
                        {m.habilitado && metodoCobro === m.value && (
                          <i className="fas fa-check-circle pdv-metodo-check"></i>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

            </div>

            {/* Footer */}
            <div className="pdv-cobro-footer">
              <button
                className="pdv-cobro-btn pdv-cobro-btn--cancel"
                onClick={() => setModalCobrarOpen(false)}
                disabled={procesando}
              >
                <i className="fas fa-times"></i> Cancelar
              </button>
              <button
                className="pdv-cobro-btn pdv-cobro-btn--confirm"
                onClick={() => { setModalCobrarOpen(false); realizarVenta(false, null, metodoCobro); }}
                disabled={procesando || !metodoCobroHabilitado}
                title={!metodoCobroHabilitado ? 'Selecciona un método de pago habilitado' : ''}
              >
                {procesando
                  ? <><span className="pdv-cobro-spinner"></span> Registrando...</>
                  : <><i className="fas fa-check"></i> Cobrar</>
                }
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Modal de opciones para sobre-pedido (talla + personalización) */}
      {modalPedido && (
        <div className="pdv-cobro-overlay" onClick={cerrarModalPedido}>
          <div className="pdv-cobro-panel" onClick={e => e.stopPropagation()}>

            <div className="pdv-cobro-header">
              <span className="pdv-cobro-header-icon"><i className="fas fa-store"></i></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p className="pdv-cobro-title">{modalPedido.nombre}</p>
                <p className="pdv-cobro-subtitle">Sobre pedido · elige las opciones</p>
              </div>
              <button className="pdv-cobro-close" onClick={cerrarModalPedido}><i className="fas fa-times"></i></button>
            </div>

            <div className="pdv-cobro-body">
              <p className="pdv-modal-precio">${modalPedido.precioVenta.toFixed(2)}</p>

              {(modalPedido.tallasDisponibles || '').trim() && (
                <div>
                  <p className="pdv-cobro-section-label"><i className="fas fa-tshirt" style={{ marginRight: '0.4rem' }}></i>Talla *</p>
                  <div className="pdv-tallas-grid">
                    {modalPedido.tallasDisponibles.split(',').map(s => s.trim()).filter(Boolean).map(t => (
                      <button type="button" key={t} className={`pdv-talla-chip ${mpTalla === t ? 'pdv-talla-chip--activa' : ''}`} onClick={() => setMpTalla(t)}>{t}</button>
                    ))}
                  </div>
                </div>
              )}

              {modalPedido.permitePersonalizacion && (
                <div>
                  <p className="pdv-cobro-section-label">
                    <i className="fas fa-pen-nib" style={{ marginRight: '0.4rem' }}></i>
                    ¿Nombre? <span style={{ color: 'var(--accent)' }}>+${(modalPedido.costoPersonalizacion || 0).toFixed(2)}</span>
                  </p>
                  <input type="text" className="pdv-modal-input" maxLength={12} value={mpTexto} onChange={e => setMpTexto(e.target.value)} placeholder="Hasta 12 letras (opcional)" />
                  <p className="pdv-modal-hint">{12 - mpTexto.length} caracteres restantes</p>
                </div>
              )}
            </div>

            <div className="pdv-cobro-footer">
              <button className="pdv-cobro-btn pdv-cobro-btn--cancel" onClick={cerrarModalPedido}><i className="fas fa-times"></i> Cancelar</button>
              <button className="pdv-cobro-btn pdv-cobro-btn--confirm" onClick={confirmarLineaPedido}><i className="fas fa-cart-plus"></i> Agregar</button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
