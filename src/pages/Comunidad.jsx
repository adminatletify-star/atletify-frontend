import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BackButton from '../components/BackButton';
import WolfLanyard from '../components/ReactBits/WolfLanyard';
import '../assets/css/Comunidad.css';

const API_BASE = import.meta.env.VITE_API_URL;;

// Aplica la reacción en local con la MISMA semántica que el backend (upsert por usuario):
// re-tocar el mismo emoji no cambia nada; cambiar de emoji mantiene el total; reacción nueva suma 1.
function aplicarReaccionLocal(resumen, idMarca, emoji) {
  const cur = resumen[idMarca] || { idMarca, total: 0, conteos: [], miEmoji: null };
  const conteos = (cur.conteos || []).map(c => ({ ...c }));
  let total = cur.total || 0;
  const prevEmoji = cur.miEmoji || null;
  const bump = (em, delta) => {
    const i = conteos.findIndex(c => c.emoji === em);
    if (i >= 0) { conteos[i].count += delta; if (conteos[i].count <= 0) conteos.splice(i, 1); }
    else if (delta > 0) conteos.push({ emoji: em, count: 1 });
  };
  if (prevEmoji === emoji) {
    // mismo emoji: el backend no agrega ni quita -> no tocar
  } else if (prevEmoji) {
    bump(prevEmoji, -1); bump(emoji, +1); // cambio de emoji -> total igual
  } else {
    bump(emoji, +1); total += 1; // reacción nueva
  }
  return { ...resumen, [idMarca]: { idMarca, total, conteos, miEmoji: emoji } };
}

