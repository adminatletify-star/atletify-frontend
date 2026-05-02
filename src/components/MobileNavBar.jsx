import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import './MobileNavBar.css';

/* ── Items estáticos — modo público (Home.jsx sin props) ── */
const NAV_ITEMS = [
  { id: 'home',      icon: 'fas fa-home',        label: 'Inicio'  },
  { id: 'wods',      icon: 'fas fa-dumbbell',    label: 'WODs'    },
  { id: 'comunidad', icon: 'fas fa-users',        label: 'Manada'  },
  { id: 'ranking',   icon: 'fas fa-medal',        label: 'Ranking' },
  { id: 'perfil',    icon: 'fas fa-user-circle',  label: 'Perfil'  },
];

/* ── Constantes de física — movimiento suave y fluido ── */
const SPRING       = 0.038;  // más lento = arranque suave
const DAMPING      = 0.78;   // más amortiguación = sin rebote brusco
const MASS         = 1.4;    // más inercia = deslizamiento sedoso
const STRETCH_IDLE = 0.030;  // deformación mínima en reposo
const STRETCH_DRAG = 0.08;   // deformación moderada al arrastrar
const MAX_DEFORM   = 0.25;   // tope de estiramiento reducido
const PRESS_SQ     = 0.90;   // squish suave al presionar

const IS_MOBILE = typeof window !== 'undefined' &&
  (window.innerWidth < 768 || 'ontouchstart' in window);

