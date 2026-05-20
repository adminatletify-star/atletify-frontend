import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import BackButton from '../components/BackButton';
import ExportarBDTab from '../components/ExportarBDTab';
import ExportAuditoriaTab from '../components/ExportAuditoriaTab';
import '../assets/css/AdminPreregistros.css';

const TABS = [
  { id: 'admin',    label: 'AdminBox',        icon: 'fa-user-shield' },
  { id: 'atleta',   label: 'Atleta',           icon: 'fa-user' },
  { id: 'masivo',   label: 'Carga Masiva',     icon: 'fa-file-excel' },
  { id: 'historial',label: 'Historial',        icon: 'fa-history' },
  { id: 'exportar', label: 'Exportar BD',      icon: 'fa-database' },
  { id: 'auditoria',label: 'Logs Auditoría',   icon: 'fa-shield-alt' },
];

export default function AdminPreregistros() {
  const navigate = useNavigate();
  const [boxes, setBoxes]       = useState([]);
  const [loading, setLoading]   = useState(false);
  const [activeTab, setActiveTab] = useState('admin');

  const adminNombreRef   = useRef();
  const adminApellidosRef = useRef();
  const adminCorreoRef   = useRef();
  const adminBoxRef      = useRef();

  const atletaNombreRef    = useRef();
  const atletaApellidosRef = useRef();
  const atletaCorreoRef    = useRef();
  const atletaBoxRef       = useRef();
  const atletaTelefonoRef  = useRef();

  const masivoBoxRef = useRef();
  const [archivoMasivo, setArchivoMasivo] = useState(null);
  const [previewData, setPreviewData]     = useState([]);

  const [historial, setHistorial]             = useState([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem('usuario'));
    if (!u || (u.rol !== 'Developer' && u.rol !== 'AdminBox')) {
      navigate('/login');
      return;
    }
    cargarBoxes();
  }, [navigate]);

  useEffect(() => {
    if (activeTab === 'historial') cargarHistorial();
  }, [activeTab]);

  async function cargarBoxes() {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/box`);
      const data = await res.json();
      setBoxes(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); }
  }

  async function cargarHistorial() {
    setCargandoHistorial(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/preregistros/estatus`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) setHistorial(await res.json());
    } catch (e) { console.error(e); }
    finally { setCargandoHistorial(false); }
  }

  const handlePreregistroAdmin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const body = {
        nombre:    adminNombreRef.current.value,
        apellidos: adminApellidosRef.current.value,
        correo:    adminCorreoRef.current.value,
        idBox:     parseInt(adminBoxRef.current.value),
      };
      const res    = await fetch(`${import.meta.env.VITE_API_URL}/api/preregistros/admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify(body),
      });
      const result = await res.json();
      alert(result.mensaje || (res.ok ? 'Pre-registro exitoso.' : 'Error al pre-registrar.'));
      if (res.ok) e.target.reset();
    } catch { alert('Error de conexión'); }
    finally { setLoading(false); }
  };

  const handlePreregistroAtleta = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const body = {
        nombre:    atletaNombreRef.current.value,
        apellidos: atletaApellidosRef.current.value,
        correo:    atletaCorreoRef.current.value,
        telefono:  atletaTelefonoRef.current.value,
        idBox:     parseInt(atletaBoxRef.current.value),
      };
      const res    = await fetch(`${import.meta.env.VITE_API_URL}/api/preregistros/atleta`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify(body),
      });
      const result = await res.json();
      alert(result.mensaje || (res.ok ? 'Pre-registro exitoso.' : 'Error al pre-registrar.'));
      if (res.ok) e.target.reset();
    } catch { alert('Error de conexión'); }
    finally { setLoading(false); }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setArchivoMasivo(file);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const wb   = XLSX.read(evt.target.result, { type: 'binary' });
      const ws   = wb.Sheets[wb.SheetNames[0]];
      setPreviewData(XLSX.utils.sheet_to_json(ws));
    };
    reader.readAsBinaryString(file);
  };

  const excelSerialToISO = (v) =>
    (!v || isNaN(v)) ? null : new Date(Math.round((v - 25569) * 86400 * 1000)).toISOString();

  const procesarMasivo = async () => {
    if (!masivoBoxRef.current.value) return alert('Selecciona un Box');
    if (!previewData.length) return alert('No hay datos para procesar');
    setLoading(true);
    try {
      const atletas = previewData.map(row => ({
        nombre:                row['Nombre']?.toString(),
        apellidos:             row['Apellido']?.toString() || row['Apellidos']?.toString(),
        telefono:              row['Teléfono']?.toString() || row['Telefono']?.toString(),
        correo:                row['Correo']?.toString(),
        planActual:            row['Plan actual']?.toString(),
        precioPaga:            parseFloat(row['Precio que paga']) || null,
        motivoPrecioEspecial:  row['Motivo de ese precio']?.toString(),
        fechaVencimiento:      typeof row['Fecha de vencimiento'] === 'number' ? excelSerialToISO(row['Fecha de vencimiento']) : row['Fecha de vencimiento'],
        fechaPagoInscripcion:  typeof row['Si ya pagó inscripción (agregar fecha)'] === 'number' ? excelSerialToISO(row['Si ya pagó inscripción (agregar fecha)']) : row['Si ya pagó inscripción (agregar fecha)'],
        grupoFamiliar:         row['Si pertenece a un grupo o familia']?.toString(),
        categoria:             row['Categoría']?.toString() || row['Categoria']?.toString(),
        genero:                row['Género: hombre o mujer']?.toString() || row['Genero']?.toString(),
      })).filter(a => a.correo);

      const res    = await fetch(`${import.meta.env.VITE_API_URL}/api/preregistros/atletas-masivo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ idBox: parseInt(masivoBoxRef.current.value), atletas }),
      });
      const result = await res.json();
      alert(result.mensaje || (res.ok ? 'Carga exitosa.' : 'Error en carga masiva'));
      if (res.ok) { setPreviewData([]); setArchivoMasivo(null); }
    } catch { alert('Error de conexión'); }
    finally { setLoading(false); }
  };

  const estadoBadge = (estado) => {
    if (estado === 'Completado') return <span className="ap-badge ap-badge--completado"><i className="fas fa-check" />{estado}</span>;
    if (estado === 'Pendiente')  return <span className="ap-badge ap-badge--pendiente"><i className="fas fa-clock" />{estado}</span>;
    if (estado === 'Expirado')   return <span className="ap-badge ap-badge--expirado"><i className="fas fa-times" />{estado}</span>;
    return <span className="ap-badge ap-badge--pendiente">{estado}</span>;
  };

  return (
    <div className="ap-page">

      {/* ── HEADER ── */}
      <header className="ap-header">
        <div className="d-flex align-items-center gap-3">
          <BackButton to="/dashboard" />
          <div className="ap-header-icon d-none d-sm-flex">
            <i className="fas fa-envelope-open-text" />
          </div>
          <h1 className="ap-header-title">
            Centro de <span>Pre-registros</span>
          </h1>
        </div>
      </header>

      <div className="container-xl px-3 px-md-4">

        {/* ── TABS ── */}
        <div className="ap-tabs-wrap">
          <nav className="ap-tabs">
            {TABS.map(t => (
              <button
                key={t.id}
                className={`ap-tab ${activeTab === t.id ? 'ap-tab--active' : ''}`}
                onClick={() => setActiveTab(t.id)}
              >
                <i className={`fas ${t.icon}`} />
                {t.label}
              </button>
            ))}
          </nav>
        </div>

        {/* ── TAB ADMIN ── */}
        {activeTab === 'admin' && (
          <div className="ap-card ap-card--accent">
            <p className="ap-section-title ap-section-title--accent">
              <i className="fas fa-user-shield" />
              Pre-registrar Administrador de Box
            </p>
            <form onSubmit={handlePreregistroAdmin}>
              <div className="row g-3">
                <div className="col-12 col-md-6">
                  <label className="etiqueta-campo">Nombre</label>
                  <input type="text" className="entrada-oscura" ref={adminNombreRef} required />
                </div>
                <div className="col-12 col-md-6">
                  <label className="etiqueta-campo">Apellidos</label>
                  <input type="text" className="entrada-oscura" ref={adminApellidosRef} />
                </div>
                <div className="col-12 col-md-6">
                  <label className="etiqueta-campo">Correo electrónico</label>
                  <input type="email" className="entrada-oscura" ref={adminCorreoRef} required />
                </div>
                <div className="col-12 col-md-6">
                  <label className="etiqueta-campo">Box asignado</label>
                  <select className="entrada-oscura" ref={adminBoxRef} required>
                    <option value="">Selecciona un Box...</option>
                    {boxes.map(b => <option key={b.idBox} value={b.idBox}>{b.nombre}</option>)}
                  </select>
                </div>
                <div className="col-12 d-flex justify-content-end mt-2">
                  <button type="submit" className="ap-submit-btn ap-submit-btn--accent" disabled={loading}>
                    {loading
                      ? <><i className="fas fa-spinner fa-spin" /> Enviando...</>
                      : <><i className="fas fa-paper-plane" /> Enviar Invitación</>
                    }
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* ── TAB ATLETA INDIVIDUAL ── */}
        {activeTab === 'atleta' && (
          <div className="ap-card">
            <p className="ap-section-title ap-section-title--primary">
              <i className="fas fa-user" />
              Pre-registrar Atleta Individual
            </p>
            <form onSubmit={handlePreregistroAtleta}>
              <div className="row g-3">
                <div className="col-12 col-sm-6">
                  <label className="etiqueta-campo">Nombre</label>
                  <input type="text" className="entrada-oscura" ref={atletaNombreRef} required />
                </div>
                <div className="col-12 col-sm-6">
                  <label className="etiqueta-campo">Apellidos</label>
                  <input type="text" className="entrada-oscura" ref={atletaApellidosRef} />
                </div>
                <div className="col-12 col-md-4">
                  <label className="etiqueta-campo">Correo electrónico</label>
                  <input type="email" className="entrada-oscura" ref={atletaCorreoRef} required />
                </div>
                <div className="col-12 col-sm-6 col-md-4">
                  <label className="etiqueta-campo">Teléfono</label>
                  <input type="text" className="entrada-oscura" ref={atletaTelefonoRef} />
                </div>
                <div className="col-12 col-sm-6 col-md-4">
                  <label className="etiqueta-campo">Box destino</label>
                  <select className="entrada-oscura" ref={atletaBoxRef} required>
                    <option value="">Selecciona un Box...</option>
                    {boxes.map(b => <option key={b.idBox} value={b.idBox}>{b.nombre}</option>)}
                  </select>
                </div>
                <div className="col-12 d-flex justify-content-end mt-2">
                  <button type="submit" className="ap-submit-btn" disabled={loading}>
                    {loading
                      ? <><i className="fas fa-spinner fa-spin" /> Enviando...</>
                      : <><i className="fas fa-paper-plane" /> Enviar Invitación</>
                    }
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* ── TAB CARGA MASIVA ── */}
        {activeTab === 'masivo' && (
          <div className="ap-card ap-card--success">
            <p className="ap-section-title ap-section-title--success">
              <i className="fas fa-file-excel" />
              Carga Masiva de Atletas
            </p>
            <div className="row g-4">

              {/* Controles */}
              <div className="col-12 col-md-4 d-flex flex-column gap-3">
                <div>
                  <label className="etiqueta-campo">Box destino</label>
                  <select className="entrada-oscura" ref={masivoBoxRef}>
                    <option value="">Selecciona un Box...</option>
                    {boxes.map(b => <option key={b.idBox} value={b.idBox}>{b.nombre}</option>)}
                  </select>
                </div>

                <div className="ap-upload-zone">
                  <input type="file" accept=".xlsx,.xls" onChange={handleFileUpload} />
                  <div className="ap-upload-icon"><i className="fas fa-cloud-upload-alt" /></div>
                  <p className="ap-upload-text">Haz clic o arrastra tu Excel aquí</p>
                  <p className="ap-upload-sub">Solo archivos .xlsx o .xls</p>
                </div>

                {archivoMasivo && (
                  <div className="ap-upload-success">
                    <i className="fas fa-check-circle" />
                    {archivoMasivo.name}
                  </div>
                )}

                <button
                  onClick={procesarMasivo}
                  className="ap-submit-btn ap-submit-btn--success w-100 justify-content-center"
                  disabled={loading || previewData.length === 0}
                >
                  {loading
                    ? <><i className="fas fa-spinner fa-spin" /> Procesando...</>
                    : <><i className="fas fa-rocket" /> Enviar {previewData.length} Invitaciones</>
                  }
                </button>
              </div>

              {/* Preview */}
              <div className="col-12 col-md-8">
                <p className="ap-section-title ap-section-title--success mb-2">
                  <i className="fas fa-eye" />
                  Previsualización (primeros 5)
                </p>
                {previewData.length > 0 ? (
                  <div className="ap-table-wrap">
                    <table className="ap-table">
                      <thead>
                        <tr>
                          <th>Nombre</th>
                          <th>Correo</th>
                          <th>Plan</th>
                          <th>Vencimiento</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewData.slice(0, 5).map((row, idx) => (
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
                  <div className="ap-preview-empty">
                    <span><i className="fas fa-eye-slash me-2" />Sube un archivo para previsualizar</span>
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

        {/* ── TAB HISTORIAL ── */}
        {activeTab === 'historial' && (
          <div className="ap-card ap-card--info">
            <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
              <p className="ap-section-title ap-section-title--info mb-0">
                <i className="fas fa-list-ul" />
                Estatus de Invitaciones
              </p>
              <button className="ap-refresh-btn" onClick={cargarHistorial}>
                <i className="fas fa-sync-alt" />
                Actualizar
              </button>
            </div>

            {cargandoHistorial ? (
              <div className="ap-loader">
                <div className="ap-spinner" />
                <p className="ap-loader-text">Cargando historial...</p>
              </div>
            ) : historial.length === 0 ? (
              <div className="ap-empty">
                <span><i className="fas fa-inbox me-2" />No hay invitaciones registradas.</span>
              </div>
            ) : (
              <div className="ap-table-wrap">
                <table className="ap-table">
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
                        <td style={{ color: 'var(--text-muted)', fontSize: '0.8em' }}>{h.correo}</td>
                        <td>
                          {h.rolEsperado === 'AdminBox'
                            ? <span className="ap-badge ap-badge--admin">{h.rolEsperado}</span>
                            : <span className="ap-badge ap-badge--atleta">{h.rolEsperado}</span>
                          }
                        </td>
                        <td>{h.nombreBox || '—'}</td>
                        <td>{estadoBadge(h.estado)}</td>
                        <td style={{ color: 'var(--text-muted)', fontSize: '0.78em', whiteSpace: 'nowrap' }}>
                          {new Date(h.expiracionToken).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── TAB EXPORTAR BD ── */}
        {activeTab === 'exportar' && (
          <ExportarBDTab boxes={boxes} />
        )}

        {/* ── TAB AUDITORÍA ── */}
        {activeTab === 'auditoria' && (
          <ExportAuditoriaTab />
        )}

      </div>
    </div>
  );
}
