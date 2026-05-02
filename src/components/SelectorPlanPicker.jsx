import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import './SelectorPlanPicker.css';

export default function SelectorPlanPicker({ planes = [], valor = '', onCambiar }) {
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState('');

  const planActual = planes.find(p => String(p.idPlan) === String(valor));

  const plansFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return planes;
    return planes.filter(p =>
      p.nombre.toLowerCase().includes(q) ||
      String(p.precio).includes(q)
    );
  }, [planes, busqueda]);

  const seleccionar = (idPlan) => {
    onCambiar(idPlan);
    setAbierto(false);
    setBusqueda('');
  };

  const abrir = () => {
    setBusqueda('');
    setAbierto(true);
  };

  return (
    <>
      <button
        type="button"
        className={`spp-trigger ${!planActual ? 'spp-trigger--vacio' : ''}`}
        onClick={abrir}
      >
        <span className="spp-trigger-left">
          <i className={`${planActual ? 'fas fa-id-card' : 'fas fa-box-open'} spp-trigger-icon`}></i>
          <span className="spp-trigger-label">
            {planActual
              ? `${planActual.nombre} — $${planActual.precio}`
              : '— Selecciona un Plan —'}
          </span>
        </span>
        <i className="fas fa-chevron-down spp-chevron"></i>
      </button>

      {abierto && createPortal(
        <div className="spp-overlay" onClick={() => setAbierto(false)}>
          <div className="spp-panel" onClick={e => e.stopPropagation()}>

            <div className="spp-header">
              <span className="spp-title">
                <i className="fas fa-layer-group"></i> Planes de membresía
              </span>
              <button type="button" className="spp-close" onClick={() => setAbierto(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="spp-search-wrap">
              <i className="fas fa-search spp-search-icon"></i>
              <input
                className="spp-search-input"
                type="text"
                placeholder="Buscar por nombre o precio…"
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                autoFocus
              />
              {busqueda && (
                <button type="button" className="spp-search-clear" onClick={() => setBusqueda('')}>
                  <i className="fas fa-times"></i>
                </button>
              )}
            </div>

            <div className="spp-lista">
              {plansFiltrados.length === 0 && (
                <div className="spp-empty">
                  <i className="fas fa-search-minus"></i>
                  <span>Sin resultados para "{busqueda}"</span>
                </div>
              )}
              {plansFiltrados.map(p => {
                const activo = String(p.idPlan) === String(valor);
                return (
                  <button
                    key={p.idPlan}
                    type="button"
                    className={`spp-opcion ${activo ? 'spp-opcion--activo' : ''}`}
                    onClick={() => seleccionar(String(p.idPlan))}
                  >
                    <div className="spp-opcion-icono-wrap">
                      <i className="fas fa-id-card"></i>
                    </div>
                    <div className="spp-opcion-texto">
                      <span className="spp-opcion-nombre">{p.nombre}</span>
                      <span className="spp-opcion-meta">
                        <span className="spp-opcion-precio">${p.precio}</span>
                        {p.duracionDias && (
                          <span className="spp-opcion-dur">
                            <i className="fas fa-clock me-1"></i>{p.duracionDias} días
                          </span>
                        )}
                      </span>
                    </div>
                    {activo && <i className="fas fa-check spp-opcion-check"></i>}
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
