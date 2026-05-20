import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL_CONST } from '../services/api';
import AtletifyLoader from '../components/AtletifyLoader';
import BackButton from '../components/BackButton';
import '../assets/css/AlmacenPanel.css';

// Pesos predefinidos por tipo y unidad
const PESOS_BARRA_KG = [5, 10, 15, 20, 25];
const PESOS_BARRA_LB = [11, 22, 33, 44, 55];
const PESOS_BUMPER_KG = [0.5, 1, 1.5, 2.5, 5, 10, 15, 20, 25];
const PESOS_BUMPER_LB = [2.5, 5, 10, 15, 25, 35, 45, 55];
const PESOS_KETTLEBELL_KG = [1, 1.5, 2, 2.5, 3, 4, 6, 8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 44, 48, 56, 68, 80, 92];
const PESOS_KETTLEBELL_LB = [2, 3, 4, 5, 7, 8, 9, 13, 18, 22, 26, 31, 35, 40, 44, 53, 62, 70, 80, 88, 97, 106, 123, 150, 176, 203];
const PESOS_MANCUERNA_KG = [2.5, 5, 7.5, 10, 12.5, 15, 17.5, 20, 22.5, 25, 30, 35, 40, 45, 50];
const PESOS_MANCUERNA_LB = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100];
const PESOS_PELOTA_KG = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 15, 20];
const PESOS_PELOTA_LB = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 25, 30, 40, 44];
const VERIF_POR_PAGINA = 10;
const INVENTARIO_POR_PAGINA = 10;

