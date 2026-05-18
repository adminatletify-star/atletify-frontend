import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import * as XLSX from 'xlsx';
import XLSX_STYLE from 'xlsx-js-style';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const API_BASE = import.meta.env.VITE_API_URL;

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
    <div className="tarjeta-panel p-4 slide-in" style={{ backgroundColor: fixedBox ? 'transparent' : ''}}>
      {!fixedBox && (
        <h4 className="text-white mb-4">
          <i className="fas fa-database me-2 text-danger"></i> Exportar Base de Datos de Usuarios
        </h4>
      )}

      <div className="row g-4">
        {/* COLUMNA IZQUIERDA: Configuración */}
        <div className="col-lg-5">
          {/* Selector de Box (solo si no es fixedBox) */}
          {!fixedBox && (
            <div className="mb-4">
              <label className="form-label text-white-50 fw-bold"><i className="fas fa-building me-1"></i> Box a exportar</label>
              <button
                type="button"
                onClick={() => { setBusquedaBox(''); setModalBoxOpen(true); }}
                style={{
                  width: '100%', background: 'var(--bg-input, #1a1a2e)', border: '1px solid var(--border, rgba(255,255,255,0.1))',
                  borderRadius: '8px', color: exportBoxNombre ? '#fff' : 'rgba(255,255,255,0.4)',
                  fontFamily: 'inherit', fontSize: '0.9rem', padding: '0.6rem 1rem',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  gap: '0.5rem', transition: 'border-color 0.2s', textAlign: 'left',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden' }}>
                  <i className="fas fa-warehouse" style={{ color: 'rgba(255,255,255,0.35)', flexShrink: 0 }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {exportBoxNombre || 'Selecciona un Box...'}
                  </span>
                </span>
                <i className="fas fa-search" style={{ color: 'rgba(255,255,255,0.35)', flexShrink: 0, fontSize: '0.8rem' }} />
              </button>
            </div>
          )}

          {/* Filtros */}
          <div className="row g-3 mb-4">
            <div className="col-6">
              <label className="form-label text-white-50 small fw-bold">Filtro por Rol</label>
              <select className="entrada-oscura" value={filtroRolExport} onChange={e => { setFiltroRolExport(e.target.value); setExportPreview(false); }}>
                <option value="Todos">Todos</option>
                <option value="Atleta">Atleta</option>
                <option value="Coach">Coach</option>
                <option value="Staff">Staff</option>
                <option value="AdminBox">AdminBox</option>
              </select>
            </div>
            <div className="col-6">
              <label className="form-label text-white-50 small fw-bold">Estatus Membresía</label>
              <select className="entrada-oscura" value={filtroEstatusExport} onChange={e => { setFiltroEstatusExport(e.target.value); setExportPreview(false); }}>
                <option value="Todas">Todas</option>
                <option value="Activa">Activa</option>
                <option value="Vencida">Vencida</option>
                <option value="Congelada">Congelada</option>
                <option value="VIP">VIP (Exentos)</option>
                <option value="Sin Membresía">Sin Membresía</option>
              </select>
            </div>
          </div>

          {/* Selector de Columnas */}
          <div className="mb-3">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <label className="form-label text-white-50 fw-bold mb-0"><i className="fas fa-columns me-1"></i> Columnas a exportar</label>
              <div className="d-flex gap-2">
                <button className="btn btn-sm btn-outline-success rounded-pill px-3" onClick={seleccionarTodas} style={{ fontSize: '0.7rem' }}>
                  <i className="fas fa-check-double me-1"></i>Todas
                </button>
                <button className="btn btn-sm btn-outline-secondary rounded-pill px-3" onClick={limpiarSeleccion} style={{ fontSize: '0.7rem' }}>
                  <i className="fas fa-eraser me-1"></i>Limpiar
                </button>
              </div>
            </div>

            <div style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: '4px' }}>
              {Object.entries(COLUMNAS_EXPORTABLES).map(([categoria, columnas]) => {
                const todasActivas = columnas.every(c => columnasSeleccionadas.has(c.key));
                const algunaActiva = columnas.some(c => columnasSeleccionadas.has(c.key));
                const color = COLORES_CATEGORIA[categoria];
                return (
                  <div key={categoria} className="mb-3 rounded-3 overflow-hidden" style={{ border: `1px solid ${algunaActiva ? color : 'rgba(255,255,255,0.08)'}`, transition: 'border-color 0.3s' }}>
                    {/* Header de categoría */}
                    <div 
                      className="d-flex align-items-center gap-2 px-3 py-2" 
                      style={{ background: `linear-gradient(135deg, ${color}15, transparent)`, cursor: 'pointer' }}
                      onClick={() => toggleCategoria(categoria)}
                    >
                      <i className={ICONOS_CATEGORIA[categoria]} style={{ color, fontSize: '0.85rem' }}></i>
                      <span className="fw-bold text-white" style={{ fontSize: '0.8rem' }}>{categoria}</span>
                      <span className="ms-auto">
                        <i className={`fas ${todasActivas ? 'fa-check-square' : algunaActiva ? 'fa-minus-square' : 'fa-square'}`} style={{ color: todasActivas ? color : '#666', fontSize: '0.85rem' }}></i>
                      </span>
                    </div>
                    {/* Checkboxes */}
                    <div className="px-3 py-2" style={{ background: 'rgba(0,0,0,0.2)' }}>
                      <div className="row g-1">
                        {columnas.map(col => (
                          <div key={col.key} className="col-6">
                            <label 
                              className="d-flex align-items-center gap-2 py-1 px-2 rounded-2" 
                              style={{ 
                                cursor: 'pointer', fontSize: '0.78rem', 
                                background: columnasSeleccionadas.has(col.key) ? `${color}20` : 'transparent',
                                transition: 'background 0.2s'
                              }}
                            >
                              <input 
                                type="checkbox" 
                                checked={columnasSeleccionadas.has(col.key)} 
                                onChange={() => toggleColumna(col.key)}
                                style={{ accentColor: color }}
                              />
                              <span className={columnasSeleccionadas.has(col.key) ? 'text-white' : 'text-white-50'}>
                                {col.label}
                              </span>
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Contador + Botón de previsualizar */}
          <div className="d-flex align-items-center justify-content-between mb-3 py-2 px-3 rounded-3" style={{ background: 'rgba(255,255,255,0.04)' }}>
            <span className="text-white-50" style={{ fontSize: '0.85rem' }}>
              <i className="fas fa-list-ol me-1"></i> <strong className="text-white">{columnasSeleccionadas.size}</strong> columnas seleccionadas
            </span>
          </div>

          <button 
            className="btn btn-danger w-100 rounded-pill fw-bold py-2 mb-3 shadow"
            onClick={cargarDatos}
            disabled={cargandoExport || (!fixedBox && !exportBoxId) || columnasSeleccionadas.size === 0}
          >
            {cargandoExport 
              ? <><i className="fas fa-spinner fa-spin me-2"></i>Cargando datos...</>
              : <><i className="fas fa-search me-2"></i>Previsualizar Datos</>
            }
          </button>
        </div>

        {/* COLUMNA DERECHA: Previsualización + Descarga */}
        <div className="col-lg-7">
          {!exportPreview ? (
            <div className="d-flex flex-column align-items-center justify-content-center h-100 text-white-50 bg-dark rounded-4 py-5" style={{ minHeight: '400px', border: '2px dashed rgba(255,255,255,0.08)' }}>
              <i className="fas fa-file-export fa-3x mb-3 opacity-50"></i>
              <p className="mb-1 fw-bold">Vista previa de datos</p>
              <p className="small mb-0">
                {fixedBox ? 'Selecciona columnas y filtros, luego haz clic en "Previsualizar"' : 'Selecciona un Box y columnas, luego haz clic en "Previsualizar"'}
              </p>
            </div>
          ) : (
            <>
              {/* Barra de resumen */}
              <div className="d-flex flex-wrap align-items-center gap-3 mb-3 p-3 rounded-3" style={{ background: 'linear-gradient(135deg, rgba(200,30,30,0.15), rgba(0,0,0,0.3))', border: '1px solid rgba(200,30,30,0.3)' }}>
                <div className="d-flex align-items-center gap-2">
                  <i className="fas fa-users text-danger"></i>
                  <span className="text-white fw-bold">{datosExportados.length}</span>
                  <span className="text-white-50 small">registros encontrados</span>
                </div>
                <div className="ms-auto d-flex gap-2">
                  <button className="btn btn-sm btn-success rounded-pill fw-bold px-3 shadow-sm" onClick={descargarXLSX}>
                    <i className="fas fa-file-excel me-1"></i> Excel
                  </button>
                  <button className="btn btn-sm btn-danger rounded-pill fw-bold px-3 shadow-sm" onClick={descargarPDF}>
                    <i className="fas fa-file-pdf me-1"></i> PDF
                  </button>
                </div>
              </div>

              {/* Tabla de previsualización */}
              {datosExportados.length === 0 ? (
                <div className="text-center py-5 text-white-50">
                  <i className="fas fa-inbox fa-3x mb-3 opacity-25"></i>
                  <p>No se encontraron usuarios con los filtros seleccionados.</p>
                </div>
              ) : (
                <div className="rounded-4 shadow-lg" style={{ maxHeight: '500px', overflowX: 'auto', overflowY: 'auto', border: '1px solid #333' }}>
                  <table style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse', background: '#000' }}>
                    <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
                      <tr>
                        <th style={{ background: '#b71c1c', color: '#fff', fontSize: '0.75rem', padding: '10px 14px', fontWeight: 700, letterSpacing: '0.5px', borderBottom: '2px solid #ff5252', textAlign: 'center' }}>#</th>
                        {colsArray.map(k => (
                          <th key={k} style={{ background: '#b71c1c', color: '#fff', whiteSpace: 'nowrap', fontSize: '0.75rem', padding: '10px 14px', fontWeight: 700, letterSpacing: '0.5px', borderBottom: '2px solid #ff5252' }}>
                            {getLabel(k)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {datosExportados.map((u, idx) => (
                        <tr key={u.idUsuario || idx} style={{ background: idx % 2 === 0 ? '#0d0d0d' : '#161616' }}>
                          <td style={{ padding: '8px 14px', color: '#666', fontWeight: 600, borderBottom: '1px solid #222', textAlign: 'center' }}>{idx + 1}</td>
                          {colsArray.map(k => {
                            const val = u[k];
                            let rendered = formatVal(val, k);
                            let cellStyle = { padding: '8px 14px', whiteSpace: 'nowrap', borderBottom: '1px solid #222', color: '#fff' };
                            let content = rendered;

                            if (typeof val === 'boolean') {
                              content = <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 600, background: val ? '#2e7d32' : '#555', color: '#fff' }}>{val ? '✓ Sí' : '✗ No'}</span>;
                            } else if (k === 'estatusMem') {
                              const bgMap = { 'Activa': '#2e7d32', 'Vencida': '#c62828', 'Congelada': '#0277bd', 'VIP': '#f9a825', 'Sin Membresía': '#555' };
                              const txtMap = { 'VIP': '#000' };
                              content = <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 600, background: bgMap[val] || '#555', color: txtMap[val] || '#fff' }}>{rendered}</span>;
                            } else if (k === 'rol') {
                              const bgMap = { 'Atleta': '#1565c0', 'Coach': '#f9a825', 'Staff': '#00838f', 'AdminBox': '#c62828' };
                              const txtMap = { 'Coach': '#000' };
                              content = <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 600, background: bgMap[val] || '#555', color: txtMap[val] || '#fff' }}>{rendered}</span>;
                            } else if ((k.includes('deuda') || k === 'precioCobrado') && typeof val === 'number') {
                              cellStyle.color = val > 0 ? '#ef5350' : '#66bb6a';
                              cellStyle.fontWeight = 700;
                            } else if (k === 'correo') {
                              cellStyle.color = '#64b5f6';
                            } else if (k === 'rachaActual' && typeof val === 'number' && val > 0) {
                              content = <span style={{ color: '#ff9800', fontWeight: 700 }}>🔥 {val}</span>;
                            }

                            return <td key={k} style={cellStyle}>{content}</td>;
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

      {/* MODAL: Selector de Box con buscador */}
      {modalBoxOpen && createPortal(
        <div
          onClick={() => setModalBoxOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: '#141420', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '1.5rem', width: '90%', maxWidth: '480px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 60px rgba(0,0,0,0.6)' }}
          >
            {/* Header modal */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <span style={{ color: '#fff', fontWeight: 700, fontSize: '0.95rem', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <i className="fas fa-warehouse" style={{ color: 'var(--primary, #e63946)' }} />
                Seleccionar Box
              </span>
              <button
                onClick={() => setModalBoxOpen(false)}
                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '1rem', cursor: 'pointer', padding: '0.25rem' }}
              >
                <i className="fas fa-times" />
              </button>
            </div>

            {/* Buscador */}
            <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
              <i className="fas fa-search" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.35)', fontSize: '0.82rem', pointerEvents: 'none' }} />
              <input
                type="text"
                autoFocus
                placeholder="Buscar por nombre o ubicación..."
                value={busquedaBox}
                onChange={e => setBusquedaBox(e.target.value)}
                style={{
                  width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '8px', color: '#fff', fontSize: '0.88rem', padding: '0.6rem 1rem 0.6rem 2.3rem', outline: 'none',
                }}
              />
            </div>

            {/* Lista de boxes */}
            <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              {(() => {
                const filtrados = (boxes || []).filter(b => {
                  const q = busquedaBox.toLowerCase();
                  return (b.nombre || b.Nombre || '').toLowerCase().includes(q) ||
                         (b.ubicacion || b.Ubicacion || '').toLowerCase().includes(q);
                });
                if (!filtrados.length) return (
                  <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.35)', padding: '2rem', fontSize: '0.85rem' }}>
                    <i className="fas fa-search" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '1.5rem' }} />
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
                      onClick={() => {
                        setExportBoxId(id);
                        setExportBoxNombre(nom);
                        setExportPreview(false);
                        setDatosExportados([]);
                        setModalBoxOpen(false);
                      }}
                      style={{
                        background: activo ? 'rgba(230,57,70,0.12)' : 'rgba(255,255,255,0.03)',
                        border: activo ? '1px solid rgba(230,57,70,0.4)' : '1px solid rgba(255,255,255,0.07)',
                        borderRadius: '10px', padding: '0.65rem 0.9rem', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '0.75rem', textAlign: 'left', transition: 'all 0.15s',
                      }}
                    >
                      <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {b.logo && b.logo.trim() !== ''
                          ? <img src={b.logo} alt={nom} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                          : <i className="fas fa-warehouse" style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem' }} />
                        }
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ color: activo ? '#fff' : 'rgba(255,255,255,0.85)', fontWeight: 700, fontSize: '0.88rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nom}</div>
                        {ubi && <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.74rem', display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.15rem' }}><i className="fas fa-map-marker-alt" />{ubi}</div>}
                      </div>
                      {activo && <i className="fas fa-check-circle" style={{ color: 'var(--primary, #e63946)', fontSize: '0.9rem', flexShrink: 0 }} />}
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
      {mostrarModalPDF && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', animation: 'fadeIn 0.2s ease' }}>
          <div style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: '16px', padding: '32px', maxWidth: '460px', width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
            {/* Icono */}
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(255,160,0,0.15)', border: '2px solid rgba(255,160,0,0.3)' }}>
                <i className="fas fa-exclamation-triangle" style={{ fontSize: '24px', color: '#ffa000' }}></i>
              </div>
            </div>

            {/* Título */}
            <h5 style={{ color: '#fff', textAlign: 'center', marginBottom: '12px', fontWeight: 700, fontSize: '1.1rem' }}>
              Documento extenso
            </h5>

            {/* Descripción */}
            <p style={{ color: '#aaa', textAlign: 'center', fontSize: '0.88rem', lineHeight: 1.6, marginBottom: '8px' }}>
              Estás exportando <strong style={{ color: '#fff' }}>{columnasSeleccionadas.size} columnas</strong> con <strong style={{ color: '#fff' }}>{datosExportados.length} usuarios</strong>.
            </p>
            <p style={{ color: '#999', textAlign: 'center', fontSize: '0.82rem', lineHeight: 1.5, marginBottom: '20px' }}>
              El PDF se generará en <strong style={{ color: '#ccc' }}>formato de fichas individuales</strong> por usuario y podría ser un archivo extenso.
            </p>

            {/* Sugerencia Excel */}
            <div style={{ background: 'rgba(76,175,80,0.1)', border: '1px solid rgba(76,175,80,0.25)', borderRadius: '10px', padding: '12px 16px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <i className="fas fa-lightbulb" style={{ color: '#66bb6a', fontSize: '16px' }}></i>
              <span style={{ color: '#a5d6a7', fontSize: '0.8rem' }}>
                Para muchas columnas, <strong style={{ color: '#66bb6a' }}>Excel</strong> es ideal ya que soporta todas sin limitaciones.
              </span>
            </div>

            {/* Botones */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                onClick={() => setMostrarModalPDF(false)}
                style={{ padding: '10px 20px', borderRadius: '10px', border: '1px solid #444', background: 'transparent', color: '#999', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, transition: 'all 0.2s' }}
              >
                Cancelar
              </button>
              <button
                onClick={() => { setMostrarModalPDF(false); descargarXLSX(); }}
                style={{ padding: '10px 20px', borderRadius: '10px', border: 'none', background: '#2e7d32', color: '#fff', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s' }}
              >
                <i className="fas fa-file-excel"></i> Exportar Excel
              </button>
              <button
                onClick={() => { setMostrarModalPDF(false); generarPDFReal(); }}
                style={{ padding: '10px 20px', borderRadius: '10px', border: 'none', background: '#c62828', color: '#fff', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s' }}
              >
                <i className="fas fa-file-pdf"></i> Continuar PDF
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
