import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { COMPETENCIAS_ENDPOINT, FINANZAS_ENDPOINT } from '../services/api';
import RedGrayDatePicker from '../components/RedGrayDatePicker';
import DateWheelPicker from '../components/DateWheelPicker';
import AnimatedList from '../components/ReactBits/AnimatedList';
import '../assets/css/PortalCompetencias.css';
import BackButton from '../components/BackButton';
import GeneroPicker from '../components/GeneroPicker';
import CategoriaBaseMasterPicker from '../components/CategoriaBaseMasterPicker';
import TipoSangrePicker from '../components/TipoSangrePicker';
import TallaPlayeraPicker from '../components/TallaPlayeraPicker';
import MetodoPagoPicker from '../components/MetodoPagoPicker';
import BotonSeguro from '../components/BotonSeguro';
import AtletifyLoader from '../components/AtletifyLoader';

const CountdownTimer = ({ targetDate, onExpire }) => {
  const calculateTimeLeft = () => {
    const difference = +new Date(targetDate) - +new Date();
    let timeLeft = {};

    if (difference > 0) {
      timeLeft = {
        minutos: Math.floor((difference / 1000 / 60) % 60),
        segundos: Math.floor((difference / 1000) % 60)
      };
    } else {
      timeLeft = { minutos: 0, segundos: 0 };
    }
    return timeLeft;
  };

  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

  useEffect(() => {
    const timer = setTimeout(() => {
      const remaining = calculateTimeLeft();
      setTimeLeft(remaining);
      if (remaining.minutos === 0 && remaining.segundos === 0 && onExpire) {
        onExpire();
      }
    }, 1000);
    return () => clearTimeout(timer);
  });

  return (
    <span className="fw-bold" style={{ fontFamily: 'monospace', fontSize: '1.2rem', letterSpacing: '1px' }}>
      {timeLeft.minutos.toString().padStart(2, '0')}:{timeLeft.segundos.toString().padStart(2, '0')}
    </span>
  );
};

// Cuenta regresiva larga (días/horas/min/seg) para fechas de inscripción que pueden estar a días.
const CuentaRegresiva = ({ targetDate }) => {
  const calc = () => {
    const diff = +new Date(targetDate) - +new Date();
    if (diff <= 0) return null;
    return {
      dias: Math.floor(diff / 86400000),
      horas: Math.floor((diff / 3600000) % 24),
      minutos: Math.floor((diff / 60000) % 60),
      segundos: Math.floor((diff / 1000) % 60),
    };
  };
  const [t, setT] = useState(calc());
  useEffect(() => {
    const timer = setInterval(() => setT(calc()), 1000);
    return () => clearInterval(timer);
  }, [targetDate]);
  if (!t) return null;
  return (
    <strong style={{ fontFamily: 'monospace', letterSpacing: '0.5px', marginLeft: '6px' }}>
      {t.dias > 0 ? `${t.dias}d ` : ''}{String(t.horas).padStart(2, '0')}:{String(t.minutos).padStart(2, '0')}:{String(t.segundos).padStart(2, '0')}
    </strong>
  );
};

