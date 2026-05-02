import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { BOXES_ENDPOINT } from '../services/api';
import BackButton from '../components/BackButton';
import BotonSeguro from '../components/BotonSeguro';
import ModalAdminBox from '../components/ModalAdminBox';
import '../assets/css/crear-box.css';

export default function CrearBox() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ nombre: '', ubicacion: '' });
  const [loading, setLoading] = useState(false);
  const [mostrarModalAdminBox, setMostrarModalAdminBox] = useState(false);
  const [idBoxRecienCreado, setIdBoxRecienCreado] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    // Solo mostrar el modal, sin crear el box todavía
    setMostrarModalAdminBox(true);
  };

  const handleModalClose = () => {
    setMostrarModalAdminBox(false);
  };

  const handleAdminBoxSuccess = () => {
    // Redirigir después de crear box y AdminBox
    setTimeout(() => navigate('/admin-box-panel'), 1500);
  };

  return (
    <div className="crearbox-page min-vh-100 d-flex flex-column">

      {/* Header bar estilo MODO JUEZ */}
      <div className="crearbox-header">
        <div className="container d-flex align-items-center gap-3 py-3">
          <BackButton />
          <div className="crearbox-header-icon">
            <i className="fas fa-warehouse"></i>
          </div>
          <h1 className="crearbox-header-title mb-0">NUEVO <span className="crearbox-header-accent">BOX</span></h1>
        </div>
      </div>

      {/* Contenido centrado */}
      <div className="flex-grow-1 d-flex align-items-center py-4">
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-11 col-sm-8 col-md-6 col-lg-5 col-xl-4">

              {/* Subtítulo */}
              <p className="crearbox-subtitle text-center mb-4">Configuración inicial de sucursal</p>

              {/* Formulario */}
              <div className="tarjeta-panel p-4">
                <form onSubmit={handleSubmit}>

                  <div className="mb-4">
                    <label className="etiqueta-campo">Nombre del Box</label>
                    <input
                      type="text"
                      className="entrada-oscura"
                      placeholder="Ej: WolfPack Cancún"
                      value={form.nombre}
                      onChange={(e) => setForm({...form, nombre: e.target.value})}
                      required
                    />
                  </div>

                  <div className="mb-4">
                    <label className="etiqueta-campo">Ubicación / Dirección</label>
                    <input
                      type="text"
                      className="entrada-oscura"
                      placeholder="Ciudad, Estado"
                      value={form.ubicacion}
                      onChange={(e) => setForm({...form, ubicacion: e.target.value})}
                      required
                    />
                  </div>

                  <div className="d-grid gap-2 mt-4">
                    <BotonSeguro type="submit" className="btn btn-danger py-3 fw-bold" textoProcesando={<span className="d-flex align-items-center justify-content-center gap-2"><span className="spinner-border spinner-border-sm"></span>Creando...</span>}>
                      <span><i className="fas fa-plus-circle me-2"></i>Registrar Box</span>
                    </BotonSeguro>
                    <Link to="/admin-box-panel" className="btn crearbox-btn-cancel py-2">
                      Cancelar
                    </Link>
                  </div>

                </form>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* Modal para crear AdminBox */}
      <ModalAdminBox
        abierto={mostrarModalAdminBox}
        datosBox={form}
        onClose={handleModalClose}
        onSuccess={handleAdminBoxSuccess}
      />
    </div>
  );
}