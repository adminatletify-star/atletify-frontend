import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import GeneroPicker from '../components/GeneroPicker';
import BotonSeguro from '../components/BotonSeguro';
import PasswordRulesHint from '../components/PasswordRulesHint';
import { usePasswordStrength } from '../hooks/usePasswordStrength';
import '../assets/css/Register.css';
import '../assets/css/CompletarRegistro.css';

const METODOS_PAGO = [
  { id: 'Efectivo',      label: 'Efectivo en recepción',  icon: 'fa-money-bill-wave', desc: 'Llegas al box y pagas en efectivo cuando la Coach te reciba.' },
  { id: 'Tarjeta',       label: 'Tarjeta en recepción',   icon: 'fa-credit-card',     desc: 'Pagarás con tarjeta presencialmente al llegar al box.' },
  { id: 'Transferencia', label: 'Transferencia bancaria', icon: 'fa-mobile-alt',      desc: 'Adjuntas el comprobante ahora mismo. Tu Coach validará el pago.' }
];

export default function CompletarRegistro() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const correoParam = searchParams.get('correo');
  const API_URL = `${import.meta.env.VITE_API_URL}/api`;

  const [formData, setFormData] = useState({
    nombre: '',
    apellidos: '',
    telefono: '',
    username: '',
    contrasena: '',
    confirmarContrasena: '',
    genero: '',
    categoriaBase: 'Novato',
    fechaNacimiento: ''
  });

  const [alerts, setAlerts] = useState([]);
  const [showPass, setShowPass] = useState(false);
  const [showPassConfirm, setShowPassConfirm] = useState(false);

  // Indicador de fortaleza de contraseña (mismo que MiPerfil)
  const reglasPassword = usePasswordStrength(formData.contrasena);

  const [tokenEstado, setTokenEstado] = useState('cargando');
  const [tokenMensaje, setTokenMensaje] = useState('');

  // ── Verificación de token + rol ─────────────────────────────────
  const [rolEsperado, setRolEsperado] = useState('Usuario');
  const [idBoxAsignado, setIdBoxAsignado] = useState(null);
  const [planActualPreasignado, setPlanActualPreasignado] = useState(null);

  // ── Username live-check ─────────────────────────────────────────
  // estados: 'idle' | 'checking' | 'available' | 'taken' | 'short' | 'invalid'
  const [usernameEstado, setUsernameEstado] = useState('idle');
  const usernameDebounceRef = useRef(null);

  // ── Planes del box + selección de plan ──────────────────────────
  const [planes, setPlanes] = useState([]);
  const [planSeleccionadoId, setPlanSeleccionadoId] = useState(null);
  const [montoInscripcion, setMontoInscripcion] = useState(0);
  const [cargandoPlanes, setCargandoPlanes] = useState(false);

  // ── Pago ────────────────────────────────────────────────────────
  const [metodoPago, setMetodoPago] = useState('Efectivo');
  const [comprobanteB64, setComprobanteB64] = useState('');
  const [comprobantePreview, setComprobantePreview] = useState('');
  const fileInputRef = useRef(null);

  // Pide plan + método de pago solo si NO es AdminBox y NO viene con un plan precargado (Excel)
  const requierePlan = rolEsperado !== 'AdminBox' && !planActualPreasignado;
  const planSeleccionado = useMemo(
    () => planes.find(p => p.idPlan === planSeleccionadoId) || null,
    [planes, planSeleccionadoId]
  );
  const inscripcionAplicable = planSeleccionado?.requiereInscripcion ? Number(montoInscripcion || 0) : 0;
  const totalCobrar = (planSeleccionado?.precio || 0) + inscripcionAplicable;

  // 1) Verificar token de preregistro y descubrir rol + box
  useEffect(() => {
    if (!token || !correoParam) {
      setTokenEstado('invalido');
      setTokenMensaje('El enlace está incompleto.');
      return;
    }
    const verificarToken = async () => {
      try {
        const res = await fetch(`${API_URL}/usuarios/verificar-token-preregistro?correo=${encodeURIComponent(correoParam)}&token=${encodeURIComponent(token)}`);
        const data = await res.json();
        const estado = data.estado?.toLowerCase() || 'invalido';
        setTokenEstado(estado);
        setTokenMensaje(data.mensaje);
        if (estado === 'valido') {
          if (data.rolEsperado) setRolEsperado(data.rolEsperado);
          if (data.idBoxAsignado) setIdBoxAsignado(data.idBoxAsignado);
          if (data.planActual) setPlanActualPreasignado(data.planActual);
        }
      } catch {
        setTokenEstado('invalido');
        setTokenMensaje('Error al verificar el enlace.');
      }
    };
    verificarToken();
  }, [token, correoParam, API_URL]);

  // 2) Cargar planes visibles + monto de inscripción cuando ya sé el box
  useEffect(() => {
    if (!idBoxAsignado || !requierePlan) return;

    const cargar = async () => {
      setCargandoPlanes(true);
      try {
        const [resPlanes, resConfig] = await Promise.all([
          fetch(`${API_URL}/finanzas/planes-publicos/${idBoxAsignado}`),
          fetch(`${API_URL}/configuracionbox/${idBoxAsignado}`)
        ]);

        if (resPlanes.ok) {
          const data = await resPlanes.json();
          // normalizar: el backend devuelve PascalCase
          const norm = data.map(p => ({
            idPlan: p.idPlan ?? p.IdPlan,
            nombre: p.nombre ?? p.Nombre,
            precio: Number(p.precio ?? p.Precio ?? 0),
            descripcion: p.descripcion ?? p.Descripcion ?? '',
            requiereInscripcion: p.requiereInscripcion ?? p.RequiereInscripcion ?? false,
            esVisible: p.esVisible ?? p.EsVisible ?? true
          })).filter(p => p.esVisible);
          setPlanes(norm);
          if (norm.length === 1) setPlanSeleccionadoId(norm[0].idPlan);
        }

        if (resConfig.ok) {
          const cfg = await resConfig.json();
          setMontoInscripcion(Number(cfg.montoInscripcion ?? cfg.MontoInscripcion ?? 0));
        }
      } catch (e) {
        console.error(e);
      } finally {
        setCargandoPlanes(false);
      }
    };
    cargar();
  }, [idBoxAsignado, requierePlan, API_URL]);

  // 3) Username live-check (debounce 400ms)
  useEffect(() => {
    const u = formData.username.trim();
    if (!u) { setUsernameEstado('idle'); return; }
    if (!/^[a-zA-Z0-9._-]+$/.test(u)) { setUsernameEstado('invalid'); return; }
    if (u.length < 3) { setUsernameEstado('short'); return; }

    setUsernameEstado('checking');
    if (usernameDebounceRef.current) clearTimeout(usernameDebounceRef.current);
    usernameDebounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`${API_URL}/usuarios/verificar-username/${encodeURIComponent(u)}`);
        if (!res.ok) { setUsernameEstado('idle'); return; }
        const data = await res.json();
        setUsernameEstado(data.disponible ? 'available' : 'taken');
      } catch {
        setUsernameEstado('idle');
      }
    }, 400);

    return () => { if (usernameDebounceRef.current) clearTimeout(usernameDebounceRef.current); };
  }, [formData.username, API_URL]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'username') {
      // sin espacios, solo letras/números/._-
      setFormData(prev => ({ ...prev, username: value.replace(/\s+/g, '').replace(/[^a-zA-Z0-9._-]/g, '') }));
      return;
    }
    if (name === 'telefono') {
      setFormData(prev => ({ ...prev, telefono: value.replace(/\D/g, '').slice(0, 10) }));
      return;
    }
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const showAlert = (mensaje, tipo = 'danger') => {
    const alerta = { id: Date.now(), mensaje, tipo };
    setAlerts(prev => [...prev, alerta]);
    setTimeout(() => setAlerts(prev => prev.filter(a => a.id !== alerta.id)), 5000);
  };

  const handleComprobanteFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showAlert('El comprobante debe ser una imagen.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showAlert('El comprobante no puede superar 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result?.toString() || '';
      setComprobanteB64(result);
      setComprobantePreview(result);
    };
    reader.readAsDataURL(file);
  };

  const limpiarComprobante = () => {
    setComprobanteB64('');
    setComprobantePreview('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (usernameEstado === 'taken')   return showAlert('El username ya está ocupado. Elige otro.');
    if (usernameEstado === 'short')   return showAlert('El username debe tener al menos 3 caracteres.');
    if (usernameEstado === 'invalid') return showAlert('Username inválido: solo letras, números, punto, guión y guión bajo.');
    if (!reglasPassword.esValida)     return showAlert('La contraseña no cumple los requisitos de seguridad.');
    if (formData.contrasena !== formData.confirmarContrasena) return showAlert('Las contraseñas no coinciden.');

    if (requierePlan) {
      if (!planSeleccionadoId) return showAlert('Selecciona un plan de membresía.');
      if (!metodoPago)         return showAlert('Selecciona un método de pago.');
      if (metodoPago === 'Transferencia' && !comprobanteB64)
        return showAlert('Sube el comprobante de tu transferencia.');
    }

    try {
      const payload = {
        correo: correoParam,
        token,
        ...formData,
        ...(requierePlan && {
          idPlan: planSeleccionadoId,
          metodoPago,
          comprobanteBase64: metodoPago === 'Transferencia' ? comprobanteB64 : null
        })
      };

      const response = await fetch(`${API_URL}/usuarios/completar-registro`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (response.ok) {
        showAlert(data.mensaje, 'success');
        setTimeout(() => navigate('/sala-espera'), 2500);
      } else {
        showAlert(data.mensaje || 'Error al completar registro.');
      }
    } catch {
      showAlert('Error de conexión.');
    }
  };

  if (tokenEstado === 'cargando') {
    return (
      <div className="reg-root d-flex justify-content-center align-items-center min-vh-100">
        <div className="cr-loader-card">
          <div className="cr-loader-orbit">
            <div className="cr-loader-dot"></div>
            <div className="cr-loader-dot"></div>
            <div className="cr-loader-dot"></div>
          </div>
          <h4 className="text-white mt-3 mb-1">Verificando enlace</h4>
          <p className="text-white-50 mb-0" style={{ fontSize: '0.85rem' }}>Esto sólo tomará un momento...</p>
        </div>
      </div>
    );
  }

  if (tokenEstado !== 'valido') {
    return (
      <div className="reg-root d-flex justify-content-center align-items-center min-vh-100">
        <div className="reg-card text-center p-5 slide-in" style={{ maxWidth: '500px' }}>
          {tokenEstado === 'usado'
            ? <i className="fas fa-check-circle fa-4x text-success mb-3"></i>
            : <i className="fas fa-exclamation-triangle fa-4x text-warning mb-3"></i>
          }
          <h3 className="text-white fw-bold mb-3">
            {tokenEstado === 'usado' ? '¡Cuenta ya activada!' : 'Enlace no disponible'}
          </h3>
          <p className="text-white-50 fs-5 mb-4">{tokenMensaje || 'Este enlace no es válido.'}</p>
          <Link to="/login" className="btn btn-outline-light rounded-pill px-5 py-2 fw-bold w-100">
            {tokenEstado === 'usado' ? 'Ir a Iniciar Sesión' : 'Volver al Inicio'}
          </Link>
        </div>
      </div>
    );
  }

  // ── Progreso visual del formulario (3 fases) ──
  const pasoIdentidadCompleto =
    formData.nombre.trim().length > 0 &&
    formData.fechaNacimiento &&
    formData.telefono.length === 10 &&
    usernameEstado === 'available';

  const pasoPlanCompleto = !requierePlan
    ? true
    : (planSeleccionadoId !== null && metodoPago && (metodoPago !== 'Transferencia' || comprobanteB64));

  const pasoSeguridadCompleto =
    reglasPassword.esValida &&
    formData.contrasena === formData.confirmarContrasena &&
    formData.confirmarContrasena.length > 0;

  const pasos = [
    { id: 'identidad', label: 'Tu identidad', icon: 'fa-user-circle', completo: pasoIdentidadCompleto },
    ...(requierePlan ? [{ id: 'plan', label: 'Plan y pago', icon: 'fa-id-badge', completo: pasoPlanCompleto }] : []),
    { id: 'seguridad', label: 'Seguridad', icon: 'fa-lock', completo: pasoSeguridadCompleto }
  ];

  const usernameHint = (() => {
    switch (usernameEstado) {
      case 'checking':  return { icon: 'fa-circle-notch fa-spin', text: 'Verificando disponibilidad...', clase: 'cr-username-hint cr-username-hint--check' };
      case 'available': return { icon: 'fa-check-circle',          text: '¡Username disponible!',         clase: 'cr-username-hint cr-username-hint--ok' };
      case 'taken':     return { icon: 'fa-times-circle',          text: 'Este username ya está ocupado', clase: 'cr-username-hint cr-username-hint--err' };
      case 'short':     return { icon: 'fa-exclamation-circle',    text: 'Mínimo 3 caracteres',           clase: 'cr-username-hint cr-username-hint--warn' };
      case 'invalid':   return { icon: 'fa-exclamation-circle',    text: 'Solo letras, números, punto, guión y guión bajo', clase: 'cr-username-hint cr-username-hint--warn' };
      default:          return null;
    }
  })();

  const usernameBorderColor =
    usernameEstado === 'available' ? '#22c55e' :
    usernameEstado === 'taken' || usernameEstado === 'invalid' ? '#ef4444' :
    usernameEstado === 'short' || usernameEstado === 'checking' ? '#f59e0b' :
    '';

  return (
    <div className="reg-root cr-root py-5 min-vh-100">
      <div className="container" style={{ maxWidth: '720px' }}>

        {/* ── Hero ── */}
        <div className="cr-hero">
          <div className="cr-hero-badge">
            <i className="fas fa-user-check"></i>
            <span>Último paso</span>
          </div>
          <h1 className="cr-hero-title">
            Activa tu <span className="cr-hero-title-accent">Cuenta</span>
          </h1>
          <p className="cr-hero-sub">
            Bienvenido a la manada. Estamos por activar tu cuenta enlazada a
          </p>
          <p className="cr-hero-email">
            <i className="fas fa-envelope"></i> {correoParam}
          </p>

          {/* Stepper de progreso */}
          <div className="cr-stepper">
            {pasos.map((p, idx) => (
              <div
                key={p.id}
                className={`cr-step ${p.completo ? 'cr-step--done' : ''}`}
                style={{ '--cr-step-i': idx }}
              >
                <div className="cr-step-circle">
                  <i className={`fas ${p.completo ? 'fa-check' : p.icon}`}></i>
                </div>
                <span className="cr-step-label">{p.label}</span>
                {idx < pasos.length - 1 && <span className="cr-step-line"></span>}
              </div>
            ))}
          </div>
        </div>

        <div className="reg-alerts">
          {alerts.map(a => <div key={a.id} className={`reg-alert reg-alert-${a.tipo}`}>{a.mensaje}</div>)}
        </div>

        <div className="reg-card cr-card">
          <form onSubmit={handleSubmit}>

            {/* ── Información Personal ── */}
            <div className="cr-section-head">
              <span className="cr-section-num">01</span>
              <div>
                <p className="cr-section-title">Información Personal</p>
                <p className="cr-section-desc">Cuéntanos quién eres para personalizar tu experiencia.</p>
              </div>
              <i className="fas fa-id-card cr-section-icon"></i>
            </div>
            <div className="row g-3 mb-4">
              <div className="col-12 col-md-6">
                <label className="reg-label">Nombre(s) (Si tu Box lo precargó, déjalo en blanco)</label>
                <input type="text" name="nombre" className="reg-input" value={formData.nombre} onChange={handleChange} placeholder="Ej. Juan" />
              </div>
              <div className="col-12 col-md-6">
                <label className="reg-label">Apellido(s)</label>
                <input type="text" name="apellidos" className="reg-input" value={formData.apellidos} onChange={handleChange} placeholder="Ej. Pérez" />
              </div>

              <div className="col-12 col-md-6">
                <label className="reg-label d-flex justify-content-between">
                  <span>Teléfono (WhatsApp)</span>
                  <span style={{ fontSize: '0.75rem', color: formData.telefono.length === 10 ? '#22c55e' : 'rgba(255,255,255,0.35)' }}>
                    {formData.telefono.length}/10
                  </span>
                </label>
                <input
                  type="tel"
                  name="telefono"
                  className="reg-input"
                  value={formData.telefono}
                  onChange={handleChange}
                  placeholder="10 dígitos"
                  maxLength={10}
                  style={{ borderColor: formData.telefono.length === 10 ? '#22c55e' : '' }}
                />
              </div>

              <div className="col-12 col-md-6">
                <label className="reg-label">Fecha de Nacimiento</label>
                <input type="date" name="fechaNacimiento" className="reg-input bg-dark text-white" value={formData.fechaNacimiento} onChange={handleChange} required />
              </div>
            </div>

            {/* ── Identidad en la Plataforma ── */}
            <div className="cr-section-head">
              <span className="cr-section-num">02</span>
              <div>
                <p className="cr-section-title">Identidad en la Plataforma</p>
                <p className="cr-section-desc">Elige tu alias único y tu nivel de competencia.</p>
              </div>
              <i className="fas fa-gamepad cr-section-icon"></i>
            </div>
            <div className="row g-3 mb-4">
              <div className="col-12">
                <label className="reg-label">Username (alias único sin espacios)</label>
                <div className="cr-username-wrap">
                  <input
                    type="text"
                    name="username"
                    autoComplete="username"
                    className="reg-input cr-username-input"
                    value={formData.username}
                    onChange={handleChange}
                    placeholder="Ej. lobo99"
                    style={{ borderColor: usernameBorderColor }}
                    required
                  />
                  {usernameEstado !== 'idle' && (
                    <span className={`cr-username-indicator cr-username-indicator--${usernameEstado}`}>
                      <i className={`fas ${
                        usernameEstado === 'checking'  ? 'fa-circle-notch fa-spin' :
                        usernameEstado === 'available' ? 'fa-check-circle' :
                        usernameEstado === 'taken' || usernameEstado === 'invalid' ? 'fa-times-circle' :
                        'fa-exclamation-circle'
                      }`}></i>
                    </span>
                  )}
                </div>
                {usernameHint && (
                  <p className={usernameHint.clase}>
                    <i className={`fas ${usernameHint.icon}`}></i> {usernameHint.text}
                  </p>
                )}
              </div>
              <div className="col-12 col-md-6">
                <label className="reg-label">Categoría Base</label>
                <select name="categoriaBase" className="reg-input" value={formData.categoriaBase} onChange={handleChange}>
                  <option value="Novato">Novato — aprendizaje de movimientos</option>
                  <option value="Principiante">Principiante — movimientos modificados</option>
                  <option value="Intermedio">Intermedio — buen dominio técnico</option>
                  <option value="RX">RX — avanzado, pesos completos</option>
                </select>
              </div>
              <div className="col-12 col-md-6">
                <label className="reg-label">Género de Competencia</label>
                <GeneroPicker valor={formData.genero} onCambiar={v => setFormData(prev => ({ ...prev, genero: v }))} />
              </div>
            </div>

            {/* ── Plan de Membresía (solo atletas) ── */}
            {requierePlan && (
              <>
                <div className="cr-section-head">
                  <span className="cr-section-num">03</span>
                  <div>
                    <p className="cr-section-title">Tu Plan de Membresía</p>
                    <p className="cr-section-desc">Elige el plan con el que entrenarás. La inscripción se suma si aplica.</p>
                  </div>
                  <i className="fas fa-id-badge cr-section-icon"></i>
                </div>
                <div className="mb-4">
                  {cargandoPlanes ? (
                    <div className="cr-planes-loading">
                      <i className="fas fa-spinner fa-spin me-2"></i> Cargando los planes disponibles...
                    </div>
                  ) : planes.length === 0 ? (
                    <div className="cr-planes-empty">
                      <i className="fas fa-info-circle me-2"></i>
                      Este Box todavía no tiene planes públicos. La Coach te asignará uno cuando apruebe tu cuenta.
                    </div>
                  ) : (
                    <div className="cr-planes-grid">
                      {planes.map(p => {
                        const seleccionado = p.idPlan === planSeleccionadoId;
                        return (
                          <button
                            type="button"
                            key={p.idPlan}
                            onClick={() => setPlanSeleccionadoId(p.idPlan)}
                            className={`cr-plan-card ${seleccionado ? 'cr-plan-card--active' : ''}`}
                          >
                            <div className="cr-plan-card-head">
                              <span className="cr-plan-card-name">{p.nombre}</span>
                              {seleccionado && <i className="fas fa-check-circle cr-plan-card-check"></i>}
                            </div>
                            <div className="cr-plan-card-price">
                              <span className="cr-plan-card-currency">$</span>
                              <span className="cr-plan-card-amount">{Number(p.precio).toFixed(2)}</span>
                            </div>
                            {p.descripcion && <p className="cr-plan-card-desc">{p.descripcion}</p>}
                            {p.requiereInscripcion && (
                              <span className="cr-plan-card-flag">
                                <i className="fas fa-plus-circle"></i> Incluye inscripción
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Desglose total */}
                  {planSeleccionado && (
                    <div className="cr-resumen">
                      <div className="cr-resumen-row">
                        <span className="cr-resumen-label">Plan {planSeleccionado.nombre}</span>
                        <span className="cr-resumen-val">${planSeleccionado.precio.toFixed(2)}</span>
                      </div>
                      {inscripcionAplicable > 0 && (
                        <div className="cr-resumen-row">
                          <span className="cr-resumen-label">Costo de inscripción</span>
                          <span className="cr-resumen-val">${inscripcionAplicable.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="cr-resumen-divider"></div>
                      <div className="cr-resumen-row cr-resumen-row--total">
                        <span className="cr-resumen-label">Total a pagar</span>
                        <span className="cr-resumen-val">${totalCobrar.toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* ── Método de Pago ── */}
                <div className="cr-section-head">
                  <span className="cr-section-num">04</span>
                  <div>
                    <p className="cr-section-title">Método de Pago</p>
                    <p className="cr-section-desc">¿Cómo prefieres realizar tu pago?</p>
                  </div>
                  <i className="fas fa-wallet cr-section-icon"></i>
                </div>
                <div className="cr-metodos-list mb-3">
                  {METODOS_PAGO.map(m => (
                    <label
                      key={m.id}
                      className={`cr-metodo ${metodoPago === m.id ? 'cr-metodo--active' : ''}`}
                    >
                      <input
                        type="radio"
                        name="metodoPago"
                        value={m.id}
                        checked={metodoPago === m.id}
                        onChange={() => { setMetodoPago(m.id); if (m.id !== 'Transferencia') limpiarComprobante(); }}
                      />
                      <div className="cr-metodo-icon"><i className={`fas ${m.icon}`}></i></div>
                      <div className="cr-metodo-text">
                        <span className="cr-metodo-titulo">{m.label}</span>
                        <span className="cr-metodo-desc">{m.desc}</span>
                      </div>
                      <span className="cr-metodo-radio"></span>
                    </label>
                  ))}
                </div>

                {metodoPago === 'Transferencia' && (
                  <div className="cr-comprobante mb-4">
                    <label className="reg-label">Comprobante de Transferencia</label>
                    {!comprobantePreview ? (
                      <label className="cr-uploader">
                        <i className="fas fa-cloud-upload-alt"></i>
                        <span>Toca para subir la foto del comprobante</span>
                        <small>JPG / PNG · máximo 5MB</small>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          hidden
                          onChange={handleComprobanteFile}
                        />
                      </label>
                    ) : (
                      <div className="cr-comprobante-preview">
                        <img src={comprobantePreview} alt="Comprobante" />
                        <button type="button" className="cr-comprobante-quitar" onClick={limpiarComprobante}>
                          <i className="fas fa-trash"></i> Quitar
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* ── Seguridad ── */}
            <div className="cr-section-head">
              <span className="cr-section-num">{requierePlan ? '05' : '03'}</span>
              <div>
                <p className="cr-section-title">Seguridad</p>
                <p className="cr-section-desc">Crea una contraseña segura para proteger tu cuenta.</p>
              </div>
              <i className="fas fa-lock cr-section-icon"></i>
            </div>
            <div className="row g-3 mb-2">

              <div className="col-12 col-md-6">
                <label className="reg-label">Contraseña</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPass ? 'text' : 'password'}
                    name="contrasena"
                    autoComplete="new-password"
                    className="reg-input"
                    value={formData.contrasena}
                    onChange={handleChange}
                    required
                    style={{ paddingRight: '42px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(p => !p)}
                    style={{
                      position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '0.9rem'
                    }}
                  >
                    <i className={showPass ? 'fas fa-eye-slash' : 'fas fa-eye'} />
                  </button>
                </div>
              </div>

              <div className="col-12 col-md-6">
                <label className="reg-label">Confirmar Contraseña</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassConfirm ? 'text' : 'password'}
                    name="confirmarContrasena"
                    autoComplete="new-password"
                    className="reg-input"
                    value={formData.confirmarContrasena}
                    onChange={handleChange}
                    required
                    style={{ paddingRight: '42px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassConfirm(p => !p)}
                    style={{
                      position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '0.9rem'
                    }}
                  >
                    <i className={showPassConfirm ? 'fas fa-eye-slash' : 'fas fa-eye'} />
                  </button>
                </div>
              </div>

              {(formData.contrasena.length > 0 || formData.confirmarContrasena.length > 0) && (
                <div className="col-12">
                  <PasswordRulesHint
                    reglas={reglasPassword}
                    password={formData.contrasena}
                    passwordConfirm={formData.confirmarContrasena}
                  />
                </div>
              )}
            </div>

            {/* Términos y Condiciones */}
            <div className="form-check mb-4 p-3 rounded" style={{ backgroundColor: 'rgba(231,76,60,0.05)', border: '1px solid rgba(231,76,60,0.2)' }}>
              <input className="form-check-input ms-1" type="checkbox" id="checkTerminos" required />
              <label className="form-check-label ms-3 text-light" htmlFor="checkTerminos" style={{ fontSize: '0.9rem' }}>
                He leído y acepto los{' '}
                <Link to="/terminos" target="_blank" className="text-info text-decoration-none fw-bold">Términos y Condiciones</Link>
              </label>
            </div>

            <div className="cr-cta">
              {requierePlan && planSeleccionado && (
                <div className="cr-cta-summary">
                  <div className="cr-cta-summary-label">Total a registrar</div>
                  <div className="cr-cta-summary-amount">${totalCobrar.toFixed(2)}</div>
                  <div className="cr-cta-summary-sub">
                    {planSeleccionado.nombre} · <span>{metodoPago}</span>
                  </div>
                </div>
              )}
              <BotonSeguro
                type="submit"
                className="reg-btn-submit cr-btn-submit w-100"
                disabled={
                  !reglasPassword.esValida ||
                  formData.contrasena !== formData.confirmarContrasena ||
                  usernameEstado === 'taken' ||
                  usernameEstado === 'invalid' ||
                  usernameEstado === 'short' ||
                  usernameEstado === 'checking' ||
                  (requierePlan && planes.length > 0 && !planSeleccionadoId) ||
                  (requierePlan && metodoPago === 'Transferencia' && !comprobanteB64)
                }
                textoProcesando={<><i className="fas fa-spinner fa-spin"></i> Guardando...</>}
              >
                <i className="fas fa-check-circle"></i> Activar Mi Cuenta
                <span className="cr-btn-shine"></span>
              </BotonSeguro>
              <p className="cr-cta-helper">
                <i className="fas fa-shield-alt"></i> Tu información se cifra antes de enviarse.
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
