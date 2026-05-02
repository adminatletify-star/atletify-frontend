import React, { useState, useRef } from 'react';

// Botón que se bloquea mientras procesa para evitar doble clic
// Props: onClick (async), tiempoBloqueo (ms, default 5000), textoProcesando (default 'Procesando...')
// Nota: usa ref para el bloqueo (síncrono) y state solo para la apariencia, para no
// interferir con el mecanismo click→submit de los formularios nativos.
export const BotonSeguro = ({ onClick, children, className = '', tiempoBloqueo = 5000, textoProcesando = 'Procesando...', ...props }) => {
  const bloqueadoRef = useRef(false);
  const [procesando, setProcesando] = useState(false);

  const manejarClic = async (evento) => {
    if (bloqueadoRef.current) return;
    bloqueadoRef.current = true;
    setProcesando(true);

    try {
      if (onClick) await onClick(evento);
    } finally {
      setTimeout(() => {
        bloqueadoRef.current = false;
        setProcesando(false);
      }, tiempoBloqueo);
    }
  };

  const { disabled, style, ...restProps } = props;

  return (
    <button
      onClick={manejarClic}
      disabled={disabled}
      className={`${className}${procesando ? ' opacity-50' : ''}`}
      style={{ cursor: procesando ? 'not-allowed' : undefined, ...style }}
      {...restProps}
    >
      {procesando ? textoProcesando : children}
    </button>
  );
};

export default BotonSeguro;
