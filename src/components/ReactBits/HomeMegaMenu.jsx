import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './HomeMegaMenu.css';

export default function HomeMegaMenu({ user, mobileMenuOpen, setMobileMenuOpen }) {
  const { cuentasGuardadas, cambiarCuenta } = useAuth();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  // Efecto para detectar scroll
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Bloquear scroll cuando el menú móvil está abierto
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [mobileMenuOpen]);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const handleLinkClick = () => {
    window.scrollTo(0, 0);
    setMobileMenuOpen(false);
  };

  const renderCuentasAvatares = (isDesktop = false) => {
    if (!cuentasGuardadas || cuentasGuardadas.length === 0) return null;
    const currentId = user?.idUsuario || user?.IdUsuario || user?.id || user?.Id;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '0.5rem' }}>
        {cuentasGuardadas.map((c, i) => {
          const cId = c.usuario?.idUsuario || c.usuario?.IdUsuario || c.usuario?.id || c.usuario?.Id;
          const isActiva = cId === currentId;
          const foto = c.usuario?.fotoPerfilUrl || c.usuario?.foto;
          return (
            <button
              key={cId || i}
              type="button"
              className="hmm-account-btn"
              onClick={() => {
                const targetPanel = c.usuario.rol === 'Developer' ? '/dashboard' : c.usuario.rol === 'Atleta' ? '/user-panel' : '/admin-box-panel';
                if (!isActiva) {
                  const ok = cambiarCuenta(c);
                  if (ok) {
                    setMobileMenuOpen(false);
                    window.location.href = targetPanel;
                  }
                } else {
                  setMobileMenuOpen(false);
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
              {isActiva && <i className="fas fa-check hmm-account-check"></i>}
            </button>
          );
        })}
        {cuentasGuardadas.length < 5 && (
          <button
            type="button"
            className="hmm-account-btn hmm-account-add"
            onClick={() => { setMobileMenuOpen(false); navigate('/login?addAccount=true'); }}
            style={{ border: '1px dashed rgba(255,255,255,0.3)', background: 'transparent' }}
          >
            <div className="hmm-account-avatar hmm-avatar-add">
              <i className="fas fa-plus" style={{ color: 'var(--text-primary)' }}></i>
            </div>
            <div className="hmm-account-info">
              <span className="hmm-account-name" style={{ color: 'var(--text-primary)' }}>Añadir cuenta</span>
            </div>
          </button>
        )}
      </div>
    );
  };

  return (
    <>
      <nav className={`hmm-navbar ${scrolled ? 'scrolled' : ''}`}>
        <div className="hmm-container">
          
          {/* LOGO */}
          <Link to="/" className="hmm-logo-link">
            <img src="/LogosDeAtletify/LogoBlanco.png" alt="Atletify" className="hmm-logo-img" />
            <h2 className="hmm-logo-text">
              <span style={{ color: 'var(--primary)' }}>A</span>tletify
            </h2>
          </Link>

          {/* MENÚ CENTRAL (Desktop) */}
          <div className="hmm-nav-menu">
            
            {/* ITEM 1: EXPLORA */}
            <div className="hmm-nav-item">
              <button className="hmm-nav-btn">
                Explora <i className="fas fa-chevron-down"></i>
              </button>
              
              <div className="hmm-dropdown">
                <div className="hmm-dropdown-grid">
                  
                  {/* Columna 1 */}
                  <div className="hmm-col">
                    <span className="hmm-col-title">ECOSISTEMA</span>
                    <Link to="/directorio-boxes" className="hmm-link-card">
                      <div className="hmm-link-content">
                        <h4 className="hmm-link-title">Boxes</h4>
                        <p className="hmm-link-desc">Directorio global de espacios.</p>
                      </div>
                      <i className="fas fa-chevron-right hmm-link-arrow"></i>
                    </Link>
                    <Link to="/competencias" className="hmm-link-card">
                      <div className="hmm-link-content">
                        <h4 className="hmm-link-title">Competencias</h4>
                        <p className="hmm-link-desc">Eventos activos y próximos.</p>
                      </div>
                      <i className="fas fa-chevron-right hmm-link-arrow"></i>
                    </Link>
                  </div>

                  {/* Columna 2 */}
                  <div className="hmm-col">
                    <span className="hmm-col-title">RESULTADOS</span>
                    <Link to="/historial-competencias" className="hmm-link-simple">Historial de Compes</Link>
                  </div>

                  {/* Columna 3 */}
                  <div className="hmm-col">
                    <span className="hmm-col-title">VISITANTES</span>
                    <Link to="/public-drop-in" className="hmm-link-simple">Drop-in (Soy Turista)</Link>
                  </div>

                </div>
              </div>
            </div>

            {/* ITEM 2: HERRAMIENTAS */}
            <div className="hmm-nav-item">
              <button className="hmm-nav-btn">
                Herramientas <i className="fas fa-chevron-down"></i>
              </button>
              <div className="hmm-dropdown">
                <div className="hmm-dropdown-grid" style={{ gridTemplateColumns: '1.5fr 1fr' }}>
                  <div className="hmm-col">
                    <span className="hmm-col-title">ENTRENAMIENTO</span>
                    <Link to="/ejercicios" className="hmm-link-card">
                      <div className="hmm-link-content">
                        <h4 className="hmm-link-title">Ejercicios</h4>
                        <p className="hmm-link-desc">Diccionario técnico y movimientos.</p>
                      </div>
                      <i className="fas fa-chevron-right hmm-link-arrow"></i>
                    </Link>
                    <Link to="/simulador-barra-publico" className="hmm-link-card">
                      <div className="hmm-link-content">
                        <h4 className="hmm-link-title">Simulador de Barra</h4>
                        <p className="hmm-link-desc">Calcula tus pesos ideales.</p>
                      </div>
                      <i className="fas fa-chevron-right hmm-link-arrow"></i>
                    </Link>
                  </div>
                  <div className="hmm-col">
                    <span className="hmm-col-title">GENERAL</span>
                    <Link to="/" className="hmm-link-simple">TODO (Panel Base)</Link>
                  </div>
                </div>
              </div>
            </div>

            {/* ITEM 3: NOSOTROS */}
            <div className="hmm-nav-item">
              <button className="hmm-nav-btn">
                Nosotros <i className="fas fa-chevron-down"></i>
              </button>
              <div className="hmm-dropdown">
                <div className="hmm-dropdown-grid" style={{ gridTemplateColumns: '1fr' }}>
                  <div className="hmm-col" style={{ padding: '1rem 1.5rem' }}>
                    <Link to="/sobre-nosotros" className="hmm-link-simple">Sobre Nosotros</Link>
                    <Link to="/wolfpack" className="hmm-link-simple">Wolfpack</Link>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* BOTONES DERECHA */}
          <div className="hmm-actions">
            {user ? (
              <div className="hmm-nav-item">
                <button className="hmm-btn-solid">
                  Mi Panel <i className="fas fa-chevron-down ms-1" style={{ fontSize: '0.75rem' }}></i>
                </button>
                <div className="hmm-dropdown hmm-dropdown-right" style={{ minWidth: '260px', left: 'auto', right: 0, transform: 'translateY(10px)' }}>
                  <div className="hmm-col" style={{ padding: '1rem' }}>
                    <span className="hmm-col-title d-block mb-2">SESIONES ACTIVAS</span>
                    {renderCuentasAvatares(true)}
                  </div>
                </div>
              </div>
            ) : (
              cuentasGuardadas && cuentasGuardadas.length > 0 ? (
                <div className="hmm-nav-item">
                  <button className="hmm-btn-solid hmm-login-btn">
                    Acceder <i className="fas fa-chevron-down ms-1" style={{ fontSize: '0.75rem' }}></i>
                  </button>
                  <div className="hmm-dropdown hmm-dropdown-right" style={{ minWidth: '220px', left: 'auto', right: 0, transform: 'translateY(10px)' }}>
                    <div className="hmm-col" style={{ padding: '1rem' }}>
                      <span className="hmm-col-title d-block mb-2">MIS SESIONES</span>
                      {renderCuentasAvatares(true)}
                    </div>
                  </div>
                </div>
              ) : (
                <Link to="/login" className="hmm-btn-solid">
                  Iniciar Sesión
                </Link>
              )
            )}
          </div>

          {/* BOTÓN MÓVIL (Hamburguesa / Cerrar) */}
          <button 
            className="hmm-mobile-toggle" 
            onClick={toggleMobileMenu}
            style={{ zIndex: 1060 }}
          >
            <i className={`fas ${mobileMenuOpen ? 'fa-times' : 'fa-bars'}`}></i>
          </button>

        </div>
      </nav>

      {/* OVERLAY MÓVIL FULLSCREEN */}
      <div className={`hmm-mobile-overlay ${mobileMenuOpen ? 'open' : ''}`}>
        <div className="hmm-mobile-content">
          <ul className="hmm-mobile-links">
            <li><Link to="/" onClick={handleLinkClick}>TODO</Link></li>
            <li><Link to="/sobre-nosotros" onClick={handleLinkClick}>NOSOTROS</Link></li>
            <li><Link to="/directorio-boxes" onClick={handleLinkClick}>BOXES</Link></li>
            <li><Link to="/competencias" onClick={handleLinkClick}>COMPETENCIAS</Link></li>
            <li><Link to="/historial-competencias" onClick={handleLinkClick}>HISTORIAL DE COMPES</Link></li>
            <li><Link to="/simulador-barra-publico" onClick={handleLinkClick}>SIMULADOR DE BARRA</Link></li>
            <li><Link to="/wolfpack" onClick={handleLinkClick}>WOLFPACK</Link></li>
            <li><Link to="/ejercicios" onClick={handleLinkClick}>EJERCICIOS</Link></li>
            <li><Link to="/public-drop-in" onClick={handleLinkClick}>DROP-IN (SOY TURISTA)</Link></li>
          </ul>

          <div className="hmm-mobile-footer mt-5">
            {user ? (
              <div className="hmm-mobile-auth">
                <span className="hmm-col-title d-block mb-3 text-center">TUS SESIONES ACTIVAS</span>
                {renderCuentasAvatares(false)}
              </div>
            ) : (
              <div className="hmm-mobile-auth">
                {cuentasGuardadas && cuentasGuardadas.length > 0 ? (
                  <>
                    <span className="hmm-col-title d-block mb-3 text-center">TUS SESIONES GUARDADAS</span>
                    {renderCuentasAvatares(false)}
                  </>
                ) : (
                  <Link to="/login" className="hmm-btn-solid w-100 text-center" onClick={handleLinkClick}>
                    Iniciar Sesión
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