export default function Comunidad() {
  const navigate = useNavigate();
  const [comunidad, setComunidad] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('');

  const [loboSeleccionado, setLoboSeleccionado] = useState(null);

  // 👇 NUEVO: Estados para los PRs del lobo que estamos viendo
  const [marcasLobo, setMarcasLobo] = useState([]);
  const [cargandoMarcas, setCargandoMarcas] = useState(false);

  // Like al perfil del atleta abierto + resumen de reacciones por PR (🔥×3)
  const [perfilLikes, setPerfilLikes] = useState({ totalLikes: 0, yaLeDiLike: false });
  const [reaccionesResumen, setReaccionesResumen] = useState({}); // idMarca -> { total, conteos:[{emoji,count}] }
  // Estado de amistad con el atleta abierto: 'ninguna' | 'Pendiente' | 'Aceptada' | 'Rechazada'
  const [estadoAmistad, setEstadoAmistad] = useState('ninguna');

  const userLocal = JSON.parse(localStorage.getItem('usuario'));
  const miId = userLocal ? (userLocal.idUsuario || userLocal.id) : 0;

  useEffect(() => {
    const box = JSON.parse(localStorage.getItem('box'));
    if (!box || !userLocal) { navigate('/login'); return; }
    cargarComunidad(box.idBox);
  }, [navigate]);

  async function cargarComunidad(idBox) {
    try {
      const res = await fetch(`${API_BASE}/usuarios/box/${idBox}/comunidad`);
      if (res.ok) setComunidad(await res.json());
    } catch (error) { console.error("Error al cargar la comunidad", error); }
    finally { setLoading(false); }
  }

  // 👇 NUEVO: Cuando seleccionas un atleta, buscamos sus PRs + likes + reacciones
  const handleAbrirPerfil = async (atleta) => {
    setLoboSeleccionado(atleta);
    setMarcasLobo([]);
    setReaccionesResumen({});
    setPerfilLikes({ totalLikes: 0, yaLeDiLike: false });
    setEstadoAmistad('ninguna');
    setCargandoMarcas(true);
    const token = localStorage.getItem('token');
    const auth = { 'Authorization': `Bearer ${token}` };
    try {
      const [resPRs, resLikes, resResumen, resEstado] = await Promise.all([
        fetch(`${API_BASE}/marcaspersonales/usuario/${atleta.idUsuario}`),
        fetch(`${API_BASE}/interacciones/like-perfil/${atleta.idUsuario}/estado`, { headers: auth }),
        fetch(`${API_BASE}/interacciones/usuario/${atleta.idUsuario}/reacciones-resumen`, { headers: auth }),
        fetch(`${API_BASE}/amistades/estado/${miId}/${atleta.idUsuario}`, { headers: auth }),
      ]);
      if (resPRs.ok) {
        const data = await resPRs.json();
        setMarcasLobo(data.recordsMaximos || data || []);
      }
      if (resLikes.ok) setPerfilLikes(await resLikes.json());
      if (resResumen.ok) {
        const arr = await resResumen.json();
        setReaccionesResumen(Object.fromEntries(arr.map(r => [r.idMarca, r])));
      }
      if (resEstado.ok) { const e = await resEstado.json(); setEstadoAmistad(e.estado || 'ninguna'); }
    } catch (error) { console.error("Error al cargar el perfil", error); }
    finally { setCargandoMarcas(false); }
  };

  async function handleSolicitarAmistad(idLoboDestino) {
    const previo = estadoAmistad;
    setEstadoAmistad('Pendiente'); // optimista: el botón pasa a inactivo de inmediato
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/amistades/solicitar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ idUsuarioEnvia: miId, idUsuarioRecibe: idLoboDestino })
      });
      const data = await res.json();
      if (!res.ok) { setEstadoAmistad(previo); alert(data.mensaje || 'No se pudo enviar la solicitud.'); return; }
      alert(data.mensaje); // "¡Solicitud enviada!"
    } catch (error) {
      setEstadoAmistad(previo);
      alert('Error al enviar la solicitud.');
    }
  }

  // Reacción a un PR — UI optimista: bumpea el conteo al instante y reconcilia con el servidor.
  async function handleReaccionar(idMarca, emoji) {
    const previo = reaccionesResumen;
    setReaccionesResumen(prev => aplicarReaccionLocal(prev, idMarca, emoji));
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/interacciones/reaccionar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ idMarca, emoji })
      });
      if (!res.ok) throw new Error('reaccion');
      // Reconciliar con el resumen real (cubre el caso de cambiar de emoji)
      const resR = await fetch(`${API_BASE}/interacciones/usuario/${loboSeleccionado.idUsuario}/reacciones-resumen`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (resR.ok) {
        const arr = await resR.json();
        setReaccionesResumen(Object.fromEntries(arr.map(r => [r.idMarca, r])));
      }
    } catch (error) {
      setReaccionesResumen(previo); // revertir si falla
    }
  }

  // Like al perfil — UI optimista (toggle): se pinta al instante y revierte si falla.
  async function handleLikePerfil(idPerfil) {
    const previo = perfilLikes;
    setPerfilLikes(previo.yaLeDiLike
      ? { totalLikes: Math.max(0, previo.totalLikes - 1), yaLeDiLike: false }
      : { totalLikes: previo.totalLikes + 1, yaLeDiLike: true });
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/interacciones/like-perfil/${idPerfil}`, {
        method: 'POST', headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('like');
      setPerfilLikes(await res.json()); // reconciliar con el conteo real
    } catch (error) {
      setPerfilLikes(previo); // revertir
    }
  }

  const q = filtro.trim().toLowerCase();
  const qUser = q.replace(/^@/, ''); // permite buscar con o sin "@"
  const atletasFiltrados = comunidad.filter(a =>
    (a.nombre && a.nombre.toLowerCase().includes(q)) ||
    (a.apodo && a.apodo.toLowerCase().includes(q)) ||
    (a.username && a.username.toLowerCase().includes(qUser))
  );

  const totalCoaches = comunidad.filter(a => a.rol === 'Coach').length;
  const enRacha = comunidad.filter(a => a.rachaActual >= 3).length;

  return (
    <div className="com-page">

      <nav className="com-navbar">
        <BackButton to="/user-panel" />
        <span className="com-brand">
          <i className="fas fa-users"></i> COMUNIDAD
        </span>
        {!loading && (
          <span className="com-member-count ms-auto">{comunidad.length} Compas</span>
        )}
      </nav>

      <section className="com-hero">
        <h1 className="com-hero-title">LA MANADA</h1>
        <span className="com-hero-line"></span>
        <p className="com-hero-sub">Conoce a tus compañeros de box</p>
      </section>

      <div className="com-search-section">
        <div className="row justify-content-center">
          <div className="col-12 col-md-8 col-lg-6">
            <div className="com-search-wrap">
              <i className="fas fa-search com-search-icon"></i>
              <input
                type="text"
                className="com-search-input"
                placeholder="Buscar por nombre, apodo o usuario..."
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
              />
            </div>
          </div>
        </div>

        {!loading && (
          <div className="com-stats-row">
            <div className="com-stat">
              <span className="com-stat-value">{comunidad.length}</span>
              <span className="com-stat-label">Miembros</span>
            </div>
            <div className="com-stat-divider"></div>
            <div className="com-stat">
              <span className="com-stat-value">{totalCoaches}</span>
              <span className="com-stat-label">Coaches</span>
            </div>
            <div className="com-stat-divider"></div>
            <div className="com-stat">
              <span className="com-stat-value">{enRacha}</span>
              <span className="com-stat-label">En Racha</span>
            </div>
          </div>
        )}
      </div>

      <div className="com-grid-section">
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border com-spinner"></div>
          </div>
        ) : atletasFiltrados.length === 0 ? (
          <div className="com-empty">
            <i className="fas fa-user-slash"></i>
            <p>No se encontraron atletas.</p>
          </div>
        ) : (
          <div className="row g-3 g-md-4">
            {atletasFiltrados.map(atleta => (
              <div key={atleta.idUsuario} className="col-6 col-md-4 col-lg-3">
                <div
                  className={`com-athlete-card ${atleta.rol === 'Coach' ? 'com-card-coach' : 'com-card-atleta'}`}
                  onClick={() => handleAbrirPerfil(atleta)}
                >
                  <div className="com-card-strip">
                    <span className="com-card-level">LVL {atleta.nivelGamer}</span>
                    {atleta.rachaActual >= 3 && (
                      <span className="com-card-fire" title={`Racha: ${atleta.rachaActual} días`}>
                        <i className="fas fa-fire"></i>
                      </span>
                    )}
                  </div>

                  <div className="com-card-body">
                    <div className={`com-avatar ${atleta.rol === 'Coach' ? 'com-avatar-coach' : 'com-avatar-atleta'}`}>
                      {atleta.rol === 'Coach' && (
                        <span className="com-avatar-crown"><i className="fas fa-crown"></i></span>
                      )}
                      {atleta.foto
                        ? <img src={atleta.foto} alt={atleta.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }} />
                        : (atleta.apodo ? atleta.apodo.charAt(0).toUpperCase() : atleta.nombre.charAt(0).toUpperCase())
                      }
                    </div>

                    <p className="com-card-name">{atleta.nombre}</p>
                    {atleta.username && <p className="com-card-username">@{atleta.username}</p>}
                    {atleta.apodo && <p className="com-card-apodo">"{atleta.apodo}"</p>}

                    <span className={`com-card-role ${atleta.rol === 'Coach' ? 'com-card-role--coach' : 'com-card-role--atleta'}`}>
                      {atleta.rol === 'Coach' ? 'COACH' : 'ATLETA'}
                    </span>

                    <div className="com-card-badges">
                      <span className={`com-badge ${atleta.categoriaBase === 'RX' ? 'com-badge-rx' : 'com-badge-scaled'}`}>
                        <i className="fas fa-dumbbell me-1"></i>
                        {atleta.categoriaBase?.toUpperCase() || 'NOVATO'}
                      </span>
                      {atleta.rol === 'Coach' && (
                        <span className="com-badge com-badge-coach">Coach</span>
                      )}
                    </div>
                  </div>

                  {atleta.estadoDelDia && (
                    <div className="com-card-footer">
                      <span className="com-card-estado">"{atleta.estadoDelDia}"</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {loboSeleccionado && (
        <WolfLanyard
          lobo={loboSeleccionado}
          marcas={marcasLobo}
          cargandoMarcas={cargandoMarcas}
          miId={miId}
          reaccionesResumen={reaccionesResumen}
          likesPerfil={perfilLikes.totalLikes}
          yaLeDiLike={perfilLikes.yaLeDiLike}
          onLikePerfil={handleLikePerfil}
          estadoAmistad={estadoAmistad}
          onClose={() => setLoboSeleccionado(null)}
          onReaccionar={handleReaccionar}
          onSolicitarAmistad={handleSolicitarAmistad}
          boxNombre={JSON.parse(localStorage.getItem('box'))?.nombre || 'WOLFPACK'}
        />
      )}
    </div>
  );
}
