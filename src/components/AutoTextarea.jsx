import { useRef, useEffect } from 'react';

// Textarea que crece automáticamente con su contenido (sin scroll interno).
// Se ajusta al escribir, al pegar y al precargar valor (modo edición).
export default function AutoTextarea({ value, onChange, className, minRows = 2, style, ...rest }) {
  const ref = useRef(null);

  const resize = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  };

  // Reajusta cuando cambia el valor desde fuera (p. ej. al cargar un WOD/plantilla).
  useEffect(() => { resize(); }, [value]);

  return (
    <textarea
      ref={ref}
      rows={minRows}
      value={value}
      onChange={onChange}
      onInput={resize}
      className={className}
      style={{ overflow: 'hidden', resize: 'none', ...style }}
      {...rest}
    />
  );
}
