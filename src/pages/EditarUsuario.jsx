import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { USUARIOS_ENDPOINT } from '../services/api';
import BackButton from '../components/BackButton';
import TallaPlayeraPicker from '../components/TallaPlayeraPicker';
import CategoriaBasePicker from '../components/CategoriaBasePicker';
import HorarioClasePicker from '../components/HorarioClasePicker';
import RolUsuarioPicker from '../components/RolUsuarioPicker';
import BotonSeguro from '../components/BotonSeguro';
import '../assets/css/EditarUsuario.css';

export default function EditarUsuario() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [clases, setClases] = useState([]);

  const currentUser = JSON.parse(localStorage.getItem('usuario'));
  const rutaRegreso = currentUser?.rol === 'Developer' ? '/dashboard' : '/admin-box-panel';

  const [form, setForm] = useState({
    nombre: '', correo: '', telefono: '',
    peso: '', tallaPlayera: '', categoriaBase: '', rol: '',
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
        correo: dataUsuario.correo || dataUsuario.Correo || '',
        telefono: dataUsuario.telefono || dataUsuario.Telefono || '',
        peso: dataUsuario.peso || dataUsuario.Peso || '',
        tallaPlayera: dataUsuario.tallaPlayera || dataUsuario.TallaPlayera || '',
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

    const payload = {
      ...form,
      idClasePredeterminada: form.idClasePredeterminada ? parseInt(form.idClasePredeterminada) : null,
      peso: form.peso ? parseFloat(form.peso) : null,
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
        <div className="spinner-wp"></div>
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
            TARJETA DE IDENTIDAD
        ══════════════════════════════════ */}
        <div className="eu-identity">
          <div className="avatar-inicial" style={{ width: '52px', height: '52px', fontSize: '1.3rem', borderRadius: '14px' }}>
            {form.nombre?.charAt(0).toUpperCase() || '?'}
          </div>
          <div style={{ minWidth: 0 }}>
            <p className="eu-identity-name text-truncate">{form.nombre || 'Sin nombre'}</p>
            <p className="eu-identity-email text-truncate">{form.correo || 'Sin correo'}</p>
          </div>
        </div>

        {/* ══════════════════════════════════
            FORMULARIO
        ══════════════════════════════════ */}
        <div className="tarjeta-panel p-4">
          <form onSubmit={handleSubmit}>

            {/* SECCIÓN: Información Personal */}
            <p className="eu-section-label">
              <i className="fas fa-user"></i>Información Personal
            </p>

            <div className="mb-3">
              <label className="etiqueta-campo">Nombre Completo</label>
              <input
                type="text"
                className="entrada-oscura"
                value={form.nombre}
                onChange={e => setForm({ ...form, nombre: e.target.value })}
                placeholder="Nombre del atleta"
              />
            </div>

            <div className="row g-3 mb-3">
              <div className="col-12 col-sm-6">
                <label className="etiqueta-campo">Peso (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  className="entrada-oscura"
                  value={form.peso}
                  onChange={e => setForm({ ...form, peso: e.target.value })}
                  placeholder="Ej. 75.5"
                />
              </div>
              <div className="col-12 col-sm-6">
                <label className="etiqueta-campo">Talla de Playera</label>
                <TallaPlayeraPicker
                  valor={form.tallaPlayera}
                  onCambiar={v => setForm({ ...form, tallaPlayera: v })}
                />
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
              />
              <span className="eu-help-text">
                <i className="fas fa-info-circle me-1"></i>
                Si asignas una clase, el sistema le apartará su lugar automáticamente todos los días.
              </span>
            </div>

            <hr className="separador" />

            {/* SECCIÓN: Permisos */}
            <p className="eu-section-label">
              <i className="fas fa-shield-alt"></i>Rango y Permisos
            </p>

            <div className="mb-4">
              <label className="etiqueta-campo">Rol del Usuario</label>
              <RolUsuarioPicker
                valor={form.rol}
                onCambiar={v => setForm({ ...form, rol: v })}
                esDeveloper={currentUser?.rol === 'Developer'}
              />
              <span className="eu-help-text">
                <i className="fas fa-info-circle me-1"></i>
                Al cambiar a <strong style={{ color: 'var(--text-primary)' }}>Coach</strong>, el usuario aparecerá en la sección de Staff para asignarle especialidades.
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
