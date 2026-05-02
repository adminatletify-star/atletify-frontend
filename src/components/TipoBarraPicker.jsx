import { useState } from 'react';
import { createPortal } from 'react-dom';
import './TipoBarraPicker.css';

const COLORES = {
  'kg-20': '#e63946', 'kg-15': '#4fc3f7', 'kg-10': '#f5a623', 'kg-7.5': '#a8b2d1', 'kg-5': '#81c784',
  'lb-45': '#e63946', 'lb-35': '#4fc3f7', 'lb-25': '#f5a623', 'lb-15': '#a8b2d1', 'lb-10': '#81c784',
};

export default function TipoBarraPicker({ barras = [], valor, etiqueta = 'kg', onCambiar }) {
  const [abierto, setAbierto] = useState(false);

  const barraActual = barras.find(b => b.medida === valor) || barras[0];
  const colorActual = COLORES[barraActual?.id] || '#e63946';

  const seleccionar = (medida) => {
    setAbierto(false);
    if (medida !== valor) onCambiar(medida);
  };

  return (
    <>
      <button
        type="button"
        className="tbp-trigger"
        onClick={() => setAbierto(true)}
      >
        <span className="tbp-trigger-left">
          <span className="tbp-trigger-icon" style={{ background: `${colorActual}18`, borderColor: `${colorActual}40`, color: colorActual }}>
            <i className="fas fa-dumbbell" />
          </span>
          <span className="tbp-trigger-text">
            <span className="tbp-trigger-nombre">{barraActual?.nombre || '—'}</span>
            <span className="tbp-trigger-medida" style={{ color: colorActual }}>{barraActual?.medidaMostrar} {etiqueta}</span>
          </span>
        </span>
        <i className="fas fa-chevron-down tbp-chevron" />
      </button>

      {abierto && createPortal(
        <div className="tbp-overlay" onClick={() => setAbierto(false)}>
          <div className="tbp-panel" onClick={e => e.stopPropagation()}>

            <div className="tbp-header">
              <div className="tbp-header-left">
                <div className="tbp-header-icon">
                  <i className="fas fa-dumbbell" />
                </div>
                <span className="tbp-title">Tipo de Barra</span>
                <span className="tbp-unit-badge">{etiqueta}</span>
              </div>
              <button type="button" className="tbp-close" onClick={() => setAbierto(false)}>
                <i className="fas fa-times" />
              </button>
            </div>

            <div className="tbp-options">
              {barras.map(barra => {
                const c = COLORES[barra.id] || '#e63946';
                const activo = barra.medida === valor;
                return (
                  <button
                    key={barra.id}
                    type="button"
                    className={`tbp-option${activo ? ' tbp-option--activo' : ''}`}
                    style={{
                      '--tbp-c': c,
                      borderColor: activo ? `${c}80` : undefined,
                      background: activo ? `${c}14` : undefined,
                      boxShadow: activo ? `0 0 20px ${c}15` : undefined
                    }}
                    onClick={() => seleccionar(barra.medida)}
                  >
                    <div className="tbp-opt-peso" style={{
                      background: `${c}12`,
                      borderColor: activo ? `${c}55` : `${c}25`
                    }}>
                      <span className="tbp-peso-numero" style={{ color: activo ? c : undefined }}>{barra.medidaMostrar}</span>
                      <span className="tbp-peso-unidad" style={{ color: `${c}aa` }}>{etiqueta}</span>
                    </div>
                    <span className="tbp-opt-nombre" style={{ color: activo ? c : undefined }}>{barra.nombre}</span>
                    {activo && (
                      <span className="tbp-check" style={{ background: `${c}25`, color: c }}>
                        <i className="fas fa-check" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

          </div>
        </div>,
        document.body
      )}
    </>
  );
}
