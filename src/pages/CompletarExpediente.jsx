import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BackButton from '../components/BackButton';
import TallaPlayeraPicker from '../components/TallaPlayeraPicker';
import CategoriaBasePicker from '../components/CategoriaBasePicker';
import '../assets/css/CompletarExpediente.css';

export default function CompletarExpediente() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [clases, setClases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [alerts, setAlerts] = useState([]);

  const [formData, setFormData] = useState({
    peso: '',
    tallaPlayera: '',
    categoria: 'Novato',
    experiencia: '',
    idClaseBase: '',
    comprobante: null
  });

  const API_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem('usuario'));
    if (!u || u.rol !== 'Usuario') {
      navigate('/login');
      return;
    }
    setUser(u);
    if (u.idBoxPredeterminado) {
      cargarClases(u.idBoxPredeterminado);
    }
  }, [navigate]);

  async function cargarClases(idBox) {
    try {
      const res = await fetch(`${API_URL}/clases/box/${idBox}`);
      if (res.ok) {
        const data = await res.json();
        setClases(data);
      }
    } catch (err) {
      console.error('Error cargando clases:', err);
    }
  }

  const showAlert = (mensaje, tipo = 'danger') => {
    const a = { id: Date.now(), mensaje, tipo };
    setAlerts(prev => [...prev, a]);
    setTimeout(() => setAlerts(prev => prev.filter(x => x.id !== a.id)), 5000);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    setFormData({ ...formData, comprobante: e.target.files[0] });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.peso || Number(formData.peso) <= 0) return showAlert('Ingresa tu peso en kilogramos.');
    if (!formData.tallaPlayera) return showAlert('Selecciona tu talla de playera.');
    if (!formData.idClaseBase) return showAlert('Selecciona un horario de entrenamiento.');

    setLoading(true);
    try {
      const userId = user.idUsuario || user.id;
      const response = await fetch(`${API_URL}/usuarios/${userId}/expediente`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          peso: parseFloat(formData.peso),
          tallaPlayera: formData.tallaPlayera,
          categoriaBase: formData.categoria,
          deporteExperiencia: formData.experiencia,
          idClaseBase: parseInt(formData.idClaseBase)
        })
      });

      if (response.ok) {
        showAlert('Expediente enviado. El administrador del box lo revisará y activará tu cuenta en breve.', 'success');
        const usuarioActualizado = { ...user, peso: formData.peso };
        localStorage.setItem('usuario', JSON.stringify(usuarioActualizado));
        setTimeout(() => navigate('/user-panel'), 2200);
      } else {
        showAlert('No fue posible enviar el expediente. Intenta de nuevo.');
      }
    } catch {
      showAlert('Error de conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cex-root">
      <div className="container cex-container">

        <div className="cex-back">
          <BackButton to="/user-panel" />
        </div>

        {/* Hero */}
        <div className="cex-hero">
          <div className="cex-hero-badge">
            <i className="fas fa-file-medical-alt"></i>
            <span>Expediente Deportivo</span>
          </div>
          <h1 className="cex-hero-title">
            Completar <span className="cex-hero-accent">Expediente</span>
          </h1>
          <p className="cex-hero-sub">
            Proporciona tu información física y selecciona tu horario de entrenamiento.
          </p>
        </div>

        {/* Alertas */}
        <div className="cex-alerts">
          {alerts.map(a => (
            <div key={a.id} className={`cex-alert cex-alert-${a.tipo}`}>
              <i className={`fas ${a.tipo === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`}></i>
              {a.mensaje}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="cex-card">
          <form onSubmit={handleSubmit}>

            {/* 01 — Datos físicos */}
            <div className="cex-section-head">
              <span className="cex-section-num">01</span>
              <div>
                <p className="cex-section-title">Datos Físicos</p>
                <p className="cex-section-desc">Información requerida para tu expediente en el box.</p>
              </div>
              <i className="fas fa-weight cex-section-icon"></i>
            </div>

            <div className="row g-3 mb-2">
              <div className="col-12 col-md-6">
                <label className="cex-label">Peso (kg)</label>
                <input
                  type="number"
                  name="peso"
                  className="form-control"
                  value={formData.peso}
                  onChange={e => {
                    const v = e.target.value;
                    if (v === '' || /^\d{0,3}(\.\d{0,2})?$/.test(v)) setFormData(prev => ({ ...prev, peso: v }));
                  }}
                  placeholder="Ej. 70"
                  step="0.1"
                  min="1"
                  max="999"
                  required
                />
              </div>
              <div className="col-12 col-md-6">
                <label className="cex-label">Talla de Playera</label>
                <TallaPlayeraPicker
                  valor={formData.tallaPlayera}
                  onCambiar={v => setFormData(prev => ({ ...prev, tallaPlayera: v }))}
                />
              </div>
              <div className="col-12 col-md-6">
                <label className="cex-label">Nivel de CrossFit</label>
                <CategoriaBasePicker
                  valor={formData.categoria}
                  onCambiar={v => setFormData(prev => ({ ...prev, categoria: v }))}
                />
              </div>
              <div className="col-12 col-md-6">
                <label className="cex-label">Lesiones o Experiencia Previa (Opcional)</label>
                <input
                  type="text"
                  name="experiencia"
                  className="form-control"
                  value={formData.experiencia}
                  onChange={handleChange}
                  placeholder="Ej. Lesión de rodilla, 2 años en gimnasio..."
                />
              </div>
            </div>

            {/* 02 — Clase fija */}
            <div className="cex-section-head">
              <span className="cex-section-num">02</span>
              <div>
                <p className="cex-section-title">Clase Asignada</p>
                <p className="cex-section-desc">Selecciona el horario al que asistirás regularmente.</p>
              </div>
              <i className="far fa-calendar-check cex-section-icon"></i>
            </div>

            <div className="mb-2">
              <label className="cex-label">Horario de Entrenamiento</label>
              <select
                name="idClaseBase"
                className="form-select"
                value={formData.idClaseBase}
                onChange={handleChange}
                required
              >
                <option value="">Selecciona un horario...</option>
                {clases.map(c => (
                  <option key={c.idClase} value={c.idClase}>
                    {c.nombre} ({c.horarioInicio} - {c.horarioFin})
                  </option>
                ))}
              </select>
              {clases.length === 0 && (
                <span className="cex-helper-text">
                  <i className="fas fa-info-circle me-1"></i>
                  No hay horarios disponibles. Consulta con el administrador del box.
                </span>
              )}
            </div>

            {/* 03 — Comprobante */}
            <div className="cex-section-head">
              <span className="cex-section-num">03</span>
              <div>
                <p className="cex-section-title">Comprobante de Pago</p>
                <p className="cex-section-desc">Adjunta la imagen del recibo o transferencia bancaria.</p>
              </div>
              <i className="fas fa-receipt cex-section-icon"></i>
            </div>

            <div className="mb-2">
              <label className="cex-label">Comprobante (Imagen o PDF)</label>
              <input
                type="file"
                className="form-control"
                onChange={handleFileChange}
                accept="image/*,.pdf"
              />
              <span className="cex-helper-text">
                El administrador validará el pago para activar tu cuenta.
              </span>
            </div>

            {/* CTA */}
            <div className="cex-cta">
              <button type="submit" className="cex-btn-submit w-100" disabled={loading}>
                {loading
                  ? <><i className="fas fa-spinner fa-spin"></i> Enviando...</>
                  : <><i className="fas fa-paper-plane"></i> Enviar Expediente a Revisión</>
                }
              </button>
              <p className="cex-cta-helper">
                <i className="fas fa-info-circle"></i>
                Recibirás una notificación cuando el administrador apruebe tu expediente.
              </p>
            </div>

          </form>
        </div>

      </div>
    </div>
  );
}
