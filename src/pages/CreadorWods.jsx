import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import RedGrayDatePicker from '../components/RedGrayDatePicker';
import HoraPicker, { formatear12 } from '../components/HoraPicker';
import BackButton from '../components/BackButton';
import ModoRankingPicker from '../components/ModoRankingPicker';
import MetricaGanarPicker from '../components/MetricaGanarPicker';
import TipoBloquePicker from '../components/TipoBloquePicker';
import ModalidadBloquePicker from '../components/ModalidadBloquePicker';
import EquipoBloquePicker from '../components/EquipoBloquePicker';
import EjercicioPicker from '../components/EjercicioPicker';
import BotonSeguro from '../components/BotonSeguro';
import TimeInputMMSS from '../components/TimeInputMMSS';
import AutoTextarea from '../components/AutoTextarea';
import { api } from '../services/api';
import '../assets/css/CreadorWods.css';

const API_BASE = import.meta.env.VITE_API_URL;;

const getFechaLocalString = () => {
  const hoy = new Date();
  return hoy.getFullYear() + '-' +
    String(hoy.getMonth() + 1).padStart(2, '0') + '-' +
    String(hoy.getDate()).padStart(2, '0');
};

// Arma los bloques (con su plantillaJueceo procesada y serializada) para el payload.
// Lo usan tanto "Guardar WOD" como "Guardar como plantilla" — mismo shape de BloqueDto.
function construirBloquesPayload(bloques, modoRanking, metricaPrincipal) {
  return bloques.map(b => {
    let plantillaFinal = b.plantillaJueceo;
    if (modoRanking === 'Auto') {
      if (metricaPrincipal === 'Tiempo') plantillaFinal = ['Tiempo Total (MM:SS)'];
      else if (metricaPrincipal === 'Peso') plantillaFinal = ['Peso Máximo'];
      else if (metricaPrincipal === 'Reps') plantillaFinal = ['Total Repeticiones'];
      else if (metricaPrincipal === 'RondasReps') plantillaFinal = ['Rondas', 'Repeticiones'];
    } else {
      if (plantillaFinal.length === 0) plantillaFinal = ['Score Principal'];
    }
    return {
      ...b,
      capTimeMinutos: b.capTimeMinutos || null,
      minutosExtraCap: b.minutosExtraCap ? parseInt(b.minutosExtraCap) : null,
      rondas: b.rondas ? parseInt(b.rondas) : null,
      requiereScore: b.requiereScore !== false,
      ejercicios: b.ejercicios.filter(ej => ej.idEjercicio !== '' && ej.idEjercicio != null).map((ej, idx) => ({
        ...ej,
        idEjercicioDiccionario: parseInt(ej.idEjercicio),
        orden: idx,
        // Complex (Opción A): se agrupan por grupoComplex; nombre/esquema se repiten en el grupo.
        grupoComplex: ej.grupoComplex ?? null,
        nombreComplex: ej.nombreComplex || null,
        esquemaComplex: ej.esquemaComplex || null
      })),
      plantillaJueceo: JSON.stringify(plantillaFinal)
    };
  });
}

