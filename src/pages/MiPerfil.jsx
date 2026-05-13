import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { USUARIOS_ENDPOINT, VENTAS_ENDPOINT } from '../services/api';
import DateWheelPicker from '../components/DateWheelPicker';
import BackButton from '../components/BackButton';
import AtletifyLoader from '../components/AtletifyLoader';
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
import ImageCropperModal from '../components/ImageCropperModal';
import '../assets/css/MiPerfil.css';

const API_BASE = import.meta.env.VITE_API_URL;

export default function MiPerfil() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userAuth, setUserAuth] = useState(null);
  const [progreso, setProgreso] = useState(0);
  const [rachaVisible, setRachaVisible] = useState(0);
  const [imageToCrop, setImageToCrop] = useState(null);
  const [deudaReal, setDeudaReal] = useState(0);

  const [form, setForm] = useState({
    nombre: '', apellidos: '', foto: '', telefono: '', fechaNacimiento: '',
    peso: '', tallaPlayera: '', categoriaBase: '',
    tipoDeSangre: '', tieneExperiencia: false, deporteExperiencia: '',
    tieneDiscapacidad: '', genero: '', apodo: '', estadoDelDia: '',
    nivelGamer: 'Cachorro', coachFavorito: '', movimientoFavorito: '',
    movimientoOdiado: '', objetivo: '', esDeConfianza: false, deudaTienda: 0
  });

  const [passForm, setPassForm] = useState({
    contrasenaActual: '', nuevaContrasena: '', confirmarContrasena: ''
  });
  const reglasPassword = usePasswordStrength(passForm.nuevaContrasena);

  const [ejerciciosOlimpicos, setEjerciciosOlimpicos] = useState([]);
  const [formMarca, setFormMarca] = useState({ idEjercicio: '', valor: '', unidad: 'lbs' });
  const [guardandoPR, setGuardandoPR] = useState(false);
  const [prParaCalcular, setPrParaCalcular] = useState('');
  const [mostrarDatePicker, setMostrarDatePicker] = useState(false);
  const [recordsMaximos, setRecordsMaximos] = useState([]);
  const [historialCompleto, setHistorialCompleto] = useState([]);
  const [graficaEjercicioId, setGraficaEjercicioId] = useState('');

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem('usuario'));
    const b = JSON.parse(localStorage.getItem('box'));
    if (!u || !b) { navigate('/login'); return; }
    setUserAuth(u);
    const idUsuario = u.id || u.idUsuario;
    fetchExpediente(idUsuario);
    fetchDeudaReal(idUsuario);
    cargarDatosPRs(b.idBox, idUsuario);
  }, [navigate]);

  async function fetchDeudaReal(idUsuario) {
    try {
      const res = await fetch(`${VENTAS_ENDPOINT}/fiados/mis-deudas/${idUsuario}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const pedidos = await res.json();
        const total = pedidos
          .filter(p => p.estatus === 'Pendiente' || p.estatus === 'Fiado')
          .reduce((acc, p) => acc + (p.resta ?? (p.totalVenta - (p.montoAbonado || 0))), 0);
        setDeudaReal(total);
      }
    } catch (e) { console.error('Error al cargar deuda real:', e); }
  }

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
          apellidos: data.Apellidos || data.apellidos || '',
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
    } catch (error) { console.error('Error:', error); }
    finally { setLoading(false); }
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
    } catch (error) { console.error('Error al cargar PRs:', error); }
  }

  const calcularEdad = (fechaStr) => {
    if (!fechaStr) return '';
    const hoy = new Date();
    const cumple = new Date(fechaStr);
    let edad = hoy.getFullYear() - cumple.getFullYear();
    const m = hoy.getMonth() - cumple.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < cumple.getDate())) edad--;
    return edad;
  };

  const calcularProgreso = (datos) => {
    const camposClave = ['nombre', 'telefono', 'peso', 'tipoDeSangre', 'apodo', 'movimientoFavorito'];
    const llenos = camposClave.filter(c => datos[c] && datos[c].toString().trim() !== '').length;
    setProgreso(Math.round((llenos / camposClave.length) * 100));
  };

  const guardarFotoInmediata = async (base64Foto) => {
    try {
      const payload = {
        ...form, foto: base64Foto,
        peso: form.peso ? parseFloat(form.peso) : null,
        fechaNacimiento: form.fechaNacimiento ? new Date(form.fechaNacimiento).toISOString() : null
      };
      const res = await fetch(`${USUARIOS_ENDPOINT}/${userAuth.id || userAuth.idUsuario}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      if (res.ok) {
        const current = JSON.parse(localStorage.getItem('usuario'));
        if (current) { current.foto = base64Foto; localStorage.setItem('usuario', JSON.stringify(current)); }
        window.location.reload();
      } else {
        alert('Hubo un error al guardar la foto en la base de datos.');
      }
    } catch { alert('Error de conexión al guardar la foto.'); }
  };

  const handleSubirFoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert('La imagen es muy pesada. El tamaño máximo es 2MB.'); return; }
    setImageToCrop(URL.createObjectURL(file));
    e.target.value = '';
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
        alert('¡Player Card actualizada con éxito! 🎮🐺');
        calcularProgreso(form);
        const current = JSON.parse(localStorage.getItem('usuario'));
        current.nombre = form.nombre;
        current.apodo = form.apodo;
        current.estadoDelDia = form.estadoDelDia;
        current.categoriaBase = form.categoriaBase;
        current.nivelGamer = form.nivelGamer;
        if (form.foto) current.foto = form.foto;
        localStorage.setItem('usuario', JSON.stringify(current));
        window.location.reload();
      } else { alert('Hubo un error al guardar los datos.'); }
    } catch { alert('Error de conexión.'); }
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
        alert('¡PR registrado con éxito! 🔥');
        setFormMarca({ idEjercicio: '', valor: '', unidad: 'lbs' });
        cargarDatosPRs(JSON.parse(localStorage.getItem('box')).idBox, userAuth.id || userAuth.idUsuario);
      }
    } catch { alert('Error al guardar PR'); }
    finally { setGuardandoPR(false); }
  }

  async function handleCambiarContrasena(e) {
    e.preventDefault();
    if (passForm.nuevaContrasena !== passForm.confirmarContrasena) { alert('Las contraseñas no coinciden.'); return; }
    if (passForm.nuevaContrasena.length < 8) { alert('Mínimo 8 caracteres.'); return; }
    try {
      const res = await fetch(`${USUARIOS_ENDPOINT}/${userAuth.id || userAuth.idUsuario}/password`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contrasenaActual: passForm.contrasenaActual, nuevaContrasena: passForm.nuevaContrasena })
      });
      if (res.ok) {
        alert('¡Contraseña actualizada!');
        setPassForm({ contrasenaActual: '', nuevaContrasena: '', confirmarContrasena: '' });
      } else {
        const err = await res.json();
        alert(err.mensaje || 'Error al cambiar la contraseña.');
      }
    } catch { alert('Error de conexión.'); }
  }

  if (loading) return (
    <div className="mp-loading"><AtletifyLoader /></div>
  );

  return (
    <>
      <div className="mp-page">

        {/* HEADER */}
        <header className="mp-header">
          <BackButton />
          <div>
            <h1 className="mp-header-title">Player <span>Card</span></h1>
            <p className="mp-header-sub">Gestiona tu perfil y estadísticas</p>
          </div>
        </header>

        <div className="mp-content">

          {/* HERO */}
          <div className="mp-hero">
            <div className="mp-hero-body">
              <div className="mp-avatar-wrap">
                <div className="mp-hero-avatar">
                  {form.foto
                    ? <img src={form.foto} alt="Avatar" />
                    : (form.nombre ? form.nombre.charAt(0).toUpperCase() : 'W')}
                  <span className="mp-hero-level-badge">LVL: {form.nivelGamer}</span>
                </div>
                <input type="file" id="fotoUpload" accept="image/*" style={{ display: 'none' }} onChange={handleSubirFoto} />
                <label htmlFor="fotoUpload" className="mp-foto-btn">
                  <i className="fas fa-camera" /> Cambiar
                </label>
              </div>

              <div className="mp-hero-info">
                <h2 className="mp-hero-name">{form.apodo || form.nombre.split(' ')[0]}</h2>
                <p className="mp-hero-realname">{form.nombre}{form.apellidos ? ` ${form.apellidos}` : ''}</p>
                <div className="mp-hero-badges">
                  <span className="mp-hero-badge mp-hero-badge--racha">
                    <i className="fas fa-fire" /> Racha: {rachaVisible} días
                  </span>
                  <span className="mp-hero-badge">{form.estadoDelDia}</span>
                  {(form.esDeConfianza || deudaReal > 0) && (
                    <span className="mp-hero-badge mp-hero-badge--deuda">
                      <i className="fas fa-handshake" /> Deuda: ${deudaReal.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="mp-progress-bar-wrap">
              <span className="mp-progress-label">Perfil {progreso}%</span>
              <div className="mp-progress-track">
                <div className="mp-progress-fill" style={{ width: `${progreso}%` }} />
              </div>
            </div>
          </div>

          {/* LAYOUT PRINCIPAL */}
          <div className="mp-layout">

            {/* ── FORMULARIO PRINCIPAL ── */}
            <div className="mp-card">
              <div className="mp-card-body-lg">
                <form onSubmit={handleGuardarExpediente}>

                  {/* Identidad Wolfpack */}
                  <h5 className="mp-section-title">
                    <i className="fas fa-gamepad" /> Identidad Wolfpack
                  </h5>
                  <div className="row g-3 mb-4">
                    <div className="col-md-6">
                      <label className="mp-label">Gamertag (Apodo)</label>
                      <input type="text" className="mp-input" placeholder="Ej: La Bestia, Flash..." value={form.apodo} onChange={e => setForm({ ...form, apodo: e.target.value })} />
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
                      <label className="mp-label">Movimiento Favorito</label>
                      <input type="text" className="mp-input" value={form.movimientoFavorito} onChange={e => setForm({ ...form, movimientoFavorito: e.target.value })} />
                    </div>
                    <div className="col-md-6">
                      <label className="mp-label">Movimiento Odiado</label>
                      <input type="text" className="mp-input" value={form.movimientoOdiado} onChange={e => setForm({ ...form, movimientoOdiado: e.target.value })} />
                    </div>
                  </div>

                  {/* Datos Reales */}
                  <h5 className="mp-section-title">
                    <i className="fas fa-id-card" /> Datos Reales
                  </h5>
                  <div className="row g-3 mb-4">
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
                          <span style={{ color: 'var(--accent)', fontStyle: 'italic', marginLeft: '0.5rem', fontFamily: 'var(--font-stats)' }}>
                            ({calcularEdad(form.fechaNacimiento)} años)
                          </span>
                        )}
                      </label>
                      <button
                        type="button"
                        className={`mp-date-trigger${!form.fechaNacimiento ? ' mp-date-trigger--empty' : ''}`}
                        onClick={() => setMostrarDatePicker(true)}
                      >
                        <i className="fas fa-calendar-alt" />
                        {form.fechaNacimiento
                          ? new Date(form.fechaNacimiento + 'T12:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })
                          : 'Seleccionar fecha de nacimiento...'}
                      </button>
                    </div>
                  </div>

                  {/* Perfil Físico y Deportivo */}
                  <h5 className="mp-section-title">
                    <i className="fas fa-dumbbell" /> Perfil Físico y Deportivo
                  </h5>
                  <div className="row g-3 mb-4">
                    <div className="col-12">
                      <label className="mp-label">Objetivo Principal</label>
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
                    <div className="col-12">
                      <div className="form-check form-switch d-flex align-items-center gap-2 mt-1">
                        <input className="form-check-input" type="checkbox" role="switch" style={{ width: '40px', height: '20px' }} checked={form.tieneExperiencia} onChange={e => setForm({ ...form, tieneExperiencia: e.target.checked })} />
                        <label className="mp-switch-label ms-2">¿Tienes experiencia previa haciendo ejercicio?</label>
                      </div>
                    </div>
                    {form.tieneExperiencia && (
                      <div className="col-12">
                        <label className="mp-label">¿Qué deportes has practicado?</label>
                        <input type="text" className="mp-input" placeholder="Ej. Fútbol, CrossFit, Natación..." value={form.deporteExperiencia} onChange={e => setForm({ ...form, deporteExperiencia: e.target.value })} />
                      </div>
                    )}
                  </div>

                  {/* PRs */}
                  <h5 className="mp-section-title">
                    <i className="fas fa-trophy" /> Mis Récords Personales (PRs)
                  </h5>

                  {/* Tarjetas de récords */}
                  <div className="mb-3">
                    {recordsMaximos.length === 0 ? (
                      <div className="mp-pr-empty">
                        <i className="fas fa-dumbbell" />
                        <p>Aún no tienes marcas registradas. ¡Sube tu primer PR!</p>
                      </div>
                    ) : (
                      <div className="mp-pr-scroll">
                        {recordsMaximos.map(pr => (
                          <div key={pr.idMarca} className="mp-pr-card">
                            <span className="mp-pr-card-name">{pr.nombreEjercicio}</span>
                            <p className="mp-pr-card-value">
                              {pr.valor} <span className="mp-pr-card-unit">{pr.unidad}</span>
                            </p>
                            <span className="mp-pr-card-date">
                              {new Date(pr.fechaLogro).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: '2-digit' })}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Gráfica de progresión */}
                  {recordsMaximos.length > 0 && (
                    <div className="mp-chart-wrap">
                      <div className="mp-chart-header">
                        <span className="mp-section-title" style={{ margin: 0 }}>
                          <i className="fas fa-chart-line" /> Mi Progresión
                        </span>
                        <EjercicioOlimpicoPicker
                          ejercicios={recordsMaximos.map(p => ({ idEjercicio: p.idEjercicio, nombre: p.nombreEjercicio }))}
                          valor={graficaEjercicioId?.toString()}
                          onCambiar={v => setGraficaEjercicioId(parseInt(v))}
                        />
                      </div>

                      {(() => {
                        const historialFiltrado = historialCompleto.filter(h => h.idEjercicio === graficaEjercicioId);
                        if (!historialFiltrado.length) return null;
                        const maxValor = Math.max(...historialFiltrado.map(h => h.valor)) * 1.1;
                        return (
                          <div className="mp-chart-bars">
                            {historialFiltrado.map(hit => {
                              const alturaPct = (hit.valor / maxValor) * 100;
                              const esMax = hit.valor === Math.max(...historialFiltrado.map(h => h.valor));
                              return (
                                <div key={hit.idMarca} className="mp-chart-col">
                                  <span className={`mp-chart-label${esMax ? ' mp-chart-label--max' : ''}`}>{hit.valor}</span>
                                  <div
                                    className={`mp-chart-bar${esMax ? ' mp-chart-bar--max' : ''}`}
                                    style={{ height: `${alturaPct}%` }}
                                    title={hit.notas || 'Sin notas'}
                                  />
                                  <span className="mp-chart-date">
                                    {new Date(hit.fechaLogro).toLocaleDateString('es-ES', { month: 'short', year: '2-digit' })}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* Registrar PR */}
                  <div className="mp-pr-form-wrap">
                    <p className="mp-pr-form-title">
                      <i className="fas fa-plus-circle" /> Registrar Nuevo PR
                    </p>
                    <div className="row g-2 align-items-end">
                      <div className="col-md-5">
                        <label className="mp-label">Movimiento Olímpico</label>
                        <EjercicioOlimpicoPicker ejercicios={ejerciciosOlimpicos} valor={formMarca.idEjercicio} onCambiar={v => setFormMarca({ ...formMarca, idEjercicio: v })} />
                      </div>
                      <div className="col-4 col-md-3">
                        <label className="mp-label">Peso</label>
                        <input type="number" step="0.5" className="mp-input" style={{ textAlign: 'center' }} value={formMarca.valor} onChange={e => setFormMarca({ ...formMarca, valor: e.target.value })} placeholder="0" />
                      </div>
                      <div className="col-4 col-md-2">
                        <label className="mp-label">Unidad</label>
                        <UnidadPesoPicker valor={formMarca.unidad} onCambiar={v => setFormMarca({ ...formMarca, unidad: v })} />
                      </div>
                      <div className="col-4 col-md-2">
                        <BotonSeguro
                          type="button"
                          onClick={handleGuardarPR}
                          disabled={!formMarca.idEjercicio || !formMarca.valor || guardandoPR}
                          className="mp-btn-pr"
                          textoProcesando={<i className="fas fa-spinner fa-spin" />}
                        >
                          <i className="fas fa-save" />
                        </BotonSeguro>
                      </div>
                    </div>
                  </div>

                  {/* Calculadora de porcentajes */}
                  {recordsMaximos.length > 0 && (
                    <div className="mp-calc-wrap">
                      <p className="mp-calc-title">
                        <i className="fas fa-calculator" /> Calculadora de Porcentajes
                      </p>
                      <p className="mp-calc-sub">Porcentajes de entrenamiento basados en tu récord máximo histórico.</p>
                      <div className="row g-3">
                        <div className="col-md-7">
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
                        const redondear = (v, u) => u === 'lbs' ? Math.round(v / 5) * 5 : Math.round(v);
                        return (
                          <div className="mp-calc-results">
                            {[40, 50, 60, 70, 75, 80, 85, 90, 95].map(pct => (
                              <div key={pct} className="mp-calc-item">
                                <span className="mp-calc-pct">{pct}%</span>
                                <span className="mp-calc-val">
                                  {redondear(marcaObj.valor * (pct / 100), marcaObj.unidad)}
                                  <span className="mp-calc-unit"> {marcaObj.unidad}</span>
                                </span>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* Expediente Médico */}
                  <h5 className="mp-section-title mp-section-title--medical">
                    <i className="fas fa-heartbeat" /> Expediente Médico
                  </h5>
                  <p className="mp-medical-note">
                    <i className="fas fa-lock" /> Esta información solo será visible para el equipo de Coaches en el Directorio.
                  </p>
                  <div className="row g-3 mb-4">
                    <div className="col-md-4">
                      <label className="mp-label">Tipo de Sangre</label>
                      <TipoSangrePicker valor={form.tipoDeSangre} onCambiar={v => setForm({ ...form, tipoDeSangre: v })} />
                    </div>
                    <div className="col-md-8">
                      <label className="mp-label">Lesiones, cirugías o enfermedades crónicas</label>
                      <input type="text" className="mp-input mp-input--medical" placeholder="Ej. Asma, hernia discal... (Déjalo en blanco si no aplica)" value={form.tieneDiscapacidad} onChange={e => setForm({ ...form, tieneDiscapacidad: e.target.value })} />
                    </div>
                  </div>

                  <BotonSeguro
                    type="submit"
                    className="mp-btn-save"
                    textoProcesando={<><i className="fas fa-spinner fa-spin" /> Guardando...</>}
                  >
                    <i className="fas fa-save" /> Guardar Player Card
                  </BotonSeguro>
                </form>
              </div>
            </div>

            {/* ── SIDEBAR SEGURIDAD ── */}
            <div className="mp-card mp-sidebar-sticky">
              <div className="mp-card-body">
                <h5 className="mp-section-title">
                  <i className="fas fa-lock" /> Seguridad
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

                  {(passForm.nuevaContrasena.length > 0 || passForm.confirmarContrasena.length > 0) && (
                    <div className="mb-3">
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
                    textoProcesando={<><i className="fas fa-spinner fa-spin" /> Actualizando...</>}
                    disabled={
                      !reglasPassword.esValida ||
                      passForm.nuevaContrasena !== passForm.confirmarContrasena ||
                      passForm.contrasenaActual.trim().length === 0
                    }
                  >
                    <i className="fas fa-key" /> Actualizar Clave
                  </BotonSeguro>
                </form>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* DATE PICKER OVERLAY */}
      {mostrarDatePicker && (
        <div className="mp-date-overlay" onClick={() => setMostrarDatePicker(false)}>
          <div className="mp-date-modal" onClick={e => e.stopPropagation()}>
            <DateWheelPicker
              initialDate={form.fechaNacimiento ? new Date(form.fechaNacimiento + 'T12:00:00') : new Date(2000, 0, 1)}
              onChange={() => {}}
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

      {/* IMAGE CROPPER */}
      {imageToCrop && (
        <ImageCropperModal
          imageSrc={imageToCrop}
          onCropComplete={(croppedBase64) => {
            setForm({ ...form, foto: croppedBase64 });
            setImageToCrop(null);
            guardarFotoInmediata(croppedBase64);
          }}
          onCancel={() => setImageToCrop(null)}
        />
      )}
    </>
  );
}
