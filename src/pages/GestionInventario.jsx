import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PRODUCTOS_ENDPOINT } from '../services/api';
import BackButton from '../components/BackButton';
import BotonSeguro from '../components/BotonSeguro';
import AtletifyLoader from '../components/AtletifyLoader';
import '../assets/css/GestionInventario.css';

const FORM_VACIO = { nombre: '', costo: '', precioVenta: '', stockActual: '', stockMinimo: '', fotoUrl: '', categoria: '', subCategoria: '', talla: '', descripcion: '', esSobrePedido: false, esBorrador: false, permitePersonalizacion: false, costoPersonalizacion: '', tallasDisponibles: [] };

const TALLAS_OPCIONES = ['XS', 'S', 'M', 'L', 'XL', 'Unitalla'];

// El backend guarda la fecha en UTC en una columna 'timestamp without time zone',
// así que el JSON llega SIN marca de zona. La tratamos como UTC para convertirla
// a la hora local del navegador (si ya trae zona, se respeta).
function fechaLocal(s) {
  if (!s) return '';
  const tieneZona = /[zZ]$|[+-]\d{2}:?\d{2}$/.test(s);
  const d = new Date(tieneZona ? s : s + 'Z');
  return isNaN(d) ? s : d.toLocaleString();
}

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
  const [soloStockBajo, setSoloStockBajo] = useState(false);
  const [vistaActual, setVistaActual] = useState('normal');

  // Modal de movimiento de stock (reponer / ajustar)
  const [modalStock, setModalStock] = useState(null);    // producto seleccionado
  const [modalModo, setModalModo] = useState('reponer');  // 'reponer' | 'ajustar'
  const [stockCantidad, setStockCantidad] = useState('');
  const [stockNuevo, setStockNuevo] = useState('');
  const [stockMotivo, setStockMotivo] = useState('');
  const [guardandoStock, setGuardandoStock] = useState(false);

  // Historial de movimientos de stock
  const [movData, setMovData] = useState(null);           // { items, total, totalPaginas, pagina }
  const [loadingMov, setLoadingMov] = useState(false);
  const [movTipo, setMovTipo] = useState('');
  const [movProductoFiltro, setMovProductoFiltro] = useState('');
  const [movPagina, setMovPagina] = useState(1);

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

      const token = localStorage.getItem('token');
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
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
      costo: p.costo || 0,
      precioVenta: p.precioVenta,
      stockActual: p.stockActual,
      stockMinimo: p.stockMinimo,
      fotoUrl: p.fotoUrl || '',
      categoria: p.categoria || '',
      subCategoria: p.subCategoria || '',
      talla: p.talla || '',
      descripcion: p.descripcion || '',
      esSobrePedido: p.esSobrePedido || false,
      esBorrador: p.esBorrador || false,
      permitePersonalizacion: p.permitePersonalizacion || false,
      costoPersonalizacion: p.costoPersonalizacion || '',
      tallasDisponibles: p.tallasDisponibles ? p.tallasDisponibles.split(',').map(s => s.trim()).filter(Boolean) : []
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
      const token = localStorage.getItem('token');
      if (modoForm === 'nuevo') {
        const res = await fetch(PRODUCTOS_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            idBox: box.idBox,
            apartado: apartadoActual,
            nombre: form.nombre.trim(),
            costo: parseFloat(form.costo) || 0,
            precioVenta: parseFloat(form.precioVenta) || 0,
            stockActual: parseInt(form.stockActual) || 0,
            stockMinimo: parseInt(form.stockMinimo) || 0,
            fotoUrl: form.fotoUrl.trim() || null,
            categoria: form.categoria || null,
            subCategoria: form.categoria === 'Suplementos' ? form.subCategoria || null : null,
            talla: form.categoria === 'Ropa' ? form.talla || null : null,
            descripcion: form.descripcion.trim() || null,
            esSobrePedido: form.esSobrePedido,
            esBorrador: form.esBorrador,
            permitePersonalizacion: form.esSobrePedido && form.permitePersonalizacion,
            costoPersonalizacion: parseFloat(form.costoPersonalizacion) || 0,
            tallasDisponibles: (form.esSobrePedido && form.categoria === 'Ropa' && form.tallasDisponibles.length) ? form.tallasDisponibles.join(',') : null
          })
        });
        if (!res.ok) throw new Error('Error al crear producto.');
        alert('Producto creado correctamente.');
      } else {
        const res = await fetch(`${PRODUCTOS_ENDPOINT}/${modoForm}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            idBox: box.idBox,
            apartado: apartadoActual,
            nombre: form.nombre.trim(),
            costo: parseFloat(form.costo) || 0,
            precioVenta: parseFloat(form.precioVenta) || 0,
            stockActual: parseInt(form.stockActual) || 0,
            stockMinimo: parseInt(form.stockMinimo) || 0,
            fotoUrl: form.fotoUrl.trim() || null,
            categoria: form.categoria || null,
            subCategoria: form.categoria === 'Suplementos' ? form.subCategoria || null : null,
            talla: form.categoria === 'Ropa' ? form.talla || null : null,
            descripcion: form.descripcion.trim() || null,
            esSobrePedido: form.esSobrePedido,
            esBorrador: form.esBorrador,
            permitePersonalizacion: form.esSobrePedido && form.permitePersonalizacion,
            costoPersonalizacion: parseFloat(form.costoPersonalizacion) || 0,
            tallasDisponibles: (form.esSobrePedido && form.categoria === 'Ropa' && form.tallasDisponibles.length) ? form.tallasDisponibles.join(',') : null
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

  function abrirModalStock(p) {
    setModalStock(p);
    setModalModo('reponer');
    setStockCantidad('');
    setStockNuevo(String(p.stockActual));
    setStockMotivo('');
  }

  function cerrarModalStock() {
    setModalStock(null);
    setStockCantidad('');
    setStockNuevo('');
    setStockMotivo('');
  }

  async function guardarMovimientoStock() {
    if (!modalStock) return;
    const token = localStorage.getItem('token');
    setGuardandoStock(true);
    try {
      let res;
      if (modalModo === 'reponer') {
        const cant = parseInt(stockCantidad);
        if (isNaN(cant) || cant <= 0) { alert('Ingresa una cantidad válida mayor a 0.'); setGuardandoStock(false); return; }
        res = await fetch(`${PRODUCTOS_ENDPOINT}/${modalStock.idProducto}/reponer`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ idBox: box.idBox, cantidad: cant, motivo: stockMotivo.trim() || null })
        });
      } else {
        const nuevo = parseInt(stockNuevo);
        if (isNaN(nuevo) || nuevo < 0) { alert('Ingresa un stock válido (0 o mayor).'); setGuardandoStock(false); return; }
        if (!stockMotivo.trim()) { alert('El motivo es obligatorio al ajustar el stock.'); setGuardandoStock(false); return; }
        res = await fetch(`${PRODUCTOS_ENDPOINT}/${modalStock.idProducto}/ajustar`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ idBox: box.idBox, nuevoStock: nuevo, motivo: stockMotivo.trim() })
        });
      }
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.mensaje || 'Error al guardar el movimiento.'); }
      cerrarModalStock();
      await cargarProductos();
      if (vistaActual === 'historial') await cargarMovimientos();
    } catch (err) {
      alert(err.message || 'Error inesperado.');
    } finally {
      setGuardandoStock(false);
    }
  }

  const cargarMovimientos = useCallback(async () => {
    if (!box) return;
    setLoadingMov(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({ apartado: apartadoActual, pagina: String(movPagina), pageSize: '10' });
      if (movTipo) params.append('tipo', movTipo);
      if (movProductoFiltro) params.append('idProducto', String(movProductoFiltro));
      const res = await fetch(`${PRODUCTOS_ENDPOINT}/movimientos/${box.idBox}?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setMovData(await res.json());
    } catch (e) { void e; } finally { setLoadingMov(false); }
  }, [box, movPagina, movTipo, movProductoFiltro, apartadoActual]);

  useEffect(() => { if (vistaActual === 'historial') cargarMovimientos(); }, [vistaActual, cargarMovimientos]);
  useEffect(() => { setMovPagina(1); }, [movTipo, movProductoFiltro]);

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
                  <label className="etiqueta-campo">Costo de Compra ($)</label>
                  <input
                    type="number" min="0" step="0.01"
                    className="entrada-oscura"
                    value={form.costo}
                    onChange={e => {
                      if (e.target.value.length <= 5) setForm({ ...form, costo: e.target.value });
                    }}
                    placeholder="0.00"
                    style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-stats)' }}
                  />
                </div>

                <div className="col-6 col-md-4">
                  <label className="etiqueta-campo">Precio Venta ($)</label>
                  <div className="d-flex align-items-center gap-2">
                    <input
                      type="number" min="0" step="0.01"
                      className="entrada-oscura"
                      value={form.precioVenta}
                      onChange={e => {
                        if (e.target.value.length <= 5) setForm({ ...form, precioVenta: e.target.value });
                      }}
                      placeholder="0.00"
                      style={{ color: 'var(--success)', fontFamily: 'var(--font-stats)', fontWeight: 700 }}
                    />
                    {form.costo > 0 && form.precioVenta > 0 && (
                      <span className="badge bg-success" style={{ fontSize: '0.75rem' }}>
                        {(((form.precioVenta - form.costo) / form.costo) * 100).toFixed(0)}% <i className="fas fa-arrow-up"></i>
                      </span>
                    )}
                  </div>
                </div>

                {modoForm === 'nuevo' ? (
                  <div className="col-6 col-md-4">
                    <label className="etiqueta-campo">Stock inicial</label>
                    <input
                      type="number" min="0"
                      className="entrada-oscura"
                      value={form.stockActual}
                      onChange={e => {
                        if (e.target.value.length <= 5) setForm({ ...form, stockActual: e.target.value });
                      }}
                      placeholder="0"
                      style={{ fontFamily: 'var(--font-stats)', fontWeight: 700 }}
                      disabled={form.esSobrePedido}
                    />
                  </div>
                ) : (
                  <div className="col-6 col-md-4">
                    <label className="etiqueta-campo">Stock actual</label>
                    <div className="gi-stock-readonly">
                      <span>{form.stockActual}</span>
                      <small>Usa Reponer / Ajustar</small>
                    </div>
                  </div>
                )}

                <div className="col-12 col-md-4">
                  <label className="etiqueta-campo">Stock mínimo</label>
                  <input
                    type="number" min="0"
                    className="entrada-oscura"
                    value={form.stockMinimo}
                    onChange={e => {
                      if (e.target.value.length <= 5) setForm({ ...form, stockMinimo: e.target.value });
                    }}
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

                    {form.esSobrePedido && (
                      <>
                        <div className="form-check form-switch custom-switch-danger mt-3">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            role="switch"
                            id="permitePersonalizacion"
                            checked={form.permitePersonalizacion}
                            onChange={e => setForm({ ...form, permitePersonalizacion: e.target.checked })}
                          />
                          <label className="form-check-label text-white ms-2 fw-bold" htmlFor="permitePersonalizacion">
                            <i className="fas fa-pen-nib text-info me-2"></i>
                            Permite personalización (el atleta puede ponerle un nombre, con costo extra)
                          </label>
                        </div>
                        {form.permitePersonalizacion && (
                          <div className="mt-2" style={{ maxWidth: '240px' }}>
                            <label className="etiqueta-campo">Costo de personalización ($)</label>
                            <input
                              type="number" min="0" step="0.01"
                              className="entrada-oscura"
                              value={form.costoPersonalizacion}
                              onChange={e => { if (e.target.value.length <= 6) setForm({ ...form, costoPersonalizacion: e.target.value }); }}
                              placeholder="0.00"
                              style={{ fontFamily: 'var(--font-stats)', fontWeight: 700 }}
                            />
                          </div>
                        )}
                      </>
                    )}
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
                  form.esSobrePedido ? (
                    <div className="col-12">
                      <label className="etiqueta-campo">
                        Tallas disponibles <span style={{ fontWeight: 400, textTransform: 'none', color: 'var(--text-muted)' }}>(el atleta elige una al pedir)</span>
                      </label>
                      <div className="gi-tallas-multi">
                        {TALLAS_OPCIONES.map(t => {
                          const activa = form.tallasDisponibles.includes(t);
                          return (
                            <button
                              type="button"
                              key={t}
                              className={`gi-talla-chip ${activa ? 'activa' : ''}`}
                              onClick={() => setForm(f => ({
                                ...f,
                                tallasDisponibles: activa ? f.tallasDisponibles.filter(x => x !== t) : [...f.tallasDisponibles, t]
                              }))}
                            >{t}</button>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="col-12 col-md-4">
                      <label className="etiqueta-campo">Talla</label>
                      <select
                        className="entrada-oscura form-select"
                        value={form.talla}
                        onChange={e => setForm({ ...form, talla: e.target.value })}
                      >
                        <option value="">Selecciona talla...</option>
                        {TALLAS_OPCIONES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                  )
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
            BUSCADOR + FILTROS
        ══════════════════════════════════ */}
        <div className="gi-toolbar">
          <div className="gi-search-wrap">
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

          <div className="gi-chips-row">
            <button
              className={`gi-chip ${vistaActual === 'normal' ? 'gi-chip--normal' : ''}`}
              onClick={() => { setVistaActual('normal'); setSoloStockBajo(false); }}
            >
              <i className="fas fa-box"></i> Normales
            </button>

            {apartadoActual === 'General (Box)' && (
              <>
                <button
                  className={`gi-chip ${vistaActual === 'sobre_pedido' ? 'gi-chip--pedido' : ''}`}
                  onClick={() => { setVistaActual('sobre_pedido'); setSoloStockBajo(false); }}
                >
                  <i className="fas fa-clock"></i> Sobre Pedido
                </button>
                <button
                  className={`gi-chip ${vistaActual === 'borrador' ? 'gi-chip--borrador' : ''}`}
                  onClick={() => { setVistaActual('borrador'); setSoloStockBajo(false); }}
                >
                  <i className="fas fa-eye-slash"></i> Borradores
                </button>
              </>
            )}

            {vistaActual === 'normal' && (
              <button
                className={`gi-chip gi-chip--divider ${soloStockBajo ? 'gi-chip--stock' : ''}`}
                onClick={() => setSoloStockBajo(v => !v)}
              >
                <i className="fas fa-exclamation-triangle"></i> Stock bajo
              </button>
            )}

            <button
              className={`gi-chip gi-chip--divider ${vistaActual === 'historial' ? 'gi-chip--historial' : ''}`}
              onClick={() => { setVistaActual('historial'); setSoloStockBajo(false); }}
            >
              <i className="fas fa-clock-rotate-left"></i> Historial
            </button>
          </div>
        </div>

        {/* ══════════════════════════════════
            GRID DE PRODUCTOS
        ══════════════════════════════════ */}
        {vistaActual === 'historial' ? (
          <div className="gi-hist">
            <div className="gi-hist-filtros">
              <div className="gi-hist-tipos">
                {[['', 'Todos'], ['Ingreso', 'Ingresos'], ['Ajuste', 'Ajustes']].map(([v, l]) => (
                  <button
                    key={v || 'todos'}
                    className={`gi-chip ${movTipo === v ? 'gi-chip--normal' : ''}`}
                    onClick={() => setMovTipo(v)}
                  >{l}</button>
                ))}
              </div>
              <select
                className="entrada-oscura form-select gi-hist-prod-filtro"
                value={movProductoFiltro}
                onChange={e => setMovProductoFiltro(e.target.value)}
              >
                <option value="">Todos los productos</option>
                {productos.map(p => <option key={p.idProducto} value={p.idProducto}>{p.nombre}</option>)}
              </select>
            </div>

            {loadingMov ? (
              <div className="gi-loading"><AtletifyLoader /></div>
            ) : !movData || movData.items.length === 0 ? (
              <div className="gi-empty">
                <i className="fas fa-clock-rotate-left"></i>
                <p>Sin movimientos de stock registrados todavía.</p>
              </div>
            ) : (
              <>
                {/* Móvil: tarjetas */}
                <div className="d-md-none">
                  {movData.items.map(m => (
                    <div key={m.idMovimiento} className="gi-hist-card">
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <span className={`gi-hist-badge ${m.tipo === 'Ingreso' ? 'gi-hist-badge--ingreso' : 'gi-hist-badge--ajuste'}`}>{m.tipo}</span>
                        <span className="gi-hist-fecha">{fechaLocal(m.fecha)}</span>
                      </div>
                      <div className="gi-hist-prod-nombre">{m.nombreProducto || '(producto eliminado)'}</div>
                      <div className="gi-hist-cambio">
                        <span className={m.cantidad >= 0 ? 'text-success fw-bold' : 'text-danger fw-bold'}>
                          {m.cantidad >= 0 ? `+${m.cantidad}` : m.cantidad}
                        </span>
                        <span className="gi-hist-flecha">{m.stockAntes} &rarr; {m.stockDespues}</span>
                      </div>
                      {m.motivo && <div className="gi-hist-motivo">&ldquo;{m.motivo}&rdquo;</div>}
                      <div className="gi-hist-quien"><i className="fas fa-user me-1"></i>{m.nombreUsuario || '—'}</div>
                    </div>
                  ))}
                </div>

                {/* Escritorio: tabla */}
                <div className="gi-hist-table-wrap d-none d-md-block">
                  <table className="gi-hist-table">
                    <thead>
                      <tr><th>Fecha</th><th>Producto</th><th>Tipo</th><th>Cambio</th><th>Stock</th><th>Motivo</th><th>Quién</th></tr>
                    </thead>
                    <tbody>
                      {movData.items.map(m => (
                        <tr key={m.idMovimiento}>
                          <td className="gi-hist-fecha">{fechaLocal(m.fecha)}</td>
                          <td>{m.nombreProducto || '(eliminado)'}</td>
                          <td><span className={`gi-hist-badge ${m.tipo === 'Ingreso' ? 'gi-hist-badge--ingreso' : 'gi-hist-badge--ajuste'}`}>{m.tipo}</span></td>
                          <td className={m.cantidad >= 0 ? 'text-success fw-bold' : 'text-danger fw-bold'}>{m.cantidad >= 0 ? `+${m.cantidad}` : m.cantidad}</td>
                          <td><span className="gi-hist-stock">{m.stockAntes}<span className="gi-hist-arrow">&rarr;</span>{m.stockDespues}</span></td>
                          <td>{m.motivo || '—'}</td>
                          <td>{m.nombreUsuario || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Paginación (10 por página) */}
                {movData.totalPaginas > 1 && (
                  <div className="gi-hist-pag">
                    <button className="gi-hist-pag-btn" disabled={movData.pagina <= 1} onClick={() => setMovPagina(p => Math.max(1, p - 1))}><i className="fas fa-chevron-left"></i></button>
                    <span className="gi-hist-pag-info">{movData.pagina} / {movData.totalPaginas}</span>
                    <button className="gi-hist-pag-btn" disabled={movData.pagina >= movData.totalPaginas} onClick={() => setMovPagina(p => p + 1)}><i className="fas fa-chevron-right"></i></button>
                  </div>
                )}
                <p className="gi-count-hint">{movData.total} movimiento(s)</p>
              </>
            )}
          </div>
        ) : loading ? (
          <div className="gi-loading">
            <AtletifyLoader />
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
                  if (vistaActual === 'sobre_pedido') return p.esSobrePedido && !p.esBorrador;
                  if (vistaActual === 'borrador') return p.esBorrador;
                  return !p.esSobrePedido && !p.esBorrador;
                })
                .filter(p => vistaActual !== 'normal' ? true : (!soloStockBajo || p.stockActual <= p.stockMinimo))
                .map(p => {
                const stockBajo = p.stockActual <= p.stockMinimo;
                return (
                  <div key={p.idProducto} className="col-12 col-sm-6 col-lg-4 col-xl-3">
                    <div className={`gi-card ${stockBajo ? 'gi-card--low-stock' : ''} ${p.esBorrador ? 'opacity-75' : ''}`}>

                      {stockBajo && !p.esBorrador && p.stockActual > 0 && (
                        <span className="gi-badge-low text-warning">
                          <i className="fas fa-exclamation-triangle"></i>Stock bajo
                        </span>
                      )}

                      {p.stockActual <= 0 && !p.esSobrePedido && !p.esBorrador && (
                        <span className="gi-badge-low bg-danger text-white border-danger" style={{ zIndex: 10 }}>
                          <i className="fas fa-times-circle"></i>Agotado
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

                      {/* Franja de precio y costo */}
                      <div className="gi-card-precio-strip d-flex flex-column align-items-end">
                        <p className="gi-card-precio mb-0">${parseFloat(p.precioVenta).toFixed(2)}</p>
                        {p.costo > 0 && (
                          <small className="text-white-50" style={{ fontSize: '0.7rem' }}>Costo: ${parseFloat(p.costo).toFixed(2)}</small>
                        )}
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
                        <div className="gi-actions">
                          {(!p.esSobrePedido && !p.esBorrador) && (
                            <button
                              onClick={() => abrirModalStock(p)}
                              className={`gi-action-btn ${p.stockActual <= 0 ? 'btn btn-danger text-white w-100 rounded-pill' : 'gi-action-btn--stock'}`}
                              style={p.stockActual <= 0 ? { padding: '5px 15px', fontWeight: 'bold' } : {}}
                              title={p.stockActual <= 0 ? "Reabastecer (agregar stock)" : "Mover stock (reponer / ajustar)"}
                            >
                              <i className="fas fa-plus-circle"></i>
                              <span className="ms-1" style={{ fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.5px' }}>
                                {p.stockActual <= 0 ? 'REABASTECER' : 'STOCK'}
                              </span>
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

                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="gi-count-hint">
              {soloStockBajo
                ? `${productos.filter(p => !p.esSobrePedido && !p.esBorrador && p.stockActual <= p.stockMinimo).length} producto(s) con stock bajo`
                : `${productos.filter(p => {
                    if (vistaActual === 'sobre_pedido') return p.esSobrePedido && !p.esBorrador;
                    if (vistaActual === 'borrador') return p.esBorrador;
                    return !p.esSobrePedido && !p.esBorrador;
                  }).length} producto(s)`
              }
            </p>
          </>
        )}

      </div>

      {/* ══════════════════════════════════
          MODAL: MOVIMIENTO DE STOCK (reponer / ajustar)
      ══════════════════════════════════ */}
      {modalStock && (
        <div className="gi-modal-overlay" onClick={cerrarModalStock}>
          <div className="gi-modal" onClick={e => e.stopPropagation()}>
            <div className="gi-modal-header">
              <span><i className="fas fa-boxes me-2"></i>Stock &mdash; {modalStock.nombre}</span>
              <button className="gi-modal-close" onClick={cerrarModalStock} title="Cerrar"><i className="fas fa-times"></i></button>
            </div>
            <div className="gi-modal-body">
              <div className="gi-modal-actual">Stock actual: <strong>{modalStock.stockActual}</strong></div>

              <div className="gi-modal-modos">
                <button type="button" className={`gi-modal-modo ${modalModo === 'reponer' ? 'activo' : ''}`} onClick={() => setModalModo('reponer')}>
                  <i className="fas fa-plus-circle"></i> Reponer
                </button>
                <button type="button" className={`gi-modal-modo ${modalModo === 'ajustar' ? 'activo' : ''}`} onClick={() => setModalModo('ajustar')}>
                  <i className="fas fa-sliders-h"></i> Ajustar
                </button>
              </div>

              {modalModo === 'reponer' ? (
                <>
                  <label className="etiqueta-campo">Cantidad a agregar *</label>
                  <input type="number" min="1" className="entrada-oscura" value={stockCantidad}
                    onChange={e => setStockCantidad(e.target.value)} placeholder="0" autoFocus
                    style={{ fontFamily: 'var(--font-stats)', fontWeight: 700 }} />
                  <label className="etiqueta-campo mt-2">Motivo (opcional)</label>
                  <input className="entrada-oscura" value={stockMotivo}
                    onChange={e => setStockMotivo(e.target.value)} placeholder="Ej. Compra a proveedor" />
                  {parseInt(stockCantidad) > 0 && (
                    <div className="gi-modal-preview">El stock quedar&aacute; en <strong>{modalStock.stockActual + parseInt(stockCantidad)}</strong></div>
                  )}
                </>
              ) : (
                <>
                  <label className="etiqueta-campo">Stock real (valor corregido) *</label>
                  <input type="number" min="0" className="entrada-oscura" value={stockNuevo}
                    onChange={e => setStockNuevo(e.target.value)} placeholder="0" autoFocus
                    style={{ fontFamily: 'var(--font-stats)', fontWeight: 700 }} />
                  <label className="etiqueta-campo mt-2">Motivo <span className="text-danger">*</span></label>
                  <input className="entrada-oscura" value={stockMotivo}
                    onChange={e => setStockMotivo(e.target.value)} placeholder="Ej. Conteo f&iacute;sico, merma, error de captura" />
                  {stockNuevo !== '' && !isNaN(parseInt(stockNuevo)) && (
                    <div className="gi-modal-preview">
                      Cambio: {(() => {
                        const d = parseInt(stockNuevo) - modalStock.stockActual;
                        if (d === 0) return <strong>sin cambio</strong>;
                        return <strong className={d > 0 ? 'text-success' : 'text-danger'}>{d > 0 ? `+${d}` : d}</strong>;
                      })()}
                    </div>
                  )}
                  <div className="gi-modal-aviso"><i className="fas fa-info-circle me-1"></i>El ajuste exige un motivo y queda registrado en el historial.</div>
                </>
              )}
            </div>
            <div className="gi-modal-footer">
              <BotonSeguro onClick={guardarMovimientoStock} className="gi-guardar-btn" textoProcesando="Guardando..." disabled={guardandoStock}>
                <i className="fas fa-save"></i>Guardar
              </BotonSeguro>
              <button type="button" className="gi-cancelar-btn" onClick={cerrarModalStock}>
                <i className="fas fa-times"></i>Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
