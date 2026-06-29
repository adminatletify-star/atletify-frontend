import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import DarkVeil from '../components/ReactBits/DarkVeil';
import RedGrayDatePicker from '../components/RedGrayDatePicker';
import WolfLanyard from '../components/ReactBits/WolfLanyard';
import { formatNivelGamer } from '../components/NivelGamerPicker';
import ModalEstadoDelDia from '../components/ModalEstadoDelDia';
import BotonSeguro from '../components/BotonSeguro';
import OpcionesPicker from '../components/OpcionesPicker';
import '../assets/css/user-panel.css';
import '../assets/css/visitas-regalo.css';
import AtletifyLoader from '../components/AtletifyLoader';
import AnunciosEngine from '../components/AnunciosEngine';
import NotificacionRow from '../components/NotificacionRow';
import BotonActivarPush from '../components/BotonActivarPush';
import EjercicioDetailModal from '../components/EjercicioDetailModal';
import ModalComentariosWod from '../components/ModalComentariosWod';
import WodsPersonalesAtleta from '../components/WodsPersonalesAtleta';
import { evaluarNivelClase } from '../utils/nivelClase';
import { formatear12 } from '../components/HoraPicker';
import ModalCompararPRs from '../components/ModalCompararPRs';
import { api } from '../services/api';

const API_BASE = import.meta.env.VITE_API_URL;

