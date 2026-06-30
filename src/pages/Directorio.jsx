import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, Link } from 'react-router-dom';
import BackButton from '../components/BackButton';
import AnimatedList from '../components/ReactBits/AnimatedList';
import FiltroHorarioPicker from '../components/FiltroHorarioPicker';
import FiltroMultiplePicker from '../components/FiltroMultiplePicker';
import ModalVerExpediente from '../components/ModalVerExpediente';
import AtletifyLoader from '../components/AtletifyLoader';
import '../assets/css/Directorio.css';

const API_BASE = import.meta.env.VITE_API_URL;;

const TALLAS_OPCIONES = [
  { valor: 'XS', desc: 'Extra Small' },
  { valor: 'S', desc: 'Small' },
  { valor: 'M', desc: 'Medium' },
  { valor: 'L', desc: 'Large' },
  { valor: 'XL', desc: 'Extra Large' },
];

const TIPOS_SANGRE = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

const NIVELES_OPCIONES = [
  { valor: 'Novato', etiqueta: 'Novato', desc: 'Clase técnica — aprendizaje', icono: 'fas fa-seedling' },
  { valor: 'Principiante', etiqueta: 'Principiante', desc: 'Movimientos modificados', icono: 'fas fa-chart-line' },
  { valor: 'Intermedio', etiqueta: 'Intermedio', desc: 'Movimientos estándar', icono: 'fas fa-fire' },
  { valor: 'RX', etiqueta: 'RX', desc: 'Pesos y movimientos completos', icono: 'fas fa-medal' },
];

