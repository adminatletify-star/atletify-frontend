import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import './WodPicker.css';

export default function WodPicker({ wods, valor, onCambiar }) {
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const wodActual = wods.find(w => w.idEntrenamiento === valor);

  const filtrados = useMemo(() => {
    if (!busqueda.trim()) return wods;
    const q = busqueda.toLowerCase();
    return wods.filter(w => w.titulo.toLowerCase().includes(q));
  }, [wods, busqueda]);

  const seleccionar = (wod) => {
    setAbierto(false);
    setBusqueda('');
    if (wod.idEntrenamiento !== valor) onCambiar(wod);
  };

  const abrir = () => { setBusqueda(''); setAbierto(true); };

  return (
    <>
      <button
        type="button"
        className={`wdp-trigger${!wodActual ? ' wdp-trigger--vacio' : ''}`}
        onClick={abrir}
      >
        <span className="wdp-trigger-left">
          <i className="fas fa-fire-alt"></i>
          {wodActual ? wodActual.titulo : 'Seleccionar WOD...'}
        </span>
        <i className="fas fa-chevron-down wdp-chevron"></i>
      </button>

      {abierto && createPortal(
        <div className="wdp-overlay" onClick={() => { setAbierto(false); setBusqueda(''); }}>
          <div className="wdp-panel" onClick={e => e.stopPropagation()}>

            <div className="wdp-header">
              <span className="wdp-title">
                <i className="fas fa-fire-alt"></i> WODs Disponibles Hoy
              </span>
              <button type="button" className="wdp-close" onClick={() => { setAbierto(false); setBusqueda(''); }}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="wdp-search-wrap">
              <i className="fas fa-search wdp-search-icon"></i>
              <input
                type="text"
                className="wdp-search"
                placeholder="Buscar por nombre..."
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                autoFocus
              />
            </div>

            <div className="wdp-list">
              {filtrados.length === 0 && (
                <p className="wdp-empty">No se encontraron WODs</p>
              )}
              {filtrados.map(w => {
                const activo = w.idEntrenamiento === valor;
                const bloquePrincipal = w.bloques?.find(b => b.tipoBloque === 'WOD') || w.bloques?.[0];
                const modalidad = bloquePrincipal?.tipoModalidad || '';
                const equipo = bloquePrincipal?.modalidadEquipo || '';

                return (
                  <button
                    key={w.idEntrenamiento}
                    type="button"
                    className={`wdp-item${activo ? ' wdp-item--activo' : ''}`}
                    onClick={() => seleccionar(w)}
                  >
                    <div className="wdp-item-icon">
                      <i className="fas fa-dumbbell"></i>
                    </div>
                    <div className="wdp-item-info">
                      <span className="wdp-item-name">{w.titulo}</span>
                      <div className="wdp-item-tags">
                        {modalidad && <span className="wdp-tag wdp-tag--modalidad">{modalidad}</span>}
                        {equipo && equipo !== 'Individual' && <span className="wdp-tag wdp-tag--equipo">{equipo}</span>}
                        {w.modoRanking === 'Auto'
                          ? <span className="wdp-tag wdp-tag--auto"><i className="fas fa-robot"></i> Auto</span>
                          : <span className="wdp-tag wdp-tag--manual"><i className="fas fa-gavel"></i> Manual</span>
                        }
                      </div>
                    </div>
                    {activo && <i className="fas fa-check wdp-item-check"></i>}
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
