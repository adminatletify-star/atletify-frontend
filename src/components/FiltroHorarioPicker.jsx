import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import './FiltroHorarioPicker.css';

export default function FiltroHorarioPicker({ clases, valor, onCambiar }) {
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState('');

  const claseActual = clases.find(c => String(c.idClase) === String(valor));

  const filtradas = useMemo(() => {
    if (!busqueda.trim()) return clases;
    const q = busqueda.toLowerCase();
    return clases.filter(c =>
      c.nombre.toLowerCase().includes(q) ||
      (c.horarioInicio && c.horarioInicio.substring(0, 5).includes(q))
    );
  }, [clases, busqueda]);

  const seleccionar = (v) => {
    setAbierto(false);
    setBusqueda('');
    if (String(v) !== String(valor)) onCambiar(v);
  };

  const abrir = () => { setBusqueda(''); setAbierto(true); };

  return (
    <>
      <button
        type="button"
        className={`fhp-trigger${!valor ? ' fhp-trigger--todos' : ''}`}
        onClick={abrir}
      >
        <span className="fhp-trigger-left">
          <i className="fas fa-clock"></i>
          {claseActual
            ? <>
                <span className="fhp-hora-badge">
                  {String(claseActual.horarioInicio || '').substring(0, 5)}
                </span>
                {claseActual.nombre}
              </>
            : 'Todos los horarios'
          }
        </span>
        <i className="fas fa-chevron-down fhp-chevron"></i>
      </button>

      {abierto && createPortal(
        <div className="fhp-overlay" onClick={() => { setAbierto(false); setBusqueda(''); }}>
          <div className="fhp-panel" onClick={e => e.stopPropagation()}>

            <div className="fhp-header">
              <span className="fhp-title">
                <i className="fas fa-clock"></i> Filtrar por Horario
              </span>
              <button type="button" className="fhp-close" onClick={() => { setAbierto(false); setBusqueda(''); }}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="fhp-search-wrap">
              <i className="fas fa-search fhp-search-icon"></i>
              <input
                type="text"
                className="fhp-search"
                placeholder="Buscar clase o horario..."
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                autoFocus
              />
            </div>

            <div className="fhp-list">
              <button
                type="button"
                className={`fhp-item fhp-item--todos${!valor ? ' fhp-item--activo' : ''}`}
                onClick={() => seleccionar('')}
              >
                <div className="fhp-icon-wrap fhp-icon--todos">
                  <i className="fas fa-users"></i>
                </div>
                <div className="fhp-item-info">
                  <span className="fhp-item-name">Todos los Horarios</span>
                  <span className="fhp-item-desc">Ver todo el Box</span>
                </div>
                {!valor && <i className="fas fa-check fhp-item-check fhp-check--todos"></i>}
              </button>

              {filtradas.length === 0 && busqueda.trim() && (
                <p className="fhp-empty">No se encontraron clases</p>
              )}

              {filtradas.map(c => {
                const activo = String(c.idClase) === String(valor);
                return (
                  <button
                    key={c.idClase}
                    type="button"
                    className={`fhp-item${activo ? ' fhp-item--activo' : ''}`}
                    onClick={() => seleccionar(c.idClase)}
                  >
                    <div className="fhp-icon-wrap">
                      <i className="fas fa-dumbbell"></i>
                    </div>
                    <div className="fhp-item-info">
                      <span className="fhp-item-name">{c.nombre}</span>
                      <span className="fhp-item-desc">
                        {String(c.horarioInicio || '').substring(0, 5)} – {String(c.horarioFin || '').substring(0, 5)}
                      </span>
                    </div>
                    {activo && <i className="fas fa-check fhp-item-check"></i>}
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
