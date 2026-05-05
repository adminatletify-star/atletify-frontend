import { useState, useEffect } from 'react';
import { API_BASE_URL_CONST } from '../services/api';
import BotonSeguro from './BotonSeguro';
import TallaPlayeraPicker from './TallaPlayeraPicker';
import { createPortal } from 'react-dom';

export default function GestionJuecesPanel({ idCompetencia, colorTheme = 'info' }) {
  const [jueces, setJueces] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  
  // Modales
  const [modalAbierto, setModalAbierto] = useState(false);
  const [modalResetAbierto, setModalResetAbierto] = useState(false);
  const [modalContrasenaGenerada, setModalContrasenaGenerada] = useState(false);
  const [modalVerAbierto, setModalVerAbierto] = useState(false);
  const [modalEditarAbierto, setModalEditarAbierto] = useState(false);
  
  // Estados para Reset, Mostrar y Ver
  const [juezAEditar, setJuezAEditar] = useState(null);
  const [juezVer, setJuezVer] = useState(null);
  const [adminPassword, setAdminPassword] = useState('');
  const [contrasenaMostrada, setContrasenaMostrada] = useState('');

  // Formulario Creación
  const [form, setForm] = useState({
    nombre: '', apellidos: '', username: '', telefono: '', fechaNacimiento: '',
    tipoDeSangre: '', tieneDiscapacidad: '', tallaPlayera: '',
    contactoEmergenciaNombre: '', contactoEmergenciaTelefono: '',
    lesionesPrevias: '', alergias: ''
  });

  // Formulario Edición (Sin username)
  const [formEditar, setFormEditar] = useState({
    nombre: '', apellidos: '', telefono: '', fechaNacimiento: '',
    tipoDeSangre: '', tieneDiscapacidad: '', tallaPlayera: '',
    contactoEmergenciaNombre: '', contactoEmergenciaTelefono: '',
    lesionesPrevias: '', alergias: ''
  });

  useEffect(() => {
    cargarJueces();
  }, [idCompetencia]);

  const cargarJueces = async () => {
    setCargando(true);
    try {
      const res = await fetch(`${API_BASE_URL_CONST}/usuarios/jueces/${idCompetencia}`);
      if (res.ok) {
        setJueces(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCargando(false);
    }
  };

  const agregarJuez = async (e) => {
    e.preventDefault();
    
    if (!form.nombre || !form.apellidos || !form.username || !form.telefono || !form.fechaNacimiento || !form.tallaPlayera || !form.tipoDeSangre || !form.tieneDiscapacidad || !form.alergias || !form.lesionesPrevias || !form.contactoEmergenciaNombre || !form.contactoEmergenciaTelefono) {
      alert("Por favor completa todos los campos. Si no aplica alguno (ej. Discapacidad), escribe 'Ninguna'.");
      return;
    }

    setProcesando(true);

    const prefijo = form.nombre ? form.nombre.substring(0, 3).toUpperCase() : 'JUEZ';
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const nuevaPass = `${prefijo}-${randomNum}*`;

    try {
      const token = localStorage.getItem('token');
      const payload = {
        ...form,
        fechaNacimiento: form.fechaNacimiento ? form.fechaNacimiento : null,
        contrasena: nuevaPass,
        idCompetencia: Number(idCompetencia)
      };

      const res = await fetch(`${API_BASE_URL_CONST}/usuarios/registro-juez`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        setForm({
          nombre: '', apellidos: '', username: '', telefono: '', fechaNacimiento: '',
          tipoDeSangre: '', tieneDiscapacidad: '', tallaPlayera: '',
          contactoEmergenciaNombre: '', contactoEmergenciaTelefono: '',
          lesionesPrevias: '', alergias: ''
        });
        setModalAbierto(false);
        cargarJueces();

        setContrasenaMostrada(nuevaPass);
        setModalContrasenaGenerada(true);
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(errorData.mensaje || "Error al registrar el juez.");
      }
    } catch (err) {
      alert("Error de conexión.");
    } finally {
      setProcesando(false);
    }
  };

  const handleEditarJuez = async (e) => {
    e.preventDefault();
    if (!formEditar.nombre || !formEditar.apellidos || !formEditar.telefono || !formEditar.fechaNacimiento || !formEditar.tallaPlayera || !formEditar.tipoDeSangre || !formEditar.tieneDiscapacidad || !formEditar.alergias || !formEditar.lesionesPrevias || !formEditar.contactoEmergenciaNombre || !formEditar.contactoEmergenciaTelefono) {
      alert("Por favor completa todos los campos. Si no aplica alguno (ej. Discapacidad), escribe 'Ninguna'.");
      return;
    }

    setProcesando(true);
    try {
      const token = localStorage.getItem('token');
      const payload = {
        ...formEditar,
        fechaNacimiento: formEditar.fechaNacimiento ? formEditar.fechaNacimiento : null
      };

      const res = await fetch(`${API_BASE_URL_CONST}/usuarios/jueces/${juezAEditar.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        setModalEditarAbierto(false);
        cargarJueces();
        alert("Juez actualizado correctamente.");
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(errorData.mensaje || "Error al actualizar el juez.");
      }
    } catch (err) {
      alert("Error de conexión.");
    } finally {
      setProcesando(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setProcesando(true);

    const prefijo = juezAEditar.nombre ? juezAEditar.nombre.substring(0, 3).toUpperCase() : 'JUEZ';
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const nuevaPass = `${prefijo}-${randomNum}*`;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL_CONST}/usuarios/jueces/${juezAEditar.id}/reset-password`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({
          contrasenaAdmin: adminPassword,
          nuevaContrasena: nuevaPass
        })
      });
      
      if (res.ok) {
        setModalResetAbierto(false);
        setAdminPassword('');
        setContrasenaMostrada(nuevaPass);
        setModalContrasenaGenerada(true);
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(errorData.mensaje || "Error al resetear la contraseña.");
      }
    } catch (err) {
      alert("Error de conexión.");
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div className="cd-tab-fade">
      <div className="cd-section-header">
        <div>
          <h2 className="cd-section-h">Gestión de <span>Jueces</span></h2>
          <p className="cd-section-sub">Crea cuentas temporales para que los jueces puedan acceder al sistema de puntuación. Sus cuentas se desactivarán al finalizar la competencia.</p>
        </div>
        <div className="cd-section-actions">
          <button className={`cd-btn cd-btn--${colorTheme}-solid`} onClick={() => setModalAbierto(true)}>
            <i className="fas fa-plus-circle"></i>Crear Nuevo Juez
          </button>
        </div>
      </div>

      <div className="cd-section-header" style={{ borderBottom: '1px solid var(--border)', marginBottom: '1.25rem' }}>
        <span className="cd-card-titulo cd-card-titulo--white" style={{ fontSize: '0.85rem' }}>Jueces Registrados</span>
      </div>

      {cargando ? (
        <div className="cd-empty"><div className="spinner-wp mx-auto"></div></div>
      ) : jueces.length === 0 ? (
        <div className="cd-empty">
          <i className="fas fa-users-slash"></i>
          <p>No hay jueces registrados para esta competencia aún.</p>
        </div>
      ) : (
        <div className="row g-4">
          {jueces.map(j => (
            <div key={j.id} className="col-md-6 col-lg-4">
              <div className="cd-wod-card">
                <div className={`cd-wod-tip cd-wod-tip--${j.activo ? 'amrap' : 'peso'}`}></div>
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <h5 className="cd-wod-nombre" style={{ textTransform: 'none' }}>{j.nombre} {j.apellidos}</h5>
                  <span className={`cd-badge ${j.activo ? 'cd-badge--success' : 'cd-badge--danger'}`}>
                    {j.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
                <div className="cd-tipo-badge cd-tipo-badge--amrap" style={{ textTransform: 'none' }}>
                  <i className="fas fa-user-tag"></i>
                  {j.username}
                </div>
                {j.tallaPlayera && (
                  <div className="mt-2 text-muted" style={{ fontSize: '0.8rem' }}>
                    <i className="fas fa-tshirt me-1"></i>Talla: {j.tallaPlayera}
                  </div>
                )}
                
                <div className="d-flex gap-2 mt-3">
                  <button
                    className="cd-btn cd-btn--ghost cd-btn--sm flex-grow-1"
                    onClick={() => {
                      setJuezVer(j);
                      setModalVerAbierto(true);
                    }}
                    title="Ver Información"
                    style={{ border: '1px solid var(--border)' }}
                  >
                    <i className="fas fa-eye"></i>
                  </button>
                  <button
                    className="cd-btn cd-btn--ghost cd-btn--sm flex-grow-1 text-info"
                    onClick={() => {
                      setJuezAEditar(j);
                      setFormEditar({
                        nombre: j.nombre || '',
                        apellidos: j.apellidos || '',
                        telefono: j.telefono || '',
                        fechaNacimiento: j.fechaNacimiento ? j.fechaNacimiento.split('T')[0] : '',
                        tipoDeSangre: j.tipoDeSangre || '',
                        tieneDiscapacidad: j.tieneDiscapacidad || '',
                        tallaPlayera: j.tallaPlayera || '',
                        contactoEmergenciaNombre: j.contactoEmergenciaNombre || '',
                        contactoEmergenciaTelefono: j.contactoEmergenciaTelefono || '',
                        lesionesPrevias: j.lesionesPrevias || '',
                        alergias: j.alergias || ''
                      });
                      setModalEditarAbierto(true);
                    }}
                    title="Editar Información"
                    style={{ border: '1px solid var(--border)' }}
                  >
                    <i className="fas fa-pencil-alt"></i>
                  </button>
                  <button
                    className="cd-btn cd-btn--ghost cd-btn--sm flex-grow-1 text-warning"
                    onClick={() => {
                      setJuezAEditar(j);
                      setAdminPassword('');
                      setModalResetAbierto(true);
                    }}
                    title="Generar nueva contraseña"
                    style={{ border: '1px solid var(--border)' }}
                  >
                    <i className="fas fa-key"></i>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL DE VER JUEZ */}
      {modalVerAbierto && juezVer && createPortal(
        <div className="cd-herramienta-modal-overlay" onClick={() => setModalVerAbierto(false)}>
          <div className="cd-herramienta-modal" style={{ maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div className="cd-herramienta-modal-head mb-4">
              <h3 className="cd-herramienta-modal-title" style={{ fontSize: '1.25rem' }}>
                <i className="fas fa-id-card text-info me-2"></i>Información del Juez
              </h3>
              <button type="button" className="cd-btn cd-btn--ghost" onClick={() => setModalVerAbierto(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            <div className="row g-4">
              <div className="col-12">
                <h6 className="border-bottom pb-2 text-primary"><i className="fas fa-user me-2"></i>Datos Personales</h6>
                <div className="row mt-2">
                  <div className="col-sm-6 mb-2"><strong>Nombre:</strong> {juezVer.nombre} {juezVer.apellidos}</div>
                  <div className="col-sm-6 mb-2"><strong>Username:</strong> {juezVer.username}</div>
                  <div className="col-sm-6 mb-2"><strong>Teléfono:</strong> {juezVer.telefono || 'N/A'}</div>
                  <div className="col-sm-6 mb-2"><strong>Nacimiento:</strong> {juezVer.fechaNacimiento ? new Date(juezVer.fechaNacimiento).toLocaleDateString() : 'N/A'}</div>
                  <div className="col-sm-6 mb-2"><strong>Talla Playera:</strong> {juezVer.tallaPlayera || 'N/A'}</div>
                </div>
              </div>

              <div className="col-12">
                <h6 className="border-bottom pb-2 text-danger"><i className="fas fa-heartbeat me-2"></i>Datos Médicos y Emergencia</h6>
                <div className="row mt-2">
                  <div className="col-sm-6 mb-2"><strong>Tipo de Sangre:</strong> {juezVer.tipoDeSangre || 'N/A'}</div>
                  <div className="col-sm-6 mb-2"><strong>Discapacidad:</strong> {juezVer.tieneDiscapacidad || 'N/A'}</div>
                  <div className="col-sm-6 mb-2"><strong>Alergias:</strong> {juezVer.alergias || 'N/A'}</div>
                  <div className="col-sm-6 mb-2"><strong>Lesiones Previas:</strong> {juezVer.lesionesPrevias || 'N/A'}</div>
                  <div className="col-sm-6 mb-2"><strong>Contacto de Emergencia:</strong> {juezVer.contactoEmergenciaNombre || 'N/A'}</div>
                  <div className="col-sm-6 mb-2"><strong>Tel. de Emergencia:</strong> {juezVer.contactoEmergenciaTelefono || 'N/A'}</div>
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

      {/* MODAL DE EDICIÓN DE JUEZ */}
      {modalEditarAbierto && createPortal(
        <div className="cd-herramienta-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setModalEditarAbierto(false); }}>
          <div className="cd-herramienta-modal" style={{ maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="cd-herramienta-modal-head mb-3">
              <h3 className="cd-herramienta-modal-title" style={{ fontSize: '1.25rem' }}>
                <i className="fas fa-pencil-alt text-info me-2"></i>Editar Juez: {juezAEditar?.username}
              </h3>
              <button type="button" className="cd-btn cd-btn--ghost" onClick={() => setModalEditarAbierto(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            <form onSubmit={handleEditarJuez}>
              <h6 className="mt-2 mb-3 border-bottom pb-2" style={{ color: 'var(--text-primary)' }}><i className="fas fa-user me-2 text-muted"></i>Datos Personales</h6>
              
              <div className="row g-3 mb-4">
                <div className="col-md-6">
                  <label className="cd-label text-warning">Nombre(s) *</label>
                  <input type="text" className="cd-input" style={{ borderColor: 'var(--warning)' }} required value={formEditar.nombre} onChange={e => setFormEditar({...formEditar, nombre: e.target.value})} />
                </div>
                <div className="col-md-6">
                  <label className="cd-label text-warning">Apellidos *</label>
                  <input type="text" className="cd-input" style={{ borderColor: 'var(--warning)' }} required value={formEditar.apellidos} onChange={e => setFormEditar({...formEditar, apellidos: e.target.value})} />
                </div>
                <div className="col-md-6">
                  <label className="cd-label text-warning">Teléfono *</label>
                  <input type="text" className="cd-input" style={{ borderColor: 'var(--warning)' }} required value={formEditar.telefono} onChange={e => { const v = e.target.value.replace(/[^0-9]/g, ''); setFormEditar({...formEditar, telefono: v}) }} maxLength="10" />
                </div>
                <div className="col-md-6">
                  <label className="cd-label text-warning">Fecha de Nacimiento *</label>
                  <input type="date" className="cd-input" style={{ borderColor: 'var(--warning)' }} required value={formEditar.fechaNacimiento} onChange={e => setFormEditar({...formEditar, fechaNacimiento: e.target.value})} />
                </div>
                <div className="col-md-6">
                  <label className="cd-label text-warning">Talla de Playera *</label>
                  <TallaPlayeraPicker valor={formEditar.tallaPlayera} onCambiar={v => setFormEditar({...formEditar, tallaPlayera: v})} />
                </div>
              </div>

              <h6 className="mt-4 mb-3 border-bottom pb-2" style={{ color: 'var(--text-primary)' }}><i className="fas fa-heartbeat me-2 text-danger"></i>Datos Médicos y Emergencia</h6>

              <div className="row g-3 mb-4">
                <div className="col-md-6">
                  <label className="cd-label text-warning">Tipo de Sangre *</label>
                  <select className="cd-input" style={{ borderColor: 'var(--warning)' }} required value={formEditar.tipoDeSangre} onChange={e => setFormEditar({...formEditar, tipoDeSangre: e.target.value})}>
                    <option value="">Seleccionar...</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                  </select>
                </div>
                <div className="col-md-6">
                  <label className="cd-label text-warning">Discapacidad *</label>
                  <input type="text" className="cd-input" style={{ borderColor: 'var(--warning)' }} required value={formEditar.tieneDiscapacidad} onChange={e => setFormEditar({...formEditar, tieneDiscapacidad: e.target.value})} placeholder="Escribe 'Ninguna' si no aplica" />
                </div>
                <div className="col-md-6">
                  <label className="cd-label text-warning">Alergias *</label>
                  <input type="text" className="cd-input" style={{ borderColor: 'var(--warning)' }} required value={formEditar.alergias} onChange={e => setFormEditar({...formEditar, alergias: e.target.value})} placeholder="Escribe 'Ninguna' si no aplica" />
                </div>
                <div className="col-md-6">
                  <label className="cd-label text-warning">Lesiones Previas *</label>
                  <input type="text" className="cd-input" style={{ borderColor: 'var(--warning)' }} required value={formEditar.lesionesPrevias} onChange={e => setFormEditar({...formEditar, lesionesPrevias: e.target.value})} placeholder="Escribe 'Ninguna' si no aplica" />
                </div>
                <div className="col-md-6">
                  <label className="cd-label text-warning">Contacto de Emergencia *</label>
                  <input type="text" className="cd-input" style={{ borderColor: 'var(--warning)' }} required value={formEditar.contactoEmergenciaNombre} onChange={e => setFormEditar({...formEditar, contactoEmergenciaNombre: e.target.value})} />
                </div>
                <div className="col-md-6">
                  <label className="cd-label text-warning">Tel. Emergencia *</label>
                  <input type="text" className="cd-input" style={{ borderColor: 'var(--warning)' }} required value={formEditar.contactoEmergenciaTelefono} onChange={e => { const v = e.target.value.replace(/[^0-9]/g, ''); setFormEditar({...formEditar, contactoEmergenciaTelefono: v}) }} maxLength="10" />
                </div>
              </div>

              <div className="d-flex justify-content-end gap-3 mt-4">
                <button type="button" onClick={() => setModalEditarAbierto(false)} className="cd-btn cd-btn--outline">Cancelar</button>
                <BotonSeguro type="submit" className="cd-btn cd-btn--info-solid fw-bold" disabled={procesando} tiempoBloqueo={1500} textoProcesando="Actualizando...">
                  <i className="fas fa-save me-2"></i>Actualizar Juez
                </BotonSeguro>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL DE CREACIÓN DE JUEZ */}
      {modalAbierto && createPortal(
        <div
          className="cd-herramienta-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setModalAbierto(false);
          }}
        >
          <div className="cd-herramienta-modal" style={{ maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="cd-herramienta-modal-head mb-3">
              <h3 className="cd-herramienta-modal-title" style={{ fontSize: '1.25rem' }}>
                <i className={`fas fa-gavel text-${colorTheme} me-2`}></i>Registrar Nuevo Juez
              </h3>
              <button type="button" className="cd-btn cd-btn--ghost" onClick={() => setModalAbierto(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            <p className="text-muted mb-4" style={{ fontSize: '0.9rem' }}>La contraseña se generará automáticamente al guardar.</p>
            
            <form onSubmit={agregarJuez}>
              <h6 className="mt-2 mb-3 border-bottom pb-2" style={{ color: 'var(--text-primary)' }}><i className="fas fa-user me-2 text-muted"></i>Datos Personales</h6>
              
              <div className="row g-3 mb-4">
                <div className="col-md-6">
                  <label className="cd-label text-warning">Nombre(s) *</label>
                  <input type="text" className="cd-input" style={{ borderColor: 'var(--warning)' }} required value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} placeholder="Ej: Edwin" />
                </div>
                <div className="col-md-6">
                  <label className="cd-label text-warning">Apellidos *</label>
                  <input type="text" className="cd-input" style={{ borderColor: 'var(--warning)' }} required value={form.apellidos} onChange={e => setForm({...form, apellidos: e.target.value})} placeholder="Ej: Tun" />
                </div>
                <div className="col-md-6">
                  <label className="cd-label text-warning">Usuario (Username) *</label>
                  <input type="text" className="cd-input" style={{ borderColor: 'var(--warning)' }} required value={form.username} onChange={e => setForm({...form, username: e.target.value})} placeholder="Ej: juez_edwin" />
                </div>
                <div className="col-md-6">
                  <label className="cd-label text-warning">Teléfono *</label>
                  <input type="text" className="cd-input" style={{ borderColor: 'var(--warning)' }} required value={form.telefono} onChange={e => { const v = e.target.value.replace(/[^0-9]/g, ''); setForm({...form, telefono: v}) }} placeholder="10 dígitos" maxLength="10" />
                </div>
                <div className="col-md-6">
                  <label className="cd-label text-warning">Fecha de Nacimiento *</label>
                  <input type="date" className="cd-input" style={{ borderColor: 'var(--warning)' }} required value={form.fechaNacimiento} onChange={e => setForm({...form, fechaNacimiento: e.target.value})} />
                </div>
                <div className="col-md-6">
                  <label className="cd-label text-warning">Talla de Playera *</label>
                  <TallaPlayeraPicker valor={form.tallaPlayera} onCambiar={v => setForm({...form, tallaPlayera: v})} />
                </div>
              </div>

              <h6 className="mt-4 mb-3 border-bottom pb-2" style={{ color: 'var(--text-primary)' }}><i className="fas fa-heartbeat me-2 text-danger"></i>Datos Médicos y Emergencia</h6>

              <div className="row g-3 mb-4">
                <div className="col-md-6">
                  <label className="cd-label text-warning">Tipo de Sangre *</label>
                  <select className="cd-input" style={{ borderColor: 'var(--warning)' }} required value={form.tipoDeSangre} onChange={e => setForm({...form, tipoDeSangre: e.target.value})}>
                    <option value="">Seleccionar...</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                  </select>
                </div>
                <div className="col-md-6">
                  <label className="cd-label text-warning">Discapacidad *</label>
                  <input type="text" className="cd-input" style={{ borderColor: 'var(--warning)' }} required value={form.tieneDiscapacidad} onChange={e => setForm({...form, tieneDiscapacidad: e.target.value})} placeholder="Escribe 'Ninguna' si no aplica" />
                </div>
                <div className="col-md-6">
                  <label className="cd-label text-warning">Alergias *</label>
                  <input type="text" className="cd-input" style={{ borderColor: 'var(--warning)' }} required value={form.alergias} onChange={e => setForm({...form, alergias: e.target.value})} placeholder="Escribe 'Ninguna' si no aplica" />
                </div>
                <div className="col-md-6">
                  <label className="cd-label text-warning">Lesiones Previas *</label>
                  <input type="text" className="cd-input" style={{ borderColor: 'var(--warning)' }} required value={form.lesionesPrevias} onChange={e => setForm({...form, lesionesPrevias: e.target.value})} placeholder="Escribe 'Ninguna' si no aplica" />
                </div>
                <div className="col-md-6">
                  <label className="cd-label text-warning">Contacto de Emergencia *</label>
                  <input type="text" className="cd-input" style={{ borderColor: 'var(--warning)' }} required value={form.contactoEmergenciaNombre} onChange={e => setForm({...form, contactoEmergenciaNombre: e.target.value})} placeholder="Nombre completo" />
                </div>
                <div className="col-md-6">
                  <label className="cd-label text-warning">Tel. Emergencia *</label>
                  <input type="text" className="cd-input" style={{ borderColor: 'var(--warning)' }} required value={form.contactoEmergenciaTelefono} onChange={e => { const v = e.target.value.replace(/[^0-9]/g, ''); setForm({...form, contactoEmergenciaTelefono: v}) }} placeholder="10 dígitos" maxLength="10" />
                </div>
              </div>

              <div className="d-flex justify-content-end gap-3 mt-4">
                <button type="button" onClick={() => setModalAbierto(false)} className="cd-btn cd-btn--outline">Cancelar</button>
                <BotonSeguro type="submit" className={`cd-btn cd-btn--${colorTheme}-solid fw-bold`} disabled={procesando} tiempoBloqueo={1500} textoProcesando="Guardando...">
                  <i className="fas fa-save me-2"></i>Guardar Juez
                </BotonSeguro>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL RESET PASSWORD JUEZ */}
      {modalResetAbierto && juezAEditar && createPortal(
        <div className="cd-herramienta-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setModalResetAbierto(false); }}>
          <div className="cd-herramienta-modal" style={{ maxWidth: '400px' }}>
            <div className="cd-herramienta-modal-head mb-3">
              <h3 className="cd-herramienta-modal-title" style={{ fontSize: '1.2rem' }}>
                <i className="fas fa-key text-warning me-2"></i>Resetear Acceso
              </h3>
            </div>
            <p className="text-muted small mb-4">
              Ingresa tu contraseña de Administrador/Developer para generar una nueva contraseña aleatoria al juez <strong>{juezAEditar.nombre}</strong>.
            </p>
            <form onSubmit={handleResetPassword}>
              <div className="mb-4">
                <label className="cd-label text-warning">Tu Contraseña *</label>
                <input 
                  type="password" 
                  className="cd-input" 
                  style={{ borderColor: 'var(--warning)' }}
                  required 
                  value={adminPassword} 
                  onChange={e => setAdminPassword(e.target.value)} 
                  placeholder="Tu clave actual..."
                  autoFocus
                />
              </div>
              <div className="d-flex justify-content-end gap-2">
                <button type="button" onClick={() => setModalResetAbierto(false)} className="cd-btn cd-btn--outline cd-btn--sm">Cancelar</button>
                <BotonSeguro type="submit" className="cd-btn cd-btn--warning-solid cd-btn--sm fw-bold" disabled={procesando} textoProcesando="Validando...">
                  <i className="fas fa-sync-alt me-2"></i>Generar Nueva
                </BotonSeguro>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL CONTRASEÑA GENERADA (REEMPLAZA AL ALERT) */}
      {modalContrasenaGenerada && createPortal(
        <div className="cd-herramienta-modal-overlay" onClick={() => setModalContrasenaGenerada(false)}>
          <div className="cd-herramienta-modal text-center" style={{ maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
            <div className="mb-3 text-success">
              <i className="fas fa-check-circle fa-4x"></i>
            </div>
            <h3 className="cd-herramienta-modal-title mb-2" style={{ fontSize: '1.3rem', justifyContent: 'center' }}>
              ¡Contraseña Generada!
            </h3>
            <p className="text-muted small mb-4">
              Por favor, copia esta contraseña y envíasela al juez. <strong>Por seguridad, no volverá a mostrarse.</strong>
            </p>
            <div className="p-3 bg-dark rounded border border-secondary mb-4">
              <span style={{ fontSize: '1.8rem', letterSpacing: '3px', fontWeight: 'bold', color: 'var(--info)' }}>
                {contrasenaMostrada}
              </span>
            </div>
            <button 
              type="button" 
              className={`cd-btn cd-btn--${colorTheme}-solid w-100 fw-bold`} 
              onClick={() => {
                navigator.clipboard.writeText(contrasenaMostrada);
                setModalContrasenaGenerada(false);
                alert("¡Copiado al portapapeles!");
              }}
            >
              <i className="fas fa-copy me-2"></i>Copiar y Cerrar
            </button>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
