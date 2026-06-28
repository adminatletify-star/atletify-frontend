import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { JUECES_COMP_ENDPOINT } from '../services/api';
import AtletifyLoader from '../components/AtletifyLoader';
import '../assets/css/AccesoJuez.css';

// Acceso del juez por magic-link (?token=) o por correo + PIN. NO usa el login principal:
// guarda una sesión propia 'juezSesion' para no chocar con el auth de atletas/admins.
export default function AccesoJuez() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get('token');

  const [estado, setEstado] = useState(token ? 'validando' : 'form'); // validando | form | error
  const [error, setError] = useState('');
  const [correo, setCorreo] = useState('');
  const [pin, setPin] = useState('');
  const [enviando, setEnviando] = useState(false);

  const entrar = async (body) => {
    try {
      const res = await fetch(`${JUECES_COMP_ENDPOINT}/acceso`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.idCompetencia) {
        localStorage.setItem('juezSesion', JSON.stringify(data));
        navigate(`/juez/${data.idCompetencia}`, { replace: true });
        return true;
      }
      setError(data.mensaje || 'No pudimos validar tu acceso.');
      return false;
    } catch {
      setError('Error de conexión.');
      return false;
    }
  };

  useEffect(() => {
    if (!token) return;
    (async () => {
      const ok = await entrar({ token });
      if (!ok) setEstado('error');
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const submitPin = async (e) => {
    e.preventDefault();
    setError('');
    setEnviando(true);
    await entrar({ correo: correo.trim(), pin: pin.trim() });
    setEnviando(false);
  };

  if (estado === 'validando') {
    return <div style={{ minHeight: '60vh', display: 'grid', placeItems: 'center' }}><AtletifyLoader /></div>;
  }

  return (
    <div className="aj-wrap">
      <div className="aj-card">
        <i className="fas fa-user-shield aj-icon"></i>
        <h2 className="aj-title">Acceso de Juez</h2>
        <p className="aj-sub">Entra con tu correo y PIN, o abre el enlace que te enviamos por correo.</p>
        {error && <div className="aj-error"><i className="fas fa-exclamation-triangle"></i> {error}</div>}
        <form onSubmit={submitPin} className="aj-form">
          <input className="aj-input" type="email" placeholder="Tu correo" value={correo} onChange={e => setCorreo(e.target.value)} required />
          <input className="aj-input" inputMode="numeric" placeholder="PIN" value={pin} onChange={e => setPin(e.target.value)} required />
          <button className="aj-btn" type="submit" disabled={enviando}>{enviando ? 'Entrando...' : 'Entrar a juzgar'}</button>
        </form>
        <Link to="/competencias" className="aj-link">Volver a competencias</Link>
      </div>
    </div>
  );
}
