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
  const { usuario, boxActivo, cambiarBox } = useAuth();

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

          <Link to="/" className="text-decoration-none text-white hover-scale transition-all d-flex align-items-center gap-2" style={{ cursor: 'pointer' }}>
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

          <div className="card-nav-content-footer" ref={setCardRef((items || []).length)}>
            <button
              type="button"
              onClick={onButtonClick}
              className="card-nav-cta-button card-nav-cta-inside"
              style={{ backgroundColor: buttonBgColor, color: buttonTextColor, fontWeight: 'bold' }}
            >
              {logo ? 'Cerrar Sesión' : 'Ingresar'}
            </button>
          </div>
        </div>
      </nav>
    </div>
  );
};

export default CardNav;