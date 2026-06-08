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
    movimientoOdiado: '', objetivo: '', esDeConfianza: false, deudaTienda: 0,
    ocultarDelLeaderboard: false, ocultarGamerCard: false, deshabilitarSolicitudes: false,
    estatus: 'Activo'
  });

  const [passForm, setPassForm] = useState({
    contrasenaActual: '', nuevaContrasena: '', confirmarContrasena: ''
  });
  const reglasPassword = usePasswordStrength(passForm.nuevaContrasena);

  const [freezePassword, setFreezePassword] = useState('');
  const [freezing, setFreezing] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [unfreezePassword, setUnfreezePassword] = useState('');
  const [unfreezing, setUnfreezing] = useState(false);
  const [seccionActiva, setSeccionActiva] = useState(null); // 'congelar' | 'eliminar' | null

  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'default',
    isAlertOnly: false,
    onConfirm: null
  });

  function triggerConfirm({ title, message, type, onConfirm }) {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      type,
      isAlertOnly: false,
      onConfirm
    });
  }

  function triggerAlert({ title, message, type, onConfirm }) {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      type: type || 'info',
      isAlertOnly: true,
      onConfirm: onConfirm || null
    });
  }

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
          deudaTienda: data.DeudaTienda || data.deudaTienda || 0,
          ocultarDelLeaderboard: data.OcultarDelLeaderboard || data.ocultarDelLeaderboard || false,
          ocultarGamerCard: data.OcultarGamerCard || data.ocultarGamerCard || false,
          deshabilitarSolicitudes: data.DeshabilitarSolicitudes || data.deshabilitarSolicitudes || false,
          estatus: data.Estatus || data.estatus || 'Activo'
        };
        setRachaVisible(data.RachaActual || data.rachaActual || 0);
        setForm(datosCargados);
        calcularProgreso(datosCargados);
        
        // Sync local storage
        const current = JSON.parse(localStorage.getItem('usuario'));
        if (current) {
          current.estatus = data.Estatus || data.estatus || 'Activo';
          localStorage.setItem('usuario', JSON.stringify(current));
        }
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
        triggerAlert({
          title: 'Error de Foto',
          message: 'Hubo un error al guardar la foto en la base de datos.',
          type: 'error'
        });
      }
    } catch (err) {
      triggerAlert({
        title: 'Error de Conexión',
        message: 'Error de conexión al guardar la foto.',
        type: 'error'
      });
    }
  };

  const handleSubirFoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      triggerAlert({
        title: 'Archivo Muy Grande',
        message: 'La imagen es muy pesada. El tamaño máximo es 2MB.',
        type: 'error'
      });
      return;
    }
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
        calcularProgreso(form);
        const current = JSON.parse(localStorage.getItem('usuario'));
        if (current) {
          current.nombre = form.nombre;
          current.apodo = form.apodo;
          current.estadoDelDia = form.estadoDelDia;
          current.categoriaBase = form.categoriaBase;
          current.nivelGamer = form.nivelGamer;
          current.estatus = form.estatus;
          if (form.foto) current.foto = form.foto;
          localStorage.setItem('usuario', JSON.stringify(current));
        }
        triggerAlert({
          title: '¡Actualizado! 🎮',
          message: '¡Player Card actualizada con éxito!',
          type: 'success',
          onConfirm: () => window.location.reload()
        });
      } else {
        triggerAlert({
          title: 'Error de Guardado',
          message: 'Hubo un error al guardar los datos.',
          type: 'error'
        });
      }
    } catch (err) {
      triggerAlert({
        title: 'Error de Conexión',
        message: 'Error de conexión al guardar los datos.',
        type: 'error'
      });
    }
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
        triggerAlert({
          title: '¡PR Registrado!',
          message: '¡PR registrado con éxito!',
          type: 'success'
        });
        setFormMarca({ idEjercicio: '', valor: '', unidad: 'lbs' });
        cargarDatosPRs(JSON.parse(localStorage.getItem('box')).idBox, userAuth.id || userAuth.idUsuario);
      }
    } catch (err) {
      triggerAlert({
        title: 'Error al Guardar',
        message: 'Error al guardar el PR.',
        type: 'error'
      });
    } finally {
      setGuardandoPR(false);
    }
  }

  async function handleCambiarContrasena(e) {
    e.preventDefault();
    if (passForm.nuevaContrasena !== passForm.confirmarContrasena) {
      triggerAlert({
        title: 'Contraseñas No Coinciden',
        message: 'Las contraseñas no coinciden.',
        type: 'error'
      });
      return;
    }
    if (passForm.nuevaContrasena.length < 8) {
      triggerAlert({
        title: 'Contraseña Muy Corta',
        message: 'Mínimo 8 caracteres.',
        type: 'error'
      });
      return;
    }
    try {
      const res = await fetch(`${USUARIOS_ENDPOINT}/${userAuth.id || userAuth.idUsuario}/password`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contrasenaActual: passForm.contrasenaActual, nuevaContrasena: passForm.nuevaContrasena })
      });
      if (res.ok) {
        triggerAlert({
          title: '¡Actualizado!',
          message: '¡Contraseña actualizada con éxito!',
          type: 'success'
        });
        setPassForm({ contrasenaActual: '', nuevaContrasena: '', confirmarContrasena: '' });
      } else {
        const err = await res.json();
        triggerAlert({
          title: 'Error de Actualización',
          message: err.mensaje || 'Error al cambiar la contraseña.',
          type: 'error'
        });
      }
    } catch (err) {
      triggerAlert({
        title: 'Error de Conexión',
        message: 'Error de conexión al cambiar la contraseña.',
        type: 'error'
      });
    }
  }

  async function ejecutarCongelarCuenta() {
    setFreezing(true);
    try {
      const res = await fetch(`${USUARIOS_ENDPOINT}/${userAuth.id || userAuth.idUsuario}/dar-de-baja-temporal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ contrasenaConfirmacion: freezePassword })
      });
      if (res.ok) {
        const updatedUser = await res.json();
        const current = JSON.parse(localStorage.getItem('usuario'));
        if (current) {
          current.estatus = 'TemporalmenteInactivo';
          localStorage.setItem('usuario', JSON.stringify(current));
        }
        setFreezePassword('');
        triggerAlert({
          title: '¡Cuenta Congelada! ❄️',
          message: 'Tu cuenta ha sido congelada con éxito. La renovación automática de tu membresía se ha pausado y tus reservas activas han sido canceladas.',
          type: 'success'
        });
        fetchExpediente(userAuth.id || userAuth.idUsuario);
      } else {
        const err = await res.json();
        triggerAlert({
          title: 'Error de Solicitud',
          message: err.mensaje || 'Hubo un error al congelar la cuenta. Por favor verifica tus credenciales.',
          type: 'error'
        });
      }
    } catch (err) {
      triggerAlert({
        title: 'Error de Conexión',
        message: 'No se pudo establecer comunicación con el servidor. Verifica tu conexión a internet.',
        type: 'error'
      });
    } finally {
      setFreezing(false);
    }
  }

  function handleCongelarCuenta(e) {
    e.preventDefault();
    if (!freezePassword.trim()) {
      triggerAlert({
        title: 'Contraseña Requerida',
        message: 'Por favor, ingresa tu contraseña para autorizar la congelación de tu cuenta.',
        type: 'info'
      });
      return;
    }
    triggerConfirm({
      title: '¿Confirmar Baja Temporal?',
      message: '¿Estás seguro de que deseas congelar tu cuenta temporalmente? Tus reservas y la renovación automática de tu membresía se pausarán de inmediato.',
      type: 'freeze',
      onConfirm: ejecutarCongelarCuenta
    });
  }

  async function handleDescongelarCuenta(e) {
    e.preventDefault();
    if (!unfreezePassword.trim()) {
      triggerAlert({
        title: 'Contraseña Requerida',
        message: 'Por favor, ingresa tu contraseña para descongelar tu cuenta.',
        type: 'info'
      });
      return;
    }
    setUnfreezing(true);
    try {
      const res = await fetch(`${USUARIOS_ENDPOINT}/${userAuth.id || userAuth.idUsuario}/descongelar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ contrasenaConfirmacion: unfreezePassword })
      });
      if (res.ok) {
        const updatedUser = await res.json();
        const current = JSON.parse(localStorage.getItem('usuario'));
        if (current) {
          current.estatus = 'Activo';
          localStorage.setItem('usuario', JSON.stringify(current));
        }
        setUnfreezePassword('');
        triggerAlert({
          title: '¡Bienvenido de Vuelta!',
          message: 'Tu cuenta ha sido descongelada y reactivada con éxito. ¡Ya puedes disfrutar de todos los servicios del Box!',
          type: 'success'
        });
        fetchExpediente(userAuth.id || userAuth.idUsuario);
      } else {
        const err = await res.json();
        triggerAlert({
          title: 'Error de Reactivación',
          message: err.mensaje || 'Error al descongelar la cuenta. Por favor verifica tu contraseña.',
          type: 'error'
        });
      }
    } catch (err) {
      triggerAlert({
        title: 'Error de Conexión',
        message: 'No se pudo conectar con el servidor. Por favor verifica tu conexión a internet.',
        type: 'error'
      });
    } finally {
      setUnfreezing(false);
    }
  }

  async function ejecutarEliminarCuenta() {
    setDeleting(true);
    try {
      const res = await fetch(`${USUARIOS_ENDPOINT}/${userAuth.id || userAuth.idUsuario}/dar-de-baja-permanente`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ contrasenaConfirmacion: deletePassword })
      });
      if (res.ok) {
        triggerAlert({
          title: 'Cuenta Eliminada',
          message: 'Tu cuenta ha sido eliminada permanentemente del sistema de manera exitosa. Agradecemos enormemente tu tiempo en nuestra manada.',
          type: 'success',
          onConfirm: () => {
            localStorage.removeItem('usuario');
            localStorage.removeItem('token');
            localStorage.removeItem('box');
            navigate('/login');
          }
        });
      } else {
        const err = await res.json();
        triggerAlert({
          title: 'Error de Eliminación',
          message: err.mensaje || 'Hubo un error al eliminar tu cuenta. Por favor verifica tu contraseña.',
          type: 'error'
        });
      }
    } catch (err) {
      triggerAlert({
        title: 'Error de Conexión',
        message: 'No se pudo establecer comunicación con el servidor. Verifica tu conexión a internet.',
        type: 'error'
      });
    } finally {
      setDeleting(false);
    }
  }

  function handleEliminarCuenta(e) {
    e.preventDefault();
    if (!deletePassword.trim()) {
      triggerAlert({
        title: 'Contraseña Requerida',
        message: 'Por favor, ingresa tu contraseña para confirmar esta acción irreversible.',
        type: 'error'
      });
      return;
    }
    triggerConfirm({
      title: '🚨 ADVERTENCIA CRÍTICA',
      message: '¿Estás completamente seguro de que deseas eliminar permanentemente tu cuenta? Todos tus datos, scores y marcas se borrarán en cascada. Esta acción es irreversible.',
      type: 'delete',
      onConfirm: ejecutarEliminarCuenta
    });
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

          {form.estatus === 'TemporalmenteInactivo' && (
            <div className="mp-frozen-banner">
              <i className="fas fa-snowflake" />
              <div className="mp-frozen-banner-content">
                <h4 className="mp-frozen-banner-title">Cuenta Congelada</h4>
                <p className="mp-frozen-banner-text">
                  Tu cuenta está inactiva temporalmente. Todos tus datos y marcas están a salvo, pero no podrás reservar clases, registrar PRs o modificar tu información hasta que la descongeles. La renovación automática de tu membresía ha sido desactivada. Reactívala usando tu contraseña en el panel lateral.
                </p>
              </div>
            </div>
          )}

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
                <input type="file" id="fotoUpload" accept="image/*" style={{ display: 'none' }} onChange={handleSubirFoto} disabled={form.estatus === 'TemporalmenteInactivo'} />
                <label htmlFor="fotoUpload" className={`mp-foto-btn ${form.estatus === 'TemporalmenteInactivo' ? 'mp-foto-btn-frozen' : ''}`}>
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
            <div className={`mp-card ${form.estatus === 'TemporalmenteInactivo' ? 'mp-form-frozen' : ''}`}>
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
                          disabled={!formMarca.idEjercicio || !formMarca.valor || guardandoPR || form.estatus === 'TemporalmenteInactivo'}
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

                  {/* Privacidad y Comunidad */}
                  <h5 className="mp-section-title mt-4">
                    <i className="fas fa-shield-alt" /> Privacidad y Comunidad
                  </h5>
                  <p className="mp-medical-note">
                    <i className="fas fa-eye-slash" /> Configura quién puede ver tu perfil y estadísticas.
                  </p>
                  <div className="row g-3 mb-4">
                    <div className="col-12">
                      <div className="form-check form-switch d-flex align-items-center gap-2">
                        <input className="form-check-input" type="checkbox" role="switch" style={{ width: '40px', height: '20px' }} checked={form.ocultarDelLeaderboard} onChange={e => setForm({ ...form, ocultarDelLeaderboard: e.target.checked })} />
                        <div>
                          <label className="mp-switch-label ms-2 d-block mb-0">Ocultar del Leaderboard</label>
                          <small className="text-secondary ms-2">Tus scores no aparecerán en el Top del día, pero tu coach sí podrá verlos.</small>
                        </div>
                      </div>
                    </div>
                    <div className="col-12">
                      <div className="form-check form-switch d-flex align-items-center gap-2">
                        <input className="form-check-input" type="checkbox" role="switch" style={{ width: '40px', height: '20px' }} checked={form.ocultarGamerCard} onChange={e => setForm({ ...form, ocultarGamerCard: e.target.checked })} />
                        <div>
                          <label className="mp-switch-label ms-2 d-block mb-0">Ocultar Gamer Card (Modo Fantasma)</label>
                          <small className="text-secondary ms-2">Ocultar tu perfil del directorio de la comunidad. Nadie podrá ver tus PRs ni Nivel Gamer.</small>
                        </div>
                      </div>
                    </div>
                    <div className="col-12">
                      <div className="form-check form-switch d-flex align-items-center gap-2">
                        <input className="form-check-input" type="checkbox" role="switch" style={{ width: '40px', height: '20px' }} checked={form.deshabilitarSolicitudes} onChange={e => setForm({ ...form, deshabilitarSolicitudes: e.target.checked })} />
                        <div>
                          <label className="mp-switch-label ms-2 d-block mb-0">No recibir solicitudes de amistad</label>
                          <small className="text-secondary ms-2">Otros atletas no podrán enviarte solicitudes para añadirte a su manada.</small>
                        </div>
                      </div>
                    </div>
                  </div>

                  <BotonSeguro
                    type="submit"
                    className="mp-btn-save"
                    textoProcesando={<><i className="fas fa-spinner fa-spin" /> Guardando...</>}
                    disabled={form.estatus === 'TemporalmenteInactivo'}
                  >
                    <i className="fas fa-save" /> Guardar Player Card
                  </BotonSeguro>
                </form>
              </div>
            </div>

            {/* ── SIDEBAR SEGURIDAD & ACCIONES DE CUENTA ── */}
            <div className="mp-card mp-sidebar-sticky">
              <div className="mp-card-body">
                {form.estatus === 'TemporalmenteInactivo' ? (
                  /* Formulario Descongelar Cuenta */
                  <form onSubmit={handleDescongelarCuenta}>
                    <h5 className="mp-section-title" style={{ color: '#4fc3f7' }}>
                      <i className="fas fa-snowflake" /> Reactivar Cuenta
                    </h5>
                    <div className="mp-sidebar-alert mp-sidebar-alert--info">
                      Tu cuenta está temporalmente congelada. Ingresa tu contraseña para reactivar tu perfil y restaurar todos tus accesos y reservas al instante.
                    </div>
                    <div className="mb-3">
                      <label className="mp-label">Contraseña de Confirmación</label>
                      <input
                        type="password"
                        className="mp-input"
                        required
                        value={unfreezePassword}
                        onChange={e => setUnfreezePassword(e.target.value)}
                        placeholder="Ingresa tu contraseña"
                      />
                    </div>
                    <BotonSeguro
                      type="submit"
                      className="mp-btn-unfreeze"
                      textoProcesando={<><i className="fas fa-spinner fa-spin" /> Reactivando...</>}
                      disabled={unfreezing || !unfreezePassword.trim()}
                    >
                      <i className="fas fa-bolt" /> Descongelar Cuenta
                    </BotonSeguro>
                  </form>
                ) : (
                  /* Formularios Activos: Cambiar Contraseña, Congelar y Eliminar */
                  <>
                    {/* Cambiar Contraseña */}
                    <form onSubmit={handleCambiarContrasena}>
                      <h5 className="mp-section-title">
                        <i className="fas fa-lock" /> Seguridad
                      </h5>
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

                    <div className="mp-sidebar-divider" />

                    {/* Acciones de Baja de Cuenta (Colapsables/Dinámicas) */}
                    {seccionActiva === null && (
                      <div className="mp-deactivation-triggers">
                        <button
                          type="button"
                          className="mp-btn-trigger-freeze"
                          onClick={() => setSeccionActiva('congelar')}
                        >
                          <i className="fas fa-snowflake" /> Baja Temporal (Congelar)
                        </button>
                        <button
                          type="button"
                          className="mp-btn-trigger-delete"
                          onClick={() => setSeccionActiva('eliminar')}
                        >
                          <i className="fas fa-trash-alt" /> Baja Permanente (Eliminar)
                        </button>
                      </div>
                    )}

                    {seccionActiva === 'congelar' && (
                      <div className="mp-expanded-section mp-expanded-section--freeze mp-slide-down">
                        <h5 className="mp-section-title" style={{ color: '#4fc3f7' }}>
                          <i className="fas fa-snowflake" /> Congelar Cuenta
                        </h5>
                        
                        <div className="mp-sidebar-alert mp-sidebar-alert--info">
                          <strong>¿Qué sucede al congelar tu cuenta?</strong>
                          <ul className="mp-info-list">
                            <li>
                              <i className="fas fa-ban" />
                              <span><strong>Bloqueo de Actividad:</strong> No podrás reservar clases, registrar marcas personales (PRs) ni modificar datos de tu Player Card mientras esté congelada.</span>
                            </li>
                            <li>
                              <i className="fas fa-history" />
                              <span><strong>Uso de Membresía Actual:</strong> Tus días restantes de mensualidad seguirán corriendo hasta su vencimiento. No hay reembolsos ni reposición de días no utilizados.</span>
                            </li>
                            <li>
                              <i className="fas fa-sync-alt" />
                              <span><strong>Sin Auto-Renovación:</strong> La renovación automática de tu suscripción activa se desactivará de inmediato para evitar cobros automáticos futuros.</span>
                            </li>
                            <li>
                              <i className="fas fa-shield-alt" />
                              <span><strong>Preservación Total:</strong> Todos tus PRs, historial de asistencia, scores y nivel gamer se mantendrán guardados de forma 100% segura.</span>
                            </li>
                            <li>
                              <i className="fas fa-bolt" />
                              <span><strong>Reactivación Instantánea:</strong> Podrás reactivar tu perfil e interactuar de nuevo ingresando tu contraseña en cualquier momento.</span>
                            </li>
                          </ul>
                        </div>

                        <form onSubmit={handleCongelarCuenta}>
                          <div className="mb-3">
                            <label className="mp-label">Contraseña de Confirmación</label>
                            <input
                              type="password"
                              className="mp-input"
                              required
                              value={freezePassword}
                              onChange={e => setFreezePassword(e.target.value)}
                              placeholder="Ingresa tu contraseña"
                            />
                          </div>
                          <div className="mp-btn-row">
                            <button
                              type="button"
                              className="mp-btn-cancel"
                              onClick={() => {
                                setSeccionActiva(null);
                                setFreezePassword('');
                              }}
                            >
                              Cancelar
                            </button>
                            <BotonSeguro
                              type="submit"
                              className="mp-btn-freeze"
                              textoProcesando={<><i className="fas fa-spinner fa-spin" /> Procesando...</>}
                              disabled={freezing || !freezePassword.trim()}
                            >
                              <i className="fas fa-snowflake" /> Congelar
                            </BotonSeguro>
                          </div>
                        </form>
                      </div>
                    )}

                    {seccionActiva === 'eliminar' && (
                      <div className="mp-expanded-section mp-expanded-section--delete mp-slide-down">
                        <h5 className="mp-section-title" style={{ color: '#ff6b6b' }}>
                          <i className="fas fa-trash-alt" /> Eliminar Cuenta
                        </h5>

                        <div className="mp-sidebar-alert mp-sidebar-alert--danger">
                          <strong>🚨 ADVERTENCIA CRÍTICA e IRREVERSIBLE</strong>
                          <ul className="mp-info-list">
                            <li>
                              <i className="fas fa-exclamation-triangle" />
                              <span><strong>Borrado Definitivo:</strong> Tu perfil, fotos, PRs, scores de entrenamientos y nivel gamer se purgarán permanentemente. Esta acción no se puede deshacer.</span>
                            </li>
                            <li>
                              <i className="fas fa-hand-holding-usd" />
                              <span><strong>Pérdida de Membresía:</strong> Tu membresía activa será cancelada de inmediato de forma definitiva, perdiendo los días que te sobraban sin derecho a reembolsos.</span>
                            </li>
                          </ul>
                        </div>

                        <form onSubmit={handleEliminarCuenta}>
                          <div className="mb-3">
                            <label className="mp-label">Contraseña de Confirmación</label>
                            <input
                              type="password"
                              className="mp-input"
                              required
                              value={deletePassword}
                              onChange={e => setDeletePassword(e.target.value)}
                              placeholder="Ingresa tu contraseña"
                            />
                          </div>
                          <div className="mp-btn-row">
                            <button
                              type="button"
                              className="mp-btn-cancel"
                              onClick={() => {
                                setSeccionActiva(null);
                                setDeletePassword('');
                              }}
                            >
                              Cancelar
                            </button>
                            <BotonSeguro
                              type="submit"
                              className="mp-btn-delete"
                              textoProcesando={<><i className="fas fa-spinner fa-spin" /> Eliminando...</>}
                              disabled={deleting || !deletePassword.trim()}
                            >
                              <i className="fas fa-trash-alt" /> Eliminar
                            </BotonSeguro>
                          </div>
                        </form>
                      </div>
                    )}
                  </>
                )}
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

      {/* CUSTOM PREMIUM CONFIRM MODAL */}
      {confirmModal.isOpen && (
        <div 
          className="mp-confirm-overlay" 
          onClick={() => !confirmModal.isAlertOnly && setConfirmModal({ ...confirmModal, isOpen: false })}
        >
          <div className={`mp-confirm-modal mp-confirm-modal--${confirmModal.type}`} onClick={e => e.stopPropagation()}>
            <div className="mp-confirm-modal-header">
              <div className="mp-confirm-modal-icon">
                {confirmModal.type === 'delete' && <i className="fas fa-exclamation-triangle" />}
                {confirmModal.type === 'freeze' && <i className="fas fa-snowflake" />}
                {confirmModal.type === 'success' && <i className="fas fa-check-circle" />}
                {confirmModal.type === 'error' && <i className="fas fa-times-circle" />}
                {confirmModal.type !== 'delete' && confirmModal.type !== 'freeze' && confirmModal.type !== 'success' && confirmModal.type !== 'error' && (
                  <i className="fas fa-info-circle" />
                )}
              </div>
              <h3 className="mp-confirm-modal-title">{confirmModal.title}</h3>
            </div>
            <div className="mp-confirm-modal-body">
              <p>{confirmModal.message}</p>
            </div>
            <div className="mp-confirm-modal-footer">
              {!confirmModal.isAlertOnly && (
                <button 
                  type="button" 
                  className="mp-confirm-btn-cancel" 
                  onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                >
                  Cancelar
                </button>
              )}
              <button 
                type="button" 
                className={`mp-confirm-btn-action mp-confirm-btn-action--${confirmModal.type}`}
                style={confirmModal.isAlertOnly ? { flex: 1 } : {}}
                onClick={() => {
                  if (confirmModal.onConfirm) confirmModal.onConfirm();
                  setConfirmModal({ ...confirmModal, isOpen: false });
                }}
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
