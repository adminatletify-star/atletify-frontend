import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import { API_BASE_URL_CONST, COMPETENCIAS_ENDPOINT } from '../services/api';
import BackButton from '../components/BackButton';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import RedGrayDatePicker from '../components/RedGrayDatePicker';
import CompDetalleSideMenu from '../components/CompDetalleSideMenu';
import ConstructorWodComp from '../components/ConstructorWodComp';
import TimeWheelPicker from '../components/TimeWheelPicker';
import BotonSeguro from '../components/BotonSeguro';
import PlanesModal from '../components/PlanesModal';
import GestionJuecesCompPanel from '../components/GestionJuecesCompPanel';
import GestionStaffCompePanel from '../components/GestionStaffCompePanel';
import GestionHeatsPanel from '../components/GestionHeatsPanel';
import PanelVerificacionScores from '../components/PanelVerificacionScores';
import AtletifyLoader from '../components/AtletifyLoader';
import '../assets/css/CompetenciaDetalle.css';

export default function CompetenciaDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [comp, setComp] = useState(null);
  const [tabActiva, setTabActiva] = useState('dashboard');
  const [sideMenuOpen, setSideMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mostrarPlanes, setMostrarPlanes] = useState(false);

  // ========================================================
  // 1. ESTADOS GLOBALES Y PESTAÑAS
  // ========================================================
  const [modoEdicion, setModoEdicion] = useState(false);
  const [guardando, setGuardando] = useState(false);

  // Dashboard / Finanzas
  const [gastos, setGastos] = useState([]);
  const [nuevoGasto, setNuevoGasto] = useState({ descripcion: '', monto: '' });
  const [guardandoGastos, setGuardandoGastos] = useState(false);
  const [configFinanciera, setConfigFinanciera] = useState({
    aceptarPagosEnLinea: true,
    aceptarTransferencias: true,
    aceptarEfectivo: true,
    absorberComisionTarjeta: false,
    montoMinimoAporte: 0
  });
  const [guardandoConfig, setGuardandoConfig] = useState(false);

  // Portal Público y Fechas
  const [reglamento, setReglamento] = useState('');
  const [anuncios, setAnuncios] = useState('');
  const [fechas, setFechas] = useState({ inicioIns: '', finIns: '', inicioComp: '', finComp: '', horaInicioComp: '08:00', horaFinComp: '18:00' });
  const [zonaOffset, setZonaOffset] = useState(-6); // zona horaria del evento (offset UTC); solo afecta el auto-status

  // Rol del usuario logueado
  const userRol = JSON.parse(localStorage.getItem('usuario') || '{}')?.rol || '';
  const esDeveloper = userRol === 'Developer';

  // Categorías
  const [procesandoCat, setProcesandoCat] = useState(false);
  const [formCat, setFormCat] = useState({
    nombre: '', esEquipo: false, cantidadIntegrantes: 1, cupoMaximo: 10, minimoMujeres: 0, minimoHombres: 0, nivelHabilidad: 'Principiante', costo: 0
  });

  // WODs y Auditoría
  const [wods, setWods] = useState([]);
  const [cargandoWods, setCargandoWods] = useState(false);
  const [constructorWod, setConstructorWod] = useState({ abierto: false, idWod: null });
  const [scoresAuditoria, setScoresAuditoria] = useState([]);
  const [cargandoAuditoria, setCargandoAuditoria] = useState(false);
  const [filtroAuditoria, setFiltroAuditoria] = useState({ busqueda: '', estatus: 'Todos', idWod: 'Todos' });
  const [vistaAuditoria, setVistaAuditoria] = useState('leaderboard'); // el desglose de scores+firma vive ahora en PanelVerificacionScores (arriba)
  const [idCatActivaLeaderboard, setIdCatActivaLeaderboard] = useState('');


  // Roster y Pagos
  const [roster, setRoster] = useState([]);
  const [cargandoRoster, setCargandoRoster] = useState(false);
  const [procesandoPago, setProcesandoPago] = useState(false);
  const [juecesComp, setJuecesComp] = useState([]);
  const [staffComp, setStaffComp] = useState([]);
  const [modalTallaVisible, setModalTallaVisible] = useState(null);

  const adminLeaderboardCalculado = useMemo(() => {
    if (!idCatActivaLeaderboard || roster.length === 0) return [];

    const categoriaActual = roster.find(c => (c.idCategoriaComp || c.IdCategoriaComp) == idCatActivaLeaderboard);
    let equiposEnPista = (categoriaActual?.equipos || categoriaActual?.Equipos || []).filter(eq => (eq.estatusPago || eq.EstatusPago) === 'Aprobado');

    const parseScoreValue = (resultado, tipo) => {
      if (!resultado) return tipo === 'For Time' ? Infinity : -1;
      if (tipo === 'For Time') {
        const partes = resultado.split(':');
        if (partes.length === 2) return parseInt(partes[0]) * 60 + parseInt(partes[1]);
        return Infinity;
      } else {
        const num = parseFloat(resultado.replace(/[^\d.-]/g, ''));
        return isNaN(num) ? -1 : num;
      }
    };

    const rankPorWod = {};
    wods.forEach(wod => {
      const idWod = wod.idWodComp || wod.IdWodComp;
      const tipo = wod.tipoCalificacion || wod.TipoCalificacion;
      rankPorWod[idWod] = {};

      let scoresMatematicos = equiposEnPista.map(eq => {
        const idEq = eq.idEquipoComp || eq.IdEquipoComp;
        const scoreEncontrado = scoresAuditoria.find(s =>
          s.idEquipoComp === idEq &&
          s.idWodComp === idWod &&
          (s.estatus === 'Aprobado' || s.Estatus === 'Aprobado')
        );

        return {
          idEquipo: idEq,
          valorAbsoluto: parseScoreValue(scoreEncontrado?.resultado, tipo),
          resultadoTexto: scoreEncontrado?.resultado || '--'
        };
      });

      scoresMatematicos.sort((a, b) => {
        if (tipo === 'For Time') return a.valorAbsoluto - b.valorAbsoluto;
        return b.valorAbsoluto - a.valorAbsoluto;
      });

      scoresMatematicos.forEach((scoreObj, index) => {
        if (scoreObj.valorAbsoluto === Infinity || scoreObj.valorAbsoluto === -1) {
          rankPorWod[idWod][scoreObj.idEquipo] = equiposEnPista.length + 1;
        } else {
          rankPorWod[idWod][scoreObj.idEquipo] = index + 1;
        }
      });
    });

    const equiposConPuntos = equiposEnPista.map(eq => {
      const idEq = eq.idEquipoComp || eq.IdEquipoComp;
      let puntosTotales = 0;
      wods.forEach(wod => {
        const idWod = wod.idWodComp || wod.IdWodComp;
        puntosTotales += rankPorWod[idWod][idEq] || 0;
      });
      return { ...eq, puntosTotales, rankPorWod };
    });

    equiposConPuntos.sort((a, b) => a.puntosTotales - b.puntosTotales);
    return equiposConPuntos;
  }, [idCatActivaLeaderboard, roster, wods, scoresAuditoria]);

  // Legal y Estándares
  const [carta, setCarta] = useState('');
  const [parametros, setParametros] = useState('');
  const [tablaEstandares, setTablaEstandares] = useState([]);

  // LOGÍSTICA HEATS MULTI-WOD
  const [configuracionHeats, setConfiguracionHeats] = useState({ publicado: false, wods: [] });
  const [panelConfigWod, setPanelConfigWod] = useState({
    idWodSeleccionado: '', categorias: [], carriles: 5, duracionWod: 12, transicion: 3, horaInicio: '08:00'
  });
  const [filtroHeats, setFiltroHeats] = useState('');
  const [itemHeatsAbierto, setItemHeatsAbierto] = useState(null);
  const [atletaSwap, setAtletaSwap] = useState(null);
  const [mostrarPickerHoraInicio, setMostrarPickerHoraInicio] = useState(false);

  // Configuracion de Plataforma
  const [contactoSoporte, setContactoSoporte] = useState({ correo: '', telefono: '', ig: '', fb: '' });

  // Inventario de competencia
  const [herramientasBox, setHerramientasBox] = useState([]);
  const [cargandoHerramientasBox, setCargandoHerramientasBox] = useState(false);
  const [guardandoInventarioComp, setGuardandoInventarioComp] = useState(false);
  const [cargandoInventarioComp, setCargandoInventarioComp] = useState(false);
  const [errorInventarioComp, setErrorInventarioComp] = useState('');
  const [inventarioComp, setInventarioComp] = useState({ materiales: [], prestamosManuales: [] });
  const [formMaterialComp, setFormMaterialComp] = useState({ idHerramienta: '', cantidadRequerida: '' });
  const [selectorHerramientaAbierto, setSelectorHerramientaAbierto] = useState(false);
  const [busquedaHerramienta, setBusquedaHerramienta] = useState('');
  const [filtroUnidadHerramienta, setFiltroUnidadHerramienta] = useState('todos');
  const [filtroTipoHerramienta, setFiltroTipoHerramienta] = useState('todos');
  const [prestamoAbiertoId, setPrestamoAbiertoId] = useState(null);
  const [materialAbiertoId, setMaterialAbiertoId] = useState(null);
  const [materialEditandoId, setMaterialEditandoId] = useState(null);
  const [cantidadRequeridaEdit, setCantidadRequeridaEdit] = useState('');
  const [minRequeridoEdit, setMinRequeridoEdit] = useState(1);
  const [busquedaInventario, setBusquedaInventario] = useState('');
  const [filtroTipoInventario, setFiltroTipoInventario] = useState('todos');
  const [formPrestamo, setFormPrestamo] = useState({ boxPrestamo: '', cantidad: '', notas: '' });
  const [formPrestamoManual, setFormPrestamoManual] = useState({ boxPrestamo: '', nombreEquipo: '', cantidad: '', notas: '' });
  const [prestamosExternosAbiertos, setPrestamosExternosAbiertos] = useState(false);

  // ========================================================
  // 2. EFECTOS Y CARGAS INICIALES
  // ========================================================
  useEffect(() => {
    cargarDatos();
  }, [id]);

  useEffect(() => {
    if (tabActiva === 'roster' || tabActiva === 'dashboard' || tabActiva === 'inscritos') cargarRoster();
    if (tabActiva === 'wods' || tabActiva === 'heats') cargarWods();
    if (tabActiva === 'auditoria') {
      cargarAuditoria();
      if (wods.length === 0) cargarWods();
      if (roster.length === 0) cargarRoster();
    }
    if (tabActiva === 'inventario-comp') {
      if (herramientasBox.length === 0) cargarHerramientasBox();
      cargarInventarioCompetencia();
    }
  }, [tabActiva]);

  useEffect(() => {
    if (!selectorHerramientaAbierto) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        setSelectorHerramientaAbierto(false);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [selectorHerramientaAbierto]);

  const cargarDatos = async () => {
    try {
      const boxGuardado = JSON.parse(localStorage.getItem('box') || 'null');
      const idBox = boxGuardado?.idBox || boxGuardado?.IdBox || 1;
      const res = await fetch(`${COMPETENCIAS_ENDPOINT}/box/${idBox}`);
      const data = await res.json();
      const encontrada = data.find(c => (c.idCompetencia || c.IdCompetencia) == id);

      // Obtener configuracion de la plataforma para mostrar contacto
      try {
        const resConfig = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/developer/configuracion`);
        const dataConfig = await resConfig.json();
        setContactoSoporte({
          correo: dataConfig.correoContacto || dataConfig.CorreoContacto || '',
          telefono: dataConfig.telefonoSoporte || dataConfig.TelefonoSoporte || '',
          ig: dataConfig.linkInstagram || dataConfig.LinkInstagram || '',
          fb: dataConfig.linkFacebook || dataConfig.LinkFacebook || ''
        });
      } catch (errConfig) {
        console.error("Error al cargar config de la plataforma", errConfig);
      }

      if (encontrada) {
        setComp(encontrada);
        setCarta(encontrada.cartaResponsiva || encontrada.CartaResponsiva || '');
        setReglamento(encontrada.reglamento || encontrada.Reglamento || '');
        setAnuncios(encontrada.anuncios || encontrada.Anuncios || '');

        // 👇 ESCUDO ANTI-CRASH PARA LOS HEATS 👇
        try {
          const heatsData = encontrada.heatsConfig || encontrada.HeatsConfig;
          if (heatsData) {
            const parsedHeats = JSON.parse(heatsData);
            // Si la base de datos tenía el formato viejo (Array), lo reseteamos para no romper React
            if (Array.isArray(parsedHeats)) {
              setConfiguracionHeats({ publicado: false, wods: [] });
              setInventarioComp({ materiales: [], prestamosManuales: [] });
            } else {
              setConfiguracionHeats(parsedHeats);
              const inventarioGuardado = parsedHeats?.inventarioCompetencia;
              setInventarioComp({
                materiales: Array.isArray(inventarioGuardado?.materiales) ? inventarioGuardado.materiales : [],
                prestamosManuales: Array.isArray(inventarioGuardado?.prestamosManuales) ? inventarioGuardado.prestamosManuales : []
              });
            }
          } else {
            setInventarioComp({ materiales: [], prestamosManuales: [] });
          }
        } catch (e) {
          setConfiguracionHeats({ publicado: false, wods: [] });
          setInventarioComp({ materiales: [], prestamosManuales: [] });
        }

        const _fi = encontrada.fechaInicio || encontrada.FechaInicio || '';
        const _ff = encontrada.fechaFin || encontrada.FechaFin || '';
        const _horaDe = (s, def) => { const t = (s || '').split('T')[1]; return t ? t.slice(0, 5) : def; };
        setFechas({
          inicioIns: encontrada.fechaInicioInscripcion || encontrada.FechaInicioInscripcion ? (encontrada.fechaInicioInscripcion || encontrada.FechaInicioInscripcion).split('T')[0] : '',
          finIns: encontrada.fechaFinInscripcion || encontrada.FechaFinInscripcion ? (encontrada.fechaFinInscripcion || encontrada.FechaFinInscripcion).split('T')[0] : '',
          inicioComp: _fi.startsWith('2099') ? '' : (_fi ? _fi.split('T')[0] : ''),
          finComp: _ff.startsWith('2099') ? '' : (_ff ? _ff.split('T')[0] : ''),
          horaInicioComp: _fi && !_fi.startsWith('2099') ? _horaDe(_fi, '08:00') : '08:00',
          horaFinComp: _ff && !_ff.startsWith('2099') ? _horaDe(_ff, '18:00') : '18:00',
        });
        setZonaOffset(encontrada.zonaHorariaOffset ?? -6);

        try {
          const gastosGuardados = encontrada.registroGastos || encontrada.RegistroGastos;
          if (gastosGuardados) setGastos(JSON.parse(gastosGuardados));
        } catch (e) {
          setGastos([]);
        }

        setConfigFinanciera({
          aceptarPagosEnLinea: encontrada.aceptarPagosEnLinea ?? encontrada.AceptarPagosEnLinea ?? true,
          aceptarTransferencias: encontrada.aceptarTransferencias ?? encontrada.AceptarTransferencias ?? true,
          aceptarEfectivo: encontrada.aceptarEfectivo ?? encontrada.AceptarEfectivo ?? true,
          absorberComisionTarjeta: encontrada.absorberComisionTarjeta ?? encontrada.AbsorberComisionTarjeta ?? false,
          montoMinimoAporte: encontrada.montoMinimoAporte ?? encontrada.MontoMinimoAporte ?? 0
        });

        const estandaresGuardados = encontrada.parametrosEstandares || encontrada.ParametrosEstandares || '';
        try {
          if (estandaresGuardados.startsWith('[')) {
            setTablaEstandares(JSON.parse(estandaresGuardados));
            setParametros('');
          } else {
            setParametros(estandaresGuardados);
          }
        } catch (e) {
          setParametros(estandaresGuardados);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // ========================================================
  // 3. FUNCIONES DE LOGÍSTICA DE HEATS MULTI-WOD
  // ========================================================
  const guardarItinerarioCompleto = async (publicar) => {
    setGuardando(true);
    const nuevosDatosLogistica = { ...configuracionHeats, publicado: publicar };
    try {
      const payloadParametros = tablaEstandares.length > 0 ? JSON.stringify(tablaEstandares) : parametros;
      const res = await fetch(`${COMPETENCIAS_ENDPOINT}/${id}/contenido`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cartaResponsiva: carta,
          parametrosEstandares: payloadParametros,
          registroGastos: JSON.stringify(gastos),
          reglamento: reglamento,
          anuncios: anuncios,
          heatsConfig: JSON.stringify(nuevosDatosLogistica)
        })
      });

      if (res.ok) {
        setConfiguracionHeats(nuevosDatosLogistica);
        alert(publicar ? `¡Itinerario publicado oficialmente en todos lados! 🚀` : `¡Borrador de heats guardado exitosamente! 💾`);
      }
    } catch (err) {
      alert("Error de conexión.");
    } finally {
      setGuardando(false);
    }
  };

  const guardarConfiguracionFinanciera = async () => {
    setGuardandoConfig(true);
    try {
      const res = await fetch(`${COMPETENCIAS_ENDPOINT}/${id}/config-financiera`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configFinanciera)
      });
      const data = await res.json();
      if (res.ok) {
        alert("¡Configuración financiera actualizada correctamente!");
      } else {
        alert(data.mensaje || "Error al guardar configuración.");
      }
    } catch (err) {
      alert("Error de conexión al guardar configuración financiera.");
    } finally {
      setGuardandoConfig(false);
    }
  };

  const generarHeatsParaWod = () => {
    const { idWodSeleccionado, carriles, duracionWod, transicion, horaInicio, categorias } = panelConfigWod;

    if (!idWodSeleccionado) return alert("Selecciona un WOD de la lista.");
    if (categorias.length === 0) return alert("Marca al menos una categoría para este WOD.");
    if (carriles < 1) return alert("Número de carriles inválido.");
    if (roster.length === 0) return alert("No hay equipos en el Roster para acomodar.");

    const wodEncontrado = wods.find(w => (w.idWodComp || w.IdWodComp).toString() === idWodSeleccionado);
    const nombreWodActual = wodEncontrado ? (wodEncontrado.nombre || wodEncontrado.Nombre) : `WOD #${idWodSeleccionado}`;

    let heatsGenerados = [];
    let numeroHeatEnWod = 1;
    let tiempoActual = new Date(`2026-01-01T${horaInicio || '08:00'}:00`); // 🛡️ Escudo de hora

    const rosterFiltrado = roster.filter(cat => categorias.includes(cat.categoriaNombre || cat.CategoriaNombre));

    rosterFiltrado.forEach(categoria => {
      // 🛡️ REGLA DE ORO: Solo los APROBADOS existen para el generador
      const equiposAprobados = (categoria.equipos || categoria.Equipos || []).filter(eq => (eq.estatusPago || eq.EstatusPago) === 'Aprobado');

      for (let i = 0; i < equiposAprobados.length; i += parseInt(carriles)) {
        const participantesHeat = equiposAprobados.slice(i, i + parseInt(carriles));
        const horaFormateada = tiempoActual.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        heatsGenerados.push({
          idHeat: `wod${idWodSeleccionado}_heat_${numeroHeatEnWod}`,
          idWod: parseInt(idWodSeleccionado),
          nombreWod: nombreWodActual,
          numero: numeroHeatEnWod,
          categoria: categoria.categoriaNombre || categoria.CategoriaNombre,
          hora: horaFormateada,
          participantes: participantesHeat.map((eq, index) => ({
            carril: index + 1,
            idEquipo: eq.idEquipoComp || eq.IdEquipoComp,
            nombre: eq.nombre || eq.Nombre,
            box: eq.boxOrigen || eq.BoxOrigen
          }))
        });

        numeroHeatEnWod++;
        tiempoActual.setMinutes(tiempoActual.getMinutes() + parseInt(duracionWod) + parseInt(transicion));
      }
    });

    // 🛡️ Si seleccionó una categoría que está vacía (Puros pendientes)
    if (heatsGenerados.length === 0) return alert("🚨 No hay equipos APROBADOS en las categorías que seleccionaste. Ve a la pestaña 'Pagos y Roster' y aprueba al menos uno antes de armar sus heats.");

    // 🛡️ ESCUDO ANTI-CRASH DE MEMORIA VIEJA
    setConfiguracionHeats(prev => {
      const wodsSeguros = prev?.wods || [];
      const nuevosWods = [...wodsSeguros];
      const indexWod = nuevosWods.findIndex(w => w.idWod === parseInt(idWodSeleccionado));

      const datosWod = {
        idWod: parseInt(idWodSeleccionado),
        nombreWod: nombreWodActual,
        config: { carriles, duracionWod, transicion, horaInicio },
        lista: heatsGenerados
      };

      if (indexWod >= 0) {
        nuevosWods[indexWod] = datosWod;
      } else {
        nuevosWods.push(datosWod);
      }

      return { ...prev, wods: nuevosWods, publicado: prev?.publicado || false };
    });

    alert(`¡Éxito! Base de heats generada para el ${nombreWodActual}.`);
  };

  const gestionarSwapMultiWod = async (heatId, participante, index, wodId) => {
    if (!atletaSwap) {
      setAtletaSwap({ heatId, participante, index, wodId });
      return;
    }

    if (atletaSwap.heatId === heatId && atletaSwap.index === index) {
      setAtletaSwap(null);
      return;
    }

    if (atletaSwap.wodId !== wodId) {
      alert("🚨 No puedes mover un atleta a otro WOD distinto.");
      setAtletaSwap(null);
      return;
    }

    if (!await window.wpConfirm(`¿Intercambiar a ${atletaSwap.participante.nombre} con ${participante.nombre}?`)) {
      setAtletaSwap(null);
      return;
    }

    const nuevosDatosLogistica = { ...configuracionHeats };
    const wodsSeguros = nuevosDatosLogistica.wods || []; // 🛡️ Escudo
    const wodDestino = wodsSeguros.find(w => w.idWod === wodId);

    if (!wodDestino) return;

    const heatOrigen = wodDestino.lista.find(h => h.idHeat === atletaSwap.heatId);
    const heatDestino = wodDestino.lista.find(h => h.idHeat === heatId);

    const carrilO = heatOrigen.participantes[atletaSwap.index].carril;
    const carrilD = heatDestino.participantes[index].carril;

    const dOrigen = { ...heatOrigen.participantes[atletaSwap.index], carril: carrilD };
    const dDestino = { ...participante, carril: carrilO };

    heatOrigen.participantes[atletaSwap.index] = dDestino;
    heatDestino.participantes[index] = dOrigen;

    setConfiguracionHeats(nuevosDatosLogistica);
    setAtletaSwap(null);
  };

  const retrasarHeatsEnWod = async (wodId, minutos) => {
    if (!await window.wpConfirm(`¿Retrasar TODOS los Heats de este WOD ${minutos} minutos?`)) return;

    setConfiguracionHeats(prev => {
      const wodsSeguros = prev?.wods || []; // 🛡️ Escudo
      const nuevosWods = [...wodsSeguros];
      const wodAModificar = nuevosWods.find(w => w.idWod === wodId);

      if (wodAModificar) {
        wodAModificar.lista = wodAModificar.lista.map(heat => {
          const match = heat.hora.match(/(\d+):(\d+)\s*(AM|PM)?/i);
          if (!match) return heat;

          let hrs = parseInt(match[1]);
          const mins = parseInt(match[2]);
          const ampm = match[3];

          if (ampm) {
            if (ampm.toUpperCase() === 'PM' && hrs < 12) hrs += 12;
            if (ampm.toUpperCase() === 'AM' && hrs === 12) hrs = 0;
          }

          const date = new Date();
          date.setHours(hrs);
          date.setMinutes(mins + minutos);

          return { ...heat, hora: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
        });
      }
      return { ...prev, wods: nuevosWods };
    });
  };

  // ========================================================
  // 4. RESTO DE FUNCIONES (ROSTER, WODS, AUDITORÍA, GASTOS)
  // ========================================================
  const cargarRoster = async () => {
    setCargandoRoster(true);
    try {
      const res = await fetch(`${COMPETENCIAS_ENDPOINT}/${id}/roster`);
      setRoster(await res.json());

      // Cargar jueces para la Orden de Imprenta
      const resJueces = await fetch(`${API_BASE_URL_CONST}/usuarios/jueces/${id}`);
      if (resJueces.ok) {
        setJuecesComp(await resJueces.json());
      }

      // Cargar staff operativo para la Orden de Imprenta
      const resStaff = await fetch(`${API_BASE_URL_CONST}/usuarios/staff-compe/${id}`);
      if (resStaff.ok) {
        setStaffComp(await resStaff.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCargandoRoster(false);
    }
  };

  const cargarWods = async () => {
    setCargandoWods(true);
    try {
      const res = await fetch(`${COMPETENCIAS_ENDPOINT}/${id}/wods`);
      setWods(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setCargandoWods(false);
    }
  };

  const cargarHerramientasBox = async () => {
    const boxGuardado = JSON.parse(localStorage.getItem('box') || 'null');
    const idBox = boxGuardado?.idBox || boxGuardado?.IdBox;
    if (!idBox) return;
    setCargandoHerramientasBox(true);
    try {
      const res = await fetch(`${API_BASE_URL_CONST}/herramientas/box/${idBox}`);
      if (!res.ok) throw new Error('No se pudieron cargar las herramientas del box.');
      const data = await res.json();
      setHerramientasBox(Array.isArray(data) ? data : []);
    } catch (err) {
      alert(err.message || 'Error cargando herramientas.');
    } finally {
      setCargandoHerramientasBox(false);
    }
  };

  const cargarInventarioCompetencia = async () => {
    setCargandoInventarioComp(true);
    setErrorInventarioComp('');
    try {
      const res = await fetch(`${COMPETENCIAS_ENDPOINT}/${id}/inventario/resumen`);
      if (!res.ok) throw new Error('No se pudo cargar inventario de competencia.');
      const data = await res.json();
      setInventarioComp({
        materiales: Array.isArray(data.materiales) ? data.materiales : [],
        prestamosManuales: Array.isArray(data.prestamosManuales) ? data.prestamosManuales : []
      });
    } catch (err) {
      console.error(err);
      setErrorInventarioComp(err.message || 'No se pudo cargar inventario de competencia.');
      setInventarioComp({ materiales: [], prestamosManuales: [] });
    } finally {
      setCargandoInventarioComp(false);
    }
  };

  const getHerramientaUnidadLabel = (h) => {
    if (h.esKilo ?? h.EsKilo) return 'kg';
    if (h.esLibra ?? h.EsLibra) return 'lb';
    if (h.esMetro ?? h.EsMetro) return 'm';
    if (h.esMaquina ?? h.EsMaquina) return 'maq';
    return '';
  };

  const getHerramientaDescripcion = (h) => {
    return (h.descripcionAdicional ?? h.DescripcionAdicional ?? '').toString().trim();
  };

  const getHerramientaMedidaTexto = (h) => {
    const medida = Number(h.medida ?? h.Medida ?? 0);
    const unidad = getHerramientaUnidadLabel(h);
    if (medida > 0 && unidad) return `${medida} ${unidad}`;
    if (medida > 0) return `${medida}`;
    return unidad || 'Sin unidad';
  };

  const getPrestadoMaterial = (material) => {
    const prestamos = Array.isArray(material.prestamos) ? material.prestamos : [];
    return prestamos.reduce((acc, p) => acc + Number(p.cantidad || 0), 0);
  };

  const getFaltanteActual = (material) => {
    const faltanteBase = Number(material.faltante || 0);
    const prestado = getPrestadoMaterial(material);
    return Math.max(0, faltanteBase - prestado);
  };

  const formatFechaPrestamo = (fecha) => {
    if (!fecha) return 'Sin fecha';
    const parsed = new Date(fecha);
    if (Number.isNaN(parsed.getTime())) return 'Sin fecha';
    return new Intl.DateTimeFormat('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(parsed);
  };

  const agregarMaterialCompetencia = async () => {
    const idHerramienta = Number(formMaterialComp.idHerramienta);
    const requerido = Number(formMaterialComp.cantidadRequerida);
    if (!idHerramienta || requerido <= 0) {
      alert('Selecciona herramienta y una cantidad requerida válida.');
      return;
    }

    const yaSeleccionada = (inventarioComp.materiales || []).some((material) => {
      const idExistente = Number(material.idHerramienta ?? material.IdHerramienta ?? 0);
      return idExistente === idHerramienta;
    });

    if (yaSeleccionada) {
      alert('Error: esa herramienta ya está seleccionada en la competencia.');
      return;
    }

    try {
      const res = await fetch(`${COMPETENCIAS_ENDPOINT}/${id}/inventario/materiales`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idHerramienta, cantidadRequerida: requerido })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.mensaje || 'No se pudo agregar material.');
      await cargarInventarioCompetencia();
      if (Number(data.faltante || 0) > 0) {
        alert(`Faltan ${data.faltante} unidades.`);
      }
      setFormMaterialComp({ idHerramienta: '', cantidadRequerida: '' });
    } catch (err) {
      alert(err.message || 'Error al agregar material.');
    }
  };

  const guardarPrestamoMaterial = async (idMaterial) => {
    const cantidad = Number(formPrestamo.cantidad);
    if (!formPrestamo.boxPrestamo.trim() || cantidad <= 0) {
      alert('Captura Box de préstamo y cantidad válida.');
      return;
    }

    try {
      const res = await fetch(`${COMPETENCIAS_ENDPOINT}/${id}/inventario/materiales/${idMaterial}/prestamos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          boxPrestamo: formPrestamo.boxPrestamo.trim(),
          cantidadPrestada: cantidad,
          notas: formPrestamo.notas?.trim() || ''
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.mensaje || 'No se pudo registrar préstamo.');
      await cargarInventarioCompetencia();
      setFormPrestamo({ boxPrestamo: '', cantidad: '', notas: '' });
      setPrestamoAbiertoId(null);
    } catch (err) {
      alert(err.message || 'Error registrando préstamo.');
    }
  };

  const agregarPrestamoManual = async () => {
    const cantidad = Number(formPrestamoManual.cantidad);
    if (!formPrestamoManual.boxPrestamo.trim() || !formPrestamoManual.nombreEquipo.trim() || cantidad <= 0) {
      alert('Completa Box de préstamo, nombre del equipo/material y cantidad válida.');
      return;
    }

    try {
      const res = await fetch(`${COMPETENCIAS_ENDPOINT}/${id}/inventario/prestamos-manuales`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          boxPrestamo: formPrestamoManual.boxPrestamo.trim(),
          nombreEquipo: formPrestamoManual.nombreEquipo.trim(),
          cantidadPrestada: cantidad,
          notas: formPrestamoManual.notas?.trim() || ''
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.mensaje || 'No se pudo registrar préstamo manual.');
      await cargarInventarioCompetencia();
      setFormPrestamoManual({ boxPrestamo: '', nombreEquipo: '', cantidad: '', notas: '' });
    } catch (err) {
      alert(err.message || 'Error registrando préstamo manual.');
    }
  };

  const marcarPrestamoDevuelto = async (idMaterial, idPrestamo) => {
    if (!await window.wpConfirm('¿Marcar este préstamo como devuelto al prestador?')) return;

    try {
      const res = await fetch(`${COMPETENCIAS_ENDPOINT}/${id}/inventario/prestamos/${idPrestamo}/devuelto`, {
        method: 'PUT'
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.mensaje || 'No se pudo marcar como devuelto.');
      await cargarInventarioCompetencia();
    } catch (err) {
      alert(err.message || 'Error al marcar devolución.');
    }
  };

  const marcarPrestamoManualDevuelto = async (idPrestamo) => {
    if (!await window.wpConfirm('¿Marcar este préstamo manual como devuelto al prestador?')) return;

    try {
      const res = await fetch(`${COMPETENCIAS_ENDPOINT}/${id}/inventario/prestamos/${idPrestamo}/devuelto`, {
        method: 'PUT'
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.mensaje || 'No se pudo marcar como devuelto.');
      await cargarInventarioCompetencia();
    } catch (err) {
      alert(err.message || 'Error al marcar devolución.');
    }
  };

  const guardarInventarioCompetencia = async () => {
    try {
      setGuardandoInventarioComp(true);
      await cargarInventarioCompetencia();
      alert('Inventario actualizado. Los cambios se guardan al instante en tablas.');
    } catch (err) {
      alert(err.message || 'Error actualizando inventario de competencia.');
    } finally {
      setGuardandoInventarioComp(false);
    }
  };

  const iniciarEdicionRequerido = (material) => {
    const idMaterial = material.idCompetenciaInventarioMaterial ?? material.id;
    const tienePrestamos = Array.isArray(material.prestamos) && material.prestamos.length > 0;
    const minimo = tienePrestamos ? (material.requerido ?? 1) : 1;
    setMaterialEditandoId(idMaterial);
    setCantidadRequeridaEdit(String(material.requerido ?? 0));
    setMinRequeridoEdit(minimo);
  };

  const cancelarEdicionRequerido = () => {
    setMaterialEditandoId(null);
    setCantidadRequeridaEdit('');
    setMinRequeridoEdit(1);
  };

  const guardarEdicionRequerido = async (idMaterial) => {
    const cantidad = Number(cantidadRequeridaEdit);
    if (!Number.isInteger(cantidad) || cantidad <= 0) {
      alert('Error: captura una cantidad requerida válida.');
      return;
    }
    if (cantidad < minRequeridoEdit) {
      alert(`No puedes reducir la cantidad requerida por debajo de ${minRequeridoEdit} mientras haya préstamos registrados.`);
      return;
    }

    try {
      const res = await fetch(`${COMPETENCIAS_ENDPOINT}/${id}/inventario/materiales/${idMaterial}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cantidadRequerida: cantidad })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.mensaje || 'No se pudo actualizar la cantidad requerida.');
      await cargarInventarioCompetencia();
      cancelarEdicionRequerido();
      alert('Cantidad requerida actualizada.');
    } catch (err) {
      alert(err.message || 'Error al actualizar cantidad requerida.');
    }
  };

  const cargarAuditoria = async () => {
    setCargandoAuditoria(true);
    try {
      const res = await fetch(`${COMPETENCIAS_ENDPOINT}/${id}/scores-globales`);
      setScoresAuditoria(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setCargandoAuditoria(false);
    }
  };

  const exportarDatosCSV = () => {
    const encabezados = [
      "Categoría", "Tipo", "Nombre Equipo/Atleta", "Box de Origen", "Estatus Pago",
      "Atleta: Nombre", "Atleta: Género", "Atleta: Talla Playera", "Atleta: Tipo Sangre",
      "Atleta: Correo", "Atleta: Teléfono", "Atleta: Fecha Nac."
    ];
    const filas = [];

    roster.forEach(cat => {
      const categoriaNombre = cat.categoriaNombre || cat.CategoriaNombre;
      const esEquipo = cat.esEquipo || cat.EsEquipo ? 'Equipo' : 'Individual';
      const equipos = cat.equipos || cat.Equipos || [];

      equipos.forEach(eq => {
        const nombreEquipo = eq.nombre || eq.Nombre || 'N/A';
        const box = eq.boxOrigen || eq.BoxOrigen || 'Independiente';
        const estatus = eq.estatusPago || eq.EstatusPago || 'Pendiente';
        const atletas = eq.atletas || eq.Atletas || [];

        atletas.forEach(atl => {
          filas.push([
            categoriaNombre, esEquipo, nombreEquipo, box, estatus,
            atl.nombreCompleto || atl.NombreCompleto || '',
            atl.genero || atl.Genero || '',
            atl.tallaPlayera || atl.TallaPlayera || '',
            atl.tipoSangre || atl.TipoSangre || '',
            atl.correo || atl.Correo || '',
            atl.telefono || atl.Telefono || '',
            atl.fechaNacimiento || atl.FechaNacimiento || ''
          ]);
        });
      });
    });

    if (filas.length === 0) return alert("No hay datos para exportar.");

    const csvContent = [
      encabezados.join(","),
      ...filas.map(fila => fila.map(campo => `"${String(campo).replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `BaseDeDatos_${comp.nombre.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const cambiarEstatusPago = async (idEquipo, nuevoEstatus) => {
    if (!await window.wpConfirm(`¿Marcar este pago como ${nuevoEstatus.toUpperCase()}?`)) return;
    setProcesandoPago(true);
    try {
      const res = await fetch(`${COMPETENCIAS_ENDPOINT}/equipos/${idEquipo}/pago`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estatus: nuevoEstatus })
      });
      if (res.ok) {
        cargarRoster();
        cargarDatos();
      }
    } catch (err) {
      alert('Error al cambiar estatus.');
    } finally {
      setProcesandoPago(false);
    }
  };

  const eliminarRegistro = async (idEquipo) => {
    if (!await window.wpConfirm("🚨 ¿ESTÁS SEGURO? Esto borrará al atleta y liberará su lugar.")) return;
    setProcesandoPago(true);
    try {
      const res = await fetch(`${COMPETENCIAS_ENDPOINT}/equipos/${idEquipo}`, { method: 'DELETE' });
      if (res.ok) {
        cargarRoster();
        cargarDatos();
      }
    } catch (err) {
      alert("Error de conexión.");
    } finally {
      setProcesandoPago(false);
    }
  };

  const corregirScore = async (idWod, idEquipo, scoreActual) => {
    const nuevoScore = await window.wpPrompt("Ingresa el SCORE CORRECTO para este equipo:", scoreActual);
    if (nuevoScore === null || nuevoScore === scoreActual) return;
    try {
      const res = await fetch(`${COMPETENCIAS_ENDPOINT}/wods/${idWod}/scores`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idEquipoComp: idEquipo,
          resultado: nuevoScore,
          nombreJuez: "Coach Liz (Corrección Admin)"
        })
      });
      if (res.ok) {
        alert("¡Score corregido!");
        cargarAuditoria();
      }
    } catch (err) {
      alert("Error de conexión.");
    }
  };

  const cambiarEstatusScore = async (idPuntuacion, nuevoEstatus) => {
    if (!await window.wpConfirm(`¿Marcar este score como ${nuevoEstatus.toUpperCase()}?`)) return;
    try {
      const res = await fetch(`${COMPETENCIAS_ENDPOINT}/wods/scores/${idPuntuacion}/estatus`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estatus: nuevoEstatus })
      });
      if (res.ok) cargarAuditoria();
    } catch (err) {
      alert("Error de conexión.");
    }
  };

  const togglePodioCiego = async () => {
    const estadoActual = comp.podioCiego || comp.PodioCiego;
    const nuevoEstado = !estadoActual;
    if (!await window.wpConfirm(nuevoEstado ? "🚨 ¿Activar MODO SUSPENSO?" : "🏆 ¿Apagar Modo Suspenso?")) return;
    try {
      const res = await fetch(`${COMPETENCIAS_ENDPOINT}/${id}/podio-ciego`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: nuevoEstado })
      });
      if (res.ok) {
        setComp({ ...comp, podioCiego: nuevoEstado, PodioCiego: nuevoEstado });
      }
    } catch (err) {
      alert("Error de conexión.");
    }
  };

  const guardarNuevaCategoria = async (e) => {
    e.preventDefault();
    setProcesandoCat(true);
    try {
      const res = await fetch(`${COMPETENCIAS_ENDPOINT}/${id}/categorias`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formCat)
      });
      if (res.ok) {
        setModoEdicion(false);
        cargarDatos();
      }
    } catch (err) {
      alert("Error de conexión.");
    } finally {
      setProcesandoCat(false);
    }
  };

  const eliminarCategoria = async (idCategoria) => {
    if (!await window.wpConfirm('¿Seguro que deseas eliminar esta categoría?')) return;
    try {
      const res = await fetch(`${COMPETENCIAS_ENDPOINT}/categorias/${idCategoria}`, { method: 'DELETE' });
      if (res.ok) {
        cargarDatos();
      } else {
        alert('Error al eliminar. Revisa si tiene inscritos.');
      }
    } catch (err) {
      alert('Error de conexión.');
    }
  };

  // (El alta/edición/clonado de WODs vive ahora en ConstructorWodComp)

  const eliminarWod = async (idWod) => {
    if (!await window.wpConfirm("¿Seguro que deseas eliminar este entrenamiento?")) return;
    try {
      const res = await fetch(`${COMPETENCIAS_ENDPOINT}/wods/${idWod}`, { method: 'DELETE' });
      if (res.ok) cargarWods();
    } catch (err) {
      alert("Error de conexión.");
    }
  };

  const guardarContenido = async (tipo) => {
    setGuardando(true);
    const payloadParametros = tablaEstandares.length > 0 ? JSON.stringify(tablaEstandares) : parametros;
    try {
      const res = await fetch(`${COMPETENCIAS_ENDPOINT}/${id}/contenido`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cartaResponsiva: carta,
          parametrosEstandares: payloadParametros,
          registroGastos: JSON.stringify(gastos),
          reglamento,
          anuncios,
          heatsConfig: JSON.stringify(configuracionHeats)
        })
      });
      if (res.ok) alert(`¡${tipo} guardado! ✅`);
    } catch (err) {
      alert("Error de conexión.");
    } finally {
      setGuardando(false);
    }
  };

  const guardarGastosDB = async () => {
    setGuardandoGastos(true);
    const payloadParametros = tablaEstandares.length > 0 ? JSON.stringify(tablaEstandares) : parametros;
    try {
      const res = await fetch(`${COMPETENCIAS_ENDPOINT}/${id}/contenido`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cartaResponsiva: carta,
          parametrosEstandares: payloadParametros,
          registroGastos: JSON.stringify(gastos),
          reglamento,
          anuncios,
          heatsConfig: JSON.stringify(configuracionHeats)
        })
      });
      if (res.ok) alert(`¡Libro de egresos guardado! 💰`);
    } catch (err) {
      alert("Error de conexión.");
    } finally {
      setGuardandoGastos(false);
    }
  };

  const guardarPortal = async () => { guardarContenido('Portal Público'); };

  const guardarFechas = async (e) => {
    e.preventDefault();

    // 1. Validar fechas de inscripción
    if (fechas.inicioIns && fechas.finIns) {
      if (new Date(fechas.inicioIns) >= new Date(fechas.finIns)) {
        return alert("El inicio de inscripciones debe ser antes del cierre de inscripciones.");
      }
    }

    // 2. El Día 1 no puede ser ANTES del cierre de inscripciones. El MISMO día sí se permite
    //    (p.ej. cierras inscripciones en la mañana y compites en la tarde) — antes forzaba +1 día y confundía.
    if (fechas.finIns && fechas.inicioComp) {
      const fechaFinIns = new Date(fechas.finIns); fechaFinIns.setHours(0, 0, 0, 0);
      const fechaInicioC = new Date(fechas.inicioComp); fechaInicioC.setHours(0, 0, 0, 0);
      if (fechaInicioC < fechaFinIns) {
        return alert("El Día 1 de la competencia no puede ser antes del cierre de inscripciones.");
      }
    }

    // 3. Validar duración de la competencia
    if (fechas.inicioComp && fechas.finComp) {
      const fechaInicioC = new Date(fechas.inicioComp);
      const fechaFinC = new Date(fechas.finComp);
      fechaInicioC.setHours(0, 0, 0, 0);
      fechaFinC.setHours(0, 0, 0, 0);

      if (fechaFinC < fechaInicioC) {
        return alert("El fin de la competencia no puede ser antes del Día 1.");
      }

      // 4. Validar límite de días según el plan
      const limiteDias = comp?.diasPlanSaaS || 1; // Por si es null o no existe, asume 1
      const diasDuracion = ((fechaFinC - fechaInicioC) / (1000 * 60 * 60 * 24)) + 1; // +1 porque el mismo día cuenta como 1 día de evento

      if (diasDuracion > limiteDias) {
        return alert(`Tu plan actual solo permite competencias de hasta ${limiteDias} día(s). Has seleccionado una duración de ${diasDuracion} días.`);
      }
    }

    try {
      const res = await fetch(`${COMPETENCIAS_ENDPOINT}/${id}/fechas`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fechaInicioInscripcion: fechas.inicioIns || null,
          fechaFinInscripcion: fechas.finIns || null,
          // El evento lleva HORA real: combinamos fecha + hora (auto-status y heats la usan).
          fechaInicio: fechas.inicioComp ? `${fechas.inicioComp}T${fechas.horaInicioComp || '08:00'}:00` : null,
          fechaFin: fechas.finComp ? `${fechas.finComp}T${fechas.horaFinComp || '18:00'}:00` : null
        })
      });
      if (res.ok) {
        alert("¡Calendario actualizado! 📅");
        await cargarDatos(); // 🔄 Recarga para que el auto-status corra inmediatamente
      } else {
        const errData = await res.json();
        alert(errData.mensaje || "Error al actualizar las fechas.");
      }
    } catch (err) {
      alert("Error de conexión al guardar el calendario.");
    }
  };

  // Zona horaria del evento (solo afecta el auto-status "En Vivo"/"Historial"; el display de horas es independiente).
  const guardarZona = async (offset) => {
    setZonaOffset(offset);
    try {
      await fetch(`${COMPETENCIAS_ENDPOINT}/${id}/zona-horaria`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offset }),
      });
    } catch { /* el cambio local ya aplicó; se reintenta al recargar */ }
  };

  // Funciones de la Tabla de Estándares
  const agregarFilaEstandar = () => setTablaEstandares([...tablaEstandares, { movimiento: '', requisitos: {} }]);
  const actualizarFilaEstandar = (index, campo, valor) => { const nueva = [...tablaEstandares]; nueva[index][campo] = valor; setTablaEstandares(nueva); };
  const actualizarRequisito = (index, idCategoria, genero, valor) => {
    const nueva = [...tablaEstandares];
    if (!nueva[index].requisitos) nueva[index].requisitos = {};
    if (typeof nueva[index].requisitos[idCategoria] !== 'object' || nueva[index].requisitos[idCategoria] === null) {
      const valorViejo = nueva[index].requisitos[idCategoria] || '';
      nueva[index].requisitos[idCategoria] = { h: valorViejo, m: valorViejo };
    }
    nueva[index].requisitos[idCategoria][genero] = valor;
    setTablaEstandares(nueva);
  };
  const quitarFilaEstandar = (index) => setTablaEstandares(tablaEstandares.filter((_, i) => i !== index));

  const agregarGasto = () => {
    if (!nuevoGasto.descripcion || !nuevoGasto.monto) return;
    setGastos([...gastos, { id: Date.now(), descripcion: nuevoGasto.descripcion, monto: Number(nuevoGasto.monto) }]);
    setNuevoGasto({ descripcion: '', monto: '' });
  };
  const eliminarGasto = (idGasto) => setGastos(gastos.filter(g => g.id !== idGasto));

  const getTipoColor = (tipo) => {
    if (tipo === 'AMRAP') return 'danger';
    if (tipo === 'For Time') return 'info';
    return 'warning text-dark';
  };

  const getTipoBadgeClass = (tipo) => {
    if (tipo === 'AMRAP') return 'amrap';
    if (tipo === 'For Time') return 'fortime';
    return 'peso';
  };

  const getTipoIcon = (tipo) => {
    if (tipo === 'For Time') return 'fa-stopwatch';
    if (tipo === 'AMRAP') return 'fa-redo';
    return 'fa-weight-hanging';
  };

  // UI CONFIG MENU
  const menuItems = [
    { id: 'dashboard', label: 'Resumen', icon: 'fa-chart-line' },
    { id: 'inscritos', label: 'Atletas Inscritos', icon: 'fa-users' },
    { id: 'portal', label: 'Portal Público', icon: 'fa-globe' },
    { id: 'inventario-comp', label: 'Inventario Competencia', icon: 'fa-warehouse' },
    { id: 'heats', label: 'Logística Heats', icon: 'fa-stopwatch' },
    { id: 'legal', label: 'Carta Responsiva', icon: 'fa-file-signature' },
    { id: 'parametros', label: 'Parámetros', icon: 'fa-list-ul' },
    { id: 'wods', label: 'Diseño de WODs', icon: 'fa-dumbbell' },
    { id: 'jueces', label: 'Gestión de Jueces', icon: 'fa-gavel' },
    { id: 'staff', label: 'Staff Operativo', icon: 'fa-users-cog' },
    { id: 'auditoria', label: 'Auditoría Scores', icon: 'fa-shield-alt' }
  ];

  const textoBusquedaInventario = busquedaInventario.trim().toLowerCase();
  const materialesFiltrados = (inventarioComp.materiales || []).filter((material) => {
    if (filtroTipoInventario === 'box' && !material.idHerramienta) return false;
    if (filtroTipoInventario === 'externo' && material.idHerramienta) return false;
    if (!textoBusquedaInventario) return true;

    const nombreMaterial = String(material.nombre || '').toLowerCase();
    const notasMaterial = String(material.notasHerramienta || '').toLowerCase();
    const prestamos = Array.isArray(material.prestamos) ? material.prestamos : [];

    const coincideEnPrestamos = prestamos.some((p) => {
      const boxPrestamo = String(p.boxPrestamo || '').toLowerCase();
      const nombreEquipo = String(p.nombreEquipo || '').toLowerCase();
      const notas = String(p.notas || '').toLowerCase();
      return (
        boxPrestamo.includes(textoBusquedaInventario) ||
        nombreEquipo.includes(textoBusquedaInventario) ||
        notas.includes(textoBusquedaInventario)
      );
    });

    return (
      nombreMaterial.includes(textoBusquedaInventario) ||
      notasMaterial.includes(textoBusquedaInventario) ||
      coincideEnPrestamos
    );
  });

  const prestamosManualesFiltrados = (inventarioComp.prestamosManuales || []).filter((p) => {
    if (filtroTipoInventario === 'box') return false;
    if (!textoBusquedaInventario) return true;
    const boxPrestamo = String(p.boxPrestamo || '').toLowerCase();
    const nombreEquipo = String(p.nombreEquipo || '').toLowerCase();
    const notas = String(p.notas || '').toLowerCase();
    return (
      boxPrestamo.includes(textoBusquedaInventario) ||
      nombreEquipo.includes(textoBusquedaInventario) ||
      notas.includes(textoBusquedaInventario)
    );
  });

  const herramientaSeleccionada = herramientasBox.find(h => {
    const idH = String(h.idHerramienta ?? h.IdHerramienta ?? '');
    return idH === String(formMaterialComp.idHerramienta || '');
  });

  const herramientasFiltradas = useMemo(() => {
    const norm = (s) => (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    const comp = (s) => norm(s).replace(/\s+/g, '');

    return herramientasBox.filter(h => {
      const idH = h.idHerramienta ?? h.IdHerramienta;
      const yaEnComp = (inventarioComp.materiales || []).some(m => (m.idHerramienta ?? m.IdHerramienta) === idH);
      if (yaEnComp) return false;

      if (filtroUnidadHerramienta !== 'todos') {
        if (filtroUnidadHerramienta === 'kg'  && !(h.esKilo    ?? h.EsKilo))    return false;
        if (filtroUnidadHerramienta === 'lb'  && !(h.esLibra   ?? h.EsLibra))   return false;
        if (filtroUnidadHerramienta === 'm'   && !(h.esMetro   ?? h.EsMetro))   return false;
        if (filtroUnidadHerramienta === 'maq' && !(h.esMaquina ?? h.EsMaquina)) return false;
      }

      if (filtroTipoHerramienta !== 'todos') {
        if (filtroTipoHerramienta === 'barra'      && !(h.esBarra      ?? h.EsBarra))      return false;
        if (filtroTipoHerramienta === 'bumper'     && !(h.esBumpers    ?? h.EsBumpers))    return false;
        if (filtroTipoHerramienta === 'kettlebell' && !(h.esKettlebell ?? h.EsKettlebell)) return false;
        if (filtroTipoHerramienta === 'mancuerna'  && !(h.esMancuerna  ?? h.EsMancuerna))  return false;
        if (filtroTipoHerramienta === 'pelota'     && !(h.esPelota     ?? h.EsPelota))     return false;
        if (filtroTipoHerramienta === 'cajon'      && !(h.esCajon      ?? h.EsCajon))      return false;
        if (filtroTipoHerramienta === 'otra'       && !(h.esOtra       ?? h.EsOtra))       return false;
      }

      const texto = busquedaHerramienta.trim();
      if (!texto) return true;

      const terminoNorm = norm(texto);
      const terminoComp = comp(texto);
      const palabras = terminoNorm.split(/\s+/).filter(Boolean);

      const nombre = norm(h.nombre ?? h.Nombre ?? '');
      const notas  = norm(h.descripcionAdicional ?? h.DescripcionAdicional ?? '');
      const medidaStr = String(h.medida ?? h.Medida ?? 0);
      const unidadTexto = norm([
        (h.esKilo    ?? h.EsKilo)    ? 'kilo kg kilogramo kilogramos' : '',
        (h.esLibra   ?? h.EsLibra)   ? 'libra lb lbs libras'          : '',
        (h.esMetro   ?? h.EsMetro)   ? 'metro metros'                  : '',
        (h.esMaquina ?? h.EsMaquina) ? 'maquina'                       : '',
      ].join(' '));
      const tipoTexto = norm([
        (h.esBarra      ?? h.EsBarra)      ? 'barra'                       : '',
        (h.esBumpers    ?? h.EsBumpers)    ? 'bumper disco discos bumpers'  : '',
        (h.esKettlebell ?? h.EsKettlebell) ? 'kettlebell'                   : '',
        (h.esMancuerna  ?? h.EsMancuerna)  ? 'mancuerna mancuernas'         : '',
        (h.esCajon      ?? h.EsCajon)      ? 'cajon cajón'                  : '',
        (h.esOtra       ?? h.EsOtra)       ? 'otra otro equipo'             : '',
        (h.esPelota     ?? h.EsPelota)     ? 'pelota'                       : '',
      ].join(' '));

      const todo = `${nombre} ${notas} ${medidaStr} ${unidadTexto} ${tipoTexto}`;
      const porPalabras = palabras.every(p => todo.includes(p));

      const nombreComp = comp(h.nombre ?? h.Nombre ?? '');
      const notasComp  = comp(h.descripcionAdicional ?? h.DescripcionAdicional ?? '');
      const sinEspacios = nombreComp.includes(terminoComp) || notasComp.includes(terminoComp);

      return porPalabras || sinEspacios;
    });
  }, [herramientasBox, inventarioComp.materiales, busquedaHerramienta, filtroUnidadHerramienta, filtroTipoHerramienta]);

  if (loading) {
    return (
      <div className="cd-container d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
        <AtletifyLoader />
      </div>
    );
  }

  if (!comp) {
    return (
      <div className="cd-container">
        <div className="cd-content">
          <div className="cd-card cd-card--danger">
            <div className="cd-card-body text-center py-5">
              <i className="fas fa-exclamation-triangle fs-1 mb-3" style={{ color: 'var(--primary)', opacity: 0.4 }}></i>
              <p className="cd-section-h">Competencia no encontrada.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="cd-container">

      {/* ── NAVBAR ── */}
      <nav className="cd-nav">
        <div className="cd-nav-left">
          <BackButton />
          <div className="cd-nav-icono">
            <i className="fas fa-trophy"></i>
          </div>
          <div style={{ minWidth: 0 }}>
            <p className="cd-nav-titulo">{comp.nombre}</p>
            <p className="cd-nav-sub">Mesa de Control</p>
          </div>
        </div>
        <div className="cd-nav-right">
          <span className="cd-nav-tab-actual">
            <i className={`fas ${menuItems.find(m => m.id === tabActiva)?.icon}`}></i>
            <span className="d-none d-sm-inline">{menuItems.find(m => m.id === tabActiva)?.label}</span>
          </span>
          <button
            className={`cd-menu-trigger${sideMenuOpen ? ' cd-menu-trigger--open' : ''}`}
            onClick={() => setSideMenuOpen(v => !v)}
            aria-label={sideMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
            type="button"
          >
            <span className="cd-menu-trigger-label">{sideMenuOpen ? 'Cerrar' : 'Menú'}</span>
            <span className="cd-menu-trigger-icon" aria-hidden="true">
              <span className="cd-menu-trigger-bar"></span>
              <span className="cd-menu-trigger-bar cd-menu-trigger-bar--v"></span>
            </span>
          </button>
        </div>
      </nav>

      {/* ── CONTENIDO ── */}
      <div className="cd-content">

        {comp.saaS_Estatus === 'Configurando' ? (
          <div className="d-flex flex-column align-items-center justify-content-center h-100 text-center p-5">
            <i className="fas fa-lock fs-1 text-warning mb-4"></i>
            <h2 className="text-white mb-3">Módulo Inactivo</h2>
            <p className="text-secondary mb-4" style={{ maxWidth: '500px' }}>
              Para poder visualizar y gestionar los detalles de esta competencia, necesitas contratar un plan base o ingresar un token de activación.
            </p>
            <button className="btn btn-warning fw-bold px-4 rounded-pill" onClick={() => setMostrarPlanes(true)}>
              <i className="fas fa-credit-card me-2"></i>Contratar Evento
            </button>
            <PlanesModal 
              isOpen={mostrarPlanes} 
              onClose={() => setMostrarPlanes(false)} 
              idCompetencia={comp.idCompetencia || comp.IdCompetencia} 
              onSuccess={() => {
                setMostrarPlanes(false);
                cargarDatos();
              }} 
            />
          </div>
        ) : (
          <>
        {/* ========================================================= */}
        {/* TAB: DASHBOARD FINANCIERO */}
        {/* ========================================================= */}
        {tabActiva === 'dashboard' && (() => {
          let ingresosReales = 0, ingresosEsperados = 0, totalAtletasFisicos = 0, pagosPendientes = 0;
          let tallasPlayerasList = { XS: [], S: [], M: [], L: [], XL: [] };

          roster.forEach(catRoster => {
            const catInfo = comp.categorias?.find(c => (c.idCategoriaComp || c.IdCategoriaComp) === (catRoster.idCategoriaComp || catRoster.IdCategoriaComp));
            const costoCat = catInfo ? (catInfo.costo || catInfo.Costo || 0) : 0;
            const equipos = catRoster.equipos || catRoster.Equipos || [];

            equipos.forEach(eq => {
              const estatus = eq.estatusPago || eq.EstatusPago;
              ingresosEsperados += costoCat;

              if (estatus === 'Aprobado') ingresosReales += costoCat;
              else if (estatus === 'Pendiente') pagosPendientes++;

              const atletas = eq.atletas || eq.Atletas || [];
              totalAtletasFisicos += atletas.length;

              if (estatus === 'Aprobado') {
                atletas.forEach(a => {
                  let talla = (a.tallaPlayera || a.TallaPlayera || '').toUpperCase().trim();
                  // Mapeo retrocompatible por si hay registros viejos en la DB
                  if (talla === 'CH') talla = 'S';
                  if (talla === 'G') talla = 'L';
                  if (talla === 'XG') talla = 'XL';
                  
                  if (tallasPlayerasList[talla] !== undefined) {
                    tallasPlayerasList[talla].push({
                      nombre: `${a.nombreCompleto || a.NombreCompleto} ${a.apellidos || a.Apellidos || ''}`.trim(),
                      categoria: catInfo ? (catInfo.nombre || catInfo.Nombre) : 'Desconocida',
                      equipo: eq.nombre || eq.Nombre
                    });
                  }
                });
              }
            });
          });

          // Agregar tallas de los jueces a la Orden de Imprenta
          juecesComp.forEach(j => {
            if (j.activo) {
              let talla = (j.tallaPlayera || j.TallaPlayera || '').toUpperCase().trim();
              if (talla === 'CH') talla = 'S';
              if (talla === 'G') talla = 'L';
              if (talla === 'XG') talla = 'XL';
              if (tallasPlayerasList[talla] !== undefined) {
                tallasPlayerasList[talla].push({
                  nombre: `${j.nombreCompleto || j.NombreCompleto} ${j.apellidos || j.Apellidos || ''}`.trim(),
                  categoria: 'Juez',
                  equipo: '-'
                });
              }
            }
          });

          // Agregar tallas del staff operativo a la Orden de Imprenta
          staffComp.forEach(s => {
            if (s.activo) {
              let talla = (s.tallaPlayera || s.TallaPlayera || '').toUpperCase().trim();
              if (talla === 'CH') talla = 'S';
              if (talla === 'G') talla = 'L';
              if (talla === 'XG') talla = 'XL';
              if (tallasPlayerasList[talla] !== undefined) {
                tallasPlayerasList[talla].push({
                  nombre: `${s.nombre || s.Nombre} ${s.apellidos || s.Apellidos || ''}`.trim(),
                  categoria: 'Staff Operativo',
                  equipo: '-'
                });
              }
            }
          });

          const totalGastos = gastos.reduce((acc, curr) => acc + Number(curr.monto), 0);
          const utilidadNeta = ingresosReales - totalGastos;
          const porcentajeRecaudado = ingresosEsperados > 0 ? Math.round((ingresosReales / ingresosEsperados) * 100) : 0;

          return (
            <div className="cd-tab-fade">
              <div className="cd-section-header">
                <div>
                  <h2 className="cd-section-h">Centro de Mando</h2>
                  <p className="cd-section-sub">Estadísticas en tiempo real.</p>
                </div>
                <div className="cd-section-actions">
                  <button className="cd-btn cd-btn--outline cd-btn--sm" onClick={cargarRoster}>
                    <i className="fas fa-sync-alt"></i>Actualizar
                  </button>
                </div>
              </div>

              {/* KPI Cards */}
              <div className="row g-3 mb-4">
                <div className="col-12 col-md-6 col-xl-4">
                  <div className="cd-kpi-card cd-kpi-card--success">
                    <div className="cd-kpi-top">
                      <p className="cd-kpi-label cd-kpi-label--success">Ingresos Aprobados</p>
                      <i className="fas fa-money-bill-wave cd-kpi-icono cd-kpi-icono--success"></i>
                    </div>
                    <div className="cd-kpi-valor">${ingresosReales.toLocaleString()}</div>
                    <p className="cd-kpi-desc">De ${ingresosEsperados.toLocaleString()} proyectados</p>
                    <div className="cd-progress-track">
                      <div className="cd-progress-fill" style={{ width: `${porcentajeRecaudado}%` }}></div>
                    </div>
                  </div>
                </div>

                <div className="col-12 col-md-6 col-xl-4">
                  <div className="cd-kpi-card cd-kpi-card--info">
                    <div className="cd-kpi-top">
                      <p className="cd-kpi-label cd-kpi-label--info">Atletas en Arena</p>
                      <i className="fas fa-users cd-kpi-icono cd-kpi-icono--info"></i>
                    </div>
                    <div className="cd-kpi-valor">{totalAtletasFisicos}</div>
                    <p className="cd-kpi-desc">Competidores totales</p>
                  </div>
                </div>

                <div className="col-12 col-md-12 col-xl-4">
                  <div className="cd-kpi-card cd-kpi-card--warning">
                    <div className="cd-kpi-top">
                      <p className="cd-kpi-label cd-kpi-label--warning">Atención Requerida</p>
                      <i className="fas fa-exclamation-triangle cd-kpi-icono cd-kpi-icono--warning"></i>
                    </div>
                    {pagosPendientes > 0 ? (
                      <>
                        <div className="cd-kpi-valor">{pagosPendientes}</div>
                        <p className="cd-kpi-desc mb-3">Pagos pendientes de revisar</p>
                        <button onClick={() => navigate(`/admin-competencias/roster/${id}`)} className="cd-btn cd-btn--warning-solid cd-btn--sm w-100">
                          IR A REVISAR
                        </button>
                      </>
                    ) : (
                      <div className="d-flex flex-column align-items-center justify-content-center flex-grow-1 py-2">
                        <i className="fas fa-check-circle fs-1 mb-2" style={{ color: 'var(--success)', opacity: 0.55 }}></i>
                        <p className="cd-kpi-desc fw-bold">Todo al día</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Gastos y Utilidad */}
              <div className="row g-4 mb-4">
                <div className="col-lg-8">
                  <div className="cd-card cd-card--danger h-100">
                    <div className="cd-card-header cd-card-header--danger">
                      <span className="cd-card-titulo cd-card-titulo--danger">
                        <i className="fas fa-file-invoice-dollar"></i>Egresos
                      </span>
                      <BotonSeguro onClick={guardarGastosDB} disabled={guardandoGastos} className="cd-btn cd-btn--primary cd-btn--sm" textoProcesando="Guardando...">
                        Guardar Gastos
                      </BotonSeguro>
                    </div>
                    <div className="cd-card-body">
                      <div className="d-flex flex-wrap gap-2 mb-3 cd-gasto-add">
                        <input
                          type="text"
                          className="cd-input"
                          style={{ flex: '1 1 160px' }}
                          placeholder="Ej: Jueces..."
                          value={nuevoGasto.descripcion}
                          onChange={e => setNuevoGasto({ ...nuevoGasto, descripcion: e.target.value })}
                        />
                        <input
                          type="number"
                          className="cd-input cd-input--monto"
                          style={{ maxWidth: '120px' }}
                          placeholder="Monto $"
                          value={nuevoGasto.monto}
                          onChange={e => setNuevoGasto({ ...nuevoGasto, monto: e.target.value })}
                        />
                        <button onClick={agregarGasto} className="cd-btn cd-btn--info" style={{ flexShrink: 0 }}>
                          <i className="fas fa-plus"></i>
                        </button>
                      </div>
                      <div className="cd-gasto-list">
                        {gastos.map(g => (
                          <div key={g.id} className="cd-gasto-row">
                            <span className="cd-gasto-desc">
                              <i className="fas fa-minus-circle" style={{ color: 'var(--danger)', fontSize: '0.8rem' }}></i>
                              {g.descripcion}
                            </span>
                            <div className="d-flex align-items-center gap-3">
                              <span className="cd-gasto-monto">${Number(g.monto).toLocaleString()}</span>
                              <button onClick={() => eliminarGasto(g.id)} className="cd-btn cd-btn--ghost">
                                <i className="fas fa-trash"></i>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="col-lg-4">
                  <div className={`cd-utilidad-card ${utilidadNeta >= 0 ? 'cd-utilidad-card--pos' : 'cd-utilidad-card--neg'}`}>
                    <p className="cd-utilidad-label">Utilidad Neta Libre</p>
                    <div className={`cd-utilidad-valor ${utilidadNeta >= 0 ? '' : ''}`} style={{ color: utilidadNeta >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                      ${utilidadNeta.toLocaleString()}
                    </div>
                    <div className="cd-utilidad-breakdown">
                      <div className="text-start">
                        <span className="cd-utilidad-item-lbl">Ingresos</span>
                        <span className="cd-utilidad-item-val" style={{ color: 'var(--success)' }}>${ingresosReales.toLocaleString()}</span>
                      </div>
                      <div className="text-end">
                        <span className="cd-utilidad-item-lbl">Egresos</span>
                        <span className="cd-utilidad-item-val" style={{ color: 'var(--danger)' }}>-${totalGastos.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* B2C CONFIGURACIÓN FINANCIERA */}
              <div className="cd-section-header mt-4" style={{ marginBottom: '1rem' }}>
                <span className="cd-card-titulo cd-card-titulo--info">
                  <i className="fas fa-cog"></i>Configuración de Pagos B2C
                </span>
                <BotonSeguro onClick={guardarConfiguracionFinanciera} disabled={guardandoConfig} className="cd-btn cd-btn--primary cd-btn--sm" textoProcesando="Guardando...">
                  Guardar Configuración
                </BotonSeguro>
              </div>
              <div className="cd-card mb-4">
                <div className="cd-card-body">
                  <div className="row g-4">
                    <div className="col-12 col-md-6">
                      <p className="cd-sublabel-header">
                        <i className="fas fa-wallet" style={{ color: 'var(--accent-cool)' }} />Métodos Aceptados
                      </p>

                      <label className="cd-switch-row" htmlFor="swPagosEnLinea">
                        <div>
                          <p className="cd-switch-label">Pagos en Línea (Stripe)</p>
                          <p className="cd-switch-hint">Recomendado para asegurar cupos al instante.</p>
                        </div>
                        <input className="cd-switch-input form-check-input" type="checkbox" role="switch" id="swPagosEnLinea"
                               checked={configFinanciera.aceptarPagosEnLinea}
                               onChange={(e) => setConfigFinanciera({...configFinanciera, aceptarPagosEnLinea: e.target.checked})} />
                      </label>

                      <label className="cd-switch-row" htmlFor="swTransferencias">
                        <div>
                          <p className="cd-switch-label">Transferencias / Depósitos</p>
                          <p className="cd-switch-hint">Requiere validación manual del comprobante.</p>
                        </div>
                        <input className="cd-switch-input form-check-input" type="checkbox" role="switch" id="swTransferencias"
                               checked={configFinanciera.aceptarTransferencias}
                               onChange={(e) => setConfigFinanciera({...configFinanciera, aceptarTransferencias: e.target.checked})} />
                      </label>

                      <label className="cd-switch-row" htmlFor="swEfectivo">
                        <div>
                          <p className="cd-switch-label">Efectivo</p>
                          <p className="cd-switch-hint">Los atletas pagan físicamente en la recepción del box.</p>
                        </div>
                        <input className="cd-switch-input form-check-input" type="checkbox" role="switch" id="swEfectivo"
                               checked={configFinanciera.aceptarEfectivo}
                               onChange={(e) => setConfigFinanciera({...configFinanciera, aceptarEfectivo: e.target.checked})} />
                      </label>
                    </div>

                    <div className="col-12 col-md-6">
                      <p className="cd-sublabel-header">
                        <i className="fas fa-percentage" style={{ color: 'var(--accent)' }} />Comisiones y Anticipos
                      </p>

                      <label className="cd-label mb-2 d-block">¿Quién paga la comisión de Stripe?</label>
                      <div className="d-flex gap-2 mb-1 flex-wrap">
                        <label className={`cd-radio-card${!configFinanciera.absorberComisionTarjeta ? ' cd-radio-card--checked' : ''}`} htmlFor="comisionAtleta">
                          <input type="radio" name="absorberComision" id="comisionAtleta"
                                 checked={!configFinanciera.absorberComisionTarjeta}
                                 onChange={() => setConfigFinanciera({...configFinanciera, absorberComisionTarjeta: false})} />
                          <p className="cd-radio-card-text">El atleta<br/><span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Se suma al total</span></p>
                        </label>
                        <label className={`cd-radio-card${configFinanciera.absorberComisionTarjeta ? ' cd-radio-card--checked' : ''}`} htmlFor="comisionBox">
                          <input type="radio" name="absorberComision" id="comisionBox"
                                 checked={configFinanciera.absorberComisionTarjeta}
                                 onChange={() => setConfigFinanciera({...configFinanciera, absorberComisionTarjeta: true})} />
                          <p className="cd-radio-card-text">El organizador<br/><span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Se descuenta de tu ingreso</span></p>
                        </label>
                      </div>
                      <small style={{ color: 'var(--text-muted)', fontSize: '0.7rem', display: 'block', marginBottom: '1.25rem' }}>
                        <i className="fas fa-info-circle me-1" />No se puede cambiar si ya hay equipos inscritos.
                      </small>

                      <label className="cd-label mb-2 d-block">Apartado Mínimo Obligatorio (Efectivo/Transferencia)</label>
                      <div className="cd-prefix-group mb-1">
                        <span className="cd-prefix">$</span>
                        <input type="number" className="cd-input"
                               value={configFinanciera.montoMinimoAporte}
                               onFocus={e => e.target.select()}
                               onBlur={e => { if (e.target.value === '') setConfigFinanciera({...configFinanciera, montoMinimoAporte: 0}); }}
                               onChange={(e) => { if (e.target.value.length <= 6) setConfigFinanciera({...configFinanciera, montoMinimoAporte: e.target.value}); }}
                               min="0" max={999999} step="50" placeholder="0.00" />
                      </div>
                      <small style={{ color: 'var(--text-muted)', fontSize: '0.7rem', display: 'block' }}>
                        <i className="fas fa-lightbulb me-1" />Los pagos con tarjeta siempre requieren el total del equipo para minimizar comisiones de Stripe.
                      </small>
                    </div>
                  </div>
                </div>
              </div>

              {/* Imprenta */}
              <div className="cd-section-header mt-4" style={{ marginBottom: '1rem' }}>
                <span className="cd-card-titulo cd-card-titulo--danger">
                  <i className="fas fa-tshirt"></i>Orden para Imprenta
                </span>
              </div>
              <div className="cd-card">
                <div className="cd-card-body">
                  <div className="row g-3">
                    {Object.entries(tallasPlayerasList).map(([talla, lista]) => (
                      <div key={talla} className="col-6 col-sm-4 col-md-3">
                        <div className="cd-talla-card" onClick={() => setModalTallaVisible({ talla, lista })}>
                          <div className="cd-talla-label">Talla</div>
                          <div className="cd-talla-letra">{talla}</div>
                          <div>
                            <span className="cd-talla-count">{lista.length}</span>
                            <span className="cd-talla-unidad">uds.</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Modal de Detalle de Tallas */}
              {modalTallaVisible && createPortal(
                <div className="cd-herramienta-modal-overlay" onClick={() => setModalTallaVisible(null)}>
                  <div className="cd-herramienta-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
                    <div className="cd-herramienta-modal-head">
                      <div>
                        <p style={{ fontFamily: 'var(--font-heading-alt)', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, color: 'var(--primary)', margin: '0 0 0.1rem' }}>
                          Orden para Imprenta
                        </p>
                        <p className="cd-herramienta-modal-title m-0">
                          <i className="fas fa-tshirt me-2" style={{ color: 'var(--primary)' }} />
                          Talla {modalTallaVisible.talla}
                          <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.78rem', fontWeight: 400, textTransform: 'none', letterSpacing: 'normal', color: 'var(--text-muted)', marginLeft: '0.6rem' }}>
                            {modalTallaVisible.lista.length} {modalTallaVisible.lista.length === 1 ? 'atleta' : 'atletas'}
                          </span>
                        </p>
                      </div>
                      <button type="button" onClick={() => setModalTallaVisible(null)}
                        style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '0.78rem', flexShrink: 0, transition: 'all 0.18s' }}>
                        <i className="fas fa-times" />
                      </button>
                    </div>
                    <div style={{ overflowY: 'auto', maxHeight: '60vh' }}>
                      {modalTallaVisible.lista.length === 0 ? (
                        <div className="cd-empty" style={{ padding: '2.5rem 1.5rem' }}>
                          <i className="fas fa-tshirt" />
                          <p>Nadie ha solicitado esta talla.</p>
                        </div>
                      ) : (
                        <table className="cd-talla-table">
                          <thead>
                            <tr>
                              <th>Atleta</th>
                              <th>Categoría / Rol</th>
                              <th>Equipo</th>
                            </tr>
                          </thead>
                          <tbody>
                            {modalTallaVisible.lista.map((item, idx) => (
                              <tr key={idx}>
                                <td>{item.nombre}</td>
                                <td>
                                  <span className={`cd-talla-badge ${item.categoria === 'Juez / Staff' ? 'cd-talla-badge--staff' : 'cd-talla-badge--atleta'}`}>
                                    {item.categoria}
                                  </span>
                                </td>
                                <td style={{ color: 'var(--text-muted)' }}>{item.equipo}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                </div>,
                document.body
              )}
            </div>
          );
        })()}

        {/* ========================================================= */}
        {/* TAB: ATLETAS INSCRITOS */}
        {/* ========================================================= */}
        {tabActiva === 'inscritos' && (
          <div style={{ padding: '8px 4px' }}>
            <h3 style={{ fontFamily: 'var(--font-heading)', marginBottom: '4px' }}><i className="fas fa-users me-2"></i>Atletas Inscritos</h3>
            <p className="text-secondary" style={{ fontSize: '0.9rem' }}>Revisa los datos que enviaron los atletas (incluye correo y teléfono por si hay que corregir algo).</p>
            {(!roster || roster.length === 0) ? (
              <p className="text-secondary mt-3">Aún no hay categorías ni atletas inscritos.</p>
            ) : (
              roster.map(cat => {
                const atletas = (cat.equipos || []).flatMap(eq => (eq.atletas || []).map(a => ({ ...a, _equipo: eq.nombre, _estatus: eq.estatusPago })));
                return (
                  <div key={cat.idCategoriaComp} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px 16px', marginBottom: '16px' }}>
                    <h4 style={{ color: '#0f172a', fontWeight: 700, fontSize: '1.05rem', marginBottom: '10px' }}>
                      {cat.categoriaNombre}
                      <span className="badge bg-secondary ms-2">{atletas.length} {atletas.length === 1 ? 'atleta' : 'atletas'}</span>
                    </h4>
                    {atletas.length === 0 ? (
                      <p className="text-secondary mb-0" style={{ fontSize: '0.88rem' }}>Sin atletas inscritos todavía.</p>
                    ) : (
                      <div className="table-responsive">
                        <table className="table table-sm align-middle mb-0" style={{ fontSize: '0.85rem' }}>
                          <thead style={{ color: '#64748b' }}>
                            <tr>
                              {cat.esEquipo && <th>Equipo</th>}
                              <th>Atleta</th>
                              <th>Correo</th>
                              <th>Teléfono</th>
                              <th>Género</th>
                              <th>Nivel</th>
                              <th>Nac.</th>
                              <th>Talla</th>
                              <th>Sangre</th>
                              <th>Estatus</th>
                            </tr>
                          </thead>
                          <tbody>
                            {atletas.map((a, i) => (
                              <tr key={a.idAtletaComp || i}>
                                {cat.esEquipo && <td>{a._equipo}</td>}
                                <td style={{ fontWeight: 600, color: '#0f172a' }}>{a.nombreCompleto} {a.apellidos}</td>
                                <td style={{ wordBreak: 'break-all' }}>{a.correo || '—'}</td>
                                <td>{a.telefono || '—'}</td>
                                <td>{a.genero || '—'}</td>
                                <td>{a.nivelHabilidad || '—'}</td>
                                <td>{a.fechaNacimiento ? new Date(a.fechaNacimiento).toLocaleDateString('es-MX') : '—'}</td>
                                <td>{a.tallaPlayera || '—'}</td>
                                <td>{a.tipoSangre || '—'}</td>
                                <td><span className={`badge ${a._estatus === 'Aprobado' ? 'bg-success' : 'bg-warning text-dark'}`}>{a._estatus || 'Pendiente'}</span></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB: PORTAL PÚBLICO */}
        {/* ========================================================= */}
        {tabActiva === 'portal' && (() => {
          // Utilidades para calcular mínimos y máximos visuales
          const sumarDias = (fechaStr, dias) => {
            if (!fechaStr) return '';
            const [year, month, day] = fechaStr.split('-').map(Number);
            const d = new Date(year, month - 1, day);
            d.setDate(d.getDate() + dias);
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            return `${y}-${m}-${dd}`;
          };

          const hoyLocal = new Date();
          const hoyStr = `${hoyLocal.getFullYear()}-${String(hoyLocal.getMonth() + 1).padStart(2, '0')}-${String(hoyLocal.getDate()).padStart(2, '0')}`;
          
          const minApertura = hoyStr;
          const minCierre = sumarDias(fechas.inicioIns, 1);
          const maxApertura = fechas.finIns ? sumarDias(fechas.finIns, -1) : '';
          const minDia1 = sumarDias(fechas.finIns, 1);
          const minFin = fechas.inicioComp || '';
          
          // Si por alguna razón la competencia no tiene días guardados en BD (ej. se creó antes de la actualización), dejamos al menos 3 o 30 días para no bloquearlos.
          let maxDiasPermitidos = comp?.diasPlanSaaS;
          if (!maxDiasPermitidos || maxDiasPermitidos < 1) maxDiasPermitidos = 30; // fallback seguro

          const maxFin = fechas.inicioComp ? sumarDias(fechas.inicioComp, maxDiasPermitidos - 1) : '';

          return (
            <div className="cd-tab-fade">
              <div className="cd-section-header">
                <h2 className="cd-section-h">Portal Público</h2>
              </div>

              {/* Fechas */}
              <div className="cd-card cd-card--info mb-4">
                <div className="cd-card-header cd-card-header--info">
                  <span className="cd-card-titulo cd-card-titulo--info">
                    <i className="fas fa-calendar-alt"></i>Calendario
                  </span>
                </div>
                <div className="cd-card-body-lg">
                  {/* Avisos de límite de ediciones — solo para AdminBox */}
                  {!esDeveloper && comp?.vecesFechasEditadas >= 2 ? (
                    <div className="alert-locked-dates mb-4" style={{ background: 'rgba(220, 53, 69, 0.1)', border: '1px solid rgba(220, 53, 69, 0.3)', borderRadius: '0.8rem', padding: '1.2rem', color: '#f2f2f2' }}>
                      <div className="d-flex align-items-center gap-3 mb-2">
                        <i className="fas fa-lock text-danger" style={{ fontSize: '1.5rem' }}></i>
                        <h4 style={{ margin: 0, fontWeight: 700 }}>Modificación de Fechas Bloqueada</h4>
                      </div>
                      <p style={{ margin: 0, color: '#adb5bd', fontSize: '0.9rem' }}>Has alcanzado el límite máximo de ediciones de fecha. Por seguridad, si necesitas realizar cambios, contacta al soporte de Atletify.</p>
                      
                      <div className="d-flex gap-4 mt-3 flex-wrap">
                        {contactoSoporte.correo && (
                          <a href={`mailto:${contactoSoporte.correo}`} style={{ color: 'var(--primary)', textDecoration: 'none' }}>
                            <i className="fas fa-envelope me-2"></i>{contactoSoporte.correo}
                          </a>
                        )}
                        {contactoSoporte.telefono && (
                          <a href={`tel:${contactoSoporte.telefono}`} style={{ color: 'var(--primary)', textDecoration: 'none' }}>
                            <i className="fas fa-phone me-2"></i>{contactoSoporte.telefono}
                          </a>
                        )}
                      </div>
                    </div>
                  ) : !esDeveloper && comp?.vecesFechasEditadas === 1 ? (
                    <div className="alert-warning-dates mb-4" style={{ background: 'rgba(255, 193, 7, 0.1)', border: '1px solid rgba(255, 193, 7, 0.3)', borderRadius: '0.8rem', padding: '1rem', color: '#ffc107', fontSize: '0.9rem' }}>
                      <i className="fas fa-exclamation-triangle me-2"></i>
                      <strong>Atención:</strong> Esta es tu última oportunidad para cambiar las fechas. Después de guardar, el calendario se bloqueará permanentemente.
                    </div>
                  ) : null}

                  {/* Formulario de fechas — bloqueado para AdminBox con 2+ ediciones, siempre abierto para Developer */}
                  {(!esDeveloper && comp?.vecesFechasEditadas >= 2) ? (
                    <div className="row g-4">
                      <div className="col-md-6">
                        <p className="cd-label" style={{ marginBottom: '0.85rem', color: 'var(--accent-cool)' }}>Inscripciones</p>
                        <div className="d-flex gap-3">
                          <div className="flex-grow-1">
                            <label className="cd-label">Apertura</label>
                            <div className="form-control" style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid #333', color: '#999' }}>{fechas.inicioIns || '--'}</div>
                          </div>
                          <div className="flex-grow-1">
                            <label className="cd-label">Cierre</label>
                            <div className="form-control" style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid #333', color: '#999' }}>{fechas.finIns || '--'}</div>
                          </div>
                        </div>
                      </div>
                      <div className="col-md-6">
                        <p className="cd-label" style={{ marginBottom: '0.85rem', color: 'var(--primary)' }}>Competencia</p>
                        <div className="d-flex gap-3">
                          <div className="flex-grow-1">
                            <label className="cd-label">Día 1</label>
                            <div className="form-control" style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid #333', color: '#999' }}>{fechas.inicioComp || '--'}</div>
                          </div>
                          <div className="flex-grow-1">
                            <label className="cd-label">Fin</label>
                            <div className="form-control" style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid #333', color: '#999' }}>{fechas.finComp || '--'}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={guardarFechas}>
                      <div className="row g-4">
                        <div className="col-md-6">
                          <p className="cd-label" style={{ marginBottom: '0.85rem', color: 'var(--accent-cool)' }}>Inscripciones</p>
                          <div className="d-flex gap-3">
                            <div className="flex-grow-1">
                              <label className="cd-label">Apertura</label>
                              <RedGrayDatePicker 
                                value={fechas.inicioIns} 
                                min={minApertura}
                                max={maxApertura}
                                onChange={(next) => setFechas({ ...fechas, inicioIns: next })} 
                              />
                            </div>
                            <div className="flex-grow-1">
                              <label className="cd-label">
                                Cierre
                                {!fechas.inicioIns && <span className="ms-1 text-warning" title="Define primero la apertura"><i className="fas fa-lock"></i></span>}
                              </label>
                              {fechas.inicioIns ? (
                                <RedGrayDatePicker 
                                  value={fechas.finIns} 
                                  min={minCierre}
                                  onChange={(next) => setFechas({ ...fechas, finIns: next })} 
                                />
                              ) : (
                                <div className="form-control" style={{ background: 'rgba(0,0,0,0.15)', border: '1px solid rgba(255,193,7,0.3)', color: '#888', cursor: 'not-allowed' }}>
                                  <i className="fas fa-lock me-2 text-warning opacity-50"></i><span className="opacity-50">Primero apertura</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="col-md-6">
                          <p className="cd-label" style={{ marginBottom: '0.35rem', color: 'var(--primary)' }}>Competencia</p>
                          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.6rem' }}>
                            <i className="fas fa-circle-info me-1"></i>Evento de 1 día: pon la <b>misma fecha</b> en Día 1 y Fin, y define la hora de inicio/fin. El evento queda "En Vivo" desde la hora de inicio y pasa a histórico al pasar la hora de fin.
                          </p>
                          <div className="mb-3" style={{ maxWidth: '340px' }}>
                            <label className="cd-label">Zona horaria del evento</label>
                            <select className="cd-input" value={zonaOffset} onChange={(e) => guardarZona(Number(e.target.value))}>
                              <option value={-5}>Sureste — Cancún / Q. Roo (UTC-5)</option>
                              <option value={-6}>Centro — CDMX / GDL / MTY (UTC-6)</option>
                              <option value={-7}>Pacífico — BCS / Sonora / Sinaloa (UTC-7)</option>
                              <option value={-8}>Noroeste — Tijuana (UTC-8)</option>
                            </select>
                            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>Define cuándo el evento pasa solo a "En Vivo" e histórico. Las horas se muestran tal cual se capturan.</p>
                          </div>
                          <div className="d-flex gap-3">
                            <div className="flex-grow-1">
                              <label className="cd-label">
                                Día 1
                                {(!fechas.inicioIns || !fechas.finIns) && <span className="ms-1 text-warning" title="Define primero las fechas de inscripción"><i className="fas fa-lock"></i></span>}
                              </label>
                              {(fechas.inicioIns && fechas.finIns) ? (
                                <>
                                  <RedGrayDatePicker
                                    required
                                    value={fechas.inicioComp}
                                    min={minDia1}
                                    onChange={(next) => setFechas({ ...fechas, inicioComp: next })}
                                  />
                                  <input type="time" className="cd-input mt-2" value={fechas.horaInicioComp} onChange={(e) => setFechas({ ...fechas, horaInicioComp: e.target.value })} title="Hora de inicio del evento" />
                                </>
                              ) : (
                                <div className="form-control" style={{ background: 'rgba(0,0,0,0.15)', border: '1px solid rgba(255,193,7,0.3)', color: '#888', cursor: 'not-allowed' }}>
                                  <i className="fas fa-lock me-2 text-warning opacity-50"></i><span className="opacity-50">Primero inscripciones</span>
                                </div>
                              )}
                            </div>
                            <div className="flex-grow-1">
                              <label className="cd-label">
                                Fin
                                {!fechas.inicioComp && <span className="ms-1 text-warning" title="Define primero el Día 1"><i className="fas fa-lock"></i></span>}
                              </label>
                              {fechas.inicioComp ? (
                                <>
                                  <RedGrayDatePicker
                                    required
                                    value={fechas.finComp}
                                    min={minFin}
                                    max={maxFin}
                                    onChange={(next) => setFechas({ ...fechas, finComp: next })}
                                  />
                                  <input type="time" className="cd-input mt-2" value={fechas.horaFinComp} onChange={(e) => setFechas({ ...fechas, horaFinComp: e.target.value })} title="Hora de fin del evento" />
                                </>
                              ) : (
                                <div className="form-control" style={{ background: 'rgba(0,0,0,0.15)', border: '1px solid rgba(255,193,7,0.3)', color: '#888', cursor: 'not-allowed' }}>
                                  <i className="fas fa-lock me-2 text-warning opacity-50"></i><span className="opacity-50">Primero Día 1</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="col-12 text-end">
                          <BotonSeguro type="submit" className="cd-btn cd-btn--info-solid" textoProcesando="Guardando...">
                            <i className="fas fa-calendar-check"></i>GUARDAR CALENDARIO
                          </BotonSeguro>
                        </div>
                      </div>
                    </form>
                  )}
                </div>
              </div>

            {/* Anuncios */}
            <div className="cd-section-header mt-4">
              <span className="cd-card-titulo cd-card-titulo--warning" style={{ fontSize: '1rem' }}>
                <i className="fas fa-bullhorn"></i>Anuncios
              </span>
              <BotonSeguro className="cd-btn cd-btn--warning-solid" onClick={guardarPortal} disabled={guardando} textoProcesando="Guardando...">
                PUBLICAR ANUNCIOS
              </BotonSeguro>
            </div>
            <div className="cd-quill-wrap mb-5" style={{ marginBottom: '3rem' }}>
              <ReactQuill theme="snow" value={anuncios} onChange={setAnuncios} style={{ height: '250px' }} />
            </div>

            {/* Reglamento */}
            <div className="cd-section-header" style={{ marginTop: '4rem', paddingTop: '1rem', borderTop: '1px solid var(--border)', borderBottom: 'none' }}>
              <span className="cd-card-titulo cd-card-titulo--danger" style={{ fontSize: '1rem' }}>
                <i className="fas fa-gavel"></i>Reglamento
              </span>
              <BotonSeguro className="cd-btn cd-btn--primary" onClick={guardarPortal} disabled={guardando} textoProcesando="Guardando...">
                PUBLICAR REGLAMENTO
              </BotonSeguro>
            </div>
            <div className="cd-quill-wrap" style={{ marginBottom: '3rem' }}>
              <ReactQuill theme="snow" value={reglamento} onChange={setReglamento} style={{ height: '300px' }} />
            </div>
          </div>
        )})()}

        {/* ========================================================= */}
        {/* TAB: INVENTARIO COMPETENCIA */}
        {/* ========================================================= */}
        {tabActiva === 'inventario-comp' && (
          <div className="cd-tab-fade">
            <div className="cd-section-header">
              <div>
                <h2 className="cd-section-h">Inventario <span>Competencia</span></h2>
                <p className="cd-section-sub">Agrega materiales requeridos, detecta faltantes y registra préstamos.</p>
              </div>
              <div className="d-flex align-items-center gap-2">
                <span
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                    fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase',
                    letterSpacing: '0.5px', color: 'rgba(34,197,94,0.85)',
                    background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)',
                    borderRadius: '20px', padding: '0.3rem 0.75rem'
                  }}
                >
                  <i className="fas fa-circle" style={{ fontSize: '0.4rem' }}></i>
                  Guardado automático
                </span>
              </div>
            </div>

            <div className="row g-4 mb-4">
              <div className="col-lg-7">
                <div className="cd-card cd-card--info h-100">
                  <div className="cd-card-header cd-card-header--info">
                    <span className="cd-card-titulo cd-card-titulo--info">
                      <i className="fas fa-plus-circle"></i>Agregar material para competencia
                    </span>
                  </div>
                  <div className="cd-card-body-lg">
                    {cargandoHerramientasBox ? (
                      <div className="d-flex align-items-center gap-2">
                        <AtletifyLoader />
                        <span style={{ color: 'var(--text-muted)' }}>Cargando herramientas...</span>
                      </div>
                    ) : (
                      <div className="row g-3 align-items-end">
                        <div className="col-md-7">
                          <label className="cd-label">Herramientas del box</label>
                          <button
                            type="button"
                            className="cd-btn cd-btn--outline w-100 cd-herramienta-picker-btn"
                            onClick={() => {
                              setBusquedaHerramienta('');
                              setFiltroUnidadHerramienta('todos');
                              setFiltroTipoHerramienta('todos');
                              setSelectorHerramientaAbierto(true);
                            }}
                          >
                            <span className="d-flex align-items-center gap-2">
                              <i className="fas fa-toolbox"></i>
                              {herramientaSeleccionada
                                ? (herramientaSeleccionada.nombre ?? herramientaSeleccionada.Nombre)
                                : 'Selecciona herramienta...'}
                            </span>
                            <i className="fas fa-chevron-down"></i>
                          </button>
                          {herramientaSeleccionada && (
                            <div className="cd-herramienta-picker-resumen mt-2">
                              <div className="d-flex align-items-center gap-2 flex-wrap mb-1">
                                <span className="cd-badge cd-badge--secondary">
                                  Cantidad: {Number(herramientaSeleccionada.cantidad ?? herramientaSeleccionada.Cantidad ?? 0)}
                                </span>
                                <span className="cd-badge cd-badge--outline">
                                  {getHerramientaMedidaTexto(herramientaSeleccionada)}
                                </span>
                              </div>
                              <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                                {getHerramientaDescripcion(herramientaSeleccionada) || 'Sin notas en esta herramienta.'}
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="col-md-3">
                          <label className="cd-label">Cantidad requerida</label>
                          <input
                            type="number"
                            min="1"
                            max="99999"
                            maxLength={5}
                            className="cd-input"
                            placeholder="Ej: 30"
                            value={formMaterialComp.cantidadRequerida}
                            onChange={(e) => { if (String(e.target.value).length <= 5) setFormMaterialComp(prev => ({ ...prev, cantidadRequerida: e.target.value })); }}
                          />
                        </div>
                        <div className="col-md-2">
                          <button type="button" className="cd-btn cd-btn--info-solid w-100" onClick={agregarMaterialCompetencia}>
                            Aceptar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="col-lg-5">
                <div className="cd-card cd-card--danger h-100">
                  <div className="cd-card-header cd-card-header--danger">
                    <span className="cd-card-titulo cd-card-titulo--danger">
                      <i className="fas fa-truck-loading"></i>Agregar préstamo externo
                    </span>
                  </div>
                  <div className="cd-card-body-lg">
                    <div className="row g-3 align-items-end">
                      <div className="col-md-6 col-lg-12 col-xxl-6">
                        <label className="cd-label">Box de préstamo</label>
                        <input
                          type="text"
                          className="cd-input"
                          value={formPrestamoManual.boxPrestamo}
                          onChange={(e) => setFormPrestamoManual(prev => ({ ...prev, boxPrestamo: e.target.value }))}
                        />
                      </div>
                      <div className="col-md-6 col-lg-12 col-xxl-6">
                        <label className="cd-label">Nombre del equipo/material</label>
                        <input
                          type="text"
                          className="cd-input"
                          value={formPrestamoManual.nombreEquipo}
                          onChange={(e) => setFormPrestamoManual(prev => ({ ...prev, nombreEquipo: e.target.value }))}
                        />
                      </div>
                      <div className="col-md-4 col-lg-6 col-xxl-4">
                        <label className="cd-label">Cantidad a prestar</label>
                        <input
                          type="number"
                          min="1"
                          max="99999"
                          maxLength={5}
                          className="cd-input"
                          value={formPrestamoManual.cantidad}
                          onChange={(e) => { if (String(e.target.value).length <= 5) setFormPrestamoManual(prev => ({ ...prev, cantidad: e.target.value })); }}
                        />
                      </div>
                      <div className="col-md-8 col-lg-6 col-xxl-8">
                        <label className="cd-label">Notas</label>
                        <input
                          type="text"
                          className="cd-input"
                          value={formPrestamoManual.notas}
                          onChange={(e) => setFormPrestamoManual(prev => ({ ...prev, notas: e.target.value }))}
                        />
                      </div>
                      <div className="col-12 text-end">
                        <button type="button" className="cd-btn cd-btn--danger" onClick={agregarPrestamoManual}>
                          <i className="fas fa-plus-circle"></i>Agregar préstamo
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="cd-card mb-4">
              <div className="cd-card-header">
                <span className="cd-card-titulo cd-card-titulo--white">
                  <i className="fas fa-list-check"></i>Material requerido en competencia
                </span>
                <div className="d-flex align-items-center gap-1" style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  <span>{materialesFiltrados.length + prestamosManualesFiltrados.length} resultado{materialesFiltrados.length + prestamosManualesFiltrados.length !== 1 ? 's' : ''}</span>
                </div>
              </div>
              <div className="cd-card-body">
                <div className="d-flex flex-column flex-sm-row align-items-start align-items-sm-center gap-3 mb-3">
                  <div className="d-flex align-items-center gap-1 flex-shrink-0">
                    {[
                      { key: 'todos', label: 'Todos', icon: 'fa-layer-group' },
                      { key: 'box', label: 'Herramientas del box', icon: 'fa-toolbox' },
                      { key: 'externo', label: 'No existente en el box', icon: 'fa-truck-loading' },
                    ].map(({ key, label, icon }) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setFiltroTipoInventario(key)}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                          padding: '0.3rem 0.7rem', borderRadius: '20px', cursor: 'pointer',
                          fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase',
                          letterSpacing: '0.4px', whiteSpace: 'nowrap',
                          transition: 'all 0.15s ease',
                          border: filtroTipoInventario === key
                            ? (key === 'box' ? '1px solid rgba(79,195,247,0.5)' : key === 'externo' ? '1px solid rgba(230,57,70,0.5)' : '1px solid var(--primary)')
                            : '1px solid var(--border)',
                          background: filtroTipoInventario === key
                            ? (key === 'box' ? 'rgba(79,195,247,0.12)' : key === 'externo' ? 'rgba(230,57,70,0.12)' : 'rgba(230,57,70,0.1)')
                            : 'transparent',
                          color: filtroTipoInventario === key
                            ? (key === 'box' ? 'rgba(79,195,247,0.95)' : key === 'externo' ? 'rgba(230,57,70,0.95)' : 'var(--primary)')
                            : 'var(--text-muted)',
                        }}
                      >
                        <i className={`fas ${icon}`} style={{ fontSize: '0.65rem' }}></i>
                        {label}
                      </button>
                    ))}
                  </div>
                  <div style={{ position: 'relative', flex: 1, minWidth: 0, width: '100%' }}>
                    <i
                      className="fas fa-search"
                      style={{
                        position: 'absolute', left: '0.85rem', top: '50%',
                        transform: 'translateY(-50%)', color: 'var(--text-muted)',
                        fontSize: '0.8rem', pointerEvents: 'none'
                      }}
                    ></i>
                    <input
                      type="text"
                      className="cd-input"
                      style={{ paddingLeft: '2.2rem' }}
                      placeholder="Buscar por equipo, notas o box de préstamo..."
                      value={busquedaInventario}
                      onChange={(e) => setBusquedaInventario(e.target.value)}
                    />
                  </div>
                </div>
                {cargandoInventarioComp && (
                  <div className="d-flex align-items-center gap-2 mb-3">
                    <AtletifyLoader />
                    <span style={{ color: 'var(--text-muted)' }}>Cargando inventario de competencia...</span>
                  </div>
                )}
                {!cargandoInventarioComp && errorInventarioComp && (
                  <div className="cd-alert cd-alert--danger mb-3">
                    <i className="fas fa-triangle-exclamation me-2"></i>
                    {errorInventarioComp}
                  </div>
                )}
                {!cargandoInventarioComp && inventarioComp.materiales.length === 0 && (inventarioComp.prestamosManuales || []).length === 0 ? (
                  <div className="cd-empty" style={{ minHeight: '120px' }}>
                    <i className="fas fa-box-open"></i>
                    <p>Aún no agregas materiales para esta competencia.</p>
                  </div>
                ) : !cargandoInventarioComp && materialesFiltrados.length === 0 && prestamosManualesFiltrados.length === 0 ? (
                  <div className="cd-empty" style={{ minHeight: '120px' }}>
                    <i className={filtroTipoInventario !== 'todos' ? 'fas fa-filter' : 'fas fa-search-minus'}></i>
                    <p>
                      {filtroTipoInventario === 'box'
                        ? 'No hay herramientas del box registradas.'
                        : filtroTipoInventario === 'externo'
                        ? 'No hay préstamos externos registrados.'
                        : 'No hay resultados para tu búsqueda.'}
                    </p>
                  </div>
                ) : (
                  <div className="d-flex flex-column gap-3">
                    {materialesFiltrados.map(material => {
                      const idMaterial = material.idCompetenciaInventarioMaterial ?? material.id;
                      const prestamosMaterial = Array.isArray(material.prestamos) ? material.prestamos : [];
                      const prestado = getPrestadoMaterial(material);
                      const faltanteActual = getFaltanteActual(material);
                      const tienePrestamosRegistrados = prestamosMaterial.length > 0;
                      const tienePrestamosActivos = prestamosMaterial.some(p => (p.estatus || 'Prestado') !== 'Devuelto');
                      const materialAbierto = materialAbiertoId === idMaterial;
                      const estaEditandoRequerido = materialEditandoId === idMaterial;
                      const esBox = !!material.idHerramienta;
                      const colorAccent = esBox ? 'rgba(79,195,247,1)' : 'rgba(230,57,70,1)';
                      const colorAccentSoft = esBox ? 'rgba(79,195,247,0.12)' : 'rgba(230,57,70,0.12)';
                      const colorAccentBorder = esBox ? 'rgba(79,195,247,0.3)' : 'rgba(230,57,70,0.3)';

                      const statusBadge = esBox
                        ? faltanteActual > 0
                          ? <span className="cd-badge cd-badge--warning"><i className="fas fa-exclamation-triangle me-1" style={{ fontSize: '0.6rem' }}></i>Faltan {faltanteActual}</span>
                          : tienePrestamosRegistrados && !tienePrestamosActivos
                            ? <span className="cd-badge cd-badge--success"><i className="fas fa-check-circle me-1" style={{ fontSize: '0.6rem' }}></i>Devuelto</span>
                            : <span className="cd-badge cd-badge--success"><i className="fas fa-check-circle me-1" style={{ fontSize: '0.6rem' }}></i>Completo</span>
                        : <span className="cd-badge cd-badge--danger"><i className="fas fa-truck-loading me-1" style={{ fontSize: '0.6rem' }}></i>Préstamo ext.</span>;

                      return (
                        <div
                          key={idMaterial}
                          style={{
                            borderRadius: '16px',
                            border: `1px solid ${colorAccentBorder}`,
                            borderLeft: `4px solid ${colorAccent}`,
                            background: esBox
                              ? 'linear-gradient(135deg, rgba(79,195,247,0.04) 0%, rgba(11,11,15,0.8) 100%)'
                              : 'linear-gradient(135deg, rgba(230,57,70,0.06) 0%, rgba(11,11,15,0.8) 100%)',
                            overflow: 'hidden',
                          }}
                        >
                          {/* ── CABECERA COLAPSABLE ── */}
                          <button
                            type="button"
                            onClick={() => setMaterialAbiertoId(prev => (prev === idMaterial ? null : idMaterial))}
                            style={{
                              width: '100%', background: 'transparent', border: 'none',
                              padding: '1rem 1.1rem', textAlign: 'left', cursor: 'pointer',
                            }}
                          >
                            <div className="d-flex align-items-start justify-content-between gap-2 flex-wrap">
                              {/* Izquierda: nombre + tipo + medida */}
                              <div style={{ minWidth: 0, flex: 1 }}>
                                <div className="d-flex align-items-center gap-2 flex-wrap mb-1">
                                  <div
                                    style={{
                                      width: 28, height: 28, borderRadius: '8px', flexShrink: 0,
                                      background: colorAccentSoft, border: `1px solid ${colorAccentBorder}`,
                                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                                      color: colorAccent, fontSize: '0.7rem',
                                    }}
                                  >
                                    <i className={`fas ${esBox ? 'fa-toolbox' : 'fa-truck-loading'}`}></i>
                                  </div>
                                  <span style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '0.97rem', lineHeight: 1.2 }}>
                                    {material.nombre}
                                  </span>
                                  {esBox
                                    ? <span className="cd-badge cd-badge--info">Herramienta del box</span>
                                    : <span className="cd-badge cd-badge--danger">No existente en el box</span>}
                                </div>

                                {/* Stats en línea: Disponible · Requerido · Faltante */}
                                {esBox && (
                                  <div className="d-flex align-items-center gap-3 flex-wrap mt-1" style={{ fontSize: '0.78rem' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>
                                      <span style={{ fontWeight: 700, color: 'var(--text-secondary)', marginRight: '0.25rem' }}>Disponible:</span>
                                      <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{material.disponible}</span>
                                    </span>
                                    <span style={{ color: 'var(--border)' }}>|</span>
                                    <span style={{ color: 'var(--text-muted)' }}>
                                      <span style={{ fontWeight: 700, color: 'var(--text-secondary)', marginRight: '0.25rem' }}>Requerido:</span>
                                      <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{material.requerido}</span>
                                    </span>
                                    <span style={{ color: 'var(--border)' }}>|</span>
                                    <span style={{ color: 'var(--text-muted)' }}>
                                      <span style={{ fontWeight: 700, color: 'var(--text-secondary)', marginRight: '0.25rem' }}>Prestado:</span>
                                      <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{prestado}</span>
                                    </span>
                                    {faltanteActual > 0 && (
                                      <>
                                        <span style={{ color: 'var(--border)' }}>|</span>
                                        <span>
                                          <span style={{ fontWeight: 700, color: 'rgba(251,191,36,0.9)', marginRight: '0.25rem' }}>Faltante:</span>
                                          <span style={{ color: 'rgba(251,191,36,1)', fontWeight: 800 }}>{faltanteActual}</span>
                                        </span>
                                      </>
                                    )}
                                  </div>
                                )}

                                {/* Medida y notas */}
                                <div className="d-flex align-items-center gap-2 flex-wrap mt-1">
                                  {material.medidaTexto && (
                                    <span style={{
                                      fontSize: '0.72rem', fontWeight: 700, color: 'rgba(34,197,94,0.85)',
                                      background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)',
                                      borderRadius: '6px', padding: '0.1rem 0.5rem',
                                    }}>
                                      <i className="fas fa-weight-hanging me-1"></i>
                                      {material.medidaTexto}
                                    </span>
                                  )}
                                  {material.notasHerramienta && (
                                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                      {material.notasHerramienta}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Derecha: status + chevron */}
                              <div className="d-flex align-items-center gap-2 flex-shrink-0">
                                {statusBadge}
                                <span style={{
                                  width: 26, height: 26, borderRadius: '50%', display: 'flex',
                                  alignItems: 'center', justifyContent: 'center',
                                  background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)',
                                  color: 'var(--text-muted)', fontSize: '0.68rem', flexShrink: 0,
                                }}>
                                  <i className={`fas ${materialAbierto ? 'fa-chevron-up' : 'fa-chevron-down'}`}></i>
                                </span>
                              </div>
                            </div>
                          </button>

                          {/* ── CUERPO EXPANDIDO ── */}
                          {materialAbierto && (
                            <div style={{ borderTop: `1px solid ${colorAccentBorder}`, padding: '1rem 1.1rem' }}>

                              {/* Grid de stats */}
                              {esBox && (
                                <div className="row g-2 mb-3">
                                  {[
                                    { label: 'Disponible', value: material.disponible, icon: 'fa-boxes-stacked', color: 'rgba(34,197,94,0.8)' },
                                    { label: 'Requerido', value: material.requerido, icon: 'fa-bullseye', color: 'rgba(79,195,247,0.8)' },
                                    { label: 'Prestado', value: prestado, icon: 'fa-handshake', color: 'rgba(251,191,36,0.8)' },
                                    { label: 'Faltante', value: faltanteActual, icon: 'fa-triangle-exclamation', color: faltanteActual > 0 ? 'rgba(251,191,36,1)' : 'rgba(34,197,94,0.6)' },
                                  ].map(({ label, value, icon, color }) => (
                                    <div key={label} className="col-6 col-sm-3">
                                      <div style={{
                                        borderRadius: '10px', padding: '0.6rem 0.75rem',
                                        background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)',
                                        display: 'flex', flexDirection: 'column', gap: '0.2rem',
                                      }}>
                                        <span style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px', color: 'var(--text-muted)' }}>
                                          <i className={`fas ${icon} me-1`} style={{ color, fontSize: '0.6rem' }}></i>
                                          {label}
                                        </span>
                                        <span style={{ fontSize: '1.2rem', fontWeight: 800, color, lineHeight: 1 }}>
                                          {value}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Acciones: editar requerido + prestar */}
                              <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
                                {estaEditandoRequerido ? (
                                  <div className="d-flex flex-column gap-2" style={{ width: '100%' }}>
                                    <div className="d-flex align-items-center gap-2 flex-wrap">
                                      <label className="cd-label mb-0" style={{ fontSize: '0.78rem' }}>Cantidad requerida</label>
                                      <input
                                        type="number"
                                        min={minRequeridoEdit}
                                        max="99999"
                                        className="cd-input"
                                        style={{ width: '110px', height: '34px' }}
                                        value={cantidadRequeridaEdit}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          if (String(val).length <= 5) setCantidadRequeridaEdit(val);
                                        }}
                                      />
                                      <button type="button" className="cd-btn cd-btn--primary cd-btn--sm" onClick={() => guardarEdicionRequerido(idMaterial)}>
                                        <i className="fas fa-check"></i>Guardar
                                      </button>
                                      <button type="button" className="cd-btn cd-btn--outline cd-btn--sm" onClick={cancelarEdicionRequerido}>
                                        Cancelar
                                      </button>
                                    </div>
                                    {minRequeridoEdit > 1 && (
                                      <div style={{
                                        display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                                        fontSize: '0.72rem', color: 'rgba(251,191,36,0.85)',
                                        background: 'rgba(251,191,36,0.07)', border: '1px solid rgba(251,191,36,0.2)',
                                        borderRadius: '8px', padding: '0.3rem 0.6rem', width: 'fit-content',
                                      }}>
                                        <i className="fas fa-lock" style={{ fontSize: '0.6rem' }}></i>
                                        Mínimo permitido: <strong>{minRequeridoEdit}</strong> — no puedes reducir mientras haya préstamos registrados.
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <button type="button" className="cd-btn cd-btn--outline cd-btn--sm" onClick={() => iniciarEdicionRequerido(material)}>
                                    <i className="fas fa-pen"></i>Editar requerido
                                  </button>
                                )}
                                {esBox && faltanteActual > 0 && (
                                  <button
                                    type="button"
                                    className="cd-btn cd-btn--warning-solid cd-btn--sm"
                                    onClick={() => { setPrestamoAbiertoId(idMaterial); setFormPrestamo({ boxPrestamo: '', cantidad: '', notas: '' }); }}
                                  >
                                    <i className="fas fa-handshake"></i>Registrar préstamo
                                  </button>
                                )}
                              </div>

                              {/* Formulario de nuevo préstamo */}
                              {prestamoAbiertoId === idMaterial && (
                                <div
                                  style={{
                                    borderRadius: '12px', padding: '0.9rem',
                                    background: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.2)',
                                    marginBottom: '1rem',
                                  }}
                                >
                                  <p style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px', color: 'rgba(251,191,36,0.8)', marginBottom: '0.75rem' }}>
                                    <i className="fas fa-handshake me-1"></i>Nuevo préstamo
                                  </p>
                                  <div className="row g-2">
                                    <div className="col-12 col-sm-5">
                                      <label className="cd-label">Box de préstamo</label>
                                      <input type="text" className="cd-input" placeholder="Ej: CrossFit Norte"
                                        value={formPrestamo.boxPrestamo}
                                        onChange={(e) => setFormPrestamo(prev => ({ ...prev, boxPrestamo: e.target.value }))} />
                                    </div>
                                    <div className="col-5 col-sm-2">
                                      <label className="cd-label">Cantidad</label>
                                      <input type="number" min="1" max="99999" className="cd-input" placeholder="0"
                                        value={formPrestamo.cantidad}
                                        onChange={(e) => { if (String(e.target.value).length <= 5) setFormPrestamo(prev => ({ ...prev, cantidad: e.target.value })); }} />
                                    </div>
                                    <div className="col-12 col-sm-5">
                                      <label className="cd-label">Notas</label>
                                      <input type="text" className="cd-input" placeholder="Observaciones..."
                                        value={formPrestamo.notas}
                                        onChange={(e) => setFormPrestamo(prev => ({ ...prev, notas: e.target.value }))} />
                                    </div>
                                    <div className="col-12 d-flex justify-content-end align-items-center gap-2" style={{ paddingTop: '0.25rem' }}>
                                      <button type="button" className="cd-btn cd-btn--outline cd-btn--sm" onClick={() => setPrestamoAbiertoId(null)}>
                                        <i className="fas fa-times"></i>Cancelar
                                      </button>
                                      <button type="button" className="cd-btn cd-btn--primary cd-btn--sm" onClick={() => guardarPrestamoMaterial(idMaterial)}>
                                        <i className="fas fa-check"></i>Guardar préstamo
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Lista de préstamos existentes */}
                              {prestamosMaterial.length > 0 && (
                                <div>
                                  <p style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                                    <i className="fas fa-list me-1"></i>Préstamos registrados ({prestamosMaterial.length})
                                  </p>
                                  <div className="d-flex flex-column gap-2">
                                    {prestamosMaterial.map(p => {
                                      const devuelto = (p.estatus || 'Prestado') === 'Devuelto';
                                      return (
                                        <div
                                          key={p.id}
                                          style={{
                                            borderRadius: '12px', overflow: 'hidden',
                                            background: devuelto ? 'rgba(34,197,94,0.04)' : 'rgba(251,191,36,0.05)',
                                            border: devuelto ? '1px solid rgba(34,197,94,0.2)' : '1px solid rgba(251,191,36,0.2)',
                                          }}
                                        >
                                          {/* Datos — grid sin columna lateral de acciones */}
                                          <div className="row g-0" style={{ padding: '0.75rem 0.9rem', rowGap: '0.55rem' }}>
                                            <div className="col-6 col-md-3" style={{ paddingRight: '0.5rem' }}>
                                              <div style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.3px', color: 'var(--text-muted)', marginBottom: '0.1rem' }}>
                                                <i className="fas fa-building me-1"></i>Box de préstamo
                                              </div>
                                              <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.85rem', wordBreak: 'break-word' }}>
                                                {p.boxPrestamo || '—'}
                                              </div>
                                            </div>
                                            <div className="col-6 col-md-2" style={{ paddingRight: '0.5rem' }}>
                                              <div style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.3px', color: 'var(--text-muted)', marginBottom: '0.1rem' }}>
                                                <i className="fas fa-hashtag me-1"></i>Cantidad
                                              </div>
                                              <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.85rem' }}>
                                                {p.cantidad}<span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: '0.75rem', marginLeft: '0.2rem' }}>uds</span>
                                              </div>
                                            </div>
                                            <div className="col-12 col-md-4" style={{ paddingRight: '0.5rem' }}>
                                              <div style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.3px', color: 'var(--text-muted)', marginBottom: '0.1rem' }}>
                                                <i className="fas fa-note-sticky me-1"></i>Notas
                                              </div>
                                              <div style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', wordBreak: 'break-word' }}>
                                                {p.notas || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Sin notas</span>}
                                              </div>
                                            </div>
                                            <div className="col-12 col-md-3">
                                              <div style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.3px', color: 'var(--text-muted)', marginBottom: '0.1rem' }}>
                                                <i className="fas fa-calendar me-1"></i>Fecha préstamo
                                              </div>
                                              <div style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                                                {formatFechaPrestamo(p.fecha)}
                                              </div>
                                            </div>
                                            {p.fechaDevolucion && (
                                              <div className="col-12" style={{ marginTop: '0.1rem' }}>
                                                <span style={{ fontSize: '0.72rem', color: 'rgba(34,197,94,0.85)' }}>
                                                  <i className="fas fa-rotate-left me-1"></i>
                                                  <strong>Devuelto:</strong> {formatFechaPrestamo(p.fechaDevolucion)}
                                                </span>
                                              </div>
                                            )}
                                          </div>
                                          {/* Footer de estado — siempre en su propia fila */}
                                          <div style={{
                                            borderTop: devuelto ? '1px solid rgba(34,197,94,0.15)' : '1px solid rgba(251,191,36,0.15)',
                                            padding: '0.5rem 0.9rem',
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                            flexWrap: 'wrap', gap: '0.4rem',
                                            background: devuelto ? 'rgba(34,197,94,0.04)' : 'rgba(251,191,36,0.04)',
                                          }}>
                                            {devuelto ? (
                                              <span className="cd-badge cd-badge--success">
                                                <i className="fas fa-check-circle me-1"></i>Devuelto
                                              </span>
                                            ) : (
                                              <>
                                                <span className="cd-badge cd-badge--warning">
                                                  <i className="fas fa-clock me-1"></i>Pendiente
                                                </span>
                                                <button
                                                  type="button"
                                                  className="cd-btn cd-btn--outline cd-btn--sm"
                                                  onClick={() => marcarPrestamoDevuelto(idMaterial, p.id)}
                                                >
                                                  <i className="fas fa-rotate-left"></i>Marcar devuelto
                                                </button>
                                              </>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* ── SECCIÓN: PRÉSTAMOS EXTERNOS (No existentes en el box) ── */}
                    {prestamosManualesFiltrados.length > 0 && (
                      <div style={{ marginTop: '0.5rem' }}>
                        <button
                          type="button"
                          onClick={() => setPrestamosExternosAbiertos(prev => !prev)}
                          style={{
                            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            background: 'rgba(230,57,70,0.06)', border: '1px solid rgba(230,57,70,0.25)',
                            borderRadius: prestamosExternosAbiertos ? '16px 16px 0 0' : '16px',
                            padding: '0.75rem 1rem', cursor: 'pointer',
                            transition: 'border-radius 0.2s ease',
                          }}
                        >
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'rgba(230,57,70,0.9)' }}>
                            <i className={`fas ${prestamosExternosAbiertos ? 'fa-chevron-down' : 'fa-chevron-right'}`} style={{ fontSize: '0.65rem' }}></i>
                            <i className="fas fa-truck-loading"></i>
                            Préstamos externos — no existentes en el box
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                              minWidth: '20px', height: '20px', borderRadius: '10px', padding: '0 6px',
                              background: 'rgba(230,57,70,0.2)', border: '1px solid rgba(230,57,70,0.4)',
                              color: 'rgba(230,57,70,1)', fontSize: '0.72rem', fontWeight: 900,
                            }}>
                              {prestamosManualesFiltrados.length}
                            </span>
                          </span>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                            {prestamosExternosAbiertos ? 'Ocultar' : 'Mostrar'}
                          </span>
                        </button>

                        {prestamosExternosAbiertos && (
                          <div style={{
                            border: '1px solid rgba(230,57,70,0.25)', borderTop: 'none',
                            borderRadius: '0 0 16px 16px', padding: '0.9rem',
                            background: 'rgba(230,57,70,0.03)',
                            display: 'flex', flexDirection: 'column', gap: '0.6rem',
                          }}>
                            {prestamosManualesFiltrados.map(p => {
                              const devuelto = (p.estatus || 'Prestado') === 'Devuelto';
                              return (
                                <div
                                  key={p.id}
                                  style={{
                                    borderRadius: '12px', overflow: 'hidden',
                                    background: devuelto ? 'rgba(34,197,94,0.05)' : 'rgba(230,57,70,0.08)',
                                    border: devuelto ? '1px solid rgba(34,197,94,0.2)' : '1px solid rgba(230,57,70,0.3)',
                                  }}
                                >
                                  {/* Datos — grid completo sin columna lateral */}
                                  <div className="row g-0" style={{ padding: '0.8rem 0.9rem', rowGap: '0.55rem' }}>
                                    <div className="col-12 col-sm-6 col-md-4" style={{ paddingRight: '0.5rem' }}>
                                      <div style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.3px', color: 'var(--text-muted)', marginBottom: '0.1rem' }}>
                                        <i className="fas fa-box me-1"></i>Equipo / Material
                                      </div>
                                      <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '0.9rem', wordBreak: 'break-word' }}>
                                        {p.nombreEquipo || '—'}
                                      </div>
                                    </div>
                                    <div className="col-6 col-md-3" style={{ paddingRight: '0.5rem' }}>
                                      <div style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.3px', color: 'var(--text-muted)', marginBottom: '0.1rem' }}>
                                        <i className="fas fa-building me-1"></i>Box de préstamo
                                      </div>
                                      <div style={{ fontWeight: 700, color: 'rgba(230,57,70,0.9)', fontSize: '0.85rem', wordBreak: 'break-word' }}>
                                        {p.boxPrestamo || '—'}
                                      </div>
                                    </div>
                                    <div className="col-6 col-md-2" style={{ paddingRight: '0.5rem' }}>
                                      <div style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.3px', color: 'var(--text-muted)', marginBottom: '0.1rem' }}>
                                        <i className="fas fa-hashtag me-1"></i>Cantidad
                                      </div>
                                      <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.85rem' }}>
                                        {p.cantidad}<span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: '0.75rem', marginLeft: '0.2rem' }}>uds</span>
                                      </div>
                                    </div>
                                    <div className="col-12 col-md-3" style={{ paddingRight: '0.5rem' }}>
                                      <div style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.3px', color: 'var(--text-muted)', marginBottom: '0.1rem' }}>
                                        <i className="fas fa-note-sticky me-1"></i>Notas
                                      </div>
                                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', wordBreak: 'break-word' }}>
                                        {p.notas || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Sin notas</span>}
                                      </div>
                                    </div>
                                    <div className="col-12">
                                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                        <i className="fas fa-calendar me-1"></i>
                                        <strong>Fecha préstamo:</strong> {formatFechaPrestamo(p.fecha)}
                                        {p.fechaDevolucion && (
                                          <span style={{ marginLeft: '0.6rem', color: 'rgba(34,197,94,0.85)' }}>
                                            <i className="fas fa-rotate-left me-1"></i>
                                            <strong>Devuelto:</strong> {formatFechaPrestamo(p.fechaDevolucion)}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  {/* Footer de estado — fila propia, nunca se sobrepone */}
                                  <div style={{
                                    borderTop: devuelto ? '1px solid rgba(34,197,94,0.15)' : '1px solid rgba(230,57,70,0.2)',
                                    padding: '0.5rem 0.9rem',
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    flexWrap: 'wrap', gap: '0.4rem',
                                    background: devuelto ? 'rgba(34,197,94,0.04)' : 'rgba(230,57,70,0.05)',
                                  }}>
                                    {devuelto ? (
                                      <span className="cd-badge cd-badge--success">
                                        <i className="fas fa-check-circle me-1"></i>Devuelto
                                      </span>
                                    ) : (
                                      <>
                                        <span className="cd-badge cd-badge--warning">
                                          <i className="fas fa-clock me-1"></i>Pendiente
                                        </span>
                                        <button
                                          type="button"
                                          className="cd-btn cd-btn--outline cd-btn--sm"
                                          onClick={() => marcarPrestamoManualDevuelto(p.id)}
                                        >
                                          <i className="fas fa-rotate-left"></i>Marcar devuelto
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB: LOGÍSTICA DE ARENA (HEATS MULTI-WOD) */}
        {/* ========================================================= */}
        {tabActiva === 'heats' && (
          <GestionHeatsPanel idCompetencia={id} categorias={comp?.categorias || comp?.Categorias || []} competencia={comp} />
        )}
        {/* Generador de heats viejo (blob JSON) — reemplazado por GestionHeatsPanel; oculto, pendiente de borrar. */}
        {false && (
          <div className="cd-tab-fade">
            <div className="cd-section-header">
              <div>
                <h2 className="cd-section-h"><span>Logística</span> de Arena</h2>
                <p className="cd-section-sub">Arma el rompecabezas de horarios. WOD por WOD, categoría por categoría.</p>
              </div>
              <div className="cd-section-actions">
                <BotonSeguro className="cd-btn cd-btn--warning" onClick={() => guardarItinerarioCompleto(false)} disabled={guardando} textoProcesando="Guardando...">
                  <i className="fas fa-save"></i>GUARDAR BORRADOR
                </BotonSeguro>
                <BotonSeguro className={`cd-btn cd-btn--warning-solid blink-soft`} onClick={() => guardarItinerarioCompleto(true)} disabled={guardando} textoProcesando="Publicando...">
                  <i className="fas fa-cloud-upload-alt"></i>PUBLICAR AL MUNDO
                </BotonSeguro>
              </div>
            </div>

            {/* Armador */}
            <div className="cd-card cd-card--danger mb-4">
              <div className="cd-card-header cd-card-header--danger">
                <span className="cd-card-titulo cd-card-titulo--danger">
                  <i className="fas fa-cogs"></i>1. ARMADOR DE BASE PARA UN WOD
                </span>
                <span className="cd-badge cd-badge--secondary">Ayuda al 90%</span>
              </div>
              <div className="cd-card-body-lg">
                <div className="row g-3 align-items-end">
                  <div className="col-md-4">
                    <label className="cd-label">Selecciona el WOD a armar</label>
                    <select
                      className="cd-select"
                      value={panelConfigWod.idWodSeleccionado}
                      onChange={e => setPanelConfigWod({ ...panelConfigWod, idWodSeleccionado: e.target.value })}
                    >
                      <option value="">-- Elige WOD --</option>
                      {wods.map(w => (
                        <option key={w.idWodComp || w.IdWodComp} value={w.idWodComp || w.IdWodComp}>
                          {w.nombre || w.Nombre} ({w.tipoCalificacion || w.TipoCalificacion})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-8">
                    <div className="cd-card cd-card--black" style={{ padding: '0.85rem 1rem' }}>
                      <label className="cd-label mb-2">Marca las categorías que pasan en este WOD</label>
                      <div className="cd-check-row">
                        {roster.map(cat => (
                          <label key={cat.categoriaNombre || cat.CategoriaNombre} className="cd-check-item">
                            <input
                              type="checkbox"
                              value={cat.categoriaNombre || cat.CategoriaNombre}
                              checked={panelConfigWod.categorias.includes(cat.categoriaNombre || cat.CategoriaNombre)}
                              onChange={(e) => {
                                const catName = cat.categoriaNombre || cat.CategoriaNombre;
                                const nuevasCats = e.target.checked
                                  ? [...panelConfigWod.categorias, catName]
                                  : panelConfigWod.categorias.filter(c => c !== catName);
                                setPanelConfigWod({ ...panelConfigWod, categorias: nuevasCats });
                              }}
                            />
                            <span className="cd-check-label">{cat.categoriaNombre || cat.CategoriaNombre}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="col-6 col-md-2">
                    <label className="cd-label">N° Carriles</label>
                    <input type="number" min="1" className="cd-input cd-input--center" value={panelConfigWod.carriles} onChange={e => setPanelConfigWod({ ...panelConfigWod, carriles: e.target.value })} />
                  </div>
                  <div className="col-6 col-md-2">
                    <label className="cd-label">Inicio</label>
                    <button
                      type="button"
                      className={`gc-hora-btn${mostrarPickerHoraInicio ? ' gc-hora-btn--open' : ''}`}
                      onClick={() => setMostrarPickerHoraInicio(true)}
                    >
                      <i className="far fa-clock" />
                      {(() => {
                        const [h, m] = panelConfigWod.horaInicio.split(':').map(Number);
                        const p = h < 12 ? 'AM' : 'PM';
                        const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
                        return `${h12}:${String(m).padStart(2, '0')} ${p}`;
                      })()}
                    </button>
                    {mostrarPickerHoraInicio && createPortal(
                      <div
                        className="twp-overlay"
                        onClick={e => { if (e.target === e.currentTarget) setMostrarPickerHoraInicio(false); }}
                      >
                        <div className="twp-modal">
                          <TimeWheelPicker
                            value={panelConfigWod.horaInicio}
                            onAccept={t => { setPanelConfigWod({ ...panelConfigWod, horaInicio: t }); setMostrarPickerHoraInicio(false); }}
                            onCancel={() => setMostrarPickerHoraInicio(false)}
                          />
                        </div>
                      </div>,
                      document.body
                    )}
                  </div>
                  <div className="col-6 col-md-3">
                    <label className="cd-label">Duración (min)</label>
                    <input type="number" min="1" className="cd-input cd-input--center" value={panelConfigWod.duracionWod} onChange={e => setPanelConfigWod({ ...panelConfigWod, duracionWod: e.target.value })} />
                  </div>
                  <div className="col-6 col-md-3">
                    <label className="cd-label">Transición (min)</label>
                    <input type="number" min="0" className="cd-input cd-input--center" value={panelConfigWod.transicion} onChange={e => setPanelConfigWod({ ...panelConfigWod, transicion: e.target.value })} />
                  </div>
                  <div className="col-md-2">
                    <button className="cd-btn cd-btn--danger w-100" onClick={generarHeatsParaWod}>
                      <i className="fas fa-magic"></i>GENERAR BASE
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Filtro y estatus de heats */}
            {configuracionHeats.wods && configuracionHeats.wods.length > 0 && (
              <div className="cd-heats-filter mb-4">
                <div className="cd-heats-search-wrap">
                  <i className="fas fa-search cd-heats-search-icon"></i>
                  <input
                    type="text"
                    className="cd-input"
                    style={{ paddingLeft: '2.2rem' }}
                    placeholder="Buscar atleta, equipo o caja..."
                    value={filtroHeats}
                    onChange={e => setFiltroHeats(e.target.value)}
                  />
                </div>
                <div className="d-flex align-items-center gap-2">
                  <span className="cd-label mb-0">ESTATUS:</span>
                  {guardando ? (
                    <span className="cd-badge cd-badge--secondary">
                      <i className="fas fa-sync-alt fa-spin"></i>PROCESANDO...
                    </span>
                  ) : configuracionHeats.publicado ? (
                    <span className="cd-badge cd-badge--live blink-soft">
                      <i className="fas fa-cloud-upload-alt"></i>EN VIVO (Público)
                    </span>
                  ) : (
                    <span className="cd-badge cd-badge--draft">
                      <i className="fas fa-file-signature"></i>BORRADOR (Oculto)
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* WOD Blocks */}
            <div className="d-flex flex-column gap-4 mb-5 pb-5">
              {configuracionHeats.wods && [...configuracionHeats.wods].sort((a, b) => a.idWod - b.idWod).map(wod => {
                const esExpanded = itemHeatsAbierto === `wod_${wod.idWod}` || filtroHeats !== '';
                return (
                  <div key={wod.idWod} className="cd-wod-block">
                    <div
                      className={`cd-wod-block-header${esExpanded ? ' cd-wod-block-header--open' : ''}`}
                      onClick={() => setItemHeatsAbierto(esExpanded && filtroHeats === '' ? null : `wod_${wod.idWod}`)}
                    >
                      <div className="d-flex align-items-center gap-3">
                        <span className="cd-wod-block-nombre">{wod.nombreWod}</span>
                        <span className="cd-badge cd-badge--secondary" style={{ borderRadius: '6px' }}>{wod.lista ? wod.lista.length : 0} Heats</span>
                      </div>
                      <div className="d-flex align-items-center gap-3">
                        <span className="cd-wod-block-meta">({wod.config?.carriles || 0} Lanes)</span>
                        <i className={`fas fa-chevron-${esExpanded ? 'up' : 'down'}`} style={{ color: esExpanded ? 'var(--primary)' : 'var(--text-muted)', fontSize: '0.75rem', transition: 'color 0.18s' }}></i>
                      </div>
                    </div>

                    {esExpanded && wod.lista && (
                      <div className="cd-tab-fade p-3">
                        <div className="d-flex justify-content-end gap-2 mb-3 align-items-center">
                          <span className="cd-label mb-0" style={{ color: 'var(--accent)' }}>
                            <i className="fas fa-exclamation-triangle me-1"></i>BOTÓN DE AUXILIO (Este WOD):
                          </span>
                          <button className="cd-btn cd-btn--warning cd-btn--sm" onClick={() => retrasarHeatsEnWod(wod.idWod, 5)}>+5 min</button>
                          <button className="cd-btn cd-btn--warning cd-btn--sm" onClick={() => retrasarHeatsEnWod(wod.idWod, 10)}>+10 min</button>
                          <button className="cd-btn cd-btn--warning cd-btn--sm" onClick={() => retrasarHeatsEnWod(wod.idWod, 15)}>+15 min</button>
                        </div>
                        <div className="d-flex flex-column gap-3">
                          {wod.lista.filter(heat => {
                            if (filtroHeats === '') return true;
                            const bus = filtroHeats.toLowerCase();
                            if (`heat ${heat.numero}`.includes(bus)) return true;
                            if (heat.categoria.toLowerCase().includes(bus)) return true;
                            if (heat.participantes) {
                              return heat.participantes.some(p => p.nombre.toLowerCase().includes(bus) || (p.box && p.box.toLowerCase().includes(bus)));
                            }
                            return false;
                          }).map(heat => (
                            <div key={heat.idHeat} className="cd-heat-card">
                              <div className="cd-heat-header">
                                <div className="d-flex align-items-center gap-2">
                                  <span className="cd-badge cd-badge--heat">HEAT {heat.numero}</span>
                                  <span className="cd-heat-cat">{heat.categoria}</span>
                                </div>
                                <span className="cd-heat-hora"><i className="far fa-clock me-1"></i>{heat.hora}</span>
                              </div>
                              <div className="cd-table-wrap" style={{ borderRadius: 0, border: 'none' }}>
                                <div style={{ overflowX: 'auto' }}>
                                  <table className="cd-table">
                                    <thead>
                                      <tr>
                                        <th style={{ width: '80px', textAlign: 'center' }}>Lane #</th>
                                        <th>Competidor / Equipo</th>
                                        <th>Afiliado / Box</th>
                                        <th>Juez Asignado</th>
                                        <th style={{ textAlign: 'right', paddingRight: '1rem' }}>Acomodo Manual</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {heat.participantes && heat.participantes.map((participante, i) => {
                                        const estaSeleccionado = atletaSwap && atletaSwap.heatId === heat.idHeat && atletaSwap.index === i;
                                        const boxRepetido = participante.box && participante.box.toLowerCase() !== 'independiente' && heat.participantes.filter(p => p.box && p.box.toLowerCase() === participante.box.toLowerCase()).length > 1;

                                        return (
                                          <tr
                                            key={i}
                                            className={`${estaSeleccionado ? 'cd-row--selected' : boxRepetido ? 'cd-row--warn' : ''}`}
                                          >
                                            <td style={{ textAlign: 'center' }}>
                                              <span className={`cd-badge${estaSeleccionado ? ' cd-badge--carril-sel blink-soft' : ' cd-badge--carril'}`}>
                                                {participante.carril}
                                              </span>
                                            </td>
                                            <td>
                                              <div className="d-flex align-items-center gap-2">
                                                <div
                                                  className="d-flex justify-content-center align-items-center rounded-circle"
                                                  style={{ width: 32, height: 32, flexShrink: 0, background: estaSeleccionado ? 'rgba(79,195,247,0.2)' : 'rgba(168,178,209,0.08)', border: `1px solid ${estaSeleccionado ? 'rgba(79,195,247,0.4)' : 'var(--border)'}` }}
                                                >
                                                  <i className={`fas ${estaSeleccionado ? 'fa-people-carry' : 'fa-user'}`} style={{ fontSize: '0.75rem', color: estaSeleccionado ? 'var(--accent-cool)' : 'var(--text-muted)' }}></i>
                                                </div>
                                                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{participante.nombre}</span>
                                                {estaSeleccionado && <span className="cd-badge cd-badge--info cd-btn--xs">MOVIENDO...</span>}
                                              </div>
                                            </td>
                                            <td>
                                              <span className={boxRepetido ? 'blink-soft' : ''} style={{ color: boxRepetido ? 'var(--accent)' : 'var(--text-muted)', fontWeight: boxRepetido ? 700 : 400 }}>
                                                {boxRepetido && <i className="fas fa-exclamation-triangle me-1" style={{ fontSize: '0.72rem' }}></i>}
                                                {participante.box || 'Independiente'}
                                              </span>
                                            </td>
                                            <td>
                                              <select 
                                                className="cd-select cd-select--sm" 
                                                value={participante.idJuez || ''}
                                                onChange={(e) => {
                                                  const newIdJuez = e.target.value;
                                                  const newNombreJuez = e.target.options[e.target.selectedIndex].text;
                                                  
                                                  setConfiguracionHeats(prev => {
                                                    const newWods = [...(prev.wods || [])];
                                                    const wodTarget = newWods.find(w => w.idWod === wod.idWod);
                                                    if(wodTarget) {
                                                      const heatTarget = wodTarget.lista.find(h => h.idHeat === heat.idHeat);
                                                      if(heatTarget) {
                                                        heatTarget.participantes[i].idJuez = newIdJuez;
                                                        heatTarget.participantes[i].nombreJuez = newIdJuez ? newNombreJuez : '';
                                                      }
                                                    }
                                                    return { ...prev, wods: newWods };
                                                  });
                                                }}
                                              >
                                                <option value="">Sin Asignar</option>
                                                {juecesComp.map(j => {
                                                  const juezId = j.id || j.idUsuario || j.IdUsuario;
                                                  const juezNombre = j.nombreCompleto || j.NombreCompleto || `${j.nombre} ${j.apellidos || ''}`.trim();
                                                  // Filtro Anti-clones: ¿Este juez ya está asignado a OTRO carril en ESTE MISMO heat?
                                                  const yaAsignadoAqui = heat.participantes.some((p, indexP) => 
                                                    indexP !== i && p.idJuez && p.idJuez.toString() === juezId.toString()
                                                  );
                                                  return (
                                                    <option 
                                                      key={juezId} 
                                                      value={juezId}
                                                      disabled={yaAsignadoAqui}
                                                    >
                                                      {juezNombre} {yaAsignadoAqui ? '(Ocupado)' : ''}
                                                    </option>
                                                  );
                                                })}
                                              </select>
                                            </td>
                                            <td style={{ textAlign: 'right', paddingRight: '1rem' }}>
                                              <button
                                                className={`cd-btn cd-btn--sm ${estaSeleccionado ? 'cd-btn--primary' : atletaSwap ? 'cd-btn--info blink-soft' : 'cd-btn--outline'}`}
                                                onClick={(e) => { e.stopPropagation(); gestionarSwapMultiWod(heat.idHeat, participante, i, wod.idWod); }}
                                              >
                                                {estaSeleccionado ? <><i className="fas fa-times"></i>Cancelar</> : atletaSwap ? <><i className="fas fa-crosshairs"></i>Cambiar Aquí</> : <i className="fas fa-exchange-alt"></i>}
                                              </button>
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB: LEGAL */}
        {/* ========================================================= */}
        {tabActiva === 'legal' && (
          <div className="cd-tab-fade">
            <div className="cd-section-header">
              <h2 className="cd-section-h">Carta Responsiva</h2>
              <BotonSeguro className="cd-btn cd-btn--success-solid" onClick={() => guardarContenido('Contenido legal')} disabled={guardando} textoProcesando="Guardando...">
                <i className="fas fa-save"></i>GUARDAR CARTA
              </BotonSeguro>
            </div>
            <div className="cd-quill-wrap" style={{ marginBottom: '2rem' }}>
              <ReactQuill
                theme="snow"
                value={carta}
                onChange={setCarta}
                style={{ height: '400px', backgroundColor: 'white' }}
                modules={{ toolbar: [[{ 'header': [1, 2, 3, false] }], ['bold', 'italic', 'underline', 'strike'], [{ 'list': 'ordered' }, { 'list': 'bullet' }], [{ 'color': [] }, { 'background': [] }], ['clean']] }}
              />
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '4rem' }}>
              <i className="fas fa-info-circle me-1"></i>Da formato a tu texto. Los atletas lo verán exactamente así al inscribirse.
            </p>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB: PARÁMETROS Y ESTÁNDARES */}
        {/* ========================================================= */}
        {tabActiva === 'parametros' && (
          <div className="cd-tab-fade">
            <div className="cd-section-header">
              <div>
                <h2 className="cd-section-h">Estándares de Competencia</h2>
                <p className="cd-section-sub">Define los movimientos y pesos oficiales para que los atletas los consulten.</p>
              </div>
              <BotonSeguro className="cd-btn cd-btn--primary" onClick={() => guardarContenido('Estándares')} disabled={guardando} textoProcesando="Guardando...">
                <i className="fas fa-save"></i>GUARDAR TABLA
              </BotonSeguro>
            </div>

            <div className="cd-card">
              <div className="cd-card-header">
                <span className="cd-card-titulo cd-card-titulo--danger">
                  <i className="fas fa-table"></i>Constructor de Requisitos Técnicos
                </span>
                <button onClick={agregarFilaEstandar} className="cd-btn cd-btn--info cd-btn--sm">
                  <i className="fas fa-plus"></i>Agregar Movimiento
                </button>
              </div>
              <div className="cd-card-body p-0">
                {tablaEstandares.length === 0 ? (
                  <div className="p-4">
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '0.75rem' }}>
                      ¿Prefieres escribir los estándares en texto libre en lugar de una tabla? Hazlo aquí:
                    </p>
                    <textarea
                      className="cd-textarea"
                      style={{ minHeight: '200px' }}
                      value={parametros}
                      onChange={(e) => setParametros(e.target.value)}
                      placeholder="Ej: RX: Snatch 135/95lb..."
                    />
                  </div>
                ) : (
                  <div className="cd-table-wrap" style={{ borderRadius: 0, border: 'none' }}>
                    <div style={{ overflowX: 'auto' }}>
                      <table className="cd-table">
                        <thead>
                          <tr>
                            <th style={{ textAlign: 'left', paddingLeft: '1rem' }}>Skill / Movimiento</th>
                            {['Novato', 'Principiante', 'Intermedio', 'Avanzado', 'Master'].map(nivel => (
                              <th key={nivel} style={{ textAlign: 'center', minWidth: '150px' }}>
                                {nivel}<br />
                                <div className="d-flex justify-content-center gap-4 mt-1">
                                  <span style={{ color: 'var(--primary)', fontSize: '10px' }}>HOMBRES</span>
                                  <span style={{ color: 'var(--accent-cool)', fontSize: '10px' }}>MUJERES</span>
                                </div>
                              </th>
                            ))}
                            <th style={{ textAlign: 'right', paddingRight: '1rem' }}>Acción</th>
                          </tr>
                        </thead>
                        <tbody>
                          {tablaEstandares.map((fila, index) => (
                            <tr key={index}>
                              <td style={{ paddingLeft: '1rem' }}>
                                <input
                                  type="text"
                                  className="cd-input cd-input-sm"
                                  placeholder="Ej. Dead Lift"
                                  value={fila.movimiento}
                                  onChange={e => actualizarFilaEstandar(index, 'movimiento', e.target.value)}
                                />
                              </td>
                              {['Novato', 'Principiante', 'Intermedio', 'Avanzado', 'Master'].map(nivel => {
                                const req = fila.requisitos?.[nivel];
                                const valH = typeof req === 'object' && req !== null ? req.h : (req || '');
                                const valM = typeof req === 'object' && req !== null ? req.m : (req || '');
                                return (
                                  <td key={nivel} className="cd-estandar-cell">
                                    <div className="d-flex gap-1 justify-content-center">
                                      <input
                                        type="text"
                                        className="cd-input cd-input-sm cd-input--center cd-input--info w-50"
                                        placeholder="H"
                                        value={valH}
                                        onChange={e => actualizarRequisito(index, nivel, 'h', e.target.value)}
                                      />
                                      <input
                                        type="text"
                                        className="cd-input cd-input-sm cd-input--center cd-input--warning w-50"
                                        placeholder="M"
                                        value={valM}
                                        onChange={e => actualizarRequisito(index, nivel, 'm', e.target.value)}
                                      />
                                    </div>
                                  </td>
                                );
                              })}
                              <td style={{ textAlign: 'right', paddingRight: '1rem' }}>
                                <button onClick={() => quitarFilaEstandar(index)} className="cd-btn cd-btn--ghost">
                                  <i className="fas fa-trash"></i>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB: AUDITORÍA DE SCORES */}
        {/* ========================================================= */}
        {tabActiva === 'auditoria' && <PanelVerificacionScores idCompetencia={id} />}
        {tabActiva === 'auditoria' && (() => {
          const scoresFiltrados = scoresAuditoria.filter(score => {
            const equipoInfo = roster.flatMap(c => c.equipos || c.Equipos || []).find(e => (e.idEquipoComp || e.IdEquipoComp) === score.idEquipoComp);
            const nombreEquipo = equipoInfo ? (equipoInfo.nombre || equipoInfo.Nombre).toLowerCase() : 'desconocido';
            const estatus = score.estatus || score.Estatus || 'Pendiente';

            const pasaBusqueda = filtroAuditoria.busqueda === '' || nombreEquipo.includes(filtroAuditoria.busqueda.toLowerCase());
            const pasaEstatus = filtroAuditoria.estatus === 'Todos' || estatus.toLowerCase() === filtroAuditoria.estatus.toLowerCase();
            const pasaWod = filtroAuditoria.idWod === 'Todos' || score.idWodComp.toString() === filtroAuditoria.idWod;

            return pasaBusqueda && pasaEstatus && pasaWod;
          });

          return (
            <div className="cd-tab-fade">
              <div className="cd-section-header">
                <div>
                  <h2 className="cd-section-h">Auditoría de Jueceo</h2>
                  <p className="cd-section-sub">Supervisa o corrige los puntajes del staff.</p>
                </div>
                <div className="cd-section-actions">
                  <BotonSeguro
                    className={`cd-btn cd-btn--sm ${comp.podioCiego || comp.PodioCiego ? 'cd-btn--primary blink-soft' : 'cd-btn--outline'}`}
                    onClick={togglePodioCiego}
                    textoProcesando="..."
                  >
                    <i className={`fas ${comp.podioCiego || comp.PodioCiego ? 'fa-user-secret' : 'fa-eye'}`}></i>
                    {comp.podioCiego || comp.PodioCiego ? 'SUSPENSO ON' : 'SUSPENSO OFF'}
                  </BotonSeguro>
                  <button className="cd-btn cd-btn--info cd-btn--sm" onClick={cargarAuditoria}>
                    <i className="fas fa-sync-alt"></i>Refrescar
                  </button>
                </div>
              </div>
              <p className="cd-section-sub mb-3">
                <i className="fas fa-info-circle me-1"></i>
                El desglose de scores con <b>firma del atleta</b> y aprobación está arriba, en <b>Verificación de scores</b>. Aquí abajo ves el podio real (sin censura) por categoría.
              </p>

              {vistaAuditoria === 'leaderboard' ? (
                <div className="cd-card">
                  <div className="cd-card-header d-flex justify-content-between align-items-center flex-wrap gap-2" style={{ backgroundColor: 'var(--bg-card-header)' }}>
                    <span className="cd-card-titulo cd-card-titulo--info">
                      <i className="fas fa-chess-king"></i>Posiciones Reales
                    </span>
                    <div className="d-flex gap-2 flex-wrap">
                      {comp.categorias?.map(cat => (
                        <button
                          key={cat.idCategoriaComp}
                          onClick={() => setIdCatActivaLeaderboard(cat.idCategoriaComp)}
                          className={`cd-btn cd-btn--sm ${idCatActivaLeaderboard == cat.idCategoriaComp ? 'cd-btn--info-solid' : 'cd-btn--outline'}`}
                        >
                          {cat.nombre.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="cd-card-body p-0">
                    <div className="cd-table-wrap cd-table-scrollable" style={{ borderRadius: 0, border: 'none' }}>
                      <table className="cd-table">
                        <thead>
                          <tr>
                            <th style={{ paddingLeft: '1rem' }}>Posición / Equipo</th>
                            <th className="text-center">Pts Totales</th>
                            {wods.map(w => (
                              <th key={w.idWodComp || w.IdWodComp} className="text-center">
                                {w.nombre || w.Nombre} <br/> <small style={{fontSize:'0.7rem', color:'var(--text-muted)'}}>{w.tipoCalificacion || w.TipoCalificacion}</small>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {adminLeaderboardCalculado.length === 0 ? (
                            <tr><td colSpan={wods.length + 2} className="text-center p-4">Sin equipos aprobados en esta categoría</td></tr>
                          ) : (
                            adminLeaderboardCalculado.map((eq, index) => {
                              const idEq = eq.idEquipoComp || eq.IdEquipoComp;
                              return (
                                <tr key={idEq}>
                                  <td style={{ paddingLeft: '1rem' }}>
                                    <div className="d-flex align-items-center gap-3">
                                      <span className={`badge ${index === 0 ? 'bg-warning text-dark' : index === 1 ? 'bg-secondary' : index === 2 ? 'bg-danger' : 'bg-dark border'}`} style={{ width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', borderRadius: '50%' }}>
                                        {index + 1}
                                      </span>
                                      <div>
                                        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{eq.nombre || eq.Nombre}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{eq.boxOrigen || eq.BoxOrigen || 'Independiente'}</div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="text-center" style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--accent)' }}>
                                    {eq.puntosTotales}
                                  </td>
                                  {wods.map(w => {
                                    const idWod = w.idWodComp || w.IdWodComp;
                                    const scoreEncontrado = scoresAuditoria.find(s => s.idEquipoComp === idEq && s.idWodComp === idWod && (s.estatus === 'Aprobado' || s.Estatus === 'Aprobado'));
                                    const puntosWod = eq.rankPorWod[idWod]?.[idEq] || 0;
                                    return (
                                      <td key={idWod} className="text-center">
                                        {scoreEncontrado ? (
                                          <div>
                                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{scoreEncontrado.resultado}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{puntosWod} pts</div>
                                          </div>
                                        ) : (
                                          <span style={{ color: 'var(--text-muted)' }}>—</span>
                                        )}
                                      </td>
                                    );
                                  })}
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {/* Filtros */}
              <div className="cd-card mb-4">
                <div className="cd-card-body">
                  <div className="row g-3">
                    <div className="col-md-5">
                      <label className="cd-label">Buscar atleta</label>
                      <div style={{ position: 'relative' }}>
                        <i className="fas fa-search" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '0.8rem', pointerEvents: 'none' }}></i>
                        <input
                          type="text"
                          className="cd-input"
                          style={{ paddingLeft: '2.2rem' }}
                          placeholder="Buscar por atleta..."
                          value={filtroAuditoria.busqueda}
                          onChange={e => setFiltroAuditoria({ ...filtroAuditoria, busqueda: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="col-md-4">
                      <label className="cd-label">WOD</label>
                      <select
                        className="cd-select"
                        value={filtroAuditoria.idWod}
                        onChange={e => setFiltroAuditoria({ ...filtroAuditoria, idWod: e.target.value })}
                      >
                        <option value="Todos">Todos los WODs</option>
                        {wods.map(w => (
                          <option key={w.idWodComp || w.IdWodComp} value={w.idWodComp || w.IdWodComp}>
                            {w.nombre || w.Nombre}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-3">
                      <label className="cd-label">Estatus</label>
                      <select
                        className="cd-select"
                        value={filtroAuditoria.estatus}
                        onChange={e => setFiltroAuditoria({ ...filtroAuditoria, estatus: e.target.value })}
                      >
                        <option value="Todos">Todos</option>
                        <option value="Pendiente">Pendientes</option>
                        <option value="Aprobado">Aprobados</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {cargandoAuditoria ? (
                <div className="cd-empty">
                  <AtletifyLoader />
                </div>
              ) : scoresAuditoria.length === 0 ? (
                <div className="cd-empty">
                  <i className="fas fa-clipboard-check"></i>
                  <h5>Sin scores aún</h5>
                  <p>No hay scores registrados para esta competencia.</p>
                </div>
              ) : scoresFiltrados.length === 0 ? (
                <div className="cd-empty">
                  <i className="fas fa-search-minus"></i>
                  <p>Ningún score coincide con los filtros.</p>
                </div>
              ) : (
                <div className="cd-card">
                  <div className="cd-table-wrap cd-table-scrollable">
                    <table className="cd-table">
                      <thead>
                        <tr>
                          <th style={{ paddingLeft: '1rem' }}>Equipo / Atleta</th>
                          <th>WOD</th>
                          <th style={{ textAlign: 'center' }}>Score</th>
                          <th style={{ textAlign: 'center' }}>Juez</th>
                          <th style={{ textAlign: 'center' }}>Estatus</th>
                          <th style={{ textAlign: 'center' }}>Enviado</th>
                          <th style={{ textAlign: 'right', paddingRight: '1rem' }}>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {scoresFiltrados.map(score => {
                          const equipoInfo = roster.flatMap(c => c.equipos || c.Equipos || []).find(e => (e.idEquipoComp || e.IdEquipoComp) === score.idEquipoComp);
                          const wodInfo = wods.find(w => (w.idWodComp || w.IdWodComp) === score.idWodComp);
                          const estatus = score.estatus || score.Estatus || 'Pendiente';

                          return (
                            <tr key={score.idPuntuacion}>
                              <td style={{ paddingLeft: '1rem', fontWeight: 600 }}>
                                {equipoInfo ? (equipoInfo.nombre || equipoInfo.Nombre) : 'Equipo Desconocido'}
                              </td>
                              <td>
                                <span className="cd-badge cd-badge--secondary">
                                  {wodInfo ? (wodInfo.nombre || wodInfo.Nombre) : 'WOD Borrado'}
                                </span>
                              </td>
                              <td style={{ textAlign: 'center', fontFamily: 'var(--font-stats)', fontWeight: 700, fontSize: '1.05rem', color: 'var(--accent-cool)' }}>
                                {score.resultado}
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                  <i className="fas fa-user-tag me-1"></i>
                                  {score.nombreJuez || score.NombreJuez || 'Sin Juez'}
                                </span>
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <span className={`cd-badge ${estatus === 'Aprobado' ? 'cd-badge--success' : 'cd-badge--warning'}`}>
                                  {estatus.toUpperCase()}
                                </span>
                              </td>
                              <td style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                {score.fechaEnvio ? new Date(score.fechaEnvio).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '--'}
                              </td>
                              <td style={{ textAlign: 'right', paddingRight: '1rem' }}>
                                <div className="d-inline-flex gap-1 me-2">
                                  <BotonSeguro
                                    className="cd-btn cd-btn--success-solid cd-btn--xs"
                                    disabled={estatus === 'Aprobado'}
                                    onClick={() => cambiarEstatusScore(score.idPuntuacion, 'Aprobado')}
                                    textoProcesando=""
                                  >
                                    <i className="fas fa-check"></i>
                                  </BotonSeguro>
                                  <BotonSeguro
                                    className="cd-btn cd-btn--outline cd-btn--xs"
                                    disabled={estatus === 'Pendiente'}
                                    onClick={() => cambiarEstatusScore(score.idPuntuacion, 'Pendiente')}
                                    textoProcesando=""
                                  >
                                    <i className="fas fa-clock"></i>
                                  </BotonSeguro>
                                </div>
                                <BotonSeguro
                                  className="cd-btn cd-btn--info cd-btn--sm"
                                  onClick={() => corregirScore(score.idWodComp, score.idEquipoComp, score.resultado)}
                                  textoProcesando="..."
                                >
                                  <i className="fas fa-edit"></i>Corregir
                                </BotonSeguro>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
                </>
              )}
            </div>
          );
        })()}

        {/* ========================================================= */}
        {/* TAB: DISEÑO DE WODS */}
        {/* ========================================================= */}
        {tabActiva === 'wods' && (
          <div className="cd-tab-fade">
            <div className="cd-section-header">
              <div>
                <h2 className="cd-section-h">Diseño de <span>WODs</span></h2>
                <p className="cd-section-sub">Crea los entrenamientos que se calificarán en el Leaderboard.</p>
              </div>
            </div>

            {/* Abrir el constructor de WOD rico */}
            <div className="cd-card cd-card--info mb-5">
              <div className="cd-card-body-lg d-flex justify-content-between align-items-center flex-wrap gap-3">
                <span className="cd-section-sub" style={{ margin: 0 }}>
                  Cada WOD define su tipo de score, movimientos, pesos por género, time cap, desempate y checklist de jueceo.
                </span>
                <button className="cd-btn cd-btn--info-solid" onClick={() => setConstructorWod({ abierto: true, idWod: null })}>
                  <i className="fas fa-plus"></i> Diseñar WOD
                </button>
              </div>
            </div>

            {/* Lista de WODs */}
            <div className="cd-section-header" style={{ borderBottom: '1px solid var(--border)', marginBottom: '1.25rem' }}>
              <span className="cd-card-titulo cd-card-titulo--white" style={{ fontSize: '0.85rem' }}>Entrenamientos Oficiales</span>
            </div>

            {cargandoWods ? (
              <div className="cd-empty"><AtletifyLoader /></div>
            ) : wods.length === 0 ? (
              <div className="cd-empty">
                <i className="fas fa-dumbbell"></i>
                <p>Aún no has diseñado ningún WOD para este evento.</p>
              </div>
            ) : (
              <div className="row g-4">
                {wods.map(wod => {
                  const idWod = wod.idWodComp || wod.IdWodComp;
                  const tipo = wod.tipoCalificacion || wod.TipoCalificacion;
                  const tipoCls = getTipoBadgeClass(tipo);

                  return (
                    <div key={idWod} className="col-md-6 col-lg-4">
                      <div className="cd-wod-card">
                        <div className={`cd-wod-tip cd-wod-tip--${tipoCls}`}></div>
                        <div className="d-flex justify-content-between align-items-start mb-2">
                          <h5 className="cd-wod-nombre">{wod.nombre || wod.Nombre}</h5>
                          <div className="d-flex gap-2">
                            <button
                              className="cd-btn cd-btn--ghost"
                              title="Editar WOD"
                              onClick={() => setConstructorWod({ abierto: true, idWod })}
                            >
                              <i className="fas fa-pen"></i>
                            </button>
                            <BotonSeguro
                              onClick={() => eliminarWod(idWod)}
                              className="cd-btn cd-btn--ghost"
                              title="Eliminar WOD"
                              textoProcesando=""
                            >
                              <i className="fas fa-trash"></i>
                            </BotonSeguro>
                          </div>
                        </div>
                        <div className={`cd-tipo-badge cd-tipo-badge--${tipoCls}`}>
                          <i className={`fas ${getTipoIcon(tipo)}`}></i>
                          {tipo.toUpperCase()}
                        </div>
                        <p className="cd-wod-desc">{wod.descripcion || wod.Descripcion || 'Sin descripción.'}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {constructorWod.abierto && (
              <ConstructorWodComp
                idCompetencia={id}
                categorias={comp?.categorias || comp?.Categorias || []}
                idWodEditar={constructorWod.idWod}
                onCerrar={() => setConstructorWod({ abierto: false, idWod: null })}
                onGuardado={cargarWods}
                onClonado={(nuevoId) => setConstructorWod({ abierto: true, idWod: nuevoId })}
              />
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB: JUECES */}
        {/* ========================================================= */}
        {tabActiva === 'jueces' && (
          <GestionJuecesCompPanel idCompetencia={id} />
        )}

        {/* ========================================================= */}
        {/* TAB: STAFF OPERATIVO */}
        {/* ========================================================= */}
        {tabActiva === 'staff' && (
          <GestionStaffCompePanel idCompetencia={id} />
        )}
          </>
        )}
      </div>

      {selectorHerramientaAbierto && createPortal(
        <div
          className="cd-herramienta-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSelectorHerramientaAbierto(false);
              setBusquedaHerramienta('');
              setFiltroUnidadHerramienta('todos');
              setFiltroTipoHerramienta('todos');
            }
          }}
        >
          <div className="cd-herramienta-modal">
            <div className="cd-herramienta-modal-head">
              <h3 className="cd-herramienta-modal-title">
                <i className="fas fa-toolbox"></i>Herramientas del box
              </h3>
              <button
                type="button"
                className="cd-btn cd-btn--ghost"
                onClick={() => {
                  setSelectorHerramientaAbierto(false);
                  setBusquedaHerramienta('');
                  setFiltroUnidadHerramienta('todos');
                  setFiltroTipoHerramienta('todos');
                }}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="cd-herramienta-modal-search">
              <i className="fas fa-search"></i>
              <input
                type="text"
                className="cd-input"
                placeholder="Buscar por nombre, peso, unidad, notas..."
                value={busquedaHerramienta}
                onChange={(e) => setBusquedaHerramienta(e.target.value)}
                autoFocus
              />
            </div>

            <div className="cd-herramienta-modal-filtros">
              <div className="cd-herramienta-filtro-grupo">
                <span className="cd-herramienta-filtro-label">Unidad:</span>
                <div className="cd-herramienta-filtro-chips">
                  {[
                    { key: 'todos', label: 'Todos' },
                    { key: 'kg',  label: 'kg' },
                    { key: 'lb',  label: 'lb' },
                    { key: 'm',   label: 'm' },
                    { key: 'maq', label: 'Máq.' },
                  ].map(({ key, label }) => (
                    <button
                      key={key}
                      type="button"
                      className={`cd-filtro-chip${filtroUnidadHerramienta === key ? ' cd-filtro-chip--active' : ''}`}
                      onClick={() => setFiltroUnidadHerramienta(key)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="cd-herramienta-filtro-grupo">
                <span className="cd-herramienta-filtro-label">Tipo:</span>
                <div className="cd-herramienta-filtro-chips">
                  {[
                    { key: 'todos',      label: 'Todos' },
                    { key: 'barra',      label: 'Barra' },
                    { key: 'bumper',     label: 'Disco/Bumper' },
                    { key: 'kettlebell', label: 'Kettlebell' },
                    { key: 'mancuerna',  label: 'Mancuerna' },
                    { key: 'pelota',     label: 'Pelota' },
                    { key: 'cajon',      label: 'Cajón' },
                    { key: 'otra',       label: 'Otro' },
                  ].map(({ key, label }) => (
                    <button
                      key={key}
                      type="button"
                      className={`cd-filtro-chip${filtroTipoHerramienta === key ? ' cd-filtro-chip--active' : ''}`}
                      onClick={() => setFiltroTipoHerramienta(key)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="cd-herramienta-modal-lista">
              {herramientasFiltradas.length === 0 ? (
                <div className="cd-empty" style={{ minHeight: '160px' }}>
                  <i className="fas fa-search-minus"></i>
                  <p>No hay herramientas que coincidan con tu búsqueda.</p>
                </div>
              ) : (
                herramientasFiltradas.map(h => {
                  const idH = h.idHerramienta ?? h.IdHerramienta;
                  const nombre = h.nombre ?? h.Nombre;
                  const cantidad = Number(h.cantidad ?? h.Cantidad ?? 0);
                  const medidaTexto = getHerramientaMedidaTexto(h);
                  const descripcion = getHerramientaDescripcion(h);
                  return (
                    <button
                      key={idH}
                      type="button"
                      className="cd-herramienta-item"
                      onClick={() => {
                        setFormMaterialComp(prev => ({ ...prev, idHerramienta: String(idH) }));
                        setSelectorHerramientaAbierto(false);
                      }}
                    >
                      <div className="cd-herramienta-item-top">
                        <span className="cd-herramienta-item-nombre">{nombre}</span>
                        <span className="cd-badge cd-badge--info">Disponible: {cantidad}</span>
                      </div>
                      <div className="d-flex align-items-center gap-2 flex-wrap mb-2">
                        <span className="cd-badge cd-badge--outline">
                          <i className="fas fa-weight-hanging"></i>
                          Peso/Unidad: {medidaTexto}
                        </span>
                      </div>
                      <div className="cd-herramienta-item-notas">
                        <span className="cd-herramienta-item-notas-label">Notas:</span>{' '}
                        {descripcion || 'Sin notas registradas.'}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      <CompDetalleSideMenu
        isOpen={sideMenuOpen}
        onClose={() => setSideMenuOpen(false)}
        items={menuItems}
        activeItem={tabActiva}
        onItemClick={(id) => {
          setTabActiva(id);
          setModoEdicion(false);
          setSideMenuOpen(false);
        }}
      />
    </div>
  );
}
