import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import '../assets/css/Register.css';

// FASE B — Registro con Google, paso "elige tu box".
// Llega aquí un usuario NUEVO que se autenticó con Google en el login (su correo no tenía
// cuenta). El id_token viene en sessionStorage. Aquí elige a fuerzas un box; con eso el
// backend crea un preregistro "de Google" y seguimos en /completar-registro (SIN contraseña).
export default function RegistroGoogle() {
  const navigate = useNavigate();
  const [idToken] = useState(() => sessionStorage.getItem('googleRegToken') || '');
  const [boxes, setBoxes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [enviando, setEnviando] = useState(false);

  // Datos del id_token de Google, solo para saludar y prellenar el nombre después.
  const perfilGoogle = useMemo(() => {
    if (!idToken) return null;
    try {
      const p = jwtDecode(idToken);
      return { correo: p.email || '', nombre: p.given_name || p.name || '', apellidos: p.family_name || '' };
    } catch { return null; }
  }, [idToken]);

  // Sin token (refresh perdido o entrada directa) → de vuelta al login.
  useEffect(() => {
    if (!idToken) navigate('/login', { replace: true });
  }, [idToken, navigate]);

  // Cargar boxes públicos (activos) para elegir.
  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/homepublic/boxes`);
        const data = await res.json();
        if (vivo) setBoxes(Array.isArray(data) ? data : []);
      } catch { /* noop */ }
      finally { if (vivo) setCargando(false); }
    })();
    return () => { vivo = false; };
  }, []);

  const boxesFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return boxes;
    return boxes.filter(b =>
      (b.nombre || '').toLowerCase().includes(q) ||
      (b.ciudad || '').toLowerCase().includes(q)
    );
  }, [boxes, busqueda]);

  const elegirBox = async (idBox) => {
    if (enviando) return;
    setEnviando(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/usuarios/google/registrar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken, idBox })
      });
      const data = await res.json();

      if (res.ok) {
        // Dejamos el nombre/apellidos de Google para prellenar la pantalla siguiente.
        if (perfilGoogle) {
          sessionStorage.setItem('googleRegPrefill', JSON.stringify({
            nombre: perfilGoogle.nombre,
            apellidos: perfilGoogle.apellidos
          }));
        }
        sessionStorage.removeItem('googleRegToken');
        // Misma pantalla de registro que el flujo normal, pero en modo Google (sin contraseña).
        navigate(`/completar-registro?token=${encodeURIComponent(data.token)}&correo=${encodeURIComponent(data.correo)}&google=1`);
      } else if (res.status === 409 && data.yaRegistrado) {
        alert(data.mensaje || 'Ya tienes una cuenta con este correo. Entra con Google.');
        sessionStorage.removeItem('googleRegToken');
        navigate('/login');
      } else {
        alert(data.mensaje || 'No se pudo continuar. Intenta de nuevo.');
        setEnviando(false);
      }
    } catch {
      alert('Error de conexión con el servidor.');
      setEnviando(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0e0e10', color: '#fff', padding: '2rem 1rem' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%', background: 'rgba(220,53,69,0.15)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.75rem'
          }}>
            <i className="fas fa-dumbbell" style={{ color: '#dc3545', fontSize: '1.4rem' }} />
          </div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, margin: 0 }}>Elige tu box</h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', marginTop: '0.5rem' }}>
            {perfilGoogle?.correo
              ? <>Entraste con <strong>{perfilGoogle.correo}</strong>. Elige el gimnasio al que te vas a unir para continuar tu registro.</>
              : 'Elige el gimnasio al que te vas a unir para continuar tu registro.'}
          </p>
        </div>

        <div style={{ marginBottom: '1.25rem' }}>
          <input
            type="text"
            className="reg-input"
            placeholder="Busca por nombre o ciudad…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            style={{ maxWidth: 420, margin: '0 auto', display: 'block' }}
          />
        </div>

        {cargando ? (
          <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
            <i className="fas fa-spinner fa-spin me-2" /> Cargando gimnasios…
          </p>
        ) : boxesFiltrados.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
            No encontramos gimnasios{busqueda ? ' con esa búsqueda' : ''}.
          </p>
        ) : (
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem'
          }}>
            {boxesFiltrados.map((box) => (
              <div key={box.idBox} style={{
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 14, padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  {box.logo ? (
                    <img src={box.logo} alt={box.nombre} style={{ width: 44, height: 44, borderRadius: 10, objectFit: 'cover' }} />
                  ) : (
                    <div style={{
                      width: 44, height: 44, borderRadius: 10, background: 'rgba(220,53,69,0.15)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      <i className="fas fa-dumbbell" style={{ color: '#dc3545' }} />
                    </div>
                  )}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {box.nombre}
                    </div>
                    {box.ciudad && (
                      <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>
                        <i className="fas fa-location-dot me-1" />{box.ciudad}
                      </div>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-danger w-100"
                  disabled={enviando}
                  onClick={() => elegirBox(box.idBox)}
                >
                  {enviando ? <i className="fas fa-spinner fa-spin" /> : 'Unirme a este box'}
                </button>
              </div>
            ))}
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <button
            type="button"
            onClick={() => { sessionStorage.removeItem('googleRegToken'); navigate('/login'); }}
            className="btn btn-link text-white-50 text-decoration-none"
          >
            <i className="fas fa-arrow-left me-1" />Volver al login
          </button>
        </div>
      </div>
    </div>
  );
}
