import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import BackButton from '../components/BackButton';
import BotonSeguro from '../components/BotonSeguro';
import ModalAdminBox from '../components/ModalAdminBox';
import '../assets/css/crear-box.css';

export default function CrearBox() {
  const { refetchBoxes } = useAuth();
  const [form, setForm] = useState({ nombre: '', ubicacion: '', idPlanSaaS: null });
  const [mostrarModalAdminBox, setMostrarModalAdminBox] = useState(false);
  const [planes, setPlanes] = useState([]);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/api/saas/planes`)
      .then(r => (r.ok ? r.json() : []))
      .then(d => setPlanes(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    setMostrarModalAdminBox(true);
  };

  const handleModalClose = () => setMostrarModalAdminBox(false);

  const handleAdminBoxSuccess = () => {
    refetchBoxes();
    setMostrarModalAdminBox(false);
    setForm({ nombre: '', ubicacion: '', idPlanSaaS: null });
  };

  return (
    <div className="cb-page">

      {/* Header sticky glassmorphism */}
      <div className="cb-header">
        <div className="d-flex align-items-center gap-3">
          <BackButton />
          <div className="cb-header-icon">
            <i className="fas fa-warehouse"></i>
          </div>
          <div>
            <h1 className="cb-header-title mb-0">NUEVO <span>BOX</span></h1>
            <p className="cb-header-sub mb-0">Configuración inicial de sucursal</p>
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div className="container py-2 py-sm-3">
        <div className="row justify-content-center">
          <div className="col-12 col-sm-10 col-md-7 col-lg-5 col-xl-4">

            <div className="cb-form-card">

              <p className="cb-section-title">
                <i className="fas fa-warehouse"></i>
                Datos del box
              </p>

              <form onSubmit={handleSubmit}>

                <div className="mb-3">
                  <label className="etiqueta-campo">Nombre del Box</label>
                  <input
                    type="text"
                    className="entrada-oscura"
                    placeholder="Ej: WolfPack Cancún"
                    value={form.nombre}
                    onChange={(e) => setForm({ ...form, nombre: e.target.value })}
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
                    onChange={(e) => setForm({ ...form, ubicacion: e.target.value })}
                    required
                  />
                </div>

                <div className="mb-4">
                  <label className="etiqueta-campo">Plan de suscripción</label>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {planes.map(p => {
                      const sel = form.idPlanSaaS === p.idPlan;
                      return (
                        <button
                          type="button"
                          key={p.idPlan}
                          onClick={() => setForm({ ...form, idPlanSaaS: sel ? null : p.idPlan })}
                          style={{
                            flex: '1 1 28%', minWidth: '92px', padding: '0.6rem 0.5rem',
                            borderRadius: '10px', cursor: 'pointer',
                            background: sel ? 'rgba(230,57,70,0.12)' : 'var(--bg-base)',
                            border: `1px solid ${sel ? 'var(--primary)' : 'var(--border)'}`,
                            color: 'var(--text-primary)', display: 'flex', flexDirection: 'column',
                            gap: '2px', alignItems: 'center'
                          }}
                        >
                          <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{p.nombre}</span>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>${Number(p.precio).toLocaleString('es-MX')}/mes</span>
                        </button>
                      );
                    })}
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem', marginBottom: 0 }}>
                    Opcional. Si eliges plan, el box queda Activo con ese plan; si no, queda Pendiente y le asignas plan después en Control de Permisos.
                  </p>
                </div>

                <BotonSeguro
                  type="submit"
                  className="cb-save-btn w-100"
                  textoProcesando={
                    <span className="d-flex align-items-center justify-content-center gap-2">
                      <span className="spinner-border spinner-border-sm"></span>
                      Creando...
                    </span>
                  }
                >
                  <i className="fas fa-plus-circle"></i>
                  Registrar Box
                </BotonSeguro>

              </form>
            </div>

          </div>
        </div>
      </div>

      <ModalAdminBox
        abierto={mostrarModalAdminBox}
        datosBox={form}
        onClose={handleModalClose}
        onSuccess={handleAdminBoxSuccess}
      />
    </div>
  );
}
