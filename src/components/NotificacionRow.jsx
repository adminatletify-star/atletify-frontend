import { useState, useRef } from 'react';
import './NotificacionRow.css';

// Icono (emoji) del chip izquierdo según el emoji embebido en el título de la notificación.
const iconoNoti = (titulo = '') =>
  titulo.includes('💬') ? '💬'
  : titulo.includes('🔥') ? '🔥'
  : titulo.includes('❤️') ? '❤️'
  : titulo.includes('👍') ? '👍'
  : titulo.includes('🤝') ? '🤝'
  : titulo.includes('💀') ? '💀'
  : titulo.includes('🔀') ? '🔀'
  : (titulo.includes('📣') || titulo.includes('📢')) ? '📣'
  : titulo.includes('🧾') ? '🧾'
  : '🔔';

// Tipo (color de acento) del aviso, según destino o el emoji del título.
const tipoNoti = (noti) => {
  if (noti.destino === 'solicitud') return 'solicitud';
  const t = noti.titulo || '';
  if (t.includes('🤝')) return 'solicitud';        // solicitud aceptada (verde)
  if (t.includes('💬')) return 'comentario';       // comentario/respuesta (cyan)
  if (t.includes('❤️')) return 'like';             // like al perfil (rosa)
  if (t.includes('🔥') || t.includes('👍') || t.includes('💀') || t.includes('🔀')) return 'reaccion'; // reacción a PR/comentario (ámbar)
  return 'general';                                 // genérica / campañas (rojo)
};

// Fila de notificación con swipe-para-borrar (dedo o cursor, vía pointer events).
// Compartida entre el panel del atleta (UserPanel) y el del coach/admin (AdminBoxPanel)
// para que ambas campanitas se vean y se comporten igual.
export default function NotificacionRow({ noti, onAbrir, onBorrar, onResponder = () => {} }) {
  const esSolicitud = noti.destino === 'solicitud';
  const tipo = tipoNoti(noti);
  const [dx, setDx] = useState(0);
  const [arrastreActivo, setArrastreActivo] = useState(false); // solo para la transición CSS (no leer refs en render)
  const arrastrando = useRef(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const movido = useRef(false);   // se confirmó un swipe HORIZONTAL
  const esScroll = useRef(false); // el gesto es vertical → lo maneja el scroll del modal

  const onDown = (e) => {
    arrastrando.current = true;
    setArrastreActivo(true);
    startX.current = e.clientX;
    startY.current = e.clientY;
    movido.current = false;
    esScroll.current = false;
    // OJO: NO capturamos el puntero aquí. Capturarlo en pointerdown mata el scroll
    // vertical nativo del modal. Solo capturamos al confirmar un swipe horizontal.
  };
  const onMove = (e) => {
    if (!arrastrando.current || esScroll.current) return;
    const dxRaw = e.clientX - startX.current;
    const dyRaw = e.clientY - startY.current;
    // Antes de comprometernos a swipe: si el gesto es más vertical que horizontal,
    // es un scroll → soltamos el gesto y dejamos que el modal haga su scroll.
    if (!movido.current && Math.abs(dyRaw) > Math.abs(dxRaw) && Math.abs(dyRaw) > 6) {
      esScroll.current = true;
      setDx(0);
      return;
    }
    if (Math.abs(dxRaw) > 6) {
      if (!movido.current) {
        movido.current = true;
        try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* noop */ }
      }
      setDx(dxRaw);
    }
  };
  const onUp = () => {
    if (!arrastrando.current) return;
    arrastrando.current = false;
    setArrastreActivo(false);
    if (esScroll.current) { esScroll.current = false; setDx(0); return; }
    if (Math.abs(dx) > 110) {
      setDx(dx > 0 ? 600 : -600);
      setTimeout(() => onBorrar(noti.idNotificacion), 160);
      return;
    }
    const huboSwipe = movido.current;
    setDx(0);
    // Tap: solo notificaciones "accionables" (no las informativas ni las de solicitud, que traen botones)
    if (!huboSwipe && !esSolicitud && (noti.idEntrenamiento || noti.destino)) onAbrir(noti);
  };
  // El navegador tomó el gesto (scroll vertical): no abrir ni borrar, solo resetear.
  const onCancel = () => {
    arrastrando.current = false;
    setArrastreActivo(false);
    esScroll.current = false;
    movido.current = false;
    setDx(0);
  };

  return (
    <div className="nr-swipe">
      <div className="nr-swipe-bg">
        <i className="fas fa-trash"></i>
        <i className="fas fa-trash"></i>
      </div>
      <div
        className={`nr-row nr-row--${tipo} ${noti.leida ? 'nr-row--leida' : ''}`}
        style={{ transform: `translateX(${dx}px)`, transition: arrastreActivo ? 'none' : 'transform 0.2s ease' }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onCancel}
      >
        <div className="nr-icon">{iconoNoti(noti.titulo)}</div>
        <div className="nr-text">
          <div className="nr-titulo">{noti.titulo}</div>
          <div className="nr-msg">{noti.Mensaje || noti.mensaje}</div>
          {(noti.idEntrenamiento || (noti.destino && !esSolicitud)) && (
            <div className="nr-hint"><i className="fas fa-up-right-from-square me-1"></i>Toca para ver</div>
          )}
          {esSolicitud && (
            <div className="nr-acciones">
              <button
                type="button"
                className="nr-btn nr-btn--accept"
                onPointerDown={e => e.stopPropagation()}
                onClick={e => { e.stopPropagation(); onResponder(noti, 'Aceptada'); }}
              ><i className="fas fa-check me-1"></i>Aceptar</button>
              <button
                type="button"
                className="nr-btn nr-btn--reject"
                onPointerDown={e => e.stopPropagation()}
                onClick={e => { e.stopPropagation(); onResponder(noti, 'Rechazada'); }}
              ><i className="fas fa-times me-1"></i>Rechazar</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
