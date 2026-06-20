import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { USUARIOS_ENDPOINT, VENTAS_ENDPOINT } from '../services/api';
import DateWheelPicker from '../components/DateWheelPicker';
import BackButton from '../components/BackButton';
import AtletifyLoader from '../components/AtletifyLoader';
import EstadoDelDiaPicker from '../components/EstadoDelDiaPicker';
import NivelGamerPicker, { formatNivelGamer } from '../components/NivelGamerPicker';
import GeneroPicker from '../components/GeneroPicker';
import ObjetivoPicker from '../components/ObjetivoPicker';
import TallaPlayeraPicker from '../components/TallaPlayeraPicker';
import CategoriaBasePicker from '../components/CategoriaBasePicker';
import TipoSangrePicker from '../components/TipoSangrePicker';
import EjercicioOlimpicoPicker from '../components/EjercicioOlimpicoPicker';
import PorcentajePicker from '../components/PorcentajePicker';
import UnidadPesoPicker from '../components/UnidadPesoPicker';
import BotonSeguro from '../components/BotonSeguro';
import PasswordRulesHint from '../components/PasswordRulesHint';
import usePasswordStrength from '../hooks/usePasswordStrength';
import ImageCropperModal from '../components/ImageCropperModal';
import '../assets/css/MiPerfil.css';

const API_BASE = import.meta.env.VITE_API_URL;

