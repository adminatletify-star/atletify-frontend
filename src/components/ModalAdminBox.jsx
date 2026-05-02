import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import './ModalAdminBox.css';

export default function ModalAdminBox({ abierto, datosBox, onClose, onSuccess }) {
  const API_URL = 'https://localhost:7149/api';

  // Estado del formulario
  const [form, setForm] = useState({
    nombre: '',
    apellidos: '',
    username: '',
    telefono: '',
    fechaNacimiento: '',
    correo: ''
  });

  // Estados de validación y generación
  const [usernameDisponible, setUsernameDisponible] = useState(null);
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [passwordGenerada, setPasswordGenerada] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Debounce para validar username
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
      } catch (err) {
        console.error('Error checking username:', err);
        setUsernameDisponible(null);
      } finally {
        setUsernameChecking(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [form.username]);

  // Generar contraseña cuando el nombre cambia
  useEffect(() => {
    if (form.nombre.trim().length > 0) {
      const prefijo = form.nombre.substring(0, 3).toUpperCase();
      const numeroAleatorio = Math.floor(1000 + Math.random() * 9000);
      const pass = `${prefijo}-${numeroAleatorio}*`;
      setPasswordGenerada(pass);
    } else {
      setPasswordGenerada('');
    }
  }, [form.nombre]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'telefono') {
      const soloDigitos = value.replace(/\D/g, '').slice(0, 10);
      setForm({ ...form, [name]: soloDigitos });
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validaciones
    if (!form.nombre.trim()) {
      setError('El nombre es requerido');
      return;
    }
    if (!form.username.trim()) {
      setError('El username es requerido');
      return;
    }
    if (!usernameDisponible) {
      setError('El username no está disponible o es muy corto');
      return;
    }
    if (!form.correo.trim()) {
      setError('El correo es requerido');
      return;
    }
    if (!form.fechaNacimiento) {
      setError('La fecha de nacimiento es requerida');
      return;
    }
    if (!datosBox.nombre.trim()) {
      setError('Los datos del Box son requeridos');
      return;
    }
    if (!datosBox.ubicacion.trim()) {
      setError('La ubicación del Box es requerida');
      return;
    }

    setLoading(true);

    try {
      // PASO 1: Crear el Box primero
      const resBox = await fetch(`${API_URL}/box`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: datosBox.nombre.trim(),
          ubicacion: datosBox.ubicacion.trim(),
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
      const idBoxCreado = dataBox.idBox;

      // PASO 2: Crear el AdminBox con el idBox del box recién creado
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
          contrasena: passwordGenerada  // Enviar la contraseña generada en el frontend
        })
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        setTimeout(() => {
          onSuccess?.(data);
        }, 2000);
      } else {
        setError(data.mensaje || 'Error al crear el AdminBox');
      }
    } catch (err) {
      setError(err.message || 'Error de conexión con el servidor');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(passwordGenerada);
  };

  if (!abierto) return null;

  return createPortal(
    <div className="mab-overlay" onClick={onClose}>
      <div className="mab-panel" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="mab-header">
          <div className="mab-header-content">
            <i className="fas fa-user-shield mab-header-icon"></i>
            <div>
              <h5 className="mb-0">Configurar AdminBox</h5>
              <small className="text-muted">Administrador del Box</small>
            </div>
          </div>
          <button
            type="button"
            className="btn-close btn-close-white"
            onClick={onClose}
          ></button>
        </div>

        {/* Success Message */}
        {success && (
          <div className="mab-success">
            <div className="mab-success-content">
              <i className="fas fa-check-circle"></i>
              <div>
                <h6>¡AdminBox Creado!</h6>
                <p className="mb-2">Usuario creado exitosamente</p>
                <div className="mab-password-display">
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={`Username: ${form.username} | Contraseña: ${passwordGenerada}`}
                    readOnly
                  />
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-light"
                    onClick={copyToClipboard}
                    title="Copiar contraseña"
                  >
                    <i className="fas fa-copy"></i>
                  </button>
                </div>
                <small className="text-warning d-block mt-2">
                  Guarda esta contraseña, se mostrará solo una vez
                </small>
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        {!success && (
          <form onSubmit={handleSubmit}>
            <div className="mab-body">

              {error && (
                <div className="alert alert-danger" role="alert">
                  <i className="fas fa-exclamation-circle me-2"></i>
                  {error}
                </div>
              )}

              {/* Nombre */}
              <div className="mb-3">
                <label className="form-label">Nombre *</label>
                <input
                  type="text"
                  className="form-control form-control-lg bg-dark text-white border-secondary"
                  name="nombre"
                  value={form.nombre}
                  onChange={handleInputChange}
                  placeholder="Juan"
                  required
                />
              </div>

              {/* Apellidos */}
              <div className="mb-3">
                <label className="form-label">Apellidos</label>
                <input
                  type="text"
                  className="form-control form-control-lg bg-dark text-white border-secondary"
                  name="apellidos"
                  value={form.apellidos}
                  onChange={handleInputChange}
                  placeholder="Pérez García"
                />
              </div>

              {/* Username */}
              <div className="mb-3">
                <label className="form-label">Username *</label>
                <div className="input-group">
                  <input
                    type="text"
                    className={`form-control form-control-lg bg-dark text-white border-secondary ${usernameDisponible === true
                        ? 'border-success'
                        : usernameDisponible === false
                          ? 'border-danger'
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
                    <span className="input-group-text bg-dark border-secondary text-muted">
                      <i className="fas fa-spinner fa-spin"></i>
                    </span>
                  )}
                </div>
                {usernameDisponible === true && (
                  <small className="text-success">
                    <i className="fas fa-check-circle me-1"></i>Username disponible
                  </small>
                )}
                {usernameDisponible === false && (
                  <small className="text-danger">
                    <i className="fas fa-times-circle me-1"></i>Username no disponible
                  </small>
                )}
              </div>

              {/* Correo */}
              <div className="mb-3">
                <label className="form-label">Correo *</label>
                <input
                  type="email"
                  className="form-control form-control-lg bg-dark text-white border-secondary"
                  name="correo"
                  value={form.correo}
                  onChange={handleInputChange}
                  placeholder="juan@example.com"
                  required
                />
              </div>

              {/* Teléfono */}
              <div className="mb-3">
                <label className="form-label">Teléfono</label>
                <input
                  type="tel"
                  className="form-control form-control-lg bg-dark text-white border-secondary"
                  name="telefono"
                  value={form.telefono}
                  onChange={handleInputChange}
                  placeholder="10 dígitos"
                  maxLength={10}
                />
              </div>

              {/* Fecha de Nacimiento */}
              <div className="mb-3">
                <label className="form-label">Fecha de Nacimiento *</label>
                <input
                  type="date"
                  className="form-control form-control-lg bg-dark text-white border-secondary"
                  name="fechaNacimiento"
                  value={form.fechaNacimiento}
                  onChange={handleInputChange}
                  required
                />
              </div>

              {/* Password Automática */}
              <div className="mb-3">
                <label className="form-label">Contraseña (Generada Automáticamente)</label>
                <div className="input-group">
                  <input
                    type="text"
                    className="form-control form-control-lg bg-dark text-white border-secondary"
                    value={passwordGenerada}
                    readOnly
                    placeholder="Se mostrará después de crear el AdminBox"
                  />
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={copyToClipboard}
                    disabled={!passwordGenerada || passwordGenerada.includes('...')}
                    title="Copiar contraseña"
                  >
                    <i className="fas fa-copy"></i>
                  </button>
                </div>
                <small className="text-muted d-block mt-2">
                  Contraseña generada automáticamente en formato: XXX-NNNN*
                </small>
              </div>

            </div>

            {/* Footer */}
            <div className="mab-footer">
              <button
                type="button"
                className="btn btn-outline-secondary btn-lg w-100"
                onClick={onClose}
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn btn-danger btn-lg w-100"
                disabled={loading || !usernameDisponible}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2"></span>
                    Creando...
                  </>
                ) : (
                  <>
                    <i className="fas fa-user-plus me-2"></i>
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
