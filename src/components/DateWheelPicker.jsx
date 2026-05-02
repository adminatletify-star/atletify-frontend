import { useState, useRef, useEffect, useCallback } from 'react';
import './DateWheelPicker.css';

const MONTHS = [
  'Ene','Feb','Mar','Abr','May','Jun',
  'Jul','Ago','Sep','Oct','Nov','Dic',
];
const ITEM_H = 44;        // altura de cada slot
// VISIBLE y HALF se calculan de forma responsiva en DateWheelPicker
// y se pasan a WheelColumn como props

/* ── AudioContext singleton — evita el límite de instancias del navegador ── */
let _audioCtx = null;
function getAudioCtx() {
  if (_audioCtx && _audioCtx.state !== 'closed') return _audioCtx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  _audioCtx = new AC();
  return _audioCtx;
}

/* ── Vibración háptica (móvil) ── */
function haptic() {
  try {
    // Intentar vibración nativa
    if (navigator.vibrate) {
      navigator.vibrate(18);
    }
    // AudioContext click como fallback táctil (sutil click audible)
    const ctx = getAudioCtx();
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 150;
      gain.gain.value = 0.03;
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
      osc.stop(ctx.currentTime + 0.04);
    }
  } catch (_) {}
}

/* ═══════════════════════════════════════════
   Columna tipo engrane individual
   ═══════════════════════════════════════════ */