export default function MiPerfil() {
  const navigate = useNavigate();
  const location = useLocation();
  const { actualizarUsuario } = useAuth();
  const reaccionMarcaAbiertaRef = useRef(false);
  const [loading, setLoading] = useState(true);
  const [userAuth, setUserAuth] = useState(null);
  const [progreso, setProgreso] = useState(0);
  const [rachaVisible, setRachaVisible] = useState(0);
  const [imageToCrop, setImageToCrop] = useState(null);
  const [deudaReal, setDeudaReal] = useState(0);

  const [form, setForm] = useState({
    nombre: '', apellidos: '', username: '', foto: '', telefono: '', fechaNacimiento: '',
    peso: '', tallaPlayera: '', categoriaBase: '',
    tipoDeSangre: '', tieneExperiencia: false, deporteExperiencia: '',
    tieneDiscapacidad: '', genero: '', apodo: '', estadoDelDia: '',
    nivelGamer: 'Cachorro', coachFavorito: '', movimientoFavorito: '',
    movimientoOdiado: '', objetivo: '', esDeConfianza: false, deudaTienda: 0,
    ocultarDelLeaderboard: false, ocultarGamerCard: false, deshabilitarSolicitudes: false,
    estatus: 'Activo'
  });

  const [passForm, setPassForm] = useState({
    contrasenaActual: '', nuevaContrasena: '', confirmarContrasena: ''
  });
  const reglasPassword = usePasswordStrength(passForm.nuevaContrasena);

  // ── Username live-check ──────────────────────────────────────
  // 'idle' | 'current' | 'checking' | 'available' | 'taken' | 'short' | 'invalid'
  const [usernameEstado, setUsernameEstado] = useState('idle');
  const usernameOriginalRef = useRef('');   // username con el que cargó la página (en minúsculas)
  const usernameDebounceRef = useRef(null);

  // ── Pestañas de la Player Card ───────────────────────────────
  const TABS = [
    { key: 'perfil',  label: 'Perfil',  icon: 'fa-id-badge' },
    { key: 'records', label: 'Récords', icon: 'fa-trophy' },
    { key: 'cuenta',  label: 'Cuenta',  icon: 'fa-shield-halved' },
  ];
  const [tabActiva, setTabActiva] = useState(() => {
    const h = window.location.hash.replace('#', '');
    return ['perfil', 'records', 'cuenta'].includes(h) ? h : 'perfil';
  });
  const tabRefs = useRef({});
  const hashInicialRef = useRef(window.location.hash); // hash con el que se cargó la página

  const [freezePassword, setFreezePassword] = useState('');
  const [freezing, setFreezing] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [unfreezePassword, setUnfreezePassword] = useState('');
  const [unfreezing, setUnfreezing] = useState(false);
  const [seccionActiva, setSeccionActiva] = useState(null); // 'congelar' | 'eliminar' | null

  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'default',
    isAlertOnly: false,
    onConfirm: null
  });

  function triggerConfirm({ title, message, type, onConfirm }) {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      type,
      isAlertOnly: false,
      onConfirm
    });
  }

  function triggerAlert({ title, message, type, onConfirm }) {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      type: type || 'info',
      isAlertOnly: true,
      onConfirm: onConfirm || null
    });
  }

  const [ejerciciosOlimpicos, setEjerciciosOlimpicos] = useState([]);
  const [formMarca, setFormMarca] = useState({ idEjercicio: '', valor: '', unidad: 'lbs' });
  const [guardandoPR, setGuardandoPR] = useState(false);
  const [prParaCalcular, setPrParaCalcular] = useState('');
  const [pctCalculo, setPctCalculo] = useState(70); // % seleccionado en la calculadora
  const [mostrarDatePicker, setMostrarDatePicker] = useState(false);
  const [recordsMaximos, setRecordsMaximos] = useState([]);
  const [historialCompleto, setHistorialCompleto] = useState([]);
  const [graficaEjercicioId, setGraficaEjercicioId] = useState('');

  // Social: likes recibidos en mi perfil + resumen de reacciones por PR + modal de detalle
  const [misLikes, setMisLikes] = useState(0);
  const [misReaccionesResumen, setMisReaccionesResumen] = useState({}); // idMarca -> { total, conteos }
  const [modalSocial, setModalSocial] = useState(null); // { tipo:'likes'|'reacciones', titulo, items, cargando }

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem('usuario'));
    const b = JSON.parse(localStorage.getItem('box'));
    if (!u || !b) { navigate('/login'); return; }
    setUserAuth(u);
    const idUsuario = u.id || u.idUsuario;
    fetchExpediente(idUsuario);
    fetchDeudaReal(idUsuario);
    cargarDatosPRs(b.idBox, idUsuario);
    cargarSocialMine(idUsuario);
  }, [navigate]);

  // Verificación de disponibilidad del username en tiempo real (debounce 400ms)
  useEffect(() => {
    const u = form.username.trim();

    // Igual a su username actual → sin cambios, todo en orden (sin llamada a la red)
    if (u.toLowerCase() === usernameOriginalRef.current && usernameOriginalRef.current !== '') {
      setUsernameEstado('current');
      return;
    }
    if (!u) { setUsernameEstado('idle'); return; }
    if (!/^[a-zA-Z0-9._-]+$/.test(u)) { setUsernameEstado('invalid'); return; }
    if (u.length < 3) { setUsernameEstado('short'); return; }

    setUsernameEstado('checking');
    if (usernameDebounceRef.current) clearTimeout(usernameDebounceRef.current);
    usernameDebounceRef.current = setTimeout(async () => {
      try {
        const idUsuario = userAuth?.id || userAuth?.idUsuario;
        const res = await fetch(`${USUARIOS_ENDPOINT}/verificar-username/${encodeURIComponent(u)}?excluirId=${idUsuario}`);
        if (!res.ok) { setUsernameEstado('idle'); return; }
        const data = await res.json();
        setUsernameEstado(data.disponible ? 'available' : 'taken');
      } catch {
        setUsernameEstado('idle');
      }
    }, 400);

    return () => { if (usernameDebounceRef.current) clearTimeout(usernameDebounceRef.current); };
  }, [form.username, userAuth]);

  // Sincroniza la pestaña activa con el hash de la URL (sobrevive al reload tras Guardar)
  // y resetea el scroll al cambiar de pestaña.
  useEffect(() => {
    if (window.location.hash !== '#' + tabActiva) {
      window.history.replaceState(null, '', '#' + tabActiva);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [tabActiva]);

  // Si el hash cambia sin re-montar (mismo /mi-perfil), sincronizar la pestaña
  useEffect(() => {
    const onHashChange = () => {
      const h = window.location.hash.replace('#', '');
      if (['perfil', 'records', 'cuenta'].includes(h)) setTabActiva(h);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // Si llegamos desde una notificación de reacción a PR, abrir el modal de reacciones de ese PR
  useEffect(() => {
    const idMarca = location.state?.reaccionesMarca;
    if (!idMarca || reaccionMarcaAbiertaRef.current || recordsMaximos.length === 0) return;
    reaccionMarcaAbiertaRef.current = true;
    const pr = recordsMaximos.find(p => p.idMarca === idMarca) || { idMarca, nombreEjercicio: 'tu PR' };
    abrirModalReacciones(pr);
  }, [location.state, recordsMaximos]);

  // Navegación por flechas entre pestañas (accesibilidad: role=tablist)
  function onTabKey(e, idx) {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const dir = e.key === 'ArrowRight' ? 1 : -1;
      const next = (idx + dir + TABS.length) % TABS.length;
      setTabActiva(TABS[next].key);
      tabRefs.current[TABS[next].key]?.focus();
    }
  }

  async function fetchDeudaReal(idUsuario) {
    try {
      const res = await fetch(`${VENTAS_ENDPOINT}/fiados/mis-deudas/${idUsuario}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const pedidos = await res.json();
        const total = pedidos
          .filter(p => p.estatus === 'Pendiente' || p.estatus === 'Fiado')
          .reduce((acc, p) => acc + (p.resta ?? (p.totalVenta - (p.montoAbonado || 0))), 0);
        setDeudaReal(total);
      }
    } catch (e) { console.error('Error al cargar deuda real:', e); }
  }

  async function fetchExpediente(idUsuario) {
    try {
      const res = await fetch(`${USUARIOS_ENDPOINT}/${idUsuario}`);
      if (res.ok) {
        const data = await res.json();
        let fechaFormat = '';
        if (data.FechaNacimiento || data.fechaNacimiento) {
          fechaFormat = new Date(data.FechaNacimiento || data.fechaNacimiento).toISOString().split('T')[0];
        }
        const usernameCargado = data.Username || data.username || '';
        const datosCargados = {
          nombre: data.Nombre || data.nombre || '',
          apellidos: data.Apellidos || data.apellidos || '',
          username: usernameCargado,
          foto: data.Foto || data.foto || '',
          telefono: data.Telefono || data.telefono || '',
          fechaNacimiento: fechaFormat,
          peso: data.Peso || data.peso || '',
          tallaPlayera: data.TallaPlayera || data.tallaPlayera || '',
          categoriaBase: data.CategoriaBase || data.categoriaBase || '',
          tipoDeSangre: data.TipoDeSangre || data.tipoDeSangre || '',
          tieneExperiencia: data.TieneExperiencia || data.tieneExperiencia || false,
          deporteExperiencia: data.DeporteExperiencia || data.deporteExperiencia || '',
          tieneDiscapacidad: data.TieneDiscapacidad || data.tieneDiscapacidad || '',
          genero: data.Genero || data.genero || '',
          apodo: data.Apodo || data.apodo || '',
          estadoDelDia: data.EstadoDelDia || data.estadoDelDia || '😎 Chill',
          nivelGamer: data.NivelGamer || data.nivelGamer || 'Cachorro',
          coachFavorito: data.CoachFavorito || data.coachFavorito || '',
          movimientoFavorito: data.MovimientoFavorito || data.movimientoFavorito || '',
          movimientoOdiado: data.MovimientoOdiado || data.movimientoOdiado || '',
          objetivo: data.Objetivo || data.objetivo || '',
          esDeConfianza: data.EsDeConfianza || data.esDeConfianza || false,
          deudaTienda: data.DeudaTienda || data.deudaTienda || 0,
          ocultarDelLeaderboard: data.OcultarDelLeaderboard || data.ocultarDelLeaderboard || false,
          ocultarGamerCard: data.OcultarGamerCard || data.ocultarGamerCard || false,
          deshabilitarSolicitudes: data.DeshabilitarSolicitudes || data.deshabilitarSolicitudes || false,
          estatus: data.Estatus || data.estatus || 'Activo'
        };
        setRachaVisible(data.RachaActual || data.rachaActual || 0);
        usernameOriginalRef.current = usernameCargado.toLowerCase();
        setUsernameEstado('current');
        setForm(datosCargados);
        // Si la cuenta llega congelada y el usuario no pidió una pestaña concreta, lo llevamos a Cuenta (Descongelar)
        if ((data.Estatus || data.estatus) === 'TemporalmenteInactivo' && !hashInicialRef.current) {
          setTabActiva('cuenta');
        }
        calcularProgreso(datosCargados);
        
        // Sync local storage
        const current = JSON.parse(localStorage.getItem('usuario'));
        if (current) {
          current.estatus = data.Estatus || data.estatus || 'Activo';
          localStorage.setItem('usuario', JSON.stringify(current));
        }
      }
    } catch (error) { console.error('Error:', error); }
    finally { setLoading(false); }
  }

  async function cargarDatosPRs(idBox, idUsuario) {
    try {
      const [resEjercicios, resMarcas] = await Promise.all([
        fetch(`${API_BASE}/marcaspersonales/ejercicios-olimpicos/${idBox}`),
        fetch(`${API_BASE}/marcaspersonales/usuario/${idUsuario}`)
      ]);
      if (resEjercicios.ok) setEjerciciosOlimpicos(await resEjercicios.json());
      if (resMarcas.ok) {
        const data = await resMarcas.json();
        setRecordsMaximos(data.recordsMaximos);
        setHistorialCompleto(data.historialCompleto);
        // Al (re)cargar, dejamos los tres selectores apuntando al primer récord para que
        // "Mi Progresión", "Registrar Nuevo PR" y la "Calculadora" no aparezcan vacíos al volver.
        if (data.recordsMaximos.length > 0) {
          const primero = data.recordsMaximos[0];
          setGraficaEjercicioId(primero.idEjercicio);
          setFormMarca(prev => ({ ...prev, idEjercicio: primero.idEjercicio.toString() }));
          setPrParaCalcular(primero.idMarca.toString());
        }
      }
    } catch (error) { console.error('Error al cargar PRs:', error); }
  }

  // Carga mi conteo de likes de perfil + el resumen de reacciones de mis PRs
  async function cargarSocialMine(idUsuario) {
    const token = localStorage.getItem('token');
    const auth = { 'Authorization': `Bearer ${token}` };
    try {
      const [resLikes, resResumen] = await Promise.all([
        fetch(`${API_BASE}/interacciones/like-perfil/${idUsuario}/estado`, { headers: auth }),
        fetch(`${API_BASE}/interacciones/usuario/${idUsuario}/reacciones-resumen`, { headers: auth }),
      ]);
      if (resLikes.ok) { const d = await resLikes.json(); setMisLikes(d.totalLikes || 0); }
      if (resResumen.ok) {
        const arr = await resResumen.json();
        setMisReaccionesResumen(Object.fromEntries(arr.map(r => [r.idMarca, r])));
      }
    } catch (e) { console.error('Error social:', e); }
  }

  async function abrirModalLikes() {
    const idUsuario = userAuth?.id || userAuth?.idUsuario;
    setModalSocial({ tipo: 'likes', titulo: 'Likes a tu perfil', items: [], cargando: true });
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/interacciones/like-perfil/${idUsuario}/lista`, { headers: { 'Authorization': `Bearer ${token}` } });
      const items = res.ok ? await res.json() : [];
      setModalSocial({ tipo: 'likes', titulo: 'Likes a tu perfil', items, cargando: false });
    } catch (e) { setModalSocial(m => (m ? { ...m, cargando: false } : null)); }
  }

  async function abrirModalReacciones(pr) {
    const titulo = `Reacciones · ${pr.nombreEjercicio}`;
    setModalSocial({ tipo: 'reacciones', titulo, items: [], cargando: true });
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/interacciones/marca/${pr.idMarca}/reacciones`, { headers: { 'Authorization': `Bearer ${token}` } });
      const items = res.ok ? await res.json() : [];
      setModalSocial({ tipo: 'reacciones', titulo, items, cargando: false });
    } catch (e) { setModalSocial(m => (m ? { ...m, cargando: false } : null)); }
  }

  const calcularEdad = (fechaStr) => {
    if (!fechaStr) return '';
    const hoy = new Date();
    const cumple = new Date(fechaStr);
    let edad = hoy.getFullYear() - cumple.getFullYear();
    const m = hoy.getMonth() - cumple.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < cumple.getDate())) edad--;
    return edad;
  };

  const calcularProgreso = (datos) => {
    const camposClave = ['nombre', 'telefono', 'peso', 'tipoDeSangre', 'apodo', 'movimientoFavorito'];
    const llenos = camposClave.filter(c => datos[c] && datos[c].toString().trim() !== '').length;
    setProgreso(Math.round((llenos / camposClave.length) * 100));
  };

  const guardarFotoInmediata = async (base64Foto) => {
    const fotoAnterior = form.foto; // para revertir si falla la red
    try {
      const payload = {
        ...form, foto: base64Foto,
        peso: form.peso ? parseFloat(form.peso) : null,
        fechaNacimiento: form.fechaNacimiento ? new Date(form.fechaNacimiento).toISOString() : null
      };
      const res = await fetch(`${USUARIOS_ENDPOINT}/${userAuth.id || userAuth.idUsuario}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      if (res.ok) {
        // El avatar de la pantalla ya se pintó de forma optimista en onCropComplete (setForm).
        // Actualizamos el AuthContext para que el navbar (y el selector de cuentas) se
        // refresquen al instante, sin recargar la página (evita el flash feo).
        actualizarUsuario({ foto: base64Foto });
      } else {
        setForm(prev => ({ ...prev, foto: fotoAnterior })); // revertir
        triggerAlert({
          title: 'Error de Foto',
          message: 'Hubo un error al guardar la foto en la base de datos.',
          type: 'error'
        });
      }
    } catch (err) {
      setForm(prev => ({ ...prev, foto: fotoAnterior })); // revertir
      triggerAlert({
        title: 'Error de Conexión',
        message: 'Error de conexión al guardar la foto.',
        type: 'error'
      });
    }
  };

  const handleSubirFoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      triggerAlert({
        title: 'Archivo Muy Grande',
        message: 'La imagen es muy pesada. El tamaño máximo es 10MB.',
        type: 'error'
      });
      return;
    }
    setImageToCrop(URL.createObjectURL(file));
    e.target.value = '';
  };

  // Guardado automático y optimista de los switches de privacidad.
  // Pinta el cambio al instante, persiste SOLO ese campo en 2.º plano (PUT parcial)
  // y revierte si la red falla. No usa "Guardar Player Card".
  async function togglePrivacidad(campo, valor) {
    if (form.estatus === 'TemporalmenteInactivo') {
      triggerAlert({
        title: 'Cuenta congelada',
        message: 'Descongela tu cuenta para cambiar tu configuración de privacidad.',
        type: 'error'
      });
      return;
    }
    const anterior = form[campo];
    setForm(prev => ({ ...prev, [campo]: valor })); // UI optimista: se pinta al instante
    try {
      const res = await fetch(`${USUARIOS_ENDPOINT}/${userAuth.id || userAuth.idUsuario}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [campo]: valor })
      });
      if (!res.ok) throw new Error('save_failed');
    } catch {
      setForm(prev => ({ ...prev, [campo]: anterior })); // revertir si falla
      triggerAlert({
        title: 'No se pudo guardar',
        message: 'No se pudo actualizar tu privacidad. Revisa tu conexión e inténtalo de nuevo.',
        type: 'error'
      });
    }
  }

  async function handleGuardarExpediente(e) {
    e.preventDefault();

    // No permitir guardar con un nombre de usuario inválido o ya ocupado
    if (usernameEstado === 'taken') {
      triggerAlert({ title: 'Usuario no disponible', message: 'Ese nombre de usuario ya está ocupado. Elige otro.', type: 'error' });
      return;
    }
    if (usernameEstado === 'invalid') {
      triggerAlert({ title: 'Usuario inválido', message: 'El nombre de usuario solo admite letras, números, punto, guión y guión bajo.', type: 'error' });
      return;
    }
    if (usernameEstado === 'short') {
      triggerAlert({ title: 'Usuario muy corto', message: 'El nombre de usuario debe tener al menos 3 caracteres.', type: 'error' });
      return;
    }

    const payload = {
      ...form,
      peso: form.peso ? parseFloat(form.peso) : null,
      fechaNacimiento: form.fechaNacimiento ? new Date(form.fechaNacimiento).toISOString() : null
    };
    try {
      const res = await fetch(`${USUARIOS_ENDPOINT}/${userAuth.id || userAuth.idUsuario}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      if (res.ok) {
        calcularProgreso(form);
        const current = JSON.parse(localStorage.getItem('usuario'));
        if (current) {
          current.nombre = form.nombre;
          current.apodo = form.apodo;
          current.username = form.username;
          current.estadoDelDia = form.estadoDelDia;
          current.categoriaBase = form.categoriaBase;
          current.nivelGamer = form.nivelGamer;
          current.estatus = form.estatus;
          if (form.foto) current.foto = form.foto;
          localStorage.setItem('usuario', JSON.stringify(current));
        }
        // Toast en la esquina superior derecha (GlobalAlertBridge intercepta window.alert),
        // en vez del modal central. El mensaje contiene "actualizada" → toast verde de éxito.
        alert('¡Player Card actualizada con éxito!');
        // Refrescamos los datos desde el servidor en sitio (sin window.location.reload),
        // así el usuario se queda en la misma pestaña y posición de scroll.
        fetchExpediente(userAuth.id || userAuth.idUsuario);
      } else {
        triggerAlert({
          title: 'Error de Guardado',
          message: 'Hubo un error al guardar los datos.',
          type: 'error'
        });
      }
    } catch (err) {
      triggerAlert({
        title: 'Error de Conexión',
        message: 'Error de conexión al guardar los datos.',
        type: 'error'
      });
    }
  }

  async function handleGuardarPR(e) {
    e.preventDefault();
    if (!formMarca.idEjercicio || !formMarca.valor) return;
    setGuardandoPR(true);
    try {
      const payload = {
        idUsuario: userAuth.id || userAuth.idUsuario,
        idEjercicio: parseInt(formMarca.idEjercicio),
        valor: parseFloat(formMarca.valor),
        unidad: formMarca.unidad
      };
      const res = await fetch(`${API_BASE}/marcaspersonales`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      if (res.ok) {
        alert('¡PR registrado con éxito!');
        setFormMarca({ idEjercicio: '', valor: '', unidad: 'lbs' });
        cargarDatosPRs(JSON.parse(localStorage.getItem('box')).idBox, userAuth.id || userAuth.idUsuario);
      }
    } catch (err) {
      triggerAlert({
        title: 'Error al Guardar',
        message: 'Error al guardar el PR.',
        type: 'error'
      });
    } finally {
      setGuardandoPR(false);
    }
  }

  // Al elegir un ejercicio en "Mi Progresión", lo replicamos automáticamente en
  // "Registrar Nuevo PR" (mismo idEjercicio) y en "Calculadora de Porcentajes"
  // (que se indexa por idMarca → buscamos el récord de ese ejercicio).
  function seleccionarEjercicioProgresion(v) {
    const idEjercicio = parseInt(v);
    setGraficaEjercicioId(idEjercicio);
    setFormMarca(prev => ({ ...prev, idEjercicio: v }));
    const marca = recordsMaximos.find(r => r.idEjercicio === idEjercicio);
    if (marca) setPrParaCalcular(marca.idMarca.toString());
  }

  async function handleCambiarContrasena(e) {
    e.preventDefault();
    if (passForm.nuevaContrasena !== passForm.confirmarContrasena) {
      triggerAlert({
        title: 'Contraseñas No Coinciden',
        message: 'Las contraseñas no coinciden.',
        type: 'error'
      });
      return;
    }
    if (passForm.nuevaContrasena.length < 8) {
      triggerAlert({
        title: 'Contraseña Muy Corta',
        message: 'Mínimo 8 caracteres.',
        type: 'error'
      });
      return;
    }
    try {
      const res = await fetch(`${USUARIOS_ENDPOINT}/${userAuth.id || userAuth.idUsuario}/password`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contrasenaActual: passForm.contrasenaActual, nuevaContrasena: passForm.nuevaContrasena })
      });
      if (res.ok) {
        triggerAlert({
          title: '¡Actualizado!',
          message: '¡Contraseña actualizada con éxito!',
          type: 'success'
        });
        setPassForm({ contrasenaActual: '', nuevaContrasena: '', confirmarContrasena: '' });
      } else {
        const err = await res.json();
        triggerAlert({
          title: 'Error de Actualización',
          message: err.mensaje || 'Error al cambiar la contraseña.',
          type: 'error'
        });
      }
    } catch (err) {
      triggerAlert({
        title: 'Error de Conexión',
        message: 'Error de conexión al cambiar la contraseña.',
        type: 'error'
      });
    }
  }

  async function ejecutarCongelarCuenta() {
    setFreezing(true);
    try {
      const res = await fetch(`${USUARIOS_ENDPOINT}/${userAuth.id || userAuth.idUsuario}/dar-de-baja-temporal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ contrasenaConfirmacion: freezePassword })
      });
      if (res.ok) {
        const updatedUser = await res.json();
        const current = JSON.parse(localStorage.getItem('usuario'));
        if (current) {
          current.estatus = 'TemporalmenteInactivo';
          localStorage.setItem('usuario', JSON.stringify(current));
        }
        setFreezePassword('');
        triggerAlert({
          title: '¡Cuenta Congelada! ❄️',
          message: 'Tu cuenta ha sido congelada con éxito. La renovación automática de tu membresía se ha pausado y tus reservas activas han sido canceladas.',
          type: 'success'
        });
        fetchExpediente(userAuth.id || userAuth.idUsuario);
      } else {
        const err = await res.json();
        triggerAlert({
          title: 'Error de Solicitud',
          message: err.mensaje || 'Hubo un error al congelar la cuenta. Por favor verifica tus credenciales.',
          type: 'error'
        });
      }
    } catch (err) {
      triggerAlert({
        title: 'Error de Conexión',
        message: 'No se pudo establecer comunicación con el servidor. Verifica tu conexión a internet.',
        type: 'error'
      });
    } finally {
      setFreezing(false);
    }
  }

  function handleCongelarCuenta(e) {
    e.preventDefault();
    if (!freezePassword.trim()) {
      triggerAlert({
        title: 'Contraseña Requerida',
        message: 'Por favor, ingresa tu contraseña para autorizar la congelación de tu cuenta.',
        type: 'info'
      });
      return;
    }
    triggerConfirm({
      title: '¿Confirmar Baja Temporal?',
      message: '¿Estás seguro de que deseas congelar tu cuenta temporalmente? Tus reservas y la renovación automática de tu membresía se pausarán de inmediato.',
      type: 'freeze',
      onConfirm: ejecutarCongelarCuenta
    });
  }

  async function handleDescongelarCuenta(e) {
    e.preventDefault();
    if (!unfreezePassword.trim()) {
      triggerAlert({
        title: 'Contraseña Requerida',
        message: 'Por favor, ingresa tu contraseña para descongelar tu cuenta.',
        type: 'info'
      });
      return;
    }
    setUnfreezing(true);
    try {
      const res = await fetch(`${USUARIOS_ENDPOINT}/${userAuth.id || userAuth.idUsuario}/descongelar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ contrasenaConfirmacion: unfreezePassword })
      });
      if (res.ok) {
        const updatedUser = await res.json();
        const current = JSON.parse(localStorage.getItem('usuario'));
        if (current) {
          current.estatus = 'Activo';
          localStorage.setItem('usuario', JSON.stringify(current));
        }
        setUnfreezePassword('');
        triggerAlert({
          title: '¡Bienvenido de Vuelta!',
          message: 'Tu cuenta ha sido descongelada y reactivada con éxito. ¡Ya puedes disfrutar de todos los servicios del Box!',
          type: 'success'
        });
        fetchExpediente(userAuth.id || userAuth.idUsuario);
      } else {
        const err = await res.json();
        triggerAlert({
          title: 'Error de Reactivación',
          message: err.mensaje || 'Error al descongelar la cuenta. Por favor verifica tu contraseña.',
          type: 'error'
        });
      }
    } catch (err) {
      triggerAlert({
        title: 'Error de Conexión',
        message: 'No se pudo conectar con el servidor. Por favor verifica tu conexión a internet.',
        type: 'error'
      });
    } finally {
      setUnfreezing(false);
    }
  }

  async function ejecutarEliminarCuenta() {
    setDeleting(true);
    try {
      const res = await fetch(`${USUARIOS_ENDPOINT}/${userAuth.id || userAuth.idUsuario}/dar-de-baja-permanente`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ contrasenaConfirmacion: deletePassword })
      });
      if (res.ok) {
        triggerAlert({
          title: 'Cuenta Eliminada',
          message: 'Tu cuenta ha sido eliminada permanentemente del sistema de manera exitosa. Agradecemos enormemente tu tiempo en nuestra comunidad.',
          type: 'success',
          onConfirm: () => {
            localStorage.removeItem('usuario');
            localStorage.removeItem('token');
            localStorage.removeItem('box');
            navigate('/login');
          }
        });
      } else {
        const err = await res.json();
        triggerAlert({
          title: 'Error de Eliminación',
          message: err.mensaje || 'Hubo un error al eliminar tu cuenta. Por favor verifica tu contraseña.',
          type: 'error'
        });
      }
    } catch (err) {
      triggerAlert({
        title: 'Error de Conexión',
        message: 'No se pudo establecer comunicación con el servidor. Verifica tu conexión a internet.',
        type: 'error'
      });
    } finally {
      setDeleting(false);
    }
  }

  function handleEliminarCuenta(e) {
    e.preventDefault();
    if (!deletePassword.trim()) {
      triggerAlert({
        title: 'Contraseña Requerida',
        message: 'Por favor, ingresa tu contraseña para confirmar esta acción irreversible.',
        type: 'error'
      });
      return;
    }
    triggerConfirm({
      title: '🚨 ADVERTENCIA CRÍTICA',
      message: '¿Estás completamente seguro de que deseas eliminar permanentemente tu cuenta? Todos tus datos, scores y marcas se borrarán en cascada. Esta acción es irreversible.',
      type: 'delete',
      onConfirm: ejecutarEliminarCuenta
    });
  }

  if (loading) return (
    <div className="mp-loading"><AtletifyLoader /></div>
  );

  const usernameHint = (() => {
    switch (usernameEstado) {
      case 'checking':  return { icon: 'fa-circle-notch fa-spin', text: 'Verificando disponibilidad...',                       clase: 'mp-username-hint mp-username-hint--check' };
      case 'available': return { icon: 'fa-check-circle',          text: '¡Nombre de usuario disponible!',                      clase: 'mp-username-hint mp-username-hint--ok' };
      case 'taken':     return { icon: 'fa-times-circle',          text: 'Este nombre de usuario ya está ocupado',              clase: 'mp-username-hint mp-username-hint--err' };
      case 'short':     return { icon: 'fa-exclamation-circle',    text: 'Mínimo 3 caracteres',                                 clase: 'mp-username-hint mp-username-hint--warn' };
      case 'invalid':   return { icon: 'fa-exclamation-circle',    text: 'Solo letras, números, punto, guión y guión bajo',     clase: 'mp-username-hint mp-username-hint--warn' };
      default:          return null;
    }
  })();

  const usernameBorderColor =
    usernameEstado === 'available' ? '#22c55e' :
    usernameEstado === 'taken' || usernameEstado === 'invalid' ? '#ef4444' :
    usernameEstado === 'short' || usernameEstado === 'checking' ? '#f59e0b' :
    '';

  return (
    <>
      <div className="mp-page">

        {/* HEADER */}
        <header className="mp-header">
          <BackButton to="/user-panel" />
          <div>
            <h1 className="mp-header-title">Player <span>Card</span></h1>
            <p className="mp-header-sub">Gestiona tu perfil y estadísticas</p>
          </div>
        </header>

        <div className="mp-content">

          {form.estatus === 'TemporalmenteInactivo' && (
            <div className="mp-frozen-banner">
              <i className="fas fa-snowflake" />
              <div className="mp-frozen-banner-content">
                <h4 className="mp-frozen-banner-title">Cuenta Congelada</h4>
                <p className="mp-frozen-banner-text">
                  Tu cuenta está inactiva temporalmente. Todos tus datos y marcas están a salvo, pero no podrás reservar clases, registrar PRs o modificar tu información hasta que la descongeles. La renovación automática de tu membresía ha sido desactivada. Reactívala usando tu contraseña en la pestaña Cuenta.
                </p>
              </div>
            </div>
          )}

          {/* HERO */}
          <div className="mp-hero">
            <div className="mp-hero-body">
              <div className="mp-avatar-wrap">
                <div className="mp-hero-avatar">
                  {form.foto
                    ? <img src={form.foto} alt="Avatar" />
                    : (form.nombre ? form.nombre.charAt(0).toUpperCase() : 'W')}
                  <span className="mp-hero-level-badge">LVL: {formatNivelGamer(form.nivelGamer)}</span>
                </div>
                <input type="file" id="fotoUpload" accept="image/*" style={{ display: 'none' }} onChange={handleSubirFoto} disabled={form.estatus === 'TemporalmenteInactivo'} />
                <label htmlFor="fotoUpload" className={`mp-foto-btn ${form.estatus === 'TemporalmenteInactivo' ? 'mp-foto-btn-frozen' : ''}`}>
                  <i className="fas fa-camera" /> Cambiar
                </label>
              </div>

              <div className="mp-hero-info">
                <h2 className="mp-hero-name">{[form.nombre, form.apellidos].filter(Boolean).join(' ') || form.apodo || 'Atleta'}</h2>
                <p className="mp-hero-realname">{form.apodo ? `"${form.apodo}"` : (form.username ? `@${form.username}` : '')}</p>
                <div className="mp-hero-badges">
                  <button type="button" className="mp-hero-badge mp-hero-badge--likes" onClick={abrirModalLikes}>
                    <i className="fas fa-heart" /> {misLikes} {misLikes === 1 ? 'like' : 'likes'}
                  </button>
                  <span className="mp-hero-badge mp-hero-badge--racha">
                    <i className="fas fa-fire" /> Racha: {rachaVisible} días
                  </span>
                  <span className="mp-hero-badge">{form.estadoDelDia}</span>
                  {(form.esDeConfianza || deudaReal > 0) && (
                    <span className="mp-hero-badge mp-hero-badge--deuda">
                      <i className="fas fa-handshake" /> Deuda: ${deudaReal.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="mp-progress-bar-wrap">
              <span className="mp-progress-label">Perfil {progreso}%</span>
              <div className="mp-progress-track">
                <div className="mp-progress-fill" style={{ width: `${progreso}%` }} />
              </div>
            </div>
          </div>

          {/* BARRA DE PESTAÑAS */}
          <nav className="mp-tabbar" role="tablist" aria-label="Secciones de Player Card">
            {TABS.map((t, idx) => {
              const activa = tabActiva === t.key;
              const badge = t.key === 'records' && recordsMaximos.length > 0 ? recordsMaximos.length : null;
              const congelada = t.key === 'cuenta' && form.estatus === 'TemporalmenteInactivo';
              return (
                <button
                  key={t.key}
                  ref={el => (tabRefs.current[t.key] = el)}
                  type="button"
                  role="tab"
                  id={`mp-tab-${t.key}`}
                  aria-selected={activa}
                  aria-controls={`mp-panel-${t.key}`}
                  tabIndex={activa ? 0 : -1}
                  className={`mp-tabcard ${activa ? 'mp-tabcard--active' : ''}`}
                  onClick={() => setTabActiva(t.key)}
                  onKeyDown={e => onTabKey(e, idx)}
                >
                  <i className={`fas ${t.icon}`} aria-hidden="true" />
                  {congelada && <i className="fas fa-snowflake mp-tabcard-frozen-dot" aria-hidden="true" />}
                  <span className="mp-tabcard-label">{t.label}</span>
                  {badge !== null && <span className="mp-tabcard-badge">{badge}</span>}
                </button>
              );
            })}
          </nav>

          {/* ══ PANEL: PERFIL ══ */}
          {tabActiva === 'perfil' && (
          <div id="mp-panel-perfil" role="tabpanel" aria-labelledby="mp-tab-perfil" className="mp-tab-panel">
            <div className={`mp-card ${form.estatus === 'TemporalmenteInactivo' ? 'mp-form-frozen' : ''}`}>
              <div className="mp-card-body-lg">
                <form onSubmit={handleGuardarExpediente}>

                  {/* Identidad Wolfpack */}
                  <h5 className="mp-section-title">
                    <i className="fas fa-gamepad" /> Identidad Wolfpack
                  </h5>
                  <div className="row g-3 mb-4">
                    <div className="col-md-6">
                      <label className="mp-label">Gamertag (Apodo)</label>
                      <input type="text" className="mp-input" placeholder="Ej: La Bestia, Flash..." value={form.apodo} onChange={e => setForm({ ...form, apodo: e.target.value })} />
                    </div>
                    <div className="col-md-6">
                      <label className="mp-label">Estado de Hoy</label>
                      <EstadoDelDiaPicker valor={form.estadoDelDia} onCambiar={v => setForm({ ...form, estadoDelDia: v })} />
                    </div>
                    <div className="col-md-6">
                      <label className="mp-label">Nivel Gamer (LVL)</label>
                      <NivelGamerPicker valor={form.nivelGamer} onCambiar={v => setForm({ ...form, nivelGamer: v })} />
                    </div>
                    <div className="col-md-6">
                      <label className="mp-label">Coach Favorito</label>
                      <input type="text" className="mp-input" placeholder="Ej: Coach Sandra" value={form.coachFavorito} onChange={e => setForm({ ...form, coachFavorito: e.target.value })} />
                    </div>
                    <div className="col-md-6">
                      <label className="mp-label">Movimiento Favorito</label>
                      <input type="text" className="mp-input" value={form.movimientoFavorito} onChange={e => setForm({ ...form, movimientoFavorito: e.target.value })} />
                    </div>
                    <div className="col-md-6">
                      <label className="mp-label">Movimiento Odiado</label>
                      <input type="text" className="mp-input" value={form.movimientoOdiado} onChange={e => setForm({ ...form, movimientoOdiado: e.target.value })} />
                    </div>
                  </div>

                  {/* Datos Reales */}
                  <h5 className="mp-section-title">
                    <i className="fas fa-id-card" /> Datos Reales
                  </h5>
                  <div className="row g-3 mb-4">
                    <div className="col-12">
                      <label className="mp-label">Nombre de Usuario (alias único)</label>
                      <div className="mp-username-wrap">
                        <input
                          type="text"
                          className="mp-input mp-username-input"
                          autoComplete="username"
                          placeholder="Tu alias para iniciar sesión"
                          value={form.username}
                          onChange={e => setForm({ ...form, username: e.target.value.replace(/\s+/g, '').replace(/[^a-zA-Z0-9._-]/g, '') })}
                          style={usernameBorderColor ? { borderColor: usernameBorderColor } : undefined}
                        />
                        {usernameEstado !== 'idle' && usernameEstado !== 'current' && (
                          <span className={`mp-username-indicator mp-username-indicator--${usernameEstado}`}>
                            <i className={`fas ${
                              usernameEstado === 'checking'  ? 'fa-circle-notch fa-spin' :
                              usernameEstado === 'available' ? 'fa-check-circle' :
                              usernameEstado === 'taken' || usernameEstado === 'invalid' ? 'fa-times-circle' :
                              'fa-exclamation-circle'
                            }`} />
                          </span>
                        )}
                      </div>
                      {usernameHint && (
                        <p className={usernameHint.clase}>
                          <i className={`fas ${usernameHint.icon}`} /> {usernameHint.text}
                        </p>
                      )}
                    </div>
                    <div className="col-md-6">
                      <label className="mp-label">Nombre Completo</label>
                      <input type="text" className="mp-input" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} required />
                    </div>
                    <div className="col-md-6">
                      <label className="mp-label">Apellidos</label>
                      <input type="text" className="mp-input" value={form.apellidos} onChange={e => setForm({ ...form, apellidos: e.target.value })} />
                    </div>
                    <div className="col-md-6">
                      <label className="mp-label">Teléfono (WhatsApp)</label>
                      <input type="tel" className="mp-input" placeholder="10 dígitos" maxLength={10} value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value.replace(/\D/g, '').slice(0, 10) })} />
                    </div>
                    <div className="col-md-6">
                      <label className="mp-label">Género (Competencia)</label>
                      <GeneroPicker valor={form.genero} onCambiar={v => setForm({ ...form, genero: v })} />
                    </div>
                    <div className="col-md-6">
                      <label className="mp-label">
                        Fecha Nacimiento
                        {form.fechaNacimiento && (
                          <span style={{ color: 'var(--accent)', fontStyle: 'italic', marginLeft: '0.5rem', fontFamily: 'var(--font-stats)' }}>
                            ({calcularEdad(form.fechaNacimiento)} años)
                          </span>
                        )}
                      </label>
                      <button
                        type="button"
                        className={`mp-date-trigger${!form.fechaNacimiento ? ' mp-date-trigger--empty' : ''}`}
                        onClick={() => setMostrarDatePicker(true)}
                      >
                        <i className="fas fa-calendar-alt" />
                        {form.fechaNacimiento
                          ? new Date(form.fechaNacimiento + 'T12:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })
                          : 'Seleccionar fecha de nacimiento...'}
                      </button>
                    </div>
                  </div>

                  {/* Perfil Físico y Deportivo */}
                  <h5 className="mp-section-title">
                    <i className="fas fa-dumbbell" /> Perfil Físico y Deportivo
                  </h5>
                  <div className="row g-3 mb-4">
                    <div className="col-12">
                      <label className="mp-label">Objetivo Principal</label>
                      <ObjetivoPicker valor={form.objetivo} onCambiar={v => setForm({ ...form, objetivo: v })} />
                    </div>
                    <div className="col-md-4">
                      <label className="mp-label">Peso (kg/lbs)</label>
                      <input type="number" step="0.1" className="mp-input" value={form.peso} onChange={e => setForm({ ...form, peso: e.target.value })} />
                    </div>
                    <div className="col-md-4">
                      <label className="mp-label">Talla de Playera</label>
                      <TallaPlayeraPicker valor={form.tallaPlayera} onCambiar={v => setForm({ ...form, tallaPlayera: v })} />
                    </div>
                    <div className="col-md-4">
                      <label className="mp-label">Nivel Actual</label>
                      <CategoriaBasePicker valor={form.categoriaBase} onCambiar={v => setForm({ ...form, categoriaBase: v })} />
                    </div>
                    <div className="col-12">
                      <div className="form-check form-switch d-flex align-items-center gap-2 mt-1">
                        <input className="form-check-input" type="checkbox" role="switch" style={{ width: '40px', height: '20px' }} checked={form.tieneExperiencia} onChange={e => setForm({ ...form, tieneExperiencia: e.target.checked })} />
                        <label className="mp-switch-label ms-2">¿Tienes experiencia previa haciendo ejercicio?</label>
                      </div>
                    </div>
                    {form.tieneExperiencia && (
                      <div className="col-12">
                        <label className="mp-label">¿Qué deportes has practicado?</label>
                        <input type="text" className="mp-input" placeholder="Ej. Fútbol, CrossFit, Natación..." value={form.deporteExperiencia} onChange={e => setForm({ ...form, deporteExperiencia: e.target.value })} />
                      </div>
                    )}
                  </div>

                  {/* Expediente Médico */}
                  <h5 className="mp-section-title mp-section-title--medical">
                    <i className="fas fa-heartbeat" /> Expediente Médico
                  </h5>
                  <p className="mp-medical-note">
                    <i className="fas fa-lock" /> Esta información solo será visible para el equipo de Coaches en el Directorio.
                  </p>
                  <div className="row g-3 mb-4">
                    <div className="col-md-4">
                      <label className="mp-label">Tipo de Sangre</label>
                      <TipoSangrePicker valor={form.tipoDeSangre} onCambiar={v => setForm({ ...form, tipoDeSangre: v })} />
                    </div>
                    <div className="col-md-8">
                      <label className="mp-label">Lesiones, cirugías o enfermedades crónicas</label>
                      <input type="text" className="mp-input mp-input--medical" placeholder="Ej. Asma, hernia discal... (Déjalo en blanco si no aplica)" value={form.tieneDiscapacidad} onChange={e => setForm({ ...form, tieneDiscapacidad: e.target.value })} />
                    </div>
                  </div>

                  {/* Privacidad y Comunidad */}
                  <h5 className="mp-section-title mt-4">
                    <i className="fas fa-shield-alt" /> Privacidad y Comunidad
                  </h5>
                  <p className="mp-medical-note">
                    <i className="fas fa-eye-slash" /> Configura quién puede ver tu perfil y estadísticas.
                  </p>
                  <div className="row g-3 mb-4">
                    <div className="col-12">
                      <div className="form-check form-switch d-flex align-items-center gap-2">
                        <input className="form-check-input" type="checkbox" role="switch" style={{ width: '40px', height: '20px' }} checked={form.ocultarDelLeaderboard} onChange={e => togglePrivacidad('ocultarDelLeaderboard', e.target.checked)} />
                        <div>
                          <label className="mp-switch-label ms-2 d-block mb-0">Ocultar del Leaderboard</label>
                          <small className="text-secondary ms-2 mp-switch-desc">Tus scores no aparecerán en el Top del día, pero tu coach sí podrá verlos.</small>
                        </div>
                      </div>
                    </div>
                    <div className="col-12">
                      <div className="form-check form-switch d-flex align-items-center gap-2">
                        <input className="form-check-input" type="checkbox" role="switch" style={{ width: '40px', height: '20px' }} checked={form.ocultarGamerCard} onChange={e => togglePrivacidad('ocultarGamerCard', e.target.checked)} />
                        <div>
                          <label className="mp-switch-label ms-2 d-block mb-0">Ocultar Gamer Card (Modo Fantasma)</label>
                          <small className="text-secondary ms-2 mp-switch-desc">Ocultar tu perfil del directorio de la comunidad. Nadie podrá ver tus PRs ni Nivel Gamer.</small>
                        </div>
                      </div>
                    </div>
                    <div className="col-12">
                      <div className="form-check form-switch d-flex align-items-center gap-2">
                        <input className="form-check-input" type="checkbox" role="switch" style={{ width: '40px', height: '20px' }} checked={form.deshabilitarSolicitudes} onChange={e => togglePrivacidad('deshabilitarSolicitudes', e.target.checked)} />
                        <div>
                          <label className="mp-switch-label ms-2 d-block mb-0">No recibir solicitudes de amistad</label>
                          <small className="text-secondary ms-2 mp-switch-desc">Otros atletas no podrán enviarte solicitudes para añadirte a su comunidad.</small>
                        </div>
                      </div>
                    </div>
                  </div>

                  <BotonSeguro
                    type="submit"
                    className="mp-btn-save"
                    textoProcesando={<><i className="fas fa-spinner fa-spin" /> Guardando...</>}
                    disabled={form.estatus === 'TemporalmenteInactivo' || ['taken', 'invalid', 'short', 'checking'].includes(usernameEstado)}
                  >
                    <i className="fas fa-save" /> Guardar Player Card
                  </BotonSeguro>
                </form>
              </div>
            </div>
          </div>
          )}

          {/* ══ PANEL: RÉCORDS ══ */}
          {tabActiva === 'records' && (
          <div id="mp-panel-records" role="tabpanel" aria-labelledby="mp-tab-records" className="mp-tab-panel">
            <div className={`mp-card ${form.estatus === 'TemporalmenteInactivo' ? 'mp-form-frozen' : ''}`}>
              <div className="mp-card-body-lg">

                  {/* PRs */}
                  <h5 className="mp-section-title">
                    <i className="fas fa-trophy" /> Mis Récords Personales (PRs)
                  </h5>

                  {/* Tarjetas de récords */}
                  <div className="mb-3">
                    {recordsMaximos.length === 0 ? (
                      <div className="mp-pr-empty">
                        <i className="fas fa-dumbbell" />
                        <p>Aún no tienes marcas registradas. ¡Sube tu primer PR!</p>
                      </div>
                    ) : (
                      <div className="mp-pr-scroll">
                        {recordsMaximos.map(pr => {
                          const reac = misReaccionesResumen[pr.idMarca];
                          const tieneReac = reac?.total > 0;
                          return (
                            <div
                              key={pr.idMarca}
                              className={`mp-pr-card ${tieneReac ? 'mp-pr-card--clickable' : ''}`}
                              onClick={tieneReac ? () => abrirModalReacciones(pr) : undefined}
                              title={tieneReac ? 'Ver quién reaccionó' : undefined}
                            >
                              <span className="mp-pr-card-name">{pr.nombreEjercicio}</span>
                              <p className="mp-pr-card-value">
                                {pr.valor} <span className="mp-pr-card-unit">{pr.unidad}</span>
                              </p>
                              <span className="mp-pr-card-date">
                                {new Date(pr.fechaLogro).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: '2-digit' })}
                              </span>
                              {tieneReac && (
                                <div className="mp-pr-card-reacc">
                                  {reac.conteos.map(c => (
                                    <span key={c.emoji} className="mp-pr-rcount">{c.emoji} {c.count}</span>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Gráfica de progresión */}
                  {recordsMaximos.length > 0 && (
                    <div className="mp-chart-wrap">
                      <div className="mp-chart-header">
                        <span className="mp-section-title" style={{ margin: 0 }}>
                          <i className="fas fa-chart-line" /> Mi Progresión
                        </span>
                        <EjercicioOlimpicoPicker
                          ejercicios={recordsMaximos.map(p => ({ idEjercicio: p.idEjercicio, nombre: p.nombreEjercicio }))}
                          valor={graficaEjercicioId?.toString()}
                          onCambiar={seleccionarEjercicioProgresion}
                        />
                      </div>

                      {(() => {
                        const historialFiltrado = historialCompleto.filter(h => h.idEjercicio === graficaEjercicioId);
                        if (!historialFiltrado.length) return null;
                        const maxValor = Math.max(...historialFiltrado.map(h => h.valor)) * 1.1;
                        return (
                          <div className="mp-chart-bars">
                            {historialFiltrado.map(hit => {
                              const alturaPct = (hit.valor / maxValor) * 100;
                              const esMax = hit.valor === Math.max(...historialFiltrado.map(h => h.valor));
                              return (
                                <div key={hit.idMarca} className="mp-chart-col">
                                  <span className={`mp-chart-label${esMax ? ' mp-chart-label--max' : ''}`}>{hit.valor}<small className="mp-chart-unit"> {hit.unidad}</small></span>
                                  <div className="mp-chart-bar-track">
                                    <div
                                      className={`mp-chart-bar${esMax ? ' mp-chart-bar--max' : ''}`}
                                      style={{ height: `${alturaPct}%` }}
                                      title={hit.notas || 'Sin notas'}
                                    />
                                  </div>
                                  <span className="mp-chart-date">
                                    {new Date(hit.fechaLogro).toLocaleDateString('es-ES', { month: 'short', year: '2-digit' })}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* Registrar PR */}
                  <div className="mp-pr-form-wrap">
                    <p className="mp-pr-form-title">
                      <i className="fas fa-plus-circle" /> Registrar Nuevo PR
                    </p>
                    <div className="row g-2 align-items-end">
                      <div className="col-12 col-md-5">
                        <label className="mp-label">Movimiento Olímpico</label>
                        <EjercicioOlimpicoPicker ejercicios={ejerciciosOlimpicos} valor={formMarca.idEjercicio} onCambiar={v => setFormMarca({ ...formMarca, idEjercicio: v })} />
                      </div>
                      <div className="col-6 col-md-3">
                        <label className="mp-label">Peso</label>
                        <input type="number" step="0.5" className="mp-input" style={{ textAlign: 'center' }} value={formMarca.valor} onChange={e => setFormMarca({ ...formMarca, valor: e.target.value })} placeholder="0" />
                      </div>
                      <div className="col-6 col-md-2">
                        <label className="mp-label">Unidad</label>
                        <UnidadPesoPicker valor={formMarca.unidad} onCambiar={v => setFormMarca({ ...formMarca, unidad: v })} />
                      </div>
                      <div className="col-12 col-md-2">
                        <BotonSeguro
                          type="button"
                          onClick={handleGuardarPR}
                          disabled={!formMarca.idEjercicio || !formMarca.valor || guardandoPR || form.estatus === 'TemporalmenteInactivo'}
                          className="mp-btn-pr"
                          textoProcesando={<i className="fas fa-spinner fa-spin" />}
                        >
                          <i className="fas fa-save" /><span className="d-md-none ms-2">Guardar PR</span>
                        </BotonSeguro>
                      </div>
                    </div>
                  </div>

                  {/* Calculadora de porcentajes */}
                  {recordsMaximos.length > 0 && (
                    <div className="mp-calc-wrap">
                      <p className="mp-calc-title">
                        <i className="fas fa-calculator" /> Calculadora de Porcentajes
                      </p>
                      <p className="mp-calc-sub">Porcentajes de entrenamiento basados en tu récord máximo histórico.</p>
                      <div className="row g-2">
                        <div className="col-12 col-md-7">
                          <label className="mp-label">Ejercicio</label>
                          <EjercicioOlimpicoPicker
                            ejercicios={recordsMaximos.map(m => ({ idEjercicio: m.idMarca, nombre: `${m.nombreEjercicio} (${m.valor} ${m.unidad})` }))}
                            valor={prParaCalcular?.toString()}
                            onCambiar={v => setPrParaCalcular(v)}
                          />
                        </div>
                        <div className="col-12 col-md-5">
                          <label className="mp-label">Porcentaje</label>
                          <PorcentajePicker
                            valor={pctCalculo}
                            onCambiar={setPctCalculo}
                            calcular={pct => {
                              const m = recordsMaximos.find(r => r.idMarca.toString() === prParaCalcular);
                              if (!m) return '';
                              const r = m.unidad === 'lbs' ? Math.round(m.valor * pct / 100 / 5) * 5 : Math.round(m.valor * pct / 100);
                              return `${r} ${m.unidad}`;
                            }}
                          />
                        </div>
                      </div>

                      {prParaCalcular ? (() => {
                        const marcaObj = recordsMaximos.find(m => m.idMarca.toString() === prParaCalcular);
                        if (!marcaObj) return null;
                        const redondear = (v, u) => u === 'lbs' ? Math.round(v / 5) * 5 : Math.round(v);
                        const resultado = redondear(marcaObj.valor * (pctCalculo / 100), marcaObj.unidad);
                        return (
                          <div className="mp-calc-hero">
                            <span className="mp-calc-hero-pct">{pctCalculo}%</span>
                            <div className="mp-calc-hero-val">
                              {resultado}<span className="mp-calc-hero-unit">{marcaObj.unidad}</span>
                            </div>
                            <p className="mp-calc-hero-sub">
                              {pctCalculo}% de tu récord de {marcaObj.valor} {marcaObj.unidad} en {marcaObj.nombreEjercicio}
                            </p>
                          </div>
                        );
                      })() : (
                        <div className="mp-calc-empty">
                          <i className="fas fa-hand-pointer" />
                          <p>Selecciona un ejercicio para ver tus porcentajes.</p>
                        </div>
                      )}
                    </div>
                  )}

              </div>
            </div>
          </div>
          )}

          {/* ══ PANEL: CUENTA ══ */}
          {tabActiva === 'cuenta' && (
          <div id="mp-panel-cuenta" role="tabpanel" aria-labelledby="mp-tab-cuenta" className="mp-tab-panel">
            <div className="mp-card">
              <div className="mp-card-body">
                {form.estatus === 'TemporalmenteInactivo' ? (
                  /* Formulario Descongelar Cuenta */
                  <form onSubmit={handleDescongelarCuenta}>
                    <h5 className="mp-section-title" style={{ color: '#4fc3f7' }}>
                      <i className="fas fa-snowflake" /> Reactivar Cuenta
                    </h5>
                    <div className="mp-sidebar-alert mp-sidebar-alert--info">
                      Tu cuenta está temporalmente congelada. Ingresa tu contraseña para reactivar tu perfil y restaurar todos tus accesos y reservas al instante.
                    </div>
                    <div className="mb-3">
                      <label className="mp-label">Contraseña de Confirmación</label>
                      <input
                        type="password"
                        className="mp-input"
                        required
                        value={unfreezePassword}
                        onChange={e => setUnfreezePassword(e.target.value)}
                        placeholder="Ingresa tu contraseña"
                      />
                    </div>
                    <BotonSeguro
                      type="submit"
                      className="mp-btn-unfreeze"
                      textoProcesando={<><i className="fas fa-spinner fa-spin" /> Reactivando...</>}
                      disabled={unfreezing || !unfreezePassword.trim()}
                    >
                      <i className="fas fa-bolt" /> Descongelar Cuenta
                    </BotonSeguro>
                  </form>
                ) : (
                  /* Formularios Activos: Cambiar Contraseña, Congelar y Eliminar */
                  <>
                    {/* Cambiar Contraseña */}
                    <form onSubmit={handleCambiarContrasena}>
                      <h5 className="mp-section-title">
                        <i className="fas fa-lock" /> Seguridad
                      </h5>
                      <div className="mb-3">
                        <label className="mp-label">Contraseña Actual</label>
                        <input type="password" className="mp-input" required value={passForm.contrasenaActual} onChange={e => setPassForm({ ...passForm, contrasenaActual: e.target.value })} />
                      </div>
                      <div className="mb-3">
                        <label className="mp-label">Nueva Contraseña</label>
                        <input type="password" className="mp-input" required value={passForm.nuevaContrasena} onChange={e => setPassForm({ ...passForm, nuevaContrasena: e.target.value })} />
                      </div>
                      <div className="mb-3">
                        <label className="mp-label">Confirmar Contraseña</label>
                        <input type="password" className="mp-input" required value={passForm.confirmarContrasena} onChange={e => setPassForm({ ...passForm, confirmarContrasena: e.target.value })} />
                      </div>

                      {(passForm.nuevaContrasena.length > 0 || passForm.confirmarContrasena.length > 0) && (
                        <div className="mb-3">
                          <PasswordRulesHint
                            reglas={reglasPassword}
                            password={passForm.nuevaContrasena}
                            passwordConfirm={passForm.confirmarContrasena}
                          />
                        </div>
                      )}

                      <BotonSeguro
                        type="submit"
                        className="mp-btn-security"
                        textoProcesando={<><i className="fas fa-spinner fa-spin" /> Actualizando...</>}
                        disabled={
                          !reglasPassword.esValida ||
                          passForm.nuevaContrasena !== passForm.confirmarContrasena ||
                          passForm.contrasenaActual.trim().length === 0
                        }
                      >
                        <i className="fas fa-key" /> Actualizar Clave
                      </BotonSeguro>
                    </form>

                    <div className="mp-sidebar-divider" />

                    {/* Acciones de Baja de Cuenta (Colapsables/Dinámicas) */}
                    {seccionActiva === null && (
                      <div className="mp-deactivation-triggers">
                        <button
                          type="button"
                          className="mp-btn-trigger-freeze"
                          onClick={() => setSeccionActiva('congelar')}
                        >
                          <i className="fas fa-snowflake" /> Baja Temporal (Congelar)
                        </button>
                        <button
                          type="button"
                          className="mp-btn-trigger-delete"
                          onClick={() => setSeccionActiva('eliminar')}
                        >
                          <i className="fas fa-trash-alt" /> Baja Permanente (Eliminar)
                        </button>
                      </div>
                    )}

                    {seccionActiva === 'congelar' && (
                      <div className="mp-expanded-section mp-expanded-section--freeze mp-slide-down">
                        <h5 className="mp-section-title" style={{ color: '#4fc3f7' }}>
                          <i className="fas fa-snowflake" /> Congelar Cuenta
                        </h5>
                        
                        <div className="mp-sidebar-alert mp-sidebar-alert--info">
                          <strong>¿Qué sucede al congelar tu cuenta?</strong>
                          <ul className="mp-info-list">
                            <li>
                              <i className="fas fa-ban" />
                              <span><strong>Bloqueo de Actividad:</strong> No podrás reservar clases, registrar marcas personales (PRs) ni modificar datos de tu Player Card mientras esté congelada.</span>
                            </li>
                            <li>
                              <i className="fas fa-history" />
                              <span><strong>Uso de Membresía Actual:</strong> Tus días restantes de mensualidad seguirán corriendo hasta su vencimiento. No hay reembolsos ni reposición de días no utilizados.</span>
                            </li>
                            <li>
                              <i className="fas fa-sync-alt" />
                              <span><strong>Sin Auto-Renovación:</strong> La renovación automática de tu suscripción activa se desactivará de inmediato para evitar cobros automáticos futuros.</span>
                            </li>
                            <li>
                              <i className="fas fa-shield-alt" />
                              <span><strong>Preservación Total:</strong> Todos tus PRs, historial de asistencia, scores y nivel gamer se mantendrán guardados de forma 100% segura.</span>
                            </li>
                            <li>
                              <i className="fas fa-bolt" />
                              <span><strong>Reactivación Instantánea:</strong> Podrás reactivar tu perfil e interactuar de nuevo ingresando tu contraseña en cualquier momento.</span>
                            </li>
                          </ul>
                        </div>

                        <form onSubmit={handleCongelarCuenta}>
                          <div className="mb-3">
                            <label className="mp-label">Contraseña de Confirmación</label>
                            <input
                              type="password"
                              className="mp-input"
                              required
                              value={freezePassword}
                              onChange={e => setFreezePassword(e.target.value)}
                              placeholder="Ingresa tu contraseña"
                            />
                          </div>
                          <div className="mp-btn-row">
                            <button
                              type="button"
                              className="mp-btn-cancel"
                              onClick={() => {
                                setSeccionActiva(null);
                                setFreezePassword('');
                              }}
                            >
                              Cancelar
                            </button>
                            <BotonSeguro
                              type="submit"
                              className="mp-btn-freeze"
                              textoProcesando={<><i className="fas fa-spinner fa-spin" /> Procesando...</>}
                              disabled={freezing || !freezePassword.trim()}
                            >
                              <i className="fas fa-snowflake" /> Congelar
                            </BotonSeguro>
                          </div>
                        </form>
                      </div>
                    )}

                    {seccionActiva === 'eliminar' && (
                      <div className="mp-expanded-section mp-expanded-section--delete mp-slide-down">
                        <h5 className="mp-section-title" style={{ color: '#ff6b6b' }}>
                          <i className="fas fa-trash-alt" /> Eliminar Cuenta
                        </h5>

                        <div className="mp-sidebar-alert mp-sidebar-alert--danger">
                          <strong>🚨 ADVERTENCIA CRÍTICA e IRREVERSIBLE</strong>
                          <ul className="mp-info-list">
                            <li>
                              <i className="fas fa-exclamation-triangle" />
                              <span><strong>Borrado Definitivo:</strong> Tu perfil, fotos, PRs, scores de entrenamientos y nivel gamer se purgarán permanentemente. Esta acción no se puede deshacer.</span>
                            </li>
                            <li>
                              <i className="fas fa-hand-holding-usd" />
                              <span><strong>Pérdida de Membresía:</strong> Tu membresía activa será cancelada de inmediato de forma definitiva, perdiendo los días que te sobraban sin derecho a reembolsos.</span>
                            </li>
                          </ul>
                        </div>

                        <form onSubmit={handleEliminarCuenta}>
                          <div className="mb-3">
                            <label className="mp-label">Contraseña de Confirmación</label>
                            <input
                              type="password"
                              className="mp-input"
                              required
                              value={deletePassword}
                              onChange={e => setDeletePassword(e.target.value)}
                              placeholder="Ingresa tu contraseña"
                            />
                          </div>
                          <div className="mp-btn-row">
                            <button
                              type="button"
                              className="mp-btn-cancel"
                              onClick={() => {
                                setSeccionActiva(null);
                                setDeletePassword('');
                              }}
                            >
                              Cancelar
                            </button>
                            <BotonSeguro
                              type="submit"
                              className="mp-btn-delete"
                              textoProcesando={<><i className="fas fa-spinner fa-spin" /> Eliminando...</>}
                              disabled={deleting || !deletePassword.trim()}
                            >
                              <i className="fas fa-trash-alt" /> Eliminar
                            </BotonSeguro>
                          </div>
                        </form>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
          )}
        </div>
      </div>

      {/* DATE PICKER OVERLAY */}
      {mostrarDatePicker && (
        <div className="mp-date-overlay" onClick={() => setMostrarDatePicker(false)}>
          <div className="mp-date-modal" onClick={e => e.stopPropagation()}>
            <DateWheelPicker
              initialDate={form.fechaNacimiento ? new Date(form.fechaNacimiento + 'T12:00:00') : new Date(2000, 0, 1)}
              onChange={() => {}}
              onAccept={(date) => {
                const yyyy = date.getFullYear();
                const mm = String(date.getMonth() + 1).padStart(2, '0');
                const dd = String(date.getDate()).padStart(2, '0');
                setForm({ ...form, fechaNacimiento: `${yyyy}-${mm}-${dd}` });
                setMostrarDatePicker(false);
              }}
              onCancel={() => setMostrarDatePicker(false)}
            />
          </div>
        </div>
      )}

      {/* IMAGE CROPPER */}
      {imageToCrop && (
        <ImageCropperModal
          imageSrc={imageToCrop}
          onCropComplete={(croppedBase64) => {
            setForm({ ...form, foto: croppedBase64 });
            setImageToCrop(null);
            guardarFotoInmediata(croppedBase64);
          }}
          onCancel={() => setImageToCrop(null)}
        />
      )}

      {/* MODAL SOCIAL: quién dio like / quién reaccionó */}
      {modalSocial && (
        <div className="mp-social-overlay" onClick={() => setModalSocial(null)}>
          <div className="mp-social-modal" onClick={e => e.stopPropagation()}>
            <div className="mp-social-header">
              <h3 className="mp-social-title">
                <i className={`fas ${modalSocial.tipo === 'likes' ? 'fa-heart' : 'fa-fire'}`} /> {modalSocial.titulo}
              </h3>
              <button type="button" className="mp-social-close" onClick={() => setModalSocial(null)}>
                <i className="fas fa-times" />
              </button>
            </div>
            <div className="mp-social-body">
              {modalSocial.cargando ? (
                <div className="mp-social-loading"><AtletifyLoader /></div>
              ) : modalSocial.items.length === 0 ? (
                <p className="mp-social-empty">
                  {modalSocial.tipo === 'likes'
                    ? 'Aún nadie le ha dado like a tu perfil.'
                    : 'Aún nadie ha reaccionado a este PR.'}
                </p>
              ) : (
                modalSocial.items.map((it, i) => (
                  <div key={i} className="mp-social-row">
                    <div className="mp-social-avatar">
                      {it.foto
                        ? <img src={it.foto} alt={it.nombre} />
                        : (it.nombre || '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="mp-social-info">
                      <span className="mp-social-name">
                        {it.nombre}{it.username ? <span className="mp-social-user"> @{it.username}</span> : ''}
                      </span>
                      <span className="mp-social-date">
                        {new Date(it.fecha).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: '2-digit' })}
                        {' · '}
                        {new Date(it.fecha).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    {modalSocial.tipo === 'reacciones' && <span className="mp-social-emoji">{it.emoji}</span>}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM PREMIUM CONFIRM MODAL */}
      {confirmModal.isOpen && (
        <div 
          className="mp-confirm-overlay" 
          onClick={() => !confirmModal.isAlertOnly && setConfirmModal({ ...confirmModal, isOpen: false })}
        >
          <div className={`mp-confirm-modal mp-confirm-modal--${confirmModal.type}`} onClick={e => e.stopPropagation()}>
            <div className="mp-confirm-modal-header">
              <div className="mp-confirm-modal-icon">
                {confirmModal.type === 'delete' && <i className="fas fa-exclamation-triangle" />}
                {confirmModal.type === 'freeze' && <i className="fas fa-snowflake" />}
                {confirmModal.type === 'success' && <i className="fas fa-check-circle" />}
                {confirmModal.type === 'error' && <i className="fas fa-times-circle" />}
                {confirmModal.type !== 'delete' && confirmModal.type !== 'freeze' && confirmModal.type !== 'success' && confirmModal.type !== 'error' && (
                  <i className="fas fa-info-circle" />
                )}
              </div>
              <h3 className="mp-confirm-modal-title">{confirmModal.title}</h3>
            </div>
            <div className="mp-confirm-modal-body">
              <p>{confirmModal.message}</p>
            </div>
            <div className="mp-confirm-modal-footer">
              {!confirmModal.isAlertOnly && (
                <button 
                  type="button" 
                  className="mp-confirm-btn-cancel" 
                  onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                >
                  Cancelar
                </button>
              )}
              <button 
                type="button" 
                className={`mp-confirm-btn-action mp-confirm-btn-action--${confirmModal.type}`}
                style={confirmModal.isAlertOnly ? { flex: 1 } : {}}
                onClick={() => {
                  if (confirmModal.onConfirm) confirmModal.onConfirm();
                  setConfirmModal({ ...confirmModal, isOpen: false });
                }}
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
