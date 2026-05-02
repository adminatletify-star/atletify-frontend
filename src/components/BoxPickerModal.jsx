import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import './BoxPickerModal.css';

export default function BoxPickerModal({ boxes = [], boxSeleccionado, onChange }) {
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState('');

  const boxActual = useMemo(
    () => boxes.find(b => b.idBox === boxSeleccionado) || null,
    [boxes, boxSeleccionado]
  );

  const boxesFiltrados = useMemo(() => {
    if (!busqueda.trim()) return boxes;
    return boxes.filter(b => b.nombre.toLowerCase().includes(busqueda.toLowerCase()));
  }, [boxes, busqueda]);

  const seleccionar = (idBox) => {
    setAbierto(false);
    setBusqueda('');
    onChange(idBox);
  };

  return (
    <>
      <button
        type="button"
        className="bpm-trigger"
        onClick={() => setAbierto(true)}
        title="Filtrar por Box"
      >
        <i className="fas fa-warehouse bpm-trigger-icon"></i>
        <span className="bpm-trigger-label">
          {boxActual ? boxActual.nombre : 'Todos los Boxes'}
        </span>
        <i className="fas fa-chevron-down bpm-trigger-chevron"></i>
      </button>

      {abierto && createPortal(
        <div className="bpm-overlay" onClick={() => { setAbierto(false); setBusqueda(''); }}>
          <div className="bpm-panel" onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="bpm-header">
              <div className="bpm-header-left">
                <div className="bpm-header-icon">
                  <i className="fas fa-warehouse"></i>
                </div>
                <div>
                  <p className="bpm-header-title">Seleccionar Box</p>
                  <p className="bpm-header-sub">{boxes.length} boxes registrados</p>
                </div>
              </div>
              <button
                type="button"
                className="bpm-close"
                onClick={() => { setAbierto(false); setBusqueda(''); }}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            {/* Búsqueda */}
            {boxes.length > 5 && (
              <div className="bpm-search-wrapper">
                <i className="fas fa-search bpm-search-icon"></i>
                <input
                  type="text"
                  className="bpm-search-input"
                  placeholder="Buscar box..."
                  value={busqueda}
                  onChange={e => setBusqueda(e.target.value)}
                  autoFocus
                />
              </div>
            )}

            {/* Opción "Todos" */}
            <div className="bpm-options">
              <button
                type="button"
                className={`bpm-option bpm-option--todos${boxSeleccionado === null ? ' bpm-option--activo' : ''}`}
                onClick={() => seleccionar(null)}
              >
                <span className="bpm-option-dot bpm-option-dot--todos"></span>
                <span className="bpm-option-label">Todos los Boxes</span>
                {boxSeleccionado === null && <i className="fas fa-check bpm-option-check"></i>}
              </button>

              {/* Lista de boxes */}
              {boxesFiltrados.map((box, i) => (
                <button
                  key={box.idBox}
                  type="button"
                  className={`bpm-option${box.idBox === boxSeleccionado ? ' bpm-option--activo' : ''}`}
                  onClick={() => seleccionar(box.idBox)}
                >
                  <span className="bpm-option-num">{i + 1}</span>
                  <span className="bpm-option-label">{box.nombre}</span>
                  {box.idBox === boxSeleccionado && <i className="fas fa-check bpm-option-check"></i>}
                </button>
              ))}

              {boxesFiltrados.length === 0 && (
                <p className="bpm-empty">Sin coincidencias</p>
              )}
            </div>

          </div>
        </div>
      , document.body)}
    </>
  );
}
