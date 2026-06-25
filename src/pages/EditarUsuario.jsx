import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { USUARIOS_ENDPOINT } from '../services/api';
import BackButton from '../components/BackButton';
import CategoriaBasePicker from '../components/CategoriaBasePicker';
import HorarioClasePicker from '../components/HorarioClasePicker';
import BotonSeguro from '../components/BotonSeguro';
import AtletifyLoader from '../components/AtletifyLoader';
import '../assets/css/EditarUsuario.css';

export default function EditarUsuario() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [clases, setClases] = useState([]);

  const currentUser = JSON.parse(localStorage.getItem('usuario'));
  const rutaRegreso = currentUser?.rol === 'Developer' ? '/dashboard' : '/admin-box-panel';

  const [form, setForm] = useState({
    nombre: '', apellidos: '', correo: '', telefono: '', foto: '',
    categoriaBase: '', rol: '',
    idClasePredeterminada: ''
  });

  useEffect(() => {
    if (id) {
      fetchUsuario();
    }
  }, [id]);

  async function fetchUsuario() {
    try {
      const resUsuario = await fetch(`${USUARIOS_ENDPOINT}/${id}`);
      const dataUsuario = await resUsuario.json();

      const idBox = JSON.parse(localStorage.getItem('box'))?.idBox;
      if (idBox) {
        try {
          const resClases = await fetch(`${import.meta.env.VITE_API_URL}/api/clases/box/${idBox}`);
          const dataClases = await resClases.json();
          setClases(dataClases);
        } catch (err) {
          console.error("Error cargando clases:", err);
        }
      }

      setForm({
        nombre: dataUsuario.nombre || dataUsuario.Nombre || '',
        apellidos: dataUsuario.apellidos || dataUsuario.Apellidos || '',
        correo: dataUsuario.correo || dataUsuario.Correo || '',
        telefono: dataUsuario.telefono || dataUsuario.Telefono || '',
        foto: dataUsuario.foto || dataUsuario.Foto || '',
        categoriaBase: dataUsuario.categoriaBase || dataUsuario.CategoriaBase || '',
        rol: dataUsuario.rol || dataUsuario.Rol || 'Usuario',
        idClasePredeterminada: dataUsuario.idClasePredeterminada || dataUsuario.IdClasePredeterminada || ''
      });

    } catch (err) {
      console.error("Error en fetchUsuario:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();

    // Información personal (nombre, apellidos, correo, teléfono, foto) es de SOLO
    // LECTURA en esta pantalla: no se envía para no resobreescribirla (la foto es un
    // base64 enorme). Solo mandamos lo que el admin puede editar aquí.
    const payload = {
      categoriaBase: form.categoriaBase,
      rol: form.rol,
      idClasePredeterminada: form.idClasePredeterminada ? parseInt(form.idClasePredeterminada) : null,
    };

    try {
      const res = await fetch(`${USUARIOS_ENDPOINT}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        alert("¡Datos actualizados exitosamente!");
        navigate(rutaRegreso);
      } else {
        const errData = await res.json();
        alert("Error: " + (errData.mensaje || "No se pudo actualizar."));
      }

    } catch (err) {
      alert("Error de conexión con el servidor.");
    }
  }

  if (loading) {
    return (
      <div className="eu-loading">
        <AtletifyLoader />
        <p>Cargando información del atleta...</p>
      </div>
    );
  }

  return (
    <div className="eu-page">

      {/* ══════════════════════════════════
          HEADER
      ══════════════════════════════════ */}
      <header className="eu-header">
        <div className="d-flex align-items-center gap-3">
          <BackButton to={rutaRegreso} />
          <div>
            <h1 className="eu-header-title">
              Editar <span style={{ color: 'var(--primary)' }}>Perfil</span>
            </h1>
            <p className="eu-header-sub">Modifica los datos del atleta</p>
          </div>
        </div>
      </header>

      <div className="container px-3" style={{ maxWidth: '640px' }}>

        {/* ══════════════════════════════════
            FORMULARIO
        ══════════════════════════════════ */}
        <div className="tarjeta-panel p-4">
          <form onSubmit={handleSubmit}>

            {/* SECCIÓN: Información Personal (SOLO LECTURA) */}
            <p className="eu-section-label">
              <i className="fas fa-user"></i>Información Personal
            </p>

            <div className="eu-readonly">
              <div className="eu-readonly-head">
                {form.foto
                  ? <img src={form.foto} alt={form.nombre || 'Atleta'} className="eu-readonly-avatar" />
                  : <div className="eu-readonly-avatar eu-readonly-avatar--initial">
                      {form.nombre?.charAt(0).toUpperCase() || '?'}
                    </div>
                }
                <div className="eu-readonly-id">
                  <p className="eu-readonly-name text-truncate">
                    {[form.nombre, form.apellidos].filter(Boolean).join(' ') || 'Sin nombre'}
                  </p>
                  <span className="eu-readonly-lock">
                    <i className="fas fa-lock"></i> Solo lectura
                  </span>
                </div>
              </div>

              <div className="eu-readonly-row">
                <i className="fas fa-envelope eu-readonly-icon"></i>
                <span className="eu-readonly-label">Correo</span>
                <span className="eu-readonly-value text-truncate">{form.correo || 'Sin correo'}</span>
              </div>
              <div className="eu-readonly-row">
                <i className="fas fa-phone eu-readonly-icon"></i>
                <span className="eu-readonly-label">Teléfono</span>
                <span className="eu-readonly-value">{form.telefono || 'Sin teléfono'}</span>
              </div>
            </div>

            <hr className="separador" />

            {/* SECCIÓN: Nivel y Categoría */}
            <p className="eu-section-label">
              <i className="fas fa-medal"></i>Nivel y Categoría
            </p>

            <div className="mb-3">
              <label className="etiqueta-campo">Categoría Actual</label>
              <CategoriaBasePicker
                valor={form.categoriaBase}
                onCambiar={v => setForm({ ...form, categoriaBase: v })}
              />
            </div>

            <hr className="separador" />

            {/* SECCIÓN: Horario */}
            <p className="eu-section-label">
              <i className="fas fa-clock"></i>Horario
            </p>

            <div className="mb-3">
              <label className="etiqueta-campo">Horario Fijo (Opcional)</label>
              <HorarioClasePicker
                clases={clases}
                valor={form.idClasePredeterminada}
                onCambiar={v => setForm({ ...form, idClasePredeterminada: v })}
                categoriaUsuario={form.categoriaBase}
              />
              <span className="eu-help-text">
                <i className="fas fa-info-circle me-1"></i>
                Si asignas una clase, el sistema le apartará su lugar automáticamente todos los días.
              </span>
            </div>

            {/* BOTONES */}
            <div className="d-flex flex-column gap-2">
              <BotonSeguro type="button" onClick={handleSubmit} className="eu-btn-guardar" textoProcesando="Guardando...">
                <i className="fas fa-save me-2"></i>Guardar Cambios
              </BotonSeguro>
              <button type="button" onClick={() => navigate(rutaRegreso)} className="eu-btn-cancelar">
                Cancelar
              </button>
            </div>

          </form>
        </div>

      </div>
    </div>
  );
}
