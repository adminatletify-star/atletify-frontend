import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PRODUCTOS_ENDPOINT, VENTAS_ENDPOINT } from '../services/api';
import BackButton from '../components/BackButton';
import BotonSeguro from '../components/BotonSeguro';
import ModalFiar from '../components/ModalFiar';
import '../assets/css/PuntoDeVenta.css';

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

  useEffect(() => {
    const b = JSON.parse(localStorage.getItem('box'));
    if (!b) { navigate('/admin-box-panel'); return; }
    setBox(b);
  }, [navigate]);

  const cargarProductos = useCallback(async () => {
    if (!box) return;
    setLoading(true);
    try {
      const apartadoActual = localStorage.getItem('apartadoVentas') || 'General (Box)';
      const url = buscar
        ? `${PRODUCTOS_ENDPOINT}/${box.idBox}?buscar=${encodeURIComponent(buscar)}&apartado=${encodeURIComponent(apartadoActual)}`
        : `${PRODUCTOS_ENDPOINT}/${box.idBox}?apartado=${encodeURIComponent(apartadoActual)}`;

      const res = await fetch(url);
      const data = await res.json();
      setProductos(Array.isArray(data) ? data : []);
    } catch {
      alert('Error al cargar productos.');
    } finally {
      setLoading(false);
    }
  }, [box, buscar]);

  useEffect(() => { cargarProductos(); }, [cargarProductos]);

  function agregarAlCarrito(producto) {
    if (producto.stockActual <= 0) return;
    setCarrito(prev => {
      const existe = prev.find(i => i.producto.idProducto === producto.idProducto);
      if (existe) {
        if (existe.cantidad >= producto.stockActual) return prev;
        return prev.map(i =>
          i.producto.idProducto === producto.idProducto
            ? { ...i, cantidad: i.cantidad + 1 }
            : i
        );
      }
      return [...prev, { producto, cantidad: 1 }];
    });
  }

  function cambiarCantidad(idProducto, valor) {
    const num = parseInt(valor);
    const item = carrito.find(i => i.producto.idProducto === idProducto);
    if (!item) return;
    if (isNaN(num) || num < 1) { quitarDelCarrito(idProducto); return; }
    if (num > item.producto.stockActual) return;
    setCarrito(prev => prev.map(i =>
      i.producto.idProducto === idProducto ? { ...i, cantidad: num } : i
    ));
  }

  function quitarDelCarrito(idProducto) {
    setCarrito(prev => prev.filter(i => i.producto.idProducto !== idProducto));
  }

  const totalVenta = carrito.reduce((acc, i) => acc + i.producto.precioVenta * i.cantidad, 0);

  const realizarVenta = async (esFiado = false, idUsuario = null, metodo = 'Efectivo') => {
    if (carrito.length === 0) return;
    setProcesando(true);
    const apartadoActual = localStorage.getItem('apartadoVentas') || 'General (Box)';

    try {
      const payload = {
        idBox: box.idBox,
        apartado: apartadoActual,
        detalles: carrito.map(i => ({ idProducto: i.producto.idProducto, cantidad: i.cantidad }))
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
                      <div key={item.producto.idProducto} className="pdv-carrito-item">

                        <div className="pdv-carrito-item-info">
                          <p className="pdv-carrito-item-nombre">{item.producto.nombre}</p>
                          <p className="pdv-carrito-item-pu">
                            ${parseFloat(item.producto.precioVenta).toFixed(2)} c/u
                          </p>
                        </div>

                        <div className="pdv-qty-ctrl">
                          <button
                            className="pdv-qty-btn"
                            onClick={() => cambiarCantidad(item.producto.idProducto, item.cantidad - 1)}
                          >
                            <i className="fas fa-minus"></i>
                          </button>
                          <span className="pdv-qty-num">{item.cantidad}</span>
                          <button
                            className="pdv-qty-btn"
                            onClick={() => cambiarCantidad(item.producto.idProducto, item.cantidad + 1)}
                          >
                            <i className="fas fa-plus"></i>
                          </button>
                        </div>

                        <div className="pdv-carrito-item-right">
                          <p className="pdv-carrito-item-subtotal">
                            ${(item.producto.precioVenta * item.cantidad).toFixed(2)}
                          </p>
                          <button
                            className="pdv-quitar-btn"
                            onClick={() => quitarDelCarrito(item.producto.idProducto)}
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
                        onClick={() => setModalCobrarOpen(true)}
                        disabled={procesando}
                      >
                        <i className="fas fa-check-circle"></i>Cobrar
                      </button>
                      {(!localStorage.getItem('apartadoVentas') || localStorage.getItem('apartadoVentas') === 'General (Box)') && (
                        <button
                          className="pdv-cobrar-btn btn-warning w-100"
                          style={{backgroundColor: '#ffc107', borderColor: '#ffc107', color: '#000'}}
                          onClick={() => setModalFiarOpen(true)}
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
                <div className="spinner-wp"></div>
              </div>
            ) : productos.length === 0 ? (
              <div className="pdv-empty">
                <i className="fas fa-box-open"></i>
                <p>{buscar ? 'Sin resultados para tu búsqueda' : 'No hay productos en el catálogo'}</p>
              </div>
            ) : (
              <div className="row g-2 g-md-3">
                {productos.map(p => {
                  const sinStock = p.stockActual <= 0;
                  const enCarrito = carrito.find(i => i.producto.idProducto === p.idProducto);
                  const tieneImagen = p.fotoUrl && p.fotoUrl.trim() !== '';
                  return (
                    <div key={p.idProducto} className="col-6 col-md-4 col-xl-3">
                      <div
                        className={`pdv-producto-card ${enCarrito ? 'pdv-producto-card--en-carrito' : ''} ${sinStock ? 'pdv-producto-card--sin-stock' : ''}`}
                        onClick={() => !sinStock && agregarAlCarrito(p)}
                      >
                        {enCarrito && (
                          <span className="pdv-en-carrito-badge">
                            {enCarrito.cantidad}
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
                          <span className={`pdv-producto-stock ${sinStock ? 'pdv-producto-stock--out' : 'pdv-producto-stock--ok'}`}>
                            {sinStock ? 'Sin stock' : `${p.stockActual} uds`}
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
          onClick={() => !procesando && setModalCobrarOpen(false)} 
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
              <h5 className="mb-0 text-white">Confirmar Cobro</h5>
              <button 
                className="btn-close btn-close-white" 
                onClick={() => setModalCobrarOpen(false)} 
                disabled={procesando}
              ></button>
            </div>
            <div className="p-4 text-white">
              <div className="text-center mb-4">
                <p className="text-muted mb-1">Total a cobrar:</p>
                <h2 className="text-success fw-bold mb-0">${totalVenta.toFixed(2)}</h2>
              </div>
              
              <div className="mb-4">
                <label className="form-label text-muted">¿Cómo pagó el cliente?</label>
                <select 
                  className="form-select bg-dark text-white border-secondary"
                  value={metodoCobro}
                  onChange={e => setMetodoCobro(e.target.value)}
                >
                  <option value="Efectivo">Efectivo</option>
                  <option value="Tarjeta en Recepción">Tarjeta en Recepción</option>
                </select>
              </div>

              <button 
                className="btn btn-success w-100 fw-bold py-2"
                onClick={() => {
                  setModalCobrarOpen(false);
                  realizarVenta(false, null, metodoCobro);
                }}
                disabled={procesando}
              >
                {procesando ? <span className="spinner-border spinner-border-sm me-2"></span> : <i className="fas fa-check-circle me-2"></i>}
                Confirmar y Registrar Venta
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
