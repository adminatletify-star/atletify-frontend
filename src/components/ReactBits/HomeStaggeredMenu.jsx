import React, { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { useNavigate, Link } from 'react-router-dom';
import './HomeStaggeredMenu.css';
import { useAuth } from '../../context/AuthContext';

export const HomeStaggeredMenu = ({
  position = 'right',
  displayItemNumbering = true,
  className,
  isFixed = true,
  closeOnClickAway = true,
  onMenuOpen,
  onMenuClose,
  user = null,
  dropdownOpen = false,
  setDropdownOpen = () => {},
  handleProfileClick = () => {},
  dropdownRef = null
}) => {
  const { usuario, cuentasGuardadas, cambiarCuenta } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const openRef = useRef(false);
  const panelRef = useRef(null);
  const preLayersRef = useRef(null);
  const preLayerElsRef = useRef([]);
  const plusHRef = useRef(null);
  const plusVRef = useRef(null);
  const iconRef = useRef(null);
  const textInnerRef = useRef(null);
  const textWrapRef = useRef(null);
  const [textLines, setTextLines] = useState(['Menu', 'Close']);

  const openTlRef = useRef(null);
  const closeTweenRef = useRef(null);
  const spinTweenRef = useRef(null);
  const textCycleAnimRef = useRef(null);
  const colorTweenRef = useRef(null);
  const toggleBtnRef = useRef(null);
  const busyRef = useRef(false);
  const itemEntranceTweenRef = useRef(null);

  // Colores para la paleta rojo/oscuro
  const colors = ['#1a0000', '#3d0000', '#8B0000'];
  const menuButtonColor = '#fff';
  const openMenuButtonColor = '#fff';
  const accentColor = '#dc3545';

  // Opciones del menú
  const menuItems = [
    {
      label: 'Todo',
      onClick: () => {
        // No hace nada, solo cierra el menú
      }
    },
    {
      label: 'Nosotros',
      onClick: () => {
        navigate('/sobre-nosotros');
      }
    },
    {
      label: 'Boxes',
      onClick: () => {
        navigate('/directorio-boxes');
      }
    },
    {
      label: 'Competencias',
      onClick: () => {
        navigate('/competencias');
      }
    },
    {
      label: 'Historial de compes',
      onClick: () => {
        navigate('/historial-competencias');
      }
    },
    {
      label: 'Simulador de Barra',
      onClick: () => {
        navigate('/simulador-barra-publico');
      }
    },
    {
      label: 'WolfPack',
      onClick: () => {
        navigate('/wolfpack');
      }
    },
    {
      label: 'Ejercicios',
      onClick: () => {
        navigate('/ejercicios');
      }
    }
  ];

  if (!user) {
    menuItems.push({
      label: 'Drop-In (Soy Turista)',
      onClick: () => {
        navigate('/public-drop-in');
      }
    });
  }

  const userToDisplay = user || usuario;

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const panel = panelRef.current;
      const preContainer = preLayersRef.current;
      const plusH = plusHRef.current;
      const plusV = plusVRef.current;
      const icon = iconRef.current;
      const textInner = textInnerRef.current;
      if (!panel || !plusH || !plusV || !icon || !textInner) return;

      let preLayers = [];
      if (preContainer) {
        preLayers = Array.from(preContainer.querySelectorAll('.hsm-prelayer'));
      }
      preLayerElsRef.current = preLayers;

      const offscreen = position === 'left' ? -100 : 100;
      gsap.set([panel, ...preLayers], { xPercent: offscreen });
      gsap.set(plusH, { transformOrigin: '50% 50%', rotate: 0 });
      gsap.set(plusV, { transformOrigin: '50% 50%', rotate: 90 });
      gsap.set(icon, { rotate: 0, transformOrigin: '50% 50%' });
      gsap.set(textInner, { yPercent: 0 });
      if (toggleBtnRef.current) gsap.set(toggleBtnRef.current, { color: menuButtonColor });
    });
    return () => ctx.revert();
  }, [position]);

  const buildOpenTimeline = useCallback(() => {
    const panel = panelRef.current;
    const layers = preLayerElsRef.current;
    if (!panel) return null;

    openTlRef.current?.kill();
    if (closeTweenRef.current) {
      closeTweenRef.current.kill();
      closeTweenRef.current = null;
    }
    itemEntranceTweenRef.current?.kill();

    const itemEls = Array.from(panel.querySelectorAll('.hsm-panel-itemLabel'));
    const numberEls = Array.from(panel.querySelectorAll('.hsm-panel-list[data-numbering] .hsm-panel-item'));

    const layerStates = layers.map(el => ({ el, start: Number(gsap.getProperty(el, 'xPercent')) }));
    const panelStart = Number(gsap.getProperty(panel, 'xPercent'));

    if (itemEls.length) {
      gsap.set(itemEls, { yPercent: 140, rotate: 10 });
    }
    if (numberEls.length) {
      gsap.set(numberEls, { '--hsm-num-opacity': 0 });
    }

    const tl = gsap.timeline({ paused: true });

    layerStates.forEach((ls, i) => {
      tl.fromTo(ls.el, { xPercent: ls.start }, { xPercent: 0, duration: 0.5, ease: 'power4.out' }, i * 0.07);
    });
    const lastTime = layerStates.length ? (layerStates.length - 1) * 0.07 : 0;
    const panelInsertTime = lastTime + (layerStates.length ? 0.08 : 0);
    const panelDuration = 0.65;
    tl.fromTo(
      panel,
      { xPercent: panelStart },
      { xPercent: 0, duration: panelDuration, ease: 'power4.out' },
      panelInsertTime
    );

    if (itemEls.length) {
      const itemsStartRatio = 0.15;
      const itemsStart = panelInsertTime + panelDuration * itemsStartRatio;
      tl.to(
        itemEls,
        {
          yPercent: 0,
          rotate: 0,
          duration: 1,
          ease: 'power4.out',
          stagger: { each: 0.1, from: 'start' }
        },
        itemsStart
      );
      if (numberEls.length) {
        tl.to(
          numberEls,
          {
            duration: 0.6,
            ease: 'power2.out',
            '--hsm-num-opacity': 1,
            stagger: { each: 0.08, from: 'start' }
          },
          itemsStart + 0.1
        );
      }
    }

    openTlRef.current = tl;
    return tl;
  }, []);

  const playOpen = useCallback(() => {
    if (busyRef.current) return;
    busyRef.current = true;
    const tl = buildOpenTimeline();
    if (tl) {
      tl.eventCallback('onComplete', () => {
        busyRef.current = false;
      });
      tl.play(0);
    } else {
      busyRef.current = false;
    }
  }, [buildOpenTimeline]);

  const playClose = useCallback(() => {
    openTlRef.current?.kill();
    openTlRef.current = null;
    itemEntranceTweenRef.current?.kill();

    const panel = panelRef.current;
    const layers = preLayerElsRef.current;
    if (!panel) return;

    const all = [...layers, panel];
    closeTweenRef.current?.kill();
    const offscreen = position === 'left' ? -100 : 100;
    closeTweenRef.current = gsap.to(all, {
      xPercent: offscreen,
      duration: 0.32,
      ease: 'power3.in',
      overwrite: 'auto',
      onComplete: () => {
        const itemEls = Array.from(panel.querySelectorAll('.hsm-panel-itemLabel'));
        if (itemEls.length) {
          gsap.set(itemEls, { yPercent: 140, rotate: 10 });
        }
        const numberEls = Array.from(panel.querySelectorAll('.hsm-panel-list[data-numbering] .hsm-panel-item'));
        if (numberEls.length) {
          gsap.set(numberEls, { '--hsm-num-opacity': 0 });
        }
        busyRef.current = false;
      }
    });
  }, [position]);

  const animateIcon = useCallback(opening => {
    const icon = iconRef.current;
    if (!icon) return;
    spinTweenRef.current?.kill();
    if (opening) {
      spinTweenRef.current = gsap.to(icon, { rotate: 225, duration: 0.8, ease: 'power4.out', overwrite: 'auto' });
    } else {
      spinTweenRef.current = gsap.to(icon, { rotate: 0, duration: 0.35, ease: 'power3.inOut', overwrite: 'auto' });
    }
  }, []);

  const animateColor = useCallback(
    opening => {
      const btn = toggleBtnRef.current;
      if (!btn) return;
      colorTweenRef.current?.kill();
      const targetColor = opening ? openMenuButtonColor : menuButtonColor;
      colorTweenRef.current = gsap.to(btn, {
        color: targetColor,
        delay: 0.18,
        duration: 0.3,
        ease: 'power2.out'
      });
    },
    []
  );

  const animateText = useCallback(opening => {
    const inner = textInnerRef.current;
    if (!inner) return;
    textCycleAnimRef.current?.kill();

    const currentLabel = opening ? 'Menu' : 'Close';
    const targetLabel = opening ? 'Close' : 'Menu';
    const cycles = 3;
    const seq = [currentLabel];
    let last = currentLabel;
    for (let i = 0; i < cycles; i++) {
      last = last === 'Menu' ? 'Close' : 'Menu';
      seq.push(last);
    }
    if (last !== targetLabel) seq.push(targetLabel);
    seq.push(targetLabel);
    setTextLines(seq);

    gsap.set(inner, { yPercent: 0 });
    const lineCount = seq.length;
    const finalShift = ((lineCount - 1) / lineCount) * 100;
    textCycleAnimRef.current = gsap.to(inner, {
      yPercent: -finalShift,
      duration: 0.5 + lineCount * 0.07,
      ease: 'power4.out'
    });
  }, []);

  const toggleMenu = useCallback(() => {
    const target = !openRef.current;
    openRef.current = target;
    setOpen(target);
    if (target) {
      onMenuOpen?.();
      playOpen();
    } else {
      onMenuClose?.();
      playClose();
    }
    animateIcon(target);
    animateColor(target);
    animateText(target);
  }, [playOpen, playClose, animateIcon, animateColor, animateText, onMenuOpen, onMenuClose]);

  const closeMenu = useCallback(() => {
    if (openRef.current) {
      openRef.current = false;
      setOpen(false);
      onMenuClose?.();
      playClose();
      animateIcon(false);
      animateColor(false);
      animateText(false);
    }
  }, [playClose, animateIcon, animateColor, animateText, onMenuClose]);

  React.useEffect(() => {
    if (!closeOnClickAway || !open) return;

    const handleClickOutside = event => {
      if (
        panelRef.current &&
        !panelRef.current.contains(event.target) &&
        toggleBtnRef.current &&
        !toggleBtnRef.current.contains(event.target)
      ) {
        closeMenu();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [closeOnClickAway, open, closeMenu]);

  // Cerrar dropdown del perfil si se hace clic afuera
  React.useEffect(() => {
    if (!dropdownOpen) return;

    const handleClickOutside = event => {
      if (dropdownRef?.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen, setDropdownOpen, dropdownRef]);

  return (
    <div
      className={(className ? className + ' ' : '') + 'home-staggered-menu-wrapper' + (isFixed ? ' fixed-wrapper' : '')}
      style={{ ['--hsm-accent']: accentColor }}
      data-position={position}
      data-open={open || undefined}
    >
      <div ref={preLayersRef} className="hsm-prelayers" aria-hidden="true">
        {colors.map((c, i) => <div key={i} className="hsm-prelayer" style={{ background: c }} />)}
      </div>

      <header className="home-staggered-menu-header" aria-label="Home Menu">
        <button
          ref={toggleBtnRef}
          className="hsm-toggle"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          aria-controls="home-staggered-menu-panel"
          onClick={toggleMenu}
          type="button"
        >
          <span ref={textWrapRef} className="hsm-toggle-textWrap" aria-hidden="true">
            <span ref={textInnerRef} className="hsm-toggle-textInner">
              {textLines.map((l, i) => (
                <span className="hsm-toggle-line" key={i}>
                  {l}
                </span>
              ))}
            </span>
          </span>
          <span ref={iconRef} className="hsm-icon" aria-hidden="true">
            <span ref={plusHRef} className="hsm-icon-line" />
            <span ref={plusVRef} className="hsm-icon-line hsm-icon-line-v" />
          </span>
        </button>
      </header>

      <aside id="home-staggered-menu-panel" ref={panelRef} className="home-staggered-menu-panel" aria-hidden={!open}>
        <div className="hsm-panel-inner">
          <ul className="hsm-panel-list" role="list" data-numbering={displayItemNumbering || undefined}>
            {menuItems.map((item, idx) => (
              <li className="hsm-panel-itemWrap" key={item.label + idx}>
                <a
                  className="hsm-panel-item"
                  href="#"
                  aria-label={item.label}
                  data-index={idx + 1}
                  onClick={(e) => {
                    e.preventDefault();
                    if (item.onClick) {
                      item.onClick();
                    }
                    closeMenu();
                  }}
                >
                  <span className="hsm-panel-itemLabel">{item.label}</span>
                </a>
              </li>
            ))}
          </ul>

          {/* Profile Section at Bottom */}
          <div className="hsm-profile-section" ref={dropdownRef}>
            <button
              className="hsm-profile-btn"
              onClick={(e) => {
                e.stopPropagation();
                setDropdownOpen(!dropdownOpen);
              }}
              type="button"
              aria-expanded={dropdownOpen}
              title={userToDisplay ? userToDisplay.nombre : 'Iniciar sesión'}
              style={{display: 'flex', alignItems: 'center', gap: '8px'}}
            >
              {/* Mostrar avatar del usuario activo en el botón */}
              {userToDisplay ? (() => {
                const foto = userToDisplay?.foto;
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
                const [colorA, colorB] = getColor(userToDisplay.nombre || '');
                return (
                  <div style={{
                    width: '22px', height: '22px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
                    border: `2px solid ${colorA}`,
                  }}>
                    {foto
                      ? <img src={foto} alt={userToDisplay.nombre} style={{width:'100%',height:'100%',objectFit:'cover'}} />
                      : <div style={{width:'100%',height:'100%',background:`linear-gradient(135deg,${colorA},${colorB})`,display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:'0.6rem',fontWeight:800}}>
                          {userToDisplay.nombre?.charAt(0)?.toUpperCase()}
                        </div>
                    }
                  </div>
                );
              })() : <i className="fas fa-user" />}
              <span>{userToDisplay ? userToDisplay.nombre?.split(' ')[0] : 'Cuenta'}</span>
            </button>

            {dropdownOpen && (() => {
              const currentId = userToDisplay?.idUsuario || userToDisplay?.IdUsuario || userToDisplay?.id || userToDisplay?.Id;

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
              <div className="hsm-profile-dropdown">
                {cuentasGuardadas && cuentasGuardadas.length > 0 ? (
                  <>
                    {/* Premium avatar grid */}
                    <div style={{padding: '12px 14px 8px'}}>
                      <p style={{fontSize: '0.58rem', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 10px'}}>Cuentas</p>
                      <div style={{display: 'flex', alignItems: 'flex-start', gap: '10px', flexWrap: 'wrap'}}>
                        {cuentasGuardadas.map((c, i) => {
                          const cId = c.usuario?.idUsuario || c.usuario?.IdUsuario || c.usuario?.id || c.usuario?.Id;
                          const isActiva = String(cId) === String(currentId);
                          const foto = c.usuario?.foto;
                          const [colorA, colorB] = getColor(c.usuario?.nombre || '');
                          const inicial = c.usuario?.nombre?.charAt(0)?.toUpperCase() || '?';
                          const nombre = c.usuario?.nombre || 'Usuario';
                          const rol = getRoleLabel(c.usuario?.rol);

                          return (
                            <button
                              key={cId || i}
                              className="border-0 p-0"
                              onClick={() => {
                                if (!isActiva) {
                                  const ok = cambiarCuenta(c);
                                  if (ok) {
                                    setDropdownOpen(false);
                                    closeMenu();
                                    const rol = c.usuario?.rol;
                                    const idCompe = c.usuario?.idCompetenciaAsignada;
                                    let route = '/user-panel';
                                    if (rol === 'Developer')                  route = '/dashboard';
                                    else if (rol === 'AdminBox')              route = '/admin-box-panel';
                                    else if (rol === 'Coach')                 route = '/admin-box-panel';
                                    else if (rol === 'Atleta')                route = '/user-panel';
                                    else if (rol === 'Usuario')               route = '/sala-espera';
                                    else if (rol === 'Juez' && idCompe)       route = `/juez/${idCompe}`;
                                    window.location.href = route;
                                  }
                                }
                              }}
                              style={{
                                background: 'none', cursor: isActiva ? 'default' : 'pointer',
                                display: 'flex', flexDirection: 'column', alignItems: 'center',
                                gap: '4px', opacity: isActiva ? 1 : 0.6,
                                transition: 'opacity 0.2s, transform 0.2s',
                                transform: isActiva ? 'scale(1.05)' : 'scale(1)',
                                width: '50px',
                              }}
                              onMouseEnter={e => { if (!isActiva) { e.currentTarget.style.opacity='1'; e.currentTarget.style.transform='scale(1.08)'; }}}
                              onMouseLeave={e => { if (!isActiva) { e.currentTarget.style.opacity='0.6'; e.currentTarget.style.transform='scale(1)'; }}}
                            >
                              {/* Avatar */}
                              <div style={{
                                width: '40px', height: '40px', borderRadius: '50%', overflow: 'hidden',
                                border: isActiva ? `2.5px solid ${colorA}` : '2.5px solid rgba(255,255,255,0.1)',
                                boxShadow: isActiva ? `0 0 12px ${colorA}55` : 'none',
                                position: 'relative',
                              }}>
                                {foto
                                  ? <img src={foto} alt={nombre} style={{width:'100%',height:'100%',objectFit:'cover'}} />
                                  : <div style={{width:'100%',height:'100%',background:`linear-gradient(135deg,${colorA},${colorB})`,display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:'1.05rem',fontWeight:800,fontFamily:'Inter,sans-serif'}}>
                                      {inicial}
                                    </div>
                                }
                                {isActiva && (
                                  <span style={{position:'absolute',bottom:'1px',right:'1px',width:'10px',height:'10px',borderRadius:'50%',background:'#22c55e',border:'1.5px solid #111'}} />
                                )}
                              </div>
                              {/* Nombre */}
                              <span style={{fontSize:'0.58rem',color:isActiva?'#fff':'rgba(255,255,255,0.5)',fontWeight:isActiva?700:400,textAlign:'center',lineHeight:1.2,maxWidth:'50px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                                {nombre}
                              </span>
                              {/* Badge rol */}
                              <span style={{fontSize:'0.5rem',padding:'1px 5px',borderRadius:'4px',background:isActiva?colorA:'rgba(255,255,255,0.08)',color:isActiva?'#fff':'rgba(255,255,255,0.4)',fontWeight:600,lineHeight:1.4}}>
                                {rol}
                              </span>
                            </button>
                          );
                        })}
                        {cuentasGuardadas.length < 5 && (
                          <Link
                            to="/login?addAccount=true"
                            onClick={() => { setDropdownOpen(false); closeMenu(); }}
                            style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'4px',textDecoration:'none',width:'50px'}}
                          >
                            <div style={{width:'40px',height:'40px',borderRadius:'50%',border:'2px dashed rgba(255,255,255,0.2)',display:'flex',alignItems:'center',justifyContent:'center',color:'#666',fontSize:'0.9rem',transition:'all 0.2s'}}
                              onMouseEnter={e=>{e.currentTarget.style.borderColor='#4FC3F7';e.currentTarget.style.color='#4FC3F7';}}
                              onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(255,255,255,0.2)';e.currentTarget.style.color='#666';}}
                            >
                              <i className="fas fa-plus" />
                            </div>
                            <span style={{fontSize:'0.52rem',color:'rgba(255,255,255,0.3)'}}>Añadir</span>
                          </Link>
                        )}
                      </div>
                    </div>

                    
                    {/* Go to panel button */}
                    {userToDisplay && (
                      <>
                        <div className="hsm-dropdown-divider"></div>
                        <button
                          className="hsm-dropdown-item w-100 text-start border-0 bg-transparent"
                          onClick={() => {
                            setDropdownOpen(false);
                            closeMenu();
                            const route = userToDisplay.rol === 'Developer' ? '/dashboard'
                              : userToDisplay.rol === 'Atleta' || userToDisplay.rol === 'Usuario' ? '/user-panel'
                                : '/admin-box-panel';
                            navigate(route);
                          }}
                        >
                          <i className="fas fa-arrow-right me-2"></i>
                          Ir a mi panel
                        </button>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <Link
                      to="/login"
                      className="hsm-dropdown-item"
                      onClick={() => {
                        setDropdownOpen(false);
                        closeMenu();
                      }}
                    >
                      <i className="fas fa-sign-in-alt me-2"></i>
                      Iniciar Sesión
                    </Link>
                    <div className="hsm-dropdown-divider"></div>
                    <Link
                      to="/directorio-boxes"
                      className="hsm-dropdown-item"
                      onClick={() => {
                        setDropdownOpen(false);
                        closeMenu();
                      }}
                    >
                      <i className="fas fa-user-plus me-2"></i>
                      Registrarme
                    </Link>
                  </>
                )}
              </div>
              );
            })()}
          </div>
        </div>
      </aside>
    </div>
  );
};

export default HomeStaggeredMenu;
