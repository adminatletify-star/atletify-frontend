import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { USUARIOS_ENDPOINT } from '../services/api';
import DateWheelPicker from '../components/DateWheelPicker';
import BackButton from '../components/BackButton';
import GeneroPicker from '../components/GeneroPicker';
import TallaPlayeraPicker from '../components/TallaPlayeraPicker';
import CategoriaBasePicker from '../components/CategoriaBasePicker';
import TipoSangrePicker from '../components/TipoSangrePicker';
import BotonSeguro from '../components/BotonSeguro';
import PasswordRulesHint from '../components/PasswordRulesHint';
import usePasswordStrength from '../hooks/usePasswordStrength';
import '../assets/css/MiPerfil.css'; // Reutilizamos los estilos de la card de perfil

export default function PerfilAdminCoach() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userAuth, setUserAuth] = useState(null);

  const [form, setForm] = useState({
    nombre: '', apellidos: '', foto: '', telefono: '', fechaNacimiento: '',
    peso: '', tallaPlayera: '', categoriaBase: '',
    tipoDeSangre: '', tieneExperiencia: false, deporteExperiencia: '', tieneDiscapacidad: '', genero: '',
    contactoEmergenciaNombre: '', contactoEmergenciaTelefono: ''
  });

  const [passForm, setPassForm] = useState({ contrasenaActual: '', nuevaContrasena: '', confirmarContrasena: '' });

  // Validación de fortaleza de contraseña (reutilizable via hook)
  const reglasPassword = usePasswordStrength(passForm.nuevaContrasena);
  const [mostrarDatePicker, setMostrarDatePicker] = useState(false);

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem('usuario'));
    if (!u) { navigate('/login'); return; }
    setUserAuth(u);
    fetchExpediente(u.id || u.idUsuario);
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

        setForm({
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
          contactoEmergenciaNombre: data.ContactoEmergenciaNombre || data.contactoEmergenciaNombre || '',
          contactoEmergenciaTelefono: data.ContactoEmergenciaTelefono || data.contactoEmergenciaTelefono || ''
        });
      }
    } catch (error) { console.error("Error:", error); } finally { setLoading(false); }
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

  const handleSubirFoto = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // Límite de 2MB
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
        alert("¡Perfil actualizado con éxito!");
        const currentStorage = JSON.parse(localStorage.getItem('usuario'));
        currentStorage.nombre = form.nombre;
        localStorage.setItem('usuario', JSON.stringify(currentStorage));
      } else { alert("Hubo un error al guardar los datos."); }
    } catch (error) { alert("Error de conexión."); }
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
          <span className="mp-navbar-brand">Perfil <span>Administrativo</span></span>
        </nav>

        <div className="container py-4" style={{ maxWidth: '1000px' }}>
          
          {/* Avatar Area */}
          <div className="mp-hero mb-4">
            <div className="mp-hero-body" style={{ minHeight: '120px' }}>
              <div className="d-flex flex-column flex-md-row align-items-center gap-4">
                <div className="d-flex flex-column align-items-center gap-2">
                  <div className="mp-hero-avatar" style={{ overflow: 'hidden' }}>
                    {form.foto ? (
                      <img src={form.foto} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      form.nombre ? form.nombre.charAt(0).toUpperCase() : 'U'
                    )}
                  </div>
                  <input type="file" id="fotoUpload" accept="image/*" style={{ display: 'none' }} onChange={handleSubirFoto} />
                  <label htmlFor="fotoUpload" className="mp-foto-btn">
                    <i className="fas fa-camera me-1"></i>Cambiar foto
                  </label>
                </div>

                <div className="text-center text-md-start flex-grow-1">
                  <h2 className="mp-hero-name m-0 p-0">
                    {form.nombre} {form.apellidos}
                  </h2>
                  <p className="text-muted mt-1"><i className="fas fa-shield-alt me-1"></i>{userAuth?.rol}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="row g-4">
            <div className="col-lg-8">
              <div className="mp-card">
                <div className="mp-card-body-lg">
                  <form onSubmit={handleGuardarExpediente}>

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
                        <label className="mp-label">Género</label>
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
                            : 'Seleccionar fecha...'}
                        </button>
                      </div>
                    </div>

                    {/* — Perfil Físico y Deportivo — */}
                    <h5 className="mp-section-title mp-section-title--physical">
                      <i className="fas fa-dumbbell"></i> Perfil Físico y Deportivo
                    </h5>
                    <div className="row g-3 mb-5">
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

                    {/* — Expediente Médico — */}
                    <h5 className="mp-section-title mp-section-title--medical">
                      <i className="fas fa-heartbeat"></i> Expediente Médico y Emergencias
                    </h5>
                    <p className="mp-medical-note">
                      <i className="fas fa-lock"></i> Esta información está cifrada.
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
                      <div className="col-md-6">
                        <label className="mp-label">Nombre del Contacto de Emergencia</label>
                        <input type="text" className="mp-input" placeholder="Ej. María Pérez (Madre)" value={form.contactoEmergenciaNombre} onChange={e => setForm({ ...form, contactoEmergenciaNombre: e.target.value })} />
                      </div>
                      <div className="col-md-6">
                        <label className="mp-label">Teléfono de Emergencia</label>
                        <input type="tel" className="mp-input" placeholder="10 dígitos" maxLength={10} value={form.contactoEmergenciaTelefono} onChange={e => setForm({ ...form, contactoEmergenciaTelefono: e.target.value.replace(/\D/g, '').slice(0, 10) })} />
                      </div>
                    </div>

                    <BotonSeguro type="submit" className="mp-btn-save" textoProcesando={<><i className="fas fa-spinner fa-spin me-2" />Guardando...</>}>
                      <i className="fas fa-save me-2"></i> GUARDAR PERFIL
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
