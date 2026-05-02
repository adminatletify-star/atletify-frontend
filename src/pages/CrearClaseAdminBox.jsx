import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BackButton from '../components/BackButton';

export default function CrearClaseAdminBox() {
  const navigate = useNavigate();
  const [box, setBox] = useState(null);
  const [coaches, setCoaches] = useState([]);
  const [loading, setLoading] = useState(false);

  // Estado del formulario adaptado a tu nueva Base de Datos
  const [form, setForm] = useState({
    nombre: '',
    horarioInicio: '',
    horarioFin: '',
    maximoAtletas: 20,
    idCoach: '',
    minutosCierreInscripcion: 5,
    diasL: true, diasM: true, diasX: true, diasJ: true, diasV: true, diasS: false, diasD: false
  });

  // Reemplaza esto con tu URL real si es diferente
  const API_URL = 'https://localhost:7149/api';

  useEffect(() => {
    const b = JSON.parse(localStorage.getItem('box'));
    if (!b) {
      navigate('/login');
      return;
    }
    setBox(b);
    cargarCoaches(b.idBox);
  }, [navigate]);

  async function cargarCoaches(idBox) {
    try {
      const res = await fetch(`${API_URL}/clases/box/${idBox}/coaches`);
      if (res.ok) {
        const data = await res.json();
        setCoaches(data);
      }
    } catch (err) { console.error("Error cargando coaches", err); }
  }

  const handleCheckbox = (dia) => {
    setForm(prev => ({ ...prev, [dia]: !prev[dia] }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Armamos el string de días (Ej: "L,M,X,J,V")
    const diasSeleccionados = [];
    if (form.diasL) diasSeleccionados.push('L');
    if (form.diasM) diasSeleccionados.push('M');
    if (form.diasX) diasSeleccionados.push('X'); // Usamos 'X' para evitar confusión con 'M' de Martes
    if (form.diasJ) diasSeleccionados.push('J');
    if (form.diasV) diasSeleccionados.push('V');
    if (form.diasS) diasSeleccionados.push('S');
    if (form.diasD) diasSeleccionados.push('D');

    const nuevaClase = {
      idBox: box.idBox,
      nombre: form.nombre,
      horarioInicio: form.horarioInicio + ':00', // Formato TimeSpan C#
      horarioFin: form.horarioFin + ':00',
      maximoAtletas: parseInt(form.maximoAtletas),
      idCoach: form.idCoach ? parseInt(form.idCoach) : null,
      minutosCierreInscripcion: parseInt(form.minutosCierreInscripcion),
      diasDeLaSemana: diasSeleccionados.join(','),
      activa: true
    };

    try {
      const res = await fetch(`${API_URL}/clases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nuevaClase)
      });

      if (res.ok) {
        alert('¡Clase creada exitosamente!');
        navigate('/admin-box-panel'); // Regresa al panel de Liz
      } else {
        alert('Error al crear la clase');
      }
    } catch (err) {
      alert('Error de conexión con el servidor');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    color: 'white',
    borderRadius: '12px',
    padding: '12px'
  };

  const dayBtnStyle = (active) => ({
    width: '40px', height: '40px',
    borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer',
    fontWeight: 'bold',
    background: active ? '#dc3545' : 'rgba(255,255,255,0.1)',
    color: active ? 'white' : '#aaa',
    border: 'none',
    transition: 'all 0.2s'
  });

  return (
    <div className="bg-dark text-white min-vh-100 py-5" style={{ background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)' }}>
      <div className="container" style={{ maxWidth: '700px' }}>
        <div className="d-flex align-items-center gap-3 mb-4">
          <BackButton />
          <h2 className="fw-bold mb-0">Aperturar <span className="text-danger">Clase</span></h2>
        </div>
        
        <div className="card border-0 p-4 p-md-5" style={{ background: 'rgba(30, 30, 30, 0.6)', backdropFilter: 'blur(15px)', borderRadius: '24px' }}>
          <form onSubmit={handleSubmit}>
            
            <div className="mb-4">
              <label className="small fw-bold text-secondary mb-2">NOMBRE DE LA CLASE</label>
              <input type="text" className="form-control shadow-none" style={inputStyle} 
                     placeholder="Ej: WOD 6:00 AM - RX" required
                     value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} />
            </div>

            <div className="row mb-4">
              <div className="col-6">
                <label className="small fw-bold text-secondary mb-2">HORA INICIO</label>
                <input type="time" className="form-control shadow-none" style={inputStyle} required
                       value={form.horarioInicio} onChange={e => setForm({...form, horarioInicio: e.target.value})} />
              </div>
              <div className="col-6">
                <label className="small fw-bold text-secondary mb-2">HORA FIN</label>
                <input type="time" className="form-control shadow-none" style={inputStyle} required
                       value={form.horarioFin} onChange={e => setForm({...form, horarioFin: e.target.value})} />
              </div>
            </div>

            <div className="mb-4">
              <label className="small fw-bold text-secondary mb-3">DÍAS DE LA SEMANA</label>
              <div className="d-flex justify-content-between gap-2">
                <div style={dayBtnStyle(form.diasL)} onClick={() => handleCheckbox('diasL')}>L</div>
                <div style={dayBtnStyle(form.diasM)} onClick={() => handleCheckbox('diasM')}>M</div>
                <div style={dayBtnStyle(form.diasX)} onClick={() => handleCheckbox('diasX')}>X</div>
                <div style={dayBtnStyle(form.diasJ)} onClick={() => handleCheckbox('diasJ')}>J</div>
                <div style={dayBtnStyle(form.diasV)} onClick={() => handleCheckbox('diasV')}>V</div>
                <div style={dayBtnStyle(form.diasS)} onClick={() => handleCheckbox('diasS')}>S</div>
                <div style={dayBtnStyle(form.diasD)} onClick={() => handleCheckbox('diasD')}>D</div>
              </div>
            </div>

            <div className="row mb-4">
              <div className="col-md-6 mb-3 mb-md-0">
                <label className="small fw-bold text-secondary mb-2">CAPACIDAD MÁXIMA</label>
                <input type="number" className="form-control shadow-none" style={inputStyle} min="1" required
                       value={form.maximoAtletas} onChange={e => setForm({...form, maximoAtletas: e.target.value})} />
              </div>
              <div className="col-md-6">
                <label className="small fw-bold text-secondary mb-2">CIERRE INSCRIPCIÓN (MIN)</label>
                <input type="number" className="form-control shadow-none" style={inputStyle} min="0" required
                       value={form.minutosCierreInscripcion} onChange={e => setForm({...form, minutosCierreInscripcion: e.target.value})} />
                <small className="text-muted" style={{fontSize: '11px'}}>Minutos antes para cerrar reservas</small>
              </div>
            </div>

            <div className="mb-5">
              <label className="small fw-bold text-secondary mb-2">COACH ASIGNADO</label>
              <select className="form-select shadow-none" style={inputStyle} 
                      value={form.idCoach} onChange={e => setForm({...form, idCoach: e.target.value})}>
                <option value="">-- Sin Coach Asignado (Open Box) --</option>
                {coaches.map(c => (
                  <option key={c.idUsuario} value={c.idUsuario}>{c.nombre}</option>
                ))}
              </select>
            </div>

            <div className="d-grid gap-3">
              <button type="submit" className="btn btn-danger py-3 fw-bold" disabled={loading} style={{ borderRadius: '14px' }}>
                {loading ? 'Guardando...' : 'Crear Clase'}
              </button>
              <button type="button" onClick={() => navigate('/admin-box-panel')} className="btn btn-link text-secondary text-decoration-none">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}