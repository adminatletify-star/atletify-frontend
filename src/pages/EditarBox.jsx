import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BOXES_ENDPOINT } from '../services/api';
import BackButton from '../components/BackButton';
import BotonSeguro from '../components/BotonSeguro';
import '../assets/css/EditarBox.css';

const API_BASE = 'https://localhost:7149/api';

const initialForm = {
  idBox: '', nombre: '', ubicacion: '', logo: '',
  slogan: '', descripcion: '',
  telefono: '', whatsApp: '', instagram: '', facebook: '',
  linkMaps: '', instruccionesLlegada: '',
  politicasCancelacion: '', politicasCongelacion: '', politicasReembolso: '', toleranciaRetardos: '',
  costoMensualidad: 0, costoMensualidadKids: 0
};

const initialConfig = {
  montoInscripcion: 250,
  mesCobroInscripcion: 1,
  mesesExencionNuevos: 3,
  costoGymMensual: '',
  costoVisitaGym: 50,
  costoDropIn: 80,
  costoPaqueteVisitas: 200,
  cantidadVisitasPaquete: 4,
  precioMinimoMensualidad: 100,
  permitirPagoMixto: true,
   modeloCorte: 'Individual',
  diaCorte: '',
  diasGracia: 0,
  prorratearNuevos: false,
  maxMesesRenovacionAnticipada: 12,
  anticipacionReservaHoras: 24,
  diasCerrado: '',
  stripeAccountId: '',
  absorberComisionTarjeta: false,
  compraMinimaTarjeta: 100
};

const DIAS_SEMANA = [
  'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'
];

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const TABS = [
  { id: 'identidad', label: 'Identidad',              icon: 'fas fa-id-card'        },
  { id: 'contacto',  label: 'Contacto y Ubicación',   icon: 'fas fa-map-marker-alt' },
  { id: 'politicas', label: 'Leyes de la Manada',     icon: 'fas fa-balance-scale'  },
  { id: 'horarios',  label: 'Horarios y Reservas',    icon: 'fas fa-clock'          },
  { id: 'finanzas',  label: 'Configuración Financiera', icon: 'fas fa-cogs'         },
];

