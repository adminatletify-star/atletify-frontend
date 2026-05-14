import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { VENTAS_ENDPOINT } from '../services/api';
import BackButton from '../components/BackButton';
import RedGrayDatePicker from '../components/RedGrayDatePicker';
import AtletifyLoader from '../components/AtletifyLoader';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import '../assets/css/HistorialVentas.css';

const PERIODO_OPCIONES = [
  { value: 'Hoy',               icon: 'fa-sun',           label: 'Hoy',                desc: 'Solo ventas de hoy',              color: '#f59e0b' },
  { value: 'Esta Semana',       icon: 'fa-calendar-week', label: 'Esta Semana',         desc: 'Lunes hasta hoy',                 color: '#3b82f6' },
  { value: 'Este Mes',          icon: 'fa-calendar-alt',  label: 'Este Mes',            desc: 'Mes en curso',                    color: '#8b5cf6' },
  { value: 'Este Año',          icon: 'fa-calendar',      label: 'Este Año',            desc: 'Año en curso',                    color: '#10b981' },
  { value: 'Todo el Historial', icon: 'fa-history',       label: 'Todo el Historial',   desc: 'Desde el inicio',                 color: '#4FC3F7' },
  { value: 'Personalizado',     icon: 'fa-sliders-h',     label: 'Personalizado…',      desc: 'Elige un rango de fechas',        color: '#E63946' },
];

