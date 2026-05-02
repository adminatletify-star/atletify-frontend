import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import BackButton from '../components/BackButton';
import BotonSeguro from '../components/BotonSeguro';
import DuracionPlanPicker from '../components/DuracionPlanPicker';
import TipoMovimientoPicker from '../components/TipoMovimientoPicker';
import FiltroMesAnoPicker from '../components/FiltroMesAnoPicker';
import SelectorPlanPicker from '../components/SelectorPlanPicker';
import PromocionPicker from '../components/PromocionPicker';
import MetodoPagoPicker from '../components/MetodoPagoPicker';
import '../assets/css/GestionFinanzas.css';

const API_BASE = 'https://localhost:7149/api/finanzas';

export default function GestionFinanzas() {
  const navigate = useNavigate();
  const location = useLocation();
  const { usuario } = useAuth();

  const [box, setBox] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pestaña, setPestaña] = useState(location.state?.fromTab || 'dashboard');
  const [dashboardData, setDashboardData] = useState(null);
  const [descuentos, setDescuentos] = useState([]);
  const [formDescuento, setFormDescuento] = useState({ nombre: '', porcentaje: '' });



  const token = localStorage.getItem('token');
  const headersGet = { 'Authorization': `Bearer ${token}` };
  const headersPost = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

  const [semaforo, setSemaforo] = useState([]);
  const [busquedaSemaforo, setBusquedaSemaforo] = useState('');
  const [ordenSemaforo, setOrdenSemaforo] = useState('');
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

  const [formDropIn, setFormDropIn] = useState({ nombreAtletaExterno: '', montoPagado: '', tipoVisita: 'Clase' });
  const [listaDropins, setListaDropins] = useState([]);
  const [loadingDropins, setLoadingDropins] = useState(false);

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
      const [resSemaforo, resPlanes, resDashboard, resDescuentos] = await Promise.all([
        fetch(`${API_BASE}/semaforo/${idBox}`, { headers: headersGet }),
        fetch(`${API_BASE}/planes/${idBox}`, { headers: headersGet }),
        fetch(`${API_BASE}/dashboard/${idBox}`, { headers: headersGet }),
        fetch(`${API_BASE}/descuentos/${idBox}`, { headers: headersGet }),
      ]);
      if (resSemaforo.ok) setSemaforo(await resSemaforo.json());
      if (resPlanes.ok) setPlanes(await resPlanes.json());
      if (resDashboard.ok) setDashboardData(await resDashboard.json());
      if (resDescuentos.ok) setDescuentos(await resDescuentos.json());
    } catch (error) { console.error('Error al cargar finanzas:', error); } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const b = JSON.parse(localStorage.getItem('box'));
    if (!b) { navigate('/login'); return; }
    setBox(b);
    cargarDatos(b.idBox);
  }, [navigate, cargarDatos, location.key]);

  // V4: Recargar datos cuando el usuario regresa de otra página (Ej: del perfil del atleta)
  useEffect(() => {
    const handleFocus = () => {
      const b = JSON.parse(localStorage.getItem('box'));
      if (b) cargarDatos(b.idBox);
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [cargarDatos]);

  const cargarMovimientos = useCallback(async (idBox, mes = '', tipo = 'Todos') => {
    setLoadingMov(true);
    try {
      const params = new URLSearchParams();
      if (mes) params.append('mes', mes);
      if (tipo && tipo !== 'Todos') params.append('tipo', tipo);
      const qs = params.toString() ? `?${params}` : '';
      const [resMov, resResumen] = await Promise.all([
        fetch(`https://localhost:7149/api/movimientos/box/${idBox}${qs}`, { headers: headersGet }),
        fetch(`https://localhost:7149/api/movimientos/box/${idBox}/resumen${qs}`, { headers: headersGet }),
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

  useEffect(() => {
    if (pestaña === 'movimientos' && box) cargarMovimientos(box.idBox, filtroMes, filtroTipoMov);
    if (pestaña === 'dropin' && box) cargarDropins(box.idBox);
  }, [pestaña, box, filtroMes, filtroTipoMov]);

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
    e.preventDefault();
    if (!formPlan.nombre || !formPlan.precio || !formPlan.duracionDias) return alert('Llena todos los campos');
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
    e.preventDefault();
    if (!formEditPlan.nombre || !formEditPlan.precio) return alert('Nombre y precio obligatorios');

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

  const registrarDropIn = async (e) => {
    e.preventDefault();
    if (!formDropIn.nombreAtletaExterno) return alert('Se requiere un nombre');
    try {
      const payload = {
        idBox: box.idBox,
        nombre: formDropIn.nombreAtletaExterno,
        tipoVisita: formDropIn.tipoVisita,
        montoPagado: formDropIn.montoPagado ? parseFloat(formDropIn.montoPagado) : null
      };

      const res = await fetch(`${API_BASE}/dropin`, { method: 'POST', headers: headersPost, body: JSON.stringify(payload) });
      if (res.ok) {
        alert('Walk-In Registrado.');
        setFormDropIn({ nombreAtletaExterno: '', montoPagado: '', tipoVisita: 'Clase' });
        cargarDropins(box.idBox);
        cargarDatos(box.idBox);
      }
    } catch (e) { alert('Error al registrar Walk-In'); }
  };

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
        `https://localhost:7149/api/precioespecial/calcular/${atletaARenovar.idUsuario}/box/${b.idBox}/plan/${planSeleccionado}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      if (res.ok) {
        const calculo = await res.json();
        // Pre-llenar el formulario con los datos de la calculadora
        setFormCobro(prev => ({
          ...prev,
          cobrarInscripcion: calculo.debeInscripcion,
          montoInscripcion: String(calculo.montoInscripcion || 0),
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
  const totalACobrar = Math.max(0, (precioConDescuentoPersonal - descuentoPromo) + costoInscripcion);
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
      const resPago = await fetch('https://localhost:7149/api/cobranza/pagar', {
        method: 'POST',
        headers: headersPost,
        body: JSON.stringify({
          idSuscripcion: dataRenovar.idSuscripcion,
          montoMetodo1: m1,
          metodoPago1: formCobro.metodo1,
          montoMetodo2: m2 > 0 ? m2 : null,
          metodoPago2: m2 > 0 ? formCobro.metodo2 : null,
          notas: formCobro.notas,
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
    return !term || nombreMatch || telefonoMatch;
  }).sort((a, b) => {
    if (!ordenSemaforo) return 0;
    const diasA = a.diasRestantes ?? 0;
    const diasB = b.diasRestantes ?? 0;
    if (ordenSemaforo === 'dias_asc') return diasA - diasB;
    if (ordenSemaforo === 'dias_desc') return diasB - diasA;
    return 0;
  });

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
        <h1 className="finanzas-nav-titulo">Centro Financiero</h1>
      </nav>

      <div className="container py-4">

        <div className="finanzas-tabs-wrapper mb-4">
          <div className="finanzas-tabs">
            <button className={`finanzas-tab ${pestaña === 'dashboard' ? 'activo' : ''}`} onClick={() => setPestaña('dashboard')}><i className="fas fa-chart-pie"></i>Dashboard</button>
            <button className={`finanzas-tab ${pestaña === 'semaforo' ? 'activo' : ''}`} onClick={() => setPestaña('semaforo')}><i className="fas fa-traffic-light"></i>Semáforo</button>
            <button className={`finanzas-tab ${pestaña === 'planes' ? 'activo' : ''}`} onClick={() => setPestaña('planes')}><i className="fas fa-tags"></i>Planes</button>
            <button className={`finanzas-tab ${pestaña === 'descuentos' ? 'activo' : ''}`} onClick={() => setPestaña('descuentos')}><i className="fas fa-percent"></i>Promos</button>
            <button className={`finanzas-tab ${pestaña === 'dropin' ? 'activo' : ''}`} onClick={() => setPestaña('dropin')}><i className="fas fa-plane-arrival"></i>Drop-In</button>
            <button className={`finanzas-tab ${pestaña === 'movimientos' ? 'activo' : ''}`} onClick={() => setPestaña('movimientos')}><i className="fas fa-history"></i>Movimientos</button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-5"><div className="spinner-wp"></div></div>
        ) : (
          <>
            {/* TAB: DASHBOARD */}
            {pestaña === 'dashboard' && dashboardData && (
              <div className="row g-4">
                <div className="col-12">
                  <div className="finanzas-stat-principal">
                    <p className="finanzas-stat-label"><i className="fas fa-calendar-check me-1"></i>Ingresos del Mes</p>
                    <p className="finanzas-stat-valor">${dashboardData.ingresosMes.toFixed(2)}</p>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="finanzas-card">
                    <div className="finanzas-card-titulo"><i className="fas fa-users" style={{ color: 'var(--accent-cool)' }}></i> Salud de la Manada</div>
                    <div className="finanzas-salud-row"><span className="finanzas-salud-label" style={{ color: 'var(--success)' }}><i className="fas fa-check-circle"></i>Al Día</span><span className="finanzas-salud-cnt finanzas-salud-cnt--verde">{dashboardData.estadoAtletas.alDia} atletas</span></div>
                    <div className="finanzas-salud-row"><span className="finanzas-salud-label" style={{ color: 'var(--danger)' }}><i className="fas fa-times-circle"></i>Vencidos</span><span className="finanzas-salud-cnt finanzas-salud-cnt--rojo">{dashboardData.estadoAtletas.morosos} atletas</span></div>
                    <div className="finanzas-salud-row"><span className="finanzas-salud-label" style={{ color: 'var(--accent-cool)' }}><i className="fas fa-snowflake"></i>Congelados</span><span className="finanzas-salud-cnt finanzas-salud-cnt--azul">{dashboardData.estadoAtletas.congelados} atletas</span></div>
                  </div>
                </div>
                <div className="col-md-6">
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

            {/* TAB: SEMÁFORO */}
            {pestaña === 'semaforo' && (
              <div className="finanzas-card">
                <div className="finanzas-card-titulo d-flex justify-content-between align-items-center flex-wrap gap-2">
                  <span><i className="fas fa-traffic-light" style={{ color: 'var(--success)' }}></i> Estado de Atletas</span>
                  <div className="d-flex gap-2 flex-wrap">
                    <input 
                      type="text" 
                      className="finanzas-input mb-0 py-1 px-2" 
                      placeholder="Buscar por nombre o teléfono..." 
                      style={{ width: '250px', fontSize: '0.9rem' }}
                      value={busquedaSemaforo}
                      onChange={(e) => setBusquedaSemaforo(e.target.value)}
                    />
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
                <div className="finanzas-table-wrapper">
                  <table className="finanzas-table">
                    <thead><tr><th>Atleta</th><th>Plan Actual</th><th>Estado</th><th style={{ textAlign: 'right' }}>Acción</th></tr></thead>
                    <tbody>
                      {semaforoFiltrado.length === 0 ? <tr><td colSpan="4"><div className="finanzas-empty"><p>No hay atletas que coincidan.</p></div></td></tr> : (
                        semaforoFiltrado.map(s => (
                          <tr key={s.idUsuario}>
                            <td><div className="finanzas-atleta-nombre">{s.nombre} {s.esDeConfianza && <span className="badge bg-info text-dark ms-2" style={{ fontSize: '0.65rem' }} title="Atleta de Confianza (Fiado)"><i className="fas fa-handshake"></i> Confianza</span>}</div><div className="finanzas-atleta-tel"><i className="fas fa-phone me-1"></i>{s.telefono || 'Sin número'}</div></td>
                            <td style={{ color: 'var(--secondary)' }}>{s.plan}</td>
                            <td><span className={`finanzas-badge ${getBadgeColor(s.estado)}`}>{s.estado === 'Verde' ? `Al día · ${s.diasRestantes}d`
                              : s.estado === 'Amarillo' ? `Por vencer · ${s.diasRestantes}d`
                                : s.estado === 'Azul' ? 'CONGELADO '
                                  : s.estado === 'VIP' ? 'PASE LIBRE '
                                    : s.estado === 'Gris' ? 'CANCELADO '
                                      : 'VENCIDO'}
                            </span></td>
                            <td>
                              <div className="d-flex gap-2 justify-content-end flex-wrap">
                                {/* 👇 AQUÍ AGREGAMOS EL disabled Y LA OPACIDAD 👇 */}
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

                        <div className="col-md-6">
                          <label className="etiqueta-campo">Duración (Días)</label>
                          <DuracionPlanPicker valor={formPlan.duracionDias} onCambiar={v => setFormPlan({ ...formPlan, duracionDias: v })} />
                        </div>
                        <div className="col-md-6">
                          <label className="etiqueta-campo">Límite de Visitas (Vacío = Ilimitado)</label>
                          <input type="number" className="finanzas-input" value={formPlan.limiteClasesMensual} onChange={e => setFormPlan({ ...formPlan, limiteClasesMensual: e.target.value })} placeholder="Ej. 4 para Cuponeras" />
                        </div>

                        <div className="col-12">
                          <label className="etiqueta-campo">Descripción Corta (Visible en la App)</label>
                          <input type="text" className="finanzas-input" value={formPlan.descripcion} onChange={e => setFormPlan({ ...formPlan, descripcion: e.target.value })} placeholder="Ej. Acceso a todas las clases y open gym" />
                        </div>

                        <div className="col-12 mt-3 mb-1"><hr style={{ borderColor: 'rgba(255,255,255,0.1)' }} /> <p className="text-secondary small fw-bold mb-0"><i className="fas fa-cogs me-1"></i> CONFIGURACIÓN AVANZADA Y LEALTAD</p></div>

                        <div className="col-md-6">
                          <label className="etiqueta-campo">Nivel de Acceso</label>
                          <select className="finanzas-input" value={formPlan.nivelAcceso} onChange={e => setFormPlan({ ...formPlan, nivelAcceso: e.target.value })}>
                            <option value="CrossFit">Clases de CrossFit</option>
                            <option value="OpenGym">Solo Open Gym (Pesas)</option>
                            <option value="Hibrido">Híbrido (Ambos)</option>
                          </select>
                        </div>
                        <div className="col-md-6">
                          <label className="etiqueta-campo">Precio Mensual Base (Para mostrar ahorro)</label>
                          <input type="number" className="finanzas-input" value={formPlan.precioReferenciaMensual} onChange={e => setFormPlan({ ...formPlan, precioReferenciaMensual: e.target.value })} placeholder="Opcional. Ej: 800" />
                        </div>

                        <div className="col-12 d-flex flex-column gap-2 mt-2 p-3 rounded" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <div className="form-check form-switch">
                            <input className="form-check-input bg-warning border-warning" type="checkbox" id="reqInsc" checked={formPlan.requiereInscripcion} onChange={e => setFormPlan({ ...formPlan, requiereInscripcion: e.target.checked })} />
                            <label className="form-check-label text-warning fw-bold ms-2" htmlFor="reqInsc"><i className="fas fa-crown me-1"></i>Requiere Inscripción Anual (Suma Racha de Lealtad)</label>
                          </div>
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

            {/* TAB: DROP-IN (V2) */}
            {pestaña === 'dropin' && (
              <div className="row g-4">
                {/* FORMULARIO DE WALK-IN RÁPIDO */}
                <div className="col-12 col-lg-4">
                  <div className="finanzas-card sticky-top" style={{ top: '80px' }}>
                    <div className="text-center mb-4"><i className="fas fa-walking text-warning display-4 mb-2"></i><div className="finanzas-card-titulo d-block border-0 mb-1">Registrar Walk-In Rápido</div><p className="text-secondary small">Para atletas que llegan sin avisar a mostrador. El pase se asume inmediato.</p></div>
                    <form onSubmit={registrarDropIn}>
                      <div className="mb-3">
                        <label className="etiqueta-campo">Nombre del Turista</label>
                        <input type="text" className="finanzas-input" value={formDropIn.nombreAtletaExterno} onChange={e => setFormDropIn({ ...formDropIn, nombreAtletaExterno: e.target.value })} required />
                      </div>
                      <div className="mb-3">
                        <label className="etiqueta-campo">¿Qué tomará?</label>
                        <select className="finanzas-input" value={formDropIn.tipoVisita} onChange={e => setFormDropIn({ ...formDropIn, tipoVisita: e.target.value })}>
                          <option value="Clase">Clase Guiada</option>
                          <option value="SoloGym">Solo Open Gym</option>
                        </select>
                      </div>
                      <div className="mb-4">
                        <label className="etiqueta-campo">Monto Pagado Físico ($)</label>
                        <input type="number" className="finanzas-input text-warning fw-bold fs-4" placeholder="(Opcional) Vacío = Predeterminado" value={formDropIn.montoPagado} onChange={e => setFormDropIn({ ...formDropIn, montoPagado: e.target.value })} />
                      </div>
                      <button type="submit" className="finanzas-btn-submit finanzas-btn-submit--warning" textoProcesando="Aprobando...">
                        <i className="fas fa-bolt me-2"></i>Registrar Ingreso Físico
                      </button>
                    </form>
                  </div>
                </div>

                {/* LISTA DE RESERVAS Y PAGOS (EL CONCENTRADOR) */}
                <div className="col-12 col-lg-8">
                  <div className="finanzas-card">
                    <div className="finanzas-card-titulo">
                      <i className="fas fa-list-alt text-success"></i> Lista de Turistas Recientes
                    </div>
                    {loadingDropins ? <div className="text-center py-4"><div className="spinner-border text-warning"></div></div> : (
                      <div className="table-responsive">
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
                                    <div className="fw-bold text-white">{new Date(v.fechaProgramada).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}</div>
                                    <div className="small text-secondary">{v.horaClase || '--:--'}</div>
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
                                      <span className="badge bg-success bg-opacity-25 border border-success text-success rounded-pill"><i className="fas fa-check-circle me-1"></i>Pagado <small>({v.estatus == 'Pagado_Efectivo' ? 'Efctivo' : 'Stripe'})</small></span>
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
                    )}
                  </div>
                </div>
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
                {loadingMov ? <div className="text-center py-5"><div className="spinner-wp"></div></div> : (
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
                              <td className="text-end text-success fw-bold">${m.monto?.toFixed(2)}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
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
                  <input type="number" step="0.01" className="entrada-oscura fw-bold" required value={formCobro.monto1} onChange={e => setFormCobro({ ...formCobro, monto1: e.target.value })} placeholder="Ej. 500" />
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
                <button type="submit" className="btn btn-success w-50" >
                  <i className="fas fa-check me-1"></i>Activar Plan</button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* ── MODAL 3: EDICIÓN SUPREMA DE PLANES ── */}
      {showModalEditPlan && (
        <div className="finanzas-modal-overlay" onClick={() => setShowModalEditPlan(false)}>
          <div className="finanzas-modal" style={{ maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <h3 className="finanzas-modal-titulo text-accent"><i className="fas fa-edit me-2"></i>Editar Plan de Membresía</h3>

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

                <div className="col-md-6">
                  <label className="etiqueta-campo">Duración (Días)</label>
                  <DuracionPlanPicker valor={formEditPlan.duracionDias} onCambiar={v => setFormEditPlan({ ...formEditPlan, duracionDias: v })} />
                </div>
                <div className="col-md-6">
                  <label className="etiqueta-campo">Límite de Visitas / Mes</label>
                  <input type="number" className="finanzas-input" placeholder="Vacío = Ilimitado" value={formEditPlan.limiteClasesMensual} onChange={e => setFormEditPlan({ ...formEditPlan, limiteClasesMensual: e.target.value })} />
                </div>

                <div className="col-12">
                  <label className="etiqueta-campo">Descripción Comercial (Visible para Atletas)</label>
                  <input type="text" className="finanzas-input" placeholder="Ej. Acceso a pesas y regaderas" value={formEditPlan.descripcion} onChange={e => setFormEditPlan({ ...formEditPlan, descripcion: e.target.value })} />
                </div>

                {/* LOS NUEVOS CAMPOS DE EDWIN */}
                <div className="col-12 mt-3 mb-1"><hr style={{ borderColor: 'rgba(255,255,255,0.1)' }} /> <p className="text-secondary small fw-bold mb-0"><i className="fas fa-cogs me-1"></i> CONFIGURACIÓN AVANZADA</p></div>

                <div className="col-md-6">
                  <label className="etiqueta-campo">Nivel de Acceso</label>
                  <select className="finanzas-input" value={formEditPlan.nivelAcceso} onChange={e => setFormEditPlan({ ...formEditPlan, nivelAcceso: e.target.value })}>
                    <option value="CrossFit">Clases de CrossFit</option>
                    <option value="OpenGym">Solo Open Gym (Pesas)</option>
                    <option value="Hibrido">Híbrido (Ambos)</option>
                  </select>
                </div>
                <div className="col-md-6">
                  <label className="etiqueta-campo">Prioridad de Reserva</label>
                  <input type="number" className="finanzas-input" value={formEditPlan.prioridadReserva} onChange={e => setFormEditPlan({ ...formEditPlan, prioridadReserva: e.target.value })} min="1" title="1 es lo más alto" />
                </div>

                <div className="col-12 d-flex flex-column gap-2 mt-2 p-3 rounded" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="form-check form-switch">
                    <input className="form-check-input" type="checkbox" id="editReqInsc" checked={formEditPlan.requiereInscripcion} onChange={e => setFormEditPlan({ ...formEditPlan, requiereInscripcion: e.target.checked })} />
                    <label className="form-check-label text-light ms-2" htmlFor="editReqInsc">Requiere pagar Inscripción Anual</label>
                  </div>
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

    </div>
  );
}