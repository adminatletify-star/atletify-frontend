import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { VENTAS_ENDPOINT } from '../services/api';
import BackButton from '../components/BackButton';
import RedGrayDatePicker from '../components/RedGrayDatePicker';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import '../assets/css/HistorialVentas.css';

export default function HistorialVentas() {
  const navigate = useNavigate();
  const [box, setBox] = useState(null);
  const [ventas, setVentas] = useState([]);
  const [buscar, setBuscar] = useState('');
  const [loading, setLoading] = useState(true);
  const [expandido, setExpandido] = useState(null);
  const [periodo, setPeriodo] = useState('mes');
  const [fechaFiltro, setFechaFiltro] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('todas');
  const [tabPrincipal, setTabPrincipal] = useState('pedidos'); // 'recepcion' | 'pedidos'
  const [verConsolidado, setVerConsolidado] = useState(false);

  const apartadoActual = localStorage.getItem('apartadoVentas') || 'General (Box)';

  const actualizarEstatus = async (idVenta, nuevoEstatus) => {
    try {
      const res = await fetch(`${VENTAS_ENDPOINT}/${idVenta}/estatus`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estatus: nuevoEstatus })
      });
      if (res.ok) {
        alert(`Pedido marcado como ${nuevoEstatus}.`);
        cargarVentas();
      } else {
        const data = await res.json();
        alert(data.mensaje || "Error al actualizar estatus");
      }
    } catch (e) {
      alert("Error de red");
    }
  };

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
  }, [box, buscar]);

  useEffect(() => { cargarVentas(); }, [cargarVentas]);

  function formatFecha(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  const totalGeneral = ventas.reduce((acc, v) => acc + v.totalVenta, 0);

  const ahora = new Date();
  const ingresosDelPeriodo = ventas.filter(v => {
    const fecha = new Date(v.fechaVenta);
    if (periodo === 'custom' && fechaFiltro) {
      return fecha.toISOString().slice(0, 10) === fechaFiltro;
    }
    if (periodo === 'dia') return fecha.toDateString() === ahora.toDateString();
    if (periodo === 'mes') return fecha.getMonth() === ahora.getMonth() && fecha.getFullYear() === ahora.getFullYear();
    return fecha.getFullYear() === ahora.getFullYear();
  }).reduce((acc, v) => acc + v.totalVenta, 0);

  function handlePeriodo(val) {
    setPeriodo(val);
    if (val !== 'custom') setFechaFiltro('');
  }

  function handleFechaCalendario(isoDate) {
    setFechaFiltro(isoDate);
    setPeriodo('custom');
  }

  // 1. Filtro por Pestaña Principal (Recepción vs Pedidos)
  let ventasFiltradas = ventas.filter(v => {
    if (tabPrincipal === 'recepcion') return v.usuarioNombre === 'Mostrador';
    return v.usuarioNombre !== 'Mostrador';
  });

  // 2. Filtro por Estatus (Tipo)
  if (filtroTipo === 'pendientes') {
    ventasFiltradas = ventasFiltradas.filter(v => v.estatus === 'Pendiente');
  } else if (filtroTipo === 'por-entregar') {
    ventasFiltradas = ventasFiltradas.filter(v => v.estatus === 'Pagado (Pendiente Entrega)');
  } else if (filtroTipo === 'listos') {
    ventasFiltradas = ventasFiltradas.filter(v => v.estatus === 'Listo para Recoger' || v.estatus === 'Pagado y Listo');
  } else if (filtroTipo === 'fiados') {
    ventasFiltradas = ventasFiltradas.filter(v => v.estatus && v.estatus.includes('Fiado'));
  } else if (filtroTipo === 'pagadas') {
    ventasFiltradas = ventasFiltradas.filter(v => v.estatus === 'Completada' || (tabPrincipal === 'recepcion' && v.usuarioNombre === 'Mostrador' && v.estatus !== 'Cancelada'));
  }

  // 3. Filtro por Fecha (si aplica)
  if (periodo === 'custom' && fechaFiltro) {
    ventasFiltradas = ventasFiltradas.filter(v => new Date(v.fechaVenta).toISOString().slice(0, 10) === fechaFiltro);
  }

  // 4. Lógica de Consolidado (Agrupar productos para pedido al proveedor)
  const consolidado = ventasFiltradas.reduce((acc, v) => {
    v.detalles?.forEach(d => {
      const idProd = d.idProducto;
      if (!acc[idProd]) {
        acc[idProd] = {
          nombre: d.producto?.nombre || `Producto #${idProd}`,
          foto: d.producto?.fotoUrl,
          talla: d.producto?.talla,
          categoria: d.producto?.categoria,
          cantidadTotal: 0,
          atletas: []
        };
      }
      acc[idProd].cantidadTotal += d.cantidad;
      acc[idProd].atletas.push({
        nombre: v.usuarioNombre,
        cantidad: d.cantidad,
        fecha: v.fechaVenta
      });
    });
    return acc;
  }, {});

  const listaConsolidada = Object.values(consolidado).sort((a, b) => b.cantidadTotal - a.cantidadTotal);

  const ventasPorDia = ventasFiltradas.reduce((acc, v) => {
    const fecha = new Date(v.fechaVenta);
    const clave = fecha.toISOString().slice(0, 10);
    const label = fecha.toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    if (!acc[clave]) acc[clave] = { label, ventas: [] };
    acc[clave].ventas.push(v);
    return acc;
  }, {});

  const generarPDF = () => {
    try {
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text("Reporte de Ingresos - Atletify System", 14, 15);
      
      doc.setFontSize(10);
      doc.text(`Fecha de generación: ${new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`, 14, 22);
      
      let subtituloPeriodo = periodo === 'dia' ? 'Filtro: Hoy' : periodo === 'mes' ? 'Filtro: Mes' : periodo === 'anio' ? 'Filtro: Año' : 'Filtro: Personalizado';
      if (periodo === 'custom' && fechaFiltro) {
          subtituloPeriodo = `Filtro: Día específico (${fechaFiltro})`;
      }
      doc.text(subtituloPeriodo, 14, 28);
      
      const tableData = ventasFiltradas.map(v => [
        v.idVenta,
        new Date(v.fechaVenta).toLocaleDateString(),
        v.usuarioNombre || 'Mostrador',
        v.detalles?.length || 0,
        v.metodoPago || 'N/A',
        `$${Number(v.totalVenta || 0).toFixed(2)}`
      ]);

      autoTable(doc, {
        startY: 35,
        head: [['Ticket', 'Fecha', 'Cliente', 'Artículos', 'Método de Pago', 'Total']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [220, 53, 69] } // Rojo corporativo
      });

      const finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 15 : 100;
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      const totalMostrado = periodo === 'custom' && !fechaFiltro ? totalGeneral : ingresosDelPeriodo;
      doc.text(`Total Ingresos: $${totalMostrado.toFixed(2)}`, 14, finalY);

      doc.save(`Reporte_Ventas_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (error) {
      console.error("Error al generar PDF:", error);
      alert("Hubo un error al generar el documento. Verifica tu consola.");
    }
  };

  const generarPDFConsolidado = () => {
    try {
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text("Consolidado de Pedidos (Sobre Pedido) - Atletify", 14, 15);
      
      doc.setFontSize(10);
      doc.text(`Fecha de generación: ${new Date().toLocaleDateString('es-MX', { hour: '2-digit', minute: '2-digit' })}`, 14, 22);
      doc.text(`Filtro aplicado: ${filtroTipo.toUpperCase()}`, 14, 28);
      
      const tableData = listaConsolidada.map(p => [
        p.nombre,
        p.talla || 'N/A',
        p.cantidadTotal,
        p.atletas.length
      ]);

      autoTable(doc, {
        startY: 35,
        head: [['Producto', 'Talla', 'Cantidad Total', 'Atletas']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [0, 123, 255] } // Azul para pedidos
      });

      doc.save(`Consolidado_Pedidos_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (error) {
      console.error("Error al generar PDF:", error);
      alert("Error al generar el consolidado.");
    }
  };

  return (
    <div className="hv-page">

      {/* ══════════════════════════════════
          HEADER
      ══════════════════════════════════ */}
      <header className="hv-header d-print-none">
          <div className="d-flex align-items-center gap-3">
            <BackButton to="/gestion-ventas-productos" />
            <div className="hv-header-icon d-none d-sm-flex">
              <i className="fas fa-receipt"></i>
            </div>
            <h1 className="hv-header-title">
              Historial de <span>Ventas</span>
            </h1>
          </div>
      </header>

      <div className="container-xl px-3 px-md-4">

        {/* ══════════════════════════════════
            STATS
        ══════════════════════════════════ */}
        {/* ══════════════════════════════════
            TABS PRINCIPALES
        ══════════════════════════════════ */}
        <div className="d-flex mb-4 border-bottom border-secondary overflow-auto d-print-none">
          <button 
            className={`btn px-4 py-2 rounded-top ${tabPrincipal === 'pedidos' ? 'btn-danger' : 'btn-dark text-muted border-bottom-0'}`}
            style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0, marginRight: '4px', whiteSpace: 'nowrap' }}
            onClick={() => { setTabPrincipal('pedidos'); setFiltroTipo('todas'); setVerConsolidado(false); }}
          >
            <i className="fas fa-truck-loading me-2"></i>Gestión de Pedidos
          </button>
          <button 
            className={`btn px-4 py-2 rounded-top ${tabPrincipal === 'recepcion' ? 'btn-danger' : 'btn-dark text-muted border-bottom-0'}`}
            style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0, marginRight: '4px', whiteSpace: 'nowrap' }}
            onClick={() => { setTabPrincipal('recepcion'); setFiltroTipo('pagadas'); setVerConsolidado(false); }}
          >
            <i className="fas fa-cash-register me-2"></i>Ventas Recepción
          </button>
        </div>

        {/* ══════════════════════════════════
            STATS
        ══════════════════════════════════ */}
        {!loading && (
          <div className="row g-3 mb-4">
            <div className="col-6 col-sm-4">
              <div className="hv-stat-card text-center">
                <p className="hv-stat-label">{tabPrincipal === 'recepcion' ? 'Tickets' : 'Pedidos'}</p>
                <p className="hv-stat-value hv-stat-value--cyan">{ventasFiltradas.length}</p>
              </div>
            </div>
            <div className="col-6 col-sm-8">
              <div className="hv-stat-card">
                <div className="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-1">
                  <p className="hv-stat-label mb-0">Ingresos {tabPrincipal === 'recepcion' ? 'Directos' : 'por Pedidos'}</p>
                  <div className="d-flex gap-1 flex-wrap align-items-center">
                    {[['dia', 'Hoy'], ['mes', 'Mes'], ['anio', 'Año']].map(([val, lbl]) => (
                      <button
                        key={val}
                        className={`hv-periodo-btn d-print-none ${periodo === val ? 'hv-periodo-btn--active' : ''}`}
                        onClick={() => handlePeriodo(val)}
                      >
                        {lbl}
                      </button>
                    ))}
                    {apartadoActual === 'General (Box)' && tabPrincipal === 'recepcion' && (
                      <button className="btn btn-sm btn-outline-danger ms-2 d-print-none" onClick={generarPDF} title="Generar PDF Real">
                        <i className="fas fa-file-pdf"></i> Reporte
                      </button>
                    )}
                  </div>
                </div>
                <p className="hv-stat-value hv-stat-value--green text-center mb-0">
                  ${ingresosDelPeriodo.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════
            BUSCADOR Y FILTROS
        ══════════════════════════════════ */}
        <div className="hv-filtros-row d-print-none mb-3 d-flex flex-column flex-xl-row gap-3 align-items-xl-center">
          <div className="d-flex align-items-center gap-2 flex-wrap flex-grow-1">
            <button className="btn btn-outline-danger" onClick={cargarVentas} title="Refrescar datos">
                <i className="fas fa-sync-alt"></i>
            </button>
            
            {apartadoActual === 'General (Box)' && (
              <div className="d-flex gap-2 overflow-auto" style={{ whiteSpace: 'nowrap', paddingBottom: '5px' }}>
                {tabPrincipal === 'recepcion' ? (
                  <>
                    <button 
                      className={`btn btn-sm ${filtroTipo === 'pagadas' ? 'btn-success' : 'btn-outline-success'}`}
                      onClick={() => setFiltroTipo('pagadas')}
                    >
                      <i className="fas fa-check-circle me-1"></i> Ventas Finalizadas
                    </button>
                    <button 
                      className={`btn btn-sm ${filtroTipo === 'todas' ? 'btn-secondary' : 'btn-outline-secondary'}`}
                      onClick={() => setFiltroTipo('todas')}
                    >
                      Ver Todas (Incl. Canceladas)
                    </button>
                  </>
                ) : (
                  <>
                    <button 
                      className={`btn btn-sm ${filtroTipo === 'todas' ? 'btn-danger' : 'btn-outline-secondary'}`}
                      onClick={() => { setFiltroTipo('todas'); setVerConsolidado(false); }}
                    >
                      Todos los Pedidos
                    </button>
                    <button 
                      className={`btn btn-sm ${filtroTipo === 'pendientes' ? 'btn-warning text-dark fw-bold' : 'btn-outline-warning text-white'}`}
                      onClick={() => { setFiltroTipo('pendientes'); setVerConsolidado(false); }}
                    >
                      <i className="fas fa-clock me-1"></i> Por Pagar
                    </button>
                    <button 
                      className={`btn btn-sm ${filtroTipo === 'por-entregar' ? 'btn-primary text-white fw-bold' : 'btn-outline-primary text-white'}`}
                      onClick={() => { setFiltroTipo('por-entregar'); setVerConsolidado(false); }}
                    >
                      <i className="fas fa-money-bill-check me-1"></i> Pagados (Por Pedir/Entregar)
                    </button>
                    <button 
                      className={`btn btn-sm ${filtroTipo === 'listos' ? 'btn-info text-dark fw-bold' : 'btn-outline-info text-white'}`}
                      onClick={() => { setFiltroTipo('listos'); setVerConsolidado(false); }}
                    >
                      <i className="fas fa-box-open me-1"></i> Listos en Box
                    </button>
                    <button 
                      className={`btn btn-sm ${verConsolidado ? 'btn-light text-dark fw-bold' : 'btn-outline-light'}`}
                      onClick={() => { 
                        setFiltroTipo('por-entregar'); 
                        setVerConsolidado(!verConsolidado); 
                      }}
                      disabled={ventasFiltradas.length === 0 && !verConsolidado}
                    >
                      <i className="fas fa-layer-group me-1"></i> Consolidar para Pedido
                    </button>
                  </>
                )}
              </div>
            )}

            <div className="hv-search-wrap ms-xl-2 flex-grow-1" style={{ minWidth: '250px' }}>
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
              onChange={handleFechaCalendario}
              placeholder="Filtrar día"
            />
            {fechaFiltro && (
              <button
                className="hv-clear-date-btn"
                onClick={() => { setFechaFiltro(''); setPeriodo('mes'); }}
                title="Quitar filtro de fecha"
              >
                <i className="fas fa-times"></i>
              </button>
            )}
          </div>
        </div>

        {/* ══════════════════════════════════
            LISTA DE VENTAS O CONSOLIDADO
        ══════════════════════════════════ */}
        {loading ? (
          <div className="hv-loading">
            <div className="spinner-wp"></div>
          </div>
        ) : verConsolidado ? (
          <div className="consolidado-container">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h4 className="text-white mb-0">
                <i className="fas fa-layer-group me-2 text-info"></i>
                Consolidado: {filtroTipo === 'por-entregar' ? 'Pagados por Pedir' : 'Lote seleccionado'}
              </h4>
              <button className="btn btn-primary" onClick={generarPDFConsolidado}>
                <i className="fas fa-file-pdf me-2"></i> Exportar Lista para Proveedor
              </button>
            </div>

            <div className="row g-3">
              {listaConsolidada.length === 0 ? (
                <div className="col-12 text-center py-5 bg-dark rounded border border-secondary">
                  <p className="text-muted mb-0">No hay productos pagados para consolidar en este periodo.</p>
                </div>
              ) : (
                listaConsolidada.map((prod, idx) => (
                  <div className="col-12" key={idx}>
                    <div className="hv-venta-card p-3 d-flex align-items-center gap-3">
                      <div className="hv-venta-icono bg-primary">
                        <i className="fas fa-box"></i>
                      </div>
                      <div className="flex-grow-1">
                        <h5 className="mb-1 text-white fw-bold">{prod.nombre}</h5>
                        <div className="d-flex gap-2">
                          {prod.talla && <span className="badge border border-light text-light">Talla: {prod.talla}</span>}
                          {prod.categoria && <span className="badge bg-secondary">{prod.categoria}</span>}
                        </div>
                      </div>
                      <div className="text-center px-4 border-start border-secondary">
                        <p className="hv-stat-label mb-0">Cantidad</p>
                        <p className="hv-stat-value mb-0 text-info">{prod.cantidadTotal}</p>
                      </div>
                      <div className="text-end border-start border-secondary ps-4" style={{ minWidth: '150px' }}>
                        <p className="hv-stat-label mb-0">Solicitado por</p>
                        <p className="text-white mb-0 fw-bold">{prod.atletas.length} Atletas</p>
                        <button 
                          className="btn btn-link btn-sm text-info p-0 mt-1"
                          onClick={() => alert(`Solicitado por: \n${prod.atletas.map(a => `- ${a.nombre} (${a.cantidad})`).join('\n')}`)}
                        >
                          Ver nombres
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            <div className="mt-4 p-3 bg-dark rounded border border-info">
              <p className="small text-info mb-0">
                <i className="fas fa-info-circle me-2"></i>
                Esta vista agrupa todos los artículos de los pedidos que coinciden con tus filtros. Ideal para hacer el pedido masivo al proveedor.
              </p>
            </div>
          </div>
        ) : ventas.length === 0 ? (
          <div className="hv-empty">
            <i className="fas fa-receipt"></i>
            <p>{buscar ? 'No se encontraron ventas con esa búsqueda.' : 'Aún no se han registrado ventas.'}</p>
          </div>
        ) : (
          <div className="d-flex flex-column gap-3 gap-sm-4">
            {Object.entries(ventasPorDia).map(([clave, { label, ventas: ventasDelDia }]) => (
              <div key={clave}>

                {/* Cabecera de grupo por día */}
                <div className="hv-dia-header">
                  <i className="fas fa-calendar-day"></i>
                  {label.charAt(0).toUpperCase() + label.slice(1)}
                  <span className="hv-dia-badge">{ventasDelDia.length} venta(s)</span>
                </div>

                <div className="d-flex flex-column gap-2">
                  {ventasDelDia.map(v => (
                    <div key={v.idVenta} className="hv-venta-card">

                      {/* Cabecera de la venta */}
                      <div
                        className="hv-venta-header"
                        onClick={() => setExpandido(expandido === v.idVenta ? null : v.idVenta)}
                      >
                        <div className="d-flex align-items-center gap-3">
                          <div className="hv-venta-icono">
                            <i className="fas fa-receipt"></i>
                          </div>
                          <div>
                            <p className="hv-venta-id">
                              Venta #{v.idVenta} 
                              <span className={`ms-2 badge ${v.usuarioNombre === 'Mostrador' ? 'bg-secondary' : 'bg-info text-dark'}`}>
                                <i className={`fas ${v.usuarioNombre === 'Mostrador' ? 'fa-store' : 'fa-user'} me-1`}></i>
                                {v.usuarioNombre}
                              </span>
                            </p>
                            <p className="hv-venta-fecha">
                              <i className="fas fa-clock"></i>
                              {formatFecha(v.fechaVenta)}
                              {v.detalles?.some(d => d.producto?.esSobrePedido) && (
                                <span className="ms-2 badge bg-warning text-dark">
                                  <i className="fas fa-store me-1"></i>Sobre Pedido
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="d-flex align-items-center gap-3">
                          <div className="text-end">
                            <p className="hv-venta-total">${parseFloat(v.totalVenta).toFixed(2)}</p>
                            <p className="hv-venta-count">{v.detalles?.length || 0} producto(s)</p>
                            {v.estatus && (
                              <span className={`badge bg-${v.estatus === 'Pendiente' ? 'warning text-dark' : v.estatus.includes('Fiado') ? 'primary' : v.estatus === 'Listo para Recoger' ? 'info text-dark' : v.estatus === 'Cancelada' ? 'danger' : 'success'} mt-1`}>
                                {v.estatus.includes('Fiado') ? <><i className="fas fa-handshake me-1"></i> {v.estatus}</> : v.estatus}
                              </span>
                            )}
                          </div>
                          <i className={`fas fa-chevron-${expandido === v.idVenta ? 'up' : 'down'} hv-chevron d-print-none`}></i>
                        </div>
                      </div>

                      {/* Detalles expandibles */}
                      {expandido === v.idVenta && v.detalles && v.detalles.length > 0 && (
                        <div className="hv-detalle-zona">
                          <div className="table-responsive">
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
                                {v.detalles.map(d => (
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
                          
                          {/* PANEL DE GESTIÓN DE ESTATUS */}
                          {v.estatus === 'Pendiente' && (
                            <div className="mt-3 p-3 bg-dark rounded border border-warning">
                              <p className="mb-2 text-warning fw-bold">
                                <i className="fas fa-clock me-2"></i> Pedido de Atleta ({v.usuarioNombre || 'Desconocido'})
                              </p>
                              <div className="d-flex justify-content-between flex-wrap gap-2 mb-3">
                                <p className="small text-muted mb-0">
                                  <i className="fas fa-hourglass-half me-1"></i> Expira: {v.fechaVencimiento ? formatFecha(v.fechaVencimiento) : 'No definida'}
                                </p>
                                <p className="small text-info mb-0">
                                  <i className="fas fa-money-bill-wave me-1"></i> Pago: <strong>{v.metodoPago || 'Efectivo en Recepción'}</strong>
                                </p>
                              </div>
                              <div className="d-flex gap-2">
                                <button 
                                  className="btn btn-sm btn-success"
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    const esSobrePedido = v.detalles?.some(d => d.producto?.esSobrePedido);
                                    if (esSobrePedido) {
                                      if(await window.wpConfirm("Este pedido tiene productos 'Sobre Pedido'. ¿Marcar como cobrado por adelantado? (Se moverá a 'Pagados por Entregar')")) {
                                        await actualizarEstatus(v.idVenta, 'Pagado (Pendiente Entrega)');
                                      }
                                    } else {
                                      if(await window.wpConfirm("¿Confirmar el pago y completar la venta?")) {
                                        await actualizarEstatus(v.idVenta, 'Completada');
                                      }
                                    }
                                  }}
                                >
                                  <i className="fas fa-check me-1"></i> Marcar Pagado
                                </button>
                                <button 
                                  className="btn btn-sm btn-info"
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    if(await window.wpConfirm("¿Marcar este pedido como 'Listo para Recoger'? (El atleta verá que ya llegó al Box)")) {
                                      await actualizarEstatus(v.idVenta, 'Listo para Recoger');
                                    }
                                  }}
                                >
                                  <i className="fas fa-box-open me-1"></i> Listo para Recoger
                                </button>
                                <button 
                                  className="btn btn-sm btn-outline-danger"
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    if(await window.wpConfirm("¿Cancelar este pedido y devolver el stock?")) {
                                      await actualizarEstatus(v.idVenta, 'Cancelada');
                                    }
                                  }}
                                >
                                  <i className="fas fa-times me-1"></i> Cancelar / Devolver Stock
                                </button>
                              </div>
                            </div>
                          )}

                          {v.estatus === 'Pagado (Pendiente Entrega)' && (
                            <div className="mt-3 p-3 bg-dark rounded border border-secondary">
                              <p className="mb-2 text-white fw-bold">
                                <i className="fas fa-truck-loading me-2"></i> Pagado por Adelantado ({v.usuarioNombre || 'Desconocido'})
                              </p>
                              <div className="d-flex justify-content-between flex-wrap gap-2 mb-3">
                                <p className="small text-muted mb-0">
                                  El atleta ya pagó los productos "Sobre Pedido". Aún falta que lleguen y se entreguen.
                                </p>
                              </div>
                              <div className="d-flex gap-2">
                                <button 
                                  className="btn btn-sm btn-info"
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    if(await window.wpConfirm("¿Avisar al atleta que ya puede pasar a recogerlo?")) {
                                      await actualizarEstatus(v.idVenta, 'Pagado y Listo');
                                    }
                                  }}
                                >
                                  <i className="fas fa-box-open me-1"></i> Marcar Listo para Recoger
                                </button>
                              </div>
                            </div>
                          )}

                          {(v.estatus === 'Listo para Recoger' || v.estatus === 'Pagado y Listo') && (
                            <div className="mt-3 p-3 bg-dark rounded border border-info">
                              <p className="mb-2 text-info fw-bold">
                                <i className="fas fa-box-open me-2"></i> Pedido Listo para Entregar ({v.usuarioNombre || 'Desconocido'})
                              </p>
                              <div className="d-flex justify-content-between flex-wrap gap-2 mb-3">
                                <p className="small text-muted mb-0">
                                  <i className="fas fa-money-bill-wave me-1"></i> Pago: <strong>{v.estatus === 'Pagado y Listo' ? 'Ya Pagado (Adelantado)' : (v.metodoPago || 'Efectivo en Recepción')}</strong>
                                </p>
                              </div>
                              <div className="d-flex gap-2">
                                <button 
                                  className="btn btn-sm btn-success"
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    const msg = v.estatus === 'Pagado y Listo' 
                                      ? "¿Confirmar entrega del producto?" 
                                      : "¿Confirmar entrega y completar la venta?";
                                    if(await window.wpConfirm(msg)) {
                                      await actualizarEstatus(v.idVenta, 'Completada');
                                    }
                                  }}
                                >
                                  <i className="fas fa-check-double me-1"></i> {v.estatus === 'Pagado y Listo' ? 'Entregar Producto' : 'Entregar y Completar'}
                                </button>
                              </div>
                            </div>
                          )}
                          
                          {v.estatus === 'Fiado' && (
                            <div className="mt-3 p-3 bg-dark rounded border border-primary">
                              <p className="mb-2 text-primary fw-bold">
                                <i className="fas fa-handshake me-2"></i> Atleta de Confianza ({v.usuarioNombre || 'Desconocido'})
                              </p>
                              <div className="d-flex justify-content-between flex-wrap gap-2 mb-3">
                                <p className="small text-muted mb-0">
                                  El cobro ya fue sumado a la Deuda en Tienda de su perfil.
                                </p>
                              </div>
                              <div className="d-flex gap-2">
                                <button 
                                  className="btn btn-sm btn-primary"
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    if(await window.wpConfirm("¿Marcar este pedido como entregado al atleta?")) {
                                      await actualizarEstatus(v.idVenta, 'Fiado (Entregado)');
                                    }
                                  }}
                                >
                                  <i className="fas fa-check me-1"></i> Marcar Producto Entregado
                                </button>
                                <button 
                                  className="btn btn-sm btn-outline-danger"
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    if(await window.wpConfirm("¿Cancelar este pedido Fiado y revertir la deuda y el stock?")) {
                                      await actualizarEstatus(v.idVenta, 'Cancelada');
                                    }
                                  }}
                                >
                                  <i className="fas fa-times me-1"></i> Cancelar Pedido
                                </button>
                              </div>
                            </div>
                          )}

                          {v.estatus === 'Fiado (Entregado)' && (
                            <div className="mt-3 p-3 bg-dark rounded border border-secondary">
                              <p className="mb-0 text-secondary fw-bold">
                                <i className="fas fa-check-double me-2"></i> Producto entregado (Cargo en Deuda)
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                    </div>
                  ))}
                </div>

              </div>
            ))}
          </div>
        )}

        {!loading && <p className="hv-count-hint">{ventas.length} venta(s) encontrada(s)</p>}

      </div>
    </div>
  );
}