const TIPO_OPCIONES = [
  { value: 'Todo',       icon: 'fa-list',         label: 'Todas las Transacciones',   desc: 'Ventas, abonos y pendientes', color: '#4FC3F7' },
  { value: 'Ingresos',   icon: 'fa-check-circle', label: 'Solo Ingresos Confirmados', desc: 'Ventas ya cobradas',          color: '#10b981' },
  { value: 'Pendientes', icon: 'fa-clock',        label: 'Solo Pendientes',           desc: 'Pedidos sin cobrar',          color: '#f59e0b' },
];

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
  const [pickerPeriodoOpen, setPickerPeriodoOpen] = useState(false);
  const [pickerTipoOpen, setPickerTipoOpen] = useState(false);

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

  const periodoOp = PERIODO_OPCIONES.find(o => o.value === reporteFiltroPeriodo) || PERIODO_OPCIONES[0];
  const tipoOp    = TIPO_OPCIONES.find(o => o.value === reporteTipo) || TIPO_OPCIONES[0];

  return (
    <div className="hv-page">

      {/* ── HEADER ── */}
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

        {/* ── TABS ── */}
        <div className="hv-tabs-bar d-print-none">
          {[
            { id: 'todas',        icon: 'fa-list',          label: 'Historial General'  },
            { id: 'pendientes',   icon: 'fa-clock',         label: 'Por Cobrar'         },
            { id: 'por-entregar', icon: 'fa-truck-loading', label: 'Por Entregar'       },
            { id: 'listos',       icon: 'fa-box-open',      label: 'Listos'             },
            { id: 'canceladas',   icon: 'fa-ban',           label: 'Cancelados'         },
          ].map(tab => (
            <button
              key={tab.id}
              className={`hv-tab hv-tab--${tab.id}${tabActual === tab.id ? ' hv-tab--active' : ''}`}
              onClick={() => setTabActual(tab.id)}
            >
              <i className={`fas ${tab.icon}`}></i>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="hv-loading"><AtletifyLoader /></div>
        ) : (
          <>
            {/* ── ANALÍTICAS (solo Historial General) ── */}
            {tabActual === 'todas' && (
              <div className="mb-4">

                {/* Stats */}
                <div className="row g-3 mb-3">
                  <div className="col-6 col-xl-3">
                    <div className="hv-stat-card hv-stat-card--green">
                      <i className="fas fa-info-circle hv-stat-info-icon" title="Suma de ventas ya cobradas o entregadas." />
                      <p className="hv-stat-label">Ingreso {fechaFiltro ? 'del Día' : 'Histórico'}</p>
                      <p className="hv-stat-value">${totalIngreso.toFixed(2)}</p>
                      <span className="hv-stat-hint">Ventas cobradas</span>
                    </div>
                  </div>
                  <div className="col-6 col-xl-3">
                    <div className="hv-stat-card hv-stat-card--warning">
                      <i className="fas fa-info-circle hv-stat-info-icon" title="Pedidos reservados sin cobrar aún." />
                      <p className="hv-stat-label">Pendiente de Cobro</p>
                      <p className="hv-stat-value">${pendienteDeCobro.toFixed(2)}</p>
                      <span className="hv-stat-hint">Sin cobrar aún</span>
                    </div>
                  </div>
                  <div className="col-6 col-xl-3">
                    <div className="hv-stat-card hv-stat-card--blue">
                      <i className="fas fa-info-circle hv-stat-info-icon" title="Ventas en crédito restando abonos." />
                      <p className="hv-stat-label">Deuda (Fiados)</p>
                      <p className="hv-stat-value">${deudaFiado.toFixed(2)}</p>
                      <span className="hv-stat-hint">Crédito autorizado</span>
                    </div>
                  </div>
                  <div className="col-6 col-xl-3">
                    <div className="hv-stat-card hv-stat-card--cool">
                      <i className="fas fa-info-circle hv-stat-info-icon" title="Porcentaje del volumen total vendido en modalidad Sobre Pedido." />
                      <p className="hv-stat-label">Sobre Pedido</p>
                      <p className="hv-stat-value">{porcentajeSobrePedido}%</p>
                      <span className="hv-stat-hint">del volumen vendido</span>
                    </div>
                  </div>
                </div>

                {/* Gráficas */}
                <div className="row g-3 mb-3">
                  <div className="col-12 col-lg-8">
                    <div className="hv-chart-card">
                      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                        <p className="hv-chart-title mb-0">
                          <i className="fas fa-chart-bar" style={{ color: 'var(--primary)' }}></i>
                          Historial de Ventas
                        </p>
                        <div className="hv-escala-wrap">
                          {[
                            { id: 'diario',  label: 'Diario'  },
                            { id: 'semanal', label: 'Semana'  },
                            { id: 'mensual', label: 'Mes'     },
                            { id: 'anual',   label: 'Año'     },
                          ].map(e => (
                            <button
                              key={e.id}
                              className={`hv-escala-btn${escalaTiempo === e.id ? ' hv-escala-btn--active' : ''}`}
                              onClick={() => setEscalaTiempo(e.id)}
                            >
                              {e.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      {chartVentasDiarias.length > 0 ? (
                        <div style={{ width: '100%', height: 280 }}>
                          <ResponsiveContainer>
                            <BarChart data={chartVentasDiarias} margin={{ top: 20, right: 16, left: 0, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                              <XAxis dataKey="name" stroke="#555" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                              <YAxis stroke="#555" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickFormatter={v => `$${v}`} />
                              <Tooltip
                                cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                                contentStyle={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '10px' }}
                                itemStyle={{ color: 'var(--success)', fontWeight: 'bold' }}
                                formatter={v => [`$${v.toFixed(2)}`, 'Ingreso']}
                              />
                              <ReferenceLine y={promedioDiario} stroke="var(--accent)" strokeDasharray="4 4" label={{ position: 'top', value: `Prom: $${promedioDiario.toFixed(0)}`, fill: 'var(--accent)', fontSize: 11 }} />
                              <Bar dataKey="Total" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <div className="hv-chart-empty">Sin datos suficientes para graficar.</div>
                      )}
                    </div>
                  </div>

                  <div className="col-12 col-lg-4">
                    <div className="hv-chart-card">
                      <p className="hv-chart-title mb-3">
                        <i className="fas fa-chart-pie" style={{ color: 'var(--success)' }}></i>
                        Métodos de Pago
                      </p>
                      {chartMetodosPago.length > 0 ? (
                        <div style={{ width: '100%', height: 280 }}>
                          <ResponsiveContainer>
                            <PieChart>
                              <Pie data={chartMetodosPago} cx="50%" cy="45%" innerRadius={55} outerRadius={75} paddingAngle={5} dataKey="value">
                                {chartMetodosPago.map((_, index) => (
                                  <Cell key={`cell-${index}`} fill={COLORS_PAGO[index % COLORS_PAGO.length]} />
                                ))}
                              </Pie>
                              <Tooltip
                                contentStyle={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '10px' }}
                                itemStyle={{ color: '#fff' }}
                                formatter={(v, name) => [`$${v.toFixed(2)}`, name]}
                              />
                              <Legend wrapperStyle={{ fontSize: '0.75rem', paddingTop: '8px' }} />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <div className="hv-chart-empty">Sin ingresos registrados.</div>
                      )}
                    </div>
                  </div>

                  <div className="col-12">
                    <div className="hv-chart-card">
                      <p className="hv-chart-title mb-3">
                        <i className="fas fa-funnel-dollar" style={{ color: 'var(--accent-cool)' }}></i>
                        Embudo de Logística — Pedidos en Proceso
                      </p>
                      {chartEmbudo.some(e => e.Cantidad > 0) ? (
                        <div style={{ width: '100%', height: 210 }}>
                          <ResponsiveContainer>
                            <BarChart data={chartEmbudo} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
                              <XAxis type="number" stroke="#555" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} allowDecimals={false} />
                              <YAxis type="category" dataKey="name" stroke="#555" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} width={155} />
                              <Tooltip
                                contentStyle={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '10px' }}
                                itemStyle={{ color: '#fff' }}
                                cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                              />
                              <Bar dataKey="Cantidad" radius={[0, 6, 6, 0]}>
                                {chartEmbudo.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.fill} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <div className="hv-chart-empty">Todos los pedidos han sido entregados o no hay pedidos activos.</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── FILTROS ── */}
            <div className="hv-filtros-panel d-print-none">
              <div className="row g-2 align-items-center">
                <div className="col-auto">
                  <button className="hv-action-btn hv-action-btn--refresh" onClick={cargarVentas} title="Refrescar">
                    <i className="fas fa-sync-alt"></i>
                  </button>
                </div>
                <div className="col">
                  <div className="hv-search-wrap mb-0">
                    <span className="hv-search-icon"><i className="fas fa-search"></i></span>
                    <input
                      className="hv-search-input w-100"
                      placeholder="Buscar por producto o fecha..."
                      value={buscar}
                      onChange={e => setBuscar(e.target.value)}
                    />
                  </div>
                </div>
                <div className="col-auto">
                  <div className="d-flex align-items-center gap-2">
                    <RedGrayDatePicker value={fechaFiltro} onChange={setFechaFiltro} placeholder="Filtrar día" />
                    {fechaFiltro && (
                      <button className="hv-clear-date-btn" onClick={() => setFechaFiltro('')} title="Quitar filtro">
                        <i className="fas fa-times"></i>
                      </button>
                    )}
                  </div>
                </div>
                <div className="col-12 col-sm-auto d-flex gap-2 flex-wrap">
                  <button className="hv-pdf-btn" onClick={() => setModalReporteOpen(true)}>
                    <i className="fas fa-file-pdf"></i>
                    <span>Reporte PDF</span>
                  </button>
                  <button className="hv-pdf-btn hv-pdf-btn--proveedor" onClick={generarListaComprasPDF}>
                    <i className="fas fa-clipboard-list"></i>
                    <span>Lista Proveedor</span>
                  </button>
                </div>
              </div>
            </div>

            {/* ── LISTA ── */}
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
                      <span className="hv-dia-badge">{items.length} movimiento{items.length !== 1 ? 's' : ''}</span>
                    </div>

                    <div className="d-flex flex-column gap-2">
                      {items.map(t => {
                        const isVenta = t.tipo === 'Venta';
                        const v = isVenta ? t.datos : t.datos.ventaRelacionada;
                        const a = isVenta ? null : t.datos;

                        return (
                          <div key={t.idUnico} className={`hv-venta-card${!isVenta ? ' hv-venta-card--abono' : ''}`}>
                            <div className="hv-venta-header" onClick={() => setExpandido(expandido === t.idUnico ? null : t.idUnico)}>
                              <div className="d-flex align-items-center gap-3">
                                <div className={`hv-venta-icono${!isVenta ? ' hv-venta-icono--abono' : ''}`}>
                                  <i className={`fas ${isVenta ? 'fa-receipt' : 'fa-money-bill-wave'}`}></i>
                                </div>
                                <div>
                                  <p className="hv-venta-id">
                                    {isVenta ? `Venta #${v.idVenta}` : 'Abono a Deuda'}
                                    <span className={`badge ${v.usuarioNombre === 'Mostrador' ? 'bg-secondary' : 'bg-info text-dark'}`} style={{ fontSize: '0.62rem' }}>
                                      <i className={`fas ${v.usuarioNombre === 'Mostrador' ? 'fa-store' : 'fa-user'} me-1`}></i>
                                      {v.usuarioNombre}
                                    </span>
                                  </p>
                                  <p className="hv-venta-fecha">
                                    <i className="fas fa-clock"></i>
                                    {formatFecha(t.fecha)}
                                    {!isVenta && <span className="hv-abono-tag ms-2"><i className="fas fa-handshake me-1"></i>Abono de Fiado</span>}
                                  </p>
                                </div>
                              </div>
                              <div className="d-flex align-items-center gap-3">
                                <div className="text-end">
                                  <p className={`hv-venta-total${!isVenta ? ' hv-venta-total--abono' : ''}`}>
                                    ${parseFloat(isVenta ? v.totalVenta : a.monto).toFixed(2)}
                                  </p>
                                  {isVenta ? (
                                    v.estatus && (
                                      <span className={`hv-estatus-badge hv-estatus-${
                                        v.estatus === 'Pendiente' ? 'warning' :
                                        v.estatus === 'Cancelada' ? 'danger' :
                                        v.estatus.includes('Fiado') ? 'blue' :
                                        (v.estatus === 'Pagado y Listo' || v.estatus === 'Listo para Recoger') ? 'info' :
                                        'success'
                                      }`}>
                                        {v.estatus.includes('Fiado') ? <><i className="fas fa-handshake me-1"></i>{v.estatus}</> : v.estatus}
                                      </span>
                                    )
                                  ) : (
                                    <span className="hv-estatus-badge hv-estatus-blue">
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
                                  <div className="hv-abono-detalle mb-4">
                                    <p className="hv-abono-detalle__title"><i className="fas fa-info-circle me-2"></i>Detalle del Abono</p>
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
                                          <button className="btn btn-sm btn-outline-info" onClick={(e) => { e.stopPropagation(); setImgAbierta(a.comprobanteBase64); }}>
                                            <i className="fas fa-image me-1"></i>Ver Imagen
                                          </button>
                                        ) : (
                                          <span className="text-muted">— Ninguno —</span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                )}

                                <p className="hv-detalle-seccion-title">
                                  <i className="fas fa-shopping-basket me-2" style={{ color: 'var(--accent-cool)' }}></i>
                                  {isVenta ? 'Artículos de la venta' : 'Productos de la Deuda Original'}
                                </p>
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
                                            {d.producto?.esSobrePedido && <span className="badge bg-warning text-dark ms-2" style={{ fontSize: '0.6rem' }}>Pedido</span>}
                                          </td>
                                          <td className="hv-detalle-precio text-end">${parseFloat(d.precioUnitario).toFixed(2)}</td>
                                          <td className="hv-detalle-cell text-center"><span className="hv-detalle-cant">{d.cantidad}</span></td>
                                          <td className="hv-detalle-subtotal text-end">${parseFloat(d.subtotal).toFixed(2)}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>

                                {isVenta && v.metodoPago !== 'Fiado' && (
                                  <div className="hv-metodo-pago-row">
                                    <span className="hv-metodo-pago-label">Método de pago:</span>
                                    <span className="hv-metodo-pago-badge">
                                      <i className={`fas ${v.metodoPago === 'Efectivo' || v.metodoPago === 'Efectivo en Recepción' ? 'fa-money-bill-wave text-success' : v.metodoPago?.includes('Tarjeta') ? 'fa-credit-card text-info' : v.metodoPago?.includes('Transferencia') ? 'fa-university text-primary' : 'fa-laptop text-warning'} me-2`}></i>
                                      {v.metodoPago || 'Efectivo'}
                                    </span>
                                  </div>
                                )}

                                {isVenta && (
                                  <div className="hv-acciones-admin">
                                    {v.estatus === 'Pendiente' && v.metodoPago !== 'Fiado' && (
                                      <>
                                        <button className="hv-btn-accion hv-btn-accion--danger" onClick={(e) => { e.stopPropagation(); actualizarEstatus(v.idVenta, 'Cancelada'); }}>
                                          <i className="fas fa-ban me-1"></i>Cancelar
                                        </button>
                                        <button className="hv-btn-accion hv-btn-accion--warning" onClick={(e) => { e.stopPropagation(); setVentaACobrar(v); setEstatusObjetivoCobro('Pagado (Pendiente Entrega)'); setModalCobrarOpen(true); }}>
                                          <i className="fas fa-cash-register me-2"></i>Cobrar Pedido
                                        </button>
                                      </>
                                    )}
                                    {v.estatus === 'Pagado (Pendiente Entrega)' && (
                                      <>
                                        <button className="hv-btn-accion hv-btn-accion--danger" onClick={(e) => { e.stopPropagation(); actualizarEstatus(v.idVenta, 'Cancelada'); }}>
                                          <i className="fas fa-ban me-1"></i>Cancelar
                                        </button>
                                        <button className="hv-btn-accion hv-btn-accion--info" onClick={(e) => { e.stopPropagation(); actualizarEstatus(v.idVenta, 'Pagado y Listo'); }}>
                                          <i className="fas fa-box-open me-2"></i>Marcar Listo
                                        </button>
                                      </>
                                    )}
                                    {(v.estatus === 'Pagado y Listo' || v.estatus === 'Listo para Recoger') && (
                                      <button className="hv-btn-accion hv-btn-accion--success" onClick={(e) => { e.stopPropagation(); actualizarEstatus(v.idVenta, 'Completada'); }}>
                                        <i className="fas fa-check-double me-2"></i>Entregar al Atleta
                                      </button>
                                    )}
                                    {(v.estatus === 'Fiado' || v.estatus === 'Fiado (Entregado)') && (
                                      <>
                                        <button className="hv-btn-accion hv-btn-accion--success" onClick={(e) => { e.stopPropagation(); setVentaACobrar(v); setEstatusObjetivoCobro('Completada'); setModalCobrarOpen(true); }}>
                                          <i className="fas fa-cash-register me-2"></i>Liquidar Deuda
                                        </button>
                                        {v.estatus === 'Fiado' && (
                                          <button className="hv-btn-accion hv-btn-accion--blue" onClick={(e) => { e.stopPropagation(); actualizarEstatus(v.idVenta, 'Fiado (Entregado)'); }}>
                                            <i className="fas fa-handshake me-2"></i>Marcar Entregado
                                          </button>
                                        )}
                                      </>
                                    )}
                                    {v.estatus === 'Cancelada' && (
                                      <button className="hv-btn-accion hv-btn-accion--secondary" onClick={(e) => { e.stopPropagation(); actualizarEstatus(v.idVenta, 'Pendiente'); }}>
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

      {/* ── LIGHTBOX ── */}
      {imgAbierta && (
        <div
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.92)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setImgAbierta(null)}
        >
          <img src={imgAbierta} alt="Comprobante" style={{ maxWidth: '90%', maxHeight: '90%', borderRadius: '10px' }} />
          <button
            style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '50%', width: '38px', height: '38px', color: '#fff', cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onClick={() => setImgAbierta(null)}
          >
            <i className="fas fa-times"></i>
          </button>
        </div>
      )}

      {/* ── MODAL COBRAR ── */}
      {modalCobrarOpen && ventaACobrar && createPortal(
        <div className="hv-modal-overlay" onClick={() => !procesandoEstatus && setModalCobrarOpen(false)}>
          <div className="hv-modal" onClick={e => e.stopPropagation()}>
            <div className="hv-modal__header">
              <div>
                <p className="hv-modal__supertitle">PEDIDO</p>
                <h2 className="hv-modal__title">Confirmar Cobro</h2>
              </div>
              <button className="hv-modal__close" onClick={() => setModalCobrarOpen(false)} disabled={procesandoEstatus} aria-label="Cerrar">
                <i className="fas fa-times" />
              </button>
            </div>

            <div className="text-center mb-4">
              <p className="hv-modal__hint mb-1">Total a cobrar al atleta:</p>
              <p className="hv-modal__monto">${ventaACobrar.totalVenta.toFixed(2)}</p>
            </div>

            <div className="mb-4">
              <label className="etiqueta-campo">¿Con qué método pagó?</label>
              <select className="entrada-oscura" value={metodoCobro} onChange={e => setMetodoCobro(e.target.value)}>
                <option value="Efectivo en Recepción">Efectivo en Recepción</option>
                <option value="Tarjeta en Recepción">Tarjeta en Recepción</option>
                <option value="Transferencia">Transferencia</option>
              </select>
            </div>

            <div className="hv-modal__alerta mb-4">
              <i className="fas fa-info-circle flex-shrink-0"></i>
              <span>El pedido pasará a <strong>{estatusObjetivoCobro}</strong>. {estatusObjetivoCobro === 'Completada' ? 'La deuda quedará saldada.' : 'Estará en espera de entrega.'}</span>
            </div>

            <button
              className="hv-btn-accion hv-btn-accion--success w-100"
              onClick={() => actualizarEstatus(ventaACobrar.idVenta, estatusObjetivoCobro, metodoCobro)}
              disabled={procesandoEstatus}
            >
              {procesandoEstatus ? <span className="spinner-border spinner-border-sm me-2"></span> : <i className="fas fa-check-circle me-2"></i>}
              Confirmar Pago y Avanzar
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* ── MODAL REPORTE PDF ── */}
      {modalReporteOpen && createPortal(
        <div className="hv-modal-overlay" onClick={() => setModalReporteOpen(false)}>
          <div className="hv-modal" onClick={e => e.stopPropagation()}>
            <div className="hv-modal__header">
              <div>
                <p className="hv-modal__supertitle">EXPORTAR</p>
                <h2 className="hv-modal__title">Configurar Reporte PDF</h2>
              </div>
              <button className="hv-modal__close" onClick={() => setModalReporteOpen(false)} aria-label="Cerrar">
                <i className="fas fa-times" />
              </button>
            </div>

            <div className="mb-3">
              <label className="etiqueta-campo">Periodo a Exportar</label>
              <button type="button" className="hv-selector-btn" onClick={() => setPickerPeriodoOpen(true)}>
                <span className="hv-selector-btn__left">
                  <span className="hv-selector-btn__icon" style={{ color: periodoOp.color }}><i className={`fas ${periodoOp.icon}`}></i></span>
                  <span className="hv-selector-btn__label">{periodoOp.label}</span>
                </span>
                <i className="fas fa-chevron-down hv-selector-btn__arrow"></i>
              </button>
            </div>

            {reporteFiltroPeriodo === 'Personalizado' && (
              <div className="row g-2 mb-3">
                <div className="col-6">
                  <label className="etiqueta-campo">Desde</label>
                  <input type="date" className="entrada-oscura" value={reporteFechaInicio} onChange={e => setReporteFechaInicio(e.target.value)} />
                </div>
                <div className="col-6">
                  <label className="etiqueta-campo">Hasta</label>
                  <input type="date" className="entrada-oscura" value={reporteFechaFin} onChange={e => setReporteFechaFin(e.target.value)} />
                </div>
              </div>
            )}

            <div className="mb-4">
              <label className="etiqueta-campo">Tipo de Transacciones</label>
              <button type="button" className="hv-selector-btn" onClick={() => setPickerTipoOpen(true)}>
                <span className="hv-selector-btn__left">
                  <span className="hv-selector-btn__icon" style={{ color: tipoOp.color }}><i className={`fas ${tipoOp.icon}`}></i></span>
                  <span className="hv-selector-btn__label">{tipoOp.label}</span>
                </span>
                <i className="fas fa-chevron-down hv-selector-btn__arrow"></i>
              </button>
            </div>

            <div className="hv-modal__alerta hv-modal__alerta--muted mb-4">
              <i className="fas fa-info-circle flex-shrink-0"></i>
              <span>El PDF agrupará la información del periodo seleccionado, ignorando los filtros de pantalla.</span>
            </div>

            <button
              className="hv-btn-accion hv-btn-accion--danger w-100"
              onClick={generarReporteVentasPDF}
              disabled={reporteFiltroPeriodo === 'Personalizado' && (!reporteFechaInicio || !reporteFechaFin)}
            >
              <i className="fas fa-download me-2"></i>Descargar PDF
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* ── PICKER: Periodo a Exportar ── */}
      {pickerPeriodoOpen && createPortal(
        <div className="hv-picker-overlay" onClick={() => setPickerPeriodoOpen(false)}>
          <div className="hv-picker-modal" onClick={e => e.stopPropagation()}>
            <div className="hv-picker-modal__header">
              <div>
                <p className="hv-picker-modal__supertitle">REPORTE PDF</p>
                <h3 className="hv-picker-modal__title">Periodo a Exportar</h3>
              </div>
              <button className="hv-modal__close" onClick={() => setPickerPeriodoOpen(false)} aria-label="Cerrar">
                <i className="fas fa-times" />
              </button>
            </div>
            <ul className="hv-picker-list">
              {PERIODO_OPCIONES.map(op => (
                <li
                  key={op.value}
                  className={`hv-picker-opcion${reporteFiltroPeriodo === op.value ? ' hv-picker-opcion--activo' : ''}`}
                  style={{ '--picker-color': op.color }}
                  onClick={() => { setReporteFiltroPeriodo(op.value); setPickerPeriodoOpen(false); }}
                >
                  <span className="hv-picker-opcion__icon"><i className={`fas ${op.icon}`}></i></span>
                  <span className="hv-picker-opcion__info">
                    <span className="hv-picker-opcion__label">{op.label}</span>
                    <span className="hv-picker-opcion__desc">{op.desc}</span>
                  </span>
                  {reporteFiltroPeriodo === op.value && <i className="fas fa-check hv-picker-opcion__check"></i>}
                </li>
              ))}
            </ul>
          </div>
        </div>,
        document.body
      )}

      {/* ── PICKER: Tipo de Transacciones ── */}
      {pickerTipoOpen && createPortal(
        <div className="hv-picker-overlay" onClick={() => setPickerTipoOpen(false)}>
          <div className="hv-picker-modal" onClick={e => e.stopPropagation()}>
            <div className="hv-picker-modal__header">
              <div>
                <p className="hv-picker-modal__supertitle">REPORTE PDF</p>
                <h3 className="hv-picker-modal__title">Tipo de Transacciones</h3>
              </div>
              <button className="hv-modal__close" onClick={() => setPickerTipoOpen(false)} aria-label="Cerrar">
                <i className="fas fa-times" />
              </button>
            </div>
            <ul className="hv-picker-list">
              {TIPO_OPCIONES.map(op => (
                <li
                  key={op.value}
                  className={`hv-picker-opcion${reporteTipo === op.value ? ' hv-picker-opcion--activo' : ''}`}
                  style={{ '--picker-color': op.color }}
                  onClick={() => { setReporteTipo(op.value); setPickerTipoOpen(false); }}
                >
                  <span className="hv-picker-opcion__icon"><i className={`fas ${op.icon}`}></i></span>
                  <span className="hv-picker-opcion__info">
                    <span className="hv-picker-opcion__label">{op.label}</span>
                    <span className="hv-picker-opcion__desc">{op.desc}</span>
                  </span>
                  {reporteTipo === op.value && <i className="fas fa-check hv-picker-opcion__check"></i>}
                </li>
              ))}
            </ul>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
