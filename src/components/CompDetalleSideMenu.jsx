import React, { useCallback, useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';
import './CompDetalleSideMenu.css';

const CompDetalleSideMenu = function CompDetalleSideMenu(
  { items = [], activeItem, onItemClick, isOpen, onClose }
) {
  const panelRef = useRef(null);
  const preLayersRef = useRef(null);
  const preLayerElsRef = useRef([]);
  const openTlRef = useRef(null);
  const closeTweenRef = useRef(null);
  const busyRef = useRef(false);
  const isMountedRef = useRef(false);

  const colors = ['#1a0000', '#3d0000', '#8B0000'];

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const panel = panelRef.current;
      const preContainer = preLayersRef.current;
      if (!panel) return;

      const preLayers = preContainer
        ? Array.from(preContainer.querySelectorAll('.cdm-prelayer'))
        : [];
      preLayerElsRef.current = preLayers;

      gsap.set([panel, ...preLayers], { xPercent: 100 });
    });
    return () => ctx.revert();
  }, []);

  const buildOpenTimeline = useCallback(() => {
    const panel = panelRef.current;
    const layers = preLayerElsRef.current;
    if (!panel) return null;

    openTlRef.current?.kill();
    closeTweenRef.current?.kill();

    const itemEls = Array.from(panel.querySelectorAll('.cdm-item-label'));
    if (itemEls.length) gsap.set(itemEls, { yPercent: 140, rotate: 10 });

    const tl = gsap.timeline({ paused: true });
    layers.forEach((el, i) => {
      tl.fromTo(el, { xPercent: 100 }, { xPercent: 0, duration: 0.5, ease: 'power4.out' }, i * 0.07);
    });
    const panelInsert = layers.length ? (layers.length - 1) * 0.07 + 0.08 : 0;
    tl.fromTo(panel, { xPercent: 100 }, { xPercent: 0, duration: 0.65, ease: 'power4.out' }, panelInsert);
    if (itemEls.length) {
      tl.to(
        itemEls,
        { yPercent: 0, rotate: 0, duration: 1, ease: 'power4.out', stagger: { each: 0.1 } },
        panelInsert + 0.1
      );
    }

    openTlRef.current = tl;
    return tl;
  }, []);

  const playOpen = useCallback(() => {
    busyRef.current = true;
    const tl = buildOpenTimeline();
    if (tl) {
      tl.eventCallback('onComplete', () => { busyRef.current = false; });
      tl.play(0);
    } else {
      busyRef.current = false;
    }
  }, [buildOpenTimeline]);

  const playClose = useCallback(() => {
    openTlRef.current?.kill();
    const panel = panelRef.current;
    const layers = preLayerElsRef.current;
    if (!panel) return;

    closeTweenRef.current?.kill();
    closeTweenRef.current = gsap.to([...layers, panel], {
      xPercent: 100,
      duration: 0.32,
      ease: 'power3.in',
      overwrite: 'auto',
      onComplete: () => {
        const itemEls = Array.from(panel.querySelectorAll('.cdm-item-label'));
        if (itemEls.length) gsap.set(itemEls, { yPercent: 140, rotate: 10 });
        busyRef.current = false;
      }
    });
  }, []);

  React.useEffect(() => {
    if (!isMountedRef.current) {
      isMountedRef.current = true;
      return;
    }
    if (isOpen) playOpen();
    else playClose();
  }, [isOpen]);

  // Click-outside para cerrar
  React.useEffect(() => {
    if (!isOpen) return;
    const handle = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        onClose?.();
      }
    };
    const timer = setTimeout(() => document.addEventListener('mousedown', handle), 120);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handle);
    };
  }, [isOpen, onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`cdm-backdrop${isOpen ? ' cdm-backdrop--visible' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Wrapper de overlay */}
      <div className="cdm-wrapper">
        <div ref={preLayersRef} className="cdm-prelayers" aria-hidden="true">
          {colors.map((c, i) => (
            <div key={i} className="cdm-prelayer" style={{ background: c }} />
          ))}
        </div>

        <aside
          ref={panelRef}
          className="cdm-panel"
          aria-label="Menú de secciones"
          aria-hidden={!isOpen}
        >
          <div className="cdm-panel-inner">
            <ul className="cdm-list" role="list">
              {items.map((item, idx) => (
                <li className="cdm-item-wrap" key={item.id}>
                  <button
                    className={`cdm-item${activeItem === item.id ? ' cdm-item--active' : ''}`}
                    onClick={() => onItemClick?.(item.id)}
                    type="button"
                    aria-current={activeItem === item.id ? 'page' : undefined}
                  >
                    <i className={`fas ${item.icon} cdm-item-icon`} />
                    <span className="cdm-item-label">{item.label}</span>
                    <span className="cdm-item-num">{String(idx + 1).padStart(2, '0')}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </>
  );
};

export default CompDetalleSideMenu;
