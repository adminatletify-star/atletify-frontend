import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { globalAlert } from '../utils/globalAlert';
import RedGrayDatePicker from '../components/RedGrayDatePicker';
import TimeWheelPicker from '../components/TimeWheelPicker';
import GestionCuentasTransferencia from '../components/GestionCuentasTransferencia';
import BotonSeguro from '../components/BotonSeguro';
import AtletifyLoader from '../components/AtletifyLoader';
import BackButton from '../components/BackButton';
import '../assets/css/GestionClases.css'; // .gc-header / .gc-header-title (header estándar)
import './PagesCSS/GestionAnuncios.css';

const API = import.meta.env.VITE_API_URL;

// ── Helpers de fecha/hora ───────────────────────────────────────────────
const hoyISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const ahoraHHMM = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};
// Combina 'YYYY-MM-DD' + 'HH:MM' → string naïve 'YYYY-MM-DDTHH:MM:00' (wall-clock, como el resto de la app).
const combinar = (fecha, hora) => `${fecha}T${(hora || '00:00')}:00`;
const fmt12 = (hhmm) => {
  if (!hhmm) return '--:--';
  const [h, m] = hhmm.split(':').map(Number);
  const period = h < 12 ? 'AM' : 'PM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
};
const fmtFechaHora = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

// Estatus derivado del backend (Programada / Activa / Finalizada). El estado ya no es manual:
// lo calcula AnunciosController según las fechas. Fallback por si la API aún no lo manda.
const BADGE_ESTATUS = {
  Programada: { cls: 'gan-badge-programada', icon: 'fa-clock', label: 'Programada' },
  Activa:     { cls: 'gan-badge-active',     icon: 'fa-circle-check', label: 'Activa' },
  Finalizada: { cls: 'gan-badge-inactive',   icon: 'fa-circle-stop', label: 'Finalizada' },
};
const badgeEstatus = (a) =>
  BADGE_ESTATUS[a.estatus] || (a.activo ? BADGE_ESTATUS.Activa : BADGE_ESTATUS.Finalizada);

