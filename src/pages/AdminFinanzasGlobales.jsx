import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, Link } from 'react-router-dom';
import BackButton from '../components/BackButton';
import AtletifyLoader from '../components/AtletifyLoader';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import '../assets/css/GestionClases.css';
import '../assets/css/AdminFinanzasGlobales.css';

const API_BASE = `${import.meta.env.VITE_API_URL}/api/finanzas-globales`;

const PAGE_SIZE = 10;

// Categorías de egreso (reemplazan el <select> nativo por un picker modal)
const CATEGORIAS_EGRESO = [
  { value: 'Pago Coach',    label: 'Pago Coach',                   desc: 'Sueldos de entrenadores',  icon: 'fa-user-tie',           color: '#4fc3f7' },
  { value: 'Mantenimiento', label: 'Mantenimiento',               desc: 'Reparaciones del box',     icon: 'fa-screwdriver-wrench', color: '#f1c40f' },
  { value: 'Servicios',     label: 'Servicios',                   desc: 'Luz, agua, internet',      icon: 'fa-bolt',               color: '#9b59b6' },
  { value: 'Equipo',        label: 'Compra de Equipo',            desc: 'Material y equipamiento',  icon: 'fa-dumbbell',           color: '#e67e22' },
  { value: 'Otros',         label: 'Otros Gastos',                desc: 'Gastos varios',            icon: 'fa-ellipsis',           color: '#95a5a6' },
];

/* ── Paginación (números en desktop, compacto "X / Y" en móvil) ── */
function buildPaginas(pagina, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const out = [1];
  if (pagina > 3) out.push('...');
  const start = Math.max(2, pagina - 1);
  const end = Math.min(total - 1, pagina + 1);
  for (let i = start; i <= end; i++) out.push(i);
  if (pagina < total - 2) out.push('...');
  out.push(total);
  return out;
}

function Paginacion({ pagina, totalPaginas, onCambio }) {
  if (totalPaginas <= 1) return null;
  const paginas = buildPaginas(pagina, totalPaginas);
  return (
    <div className="fg-paginacion" role="navigation" aria-label="Paginación">
      <button type="button" className="fg-pag-btn" disabled={pagina === 1} onClick={() => onCambio(pagina - 1)} aria-label="Página anterior">
        <i className="fas fa-chevron-left"></i>
      </button>
      <div className="fg-pag-numbers">
        {paginas.map((p, i) => p === '...'
          ? <span key={`e${i}`} className="fg-pag-ellipsis">…</span>
          : <button key={p} type="button" className={`fg-pag-btn ${pagina === p ? 'fg-pag-btn--active' : ''}`} onClick={() => onCambio(p)}>{p}</button>
        )}
      </div>
      <span className="fg-pag-compact">{pagina} / {totalPaginas}</span>
      <button type="button" className="fg-pag-btn" disabled={pagina === totalPaginas} onClick={() => onCambio(pagina + 1)} aria-label="Página siguiente">
        <i className="fas fa-chevron-right"></i>
      </button>
    </div>
  );
}

