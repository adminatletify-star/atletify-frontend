import { useState, useRef, useEffect, useCallback } from 'react';
import BotonSeguro from '../BotonSeguro';
import { formatNivelGamer } from '../NivelGamerPicker';
import './WolfLanyard.css';

// ── Spring physics constants ───────────────────────────────────────
const STIFFNESS  = 180;   // rigidez del resorte al volver al origen
const DAMPING    = 16;    // amortiguación al volver (>= = menos rebote)
const DRAG_STIFF = 260;   // rigidez mientras se jala (da el lag de cuerda)
const DRAG_DAMP  = 22;    // amortiguación mientras se jala
const CORD_BASE  = 64;    // altura base de la cuerda (px)

export default function WolfLanyard({
  lobo,
  marcas = [],
  cargandoMarcas = false,
  miId,
  reaccionesResumen = {},
  likesPerfil = 0,
  yaLeDiLike = false,
  onLikePerfil,
  estadoAmistad = 'ninguna',
  onClose,
  onReaccionar,
  onSolicitarAmistad,
  boxNombre = 'WOLFPACK',
}) {
  if (!lobo) return null;

  const isCoach = lobo.rol === 'Coach';

  /* ── Physics refs (mutables, sin re-render) ── */
  const physPos    = useRef({ x: 0, y: 0 });
  const physVel    = useRef({ x: 0, y: 0 });
  const dragTarget = useRef({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const rafId      = useRef(null);
  const lastTime   = useRef(null);
  const ptrStart   = useRef({ mx: 0, my: 0, ox: 0, oy: 0 });
  const hasMoved   = useRef(false);

  /* ── Render state (x, y, velocidad x para tilt) ── */
  const [rs, setRs]       = useState({ x: 0, y: 0, vx: 0 });
  const [isDrag, setIsDrag] = useState(false);

  /* ── Tick de física (spring mass-damper) ── */
  const tick = useCallback((time) => {
    const prev = lastTime.current ?? time;
    const dt   = Math.min((time - prev) / 1000, 0.05);
    lastTime.current = time;

    const p = physPos.current;
    const v = physVel.current;

    if (isDragging.current) {
      // Resorte hacia el cursor → lag de cuerda
      const t  = dragTarget.current;
      v.x += ((t.x - p.x) * DRAG_STIFF - v.x * DRAG_DAMP) * dt;
      v.y += ((t.y - p.y) * DRAG_STIFF - v.y * DRAG_DAMP) * dt;
    } else {
      // Resorte de vuelta al origen con rebote
      v.x += (-p.x * STIFFNESS - v.x * DAMPING) * dt;
      v.y += (-p.y * STIFFNESS - v.y * DAMPING) * dt;
    }

    p.x += v.x * dt;
    p.y += v.y * dt;

    setRs({ x: p.x, y: p.y, vx: v.x });

    const active = Math.abs(v.x) + Math.abs(v.y) + Math.abs(p.x) + Math.abs(p.y) > 0.15;
    if (active || isDragging.current) {
      rafId.current = requestAnimationFrame(tick);
    } else {
      rafId.current = null;
      lastTime.current = null;
    }
  }, []);

  const ensureRAF = useCallback(() => {
    if (!rafId.current) {
      lastTime.current = null;
      rafId.current = requestAnimationFrame(tick);
    }
  }, [tick]);

  /* ── Iniciar arrastre ── */
  const startDrag = useCallback((clientX, clientY) => {
    hasMoved.current = false;
    isDragging.current = true;
    setIsDrag(true);
    // Resetear dragTarget a la posición actual para que no haya fuerza
    // residual del arrastre anterior al solo tocar la tarjeta.
    dragTarget.current = { x: physPos.current.x, y: physPos.current.y };
    ptrStart.current = {
      mx: clientX, my: clientY,
      ox: physPos.current.x, oy: physPos.current.y,
    };
    ensureRAF();
  }, [ensureRAF]);

  /* ── Mover y soltar ── */
  useEffect(() => {
    if (!isDrag) return;

    const move = (cx, cy) => {
      const dx = cx - ptrStart.current.mx;
      const dy = cy - ptrStart.current.my;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) hasMoved.current = true;
      dragTarget.current = { x: ptrStart.current.ox + dx, y: ptrStart.current.oy + dy };
    };

    const release = () => {
      isDragging.current = false;
      setIsDrag(false);
      ensureRAF(); // continúa animando el resorte de regreso
    };

    const onMM = (e) => move(e.clientX, e.clientY);
    const onTM = (e) => { const t = e.touches[0]; move(t.clientX, t.clientY); };

    window.addEventListener('mousemove', onMM);
    window.addEventListener('mouseup',   release);
    window.addEventListener('touchmove', onTM,    { passive: true });
    window.addEventListener('touchend',  release);
    return () => {
      window.removeEventListener('mousemove', onMM);
      window.removeEventListener('mouseup',   release);
      window.removeEventListener('touchmove', onTM);
      window.removeEventListener('touchend',  release);
    };
  }, [isDrag, ensureRAF]);

  /* ── Cleanup RAF al desmontar ── */
  useEffect(() => () => { if (rafId.current) cancelAnimationFrame(rafId.current); }, []);

  /* ── Valores visuales derivados ── */
  const { x: px, y: py, vx } = rs;
  const rotation = vx / 65;

  // SVG está en el flujo como hermano encima de wl-draggable (height = CORD_BASE).
  // El clip está al tope de wl-draggable, que empieza justo debajo del SVG.
  // endX = 40 + px  (centro 40px en SVG de 80px + desplazamiento físico)
  // endY = CORD_BASE + py  (justo debajo del SVG + desplazamiento físico)
  const endX  = 40 + px;
  const endY  = CORD_BASE + py;
  const ctrlY = endY * 0.52;
  const pathL = `M 22 4 Q ${22 + px * 0.4} ${ctrlY} ${endX} ${endY}`;
  const pathR = `M 58 4 Q ${58 + px * 0.4} ${ctrlY} ${endX} ${endY}`;

  /* Stop propagation helper for interactive elements inside the card */
  const stopDrag = (e) => e.stopPropagation();

  return (
    <div
      className="wl-overlay"
      onClick={() => { if (!hasMoved.current) onClose(); }}
    >
      <div className="wl-wrapper" onClick={stopDrag}>

        {/* ── Cuerda SVG — hermano encima de wl-draggable, en el flujo normal ── */}
        <svg
          width="80"
          height={CORD_BASE}
          style={{ display: 'block', overflow: 'visible', flexShrink: 0, pointerEvents: 'none' }}
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="wcg" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(60,10,10,0.35)" />
              <stop offset="100%" stopColor="#e63946" />
            </linearGradient>
          </defs>
          <path d={pathL} stroke="url(#wcg)" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d={pathR} stroke="url(#wcg)" strokeWidth="3" fill="none" strokeLinecap="round" />
        </svg>

        {/* ── Card arrastrable — empieza justo debajo del SVG ── */}
        <div
          className="wl-draggable"
          style={{
            transform: `translate(${px}px, ${py}px) rotate(${rotation}deg)`,
            cursor: isDrag ? 'grabbing' : 'grab',
          }}
          onMouseDown={(e) => { e.preventDefault(); startDrag(e.clientX, e.clientY); }}
          onTouchStart={(e) => { const t = e.touches[0]; startDrag(t.clientX, t.clientY); }}
        >
          {/* Clip metálico — primer elemento, pegado al tope de la tarjeta */}
          <div className="wl-clip" />

          {/* ── Badge card ── */}
          <div className={`wl-card ${isCoach ? 'wl-card-coach' : 'wl-card-atleta'}`}>

            {/* Drag hint bar at top of card */}
            <div className="wl-drag-hint">
              <div className="wl-drag-pill"></div>
            </div>

            {/* Close — stops drag propagation */}
            <button
              className="wl-close-btn"
              onMouseDown={stopDrag}
              onTouchStart={stopDrag}
              onClick={onClose}
            >
              <i className="fas fa-times"></i>
            </button>

            {/* Header strip */}
            <div className="wl-card-header">
              <span className="wl-logo-text">{boxNombre.toUpperCase()}</span>
            </div>

            {/* Scrollable content */}
            <div className="wl-scroll-body">

              {/* Avatar + nombre */}
              <div className="wl-avatar-section">
                <div className={`wl-avatar ${isCoach ? 'wl-avatar-coach' : 'wl-avatar-atleta'}`}>
                  {lobo.foto
                    ? <img src={lobo.foto} alt={lobo.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }} />
                    : (lobo.apodo ? lobo.apodo.charAt(0).toUpperCase() : lobo.nombre.charAt(0).toUpperCase())
                  }
                  {isCoach && <span className="wl-crown"><i className="fas fa-crown"></i></span>}
                  {lobo.rachaActual >= 3 && <span className="wl-fire-badge"><i className="fas fa-fire"></i></span>}
                </div>
                <h2 className="wl-name">{lobo.nombre.toUpperCase()}</h2>
                {lobo.apodo && <p className="wl-apodo">"{lobo.apodo}"</p>}
                <span className={`wl-role-tag ${isCoach ? 'wl-role-coach' : 'wl-role-atleta'}`}>
                  {isCoach ? 'COACH' : 'ATLETA'}
                </span>
                {lobo.idUsuario !== miId && (
                  <button
                    type="button"
                    className={`wl-like-btn ${yaLeDiLike ? 'wl-like-btn--active' : ''}`}
                    onMouseDown={stopDrag}
                    onTouchStart={stopDrag}
                    onClick={(e) => { e.stopPropagation(); onLikePerfil?.(lobo.idUsuario); }}
                  >
                    <i className="fas fa-heart"></i>
                    <span>{likesPerfil} {likesPerfil === 1 ? 'like' : 'likes'}</span>
                  </button>
                )}
              </div>

              {/* Badges */}
              <div className="wl-badges-row">
                <span className={`wl-badge ${lobo.categoriaBase === 'RX' ? 'wl-badge-rx' : 'wl-badge-scaled'}`}>
                  <i className="fas fa-dumbbell me-1"></i>
                  {lobo.categoriaBase?.toUpperCase() || 'NOVATO'}
                </span>
                {lobo.nivelGamer && (
                  <span className="wl-badge wl-badge-level">LVL: {formatNivelGamer(lobo.nivelGamer)}</span>
                )}
                {lobo.estadoDelDia && (
                  <span className="wl-badge wl-badge-estado">{lobo.estadoDelDia}</span>
                )}
                {lobo.rachaActual >= 3 && (
                  <span className="wl-badge wl-badge-racha">
                    <i className="fas fa-fire me-1"></i>{lobo.rachaActual} días
                  </span>
                )}
              </div>

              {/* PRs */}
              <div className="wl-section">
                <div className="wl-section-title">
                  <i className="fas fa-trophy"></i> RÉCORDS PERSONALES
                  {marcas.length > 0 && <span className="wl-section-count">{marcas.length}</span>}
                </div>
                {cargandoMarcas ? (
                  <div className="text-center py-3">
                    <div className="spinner-border spinner-border-sm text-warning"></div>
                  </div>
                ) : marcas.length === 0 ? (
                  <div className="wl-pr-empty">
                    <i className="fas fa-medal"></i>
                    <p>Aún no ha registrado ningún récord.</p>
                  </div>
                ) : (
                  <div className="wl-prs-grid">
                    {marcas.map(marca => (
                      <div key={marca.idMarca} className="wl-pr-card">
                        <div className="wl-pr-head">
                          <span className="wl-pr-icon"><i className="fas fa-dumbbell"></i></span>
                          <span className="wl-pr-exercise" title={marca.nombreEjercicio}>
                            {marca.nombreEjercicio}
                          </span>
                        </div>
                        <div className="wl-pr-value">
                          <span className="wl-pr-number">{marca.valor}</span>
                          <span className="wl-pr-unit">{marca.unidad}</span>
                        </div>
                        {reaccionesResumen?.[marca.idMarca]?.total > 0 && (
                          <div className="wl-pr-reacciones-count">
                            {reaccionesResumen[marca.idMarca].conteos.map(c => (
                              <span key={c.emoji} className="wl-pr-rcount">{c.emoji} {c.count}</span>
                            ))}
                          </div>
                        )}
                        {lobo.idUsuario !== miId && (
                          <div className="wl-reactions">
                            <button className="wl-react-btn" title="¡Máquina!"
                              onMouseDown={stopDrag} onTouchStart={stopDrag}
                              onClick={e => { e.stopPropagation(); onReaccionar(marca.idMarca, '🔥'); }}
                            >🔥</button>
                            <button className="wl-react-btn" title="¡Me encanta!"
                              onMouseDown={stopDrag} onTouchStart={stopDrag}
                              onClick={e => { e.stopPropagation(); onReaccionar(marca.idMarca, '❤️'); }}
                            >❤️</button>
                            <button className="wl-react-btn" title="Mis respetos"
                              onMouseDown={stopDrag} onTouchStart={stopDrag}
                              onClick={e => { e.stopPropagation(); onReaccionar(marca.idMarca, '💀'); }}
                            >💀</button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ADN Deportivo */}
              {(lobo.movimientoFavorito || lobo.movimientoOdiado) && (
                <div className="wl-section">
                  <div className="wl-section-title">
                    <i className="fas fa-dna"></i> ADN DEPORTIVO
                  </div>
                  <div className="wl-adn-grid">
                    {lobo.movimientoFavorito && (
                      <div className="wl-adn-item wl-adn-fav">
                        <i className="fas fa-heart"></i>
                        <div>
                          <div className="wl-adn-label">Favorito</div>
                          <div className="wl-adn-value">{lobo.movimientoFavorito}</div>
                        </div>
                      </div>
                    )}
                    {lobo.movimientoOdiado && (
                      <div className="wl-adn-item wl-adn-hate">
                        <i className="fas fa-skull"></i>
                        <div>
                          <div className="wl-adn-label">Odiado</div>
                          <div className="wl-adn-value">{lobo.movimientoOdiado}</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* CTA */}
              {lobo.idUsuario !== miId && (
                lobo.deshabilitarSolicitudes ? (
                  <div className="wl-cta-wrap">
                    <p className="wl-cta-disabled">
                      <i className="fas fa-lock me-2"></i>Este atleta no acepta solicitudes
                    </p>
                  </div>
                ) : estadoAmistad === 'Aceptada' ? (
                  <div className="wl-cta-wrap">
                    <p className="wl-cta-compas">
                      <i className="fas fa-user-check me-2"></i>Ya son compas
                    </p>
                  </div>
                ) : estadoAmistad === 'Pendiente' ? (
                  <div className="wl-cta-wrap">
                    <button className="wl-cta-btn wl-cta-btn--pending" disabled onMouseDown={stopDrag} onTouchStart={stopDrag}>
                      <i className="fas fa-clock me-2"></i>SOLICITUD ENVIADA
                    </button>
                  </div>
                ) : (
                  <div className="wl-cta-wrap">
                    <BotonSeguro
                      type="button"
                      className="wl-cta-btn"
                      tiempoBloqueo={400}
                      onMouseDown={stopDrag}
                      onTouchStart={stopDrag}
                      onClick={() => onSolicitarAmistad(lobo.idUsuario)}
                      textoProcesando={<><i className="fas fa-spinner fa-spin me-2"></i>ENVIANDO...</>}
                    >
                      <i className="fas fa-paw me-2"></i>AÑADIR A MIS AMIGOS
                    </BotonSeguro>
                  </div>
                )
              )}

            </div>{/* end scroll body */}
          </div>{/* end card */}
        </div>{/* end draggable */}
      </div>
    </div>
  );
}
