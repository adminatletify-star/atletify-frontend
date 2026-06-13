import { useState, useEffect, useLayoutEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import BackButton from '../components/BackButton';
import BotonSeguro from '../components/BotonSeguro';
import AtletifyLoader from '../components/AtletifyLoader';
import DuracionPlanPicker from '../components/DuracionPlanPicker';
import TipoMovimientoPicker from '../components/TipoMovimientoPicker';
import FiltroMesAnoPicker from '../components/FiltroMesAnoPicker';
import SelectorPlanPicker from '../components/SelectorPlanPicker';
import PromocionPicker from '../components/PromocionPicker';
import MetodoPagoPicker from '../components/MetodoPagoPicker';
import CategoriaBasePicker from '../components/CategoriaBasePicker';
import NivelAccesoPicker from '../components/NivelAccesoPicker';
import '../assets/css/GestionFinanzas.css';
import '../assets/css/visitas-regalo.css';

const API_BASE = `${import.meta.env.VITE_API_URL}/api/finanzas`;

// ── Disponibilidad de clases (lógica COMPARTIDA por drop-in normal y cajear) ──
const JERARQUIA_NIVEL = { novato: 1, principiante: 2, intermedio: 3, rx: 4, avanzado: 4 };
const MAP_DIAS_SEMANA = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];

const parseMinHora = (hhmm) => {
  if (!hhmm) return null;
  const [h, m] = hhmm.split(':');
  return parseInt(h, 10) * 60 + parseInt(m || '0', 10);
};

// Calcula el estado de una clase para HOY usando el reloj local del navegador.
// Reglas (idénticas en ambos flujos):
//  - Solo HOY (por DiasRecurrentes), solo con cupo, finaliza por su hora de FIN.
//  - finalizada (ahora >= fin) o llena  => NO visible.
//  - en curso (inicio <= ahora < fin)   => visible y seleccionable, etiqueta "Transcurriendo".
//  - nivel insuficiente                 => visible pero deshabilitada ("Nivel superior").
const calcularEstadoClase = (c, nivelAtleta) => {
  const ahora = new Date();
  const dayCodeHoy = MAP_DIAS_SEMANA[ahora.getDay()];
  const minutosAhora = ahora.getHours() * 60 + ahora.getMinutes();

  const esHoy = !c.dias || c.dias.toUpperCase().includes(dayCodeHoy);
  const ini = parseMinHora(c.horarioInicio);
  const fin = parseMinHora(c.horarioFin);
  const finalizada = fin != null && minutosAhora >= fin;
  const enCurso = ini != null && fin != null && minutosAhora >= ini && minutosAhora < fin;
  const cupoLleno = c.maximoAtletas <= 0 || c.inscritos >= c.maximoAtletas;

  const niveles = c.nivelesPermitidos || 'Todos';
  let nivelNoPermitido = false;
  if (niveles !== 'Todos') {
    const nivelAtletaVal = JERARQUIA_NIVEL[(nivelAtleta || '').toLowerCase()] || 1;
    let nivelClaseVal = 0;
    Object.keys(JERARQUIA_NIVEL).forEach(n => { if (niveles.toLowerCase().includes(n)) nivelClaseVal = Math.max(nivelClaseVal, JERARQUIA_NIVEL[n]); });
    if (nivelClaseVal === 0) nivelClaseVal = 1;
    if (nivelAtletaVal < nivelClaseVal) nivelNoPermitido = true;
  }

  const visible = esHoy && !finalizada && !cupoLleno;
  return { visible, enCurso, finalizada, cupoLleno, nivelNoPermitido, niveles, bloqueada: nivelNoPermitido };
};

// Clases visibles para hoy, ordenadas por hora de inicio.
const clasesDisponiblesParaHoy = (clases, nivelAtleta) =>
  (clases || [])
    .filter(c => calcularEstadoClase(c, nivelAtleta).visible)
    .sort((a, b) => (parseMinHora(a.horarioInicio) || 0) - (parseMinHora(b.horarioInicio) || 0));

// Render de una tarjeta de clase (idéntico en ambos flujos).
const renderClaseDisponible = (c, nivelAtleta, selId, onSelect) => {
  const est = calcularEstadoClase(c, nivelAtleta);
  const sel = selId === c.idClase;
  const hi = (c.horarioInicio || '').substring(0, 5);
  const hf = (c.horarioFin || '').substring(0, 5);
  return (
    <button
      key={c.idClase}
      type="button"
      disabled={est.bloqueada}
      onClick={() => onSelect(c)}
      className={`vr-clase ${sel ? 'vr-clase--sel' : ''}`}
    >
      <div className="vr-clase-nombre">
        {sel && <i className="fas fa-check-circle text-info"></i>}
        {c.nombre}
        {est.niveles !== 'Todos' && <span className="vr-clase-nivel">{est.niveles}</span>}
        {est.enCurso && <span className="vr-clase-encurso"><i className="fas fa-hourglass-half"></i> En curso</span>}
      </div>
      <div className="vr-clase-meta">
        {est.nivelNoPermitido
          ? <><i className="fas fa-lock me-1"></i>Nivel superior (solo {est.niveles})</>
          : est.enCurso
            ? <><i className="fas fa-hourglass-half me-1"></i>Transcurriendo · termina {hf} · {c.inscritos}/{c.maximoAtletas}</>
            : <><i className="far fa-clock me-1"></i>{hi}–{hf} · {c.inscritos}/{c.maximoAtletas} atletas</>
        }
      </div>
    </button>
  );
};

