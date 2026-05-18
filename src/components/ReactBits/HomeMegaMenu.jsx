import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './HomeMegaMenu.css';

export default function HomeMegaMenu({ user, mobileMenuOpen, setMobileMenuOpen }) {
  const { cuentasGuardadas, cambiarCuenta, removerCuenta } = useAuth();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [activeMenu, setActiveMenu] = useState(null); // 'explora' | 'herramientas' | 'nosotros' | 'cuentas'
  const navRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : 'unset';
  }, [mobileMenuOpen]);

  // Cierra el menú móvil si la pantalla se agranda por encima del breakpoint
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 1100) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [setMobileMenuOpen]);

  // Cierra el dropdown al hacer click fuera del navbar
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (navRef.current && !navRef.current.contains(e.target)) {
        setActiveMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleMenu = (menu) => {
    setActiveMenu(prev => prev === menu ? null : menu);
  };

  const closeAll = () => setActiveMenu(null);

  const toggleMobileMenu = () => setMobileMenuOpen(!mobileMenuOpen);

  const handleLinkClick = () => {
    window.scrollTo(0, 0);
    setMobileMenuOpen(false);
    closeAll();
  };

  const getPanelRoute = (u) => {
    if (!u) return '/login';
    if (u.rol === 'Developer') return '/dashboard';
    if (u.rol === 'Atleta') return '/user-panel';
    return '/admin-box-panel';
  };

  const haySessionActiva = !!user;
  const hayCuentasGuardadas = cuentasGuardadas && cuentasGuardadas.length > 0;

  const renderCuentasDropdown = () => {
    if (!hayCuentasGuardadas) return null;
    const currentId = user?.idUsuario || user?.IdUsuario || user?.id || user?.Id;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '0.5rem' }}>
        {cuentasGuardadas.map((c, i) => {
          const cId = c.usuario?.idUsuario || c.usuario?.IdUsuario || c.usuario?.id || c.usuario?.Id;
          const isActiva = cId === currentId;
          const foto = c.usuario?.fotoPerfilUrl || c.usuario?.foto;
          return (
            <div
              key={cId || i}
              role="button"
              tabIndex={0}
              className="hmm-account-btn"
              onClick={() => {
                const targetPanel = getPanelRoute(c.usuario);
                if (!isActiva) {
                  const ok = cambiarCuenta(c);
                  if (ok) {
                    setMobileMenuOpen(false);
                    closeAll();
                    window.location.href = targetPanel;
                  }
                } else {
                  setMobileMenuOpen(false);
                  closeAll();
                  navigate(targetPanel);
                }
              }}
              style={{
                border: isActiva ? '1px solid var(--primary)' : '1px solid rgba(255,255,255,0.08)',
                background: isActiva ? 'rgba(230, 57, 70, 0.1)' : 'rgba(255,255,255,0.02)',
              }}
            >
              <div className="hmm-account-avatar" style={{ border: isActiva ? '2px solid var(--primary)' : 'none' }}>
                {foto ? (
                  <img src={foto} alt={c.usuario.nombre} />
                ) : (
                  <div className="hmm-account-initial" style={{ background: isActiva ? 'var(--primary)' : '#333' }}>
                    {c.usuario.nombre?.charAt(0)?.toUpperCase()}
                  </div>
                )}
              </div>
              <div className="hmm-account-info">
                <span className="hmm-account-name">{c.usuario.nombre}</span>
                <span className="hmm-account-role">{c.usuario.rol}</span>
              </div>
              {isActiva && <i className="fas fa-check hmm-account-check" style={{ marginRight: '4px' }}></i>}
              <button
                type="button"
                className="hmm-account-delete"
                onClick={(e) => { e.stopPropagation(); removerCuenta(cId); }}
                title="Quitar cuenta"
              >
                <i className="fas fa-trash-alt"></i>
              </button>
            </div>
          );
        })}
        {cuentasGuardadas.length < 5 && (
          <div
            role="button"
            tabIndex={0}
            className="hmm-account-btn hmm-account-add"
            onClick={() => { setMobileMenuOpen(false); closeAll(); navigate('/login?addAccount=true'); }}
            style={{ border: '1px dashed rgba(255,255,255,0.25)', background: 'transparent' }}
          >
            <div className="hmm-account-avatar hmm-avatar-add">
              <i className="fas fa-plus" style={{ color: 'var(--text-primary)' }}></i>
            </div>
            <div className="hmm-account-info">
              <span className="hmm-account-name" style={{ color: 'var(--text-primary)' }}>Añadir cuenta</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <nav ref={navRef} className={`hmm-navbar ${scrolled ? 'scrolled' : ''} ${mobileMenuOpen ? 'menu-open' : ''}`}>
        <div className="hmm-container">

          {/* LOGO */}
          <Link to="/" className="hmm-logo-link" onClick={handleLinkClick}>
            <img src="/LogosDeAtletify/LogoBlanco.png" alt="Atletify" className="hmm-logo-img" />
            <h2 className="hmm-logo-text">
              <span style={{ color: 'var(--primary)' }}>A</span>tletify
            </h2>
          </Link>

          {/* MENÚ CENTRAL */}
          <div className="hmm-nav-menu">

            {/* EXPLORA */}
            <div className="hmm-nav-item">
              <button
                className={`hmm-nav-btn ${activeMenu === 'explora' ? 'active' : ''}`}
                onClick={() => toggleMenu('explora')}
              >
                Explora <i className={`fas fa-chevron-down ${activeMenu === 'explora' ? 'rotated' : ''}`}></i>
              </button>
              <div className={`hmm-dropdown ${activeMenu === 'explora' ? 'open' : ''}`}>
                <div className="hmm-dropdown-grid" style={{ gridTemplateColumns: '1.4fr 1fr' }}>
                  <div className="hmm-col">
                    <span className="hmm-col-title">ECOSISTEMA</span>
                    <Link to="/directorio-boxes" className="hmm-link-card" onClick={handleLinkClick}>
                      <div className="hmm-link-content">
                        <h4 className="hmm-link-title">Boxes</h4>
                        <p className="hmm-link-desc">Directorio global de espacios.</p>
                      </div>
                      <i className="fas fa-chevron-right hmm-link-arrow"></i>
                    </Link>
                    <Link to="/competencias" className="hmm-link-card" onClick={handleLinkClick}>
                      <div className="hmm-link-content">
                        <h4 className="hmm-link-title">Competencias</h4>
                        <p className="hmm-link-desc">Eventos activos y próximos.</p>
                      </div>
                      <i className="fas fa-chevron-right hmm-link-arrow"></i>
                    </Link>
                  </div>
                  <div className="hmm-col">
                    <span className="hmm-col-title">RESULTADOS</span>
                    <Link to="/historial-competencias" className="hmm-link-card" onClick={handleLinkClick}>
                      <div className="hmm-link-content">
                        <h4 className="hmm-link-title">Historial de Compes</h4>
                        <p className="hmm-link-desc">Tus marcas y leaderboards.</p>
                      </div>
                      <i className="fas fa-chevron-right hmm-link-arrow"></i>
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* HERRAMIENTAS */}
            <div className="hmm-nav-item">
              <button
                className={`hmm-nav-btn ${activeMenu === 'herramientas' ? 'active' : ''}`}
                onClick={() => toggleMenu('herramientas')}
              >
                Herramientas <i className={`fas fa-chevron-down ${activeMenu === 'herramientas' ? 'rotated' : ''}`}></i>
              </button>
              <div className={`hmm-dropdown ${activeMenu === 'herramientas' ? 'open' : ''}`}>
                <div className="hmm-dropdown-grid" style={{ gridTemplateColumns: '1.5fr 1fr' }}>
                  <div className="hmm-col">
                    <span className="hmm-col-title">ENTRENAMIENTO</span>
                    <Link to="/ejercicios" className="hmm-link-card" onClick={handleLinkClick}>
                      <div className="hmm-link-content">
                        <h4 className="hmm-link-title">Ejercicios</h4>
                        <p className="hmm-link-desc">Diccionario técnico y movimientos.</p>
                      </div>
                      <i className="fas fa-chevron-right hmm-link-arrow"></i>
                    </Link>
                    <Link to="/simulador-barra-publico" className="hmm-link-card" onClick={handleLinkClick}>
                      <div className="hmm-link-content">
                        <h4 className="hmm-link-title">Simulador de Barra</h4>
                        <p className="hmm-link-desc">Calcula tus pesos ideales.</p>
                      </div>
                      <i className="fas fa-chevron-right hmm-link-arrow"></i>
                    </Link>
                  </div>
                  <div className="hmm-col">
                    <span className="hmm-col-title">GENERAL</span>
                    <Link to="/" className="hmm-link-simple" onClick={handleLinkClick}>Panel Base</Link>
                  </div>
                </div>
              </div>
            </div>

            {/* NOSOTROS */}
            <div className="hmm-nav-item">
              <button
                className={`hmm-nav-btn ${activeMenu === 'nosotros' ? 'active' : ''}`}
                onClick={() => toggleMenu('nosotros')}
              >
                Nosotros <i className={`fas fa-chevron-down ${activeMenu === 'nosotros' ? 'rotated' : ''}`}></i>
              </button>
              <div className={`hmm-dropdown ${activeMenu === 'nosotros' ? 'open' : ''}`}>
                <div className="hmm-dropdown-grid" style={{ gridTemplateColumns: '1fr' }}>
                  <div className="hmm-col" style={{ padding: '1rem 1.5rem' }}>
                    <Link to="/sobre-nosotros" className="hmm-link-simple" onClick={handleLinkClick}>Sobre Nosotros</Link>
                    <Link to="/wolfpack" className="hmm-link-simple" onClick={handleLinkClick}>Wolfpack</Link>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* BOTONES DERECHA */}
          <div className="hmm-actions">

            {/* Mi Panel — solo si hay sesión activa */}
            {haySessionActiva && (
              <button
                className="hmm-btn-panel"
                onClick={() => { closeAll(); navigate(getPanelRoute(user)); }}
              >
                <i className="fas fa-th-large"></i>
                <span>Mi Panel</span>
              </button>
            )}

            {/* Cuentas — si hay cuentas guardadas */}
            {hayCuentasGuardadas ? (
              <div className="hmm-nav-item">
                <button
                  className={`hmm-btn-cuentas ${activeMenu === 'cuentas' ? 'active' : ''}`}
                  onClick={() => toggleMenu('cuentas')}
                >
                  <i className="fas fa-user-circle"></i>
                  <span>Cuentas</span>
                  <i className={`fas fa-chevron-down hmm-btn-chevron ${activeMenu === 'cuentas' ? 'rotated' : ''}`}></i>
                </button>
                <div className={`hmm-dropdown hmm-dropdown-cuentas ${activeMenu === 'cuentas' ? 'open' : ''}`}>
                  <div className="hmm-col" style={{ padding: '1rem' }}>
                    <span className="hmm-col-title" style={{ marginBottom: '0.75rem', display: 'block' }}>
                      {haySessionActiva ? 'SESIONES ACTIVAS' : 'MIS SESIONES'}
                    </span>
                    {renderCuentasDropdown()}
                  </div>
                </div>
              </div>
            ) : (
              !haySessionActiva && (
                <Link to="/login" className="hmm-btn-solid" onClick={closeAll}>
                  Iniciar Sesión
                </Link>
              )
            )}

          </div>

          {/* HAMBURGUESA */}
          <button className="hmm-mobile-toggle" onClick={toggleMobileMenu} style={{ zIndex: 1060 }}>
            <i className={`fas ${mobileMenuOpen ? 'fa-times' : 'fa-bars'}`}></i>
          </button>

        </div>
      </nav>

      {/* OVERLAY MÓVIL */}
      <div className={`hmm-mobile-overlay ${mobileMenuOpen ? 'open' : ''}`}>
        <div className="hmm-mobile-content">
          <ul className="hmm-mobile-links">
            <li><Link to="/" onClick={handleLinkClick}>Inicio</Link></li>
            <li><Link to="/directorio-boxes" onClick={handleLinkClick}>Boxes</Link></li>
            <li><Link to="/competencias" onClick={handleLinkClick}>Competencias</Link></li>
            <li><Link to="/historial-competencias" onClick={handleLinkClick}>Historial de Compes</Link></li>
            <li><Link to="/ejercicios" onClick={handleLinkClick}>Ejercicios</Link></li>
            <li><Link to="/simulador-barra-publico" onClick={handleLinkClick}>Simulador de Barra</Link></li>
            <li><Link to="/sobre-nosotros" onClick={handleLinkClick}>Nosotros</Link></li>
            <li><Link to="/wolfpack" onClick={handleLinkClick}>Wolfpack</Link></li>
          </ul>

          <div className="hmm-mobile-footer mt-5">
            {haySessionActiva && (
              <button
                className="hmm-mobile-panel-btn"
                onClick={() => { setMobileMenuOpen(false); navigate(getPanelRoute(user)); }}
              >
                <i className="fas fa-th-large"></i>
                Ir a Mi Panel
              </button>
            )}

            {hayCuentasGuardadas ? (
              <div className="hmm-mobile-auth">
                <span className="hmm-col-title d-block mb-3 text-center">
                  {haySessionActiva ? 'TUS SESIONES ACTIVAS' : 'TUS SESIONES GUARDADAS'}
                </span>
                {renderCuentasDropdown()}
              </div>
            ) : (
              <div className="hmm-mobile-auth">
                <Link to="/login" className="hmm-btn-solid w-100 text-center d-block" onClick={handleLinkClick}>
                  Iniciar Sesión
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
