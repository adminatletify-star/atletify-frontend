import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import './BoxPicker.css';

export default function BoxPicker({ valor, opciones = [], onCambiar }) {
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState('');

  const boxActual = opciones.find(b => String(b.idBox) === String(valor));

  const filtrados = useMemo(() => {
    if (!busqueda.trim()) return opciones;
    const q = busqueda.toLowerCase();
    return opciones.filter(b => b.nombre.toLowerCase().includes(q));
  }, [opciones, busqueda]);

  const seleccionar = (idBox) => {
    setAbierto(false);
    setBusqueda('');
    onCambiar(idBox === valor ? '' : idBox);
  };

  const abrir = () => {
    setBusqueda('');
    setAbierto(true);
  };

  return (
    <>
      <button
        type="button"
        className={`bxp-trigger${boxActual ? ' bxp-trigger--activo' : ''}`}
        onClick={abrir}
      >
        <span className="bxp-trigger-left">
          <i className={boxActual ? 'fas fa-store' : 'fas fa-store-alt'} />
          {boxActual ? boxActual.nombre : 'Soy usuario independiente'}
        </span>
        <i className="fas fa-chevron-down bxp-chevron" />
      </button>

      {abierto && createPortal(
        <div className="bxp-overlay" onClick={() => { setAbierto(false); setBusqueda(''); }}>
          <div className="bxp-panel" onClick={e => e.stopPropagation()}>

            <div className="bxp-header">
              <div className="bxp-header-left">
                <div className="bxp-header-icon">
                  <i className="fas fa-store-alt" />
                </div>
                <span className="bxp-title">Selecciona tu Box</span>
              </div>
              <button type="button" className="bxp-close" onClick={() => { setAbierto(false); setBusqueda(''); }}>
                <i className="fas fa-times" />
              </button>
            </div>

            <div className="bxp-search-wrap">
              <i className="fas fa-search bxp-search-icon" />
              <input
                className="bxp-search"
                placeholder="Buscar box..."
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                autoFocus
              />
            </div>

            <div className="bxp-options">
              {/* Opción independiente */}
              <button
                type="button"
                className={`bxp-option${!valor ? ' bxp-option--activo' : ''}`}
                onClick={() => seleccionar('')}
              >
                <div className="bxp-opt-icon bxp-opt-icon--indie">
                  <i className="fas fa-user" />
                </div>
                <div className="bxp-opt-info">
                  <span className="bxp-opt-nombre">Usuario independiente</span>
                  <span className="bxp-opt-desc">Sin vinculación a box</span>
                </div>
                {!valor && <i className="fas fa-check bxp-check" />}
              </button>

              {filtrados.length > 0 && <div className="bxp-divider" />}

              {filtrados.map(box => (
                <button
                  key={box.idBox}
                  type="button"
                  className={`bxp-option${String(box.idBox) === String(valor) ? ' bxp-option--activo' : ''}`}
                  onClick={() => seleccionar(String(box.idBox))}
                >
                  <div className="bxp-opt-icon">
                    <i className="fas fa-store" />
                  </div>
                  <div className="bxp-opt-info">
                    <span className="bxp-opt-nombre">{box.nombre}</span>
                  </div>
                  {String(box.idBox) === String(valor) && <i className="fas fa-check bxp-check" />}
                </button>
              ))}

              {filtrados.length === 0 && busqueda.trim() && (
                <div className="bxp-empty">
                  <i className="fas fa-search" />
                  <span>Sin resultados para "{busqueda}"</span>
                </div>
              )}
            </div>

          </div>
        </div>,
        document.body
      )}
    </>
  );
}
