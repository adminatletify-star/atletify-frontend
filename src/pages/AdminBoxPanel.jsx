import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { USUARIOS_ENDPOINT } from '../services/api';
import FlowingMenu from '../components/ReactBits/FlowingMenu';
import '../assets/css/AdminBoxPanel.css';

export default function AdminBoxPanel() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [box, setBox] = useState(null);
  const [atletas, setAtletas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [solicitudes, setSolicitudes] = useState([]);

  // Filtros
  const [busqueda, setBusqueda] = useState('');
  const [filtroCat, setFiltroCat] = useState('');
  const [filtroEstatus, setFiltroEstatus] = useState('');

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem('usuario'));
    const b = JSON.parse(localStorage.getItem('box'));

    if (!u) {
      navigate('/login');
      return;
    }

    setUser(u);
    setBox(b);
    cargarAtletas(b?.idBox);
  }, [navigate]);

  async function cargarAtletas(idBox) {
    try {
      const response = await fetch(USUARIOS_ENDPOINT);
      const data = await response.json();
      const usuariosBox = Array.isArray(data) ? data : (data.data || []);

      const atletasFiltrados = usuariosBox.filter(x =>
        (x.idBoxPredeterminado === idBox || x.IdBoxPredeterminado === idBox) &&
        (x.rol === 'Atleta' || x.Rol === 'Atleta')
      );

      const solicitudesFiltradas = usuariosBox.filter(x =>
        (x.idBoxPredeterminado === idBox || x.IdBoxPredeterminado === idBox) &&
        (x.estatus === 'Pendiente' || x.Estatus === 'Pendiente')
      );

      setAtletas(atletasFiltrados);
      setSolicitudes(solicitudesFiltradas);

    } catch (err) { console.error(err); }
    finally {
      setLoading(false);
    }
  }

  async function expulsarAtleta(idUsuario) {
    if (!await window.wpConfirm("¿Seguro que deseas expulsar a este atleta del Box? Quedará como usuario independiente.")) return;

    try {
      const res = await fetch(`${USUARIOS_ENDPOINT}/${idUsuario}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idBoxPredeterminado: 0, rol: 'Usuario' })
      });

      if (res.ok) {
        alert("Atleta expulsado correctamente");
        cargarAtletas(box?.idBox);
      } else {
        alert("Error al expulsar al atleta");
      }
    } catch (err) {
      console.error(err);
      alert("Error de conexión");
    }
  }

  const isAdmin = user?.rol === 'AdminBox' || user?.rol === 'Developer';
  const atletasActivos = atletas.filter(a => a.activo);
  const atletasInactivos = atletas.filter(a => !a.activo);

  // Categorías únicas para el select
  const categorias = [...new Set(atletas.map(a => a.categoriaBase).filter(Boolean))].sort();

  // Atletas filtrados por búsqueda + categoría + estatus
  const atletasMostrados = atletas.filter(a => {
    const termino = busqueda.toLowerCase();
    const matchNombre = !busqueda ||
      a.nombre?.toLowerCase().includes(termino) ||
      a.correo?.toLowerCase().includes(termino);
    const matchCat = !filtroCat || a.categoriaBase === filtroCat;
    const matchEstatus = !filtroEstatus ||
      (filtroEstatus === 'activo' ? a.activo : !a.activo);
    return matchNombre && matchCat && matchEstatus;
  });

  const menuItems = [
    { link: '/perfil-admin', text: 'MI PERFIL / EXPEDIENTE', image: 'https://images.unsplash.com/photo-1526506190301-3d47c062c54c?w=600&q=80' },
    { link: '/registro-manual', text: 'NUEVO ATLETA', image: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=600&q=80' },
    { link: '/pase-de-lista', text: 'PASE DE LISTA', image: 'https://images.unsplash.com/photo-1599058917212-d750089bc07e?w=600&q=80' },
    { link: '/calendario-wods', text: 'PROGRAMAR WODS', image: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=600&q=80' },
    ...(isAdmin ? [
      { link: '/gestion-clases', text: 'CLASES Y WODS', image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&q=80' },
      { link: '/gestion-ventas-productos', text: 'TIENDA Y POS', image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&q=80' },
      { link: '/gestion-reglamento', text: 'REGLAMENTO', image: 'https://images.unsplash.com/photo-1544367567-0f2fcb046eb9?w=600&q=80' }
    ] : [])
  ];

  if (loading) {
    return (
      <div className="abp-loading">
        <div className="spinner-border text-danger" role="status" style={{ width: '3rem', height: '3rem' }}></div>
      </div>
    );
  }

  return (
    <div className="abp-page">
      <div className="container-xl px-3 px-md-4">

        {/* ══════════════════════════════════
            HERO HEADER
        ══════════════════════════════════ */}
        <section className="abp-hero">
          <div className="d-flex justify-content-between align-items-start gap-3">
            <div>
              <span className="abp-role-badge mb-3 d-inline-block shadow-sm">
                <i className="fas fa-shield-alt me-1"></i>{user?.rol}
              </span>
              <div className="d-flex align-items-center gap-3">
                {box?.logo && (
                  <img 
                    src={box.logo} 
                    alt={box?.nombre || 'Logo Box'} 
                    style={{ width: '70px', height: '70px', objectFit: 'cover', borderRadius: '14px', background: '#1c1c24', border: '1px solid rgba(255,255,255,0.1)' }}
                  />
                )}
                <div>
                  <h1 className="abp-box-title mb-0" style={{ lineHeight: '1.1' }}>{box?.nombre || 'MI BOX'}</h1>
                  <p className="abp-hero-sub mb-0 mt-1 opacity-75">Centro de mando y control operativo</p>
                </div>
              </div>
            </div>
            {isAdmin && (
              <Link to="/editar-box" className="abp-config-btn mt-1">
                <i className="fas fa-cog"></i>
                <span className="d-none d-sm-inline">Configurar Box</span>
              </Link>
            )}
          </div>

          {/* ESTADÍSTICAS RÁPIDAS */}
          <div className="row g-3 abp-stats-row">
            <div className="col-6 col-md-3">
              <Link to="/atletas-box" className="text-decoration-none d-block">
                <div className="abp-stat-card" style={{ '--accent-line': 'var(--accent-cool)', cursor: 'pointer' }}>
                  <div className="d-flex justify-content-between align-items-start">
                    <div>
                      <div className="abp-stat-number" style={{ color: 'var(--accent-cool)' }}>{atletas.length}</div>
                      <div className="abp-stat-label">Total Atletas</div>
                    </div>
                    <div className="abp-stat-icon" style={{ background: 'rgba(79,195,247,0.1)', color: 'var(--accent-cool)' }}>
                      <i className="fas fa-users"></i>
                    </div>
                  </div>
                </div>
              </Link>
            </div>

            <div className="col-6 col-md-3">
              <Link to="/atletas-box?estatus=activo" className="text-decoration-none d-block">
                <div className="abp-stat-card" style={{ '--accent-line': 'var(--success)', cursor: 'pointer' }}>
                  <div className="d-flex justify-content-between align-items-start">
                    <div>
                      <div className="abp-stat-number" style={{ color: 'var(--success)' }}>{atletasActivos.length}</div>
                      <div className="abp-stat-label">Activos</div>
                    </div>
                    <div className="abp-stat-icon" style={{ background: 'rgba(46,204,113,0.1)', color: 'var(--success)' }}>
                      <i className="fas fa-check-circle"></i>
                    </div>
                  </div>
                </div>
              </Link>
            </div>

            <div className="col-6 col-md-3">
              <Link to="/atletas-box?estatus=inactivo" className="text-decoration-none d-block">
                <div className="abp-stat-card" style={{ '--accent-line': 'var(--danger)', cursor: 'pointer' }}>
                  <div className="d-flex justify-content-between align-items-start">
                    <div>
                      <div className="abp-stat-number" style={{ color: 'var(--danger)' }}>{atletasInactivos.length}</div>
                      <div className="abp-stat-label">Inactivos</div>
                    </div>
                    <div className="abp-stat-icon" style={{ background: 'rgba(231,76,60,0.1)', color: 'var(--danger)' }}>
                      <i className="fas fa-times-circle"></i>
                    </div>
                  </div>
                </div>
              </Link>
            </div>

            {isAdmin && (
              <div className="col-6 col-md-3">
                <Link to="/gestion-solicitudes" className="text-decoration-none d-block">
                  <div className="abp-stat-card" style={{ '--accent-line': 'var(--warning)', cursor: 'pointer' }}>
                    <div className="d-flex justify-content-between align-items-start">
                      <div>
                        <div className="abp-stat-number" style={{ color: solicitudes.length > 0 ? 'var(--warning)' : 'var(--text-muted)' }}>
                          {solicitudes.length}
                        </div>
                        <div className="abp-stat-label">Solicitudes</div>
                      </div>
                      <div className="abp-stat-icon" style={{ background: 'rgba(243,156,18,0.1)', color: 'var(--warning)' }}>
                        <i className="fas fa-bell"></i>
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            )}
          </div>
        </section>


        {/* ══════════════════════════════════
            ACCESOS RÁPIDOS (FLOWING MENU)
        ══════════════════════════════════ */}
        <p className="abp-section-label">Accesos Rápidos</p>
        <div className="abp-menu-wrapper" style={{ height: 'auto' }}>
          <FlowingMenu
            items={menuItems}
            speed={20}
            textColor="#ffffff"
            bgColor="transparent"
            marqueeBgColor="#dc3545"
            marqueeTextColor="#ffffff"
            borderColor="rgba(255, 255, 255, 0.05)"
          />
        </div>


      </div>
    </div>
  );
}
