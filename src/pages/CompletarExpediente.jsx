import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BackButton from '../components/BackButton';

export default function CompletarExpediente() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [clases, setClases] = useState([]);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    peso: '',
    tallaPlayera: '',
    categoria: 'Novato',
    experiencia: '',
    idClaseBase: '',
    comprobante: null // Aquí iría el archivo en un escenario real
  });

  const API_URL = 'https://localhost:7149/api';

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem('usuario'));
    if (!u || u.rol !== 'Usuario') { // Solo los "Usuarios" (Standby) entran aquí
      navigate('/login');
      return;
    }
    setUser(u);
    // Cargamos las clases del box para que elija su horario
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
      console.error("Error cargando clases:", err);
    }
  }

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    setFormData({ ...formData, comprobante: e.target.files[0] });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Aquí le avisamos a C# que este usuario ya llenó sus datos
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
        alert("¡Expediente enviado a revisión! Tu Coach te aprobará pronto.");
        // Lo mandamos de regreso al panel para que siga viendo el reloj de arena (hasta que Liz lo apruebe)
        // Le inyectamos el peso a la memoria para saber que ya llenó los datos
        const usuarioActualizado = { ...user, peso: formData.peso };
        localStorage.setItem('usuario', JSON.stringify(usuarioActualizado));
        navigate('/user-panel');
      } else {
        alert("Hubo un error al enviar tu expediente.");
      }
    } catch (error) {
      alert("Error de conexión con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  // ESTILOS CUPERTINO
  const cupertinoCard = {
    background: 'rgba(30, 30, 30, 0.6)',
    backdropFilter: 'blur(15px)',
    borderRadius: '24px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.3)'
  };

  const cupertinoInput = {
    borderRadius: '12px',
    background: 'rgba(0, 0, 0, 0.2)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    color: '#fff',
    padding: '12px 16px'
  };

  return (
    <div className="bg-dark text-white min-vh-100 py-5" style={{ background: 'linear-gradient(135deg, #121212 0%, #1e1e1e 100%)' }}>
      <div className="container" style={{ maxWidth: '700px' }}>

        <BackButton to="/user-panel" className="me-3 mb-4" />

        <h2 className="fw-bold mb-2">Completar <span className="text-danger">Expediente</span></h2>
        <p className="text-secondary mb-4">Ayúdanos a conocerte mejor y selecciona tu horario fijo de entrenamiento.</p>

        <div className="card text-white border-0" style={cupertinoCard}>
          <div className="card-body p-4 p-md-5">
            <form onSubmit={handleSubmit}>
              
              <h5 className="text-danger fw-bold mb-3"><i className="fas fa-dumbbell me-2"></i>Tus Datos Físicos</h5>
              <div className="row mb-4">
                <div className="col-md-6 mb-3">
                  <label className="small text-secondary fw-bold mb-2">PESO (KG/LBS)</label>
                  <input type="number" name="peso" className="form-control shadow-none" style={cupertinoInput} value={formData.peso} onChange={handleChange} required />
                </div>
                <div className="col-md-6 mb-3">
                  <label className="small text-secondary fw-bold mb-2">TALLA DE PLAYERA</label>
                  <select name="tallaPlayera" className="form-select shadow-none" style={cupertinoInput} value={formData.tallaPlayera} onChange={handleChange} required>
                    <option value="">Selecciona...</option>
                    <option value="XS">XS</option><option value="S">S</option>
                    <option value="M">M</option><option value="L">L</option><option value="XL">XL</option>
                  </select>
                </div>
                <div className="col-md-6 mb-3">
                  <label className="small text-secondary fw-bold mb-2">NIVEL ACTUAL</label>
                  <select name="categoria" className="form-select shadow-none" style={cupertinoInput} value={formData.categoria} onChange={handleChange}>
                    <option value="Novato">Novato (Clase técnica)</option>
                    <option value="Escalado">Escalado</option>
                    <option value="Intermedio">Intermedio</option>
                    <option value="RX">RX (Avanzado)</option>
                  </select>
                </div>
                <div className="col-md-6 mb-3">
                  <label className="small text-secondary fw-bold mb-2">LESIONES O EXPERIENCIA PREVIA</label>
                  <input type="text" name="experiencia" className="form-control shadow-none" style={cupertinoInput} value={formData.experiencia} onChange={handleChange} placeholder="Ej. Lesión en rodilla, 2 años Gym..." />
                </div>
              </div>

              <hr className="border-secondary opacity-25 my-4" />

              <h5 className="text-danger fw-bold mb-3"><i className="far fa-calendar-check me-2"></i>Tu Clase Fija</h5>
              <p className="small text-secondary mb-3">Elige el horario al que asistirás regularmente. No te preocupes, como atleta podrás reservar horas extras después.</p>
              
              <div className="mb-4">
                <select name="idClaseBase" className="form-select shadow-none fs-5 py-3" style={{...cupertinoInput, borderColor: '#dc3545'}} value={formData.idClaseBase} onChange={handleChange} required>
                  <option value="">-- Elige tu horario --</option>
                  {clases.map(c => (
                    <option key={c.idClase} value={c.idClase}>{c.nombre} ({c.horarioInicio} - {c.horarioFin})</option>
                  ))}
                </select>
              </div>

              <hr className="border-secondary opacity-25 my-4" />

              <h5 className="text-danger fw-bold mb-3"><i className="fas fa-receipt me-2"></i>Pago de Mensualidad</h5>
              <div className="mb-5">
                <label className="small text-secondary fw-bold mb-2">SUBIR COMPROBANTE (FOTO O PDF)</label>
                <input type="file" className="form-control shadow-none" style={cupertinoInput} onChange={handleFileChange} accept="image/*,.pdf" />
                <small className="text-muted mt-2 d-block">Una vez enviado, el administrador validará tu pago para activar tu cuenta.</small>
              </div>

              <button type="submit" className="btn btn-danger w-100 py-3 fw-bold fs-5" style={{ borderRadius: '14px' }} disabled={loading}>
                {loading ? 'Enviando...' : 'Enviar Expediente a Revisión'}
              </button>

            </form>
          </div>
        </div>
      </div>
    </div>
  );
}