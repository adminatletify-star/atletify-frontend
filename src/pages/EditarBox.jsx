import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { BOXES_ENDPOINT } from '../services/api';
import BackButton from '../components/BackButton';
import BotonSeguro from '../components/BotonSeguro';
import AtletifyLoader from '../components/AtletifyLoader';
import TimeWheelPicker from '../components/TimeWheelPicker';
import MesPicker from '../components/MesPicker';
import OpcionesPicker from '../components/OpcionesPicker';
import '../assets/css/EditarBox.css';

// El backend expone todo bajo /api. VITE_API_URL viene SIN /api, así que lo
// agregamos (y toleramos que ya lo traiga, por si en prod se configura distinto).
const API_BASE = import.meta.env.VITE_API_URL?.endsWith('/api')
  ? import.meta.env.VITE_API_URL
  : `${import.meta.env.VITE_API_URL}/api`;

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
  compraMinimaTarjeta: 100,
  aceptarPagosEnLinea: true,
  aceptarTransferencias: true,
  aceptarEfectivo: true,
  aceptarTarjetaRecepcion: true,
  recargoMontoFijo: 0,
  aplicarGraciaSoloConCobroAutomatico: true,
  regalarVisitasAmigo: false,
  visitasRegaloCantidad: 1,
  caducidadRegaloValor: 30,
  caducidadRegaloUnidad: 'Dias'
};

const DIAS_SEMANA = [
  'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'
];

