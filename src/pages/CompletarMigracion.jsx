import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Onboarding PASSWORDLESS de atletas migrados: "confirma tus datos y entra".
// Lee correo+token del enlace mágico, muestra los datos precargados y activa la cuenta.
export default function CompletarMigracion() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const correo = searchParams.get('correo');
  const API_URL = `${import.meta.env.VITE_API_URL}/api`;

  const [estado, setEstado] = useState('cargando'); // cargando|valido|usado|expirado|invalido|error
  const [data, setData] = useState(null);
  const [mensaje, setMensaje] = useState('');

  const [quiereContrasena, setQuiereContrasena] = useState(false);
  const [contrasena, setContrasena] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [username, setUsername] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token || !correo) { setEstado('invalido'); setMensaje('El enlace está incompleto.'); return; }
    (async () => {
      try {
        const res = await fetch(`${API_URL}/usuarios/migracion-preview?correo=${encodeURIComponent(correo)}&token=${encodeURIComponent(token)}`);
        const d = await res.json();
        if (d.estado === 'Valido') { setData(d); setEstado('valido'); }
        else { setEstado((d.estado || 'invalido').toLowerCase()); setMensaje(d.mensaje || 'Enlace no válido.'); }
      } catch {
        setEstado('error'); setMensaje('No pudimos validar tu enlace. Intenta de nuevo más tarde.');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const validarPass = (c) =>
    c.length >= 8 && /[A-Z]/.test(c) && /[a-z]/.test(c) && /[0-9]/.test(c) && /[*!@#$%&/_]/.test(c);

  const fmtFecha = (iso) => {
    if (!iso) return '—';
    try { return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' }); }
    catch { return iso; }
  };
  const fmtDinero = (n) => (n == null ? '—' : `$${Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);

  const vencido = data?.fechaVencimiento ? new Date(data.fechaVencimiento) < new Date() : false;

  const handleSubmit = async () => {
    setError('');
    if (quiereContrasena) {
      if (!validarPass(contrasena)) {
        setError('La contraseña debe tener 8+ caracteres, mayúscula, minúscula, número y símbolo (*!@#$%&/_).');
        return;
      }
      if (contrasena !== confirmar) { setError('Las contraseñas no coinciden.'); return; }
    }
    setEnviando(true);
    try {
      const res = await fetch(`${API_URL}/usuarios/completar-migracion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          correo, token,
          contrasena: quiereContrasena ? contrasena : null,
          username: username.trim() || null
        })
      });
      const d = await res.json();
      if (!res.ok) { setError(d.mensaje || 'No se pudo activar la cuenta.'); setEnviando(false); return; }
      login(d.usuario, d.token);
      navigate('/user-panel');
    } catch {
      setError('Error de red. Intenta de nuevo.'); setEnviando(false);
    }
  };

  // ── estilos self-contained (paleta ámbar/slate) ──
  const S = {
    wrap: { minHeight: '100vh', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: "'Helvetica Neue',Arial,sans-serif" },
    card: { width: '100%', maxWidth: 520, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden', boxShadow: '0 10px 30px rgba(15,23,42,.06)' },
    top: { height: 4, background: '#f59e0b' },
    pad: { padding: '26px 30px' },
    kicker: { margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: 2, color: '#b45309', textTransform: 'uppercase' },
    h1: { margin: '6px 0 4px', fontSize: 22, fontWeight: 600, color: '#0f172a' },
    sub: { margin: 0, fontSize: 14, color: '#475569' },
    row: { display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f1f5f9', fontSize: 14 },
    lbl: { color: '#64748b' },
    val: { color: '#0f172a', fontWeight: 600, textAlign: 'right' },
    btn: { width: '100%', padding: '13px', background: '#f59e0b', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, fontSize: 15, cursor: 'pointer', marginTop: 18 },
    btnGhost: { background: 'transparent', color: '#b45309', border: '1px dashed #fcd34d', padding: '10px', borderRadius: 6, width: '100%', cursor: 'pointer', fontWeight: 600, fontSize: 13 },
    input: { width: '100%', padding: '11px 12px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 14, marginTop: 8, boxSizing: 'border-box' },
    banner: (bg, bd, fg) => ({ background: bg, border: `1px solid ${bd}`, color: fg, padding: '12px 14px', borderRadius: 8, fontSize: 13, margin: '14px 0' }),
    err: { background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '10px 12px', borderRadius: 8, fontSize: 13, marginTop: 12 },
  };

  const Estado = ({ icon, titulo, texto }) => (
    <div style={S.wrap}><div style={S.card}><div style={S.top} /><div style={{ ...S.pad, textAlign: 'center' }}>
      <div style={{ fontSize: 40 }}>{icon}</div>
      <h1 style={S.h1}>{titulo}</h1>
      <p style={S.sub}>{texto}</p>
      <button style={S.btn} onClick={() => navigate('/login')}>Ir a iniciar sesión</button>
    </div></div></div>
  );

  if (estado === 'cargando')
    return <div style={S.wrap}><div style={S.card}><div style={S.top} /><div style={{ ...S.pad, textAlign: 'center' }}><p style={S.sub}>Validando tu enlace…</p></div></div></div>;
  if (estado === 'usado') return <Estado icon="✅" titulo="Tu cuenta ya está activa" texto={mensaje || 'Puedes iniciar sesión normalmente.'} />;
  if (estado === 'expirado') return <Estado icon="⌛" titulo="El enlace expiró" texto={mensaje || 'Pide uno nuevo en la recepción de tu box.'} />;
  if (estado === 'invalido' || estado === 'error') return <Estado icon="⚠️" titulo="Enlace no válido" texto={mensaje || 'Revisa que hayas abierto el enlace más reciente de tu correo.'} />;

  // estado === 'valido'
  return (
    <div style={S.wrap}>
      <div style={S.card}>
        <div style={S.top} />
        <div style={S.pad}>
          <p style={S.kicker}>{data.nombreBox || 'Tu box'} · Bienvenido a Atletify</p>
          <h1 style={S.h1}>Hola {data.nombre || 'atleta'}, confirma tus datos</h1>
          <p style={S.sub}>Tu box migró tu membresía. Revisa que todo esté bien y entra a tu panel.</p>

          {vencido && (
            <div style={S.banner('#fffbeb', '#fde68a', '#92400e')}>
              Tu plan aparece <strong>vencido</strong> (según tu fecha de corte). Podrás entrar, pero deberás regularizar tu pago para seguir entrenando.
            </div>
          )}

          <div style={{ marginTop: 16 }}>
            <div style={S.row}><span style={S.lbl}>Nombre</span><span style={S.val}>{[data.nombre, data.apellidos].filter(Boolean).join(' ') || '—'}</span></div>
            <div style={S.row}><span style={S.lbl}>Correo</span><span style={S.val}>{data.correo}</span></div>
            <div style={S.row}><span style={S.lbl}>Plan</span><span style={S.val}>{data.planActual || '—'}</span></div>
            <div style={S.row}><span style={S.lbl}>Precio</span><span style={S.val}>{fmtDinero(data.precioPaga)}{data.motivoPrecioEspecial ? ' (preferencial)' : ''}</span></div>
            <div style={S.row}><span style={S.lbl}>Fecha de corte</span><span style={S.val}>{fmtFecha(data.fechaVencimiento)}</span></div>
            {data.grupoFamiliar && <div style={S.row}><span style={S.lbl}>Grupo familiar</span><span style={S.val}>{data.grupoFamiliar}</span></div>}
          </div>

          <div style={{ marginTop: 18 }}>
            {!quiereContrasena ? (
              <button style={S.btnGhost} onClick={() => setQuiereContrasena(true)}>
                + Crear una contraseña (opcional)
              </button>
            ) : (
              <div style={{ padding: '4px 2px' }}>
                <input style={S.input} type="text" placeholder="Nombre de usuario (opcional)" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
                <input style={S.input} type="password" placeholder="Contraseña" value={contrasena} onChange={(e) => setContrasena(e.target.value)} autoComplete="new-password" />
                <input style={S.input} type="password" placeholder="Confirmar contraseña" value={confirmar} onChange={(e) => setConfirmar(e.target.value)} autoComplete="new-password" />
                <p style={{ fontSize: 11.5, color: '#94a3b8', margin: '8px 2px 0' }}>Mínimo 8 caracteres, con mayúscula, minúscula, número y símbolo. Si no la creas ahora, entras con tu enlace y podrás fijarla después.</p>
                <button style={{ ...S.btnGhost, marginTop: 8 }} onClick={() => { setQuiereContrasena(false); setContrasena(''); setConfirmar(''); }}>Prefiero entrar sin contraseña</button>
              </div>
            )}
          </div>

          {error && <div style={S.err}>{error}</div>}

          <button style={{ ...S.btn, opacity: enviando ? 0.6 : 1 }} disabled={enviando} onClick={handleSubmit}>
            {enviando ? 'Activando…' : 'Confirmar y entrar'}
          </button>
          <p style={{ fontSize: 11.5, color: '#94a3b8', textAlign: 'center', marginTop: 12 }}>
            ¿Algún dato no cuadra? Acércate a recepción de {data.nombreBox || 'tu box'}.
          </p>
        </div>
      </div>
    </div>
  );
}