export default function AlmacenPanel() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [box, setBox] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [herramientas, setHerramientas] = useState([]);
  const [vistaActiva, setVistaActiva] = useState('ver');
  const [busquedaHerramienta, setBusquedaHerramienta] = useState('');
  const [busquedaHerramientaModificar, setBusquedaHerramientaModificar] = useState('');
  const [showVerificacionModal, setShowVerificacionModal] = useState(false);
  const [busquedaVerificacion, setBusquedaVerificacion] = useState('');
  const [cantidadRapida, setCantidadRapida] = useState(1);
  const [paginaVerificacion, setPaginaVerificacion] = useState(1);
  const [paginaInventario, setPaginaInventario] = useState(1);

  // Wizard de agregar: paso 1 = tipo+unidad, paso2 = peso+cantidad+ejercicios
  const [pasoAgregar, setPasoAgregar] = useState(1);
  // Confirmación de suma de cantidad duplicada
  const [confirmSuma, setConfirmSuma] = useState(null);

  const [nuevaHerramienta, setNuevaHerramienta] = useState({
    nombre: '', descripcionAdicional: '', medida: 0, cantidad: 0,
    esKilo: false, esLibra: false, esMetro: false, esMaquina: false,
    esBarra: true, esBumpers: false, esKettlebell: false, esMancuerna: false, esCajon: false, esOtra: false, esPelota: false, ejerciciosIds: []
  });

  const [edicion, setEdicion] = useState({
    idHerramienta: '', nombre: '', descripcionAdicional: '', medida: 0, cantidad: 0,
    esKilo: false, esLibra: false, esMetro: false, esMaquina: false,
    esBarra: true, esBumpers: false, esKettlebell: false, esMancuerna: false, esCajon: false, esOtra: false, esPelota: false, ejerciciosIds: []
  });

  useEffect(() => {
    const usuarioGuardado = JSON.parse(localStorage.getItem('usuario'));
    const boxGuardado = JSON.parse(localStorage.getItem('box'));
    if (!usuarioGuardado) { navigate('/login'); return; }
    if (!boxGuardado?.idBox) {
      window.alert('No se encontró el Box activo en tu sesión.');
      setLoading(false); return;
    }
    setUser(usuarioGuardado);
    setBox(boxGuardado);
  }, [navigate]);

  useEffect(() => {
    if (!box?.idBox) return;
    cargarDatos(box.idBox);
  }, [box]);

  const herramientaSeleccionada = useMemo(() => {
    return herramientas.find(h => String(getHerramientaId(h)) === String(edicion.idHerramienta)) || null;
  }, [herramientas, edicion.idHerramienta]);

  const herramientasFiltradas = useMemo(() => {
    if (!busquedaHerramienta.trim()) return herramientas;

    // Normaliza: quita acentos y pasa a minúsculas
    const norm = (s) =>
      (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    // Compacta: además quita todos los espacios
    const comp = (s) => norm(s).replace(/\s+/g, '');

    const terminoNorm = norm(busquedaHerramienta.trim());
    const terminoComp = comp(busquedaHerramienta.trim());
    const palabras = terminoNorm.split(/\s+/).filter(Boolean);

    return herramientas.filter(h => {
      const nombre = norm(h.nombre ?? h.Nombre ?? '');
      const notas  = norm(h.descripcionAdicional ?? h.DescripcionAdicional ?? '');
      const medidaStr = String(h.medida ?? h.Medida ?? 0);
      const unidadTexto = norm([
        (h.esKilo      ?? h.EsKilo)      ? 'kilo kg kilogramo kilogramos'       : '',
        (h.esLibra     ?? h.EsLibra)     ? 'libra lb lbs libras'                : '',
        (h.esMetro     ?? h.EsMetro)     ? 'metro metros'                       : '',
        (h.esMaquina   ?? h.EsMaquina)   ? 'maquina maquina'                    : '',
      ].join(' '));
      const tipoTexto = norm([
        (h.esBarra     ?? h.EsBarra)     ? 'barra'                              : '',
        (h.esBumpers   ?? h.EsBumpers)   ? 'bumper disco discos bumpers'        : '',
        (h.esKettlebell?? h.EsKettlebell)? 'kettlebell'                         : '',
        (h.esMancuerna ?? h.EsMancuerna) ? 'mancuerna mancuernas'              : '',
        (h.esCajon     ?? h.EsCajon)     ? 'cajon cajón'                        : '',
        (h.esOtra      ?? h.EsOtra)      ? 'otra otro equipo'                   : '',
        (h.esPelota    ?? h.EsPelota)    ? 'pelota'                             : '',
      ].join(' '));

      const todo = `${nombre} ${notas} ${medidaStr} ${unidadTexto} ${tipoTexto}`;

      // Modo 1: cada palabra del término aparece en algún lugar del texto
      const porPalabras = palabras.every(p => todo.includes(p));

      // Modo 2: sin espacios — "barradehombre" encuentra "barra de hombre"
      const nombreComp = comp(h.nombre ?? h.Nombre ?? '');
      const notasComp  = comp(h.descripcionAdicional ?? h.DescripcionAdicional ?? '');
      const sinEspacios = nombreComp.includes(terminoComp) || notasComp.includes(terminoComp);

      return porPalabras || sinEspacios;
    });
  }, [herramientas, busquedaHerramienta]);

  const herramientasFiltradasModificar = useMemo(() => {
    const termino = busquedaHerramientaModificar.trim().toLowerCase();
    if (!termino) return herramientas;
    return herramientas.filter(herramienta => {
      const nombre = (herramienta.nombre ?? herramienta.Nombre ?? '').toLowerCase();
      const medida = String(herramienta.medida ?? herramienta.Medida ?? herramienta.descripcion ?? herramienta.Descripcion ?? '').toLowerCase();
      return nombre.includes(termino) || medida.includes(termino);
    });
  }, [herramientas, busquedaHerramientaModificar]);

  const herramientasFiltradasVerificacion = useMemo(() => {
    let filtradas = herramientas.filter(h => {
      const hBarra = h.esBarra ?? h.EsBarra;
      const hBumpers = h.esBumpers ?? h.EsBumpers;
      const hKettlebell = h.esKettlebell ?? h.EsKettlebell;
      const hMancuerna = h.esMancuerna ?? h.EsMancuerna;
      const hCajon = h.esCajon ?? h.EsCajon;
      const hOtra = h.esOtra ?? h.EsOtra;
      const hPelota = h.esPelota ?? h.EsPelota;

      const catMatch =
        (nuevaHerramienta.esBarra && hBarra) ||
        (nuevaHerramienta.esBumpers && hBumpers) ||
        (nuevaHerramienta.esKettlebell && hKettlebell) ||
        (nuevaHerramienta.esMancuerna && hMancuerna) ||
        (nuevaHerramienta.esCajon && hCajon) ||
        (nuevaHerramienta.esOtra && hOtra) ||
        (nuevaHerramienta.esPelota && hPelota);

      if (!catMatch) return false;

      if (!nuevaHerramienta.esCajon) {
        const hKilo = h.esKilo ?? h.EsKilo;
        const hLibra = h.esLibra ?? h.EsLibra;
        const hMetro = h.esMetro ?? h.EsMetro;
        const hMaquina = h.esMaquina ?? h.EsMaquina;

        const unidadMatch =
          (nuevaHerramienta.esKilo && hKilo) ||
          (nuevaHerramienta.esLibra && hLibra) ||
          (nuevaHerramienta.esMetro && hMetro) ||
          (nuevaHerramienta.esMaquina && hMaquina);

        if (!unidadMatch) return false;
      }

      if (busquedaVerificacion.trim()) {
        const norm = (s) => (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
        const comp = (s) => norm(s).replace(/\s+/g, '');
        const terminoNorm = norm(busquedaVerificacion.trim());
        const terminoComp = comp(busquedaVerificacion.trim());
        const palabras = terminoNorm.split(/\s+/).filter(Boolean);
        const nombre = norm(h.nombre ?? h.Nombre ?? '');
        const notas  = norm(h.descripcionAdicional ?? h.DescripcionAdicional ?? '');
        const todo = `${nombre} ${notas}`;
        const porPalabras = palabras.every(p => todo.includes(p));
        const sinEspacios = comp(nombre).includes(terminoComp) || comp(notas).includes(terminoComp);
        return porPalabras || sinEspacios;
      }
      return true;
    });
    return filtradas;
  }, [herramientas, nuevaHerramienta, busquedaVerificacion]);

  async function cargarDatos(idBox) {
    try {
      setLoading(true);
      const resHerramientas = await fetch(`${API_BASE_URL_CONST}/herramientas/box/${idBox}`);
      if (!resHerramientas.ok) throw new Error('No se pudieron cargar las herramientas.');
      const dataHerramientas = await resHerramientas.json();
      setHerramientas(Array.isArray(dataHerramientas) ? dataHerramientas : []);
    } catch (err) { window.alert(err.message || 'Error cargando datos del almacén.'); }
    finally { setLoading(false); }
  }

  function getHerramientaId(h) { return h.idHerramienta ?? h.IdHerramienta; }
  function getHerramientaMedida(h) { return Number(h.medida ?? h.Medida ?? h.descripcion ?? h.Descripcion ?? 0); }

  function getTipoUnidadHerramienta(h) {
    if (h.esKilo ?? h.EsKilo) return 'Kilogramos';
    if (h.esLibra ?? h.EsLibra) return 'Libras';
    if (h.esMetro ?? h.EsMetro) return 'Metros';
    if (h.esMaquina ?? h.EsMaquina) return 'Máquina';
    return 'Sin unidad';
  }

  function getCategoriaHerramienta(h) {
    if (h.esBarra ?? h.EsBarra) return 'Barra';
    if (h.esBumpers ?? h.EsBumpers) return 'Discos';
    if (h.esKettlebell ?? h.EsKettlebell) return 'Kettlebell';
    if (h.esMancuerna ?? h.EsMancuerna) return 'Mancuerna';
    if (h.esCajon ?? h.EsCajon) return 'Cajón';
    if (h.esPelota ?? h.EsPelota) return 'Pelota';
    if (h.esOtra ?? h.EsOtra) return 'Otro equipo';
    return 'Sin categoría';
  }

  function seleccionarHerramienta(idHerramienta) {
    const seleccionada = herramientas.find(h => String(getHerramientaId(h)) === String(idHerramienta));
    if (!seleccionada) return;
    const detalles = seleccionada.detallesHerramienta || seleccionada.DetallesHerramienta || [];
    const ejerciciosIds = detalles.map(d => Number(getDetalleEjercicioId(d))).filter(id => Number.isInteger(id));
    setEdicion({
      idHerramienta: String(getHerramientaId(seleccionada)),
      nombre: seleccionada.nombre ?? seleccionada.Nombre ?? '',
      descripcionAdicional: seleccionada.descripcionAdicional ?? seleccionada.DescripcionAdicional ?? '',
      medida: Number(seleccionada.medida ?? seleccionada.Medida ?? seleccionada.descripcion ?? seleccionada.Descripcion ?? 0),
      cantidad: seleccionada.cantidad ?? seleccionada.Cantidad ?? 0,
      esKilo: seleccionada.esKilo ?? seleccionada.EsKilo ?? false,
      esLibra: seleccionada.esLibra ?? seleccionada.EsLibra ?? false,
      esMetro: seleccionada.esMetro ?? seleccionada.EsMetro ?? false,
      esMaquina: seleccionada.esMaquina ?? seleccionada.EsMaquina ?? false,
      esBarra: seleccionada.esBarra ?? seleccionada.EsBarra ?? false,
      esBumpers: seleccionada.esBumpers ?? seleccionada.EsBumpers ?? false,
      esKettlebell: seleccionada.esKettlebell ?? seleccionada.EsKettlebell ?? false,
      esMancuerna: seleccionada.esMancuerna ?? seleccionada.EsMancuerna ?? false,
      esCajon: seleccionada.esCajon ?? seleccionada.EsCajon ?? false,
      esOtra: seleccionada.esOtra ?? seleccionada.EsOtra ?? false,
      esPelota: seleccionada.esPelota ?? seleccionada.EsPelota ?? false,
      ejerciciosIds
    });
  }

  // Reset del wizard de agregar
  function resetFormAgregar() {
    setNuevaHerramienta({ nombre: '', descripcionAdicional: '', medida: 0, cantidad: 0, esKilo: false, esLibra: false, esMetro: false, esMaquina: false, esBarra: true, esBumpers: false, esKettlebell: false, esMancuerna: false, esCajon: false, esOtra: false, esPelota: false, ejerciciosIds: [] });
    setPasoAgregar(1);
  }

  // Cerrar panel de edición y limpiar selección
  function cancelarEdicion() {
    setEdicion({ idHerramienta: '', nombre: '', descripcionAdicional: '', medida: 0, cantidad: 0, esKilo: false, esLibra: false, esMetro: false, esMaquina: false, esBarra: true, esBumpers: false, esKettlebell: false, esMancuerna: false, esCajon: false, esOtra: false, esPelota: false, ejerciciosIds: [] });
  }

  // Buscar si ya existen items idénticos (nombre + medida + unidad)
  function buscarDuplicados(nombre, medida, esKilo, esLibra, esMetro, esMaquina, esCajon) {
    return herramientas.filter(h => {
      const hNombre = (h.nombre ?? h.Nombre ?? '').trim().toLowerCase();
      const hMedida = Number(h.medida ?? h.Medida ?? h.descripcion ?? h.Descripcion ?? 0);
      const mismoNombre = hNombre === nombre.trim().toLowerCase();
      const mismaMedida = hMedida === Number(medida);
      const mismaUnidad =
        (esKilo && (h.esKilo ?? h.EsKilo ?? false)) ||
        (esLibra && (h.esLibra ?? h.EsLibra ?? false)) ||
        (esMetro && (h.esMetro ?? h.EsMetro ?? false)) ||
        (esMaquina && (h.esMaquina ?? h.EsMaquina ?? false)) ||
        (esCajon && (h.esCajon ?? h.EsCajon ?? false));
      return mismoNombre && mismaMedida && mismaUnidad;
    });
  }

  async function crearHerramienta(e, forzar = false) {
    if (e) e.preventDefault();
    if (!box?.idBox) return;

    const unidadSeleccionada = nuevaHerramienta.esKilo || nuevaHerramienta.esLibra || nuevaHerramienta.esMetro || nuevaHerramienta.esMaquina;
    if (!nuevaHerramienta.esCajon && !unidadSeleccionada) {
      window.alert('Debes seleccionar una unidad de medida antes de guardar.');
      setPasoAgregar(1);
      return;
    }

    // Nombre automático para categorías predefinidas
    const nombreFinal = nuevaHerramienta.esOtra
      ? nuevaHerramienta.nombre
      : nuevaHerramienta.esBarra ? 'Barra' : nuevaHerramienta.esBumpers ? 'Disco' : nuevaHerramienta.esKettlebell ? 'Kettlebell' : nuevaHerramienta.esMancuerna ? 'Mancuerna' : nuevaHerramienta.esPelota ? 'Pelota' : 'Cajón';

    if (!forzar) {
      // Verificar duplicados
      const duplicados = buscarDuplicados(
        nombreFinal, nuevaHerramienta.medida,
        nuevaHerramienta.esKilo, nuevaHerramienta.esLibra,
        nuevaHerramienta.esMetro, nuevaHerramienta.esMaquina,
        nuevaHerramienta.esCajon
      );

      if (duplicados.length > 0) {
        setConfirmSuma({ herramientas: duplicados, cantidadNueva: Number(nuevaHerramienta.cantidad), nombre: nombreFinal });
        return;
      }
    }

    setSaving(true);
    try {
      const payload = { ...nuevaHerramienta, nombre: nombreFinal, idBox: box.idBox, medida: Number(nuevaHerramienta.medida), cantidad: Number(nuevaHerramienta.cantidad) };
      const res = await fetch(`${API_BASE_URL_CONST}/herramientas`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.mensaje || 'No se pudo crear la herramienta.');
      window.alert('Herramienta guardada correctamente.');
      resetFormAgregar();
      setConfirmSuma(null);
      await cargarDatos(box.idBox);
    } catch (err) { window.alert(err.message || 'Error al crear herramienta.'); }
    finally { setSaving(false); }
  }

  // Sumar cantidad al item duplicado existente
  async function sumarCantidadExistente(herramientaManual = null, cantidadManual = 0) {
    const h = herramientaManual;
    const c = cantidadManual;
    if (!h) return;

    const idH = getHerramientaId(h);
    const cantidadTotal = Number(h.cantidad ?? h.Cantidad ?? 0) + Number(c);
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL_CONST}/herramientas/${idH}/medida`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          medida: Number(h.medida ?? h.Medida ?? 0),
          cantidad: cantidadTotal,
          esKilo: h.esKilo ?? h.EsKilo ?? false,
          esLibra: h.esLibra ?? h.EsLibra ?? false,
          esMetro: h.esMetro ?? h.EsMetro ?? false,
          esMaquina: h.esMaquina ?? h.EsMaquina ?? false,
          esBarra: h.esBarra ?? h.EsBarra ?? false,
          esBumpers: h.esBumpers ?? h.EsBumpers ?? false,
          esKettlebell: h.esKettlebell ?? h.EsKettlebell ?? false,
          esMancuerna: h.esMancuerna ?? h.EsMancuerna ?? false,
          esCajon: h.esCajon ?? h.EsCajon ?? false,
          esOtra: h.esOtra ?? h.EsOtra ?? false,
          esPelota: h.esPelota ?? h.EsPelota ?? false,
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.mensaje || 'No se pudo actualizar la cantidad.');
      window.alert(`Cantidad actualizada. Ahora hay ${cantidadTotal} unidades.`);
      setConfirmSuma(null);
      setShowVerificacionModal(false);
      resetFormAgregar();
      await cargarDatos(box.idBox);
    } catch (err) { window.alert(err.message); }
    finally { setSaving(false); }
  }

  async function guardarMedida() {
    if (!edicion.idHerramienta) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL_CONST}/herramientas/${edicion.idHerramienta}/medida`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: edicion.nombre,
          descripcionAdicional: edicion.descripcionAdicional,
          medida: Number(edicion.medida), cantidad: Number(edicion.cantidad),
          esKilo: edicion.esKilo, esLibra: edicion.esLibra,
          esMetro: edicion.esMetro, esMaquina: edicion.esMaquina,
          esBarra: edicion.esBarra, esBumpers: edicion.esBumpers, esKettlebell: edicion.esKettlebell, esMancuerna: edicion.esMancuerna, esCajon: edicion.esCajon, esOtra: edicion.esOtra, esPelota: edicion.esPelota
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.mensaje || 'No se pudo actualizar el equipamiento.');
      window.alert('Equipamiento actualizado correctamente.');
      cancelarEdicion();
      await cargarDatos(box.idBox);
    } catch (err) { window.alert(err.message || 'Error al actualizar.'); }
    finally { setSaving(false); }
  }

  async function eliminarHerramienta(idHerramienta, nombre) {
    if (!await window.wpConfirm(`¿Estás seguro de que deseas eliminar "${nombre}"? Esta acción no se puede deshacer.`)) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL_CONST}/herramientas/${idHerramienta}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.mensaje || 'No se pudo eliminar la herramienta.');
      }
      window.alert(`"${nombre}" eliminada correctamente.`);
      if (String(edicion.idHerramienta) === String(idHerramienta)) {
        setEdicion({ ...edicion, idHerramienta: '' });
      }
      await cargarDatos(box.idBox);
    } catch (err) { window.alert(err.message); }
    finally { setSaving(false); }
  }

  // Helpers para el wizard de agregar
  function getPesosActuales() {
    if (nuevaHerramienta.esBarra) return nuevaHerramienta.esKilo ? PESOS_BARRA_KG : PESOS_BARRA_LB;
    if (nuevaHerramienta.esBumpers) return nuevaHerramienta.esKilo ? PESOS_BUMPER_KG : PESOS_BUMPER_LB;
    if (nuevaHerramienta.esKettlebell) return nuevaHerramienta.esKilo ? PESOS_KETTLEBELL_KG : PESOS_KETTLEBELL_LB;
    if (nuevaHerramienta.esMancuerna) return nuevaHerramienta.esKilo ? PESOS_MANCUERNA_KG : PESOS_MANCUERNA_LB;
    if (nuevaHerramienta.esPelota) return nuevaHerramienta.esKilo ? PESOS_PELOTA_KG : PESOS_PELOTA_LB;
    return [];
  }

  function getUnidadLabel() {
    if (nuevaHerramienta.esKilo) return 'kg';
    if (nuevaHerramienta.esLibra) return 'lbs';
    if (nuevaHerramienta.esMetro) return 'm';
    return '';
  }

  const mostrarGridPesos = (nuevaHerramienta.esBarra || nuevaHerramienta.esBumpers || nuevaHerramienta.esKettlebell || nuevaHerramienta.esMancuerna || nuevaHerramienta.esPelota) && (nuevaHerramienta.esKilo || nuevaHerramienta.esLibra);
  const totalPaginasInventario = Math.ceil(herramientasFiltradas.length / INVENTARIO_POR_PAGINA);
  const herramientasPagina = herramientasFiltradas.slice(
    (paginaInventario - 1) * INVENTARIO_POR_PAGINA,
    paginaInventario * INVENTARIO_POR_PAGINA
  );
  const totalPaginasVerif = Math.ceil(herramientasFiltradasVerificacion.length / VERIF_POR_PAGINA);
  const herramientasVerifPagina = herramientasFiltradasVerificacion.slice(
    (paginaVerificacion - 1) * VERIF_POR_PAGINA,
    paginaVerificacion * VERIF_POR_PAGINA
  );
  const requiereUnidad = !nuevaHerramienta.esCajon;
  const unidadSeleccionada = nuevaHerramienta.esKilo || nuevaHerramienta.esLibra || nuevaHerramienta.esMetro || nuevaHerramienta.esMaquina;

  if (loading) return (
    <div className="min-vh-100 d-flex justify-content-center align-items-center" style={{ background: 'var(--bg-base)' }}>
      <AtletifyLoader />
    </div>
  );

  return (
    <div className="almacen-container">

      <header className="almacen-header">
        <BackButton to="/admin-box-panel" />
        <h1 className="almacen-title">
          <i className="fas fa-warehouse me-2" style={{ color: 'var(--primary)' }}></i>Inventario de Equipamiento
        </h1>
        <span className="almacen-badge ms-auto">
          <i className="fas fa-dumbbell me-1"></i>{box?.nombre || 'Box'}
        </span>
      </header>

      <div className="container">

        {/* NAVEGACIÓN */}
        <div className="almacen-nav">
          <button type="button" className={`almacen-nav-btn ${vistaActiva === 'ver' ? 'active' : ''}`} onClick={() => setVistaActiva('ver')}>
            <i className="fas fa-boxes"></i><span>Ver Inventario</span>
          </button>
          <button type="button" className={`almacen-nav-btn ${vistaActiva === 'agregar' ? 'active' : ''}`} onClick={() => setVistaActiva('agregar')}>
            <i className="fas fa-plus-circle"></i><span>Agregar Nuevo</span>
          </button>
          <button type="button" className={`almacen-nav-btn ${vistaActiva === 'modificar' ? 'active' : ''}`} onClick={() => setVistaActiva('modificar')}>
            <i className="fas fa-edit"></i><span>Modificar</span>
          </button>
        </div>

        {/* ===== VISTA: AGREGAR ===== */}
        {vistaActiva === 'agregar' && (
          <div className="almacen-card">
            <div className="almacen-card-body">

              {/* ── Header con stepper ── */}
              <div className="ag-header">
                <h2 className="almacen-section-title mb-0">
                  <i className="fas fa-plus-circle"></i>Agregar Equipamiento
                </h2>
                <div className="ag-steps">
                  <div className={`ag-step ${pasoAgregar >= 1 ? 'active' : ''} ${pasoAgregar > 1 ? 'done' : ''}`}>
                    <div className="ag-step-circle">
                      {pasoAgregar > 1 ? <i className="fas fa-check"></i> : '1'}
                    </div>
                    <span className="ag-step-label">Tipo</span>
                  </div>
                  <div className="ag-step-line"></div>
                  <div className={`ag-step ${pasoAgregar >= 2 ? 'active' : ''}`}>
                    <div className="ag-step-circle">2</div>
                    <span className="ag-step-label">Detalles</span>
                  </div>
                </div>
              </div>

              <form id="form-agregar" onSubmit={crearHerramienta}>

                {/* ── PASO 1: Tipo + Unidad ── */}
                {pasoAgregar === 1 && (
                  <>
                    {/* Tipo */}
                    <div className="ag-section">
                      <p className="ag-section-label">
                        <i className="fas fa-tag"></i>Tipo de Equipamiento
                      </p>
                      <div className="ag-tipo-grid">

                        <label className={`ag-tipo-card ${nuevaHerramienta.esBarra ? 'selected' : ''}`}>
                          <input type="radio" name="nuevo-categoria" checked={nuevaHerramienta.esBarra}
                            onChange={() => setNuevaHerramienta(prev => ({ ...prev, esBarra: true, esBumpers: false, esKettlebell: false, esMancuerna: false, esCajon: false, esOtra: false, esPelota: false, medida: 0, esMetro: false, esMaquina: false }))} />
                          <i className="fas fa-grip-lines-vertical ag-tipo-icon"></i>
                          <span className="ag-tipo-name">Barra</span>
                        </label>

                        <label className={`ag-tipo-card ${nuevaHerramienta.esBumpers ? 'selected' : ''}`}>
                          <input type="radio" name="nuevo-categoria" checked={nuevaHerramienta.esBumpers}
                            onChange={() => setNuevaHerramienta(prev => ({ ...prev, esBarra: false, esBumpers: true, esKettlebell: false, esMancuerna: false, esCajon: false, esOtra: false, esPelota: false, medida: 0, esMetro: false, esMaquina: false }))} />
                          <i className="fas fa-circle ag-tipo-icon"></i>
                          <span className="ag-tipo-name">Disco / Bumper</span>
                        </label>

                        <label className={`ag-tipo-card ${nuevaHerramienta.esKettlebell ? 'selected' : ''}`}>
                          <input type="radio" name="nuevo-categoria" checked={nuevaHerramienta.esKettlebell}
                            onChange={() => setNuevaHerramienta(prev => ({ ...prev, esBarra: false, esBumpers: false, esKettlebell: true, esMancuerna: false, esCajon: false, esOtra: false, esPelota: false, medida: 0, esMetro: false, esMaquina: false }))} />
                          <i className="fas fa-weight-hanging ag-tipo-icon"></i>
                          <span className="ag-tipo-name">Kettlebell</span>
                        </label>

                        <label className={`ag-tipo-card ${nuevaHerramienta.esMancuerna ? 'selected' : ''}`}>
                          <input type="radio" name="nuevo-categoria" checked={nuevaHerramienta.esMancuerna}
                            onChange={() => setNuevaHerramienta(prev => ({ ...prev, esBarra: false, esBumpers: false, esKettlebell: false, esMancuerna: true, esCajon: false, esOtra: false, esPelota: false, medida: 0, esMetro: false, esMaquina: false }))} />
                          <i className="fas fa-dumbbell ag-tipo-icon"></i>
                          <span className="ag-tipo-name">Mancuerna</span>
                        </label>

                        <label className={`ag-tipo-card ${nuevaHerramienta.esPelota ? 'selected' : ''}`}>
                          <input type="radio" name="nuevo-categoria" checked={nuevaHerramienta.esPelota}
                            onChange={() => setNuevaHerramienta(prev => ({ ...prev, esBarra: false, esBumpers: false, esKettlebell: false, esMancuerna: false, esCajon: false, esOtra: false, esPelota: true, medida: 0, esMetro: false, esMaquina: false }))} />
                          <i className="fas fa-volleyball-ball ag-tipo-icon"></i>
                          <span className="ag-tipo-name">Pelota</span>
                        </label>

                        <label className={`ag-tipo-card ${nuevaHerramienta.esCajon ? 'selected' : ''}`}>
                          <input type="radio" name="nuevo-categoria" checked={nuevaHerramienta.esCajon}
                            onChange={() => setNuevaHerramienta(prev => ({ ...prev, esBarra: false, esBumpers: false, esKettlebell: false, esMancuerna: false, esCajon: true, esOtra: false, esPelota: false, medida: 0, esKilo: false, esLibra: false, esMetro: false, esMaquina: false }))} />
                          <i className="fas fa-cube ag-tipo-icon"></i>
                          <span className="ag-tipo-name">Cajón</span>
                        </label>

                        <label className={`ag-tipo-card ${nuevaHerramienta.esOtra ? 'selected' : ''}`}>
                          <input type="radio" name="nuevo-categoria" checked={nuevaHerramienta.esOtra}
                            onChange={() => setNuevaHerramienta(prev => ({ ...prev, esBarra: false, esBumpers: false, esKettlebell: false, esMancuerna: false, esCajon: false, esOtra: true, esPelota: false, medida: 0 }))} />
                          <i className="fas fa-toolbox ag-tipo-icon"></i>
                          <span className="ag-tipo-name">Otro</span>
                        </label>

                      </div>
                    </div>

                    {/* Unidad */}
                    {!nuevaHerramienta.esCajon && (
                      <div className="ag-section">
                        <p className="ag-section-label">
                          <i className="fas fa-ruler"></i>Unidad de Medida
                        </p>
                        <div className="ag-unidad-pills">
                          <button type="button"
                            className={`ag-pill ${nuevaHerramienta.esKilo ? 'selected' : ''}`}
                            onClick={() => setNuevaHerramienta(prev => ({ ...prev, esKilo: true, esLibra: false, esMetro: false, esMaquina: false, medida: 0 }))}>
                            <i className="fas fa-weight"></i>
                            <span>Kilogramos</span>
                            <small>kg</small>
                          </button>
                          <button type="button"
                            className={`ag-pill ${nuevaHerramienta.esLibra ? 'selected' : ''}`}
                            onClick={() => setNuevaHerramienta(prev => ({ ...prev, esKilo: false, esLibra: true, esMetro: false, esMaquina: false, medida: 0 }))}>
                            <i className="fas fa-weight"></i>
                            <span>Libras</span>
                            <small>lbs</small>
                          </button>
                          {nuevaHerramienta.esOtra && (
                            <>
                              <button type="button"
                                className={`ag-pill ${nuevaHerramienta.esMetro ? 'selected' : ''}`}
                                onClick={() => setNuevaHerramienta(prev => ({ ...prev, esKilo: false, esLibra: false, esMetro: true, esMaquina: false }))}>
                                <i className="fas fa-ruler-horizontal"></i>
                                <span>Metros</span>
                                <small>m</small>
                              </button>
                              <button type="button"
                                className={`ag-pill ${nuevaHerramienta.esMaquina ? 'selected' : ''}`}
                                onClick={() => setNuevaHerramienta(prev => ({ ...prev, esKilo: false, esLibra: false, esMetro: false, esMaquina: true }))}>
                                <i className="fas fa-cogs"></i>
                                <span>Máquina</span>
                              </button>
                            </>
                          )}
                        </div>
                        {requiereUnidad && !unidadSeleccionada && (
                          <p className="ag-hint-error">
                            <i className="fas fa-circle-exclamation"></i>
                            Selecciona una unidad para continuar
                          </p>
                        )}
                      </div>
                    )}

                    <div className="ag-footer">
                      <button type="button" className="almacen-btn almacen-btn-secondary" onClick={resetFormAgregar}>
                        <i className="fas fa-redo"></i>Reiniciar
                      </button>
                      <button
                        type="button"
                        className="almacen-btn almacen-btn-primary"
                        onClick={() => {
                          if (herramientasFiltradasVerificacion.length > 0) {
                            setPaginaVerificacion(1);
                            setBusquedaVerificacion('');
                            setShowVerificacionModal(true);
                          } else {
                            setPasoAgregar(2);
                          }
                        }}
                        disabled={requiereUnidad && !unidadSeleccionada}>
                        Siguiente <i className="fas fa-arrow-right"></i>
                      </button>
                    </div>
                  </>
                )}

                {/* ── PASO 2: Peso + Cantidad + Notas ── */}
                {pasoAgregar === 2 && (
                  <>
                    {/* Resumen tipo/unidad */}
                    <div className="ag-resumen">
                      <span className="ag-resumen-chip">
                        <i className="fas fa-tag"></i>
                        {nuevaHerramienta.esBarra ? 'Barra' : nuevaHerramienta.esBumpers ? 'Disco / Bumper' : nuevaHerramienta.esKettlebell ? 'Kettlebell' : nuevaHerramienta.esMancuerna ? 'Mancuerna' : nuevaHerramienta.esCajon ? 'Cajón' : nuevaHerramienta.esPelota ? 'Pelota' : 'Otro equipo'}
                      </span>
                      {!nuevaHerramienta.esCajon && (
                        <span className="ag-resumen-chip">
                          <i className="fas fa-ruler"></i>
                          {nuevaHerramienta.esKilo ? 'Kilogramos (kg)' : nuevaHerramienta.esLibra ? 'Libras (lbs)' : nuevaHerramienta.esMetro ? 'Metros (m)' : 'Máquina'}
                        </span>
                      )}
                    </div>

                    {/* Grid de pesos predefinidos */}
                    {mostrarGridPesos && (
                      <div className="ag-section">
                        <p className="ag-section-label">
                          <i className="fas fa-weight"></i>
                          {nuevaHerramienta.esBarra ? 'Peso de la Barra' : nuevaHerramienta.esBumpers ? 'Peso del Disco / Bumper' : nuevaHerramienta.esKettlebell ? 'Peso de la Kettlebell' : nuevaHerramienta.esPelota ? 'Peso de la Pelota' : 'Peso de la Mancuerna'}
                        </p>
                        <div className="almacen-peso-grid">
                          {getPesosActuales().map(p => (
                            <button key={p} type="button"
                              className={`almacen-peso-chip ${Number(nuevaHerramienta.medida) === p ? 'selected' : ''}`}
                              onClick={() => setNuevaHerramienta(prev => ({ ...prev, medida: p }))}>
                              <span className="almacen-peso-chip-valor">{p}</span>
                              <span className="almacen-peso-chip-unit">{getUnidadLabel()}</span>
                            </button>
                          ))}
                        </div>
                        <div className="ag-custom-peso">
                          <label className="almacen-label">Otro peso ({getUnidadLabel()})</label>
                          <input
                            type="number" step="0.01" min="0" max="999"
                            className="form-control almacen-input"
                            placeholder={`Ej: ${nuevaHerramienta.esKilo ? '13.5' : '27.5'}`}
                            value={nuevaHerramienta.medida || ''}
                            onChange={(e) => {
                              const v = e.target.value;
                              if (v === '' || /^\d{0,3}(\.\d{0,2})?$/.test(v)) {
                                setNuevaHerramienta(prev => ({ ...prev, medida: v === '' ? 0 : v }));
                              }
                            }} />
                        </div>
                        {nuevaHerramienta.medida > 0 && (
                          <p className="ag-selected-peso">
                            <i className="fas fa-check-circle"></i>
                            <strong>{nuevaHerramienta.medida} {getUnidadLabel()}</strong> seleccionado
                          </p>
                        )}
                      </div>
                    )}

                    {/* Para Otro equipo: nombre + medida libre */}
                    {nuevaHerramienta.esOtra && (
                      <div className="ag-section">
                        <p className="ag-section-label"><i className="fas fa-pen"></i>Datos del equipo</p>
                        <div className="almacen-field-group cols-2">
                          <div>
                            <label className="almacen-label">Nombre del equipo</label>
                            <input type="text" className="form-control almacen-input"
                              placeholder="Ej: Cuerda, Balón..." required maxLength={50}
                              value={nuevaHerramienta.nombre}
                              onChange={(e) => setNuevaHerramienta(prev => ({ ...prev, nombre: e.target.value }))} />
                          </div>
                          {!nuevaHerramienta.esMaquina && (
                            <div>
                              <label className="almacen-label">Peso / Medida</label>
                              <input type="number" step="0.01" min="0" max="999" className="form-control almacen-input"
                                placeholder="Ej: 10, 1.5..."
                                value={nuevaHerramienta.medida || ''}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  if (v === '' || /^\d{0,3}(\.\d{0,2})?$/.test(v)) {
                                    setNuevaHerramienta(prev => ({ ...prev, medida: v === '' ? 0 : v }));
                                  }
                                }} />
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Cantidad + Notas en fila */}
                    <div className="ag-section">
                      <p className="ag-section-label"><i className="fas fa-boxes"></i>Stock y descripción</p>
                      <div className="almacen-field-group cols-2">
                        <div>
                          <label className="almacen-label">
                            <i className="fas fa-layer-group me-1"></i>Unidades disponibles
                          </label>
                          <input type="number" className="form-control almacen-input" min="1" max="9999"
                            placeholder="Ej: 10" required
                            value={nuevaHerramienta.cantidad || ''}
                            onChange={(e) => {
                              const v = e.target.value;
                              if (v === '' || /^\d{0,4}$/.test(v)) {
                                setNuevaHerramienta(prev => ({ ...prev, cantidad: v }));
                              }
                            }} />
                        </div>
                        <div>
                          <label className="almacen-label">
                            <i className="fas fa-note-sticky me-1"></i>{nuevaHerramienta.esCajon ? 'Cómo se mide' : 'Notas adicionales'}
                          </label>
                          <textarea className="form-control almacen-input" rows="1"
                            maxLength={200}
                            required={nuevaHerramienta.esCajon}
                            placeholder={nuevaHerramienta.esCajon ? 'Ej: largo x ancho x alto, por módulo...' : 'Marca, condición, observaciones...'}
                            value={nuevaHerramienta.descripcionAdicional || ''}
                            onChange={(e) => setNuevaHerramienta(prev => ({ ...prev, descripcionAdicional: e.target.value }))} />
                        </div>
                      </div>
                    </div>

                    <div className="ag-footer">
                      <button type="button" className="almacen-btn almacen-btn-secondary" onClick={() => setPasoAgregar(1)}>
                        <i className="fas fa-arrow-left"></i>Atrás
                      </button>
                      <button type="submit" form="form-agregar" className="almacen-btn almacen-btn-primary" disabled={saving}>
                        <i className="fas fa-save"></i>{saving ? 'Guardando...' : 'Guardar Equipamiento'}
                      </button>
                    </div>
                  </>
                )}

              </form>
            </div>
          </div>
        )}

        {/* ===== VISTA: MODIFICAR ===== */}
        {vistaActiva === 'modificar' && (
          <div className="almacen-card">
            <div className="almacen-card-body">
              <h2 className="almacen-section-title"><i className="fas fa-edit"></i>Modificar Equipamiento</h2>

              <div className="almacen-modificar-layout">

                {/* ── Panel izquierdo: Lista + buscador ── */}
                <div className="almacen-modificar-lista">
                  <div className="mb-3">
                    <label className="almacen-label"><i className="fas fa-search me-1"></i> Filtrar</label>
                    <input type="text" className="form-control almacen-input"
                      placeholder="Buscar por nombre..."
                      maxLength={50}
                      value={busquedaHerramientaModificar}
                      onChange={(e) => setBusquedaHerramientaModificar(e.target.value)} />
                  </div>

                  {herramientas.length === 0 ? (
                    <div className="almacen-empty" style={{ padding: '2rem 1rem' }}>
                      <i className="fas fa-inbox"></i>
                      <p>No hay equipamiento registrado</p>
                    </div>
                  ) : herramientasFiltradasModificar.length === 0 ? (
                    <div className="almacen-empty" style={{ padding: '1.5rem 1rem' }}>
                      <i className="fas fa-search"></i>
                      <p>Sin resultados</p>
                    </div>
                  ) : (
                    <div className="almacen-modificar-items">
                      {herramientasFiltradasModificar.map((h) => {
                        const idH = getHerramientaId(h);
                        const nombre = h.nombre ?? h.Nombre;
                        const medida = getHerramientaMedida(h);
                        const cantidad = h.cantidad ?? h.Cantidad;
                        const estaSeleccionado = String(edicion.idHerramienta) === String(idH);
                        return (
                          <div key={idH}
                            className={`almacen-modificar-item ${estaSeleccionado ? 'activo' : ''}`}
                            onClick={() => seleccionarHerramienta(idH)}>
                            <div className="almacen-modificar-item-info">
                              <span className="almacen-modificar-item-nombre">{nombre}</span>
                              <span className="almacen-modificar-item-detalle">
                                {medida > 0 ? `${medida} ${getTipoUnidadHerramienta(h).toLowerCase()}` : 'Sin medida'}
                                {' · '}{cantidad} uds
                              </span>
                            </div>
                            <span className="almacen-modificar-item-categoria">{getCategoriaHerramienta(h)}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* ── Panel derecho: Formulario ── */}
                <div className="almacen-modificar-form">
                  {!edicion.idHerramienta ? (
                    <div className="almacen-empty">
                      <i className="fas fa-hand-pointer"></i>
                      <p>Selecciona un equipo de la lista</p>
                    </div>
                  ) : (
                    <>
                      {/* Cabecera: badges de solo lectura + botón cancelar */}
                      <div className="d-flex justify-content-between align-items-start gap-2 mb-4">
                        <div className="almacen-modificar-readonly-row">
                          <span className="almacen-modificar-readonly-badge">
                            <i className="fas fa-tag me-1"></i>
                            {getCategoriaHerramienta(herramientaSeleccionada)}
                          </span>
                          <span className="almacen-modificar-readonly-badge">
                            <i className="fas fa-ruler me-1"></i>
                            {edicion.esCajon ? 'Sin unidad' : getTipoUnidadHerramienta(herramientaSeleccionada)}
                          </span>
                        </div>
                        <button
                          type="button"
                          className="almacen-btn almacen-btn-secondary"
                          onClick={cancelarEdicion}
                          title="Cancelar edición"
                          style={{ flexShrink: 0, padding: '0.45rem 0.75rem' }}>
                          <i className="fas fa-times"></i>
                        </button>
                      </div>

                      <h3 className="almacen-sub-section-title"><i className="fas fa-pen"></i> Editar Datos</h3>

                      {/* Nombre */}
                      <div style={{ marginBottom: '1.25rem' }}>
                        <label className="almacen-label">Nombre del equipo</label>
                        <input type="text" className="form-control almacen-input"
                          placeholder="Nombre del equipo..."
                          maxLength={50}
                          value={edicion.nombre}
                          onChange={(e) => setEdicion(prev => ({ ...prev, nombre: e.target.value }))} />
                      </div>

                      {/* Descripción Adicional */}
                      <div style={{ marginBottom: '1.25rem' }}>
                        <label className="almacen-label">
                          <i className="fas fa-note-sticky me-1"></i> {edicion.esCajon ? 'Cómo se mide' : 'Descripción adicional'}
                        </label>
                        <textarea className="form-control almacen-input" rows="2"
                          maxLength={200}
                          placeholder={edicion.esCajon ? 'Ej: se mide por largo x ancho x alto, por módulo, por cavidades...' : 'Agrrega detalles adicionales (ej: marca, condición, observaciones...)'}
                          value={edicion.descripcionAdicional || ''}
                          onChange={(e) => setEdicion(prev => ({ ...prev, descripcionAdicional: e.target.value }))} />
                      </div>

                      {edicion.esCajon ? (
                        <div className="almacen-field-group cols-1" style={{ marginBottom: '1.25rem' }}>
                          <div>
                            <label className="almacen-label">Unidades disponibles</label>
                            <input type="number" min="0" max="9999" className="form-control almacen-input"
                              placeholder="Ej: 10" required
                              value={edicion.cantidad || ''}
                              onChange={(e) => {
                                const v = e.target.value;
                                if (v === '' || /^\d{0,4}$/.test(v)) {
                                  setEdicion(prev => ({ ...prev, cantidad: v }));
                                }
                              }} />
                          </div>
                        </div>
                      ) : (
                        <div className="almacen-field-group cols-2" style={{ marginBottom: '1.25rem' }}>
                          <div>
                            <label className="almacen-label">Peso / Medida</label>
                            <input type="number" step="0.01" min="0" max="999" className="form-control almacen-input"
                              placeholder="Ej: 20"
                              value={edicion.medida || ''}
                              onChange={(e) => {
                                const v = e.target.value;
                                if (v === '' || /^\d{0,3}(\.\d{0,2})?$/.test(v)) {
                                  setEdicion(prev => ({ ...prev, medida: v === '' ? 0 : v }));
                                }
                              }} />
                          </div>
                          <div>
                            <label className="almacen-label">Unidades disponibles</label>
                            <input type="number" min="0" max="9999" className="form-control almacen-input"
                              placeholder="Ej: 10" required
                              value={edicion.cantidad || ''}
                              onChange={(e) => {
                                const v = e.target.value;
                                if (v === '' || /^\d{0,4}$/.test(v)) {
                                  setEdicion(prev => ({ ...prev, cantidad: v }));
                                }
                              }} />
                          </div>
                        </div>
                      )}

                      <button type="button" className="almacen-btn almacen-btn-primary w-100 mb-4" onClick={guardarMedida} disabled={saving}>
                        <i className="fas fa-save me-2"></i>{saving ? 'Guardando...' : 'Guardar Cambios'}
                      </button>


                    </>
                  )}
                </div>

              </div>
            </div>
          </div>
        )}

        {/* ===== VISTA: VER INVENTARIO ===== */}
        {vistaActiva === 'ver' && (
          <div className="almacen-card">
            <div className="almacen-card-body">

              {/* Header con buscador */}
              <div className="almacen-table-header">
                <div>
                  <h2 className="almacen-table-title"><i className="fas fa-boxes" style={{ color: 'var(--primary)' }}></i>Inventario Actual</h2>
                  {herramientasFiltradas.length !== herramientas.length && herramientas.length > 0 && (
                    <p className="inv-search-hint">
                      <strong>{herramientasFiltradas.length}</strong> resultado{herramientasFiltradas.length !== 1 ? 's' : ''} de {herramientas.length} equipos
                    </p>
                  )}
                </div>
                <div className="almacen-search">
                  <div style={{ position: 'relative' }}>
                    <i className="fas fa-search" style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '0.8rem', pointerEvents: 'none' }}></i>
                    <input type="text" className="form-control almacen-input" placeholder="Buscar por nombre, tipo, unidad, notas..."
                      maxLength={50} style={{ paddingLeft: '2.5rem' }}
                      value={busquedaHerramienta} onChange={(e) => { setBusquedaHerramienta(e.target.value); setPaginaInventario(1); }} />
                  </div>
                </div>
              </div>

              {herramientas.length === 0 ? (
                <div className="almacen-empty">
                  <i className="fas fa-inbox"></i>
                  <p>No hay equipamiento registrado</p>
                </div>
              ) : herramientasFiltradas.length === 0 ? (
                <div className="almacen-empty">
                  <i className="fas fa-search"></i>
                  <p>Sin resultados para "{busquedaHerramienta}"</p>
                </div>
              ) : (
                <>
                <div className="almacen-inventory-grid">
                  {herramientasPagina.map((h) => {
                    const idHerramienta = getHerramientaId(h);
                    const nombre = h.nombre ?? h.Nombre;
                    const cantidad = h.cantidad ?? h.Cantidad;
                    const medida = getHerramientaMedida(h);
                    const unidad = getTipoUnidadHerramienta(h);
                    const tipo = getCategoriaHerramienta(h);
                    const notas = h.descripcionAdicional ?? h.DescripcionAdicional;
                    return (
                      <div key={idHerramienta} className="almacen-inventory-item">

                        {/* Fila 1: nombre + stock */}
                        <div className="almacen-inventory-header">
                          <div className="almacen-inventory-name">{nombre}</div>
                          <span className="almacen-inventory-qty">{cantidad} uds</span>
                        </div>

                        {/* Fila 2: badges tipo + unidad */}
                        <div className="inv-badges-row">
                          <span className="av-badge av-badge--tipo">
                            <i className="fas fa-tag"></i>{tipo}
                          </span>
                          {unidad !== 'Sin unidad' && (
                            <span className="av-badge av-badge--unidad">
                              <i className="fas fa-ruler"></i>{unidad}
                            </span>
                          )}
                          {medida > 0 && (
                            <span className="inv-medida-badge">
                              <i className="fas fa-weight"></i>
                              <strong>{medida}</strong>
                              <span>{unidad !== 'Sin unidad' ? unidad.toLowerCase() : ''}</span>
                            </span>
                          )}
                        </div>

                        {/* Notas */}
                        {notas && (
                          <div className="almacen-inventory-description">
                            <i className="fas fa-note-sticky"></i> {notas}
                          </div>
                        )}

                        {/* Eliminar */}
                        <div className="almacen-inventory-actions">
                          <button onClick={() => eliminarHerramienta(idHerramienta, nombre)} className="almacen-delete-btn" title="Eliminar" disabled={saving}>
                            <i className="fas fa-trash"></i>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Paginación */}
                {totalPaginasInventario > 1 && (
                  <div className="av-pagination" style={{ marginTop: '1rem' }}>
                    <button className="av-page-btn" disabled={paginaInventario === 1} onClick={() => setPaginaInventario(p => p - 1)}>
                      <i className="fas fa-chevron-left"></i>
                    </button>
                    <span className="av-page-info">{paginaInventario} / {totalPaginasInventario}</span>
                    <button className="av-page-btn" disabled={paginaInventario === totalPaginasInventario} onClick={() => setPaginaInventario(p => p + 1)}>
                      <i className="fas fa-chevron-right"></i>
                    </button>
                  </div>
                )}
                </>
              )}
            </div>
          </div>
        )}

      </div>

      {/* ===== MODAL: VERIFICACIÓN PRE-AGREGAR ===== */}
      {showVerificacionModal && (
        <div className="almacen-confirm-overlay" onClick={() => setShowVerificacionModal(false)}>
          <div className="almacen-confirm-modal modal-grande" onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="av-modal-header">
              <div className="av-modal-icon">
                <i className="fas fa-clipboard-check"></i>
              </div>
              <div>
                <p className="av-modal-supertitle">Paso previo</p>
                <h3 className="almacen-confirm-titulo" style={{ margin: 0 }}>Verifica tu Inventario</h3>
              </div>
            </div>

            <p className="almacen-confirm-desc" style={{ margin: '0.75rem 0 1.1rem', textAlign: 'center' }}>
              Revisa si el equipo ya existe en tu inventario para evitar duplicados.
            </p>

            {/* Botones de acción — antes del listado */}
            <div className="almacen-confirm-btns" style={{ marginBottom: '1rem' }}>
              <button className="almacen-btn almacen-btn-secondary" onClick={() => setShowVerificacionModal(false)}>
                <i className="fas fa-arrow-left"></i> Regresar
              </button>
              <button className="almacen-btn almacen-btn-primary" onClick={() => { setShowVerificacionModal(false); setPasoAgregar(2); }}>
                No está aquí <i className="fas fa-arrow-right"></i>
              </button>
            </div>

            {/* Buscador */}
            <div className="av-search-wrap">
              <i className="fas fa-search av-search-icon"></i>
              <input
                type="text"
                className="form-control almacen-input av-search-input"
                placeholder="Buscar por nombre o notas..."
                maxLength={50}
                value={busquedaVerificacion}
                onChange={e => { setBusquedaVerificacion(e.target.value); setPaginaVerificacion(1); }}
              />
            </div>

            {/* Contador */}
            {herramientasFiltradasVerificacion.length > 0 && (
              <p className="av-count-info">
                <strong>{herramientasFiltradasVerificacion.length}</strong> coincidencia{herramientasFiltradasVerificacion.length !== 1 ? 's' : ''} encontrada{herramientasFiltradasVerificacion.length !== 1 ? 's' : ''}
                {totalPaginasVerif > 1 && <> · Página <strong>{paginaVerificacion}</strong> de <strong>{totalPaginasVerif}</strong></>}
              </p>
            )}

            {/* Lista */}
            <div className="av-lista">
              {herramientasFiltradasVerificacion.length === 0 ? (
                <div className="almacen-empty" style={{ padding: '2.5rem 1rem' }}>
                  <i className="fas fa-ghost"></i>
                  <p>Sin coincidencias en tu inventario actual.</p>
                </div>
              ) : (
                herramientasVerifPagina.map((h, idx) => {
                  const idH = getHerramientaId(h);
                  const medida = getHerramientaMedida(h);
                  const cantidad = h.cantidad ?? h.Cantidad ?? 0;
                  const notas = h.descripcionAdicional ?? h.DescripcionAdicional;
                  const unidad = getTipoUnidadHerramienta(h);
                  const tipo = getCategoriaHerramienta(h);
                  return (
                    <div key={idH} className="av-card" style={{ animationDelay: `${idx * 0.04}s` }}>

                      {/* Fila superior: nombre + badges */}
                      <div className="av-card-header">
                        <span className="av-card-nombre">{h.nombre ?? h.Nombre}</span>
                        <div className="av-card-badges">
                          <span className="av-badge av-badge--tipo">
                            <i className="fas fa-tag"></i>{tipo}
                          </span>
                          {unidad !== 'Sin unidad' && (
                            <span className="av-badge av-badge--unidad">
                              <i className="fas fa-ruler"></i>{unidad}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Fila de métricas */}
                      <div className="av-card-body">
                        {medida > 0 && (
                          <div className="av-meta-item av-meta-item--medida">
                            <i className="fas fa-weight av-meta-icon"></i>
                            <span className="av-meta-val">{medida}</span>
                            <span className="av-meta-unit">{unidad.toLowerCase()}</span>
                          </div>
                        )}
                        <div className="av-meta-item av-meta-item--qty">
                          <i className="fas fa-layer-group av-meta-icon"></i>
                          <span className="av-meta-val">{cantidad}</span>
                          <span className="av-meta-unit">en stock</span>
                        </div>
                      </div>

                      {/* Notas */}
                      {notas && (
                        <div className="av-notas">
                          <i className="fas fa-note-sticky"></i>
                          <span>{notas}</span>
                        </div>
                      )}

                      {/* Acción: sumar cantidad */}
                      <div className="av-card-actions">
                        <div className="av-qty-ctrl">
                          <label className="av-qty-label">Agregar:</label>
                          <input
                            type="number"
                            className="form-control av-qty-input"
                            defaultValue={1}
                            max={999}
                            id={`qty-${idH}`}
                            onFocus={(e) => e.target.select()}
                            onInvalid={(e) => e.preventDefault()}
                            onChange={(e) => {
                              const v = Number(e.target.value);
                              if (e.target.value !== '' && v > 999) e.target.value = 999;
                              if (e.target.value !== '' && v < 1) e.target.value = 1;
                            }}
                          />
                        </div>
                        <button
                          className="av-add-btn"
                          disabled={saving}
                          onClick={() => {
                            const el = document.getElementById(`qty-${idH}`);
                            const val = Number(el?.value ?? 0);
                            if (!val || val < 1) {
                              window.alert('La cantidad a agregar debe ser al menos 1.');
                              el?.focus();
                              return;
                            }
                            sumarCantidadExistente(h, val);
                          }}
                        >
                          <i className="fas fa-plus"></i> Sumar al inventario
                        </button>
                      </div>

                    </div>
                  );
                })
              )}
            </div>

            {/* Paginación */}
            {totalPaginasVerif > 1 && (
              <div className="av-pagination">
                <button className="av-page-btn" disabled={paginaVerificacion === 1} onClick={() => setPaginaVerificacion(p => p - 1)}>
                  <i className="fas fa-chevron-left"></i>
                </button>
                <span className="av-page-info">{paginaVerificacion} / {totalPaginasVerif}</span>
                <button className="av-page-btn" disabled={paginaVerificacion === totalPaginasVerif} onClick={() => setPaginaVerificacion(p => p + 1)}>
                  <i className="fas fa-chevron-right"></i>
                </button>
              </div>
            )}

          </div>
        </div>
      )}

      {/* ===== MODAL: CONFIRMAR SUMA DE CANTIDAD ===== */}
      {confirmSuma && (
        <div className="almacen-confirm-overlay" onClick={() => setConfirmSuma(null)}>
          <div className="almacen-confirm-modal modal-grande" onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="av-modal-header">
              <div className="av-modal-icon" style={{ background: 'rgba(255,193,7,0.1)', borderColor: 'rgba(255,193,7,0.3)', color: '#ffc107' }}>
                <i className="fas fa-exclamation-triangle"></i>
              </div>
              <div>
                <p className="av-modal-supertitle" style={{ color: '#ffc107' }}>Duplicado detectado</p>
                <h3 className="almacen-confirm-titulo" style={{ margin: 0 }}>¿Sumar o crear nuevo?</h3>
              </div>
            </div>

            <p className="almacen-confirm-desc" style={{ margin: '0.75rem 0 1rem', textAlign: 'center' }}>
              Encontramos <strong>{confirmSuma.herramientas.length}</strong> registro{confirmSuma.herramientas.length !== 1 ? 's' : ''} con las mismas especificaciones. Suma al existente o guarda como entrada nueva.
            </p>

            <div className="av-lista" style={{ maxHeight: '42dvh' }}>
              {confirmSuma.herramientas.map((h, idx) => {
                const idH = getHerramientaId(h);
                const medida = getHerramientaMedida(h);
                const cantidad = h.cantidad ?? h.Cantidad ?? 0;
                const notas = h.descripcionAdicional ?? h.DescripcionAdicional;
                const unidad = getTipoUnidadHerramienta(h);
                const tipo = getCategoriaHerramienta(h);
                return (
                  <div key={idH} className="av-card" style={{ animationDelay: `${idx * 0.04}s` }}>
                    <div className="av-card-header">
                      <span className="av-card-nombre">{h.nombre ?? h.Nombre}</span>
                      <div className="av-card-badges">
                        <span className="av-badge av-badge--tipo"><i className="fas fa-tag"></i>{tipo}</span>
                        {unidad !== 'Sin unidad' && <span className="av-badge av-badge--unidad"><i className="fas fa-ruler"></i>{unidad}</span>}
                      </div>
                    </div>
                    <div className="av-card-body">
                      {medida > 0 && (
                        <div className="av-meta-item av-meta-item--medida">
                          <i className="fas fa-weight av-meta-icon"></i>
                          <span className="av-meta-val">{medida}</span>
                          <span className="av-meta-unit">{unidad.toLowerCase()}</span>
                        </div>
                      )}
                      <div className="av-meta-item av-meta-item--qty">
                        <i className="fas fa-layer-group av-meta-icon"></i>
                        <span className="av-meta-val">{cantidad}</span>
                        <span className="av-meta-unit">en stock</span>
                      </div>
                    </div>
                    {notas && (
                      <div className="av-notas">
                        <i className="fas fa-note-sticky"></i>
                        <span>{notas}</span>
                      </div>
                    )}
                    <div className="av-card-actions">
                      <button
                        className="av-add-btn"
                        style={{ background: 'rgba(255,193,7,0.1)', borderColor: 'rgba(255,193,7,0.3)', color: '#ffd94a' }}
                        onClick={() => sumarCantidadExistente(h, confirmSuma.cantidadNueva)}
                        disabled={saving}>
                        <i className="fas fa-plus"></i>
                        Sumar {confirmSuma.cantidadNueva} ud{confirmSuma.cantidadNueva > 1 ? 's' : ''}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="almacen-confirm-btns" style={{ marginTop: '1.25rem' }}>
              <button className="almacen-btn almacen-btn-secondary" onClick={() => setConfirmSuma(null)} disabled={saving}>
                Cancelar
              </button>
              <button className="almacen-btn almacen-btn-primary" onClick={() => crearHerramienta(null, true)} disabled={saving}>
                <i className="fas fa-save"></i>{saving ? 'Guardando...' : 'Guardar como nuevo'}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
