import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import * as XLSX from 'xlsx';
import XLSX_STYLE from 'xlsx-js-style';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import '../assets/css/dashboard.css';

const API_BASE = import.meta.env.VITE_API_URL;

// Definición de columnas exportables agrupadas por categoría
const COLUMNAS_EXPORTABLES = {
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

const ICONOS_CATEGORIA = {
  'Datos Personales': 'fas fa-user',
  'Datos Financieros': 'fas fa-dollar-sign',
  'Datos Deportivos': 'fas fa-dumbbell',
  'Gamificación': 'fas fa-gamepad',
  'Datos Médicos': 'fas fa-medkit',
};

const COLORES_CATEGORIA = {
  'Datos Personales': '#4fc3f7',
  'Datos Financieros': '#ffd54f',
  'Datos Deportivos': '#ef5350',
  'Gamificación': '#ab47bc',
  'Datos Médicos': '#66bb6a',
};

export default function AdminPreregistros() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [boxes, setBoxes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('admin');
  
  // Refs para Admin
  const adminNombreRef = useRef();
  const adminApellidosRef = useRef();
  const adminCorreoRef = useRef();
  const adminBoxRef = useRef();

  // Refs para Atleta Individual
  const atletaNombreRef = useRef();
  const atletaApellidosRef = useRef();
  const atletaCorreoRef = useRef();
  const atletaBoxRef = useRef();
  const atletaTelefonoRef = useRef();

  // Masivo
  const masivoBoxRef = useRef();
  const [archivoMasivo, setArchivoMasivo] = useState(null);
  const [previewData, setPreviewData] = useState([]);

  // Historial
  const [historial, setHistorial] = useState([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);

  // === ESTADOS PARA EXPORTAR BD ===
  const [exportBoxId, setExportBoxId] = useState('');
  const [columnasSeleccionadas, setColumnasSeleccionadas] = useState(new Set(['nombre', 'apellidos', 'correo', 'telefono']));
  const [filtroRolExport, setFiltroRolExport] = useState('Todos');
  const [filtroEstatusExport, setFiltroEstatusExport] = useState('Todas');
  const [datosExportados, setDatosExportados] = useState([]);
  const [cargandoExport, setCargandoExport] = useState(false);
  const [exportPreview, setExportPreview] = useState(false);

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem('usuario'));
    if (!u || (u.rol !== 'Developer' && u.rol !== 'AdminBox')) {
      navigate('/login');
      return;
    }
    setUser(u);
    cargarBoxes();
    if(activeTab === 'historial') cargarHistorial();
  }, [navigate, activeTab]);

  async function cargarHistorial() {
    setCargandoHistorial(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/preregistros/estatus`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if(res.ok){
        const data = await res.json();
        setHistorial(data);
      }
    } catch(e) { console.error(e); }
    finally { setCargandoHistorial(false); }
  }

  async function cargarBoxes() {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/box`);
      const data = await res.json();
      setBoxes(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    }
  }

  const handlePreregistroAdmin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const body = {
        nombre: adminNombreRef.current.value,
        apellidos: adminApellidosRef.current.value,
        correo: adminCorreoRef.current.value,
        idBox: parseInt(adminBoxRef.current.value)
      };
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/preregistros/admin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(body)
      });
      
      const result = await response.json();
      if(response.ok) {
        alert(result.mensaje || "Pre-registro de Admin exitoso.");
        e.target.reset();
      } else {
        alert(result.mensaje || "Error al pre-registrar.");
      }
    } catch(err) {
      console.error(err);
      alert("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  const handlePreregistroAtleta = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const body = {
        nombre: atletaNombreRef.current.value,
        apellidos: atletaApellidosRef.current.value,
        correo: atletaCorreoRef.current.value,
        telefono: atletaTelefonoRef.current.value,
        idBox: parseInt(atletaBoxRef.current.value)
      };
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/preregistros/atleta`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(body)
      });
      
      const result = await response.json();
      if(response.ok) {
        alert(result.mensaje || "Pre-registro de Atleta exitoso.");
        e.target.reset();
      } else {
        alert(result.mensaje || "Error al pre-registrar.");
      }
    } catch(err) {
      console.error(err);
      alert("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setArchivoMasivo(file);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws);
      setPreviewData(data);
    };
    reader.readAsBinaryString(file);
  };

  const excelSerialDateToJSDate = (excelDate) => {
    if (!excelDate || isNaN(excelDate)) return null;
    return new Date(Math.round((excelDate - 25569) * 86400 * 1000)).toISOString();
  };

  const procesarMasivo = async () => {
    if(!masivoBoxRef.current.value) return alert("Selecciona un Box");
    if(previewData.length === 0) return alert("No hay datos para procesar");

    setLoading(true);
    try {
      const atletasMapeados = previewData.map(row => ({
        nombre: row['Nombre']?.toString(),
        apellidos: row['Apellido']?.toString() || row['Apellidos']?.toString(),
        telefono: row['Teléfono']?.toString() || row['Telefono']?.toString(),
        correo: row['Correo']?.toString(),
        planActual: row['Plan actual']?.toString(),
        precioPaga: parseFloat(row['Precio que paga']) || null,
        motivoPrecioEspecial: row['Motivo de ese precio']?.toString(),
        fechaVencimiento: typeof row['Fecha de vencimiento'] === 'number' ? excelSerialDateToJSDate(row['Fecha de vencimiento']) : row['Fecha de vencimiento'],
        fechaPagoInscripcion: typeof row['Si ya pagó inscripción (agregar fecha)'] === 'number' ? excelSerialDateToJSDate(row['Si ya pagó inscripción (agregar fecha)']) : row['Si ya pagó inscripción (agregar fecha)'],
        grupoFamiliar: row['Si pertenece a un grupo o familia']?.toString(),
        categoria: row['Categoría']?.toString() || row['Categoria']?.toString(),
        genero: row['Género: hombre o mujer']?.toString() || row['Genero']?.toString()
      })).filter(a => a.correo); // Solo mandamos los que tienen correo

      const body = {
        idBox: parseInt(masivoBoxRef.current.value),
        atletas: atletasMapeados
      };

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/preregistros/atletas-masivo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(body)
      });

      const result = await response.json();
      if(response.ok) {
        alert(result.mensaje);
        setPreviewData([]);
        setArchivoMasivo(null);
      } else {
        alert(result.mensaje || "Error en carga masiva");
      }
    } catch(err) {
      console.error(err);
      alert("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dash-page min-vh-100 pb-5">
      <div className="dash-hero pb-4 pt-5">
        <div className="container">
          <div className="d-flex align-items-center gap-3 mb-4">
            <button className="btn btn-outline-light rounded-circle" onClick={() => navigate(-1)} style={{ width: '40px', height: '40px' }}>
              <i className="fas fa-arrow-left"></i>
            </button>
            <div>
              <h2 className="dash-heading mb-0 text-white"><i className="fas fa-envelope-open-text me-2 text-warning"></i> Centro de Pre-registros</h2>
              <p className="text-white-50 mb-0">Envía invitaciones mágicas a Admins y Atletas</p>
            </div>
          </div>

          <div className="d-flex gap-3 mt-4 border-bottom border-secondary pb-2 overflow-auto">
            <button className={`btn ${activeTab === 'admin' ? 'btn-warning' : 'btn-outline-light'} px-4 rounded-pill fw-bold text-nowrap`} onClick={() => setActiveTab('admin')}>AdminBox</button>
            <button className={`btn ${activeTab === 'atleta' ? 'btn-primary' : 'btn-outline-light'} px-4 rounded-pill fw-bold text-nowrap`} onClick={() => setActiveTab('atleta')}>Atleta Individual</button>
            <button className={`btn ${activeTab === 'masivo' ? 'btn-success' : 'btn-outline-light'} px-4 rounded-pill fw-bold text-nowrap`} onClick={() => setActiveTab('masivo')}>Carga Masiva</button>
            <button className={`btn ${activeTab === 'historial' ? 'btn-info' : 'btn-outline-light'} px-4 rounded-pill fw-bold text-nowrap`} onClick={() => setActiveTab('historial')}><i className="fas fa-history me-2"></i>Historial</button>
            <button className={`btn ${activeTab === 'exportar' ? 'btn-danger' : 'btn-outline-light'} px-4 rounded-pill fw-bold text-nowrap`} onClick={() => setActiveTab('exportar')}><i className="fas fa-database me-2"></i>Exportar BD</button>
          </div>
        </div>
      </div>

      <div className="container mt-4">
        {/* TAB ADMIN */}
        {activeTab === 'admin' && (
          <div className="tarjeta-panel p-4 slide-in">
            <h4 className="text-white mb-4"><i className="fas fa-user-shield me-2 text-warning"></i> Pre-registrar Administrador</h4>
            <form onSubmit={handlePreregistroAdmin}>
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label text-white-50">Nombre</label>
                  <input type="text" className="entrada-oscura" ref={adminNombreRef} required />
                </div>
                <div className="col-md-6">
                  <label className="form-label text-white-50">Apellidos</label>
                  <input type="text" className="entrada-oscura" ref={adminApellidosRef} />
                </div>
                <div className="col-md-6">
                  <label className="form-label text-white-50">Correo Electrónico</label>
                  <input type="email" className="entrada-oscura" ref={adminCorreoRef} required />
                </div>
                <div className="col-md-6">
                  <label className="form-label text-white-50">Box Asignado</label>
                  <select className="entrada-oscura" ref={adminBoxRef} required>
                    <option value="">Selecciona un Box...</option>
                    {boxes.map(b => <option key={b.idBox} value={b.idBox}>{b.nombre}</option>)}
                  </select>
                </div>
                <div className="col-12 mt-4 text-end">
                  <button type="submit" className="btn btn-warning rounded-pill px-5 fw-bold" disabled={loading}>
                    {loading ? <i className="fas fa-spinner fa-spin"></i> : <><i className="fas fa-paper-plane me-2"></i> Enviar Invitación</>}
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* TAB ATLETA INDIVIDUAL */}
        {activeTab === 'atleta' && (
          <div className="tarjeta-panel p-4 slide-in">
            <h4 className="text-white mb-4"><i className="fas fa-user me-2 text-primary"></i> Pre-registrar Atleta Individual</h4>
            <form onSubmit={handlePreregistroAtleta}>
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label text-white-50">Nombre</label>
                  <input type="text" className="entrada-oscura" ref={atletaNombreRef} required />
                </div>
                <div className="col-md-6">
                  <label className="form-label text-white-50">Apellidos</label>
                  <input type="text" className="entrada-oscura" ref={atletaApellidosRef} />
                </div>
                <div className="col-md-4">
                  <label className="form-label text-white-50">Correo Electrónico</label>
                  <input type="email" className="entrada-oscura" ref={atletaCorreoRef} required />
                </div>
                <div className="col-md-4">
                  <label className="form-label text-white-50">Teléfono</label>
                  <input type="text" className="entrada-oscura" ref={atletaTelefonoRef} />
                </div>
                <div className="col-md-4">
                  <label className="form-label text-white-50">Box Destino</label>
                  <select className="entrada-oscura" ref={atletaBoxRef} required>
                    <option value="">Selecciona un Box...</option>
                    {boxes.map(b => <option key={b.idBox} value={b.idBox}>{b.nombre}</option>)}
                  </select>
                </div>
                <div className="col-12 mt-4 text-end">
                  <button type="submit" className="btn btn-primary rounded-pill px-5 fw-bold" disabled={loading}>
                    {loading ? <i className="fas fa-spinner fa-spin"></i> : <><i className="fas fa-paper-plane me-2"></i> Enviar Invitación</>}
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* TAB CARGA MASIVA */}
        {activeTab === 'masivo' && (
          <div className="tarjeta-panel p-4 slide-in">
            <h4 className="text-white mb-4"><i className="fas fa-file-excel me-2 text-success"></i> Carga Masiva de Atletas</h4>
            <div className="row g-4">
              <div className="col-md-4">
                <label className="form-label text-white-50">Box Destino</label>
                <select className="entrada-oscura mb-3" ref={masivoBoxRef}>
                  <option value="">Selecciona un Box...</option>
                  {boxes.map(b => <option key={b.idBox} value={b.idBox}>{b.nombre}</option>)}
                </select>
                
                <div className="border border-secondary border-2 border-dashed rounded-4 p-4 text-center cursor-pointer mb-3 position-relative" style={{backgroundColor: 'rgba(255,255,255,0.02)'}}>
                  <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} className="position-absolute top-0 start-0 w-100 h-100 opacity-0 cursor-pointer" />
                  <i className="fas fa-cloud-upload-alt fa-3x text-success mb-2"></i>
                  <p className="text-white mb-0 fw-bold">Haz clic o arrastra tu Excel aquí</p>
                  <small className="text-white-50">Solo archivos .xlsx o .xls</small>
                </div>
                {archivoMasivo && <p className="text-success fw-bold"><i className="fas fa-check-circle me-1"></i> Archivo cargado: {archivoMasivo.name}</p>}

                <button onClick={procesarMasivo} className="btn btn-success w-100 rounded-pill fw-bold" disabled={loading || previewData.length === 0}>
                  {loading ? <i className="fas fa-spinner fa-spin"></i> : <><i className="fas fa-rocket me-2"></i> Enviar {previewData.length} Invitaciones</>}
                </button>
              </div>
              <div className="col-md-8">
                <h5 className="text-white-50">Previsualización (Mostrando primeros 5)</h5>
                {previewData.length > 0 ? (
                  <div className="table-responsive rounded-3">
                    <table className="table table-dark table-hover mb-0">
                      <thead>
                        <tr>
                          <th>Nombre</th>
                          <th>Correo</th>
                          <th>Plan</th>
                          <th>Vencimiento</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewData.slice(0,5).map((row, idx) => (
                          <tr key={idx}>
                            <td>{row['Nombre']} {row['Apellido'] || row['Apellidos']}</td>
                            <td>{row['Correo']}</td>
                            <td>{row['Plan actual']}</td>
                            <td>{row['Fecha de vencimiento']}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="d-flex align-items-center justify-content-center h-100 text-white-50 bg-dark rounded-4" style={{minHeight: '200px'}}>
                    <p className="mb-0"><i className="fas fa-eye-slash me-2"></i> Sube un archivo para previsualizar</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB HISTORIAL */}
        {activeTab === 'historial' && (
          <div className="tarjeta-panel p-4 slide-in">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h4 className="text-white mb-0"><i className="fas fa-list-ul me-2 text-info"></i> Estatus de Invitaciones</h4>
              <button className="btn btn-sm btn-outline-info" onClick={cargarHistorial}><i className="fas fa-sync-alt me-1"></i> Actualizar</button>
            </div>
            
            {cargandoHistorial ? (
              <div className="text-center py-5"><i className="fas fa-spinner fa-spin fa-2x text-info"></i></div>
            ) : historial.length === 0 ? (
              <div className="text-center text-white-50 py-5">No hay invitaciones registradas.</div>
            ) : (
              <div className="table-responsive">
                <table className="table table-dark table-hover align-middle">
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th>Correo</th>
                      <th>Rol</th>
                      <th>Box</th>
                      <th>Estado</th>
                      <th>Expiración</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historial.map(h => (
                      <tr key={h.idPreregistro}>
                        <td>{h.nombre}</td>
                        <td>{h.correo}</td>
                        <td><span className={`badge ${h.rolEsperado === 'AdminBox' ? 'bg-warning text-dark' : 'bg-primary'}`}>{h.rolEsperado}</span></td>
                        <td>{h.nombreBox || 'N/A'}</td>
                        <td>
                          {h.estado === 'Completado' && <span className="badge bg-success"><i className="fas fa-check me-1"></i>Completado</span>}
                          {h.estado === 'Pendiente' && <span className="badge bg-secondary"><i className="fas fa-clock me-1"></i>Pendiente</span>}
                          {h.estado === 'Expirado' && <span className="badge bg-danger"><i className="fas fa-times me-1"></i>Expirado</span>}
                        </td>
                        <td className="text-white-50 small">{new Date(h.expiracionToken).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB EXPORTAR BD */}
        {activeTab === 'exportar' && (
          <ExportarBDTab
            boxes={boxes}
            exportBoxId={exportBoxId}
            setExportBoxId={setExportBoxId}
            columnasSeleccionadas={columnasSeleccionadas}
            setColumnasSeleccionadas={setColumnasSeleccionadas}
            filtroRolExport={filtroRolExport}
            setFiltroRolExport={setFiltroRolExport}
            filtroEstatusExport={filtroEstatusExport}
            setFiltroEstatusExport={setFiltroEstatusExport}
            datosExportados={datosExportados}
            setDatosExportados={setDatosExportados}
            cargandoExport={cargandoExport}
            setCargandoExport={setCargandoExport}
            exportPreview={exportPreview}
            setExportPreview={setExportPreview}
          />
        )}

      </div>
    </div>
  );
}

// ===================================================
// COMPONENTE: EXPORTAR BD TAB
// ===================================================
function ExportarBDTab({
  boxes, exportBoxId, setExportBoxId,
  columnasSeleccionadas, setColumnasSeleccionadas,
  filtroRolExport, setFiltroRolExport,
  filtroEstatusExport, setFiltroEstatusExport,
  datosExportados, setDatosExportados,
  cargandoExport, setCargandoExport,
  exportPreview, setExportPreview
}) {

  const [mostrarModalPDF, setMostrarModalPDF] = useState(false);

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
        alert('Error al cargar datos. Verifica permisos.');
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
    const boxName = boxes.find(b => b.idBox === parseInt(exportBoxId))?.nombre || 'Box';

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
    const boxName = boxes.find(b => b.idBox === parseInt(exportBoxId))?.nombre || 'Box';
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
    const boxName = boxes.find(b => b.idBox === parseInt(exportBoxId))?.nombre || 'Box';
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
    <div className="tarjeta-panel p-4 slide-in">
      <h4 className="text-white mb-4">
        <i className="fas fa-database me-2 text-danger"></i> Exportar Base de Datos de Usuarios
      </h4>

      <div className="row g-4">
        {/* COLUMNA IZQUIERDA: Configuración */}
        <div className="col-lg-5">
          {/* Selector de Box */}
          <div className="mb-4">
            <label className="form-label text-white-50 fw-bold"><i className="fas fa-building me-1"></i> Box a exportar</label>
            <select 
              className="entrada-oscura"
              value={exportBoxId}
              onChange={e => { setExportBoxId(e.target.value); setExportPreview(false); setDatosExportados([]); }}
            >
              <option value="">Selecciona un Box...</option>
              {boxes.map(b => <option key={b.idBox} value={b.idBox}>{b.nombre}</option>)}
            </select>
          </div>

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
            disabled={cargandoExport || !exportBoxId || columnasSeleccionadas.size === 0}
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
              <p className="small mb-0">Selecciona un Box y columnas, luego haz clic en "Previsualizar"</p>
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
