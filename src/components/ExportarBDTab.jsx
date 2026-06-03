import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import * as XLSX from 'xlsx';
import XLSX_STYLE from 'xlsx-js-style';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import '../assets/css/ExportarBD.css';

const API_BASE = import.meta.env.VITE_API_URL;

// Opciones de filtro (reemplazan los <select> nativos por pickers modales)
const ROLES_EXPORT = [
  { value: 'Todos',    label: 'Todos',    icon: 'fa-users',                desc: 'Todos los roles',     color: '#A8B2D1' },
  { value: 'Atleta',   label: 'Atleta',   icon: 'fa-running',              desc: 'Miembros del box',    color: '#2ECC71' },
  { value: 'Coach',    label: 'Coach',    icon: 'fa-chalkboard-teacher',   desc: 'Entrenadores',        color: '#4FC3F7' },
  { value: 'Staff',    label: 'Staff',    icon: 'fa-user-shield',          desc: 'Personal del box',    color: '#00B8C4' },
  { value: 'AdminBox', label: 'AdminBox', icon: 'fa-shield-alt',           desc: 'Administradores',     color: '#F5A623' },
];

const ESTATUS_EXPORT = [
  { value: 'Todas',         label: 'Todas',          icon: 'fa-layer-group',  desc: 'Cualquier membresía', color: '#A8B2D1' },
  { value: 'Activa',        label: 'Activa',         icon: 'fa-check-circle', desc: 'Membresía vigente',   color: '#2ECC71' },
  { value: 'Vencida',       label: 'Vencida',        icon: 'fa-times-circle', desc: 'Pago pendiente',      color: '#E74C3C' },
  { value: 'Congelada',     label: 'Congelada',      icon: 'fa-snowflake',    desc: 'Membresía en pausa',  color: '#4FC3F7' },
  { value: 'VIP',           label: 'VIP (Exentos)',  icon: 'fa-crown',        desc: 'Exentos de pago',     color: '#F5A623' },
  { value: 'Sin Membresía', label: 'Sin Membresía',  icon: 'fa-ban',          desc: 'Sin plan asignado',   color: '#888' },
];