// ===========================================================================
//  SISTEMA DE PRESENCIA — "Mi Equipo" (En línea / Ausente / Desconectado)
// ===========================================================================
// El backend guarda UltimaConexion en UTC; si el string no trae zona horaria,
// lo tratamos como UTC (misma convención que ModalComentariosWod).
function parseFechaUTC(fechaIso) {
  if (!fechaIso) return null;
  let str = String(fechaIso);
  if (!/[zZ]$|[+-]\d{2}:?\d{2}$/.test(str)) str += 'Z';
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

// Texto "hace X" a partir de los segundos transcurridos.
function haceTexto(segundos) {
  if (segundos < 60) return 'hace un momento';
  if (segundos < 3600) return `hace ${Math.floor(segundos / 60)} min`;
  if (segundos < 86400) return `hace ${Math.floor(segundos / 3600)} h`;
  if (segundos < 604800) return `hace ${Math.floor(segundos / 86400)} d`;
  return `hace ${Math.floor(segundos / 604800)} sem`;
}

// Deriva el estado de presencia desde la última conexión:
//  < 3 min  → En línea  ·  3–15 min → Ausente  ·  resto / sin dato → Desconectado.
function calcularPresencia(ultimaConexion) {
  const d = parseFechaUTC(ultimaConexion);
  if (!d) return { estado: 'desconectado', label: 'Desconectado', detalle: 'sin conexión reciente', rank: 4 };
  const seg = Math.max(0, (Date.now() - d.getTime()) / 1000);
  if (seg < 180) return { estado: 'en-linea', label: 'En línea', detalle: 'ahora', rank: 0 };
  if (seg < 900) return { estado: 'ausente', label: 'Ausente', detalle: haceTexto(seg), rank: 1 };
  return { estado: 'desconectado', label: 'Desconectado', detalle: haceTexto(seg), rank: 2 };
}

// Color estable por usuario para el avatar (réplica del look de la referencia).
const AVATAR_COLORS = [
  ['#e63946', '#b5121b'], ['#7c5cff', '#5a3fd6'], ['#2ecc71', '#1c9e57'],
  ['#f5a623', '#d4860f'], ['#38bdf8', '#0e8fd0'], ['#ec4899', '#be2d76'],
  ['#14b8a6', '#0d8276'], ['#f97316', '#c75710'],
];
function colorAvatar(id) {
  const n = Math.abs(Number(id) || 0);
  return AVATAR_COLORS[n % AVATAR_COLORS.length];
}

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

// ── Revelación programada del WOD (espejo de la config guardada en el backend) ──
// Convierte "HH:mm" (de HOY, hora local) a un Date. Null si no hay hora válida.
const horaHoyADate = (hhmm) => {
  if (!hhmm || typeof hhmm !== 'string' || !hhmm.includes(':')) return null;
  const [h, m] = hhmm.split(':').map(Number);
  if (Number.isNaN(h)) return null;
  const d = new Date();
  d.setHours(h, m || 0, 0, 0);
  return d;
};

// ¿Ya se reveló este WOD para el atleta? Respeta el modo del WOD y, en "PorClase",
// la clase reservada del atleta (miClase). Si no hay hora configurada → inmediato.
const wodRevelado = (wod, miClase, ahora = new Date()) => {
  if (!wod || !wod.estaPublicado) return false;
  const modo = wod.modoRevelacion || 'Inmediato';
  if (modo === 'Inmediato') return true;
  if (modo === 'HoraFija') {
    const t = horaHoyADate(wod.horaRevelacion);
    return !t || ahora >= t;
  }
  // PorClase
  const clases = wod.clasesAsignadas || [];
  let objetivo = null;
  if (miClase) {
    const c = clases.find(x => x.idClase === miClase.idClase);
    if (c && c.horaRevelacion) objetivo = horaHoyADate(c.horaRevelacion);
  }
  if (!objetivo) {
    // sin hora propia → cae a la más temprana configurada entre las clases asignadas
    const horas = clases.map(c => horaHoyADate(c.horaRevelacion)).filter(Boolean);
    if (!horas.length) return true; // ninguna clase tiene hora → inmediato
    objetivo = new Date(Math.min(...horas.map(d => d.getTime())));
  }
  return ahora >= objetivo;
};

// Hora "HH:mm" que se muestra en el teaser ("Se revela a las …").
const horaRevelacionMostrar = (wod, miClase) => {
  if (!wod) return null;
  const modo = wod.modoRevelacion || 'Inmediato';
  if (modo === 'HoraFija') return wod.horaRevelacion || null;
  if (modo === 'PorClase') {
    const clases = wod.clasesAsignadas || [];
    if (miClase) {
      const c = clases.find(x => x.idClase === miClase.idClase);
      if (c && c.horaRevelacion) return c.horaRevelacion;
    }
    const horas = clases.map(c => c.horaRevelacion).filter(Boolean).sort();
    return horas[0] || null;
  }
  return null;
};

// Aplica el toggle de like/dislike en local (mismo comportamiento que el backend),
// para pintar la reacción al instante sin esperar la red (update optimista).
const aplicarReaccionLocal = (s, tipo) => {
  const cur = {
    likes: s?.likes || 0,
    dislikes: s?.dislikes || 0,
    miReaccion: s?.miReaccion ?? null,
    totalComentarios: s?.totalComentarios || 0,
  };
  if (cur.miReaccion === tipo) {
    // mismo botón => quitar la reacción
    if (tipo === 'like') cur.likes = Math.max(0, cur.likes - 1);
    else cur.dislikes = Math.max(0, cur.dislikes - 1);
    cur.miReaccion = null;
  } else {
    // quitar la anterior (si había) y poner la nueva
    if (cur.miReaccion === 'like') cur.likes = Math.max(0, cur.likes - 1);
    else if (cur.miReaccion === 'dislike') cur.dislikes = Math.max(0, cur.dislikes - 1);
    if (tipo === 'like') cur.likes += 1;
    else cur.dislikes += 1;
    cur.miReaccion = tipo;
  }
  return cur;
};

// Aplica una reacción a un PR en local con la MISMA semántica que el backend (upsert por usuario):
// re-tocar el mismo emoji no cambia nada; cambiar de emoji mantiene el total; reacción nueva suma 1.
function aplicarReaccionMarcaLocal(resumen, idMarca, emoji) {
  const cur = resumen[idMarca] || { idMarca, total: 0, conteos: [], miEmoji: null };
  const conteos = (cur.conteos || []).map(c => ({ ...c }));
  let total = cur.total || 0;
  const prevEmoji = cur.miEmoji || null;
  const bump = (em, delta) => {
    const i = conteos.findIndex(c => c.emoji === em);
    if (i >= 0) { conteos[i].count += delta; if (conteos[i].count <= 0) conteos.splice(i, 1); }
    else if (delta > 0) conteos.push({ emoji: em, count: 1 });
  };
  if (prevEmoji === emoji) {
    // mismo emoji: el backend no agrega ni quita -> no tocar
  } else if (prevEmoji) {
    bump(prevEmoji, -1); bump(emoji, +1); // cambio de emoji -> total igual
  } else {
    bump(emoji, +1); total += 1; // reacción nueva
  }
  return { ...resumen, [idMarca]: { idMarca, total, conteos, miEmoji: emoji } };
}

// La fila de notificación (swipe-para-borrar) ahora es un componente compartido:
// components/NotificacionRow.jsx (la usan tanto el UserPanel como el AdminBoxPanel).

export default function UserPanel() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [claseBase, setClaseBase] = useState(null); // clase fija del atleta (nombre + hora) para el tag del header
  const [box, setBox] = useState(null);

  const [tieneReservaHoy, setTieneReservaHoy] = useState(false);
  const [miClaseHoy, setMiClaseHoy] = useState(null);
  const [canceloReservaHoy, setCanceloReservaHoy] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const [fechaSeleccionada, setFechaSeleccionada] = useState(getFechaHoyString());
  const [clasesDisponibles, setClasesDisponibles] = useState([]);
  const [loadingClases, setLoadingClases] = useState(false);

  const [wodsHoy, setWodsHoy] = useState([]);
  const [nowTick, setNowTick] = useState(0); // re-render periódico para revelar el WOD al llegar su hora
  useEffect(() => {
    const id = setInterval(() => setNowTick(t => t + 1), 30000);
    return () => clearInterval(id);
  }, []);
  const [loadingWod, setLoadingWod] = useState(true);
  const [ejercicioModal, setEjercicioModal] = useState(null); // ejercicio del diccionario para el modal de detalle
  const [cargandoEjId, setCargandoEjId] = useState(null);       // id del ejercicio que se está cargando
  const [socialWod, setSocialWod] = useState({});              // { [idEntrenamiento]: { likes, dislikes, miReaccion, totalComentarios } }
  const [comentariosWod, setComentariosWod] = useState(null);  // WOD cuyo modal de comentarios está abierto
  const [focoComentario, setFocoComentario] = useState(null);  // { idComentario, idComentarioRaiz } al venir de una notificación
  const [pizarra, setPizarra] = useState([]);
  const [filtroPizarra, setFiltroPizarra] = useState('General');
  const [filtroGenero, setFiltroGenero] = useState('Hombre');
  const [estadoMensualidad, setEstadoMensualidad] = useState(null);

  const [misCompas, setMisCompas] = useState([]);
  const respondiendoRef = useRef(new Set()); // anti doble-tap al responder solicitudes desde la campana
  const [showModalAmistades, setShowModalAmistades] = useState(false);
  const [soloCompas, setSoloCompas] = useState(false);
  const [presenciaTick, setPresenciaTick] = useState(0); // fuerza recálculo de "hace X" en el modal de compas
  const [buscarCompa, setBuscarCompa] = useState(''); // buscador dentro del modal de Mi Equipo
  const [compararCon, setCompararCon] = useState(null); // compa con quien comparar PRs (abre ModalCompararPRs)

  const [notificaciones, setNotificaciones] = useState([]);
  const [showModalNotis, setShowModalNotis] = useState(false);
  const [campaniaAbrir, setCampaniaAbrir] = useState(null); // id de campaña a abrir desde la campanita

  const [loboSeleccionado, setLoboSeleccionado] = useState(null);
  const [marcasLobo, setMarcasLobo] = useState([]);
  const [cargandoMarcas, setCargandoMarcas] = useState(false);
  const [perfilLikesU, setPerfilLikesU] = useState({ totalLikes: 0, yaLeDiLike: false });
  const [reaccionesResumenU, setReaccionesResumenU] = useState({}); // idMarca -> { total, conteos }
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

  // Modal diario "Estado de Hoy" — aparece una vez al día
  const [mostrarModalEstadoDia, setMostrarModalEstadoDia] = useState(false);

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

    // Refrescar el BOX desde el backend: si un admin le cambió el nombre (u otros datos), el
    // localStorage queda viejo y el chip mostraría el nombre anterior hasta recargar a mano.
    // Lo traemos fresco y actualizamos la caché (mismo criterio que el refresco del perfil de abajo).
    if (b?.idBox) {
      fetch(`${API_BASE}/box/${b.idBox}`)
        .then(res => (res.ok ? res.json() : null))
        .then(fresh => {
          if (fresh && fresh.idBox) {
            setBox(fresh);
            localStorage.setItem('box', JSON.stringify(fresh));
          }
        })
        .catch(() => { /* best-effort: si falla, se queda con el de localStorage */ });
    }

    // Modal diario "Estado de Hoy": se muestra una vez por día por usuario.
    const keyEstadoDia = `atletify_estadoDia_${u.idUsuario || u.id}_${getFechaHoyString()}`;
    if (!localStorage.getItem(keyEstadoDia)) {
      setMostrarModalEstadoDia(true);
    }

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

      // Refrescar el perfil desde el backend (la clase fija pudo cambiarla un admin desde
      // "editar usuario"; el localStorage queda viejo) + traer nombre/hora de la clase base.
      (async () => {
        try {
          const token = localStorage.getItem('token');
          const resU = await fetch(`${API_BASE}/usuarios/${u.idUsuario || u.id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          let fresh = u;
          if (resU.ok) {
            const data = await resU.json();
            fresh = { ...u, ...data };
            setUser(fresh);
            localStorage.setItem('usuario', JSON.stringify(fresh));
          }
          if (fresh.idClasePredeterminada) {
            const resC = await fetch(`${API_BASE}/clases/box/${b.idBox}`);
            if (resC.ok) {
              const clases = await resC.json();
              const lista = Array.isArray(clases) ? clases : (clases.data || []);
              setClaseBase(lista.find(c => c.idClase === fresh.idClasePredeterminada) || null);
            }
          } else {
            setClaseBase(null);
          }
        } catch (e) { console.error('Error al refrescar perfil/clase base', e); }
      })();
    }
  }, [navigate]);

  // Al tocar un push sin pantalla propia, llegamos con ?aviso=<json> (un aviso accionable:
  // campaña, comentario de WOD, etc.) o, como fallback, ?campanita=1 (abrir solo la bandeja).
  // Con ?aviso ejecutamos la MISMA lógica que el clic interno (abrirAviso) para abrir el
  // modal correcto, no solo la lista.
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const avisoRaw = params.get('aviso');
      if (avisoRaw) {
        try {
          abrirAviso(JSON.parse(avisoRaw));
        } catch {
          setShowModalNotis(true); // payload corrupto: al menos abre la bandeja
        }
        params.delete('aviso');
        params.delete('campanita');
        const nuevaUrl = window.location.pathname +
          (params.toString() ? `?${params.toString()}` : '') + window.location.hash;
        window.history.replaceState({}, '', nuevaUrl);
      } else if (params.get('campanita') === '1') {
        setShowModalNotis(true);
        params.delete('campanita');
        const nuevaUrl = window.location.pathname +
          (params.toString() ? `?${params.toString()}` : '') + window.location.hash;
        window.history.replaceState({}, '', nuevaUrl);
      }
    } catch { /* noop */ }
  }, []);

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

  // Abre la bandeja y marca TODO como leído (el contador rojo se limpia al instante).
  const abrirBandejaNotis = () => {
    setShowModalNotis(true);
    if (!notificaciones.some(n => !n.leida)) return;
    setNotificaciones(prev => prev.map(n => ({ ...n, leida: true }))); // optimista: limpia el badge ya
    try {
      const idUsuario = user?.idUsuario || user?.id;
      const token = localStorage.getItem('token');
      fetch(`${API_BASE}/interacciones/notificaciones/usuario/${idUsuario}/leer-todas`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      }).catch(() => {});
    } catch (error) { /* noop */ }
  };

  // Borra un aviso (swipe en el modal). Optimista + DELETE en el backend.
  const borrarNotificacion = async (idNoti) => {
    setNotificaciones(prev => prev.filter(n => n.idNotificacion !== idNoti));
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_BASE}/interacciones/notificaciones/${idNoti}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch (error) { console.error(error); }
  };

  // Tap en un aviso: si apunta a un comentario abre el modal en él y se limpia del buzón;
  // si no, solo lo marca como leído.
  const abrirAviso = (noti) => {
    if (noti.idEntrenamiento) {
      setFocoComentario({ idComentario: noti.idComentario, idComentarioRaiz: noti.idComentarioRaiz });
      setComentariosWod({ idEntrenamiento: noti.idEntrenamiento });
      setShowModalNotis(false);
      borrarNotificacion(noti.idNotificacion); // se limpia del buzón al abrir el comentario
    } else if (noti.destino === 'records') {
      // Reacción a un PR -> Mi Perfil pestaña Récords, abriendo el modal de reacciones de ese PR;
      // se limpia del buzón al abrirla (igual que las notis de comentario).
      setShowModalNotis(false);
      borrarNotificacion(noti.idNotificacion);
      navigate('/mi-perfil#records', { state: { reaccionesMarca: noti.idMarca } });
    } else if (noti.destino === 'mi-sugerencia') {
      // Cambio de estado de una sugerencia que envió -> buzón, con la sugerencia resaltada.
      setShowModalNotis(false);
      leerNotificacion(noti.idNotificacion);
      navigate('/buzon-sugerencias', { state: { sugerenciaDestacada: noti.idSugerencia } });
    } else if (typeof noti.destino === 'string' && noti.destino.startsWith('sugerencia-coach:')) {
      // Sugerencia del administrador (o su reacción a tu respuesta) -> pantalla de sugerencias.
      const idS = parseInt(noti.destino.split(':')[1]);
      setShowModalNotis(false);
      leerNotificacion(noti.idNotificacion);
      navigate('/mis-sugerencias-coach', { state: { destacada: idS } });
    } else if (typeof noti.destino === 'string' && noti.destino.startsWith('campania:')) {
      // Campaña/anuncio o estado de su aportación -> abrir el detalle de esa campaña.
      const idCamp = parseInt(noti.destino.split(':')[1]);
      setShowModalNotis(false);
      leerNotificacion(noti.idNotificacion);
      if (idCamp) setCampaniaAbrir(idCamp);
    } else if (!noti.leida) {
      leerNotificacion(noti.idNotificacion);
    }
  };

  const cargarAmistades = async (idUsuario) => {
    try {
      // Las solicitudes ahora llegan por la campana; aquí solo cargamos los compas confirmados.
      const resCompas = await fetch(`${API_BASE}/amistades/mis-compas/${idUsuario}`);
      if (resCompas.ok) setMisCompas(await resCompas.json());
    } catch (error) { console.error(error); }
  };

  // Mientras el modal de "Mi Equipo" está abierto, refrescamos la presencia cada 30s:
  // re-fetch de la lista (trae UltimaConexion fresca) + tick para recalcular el "hace X".
  useEffect(() => {
    if (!showModalAmistades) return;
    const uid = user?.idUsuario || user?.id;
    if (uid) cargarAmistades(uid); // refresco inmediato al abrir
    const intervalo = setInterval(() => {
      setPresenciaTick(x => x + 1);
      const id = user?.idUsuario || user?.id;
      if (id) cargarAmistades(id);
    }, 30000);
    return () => clearInterval(intervalo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showModalAmistades]);

  const responderSolicitud = async (idAmistad, respuesta) => {
    try {
      const res = await fetch(`${API_BASE}/amistades/responder/${idAmistad}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ respuesta })
      });
      if (res.ok) cargarAmistades(user.idUsuario || user.id);
    } catch (error) { console.error(error); }
  };

  // Aceptar/Rechazar una solicitud desde la propia notificación: responde y la quita del buzón.
  const responderDesdeNoti = (noti, respuesta) => {
    if (!noti.idAmistad || respondiendoRef.current.has(noti.idAmistad)) return; // anti doble-tap
    respondiendoRef.current.add(noti.idAmistad);
    borrarNotificacion(noti.idNotificacion);
    responderSolicitud(noti.idAmistad, respuesta);
  };

  const handleEliminarAmigo = async (idCompa) => {
    if (!window.confirm('¿Seguro que quieres quitar a este compa de tu equipo?')) return;
    try {
      const miId = user.idUsuario || user.id;
      const res = await fetch(`${API_BASE}/amistades/eliminar/${miId}/${idCompa}`, { method: 'DELETE' });
      if (res.ok) {
        alert("Compa eliminado de tu equipo.");
        cargarAmistades(miId);
      }
    } catch (error) { console.error("Error al eliminar", error); }
  };

  const handleAbrirPerfilCompa = async (idLobo) => {
    setCargandoMarcas(true);
    setLoboSeleccionado(null);
    setMarcasLobo([]);
    setReaccionesResumenU({});
    setPerfilLikesU({ totalLikes: 0, yaLeDiLike: false });
    const token = localStorage.getItem('token');
    const auth = { 'Authorization': `Bearer ${token}` };
    try {
      // perfil-publico: subconjunto seguro visible para cualquier atleta (GET /usuarios/{id} tiene guard PII -> 403)
      const resUser = await fetch(`${API_BASE}/usuarios/${idLobo}/perfil-publico`, { headers: auth });
      if (resUser.ok) setLoboSeleccionado(await resUser.json());

      const [resPRs, resLikes, resResumen] = await Promise.all([
        fetch(`${API_BASE}/marcaspersonales/usuario/${idLobo}`),
        fetch(`${API_BASE}/interacciones/like-perfil/${idLobo}/estado`, { headers: auth }),
        fetch(`${API_BASE}/interacciones/usuario/${idLobo}/reacciones-resumen`, { headers: auth }),
      ]);
      if (resPRs.ok) { const data = await resPRs.json(); setMarcasLobo(data.recordsMaximos || data || []); }
      if (resLikes.ok) setPerfilLikesU(await resLikes.json());
      if (resResumen.ok) { const arr = await resResumen.json(); setReaccionesResumenU(Object.fromEntries(arr.map(r => [r.idMarca, r]))); }
    } catch (error) { console.error(error); }
    finally { setCargandoMarcas(false); }
  };

  // Reacción a un PR — UI optimista (bumpea conteo y reconcilia)
  async function handleReaccionar(idMarca, emoji) {
    if (!loboSeleccionado) return;
    const previo = reaccionesResumenU;
    setReaccionesResumenU(prev => aplicarReaccionMarcaLocal(prev, idMarca, emoji));
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/interacciones/reaccionar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ idMarca, emoji })
      });
      if (!res.ok) throw new Error();
      const resR = await fetch(`${API_BASE}/interacciones/usuario/${loboSeleccionado.idUsuario}/reacciones-resumen`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (resR.ok) { const arr = await resR.json(); setReaccionesResumenU(Object.fromEntries(arr.map(r => [r.idMarca, r]))); }
    } catch (error) { setReaccionesResumenU(previo); }
  }

  // Like al perfil — UI optimista (toggle)
  async function handleLikePerfilU(idPerfil) {
    const previo = perfilLikesU;
    setPerfilLikesU(previo.yaLeDiLike
      ? { totalLikes: Math.max(0, previo.totalLikes - 1), yaLeDiLike: false }
      : { totalLikes: previo.totalLikes + 1, yaLeDiLike: true });
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/interacciones/like-perfil/${idPerfil}`, {
        method: 'POST', headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error();
      setPerfilLikesU(await res.json());
    } catch (error) { setPerfilLikesU(previo); }
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
        // Los WODs personales (esPersonal) NO van al feed general del box: solo aparecen
        // en "WODs para ti" para los atletas asignados.
        const wodsDelDia = todosWods.filter(w => w.fechaProgramada?.includes(hoyStr) && w.estaPublicado && !w.esPersonal);
        setWodsHoy(wodsDelDia);
        cargarSocialWods(wodsDelDia);
      }
      const resPizarra = await fetch(`${API_BASE}/asistencias/box/${idBox}/leaderboard/${hoyStr}`);
      if (resPizarra.ok) setPizarra(await resPizarra.json());
    } catch (err) { console.error(err); } finally { setLoadingWod(false); }
  };

  // Carga los contadores (like/dislike/comentarios) de los WODs de hoy
  const cargarSocialWods = async (wods) => {
    const entradas = await Promise.all((wods || []).map(async w => {
      try {
        const c = await api.obtenerContadoresWod(w.idEntrenamiento);
        return [w.idEntrenamiento, c];
      } catch {
        return [w.idEntrenamiento, { likes: 0, dislikes: 0, miReaccion: null, totalComentarios: 0 }];
      }
    }));
    setSocialWod(Object.fromEntries(entradas));
  };

  const reaccionarWod = async (idEnt, tipo) => {
    const previo = socialWod[idEnt] || { likes: 0, dislikes: 0, miReaccion: null, totalComentarios: 0 };
    // Update optimista: se pinta de inmediato (sin esperar la red)
    setSocialWod(prev => ({ ...prev, [idEnt]: aplicarReaccionLocal(prev[idEnt] || previo, tipo) }));
    try {
      const c = await api.reaccionarWod(idEnt, tipo);
      // Reconciliar con los contadores reales del servidor
      setSocialWod(prev => ({ ...prev, [idEnt]: c }));
    } catch (e) {
      // Si falla, revertir a lo que había antes
      setSocialWod(prev => ({ ...prev, [idEnt]: previo }));
      alert(e.message || 'No se pudo reaccionar.');
    }
  };

  // Ajusta el contador de comentarios cuando se crea/borra desde el modal
  const ajustarContadorComentarios = (idEnt, delta) => {
    setSocialWod(prev => ({
      ...prev,
      [idEnt]: { ...(prev[idEnt] || {}), totalComentarios: Math.max(0, ((prev[idEnt]?.totalComentarios) || 0) + delta) }
    }));
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
    const nivelAtleta = user.categoriaBase || "Novato";
    //  INTERCEPTOR DE CATEGORÍAS (jerárquico): piso = nivel más bajo permitido.
    //  Requerido → bloquea; Sugerido → advierte pero deja continuar. "Todos" = sin restricción.
    if (!clase.usuarioInscrito) {
      const ev = evaluarNivelClase(nivelAtleta, clase.nivelesPermitidos, clase.nivelObligatorio);
      if (ev.bloqueado) {
        alert(`Esta clase es para nivel ${clase.nivelesPermitidos} (o superior). Tu categoría es ${nivelAtleta}. ¡Sigue entrenando para llegar ahí!`);
        return;
      }
      if (ev.advertencia) {
        const confirmar = await window.wpConfirm(
          `ADVERTENCIA DE NIVEL\n\nEsta clase está sugerida para nivel ${clase.nivelesPermitidos} (o superior), y tú eres ${nivelAtleta}.\n\n¿Seguro que quieres tomarla? El WOD podría ser muy exigente.`
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

  // Filtra los WODs de hoy por la clase reservada del atleta + su revelación programada.
  // `nowTick` se referencia para que estas listas se recalculen al re-renderizar por el timer.
  const wodPasaClase = (w) => !w.clasesAsignadas || w.clasesAsignadas.length === 0 || (miClaseHoy && w.clasesAsignadas.some(c => c.idClase === miClaseHoy.idClase));
  const getWodsVisibles = () => {
    void nowTick;
    const ahora = new Date();
    const base = miClaseHoy ? wodsHoy.filter(wodPasaClase) : wodsHoy;
    return base.filter(w => wodRevelado(w, miClaseHoy, ahora));
  };
  const getWodsBloqueados = () => {
    const ahora = new Date();
    const base = miClaseHoy ? wodsHoy.filter(wodPasaClase) : wodsHoy;
    return base.filter(w => !wodRevelado(w, miClaseHoy, ahora));
  };

  const handleClickDescargar = () => {
    const wodsAMostrar = getWodsVisibles();
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
                    {user?.idClasePredeterminada
                      ? (claseBase
                          ? `${String(claseBase.horarioInicio || '').substring(0, 5)} · ${claseBase.nombre}`
                          : 'Clase Fija')
                      : miClaseHoy
                        ? `${String(miClaseHoy.horaInicio || miClaseHoy.horarioInicio || '').substring(0, 5)} · ${miClaseHoy.nombre}`
                        : 'Sin reserva hoy'}
                  </span>
                </div>
              </div>
            </div>
            
            {/* DERECHA: Notificaciones, Categoria y Mini Pill */}
            <div className="d-flex align-items-center gap-3">
              <BotonActivarPush />
              <button
                className="up-notif-btn position-relative"
                onClick={abrirBandejaNotis}
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
          
          <AnunciosEngine box={box} user={user} abrirCampania={campaniaAbrir} onConsumirAbrir={() => setCampaniaAbrir(null)} />

          {/* 👇 BLOQUEO DE MEMBRESÍA VENCIDA 👇 */}
          {finanzas?.suscripcion?.estatus === 'Vencida' && (
            <div className="row justify-content-center mb-5">
                <div className="col-12 col-md-10 col-lg-8">
                    <div className="up-card up-card--top-danger p-4 p-md-5 text-center">
                        <i className="fas fa-exclamation-triangle text-danger fs-1 mb-3"></i>
                        <h2 className="text-white fw-bold mb-3" style={{fontFamily: 'var(--font-heading)'}}>MEMBRESÍA VENCIDA</h2>
                        <p className="text-secondary mb-4">
                          Tu acceso a clases y reservas ha sido suspendido. Por favor, regulariza tu pago para volver a la comunidad.
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
                    {!loadingWod && getWodsVisibles().length > 0 && (
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
                        const wodsAMostrar = getWodsVisibles();

                        if (wodsAMostrar.length === 0) {
                          const bloqueados = getWodsBloqueados();
                          if (bloqueados.length > 0) {
                            const horaRev = horaRevelacionMostrar(bloqueados[0], miClaseHoy);
                            return (
                              <div className="text-center py-5">
                                <i className="fas fa-lock fs-1 mb-3 text-warning opacity-75"></i>
                                <h4 className="text-white fw-bold mb-2" style={{ fontFamily: 'var(--font-heading)' }}>WOD sorpresa</h4>
                                <p className="text-white-50 small mb-0">
                                  El entrenamiento de hoy se revela{horaRev ? <> a las <strong className="text-warning">{formatear12(horaRev)}</strong></> : ' pronto'}. ¡Prepárate! 🔒
                                </p>
                              </div>
                            );
                          }
                          return <p className="text-secondary opacity-50 text-center py-3">No hay WOD asignado para tu clase específica.</p>;
                        }

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
                                {wod.requiereScore === false && (
                                  <span className="up-sinscore-badge">
                                    <i className="fas fa-mug-hot me-1"></i>Sin score · solo asistencia
                                  </span>
                                )}
                              </div>

                              {wod.bloques?.map(bloque => (
                                <div key={bloque.idBloque} className="up-bloque" style={wodsAMostrar.length > 1 ? { borderLeft: `3px solid ${wodColor}` } : {}}>
                                  <div className="up-bloque-header">
                                    <div className="d-flex align-items-center gap-2 flex-wrap">
                                      <span className="up-bloque-tipo">{bloque.tipoBloque}</span>
                                      <span className="up-bloque-mod">{bloque.tipoModalidad}</span>
                                      {bloque.rondas ? (
                                        <span className="up-bloque-rondas"><i className="fas fa-repeat me-1"></i>{bloque.rondas} rondas</span>
                                      ) : null}
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

                              {/* Barra social: like / dislike / comentarios */}
                              {(() => {
                                const s = socialWod[wod.idEntrenamiento] || { likes: 0, dislikes: 0, miReaccion: null, totalComentarios: 0 };
                                return (
                                  <div className="up-wod-social">
                                    <button
                                      className={`up-social-btn ${s.miReaccion === 'like' ? 'up-social-btn--like' : ''}`}
                                      onClick={() => reaccionarWod(wod.idEntrenamiento, 'like')}
                                      aria-label="Me gusta"
                                    >
                                      <i className="fas fa-thumbs-up"></i><span>{s.likes}</span>
                                    </button>
                                    <button
                                      className={`up-social-btn ${s.miReaccion === 'dislike' ? 'up-social-btn--dislike' : ''}`}
                                      onClick={() => reaccionarWod(wod.idEntrenamiento, 'dislike')}
                                      aria-label="No me gusta"
                                    >
                                      <i className="fas fa-thumbs-down"></i><span>{s.dislikes}</span>
                                    </button>
                                    <button
                                      className="up-social-btn up-social-btn--comments ms-auto"
                                      onClick={() => { setFocoComentario(null); setComentariosWod(wod); }}
                                    >
                                      <i className="fas fa-comment"></i>
                                      <span>{s.totalComentarios > 0 ? `${s.totalComentarios} ` : ''}Comentarios</span>
                                    </button>
                                  </div>
                                );
                              })()}

                              {wodIdx < wodsAMostrar.length - 1 && <div className="up-wod-divider"></div>}
                            </div>
                          );
                        });
                      })()}
                    </div>
                  )}
                </div>
              </div>

              {/* WODs PARA TI — rutinas personalizadas asignadas a este atleta */}
              <WodsPersonalesAtleta idUsuario={user?.idUsuario || user?.id} />

              {/* PIZARRA */}
              {getWodsVisibles().length > 0 && (() => {
                const wodAsignado = getWodsVisibles()[0];

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
                            <i className="fas fa-paw"></i> {soloCompas ? 'Viendo Comunidad' : 'Compas'}
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
                              <p className="text-secondary small">Nadie de tu comunidad ha registrado scores aún.</p>
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
                                      {res.nivelGamer && <span className="up-rank-lvl">LVL {formatNivelGamer(res.nivelGamer).toUpperCase()}</span>}
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

              {/* Mi Equipo */}
              <div
                className="up-card up-card-clickable"
                onClick={() => setShowModalAmistades(true)}
              >
                <div className="up-mini-card">
                  <div className="up-mini-icon up-mini-icon-danger">
                    <i className="fas fa-paw"></i>
                  </div>
                  <div className="flex-grow-1">
                    <div className="up-mini-label">Mi Equipo</div>
                    <div className="up-mini-value">{misCompas.length} compas en el equipo</div>
                  </div>
                  <i className="fas fa-chevron-right text-secondary small"></i>
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
                              valor={miClaseHoy.idMiWod != null && miClaseHoy.idMiWod !== -1 ? miClaseHoy.idMiWod : ''}
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
                    <div className="up-mini-value">La Comunidad</div>
                  </div>
                  <i className="fas fa-chevron-right text-secondary small"></i>
                </div>
              </div>

              {/* Sugerencias del administrador */}
              <div className="up-card up-card-clickable" onClick={() => navigate('/mis-sugerencias-coach')}>
                <div className="up-mini-card">
                  <div className="up-mini-icon up-mini-icon-info">
                    <i className="fas fa-lightbulb"></i>
                  </div>
                  <div className="flex-grow-1">
                    <div className="up-mini-label">Sugerencias</div>
                    <div className="up-mini-value">Consejos de tu administrador</div>
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
                  <p className="up-noti-tip"><i className="fas fa-hand-pointer me-1"></i>Desliza un aviso para borrarlo</p>
                  {notificaciones.map(noti => (
                    <NotificacionRow
                      key={noti.idNotificacion}
                      noti={noti}
                      onAbrir={abrirAviso}
                      onBorrar={borrarNotificacion}
                      onResponder={responderDesdeNoti}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL MI EQUIPO — presencia en tiempo real (En línea / Ausente / Desconectado) */}
      {showModalAmistades && (
        <div className="up-modal-overlay" onClick={() => setShowModalAmistades(false)}>
          <div className="up-modal up-modal--sm up-team-modal" data-tick={presenciaTick} onClick={e => e.stopPropagation()}>

            <div className="up-team-header">
              <div className="up-team-header-icon"><i className="fas fa-paw"></i></div>
              <div className="up-team-header-text">
                <h5 className="up-team-title">MI <span>EQUIPO</span></h5>
                <p className="up-team-subtitle">Tus compas en tiempo real</p>
              </div>
              <button onClick={() => setShowModalAmistades(false)} className="up-modal-close"><i className="fas fa-times"></i></button>
            </div>

            <div className="up-modal-body up-team-body">
              {(() => {
                const norm = (s) => (s || '').toString().normalize('NFD').replace(new RegExp('[\\u0300-\\u036f]', 'g'), '').toLowerCase();
                const conPresencia = misCompas.map(c => ({ ...c, _p: calcularPresencia(c.ultimaConexion) }));
                const enLineaCount = conPresencia.filter(c => c._p.estado === 'en-linea').length;
                const q = norm(buscarCompa);
                const lista = conPresencia
                  .filter(c => !q
                    || norm(c.apodo).includes(q)
                    || norm(c.nombre).includes(q)
                    || norm(c._p.label).includes(q))
                  .sort((a, b) => (a._p.rank - b._p.rank)
                    || norm(a.apodo || a.nombre).localeCompare(norm(b.apodo || b.nombre)));

                return (
                  <>
                    <div className="up-team-stats">
                      <span className="up-team-stat up-team-stat--online">
                        <span className="up-team-stat-dot"></span>{enLineaCount} en línea
                      </span>
                      <span className="up-team-stat">{misCompas.length} en el equipo</span>
                      <span className="up-team-stats-label">TUS COMPAS</span>
                    </div>

                    {misCompas.length > 4 && (
                      <div className="up-team-search">
                        <i className="fas fa-search up-team-search-icon"></i>
                        <input
                          type="text"
                          className="up-team-search-input"
                          placeholder="Buscar compa..."
                          value={buscarCompa}
                          onChange={e => setBuscarCompa(e.target.value)}
                        />
                      </div>
                    )}

                    {misCompas.length === 0 ? (
                      <div className="up-team-empty">
                        <i className="fas fa-user-group"></i>
                        <p>Aún no has agregado a nadie a tu equipo.</p>
                      </div>
                    ) : lista.length === 0 ? (
                      <div className="up-team-empty">
                        <i className="fas fa-magnifying-glass"></i>
                        <p>Sin resultados para “{buscarCompa}”.</p>
                      </div>
                    ) : (
                      <div className="up-team-list">
                        {lista.map(compa => {
                          const nombre = compa.apodo || compa.nombre.split(' ')[0];
                          const inicial = (nombre || '?').charAt(0).toUpperCase();
                          const [c1, c2] = colorAvatar(compa.idLobo);
                          const p = compa._p;
                          const tieneFoto = compa.foto && String(compa.foto).trim();
                          return (
                            <div
                              key={compa.idLobo}
                              className={`up-team-row up-team-row--${p.estado}`}
                              onClick={() => handleAbrirPerfilCompa(compa.idLobo)}
                            >
                              <div
                                className="up-team-avatar"
                                style={{
                                  background: tieneFoto ? '#0e0e14' : `linear-gradient(135deg, ${c1}, ${c2})`,
                                  borderColor: c1
                                }}
                              >
                                {tieneFoto
                                  ? <img src={compa.foto} alt={nombre} />
                                  : <span>{inicial}</span>}
                                <span className={`up-team-status-dot up-team-status-dot--${p.estado}`}></span>
                              </div>

                              <div className="up-team-info">
                                <div className="up-team-name-row">
                                  <span className="up-team-name">{nombre}</span>
                                  {p.estado === 'en-linea' && compa.estadoDia && (
                                    <span className="up-team-estado">{compa.estadoDia}</span>
                                  )}
                                </div>
                                <div className="up-team-presence">
                                  <span className={`up-team-presence-dot up-team-presence-dot--${p.estado}`}></span>
                                  <span className="up-team-presence-label">{p.label}</span>
                                  <span className="up-team-presence-sep">·</span>
                                  <span className="up-team-presence-detail">{p.detalle}</span>
                                </div>
                              </div>

                              <button
                                className="up-team-compare"
                                onClick={(e) => { e.stopPropagation(); setCompararCon(compa); }}
                                title="Comparar récords"
                              >
                                <i className="fas fa-eye"></i>
                              </button>
                              <button
                                className="up-team-remove"
                                onClick={(e) => { e.stopPropagation(); handleEliminarAmigo(compa.idLobo); }}
                                title="Quitar de mi equipo"
                              >
                                <i className="fas fa-times"></i>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* COMPARAR PRs — Tú vs compa (se abre con el botón 👁 de Mi Equipo) */}
      {compararCon && (
        <ModalCompararPRs
          miId={user?.idUsuario || user?.id}
          compa={compararCon}
          onCerrar={() => setCompararCon(null)}
        />
      )}

      {/* WOLF LANYARD — Perfil del compa */}
      {loboSeleccionado && (
        <WolfLanyard
          lobo={loboSeleccionado}
          marcas={marcasLobo}
          cargandoMarcas={cargandoMarcas}
          miId={user?.idUsuario || user?.id}
          reaccionesResumen={reaccionesResumenU}
          likesPerfil={perfilLikesU.totalLikes}
          yaLeDiLike={perfilLikesU.yaLeDiLike}
          onLikePerfil={handleLikePerfilU}
          estadoAmistad="Aceptada"  /* este lanyard solo se abre desde la lista de compas ya aceptados */
          onClose={() => setLoboSeleccionado(null)}
          onReaccionar={handleReaccionar}
          onSolicitarAmistad={() => { }}
        />
      )}

      {/* MODAL DIARIO "ESTADO DE HOY" */}
      {mostrarModalEstadoDia && user && (
        <ModalEstadoDelDia
          idUsuario={user.idUsuario || user.id}
          valorActual={user.estadoDelDia || ''}
          onCerrar={(valor) => {
            const key = `atletify_estadoDia_${user.idUsuario || user.id}_${getFechaHoyString()}`;
            localStorage.setItem(key, '1');
            if (valor) setUser(prev => (prev ? { ...prev, estadoDelDia: valor } : prev));
            setMostrarModalEstadoDia(false);
          }}
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
                  // Solo se bloquea visualmente si la clase es Requerida (Obligatoria) y el atleta
                  // no llega al piso; si es Sugerida, la tarjeta queda activa y toggleReserva avisa.
                  const nivelNoPermitido = evaluarNivelClase(categoriaAtleta, clase.nivelesPermitidos, clase.nivelObligatorio).bloqueado;

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

      {/* Modal de comentarios del WOD (like/dislike viven en la card) */}
      {comentariosWod && (
        <ModalComentariosWod
          wod={comentariosWod}
          focus={focoComentario}
          onCerrar={() => { setComentariosWod(null); setFocoComentario(null); }}
          onCountChange={(delta) => ajustarContadorComentarios(comentariosWod.idEntrenamiento, delta)}
        />
      )}

    </div>
  );
}
