import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import BackButton from '../components/BackButton';
import BotonSeguro from '../components/BotonSeguro';
import '../assets/css/Register.css';

export function Register() {
  const { idBox } = useParams();
  const API_URL = `${import.meta.env.VITE_API_URL}/api`;
  
  const [correo, setCorreo] = useState('');
  const [boxSeleccionado, setBoxSeleccionado] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [enviado, setEnviado] = useState(false);

  useEffect(() => {
    if (!idBox) return;
    fetch(`${API_URL}/box/${idBox}`)
      .then(res => res.ok ? res.json() : null)
      .then(setBoxSeleccionado)
      .catch(() => showAlert("Error al cargar el Box"));
  }, [idBox]);

  const showAlert = (mensaje, tipo = 'danger') => {
    const alerta = { id: Date.now(), mensaje, tipo };
    setAlerts(prev => [...prev, alerta]);
    setTimeout(() => setAlerts(prev => prev.filter(a => a.id !== alerta.id)), 5000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!correo) return showAlert('Ingresa tu correo electrónico.');

    try {
      const response = await fetch(`${API_URL}/usuarios/iniciar-registro`, {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo, idBox: parseInt(idBox) })
      });

      const data = await response.json();
      if (response.ok) {
        setEnviado(true);
      } else {
        showAlert(data.mensaje || 'Error al procesar la solicitud.');
      }
    } catch (e) { 
        showAlert('Error de conexión.'); 
    }
  };

  if (!idBox) return (
    <div className="reg-root d-flex justify-content-center align-items-center">
      <div className="reg-card text-center"><h3 className="text-danger fw-bold">⚠️ Enlace Privado</h3><p>Para registrarte, pídele a tu Box su enlace de invitación.</p><Link to="/login" className="reg-btn-submit text-decoration-none">Ir al Login</Link></div>
    </div>
  );

  return (
    <div className="reg-root d-flex justify-content-center align-items-center min-vh-100">
      <div className="container" style={{maxWidth: '500px'}}>
        <div className="reg-alerts">{alerts.map(a => <div key={a.id} className={`reg-alert reg-alert-${a.tipo}`}>{a.mensaje}</div>)}</div>

        {enviado ? (
           <div className="reg-card text-center p-5 slide-in">
             <i className="fas fa-envelope-open-text fa-4x text-success mb-4"></i>
             <h3 className="text-white fw-bold">¡Revisa tu correo!</h3>
             <p className="text-white-50">Te hemos enviado un enlace mágico a <strong>{correo}</strong> para continuar con tu registro.</p>
             <p className="small text-muted mt-4">Puede tardar un par de minutos. Revisa tu carpeta de Spam.</p>
             <Link to="/login" className="btn btn-outline-light rounded-pill px-4 mt-3">Volver al inicio</Link>
           </div>
        ) : (
          <div className="reg-card p-4 p-md-5 slide-in">
            <div className="text-center mb-4">
              <div className="reg-icon-circle mx-auto mb-3" style={{width: '60px', height: '60px'}}><i className="fas fa-paw fa-2x"></i></div>
              <h2 className="text-white fw-bold">Únete a {boxSeleccionado?.nombre || 'The Wolfpack'}</h2>
              <p className="text-white-50">Ingresa tu correo para comenzar</p>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="reg-label">Correo Electrónico</label>
                <div className="position-relative">
                  <i className="fas fa-envelope position-absolute top-50 start-0 translate-middle-y ms-3 text-white-50"></i>
                  <input 
                    type="email" 
                    className="reg-input ps-5" 
                    value={correo} 
                    onChange={e => setCorreo(e.target.value)} 
                    placeholder="tucorreo@ejemplo.com"
                    required 
                  />
                </div>
              </div>
              <BotonSeguro type="submit" className="reg-btn-submit w-100" textoProcesando={<><i className="fas fa-spinner fa-spin"></i> Enviando...</>}>
                Continuar <i className="fas fa-arrow-right ms-2"></i>
              </BotonSeguro>
            </form>
            <div className="text-center mt-4">
              <Link to="/login" className="text-muted text-decoration-none small"><i className="fas fa-arrow-left me-1"></i> Volver al Login</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}