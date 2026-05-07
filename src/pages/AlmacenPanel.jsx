import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL_CONST } from '../services/api';
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

  // Wizard de agregar: paso 1 = tipo+unidad, paso2 = peso+cantidad+ejercicios
  const [pasoAgregar, setPasoAgregar] = useState(1);
  // Confirmación de suma de cantidad duplicada
  const [confirmSuma, setConfirmSuma] = useState(null);

  const [nuevaHerramienta, setNuevaHerramienta] = useState({
    nombre: '', descripcionAdicional: '', medida: 0, cantidad: 0,
    esKilo: false, esLibra: false, esMetro: false, esMaquina: false,
    esBarra: true, esBumpers: false, esKettlebell: false, esMancuerna: false, esCajon: false, esOtra: false, ejerciciosIds: []
  });

  const [edicion, setEdicion] = useState({
    idHerramienta: '', nombre: '', descripcionAdicional: '', medida: 0, cantidad: 0,
    esKilo: false, esLibra: false, esMetro: false, esMaquina: false,
    esBarra: true, esBumpers: false, esKettlebell: false, esMancuerna: false, esCajon: false, esOtra: false, ejerciciosIds: []
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
    const termino = busquedaHerramienta.trim().toLowerCase();
    if (!termino) return herramientas;
    return herramientas.filter(herramienta => {
      const nombre = (herramienta.nombre ?? herramienta.Nombre ?? '').toLowerCase();
      const medida = String(herramienta.medida ?? herramienta.Medida ?? herramienta.descripcion ?? herramienta.Descripcion ?? '').toLowerCase();
      return nombre.includes(termino) || medida.includes(termino);
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

      const catMatch =
        (nuevaHerramienta.esBarra && hBarra) ||
        (nuevaHerramienta.esBumpers && hBumpers) ||
        (nuevaHerramienta.esKettlebell && hKettlebell) ||
        (nuevaHerramienta.esMancuerna && hMancuerna) ||
        (nuevaHerramienta.esCajon && hCajon) ||
        (nuevaHerramienta.esOtra && hOtra);

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

      const termino = busquedaVerificacion.toLowerCase().trim();
      if (termino) {
        const nombre = (h.nombre ?? h.Nombre ?? '').toLowerCase();
        const notas = (h.descripcionAdicional ?? h.DescripcionAdicional ?? '').toLowerCase();
        return nombre.includes(termino) || notas.includes(termino);
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
      ejerciciosIds
    });
  }

  // Reset del wizard de agregar
  function resetFormAgregar() {
    setNuevaHerramienta({ nombre: '', descripcionAdicional: '', medida: 0, cantidad: 0, esKilo: false, esLibra: false, esMetro: false, esMaquina: false, esBarra: true, esBumpers: false, esKettlebell: false, esMancuerna: false, esCajon: false, esOtra: false, ejerciciosIds: [] });
    setPasoAgregar(1);
  }

  // Cerrar panel de edición y limpiar selección
  function cancelarEdicion() {
    setEdicion({ idHerramienta: '', nombre: '', descripcionAdicional: '', medida: 0, cantidad: 0, esKilo: false, esLibra: false, esMetro: false, esMaquina: false, esBarra: true, esBumpers: false, esKettlebell: false, esMancuerna: false, esCajon: false, esOtra: false, ejerciciosIds: [] });
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
      : nuevaHerramienta.esBarra ? 'Barra' : nuevaHerramienta.esBumpers ? 'Disco' : nuevaHerramienta.esKettlebell ? 'Kettlebell' : nuevaHerramienta.esMancuerna ? 'Mancuerna' : 'Cajón';

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
          esBarra: edicion.esBarra, esBumpers: edicion.esBumpers, esKettlebell: edicion.esKettlebell, esMancuerna: edicion.esMancuerna, esCajon: edicion.esCajon, esOtra: edicion.esOtra
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
    return [];
  }

  function getUnidadLabel() {
    if (nuevaHerramienta.esKilo) return 'kg';
    if (nuevaHerramienta.esLibra) return 'lbs';
    if (nuevaHerramienta.esMetro) return 'm';
    return '';
  }

  const mostrarGridPesos = (nuevaHerramienta.esBarra || nuevaHerramienta.esBumpers || nuevaHerramienta.esKettlebell || nuevaHerramienta.esMancuerna) && (nuevaHerramienta.esKilo || nuevaHerramienta.esLibra);
  const requiereUnidad = !nuevaHerramienta.esCajon;
  const unidadSeleccionada = nuevaHerramienta.esKilo || nuevaHerramienta.esLibra || nuevaHerramienta.esMetro || nuevaHerramienta.esMaquina;

  if (loading) return (
    <div className="min-vh-100 d-flex justify-content-center align-items-center" style={{ background: 'var(--bg-base)' }}>
      <div className="spinner-wp" />
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

              <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-3 mb-4">
                <h2 className="almacen-section-title mb-0">
                  <i className="fas fa-plus-circle"></i>Agregar Nuevo Equipamiento
                </h2>
                <div className="almacen-paso-indicator">
                  <div className={`almacen-paso-dot ${pasoAgregar >= 1 ? 'activo' : ''}`}>
                    <span>1</span>
                  </div>
                  <div className="almacen-paso-linea"></div>
                  <div className={`almacen-paso-dot ${pasoAgregar >= 2 ? 'activo' : ''}`}>
                    <span>2</span>
                  </div>
                  <div className="almacen-paso-etiqueta">
                    {pasoAgregar === 1 ? 'Tipo y unidad' : 'Peso y cantidad'}
                  </div>
                </div>
              </div>

              <form id="form-agregar" onSubmit={crearHerramienta}>

                {/* ── PASO 1: Tipo + Unidad ── */}
                {pasoAgregar === 1 && (
                  <div className="almacen-paso-contenido">

                    <div className="almacen-options-group">
                      <label className="almacen-options-label">
                        <i className="fas fa-tag me-2" style={{ color: 'var(--primary)' }}></i>Tipo de Equipamiento
                      </label>
                      <div className="almacen-options cols-4">
                        <label className={`almacen-option almacen-option--tipo ${nuevaHerramienta.esBarra ? 'selected' : ''}`}>
                          <input type="radio" name="nuevo-categoria" checked={nuevaHerramienta.esBarra}
                            onChange={() => setNuevaHerramienta(prev => ({ ...prev, esBarra: true, esBumpers: false, esKettlebell: false, esMancuerna: false, esCajon: false, esOtra: false, medida: 0, esMetro: false, esMaquina: false }))} />
                          <span className="almacen-option-indicator"></span>
                          <div className="almacen-option-tipo-body">
                            <i className="fas fa-grip-lines-vertical almacen-option-tipo-icon"></i>
                            <span className="almacen-option-text">Barra</span>
                          </div>
                        </label>
                        <label className={`almacen-option almacen-option--tipo ${nuevaHerramienta.esBumpers ? 'selected' : ''}`}>
                          <input type="radio" name="nuevo-categoria" checked={nuevaHerramienta.esBumpers}
                            onChange={() => setNuevaHerramienta(prev => ({ ...prev, esBarra: false, esBumpers: true, esKettlebell: false, esMancuerna: false, esCajon: false, esOtra: false, medida: 0, esMetro: false, esMaquina: false }))} />
                          <span className="almacen-option-indicator"></span>
                          <div className="almacen-option-tipo-body">
                            <i className="fas fa-circle almacen-option-tipo-icon"></i>
                            <span className="almacen-option-text">Discos / Bumpers</span>
                          </div>
                        </label>
                        <label className={`almacen-option almacen-option--tipo ${nuevaHerramienta.esKettlebell ? 'selected' : ''}`}>
                          <input type="radio" name="nuevo-categoria" checked={nuevaHerramienta.esKettlebell}
                            onChange={() => setNuevaHerramienta(prev => ({ ...prev, esBarra: false, esBumpers: false, esKettlebell: true, esMancuerna: false, esCajon: false, esOtra: false, medida: 0, esMetro: false, esMaquina: false }))} />
                          <span className="almacen-option-indicator"></span>
                          <div className="almacen-option-tipo-body">
                            <i className="fas fa-weight-hanging almacen-option-tipo-icon"></i>
                            <span className="almacen-option-text">Kettlebell</span>
                          </div>
                        </label>
                        <label className={`almacen-option almacen-option--tipo ${nuevaHerramienta.esMancuerna ? 'selected' : ''}`}>
                          <input type="radio" name="nuevo-categoria" checked={nuevaHerramienta.esMancuerna}
                            onChange={() => setNuevaHerramienta(prev => ({ ...prev, esBarra: false, esBumpers: false, esKettlebell: false, esMancuerna: true, esCajon: false, esOtra: false, medida: 0, esMetro: false, esMaquina: false }))} />
                          <span className="almacen-option-indicator"></span>
                          <div className="almacen-option-tipo-body">
                            <i className="fas fa-dumbbell almacen-option-tipo-icon"></i>
                            <span className="almacen-option-text">Mancuerna</span>
                          </div>
                        </label>
                        <label className={`almacen-option almacen-option--tipo ${nuevaHerramienta.esCajon ? 'selected' : ''}`}>
                          <input type="radio" name="nuevo-categoria" checked={nuevaHerramienta.esCajon}
                            onChange={() => setNuevaHerramienta(prev => ({ ...prev, esBarra: false, esBumpers: false, esKettlebell: false, esMancuerna: false, esCajon: true, esOtra: false, medida: 0, esKilo: false, esLibra: false, esMetro: false, esMaquina: false }))} />
                          <span className="almacen-option-indicator"></span>
                          <div className="almacen-option-tipo-body">
                            <i className="fas fa-cube almacen-option-tipo-icon"></i>
                            <span className="almacen-option-text">Cajón</span>
                          </div>
                        </label>
                        <label className={`almacen-option almacen-option--tipo ${nuevaHerramienta.esOtra ? 'selected' : ''}`}>
                          <input type="radio" name="nuevo-categoria" checked={nuevaHerramienta.esOtra}
                            onChange={() => setNuevaHerramienta(prev => ({ ...prev, esBarra: false, esBumpers: false, esKettlebell: false, esMancuerna: false, esCajon: false, esOtra: true, medida: 0 }))} />
                          <span className="almacen-option-indicator"></span>
                          <div className="almacen-option-tipo-body">
                            <i className="fas fa-dumbbell almacen-option-tipo-icon"></i>
                            <span className="almacen-option-text">Otro Equipo</span>
                          </div>
                        </label>
                      </div>
                    </div>

                    <div className="almacen-options-group">
                      <label className="almacen-options-label">
                        <i className="fas fa-ruler me-2" style={{ color: 'var(--primary)' }}></i>Unidad de Medida
                      </label>
                      <div className={`almacen-options ${nuevaHerramienta.esOtra ? 'cols-4' : 'cols-2'}`}>
                        {!nuevaHerramienta.esCajon && (
                          <>
                            <label className={`almacen-option ${nuevaHerramienta.esKilo ? 'selected' : ''}`}>
                              <input type="radio" name="nuevo-tipo-unidad" checked={nuevaHerramienta.esKilo}
                                onChange={() => setNuevaHerramienta(prev => ({ ...prev, esKilo: true, esLibra: false, esMetro: false, esMaquina: false, medida: 0 }))} />
                              <span className="almacen-option-indicator"></span>
                              <span className="almacen-option-text">Kilogramos (kg)</span>
                            </label>
                            <label className={`almacen-option ${nuevaHerramienta.esLibra ? 'selected' : ''}`}>
                              <input type="radio" name="nuevo-tipo-unidad" checked={nuevaHerramienta.esLibra}
                                onChange={() => setNuevaHerramienta(prev => ({ ...prev, esKilo: false, esLibra: true, esMetro: false, esMaquina: false, medida: 0 }))} />
                              <span className="almacen-option-indicator"></span>
                              <span className="almacen-option-text">Libras (lbs)</span>
                            </label>
                            {nuevaHerramienta.esOtra && (
                              <>
                                <label className={`almacen-option ${nuevaHerramienta.esMetro ? 'selected' : ''}`}>
                                  <input type="radio" name="nuevo-tipo-unidad" checked={nuevaHerramienta.esMetro}
                                    onChange={() => setNuevaHerramienta(prev => ({ ...prev, esKilo: false, esLibra: false, esMetro: true, esMaquina: false }))} />
                                  <span className="almacen-option-indicator"></span>
                                  <span className="almacen-option-text">Metros (m)</span>
                                </label>
                                <label className={`almacen-option ${nuevaHerramienta.esMaquina ? 'selected' : ''}`}>
                                  <input type="radio" name="nuevo-tipo-unidad" checked={nuevaHerramienta.esMaquina}
                                    onChange={() => setNuevaHerramienta(prev => ({ ...prev, esKilo: false, esLibra: false, esMetro: false, esMaquina: true }))} />
                                  <span className="almacen-option-indicator"></span>
                                  <span className="almacen-option-text">Máquina</span>
                                </label>
                              </>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    <div className="d-flex justify-content-end mt-3">
                      <button
                        type="button"
                        className="almacen-btn almacen-btn-primary"
                        onClick={() => {
                          if (herramientasFiltradasVerificacion.length > 0) {
                            setShowVerificacionModal(true);
                          } else {
                            setPasoAgregar(2);
                          }
                        }}
                        disabled={requiereUnidad && !unidadSeleccionada}
                      >
                        Siguiente <i className="fas fa-arrow-right ms-2"></i>
                      </button>
                    </div>
                    {requiereUnidad && !unidadSeleccionada && (
                      <small className="text-danger d-block mt-2">
                        Debes seleccionar una unidad de medida para continuar.
                      </small>
                    )}
                  </div>
                )}

                {/* ── PASO 2: Peso / Nombre + Cantidad + Ejercicios ── */}
                {pasoAgregar === 2 && (
                  <div className="almacen-paso-contenido">

                    {/* Resumen del tipo/unidad seleccionado */}
                    <div className="almacen-paso2-resumen">
                      <span className="almacen-paso2-tag">
                        <i className="fas fa-tag me-1"></i>
                        {nuevaHerramienta.esBarra ? 'Barra' : nuevaHerramienta.esBumpers ? 'Disco / Bumper' : nuevaHerramienta.esKettlebell ? 'Kettlebell' : nuevaHerramienta.esMancuerna ? 'Mancuerna' : nuevaHerramienta.esCajon ? 'Cajón' : 'Otro equipo'}
                      </span>
                      <span className="almacen-paso2-tag">
                        <i className="fas fa-ruler me-1"></i>
                        {nuevaHerramienta.esCajon ? 'Sin unidad' : (nuevaHerramienta.esKilo ? 'Kilogramos' : nuevaHerramienta.esLibra ? 'Libras' : nuevaHerramienta.esMetro ? 'Metros' : 'Máquina')}
                      </span>
                    </div>

                    {/* Grid de pesos predefinidos + opción de peso personalizado */}
                    {mostrarGridPesos && (
                      <div className="almacen-options-group">
                        <label className="almacen-options-label">
                          <i className="fas fa-weight me-2" style={{ color: 'var(--primary)' }}></i>
                          {nuevaHerramienta.esBarra
                            ? 'Peso de la Barra'
                            : nuevaHerramienta.esBumpers
                              ? 'Peso del Disco / Bumper'
                              : nuevaHerramienta.esKettlebell
                                ? 'Peso de la Kettlebell'
                                : 'Peso de la Mancuerna'}
                        </label>
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

                        <div className="almacen-field-group cols-2 mt-3">
                          <div>
                            <label className="almacen-label">Agregar otro peso ({getUnidadLabel()})</label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              max="999"
                              className="form-control almacen-input"
                              placeholder={`Ej: ${nuevaHerramienta.esKilo ? '13.5' : '27.5'}`}
                              value={nuevaHerramienta.medida || ''}
                              onChange={(e) => {
                                const v = e.target.value;
                                if (v === '' || /^\d{0,3}(\.\d{0,2})?$/.test(v)) {
                                  setNuevaHerramienta(prev => ({ ...prev, medida: v === '' ? 0 : v }));
                                }
                              }}
                            />
                          </div>
                        </div>

                        {nuevaHerramienta.medida > 0 && (
                          <p className="almacen-selected-peso-label">
                            <i className="fas fa-check-circle me-1"></i>
                            Seleccionaste: <strong>{nuevaHerramienta.medida} {getUnidadLabel()}</strong>
                          </p>
                        )}
                      </div>
                    )}

                    {/* Para Otro equipo: nombre + medida libre */}
                    {nuevaHerramienta.esOtra && (
                      <div className="almacen-field-group cols-2">
                        <div>
                          <label className="almacen-label">Nombre del equipo</label>
                          <input type="text" className="form-control almacen-input"
                            placeholder="Ej: Mancuerna, Kettlebell, Cuerda..." required
                            maxLength={50}
                            value={nuevaHerramienta.nombre}
                            onChange={(e) => setNuevaHerramienta(prev => ({ ...prev, nombre: e.target.value }))} />
                        </div>
                        <div>
                          <label className="almacen-label">
                            Peso / Medida {nuevaHerramienta.esMaquina ? '(opcional)' : ''}
                          </label>
                          <input type="number" step="0.01" min="0" max="999" className="form-control almacen-input"
                            placeholder="Ej: 10, 20, 1.5..."
                            value={nuevaHerramienta.medida || ''}
                            onChange={(e) => {
                              const v = e.target.value;
                              if (v === '' || /^\d{0,3}(\.\d{0,2})?$/.test(v)) {
                                setNuevaHerramienta(prev => ({ ...prev, medida: v === '' ? 0 : v }));
                              }
                            }} />
                        </div>
                      </div>
                    )}

                    {/* Cantidad */}
                    <div style={{ maxWidth: '260px', marginBottom: '1.25rem' }}>
                      <label className="almacen-label">
                        <i className="fas fa-layer-group me-1"></i> Unidades disponibles
                      </label>
                      <input type="number" className="form-control almacen-input" min="1" max="9999" placeholder="Ej: 10" required
                        value={nuevaHerramienta.cantidad || ''}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (v === '' || /^\d{0,4}$/.test(v)) {
                            setNuevaHerramienta(prev => ({ ...prev, cantidad: v }));
                          }
                        }} />
                    </div>

                    {/* Descripción adicional / forma de medir */}
                    <div className="mb-3">
                      <label className="almacen-label">
                        <i className="fas fa-note-sticky me-1"></i> {nuevaHerramienta.esCajon ? 'Cómo se mide' : 'Descripción adicional'}
                      </label>
                      <textarea className="form-control almacen-input" rows="2" required={nuevaHerramienta.esCajon}
                        maxLength={200}
                        placeholder={nuevaHerramienta.esCajon ? 'Ej: se mide por largo x ancho x alto, por módulo, por cavidades...' : 'Agrrega detalles adicionales (ej: marca, condición, observaciones...)'}
                        value={nuevaHerramienta.descripcionAdicional || ''}
                        onChange={(e) => setNuevaHerramienta(prev => ({ ...prev, descripcionAdicional: e.target.value }))} />
                    </div>



                    {/* Botones de paso */}
                    <div className="d-flex flex-column flex-sm-row gap-2 justify-content-between align-items-stretch align-items-sm-center mt-3">
                      <button type="button" className="almacen-btn almacen-btn-secondary" onClick={() => setPasoAgregar(1)}>
                        <i className="fas fa-arrow-left me-2"></i>Atrás
                      </button>
                      <button type="submit" form="form-agregar" className="almacen-btn almacen-btn-primary" disabled={saving}>
                        <i className="fas fa-save me-2"></i>{saving ? 'Guardando...' : 'Guardar Equipamiento'}
                      </button>
                    </div>
                  </div>
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
              <div className="almacen-table-header">
                <h2 className="almacen-table-title"><i className="fas fa-boxes me-2 text-danger"></i>Inventario Actual</h2>
                <div className="almacen-search">
                  <input type="text" className="form-control almacen-input" placeholder="Buscar equipo..."
                    maxLength={50}
                    value={busquedaHerramienta} onChange={(e) => setBusquedaHerramienta(e.target.value)} />
                </div>
              </div>

              {herramientas.length === 0 ? (
                <div className="almacen-empty">
                  <i className="fas fa-inbox"></i>
                  <p>No hay equipamiento registrado</p>
                </div>
              ) : (
                <div className="almacen-inventory-grid">
                  {herramientasFiltradas.map((h) => {
                    const idHerramienta = getHerramientaId(h);
                    const nombre = h.nombre ?? h.Nombre;
                    const cantidad = h.cantidad ?? h.Cantidad;
                    const medida = getHerramientaMedida(h);
                    return (
                      <div key={idHerramienta} className="almacen-inventory-item">
                        <div className="almacen-inventory-header">
                          <div>
                            <div className="almacen-inventory-name">{nombre}</div>
                            <div className="almacen-inventory-measure">{medida > 0 ? `${medida} ${getTipoUnidadHerramienta(h).toLowerCase()}` : 'Sin medida'}</div>
                          </div>
                          <span className="almacen-inventory-qty">{cantidad} uds</span>
                        </div>
                        {(h.descripcionAdicional ?? h.DescripcionAdicional) && (
                          <div className="almacen-inventory-description">
                            <small><i className="fas fa-note-sticky me-1"></i>{h.descripcionAdicional ?? h.DescripcionAdicional}</small>
                          </div>
                        )}
                        <div className="almacen-inventory-tags">
                          <span className="almacen-inventory-tag"><i className="fas fa-ruler me-1"></i>{getTipoUnidadHerramienta(h)}</span>
                          <span className="almacen-inventory-tag"><i className="fas fa-tag me-1"></i>{getCategoriaHerramienta(h)}</span>
                        </div>
                        <div className="almacen-inventory-actions">
                          <button onClick={() => eliminarHerramienta(idHerramienta, nombre)} className="almacen-delete-btn" title="Eliminar" disabled={saving}>
                            <i className="fas fa-trash"></i>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* ===== MODAL: VERIFICACIÓN PRE-AGREGAR ===== */}
      {showVerificacionModal && (
        <div className="almacen-confirm-overlay" onClick={() => setShowVerificacionModal(false)}>
          <div className="almacen-confirm-modal modal-grande" onClick={e => e.stopPropagation()}>
            <div className="almacen-confirm-icon bg-warning">
              <i className="fas fa-clipboard-check"></i>
            </div>
            <h3 className="almacen-confirm-titulo">Verifica tu Inventario</h3>
            <p className="almacen-confirm-desc destacado text-center mb-4 mx-3">
              Por favor revisa si el material no existe ya en el inventario para evitar duplicados innecesarios.
            </p>

            <div className="px-3">
              <div className="almacen-verificacion-search">
                <i className="fas fa-search"></i>
                <input
                  type="text"
                  className="form-control almacen-input"
                  placeholder="Buscar por nombre o notas..."
                  maxLength={50}
                  value={busquedaVerificacion}
                  onChange={e => setBusquedaVerificacion(e.target.value)}
                />
              </div>
            </div>

            <div className="almacen-verificacion-lista px-3" style={{ maxHeight: '350px', overflowY: 'auto' }}>
              {herramientasFiltradasVerificacion.length === 0 ? (
                <div className="almacen-empty py-5">
                  <i className="fas fa-ghost mb-2"></i>
                  <p>No hay coincidencias exactas en tu inventario actual.</p>
                </div>
              ) : (
                herramientasFiltradasVerificacion.map((h, idx) => (
                  <div key={getHerramientaId(h)} className="almacen-verificacion-card" style={{ animationDelay: `${idx * 0.05}s` }}>
                    <div className="almacen-verificacion-info">
                      <div className="almacen-verificacion-nombre">{h.nombre ?? h.Nombre}</div>
                      <div className="almacen-verificacion-meta">
                        <span className="almacen-verificacion-badge peso">
                          <i className="fas fa-weight"></i> {getHerramientaMedida(h)} {getTipoUnidadHerramienta(h).toLowerCase()}
                        </span>
                        <span className="almacen-verificacion-badge">
                          <i className="fas fa-tag"></i> {getCategoriaHerramienta(h)}
                        </span>
                      </div>
                      {(h.descripcionAdicional ?? h.DescripcionAdicional) && (
                        <div className="almacen-verificacion-notas">
                          <i className="fas fa-quote-left text-primary opacity-50"></i>
                          <span>{h.descripcionAdicional ?? h.DescripcionAdicional}</span>
                        </div>
                      )}
                    </div>

                    <div className="almacen-verificacion-actions">
                      <input
                        type="number"
                        className="form-control almacen-verificacion-qty"
                        defaultValue={1}
                        min={1}
                        max={999}
                        id={`qty-${getHerramientaId(h)}`}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (v !== '' && Number(v) > 999) e.target.value = 999;
                        }}
                      />
                      <button
                        className="almacen-verificacion-add"
                        title="Sumar al inventario"
                        onClick={() => {
                          const val = document.getElementById(`qty-${getHerramientaId(h)}`).value;
                          sumarCantidadExistente(h, val);
                        }}
                      >
                        <i className="fas fa-plus"></i>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="almacen-confirm-btns mt-4 px-3 pb-3">
              <button className="almacen-btn almacen-btn-secondary" onClick={() => setShowVerificacionModal(false)}>
                Regresar
              </button>
              <button className="almacen-btn almacen-btn-primary" onClick={() => { setShowVerificacionModal(false); setPasoAgregar(2); }}>
                No está aquí, continuar <i className="fas fa-arrow-right ms-2"></i>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL: CONFIRMAR SUMA DE CANTIDAD ===== */}
      {confirmSuma && (
        <div className="almacen-confirm-overlay" onClick={() => setConfirmSuma(null)}>
          <div className="almacen-confirm-modal modal-grande" onClick={e => e.stopPropagation()}>
            <div className="almacen-confirm-icon bg-warning">
              <i className="fas fa-exclamation-triangle"></i>
            </div>
            <h3 className="almacen-confirm-titulo">¡Equipamiento similar detectado!</h3>
            <p className="almacen-confirm-desc destacado text-center mb-4">
              Hemos encontrado <strong>{confirmSuma.herramientas.length}</strong> registro(s) con las mismas especificaciones.
              ¿Deseas sumarlo a uno existente o guardarlo como un registro nuevo?
            </p>

            <div className="almacen-verificacion-lista px-3" style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {confirmSuma.herramientas.map((h, idx) => (
                <div key={getHerramientaId(h)} className="almacen-verificacion-card" style={{ animationDelay: `${idx * 0.05}s` }}>
                  <div className="almacen-verificacion-info">
                    <div className="almacen-verificacion-nombre">{h.nombre ?? h.Nombre}</div>
                    <div className="almacen-verificacion-meta">
                      <span className="almacen-verificacion-badge peso">
                        <i className="fas fa-weight"></i> {getHerramientaMedida(h)} {getTipoUnidadHerramienta(h).toLowerCase()}
                      </span>
                      <span className="almacen-verificacion-badge">
                        <i className="fas fa-layer-group"></i> Stock: {h.cantidad ?? h.Cantidad} uds
                      </span>
                    </div>
                    {(h.descripcionAdicional ?? h.DescripcionAdicional) && (
                      <div className="almacen-verificacion-notas">
                        <i className="fas fa-info-circle me-1"></i>
                        <span>{h.descripcionAdicional ?? h.DescripcionAdicional}</span>
                      </div>
                    )}
                  </div>

                  <div className="almacen-verificacion-actions">
                    <button
                      className="almacen-btn almacen-btn-success btn-sm"
                      onClick={() => sumarCantidadExistente(h, confirmSuma.cantidadNueva)}
                      disabled={saving}
                    >
                      <i className="fas fa-plus me-1"></i> Sumar {confirmSuma.cantidadNueva}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="almacen-confirm-btns mt-4 px-3 pb-3">
              <button className="almacen-btn almacen-btn-secondary" onClick={() => setConfirmSuma(null)} disabled={saving}>
                Cancelar
              </button>
              <button className="almacen-btn almacen-btn-primary" onClick={() => crearHerramienta(null, true)} disabled={saving}>
                <i className="fas fa-save me-2"></i>{saving ? 'Guardando...' : 'Guardar como nuevo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
