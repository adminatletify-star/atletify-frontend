import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import BackButton from '../components/BackButton';
import TipoPagoPicker from '../components/TipoPagoPicker';
import RedGrayDatePicker from '../components/RedGrayDatePicker';
import BotonSeguro from '../components/BotonSeguro';
import AtletifyLoader from '../components/AtletifyLoader';
import '../assets/css/GestionClases.css';
import '../assets/css/GestionStaff.css';

const PAGE_SIZE = 10;

const FILTRO_FECHA_OPCIONES = [
  { value: 'hoy',    label: 'Hoy',          icon: 'fa-calendar-day' },
  { value: 'ayer',   label: 'Ayer',         icon: 'fa-calendar-minus' },
  { value: 'semana', label: 'Esta Semana',  icon: 'fa-calendar-week' },
];

const DIA_CORTE_OPCIONES = [
  { value: '1', label: 'Lunes' },     { value: '2', label: 'Martes' },
  { value: '3', label: 'Miércoles' }, { value: '4', label: 'Jueves' },
  { value: '5', label: 'Viernes' },   { value: '6', label: 'Sábado' },
  { value: '7', label: 'Domingo' },
];

// GET con reintentos: los 500 transitorios del pooler de Supabase se reintentan
// con un pequeño backoff. Devuelve el JSON o null si nunca respondió OK.
async function fetchJsonRetry(url, intentos = 3) {
  for (let i = 0; i < intentos; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return await res.json();
      if (res.status < 500) return null; // 4xx → no tiene sentido reintentar
    } catch (_) { /* error de red → reintentar */ }
    await new Promise(r => setTimeout(r, 250 * (i + 1)));
  }
  return null;
}

// Procesa una lista en lotes (limita la concurrencia) para no saturar la BD
async function enLotes(items, tamanoLote, fn) {
  const out = [];
  for (let i = 0; i < items.length; i += tamanoLote) {
    const lote = items.slice(i, i + tamanoLote);
    out.push(...await Promise.all(lote.map(fn)));
  }
  return out;
}

/* ── Paginación (números desktop · compacto móvil) ── */
function buildPaginas(pagina, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const out = [1];
  if (pagina > 3) out.push('...');
  const start = Math.max(2, pagina - 1);
  const end = Math.min(total - 1, pagina + 1);
  for (let i = start; i <= end; i++) out.push(i);
  if (pagina < total - 2) out.push('...');
  out.push(total);
  return out;
}

function Paginacion({ pagina, totalPaginas, onCambio }) {
  if (totalPaginas <= 1) return null;
  return (
    <div className="staff-pag" role="navigation" aria-label="Paginación">
      <button type="button" className="staff-pag-btn" disabled={pagina === 1} onClick={() => onCambio(pagina - 1)} aria-label="Anterior">
        <i className="fas fa-chevron-left"></i>
      </button>
      <div className="staff-pag-numbers">
        {buildPaginas(pagina, totalPaginas).map((p, i) => p === '...'
          ? <span key={`e${i}`} className="staff-pag-ellipsis">…</span>
          : <button key={p} type="button" className={`staff-pag-btn ${pagina === p ? 'staff-pag-btn--active' : ''}`} onClick={() => onCambio(p)}>{p}</button>
        )}
      </div>
      <span className="staff-pag-compact">{pagina} / {totalPaginas}</span>
      <button type="button" className="staff-pag-btn" disabled={pagina === totalPaginas} onClick={() => onCambio(pagina + 1)} aria-label="Siguiente">
        <i className="fas fa-chevron-right"></i>
      </button>
    </div>
  );
}

