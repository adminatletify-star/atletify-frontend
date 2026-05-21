import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BackButton from '../components/BackButton';
import TipoPagoPicker from '../components/TipoPagoPicker';
import RedGrayDatePicker from '../components/RedGrayDatePicker';
import BotonSeguro from '../components/BotonSeguro';
import AtletifyLoader from '../components/AtletifyLoader';
import '../assets/css/GestionStaff.css';

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

  const API_URL = import.meta.env.VITE_API_URL;


  // 🏖️ Estados para Ausencias
  const [modalPermisoVisible, setModalPermisoVisible] = useState(false);
  const [formPermiso, setFormPermiso] = useState({ fechaInicio: '', fechaFin: '', motivo: '', conGoceDeSueldo: false });
  const [historialPermisos, setHistorialPermisos] = useState([]);

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
      const coachesArmados = await Promise.all(soloCoaches.map(async (coach) => {
        const id = coach.idUsuario || coach.id || coach.IdUsuario;
        try {
          const [resEsp, resEval] = await Promise.all([
            fetch(`${API_URL}/especialidades/coach/${id}`),
            fetch(`${API_URL}/evaluaciones/coach/${id}`)
          ]);
          const dataEsp = await resEsp.json();
          const dataEval = resEval.ok ? await resEval.json() : { promedio: 0, total: 0, resenas: [] };
          return { ...coach, especialidades: Array.isArray(dataEsp) ? dataEsp : [], evaluaciones: dataEval };
        } catch {
          return { ...coach, especialidades: [], evaluaciones: { Promedio: 0, Total: 0, Resenas: [] } };
        }
      }));

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
  const cargarAsistencias = async (idCoach) => {
    setCargandoAsistencias(true);
    try {
      const hoy = new Date();
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/nomina/asistencias-coach/${idCoach}/${hoy.getFullYear()}/${hoy.getMonth() + 1}`, {
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
        const hoy = new Date();
        const resNomina = await fetch(`${import.meta.env.VITE_API_URL}/api/nomina/calcular/${idCoach}/${hoy.getFullYear()}/${hoy.getMonth() + 1}`, {
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
    if (!window.confirm(`¿Seguro que deseas proceder con el pago definitivo de la nómina de ${coachSeleccionado.nombre} por $${nominaActual.granTotal.toFixed(2)}? Se registrará un Egreso Financiero y se cerrará el mes.`)) return;
    try {
      const idCoach = coachSeleccionado.idUsuario || coachSeleccionado.id;
      const hoy = new Date();
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
      // 2. Traer el cálculo de Nómina de este mes
      const hoy = new Date();
      const resNomina = await fetch(`${import.meta.env.VITE_API_URL}/api/nomina/calcular/${idCoach}/${hoy.getFullYear()}/${hoy.getMonth() + 1}`, {
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
    if (!window.confirm("¿Seguro que deseas eliminar esta reseña (por lenguaje inapropiado o spam)?")) return;
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

  return (
    <div className="staff-container">

      {/* ── NAVBAR ── */}
      <nav className="staff-nav">
        <BackButton to="/admin-box-panel" />
        <div className="staff-nav-icono">
          <i className="fas fa-users-cog"></i>
        </div>
        <div>
          <h1 className="staff-nav-titulo">
            Control de <span>Staff</span>
          </h1>
          {box && <p className="staff-nav-subtitle">{box.nombre}</p>}
        </div>
      </nav>

      <div className="container-xl px-3 px-md-4 py-4">

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
          <div className="row g-3 g-md-4 justify-content-start">
            {coaches.map(coach => (
              <div key={coach.idUsuario || coach.id} className="col-12 col-sm-6 col-lg-4 col-xl-3">
                <div className="staff-card">

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
              </div>
            ))}
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
                  <label className="staff-form-label">Día de Pago</label>
                  <input
                    type="number"
                    max="31"
                    min="1"
                    className="staff-modal-input"
                    value={formContrato.diaCorte}
                    onChange={e => setFormContrato({ ...formContrato, diaCorte: e.target.value })}
                  />
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
                    <i className="fas fa-calendar-check me-2"></i>Validación de Clases (Este Mes)
                  </div>
                  {cargandoAsistencias ? (
                    <div className="text-center py-3">
                      <div className="spinner-border text-danger spinner-border-sm" role="status"></div>
                    </div>
                  ) : asistenciasCoach.length === 0 ? (
                    <p className="text-muted small py-2">No hay clases programadas o registradas este mes.</p>
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
                            const fechaFormateada = dateObj.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit' });
                            return (
                              <tr key={idx}>
                                <td className="text-white-50">
                                  {fechaFormateada} <span className="small text-muted">{ast.horario}</span>
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
                    <i className="fas fa-calculator me-2"></i>Nómina Proyectada (Este Mes)
                  </div>
                  <div className="staff-nomina-row">
                    <span>Sueldo Base ({nominaActual.tipoPago})</span>
                    <span className="staff-nomina-valor">${nominaActual.sueldoBaseMensual.toFixed(2)}</span>
                  </div>
                  {nominaActual.tipoPago === 'PorClase' && (
                    <div className="staff-nomina-note">
                      Calculado sobre {nominaActual.clasesValidadas} clases validadas este mes
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
                    <i className="fas fa-hand-holding-usd me-1"></i> Pagar Nómina del Mes
                  </button>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