export default function PortalCompetencias() {
  const { id } = useParams();
  const [competencias, setCompetencias] = useState([]);
  const [pasadas, setPasadas] = useState([]); // competencias finalizadas (Historial) para consultar su leaderboard
  const [loading, setLoading] = useState(true);
  const [compActiva, setCompActiva] = useState(null);
  const [pestaña, setPestaña] = useState('info');
  const [comprobanteFile, setComprobanteFile] = useState(null);

  const [catSeleccionada, setCatSeleccionada] = useState(null);
  const [categoriaInfo, setCategoriaInfo] = useState(null);
  const [mostrarInfo, setMostrarInfo] = useState(false);

  // === ESTADOS PARA FLUJO DE INSCRIPCION INDIVIDUAL ===
  const [modalRequisitoNivel, setModalRequisitoNivel] = useState(null);
  const [modalAdvertenciaNivel, setModalAdvertenciaNivel] = useState(null);
  const [modalCachirul, setModalCachirul] = useState(null);

  const [modoInscripcion, setModoInscripcion] = useState(null);
  const [codigoInvitacion, setCodigoInvitacion] = useState('');

  // === ESTADOS PARA FLUJO DE EQUIPO ESTRICTO ===
  const [equipoUnirseInfo, setEquipoUnirseInfo] = useState(null);
  const [plazaEsperaHasta, setPlazaEsperaHasta] = useState(null); // bloqueo de plaza al unirse (concurrencia ≤5 min)
  const [reservaTick, setReservaTick] = useState(0); // fuerza re-reservar la plaza (reintentar)
  const [pagoCanceladoCodigo, setPagoCanceladoCodigo] = useState(''); // si el pago en línea se canceló/rechazó, para reintentar
  const [modalRequisitoEquipo, setModalRequisitoEquipo] = useState(null);
  const [buscandoEquipo, setBuscandoEquipo] = useState(false);

  const [formEquipo, setFormEquipo] = useState({ nombreEquipo: '', boxOrigen: '' });

  const [atletaForm, setAtletaForm] = useState({
    nombreCompleto: '', apellidos: '', correo: '', telefono: '', fechaNacimiento: '',
    genero: '', tipoSangre: '', tallaPlayera: '', nivelHabilidad: '', aceptoCartaResponsiva: false,
    aceptoRiesgoNivel: false
  });

  const [pagoForm, setPagoForm] = useState({ monto: '', metodo: 'Transferencia' });

  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '', codigo: '' });
  const [mostrarDwp, setMostrarDwp] = useState(false);
  const [copiadoCodigo, setCopiadoCodigo] = useState(false);

  // === ESTADOS PARA ESTATUS ===
  const [codigoEstatus, setCodigoEstatus] = useState('');
  const [buscandoEstatus, setBuscandoEstatus] = useState(false);
  const [datosEstatus, setDatosEstatus] = useState(null);
  const [errorEstatus, setErrorEstatus] = useState('');

  useEffect(() => {
    cargarCompetencias();
  }, [id]);

  // Los avisos (validaciones, errores, info, éxito) se muestran como TOAST arriba a la derecha
  // (sistema global GlobalAlertBridge), igual que en el resto de la app — no como banner inline.
  // El código de equipo (mensaje.codigo) sigue abriendo su propio modal, así que ahí no se toastea.
  useEffect(() => {
    if (!mensaje.texto || mensaje.codigo) return;
    const variant = mensaje.tipo === 'danger' ? 'error' : (mensaje.tipo === 'success' ? 'success' : 'info');
    if (typeof window.wpToast === 'function') window.wpToast(mensaje.texto, variant);
    else window.alert(mensaje.texto);
  }, [mensaje]);

  // Genera la sesión de Stripe para un equipo (por su código) y redirige al checkout. Reutilizado por el
  // botón "Pagar en línea ahora" del correo y por el botón de reintento si el pago se canceló/rechazó.
  const iniciarPagoPorCodigo = async (codigo) => {
    try {
      setMensaje({ tipo: 'info', texto: 'Generando tu pago en línea…', codigo: '' });
      const resInfo = await fetch(`${COMPETENCIAS_ENDPOINT}/equipo/info/${codigo}`);
      const info = await resInfo.json();
      const idEquipo = info.idEquipoComp || info.IdEquipoComp;
      if (!resInfo.ok || !idEquipo) {
        setMensaje({ tipo: 'danger', texto: info.mensaje || 'No se encontró tu equipo.', codigo: '' });
        return;
      }
      const resCk = await fetch(`${FINANZAS_ENDPOINT}/checkout-competencia/${id}/${idEquipo}`, { method: 'POST' });
      const dataCk = await resCk.json();
      if (resCk.ok && dataCk.url) { window.location.href = dataCk.url; return; }
      setMensaje({ tipo: 'danger', texto: dataCk.mensaje || 'No se pudo iniciar el pago en línea.', codigo: '' });
    } catch {
      setMensaje({ tipo: 'danger', texto: 'Error al iniciar el pago en línea.', codigo: '' });
    }
  };

  // Retorno desde Stripe Checkout: SuccessUrl trae ?comp_success=1&codigo=...; CancelUrl ?comp_cancel=1&codigo=...
  // (cancelado o tarjeta rechazada). El pago real lo acredita el webhook; aquí damos feedback y limpiamos la URL.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('comp_success') === '1') {
      setMensaje({ tipo: 'success', texto: '¡Pago recibido! Tu inscripción quedó confirmada. Guarda tu código de equipo para consultar el estatus.', codigo: params.get('codigo') || '' });
      window.history.replaceState({}, '', window.location.pathname);
      window.scrollTo(0, 0);
    } else if (params.get('comp_cancel') === '1') {
      setPagoCanceladoCodigo(params.get('codigo') || '');
      setMensaje({ tipo: 'warning', texto: 'Tu pago NO se completó (lo cancelaste o la tarjeta fue rechazada). Tu equipo quedó registrado pero SIN pagar, así que su lugar no está asegurado. Puedes reintentar el pago en el aviso de arriba.', codigo: '' });
      window.history.replaceState({}, '', window.location.pathname);
      window.scrollTo(0, 0);
    }
  }, []);

  // Pago en línea desde el correo: el botón "Pagar en línea ahora" trae ?codigo=XXX&pagar=1.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const codigo = params.get('codigo');
    if (params.get('pagar') !== '1' || !codigo) return;
    window.history.replaceState({}, '', window.location.pathname);
    iniciarPagoPorCodigo(codigo);
  }, [id]);

  // Deep-link del correo "Invitar a mi equipo": ?codigo=XXX (sin pagar). Abre directo el flujo de unión
  // con los datos del equipo (ya pagado), saltando la selección de categoría.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const codigo = params.get('codigo');
    if (!codigo || params.get('pagar') === '1' || params.get('comp_success') === '1' || params.get('comp_cancel') === '1') return;
    window.history.replaceState({}, '', window.location.pathname);
    (async () => {
      try {
        const res = await fetch(`${COMPETENCIAS_ENDPOINT}/equipo/info/${codigo}`);
        const data = await res.json();
        if (!res.ok) { setMensaje({ tipo: 'danger', texto: data.mensaje || 'Código de equipo inválido.', codigo: '' }); return; }
        const estatus = (data.estatusPago || data.EstatusPago || '').toLowerCase();
        if (estatus !== 'aprobado' && estatus !== 'pagado') {
          setMensaje({ tipo: 'warning', texto: 'Este equipo aún no ha completado su pago. Pídele al capitán que pague la inscripción antes de unirte.', codigo: '' });
          return;
        }
        const c = data.categoria || data.Categoria || {};
        // Sintetizamos la categoría para que el formulario de unión se renderice sin pasar por la selección.
        setCatSeleccionada({
          nombre: c.nombre || c.Nombre,
          esEquipo: c.esEquipo ?? c.EsEquipo ?? true,
          costo: c.costo || c.Costo || 0,
          cantidadIntegrantes: c.cantidadIntegrantes || c.CantidadIntegrantes || 0,
          cupoHombres: c.cupoHombres || c.CupoHombres || 0,
          cupoMujeres: c.cupoMujeres || c.CupoMujeres || 0,
          cupoMaster: c.cupoMaster || c.CupoMaster || 0,
          cupoAvanzado: c.cupoAvanzado || c.CupoAvanzado || 0,
          cupoIntermedio: c.cupoIntermedio || c.CupoIntermedio || 0,
          cupoPrincipiante: c.cupoPrincipiante || c.CupoPrincipiante || 0,
          cupoNovato: c.cupoNovato || c.CupoNovato || 0
        });
        setEquipoUnirseInfo(data);
        setCodigoInvitacion(codigo);
        setPestaña('inscripcion');
        setModoInscripcion('unirse');
        setMensaje({ tipo: 'info', texto: `Te estás uniendo al equipo "${data.nombre || data.Nombre}". Completa tus datos de atleta para terminar.`, codigo: '' });
        window.scrollTo(0, 0);
      } catch {
        setMensaje({ tipo: 'danger', texto: 'No se pudo abrir el registro del equipo.', codigo: '' });
      }
    })();
  }, [id]);

  // Concurrencia: al entrar a "unirse", reservamos la plaza (bloqueo ≤5 min). Si otro compañero ya está
  // registrándose, guardamos hasta cuándo esperar para mostrar el contador en vez del formulario.
  useEffect(() => {
    if (modoInscripcion !== 'unirse' || !codigoInvitacion) { setPlazaEsperaHasta(null); return; }
    let cancelado = false;
    (async () => {
      try {
        const res = await fetch(`${COMPETENCIAS_ENDPOINT}/equipo/${codigoInvitacion}/reservar-plaza`, { method: 'POST' });
        const data = await res.json();
        if (cancelado) return;
        if (res.ok && data.ok === false) {
          const segs = data.segundosRestantes || data.SegundosRestantes || 0;
          setPlazaEsperaHasta(segs > 0 ? new Date(Date.now() + segs * 1000).toISOString() : null);
        } else {
          setPlazaEsperaHasta(null);
        }
      } catch { if (!cancelado) setPlazaEsperaHasta(null); }
    })();
    return () => { cancelado = true; };
  }, [modoInscripcion, codigoInvitacion, reservaTick]);

  const cargarCompetencias = async () => {
    try {
      const res = await fetch(`${COMPETENCIAS_ENDPOINT}/publicas`);
      const data = await res.json();
      setCompetencias(data);
      if (data.length > 0) {
        if (id) {
          const encontrada = data.find(c => String(c.idCompetencia || c.IdCompetencia) === String(id));
          setCompActiva(encontrada || data[0]);
        } else {
          setCompActiva(data[0]);
        }
      }
    } catch (error) { console.error(error); } finally { setLoading(false); }
    // Historial público (opcional): para consultar el leaderboard de eventos ya finalizados.
    try {
      const rh = await fetch(`${COMPETENCIAS_ENDPOINT}/publicas-historial`);
      if (rh.ok) setPasadas(await rh.json());
    } catch { /* el historial es opcional, no bloquea el portal */ }
  };

  const getCategoryLevelString = (cat) => {
    if (cat.cupoNovato > 0 || cat.CupoNovato > 0) return 'Novato';
    if (cat.cupoPrincipiante > 0 || cat.CupoPrincipiante > 0) return 'Principiante';
    if (cat.cupoIntermedio > 0 || cat.CupoIntermedio > 0) return 'Intermedio';
    if (cat.cupoAvanzado > 0 || cat.CupoAvanzado > 0) return 'RX';
    if (cat.cupoMaster > 0 || cat.CupoMaster > 0) return 'Master';
    return 'Libre';
  };

  const getLevelValue = (levelStr) => {
    const l = (levelStr || '').toLowerCase();
    if (l === 'novato') return 0;
    if (l === 'principiante') return 1;
    if (l === 'intermedio') return 2;
    if (l === 'rx' || l === 'avanzado') return 3;
    if (l === 'master') return 4;
    return -1;
  };

  const intentarElegirCategoria = (cat) => {
    if (!cat.esEquipo) {
      setModalRequisitoNivel(cat);
    } else {
      seleccionarCategoria(cat);
    }
  };

  const seleccionarCategoria = (cat) => {
    setModalRequisitoNivel(null);
    setModalRequisitoEquipo(null);
    setEquipoUnirseInfo(null);
    setCatSeleccionada(cat);
    setModoInscripcion(null); // Force selection of mode
    setCodigoInvitacion('');
    setFormEquipo({ nombreEquipo: '', boxOrigen: '' });
    setAtletaForm({
      nombreCompleto: '', apellidos: '', correo: '', telefono: '', fechaNacimiento: '',
      genero: '', tipoSangre: '', tallaPlayera: '', nivelHabilidad: '', aceptoCartaResponsiva: false,
      fechaAceptacionCartaResponsiva: null, aceptoRiesgoNivel: false
    });
    setPagoForm({ monto: '', metodo: 'Transferencia' });
    setMensaje({ tipo: '', texto: '', codigo: '' });
    setComprobanteFile(null);
    setMostrarDwp(false);
  };

  const handleCrearInit = () => {
     setModalRequisitoEquipo({
       tipo: 'crear',
       restantes: {
         mHombres: catSeleccionada.cupoHombres || catSeleccionada.CupoHombres || 0,
         mMujeres: catSeleccionada.cupoMujeres || catSeleccionada.CupoMujeres || 0,
         mMaster: catSeleccionada.cupoMaster || catSeleccionada.CupoMaster || 0,
         mAvanzado: catSeleccionada.cupoAvanzado || catSeleccionada.CupoAvanzado || 0,
         mIntermedio: catSeleccionada.cupoIntermedio || catSeleccionada.CupoIntermedio || 0,
         mPrincipiante: catSeleccionada.cupoPrincipiante || catSeleccionada.CupoPrincipiante || 0,
         mNovato: catSeleccionada.cupoNovato || catSeleccionada.CupoNovato || 0,
       }
     });
  };

  const handleUnirseInit = () => {
    setModoInscripcion('codigo');
    setCodigoInvitacion('');
    setEquipoUnirseInfo(null);
  };

  const buscarEquipoPorCodigo = async () => {
    setBuscandoEquipo(true);
    setMensaje({ tipo: '', texto: '', codigo: '' });
    try {
      const res = await fetch(`${COMPETENCIAS_ENDPOINT}/equipo/info/${codigoInvitacion}`);
      const data = await res.json();
      if (res.ok) {
        // No se puede unir a un equipo con deuda / pendiente de aprobación (evita que entren a equipos
        // que nunca terminaron de pagar). El pago es por el TOTAL; solo equipos aprobados aceptan miembros.
        const estatus = (data.estatusPago || data.EstatusPago || '').toLowerCase();
        if (estatus !== 'aprobado' && estatus !== 'pagado') {
          setMensaje({ tipo: 'warning', texto: 'Ese equipo aún no ha completado su pago. No puedes unirte hasta que el capitán pague la inscripción completa y sea aprobada.', codigo: '' });
          setBuscandoEquipo(false);
          return;
        }
        setEquipoUnirseInfo(data);

        const c = data.categoria || data.Categoria;
        const a = data.atletas || data.Atletas || [];
        
        const mHombres = (c.cupoHombres||c.CupoHombres||0) - a.filter(x => (x.genero||x.Genero).toLowerCase() === 'hombre' || (x.genero||x.Genero).toLowerCase() === 'masculino').length;
        const mMujeres = (c.cupoMujeres||c.CupoMujeres||0) - a.filter(x => (x.genero||x.Genero).toLowerCase() === 'mujer' || (x.genero||x.Genero).toLowerCase() === 'femenino').length;
        
        const getLvl = (l) => {
          const lstr = l.toLowerCase();
          if (lstr==='novato') return 0;
          if (lstr==='principiante') return 1;
          if (lstr==='intermedio') return 2;
          if (lstr==='rx'||lstr==='avanzado') return 3;
          if (lstr==='master') return 4;
          return -1;
        };

        const mMaster = (c.cupoMaster||c.CupoMaster||0) - a.filter(x => getLvl(x.nivelHabilidad||x.NivelHabilidad) === 4).length;
        const mAvanzado = (c.cupoAvanzado||c.CupoAvanzado||0) - a.filter(x => getLvl(x.nivelHabilidad||x.NivelHabilidad) === 3).length;
        const mIntermedio = (c.cupoIntermedio||c.CupoIntermedio||0) - a.filter(x => getLvl(x.nivelHabilidad||x.NivelHabilidad) === 2).length;
        const mPrincipiante = (c.cupoPrincipiante||c.CupoPrincipiante||0) - a.filter(x => getLvl(x.nivelHabilidad||x.NivelHabilidad) === 1).length;
        const mNovato = (c.cupoNovato||c.CupoNovato||0) - a.filter(x => getLvl(x.nivelHabilidad||x.NivelHabilidad) === 0).length;

        setModalRequisitoEquipo({
          tipo: 'unirse',
          nombreEquipo: data.nombre || data.Nombre,
          restantes: { mHombres, mMujeres, mMaster, mAvanzado, mIntermedio, mPrincipiante, mNovato }
        });
      } else {
        setMensaje({ tipo: 'danger', texto: data.mensaje || 'Equipo no encontrado.' });
      }
    } catch (e) {
      setMensaje({ tipo: 'danger', texto: 'Error de conexión al buscar equipo.' });
    }
    setBuscandoEquipo(false);
  };

  const consultarEstatus = async (e) => {
    if (e) e.preventDefault();
    if (!codigoEstatus) return;
    setBuscandoEstatus(true);
    setErrorEstatus('');
    setDatosEstatus(null);
    try {
      const res = await fetch(`${COMPETENCIAS_ENDPOINT}/equipo/info/${codigoEstatus}`);
      const data = await res.json();
      if (res.ok) {
        setDatosEstatus(data);
      } else {
        setErrorEstatus(data.mensaje || 'Equipo no encontrado.');
      }
    } catch (err) {
      setErrorEstatus('Error de conexión con el servidor.');
    }
    setBuscandoEstatus(false);
  };

  const calcularEdad = (fechaNacimiento) => {
    if (!fechaNacimiento) return 0;
    const hoy = new Date();
    const cumple = new Date(fechaNacimiento);
    let edad = hoy.getFullYear() - cumple.getFullYear();
    const m = hoy.getMonth() - cumple.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < cumple.getDate())) { edad--; }
    return edad;
  };

  const procesarInscripcionFinal = async () => {
    setEnviando(true);
    setMensaje({ tipo: '', texto: '', codigo: '' });

    const metodoEf = getMetodoEfectivo();

    let urlFinalComprobante = '';
    if (metodoEf === 'Transferencia' && comprobanteFile) {
      const formData = new FormData();
      formData.append('file', comprobanteFile);
      try {
        const resFoto = await fetch(`${COMPETENCIAS_ENDPOINT}/upload-comprobante`, { method: 'POST', body: formData });
        if (resFoto.ok) {
          const dataFoto = await resFoto.json();
          urlFinalComprobante = dataFoto.url;
        } else {
          setMensaje({ tipo: 'danger', texto: 'Error al subir la imagen. Intenta con un JPG o PNG más ligero.' });
          setEnviando(false); return;
        }
      } catch (err) {
        setMensaje({ tipo: 'danger', texto: 'Error de conexión al subir comprobante.' });
        setEnviando(false); return;
      }
    }

    let urlEndpoint = '';
    let payload = {};

    if (!catSeleccionada.esEquipo || modoInscripcion === 'crear') {
      urlEndpoint = `${COMPETENCIAS_ENDPOINT}/inscribir-equipo`;
      payload = {
        idCategoriaComp: catSeleccionada.idCategoriaComp || catSeleccionada.IdCategoriaComp,
        nombreEquipo: catSeleccionada.esEquipo ? formEquipo.nombreEquipo : `${atletaForm.nombreCompleto} ${atletaForm.apellidos}`.trim(),
        boxOrigen: formEquipo.boxOrigen,
        capitan: atletaForm,
        montoAbonado: metodoEf === 'EnLinea' ? getCostoFinal() : (parseFloat(pagoForm.monto) || 0),
        metodoPago: metodoEf === 'EnLinea' ? 'Tarjeta' : metodoEf,
        comprobanteUrl: urlFinalComprobante
      };
    } else {
      urlEndpoint = `${COMPETENCIAS_ENDPOINT}/unirse-equipo`;
      payload = {
        codigoInvitacion: codigoInvitacion,
        atleta: atletaForm,
        montoAbonado: metodoEf === 'EnLinea' ? getCostoFinal() : (parseFloat(pagoForm.monto) || 0),
        metodoPago: metodoEf === 'EnLinea' ? 'Tarjeta' : metodoEf,
        comprobanteUrl: urlFinalComprobante
      };
    }

    try {
      const res = await fetch(urlEndpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (res.ok) {
        // Pago en línea: el equipo ya quedó creado; ahora generamos la sesión de Stripe Checkout
        // (sobre la cuenta Connect del box) y redirigimos. El webhook acredita el pago al volver.
        if (data.requiresCheckout && data.idEquipo) {
          try {
            const idComp = compActiva?.idCompetencia || compActiva?.IdCompetencia || id;
            const resCk = await fetch(`${FINANZAS_ENDPOINT}/checkout-competencia/${idComp}/${data.idEquipo}`, { method: 'POST' });
            const dataCk = await resCk.json();
            if (resCk.ok && dataCk.url) {
              window.location.href = dataCk.url;
              return;
            }
            setMensaje({ tipo: 'danger', texto: dataCk.mensaje || 'No se pudo iniciar el pago en línea. Intenta con otro método o más tarde.' });
            setEnviando(false);
            return;
          } catch (err) {
            setMensaje({ tipo: 'danger', texto: 'Error al iniciar el pago en línea con Stripe.' });
            setEnviando(false);
            return;
          }
        }

        setMensaje({ tipo: 'success', texto: data.mensaje, codigo: data.codigo || '' });
        setCatSeleccionada(null); setComprobanteFile(null); setModoInscripcion(null); setMostrarDwp(false);
        cargarCompetencias();
        window.scrollTo(0, 0);
      } else {
        if (data.mensaje && data.mensaje.includes('proceso de pago activo')) {
           setMensaje({ tipo: 'warning', texto: '⏳ ' + data.mensaje });
        } else {
           setMensaje({ tipo: 'danger', texto: data.mensaje || 'Error al inscribir.' });
        }
      }
    } catch (err) { setMensaje({ tipo: 'danger', texto: 'Error de conexión con el servidor.' }); }
    finally { setEnviando(false); }
  };

  const getCostoFinal = () => {
    if (!catSeleccionada) return 0;
    let costoFinal = parseFloat(catSeleccionada.costo || catSeleccionada.Costo || 0);
    if (modoInscripcion === 'unirse' && equipoUnirseInfo) {
      const abonado = equipoUnirseInfo.MontoAbonadoTotal || equipoUnirseInfo.montoAbonadoTotal || 0;
      costoFinal = Math.max(0, costoFinal - abonado);
    }
    return costoFinal;
  };

  // Métodos de pago que realmente acepta la competencia.
  const opcionesPagoPermitidas = () => {
    if (!compActiva) return ['Transferencia'];
    return [
      ((compActiva.aceptarPagosEnLinea ?? compActiva.AceptarPagosEnLinea ?? true) && (compActiva.boxStripeListo ?? compActiva.BoxStripeListo ?? false)) ? 'EnLinea' : null,
      (compActiva.aceptarTransferencias ?? compActiva.AceptarTransferencias ?? true) ? 'Transferencia' : null,
      (compActiva.aceptarEfectivo ?? compActiva.AceptarEfectivo ?? true) ? 'Efectivo' : null
    ].filter(Boolean);
  };

  // Método REAL a usar: si el guardado en el estado no está permitido (p. ej. "Transferencia"
  // por defecto cuando la competencia solo acepta pago en línea), cae a la primera opción válida.
  // Así el texto, el comprobante y el envío siempre coinciden con lo que se muestra.
  const getMetodoEfectivo = () => {
    const perm = opcionesPagoPermitidas();
    return perm.includes(pagoForm.metodo) ? pagoForm.metodo : (perm[0] || pagoForm.metodo);
  };

  const enviarInscripcion = async (e) => {
    if (e) e.preventDefault();

    if (!atletaForm.aceptoCartaResponsiva) {
      setMensaje({ tipo: 'danger', texto: 'Debes aceptar la carta responsiva para competir.' });
      return;
    }

    const edadAtleta = calcularEdad(atletaForm.fechaNacimiento);
    if (edadAtleta < 18) {
      setMensaje({ tipo: 'danger', texto: 'Debes ser mayor de 18 años para registrarte en línea. Si eres menor, acude a recepción para que el administrador del box autorice tu inscripción como caso especial.' });
      return;
    }

    if (!atletaForm.genero) {
      setMensaje({ tipo: 'danger', texto: 'Selecciona tu género.' });
      return;
    }

    if (!catSeleccionada.esEquipo) {
        const generoSel = atletaForm.genero.toLowerCase();
        const esHombre = generoSel === 'hombre' || generoSel === 'masculino';
        const esMujer = generoSel === 'mujer' || generoSel === 'femenino';
        
        if ((catSeleccionada.cupoHombres > 0 || catSeleccionada.CupoHombres > 0) && !esHombre) {
            setMensaje({ tipo: 'danger', texto: 'Esta categoría es exclusiva para la rama Varonil (Hombres).' });
            return;
        }
        if ((catSeleccionada.cupoMujeres > 0 || catSeleccionada.CupoMujeres > 0) && !esMujer) {
            setMensaje({ tipo: 'danger', texto: 'Esta categoría es exclusiva para la rama Femenil (Mujeres).' });
            return;
        }
    }

    if (!atletaForm.nivelHabilidad) {
      setMensaje({ tipo: 'danger', texto: 'Selecciona tu Nivel Real (Anti-Trampas).' });
      return;
    }

    if (!atletaForm.tipoSangre) {
      setMensaje({ tipo: 'danger', texto: 'Selecciona tu tipo de sangre.' });
      return;
    }

    if (!atletaForm.tallaPlayera) {
      setMensaje({ tipo: 'danger', texto: 'Selecciona tu talla de playera.' });
      return;
    }

    if (modoInscripcion === 'unirse' && !codigoInvitacion) {
      setMensaje({ tipo: 'danger', texto: 'Ingresa el código de invitación que te dio tu capitán.' });
      return;
    }

    const costoFinal = getCostoFinal();
    if (parseFloat(pagoForm.monto || 0) > costoFinal) {
      setMensaje({ tipo: 'danger', texto: `El monto ingresado ($${pagoForm.monto}) supera el saldo pendiente ($${costoFinal}).` });
      return;
    }

    // === VALIDACIÓN DE NIVELES (ANTI-CACHIRUL Y ADVERTENCIA) ===
    if (!catSeleccionada.esEquipo) {
      const catLevelStr = getCategoryLevelString(catSeleccionada);
      const catLevelVal = getLevelValue(catLevelStr);
      const athLevelVal = getLevelValue(atletaForm.nivelHabilidad);

      if (catLevelVal >= 0 && athLevelVal >= 0) {
        if (athLevelVal > catLevelVal) {
          // Cachirul bloqueado
          setModalCachirul({ catLevel: catLevelStr, athLevel: atletaForm.nivelHabilidad });
          return;
        } else if (athLevelVal < catLevelVal && !atletaForm.aceptoRiesgoNivel) {
          // Advertencia de nivel inferior
          setModalAdvertenciaNivel({ catLevel: catLevelStr, athLevel: atletaForm.nivelHabilidad });
          return;
        }
      }
    }

    // === VALIDACIÓN ESTRICTA PARA EQUIPOS ===
    if (catSeleccionada.esEquipo) {
       let rHombres = 0, rMujeres = 0, rMaster = 0, rAvanzado = 0, rIntermedio = 0, rPrincipiante = 0, rNovato = 0;
       
       if (modoInscripcion === 'crear') {
         rHombres = catSeleccionada.cupoHombres || catSeleccionada.CupoHombres || 0;
         rMujeres = catSeleccionada.cupoMujeres || catSeleccionada.CupoMujeres || 0;
         rMaster = catSeleccionada.cupoMaster || catSeleccionada.CupoMaster || 0;
         rAvanzado = catSeleccionada.cupoAvanzado || catSeleccionada.CupoAvanzado || 0;
         rIntermedio = catSeleccionada.cupoIntermedio || catSeleccionada.CupoIntermedio || 0;
         rPrincipiante = catSeleccionada.cupoPrincipiante || catSeleccionada.CupoPrincipiante || 0;
         rNovato = catSeleccionada.cupoNovato || catSeleccionada.CupoNovato || 0;
       } else if (modoInscripcion === 'unirse' && equipoUnirseInfo) {
         const c = equipoUnirseInfo.categoria || equipoUnirseInfo.Categoria;
         const a = equipoUnirseInfo.atletas || equipoUnirseInfo.Atletas || [];
         rHombres = (c.cupoHombres||c.CupoHombres||0) - a.filter(x => (x.genero||x.Genero).toLowerCase() === 'hombre' || (x.genero||x.Genero).toLowerCase() === 'masculino').length;
         rMujeres = (c.cupoMujeres||c.CupoMujeres||0) - a.filter(x => (x.genero||x.Genero).toLowerCase() === 'mujer' || (x.genero||x.Genero).toLowerCase() === 'femenino').length;
         const getLvl = (l) => {
           const lstr = l.toLowerCase();
           if (lstr==='novato') return 0;
           if (lstr==='principiante') return 1;
           if (lstr==='intermedio') return 2;
           if (lstr==='rx'||lstr==='avanzado') return 3;
           if (lstr==='master') return 4;
           return -1;
         };
         rMaster = (c.cupoMaster||c.CupoMaster||0) - a.filter(x => getLvl(x.nivelHabilidad||x.NivelHabilidad) === 4).length;
         rAvanzado = (c.cupoAvanzado||c.CupoAvanzado||0) - a.filter(x => getLvl(x.nivelHabilidad||x.NivelHabilidad) === 3).length;
         rIntermedio = (c.cupoIntermedio||c.CupoIntermedio||0) - a.filter(x => getLvl(x.nivelHabilidad||x.NivelHabilidad) === 2).length;
         rPrincipiante = (c.cupoPrincipiante||c.CupoPrincipiante||0) - a.filter(x => getLvl(x.nivelHabilidad||x.NivelHabilidad) === 1).length;
         rNovato = (c.cupoNovato||c.CupoNovato||0) - a.filter(x => getLvl(x.nivelHabilidad||x.NivelHabilidad) === 0).length;
       }

       const isHombre = (atletaForm.genero.toLowerCase() === 'hombre' || atletaForm.genero.toLowerCase() === 'masculino');
       const isMujer = (atletaForm.genero.toLowerCase() === 'mujer' || atletaForm.genero.toLowerCase() === 'femenino');

       if (isHombre && rHombres <= 0) {
          setMensaje({ tipo: 'danger', texto: 'Ya no hay cupo para Hombres en este equipo/categoría.' }); return;
       }
       if (isMujer && rMujeres <= 0) {
          setMensaje({ tipo: 'danger', texto: 'Ya no hay cupo para Mujeres en este equipo/categoría.' }); return;
       }

       const athLvl = getLevelValue(atletaForm.nivelHabilidad);
       let hasSlot = false;
       if (athLvl === 4 && rMaster > 0) hasSlot = true;
       if (athLvl === 3 && rAvanzado > 0) hasSlot = true;
       if (athLvl === 2 && rIntermedio > 0) hasSlot = true;
       if (athLvl === 1 && rPrincipiante > 0) hasSlot = true;
       if (athLvl === 0 && rNovato > 0) hasSlot = true;

       if (!hasSlot) {
         let maxSlotLvl = -1;
         let minSlotLvl = 99;
         if (rMaster > 0) { maxSlotLvl = Math.max(maxSlotLvl, 4); minSlotLvl = Math.min(minSlotLvl, 4); }
         if (rAvanzado > 0) { maxSlotLvl = Math.max(maxSlotLvl, 3); minSlotLvl = Math.min(minSlotLvl, 3); }
         if (rIntermedio > 0) { maxSlotLvl = Math.max(maxSlotLvl, 2); minSlotLvl = Math.min(minSlotLvl, 2); }
         if (rPrincipiante > 0) { maxSlotLvl = Math.max(maxSlotLvl, 1); minSlotLvl = Math.min(minSlotLvl, 1); }
         if (rNovato > 0) { maxSlotLvl = Math.max(maxSlotLvl, 0); minSlotLvl = Math.min(minSlotLvl, 0); }

         if (maxSlotLvl === -1) {
             setMensaje({ tipo: 'danger', texto: 'Ya no hay cupos de nivel disponibles.' }); return;
         }

         if (athLvl > maxSlotLvl) {
            setModalCachirul({ athLevel: atletaForm.nivelHabilidad, catLevel: 'Requisito Estricto', esEquipo: true });
            return;
         } else {
            setMensaje({ tipo: 'danger', texto: `Requisito Estricto Insatisfecho: No hay vacantes disponibles para el nivel ${atletaForm.nivelHabilidad} en este equipo.` });
            return;
         }
       }
    }

    procesarInscripcionFinal();
  };

  let inscripcionesAbiertas = true;
  let mensajeFechas = "";
  let fechaContador = null;

  if (compActiva) {
    const inicioInsStr = compActiva.fechaInicioInscripcion || compActiva.FechaInicioInscripcion;
    const finInsStr = compActiva.fechaFinInscripcion || compActiva.FechaFinInscripcion;

    if (inicioInsStr && finInsStr) {
      const hoy = new Date();
      const inicioIns = new Date(inicioInsStr); inicioIns.setHours(0, 0, 0, 0);
      const finIns = new Date(finInsStr); finIns.setHours(23, 59, 59, 999);

      if (hoy >= inicioIns && hoy <= finIns) {
        inscripcionesAbiertas = true; mensajeFechas = 'Inscripciones abiertas — cierran en'; fechaContador = finIns;
      } else if (hoy < inicioIns) {
        inscripcionesAbiertas = false; mensajeFechas = 'Las inscripciones abren en'; fechaContador = inicioIns;
      } else {
        inscripcionesAbiertas = false; mensajeFechas = `Las inscripciones cerraron el ${finIns.toLocaleDateString()}`;
      }
    }
  }

  if (loading) return (
    <div className="portal-loading">
      <AtletifyLoader />
      <p className="portal-loading-text">Cargando competencia...</p>
    </div>
  );

  return (
    <div className="portal-comp">

      {pagoCanceladoCodigo && (
        <div className="pc-notice pc-notice--warning">
          <span><i className="fas fa-triangle-exclamation me-2"></i>Tu pago no se completó. El lugar de tu equipo no está asegurado hasta que pagues.</span>
          <span className="pc-notice-actions">
            <button className="pc-btn pc-btn--success pc-btn--sm" onClick={() => iniciarPagoPorCodigo(pagoCanceladoCodigo)}><i className="fas fa-credit-card"></i>Reintentar pago</button>
            <button className="pc-btn pc-btn--ghost pc-btn--sm" onClick={() => setPagoCanceladoCodigo('')}>Cerrar</button>
          </span>
        </div>
      )}

      {/* ══════ NAV ══════ */}
      <nav className="portal-nav">
        <div className="portal-nav-inner">
          <div className="d-flex align-items-center gap-2">
            <BackButton to="/competencias" />
            <Link to="/" className="portal-nav-brand">
              <img src="/LogosDeAtletify/LogoBlanco.png" alt="Atletify System" style={{ height: '26px', width: 'auto' }} className="me-2" />
              <span className="portal-nav-title">Atletify System</span>
            </Link>
          </div>
          {compActiva && (
            <Link to={`/atleta/${compActiva.idCompetencia || compActiva.IdCompetencia}`} className="portal-nav-atleta-btn">
              <i className="fas fa-running"></i>
              <span>Soy Atleta</span>
            </Link>
          )}
        </div>
      </nav>

      {pasadas.length > 0 && (
        <section className="pc-past">
          <div className="container px-3 px-md-4" style={{ paddingTop: '16px', paddingBottom: '16px' }}>
            <h3 className="pc-past-title">
              <i className="fas fa-clock-rotate-left"></i>Resultados de ediciones pasadas
            </h3>
            <div className="pc-past-grid">
              {pasadas.map(p => (
                <Link key={p.idCompetencia} to={`/leaderboard/${p.idCompetencia}`} className="pc-past-card">
                  <span className="nm">{p.nombre}</span>
                  <span className="dt">{p.fechaFin ? new Date(p.fechaFin).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }) : ''}</span>
                  <span className="rs"><i className="fas fa-trophy"></i>Ver resultados</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {competencias.length === 0 ? (
        <div className="portal-empty portal-fade-in">
          <i className="fas fa-calendar-times"></i>
          <h2>No hay competencias activas</h2>
          <p>Mantente atento a las próximas convocatorias</p>
        </div>
      ) : (
        <>
          {/* ══════ HERO ══════ */}
          <section className="portal-hero">
            <div className="portal-hero-bg" aria-hidden="true"></div>
            <div className="container px-3 px-md-4">
              <div className="portal-hero-inner">

                {/* ── Columna izquierda ── */}
                <div className="portal-hero-left">
                  <div className="portal-hero-meta">
                    <span className="portal-status-badge">
                      <i className="fas fa-circle"></i>
                      {compActiva.estatus.toUpperCase()}
                    </span>
                    <span className="portal-hero-eyebrow">Atletify System</span>
                  </div>
                  <h1 className="portal-comp-title">{compActiva.nombre}</h1>
                  <p className="portal-comp-dates">
                    <i className="fas fa-calendar-alt"></i>
                    {new Date(compActiva.fechaInicio).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC' })}
                    <span className="portal-dates-sep">—</span>
                    {new Date(compActiva.fechaFin).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC' })}
                  </p>
                  {compActiva.categorias?.length > 0 && (
                    <div className="portal-hero-quick-stats">
                      <div className="portal-hqs-item">
                        <span className="portal-hqs-num">{compActiva.categorias.length}</span>
                        <span className="portal-hqs-label">División{compActiva.categorias.length !== 1 ? 'es' : ''}</span>
                      </div>
                      <div className="portal-hqs-sep"></div>
                      <div className="portal-hqs-item">
                        <i className="fas fa-map-marker-alt portal-hqs-icon"></i>
                        <span className="portal-hqs-label">Atletify System</span>
                      </div>
                    </div>
                  )}
                  <div className="portal-hero-actions">
                    <button onClick={() => setPestaña('inscripcion')} className="portal-btn-primary">
                      <i className="fas fa-edit"></i>Inscribirse
                    </button>
                    <Link to={`/leaderboard/${compActiva.idCompetencia || compActiva.IdCompetencia}`} className="portal-btn-secondary">
                      <i className="fas fa-trophy"></i>Leaderboard
                    </Link>
                    <Link to={`/agenda/${compActiva.idCompetencia || compActiva.IdCompetencia}`} className="portal-btn-secondary">
                      <i className="fas fa-clock"></i>Agenda
                    </Link>
                  </div>
                  {/* Acceso de juez movido a /juez/acceso (magic-link + PIN); ya no se expone aquí. */}
                </div>


              </div>
            </div>
          </section>

          {/* ══════ TABS ══════ */}
          <div className="portal-tabs-shell">
            <div className="container px-0">
              <div className="portal-tabs">
                <button className={`portal-tab ${pestaña === 'info' ? 'active' : ''}`} onClick={() => setPestaña('info')}>
                  <i className="fas fa-fire"></i><span>Convocatoria</span>
                </button>
                <button className={`portal-tab ${pestaña === 'estandares' ? 'active' : ''}`} onClick={() => setPestaña('estandares')}>
                  <i className="fas fa-dumbbell"></i><span>Estándares</span>
                </button>
                <button className={`portal-tab ${pestaña === 'horarios' ? 'active' : ''}`} onClick={() => setPestaña('horarios')}>
                  <i className="fas fa-clock"></i><span>Horarios</span>
                </button>
                <button className={`portal-tab ${pestaña === 'inscripcion' ? 'active' : ''}`} onClick={() => setPestaña('inscripcion')}>
                  <i className="fas fa-edit"></i><span>Inscripción</span>
                </button>
                <button className={`portal-tab ${pestaña === 'reglamento' ? 'active' : ''}`} onClick={() => setPestaña('reglamento')}>
                  <i className="fas fa-gavel"></i><span>Reglamento</span>
                </button>
                <button className={`portal-tab ${pestaña === 'estatus' ? 'active' : ''}`} onClick={() => setPestaña('estatus')}>
                  <i className="fas fa-search"></i><span>Estatus</span>
                </button>
              </div>
            </div>
          </div>

          {/* ══════ CONTENIDO ══════ */}
          <div className="container px-3 px-md-4 py-4 py-md-5">
            <div className="portal-content portal-fade-in" key={pestaña}>

              {/* ── CONVOCATORIA ── */}
              {pestaña === 'info' && (
                <div className="portal-info-wrap">
                  <div className="portal-info-grid">
                    <div className="portal-info-text">
                      <h4><i className="fas fa-fire me-2"></i>La Arena Espera Por Ti</h4>
                      <p>Prepárate para la competencia diseñada para poner a prueba tu fuerza y resistencia. Revisa los estándares y asegura tu lugar antes de que se agoten los cupos.</p>
                    </div>
                    <div className="portal-info-box">
                      <i className="fas fa-map-marker-alt"></i>
                      <h6>Ubicación</h6>
                      <p>Atletify System</p>
                    </div>
                  </div>
                  {(compActiva.anuncios || compActiva.Anuncios) && (
                    <div className="portal-anuncios portal-fade-in">
                      <h5><i className="fas fa-bullhorn blink_me me-2"></i>Tablón de Anuncios Oficial</h5>
                      <div className="quill-content" dangerouslySetInnerHTML={{ __html: compActiva.anuncios || compActiva.Anuncios }} />
                    </div>
                  )}
                </div>
              )}

              {/* ── ESTÁNDARES ── */}
              {pestaña === 'estandares' && (
                <div className="portal-estandares-section portal-fade-in">
                  <p className="portal-estandares-title">
                    <i className="fas fa-dumbbell me-2"></i>Requisitos Técnicos
                  </p>
                  <div className="portal-estandares-table-wrap">
                    {(() => {
                      const textoParametros = compActiva.parametrosEstandares || compActiva.ParametrosEstandares;
                      if (!textoParametros) return (
                        <p className="portal-estandares-empty">
                          <i className="fas fa-hourglass-half d-block mb-2" style={{ fontSize: '2rem', opacity: 0.3 }}></i>
                          Los estándares se publicarán pronto.
                        </p>
                      );
                      try {
                        if (textoParametros.trim().startsWith('[')) {
                          const tabla = JSON.parse(textoParametros);
                          return (
                            <div className="table-responsive">
                              <table className="portal-dark-table">
                                <thead>
                                  <tr>
                                    <th className="text-start ps-4">Skill / Movimiento</th>
                                    {['Novato', 'Principiante', 'Intermedio', 'Avanzado', 'Master'].map(nivel => (
                                      <th key={nivel} className="text-center">
                                        <div>{nivel}</div>
                                        <div className="portal-table-sub">(M / H)</div>
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {tabla.map((fila, i) => {
                                    const isStrong = i % 2 === 0;
                                    return (
                                      <tr key={i} style={{ backgroundColor: isStrong ? 'rgba(255,255,255,0.03)' : 'transparent' }}>
                                        <td className="text-start ps-4 portal-table-skill" style={{ fontWeight: isStrong ? '700' : '500' }}>{fila.movimiento}</td>
                                        {['Novato', 'Principiante', 'Intermedio', 'Avanzado', 'Master'].map(nivel => {
                                          const req = fila.requisitos?.[nivel];
                                          let displayVal = '—';
                                          if (req) {
                                            if (typeof req === 'object') {
                                              displayVal = (
                                                <div className="d-flex justify-content-center gap-2 align-items-center">
                                                  <span className="portal-std-badge portal-std-badge--h">H: {req.h || '-'}</span>
                                                  <span className="portal-std-badge portal-std-badge--m">M: {req.m || '-'}</span>
                                                </div>
                                              );
                                            } else {
                                              displayVal = req;
                                            }
                                          }
                                          return (
                                            <td key={nivel} className="text-center portal-table-val">
                                              {displayVal}
                                            </td>
                                          );
                                        })}
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          );
                        }
                      } catch (e) { }
                      return <pre className="portal-estandares-pre">{textoParametros}</pre>;
                    })()}
                  </div>
                </div>
              )}

              {/* ── REGLAMENTO ── */}
              {pestaña === 'reglamento' && (
                <div className="portal-reglamento-section portal-fade-in">
                  <p className="portal-estandares-title">
                    <i className="fas fa-gavel me-2"></i>Reglamento de la Arena
                  </p>
                  <div className="portal-reglamento-body">
                    {(compActiva.reglamento || compActiva.Reglamento) ? (
                      <div className="quill-content" dangerouslySetInnerHTML={{ __html: compActiva.reglamento || compActiva.Reglamento }} />
                    ) : (
                      <div className="portal-reglamento-empty">
                        <i className="fas fa-file-contract"></i>
                        <p>El reglamento oficial se publicará próximamente.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── HORARIOS ── */}
              {pestaña === 'horarios' && (() => {
                let datosHeats = null;
                try {
                  if (compActiva.heatsConfig || compActiva.HeatsConfig) {
                    datosHeats = JSON.parse(compActiva.heatsConfig || compActiva.HeatsConfig);
                  }
                } catch (e) { }

                if (!datosHeats || !datosHeats.publicado || datosHeats.wods.length === 0) {
                  return (
                    <div className="portal-horarios-empty portal-fade-in">
                      <i className="fas fa-calendar-times"></i>
                      <h4>Horarios no disponibles</h4>
                      <p>La mesa de control aún no ha publicado el itinerario oficial del evento.</p>
                    </div>
                  );
                }

                return (
                  <div className="portal-horarios-section portal-fade-in">
                    <div className="portal-horarios-header">
                      <p className="portal-horarios-header-title">
                        <i className="fas fa-stopwatch me-2"></i>Itinerario Oficial
                      </p>
                      <span className="portal-live-badge">
                        <i className="fas fa-satellite-dish me-1"></i>En Vivo
                      </span>
                    </div>
                    <div className="d-flex flex-column gap-4">
                      {datosHeats.wods.sort((a, b) => a.idWod - b.idWod).map(wod => (
                        <div key={wod.idWod} className="portal-wod-block">
                          <div className="portal-wod-block-header">
                            <h4 className="portal-wod-block-title">{wod.nombreWod}</h4>
                          </div>
                          <div>
                            {wod.lista.map((heat, i) => (
                              <div key={heat.idHeat} className={i !== wod.lista.length - 1 ? 'portal-heat-group' : ''}>
                                <div className="portal-heat-header">
                                  <span className="portal-heat-label">Heat {heat.numero}</span>
                                  <span className="portal-heat-hora">
                                    <i className="far fa-clock"></i>{heat.hora}
                                  </span>
                                </div>
                                <div className="table-responsive">
                                  <table className="portal-dark-table">
                                    <thead>
                                      <tr>
                                        <th className="ps-4" style={{ width: '80px' }}>Lane</th>
                                        <th>Competidor / Equipo</th>
                                        <th>Afiliado</th>
                                        <th className="pe-4 text-end">División</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {heat.participantes.map(p => (
                                        <tr key={p.idEquipo}>
                                          <td className="ps-4">
                                            <span className="portal-lane-num">{p.carril}</span>
                                          </td>
                                          <td>
                                            <div className="d-flex align-items-center gap-3 py-1">
                                              <div className="portal-atleta-avatar">
                                                <i className="fas fa-user"></i>
                                              </div>
                                              <span className="portal-atleta-nombre">{p.nombre}</span>
                                            </div>
                                          </td>
                                          <td className="portal-table-muted">{p.box || 'Independiente'}</td>
                                          <td className="pe-4 text-end">
                                            <span className="portal-division-tag">{heat.categoria}</span>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* ── INSCRIPCIÓN ── */}
              {pestaña === 'inscripcion' && (
                <div className="portal-fade-in">
                  {mensajeFechas && (
                    <div className={`portal-fechas-banner ${inscripcionesAbiertas ? 'open' : 'closed'}`}>
                      <i className={`fas ${inscripcionesAbiertas ? 'fa-calendar-check' : 'fa-lock'}`}></i>
                      <span>{mensajeFechas}{fechaContador && <CuentaRegresiva targetDate={fechaContador} />}</span>
                    </div>
                  )}

                  {!inscripcionesAbiertas ? (
                    <div className="portal-closed-state">
                      <i className="fas fa-lock"></i>
                      <h4>Portal Cerrado</h4>
                      <p>Mantente atento a las fechas oficiales.</p>
                    </div>
                  ) : (
                    <>

                      {!catSeleccionada ? (
                        <div className="portal-categorias-list">
                          <div className="portal-cats-header">
                            <h4 className="portal-cats-title">
                              <i className="fas fa-list-ul me-2"></i>Elige tu Categoría
                            </h4>
                            <p className="portal-cats-sub">Selecciona la división en la que deseas competir</p>
                          </div>
                          <AnimatedList
                            items={compActiva.categorias || []}
                            keyExtractor={(cat) => cat.idCategoriaComp}
                            staggerDelay={0.08}
                            renderItem={(cat) => (
                              <div className="portal-categoria-card">
                                <div className="portal-categoria-accent"></div>
                                <div className="portal-categoria-info">
                                  <div className="portal-categoria-nombre">{cat.nombre}</div>
                                  <div className="portal-categoria-tipo">
                                    <i className={`fas ${cat.esEquipo ? 'fa-users' : 'fa-user'} me-1`}></i>
                                    {cat.esEquipo ? `Equipo de ${cat.cantidadIntegrantes}` : 'Individual'}
                                  </div>
                                  <div className="portal-categoria-meta">
                                    <span className="portal-categoria-meta-item">
                                      <i className="fas fa-users"></i>{cat.cantidadIntegrantes} pers.
                                    </span>
                                    <span className="portal-categoria-precio">
                                      <i className="fas fa-tag"></i>${cat.costo || cat.Costo} <span>MXN</span>
                                    </span>
                                  </div>
                                </div>
                                <div className="portal-categoria-actions">
                                  <button type="button" onClick={() => { setCategoriaInfo(cat); setMostrarInfo(true); }} className="portal-cat-info-btn" aria-label="Requisitos y cupos">
                                    <i className="fas fa-info"></i>
                                  </button>
                                  <button type="button" onClick={() => intentarElegirCategoria(cat)} className="portal-categoria-btn">
                                    Elegir<i className="fas fa-arrow-right ms-2"></i>
                                  </button>
                                </div>
                              </div>
                            )}
                          />
                        </div>
                      ) : (
                        <div className="portal-form-wrap portal-fade-in" id="pc-form-top">
                          <div className="portal-inscripcion-header">
                            <button type="button" className="portal-btn-back" onClick={() => setCatSeleccionada(null)}>
                              <i className="fas fa-arrow-left"></i>
                            </button>
                            <div>
                              <h4 className="portal-inscripcion-title">
                                {catSeleccionada.nombre}
                              </h4>
                              <p className="portal-inscripcion-sub">
                                {catSeleccionada.esEquipo ? `Equipo de ${catSeleccionada.cantidadIntegrantes}` : 'Categoría Individual'}
                              </p>
                            </div>
                          </div>

                          {catSeleccionada.esEquipo && !modoInscripcion && (
                            <div className="portal-modo-grid">
                              <div className="portal-modo-card portal-modo-card--crear" onClick={handleCrearInit}>
                                <i className="fas fa-users-cog portal-modo-card-icon"></i>
                                <p className="portal-modo-card-title">Crear Nuevo Equipo</p>
                                <p className="portal-modo-card-desc">Serás el capitán, registrarás el nombre del equipo y obtendrás el código de invitación para tus compañeros.</p>
                                <span className="portal-modo-card-cta">Ser Capitán <i className="fas fa-chevron-right"></i></span>
                              </div>
                              <div className="portal-modo-card portal-modo-card--unirse" onClick={handleUnirseInit}>
                                <i className="fas fa-link portal-modo-card-icon"></i>
                                <p className="portal-modo-card-title">Unirme a un Equipo</p>
                                <p className="portal-modo-card-desc">Ya tengo un código de invitación proporcionado por mi capitán y quiero registrarme en su equipo.</p>
                                <span className="portal-modo-card-cta">Unirse <i className="fas fa-chevron-right"></i></span>
                              </div>
                            </div>
                          )}

                          {modoInscripcion === 'codigo' && (
                            <div className="pc-search portal-fade-in">
                              <i className="fas fa-magnifying-glass pc-search-icon"></i>
                              <h4 className="pc-search-title">Busca tu Equipo</h4>
                              <p className="pc-search-sub">Ingresa el código que te proporcionó tu capitán para ver los lugares disponibles.</p>
                              <input
                                type="text"
                                className="pc-code-input"
                                placeholder="ABC-123456"
                                value={codigoInvitacion}
                                onChange={e => setCodigoInvitacion(e.target.value.toUpperCase())}
                              />
                              <div className="pc-search-actions">
                                <button type="button" className="pc-btn pc-btn--ghost" onClick={() => setModoInscripcion(null)}>Regresar</button>
                                <button type="button" className="pc-btn pc-btn--primary" onClick={buscarEquipoPorCodigo} disabled={!codigoInvitacion || buscandoEquipo}>
                                  {buscandoEquipo ? <><i className="fas fa-spinner fa-spin"></i>Buscando...</> : <><i className="fas fa-magnifying-glass"></i>Buscar Equipo</>}
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Concurrencia: si otro compañero está registrándose, mostramos espera en vez del form. */}
                          {modoInscripcion === 'unirse' && plazaEsperaHasta && new Date(plazaEsperaHasta) > new Date() && (
                            <div className="pc-search pc-search--wait portal-fade-in">
                              <i className="fas fa-hourglass-half pc-search-icon"></i>
                              <h4 className="pc-search-title">Otro compañero se está registrando</h4>
                              <p className="pc-search-sub">Para no descuadrar el equipo, solo una persona puede registrarse a la vez. Espera un momento e intenta de nuevo.</p>
                              <div className="pc-search-countdown">
                                <CountdownTimer targetDate={plazaEsperaHasta} onExpire={() => setReservaTick(t => t + 1)} />
                              </div>
                              <div className="pc-search-actions">
                                <button type="button" className="pc-btn pc-btn--ghost" onClick={() => setReservaTick(t => t + 1)}><i className="fas fa-rotate-right"></i>Reintentar</button>
                              </div>
                            </div>
                          )}

                          {(!catSeleccionada.esEquipo || modoInscripcion === 'crear' || modoInscripcion === 'unirse') && !(modoInscripcion === 'unirse' && plazaEsperaHasta && new Date(plazaEsperaHasta) > new Date()) && (
                            <form onSubmit={(e) => e.preventDefault()} className="portal-form portal-fade-in">

                              {/* El código ahora se pide antes en el modo 'codigo', pero guardamos un hidden input por si acaso o simplemente mostramos el valor */}
                              {modoInscripcion === 'unirse' && equipoUnirseInfo && (
                                <div className="portal-codigo-invite-wrap" style={{ opacity: 0.8 }}>
                                  <label className="portal-codigo-invite-label">
                                    <i className="fas fa-check-circle pc-tone-success me-2"></i>Uniéndote al equipo: <strong>{equipoUnirseInfo.nombre || equipoUnirseInfo.Nombre}</strong>
                                  </label>
                                  <input type="text" className="portal-codigo-invite-input pc-tone-success" disabled value={codigoInvitacion} />
                                </div>
                              )}

                              {modoInscripcion === 'crear' && catSeleccionada.esEquipo && (
                                <div className="portal-form-section">
                                  <h6 className="portal-form-section-title">
                                    <i className="fas fa-flag me-2"></i>Datos del Equipo
                                  </h6>
                                  <div className="row g-3">
                                    <div className="col-12 col-md-6">
                                      <label className="portal-label">Nombre del Equipo *</label>
                                      <input type="text" className="portal-input" placeholder="No se puede repetir" required value={formEquipo.nombreEquipo} onChange={e => setFormEquipo({ ...formEquipo, nombreEquipo: e.target.value })} />
                                    </div>
                                    <div className="col-12 col-md-6">
                                      <label className="portal-label">Box de Procedencia (Opcional)</label>
                                      <input type="text" className="portal-input" placeholder="Ej. Atletify Box" value={formEquipo.boxOrigen} onChange={e => setFormEquipo({ ...formEquipo, boxOrigen: e.target.value })} />
                                    </div>
                                  </div>
                                </div>
                              )}

                              <div className="portal-atleta-card">
                                <div className="portal-atleta-header">
                                  <i className="fas fa-user"></i>
                                  <span>Tus Datos Personales</span>
                                  {modoInscripcion === 'crear' && catSeleccionada.esEquipo && <span className="capitan-badge">Capitán</span>}
                                </div>
                                <div className="portal-atleta-fields">
                                  <div className="col-12 col-md-6">
                                    <label className="portal-label">Nombre(s) *</label>
                                    <input type="text" className="portal-input" required value={atletaForm.nombreCompleto} onChange={e => { const v = e.target.value.replace(/[^a-zA-Z\u00e1\u00e9\u00ed\u00f3\u00fa\u00c1\u00c9\u00cd\u00d3\u00da\u00f1\u00d1\u00fc\u00dc\s]/g, ''); setAtletaForm({ ...atletaForm, nombreCompleto: v }); }} />
                                  </div>
                                  <div className="col-12 col-md-6">
                                    <label className="portal-label">Apellido(s) *</label>
                                    <input type="text" className="portal-input" required value={atletaForm.apellidos} onChange={e => { const v = e.target.value.replace(/[^a-zA-Z\u00e1\u00e9\u00ed\u00f3\u00fa\u00c1\u00c9\u00cd\u00d3\u00da\u00f1\u00d1\u00fc\u00dc\s]/g, ''); setAtletaForm({ ...atletaForm, apellidos: v }); }} />
                                  </div>
                                  <div>
                                    <label className="portal-label">WhatsApp / Celular *</label>
                                    <input type="tel" className="portal-input" required maxLength={10} value={atletaForm.telefono} onChange={e => setAtletaForm({ ...atletaForm, telefono: e.target.value.replace(/\D/g, '').slice(0, 10) })} />
                                  </div>
                                  <div>
                                    <label className="portal-label">Correo Electrónico *</label>
                                    <input type="email" className="portal-input" required value={atletaForm.correo} onChange={e => setAtletaForm({ ...atletaForm, correo: e.target.value })} />
                                  </div>
                                  <div>
                                    <label className="portal-label">Fecha de Nacimiento *</label>
                                    <button type="button" className={`portal-fecha-btn${mostrarDwp ? ' portal-fecha-btn--open' : ''}`} onClick={() => setMostrarDwp(v => !v)}>
                                      <i className="fas fa-calendar-alt"></i>
                                      {atletaForm.fechaNacimiento
                                        ? new Date(atletaForm.fechaNacimiento).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
                                        : <span className="portal-fecha-placeholder">Seleccionar fecha...</span>}
                                    </button>
                                  </div>
                                  <div>
                                    <label className="portal-label">Género *</label>
                                    <GeneroPicker valor={atletaForm.genero} onCambiar={v => setAtletaForm({ ...atletaForm, genero: v })} />
                                  </div>
                                  <div>
                                    <label className="portal-label">Tu Nivel Real (Anti-Trampas) *</label>
                                    <CategoriaBaseMasterPicker valor={atletaForm.nivelHabilidad} onCambiar={v => setAtletaForm({ ...atletaForm, nivelHabilidad: v, aceptoRiesgoNivel: false })} />
                                  </div>
                                  <div>
                                    <label className="portal-label">Tipo de Sangre *</label>
                                    <TipoSangrePicker valor={atletaForm.tipoSangre} onCambiar={v => setAtletaForm({ ...atletaForm, tipoSangre: v })} />
                                  </div>
                                  <div>
                                    <label className="portal-label">Talla de Playera *</label>
                                    <TallaPlayeraPicker valor={atletaForm.tallaPlayera} onCambiar={v => setAtletaForm({ ...atletaForm, tallaPlayera: v })} />
                                  </div>
                                </div>

                                {mostrarDwp && (
                                  <div className="dwp-overlay" onClick={(e) => { if (e.target === e.currentTarget) setMostrarDwp(false); }}>
                                    <div className="dwp-modal">
                                      <DateWheelPicker
                                        initialDate={atletaForm.fechaNacimiento ? new Date(atletaForm.fechaNacimiento) : new Date(2000, 0, 1)}
                                        onAccept={(date) => {
                                          setAtletaForm({ ...atletaForm, fechaNacimiento: date.toISOString() });
                                          setMostrarDwp(false);
                                        }}
                                        onCancel={() => setMostrarDwp(false)}
                                      />
                                    </div>
                                  </div>
                                )}

                                <div className="portal-carta-box">
                                  <input type="checkbox" required checked={atletaForm.aceptoCartaResponsiva} onChange={e => setAtletaForm({ ...atletaForm, aceptoCartaResponsiva: e.target.checked, fechaAceptacionCartaResponsiva: e.target.checked ? new Date().toISOString() : null })} />
                                  <label>Acepto la <a href="#" onClick={(e) => {
                                    e.preventDefault();
                                    const ventana = window.open('', '_blank');
                                    ventana.document.write(`
                                      <html>
                                        <head><title>Carta Responsiva - Atletify System</title><style>body{font-family:sans-serif; padding:40px; line-height:1.6;}</style></head>
                                        <body>
                                          <h2 style="color:red">CARTA RESPONSIVA Y DESLINDE DE RESPONSABILIDADES</h2>
                                          <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
                                            ${compActiva.cartaResponsiva || compActiva.CartaResponsiva}
                                          </div>
                                        </body>
                                      </html>
                                    `);
                                  }}>Carta Responsiva Oficial</a></label>
                                </div>
                              </div>

                              {modoInscripcion === 'unirse' ? (
                                <div className="portal-pago-section">
                                  <p className="portal-pago-title"><i className="fas fa-check-circle me-2 pc-tone-success"></i>Equipo ya pagado</p>
                                  <p className="portal-pago-desc">El capitán ya cubrió la inscripción de tu equipo. Solo completa tus datos de atleta y confirma — no necesitas pagar nada.</p>
                                </div>
                              ) : (
                              <div className="portal-pago-section">
                                <p className="portal-pago-title"><i className="fas fa-wallet me-2"></i>Aportación Financiera</p>
                                <p className="portal-pago-desc">{catSeleccionada.esEquipo ? 'Pagarás el total de la inscripción del equipo' : 'Pagarás el total de tu inscripción'} — el pago es por el monto completo, sin abonos parciales.</p>
                                  <div className="row g-3">
                                    <div className="col-12 col-md-6">
                                      <label className="portal-label">Método de Pago</label>
                                      <MetodoPagoPicker
                                        valor={pagoForm.metodo}
                                        onCambiar={v => {
                                          const nuevoForm = { ...pagoForm, metodo: v };
                                          if (v === 'EnLinea') {
                                            nuevoForm.monto = getCostoFinal().toString();
                                          }
                                          setPagoForm(nuevoForm);
                                        }}
                                        disabled={getCostoFinal() <= 0}
                                        opcionesPermitidas={opcionesPagoPermitidas()}
                                      />
                                    </div>
                                    <div className="col-12 col-md-6">
                                      <label className="portal-label">Total a pagar</label>
                                      <div className="portal-pago-monto pc-tone-success d-flex align-items-center justify-content-center fw-bold" style={{ fontSize: '1.4rem' }}>${getCostoFinal()} MXN</div>
                                      <small className="pc-tone-muted mt-1 d-block"><i className="fas fa-info-circle me-1"></i>{getMetodoEfectivo() === 'EnLinea' ? 'Pagas ahora con tarjeta.' : 'Se cobra el total al confirmar tu pago en recepción.'}</small>
                                    </div>
                                  </div>
                                {getMetodoEfectivo() === 'Transferencia' && (
                                  <div className="portal-comprobante-section">
                                    <label className="portal-comprobante-label">
                                      <i className="fas fa-camera me-1"></i>Subir Comprobante (Opcional)
                                    </label>
                                    <input type="file" className="portal-comprobante-input" accept="image/png, image/jpeg, image/jpg" onChange={(e) => setComprobanteFile(e.target.files[0])} />
                                  </div>
                                )}
                              </div>
                              )}

                              <BotonSeguro type="button" onClick={enviarInscripcion} disabled={enviando} className="portal-submit-btn" tiempoBloqueo={3000}>
                                <><i className="fas fa-check-circle me-2"></i>Confirmar Inscripción</>
                              </BotonSeguro>
                            </form>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* ── ESTATUS ── */}
              {pestaña === 'estatus' && (
                <div className="portal-estatus-section portal-fade-in py-4">
                  <div className="pc-search">
                    <i className="fas fa-magnifying-glass pc-search-icon"></i>
                    <h3 className="pc-search-title">Consulta el Estatus de tu Equipo</h3>
                    <p className="pc-search-sub">Ingresa el código que te proporcionó el sistema o tu capitán.</p>

                    <form onSubmit={consultarEstatus}>
                      <input
                        type="text"
                        className="pc-code-input"
                        placeholder="ABC-123456"
                        value={codigoEstatus}
                        onChange={e => setCodigoEstatus(e.target.value.toUpperCase())}
                      />
                      <div className="pc-search-actions">
                        <button type="submit" className="pc-btn pc-btn--info" disabled={!codigoEstatus || buscandoEstatus}>
                          {buscandoEstatus ? <><i className="fas fa-spinner fa-spin"></i>Buscando...</> : <><i className="fas fa-magnifying-glass"></i>Consultar Estatus</>}
                        </button>
                      </div>
                    </form>

                    {errorEstatus && (
                      <div className="pc-modal-alert pc-modal-alert--danger" style={{ maxWidth: '440px', margin: '1.25rem auto 0', textAlign: 'left' }}>
                        <i className="fas fa-exclamation-triangle"></i>{errorEstatus}
                      </div>
                    )}
                  </div>

                  {datosEstatus && (() => {
                    const c = datosEstatus.categoria || datosEstatus.Categoria;
                    const a = datosEstatus.atletas || datosEstatus.Atletas || [];
                    const p = datosEstatus.pagos || datosEstatus.Pagos || [];

                    let rHombres = 0, rMujeres = 0, rMaster = 0, rAvanzado = 0, rIntermedio = 0, rPrincipiante = 0, rNovato = 0;
                    
                    if (c.esEquipo || c.EsEquipo) {
                      rHombres = (c.cupoHombres||c.CupoHombres||0) - a.filter(x => (x.genero||x.Genero).toLowerCase() === 'hombre' || (x.genero||x.Genero).toLowerCase() === 'masculino').length;
                      rMujeres = (c.cupoMujeres||c.CupoMujeres||0) - a.filter(x => (x.genero||x.Genero).toLowerCase() === 'mujer' || (x.genero||x.Genero).toLowerCase() === 'femenino').length;
                      
                      const getLvl = (l) => {
                        const lstr = (l || '').toLowerCase();
                        if (lstr==='novato') return 0;
                        if (lstr==='principiante') return 1;
                        if (lstr==='intermedio') return 2;
                        if (lstr==='rx'||lstr==='avanzado') return 3;
                        if (lstr==='master') return 4;
                        return -1;
                      };

                      rMaster = (c.cupoMaster||c.CupoMaster||0) - a.filter(x => getLvl(x.nivelHabilidad||x.NivelHabilidad) === 4).length;
                      rAvanzado = (c.cupoAvanzado||c.CupoAvanzado||0) - a.filter(x => getLvl(x.nivelHabilidad||x.NivelHabilidad) === 3).length;
                      rIntermedio = (c.cupoIntermedio||c.CupoIntermedio||0) - a.filter(x => getLvl(x.nivelHabilidad||x.NivelHabilidad) === 2).length;
                      rPrincipiante = (c.cupoPrincipiante||c.CupoPrincipiante||0) - a.filter(x => getLvl(x.nivelHabilidad||x.NivelHabilidad) === 1).length;
                      rNovato = (c.cupoNovato||c.CupoNovato||0) - a.filter(x => getLvl(x.nivelHabilidad||x.NivelHabilidad) === 0).length;
                    }

                    const getEstatusColor = (est) => {
                      const e = est?.toLowerCase() || '';
                      if (e === 'pagado' || e === 'aprobado') return 'success';
                      if (e === 'pendiente') return 'warning';
                      if (e === 'rechazado') return 'danger';
                      return 'secondary';
                    };

                    const estatusEquipo = datosEstatus.estatusPago || datosEstatus.EstatusPago || 'Desconocido';
                    const colorEstatus = getEstatusColor(estatusEquipo);

                    return (
                      <div className="pc-est portal-fade-in">
                        <div className="pc-est-head">
                          <div>
                            <h4 className="pc-est-name">{datosEstatus.nombre || datosEstatus.Nombre}</h4>
                            <div className="pc-est-meta">
                              <span>
                                <i className="fas fa-tag"></i>{(c.nombre || c.Nombre)} ({(c.esEquipo || c.EsEquipo) ? 'Equipo' : 'Individual'})
                              </span>
                              {(datosEstatus.fechaCreacion || datosEstatus.FechaCreacion) && (
                                <span>
                                  <i className="fas fa-calendar-alt"></i>Creado: {new Date(datosEstatus.fechaCreacion || datosEstatus.FechaCreacion).toLocaleDateString('es-MX')}
                                </span>
                              )}
                              {(datosEstatus.fechaAprobacion || datosEstatus.FechaAprobacion) && estatusEquipo === 'Aprobado' && (
                                <span className="pc-tone-success">
                                  <i className="fas fa-calendar-check"></i>Aprobado: {new Date(datosEstatus.fechaAprobacion || datosEstatus.FechaAprobacion).toLocaleDateString('es-MX')}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className={`pc-status-pill pc-status-pill--${colorEstatus}`}>
                            <i className={`fas fa-${colorEstatus === 'success' ? 'check-circle' : (colorEstatus === 'warning' ? 'clock' : (colorEstatus === 'danger' ? 'times-circle' : 'circle-question'))}`}></i>
                            {estatusEquipo.toUpperCase()}
                          </div>
                        </div>

                        <div className="pc-est-grid">
                          {/* Columna de Atletas */}
                          <div>
                            <h6 className="pc-est-subtitle"><i className="fas fa-users"></i>Atletas Inscritos ({a.length})</h6>
                            <div className="pc-athlete-list">
                              {a.map((ath, i) => {
                                const esHombre = (ath.genero || ath.Genero).toLowerCase() === 'hombre' || (ath.genero || ath.Genero).toLowerCase() === 'masculino';
                                let badgeAdvertencia = null;
                                if (!(c.esEquipo || c.EsEquipo)) {
                                  const athLvlStr = ath.nivelHabilidad || ath.NivelHabilidad;
                                  const catLvlStr = getCategoryLevelString(c);
                                  if (getLevelValue(athLvlStr) < getLevelValue(catLvlStr)) {
                                    badgeAdvertencia = (
                                      <span className="pc-chip pc-chip--warning" title="El atleta compite en una categoría superior a su nivel personal.">
                                        <i className="fas fa-level-up-alt"></i>Asumió Nivel Superior
                                      </span>
                                    );
                                  }
                                }

                                return (
                                  <div key={i} className="pc-athlete-row">
                                    <div className={`pc-athlete-avatar pc-athlete-avatar--${esHombre ? 'm' : 'f'}`}>
                                      <i className={`fas fa-${esHombre ? 'mars' : 'venus'}`}></i>
                                    </div>
                                    <div className="pc-athlete-info">
                                      <strong className="pc-athlete-name">{ath.nombreCompleto || ath.NombreCompleto} {ath.apellidos || ath.Apellidos}</strong>
                                      <div className="pc-athlete-meta">
                                        <span className="m">{ath.nivelHabilidad || ath.NivelHabilidad}</span>
                                        {(ath.fechaRegistro || ath.FechaRegistro) && (
                                          <span className="m"><i className="fas fa-clock"></i>Se unió: {new Date(ath.fechaRegistro || ath.FechaRegistro).toLocaleDateString('es-MX')}</span>
                                        )}
                                        {badgeAdvertencia}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                              {a.length === 0 && (
                                <p className="pc-empty-line"><i className="fas fa-info-circle me-1"></i>Aún no hay atletas unidos.</p>
                              )}
                            </div>

                            {(c.esEquipo || c.EsEquipo) && (
                              <div className="mt-4">
                                <h6 className="pc-est-subtitle pc-est-subtitle--warn"><i className="fas fa-user-plus"></i>Perfiles Faltantes</h6>
                                <div className="pc-chips">
                                  {Math.max(0, rHombres) > 0 && <span className="pc-chip pc-chip--info">Falta(n) {rHombres} Hombre(s)</span>}
                                  {Math.max(0, rMujeres) > 0 && <span className="pc-chip pc-chip--danger">Falta(n) {rMujeres} Mujer(es)</span>}
                                  {Math.max(0, rMaster) > 0 && <span className="pc-chip pc-chip--warning">Falta(n) {rMaster} Master</span>}
                                  {Math.max(0, rAvanzado) > 0 && <span className="pc-chip pc-chip--danger">Falta(n) {rAvanzado} Avanzado/RX</span>}
                                  {Math.max(0, rIntermedio) > 0 && <span className="pc-chip pc-chip--primary">Falta(n) {rIntermedio} Intermedio</span>}
                                  {Math.max(0, rPrincipiante) > 0 && <span className="pc-chip pc-chip--info">Falta(n) {rPrincipiante} Principiante</span>}
                                  {Math.max(0, rNovato) > 0 && <span className="pc-chip pc-chip--success">Falta(n) {rNovato} Novato</span>}

                                  {Math.max(0, rHombres) === 0 && Math.max(0, rMujeres) === 0 && Math.max(0, rMaster) === 0 && Math.max(0, rAvanzado) === 0 && Math.max(0, rIntermedio) === 0 && Math.max(0, rPrincipiante) === 0 && Math.max(0, rNovato) === 0 && (
                                    <span className="pc-chip pc-chip--success">
                                      <i className="fas fa-check-circle"></i>Equipo Completo
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Columna de Finanzas */}
                          <div>
                            <h6 className="pc-est-subtitle pc-est-subtitle--money"><i className="fas fa-wallet"></i>Aportaciones Financieras</h6>
                            <div className="pc-fin-card">
                              <div className="pc-fin-row">
                                <span className="k">Costo Total:</span>
                                <span className="v">${c.costo || c.Costo} MXN</span>
                              </div>
                              <div className="pc-fin-row">
                                <span className="k">Abonado (Validado o Pendiente):</span>
                                <span className="v ok">${datosEstatus.MontoAbonadoTotal || datosEstatus.montoAbonadoTotal || 0} MXN</span>
                              </div>
                              <div className="pc-fin-row pc-fin-row--total">
                                <span className="k">Restante:</span>
                                <span className="v warn">
                                  ${Math.max(0, (c.costo || c.Costo) - (datosEstatus.MontoAbonadoTotal || datosEstatus.montoAbonadoTotal || 0))} MXN
                                </span>
                              </div>
                            </div>

                            <div className="pc-pay-list">
                              {p.map((pago, i) => {
                                const estPago = pago.estatus || pago.Estatus;
                                let color = 'secondary';
                                let icon = 'clock';
                                if (estPago === 'Aprobado') { color = 'success'; icon = 'check-circle'; }
                                else if (estPago === 'Rechazado') { color = 'danger'; icon = 'times-circle'; }
                                else if (estPago === 'PendienteVerificacion' || estPago === 'Pendiente') { color = 'warning'; icon = 'hourglass-half'; }

                                return (
                                  <div key={i} className="pc-pay-row">
                                    <div>
                                      <strong className="pc-pay-name">{pago.nombrePagador || pago.NombrePagador}</strong>
                                      <span className="pc-pay-date">
                                        Enviado: {pago.fechaPago || pago.FechaPago ? new Date(pago.fechaPago || pago.FechaPago).toLocaleDateString() : '—'}
                                      </span>
                                      {estPago === 'Aprobado' && (pago.fechaAprobacionPago || pago.FechaAprobacionPago) && (
                                        <span className="pc-pay-date pc-tone-success">
                                          <i className="fas fa-calendar-check me-1"></i>Aprobado: {new Date(pago.fechaAprobacionPago || pago.FechaAprobacionPago).toLocaleDateString('es-MX')} {new Date(pago.fechaAprobacionPago || pago.FechaAprobacionPago).toLocaleTimeString('es-MX', {hour: '2-digit', minute:'2-digit'})}
                                        </span>
                                      )}
                                    </div>
                                    <div>
                                      <strong className={`pc-pay-amount pc-tone-${color === 'secondary' ? 'info' : color}`}>${pago.montoAbonado || pago.MontoAbonado}</strong>
                                      <span className={`pc-chip pc-chip--${color === 'secondary' ? 'info' : color}`} style={{ marginTop: '0.3rem' }}>
                                        <i className={`fas fa-${icon}`}></i>{estPago}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                              {p.length === 0 && (
                                <p className="pc-empty-line">Aún no hay pagos registrados.</p>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* SECCIÓN DE PAGO (Si hay deuda restante) */}
                        {(datosEstatus.deudaRestante > 0 || datosEstatus.DeudaRestante > 0) && (
                          <div className="pc-liquidar">
                            <h5 className="pc-liquidar-title"><i className="fas fa-hand-holding-usd"></i>Liquidar Saldo Restante</h5>

                            {(datosEstatus.pagoEnProceso || datosEstatus.PagoEnProceso) ? (
                              <div className="pc-lock-banner">
                                <div>
                                  <i className="fas fa-lock me-2"></i>
                                  <strong>Pago en Proceso.</strong> Un integrante del equipo está realizando el pago en línea. Por favor espera a que termine o expire la sesión.
                                </div>
                                <div className="pc-lock-banner-timer">
                                  <span className="lbl">Tiempo Restante</span>
                                  <CountdownTimer
                                    targetDate={datosEstatus.pagoEnProcesoHasta || datosEstatus.PagoEnProcesoHasta}
                                    onExpire={() => {
                                      // Refrescar estatus automáticamente cuando acabe
                                      consultarEstatus({ preventDefault: () => {} });
                                    }}
                                  />
                                </div>
                              </div>
                            ) : (
                              <div className="portal-pago-section mt-0">
                                <p className="portal-pago-desc">Puedes abonar al saldo del equipo aquí. Adeudo actual: <strong>${(datosEstatus.deudaRestante || datosEstatus.DeudaRestante)} MXN</strong></p>
                                <div className="row g-3">
                                  <div className="col-12 col-md-6">
                                    <label className="portal-label">Método de Pago</label>
                                    <MetodoPagoPicker 
                                      valor={pagoForm.metodo} 
                                      onCambiar={v => {
                                        const nuevoForm = { ...pagoForm, metodo: v };
                                        if (v === 'EnLinea') {
                                          nuevoForm.monto = (datosEstatus.deudaRestante || datosEstatus.DeudaRestante).toString();
                                        }
                                        setPagoForm(nuevoForm);
                                      }} 
                                      opcionesPermitidas={[
                                        ((compActiva.aceptarPagosEnLinea ?? compActiva.AceptarPagosEnLinea ?? true) && (compActiva.boxStripeListo ?? compActiva.BoxStripeListo ?? false)) ? 'EnLinea' : null,
                                        (compActiva.aceptarTransferencias ?? compActiva.AceptarTransferencias ?? true) ? 'Transferencia' : null,
                                        (compActiva.aceptarEfectivo ?? compActiva.AceptarEfectivo ?? true) ? 'Efectivo' : null
                                      ].filter(Boolean)} 
                                    />
                                  </div>
                                  <div className="col-12 col-md-6">
                                    <label className="portal-label">Monto a abonar ($)</label>
                                    <input 
                                      type="number" 
                                      min={pagoForm.metodo === 'EnLinea' ? (datosEstatus.deudaRestante || datosEstatus.DeudaRestante) : (compActiva.montoMinimoAporte ?? compActiva.MontoMinimoAporte ?? 0)} 
                                      max={(datosEstatus.deudaRestante || datosEstatus.DeudaRestante)} 
                                      step="0.01" 
                                      className="portal-pago-monto" 
                                      required 
                                      disabled={pagoForm.metodo === 'EnLinea'} 
                                      value={pagoForm.monto} 
                                      onChange={e => {
                                        let val = parseFloat(e.target.value);
                                        const max = (datosEstatus.deudaRestante || datosEstatus.DeudaRestante);
                                        if (val > max) val = max;
                                        setPagoForm({ ...pagoForm, monto: val.toString() });
                                      }} 
                                    />
                                    {pagoForm.metodo === 'EnLinea' && (
                                      <small className="pc-tone-info mt-1 d-block"><i className="fas fa-info-circle me-1"></i>Stripe requiere liquidar el total.</small>
                                    )}
                                  </div>
                                </div>
                                {pagoForm.metodo === 'Transferencia' && (
                                  <div className="portal-comprobante-section mt-3">
                                    <label className="portal-comprobante-label">
                                      <i className="fas fa-camera me-1"></i>Subir Comprobante
                                    </label>
                                    <input type="file" required className="portal-comprobante-input" accept="image/png, image/jpeg, image/jpg" onChange={(e) => setComprobanteFile(e.target.files[0])} />
                                  </div>
                                )}


                                <BotonSeguro type="button" disabled={enviando} className="pc-btn pc-btn--primary pc-btn--block" style={{ marginTop: '1.25rem' }} tiempoBloqueo={3000} onClick={async () => {
                                  setEnviando(true);
                                  setMensaje({ tipo: '', texto: '', codigo: '' });

                                  let urlFinalComprobante = '';
                                  if (pagoForm.metodo === 'Transferencia' && comprobanteFile) {
                                    const formData = new FormData();
                                    formData.append('file', comprobanteFile);
                                    try {
                                      const resFoto = await fetch(`${COMPETENCIAS_ENDPOINT}/upload-comprobante`, { method: 'POST', body: formData });
                                      if (resFoto.ok) {
                                        const dataFoto = await resFoto.json();
                                        urlFinalComprobante = dataFoto.url;
                                      } else {
                                        setMensaje({ tipo: 'danger', texto: 'Error al subir comprobante.' });
                                        setEnviando(false); return;
                                      }
                                    } catch (err) {
                                      setMensaje({ tipo: 'danger', texto: 'Error al subir comprobante.' });
                                      setEnviando(false); return;
                                    }
                                  }

                                  const payload = {
                                    codigoInvitacion: codigoEstatus,
                                    atleta: { nombreCompleto: "Abono", apellidos: "Deuda" }, // Dummy ya que no es un nuevo atleta
                                    montoAbonado: parseFloat(pagoForm.monto) || 0,
                                    metodoPago: pagoForm.metodo,
                                    comprobanteUrl: urlFinalComprobante,
                                    esSoloAbono: true // Bandera para backend
                                  };

                                  try {
                                    const res = await fetch(`${COMPETENCIAS_ENDPOINT}/unirse-equipo`, {
                                      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
                                    });
                                    const data = await res.json();
                                    if (res.ok) {
                                      if (data.requiresCheckout && data.sessionUrl) {
                                         window.location.href = data.sessionUrl;
                                         return;
                                      }
                                      setMensaje({ tipo: 'success', texto: 'Abono registrado con éxito.' });
                                      setComprobanteFile(null);
                                      consultarEstatus({ preventDefault: () => {} }); // Refresh
                                    } else {
                                      if (data.mensaje && data.mensaje.includes('proceso de pago activo')) {
                                         setMensaje({ tipo: 'warning', texto: '⏳ ' + data.mensaje });
                                         consultarEstatus({ preventDefault: () => {} }); // Refresh para ver el timer
                                      } else {
                                         setMensaje({ tipo: 'danger', texto: data.mensaje || 'Error al abonar.' });
                                      }
                                    }
                                  } catch (err) { setMensaje({ tipo: 'danger', texto: 'Error de conexión.' }); }
                                  finally { setEnviando(false); }
                                }}>
                                  <i className="fas fa-paper-plane"></i>Enviar Abono
                                </BotonSeguro>
                              </div>
                            )}
                          </div>
                        )}

                      </div>
                    );
                  })()}
                </div>
              )}

            </div>
          </div>
        </>
      )}

      {/* === MODAL INFO CATEGORIA === */}
      {mostrarInfo && categoriaInfo && (() => {
        const cat = categoriaInfo;
        const esEquipo = cat.esEquipo || cat.EsEquipo;
        const max = cat.cupoMaximo || cat.CupoMaximo || 0;
        const ocupados = cat.inscritos || cat.Inscritos || 0;
        const cuposRestantes = max - ocupados;
        const full = cuposRestantes <= 0;
        const integrantes = cat.cantidadIntegrantes || cat.CantidadIntegrantes || 0;
        const pct = max > 0 ? Math.min(100, Math.max(0, Math.round((ocupados / max) * 100))) : 0;
        // Solo se listan los perfiles con cupo > 0.
        const generos = [
          { icon: 'fa-mars', label: 'Hombres', n: cat.cupoHombres || cat.CupoHombres || 0, tone: 'info' },
          { icon: 'fa-venus', label: 'Mujeres', n: cat.cupoMujeres || cat.CupoMujeres || 0, tone: 'danger' },
        ].filter(x => x.n > 0);
        const niveles = [
          { icon: 'fa-crown', label: 'Master', n: cat.cupoMaster || cat.CupoMaster || 0, tone: 'warning' },
          { icon: 'fa-bolt', label: 'Avanzado / RX', n: cat.cupoAvanzado || cat.CupoAvanzado || 0, tone: 'danger' },
          { icon: 'fa-layer-group', label: 'Intermedio', n: cat.cupoIntermedio || cat.CupoIntermedio || 0, tone: 'primary' },
          { icon: 'fa-seedling', label: 'Principiante', n: cat.cupoPrincipiante || cat.CupoPrincipiante || 0, tone: 'info' },
          { icon: 'fa-child', label: 'Novato', n: cat.cupoNovato || cat.CupoNovato || 0, tone: 'success' },
        ].filter(x => x.n > 0);

        return (
          <div className="pc-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setMostrarInfo(false); }}>
            <div className="pc-modal">
              <div className="pc-modal-header">
                <h5 className="pc-modal-title pc-tone-info">
                  <i className="fas fa-info-circle"></i>Información de Inscripción
                </h5>
                <button type="button" className="pc-modal-close" onClick={() => setMostrarInfo(false)} aria-label="Cerrar"><i className="fas fa-times"></i></button>
              </div>
              <div className="pc-modal-body">
                <div className="pc-modal-center" style={{ marginBottom: '1.25rem' }}>
                  <h4 className="pc-modal-sub">{cat.nombre || cat.Nombre}</h4>
                  <span className="pc-modalidad">
                    {esEquipo ? `Equipo de ${integrantes}` : 'Modalidad Individual'}
                  </span>
                </div>

                <div className={`pc-cupo ${full ? 'pc-cupo--full' : 'pc-cupo--ok'}`}>
                  <div className="pc-cupo-top">
                    <div>
                      <span className="pc-cupo-label">Lugares disponibles</span>
                      <div className="pc-cupo-num"><strong>{full ? 0 : cuposRestantes}</strong> <span>/ {max}</span></div>
                    </div>
                    <span className="pc-cupo-badge">
                      <i className={`fas ${full ? 'fa-lock' : 'fa-door-open'}`}></i>{full ? 'Lleno' : 'Abierto'}
                    </span>
                  </div>
                  <div className="pc-cupo-bar"><div className="pc-cupo-fill" style={{ width: `${pct}%` }}></div></div>
                  <div className="pc-cupo-meta">
                    <span><i className="fas fa-users"></i>{esEquipo ? `Equipo de ${integrantes}` : 'Individual'}</span>
                    <span><i className="fas fa-ticket-alt"></i>{ocupados} de {max} inscritos</span>
                  </div>
                </div>

                {(generos.length > 0 || niveles.length > 0) && (
                  <p className="pc-req-heading">Perfiles que componen la categoría</p>
                )}

                {generos.length > 0 && (
                  <div className="pc-req-group">
                    <p className="pc-req-group-label"><i className="fas fa-venus-mars"></i>Por género</p>
                    <div className="pc-req-rows">
                      {generos.map(g => (
                        <div key={g.label} className={`pc-req-row pc-req-row--${g.tone}`}>
                          <span className="pc-req-row-icon"><i className={`fas ${g.icon}`}></i></span>
                          <span className="pc-req-row-label">{g.label}</span>
                          <span className="pc-req-row-count">{g.n}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {niveles.length > 0 && (
                  <div className="pc-req-group">
                    <p className="pc-req-group-label"><i className="fas fa-layer-group"></i>Por nivel</p>
                    <div className="pc-req-rows">
                      {niveles.map(l => (
                        <div key={l.label} className={`pc-req-row pc-req-row--${l.tone}`}>
                          <span className="pc-req-row-icon"><i className={`fas ${l.icon}`}></i></span>
                          <span className="pc-req-row-label">{l.label}</span>
                          <span className="pc-req-row-count">{l.n}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {full && (
                  <div className="pc-modal-alert pc-modal-alert--danger" style={{ marginTop: '1.1rem' }}>
                    <i className="fas fa-exclamation-triangle"></i>Esta categoría está llena.
                  </div>
                )}
              </div>
              <div className="pc-modal-footer">
                <button type="button" className="pc-btn pc-btn--ghost pc-btn--block" onClick={() => setMostrarInfo(false)}>Cerrar</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* === MODAL REQUISITO CATEGORIA INDIVIDUAL === */}
      {modalRequisitoNivel && (
        <div className="pc-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setModalRequisitoNivel(null); }}>
          <div className="pc-modal">
            <div className="pc-modal-header">
              <h5 className="pc-modal-title pc-tone-primary">
                <i className="fas fa-dumbbell"></i>Requisito de Nivel
              </h5>
              <button type="button" className="pc-modal-close" onClick={() => setModalRequisitoNivel(null)} aria-label="Cerrar"><i className="fas fa-times"></i></button>
            </div>
            <div className="pc-modal-body pc-modal-center">
              <i className="fas fa-fire pc-modal-icon pc-tone-primary"></i>
              <p className="pc-modal-lead">Esta categoría requiere de un atleta:</p>
              <div className="pc-req-visual">
                <div className="pc-req-visual-item">
                  <i className={`fas fa-${(modalRequisitoNivel.cupoHombres > 0 || modalRequisitoNivel.CupoHombres > 0) ? 'mars' : 'venus'}`} style={{ color: (modalRequisitoNivel.cupoMujeres > 0 || modalRequisitoNivel.CupoMujeres > 0) ? '#ff8da1' : 'var(--accent-cool)' }}></i>
                  <span className="cap">{(modalRequisitoNivel.cupoHombres > 0 || modalRequisitoNivel.CupoHombres > 0) ? 'Hombre' : 'Mujer'}</span>
                </div>
                <i className="fas fa-plus pc-req-visual-plus"></i>
                <div className="pc-req-visual-item">
                  <span className="pc-req-visual-level">{getCategoryLevelString(modalRequisitoNivel)}</span>
                </div>
              </div>
              <p className="pc-modal-note">Si tu nivel personal es superior al requerido, no podrás inscribirte para mantener la competencia justa (Anti-Cachirul).</p>
            </div>
            <div className="pc-modal-footer pc-modal-footer--split">
              <button type="button" className="pc-btn pc-btn--ghost" onClick={() => setModalRequisitoNivel(null)}>Cancelar</button>
              <button type="button" className="pc-btn pc-btn--primary" onClick={() => seleccionarCategoria(modalRequisitoNivel)}>Siguiente <i className="fas fa-arrow-right"></i></button>
            </div>
          </div>
        </div>
      )}

      {/* === MODAL ADVERTENCIA DE NIVEL INFERIOR === */}
      {modalAdvertenciaNivel && (
        <div className="pc-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setModalAdvertenciaNivel(null); }}>
          <div className="pc-modal">
            <div className="pc-modal-header">
              <h5 className="pc-modal-title pc-tone-warning">
                <i className="fas fa-exclamation-triangle"></i>Advertencia de Nivel
              </h5>
              <button type="button" className="pc-modal-close" onClick={() => setModalAdvertenciaNivel(null)} aria-label="Cerrar"><i className="fas fa-times"></i></button>
            </div>
            <div className="pc-modal-body pc-modal-center">
              <p className="pc-modal-lead">¿Estás seguro de escalar niveles?</p>
              <div className="pc-level-flow">
                <div className="pc-level-flow-box">
                  <span className="lbl">Tu Nivel</span>
                  <span className="val">{modalAdvertenciaNivel.athLevel}</span>
                </div>
                <i className="fas fa-arrow-right pc-level-flow-arrow"></i>
                <div className="pc-level-flow-box">
                  <span className="lbl">Categoría</span>
                  <span className="val pc-tone-warning">{modalAdvertenciaNivel.catLevel}</span>
                </div>
              </div>
              <p className="pc-modal-note">Los niveles avanzados requieren más experiencia.</p>
            </div>
            <div className="pc-modal-footer pc-modal-footer--split">
              <button type="button" className="pc-btn pc-btn--ghost" onClick={() => setModalAdvertenciaNivel(null)}>Cambiar Nivel</button>
              <button type="button" className="pc-btn pc-btn--warning" onClick={() => {
                setAtletaForm(prev => ({ ...prev, aceptoRiesgoNivel: true }));
                setModalAdvertenciaNivel(null);
                procesarInscripcionFinal();
              }}>Asumir el Riesgo <i className="fas fa-check-circle"></i></button>
            </div>
          </div>
        </div>
      )}

      {/* === MODAL CACHIRUL BLOQUEADO === */}
      {modalCachirul && (
        <div className="pc-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setModalCachirul(null); }}>
          <div className="pc-modal">
            <div className="pc-modal-header">
              <h5 className="pc-modal-title pc-tone-danger">
                <i className="fas fa-ban"></i>¡Cachirul Detectado!
              </h5>
              <button type="button" className="pc-modal-close" onClick={() => setModalCachirul(null)} aria-label="Cerrar"><i className="fas fa-times"></i></button>
            </div>
            <div className="pc-modal-body pc-modal-center">
              <i className="fas fa-user-slash pc-modal-icon pc-tone-danger"></i>
              <p className="pc-modal-lead">No puedes inscribirte a una categoría inferior a tu nivel actual.</p>

              <div className="pc-callout pc-callout--danger">
                <p>Tu Nivel Real: <strong>{modalCachirul.athLevel}</strong></p>
                <p>Requisito: <strong>{modalCachirul.catLevel}</strong></p>
              </div>
            </div>
            <div className="pc-modal-footer">
              <button type="button" className="pc-btn pc-btn--primary pc-btn--block" onClick={() => setModalCachirul(null)}>Aceptar y Regresar</button>
            </div>
          </div>
        </div>
      )}

      {/* === MODAL CÓDIGO DE INVITACIÓN === */}
      {mensaje.codigo && (
        <div className="pc-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setMensaje({ ...mensaje, codigo: '' }); }}>
          <div className="pc-modal">
            <div className="pc-modal-header">
              <h5 className="pc-modal-title pc-tone-success">
                <i className="fas fa-check-circle"></i>Inscripción Exitosa
              </h5>
              <button type="button" className="pc-modal-close" onClick={() => setMensaje({ ...mensaje, codigo: '' })} aria-label="Cerrar"><i className="fas fa-times"></i></button>
            </div>
            <div className="pc-modal-body pc-modal-center">
              <i className="fas fa-ticket-alt pc-modal-icon pc-tone-success"></i>
              <p className="pc-modal-lead">¡Tu equipo ha sido creado!</p>
              <p className="pc-modal-note">Comparte este código con tus compañeros para que puedan unirse a tu equipo.</p>

              <div className="pc-codigo-box" onClick={() => {
                  navigator.clipboard.writeText(mensaje.codigo);
                  setCopiadoCodigo(true);
                  setTimeout(() => setCopiadoCodigo(false), 2000);
                }}>
                <p className="lbl">Código de Equipo</p>
                <p className="code">{mensaje.codigo}</p>
              </div>

              <button
                type="button"
                className={`pc-btn pc-btn--block ${copiadoCodigo ? 'pc-btn--success' : 'pc-btn--ghost'}`}
                onClick={() => {
                  navigator.clipboard.writeText(mensaje.codigo);
                  setCopiadoCodigo(true);
                  setTimeout(() => setCopiadoCodigo(false), 2000);
                }}
              >
                <i className={`fas ${copiadoCodigo ? 'fa-check' : 'fa-copy'}`}></i>
                {copiadoCodigo ? '¡Código Copiado!' : 'Copiar Código al Portapapeles'}
              </button>
            </div>
            <div className="pc-modal-footer">
              <button type="button" className="pc-btn pc-btn--ghost pc-btn--block" onClick={() => setMensaje({ ...mensaje, codigo: '' })}>Entendido, Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* === MODAL REQUISITO EQUIPO (CREAR / UNIRSE) === */}
      {modalRequisitoEquipo && (() => {
        const r = modalRequisitoEquipo.restantes;
        const esCrear = modalRequisitoEquipo.tipo === 'crear';
        // Solo se muestran los perfiles con cupo > 0 (los de 0 no interesan).
        const generos = [
          { icon: 'fa-mars', label: 'Hombres', n: Math.max(0, r.mHombres), tone: 'info' },
          { icon: 'fa-venus', label: 'Mujeres', n: Math.max(0, r.mMujeres), tone: 'danger' },
        ].filter(x => x.n > 0);
        const niveles = [
          { icon: 'fa-crown', label: 'Master', n: Math.max(0, r.mMaster), tone: 'warning' },
          { icon: 'fa-bolt', label: 'Avanzado / RX', n: Math.max(0, r.mAvanzado), tone: 'danger' },
          { icon: 'fa-layer-group', label: 'Intermedio', n: Math.max(0, r.mIntermedio), tone: 'primary' },
          { icon: 'fa-seedling', label: 'Principiante', n: Math.max(0, r.mPrincipiante), tone: 'info' },
          { icon: 'fa-child', label: 'Novato', n: Math.max(0, r.mNovato), tone: 'success' },
        ].filter(x => x.n > 0);
        const totalGen = generos.reduce((s, x) => s + x.n, 0);
        const totalLvl = niveles.reduce((s, x) => s + x.n, 0);
        const total = Math.max(totalGen, totalLvl);
        const sinVacantes = generos.length === 0 && niveles.length === 0;

        const avanzar = () => {
          const tipo = modalRequisitoEquipo.tipo;
          setModalRequisitoEquipo(null);
          setModoInscripcion(tipo);
          // El formulario reemplaza en el sitio la selección de modo; lo traemos a la vista
          // para que el avance sea evidente (evita la sensación de "no pasó nada").
          setTimeout(() => {
            const el = document.getElementById('pc-form-top');
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            else window.scrollTo({ top: 0, behavior: 'smooth' });
          }, 70);
        };

        return (
          <div className="pc-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setModalRequisitoEquipo(null); }}>
            <div className="pc-modal">
              <div className="pc-modal-header">
                <h5 className="pc-modal-title pc-tone-primary">
                  <i className="fas fa-users-cog"></i>
                  {esCrear ? 'Requisitos del Equipo' : 'Lugares Disponibles'}
                </h5>
                <button type="button" className="pc-modal-close" onClick={() => setModalRequisitoEquipo(null)} aria-label="Cerrar"><i className="fas fa-times"></i></button>
              </div>
              <div className="pc-modal-body">
                <div className="pc-modal-center" style={{ marginBottom: '1.1rem' }}>
                  {esCrear ? (
                    <>
                      <h5 className="pc-modal-sub">Receta Completa del Equipo</h5>
                      <p className="pc-modal-note">Para formar este equipo necesitarás reunir exactamente estos perfiles.</p>
                    </>
                  ) : (
                    <>
                      <h5 className="pc-modal-sub">Unirse a: <span className="pc-tone-success">{modalRequisitoEquipo.nombreEquipo}</span></h5>
                      <p className="pc-modal-note">Estos son los perfiles que aún le faltan al equipo.</p>
                    </>
                  )}
                </div>

                {sinVacantes ? (
                  <div className="pc-callout pc-callout--warning">
                    <i className="fas fa-circle-info pc-tone-warning" style={{ fontSize: '1.4rem', display: 'block', marginBottom: '0.4rem' }}></i>
                    <p className="pc-tone-warning" style={{ fontSize: '0.85rem' }}>Este equipo ya no tiene lugares disponibles.</p>
                  </div>
                ) : (
                  <>
                    {total > 0 && (
                      <div className="pc-req-total">
                        <span className="k">{esCrear ? 'Integrantes por reunir' : 'Lugares disponibles'}</span>
                        <span className="v">{total}</span>
                      </div>
                    )}

                    {generos.length > 0 && (
                      <div className="pc-req-group">
                        <p className="pc-req-group-label"><i className="fas fa-venus-mars"></i>Por género</p>
                        <div className="pc-req-rows">
                          {generos.map(g => (
                            <div key={g.label} className={`pc-req-row pc-req-row--${g.tone}`}>
                              <span className="pc-req-row-icon"><i className={`fas ${g.icon}`}></i></span>
                              <span className="pc-req-row-label">{g.label}</span>
                              <span className="pc-req-row-count">{g.n}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {niveles.length > 0 && (
                      <div className="pc-req-group">
                        <p className="pc-req-group-label"><i className="fas fa-layer-group"></i>Por nivel</p>
                        <div className="pc-req-rows">
                          {niveles.map(l => (
                            <div key={l.label} className={`pc-req-row pc-req-row--${l.tone}`}>
                              <span className="pc-req-row-icon"><i className={`fas ${l.icon}`}></i></span>
                              <span className="pc-req-row-label">{l.label}</span>
                              <span className="pc-req-row-count">{l.n}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="pc-modal-alert pc-modal-alert--warning" style={{ marginTop: '1.1rem' }}>
                      <i className="fas fa-exclamation-triangle"></i>
                      <span><strong>Validación estricta:</strong> no se permite escalar posiciones (si pide un novato, debe ser un novato). Si tu perfil no encaja en las vacantes, no podrás inscribirte.</span>
                    </div>
                  </>
                )}
              </div>
              <div className="pc-modal-footer pc-modal-footer--split">
                <button type="button" className="pc-btn pc-btn--ghost" onClick={() => setModalRequisitoEquipo(null)}>Cancelar</button>
                <button type="button" className="pc-btn pc-btn--primary" onClick={avanzar}>
                  Entendido, Siguiente <i className="fas fa-arrow-right"></i>
                </button>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
}