/* ── Picker modal genérico (reemplaza a los <select> nativos) ── */
function OptionPickerModal({ supertitulo, titulo, opciones, valor, onSelect, onCerrar }) {
  return createPortal(
    <div className="staff-picker-overlay" onClick={e => { if (e.target === e.currentTarget) onCerrar(); }}>
      <div className="staff-picker-modal">
        <div className="staff-picker-header">
          <div>
            {supertitulo && <p className="staff-picker-supertitle">{supertitulo}</p>}
            <h2 className="staff-picker-title">{titulo}</h2>
          </div>
          <button type="button" className="staff-picker-close" onClick={onCerrar} aria-label="Cerrar"><i className="fas fa-times"></i></button>
        </div>
        <div className="staff-picker-list">
          {opciones.map(op => {
            const activo = String(op.value) === String(valor);
            return (
              <button
                key={op.value}
                type="button"
                className={`staff-picker-option${activo ? ' staff-picker-option--active' : ''}`}
                onClick={() => onSelect(op.value)}
              >
                {op.icon && <span className="staff-picker-option-icon"><i className={`fas ${op.icon}`}></i></span>}
                <span className="staff-picker-option-label">{op.label}</span>
                {activo && <i className="fas fa-check-circle staff-picker-check"></i>}
              </button>
            );
          })}
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function GestionStaff() {
  const navigate = useNavigate();
  const [coaches, setCoaches] = useState([]);
  const [catalogo, setCatalogo] = useState([]);
  const [loading, setLoading] = useState(true);
  const [box, setBox] = useState(null);

  // Estados para el Modal Flotante (Glassmorphism)
  const [coachSeleccionado, setCoachSeleccionado] = useState(null);
  const [modalEspVisible, setModalEspVisible] = useState(false);
  const [espSeleccionadas, setEspSeleccionadas] = useState([]); // IDs de las especialidades activas
  const [nuevaEspecialidad, setNuevaEspecialidad] = useState('');

  // 💰 Estados para el Modal de Contratos y Nómina
  const [modalContratoVisible, setModalContratoVisible] = useState(false);
  const [formContrato, setFormContrato] = useState({ tipoPago: 'PorClase', monto: 0, diaCorte: 15 });
  const [nominaActual, setNominaActual] = useState(null);
  const [asistenciasCoach, setAsistenciasCoach] = useState([]);
  const [cargandoAsistencias, setCargandoAsistencias] = useState(false);
  // ⭐ Estados para Evaluaciones
  const [modalResenasVisible, setModalResenasVisible] = useState(false);

  // Funciones de validación de fechas (Clases futuras)
  const esPasadaOHoy = (fechaStr) => {
    if (!fechaStr) return false;
    const d = new Date(fechaStr);
    const hoy = new Date();
    d.setHours(0,0,0,0);
    hoy.setHours(0,0,0,0);
    return d <= hoy;
  };
  const esFuturaManana = (fechaStr) => {
    if (!fechaStr) return false;
    const d = new Date(fechaStr);
    const hoy = new Date();
    d.setHours(0,0,0,0);
    hoy.setHours(0,0,0,0);
    return d > hoy;
  };

  const API_URL = import.meta.env.VITE_API_URL;


  // 🏖️ Estados para Ausencias
  const [modalPermisoVisible, setModalPermisoVisible] = useState(false);
  const [formPermiso, setFormPermiso] = useState({ fechaInicio: '', fechaFin: '', motivo: '', conGoceDeSueldo: false });
  const [historialPermisos, setHistorialPermisos] = useState([]);

  // 🛡️ Estados para Auditoría de Clases Global
  const [vistaActiva, setVistaActiva] = useState('directorio'); // 'directorio' | 'auditoria' | 'nomina'
  const [auditoriaClases, setAuditoriaClases] = useState([]);
  const [cargandoAuditoria, setCargandoAuditoria] = useState(false);
  const [filtroAuditoria, setFiltroAuditoria] = useState('hoy'); // 'hoy' | 'ayer' | 'semana'
  const [filtroCoachAuditoria, setFiltroCoachAuditoria] = useState('');

  // Paginación y pickers modales
  const [pagDirectorio, setPagDirectorio] = useState(1);
  const [pagAuditoria, setPagAuditoria] = useState(1);
  const [pickerActivo, setPickerActivo] = useState(null); // 'fecha' | 'coach' | 'dia-corte'

  const abrirModalPermiso = async (coach) => {
    setCoachSeleccionado(coach);
    setFormPermiso({ fechaInicio: '', fechaFin: '', motivo: '', conGoceDeSueldo: false });
    setModalPermisoVisible(true);
    try {
      const res = await fetch(`${API_URL}/nomina/permisos/${coach.idUsuario || coach.id}`);
      if (res.ok) setHistorialPermisos(await res.json());
    } catch (e) { }
  };

  const guardarPermiso = async () => {
    if (!formPermiso.fechaInicio || !formPermiso.fechaFin || !formPermiso.motivo) return alert("Llena todos los campos");
    try {
      const payload = { ...formPermiso, IdUsuario: coachSeleccionado.idUsuario || coachSeleccionado.id };
      const res = await fetch(`${API_URL}/nomina/permisos`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (res.ok) {
        alert("Ausencia registrada. ✅");
        abrirModalPermiso(coachSeleccionado); // Recargar la lista
      }
    } catch (e) { alert("Error"); }
  };

  useEffect(() => {
    const b = JSON.parse(localStorage.getItem('box'));
    const u = JSON.parse(localStorage.getItem('usuario'));

    // 1. Si de plano no es jefe, lo sacamos
    if (!u || (u.rol !== 'AdminBox' && u.rol !== 'Developer')) {
      navigate('/login');
      return;
    }

    // 2. Si es Liz (AdminBox) y perdió su box, la regresamos a su panel, NO al login
    if (u.rol === 'AdminBox' && !b) {
      navigate('/admin-box-panel');
      return;
    }

    setBox(b);
    // 3. El Developer podría no tener Box. Si no tiene, usamos el Box 1 temporalmente para que vea algo
    const idAUsar = b ? b.idBox : 1;
    cargarTodo(idAUsar);
  }, [navigate]);

  useEffect(() => {
    if ((vistaActiva === 'auditoria' || vistaActiva === 'nomina') && box) {
      cargarAuditoria();
    }
  }, [vistaActiva, filtroAuditoria, box]);

  async function cargarTodo(idBox) {
    if (!idBox) return; // Si no hay ID, no disparamos flechas al aire
    setLoading(true);
    try {
      // 1. Traemos el catálogo de especialidades del Box
      const resCat = await fetch(`${API_URL}/especialidades/box/${idBox}`);
      const dataCat = await resCat.json();
      setCatalogo(Array.isArray(dataCat) ? dataCat : []);

      // 2. Traemos a todos los usuarios.
      // TIP: Si el endpoint /usuarios/box/${idBox} te da 404, usa el general y filtramos en JS
      const resUsu = await fetch(`${API_URL}/usuarios`);
      const dataUsu = await resUsu.json();

      const usuariosLista = Array.isArray(dataUsu) ? dataUsu : (dataUsu.data || []);

      // 3. Filtramos: que sean del Box actual Y que tengan rol 'Coach'
      const soloCoaches = usuariosLista.filter(u =>
        (u.idBoxPredeterminado === parseInt(idBox) || u.IdBoxPredeterminado === parseInt(idBox)) &&
        u.rol === 'Coach'
      );

      // 4. A cada Coach le buscamos sus especialidades
      // 4. A cada Coach le buscamos sus especialidades y sus calificaciones
      // En lotes de 3 coaches (máx. 6 peticiones simultáneas) para no saturar
      // el pooler de Supabase, con reintentos ante 500 transitorios.
      const coachesArmados = await enLotes(soloCoaches, 3, async (coach) => {
        const id = coach.idUsuario || coach.id || coach.IdUsuario;
        const [dataEsp, dataEval] = await Promise.all([
          fetchJsonRetry(`${API_URL}/especialidades/coach/${id}`),
          fetchJsonRetry(`${API_URL}/evaluaciones/coach/${id}`)
        ]);
        return {
          ...coach,
          especialidades: Array.isArray(dataEsp) ? dataEsp : [],
          evaluaciones: dataEval || { promedio: 0, total: 0, resenas: [] }
        };
      });

      setCoaches(coachesArmados);
    } catch (err) {
      console.error("Error cargando staff:", err);
    } finally {
      setLoading(false);
    }
  }

  // --- LÓGICA DEL MODAL ---
  // --- LÓGICA DEL MODAL ---
  const abrirModal = (coach) => {
    setCoachSeleccionado(coach);
    setModalEspVisible(true); // 👈 Encendemos su semáforo
    const idsActivos = coach.especialidades.map(e => e.idEspecialidad || e.IdEspecialidad);
    setEspSeleccionadas(idsActivos);
  };

  const cerrarModal = () => {
    setModalEspVisible(false); // 👈 Apagamos el semáforo ANTES de borrar al coach
    setTimeout(() => { setCoachSeleccionado(null); setNuevaEspecialidad(''); }, 200); // Pequeño delay visual
  };

  const toggleEspecialidad = (idEsp) => {
    if (espSeleccionadas.includes(idEsp)) {
      setEspSeleccionadas(espSeleccionadas.filter(id => id !== idEsp)); // Lo apaga
    } else {
      setEspSeleccionadas([...espSeleccionadas, idEsp]); // Lo prende
    }
  };

  // --- PETICIONES A C# ---
  const guardarEspecialidades = async () => {
    try {
      const idCoach = coachSeleccionado.idUsuario || coachSeleccionado.id;
      const res = await fetch(`${API_URL}/especialidades/asignar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idCoach: idCoach, idEspecialidades: espSeleccionadas })
      });

      if (res.ok) {
        cerrarModal();
        cargarTodo(box.idBox); // Recargamos para ver los cambios brillando en la tarjeta
      }
    } catch (error) {
      alert("Error al guardar especialidades.");
    }
  };

  const crearNuevaEspecialidad = async () => {
    if (!nuevaEspecialidad.trim()) return;
    try {
      const res = await fetch(`${API_URL}/especialidades`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: nuevaEspecialidad, idBox: box.idBox })
      });

      if (res.ok) {
        const nuevaEsp = await res.json();
        setCatalogo([...catalogo, nuevaEsp]); // La agregamos a la lista visual
        setEspSeleccionadas([...espSeleccionadas, nuevaEsp.idEspecialidad]); // Se la asignamos de una vez al coach
        setNuevaEspecialidad('');
      }
    } catch (error) {
      alert("Error al crear la especialidad en la BD.");
    }
  };

  // --- LÓGICA DE CONTRATOS Y NÓMINA ---
  const getWeekBoundaries = (dateObj) => {
    const day = dateObj.getDay();
    const diffToMonday = dateObj.getDate() - day + (day === 0 ? -6 : 1);
    const start = new Date(dateObj.getFullYear(), dateObj.getMonth(), diffToMonday);
    const end = new Date(dateObj.getFullYear(), dateObj.getMonth(), diffToMonday + 6);
    
    const offsetStart = start.getTimezoneOffset() * 60000;
    const offsetEnd = end.getTimezoneOffset() * 60000;
    
    return {
      fInicioStr: new Date(start.getTime() - offsetStart).toISOString().split('T')[0],
      fFinStr: new Date(end.getTime() - offsetEnd).toISOString().split('T')[0]
    };
  };

  const getDatesForFilter = (filter) => {
    const hoyObj = new Date();
    let start, end;
    if (filter === 'hoy') {
      start = new Date(hoyObj);
      end = new Date(hoyObj);
    } else if (filter === 'ayer') {
      start = new Date(hoyObj);
      start.setDate(hoyObj.getDate() - 1);
      end = new Date(start);
    } else if (filter === 'semana') {
      return getWeekBoundaries(hoyObj);
    }
    const offsetStart = start.getTimezoneOffset() * 60000;
    const offsetEnd = end.getTimezoneOffset() * 60000;
    return {
      fInicioStr: new Date(start.getTime() - offsetStart).toISOString().split('T')[0],
      fFinStr: new Date(end.getTime() - offsetEnd).toISOString().split('T')[0]
    };
  };

  const cargarAuditoria = async () => {
    if (!box) return;
    setCargandoAuditoria(true);
    try {
      const { fInicioStr, fFinStr } = getDatesForFilter(filtroAuditoria);
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/nomina/auditoria-clases/${box.idBox}/${fInicioStr}/${fFinStr}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setAuditoriaClases(await res.json());
      }
    } catch (e) {
      console.error("Error al cargar auditoría:", e);
    } finally {
      setCargandoAuditoria(false);
    }
  };

  const validarClaseAuditoria = async (idCoach, idClase, fecha, estado, montoPago) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/nomina/validar-clase`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          IdCoach: idCoach,
          IdClase: idClase,
          Fecha: fecha,
          Estado: estado,
          MontoPago: parseFloat(montoPago)
        })
      });
      if (res.ok) {
        cargarAuditoria(); // recargar la tabla de auditoría
      }
    } catch (e) {
      alert("Error al validar asistencia de la clase");
    }
  };

  const validarMasivo = async () => {
    const pendientes = auditoriaClases.filter(c => (c.estado === 'Pendiente' || c.Estado === 'Pendiente') && esPasadaOHoy(c.fecha || c.Fecha));
    if (pendientes.length === 0) return alert("No hay clases pendientes pasadas o de hoy por validar en esta vista.");
    
    if (!await window.wpConfirm(`¿Aprobar ${pendientes.length} clases pendientes mostradas en pantalla?`)) return;

    try {
      const peticiones = pendientes.map(c => ({
        IdCoach: c.idCoach || c.IdCoach,
        IdClase: c.idClase || c.IdClase,
        Fecha: c.fecha || c.Fecha,
        Estado: 'Validada',
        MontoPago: c.montoPago || c.MontoPago
      }));

      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/nomina/validar-masivo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(peticiones)
      });
      if (res.ok) {
        alert("Validación masiva completada con éxito. ✅");
        cargarAuditoria();
      }
    } catch (e) {
      alert("Error en validación masiva.");
    }
  };

  const cargarAsistencias = async (idCoach) => {
    setCargandoAsistencias(true);
    try {
      const { fInicioStr, fFinStr } = getWeekBoundaries(new Date());
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/nomina/asistencias-coach-semanal/${idCoach}/${fInicioStr}/${fFinStr}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAsistenciasCoach(data);
      }
    } catch (e) {
      console.error("Error al cargar asistencias:", e);
    } finally {
      setCargandoAsistencias(false);
    }
  };

  const validarAsistenciaClase = async (idClase, fecha, estado, montoPago) => {
    try {
      const idCoach = coachSeleccionado.idUsuario || coachSeleccionado.id;
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/nomina/validar-clase`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          IdCoach: idCoach,
          IdClase: idClase,
          Fecha: fecha,
          Estado: estado,
          MontoPago: parseFloat(montoPago)
        })
      });
      if (res.ok) {
        await cargarAsistencias(idCoach);
        const { fInicioStr, fFinStr } = getWeekBoundaries(new Date());
        const resNomina = await fetch(`${import.meta.env.VITE_API_URL}/api/nomina/calcular-semanal/${idCoach}/${fInicioStr}/${fFinStr}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (resNomina.ok) {
          setNominaActual(await resNomina.json());
        }
      }
    } catch (e) {
      alert("Error al validar asistencia de la clase");
    }
  };

  const pagarNominaMes = async () => {
    if (!await window.wpConfirm(`¿Seguro que deseas proceder con el pago definitivo de la nómina semanal de ${coachSeleccionado.nombre} por $${nominaActual.granTotal.toFixed(2)}? Se registrará un Egreso Financiero.`)) return;
    try {
      const idCoach = coachSeleccionado.idUsuario || coachSeleccionado.id;
      const hoy = new Date();
      // En vez de mes/año podríamos mandar la semana, pero para retrocompatibilidad usaremos el mes actual. Idealmente backend también debería tener pagar-semanal.
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/nomina/pagar/${idCoach}/${hoy.getFullYear()}/${hoy.getMonth() + 1}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.mensaje || "Nómina pagada con éxito. ✅");
        setModalContratoVisible(false);
      } else {
        alert(data.mensaje || "Error al pagar la nómina");
      }
    } catch (e) {
      alert("Error al procesar el pago");
    }
  };

  const abrirModalContrato = async (coach) => {
    setCoachSeleccionado(coach);
    setModalContratoVisible(true);
    setNominaActual(null);
    setAsistenciasCoach([]);
    const idCoach = coach.idUsuario || coach.id;
    const token = localStorage.getItem('token');
    
    cargarAsistencias(idCoach);

    try {
      // 1. Traer el Contrato
      const resContrato = await fetch(`${import.meta.env.VITE_API_URL}/api/nomina/contrato/${idCoach}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (resContrato.ok) {
        const data = await resContrato.json();
        setFormContrato({ tipoPago: data.tipoPago, monto: data.monto, diaCorte: data.diaCorte });
      }
      // 2. Traer el cálculo de Nómina de esta SEMANA
      const { fInicioStr, fFinStr } = getWeekBoundaries(new Date());
      const resNomina = await fetch(`${import.meta.env.VITE_API_URL}/api/nomina/calcular-semanal/${idCoach}/${fInicioStr}/${fFinStr}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (resNomina.ok) {
        setNominaActual(await resNomina.json());
      }
    } catch (e) { console.error("Error al cargar finanzas", e); }
  };

  const guardarContrato = async () => {
    try {
      const idCoach = coachSeleccionado.idUsuario || coachSeleccionado.id;
      const token = localStorage.getItem('token');
      const payload = {
        IdUsuario: idCoach,
        TipoPago: formContrato.tipoPago, Monto: parseFloat(formContrato.monto), DiaCorte: parseInt(formContrato.diaCorte), Activo: true
      };
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/nomina/contrato`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        alert("Contrato financiero actualizado. 💸");
        setModalContratoVisible(false);
      }
    } catch (e) { alert("Error al guardar contrato"); }
  };

  const eliminarResena = async (idResena) => {
    if (!await window.wpConfirm("¿Seguro que deseas eliminar esta reseña (por lenguaje inapropiado o spam)?")) return;
    try {
      const res = await fetch(`${API_URL}/evaluaciones/${idResena}`, { method: 'DELETE' });
      if (res.ok) {
        alert("Reseña eliminada correctamente.");
        setCoachSeleccionado({
          ...coachSeleccionado,
          evaluaciones: {
            ...coachSeleccionado.evaluaciones,
            resenas: coachSeleccionado.evaluaciones.resenas.filter(r => r.idEvaluacion !== idResena)
          }
        });
        cargarTodo(box ? box.idBox : 1);
      } else {
        alert("No se pudo eliminar la reseña.");
      }
    } catch (e) { alert("Error de conexión"); }
  };

  // Reset de páginas al cambiar datos/filtros
  useEffect(() => { setPagDirectorio(1); }, [coaches.length]);
  useEffect(() => { setPagAuditoria(1); }, [auditoriaClases, filtroCoachAuditoria, filtroAuditoria]);

  // Derivados de paginación
  const totalPagDir = Math.max(1, Math.ceil(coaches.length / PAGE_SIZE));
  const coachesPagina = coaches.slice((pagDirectorio - 1) * PAGE_SIZE, pagDirectorio * PAGE_SIZE);

  const auditoriaFiltrada = filtroCoachAuditoria
    ? auditoriaClases.filter(c => (c.idCoach || c.IdCoach)?.toString() === filtroCoachAuditoria)
    : auditoriaClases;
  const totalPagAud = Math.max(1, Math.ceil(auditoriaFiltrada.length / PAGE_SIZE));
  const auditoriaPagina = auditoriaFiltrada.slice((pagAuditoria - 1) * PAGE_SIZE, pagAuditoria * PAGE_SIZE);

  // Opciones de coaches para el filtro de auditoría (lista dinámica)
  const coachOpciones = [
    { value: '', label: 'Todos los Coaches', icon: 'fa-users' },
    ...Array.from(new Set(auditoriaClases.map(c => c.idCoach || c.IdCoach))).map(id => {
      const nombre = auditoriaClases.find(c => (c.idCoach || c.IdCoach) === id)?.nombreCoach
        || auditoriaClases.find(c => (c.idCoach || c.IdCoach) === id)?.NombreCoach || `Coach ${id}`;
      return { value: String(id), label: nombre, icon: 'fa-user' };
    }),
  ];
  const fechaSel = FILTRO_FECHA_OPCIONES.find(o => o.value === filtroAuditoria) || FILTRO_FECHA_OPCIONES[0];
  const coachSel = coachOpciones.find(o => o.value === filtroCoachAuditoria) || coachOpciones[0];

  return (
    <div className="staff-container">

      {/* ── HEADER (patrón GestionClases) ── */}
      <header className="gc-header">
        <div className="d-flex align-items-center gap-3">
          <BackButton to="/admin-box-panel" />
          <h1 className="gc-header-title">Control de <span>Staff</span></h1>
        </div>
      </header>

      <div className="container-xl px-3 px-md-4 py-4">

        {/* ── TABS DE VISTA ── */}
        <div className="staff-tabs">
          <button
            type="button"
            className={`staff-tab ${vistaActiva === 'directorio' ? 'staff-tab--active' : ''}`}
            onClick={() => setVistaActiva('directorio')}
          >
            <i className="fas fa-address-card"></i><span>Directorio</span>
          </button>
          <button
            type="button"
            className={`staff-tab ${vistaActiva === 'auditoria' ? 'staff-tab--active' : ''}`}
            onClick={() => { setVistaActiva('auditoria'); setFiltroAuditoria('hoy'); }}
          >
            <i className="fas fa-check-double"></i><span>Auditoría</span>
          </button>
          <button
            type="button"
            className={`staff-tab ${vistaActiva === 'nomina' ? 'staff-tab--active' : ''}`}
            onClick={() => { setVistaActiva('nomina'); setFiltroAuditoria('semana'); }}
          >
            <i className="fas fa-money-check-alt"></i><span>Nómina</span>
          </button>
        </div>


        {vistaActiva === 'directorio' ? (
          <>
            {/* ── LOADING ── */}
            {loading ? (
              <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
                <AtletifyLoader />
              </div>

              /* ── EMPTY STATE ── */
            ) : coaches.length === 0 ? (
              <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
                <div className="staff-empty-card">
                  <i className="fas fa-users-slash staff-empty-icono"></i>
                  <h2 className="staff-empty-titulo">Sin Coaches registrados</h2>
                  <p className="staff-empty-desc">
                    Primero registra usuarios con rol "Coach" en tu Box.
                  </p>
                </div>
              </div>

              /* ── GRID DE COACHES ── */
            ) : (
              <div className="staff-coach-grid">
                {coachesPagina.map(coach => (
                  <div key={coach.idUsuario || coach.id} className="staff-card">

                      {/* Cabecera: avatar + nombre + rating + correo */}
                      <div className="staff-card-header">
                        <div className="staff-avatar">
                          <span className="staff-avatar-initial">
                            {coach.nombre.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="staff-badge-rol">Coach</span>
                        <h3 className="staff-nombre">{coach.nombre}</h3>
                        <div className="staff-rating">
                          <i className="fas fa-star staff-rating-star"></i>
                          <span className="staff-rating-score">{coach.evaluaciones?.promedio || 0}</span>
                          <span className="staff-rating-count">({coach.evaluaciones?.total || 0})</span>
                        </div>
                        <p className="staff-correo">{coach.correo}</p>
                      </div>

                      {/* Cuerpo: especialidades + acciones */}
                      <div className="staff-card-body">
                        <div className="staff-esp-section">
                          <p className="staff-esp-label">Especialidades</p>
                          {coach.especialidades && coach.especialidades.length > 0 ? (
                            <div className="staff-esp-pills">
                              {coach.especialidades.map(esp => (
                                <span key={esp.idEspecialidad} className="staff-esp-pill">
                                  {esp.nombre}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <div className="staff-esp-vacio">
                              <i className="fas fa-plus-circle"></i>
                              <p>Sin especialidades</p>
                            </div>
                          )}
                        </div>

                        <div className="staff-actions-grid">
                          <button className="staff-action-btn staff-action-btn--esp" onClick={() => abrirModal(coach)}>
                            <i className="fas fa-sliders-h"></i>
                            <span>Esp.</span>
                          </button>
                          <button className="staff-action-btn staff-action-btn--contrato" onClick={() => abrirModalContrato(coach)}>
                            <i className="fas fa-wallet"></i>
                            <span>Contrato</span>
                          </button>
                          <button className="staff-action-btn staff-action-btn--ausencia" onClick={() => abrirModalPermiso(coach)}>
                            <i className="fas fa-umbrella-beach"></i>
                            <span>Ausencia</span>
                          </button>
                          <button className="staff-action-btn staff-action-btn--resenas" onClick={() => { setCoachSeleccionado(coach); setModalResenasVisible(true); }}>
                            <i className="fas fa-star"></i>
                            <span>Reseñas</span>
                          </button>
                        </div>
                      </div>

                    </div>
                ))}
              </div>
            )}
            {!loading && coaches.length > 0 && (
              <Paginacion pagina={pagDirectorio} totalPaginas={totalPagDir} onCambio={setPagDirectorio} />
            )}
          </>
        ) : vistaActiva === 'auditoria' ? (
          /* ── AUDITORIA DE CLASES ── */
          <div className="auditoria-container fade-in">
            <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
              <div>
                <h3 className="text-white mb-1"><i className="fas fa-clipboard-check text-danger me-2"></i> Auditoría Global</h3>
                <p className="text-white-50 mb-0 small">Verifica que todos los coaches impartieron sus clases correctamente y aprueba la nómina con 1 clic.</p>
              </div>
              
              <div className="staff-toolbar">
                <button type="button" className="staff-picker-btn" onClick={() => setPickerActivo('coach')}>
                  <i className="fas fa-user staff-picker-btn-icon"></i>
                  <span className="staff-picker-btn-label">{coachSel.label}</span>
                  <i className="fas fa-chevron-down staff-picker-btn-arrow"></i>
                </button>
                <button type="button" className="staff-picker-btn" onClick={() => setPickerActivo('fecha')}>
                  <i className={`fas ${fechaSel.icon} staff-picker-btn-icon`}></i>
                  <span className="staff-picker-btn-label">{fechaSel.label}</span>
                  <i className="fas fa-chevron-down staff-picker-btn-arrow"></i>
                </button>
                <button className="staff-toolbar-btn-ok" onClick={validarMasivo}>
                  <i className="fas fa-check-double me-2"></i>Validar Pendientes
                </button>
              </div>
            </div>

            {cargandoAuditoria ? (
              <div className="text-center py-5">
                <div className="spinner-border text-danger" role="status"></div>
                <p className="mt-3 text-white-50">Cargando clases...</p>
              </div>
            ) : auditoriaClases.length === 0 ? (
              <div className="staff-empty-card py-5 text-center">
                <i className="fas fa-box-open fs-1 text-white-50 mb-3"></i>
                <h5 className="text-white">Sin clases registradas</h5>
                <p className="text-white-50 small mb-0">No hay clases configuradas para el periodo seleccionado.</p>
              </div>
            ) : (
              <>
              <div className="table-responsive d-none d-md-block staff-audit-table-wrap">
                <table className="table table-hover mb-0 align-middle staff-audit-table" style={{
                  '--bs-table-bg': 'transparent',
                  '--bs-table-color': 'var(--text-primary)',
                  '--bs-table-border-color': 'var(--border)',
                  '--bs-table-hover-bg': 'var(--bg-card-hover)',
                  '--bs-table-hover-color': 'var(--text-primary)',
                  color: 'var(--text-primary)'
                }}>
                  <thead>
                    <tr>
                      <th className="py-3 text-white-50 fw-normal small px-3">Fecha y Hora</th>
                      <th className="py-3 text-white-50 fw-normal small">Clase</th>
                      <th className="py-3 text-white-50 fw-normal small">Coach Asignado</th>
                      <th className="py-3 text-white-50 fw-normal small text-center">Atletas (Asist / Cupo)</th>
                      <th className="py-3 text-white-50 fw-normal small text-end">Pago Coach</th>
                      <th className="py-3 text-white-50 fw-normal small text-center">Estado</th>
                      <th className="py-3 text-white-50 fw-normal small text-end px-3">Acción Rápida</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditoriaPagina.map((c, i) => {
                      const idClase = c.idClase ?? c.IdClase;
                      const idCoach = c.idCoach ?? c.IdCoach;
                      const fecha = c.fecha ?? c.Fecha;
                      const estado = c.estado ?? c.Estado;
                      const monto = c.montoPago ?? c.MontoPago ?? 0;
                      const totalAsistieron = c.totalAsistieron ?? c.TotalAsistieron ?? 0;
                      const maximoAtletas = c.maximoAtletas ?? c.MaximoAtletas ?? c.totalReservas ?? c.TotalReservas ?? 0;
                      const nombreCoach = c.nombreCoach ?? c.NombreCoach ?? 'C';
                      const nombreClase = c.nombreClase ?? c.NombreClase ?? '';
                      const horario = c.horario ?? c.Horario ?? '';
                      
                      return (
                        <tr key={`${idClase}-${i}`} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <td className="px-3">
                            <span className="d-block text-white fw-bold">{new Date(fecha).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' }).toUpperCase()}</span>
                            <span className="text-danger small"><i className="far fa-clock me-1"></i>{horario}</span>
                          </td>
                          <td className="text-white fw-medium">{nombreClase}</td>
                          <td>
                            <div className="d-flex align-items-center gap-2">
                              <div className="staff-avatar" style={{ width: '30px', height: '30px', minWidth: '30px' }}>
                                <span className="staff-avatar-initial fs-6">{nombreCoach.charAt(0)}</span>
                              </div>
                              <span className="text-white small text-truncate" style={{ maxWidth: '120px' }}>{nombreCoach}</span>
                            </div>
                          </td>
                          <td className="text-center">
                            <div className="badge rounded-pill bg-dark border border-secondary px-3 py-2">
                              <span className="text-success fw-bold">{totalAsistieron}</span>
                              <span className="text-white-50 mx-1">/</span>
                              <span className="text-white">{maximoAtletas}</span>
                            </div>
                          </td>
                          <td className="text-end">
                            <span className="badge rounded-pill bg-success bg-opacity-10 text-success border border-success border-opacity-25 px-2 py-1 font-monospace">
                              ${monto.toFixed(2)}
                            </span>
                          </td>
                          <td className="text-center">
                            {estado === 'Validada' && <span className="badge bg-success bg-opacity-25 text-success border border-success border-opacity-50 px-2 py-1"><i className="fas fa-check me-1"></i>Validada</span>}
                            {estado === 'Falta' && <span className="badge bg-danger bg-opacity-25 text-danger border border-danger border-opacity-50 px-2 py-1"><i className="fas fa-times me-1"></i>Falta</span>}
                            {estado === 'Pendiente' && <span className="badge bg-warning bg-opacity-25 text-warning border border-warning border-opacity-50 px-2 py-1"><i className="fas fa-hourglass-half me-1"></i>Pendiente</span>}
                          </td>
                          <td className="text-end px-3">
                            {estado === 'Pendiente' ? (
                              !esFuturaManana(fecha) ? (
                                <div className="btn-group btn-group-sm">
                                  <button className="btn btn-outline-success border-success text-success bg-success bg-opacity-10 shadow-sm" title="Validar Asistencia" onClick={() => validarClaseAuditoria(idCoach, idClase, fecha, 'Validada', monto)}>
                                    <i className="fas fa-check"></i>
                                  </button>
                                  <button className="btn btn-outline-danger border-danger text-danger bg-danger bg-opacity-10 shadow-sm" title="Marcar Falta" onClick={() => validarClaseAuditoria(idCoach, idClase, fecha, 'Falta', 0)}>
                                    <i className="fas fa-times"></i>
                                  </button>
                                </div>
                              ) : (
                                <span className="text-muted small" style={{ fontSize: '10px' }}><i className="fas fa-lock me-1"></i>Mañana</span>
                              )
                            ) : (
                              <button className="btn btn-sm btn-outline-secondary border-secondary text-secondary bg-secondary bg-opacity-10 shadow-sm" title="Deshacer a Pendiente" onClick={() => validarClaseAuditoria(idCoach, idClase, fecha, 'Pendiente', monto)}>
                                <i className="fas fa-undo"></i>
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* ── Tarjetas auditoría (móvil) ── */}
              <div className="d-md-none staff-audit-cards">
                {auditoriaPagina.map((c, i) => {
                  const idClase = c.idClase ?? c.IdClase;
                  const idCoach = c.idCoach ?? c.IdCoach;
                  const fecha = c.fecha ?? c.Fecha;
                  const estado = c.estado ?? c.Estado;
                  const monto = c.montoPago ?? c.MontoPago ?? 0;
                  const totalAsistieron = c.totalAsistieron ?? c.TotalAsistieron ?? 0;
                  const maximoAtletas = c.maximoAtletas ?? c.MaximoAtletas ?? c.totalReservas ?? c.TotalReservas ?? 0;
                  const nombreCoach = c.nombreCoach ?? c.NombreCoach ?? 'C';
                  const nombreClase = c.nombreClase ?? c.NombreClase ?? '';
                  const horario = c.horario ?? c.Horario ?? '';
                  return (
                    <div key={`m-${idClase}-${i}`} className="staff-audit-card">
                      <div className="staff-audit-card-top">
                        <div className="staff-audit-card-id">
                          <div className="staff-audit-card-clase">{nombreClase}</div>
                          <div className="staff-audit-card-fecha">
                            <i className="far fa-clock me-1"></i>
                            {new Date(fecha).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })} · {horario}
                          </div>
                        </div>
                        {estado === 'Validada' && <span className="badge bg-success bg-opacity-25 text-success">Validada</span>}
                        {estado === 'Falta' && <span className="badge bg-danger bg-opacity-25 text-danger">Falta</span>}
                        {estado === 'Pendiente' && <span className="badge bg-warning bg-opacity-25 text-warning">Pendiente</span>}
                      </div>
                      <div className="staff-audit-card-meta">
                        <span><i className="fas fa-user me-1"></i>{nombreCoach}</span>
                        <span><i className="fas fa-users me-1"></i>{totalAsistieron}/{maximoAtletas}</span>
                        <span className="text-success fw-bold">${monto.toFixed(2)}</span>
                      </div>
                      <div className="staff-audit-card-actions">
                        {estado === 'Pendiente' ? (
                          <>
                            <button className="btn btn-sm btn-success flex-grow-1" onClick={() => validarClaseAuditoria(idCoach, idClase, fecha, 'Validada', monto)}><i className="fas fa-check me-1"></i>Validar</button>
                            <button className="btn btn-sm btn-outline-danger flex-grow-1" onClick={() => validarClaseAuditoria(idCoach, idClase, fecha, 'Falta', 0)}><i className="fas fa-times me-1"></i>Falta</button>
                          </>
                        ) : (
                          <button className="btn btn-sm btn-dark w-100" onClick={() => validarClaseAuditoria(idCoach, idClase, fecha, 'Pendiente', monto)}><i className="fas fa-undo me-1"></i>Revertir a pendiente</button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <Paginacion pagina={pagAuditoria} totalPaginas={totalPagAud} onCambio={setPagAuditoria} />
              </>
            )}
          </div>
        ) : (
          /* ── NOMINA / PAGOS ── */
          <div className="nomina-container fade-in">
            <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
              <div>
                <h3 className="text-white mb-1"><i className="fas fa-money-check-alt text-danger me-2"></i> Gestión de Nómina</h3>
                <p className="text-white-50 mb-0 small">Visualiza el subtotal a pagar por coach basado en las clases que ya han sido validadas.</p>
              </div>
              
              <div className="staff-toolbar">
                <button type="button" className="staff-picker-btn" onClick={() => setPickerActivo('fecha')}>
                  <i className={`fas ${fechaSel.icon} staff-picker-btn-icon`}></i>
                  <span className="staff-picker-btn-label">{fechaSel.label}</span>
                  <i className="fas fa-chevron-down staff-picker-btn-arrow"></i>
                </button>
              </div>
            </div>

            {cargandoAuditoria ? (
              <div className="text-center py-5">
                <div className="spinner-border text-danger" role="status"></div>
                <p className="mt-3 text-white-50">Calculando nómina...</p>
              </div>
            ) : Object.values(auditoriaClases.filter(c => (c.estado ?? c.Estado) === 'Validada').reduce((acc, c) => {
              const id = c.idCoach ?? c.IdCoach;
              if (!acc[id]) { acc[id] = { idCoach: id, nombreCoach: c.nombreCoach ?? c.NombreCoach ?? 'Coach', clases: [], totalPagar: 0 }; }
              acc[id].clases.push(c);
              acc[id].totalPagar += (c.montoPago ?? c.MontoPago ?? 0);
              return acc;
            }, {})).length === 0 ? (
              <div className="staff-empty-card py-5 text-center">
                <i className="fas fa-wallet fs-1 text-white-50 mb-3"></i>
                <h5 className="text-white">Sin clases validadas</h5>
                <p className="text-white-50 small mb-0">Primero valida las clases en la pestaña de Auditoría para ver los montos a pagar.</p>
              </div>
            ) : (
              <div className="row g-3">
                {Object.values(auditoriaClases.filter(c => (c.estado ?? c.Estado) === 'Validada').reduce((acc, c) => {
                  const id = c.idCoach ?? c.IdCoach;
                  if (!acc[id]) { acc[id] = { idCoach: id, nombreCoach: c.nombreCoach ?? c.NombreCoach ?? 'Coach', clases: [], totalPagar: 0 }; }
                  acc[id].clases.push(c);
                  acc[id].totalPagar += (c.montoPago ?? c.MontoPago ?? 0);
                  return acc;
                }, {})).map(coachNomina => (
                  <div key={coachNomina.idCoach} className="col-12 col-sm-6 col-lg-4">
                    <div className="staff-nomina-coach-card">
                      <div className="staff-avatar staff-nomina-coach-avatar">
                        <span className="staff-avatar-initial">{coachNomina.nombreCoach.charAt(0)}</span>
                      </div>
                      <h3 className="staff-nomina-coach-nombre">{coachNomina.nombreCoach}</h3>
                      <p className="staff-nomina-coach-sub">
                        <i className="fas fa-check-circle"></i> {coachNomina.clases.length} clase(s) validadas
                      </p>

                      <div className="staff-nomina-coach-total">
                        <span className="staff-nomina-coach-total-label">Total a Pagar</span>
                        <span className="staff-nomina-coach-total-valor">${coachNomina.totalPagar.toFixed(2)}</span>
                      </div>

                      <button className="staff-nomina-coach-btn" onClick={() => alert('Función de registro de pago de nómina en desarrollo. Por ahora, el monto se muestra de manera informativa.')}>
                        <i className="fas fa-hand-holding-usd"></i> Registrar Pago
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      {/* ── MODAL: ESPECIALIDADES ── */}
      {modalEspVisible && coachSeleccionado && (
        <div className="staff-modal-overlay" onClick={cerrarModal}>
          <div className="staff-modal" onClick={e => e.stopPropagation()}>

            <div className="staff-modal-header">
              <div className="d-flex align-items-center gap-2">
                <div className="staff-modal-icon-box staff-modal-icon-box--cool">
                  <i className="fas fa-sliders-h"></i>
                </div>
                <div>
                  <h2 className="staff-modal-titulo">
                    Especialidades de <span>{coachSeleccionado.nombre.split(' ')[0]}</span>
                  </h2>
                </div>
              </div>
              <button className="staff-modal-cerrar" onClick={cerrarModal} aria-label="Cerrar">
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="staff-modal-body">
              <p className="staff-modal-desc">
                Selecciona las disciplinas que este Coach domina o imparte en el Box:
              </p>

              <div className="staff-pills-grid">
                {catalogo.map(cat => {
                  const activo = espSeleccionadas.includes(cat.idEspecialidad);
                  return (
                    <button
                      key={cat.idEspecialidad}
                      className={`staff-pill-toggle ${activo ? 'staff-pill-toggle--activo' : 'staff-pill-toggle--inactivo'}`}
                      onClick={() => toggleEspecialidad(cat.idEspecialidad)}
                    >
                      {cat.nombre}
                      {activo && <i className="fas fa-check"></i>}
                    </button>
                  );
                })}
                {catalogo.length === 0 && (
                  <span className="staff-catalogo-vacio">El catálogo de tu Box está vacío.</span>
                )}
              </div>

              <div className="staff-nueva-esp">
                <span className="staff-nueva-esp-label">
                  <i className="fas fa-plus-circle me-1"></i>¿Falta alguna especialidad?
                </span>
                <div className="d-flex gap-2">
                  <input
                    type="text"
                    className="staff-nueva-esp-input"
                    placeholder="Ej. Halterofilia, Gimnasia..."
                    value={nuevaEspecialidad}
                    onChange={e => setNuevaEspecialidad(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && crearNuevaEspecialidad()}
                  />
                  <BotonSeguro className="staff-btn-agregar" onClick={crearNuevaEspecialidad} textoProcesando="...">
                    <i className="fas fa-plus"></i>
                    <span className="d-none d-sm-inline">Agregar</span>
                  </BotonSeguro>
                </div>
              </div>

              <BotonSeguro className="staff-btn-guardar" onClick={guardarEspecialidades} textoProcesando="Guardando...">
                <i className="fas fa-save"></i>Guardar Cambios
              </BotonSeguro>
            </div>

          </div>
        </div>
      )}

      {/* ── MODAL: VER RESEÑAS ── */}
      {modalResenasVisible && coachSeleccionado && (
        <div className="staff-modal-overlay" onClick={() => setModalResenasVisible(false)}>
          <div className="staff-modal staff-modal--sm" onClick={e => e.stopPropagation()}>

            <div className="staff-modal-header">
              <div className="d-flex align-items-center gap-2">
                <div className="staff-modal-icon-box staff-modal-icon-box--accent">
                  <i className="fas fa-star"></i>
                </div>
                <div>
                  <h2 className="staff-modal-titulo">Tribunal de Atletas</h2>
                  <p className="staff-modal-subtitle">{coachSeleccionado.nombre.split(' ')[0]}</p>
                </div>
              </div>
              <button className="staff-modal-cerrar" onClick={() => setModalResenasVisible(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="staff-modal-body">
              <div className="staff-rating-hero">
                <div className="staff-rating-hero-score">
                  {coachSeleccionado.evaluaciones?.promedio || 0}
                </div>
                <div className="staff-rating-hero-stars">
                  {'★'.repeat(Math.round(coachSeleccionado.evaluaciones?.promedio || 0))}
                  {'☆'.repeat(5 - Math.round(coachSeleccionado.evaluaciones?.promedio || 0))}
                </div>
                <span className="staff-rating-hero-total">
                  {coachSeleccionado.evaluaciones?.total || 0} reseñas totales
                </span>
              </div>

              <div className="staff-resenas-list">
                {(!coachSeleccionado.evaluaciones?.resenas || coachSeleccionado.evaluaciones.resenas.length === 0) ? (
                  <p className="staff-resenas-vacio">Aún no hay reseñas para este coach.</p>
                ) : (
                  coachSeleccionado.evaluaciones.resenas.map(r => (
                    <div key={r.idEvaluacion} className="staff-resena-card">
                      <div className="staff-resena-header">
                        <div className="d-flex align-items-center gap-2">
                          <div className="staff-resena-avatar">
                            {r.nombreAtleta ? r.nombreAtleta.charAt(0) : 'A'}
                          </div>
                          <span className="staff-resena-nombre">{r.nombreAtleta || 'Atleta Oculto'}</span>
                        </div>
                        <span className="staff-resena-estrellas">{'★'.repeat(r.estrellas || 5)}</span>
                      </div>
                      {r.comentario && <p className="staff-resena-comentario">"{r.comentario}"</p>}
                      <div className="d-flex justify-content-between align-items-center mt-2">
                        <div className="staff-resena-fecha">
                          {new Date(r.fechaEvaluacion).toLocaleDateString()}
                        </div>
                        <button
                          className="btn btn-sm btn-outline-danger border-0"
                          onClick={() => eliminarResena(r.idEvaluacion)}
                          title="Eliminar Reseña"
                        >
                          <i className="fas fa-trash-alt"></i>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ── MODAL: AUSENCIAS / VACACIONES ── */}
      {modalPermisoVisible && coachSeleccionado && (
        <div className="staff-modal-overlay" onClick={() => setModalPermisoVisible(false)}>
          <div className="staff-modal staff-modal--md" onClick={e => e.stopPropagation()}>

            <div className="staff-modal-header">
              <div className="d-flex align-items-center gap-2">
                <div className="staff-modal-icon-box staff-modal-icon-box--accent">
                  <i className="fas fa-plane-departure"></i>
                </div>
                <div>
                  <h2 className="staff-modal-titulo">Registrar Ausencia</h2>
                  <p className="staff-modal-subtitle">{coachSeleccionado.nombre.split(' ')[0]}</p>
                </div>
              </div>
              <button className="staff-modal-cerrar" onClick={() => setModalPermisoVisible(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="staff-modal-body">
              <div className="staff-form-panel">
                <div className="row g-3">
                  <div className="col-6">
                    <label className="staff-form-label">Día de Inicio</label>
                    <RedGrayDatePicker
                      value={formPermiso.fechaInicio}
                      onChange={val => setFormPermiso({ ...formPermiso, fechaInicio: val })}
                      placeholder="dd/mm/aaaa"
                    />
                  </div>
                  <div className="col-6">
                    <label className="staff-form-label">Día Final</label>
                    <RedGrayDatePicker
                      value={formPermiso.fechaFin}
                      onChange={val => setFormPermiso({ ...formPermiso, fechaFin: val })}
                      placeholder="dd/mm/aaaa"
                      min={formPermiso.fechaInicio || undefined}
                    />
                  </div>
                  <div className="col-12">
                    <label className="staff-form-label">Motivo</label>
                    <input
                      type="text"
                      className="staff-modal-input"
                      placeholder="Ej. Permiso por enfermedad, Vacaciones..."
                      value={formPermiso.motivo}
                      onChange={e => setFormPermiso({ ...formPermiso, motivo: e.target.value })}
                    />
                  </div>
                  <div className="col-12">
                    <div className="staff-switch-row">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        role="switch"
                        id="goce-sueldo"
                        checked={formPermiso.conGoceDeSueldo}
                        onChange={e => setFormPermiso({ ...formPermiso, conGoceDeSueldo: e.target.checked })}
                      />
                      <label className="staff-form-label mb-0" htmlFor="goce-sueldo">
                        Con Goce de Sueldo (No descontar de nómina)
                      </label>
                    </div>
                  </div>
                  <div className="col-12">
                    <BotonSeguro onClick={guardarPermiso} className="staff-btn-aprobar" textoProcesando="Guardando...">
                      <i className="fas fa-check-circle"></i>Aprobar Ausencia
                    </BotonSeguro>
                  </div>
                </div>
              </div>

              <div className="staff-modal-section-title">
                <i className="fas fa-history me-2"></i>Historial de Permisos
              </div>

              <div className="staff-historial-list">
                {historialPermisos.length === 0 ? (
                  <p className="staff-historial-vacio">Sin ausencias registradas.</p>
                ) : (
                  historialPermisos.map(p => (
                    <div key={p.idPermiso} className="staff-historial-item">
                      <div>
                        <div className="staff-historial-motivo">
                          {p.motivo}
                          {p.conGoceDeSueldo && <span className="staff-badge-pagado">Pagado</span>}
                        </div>
                        <div className="staff-historial-fechas">
                          {new Date(p.fechaInicio).toLocaleDateString()} — {new Date(p.fechaFin).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ── MODAL: CONTRATOS Y NÓMINA ── */}
      {modalContratoVisible && coachSeleccionado && (
        <div className="staff-modal-overlay" onClick={() => setModalContratoVisible(false)}>
          <div className="staff-modal staff-modal--md" onClick={e => e.stopPropagation()}>

            <div className="staff-modal-header">
              <div className="d-flex align-items-center gap-2">
                <div className="staff-modal-icon-box staff-modal-icon-box--success">
                  <i className="fas fa-wallet"></i>
                </div>
                <div>
                  <h2 className="staff-modal-titulo">Contrato y Nómina</h2>
                  <p className="staff-modal-subtitle">{coachSeleccionado.nombre.split(' ')[0]}</p>
                </div>
              </div>
              <button className="staff-modal-cerrar" onClick={() => setModalContratoVisible(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="staff-modal-body">
              <div className="staff-modal-section-title">
                <i className="fas fa-file-contract me-2"></i>Términos de Pago
              </div>

              <div className="row g-3 mb-4">
                <div className="col-md-6">
                  <label className="staff-form-label">Tipo de Salario</label>
                  <TipoPagoPicker
                    valor={formContrato.tipoPago}
                    onCambiar={val => setFormContrato({ ...formContrato, tipoPago: val })}
                  />
                </div>
                <div className="col-md-3">
                  <label className="staff-form-label">Monto ($)</label>
                  <input
                    type="number"
                    className="staff-modal-input"
                    value={formContrato.monto}
                    onChange={e => setFormContrato({ ...formContrato, monto: e.target.value })}
                  />
                </div>
                <div className="col-md-3">
                  <label className="staff-form-label">Día de Pago (Semanal)</label>
                  <button type="button" className="staff-picker-btn staff-picker-btn--full" onClick={() => setPickerActivo('dia-corte')}>
                    <i className="fas fa-calendar-day staff-picker-btn-icon"></i>
                    <span className="staff-picker-btn-label">{DIA_CORTE_OPCIONES.find(o => String(o.value) === String(formContrato.diaCorte))?.label || 'Día'}</span>
                    <i className="fas fa-chevron-down staff-picker-btn-arrow"></i>
                  </button>
                </div>
                <div className="col-12">
                  <BotonSeguro onClick={guardarContrato} className="staff-btn-guardar-contrato" textoProcesando="Guardando...">
                    <i className="fas fa-save me-1"></i>Guardar Contrato
                  </BotonSeguro>
                </div>
              </div>

              {formContrato.tipoPago === 'PorClase' && (
                <div className="mt-4">
                  <div className="staff-modal-section-title">
                    <i className="fas fa-calendar-check me-2"></i>Validación de Clases (Esta Semana)
                  </div>
                  {cargandoAsistencias ? (
                    <div className="text-center py-3">
                      <div className="spinner-border text-danger spinner-border-sm" role="status"></div>
                    </div>
                  ) : asistenciasCoach.length === 0 ? (
                    <p className="text-muted small py-2">No hay clases programadas o registradas esta semana.</p>
                  ) : (
                    <div className="table-responsive" style={{ maxHeight: '220px', overflowY: 'auto' }}>
                      <table className="table table-dark table-striped table-hover align-middle mb-0" style={{ fontSize: '11px', background: 'rgba(0,0,0,0.2)' }}>
                        <thead>
                          <tr>
                            <th>Fecha</th>
                            <th>Clase</th>
                            <th>Estado</th>
                            <th className="text-end">Tarifa</th>
                            <th className="text-center">Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {asistenciasCoach.map((ast, idx) => {
                            const dateObj = new Date(ast.fecha);
                            const offsetDate = new Date(dateObj.getTime() + dateObj.getTimezoneOffset() * 60000); // Evitar desfase de zona horaria
                            const fechaFormateada = offsetDate.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', weekday: 'short' });
                            return (
                              <tr key={idx}>
                                <td className="text-white-50 text-capitalize">
                                  {fechaFormateada} <span className="small text-muted d-block">{ast.horario}</span>
                                  {ast.esSustituto && <span className="badge bg-info ms-1" style={{ fontSize: '8px' }}>Sustituto</span>}
                                </td>
                                <td className="fw-bold">{ast.nombreClase}</td>
                                <td>
                                  {ast.estado === 'Validada' && <span className="badge bg-success-glow text-success">Validada</span>}
                                  {ast.estado === 'Falta' && <span className="badge bg-danger-glow text-danger">Falta</span>}
                                  {ast.estado === 'Pendiente' && <span className="badge bg-warning-glow text-warning">Pendiente</span>}
                                </td>
                                <td className="text-end fw-bold text-success">${ast.montoPago.toFixed(2)}</td>
                                <td className="text-center">
                                  <div className="d-flex justify-content-center gap-1">
                                    <button
                                      type="button"
                                      className="btn btn-xs btn-success py-1 px-2"
                                      style={{ fontSize: '10px' }}
                                      onClick={() => validarAsistenciaClase(ast.idClase, ast.fecha, 'Validada', ast.montoPago)}
                                      title="Validar Clase"
                                    >
                                      <i className="fas fa-check"></i>
                                    </button>
                                    <button
                                      type="button"
                                      className="btn btn-xs btn-danger py-1 px-2"
                                      style={{ fontSize: '10px' }}
                                      onClick={() => validarAsistenciaClase(ast.idClase, ast.fecha, 'Falta', ast.montoPago)}
                                      title="Registrar Falta"
                                    >
                                      <i className="fas fa-times"></i>
                                    </button>
                                    <button
                                      type="button"
                                      className="btn btn-xs btn-secondary py-1 px-2"
                                      style={{ fontSize: '10px' }}
                                      onClick={() => validarAsistenciaClase(ast.idClase, ast.fecha, 'Pendiente', ast.montoPago)}
                                      title="Restablecer"
                                    >
                                      <i className="fas fa-undo"></i>
                                    </button>
                                  </div>
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

              {nominaActual && (
                <div className="staff-nomina-card mt-4">
                  <div className="staff-modal-section-title">
                    <i className="fas fa-calculator me-2"></i>Nómina Proyectada (Esta Semana)
                  </div>
                  <div className="staff-nomina-row">
                    <span>Sueldo Base Semanal ({nominaActual.tipoPago})</span>
                    <span className="staff-nomina-valor">${nominaActual.sueldoBaseSemanal?.toFixed(2) || (nominaActual.sueldoBaseMensual || 0).toFixed(2)}</span>
                  </div>
                  {nominaActual.tipoPago === 'PorClase' && (
                    <div className="staff-nomina-note">
                      Calculado sobre {nominaActual.clasesValidadas} clases validadas esta semana
                    </div>
                  )}
                  <div className="staff-nomina-row">
                    <span>Bonos Extra</span>
                    <span className="staff-nomina-valor staff-nomina-valor--bono">
                      + ${nominaActual.totalBonos.toFixed(2)}
                    </span>
                  </div>
                  <div className="staff-nomina-row">
                    <span>Penalizaciones / Faltas</span>
                    <span className="staff-nomina-valor staff-nomina-valor--danger">
                      - ${nominaActual.totalPenalizaciones.toFixed(2)}
                    </span>
                  </div>
                  <div className="staff-nomina-total-row">
                    <span className="staff-nomina-total-label">A Pagar</span>
                    <span className="staff-nomina-total-valor">${nominaActual.granTotal.toFixed(2)}</span>
                  </div>
                  <button
                    type="button"
                    onClick={pagarNominaMes}
                    className="btn btn-success w-100 mt-3 py-2 fw-bold text-uppercase"
                    style={{ borderRadius: '12px', fontSize: '12px', letterSpacing: '0.5px' }}
                  >
                    <i className="fas fa-hand-holding-usd me-1"></i> Pagar Nómina de la Semana
                  </button>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* ── PICKERS MODALES (reemplazan a los <select> nativos) ── */}
      {pickerActivo === 'fecha' && (
        <OptionPickerModal
          supertitulo="FILTRO"
          titulo="Periodo"
          opciones={FILTRO_FECHA_OPCIONES}
          valor={filtroAuditoria}
          onSelect={(v) => { setFiltroAuditoria(v); setPickerActivo(null); }}
          onCerrar={() => setPickerActivo(null)}
        />
      )}
      {pickerActivo === 'coach' && (
        <OptionPickerModal
          supertitulo="FILTRO"
          titulo="Filtrar por Coach"
          opciones={coachOpciones}
          valor={filtroCoachAuditoria}
          onSelect={(v) => { setFiltroCoachAuditoria(v); setPickerActivo(null); }}
          onCerrar={() => setPickerActivo(null)}
        />
      )}
      {pickerActivo === 'dia-corte' && (
        <OptionPickerModal
          supertitulo="CONTRATO"
          titulo="Día de Pago"
          opciones={DIA_CORTE_OPCIONES}
          valor={formContrato.diaCorte}
          onSelect={(v) => { setFormContrato({ ...formContrato, diaCorte: v }); setPickerActivo(null); }}
          onCerrar={() => setPickerActivo(null)}
        />
      )}

    </div>
  );
}
