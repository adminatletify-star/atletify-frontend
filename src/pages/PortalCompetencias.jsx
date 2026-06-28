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

export default function PortalCompetencias() {
  const { id } = useParams();
  const [competencias, setCompetencias] = useState([]);
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

  // Retorno desde Stripe Checkout de inscripción: el SuccessUrl trae ?comp_success=1&codigo=...
  // (o ?comp_cancel=1). El pago real lo acredita el webhook; aquí solo damos feedback y limpiamos la URL.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('comp_success') === '1') {
      setMensaje({ tipo: 'success', texto: '¡Pago recibido! Tu inscripción quedó confirmada. Guarda tu código de equipo para consultar el estatus.', codigo: params.get('codigo') || '' });
      window.history.replaceState({}, '', window.location.pathname);
      window.scrollTo(0, 0);
    } else if (params.get('comp_cancel') === '1') {
      setMensaje({ tipo: 'warning', texto: 'El pago se canceló. Tu equipo quedó registrado pero sin pagar; puedes intentar el pago de nuevo más tarde.', codigo: '' });
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Pago en línea desde el correo: el botón "Pagar en línea ahora" trae ?codigo=XXX&pagar=1.
  // Resolvemos el equipo por su código, generamos la sesión de Stripe y redirigimos al checkout.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const codigo = params.get('codigo');
    if (params.get('pagar') !== '1' || !codigo) return;
    window.history.replaceState({}, '', window.location.pathname);
    (async () => {
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
    })();
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
        montoAbonado: parseFloat(pagoForm.monto) || 0,
        metodoPago: pagoForm.metodo === 'EnLinea' ? 'Tarjeta' : pagoForm.metodo,
        comprobanteUrl: urlFinalComprobante
      };
    } else {
      urlEndpoint = `${COMPETENCIAS_ENDPOINT}/unirse-equipo`;
      payload = {
        codigoInvitacion: codigoInvitacion,
        atleta: atletaForm,
        montoAbonado: parseFloat(pagoForm.monto) || 0,
        metodoPago: pagoForm.metodo === 'EnLinea' ? 'Tarjeta' : pagoForm.metodo,
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

  const enviarInscripcion = async (e) => {
    if (e) e.preventDefault();

    if (!atletaForm.aceptoCartaResponsiva) {
      setMensaje({ tipo: 'danger', texto: 'Debes aceptar la carta responsiva para competir.' });
      return;
    }

    const edadAtleta = calcularEdad(atletaForm.fechaNacimiento);
    if (edadAtleta < 18) {
      setMensaje({ tipo: 'danger', texto: 'Debes ser mayor de 18 años para registrarte en línea. Si eres menor, acude a recepción para que la Coach autorice tu inscripción como caso especial.' });
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

  if (compActiva) {
    const inicioInsStr = compActiva.fechaInicioInscripcion || compActiva.FechaInicioInscripcion;
    const finInsStr = compActiva.fechaFinInscripcion || compActiva.FechaFinInscripcion;

    if (inicioInsStr && finInsStr) {
      const hoy = new Date();
      const inicioIns = new Date(inicioInsStr); inicioIns.setHours(0, 0, 0, 0);
      const finIns = new Date(finInsStr); finIns.setHours(23, 59, 59, 999);

      if (hoy >= inicioIns && hoy <= finIns) {
        inscripcionesAbiertas = true; mensajeFechas = `Inscripciones Abiertas hasta el ${finIns.toLocaleDateString()}`;
      } else if (hoy < inicioIns) {
        inscripcionesAbiertas = false; mensajeFechas = `Las inscripciones abren el ${inicioIns.toLocaleDateString()}`;
      } else {
        inscripcionesAbiertas = false; mensajeFechas = `Las inscripciones cerraron el ${finIns.toLocaleDateString()}`;
      }
    }
  }

  if (loading) return (
    <div className="portal-loading">
      <div className="portal-spinner"></div>
      <p className="portal-loading-text">Cargando arena...</p>
    </div>
  );

  return (
    <div className="portal-comp">

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
          <Link to={`/atleta/${compActiva.idCompetencia || compActiva.IdCompetencia}`} className="portal-nav-atleta-btn">
            <i className="fas fa-running"></i>
            <span>Soy Atleta</span>
          </Link>
        </div>
      </nav>

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
                    {new Date(compActiva.fechaInicio).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })}
                    <span className="portal-dates-sep">—</span>
                    {new Date(compActiva.fechaFin).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })}
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
                  </div>
                  <div className="portal-hero-staff-row">
                    <Link to={`/juez/${compActiva.idCompetencia || compActiva.IdCompetencia}`} className="portal-juez-link">
                      <i className="fas fa-stopwatch"></i>Staff / Jueces
                    </Link>
                  </div>
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
                                    // Azul fuerte y bajo
                                    const bgH = isStrong ? '#0056b3' : '#4dabf7'; 
                                    const colorH = isStrong ? '#ffffff' : '#000000';
                                    
                                    // Rosa fuerte y bajo
                                    const bgM = isStrong ? '#c2185b' : '#ff8da1';
                                    const colorM = isStrong ? '#ffffff' : '#000000';

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
                                                  <span className="badge shadow-sm" style={{ backgroundColor: bgH, color: colorH, padding: '0.45rem 0.6rem', letterSpacing: '0.5px' }}>H: {req.h || '-'}</span>
                                                  <span className="badge shadow-sm" style={{ backgroundColor: bgM, color: colorM, padding: '0.45rem 0.6rem', letterSpacing: '0.5px' }}>M: {req.m || '-'}</span>
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
                      <span>{mensajeFechas}</span>
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
                      {mensaje.texto && (
                        <div className={`portal-alert portal-alert-${mensaje.tipo}`}>
                          <i className={`fas ${mensaje.tipo === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'} portal-alert-icon`}></i>
                          <div className="portal-alert-body">
                            <p className="portal-alert-text">{mensaje.texto}</p>
                          </div>
                        </div>
                      )}

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
                                <div className="d-flex align-items-center gap-2">
                                  <button onClick={() => { setCategoriaInfo(cat); setMostrarInfo(true); }} className="btn btn-dark border border-secondary text-info rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px' }} title="Requisitos y Cupos">
                                    <i className="fas fa-info"></i>
                                  </button>
                                  <button onClick={() => intentarElegirCategoria(cat)} className="portal-categoria-btn">
                                    Elegir<i className="fas fa-arrow-right ms-2"></i>
                                  </button>
                                </div>
                              </div>
                            )}
                          />
                        </div>
                      ) : (
                        <div className="portal-form-wrap portal-fade-in">
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
                            <div className="portal-form portal-fade-in text-center py-5">
                              <i className="fas fa-search mb-3 text-primary" style={{fontSize: '3.5rem'}}></i>
                              <h4 className="text-white mb-2">Busca tu Equipo</h4>
                              <p className="text-secondary mb-4">Ingresa el código que te proporcionó tu capitán para ver los lugares disponibles.</p>
                              <div className="d-flex justify-content-center flex-column align-items-center mb-4">
                                <label className="portal-label text-start w-75 mb-2">Código de Invitación</label>
                                <input type="text" className="portal-input w-75 text-center" style={{fontSize: '1.2rem', letterSpacing: '2px'}} placeholder="WOLF-XXXXXX" value={codigoInvitacion} onChange={e => setCodigoInvitacion(e.target.value.toUpperCase())} />
                              </div>
                              <div className="mt-2 d-flex justify-content-center gap-3">
                                <button className="btn btn-outline-secondary px-4 py-2" onClick={() => setModoInscripcion(null)}>Regresar</button>
                                <button className="btn btn-primary px-4 py-2 fw-bold" onClick={buscarEquipoPorCodigo} disabled={!codigoInvitacion || buscandoEquipo}>
                                  {buscandoEquipo ? <><i className="fas fa-spinner fa-spin me-2"></i>Buscando...</> : <><i className="fas fa-search me-2"></i>Buscar Equipo</>}
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Concurrencia: si otro compañero está registrándose, mostramos espera en vez del form. */}
                          {modoInscripcion === 'unirse' && plazaEsperaHasta && new Date(plazaEsperaHasta) > new Date() && (
                            <div className="portal-form portal-fade-in text-center py-5">
                              <i className="fas fa-hourglass-half mb-3" style={{ fontSize: '3rem', color: '#d97706' }}></i>
                              <h4 className="text-white mb-2">Otro compañero se está registrando</h4>
                              <p className="text-secondary mb-3">Para no descuadrar el equipo, solo una persona puede registrarse a la vez. Espera un momento e intenta de nuevo.</p>
                              <CountdownTimer targetDate={plazaEsperaHasta} onExpire={() => setReservaTick(t => t + 1)} />
                              <div className="mt-4">
                                <button className="btn btn-outline-secondary px-4 py-2" onClick={() => setReservaTick(t => t + 1)}><i className="fas fa-rotate-right me-2"></i>Reintentar</button>
                              </div>
                            </div>
                          )}

                          {(!catSeleccionada.esEquipo || modoInscripcion === 'crear' || modoInscripcion === 'unirse') && !(modoInscripcion === 'unirse' && plazaEsperaHasta && new Date(plazaEsperaHasta) > new Date()) && (
                            <form onSubmit={enviarInscripcion} className="portal-form portal-fade-in">

                              {/* El código ahora se pide antes en el modo 'codigo', pero guardamos un hidden input por si acaso o simplemente mostramos el valor */}
                              {modoInscripcion === 'unirse' && equipoUnirseInfo && (
                                <div className="portal-codigo-invite-wrap" style={{ opacity: 0.8 }}>
                                  <label className="portal-codigo-invite-label">
                                    <i className="fas fa-check-circle text-success me-2"></i>Uniéndote al equipo: <strong className="text-white">{equipoUnirseInfo.nombre || equipoUnirseInfo.Nombre}</strong>
                                  </label>
                                  <input type="text" className="portal-codigo-invite-input text-success" disabled value={codigoInvitacion} />
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
                                  <p className="portal-pago-title"><i className="fas fa-check-circle me-2" style={{ color: '#10b981' }}></i>Equipo ya pagado</p>
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
                                        opcionesPermitidas={[
                                          ((compActiva.aceptarPagosEnLinea ?? compActiva.AceptarPagosEnLinea ?? true) && (compActiva.boxStripeListo ?? compActiva.BoxStripeListo ?? false)) ? 'EnLinea' : null,
                                          (compActiva.aceptarTransferencias ?? compActiva.AceptarTransferencias ?? true) ? 'Transferencia' : null,
                                          (compActiva.aceptarEfectivo ?? compActiva.AceptarEfectivo ?? true) ? 'Efectivo' : null
                                        ].filter(Boolean)} 
                                      />
                                    </div>
                                    <div className="col-12 col-md-6">
                                      <label className="portal-label">Total a pagar</label>
                                      <div className="portal-pago-monto d-flex align-items-center justify-content-center fw-bold" style={{ fontSize: '1.4rem', color: '#10b981' }}>${getCostoFinal()} MXN</div>
                                      <small className="text-secondary mt-1 d-block"><i className="fas fa-info-circle me-1"></i>{pagoForm.metodo === 'EnLinea' ? 'Pagas ahora con tarjeta.' : 'Se cobra el total al confirmar tu pago en recepción.'}</small>
                                    </div>
                                  </div>
                                {pagoForm.metodo === 'Transferencia' && (
                                  <div className="portal-comprobante-section">
                                    <label className="portal-comprobante-label">
                                      <i className="fas fa-camera me-1"></i>Subir Comprobante (Opcional)
                                    </label>
                                    <input type="file" className="portal-comprobante-input" accept="image/png, image/jpeg, image/jpg" onChange={(e) => setComprobanteFile(e.target.files[0])} />
                                  </div>
                                )}
                              </div>
                              )}

                              <BotonSeguro type="submit" disabled={enviando} className="portal-submit-btn" tiempoBloqueo={3000}>
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
                  <div className="text-center mb-5">
                    <i className="fas fa-search text-info mb-3" style={{ fontSize: '3.5rem' }}></i>
                    <h3 className="text-white mb-2" style={{ fontFamily: 'var(--font-heading)' }}>Consulta el Estatus de tu Equipo</h3>
                    <p className="text-secondary">Ingresa el código que te proporcionó el sistema o tu capitán.</p>
                    
                    <form onSubmit={consultarEstatus} className="d-flex justify-content-center align-items-center flex-column mt-4">
                      <input 
                        type="text" 
                        className="portal-input w-100 mb-3 text-center" 
                        style={{ maxWidth: '400px', fontSize: '1.2rem', letterSpacing: '2px' }} 
                        placeholder="WOLF-XXXXXX" 
                        value={codigoEstatus} 
                        onChange={e => setCodigoEstatus(e.target.value.toUpperCase())} 
                      />
                      <button type="submit" className="btn btn-info px-4 py-2 fw-bold" disabled={!codigoEstatus || buscandoEstatus}>
                        {buscandoEstatus ? <><i className="fas fa-spinner fa-spin me-2"></i>Buscando...</> : <><i className="fas fa-search me-2"></i>Consultar Estatus</>}
                      </button>
                    </form>
                    
                    {errorEstatus && (
                      <div className="alert alert-danger mt-4 d-inline-block text-start">
                        <i className="fas fa-exclamation-triangle me-2"></i>{errorEstatus}
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
                      <div className="portal-estatus-dashboard p-4 rounded bg-dark border border-secondary border-opacity-25 mt-4 portal-fade-in">
                        <div className="d-flex justify-content-between align-items-center mb-4 pb-3 border-bottom border-secondary border-opacity-25 flex-wrap gap-3">
                          <div>
                            <h4 className="text-white mb-1" style={{ fontFamily: 'var(--font-heading)' }}>{datosEstatus.nombre || datosEstatus.Nombre}</h4>
                            <div className="d-flex flex-wrap gap-3 mt-1">
                              <span className="text-secondary small">
                                <i className="fas fa-tag me-1"></i>{(c.nombre || c.Nombre)} ({(c.esEquipo || c.EsEquipo) ? 'Equipo' : 'Individual'})
                              </span>
                              {(datosEstatus.fechaCreacion || datosEstatus.FechaCreacion) && (
                                <span className="text-secondary small">
                                  <i className="fas fa-calendar-alt me-1"></i>Creado: {new Date(datosEstatus.fechaCreacion || datosEstatus.FechaCreacion).toLocaleDateString('es-MX')}
                                </span>
                              )}
                              {(datosEstatus.fechaAprobacion || datosEstatus.FechaAprobacion) && estatusEquipo === 'Aprobado' && (
                                <span className="text-success small">
                                  <i className="fas fa-calendar-check me-1"></i>Aprobado: {new Date(datosEstatus.fechaAprobacion || datosEstatus.FechaAprobacion).toLocaleDateString('es-MX')}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className={`badge bg-${colorEstatus} bg-opacity-25 text-${colorEstatus} border border-${colorEstatus} px-3 py-2 fs-6`}>
                            <i className={`fas fa-${colorEstatus === 'success' ? 'check-circle' : (colorEstatus === 'warning' ? 'clock' : 'times-circle')} me-2`}></i>
                            {estatusEquipo.toUpperCase()}
                          </div>
                        </div>

                        <div className="row g-4">
                          {/* Columna de Atletas */}
                          <div className="col-12 col-lg-7">
                            <h6 className="text-white mb-3"><i className="fas fa-users me-2 text-primary"></i>Atletas Inscritos ({a.length})</h6>
                            <div className="d-flex flex-column gap-2 mb-4">
                              {a.map((ath, i) => {
                                let badgeAdvertencia = null;
                                if (!(c.esEquipo || c.EsEquipo)) {
                                  const athLvlStr = ath.nivelHabilidad || ath.NivelHabilidad;
                                  const catLvlStr = getCategoryLevelString(c);
                                  if (getLevelValue(athLvlStr) < getLevelValue(catLvlStr)) {
                                    badgeAdvertencia = (
                                      <span className="badge bg-warning text-dark ms-2" title="El atleta compite en una categoría superior a su nivel personal.">
                                        <i className="fas fa-level-up-alt me-1"></i>Asumió Nivel Superior
                                      </span>
                                    );
                                  }
                                }
                                
                                return (
                                  <div key={i} className="p-3 bg-black rounded border border-secondary border-opacity-25 d-flex justify-content-between align-items-center">
                                    <div className="d-flex align-items-center gap-3">
                                      <div className="bg-secondary bg-opacity-25 rounded-circle d-flex align-items-center justify-content-center text-secondary" style={{ width: '40px', height: '40px' }}>
                                        <i className={`fas fa-${(ath.genero || ath.Genero).toLowerCase() === 'hombre' || (ath.genero || ath.Genero).toLowerCase() === 'masculino' ? 'male' : 'female'} fs-5`}></i>
                                      </div>
                                      <div>
                                        <strong className="text-white d-block">{ath.nombreCompleto || ath.NombreCompleto} {ath.apellidos || ath.Apellidos}</strong>
                                        <div className="d-flex align-items-center gap-2 mt-1">
                                          <span className="small text-secondary">{ath.nivelHabilidad || ath.NivelHabilidad}</span>
                                          {(ath.fechaRegistro || ath.FechaRegistro) && (
                                            <span className="small text-secondary border-start border-secondary ps-2"><i className="fas fa-clock me-1"></i>Se unió: {new Date(ath.fechaRegistro || ath.FechaRegistro).toLocaleDateString('es-MX')}</span>
                                          )}
                                        </div>
                                        {badgeAdvertencia}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                              {a.length === 0 && (
                                <p className="text-secondary small mb-0"><i className="fas fa-info-circle me-1"></i>Aún no hay atletas unidos.</p>
                              )}
                            </div>

                            {(c.esEquipo || c.EsEquipo) && (
                              <div className="mt-4">
                                <h6 className="text-white mb-3"><i className="fas fa-user-plus me-2 text-warning"></i>Perfiles Faltantes</h6>
                                <div className="d-flex flex-wrap gap-2">
                                  {Math.max(0, rHombres) > 0 && <span className="badge bg-dark border border-secondary px-3 py-2 text-light">Falta(n) {rHombres} Hombre(s)</span>}
                                  {Math.max(0, rMujeres) > 0 && <span className="badge bg-dark border border-secondary px-3 py-2 text-light">Falta(n) {rMujeres} Mujer(es)</span>}
                                  {Math.max(0, rMaster) > 0 && <span className="badge bg-dark border border-warning text-warning px-3 py-2">Falta(n) {rMaster} Master</span>}
                                  {Math.max(0, rAvanzado) > 0 && <span className="badge bg-dark border border-danger text-danger px-3 py-2">Falta(n) {rAvanzado} Avanzado/RX</span>}
                                  {Math.max(0, rIntermedio) > 0 && <span className="badge bg-dark border border-primary text-primary px-3 py-2">Falta(n) {rIntermedio} Intermedio</span>}
                                  {Math.max(0, rPrincipiante) > 0 && <span className="badge bg-dark border border-info text-info px-3 py-2">Falta(n) {rPrincipiante} Principiante</span>}
                                  {Math.max(0, rNovato) > 0 && <span className="badge bg-dark border border-success text-success px-3 py-2">Falta(n) {rNovato} Novato</span>}
                                  
                                  {Math.max(0, rHombres) === 0 && Math.max(0, rMujeres) === 0 && Math.max(0, rMaster) === 0 && Math.max(0, rAvanzado) === 0 && Math.max(0, rIntermedio) === 0 && Math.max(0, rPrincipiante) === 0 && Math.max(0, rNovato) === 0 && (
                                    <span className="badge bg-success bg-opacity-25 text-success border border-success px-3 py-2">
                                      <i className="fas fa-check-circle me-1"></i>Equipo Completo
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Columna de Finanzas */}
                          <div className="col-12 col-lg-5">
                            <h6 className="text-white mb-3"><i className="fas fa-wallet me-2 text-success"></i>Aportaciones Financieras</h6>
                            <div className="p-3 bg-black rounded border border-secondary border-opacity-25 mb-4">
                              <div className="d-flex justify-content-between align-items-center mb-2">
                                <span className="text-secondary small">Costo Total:</span>
                                <span className="text-white fw-bold">${c.costo || c.Costo} MXN</span>
                              </div>
                              <div className="d-flex justify-content-between align-items-center mb-2">
                                <span className="text-secondary small">Abonado (Validado o Pendiente):</span>
                                <span className="text-success fw-bold">${datosEstatus.MontoAbonadoTotal || datosEstatus.montoAbonadoTotal || 0} MXN</span>
                              </div>
                              <div className="d-flex justify-content-between align-items-center pt-2 border-top border-secondary border-opacity-25 mt-2">
                                <span className="text-white small">Restante:</span>
                                <span className="text-warning fw-bold">
                                  ${Math.max(0, (c.costo || c.Costo) - (datosEstatus.MontoAbonadoTotal || datosEstatus.montoAbonadoTotal || 0))} MXN
                                </span>
                              </div>
                            </div>

                            <div className="d-flex flex-column gap-2">
                              {p.map((pago, i) => {
                                const estPago = pago.estatus || pago.Estatus;
                                let color = 'secondary';
                                let icon = 'clock';
                                if (estPago === 'Aprobado') { color = 'success'; icon = 'check-circle'; }
                                else if (estPago === 'Rechazado') { color = 'danger'; icon = 'times-circle'; }
                                else if (estPago === 'PendienteVerificacion' || estPago === 'Pendiente') { color = 'warning'; icon = 'hourglass-half'; }

                                return (
                                  <div key={i} className="p-2 bg-dark rounded border border-secondary border-opacity-25 d-flex justify-content-between align-items-center">
                                    <div>
                                      <strong className="text-white d-block small">{pago.nombrePagador || pago.NombrePagador}</strong>
                                      <div className="d-flex flex-column lh-sm mt-1">
                                        <span className="text-secondary" style={{ fontSize: '0.75rem' }}>
                                          Enviado: {pago.fechaPago || pago.FechaPago ? new Date(pago.fechaPago || pago.FechaPago).toLocaleDateString() : '—'}
                                        </span>
                                        {estPago === 'Aprobado' && (pago.fechaAprobacionPago || pago.FechaAprobacionPago) && (
                                          <span className="text-success mt-1" style={{ fontSize: '0.75rem' }}>
                                            <i className="fas fa-calendar-check me-1"></i>Aprobado: {new Date(pago.fechaAprobacionPago || pago.FechaAprobacionPago).toLocaleDateString('es-MX')} {new Date(pago.fechaAprobacionPago || pago.FechaAprobacionPago).toLocaleTimeString('es-MX', {hour: '2-digit', minute:'2-digit'})}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <div className="text-end">
                                      <strong className={`text-${color} d-block`}>${pago.montoAbonado || pago.MontoAbonado}</strong>
                                      <span className={`badge bg-${color} bg-opacity-25 text-${color} border border-${color}`} style={{ fontSize: '0.65rem' }}>
                                        <i className={`fas fa-${icon} me-1`}></i>{estPago}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                              {p.length === 0 && (
                                <p className="text-secondary small text-center mb-0 mt-2">Aún no hay pagos registrados.</p>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* SECCIÓN DE PAGO (Si hay deuda restante) */}
                        {(datosEstatus.deudaRestante > 0 || datosEstatus.DeudaRestante > 0) && (
                          <div className="mt-4 pt-4 border-top border-secondary border-opacity-25">
                            <h5 className="text-white mb-3"><i className="fas fa-hand-holding-usd me-2 text-info"></i>Liquidar Saldo Restante</h5>
                            
                            {(datosEstatus.pagoEnProceso || datosEstatus.PagoEnProceso) ? (
                              <div className="alert alert-warning d-flex align-items-center justify-content-between">
                                <div>
                                  <i className="fas fa-lock me-2 fs-4"></i>
                                  <strong>Pago en Proceso.</strong> Un integrante del equipo está realizando el pago en línea. Por favor espera a que termine o expire la sesión.
                                </div>
                                <div className="text-center px-3 border-start border-warning ms-3">
                                  <div className="small text-dark mb-1">Tiempo Restante</div>
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
                              <form onSubmit={async (e) => {
                                e.preventDefault();
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
                              }} className="portal-pago-section mt-0">
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
                                      <small className="text-info mt-1 d-block"><i className="fas fa-info-circle me-1"></i>Stripe requiere liquidar el total.</small>
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
                                
                                {mensaje.texto && (
                                  <div className={`alert alert-${mensaje.tipo} mt-3 mb-0 small`}>{mensaje.texto}</div>
                                )}

                                <BotonSeguro type="submit" disabled={enviando} className="btn btn-primary w-100 fw-bold mt-4 py-2" tiempoBloqueo={3000}>
                                  <i className="fas fa-paper-plane me-2"></i>Enviar Abono
                                </BotonSeguro>
                              </form>
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
        const cuposRestantes = (cat.cupoMaximo || cat.CupoMaximo || 0) - (cat.inscritos || cat.Inscritos || 0);
        return (
          <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 1050 }} tabIndex="-1">
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content text-light border-info" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border) !important' }}>
                <div className="modal-header border-bottom border-secondary border-opacity-25">
                  <h5 className="modal-title text-info" style={{ fontFamily: 'var(--font-heading)' }}>
                    <i className="fas fa-info-circle me-2"></i>Información de Inscripción
                  </h5>
                  <button type="button" className="btn-close btn-close-white" onClick={() => setMostrarInfo(false)}></button>
                </div>
                <div className="modal-body">
                  <div className="text-center mb-4">
                    <h4 className="text-white mb-1" style={{ fontFamily: 'var(--font-heading)' }}>{cat.nombre || cat.Nombre}</h4>
                    <span className="badge bg-secondary border border-secondary text-light">
                      {(cat.esEquipo || cat.EsEquipo) ? 'Modalidad por Equipo' : 'Modalidad Individual'}
                    </span>
                  </div>

                  <div className="row g-3 mb-4">
                    <div className="col-4">
                      <div className="p-3 bg-dark rounded border border-secondary border-opacity-25 text-center">
                        <i className="fas fa-users text-secondary mb-2 fs-4"></i>
                        <h6 className="mb-0 text-white">{(cat.cantidadIntegrantes || cat.CantidadIntegrantes)}</h6>
                        <small className="text-muted">Integrantes</small>
                      </div>
                    </div>
                    <div className="col-4">
                      <div className="p-3 bg-dark rounded border border-secondary border-opacity-25 text-center">
                        <i className="fas fa-ticket-alt text-secondary mb-2 fs-4"></i>
                        <h6 className="mb-0 text-white">{(cat.cupoMaximo || cat.CupoMaximo)}</h6>
                        <small className="text-muted">Lugares Máx.</small>
                      </div>
                    </div>
                    <div className="col-4">
                      <div className={`p-3 rounded border text-center ${cuposRestantes > 0 ? 'bg-success bg-opacity-10 border-success' : 'bg-danger bg-opacity-10 border-danger'}`}>
                        <i className={`fas ${cuposRestantes > 0 ? 'fa-check-circle text-success' : 'fa-times-circle text-danger'} mb-2 fs-4`}></i>
                        <h6 className={`mb-0 ${cuposRestantes > 0 ? 'text-success' : 'text-danger'}`}>{cuposRestantes > 0 ? cuposRestantes : 0}</h6>
                        <small className={cuposRestantes > 0 ? 'text-success' : 'text-danger'}>Disponibles</small>
                      </div>
                    </div>
                  </div>

                  <h6 className="text-secondary small fw-bold mb-3 border-bottom border-secondary border-opacity-25 pb-2 text-uppercase">Requisitos de Registro</h6>
                  <div className="d-flex flex-wrap gap-2 mb-4">
                    {(cat.cupoHombres > 0 || cat.CupoHombres > 0) && <span className="badge bg-info bg-opacity-25 text-info border border-info px-3 py-2"><i className="fas fa-male me-1"></i>Hombres: {cat.cupoHombres || cat.CupoHombres}</span>}
                    {(cat.cupoMujeres > 0 || cat.CupoMujeres > 0) && <span className="badge bg-danger bg-opacity-25 text-danger border border-danger px-3 py-2"><i className="fas fa-female me-1"></i>Mujeres: {cat.cupoMujeres || cat.CupoMujeres}</span>}
                    
                    {(cat.cupoAvanzado > 0 || cat.CupoAvanzado > 0) && <span className="badge bg-secondary text-light border border-secondary px-3 py-2">Avanzado: {cat.cupoAvanzado || cat.CupoAvanzado}</span>}
                    {(cat.cupoIntermedio > 0 || cat.CupoIntermedio > 0) && <span className="badge bg-secondary text-light border border-secondary px-3 py-2">Intermedio: {cat.cupoIntermedio || cat.CupoIntermedio}</span>}
                    {(cat.cupoPrincipiante > 0 || cat.CupoPrincipiante > 0) && <span className="badge bg-secondary text-light border border-secondary px-3 py-2">Principiante: {cat.cupoPrincipiante || cat.CupoPrincipiante}</span>}
                    {(cat.cupoNovato > 0 || cat.CupoNovato > 0) && <span className="badge bg-secondary text-light border border-secondary px-3 py-2">Novato: {cat.cupoNovato || cat.CupoNovato}</span>}
                    {(cat.cupoMaster > 0 || cat.CupoMaster > 0) && <span className="badge bg-warning bg-opacity-25 text-warning border border-warning px-3 py-2">Master: {cat.cupoMaster || cat.CupoMaster}</span>}
                  </div>

                  {cuposRestantes <= 0 && (
                    <div className="alert alert-danger p-2 text-center small mb-0">
                      <i className="fas fa-exclamation-triangle me-2"></i>Esta categoría está llena.
                    </div>
                  )}

                </div>
                <div className="modal-footer border-top border-secondary border-opacity-25">
                  <button className="btn btn-secondary w-100" onClick={() => setMostrarInfo(false)}>Cerrar</button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* === MODAL REQUISITO CATEGORIA INDIVIDUAL === */}
      {modalRequisitoNivel && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 1050 }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content text-light border-primary" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border) !important' }}>
              <div className="modal-header border-bottom border-secondary border-opacity-25">
                <h5 className="modal-title text-primary" style={{ fontFamily: 'var(--font-heading)' }}>
                  <i className="fas fa-dumbbell me-2"></i>Requisito de Nivel
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setModalRequisitoNivel(null)}></button>
              </div>
              <div className="modal-body text-center py-4">
                <i className="fas fa-fire text-primary mb-3" style={{ fontSize: '3rem' }}></i>
                <h5>Esta categoría requiere de un atleta:</h5>
                <div className="d-flex justify-content-center align-items-center gap-3 my-3">
                  <div className="d-flex flex-column align-items-center">
                    <i className={`fas fa-${(modalRequisitoNivel.cupoHombres > 0 || modalRequisitoNivel.CupoHombres > 0) ? 'male text-info' : 'female'} fs-1`} style={{ color: (modalRequisitoNivel.cupoMujeres > 0 || modalRequisitoNivel.CupoMujeres > 0) ? '#ff7fa8' : '' }}></i>
                    <span className="mt-2 fw-bold">{(modalRequisitoNivel.cupoHombres > 0 || modalRequisitoNivel.CupoHombres > 0) ? 'Hombre' : 'Mujer'}</span>
                  </div>
                  <i className="fas fa-plus text-secondary"></i>
                  <div className="d-flex flex-column align-items-center">
                    <h3 className="text-warning mb-0" style={{ fontFamily: 'var(--font-heading)' }}>
                      {getCategoryLevelString(modalRequisitoNivel)}
                    </h3>
                  </div>
                </div>
                <p className="text-secondary small mb-0 mt-4">Si tu nivel personal es superior al requerido, no podrás inscribirte para mantener la competencia justa (Anti-Cachirul).</p>
              </div>
              <div className="modal-footer border-top border-secondary border-opacity-25 d-flex justify-content-between">
                <button className="btn btn-outline-secondary" onClick={() => setModalRequisitoNivel(null)}>Cancelar</button>
                <button className="btn btn-primary fw-bold" onClick={() => seleccionarCategoria(modalRequisitoNivel)}>Siguiente <i className="fas fa-arrow-right ms-1"></i></button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* === MODAL ADVERTENCIA DE NIVEL INFERIOR === */}
      {modalAdvertenciaNivel && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 1060 }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content text-light border-warning" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border) !important' }}>
              <div className="modal-header border-bottom border-secondary border-opacity-25">
                <h5 className="modal-title text-warning" style={{ fontFamily: 'var(--font-heading)' }}>
                  <i className="fas fa-exclamation-triangle me-2"></i>Advertencia de Nivel
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setModalAdvertenciaNivel(null)}></button>
              </div>
              <div className="modal-body text-center py-4">
                <p className="fs-5 mb-4">¿Estás seguro de escalar niveles?</p>
                <div className="d-flex justify-content-center align-items-center gap-3 mb-4">
                  <div className="text-end">
                    <span className="d-block small text-secondary">Tu Nivel</span>
                    <strong className="text-light">{modalAdvertenciaNivel.athLevel}</strong>
                  </div>
                  <i className="fas fa-arrow-right text-warning fs-4"></i>
                  <div className="text-start">
                    <span className="d-block small text-secondary">Categoría</span>
                    <strong className="text-warning">{modalAdvertenciaNivel.catLevel}</strong>
                  </div>
                </div>
                <p className="text-secondary small mb-0">Ya que niveles avanzados requieren más experiencia.</p>
              </div>
              <div className="modal-footer border-top border-secondary border-opacity-25 d-flex justify-content-between">
                <button className="btn btn-secondary" onClick={() => setModalAdvertenciaNivel(null)}>Cambiar Nivel</button>
                <button className="btn btn-warning text-dark fw-bold" onClick={() => {
                  setAtletaForm(prev => ({ ...prev, aceptoRiesgoNivel: true }));
                  setModalAdvertenciaNivel(null);
                  procesarInscripcionFinal();
                }}>Asumir el Riesgo <i className="fas fa-check-circle ms-1"></i></button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* === MODAL CACHIRUL BLOQUEADO === */}
      {modalCachirul && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 1060 }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content text-light border-danger" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border) !important' }}>
              <div className="modal-header border-bottom border-secondary border-opacity-25">
                <h5 className="modal-title text-danger" style={{ fontFamily: 'var(--font-heading)' }}>
                  <i className="fas fa-ban me-2"></i>¡Cachirul Detectado!
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setModalCachirul(null)}></button>
              </div>
              <div className="modal-body text-center py-4">
                <div className="mb-3">
                  <i className="fas fa-user-slash text-danger" style={{ fontSize: '3.5rem' }}></i>
                </div>
                <h5 className="text-white mb-4">No puedes inscribirte a una categoría inferior a tu nivel actual.</h5>
                
                <div className="p-3 bg-dark rounded border border-danger border-opacity-25">
                  <p className="mb-2">Tu Nivel Real: <strong>{modalCachirul.athLevel}</strong></p>
                  <p className="mb-0">Requisito: <strong>{modalCachirul.catLevel}</strong></p>
                </div>
              </div>
              <div className="modal-footer border-top border-secondary border-opacity-25">
                <button className="btn btn-danger w-100 fw-bold" onClick={() => setModalCachirul(null)}>Aceptar y Regresar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* === MODAL CÓDIGO DE INVITACIÓN === */}
      {mensaje.codigo && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 1070 }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content text-light border-success" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border) !important' }}>
              <div className="modal-header border-bottom border-secondary border-opacity-25">
                <h5 className="modal-title text-success" style={{ fontFamily: 'var(--font-heading)' }}>
                  <i className="fas fa-check-circle me-2"></i>Inscripción Exitosa
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setMensaje({ ...mensaje, codigo: '' })}></button>
              </div>
              <div className="modal-body text-center py-5">
                <i className="fas fa-ticket-alt text-success mb-3" style={{ fontSize: '3.5rem' }}></i>
                <h4 className="text-white mb-2">¡Tu equipo ha sido creado!</h4>
                <p className="text-secondary mb-4">Comparte este código con tus compañeros para que puedan unirse a tu equipo.</p>
                
                <div className="p-4 bg-dark rounded border border-success border-opacity-50 mb-4" style={{ cursor: 'pointer' }} onClick={() => {
                    navigator.clipboard.writeText(mensaje.codigo);
                    setCopiadoCodigo(true);
                    setTimeout(() => setCopiadoCodigo(false), 2000);
                  }}>
                  <p className="small text-success text-uppercase fw-bold mb-1">Código de Equipo</p>
                  <h1 className="text-white mb-0" style={{ letterSpacing: '3px', fontFamily: 'monospace' }}>{mensaje.codigo}</h1>
                </div>

                <button
                  type="button"
                  className={`btn w-100 fw-bold ${copiadoCodigo ? 'btn-success text-dark' : 'btn-outline-success'}`}
                  onClick={() => {
                    navigator.clipboard.writeText(mensaje.codigo);
                    setCopiadoCodigo(true);
                    setTimeout(() => setCopiadoCodigo(false), 2000);
                  }}
                >
                  <i className={`fas ${copiadoCodigo ? 'fa-check' : 'fa-copy'} me-2`}></i>
                  {copiadoCodigo ? '¡Código Copiado!' : 'Copiar Código al Portapapeles'}
                </button>
              </div>
              <div className="modal-footer border-top border-secondary border-opacity-25">
                <button className="btn btn-secondary w-100" onClick={() => setMensaje({ ...mensaje, codigo: '' })}>Entendido, Cerrar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* === MODAL REQUISITO EQUIPO (CREAR / UNIRSE) === */}
      {modalRequisitoEquipo && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 1050 }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content text-light border-primary" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border) !important' }}>
              <div className="modal-header border-bottom border-secondary border-opacity-25">
                <h5 className="modal-title text-primary" style={{ fontFamily: 'var(--font-heading)' }}>
                  <i className="fas fa-users-cog me-2"></i>
                  {modalRequisitoEquipo.tipo === 'crear' ? 'Requisitos del Equipo' : 'Lugares Disponibles'}
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setModalRequisitoEquipo(null)}></button>
              </div>
              <div className="modal-body py-4">
                {modalRequisitoEquipo.tipo === 'unirse' && (
                  <div className="mb-4 text-center">
                    <h5 className="text-white mb-1">Unirse a: <span className="text-success">{modalRequisitoEquipo.nombreEquipo}</span></h5>
                    <p className="small text-secondary mb-0">Revisa si cumples con los perfiles faltantes.</p>
                  </div>
                )}
                {modalRequisitoEquipo.tipo === 'crear' && (
                  <div className="mb-4 text-center">
                    <h5 className="text-white mb-1">Receta Completa del Equipo</h5>
                    <p className="small text-secondary mb-0">Para formar este equipo, necesitarás juntar exactamente estos perfiles.</p>
                  </div>
                )}
                
                <div className="row g-3">
                  <div className="col-6">
                    <div className="p-3 bg-dark rounded border border-secondary border-opacity-25 text-center h-100">
                      <i className="fas fa-venus-mars text-info mb-2 fs-4"></i>
                      <h6 className="text-white mb-2">Géneros</h6>
                      <div className="small text-secondary">
                        Hombres: <strong className="text-white">{Math.max(0, modalRequisitoEquipo.restantes.mHombres)}</strong><br/>
                        Mujeres: <strong className="text-white">{Math.max(0, modalRequisitoEquipo.restantes.mMujeres)}</strong>
                      </div>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="p-3 bg-dark rounded border border-secondary border-opacity-25 text-center h-100">
                      <i className="fas fa-layer-group text-warning mb-2 fs-4"></i>
                      <h6 className="text-white mb-2">Niveles</h6>
                      <div className="small text-secondary">
                        Master: <strong className="text-white">{Math.max(0, modalRequisitoEquipo.restantes.mMaster)}</strong><br/>
                        Avanzado/RX: <strong className="text-white">{Math.max(0, modalRequisitoEquipo.restantes.mAvanzado)}</strong><br/>
                        Intermedio: <strong className="text-white">{Math.max(0, modalRequisitoEquipo.restantes.mIntermedio)}</strong><br/>
                        Principiante: <strong className="text-white">{Math.max(0, modalRequisitoEquipo.restantes.mPrincipiante)}</strong><br/>
                        Novato: <strong className="text-white">{Math.max(0, modalRequisitoEquipo.restantes.mNovato)}</strong>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 p-3 rounded text-center" style={{ backgroundColor: 'rgba(255, 193, 7, 0.1)', border: '1px solid rgba(255, 193, 7, 0.3)' }}>
                  <i className="fas fa-exclamation-triangle text-warning mb-2 fs-5"></i>
                  <p className="small text-warning mb-0"><strong>Validación Estricta:</strong> No se permite escalar posiciones (si pide un novato, debe ser un novato). Si tu perfil no encaja en las vacantes, no podrás inscribirte.</p>
                </div>

              </div>
              <div className="modal-footer border-top border-secondary border-opacity-25 d-flex justify-content-between">
                <button className="btn btn-outline-secondary" onClick={() => setModalRequisitoEquipo(null)}>Cancelar</button>
                <button className="btn btn-primary fw-bold" onClick={() => {
                  setModoInscripcion(modalRequisitoEquipo.tipo);
                  setModalRequisitoEquipo(null);
                }}>
                  Entendido, Siguiente <i className="fas fa-arrow-right ms-1"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
