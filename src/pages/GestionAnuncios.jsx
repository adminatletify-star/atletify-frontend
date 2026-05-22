import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { globalAlert } from '../utils/globalAlert';
import './PagesCSS/GestionAnuncios.css';

const GestionAnuncios = () => {
  const [anuncios, setAnuncios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [form, setForm] = useState({
    idAnuncio: 0,
    titulo: '',
    mensaje: '',
    fechaInicio: '',
    fechaFin: '',
    aceptarDonaciones: false,
    metaDonacion: '',
    mostrarRankingDonadores: false,
    activo: true
  });

  // Estados para aportación manual
  const [miembros, setMiembros] = useState([]);
  const [showDonationModal, setShowDonationModal] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [donationForm, setDonationForm] = useState({
    idUsuario: '',
    monto: '',
    metodoPago: 'Efectivo'
  });

  const getBoxData = () => JSON.parse(localStorage.getItem('box')) || {};
  const box = getBoxData();

  useEffect(() => {
    fetchAnuncios();
    fetchMiembros();
  }, []);

  const fetchAnuncios = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/anuncios/admin/box/${box.idBox}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAnuncios(data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMiembros = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/usuarios/box/${box.idBox}/miembros`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMiembros(data.miembros || []);
      }
    } catch (error) {
      console.error('Error al cargar atletas:', error);
    }
  };

  const resetForm = () => {
    setForm({
      idAnuncio: 0,
      titulo: '',
      mensaje: '',
      fechaInicio: new Date().toISOString().split('T')[0],
      fechaFin: new Date(new Date().setDate(new Date().getDate() + 7)).toISOString().split('T')[0],
      aceptarDonaciones: false,
      metaDonacion: '',
      mostrarRankingDonadores: false,
      activo: true
    });
    setIsEditing(false);
  };

  const handleOpenModal = (anuncio = null) => {
    if (anuncio) {
      setForm({
        ...anuncio,
        fechaInicio: anuncio.fechaInicio.split('T')[0],
        fechaFin: anuncio.fechaFin.split('T')[0],
        metaDonacion: anuncio.metaDonacion || ''
      });
      setIsEditing(true);
    } else {
      resetForm();
    }
    setShowModal(true);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.titulo || !form.mensaje || !form.fechaInicio || !form.fechaFin) {
      return globalAlert.showError('Llena todos los campos obligatorios.');
    }

    const payload = {
      ...form,
      idBox: box.idBox,
      metaDonacion: form.metaDonacion ? parseFloat(form.metaDonacion) : null
    };

    try {
      const url = isEditing 
        ? `${import.meta.env.VITE_API_URL}/api/anuncios/${form.idAnuncio}`
        : `${import.meta.env.VITE_API_URL}/api/anuncios`;
        
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        globalAlert.showSuccess(isEditing ? 'Campaña actualizada.' : 'Campaña creada.');
        setShowModal(false);
        fetchAnuncios();
      } else {
        const errorData = await res.json();
        globalAlert.showError(errorData.mensaje || 'Error al guardar.');
      }
    } catch (error) {
      globalAlert.showError('Error de conexión.');
    }
  };

  const handleDelete = async (idAnuncio) => {
    if (!window.confirm('¿Estás seguro de eliminar este anuncio/campaña?')) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/anuncios/${idAnuncio}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        globalAlert.showSuccess('Eliminado correctamente.');
        fetchAnuncios();
      }
    } catch (error) {
      globalAlert.showError('Error al eliminar.');
    }
  };

  const handleOpenDonationModal = (anuncio) => {
    setSelectedCampaign(anuncio);
    setSearchTerm('');
    setDonationForm({
      idUsuario: '',
      monto: '',
      metodoPago: 'Efectivo'
    });
    setShowDonationModal(true);
  };

  const handleDonationSubmit = async (e) => {
    e.preventDefault();
    if (!donationForm.idUsuario || !donationForm.monto || parseFloat(donationForm.monto) <= 0) {
      return globalAlert.showError('Por favor selecciona un atleta e ingresa un monto válido mayor a 0.');
    }

    const payload = {
      idUsuario: parseInt(donationForm.idUsuario),
      monto: parseFloat(donationForm.monto),
      metodoPago: donationForm.metodoPago
    };

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/anuncios/${selectedCampaign.idAnuncio}/donar-manual`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        globalAlert.showSuccess('Aportación registrada con éxito.');
        setShowDonationModal(false);
        fetchAnuncios();
      } else {
        const errorData = await res.json();
        globalAlert.showError(errorData.mensaje || 'Error al registrar donación.');
      }
    } catch (error) {
      globalAlert.showError('Error de conexión al registrar donación.');
    }
  };

  return (
    <div className="gan-container" style={{ paddingTop: '100px', paddingBottom: '60px' }}>
      <div className="container py-4">
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-5 gap-3 pb-3 border-bottom border-secondary border-opacity-10">
          <div>
            <h2 className="fw-bold mb-0 text-white gan-title">
              <i className="fas fa-bullhorn text-warning me-3"></i>CAMPAÑAS Y ANUNCIOS
            </h2>
            <p className="gan-subtitle mt-2 mb-0">Crea avisos importantes y campañas de recaudación de fondos para tu comunidad de atletas.</p>
          </div>
          <div>
            <button className="btn btn-danger px-4 py-2.5 rounded-pill fw-bold shadow-sm" onClick={() => handleOpenModal()}>
              <i className="fas fa-plus me-2"></i> Nueva Campaña
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-danger" style={{ width: '3rem', height: '3rem' }}></div>
            <p className="text-secondary mt-3">Cargando anuncios...</p>
          </div>
        ) : (
          <div className="row g-4">
            {anuncios.map(a => (
              <div key={a.idAnuncio} className="col-12 col-md-6 col-lg-4">
                <div className={`gan-card h-100 ${a.aceptarDonaciones ? 'campaign-active' : ''}`}>
                  <div className="gan-card-body d-flex flex-column h-100">
                    <div className="d-flex justify-content-between align-items-start mb-3">
                      <span className={`badge ${a.activo ? 'gan-badge-active' : 'gan-badge-inactive'} px-3 py-2 rounded-pill`}>
                        {a.activo ? 'Activo' : 'Inactivo'}
                      </span>
                      <div className="d-flex gap-1">
                        <button className="btn btn-sm btn-outline-light border-0 p-2" onClick={() => handleOpenModal(a)} title="Editar">
                          <i className="fas fa-edit fs-6"></i>
                        </button>
                        <button className="btn btn-sm btn-outline-danger border-0 p-2" onClick={() => handleDelete(a.idAnuncio)} title="Eliminar">
                          <i className="fas fa-trash fs-6"></i>
                        </button>
                      </div>
                    </div>
                    
                    <h4 className="gan-card-title text-truncate">{a.titulo}</h4>
                    <p className="gan-card-text small flex-grow-1" style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {a.mensaje}
                    </p>

                    <div className="gan-card-footer">
                      <div className="gan-date-info mb-3">
                        <span><i className="far fa-calendar-alt text-warning me-1.5"></i> {new Date(a.fechaInicio).toLocaleDateString()}</span>
                        <span><i className="far fa-flag text-danger me-1.5"></i> {new Date(a.fechaFin).toLocaleDateString()}</span>
                      </div>

                      {a.aceptarDonaciones && (
                        <div className="p-3 rounded-3" style={{ backgroundColor: 'rgba(0,0,0,0.3)', border: '1px solid rgba(245, 166, 35, 0.2)' }}>
                          <div className="d-flex justify-content-between align-items-center mb-2">
                            <span className="small fw-bold text-warning"><i className="fas fa-hand-holding-heart me-1.5"></i> Recaudado</span>
                            <span className="small fw-bold text-white">${a.totalRecaudado?.toFixed(2) || '0.00'}</span>
                          </div>
                          {a.metaDonacion > 0 && (
                            <>
                              <div className="progress" style={{ height: '8px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '4px' }}>
                                <div className="progress-bar bg-warning progress-bar-striped progress-bar-animated" role="progressbar" style={{ width: `${Math.min((a.totalRecaudado / a.metaDonacion) * 100, 100)}%` }}></div>
                              </div>
                              <div className="d-flex justify-content-between text-white-50 small mt-1.5" style={{ fontSize: '0.75rem' }}>
                                <span>{Math.round((a.totalRecaudado / a.metaDonacion) * 100)}% de avance</span>
                                <span className="fw-bold">Meta: ${a.metaDonacion}</span>
                              </div>
                            </>
                          )}
                          <div className="mt-3">
                            <button 
                              className="btn btn-sm btn-outline-warning w-100 py-1.5 rounded-pill fw-bold" 
                              onClick={() => handleOpenDonationModal(a)}
                              style={{ borderStyle: 'dashed' }}
                            >
                              <i className="fas fa-plus me-1.5"></i> Aportación Manual
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {anuncios.length === 0 && (
              <div className="col-12 text-center text-secondary py-5 bg-dark rounded-4 border border-secondary border-opacity-10 my-4">
                <i className="fas fa-bullhorn fa-4x mb-3 text-warning opacity-50"></i>
                <h4 className="text-white fw-bold">No hay campañas ni anuncios</h4>
                <p className="small max-w-md mx-auto">Crea el primer aviso importante para que tus atletas lo visualicen al iniciar sesión o en su dashboard principal.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal rendered via Portal to prevent any parent container/navbar z-index overlaps */}
      {showModal && createPortal(
        <div className="gan-modal-overlay">
          <div className="gan-modal-card animate__animated animate__fadeIn">
            <div className="gan-modal-header">
              <h4 className="gan-modal-title">
                {isEditing ? 'EDITAR ANUNCIO / CAMPAÑA' : 'NUEVO ANUNCIO / CAMPAÑA'}
              </h4>
              <button type="button" className="gan-btn-close" onClick={() => setShowModal(false)} aria-label="Cerrar">
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            <div className="gan-modal-body">
              <form onSubmit={handleSubmit}>
                <div className="gan-form-group">
                  <label className="gan-label">
                    <i className="fas fa-heading text-danger"></i> Título del Anuncio
                  </label>
                  <input 
                    type="text" 
                    className="gan-input" 
                    name="titulo" 
                    value={form.titulo} 
                    onChange={handleChange} 
                    required 
                    placeholder="Ej. Campaña de Donativos para Renovación de Discos" 
                  />
                </div>

                <div className="gan-form-group">
                  <label className="gan-label">
                    <i className="fas fa-align-left text-danger"></i> Descripción / Detalles del Mensaje
                  </label>
                  <textarea 
                    className="gan-input" 
                    name="mensaje" 
                    value={form.mensaje} 
                    onChange={handleChange} 
                    rows="4" 
                    required 
                    placeholder="Escribe aquí de forma clara y detallada la información que verán los atletas..."
                  ></textarea>
                </div>

                <div className="row">
                  <div className="col-md-6 gan-form-group">
                    <label className="gan-label">
                      <i className="far fa-calendar-alt text-danger"></i> Fecha de Inicio
                    </label>
                    <input 
                      type="date" 
                      className="gan-input" 
                      name="fechaInicio" 
                      value={form.fechaInicio} 
                      onChange={handleChange} 
                      required 
                    />
                  </div>
                  <div className="col-md-6 gan-form-group">
                    <label className="gan-label">
                      <i className="far fa-calendar-check text-danger"></i> Fecha de Fin
                    </label>
                    <input 
                      type="date" 
                      className="gan-input" 
                      name="fechaFin" 
                      value={form.fechaFin} 
                      onChange={handleChange} 
                      required 
                    />
                  </div>
                </div>

                {/* Stripe Donations Block */}
                <div className={`gan-stripe-card ${form.aceptarDonaciones ? 'gan-stripe-active-border' : ''}`}>
                  <label className="gan-switch">
                    <input 
                      type="checkbox" 
                      className="gan-switch-input" 
                      name="aceptarDonaciones" 
                      checked={form.aceptarDonaciones} 
                      onChange={handleChange} 
                    />
                    <span className="gan-switch-slider slider-gold"></span>
                    <div>
                      <span className="fw-bold text-warning d-block" style={{ fontFamily: 'var(--font-heading-alt)', textTransform: 'uppercase', fontSize: '0.95rem', letterSpacing: '0.5px' }}>
                        <i className="fas fa-hand-holding-heart me-2"></i>Aceptar Donativos (Vía Stripe)
                      </span>
                      <span className="small text-white-50 d-block mt-1">
                        Habilita la opción de recibir aportaciones voluntarias de los atletas usando pasarela de pago seguro.
                      </span>
                    </div>
                  </label>

                  {form.aceptarDonaciones && (
                    <div className="ms-3 ps-3 border-start border-warning border-opacity-30 mt-4 animate__animated animate__fadeIn">
                      <div className="gan-form-group">
                        <label className="gan-label text-warning">
                          <i className="fas fa-money-bill-wave"></i> Meta de Donación (Opcional)
                        </label>
                        <input 
                          type="number" 
                          className="gan-input" 
                          name="metaDonacion" 
                          value={form.metaDonacion} 
                          onChange={handleChange} 
                          placeholder="Ej. 15000" 
                        />
                        <span className="small text-white-50 d-block mt-1" style={{ fontSize: '0.75rem' }}>Escribe la meta para mostrar un indicador visual de avance a los atletas.</span>
                      </div>
                      
                      <div className="form-check p-0 m-0">
                        <label className="gan-switch">
                          <input 
                            type="checkbox" 
                            className="gan-switch-input" 
                            name="mostrarRankingDonadores" 
                            checked={form.mostrarRankingDonadores} 
                            onChange={handleChange} 
                          />
                          <span className="gan-switch-slider"></span>
                          <div>
                            <span className="text-white fw-bold d-block" style={{ fontSize: '0.9rem' }}>
                              Mostrar Leaderboard de Donadores
                            </span>
                            <span className="small text-white-50 d-block mt-1">
                              Si se activa, se mostrará un ranking honorífico con las aportaciones y nombres de los atletas que donaron al dar click en la campaña.
                            </span>
                          </div>
                        </label>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mb-4 p-3 rounded-3" style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <label className="gan-switch">
                    <input 
                      type="checkbox" 
                      className="gan-switch-input" 
                      name="activo" 
                      checked={form.activo} 
                      onChange={handleChange} 
                    />
                    <span className="gan-switch-slider"></span>
                    <div>
                      <span className="fw-bold text-white d-block">
                        Campaña Activa
                      </span>
                      <span className="small text-white-50 d-block mt-0.5">Si está inactiva, la campaña no se mostrará a ningún atleta en el sistema.</span>
                    </div>
                  </label>
                </div>

                <div className="gan-modal-footer">
                  <button 
                    type="button" 
                    className="btn-gan-secondary" 
                    onClick={() => setShowModal(false)}
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    className="btn-gan-primary"
                  >
                    Guardar Campaña
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal de Aportación Manual */}
      {showDonationModal && selectedCampaign && createPortal(
        <div className="gan-modal-overlay">
          <div className="gan-modal-card animate__animated animate__fadeIn" style={{ maxWidth: '550px' }}>
            <div className="gan-modal-header" style={{ borderBottomColor: 'rgba(245, 166, 35, 0.15)' }}>
              <h4 className="gan-modal-title" style={{ color: '#f5a623', textShadow: '0 0 15px rgba(245, 166, 35, 0.2)' }}>
                <i className="fas fa-hand-holding-heart me-2"></i>REGISTRAR APORTACIÓN
              </h4>
              <button type="button" className="gan-btn-close" onClick={() => setShowDonationModal(false)} aria-label="Cerrar">
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            <div className="gan-modal-body">
              <div className="mb-4 p-3 rounded-3" style={{ backgroundColor: 'rgba(245, 166, 35, 0.05)', border: '1px solid rgba(245, 166, 35, 0.1)' }}>
                <span className="small text-white-50 d-block" style={{ fontSize: '0.78rem' }}>Campaña Seleccionada:</span>
                <span className="fw-bold text-white d-block fs-5 mt-0.5">{selectedCampaign.titulo}</span>
              </div>

              <form onSubmit={handleDonationSubmit}>
                {/* Selector de Atleta con buscador premium */}
                <div className="gan-form-group">
                  <label className="gan-label text-warning">
                    <i className="fas fa-user"></i> Seleccionar Atleta / Miembro
                  </label>
                  <div className="gan-search-wrapper">
                    <i className="fas fa-search"></i>
                    <input 
                      type="text" 
                      placeholder="Buscar atleta por nombre o correo..." 
                      value={searchTerm} 
                      onChange={(e) => setSearchTerm(e.target.value)} 
                    />
                  </div>

                  <div className="gan-atletas-list">
                    {miembros
                      .filter(m => {
                        if (!searchTerm) return true;
                        const term = searchTerm.toLowerCase();
                        return `${m.nombre || ''} ${m.apellidos || ''}`.toLowerCase().includes(term) || (m.correo || '').toLowerCase().includes(term);
                      })
                      .map(m => {
                        const isSelected = donationForm.idUsuario === String(m.idUsuario);
                        const nameInitials = (m.nombre || m.correo || 'U').charAt(0).toUpperCase();
                        const nombreCompleto = `${m.nombre || ''} ${m.apellidos || ''}`.trim() || (m.correo ? m.correo.split('@')[0] : 'Miembro');
                        return (
                          <div
                            key={m.idUsuario}
                            className={`gan-atleta-card ${isSelected ? 'selected' : ''}`}
                            onClick={() => setDonationForm(prev => ({ ...prev, idUsuario: String(m.idUsuario) }))}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                setDonationForm(prev => ({ ...prev, idUsuario: String(m.idUsuario) }));
                              }
                            }}
                          >
                            <div className="gan-atleta-avatar">
                              {m.foto
                                ? <img src={m.foto} alt={nombreCompleto} />
                                : <span>{nameInitials}</span>
                              }
                            </div>
                            <div className="gan-atleta-info">
                              <span className="gan-atleta-nombre">{nombreCompleto}</span>
                              <small className="gan-atleta-correo">{m.correo}</small>
                            </div>
                            <i className="fas fa-chevron-right gan-atleta-chevron" />
                          </div>
                        );
                      })
                    }
                    {miembros.filter(m => {
                      if (!searchTerm) return true;
                      const term = searchTerm.toLowerCase();
                      return `${m.nombre || ''} ${m.apellidos || ''}`.toLowerCase().includes(term) || (m.correo || '').toLowerCase().includes(term);
                    }).length === 0 && (
                      <div className="text-center py-4 text-white-50 small">
                        <i className="fas fa-user-slash d-block fs-3 mb-2 opacity-50"></i>
                        Ningún miembro coincide con la búsqueda.
                      </div>
                    )}
                  </div>
                </div>

                <div className="row">
                  {/* Monto de la donación */}
                  <div className="col-md-6 gan-form-group">
                    <label className="gan-label text-warning">
                      <i className="fas fa-dollar-sign"></i> Monto Donado ($)
                    </label>
                    <input 
                      type="number" 
                      className="gan-input" 
                      name="monto" 
                      value={donationForm.monto} 
                      onChange={(e) => setDonationForm(prev => ({ ...prev, monto: e.target.value }))}
                      required 
                      min="1"
                      step="any"
                      placeholder="Ej. 500" 
                    />
                  </div>

                  {/* Método de pago */}
                  <div className="col-md-6 gan-form-group">
                    <label className="gan-label text-warning">
                      <i className="fas fa-wallet"></i> Método de Pago
                    </label>
                    <select 
                      className="gan-input" 
                      name="metodoPago" 
                      value={donationForm.metodoPago} 
                      onChange={(e) => setDonationForm(prev => ({ ...prev, metodoPago: e.target.value }))}
                      required
                    >
                      <option value="Efectivo">Efectivo (Recepción)</option>
                      <option value="Transferencia">Transferencia Bancaria</option>
                      <option value="Tarjeta/Terminal">Tarjeta (Terminal Física)</option>
                    </select>
                  </div>
                </div>

                <div className="gan-modal-footer">
                  <button 
                    type="button" 
                    className="btn-gan-secondary" 
                    onClick={() => setShowDonationModal(false)}
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    className="btn-gan-primary"
                    style={{ background: '#f5a623', boxShadow: '0 4px 15px rgba(245, 166, 35, 0.3)' }}
                  >
                    Registrar Ingreso
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default GestionAnuncios;