export default function GestionFinanzas() {
  const navigate = useNavigate();
  const location = useLocation();
  const { usuario } = useAuth();

  const token = localStorage.getItem('token');
  const headersGet = useMemo(() => ({ 'Authorization': `Bearer ${token}` }), [token]);
  const headersPost = useMemo(() => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }), [token]);

  const [box, setBox] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pestaña, setPestaña] = useState(location.state?.fromTab || 'semaforo');
  const tabRefs = useRef({});
  const [sliderStyle, setSliderStyle] = useState(null);
  useLayoutEffect(() => {
    const el = tabRefs.current[pestaña];
    if (el) setSliderStyle({ left: el.offsetLeft, width: el.offsetWidth });
  }, [pestaña]);
  const [dashboardData, setDashboardData] = useState(null);
  const [descuentos, setDescuentos] = useState([]);
  const [formDescuento, setFormDescuento] = useState({ nombre: '', porcentaje: '' });

  // ── SOLICITUDES DE CAMBIO DE FACTURACIÓN ──
  const [solicitudes, setSolicitudes] = useState([]);
  const [loadingSolicitudes, setLoadingSolicitudes] = useState(false);
  const [fotoModalUrl, setFotoModalUrl] = useState(null);

  const cargarSolicitudes = useCallback(async () => {
    setLoadingSolicitudes(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/usuarios/solicitudes-cambio`, {
        headers: headersGet
      });
      if (res.ok) {
        setSolicitudes(await res.json());
      }
    } catch (e) {
      console.error('Error al cargar solicitudes:', e);
    } finally {
      setLoadingSolicitudes(false);
    }
  }, [headersGet]);

  const manejarAprobar = async (idSuscripcion) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/usuarios/suscripcion/${idSuscripcion}/aprobar-cambio`, {
        method: 'PUT',
        headers: headersGet
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.mensaje || 'Solicitud aprobada con éxito');
        cargarSolicitudes();
        if (box) cargarDatos(box.idBox);
      } else {
        alert(data.mensaje || 'Error al aprobar la solicitud');
      }
    } catch (err) {
      console.error(err);
      alert('Error de red al aprobar.');
    }
  };

  const manejarRechazar = async (idSuscripcion) => {
    if (!window.confirm('¿Seguro que deseas rechazar y cancelar esta solicitud de cambio?')) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/usuarios/suscripcion/${idSuscripcion}/rechazar-cambio`, {
        method: 'PUT',
        headers: headersGet
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.mensaje || 'Solicitud rechazada con éxito');
        cargarSolicitudes();
      } else {
        alert(data.mensaje || 'Error al rechazar la solicitud');
      }
    } catch (err) {
      console.error(err);
      alert('Error de red al rechazar.');
    }
  };



  const [semaforo, setSemaforo] = useState([]);
  const [busquedaSemaforo, setBusquedaSemaforo] = useState('');
  const [ordenSemaforo, setOrdenSemaforo] = useState('');
  const [filtroEstado, setFiltroEstado] = useState(location.state?.filterEstado || '');
  const [planes, setPlanes] = useState([]);

  const [formPlan, setFormPlan] = useState({
    nombre: '', precio: '', duracionDias: '30', limiteClasesMensual: '', descripcion: '',
    nivelAcceso: 'CrossFit', prioridadReserva: '1', requiereInscripcion: false, permiteScore: true, esVisible: true, incluyeGym: true, precioReferenciaMensual: ''
  });
  const [showModal, setShowModal] = useState(false);
  const [atletaARenovar, setAtletaARenovar] = useState(null);
  const [planSeleccionado, setPlanSeleccionado] = useState('');

  // 🐺 MODAL DE PUNTO DE VENTA V3 🐺
  const [showModalCobro, setShowModalCobro] = useState(false);
  const [formCobro, setFormCobro] = useState({
    monto1: '', metodo1: 'Efectivo',
    monto2: '', metodo2: '',
    notas: '', idDescuento: '', cobrarInscripcion: false,
    montoInscripcion: '300'
  });

  // ── ESTADO DROP-IN ADMIN ──────────────────────────────────
  const [listaDropins, setListaDropins] = useState([]);
  const [loadingDropins, setLoadingDropins] = useState(false);
  // ── ESTADO PAQUETES VISITAS ──────────────────────────────
  const [listaPaquetes, setListaPaquetes] = useState([]);
  const [loadingPaquetes, setLoadingPaquetes] = useState(false);
  // Modal de 3 pasos
  const [showModalDropIn, setShowModalDropIn] = useState(false);
  const [pasoDropIn, setPasoDropIn] = useState(1);
  const [formDropInAdmin, setFormDropInAdmin] = useState({ nombre: '', email: '', nivelAtleta: 'Principiante' });
  const [clasesDropIn, setClasesDropIn] = useState([]);
  const [claseSeleccionada, setClaseSeleccionada] = useState(null); // {idClase, tipoVisita:'Clase'|'SoloGym', nombre, costo}
  const [procesandoPago, setProcesandoPago] = useState(false);
  const [loadingClasesDropIn, setLoadingClasesDropIn] = useState(false);

  // ── ESTADO CAJEAR VISITAS DE REGALO ──────────────────────────
  const [showChooserRegistro, setShowChooserRegistro] = useState(false); // selector Drop-In normal vs Cajear
  const [showModalCajear, setShowModalCajear] = useState(false);
  const [pasoCajear, setPasoCajear] = useState(1); // 1 = elegir atleta, 2 = datos amigo + clase
  const [atletasConVisitas, setAtletasConVisitas] = useState([]);
  const [loadingAtletasVisitas, setLoadingAtletasVisitas] = useState(false);
  const [busquedaAtletaVisita, setBusquedaAtletaVisita] = useState('');
  const [atletaCajear, setAtletaCajear] = useState(null); // atleta dueño del cupón
  const [formCajear, setFormCajear] = useState({ nombre: '', email: '', nivelAtleta: 'Principiante' }); // datos del amigo
  const [clasesCajear, setClasesCajear] = useState([]);
  const [loadingClasesCajear, setLoadingClasesCajear] = useState(false);
  const [claseCajearSel, setClaseCajearSel] = useState(null);
  const [procesandoCajear, setProcesandoCajear] = useState(false);

  const [editandoPlan, setEditandoPlan] = useState(null);
  const [showModalEditPlan, setShowModalEditPlan] = useState(false); // 👈 Nuevo Modal
  const [formEditPlan, setFormEditPlan] = useState({
    nombre: '', precio: '', duracionDias: '30', limiteClasesMensual: '', descripcion: '',
    nivelAcceso: 'CrossFit', prioridadReserva: '1', requiereInscripcion: false, permiteScore: true, esVisible: true
  });

  const [movimientos, setMovimientos] = useState([]);
  const [resumenMov, setResumenMov] = useState(null);
  const [loadingMov, setLoadingMov] = useState(false);
  const [filtroTipoMov, setFiltroTipoMov] = useState('Todos');
  const [filtroMes, setFiltroMes] = useState('');
  const [busquedaMov, setBusquedaMov] = useState('');

  const cargarDatos = useCallback(async (idBox) => {
    setLoading(true);
    try {
      const [resSemaforo, resPlanes, resDashboard, resDescuentos, resConfig] = await Promise.all([
        fetch(`${API_BASE}/semaforo/${idBox}`, { headers: headersGet }),
        fetch(`${API_BASE}/planes/${idBox}`, { headers: headersGet }),
        fetch(`${API_BASE}/dashboard/${idBox}`, { headers: headersGet }),
        fetch(`${API_BASE}/descuentos/${idBox}`, { headers: headersGet }),
        fetch(`${import.meta.env.VITE_API_URL}/api/configuracionbox/${idBox}`),
      ]);
      if (resSemaforo.ok) setSemaforo(await resSemaforo.json());
      if (resPlanes.ok) setPlanes(await resPlanes.json());
      if (resDashboard.ok) setDashboardData(await resDashboard.json());
      if (resDescuentos.ok) setDescuentos(await resDescuentos.json());
      // Enriquecer el box con la configuración (costoDropIn, costoVisitaGym, etc.)
      if (resConfig.ok) {
        const configData = await resConfig.json();
        setBox(prev => prev ? { ...prev, ...configData } : prev);
      }
    } catch (error) { console.error('Error al cargar finanzas:', error); } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const b = JSON.parse(localStorage.getItem('box'));
    if (!b) { navigate('/login'); return; }
    setBox(b);
    cargarDatos(b.idBox);
  }, [navigate, cargarDatos, location.key]);


  const cargarMovimientos = useCallback(async (idBox, mes = '', tipo = 'Todos') => {
    setLoadingMov(true);
    try {
      const params = new URLSearchParams();
      if (mes) params.append('mes', mes);
      if (tipo && tipo !== 'Todos') params.append('tipo', tipo);
      const qs = params.toString() ? `?${params}` : '';
      const [resMov, resResumen] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_URL}/api/movimientos/box/${idBox}${qs}`, { headers: headersGet }),
        fetch(`${import.meta.env.VITE_API_URL}/api/movimientos/box/${idBox}/resumen${qs}`, { headers: headersGet }),
      ]);
      if (resMov.ok) setMovimientos(await resMov.json());
      if (resResumen.ok) setResumenMov(await resResumen.json());
    } catch (e) { console.error(e); } finally { setLoadingMov(false); }
  }, []);

  const cargarDropins = useCallback(async (idBox) => {
    setLoadingDropins(true);
    try {
      const res = await fetch(`${API_BASE}/dropin-list/${idBox}`, { headers: headersGet });
      if (res.ok) setListaDropins(await res.json());
    } catch (e) { console.error(e); } finally { setLoadingDropins(false); }
  }, []);

  const cargarPaquetes = useCallback(async (idBox) => {
    setLoadingPaquetes(true);
    try {
      const res = await fetch(`${API_BASE}/paquetes-visitas/${idBox}`, { headers: headersGet });
      if (res.ok) setListaPaquetes(await res.json());
    } catch (e) { console.error(e); } finally { setLoadingPaquetes(false); }
  }, []);

  const cargarClasesDropIn = useCallback(async (idBox) => {
    setLoadingClasesDropIn(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/publicdropin/clases-disponibles/${idBox}`);
      if (res.ok) setClasesDropIn(await res.json());
    } catch (e) { console.error(e); } finally { setLoadingClasesDropIn(false); }
  }, []);

  const abrirModalDropIn = () => {
    setFormDropInAdmin({ nombre: '', email: '', nivelAtleta: 'Principiante' });
    setClaseSeleccionada(null);
    setPasoDropIn(1);
    setShowModalDropIn(true);
    if (box) cargarClasesDropIn(box.idBox);
  };

  const confirmarDropInAdmin = async (metodo) => {
    if (!claseSeleccionada || procesandoPago) return;
    setProcesandoPago(true);
    try {
      // Usamos fecha local (no UTC) para evitar desfase de zona horaria
      const ahora = new Date();
      const hoy = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}-${String(ahora.getDate()).padStart(2, '0')}`;
      const payload = {
        idBox: box.idBox,
        nombre: formDropInAdmin.nombre,
        email: formDropInAdmin.email,
        nivelAtleta: formDropInAdmin.nivelAtleta,
        visitas: [{
          idClase: claseSeleccionada.tipoVisita === 'Clase' ? claseSeleccionada.idClase : 0,
          fecha: hoy,
          tipoVisita: claseSeleccionada.tipoVisita
        }]
      };

      // 1. Crear la visita como Pendiente
      const resReserva = await fetch(`${import.meta.env.VITE_API_URL}/api/publicdropin/reservar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const dataReserva = await resReserva.json();
      if (!resReserva.ok) { alert(dataReserva.mensaje || 'Error al crear la visita.'); return; }

      // 2. Aprobar con el método de pago elegido (Efectivo, Tarjeta o Transferencia)
      const ids = dataReserva.idsVisita || [];
      for (const idVisita of ids) {
        const resAprobar = await fetch(
          `${API_BASE}/dropin/aprobar/${idVisita}?metodo=${encodeURIComponent(metodo)}`,
          { method: 'PUT', headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } }
        );
        if (!resAprobar.ok) {
          const errData = await resAprobar.json().catch(() => ({}));
          alert(`Error al aprobar visita ${idVisita}: ${errData.mensaje || resAprobar.status}`);
          return;
        }
      }

      alert(`✅ Drop-In registrado y pagado (${metodo}).`);
      setShowModalDropIn(false);
      cargarDropins(box.idBox);
      cargarDatos(box.idBox);
    } catch (e) {
      console.error(e);
      alert('Error al confirmar el Drop-In: ' + e.message);
    } finally {
      setProcesandoPago(false);
    }
  };

  // ── CAJEAR VISITAS DE REGALO ──────────────────────────────────
  const cargarAtletasConVisitas = useCallback(async (idBox) => {
    setLoadingAtletasVisitas(true);
    try {
      const res = await fetch(`${API_BASE}/cajear/atletas-con-visitas/${idBox}`, { headers: headersGet });
      if (res.ok) setAtletasConVisitas(await res.json());
    } catch (e) { console.error(e); } finally { setLoadingAtletasVisitas(false); }
  }, [headersGet]);

  const cargarClasesCajear = useCallback(async (idBox) => {
    setLoadingClasesCajear(true);
    try {
      const res = await fetch(`${API_BASE}/cajear/clases-disponibles/${idBox}`, { headers: headersGet });
      if (res.ok) setClasesCajear(await res.json());
    } catch (e) { console.error(e); } finally { setLoadingClasesCajear(false); }
  }, [headersGet]);

  const abrirModalCajear = () => {
    setShowChooserRegistro(false);
    setAtletaCajear(null);
    setFormCajear({ nombre: '', email: '', nivelAtleta: 'Principiante' });
    setClaseCajearSel(null);
    setBusquedaAtletaVisita('');
    setPasoCajear(1);
    setShowModalCajear(true);
    if (box) { cargarAtletasConVisitas(box.idBox); cargarClasesCajear(box.idBox); }
  };

  const confirmarCajear = async () => {
    if (!atletaCajear || !claseCajearSel || procesandoCajear) return;
    if (!formCajear.nombre.trim() || !formCajear.email.trim()) { alert('El nombre y correo del amigo son obligatorios.'); return; }
    setProcesandoCajear(true);
    try {
      const res = await fetch(`${API_BASE}/cajear/registrar`, {
        method: 'POST',
        headers: headersPost,
        body: JSON.stringify({
          idBox: box.idBox,
          idUsuarioAtleta: atletaCajear.idUsuario,
          nombreAmigo: formCajear.nombre,
          correoAmigo: formCajear.email,
          nivelAmigo: formCajear.nivelAtleta,
          idClase: claseCajearSel.idClase
        })
      });
      const data = await res.json();
      if (!res.ok) { alert(data.mensaje || 'No se pudo canjear la visita.'); return; }
      alert(`✅ Visita de regalo canjeada. Al atleta le quedan ${data.visitasRestantes} visita(s).`);
      setShowModalCajear(false);
      cargarDropins(box.idBox);
      cargarDatos(box.idBox);
    } catch (e) { console.error(e); alert('Error al canjear: ' + e.message); }
    finally { setProcesandoCajear(false); }
  };

  useEffect(() => {
    if (pestaña === 'movimientos' && box) cargarMovimientos(box.idBox, filtroMes, filtroTipoMov);
    if (pestaña === 'dropin' && box) { cargarDropins(box.idBox); cargarAtletasConVisitas(box.idBox); }
    if (pestaña === 'paquetes' && box) cargarPaquetes(box.idBox);
    if (pestaña === 'solicitudes') cargarSolicitudes();
  }, [pestaña, box, filtroMes, filtroTipoMov, cargarMovimientos, cargarDropins, cargarPaquetes, cargarSolicitudes, cargarAtletasConVisitas]);

  const crearDescuento = async (e) => {
    e.preventDefault();
    if (!formDescuento.nombre || !formDescuento.porcentaje) return alert('Llena todos los campos');

    if (parseFloat(formDescuento.porcentaje) < 0 || parseFloat(formDescuento.porcentaje) > 100) {
      return alert('El porcentaje debe estar entre 0% y 100%');
    }

    try {
      const res = await fetch(`${API_BASE}/descuentos`, {
        method: 'POST',
        headers: headersPost,
        body: JSON.stringify({
          idBox: box.idBox,
          nombre: formDescuento.nombre,
          porcentaje: parseFloat(formDescuento.porcentaje)
        })
      });

      const data = await res.json(); // Leemos qué nos dice C#

      if (res.ok) {
        alert('Promoción creada con éxito');
        setFormDescuento({ nombre: '', porcentaje: '' });
        cargarDatos(box.idBox);
      } else {
        alert(data.mensaje || 'Error al crear la promoción en el servidor.');
      }
    } catch (e) { alert('Error de conexión al crear descuento'); }
  };

  const toggleDescuento = async (idDescuento) => {
    try {
      const res = await fetch(`${API_BASE}/descuentos/toggle/${idDescuento}`, { method: 'PUT', headers: headersGet });
      if (res.ok) cargarDatos(box.idBox);
    } catch (e) { alert('Error al cambiar estado del descuento'); }
  };

  const crearPlan = async (e) => {
    if (!formPlan.nombre || !formPlan.precio || (formPlan.nivelAcceso !== 'Visitas' && !formPlan.duracionDias)) return alert('Llena todos los campos');
    if (formPlan.nivelAcceso === 'Visitas' && !formPlan.limiteClasesMensual) return alert('Debes especificar el número de visitas incluidas para este paquete.');
    try {
      const res = await fetch(`${API_BASE}/planes`, {
        method: 'POST',
        headers: headersPost,
        body: JSON.stringify({
          idBox: box.idBox,
          nombre: formPlan.nombre,
          precio: parseFloat(formPlan.precio),
          diasDuracion: parseInt(formPlan.duracionDias) || null,
          limiteClasesMensual: formPlan.limiteClasesMensual ? parseInt(formPlan.limiteClasesMensual) : null,
          descripcion: formPlan.descripcion || '',
          nivelAcceso: formPlan.nivelAcceso,
          prioridadReserva: parseInt(formPlan.prioridadReserva) || 1,
          requiereInscripcion: formPlan.requiereInscripcion,
          permiteScore: formPlan.permiteScore,
          esVisible: formPlan.esVisible,
          incluyeGym: formPlan.incluyeGym,
          precioReferenciaMensual: formPlan.precioReferenciaMensual ? parseFloat(formPlan.precioReferenciaMensual) : null
        }),
      });

      const data = await res.json(); // Leemos la respuesta de C#

      if (res.ok) {
        alert('Plan creado exitosamente');
        setFormPlan({ nombre: '', precio: '', duracionDias: '30' });
        cargarDatos(box.idBox);
      } else {
        // Si C# nos rebota (400 Bad Request), mostramos por qué:
        alert(data.mensaje || 'Error al crear el plan en el servidor.');
      }
    } catch (e) { alert('Error de conexión al crear plan'); }
  };

  const iniciarEdicionPlan = (plan) => {
    setEditandoPlan(plan.idPlan);
    setFormEditPlan({
      nombre: plan.nombre || '',
      precio: String(plan.precio || ''),
      duracionDias: String(plan.diasDuracion || '30'),
      limiteClasesMensual: plan.limiteClasesMensual ? String(plan.limiteClasesMensual) : '',
      descripcion: plan.descripcion || '',
      nivelAcceso: plan.nivelAcceso || 'CrossFit',
      prioridadReserva: String(plan.prioridadReserva || '1'),
      requiereInscripcion: plan.requiereInscripcion ?? false,
      permiteScore: plan.permiteScore ?? true,
      esVisible: plan.esVisible ?? true
    });
    setShowModalEditPlan(true); // 👈 Abrimos el Modal
  };

  const guardarEdicionPlan = async (e) => {
    if (!formEditPlan.nombre || !formEditPlan.precio) return alert('Nombre y precio obligatorios');
    if (formEditPlan.nivelAcceso === 'Visitas' && !formEditPlan.limiteClasesMensual) return alert('Debes especificar el número de visitas incluidas para este paquete.');

    try {
      const res = await fetch(`${API_BASE}/planes/${editandoPlan}`, {
        method: 'PUT',
        headers: headersPost,
        body: JSON.stringify({
          nombre: formEditPlan.nombre,
          precio: parseFloat(formEditPlan.precio),
          diasDuracion: parseInt(formEditPlan.duracionDias) || null,
          limiteClasesMensual: formEditPlan.limiteClasesMensual ? parseInt(formEditPlan.limiteClasesMensual) : null,
          descripcion: formEditPlan.descripcion || '', // 👈 Mandamos string vacío en vez de null
          nivelAcceso: formEditPlan.nivelAcceso,
          prioridadReserva: parseInt(formEditPlan.prioridadReserva) || 1,
          requiereInscripcion: formEditPlan.requiereInscripcion,
          permiteScore: formEditPlan.permiteScore,
          esVisible: formEditPlan.esVisible
        }),
      });

      if (res.ok) {
        setShowModalEditPlan(false);
        setEditandoPlan(null);
        cargarDatos(box.idBox);
        alert('Plan actualizado con éxito');
      } else {
        const data = await res.json(); alert(data.mensaje || 'Error al editar el plan');
      }
    } catch (e) { alert('Error de conexión al editar plan'); }
  };

  const eliminarPlan = async (idPlan) => {
    if (!window.confirm('¿ELIMINAR este plan?')) return;
    try {
      const res = await fetch(`${API_BASE}/planes/${idPlan}`, { method: 'DELETE', headers: headersGet });
      if (res.ok) cargarDatos(box.idBox);
    } catch (e) { alert('Error al eliminar plan'); }
  };

  const eliminarDescuento = async (idDescuento) => {
    if (!window.confirm('¿ELIMINAR esta promoción?')) return;
    try {
      const res = await fetch(`${API_BASE}/descuentos/${idDescuento}`, { method: 'DELETE', headers: headersGet });
      if (res.ok) cargarDatos(box.idBox);
    } catch (e) { alert('Error al eliminar'); }
  };

  const editarDescuento = async (idDescuento, nombreActual, porcentajeActual) => {
    const nuevoNombre = prompt('Nuevo nombre:', nombreActual); if (!nuevoNombre) return;
    const nuevoPorcentaje = prompt('Nuevo porcentaje (%):', porcentajeActual); if (!nuevoPorcentaje) return;
    try {
      const res = await fetch(`${API_BASE}/descuentos/editar/${idDescuento}`, { method: 'PUT', headers: headersPost, body: JSON.stringify({ nombre: nuevoNombre, porcentaje: parseFloat(nuevoPorcentaje) }) });
      if (res.ok) cargarDatos(box.idBox);
    } catch (e) { alert('Error al editar'); }
  };

  // registrarDropIn removido — reemplazado por confirmarDropInAdmin con modales

  const aprobarDropIn = async (idVisita, metodo) => {
    if (!window.confirm(`¿Confirmar que el turista pagó mediante ${metodo}?`)) return;
    try {
      const res = await fetch(`${API_BASE}/dropin/aprobar/${idVisita}?metodo=${metodo}`, { method: 'PUT', headers: headersGet });
      if (res.ok) {
        alert('Pago confirmado y acceso otorgado.');
        cargarDropins(box.idBox);
        cargarDatos(box.idBox);
      } else {
        alert('Error al confirmar.');
      }
    } catch (e) { alert('Error de conexión.'); }
  };

  const abrirPuntoDePago = async () => {
    if (!planSeleccionado) return alert('Selecciona un plan para renovar');

    // V4: Llamar a la calculadora antes de abrir el cobro
    try {
      const b = JSON.parse(localStorage.getItem('box'));
      const token = localStorage.getItem('token');
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/precioespecial/calcular/${atletaARenovar.idUsuario}/box/${b.idBox}/plan/${planSeleccionado}?metodoPago=Recepción`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      if (res.ok) {
        const calculo = await res.json();
        // Pre-llenar el formulario con los datos de la calculadora
        setFormCobro(prev => ({
          ...prev,
          cobrarInscripcion: calculo.debeInscripcion,
          montoInscripcion: String(calculo.montoInscripcion || 0),
          monto1: String(calculo.totalConInscripcion || 0),
          _calculo: calculo // Guardamos el cálculo completo para usarlo en el desglose
        }));
      }
    } catch (e) {
      console.error('Error al calcular precio:', e);
    }

    setShowModalCobro(true);
  };

  // === MATEMÁTICA V4 (Con protección contra undefined) ===
  const planAplicado = planes.find(p => p.idPlan === parseInt(planSeleccionado));
  const descuentosActivos = descuentos.filter(d => d.activo);
  const descSeleccionado = descuentosActivos.find(d => d.idDescuento === parseInt(formCobro.idDescuento));

  const calculoSemaforo = formCobro._calculo || null;
  const totalOriginal = planAplicado?.precio || 0;
  const precioConDescuentoPersonal = calculoSemaforo?.precioFinal ?? totalOriginal;
  const descuentoPersonalMonto = calculoSemaforo?.montoDescuento ?? 0;
  const descuentoPersonalTexto = calculoSemaforo?.descuentoAplicado ?? 'Ninguno';

  const descuentoPromo = descSeleccionado ? (precioConDescuentoPersonal * (descSeleccionado.porcentaje / 100)) : 0;
  const costoInscripcion = formCobro.cobrarInscripcion ? (parseFloat(formCobro.montoInscripcion) || 0) : 0;
  const recargoMonto = calculoSemaforo?.recargo || 0;
  const totalACobrar = Math.max(0, (precioConDescuentoPersonal - descuentoPromo) + costoInscripcion + recargoMonto);
  const restante = totalACobrar - (parseFloat(formCobro.monto1) || 0);

  useEffect(() => {
    if (restante > 0 && formCobro.monto1 !== '') {
      setFormCobro(prev => ({ ...prev, monto2: restante.toFixed(2) }));
    } else {
      setFormCobro(prev => ({ ...prev, monto2: '', metodo2: '' }));
    }
  }, [restante, formCobro.monto1]);

  const procesarRenovacionConPago = async (e) => {
    e.preventDefault();
    const m1 = parseFloat(formCobro.monto1) || 0;
    const m2 = parseFloat(formCobro.monto2) || 0;

    if ((m1 + m2) < totalACobrar) {
      return alert(`Faltan $${totalACobrar - (m1 + m2)}. Ingresa el monto completo.`);
    }

    try {
      // 1. Creamos la Suscripción Pendiente
      const resRenovar = await fetch(`${API_BASE}/suscripciones/renovar`, {
        method: 'POST',
        headers: headersPost,
        body: JSON.stringify({ idUsuario: atletaARenovar.idUsuario, idPlan: parseInt(planSeleccionado) }),
      });
      if (!resRenovar.ok) return alert('Error al renovar suscripción');
      const dataRenovar = await resRenovar.json();

      // 2. Activamos y Cobramos (V3)
      const resPago = await fetch(`${import.meta.env.VITE_API_URL}/api/cobranza/pagar`, {
        method: 'POST',
        headers: headersPost,
        body: JSON.stringify({
          idSuscripcion: dataRenovar.idSuscripcion,
          montoMetodo1: m1,
          metodoPago1: formCobro.metodo1,
          montoMetodo2: m2 > 0 ? m2 : null,
          metodoPago2: m2 > 0 ? formCobro.metodo2 : null,
          notas: formCobro.notas + (recargoMonto > 0 ? ` (+ Recargo por pago tardío $${recargoMonto.toFixed(2)})` : ''),
          usarSaldoAFavor: false, // En esta vista rápida no usamos saldo, el saldo es desde su Perfil
          cobrarInscripcion: formCobro.cobrarInscripcion,
          idDescuento: formCobro.idDescuento ? parseInt(formCobro.idDescuento) : null,
        }),
      });
      if (!resPago.ok) return alert('Suscripción creada, pero error al registrar el pago.');

      alert('¡Suscripción Renovada y Activada! 💸');
      setShowModal(false);
      setShowModalCobro(false);
      setAtletaARenovar(null);
      setPlanSeleccionado('');
      setFormCobro({ monto1: '', metodo1: 'Efectivo', monto2: '', metodo2: '', notas: '', idDescuento: '', cobrarInscripcion: false });
      cargarDatos(box.idBox);
    } catch (e) { alert('Error al procesar el cobro'); }
  };

  const getBadgeColor = (estado) => {
    switch (estado) {
      case 'Verde': return 'finanzas-badge--verde';
      case 'Amarillo': return 'finanzas-badge--amarillo';
      case 'Rojo': return 'finanzas-badge--rojo';
      case 'Azul': return 'finanzas-badge--azul';
      case 'Gris': return 'finanzas-badge--gris';
      case 'VIP': return 'finanzas-badge--vip';
      default: return 'finanzas-badge--default';
    }
  };

  const semaforoFiltrado = semaforo.filter(s => {
    const term = busquedaSemaforo.toLowerCase();
    const nombreMatch = s.nombre?.toLowerCase().includes(term);
    const telefonoMatch = s.telefono?.includes(term);
    const estatusMatch = !filtroEstado || s.estado === filtroEstado;
    return (!term || nombreMatch || telefonoMatch) && estatusMatch;
  }).sort((a, b) => {
    if (!ordenSemaforo) return 0;
    const diasA = a.diasRestantes ?? 0;
    const diasB = b.diasRestantes ?? 0;
    if (ordenSemaforo === 'dias_asc') return diasA - diasB;
    if (ordenSemaforo === 'dias_desc') return diasB - diasA;
    return 0;
  });

  // Normaliza texto para búsquedas: sin acentos, sin espacios, minúsculas
  const normalizar = (s) => (s || '').toString().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '');

  const getBadgeMov = (tipo) => {
    if (tipo?.startsWith('Alta Permanente')) return 'mov-badge--vip';
    switch (tipo) {
      case 'Mensualidad': return 'mov-badge--mensualidad';
      case 'Mensualidad + Inscripción': return 'mov-badge--mensualidad';
      case 'Abono': return 'mov-badge--abono';
      case 'Drop-In': return 'mov-badge--dropin';
      case 'Ajuste Manual de Plan': return 'mov-badge--ajuste';
      case 'Pago Mixto (Con Saldo a Favor)': return 'mov-badge--saldo';
      default: return 'mov-badge--default';
    }
  };

  const movimientosFiltrados = movimientos.filter(m => {
    if (!busquedaMov) return true;
    const term = busquedaMov.toLowerCase();
    return m.nombreAtleta?.toLowerCase().includes(term) ||
      m.tipo?.toLowerCase().includes(term) ||
      m.metodoPago?.toLowerCase().includes(term);
  });

  return (
    <div className="finanzas-container">

      <nav className="finanzas-nav">
        <BackButton to="/admin-box-panel" />
        <div className="finanzas-nav-icono"><i className="fas fa-money-bill-wave"></i></div>
        <h1 className="finanzas-nav-titulo">Gestión de Mensualidades</h1>
      </nav>

      <div className="container py-4">

        <div className="finanzas-tabs-wrapper mb-4">
          <div className="finanzas-tabs">
            {sliderStyle && <div className="finanzas-tab-slider" style={sliderStyle} />}
            <button ref={el => tabRefs.current['semaforo'] = el} className={`finanzas-tab ${pestaña === 'semaforo' ? 'activo' : ''}`} onClick={() => setPestaña('semaforo')}><i className="fas fa-traffic-light"></i>Semáforo</button>
            <button ref={el => tabRefs.current['planes'] = el} className={`finanzas-tab ${pestaña === 'planes' ? 'activo' : ''}`} onClick={() => setPestaña('planes')}><i className="fas fa-tags"></i>Planes</button>
            <button ref={el => tabRefs.current['descuentos'] = el} className={`finanzas-tab ${pestaña === 'descuentos' ? 'activo' : ''}`} onClick={() => setPestaña('descuentos')}><i className="fas fa-percent"></i>Promos</button>
            <button ref={el => tabRefs.current['dropin'] = el} className={`finanzas-tab ${pestaña === 'dropin' ? 'activo' : ''}`} onClick={() => setPestaña('dropin')}><i className="fas fa-plane-arrival"></i>Drop-In</button>
            <button ref={el => tabRefs.current['paquetes'] = el} className={`finanzas-tab ${pestaña === 'paquetes' ? 'activo' : ''}`} onClick={() => setPestaña('paquetes')}><i className="fas fa-ticket-alt"></i>Paquetes</button>
            <button ref={el => tabRefs.current['movimientos'] = el} className={`finanzas-tab ${pestaña === 'movimientos' ? 'activo' : ''}`} onClick={() => setPestaña('movimientos')}><i className="fas fa-history"></i>Movimientos</button>
            {['Admin', 'AdminBox', 'Coach', 'Staff', 'Developer'].includes(usuario?.rol) && (
              <button ref={el => tabRefs.current['solicitudes'] = el} className={`finanzas-tab ${pestaña === 'solicitudes' ? 'activo' : ''}`} onClick={() => setPestaña('solicitudes')}><i className="fas fa-file-invoice-dollar"></i>Solicitudes</button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-5"><AtletifyLoader /></div>
        ) : (
          <>
            {/* TAB: SEMÁFORO */}
            {pestaña === 'semaforo' && (
              <div className="d-flex flex-column gap-4">
                {/* Métricas del Dashboard */}
                {dashboardData && (
                  <div className="row g-4">
                    <div className="col-12 col-lg-4">
                      <div className="finanzas-stat-principal h-100 d-flex flex-column justify-content-center">
                        <p className="finanzas-stat-label"><i className="fas fa-calendar-check me-1"></i>Ingresos del Mes</p>
                        <p className="finanzas-stat-valor">${dashboardData.ingresosMes.toFixed(2)}</p>
                        <p className="finanzas-stat-nota">Facturación total actual</p>
                      </div>
                    </div>
                    <div className="col-12 col-md-6 col-lg-4">
                      <div className="finanzas-card">
                        <div className="finanzas-card-titulo"><i className="fas fa-users" style={{ color: 'var(--accent-cool)' }}></i> Salud de la Manada</div>
                        <div className="finanzas-salud-row"><span className="finanzas-salud-label" style={{ color: 'var(--success)' }}><i className="fas fa-check-circle"></i>Al Día</span><span className="finanzas-salud-cnt finanzas-salud-cnt--verde">{dashboardData.estadoAtletas.alDia} atletas</span></div>
                        <div className="finanzas-salud-row"><span className="finanzas-salud-label" style={{ color: 'var(--danger)' }}><i className="fas fa-times-circle"></i>Vencidos</span><span className="finanzas-salud-cnt finanzas-salud-cnt--rojo">{dashboardData.estadoAtletas.morosos} atletas</span></div>
                        <div className="finanzas-salud-row"><span className="finanzas-salud-label" style={{ color: 'var(--accent-cool)' }}><i className="fas fa-snowflake"></i>Congelados</span><span className="finanzas-salud-cnt finanzas-salud-cnt--azul">{dashboardData.estadoAtletas.congelados} atletas</span></div>
                        <div className="finanzas-salud-row"><span className="finanzas-salud-label" style={{ color: 'var(--text-muted)' }}><i className="fas fa-user-shield"></i>Equipo de trabajo</span><span className="finanzas-salud-cnt finanzas-salud-cnt--gris">{dashboardData.estadoAtletas.equipoTrabajo ?? 0} miembros</span></div>
                      </div>
                    </div>
                    <div className="col-12 col-md-6 col-lg-4">
                      <div className="finanzas-card finanzas-card--peligro">
                        <div className="finanzas-card-titulo"><i className="fas fa-skull-crossbones" style={{ color: 'var(--danger)' }}></i> Próximos Vencimientos</div>
                        {dashboardData.topMorosos.length === 0 ? <div className="finanzas-empty"><i className="fas fa-glass-cheers"></i><p>Todo en orden.</p></div> : (
                          dashboardData.topMorosos.map((m, index) => (
                            <div key={index} className="finanzas-moroso-item">
                              <div>
                                <div className="finanzas-moroso-nombre">{m.nombre}</div>
                                <div className="finanzas-moroso-fecha"><i className="fas fa-calendar-times me-1"></i>Vence: {new Date(m.fechaVencimiento).toLocaleDateString()}</div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Listado de Semáforo */}
                <div className="finanzas-card">
                <div className="finanzas-card-titulo d-flex justify-content-between align-items-center flex-wrap gap-2">
                  <span><i className="fas fa-traffic-light" style={{ color: 'var(--success)' }}></i> Estado de Atletas</span>
                  <div className="d-flex gap-2 flex-wrap w-100 w-md-auto">
                    <input
                      type="text"
                      className="finanzas-input mb-0 py-1 px-2 flex-grow-1"
                      placeholder="Buscar por nombre o teléfono..."
                      style={{ minWidth: '160px', fontSize: '0.9rem' }}
                      value={busquedaSemaforo}
                      onChange={(e) => setBusquedaSemaforo(e.target.value)}
                    />
                    <select
                      className="finanzas-input mb-0 py-1 px-2"
                      style={{ width: 'auto', fontSize: '0.9rem' }}
                      value={filtroEstado}
                      onChange={(e) => setFiltroEstado(e.target.value)}
                    >
                      <option value="">Todos los Estados</option>
                      <option value="Verde">Al Día</option>
                      <option value="Amarillo">Por Vencer</option>
                      <option value="Rojo">Vencidos (Adeudos)</option>
                      <option value="Azul">Congelados</option>
                      <option value="VIP">Pase Libre</option>
                      <option value="Gris">Cancelados</option>
                    </select>
                    <select
                      className="finanzas-input mb-0 py-1 px-2"
                      style={{ width: 'auto', fontSize: '0.9rem' }}
                      value={ordenSemaforo}
                      onChange={(e) => setOrdenSemaforo(e.target.value)}
                    >
                      <option value="">Orden: Por Defecto</option>
                      <option value="dias_asc">Días Restantes (Menor a Mayor)</option>
                      <option value="dias_desc">Días Restantes (Mayor a Menor)</option>
                    </select>
                  </div>
                </div>
                {/* Vista móvil: tarjetas */}
                <div className="d-md-none">
                  {semaforoFiltrado.length === 0 ? (
                    <div className="finanzas-empty"><p>No hay atletas que coincidan.</p></div>
                  ) : semaforoFiltrado.map(s => (
                    <div key={s.idUsuario} className="finanzas-card mb-2 p-3 h-auto">
                      <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
                        <div>
                          <div className="finanzas-atleta-nombre">
                            {s.nombre}
                            {(s.rol === 'Coach' || s.rol === 'Staff' || s.rol === 'AdminBox') && <span className="badge bg-secondary ms-2" style={{ fontSize: '0.6rem' }}><i className="fas fa-user-shield"></i> Staff</span>}
                            {s.esDeConfianza && <span className="badge bg-info text-dark ms-2" style={{ fontSize: '0.6rem' }}><i className="fas fa-handshake"></i> Confianza</span>}
                          </div>
                          <div className="finanzas-atleta-tel"><i className="fas fa-phone me-1"></i>{s.telefono || 'Sin número'}</div>
                          <div className="small mt-1" style={{ color: 'var(--secondary)' }}>{s.plan}</div>
                          {s.grupoFamiliar && <div className="small mt-1 text-warning"><i className="fas fa-users me-1"></i>{s.grupoFamiliar}</div>}
                        </div>
                        <span className={`finanzas-badge ${getBadgeColor(s.estado)}`} style={{ whiteSpace: 'nowrap' }}>
                          {s.estado === 'Verde' ? `Al día · ${s.diasRestantes}d`
                            : s.estado === 'Amarillo' ? `Por vencer · ${s.diasRestantes}d`
                              : s.estado === 'Azul' ? 'CONGELADO'
                                : s.estado === 'VIP' ? 'PASE LIBRE'
                                  : s.estado === 'Gris' ? 'CANCELADO'
                                    : 'VENCIDO'}
                        </span>
                      </div>
                      <div className="d-flex gap-2">
                        <button
                          className="finanzas-btn-accion finanzas-btn-accion--renovar"
                          onClick={() => { setAtletaARenovar(s); setShowModal(true); }}
                          disabled={s.estado === 'VIP'}
                          style={{ opacity: s.estado === 'VIP' ? 0.4 : 1, cursor: s.estado === 'VIP' ? 'not-allowed' : 'pointer' }}
                        >
                          <i className="fas fa-sync-alt"></i>Renovar
                        </button>
                        <button className="finanzas-btn-accion finanzas-btn-accion--perfil" onClick={() => { navigate(location.pathname, { replace: true, state: { ...location.state, fromTab: pestaña } }); navigate(`/perfil-atleta-admin/${s.idUsuario}`); }}>
                          <i className="fas fa-eye"></i>Perfil
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Vista escritorio: tabla */}
                <div className="finanzas-table-wrapper d-none d-md-block">
                  <table className="finanzas-table">
                    <thead><tr><th>Atleta</th><th>Plan Actual</th><th>Estado</th><th style={{ textAlign: 'right' }}>Acción</th></tr></thead>
                    <tbody>
                      {semaforoFiltrado.length === 0 ? <tr><td colSpan="4"><div className="finanzas-empty"><p>No hay atletas que coincidan.</p></div></td></tr> : (
                        semaforoFiltrado.map(s => (
                          <tr key={s.idUsuario}>
                            <td><div className="finanzas-atleta-nombre">{s.nombre} {(s.rol === 'Coach' || s.rol === 'Staff' || s.rol === 'AdminBox') && <span className="badge bg-secondary ms-2" style={{ fontSize: '0.65rem' }} title="Equipo de trabajo"><i className="fas fa-user-shield"></i> Staff</span>} {s.esDeConfianza && <span className="badge bg-info text-dark ms-2" style={{ fontSize: '0.65rem' }} title="Atleta de Confianza (Fiado)"><i className="fas fa-handshake"></i> Confianza</span>}</div><div className="finanzas-atleta-tel"><i className="fas fa-phone me-1"></i>{s.telefono || 'Sin número'}</div></td>
                            <td style={{ color: 'var(--secondary)' }}>
                              {s.plan}
                              {s.grupoFamiliar && <div className="text-warning mt-1" style={{fontSize:'0.75rem'}}><i className="fas fa-users me-1"></i>{s.grupoFamiliar}</div>}
                            </td>
                            <td><span className={`finanzas-badge ${getBadgeColor(s.estado)}`}>{s.estado === 'Verde' ? `Al día · ${s.diasRestantes}d`
                              : s.estado === 'Amarillo' ? `Por vencer · ${s.diasRestantes}d`
                                : s.estado === 'Azul' ? 'CONGELADO '
                                  : s.estado === 'VIP' ? 'PASE LIBRE '
                                    : s.estado === 'Gris' ? 'CANCELADO '
                                      : 'VENCIDO'}
                            </span></td>
                            <td>
                              <div className="d-flex gap-2 justify-content-end flex-wrap">
                                <button
                                  className="finanzas-btn-accion finanzas-btn-accion--renovar"
                                  onClick={() => { setAtletaARenovar(s); setShowModal(true); }}
                                  disabled={s.estado === 'VIP'}
                                  style={{ opacity: s.estado === 'VIP' ? 0.4 : 1, cursor: s.estado === 'VIP' ? 'not-allowed' : 'pointer' }}
                                >
                                  <i className="fas fa-sync-alt"></i>Renovar
                                </button>
                                <button className="finanzas-btn-accion finanzas-btn-accion--perfil" onClick={() => { navigate(location.pathname, { replace: true, state: { ...location.state, fromTab: pestaña } }); navigate(`/perfil-atleta-admin/${s.idUsuario}`); }}><i className="fas fa-eye"></i>Perfil</button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

            {/* TAB: PLANES (Se mantiene intacto) */}
            {pestaña === 'planes' && (
              <div className="row g-4">
                <div className="col-md-5">
                  <div className="finanzas-card">
                    <div className="finanzas-card-titulo"><i className="fas fa-plus-circle" style={{ color: 'var(--accent-cool)' }}></i>Crear Nuevo Plan</div>
                    <form onSubmit={crearPlan}>
                      <div className="row g-3">
                        <div className="col-md-7">
                          <label className="etiqueta-campo">Nombre del Plan</label>
                          <input type="text" className="finanzas-input" required value={formPlan.nombre} onChange={e => setFormPlan({ ...formPlan, nombre: e.target.value })} placeholder="Ej. Ilimitado Mensual" />
                        </div>
                        <div className="col-md-5">
                          <label className="etiqueta-campo">Precio ($)</label>
                          <input type="number" className="finanzas-input" required value={formPlan.precio} onChange={e => setFormPlan({ ...formPlan, precio: e.target.value })} placeholder="Ej. 800" />
                        </div>

                        {formPlan.nivelAcceso !== 'Visitas' ? (
                          <div className="col-md-6">
                            <label className="etiqueta-campo">Duración (Días)</label>
                            <DuracionPlanPicker valor={formPlan.duracionDias} onCambiar={v => setFormPlan({ ...formPlan, duracionDias: v })} />
                          </div>
                        ) : (
                          <div className="col-md-6">
                            <label className="etiqueta-campo">Caducidad</label>
                            <div className="finanzas-input d-flex align-items-center bg-success bg-opacity-10 text-success fw-bold border-success" style={{ cursor: 'not-allowed' }}>
                              <i className="fas fa-calendar-check me-2"></i> 1 Año (Automático)
                            </div>
                          </div>
                        )}
                        <div className="col-md-6">
                          <label className="etiqueta-campo">{formPlan.nivelAcceso === 'Visitas' ? 'Número de Visitas Incluidas' : 'Límite de Visitas (Vacío = Ilimitado)'}</label>
                          <input type="number" className="finanzas-input" required={formPlan.nivelAcceso === 'Visitas'} value={formPlan.limiteClasesMensual} onChange={e => setFormPlan({ ...formPlan, limiteClasesMensual: e.target.value })} placeholder={formPlan.nivelAcceso === 'Visitas' ? "Ej. 10 (Obligatorio)" : "Ej. 4 para Cuponeras"} />
                        </div>

                        <div className="col-12">
                          <label className="etiqueta-campo">Descripción Corta (Visible en la App)</label>
                          <input type="text" className="finanzas-input" value={formPlan.descripcion} onChange={e => setFormPlan({ ...formPlan, descripcion: e.target.value })} placeholder="Ej. Acceso a todas las clases y open gym" />
                        </div>

                        <div className="col-12 mt-3 mb-1"><hr style={{ borderColor: 'rgba(255,255,255,0.1)' }} /> <p className="text-secondary small fw-bold mb-0"><i className="fas fa-cogs me-1"></i> CONFIGURACIÓN AVANZADA Y LEALTAD</p></div>

                        <div className="col-md-6">
                          <label className="etiqueta-campo">Nivel de Acceso</label>
                          <NivelAccesoPicker valor={formPlan.nivelAcceso} onCambiar={v => setFormPlan({ ...formPlan, nivelAcceso: v })} />
                        </div>
                        {formPlan.nivelAcceso !== 'Visitas' ? (
                          <div className="col-md-6">
                            <label className="etiqueta-campo">Precio Mensual Base (Para mostrar ahorro)</label>
                            <input type="number" className="finanzas-input" value={formPlan.precioReferenciaMensual} onChange={e => setFormPlan({ ...formPlan, precioReferenciaMensual: e.target.value })} placeholder="Opcional. Ej: 800" />
                          </div>
                        ) : (
                          <div className="col-md-6">
                            {/* Espaciador para mantener alineación */}
                          </div>
                        )}

                        <div className="col-12 d-flex flex-column gap-2 mt-2 p-3 rounded" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)' }}>
                          {formPlan.nivelAcceso !== 'Visitas' && (
                            <div className="form-check form-switch">
                              <input className="form-check-input bg-warning border-warning" type="checkbox" id="reqInsc" checked={formPlan.requiereInscripcion} onChange={e => setFormPlan({ ...formPlan, requiereInscripcion: e.target.checked })} />
                              <label className="form-check-label text-warning fw-bold ms-2" htmlFor="reqInsc"><i className="fas fa-crown me-1"></i>Requiere Inscripción Anual (Suma Racha de Lealtad)</label>
                            </div>
                          )}
                          <div className="form-check form-switch">
                            <input className="form-check-input" type="checkbox" id="permScore" checked={formPlan.permiteScore} onChange={e => setFormPlan({ ...formPlan, permiteScore: e.target.checked })} />
                            <label className="form-check-label text-light ms-2" htmlFor="permScore">Permitir subir Scores a la Pizarra</label>
                          </div>
                          <div className="form-check form-switch">
                            <input className="form-check-input" type="checkbox" id="incGym" checked={formPlan.incluyeGym} onChange={e => setFormPlan({ ...formPlan, incluyeGym: e.target.checked })} />
                            <label className="form-check-label text-light ms-2" htmlFor="incGym">Incluye Open Gym

                            </label>
                          </div>
                          <div className="form-check form-switch">
                            <input className="form-check-input" type="checkbox" id="esVis" checked={formPlan.esVisible} onChange={e => setFormPlan({ ...formPlan, esVisible: e.target.checked })} />
                            <label className="form-check-label text-light ms-2" htmlFor="esVis">Visible en la App para atletas</label>
                          </div>
                        </div>

                      </div>
                      <button type="submit" className="finanzas-btn-submit w-100 mt-4" textoProcesando="Creando...">
                        <i className="fas fa-plus-circle me-2"></i>Guardar Nuevo Plan</button>
                    </form>
                  </div>
                </div>
                <div className="col-md-7">
                  <div className="finanzas-card">
                    <div className="finanzas-card-titulo"><i className="fas fa-list" style={{ color: 'var(--accent-cool)' }}></i>Planes Existentes</div>
                    {planes.map(p => (
                      <div key={p.idPlan} className="finanzas-plan-item">
                        <div style={{ flex: 1 }}><div className="finanzas-plan-nombre">{p.nombre}</div></div>
                        <div className="d-flex align-items-center gap-2">
                          <span className="finanzas-plan-precio">${p.precio}</span>
                          <button className="finanzas-plan-btn finanzas-plan-btn--edit" onClick={() => iniciarEdicionPlan(p)}><i className="fas fa-pen"></i></button>
                          <BotonSeguro onClick={() => eliminarPlan(p.idPlan)} className="finanzas-plan-btn finanzas-plan-btn--delete" textoProcesando=""><i className="fas fa-trash"></i></BotonSeguro>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB: PROMOS (DESCUENTOS) */}
            {pestaña === 'descuentos' && (
              <div className="row g-4">
                <div className="col-md-5">
                  <div className="finanzas-card">
                    <div className="finanzas-card-titulo">
                      <i className="fas fa-tags" style={{ color: 'var(--accent-cool)' }}></i>Crear Promoción
                    </div>
                    <form onSubmit={crearDescuento}>
                      <div className="mb-3">
                        <label className="etiqueta-campo">Nombre (Ej. 'Buen Fin', 'Estudiante')</label>
                        <input type="text" className="finanzas-input" value={formDescuento.nombre} onChange={e => setFormDescuento({ ...formDescuento, nombre: e.target.value })} required />
                      </div>
                      <div className="mb-4">
                        <label className="etiqueta-campo">Porcentaje de Descuento (%)</label>
                        <input type="number" className="finanzas-input" value={formDescuento.porcentaje} onChange={e => setFormDescuento({ ...formDescuento, porcentaje: e.target.value })} required />
                      </div>
                      <button type="submit" className="finanzas-btn-submit finanzas-btn-submit--warning w-100" disabled={loading}>
                        <i className="fas fa-save me-2"></i>Guardar Promoción
                      </button>
                    </form>
                  </div>
                </div>

                <div className="col-md-7">
                  <div className="finanzas-card">
                    <div className="finanzas-card-titulo">
                      <i className="fas fa-list" style={{ color: 'var(--accent-cool)' }}></i>Promociones Existentes
                    </div>
                    {descuentos.length === 0 ? (
                      <div className="finanzas-empty"><p>No hay promociones creadas.</p></div>
                    ) : (
                      descuentos.map(d => (
                        <div key={d.idDescuento} className="finanzas-plan-item" style={{ opacity: d.activo ? 1 : 0.5 }}>
                          <div style={{ flex: 1 }}>
                            <div className="finanzas-plan-nombre">{d.nombre}</div>
                          </div>
                          <div className="d-flex align-items-center gap-3">
                            <span className="finanzas-plan-precio text-warning">-{d.porcentaje}%</span>

                            <div className="form-check form-switch m-0">
                              <input
                                className="form-check-input bg-success border-success"
                                type="checkbox"
                                checked={d.activo}
                                onChange={() => toggleDescuento(d.idDescuento)}
                                title={d.activo ? 'Desactivar' : 'Activar'}
                              />
                            </div>

                            <button className="finanzas-plan-btn finanzas-plan-btn--edit" onClick={() => editarDescuento(d.idDescuento, d.nombre, d.porcentaje)}>
                              <i className="fas fa-pen"></i>
                            </button>
                            <button className="finanzas-plan-btn finanzas-plan-btn--delete" onClick={() => eliminarDescuento(d.idDescuento)}>
                              <i className="fas fa-trash"></i>
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB: DROP-IN (V3 — Modal) */}
            {pestaña === 'dropin' && (
              <div className="row g-4">
                {/* PANEL LATERAL CON BOTÓN */}
                <div className="col-12 col-lg-4 align-self-lg-start">
                  <div className="finanzas-card finanzas-dropin-panel sticky-top h-auto" style={{ top: '80px' }}>
                    <div className="finanzas-dropin-panel__icono-wrap">
                      <i className="fas fa-plane-arrival"></i>
                    </div>
                    <h3 className="finanzas-dropin-panel__titulo">Registrar Drop-In</h3>
                    <p className="finanzas-dropin-panel__desc">
                      Registra a un turista en una clase del día y cobra el pago en mostrador.
                    </p>
                    <button type="button" className="finanzas-btn-submit finanzas-btn-submit--warning w-100" onClick={() => { if (atletasConVisitas.length > 0) setShowChooserRegistro(true); else abrirModalDropIn(); }}>
                      <i className="fas fa-plus me-2"></i>Registrar Drop-In
                    </button>
                  </div>
                </div>

                {/* LISTA DE RESERVAS Y PAGOS (EL CONCENTRADOR) */}
                <div className="col-12 col-lg-8">
                  <div className="finanzas-card">
                    <div className="finanzas-card-titulo">
                      <i className="fas fa-list-alt text-success"></i> Lista de Turistas Recientes
                    </div>
                    {loadingDropins ? <div className="text-center py-4"><AtletifyLoader /></div> : (
                      <>
                        {/* Vista móvil: tarjetas */}
                        <div className="d-lg-none">
                          {listaDropins.length === 0 ? (
                            <div className="finanzas-empty py-4 text-center">No hay flujo de turistas recientemente.</div>
                          ) : listaDropins.map(v => (
                            <div key={v.idVisita} className="finanzas-card mb-2 p-3 h-auto">
                              <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
                                <div>
                                  <div className="fw-bold text-white">{v.nombreAtletaExterno}</div>
                                  <div className="small text-secondary">{v.correo}</div>
                                  <div className="small text-secondary mt-1">
                                    <i className="fas fa-calendar me-1"></i>
                                    {new Date((v.fechaProgramada || '').split('T')[0] + 'T12:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}
                                    {' · '}{v.horaClase ? v.horaClase : v.tipoVisita === 'SoloGym' ? 'Open Gym' : 'Admin'}
                                  </div>
                                </div>
                                <span className={`badge ${v.tipoVisita === 'Clase' ? 'bg-danger' : 'bg-warning text-dark'} rounded-pill`}>
                                  {v.tipoVisita === 'Clase' ? v.claseNombre : 'Open Gym'}
                                </span>
                              </div>
                              <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                                {v.estatus === 'Pendiente' ? (
                                  <span className="badge bg-secondary border border-secondary text-white rounded-pill"><i className="fas fa-clock me-1"></i>Pendiente</span>
                                ) : (
                                  <span className="badge bg-success bg-opacity-25 border border-success text-success rounded-pill"><i className="fas fa-check-circle me-1"></i>Pagado <small>({v.estatus === 'Pagado_Efectivo' ? 'Efectivo' : v.estatus === 'Pagado_Tarjeta' ? 'Tarjeta' : v.estatus === 'Pagado_Transferencia' ? 'Transfer.' : 'Online'})</small></span>
                                )}
                                {v.estatus === 'Pendiente' && (
                                  <div className="d-flex flex-wrap gap-1">
                                    <BotonSeguro onClick={() => aprobarDropIn(v.idVisita, 'Efectivo')} className="btn btn-sm btn-outline-success fw-bold" textoProcesando="Ok..">
                                      <i className="fas fa-money-bill-wave"></i>
                                    </BotonSeguro>
                                    <BotonSeguro onClick={() => aprobarDropIn(v.idVisita, 'Tarjeta')} className="btn btn-sm btn-outline-info fw-bold" textoProcesando="Ok..">
                                      <i className="fas fa-credit-card"></i>
                                    </BotonSeguro>
                                    <BotonSeguro onClick={() => aprobarDropIn(v.idVisita, 'Transferencia')} className="btn btn-sm btn-outline-primary fw-bold" textoProcesando="Ok..">
                                      <i className="fas fa-exchange-alt"></i>
                                    </BotonSeguro>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Vista escritorio: tabla */}
                        <div className="table-responsive d-none d-lg-block">
                          <table className="finanzas-table align-middle">
                            <thead>
                              <tr>
                                <th>Fecha / Hora</th>
                                <th>Atleta (Correo)</th>
                                <th>Visita</th>
                                <th>Estado</th>
                                <th className="text-end">Acción</th>
                              </tr>
                            </thead>
                            <tbody>
                              {listaDropins.length === 0 ? (
                                <tr><td colSpan="5"><div className="finanzas-empty py-4 text-center">No hay flujo de turistas recientemente.</div></td></tr>
                              ) : (
                                listaDropins.map(v => (
                                  <tr key={v.idVisita}>
                                    <td>
                                      <div className="fw-bold text-white">{new Date((v.fechaProgramada || '').split('T')[0] + 'T12:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}</div>
                                      <div className="small text-secondary">{v.horaClase ? v.horaClase : v.tipoVisita === 'SoloGym' ? 'Open Gym' : 'Admin'}</div>
                                    </td>
                                    <td>
                                      <div className="fw-bold">{v.nombreAtletaExterno}</div>
                                      <div className="small text-secondary">{v.correo} ({v.nivelAtleta})</div>
                                    </td>
                                    <td>
                                      <span className={`badge ${v.tipoVisita === 'Clase' ? 'bg-danger' : 'bg-warning text-dark'} rounded-pill`}>
                                        {v.tipoVisita === 'Clase' ? v.claseNombre : 'Open Gym'}
                                      </span>
                                    </td>
                                    <td>
                                      {v.estatus === 'Pendiente' ? (
                                        <span className="badge bg-secondary border border-secondary text-white rounded-pill"><i className="fas fa-clock me-1"></i>Pendiente</span>
                                      ) : (
                                        <span className="badge bg-success bg-opacity-25 border border-success text-success rounded-pill"><i className="fas fa-check-circle me-1"></i>Pagado <small>({v.estatus === 'Pagado_Efectivo' ? 'Efectivo' : v.estatus === 'Pagado_Tarjeta' ? 'Tarjeta' : v.estatus === 'Pagado_Transferencia' ? 'Transfer.' : 'Online'})</small></span>
                                      )}
                                    </td>
                                    <td className="text-end">
                                      {v.estatus === 'Pendiente' && (
                                        <div className="d-flex flex-wrap gap-2 justify-content-end">
                                          <BotonSeguro onClick={() => aprobarDropIn(v.idVisita, 'Efectivo')} className="btn btn-sm btn-outline-success fw-bold" textoProcesando="Ok..">
                                            <i className="fas fa-money-bill-wave me-1"></i> Efectivo
                                          </BotonSeguro>
                                          <BotonSeguro onClick={() => aprobarDropIn(v.idVisita, 'Tarjeta')} className="btn btn-sm btn-outline-info fw-bold" textoProcesando="Ok..">
                                            <i className="fas fa-credit-card me-1"></i> Tarjeta
                                          </BotonSeguro>
                                          <BotonSeguro onClick={() => aprobarDropIn(v.idVisita, 'Transferencia')} className="btn btn-sm btn-outline-primary fw-bold" textoProcesando="Ok..">
                                            <i className="fas fa-exchange-alt me-1"></i> Transf.
                                          </BotonSeguro>
                                        </div>
                                      )}
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB: PAQUETES VISITAS */}
            {pestaña === 'paquetes' && (
              <div className="finanzas-card h-auto p-4 mb-4">
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <div className="finanzas-card-titulo mb-0"><i className="fas fa-ticket-alt" style={{ color: 'var(--nap-visitas, #10B981)' }}></i> Paquetes de Visitas Comprados</div>
                </div>

                {loadingPaquetes ? (
                  <div className="text-center py-5"><AtletifyLoader /></div>
                ) : listaPaquetes.length === 0 ? (
                  <div className="finanzas-empty">
                    <i className="fas fa-ticket-alt finanzas-empty-icon" style={{ opacity: 0.2 }}></i>
                    <p>No hay paquetes de visitas activos en este momento.</p>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table finanzas-table align-middle">
                      <thead>
                        <tr>
                          <th>Atleta</th>
                          <th>Paquete</th>
                          <th>Visitas Restantes</th>
                          <th>Fecha Compra</th>
                          <th>Caduca</th>
                        </tr>
                      </thead>
                      <tbody>
                        {listaPaquetes.map(p => {
                          const quedanPocas = p.visitasRestantes <= 2 && p.visitasRestantes > 0;
                          const agotado = p.visitasRestantes <= 0;
                          return (
                            <tr key={p.idSuscripcion}>
                              <td>
                                <div className="fw-bold">{p.nombreAtleta}</div>
                                <span className={`badge ${p.estatus === 'Activa' ? 'bg-success' : 'bg-warning text-dark'} bg-opacity-25 border border-${p.estatus === 'Activa' ? 'success text-success' : 'warning text-warning'} rounded-pill`} style={{ fontSize: '0.65rem' }}>{p.estatus}</span>
                              </td>
                              <td className="text-white fw-medium">{p.nombrePaquete}</td>
                              <td>
                                <div className="d-flex align-items-center gap-2">
                                  <div className={`px-3 py-1 rounded-pill fw-bold ${agotado ? 'bg-danger bg-opacity-25 text-danger' : quedanPocas ? 'bg-warning bg-opacity-25 text-warning' : 'bg-success bg-opacity-25 text-success'}`} style={{ border: '1px solid currentColor' }}>
                                    {p.visitasRestantes} / {p.visitasTotales}
                                  </div>
                                </div>
                              </td>
                              <td className="text-secondary small">{new Date(p.fechaInicio).toLocaleDateString()}</td>
                              <td className="text-secondary small">
                                {new Date(p.fechaVencimiento).toLocaleDateString()}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB: MOVIMIENTOS */}
            {pestaña === 'movimientos' && (
              <div className="mov-section">
                {resumenMov && (
                  <div className="mov-resumen-row">
                    <div className="mov-resumen-total"><span className="mov-resumen-total-label">Total del período</span><span className="mov-resumen-total-valor">${resumenMov.totalGeneral?.toFixed(2)}</span></div>
                  </div>
                )}
                <div className="mov-filtros mb-3">
                  <div className="row g-2">
                    <div className="col-12 col-md-4"><div className="mov-search-wrapper"><i className="fas fa-search mov-search-icon"></i><input type="text" className="finanzas-input mov-search-input" placeholder="Buscar..." value={busquedaMov} onChange={e => setBusquedaMov(e.target.value)} /></div></div>
                    <div className="col-6 col-md-4"><TipoMovimientoPicker valor={filtroTipoMov} onCambiar={setFiltroTipoMov} /></div>
                    <div className="col-6 col-md-4"><FiltroMesAnoPicker valor={filtroMes} onCambiar={setFiltroMes} /></div>
                  </div>
                </div>
                {loadingMov ? <div className="text-center py-5"><AtletifyLoader /></div> : (
                  <>
                    {/* Vista móvil: tarjetas */}
                    <div className="d-md-none">
                      {movimientosFiltrados.length === 0 ? (
                        <div className="finanzas-empty"><p>No hay movimientos que coincidan con la búsqueda.</p></div>
                      ) : movimientosFiltrados.map((m, i) => (
                        <div key={i} className="finanzas-card mb-2 p-3 h-auto">
                          <div className="d-flex justify-content-between align-items-center mb-1">
                            <span className="small text-secondary">{new Date(m.fecha).toLocaleDateString()}</span>
                            <span className={`mov-badge ${getBadgeMov(m.tipo)}`}>{m.tipo}</span>
                          </div>
                          <div className="fw-bold text-white">{m.nombreAtleta}</div>
                          <div className="d-flex justify-content-between align-items-center mt-1">
                            <span className="small text-secondary">{m.metodoPago}</span>
                            <span className="text-success fw-bold">{m.esCupon ? 'Cupón de visita' : `$${m.monto?.toFixed(2)}`}</span>
                          </div>
                          {m.comisionStripe != null && (
                            <div className="text-secondary mt-1" style={{ fontSize: '0.72rem' }}>
                              Bruto ${m.montoBruto?.toFixed(2)} · Comisión Stripe -${m.comisionStripe?.toFixed(2)}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Vista escritorio: tabla */}
                    <div className="finanzas-card p-0 overflow-hidden d-none d-md-block">
                      <table className="finanzas-table">
                        <thead><tr><th>Fecha</th><th>Atleta</th><th>Tipo</th><th>Método</th><th style={{ textAlign: 'right' }}>Monto</th></tr></thead>
                        <tbody>
                          {movimientosFiltrados.length === 0 ? (
                            <tr><td colSpan="5"><div className="finanzas-empty"><p>No hay movimientos que coincidan con la búsqueda.</p></div></td></tr>
                          ) : (
                            movimientosFiltrados.map((m, i) => (
                              <tr key={i}>
                                <td>{new Date(m.fecha).toLocaleDateString()}</td>
                                <td>{m.nombreAtleta}</td>
                                <td><span className={`mov-badge ${getBadgeMov(m.tipo)}`}>{m.tipo}</span></td>
                                <td>{m.metodoPago}</td>
                                <td className="text-end text-success fw-bold">
                                  {m.esCupon ? 'Cupón de visita' : `$${m.monto?.toFixed(2)}`}
                                  {m.comisionStripe != null && (
                                    <div className="text-secondary fw-normal" style={{ fontSize: '0.7rem' }}>
                                      Bruto ${m.montoBruto?.toFixed(2)} · Comisión -${m.comisionStripe?.toFixed(2)}
                                    </div>
                                  )}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* TAB: SOLICITUDES */}
            {pestaña === 'solicitudes' && (
              <div className="finanzas-card">
                <div className="finanzas-card-titulo">
                  <i className="fas fa-file-invoice-dollar" style={{ color: 'var(--accent-cool)' }}></i> Solicitudes de Cambio de Facturación
                </div>
                {loadingSolicitudes ? (
                  <div className="text-center py-4"><AtletifyLoader /></div>
                ) : solicitudes.length === 0 ? (
                  <div className="finanzas-empty py-4 text-center">No hay solicitudes pendientes de validación.</div>
                ) : (
                  <>
                    {/* Tarjetas Móvil */}
                    <div className="d-md-none">
                      {solicitudes.map(s => (
                        <div key={s.idSuscripcion} className="finanzas-card mb-2 p-3 h-auto" style={{ border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                          <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
                            <div>
                              <div className="fw-bold text-white">{s.nombreAtleta}</div>
                              <div className="small text-secondary">{s.nombrePlan}</div>
                              <div className="small text-secondary mt-1">
                                <i className="fas fa-calendar me-1"></i>
                                {new Date(s.fechaSolicitudCambio).toLocaleDateString()}
                              </div>
                            </div>
                            <span className="badge bg-warning text-dark font-stats" style={{ fontSize: '0.85rem' }}>
                              ${s.montoPendiente?.toFixed(2)}
                            </span>
                          </div>
                          
                          <div className="p-2 rounded mb-3" style={{ background: 'rgba(0,0,0,0.2)', fontSize: '0.8rem' }}>
                            <div className="text-secondary small mb-1">Cambio Solicitado:</div>
                            <div className="d-flex align-items-center gap-2 flex-wrap">
                              <span className="text-muted">{s.periodoFacturacion} ({s.metodoPago})</span>
                              <i className="fas fa-arrow-right text-success"></i>
                              <span className="text-white fw-bold">{s.cambioPeriodoPendiente} ({s.metodoPagoPendiente})</span>
                            </div>
                          </div>

                          {s.metodoPagoPendiente === 'Transferencia' && s.comprobanteUrlPendiente && (
                            <div className="mb-3">
                              <div className="text-secondary small mb-1">Comprobante de Transferencia:</div>
                              <img 
                                src={s.comprobanteUrlPendiente.startsWith('http') ? s.comprobanteUrlPendiente : `${import.meta.env.VITE_API_URL}${s.comprobanteUrlPendiente}`}
                                alt="Miniatura" 
                                className="img-thumbnail bg-dark border-secondary cursor-pointer" 
                                style={{ maxHeight: '80px', cursor: 'zoom-in', objectFit: 'cover' }}
                                onClick={() => setFotoModalUrl(s.comprobanteUrlPendiente)}
                              />
                            </div>
                          )}

                          <div className="d-flex gap-2">
                            <BotonSeguro 
                              onClick={() => manejarAprobar(s.idSuscripcion)} 
                              className="btn btn-success btn-sm w-50 fw-bold"
                              textoProcesando="Aprobando..."
                            >
                              <i className="fas fa-check me-1"></i> Aprobar
                            </BotonSeguro>
                            <BotonSeguro 
                              onClick={() => manejarRechazar(s.idSuscripcion)} 
                              className="btn btn-danger btn-sm w-50 fw-bold"
                              textoProcesando="Rechazando..."
                            >
                              <i className="fas fa-times me-1"></i> Rechazar
                            </BotonSeguro>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Tabla Escritorio */}
                    <div className="table-responsive d-none d-md-block">
                      <table className="finanzas-table align-middle">
                        <thead>
                          <tr>
                            <th>Fecha</th>
                            <th>Atleta</th>
                            <th>Plan</th>
                            <th>Cambio Propuesto</th>
                            <th>Comprobante</th>
                            <th>Monto</th>
                            <th className="text-end">Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {solicitudes.map(s => (
                            <tr key={s.idSuscripcion}>
                              <td>{new Date(s.fechaSolicitudCambio).toLocaleDateString()}</td>
                              <td><div className="fw-bold">{s.nombreAtleta}</div></td>
                              <td><span className="text-secondary">{s.nombrePlan}</span></td>
                              <td>
                                <div className="d-flex align-items-center gap-2">
                                  <span className="text-muted small">{s.periodoFacturacion} ({s.metodoPago})</span>
                                  <i className="fas fa-long-arrow-alt-right text-success"></i>
                                  <span className="text-white fw-bold small">{s.cambioPeriodoPendiente} ({s.metodoPagoPendiente})</span>
                                </div>
                              </td>
                              <td>
                                {s.metodoPagoPendiente === 'Transferencia' && s.comprobanteUrlPendiente ? (
                                  <img 
                                    src={s.comprobanteUrlPendiente.startsWith('http') ? s.comprobanteUrlPendiente : `${import.meta.env.VITE_API_URL}${s.comprobanteUrlPendiente}`}
                                    alt="Miniatura" 
                                    className="img-thumbnail bg-dark border-secondary cursor-pointer" 
                                    style={{ maxHeight: '50px', maxWidth: '80px', cursor: 'zoom-in', objectFit: 'cover' }}
                                    onClick={() => setFotoModalUrl(s.comprobanteUrlPendiente)}
                                    title="Click para ampliar"
                                  />
                                ) : (
                                  <span className="text-secondary small"><i className="fas fa-wallet me-1"></i>En Recepción</span>
                                )}
                              </td>
                              <td className="text-success fw-bold font-stats">${s.montoPendiente?.toFixed(2)}</td>
                              <td className="text-end">
                                <div className="d-flex gap-2 justify-content-end">
                                  <BotonSeguro 
                                    onClick={() => manejarAprobar(s.idSuscripcion)} 
                                    className="btn btn-success btn-sm fw-bold px-3"
                                    textoProcesando="Aprobando..."
                                  >
                                    <i className="fas fa-check me-1"></i> Aprobar
                                  </BotonSeguro>
                                  <BotonSeguro 
                                    onClick={() => manejarRechazar(s.idSuscripcion)} 
                                    className="btn btn-danger btn-sm fw-bold px-3"
                                    textoProcesando="Rechazando..."
                                  >
                                    <i className="fas fa-times me-1"></i> Rechazar
                                  </BotonSeguro>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── MODAL 1: SELECCIONAR PLAN A RENOVAR ── */}
      {showModal && atletaARenovar && (
        <div className="finanzas-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="finanzas-modal" onClick={e => e.stopPropagation()}>
            <h3 className="finanzas-modal-titulo"><i className="fas fa-sync-alt me-2"></i>Renovar Suscripción</h3>
            <p className="finanzas-modal-sub">Atleta: <strong>{atletaARenovar.nombre}</strong></p>
            <label className="etiqueta-campo">Selecciona el Plan a Cobrar</label>
            <SelectorPlanPicker planes={planes} valor={planSeleccionado} onCambiar={setPlanSeleccionado} />
            <div className="finanzas-modal-btns">
              <button className="finanzas-modal-btn-cancel" onClick={() => setShowModal(false)}>Cancelar</button>
              <button className="finanzas-modal-btn-cobrar" onClick={abrirPuntoDePago} disabled={!planSeleccionado}><i className="fas fa-cash-register me-1"></i>Continuar al Cobro</button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 2: PUNTO DE VENTA V3 ── */}
      {showModalCobro && atletaARenovar && (
        <div className="finanzas-modal-overlay" onClick={() => setShowModalCobro(false)}>
          <div className="finanzas-modal" style={{ maxWidth: '450px' }} onClick={e => e.stopPropagation()}>
            <p className="finanzas-pdv-titulo text-success fw-bold"><i className="fas fa-cash-register me-2"></i>Punto de Venta</p>
            <p className="finanzas-modal-sub mb-3">Atleta: <strong>{atletaARenovar.nombre}</strong></p>

            <form onSubmit={procesarRenovacionConPago}>
              <div className="mb-3">
                <label className="etiqueta-campo">Aplicar Promoción</label>
                <PromocionPicker descuentos={descuentosActivos} valor={formCobro.idDescuento} onCambiar={v => setFormCobro({ ...formCobro, idDescuento: v })} />
              </div>

              <div className="form-check form-switch mb-2">
                <input className="form-check-input bg-warning border-warning" type="checkbox" id="checkInsc" checked={formCobro.cobrarInscripcion} onChange={e => setFormCobro({ ...formCobro, cobrarInscripcion: e.target.checked })} />
                <label className="form-check-label text-warning" htmlFor="checkInsc">Cobrar Inscripción</label>
              </div>

              {/* 👇 APARECE SOLO SI SE PRENDE EL SWITCH 👇 */}
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

              <div className="finanzas-pdv-total-box mb-3 p-3 bg-dark border border-success rounded">
                {descuentoPersonalMonto > 0 && (
                  <div className="d-flex justify-content-between mb-1">
                    <small style={{ color: '#9b59b6' }}><i className="fas fa-gem me-1"></i>{descuentoPersonalTexto}</small>
                    <small style={{ color: '#9b59b6', fontWeight: 600 }}>-${descuentoPersonalMonto.toFixed(2)}</small>
                  </div>
                )}
                {descuentoPromo > 0 && (
                  <div className="d-flex justify-content-between mb-1">
                    <small style={{ color: 'var(--warning)' }}><i className="fas fa-tags me-1"></i>{descSeleccionado?.nombre}</small>
                    <small style={{ color: 'var(--warning)', fontWeight: 600 }}>-${descuentoPromo.toFixed(2)}</small>
                  </div>
                )}
                {costoInscripcion > 0 && (
                  <div className="d-flex justify-content-between mb-1">
                    <small style={{ color: 'var(--warning)' }}><i className="fas fa-id-card me-1"></i>Inscripción</small>
                    <small style={{ color: 'var(--warning)', fontWeight: 600 }}>+${costoInscripcion.toFixed(2)}</small>
                  </div>
                )}
                {recargoMonto > 0 && (
                  <div className="d-flex justify-content-between mb-1">
                    <small style={{ color: 'var(--danger)' }}><i className="fas fa-exclamation-triangle me-1"></i>Recargo por Pago Tardío</small>
                    <small style={{ color: 'var(--danger)', fontWeight: 600 }}>+${recargoMonto.toFixed(2)}</small>
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
                  <input type="number" step="0.01" className="entrada-oscura fw-bold" required value={formCobro.monto1} onChange={e => {
                    const val = e.target.value;
                    if (val === '' || parseFloat(val) <= totalACobrar) {
                      setFormCobro({ ...formCobro, monto1: val });
                    }
                  }} placeholder={`Ej. ${totalACobrar.toFixed(2)}`} />
                </div>
              </div>

              {restante > 0 && formCobro.monto1 !== '' && (
                <div className="row g-2 mb-3 p-2 rounded" style={{ backgroundColor: 'rgba(52, 152, 219, 0.1)', border: '1px solid rgba(52, 152, 219, 0.3)' }}>
                  <div className="col-12"><small className="text-info fw-bold"><i className="fas fa-split me-1"></i>Falta cubrir ${restante}</small></div>
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
                <button type="button" onClick={() => setShowModalCobro(false)} className="finanzas-modal-btn-cancel w-50">Cancelar</button>
                <BotonSeguro type="button" onClick={procesarRenovacionConPago} className="btn btn-success w-50" textoProcesando="Activando...">
                  <i className="fas fa-check me-1"></i>Activar Plan
                </BotonSeguro>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* ── MODAL 3: EDICIÓN SUPREMA DE PLANES ── */}
      {showModalEditPlan && (
        <div className="finanzas-modal-overlay" onClick={() => setShowModalEditPlan(false)}>
          <div className="finanzas-modal-card" style={{ maxWidth: '640px' }} onClick={e => e.stopPropagation()}>
            <div className="finanzas-modal-header">
              <h5 className="finanzas-modal-titulo"><i className="fas fa-pen me-2 text-warning"></i>Editar Plan</h5>
              <button className="finanzas-modal-close" onClick={() => setShowModalEditPlan(false)}><i className="fas fa-times"></i></button>
            </div>
            <form onSubmit={guardarEdicionPlan}>
              <div className="row g-3">
                <div className="col-md-8">
                  <label className="etiqueta-campo">Nombre del Plan</label>
                  <input type="text" className="finanzas-input" value={formEditPlan.nombre} onChange={e => setFormEditPlan({ ...formEditPlan, nombre: e.target.value })} required />
                </div>
                <div className="col-md-4">
                  <label className="etiqueta-campo">Precio ($)</label>
                  <input type="number" className="finanzas-input" value={formEditPlan.precio} onChange={e => setFormEditPlan({ ...formEditPlan, precio: e.target.value })} required />
                </div>

                {formEditPlan.nivelAcceso !== 'Visitas' ? (
                  <div className="col-md-6">
                    <label className="etiqueta-campo">Duración (Días)</label>
                    <DuracionPlanPicker valor={formEditPlan.duracionDias} onCambiar={v => setFormEditPlan({ ...formEditPlan, duracionDias: v })} />
                  </div>
                ) : (
                  <div className="col-md-6">
                    <label className="etiqueta-campo">Caducidad</label>
                    <div className="finanzas-input d-flex align-items-center bg-success bg-opacity-10 text-success fw-bold border-success" style={{ cursor: 'not-allowed' }}>
                      <i className="fas fa-calendar-check me-2"></i> 1 Año (Automático)
                    </div>
                  </div>
                )}
                <div className="col-md-6">
                  <label className="etiqueta-campo">{formEditPlan.nivelAcceso === 'Visitas' ? 'Número de Visitas Incluidas' : 'Límite de Visitas (Vacío = Ilimitado)'}</label>
                  <input type="number" className="finanzas-input" required={formEditPlan.nivelAcceso === 'Visitas'} value={formEditPlan.limiteClasesMensual} onChange={e => setFormEditPlan({ ...formEditPlan, limiteClasesMensual: e.target.value })} placeholder={formEditPlan.nivelAcceso === 'Visitas' ? "Ej. 10 (Obligatorio)" : "Ej. 4 para Cuponeras"} />
                </div>

                <div className="col-12">
                  <label className="etiqueta-campo">Descripción Comercial (Visible para Atletas)</label>
                  <input type="text" className="finanzas-input" placeholder="Ej. Acceso a pesas y regaderas" value={formEditPlan.descripcion} onChange={e => setFormEditPlan({ ...formEditPlan, descripcion: e.target.value })} />
                </div>

                {/* LOS NUEVOS CAMPOS DE EDWIN */}
                <div className="col-12 mt-3 mb-1"><hr style={{ borderColor: 'rgba(255,255,255,0.1)' }} /> <p className="text-secondary small fw-bold mb-0"><i className="fas fa-cogs me-1"></i> CONFIGURACIÓN AVANZADA</p></div>

                <div className="col-md-6">
                  <label className="etiqueta-campo">Nivel de Acceso</label>
                  <NivelAccesoPicker valor={formEditPlan.nivelAcceso} onCambiar={v => setFormEditPlan({ ...formEditPlan, nivelAcceso: v })} />
                </div>
                <div className="col-md-6">
                  <label className="etiqueta-campo">Prioridad de Reserva</label>
                  <input type="number" className="finanzas-input" value={formEditPlan.prioridadReserva} onChange={e => setFormEditPlan({ ...formEditPlan, prioridadReserva: e.target.value })} min="1" title="1 es lo más alto" />
                </div>

                <div className="col-12 d-flex flex-column gap-2 mt-2 p-3 rounded" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  {formEditPlan.nivelAcceso !== 'Visitas' && (
                    <div className="form-check form-switch">
                      <input className="form-check-input" type="checkbox" id="editReqInsc" checked={formEditPlan.requiereInscripcion} onChange={e => setFormEditPlan({ ...formEditPlan, requiereInscripcion: e.target.checked })} />
                      <label className="form-check-label text-light ms-2" htmlFor="editReqInsc">Requiere pagar Inscripción Anual</label>
                    </div>
                  )}
                  <div className="form-check form-switch">
                    <input className="form-check-input" type="checkbox" id="editPermScore" checked={formEditPlan.permiteScore} onChange={e => setFormEditPlan({ ...formEditPlan, permiteScore: e.target.checked })} />
                    <label className="form-check-label text-light ms-2" htmlFor="editPermScore">Permitir subir Scores a la Pizarra</label>
                  </div>
                  <div className="form-check form-switch">
                    <input className="form-check-input" type="checkbox" id="editEsVis" checked={formEditPlan.esVisible} onChange={e => setFormEditPlan({ ...formEditPlan, esVisible: e.target.checked })} />
                    <label className="form-check-label text-light ms-2" htmlFor="editEsVis">Visible en la App para nuevos atletas</label>
                  </div>
                </div>

              </div>

              <div className="finanzas-modal-btns d-flex gap-2 mt-4">
                <button type="button" onClick={() => setShowModalEditPlan(false)} className="finanzas-modal-btn-cancel w-50">Cancelar</button>
                <button type="submit" className="btn btn-warning w-50 text-dark fw-bold" textoProcesando="Guardando...">
                  <i className="fas fa-save me-1"></i> Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          MODALES DROP-IN ADMIN (3 pasos)
          ══════════════════════════════════════════════════════ */}
      {showModalDropIn && (
        <div className="finanzas-modal-overlay" onClick={() => setShowModalDropIn(false)}>
          <div className="finanzas-modal-card" style={{ maxWidth: '560px', width: '95%' }} onClick={e => e.stopPropagation()}>

            {/* ── ENCABEZADO ── */}
            <div className="finanzas-modal-header">
              <h5 className="finanzas-modal-titulo">
                <i className="fas fa-plane-arrival me-2 text-warning"></i>
                Registrar Drop-In
                <span className="badge bg-secondary ms-2" style={{ fontSize: '0.7rem', fontWeight: 400 }}>
                  Paso {pasoDropIn} de 3
                </span>
              </h5>
              <button className="finanzas-modal-close" onClick={() => setShowModalDropIn(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            {/* ── PASO 1: DATOS DEL TURISTA ── */}
            {pasoDropIn === 1 && (
              <div className="p-1">
                <div className="mb-3">
                  <label className="etiqueta-campo">Nombre Completo *</label>
                  <input
                    type="text"
                    className="finanzas-input"
                    placeholder="Ej. Juan García"
                    value={formDropInAdmin.nombre}
                    onChange={e => setFormDropInAdmin({ ...formDropInAdmin, nombre: e.target.value })}
                  />
                </div>
                <div className="mb-3">
                  <label className="etiqueta-campo">Correo Electrónico *</label>
                  <input
                    type="email"
                    className="finanzas-input"
                    placeholder="turista@correo.com"
                    value={formDropInAdmin.email}
                    onChange={e => setFormDropInAdmin({ ...formDropInAdmin, email: e.target.value })}
                  />
                </div>
                <div className="mb-4">
                  <label className="etiqueta-campo">Nivel del Atleta</label>
                  <CategoriaBasePicker
                    valor={formDropInAdmin.nivelAtleta}
                    onCambiar={v => setFormDropInAdmin({ ...formDropInAdmin, nivelAtleta: v })}
                  />
                </div>
                <div className="d-flex gap-2">
                  <button type="button" className="finanzas-modal-btn-cancel w-50" onClick={() => setShowModalDropIn(false)}>
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="finanzas-btn-submit finanzas-btn-submit--warning w-50"
                    onClick={() => {
                      if (!formDropInAdmin.nombre.trim() || !formDropInAdmin.email.trim())
                        return alert('Nombre y correo son obligatorios.');
                      setPasoDropIn(2);
                    }}
                  >
                    Siguiente <i className="fas fa-arrow-right ms-2"></i>
                  </button>
                </div>
              </div>
            )}

            {/* ── PASO 2: SELECCIÓN DE CLASE ── */}
            {pasoDropIn === 2 && (() => {
              const clasesHoy = clasesDisponiblesParaHoy(clasesDropIn, formDropInAdmin.nivelAtleta);
              const selId = claseSeleccionada?.tipoVisita === 'Clase' ? claseSeleccionada?.idClase : null;
              const seleccionarClase = (c) => setClaseSeleccionada({ idClase: c.idClase, tipoVisita: 'Clase', nombre: c.nombre, costo: 0 });

              return (
                <div>
                  {loadingClasesDropIn ? (
                    <div className="text-center py-4"><AtletifyLoader /></div>
                  ) : (
                    <>
                      {/* Open Gym */}
                      {(box?.costoVisitaGym > 0 || box?.CostoVisitaGym > 0) && (
                        <div className="mb-3">
                          <div className="text-secondary small fw-bold mb-2"><i className="fas fa-dumbbell me-1"></i> OPEN GYM</div>
                          <button
                            type="button"
                            onClick={() => setClaseSeleccionada({ idClase: 0, tipoVisita: 'SoloGym', nombre: 'Open Gym', costo: box?.costoVisitaGym || 0 })}
                            className={`vr-clase ${claseSeleccionada?.tipoVisita === 'SoloGym' ? 'vr-clase--sel' : ''}`}
                          >
                            <div className="vr-clase-nombre">
                              {claseSeleccionada?.tipoVisita === 'SoloGym' && <i className="fas fa-check-circle text-info"></i>}
                              Open Gym (Solo pesas)
                            </div>
                            <div className="vr-clase-meta"><i className="fas fa-dumbbell me-1"></i>Acceso libre al gimnasio</div>
                          </button>
                        </div>
                      )}

                      <div className="text-secondary small fw-bold mb-2"><i className="far fa-clock me-1"></i> CLASES DE HOY</div>
                      {clasesHoy.length === 0 ? (
                        <div className="vr-empty"><i className="fas fa-calendar-times fa-2x"></i>No hay clases disponibles para hoy.</div>
                      ) : (
                        <div style={{ maxHeight: '40vh', overflowY: 'auto' }} className="mb-2">
                          {clasesHoy.map(c => renderClaseDisponible(c, formDropInAdmin.nivelAtleta, selId, seleccionarClase))}
                        </div>
                      )}
                    </>
                  )}

                  <div className="d-flex gap-2 mt-3">
                    <button type="button" className="finanzas-modal-btn-cancel w-50" onClick={() => setPasoDropIn(1)}>
                      <i className="fas fa-arrow-left me-1"></i> Atrás
                    </button>
                    <button
                      type="button"
                      className="finanzas-btn-submit finanzas-btn-submit--warning w-50"
                      disabled={!claseSeleccionada}
                      onClick={() => setPasoDropIn(3)}
                    >
                      Siguiente <i className="fas fa-arrow-right ms-2"></i>
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* ── PASO 3: PAGO ── */}
            {pasoDropIn === 3 && (
              <div>
                <div className="p-3 rounded-3 mb-4 text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div className="text-secondary small mb-1">Turista</div>
                  <div className="fw-bold text-white">{formDropInAdmin.nombre}</div>
                  <div className="text-secondary small">{formDropInAdmin.email}</div>
                  <hr style={{ borderColor: 'rgba(255,255,255,0.08)' }} />
                  <div className="text-secondary small mb-1">Visita seleccionada</div>
                  <div className="fw-bold text-warning mb-3">
                    <i className={`fas ${claseSeleccionada?.tipoVisita === 'SoloGym' ? 'fa-dumbbell' : 'fa-running'} me-2`}></i>
                    {claseSeleccionada?.nombre || claseSeleccionada?.tipoVisita}
                  </div>
                  <div className="text-secondary text-uppercase small fw-bold mb-1" style={{ letterSpacing: '1px' }}>Total a cobrar</div>
                  <h2 className="text-success fw-bold mb-0">${claseSeleccionada?.tipoVisita === 'Clase' ? (box?.costoDropIn || 0) : (box?.costoVisitaGym || 0)} <span className="fs-6 text-white opacity-50 fw-normal">MXN</span></h2>
                </div>

                <p className="text-secondary small text-center mb-3">¿Cómo pagó el turista?</p>

                <div className="d-flex flex-column gap-2">
                  <BotonSeguro
                    onClick={() => confirmarDropInAdmin('Efectivo')}
                    className="btn btn-outline-success fw-bold py-3"
                    textoProcesando="Registrando..."
                    disabled={procesandoPago}
                    style={{ borderRadius: '12px' }}
                  >
                    <i className="fas fa-money-bill-wave me-2"></i> Efectivo
                  </BotonSeguro>
                  <BotonSeguro
                    onClick={() => confirmarDropInAdmin('Tarjeta')}
                    className="btn btn-outline-info fw-bold py-3"
                    textoProcesando="Registrando..."
                    disabled={procesandoPago}
                    style={{ borderRadius: '12px' }}
                  >
                    <i className="fas fa-credit-card me-2"></i> Tarjeta
                  </BotonSeguro>
                  <BotonSeguro
                    onClick={() => confirmarDropInAdmin('Transferencia')}
                    className="btn btn-outline-primary fw-bold py-3"
                    textoProcesando="Registrando..."
                    disabled={procesandoPago}
                    style={{ borderRadius: '12px' }}
                  >
                    <i className="fas fa-exchange-alt me-2"></i> Transferencia
                  </BotonSeguro>
                </div>

                <button type="button" className="btn btn-link text-secondary mt-3 w-100 text-decoration-none" onClick={() => setPasoDropIn(2)}>
                  <i className="fas fa-arrow-left me-1"></i> Cambiar clase
                </button>
              </div>
            )}

          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          SELECTOR: Drop-In normal vs Cajear visita de regalo
          ══════════════════════════════════════════════════════ */}
      {showChooserRegistro && (
        <div className="finanzas-modal-overlay" onClick={() => setShowChooserRegistro(false)}>
          <div className="finanzas-modal" style={{ maxWidth: '440px', width: '95%', borderTop: '3px solid var(--primary)' }} onClick={e => e.stopPropagation()}>
            <div className="finanzas-modal-header">
              <h5 className="finanzas-modal-titulo"><i className="fas fa-plus me-2 text-warning"></i>Registrar Drop-In</h5>
              <button className="finanzas-modal-close" onClick={() => setShowChooserRegistro(false)}><i className="fas fa-times"></i></button>
            </div>
            <p className="text-secondary small text-center mb-3">¿Qué quieres registrar?</p>
            <div className="d-flex flex-column gap-2">
              <button type="button" className="vr-choice vr-choice--dropin" onClick={() => { setShowChooserRegistro(false); abrirModalDropIn(); }}>
                <i className="fas fa-plane-arrival"></i> Drop-In normal (turista que paga)
              </button>
              <button type="button" className="vr-choice vr-choice--cajear" onClick={abrirModalCajear}>
                <i className="fas fa-gift"></i> Cajear visita de regalo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          MODAL CAJEAR VISITA DE REGALO (2 pasos)
          ══════════════════════════════════════════════════════ */}
      {showModalCajear && (
        <div className="finanzas-modal-overlay" onClick={() => setShowModalCajear(false)}>
          <div className="finanzas-modal-card" style={{ maxWidth: '560px', width: '95%', borderTop: '3px solid var(--primary)' }} onClick={e => e.stopPropagation()}>

            <div className="finanzas-modal-header">
              <h5 className="finanzas-modal-titulo">
                <i className="fas fa-gift me-2 text-info"></i>
                Cajear visita de regalo
                <span className="badge bg-secondary ms-2" style={{ fontSize: '0.7rem', fontWeight: 400 }}>Paso {pasoCajear} de 2</span>
              </h5>
              <button className="finanzas-modal-close" onClick={() => setShowModalCajear(false)}><i className="fas fa-times"></i></button>
            </div>

            {/* ── PASO 1: ELEGIR ATLETA CON VISITAS ── */}
            {pasoCajear === 1 && (() => {
              const atletasFiltrados = atletasConVisitas.filter(a => {
                if (!busquedaAtletaVisita.trim()) return true;
                return normalizar(`${a.nombre} ${a.apellidos} ${a.correo}`).includes(normalizar(busquedaAtletaVisita));
              });
              return (
                <div className="p-1">
                  <div style={{ position: 'relative' }} className="mb-3">
                    <i className="fas fa-search" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}></i>
                    <input
                      type="text"
                      className="finanzas-input"
                      style={{ paddingLeft: '36px' }}
                      placeholder="Buscar por nombre, apellido o correo..."
                      value={busquedaAtletaVisita}
                      onChange={e => setBusquedaAtletaVisita(e.target.value)}
                      autoFocus
                    />
                  </div>

                  {loadingAtletasVisitas ? (
                    <div className="text-center py-4"><AtletifyLoader /></div>
                  ) : atletasFiltrados.length === 0 ? (
                    <div className="vr-empty">
                      <i className="fas fa-user-slash fa-2x"></i>
                      {atletasConVisitas.length === 0 ? 'Ningún atleta tiene visitas de regalo vigentes.' : 'Sin resultados para tu búsqueda.'}
                    </div>
                  ) : (
                    <div className="d-flex flex-column gap-2" style={{ maxHeight: '52vh', overflowY: 'auto' }}>
                      {atletasFiltrados.map(a => (
                        <button
                          key={a.idUsuario}
                          type="button"
                          onClick={() => { setAtletaCajear(a); setClaseCajearSel(null); setPasoCajear(2); }}
                          className="vr-atleta"
                        >
                          <div className="vr-atleta-avatar">{String(a.nombre || '?').charAt(0).toUpperCase()}</div>
                          <div className="vr-atleta-info">
                            <div className="vr-atleta-nombre">{a.nombre} {a.apellidos}</div>
                            <div className="vr-atleta-correo">{a.correo}</div>
                          </div>
                          <span className="vr-atleta-badge"><i className="fas fa-gift"></i>{a.visitasRestantes}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="mt-3">
                    <button type="button" className="finanzas-modal-btn-cancel w-100" onClick={() => setShowModalCajear(false)}>Cancelar</button>
                  </div>
                </div>
              );
            })()}

            {/* ── PASO 2: DATOS DEL AMIGO + CLASE ── */}
            {pasoCajear === 2 && (() => {
              const clasesHoy = clasesDisponiblesParaHoy(clasesCajear, formCajear.nivelAtleta);
              const puedeConfirmar = atletaCajear && claseCajearSel && formCajear.nombre.trim() && formCajear.email.trim();

              return (
                <div className="p-1">
                  {/* Cupón del atleta */}
                  <div className="vr-cupon">
                    <div><span className="text-secondary">Cupón de:</span> <span className="fw-bold text-white">{atletaCajear?.nombre} {atletaCajear?.apellidos}</span></div>
                    <span className="vr-atleta-badge"><i className="fas fa-gift"></i>{atletaCajear?.visitasRestantes} disp.</span>
                  </div>

                  <div className="mb-3">
                    <label className="etiqueta-campo">Nombre Completo del amigo *</label>
                    <input type="text" className="finanzas-input" placeholder="Ej. Juan García" value={formCajear.nombre} onChange={e => setFormCajear({ ...formCajear, nombre: e.target.value })} />
                  </div>
                  <div className="mb-3">
                    <label className="etiqueta-campo">Correo Electrónico del amigo *</label>
                    <input type="email" className="finanzas-input" placeholder="amigo@correo.com" value={formCajear.email} onChange={e => setFormCajear({ ...formCajear, email: e.target.value })} />
                  </div>
                  <div className="mb-3">
                    <label className="etiqueta-campo">Nivel del Atleta</label>
                    <CategoriaBasePicker valor={formCajear.nivelAtleta} onCambiar={v => { setFormCajear({ ...formCajear, nivelAtleta: v }); setClaseCajearSel(null); }} />
                  </div>

                  <label className="etiqueta-campo">Clase a la que se registra (hoy)</label>
                  {loadingClasesCajear ? (
                    <div className="text-center py-4"><AtletifyLoader /></div>
                  ) : clasesHoy.length === 0 ? (
                    <div className="vr-empty"><i className="fas fa-calendar-times fa-2x"></i>No hay clases disponibles para hoy.</div>
                  ) : (
                    <div style={{ maxHeight: '34vh', overflowY: 'auto' }} className="mb-2">
                      {clasesHoy.map(c => renderClaseDisponible(c, formCajear.nivelAtleta, claseCajearSel?.idClase, setClaseCajearSel))}
                    </div>
                  )}

                  <div className="d-flex gap-2 mt-3">
                    <button type="button" className="finanzas-modal-btn-cancel w-50" onClick={() => setPasoCajear(1)}>
                      <i className="fas fa-arrow-left me-1"></i> Atrás
                    </button>
                    <BotonSeguro
                      onClick={confirmarCajear}
                      className="finanzas-btn-submit finanzas-btn-submit--warning w-50"
                      textoProcesando="Canjeando..."
                      disabled={!puedeConfirmar || procesandoCajear}
                    >
                      <i className="fas fa-gift me-2"></i> Canjear visita
                    </BotonSeguro>
                  </div>
                </div>
              );
            })()}

          </div>
        </div>
      )}

      {fotoModalUrl && (
        <div
          className="modal fade show"
          style={{ display: 'block', background: 'rgba(0,0,0,0.85)', zIndex: 1050 }}
          onClick={() => setFotoModalUrl(null)}
        >
          <div className="modal-dialog modal-dialog-centered modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-content border-0 bg-transparent text-end">
              <button 
                type="button" 
                className="btn-close btn-close-white ms-auto mb-2 fs-4" 
                onClick={() => setFotoModalUrl(null)}
                style={{ filter: 'none', color: 'white', opacity: 1, border: 'none', background: 'none' }}
              >
                <i className="fas fa-times"></i>
              </button>
              <img 
                src={fotoModalUrl.startsWith('http') ? fotoModalUrl : `${import.meta.env.VITE_API_URL}${fotoModalUrl}`} 
                alt="Comprobante de pago" 
                className="img-fluid rounded shadow-lg" 
                style={{ maxHeight: '80vh', objectFit: 'contain', width: '100%', margin: '0 auto' }}
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}