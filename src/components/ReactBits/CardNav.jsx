import { useLayoutEffect, useRef, useState, useEffect } from 'react';
import { gsap } from 'gsap';
import { GoArrowUpRight } from 'react-icons/go';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from "../../context/AuthContext"; 
import './CardNav.css';
import { COMPETENCIAS_ENDPOINT } from '../../services/api';
import BoxPickerModal from '../BoxPickerModal';

const CardNav = ({
  logo, logoAlt = 'Logo', items, className = '', ease = 'power3.out',
  baseColor = '#fff', menuColor, buttonBgColor, buttonTextColor, onButtonClick
}) => {
  const [isHamburgerOpen, setIsHamburgerOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const navRef = useRef(null);
  const cardsRef = useRef([]);
  const tlRef = useRef(null);
  const location = useLocation();
  const [listaBoxes, setListaBoxes] = useState([]);
  
  // 👇 EXTRAEMOS EL USUARIO Y LA FUNCIÓN DE CAMBIAR BOX 👇
  const { usuario, boxActivo, cambiarBox, cuentasGuardadas, cambiarCuenta } = useAuth();

  const getHomeRoute = () => {
    if (!usuario) return '/';
    if (usuario.rol === 'Developer') return '/dashboard';
    if (usuario.rol === 'AdminBox' || usuario.rol === 'Coach') return '/admin-box-panel';
    if (usuario.rol === 'Atleta' || usuario.rol === 'Usuario') return '/user-panel';
    return '/';
  };

  useEffect(() => {
    if (isExpanded) {
      setIsHamburgerOpen(false); setIsExpanded(false);
      if (tlRef.current) tlRef.current.progress(0).pause();
    }
  }, [location.pathname]);

 // 👇 NUEVO: Buscamos los boxes en C# en cuanto carga el menú 👇
  useEffect(() => {
    if (usuario?.rol === 'Developer' || usuario?.rol === 'AdminBox') {
      const cargarBoxesReales = async () => {
        try {
          // Extraemos la URL base (ej. http://localhost:5000/api)
          const baseUrl = COMPETENCIAS_ENDPOINT.split('/competencias')[0];
          
          // Hacemos la petición (si tu controlador es singular, cambia '/boxes' por '/box')
          const res = await fetch(`${baseUrl}/box`);
          const data = await res.json();
          
          // Escudo: Solo guardamos si realmente nos devolvió una lista
          if (Array.isArray(data)) {
            setListaBoxes(data);
          } else {
            console.error("La API devolvió algo que no es una lista:", data);
            // Si la API devolvió un 1 u otra cosa, evitamos que el .map() explote.
          }
        } catch (error) {
          console.error("Error de red al cargar los boxes reales", error);
        }
      };
      cargarBoxesReales();
    }
  }, [usuario]);

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
      return topBar + contentHeight + padding;
    }
    return 260;
  };

  const createTimeline = () => {
    const navEl = navRef.current;
    if (!navEl) return null;
    gsap.set(navEl, { height: 60, overflow: 'hidden' });
    gsap.set(cardsRef.current, { y: 50, opacity: 0 });
    const tl = gsap.timeline({ paused: true });
    tl.to(navEl, { height: calculateHeight, duration: 0.4, ease });
    tl.to(cardsRef.current, { y: 0, opacity: 1, duration: 0.4, ease, stagger: 0.08 }, '-=0.1');
    return tl;
  };

  useLayoutEffect(() => {
    const tl = createTimeline(); tlRef.current = tl;
    return () => { tl?.kill(); tlRef.current = null; };
  }, [ease, items]);

  const closeMenu = () => {
    const tl = tlRef.current;
    if (!tl || !isExpanded) return;

    setIsHamburgerOpen(false);
    tl.eventCallback('onReverseComplete', () => setIsExpanded(false));
    tl.reverse();
  };

  const openMenu = () => {
    const tl = tlRef.current;
    if (!tl || isExpanded) return;

    setIsHamburgerOpen(true);
    setIsExpanded(true);
    tl.play(0);
  };

  const toggleMenu = () => {
    if (isExpanded) closeMenu();
    else openMenu();
  };

  const handleNavLinkClick = (href, event) => {
    // If user clicks the current route, avoid redundant navigation and just close safely.
    if (href === location.pathname) {
      event.preventDefault();
    }
    closeMenu();
  };

  const setCardRef = i => el => { if (el) cardsRef.current[i] = el; };

  return (
    <div className={`card-nav-container ${className}`}>
      <nav ref={navRef} className={`card-nav ${isExpanded ? 'open' : ''}`} style={{ backgroundColor: baseColor, border: '1px solid rgba(255,255,255,0.1)' }}>
        <div className="card-nav-top">
          <div className={`hamburger-menu ${isHamburgerOpen ? 'open' : ''}`} onClick={toggleMenu} role="button" tabIndex={0} style={{ color: menuColor || '#fff' }}>
            <div className="hamburger-line" /><div className="hamburger-line" />
          </div>

          <Link to={getHomeRoute()} className="text-decoration-none text-white hover-scale transition-all d-flex align-items-center gap-2" style={{ cursor: 'pointer' }}>
            <img src="/LogosDeAtletify/LogoBlanco.png" alt="Atletify System" style={{ height: '28px', width: '28px', objectFit: 'contain' }} />
            <span className="fw-bold" style={{ fontFamily: 'var(--font-heading-alt)', letterSpacing: '0.05em', fontSize: '0.95rem' }}>
              <span style={{ color: 'var(--primary)' }}>A</span>tletify{' '}
              <span style={{ color: 'var(--primary)' }}>S</span>ystem
            </span>
          </Link>

          <div className="d-flex align-items-center gap-3">
           
       
            {(usuario?.rol === 'Developer' ) && (
              <BoxPickerModal
                boxes={listaBoxes.map(b => ({ idBox: b.idBox || b.IdBox, nombre: b.nombre || b.Nombre }))}
                boxSeleccionado={boxActivo}
                onChange={(boxId) => {
                  if (boxId === null) return;
                  const boxSel = listaBoxes.find(b => (b.idBox || b.IdBox) === boxId);
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
          </div>
        </div>

        <div className="card-nav-content" aria-hidden={!isExpanded}>
          {(items || []).slice(0, 3).map((item, idx) => (
            <div key={`${item.label}-${idx}`} className="nav-card" ref={setCardRef(idx)} style={{ backgroundColor: item.bgColor, color: item.textColor, border: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="nav-card-label fw-bold mb-2"><i className={`fas ${item.icon} me-2 opacity-50`}></i>{item.label}</div>
              <div className="nav-card-links">
                {item.links?.map((lnk, i) => (
                  <Link key={`${lnk.label}-${i}`} className="nav-card-link text-white text-decoration-none py-1" to={lnk.href} onClick={(event) => handleNavLinkClick(lnk.href, event)}>
                    <GoArrowUpRight className="nav-card-link-icon text-secondary" aria-hidden="true" />
                    {lnk.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}

          <div className="card-nav-content-footer d-flex flex-column gap-2" ref={setCardRef((items || []).length)}>
            {/* Compact Account Switcher */}
            {cuentasGuardadas && cuentasGuardadas.length > 0 && (() => {
              const currentId = usuario?.idUsuario || usuario?.IdUsuario || usuario?.id || usuario?.Id;

              // Paleta de colores únicos (igual que Google/Slack) basada en el nombre
              const COLORS = [
                ['#6C63FF','#8B5CF6'], ['#dc3545','#ff6b6b'],
                ['#0ea5e9','#38bdf8'], ['#10b981','#34d399'],
                ['#f59e0b','#fbbf24'], ['#ec4899','#f472b6'],
                ['#14b8a6','#2dd4bf'], ['#8b5cf6','#a78bfa'],
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
                <div style={{padding: '6px 0 2px'}}>
                  <p style={{fontSize: '0.6rem', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 6px'}}>Cuentas</p>
                  <div style={{display: 'flex', alignItems: 'flex-start', gap: '8px', flexWrap: 'wrap'}}>
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
                              const ok = cambiarCuenta(c);
                              if (ok) {
                                closeMenu();
                                const rol = c.usuario?.rol;
                                const idCompe = c.usuario?.idCompetenciaAsignada;
                                let route = '/user-panel';
                                if (rol === 'Developer')            route = '/dashboard';
                                else if (rol === 'AdminBox')        route = '/admin-box-panel';
                                else if (rol === 'Coach')           route = '/admin-box-panel';
                                else if (rol === 'Atleta')          route = '/user-panel';
                                else if (rol === 'Usuario')         route = '/sala-espera';
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
                          onMouseEnter={e => { if (!isActiva) { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'scale(1.08)'; }}}
                          onMouseLeave={e => { if (!isActiva) { e.currentTarget.style.opacity = '0.6'; e.currentTarget.style.transform = 'scale(1)'; }}}
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
                              <img src={foto} alt={nombre} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
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
                        <span style={{fontSize: '0.5rem', color: 'rgba(255,255,255,0.3)'}}>Añadir</span>
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
    </div>
  );
};

export default CardNav;