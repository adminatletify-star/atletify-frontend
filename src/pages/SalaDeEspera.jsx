import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { USUARIOS_ENDPOINT } from '../services/api';
import { useAuth } from '../context/AuthContext';
import TallaPlayeraPicker from '../components/TallaPlayeraPicker';
import CategoriaBasePicker from '../components/CategoriaBasePicker';
import TipoSangrePicker from '../components/TipoSangrePicker';
import '../assets/css/SalaDeEspera.css';
import AtletifyLoader from '../components/AtletifyLoader';

export default function SalaDeEspera() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [userAuth, setUserAuth] = useState(null);
  const [usuarioDB, setUsuarioDB] = useState(null);

  const [form, setForm] = useState({
    peso: '', tallaPlayera: '', categoriaBase: '',
    tipoDeSangre: '', deporteExperiencia: '', tieneDiscapacidad: ''
  });
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem('usuario'));
    if (!u) { navigate('/login'); return; }
    if (u.rol === 'Atleta' || u.rol === 'Coach' || u.rol === 'AdminBox') { navigate('/user-panel'); return; }

    setUserAuth(u);
    fetchExpediente(u.id || u.idUsuario);
  }, [navigate]);

  async function fetchExpediente(idUsuario) {
    try {
      const res = await fetch(`${USUARIOS_ENDPOINT}/${idUsuario}`);
      if (res.ok) {
        const data = await res.json();
        setUsuarioDB(data);
        setForm({
          peso: data.peso || '', tallaPlayera: data.tallaPlayera || '',
          categoriaBase: data.categoriaBase || '', tipoDeSangre: data.tipoDeSangre || '',
          deporteExperiencia: data.deporteExperiencia || '', tieneDiscapacidad: data.tieneDiscapacidad || ''
        });
      }
    } catch (error) { console.error(error); } finally { setLoading(false); }
  }

  async function handleGuardarExpediente(e) {
    e.preventDefault();
    setGuardando(true);
    try {
      const res = await fetch(`${USUARIOS_ENDPOINT}/${userAuth.id || userAuth.idUsuario}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ ...form, peso: form.peso ? parseFloat(form.peso) : null })
      });
      if (res.ok) {
        alert("¡Expediente guardado! 🐺 La Coach ahora tiene toda tu información.");
        fetchExpediente(userAuth.id || userAuth.idUsuario);
      }
    } catch (error) { alert("Error de conexión."); } finally { setGuardando(false); }
  }

  if (loading || !usuarioDB) return <div className="sde-wrapper d-flex align-items-center justify-content-center min-vh-100"><AtletifyLoader /></div>;

  const estaBaneado = usuarioDB.estadoSolicitud === "Baneado";
  const estaRechazado = usuarioDB.estatus === "Rechazado" || usuarioDB.estadoSolicitud === "Rechazado";
  const expedienteVacio = !(usuarioDB.peso && usuarioDB.tallaPlayera && usuarioDB.categoriaBase);

  return (
    <div className="sde-wrapper">
      <div className="sde-container">
        <div className="sde-card">
          <div className="sde-back-btn"><button className="sde-btn-logout" onClick={() => { logout(); navigate('/login', { replace: true }); }}><i className="fas fa-sign-out-alt me-2"></i>Cerrar Sesión</button></div>
          <div className="sde-card-header"><i className="fas fa-paw"></i><span>WOLFPACK</span></div>

          <div className="sde-card-body">
            {estaBaneado && (
              <div className="sde-state-section sde-state-banned">
                <div className="sde-icon-wrapper sde-icon-banned"><i className="fas fa-ban"></i></div>
                <h2 className="sde-title">Cuenta Suspendida</h2>
                <p className="sde-message">{usuarioDB.motivoRechazo || "Tu cuenta ha sido bloqueada."}</p>
              </div>
            )}

            {estaRechazado && !estaBaneado && (
              <div className="sde-state-section sde-state-rejected">
                <div className="sde-icon-wrapper sde-icon-rejected"><i className="fas fa-clipboard-list"></i></div>
                <h2 className="sde-title">Corrección Requerida</h2>
                <div className="sde-feedback-box"><strong><i className="fas fa-comment-dots me-2"></i>Coach:</strong><p>"{usuarioDB.motivoRechazo}"</p></div>
              </div>
            )}

            {!estaBaneado && !estaRechazado && (
              <div className="sde-state-section sde-state-pending">
                <div className="sde-icon-wrapper sde-icon-pending"><i className="fas fa-hourglass-half"></i></div>
                <h2 className="sde-title">{usuarioDB.esMudanza ? "¡Bienvenido a la nueva App! 🐺" : "¡Casi listo, Lobo! 🐺"}</h2>
                <p className="sde-message">
                  {usuarioDB.esMudanza 
                    ? "Estamos validando tu mudanza con recepción. Mientras te activan, por favor completa tu expediente médico abajo para tener tus datos actualizados."
                    : "Tu solicitud y pago han sido recibidos. Por favor completa tu expediente médico abajo; es un requisito obligatorio para que los Coaches te den acceso."}
                </p>
              </div>
            )}

            {(!estaBaneado && expedienteVacio) || !estaBaneado ? (
              <form onSubmit={handleGuardarExpediente} className="sde-form mt-4">
                <div className="sde-form-header"><i className="fas fa-heartbeat"></i><span>Tu Expediente Médico y Deportivo</span></div>
                <div className="row g-3 g-lg-4">
                  <div className="col-12 col-sm-6 col-lg-4"><label className="sde-label">Peso (kg)</label><input type="number" step="0.1" min="1" max="999" required className="form-control sde-input" value={form.peso} onChange={e => { const v = e.target.value; if (v === '' || /^\d{0,3}(\.\d*)?$/.test(v)) setForm({...form, peso: v}); }} placeholder="70" /></div>
                  <div className="col-12 col-sm-6 col-lg-4"><label className="sde-label">Talla</label><TallaPlayeraPicker valor={form.tallaPlayera} onCambiar={v => setForm({...form, tallaPlayera: v})} /></div>
                  <div className="col-12 col-sm-6 col-lg-4"><label className="sde-label">Nivel de CrossFit</label><CategoriaBasePicker valor={form.categoriaBase} onCambiar={v => setForm({...form, categoriaBase: v})} /></div>
                  <div className="col-12 col-sm-6 col-lg-6"><label className="sde-label">Tipo de Sangre</label><TipoSangrePicker valor={form.tipoDeSangre} onCambiar={v => setForm({...form, tipoDeSangre: v})} /></div>
                  <div className="col-12 col-sm-6 col-lg-6"><label className="sde-label d-flex justify-content-between"><span>Deportes Previos (Opcional)</span><span style={{fontSize:'0.72rem',color: form.deporteExperiencia.length >= 130 ? '#f59e0b' : 'rgba(255,255,255,0.35)'}}>{form.deporteExperiencia.length}/150</span></label><input type="text" maxLength={150} className="form-control sde-input" value={form.deporteExperiencia} onChange={e => setForm({...form, deporteExperiencia: e.target.value})} placeholder="Ej. Fútbol, natación..." /></div>
                  <div className="col-12"><label className="sde-label sde-label-warning d-flex justify-content-between"><span><i className="fas fa-exclamation-triangle me-2"></i>Lesiones o Condiciones Médicas</span><span style={{fontSize:'0.72rem',color: form.tieneDiscapacidad.length >= 260 ? '#f59e0b' : 'rgba(255,255,255,0.35)'}}>{form.tieneDiscapacidad.length}/300</span></label><textarea maxLength={300} className="form-control sde-input sde-textarea" value={form.tieneDiscapacidad} onChange={e => setForm({...form, tieneDiscapacidad: e.target.value})} rows="2" placeholder="Ej. Lesión de rodilla 2022, sin condiciones actuales..." /></div>
                </div>
                <button type="submit" disabled={guardando} className="sde-btn-submit w-100 mt-4">{guardando ? 'Guardando...' : 'GUARDAR EXPEDIENTE'}</button>
              </form>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}