export default function EditarBox() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [boxLocal, setBoxLocal] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [config, setConfig] = useState(initialConfig);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [activeTab, setActiveTab] = useState('identidad');

  const [horarios, setHorarios] = useState(
    DIAS_SEMANA.reduce((acc, dia) => ({ ...acc, [dia]: { abierto: true, apertura: '06:00', cierre: '22:00' } }), {})
  );

  const token = localStorage.getItem('token');
  const headersGet  = { 'Authorization': `Bearer ${token}` };
  const headersPost = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem('usuario'));
    const storedBox  = JSON.parse(localStorage.getItem('box'));

    if (!storedUser || !storedBox) { navigate('/login'); return; }
    if (storedUser.rol !== 'AdminBox' && storedUser.rol !== 'Developer') { navigate('/admin-box-panel'); return; }

    setUser(storedUser);
    setBoxLocal(storedBox);

    const boxIdSeguro = storedBox.idBox || storedBox.IdBox;
    cargarBox(boxIdSeguro);
    cargarConfiguracion(boxIdSeguro);
  }, [navigate]);

  async function cargarBox(idBox) {
    try {
      const response = await fetch(`${BOXES_ENDPOINT}/${idBox}`);
      if (!response.ok) throw new Error('No se pudo cargar la información del box.');
      const data = await response.json();

      setForm({
        idBox: data.idBox ?? data.IdBox ?? idBox,
        nombre: data.nombre ?? '',
        ubicacion: data.ubicacion ?? '',
        logo: data.logo ?? '',
        slogan: data.slogan ?? '',
        descripcion: data.descripcion ?? '',
        telefono: data.telefono ?? '',
        whatsApp: data.whatsApp ?? '',
        instagram: data.instagram ?? '',
        facebook: data.facebook ?? '',
        linkMaps: data.linkMaps ?? '',
        instruccionesLlegada: data.instruccionesLlegada ?? '',
        politicasCancelacion: data.politicasCancelacion ?? '',
        politicasCongelacion: data.politicasCongelacion ?? '',
        politicasReembolso: data.politicasReembolso ?? '',
        toleranciaRetardos: data.toleranciaRetardos ?? '',
        costoMensualidad: data.costoMensualidad ?? 0,
        costoMensualidadKids: data.costoMensualidadKids ?? 0,
      });
    } catch (err) { alert(err.message); }
    finally { setLoading(false); }
  }

  async function cargarConfiguracion(idBox) {
    try {
      const res = await fetch(`${API_BASE}/configuracionbox/${idBox}`, { headers: headersGet });
      if (res.ok) {
        const data = await res.json();
        setConfig({
          montoInscripcion: data.montoInscripcion ?? 250,
          mesCobroInscripcion: data.mesCobroInscripcion ?? 1,
          mesesExencionNuevos: data.mesesExencionNuevos ?? 3,
          costoGymMensual: data.costoGymMensual ?? '',
          costoVisitaGym: data.costoVisitaGym ?? 50,
          costoDropIn: data.costoDropIn ?? 80,
          costoPaqueteVisitas: data.costoPaqueteVisitas ?? 200,
          cantidadVisitasPaquete: data.cantidadVisitasPaquete ?? 4,
          precioMinimoMensualidad: data.precioMinimoMensualidad ?? 100,
          permitirPagoMixto: data.permitirPagoMixto ?? true,
           modeloCorte: data.modeloCorte ?? 'Individual',
          diaCorte: data.diaCorte ?? '',
          diasGracia: data.diasGracia ?? 0,
          prorratearNuevos: data.prorratearNuevos ?? false,
          maxMesesRenovacionAnticipada: data.maxMesesRenovacionAnticipada ?? 12,
          anticipacionReservaHoras: data.anticipacionReservaHoras ?? 24,
          diasCerrado: data.diasCerrado ?? '',
          stripeAccountId: data.stripeAccountId ?? '',
          absorberComisionTarjeta: data.absorberComisionTarjeta ?? false,
          compraMinimaTarjeta: data.compraMinimaTarjeta ?? 100
        });

        if (data.horariosApertura) {
          try {
            setHorarios(JSON.parse(data.horariosApertura));
          } catch(e) { console.error('Error parseando horarios:', e); }
        }
      }
    } catch (err) { console.error('Error cargando configuración:', err); }
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  }

  function handleConfigChange(e) {
    const { name, value, type, checked } = e.target;
    setConfig(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  }

  function handleHorarioChange(dia, campo, valor) {
    setHorarios(prev => ({
      ...prev,
      [dia]: { ...prev[dia], [campo]: valor }
    }));
  }

  function handleImageUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setForm(prev => ({ ...prev, logo: event.target?.result || '' }));
    };
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);

    const targetId = form.idBox || boxLocal?.idBox || boxLocal?.IdBox;
    if (!targetId) {
        alert("Error crítico: Se perdió el ID del Box en la memoria.");
        setSaving(false);
        return;
    }

    try {
      const response = await fetch(`${BOXES_ENDPOINT}/${targetId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({...form, idBox: targetId})
      });
      if (!response.ok) throw new Error('No se pudo actualizar el box.');

      const updatedBox = await response.json();
      localStorage.setItem('box', JSON.stringify(updatedBox));
      setBoxLocal(updatedBox);
      alert('¡Configuración del Box guardada con éxito! 🐺🔥');
    } catch (err) { alert(err.message); }
    finally { setSaving(false); }
  }

  async function guardarConfiguracion() {
    setSavingConfig(true);
    const idBox = boxLocal?.idBox || boxLocal?.IdBox;

    try {
      const res = await fetch(`${API_BASE}/configuracionbox/${idBox}`, {
        method: 'PUT',
        headers: headersPost,
        body: JSON.stringify({
          montoInscripcion: parseFloat(config.montoInscripcion) || 0,
          mesCobroInscripcion: parseInt(config.mesCobroInscripcion) || 1,
          mesesExencionNuevos: parseInt(config.mesesExencionNuevos) || 3,
          costoGymMensual: config.costoGymMensual ? parseFloat(config.costoGymMensual) : null,
          costoVisitaGym: config.costoVisitaGym ? parseFloat(config.costoVisitaGym) : null,
          costoDropIn: parseFloat(config.costoDropIn) || 0,
          costoPaqueteVisitas: config.costoPaqueteVisitas ? parseFloat(config.costoPaqueteVisitas) : null,
          cantidadVisitasPaquete: config.cantidadVisitasPaquete ? parseInt(config.cantidadVisitasPaquete) : null,
          precioMinimoMensualidad: config.precioMinimoMensualidad ? parseFloat(config.precioMinimoMensualidad) : null,
          permitirPagoMixto: config.permitirPagoMixto,
            modeloCorte: config.modeloCorte,
          diaCorte: config.diaCorte ? parseInt(config.diaCorte) : null,
          diasGracia: parseInt(config.diasGracia) || 0,
          prorratearNuevos: config.prorratearNuevos,
          maxMesesRenovacionAnticipada: parseInt(config.maxMesesRenovacionAnticipada) || 12,
          horariosApertura: JSON.stringify(horarios),
          diasCerrado: config.diasCerrado,
          anticipacionReservaHoras: parseInt(config.anticipacionReservaHoras) || 24,
          absorberComisionTarjeta: config.absorberComisionTarjeta,
          compraMinimaTarjeta: parseFloat(config.compraMinimaTarjeta) || 100
        })
      });

      const data = await res.json();
      if (res.ok) {
        alert('¡Configuración y Horarios guardados con éxito!');
      } else {
        alert(data.mensaje || 'Error al guardar la configuración.');
      }
    } catch (e) { alert('Error de conexión al guardar configuración.'); }
    finally { setSavingConfig(false); }
  }

  async function conectarStripe() {
    const idBox = boxLocal?.idBox || boxLocal?.IdBox;
    try {
      const res = await fetch(`${API_BASE}/finanzas/onboarding-stripe/${idBox}`, {
        method: 'POST',
        headers: headersPost
      });
      const data = await res.json();
      if (res.ok && data.url) {
        window.location.href = data.url;
      } else {
        alert(data.mensaje || 'Hubo un error al generar el enlace de conexión.');
      }
    } catch (err) {
      alert('Error de conexión con Stripe.');
    }
  }

  if (loading) return (
    <div className="eb-page d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
      <div className="spinner-border" style={{ color: 'var(--primary)', width: '2.5rem', height: '2.5rem', borderWidth: '3px' }} />
    </div>
  );

  const esLogoArchivo = String(form.logo).startsWith('data:');
  const precioPorVisita = config.costoPaqueteVisitas && config.cantidadVisitasPaquete 
    ? (parseFloat(config.costoPaqueteVisitas) / parseInt(config.cantidadVisitasPaquete)).toFixed(2) 
    : '—';

  return (
    <div className="eb-page">

      {/* ── HEADER ── */}
      <header className="eb-header">
        <div className="d-flex align-items-center justify-content-between gap-3">
          <div className="d-flex align-items-center gap-3 overflow-hidden">
            <BackButton to="/admin-box-panel" />
            <div className="eb-header-icon d-none d-sm-flex">
              <i className="fas fa-cogs" />
            </div>
            <h1 className="eb-header-title">
              Config: <span>{boxLocal?.nombre || 'Box'}</span>
            </h1>
          </div>
          {activeTab !== 'finanzas' && activeTab !== 'horarios' && (
            <BotonSeguro
              className="eb-btn-guardar"
              onClick={handleSubmit}
              textoProcesando={<><i className="fas fa-spinner fa-spin" /><span className="d-none d-sm-inline"> Guardando...</span></>}
            >
              <i className="fas fa-save" />
              <span className="d-none d-sm-inline"> Guardar</span>
            </BotonSeguro>
          )}
        </div>
      </header>

      {/* ── CONTENIDO ── */}
      <div className="container-fluid px-3 px-md-4">
        <div className="row g-4">

          {/* TABS */}
          <div className="col-12 col-lg-3">
            <div className="eb-tabs-panel">
              <div className="eb-tabs-list">
                {TABS.map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    className={`eb-tab-btn${activeTab === tab.id ? ' active' : ''}`}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    <i className={tab.icon} />
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* FORMULARIO */}
          <div className="col-12 col-lg-9">
            <form onSubmit={handleSubmit} className="eb-content-panel">

              {/* ── IDENTIDAD ── */}
              {activeTab === 'identidad' && (
                <div>
                  <div className="eb-section-title">
                    <i className="fas fa-id-card" />
                    Identidad de la Marca
                  </div>

                  <div className="row g-3">
                    <div className="col-12 col-md-6">
                      <label className="eb-label">Nombre del Box</label>
                      <input type="text" name="nombre" className="eb-input" value={form.nombre} onChange={handleChange} placeholder="Ej. WolfPack CrossFit" />
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="eb-label">Slogan / Lema</label>
                      <input type="text" name="slogan" className="eb-input" value={form.slogan} onChange={handleChange} placeholder="Ej. Entrena con la manada" />
                    </div>
                    <div className="col-12">
                      <label className="eb-label">Descripción / Historia del Box</label>
                      <textarea name="descripcion" className="eb-input" rows="3" value={form.descripcion} onChange={handleChange} placeholder="Cuenta la historia de tu Box..." />
                    </div>
                    <div className="col-12">
                      <label className="eb-label">Logo del Box</label>
                      <div className="d-flex align-items-center gap-3">
                        {form.logo && (
                          <img src={form.logo} alt="Logo" style={{ width: '60px', height: '60px', objectFit: 'contain', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', padding: '4px' }} />
                        )}
                        <div className="flex-grow-1">
                          <input type="file" accept="image/*" className="eb-input" onChange={handleImageUpload} />
                          {!esLogoArchivo && form.logo && (
                            <input type="text" name="logo" className="eb-input mt-2" value={form.logo} onChange={handleChange} placeholder="O pega una URL del logo" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="eb-form-actions">
                    <button type="button" className="eb-btn-cancelar" onClick={() => navigate('/admin-box-panel')}>Cancelar</button>
                    <BotonSeguro type="submit" className="eb-btn-guardar-form" textoProcesando={<><i className="fas fa-spinner fa-spin" /> Guardando...</>}>
                      <i className="fas fa-save" /> Guardar Cambios
                    </BotonSeguro>
                  </div>
                </div>
              )}

              {/* ── CONTACTO ── */}
              {activeTab === 'contacto' && (
                <div>
                  <div className="eb-section-title">
                    <i className="fas fa-map-marker-alt" />
                    Contacto y Coordenadas
                  </div>
                  <div className="row g-3">
                    <div className="col-12">
                      <label className="eb-label">Dirección Completa</label>
                      <input type="text" name="ubicacion" className="eb-input" value={form.ubicacion} onChange={handleChange} placeholder="Ej. Av. Kabah, Cancún, Quintana Roo" />
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="eb-label">Link de Google Maps</label>
                      <input type="url" name="linkMaps" className="eb-input" value={form.linkMaps} onChange={handleChange} placeholder="https://maps.google.com/..." />
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="eb-label">Instrucciones de Llegada</label>
                      <textarea name="instruccionesLlegada" className="eb-input" rows="2" value={form.instruccionesLlegada} onChange={handleChange} placeholder="Ej. Estamos al fondo de la plaza, junto al Oxxo." />
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="eb-label"><i className="fas fa-phone" style={{ color: 'var(--accent-cool)' }} /> Teléfono de Recepción</label>
                      <input type="tel" name="telefono" className="eb-input" maxLength={10} value={form.telefono} onChange={e => { const v = e.target.value.replace(/\D/g, '').slice(0, 10); handleChange({ target: { name: 'telefono', value: v } }); }} placeholder="Ej. 9981234567" />
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="eb-label"><i className="fab fa-whatsapp" style={{ color: '#25D366' }} /> WhatsApp</label>
                      <input type="tel" name="whatsApp" className="eb-input" maxLength={10} value={form.whatsApp} onChange={e => { const v = e.target.value.replace(/\D/g, '').slice(0, 10); handleChange({ target: { name: 'whatsApp', value: v } }); }} placeholder="Ej. 9981234567" />
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="eb-label"><i className="fab fa-instagram" style={{ color: '#E1306C' }} /> Instagram</label>
                      <input type="text" name="instagram" className="eb-input" value={form.instagram} onChange={handleChange} placeholder="Ej. @wolfpack_cancun" />
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="eb-label"><i className="fab fa-facebook" style={{ color: '#1877F2' }} /> Facebook</label>
                      <input type="text" name="facebook" className="eb-input" value={form.facebook} onChange={handleChange} placeholder="Ej. fb.com/wolfpackcancun" />
                    </div>
                  </div>
                  <div className="eb-form-actions">
                    <button type="button" className="eb-btn-cancelar" onClick={() => navigate('/admin-box-panel')}>Cancelar</button>
                    <BotonSeguro type="submit" className="eb-btn-guardar-form" textoProcesando={<><i className="fas fa-spinner fa-spin" /> Guardando...</>}><i className="fas fa-save" /> Guardar Cambios</BotonSeguro>
                  </div>
                </div>
              )}

              {/* ── POLÍTICAS ── */}
              {activeTab === 'politicas' && (
                <div>
                  <div className="eb-section-title">
                    <i className="fas fa-balance-scale" />
                    Leyes de la Manada (Políticas)
                  </div>
                  <div className="eb-info-box mb-3">
                    <i className="fas fa-info-circle me-2" />
                    Puedes usar saltos de línea y emojis. Esto se mostrará en la app de los atletas tal como lo escribas.
                  </div>
                  <div className="row g-3">
                    <div className="col-12">
                      <label className="eb-label">Política de Cancelación y Faltas</label>
                      <textarea name="politicasCancelacion" className="eb-input" rows="4" value={form.politicasCancelacion} onChange={handleChange} placeholder="Ej. Tienes hasta 2 horas antes de tu clase para cancelar..." />
                    </div>
                    <div className="col-12">
                      <label className="eb-label">Política de Congelación de Membresías</label>
                      <textarea name="politicasCongelacion" className="eb-input" rows="3" value={form.politicasCongelacion} onChange={handleChange} placeholder="Ej. Las membresías pueden congelarse hasta por 1 mes..." />
                    </div>
                    <div className="col-12">
                      <label className="eb-label">Política de Reembolsos</label>
                      <textarea name="politicasReembolso" className="eb-input" rows="3" value={form.politicasReembolso} onChange={handleChange} placeholder="Ej. No existen reembolsos parciales ni totales..." />
                    </div>
                    <div className="col-12">
                      <label className="eb-label">Tolerancia de Retardos</label>
                      <textarea name="toleranciaRetardos" className="eb-input" rows="2" value={form.toleranciaRetardos} onChange={handleChange} placeholder="Ej. 10 minutos de tolerancia. Después, 30 burpees." />
                    </div>
                  </div>
                  <div className="eb-form-actions">
                    <button type="button" className="eb-btn-cancelar" onClick={() => navigate('/admin-box-panel')}>Cancelar</button>
                    <BotonSeguro type="submit" className="eb-btn-guardar-form" textoProcesando={<><i className="fas fa-spinner fa-spin" /> Guardando...</>}><i className="fas fa-save" /> Guardar Cambios</BotonSeguro>
                  </div>
                </div>
              )}

              {/* ══════════════════════════════════════════════════════════════
                  NUEVO: HORARIOS Y RESERVAS ⏰
              ══════════════════════════════════════════════════════════════ */}
              {activeTab === 'horarios' && (
                <div className="animate__animated animate__fadeIn">
                  <div className="eb-section-title">
                    <i className="fas fa-clock" /> Horarios de Apertura y Reservas
                  </div>
                  
                  <div className="eb-info-box mb-4">
                    <i className="fas fa-calendar-alt me-2" />
                    Define a qué hora abre y cierra el Box cada día. El sistema usará esto para bloquear la creación de clases fuera de horario y para el Portal de Turistas.
                  </div>

                  {/* MATRIZ DE DÍAS */}
                  <div className="p-3 rounded-4 mb-4" style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                    {DIAS_SEMANA.map(dia => (
                      <div key={dia} className="row g-2 align-items-center mb-3 pb-3 border-bottom" style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}>
                        <div className="col-4 col-md-3">
                          <div className="form-check form-switch">
                            <input className="form-check-input" type="checkbox" id={`chk-${dia}`} checked={horarios[dia]?.abierto} onChange={e => handleHorarioChange(dia, 'abierto', e.target.checked)} />
                            <label className={`form-check-label fw-bold ${horarios[dia]?.abierto ? 'text-white' : 'text-secondary'}`} htmlFor={`chk-${dia}`}>{dia}</label>
                          </div>
                        </div>
                        <div className="col-8 col-md-9">
                          {horarios[dia]?.abierto ? (
                            <div className="d-flex align-items-center gap-2">
                              <input type="time" className="eb-input py-1" value={horarios[dia]?.apertura || ''} onChange={e => handleHorarioChange(dia, 'apertura', e.target.value)} />
                              <span className="text-secondary fw-bold mx-1">a</span>
                              <input type="time" className="eb-input py-1" value={horarios[dia]?.cierre || ''} onChange={e => handleHorarioChange(dia, 'cierre', e.target.value)} />
                            </div>
                          ) : (
                            <span className="badge bg-danger bg-opacity-25 text-danger border border-danger">CERRADO</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="row g-4 mb-4">
                    <div className="col-md-6">
                      <label className="eb-label" style={{ color: 'var(--warning)' }}><i className="fas fa-history me-1"></i> Anticipación de Reservas (Horas)</label>
                      <input type="number" name="anticipacionReservaHoras" className="eb-input fw-bold" style={{ borderColor: 'var(--warning)', color: 'var(--warning)' }} value={config.anticipacionReservaHoras} onChange={handleConfigChange} />
                      <small className="text-secondary d-block mt-1">Ej. Si pones 24, el atleta solo puede ver y reservar clases de hoy y mañana.</small>
                    </div>
                    <div className="col-md-6">
                      <label className="eb-label" style={{ color: 'var(--danger)' }}><i className="fas fa-calendar-times me-1"></i> Fechas Especiales Cerrado</label>
                      <textarea name="diasCerrado" className="eb-input" style={{ borderColor: 'var(--danger)' }} rows="2" placeholder="Ej. 25 de Diciembre, 1 de Enero..." value={config.diasCerrado} onChange={handleConfigChange} />
                      <small className="text-secondary d-block mt-1">Días festivos donde no habrá sistema.</small>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-top" style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}>
                    <BotonSeguro className="eb-btn-guardar-form w-100" onClick={guardarConfiguracion} disabled={savingConfig} textoProcesando={<><i className="fas fa-spinner fa-spin me-2" /> Guardando...</>}>
                      <i className="fas fa-save me-2"></i> Guardar Horarios y Reglas
                    </BotonSeguro>
                  </div>
                </div>
              )}

              {/* ══════════════════════════════════════════════════════════════
                  CONFIGURACIÓN FINANCIERA (NUEVO MÓDULO V2)
              ══════════════════════════════════════════════════════════════ */}
              {activeTab === 'finanzas' && (
                <div>
                  <div className="eb-section-title">
                    <i className="fas fa-cogs" />
                    Configuración Financiera Global
                  </div>

                  <div className="eb-info-box mb-4">
                    <i className="fas fa-shield-alt me-2" />
                    Estos valores son la base de todos los cálculos financieros de tu Box. Definen cuánto cuesta cada servicio y se aplican automáticamente en el punto de venta, el registro de atletas y las renovaciones.
                  </div>

                  {/* ── PAGOS EN LÍNEA: STRIPE CONNECT ── */}
                  <div className="mb-4 p-3 rounded" style={{ background: 'rgba(103, 114, 229, 0.06)', border: '1px solid rgba(103, 114, 229, 0.2)' }}>
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <p className="fw-bold mb-0" style={{ color: '#6772E5', fontFamily: 'var(--font-heading)', fontSize: '0.9rem' }}>
                        <i className="fab fa-stripe fa-lg me-2"></i>Pagos en Línea (Stripe Connect)
                      </p>
                      
                      {!config.stripeAccountId ? (
                        <button type="button" onClick={conectarStripe} className="btn btn-sm text-white fw-bold px-3 py-2" style={{ background: '#6772E5', border: 'none', borderRadius: '8px' }}>
                          <i className="fas fa-link me-2"></i>Vincular Banco Mío
                        </button>
                      ) : (
                        <span className="badge bg-success bg-opacity-25 text-success border border-success p-2">
                          <i className="fas fa-check-circle me-1"></i>Cuenta de Stripe Conectada
                        </span>
                      )}
                    </div>

                    <div className="row g-3">
                      <div className="col-12 col-md-6 d-flex align-items-center">
                        <div className="form-check form-switch custom-switch">
                          <input className="form-check-input" type="checkbox" id="switchComision" name="absorberComisionTarjeta" checked={config.absorberComisionTarjeta} onChange={handleConfigChange} style={{ width: '2.5rem', height: '1.3rem' }} />
                          <label className="form-check-label ms-2 text-white" htmlFor="switchComision" style={{ fontSize: '0.85rem' }}>
                            <i className="fas fa-hand-holding-usd me-1" style={{ color: '#6772E5' }}></i>
                            El Box absorbe la comisión de tarjeta (~4%)
                          </label>
                        </div>
                      </div>
                      <div className="col-12 col-md-6">
                        <label className="eb-label" style={{ color: '#6772E5' }}>Compra Mínima para Tarjeta ($)</label>
                        <input type="number" name="compraMinimaTarjeta" className="eb-input" value={config.compraMinimaTarjeta} onChange={handleConfigChange} placeholder="Ej. 100" />
                        <small className="text-secondary" style={{ fontSize: '0.7rem' }}>Menor a esto solo permite fiar ("Deuda") o cobrar en efectivo. Ayuda a evitar comisiones trampa.</small>
                      </div>
                    </div>
                  </div>

                  {/* ── INSCRIPCIÓN ANUAL ── */}
                  <div className="mb-4 p-3 rounded" style={{ background: 'rgba(243, 156, 18, 0.06)', border: '1px solid rgba(243, 156, 18, 0.2)' }}>
                    <p className="fw-bold mb-3" style={{ color: 'var(--warning)', fontFamily: 'var(--font-heading)', fontSize: '0.9rem' }}>
                      <i className="fas fa-calendar-check me-2"></i>Inscripción Anual
                    </p>
                    <div className="row g-3">
                      <div className="col-12 col-md-4">
                        <label className="eb-label">Costo de Inscripción ($)</label>
                        <input type="number" name="montoInscripcion" className="eb-input" value={config.montoInscripcion} onChange={handleConfigChange} placeholder="Ej. 250" />
                      </div>
                      <div className="col-12 col-md-4">
                        <label className="eb-label">Mes de Cobro Masivo</label>
                        <select name="mesCobroInscripcion" className="eb-input" value={config.mesCobroInscripcion} onChange={handleConfigChange}>
                          {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                        </select>
                      </div>
                      <div className="col-12 col-md-4">
                        <label className="eb-label">Meses de Exención (Nuevos)</label>
                        <select name="mesesExencionNuevos" className="eb-input" value={config.mesesExencionNuevos} onChange={handleConfigChange}>
                          <option value="1">1 mes</option>
                          <option value="2">2 meses</option>
                          <option value="3">3 meses</option>
                          <option value="4">4 meses</option>
                          <option value="6">6 meses</option>
                        </select>
                        <small className="text-secondary" style={{ fontSize: '0.7rem' }}>Si se inscribieron hace menos de {config.mesesExencionNuevos} meses, no pagan la inscripción anual.</small>
                      </div>
                    </div>
                  </div>

                  {/* ── DROP-IN (VISITANTES) ── */}
                  <div className="mb-4 p-3 rounded" style={{ background: 'rgba(231, 76, 60, 0.06)', border: '1px solid rgba(231, 76, 60, 0.2)' }}>
                    <p className="fw-bold mb-3" style={{ color: 'var(--danger)', fontFamily: 'var(--font-heading)', fontSize: '0.9rem' }}>
                      <i className="fas fa-plane-arrival me-2"></i>Visitas y Drop-In
                    </p>
                    <div className="row g-3">
                      <div className="col-12 col-md-6">
                        <label className="eb-label">Precio Drop-In por Clase ($)</label>
                        <input type="number" name="costoDropIn" className="eb-input" value={config.costoDropIn} onChange={handleConfigChange} placeholder="Ej. 80" />
                        <small className="text-secondary" style={{ fontSize: '0.7rem' }}>Precio de una visita suelta a clase de CrossFit.</small>
                      </div>
                      <div className="col-12 col-md-6">
                        <label className="eb-label">Visita Suelta al Gym ($)</label>
                        <input type="number" name="costoVisitaGym" className="eb-input" value={config.costoVisitaGym} onChange={handleConfigChange} placeholder="Ej. 50" />
                        <small className="text-secondary" style={{ fontSize: '0.7rem' }}>Precio por día de acceso solo al área de gimnasio.</small>
                      </div>
                    </div>
                  </div>

                  {/* ── PAQUETE DE VISITAS ── */}
                  <div className="mb-4 p-3 rounded" style={{ background: 'rgba(52, 152, 219, 0.06)', border: '1px solid rgba(52, 152, 219, 0.2)' }}>
                    <p className="fw-bold mb-3" style={{ color: 'var(--accent-cool)', fontFamily: 'var(--font-heading)', fontSize: '0.9rem' }}>
                      <i className="fas fa-ticket-alt me-2"></i>Paquete de Visitas
                    </p>
                    <div className="row g-3 align-items-end">
                      <div className="col-6 col-md-4">
                        <label className="eb-label">Cantidad de Visitas</label>
                        <input type="number" name="cantidadVisitasPaquete" className="eb-input" value={config.cantidadVisitasPaquete} onChange={handleConfigChange} placeholder="Ej. 4" />
                      </div>
                      <div className="col-6 col-md-4">
                        <label className="eb-label">Precio del Paquete ($)</label>
                        <input type="number" name="costoPaqueteVisitas" className="eb-input" value={config.costoPaqueteVisitas} onChange={handleConfigChange} placeholder="Ej. 200" />
                      </div>
                      <div className="col-12 col-md-4">
                        <div className="p-2 rounded text-center" style={{ background: 'rgba(52,152,219,0.15)', border: '1px dashed rgba(52,152,219,0.4)' }}>
                          <small className="text-secondary d-block" style={{ fontSize: '0.7rem' }}>Precio por visita</small>
                          <span className="fw-bold" style={{ color: 'var(--accent-cool)', fontSize: '1.2rem', fontFamily: 'var(--font-stats)' }}>${precioPorVisita}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ── GIMNASIO ── */}
                  <div className="mb-4 p-3 rounded" style={{ background: 'rgba(46, 204, 113, 0.06)', border: '1px solid rgba(46, 204, 113, 0.2)' }}>
                    <p className="fw-bold mb-3" style={{ color: 'var(--success)', fontFamily: 'var(--font-heading)', fontSize: '0.9rem' }}>
                      <i className="fas fa-dumbbell me-2"></i>Gimnasio (Solo Gym)
                    </p>
                    <div className="row g-3">
                      <div className="col-12 col-md-6">
                        <label className="eb-label">Mensualidad Solo Gym ($)</label>
                        <input type="number" name="costoGymMensual" className="eb-input" value={config.costoGymMensual} onChange={handleConfigChange} placeholder="Dejar vacío si no ofreces gym por separado" />
                        <small className="text-secondary" style={{ fontSize: '0.7rem' }}>Déjalo vacío si tu box no vende membresía de solo gimnasio.</small>
                      </div>
                    </div>
                  </div>

                            {/* ── REGLAS GENERALES ── */}
                  <div className="mb-4 p-3 rounded" style={{ background: 'rgba(155, 89, 182, 0.06)', border: '1px solid rgba(155, 89, 182, 0.2)' }}>
                    <p className="fw-bold mb-3" style={{ color: '#9b59b6', fontFamily: 'var(--font-heading)', fontSize: '0.9rem' }}>
                      <i className="fas fa-sliders-h me-2"></i>Reglas Generales
                    </p>
                    <div className="row g-3">
                      <div className="col-12 col-md-6">
                        <label className="eb-label">Precio Mínimo de Mensualidad ($)</label>
                        <input type="number" name="precioMinimoMensualidad" className="eb-input" value={config.precioMinimoMensualidad} onChange={handleConfigChange} placeholder="Ej. 100" />
                        <small className="text-secondary" style={{ fontSize: '0.7rem' }}>Ningún atleta pagará menos de este monto, sin importar los descuentos.</small>
                      </div>
                      <div className="col-12 col-md-6 d-flex align-items-center">
                        <div className="form-check form-switch">
                          <input className="form-check-input" type="checkbox" id="switchPagoMixto" name="permitirPagoMixto" checked={config.permitirPagoMixto} onChange={handleConfigChange} style={{ width: '2.5rem', height: '1.3rem' }} />
                          <label className="form-check-label ms-2" htmlFor="switchPagoMixto" style={{ fontSize: '0.85rem' }}>
                            <i className="fas fa-exchange-alt me-1" style={{ color: '#9b59b6' }}></i>
                            Permitir pagos mixtos (2 métodos)
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
 
                  {/* ── DÍAS DE CORTE ── */}
                  <div className="mb-4 p-3 rounded" style={{ background: 'rgba(231, 76, 60, 0.06)', border: '1px solid rgba(231, 76, 60, 0.2)' }}>
                    <p className="fw-bold mb-3" style={{ color: 'var(--danger)', fontFamily: 'var(--font-heading)', fontSize: '0.9rem' }}>
                      <i className="fas fa-calendar-day me-2"></i>Modelo de Días de Corte
                    </p>
 
                    <div className="row g-3 mb-3">
                      <div className="col-12">
                        <div className="d-flex gap-2 flex-wrap">
                          <button type="button" className="btn btn-sm px-3 py-2" onClick={() => setConfig(prev => ({ ...prev, modeloCorte: 'Individual' }))}
                            style={{ background: config.modeloCorte === 'Individual' ? 'var(--danger)' : 'rgba(231,76,60,0.1)', color: config.modeloCorte === 'Individual' ? '#fff' : 'var(--danger)', border: '1px solid rgba(231,76,60,0.4)', borderRadius: '8px', fontWeight: 600, fontSize: '0.8rem' }}>
                            <i className="fas fa-user me-1"></i>Individual
                          </button>
                          <button type="button" className="btn btn-sm px-3 py-2" onClick={() => setConfig(prev => ({ ...prev, modeloCorte: 'Fijo' }))}
                            style={{ background: config.modeloCorte === 'Fijo' ? 'var(--danger)' : 'rgba(231,76,60,0.1)', color: config.modeloCorte === 'Fijo' ? '#fff' : 'var(--danger)', border: '1px solid rgba(231,76,60,0.4)', borderRadius: '8px', fontWeight: 600, fontSize: '0.8rem' }}>
                            <i className="fas fa-users me-1"></i>Fijo (Todos el mismo día)
                          </button>
                        </div>
                        <small className="text-secondary d-block mt-2" style={{ fontSize: '0.7rem' }}>
                          {config.modeloCorte === 'Individual' 
                            ? 'Cada atleta tiene su propia fecha de corte basada en cuándo pagó. Más justo para el cliente, más personalizado.' 
                            : 'Todos los atletas cortan el mismo día del mes. Más orden administrativo, requiere prorrateo para nuevos ingresos.'}
                        </small>
                      </div>
                    </div>
 
                    {config.modeloCorte === 'Fijo' && (
                      <div className="row g-3 mb-3">
                        <div className="col-12 col-md-6">
                          <label className="eb-label">Día de Corte (1-28)</label>
                          <input type="number" name="diaCorte" className="eb-input" value={config.diaCorte || ''} onChange={handleConfigChange} min="1" max="28" placeholder="Ej. 1" />
                          <small className="text-secondary" style={{ fontSize: '0.7rem' }}>Máximo 28 para evitar problemas con febrero.</small>
                        </div>
                        <div className="col-12 col-md-6 d-flex align-items-center">
                          <div className="form-check form-switch">
                            <input className="form-check-input" type="checkbox" id="switchProrrateo" name="prorratearNuevos" checked={config.prorratearNuevos} onChange={handleConfigChange} style={{ width: '2.5rem', height: '1.3rem' }} />
                            <label className="form-check-label ms-2" htmlFor="switchProrrateo" style={{ fontSize: '0.85rem' }}>
                              Prorratear nuevos ingresos a mitad de mes
                            </label>
                          </div>
                        </div>
                      </div>
                    )}
 
                    <div className="row g-3">
                      <div className="col-12 col-md-6">
                        <label className="eb-label">Días de Gracia (0-15)</label>
                        <select name="diasGracia" className="eb-input" value={config.diasGracia} onChange={handleConfigChange}>
                          <option value="0">0 — Se bloquea inmediatamente</option>
                          <option value="1">1 día</option>
                          <option value="2">2 días</option>
                          <option value="3">3 días</option>
                          <option value="5">5 días</option>
                          <option value="7">7 días</option>
                          <option value="10">10 días</option>
                          <option value="15">15 días</option>
                        </select>
                        <small className="text-secondary" style={{ fontSize: '0.7rem' }}>Después del vencimiento, el atleta tiene estos días para pagar antes de perder acceso.</small>
                      </div>
                      <div className="col-12 col-md-6">
                        <label className="eb-label">Máx. Meses de Renovación Anticipada</label>
                        <select name="maxMesesRenovacionAnticipada" className="eb-input" value={config.maxMesesRenovacionAnticipada} onChange={handleConfigChange}>
                          <option value="1">1 mes</option>
                          <option value="2">2 meses</option>
                          <option value="3">3 meses</option>
                          <option value="6">6 meses</option>
                          <option value="12">12 meses</option>
                          <option value="24">24 meses</option>
                        </select>
                        <small className="text-secondary" style={{ fontSize: '0.7rem' }}>Evita errores: una fecha de vencimiento no puede exceder este límite desde hoy.</small>
                      </div>
                    </div>
                  </div>

                  {/* ── ACCESO RÁPIDO AL CENTRO FINANCIERO ── */}
                  <div className="d-flex flex-column flex-sm-row gap-3 align-items-stretch mb-4">
                    <button type="button" className="eb-btn-guardar-form flex-grow-1" onClick={guardarConfiguracion} disabled={savingConfig}>
                      {savingConfig 
                        ? <><i className="fas fa-spinner fa-spin me-2"></i>Guardando...</> 
                        : <><i className="fas fa-save me-2"></i>Guardar Configuración Financiera</>
                      }
                    </button>
                    <button type="button" className="eb-btn-cancelar flex-grow-0" onClick={() => navigate('/gestion-finanzas')} style={{ whiteSpace: 'nowrap' }}>
                      <i className="fas fa-external-link-alt me-2"></i>Ir al Centro Financiero
                    </button>
                  </div>

                </div>
              )}

            </form>
          </div>

        </div>
      </div>
    </div>
  );
}