import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { USUARIOS_ENDPOINT } from '../services/api';
import AtletifyLoader from '../components/AtletifyLoader';
import DateWheelPicker from '../components/DateWheelPicker';
import BackButton from '../components/BackButton';
import GeneroPicker from '../components/GeneroPicker';
import TallaPlayeraPicker from '../components/TallaPlayeraPicker';
import CategoriaBasePicker from '../components/CategoriaBasePicker';
import TipoSangrePicker from '../components/TipoSangrePicker';
import BotonSeguro from '../components/BotonSeguro';
import PasswordRulesHint from '../components/PasswordRulesHint';
import ImageCropperModal from '../components/ImageCropperModal';
import MarcasPersonalesPanel from '../components/MarcasPersonalesPanel';
import SkillsAtletaPanel from '../components/SkillsAtletaPanel';
import usePasswordStrength from '../hooks/usePasswordStrength';
import '../assets/css/MiPerfil.css';

export default function PerfilAdminCoach() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userAuth, setUserAuth] = useState(null);
  const [imageToCrop, setImageToCrop] = useState(null);
  const [mostrarDatePicker, setMostrarDatePicker] = useState(false);

  const [form, setForm] = useState({
    nombre: '', apellidos: '', foto: '', telefono: '', fechaNacimiento: '',
    peso: '', tallaPlayera: '', categoriaBase: '',
    tipoDeSangre: '', tieneExperiencia: false, deporteExperiencia: '',
    tieneDiscapacidad: '', genero: '',
    contactoEmergenciaNombre: '', contactoEmergenciaTelefono: ''
  });

  const [passForm, setPassForm] = useState({
    contrasenaActual: '', nuevaContrasena: '', confirmarContrasena: ''
  });

  const reglasPassword = usePasswordStrength(passForm.nuevaContrasena);

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem('usuario'));
    if (!u) { navigate('/login'); return; }
    setUserAuth(u);
    fetchDatos(u.id || u.idUsuario);
  }, [navigate]);

  async function fetchDatos(idUsuario) {
    try {
      const res = await fetch(`${USUARIOS_ENDPOINT}/${idUsuario}`);
      if (res.ok) {
        const data = await res.json();
        let fechaFormat = '';
        if (data.FechaNacimiento || data.fechaNacimiento) {
          fechaFormat = new Date(data.FechaNacimiento || data.fechaNacimiento)
            .toISOString().split('T')[0];
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
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  }

  const calcularEdad = (fechaStr) => {
    if (!fechaStr) return null;
    const hoy = new Date();
    const cumple = new Date(fechaStr);
    let edad = hoy.getFullYear() - cumple.getFullYear();
    const m = hoy.getMonth() - cumple.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < cumple.getDate())) edad--;
    return edad;
  };

  const handleSubirFoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert('La imagen es muy pesada. El tamaño máximo es 2 MB.');
      return;
    }
    setImageToCrop(URL.createObjectURL(file));
    e.target.value = '';
  };

  const guardarFotoInmediata = async (base64Foto) => {
    try {
      const payload = {
        ...form, foto: base64Foto,
        peso: form.peso ? parseFloat(form.peso) : null,
        fechaNacimiento: form.fechaNacimiento
          ? new Date(form.fechaNacimiento).toISOString()
          : null,
      };
      const res = await fetch(`${USUARIOS_ENDPOINT}/${userAuth.id || userAuth.idUsuario}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const current = JSON.parse(localStorage.getItem('usuario'));
        if (current) { current.foto = base64Foto; localStorage.setItem('usuario', JSON.stringify(current)); }
        window.location.reload();
      } else {
        alert('Hubo un error al guardar la foto.');
      }
    } catch { alert('Error de conexión al guardar la foto.'); }
  };

  async function handleGuardarPerfil(e) {
    e.preventDefault();
    const payload = {
      ...form,
      peso: form.peso ? parseFloat(form.peso) : null,
      fechaNacimiento: form.fechaNacimiento
        ? new Date(form.fechaNacimiento).toISOString()
        : null,
    };
    try {
      const res = await fetch(`${USUARIOS_ENDPOINT}/${userAuth.id || userAuth.idUsuario}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        alert('¡Perfil actualizado con éxito!');
        const current = JSON.parse(localStorage.getItem('usuario'));
        current.nombre = form.nombre;
        localStorage.setItem('usuario', JSON.stringify(current));
      } else {
        alert('Hubo un error al guardar los datos.');
      }
    } catch { alert('Error de conexión.'); }
  }

  async function handleCambiarContrasena(e) {
    e.preventDefault();
    if (passForm.nuevaContrasena !== passForm.confirmarContrasena) {
      alert('Las contraseñas no coinciden.');
      return;
    }
    try {
      const res = await fetch(`${USUARIOS_ENDPOINT}/${userAuth.id || userAuth.idUsuario}/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contrasenaActual: passForm.contrasenaActual,
          nuevaContrasena: passForm.nuevaContrasena,
        }),
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

  const edad = calcularEdad(form.fechaNacimiento);

  return (
    <>
      <div className="mp-page">

        {/* ── HEADER STICKY ── */}
        <header className="mp-header">
          <BackButton />
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 className="mp-header-title">
              Perfil <span>Administrativo</span>
            </h1>
            <p className="mp-header-sub">{userAuth?.rol} · {form.nombre} {form.apellidos}</p>
          </div>
        </header>

        <div className="mp-content">

          {/* ── HERO — avatar + nombre ── */}
          <div className="mp-hero" style={{ marginBottom: '1.25rem' }}>
            <div className="mp-hero-body">
              <div className="mp-avatar-wrap">
                <div className="mp-hero-avatar">
                  {form.foto
                    ? <img src={form.foto} alt="Avatar" />
                    : (form.nombre ? form.nombre.charAt(0).toUpperCase() : 'A')}
                </div>
                <input
                  type="file"
                  id="fotoUpload"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleSubirFoto}
                />
                <label htmlFor="fotoUpload" className="mp-foto-btn">
                  <i className="fas fa-camera" /> Cambiar
                </label>
              </div>

              <div className="mp-hero-info">
                <p className="mp-hero-name">{form.nombre} {form.apellidos}</p>
                <p className="mp-hero-realname">{userAuth?.correo || userAuth?.email || ''}</p>
                <div className="mp-hero-badges">
                  <span className="mp-hero-badge">
                    <i className="fas fa-shield-alt" style={{ marginRight: '0.3rem' }}></i>
                    {userAuth?.rol || 'Admin'}
                  </span>
                  {form.categoriaBase && (
                    <span className="mp-hero-badge">
                      <i className="fas fa-dumbbell" style={{ marginRight: '0.3rem' }}></i>
                      {form.categoriaBase}
                    </span>
                  )}
                  {edad && (
                    <span className="mp-hero-badge">{edad} años</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ── LAYOUT PRINCIPAL ── */}
          <div className="mp-layout">

            {/* Columna izquierda — formulario */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

              {/* — DATOS REALES — */}
              <div className="mp-card">
                <div className="mp-card-body-lg">
                  <form onSubmit={handleGuardarPerfil}>

                    <h5 className="mp-section-title mp-section-title--data">
                      <i className="fas fa-id-card"></i> Datos Reales
                    </h5>
                    <div style={{ display: 'grid', gap: '0.85rem', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', marginBottom: '1.75rem' }}>
                      <div>
                        <label className="mp-label">Nombre</label>
                        <input
                          type="text"
                          className="mp-input"
                          value={form.nombre}
                          onChange={e => setForm({ ...form, nombre: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <label className="mp-label">Apellidos</label>
                        <input
                          type="text"
                          className="mp-input"
                          value={form.apellidos}
                          onChange={e => setForm({ ...form, apellidos: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="mp-label">Teléfono (WhatsApp)</label>
                        <input
                          type="tel"
                          className="mp-input"
                          placeholder="10 dígitos"
                          maxLength={10}
                          value={form.telefono}
                          onChange={e => setForm({ ...form, telefono: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                        />
                      </div>
                      <div>
                        <label className="mp-label">Género</label>
                        <GeneroPicker valor={form.genero} onCambiar={v => setForm({ ...form, genero: v })} />
                      </div>
                      <div>
                        <label className="mp-label">
                          Fecha de Nacimiento
                          {edad !== null && (
                            <span style={{ color: 'var(--accent)', fontStyle: 'italic', marginLeft: '0.5rem', fontFamily: 'var(--font-stats)', textTransform: 'none', letterSpacing: 0 }}>
                              ({edad} años)
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

                    {/* — PERFIL FÍSICO — */}
                    <h5 className="mp-section-title mp-section-title--physical">
                      <i className="fas fa-dumbbell"></i> Perfil Físico y Deportivo
                    </h5>
                    <div style={{ display: 'grid', gap: '0.85rem', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', marginBottom: '1.75rem' }}>
                      <div>
                        <label className="mp-label">Peso (kg)</label>
                        <input
                          type="number"
                          step="0.1"
                          className="mp-input"
                          value={form.peso}
                          onChange={e => setForm({ ...form, peso: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="mp-label">Talla de Playera</label>
                        <TallaPlayeraPicker valor={form.tallaPlayera} onCambiar={v => setForm({ ...form, tallaPlayera: v })} />
                      </div>
                      <div>
                        <label className="mp-label">Nivel Actual</label>
                        <CategoriaBasePicker valor={form.categoriaBase} onCambiar={v => setForm({ ...form, categoriaBase: v })} />
                      </div>
                      <div style={{ gridColumn: '1 / -1' }}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            background: 'var(--bg-input)',
                            border: '1px solid var(--border)',
                            borderRadius: '10px',
                            padding: '0.65rem 0.9rem',
                            cursor: 'pointer',
                          }}
                          onClick={() => setForm({ ...form, tieneExperiencia: !form.tieneExperiencia })}
                        >
                          <span style={{
                            width: 38, height: 22, borderRadius: 11,
                            background: form.tieneExperiencia ? 'rgba(230,57,70,0.2)' : 'var(--bg-card)',
                            border: `1px solid ${form.tieneExperiencia ? 'var(--primary)' : 'var(--border)'}`,
                            display: 'inline-flex', alignItems: 'center', flexShrink: 0,
                            padding: '2px', transition: 'var(--transition)',
                          }}>
                            <span style={{
                              width: 16, height: 16, borderRadius: '50%',
                              background: form.tieneExperiencia ? 'var(--primary)' : 'var(--text-muted)',
                              transform: form.tieneExperiencia ? 'translateX(16px)' : 'translateX(0)',
                              transition: 'var(--transition)',
                            }}></span>
                          </span>
                          <span className="mp-switch-label">¿Tienes experiencia previa haciendo ejercicio?</span>
                        </div>
                      </div>
                      {form.tieneExperiencia && (
                        <div style={{ gridColumn: '1 / -1' }}>
                          <label className="mp-label">¿Qué deportes has practicado?</label>
                          <input
                            type="text"
                            className="mp-input"
                            placeholder="Ej. Fútbol, CrossFit, Natación..."
                            value={form.deporteExperiencia}
                            onChange={e => setForm({ ...form, deporteExperiencia: e.target.value })}
                          />
                        </div>
                      )}
                    </div>

                    {/* — EXPEDIENTE MÉDICO — */}
                    <h5 className="mp-section-title mp-section-title--medical">
                      <i className="fas fa-heartbeat"></i> Expediente Médico y Emergencias
                    </h5>
                    <p className="mp-medical-note">
                      <i className="fas fa-lock"></i> Esta información está cifrada y es confidencial.
                    </p>
                    <div style={{ display: 'grid', gap: '0.85rem', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', marginBottom: '1.5rem' }}>
                      <div>
                        <label className="mp-label">Tipo de Sangre</label>
                        <TipoSangrePicker valor={form.tipoDeSangre} onCambiar={v => setForm({ ...form, tipoDeSangre: v })} />
                      </div>
                      <div style={{ gridColumn: '1 / -1' }}>
                        <label className="mp-label">Lesiones, cirugías o enfermedades crónicas</label>
                        <input
                          type="text"
                          className="mp-input mp-input--medical"
                          placeholder="Ej. Asma, hernia discal... (Déjalo en blanco si no aplica)"
                          value={form.tieneDiscapacidad}
                          onChange={e => setForm({ ...form, tieneDiscapacidad: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="mp-label">Nombre del Contacto de Emergencia</label>
                        <input
                          type="text"
                          className="mp-input"
                          placeholder="Ej. María Pérez (Madre)"
                          value={form.contactoEmergenciaNombre}
                          onChange={e => setForm({ ...form, contactoEmergenciaNombre: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="mp-label">Teléfono de Emergencia</label>
                        <input
                          type="tel"
                          className="mp-input"
                          placeholder="10 dígitos"
                          maxLength={10}
                          value={form.contactoEmergenciaTelefono}
                          onChange={e => setForm({ ...form, contactoEmergenciaTelefono: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                        />
                      </div>
                    </div>

                    <BotonSeguro
                      type="submit"
                      className="mp-btn-save"
                      textoProcesando={<><i className="fas fa-spinner fa-spin me-2" />Guardando...</>}
                    >
                      <i className="fas fa-save"></i> Guardar perfil
                    </BotonSeguro>
                  </form>
                </div>
              </div>

              {/* — MIS MARCAS / PRs (el coach/admin también sube sus récords) — */}
              <MarcasPersonalesPanel
                idUsuario={userAuth?.id || userAuth?.idUsuario}
                idBox={JSON.parse(localStorage.getItem('box') || 'null')?.idBox}
              />

              {/* — MIS SKILLS — */}
              <SkillsAtletaPanel idUsuario={userAuth?.id || userAuth?.idUsuario} />
            </div>

            {/* Columna derecha — seguridad */}
            <div>
              <div className="mp-card mp-sidebar-sticky">
                <div className="mp-card-body">
                  <h5 className="mp-section-title mp-section-title--security">
                    <i className="fas fa-lock"></i> Seguridad
                  </h5>
                  <form onSubmit={handleCambiarContrasena}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '0.5rem' }}>
                      <div>
                        <label className="mp-label">Contraseña Actual</label>
                        <input
                          type="password"
                          className="mp-input"
                          required
                          value={passForm.contrasenaActual}
                          onChange={e => setPassForm({ ...passForm, contrasenaActual: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="mp-label">Nueva Contraseña</label>
                        <input
                          type="password"
                          className="mp-input"
                          required
                          value={passForm.nuevaContrasena}
                          onChange={e => setPassForm({ ...passForm, nuevaContrasena: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="mp-label">Confirmar Contraseña</label>
                        <input
                          type="password"
                          className="mp-input"
                          required
                          value={passForm.confirmarContrasena}
                          onChange={e => setPassForm({ ...passForm, confirmarContrasena: e.target.value })}
                        />
                      </div>
                    </div>

                    {(passForm.nuevaContrasena.length > 0 || passForm.confirmarContrasena.length > 0) && (
                      <div style={{ marginBottom: '0.75rem' }}>
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
                      <i className="fas fa-key"></i> Actualizar clave
                    </BotonSeguro>
                  </form>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ── DATE PICKER ── */}
      {mostrarDatePicker && (
        <div className="mp-date-overlay" onClick={() => setMostrarDatePicker(false)}>
          <div className="mp-date-modal" onClick={e => e.stopPropagation()}>
            <DateWheelPicker
              initialDate={form.fechaNacimiento
                ? new Date(form.fechaNacimiento + 'T12:00:00')
                : new Date(2000, 0, 1)}
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

      {/* ── IMAGE CROPPER MODAL ── */}
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