export default function Directorio() {
  const navigate = useNavigate();
  const [atletas, setAtletas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');

  // Modal maestro
  const [atletaSeleccionado, setAtletaSeleccionado] = useState(null);
  const [modalExpedienteAbierto, setModalExpedienteAbierto] = useState(false);
  const [estadoPagoModal, setEstadoPagoModal] = useState(null);
  const [fotoModal, setFotoModal] = useState(null); // Foto base64 cargada al abrir el expediente (no viene en la lista)
  const [clasesDelBox, setClasesDelBox] = useState([]);
  const [filtroClase, setFiltroClase] = useState('');

  // ── FILTROS NUEVOS ──
  const [filtroPlayera, setFiltroPlayera] = useState([]);
  const [filtroPesoMin, setFiltroPesoMin] = useState('');
  const [filtroPesoMax, setFiltroPesoMax] = useState('');
  const [filtroNivel, setFiltroNivel] = useState([]);
  const [filtroSangre, setFiltroSangre] = useState([]);
  const [filtroMembresia, setFiltroMembresia] = useState([]);

  // ── DATOS PARA MEMBRESÍAS ──
  const [planesDelBox, setPlanesDelBox] = useState([]);
  const [suscripcionesAtletas, setSuscripcionesAtletas] = useState({});

  const [columnasVisibles, setColumnasVisibles] = useState({
    telefono: true,
    tallaPlayera: true,
    peso: false,
    categoria: false,
    sangre: false,
    membresia: false,
    experiencia: false
  });

  useEffect(() => {
    const b = JSON.parse(localStorage.getItem('box'));
    const u = JSON.parse(localStorage.getItem('usuario'));
    if (!b || !u) { navigate('/login'); return; }
    cargarAtletas(b.idBox);

    fetch(`${API_BASE}/clases/box/${b.idBox}`)
      .then(res => res.json())
      .then(data => setClasesDelBox(data))
      .catch(err => console.error(err));

    // Cargar los planes de membresía del box
    fetch(`${API_BASE}/finanzas/planes/${b.idBox}`)
      .then(res => res.json())
      .then(data => setPlanesDelBox(Array.isArray(data) ? data : []))
      .catch(err => console.error('Error cargando planes:', err));
  }, [navigate]);

  async function cargarAtletas(idBox) {
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

      // Endpoint ligero por box: solo los campos que la lista/filtros/modal usan, SIN la
      // foto base64, y con el plan de membresía ya resuelto en la misma respuesta (sin N+1).
      const res = await fetch(`${API_BASE}/usuarios/box/${idBox}/directorio`, { headers });
      const data = await res.json();
      const lista = Array.isArray(data) ? data : [];
      setAtletas(lista);

      // La membresía ya viene en cada atleta: armamos el mapa que usan la columna y el
      // filtro "Membresía" sin pegarle al backend una vez por atleta.
      const suscripciones = {};
      for (const a of lista) {
        const idUsuario = a.idUsuario || a.IdUsuario;
        const plan = a.nombrePlan && a.nombrePlan !== 'Ninguno' ? a.nombrePlan : 'Sin membresía';
        suscripciones[idUsuario] = { nombrePlan: plan, estatus: a.estatusMembresia || 'Vencida' };
      }
      setSuscripcionesAtletas(suscripciones);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  }

  useEffect(() => {
    if (atletaSeleccionado) {
      setEstadoPagoModal(null);
      setFotoModal(null);
      const idUsuario = atletaSeleccionado.idUsuario || atletaSeleccionado.IdUsuario;
      fetch(`${API_BASE}/usuarios/${idUsuario}/estado-mensualidad`)
        .then(res => res.json())
        .then(data => setEstadoPagoModal(data))
        .catch(err => console.error(err));

      // Foto perezosa: la lista ya no trae la imagen base64 (por velocidad). La cargamos
      // solo al abrir el expediente, y únicamente si el atleta tiene foto registrada.
      if (atletaSeleccionado.tieneFoto) {
        const token = localStorage.getItem('token');
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        fetch(`${API_BASE}/usuarios/${idUsuario}/perfil-publico`, { headers })
          .then(res => res.ok ? res.json() : null)
          .then(data => { if (data?.foto) setFotoModal(data.foto); })
          .catch(err => console.error(err));
      }
    }
  }, [atletaSeleccionado]);

  const calcularEdad = (fechaStr) => {
    if (!fechaStr) return 'Edad desconocida';
    const hoy = new Date();
    const cumple = new Date(fechaStr);
    let edad = hoy.getFullYear() - cumple.getFullYear();
    const m = hoy.getMonth() - cumple.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < cumple.getDate())) { edad--; }
    return edad + ' años';
  };

  const toggleColumna = (columna) => {
    setColumnasVisibles(prev => ({ ...prev, [columna]: !prev[columna] }));
  };

  const limpiarFiltros = () => {
    setBusqueda('');
    setFiltroClase('');
    setFiltroPlayera([]);
    setFiltroPesoMin('');
    setFiltroPesoMax('');
    setFiltroNivel([]);
    setFiltroSangre([]);
    setFiltroMembresia([]);
  };

  const hayFiltrosActivos = busqueda || filtroClase || filtroPlayera.length > 0 || filtroPesoMin || filtroPesoMax || filtroNivel.length > 0 || filtroSangre.length > 0 || filtroMembresia.length > 0;

  const atletasFiltrados = useMemo(() => {
    let filtrados = atletas.filter(a => {
      const searchTerms = busqueda.toLowerCase().trim();
      const textToSearch = [
        (a.nombre || a.Nombre || ''),
        (a.apellidos || a.Apellidos || ''),
        (a.telefono || a.Telefono || ''),
        (a.correo || a.Correo || ''),
        (a.tieneDiscapacidad || a.TieneDiscapacidad || ''),
        (a.descripcion || a.Descripcion || '')
      ].join(' ').toLowerCase();

      const nombreMatches = busqueda === '' || textToSearch.includes(searchTerms);
      const claseMatches = filtroClase === '' || (a.idClasePredeterminada || a.IdClasePredeterminada) == filtroClase;

      // Playera
      const talla = (a.tallaPlayera || a.TallaPlayera || '').toUpperCase();
      const playeraMatches = filtroPlayera.length === 0 || filtroPlayera.includes(talla);

      // Peso
      let pesoMatches = true;
      const pesoAtleta = parseFloat(a.peso || a.Peso || 0);
      const pMinStr = filtroPesoMin;
      const pMaxStr = filtroPesoMax;

      if (pMinStr !== '' && pMaxStr !== '') {
        const pMin = parseFloat(pMinStr);
        const pMax = parseFloat(pMaxStr);
        pesoMatches = pesoAtleta >= pMin && pesoAtleta <= pMax;
      } else if (pMinStr !== '') {
        // Solo peso inicial proporcionado: busqueda exacta
        const pMin = parseFloat(pMinStr);
        pesoMatches = pesoAtleta === pMin;
      } else if (pMaxStr !== '') {
        // (Opcional) Si solo ponen maximo, buscamos desde 0 a maximo
        const pMax = parseFloat(pMaxStr);
        pesoMatches = pesoAtleta <= pMax;
      }

      // Nivel
      const nivel = (a.categoriaBase || a.CategoriaBase || '');
      const nivelMatches = filtroNivel.length === 0 || filtroNivel.includes(nivel);

      // Sangre
      const sangre = (a.tipoDeSangre || a.TipoDeSangre || '').toUpperCase();
      const sangreMatches = filtroSangre.length === 0 || filtroSangre.includes(sangre);

      // Membresía
      const idUsuario = a.idUsuario || a.IdUsuario;
      let membresia = 'Sin membresía';
      if (suscripcionesAtletas[idUsuario]) {
        const dataSub = suscripcionesAtletas[idUsuario];
        membresia = dataSub.nombrePlan || 'Sin membresía';
      }
      const membresiasMatches = filtroMembresia.length === 0 || filtroMembresia.includes(membresia);

      return nombreMatches && claseMatches && playeraMatches && pesoMatches && nivelMatches && sangreMatches && membresiasMatches;
    });

    // Ordenamiento: por peso si hay filtro activo, alfabético por defecto
    if (filtroPesoMin !== '' || filtroPesoMax !== '') {
      filtrados.sort((a, b) => {
        const pesoA = parseFloat(a.peso || a.Peso || 0);
        const pesoB = parseFloat(b.peso || b.Peso || 0);
        return pesoA - pesoB;
      });
    } else {
      filtrados.sort((a, b) =>
        (a.nombre || a.Nombre || '').localeCompare(b.nombre || b.Nombre || '', 'es')
      );
    }

    return filtrados;
  }, [atletas, busqueda, filtroClase, filtroPlayera, filtroPesoMin, filtroPesoMax, filtroNivel, filtroSangre, filtroMembresia, suscripcionesAtletas]);

  return (
    <div className="directorio-page">

      <nav className="directorio-nav sticky-top">
        <div className="d-flex align-items-center gap-3">
          <BackButton />
          <div>
            <h4 className="directorio-nav-titulo mb-0">Directorio <span className="text-danger">Atletas</span></h4>
            <p className="directorio-nav-sub mb-0">Filtros y expedientes</p>
          </div>
        </div>
        <div className="d-flex align-items-center gap-3 ms-auto">
          <div className="directorio-nav-badge d-none d-sm-flex">
            <i className="fas fa-users"></i>
            <span className="directorio-nav-count">{atletas.length}</span>
          </div>
          <Link to="/exportar-bd-box" className="btn btn-danger btn-sm rounded-pill fw-bold px-3 shadow-sm d-flex align-items-center gap-2">
            <i className="fas fa-database"></i> <span className="d-none d-sm-inline">Exportar BD</span>
          </Link>
        </div>
      </nav>

      <div className="container-fluid px-3 px-md-4">

        {/* PANEL DE CONTROL */}
        <div className="directorio-filtros-panel mb-4">
          <div className="directorio-filtros-header">
            <i className="fas fa-sliders-h"></i>
            <span>Panel de Control</span>
            {hayFiltrosActivos && (
              <button className="dir-limpiar-btn ms-auto" onClick={limpiarFiltros}>
                <i className="fas fa-times-circle me-1"></i>Limpiar filtros
              </button>
            )}
          </div>

          <div className="row g-3">

            {/* Buscador */}
            <div className="col-12 col-md-6 col-lg-4">
              <label className="etiqueta-campo"><i className="fas fa-search me-1"></i> Buscar atleta</label>
              <div className="directorio-input-wrapper">
                <i className="fas fa-search directorio-input-icon"></i>
                <input
                  type="text"
                  className="entrada-oscura directorio-input"
                  placeholder="Escribe un nombre..."
                  maxLength={50}
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                />
              </div>
            </div>

            {/* Horario */}
            <div className="col-12 col-md-6 col-lg-4">
              <label className="etiqueta-campo"><i className="fas fa-clock me-1"></i> Horario base</label>
              <FiltroHorarioPicker
                clases={clasesDelBox}
                valor={filtroClase}
                onCambiar={setFiltroClase}
              />
            </div>

            {/* Peso */}
            <div className="col-12 col-md-6 col-lg-4">
              <label className="etiqueta-campo"><i className="fas fa-weight me-1"></i> Peso</label>
              <div className="d-flex gap-2 align-items-center">
                <div className="directorio-input-wrapper flex-grow-1">
                  <i className="fas fa-weight directorio-input-icon"></i>
                  <input
                    type="number"
                    className="entrada-oscura directorio-input"
                    placeholder="Min"
                    value={filtroPesoMin}
                    min="0"
                    max="999"
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '' || /^\d{0,3}(\.\d*)?$/.test(val)) {
                        setFiltroPesoMin(val);
                        if (val !== '' && filtroPesoMax !== '' && parseFloat(filtroPesoMax) < parseFloat(val)) {
                          setFiltroPesoMax(val);
                        }
                      }
                    }}
                  />
                </div>
                <span className="text-muted fw-bold">-</span>
                <div className="directorio-input-wrapper flex-grow-1">
                  <input
                    type="number"
                    className="entrada-oscura directorio-input ps-3"
                    placeholder="Max"
                    value={filtroPesoMax}
                    min={filtroPesoMin !== '' ? filtroPesoMin : "0"}
                    max="999"
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '' || /^\d{0,3}(\.\d*)?$/.test(val)) {
                        setFiltroPesoMax(val);
                      }
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Filtros Modal Buttons */}
            <div className="col-12">
              <label className="etiqueta-campo mb-2"><i className="fas fa-filter me-1"></i> Filtros Adicionales</label>
              <div className="d-flex flex-wrap gap-2">
                <FiltroMultiplePicker
                  titulo="Talla Playera"
                  icono="fas fa-tshirt"
                  variant="talla"
                  opciones={TALLAS_OPCIONES}
                  seleccionados={filtroPlayera}
                  onCambiar={setFiltroPlayera}
                />
                <FiltroMultiplePicker
                  titulo="Nivel"
                  icono="fas fa-medal"
                  variant="nivel"
                  opciones={NIVELES_OPCIONES}
                  seleccionados={filtroNivel}
                  onCambiar={setFiltroNivel}
                />
                <FiltroMultiplePicker
                  titulo="Tipo de Sangre"
                  icono="fas fa-tint"
                  variant="sangre"
                  opciones={TIPOS_SANGRE.map(s => ({ valor: s, etiqueta: s }))}
                  seleccionados={filtroSangre}
                  onCambiar={setFiltroSangre}
                />
                <FiltroMultiplePicker
                  titulo="Membresía"
                  icono="fas fa-credit-card"
                  variant="lista"
                  opciones={[
                    ...planesDelBox.map(p => ({ valor: p.nombre || p.Nombre, etiqueta: p.nombre || p.Nombre })),
                    { valor: 'Sin membresía', etiqueta: 'Sin membresía' }
                  ]}
                  seleccionados={filtroMembresia}
                  onCambiar={setFiltroMembresia}
                />
              </div>
            </div>


            {/* Columnas visibles */}
            <div className="col-12">
              <label className="etiqueta-campo"><i className="fas fa-eye me-1"></i> ¿Qué datos quieres ver?</label>
              <div className="d-flex flex-wrap gap-2 mt-1">
                <button onClick={() => toggleColumna('telefono')} className={`dir-toggle-btn dir-toggle-btn--telefono ${columnasVisibles.telefono ? 'activo' : ''}`}>
                  <i className="fas fa-phone-alt"></i> Teléfono
                </button>
                <button onClick={() => toggleColumna('tallaPlayera')} className={`dir-toggle-btn dir-toggle-btn--talla ${columnasVisibles.tallaPlayera ? 'activo' : ''}`}>
                  <i className="fas fa-tshirt"></i> Talla
                </button>
                <button onClick={() => toggleColumna('peso')} className={`dir-toggle-btn dir-toggle-btn--peso ${columnasVisibles.peso ? 'activo' : ''}`}>
                  <i className="fas fa-weight"></i> Peso
                </button>
                <button onClick={() => toggleColumna('categoria')} className={`dir-toggle-btn dir-toggle-btn--categoria ${columnasVisibles.categoria ? 'activo' : ''}`}>
                  <i className="fas fa-medal"></i> Nivel
                </button>
                <button onClick={() => toggleColumna('sangre')} className={`dir-toggle-btn dir-toggle-btn--sangre ${columnasVisibles.sangre ? 'activo' : ''}`}>
                  <i className="fas fa-tint"></i> Sangre
                </button>
                <button onClick={() => toggleColumna('membresia')} className={`dir-toggle-btn dir-toggle-btn--membresia ${columnasVisibles.membresia ? 'activo' : ''}`}>
                  <i className="fas fa-credit-card"></i> Membresía
                </button>
                <button onClick={() => toggleColumna('experiencia')} className={`dir-toggle-btn dir-toggle-btn--notas ${columnasVisibles.experiencia ? 'activo' : ''}`}>
                  <i className="fas fa-notes-medical"></i> Notas / Lesiones
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* LISTA */}
        {loading ? (
          <div className="empty-state">
            <AtletifyLoader />
          </div>
        ) : atletasFiltrados.length === 0 ? (
          <div className="empty-state">
            <i className="fas fa-users-slash"></i>
            <p>No se encontraron atletas con esos filtros</p>
          </div>
        ) : (
          <>
            <div className="directorio-contador">
              Mostrando <span>{atletasFiltrados.length}</span> atleta{atletasFiltrados.length !== 1 ? 's' : ''}
              {hayFiltrosActivos && <span className="dir-filtros-badge ms-2"><i className="fas fa-filter me-1"></i>Filtros activos</span>}
            </div>
            <AnimatedList
              items={atletasFiltrados}
              keyExtractor={(atleta) => atleta.idUsuario || atleta.IdUsuario}
              staggerDelay={0.04}
              animateOnChange={false}
              className="atleta-lista"
              renderItem={(a) => (
                <div className="atleta-card" onClick={() => setAtletaSeleccionado(a)} style={{ cursor: 'pointer' }} title="Clic para abrir Expediente Completo">
                  <div className="atleta-card-header">
                    <div className="atleta-avatar">
                      {(a.foto || a.Foto)
                        ? <img src={a.foto || a.Foto} alt={a.nombre || a.Nombre} className="atleta-avatar-img" />
                        : (a.nombre || a.Nombre || '?').charAt(0).toUpperCase()
                      }
                    </div>
                    <div className="atleta-info">
                      <p className="atleta-nombre d-flex align-items-center gap-2">
                        {a.nombre || a.Nombre} {a.apellidos || a.Apellidos || ''}
                        <i className="fas fa-external-link-alt text-secondary small opacity-50"></i>
                      </p>
                      <p className="atleta-correo">{a.correo || a.Correo}</p>
                    </div>
                    <i className="fas fa-chevron-right atleta-arrow"></i>
                  </div>

                  {(columnasVisibles.telefono || columnasVisibles.tallaPlayera || columnasVisibles.peso || columnasVisibles.categoria || columnasVisibles.sangre || columnasVisibles.membresia || columnasVisibles.experiencia) && (
                    <div className="atleta-datos">
                      {columnasVisibles.telefono && (
                        <div className="atleta-dato atleta-dato--telefono">
                          <i className="fas fa-phone-alt"></i>
                          {(a.telefono || a.Telefono) ? (
                            <span className="atleta-dato-valor">{a.telefono || a.Telefono}</span>
                          ) : (
                            <span className="atleta-dato-valor atleta-dato-vacio">Sin dato</span>
                          )}
                        </div>
                      )}
                      {columnasVisibles.tallaPlayera && (
                        <div className="atleta-dato atleta-dato--talla">
                          <i className="fas fa-tshirt"></i>
                          <span className="atleta-dato-valor">{a.tallaPlayera || a.TallaPlayera || '-'}</span>
                        </div>
                      )}
                      {columnasVisibles.peso && (
                        <div className="atleta-dato atleta-dato--peso">
                          <i className="fas fa-weight"></i>
                          <span className="atleta-dato-valor">{(a.peso || a.Peso) ? `${a.peso || a.Peso} kg` : '-'}</span>
                        </div>
                      )}
                      {columnasVisibles.categoria && (
                        <div className="atleta-dato atleta-dato--categoria">
                          <i className="fas fa-medal"></i>
                          <span className="atleta-dato-valor">{a.categoriaBase || a.CategoriaBase || 'Sin Nivel'}</span>
                        </div>
                      )}
                      {columnasVisibles.sangre && (
                        <div className="atleta-dato atleta-dato--sangre">
                          <i className="fas fa-tint"></i>
                          <span className="atleta-dato-valor">{a.tipoDeSangre || a.TipoDeSangre || '-'}</span>
                        </div>
                      )}
                      {columnasVisibles.membresia && (
                        <div className="atleta-dato atleta-dato--membresia">
                          <i className="fas fa-credit-card"></i>
                          <span className="atleta-dato-valor">
                            {suscripcionesAtletas[a.idUsuario || a.IdUsuario]?.nombrePlan || 'Sin membresía'}
                          </span>
                        </div>
                      )}
                      {columnasVisibles.experiencia && (
                        <div className="atleta-dato atleta-dato--experiencia">
                          <i className="fas fa-notes-medical"></i>
                          <span className="atleta-dato-valor">
                            {(a.tieneDiscapacidad || a.TieneDiscapacidad) ? (a.tieneDiscapacidad || a.TieneDiscapacidad) : 'Ninguna registrada'}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            />
          </>
        )}
      </div>

      {/* MODAL MAESTRO — renderizado via portal para evitar z-index del navbar */}
      {atletaSeleccionado && !modalExpedienteAbierto && createPortal(
        <div className="directorio-modal-overlay" onClick={() => setAtletaSeleccionado(null)}>
          <div className="directorio-modal" onClick={e => e.stopPropagation()}>

            <button onClick={() => setAtletaSeleccionado(null)} className="directorio-modal-close">
              <i className="fas fa-times"></i>
            </button>

            <div className="directorio-modal-header">
              <div className="directorio-modal-avatar">
                {(fotoModal || atletaSeleccionado.foto || atletaSeleccionado.Foto)
                  ? <img src={fotoModal || atletaSeleccionado.foto || atletaSeleccionado.Foto} alt={atletaSeleccionado.nombre || atletaSeleccionado.Nombre} className="atleta-avatar-img" />
                  : (atletaSeleccionado.nombre || atletaSeleccionado.Nombre || '?').charAt(0).toUpperCase()
                }
              </div>
              <h3 className="directorio-modal-nombre">{atletaSeleccionado.nombre || atletaSeleccionado.Nombre}</h3>
              <p className="directorio-modal-edad">{calcularEdad(atletaSeleccionado.fechaNacimiento || atletaSeleccionado.FechaNacimiento)}</p>

              <div className="directorio-contacto">
                <div className="directorio-contacto-fila">
                  <span className="directorio-contacto-label"><i className="fas fa-phone-alt me-1"></i> Teléfono</span>
                  <div className="d-flex align-items-center gap-2">
                    <span className="directorio-contacto-valor">{atletaSeleccionado.telefono || atletaSeleccionado.Telefono || 'Sin teléfono'}</span>
                    {(atletaSeleccionado.telefono || atletaSeleccionado.Telefono) && (
                      <a href={`https://wa.me/${atletaSeleccionado.telefono || atletaSeleccionado.Telefono}`} target="_blank" rel="noreferrer" className="directorio-btn-wa" title="Abrir WhatsApp">
                        <i className="fab fa-whatsapp"></i>
                      </a>
                    )}
                  </div>
                </div>
                <div className="directorio-contacto-fila">
                  <span className="directorio-contacto-label"><i className="fas fa-envelope me-1"></i> Correo</span>
                  <span className="directorio-contacto-correo">{atletaSeleccionado.correo || atletaSeleccionado.Correo}</span>
                </div>
              </div>
            </div>

            <div className="directorio-modal-body">

              <div className="directorio-seccion-label"><i className="fas fa-wallet"></i> Estado Financiero</div>
              {!estadoPagoModal ? (
                <div className="text-center py-3"><AtletifyLoader /></div>
              ) : (
                <div className={`directorio-financiero ${estadoPagoModal.estado === 'Pagado' || estadoPagoModal.estado === 'Exento' ? 'directorio-financiero--ok' : 'directorio-financiero--alerta'}`}>
                  <i className={`fas fs-3 ${estadoPagoModal.estado === 'Pagado' || estadoPagoModal.estado === 'Exento' ? 'fa-check-circle' : 'fa-exclamation-triangle'}`}></i>
                  <div>
                    <div className="directorio-financiero-estado">{estadoPagoModal.estado}</div>
                    <div className="directorio-financiero-msg">{estadoPagoModal.mensaje}</div>
                  </div>
                </div>
              )}

              <div className="directorio-seccion-label"><i className="fas fa-bullseye"></i> Objetivo y Categoría</div>
              <div className="directorio-info-bloque">
                <div className="directorio-info-fila">
                  <span className="directorio-info-etiqueta">Objetivo</span>
                  <span className="directorio-info-valor--accent">{atletaSeleccionado.objetivo || atletaSeleccionado.Objetivo || 'No especificado'}</span>
                </div>
                <div className="directorio-info-fila">
                  <span className="directorio-info-etiqueta">Categoría</span>
                  <span className="directorio-info-valor">{atletaSeleccionado.categoriaBase || atletaSeleccionado.CategoriaBase || 'Novato'}</span>
                </div>
                <div className="directorio-info-fila">
                  <span className="directorio-info-etiqueta">Peso / Talla</span>
                  <span className="directorio-info-valor">{atletaSeleccionado.peso || atletaSeleccionado.Peso || '--'} kg / {atletaSeleccionado.tallaPlayera || atletaSeleccionado.TallaPlayera || '--'}</span>
                </div>
              </div>

              <div className="directorio-seccion-label directorio-seccion-label--danger d-flex justify-content-between align-items-center">
                <span><i className="fas fa-heartbeat"></i> Expediente Médico</span>
                <button
                  onClick={() => setModalExpedienteAbierto(true)}
                  className="btn btn-sm btn-outline-danger rounded-pill px-3"
                  style={{ fontSize: '0.75rem', fontFamily: 'var(--font-heading-alt)', fontWeight: 700, letterSpacing: '0.5px' }}
                >
                  <i className="fas fa-file-medical me-1"></i> Ver Completo
                </button>
              </div>
              <div className="directorio-medico-bloque">
                <div className="directorio-medico-item">
                  <div className="directorio-medico-icono directorio-medico-icono--sangre"><i className="fas fa-tint"></i></div>
                  <div>
                    <div className="directorio-medico-label">Tipo de Sangre</div>
                    <div className="directorio-medico-valor">{atletaSeleccionado.tipoDeSangre || atletaSeleccionado.TipoDeSangre || 'Desconocido'}</div>
                  </div>
                </div>
                <div className="directorio-medico-item">
                  <div className="directorio-medico-icono directorio-medico-icono--notas"><i className="fas fa-notes-medical"></i></div>
                  <div>
                    <div className="directorio-medico-label">Lesiones / Notas</div>
                    <div className="directorio-medico-valor">{atletaSeleccionado.tieneDiscapacidad || atletaSeleccionado.TieneDiscapacidad || 'Ninguna registrada'}</div>
                  </div>
                </div>
              </div>

              <div className="directorio-modal-acciones">
                <button
                  type="button"
                  className="directorio-btn-editar"
                  onClick={() => navigate(`/editar-usuario/${atletaSeleccionado.idUsuario || atletaSeleccionado.IdUsuario}`)}
                >
                  <i className="fas fa-user-pen"></i> Editar Usuario
                </button>
              </div>

            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL EXPEDIENTE MÉDICO COMPLETO */}
      {modalExpedienteAbierto && atletaSeleccionado && (
        <ModalVerExpediente
          atleta={{ ...atletaSeleccionado, foto: fotoModal || atletaSeleccionado.foto || atletaSeleccionado.Foto }}
          onClose={() => setModalExpedienteAbierto(false)}
        />
      )}

    </div>
  );
}