export default function CreadorWods() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fechaParam = searchParams.get('fecha');
  const fechaLimpia = fechaParam ? fechaParam.substring(0, 10) : getFechaLocalString();
  const plantillaParam = searchParams.get('plantilla');

  // Si viene ?plantilla={id}, el creador entra en "modo edición de plantilla"
  const [editandoPlantillaId, setEditandoPlantillaId] = useState(null);

  const [box, setBox] = useState(null);
  const [glosarioEjercicios, setGlosarioEjercicios] = useState([]);
  const [clasesDisponibles, setClasesDisponibles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modoRanking, setModoRanking] = useState('Auto');
  const [metricaPrincipal, setMetricaPrincipal] = useState('Tiempo');
  // Día sin métrica (descarga/cardio/pierna libre): solo asistencia, sin score.
  const [requiereScore, setRequiereScore] = useState(true);
  // Publicación manual: "PorLugar" (asignar posiciones) | "Alfabetico" (por nombre, sin ordenar).
  const [estiloPublicacion, setEstiloPublicacion] = useState('PorLugar');
  // Biblioteca de complex reutilizables del box + qué bloque tiene abierto el selector.
  const [complexGuardados, setComplexGuardados] = useState([]);
  const [complexPickerBloque, setComplexPickerBloque] = useState(null);

  // WOD personalizado: asignar a atletas específicos en vez de clases.
  const [esPersonal, setEsPersonal] = useState(false);
  const [miembrosBox, setMiembrosBox] = useState([]);
  const [atletasSeleccionados, setAtletasSeleccionados] = useState([]);
  const [busquedaAtleta, setBusquedaAtleta] = useState('');

  const [titulo, setTitulo] = useState('WOD del Día');
  // 👈 USAMOS LA FUNCIÓN LOCAL EN LUGAR DE .toISOString()
  const [fechaProgramada, setFechaProgramada] = useState(fechaLimpia);
  const [estaPublicado, setEstaPublicado] = useState(true);
  const [notasAdicionales, setNotasAdicionales] = useState('');
  const [clasesSeleccionadas, setClasesSeleccionadas] = useState([]);

  // Revelación programada del WOD al atleta
  const [modoRevelacion, setModoRevelacion] = useState('Inmediato'); // 'Inmediato' | 'HoraFija' | 'PorClase'
  const [horaRevelacion, setHoraRevelacion] = useState('');          // "HH:mm" para HoraFija
  const [horasRevelacionClase, setHorasRevelacionClase] = useState({}); // { [idClase]: "HH:mm" } para PorClase

  // Modal "Guardar como plantilla"
  const [showModalPlantilla, setShowModalPlantilla] = useState(false);
  const [nombrePlantilla, setNombrePlantilla] = useState('');
  const [descripcionPlantilla, setDescripcionPlantilla] = useState('');

  // EL ROMPECABEZAS (Ahora incluye la Plantilla de Jueceo)
  const [bloques, setBloques] = useState([
    {
      tipoBloque: 'WOD',
      tipoModalidad: 'For Time',
      modalidadEquipo: 'Individual',
      capTimeMinutos: '',
      minutosExtraCap: '',
      rondas: '',           // <--- nº de rondas de la sección (5 RFT, 10 rondas…)
      requiereScore: true,  // <--- override por sección del estado "sin score"
      descripcionLibre: '',
      ejercicios: [],
      plantillaJueceo: [], // <--- AQUÍ GUARDAMOS LAS MÉTRICAS (Ej: ["Split R1", "Tiempo Total"])
      inputMetrica: '' // <--- Para controlar lo que escribe el coach antes de darle a "+"
    }
  ]);

  useEffect(() => {
    const b = JSON.parse(localStorage.getItem('box'));
    const u = JSON.parse(localStorage.getItem('usuario'));
    if (!b || !u || (u.rol !== 'AdminBox' && u.rol !== 'Coach' && u.rol !== 'Developer')) {
      navigate('/');
      return;
    }
    setBox(b);
    cargarDatos(b.idBox);
  }, [navigate]);

  // Modo edición de plantilla: cargar el molde y precargar el formulario
  useEffect(() => {
    if (!box || !plantillaParam) return;
    (async () => {
      try {
        const p = await api.obtenerPlantilla(plantillaParam);
        setEditandoPlantillaId(p.idPlantilla);
        setTitulo(p.nombre || 'Plantilla');
        setDescripcionPlantilla(p.descripcion || '');
        setModoRanking(p.modoRanking || 'Auto');
        setMetricaPrincipal(p.metricaPrincipal || 'Tiempo');
        const bloquesParseados = (p.bloques || []).map(b => {
          let jueceo = ['Score Principal'];
          try { if (b.plantillaJueceo) jueceo = JSON.parse(b.plantillaJueceo); } catch (e) { /* fallback */ }
          return {
            tipoBloque: b.tipoBloque,
            tipoModalidad: b.tipoModalidad,
            modalidadEquipo: b.modalidadEquipo,
            capTimeMinutos: b.capTimeMinutos || '',
            minutosExtraCap: b.minutosExtraCap || '',
            rondas: b.rondas != null ? String(b.rondas) : '',
            requiereScore: b.requiereScore !== false,
            descripcionLibre: b.descripcionLibre || '',
            plantillaJueceo: Array.isArray(jueceo) ? jueceo : ['Score Principal'],
            inputMetrica: '',
            ejercicios: (b.ejercicios || []).map(ej => ({
              idEjercicio: String(ej.idEjercicioDiccionario ?? ''),
              esquemaRepeticiones: ej.esquemaRepeticiones || '',
              pesoSugerido: ej.pesoSugerido || '',
              grupoComplex: ej.grupoComplex ?? null,
              nombreComplex: ej.nombreComplex || '',
              esquemaComplex: ej.esquemaComplex || ''
            }))
          };
        });
        if (bloquesParseados.length > 0) setBloques(bloquesParseados);
      } catch (e) {
        alert('No se pudo cargar la plantilla.');
        navigate('/wods-guardados');
      }
    })();
  }, [box, plantillaParam, navigate]);

  async function cargarDatos(idBox) {
    try {
      const [ejerciciosDiccionario, resCl] = await Promise.all([
        api.obtenerEjerciciosDiccionario().catch(() => []),
        fetch(`${API_BASE}/clases/box/${idBox}`)
      ]);

      const ejerciciosMovimientos = Array.isArray(ejerciciosDiccionario)
        ? ejerciciosDiccionario.map(ej => ({
          idEjercicio: ej.id,
          nombre: ej.nombre,
          equipamiento: ej.equipamiento,
          categoria: ej.categoria,
        }))
        : [];

      setGlosarioEjercicios(ejerciciosMovimientos);

      if (resCl.ok) {
        const data = await resCl.json();
        setClasesDisponibles(Array.isArray(data) ? data : (data.data || []));
      }

      cargarComplexGuardados(idBox);
      cargarMiembros(idBox);
    } catch (err) { console.error("Error cargando catálogos", err); }
  }

  async function cargarMiembros(idBox) {
    try {
      const res = await fetch(`${API_BASE}/usuarios/box/${idBox}/miembros`);
      if (res.ok) {
        const data = await res.json();
        setMiembrosBox(Array.isArray(data.miembros) ? data.miembros : []);
      }
    } catch (e) { /* opcional */ }
  }

  async function cargarComplexGuardados(idBox) {
    try {
      const lista = await api.obtenerComplexGuardados(idBox);
      setComplexGuardados(Array.isArray(lista) ? lista : []);
    } catch (e) { /* biblioteca opcional, no bloquea el creador */ }
  }

  const toggleClase = (idClase) => setClasesSeleccionadas(prev => prev.includes(idClase) ? prev.filter(id => id !== idClase) : [...prev, idClase]);
  const toggleAtleta = (idAtleta) => setAtletasSeleccionados(prev => prev.includes(idAtleta) ? prev.filter(id => id !== idAtleta) : [...prev, idAtleta]);
  const seleccionarTodasClases = () => setClasesSeleccionadas(clasesSeleccionadas.length === clasesDisponibles.length ? [] : clasesDisponibles.map(c => c.idClase));

  const agregarBloque = () => {
    setBloques([...bloques, {
      tipoBloque: 'Warm-Up', tipoModalidad: 'Not For Time', modalidadEquipo: 'Individual',
      capTimeMinutos: '', minutosExtraCap: '', rondas: '', requiereScore: true,
      descripcionLibre: '', ejercicios: [], plantillaJueceo: [], inputMetrica: ''
    }]);
  };

  const actualizarBloque = (index, campo, valor) => {
    const nuevos = [...bloques];
    nuevos[index][campo] = valor;
    setBloques(nuevos);
  };

  const quitarBloque = (index) => setBloques(bloques.filter((_, i) => i !== index));

  const ejercicioVacio = (extra = {}) => ({
    idEjercicio: '', esquemaRepeticiones: '', pesoSugerido: '',
    grupoComplex: null, nombreComplex: '', esquemaComplex: '', ...extra
  });

  const agregarEjercicioABloque = (bloqueIndex) => {
    const nuevos = [...bloques];
    nuevos[bloqueIndex].ejercicios.push(ejercicioVacio());
    setBloques(nuevos);
  };

  const actualizarEjercicio = (bloqueIndex, ejIndex, campo, valor) => {
    const nuevos = [...bloques];
    nuevos[bloqueIndex].ejercicios[ejIndex][campo] = valor;
    setBloques(nuevos);
  };

  const quitarEjercicio = (bloqueIndex, ejIndex) => {
    const nuevos = [...bloques];
    nuevos[bloqueIndex].ejercicios = nuevos[bloqueIndex].ejercicios.filter((_, i) => i !== ejIndex);
    setBloques(nuevos);
  };

  // --- COMPLEX (varios ejercicios = 1 unidad) ---
  // Siguiente id de grupo libre dentro del bloque.
  const siguienteGrupoComplex = (bloque) => {
    const grupos = bloque.ejercicios.map(e => e.grupoComplex).filter(g => g != null);
    return (grupos.length ? Math.max(...grupos) : 0) + 1;
  };

  const agregarComplexABloque = (bIndex) => {
    const nuevos = [...bloques];
    const grupo = siguienteGrupoComplex(nuevos[bIndex]);
    // Un complex arranca con 2 movimientos (ej. "1 power clean + 1 push press").
    nuevos[bIndex].ejercicios.push(ejercicioVacio({ grupoComplex: grupo, esquemaRepeticiones: '1' }));
    nuevos[bIndex].ejercicios.push(ejercicioVacio({ grupoComplex: grupo, esquemaRepeticiones: '1' }));
    setBloques(nuevos);
  };

  const agregarMovimientoAComplex = (bIndex, grupo) => {
    const nuevos = [...bloques];
    const ref = nuevos[bIndex].ejercicios.find(e => e.grupoComplex === grupo) || {};
    // Insertamos el nuevo movimiento justo después del último del grupo (mantener contigüidad).
    let ultimoIdx = -1;
    nuevos[bIndex].ejercicios.forEach((e, i) => { if (e.grupoComplex === grupo) ultimoIdx = i; });
    const nuevo = ejercicioVacio({ grupoComplex: grupo, esquemaRepeticiones: '1', nombreComplex: ref.nombreComplex || '', esquemaComplex: ref.esquemaComplex || '' });
    nuevos[bIndex].ejercicios.splice(ultimoIdx + 1, 0, nuevo);
    setBloques(nuevos);
  };

  // Nombre/esquema del complex se guardan en TODOS los miembros del grupo.
  const actualizarComplexMeta = (bIndex, grupo, campo, valor) => {
    const nuevos = [...bloques];
    nuevos[bIndex].ejercicios.forEach(e => { if (e.grupoComplex === grupo) e[campo] = valor; });
    setBloques(nuevos);
  };

  const quitarComplex = (bIndex, grupo) => {
    const nuevos = [...bloques];
    nuevos[bIndex].ejercicios = nuevos[bIndex].ejercicios.filter(e => e.grupoComplex !== grupo);
    setBloques(nuevos);
  };

  // Inserta un complex de la biblioteca como un grupo nuevo dentro del bloque.
  const insertarComplexGuardado = (bIndex, complex) => {
    const nuevos = [...bloques];
    const grupo = siguienteGrupoComplex(nuevos[bIndex]);
    (complex.ejercicios || []).forEach(e => {
      nuevos[bIndex].ejercicios.push(ejercicioVacio({
        idEjercicio: String(e.idEjercicioDiccionario ?? ''),
        esquemaRepeticiones: e.esquemaRepeticiones || '1',
        pesoSugerido: e.pesoSugerido || '',
        grupoComplex: grupo,
        nombreComplex: complex.nombre || '',
        esquemaComplex: complex.esquemaRepeticiones || ''
      }));
    });
    setBloques(nuevos);
    setComplexPickerBloque(null);
  };

  // Guarda un complex del bloque en la biblioteca del box (reutilizable).
  const guardarComplexEnBiblioteca = async (bIndex, grupo) => {
    if (!box) return;
    const miembros = bloques[bIndex].ejercicios.filter(e => e.grupoComplex === grupo && e.idEjercicio !== '' && e.idEjercicio != null);
    if (miembros.length < 2) { alert('El complex necesita al menos 2 movimientos con ejercicio elegido.'); return; }
    const ref = miembros[0];
    const nombre = (ref.nombreComplex || '').trim();
    if (!nombre) { alert('Ponle un nombre al complex para guardarlo (ej. "DT").'); return; }
    try {
      await api.crearComplexGuardado({
        idBox: box.idBox,
        nombre,
        esquemaRepeticiones: ref.esquemaComplex || null,
        ejercicios: miembros.map(m => ({
          idEjercicioDiccionario: parseInt(m.idEjercicio),
          esquemaRepeticiones: m.esquemaRepeticiones || null,
          pesoSugerido: m.pesoSugerido || null
        }))
      });
      alert(`Complex "${nombre}" guardado en tu biblioteca.`);
      cargarComplexGuardados(box.idBox);
    } catch (e) {
      alert(e.message || 'No se pudo guardar el complex.');
    }
  };

  // --- MAGIA DE LA PLANTILLA DE JUECEO ---
  const agregarMetrica = (bIndex) => {
    const nuevos = [...bloques];
    if (nuevos[bIndex].inputMetrica.trim() !== '') {
      nuevos[bIndex].plantillaJueceo.push(nuevos[bIndex].inputMetrica.trim());
      nuevos[bIndex].inputMetrica = ''; // Limpiamos el input
      setBloques(nuevos);
    }
  };

  const quitarMetrica = (bIndex, mIndex) => {
    const nuevos = [...bloques];
    nuevos[bIndex].plantillaJueceo = nuevos[bIndex].plantillaJueceo.filter((_, i) => i !== mIndex);
    setBloques(nuevos);
  };

  // --- GUARDAR WOD ---
  const handleGuardar = async (e) => {
    e.preventDefault();
    // En modo edición de plantilla, el submit del form guarda la plantilla (no un WOD)
    if (editandoPlantillaId) { guardarEdicionPlantilla(); return; }
    setLoading(true);

    const bloquesLimpios = construirBloquesPayload(bloques, modoRanking, metricaPrincipal);

    // Modo de revelación final: "Programar hora" se resuelve a PorClase si hay clases, o HoraFija si no.
    const modoRevFinal = !estaPublicado ? 'Inmediato'
      : modoRevelacion === 'Inmediato' ? 'Inmediato'
      : (clasesSeleccionadas.length > 0 ? 'PorClase' : 'HoraFija');

    //  TRUCO DE ZONA HORARIA: Forzamos el mediodía (T12:00:00Z) para que no cambie de día
    //  MANDAMOS LA FECHA COMO TEXTO PURO (Ej. "2026-03-21"), SIN ZONAS HORARIAS
    const payload = {
      idBox: box.idBox,
      titulo,
      fechaProgramada: fechaProgramada.substring(0, 10),
      estaPublicado,
      notasAdicionales,
      clasesIds: esPersonal ? [] : clasesSeleccionadas,
      esPersonal,
      atletasIds: esPersonal ? atletasSeleccionados : [],
      bloques: bloquesLimpios,
      modoRanking: modoRanking,
      metricaPrincipal: modoRanking === 'Auto' ? metricaPrincipal : null,
      rankingPublicado: modoRanking === 'Auto' ? true : false, // Si es automático, se publica de inmediato. Si es manual, espera a que el coach publique la pizarra.
      requiereScore: requiereScore, // Día sin métrica: solo asistencia, sin score.
      estiloPublicacionManual: modoRanking === 'Manual' ? estiloPublicacion : 'PorLugar',
      // Revelación programada al atleta
      modoRevelacion: modoRevFinal,
      horaRevelacion: modoRevFinal === 'HoraFija' ? (horaRevelacion || null) : null,
      revelacionesClase: modoRevFinal === 'PorClase'
        ? clasesSeleccionadas.map(id => ({ idClase: id, horaRevelacion: horasRevelacionClase[id] || null }))
        : null
    };

    try {
      const res = await fetch(`${API_BASE}/entrenamientos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        alert("¡WOD guardado con su Plantilla de Jueceo!");
        navigate('/calendario-wods');
      } else {
        const err = await res.json();
        alert(err.mensaje || "Error al guardar");
      }
    } catch (err) { alert("Error de conexión"); }
    finally { setLoading(false); }
  };

  // Abre el modal de plantilla precargando el nombre con el título actual del WOD
  const abrirModalPlantilla = () => {
    setNombrePlantilla(titulo);
    setDescripcionPlantilla('');
    setShowModalPlantilla(true);
  };

  // --- GUARDAR CAMBIOS DE UNA PLANTILLA EXISTENTE (PUT) ---
  const guardarEdicionPlantilla = async () => {
    if (!box || !editandoPlantillaId) return;
    const payload = {
      idBox: box.idBox,
      nombre: (titulo || 'Plantilla').trim(),
      descripcion: descripcionPlantilla.trim() || null,
      modoRanking,
      metricaPrincipal: modoRanking === 'Auto' ? metricaPrincipal : null,
      bloques: construirBloquesPayload(bloques, modoRanking, metricaPrincipal)
    };
    try {
      await api.actualizarPlantilla(editandoPlantillaId, payload);
      alert('Plantilla actualizada.');
      navigate('/wods-guardados');
    } catch (err) {
      alert(err.message || 'Error al actualizar la plantilla');
    }
  };

  // --- GUARDAR COMO PLANTILLA (molde reutilizable, sin fecha ni clases) ---
  const guardarComoPlantilla = async () => {
    if (!box) return;
    const payload = {
      idBox: box.idBox,
      nombre: (nombrePlantilla || titulo || 'Plantilla').trim(),
      descripcion: descripcionPlantilla.trim() || null,
      modoRanking,
      metricaPrincipal: modoRanking === 'Auto' ? metricaPrincipal : null,
      bloques: construirBloquesPayload(bloques, modoRanking, metricaPrincipal)
    };
    try {
      await api.crearPlantilla(payload);
      setShowModalPlantilla(false);
      alert('Plantilla guardada. Aplícala a cualquier día desde "WODs guardados".');
      navigate('/wods-guardados');
    } catch (err) {
      alert(err.message || 'Error al guardar la plantilla');
    }
  };

  // Mapa de tipoBloque → clase CSS
  const bloqueColorClass = (tipo) => ({
    'WOD': 'crw-bloque--wod',
    'Warm-Up': 'crw-bloque--warmup',
    'Fuerza/Skill': 'crw-bloque--fuerza',
    'Cash-Out': 'crw-bloque--cashout'
  }[tipo] || 'crw-bloque--warmup');

  // Una fila de movimiento (reps + ejercicio + peso). Se usa suelta o dentro de un complex.
  const renderFilaEjercicio = (bIndex, ej, eIndex) => {
    const ejercicioInfo = glosarioEjercicios.find(g => g.idEjercicio == ej.idEjercicio);
    const categoria = ejercicioInfo?.categoria || '';
    let placeholderReps = "Ej: 1km, 21";
    const regexFiltro = /[^0-9a-zA-Z%/.\-\s]/g;
    if (categoria === 'Monostructural') placeholderReps = "Ej: 400m, 15cal";
    else if (categoria === 'Weightlifting' || categoria === 'Gymnastics') placeholderReps = "Ej: 4x12, 21-15";

    return (
      <div key={eIndex} className="crw-ejercicio-row row g-2 align-items-center">
        <div className="col-4 col-sm-3 col-md-2">
          <input
            type="text"
            className="crw-reps-input"
            placeholder={placeholderReps}
            value={ej.esquemaRepeticiones}
            maxLength="5"
            onChange={e => actualizarEjercicio(bIndex, eIndex, 'esquemaRepeticiones', e.target.value.replace(regexFiltro, ''))}
          />
        </div>
        <div className="col-8 col-sm-9 col-md-5">
          <EjercicioPicker
            ejercicios={glosarioEjercicios}
            valor={ej.idEjercicio}
            onCambiar={v => actualizarEjercicio(bIndex, eIndex, 'idEjercicio', v)}
          />
        </div>
        <div className="col-9 col-sm-8 col-md-4">
          <input
            type="text"
            className="crw-peso-input"
            placeholder="Ej: 70%, 50kg"
            value={ej.pesoSugerido}
            maxLength="10"
            onChange={e => actualizarEjercicio(bIndex, eIndex, 'pesoSugerido', e.target.value.replace(/[^0-9a-zA-Z%/.\-\s]/g, ''))}
          />
        </div>
        <div className="col-3 col-sm-4 col-md-1 text-center">
          <button type="button" onClick={() => quitarEjercicio(bIndex, eIndex)} className="crw-delete-ej-btn">
            <i className="fas fa-times-circle fs-5"></i>
          </button>
        </div>
      </div>
    );
  };

  // Tarjeta de un complex (varios movimientos = 1 unidad).
  const renderComplexCard = (bIndex, grupo, miembros) => (
    <div key={`complex-${grupo}`} className="crw-complex-card">
      <div className="crw-complex-head">
        <span className="crw-complex-badge"><i className="fas fa-layer-group me-1"></i>COMPLEX</span>
        <input
          type="text"
          className="crw-complex-nombre"
          placeholder="Nombre (DT, opcional)"
          value={miembros[0].ej.nombreComplex || ''}
          maxLength="40"
          onChange={e => actualizarComplexMeta(bIndex, grupo, 'nombreComplex', e.target.value)}
        />
        <input
          type="text"
          className="crw-complex-esquema"
          placeholder="Esquema (ej. 5 rondas)"
          value={miembros[0].ej.esquemaComplex || ''}
          maxLength="20"
          onChange={e => actualizarComplexMeta(bIndex, grupo, 'esquemaComplex', e.target.value)}
        />
        <button type="button" className="crw-complex-guardar" onClick={() => guardarComplexEnBiblioteca(bIndex, grupo)} title="Guardar este complex en la biblioteca">
          <i className="fas fa-bookmark"></i>
        </button>
        <button type="button" className="crw-delete-ej-btn" onClick={() => quitarComplex(bIndex, grupo)} title="Eliminar complex">
          <i className="fas fa-trash"></i>
        </button>
      </div>
      <p className="crw-complex-hint"><i className="fas fa-info-circle me-1"></i>Una vuelta del complex = 1 de cada movimiento, en orden.</p>
      {miembros.map(({ ej, idx }) => renderFilaEjercicio(bIndex, ej, idx))}
      <button type="button" className="crw-add-mov-complex" onClick={() => agregarMovimientoAComplex(bIndex, grupo)}>
        <i className="fas fa-plus me-1"></i>Movimiento al complex
      </button>
    </div>
  );

  // Recorre los ejercicios del bloque agrupando los complex contiguos.
  const renderEjerciciosDeBloque = (bloque, bIndex) => {
    const ejs = bloque.ejercicios;
    const items = [];
    let i = 0;
    while (i < ejs.length) {
      if (ejs[i].grupoComplex == null) {
        items.push(renderFilaEjercicio(bIndex, ejs[i], i));
        i++;
      } else {
        const grupo = ejs[i].grupoComplex;
        const miembros = [];
        while (i < ejs.length && ejs[i].grupoComplex === grupo) {
          miembros.push({ ej: ejs[i], idx: i });
          i++;
        }
        items.push(renderComplexCard(bIndex, grupo, miembros));
      }
    }
    return items;
  };

  const miembrosFiltrados = miembrosBox.filter(m => {
    const txt = `${m.nombre || ''} ${m.apellidos || ''}`.toLowerCase();
    return txt.includes(busquedaAtleta.trim().toLowerCase());
  });

  return (
    <div className="crw-page">

      {/* ══════════════════════════════════
          HEADER
      ══════════════════════════════════ */}
      <header className="crw-header">
        <div className="d-flex align-items-center gap-3">
          <BackButton to={editandoPlantillaId ? '/wods-guardados' : '/calendario-wods'} />
          <h1 className="crw-header-title">
            {editandoPlantillaId
              ? <>Editar <span style={{ color: 'var(--primary)' }}>Plantilla</span></>
              : <>Armar <span style={{ color: 'var(--primary)' }}>WOD</span></>}
          </h1>
        </div>
      </header>

      <div className="container px-3" style={{ maxWidth: '1000px' }}>
        <form onSubmit={handleGuardar}>

          {/* ══════════════════════════════════
              TARJETA 1 — INFO GENERAL
          ══════════════════════════════════ */}
          <div className="tarjeta-panel p-4 mb-4">
            <p className="crw-section-label">
              <i className="fas fa-heading"></i>Información General
            </p>

            <div className="row g-3 mb-4">
              <div className={editandoPlantillaId ? 'col-12' : 'col-12 col-md-8'}>
                <label className="etiqueta-campo">
                  {editandoPlantillaId ? 'Nombre de la plantilla' : 'Título del Entrenamiento'}
                </label>
                <input
                  type="text"
                  className="crw-titulo-input"
                  required
                  value={titulo}
                  onChange={e => setTitulo(e.target.value)}
                  placeholder="Ej: Murph, Lunes de Pierna..."
                />
              </div>
              {!editandoPlantillaId && (
                <div className="col-12 col-md-4">
                  <label className="etiqueta-campo">
                    <i className="fas fa-calendar me-1" style={{ color: 'var(--accent-cool)' }}></i>
                    Fecha Programada
                  </label>
                  <RedGrayDatePicker
                    required
                    value={fechaProgramada}
                    onChange={setFechaProgramada}
                    inputClassName="shadow-none p-3 rounded-4"
                  />
                </div>
              )}
              {editandoPlantillaId && (
                <div className="col-12">
                  <label className="etiqueta-campo">Descripción (opcional)</label>
                  <textarea
                    className="entrada-oscura"
                    rows="2"
                    value={descripcionPlantilla}
                    onChange={e => setDescripcionPlantilla(e.target.value)}
                    placeholder="Notas sobre la plantilla..."
                  />
                </div>
              )}
            </div>

            {/* Clases: solo aplica a un WOD con fecha, no a un molde */}
            {!editandoPlantillaId && (
              <>
                <hr className="separador" />

                {/* Asignar a clases (normal) o a atletas específicos (WOD personalizado) */}
                <div className="crw-asignar-toggle mb-3">
                  <button type="button" className={`crw-reveal-chip ${!esPersonal ? 'crw-reveal-chip--active' : ''}`} onClick={() => setEsPersonal(false)}>
                    <i className="fas fa-users me-1"></i>A clases
                  </button>
                  <button type="button" className={`crw-reveal-chip ${esPersonal ? 'crw-reveal-chip--active' : ''}`} onClick={() => setEsPersonal(true)}>
                    <i className="fas fa-user-check me-1"></i>A atletas (personalizado)
                  </button>
                </div>

                {!esPersonal ? (
                  <>
                    <div className="d-flex justify-content-between align-items-center gap-2 mb-2 flex-wrap">
                      <p className="crw-section-label mb-0" style={{ flex: 'none' }}>
                        <i className="fas fa-clock"></i>¿A qué clases aplica?
                      </p>
                      <button type="button" onClick={seleccionarTodasClases} className="crw-select-all-btn">
                        <i className="fas fa-check-double me-1"></i>
                        <span className="d-none d-sm-inline">Seleccionar </span>Todas
                      </button>
                    </div>

                    <div className="crw-clases-container">
                      {clasesDisponibles.length === 0 && (
                        <p className="crw-empty-text">No hay clases disponibles</p>
                      )}
                      {clasesDisponibles.map(c => (
                        <button
                          key={c.idClase}
                          type="button"
                          className={`crw-clase-chip ${clasesSeleccionadas.includes(c.idClase) ? 'crw-clase-chip--active' : ''}`}
                          onClick={() => toggleClase(c.idClase)}
                        >
                          <i className={`${clasesSeleccionadas.includes(c.idClase) ? 'fas' : 'far'} fa-check-circle`}></i>
                          <span className="d-none d-sm-inline">{c.horarioInicio.substring(0, 5)} — </span>
                          {c.nombre}
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <p className="crw-section-label mb-2" style={{ flex: 'none' }}>
                      <i className="fas fa-user-check"></i>¿A qué atletas? ({atletasSeleccionados.length} seleccionados)
                    </p>
                    <input
                      type="text"
                      className="crw-titulo-input mb-2"
                      placeholder="Buscar atleta por nombre..."
                      value={busquedaAtleta}
                      onChange={e => setBusquedaAtleta(e.target.value)}
                    />
                    <div className="crw-clases-container" style={{ maxHeight: 260, overflowY: 'auto' }}>
                      {miembrosFiltrados.length === 0 ? (
                        <p className="crw-empty-text">No hay atletas que coincidan</p>
                      ) : miembrosFiltrados.map(m => (
                        <button
                          key={m.idUsuario}
                          type="button"
                          className={`crw-clase-chip ${atletasSeleccionados.includes(m.idUsuario) ? 'crw-clase-chip--active' : ''}`}
                          onClick={() => toggleAtleta(m.idUsuario)}
                        >
                          <i className={`${atletasSeleccionados.includes(m.idUsuario) ? 'fas' : 'far'} fa-check-circle`}></i>
                          {m.nombre} {m.apellidos}{(m.rol || m.Rol) === 'Coach' ? ' · Coach' : ''}
                        </button>
                      ))}
                    </div>
                    <p className="crw-info-text mt-2">
                      <i className="fas fa-info-circle me-1"></i>
                      Rutina personalizada sin horario fijo: los atletas elegidos la verán en “WODs para ti” y subirán su propio score. Otros coaches/admins también la verán.
                    </p>
                  </>
                )}

                {/* ── VISIBILIDAD / REVELACIÓN ── */}
                <hr className="separador" />
                <p className="crw-section-label mb-2">
                  <i className="fas fa-eye"></i>Visibilidad para los atletas
                </p>
                <div className="crw-reveal-modes">
                  {[
                    { v: 'Borrador', icon: 'fa-pen-ruler', label: 'Borrador' },
                    { v: 'Inmediato', icon: 'fa-bolt', label: 'Al instante' },
                    { v: 'Programar', icon: 'fa-clock', label: 'Programar hora' },
                  ].map(m => {
                    const activo = m.v === 'Borrador' ? !estaPublicado
                      : m.v === 'Inmediato' ? (estaPublicado && modoRevelacion === 'Inmediato')
                      : (estaPublicado && modoRevelacion !== 'Inmediato');
                    return (
                      <button
                        key={m.v}
                        type="button"
                        className={`crw-reveal-chip ${activo ? 'crw-reveal-chip--active' : ''}`}
                        onClick={() => {
                          if (m.v === 'Borrador') setEstaPublicado(false);
                          else if (m.v === 'Inmediato') { setEstaPublicado(true); setModoRevelacion('Inmediato'); }
                          else { setEstaPublicado(true); setModoRevelacion(clasesSeleccionadas.length > 0 ? 'PorClase' : 'HoraFija'); }
                        }}
                      >
                        <i className={`fas ${m.icon} me-1`}></i>{m.label}
                      </button>
                    );
                  })}
                </div>

                {!estaPublicado && (
                  <p className="crw-info-text mt-2">
                    <i className="fas fa-eye-slash me-1"></i>Solo tú lo ves. Los atletas no verán este WOD hasta que lo publiques.
                  </p>
                )}

                {estaPublicado && modoRevelacion === 'Inmediato' && (
                  <p className="crw-info-text mt-2">
                    <i className="fas fa-info-circle me-1"></i>Visible para los atletas en cuanto guardes el WOD.
                  </p>
                )}

                {estaPublicado && modoRevelacion !== 'Inmediato' && (
                  <div className="crw-reveal-detail mt-3">
                    {clasesSeleccionadas.length === 0 ? (
                      <>
                        <label className="etiqueta-campo">Hora de revelación</label>
                        <HoraPicker value={horaRevelacion} onChange={setHoraRevelacion} placeholder="Elegir hora" />
                        <p className="crw-info-text mt-2">
                          <i className="fas fa-info-circle me-1"></i>
                          El WOD aparece a esa hora para todos. <em>Tip: asigna clases arriba para darle una hora distinta a cada una.</em>
                        </p>
                      </>
                    ) : (
                      <>
                        <div className="crw-reveal-perclass">
                          <div className="crw-reveal-row crw-reveal-row--all">
                            <span className="crw-reveal-row-clase">
                              <i className="fas fa-wand-magic-sparkles me-1"></i>Misma hora para todas
                            </span>
                            <HoraPicker
                              compact
                              value={horaRevelacion}
                              onChange={(val) => {
                                setHoraRevelacion(val);
                                setHorasRevelacionClase(Object.fromEntries(clasesSeleccionadas.map(id => [id, val])));
                              }}
                              placeholder="--:--"
                            />
                          </div>
                          {clasesSeleccionadas.map(id => {
                            const clase = clasesDisponibles.find(c => c.idClase === id);
                            if (!clase) return null;
                            return (
                              <div key={id} className="crw-reveal-row">
                                <span className="crw-reveal-row-clase">
                                  <i className="far fa-clock me-1"></i>
                                  {formatear12(clase.horarioInicio)} — {clase.nombre}
                                </span>
                                <HoraPicker
                                  compact
                                  value={horasRevelacionClase[id] || ''}
                                  onChange={(val) => setHorasRevelacionClase(prev => ({ ...prev, [id]: val }))}
                                  placeholder="--:--"
                                />
                              </div>
                            );
                          })}
                        </div>
                        <p className="crw-info-text mt-2">
                          <i className="fas fa-info-circle me-1"></i>
                          Cada clase ve el WOD a su hora (ej. clase 5:00 PM → revelar 4:00 PM). Sin hora = visible al guardar.
                        </p>
                      </>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* ══════════════════════════════════
              TARJETA 2 — LEADERBOARD
          ══════════════════════════════════ */}
          <div className="tarjeta-panel p-4 mb-4 crw-leaderboard-card">
            <p className="crw-section-label crw-section-label--gold">
              <i className="fas fa-trophy"></i>Configuración de Leaderboard
            </p>

            {/* Estado: ¿este WOD requiere score? (día de descarga/cardio/pierna libre) */}
            <div className="crw-score-toggle mb-3">
              <button
                type="button"
                className={`crw-reveal-chip ${requiereScore ? 'crw-reveal-chip--active' : ''}`}
                onClick={() => setRequiereScore(true)}
              >
                <i className="fas fa-stopwatch me-1"></i>Requiere score
              </button>
              <button
                type="button"
                className={`crw-reveal-chip ${!requiereScore ? 'crw-reveal-chip--active' : ''}`}
                onClick={() => setRequiereScore(false)}
              >
                <i className="fas fa-mug-hot me-1"></i>Sin métrica (solo asistencia)
              </button>
            </div>

            {!requiereScore ? (
              <p className="crw-info-text mb-0">
                <i className="fas fa-info-circle me-1"></i>
                Día sin métrica a evaluar (descarga, cardio, pierna libre). Los atletas solo pasan
                lista y el WOD queda en su historial. No se captura ni publica leaderboard.
              </p>
            ) : (
              <div className="row g-3">
                <div className="col-12 col-md-6">
                  <label className="etiqueta-campo">Modo de Ranking</label>
                  <ModoRankingPicker
                    valor={modoRanking}
                    onCambiar={setModoRanking}
                  />
                </div>

                {modoRanking === 'Auto' && (
                  <div className="col-12 col-md-6">
                    <label className="etiqueta-campo">Métrica para ganar</label>
                    <MetricaGanarPicker
                      valor={metricaPrincipal}
                      onCambiar={setMetricaPrincipal}
                    />
                  </div>
                )}

                {modoRanking === 'Manual' && (
                  <div className="col-12 col-md-6">
                    <label className="etiqueta-campo">Al publicar la pizarra</label>
                    <div className="crw-score-toggle">
                      <button
                        type="button"
                        className={`crw-reveal-chip ${estiloPublicacion === 'PorLugar' ? 'crw-reveal-chip--active' : ''}`}
                        onClick={() => setEstiloPublicacion('PorLugar')}
                      >
                        <i className="fas fa-medal me-1"></i>Asignar lugares
                      </button>
                      <button
                        type="button"
                        className={`crw-reveal-chip ${estiloPublicacion === 'Alfabetico' ? 'crw-reveal-chip--active' : ''}`}
                        onClick={() => setEstiloPublicacion('Alfabetico')}
                      >
                        <i className="fas fa-arrow-down-a-z me-1"></i>Solo publicar (por nombre)
                      </button>
                    </div>
                    <p className="crw-info-text mt-2 mb-0">
                      <i className="fas fa-info-circle me-1"></i>
                      {estiloPublicacion === 'Alfabetico'
                        ? 'Se publican los resultados capturados ordenados por nombre, sin asignar posiciones.'
                        : 'Los scores quedan ocultos hasta que ordenes las posiciones y publiques la pizarra.'}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ══════════════════════════════════
              SECCIONES DEL ENTRENAMIENTO
          ══════════════════════════════════ */}
          <p className="titulo-seccion mt-4 mb-3">
            <i className="fas fa-puzzle-piece"></i>Secciones del Entrenamiento
          </p>

          {bloques.map((bloque, bIndex) => (
            <div
              key={bIndex}
              className={`tarjeta-panel mb-4 crw-bloque ${bloqueColorClass(bloque.tipoBloque)}`}
            >
              {bloques.length > 1 && (
                <button
                  type="button"
                  onClick={() => quitarBloque(bIndex)}
                  className="crw-delete-bloque-btn"
                >
                  <i className="fas fa-trash"></i>
                </button>
              )}

              <div className="p-4">

                {/* FILA DE CONFIGURACIÓN DEL BLOQUE */}
                <div className="row g-2 mb-3">
                  <div className="col-6 col-md-3">
                    <label className="etiqueta-campo">Tipo</label>
                    <TipoBloquePicker
                      valor={bloque.tipoBloque}
                      onCambiar={v => actualizarBloque(bIndex, 'tipoBloque', v)}
                    />
                  </div>
                  <div className="col-6 col-md-3">
                    <label className="etiqueta-campo">Modalidad</label>
                    <ModalidadBloquePicker
                      valor={bloque.tipoModalidad}
                      onCambiar={v => actualizarBloque(bIndex, 'tipoModalidad', v)}
                    />
                  </div>
                  <div className="col-6 col-md-3">
                    <label className="etiqueta-campo">Equipo</label>
                    <EquipoBloquePicker
                      valor={bloque.modalidadEquipo}
                      onCambiar={v => actualizarBloque(bIndex, 'modalidadEquipo', v)}
                    />
                  </div>
                  <div className="col-6 col-md-3">
                    <label className="etiqueta-campo">Cap (MM:SS)</label>
                    <TimeInputMMSS
                      value={bloque.capTimeMinutos}
                      onChange={val => actualizarBloque(bIndex, 'capTimeMinutos', val)}
                      className="crw-reps-input border-0 bg-transparent p-0 flex-grow-1"
                    />
                  </div>
                </div>

                {/* RONDAS + ¿PUNTÚA ESTA SECCIÓN? */}
                <div className="row g-2 mb-3 align-items-end">
                  <div className="col-6 col-md-3">
                    <label className="etiqueta-campo"><i className="fas fa-repeat me-1"></i>Rondas</label>
                    <input
                      type="number"
                      min="1"
                      max="99"
                      className="crw-reps-input"
                      placeholder="Ej: 5"
                      value={bloque.rondas}
                      onChange={e => actualizarBloque(bIndex, 'rondas', e.target.value.replace(/[^0-9]/g, ''))}
                    />
                  </div>
                  {requiereScore && (
                    <div className="col-12 col-md-9">
                      <label className="etiqueta-campo">¿Esta sección puntúa?</label>
                      <div className="crw-score-toggle">
                        <button
                          type="button"
                          className={`crw-reveal-chip ${bloque.requiereScore !== false ? 'crw-reveal-chip--active' : ''}`}
                          onClick={() => actualizarBloque(bIndex, 'requiereScore', true)}
                        >
                          <i className="fas fa-clipboard-check me-1"></i>Sí puntúa
                        </button>
                        <button
                          type="button"
                          className={`crw-reveal-chip ${bloque.requiereScore === false ? 'crw-reveal-chip--active' : ''}`}
                          onClick={() => actualizarBloque(bIndex, 'requiereScore', false)}
                        >
                          <i className="fas fa-ban me-1"></i>Sin score (ej. calentamiento)
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* DESCRIPCIÓN LIBRE */}
                <div className="mb-3">
                  <label className="etiqueta-campo">
                    <i className="fas fa-align-left me-1"></i>Instrucciones
                  </label>
                  <AutoTextarea
                    className="entrada-oscura"
                    placeholder="Instrucciones libres..."
                    value={bloque.descripcionLibre}
                    onChange={e => actualizarBloque(bIndex, 'descripcionLibre', e.target.value)}
                  />
                </div>

                {/* MOVIMIENTOS */}
                <div className="crw-movimientos-zone mb-3">
                  <div className="d-flex justify-content-between align-items-center mb-3 gap-2 flex-wrap">
                    <p className="crw-sub-label">
                      <i className="fas fa-list-ul me-1"></i>Movimientos
                    </p>
                    <div className="d-flex gap-2 flex-wrap">
                      <button type="button" onClick={() => agregarEjercicioABloque(bIndex)} className="crw-add-ejercicio-btn">
                        <i className="fas fa-plus me-1"></i><span className="d-none d-sm-inline">Añadir </span>Ejercicio
                      </button>
                      <button type="button" onClick={() => agregarComplexABloque(bIndex)} className="crw-add-ejercicio-btn crw-add-complex-btn">
                        <i className="fas fa-layer-group me-1"></i>Complex
                      </button>
                      {complexGuardados.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setComplexPickerBloque(complexPickerBloque === bIndex ? null : bIndex)}
                          className="crw-add-ejercicio-btn crw-add-complex-btn"
                        >
                          <i className="fas fa-book-open me-1"></i>Biblioteca
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Selector de complex guardados */}
                  {complexPickerBloque === bIndex && (
                    <div className="crw-complex-biblioteca mb-3">
                      {complexGuardados.length === 0 ? (
                        <small className="crw-empty-text fst-italic">No tienes complex guardados todavía.</small>
                      ) : complexGuardados.map(c => (
                        <button
                          type="button"
                          key={c.idComplexGuardado}
                          className="crw-complex-biblio-item"
                          onClick={() => insertarComplexGuardado(bIndex, c)}
                        >
                          <span className="crw-complex-biblio-nombre">
                            <i className="fas fa-layer-group me-1"></i>{c.nombre}{c.esquemaRepeticiones ? ` · ${c.esquemaRepeticiones}` : ''}
                          </span>
                          <span className="crw-complex-biblio-detalle">
                            {(c.ejercicios || []).map(e => `${e.esquemaRepeticiones || ''} ${e.nombre}`.trim()).join(' + ')}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  {bloque.ejercicios.length === 0 && (
                    <p className="crw-empty-text text-center py-2">No hay ejercicios añadidos</p>
                  )}

                  {renderEjerciciosDeBloque(bloque, bIndex)}
                </div>

                {/* PLANTILLA DE JUECEO */}
                {modoRanking === 'Manual' ? (
                  <div className="crw-jueceo-manual">
                    <p className="crw-jueceo-manual-title">
                      <i className="fas fa-clipboard-check me-1"></i>Plantilla de Jueceo (Modo Manual)
                    </p>
                    <p className="crw-info-text mb-3">
                      Define todas las métricas que el Coach deberá llenar para evaluar este bloque y armar el Leaderboard.
                    </p>
                    <div className="d-flex gap-2 mb-3">
                      <input
                        type="text"
                        className="entrada-oscura"
                        style={{ borderColor: 'rgba(46,204,113,0.3)' }}
                        placeholder="Ej: Tiempo R1, Peso Max, Reps..."
                        value={bloque.inputMetrica}
                        onChange={e => actualizarBloque(bIndex, 'inputMetrica', e.target.value)}
                        onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), agregarMetrica(bIndex))}
                      />
                      <button
                        type="button"
                        onClick={() => agregarMetrica(bIndex)}
                        className="crw-add-metrica-btn"
                      >
                        <i className="fas fa-plus"></i>
                      </button>
                    </div>
                    <div className="d-flex flex-wrap gap-2">
                      {bloque.plantillaJueceo.length === 0 && (
                        <small className="crw-empty-text fst-italic">Añade al menos una métrica</small>
                      )}
                      {bloque.plantillaJueceo.map((metrica, mIndex) => (
                        <span key={mIndex} className="crw-metrica-tag">
                          {metrica}
                          <i className="fas fa-times-circle" onClick={() => quitarMetrica(bIndex, mIndex)}></i>
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="crw-jueceo-auto">
                    <p className="crw-jueceo-auto-title">
                      <i className="fas fa-robot me-1"></i>Evaluación Automática
                    </p>
                    <p className="crw-info-text mb-0">
                      El sistema evaluará a los atletas usando únicamente:&nbsp;
                      <strong style={{ color: 'var(--accent)', textTransform: 'uppercase' }}>{metricaPrincipal}</strong>.
                    </p>
                  </div>
                )}

              </div>
            </div>
          ))}

          {/* ══════════════════════════════════
              AGREGAR SECCIÓN
          ══════════════════════════════════ */}
          <button type="button" onClick={agregarBloque} className="crw-add-bloque-btn">
            <i className="fas fa-plus-circle me-2"></i>Agregar Sección
          </button>

          {/* ══════════════════════════════════
              BARRA DE PIE — PUBLICAR + GUARDAR
          ══════════════════════════════════ */}
          <div className="crw-footer-bar crw-footer-bar--solo">
            <div className="crw-footer-actions">
              {editandoPlantillaId ? (
                <BotonSeguro type="button" onClick={guardarEdicionPlantilla} className="crw-save-btn" textoProcesando="Guardando...">
                  <i className="fas fa-save"></i>Guardar cambios
                </BotonSeguro>
              ) : (
                <>
                  <button type="button" onClick={abrirModalPlantilla} className="crw-plantilla-btn">
                    <i className="fas fa-bookmark"></i>
                    <span className="crw-plantilla-btn-label">Guardar como plantilla</span>
                  </button>
                  <BotonSeguro type="button" onClick={handleGuardar} className="crw-save-btn" textoProcesando="Guardando...">
                    <i className="fas fa-save"></i>Guardar WOD
                  </BotonSeguro>
                </>
              )}
            </div>
          </div>

        </form>
      </div>

      {/* ══ MODAL: GUARDAR COMO PLANTILLA ══ */}
      {showModalPlantilla && createPortal(
        <div className="crw-plmodal-overlay" onClick={() => setShowModalPlantilla(false)}>
          <div className="crw-plmodal" onClick={e => e.stopPropagation()}>
            <button type="button" className="crw-plmodal-close" onClick={() => setShowModalPlantilla(false)}>
              <i className="fas fa-times"></i>
            </button>
            <h3 className="crw-plmodal-title">
              <i className="fas fa-bookmark me-2" style={{ color: 'var(--primary)' }}></i>Guardar como plantilla
            </h3>
            <p className="crw-info-text mb-3">
              Guarda este WOD como molde reutilizable para aplicarlo a cualquier día con un clic. No se guarda fecha ni clases.
            </p>
            <label className="etiqueta-campo">Nombre de la plantilla</label>
            <input
              type="text"
              className="entrada-oscura mb-3"
              value={nombrePlantilla}
              onChange={e => setNombrePlantilla(e.target.value)}
              placeholder="Ej: Fran, Murph..."
              autoFocus
            />
            <label className="etiqueta-campo">Descripción (opcional)</label>
            <textarea
              className="entrada-oscura mb-3"
              rows="2"
              value={descripcionPlantilla}
              onChange={e => setDescripcionPlantilla(e.target.value)}
              placeholder="Notas sobre la plantilla..."
            />
            <div className="crw-plmodal-footer">
              <button type="button" className="crw-plmodal-cancel" onClick={() => setShowModalPlantilla(false)}>
                Cancelar
              </button>
              <BotonSeguro type="button" onClick={guardarComoPlantilla} className="crw-save-btn" textoProcesando="Guardando...">
                <i className="fas fa-bookmark"></i>Guardar plantilla
              </BotonSeguro>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
