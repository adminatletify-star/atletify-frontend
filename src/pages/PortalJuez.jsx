import { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { COMPETENCIAS_ENDPOINT, HEATS_COMP_ENDPOINT } from '../services/api';
import BackButton from '../components/BackButton';
import '../assets/css/PortalJuez.css';
import AtletifyLoader from '../components/AtletifyLoader';
import ModalCapturaScore from '../components/ModalCapturaScore';
import { useCompetenciaLive } from '../hooks/useCompetenciaLive';

// Portal del JUEZ — rediseñado a AGENDA: el juez ya NO elige WOD/categoría a mano. Ve solo los carriles
// que tiene asignados (heat, hora, WOD, categoría, equipo) y califica únicamente a quien le toca. Si los
// heats no están generados/asignados, su agenda viene vacía y no puede calificar nada (gate del backend).
export default function PortalJuez() {
  const { id } = useParams(); // ID de la competencia
  const navigate = useNavigate();

  const [juezUser, setJuezUser] = useState(null);
  const [comp, setComp] = useState(null);
  const [loading, setLoading] = useState(true);

  const [agenda, setAgenda] = useState([]);
  const [cargandoAgenda, setCargandoAgenda] = useState(false);
  const [errorAgenda, setErrorAgenda] = useState('');
  const [refrescar, setRefrescar] = useState(0);
  const [captura, setCaptura] = useState(null); // { idWod, equipo:{idEquipoComp,nombre} }

  // 1) Sesión del juez (token nuevo JuezComp, o fallback legacy Usuario rol=Juez).
  useEffect(() => {
    const sesion = localStorage.getItem('juezSesion');
    if (sesion) {
      try {
        const s = JSON.parse(sesion);
        if (String(s.idCompetencia) === String(id) && s.token) {
          setJuezUser({ rol: 'Juez', nombre: s.nombre, id: s.idJuezComp, idCompetenciaAsignada: s.idCompetencia, token: s.token });
          return;
        }
      } catch { /* sesión corrupta */ }
    }
    const stored = localStorage.getItem('usuario');
    if (stored) {
      try {
        const userObj = JSON.parse(stored);
        if (userObj.rol === 'Juez' && String(userObj.idCompetenciaAsignada) === String(id)) setJuezUser(userObj);
      } catch { /* sesión corrupta */ }
    }
  }, [id]);

  // 2) Datos de la competencia (nombre / existencia).
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${COMPETENCIAS_ENDPOINT}/${id}`);
        setComp(r.ok ? await r.json() : null);
      } catch { setComp(null); }
      finally { setLoading(false); }
    })();
  }, [id]);

  // 3) Agenda del juez (solo con token nuevo). Se refresca al guardar y en vivo (SignalR).
  const token = juezUser?.token;
  useEffect(() => {
    if (!token) return;
    let activo = true;
    (async () => {
      setCargandoAgenda(true); setErrorAgenda('');
      try {
        const r = await fetch(`${HEATS_COMP_ENDPOINT}/${id}/mi-agenda`, { headers: { 'X-Juez-Token': token } });
        const d = await r.json().catch(() => ({}));
        if (!activo) return;
        if (r.ok) setAgenda(d.agenda || []);
        else setErrorAgenda(d.mensaje || 'No se pudo cargar tu agenda.');
      } catch { if (activo) setErrorAgenda('Error de conexión.'); }
      finally { if (activo) setCargandoAgenda(false); }
    })();
    return () => { activo = false; };
  }, [id, token, refrescar]);

  useCompetenciaLive(id, { onScore: () => setRefrescar(r => r + 1), onHeat: () => setRefrescar(r => r + 1) });

  const handleJuezLogout = () => {
    localStorage.removeItem('juezSesion');
    localStorage.removeItem('usuario');
    localStorage.removeItem('token');
    setJuezUser(null);
    navigate('/juez/acceso');
  };

  // Agrupar la agenda por heat (cada heat tiene su hora y varios carriles/equipos).
  const heats = useMemo(() => {
    const m = new Map();
    for (const a of agenda) {
      if (!m.has(a.idHeat)) m.set(a.idHeat, { idHeat: a.idHeat, numeroHeat: a.numeroHeat, horaInicio: a.horaInicio, estadoHeat: a.estadoHeat, wod: a.wod, idWodComp: a.idWodComp, tipoScore: a.tipoScore, unidadPeso: a.unidadPeso, categoria: a.categoria, carriles: [] });
      m.get(a.idHeat).carriles.push(a);
    }
    return Array.from(m.values());
  }, [agenda]);

  // Reloj-de-pared: si la fecha viene SIN zona, la tratamos como UTC para mostrar la hora tal cual se capturó.
  const aUTC = (s) => (/[zZ]$|[+-]\d{2}:?\d{2}$/.test(s) ? s : s + 'Z');
  const fmtHora = (iso) => { if (!iso) return 'Sin horario asignado'; try { return new Date(aUTC(iso)).toLocaleString('es-MX', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }); } catch { return ''; } };
  const estadoBadge = (e) => e === 'EnCurso' ? { t: 'EN CURSO', c: '#15a34a' } : e === 'Finalizado' ? { t: 'FINALIZADO', c: '#6b7280' } : { t: 'PROGRAMADO', c: '#3b82f6' };
  const scoreBadge = (s) => s === 'Aprobado' ? { t: 'Aprobado', c: '#15a34a' } : s === 'Pendiente' ? { t: 'Enviado · en revisión', c: '#f5b942' } : { t: 'Pendiente de calificar', c: '#e63946' };

  if (loading) return <div className="jz-spinner-wrapper"><AtletifyLoader /></div>;

  if (!comp) return (
    <div className="jz-root">
      <header className="jz-header"><div className="jz-header-content">
        <div className="d-flex align-items-center gap-2"><BackButton to={`/competencias`} /><h2 className="jz-header-title"><i className="fas fa-clipboard-check"></i>Portal de Jueceo</h2></div>
      </div></header>
      <div className="jz-login-wrapper"><div className="jz-login-card">
        <i className="fas fa-exclamation-triangle" style={{ fontSize: '3rem', color: 'var(--primary)', marginBottom: '1rem' }}></i>
        <h2 style={{ color: '#fff', marginBottom: '0.5rem' }}>Competencia no encontrada</h2>
        <p style={{ color: 'var(--secondary)' }}>La competencia que buscas no existe o ya fue archivada.</p>
        <Link to="/competencias" className="jz-login-btn text-decoration-none mt-3"><i className="fas fa-arrow-left"></i>Ver Competencias</Link>
      </div></div>
    </div>
  );

  // Sin sesión de juez → acceso.
  if (!juezUser) return (
    <div className="jz-root">
      <div className="jz-login-wrapper"><div className="jz-login-card">
        <i className="fas fa-lock" style={{ fontSize: '3rem', color: 'var(--primary)', marginBottom: '1rem' }}></i>
        <h2 style={{ color: '#fff', marginBottom: '0.5rem' }}>Acceso de juez</h2>
        <p style={{ color: 'var(--secondary)' }}>Entra con tu enlace o PIN para ver tu agenda de jueceo.</p>
        <div className="d-flex flex-column gap-3 mt-4">
          <Link to="/juez/acceso" className="jz-login-btn text-decoration-none"><i className="fas fa-sign-in-alt"></i>Ir al acceso de juez</Link>
          <Link to={`/competencias`} className="jz-login-back-link justify-content-center"><i className="fas fa-arrow-left"></i>Ver Portal Público</Link>
        </div>
      </div></div>
    </div>
  );

  return (
    <div className="jz-root">
      <header className="jz-header">
        <div className="jz-header-content">
          <div className="d-flex align-items-center gap-2">
            <BackButton to={`/portal-competencias/${id}`} />
            <h2 className="jz-header-title"><i className="fas fa-clipboard-check"></i>Portal de Jueceo</h2>
          </div>
          <div className="d-flex align-items-center gap-3">
            <div className="jz-user-badge"><i className="fas fa-user-shield"></i><span>{juezUser.nombre || juezUser.username}</span><span className="jz-user-role-tag">Juez</span></div>
            <button className="jz-logout-btn" onClick={handleJuezLogout} title="Cerrar sesión"><i className="fas fa-sign-out-alt"></i></button>
          </div>
        </div>
        <div className="jz-header-comp">{comp.nombre}</div>
      </header>

      <div className="container-fluid px-3 px-md-4 px-lg-5">
        <div className="mb-4 d-flex justify-content-between align-items-end flex-wrap gap-2">
          <div>
            <h1 className="jz-page-title">MI <span>AGENDA</span></h1>
            <div className="jz-accent-line"></div>
            <p className="jz-subtitle">Estos son los carriles que te tocan. Solo puedes calificar a tus equipos asignados.</p>
          </div>
          <button className="jz-logout-btn" style={{ width: 'auto', padding: '8px 14px', borderRadius: '10px' }} onClick={() => setRefrescar(r => r + 1)} title="Actualizar agenda">
            <i className="fas fa-sync-alt"></i> Actualizar
          </button>
        </div>

        {!token ? (
          <div className="jz-empty-alert">
            Tu acceso de juez no usa el nuevo sistema de agenda. Vuelve a entrar con tu <Link to="/juez/acceso">enlace o PIN</Link> para ver a quién y cuándo te toca calificar.
          </div>
        ) : cargandoAgenda ? (
          <div className="jz-empty-state"><AtletifyLoader /></div>
        ) : errorAgenda ? (
          <div className="jz-empty-alert"><i className="fas fa-triangle-exclamation me-2"></i>{errorAgenda}</div>
        ) : heats.length === 0 ? (
          <div className="jz-empty-state">
            <i className="fas fa-calendar-day"></i>
            <p>Aún no tienes carriles asignados.</p>
            <p style={{ fontSize: '0.85rem', opacity: 0.8 }}>Cuando el organizador genere los heats y te asigne, aquí verás tu horario, qué equipos juzgas y en qué carril.</p>
          </div>
        ) : (
          <div className="d-flex flex-column gap-4">
            {heats.map(h => {
              const eb = estadoBadge(h.estadoHeat);
              return (
                <div key={h.idHeat} className="jz-team-card" style={{ padding: 0, overflow: 'hidden' }}>
                  <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                        <i className="fas fa-dumbbell me-2" style={{ color: 'var(--primary)' }}></i>{h.wod || 'WOD'} · Heat {h.numeroHeat}
                      </div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        <i className="fas fa-clock me-1"></i>{fmtHora(h.horaInicio)} · <i className="fas fa-layer-group me-1"></i>{h.categoria}
                      </div>
                    </div>
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '.04em', color: eb.c, border: `1px solid ${eb.c}`, borderRadius: '999px', padding: '3px 10px' }}>{eb.t}</span>
                  </div>
                  <div className="d-flex flex-column" style={{ padding: '8px 10px' }}>
                    {h.carriles.map(c => {
                      const sb = scoreBadge(c.estatusScore);
                      return (
                        <div key={c.idEquipoComp} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', padding: '10px 8px', borderBottom: '1px dashed var(--border)' }}>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                              <span style={{ color: 'var(--text-muted)', fontWeight: 600, marginRight: '8px' }}>C{c.numeroCarril}</span>
                              {c.equipo}
                            </div>
                            <div style={{ fontSize: '0.76rem', color: sb.c, marginTop: '2px' }}><i className="fas fa-circle me-1" style={{ fontSize: '0.5rem', verticalAlign: 'middle' }}></i>{sb.t}</div>
                          </div>
                          <button className="jz-btn-submit" style={{ whiteSpace: 'nowrap' }} onClick={() => setCaptura({ idWod: h.idWodComp, equipo: { idEquipoComp: c.idEquipoComp, nombre: c.equipo } })}>
                            <i className="fas fa-clipboard-check"></i> {c.estatusScore ? 'Editar' : 'Calificar'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {captura && (
        <ModalCapturaScore
          idWod={captura.idWod}
          equipo={captura.equipo}
          nombreJuez={juezUser.nombre || ''}
          juezToken={token}
          onCerrar={() => setCaptura(null)}
          onGuardado={() => { setCaptura(null); setRefrescar(r => r + 1); }}
        />
      )}
    </div>
  );
}
