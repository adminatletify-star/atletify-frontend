import { useRef, useState, useLayoutEffect } from 'react';
import './TextoMarquee.css';

/**
 * Muestra un texto en una sola línea. Si NO cabe en su contenedor, lo desliza en bucle
 * continuo (marquee tipo carrusel) para poder leerlo completo; si cabe, lo deja estático.
 *
 * Renderiza un <span>; la tipografía (fuente, color, tamaño) la aporta el contenedor o la
 * className que se le pase. Pensado para envolverse en el título que ya estiliza el texto.
 *
 * - Detecta el desborde midiendo el ancho real del texto vs el ancho visible (con un medidor
 *   invisible), así que reacciona a resizes y a cambios de tamaño de fuente por breakpoint.
 * - El bucle es fluido: renderiza el texto dos veces y traslada la pista -50% (una copia exacta).
 * - Respeta `prefers-reduced-motion` (no anima si el usuario pidió menos movimiento).
 *
 * Props: text (string), className, speed (px/s), gap (px de separación entre copias).
 */
export default function TextoMarquee({ text = '', className = '', speed = 48, gap = 48 }) {
  const viewRef = useRef(null);
  const measureRef = useRef(null);
  const [overflow, setOverflow] = useState(false);
  const [dur, setDur] = useState(8);

  useLayoutEffect(() => {
    const view = viewRef.current;
    const measure = measureRef.current;
    if (!view || !measure) return;

    const check = () => {
      const textW = measure.getBoundingClientRect().width;
      const viewW = view.clientWidth;
      const over = textW > viewW + 1; // +1 tolerancia de subpíxel
      setOverflow(over);
      if (over) setDur(Math.max(4, (textW + gap) / speed)); // velocidad lineal constante
    };

    check();
    const ro = new ResizeObserver(check);
    ro.observe(view);
    ro.observe(measure);
    return () => ro.disconnect();
  }, [text, speed, gap]);

  return (
    <span ref={viewRef} className={`tmq ${className} ${overflow ? 'tmq--run' : ''}`}>
      {/* Medidor invisible (texto completo en una línea) para detectar el desborde */}
      <span ref={measureRef} className="tmq-measure" aria-hidden="true">{text}</span>

      {overflow ? (
        <span className="tmq-track" style={{ animationDuration: `${dur}s`, '--tmq-gap': `${gap}px` }}>
          <span className="tmq-seg">{text}</span>
          <span className="tmq-seg" aria-hidden="true">{text}</span>
        </span>
      ) : (
        <span className="tmq-text">{text}</span>
      )}
    </span>
  );
}
