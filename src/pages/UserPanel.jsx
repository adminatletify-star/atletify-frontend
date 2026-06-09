import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import DarkVeil from '../components/ReactBits/DarkVeil';
import RedGrayDatePicker from '../components/RedGrayDatePicker';
import WolfLanyard from '../components/ReactBits/WolfLanyard';
import BotonSeguro from '../components/BotonSeguro';
import OpcionesPicker from '../components/OpcionesPicker';
import '../assets/css/user-panel.css';
import '../assets/css/visitas-regalo.css';
import AtletifyLoader from '../components/AtletifyLoader';
import AnunciosEngine from '../components/AnunciosEngine';
import EjercicioDetailModal from '../components/EjercicioDetailModal';
import { api } from '../services/api';

const API_BASE = import.meta.env.VITE_API_URL;

function roundRectCanvas(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// Precarga el logo del box para dibujarlo en el canvas del WOD.
// Devuelve el HTMLImageElement listo, o null si no hay logo / falla / no pasa CORS
// (en ese caso se usa la inicial del box como antes).
function loadBoxLogo(src) {
  return new Promise((resolve) => {
    if (!src || !String(src).trim()) { resolve(null); return; }
    const img = new Image();
    // Las URLs remotas necesitan CORS para no "ensuciar" el canvas (toDataURL).
    // Los data: base64 son same-origin y no lo requieren.
    if (!String(src).startsWith('data:')) img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

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
  const [ejercicioModal, setEjercicioModal] = useState(null); // ejercicio del diccionario para el modal de detalle
  const [cargandoEjId, setCargandoEjId] = useState(null);       // id del ejercicio que se está cargando
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
  const [showModalDescarga, setShowModalDescarga] = useState(false);
  const [wodsSeleccionados, setWodsSeleccionados] = useState([]);

  // Visitas de regalo "trae a un amigo" (modal de bienvenida la primera vez)
  const [regaloBienvenida, setRegaloBienvenida] = useState(null);
  const [showModalRegalo, setShowModalRegalo] = useState(false);

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
      verificarVisitasRegalo(u.idUsuario || u.id);

      fetch(`${API_BASE}/usuarios/${u.idUsuario || u.id}/estado-mensualidad`)
        .then(res => res.json())
        .then(data => setEstadoMensualidad(data))
        .catch(err => console.error(err));
    }
  }, [navigate]);

  const cargarNotificaciones = async (idUsuario) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/interacciones/notificaciones/${idUsuario}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setNotificaciones(await res.json());
    } catch (error) { console.error("Error al cargar notis", error); }
  };

  // Consulta si el atleta tiene visitas de regalo vigentes para mostrar el aviso 1 vez
  const verificarVisitasRegalo = async (idUsuario) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/usuarios/${idUsuario}/visitas-regalo`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.tieneRegalo) {
          setRegaloBienvenida(data);              // siempre: alimenta la tarjeta persistente
          if (!data.avisoMostrado) setShowModalRegalo(true); // modal solo la primera vez
        }
      }
    } catch (error) { console.error("Error al consultar visitas de regalo", error); }
  };

  const cerrarModalRegalo = async () => {
    setShowModalRegalo(false);
    try {
      const token = localStorage.getItem('token');
      const idUsuario = user?.idUsuario || user?.id;
      if (idUsuario) {
        await fetch(`${API_BASE}/usuarios/${idUsuario}/visitas-regalo/aviso-visto`, {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      }
    } catch (error) { console.error("Error al marcar aviso visto", error); }
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
      const token = localStorage.getItem('token');
      await fetch(`${API_BASE}/interacciones/notificaciones/${idNoti}/leer`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
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
    if (!window.confirm('¿Seguro que quieres quitar a este compa de tu manada?')) return;
    try {
      const miId = user.idUsuario || user.id;
      const res = await fetch(`${API_BASE}/amistades/eliminar/${miId}/${idCompa}`, { method: 'DELETE' });
      if (res.ok) {
        alert("Compa eliminado de tu manada.");
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
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/interacciones/reaccionar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
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

  // Abre el modal de detalle del ejercicio (igual que en la pantalla Ejercicios).
  // Trae el ejercicio completo del diccionario a partir de su id.
  const abrirDetalleEjercicio = async (idDic) => {
    if (!idDic || cargandoEjId) return;
    setCargandoEjId(idDic);
    try {
      const full = await api.obtenerEjercicioDiccionario(idDic);
      setEjercicioModal(full);
    } catch (e) {
      console.error('Error cargando ejercicio:', e);
    } finally {
      setCargandoEjId(null);
    }
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

  const handleClickDescargar = () => {
    const wodsAMostrar = miClaseHoy
      ? wodsHoy.filter(w => !w.clasesAsignadas || w.clasesAsignadas.length === 0 || w.clasesAsignadas.some(c => c.idClase === miClaseHoy.idClase))
      : wodsHoy;
    if (wodsAMostrar.length === 0) return;
    if (wodsAMostrar.length === 1) {
      downloadWodCard(wodsAMostrar);
    } else {
      setWodsSeleccionados(wodsAMostrar.map(w => w.idEntrenamiento));
      setShowModalDescarga(true);
    }
  };

  const downloadWodCard = async (wodsADescargar, forzarSinLogo = false) => {
    if (!wodsADescargar || wodsADescargar.length === 0) return;

    // Logo del box (se dibuja en el círculo del header; si falla, se usa la inicial)
    const logoImg = forzarSinLogo ? null : await loadBoxLogo(box?.logo);

    const W = 800;
    const PAD = 52;
    const INNER_W = W - PAD * 2;
    const LINE = 22;
    const BPAD = 18;
    const CARD_HDR = 50;
    const WOD_COLORS_IMG = ['#e63946', '#38bdf8', '#f5a623'];

    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = 6000;
    const ctx = canvas.getContext('2d');

    const wrap = (text, font, maxW) => {
      ctx.font = font;
      return text.split('\n').flatMap(para => {
        if (!para.trim()) return [''];
        const words = para.split(' ');
        const lines = [];
        let cur = '';
        for (const word of words) {
          const test = cur ? `${cur} ${word}` : word;
          if (ctx.measureText(test).width > maxW) { if (cur) lines.push(cur); cur = word; }
          else cur = test;
        }
        if (cur) lines.push(cur);
        return lines;
      });
    };

    // ── FONDO ────────────────────────────────────────────────────
    ctx.fillStyle = '#0d0d14';
    ctx.fillRect(0, 0, W, 6000);

    // Glow rojo desde arriba
    const glowTop = ctx.createRadialGradient(W / 2, 0, 0, W / 2, 0, 520);
    glowTop.addColorStop(0, 'rgba(230,57,70,0.1)');
    glowTop.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glowTop;
    ctx.fillRect(0, 0, W, 6000);

    // Barra top
    const accentGrad = ctx.createLinearGradient(0, 0, W, 0);
    accentGrad.addColorStop(0, '#e63946');
    accentGrad.addColorStop(1, '#c1121f');
    ctx.fillStyle = accentGrad;
    ctx.fillRect(0, 0, W, 6);

    let y = 54;

    // ── HEADER ───────────────────────────────────────────────────
    const avR = 28;
    const avX = PAD + avR;
    const avY = y + avR;

    // Círculo de fondo con glow rojo (sirve de aro y respaldo si el logo es transparente)
    ctx.shadowColor = 'rgba(230,57,70,0.45)';
    ctx.shadowBlur = 18;
    ctx.fillStyle = '#e63946';
    ctx.beginPath();
    ctx.arc(avX, avY, avR, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    if (logoImg) {
      // Logo del box recortado en círculo (object-fit: cover)
      ctx.save();
      ctx.beginPath();
      ctx.arc(avX, avY, avR, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      const d = avR * 2;
      const scale = Math.max(d / logoImg.width, d / logoImg.height);
      const dw = logoImg.width * scale;
      const dh = logoImg.height * scale;
      ctx.drawImage(logoImg, avX - dw / 2, avY - dh / 2, dw, dh);
      ctx.restore();
      // Aro rojo alrededor del logo
      ctx.beginPath();
      ctx.arc(avX, avY, avR, 0, Math.PI * 2);
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#e63946';
      ctx.stroke();
    } else {
      // Fallback: inicial del box
      ctx.font = 'bold 22px system-ui, sans-serif';
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText((box?.nombre || 'A')[0].toUpperCase(), avX, avY);
      ctx.textBaseline = 'alphabetic';
    }

    const txtX = avX + avR + 16;
    ctx.font = 'bold 24px system-ui, sans-serif';
    ctx.fillStyle = '#eef0f5';
    ctx.textAlign = 'left';
    ctx.fillText((box?.nombre || 'ATLETIFY BOX').toUpperCase(), txtX, y + 22);

    // Badge "WOD DEL DÍA"
    ctx.font = 'bold 10px system-ui, sans-serif';
    const badgeTxt = '▸ WOD DEL DÍA';
    const badgeW = ctx.measureText(badgeTxt).width + 20;
    ctx.fillStyle = 'rgba(230,57,70,0.16)';
    roundRectCanvas(ctx, txtX, y + 32, badgeW, 18, 5);
    ctx.fill();
    ctx.strokeStyle = 'rgba(230,57,70,0.40)';
    ctx.lineWidth = 1;
    roundRectCanvas(ctx, txtX, y + 32, badgeW, 18, 5);
    ctx.stroke();
    ctx.fillStyle = '#e63946';
    ctx.textAlign = 'center';
    ctx.fillText(badgeTxt, txtX + badgeW / 2, y + 44);

    // Fecha
    const dateStr = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase();
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillStyle = '#6b7280';
    ctx.textAlign = 'right';
    ctx.fillText(dateStr, W - PAD, y + 22);

    y += avR * 2 + 26;

    // Divisor con glow
    const divGrad = ctx.createLinearGradient(PAD, 0, W - PAD, 0);
    divGrad.addColorStop(0, 'transparent');
    divGrad.addColorStop(0.2, 'rgba(230,57,70,0.35)');
    divGrad.addColorStop(0.8, 'rgba(230,57,70,0.35)');
    divGrad.addColorStop(1, 'transparent');
    ctx.strokeStyle = divGrad;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(PAD, y); ctx.lineTo(W - PAD, y); ctx.stroke();
    y += 28;

    // ── SECCIONES WOD ────────────────────────────────────────────
    for (let wi = 0; wi < wodsADescargar.length; wi++) {
      const wod = wodsADescargar[wi];
      const wodColor = WOD_COLORS_IMG[wi] || '#e63946';

      // Badge numérico (múltiples WODs)
      if (wodsADescargar.length > 1) {
        const br = 15;
        ctx.shadowColor = wodColor + '66';
        ctx.shadowBlur = 14;
        ctx.fillStyle = wodColor;
        ctx.beginPath();
        ctx.arc(PAD + br, y + br, br, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.font = 'bold 15px system-ui, sans-serif';
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${wi + 1}`, PAD + br, y + br);
        ctx.textBaseline = 'alphabetic';
        y += br * 2 + 14;
      }

      // Título WOD
      ctx.font = 'bold 28px system-ui, sans-serif';
      ctx.fillStyle = '#eef0f5';
      ctx.textAlign = 'left';
      ctx.fillText(wod.titulo.toUpperCase(), PAD, y + 24);
      y += 44;

      // BLOQUES
      for (const bloque of (wod.bloques || [])) {
        const dFont = '14px system-ui, sans-serif';
        const dLines = bloque.descripcionLibre ? wrap(bloque.descripcionLibre, dFont, INNER_W - 24) : [];
        const hasContent = (bloque.ejercicios?.length > 0) || dLines.length > 0;
        const contentH = (hasContent ? 16 : 0)
          + dLines.length * LINE + (dLines.length > 0 ? 12 : 0)
          + (bloque.ejercicios?.length || 0) * 46;
        const bH = BPAD + CARD_HDR + contentH + BPAD;
        const cardTop = y - BPAD;

        // Capas de la card (fondo + header + franja color)
        ctx.save();
        roundRectCanvas(ctx, PAD - BPAD, cardTop, INNER_W + BPAD * 2, bH, 14);
        ctx.clip();
        ctx.fillStyle = '#131320';
        ctx.fillRect(PAD - BPAD, cardTop, INNER_W + BPAD * 2, bH);
        ctx.fillStyle = '#1c1c2e';
        ctx.fillRect(PAD - BPAD, cardTop, INNER_W + BPAD * 2, BPAD + CARD_HDR);
        ctx.fillStyle = wodColor;
        ctx.fillRect(PAD - BPAD, cardTop, 5, bH);
        ctx.restore();

        // Borde card
        ctx.strokeStyle = 'rgba(255,255,255,0.09)';
        ctx.lineWidth = 1;
        roundRectCanvas(ctx, PAD - BPAD, cardTop, INNER_W + BPAD * 2, bH, 14);
        ctx.stroke();

        // Separador header/body
        ctx.strokeStyle = 'rgba(255,255,255,0.07)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(PAD - BPAD, cardTop + BPAD + CARD_HDR);
        ctx.lineTo(PAD - BPAD + INNER_W + BPAD * 2, cardTop + BPAD + CARD_HDR);
        ctx.stroke();

        // Chips en el header (centrados verticalmente en CARD_HDR)
        const chipY = y + (CARD_HDR - 24) / 2;

        ctx.font = 'bold 12px system-ui, sans-serif';
        const typeText = (bloque.tipoBloque || '').toUpperCase();
        const typeW = ctx.measureText(typeText).width + 24;
        ctx.fillStyle = 'rgba(56,189,248,0.15)';
        roundRectCanvas(ctx, PAD + 6, chipY, typeW, 24, 7);
        ctx.fill();
        ctx.strokeStyle = 'rgba(56,189,248,0.38)';
        ctx.lineWidth = 1;
        roundRectCanvas(ctx, PAD + 6, chipY, typeW, 24, 7);
        ctx.stroke();
        ctx.fillStyle = '#38bdf8';
        ctx.textAlign = 'center';
        ctx.fillText(typeText, PAD + 6 + typeW / 2, chipY + 16);
        ctx.textAlign = 'left';

        if (bloque.tipoModalidad) {
          ctx.font = '12px system-ui, sans-serif';
          const modText = bloque.tipoModalidad;
          const modW = ctx.measureText(modText).width + 22;
          const modX = PAD + 6 + typeW + 10;
          ctx.fillStyle = 'rgba(255,255,255,0.05)';
          roundRectCanvas(ctx, modX, chipY, modW, 24, 7);
          ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,0.14)';
          ctx.lineWidth = 1;
          roundRectCanvas(ctx, modX, chipY, modW, 24, 7);
          ctx.stroke();
          ctx.fillStyle = 'rgba(255,255,255,0.52)';
          ctx.textAlign = 'center';
          ctx.fillText(modText, modX + modW / 2, chipY + 16);
          ctx.textAlign = 'left';
        }

        if (bloque.capTimeMinutos) {
          ctx.font = 'bold 12px system-ui, sans-serif';
          const tcTxt = `TC ${bloque.capTimeMinutos}min`;
          const tcW = ctx.measureText(tcTxt).width + 22;
          const tcX = PAD + INNER_W - tcW;
          ctx.fillStyle = 'rgba(230,57,70,0.15)';
          roundRectCanvas(ctx, tcX, chipY, tcW, 24, 7);
          ctx.fill();
          ctx.strokeStyle = 'rgba(230,57,70,0.38)';
          ctx.lineWidth = 1;
          roundRectCanvas(ctx, tcX, chipY, tcW, 24, 7);
          ctx.stroke();
          ctx.fillStyle = '#e63946';
          ctx.textAlign = 'center';
          ctx.fillText(tcTxt, tcX + tcW / 2, chipY + 16);
          ctx.textAlign = 'left';
        }

        y += CARD_HDR;

        // Descripción
        if (dLines.length > 0) {
          y += 16;
          ctx.font = dFont;
          ctx.fillStyle = '#6b7280';
          ctx.textAlign = 'left';
          for (const line of dLines) { ctx.fillText(line, PAD + 10, y); y += LINE; }
          y += 12;
        } else if (hasContent) {
          y += 16;
        }

        // Ejercicios
        for (let ei = 0; ei < (bloque.ejercicios || []).length; ei++) {
          const ej = bloque.ejercicios[ei];
          if (ei > 0) {
            ctx.strokeStyle = 'rgba(255,255,255,0.05)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(PAD + 10, y - 10);
            ctx.lineTo(W - PAD - 10, y - 10);
            ctx.stroke();
          }

          const repsTxt = ej.esquemaRepeticiones || '';
          ctx.font = 'bold 20px system-ui, sans-serif';
          const repsW = repsTxt ? ctx.measureText(repsTxt).width + 28 : 0;

          if (repsTxt) {
            ctx.fillStyle = 'rgba(230,57,70,0.18)';
            roundRectCanvas(ctx, PAD + 10, y - 16, repsW, 32, 8);
            ctx.fill();
            ctx.strokeStyle = 'rgba(230,57,70,0.52)';
            ctx.lineWidth = 1.5;
            roundRectCanvas(ctx, PAD + 10, y - 16, repsW, 32, 8);
            ctx.stroke();
            ctx.fillStyle = '#e63946';
            ctx.textAlign = 'center';
            ctx.fillText(repsTxt, PAD + 10 + repsW / 2, y + 5);
            ctx.textAlign = 'left';
          }

          const nameX = PAD + 10 + (repsW ? repsW + 14 : 0);

          if (ej.pesoSugerido) {
            // Calcular badge de peso primero para limitar el ancho del nombre
            ctx.font = '13px system-ui, sans-serif';
            let pesoTxt = ej.pesoSugerido;
            while (pesoTxt.length > 1 && ctx.measureText(pesoTxt).width > 85) pesoTxt = pesoTxt.slice(0, -1);
            if (pesoTxt !== ej.pesoSugerido) pesoTxt += '…';
            const pesoW = ctx.measureText(pesoTxt).width + 18;
            const pesoX = PAD + INNER_W - pesoW;

            // Nombre acotado para no solapar el badge
            const maxNameW = pesoX - nameX - 14;
            ctx.font = '16px system-ui, sans-serif';
            let nameTxt = ej.ejercicio?.nombre || '';
            while (nameTxt.length > 1 && ctx.measureText(nameTxt).width > maxNameW) nameTxt = nameTxt.slice(0, -1);
            if (nameTxt !== (ej.ejercicio?.nombre || '')) nameTxt += '…';
            ctx.fillStyle = '#d8dce8';
            ctx.textAlign = 'left';
            ctx.fillText(nameTxt, nameX, y + 5);

            // Badge peso
            ctx.font = '13px system-ui, sans-serif';
            ctx.fillStyle = 'rgba(255,255,255,0.06)';
            roundRectCanvas(ctx, pesoX, y - 13, pesoW, 24, 6);
            ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,0.16)';
            ctx.lineWidth = 1;
            roundRectCanvas(ctx, pesoX, y - 13, pesoW, 24, 6);
            ctx.stroke();
            ctx.fillStyle = 'rgba(255,255,255,0.58)';
            ctx.textAlign = 'center';
            ctx.fillText(pesoTxt, pesoX + pesoW / 2, y + 5);
            ctx.textAlign = 'left';
          } else {
            // Sin peso — nombre ocupa todo el espacio disponible
            ctx.font = '16px system-ui, sans-serif';
            ctx.fillStyle = '#d8dce8';
            ctx.textAlign = 'left';
            ctx.fillText(ej.ejercicio?.nombre || '', nameX, y + 5);
          }
          y += 46;
        }

        y += BPAD;
      }

      y += 16;

      if (wi < wodsADescargar.length - 1) {
        const sepGrad = ctx.createLinearGradient(PAD, 0, W - PAD, 0);
        sepGrad.addColorStop(0, 'transparent');
        sepGrad.addColorStop(0.5, 'rgba(255,255,255,0.09)');
        sepGrad.addColorStop(1, 'transparent');
        ctx.strokeStyle = sepGrad;
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 7]);
        ctx.beginPath(); ctx.moveTo(PAD, y + 8); ctx.lineTo(W - PAD, y + 8); ctx.stroke();
        ctx.setLineDash([]);
        y += 32;
      }
    }

    // Footer
    y += 22;
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(PAD, y); ctx.lineTo(W - PAD, y); ctx.stroke();
    y += 18;
    ctx.font = '11px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.textAlign = 'center';
    ctx.fillText('Generado con Atletify', W / 2, y);
    y += 22;
    ctx.fillStyle = accentGrad;
    ctx.fillRect(0, y, W, 6);
    y += 6;

    // Recortar al contenido real
    const out = document.createElement('canvas');
    out.width = W;
    out.height = y + 12;
    out.getContext('2d').drawImage(canvas, 0, 0);
    const link = document.createElement('a');
    link.download = `wod-${getFechaHoyString()}.png`;
    try {
      link.href = out.toDataURL('image/png');
    } catch (e) {
      // Canvas "tainted" por el logo (CORS de caché): reintentar sin logo
      if (logoImg) return downloadWodCard(wodsADescargar, true);
      console.error('No se pudo generar la imagen del WOD:', e);
      alert('No se pudo generar la imagen del WOD.');
      return;
    }
    link.click();
  };

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

        {/* HERO BAR */}
        <div className="up-hero-bar px-3 px-md-4 py-3 py-md-4 mt-3">
          <div className="d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between gap-3">
            
            {/* IZQUIERDA: Info del usuario */}
            <div className="d-flex align-items-center gap-3">
              <div className="up-hero-avatar">
                {String(user?.nombre || 'A').charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="up-hero-name mb-1">
                  {String(user?.nombre || 'Atleta').split(' ')[0].toUpperCase()}
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
            
            {/* DERECHA: Notificaciones, Categoria y Mini Pill */}
            <div className="d-flex align-items-center gap-3">
              <button
                className="up-notif-btn position-relative"
                onClick={() => setShowModalNotis(true)}
              >
                <i className={`fas fa-bell ${notisNoLeidas > 0 ? 'fa-shake' : ''}`}></i>
                {notisNoLeidas > 0 && (
                  <span className="up-notif-badge">{notisNoLeidas > 9 ? '9+' : notisNoLeidas}</span>
                )}
              </button>

              <div className="up-categoria-badge">
                <i className="fas fa-fire me-2"></i>
                {user?.categoriaBase || 'Novato'}
              </div>
            </div>
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div className="container py-4 mb-5 flex-grow-1">
          
          <AnunciosEngine box={box} user={user} />

          {/* 👇 BLOQUEO DE MEMBRESÍA VENCIDA 👇 */}
          {finanzas?.suscripcion?.estatus === 'Vencida' && (
            <div className="row justify-content-center mb-5">
                <div className="col-12 col-md-10 col-lg-8">
                    <div className="up-card up-card--top-danger p-4 p-md-5 text-center">
                        <i className="fas fa-exclamation-triangle text-danger fs-1 mb-3"></i>
                        <h2 className="text-white fw-bold mb-3" style={{fontFamily: 'var(--font-heading)'}}>MEMBRESÍA VENCIDA</h2>
                        <p className="text-secondary mb-4">
                          Tu acceso a clases y reservas ha sido suspendido. Por favor, regulariza tu pago para volver a la manada.
                          {finanzas?.recargo > 0 && (
                            <span className="d-block mt-2 text-danger fw-bold">
                              ⚠️ Se ha aplicado un recargo por pago tardío de ${finanzas.recargo} MXN.
                            </span>
                          )}
                        </p>

                        <div className="d-flex flex-column align-items-stretch gap-3 mx-auto" style={{ maxWidth: '420px' }}>
                            {finanzas?.configuracionBox?.aceptarPagosEnLinea !== false && (
                                <BotonSeguro
                                    onClick={handlePagarEnLinea}
                                    disabled={iniciandoPago}
                                    className="up-btn up-btn-primary up-btn-block"
                                    textoProcesando={<><i className="fas fa-spinner fa-spin me-2"></i>Conectando con Stripe...</>}
                                >
                                    <i className="fab fa-stripe me-2 fs-5"></i> Domiciliar Tarjeta / Pagar
                                </BotonSeguro>
                            )}
                            {finanzas?.configuracionBox?.aceptarTransferencias !== false && (
                                <button className="up-btn up-btn-outline up-btn-block" onClick={() => alert('Envía tu comprobante de transferencia al WhatsApp de administración para que un administrador reactive tu cuenta manualmente.')}>
                                    <i className="fas fa-file-invoice-dollar me-2"></i> Ya transferí (Subir comprobante)
                                </button>
                            )}
                            {finanzas?.configuracionBox?.aceptarEfectivo !== false && (
                                <div className="text-muted small">
                                    <i className="fas fa-store-alt me-1"></i> O paga en efectivo en recepción
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
          )}

          {/* 👇 GRACIA ALERT 👇 */}
          {finanzas?.suscripcion?.estatus === 'Gracia' && (
            <div className="up-card up-card--top-accent p-3 p-md-4 mb-4 d-flex align-items-center justify-content-between flex-wrap gap-3">
                <div className="text-secondary" style={{ minWidth: 0, flex: '1 1 240px' }}>
                  <i className="fas fa-clock me-2" style={{ color: 'var(--accent)' }}></i>
                  <strong className="text-white">Tuvimos un problema con tu último pago</strong> o te encuentras en tus días de gracia. Tu acceso será bloqueado pronto si no lo regularizas.
                  {finanzas?.configuracionBox?.recargoMontoFijo > 0 && (
                    <span className="d-block mt-2" style={{ fontSize: '0.82rem' }}>
                      💡 Evita pagar un recargo de ${finanzas.configuracionBox.recargoMontoFijo} MXN realizando tu pago en línea a tiempo.
                    </span>
                  )}
                </div>
                <button onClick={handlePagarEnLinea} className="up-btn up-btn-accent up-btn-sm">Pagar Ahora</button>
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
                  <div className="d-flex align-items-center gap-2 flex-wrap">
                    <span className="up-date-badge">
                      {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase()}
                    </span>
                    {!loadingWod && wodsHoy.length > 0 && (
                      <button className="up-icon-btn" onClick={handleClickDescargar} title="Descargar imagen del WOD">
                        <i className="fas fa-download"></i>
                      </button>
                    )}
                  </div>
                </div>
                <div className="up-card-body">
                  {loadingWod ? (
                    <div className="text-center py-5"><AtletifyLoader /></div>
                  ) : wodsHoy.length === 0 ? (
                    <div className="text-center py-5">
                      <i className="fas fa-bed fs-1 mb-3 text-secondary opacity-50"></i>
                      <h4 className="text-white fw-bold mb-2" style={{ fontFamily: 'var(--font-heading)' }}>Active Recovery</h4>
                      <p className="text-muted small mb-0">No hay entrenamiento programado para hoy. ¡Recupera esos músculos!</p>
                    </div>
                  ) : (
                    <div className="d-flex flex-column">
                      {(() => {
                        const wodsAMostrar = miClaseHoy
                          ? wodsHoy.filter(w => !w.clasesAsignadas || w.clasesAsignadas.length === 0 || w.clasesAsignadas.some(c => c.idClase === miClaseHoy.idClase))
                          : wodsHoy;

                        if (wodsAMostrar.length === 0) return <p className="text-secondary opacity-50 text-center py-3">No hay WOD asignado para tu clase específica.</p>;

                        const WOD_COLORS = ['var(--primary)', 'var(--accent-cool)', 'var(--accent)'];

                        return wodsAMostrar.map((wod, wodIdx) => {
                          const wodColor = WOD_COLORS[wodIdx] || 'var(--primary)';
                          return (
                            <div key={wod.idEntrenamiento} className="up-wod-entry">
                              <div className="up-wod-title-row">
                                {wodsAMostrar.length > 1 ? (
                                  <span className="up-wod-num" style={{ background: wodColor }}>{wodIdx + 1}</span>
                                ) : (
                                  <i className="fas fa-dumbbell up-wod-icon"></i>
                                )}
                                <span className="up-wod-title">{wod.titulo}</span>
                              </div>

                              {wod.bloques?.map(bloque => (
                                <div key={bloque.idBloque} className="up-bloque" style={wodsAMostrar.length > 1 ? { borderLeft: `3px solid ${wodColor}` } : {}}>
                                  <div className="up-bloque-header">
                                    <div className="d-flex align-items-center gap-2 flex-wrap">
                                      <span className="up-bloque-tipo">{bloque.tipoBloque}</span>
                                      <span className="up-bloque-mod">{bloque.tipoModalidad}</span>
                                    </div>
                                    {bloque.capTimeMinutos && (
                                      <span className="up-bloque-tc">
                                        <i className="fas fa-stopwatch me-1"></i>TC {bloque.capTimeMinutos}
                                      </span>
                                    )}
                                  </div>
                                  <div className="up-bloque-body">
                                    {bloque.descripcionLibre && (
                                      <p className="up-bloque-desc">{bloque.descripcionLibre}</p>
                                    )}
                                    {bloque.ejercicios?.length > 0 && (
                                      <ul className="up-ej-list">
                                        {bloque.ejercicios.map((ej, index) => {
                                          const clicable = !!ej.idEjercicioDiccionario;
                                          const cargando = cargandoEjId === ej.idEjercicioDiccionario;
                                          return (
                                            <li
                                              key={index}
                                              className={`up-ej-item ${clicable ? 'up-ej-item--clicable' : ''}`}
                                              onClick={clicable ? () => abrirDetalleEjercicio(ej.idEjercicioDiccionario) : undefined}
                                              role={clicable ? 'button' : undefined}
                                              tabIndex={clicable ? 0 : undefined}
                                              onKeyDown={clicable ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrirDetalleEjercicio(ej.idEjercicioDiccionario); } } : undefined}
                                            >
                                              <span className="up-ej-reps">{ej.esquemaRepeticiones}</span>
                                              <span className="up-ej-name">{ej.ejercicio?.nombre}</span>
                                              {ej.pesoSugerido && <span className="up-ej-peso">{ej.pesoSugerido}</span>}
                                              {clicable && (
                                                <i className={`up-ej-link-icon fas ${cargando ? 'fa-spinner fa-spin' : 'fa-circle-info'}`}></i>
                                              )}
                                            </li>
                                          );
                                        })}
                                      </ul>
                                    )}
                                  </div>
                                </div>
                              ))}

                              {wodIdx < wodsAMostrar.length - 1 && <div className="up-wod-divider"></div>}
                            </div>
                          );
                        });
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
                      <div className="up-pizarra-filtros">
                        <div className="up-seg">
                          <button onClick={() => setFiltroGenero('Hombre')} className={`up-seg-btn ${filtroGenero === 'Hombre' ? 'is-active' : ''}`}>Hombres</button>
                          <button onClick={() => setFiltroGenero('Mujer')} className={`up-seg-btn ${filtroGenero === 'Mujer' ? 'is-active-f' : ''}`}>Mujeres</button>
                        </div>
                        <div className="up-chips">
                          <button onClick={() => setFiltroPizarra('General')} className={`up-chip ${filtroPizarra === 'General' ? 'is-active' : ''}`}>Global</button>
                          <button onClick={() => setFiltroPizarra('RX')} className={`up-chip ${filtroPizarra === 'RX' ? 'is-active' : ''}`}>Solo RX</button>
                          <button onClick={() => setFiltroPizarra('Scaled')} className={`up-chip ${filtroPizarra === 'Scaled' ? 'is-active' : ''}`}>Solo Scaled</button>
                          {[...new Set(pizarra.map(p => p.claseHora))].filter(Boolean).map(hora => (
                            <button key={hora} onClick={() => setFiltroPizarra(hora)} className={`up-chip ${filtroPizarra === hora ? 'is-active' : ''}`}>
                              <i className="far fa-clock"></i> {String(hora || '').substring(0, 5)}
                            </button>
                          ))}
                          <span className="up-chip-sep"></span>
                          <button onClick={() => setSoloCompas(!soloCompas)} className={`up-chip ${soloCompas ? 'is-active' : ''}`}>
                            <i className="fas fa-paw"></i> {soloCompas ? 'Viendo Manada' : 'Compas'}
                          </button>
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
                          <div className="up-rank-list animate__animated animate__fadeIn">
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
                              const esDnf = (res.textoDisplay || '').toUpperCase().includes('DNF');
                              return (
                                <div key={index} className="up-rank-row">
                                  <div className="up-rank-pos">
                                    {posicionReal === 1 ? <i className="fas fa-medal text-warning"></i> :
                                      posicionReal === 2 ? <i className="fas fa-medal" style={{ color: '#C0C0C0' }}></i> :
                                        posicionReal === 3 ? <i className="fas fa-medal" style={{ color: '#cd7f32' }}></i> :
                                          <>#{posicionReal}</>}
                                  </div>
                                  <div className="up-rank-avatar">
                                    {res.apodo ? res.apodo.charAt(0).toUpperCase() : res.nombreAtleta.charAt(0).toUpperCase()}
                                  </div>
                                  <div className="up-rank-info">
                                    <div className="up-rank-name">{res.apodo || res.nombreAtleta.split(' ')[0]}</div>
                                    <div className="up-rank-meta">
                                      {res.esRx && <span className="up-rank-badge up-rank-badge--rx"><i className="fas fa-fire"></i> RX</span>}
                                      {res.estadoDelDia && <span className="up-rank-badge up-rank-badge--estado">{res.estadoDelDia}</span>}
                                      {res.nivelGamer && <span className="up-rank-lvl">LVL {res.nivelGamer.toUpperCase()}</span>}
                                    </div>
                                    {res.comentarios && <div className="up-rank-comment"><i className="fas fa-comment-alt me-1 opacity-50"></i>{res.comentarios}</div>}
                                  </div>
                                  <div className="up-rank-score">
                                    <div className={`up-rank-score-val ${esDnf ? 'is-dnf' : ''}`}>{res.textoDisplay || '--'}</div>
                                    <div className="up-rank-score-hora">{String(res.claseHora || '').substring(0, 5)}</div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
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

              {/* Visitas de regalo (tarjeta persistente) */}
              {regaloBienvenida?.tieneRegalo && (
                <div className="up-card up-card-clickable vr-gift-card" onClick={() => setShowModalRegalo(true)}>
                  <div className="up-mini-card">
                    <div className="up-mini-icon vr-gift-card-icon"><i className="fas fa-gift"></i></div>
                    <div className="flex-grow-1">
                      <div className="up-mini-label">Visitas de regalo</div>
                      <div className="up-mini-value">
                        {regaloBienvenida.visitasRestantes} {regaloBienvenida.visitasRestantes === 1 ? 'visita' : 'visitas'} para un amigo
                        {regaloBienvenida.fechaCaducidadTexto && <span className="vr-gift-card-vence"> · vence {regaloBienvenida.fechaCaducidadTexto}</span>}
                      </div>
                    </div>
                    <span className="vr-gift-card-badge">{regaloBienvenida.visitasRestantes}</span>
                  </div>
                </div>
              )}

              {/*  LA NUEVA TARJETA DE PLAN (Reemplaza la tuya por esta)  */}
              {finanzas && (
                <div className="mb-4 position-relative" style={{ background: 'rgba(20, 20, 30, 0.82)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', border: '1px solid var(--border)', borderTop: '3px solid var(--primary)', borderRadius: '16px', padding: '1.4rem', boxShadow: '0 4px 32px rgba(0,0,0,0.35)' }}>

                  {/* Etiqueta VIP si tiene Precio Especial */}
                  {finanzas.precioEspecial && (
                    <span className="up-plan-vip"><i className="fas fa-star me-1"></i> Precio Preferencial</span>
                  )}

                  <div className="d-flex justify-content-between align-items-start gap-2">
                    <div style={{ minWidth: 0 }}>
                      <div className="up-mini-label">Plan actual</div>
                      <h2 className="up-plan-name">{finanzas.nombrePlan || '—'}</h2>
                      {finanzas.planInfo?.nivelAcceso && (
                        <span className="up-plan-chip"><i className="fas fa-dumbbell me-1"></i>Nivel: {finanzas.planInfo.nivelAcceso}</span>
                      )}
                    </div>

                    <div className="up-plan-stat">
                      {finanzas.suscripcion?.clasesRestantes != null ? (
                        <>
                          <span className="up-plan-stat-num">{finanzas.suscripcion.clasesRestantes}</span>
                          <span className="up-plan-stat-label">Pases</span>
                        </>
                      ) : (
                        <>
                          <span className="up-plan-stat-date">{finanzas.suscripcion?.fechaVencimiento ? new Date(finanzas.suscripcion.fechaVencimiento).toLocaleDateString() : '--'}</span>
                          <span className="up-plan-stat-label">{finanzas.membresias?.[0]?.diasRestantes || 0} días</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* EL BOTÓN QUE ABRE EL MODAL */}
                  <button
                    onClick={() => setShowModalPlanes(true)}
                    className="up-btn up-btn-outline up-btn-block mt-3"
                  >
                    <i className="fas fa-gem me-2"></i> Beneficios y opciones
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
                            <OpcionesPicker
                              valor={miClaseHoy.idMiWod != null && miClaseHoy.idMiWod !== -1 ? miClaseHoy.idMiWod : (wodsHoy.length > 0 ? wodsHoy[0].idEntrenamiento : '')}
                              onCambiar={(v) => {
                                if (parseInt(v) === -1) cancelarReservaHoy(miClaseHoy.idClase);
                                else cambiarMiWod(miClaseHoy.idMiAsistencia, v);
                              }}
                              opciones={[
                                ...wodsHoy.map(w => ({ valor: w.idEntrenamiento, label: w.titulo, desc: 'Entrenamiento del día' })),
                                { valor: -1, label: 'Open Gym', desc: 'Cancelar mi lugar (horario libre)' }
                              ]}
                              titulo="¿Qué vas a entrenar?"
                              icono="fas fa-dumbbell"
                              placeholder={wodsHoy.length === 0 ? 'Aún no hay WODs' : '— Elige tu WOD —'}
                            />
                          </div>
                        )}
                      </div>
                      <button onClick={abrirModalReservas} className="up-btn up-btn-outline up-btn-sm up-btn-block">
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
                    <button onClick={abrirModalReservas} className="up-btn up-btn-primary up-btn-block">
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
                  <button onClick={(e) => { e.stopPropagation(); navigate('/portal-competencias'); }} className="up-btn up-btn-accent up-btn-sm up-btn-block">
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

              {/* Preguntas Frecuentes */}
              <div className="up-card up-card-clickable" onClick={() => navigate('/preguntas-frecuentes')}>
                <div className="up-mini-card">
                  <div className="up-mini-icon up-mini-icon-info">
                    <i className="fas fa-question-circle"></i>
                  </div>
                  <div className="flex-grow-1">
                    <div className="up-mini-label">Preguntas frecuentes</div>
                    <div className="up-mini-value">Guías y respuestas</div>
                  </div>
                  <i className="fas fa-chevron-right text-secondary small"></i>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* MODAL VISITAS DE REGALO (bienvenida primera vez) */}
      {showModalRegalo && regaloBienvenida && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 1060, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem' }}>
          <div className="vr-welcome animate__animated animate__zoomIn">
            <div className="vr-welcome-badge"><i className="fas fa-gift"></i></div>
            <h4 className="vr-welcome-title">¡Tienes visitas de regalo!</h4>

            <div className="vr-welcome-count">
              <span className="vr-welcome-count-num">{regaloBienvenida.visitasRestantes}</span>
              <span className="vr-welcome-count-label">
                <strong>{regaloBienvenida.visitasRestantes === 1 ? 'visita' : 'visitas'}</strong>
                para traer a un amigo a entrenar
              </span>
            </div>

            {regaloBienvenida.fechaCaducidadTexto && (
              <div className="vr-welcome-vence">
                <i className="fas fa-clock"></i> Vence el <strong>{regaloBienvenida.fechaCaducidadTexto}</strong>
              </div>
            )}

            <p className="vr-welcome-hint">Pídele a la administración del box que las canjee en recepción.</p>

            <BotonSeguro onClick={cerrarModalRegalo} className="vr-welcome-btn" textoProcesando="...">
              ¡Entendido!
            </BotonSeguro>
          </div>
        </div>
      )}

      {/* MODAL NOTIFICACIONES - UNCHANGED */}
      {showModalNotis && (
        <div className="up-modal-overlay" onClick={() => setShowModalNotis(false)}>
          <div className="up-modal up-modal--sm" onClick={e => e.stopPropagation()}>

            <div className="up-modal-header">
              <h5 className="up-modal-title"><i className="fas fa-bell"></i> Avisos</h5>
              <button onClick={() => setShowModalNotis(false)} className="up-modal-close"><i className="fas fa-times"></i></button>
            </div>

            <div className="up-modal-body">
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
        <div className="up-modal-overlay" onClick={() => setShowModalAmistades(false)}>
          <div className="up-modal up-modal--sm" onClick={e => e.stopPropagation()}>

            <div className="up-modal-header">
              <h5 className="up-modal-title"><i className="fas fa-paw"></i> Mi Manada</h5>
              <button onClick={() => setShowModalAmistades(false)} className="up-modal-close"><i className="fas fa-times"></i></button>
            </div>

            <div className="up-modal-body">
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
        <div className="up-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="up-modal" onClick={e => e.stopPropagation()}>
            <div className="up-modal-header">
              <h5 className="up-modal-title"><i className="fas fa-calendar-day"></i> Clases Disponibles</h5>
              <button onClick={() => setShowModal(false)} className="up-modal-close"><i className="fas fa-times"></i></button>
            </div>
            <div className="up-modal-body">

            <div className="mb-4">
              <RedGrayDatePicker
                value={fechaSeleccionada}
                min={getFechaHoyString()}
                onChange={(value) => { setFechaSeleccionada(value); cargarClasesDeFecha(box.idBox, user.idUsuario || user.id, value); }}
                inputClassName="bg-dark text-white border-secondary shadow-none p-3 rounded-4 fw-bold text-center"
              />
            </div>

            {loadingClases ? <div className="text-center py-5"><AtletifyLoader /></div> : clasesDisponibles.length === 0 ? <div className="text-center py-4 text-secondary">No hay clases en esta fecha.</div> : (
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
                          <OpcionesPicker
                            valor={eleccionWod[clase.idClase] ?? (wodsHoy.length === 1 ? wodsHoy[0].idEntrenamiento : 0)}
                            onCambiar={v => setEleccionWod({ ...eleccionWod, [clase.idClase]: v })}
                            opciones={[
                              ...(wodsHoy.length > 1 ? [{ valor: 0, label: 'Elige tu WOD', desc: 'Selecciona tu entrenamiento' }] : []),
                              ...wodsHoy.map(w => ({ valor: w.idEntrenamiento, label: w.titulo, desc: 'Entrenamiento del día' })),
                              { valor: -1, label: 'Open Gym', desc: 'Horario libre' }
                            ]}
                            titulo="Elige tu WOD"
                            icono="fas fa-dumbbell"
                            placeholder="— Elige tu WOD —"
                          />
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
        </div>
      )}


      {/* 👇 EL MODAL DE BENEFICIOS Y OPCIONES 👇 */}
      {showModalPlanes && finanzas && (
        <div className="up-modal-overlay" onClick={() => setShowModalPlanes(false)}>
          <div className="up-modal" onClick={e => e.stopPropagation()}>

            <div className="up-modal-header">
              <h5 className="up-modal-title"><i className="fas fa-id-card-alt"></i> Estado de Cuenta</h5>
              <button className="up-modal-close" onClick={() => setShowModalPlanes(false)}><i className="fas fa-times"></i></button>
            </div>
            <div className="up-modal-body">

            {/* BENEFICIOS DEL PLAN ACTUAL */}
            {finanzas.suscripcion?.estatus === 'Activa' && (
              <div className="up-acc-box">
                <h6 className="up-acc-box-title"><i className="fas fa-check-circle"></i> Beneficios de tu plan</h6>
                <ul className="up-acc-list">
                  <li><i className="fas fa-shield-alt text-primary mt-1"></i><span>Acceso permitido a clases: <strong className="text-white">{finanzas.planInfo?.nivelAcceso || 'CrossFit'}</strong></span></li>
                  <li>
                    <i className={`fas ${finanzas.planInfo?.permiteScore ? 'fa-chart-line text-success' : 'fa-times text-danger'} mt-1`}></i>
                    <span>{finanzas.planInfo?.permiteScore ? 'Puedes registrar tus PRs en el Leaderboard' : 'Pizarra de Scores bloqueada para este plan'}</span>
                  </li>
                  {finanzas.planInfo?.descripcion && <li><i className="fas fa-info-circle text-info mt-1"></i><span>{finanzas.planInfo.descripcion}</span></li>}
                </ul>
              </div>
            )}

            {/* ALERTA DE INSCRIPCIÓN */}
            {!finanzas.exentoDePago && finanzas.planInfo?.requiereInscripcion && (
              <div className="up-acc-note">
                <i className="fas fa-calendar-check mt-1"></i>
                <span>Tu mes de cobro de anualidad es <strong>{['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'][finanzas.configuracionBox?.mesCobroInscripcion - 1] ?? finanzas.configuracionBox?.mesCobroInscripcion}</strong> de cada año.</span>
              </div>
            )}

            {/* MENÚ DE COMPRAS RÁPIDAS (Precios del Box) */}
            <div className="up-acc-menu-title">Menú de recepción</div>
            <div className="up-price-grid">
              <div className="up-price-card">
                <p className="up-price-label" style={{ color: 'var(--accent-cool)' }}>Open Gym</p>
                <p className="up-price-val">${finanzas.configuracionBox?.costoGymMensual || '--'}</p>
              </div>
              <div className="up-price-card">
                <p className="up-price-label" style={{ color: 'var(--accent)' }}>Drop-In</p>
                <p className="up-price-val">${finanzas.configuracionBox?.costoDropIn || '--'}</p>
              </div>
              <div className="up-price-card">
                <p className="up-price-label" style={{ color: 'var(--success)' }}>{finanzas.configuracionBox?.cantidadVisitasPaquete || 4} Visitas</p>
                <p className="up-price-val">${finanzas.configuracionBox?.costoPaqueteVisitas || '--'}</p>
              </div>
            </div>

            <button className="up-btn up-btn-ghost up-btn-block mt-4" onClick={() => setShowModalPlanes(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL SELECCIÓN DESCARGA WOD */}
      {showModalDescarga && (() => {
        const wodsDisponibles = miClaseHoy
          ? wodsHoy.filter(w => !w.clasesAsignadas || w.clasesAsignadas.length === 0 || w.clasesAsignadas.some(c => c.idClase === miClaseHoy.idClase))
          : wodsHoy;
        const WOD_COLORS_UI = ['var(--primary)', 'var(--accent-cool)', 'var(--accent)'];
        const todosSeleccionados = wodsSeleccionados.length === wodsDisponibles.length;

        return (
          <div className="up-modal-overlay" onClick={() => setShowModalDescarga(false)}>
            <div className="up-modal up-modal--sm" onClick={e => e.stopPropagation()}>
              <div className="up-modal-header">
                <h5 className="up-modal-title"><i className="fas fa-download"></i> Descargar WOD</h5>
                <button className="up-modal-close" onClick={() => setShowModalDescarga(false)}><i className="fas fa-times"></i></button>
              </div>
              <div className="up-modal-body">
                <p className="mb-3" style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Selecciona qué WODs incluir en la imagen:</p>
                <div className="d-flex flex-column gap-2 mb-4">
                  {wodsDisponibles.map((wod, idx) => {
                    const isSelected = wodsSeleccionados.includes(wod.idEntrenamiento);
                    return (
                      <div
                        key={wod.idEntrenamiento}
                        className={`up-dl-option ${isSelected ? 'is-selected' : ''}`}
                        onClick={() => setWodsSeleccionados(prev =>
                          isSelected ? prev.filter(id => id !== wod.idEntrenamiento) : [...prev, wod.idEntrenamiento]
                        )}
                      >
                        <span className="up-dl-dot" style={{ background: WOD_COLORS_UI[idx] }}></span>
                        <div className="flex-grow-1">
                          <div className="up-dl-name">{wod.titulo}</div>
                          <div className="up-dl-meta">{wod.bloques?.length || 0} bloque(s)</div>
                        </div>
                        <i className={`fas ${isSelected ? 'fa-check-circle' : 'fa-circle'} up-dl-check ${isSelected ? 'is-checked' : ''}`}></i>
                      </div>
                    );
                  })}
                </div>
                <div className="d-flex flex-column gap-2">
                  <BotonSeguro
                    type="button"
                    className="up-btn up-btn-primary up-btn-block"
                    disabled={wodsSeleccionados.length === 0}
                    textoProcesando={<><i className="fas fa-spinner fa-spin me-2"></i>Generando imagen...</>}
                    onClick={() => {
                      const seleccion = wodsDisponibles.filter(w => wodsSeleccionados.includes(w.idEntrenamiento));
                      setShowModalDescarga(false);
                      downloadWodCard(seleccion);
                    }}
                  >
                    <i className="fas fa-download me-2"></i>Descargar imagen
                  </BotonSeguro>
                  <button
                    className="up-btn up-btn-ghost up-btn-block"
                    onClick={() => setWodsSeleccionados(todosSeleccionados ? [] : wodsDisponibles.map(w => w.idEntrenamiento))}
                  >
                    {todosSeleccionados ? 'Deseleccionar todo' : 'Seleccionar todo'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal de detalle de ejercicio (compartido con la pantalla Ejercicios) */}
      <EjercicioDetailModal ejercicio={ejercicioModal} onClose={() => setEjercicioModal(null)} />

    </div>
  );
}