/* ── Picker modal de categoría de egreso (centrado) ── */
function CategoriaPickerModal({ valor, onSelect, onCerrar }) {
  return createPortal(
    <div className="fg-modal-overlay" onClick={e => { if (e.target === e.currentTarget) onCerrar(); }}>
      <div className="fg-modal">
        <div className="fg-modal__header">
          <div>
            <p className="fg-modal__supertitle">EGRESO</p>
            <h2 className="fg-modal__title">Categoría del Gasto</h2>
          </div>
          <button type="button" className="fg-modal__close" onClick={onCerrar} aria-label="Cerrar"><i className="fas fa-times" /></button>
        </div>
        <div className="fg-modal__list">
          {CATEGORIAS_EGRESO.map(cat => {
            const activo = cat.value === valor;
            return (
              <button key={cat.value} type="button" className={`fg-opcion${activo ? ' fg-opcion--activo' : ''}`} style={{ '--opt-color': cat.color }} onClick={() => onSelect(cat.value)}>
                <span className="fg-opcion__icon"><i className={`fas ${cat.icon}`} /></span>
                <span className="fg-opcion__info">
                  <span className="fg-opcion__nombre">{cat.label}</span>
                  <span className="fg-opcion__desc">{cat.desc}</span>
                </span>
                {activo && <i className="fas fa-check-circle fg-opcion__check" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>,
    document.body
  );
}

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

  // Paginación de tablas (ingresos / egresos)
  const [pagIngresos, setPagIngresos] = useState(1);
  const [pagEgresos, setPagEgresos] = useState(1);
  // Picker de categoría del formulario de egreso
  const [modalCategoria, setModalCategoria] = useState(false);

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

  // Resetea la página al cambiar los datos del periodo
  useEffect(() => { setPagIngresos(1); }, [ingresos]);
  useEffect(() => { setPagEgresos(1); }, [egresos]);

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
    const normalize = (categoria || '').toLowerCase().replace(" ", "-");
    return `fg-badge badge-${normalize}`;
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

  // Paginación derivada (10 por página)
  const totalPagIng = Math.max(1, Math.ceil(ingresos.length / PAGE_SIZE));
  const ingresosPagina = ingresos.slice((pagIngresos - 1) * PAGE_SIZE, pagIngresos * PAGE_SIZE);
  const totalPagEgr = Math.max(1, Math.ceil(egresos.length / PAGE_SIZE));
  const egresosPagina = egresos.slice((pagEgresos - 1) * PAGE_SIZE, pagEgresos * PAGE_SIZE);
  const categoriaSel = CATEGORIAS_EGRESO.find(c => c.value === formEgreso.categoria) || CATEGORIAS_EGRESO[0];

  return (
    <div className="fg-page">

      {/* ── HEADER (patrón GestionClases) ── */}
      <header className="gc-header">
        <div className="d-flex align-items-center gap-3">
          <BackButton to="/admin-box-panel" />
          <h1 className="gc-header-title">Finanzas <span>Globales</span></h1>
        </div>
      </header>

      <div className="container-xl py-4 px-3 px-md-4 fg-content">

        {/* ── TOOLBAR: periodo + navegación de fecha + export ── */}
        <div className="fg-toolbar">
          <div className="fg-periodos">
            {['Diario', 'Semanal', 'Mensual', 'Anual'].map(p => (
              <button
                key={p}
                className={`fg-periodo-btn ${periodo === p ? 'fg-periodo-btn--active' : ''}`}
                onClick={() => setPeriodo(p)}
              >
                {p}
              </button>
            ))}
          </div>

          <div className="fg-fecha-nav">
            <button className="fg-fecha-arrow" onClick={() => moverFecha('prev')} aria-label="Periodo anterior">
              <i className="fas fa-chevron-left"></i>
            </button>
            <span className="fg-fecha-label">{formatearRangoFechas()}</span>
            <button className="fg-fecha-arrow" onClick={() => moverFecha('next')} aria-label="Periodo siguiente">
              <i className="fas fa-chevron-right"></i>
            </button>
          </div>

          <button className="fg-export-btn" onClick={generarReportePDF} disabled={loading || !resumen}>
            <i className="fas fa-file-pdf"></i>
            <span className="fg-btn-label">Exportar PDF</span>
          </button>
        </div>

        {/* ── TABS ── */}
        <div className="fg-tabs-wrapper">
          <div className="fg-tabs">
            {sliderStyle && <div className="fg-tab-slider" style={sliderStyle} />}
            <button ref={el => tabRefs.current['dashboard'] = el} className={`fg-tab ${pestaña === 'dashboard' ? 'activo' : ''}`} onClick={() => setPestaña('dashboard')}><i className="fas fa-chart-line"></i> Dashboard</button>
            <button ref={el => tabRefs.current['ingresos'] = el} className={`fg-tab ${pestaña === 'ingresos' ? 'activo' : ''}`} onClick={() => setPestaña('ingresos')}><i className="fas fa-hand-holding-usd"></i> Ingresos</button>
            <button ref={el => tabRefs.current['egresos'] = el} className={`fg-tab ${pestaña === 'egresos' ? 'activo' : ''}`} onClick={() => setPestaña('egresos')}><i className="fas fa-file-invoice-dollar"></i> Egresos</button>
            <button ref={el => tabRefs.current['nuevo_egreso'] = el} className={`fg-tab ${pestaña === 'nuevo_egreso' ? 'activo' : ''}`} onClick={() => setPestaña('nuevo_egreso')}><i className="fas fa-plus-circle"></i> Registrar Egreso</button>
          </div>
        </div>

        {loading ? (
          <div className="fg-loading"><AtletifyLoader /></div>
        ) : (
          <>
            {/* ══ TAB DASHBOARD ══ */}
            {pestaña === 'dashboard' && resumen && (
              <>
                <div className="fg-kpi-grid">
                  <div className="fg-kpi fg-kpi--ingresos">
                    <div className="fg-kpi-title"><i className="fas fa-arrow-up"></i> Ingresos Totales</div>
                    <div className="fg-kpi-value fg-kpi-value--ingresos">{formatearDinero(resumen.totalIngresos)}</div>
                  </div>
                  <div className="fg-kpi fg-kpi--egresos">
                    <div className="fg-kpi-title"><i className="fas fa-arrow-down"></i> Egresos Totales</div>
                    <div className="fg-kpi-value fg-kpi-value--egresos">{formatearDinero(resumen.totalEgresos)}</div>
                  </div>
                  <div className="fg-kpi fg-kpi--balance">
                    <div className="fg-kpi-title"><i className="fas fa-scale-balanced"></i> Balance (Utilidad)</div>
                    <div className="fg-kpi-value fg-kpi-value--balance">{formatearDinero(resumen.balanceGeneral)}</div>
                  </div>

                  {resumen.estadisticas && (
                    <>
                      <Link to="/gestion-finanzas" state={{ fromTab: 'semaforo' }} className="fg-kpi fg-kpi--clickable">
                        <div className="fg-kpi-title"><i className="fas fa-users" style={{ color: 'var(--primary)' }}></i> Mensualidades Activas</div>
                        <div className="fg-kpi-value fg-kpi-value--sm">
                          {dashboardData?.estadoAtletas?.alDia ?? 0} <span className="fg-kpi-unit">atletas al día</span>
                        </div>
                      </Link>
                      <div className="fg-kpi">
                        <div className="fg-kpi-title"><i className="fas fa-shopping-bag" style={{ color: 'var(--accent)' }}></i> Operaciones en Tienda</div>
                        <div className="fg-kpi-value fg-kpi-value--sm">{resumen.estadisticas.ventasTienda} <span className="fg-kpi-unit">ventas/abonos</span></div>
                      </div>
                      <div className="fg-kpi">
                        <div className="fg-kpi-title"><i className="fas fa-plane-arrival" style={{ color: '#9b59b6' }}></i> Turistas / Drop-Ins</div>
                        <div className="fg-kpi-value fg-kpi-value--sm">{resumen.estadisticas.dropIns} <span className="fg-kpi-unit">visitas</span></div>
                      </div>
                    </>
                  )}
                </div>

                <div className="fg-charts-grid">
                  <div className="fg-card">
                    <div className="fg-card-title"><i className="fas fa-chart-pie" style={{ color: 'var(--success)' }}></i> Desglose de Ingresos</div>
                    <div className="fg-chart">
                      {resumen.ingresosPorCategoria.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={resumen.ingresosPorCategoria} dataKey="total" nameKey="categoria" cx="50%" cy="50%" innerRadius={55} outerRadius={90}>
                              {resumen.ingresosPorCategoria.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                            </Pie>
                            <Tooltip formatter={(value) => formatearDinero(value)} contentStyle={{ backgroundColor: '#1e1e26', border: '1px solid #333', borderRadius: '8px' }} />
                            <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '0.8rem' }} />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : <div className="fg-empty"><i className="fas fa-folder-open"></i><p>Sin ingresos en este periodo</p></div>}
                    </div>
                  </div>

                  <div className="fg-card">
                    <div className="fg-card-title"><i className="fas fa-scale-balanced" style={{ color: 'var(--accent-cool)' }}></i> Balance del Periodo</div>
                    <div className="fg-chart">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={[{ name: 'Periodo Actual', Ingresos: resumen.totalIngresos, Egresos: resumen.totalEgresos }]} margin={{ top: 15, right: 20, left: 10, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                          <XAxis dataKey="name" stroke="#ccc" fontSize={12} />
                          <YAxis type="number" stroke="#ccc" tickFormatter={(value) => `$${value}`} fontSize={12} />
                          <Tooltip formatter={(value) => formatearDinero(value)} cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ backgroundColor: '#1e1e26', border: '1px solid #333', borderRadius: '8px' }} />
                          <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '0.8rem' }} />
                          <Bar dataKey="Ingresos" fill="#2ecc71" radius={[4, 4, 0, 0]} barSize={55} />
                          <Bar dataKey="Egresos" fill="#e74c3c" radius={[4, 4, 0, 0]} barSize={55} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ══ TAB EGRESOS ══ */}
            {pestaña === 'egresos' && (
              <div className="fg-card">
                <div className="fg-card-title"><i className="fas fa-list" style={{ color: 'var(--accent)' }}></i> Egresos del {formatearRangoFechas()}</div>
                {egresos.length === 0 ? (
                  <div className="fg-empty"><i className="fas fa-receipt"></i><p>No se han registrado egresos en este periodo.</p></div>
                ) : (
                  <>
                    {/* Tabla desktop */}
                    <div className="d-none d-md-block">
                      <table className="fg-table">
                        <thead>
                          <tr>
                            <th>Fecha</th>
                            <th>Categoría</th>
                            <th>Descripción</th>
                            <th>Monto</th>
                            <th className="fg-th-end">Acción</th>
                          </tr>
                        </thead>
                        <tbody>
                          {egresosPagina.map(e => (
                            <tr key={e.idEgreso}>
                              <td>{new Date(e.fechaEgreso).toLocaleDateString()}</td>
                              <td><span className={getBadgeClass(e.categoria)}>{e.categoria}</span></td>
                              <td className="fg-td-muted">{e.notas || 'Sin notas'}</td>
                              <td className="fg-monto fg-monto--egreso">{formatearDinero(e.monto)}</td>
                              <td className="fg-th-end">
                                <button className="fg-action-btn fg-action-btn--danger" onClick={() => eliminarEgreso(e.idEgreso)} aria-label="Eliminar">
                                  <i className="fas fa-trash"></i>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Cards móvil */}
                    <div className="d-md-none fg-cards">
                      {egresosPagina.map(e => (
                        <div key={e.idEgreso} className="fg-mov-card">
                          <div className="fg-mov-top">
                            <span className={getBadgeClass(e.categoria)}>{e.categoria}</span>
                            <span className="fg-monto fg-monto--egreso">{formatearDinero(e.monto)}</span>
                          </div>
                          <div className="fg-mov-desc">{e.notas || 'Sin notas'}</div>
                          <div className="fg-mov-foot">
                            <span className="fg-mov-fecha"><i className="fas fa-calendar-day"></i>{new Date(e.fechaEgreso).toLocaleDateString()}</span>
                            <button className="fg-action-btn fg-action-btn--danger" onClick={() => eliminarEgreso(e.idEgreso)} aria-label="Eliminar">
                              <i className="fas fa-trash"></i>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <Paginacion pagina={pagEgresos} totalPaginas={totalPagEgr} onCambio={setPagEgresos} />
                  </>
                )}
              </div>
            )}

            {/* ══ TAB INGRESOS ══ */}
            {pestaña === 'ingresos' && (
              <div className="fg-card">
                <div className="fg-card-title"><i className="fas fa-hand-holding-usd" style={{ color: 'var(--success)' }}></i> Ingresos del {formatearRangoFechas()}</div>
                {ingresos.length === 0 ? (
                  <div className="fg-empty"><i className="fas fa-wallet"></i><p>No hay ingresos registrados en este periodo.</p></div>
                ) : (
                  <>
                    {/* Tabla desktop */}
                    <div className="d-none d-md-block">
                      <table className="fg-table">
                        <thead>
                          <tr>
                            <th>Fecha</th>
                            <th>Categoría</th>
                            <th>Detalle / Origen</th>
                            <th className="fg-th-end">Monto</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ingresosPagina.map((i, index) => (
                            <tr key={`${i.id}-${index}`}>
                              <td>{new Date(i.fecha).toLocaleDateString()}</td>
                              <td><span className={getBadgeClass(i.categoria)}>{i.categoria}</span></td>
                              <td className="fg-td-muted">{i.notas || 'Ingreso del sistema'}</td>
                              <td className="fg-monto fg-monto--ingreso fg-th-end">+{formatearDinero(i.monto)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Cards móvil */}
                    <div className="d-md-none fg-cards">
                      {ingresosPagina.map((i, index) => (
                        <div key={`${i.id}-${index}`} className="fg-mov-card">
                          <div className="fg-mov-top">
                            <span className={getBadgeClass(i.categoria)}>{i.categoria}</span>
                            <span className="fg-monto fg-monto--ingreso">+{formatearDinero(i.monto)}</span>
                          </div>
                          <div className="fg-mov-desc">{i.notas || 'Ingreso del sistema'}</div>
                          <div className="fg-mov-foot">
                            <span className="fg-mov-fecha"><i className="fas fa-calendar-day"></i>{new Date(i.fecha).toLocaleDateString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <Paginacion pagina={pagIngresos} totalPaginas={totalPagIng} onCambio={setPagIngresos} />
                  </>
                )}
              </div>
            )}

            {/* ══ TAB NUEVO EGRESO ══ */}
            {pestaña === 'nuevo_egreso' && (
              <div className="fg-form-wrap">
                <div className="fg-card fg-form-card">
                  <div className="fg-card-title"><i className="fas fa-hand-holding-usd" style={{ color: 'var(--primary)' }}></i> Registrar Salida de Dinero</div>
                  <form onSubmit={registrarEgreso}>
                    <div className="fg-field">
                      <label className="fg-label">Monto ($)</label>
                      <input type="number" step="0.01" className="fg-input" placeholder="Ej. 1500.00" value={formEgreso.monto} onChange={e => setFormEgreso({ ...formEgreso, monto: e.target.value })} required />
                    </div>

                    <div className="fg-field">
                      <label className="fg-label">Categoría</label>
                      <button type="button" className="fg-picker-btn" style={{ '--pick-color': categoriaSel.color }} onClick={() => setModalCategoria(true)}>
                        <span className="fg-picker-btn__left">
                          <span className="fg-picker-btn__icon"><i className={`fas ${categoriaSel.icon}`} /></span>
                          <span className="fg-picker-btn__label">{categoriaSel.label}</span>
                        </span>
                        <i className="fas fa-chevron-down fg-picker-btn__arrow" />
                      </button>
                    </div>

                    <div className="fg-field">
                      <label className="fg-label">Descripción / Notas</label>
                      <textarea className="fg-input" rows="3" placeholder="Ej. Pago quincenal Coach Juan" value={formEgreso.notas} onChange={e => setFormEgreso({ ...formEgreso, notas: e.target.value })}></textarea>
                    </div>

                    <div className="fg-field">
                      <label className="fg-label">URL Comprobante (Opcional)</label>
                      <input type="url" className="fg-input" placeholder="https://..." value={formEgreso.comprobanteUrl} onChange={e => setFormEgreso({ ...formEgreso, comprobanteUrl: e.target.value })} />
                    </div>

                    <button type="submit" className="fg-submit-btn">
                      <i className="fas fa-save"></i> Guardar Egreso
                    </button>
                  </form>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {modalCategoria && (
        <CategoriaPickerModal
          valor={formEgreso.categoria}
          onSelect={(v) => { setFormEgreso({ ...formEgreso, categoria: v }); setModalCategoria(false); }}
          onCerrar={() => setModalCategoria(false)}
        />
      )}
    </div>
  );
}
