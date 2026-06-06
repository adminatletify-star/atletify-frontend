import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import DateWheelPicker from './DateWheelPicker';
import './ModalAdminBox.css';

export default function ModalAdminBox({ abierto, datosBox, boxExistente = null, onClose, onSuccess }) {
  const API_URL = import.meta.env.VITE_API_URL;

  // Si viene boxExistente, no se crea un box nuevo: el admin se agrega a ese box.
  const esBoxExistente = !!boxExistente;
  const boxData = boxExistente
    ? { nombre: boxExistente.nombre, ubicacion: '' }
    : (datosBox || { nombre: '', ubicacion: '' });

  const [form, setForm] = useState({
    nombre: '',
    apellidos: '',
    username: '',
    telefono: '',
    fechaNacimiento: '',
    correo: ''
  });

  const [usernameDisponible, setUsernameDisponible] = useState(null);
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [passwordGenerada, setPasswordGenerada] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [mostrarDatePicker, setMostrarDatePicker] = useState(false);
  const enviandoRef = useRef(false);

  useEffect(() => {
    if (abierto) {
      setForm({ nombre: '', apellidos: '', username: '', telefono: '', fechaNacimiento: '', correo: '' });
      setUsernameDisponible(null);
      setUsernameChecking(false);
      setPasswordGenerada('');
      setLoading(false);
      setSuccess(false);
      setMostrarDatePicker(false);
      enviandoRef.current = false;
    }
  }, [abierto]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (form.username.trim().length < 3) {
        setUsernameDisponible(null);
        return;
      }
      setUsernameChecking(true);
      try {
        const response = await fetch(
          `${API_URL}/usuarios/verificar-username/${encodeURIComponent(form.username)}`
        );
        const data = await response.json();
        setUsernameDisponible(data.disponible);
      } catch {
        setUsernameDisponible(null);
      } finally {
        setUsernameChecking(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [form.username]);

  useEffect(() => {
    if (form.nombre.trim().length > 0) {
      const prefijo = form.nombre.substring(0, 3).toUpperCase();
      const numeroAleatorio = Math.floor(1000 + Math.random() * 9000);
      setPasswordGenerada(`${prefijo}-${numeroAleatorio}*`);
    } else {
      setPasswordGenerada('');
    }
  }, [form.nombre]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'telefono') {
      setForm({ ...form, [name]: value.replace(/\D/g, '').slice(0, 10) });
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (enviandoRef.current) return;

    if (!form.nombre.trim())        return window.alert('Error: el nombre es requerido');
    if (!form.username.trim())       return window.alert('Error: el username es requerido');
    if (!usernameDisponible)         return window.alert('Error: el username no está disponible o es muy corto');
    if (!form.correo.trim())         return window.alert('Error: el correo es requerido');
    if (!form.fechaNacimiento)       return window.alert('Error: la fecha de nacimiento es requerida');
    if (!esBoxExistente && !boxData.nombre.trim())     return window.alert('Error: los datos del Box son requeridos');
    if (!esBoxExistente && !boxData.ubicacion.trim())  return window.alert('Error: la ubicación del Box es requerida');

    enviandoRef.current = true;
    setLoading(true);
    // Si el box ya existe, lo usamos directo; si no, se crea en el PASO 1.
    let idBoxCreado = esBoxExistente ? boxExistente.idBox : null;
    let boxFueCreadoAqui = false;

    try {
      // PASO 1: Crear el Box (solo si no es un box existente)
      if (!esBoxExistente) {
        const resBox = await fetch(`${API_URL}/box`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nombre: boxData.nombre.trim(),
            ubicacion: boxData.ubicacion.trim(),
            activo: true,
            costoMensualidad: 0,
            costoMensualidadKids: 0
          })
        });

        if (!resBox.ok) {
          const errorBox = await resBox.json();
          throw new Error(errorBox.mensaje || 'Error al crear el Box');
        }

        const dataBox = await resBox.json();
        idBoxCreado = dataBox.idBox;
        boxFueCreadoAqui = true;
      }

      // PASO 2: Crear el AdminBox
      const response = await fetch(`${API_URL}/usuarios/crear-admin-box`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: form.nombre.trim(),
          apellidos: form.apellidos.trim() || null,
          username: form.username.trim(),
          telefono: form.telefono.trim() || null,
          fechaNacimiento: new Date(form.fechaNacimiento).toISOString(),
          correo: form.correo.trim(),
          idBox: idBoxCreado,
          contrasena: passwordGenerada
        })
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
      } else {
        // Rollback: eliminar el box solo si lo creamos aquí
        if (boxFueCreadoAqui) {
          await fetch(`${API_URL}/box/${idBoxCreado}`, { method: 'DELETE' }).catch(() => {});
        }
        window.alert(`Error: ${data.mensaje || 'no se pudo crear el AdminBox'}`);
      }
    } catch (err) {
      // Rollback solo si el box fue creado aquí antes del error
      if (boxFueCreadoAqui && idBoxCreado) {
        await fetch(`${API_URL}/box/${idBoxCreado}`, { method: 'DELETE' }).catch(() => {});
      }
      window.alert(`Error: ${err.message || 'no se pudo conectar con el servidor'}`);
    } finally {
      setLoading(false);
      enviandoRef.current = false;
    }
  };

  const copyToClipboard = () =>
    navigator.clipboard.writeText(`Username: ${form.username} | Contraseña: ${passwordGenerada}`);

  if (!abierto) return null;

  return createPortal(
    <div className="mab-overlay" onClick={success ? undefined : onClose}>
      <div className="mab-panel" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="mab-header">
          <div className="mab-header-content">
            <p className="mab-header-supertitle">{esBoxExistente ? `AGREGAR ADMIN · ${boxExistente.nombre}` : 'NUEVO BOX — PASO 2'}</p>
            <h2 className="mab-header-title">
              <i className="fas fa-user-shield me-2" style={{ color: 'var(--primary)', fontSize: '0.85em' }}></i>
              {esBoxExistente ? 'Agregar AdminBox' : 'Configurar AdminBox'}
            </h2>
          </div>
          <button className="mab-header-close" onClick={success ? onSuccess : onClose} type="button">
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Success */}
        {success && (
          <div className="mab-success">
            <i className="fas fa-check-circle mab-success__icon"></i>
            <h3 className="mab-success__title">¡AdminBox Creado!</h3>
            <p className="mab-success__desc">Usuario creado exitosamente</p>
            <div className="mab-success__box">
              <p className="mab-success__cred">
                Username: {form.username}<br />
                Contraseña: {passwordGenerada}
              </p>
              <button type="button" className="mab-success__copy-btn" onClick={copyToClipboard}>
                <i className="fas fa-copy"></i>
                Copiar credenciales
              </button>
              <p className="mab-success__warn">
                <i className="fas fa-exclamation-triangle"></i>
                Guarda esta contraseña — se muestra solo una vez
              </p>
            </div>
          </div>
        )}

        {/* Form */}
        {!success && (
          <form onSubmit={handleSubmit}>
            <div className="mab-body">

              <div className="mb-3">
                <label className="etiqueta-campo">Nombre *</label>
                <input
                  type="text"
                  className="entrada-oscura"
                  name="nombre"
                  value={form.nombre}
                  onChange={handleInputChange}
                  placeholder="Juan"
                  required
                />
              </div>

              <div className="mb-3">
                <label className="etiqueta-campo">Apellidos</label>
                <input
                  type="text"
                  className="entrada-oscura"
                  name="apellidos"
                  value={form.apellidos}
                  onChange={handleInputChange}
                  placeholder="Pérez García"
                />
              </div>

              <div className="mb-3">
                <label className="etiqueta-campo">Username *</label>
                <div className="mab-input-group">
                  <input
                    type="text"
                    className={`entrada-oscura${
                      usernameDisponible === true
                        ? ' entrada-oscura--ok'
                        : usernameDisponible === false
                        ? ' entrada-oscura--error'
                        : ''
                    }`}
                    name="username"
                    value={form.username}
                    onChange={handleInputChange}
                    placeholder="juanperez123"
                    required
                    minLength={3}
                  />
                  {usernameChecking && (
                    <div className="mab-copy-btn" style={{ cursor: 'default' }}>
                      <i className="fas fa-spinner fa-spin"></i>
                    </div>
                  )}
                </div>
                {usernameDisponible === true && (
                  <p className="mab-status mab-status--ok">
                    <i className="fas fa-check-circle"></i>Username disponible
                  </p>
                )}
                {usernameDisponible === false && (
                  <p className="mab-status mab-status--error">
                    <i className="fas fa-times-circle"></i>Username no disponible
                  </p>
                )}
              </div>

              <div className="mb-3">
                <label className="etiqueta-campo">Correo *</label>
                <input
                  type="email"
                  className="entrada-oscura"
                  name="correo"
                  value={form.correo}
                  onChange={handleInputChange}
                  placeholder="juan@example.com"
                  required
                />
              </div>

              <div className="mb-3">
                <label className="etiqueta-campo">Teléfono</label>
                <input
                  type="tel"
                  className="entrada-oscura"
                  name="telefono"
                  value={form.telefono}
                  onChange={handleInputChange}
                  placeholder="10 dígitos"
                  maxLength={10}
                />
              </div>

              <div className="mb-3">
                <label className="etiqueta-campo">Fecha de Nacimiento *</label>
                <button
                  type="button"
                  className={`entrada-oscura mab-fecha-btn${mostrarDatePicker ? ' mab-fecha-btn--open' : ''}`}
                  onClick={() => setMostrarDatePicker(true)}
                >
                  <i className="fas fa-birthday-cake mab-fecha-icon"></i>
                  {form.fechaNacimiento
                    ? <span className="mab-fecha-valor">{new Date(form.fechaNacimiento).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                    : <span className="mab-fecha-placeholder">Seleccionar fecha...</span>}
                  <i className="fas fa-chevron-down mab-fecha-arrow"></i>
                </button>
              </div>

              {mostrarDatePicker && createPortal(
                <div className="dwp-overlay" onClick={(e) => { if (e.target === e.currentTarget) setMostrarDatePicker(false); }}>
                  <div className="dwp-modal">
                    <DateWheelPicker
                      initialDate={form.fechaNacimiento ? new Date(form.fechaNacimiento) : new Date(2000, 0, 1)}
                      onAccept={(date) => { setForm(prev => ({ ...prev, fechaNacimiento: date.toISOString() })); setMostrarDatePicker(false); }}
                      onCancel={() => setMostrarDatePicker(false)}
                    />
                  </div>
                </div>, document.body
              )}


            </div>

            {/* Footer */}
            <div className="mab-footer">
              <button
                type="button"
                className="mab-cancel-btn"
                onClick={onClose}
                disabled={loading}
              >
                <i className="fas fa-times"></i>
              </button>
              <button
                type="submit"
                className="mab-save-btn"
                disabled={loading || !usernameDisponible}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm"></span>
                    Creando...
                  </>
                ) : (
                  <>
                    <i className="fas fa-user-plus"></i>
                    Crear AdminBox
                  </>
                )}
              </button>
            </div>
          </form>
        )}

      </div>
    </div>,
    document.body
  );
}
