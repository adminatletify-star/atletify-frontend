import { useState, useRef, useEffect, useCallback } from 'react';
import './TimeWheelPicker.css';

const ITEM_H = 44;

/* ── AudioContext singleton ── */
let _audioCtx = null;
function getAudioCtx() {
  if (_audioCtx && _audioCtx.state !== 'closed') return _audioCtx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  _audioCtx = new AC();
  return _audioCtx;
}

function haptic() {
  try {
    if (navigator.vibrate) navigator.vibrate(18);
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

  const idx = Math.max(0, items.indexOf(value));
  const [offset, setOffset] = useState(-idx * ITEM_H);
  const offsetRef = useRef(-idx * ITEM_H);

  useEffect(() => {
    const i = items.indexOf(value);
    if (i >= 0 && !dragging.current) {
      offsetRef.current = -i * ITEM_H;
      setOffset(-i * ITEM_H);
    } else if (i < 0 && !dragging.current) {
      const lastIdx = items.length - 1;
      offsetRef.current = -lastIdx * ITEM_H;
      setOffset(-lastIdx * ITEM_H);
    }
  }, [value, items]);

  const clampContinuous = useCallback((rawOff) => {
    const maxOff = ITEM_H * 0.4;
    const minOff = -(items.length - 1) * ITEM_H - ITEM_H * 0.4;
    return Math.max(minOff, Math.min(maxOff, rawOff));
  }, [items]);

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

  const checkIndexChange = useCallback((off) => {
    const approxIdx = Math.round(-off / ITEM_H);
    const cIdx = Math.max(0, Math.min(items.length - 1, approxIdx));
    if (cIdx !== prevIndex.current) {
      prevIndex.current = cIdx;
      haptic();
    }
  }, [items]);

  const wheelAccum = useRef(0);
  const wheelTimer = useRef(null);

  const onWheel = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    wheelAccum.current += e.deltaY;
    const steps = Math.trunc(wheelAccum.current / 35);
    if (steps !== 0) {
      wheelAccum.current -= steps * 35;
      const next = offsetRef.current - steps * ITEM_H;
      const snapped = snapToNearest(next);
      offsetRef.current = snapped;
      setOffset(snapped);
    }
    clearTimeout(wheelTimer.current);
    wheelTimer.current = setTimeout(() => { wheelAccum.current = 0; }, 150);
  }, [snapToNearest]);

  useEffect(() => {
    const el = colRef.current;
    if (!el) return;
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [onWheel]);

  const pointerY = (e) => e.touches ? e.touches[0].clientY : e.clientY;
  const dragStarted = useRef(false);

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
    if (!dragStarted.current) {
      if (Math.abs(y - startY.current) < 5) return;
      dragStarted.current = true;
    }
    const now = Date.now();
    const dt = Math.max(now - lastTime.current, 8);
    const rawVel = (y - lastY.current) / dt;
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

    let vel = velocity.current * ITEM_H * 0.8;
    let currentOff = offsetRef.current;

    const decel = () => {
      vel *= 0.94;
      if (Math.abs(vel) < 0.8) {
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
    <div className={`twp-column${isTouching ? ' twp-column--active' : ''}`} ref={colRef}>
      <span className="twp-column-label">{label}</span>
      <div
        className={`twp-viewport${isTouching ? ' twp-viewport--active' : ''}`}
        onMouseDown={onStart}
        onTouchStart={onStart}
        style={{ height: visible * ITEM_H }}
      >
        <div className="twp-mask twp-mask--top" />
        <div className="twp-mask twp-mask--bottom" />
        <div className={`twp-indicator${isTouching ? ' twp-indicator--active' : ''}`} />
        <div
          className="twp-track"
          style={{
            transform: `translateY(${offset + half * ITEM_H}px)`,
            transition: dragging.current ? 'none' : 'transform 0.45s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          }}
        >
          {items.map((item, i) => {
            const dist = i + offset / ITEM_H;
            const absD = Math.abs(dist);
            const scale = Math.max(0.55, 1.25 - absD * 0.28);
            const opacity = Math.max(0.1, 1 - absD * 0.38);
            const rotateX = dist * -22;
            const isCenter = absD < 0.5;
            return (
              <div
                key={i}
                className={`twp-item${isCenter ? ' twp-item--active' : ''}`}
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

/* ── Conversión 24h ↔ 12h ── */
function to12h(h24) {
  const h = parseInt(h24);
  if (h === 0)  return { hour: 12, period: 'AM' };
  if (h < 12)   return { hour: h,  period: 'AM' };
  if (h === 12) return { hour: 12, period: 'PM' };
  return { hour: h - 12, period: 'PM' };
}
function to24h(h12, period) {
  if (period === 'AM') return h12 === 12 ? 0 : h12;
  return h12 === 12 ? 12 : h12 + 12;
}
function toMinutes(hhmm) {
  const [h, m] = (hhmm || '00:00').split(':').map(Number);
  return h * 60 + m;
}

/* ═══════════════════════════════════════════
   TimeWheelPicker — Componente principal
   ═══════════════════════════════════════════ */
export default function TimeWheelPicker({ value, onAccept, onCancel, minTime }) {
  const parts = (value || '06:00').split(':');
  const init = to12h(parseInt(parts[0]) || 6);

  const [hour,   setHour]   = useState(init.hour);
  const [minute, setMinute] = useState(parseInt(parts[1]) || 0);
  const [period, setPeriod] = useState(init.period);

  const hours   = Array.from({ length: 12 }, (_, i) => i + 1);
  const minutes = Array.from({ length: 60 }, (_, i) => i);
  const periods = ['AM', 'PM'];

  const visible = typeof window !== 'undefined' && window.innerHeight < 720 ? 5 : 7;
  const half = Math.floor(visible / 2);

  const pad = (n) => String(n).padStart(2, '0');

  /* Validación en tiempo real */
  const selectedMins = to24h(hour, period) * 60 + minute;
  const minMins      = minTime ? toMinutes(minTime) : -1;
  const isValid      = minMins < 0 || selectedMins > minMins;

  return (
    <div className="time-wheel-picker">
      <div className="time-wheel-header">
        <i className="fas fa-clock" />
        <span>Selecciona la hora</span>
      </div>

      <div className={`time-wheel-display${!isValid ? ' time-wheel-display--error' : ''}`}>
        <span className="time-wheel-display-value">
          {hour}:{pad(minute)} <span className="time-wheel-display-period">{period}</span>
        </span>
      </div>

      {!isValid && (
        <div className="time-wheel-error">
          <i className="fas fa-exclamation-triangle me-2" />
          Debe ser después de las {(() => {
            const { hour: h, period: p } = to12h(Math.floor(minMins / 60));
            return `${h}:${pad(minMins % 60)} ${p}`;
          })()}
        </div>
      )}

      <div className="time-wheel-columns">
        <WheelColumn
          items={hours}
          value={hour}
          onChange={setHour}
          label="Hora"
          visible={visible}
          half={half}
        />
        <div className="time-wheel-colon" style={{ height: visible * ITEM_H }}>
          <span>:</span>
        </div>
        <WheelColumn
          items={minutes}
          value={minute}
          onChange={setMinute}
          label="Min"
          formatItem={pad}
          visible={visible}
          half={half}
        />
        <div className="time-wheel-sep" style={{ height: visible * ITEM_H }} />
        <WheelColumn
          items={periods}
          value={period}
          onChange={setPeriod}
          label="AM/PM"
          visible={visible}
          half={half}
        />
      </div>

      <div className="time-wheel-actions">
        <button
          type="button"
          className="time-wheel-btn time-wheel-btn--cancel"
          onClick={onCancel}
        >
          <i className="fas fa-times me-2" />Cancelar
        </button>
        <button
          type="button"
          className="time-wheel-btn time-wheel-btn--accept"
          disabled={!isValid}
          onClick={() => {
            if (onAccept && isValid) {
              const h24 = to24h(hour, period);
              onAccept(`${pad(h24)}:${pad(minute)}`);
            }
          }}
        >
          <i className="fas fa-check me-2" />Aceptar
        </button>
      </div>
    </div>
  );
}
