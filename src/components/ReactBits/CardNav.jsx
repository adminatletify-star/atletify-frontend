import { useLayoutEffect, useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { gsap } from 'gsap';
import { GoArrowUpRight } from 'react-icons/go';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from "../../context/AuthContext";
import './CardNav.css';
import BoxPickerModal from '../BoxPickerModal';

const CardNav = ({
  logo, logoAlt = 'Logo', items, className = '', ease = 'power3.out',
  baseColor = '#fff', menuColor, buttonBgColor, buttonTextColor, onButtonClick
}) => {
  const [isHamburgerOpen, setIsHamburgerOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [openSections, setOpenSections] = useState({});
  const [isMobileNav, setIsMobileNav] = useState(() => window.innerWidth <= 1200);
  const [showSelectBoxModal, setShowSelectBoxModal] = useState(false);
  const navRef = useRef(null);
  const cardsRef = useRef([]);
  const linksWrapRefs = useRef([]);
  const tlRef = useRef(null);
  const isExpandedRef = useRef(false);
  const location = useLocation();
  const navigate = useNavigate();
  const clickTimeout = useRef(null);
  const { usuario, boxActivo, cambiarBox, cuentasGuardadas, prepararCambioCuenta, listaBoxes } = useAuth();

  const getHomeRoute = () => {
    if (!usuario) return '/';
    if (usuario.rol === 'Developer') return '/dashboard';
    if (usuario.rol === 'AdminBox' || usuario.rol === 'Coach') return '/admin-box-panel';
    if (usuario.rol === 'Atleta' || usuario.rol === 'Usuario') return '/user-panel';
    return '/';
  };

  // Mantiene el ref sincronizado con el estado
  useEffect(() => { isExpandedRef.current = isExpanded; }, [isExpanded]);

  // Ref que siempre apunta a closeMenu actualizado (evita stale closure)
  const closeMenuRef = useRef(null);

  // Cierra el menú cuando el sidebar del Dashboard se abre
  useEffect(() => {
    const handler = () => { if (closeMenuRef.current) closeMenuRef.current(); };
    window.addEventListener('atletify:dashsidebar-open', handler);
    return () => window.removeEventListener('atletify:dashsidebar-open', handler);
  }, []);

  // Detecta cambios de breakpoint. El resize se throttlea con requestAnimationFrame
  // porque en móvil dispara muchísimo (barra de URL al hacer scroll, teclado,
  // rotación) y cada disparo sincrónico contra el reflow del nav causaba lag.
  useEffect(() => {
    let rafId = null;
    const handleResize = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        setIsMobileNav(window.innerWidth <= 1200);
      });
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, []);

  // Reacciona al cambio de modo mobile ↔ desktop
  useEffect(() => {
    if (isMobileNav) {
      // Desktop → Mobile: cerrar todas las secciones y recalcular altura del nav
      setOpenSections({});
      if (isExpandedRef.current && navRef.current) {
        // Espera a que la transición CSS de colapso termine (300ms) antes de recalcular
        setTimeout(() => {
          if (navRef.current) {
            gsap.to(navRef.current, { height: calculateHeight(), duration: 0.25, ease: 'power2.out' });
          }
        }, 350);
      }
    } else {
      // Mobile → Desktop: limpiar GSAP inline styles de los wraps y recalcular nav
      linksWrapRefs.current.forEach(wrap => {
        if (wrap) gsap.set(wrap, { clearProps: 'all' });
      });
      if (isExpandedRef.current && navRef.current) {
        requestAnimationFrame(() => requestAnimationFrame(() => {
          gsap.to(navRef.current, { height: calculateHeight(), duration: 0.3, ease: 'power2.out' });
        }));
      }
    }
  }, [isMobileNav]);

  // Inicializa openSections cuando llegan los items
  useEffect(() => {
    if (!items) return;
    setOpenSections({});
  }, [items]);

  useEffect(() => {
    if (isExpanded) {
      setIsHamburgerOpen(false); setIsExpanded(false);
      if (tlRef.current) tlRef.current.progress(0).pause();
    }
  }, [location.pathname]);


  const calculateHeight = () => {
    const navEl = navRef.current;
    if (!navEl) return 260;
    const contentEl = navEl.querySelector('.card-nav-content');
    if (contentEl) {
      const wasVisible = contentEl.style.visibility;
      const wasPosition = contentEl.style.position;
      contentEl.style.visibility = 'visible'; contentEl.style.position = 'static';
      const topBar = 60; const padding = 0; const contentHeight = contentEl.scrollHeight;
      contentEl.style.visibility = wasVisible; contentEl.style.position = wasPosition;
      const finalHeight = topBar + contentHeight + padding;
      const maxHeight = window.innerHeight - 30; // Margen para que no desborde la pantalla abajo
      return Math.min(finalHeight, maxHeight);
    }
    return 260;
  };

  const createTimeline = (startOpen = false) => {
    const navEl = navRef.current;
    if (!navEl) return null;
    // Si el nav estaba abierto cuando items cambió, no lo colapsamos para evitar el freeze
    if (!startOpen) {
      gsap.set(navEl, { height: 60, overflow: 'hidden' });
      gsap.set(cardsRef.current, { y: 50, opacity: 0 });
    }
    const tl = gsap.timeline({ paused: true });
    tl.to(navEl, { height: calculateHeight, duration: 0.4, ease });
    tl.to(cardsRef.current, { y: 0, opacity: 1, duration: 0.4, ease, stagger: 0.08 }, '-=0.1');
    return tl;
  };

  useLayoutEffect(() => {
    const wasOpen = isExpandedRef.current;
    const tl = createTimeline(wasOpen);
    tlRef.current = tl;
    // Si estaba abierto cuando items cambió (ej. auth cargó tarde), restauramos el estado abierto
    if (wasOpen && tl) {
      tl.progress(1).pause();
    }
    return () => { tl?.kill(); tlRef.current = null; };
  }, [ease, items]);

  const closeMenu = () => {
    const tl = tlRef.current;
    if (!tl || !isExpanded) return;

    setIsHamburgerOpen(false);
    tl.eventCallback('onReverseComplete', () => setIsExpanded(false));
    tl.reverse();
  };
  closeMenuRef.current = closeMenu;

  const openMenu = () => {
    const tl = tlRef.current;
    if (!tl || isExpanded) return;

    setIsHamburgerOpen(true);
    setIsExpanded(true);
    // GSAP cachea la altura destino (función calculateHeight) la primera vez que
    // reproduce el timeline. Si el usuario abrió una sección del acordeón y luego
    // cerró el menú, openSections sigue activo pero la altura cacheada es la del
    // estado colapsado → al reabrir el contenido queda más alto que el nav y se
    // corta. invalidate() fuerza a recalcular calculateHeight con el estado real.
    tl.invalidate();
    tl.play(0);
    window.dispatchEvent(new CustomEvent('atletify:cardnav-open'));
  };

  const toggleMenu = () => {
    if (isExpanded) closeMenu();
    else openMenu();
  };

  const handleNavLinkClick = (href, event) => {
    // Developer sin box seleccionado: bloquear navegación y pedir que elija uno.
    if (usuario?.rol === 'Developer' && !boxActivo) {
      event.preventDefault();
      setShowSelectBoxModal(true);
      return;
    }
    // If user clicks the current route, avoid redundant navigation and just close safely.
    if (href === location.pathname) {
      event.preventDefault();
    }
    closeMenu();
  };

  const setCardRef = i => el => { if (el) cardsRef.current[i] = el; };
  const setLinksWrapRef = i => el => { if (el) linksWrapRefs.current[i] = el; };

  const isSectionOpen = (idx) => !!openSections[idx];

  const toggleSection = (idx) => {
    if (!isMobileNav) return;

    // Acordeón: cierra todas excepto la clickeada
    setOpenSections(prev => {
      const next = {};
      (items || []).forEach((_, i) => { next[i] = i === idx ? !prev[idx] : false; });
      return next;
    });

    // Recalcula la altura del nav tras la transición CSS (300ms)
    setTimeout(() => {
      if (navRef.current && isExpandedRef.current) {
        gsap.to(navRef.current, { height: calculateHeight(), duration: 0.25, ease: 'power2.out' });
      }
    }, 320);
  };

  return (
    <div className={`card-nav-container ${className}`}>
      <nav ref={navRef} className={`card-nav ${isExpanded ? 'open' : ''}`} style={{ backgroundColor: baseColor, border: '1px solid rgba(255,255,255,0.1)' }}>
        <div className="card-nav-top">
          <div className={`hamburger-menu ${isHamburgerOpen ? 'open' : ''}`} onClick={toggleMenu} role="button" tabIndex={0} style={{ color: menuColor || '#fff' }}>
            <div className="hamburger-line" /><div className="hamburger-line" />
          </div>

          <div 
            onClick={(e) => {
              e.preventDefault();
              if (clickTimeout.current) {
                clearTimeout(clickTimeout.current);
                clickTimeout.current = null;
                navigate('/');
                closeMenu();
              } else {
                clickTimeout.current = setTimeout(() => {
                  clickTimeout.current = null;
                  navigate(getHomeRoute());
                  closeMenu();
                }, 250);
              }
            }}
            className="text-decoration-none text-white hover-scale transition-all d-flex align-items-center gap-2" 
            style={{ cursor: 'pointer', userSelect: 'none' }}
          >
            <img src="/LogosDeAtletify/LogoBlanco.png" alt="Atletify System" style={{ height: '28px', width: '28px', objectFit: 'contain' }} />
            <span className="fw-bold" style={{ fontFamily: 'var(--font-heading-alt)', letterSpacing: '0.05em', fontSize: '0.95rem' }}>
              <span style={{ color: 'var(--primary)' }}>A</span>tletify{' '}
              <span style={{ color: 'var(--primary)' }}>S</span>ystem
            </span>
          </div>

          <div className="d-flex align-items-center gap-2 cardnav-right">

            {(usuario?.rol === 'Developer') && (
              <BoxPickerModal
                boxes={listaBoxes}
                boxSeleccionado={boxActivo}
                onChange={(boxId) => {
                  if (boxId === null) return;
                  const boxSel = listaBoxes.find(b => b.idBox === boxId);
                  if (boxSel) {
                    localStorage.setItem('box', JSON.stringify({
                      idBox: boxSel.idBox || boxSel.IdBox,
                      nombre: boxSel.nombre || boxSel.Nombre
                    }));
                    cambiarBox(boxId);
                    window.location.reload();
                  }
                }}
              />
            )}

            {/* Avatar del usuario — siempre visible en el top bar */}
            {usuario && (
              <button
                type="button"
                className="cardnav-avatar-btn"
                onClick={toggleMenu}
                title={`${usuario.nombre || 'Mi cuenta'} · ${usuario.rol}`}
              >
                {usuario.foto ? (
                  <img src={usuario.foto} alt={usuario.nombre} className="cardnav-avatar-img" />
                ) : (
                  <span className="cardnav-avatar-initial">
                    {(usuario.nombre || 'U').charAt(0).toUpperCase()}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>

        <div className="card-nav-content" aria-hidden={!isExpanded}>
          {(items || []).slice(0, 3).map((item, idx) => (
            <div key={`${item.label}-${idx}`} className="nav-card" ref={setCardRef(idx)} style={{ backgroundColor: item.bgColor, color: item.textColor, border: '1px solid rgba(255,255,255,0.05)' }}>
              <div
                className="nav-card-label fw-bold mb-2 nav-card-header"
                onClick={() => toggleSection(idx)}
                role="button"
                tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && toggleSection(idx)}
              >
                <span><i className={`fas ${item.icon} me-2 opacity-50`}></i>{item.label}</span>
                <i className={`fas fa-chevron-down nav-card-chevron ${isSectionOpen(idx) ? 'open' : ''}`}></i>
              </div>
              <div className={`nav-card-links-wrap ${isSectionOpen(idx) ? 'open' : 'collapsed'}`} ref={setLinksWrapRef(idx)}>
                <div className="nav-card-links">
                  {item.links?.map((lnk, i) => (
                    <Link key={`${lnk.label}-${i}`} className="nav-card-link text-white text-decoration-none py-1" to={lnk.href} onClick={(event) => handleNavLinkClick(lnk.href, event)}>
                      <GoArrowUpRight className="nav-card-link-icon text-secondary" aria-hidden="true" />
                      {lnk.label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          ))}

          <div className="card-nav-content-footer d-flex flex-column gap-2" ref={setCardRef((items || []).length)}>
            {/* Compact Account Switcher */}
            {cuentasGuardadas && cuentasGuardadas.length > 0 && (() => {
              const currentId = usuario?.idUsuario || usuario?.IdUsuario || usuario?.id || usuario?.Id;

              // Paleta de colores únicos (igual que Google/Slack) basada en el nombre
              const COLORS = [
                ['#6C63FF', '#8B5CF6'], ['#dc3545', '#ff6b6b'],
                ['#0ea5e9', '#38bdf8'], ['#10b981', '#34d399'],
                ['#f59e0b', '#fbbf24'], ['#ec4899', '#f472b6'],
                ['#14b8a6', '#2dd4bf'], ['#8b5cf6', '#a78bfa'],
              ];
              const getColor = (name = '') => {
                let hash = 0;
                for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
                return COLORS[Math.abs(hash) % COLORS.length];
              };

              const getRoleLabel = (rol) => {
                const map = { Developer: 'Dev', AdminBox: 'Admin', Coach: 'Coach', Atleta: 'Atleta', Usuario: 'Nuevo', Juez: 'Juez' };
                return map[rol] || rol;
              };

              return (
                <div style={{ padding: '6px 0 2px' }}>
                  <p style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 6px' }}>Cuentas</p>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', flexWrap: 'wrap' }}>
                    {cuentasGuardadas.map((c, i) => {
                      const cId = c.usuario?.idUsuario || c.usuario?.IdUsuario || c.usuario?.id || c.usuario?.Id;
                      const isActiva = String(cId) === String(currentId);
                      const foto = c.usuario?.fotoPerfilUrl || c.usuario?.foto;
                      const [colorA, colorB] = getColor(c.usuario?.nombre || '');
                      const inicial = c.usuario?.nombre?.charAt(0)?.toUpperCase() || '?';
                      const nombre = c.usuario?.nombre || 'Usuario';
                      const apellido = c.usuario?.apellidos?.split(' ')[0] || '';
                      const rol = getRoleLabel(c.usuario?.rol);

                      return (
                        <button
                          key={cId || i}
                          type="button"
                          className="border-0 p-0"
                          onClick={(e) => {
                            e.preventDefault();
                            if (!isActiva) {
                              // prepararCambioCuenta solo escribe en localStorage sin disparar
                              // setUsuario/setToken/setBoxActivo, evitando el re-render cascade
                              // que congela la UI antes de que el navegador procese la navegación.
                              const ok = prepararCambioCuenta(c);
                              if (ok) {
                                if (navRef.current) gsap.set(navRef.current, { height: 60, overflow: 'hidden' });
                                if (cardsRef.current.length) gsap.set(cardsRef.current, { y: 50, opacity: 0 });
                                setIsHamburgerOpen(false);
                                setIsExpanded(false);

                                const rol = c.usuario?.rol;
                                const idCompe = c.usuario?.idCompetenciaAsignada;
                                let route = '/user-panel';
                                if (rol === 'Developer') route = '/dashboard';
                                else if (rol === 'AdminBox') route = '/admin-box-panel';
                                else if (rol === 'Coach') route = '/admin-box-panel';
                                else if (rol === 'Atleta') route = '/user-panel';
                                else if (rol === 'Usuario') route = '/sala-espera';
                                else if (rol === 'Juez' && idCompe) route = `/juez/${idCompe}`;

                                if (window.location.pathname === route) {
                                  window.location.reload();
                                } else {
                                  window.location.href = route;
                                }
                              }
                            }
                          }}
                          style={{
                            background: 'none', cursor: isActiva ? 'default' : 'pointer',
                            display: 'flex', flexDirection: 'column', alignItems: 'center',
                            gap: '4px', opacity: isActiva ? 1 : 0.6,
                            transition: 'opacity 0.2s, transform 0.2s',
                            transform: isActiva ? 'scale(1.05)' : 'scale(1)',
                            width: '46px',
                          }}
                          onMouseEnter={e => { if (!isActiva) { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'scale(1.08)'; } }}
                          onMouseLeave={e => { if (!isActiva) { e.currentTarget.style.opacity = '0.6'; e.currentTarget.style.transform = 'scale(1)'; } }}
                        >
                          {/* Avatar circle */}
                          <div style={{
                            width: '38px', height: '38px', borderRadius: '50%',
                            overflow: 'hidden', flexShrink: 0,
                            border: isActiva ? `2.5px solid ${colorA}` : '2.5px solid rgba(255,255,255,0.1)',
                            boxShadow: isActiva ? `0 0 10px ${colorA}55` : 'none',
                            position: 'relative',
                          }}>
                            {foto ? (
                              <img src={foto} alt={nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <div style={{
                                width: '100%', height: '100%',
                                background: `linear-gradient(135deg, ${colorA}, ${colorB})`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: '#fff', fontSize: '1rem', fontWeight: 800,
                                fontFamily: 'Inter, sans-serif',
                              }}>
                                {inicial}
                              </div>
                            )}
                            {/* Dot indicador activo */}
                            {isActiva && (
                              <span style={{
                                position: 'absolute', bottom: '1px', right: '1px',
                                width: '9px', height: '9px', borderRadius: '50%',
                                background: '#22c55e', border: '1.5px solid #0a0a0a',
                              }} />
                            )}
                          </div>
                          {/* Nombre corto */}
                          <span style={{
                            fontSize: '0.55rem', color: isActiva ? '#fff' : 'rgba(255,255,255,0.5)',
                            fontWeight: isActiva ? 700 : 400, textAlign: 'center',
                            lineHeight: 1.2, maxWidth: '46px',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>
                            {nombre}
                          </span>
                          {/* Badge de rol */}
                          <span style={{
                            fontSize: '0.48rem', padding: '1px 4px', borderRadius: '4px',
                            background: isActiva ? colorA : 'rgba(255,255,255,0.08)',
                            color: isActiva ? '#fff' : 'rgba(255,255,255,0.4)',
                            fontWeight: 600, lineHeight: 1.4,
                          }}>
                            {rol}
                          </span>
                        </button>
                      );
                    })}
                    {cuentasGuardadas.length < 5 && (
                      <Link
                        to="/login?addAccount=true"
                        onClick={closeMenu}
                        title="Añadir cuenta"
                        style={{
                          display: 'flex', flexDirection: 'column', alignItems: 'center',
                          gap: '4px', textDecoration: 'none', width: '46px',
                        }}
                      >
                        <div style={{
                          width: '38px', height: '38px', borderRadius: '50%',
                          border: '2px dashed rgba(255,255,255,0.2)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#666', fontSize: '0.85rem', transition: 'all 0.2s',
                        }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = '#4FC3F7'; e.currentTarget.style.color = '#4FC3F7'; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; e.currentTarget.style.color = '#666'; }}
                        >
                          <i className="fas fa-plus" />
                        </div>
                        <span style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.3)' }}>Añadir</span>
                      </Link>
                    )}
                  </div>
                </div>
              );
            })()}


            <button
              type="button"
              onClick={onButtonClick}
              className="card-nav-cta-button card-nav-cta-inside w-100"
              style={{ backgroundColor: buttonBgColor, color: buttonTextColor, fontWeight: 'bold' }}
            >
              <i className="fas fa-sign-out-alt me-2"></i>
              {logo ? 'Cerrar Sesión Activa' : 'Ingresar'}
            </button>
          </div>
        </div>
      </nav>

      {showSelectBoxModal && createPortal(
        <div
          className="bpm-overlay"
          onClick={() => setShowSelectBoxModal(false)}
          style={{ zIndex: 10000 }}
        >
          <div
            className="bpm-panel"
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: '420px', textAlign: 'center' }}
          >
            <div className="bpm-header" style={{ flexDirection: 'column', alignItems: 'center', gap: '12px', borderBottom: 'none' }}>
              <div
                className="bpm-header-icon"
                style={{
                  width: '56px',
                  height: '56px',
                  fontSize: '1.6rem',
                  background: 'linear-gradient(135deg, var(--primary, #dc3545), #ff6b6b)',
                }}
              >
                <i className="fas fa-warehouse"></i>
              </div>
              <div>
                <p className="bpm-header-title" style={{ fontSize: '1.05rem', textAlign: 'center' }}>
                  Selecciona un Box
                </p>
                <p
                  className="bpm-header-sub"
                  style={{ textAlign: 'center', marginTop: '6px', lineHeight: 1.4 }}
                >
                  Para entrar a esta sección debes elegir un Box específico desde el selector del navbar.
                  Actualmente tienes <strong>"Todos los Boxes"</strong> activo.
                </p>
              </div>
            </div>

            <div style={{ padding: '8px 18px 18px', display: 'flex', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => setShowSelectBoxModal(false)}
                style={{
                  padding: '10px 22px',
                  border: 'none',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, var(--primary, #dc3545), #ff6b6b)',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  letterSpacing: '0.02em',
                  cursor: 'pointer',
                  boxShadow: '0 6px 18px rgba(220,53,69,0.35)',
                }}
              >
                <i className="fas fa-check me-2"></i>Entendido
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default CardNav;