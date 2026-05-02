import { useState } from 'react';
import { createPortal } from 'react-dom';
import './FiltroMultiplePicker.css';
import './TallaPlayeraPicker.css';
import './TipoSangrePicker.css';
import './CategoriaBasePicker.css';

export default function FiltroMultiplePicker({ titulo, icono, opciones, seleccionados, onCambiar, variant = 'lista' }) {
  const [abierto, setAbierto] = useState(false);

  // Toggle selection
  const toggleOpcion = (valor) => {
    if (seleccionados.includes(valor)) {
      onCambiar(seleccionados.filter(x => x !== valor));
    } else {
      onCambiar([...seleccionados, valor]);
    }
  };

  const limpiar = () => {
    onCambiar([]);
  };

  // Renderers para las distintas variantes
  const renderLista = () => (
    <div className="fmp-variant-lista">
      {opciones.map(op => {
        const isSelected = seleccionados.includes(op.valor);
        return (
          <button
            key={op.valor}
            type="button"
            className={`fmp-option-btn ${isSelected ? 'fmp-option-btn--activo' : ''}`}
            onClick={() => toggleOpcion(op.valor)}
          >
            <span>{op.etiqueta}</span>
            <i className="fas fa-check-circle fmp-option-icon"></i>
          </button>
        );
      })}
    </div>
  );

  const renderTalla = () => (
    <div className="tpp-grid">
      {opciones.map(op => {
        const isSelected = seleccionados.includes(op.valor);
        const desc = op.desc ? op.desc : op.valor;
        const initials = desc.split(' ').map(w => w[0]).join('');
        return (
          <button
            key={op.valor}
            type="button"
            className={`tpp-size-btn ${isSelected ? 'tpp-size-btn--activo' : ''}`}
            onClick={() => toggleOpcion(op.valor)}
          >
            <span className="tpp-size-label">{op.valor}</span>
            <span className="tpp-size-desc">{initials}</span>
          </button>
        );
      })}
    </div>
  );

  const renderSangre = () => (
    <div className="tsp-grid">
      {opciones.map(op => {
        const isSelected = seleccionados.includes(op.valor);
        const isPos = op.valor.includes('+');
        return (
          <button
            key={op.valor}
            type="button"
            className={`tsp-blood-btn ${isSelected ? 'tsp-blood-btn--activo' : ''} ${isPos ? 'tsp-blood-btn--pos' : 'tsp-blood-btn--neg'}`}
            onClick={() => toggleOpcion(op.valor)}
          >
            <span className="tsp-blood-label">{op.valor}</span>
          </button>
        );
      })}
    </div>
  );

  const renderNivel = () => (
    <div className="cbp-options">
      {opciones.map(op => {
        const isSelected = seleccionados.includes(op.valor);
        const keyCls = op.keyName ? `cbp-option--${op.keyName}` : '';
        return (
          <button
            key={op.valor}
            type="button"
            className={`cbp-option ${keyCls} ${isSelected ? 'cbp-option--activo' : ''}`}
            onClick={() => toggleOpcion(op.valor)}
          >
            <div className="cbp-icon-wrap">
              <i className={op.icono || 'fas fa-medal'}></i>
            </div>
            <div className="cbp-info">
              <span className="cbp-nombre">{op.etiqueta}</span>
              <span className="cbp-desc">{op.desc || ''}</span>
            </div>
            {isSelected && <i className="fas fa-check cbp-check"></i>}
          </button>
        );
      })}
    </div>
  );

  const renderBody = () => {
    switch (variant) {
      case 'talla': return renderTalla();
      case 'sangre': return renderSangre();
      case 'nivel': return renderNivel();
      case 'lista':
      default: return renderLista();
    }
  };

  return (
    <>
      <button
        type="button"
        className={`fmp-trigger ${seleccionados.length > 0 ? 'fmp-trigger--activo' : ''}`}
        onClick={() => setAbierto(true)}
      >
        <span className="fmp-trigger-left">
          <i className={icono}></i>
          {titulo}
          {seleccionados.length > 0 && (
            <span className="fmp-badge">{seleccionados.length}</span>
          )}
        </span>
        <i className="fas fa-chevron-down fmp-chevron"></i>
      </button>

      {abierto && createPortal(
        <div className="fmp-overlay" onClick={() => setAbierto(false)}>
          <div className="fmp-panel" onClick={e => e.stopPropagation()}>
            
            <div className="fmp-header">
              <span className="fmp-title">
                <i className={icono}></i> Filtrar por {titulo}
              </span>
              <button type="button" className="fmp-close" onClick={() => setAbierto(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="fmp-body">
              {renderBody()}
            </div>

            <div className="fmp-footer">
              <button 
                type="button" 
                className="fmp-btn-limpiar" 
                onClick={limpiar}
                disabled={seleccionados.length === 0}
                style={{ opacity: seleccionados.length === 0 ? 0.5 : 1 }}
              >
                Limpiar
              </button>
              <button type="button" className="fmp-btn-listo" onClick={() => setAbierto(false)}>
                Listo
              </button>
            </div>

          </div>
        </div>,
        document.body
      )}
    </>
  );
}