export default function MobileNavBar({ navItems = [], homeRoute = '/', onLogout }) {
  const navigate  = useNavigate();
  const isDynamic = Array.isArray(navItems) && navItems.length > 0;

  /* ── Tabs según modo ──
     Modo estático (Home): 5 items fijos, sin navegación real
     Modo dinámico (Layout): Inicio + hasta 3 grupos de navItems  */
  const TABS = isDynamic
    ? [
        { id: 'inicio', icon: 'fas fa-home', label: 'Inicio' },
        ...(navItems[0] ? [{ id: 'tab0', icon: `fas ${navItems[0].icon}`, label: navItems[0].label }] : []),
        ...(navItems[1] ? [{ id: 'tab1', icon: `fas ${navItems[1].icon}`, label: navItems[1].label }] : []),
        ...(navItems[2] ? [{ id: 'tab2', icon: `fas ${navItems[2].icon}`, label: navItems[2].label }] : []),
      ]
    : NAV_ITEMS;

  /* Ref para callbacks de física — siempre fresco sin recrear callbacks */
  const tabsRef = useRef(TABS);
  tabsRef.current = TABS;

  /* ── Estado React ── */
  const [active,     setActive]     = useState(TABS[0].id);
  const [isPressed,  setIsPressed]  = useState(false);
  const [openDrawer, setOpenDrawer] = useState(null); // null | tab.id

  /* Sincronizar active cuando el modo cambia (usuario carga) */
  useEffect(() => {
    setActive(tabsRef.current[0].id);
    setOpenDrawer(null);
  }, [isDynamic]);

  /* ── Refs del DOM ── */
  const navRef   = useRef(null);
  const blobRef  = useRef(null);
  const svgRef   = useRef(null);
  const itemRefs = useRef({});
  const raf      = useRef(null);

  /* ── Estado interno de física (no React state → 60fps) ── */
  const phys = useRef({
    x: 0, y: 0,
    vx: 0, vy: 0,
    targetX: 0, targetY: 0,
    w: 58, h: 54,
    dragging:    false,
    pressed:     false,
    dragStartX:  0,
    dragOffsetX: 0,
    navLeft: 0, navTop: 0,
    navWidth: 0, navHeight: 0,
    wobbleY:   0,
    wobbleVY:  0,
    prevVx:    0,
    previewId: null,
  });

  /* ── Obtener centro de un ítem ── */
  const getItemCenter = useCallback((id) => {
    const btn = itemRefs.current[id];
    const nav = navRef.current;
    if (!btn || !nav) return null;
    const nr = nav.getBoundingClientRect();
    const br = btn.getBoundingClientRect();
    return {
      x: br.left - nr.left + br.width  / 2,
      y: br.top  - nr.top  + br.height / 2,
      w: br.width  + 12,
      h: br.height + 10,
    };
  }, []);

  /* ── Encontrar el ítem más cercano a una posición X ── */
  const findClosestItem = useCallback((px) => {
    let closest = tabsRef.current[0].id;
    let minDist = Infinity;
    tabsRef.current.forEach(item => {
      const c = getItemCenter(item.id);
      if (!c) return;
      const d = Math.abs(c.x - px);
      if (d < minDist) { minDist = d; closest = item.id; }
    });
    return closest;
  }, [getItemCenter]);

  /* ── Snap al target (ítem activo) ── */
  const snapTo = useCallback((id) => {
    const c = getItemCenter(id);
    if (!c) return;
    const p      = phys.current;
    p.targetX = c.x;
    p.targetY = c.y;
    p.w = c.w;
    p.h = c.h;
  }, [getItemCenter]);

  /* ── Bucle de física a 60fps — líquido viscoso ── */
  const tick = useCallback(() => {
    const p    = phys.current;
    const blob = blobRef.current;
    const svg  = svgRef.current;
    if (!blob || !svg) { raf.current = requestAnimationFrame(tick); return; }

    if (!p.dragging) {
      const dx = p.targetX - p.x;
      const dy = p.targetY - p.y;
      const ax = (SPRING * dx) / MASS;
      const ay = (SPRING * dy) / MASS;
      p.vx = (p.vx + ax) * DAMPING;
      p.vy = (p.vy + ay) * DAMPING;
      p.x += p.vx;
      p.y += p.vy;
    }

    // Wobble secundario en Y — genera onda líquida cuando cambia la velocidad X
    const rawAccelX = p.vx - p.prevVx;
    const accelX    = Math.max(-8, Math.min(8, rawAccelX));
    p.prevVx = p.vx;
    p.wobbleVY += accelX * 0.12;
    p.wobbleVY += (-p.wobbleY) * 0.28;
    p.wobbleVY *= 0.72;
    p.wobbleVY  = Math.max(-3, Math.min(3, p.wobbleVY));
    p.wobbleY  += p.wobbleVY;
    p.wobbleY   = Math.max(-2.5, Math.min(2.5, p.wobbleY));

    // Deformación viscosa
    const speed   = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
    const stretch = p.dragging ? STRETCH_DRAG : STRETCH_IDLE;
    let stretchX, stretchY;

    if (IS_MOBILE) {
      stretchX = 1 + Math.min(Math.abs(p.vx) * stretch * 0.6, MAX_DEFORM * 0.5);
      stretchY = 1 - Math.min(Math.abs(p.vx) * stretch * 0.3, MAX_DEFORM * 0.3);
    } else {
      stretchX = 1 + Math.min(Math.abs(p.vx) * stretch, MAX_DEFORM);
      stretchY = 1 - Math.min(Math.abs(p.vx) * stretch * 0.55, MAX_DEFORM * 0.55);
    }

    // Squish al presionar
    if (p.pressed) {
      stretchX *= 1.08;
      stretchY *= PRESS_SQ;
    }

    const bw = p.w;
    const bh = p.h;

    // Actualizar SVG path — forma orgánica asimétrica
    if (!IS_MOBILE || speed > 0.3 || Math.abs(p.wobbleY) > 0.3 || p.dragging) {
      const wobbleMul = p.dragging ? 2.0 : 1.0;
      const wobble    = speed * wobbleMul;
      const cp = Math.min(wobble, p.dragging ? 16 : 8);
      const r  = IS_MOBILE ? 16 : 18;

      const dir      = p.vx > 0 ? 1 : -1;
      const asym     = Math.min(Math.abs(p.vx) * 0.3, 4);
      const wy       = Math.min(Math.abs(p.wobbleY), 3) * Math.sign(p.wobbleY);
      const safeR    = Math.min(r, bw * 0.25, bh * 0.25);
      const safeCp   = Math.min(cp, safeR * 0.7);
      const safeAsym = Math.min(asym, (bw - 2 * safeR) * 0.15);

      const path = `
        M ${safeR + safeCp + safeAsym * dir},${-wy * 0.4}
        L ${bw - safeR - safeCp + safeAsym * dir},${wy * 0.4}
        Q ${bw + safeAsym * 0.2},${safeCp * 0.3 + wy * 0.2} ${bw},${safeR - safeCp * 0.2}
        L ${bw},${bh - safeR + safeCp * 0.2}
        Q ${bw + safeAsym * 0.2},${bh - safeCp * 0.3 - wy * 0.2} ${bw - safeR - safeCp - safeAsym * dir},${bh + wy * 0.4}
        L ${safeR + safeCp - safeAsym * dir},${bh - wy * 0.4}
        Q ${-safeAsym * 0.2},${bh - safeCp * 0.3 + wy * 0.2} 0,${bh - safeR + safeCp * 0.2}
        L 0,${safeR - safeCp * 0.2}
        Q ${-safeAsym * 0.2},${safeCp * 0.3 - wy * 0.2} ${safeR + safeCp + safeAsym * dir},${-wy * 0.4}
        Z
      `;

      svg.setAttribute('viewBox', `-1 -1 ${bw + 2} ${bh + 2}`);
      svg.setAttribute('width',  bw + 2);
      svg.setAttribute('height', bh + 2);
      const pathEl = svg.querySelector('path');
      if (pathEl) pathEl.setAttribute('d', path);
    }

    // Transform — centrar blob con wobble Y incorporado
    const navH    = navRef.current?.offsetHeight || 66;
    const centerY = navH / 2;
    const tx = p.x - (bw * stretchX) / 2;
    const ty = centerY - (bh * stretchY) / 2 + p.wobbleY * 0.5;
    blob.style.transform = `translate(${tx}px, ${ty}px) scale(${stretchX.toFixed(3)}, ${stretchY.toFixed(3)})`;
    blob.style.width  = `${bw}px`;
    blob.style.height = `${bh}px`;

    raf.current = requestAnimationFrame(tick);
  }, []);

  /* ── Init y cleanup ── */
  useEffect(() => {
    const init = () => {
      const c = getItemCenter(active);
      if (!c) return;
      const p = phys.current;
      p.x = c.x; p.y = c.y;
      p.targetX = c.x; p.targetY = c.y;
      p.w = c.w; p.h = c.h;

      const nr = navRef.current?.getBoundingClientRect();
      if (nr) {
        p.navLeft   = nr.left;
        p.navTop    = nr.top;
        p.navWidth  = nr.width;
        p.navHeight = nr.height;
      }
    };
    const t = setTimeout(init, 50);
    raf.current = requestAnimationFrame(tick);

    return () => {
      clearTimeout(t);
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [tick, getItemCenter, active]);

  /* ── Snap cuando cambia active ── */
  useEffect(() => { snapTo(active); }, [active, snapTo]);

  /* ── Recalcular en resize ── */
  useEffect(() => {
    const onResize = () => {
      const nr = navRef.current?.getBoundingClientRect();
      if (nr) {
        phys.current.navLeft   = nr.left;
        phys.current.navTop    = nr.top;
        phys.current.navWidth  = nr.width;
        phys.current.navHeight = nr.height;
      }
      snapTo(active);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [active, snapTo]);

  /* ── Helpers de puntero ── */
  const getPointerX = (e) => e.touches ? e.touches[0].clientX : e.clientX;

  /* Guard para bloquear eventos mouse sintetizados tras un touch */
  const lastTouchRef = useRef(0);

  /* ── Press en un botón (sin soltar) → la gota va hacia él ── */
  const onItemPointerDown = (e, itemId) => {
    /* Bloquear mouse sintetizado tras touch (doble-toggle) */
    if (e.type === 'touchstart') {
      lastTouchRef.current = Date.now();
    } else if (Date.now() - lastTouchRef.current < 500) {
      return;
    }
    if (e.type !== 'touchstart') e.preventDefault();
    const p = phys.current;
    p.pressed   = true;
    p.previewId = itemId;
    setIsPressed(true);

    const c = getItemCenter(itemId);
    if (c) { p.targetX = c.x; p.targetY = c.y; }

    window.addEventListener('mouseup',   stablePointerUp.current);
    window.addEventListener('touchend',  stablePointerUp.current);
    window.addEventListener('touchmove', stableTouchMove.current, { passive: false });
  };

  /* ── Release ── */
  const onItemPointerUp = useCallback(() => {
    const p = phys.current;
    if (!p.pressed || p.dragging) return;

    const targetId = p.previewId || active;
    p.pressed   = false;
    p.previewId = null;
    setIsPressed(false);
    setActive(targetId);
    snapTo(targetId);

    window.removeEventListener('mouseup',   stablePointerUp.current);
    window.removeEventListener('touchend',  stablePointerUp.current);
    window.removeEventListener('touchmove', stableTouchMove.current);

    /* Modo dinámico: navegación real */
    if (isDynamic) {
      if (targetId === 'inicio') {
        setOpenDrawer(null);
        navigate(homeRoute);
      } else {
        setOpenDrawer(prev => prev === targetId ? null : targetId);
      }
    }
  }, [active, snapTo, isDynamic, navigate, homeRoute]);

  /* ── Touch move (dedo a otro ítem) ── */
  const onItemTouchMove = useCallback((e) => {
    const p = phys.current;
    if (!p.pressed || p.dragging) return;
    e.preventDefault();
    const touch = e.touches[0];
    const el    = document.elementFromPoint(touch.clientX, touch.clientY);
    if (!el) return;
    const btn = el.closest('.liquid-nav-item');
    if (!btn) return;
    const itemId = tabsRef.current.find(item => itemRefs.current[item.id] === btn)?.id;
    if (itemId && itemId !== p.previewId) {
      p.previewId = itemId;
      const c = getItemCenter(itemId);
      if (c) { p.targetX = c.x; p.targetY = c.y; }
    }
  }, [getItemCenter]);

  const onItemPointerUpRef  = useRef(onItemPointerUp);
  const onItemTouchMoveRef  = useRef(onItemTouchMove);
  useEffect(() => { onItemPointerUpRef.current  = onItemPointerUp;  }, [onItemPointerUp]);
  useEffect(() => { onItemTouchMoveRef.current  = onItemTouchMove; }, [onItemTouchMove]);

  /* ── Drag del blob ── */
  const onDragStart = (e) => {
    /* Bloquear mouse sintetizado tras touch */
    if (e.type === 'touchstart') {
      lastTouchRef.current = Date.now();
    } else if (Date.now() - lastTouchRef.current < 500) {
      return;
    }
    if (e.type !== 'touchstart') e.preventDefault();
    const p = phys.current;
    p.previewId = null;
    window.removeEventListener('mouseup',   stablePointerUp.current);
    window.removeEventListener('touchend',  stablePointerUp.current);
    window.removeEventListener('touchmove', stableTouchMove.current);

    const nr = navRef.current?.getBoundingClientRect();
    if (nr) { p.navLeft = nr.left; p.navTop = nr.top; }
    const px = getPointerX(e) - p.navLeft;
    p.dragging    = true;
    p.pressed     = true;
    p.dragOffsetX = px - p.x;
    p.vx = 0; p.vy = 0;
    setIsPressed(true);

    window.addEventListener('mousemove', stableDragMove.current);
    window.addEventListener('mouseup',   stableDragEnd.current);
    window.addEventListener('touchmove', stableDragMove.current, { passive: false });
    window.addEventListener('touchend',  stableDragEnd.current);
  };

  const onDragMove = useCallback((e) => {
    const p = phys.current;
    if (!p.dragging) return;
    e.preventDefault();
    const px   = getPointerX(e) - p.navLeft;
    const newX = px - p.dragOffsetX;
    const rawVx = (newX - p.x) * 0.35;
    p.vx = Math.max(-10, Math.min(10, rawVx));
    p.x  = newX;
    const halfW = p.w / 2;
    p.x = Math.max(halfW, Math.min(p.navWidth - halfW, p.x));
  }, []);

  const onDragEnd = useCallback(() => {
    const p = phys.current;
    if (!p.dragging) return;
    p.dragging  = false;
    p.pressed   = false;
    p.previewId = null;
    setIsPressed(false);

    const closest = findClosestItem(p.x);
    setActive(closest);
    snapTo(closest);

    window.removeEventListener('mousemove', stableDragMove.current);
    window.removeEventListener('mouseup',   stableDragEnd.current);
    window.removeEventListener('touchmove', stableDragMove.current);
    window.removeEventListener('touchend',  stableDragEnd.current);

    /* Modo dinámico: activar navegación al soltar arrastre */
    if (isDynamic) {
      if (closest === 'inicio') {
        setOpenDrawer(null);
        navigate(homeRoute);
      } else {
        setOpenDrawer(prev => prev === closest ? null : closest);
      }
    }
  }, [findClosestItem, snapTo, isDynamic, navigate, homeRoute]);

  const onDragMoveRef = useRef(onDragMove);
  const onDragEndRef  = useRef(onDragEnd);
  useEffect(() => { onDragMoveRef.current = onDragMove; }, [onDragMove]);
  useEffect(() => { onDragEndRef.current  = onDragEnd;  }, [onDragEnd]);

  /* Trampolines estables — misma referencia entre renders,
     delegan al ref actual. Evitan listeners huérfanos por re-renders. */
  const stablePointerUp = useRef((...a) => onItemPointerUpRef.current(...a));
  const stableTouchMove = useRef((...a) => onItemTouchMoveRef.current(...a));
  const stableDragMove  = useRef((...a) => onDragMoveRef.current(...a));
  const stableDragEnd   = useRef((...a) => onDragEndRef.current(...a));

  /* ── Drawer helpers ── */
  const closeDrawer = useCallback(() => setOpenDrawer(null), []);

  /* Grupo de navItems que corresponde al drawer activo */
  const drawerGroup = (() => {
    if (!openDrawer || !isDynamic) return null;
    const tabIdx = tabsRef.current.findIndex(t => t.id === openDrawer);
    return navItems[tabIdx - 1] || null; // tab0→navItems[0], tab1→navItems[1], tab2→navItems[2]
  })();

  /* ══════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════ */
  return (
    <>
      {/* ── Overlay oscuro ── */}
      {openDrawer && (
        <div className="mnav-overlay" onClick={closeDrawer} />
      )}

      {/* ── Bottom Sheet ── */}
      {drawerGroup && (
        <div className="mnav-drawer" key={openDrawer} role="dialog" aria-modal="true" aria-label={drawerGroup.label}>
          <div className="mnav-drawer-handle" />

          <div className="mnav-drawer-header">
            <span className="mnav-drawer-title">
              <i className={`fas ${drawerGroup.icon}`} />
              {drawerGroup.label}
            </span>
            <button type="button" className="mnav-drawer-close" onClick={closeDrawer} aria-label="Cerrar menú">
              <i className="fas fa-times" />
            </button>
          </div>

          <ul className="mnav-drawer-links">
            {(drawerGroup.links || []).map((lnk, i) => (
              <li key={i}>
                <button
                  type="button"
                  className="mnav-drawer-link"
                  onClick={() => { closeDrawer(); navigate(lnk.href); }}
                >
                  <span className="mnav-drawer-link-label">{lnk.label}</span>
                  <i className="fas fa-chevron-right mnav-drawer-link-arrow" />
                </button>
              </li>
            ))}
          </ul>

          {onLogout && (
            <div className="mnav-drawer-footer">
              <button
                type="button"
                className="mnav-drawer-logout"
                onClick={() => { closeDrawer(); onLogout(); }}
              >
                <i className="fas fa-sign-out-alt" />
                <span>Cerrar sesión</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Navbar ── */}
      <nav
        className={`liquid-navbar${isPressed ? ' liquid-navbar--pressed' : ''}`}
        ref={navRef}
        aria-label="Navegación principal"
      >
        {/* Destellos ambiente */}
        <div className="liquid-navbar-sparkle liquid-navbar-sparkle--1" />
        <div className="liquid-navbar-sparkle liquid-navbar-sparkle--2" />
        <div className="liquid-navbar-sparkle liquid-navbar-sparkle--3" />

        {/* ── Gotita líquida draggable ── */}
        <div
          className={`liquid-blob${isPressed ? ' liquid-blob--pressed' : ''}`}
          ref={blobRef}
          onMouseDown={onDragStart}
          onTouchStart={onDragStart}
        >
          <svg ref={svgRef} className="liquid-blob-svg" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <radialGradient id="blobGrad" cx="50%" cy="42%" r="70%">
                <stop offset="0%"   stopColor="rgba(230,57,70,0.28)" />
                <stop offset="45%"  stopColor="rgba(230,57,70,0.14)" />
                <stop offset="80%"  stopColor="rgba(180,30,50,0.04)" />
                <stop offset="100%" stopColor="transparent" />
              </radialGradient>
              <radialGradient id="blobGradPressed" cx="50%" cy="42%" r="70%">
                <stop offset="0%"   stopColor="rgba(180,220,255,0.12)" />
                <stop offset="40%"  stopColor="rgba(200,230,255,0.06)" />
                <stop offset="75%"  stopColor="rgba(255,255,255,0.02)" />
                <stop offset="100%" stopColor="transparent" />
              </radialGradient>
              <filter id="blobGlow">
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
              <filter id="blobLens" x="-20%" y="-20%" width="140%" height="140%">
                <feTurbulence type="fractalNoise" baseFrequency="0.015" numOctaves="3" seed="5" result="noise" />
                <feDisplacementMap in="SourceGraphic" in2="noise" scale="8" xChannelSelector="R" yChannelSelector="G" result="distort" />
                <feGaussianBlur in="distort" stdDeviation="0.6" result="softDistort" />
                <feComposite in="softDistort" in2="SourceGraphic" operator="over" />
              </filter>
            </defs>
            <path
              fill={isPressed ? 'url(#blobGradPressed)' : 'url(#blobGrad)'}
              stroke={isPressed ? 'rgba(180,220,255,0.45)' : 'rgba(230,57,70,0.3)'}
              strokeWidth={isPressed ? '1' : '1.5'}
              filter={isPressed && !IS_MOBILE ? 'url(#blobLens)' : 'url(#blobGlow)'}
            />
          </svg>
          <div className="liquid-blob-glow" />
          <div className="liquid-blob-highlight" />
          <div className="liquid-blob-lens" />
        </div>

        {/* ── Items ── */}
        {TABS.map((item, i) => (
          <span key={item.id} className="d-contents">
            {i > 0 && <div className="liquid-nav-divider" />}
            <button
              ref={(el) => { itemRefs.current[item.id] = el; }}
              className={`liquid-nav-item${active === item.id ? ' active' : ''}${openDrawer === item.id ? ' drawer-open' : ''}`}
              onMouseDown={(e) => onItemPointerDown(e, item.id)}
              onTouchStart={(e) => onItemPointerDown(e, item.id)}
              aria-label={item.label}
              type="button"
            >
              <i className={item.icon} />
              <span>{item.label.length > 9 ? item.label.slice(0, 8) + '…' : item.label}</span>
            </button>
          </span>
        ))}
      </nav>
    </>
  );
}
