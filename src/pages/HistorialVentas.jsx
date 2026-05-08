import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { VENTAS_ENDPOINT } from '../services/api';
import BackButton from '../components/BackButton';
import RedGrayDatePicker from '../components/RedGrayDatePicker';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
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
  const [fechaFiltro, setFechaFiltro] = useState('');
  const [imgAbierta, setImgAbierta] = useState(null);

  const [tabActual, setTabActual] = useState('todas');
  const [escalaTiempo, setEscalaTiempo] = useState('diario');
  const [modalCobrarOpen, setModalCobrarOpen] = useState(false);
  const [ventaACobrar, setVentaACobrar] = useState(null);
  const [metodoCobro, setMetodoCobro] = useState('Efectivo en Recepción');
  const [estatusObjetivoCobro, setEstatusObjetivoCobro] = useState('Pagado (Pendiente Entrega)');
  const [procesandoEstatus, setProcesandoEstatus] = useState(false);

  // Estados para el Modal de Reporte PDF
  const [modalReporteOpen, setModalReporteOpen] = useState(false);
  const [reporteFiltroPeriodo, setReporteFiltroPeriodo] = useState('Hoy');
  const [reporteFechaInicio, setReporteFechaInicio] = useState('');
  const [reporteFechaFin, setReporteFechaFin] = useState('');
  const [reporteTipo, setReporteTipo] = useState('Todo'); // Todo, Ingresos, Pendientes

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

  const actualizarEstatus = async (idVenta, nuevoEstatus, metodo = null) => {
    if (!await window.wpConfirm(`¿Estás seguro de cambiar el estatus a "${nuevoEstatus}"?`)) return;

    setProcesandoEstatus(true);
    try {
      const payload = { estatus: nuevoEstatus };
      if (metodo) payload.metodoPago = metodo;

      const token = localStorage.getItem('token');
      const res = await fetch(`${VENTAS_ENDPOINT}/${idVenta}/estatus`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        alert(`¡Éxito! Pedido actualizado a: ${nuevoEstatus}`);
        setModalCobrarOpen(false);
        cargarVentas();
      } else {
        const data = await res.json();
        alert(data.mensaje || 'Error al actualizar estatus');
      }
    } catch (e) {
      alert('Error de conexión');
    } finally {
      setProcesandoEstatus(false);
    }
  };

  function formatFecha(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  let transacciones = [];

  ventas.forEach(v => {
    if (v.metodoPago !== 'Fiado' && v.metodoPago !== 'Fiar (Anotar en mi cuenta)') {
      transacciones.push({
        tipo: 'Venta',
        idUnico: `Venta-${v.idVenta}`,
        fecha: v.fechaVenta,
        datos: v
      });
    }

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

  transacciones.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  const getLocalIsoDate = (dateStr) => {
    const d = new Date(dateStr);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  if (fechaFiltro) {
    transacciones = transacciones.filter(t => getLocalIsoDate(t.fecha) === fechaFiltro);
  }

  // ----------------------------------------------------------------------
  // LOGICA PARA ANALÍTICAS
  // ----------------------------------------------------------------------
  let totalIngreso = 0;
  let pendienteDeCobro = 0;
  let deudaFiado = 0;
  let countProductosNormales = 0;
  let countProductosSobrePedido = 0;
  
  const ventasDiariasMap = {};
  const metodosPagoMap = {};
  let countPendiente = 0;
  let countPorEntregar = 0;
  let countListos = 0;

  const ventasAAnalizar = fechaFiltro ? ventas.filter(v => getLocalIsoDate(v.fechaVenta) === fechaFiltro) : ventas;

  // Calculamos deudaFiado y contadores sobre ventasAAnalizar
  ventasAAnalizar.forEach(v => {
    if (v.estatus !== 'Cancelada') {
      if (v.estatus === 'Pendiente' && v.metodoPago !== 'Fiado') {
          pendienteDeCobro += v.totalVenta;
          countPendiente++;
      }
      if (v.estatus === 'Fiado' || v.estatus === 'Fiado (Entregado)') {
          const totalAbonos = (v.abonos || []).reduce((sum, a) => sum + parseFloat(a.monto), 0);
          deudaFiado += (v.totalVenta - totalAbonos);
      }
      if (v.estatus === 'Pagado (Pendiente Entrega)') countPorEntregar++;
      if (v.estatus === 'Pagado y Listo' || v.estatus === 'Listo para Recoger') countListos++;

      if (v.detalles) {
          v.detalles.forEach(d => {
              if (d.producto?.esSobrePedido) countProductosSobrePedido += d.cantidad;
              else countProductosNormales += d.cantidad;
          });
      }
    }
  });

  const agruparEnGrafica = (fechaIso, monto) => {
      let claveFechaSort = '';
      let labelStr = '';
      let d = new Date(fechaIso);
      
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');

      if (escalaTiempo === 'diario') {
         claveFechaSort = `${yyyy}-${mm}-${dd}`;
         labelStr = d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
      } else if (escalaTiempo === 'semanal') {
         const day = d.getDay(); 
         const diff = d.getDate() - day + (day === 0 ? -6 : 1);
         const monday = new Date(new Date(d).setDate(diff));
         const mY = monday.getFullYear();
         const mM = String(monday.getMonth() + 1).padStart(2, '0');
         const mD = String(monday.getDate()).padStart(2, '0');
         claveFechaSort = `${mY}-${mM}-${mD}`;
         labelStr = `Semana del ${mD}/${mM}`;
      } else if (escalaTiempo === 'mensual') {
         claveFechaSort = `${yyyy}-${mm}`;
         let mesNombre = d.toLocaleString('es-MX', { month: 'short' });
         mesNombre = mesNombre.charAt(0).toUpperCase() + mesNombre.slice(1);
         labelStr = `${mesNombre} ${yyyy}`;
      } else if (escalaTiempo === 'anual') {
         claveFechaSort = `${yyyy}`;
         labelStr = `${yyyy}`;
      }

      if (!ventasDiariasMap[claveFechaSort]) {
         ventasDiariasMap[claveFechaSort] = { total: 0, label: labelStr };
      }
      ventasDiariasMap[claveFechaSort].total += monto;
  };

  // Calculamos ingresos sobre las transacciones filtradas para incluir Abonos correctamente
  transacciones.forEach(t => {
      const isVenta = t.tipo === 'Venta';
      
      if (isVenta) {
          const v = t.datos;
          if (v.estatus === 'Cancelada' || v.metodoPago === 'Fiado' || v.metodoPago === 'Fiar (Anotar en mi cuenta)') return;
          
          if (v.estatus === 'Completada' || v.estatus === 'Pagado y Listo' || v.estatus === 'Pagado (Pendiente Entrega)') {
              totalIngreso += v.totalVenta;
              
              let mp = v.metodoPago || 'Efectivo';
              const mpLower = mp.toLowerCase();
              if (mpLower.includes('tarjeta')) mp = 'Tarjeta en Recepción';
              else if (mpLower.includes('transf')) mp = 'Transferencia';
              else if (mpLower.includes('linea') || mpLower.includes('línea')) mp = 'En línea';
              else mp = 'Efectivo';

              metodosPagoMap[mp] = (metodosPagoMap[mp] || 0) + v.totalVenta;
              agruparEnGrafica(v.fechaVenta, v.totalVenta);
          }
      } else {
          const a = t.datos;
          // Solo sumar abonos aprobados
          if (a.estatus === 'Aprobado') {
              totalIngreso += a.monto;
              
              let mp = a.metodoPago || 'Efectivo';
              const mpLower = mp.toLowerCase();
              if (mpLower.includes('tarjeta')) mp = 'Tarjeta en Recepción';
              else if (mpLower.includes('transf')) mp = 'Transferencia';
              else if (mpLower.includes('linea') || mpLower.includes('línea')) mp = 'En línea';
              else mp = 'Efectivo';

              metodosPagoMap[mp] = (metodosPagoMap[mp] || 0) + a.monto;
              agruparEnGrafica(a.fechaAbono, a.monto);
          }
      }
  });

  const porcentajeSobrePedido = countProductosNormales + countProductosSobrePedido > 0 
      ? Math.round((countProductosSobrePedido / (countProductosNormales + countProductosSobrePedido)) * 100) 
      : 0;

  const chartVentasDiarias = Object.entries(ventasDiariasMap)
    .sort((a,b) => a[0].localeCompare(b[0]))
    .map(([key, data]) => ({
        name: data.label,
        Total: data.total
    }));

  const promedioDiario = chartVentasDiarias.length > 0 
    ? chartVentasDiarias.reduce((acc, curr) => acc + curr.Total, 0) / chartVentasDiarias.length 
    : 0;

  const chartMetodosPago = Object.entries(metodosPagoMap).map(([name, value]) => ({ name, value }));
  const COLORS_PAGO = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899'];

  const chartEmbudo = [
      { name: 'Pendientes (Cobro)', Cantidad: countPendiente, fill: '#f59e0b' },
      { name: 'Pagados (Espera)', Cantidad: countPorEntregar, fill: '#3b82f6' },
      { name: 'Listos (Entrega)', Cantidad: countListos, fill: '#0ea5e9' }
  ];
  // ----------------------------------------------------------------------
  // GENERADORES DE PDF
  // ----------------------------------------------------------------------
  const generarReporteVentasPDF = () => {
    // 1. Generar transacciones crudas sin filtros de UI
    let pdfTransacciones = [];
    ventas.forEach(v => {
      if (v.metodoPago !== 'Fiado' && v.metodoPago !== 'Fiar (Anotar en mi cuenta)') {
        pdfTransacciones.push({
          tipo: 'Venta',
          fecha: v.fechaVenta,
          datos: v
        });
      }
      if (v.abonos && v.abonos.length > 0) {
        v.abonos.forEach(a => {
          pdfTransacciones.push({
            tipo: 'Abono',
            fecha: a.fechaAbono,
            datos: { ...a, ventaRelacionada: v }
          });
        });
      }
    });

    // 2. Filtrar por rango de fechas
    pdfTransacciones = pdfTransacciones.filter(t => {
      const d = new Date(t.fecha);
      d.setHours(0,0,0,0);
      
      const hoy = new Date();
      hoy.setHours(0,0,0,0);

      if (reporteFiltroPeriodo === 'Hoy') {
        return d.getTime() === hoy.getTime();
      } else if (reporteFiltroPeriodo === 'Esta Semana') {
        const day = hoy.getDay(); 
        const diff = hoy.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(new Date().setDate(diff));
        monday.setHours(0,0,0,0);
        return d >= monday && d <= new Date();
      } else if (reporteFiltroPeriodo === 'Este Mes') {
        return d.getMonth() === new Date().getMonth() && d.getFullYear() === new Date().getFullYear();
      } else if (reporteFiltroPeriodo === 'Este Año') {
        return d.getFullYear() === new Date().getFullYear();
      } else if (reporteFiltroPeriodo === 'Personalizado') {
        if (!reporteFechaInicio || !reporteFechaFin) return true;
        
        // Sumamos 1 día a la fecha fin si hay problemas de zona horaria, pero el local no debería sufrir de esto si parseamos con cuidado
        const startStr = reporteFechaInicio.split('-');
        const endStr = reporteFechaFin.split('-');
        
        const start = new Date(startStr[0], startStr[1] - 1, startStr[2]); 
        start.setHours(0,0,0,0);
        const end = new Date(endStr[0], endStr[1] - 1, endStr[2]); 
        end.setHours(23,59,59,999);
        
        return d >= start && d <= end;
      }
      return true; // 'Todo el Historial'
    });

    // 3. Filtrar por tipo
    if (reporteTipo === 'Ingresos') {
      pdfTransacciones = pdfTransacciones.filter(t => {
         if (t.tipo === 'Venta') {
             const estatus = t.datos.estatus;
             return estatus === 'Completada' || estatus === 'Pagado y Listo' || estatus === 'Pagado (Pendiente Entrega)';
         } else {
             return t.datos.estatus === 'Aprobado';
         }
      });
    } else if (reporteTipo === 'Pendientes') {
      pdfTransacciones = pdfTransacciones.filter(t => t.tipo === 'Venta' && t.datos.estatus === 'Pendiente');
    }

    // 4. Recalcular totales para este corte
    let pdfTotalIngreso = 0;
    let pdfPendiente = 0;
    pdfTransacciones.forEach(t => {
        if (t.tipo === 'Venta') {
            const v = t.datos;
            if (v.estatus === 'Completada' || v.estatus === 'Pagado y Listo' || v.estatus === 'Pagado (Pendiente Entrega)') {
                pdfTotalIngreso += parseFloat(v.totalVenta || 0);
            } else if (v.estatus === 'Pendiente') {
                pdfPendiente += parseFloat(v.totalVenta || 0);
            }
        } else {
            const a = t.datos;
            if (a.estatus === 'Aprobado') {
                pdfTotalIngreso += parseFloat(a.monto || 0);
            }
        }
    });

    let tituloPeriodo = reporteFiltroPeriodo;
    let nombreArchivoPeriodo = reporteFiltroPeriodo.replace(/ /g, '_');

    if (reporteFiltroPeriodo === 'Personalizado') {
        if (reporteFechaInicio && reporteFechaFin) {
            if (reporteFechaInicio === reporteFechaFin) {
                tituloPeriodo = `Día ${reporteFechaInicio}`;
                nombreArchivoPeriodo = `Dia_${reporteFechaInicio}`;
            } else {
                tituloPeriodo = `del ${reporteFechaInicio} al ${reporteFechaFin}`;
                nombreArchivoPeriodo = `Del_${reporteFechaInicio}_Al_${reporteFechaFin}`;
            }
        }
    } else if (reporteFiltroPeriodo === 'Hoy') {
        const h = new Date();
        const yyyy = h.getFullYear();
        const mm = String(h.getMonth() + 1).padStart(2, '0');
        const dd = String(h.getDate()).padStart(2, '0');
        tituloPeriodo = `del Día ${dd}/${mm}/${yyyy}`;
        nombreArchivoPeriodo = `Dia_${yyyy}-${mm}-${dd}`;
    }

    const doc = new jsPDF();
    const titulo = `Reporte de Ventas - ${tituloPeriodo}`;
    const boxNombre = box?.nombre || 'Box';
    const boxUbicacion = box?.ubicacion || '';

    doc.setFontSize(16);
    doc.text(titulo, 14, 20);
    
    doc.setFontSize(10);
    doc.text(`Box: ${boxNombre} ${boxUbicacion ? `- ${boxUbicacion}` : ''}`, 14, 28);
    doc.text(`Generado el: ${new Date().toLocaleString('es-MX')}`, 14, 34);
    doc.text(`Ingreso Confirmado (En Periodo): $${pdfTotalIngreso.toFixed(2)}`, 14, 40);
    doc.text(`Pendiente de Cobro (En Periodo): $${pdfPendiente.toFixed(2)}`, 14, 46);

    const columns = [
      { header: 'Fecha', dataKey: 'fecha' },
      { header: 'Tipo/ID', dataKey: 'tipo' },
      { header: 'Atleta/Responsable', dataKey: 'responsable' },
      { header: 'Método', dataKey: 'metodo' },
      { header: 'Estatus', dataKey: 'estatus' },
      { header: 'Monto', dataKey: 'monto' }
    ];

    const rows = pdfTransacciones.map(t => {
      const isVenta = t.tipo === 'Venta';
      const v = isVenta ? t.datos : t.datos.ventaRelacionada;
      const a = isVenta ? null : t.datos;
      return {
        fecha: new Date(t.fecha).toLocaleDateString('es-MX', {day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'}),
        tipo: isVenta ? `Venta #${v.idVenta}` : `Abono Deuda`,
        responsable: v.usuarioNombre || 'Desconocido',
        metodo: isVenta ? (v.metodoPago || 'Efectivo') : (a.metodoPago || 'Efectivo'),
        estatus: isVenta ? v.estatus : 'Abono Aprobado',
        monto: `$${parseFloat(isVenta ? v.totalVenta : a.monto).toFixed(2)}`
      };
    });

    autoTable(doc, {
      startY: 54,
      columns: columns,
      body: rows,
      theme: 'grid',
      headStyles: { fillColor: [220, 53, 69] },
      styles: { fontSize: 8 }
    });

    doc.save(`ReporteVentas_${nombreArchivoPeriodo}.pdf`);
    setModalReporteOpen(false);
  };

  const generarListaComprasPDF = () => {
    // Incluir ventas Pagadas en espera y las ventas Fiadas (que se autorizaron en confianza)
    const ventasPagadas = ventas.filter(v => v.estatus === 'Pagado (Pendiente Entrega)' || v.estatus === 'Fiado');
    const productosAgrupados = {};

    ventasPagadas.forEach(v => {
      if (v.detalles) {
        v.detalles.forEach(d => {
          if (d.producto?.esSobrePedido) {
            const id = d.idProducto;
            if (!productosAgrupados[id]) {
              productosAgrupados[id] = {
                nombre: d.producto.nombre || `Producto #${id}`,
                cantidad: 0,
                costoAprox: 0
              };
            }
            productosAgrupados[id].cantidad += d.cantidad;
            productosAgrupados[id].costoAprox += parseFloat(d.subtotal);
          }
        });
      }
    });

    const rows = Object.values(productosAgrupados).map(p => ({
      producto: p.nombre,
      cantidad: p.cantidad,
      valorVendido: `$${p.costoAprox.toFixed(2)}`
    }));

    if (rows.length === 0) {
      alert("No hay productos 'Sobre Pedido' pagados pendientes por surtir en este momento.");
      return;
    }

    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Lista de Compras a Proveedor (Sobre Pedido)', 14, 20);
    
    doc.setFontSize(10);
    doc.text('Este reporte incluye los productos que ya han sido PAGADOS o autorizados en', 14, 28);
    doc.text('FIADO. Es seguro realizar el pedido al proveedor.', 14, 34);
    doc.text(`Generado el: ${new Date().toLocaleString('es-MX')}`, 14, 42);

    autoTable(doc, {
      startY: 50,
      columns: [
        { header: 'Producto a pedir', dataKey: 'producto' },
        { header: 'Cantidad Total Requerida', dataKey: 'cantidad' },
        { header: 'Dinero Cobrado por estos', dataKey: 'valorVendido' }
      ],
      body: rows,
      theme: 'grid',
      headStyles: { fillColor: [46, 204, 113] },
      styles: { fontSize: 10, halign: 'center' },
      columnStyles: { 0: { halign: 'left' } }
    });

    doc.save(`Lista_Compras_${new Date().toISOString().slice(0,10)}.pdf`);
  };
  // ----------------------------------------------------------------------

  if (tabActual === 'pendientes') {
    transacciones = transacciones.filter(t => t.tipo === 'Venta' && t.datos.estatus === 'Pendiente' && t.datos.metodoPago !== 'Fiado');
  } else if (tabActual === 'por-entregar') {
    transacciones = transacciones.filter(t => t.tipo === 'Venta' && (t.datos.estatus === 'Pagado (Pendiente Entrega)' || t.datos.estatus === 'Fiado'));
  } else if (tabActual === 'listos') {
    transacciones = transacciones.filter(t => t.tipo === 'Venta' && (t.datos.estatus === 'Pagado y Listo' || t.datos.estatus === 'Listo para Recoger'));
  } else if (tabActual === 'canceladas') {
    transacciones = transacciones.filter(t => t.tipo === 'Venta' && t.datos.estatus === 'Cancelada');
  }

  const transaccionesPorDia = transacciones.reduce((acc, t) => {
    // Usar zona horaria local para agrupar transacciones también
    const d = new Date(t.fecha);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const clave = `${yyyy}-${mm}-${dd}`;
    const label = d.toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
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
              Historial y <span>Pedidos</span>
            </h1>
          </div>
      </header>

      <div className="container-xl px-3 px-md-4 pb-5">

        <div className="hv-tabs d-flex flex-wrap gap-2 mb-4 border-bottom border-secondary pb-3">
            <button 
                className={`btn ${tabActual === 'todas' ? 'btn-danger' : 'btn-outline-secondary text-white'} rounded-pill px-3`} 
                onClick={() => setTabActual('todas')}
            >
                <i className="fas fa-list me-2"></i>Historial General
            </button>
            <button 
                className={`btn ${tabActual === 'pendientes' ? 'btn-warning text-dark fw-bold' : 'btn-outline-secondary text-white'} rounded-pill px-3`} 
                onClick={() => setTabActual('pendientes')}
            >
                <i className="fas fa-clock me-2"></i>Pedidos por Cobrar
            </button>
            <button 
                className={`btn ${tabActual === 'por-entregar' ? 'btn-primary text-white' : 'btn-outline-secondary text-white'} rounded-pill px-3`} 
                onClick={() => setTabActual('por-entregar')}
            >
                <i className="fas fa-truck-loading me-2"></i>Pagados (Por Entregar)
            </button>
            <button 
                className={`btn ${tabActual === 'listos' ? 'btn-info text-dark fw-bold' : 'btn-outline-secondary text-white'} rounded-pill px-3`} 
                onClick={() => setTabActual('listos')}
            >
                <i className="fas fa-box-open me-2"></i>Listos para Recoger
            </button>
            <button 
                className={`btn ${tabActual === 'canceladas' ? 'btn-dark text-danger border-danger' : 'btn-outline-secondary text-white'} rounded-pill px-3`} 
                onClick={() => setTabActual('canceladas')}
            >
                <i className="fas fa-ban me-2"></i>Cancelados
            </button>
        </div>



        {loading ? (
          <div className="hv-loading">
            <div className="spinner-wp"></div>
          </div>
        ) : (
          <>
            {/* PANEL ANALÍTICO SOLO EN HISTORIAL GENERAL */}
            {tabActual === 'todas' && (
              <div className="analytics-section mb-5 border-bottom border-secondary pb-4">
                <div className="row g-4 mb-4">
                  <div className="col-12 col-md-6 col-xl-3">
                    <div className="p-4 bg-dark rounded border border-secondary text-center h-100 d-flex flex-column justify-content-center position-relative">
                      <p className="text-white-50 mb-1 text-uppercase small fw-bold tracking-wider">Ingreso Total {fechaFiltro ? 'del Día' : 'Histórico'}</p>
                      <h2 className="text-success fw-bold m-0">${totalIngreso.toFixed(2)}</h2>
                      <i className="fas fa-info-circle position-absolute text-muted" style={{top: '12px', right: '12px', cursor: 'help'}} title="Suma total de todas las ventas que ya fueron cobradas o entregadas."></i>
                    </div>
                  </div>
                  <div className="col-12 col-md-6 col-xl-3">
                    <div className="p-4 bg-dark rounded border border-secondary text-center h-100 d-flex flex-column justify-content-center position-relative">
                      <p className="text-white-50 mb-1 text-uppercase small fw-bold tracking-wider">Pendiente de Cobro</p>
                      <h2 className="text-warning fw-bold m-0">${pendienteDeCobro.toFixed(2)}</h2>
                      <i className="fas fa-info-circle position-absolute text-muted" style={{top: '12px', right: '12px', cursor: 'help'}} title="Suma de pedidos que ya se reservaron pero que el atleta no ha pagado en recepción."></i>
                    </div>
                  </div>
                  <div className="col-12 col-md-6 col-xl-3">
                    <div className="p-4 bg-dark rounded border border-secondary text-center h-100 d-flex flex-column justify-content-center position-relative">
                      <p className="text-white-50 mb-1 text-uppercase small fw-bold tracking-wider">Deuda (Fiados)</p>
                      <h2 className="text-primary fw-bold m-0">${deudaFiado.toFixed(2)}</h2>
                      <i className="fas fa-info-circle position-absolute text-muted" style={{top: '12px', right: '12px', cursor: 'help'}} title="Dinero en la calle. Ventas autorizadas en crédito (restando abonos realizados)."></i>
                    </div>
                  </div>
                  <div className="col-12 col-md-6 col-xl-3">
                    <div className="p-4 bg-dark rounded border border-secondary text-center h-100 d-flex flex-column justify-content-center position-relative">
                      <p className="text-white-50 mb-1 text-uppercase small fw-bold tracking-wider">Productos Sobre Pedido</p>
                      <h2 className="text-info fw-bold m-0">{porcentajeSobrePedido}%</h2>
                      <small className="text-white-50" style={{fontSize: '0.75rem'}}>del volumen total vendido</small>
                      <i className="fas fa-info-circle position-absolute text-muted" style={{top: '12px', right: '12px', cursor: 'help'}} title="Indica qué porcentaje de todos los productos vendidos pertenecen a la modalidad 'Sobre Pedido' frente a productos de stock regular."></i>
                    </div>
                  </div>
                </div>

                <div className="row g-4">
                  <div className="col-12 col-lg-8">
                    <div className="p-3 bg-dark rounded border border-secondary h-100">
                      <div className="d-flex justify-content-between align-items-center mb-4 ps-2 flex-wrap gap-2">
                        <div className="d-flex align-items-center">
                            <h5 className="text-white m-0"><i className="fas fa-chart-bar text-danger me-2"></i>Historial de Ventas</h5>
                            <i className="fas fa-info-circle text-muted ms-2" style={{cursor: 'help'}} title="Gráfica de los ingresos confirmados. La línea punteada naranja representa tu meta/promedio del periodo mostrado."></i>
                        </div>
                        <div className="btn-group btn-group-sm">
                            <button className={`btn ${escalaTiempo === 'diario' ? 'btn-danger' : 'btn-outline-secondary text-white'}`} onClick={() => setEscalaTiempo('diario')}>Diario</button>
                            <button className={`btn ${escalaTiempo === 'semanal' ? 'btn-danger' : 'btn-outline-secondary text-white'}`} onClick={() => setEscalaTiempo('semanal')}>Semana</button>
                            <button className={`btn ${escalaTiempo === 'mensual' ? 'btn-danger' : 'btn-outline-secondary text-white'}`} onClick={() => setEscalaTiempo('mensual')}>Mes</button>
                            <button className={`btn ${escalaTiempo === 'anual' ? 'btn-danger' : 'btn-outline-secondary text-white'}`} onClick={() => setEscalaTiempo('anual')}>Año</button>
                        </div>
                      </div>
                      {chartVentasDiarias.length > 0 ? (
                        <div style={{ width: '100%', height: 300 }}>
                          <ResponsiveContainer>
                            <BarChart data={chartVentasDiarias} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                              <XAxis dataKey="name" stroke="#888" tick={{fill: '#888'}} />
                              <YAxis stroke="#888" tick={{fill: '#888'}} tickFormatter={(value) => `$${value}`} />
                              <Tooltip 
                                cursor={{fill: 'rgba(255,255,255,0.05)'}}
                                contentStyle={{ backgroundColor: '#1e1e1e', border: '1px solid #333', borderRadius: '8px' }}
                                itemStyle={{ color: '#10b981', fontWeight: 'bold' }}
                                formatter={(value) => [`$${value.toFixed(2)}`, 'Ingreso']}
                              />
                              <ReferenceLine y={promedioDiario} stroke="#f59e0b" strokeDasharray="3 3" label={{ position: 'top', value: `Promedio: $${promedioDiario.toFixed(2)}`, fill: '#f59e0b', fontSize: 12 }} />
                              <Bar dataKey="Total" fill="#dc3545" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <div className="d-flex align-items-center justify-content-center text-muted" style={{height: '300px'}}>No hay datos suficientes para graficar.</div>
                      )}
                    </div>
                  </div>
                  <div className="col-12 col-lg-4">
                    <div className="p-3 bg-dark rounded border border-secondary h-100">
                      <div className="d-flex justify-content-between align-items-center mb-4 ps-2">
                        <h5 className="text-white m-0"><i className="fas fa-chart-pie text-success me-2"></i>Métodos de Pago</h5>
                        <i className="fas fa-info-circle text-muted" style={{cursor: 'help'}} title="Muestra el volumen de ingresos separado por método de pago (Efectivo, Tarjeta, Transferencia, En línea) de las ventas ya cobradas."></i>
                      </div>
                      {chartMetodosPago.length > 0 ? (
                        <div style={{ width: '100%', height: 300 }}>
                          <ResponsiveContainer>
                            <PieChart>
                              <Pie
                                data={chartMetodosPago}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                              >
                                {chartMetodosPago.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={COLORS_PAGO[index % COLORS_PAGO.length]} />
                                ))}
                              </Pie>
                              <Tooltip 
                                contentStyle={{ backgroundColor: '#1e1e1e', border: '1px solid #333', borderRadius: '8px' }}
                                itemStyle={{ color: '#fff' }}
                                formatter={(value, name) => [`$${value.toFixed(2)}`, name]}
                              />
                              <Legend wrapperStyle={{ fontSize: '0.8rem', paddingTop: '10px' }} />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <div className="d-flex align-items-center justify-content-center text-muted" style={{height: '300px'}}>No hay ingresos registrados.</div>
                      )}
                    </div>
                  </div>
                  <div className="col-12">
                    <div className="p-3 bg-dark rounded border border-secondary">
                      <div className="d-flex justify-content-between align-items-center mb-4 ps-2">
                        <h5 className="text-white m-0"><i className="fas fa-funnel-dollar text-primary me-2"></i>Embudo de Logística (Pedidos en Proceso)</h5>
                        <i className="fas fa-info-circle text-muted" style={{cursor: 'help'}} title="Visualización del volumen de pedidos en cada etapa del proceso de entrega. Útil para saber dónde hay cuellos de botella logísticos."></i>
                      </div>
                      {chartEmbudo.some(e => e.Cantidad > 0) ? (
                        <div style={{ width: '100%', height: 250 }}>
                          <ResponsiveContainer>
                            <BarChart data={chartEmbudo} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal={false} />
                              <XAxis type="number" stroke="#888" tick={{fill: '#888'}} allowDecimals={false} />
                              <YAxis type="category" dataKey="name" stroke="#888" tick={{fill: '#888'}} width={150} />
                              <Tooltip 
                                contentStyle={{ backgroundColor: '#1e1e1e', border: '1px solid #333', borderRadius: '8px' }}
                                itemStyle={{ color: '#fff' }}
                                cursor={{fill: 'rgba(255,255,255,0.05)'}}
                              />
                              <Bar dataKey="Cantidad" radius={[0, 4, 4, 0]}>
                                {chartEmbudo.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.fill} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <div className="d-flex align-items-center justify-content-center text-muted" style={{height: '200px'}}>Todos los pedidos han sido entregados o no hay pedidos activos.</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* LISTA DE TRANSACCIONES */}
            
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
              
              <div className="d-flex align-items-center gap-2 flex-wrap">
                <button className="btn btn-outline-light" onClick={() => setModalReporteOpen(true)} title="Configurar y Generar PDF">
                  <i className="fas fa-file-pdf text-danger me-2"></i>Reporte Ventas
                </button>
                <button className="btn btn-outline-info text-nowrap" onClick={generarListaComprasPDF} title="Generar lista de compras sobre pedido">
                  <i className="fas fa-clipboard-list me-2"></i>Lista a Proveedor
                </button>
              </div>
            </div>

            {transacciones.length === 0 ? (
              <div className="hv-empty">
                <i className="fas fa-receipt"></i>
                <p>{buscar ? 'No se encontraron transacciones con esa búsqueda.' : 'No hay registros en esta categoría.'}</p>
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
                                      <span className={`badge bg-${v.estatus === 'Pendiente' ? 'warning text-dark' : v.estatus === 'Listo para Recoger' || v.estatus === 'Pagado y Listo' ? 'info text-dark' : v.estatus.includes('Fiado') ? 'primary' : v.estatus === 'Cancelada' ? 'danger' : 'success'} mt-1`}>
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

                                <h6 className="text-white mb-3 fw-bold"><i className="fas fa-shopping-basket text-accent-cool me-2"></i>{isVenta ? 'Artículos de la venta' : 'Productos de la Deuda Original'}</h6>
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
                                          <td className="hv-detalle-nombre">
                                            {d.producto?.nombre || `Producto #${d.idProducto}`}
                                            {d.producto?.esSobrePedido && <span className="badge bg-warning text-dark ms-2" style={{fontSize:'0.6rem'}}>Pedido</span>}
                                          </td>
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
                                  <div className="mt-3 pt-3 border-top border-secondary d-flex align-items-center">
                                    <span className="text-white small fw-bold me-2">Método de pago:</span>
                                    <span className="badge bg-dark border border-secondary text-light p-2">
                                      <i className={`fas ${v.metodoPago === 'Efectivo' || v.metodoPago === 'Efectivo en Recepción' ? 'fa-money-bill-wave text-success' : v.metodoPago?.includes('Tarjeta') ? 'fa-credit-card text-info' : v.metodoPago?.includes('Transferencia') ? 'fa-university text-primary' : 'fa-laptop text-warning'} me-2`}></i>
                                      {v.metodoPago || 'Efectivo'}
                                    </span>
                                  </div>
                                )}

                                {/* CONTROLES ADMINISTRATIVOS PARA FLUJO SOBRE PEDIDO */}
                                {isVenta && (
                                  <div className="mt-4 pt-3 border-top border-secondary d-flex flex-wrap gap-2 justify-content-end align-items-center">
                                    {v.estatus === 'Pendiente' && v.metodoPago !== 'Fiado' && (
                                        <>
                                            <button 
                                              className="btn btn-outline-danger" 
                                              onClick={(e) => { e.stopPropagation(); actualizarEstatus(v.idVenta, 'Cancelada'); }}
                                            >
                                              <i className="fas fa-ban me-1"></i>Cancelar Pedido
                                            </button>
                                            <button 
                                              className="btn btn-warning text-dark fw-bold" 
                                              onClick={(e) => { e.stopPropagation(); setVentaACobrar(v); setEstatusObjetivoCobro('Pagado (Pendiente Entrega)'); setModalCobrarOpen(true); }}
                                            >
                                              <i className="fas fa-cash-register me-2"></i>Cobrar Pedido (Recibí el Pago)
                                            </button>
                                        </>
                                    )}
                                    {v.estatus === 'Pagado (Pendiente Entrega)' && (
                                        <>
                                          <button 
                                              className="btn btn-outline-danger" 
                                              onClick={(e) => { e.stopPropagation(); actualizarEstatus(v.idVenta, 'Cancelada'); }}
                                          >
                                              <i className="fas fa-ban me-1"></i>Cancelar Pedido
                                          </button>
                                          <button 
                                            className="btn btn-info text-dark fw-bold" 
                                            onClick={(e) => { e.stopPropagation(); actualizarEstatus(v.idVenta, 'Pagado y Listo'); }}
                                          >
                                            <i className="fas fa-box-open me-2"></i>Marcar Listo para Recoger
                                          </button>
                                        </>
                                    )}
                                    {(v.estatus === 'Pagado y Listo' || v.estatus === 'Listo para Recoger') && (
                                        <button 
                                          className="btn btn-success fw-bold" 
                                          onClick={(e) => { e.stopPropagation(); actualizarEstatus(v.idVenta, 'Completada'); }}
                                        >
                                          <i className="fas fa-check-double me-2"></i>Entregar al Atleta (Completar)
                                        </button>
                                    )}
                                    {(v.estatus === 'Fiado' || v.estatus === 'Fiado (Entregado)') && (
                                        <>
                                          <button 
                                            className="btn btn-success fw-bold" 
                                            onClick={(e) => { e.stopPropagation(); setVentaACobrar(v); setEstatusObjetivoCobro('Completada'); setModalCobrarOpen(true); }}
                                          >
                                            <i className="fas fa-cash-register me-2"></i>Liquidar Deuda (Cobrar Total)
                                          </button>
                                          {v.estatus === 'Fiado' && (
                                            <button 
                                              className="btn btn-primary fw-bold" 
                                              onClick={(e) => { e.stopPropagation(); actualizarEstatus(v.idVenta, 'Fiado (Entregado)'); }}
                                            >
                                              <i className="fas fa-handshake me-2"></i>Marcar Entregado (Sigue Fiado)
                                            </button>
                                          )}
                                        </>
                                    )}
                                    {v.estatus === 'Cancelada' && (
                                        <button 
                                          className="btn btn-outline-light" 
                                          onClick={(e) => { e.stopPropagation(); actualizarEstatus(v.idVenta, 'Pendiente'); }}
                                        >
                                          <i className="fas fa-undo me-2"></i>Restaurar a Pendiente
                                        </button>
                                    )}
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
          </>
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

      {/* Modal para Confirmar Cobro */}
      {modalCobrarOpen && ventaACobrar && (
        <div 
          onClick={() => !procesandoEstatus && setModalCobrarOpen(false)} 
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
              <h5 className="mb-0 text-white">Confirmar Cobro de Pedido</h5>
              <button 
                className="btn-close btn-close-white" 
                onClick={() => setModalCobrarOpen(false)} 
                disabled={procesandoEstatus}
              ></button>
            </div>
            <div className="p-4 text-white">
              <div className="text-center mb-4">
                <p className="text-white-50 fw-bold mb-1">Total a cobrar al atleta:</p>
                <h2 className="text-success fw-bold mb-0">${ventaACobrar.totalVenta.toFixed(2)}</h2>
              </div>
              
              <div className="mb-4">
                <label className="form-label text-white-50 fw-bold">¿Con qué método pagó en recepción?</label>
                <select 
                  className="form-select bg-dark text-white border-secondary"
                  value={metodoCobro}
                  onChange={e => setMetodoCobro(e.target.value)}
                >
                  <option value="Efectivo en Recepción">Efectivo en Recepción</option>
                  <option value="Tarjeta en Recepción">Tarjeta en Recepción</option>
                  <option value="Transferencia">Transferencia</option>
                </select>
              </div>

              <div className="alert alert-warning py-3 mb-4 d-flex align-items-center gap-3" style={{fontSize:'0.85rem'}}>
                  <i className="fas fa-info-circle fs-5 flex-shrink-0"></i>
                  <span>
                    El pedido se marcará como <strong>{estatusObjetivoCobro}</strong>. {estatusObjetivoCobro === 'Completada' ? 'La deuda quedará saldada y se sumará al ingreso general.' : 'Estará a la espera de que el producto llegue al Box.'}
                  </span>
              </div>

              <button 
                className="btn btn-success w-100 fw-bold py-2"
                onClick={() => {
                  actualizarEstatus(ventaACobrar.idVenta, estatusObjetivoCobro, metodoCobro);
                }}
                disabled={procesandoEstatus}
              >
                {procesandoEstatus ? <span className="spinner-border spinner-border-sm me-2"></span> : <i className="fas fa-check-circle me-2"></i>}
                Confirmar Pago y Avanzar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Configurar Reporte PDF */}
      {modalReporteOpen && (
        <div 
          onClick={() => setModalReporteOpen(false)} 
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
              border: '1px solid rgba(220,53,69,0.25)', 
              boxShadow: '0 12px 40px rgba(0,0,0,0.8)',
              borderRadius: '12px', overflow: 'hidden'
            }}
          >
            <div className="p-3 border-bottom border-secondary d-flex justify-content-between align-items-center">
              <h5 className="mb-0 text-white"><i className="fas fa-file-pdf text-danger me-2"></i>Configurar Reporte</h5>
              <button className="btn-close btn-close-white" onClick={() => setModalReporteOpen(false)}></button>
            </div>
            <div className="p-4 text-white">
              <div className="mb-3">
                <label className="form-label text-white-50 fw-bold">Periodo a Exportar</label>
                <select 
                  className="form-select bg-dark text-white border-secondary"
                  value={reporteFiltroPeriodo}
                  onChange={e => setReporteFiltroPeriodo(e.target.value)}
                >
                  <option value="Hoy">Hoy</option>
                  <option value="Esta Semana">Esta Semana</option>
                  <option value="Este Mes">Este Mes</option>
                  <option value="Este Año">Este Año</option>
                  <option value="Todo el Historial">Todo el Historial</option>
                  <option value="Personalizado">Personalizado...</option>
                </select>
              </div>

              {reporteFiltroPeriodo === 'Personalizado' && (
                <div className="row g-2 mb-3">
                    <div className="col-6">
                        <label className="form-label text-white-50 small">Desde</label>
                        <input type="date" className="form-control bg-dark text-white border-secondary" value={reporteFechaInicio} onChange={e => setReporteFechaInicio(e.target.value)} />
                    </div>
                    <div className="col-6">
                        <label className="form-label text-white-50 small">Hasta</label>
                        <input type="date" className="form-control bg-dark text-white border-secondary" value={reporteFechaFin} onChange={e => setReporteFechaFin(e.target.value)} />
                    </div>
                </div>
              )}
              
              <div className="mb-4">
                <label className="form-label text-white-50 fw-bold">Tipo de Transacciones</label>
                <select 
                  className="form-select bg-dark text-white border-secondary"
                  value={reporteTipo}
                  onChange={e => setReporteTipo(e.target.value)}
                >
                  <option value="Todo">Todas las Transacciones</option>
                  <option value="Ingresos">Solo Ingresos Confirmados</option>
                  <option value="Pendientes">Solo Pendientes por Cobrar</option>
                </select>
              </div>

              <div className="alert alert-secondary py-2 mb-4" style={{fontSize:'0.8rem', backgroundColor: 'rgba(255,255,255,0.05)', border: 'none', color: '#aaa'}}>
                  <i className="fas fa-info-circle me-2"></i>
                  El PDF agrupará la información exacta para el periodo que selecciones, ignorando los filtros de la pantalla.
              </div>

              <button 
                className="btn btn-danger w-100 fw-bold py-2"
                onClick={generarReporteVentasPDF}
                disabled={reporteFiltroPeriodo === 'Personalizado' && (!reporteFechaInicio || !reporteFechaFin)}
              >
                <i className="fas fa-download me-2"></i> Descargar PDF
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
