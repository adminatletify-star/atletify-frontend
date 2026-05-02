import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PRODUCTOS_ENDPOINT } from '../services/api';
import BackButton from '../components/BackButton';
import BotonSeguro from '../components/BotonSeguro';
import '../assets/css/GestionInventario.css';

const FORM_VACIO = { nombre: '', precioVenta: '', stockActual: '', stockMinimo: '', fotoUrl: '', categoria: '', subCategoria: '', talla: '', descripcion: '', esSobrePedido: false, esBorrador: false };

export default function GestionInventario() {
  const navigate = useNavigate();
  const [box, setBox] = useState(null);
  const [productos, setProductos] = useState([]);
  const [buscar, setBuscar] = useState('');
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);

  // Formulario: null = oculto, 'nuevo' = agregar, número = editar
  const [modoForm, setModoForm] = useState(null);
  const [form, setForm] = useState(FORM_VACIO);
  const [agregarStockId, setAgregarStockId] = useState(null);
  const [cantidadAStock, setCantidadAStock] = useState('');
  const [soloStockBajo, setSoloStockBajo] = useState(false);
  const [vistaActual, setVistaActual] = useState('todos');

  const apartadoActual = localStorage.getItem('apartadoVentas') || 'General (Box)';

  useEffect(() => {
    const b = JSON.parse(localStorage.getItem('box'));
    if (!b) { navigate('/admin-box-panel'); return; }
    setBox(b);
  }, [navigate]);

  const cargarProductos = useCallback(async () => {
    if (!box) return;
    setLoading(true);
    try {
      const url = buscar
        ? `${PRODUCTOS_ENDPOINT}/${box.idBox}?buscar=${encodeURIComponent(buscar)}&apartado=${encodeURIComponent(apartadoActual)}`
        : `${PRODUCTOS_ENDPOINT}/${box.idBox}?apartado=${encodeURIComponent(apartadoActual)}`;

      const res = await fetch(url);
      const data = await res.json();
      setProductos(Array.isArray(data) ? data : []);
    } catch (e) {
      void e;
      alert('Error al cargar productos.');
    } finally {
      setLoading(false);
    }
  }, [box, buscar]);

  useEffect(() => { cargarProductos(); }, [cargarProductos]);

  function abrirNuevo() {
    setForm(FORM_VACIO);
    setModoForm('nuevo');
  }

  function abrirEditar(p) {
    setForm({
      nombre: p.nombre,
      precioVenta: p.precioVenta,
      stockActual: p.stockActual,
      stockMinimo: p.stockMinimo,
      fotoUrl: p.fotoUrl || '',
      categoria: p.categoria || '',
      subCategoria: p.subCategoria || '',
      talla: p.talla || '',
      descripcion: p.descripcion || '',
      esSobrePedido: p.esSobrePedido || false,
      esBorrador: p.esBorrador || false
    });
    setModoForm(p.idProducto);
  }

  function cerrarForm() {
    setModoForm(null);
    setForm(FORM_VACIO);
  }

  async function guardar(e) {
    e.preventDefault();
    if (!form.nombre.trim()) { alert('El nombre es obligatorio.'); return; }
    setGuardando(true);

    try {
      if (modoForm === 'nuevo') {
        const res = await fetch(PRODUCTOS_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            idBox: box.idBox,
            apartado: apartadoActual,
            nombre: form.nombre.trim(),
            precioVenta: parseFloat(form.precioVenta) || 0,
            stockActual: parseInt(form.stockActual) || 0,
            stockMinimo: parseInt(form.stockMinimo) || 0,
            fotoUrl: form.fotoUrl.trim() || null,
            categoria: form.categoria || null,
            subCategoria: form.categoria === 'Suplementos' ? form.subCategoria || null : null,
            talla: form.categoria === 'Ropa' ? form.talla || null : null,
            descripcion: form.descripcion.trim() || null,
            esSobrePedido: form.esSobrePedido,
            esBorrador: form.esBorrador
          })
        });
        if (!res.ok) throw new Error('Error al crear producto.');
        alert('Producto creado correctamente.');
      } else {
        const res = await fetch(`${PRODUCTOS_ENDPOINT}/${modoForm}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            idBox: box.idBox,
            apartado: apartadoActual,
            nombre: form.nombre.trim(),
            precioVenta: parseFloat(form.precioVenta) || 0,
            stockActual: parseInt(form.stockActual) || 0,
            stockMinimo: parseInt(form.stockMinimo) || 0,
            fotoUrl: form.fotoUrl.trim() || null,
            categoria: form.categoria || null,
            subCategoria: form.categoria === 'Suplementos' ? form.subCategoria || null : null,
            talla: form.categoria === 'Ropa' ? form.talla || null : null,
            descripcion: form.descripcion.trim() || null,
            esSobrePedido: form.esSobrePedido,
            esBorrador: form.esBorrador
          })
        });
        if (!res.ok) throw new Error('Error al actualizar producto.');
        alert('Producto actualizado correctamente.');
      }
      cerrarForm();
      await cargarProductos();
    } catch (err) {
      alert(err.message || 'Error inesperado.');
    } finally {
      setGuardando(false);
    }
  }

  async function eliminar(p) {
    if (!await window.wpConfirm(`¿Eliminar "${p.nombre}"? Esta acción no se puede deshacer.`)) return;

    const token = localStorage.getItem('token');

    try {
      const res = await fetch(`${PRODUCTOS_ENDPOINT}/${p.idProducto}/${box.idBox}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.mensaje || 'Acceso denegado (Error 401/403).');
      }

      alert('Producto eliminado.');
      await cargarProductos();
    } catch (error) {
      alert(error.message || 'No se pudo eliminar el producto.');
    }
  }

  async function confirmarAgregarStock(p) {
    const cantidad = parseInt(cantidadAStock);
    if (isNaN(cantidad) || cantidad <= 0) { alert('Ingresa una cantidad válida mayor a 0.'); return; }
    setGuardando(true);
    try {
      const res = await fetch(`${PRODUCTOS_ENDPOINT}/${p.idProducto}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idBox: box.idBox,
          nombre: p.nombre,
          precioVenta: p.precioVenta,
          stockActual: p.stockActual + cantidad,
          stockMinimo: p.stockMinimo,
          fotoUrl: p.fotoUrl || null
        })
      });
      if (!res.ok) throw new Error('Error al actualizar stock.');
      alert(`Stock de "${p.nombre}" actualizado (+${cantidad}).`);
      setAgregarStockId(null);
      setCantidadAStock('');
      await cargarProductos();
    } catch (err) {
      alert(err.message || 'Error inesperado.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="gi-page">

      {/* ══════════════════════════════════
          HEADER
      ══════════════════════════════════ */}
      <header className="gi-header">
          <div className="d-flex align-items-center gap-3">
            <BackButton to="/gestion-ventas-productos" />
            <div className="gi-header-icon d-none d-sm-flex">
              <i className="fas fa-boxes"></i>
            </div>
            <h1 className="gi-header-title me-auto">
              Gestión de <span>Inventario</span>
            </h1>
            <button onClick={abrirNuevo} className="gi-nuevo-btn">
              <i className="fas fa-plus"></i>
              <span className="d-none d-sm-inline">Nuevo producto</span>
              <span className="d-sm-none">Nuevo</span>
            </button>
          </div>
      </header>

      <div className="container-xl px-3 px-md-4">

        {/* ══════════════════════════════════
            FORMULARIO NUEVO / EDITAR
        ══════════════════════════════════ */}
        {modoForm !== null && (
          <div className="gi-form-card">
            <p className="gi-form-title">
              <i className={`fas ${modoForm === 'nuevo' ? 'fa-plus-circle' : 'fa-pen'}`}></i>
              {modoForm === 'nuevo' ? 'Nuevo producto' : 'Editar producto'}
            </p>

            <form onSubmit={guardar}>
              <div className="row g-3">

                <div className="col-12">
                  <label className="etiqueta-campo">Nombre *</label>
                  <input
                    className="entrada-oscura"
                    value={form.nombre}
                    onChange={e => setForm({ ...form, nombre: e.target.value })}
                    placeholder="Ej. Proteína Whey"
                    autoFocus
                  />
                </div>

                <div className="col-6 col-md-4">
                  <label className="etiqueta-campo">Precio ($)</label>
                  <input
                    type="number" min="0" step="0.01"
                    className="entrada-oscura"
                    value={form.precioVenta}
                    onChange={e => setForm({ ...form, precioVenta: e.target.value })}
                    placeholder="0.00"
                    style={{ color: 'var(--success)', fontFamily: 'var(--font-stats)', fontWeight: 700 }}
                  />
                </div>

                <div className="col-6 col-md-4">
                  <label className="etiqueta-campo">Stock inicial</label>
                  <input
                    type="number" min="0"
                    className="entrada-oscura"
                    value={form.stockActual}
                    onChange={e => setForm({ ...form, stockActual: e.target.value })}
                    placeholder="0"
                    style={{ fontFamily: 'var(--font-stats)', fontWeight: 700 }}
                    disabled={form.esSobrePedido}
                  />
                </div>

                <div className="col-12 col-md-4">
                  <label className="etiqueta-campo">Stock mínimo</label>
                  <input
                    type="number" min="0"
                    className="entrada-oscura"
                    value={form.stockMinimo}
                    onChange={e => setForm({ ...form, stockMinimo: e.target.value })}
                    placeholder="0"
                    style={{ fontFamily: 'var(--font-stats)', fontWeight: 700 }}
                    disabled={form.esSobrePedido}
                  />
                </div>

                {apartadoActual === 'General (Box)' && (
                  <div className="col-12 mt-3 mb-1">
                    <div className="form-check form-switch custom-switch-danger mb-2">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        role="switch"
                        id="esSobrePedido"
                        checked={form.esSobrePedido}
                        onChange={e => {
                          setForm({ 
                            ...form, 
                            esSobrePedido: e.target.checked,
                            stockActual: e.target.checked ? '0' : form.stockActual,
                            stockMinimo: e.target.checked ? '0' : form.stockMinimo
                          });
                        }}
                      />
                      <label className="form-check-label text-white ms-2 fw-bold" htmlFor="esSobrePedido">
                        <i className="fas fa-clock text-warning me-2"></i>
                        Este producto es "Sobre Pedido" (No requiere stock físico)
                      </label>
                    </div>

                    <div className="form-check form-switch custom-switch-danger">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        role="switch"
                        id="esBorrador"
                        checked={form.esBorrador}
                        onChange={e => setForm({ ...form, esBorrador: e.target.checked })}
                      />
                      <label className="form-check-label text-white ms-2 fw-bold" htmlFor="esBorrador">
                        <i className="fas fa-eye-slash text-secondary me-2"></i>
                        Guardar como Borrador (Oculto en Tienda del Box)
                      </label>
                    </div>
                  </div>
                )}

                {/* Categoría Dinámica */}
                <div className="col-12 col-md-4">
                  <label className="etiqueta-campo">Categoría</label>
                  <select 
                    className="entrada-oscura form-select"
                    value={form.categoria}
                    onChange={e => setForm({ ...form, categoria: e.target.value, subCategoria: '', talla: '' })}
                  >
                    <option value="">(Ninguna)</option>
                    <option value="Suplementos">Suplementos</option>
                    <option value="Ropa">Ropa</option>
                    <option value="Equipo">Equipo</option>
                    <option value="Snacks">Snacks</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>

                {form.categoria === 'Suplementos' && (
                  <div className="col-12 col-md-4">
                    <label className="etiqueta-campo">Tipo de Suplemento</label>
                    <select 
                      className="entrada-oscura form-select"
                      value={form.subCategoria}
                      onChange={e => setForm({ ...form, subCategoria: e.target.value })}
                    >
                      <option value="">Selecciona tipo...</option>
                      <option value="Proteínas">Proteínas</option>
                      <option value="Creatina">Creatina</option>
                      <option value="Aminos">Aminos</option>
                      <option value="Grenetina/colágeno">Grenetina/colágeno</option>
                      <option value="Quemadores">Quemadores</option>
                      <option value="Energizantes/preentreno">Energizantes/preentreno</option>
                    </select>
                  </div>
                )}

                {form.categoria === 'Ropa' && (
                  <div className="col-12 col-md-4">
                    <label className="etiqueta-campo">Talla</label>
                    <select 
                      className="entrada-oscura form-select"
                      value={form.talla}
                      onChange={e => setForm({ ...form, talla: e.target.value })}
                    >
                      <option value="">Selecciona talla...</option>
                      <option value="XS">XS</option>
                      <option value="S">S</option>
                      <option value="M">M</option>
                      <option value="L">L</option>
                      <option value="XL">XL</option>
                      <option value="Unitalla">Unitalla</option>
                    </select>
                  </div>
                )}

                <div className="col-12">
                  <label className="etiqueta-campo">Descripción detallada</label>
                  <textarea
                    className="entrada-oscura"
                    rows="2"
                    value={form.descripcion}
                    onChange={e => setForm({ ...form, descripcion: e.target.value })}
                    placeholder="Sabor, gramaje, notas adicionales..."
                  ></textarea>
                </div>

                <div className="col-12">
                  <label className="etiqueta-campo">Foto del producto</label>
                  <div className="d-flex flex-column flex-sm-row gap-2 align-items-start">
                    <div className="flex-grow-1 w-100">
                      <div className="d-flex align-items-center gap-2 mb-2 flex-wrap">
                        <label className="gi-upload-label">
                          <i className="fas fa-upload"></i>
                          Subir imagen
                          <input
                            type="file"
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={e => {
                              const file = e.target.files[0];
                              if (!file) return;
                              const reader = new FileReader();
                              reader.onload = ev => setForm({ ...form, fotoUrl: ev.target.result });
                              reader.readAsDataURL(file);
                            }}
                          />
                        </label>
                        <span className="gi-form-or">o pega una URL</span>
                      </div>
                      <input
                        type="url"
                        className="entrada-oscura"
                        value={form.fotoUrl.startsWith('data:') ? '' : form.fotoUrl}
                        onChange={e => setForm({ ...form, fotoUrl: e.target.value })}
                        placeholder="https://ejemplo.com/foto.jpg"
                        disabled={form.fotoUrl.startsWith('data:')}
                      />
                      {form.fotoUrl.startsWith('data:') && (
                        <button
                          type="button"
                          className="gi-quitar-foto-btn"
                          onClick={() => setForm({ ...form, fotoUrl: '' })}
                        >
                          <i className="fas fa-times"></i>Quitar imagen
                        </button>
                      )}
                    </div>
                    {form.fotoUrl && (
                      <img
                        src={form.fotoUrl}
                        alt="Preview"
                        className="gi-foto-preview mx-auto mx-sm-0"
                        onError={e => e.target.style.display = 'none'}
                      />
                    )}
                  </div>
                </div>

              </div>

              <div className="d-flex gap-2 mt-3 flex-column flex-sm-row">
                <BotonSeguro type="button" onClick={guardar} className="gi-guardar-btn" textoProcesando="Guardando...">
                  <i className="fas fa-save"></i>Guardar
                </BotonSeguro>
                <button type="button" onClick={cerrarForm} className="gi-cancelar-btn">
                  <i className="fas fa-times"></i>Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ══════════════════════════════════
            BUSCADOR + FILTRO
        ══════════════════════════════════ */}
        <div className="d-flex gap-2 mb-3">
          <div className="gi-search-wrap flex-grow-1" style={{ marginBottom: 0 }}>
            <span className="gi-search-icon">
              <i className="fas fa-search"></i>
            </span>
            <input
              className="gi-search-input"
              placeholder="Buscar producto..."
              value={buscar}
              onChange={e => setBuscar(e.target.value)}
            />
          </div>
          <div className="d-flex gap-2 overflow-auto" style={{ whiteSpace: 'nowrap' }}>
            <button
              className={`btn btn-sm ${vistaActual === 'todos' ? 'btn-danger' : 'btn-outline-secondary'}`}
              onClick={() => setVistaActual('todos')}
            >
              Todos
            </button>
            <button
              className={`btn btn-sm ${vistaActual === 'normal' ? 'btn-secondary text-white fw-bold' : 'btn-outline-secondary'}`}
              onClick={() => setVistaActual('normal')}
            >
              Normales
            </button>
            {apartadoActual === 'General (Box)' && (
              <>
                <button
                  className={`btn btn-sm ${vistaActual === 'sobre_pedido' ? 'btn-warning text-dark fw-bold' : 'btn-outline-warning text-white'}`}
                  onClick={() => setVistaActual('sobre_pedido')}
                >
                  <i className="fas fa-clock me-1"></i> Sobre Pedido
                </button>
                <button
                  className={`btn btn-sm ${vistaActual === 'borrador' ? 'btn-light text-dark fw-bold' : 'btn-outline-light text-white'}`}
                  onClick={() => setVistaActual('borrador')}
                >
                  <i className="fas fa-eye-slash me-1"></i> Borradores
                </button>
              </>
            )}
            
            {(vistaActual === 'todos' || vistaActual === 'normal') && (
              <button
                className={`gi-filtro-stock-btn ${soloStockBajo ? 'gi-filtro-stock-btn--active' : ''} ms-2`}
                onClick={() => setSoloStockBajo(v => !v)}
                title="Filtrar por stock bajo"
              >
                <i className="fas fa-exclamation-triangle"></i>
                <span className="d-none d-sm-inline">Stock bajo</span>
              </button>
            )}
          </div>
        </div>

        {/* ══════════════════════════════════
            GRID DE PRODUCTOS
        ══════════════════════════════════ */}
        {loading ? (
          <div className="gi-loading">
            <div className="spinner-wp"></div>
          </div>
        ) : productos.length === 0 ? (
          <div className="gi-empty">
            <i className="fas fa-box-open"></i>
            <p>{buscar ? 'Sin resultados para tu búsqueda' : 'Aún no tienes productos. ¡Agrega el primero!'}</p>
          </div>
        ) : (
          <>
            <div className="row g-2 g-md-3">
              {productos
                .filter(p => {
                  if (vistaActual === 'normal') return !p.esSobrePedido && !p.esBorrador;
                  if (vistaActual === 'sobre_pedido') return p.esSobrePedido && !p.esBorrador;
                  if (vistaActual === 'borrador') return p.esBorrador;
                  return true;
                })
                .filter(p => (vistaActual !== 'todos' && vistaActual !== 'normal') ? true : (!soloStockBajo || p.stockActual <= p.stockMinimo))
                .map(p => {
                const stockBajo = p.stockActual <= p.stockMinimo;
                return (
                  <div key={p.idProducto} className="col-12 col-sm-6 col-lg-4 col-xl-3">
                    <div className={`gi-card ${stockBajo ? 'gi-card--low-stock' : ''} ${p.esBorrador ? 'opacity-75' : ''}`}>

                      {stockBajo && !p.esBorrador && (
                        <span className="gi-badge-low">
                          <i className="fas fa-exclamation-triangle"></i>Stock bajo
                        </span>
                      )}
                      
                      {p.esBorrador && (
                        <span className="gi-badge-low bg-secondary border-secondary">
                          <i className="fas fa-eye-slash"></i>Borrador
                        </span>
                      )}

                      {/* Imagen o placeholder */}
                      {p.fotoUrl && p.fotoUrl.trim() !== '' ? (
                        <img
                          src={p.fotoUrl}
                          alt={p.nombre}
                          className="gi-card-img"
                          onError={e => { e.target.style.display = 'none'; }}
                        />
                      ) : (
                        <div className="gi-card-no-img">
                          <i className="fas fa-box"></i>
                        </div>
                      )}

                      {/* Franja de precio */}
                      <div className="gi-card-precio-strip">
                        <p className="gi-card-precio">${parseFloat(p.precioVenta).toFixed(2)}</p>
                      </div>

                      <div className="gi-card-body">
                        <p className="gi-card-nombre">{p.nombre}</p>
                        
                        {/* Insignias de categoría */}
                        {(p.categoria || p.talla || p.subCategoria || p.esSobrePedido || p.esBorrador) && (
                          <div className="d-flex flex-wrap gap-1 mb-2 mt-1">
                            {p.esBorrador && <span className="badge bg-secondary text-white"><i className="fas fa-eye-slash me-1"></i>Oculto</span>}
                            {p.esSobrePedido && <span className="badge bg-warning text-dark"><i className="fas fa-clock me-1"></i>Sobre Pedido</span>}
                            {p.categoria && <span className="badge bg-secondary">{p.categoria}</span>}
                            {p.subCategoria && <span className="badge bg-info text-dark">{p.subCategoria}</span>}
                            {p.talla && <span className="badge border border-light text-light">{p.talla}</span>}
                          </div>
                        )}

                        {/* Stock actual / mínimo */}
                        {(!p.esSobrePedido && !p.esBorrador) && (
                          <div className="gi-stock-row">
                            <div className="gi-stock-group">
                              <span className="gi-stock-sublabel">Stock</span>
                              <span className={`gi-stock-val ${stockBajo ? 'gi-stock-val--low' : 'gi-stock-val--ok'}`}>
                                {p.stockActual}
                              </span>
                            </div>
                            <div className="gi-stock-group">
                              <span className="gi-stock-sublabel">Mínimo</span>
                              <span className="gi-stock-val gi-stock-val--min">{p.stockMinimo}</span>
                            </div>
                          </div>
                        )}

                        {/* Acciones */}
                        {agregarStockId === p.idProducto ? (
                          <div className="gi-add-stock-zona">
                            <input
                              type="number" min="1"
                              className="gi-add-stock-input"
                              value={cantidadAStock}
                              onChange={e => setCantidadAStock(e.target.value)}
                              placeholder="0"
                              autoFocus
                              onKeyDown={e => {
                                if (e.key === 'Enter') confirmarAgregarStock(p);
                                if (e.key === 'Escape') { setAgregarStockId(null); setCantidadAStock(''); }
                              }}
                            />
                            <BotonSeguro
                              onClick={() => confirmarAgregarStock(p)}
                              className="gi-add-stock-ok"
                              title="Confirmar"
                              disabled={guardando}
                              textoProcesando=""
                            >
                              <i className="fas fa-check"></i>
                            </BotonSeguro>
                            <button
                              onClick={() => { setAgregarStockId(null); setCantidadAStock(''); }}
                              className="gi-add-stock-cancel"
                              title="Cancelar"
                            >
                              <i className="fas fa-times"></i>
                            </button>
                          </div>
                        ) : (
                          <div className="gi-actions">
                            {(!p.esSobrePedido && !p.esBorrador) && (
                              <button
                                onClick={() => { setAgregarStockId(p.idProducto); setCantidadAStock(''); }}
                                className="gi-action-btn gi-action-btn--stock"
                                title="Agregar stock"
                              >
                                <i className="fas fa-plus"></i>
                              </button>
                            )}
                            <button
                              onClick={() => abrirEditar(p)}
                              className="gi-action-btn gi-action-btn--edit"
                              title="Editar"
                            >
                              <i className="fas fa-pen"></i>
                            </button>
                            <BotonSeguro
                              onClick={() => eliminar(p)}
                              className="gi-action-btn gi-action-btn--delete"
                              title="Eliminar"
                              textoProcesando=""
                            >
                              <i className="fas fa-trash"></i>
                            </BotonSeguro>
                          </div>
                        )}

                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="gi-count-hint">
              {soloStockBajo
                ? `${productos.filter(p => p.stockActual <= p.stockMinimo).length} producto(s) con stock bajo`
                : `${productos.length} producto(s) encontrado(s)`
              }
            </p>
          </>
        )}

      </div>
    </div>
  );
}
