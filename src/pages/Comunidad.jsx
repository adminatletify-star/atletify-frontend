import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BackButton from '../components/BackButton';
import WolfLanyard from '../components/ReactBits/WolfLanyard';
import '../assets/css/Comunidad.css';

const API_BASE = import.meta.env.VITE_API_URL;;

export default function Comunidad() {
  const navigate = useNavigate();
  const [comunidad, setComunidad] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('');

  const [loboSeleccionado, setLoboSeleccionado] = useState(null);

  // 👇 NUEVO: Estados para los PRs del lobo que estamos viendo
  const [marcasLobo, setMarcasLobo] = useState([]);
  const [cargandoMarcas, setCargandoMarcas] = useState(false);

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

  // 👇 NUEVO: Cuando seleccionas un atleta, buscamos sus PRs en la BD
  const handleAbrirPerfil = async (atleta) => {
    setLoboSeleccionado(atleta);
    setMarcasLobo([]);
    setCargandoMarcas(true);
    try {
      const res = await fetch(`${API_BASE}/marcaspersonales/usuario/${atleta.idUsuario}`);
      if (res.ok) {
        const data = await res.json();
        setMarcasLobo(data.recordsMaximos || data || []);
      }
    } catch (error) { console.error("Error al cargar PRs", error); }
    finally { setCargandoMarcas(false); }
  };

  async function handleSolicitarAmistad(idLoboDestino) {
    try {
      const payload = { idUsuarioEnvia: miId, idUsuarioRecibe: idLoboDestino };
      const res = await fetch(`${API_BASE}/amistades/solicitar`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      const data = await res.json();
      alert(data.mensaje);
    } catch (error) { alert("Error al intentar conectar con la manada."); }
  }

  // 👇 NUEVO: La función que dispara la dopamina (El Like)
  async function handleReaccionar(idMarca, emoji) {
    try {
      const payload = { idMarca, idUsuarioReacciona: miId, emoji };
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/interacciones/reaccionar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        alert(`¡Reaccionaste con ${emoji} al PR de ${loboSeleccionado.nombre.split(' ')[0]}!`);
      } else {
        const err = await res.json();
        alert(err.mensaje || "Error al reaccionar.");
      }
    } catch (error) { console.error(error); }
  }

  const atletasFiltrados = comunidad.filter(a =>
    (a.apodo && a.apodo.toLowerCase().includes(filtro.toLowerCase())) ||
    (a.nombre && a.nombre.toLowerCase().includes(filtro.toLowerCase()))
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
                placeholder="Buscar por nombre o apodo..."
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
          onClose={() => setLoboSeleccionado(null)}
          onReaccionar={handleReaccionar}
          onSolicitarAmistad={handleSolicitarAmistad}
          boxNombre={JSON.parse(localStorage.getItem('box'))?.nombre || 'WOLFPACK'}
        />
      )}
    </div>
  );
}
