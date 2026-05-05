import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import DarkVeil from '../components/ReactBits/DarkVeil';
import RedGrayDatePicker from '../components/RedGrayDatePicker';
import WolfLanyard from '../components/ReactBits/WolfLanyard';
import BotonSeguro from '../components/BotonSeguro';
import '../assets/css/user-panel.css';

const API_BASE = import.meta.env.VITE_API_URL;

const getFechaHoyString = () => {
  const hoy = new Date();
  return hoy.getFullYear() + '-' +
    String(hoy.getMonth() + 1).padStart(2, '0') + '-' +
    String(hoy.getDate()).padStart(2, '0');
};

export default function UserPanel() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [box, setBox] = useState(null);

  const [tieneReservaHoy, setTieneReservaHoy] = useState(false);
  const [miClaseHoy, setMiClaseHoy] = useState(null);
  const [canceloReservaHoy, setCanceloReservaHoy] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const [fechaSeleccionada, setFechaSeleccionada] = useState(getFechaHoyString());
  const [clasesDisponibles, setClasesDisponibles] = useState([]);
  const [loadingClases, setLoadingClases] = useState(false);

  const [wodsHoy, setWodsHoy] = useState([]);
  const [loadingWod, setLoadingWod] = useState(true);
  const [pizarra, setPizarra] = useState([]);
  const [filtroPizarra, setFiltroPizarra] = useState('General');
  const [filtroGenero, setFiltroGenero] = useState('Hombre');
  const [estadoMensualidad, setEstadoMensualidad] = useState(null);

  const [solicitudesPendientes, setSolicitudesPendientes] = useState([]);
  const [misCompas, setMisCompas] = useState([]);
  const [showModalAmistades, setShowModalAmistades] = useState(false);
  const [soloCompas, setSoloCompas] = useState(false);

  const [notificaciones, setNotificaciones] = useState([]);
  const [showModalNotis, setShowModalNotis] = useState(false);

  const [loboSeleccionado, setLoboSeleccionado] = useState(null);
  const [marcasLobo, setMarcasLobo] = useState([]);
  const [cargandoMarcas, setCargandoMarcas] = useState(false);
  const [eleccionWod, setEleccionWod] = useState({});
  // 👇 1. ESTADOS PARA LA NUEVA LÓGICA FINANCIERA 👇
  const [finanzas, setFinanzas] = useState(null);
  const [showModalPlanes, setShowModalPlanes] = useState(false);
  const [iniciandoPago, setIniciandoPago] = useState(false);

  // 👇 2. CARGAR EL ADN FINANCIERO DESDE C# 👇
  useEffect(() => {
    const cargarFinanzas = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE}/usuarios/mi-plan`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (res.ok) setFinanzas(await res.json());
      } catch (e) { console.error("Error cargando finanzas", e); }
    };
    if (user) cargarFinanzas();
  }, [user]);

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem('usuario'));
    const b = JSON.parse(localStorage.getItem('box'));

    // 1. Si no hay sesión, va para afuera al Login
    if (!u) { navigate('/login'); return; }

    // 👇 2. EL CADENERO: Si es novato, lo pateamos a la Sala de Espera 👇
    if (u.rol === 'Usuario') {
      navigate('/sala-espera');
      return; // 👈 Muy importante este return para que el código se detenga aquí
    }

    // 3. Si sobrevivió al cadenero (es Atleta, Coach, etc.), cargamos su Panel
    setUser(u);
    setBox(b);

    // Restaurar flag de cancelación voluntaria desde sessionStorage (sobrevive cambio de pestaña)
    const storageKey = `canceloClase_${u.idUsuario || u.id}_${getFechaHoyString()}`;
    if (sessionStorage.getItem(storageKey) === 'true') {
      setCanceloReservaHoy(true);
    }
    setFiltroGenero(u.genero || 'Hombre');

    if (u.rol === 'Atleta' && b) {
      verificarReservaDeHoy(b.idBox, u.idUsuario || u.id);
      cargarWodYLeaderboard(b.idBox);
      cargarAmistades(u.idUsuario || u.id);
      cargarNotificaciones(u.idUsuario || u.id);

      fetch(`${API_BASE}/usuarios/${u.idUsuario || u.id}/estado-mensualidad`)
        .then(res => res.json())
        .then(data => setEstadoMensualidad(data))
        .catch(err => console.error(err));
    }
  }, [navigate]);

  const cargarNotificaciones = async (idUsuario) => {
    try {
      const res = await fetch(`${API_BASE}/interacciones/notificaciones/${idUsuario}`);
      if (res.ok) setNotificaciones(await res.json());
    } catch (error) { console.error("Error al cargar notis", error); }
  };

  const cambiarMiWod = async (idAsistencia, idNuevoWod) => {
    try {
      const res = await fetch(`${API_BASE}/asistencias/${idAsistencia}/cambiar-wod`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ IdWodElegido: parseInt(idNuevoWod) })
      });
      if (res.ok) {
        verificarReservaDeHoy(box.idBox, user.idUsuario || user.id);
        if (showModal) cargarClasesDeFecha(box.idBox, user.idUsuario || user.id, fechaSeleccionada);
      }
    } catch (e) { console.error(e); }
  };

  // Cancela la reserva de la clase base directamente desde la tarjeta
  const cancelarReservaHoy = async (idClase) => {
    const confirmar = await window.wpConfirm('¿Quieres cancelar tu lugar y pasar a Open Gym libre?\n\nTu cupo en la clase quedará liberado.');
    if (!confirmar) return;
    try {
      const fechaSegura = new Date(`${getFechaHoyString()}T12:00:00Z`).toISOString();
      const res = await fetch(`${API_BASE}/asistencias/reservar`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idClase, idUsuario: user.idUsuario || user.id, fecha: fechaSegura, idWodElegido: 0 })
      });
      if (res.ok) {
        const storageKey = `canceloClase_${user.idUsuario || user.id}_${getFechaHoyString()}`;
        sessionStorage.setItem(storageKey, 'true');  // persiste entre tabs
        setCanceloReservaHoy(true);
        verificarReservaDeHoy(box.idBox, user.idUsuario || user.id);
      } else {
        const err = await res.json();
        alert(err.mensaje || 'Error al cancelar');
      }
    } catch (e) { alert('Error de conexión'); }
  };

  const leerNotificacion = async (idNoti) => {
    try {
      await fetch(`${API_BASE}/interacciones/notificaciones/${idNoti}/leer`, { method: 'PUT' });
      setNotificaciones(prev => prev.map(n => n.idNotificacion === idNoti ? { ...n, leida: true } : n));
    } catch (error) { console.error(error); }
  };

  const cargarAmistades = async (idUsuario) => {
    try {
      const [resPendientes, resCompas] = await Promise.all([
        fetch(`${API_BASE}/amistades/pendientes/${idUsuario}`),
        fetch(`${API_BASE}/amistades/mis-compas/${idUsuario}`)
      ]);
      if (resPendientes.ok) setSolicitudesPendientes(await resPendientes.json());
      if (resCompas.ok) setMisCompas(await resCompas.json());
    } catch (error) { console.error(error); }
  };

  const responderSolicitud = async (idAmistad, respuesta) => {
    try {
      const res = await fetch(`${API_BASE}/amistades/responder/${idAmistad}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ respuesta })
      });
      if (res.ok) cargarAmistades(user.idUsuario || user.id);
    } catch (error) { console.error(error); }
  };

  const handleEliminarAmigo = async (idCompa) => {
    if (!window.confirm('¿Seguro que quieres expulsar a este lobo de tu manada?')) return;
    try {
      const miId = user.idUsuario || user.id;
      const res = await fetch(`${API_BASE}/amistades/eliminar/${miId}/${idCompa}`, { method: 'DELETE' });
      if (res.ok) {
        alert("Lobo eliminado de tu manada.");
        cargarAmistades(miId);
      }
    } catch (error) { console.error("Error al eliminar", error); }
  };

  const handleAbrirPerfilCompa = async (idLobo) => {
    setCargandoMarcas(true);
    setLoboSeleccionado(null);
    try {
      const resUser = await fetch(`${API_BASE}/usuarios/${idLobo}`);
      if (resUser.ok) setLoboSeleccionado(await resUser.json());

      const resPRs = await fetch(`${API_BASE}/marcaspersonales/usuario/${idLobo}`);
      if (resPRs.ok) setMarcasLobo(await resPRs.json());
    } catch (error) { console.error(error); }
    finally { setCargandoMarcas(false); }
  };

  async function handleReaccionar(idMarca, emoji) {
    try {
      const payload = { idMarca, idUsuarioReacciona: (user.idUsuario || user.id), emoji };
      const res = await fetch(`${API_BASE}/interacciones/reaccionar`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      if (res.ok) alert(`¡Reaccionaste con ${emoji}!`);
      else {
        const err = await res.json(); alert(err.mensaje || "Error al reaccionar.");
      }
    } catch (error) { console.error(error); }
  }

  const verificarReservaDeHoy = async (idBox, idUsuario) => {
    try {
      const res = await fetch(`${API_BASE}/asistencias/box/${idBox}/fecha/${getFechaHoyString()}?idUsuario=${idUsuario}`);
      if (res.ok) {
        const data = await res.json();
        const claseReservada = data.find(c => c.usuarioInscrito);
        setTieneReservaHoy(!!claseReservada);
        setMiClaseHoy(claseReservada || null);
      }
    } catch (error) { console.error(error); }
  };

  const cargarWodYLeaderboard = async (idBox) => {
    const hoyStr = getFechaHoyString();
    try {
      const resWods = await fetch(`${API_BASE}/entrenamientos/box/${idBox}`);
      if (resWods.ok) {
        const todosWods = await resWods.json();
        const wodsDelDia = todosWods.filter(w => w.fechaProgramada?.includes(hoyStr) && w.estaPublicado);
        setWodsHoy(wodsDelDia);
      }
      const resPizarra = await fetch(`${API_BASE}/asistencias/box/${idBox}/leaderboard/${hoyStr}`);
      if (resPizarra.ok) setPizarra(await resPizarra.json());
    } catch (err) { console.error(err); } finally { setLoadingWod(false); }
  };

  const cargarClasesDeFecha = async (idBox, idUsuario, fechaStr) => {
    setLoadingClases(true);
    try {
      const res = await fetch(`${API_BASE}/asistencias/box/${idBox}/fecha/${fechaStr}?idUsuario=${idUsuario}`);
      if (res.ok) setClasesDisponibles(await res.json());
    } catch (error) { console.error(error); } finally { setLoadingClases(false); }
  };

  const abrirModalReservas = () => {
    if (finanzas?.suscripcion?.estatus === 'Vencida') {
        alert("Tu membresía está vencida. Renueva tu suscripción para reservar.");
        return;
    }
    setShowModal(true);
    cargarClasesDeFecha(box.idBox, user.idUsuario || user.id, fechaSeleccionada);
  };

  const handlePagarEnLinea = async () => {
      setIniciandoPago(true);
      try {
          const token = localStorage.getItem('token');
          const res = await fetch(`${API_BASE}/finanzas/checkout-b2c/${box.idBox}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify({ idSuscripcion: finanzas.suscripcion.idSuscripcion })
          });
          const data = await res.json();
          if (res.ok && data.url) {
              window.location.href = data.url;
          } else {
              alert(data.mensaje || 'Error al iniciar pago.');
          }
      } catch (err) {
          alert('Error de red al conectar con Stripe.');
      } finally {
          setIniciandoPago(false);
      }
  };

  const toggleReserva = async (idClase) => {

    const clase = clasesDisponibles.find(c => c.idClase === idClase);
    const nivelAtleta = user.categoriaBase || "Principiante";
    //  INTERCEPTOR DE CATEGORÍAS
    if (clase.nivelRequerido && clase.nivelRequerido !== "Cualquiera" && !clase.usuarioInscrito) {
      const jerarquia = { "novato": 1, "principiante": 2, "intermedio": 3, "rx": 4 };
      const nivelAtletaVal = jerarquia[nivelAtleta.trim().toLowerCase()] || 1;

      let nivelClaseVal = 0;
      Object.keys(jerarquia).forEach(nivel => {
        if (clase.nivelRequerido.toLowerCase().includes(nivel)) {
          nivelClaseVal = Math.max(nivelClaseVal, jerarquia[nivel]);
        }
      });

      // Si no pudimos determinar el nivel de la clase, asumimos 1 (Cualquiera/Novato)
      if (nivelClaseVal === 0) nivelClaseVal = 1;

      // Solo bloqueamos si el atleta tiene un nivel MENOR al requerido
      if (nivelAtletaVal < nivelClaseVal) {
        // Si es obligatorio, bloqueamos completamente
        if (clase.nivelObligatorio) {
          alert(`Esta clase requiere nivel ${clase.nivelRequerido}. ¡Sigue entrenando duro para llegar ahí!`);
          return;
        }

        // Si NO es obligatorio, lanzamos la advertencia de "Bajo tu propio riesgo"
        const confirmar = await window.wpConfirm(
          `ADVERTENCIA DE NIVEL\n\nEsta clase está programada para nivel ${clase.nivelRequerido}, y tú eres ${nivelAtleta}.\n\n¿Estás seguro de que quieres tomarla? El WOD podría ser muy exigente.`
        );
        if (!confirmar) return;
      }
    }

    try {
      const fechaSegura = new Date(`${fechaSeleccionada}T12:00:00Z`).toISOString();
      const res = await fetch(`${API_BASE}/asistencias/reservar`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idClase,
          idUsuario: user.idUsuario || user.id,
          fecha: fechaSegura,
          // 👇 MANDAMOS LA ELECCIÓN (0 = Auto-asignar, -1 = Open Gym)
          idWodElegido: eleccionWod[idClase] ? parseInt(eleccionWod[idClase]) : 0
        })
      });
      if (res.ok) {
        cargarClasesDeFecha(box.idBox, user.idUsuario || user.id, fechaSeleccionada);
        verificarReservaDeHoy(box.idBox, user.idUsuario || user.id);
      } else {
        const errData = await res.json();
        alert(errData.mensaje || "Error al reservar");
      }
    } catch (error) { alert("Error de conexión"); }
  };

  const glassCard = { background: 'rgba(20, 20, 20, 0.6)', backdropFilter: 'blur(12px)', borderRadius: '24px', border: '1px solid rgba(255, 255, 255, 0.08)', boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.5)' };

  if (!user) return null;

  const notisNoLeidas = notificaciones.filter(n => !n.leida).length;

  // 👇 NUEVO: Detecta si hay una reserva para la fecha que estás viendo en el Modal 👇
  const tieneReservaEnFechaModal = clasesDisponibles.some(c => c.usuarioInscrito);

  return (
    <div style={{ position: 'relative', width: '100%', minHeight: '100vh', backgroundColor: '#050505', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0 }}>
        <DarkVeil hueShift={350} noiseIntensity={0.05} scanlineIntensity={0.2} speed={2} scanlineFrequency={200} warpAmount={0.5} resolutionScale={1} />
      </div>

      <div style={{ position: 'relative', zIndex: 1 }} className="min-vh-100 d-flex flex-column">

        {/* NAVBAR PREMIUM */}
        <nav className="up-navbar px-3 px-md-4">
          <div className="d-flex align-items-center gap-2">
            <div className="up-brand">
              <img src="/LogosDeAtletify/LogoBlanco.png" alt="Atletify System" style={{ height: '24px', width: '24px', objectFit: 'contain' }} />
              <span><span style={{ color: 'var(--primary)' }}>A</span>tletify <span style={{ color: 'var(--primary)' }}>S</span>ystem</span>
            </div>
          </div>
          <div className="d-flex align-items-center gap-2 gap-md-3">
            <button
              className="up-notif-btn position-relative"
              onClick={() => setShowModalNotis(true)}
            >
              <i className={`fas fa-bell ${notisNoLeidas > 0 ? 'fa-shake' : ''}`}></i>
              {notisNoLeidas > 0 && (
                <span className="up-notif-badge">{notisNoLeidas > 9 ? '9+' : notisNoLeidas}</span>
              )}
            </button>
            <div className="up-user-pill">
              <div className="up-user-avatar-sm">
                {String(user?.nombre || 'A').charAt(0).toUpperCase()}
              </div>
              <span className="d-none d-md-inline">{String(user?.nombre || 'Atleta').split(' ')[0]}</span>
            </div>
          </div>
        </nav>

        {/* HERO BAR */}
        <div className="up-hero-bar px-3 px-md-4 py-3 py-md-4">
          <div className="d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between gap-3">
            <div className="d-flex align-items-center gap-3">
              <div className="up-hero-avatar">
                {String(user?.nombre || 'A').charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="up-hero-name mb-1">
                  {String(user?.nombre || 'Atleta').split(' ')[0].toUpperCase()}
                  <span className="ms-2" style={{ fontSize: '1.5rem' }}>🐺</span>
                </h1>
                <div className="d-flex flex-wrap align-items-center gap-2 mt-1">
                  <span className="up-hero-box-tag">
                    <i className="fas fa-map-marker-alt me-1"></i>
                    {box?.nombre || 'Atletify System'}
                  </span>
                  <span className="up-hero-clase-tag">
                    <i className="fas fa-bookmark me-1"></i>
                    {user?.idClasePredeterminada ? 'Clase Fija' : 'Open Box'}
                  </span>
                </div>
              </div>
            </div>
            <div className="up-categoria-badge">
              <i className="fas fa-fire me-2"></i>
              {user?.categoriaBase || 'Novato'}
            </div>
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div className="container py-4 mb-5 flex-grow-1">

          {/* 👇 BLOQUEO DE MEMBRESÍA VENCIDA 👇 */}
          {finanzas?.suscripcion?.estatus === 'Vencida' && (
            <div className="row justify-content-center mb-5 animate__animated animate__shakeX">
                <div className="col-12 col-md-10 col-lg-8">
                    <div className="card bg-black border-danger shadow-lg p-4 p-md-5 text-center">
                        <i className="fas fa-exclamation-triangle text-danger fs-1 mb-3"></i>
                        <h2 className="text-white fw-bold mb-3" style={{fontFamily: 'var(--font-heading)'}}>MEMBRESÍA VENCIDA</h2>
                        <p className="text-secondary mb-4">Tu acceso a clases y reservas ha sido suspendido. Por favor, regulariza tu pago para volver a la manada.</p>
                        
                        <div className="row g-3 justify-content-center">
                            {finanzas?.configuracionBox?.aceptarPagosEnLinea !== false && (
                                <div className="col-12 col-md-8">
                                    <button 
                                        onClick={handlePagarEnLinea} 
                                        disabled={iniciandoPago}
                                        className="btn btn-danger w-100 py-3 fw-bold rounded-pill shadow"
                                    >
                                        {iniciandoPago ? <><i className="fas fa-spinner fa-spin me-2"></i>Conectando con Stripe...</> : <><i className="fab fa-stripe me-2 fs-5"></i> Domiciliar Tarjeta / Pagar</>}
                                    </button>
                                </div>
                            )}
                            {finanzas?.configuracionBox?.aceptarTransferencias !== false && (
                                <div className="col-12 col-md-8">
                                    <button className="btn btn-outline-info w-100 py-2 fw-bold rounded-pill" onClick={() => alert('Envía tu comprobante de transferencia al WhatsApp de administración para que un coach reactive tu cuenta manualmente.')}>
                                        <i className="fas fa-file-invoice-dollar me-2"></i> Ya transferí (Subir comprobante)
                                    </button>
                                </div>
                            )}
                            {finanzas?.configuracionBox?.aceptarEfectivo !== false && (
                                <div className="col-12 col-md-8">
                                    <div className="text-muted small mt-2">
                                        <i className="fas fa-store-alt me-1"></i> O paga en efectivo en recepción
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
          )}

          {/* 👇 GRACIA ALERT 👇 */}
          {finanzas?.suscripcion?.estatus === 'Gracia' && (
            <div className="alert bg-warning text-dark border-warning mb-4 shadow-sm fw-bold animate__animated animate__fadeInDown">
                <i className="fas fa-clock me-2"></i> 
                Tuvimos un problema con tu último pago o te encuentras en tus días de gracia. Tu acceso será bloqueado pronto si no lo regularizas. 
                <button onClick={handlePagarEnLinea} className="btn btn-sm btn-dark ms-3 fw-bold text-warning rounded-pill">Pagar Ahora</button>
            </div>
          )}

          <div className="row g-4" style={finanzas?.suscripcion?.estatus === 'Vencida' ? { opacity: 0.3, pointerEvents: 'none', filter: 'grayscale(100%) blur(2px)' } : {}}>

            {/* ===== LEFT COL: WOD + Pizarra ===== */}
            <div className="col-lg-8 d-flex flex-column gap-4">

              {/* WOD DEL DÍA */}
              <div className="up-card up-card-accent">
                <div className="up-card-header">
                  <h5 className="up-card-title">
                    <i className="fas fa-clipboard-list text-danger me-2"></i>WOD DEL DÍA
                  </h5>
                  <span className="up-date-badge">
                    {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase()}
                  </span>
                </div>
                <div className="up-card-body">
                  {loadingWod ? (
                    <div className="text-center py-5"><div className="spinner-border text-danger"></div></div>
                  ) : wodsHoy.length === 0 ? (
                    <div className="text-center py-5">
                      <i className="fas fa-bed fs-1 mb-3 text-secondary opacity-50"></i>
                      <h4 className="text-white fw-bold mb-2" style={{ fontFamily: 'var(--font-heading)' }}>Active Recovery</h4>
                      <p className="text-muted small mb-0">No hay entrenamiento programado para hoy. ¡Recupera esos músculos!</p>
                    </div>
                  ) : (
                    <div className="d-flex flex-column gap-5">
                      {(() => {
                        const wodsAMostrar = miClaseHoy
                          ? wodsHoy.filter(w => !w.clasesAsignadas || w.clasesAsignadas.length === 0 || w.clasesAsignadas.some(c => c.idClase === miClaseHoy.idClase))
                          : wodsHoy;

                        if (wodsAMostrar.length === 0) return <p className="text-secondary opacity-50 text-center">No hay WOD asignado para tu clase específica.</p>;

                        return wodsAMostrar.map(wod => (
                          <div key={wod.idEntrenamiento}>
                            <h3 className="fw-bold text-white mb-4 d-flex align-items-center gap-2" style={{ fontFamily: 'var(--font-heading)' }}>
                              <i className="fas fa-dumbbell text-danger"></i> {wod.titulo}
                            </h3>
                            {wod.bloques?.map(bloque => (
                              <div key={bloque.idBloque} className="bg-dark bg-opacity-50 p-4 rounded-4 mb-3 border border-secondary border-opacity-25">
                                <div className="d-flex justify-content-between align-items-start mb-3">
                                  <h5 className="fw-bold text-info mb-0" style={{ fontFamily: 'var(--font-heading-alt)' }}>{bloque.tipoBloque} <span className="text-white opacity-50 small fw-normal ms-2">({bloque.tipoModalidad})</span></h5>
                                  {bloque.capTimeMinutos && <span className="badge bg-danger">TC: {bloque.capTimeMinutos}</span>}
                                </div>
                                {bloque.descripcionLibre && <p className="text-light mb-3" style={{ whiteSpace: 'pre-wrap' }}>{bloque.descripcionLibre}</p>}

                                {bloque.ejercicios?.length > 0 && (
                                  <ul className="list-unstyled mb-0">
                                    {bloque.ejercicios.map((ej, index) => (
                                      <li key={index} className="mb-2 text-secondary d-flex align-items-center">
                                        <i className="fas fa-angle-right text-danger me-2 small"></i>
                                        <strong className="text-white me-2">{ej.esquemaRepeticiones}</strong>
                                        {ej.ejercicio?.nombre}
                                        {ej.pesoSugerido && <span className="ms-2 badge bg-secondary bg-opacity-25 text-light">{ej.pesoSugerido}</span>}
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            ))}
                          </div>
                        ));
                      })()}
                    </div>
                  )}
                </div>
              </div>

              {/* PIZARRA */}
              {wodsHoy.length > 0 && (() => {
                const wodAsignado = miClaseHoy
                  ? wodsHoy.find(w => !w.clasesAsignadas || w.clasesAsignadas.length === 0 || w.clasesAsignadas.some(c => c.idClase === miClaseHoy.idClase))
                  : wodsHoy[0];

                if (!wodAsignado) return null;

                const esManual = wodAsignado.modoRanking === 'Manual';
                const estaPublicado = wodAsignado.rankingPublicado;
                const mostrarPizarra = !esManual || estaPublicado;

                return (
                  <div className="up-card">
                    <div className="up-card-header d-flex flex-column flex-md-row gap-2 align-items-start align-items-md-center">
                      <h5 className="up-card-title d-flex align-items-center gap-2 flex-wrap">
                        <i className="fas fa-trophy text-warning"></i>
                        PIZARRA: <span className="text-info ms-1 fw-normal">{wodAsignado.titulo}</span>
                      </h5>
                      {esManual ? (
                        <span className={`badge ${estaPublicado ? 'bg-success' : 'bg-warning text-dark'} px-3 py-2 rounded-pill`}>
                          <i className={`fas ${estaPublicado ? 'fa-check-circle' : 'fa-user-clock'} me-1`}></i>
                          {estaPublicado ? 'Ranking Validado' : 'En Evaluación'}
                        </span>
                      ) : (
                        <span className="badge bg-info text-dark px-3 py-2 rounded-pill">
                          <i className="fas fa-robot me-1"></i> Auto ({wodAsignado.metricaPrincipal})
                        </span>
                      )}
                    </div>

                    {mostrarPizarra && (
                      <div className="px-4 py-3 border-bottom" style={{ borderColor: 'var(--border)' }}>
                        <div className="d-flex bg-black bg-opacity-50 rounded-pill p-1 mb-3 border border-secondary border-opacity-25">
                          <button onClick={() => setFiltroGenero('Hombre')} className={`btn flex-grow-1 rounded-pill fw-bold transition-all py-2 ${filtroGenero === 'Hombre' ? 'btn-primary text-white shadow' : 'btn-link text-secondary text-decoration-none'}`}>Hombres</button>
                          <button onClick={() => setFiltroGenero('Mujer')} className={`btn flex-grow-1 rounded-pill fw-bold transition-all py-2 ${filtroGenero === 'Mujer' ? 'btn-danger text-white shadow' : 'btn-link text-secondary text-decoration-none'}`}>Mujeres</button>
                        </div>
                        <div className="d-flex gap-2 overflow-auto pb-2 align-items-center" style={{ whiteSpace: 'nowrap' }}>
                          <button onClick={() => setFiltroPizarra('General')} className={`btn btn-sm rounded-pill fw-bold ${filtroPizarra === 'General' ? 'btn-warning text-dark' : 'btn-outline-secondary'}`}>Global</button>
                          <button onClick={() => setFiltroPizarra('RX')} className={`btn btn-sm rounded-pill fw-bold ${filtroPizarra === 'RX' ? 'btn-danger text-white' : 'btn-outline-secondary'}`}>Solo RX</button>
                          <button onClick={() => setFiltroPizarra('Scaled')} className={`btn btn-sm rounded-pill fw-bold ${filtroPizarra === 'Scaled' ? 'btn-info text-dark' : 'btn-outline-secondary'}`}>Solo Scaled</button>
                          {[...new Set(pizarra.map(p => p.claseHora))].filter(Boolean).map(hora => (
                            <button key={hora} onClick={() => setFiltroPizarra(hora)} className={`btn btn-sm rounded-pill fw-bold ${filtroPizarra === hora ? 'btn-primary text-white' : 'btn-outline-secondary'}`}>
                              <i className="far fa-clock me-1"></i> Clase {String(hora || '').substring(0, 5)}
                            </button>
                          ))}
                          <div className="ms-2 border-start border-secondary border-opacity-25 ps-2">
                            <button onClick={() => setSoloCompas(!soloCompas)} className={`btn btn-sm rounded-pill fw-bold shadow-sm ${soloCompas ? 'btn-warning text-dark' : 'btn-outline-secondary'}`}>
                              <i className="fas fa-paw me-1"></i> {soloCompas ? 'Viendo Manada' : 'Filtrar Compas'}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="p-0 overflow-auto" style={{ maxHeight: '400px' }}>
                      {!mostrarPizarra ? (
                        <div className="text-center py-5 px-4 animate__animated animate__fadeIn">
                          <i className="fas fa-user-secret fs-1 text-warning mb-3 opacity-75"></i>
                          <h5 className="fw-bold text-white" style={{ fontFamily: 'var(--font-heading)' }}>Scores en Cuarentena</h5>
                          <p className="text-secondary small mb-0">Los coaches están revisando y ordenando los resultados de este WOD.<br />La tabla se hará pública automáticamente cuando termine el jueceo.</p>
                        </div>
                      ) : (() => {

                        const atletasFiltrados = pizarra.filter(res => {
                          const clasePerteneceAlWod = !wodAsignado.clasesAsignadas || wodAsignado.clasesAsignadas.length === 0 || wodAsignado.clasesAsignadas.some(c => c.idClase === res.idClase);
                          if (!clasePerteneceAlWod) return false;
                          if ((res.genero || 'Hombre') !== filtroGenero) return false;
                          if (soloCompas) {
                            const idsCompas = misCompas.map(c => c.idLobo);
                            const miId = user.idUsuario || user.id;
                            if (res.idUsuario !== miId && !idsCompas.includes(res.idUsuario)) return false;
                          }
                          if (filtroPizarra === 'General') return true;
                          if (filtroPizarra === 'RX') return res.esRx;
                          if (filtroPizarra === 'Scaled') return !res.esRx;
                          return res.claseHora === filtroPizarra;
                        }).sort((a, b) => {
                          if (a.esRx && !b.esRx) return -1;
                          if (!a.esRx && b.esRx) return 1;
                          let asc = true;
                          if (wodAsignado.modoRanking === 'Auto') {
                            if (wodAsignado.metricaPrincipal === 'Peso' || wodAsignado.metricaPrincipal === 'Reps') asc = false;
                          }
                          return asc ? (a.valorOrdenamiento - b.valorOrdenamiento) : (b.valorOrdenamiento - a.valorOrdenamiento);
                        });

                        if (atletasFiltrados.length === 0) {
                          return (
                            <div className="text-center py-5">
                              <i className="fas fa-ghost fs-1 text-secondary mb-3 opacity-25"></i>
                              <p className="text-secondary small">Nadie de tu manada ha registrado scores aún.</p>
                            </div>
                          );
                        }

                        let currentRank = 0;
                        let lastValor = null;
                        let lastRx = null;

                        return (
                          <table className="table table-dark table-hover mb-0 align-middle animate__animated animate__fadeIn">
                            <tbody>
                              {atletasFiltrados.map((res, index) => {
                                if (index === 0) {
                                  currentRank = 1;
                                } else {
                                  if (res.valorOrdenamiento !== lastValor || res.esRx !== lastRx) {
                                    currentRank++;
                                  }
                                }
                                lastValor = res.valorOrdenamiento;
                                lastRx = res.esRx;

                                const posicionReal = currentRank;
                                return (
                                  <tr key={index} className="border-bottom border-secondary border-opacity-10">
                                    <td className="ps-4 py-3" style={{ width: '60px' }}>
                                      {posicionReal === 1 ? <i className="fas fa-medal fs-3 text-warning"></i> :
                                        posicionReal === 2 ? <i className="fas fa-medal fs-4 text-secondary" style={{ color: '#C0C0C0' }}></i> :
                                          posicionReal === 3 ? <i className="fas fa-medal fs-5" style={{ color: '#cd7f32' }}></i> :
                                            <span className="fw-bold text-secondary fs-5" style={{ fontFamily: 'var(--font-stats)' }}>#{posicionReal}</span>}
                                    </td>
                                    <td className="py-3">
                                      <div className="d-flex align-items-center gap-3">
                                        <div className="rounded-circle bg-danger bg-opacity-25 d-flex justify-content-center align-items-center text-white fw-bold border border-danger border-opacity-50" style={{ width: '45px', height: '45px', flexShrink: 0, fontSize: '1.2rem', fontFamily: 'var(--font-heading)' }}>
                                          {res.apodo ? res.apodo.charAt(0).toUpperCase() : res.nombreAtleta.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="d-flex flex-column">
                                          <div className="d-flex align-items-center gap-2 mb-1">
                                            <div className="fw-bold text-white" style={{ fontSize: '1.1rem', fontFamily: 'var(--font-heading)' }}>{res.apodo || res.nombreAtleta.split(' ')[0]}</div>
                                            {res.esRx && <span className="badge bg-warning text-dark px-2 rounded-pill shadow-sm" style={{ fontSize: '0.6rem' }}><i className="fas fa-fire"></i> RX</span>}
                                          </div>
                                          <div className="d-flex flex-wrap align-items-center gap-2">
                                            {res.estadoDelDia && <span className="badge bg-black border border-secondary border-opacity-50 text-light fw-normal shadow-sm" style={{ fontSize: '0.75rem' }}>{res.estadoDelDia}</span>}
                                            {res.nivelGamer && <span className="text-warning fw-bold" style={{ fontSize: '0.65rem', fontFamily: 'var(--font-stats)' }}>LVL: {res.nivelGamer.toUpperCase()}</span>}
                                          </div>
                                          {res.comentarios && <small className="text-secondary fst-italic mt-1"><i className="fas fa-comment-alt me-1 opacity-50"></i>{res.comentarios}</small>}
                                        </div>
                                      </div>
                                    </td>
                                    <td className="text-end pe-4 py-3">
                                      <span className={`fs-4 fw-bold ${(res.textoDisplay || '').toUpperCase().includes('DNF') ? 'text-danger' : 'text-info'}`} style={{ fontFamily: 'var(--font-stats)' }}>
                                        {res.textoDisplay || '--'}
                                      </span>
                                      <div className="text-secondary small">{String(res.claseHora || '').substring(0, 5)}</div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        );
                      })()}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* ===== RIGHT COL ===== */}
            <div className="col-lg-4 d-flex flex-column gap-3">

              {/* Mi Manada */}
              <div
                className={`up-card up-card-clickable ${solicitudesPendientes.length > 0 ? 'up-card-pending-danger' : ''}`}
                onClick={() => setShowModalAmistades(true)}
              >
                <div className="up-mini-card">
                  <div className={`up-mini-icon up-mini-icon-danger ${solicitudesPendientes.length > 0 ? 'up-icon-pulse' : ''}`}>
                    <i className={solicitudesPendientes.length > 0 ? "fas fa-user-plus fa-shake" : "fas fa-paw"}></i>
                  </div>
                  <div className="flex-grow-1">
                    <div className="up-mini-label">Mi Manada</div>
                    <div className="up-mini-value">{misCompas.length} compas en la manada</div>
                  </div>
                  {solicitudesPendientes.length > 0 ? (
                    <span className="badge bg-danger rounded-pill px-2 py-1 animate__animated animate__pulse animate__infinite fw-bold">
                      {solicitudesPendientes.length}
                    </span>
                  ) : (
                    <i className="fas fa-chevron-right text-secondary small"></i>
                  )}
                </div>
              </div>

              {/*  LA NUEVA TARJETA DE PLAN (Reemplaza la tuya por esta)  */}
              {finanzas && (
                <div className="p-4 rounded border border-secondary bg-dark mb-4 position-relative" style={{ boxShadow: '0 4px 15px rgba(0,0,0,0.3)' }}>

                  {/* Etiqueta VIP si tiene Precio Especial */}
                  {finanzas.precioEspecial && (
                    <span className="badge bg-warning text-dark position-absolute top-0 start-50 translate-middle px-3 py-2 border border-dark rounded-pill shadow">
                      <i className="fas fa-star me-1"></i> Precio Preferencial
                    </span>
                  )}

                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <p className="text-secondary small fw-bold mb-0">PLAN ACTUAL</p>
                      <h2 className="text-white fw-bold mb-0" style={{ fontFamily: 'var(--font-heading)' }}>{finanzas.nombrePlan}</h2>
                      {finanzas.planInfo?.nivelAcceso && (
                        <span className="badge bg-secondary bg-opacity-50 mt-1 border border-secondary"><i className="fas fa-dumbbell me-1"></i>Nivel: {finanzas.planInfo.nivelAcceso}</span>
                      )}
                    </div>

                    <div className="text-end">
                      {finanzas.suscripcion?.clasesRestantes != null ? (
                        <div className="text-center p-2 rounded bg-black border border-success">
                          <h2 className="text-success fw-bold mb-0 lh-1">{finanzas.suscripcion.clasesRestantes}</h2>
                          <small className="text-secondary fw-bold" style={{ fontSize: '0.6rem' }}>PASES</small>
                        </div>
                      ) : (
                        <div>
                          <h5 className="text-success fw-bold mb-0">Vence: {finanzas.suscripcion?.fechaVencimiento ? new Date(finanzas.suscripcion.fechaVencimiento).toLocaleDateString() : '--'}</h5>
                          <small className="text-secondary">{finanzas.membresias?.[0]?.diasRestantes || 0} días restantes</small>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* EL BOTÓN QUE ABRE EL MODAL */}
                  <button
                    onClick={() => setShowModalPlanes(true)}
                    className="btn btn-outline-info w-100 mt-3 fw-bold"
                  >
                    <i className="fas fa-gem me-2"></i> Ver mis Beneficios y Opciones del Box
                  </button>
                </div>
              )}

              {/* Módulo de Organizador de Competencias Independiente */}
              {user?.esOrganizadorCompetencias && (
                <div
                  className="up-card up-card-clickable border border-warning border-opacity-50"
                  onClick={() => navigate('/admin-competencias')}
                  style={{ background: 'linear-gradient(135deg, rgba(20,20,20,0.9) 0%, rgba(60,40,0,0.8) 100%)' }}
                >
                  <div className="up-mini-card">
                    <div className="up-mini-icon text-dark bg-warning shadow-sm">
                      <i className="fas fa-trophy fa-bounce"></i>
                    </div>
                    <div className="flex-grow-1">
                      <div className="up-mini-label text-warning fw-bold">Organizador de Competencias</div>
                      <div className="up-mini-value text-white opacity-75 small">Accede al panel de gestión de tus eventos deportivos.</div>
                    </div>
                    <i className="fas fa-chevron-right text-warning"></i>
                  </div>
                </div>
              )}

              {/* Mi Clase de Hoy */}
              <div className="up-card">
                <div className="up-card-header">
                  <h6 className="up-card-title">
                    <i className="fas fa-calendar-check text-primary me-2"></i>Mi Clase de Hoy
                  </h6>
                  <div>
                    {tieneReservaHoy ? (
                      miClaseHoy?.idClase !== user.idClasePredeterminada && user.idClasePredeterminada ? (
                        <span className="badge bg-info text-dark shadow-sm"><i className="fas fa-exchange-alt me-1"></i> Reasignado</span>
                      ) : (
                        <span className="badge bg-success shadow-sm"><i className="fas fa-check me-1"></i> Reservado</span>
                      )
                    ) : user.idClasePredeterminada ? (
                      <span className="badge bg-success shadow-sm"><i className="fas fa-lock me-1"></i> Automático</span>
                    ) : (
                      <span className="badge bg-secondary">Sin reservar</span>
                    )}
                  </div>
                </div>
                <div className="up-card-body pt-3">
                  {tieneReservaHoy ? (
                    <div className="w-100">
                      <div className="p-3 rounded-4 bg-black bg-opacity-40 border border-secondary border-opacity-25 mb-3">
                        <div className="fw-bold text-info" style={{ fontFamily: 'var(--font-heading-alt)' }}>{miClaseHoy?.nombre}</div>
                        <div className="small text-secondary mt-1">
                          <i className="far fa-clock me-1"></i>
                          <span style={{ fontFamily: 'var(--font-stats)' }}>{String(miClaseHoy?.horarioInicio || miClaseHoy?.horaInicio || '').substring(0, 5)}</span>
                          <span className="mx-2 opacity-50">|</span>
                          Coach: {miClaseHoy?.coach}
                        </div>

                        {/* SELECTOR DE WOD para atleta inscrito */}
                        {miClaseHoy && (
                          <div className="mt-3 border-top border-secondary border-opacity-25 pt-3">
                            <label className="small text-secondary fw-bold mb-2">¿Qué vas a entrenar hoy?</label>
                            <select
                              className="form-select form-select-sm bg-dark text-info border-secondary shadow-none"
                              value={
                                miClaseHoy.idMiWod != null && miClaseHoy.idMiWod !== -1
                                  ? miClaseHoy.idMiWod
                                  : wodsHoy.length > 0 ? wodsHoy[0].idEntrenamiento : 'none'
                              }
                              onChange={(e) => {
                                if (e.target.value === '-1' || parseInt(e.target.value) === -1) {
                                  cancelarReservaHoy(miClaseHoy.idClase);
                                } else {
                                  cambiarMiWod(miClaseHoy.idMiAsistencia, e.target.value);
                                }
                              }}
                            >
                              {wodsHoy.length === 0
                                ? <option value="none" disabled>⏳ Aún no hay WODs programados</option>
                                : wodsHoy.map(w => <option key={w.idEntrenamiento} value={w.idEntrenamiento}>🏋️ {w.titulo}</option>)
                              }
                              <option value={-1}>🎧 OPEN GYM — Cancelar mi lugar</option>
                            </select>
                          </div>
                        )}
                      </div>
                      <button onClick={abrirModalReservas} className="btn btn-sm btn-outline-primary rounded-pill w-100 fw-bold">
                        VER / CAMBIAR HORARIO
                      </button>
                    </div>
                  ) : user.idClasePredeterminada ? (
                    // Si el usuario cancelo voluntariamente hoy, mostrar "Aparta tu lugar"
                    // Si no, mostrar "Lugar Garantizado" (auto-reserva pendiente)
                    <div className={`w-100 text-center p-3 rounded-4 border ${canceloReservaHoy ? 'bg-warning bg-opacity-10 border-warning border-opacity-50' : 'bg-success bg-opacity-10 border-success border-opacity-50'}`}>
                      <i className={`fas ${canceloReservaHoy ? 'fa-calendar-times text-warning' : 'fa-check-circle text-success'} fs-3 mb-2`}></i>
                      <h6 className="fw-bold text-white mb-1" style={{ fontFamily: 'var(--font-heading-alt)' }}>
                        {canceloReservaHoy ? 'Sin reserva hoy' : 'Lugar Garantizado'}
                      </h6>
                      <p className="small text-secondary mb-0">
                        {canceloReservaHoy
                          ? 'Cancelaste tu lugar. Puedes volver a apartar.'
                          : 'Tu clase base se reserva automáticamente.'}
                      </p>
                      <button onClick={abrirModalReservas} className={`btn btn-sm rounded-pill mt-3 px-4 w-100 ${canceloReservaHoy ? 'btn-warning text-dark' : 'btn-outline-secondary'}`}>
                        {canceloReservaHoy ? '⚡ Aparta tu lugar' : 'Asistir a otro horario hoy'}
                      </button>
                    </div>
                  ) : (
                    <button onClick={abrirModalReservas} className="btn btn-danger rounded-pill fw-bold w-100 py-2">
                      <i className="fas fa-plus me-2"></i>RESERVAR UN HORARIO
                    </button>
                  )}
                </div>
              </div>

              {/* Atletify Games */}
              <div className="up-card up-card-clickable" onClick={() => navigate('/portal-competencias')}>
                <div className="up-card-header">
                  <h6 className="up-card-title">
                    <i className="fas fa-trophy text-warning me-2"></i>Atletify Games
                  </h6>
                  <i className="fas fa-chevron-right text-secondary small"></i>
                </div>
                <div className="px-4 pb-4 pt-3">
                  <p className="text-secondary small mb-3" style={{ fontFamily: 'var(--font-body)' }}>Leaderboard en vivo. Entra a la arena y compite.</p>
                  <button onClick={(e) => { e.stopPropagation(); navigate('/portal-competencias'); }} className="btn btn-outline-warning btn-sm w-100 rounded-pill fw-bold">
                    ENTRAR A LA ARENA
                  </button>
                </div>
              </div>

              {/* Comunidad */}
              <div className="up-card up-card-clickable" onClick={() => navigate('/comunidad')}>
                <div className="up-mini-card">
                  <div className="up-mini-icon up-mini-icon-info">
                    <i className="fas fa-users"></i>
                  </div>
                  <div className="flex-grow-1">
                    <div className="up-mini-label">Comunidad</div>
                    <div className="up-mini-value">La Manada</div>
                  </div>
                  <i className="fas fa-chevron-right text-secondary small"></i>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* MODAL NOTIFICACIONES - UNCHANGED */}
      {showModalNotis && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 1050, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '15px' }}>
          <div className="card border-0 shadow-lg w-100 animate__animated animate__zoomIn" style={{ maxWidth: '450px', background: 'linear-gradient(180deg, #1a0505 0%, #050505 100%)', borderRadius: '24px', border: '1px solid rgba(255, 193, 7, 0.3)' }}>

            <div className="p-4 border-bottom border-warning border-opacity-25 d-flex justify-content-between align-items-center">
              <h5 className="fw-bold text-white mb-0"><i className="fas fa-bell text-warning me-2"></i> Avisos</h5>
              <button onClick={() => setShowModalNotis(false)} className="btn btn-dark text-white rounded-circle flex-shrink-0 d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px', minWidth: '36px' }}><i className="fas fa-times"></i></button>
            </div>

            <div className="card-body p-4" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              {notificaciones.length === 0 ? (
                <div className="text-center py-4">
                  <i className="fas fa-envelope-open-text text-secondary fs-1 mb-2 opacity-50"></i>
                  <p className="text-secondary small">Tu bandeja está vacía.</p>
                </div>
              ) : (
                <div className="d-flex flex-column gap-2">
                  {notificaciones.map(noti => (
                    <div
                      key={noti.idNotificacion}
                      className={`p-3 rounded-4 border ${noti.leida ? 'bg-dark border-secondary border-opacity-25' : 'bg-warning bg-opacity-10 border-warning border-opacity-50'} cursor-pointer`}
                      onClick={() => !noti.leida && leerNotificacion(noti.idNotificacion)}
                      style={{ cursor: noti.leida ? 'default' : 'pointer' }}
                    >
                      <div className="d-flex align-items-start gap-3">
                        <div className="mt-1 fs-4">{noti.titulo.includes('🔥') ? '🔥' : noti.titulo.includes('❤️') ? '❤️' : noti.titulo.includes('💀') ? '💀' : noti.titulo.includes('🔀') ? '🔀' : '🔔'}</div>
                        <div>
                          <div className={`fw-bold ${noti.leida ? 'text-secondary' : 'text-white'}`}>{noti.titulo}</div>
                          <div className={`small ${noti.leida ? 'text-secondary opacity-75' : 'text-light'}`}>{noti.Mensaje || noti.mensaje}</div>
                          {!noti.leida && <div className="text-warning small fw-bold mt-1" style={{ fontSize: '0.7rem' }}>Toca para marcar como leída</div>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL AMISTADES - UNCHANGED */}
      {showModalAmistades && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 1050, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '15px' }}>
          <div className="card border-0 shadow-lg w-100 animate__animated animate__zoomIn" style={{ maxWidth: '450px', background: 'linear-gradient(180deg, #1a0505 0%, #050505 100%)', borderRadius: '24px', border: '1px solid rgba(220,53,69,0.3)' }}>

            <div className="p-4 border-bottom border-danger border-opacity-25 d-flex justify-content-between align-items-center">
              <h5 className="fw-bold text-white mb-0"><i className="fas fa-paw text-danger me-2"></i> Mi Manada</h5>
              <button onClick={() => setShowModalAmistades(false)} className="btn btn-dark text-white rounded-circle flex-shrink-0 d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px', minWidth: '36px' }}><i className="fas fa-times"></i></button>
            </div>

            <div className="card-body p-4" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              {solicitudesPendientes.length > 0 && (
                <div className="mb-4">
                  <h6 className="text-danger fw-bold small mb-3">NUEVAS SOLICITUDES</h6>
                  <div className="d-flex flex-column gap-3">
                    {solicitudesPendientes.map(sol => (
                      <div key={sol.idAmistad} className="bg-black bg-opacity-50 p-3 rounded-4 border border-secondary border-opacity-25 d-flex align-items-center justify-content-between">
                        <div className="d-flex align-items-center gap-3">
                          <div className="rounded-circle bg-danger text-white d-flex justify-content-center align-items-center fw-bold" style={{ width: '40px', height: '40px' }}>
                            {sol.apodo ? sol.apodo.charAt(0).toUpperCase() : sol.nombre.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-white fw-bold">{sol.apodo || sol.nombre.split(' ')[0]}</div>
                            <div className="text-secondary small" style={{ fontSize: '0.7rem' }}>LVL: {sol.nivel}</div>
                          </div>
                        </div>
                        <div className="d-flex gap-2">
                          <button onClick={() => responderSolicitud(sol.idAmistad, 'Aceptada')} className="btn btn-sm btn-success rounded-circle shadow-sm" style={{ width: '35px', height: '35px' }}><i className="fas fa-check"></i></button>
                          <button onClick={() => responderSolicitud(sol.idAmistad, 'Rechazada')} className="btn btn-sm btn-outline-secondary rounded-circle" style={{ width: '35px', height: '35px' }}><i className="fas fa-times"></i></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <h6 className="text-secondary fw-bold small mb-3 border-top border-secondary border-opacity-25 pt-4">TUS COMPAS ({misCompas.length})</h6>
              {misCompas.length === 0 ? (
                <p className="text-secondary small text-center">Aún no has agregado a nadie a tu manada.</p>
              ) : (
                <div className="d-flex flex-wrap gap-2">
                  {misCompas.map(compa => (
                    <div
                      key={compa.idLobo}
                      className="badge bg-dark border border-secondary border-opacity-50 px-3 py-2 rounded-pill text-light shadow-sm d-flex align-items-center gap-2"
                      style={{ cursor: 'pointer', transition: 'transform 0.1s' }}
                      onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
                      onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                      onClick={() => { setShowModalAmistades(false); handleAbrirPerfilCompa(compa.idLobo); }}
                    >
                      <i className="fas fa-user text-danger"></i>
                      <span>{compa.apodo || compa.nombre.split(' ')[0]}</span>
                      <button
                        className="btn btn-sm btn-link text-secondary p-0 ms-1 d-flex align-items-center justify-content-center"
                        style={{ width: '20px', height: '20px' }}
                        onClick={(e) => { e.stopPropagation(); handleEliminarAmigo(compa.idLobo); }}
                        title="Eliminar de mi Manada"
                      >
                        <i className="fas fa-times"></i>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* WOLF LANYARD — Perfil del compa */}
      {loboSeleccionado && (
        <WolfLanyard
          lobo={loboSeleccionado}
          marcas={marcasLobo}
          cargandoMarcas={cargandoMarcas}
          miId={user?.idUsuario || user?.id}
          onClose={() => setLoboSeleccionado(null)}
          onReaccionar={handleReaccionar}
          onSolicitarAmistad={() => { }}
        />
      )}

      {/* MODAL RESERVAS - UNCHANGED */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', zIndex: 1050, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '15px' }}>
          <div className="card text-white p-4 w-100 shadow-lg" style={{ ...glassCard, maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="d-flex justify-content-between align-items-center pb-3 mb-3 border-bottom border-secondary border-opacity-25">
              <h5 className="fw-bold mb-0"><i className="fas fa-calendar-day text-danger me-2"></i> Clases Disponibles</h5>
              <button onClick={() => setShowModal(false)} className="btn btn-sm btn-outline-secondary rounded-circle flex-shrink-0 d-flex justify-content-center align-items-center" style={{ width: '35px', height: '35px' }}><i className="fas fa-times"></i></button>
            </div>

            <div className="mb-4">
              <RedGrayDatePicker
                value={fechaSeleccionada}
                min={getFechaHoyString()}
                onChange={(value) => { setFechaSeleccionada(value); cargarClasesDeFecha(box.idBox, user.idUsuario || user.id, value); }}
                inputClassName="bg-dark text-white border-secondary shadow-none p-3 rounded-4 fw-bold text-center"
              />
            </div>

            {loadingClases ? <div className="text-center py-5"><div className="spinner-border text-danger"></div></div> : clasesDisponibles.length === 0 ? <div className="text-center py-4 text-secondary">No hay clases en esta fecha.</div> : (
              <div className="d-flex flex-column gap-3">
                {[...clasesDisponibles].sort((a, b) => {
                  if (a.idClase === user.idClasePredeterminada) return -1;
                  if (b.idClase === user.idClasePredeterminada) return 1;
                  return 0;
                }).map(clase => {
                  const estaLlena = clase.inscritos >= clase.maximoAtletas;
                  const porcentajeOcupacion = Math.min((clase.inscritos / clase.maximoAtletas) * 100, 100);

                  const bloqueadoPorOtraReserva = tieneReservaEnFechaModal && !clase.usuarioInscrito;

                  const esMiClaseBase = clase.idClase === user.idClasePredeterminada;
                  const categoriaAtleta = user.categoriaBase || 'Novato';
                  const nivelesClase = clase.nivelesPermitidos || 'Todos';

                  let nivelNoPermitido = false;
                  if (nivelesClase !== 'Todos') {
                    const jerarquia = { "novato": 1, "principiante": 2, "intermedio": 3, "rx": 4 };
                    const nivelAtletaVal = jerarquia[categoriaAtleta.trim().toLowerCase()] || 1;

                    let nivelClaseVal = 0;
                    Object.keys(jerarquia).forEach(nivel => {
                      if (nivelesClase.toLowerCase().includes(nivel)) {
                        nivelClaseVal = Math.max(nivelClaseVal, jerarquia[nivel]);
                      }
                    });
                    if (nivelClaseVal === 0) nivelClaseVal = 1;

                    if (nivelAtletaVal < nivelClaseVal) {
                      nivelNoPermitido = true;
                    }
                  }

                  let btnColor = 'btn-danger';
                  let btnText = 'APARTAR LUGAR';
                  let disabled = false;

                  // Detectar si la clase ya terminó (solo aplica si estamos viendo HOY)
                  const esHoy = fechaSeleccionada === getFechaHoyString();
                  const horaInicioStr = clase.horarioInicio || clase.horaInicio || '';
                  let claseYaFinalizo = false;
                  if (esHoy && horaInicioStr) {
                    const [hh, mm] = horaInicioStr.split(':').map(Number);
                    const ahora = new Date();
                    const minutosClase = hh * 60 + mm;
                    const minutosAhora = ahora.getHours() * 60 + ahora.getMinutes();
                    // Consideramos que la clase ya finalizó si su inicio fue hace más de 60 min
                    claseYaFinalizo = minutosAhora - minutosClase > 60;
                  }

                  if (claseYaFinalizo && !clase.usuarioInscrito) {
                    btnColor = 'btn-outline-secondary opacity-50';
                    btnText = 'CLASE FINALIZADA';
                    disabled = true;
                  } else if (clase.usuarioInscrito) {
                    btnColor = 'btn-outline-danger';
                    btnText = 'CANCELAR RESERVA';
                  } else if (bloqueadoPorOtraReserva) {
                    btnColor = 'btn-secondary opacity-25';
                    btnText = 'YA TIENES RESERVA';
                    disabled = true;
                  } else if (estaLlena) {
                    btnColor = 'btn-secondary disabled';
                    btnText = 'CLASE LLENA';
                    disabled = true;
                  } else if (nivelNoPermitido) {
                    btnColor = 'btn-dark border border-secondary text-secondary';
                    btnText = `SOLO ${nivelesClase.toUpperCase()}`;
                    disabled = true;
                  }

                  return (
                    <div key={clase.idClase} className={`p-3 rounded-4 border position-relative ${claseYaFinalizo && !clase.usuarioInscrito
                      ? 'border-secondary border-opacity-25 bg-secondary bg-opacity-10 opacity-60'
                      : clase.usuarioInscrito
                        ? 'border-danger bg-danger bg-opacity-10'
                        : esMiClaseBase
                          ? 'border-warning bg-warning bg-opacity-10'
                          : 'border-secondary border-opacity-25 bg-dark bg-opacity-50'
                      }`}>

                      {esMiClaseBase && !clase.usuarioInscrito && (
                        <span className="badge bg-warning text-dark position-absolute top-0 start-50 translate-middle-x shadow" style={{ fontSize: '0.65rem', marginTop: '-10px' }}>
                          <i className="fas fa-star"></i> TU CLASE BASE
                        </span>
                      )}

                      <div className="d-flex justify-content-between align-items-center mb-2 mt-1">
                        <div>
                          <h6 className={`fw-bold mb-1 ${esMiClaseBase ? 'text-warning' : 'text-white'} d-flex align-items-center gap-2`}>
                            {clase.nombre}
                            {nivelesClase !== 'Todos' && (
                              <span className="badge bg-secondary bg-opacity-25 text-light fw-normal border border-secondary border-opacity-50" style={{ fontSize: '0.65rem' }}>
                                {nivelesClase}
                              </span>
                            )}
                          </h6>
                          <div className="text-secondary small d-flex gap-3">
                            <span><i className="far fa-clock me-1"></i> {String(clase.horarioInicio || clase.horaInicio || '').substring(0, 5)}</span>
                            <span><i className="fas fa-dumbbell me-1"></i> {clase.coach}</span>
                          </div>
                        </div>
                        <div className="text-end">
                          <span className={`badge ${estaLlena && !clase.usuarioInscrito ? 'bg-danger' : 'bg-primary'} bg-opacity-25 text-white rounded-pill d-inline-block`}>
                            {clase.inscritos} / {clase.maximoAtletas}
                          </span>
                        </div>
                      </div>

                      <div className="progress mb-3 bg-dark" style={{ height: '6px' }}>
                        <div className={`progress-bar ${porcentajeOcupacion >= 100 ? 'bg-danger' : porcentajeOcupacion >= 80 ? 'bg-warning' : 'bg-success'}`} role="progressbar" style={{ width: `${porcentajeOcupacion}%` }}></div>
                      </div>

                      {/*  NUEVO: SELECTOR AL RESERVAR (Mapea WODs Reales)  */}
                      {!clase.usuarioInscrito && !disabled && (
                        <div className="mb-3">
                          <select
                            className="form-select form-select-sm bg-black text-info border-secondary shadow-none"
                            value={eleccionWod[clase.idClase] || (wodsHoy.length === 1 ? wodsHoy[0].idEntrenamiento : 0)}
                            onChange={e => setEleccionWod({ ...eleccionWod, [clase.idClase]: e.target.value })}
                          >
                            {wodsHoy.length > 1 && <option value={0}>-- Elige tu WOD --</option>}
                            {wodsHoy.map(w => <option key={w.idEntrenamiento} value={w.idEntrenamiento}> {w.titulo}</option>)}
                            <option value={-1}> OPEN GYM (Libre)</option>
                          </select>
                        </div>
                      )}
                      <BotonSeguro onClick={() => toggleReserva(clase.idClase)} disabled={disabled} className={`btn ${btnColor} w-100 rounded-pill btn-sm fw-bold py-2 transition-all`} textoProcesando={<><i className="fas fa-spinner fa-spin me-1" />{btnText}</>}>
                        {btnText}
                      </BotonSeguro>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}


      {/* 👇 EL MODAL DE BENEFICIOS Y OPCIONES 👇 */}
      {showModalPlanes && finanzas && (
        <div className="finanzas-modal-overlay" onClick={() => setShowModalPlanes(false)} style={{ zIndex: 9999, position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div className="bg-dark border border-secondary p-4 rounded" style={{ maxWidth: '500px', width: '90%' }} onClick={e => e.stopPropagation()}>

            <div className="d-flex justify-content-between align-items-center mb-3 border-bottom border-secondary pb-2">
              <h5 className="text-white fw-bold m-0"><i className="fas fa-id-card-alt text-info me-2"></i>Estado de Cuenta</h5>
              <button className="btn-close btn-close-white" onClick={() => setShowModalPlanes(false)}></button>
            </div>

            {/* BENEFICIOS DEL PLAN ACTUAL */}
            {finanzas.suscripcion?.estatus === 'Activa' && (
              <div className="mb-4 p-3 border border-success rounded" style={{ backgroundColor: 'rgba(46, 204, 113, 0.05)' }}>
                <h6 className="text-success fw-bold mb-3"><i className="fas fa-check-circle me-1"></i> Beneficios de tu plan</h6>
                <ul className="text-light small m-0" style={{ listStyleType: 'none', paddingLeft: 0 }}>
                  <li className="mb-2"><i className="fas fa-shield-alt text-primary me-2"></i>Acceso permitido a clases: <strong>{finanzas.planInfo?.nivelAcceso || 'CrossFit'}</strong></li>
                  <li className="mb-2">
                    <i className={`fas ${finanzas.planInfo?.permiteScore ? 'fa-chart-line text-success' : 'fa-times text-danger'} me-2`}></i>
                    {finanzas.planInfo?.permiteScore ? 'Puedes registrar tus PRs en el Leaderboard' : 'Pizarra de Scores bloqueada para este plan'}
                  </li>
                  {finanzas.planInfo?.descripcion && <li className="mb-2"><i className="fas fa-info-circle text-info me-2"></i>{finanzas.planInfo.descripcion}</li>}
                </ul>
              </div>
            )}

            {/* ALERTA DE INSCRIPCIÓN */}
            {!finanzas.exentoDePago && finanzas.planInfo?.requiereInscripcion && (
              <div className="mb-4 p-2 bg-warning bg-opacity-25 border border-warning rounded text-warning small">
                <i className="fas fa-calendar-check me-2"></i> Tu mes de cobro de anualidad es el mes <strong>{finanzas.configuracionBox?.mesCobroInscripcion}</strong> de cada año.
              </div>
            )}

            {/* MENÚ DE COMPRAS RÁPIDAS (Precios del Box) */}
            <h6 className="text-secondary fw-bold mb-3 text-center">MENÚ DE RECEPCIÓN</h6>
            <div className="row g-2 text-center">
              <div className="col-4">
                <div className="p-2 border border-secondary rounded bg-black">
                  <p className="text-info small fw-bold m-0" style={{ fontSize: '0.7rem' }}>Open Gym</p>
                  <h6 className="text-white m-0 mt-1">${finanzas.configuracionBox?.costoGymMensual || '--'}</h6>
                </div>
              </div>
              <div className="col-4">
                <div className="p-2 border border-secondary rounded bg-black">
                  <p className="text-warning small fw-bold m-0" style={{ fontSize: '0.7rem' }}>Drop-In</p>
                  <h6 className="text-white m-0 mt-1">${finanzas.configuracionBox?.costoDropIn || '--'}</h6>
                </div>
              </div>
              <div className="col-4">
                <div className="p-2 border border-secondary rounded bg-black">
                  <p className="text-success small fw-bold m-0" style={{ fontSize: '0.7rem' }}>{finanzas.configuracionBox?.cantidadVisitasPaquete || 4} Visitas</p>
                  <h6 className="text-white m-0 mt-1">${finanzas.configuracionBox?.costoPaqueteVisitas || '--'}</h6>
                </div>
              </div>
            </div>

            <button className="btn btn-secondary w-100 mt-4" onClick={() => setShowModalPlanes(false)}>Cerrar</button>
          </div>
        </div>
      )}


    </div>
  );
}
