import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { USUARIOS_ENDPOINT } from '../services/api';
import DateWheelPicker from '../components/DateWheelPicker';
import BackButton from '../components/BackButton';
import EstadoDelDiaPicker from '../components/EstadoDelDiaPicker';
import NivelGamerPicker from '../components/NivelGamerPicker';
import GeneroPicker from '../components/GeneroPicker';
import ObjetivoPicker from '../components/ObjetivoPicker';
import TallaPlayeraPicker from '../components/TallaPlayeraPicker';
import CategoriaBasePicker from '../components/CategoriaBasePicker';
import TipoSangrePicker from '../components/TipoSangrePicker';
import EjercicioOlimpicoPicker from '../components/EjercicioOlimpicoPicker';
import UnidadPesoPicker from '../components/UnidadPesoPicker';
import BotonSeguro from '../components/BotonSeguro';
import PasswordRulesHint from '../components/PasswordRulesHint';
import usePasswordStrength from '../hooks/usePasswordStrength';
import '../assets/css/MiPerfil.css';

const API_BASE = 'import.meta.env.VITE_API_URL:7149/api';

export default function MiPerfil() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userAuth, setUserAuth] = useState(null);
  const [progreso, setProgreso] = useState(0);
  const [rachaVisible, setRachaVisible] = useState(0);


  const [form, setForm] = useState({
    nombre: '', apellidos: '', foto: '', telefono: '', fechaNacimiento: '',
    peso: '', tallaPlayera: '', categoriaBase: '',
    tipoDeSangre: '', tieneExperiencia: false, deporteExperiencia: '', tieneDiscapacidad: '', genero: '',
    apodo: '', estadoDelDia: '', nivelGamer: 'Cachorro',
    coachFavorito: '', movimientoFavorito: '', movimientoOdiado: '',
    objetivo: '', esDeConfianza: false, deudaTienda: 0
  });

  const [passForm, setPassForm] = useState({ contrasenaActual: '', nuevaContrasena: '', confirmarContrasena: '' });

  // Validación de fortaleza de contraseña (reutilizable via hook)
  const reglasPassword = usePasswordStrength(passForm.nuevaContrasena);

  // ESTADOS PARA LOS PRs (MARCAS PERSONALES)
  const [ejerciciosOlimpicos, setEjerciciosOlimpicos] = useState([]);


  const [formMarca, setFormMarca] = useState({ idEjercicio: '', valor: '', unidad: 'lbs' });
  const [guardandoPR, setGuardandoPR] = useState(false);
  const [prParaCalcular, setPrParaCalcular] = useState('');
  const [mostrarDatePicker, setMostrarDatePicker] = useState(false);
  const [recordsMaximos, setRecordsMaximos] = useState([]);
  const [historialCompleto, setHistorialCompleto] = useState([]);
  const [graficaEjercicioId, setGraficaEjercicioId] = useState(''); // Para saber qué gráfica mostrar

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem('usuario'));
    const b = JSON.parse(localStorage.getItem('box'));
    if (!u || !b) { navigate('/login'); return; }
    setUserAuth(u);
    fetchExpediente(u.id || u.idUsuario);
    cargarDatosPRs(b.idBox, u.id || u.idUsuario);
  }, [navigate]);

  async function fetchExpediente(idUsuario) {
    try {
      const res = await fetch(`${USUARIOS_ENDPOINT}/${idUsuario}`);
      if (res.ok) {
        const data = await res.json();
        let fechaFormat = '';
        if (data.FechaNacimiento || data.fechaNacimiento) {
          fechaFormat = new Date(data.FechaNacimiento || data.fechaNacimiento).toISOString().split('T')[0];
        }

        const datosCargados = {
          nombre: data.Nombre || data.nombre || '',
          apellidos: data.Apellidos || data.apellidos || '', // 👈 NUEVO
          foto: data.Foto || data.foto || '',
          telefono: data.Telefono || data.telefono || '',
          fechaNacimiento: fechaFormat,
          peso: data.Peso || data.peso || '',
          tallaPlayera: data.TallaPlayera || data.tallaPlayera || '',
          categoriaBase: data.CategoriaBase || data.categoriaBase || '',
          tipoDeSangre: data.TipoDeSangre || data.tipoDeSangre || '',
          tieneExperiencia: data.TieneExperiencia || data.tieneExperiencia || false,
          deporteExperiencia: data.DeporteExperiencia || data.deporteExperiencia || '',
          tieneDiscapacidad: data.TieneDiscapacidad || data.tieneDiscapacidad || '',
          genero: data.Genero || data.genero || '',
          apodo: data.Apodo || data.apodo || '',
          estadoDelDia: data.EstadoDelDia || data.estadoDelDia || '😎 Chill',
          nivelGamer: data.NivelGamer || data.nivelGamer || 'Cachorro',
          coachFavorito: data.CoachFavorito || data.coachFavorito || '',
          movimientoFavorito: data.MovimientoFavorito || data.movimientoFavorito || '',
          movimientoOdiado: data.MovimientoOdiado || data.movimientoOdiado || '',
          objetivo: data.Objetivo || data.objetivo || '',
          esDeConfianza: data.EsDeConfianza || data.esDeConfianza || false,
          deudaTienda: data.DeudaTienda || data.deudaTienda || 0
        };

        setRachaVisible(data.RachaActual || data.rachaActual || 0);
        setForm(datosCargados);
        calcularProgreso(datosCargados);
      }
    } catch (error) { console.error("Error:", error); } finally { setLoading(false); }
  }


  async function cargarDatosPRs(idBox, idUsuario) {
    try {
      const [resEjercicios, resMarcas] = await Promise.all([
        fetch(`${API_BASE}/marcaspersonales/ejercicios-olimpicos/${idBox}`),
        fetch(`${API_BASE}/marcaspersonales/usuario/${idUsuario}`)
      ]);
      if (resEjercicios.ok) setEjerciciosOlimpicos(await resEjercicios.json());
      if (resMarcas.ok) {
        const data = await resMarcas.json();
        setRecordsMaximos(data.recordsMaximos);
        setHistorialCompleto(data.historialCompleto);
        if (data.recordsMaximos.length > 0) setGraficaEjercicioId(data.recordsMaximos[0].idEjercicio);
      }
    } catch (error) { console.error("Error al cargar PRs:", error); }
  }



  const calcularEdad = (fechaStr) => {
    if (!fechaStr) return '';
    const hoy = new Date();
    const cumple = new Date(fechaStr);
    let edad = hoy.getFullYear() - cumple.getFullYear();
    const m = hoy.getMonth() - cumple.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < cumple.getDate())) { edad--; }
    return edad;
  };

  const calcularProgreso = (datos) => {
    const camposClave = ['nombre', 'telefono', 'peso', 'tipoDeSangre', 'apodo', 'movimientoFavorito'];
    let llenos = 0;
    camposClave.forEach(campo => { if (datos[campo] && datos[campo].toString().trim() !== '') llenos++; });
    setProgreso(Math.round((llenos / camposClave.length) * 100));
  };

  // 📸 Convertir imagen a Base64 para mandarla a la BD
  const handleSubirFoto = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // Límite de 2MB para no saturar la BD
        alert("La imagen es muy pesada. El tamaño máximo es 2MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setForm({ ...form, foto: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  async function handleGuardarExpediente(e) {
    e.preventDefault();
    const payload = {
      ...form,
      peso: form.peso ? parseFloat(form.peso) : null,
      fechaNacimiento: form.fechaNacimiento ? new Date(form.fechaNacimiento).toISOString() : null
    };

    try {
      const res = await fetch(`${USUARIOS_ENDPOINT}/${userAuth.id || userAuth.idUsuario}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });

      if (res.ok) {
        alert("¡Player Card actualizada con éxito! 🎮🐺");
        calcularProgreso(form);
        const currentStorage = JSON.parse(localStorage.getItem('usuario'));
        currentStorage.nombre = form.nombre;
        currentStorage.apodo = form.apodo;
        currentStorage.estadoDelDia = form.estadoDelDia;
        currentStorage.categoriaBase = form.categoriaBase;
        currentStorage.nivelGamer = form.nivelGamer;
        localStorage.setItem('usuario', JSON.stringify(currentStorage));
      } else { alert("Hubo un error al guardar los datos."); }
    } catch (error) { alert("Error de conexión."); }
  }

  async function handleGuardarPR(e) {
    e.preventDefault();
    if (!formMarca.idEjercicio || !formMarca.valor) return;
    setGuardandoPR(true);
    try {
      const payload = {
        idUsuario: userAuth.id || userAuth.idUsuario,
        idEjercicio: parseInt(formMarca.idEjercicio),
        valor: parseFloat(formMarca.valor),
        unidad: formMarca.unidad
      };

      const res = await fetch(`${API_BASE}/marcaspersonales`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });

      if (res.ok) {
        alert("¡PR registrado con éxito! 🔥");
        setFormMarca({ idEjercicio: '', valor: '', unidad: 'lbs' });
        cargarDatosPRs(JSON.parse(localStorage.getItem('box')).idBox, userAuth.id || userAuth.idUsuario);
      }
    } catch (error) { alert("Error al guardar PR"); }
    finally { setGuardandoPR(false); }
  }

  async function handleCambiarContrasena(e) {
    e.preventDefault();
    if (passForm.nuevaContrasena !== passForm.confirmarContrasena) { alert("Las contraseñas no coinciden."); return; }
    if (passForm.nuevaContrasena.length < 8) { alert("Mínimo 8 caracteres."); return; }

    try {
      const res = await fetch(`${USUARIOS_ENDPOINT}/${userAuth.id || userAuth.idUsuario}/password`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contrasenaActual: passForm.contrasenaActual, nuevaContrasena: passForm.nuevaContrasena })
      });
      if (res.ok) {
        alert("¡Contraseña actualizada!");
        setPassForm({ contrasenaActual: '', nuevaContrasena: '', confirmarContrasena: '' });
      } else {
        const errData = await res.json(); alert(errData.mensaje || "Error al cambiar la contraseña.");
      }
    } catch (error) { alert("Error de conexión."); }
  }

  if (loading) return (
    <div className="mp-loading">
      <div className="spinner-border mp-spinner"></div>
    </div>
  );

  return (
    <>
      <div className="mp-page">

        <nav className="mp-navbar">
          <BackButton />
          <span className="mp-navbar-brand">Player <span>Card</span></span>
        </nav>

        <div className="container py-4" style={{ maxWidth: '1000px' }}>

          {/* Hero / Player Card Visual */}
          <div className="mp-hero mb-4">
            <div className="mp-hero-body">
              <div className="d-flex flex-column flex-md-row align-items-center gap-4">
                {/* AVATAR + BOTÓN FOTO */}
                <div className="d-flex flex-column align-items-center gap-2">
                  <div className="mp-hero-avatar" style={{ overflow: 'hidden' }}>
                    {form.foto ? (
                      <img src={form.foto} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      form.nombre ? form.nombre.charAt(0).toUpperCase() : 'W'
                    )}
                    <span className="mp-hero-level-badge">LVL: {form.nivelGamer}</span>
                  </div>
                  <input type="file" id="fotoUpload" accept="image/*" style={{ display: 'none' }} onChange={handleSubirFoto} />
                  <label htmlFor="fotoUpload" className="mp-foto-btn">
                    <i className="fas fa-camera me-1"></i>Cambiar foto
                  </label>
                </div>

                <div className="text-center text-md-start flex-grow-1">
                  <h2 className="mp-hero-name">
                    {form.apodo || form.nombre.split(' ')[0]}
                  </h2>
                  <p className="mp-hero-realname">{form.nombre}</p>
                  <div className="d-flex flex-wrap justify-content-center justify-content-md-start gap-2">
                    <span className="mp-hero-badge">
                      <i className="fas fa-fire"></i> Racha: {rachaVisible} días
                    </span>
                    <span className="mp-hero-badge">{form.estadoDelDia}</span>
                    {(form.esDeConfianza || form.deudaTienda > 0) && (
                      <span className={`mp-hero-badge ${form.deudaTienda > 0 ? 'bg-danger border-danger' : 'bg-primary border-primary'}`}>
                        <i className="fas fa-handshake me-1"></i>
                        Deuda en Tienda: ${form.deudaTienda.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="mp-progress-bar-wrap">
              <span className="mp-progress-label">Perfil {progreso}%</span>
              <div className="mp-progress-track">
                <div className="mp-progress-fill" style={{ width: `${progreso}%` }}></div>
              </div>
            </div>
          </div>

          <div className="row g-4">
            <div className="col-lg-8">
              <div className="mp-card">
                <div className="mp-card-body-lg">
                  <form onSubmit={handleGuardarExpediente}>

                    {/* — Identidad Wolfpack — */}
                    <h5 className="mp-section-title mp-section-title--identity">
                      <i className="fas fa-gamepad"></i> Identidad Wolfpack
                    </h5>
                    <div className="row g-3 mb-5">
                      <div className="col-md-6">
                        <label className="mp-label">Gamertag (Apodo)</label>
                        <input type="text" className="mp-input mp-input--accent" placeholder="Ej: La Bestia, Flash..." value={form.apodo} onChange={e => setForm({ ...form, apodo: e.target.value })} />
                      </div>
                      <div className="col-md-6">
                        <label className="mp-label">Estado de Hoy</label>
                        <EstadoDelDiaPicker valor={form.estadoDelDia} onCambiar={v => setForm({ ...form, estadoDelDia: v })} />
                      </div>
                      <div className="col-md-6">
                        <label className="mp-label">Nivel Gamer (LVL)</label>
                        <NivelGamerPicker valor={form.nivelGamer} onCambiar={v => setForm({ ...form, nivelGamer: v })} />
                      </div>
                      <div className="col-md-6">
                        <label className="mp-label">Coach Favorito</label>
                        <input type="text" className="mp-input" placeholder="Ej: Coach Sandra" value={form.coachFavorito} onChange={e => setForm({ ...form, coachFavorito: e.target.value })} />
                      </div>
                      <div className="col-md-6">
                        <label className="mp-label">Movimiento Favorito <i className="fas fa-heart ms-1" style={{ color: 'var(--primary)' }}></i></label>
                        <input type="text" className="mp-input" value={form.movimientoFavorito} onChange={e => setForm({ ...form, movimientoFavorito: e.target.value })} />
                      </div>
                      <div className="col-md-6">
                        <label className="mp-label">Movimiento Odiado <i className="fas fa-skull ms-1" style={{ color: 'var(--text-muted)' }}></i></label>
                        <input type="text" className="mp-input" value={form.movimientoOdiado} onChange={e => setForm({ ...form, movimientoOdiado: e.target.value })} />
                      </div>
                    </div>

                    {/* — Datos Reales — */}
                    <h5 className="mp-section-title mp-section-title--data">
                      <i className="fas fa-id-card"></i> Datos Reales
                    </h5>
                    <div className="row g-3 mb-5">
                      <div className="col-md-6">
                        <label className="mp-label">Nombre Completo</label>
                        <input type="text" className="mp-input" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} required />
                      </div>
                      <div className="col-md-6">
                        <label className="mp-label">Apellidos</label>
                        <input type="text" className="mp-input" value={form.apellidos} onChange={e => setForm({ ...form, apellidos: e.target.value })} />
                      </div>
                      <div className="col-md-6">
                        <label className="mp-label">Teléfono (WhatsApp)</label>
                        <input type="tel" className="mp-input" placeholder="10 dígitos" maxLength={10} value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value.replace(/\D/g, '').slice(0, 10) })} />
                      </div>
                      <div className="col-md-6">
                        <label className="mp-label">Género (Competencia)</label>
                        <GeneroPicker valor={form.genero} onCambiar={v => setForm({ ...form, genero: v })} />
                      </div>
                      <div className="col-md-6">
                        <label className="mp-label">
                          Fecha Nacimiento
                          {form.fechaNacimiento && (
                            <span style={{ color: 'var(--accent-cool)', fontStyle: 'italic', marginLeft: '0.5rem', fontFamily: 'var(--font-stats)' }}>
                              ({calcularEdad(form.fechaNacimiento)} años)
                            </span>
                          )}
                        </label>
                        <button
                          type="button"
                          className={`mp-date-trigger${!form.fechaNacimiento ? ' mp-date-trigger--empty' : ''}`}
                          onClick={() => setMostrarDatePicker(true)}
                        >
                          <i className="fas fa-calendar-alt"></i>
                          {form.fechaNacimiento
                            ? new Date(form.fechaNacimiento + 'T12:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })
                            : 'Seleccionar fecha de nacimiento...'}
                        </button>
                      </div>
                    </div>

                    {/* — Perfil Físico y Deportivo — */}
                    <h5 className="mp-section-title mp-section-title--physical">
                      <i className="fas fa-dumbbell"></i> Perfil Físico y Deportivo
                    </h5>
                    <div className="row g-3 mb-5">
                      <div className="col-12">
                        <label className="mp-label">
                          <i className="fas fa-bullseye me-1" style={{ color: 'var(--accent)' }}></i> Objetivo Principal
                        </label>
                        <ObjetivoPicker valor={form.objetivo} onCambiar={v => setForm({ ...form, objetivo: v })} />
                      </div>
                      <div className="col-md-4">
                        <label className="mp-label">Peso (kg/lbs)</label>
                        <input type="number" step="0.1" className="mp-input" value={form.peso} onChange={e => setForm({ ...form, peso: e.target.value })} />
                      </div>
                      <div className="col-md-4">
                        <label className="mp-label">Talla de Playera</label>
                        <TallaPlayeraPicker valor={form.tallaPlayera} onCambiar={v => setForm({ ...form, tallaPlayera: v })} />
                      </div>
                      <div className="col-md-4">
                        <label className="mp-label">Nivel Actual</label>
                        <CategoriaBasePicker valor={form.categoriaBase} onCambiar={v => setForm({ ...form, categoriaBase: v })} />
                      </div>
                      <div className="col-12 mt-2">
                        <div className="form-check form-switch d-flex align-items-center gap-2">
                          <input className="form-check-input" type="checkbox" role="switch" style={{ width: '40px', height: '20px' }} checked={form.tieneExperiencia} onChange={e => setForm({ ...form, tieneExperiencia: e.target.checked })} />
                          <label className="mp-switch-label ms-2">¿Tienes experiencia previa haciendo ejercicio?</label>
                        </div>
                      </div>
                      {form.tieneExperiencia && (
                        <div className="col-12 mt-1 animate__animated animate__fadeIn">
                          <label className="mp-label">¿Qué deportes has practicado?</label>
                          <input type="text" className="mp-input" placeholder="Ej. Fútbol, CrossFit, Natación..." value={form.deporteExperiencia} onChange={e => setForm({ ...form, deporteExperiencia: e.target.value })} />
                        </div>
                      )}
                    </div>

                    {/* — Mis PRs — */}
                    <h5 className="mp-section-title mp-section-title--prs">
                      <i className="fas fa-trophy"></i> Mis Récords Personales (PRs)
                    </h5>

                    {/* 🏆 TARJETAS DE RÉCORDS MÁXIMOS */}
                    <div className="mb-4">
                      {recordsMaximos.length === 0 ? (
                        <div className="mp-pr-empty">
                          <i className="fas fa-dumbbell"></i>
                          <p>Aún no tienes marcas registradas. ¡Sube tu primer PR!</p>
                        </div>
                      ) : (
                        <div className="d-flex gap-3 overflow-auto pb-2" style={{ whiteSpace: 'nowrap' }}>
                          {recordsMaximos.map(pr => (
                            <div key={pr.idMarca} className="bg-black border border-warning border-opacity-25 rounded-4 p-3 text-center flex-shrink-0" style={{ width: '140px' }}>
                              <span className="text-secondary small fw-bold text-uppercase d-block mb-1 text-truncate">{pr.nombreEjercicio}</span>
                              <h3 className="text-white fw-bold mb-0">{pr.valor} <span className="fs-6 text-secondary fw-normal">{pr.unidad}</span></h3>
                              <span className="text-info" style={{ fontSize: '0.65rem' }}>{new Date(pr.fechaLogro).toLocaleDateString()}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* 📈 GRÁFICA DE PROGRESIÓN (EL HISTORIAL) */}
                    {recordsMaximos.length > 0 && (
                      <div className="bg-black border border-secondary border-opacity-25 rounded-4 p-4 mt-4 mb-5 shadow-lg">
                        <div className="d-flex justify-content-between align-items-center border-bottom border-secondary border-opacity-50 pb-3 mb-4">
                          <h6 className="fw-bold text-white mb-0"><i className="fas fa-chart-line text-info me-2"></i>Mi Progresión</h6>
                          <EjercicioOlimpicoPicker
                            ejercicios={recordsMaximos.map(p => ({ idEjercicio: p.idEjercicio, nombre: p.nombreEjercicio }))}
                            valor={graficaEjercicioId?.toString()}
                            onCambiar={v => setGraficaEjercicioId(parseInt(v))}
                          />
                        </div>

                        {(() => {
                          const historialFiltrado = historialCompleto.filter(h => h.idEjercicio === graficaEjercicioId);
                          if (historialFiltrado.length === 0) return null;
                          const maxValor = Math.max(...historialFiltrado.map(h => h.valor)) * 1.1;

                          return (
                            <div className="d-flex align-items-end gap-3 overflow-auto pt-3 pb-1 px-2" style={{ height: '220px' }}>
                              {historialFiltrado.map(hit => {
                                const alturaPorcentaje = (hit.valor / maxValor) * 100;
                                const esMaximo = hit.valor === Math.max(...historialFiltrado.map(h => h.valor));
                                return (
                                  <div key={hit.idMarca} className="d-flex flex-column align-items-center flex-shrink-0" style={{ width: '60px' }}>
                                    <span className={`fw-bold mb-2 ${esMaximo ? 'text-warning' : 'text-white'}`} style={{ fontSize: '0.8rem' }}>{hit.valor}</span>
                                    <div className={`w-100 rounded-top transition-all ${esMaximo ? 'bg-warning shadow' : 'bg-info bg-opacity-75'}`} style={{ height: `${alturaPorcentaje}%`, minHeight: '10px' }} title={hit.notas || "Sin notas"}></div>
                                    <span className="text-secondary mt-2 text-center" style={{ fontSize: '0.65rem', lineHeight: '1' }}>{new Date(hit.fechaLogro).toLocaleDateString('es-ES', { month: 'short', year: '2-digit' })}</span>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </div>
                    )}

                    {/* Registrar / Actualizar PR */}
                    <div className="mp-pr-form-wrap mb-4 mt-4">
                      <p className="mp-pr-form-title">
                        <i className="fas fa-plus-circle"></i> Registrar Nuevo PR
                      </p>
                      <div className="row g-2 align-items-end">
                        <div className="col-md-5">
                          <label className="mp-label">Movimiento Olímpico</label>
                          <EjercicioOlimpicoPicker ejercicios={ejerciciosOlimpicos} valor={formMarca.idEjercicio} onCambiar={v => setFormMarca({ ...formMarca, idEjercicio: v })} />
                        </div>
                        <div className="col-4 col-md-3">
                          <label className="mp-label">Peso</label>
                          <input type="number" step="0.5" className="mp-input text-center" value={formMarca.valor} onChange={e => setFormMarca({ ...formMarca, valor: e.target.value })} placeholder="0" />
                        </div>
                        <div className="col-4 col-md-2">
                          <label className="mp-label">Unidad</label>
                          <UnidadPesoPicker valor={formMarca.unidad} onCambiar={v => setFormMarca({ ...formMarca, unidad: v })} />
                        </div>
                        <div className="col-4 col-md-2">
                          <BotonSeguro type="button" onClick={handleGuardarPR} disabled={!formMarca.idEjercicio || !formMarca.valor || guardandoPR} className="mp-btn-pr" textoProcesando={<i className="fas fa-spinner fa-spin" />}>
                            <i className="fas fa-save"></i>
                          </BotonSeguro>
                        </div>
                      </div>
                    </div>

                    {/* 👇 CALCULADORA DE PORCENTAJES (REPARADA) 👇 */}
                    {recordsMaximos.length > 0 && (
                      <div className="mp-calc-wrap mb-5">
                        <p className="mp-calc-title">
                          <i className="fas fa-calculator"></i> Calculadora de Porcentajes (WODs)
                        </p>
                        <p className="mp-calc-sub">Tus porcentajes de entrenamiento basados en tu Récord Máximo histórico.</p>
                        <div className="row g-3">
                          <div className="col-md-6">
                            <EjercicioOlimpicoPicker
                              ejercicios={recordsMaximos.map(m => ({ idEjercicio: m.idMarca, nombre: `${m.nombreEjercicio} (${m.valor} ${m.unidad})` }))}
                              valor={prParaCalcular?.toString()}
                              onCambiar={v => setPrParaCalcular(v)}
                            />
                          </div>
                        </div>

                        {prParaCalcular && (() => {
                          const marcaObj = recordsMaximos.find(m => m.idMarca.toString() === prParaCalcular);
                          if (!marcaObj) return null;

                          const redondearPeso = (pesoBruto, unidad) => {
                            if (unidad === 'lbs') return Math.round(pesoBruto / 5) * 5;
                            return Math.round(pesoBruto);
                          };

                          const porcentajes = [40, 50, 60, 70, 75, 80, 85, 90, 95];

                          return (
                            <div className="mp-calc-results animate__animated animate__fadeIn">
                              {porcentajes.map(pct => {
                                const pesoCalculado = redondearPeso(marcaObj.valor * (pct / 100), marcaObj.unidad);
                                return (
                                  <div key={pct} className="mp-calc-item">
                                    <span className="mp-calc-pct">{pct}%</span>
                                    <span className="mp-calc-val">
                                      {pesoCalculado} <span className="mp-calc-unit">{marcaObj.unidad}</span>
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </div>
                    )}

                    {/* — Expediente Médico — */}
                    <h5 className="mp-section-title mp-section-title--medical">
                      <i className="fas fa-heartbeat"></i> Expediente Médico (Privado)
                    </h5>
                    <p className="mp-medical-note">
                      <i className="fas fa-lock"></i> Esta información está cifrada y solo será visible para el equipo de Coaches en el Directorio.
                    </p>
                    <div className="row g-3 mb-5">
                      <div className="col-md-4">
                        <label className="mp-label">Tipo de Sangre</label>
                        <TipoSangrePicker valor={form.tipoDeSangre} onCambiar={v => setForm({ ...form, tipoDeSangre: v })} />
                      </div>
                      <div className="col-md-8">
                        <label className="mp-label">Lesiones, cirugías o enfermedades crónicas</label>
                        <input type="text" className="mp-input mp-input--medical" placeholder="Ej. Asma, hernia discal... (Déjalo en blanco)" value={form.tieneDiscapacidad} onChange={e => setForm({ ...form, tieneDiscapacidad: e.target.value })} />
                      </div>
                    </div>

                    <BotonSeguro type="submit" className="mp-btn-save" textoProcesando={<><i className="fas fa-spinner fa-spin me-2" />Guardando...</>}>
                      <i className="fas fa-save me-2"></i> GUARDAR PLAYER CARD
                    </BotonSeguro>
                  </form>
                </div>
              </div>
            </div>

            {/* Sidebar — Seguridad */}
            <div className="col-lg-4">
              <div className="mp-card mp-sidebar-sticky">
                <div className="mp-card-body">
                  <h5 className="mp-section-title mp-section-title--security">
                    <i className="fas fa-lock"></i> Seguridad
                  </h5>
                  <form onSubmit={handleCambiarContrasena}>
                    <div className="mb-3">
                      <label className="mp-label">Contraseña Actual</label>
                      <input type="password" className="mp-input" required value={passForm.contrasenaActual} onChange={e => setPassForm({ ...passForm, contrasenaActual: e.target.value })} />
                    </div>
                    <div className="mb-3">
                      <label className="mp-label">Nueva Contraseña</label>
                      <input type="password" className="mp-input" required value={passForm.nuevaContrasena} onChange={e => setPassForm({ ...passForm, nuevaContrasena: e.target.value })} />
                    </div>
                    <div className="mb-3">
                      <label className="mp-label">Confirmar Contraseña</label>
                      <input type="password" className="mp-input" required value={passForm.confirmarContrasena} onChange={e => setPassForm({ ...passForm, confirmarContrasena: e.target.value })} />
                    </div>

                    {/* Indicador visual de reglas de contraseña */}
                    {(passForm.nuevaContrasena.length > 0 || passForm.confirmarContrasena.length > 0) && (
                      <div className="mb-4">
                        <PasswordRulesHint
                          reglas={reglasPassword}
                          password={passForm.nuevaContrasena}
                          passwordConfirm={passForm.confirmarContrasena}
                        />
                      </div>
                    )}
                    <BotonSeguro
                      type="submit"
                      className="mp-btn-security"
                      textoProcesando={<><i className="fas fa-spinner fa-spin me-2" />Actualizando...</>}
                      disabled={
                        !reglasPassword.esValida ||
                        passForm.nuevaContrasena !== passForm.confirmarContrasena ||
                        passForm.contrasenaActual.trim().length === 0
                      }
                    >
                      <i className="fas fa-key me-2"></i> ACTUALIZAR CLAVE
                    </BotonSeguro>
                  </form>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {mostrarDatePicker && (
        <div className="mp-date-overlay" onClick={() => setMostrarDatePicker(false)}>
          <div className="mp-date-modal" onClick={e => e.stopPropagation()}>
            <DateWheelPicker
              initialDate={form.fechaNacimiento ? new Date(form.fechaNacimiento + 'T12:00:00') : new Date(2000, 0, 1)}
              onChange={() => { }}
              onAccept={(date) => {
                const yyyy = date.getFullYear();
                const mm = String(date.getMonth() + 1).padStart(2, '0');
                const dd = String(date.getDate()).padStart(2, '0');
                setForm({ ...form, fechaNacimiento: `${yyyy}-${mm}-${dd}` });
                setMostrarDatePicker(false);
              }}
              onCancel={() => setMostrarDatePicker(false)}
            />
          </div>
        </div>
      )}
    </>
  );
}