// Picker modal genérico (centrado) para los filtros de rol / estatus
function OpcionPickerModal({ supertitulo, titulo, opciones, valor, onSelect, onCerrar }) {
  return createPortal(
    <div className="ebx-modal-overlay" onClick={e => { if (e.target === e.currentTarget) onCerrar(); }}>
      <div className="ebx-modal">
        <div className="ebx-modal__header">
          <div>
            <p className="ebx-modal__supertitle">{supertitulo}</p>
            <h2 className="ebx-modal__title">{titulo}</h2>
          </div>
          <button type="button" className="ebx-modal__close" onClick={onCerrar} aria-label="Cerrar">
            <i className="fas fa-times" />
          </button>
        </div>
        <div className="ebx-modal__list">
          {opciones.map(op => {
            const activo = op.value === valor;
            return (
              <button
                key={op.value}
                type="button"
                className={`ebx-opcion${activo ? ' ebx-opcion--activo' : ''}`}
                style={{ '--opt-color': op.color }}
                onClick={() => onSelect(op.value)}
              >
                <span className="ebx-opcion__icon"><i className={`fas ${op.icon}`} /></span>
                <span className="ebx-opcion__info">
                  <span className="ebx-opcion__nombre">{op.label}</span>
                  {op.desc && <span className="ebx-opcion__desc">{op.desc}</span>}
                </span>
                {activo && <i className="fas fa-check-circle ebx-opcion__check" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>,
    document.body
  );
}

// Definición de columnas exportables agrupadas por categoría
export const COLUMNAS_EXPORTABLES = {
  'Datos Personales': [
    { key: 'nombre', label: 'Nombre' },
    { key: 'apellidos', label: 'Apellidos' },
    { key: 'correo', label: 'Correo' },
    { key: 'telefono', label: 'Teléfono' },
    { key: 'genero', label: 'Género' },
    { key: 'fechaNacimiento', label: 'Fecha Nacimiento' },
    { key: 'tipoDeSangre', label: 'Tipo de Sangre' },
    { key: 'peso', label: 'Peso' },
    { key: 'tallaPlayera', label: 'Talla Playera' },
  ],
  'Datos Financieros': [
    { key: 'planActual', label: 'Plan Actual' },
    { key: 'estatusMem', label: 'Estatus Membresía' },
    { key: 'fechaVencimiento', label: 'Fecha Vencimiento' },
    { key: 'precioCobrado', label: 'Precio Cobrado' },
    { key: 'exentoDePago', label: 'Exento de Pago (VIP)' },
    { key: 'esDeConfianza', label: 'Atleta de Confianza' },
    { key: 'deudaTienda', label: 'Deuda en Tienda' },
    { key: 'mesesConsecutivosPagados', label: 'Meses Consecutivos' },
  ],
  'Datos Deportivos': [
    { key: 'categoriaBase', label: 'Categoría Base' },
    { key: 'tieneExperiencia', label: 'Tiene Experiencia' },
    { key: 'deporteExperiencia', label: 'Deporte Experiencia' },
    { key: 'tieneDiscapacidad', label: 'Discapacidad' },
    { key: 'objetivo', label: 'Objetivo' },
  ],
  'Gamificación': [
    { key: 'rol', label: 'Rol' },
    { key: 'estatus', label: 'Estatus Cuenta' },
    { key: 'activo', label: 'Activo' },
    { key: 'rachaActual', label: 'Racha Actual' },
    { key: 'nivelGamer', label: 'Nivel Gamer' },
    { key: 'totalVisitasHistoricas', label: 'Visitas Históricas' },
    { key: 'fechaIngresoOriginal', label: 'Fecha Ingreso Original' },
    { key: 'apodo', label: 'Apodo' },
    { key: 'estadoDelDia', label: 'Estado del Día' },
    { key: 'fechaCreacion', label: 'Fecha Creación Cuenta' },
  ],
  'Datos Médicos': [
    { key: 'contactoEmergenciaNombre', label: 'Contacto Emergencia' },
    { key: 'contactoEmergenciaTelefono', label: 'Tel. Emergencia' },
    { key: 'lesionesPrevias', label: 'Lesiones Previas' },
    { key: 'alergias', label: 'Alergias' },
  ],
};

export const ICONOS_CATEGORIA = {
  'Datos Personales': 'fas fa-user',
  'Datos Financieros': 'fas fa-dollar-sign',
  'Datos Deportivos': 'fas fa-dumbbell',
  'Gamificación': 'fas fa-gamepad',
  'Datos Médicos': 'fas fa-medkit',
};

export const COLORES_CATEGORIA = {
  'Datos Personales': '#4fc3f7',
  'Datos Financieros': '#ffd54f',
  'Datos Deportivos': '#ef5350',
  'Gamificación': '#ab47bc',
  'Datos Médicos': '#66bb6a',
};

// ===================================================
// COMPONENTE: EXPORTAR BD TAB
// ===================================================
export default function ExportarBDTab({ boxes, fixedBox }) {
  // === ESTADOS PARA EXPORTAR BD ===
  const [exportBoxId, setExportBoxId] = useState('');
  const [exportBoxNombre, setExportBoxNombre] = useState('');
  const [columnasSeleccionadas, setColumnasSeleccionadas] = useState(new Set(['nombre', 'apellidos', 'correo', 'telefono']));
  const [filtroRolExport, setFiltroRolExport] = useState('Todos');
  const [filtroEstatusExport, setFiltroEstatusExport] = useState('Todas');
  const [datosExportados, setDatosExportados] = useState([]);
  const [cargandoExport, setCargandoExport] = useState(false);
  const [exportPreview, setExportPreview] = useState(false);
  const [mostrarModalPDF, setMostrarModalPDF] = useState(false);
  const [modalBoxOpen, setModalBoxOpen] = useState(false);
  const [busquedaBox, setBusquedaBox] = useState('');
  const [modalRolOpen, setModalRolOpen] = useState(false);
  const [modalEstatusOpen, setModalEstatusOpen] = useState(false);

  const rolSel = ROLES_EXPORT.find(r => r.value === filtroRolExport) || ROLES_EXPORT[0];
  const estatusSel = ESTATUS_EXPORT.find(e => e.value === filtroEstatusExport) || ESTATUS_EXPORT[0];

  useEffect(() => {
    const id = fixedBox?.idBox || fixedBox?.IdBox;
    if (id) {
      setExportBoxId(String(id));
    }
  }, [fixedBox]);

  // Toggle una columna individual
  const toggleColumna = (key) => {
    setColumnasSeleccionadas(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
    setExportPreview(false);
  };

  // Seleccionar/deseleccionar toda una categoría
  const toggleCategoria = (categoria) => {
    const keys = COLUMNAS_EXPORTABLES[categoria].map(c => c.key);
    const todasActivas = keys.every(k => columnasSeleccionadas.has(k));
    setColumnasSeleccionadas(prev => {
      const next = new Set(prev);
      keys.forEach(k => todasActivas ? next.delete(k) : next.add(k));
      return next;
    });
    setExportPreview(false);
  };

  // Seleccionar todas las columnas
  const seleccionarTodas = () => {
    const todas = new Set();
    Object.values(COLUMNAS_EXPORTABLES).flat().forEach(c => todas.add(c.key));
    setColumnasSeleccionadas(todas);
    setExportPreview(false);
  };

  // Limpiar selección
  const limpiarSeleccion = () => {
    setColumnasSeleccionadas(new Set());
    setExportPreview(false);
  };

  // Obtener label de una key
  const getLabel = (key) => {
    for (const cols of Object.values(COLUMNAS_EXPORTABLES)) {
      const found = cols.find(c => c.key === key);
      if (found) return found.label;
    }
    return key;
  };

  // Ordenar columnas según el orden canónico definido en COLUMNAS_EXPORTABLES
  const ordenarColumnas = (seleccionadas) => {
    const ordenCanon = Object.values(COLUMNAS_EXPORTABLES).flat().map(c => c.key);
    return [...seleccionadas].sort((a, b) => ordenCanon.indexOf(a) - ordenCanon.indexOf(b));
  };

  // Formatear un valor para mostrar en tabla/csv
  const formatVal = (val, key) => {
    if (val === null || val === undefined) return '';
    if (typeof val === 'boolean') return val ? 'Sí' : 'No';
    if (key.toLowerCase().includes('fecha') && val) {
      try { return new Date(val).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }); }
      catch { return val; }
    }
    if (typeof val === 'number' && (key.includes('Precio') || key.includes('deuda') || key.includes('precioCobrado'))) {
      return `$${val.toFixed(2)}`;
    }
    return String(val);
  };

  // Cargar datos del endpoint
  const cargarDatos = async () => {
    if (!exportBoxId) return alert('Selecciona un Box primero.');
    if (columnasSeleccionadas.size === 0) return alert('Selecciona al menos una columna.');
    
    setCargandoExport(true);
    setExportPreview(false);
    try {
      const params = new URLSearchParams();
      if (filtroRolExport !== 'Todos') params.append('filtroRol', filtroRolExport);
      if (filtroEstatusExport !== 'Todas') params.append('filtroEstatus', filtroEstatusExport);

      const res = await fetch(`${API_BASE}/api/usuarios/box/${exportBoxId}/exportar?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDatosExportados(data.usuarios || []);
        setExportPreview(true);
      } else {
        const errorData = await res.json().catch(() => null);
        alert(errorData?.mensaje || 'Error al cargar datos. Verifica permisos.');
      }
    } catch (e) {
      console.error(e);
      alert('Error de conexión.');
    } finally {
      setCargandoExport(false);
    }
  };

  // Generar XLSX con formato profesional
  const descargarXLSX = () => {
    if (datosExportados.length === 0) return;
    const cols = ordenarColumnas(columnasSeleccionadas);
    const headers = cols.map(k => getLabel(k));
    
    let boxName = 'Box';
    if (fixedBox) {
      boxName = fixedBox.nombre || fixedBox.Nombre || 'Box';
    } else if (boxes) {
      const foundBox = boxes.find(b => String(b.idBox || b.IdBox) === exportBoxId);
      boxName = foundBox?.nombre || foundBox?.Nombre || 'Box';
    }

    // Crear filas de datos
    const dataRows = datosExportados.map(u => cols.map(k => {
      const val = u[k];
      if (val === null || val === undefined) return '';
      if (typeof val === 'boolean') return val ? 'Sí' : 'No';
      if (k.toLowerCase().includes('fecha') && val) {
        try { return new Date(val).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }); }
        catch { return val; }
      }
      return val;
    }));

    // Construir worksheet con estilos
    const wsData = [headers, ...dataRows];
    const ws = XLSX_STYLE.utils.aoa_to_sheet(wsData);

    // Estilo del header
    const headerStyle = {
      font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11, name: 'Calibri' },
      fill: { fgColor: { rgb: 'B71C1C' } },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      border: {
        top: { style: 'thin', color: { rgb: '880000' } },
        bottom: { style: 'medium', color: { rgb: 'FF5252' } },
        left: { style: 'thin', color: { rgb: '880000' } },
        right: { style: 'thin', color: { rgb: '880000' } }
      }
    };

    // Estilo de celdas normales
    const cellStyleEven = {
      font: { sz: 10, name: 'Calibri', color: { rgb: '212121' } },
      fill: { fgColor: { rgb: 'FFFFFF' } },
      alignment: { vertical: 'center' },
      border: {
        top: { style: 'thin', color: { rgb: 'E0E0E0' } },
        bottom: { style: 'thin', color: { rgb: 'E0E0E0' } },
        left: { style: 'thin', color: { rgb: 'E0E0E0' } },
        right: { style: 'thin', color: { rgb: 'E0E0E0' } }
      }
    };
    const cellStyleOdd = {
      ...cellStyleEven,
      fill: { fgColor: { rgb: 'F5F5F5' } }
    };

    // Estilo para montos
    const moneyStyle = (isOdd) => ({
      ...(isOdd ? cellStyleOdd : cellStyleEven),
      font: { sz: 10, name: 'Calibri', bold: true, color: { rgb: '212121' } },
      numFmt: '$#,##0.00'
    });

    // Aplicar estilos al header
    for (let c = 0; c < headers.length; c++) {
      const cellRef = XLSX_STYLE.utils.encode_cell({ r: 0, c });
      if (ws[cellRef]) ws[cellRef].s = headerStyle;
    }

    // Aplicar estilos a las celdas de datos
    for (let r = 0; r < dataRows.length; r++) {
      const isOdd = r % 2 === 1;
      for (let c = 0; c < cols.length; c++) {
        const cellRef = XLSX_STYLE.utils.encode_cell({ r: r + 1, c });
        if (!ws[cellRef]) continue;
        const key = cols[c];
        if ((key.includes('deuda') || key === 'precioCobrado') && typeof dataRows[r][c] === 'number') {
          ws[cellRef].s = moneyStyle(isOdd);
        } else {
          ws[cellRef].s = isOdd ? cellStyleOdd : cellStyleEven;
        }
      }
    }

    // Auto-ajustar ancho de columnas
    ws['!cols'] = headers.map((h, i) => {
      let maxLen = h.length;
      dataRows.forEach(row => {
        const val = String(row[i] ?? '');
        if (val.length > maxLen) maxLen = val.length;
      });
      return { wch: Math.min(Math.max(maxLen + 3, 10), 35) };
    });

    // Altura del header
    ws['!rows'] = [{ hpt: 28 }];

    // Crear workbook y exportar
    const wb = XLSX_STYLE.utils.book_new();
    XLSX_STYLE.utils.book_append_sheet(wb, ws, 'Usuarios');
    XLSX_STYLE.writeFile(wb, `Usuarios_${boxName}_${new Date().toLocaleDateString('es-MX').replace(/\//g, '-')}.xlsx`);
  };

  // Generar PDF (modo tabla para pocas columnas, fichas para muchas)
  const descargarPDF = () => {
    if (datosExportados.length === 0) return;
    const cols = ordenarColumnas(columnasSeleccionadas);
    const MAX_COLS_TABLA = 12;

    // Advertencia si hay muchas columnas (modo fichas)
    if (cols.length > MAX_COLS_TABLA) {
      setMostrarModalPDF(true);
      return;
    }
    generarPDFReal();
  };

  // Lógica real de generar el PDF
  const generarPDFReal = () => {
    const cols = ordenarColumnas(columnasSeleccionadas);
    
    let boxName = 'Box';
    if (fixedBox) {
      boxName = fixedBox.nombre;
    } else if (boxes) {
      boxName = boxes.find(b => b.idBox === parseInt(exportBoxId))?.nombre || 'Box';
    }

    const MAX_COLS_TABLA = 12;

    try {
      const usarTabla = cols.length <= MAX_COLS_TABLA;
      const doc = new jsPDF({
        orientation: usarTabla ? 'landscape' : 'portrait',
        unit: 'mm', format: 'a4'
      });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();

      const dibujarHeader = () => {
        doc.setFillColor(20, 20, 20);
        doc.rect(0, 0, pageW, 28, 'F');
        doc.setFillColor(200, 30, 30);
        doc.rect(0, 28, pageW, 1.5, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(15);
        doc.setFont('helvetica', 'bold');
        doc.text('ATLETIFY SYSTEM', 14, 11);
        doc.setFontSize(9);
        doc.setTextColor(200, 200, 200);
        doc.text(boxName, 14, 18);
        doc.setFontSize(7.5);
        doc.setTextColor(150, 150, 150);
        doc.text(`${new Date().toLocaleString('es-MX')}  |  ${datosExportados.length} registros`, 14, 24);
        const filtros = [];
        if (filtroRolExport !== 'Todos') filtros.push(`Rol: ${filtroRolExport}`);
        if (filtroEstatusExport !== 'Todas') filtros.push(`Membresía: ${filtroEstatusExport}`);
        if (filtros.length > 0) {
          doc.setTextColor(255, 180, 180);
          doc.text(filtros.join('  |  '), pageW - 14, 24, { align: 'right' });
        }
      };

      if (usarTabla) {
        // === MODO TABLA ===
        dibujarHeader();
        const headers = ['#', ...cols.map(k => getLabel(k))];
        const body = datosExportados.map((u, idx) => [idx + 1, ...cols.map(k => formatVal(u[k], k))]);
        const n = cols.length;
        const fs = n <= 6 ? 7.5 : n <= 9 ? 6.5 : 5.5;
        const pad = n <= 6 ? 2.5 : n <= 9 ? 2 : 1.5;
        autoTable(doc, {
          head: [headers], body, startY: 33, theme: 'striped',
          styles: { fontSize: fs, cellPadding: pad, textColor: [40, 40, 40], lineColor: [220, 220, 220], lineWidth: 0.2, overflow: 'ellipsize' },
          headStyles: { fillColor: [180, 25, 25], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: fs + 0.5, halign: 'center' },
          alternateRowStyles: { fillColor: [248, 248, 248] },
          bodyStyles: { fillColor: [255, 255, 255] },
          columnStyles: { 0: { halign: 'center', cellWidth: 10, fontStyle: 'bold', textColor: [120, 120, 120] } },
          margin: { left: 8, right: 8 },
        });
      } else {
        // === MODO FICHAS ===
        const categoriasOrdenadas = Object.entries(COLUMNAS_EXPORTABLES)
          .map(([cat, campos]) => ({ cat, campos: campos.filter(c => columnasSeleccionadas.has(c.key)) }))
          .filter(g => g.campos.length > 0);

        const ROW_H = 7;
        const CAT_H = 6;
        const HEADER_H = 9;
        const CARD_GAP = 6;
        const START_Y = 33;
        const MARGIN_BOTTOM = 16;

        // Calcular altura de una ficha
        let fichaH = HEADER_H;
        categoriasOrdenadas.forEach(g => { fichaH += CAT_H + Math.ceil(g.campos.length / 2) * ROW_H; });

        let cursorY = 0;
        let primeraPag = true;

        datosExportados.forEach((u, idx) => {
          if (primeraPag || cursorY + fichaH > pageH - MARGIN_BOTTOM) {
            if (!primeraPag) doc.addPage();
            dibujarHeader();
            cursorY = START_Y;
            primeraPag = false;
          }

          const x = 12;
          const cardW = pageW - 24;

          // Fondo ficha
          doc.setFillColor(252, 252, 252);
          doc.setDrawColor(210, 210, 210);
          doc.roundedRect(x, cursorY, cardW, fichaH, 2, 2, 'FD');

          // Header ficha oscuro
          doc.setFillColor(30, 30, 30);
          doc.rect(x + 0.3, cursorY + 0.3, cardW - 0.6, HEADER_H, 'F');

          const nombreCompleto = `${u.nombre || ''} ${u.apellidos || ''}`.trim() || `Usuario #${u.idUsuario}`;
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.text(`${idx + 1}.  ${nombreCompleto}`, x + 4, cursorY + 6);

          if (u.rol || u.estatusMem) {
            doc.setFontSize(7);
            doc.setTextColor(200, 200, 200);
            const info = [u.rol, u.estatusMem].filter(Boolean).join('  •  ');
            doc.text(info, x + cardW - 4, cursorY + 6, { align: 'right' });
          }

          let dy = cursorY + HEADER_H;

          categoriasOrdenadas.forEach(({ cat, campos }) => {
            // Barra de categoría
            doc.setFillColor(235, 235, 235);
            doc.rect(x + 0.3, dy, cardW - 0.6, CAT_H, 'F');
            doc.setTextColor(100, 100, 100);
            doc.setFontSize(6.5);
            doc.setFont('helvetica', 'bold');
            doc.text(cat.toUpperCase(), x + 4, dy + 4);
            dy += CAT_H;

            const colMid = x + cardW / 2;

            campos.forEach((campo, ci) => {
              const isLeft = ci % 2 === 0;
              const rowY = dy + Math.floor(ci / 2) * ROW_H;
              const fx = isLeft ? x + 4 : colMid + 2;

              if (isLeft && ci > 0) {
                doc.setDrawColor(240, 240, 240);
                doc.line(x + 2, rowY, x + cardW - 2, rowY);
              }

              // Label
              doc.setTextColor(130, 130, 130);
              doc.setFontSize(6);
              doc.setFont('helvetica', 'normal');
              doc.text(campo.label, fx, rowY + 2.8);

              // Valor
              const val = formatVal(u[campo.key], campo.key) || '—';
              doc.setTextColor(25, 25, 25);
              doc.setFontSize(7.5);
              doc.setFont('helvetica', 'bold');
              doc.text(String(val).substring(0, 42), fx, rowY + 5.8);
            });

            dy += Math.ceil(campos.length / 2) * ROW_H;
          });

          cursorY += fichaH + CARD_GAP;
        });
      }

      // Footer en todas las páginas
      const totalPages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setDrawColor(200, 200, 200);
        doc.line(10, pageH - 13, pageW - 10, pageH - 13);
        doc.setFontSize(7);
        doc.setTextColor(150);
        doc.text('Atletify System', 14, pageH - 8);
        doc.text(`Página ${i} de ${totalPages}`, pageW - 14, pageH - 8, { align: 'right' });
      }

      doc.save(`Usuarios_${boxName}_${new Date().toLocaleDateString('es-MX').replace(/\//g, '-')}.pdf`);
    } catch (err) {
      console.error('Error al generar PDF:', err);
      alert('Error al generar el PDF: ' + err.message);
    }
  };

  const colsArray = ordenarColumnas(columnasSeleccionadas);

  return (
    <div className={`ebx-root ${fixedBox ? 'ebx-root--embedded' : ''}`}>
      {!fixedBox && (
        <h2 className="ebx-title">
          <i className="fas fa-database"></i> Exportar Base de Datos
        </h2>
      )}

      <div className="ebx-grid">
        {/* ── IZQUIERDA: CONFIGURACIÓN ── */}
        <div className="ebx-config">
          {/* Selector de Box (solo si no es fixedBox) */}
          {!fixedBox && (
            <div className="ebx-block">
              <label className="ebx-field-label"><i className="fas fa-warehouse"></i> Box a exportar</label>
              <button
                type="button"
                className={`ebx-picker-btn${exportBoxNombre ? ' ebx-picker-btn--active' : ''}`}
                onClick={() => { setBusquedaBox(''); setModalBoxOpen(true); }}
              >
                <span className="ebx-picker-btn__left">
                  <span className="ebx-picker-btn__icon"><i className="fas fa-warehouse" /></span>
                  <span className={`ebx-picker-btn__label${exportBoxNombre ? '' : ' ebx-picker-btn__label--placeholder'}`}>
                    {exportBoxNombre || 'Selecciona un Box…'}
                  </span>
                </span>
                <i className="fas fa-chevron-down ebx-picker-btn__arrow" />
              </button>
            </div>
          )}

          {/* Filtros (pickers modales en vez de <select> nativo) */}
          <div className="ebx-block">
            <div className="ebx-filtros">
              <div>
                <label className="ebx-field-label"><i className="fas fa-user-tag"></i> Rol</label>
                <button
                  type="button"
                  className={`ebx-picker-btn${filtroRolExport !== 'Todos' ? ' ebx-picker-btn--active' : ''}`}
                  style={{ '--pick-color': rolSel.color }}
                  onClick={() => setModalRolOpen(true)}
                >
                  <span className="ebx-picker-btn__left">
                    <span className="ebx-picker-btn__icon"><i className={`fas ${rolSel.icon}`} /></span>
                    <span className="ebx-picker-btn__label">{rolSel.label}</span>
                  </span>
                  <i className="fas fa-chevron-down ebx-picker-btn__arrow" />
                </button>
              </div>
              <div>
                <label className="ebx-field-label"><i className="fas fa-id-card"></i> Membresía</label>
                <button
                  type="button"
                  className={`ebx-picker-btn${filtroEstatusExport !== 'Todas' ? ' ebx-picker-btn--active' : ''}`}
                  style={{ '--pick-color': estatusSel.color }}
                  onClick={() => setModalEstatusOpen(true)}
                >
                  <span className="ebx-picker-btn__left">
                    <span className="ebx-picker-btn__icon"><i className={`fas ${estatusSel.icon}`} /></span>
                    <span className="ebx-picker-btn__label">{estatusSel.label}</span>
                  </span>
                  <i className="fas fa-chevron-down ebx-picker-btn__arrow" />
                </button>
              </div>
            </div>
          </div>

          {/* Selector de Columnas */}
          <div className="ebx-block">
            <div className="ebx-cols-head">
              <label className="ebx-field-label" style={{ marginBottom: 0 }}><i className="fas fa-table-columns"></i> Columnas a exportar</label>
              <div className="ebx-mini-actions">
                <button type="button" className="ebx-mini-btn ebx-mini-btn--ok" onClick={seleccionarTodas}>
                  <i className="fas fa-check-double" />Todas
                </button>
                <button type="button" className="ebx-mini-btn ebx-mini-btn--clear" onClick={limpiarSeleccion}>
                  <i className="fas fa-eraser" />Limpiar
                </button>
              </div>
            </div>

            <div className="ebx-cols-scroll">
              {Object.entries(COLUMNAS_EXPORTABLES).map(([categoria, columnas]) => {
                const todasActivas = columnas.every(c => columnasSeleccionadas.has(c.key));
                const algunaActiva = columnas.some(c => columnasSeleccionadas.has(c.key));
                const color = COLORES_CATEGORIA[categoria];
                return (
                  <div key={categoria} className={`ebx-cat${algunaActiva ? ' ebx-cat--active' : ''}`} style={{ '--cat-color': color }}>
                    <div className="ebx-cat-head" onClick={() => toggleCategoria(categoria)}>
                      <i className={`${ICONOS_CATEGORIA[categoria]} ebx-cat-icon`}></i>
                      <span className="ebx-cat-name">{categoria}</span>
                      <i
                        className={`fas ${todasActivas ? 'fa-check-square' : algunaActiva ? 'fa-minus-square' : 'fa-square'} ebx-cat-toggle`}
                        style={{ color: (todasActivas || algunaActiva) ? color : 'var(--text-muted)' }}
                      ></i>
                    </div>
                    <div className="ebx-cat-body">
                      {columnas.map(col => {
                        const on = columnasSeleccionadas.has(col.key);
                        return (
                          <label key={col.key} className={`ebx-check${on ? ' ebx-check--on' : ''}`}>
                            <input type="checkbox" checked={on} onChange={() => toggleColumna(col.key)} />
                            <span>{col.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Contador */}
          <div className="ebx-counter">
            <i className="fas fa-list-ol"></i>
            <span><strong>{columnasSeleccionadas.size}</strong> columnas seleccionadas</span>
          </div>

          <button
            className="ebx-primary-btn"
            onClick={cargarDatos}
            disabled={cargandoExport || (!fixedBox && !exportBoxId) || columnasSeleccionadas.size === 0}
          >
            {cargandoExport
              ? <><i className="fas fa-spinner fa-spin" />Cargando datos…</>
              : <><i className="fas fa-eye" />Previsualizar Datos</>
            }
          </button>
        </div>

        {/* ── DERECHA: PREVISUALIZACIÓN ── */}
        <div className="ebx-preview">
          {!exportPreview ? (
            <div className="ebx-empty">
              <i className="fas fa-file-export"></i>
              <p className="ebx-empty-title">Vista previa de datos</p>
              <p className="ebx-empty-sub">
                {fixedBox ? 'Selecciona columnas y filtros, luego pulsa “Previsualizar”.' : 'Selecciona un Box y columnas, luego pulsa “Previsualizar”.'}
              </p>
            </div>
          ) : (
            <>
              {/* Barra de resumen + descargas */}
              <div className="ebx-summary">
                <div className="ebx-summary-info">
                  <i className="fas fa-users"></i>
                  <strong>{datosExportados.length}</strong>
                  <span>registros encontrados</span>
                </div>
                <div className="ebx-dl-actions">
                  <button className="ebx-dl-btn ebx-dl-btn--excel" onClick={descargarXLSX}>
                    <i className="fas fa-file-excel" />Excel
                  </button>
                  <button className="ebx-dl-btn ebx-dl-btn--pdf" onClick={descargarPDF}>
                    <i className="fas fa-file-pdf" />PDF
                  </button>
                </div>
              </div>

              {/* Tabla de previsualización */}
              {datosExportados.length === 0 ? (
                <div className="ebx-table-empty">
                  <i className="fas fa-inbox"></i>
                  <p>No se encontraron usuarios con los filtros seleccionados.</p>
                </div>
              ) : (
                <div className="ebx-table-wrap">
                  <table className="ebx-table">
                    <thead>
                      <tr>
                        <th className="ebx-th-num">#</th>
                        {colsArray.map(k => <th key={k}>{getLabel(k)}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {datosExportados.map((u, idx) => (
                        <tr key={u.idUsuario || idx}>
                          <td className="ebx-td-num">{idx + 1}</td>
                          {colsArray.map(k => {
                            const val = u[k];
                            const rendered = formatVal(val, k);

                            if (typeof val === 'boolean') {
                              return <td key={k}><span className="ebx-pill" style={{ background: val ? 'rgba(46,204,113,0.18)' : 'rgba(136,136,136,0.18)', color: val ? '#6ee09b' : '#aaa' }}>{val ? '✓ Sí' : '✗ No'}</span></td>;
                            }
                            if (k === 'estatusMem') {
                              const map = { 'Activa': '#2ECC71', 'Vencida': '#E74C3C', 'Congelada': '#4FC3F7', 'VIP': '#F5A623', 'Sin Membresía': '#888' };
                              const c = map[val] || '#888';
                              return <td key={k}><span className="ebx-pill" style={{ background: `${c}22`, color: c }}>{rendered}</span></td>;
                            }
                            if (k === 'rol') {
                              const map = { 'Atleta': '#4FC3F7', 'Coach': '#F5A623', 'Staff': '#00B8C4', 'AdminBox': '#E63946' };
                              const c = map[val] || '#888';
                              return <td key={k}><span className="ebx-pill" style={{ background: `${c}22`, color: c }}>{rendered}</span></td>;
                            }
                            if ((k.includes('deuda') || k === 'precioCobrado') && typeof val === 'number') {
                              return <td key={k} style={{ color: val > 0 ? '#ef5350' : '#66bb6a', fontWeight: 700 }}>{rendered}</td>;
                            }
                            if (k === 'correo') {
                              return <td key={k} style={{ color: '#64b5f6' }}>{rendered}</td>;
                            }
                            if (k === 'rachaActual' && typeof val === 'number' && val > 0) {
                              return <td key={k} style={{ color: '#ff9800', fontWeight: 700 }}>🔥 {val}</td>;
                            }
                            return <td key={k}>{rendered}</td>;
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* MODAL: Filtro de Rol */}
      {modalRolOpen && (
        <OpcionPickerModal
          supertitulo="FILTRO"
          titulo="Filtrar por Rol"
          opciones={ROLES_EXPORT}
          valor={filtroRolExport}
          onSelect={(v) => { setFiltroRolExport(v); setExportPreview(false); setModalRolOpen(false); }}
          onCerrar={() => setModalRolOpen(false)}
        />
      )}

      {/* MODAL: Estatus de Membresía */}
      {modalEstatusOpen && (
        <OpcionPickerModal
          supertitulo="FILTRO"
          titulo="Estatus de Membresía"
          opciones={ESTATUS_EXPORT}
          valor={filtroEstatusExport}
          onSelect={(v) => { setFiltroEstatusExport(v); setExportPreview(false); setModalEstatusOpen(false); }}
          onCerrar={() => setModalEstatusOpen(false)}
        />
      )}

      {/* MODAL: Selector de Box con buscador */}
      {modalBoxOpen && createPortal(
        <div className="ebx-modal-overlay" onClick={e => { if (e.target === e.currentTarget) setModalBoxOpen(false); }}>
          <div className="ebx-modal">
            <div className="ebx-modal__header">
              <div>
                <p className="ebx-modal__supertitle">EXPORTAR</p>
                <h2 className="ebx-modal__title">Seleccionar Box</h2>
              </div>
              <button type="button" className="ebx-modal__close" onClick={() => setModalBoxOpen(false)} aria-label="Cerrar">
                <i className="fas fa-times" />
              </button>
            </div>

            <div className="ebx-modal__search">
              <i className="fas fa-search" />
              <input
                type="text"
                autoFocus
                placeholder="Buscar por nombre o ubicación…"
                value={busquedaBox}
                onChange={e => setBusquedaBox(e.target.value)}
              />
            </div>

            <div className="ebx-modal__list">
              {(() => {
                const filtrados = (boxes || []).filter(b => {
                  const q = busquedaBox.toLowerCase();
                  return (b.nombre || b.Nombre || '').toLowerCase().includes(q) ||
                         (b.ubicacion || b.Ubicacion || '').toLowerCase().includes(q);
                });
                if (!filtrados.length) return (
                  <div className="ebx-modal__empty">
                    <i className="fas fa-search" />
                    Sin resultados
                  </div>
                );
                return filtrados.map(b => {
                  const id  = String(b.idBox || b.IdBox);
                  const nom = b.nombre || b.Nombre;
                  const ubi = b.ubicacion || b.Ubicacion;
                  const activo = id === exportBoxId;
                  return (
                    <button
                      key={id}
                      type="button"
                      className={`ebx-opcion${activo ? ' ebx-opcion--activo' : ''}`}
                      onClick={() => {
                        setExportBoxId(id);
                        setExportBoxNombre(nom);
                        setExportPreview(false);
                        setDatosExportados([]);
                        setModalBoxOpen(false);
                      }}
                    >
                      <span className="ebx-opcion__icon">
                        {b.logo && b.logo.trim() !== ''
                          ? <img src={b.logo} alt={nom} />
                          : <i className="fas fa-warehouse" />
                        }
                      </span>
                      <span className="ebx-opcion__info">
                        <span className="ebx-opcion__nombre">{nom}</span>
                        {ubi && <span className="ebx-opcion__desc"><i className="fas fa-map-marker-alt" />{ubi}</span>}
                      </span>
                      {activo && <i className="fas fa-check-circle ebx-opcion__check" />}
                    </button>
                  );
                });
              })()}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL: Advertencia PDF muchas columnas */}
      {mostrarModalPDF && createPortal(
        <div className="ebx-modal-overlay" onClick={e => { if (e.target === e.currentTarget) setMostrarModalPDF(false); }}>
          <div className="ebx-modal ebx-confirm">
            <div className="ebx-confirm-icon">
              <i className="fas fa-exclamation-triangle"></i>
            </div>

            <h3 className="ebx-confirm-title">Documento extenso</h3>

            <p className="ebx-confirm-text">
              Estás exportando <strong>{columnasSeleccionadas.size} columnas</strong> con <strong>{datosExportados.length} usuarios</strong>.
            </p>
            <p className="ebx-confirm-text">
              El PDF se generará en <strong>formato de fichas individuales</strong> por usuario y podría ser un archivo extenso.
            </p>

            <div className="ebx-confirm-tip">
              <i className="fas fa-lightbulb"></i>
              <span>Para muchas columnas, <strong>Excel</strong> es ideal ya que soporta todas sin limitaciones.</span>
            </div>

            <div className="ebx-confirm-actions">
              <button type="button" className="ebx-confirm-btn ebx-confirm-btn--cancel" onClick={() => setMostrarModalPDF(false)}>
                Cancelar
              </button>
              <button type="button" className="ebx-confirm-btn ebx-confirm-btn--excel" onClick={() => { setMostrarModalPDF(false); descargarXLSX(); }}>
                <i className="fas fa-file-excel"></i> Excel
              </button>
              <button type="button" className="ebx-confirm-btn ebx-confirm-btn--pdf" onClick={() => { setMostrarModalPDF(false); generarPDFReal(); }}>
                <i className="fas fa-file-pdf"></i> Continuar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