const GestionAnuncios = () => {
  const navigate = useNavigate();
  const [anuncios, setAnuncios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [config, setConfig] = useState(null); // configuración de pagos del box

  const [form, setForm] = useState({
    idAnuncio: 0,
    titulo: '',
    mensaje: '',
    aceptarDonacionesStripe: false,
    metaDonacion: '',
    mostrarRankingDonadores: false,
    activo: true
  });

  // Fecha/hora separadas para los pickers temáticos
  const [fechaInicio, setFechaInicio] = useState('');
  const [horaInicio, setHoraInicio] = useState('07:00');
  const [fechaFin, setFechaFin] = useState('');
  const [horaFin, setHoraFin] = useState('19:00');
  const [pickerHora, setPickerHora] = useState(null); // 'inicio' | 'fin' | null

  // Aportación manual
  const [miembros, setMiembros] = useState([]);
  const [showDonationModal, setShowDonationModal] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [donationForm, setDonationForm] = useState({ idUsuario: '', monto: '', metodoPago: '' });
  const [pasoDonacion, setPasoDonacion] = useState(1); // wizard: 1=donador, 2=monto, 3=método

  const box = JSON.parse(localStorage.getItem('box')) || {};
  const idBox = box.idBox || box.IdBox;

  const stripeDisponible = !!(config && config.aceptarPagosEnLinea && config.stripeAccountId);

  useEffect(() => {
    fetchAnuncios();
    fetchMiembros();
    fetchConfig();
  }, []);

  const authHeaders = () => ({ 'Authorization': `Bearer ${localStorage.getItem('token')}` });

  const fetchAnuncios = async () => {
    try {
      const res = await fetch(`${API}/api/anuncios/admin/box/${idBox}`, { headers: authHeaders() });
      if (res.ok) setAnuncios(await res.json());
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMiembros = async () => {
    try {
      const res = await fetch(`${API}/api/usuarios/box/${idBox}/miembros`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setMiembros(data.miembros || []);
      }
    } catch (error) {
      console.error('Error al cargar atletas:', error);
    }
  };

  const fetchConfig = async () => {
    try {
      const res = await fetch(`${API}/api/configuracionbox/${idBox}`, { headers: authHeaders() });
      if (res.ok) setConfig(await res.json());
    } catch (error) {
      console.error('Error al cargar configuración del box:', error);
    }
  };

  const resetForm = () => {
    setForm({
      idAnuncio: 0, titulo: '', mensaje: '',
      aceptarDonacionesStripe: false, metaDonacion: '', mostrarRankingDonadores: false
    });
    setFechaInicio(hoyISO());
    setHoraInicio(ahoraHHMM());
    setFechaFin('');
    setHoraFin('19:00');
    setIsEditing(false);
  };

  const handleOpenModal = (anuncio = null) => {
    if (anuncio) {
      setForm({
        idAnuncio: anuncio.idAnuncio,
        titulo: anuncio.titulo,
        mensaje: anuncio.mensaje,
        aceptarDonacionesStripe: !!anuncio.aceptarDonacionesStripe,
        metaDonacion: anuncio.metaDonacion || '',
        mostrarRankingDonadores: !!anuncio.mostrarRankingDonadores
      });
      const [fi, ti] = (anuncio.fechaInicio || '').split('T');
      const [ff, tf] = (anuncio.fechaFin || '').split('T');
      setFechaInicio(fi || hoyISO());
      setHoraInicio((ti || '07:00').slice(0, 5));
      setFechaFin(ff || '');
      setHoraFin((tf || '19:00').slice(0, 5));
      setIsEditing(true);
    } else {
      resetForm();
    }
    setShowModal(true);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  // minTime para el picker de hora según el día elegido.
  // Al EDITAR no bloqueamos el pasado (la campaña pudo iniciar ayer); solo al CREAR.
  const minFechaInicio = isEditing ? undefined : hoyISO();
  const minHoraInicio = (!isEditing && fechaInicio === hoyISO()) ? ahoraHHMM() : undefined;
  const minHoraFin = fechaFin && fechaFin === fechaInicio ? horaInicio : ((!isEditing && fechaFin === hoyISO()) ? ahoraHHMM() : undefined);

  const validar = () => {
    if (!form.titulo.trim() || !form.mensaje.trim()) {
      globalAlert.showError('El título y la descripción son obligatorios.');
      return false;
    }
    if (!fechaInicio || !horaInicio) {
      globalAlert.showError('Selecciona la fecha y hora de inicio.');
      return false;
    }
    if (!fechaFin || !horaFin) {
      globalAlert.showError('Selecciona la fecha y hora de fin.');
      return false;
    }
    const inicio = new Date(combinar(fechaInicio, horaInicio));
    const fin = new Date(combinar(fechaFin, horaFin));
    const ahora = new Date();
    ahora.setSeconds(0, 0);
    // Al crear no se permite iniciar en el pasado; al editar sí (la campaña pudo iniciar antes).
    if (!isEditing && inicio < ahora) {
      globalAlert.showError('La fecha y hora de inicio no pueden ser anteriores a este momento.');
      return false;
    }
    if (fin <= inicio) {
      globalAlert.showError('La fecha y hora de fin deben ser posteriores a las de inicio.');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validar()) return;

    const payload = {
      idAnuncio: form.idAnuncio,
      idBox,
      titulo: form.titulo.trim(),
      mensaje: form.mensaje.trim(),
      fechaInicio: combinar(fechaInicio, horaInicio),
      fechaFin: combinar(fechaFin, horaFin),
      aceptarDonacionesStripe: stripeDisponible ? form.aceptarDonacionesStripe : false,
      metaDonacion: form.metaDonacion ? parseFloat(form.metaDonacion) : null,
      mostrarRankingDonadores: form.mostrarRankingDonadores
    };

    try {
      const url = isEditing ? `${API}/api/anuncios/${form.idAnuncio}` : `${API}/api/anuncios`;
      const method = isEditing ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        globalAlert.showSuccess(isEditing ? 'Campaña actualizada.' : 'Campaña creada.');
        setShowModal(false);
        fetchAnuncios();
      } else {
        const err = await res.json().catch(() => ({}));
        globalAlert.showError(err.mensaje || 'Error al guardar.');
      }
    } catch (error) {
      globalAlert.showError('Error de conexión.');
    }
  };

  const handleDelete = async (anuncio) => {
    const ok = await window.wpConfirm(`¿Eliminar la campaña/anuncio "${anuncio.titulo}"? Esta acción no se puede deshacer.`);
    if (!ok) return;
    try {
      const res = await fetch(`${API}/api/anuncios/${anuncio.idAnuncio}`, { method: 'DELETE', headers: authHeaders() });
      if (res.ok) {
        globalAlert.showSuccess('Eliminado correctamente.');
        fetchAnuncios();
      } else {
        globalAlert.showError('Error al eliminar.');
      }
    } catch (error) {
      globalAlert.showError('Error al eliminar.');
    }
  };

  // Corta una campaña activa antes de su fecha de fin: pasa a "Finalizada" y deja de mostrarse.
  const handleFinalizar = async (anuncio) => {
    const ok = await window.wpConfirm(
      `¿Finalizar ahora la campaña "${anuncio.titulo}"? Dejará de mostrarse a los miembros de inmediato y no podrá reactivarse (tendrías que editar sus fechas).`
    );
    if (!ok) return;
    try {
      const res = await fetch(`${API}/api/anuncios/${anuncio.idAnuncio}/finalizar`, {
        method: 'POST',
        headers: authHeaders()
      });
      if (res.ok) {
        globalAlert.showSuccess('Campaña finalizada.');
        fetchAnuncios();
      } else {
        const err = await res.json().catch(() => ({}));
        globalAlert.showError(err.mensaje || 'No se pudo finalizar la campaña.');
      }
    } catch (error) {
      globalAlert.showError('Error de conexión al finalizar la campaña.');
    }
  };

  // ── Aportación manual (solo cobro presencial: efectivo y tarjeta en recepción) ──
  // La transferencia NO va aquí: esa la registra el donante con su comprobante y el admin la aprueba.
  const metodosManual = [];
  if (config?.aceptarEfectivo) metodosManual.push({ valor: 'Efectivo', label: 'Efectivo', icon: 'fa-money-bill-wave' });
  if (config?.aceptarTarjetaRecepcion) metodosManual.push({ valor: 'Tarjeta (Terminal)', label: 'Tarjeta (Terminal)', icon: 'fa-credit-card' });

  const handleOpenDonationModal = (anuncio) => {
    setSelectedCampaign(anuncio);
    setSearchTerm('');
    setPasoDonacion(1);
    setDonationForm({ idUsuario: '', monto: '', metodoPago: metodosManual[0]?.valor || 'Efectivo' });
    setShowDonationModal(true);
  };

  // Monto: solo dígitos, sin negativos, máximo 5 caracteres (hasta 99999).
  const handleMontoChange = (e) => {
    const limpio = (e.target.value || '').replace(/\D/g, '').slice(0, 5);
    setDonationForm(prev => ({ ...prev, monto: limpio }));
  };

  const atletaSeleccionado = miembros.find(m => String(m.idUsuario) === donationForm.idUsuario);

  const minTarjeta = config?.compraMinimaTarjeta ?? 0;
  const montoNum = parseFloat(donationForm.monto) || 0;
  const esTarjetaManual = donationForm.metodoPago === 'Tarjeta (Terminal)';
  const tarjetaBajoMinimo = esTarjetaManual && montoNum > 0 && montoNum < minTarjeta;

  const donationValido = donationForm.idUsuario && montoNum > 0 && donationForm.metodoPago && !tarjetaBajoMinimo;

  const handleDonationSubmit = async () => {
    if (!donationForm.idUsuario) return globalAlert.showError('Selecciona un atleta.');
    if (montoNum <= 0) return globalAlert.showError('Ingresa un monto válido mayor a 0.');
    if (!donationForm.metodoPago) return globalAlert.showError('Selecciona un método de pago.');
    if (tarjetaBajoMinimo) return globalAlert.showError(`El monto mínimo para tarjeta en recepción es $${minTarjeta.toFixed(2)}.`);

    try {
      const res = await fetch(`${API}/api/anuncios/${selectedCampaign.idAnuncio}/donar-manual`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          idUsuario: parseInt(donationForm.idUsuario),
          monto: montoNum,
          metodoPago: donationForm.metodoPago
        })
      });
      if (res.ok) {
        globalAlert.showSuccess('Aportación registrada con éxito.');
        setShowDonationModal(false);
        fetchAnuncios();
      } else {
        const err = await res.json().catch(() => ({}));
        globalAlert.showError(err.mensaje || 'Error al registrar la aportación.');
      }
    } catch (error) {
      globalAlert.showError('Error de conexión al registrar la aportación.');
    }
  };

  const miembrosFiltrados = miembros.filter(m => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return `${m.nombre || ''} ${m.apellidos || ''}`.toLowerCase().includes(term) || (m.correo || '').toLowerCase().includes(term);
  });

  if (loading) {
    return <div className="gan-container gan-loading-wrap"><AtletifyLoader /></div>;
  }

  return (
    <div className="gan-container">
      <header className="gc-header">
        <div className="d-flex align-items-center gap-3">
          <BackButton to="/admin-box-panel" />
          <h1 className="gc-header-title">Campañas y <span>Anuncios</span></h1>
          <button className="gan-btn-nueva ms-auto" onClick={() => handleOpenModal()}>
            <i className="fas fa-plus"></i>
            <span className="prd-btn-label">Nueva Campaña</span>
          </button>
        </div>
      </header>

      <div className="container-xl px-3 px-md-4 gan-content">
        <div className="row g-4">
          {anuncios.map(a => (
            <div key={a.idAnuncio} className="col-12 col-md-6 col-lg-4">
              <div className={`gan-card h-100 ${a.aceptarDonaciones ? 'campaign-active' : ''}`}>
                <div className="gan-card-body d-flex flex-column h-100">
                  <div className="d-flex justify-content-between align-items-start mb-3 gap-2">
                    <span className={`gan-badge ${badgeEstatus(a).cls}`}>
                      <i className={`fas ${badgeEstatus(a).icon}`}></i>
                      {badgeEstatus(a).label}
                    </span>
                    <div className="d-flex gap-2">
                      <button className="gan-icon-btn gan-icon-btn--edit" onClick={() => handleOpenModal(a)} title="Editar" aria-label="Editar">
                        <i className="fas fa-pen"></i>
                      </button>
                      <button className="gan-icon-btn gan-icon-btn--del" onClick={() => handleDelete(a)} title="Eliminar" aria-label="Eliminar">
                        <i className="fas fa-trash"></i>
                      </button>
                    </div>
                  </div>

                  <h4 className="gan-card-title text-truncate">{a.titulo}</h4>
                  <p className="gan-card-text flex-grow-1" style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {a.mensaje}
                  </p>

                  <div className="gan-card-footer">
                    <div className="gan-date-info mb-3">
                      <span><i className="far fa-calendar-alt"></i> {fmtFechaHora(a.fechaInicio)}</span>
                      <span><i className="far fa-flag"></i> {fmtFechaHora(a.fechaFin)}</span>
                    </div>

                    {a.comprobantesPendientes > 0 && (
                      <div className="gan-pendientes-badge mb-2" onClick={() => navigate(`/control-campania/${a.idAnuncio}`)}>
                        <i className="fas fa-receipt me-1"></i> {a.comprobantesPendientes} comprobante{a.comprobantesPendientes > 1 ? 's' : ''} por revisar
                      </div>
                    )}

                    {a.aceptarDonaciones && (
                      <div className="gan-recaudado-box">
                        <div className="gan-recaudado-head">
                          <span className="gan-recaudado-lbl"><i className="fas fa-hand-holding-heart me-1"></i> Recaudado</span>
                          <span className="gan-recaudado-monto">${a.totalRecaudado?.toFixed(2) || '0.00'}</span>
                        </div>
                        {a.metaDonacion > 0 && (
                          <>
                            <div className="gan-progress">
                              <div className="gan-progress-fill" role="progressbar" style={{ width: `${Math.min((a.totalRecaudado / a.metaDonacion) * 100, 100)}%` }}></div>
                            </div>
                            <div className="gan-recaudado-foot">
                              <span>{Math.round((a.totalRecaudado / a.metaDonacion) * 100)}% de avance</span>
                              <span className="gan-recaudado-meta">Meta: ${a.metaDonacion}</span>
                            </div>
                          </>
                        )}
                        <div className="mt-3 d-flex flex-column gap-2">
                          <button className="gan-btn-aportar" onClick={() => handleOpenDonationModal(a)}>
                            <i className="fas fa-plus me-1"></i> Aportación Manual
                          </button>
                          <button className="gan-btn-control" onClick={() => navigate(`/control-campania/${a.idAnuncio}`)}>
                            <i className="fas fa-chart-pie me-1"></i> Panel de control
                          </button>
                        </div>
                      </div>
                    )}

                    {!a.aceptarDonaciones && (
                      <button className="gan-btn-control mt-2" onClick={() => navigate(`/control-campania/${a.idAnuncio}`)}>
                        <i className="fas fa-chart-pie me-1"></i> Panel de control
                      </button>
                    )}

                    {(a.estatus ? a.estatus === 'Activa' : a.activo) && (
                      <BotonSeguro
                        type="button"
                        className="gan-btn-finalizar mt-2"
                        onClick={() => handleFinalizar(a)}
                        textoProcesando="Finalizando..."
                      >
                        <i className="fas fa-flag-checkered me-1"></i> Finalizar ahora
                      </BotonSeguro>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
          {anuncios.length === 0 && (
            <div className="col-12">
              <div className="gan-empty">
                <i className="fas fa-bullhorn gan-empty-icon"></i>
                <h4 className="gan-empty-title">No hay campañas ni anuncios</h4>
                <p className="gan-empty-text">Crea el primer aviso importante para que tus atletas y coaches lo visualicen al iniciar sesión o en su panel principal.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ════════ MODAL CREAR / EDITAR ════════ */}
      {showModal && createPortal(
        <div className="gan-modal-overlay">
          <div className="gan-modal-card animate__animated animate__fadeIn">
            <div className="gan-modal-header">
              <h4 className="gan-modal-title">{isEditing ? 'EDITAR ANUNCIO / CAMPAÑA' : 'NUEVO ANUNCIO / CAMPAÑA'}</h4>
              <button type="button" className="gan-btn-close" onClick={() => setShowModal(false)} aria-label="Cerrar">
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="gan-modal-body">
              <div className="gan-form-group">
                <label className="gan-label"><i className="fas fa-heading text-danger"></i> Título del Anuncio</label>
                <input type="text" className="gan-input" name="titulo" value={form.titulo} onChange={handleChange} placeholder="Ej. Campaña de Donativos para Renovación de Discos" />
              </div>

              <div className="gan-form-group">
                <label className="gan-label"><i className="fas fa-align-left text-danger"></i> Descripción / Detalles del Mensaje</label>
                <textarea className="gan-input" name="mensaje" value={form.mensaje} onChange={handleChange} rows="4" placeholder="Escribe aquí de forma clara y detallada la información que verán los atletas..."></textarea>
              </div>

              {/* FECHA + HORA DE INICIO */}
              <div className="row">
                <div className="col-md-6 gan-form-group">
                  <label className="gan-label"><i className="far fa-calendar-alt text-danger"></i> Fecha de Inicio</label>
                  <RedGrayDatePicker
                    value={fechaInicio}
                    min={minFechaInicio}
                    onChange={(v) => {
                      setFechaInicio(v);
                      // si el fin quedó antes del nuevo inicio, lo limpiamos
                      if (fechaFin && v && fechaFin < v) setFechaFin('');
                    }}
                    placeholder="Selecciona fecha"
                    inputClassName="gan-picker-input"
                  />
                </div>
                <div className="col-md-6 gan-form-group">
                  <label className="gan-label"><i className="far fa-clock text-danger"></i> Hora de Inicio</label>
                  <button type="button" className="gan-input gan-hora-btn" onClick={() => setPickerHora('inicio')}>
                    <i className="far fa-clock me-2"></i>{fmt12(horaInicio)}
                  </button>
                </div>
              </div>

              {/* FECHA + HORA DE FIN */}
              <div className="row">
                <div className="col-md-6 gan-form-group">
                  <label className="gan-label"><i className="far fa-calendar-check text-danger"></i> Fecha de Fin</label>
                  {!fechaInicio ? (
                    <div className="gan-input gan-input-disabled"><i className="fas fa-lock me-2"></i>Elige primero la fecha de inicio</div>
                  ) : (
                    <RedGrayDatePicker
                      value={fechaFin}
                      min={fechaInicio}
                      onChange={setFechaFin}
                      placeholder="Selecciona fecha"
                      inputClassName="gan-picker-input"
                    />
                  )}
                </div>
                <div className="col-md-6 gan-form-group">
                  <label className="gan-label"><i className="far fa-clock text-danger"></i> Hora de Fin</label>
                  <button type="button" className="gan-input gan-hora-btn" disabled={!fechaFin} onClick={() => setPickerHora('fin')}>
                    <i className="far fa-clock me-2"></i>{fmt12(horaFin)}
                  </button>
                </div>
              </div>
              <p className="gan-hint"><i className="fas fa-circle-info me-1"></i> La vigencia incluye hora: ej. 18 jun 7:00 AM → 18 jun 7:00 PM.</p>

              {/* RECAUDACIÓN: Meta + Leaderboard SIEMPRE visibles */}
              <div className="gan-donativos-card">
                <span className="gan-donativos-title"><i className="fas fa-hand-holding-heart me-2"></i>RECAUDACIÓN / APORTACIONES</span>

                <div className="gan-form-group mt-3">
                  <label className="gan-label text-warning"><i className="fas fa-money-bill-wave"></i> Meta de Donación (Opcional)</label>
                  <input type="number" className="gan-input" name="metaDonacion" value={form.metaDonacion} onChange={handleChange} placeholder="Ej. 15000" min="0" />
                  <span className="gan-hint">Escribe la meta para mostrar un indicador visual de avance a tu comunidad.</span>
                </div>

                <label className="gan-switch">
                  <input type="checkbox" className="gan-switch-input" name="mostrarRankingDonadores" checked={form.mostrarRankingDonadores} onChange={handleChange} />
                  <span className="gan-switch-slider slider-gold"></span>
                  <div>
                    <span className="text-white fw-bold d-block" style={{ fontSize: '0.9rem' }}>Mostrar Leaderboard de Donadores</span>
                    <span className="small text-white-50 d-block mt-1">Ranking honorífico con las aportaciones y nombres de quienes donaron al abrir la campaña.</span>
                  </div>
                </label>

                {/* Stripe: SOLO si el box tiene Pagos con Tarjeta (App) */}
                {stripeDisponible ? (
                  <label className="gan-switch mt-3">
                    <input type="checkbox" className="gan-switch-input" name="aceptarDonacionesStripe" checked={form.aceptarDonacionesStripe} onChange={handleChange} />
                    <span className="gan-switch-slider slider-gold"></span>
                    <div>
                      <span className="fw-bold text-warning d-block" style={{ fontFamily: 'var(--font-heading-alt)', textTransform: 'uppercase', fontSize: '0.9rem', letterSpacing: '0.5px' }}>
                        <i className="fab fa-stripe me-2"></i>Aceptar Donativos en Línea (Stripe)
                      </span>
                      <span className="small text-white-50 d-block mt-1">El donante paga con tarjeta y absorbe la comisión; la causa recibe el monto completo.</span>
                    </div>
                  </label>
                ) : (
                  <div className="gan-stripe-off mt-3">
                    <i className="fas fa-circle-info me-2"></i>
                    Para aceptar donativos en línea con Stripe, activa <strong>"Pagos con Tarjeta (App)"</strong> y vincula tu cuenta de Stripe en <strong>Editar Box</strong>.
                  </div>
                )}

                {/* Tarjetas de transferencia POR CAMPAÑA (solo al editar: requieren campaña existente) */}
                {isEditing ? (
                  <div className="mt-3">
                    <GestionCuentasTransferencia idAnuncio={form.idAnuncio} />
                  </div>
                ) : (
                  <div className="gan-stripe-off mt-3">
                    <i className="fas fa-building-columns me-2"></i>
                    Guarda la campaña y vuelve a <strong>Editar</strong> para declarar las cuentas/CLABE a las que tu comunidad podrá transferir.
                  </div>
                )}
              </div>

              <div className="gan-vigencia-info mb-4">
                <i className="fas fa-circle-info gan-vigencia-info-icon"></i>
                <span>
                  La campaña se <strong>activa sola</strong> al llegar su fecha y hora de inicio, y se
                  <strong> finaliza sola</strong> al llegar la de fin. Si el inicio es a futuro, nace como
                  <strong> Programada</strong> y no se mostrará a nadie hasta entonces.
                </span>
              </div>

              <div className="gan-modal-footer">
                <button type="button" className="btn-gan-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                <BotonSeguro type="button" className="btn-gan-primary" onClick={handleSubmit} textoProcesando="Guardando...">
                  Guardar Campaña
                </BotonSeguro>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Picker de hora (rueda) */}
      {pickerHora && createPortal(
        <div className="twp-overlay" onClick={(e) => { if (e.target === e.currentTarget) setPickerHora(null); }}>
          <div className="twp-modal">
            <TimeWheelPicker
              value={pickerHora === 'inicio' ? horaInicio : horaFin}
              minTime={pickerHora === 'inicio' ? minHoraInicio : minHoraFin}
              onAccept={(t) => {
                if (pickerHora === 'inicio') {
                  setHoraInicio(t);
                  // si fin es el mismo día y quedó antes, empuja la hora fin
                  if (fechaFin === fechaInicio && horaFin <= t) setHoraFin(t);
                } else {
                  setHoraFin(t);
                }
                setPickerHora(null);
              }}
              onCancel={() => setPickerHora(null)}
            />
          </div>
        </div>,
        document.body
      )}

      {/* ════════ WIZARD APORTACIÓN MANUAL (3 modales/pasos) ════════ */}
      {showDonationModal && selectedCampaign && createPortal(
        <div className="gan-modal-overlay">
          <div className="gan-modal-card gan-modal-card--gold animate__animated animate__fadeIn" style={{ maxWidth: '560px' }}>
            <div className="gan-modal-header gan-modal-header--gold">
              <h4 className="gan-modal-title gan-modal-title--gold">
                <i className="fas fa-hand-holding-heart me-2"></i>REGISTRAR APORTACIÓN
              </h4>
              <button type="button" className="gan-btn-close" onClick={() => setShowDonationModal(false)} aria-label="Cerrar">
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="gan-modal-body">
              {/* Indicador de pasos */}
              <div className="gan-wizard-steps">
                {[{ n: 1, l: 'Donador' }, { n: 2, l: 'Monto' }, { n: 3, l: 'Método' }].map(s => (
                  <div key={s.n} className={`gan-wizard-step ${pasoDonacion === s.n ? 'activo' : ''} ${pasoDonacion > s.n ? 'hecho' : ''}`}>
                    <span className="gan-wizard-dot">{pasoDonacion > s.n ? <i className="fas fa-check"></i> : s.n}</span>
                    <span className="gan-wizard-lbl">{s.l}</span>
                  </div>
                ))}
              </div>

              <div className="mb-3 p-2 rounded-3" style={{ backgroundColor: 'rgba(245, 166, 35, 0.05)', border: '1px solid rgba(245, 166, 35, 0.1)' }}>
                <span className="small text-white-50" style={{ fontSize: '0.72rem' }}>Campaña: </span>
                <span className="fw-bold text-white">{selectedCampaign.titulo}</span>
              </div>

              {/* ───────── PASO 1 — DONADOR ───────── */}
              {pasoDonacion === 1 && (
                <>
                  <div className="gan-seccion">
                    <div className="gan-seccion-num">1</div>
                    <span className="gan-seccion-titulo"><i className="fas fa-user me-2"></i>¿Quién aporta?</span>
                  </div>
                  <div className="gan-search-wrapper">
                    <i className="fas fa-search"></i>
                    <input type="text" placeholder="Buscar atleta por nombre o correo..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                  </div>
                  <div className="gan-atletas-list">
                    {miembrosFiltrados.map(m => {
                      const isSelected = donationForm.idUsuario === String(m.idUsuario);
                      const nameInitials = (m.nombre || m.correo || 'U').charAt(0).toUpperCase();
                      const nombreCompleto = `${m.nombre || ''} ${m.apellidos || ''}`.trim() || (m.correo ? m.correo.split('@')[0] : 'Miembro');
                      return (
                        <div key={m.idUsuario} className={`gan-atleta-card ${isSelected ? 'selected' : ''}`} role="button" tabIndex={0}
                          onClick={() => setDonationForm(prev => ({ ...prev, idUsuario: String(m.idUsuario) }))}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setDonationForm(prev => ({ ...prev, idUsuario: String(m.idUsuario) })); } }}>
                          <div className="gan-atleta-avatar">{m.foto ? <img src={m.foto} alt={nombreCompleto} /> : <span>{nameInitials}</span>}</div>
                          <div className="gan-atleta-info">
                            <span className="gan-atleta-nombre">{nombreCompleto}</span>
                            <small className="gan-atleta-correo">{m.correo}</small>
                          </div>
                          {isSelected ? <i className="fas fa-check-circle gan-atleta-chevron" style={{ color: '#f5a623' }} /> : <i className="fas fa-chevron-right gan-atleta-chevron" />}
                        </div>
                      );
                    })}
                    {miembrosFiltrados.length === 0 && (
                      <div className="text-center py-4 text-white-50 small">
                        <i className="fas fa-user-slash d-block fs-3 mb-2 opacity-50"></i>
                        Ningún miembro coincide con la búsqueda.
                      </div>
                    )}
                  </div>
                  <div className="gan-modal-footer">
                    <button type="button" className="btn-gan-secondary" onClick={() => setShowDonationModal(false)}>Cancelar</button>
                    <button type="button" className="btn-gan-primary" disabled={!donationForm.idUsuario}
                      style={{ background: '#f5a623', opacity: donationForm.idUsuario ? 1 : 0.5 }}
                      onClick={() => setPasoDonacion(2)}>
                      Continuar <i className="fas fa-arrow-right ms-1"></i>
                    </button>
                  </div>
                </>
              )}

              {/* ───────── PASO 2 — MONTO ───────── */}
              {pasoDonacion === 2 && (
                <>
                  {atletaSeleccionado && (
                    <div className="gan-atleta-elegido">
                      <div className="gan-atleta-avatar">{atletaSeleccionado.foto ? <img src={atletaSeleccionado.foto} alt="" /> : <span>{(atletaSeleccionado.nombre || 'U').charAt(0).toUpperCase()}</span>}</div>
                      <div className="gan-atleta-info">
                        <span className="gan-atleta-nombre">{`${atletaSeleccionado.nombre || ''} ${atletaSeleccionado.apellidos || ''}`.trim()}</span>
                        <small className="gan-atleta-correo">{atletaSeleccionado.correo}</small>
                      </div>
                      <button type="button" className="gan-cambiar-btn" onClick={() => setPasoDonacion(1)}>Cambiar</button>
                    </div>
                  )}
                  <div className="gan-seccion mt-3">
                    <div className="gan-seccion-num">2</div>
                    <span className="gan-seccion-titulo"><i className="fas fa-dollar-sign me-2"></i>¿Cuánto aporta?</span>
                  </div>
                  <div className="gan-monto-wrapper">
                    <span className="gan-monto-signo">$</span>
                    <input type="text" inputMode="numeric" className="gan-monto-input" value={donationForm.monto}
                      placeholder="0" maxLength={5} onChange={handleMontoChange} autoFocus />
                    <span className="gan-monto-moneda">MXN</span>
                  </div>
                  <p className="gan-hint mt-2"><i className="fas fa-circle-info me-1"></i>Solo números enteros, máximo 5 dígitos (hasta $99,999).</p>
                  <div className="gan-modal-footer">
                    <button type="button" className="btn-gan-secondary" onClick={() => setPasoDonacion(1)}><i className="fas fa-arrow-left me-1"></i> Atrás</button>
                    <button type="button" className="btn-gan-primary" disabled={!(montoNum > 0)}
                      style={{ background: '#f5a623', opacity: montoNum > 0 ? 1 : 0.5 }}
                      onClick={() => setPasoDonacion(3)}>
                      Continuar <i className="fas fa-arrow-right ms-1"></i>
                    </button>
                  </div>
                </>
              )}

              {/* ───────── PASO 3 — MÉTODO ───────── */}
              {pasoDonacion === 3 && (
                <>
                  {atletaSeleccionado && (
                    <div className="d-flex justify-content-between align-items-center mb-2 px-1" style={{ fontSize: '0.85rem' }}>
                      <span className="text-white-50">{`${atletaSeleccionado.nombre || ''} ${atletaSeleccionado.apellidos || ''}`.trim()}</span>
                      <span className="fw-bold text-warning">${montoNum.toLocaleString('es-MX')} MXN</span>
                    </div>
                  )}
                  <div className="gan-seccion">
                    <div className="gan-seccion-num">3</div>
                    <span className="gan-seccion-titulo"><i className="fas fa-wallet me-2"></i>¿Cómo paga?</span>
                  </div>
                  {metodosManual.length === 0 ? (
                    <div className="gan-stripe-off">
                      <i className="fas fa-triangle-exclamation me-2"></i>
                      El box no tiene métodos de pago en recepción activos. Actívalos en <strong>Editar Box</strong>.
                    </div>
                  ) : (
                    <div className="gan-metodos">
                      {metodosManual.map(mp => (
                        <button key={mp.valor} type="button"
                          className={`gan-metodo-chip ${donationForm.metodoPago === mp.valor ? 'activo' : ''}`}
                          onClick={() => setDonationForm(prev => ({ ...prev, metodoPago: mp.valor }))}>
                          <i className={`fas ${mp.icon}`}></i> {mp.label}
                        </button>
                      ))}
                    </div>
                  )}
                  {esTarjetaManual && (
                    <p className={`gan-hint mt-2 ${tarjetaBajoMinimo ? 'gan-hint-error' : ''}`}>
                      <i className="fas fa-circle-info me-1"></i>
                      Monto mínimo para tarjeta en recepción: ${minTarjeta.toFixed(2)}.
                      {tarjetaBajoMinimo && ' El monto es menor al mínimo.'}
                    </p>
                  )}
                  <div className="gan-modal-footer">
                    <button type="button" className="btn-gan-secondary" onClick={() => setPasoDonacion(2)}><i className="fas fa-arrow-left me-1"></i> Atrás</button>
                    <BotonSeguro type="button" className="btn-gan-primary" onClick={handleDonationSubmit} disabled={!donationValido}
                      style={{ background: '#f5a623', boxShadow: '0 4px 15px rgba(245, 166, 35, 0.3)' }} textoProcesando="Registrando...">
                      Registrar Ingreso
                    </BotonSeguro>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default GestionAnuncios;
