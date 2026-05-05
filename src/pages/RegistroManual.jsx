import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import DateWheelPicker from '../components/DateWheelPicker';
import BackButton from '../components/BackButton';
import CategoriaBasePicker from '../components/CategoriaBasePicker';
import TallaPlayeraPicker from '../components/TallaPlayeraPicker';
import GeneroPicker from '../components/GeneroPicker';
import SelectorPlanPicker from '../components/SelectorPlanPicker';
import PromocionPicker from '../components/PromocionPicker';
import MetodoPagoPicker from '../components/MetodoPagoPicker';
import '../assets/css/RegistroManual.css';
import BotonSeguro from '../components/BotonSeguro';

export default function RegistroManual() {
  const [formData, setFormData] = useState({
    nombre: '', apellidos: '', correo: '', username: '', telefono: '', genero: '', fechaNacimiento: '',
    peso: '', tallaPlayera: '', categoria: 'Novato', experiencia: '', esDeConfianza: false
  });

  const [esEquipoTrabajo, setEsEquipoTrabajo] = useState(false);
  const [rolEquipo, setRolEquipo] = useState('Coach');
  const [suscripcionPermanente, setSuscripcionPermanente] = useState(false);

  // Membresía y Pago
  const [planes, setPlanes] = useState([]);
  const [descuentos, setDescuentos] = useState([]);
  const [configBox, setConfigBox] = useState(null);
  const [planSeleccionado, setPlanSeleccionado] = useState('');
  const [descuentoSeleccionado, setDescuentoSeleccionado] = useState('');
  const [formCobro, setFormCobro] = useState({
    monto1: '', metodo1: 'Efectivo',
    monto2: '', metodo2: '',
    notas: '', cobrarInscripcion: false, montoInscripcion: ''
  });

  const [pinAdmin, setPinAdmin] = useState('');
  const [mostrarModalPin, setMostrarModalPin] = useState(false);
  const [contrasenaGenerada, setContrasenaGenerada] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingPlanes, setLoadingPlanes] = useState(false);
  const [mostrarDatePicker, setMostrarDatePicker] = useState(false);
  const [mostrarModalCobro, setMostrarModalCobro] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({ ...formData, [name]: type === 'checkbox' ? checked : value });
  };

  // Cargar planes y descuentos cuando se monta el componente
  const cargarDatos = async () => {
    setLoadingPlanes(true);
    try {
      const boxActual = JSON.parse(localStorage.getItem('box'));
      const token = localStorage.getItem('token');
      if (!boxActual || !token) return;

      const headers = { 'Authorization': `Bearer ${token}` };

      // Cargar planes
      const resPlanes = await fetch(`${import.meta.env.VITE_API_URL}/finanzas/planes/${boxActual.idBox}`, { headers });
      if (resPlanes.ok) {
        const planesData = await resPlanes.json();
        setPlanes(planesData.filter(p => p.esVisible !== false));
      }

      // Cargar descuentos activos
      const resDescuentos = await fetch(`${import.meta.env.VITE_API_URL}/finanzas/descuentos/${boxActual.idBox}`, { headers });
      if (resDescuentos.ok) {
        const descuentosData = await resDescuentos.json();
        setDescuentos(descuentosData.filter(d => d.activo));
      }

      // Cargar configuración del box para obtener monto de inscripción
      const resConfig = await fetch(`${import.meta.env.VITE_API_URL}/configuracionbox/${boxActual.idBox}`, { headers });
      if (resConfig.ok) {
        const configData = await resConfig.json();
        setConfigBox(configData);
        // Actualizar el monto de inscripción con el del box
        const montoInsc = configData?.montoInscripcion || 250;
        setFormCobro(prev => ({ ...prev, montoInscripcion: montoInsc.toString() }));
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoadingPlanes(false);
    }
  };

  // Usar useEffect para cargar datos al montar
  useEffect(() => {
    cargarDatos();
  }, []);

  const showAlert = (message, type = 'danger') => {
    alert(message);
  };

  // Calcular total con descuentos
  const planAplicado = planes.find(p => p.idPlan === parseInt(planSeleccionado));
  const descSeleccionado = descuentos.find(d => d.idDescuento === parseInt(descuentoSeleccionado));
  const precioBase = planAplicado?.precio || 0;
  const descuentoMonto = descSeleccionado ? (precioBase * (descSeleccionado.porcentaje / 100)) : 0;
  const precioConDescuento = precioBase - descuentoMonto;
  const costoInscripcion = formCobro.cobrarInscripcion ? (parseFloat(formCobro.montoInscripcion) || 0) : 0;
  const totalACobrar = precioConDescuento + costoInscripcion;
  const restante = totalACobrar - (parseFloat(formCobro.monto1) || 0);

  // Auto-calcular monto2 basado en restante
  useEffect(() => {
    if (restante > 0 && formCobro.monto1 !== '') {
      setFormCobro(prev => ({ ...prev, monto2: restante.toFixed(2) }));
    } else {
      setFormCobro(prev => ({ ...prev, monto2: '', metodo2: '' }));
    }
  }, [restante, formCobro.monto1]);

  const verificarPinYGenerar = (e) => {
    e.preventDefault();
    if (pinAdmin === '1234') {
      const prefijo = formData.nombre ? formData.nombre.substring(0, 3).toUpperCase() : 'WOLF';
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      const nuevaPass = `${prefijo}-${randomNum}*`;

      setContrasenaGenerada(nuevaPass);
      setMostrarModalPin(false);
      setPinAdmin('');
      showAlert('Contraseña genérica generada. Anótala y dásela al atleta.', 'success');
    } else {
      showAlert('PIN de Administrador incorrecto.', 'danger');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!contrasenaGenerada) {
      showAlert('¡Alto! Primero genera una contraseña con el PIN de Admin', 'warning');
      return;
    }

    if (!formData.username) {
      showAlert('El Username (Alias) es obligatorio.', 'warning');
      return;
    }

    if (!formData.telefono || formData.telefono.length === 0) {
      showAlert('El teléfono es obligatorio.', 'warning');
      return;
    }

    if (formData.telefono.length > 10) {
      showAlert('El teléfono no puede tener más de 10 caracteres.', 'warning');
      return;
    }

    if (!esEquipoTrabajo && !planSeleccionado) {
      showAlert('Debes seleccionar un plan de membresía.', 'warning');
      return;
    }

    if (!esEquipoTrabajo && !formCobro.monto1) {
      showAlert('Debes ingresar el monto a cobrar.', 'warning');
      return;
    }

    // Validar que si hay restante, se seleccione método 2
    const m1 = parseFloat(formCobro.monto1) || 0;
    const m2 = parseFloat(formCobro.monto2) || 0;
    if (!esEquipoTrabajo && (m1 + m2) < totalACobrar) {
      return showAlert(`Faltan $${(totalACobrar - (m1 + m2)).toFixed(2)}. Ingresa el monto completo.`, 'warning');
    }

    setLoading(true);
    const boxActual = JSON.parse(localStorage.getItem('box'));
    const correoFinal = formData.correo ? formData.correo : `${formData.username.toLowerCase()}@wolfpack.local`;

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/usuarios/registro-manual`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: formData.nombre,
          apellidos: formData.apellidos,
          correo: correoFinal,
          username: formData.username,
          telefono: formData.telefono,
          contrasena: contrasenaGenerada,
          idBoxPredeterminado: boxActual ? boxActual.idBox : null,
          genero: formData.genero,
          fechaNacimiento: formData.fechaNacimiento ? new Date(formData.fechaNacimiento).toISOString() : null,
          peso: formData.peso ? parseFloat(formData.peso) : null,
          tallaPlayera: formData.tallaPlayera,
          categoriaBase: formData.categoria,
          deporteExperiencia: formData.experiencia,
          tieneExperiencia: formData.experiencia ? true : false,
          esDeConfianza: formData.esDeConfianza,
          // Plan y Pago
          idPlan: esEquipoTrabajo && suscripcionPermanente ? 0 : parseInt(planSeleccionado),
          montoMetodo1: esEquipoTrabajo && suscripcionPermanente ? 0 : m1,
          metodoPago1: esEquipoTrabajo && suscripcionPermanente ? 'Efectivo' : formCobro.metodo1,
          montoMetodo2: esEquipoTrabajo && suscripcionPermanente ? null : (m2 > 0 ? m2 : null),
          metodoPago2: esEquipoTrabajo && suscripcionPermanente ? null : (m2 > 0 ? formCobro.metodo2 : null),
          idDescuento: (!esEquipoTrabajo && descuentoSeleccionado) ? parseInt(descuentoSeleccionado) : null,
          cobrarInscripcion: esEquipoTrabajo && suscripcionPermanente ? false : formCobro.cobrarInscripcion,
          notas: esEquipoTrabajo ? `Registro de ${rolEquipo} al equipo de trabajo` : (formCobro.notas || `Registro manual de ${formData.nombre}`),
          rol: esEquipoTrabajo ? rolEquipo : 'Atleta',
          exentoDePago: esEquipoTrabajo && suscripcionPermanente
        })
      });

      const data = await response.json();

      if (response.ok) {
        showAlert('¡Atleta registrado con éxito! Membresía activada y pago procesado.', 'success');
        setFormData({
          nombre: '', apellidos: '', correo: '', username: '', telefono: '', genero: '', fechaNacimiento: '',
          peso: '', tallaPlayera: '', categoria: 'Novato', experiencia: '', esDeConfianza: false
        });
        setPlanSeleccionado('');
        setDescuentoSeleccionado('');
        const montoInsc = configBox?.montoInscripcion || 250;
        setFormCobro({ monto1: '', metodo1: 'Efectivo', monto2: '', metodo2: '', notas: '', cobrarInscripcion: false, montoInscripcion: montoInsc.toString() });
        setContrasenaGenerada(null);
        setMostrarModalCobro(false);
        setEsEquipoTrabajo(false);
        setSuscripcionPermanente(false);
      } else {
        showAlert(data.mensaje || 'Error al registrar el atleta', 'danger');
      }
    } catch (error) {
      showAlert('Error de conexión con el servidor.', 'danger');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="registro-manual-container">
      <header className="registro-header">
        <BackButton to="/admin-box-panel" />
        <div className="registro-header-icon d-none d-sm-flex">
          <i className="fas fa-user-plus"></i>
        </div>
        <div>
          <h2 className="registro-header-title">Alta Manual de <span className="text-danger">Atleta</span></h2>
          <p className="registro-header-subtitle">Registro directo sin aprobación previa</p>
        </div>
      </header>

      <div className="container">
        <div className="row">
          <div className="col-lg-8 mb-4">
            <div className="card registro-card text-white h-100">
              <div className="card-body p-4 p-md-5">
                <form onSubmit={handleSubmit}>
                  <h5 className="registro-section-title"><i className="fas fa-user-edit me-2"></i>Datos Personales</h5>

                  <div className="row">
                    <div className="col-md-6 mb-4 registro-col-mobile">
                      <label className="form-label registro-label">Nombre(s)</label>
                      <input type="text" className="form-control registro-input" name="nombre" value={formData.nombre} onChange={e => { const v = e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g, ''); setFormData({ ...formData, nombre: v }); }} required />
                    </div>
                    <div className="col-md-6 mb-4 registro-col-mobile">
                      <label className="form-label registro-label">Apellido(s)</label>
                      <input type="text" className="form-control registro-input" name="apellidos" value={formData.apellidos} onChange={e => { const v = e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g, ''); setFormData({ ...formData, apellidos: v }); }} required />
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-4 mb-4 registro-col-mobile">
                      <label className="form-label registro-label text-warning"><i className="fas fa-at me-1"></i>Username Único</label>
                      <input type="text" className="form-control registro-input border-warning" name="username" value={formData.username} onChange={handleChange} placeholder="Ej. juanperez99" required />
                    </div>
                    <div className="col-md-4 mb-4 registro-col-mobile">
                      <label className="form-label registro-label text-warning"><i className="fas fa-phone-alt me-1"></i>Teléfono</label>
                      <input type="text" className="form-control registro-input border-warning" name="telefono" value={formData.telefono} onChange={(e) => { const v = e.target.value.replace(/[^0-9+-\s]/g, '').substring(0, 10); setFormData({ ...formData, telefono: v }); }} placeholder="Ej. 6621234567" required />
                    </div>
                    <div className="col-md-4 mb-4 registro-col-mobile">
                      <label className="form-label registro-label">Correo (Opcional)</label>
                      <input type="email" className="form-control registro-input" name="correo" value={formData.correo} onChange={handleChange} placeholder="Dejar vacío si no tiene" />
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-4 mb-4 registro-col-mobile">
                      <label className="form-label registro-label">Género</label>
                      <GeneroPicker valor={formData.genero} onCambiar={v => setFormData({ ...formData, genero: v })} />
                    </div>
                    <div className="col-md-4 mb-4 registro-col-mobile">
                      <label className="form-label registro-label">Fecha de Nac.</label>
                      <button type="button" className={`registro-fecha-btn w-100${mostrarDatePicker ? ' registro-fecha-btn--open' : ''}`} onClick={() => setMostrarDatePicker(v => !v)}>
                        <i className="fas fa-calendar-alt me-2"></i>
                        {formData.fechaNacimiento ? new Date(formData.fechaNacimiento).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : <span className="registro-fecha-placeholder">Seleccionar...</span>}
                      </button>
                    </div>
                    <div className="col-md-4 mb-4 registro-col-mobile">
                      <label className="form-label registro-label">Peso (Kilos)</label>
                      <input type="number" className="form-control registro-input" name="peso" value={formData.peso} onChange={handleChange} placeholder="Ej. 75" />
                    </div>
                  </div>

                  {mostrarDatePicker && createPortal(
                    <div className="dwp-overlay" onClick={(e) => { if (e.target === e.currentTarget) setMostrarDatePicker(false); }}>
                      <div className="dwp-modal">
                        <DateWheelPicker initialDate={formData.fechaNacimiento ? new Date(formData.fechaNacimiento) : new Date(2000, 0, 1)} onAccept={(date) => { setFormData({ ...formData, fechaNacimiento: date.toISOString() }); setMostrarDatePicker(false); }} onCancel={() => setMostrarDatePicker(false)} />
                      </div>
                    </div>, document.body
                  )}

                  <h5 className="registro-section-title mt-3"><i className="fas fa-dumbbell me-2"></i>Datos Deportivos y Privilegios</h5>

                  <div className="row">
                    <div className="col-md-4 mb-4 registro-col-mobile">
                      <label className="form-label registro-label">Categoría Base</label>
                      <CategoriaBasePicker valor={formData.categoria} onCambiar={v => setFormData({ ...formData, categoria: v })} />
                    </div>
                    <div className="col-md-4 mb-4 registro-col-mobile">
                      <label className="form-label registro-label">Talla Playera</label>
                      <TallaPlayeraPicker valor={formData.tallaPlayera} onCambiar={v => setFormData({ ...formData, tallaPlayera: v })} />
                    </div>
                    <div className="col-md-4 mb-4 registro-col-mobile">
                      <label className="form-label registro-label">Deporte Previo</label>
                      <input type="text" className="form-control registro-input" name="experiencia" value={formData.experiencia} onChange={handleChange} placeholder="Ej. Gym, Natación..." />
                    </div>
                  </div>

                  {/* 👇 EL SWITCH DE FIADO 👇 */}
                  <div className="form-check form-switch mb-4 p-3 rounded" style={{ backgroundColor: 'rgba(46, 204, 113, 0.1)', border: '1px solid rgba(46, 204, 113, 0.3)' }}>
                    <input className="form-check-input bg-success border-success ms-1" type="checkbox" id="checkConfianza" name="esDeConfianza" checked={formData.esDeConfianza} onChange={handleChange} />
                    <label className="form-check-label text-success ms-3 fw-bold" htmlFor="checkConfianza">
                      <i className="fas fa-handshake me-2"></i>Atleta de Confianza (Permitir dar fiado en tienda)
                    </label>
                  </div>

                  <h5 className="registro-section-title mt-4"><i className="fas fa-credit-card me-2"></i>Membresía</h5>

                  {/* NUEVO INTERRUPTOR DE EQUIPO DE TRABAJO */}
                  <div className="form-check form-switch mb-4 p-3 rounded" style={{ backgroundColor: 'rgba(52, 152, 219, 0.1)', border: '1px solid rgba(52, 152, 219, 0.3)' }}>
                    <input className="form-check-input bg-info border-info ms-1" type="checkbox" id="checkEquipo" checked={esEquipoTrabajo} onChange={(e) => {
                      setEsEquipoTrabajo(e.target.checked);
                      if (e.target.checked) setSuscripcionPermanente(true);
                    }} />
                    <label className="form-check-label text-info ms-3 fw-bold" htmlFor="checkEquipo">
                      <i className="fas fa-users-cog me-2"></i>¿Este usuario formará parte del equipo de trabajo?
                    </label>
                  </div>

                  {esEquipoTrabajo && (
                    <div className="row mb-4">
                      <div className="col-md-6">
                        <label className="form-label registro-label">Rol en el equipo</label>
                        <select className="form-select registro-input" value={rolEquipo} onChange={e => setRolEquipo(e.target.value)}>
                          <option value="Coach">Coach</option>
                          <option value="Staff">Staff</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {esEquipoTrabajo ? (
                    <div className="form-check form-switch mb-4 p-3 rounded" style={{ backgroundColor: 'rgba(241, 196, 15, 0.1)', border: '1px solid rgba(241, 196, 15, 0.3)' }}>
                      <input className="form-check-input bg-warning border-warning ms-1" type="checkbox" id="checkPermanente" checked={suscripcionPermanente} onChange={(e) => setSuscripcionPermanente(e.target.checked)} />
                      <label className="form-check-label text-warning ms-3 fw-bold" htmlFor="checkPermanente">
                        <i className="fas fa-infinity me-2"></i>Suscripción permanente (Exento de pago)
                      </label>
                    </div>
                  ) : (
                    <div className="row">
                      <div className="col-12 mb-4">
                        {loadingPlanes ? (
                          <div className="text-center" style={{ color: '#888' }}>Cargando planes...</div>
                        ) : planes.length > 0 ? (
                          <SelectorPlanPicker
                            planes={planes}
                            valor={planSeleccionado}
                            onCambiar={(planId) => {
                              setPlanSeleccionado(planId);
                              setMostrarModalCobro(true);
                            }}
                          />
                        ) : (
                          <div className="alert alert-warning mb-0">No hay planes disponibles</div>
                        )}
                      </div>
                    </div>
                  )}

                  <hr className="registro-divider" />

                  <div className="d-flex justify-content-end">
                    {/* Botón removido - El submit ahora está en el modal de cobro EXCEPTO PARA EL EQUIPO DE TRABAJO */}
                    {esEquipoTrabajo && suscripcionPermanente && (
                      <BotonSeguro type="submit" className="btn btn-success" disabled={loading} tiempoBloqueo={1500} textoProcesando="Guardando...">
                        <i className="fas fa-check me-2"></i>Registrar Miembro del Equipo
                      </BotonSeguro>
                    )}
                  </div>
                </form>
              </div>
            </div>
          </div>

          {/* COLUMNA DERECHA: Seguridad */}
          <div className="col-lg-4 mb-4">
            <div className="card registro-card registro-card-security text-white h-100">
              <div className="card-body p-4 text-center d-flex flex-column justify-content-center">
                <div className="mb-4">
                  <div className="registro-security-icon"><i className="fas fa-shield-alt text-danger fa-2x"></i></div>
                  <h4 className="registro-security-title">Credenciales</h4>
                  <p className="registro-security-desc">Genera una contraseña genérica para este atleta protegido por tu PIN.</p>
                </div>

                {contrasenaGenerada ? (
                  <div className="registro-password-box mb-3">
                    <span className="registro-password-label d-block">Contraseña Generada:</span>
                    <h3 className="registro-password-value">{contrasenaGenerada}</h3>
                  </div>
                ) : (
                  <>
                    {mostrarModalPin ? (
                      <div className="registro-pin-container">
                        <label className="form-label registro-label">Ingresa tu PIN</label>
                        <input type="password" className="form-control registro-input registro-pin-input mb-3" value={pinAdmin} onChange={(e) => setPinAdmin(e.target.value)} maxLength="4" autoFocus />
                        <div className="d-flex gap-2">
                          <button className="btn btn-outline-secondary w-50 registro-btn" onClick={() => setMostrarModalPin(false)}>Cancelar</button>
                          <button className="btn btn-danger w-50 registro-btn" onClick={verificarPinYGenerar}>Generar</button>
                        </div>
                      </div>
                    ) : (
                      <button className="btn btn-outline-danger w-100 py-3 registro-btn" onClick={() => setMostrarModalPin(true)} disabled={!formData.nombre} title={!formData.nombre ? "Escribe un nombre primero" : ""}>
                        <i className="fas fa-key me-2"></i>Generar Contraseña
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL DE COBRO - Punto de Venta */}
      {mostrarModalCobro && planSeleccionado && planAplicado && (
        <div className="finanzas-modal-overlay" onClick={() => setMostrarModalCobro(false)}>
          <div className="finanzas-modal" style={{ maxWidth: '450px' }} onClick={e => e.stopPropagation()}>
            <p className="finanzas-pdv-titulo text-success fw-bold"><i className="fas fa-cash-register me-2"></i>Punto de Venta</p>
            <p className="finanzas-modal-sub mb-3">Plan: <strong>{planAplicado.nombre}</strong></p>

            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="etiqueta-campo">Aplicar Promoción</label>
                <PromocionPicker descuentos={descuentos} valor={descuentoSeleccionado} onCambiar={setDescuentoSeleccionado} />
              </div>

              <div className="form-check form-switch mb-2">
                <input className="form-check-input bg-warning border-warning" type="checkbox" id="checkInsc" checked={formCobro.cobrarInscripcion} onChange={e => setFormCobro({ ...formCobro, cobrarInscripcion: e.target.checked })} />
                <label className="form-check-label text-warning" htmlFor="checkInsc">Cobrar Inscripción</label>
              </div>

              {formCobro.cobrarInscripcion && (
                <div className="mb-3 ps-4 animate__animated animate__fadeIn">
                  <label className="etiqueta-campo text-warning" style={{ fontSize: '0.75rem' }}>Costo de Inscripción ($)</label>
                  <input
                    type="number"
                    className="entrada-oscura border-warning text-warning fw-bold"
                    value={formCobro.montoInscripcion}
                    onChange={e => setFormCobro({ ...formCobro, montoInscripcion: e.target.value })}
                    placeholder="Ej. 300"
                  />
                </div>
              )}

              {/* Total Display en Modal */}
              <div className="finanzas-pdv-total-box mb-3 p-3 bg-dark border border-success rounded">
                <div className="d-flex justify-content-between mb-1">
                  <small style={{ color: '#888' }}>Plan Base</small>
                  <small style={{ color: '#888' }}>${precioBase.toFixed(2)}</small>
                </div>
                {descuentoMonto > 0 && (
                  <div className="d-flex justify-content-between mb-1">
                    <small style={{ color: 'var(--warning)' }}><i className="fas fa-tags me-1"></i>{descSeleccionado?.nombre}</small>
                    <small style={{ color: 'var(--warning)', fontWeight: 600 }}>-${descuentoMonto.toFixed(2)}</small>
                  </div>
                )}
                {costoInscripcion > 0 && (
                  <div className="d-flex justify-content-between mb-1">
                    <small style={{ color: 'var(--warning)' }}><i className="fas fa-id-card me-1"></i>Inscripción</small>
                    <small style={{ color: 'var(--warning)', fontWeight: 600 }}>+${costoInscripcion.toFixed(2)}</small>
                  </div>
                )}
                <hr style={{ borderColor: 'rgba(46,204,113,0.3)', margin: '6px 0' }} />
                <p className="finanzas-pdv-total-amount mb-0 fs-3 text-success fw-bold text-center">
                  Total: ${totalACobrar.toFixed(2)}
                </p>
              </div>

              <div className="row g-2 mb-3">
                <div className="col-6">
                  <label className="etiqueta-campo">Método 1</label>
                  <MetodoPagoPicker valor={formCobro.metodo1} onCambiar={v => setFormCobro({ ...formCobro, metodo1: v })} />
                </div>
                <div className="col-6">
                  <label className="etiqueta-campo">Monto ($)</label>
                  <input type="number" step="0.01" className="entrada-oscura fw-bold" required value={formCobro.monto1} onChange={e => setFormCobro({ ...formCobro, monto1: e.target.value })} placeholder="0.00" />
                </div>
              </div>

              {restante > 0 && formCobro.monto1 !== '' && (
                <div className="row g-2 mb-3 p-2 rounded" style={{ backgroundColor: 'rgba(52, 152, 219, 0.1)', border: '1px solid rgba(52, 152, 219, 0.3)' }}>
                  <div className="col-12"><small className="text-info fw-bold"><i className="fas fa-split me-1"></i>Falta cubrir ${restante.toFixed(2)}</small></div>
                  <div className="col-6">
                    <select className="entrada-oscura border-info" required value={formCobro.metodo2} onChange={e => setFormCobro({ ...formCobro, metodo2: e.target.value })}>
                      <option value="">- Elija -</option>
                      <option value="Efectivo" disabled={formCobro.metodo1 === 'Efectivo'}>Efectivo</option>
                      <option value="Tarjeta" disabled={formCobro.metodo1 === 'Tarjeta'}>Tarjeta</option>
                      <option value="Transferencia" disabled={formCobro.metodo1 === 'Transferencia'}>Transferencia</option>
                    </select>
                  </div>
                  <div className="col-6">
                    <input type="number" className="entrada-oscura fw-bold border-info text-info" value={formCobro.monto2} readOnly title="Calculado automáticamente" />
                  </div>
                </div>
              )}

              <div className="mb-4">
                <label className="etiqueta-campo">Notas (Opcional)</label>
                <input type="text" className="entrada-oscura" placeholder="Comentarios..." value={formCobro.notas} onChange={e => setFormCobro({ ...formCobro, notas: e.target.value })} />
              </div>

              <div className="finanzas-modal-btns d-flex gap-2">
                <button type="button" onClick={() => setMostrarModalCobro(false)} className="finanzas-modal-btn-cancel w-50">Cancelar</button>
                <BotonSeguro type="submit" className="btn btn-success w-50" disabled={loading} tiempoBloqueo={1500} textoProcesando="Guardando...">
                  <i className="fas fa-check me-1"></i>Inscribir Atleta
                </BotonSeguro>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}