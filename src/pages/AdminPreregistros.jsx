import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import * as XLSX from 'xlsx';
import '../assets/css/dashboard.css';

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

      </div>
    </div>
  );
}
