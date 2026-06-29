import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Rediseño Developer (D4): dropdown del AVATAR con el switcher de cuentas + Mi Perfil + Cerrar
// sesión. Reemplaza al switcher que vivía DENTRO del menú de navegación (hamburguesa). Es un
// portal independiente de la animación GSAP del CardNav, así que es seguro.
const COLORS = [
  ['#6C63FF', '#8B5CF6'], ['#dc3545', '#ff6b6b'], ['#0ea5e9', '#38bdf8'], ['#10b981', '#34d399'],
  ['#f59e0b', '#fbbf24'], ['#ec4899', '#f472b6'], ['#14b8a6', '#2dd4bf'], ['#8b5cf6', '#a78bfa'],
];
const colorDe = (name = '') => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return COLORS[Math.abs(hash) % COLORS.length];
};
const getId = (u) => u?.idUsuario || u?.IdUsuario || u?.id || u?.Id;
const homeDeRol = (rol, idCompe) => {
  if (rol === 'Developer') return '/dashboard';
  if (rol === 'AdminBox' || rol === 'Coach') return '/admin-box-panel';
  if (rol === 'Atleta') return '/user-panel';
  if (rol === 'Usuario') return '/sala-espera';
  if (rol === 'Juez' && idCompe) return `/juez/${idCompe}`;
  return '/user-panel';
};

export default function AccountMenu({ open, onClose, onLogout }) {
  const { usuario, cuentasGuardadas, prepararCambioCuenta } = useAuth();
  if (!open || !usuario) return null;

  const currentId = getId(usuario);
  const miPerfil = (usuario.rol === 'Atleta' || usuario.rol === 'Usuario') ? '/mi-perfil' : '/perfil-admin';

  const cambiar = (c) => {
    if (getId(c.usuario) === currentId) return;
    const ok = prepararCambioCuenta(c);
    if (!ok) return;
    const route = homeDeRol(c.usuario?.rol, c.usuario?.idCompetenciaAsignada);
    if (window.location.pathname === route) window.location.reload();
    else window.location.href = route;
  };

  const [cA] = colorDe(usuario.nombre || '');
  const itemStyle = {
    display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 9,
    color: '#fff', textDecoration: 'none', background: 'rgba(255,255,255,0.04)', border: 'none',
    width: '100%', cursor: 'pointer', fontSize: 14, fontWeight: 600, textAlign: 'left',
  };

  return createPortal(
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 10040 }} />
      <div
        role="menu"
        style={{
          position: 'fixed', top: 64, right: 12, zIndex: 10041, width: 290, maxWidth: 'calc(100vw - 24px)',
          background: '#14141A', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 14,
          boxShadow: '0 14px 44px rgba(0,0,0,0.55)', padding: 12, color: '#fff',
        }}
      >
        {/* Cuenta activa */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '2px 4px 10px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, border: `2px solid ${cA}` }}>
            {usuario.foto
              ? <img src={usuario.foto} alt={usuario.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: cA, color: '#fff', fontWeight: 800 }}>{(usuario.nombre || 'U').charAt(0).toUpperCase()}</div>}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{usuario.nombre || 'Mi cuenta'}</div>
            <div style={{ fontSize: 11, opacity: 0.55 }}>{usuario.rol}</div>
          </div>
        </div>

        {/* Switcher de cuentas guardadas */}
        {cuentasGuardadas && cuentasGuardadas.length > 0 && (
          <div style={{ padding: '10px 4px 4px' }}>
            <p style={{ fontSize: 10, opacity: 0.4, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 8px' }}>Cambiar de cuenta</p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {cuentasGuardadas.map((c, i) => {
                const cId = getId(c.usuario);
                const activa = String(cId) === String(currentId);
                const foto = c.usuario?.fotoPerfilUrl || c.usuario?.foto;
                const [colA, colB] = colorDe(c.usuario?.nombre || '');
                return (
                  <button
                    key={cId || i}
                    type="button"
                    onClick={() => cambiar(c)}
                    title={`${c.usuario?.nombre || 'Usuario'} (${c.usuario?.rol})${activa ? ' — activa' : ''}`}
                    style={{ background: 'none', border: 'none', padding: 0, cursor: activa ? 'default' : 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, width: 50, opacity: activa ? 1 : 0.7 }}
                  >
                    <div style={{ width: 38, height: 38, borderRadius: '50%', overflow: 'hidden', border: activa ? `2.5px solid ${colA}` : '2.5px solid rgba(255,255,255,0.12)' }}>
                      {foto
                        ? <img src={foto} alt={c.usuario?.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `linear-gradient(135deg, ${colA}, ${colB})`, color: '#fff', fontWeight: 800 }}>{c.usuario?.nombre?.charAt(0)?.toUpperCase() || '?'}</div>}
                    </div>
                    <span style={{ fontSize: '0.55rem', maxWidth: 50, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: activa ? '#fff' : 'rgba(255,255,255,0.5)' }}>{c.usuario?.nombre || 'Usuario'}</span>
                  </button>
                );
              })}
              {cuentasGuardadas.length < 5 && (
                <Link to="/login?addAccount=true" onClick={onClose} title="Añadir cuenta" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, width: 50, textDecoration: 'none' }}>
                  <div style={{ width: 38, height: 38, borderRadius: '50%', border: '2px dashed rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#777' }}>
                    <i className="fas fa-plus" />
                  </div>
                  <span style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.35)' }}>Añadir</span>
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Acciones */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
          <Link to={miPerfil} onClick={onClose} style={itemStyle} role="menuitem">
            <i className="fas fa-user" style={{ opacity: 0.7 }} /> Mi Perfil
          </Link>
          <button type="button" onClick={() => { onClose(); onLogout?.(); }} style={{ ...itemStyle, background: 'rgba(220,53,69,0.12)', color: '#ff8088' }} role="menuitem">
            <i className="fas fa-sign-out-alt" style={{ opacity: 0.8 }} /> Cerrar sesión
          </button>
        </div>
      </div>
    </>,
    document.body
  );
}
