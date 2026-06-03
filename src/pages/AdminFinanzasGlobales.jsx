import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import BackButton from '../components/BackButton';
import AtletifyLoader from '../components/AtletifyLoader';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import '../assets/css/AdminFinanzasGlobales.css';

const API_BASE = `${import.meta.env.VITE_API_URL}/api/finanzas-globales`;

export default function AdminFinanzasGlobales() {
  const navigate = useNavigate();
  const [box, setBox] = useState(null);
  const [loading, setLoading] = useState(true);
  const [resumen, setResumen] = useState(null);
  const [egresos, setEgresos] = useState([]);
  const [ingresos, setIngresos] = useState([]);
  const [dashboardData, setDashboardData] = useState(null);
  
  const [pestaña, setPestaña] = useState('dashboard');
  const tabRefs = useRef({});
  const [sliderStyle, setSliderStyle] = useState(null);

  useLayoutEffect(() => {
    const el = tabRefs.current[pestaña];
    if (el) setSliderStyle({ left: el.offsetLeft, width: el.offsetWidth });
  }, [pestaña]);

  // Filtros
  const [periodo, setPeriodo] = useState('Mensual'); // Diario, Semanal, Mensual, Anual
  const [fechaReferencia, setFechaReferencia] = useState(new Date());

  const moverFecha = (direccion) => {
    const nuevaFecha = new Date(fechaReferencia);
    if (periodo === 'Diario') {
      nuevaFecha.setDate(nuevaFecha.getDate() + (direccion === 'prev' ? -1 : 1));
    } else if (periodo === 'Semanal') {
      nuevaFecha.setDate(nuevaFecha.getDate() + (direccion === 'prev' ? -7 : 7));
    } else if (periodo === 'Mensual') {
      nuevaFecha.setMonth(nuevaFecha.getMonth() + (direccion === 'prev' ? -1 : 1));
    } else if (periodo === 'Anual') {
      nuevaFecha.setFullYear(nuevaFecha.getFullYear() + (direccion === 'prev' ? -1 : 1));
    }
    setFechaReferencia(nuevaFecha);
  };

  const getFechasRango = () => {
    let inicio = new Date(fechaReferencia);
    let fin = new Date(fechaReferencia);
    
    if (periodo === 'Diario') {
      inicio.setHours(0, 0, 0, 0);
      fin.setHours(23, 59, 59, 999);
    } else if (periodo === 'Semanal') {
      const dia = inicio.getDay() || 7;
      inicio.setDate(inicio.getDate() - dia + 1);
      inicio.setHours(0, 0, 0, 0);
      fin = new Date(inicio);
      fin.setDate(inicio.getDate() + 6);
      fin.setHours(23, 59, 59, 999);
    } else if (periodo === 'Mensual') {
      inicio.setDate(1);
      inicio.setHours(0, 0, 0, 0);
      fin = new Date(inicio.getFullYear(), inicio.getMonth() + 1, 0, 23, 59, 59, 999);
    } else if (periodo === 'Anual') {
      inicio = new Date(inicio.getFullYear(), 0, 1, 0, 0, 0, 0);
      fin = new Date(inicio.getFullYear(), 11, 31, 23, 59, 59, 999);
    }
    // Aseguramos que se envía en formato ISO local al backend o usar toISOString para UTC
    // C# lo parsea mejor en ISO:
    return { fechaInicio: inicio.toISOString(), fechaFin: fin.toISOString() };
  };

  const formatearRangoFechas = () => {
    if (periodo === 'Diario') {
      return fechaReferencia.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase();
    } else if (periodo === 'Semanal') {
      const { fechaInicio, fechaFin } = getFechasRango();
      const fI = new Date(fechaInicio);
      const fF = new Date(fechaFin);
      return `SEMANA DEL ${fI.getDate()} DE ${fI.toLocaleDateString('es-ES', { month: 'short' }).toUpperCase()} AL ${fF.getDate()} DE ${fF.toLocaleDateString('es-ES', { month: 'short' }).toUpperCase()} DE ${fF.getFullYear()}`;
    } else if (periodo === 'Mensual') {
      return fechaReferencia.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }).toUpperCase();
    } else if (periodo === 'Anual') {
      return `AÑO ${fechaReferencia.getFullYear()}`;
    }
  };

  // Formulario Egreso
  const [formEgreso, setFormEgreso] = useState({
    monto: '',
    categoria: 'Mantenimiento',
    notas: '',
    comprobanteUrl: ''
  });

  useEffect(() => {
    const b = JSON.parse(localStorage.getItem('box'));
    if (!b) { navigate('/login'); return; }
    setBox(b);
    const { fechaInicio, fechaFin } = getFechasRango();
    cargarDatos(b.idBox, fechaInicio, fechaFin);
  }, [navigate, periodo, fechaReferencia]);

  const cargarDatos = async (idBox, fInicio, fFin) => {
    setLoading(true);
    try {
      const headers = { 'Authorization': `Bearer ${localStorage.getItem('token')}` };
      const qs = `?fechaInicio=${encodeURIComponent(fInicio)}&fechaFin=${encodeURIComponent(fFin)}`;
      const [resResumen, resEgresos, resIngresos, resDashboard] = await Promise.all([
        fetch(`${API_BASE}/resumen/${idBox}${qs}`, { headers }),
        fetch(`${API_BASE}/egresos/${idBox}${qs}`, { headers }),
        fetch(`${API_BASE}/ingresos/${idBox}${qs}`, { headers }),
        fetch(`${import.meta.env.VITE_API_URL}/api/finanzas/dashboard/${idBox}`, { headers })
      ]);
      if (resResumen.ok) setResumen(await resResumen.json());
      if (resEgresos.ok) setEgresos(await resEgresos.json());
      if (resIngresos.ok) setIngresos(await resIngresos.json());
      if (resDashboard.ok) setDashboardData(await resDashboard.json());
    } catch (error) {
      console.error('Error al cargar finanzas globales', error);
    } finally {
      setLoading(false);
    }
  };

  const registrarEgreso = async (e) => {
    e.preventDefault();
    if (!formEgreso.monto || !formEgreso.categoria) return alert('Completa los campos requeridos.');

    try {
      const res = await fetch(`${API_BASE}/egresos`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          idBox: box.idBox,
          monto: parseFloat(formEgreso.monto),
          categoria: formEgreso.categoria,
          notas: formEgreso.notas,
          comprobanteUrl: formEgreso.comprobanteUrl,
          generadoPor: 'Admin'
        })
      });

      if (res.ok) {
        alert('Egreso registrado correctamente');
        setFormEgreso({ monto: '', categoria: 'Mantenimiento', notas: '', comprobanteUrl: '' });
        const { fechaInicio, fechaFin } = getFechasRango();
        cargarDatos(box.idBox, fechaInicio, fechaFin);
      } else {
        alert('Error al registrar egreso');
      }
    } catch (error) {
      alert('Error de conexión');
    }
  };

  const eliminarEgreso = async (id) => {
    if (!window.confirm('¿Seguro que deseas eliminar este registro de egreso?')) return;
    try {
      const res = await fetch(`${API_BASE}/egresos/${id}`, { 
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const { fechaInicio, fechaFin } = getFechasRango();
        cargarDatos(box.idBox, fechaInicio, fechaFin);
      } else {
        alert('Error al eliminar');
      }
    } catch (e) {
      alert('Error de conexión');
    }
  };

  // Colores para las gráficas
  const COLORS = ['#4fc3f7', '#2ecc71', '#f1c40f', '#e74c3c', '#9b59b6', '#e67e22', '#1abc9c'];
  
  const getBadgeClass = (categoria) => {
    const normalize = categoria.toLowerCase().replace(" ", "-");
    return `finanzas-globales-badge badge-${normalize}`;
  };

  const formatearDinero = (monto) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(monto || 0);
  };

  const generarReportePDF = () => {
    const doc = new jsPDF();
    const rangoFechas = formatearRangoFechas();
    const titulo = `Reporte Financiero - ${rangoFechas}`.toUpperCase();
    const nombreBox = box?.nombre || "Mi Box";
    
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();

    // ==========================================
    // 1. HEADER OSCURO "ATLETIFY SYSTEM"
    // ==========================================
    const dibujarHeader = () => {
      doc.setFillColor(20, 20, 20);
      doc.rect(0, 0, pageW, 28, 'F'); // Fondo oscuro
      
      doc.setFillColor(200, 30, 30);
      doc.rect(0, 28, pageW, 1.5, 'F'); // Línea roja inferior

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(15);
      doc.setFont('helvetica', 'bold');
      doc.text('ATLETIFY SYSTEM', 14, 11);

      doc.setFontSize(9);
      doc.setTextColor(200, 200, 200);
      doc.text(nombreBox, 14, 18);

      doc.setFontSize(7.5);
      doc.setTextColor(150, 150, 150);
      doc.text(`Generado: ${new Date().toLocaleString('es-MX')}`, 14, 24);
      
      doc.setTextColor(255, 180, 180);
      doc.setFontSize(9);
      doc.text(titulo, pageW - 14, 18, { align: 'right' });
    };

    dibujarHeader();

    // ==========================================
    // 2. RESUMEN GLOBAL (KPIs)
    // ==========================================
    let cursorY = 40;
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(40, 40, 40);
    doc.text("Resumen del Periodo", 14, cursorY);
    cursorY += 6;

    // Tarjetas de Resumen
    const cardW = (pageW - 36) / 3;
    const cardH = 18;
    
    // Ingresos
    doc.setFillColor(245, 255, 245);
    doc.setDrawColor(46, 204, 113);
    doc.roundedRect(14, cursorY, cardW, cardH, 2, 2, 'FD');
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text("INGRESOS TOTALES", 14 + (cardW/2), cursorY + 6, { align: 'center' });
    doc.setFontSize(12);
    doc.setTextColor(46, 204, 113);
    doc.text(formatearDinero(resumen?.totalIngresos), 14 + (cardW/2), cursorY + 14, { align: 'center' });

    // Egresos
    doc.setFillColor(255, 245, 245);
    doc.setDrawColor(231, 76, 60);
    doc.roundedRect(14 + cardW + 4, cursorY, cardW, cardH, 2, 2, 'FD');
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text("EGRESOS TOTALES", 14 + cardW + 4 + (cardW/2), cursorY + 6, { align: 'center' });
    doc.setFontSize(12);
    doc.setTextColor(231, 76, 60);
    doc.text(formatearDinero(resumen?.totalEgresos), 14 + cardW + 4 + (cardW/2), cursorY + 14, { align: 'center' });

    // Balance
    doc.setFillColor(245, 250, 255);
    doc.setDrawColor(41, 128, 185);
    doc.roundedRect(14 + (cardW * 2) + 8, cursorY, cardW, cardH, 2, 2, 'FD');
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text("BALANCE GENERAL", 14 + (cardW * 2) + 8 + (cardW/2), cursorY + 6, { align: 'center' });
    doc.setFontSize(12);
    doc.setTextColor(41, 128, 185);
    doc.text(formatearDinero(resumen?.balanceGeneral), 14 + (cardW * 2) + 8 + (cardW/2), cursorY + 14, { align: 'center' });

    cursorY += cardH + 12;

    // ==========================================
    // 3. TABLAS DE HISTORIAL
    // ==========================================

    // Historial Ingresos
    if (ingresos.length > 0) {
      doc.setFontSize(12);
      doc.setTextColor(46, 204, 113);
      doc.text("Historial de Ingresos", 14, cursorY);
      
      const tableDataIngresos = ingresos.map(i => [
        new Date(i.fecha).toLocaleDateString(),
        i.categoria,
        i.notas || 'Ingreso del sistema',
        `+${formatearDinero(i.monto)}`
      ]);

      autoTable(doc, {
        startY: cursorY + 4,
        head: [['Fecha', 'Categoría', 'Detalle', 'Monto']],
        body: tableDataIngresos,
        theme: 'striped',
        styles: { fontSize: 8, cellPadding: 2, textColor: [40, 40, 40], lineColor: [220, 220, 220], lineWidth: 0.1 },
        headStyles: { fillColor: [46, 204, 113], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'left' },
        alternateRowStyles: { fillColor: [248, 255, 248] },
        columnStyles: { 3: { halign: 'right', fontStyle: 'bold', textColor: [46, 180, 100] } },
        margin: { left: 14, right: 14 },
      });
      cursorY = doc.lastAutoTable.finalY + 12;
    }

    // Historial Egresos
    if (egresos.length > 0) {
      if (cursorY > pageH - 40) {
        doc.addPage();
        dibujarHeader();
        cursorY = 40;
      }
      doc.setFontSize(12);
      doc.setTextColor(231, 76, 60);
      doc.text("Historial de Egresos", 14, cursorY);
      
      const tableDataEgresos = egresos.map(e => [
        new Date(e.fechaEgreso).toLocaleDateString(),
        e.categoria,
        e.notas || 'Sin notas',
        `-${formatearDinero(e.monto)}`
      ]);

      autoTable(doc, {
        startY: cursorY + 4,
        head: [['Fecha', 'Categoría', 'Detalle', 'Monto']],
        body: tableDataEgresos,
        theme: 'striped',
        styles: { fontSize: 8, cellPadding: 2, textColor: [40, 40, 40], lineColor: [220, 220, 220], lineWidth: 0.1 },
        headStyles: { fillColor: [231, 76, 60], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'left' },
        alternateRowStyles: { fillColor: [255, 248, 248] },
        columnStyles: { 3: { halign: 'right', fontStyle: 'bold', textColor: [231, 60, 60] } },
        margin: { left: 14, right: 14 },
      });
    }

    // ==========================================
    // 4. FOOTER EN TODAS LAS PÁGINAS
    // ==========================================
    const totalPages = doc.internal.getNumberOfPages();
    for(let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setDrawColor(200, 200, 200);
      doc.line(14, pageH - 13, pageW - 14, pageH - 13);
      doc.setFontSize(7);
      doc.setTextColor(150);
      doc.text('Atletify System', 14, pageH - 8);
      doc.text(`Página ${i} de ${totalPages}`, pageW - 14, pageH - 8, { align: 'right' });
    }

    // Reemplazar espacios y comas para que sea un nombre de archivo válido y limpio
    const nombreArchivoSeguro = rangoFechas.replace(/ /g, '_').replace(/,/g, '');
    doc.save(`Reporte_Finanzas_${nombreArchivoSeguro}.pdf`);
  };

  return (
    <div className="finanzas-globales-container">
      <nav className="finanzas-globales-nav">
        <BackButton to="/admin-box-panel" />
        <div className="finanzas-globales-nav-icono"><i className="fas fa-globe-americas"></i></div>
        <h1 className="finanzas-globales-nav-titulo">Finanzas Globales</h1>
      </nav>

      <div className="container-xl py-4 px-3 px-md-4">
        
        {/* Filtros de Fecha */}
        <div className="d-flex align-items-center gap-4 mb-4 flex-wrap" style={{ backgroundColor: 'rgba(25,25,30,0.8)', padding: '12px 20px', borderRadius: '12px', border: '1px solid #333' }}>
          
          <div className="btn-group" role="group">
            {['Diario', 'Semanal', 'Mensual', 'Anual'].map(p => (
              <button 
                key={p} 
                className={`btn btn-sm fw-bold ${periodo === p ? 'btn-primary' : 'btn-outline-secondary'}`}
                onClick={() => setPeriodo(p)}
                style={{ borderRadius: '6px', margin: '0 4px', border: periodo === p ? 'none' : '1px solid #444', backgroundColor: periodo === p ? '#3498db' : 'transparent', color: periodo === p ? 'white' : '#aaa' }}
              >
                {p}
              </button>
            ))}
          </div>

          <div className="d-flex align-items-center gap-3 ms-md-auto">
            <button className="btn btn-sm text-secondary" onClick={() => moverFecha('prev')} style={{ fontSize: '1.2rem', padding: '0 10px', background: 'transparent', border: 'none' }}>
              <i className="fas fa-chevron-left"></i>
            </button>
            <div className="fw-bold text-white text-center" style={{ minWidth: '220px', fontSize: '1rem', letterSpacing: '0.5px' }}>
              {formatearRangoFechas()}
            </div>
            <button className="btn btn-sm text-secondary" onClick={() => moverFecha('next')} style={{ fontSize: '1.2rem', padding: '0 10px', background: 'transparent', border: 'none' }}>
              <i className="fas fa-chevron-right"></i>
            </button>
          </div>

          <div className="ms-auto">
            <button 
              className="btn btn-sm fw-bold text-white px-3 py-2 d-flex align-items-center gap-2" 
              style={{ backgroundColor: '#2ecc71', border: 'none', borderRadius: '8px' }}
              onClick={generarReportePDF}
              disabled={loading || !resumen}
            >
              <i className="fas fa-file-pdf"></i> Exportar PDF
            </button>
          </div>
          
        </div>

        <div className="finanzas-globales-tabs-wrapper mb-4">
          <div className="finanzas-globales-tabs">
            {sliderStyle && <div className="finanzas-globales-tab-slider" style={sliderStyle} />}
            <button ref={el => tabRefs.current['dashboard'] = el} className={`finanzas-globales-tab ${pestaña === 'dashboard' ? 'activo' : ''}`} onClick={() => setPestaña('dashboard')}><i className="fas fa-chart-line"></i> Dashboard</button>
            <button ref={el => tabRefs.current['ingresos'] = el} className={`finanzas-globales-tab ${pestaña === 'ingresos' ? 'activo' : ''}`} onClick={() => setPestaña('ingresos')}><i className="fas fa-hand-holding-usd"></i> Historial Ingresos</button>
            <button ref={el => tabRefs.current['egresos'] = el} className={`finanzas-globales-tab ${pestaña === 'egresos' ? 'activo' : ''}`} onClick={() => setPestaña('egresos')}><i className="fas fa-file-invoice-dollar"></i> Historial Egresos</button>
            <button ref={el => tabRefs.current['nuevo_egreso'] = el} className={`finanzas-globales-tab ${pestaña === 'nuevo_egreso' ? 'activo' : ''}`} onClick={() => setPestaña('nuevo_egreso')}><i className="fas fa-plus-circle"></i> Registrar Egreso</button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-5"><AtletifyLoader /></div>
        ) : (
          <>
            {/* TAB DASHBOARD */}
            {pestaña === 'dashboard' && resumen && (
              <>
                <div className="row g-3 mb-4">
                  <div className="col-12 col-md-4">
                    <div className="finanzas-globales-kpi-card" style={{ borderColor: 'rgba(46, 204, 113, 0.3)' }}>
                      <div className="finanzas-globales-kpi-title"><i className="fas fa-arrow-up text-success"></i> Ingresos Totales</div>
                      <div className="finanzas-globales-kpi-value ingresos">{formatearDinero(resumen.totalIngresos)}</div>
                    </div>
                  </div>
                  <div className="col-12 col-md-4">
                    <div className="finanzas-globales-kpi-card" style={{ borderColor: 'rgba(231, 76, 60, 0.3)' }}>
                      <div className="finanzas-globales-kpi-title"><i className="fas fa-arrow-down text-danger"></i> Egresos Totales</div>
                      <div className="finanzas-globales-kpi-value egresos">{formatearDinero(resumen.totalEgresos)}</div>
                    </div>
                  </div>
                  <div className="col-12 col-md-4">
                    <div className="finanzas-globales-kpi-card" style={{ borderColor: 'rgba(79, 195, 247, 0.3)' }}>
                      <div className="finanzas-globales-kpi-title"><i className="fas fa-balance-scale text-info"></i> Balance (Utilidad)</div>
                      <div className="finanzas-globales-kpi-value balance">{formatearDinero(resumen.balanceGeneral)}</div>
                    </div>
                  </div>
                  
                  {resumen.estadisticas && (
                    <>
                      <div className="col-12 col-md-4">
                        <Link to="/gestion-finanzas" state={{ fromTab: 'semaforo' }} style={{ textDecoration: 'none' }}>
                          <div className="finanzas-globales-kpi-card finanzas-globales-clickable-card" style={{ borderColor: 'rgba(46, 204, 113, 0.25)' }}>
                            <div className="finanzas-globales-kpi-title text-secondary"><i className="fas fa-users text-primary"></i> Mensualidades Activas</div>
                            <div className="finanzas-globales-kpi-value fs-4 text-white">
                              {dashboardData?.estadoAtletas?.alDia ?? 0} <span className="fs-6 text-secondary">atletas al día</span>
                            </div>
                          </div>
                        </Link>
                      </div>
                      <div className="col-12 col-md-4">
                        <div className="finanzas-globales-kpi-card" style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}>
                          <div className="finanzas-globales-kpi-title text-secondary"><i className="fas fa-shopping-bag text-warning"></i> Operaciones en Tienda</div>
                          <div className="finanzas-globales-kpi-value fs-4 text-white">{resumen.estadisticas.ventasTienda} <span className="fs-6 text-secondary">ventas/abonos</span></div>
                        </div>
                      </div>
                      <div className="col-12 col-md-4">
                        <div className="finanzas-globales-kpi-card" style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}>
                          <div className="finanzas-globales-kpi-title text-secondary"><i className="fas fa-plane-arrival text-purple"></i> Turistas / Drop-Ins</div>
                          <div className="finanzas-globales-kpi-value fs-4 text-white">{resumen.estadisticas.dropIns} <span className="fs-6 text-secondary">visitas</span></div>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <div className="row g-4 mb-4">
                  <div className="col-md-6">
                    <div className="finanzas-globales-card">
                      <div className="finanzas-globales-card-title"><i className="fas fa-chart-pie text-success"></i> Desglose de Ingresos</div>
                      <div className="finanzas-globales-chart-container">
                        {resumen.ingresosPorCategoria.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie data={resumen.ingresosPorCategoria} dataKey="total" nameKey="categoria" cx="50%" cy="50%" innerRadius={60} outerRadius={100}>
                                {resumen.ingresosPorCategoria.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                              </Pie>
                              <Tooltip formatter={(value) => formatearDinero(value)} contentStyle={{ backgroundColor: '#1e1e26', border: '1px solid #333' }} />
                              <Legend wrapperStyle={{ paddingTop: '10px' }} />
                            </PieChart>
                          </ResponsiveContainer>
                        ) : <div className="finanzas-globales-empty"><i className="fas fa-folder-open"></i><p>Sin ingresos este mes</p></div>}
                      </div>
                    </div>
                  </div>

                  <div className="col-md-6">
                    <div className="finanzas-globales-card">
                      <div className="finanzas-globales-card-title"><i className="fas fa-balance-scale text-info"></i> Balance del Periodo</div>
                      <div className="finanzas-globales-chart-container">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={[{ name: 'Periodo Actual', Ingresos: resumen.totalIngresos, Egresos: resumen.totalEgresos }]} margin={{ top: 15, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                            <XAxis dataKey="name" stroke="#ccc" />
                            <YAxis type="number" stroke="#ccc" tickFormatter={(value) => `$${value}`} />
                            <Tooltip formatter={(value) => formatearDinero(value)} cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{ backgroundColor: '#1e1e26', border: '1px solid #333', borderRadius: '8px' }} />
                            <Legend wrapperStyle={{ paddingTop: '10px' }} />
                            <Bar dataKey="Ingresos" fill="#2ecc71" radius={[4, 4, 0, 0]} barSize={60} />
                            <Bar dataKey="Egresos" fill="#e74c3c" radius={[4, 4, 0, 0]} barSize={60} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* TAB EGRESOS HISTORIAL */}
            {pestaña === 'egresos' && (
              <div className="finanzas-globales-card">
                <div className="finanzas-globales-card-title"><i className="fas fa-list text-warning"></i> Egresos del {formatearRangoFechas()}</div>
                {egresos.length === 0 ? (
                  <div className="finanzas-globales-empty"><i className="fas fa-receipt"></i><p>No se han registrado egresos en este periodo.</p></div>
                ) : (
                  <div className="table-responsive">
                    <table className="finanzas-globales-table">
                      <thead>
                        <tr>
                          <th>Fecha</th>
                          <th>Categoría</th>
                          <th>Descripción</th>
                          <th>Monto</th>
                          <th style={{ textAlign: 'right' }}>Acción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {egresos.map(e => (
                          <tr key={e.idEgreso}>
                            <td>{new Date(e.fechaEgreso).toLocaleDateString()}</td>
                            <td><span className={getBadgeClass(e.categoria)}>{e.categoria}</span></td>
                            <td className="text-secondary">{e.notas || 'Sin notas'}</td>
                            <td className="text-danger fw-bold">{formatearDinero(e.monto)}</td>
                            <td style={{ textAlign: 'right' }}>
                              <button className="finanzas-globales-btn-danger" onClick={() => eliminarEgreso(e.idEgreso)}>
                                <i className="fas fa-trash"></i>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB INGRESOS HISTORIAL */}
            {pestaña === 'ingresos' && (
              <div className="finanzas-globales-card">
                <div className="finanzas-globales-card-title"><i className="fas fa-hand-holding-usd text-success"></i> Ingresos del {formatearRangoFechas()}</div>
                {ingresos.length === 0 ? (
                  <div className="finanzas-globales-empty"><i className="fas fa-wallet"></i><p>No hay ingresos registrados en este periodo.</p></div>
                ) : (
                  <div className="table-responsive">
                    <table className="finanzas-globales-table">
                      <thead>
                        <tr>
                          <th>Fecha</th>
                          <th>Categoría</th>
                          <th>Detalle / Origen</th>
                          <th style={{ textAlign: 'right' }}>Monto</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ingresos.map((i, index) => (
                          <tr key={`${i.id}-${index}`}>
                            <td>{new Date(i.fecha).toLocaleDateString()}</td>
                            <td><span className={getBadgeClass(i.categoria)}>{i.categoria}</span></td>
                            <td className="text-secondary">{i.notas || 'Ingreso del sistema'}</td>
                            <td className="text-success fw-bold" style={{ textAlign: 'right' }}>+{formatearDinero(i.monto)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB NUEVO EGRESO */}
            {pestaña === 'nuevo_egreso' && (
              <div className="row justify-content-center">
                <div className="col-md-8 col-lg-6">
                  <div className="finanzas-globales-card">
                    <div className="finanzas-globales-card-title"><i className="fas fa-hand-holding-usd text-danger"></i> Registrar Salida de Dinero</div>
                    <form onSubmit={registrarEgreso}>
                      <div className="mb-3">
                        <label className="text-secondary small fw-bold mb-1">Monto ($)</label>
                        <input type="number" step="0.01" className="finanzas-globales-input" placeholder="Ej. 1500.00" value={formEgreso.monto} onChange={e => setFormEgreso({...formEgreso, monto: e.target.value})} required />
                      </div>
                      
                      <div className="mb-3">
                        <label className="text-secondary small fw-bold mb-1">Categoría</label>
                        <select className="finanzas-globales-input" value={formEgreso.categoria} onChange={e => setFormEgreso({...formEgreso, categoria: e.target.value})}>
                          <option value="Pago Coach">Pago Coach</option>
                          <option value="Mantenimiento">Mantenimiento</option>
                          <option value="Servicios">Servicios (Luz, Agua, Internet)</option>
                          <option value="Equipo">Compra de Equipo</option>
                          <option value="Otros">Otros Gastos</option>
                        </select>
                      </div>

                      <div className="mb-3">
                        <label className="text-secondary small fw-bold mb-1">Descripción / Notas</label>
                        <textarea className="finanzas-globales-input" rows="3" placeholder="Ej. Pago quincenal Coach Juan" value={formEgreso.notas} onChange={e => setFormEgreso({...formEgreso, notas: e.target.value})}></textarea>
                      </div>

                      <div className="mb-4">
                        <label className="text-secondary small fw-bold mb-1">URL Comprobante (Opcional)</label>
                        <input type="url" className="finanzas-globales-input" placeholder="https://..." value={formEgreso.comprobanteUrl} onChange={e => setFormEgreso({...formEgreso, comprobanteUrl: e.target.value})} />
                      </div>

                      <button type="submit" className="finanzas-globales-btn w-100">
                        <i className="fas fa-save"></i> Guardar Egreso
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