// Formatea "HH:MM" (24h) a "H:MM AM/PM" para mostrar en los botones-hora.
function fmt12(hhmm) {
  const [h, m] = (hhmm || '06:00').split(':').map(Number);
  const period = h < 12 ? 'AM' : 'PM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

// Opciones para los selectores modales (OpcionesPicker) — mismas opciones que los <select> originales.
const OPCIONES_EXENCION = [
  { valor: 1, label: '1 mes' },
  { valor: 2, label: '2 meses' },
  { valor: 3, label: '3 meses' },
  { valor: 4, label: '4 meses' },
  { valor: 6, label: '6 meses' },
];

const OPCIONES_DIAS_GRACIA = [
  { valor: 0, label: '0 días', desc: 'Se bloquea inmediatamente' },
  { valor: 1, label: '1 día' },
  { valor: 2, label: '2 días' },
  { valor: 3, label: '3 días' },
  { valor: 5, label: '5 días' },
  { valor: 7, label: '7 días' },
  { valor: 10, label: '10 días' },
  { valor: 15, label: '15 días' },
];

const OPCIONES_RENOVACION = [
  { valor: 1, label: '1 mes' },
  { valor: 2, label: '2 meses' },
  { valor: 3, label: '3 meses' },
  { valor: 6, label: '6 meses' },
  { valor: 12, label: '12 meses' },
  { valor: 24, label: '24 meses' },
];

const TABS = [
  { id: 'identidad', label: 'Identidad', icon: 'fas fa-id-card' },
  { id: 'contacto', label: 'Contacto y Ubicación', icon: 'fas fa-map-marker-alt' },
  { id: 'politicas', label: 'Leyes de la Manada', icon: 'fas fa-balance-scale' },
  { id: 'horarios', label: 'Horarios y Reservas', icon: 'fas fa-clock' },
  { id: 'finanzas', label: 'Configuración Financiera', icon: 'fas fa-cogs' },
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
  const [metodoPagoProcesando, setMetodoPagoProcesando] = useState(null); // field del método en proceso | null
  const [activeTab, setActiveTab] = useState('identidad');

  // ── Toggle seguro de visitas de regalo (contraseña + auditoría) ──
  const [modalVisitas, setModalVisitas] = useState(null); // null | 'activar' | 'desactivar'
  const [passwordVisitas, setPasswordVisitas] = useState('');
  const [accionPaquetes, setAccionPaquetes] = useState('mantener'); // 'mantener' | 'borrar'
  const [opcionDesactivar, setOpcionDesactivar] = useState('pausar'); // 'pausar' | 'solo-nuevos'
  const [cortesiasVigentes, setCortesiasVigentes] = useState(0);
  const [procesandoVisitas, setProcesandoVisitas] = useState(false);

  const [horarios, setHorarios] = useState(
    DIAS_SEMANA.reduce((acc, dia) => ({ ...acc, [dia]: { abierto: true, apertura: '06:00', cierre: '22:00' } }), {})
  );

  // Picker de hora (rueda) para la matriz de horarios: { dia, campo } | null
  const [pickerHorario, setPickerHorario] = useState(null);

  const token = localStorage.getItem('token');
  const headersGet = { 'Authorization': `Bearer ${token}` };
  const headersPost = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem('usuario'));
    const storedBox = JSON.parse(localStorage.getItem('box'));

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
          compraMinimaTarjeta: data.compraMinimaTarjeta ?? 100,
          aceptarPagosEnLinea: data.aceptarPagosEnLinea ?? true,
          aceptarTransferencias: data.aceptarTransferencias ?? true,
          aceptarEfectivo: data.aceptarEfectivo ?? true,
          aceptarTarjetaRecepcion: data.aceptarTarjetaRecepcion ?? true,
          recargoMontoFijo: data.recargoMontoFijo ?? 0,
          aplicarGraciaSoloConCobroAutomatico: data.aplicarGraciaSoloConCobroAutomatico ?? true,
          regalarVisitasAmigo: data.regalarVisitasAmigo ?? false,
          visitasRegaloCantidad: data.visitasRegaloCantidad ?? 1,
          caducidadRegaloValor: data.caducidadRegaloValor ?? 30,
          caducidadRegaloUnidad: data.caducidadRegaloUnidad ?? 'Dias'
        });

        if (data.horariosApertura) {
          try {
            setHorarios(JSON.parse(data.horariosApertura));
          } catch (e) { console.error('Error parseando horarios:', e); }
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

  // Activa/desactiva un método de pago. Persiste de inmediato vía el endpoint seguro
  // (que además registra la acción en Auditoría de Usuarios). No requiere contraseña.
  async function toggleMetodoPago(field, activar) {
    // Regla: siempre debe quedar ≥1 método de recepción activo (solo los 3 de recepción).
    const recepcion = ['aceptarTransferencias', 'aceptarEfectivo', 'aceptarTarjetaRecepcion'];
    if (!activar && recepcion.includes(field)) {
      const quedaOtroActivo = recepcion.some(m => m !== field && config[m]);
      if (!quedaOtroActivo) {
        alert('Debe quedar activo al menos un método de pago en recepción (Transferencia, Efectivo o Tarjeta).');
        return;
      }
    }

    if (metodoPagoProcesando) return; // anti doble-clic mientras procesa

    const idBox = boxLocal?.idBox || boxLocal?.IdBox;
    const valorPrevio = config[field];
    setMetodoPagoProcesando(field);
    setConfig(prev => ({ ...prev, [field]: activar })); // actualización optimista

    try {
      const res = await fetch(`${API_BASE}/configuracionbox/${idBox}/toggle-metodo-pago`, {
        method: 'POST',
        headers: headersPost,
        body: JSON.stringify({ metodo: field, activar })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setConfig(prev => ({ ...prev, [field]: valorPrevio })); // revertir
        alert(data.mensaje || 'No se pudo cambiar el método de pago.');
      }
    } catch (e) {
      setConfig(prev => ({ ...prev, [field]: valorPrevio })); // revertir
      alert('Error de conexión al cambiar el método de pago.');
    } finally {
      setMetodoPagoProcesando(null);
    }
  }

  function handleHorarioChange(dia, campo, valor) {
    setHorarios(prev => ({
      ...prev,
      [dia]: { ...prev[dia], [campo]: valor }
    }));
  }

  // Aplica la hora elegida en el picker garantizando coherencia (cierre > apertura).
  // Si al cambiar la apertura queda igual o después del cierre, empuja el cierre 1h adelante.
  function aplicarHora(dia, campo, t) {
    setHorarios(prev => {
      const cur = prev[dia] || {};
      if (campo === 'apertura') {
        const [ah, am] = t.split(':').map(Number);
        const [ch, cm] = (cur.cierre || '22:00').split(':').map(Number);
        let cierre = cur.cierre || '22:00';
        if (ah * 60 + am >= ch * 60 + cm) {
          const fin = (ah * 60 + am + 60) % (24 * 60);
          cierre = `${String(Math.floor(fin / 60)).padStart(2, '0')}:${String(fin % 60).padStart(2, '0')}`;
        }
        return { ...prev, [dia]: { ...cur, apertura: t, cierre } };
      }
      return { ...prev, [dia]: { ...cur, cierre: t } };
    });
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
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, idBox: targetId })
      });
      if (!response.ok) throw new Error('No se pudo actualizar el box.');

      const updatedBox = await response.json();
      localStorage.setItem('box', JSON.stringify(updatedBox));
      setBoxLocal(updatedBox);
      alert('¡Configuración del Box guardada con éxito!');
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
          compraMinimaTarjeta: parseFloat(config.compraMinimaTarjeta) || 100,
          aceptarPagosEnLinea: config.aceptarPagosEnLinea,
          aceptarTransferencias: config.aceptarTransferencias,
          aceptarEfectivo: config.aceptarEfectivo,
          aceptarTarjetaRecepcion: config.aceptarTarjetaRecepcion,
          recargoMontoFijo: parseFloat(config.recargoMontoFijo) || 0,
          aplicarGraciaSoloConCobroAutomatico: config.aplicarGraciaSoloConCobroAutomatico,
          regalarVisitasAmigo: config.regalarVisitasAmigo,
          visitasRegaloCantidad: parseInt(config.visitasRegaloCantidad) || 1,
          caducidadRegaloValor: parseInt(config.caducidadRegaloValor) || 0,
          caducidadRegaloUnidad: config.caducidadRegaloUnidad || 'Dias'
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

  // Abre el modal de confirmación para activar/pausar visitas de regalo.
  async function abrirModalToggleVisitas(activar) {
    setPasswordVisitas('');
    setAccionPaquetes('mantener');
    setOpcionDesactivar('pausar');
    // Contamos las cortesías vigentes para informar en ambos flujos (activar y desactivar).
    const idBox = boxLocal?.idBox || boxLocal?.IdBox;
    try {
      const res = await fetch(`${API_BASE}/configuracionbox/${idBox}/cortesias-vigentes`, { headers: headersGet });
      const data = res.ok ? await res.json() : { count: 0 };
      setCortesiasVigentes(data.count || 0);
    } catch { setCortesiasVigentes(0); }
    setModalVisitas(activar ? 'activar' : 'desactivar');
  }

  // Verifica la contraseña y aplica el cambio (con auditoría en el backend).
  async function confirmarToggleVisitas() {
    if (!passwordVisitas.trim()) { alert('Ingresa tu contraseña.'); return; }
    const idBox = boxLocal?.idBox || boxLocal?.IdBox;
    const activar = modalVisitas === 'activar';
    setProcesandoVisitas(true);
    try {
      const res = await fetch(`${API_BASE}/configuracionbox/${idBox}/toggle-visitas-regalo`, {
        method: 'POST',
        headers: headersPost,
        body: JSON.stringify({ contrasena: passwordVisitas, activar, accionPaquetes: activar ? accionPaquetes : null, opcionDesactivar: activar ? null : opcionDesactivar })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { alert(data.mensaje || 'No se pudo aplicar el cambio.'); return; }
      if (data.valido === false) { alert(data.mensaje || 'Contraseña incorrecta.'); return; }
      setConfig(prev => ({ ...prev, regalarVisitasAmigo: activar }));
      setModalVisitas(null);
      setPasswordVisitas('');
    } catch (e) { alert('Error de conexión.'); }
    finally { setProcesandoVisitas(false); }
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
      <AtletifyLoader />
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
                      <div className="eb-logo-uploader">
                        {form.logo ? (
                          <img src={form.logo} alt="Logo del box" className="eb-logo-preview" />
                        ) : (
                          <div className="eb-logo-placeholder" aria-hidden="true">
                            <i className="fas fa-image"></i>
                          </div>
                        )}
                        <div className="eb-logo-controls">
                          <input id="eb-logo-file" type="file" accept="image/*" className="d-none" onChange={handleImageUpload} />
                          <div className="eb-logo-actions">
                            <label htmlFor="eb-logo-file" className="eb-btn-upload">
                              <i className="fas fa-upload"></i>
                              {form.logo ? 'Cambiar' : 'Subir logo'}
                            </label>
                            {form.logo && (
                              <button type="button" className="eb-btn-quitar" onClick={() => setForm(prev => ({ ...prev, logo: '' }))}>
                                <i className="fas fa-trash"></i> Quitar
                              </button>
                            )}
                          </div>
                          <small className="eb-logo-hint">PNG, JPG o SVG · preferible cuadrado.</small>
                        </div>
                      </div>
                      {!esLogoArchivo && (
                        <input type="text" name="logo" className="eb-input eb-logo-url" value={form.logo} onChange={handleChange} placeholder="O pega una URL del logo" />
                      )}
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
                  <div className="eb-horario-grid mb-4">
                    {DIAS_SEMANA.map(dia => (
                      <div key={dia} className="eb-horario-row">
                        <div className="eb-horario-dia">
                          <div className="form-check form-switch m-0">
                            <input className="form-check-input" type="checkbox" id={`chk-${dia}`} checked={horarios[dia]?.abierto} onChange={e => handleHorarioChange(dia, 'abierto', e.target.checked)} />
                            <label className={`form-check-label fw-bold ${horarios[dia]?.abierto ? 'text-white' : 'text-secondary'}`} htmlFor={`chk-${dia}`}>{dia}</label>
                          </div>
                        </div>
                        {horarios[dia]?.abierto ? (
                          <div className="eb-horario-times">
                            <button
                              type="button"
                              className={`gc-hora-btn eb-horario-time${pickerHorario?.dia === dia && pickerHorario?.campo === 'apertura' ? ' gc-hora-btn--open' : ''}`}
                              onClick={() => setPickerHorario({ dia, campo: 'apertura' })}
                            >
                              <i className="far fa-clock" />
                              {fmt12(horarios[dia]?.apertura || '06:00')}
                            </button>
                            <span className="eb-horario-sep">a</span>
                            <button
                              type="button"
                              className={`gc-hora-btn eb-horario-time${pickerHorario?.dia === dia && pickerHorario?.campo === 'cierre' ? ' gc-hora-btn--open' : ''}`}
                              onClick={() => setPickerHorario({ dia, campo: 'cierre' })}
                            >
                              <i className="far fa-clock" />
                              {fmt12(horarios[dia]?.cierre || '22:00')}
                            </button>
                          </div>
                        ) : (
                          <div className="eb-horario-times">
                            <span className="eb-horario-cerrado">CERRADO</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Picker de rueda (TimeWheelPicker) — coherencia: el cierre debe ser > apertura */}
                  {pickerHorario && createPortal(
                    <div className="twp-overlay" onClick={e => { if (e.target === e.currentTarget) setPickerHorario(null); }}>
                      <div className="twp-modal">
                        <TimeWheelPicker
                          value={horarios[pickerHorario.dia]?.[pickerHorario.campo] || (pickerHorario.campo === 'apertura' ? '06:00' : '22:00')}
                          minTime={pickerHorario.campo === 'cierre' ? horarios[pickerHorario.dia]?.apertura : undefined}
                          onAccept={t => { aplicarHora(pickerHorario.dia, pickerHorario.campo, t); setPickerHorario(null); }}
                          onCancel={() => setPickerHorario(null)}
                        />
                      </div>
                    </div>,
                    document.body
                  )}

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
                    <div className="d-flex flex-column flex-sm-row justify-content-sm-between align-items-start align-items-sm-center gap-2 mb-3">
                      <p className="fw-bold mb-0" style={{ color: '#6772E5', fontFamily: 'var(--font-heading)', fontSize: '0.9rem' }}>
                        <i className="fab fa-stripe fa-lg me-2"></i>Pagos en Línea (Stripe Connect)
                      </p>

                      {!config.stripeAccountId ? (
                        <button type="button" onClick={conectarStripe} className="btn btn-sm text-white fw-bold px-3 py-2 mw-100 text-wrap" style={{ background: '#6772E5', border: 'none', borderRadius: '8px' }}>
                          <i className="fas fa-link me-2"></i>Vincular Banco Mío
                        </button>
                      ) : (
                        <span className="badge bg-success bg-opacity-25 text-success border border-success p-2 mw-100 text-wrap text-start">
                          <i className="fas fa-check-circle me-1"></i>Cuenta de Stripe Conectada
                        </span>
                      )}
                    </div>

                    <div className="row g-3">
                      <div className="col-12 col-md-6">
                        <div className="form-check form-switch eb-metodo-switch">
                          <input className="form-check-input" type="checkbox" id="switchPagosEnLinea" name="aceptarPagosEnLinea" checked={config.aceptarPagosEnLinea} onChange={() => toggleMetodoPago('aceptarPagosEnLinea', !config.aceptarPagosEnLinea)} disabled={!!metodoPagoProcesando} />
                          <label className="form-check-label" htmlFor="switchPagosEnLinea">
                            <i className="fas fa-credit-card me-1" style={{ color: '#6772E5' }}></i>
                            Habilitar Pagos con Tarjeta (App)
                          </label>
                        </div>
                      </div>
                      <div className="col-12 col-md-6">
                        <div className="form-check form-switch eb-metodo-switch">
                          <input className="form-check-input" type="checkbox" id="switchTransferencias" name="aceptarTransferencias" checked={config.aceptarTransferencias} onChange={() => toggleMetodoPago('aceptarTransferencias', !config.aceptarTransferencias)} disabled={!!metodoPagoProcesando} />
                          <label className="form-check-label" htmlFor="switchTransferencias">
                            <i className="fas fa-money-bill-transfer me-1" style={{ color: 'var(--info)' }}></i>
                            Aceptar Transferencias
                          </label>
                        </div>
                      </div>
                      <div className="col-12 col-md-6">
                        <div className="form-check form-switch eb-metodo-switch">
                          <input className="form-check-input" type="checkbox" id="switchEfectivo" name="aceptarEfectivo" checked={config.aceptarEfectivo} onChange={() => toggleMetodoPago('aceptarEfectivo', !config.aceptarEfectivo)} disabled={!!metodoPagoProcesando} />
                          <label className="form-check-label" htmlFor="switchEfectivo">
                            <i className="fas fa-coins me-1" style={{ color: 'var(--success)' }}></i>
                            Aceptar Efectivo en Recepción
                          </label>
                        </div>
                      </div>
                      <div className="col-12 col-md-6">
                        <div className="form-check form-switch eb-metodo-switch">
                          <input className="form-check-input" type="checkbox" id="switchTarjetaRecepcion" name="aceptarTarjetaRecepcion" checked={config.aceptarTarjetaRecepcion} onChange={() => toggleMetodoPago('aceptarTarjetaRecepcion', !config.aceptarTarjetaRecepcion)} disabled={!!metodoPagoProcesando} />
                          <label className="form-check-label" htmlFor="switchTarjetaRecepcion">
                            <i className="fas fa-credit-card me-1" style={{ color: 'var(--accent-cool, #4fc3f7)' }}></i>
                            Aceptar Tarjeta en Recepción
                          </label>
                        </div>
                      </div>

                      <div className="col-12 col-md-6 mt-md-3">
                        <div className="form-check form-switch eb-metodo-switch">
                          <input className="form-check-input" type="checkbox" id="switchComision" name="absorberComisionTarjeta" checked={config.absorberComisionTarjeta} onChange={handleConfigChange} />
                          <label className="form-check-label" htmlFor="switchComision">
                            <i className="fas fa-hand-holding-usd me-1" style={{ color: '#6772E5' }}></i>
                            El Box absorbe la comisión de tarjeta (~4%)
                          </label>
                        </div>
                      </div>
                      <div className="col-12 col-md-6 mt-md-3">
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
                        <MesPicker
                          valor={config.mesCobroInscripcion}
                          onCambiar={(v) => setConfig(prev => ({ ...prev, mesCobroInscripcion: v }))}
                        />
                      </div>
                      <div className="col-12 col-md-4">
                        <label className="eb-label">Meses de Exención (Nuevos)</label>
                        <OpcionesPicker
                          valor={config.mesesExencionNuevos}
                          onCambiar={(v) => setConfig(prev => ({ ...prev, mesesExencionNuevos: v }))}
                          opciones={OPCIONES_EXENCION}
                          titulo="Meses de exención"
                          icono="fas fa-calendar-check"
                        />
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

                  {/* ── VISITAS DE REGALO PARA UN AMIGO ── */}
                  <div className="mb-4 p-3 rounded" style={{ background: 'rgba(245, 166, 35, 0.06)', border: '1px solid rgba(245, 166, 35, 0.25)' }}>
                    <p className="fw-bold mb-3" style={{ color: 'var(--accent)', fontFamily: 'var(--font-heading)', fontSize: '0.9rem' }}>
                      <i className="fas fa-gift me-2"></i>Visitas de regalo para un amigo
                    </p>

                    <div className="form-check form-switch mb-1">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="switchRegalarVisitas"
                        name="regalarVisitasAmigo"
                        checked={config.regalarVisitasAmigo}
                        onChange={() => abrirModalToggleVisitas(!config.regalarVisitasAmigo)}
                        style={{ width: '2.5rem', height: '1.3rem' }}
                      />
                      <label className="form-check-label ms-2 text-white" htmlFor="switchRegalarVisitas" style={{ fontSize: '0.85rem' }}>
                        Regalar visitas a cada cuenta nueva de atleta
                      </label>
                    </div>
                    <small className="text-secondary d-block mb-3" style={{ fontSize: '0.7rem' }}>
                      Al aprobar una cuenta nueva se le otorgan visitas de cortesía para que traiga a un amigo. Se canjean en Gestión de Finanzas → Drop-In.
                    </small>

                    {config.regalarVisitasAmigo && (
                      <div className="row g-3">
                        <div className="col-12 col-md-4">
                          <label className="eb-label">Visitas de regalo</label>
                          <input
                            type="number"
                            name="visitasRegaloCantidad"
                            className="eb-input"
                            value={config.visitasRegaloCantidad}
                            onChange={handleConfigChange}
                            min="1"
                            placeholder="Ej. 1"
                          />
                          <small className="text-secondary" style={{ fontSize: '0.7rem' }}>Cantidad por cuenta nueva.</small>
                        </div>

                        <div className="col-6 col-md-3">
                          <label className="eb-label">Caduca en</label>
                          <input
                            type="number"
                            name="caducidadRegaloValor"
                            className="eb-input"
                            value={config.caducidadRegaloValor}
                            onChange={handleConfigChange}
                            min="0"
                            placeholder="Ej. 30"
                          />
                          <small className="text-secondary" style={{ fontSize: '0.7rem' }}>0 = sin caducidad.</small>
                        </div>

                        <div className="col-6 col-md-5">
                          <label className="eb-label">Unidad</label>
                          <div className="d-flex gap-2 flex-wrap">
                            {[
                              { val: 'Dias', label: 'Días' },
                              { val: 'Semanas', label: 'Semanas' },
                              { val: 'Meses', label: 'Meses' },
                              { val: 'Anios', label: 'Años' },
                            ].map(u => (
                              <button
                                key={u.val}
                                type="button"
                                onClick={() => setConfig(prev => ({ ...prev, caducidadRegaloUnidad: u.val }))}
                                className="btn btn-sm px-3 py-2"
                                style={{
                                  background: config.caducidadRegaloUnidad === u.val ? 'var(--accent)' : 'rgba(245,166,35,0.1)',
                                  color: config.caducidadRegaloUnidad === u.val ? '#1a1a1a' : 'var(--accent)',
                                  border: '1px solid rgba(245,166,35,0.4)',
                                  borderRadius: '8px',
                                  fontWeight: 600,
                                  fontSize: '0.8rem',
                                }}
                              >
                                {u.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
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
                        <OpcionesPicker
                          valor={config.diasGracia}
                          onCambiar={(v) => setConfig(prev => ({ ...prev, diasGracia: v }))}
                          opciones={OPCIONES_DIAS_GRACIA}
                          titulo="Días de gracia"
                          icono="fas fa-hourglass-half"
                        />
                        <small className="text-secondary" style={{ fontSize: '0.7rem' }}>Después del vencimiento, el atleta tiene estos días para pagar antes de perder acceso.</small>
                      </div>
                      
                      {config.diasGracia > 0 && (
                          <div className="col-12 col-md-6 d-flex align-items-center">
                              <div className="form-check form-switch custom-switch mt-4">
                                  <input className="form-check-input" type="checkbox" id="switchGraciaSoloAuto" name="aplicarGraciaSoloConCobroAutomatico" checked={config.aplicarGraciaSoloConCobroAutomatico} onChange={handleConfigChange} style={{ width: '2.5rem', height: '1.3rem' }} />
                                  <label className="form-check-label ms-2 text-white" htmlFor="switchGraciaSoloAuto" style={{ fontSize: '0.85rem' }}>
                                      Aplicar días de gracia SOLO a los que tienen Cobro Automático
                                  </label>
                              </div>
                          </div>
                      )}
                      
                      <div className="col-12 col-md-6">
                        <label className="eb-label text-warning">Recargo por Pago Atrasado ($ Fijo)</label>
                        <input type="number" name="recargoMontoFijo" className="eb-input border-warning text-warning fw-bold" value={config.recargoMontoFijo} onChange={handleConfigChange} placeholder="Ej. 50" />
                        <small className="text-secondary" style={{ fontSize: '0.7rem' }}>Monto extra que se cobrará al pagar en línea si ya superó su fecha límite + gracia.</small>
                      </div>

                      <div className="col-12 col-md-6">
                        <label className="eb-label">Máx. Meses de Renovación Anticipada</label>
                        <OpcionesPicker
                          valor={config.maxMesesRenovacionAnticipada}
                          onCambiar={(v) => setConfig(prev => ({ ...prev, maxMesesRenovacionAnticipada: v }))}
                          opciones={OPCIONES_RENOVACION}
                          titulo="Renovación anticipada"
                          icono="fas fa-calendar-plus"
                        />
                        <small className="text-secondary" style={{ fontSize: '0.7rem' }}>Evita errores: una fecha de vencimiento no puede exceder este límite desde hoy.</small>
                      </div>
                    </div>
                  </div>

                    <div className="d-flex flex-column flex-lg-row flex-wrap gap-3 align-items-stretch mb-4">
                      <button type="button" className="eb-btn-guardar-form flex-grow-1" onClick={guardarConfiguracion} disabled={savingConfig}>
                        {savingConfig
                          ? <><i className="fas fa-spinner fa-spin me-2"></i>Guardando...</>
                          : <><i className="fas fa-save me-2"></i>Guardar Configuración Financiera</>
                        }
                      </button>
                      <button type="button" className="eb-btn-cancelar flex-grow-0 justify-content-center text-center" onClick={() => navigate('/gestion-finanzas')}>
                        <i className="fas fa-external-link-alt me-2"></i>Ir al Centro Financiero
                      </button>

                      {config.stripeAccountId && (
                          <a href="https://dashboard.stripe.com/login" target="_blank" rel="noopener noreferrer" className="btn btn-outline-primary flex-grow-0 d-flex align-items-center justify-content-center text-center" style={{ borderRadius: '12px' }}>
                              <i className="fab fa-stripe fs-5 me-2"></i>Mi Portal de Pagos
                          </a>
                      )}
                    </div>

                </div>
              )}

            </form>
          </div>

        </div>
      </div>

      {/* ── MODAL SEGURO: activar / pausar visitas de regalo ── */}
      {modalVisitas && (
        <div className="eb-visitas-modal-overlay" onClick={() => !procesandoVisitas && setModalVisitas(null)}>
          <div className="eb-visitas-modal" onClick={e => e.stopPropagation()}>
            <div className="eb-visitas-modal-icon">
              <i className={`fas ${modalVisitas === 'desactivar' ? 'fa-pause-circle' : 'fa-gift'}`}></i>
            </div>
            <h5 className="eb-visitas-modal-title">
              {modalVisitas === 'desactivar' ? 'Desactivar visitas de regalo' : 'Activar visitas de regalo'}
            </h5>

            {modalVisitas === 'desactivar' ? (
              <>
                <p className="eb-visitas-modal-text">
                  Vas a desactivar las visitas de regalo. ¿Cómo quieres hacerlo?
                </p>
                <div className="eb-visitas-choice">
                  <button type="button" className={`eb-visitas-choice-opt ${opcionDesactivar === 'pausar' ? 'is-active' : ''}`} onClick={() => setOpcionDesactivar('pausar')}>
                    <i className={`fas ${opcionDesactivar === 'pausar' ? 'fa-check-circle' : 'fa-circle'}`}></i>
                    <div><strong>Pausar para todos</strong><span>Nadie verá ni podrá canjear sus visitas. La caducidad sigue corriendo; si reactivas, las recuperan.</span></div>
                  </button>
                  <button type="button" className={`eb-visitas-choice-opt ${opcionDesactivar === 'solo-nuevos' ? 'is-active' : ''}`} onClick={() => setOpcionDesactivar('solo-nuevos')}>
                    <i className={`fas ${opcionDesactivar === 'solo-nuevos' ? 'fa-check-circle' : 'fa-circle'}`}></i>
                    <div><strong>Solo dejar de dar a nuevos</strong><span>Las cuentas nuevas ya no reciben visitas, pero las {cortesiasVigentes} vigente(s) siguen activas y canjeables hasta vencer.</span></div>
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="eb-visitas-modal-text">
                  Se reactivarán las visitas de regalo. Los atletas nuevos recibirán las suyas al ser aprobados.
                </p>
                {cortesiasVigentes > 0 && (
                  <div className="eb-visitas-choice">
                    <p className="eb-visitas-choice-q">Hay <strong>{cortesiasVigentes}</strong> visita(s) de cortesía vigentes. ¿Qué hago con ellas?</p>
                    <button type="button" className={`eb-visitas-choice-opt ${accionPaquetes === 'mantener' ? 'is-active' : ''}`} onClick={() => setAccionPaquetes('mantener')}>
                      <i className={`fas ${accionPaquetes === 'mantener' ? 'fa-check-circle' : 'fa-circle'}`}></i>
                      <div><strong>Mantener las existentes</strong><span>Los atletas a quienes no se les vencieron las vuelven a ver.</span></div>
                    </button>
                    <button type="button" className={`eb-visitas-choice-opt ${accionPaquetes === 'borrar' ? 'is-active' : ''}`} onClick={() => setAccionPaquetes('borrar')}>
                      <i className={`fas ${accionPaquetes === 'borrar' ? 'fa-check-circle' : 'fa-circle'}`}></i>
                      <div><strong>Borrarlas (cancelar)</strong><span>Se cancelan; solo los atletas nuevos recibirán visitas.</span></div>
                    </button>
                  </div>
                )}
              </>
            )}

            <label className="eb-visitas-modal-label">Confirma tu contraseña</label>
            <input
              type="password"
              className="eb-input"
              value={passwordVisitas}
              onChange={e => setPasswordVisitas(e.target.value)}
              placeholder="Tu contraseña de acceso"
              autoFocus
              autoComplete="current-password"
              disabled={procesandoVisitas}
            />

            <div className="eb-visitas-modal-actions">
              <button type="button" className="eb-visitas-btn-cancel" onClick={() => setModalVisitas(null)} disabled={procesandoVisitas}>Cancelar</button>
              <BotonSeguro
                onClick={confirmarToggleVisitas}
                className={`eb-visitas-btn-confirm ${modalVisitas === 'desactivar' ? 'is-pause' : ''}`}
                textoProcesando="Verificando..."
                disabled={procesandoVisitas || !passwordVisitas.trim()}
              >
                {modalVisitas === 'desactivar' ? 'Desactivar' : 'Activar'}
              </BotonSeguro>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}