function WheelColumn({ items, value, onChange, label, formatItem, visible = 7, half = 3 }) {
  const colRef = useRef(null);
  const dragging = useRef(false);
  const startY = useRef(0);
  const startOffset = useRef(0);
  const velocity = useRef(0);
  const lastY = useRef(0);
  const lastTime = useRef(0);
  const momentum = useRef(null);
  const prevIndex = useRef(-1);
  const [isTouching, setIsTouching] = useState(false);

  const idx = Math.max(0, items.indexOf(value)); // Bug 2 fix: nunca -1
  const [offset, setOffset] = useState(-idx * ITEM_H);
  const offsetRef = useRef(-idx * ITEM_H);

  useEffect(() => {
    const i = items.indexOf(value);
    // Bug 1 fix: si value no está en items (ej. día 30 en febrero), no mover — el padre ya corregirá
    if (i >= 0 && !dragging.current) {
      offsetRef.current = -i * ITEM_H;
      setOffset(-i * ITEM_H);
    } else if (i < 0 && !dragging.current) {
      // Snap al último ítem disponible si el valor no existe en la lista
      const lastIdx = items.length - 1;
      offsetRef.current = -lastIdx * ITEM_H;
      setOffset(-lastIdx * ITEM_H);
    }
  }, [value, items]);

  /* Clamp continuo — sin snap, solo límites */
  const clampContinuous = useCallback((rawOff) => {
    const maxOff = ITEM_H * 0.4;                          // rubber band arriba
    const minOff = -(items.length - 1) * ITEM_H - ITEM_H * 0.4; // rubber band abajo
    return Math.max(minOff, Math.min(maxOff, rawOff));
  }, [items]);

  /* Snap final — redondea al ítem más cercano y notifica */
  const snapToNearest = useCallback((rawOff) => {
    const maxOff = 0;
    const minOff = -(items.length - 1) * ITEM_H;
    const clamped = Math.max(minOff, Math.min(maxOff, rawOff));
    const snapped = Math.round(clamped / ITEM_H) * ITEM_H;
    const newIdx = Math.round(-snapped / ITEM_H);
    if (newIdx >= 0 && newIdx < items.length) {
      if (newIdx !== prevIndex.current) {
        prevIndex.current = newIdx;
        haptic();
      }
      onChange(items[newIdx]);
    }
    return snapped;
  }, [items, onChange]);

  /* Detectar cambio de ítem durante scroll continuo (para haptic) */
  const checkIndexChange = useCallback((off) => {
    const approxIdx = Math.round(-off / ITEM_H);
    const cIdx = Math.max(0, Math.min(items.length - 1, approxIdx));
    if (cIdx !== prevIndex.current) {
      prevIndex.current = cIdx;
      haptic();
    }
  }, [items]);

  /* ── Wheel (mouse / trackpad) — suave con acumulación ── */
  const wheelAccum = useRef(0);
  const wheelTimer = useRef(null);

  const onWheel = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    // Acumular delta para trackpads que envían muchos eventos pequeños
    wheelAccum.current += e.deltaY;
    const steps = Math.trunc(wheelAccum.current / 35);
    if (steps !== 0) {
      wheelAccum.current -= steps * 35;
      const next = offsetRef.current - steps * ITEM_H;
      const snapped = snapToNearest(next);
      offsetRef.current = snapped;
      setOffset(snapped);
    }
    // Reset acumulador tras pausa
    clearTimeout(wheelTimer.current);
    wheelTimer.current = setTimeout(() => { wheelAccum.current = 0; }, 150);
  }, [snapToNearest]);

  useEffect(() => {
    const el = colRef.current;
    if (!el) return;
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [onWheel]);

  /* ── Touch / Mouse drag ── */
  const pointerY = (e) => e.touches ? e.touches[0].clientY : e.clientY;
  const dragStarted = useRef(false); // threshold antes de emitir movimiento

  const onStart = (e) => {
    if (momentum.current) cancelAnimationFrame(momentum.current);
    dragging.current = true;
    dragStarted.current = false;
    setIsTouching(true);
    startY.current = pointerY(e);
    startOffset.current = offsetRef.current;
    velocity.current = 0;
    lastY.current = pointerY(e);
    lastTime.current = Date.now();
    haptic();
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onEnd);
  };

  const onMove = (e) => {
    if (!dragging.current) return;
    e.preventDefault();
    const y = pointerY(e);

    // Threshold de 5px para evitar micro-movimientos accidentales
    if (!dragStarted.current) {
      if (Math.abs(y - startY.current) < 5) return;
      dragStarted.current = true;
    }

    const now = Date.now();
    const dt = Math.max(now - lastTime.current, 8); // mínimo 8ms para evitar velocidades extremas
    const rawVel = (y - lastY.current) / dt;
    // Clamp velocidad para evitar saltos bruscos
    velocity.current = Math.max(-1.5, Math.min(1.5, rawVel));
    lastY.current = y;
    lastTime.current = now;
    const raw = startOffset.current + (y - startY.current);
    const clamped = clampContinuous(raw);
    checkIndexChange(clamped);
    offsetRef.current = clamped;
    setOffset(clamped);
  };

  const onEnd = () => {
    dragging.current = false;
    dragStarted.current = false;
    setIsTouching(false);
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseup', onEnd);
    window.removeEventListener('touchmove', onMove);
    window.removeEventListener('touchend', onEnd);

    // Momentum suave — desacelera progresivamente y snap al final
    let vel = velocity.current * ITEM_H * 0.8; // reducido para menos inercia
    let currentOff = offsetRef.current;

    const decel = () => {
      vel *= 0.94;
      if (Math.abs(vel) < 0.8) {
        // Snap suave al ítem más cercano
        const snapped = snapToNearest(currentOff);
        offsetRef.current = snapped;
        setOffset(snapped);
        return;
      }
      currentOff = clampContinuous(currentOff + vel);
      checkIndexChange(currentOff);
      offsetRef.current = currentOff;
      setOffset(currentOff);
      momentum.current = requestAnimationFrame(decel);
    };
    momentum.current = requestAnimationFrame(decel);
  };

  return (
    <div className={`wheel-column${isTouching ? ' wheel-column--active' : ''}`} ref={colRef}>
      <span className="wheel-column-label">{label}</span>
      <div
        className={`wheel-viewport${isTouching ? ' wheel-viewport--active' : ''}`}
        onMouseDown={onStart}
        onTouchStart={onStart}
        style={{ height: visible * ITEM_H }}
      >
        {/* Máscara de degradado + línea central */}
        <div className="wheel-mask wheel-mask--top" />
        <div className="wheel-mask wheel-mask--bottom" />
        <div className={`wheel-indicator${isTouching ? ' wheel-indicator--active' : ''}`} />

        <div
          className="wheel-track"
          style={{
            transform: `translateY(${offset + half * ITEM_H}px)`,
            transition: dragging.current ? 'none' : 'transform 0.45s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          }}
        >
          {items.map((item, i) => {
            const dist = i + offset / ITEM_H;
            const absD = Math.abs(dist);
            // Escala y opacidad continuas — transición suave entre ítems
            const scale = Math.max(0.55, 1.25 - absD * 0.28);
            const opacity = Math.max(0.1, 1 - absD * 0.38);
            const rotateX = dist * -22;
            const isCenter = absD < 0.5;
            return (
              <div
                key={i}
                className={`wheel-item${isCenter ? ' wheel-item--active' : ''}`}
                style={{
                  height: ITEM_H,
                  transform: `perspective(200px) rotateX(${rotateX}deg) scale(${scale})`,
                  opacity,
                }}
              >
                {formatItem ? formatItem(item) : item}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   DateWheelPicker — Componente principal
   ═══════════════════════════════════════════ */
export default function DateWheelPicker({ onChange, onAccept, onCancel, initialDate }) {
  const now = initialDate || new Date(2000, 0, 1);
  const [day, setDay]     = useState(now.getDate());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear]   = useState(now.getFullYear());

  // Días válidos para el mes/año — new Date(year, month, 0) da el último día del mes (month es 1-12)
  const daysInMonth = new Date(year, month, 0).getDate();

  // Bug 3 & 4 fix: safeDay síncrono — jamás se pasa un día inválido a WheelColumn ni a onChange
  const safeDay = Math.min(day, daysInMonth);

  const days   = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const currentYear = new Date().getFullYear();
  const years  = Array.from({ length: currentYear - 1940 + 1 }, (_, i) => 1940 + i);

  // Sincronizar day si excede el máximo (ej. tenías día 31 y cambias a mes de 30)
  useEffect(() => {
    if (day > daysInMonth) setDay(daysInMonth);
  }, [day, daysInMonth]);

  // Bug 5 fix: onChange via ref para no incluirla en deps y evitar disparos extra
  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  // Notificar cambios — siempre con fecha válida
  useEffect(() => {
    if (onChangeRef.current) {
      const d = new Date(year, month - 1, safeDay);
      onChangeRef.current(d);
    }
  }, [safeDay, month, year]);

  // Responsivo: 5 ítems en pantallas pequeñas (ahorra ~88px de altura)
  const visible = typeof window !== 'undefined' && window.innerHeight < 720 ? 5 : 7;
  const half = Math.floor(visible / 2);

  const formatMonth = (m) => MONTHS[m - 1];

  return (
    <div className="date-wheel-picker">
      <div className="date-wheel-header">
        <i className="fas fa-birthday-cake" />
        <span>Fecha de Nacimiento</span>
      </div>

      <div className="date-wheel-display">
        <span className="date-wheel-display-value">
          {/* Bug 4 fix: mostrar safeDay, nunca un día inválido */}
          {String(safeDay).padStart(2, '0')} / {MONTHS[month - 1]} / {year}
        </span>
      </div>

      <div className="date-wheel-columns">
        <WheelColumn
          items={days}
          value={safeDay}      /* Bug 1 fix: siempre dentro del rango */
          onChange={setDay}
          label="Día"
          formatItem={(d) => String(d).padStart(2, '0')}
          visible={visible}
          half={half}
        />
        <div className="date-wheel-separator" style={{ height: visible * ITEM_H }} />
        <WheelColumn
          items={months}
          value={month}
          onChange={setMonth}
          label="Mes"
          formatItem={formatMonth}
          visible={visible}
          half={half}
        />
        <div className="date-wheel-separator" style={{ height: visible * ITEM_H }} />
        <WheelColumn
          items={years}
          value={year}
          onChange={setYear}
          label="Año"
          visible={visible}
          half={half}
        />
      </div>

      <div className="date-wheel-age">
        {(() => {
          const today = new Date();
          let age = today.getFullYear() - year;
          const m = today.getMonth() - (month - 1);
          if (m < 0 || (m === 0 && today.getDate() < day)) age--;
          return age >= 0 && age < 120 ? (
            <><i className="fas fa-user-clock me-2" />{age} años</>
          ) : null;
        })()}
      </div>

      <div className="date-wheel-actions">
        <button
          type="button"
          className="date-wheel-btn date-wheel-btn--cancel"
          onClick={onCancel}
        >
          <i className="fas fa-times me-2" />Cancelar
        </button>
        <button
          type="button"
          className="date-wheel-btn date-wheel-btn--accept"
          onClick={() => {
            if (onAccept) {
              const d = new Date(year, month - 1, Math.min(day, daysInMonth));
              onAccept(d);
            }
          }}
        >
          <i className="fas fa-check me-2" />Aceptar
        </button>
      </div>
    </div>
  );
}
