import { useState, useEffect } from 'react';
import { API_BASE_URL_CONST } from '../services/api';
import BotonSeguro from './BotonSeguro';
import TallaPlayeraPicker from './TallaPlayeraPicker';
import AtletifyLoader from './AtletifyLoader';
import { createPortal } from 'react-dom';

export default function GestionStaffCompePanel({ idCompetencia, colorTheme = 'primary' }) {
  const [staffList, setStaffList] = useState([]);
  const [tareasCat, setTareasCat] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  
  // Modales
  const [modalAbierto, setModalAbierto] = useState(false);
  const [modalVerAbierto, setModalVerAbierto] = useState(false);
  const [modalEditarAbierto, setModalEditarAbierto] = useState(false);
  const [modalTareasAbierto, setModalTareasAbierto] = useState(false);
  
  const [staffAEditar, setStaffAEditar] = useState(null);
  const [staffVer, setStaffVer] = useState(null);

  const [form, setForm] = useState({
    nombre: '', apellidos: '', telefono: '', fechaNacimiento: '',
    tipoDeSangre: '', tieneDiscapacidad: '', tallaPlayera: '',
    contactoEmergenciaNombre: '', contactoEmergenciaTelefono: '',
    lesionesPrevias: '', alergias: ''
  });

  const [formEditar, setFormEditar] = useState({
    nombre: '', apellidos: '', telefono: '', fechaNacimiento: '',
    tipoDeSangre: '', tieneDiscapacidad: '', tallaPlayera: '',
    contactoEmergenciaNombre: '', contactoEmergenciaTelefono: '',
    lesionesPrevias: '', alergias: ''
  });

  // Tareas Form
  const [nuevaTarea, setNuevaTarea] = useState('');
  const [tareasSeleccionadas, setTareasSeleccionadas] = useState([]);

  useEffect(() => {
    cargarDatos();
  }, [idCompetencia]);

  const cargarDatos = async () => {
    setCargando(true);
    await Promise.all([cargarStaff(), cargarTareasCat()]);
    setCargando(false);
  };

  const cargarStaff = async () => {
    try {
      const res = await fetch(`${API_BASE_URL_CONST}/usuarios/staff-compe/${idCompetencia}`);
      if (res.ok) setStaffList(await res.json());
    } catch (err) { console.error(err); }
  };

  const cargarTareasCat = async () => {
    try {
      const res = await fetch(`${API_BASE_URL_CONST}/tareascompetencia/${idCompetencia}`);
      if (res.ok) setTareasCat(await res.json());
    } catch (err) { console.error(err); }
  };

  const agregarStaff = async (e) => {
    e.preventDefault();
    if (!form.nombre || !form.apellidos || !form.telefono || !form.fechaNacimiento || !form.tallaPlayera || !form.tipoDeSangre || !form.tieneDiscapacidad || !form.alergias || !form.lesionesPrevias || !form.contactoEmergenciaNombre || !form.contactoEmergenciaTelefono) {
      alert("Por favor completa todos los campos. Si no aplica, escribe 'Ninguna'."); return;
    }
    setProcesando(true);
    try {
      const token = localStorage.getItem('token');
      const payload = { ...form, fechaNacimiento: form.fechaNacimiento || null, idCompetencia: Number(idCompetencia) };
      const res = await fetch(`${API_BASE_URL_CONST}/usuarios/registro-staff-compe`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setForm({ nombre: '', apellidos: '', telefono: '', fechaNacimiento: '', tipoDeSangre: '', tieneDiscapacidad: '', tallaPlayera: '', contactoEmergenciaNombre: '', contactoEmergenciaTelefono: '', lesionesPrevias: '', alergias: '' });
        setModalAbierto(false);
        cargarStaff();
      } else { const errorData = await res.json().catch(() => ({})); alert(errorData.mensaje || "Error al registrar."); }
    } catch (err) { alert("Error de conexión."); } finally { setProcesando(false); }
  };

  const handleEditarStaff = async (e) => {
    e.preventDefault();
    if (!formEditar.nombre || !formEditar.apellidos || !formEditar.telefono || !formEditar.fechaNacimiento || !formEditar.tallaPlayera || !formEditar.tipoDeSangre || !formEditar.tieneDiscapacidad || !formEditar.alergias || !formEditar.lesionesPrevias || !formEditar.contactoEmergenciaNombre || !formEditar.contactoEmergenciaTelefono) {
      alert("Por favor completa todos los campos."); return;
    }
    setProcesando(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL_CONST}/usuarios/staff-compe/${staffAEditar.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ ...formEditar, fechaNacimiento: formEditar.fechaNacimiento || null })
      });
      if (res.ok) { setModalEditarAbierto(false); cargarStaff(); alert("Actualizado correctamente."); }
      else { const errorData = await res.json().catch(() => ({})); alert(errorData.mensaje || "Error al actualizar."); }
    } catch (err) { alert("Error de conexión."); } finally { setProcesando(false); }
  };

  const crearTarea = async () => {
    if(!nuevaTarea.trim()) return;
    setProcesando(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL_CONST}/tareascompetencia`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ idCompetencia: Number(idCompetencia), nombre: nuevaTarea })
      });
      if(res.ok) { setNuevaTarea(''); cargarTareasCat(); }
    } catch(e) { console.error(e); } finally { setProcesando(false); }
  };

  const eliminarTarea = async (idTarea) => {
    if(!window.confirm("¿Eliminar esta tarea del catálogo?")) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL_CONST}/tareascompetencia/${idTarea}`, {
        method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }
      });
      if(res.ok) { cargarDatos(); }
    } catch(e) {}
  };

  const guardarAsignacionTareas = async () => {
    setProcesando(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL_CONST}/tareascompetencia/staff/${staffAEditar.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ idsTareas: tareasSeleccionadas })
      });
      if(res.ok) { setModalTareasAbierto(false); cargarStaff(); }
    } catch(e) { console.error(e); } finally { setProcesando(false); }
  };

  // Resumen de Tallas
  const tallasResumen = staffList.reduce((acc, s) => {
    if(s.tallaPlayera) acc[s.tallaPlayera] = (acc[s.tallaPlayera] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="cd-tab-fade">
      <div className="cd-section-header">
        <div>
          <h2 className="cd-section-h">Staff <span>Operativo</span></h2>
          <p className="cd-section-sub">Gestiona a tu equipo de montaje, limpieza, seguridad, etc. Asigna tareas y consolida sus tallas de playera.</p>
        </div>
        <div className="cd-section-actions">
          <button className={`cd-btn cd-btn--${colorTheme}-solid`} onClick={() => setModalAbierto(true)}>
            <i className="fas fa-user-plus"></i>Agregar Staff
          </button>
        </div>
      </div>

      {Object.keys(tallasResumen).length > 0 && (
        <div className="cd-card mb-4" style={{ background: 'rgba(0,0,0,0.2)' }}>
          <div className="cd-card-header">
            <h5 className="cd-card-titulo cd-card-titulo--white"><i className="fas fa-tshirt me-2 text-info"></i>Resumen de Tallas para Imprenta</h5>
          </div>
          <div className="cd-card-body d-flex flex-wrap gap-3">
            {Object.entries(tallasResumen).map(([talla, count]) => (
              <div key={talla} className="cd-talla-card" style={{ padding: '0.8rem 1.5rem' }}>
                <div className="cd-talla-letra" style={{ fontSize: '1.2rem', marginBottom: 0 }}>{talla}</div>
                <div className="cd-talla-count" style={{ fontSize: '1rem' }}>{count} <span className="cd-talla-unidad">unidades</span></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {cargando ? (
        <div className="cd-empty"><AtletifyLoader /></div>
      ) : staffList.length === 0 ? (
        <div className="cd-empty">
          <i className="fas fa-users-cog"></i>
          <p>No hay personal de staff registrado aún.</p>
        </div>
      ) : (
        <div className="row g-4">
          {staffList.map(s => (
            <div key={s.id} className="col-md-6 col-lg-4">
              <div className="cd-wod-card">
                <div className="cd-wod-tip cd-wod-tip--amrap"></div>
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <h5 className="cd-wod-nombre" style={{ textTransform: 'none' }}>{s.nombre} {s.apellidos}</h5>
                  <span className={`cd-badge ${s.activo ? 'cd-badge--success' : 'cd-badge--danger'}`}>
                    {s.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
                
                {s.tallaPlayera && (
                  <div className="text-muted mb-2" style={{ fontSize: '0.8rem' }}>
                    <i className="fas fa-tshirt me-1"></i>Talla: {s.tallaPlayera}
                  </div>
                )}

                <div className="mb-3 d-flex flex-wrap gap-1">
                  {s.tareas && s.tareas.length > 0 ? (
                    s.tareas.map(t => (
                      <span key={t.idTarea} className="cd-tipo-badge" style={{ background: 'rgba(79,195,247,0.1)', border: '1px solid rgba(79,195,247,0.25)', color: 'var(--accent-cool)', marginBottom: 0, textTransform: 'none' }}>
                        {t.nombre}
                      </span>
                    ))
                  ) : (
                    <span className="text-muted" style={{ fontSize: '0.75rem', fontStyle: 'italic' }}>Sin tareas asignadas</span>
                  )}
                </div>
                
                <div className="d-flex gap-2 mt-auto">
                  <button className="cd-btn cd-btn--ghost cd-btn--sm flex-grow-1" onClick={() => { setStaffVer(s); setModalVerAbierto(true); }} style={{ border: '1px solid var(--border)' }} title="Ver Info"><i className="fas fa-eye"></i></button>
                  <button className="cd-btn cd-btn--ghost cd-btn--sm flex-grow-1 text-info" onClick={() => {
                      setStaffAEditar(s);
                      setFormEditar({ nombre: s.nombre || '', apellidos: s.apellidos || '', telefono: s.telefono || '', fechaNacimiento: s.fechaNacimiento ? s.fechaNacimiento.split('T')[0] : '', tipoDeSangre: s.tipoDeSangre || '', tieneDiscapacidad: s.tieneDiscapacidad || '', tallaPlayera: s.tallaPlayera || '', contactoEmergenciaNombre: s.contactoEmergenciaNombre || '', contactoEmergenciaTelefono: s.contactoEmergenciaTelefono || '', lesionesPrevias: s.lesionesPrevias || '', alergias: s.alergias || '' });
                      setModalEditarAbierto(true);
                  }} style={{ border: '1px solid var(--border)' }} title="Editar Info"><i className="fas fa-pencil-alt"></i></button>
                  <button className="cd-btn cd-btn--ghost cd-btn--sm flex-grow-1 text-warning" onClick={() => {
                      setStaffAEditar(s);
                      setTareasSeleccionadas(s.tareas.map(t => t.idTarea));
                      setModalTareasAbierto(true);
                  }} style={{ border: '1px solid var(--border)' }} title="Asignar Tareas"><i className="fas fa-tasks"></i></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Tareas */}
      {modalTareasAbierto && createPortal(
        <div className="cd-herramienta-modal-overlay" onClick={() => setModalTareasAbierto(false)}>
          <div className="cd-herramienta-modal" style={{ maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
            <div className="cd-herramienta-modal-head mb-3">
              <h3 className="cd-herramienta-modal-title"><i className="fas fa-tasks text-warning me-2"></i>Tareas de {staffAEditar?.nombre}</h3>
            </div>
            <div className="px-3 pb-3">
              <div className="d-flex gap-2 mb-4">
                <input type="text" className="cd-input" placeholder="Crear nueva tarea en catálogo..." value={nuevaTarea} onChange={e => setNuevaTarea(e.target.value)} />
                <BotonSeguro onClick={crearTarea} disabled={procesando} className="cd-btn cd-btn--primary">Crear</BotonSeguro>
              </div>
              <h6 className="text-muted mb-2">Selecciona las tareas para este staff:</h6>
              <div className="d-flex flex-column gap-2" style={{ maxHeight: '250px', overflowY: 'auto' }}>
                {tareasCat.length === 0 ? <p className="text-muted small">No hay tareas en el catálogo.</p> : tareasCat.map(t => (
                  <div key={t.idTarea} className="d-flex align-items-center justify-content-between p-2 border rounded" style={{ borderColor: 'var(--border)' }}>
                    <label className="d-flex align-items-center gap-2 mb-0" style={{ cursor: 'pointer', flex: 1 }}>
                      <input type="checkbox" checked={tareasSeleccionadas.includes(t.idTarea)} onChange={(e) => {
                        if(e.target.checked) setTareasSeleccionadas([...tareasSeleccionadas, t.idTarea]);
                        else setTareasSeleccionadas(tareasSeleccionadas.filter(id => id !== t.idTarea));
                      }} style={{ accentColor: 'var(--primary)' }} />
                      <span className="text-light">{t.nombre}</span>
                    </label>
                    <button type="button" className="cd-btn cd-btn--ghost cd-btn--xs text-danger" onClick={() => eliminarTarea(t.idTarea)}><i className="fas fa-trash"></i></button>
                  </div>
                ))}
              </div>
              <div className="text-end mt-4">
                <button type="button" onClick={() => setModalTareasAbierto(false)} className="cd-btn cd-btn--outline me-2">Cancelar</button>
                <BotonSeguro onClick={guardarAsignacionTareas} disabled={procesando} className="cd-btn cd-btn--warning-solid fw-bold">Guardar</BotonSeguro>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL VER STAFF */}
      {modalVerAbierto && staffVer && createPortal(
        <div className="cd-herramienta-modal-overlay" onClick={() => setModalVerAbierto(false)}>
          <div className="cd-herramienta-modal" style={{ maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div className="cd-herramienta-modal-head mb-4">
              <h3 className="cd-herramienta-modal-title" style={{ fontSize: '1.25rem' }}>
                <i className="fas fa-id-card text-info me-2"></i>Información de Staff
              </h3>
              <button type="button" className="cd-btn cd-btn--ghost" onClick={() => setModalVerAbierto(false)}><i className="fas fa-times"></i></button>
            </div>
            
            <div className="row g-4">
              <div className="col-12">
                <h6 className="border-bottom pb-2 text-primary"><i className="fas fa-user me-2"></i>Datos Personales</h6>
                <div className="row mt-2">
                  <div className="col-sm-6 mb-2"><strong>Nombre:</strong> {staffVer.nombre} {staffVer.apellidos}</div>
                  <div className="col-sm-6 mb-2"><strong>Teléfono:</strong> {staffVer.telefono || 'N/A'}</div>
                  <div className="col-sm-6 mb-2"><strong>Nacimiento:</strong> {staffVer.fechaNacimiento ? new Date(staffVer.fechaNacimiento).toLocaleDateString() : 'N/A'}</div>
                  <div className="col-sm-6 mb-2"><strong>Talla Playera:</strong> {staffVer.tallaPlayera || 'N/A'}</div>
                </div>
              </div>

              <div className="col-12">
                <h6 className="border-bottom pb-2 text-danger"><i className="fas fa-heartbeat me-2"></i>Datos Médicos y Emergencia</h6>
                <div className="row mt-2">
                  <div className="col-sm-6 mb-2"><strong>Tipo de Sangre:</strong> {staffVer.tipoDeSangre || 'N/A'}</div>
                  <div className="col-sm-6 mb-2"><strong>Discapacidad:</strong> {staffVer.tieneDiscapacidad || 'N/A'}</div>
                  <div className="col-sm-6 mb-2"><strong>Alergias:</strong> {staffVer.alergias || 'N/A'}</div>
                  <div className="col-sm-6 mb-2"><strong>Lesiones Previas:</strong> {staffVer.lesionesPrevias || 'N/A'}</div>
                  <div className="col-sm-6 mb-2"><strong>Contacto de Emergencia:</strong> {staffVer.contactoEmergenciaNombre || 'N/A'}</div>
                  <div className="col-sm-6 mb-2"><strong>Tel. de Emergencia:</strong> {staffVer.contactoEmergenciaTelefono || 'N/A'}</div>
                </div>
              </div>
            </div>

            <div className="mt-4 text-end">
              <button type="button" onClick={() => setModalVerAbierto(false)} className="cd-btn cd-btn--outline">Cerrar</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL CREAR/EDITAR reutilizando código de Jueces adaptado */}
      {modalEditarAbierto && createPortal(
        <div className="cd-herramienta-modal-overlay" onClick={() => setModalEditarAbierto(false)}>
          <div className="cd-herramienta-modal" style={{ maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div className="cd-herramienta-modal-head mb-3">
              <h3 className="cd-herramienta-modal-title"><i className="fas fa-pencil-alt text-info me-2"></i>Editar Staff</h3>
              <button type="button" className="cd-btn cd-btn--ghost" onClick={() => setModalEditarAbierto(false)}><i className="fas fa-times"></i></button>
            </div>
            <form onSubmit={handleEditarStaff}>
              <div className="row g-3 mb-4">
                <div className="col-md-6"><label className="cd-label">Nombre(s) *</label><input type="text" className="cd-input" required value={formEditar.nombre} onChange={e => setFormEditar({...formEditar, nombre: e.target.value})} /></div>
                <div className="col-md-6"><label className="cd-label">Apellidos *</label><input type="text" className="cd-input" required value={formEditar.apellidos} onChange={e => setFormEditar({...formEditar, apellidos: e.target.value})} /></div>
                <div className="col-md-6"><label className="cd-label">Teléfono *</label><input type="text" className="cd-input" required value={formEditar.telefono} onChange={e => setFormEditar({...formEditar, telefono: e.target.value.replace(/[^0-9]/g, '')})} maxLength="10" /></div>
                <div className="col-md-6"><label className="cd-label">Fecha de Nacimiento *</label><input type="date" className="cd-input" required value={formEditar.fechaNacimiento} onChange={e => setFormEditar({...formEditar, fechaNacimiento: e.target.value})} /></div>
                <div className="col-md-6"><label className="cd-label">Talla de Playera *</label><TallaPlayeraPicker valor={formEditar.tallaPlayera} onCambiar={v => setFormEditar({...formEditar, tallaPlayera: v})} /></div>
              </div>
              <h6 className="mt-4 mb-3 border-bottom pb-2 text-danger"><i className="fas fa-heartbeat me-2"></i>Datos Médicos y Emergencia</h6>
              <div className="row g-3 mb-4">
                <div className="col-md-6">
                  <label className="cd-label">Tipo de Sangre *</label>
                  <select className="cd-input" required value={formEditar.tipoDeSangre} onChange={e => setFormEditar({...formEditar, tipoDeSangre: e.target.value})}>
                    <option value="">Seleccionar...</option><option value="O+">O+</option><option value="O-">O-</option><option value="A+">A+</option><option value="A-">A-</option><option value="B+">B+</option><option value="B-">B-</option><option value="AB+">AB+</option><option value="AB-">AB-</option>
                  </select>
                </div>
                <div className="col-md-6"><label className="cd-label">Discapacidad *</label><input type="text" className="cd-input" required value={formEditar.tieneDiscapacidad} onChange={e => setFormEditar({...formEditar, tieneDiscapacidad: e.target.value})} /></div>
                <div className="col-md-6"><label className="cd-label">Alergias *</label><input type="text" className="cd-input" required value={formEditar.alergias} onChange={e => setFormEditar({...formEditar, alergias: e.target.value})} /></div>
                <div className="col-md-6"><label className="cd-label">Lesiones Previas *</label><input type="text" className="cd-input" required value={formEditar.lesionesPrevias} onChange={e => setFormEditar({...formEditar, lesionesPrevias: e.target.value})} /></div>
                <div className="col-md-6"><label className="cd-label">Contacto de Emergencia *</label><input type="text" className="cd-input" required value={formEditar.contactoEmergenciaNombre} onChange={e => setFormEditar({...formEditar, contactoEmergenciaNombre: e.target.value})} /></div>
                <div className="col-md-6"><label className="cd-label">Tel. Emergencia *</label><input type="text" className="cd-input" required value={formEditar.contactoEmergenciaTelefono} onChange={e => setFormEditar({...formEditar, contactoEmergenciaTelefono: e.target.value.replace(/[^0-9]/g, '')})} maxLength="10" /></div>
              </div>
              <div className="d-flex justify-content-end gap-3 mt-4">
                <button type="button" onClick={() => setModalEditarAbierto(false)} className="cd-btn cd-btn--outline">Cancelar</button>
                <BotonSeguro type="submit" className="cd-btn cd-btn--info-solid fw-bold" disabled={procesando} textoProcesando="Actualizando...">Actualizar Staff</BotonSeguro>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL CREAR STAFF */}
      {modalAbierto && createPortal(
        <div className="cd-herramienta-modal-overlay" onClick={() => setModalAbierto(false)}>
          <div className="cd-herramienta-modal" style={{ maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div className="cd-herramienta-modal-head mb-3">
              <h3 className="cd-herramienta-modal-title"><i className={`fas fa-user-plus text-${colorTheme} me-2`}></i>Registrar Staff Operativo</h3>
              <button type="button" className="cd-btn cd-btn--ghost" onClick={() => setModalAbierto(false)}><i className="fas fa-times"></i></button>
            </div>
            <form onSubmit={agregarStaff}>
              <div className="row g-3 mb-4">
                <div className="col-md-6"><label className="cd-label">Nombre(s) *</label><input type="text" className="cd-input" required value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} /></div>
                <div className="col-md-6"><label className="cd-label">Apellidos *</label><input type="text" className="cd-input" required value={form.apellidos} onChange={e => setForm({...form, apellidos: e.target.value})} /></div>
                <div className="col-md-6"><label className="cd-label">Teléfono *</label><input type="text" className="cd-input" required value={form.telefono} onChange={e => setForm({...form, telefono: e.target.value.replace(/[^0-9]/g, '')})} maxLength="10" /></div>
                <div className="col-md-6"><label className="cd-label">Fecha de Nacimiento *</label><input type="date" className="cd-input" required value={form.fechaNacimiento} onChange={e => setForm({...form, fechaNacimiento: e.target.value})} /></div>
                <div className="col-md-6"><label className="cd-label">Talla de Playera *</label><TallaPlayeraPicker valor={form.tallaPlayera} onCambiar={v => setForm({...form, tallaPlayera: v})} /></div>
              </div>
              <h6 className="mt-4 mb-3 border-bottom pb-2 text-danger"><i className="fas fa-heartbeat me-2"></i>Datos Médicos y Emergencia</h6>
              <div className="row g-3 mb-4">
                <div className="col-md-6">
                  <label className="cd-label">Tipo de Sangre *</label>
                  <select className="cd-input" required value={form.tipoDeSangre} onChange={e => setForm({...form, tipoDeSangre: e.target.value})}>
                    <option value="">Seleccionar...</option><option value="O+">O+</option><option value="O-">O-</option><option value="A+">A+</option><option value="A-">A-</option><option value="B+">B+</option><option value="B-">B-</option><option value="AB+">AB+</option><option value="AB-">AB-</option>
                  </select>
                </div>
                <div className="col-md-6"><label className="cd-label">Discapacidad *</label><input type="text" className="cd-input" required value={form.tieneDiscapacidad} onChange={e => setForm({...form, tieneDiscapacidad: e.target.value})} placeholder="Ej: Ninguna" /></div>
                <div className="col-md-6"><label className="cd-label">Alergias *</label><input type="text" className="cd-input" required value={form.alergias} onChange={e => setForm({...form, alergias: e.target.value})} placeholder="Ej: Ninguna" /></div>
                <div className="col-md-6"><label className="cd-label">Lesiones Previas *</label><input type="text" className="cd-input" required value={form.lesionesPrevias} onChange={e => setForm({...form, lesionesPrevias: e.target.value})} placeholder="Ej: Ninguna" /></div>
                <div className="col-md-6"><label className="cd-label">Contacto de Emergencia *</label><input type="text" className="cd-input" required value={form.contactoEmergenciaNombre} onChange={e => setForm({...form, contactoEmergenciaNombre: e.target.value})} /></div>
                <div className="col-md-6"><label className="cd-label">Tel. Emergencia *</label><input type="text" className="cd-input" required value={form.contactoEmergenciaTelefono} onChange={e => setForm({...form, contactoEmergenciaTelefono: e.target.value.replace(/[^0-9]/g, '')})} maxLength="10" /></div>
              </div>
              <div className="d-flex justify-content-end gap-3 mt-4">
                <button type="button" onClick={() => setModalAbierto(false)} className="cd-btn cd-btn--outline">Cancelar</button>
                <BotonSeguro type="submit" className={`cd-btn cd-btn--${colorTheme}-solid fw-bold`} disabled={procesando} textoProcesando="Guardando...">Guardar Staff</BotonSeguro>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
