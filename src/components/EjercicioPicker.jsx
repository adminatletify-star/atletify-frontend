import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import './EjercicioPicker.css';

export default function EjercicioPicker({ ejercicios, valor, onCambiar }) {
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState('');

  const getEjercicioId = (ejercicio) => (
    ejercicio?.idEjercicio ??
    ejercicio?.idEjercicioDiccionario ??
    ejercicio?.id ??
    ejercicio?.IdEjercicio ??
    ejercicio?.IdEjercicioDiccionario
  );

  const ejercicioActual = ejercicios.find(e => String(getEjercicioId(e)) === String(valor));

  const filtrados = useMemo(() => {
    if (!busqueda.trim()) return ejercicios;
    const q = busqueda.toLowerCase();
    return ejercicios.filter(e =>
      e.nombre.toLowerCase().includes(q) ||
      (e.equipamiento && e.equipamiento.toLowerCase().includes(q))
    );
  }, [ejercicios, busqueda]);

  const seleccionar = (id) => {
    setAbierto(false);
    setBusqueda('');
    if (String(id) !== String(valor)) onCambiar(id);
  };

  const abrir = () => {
    setBusqueda('');
    setAbierto(true);
  };

  return (
    <>
      <button
        type="button"
        className={`ejp-trigger${!ejercicioActual ? ' ejp-trigger--vacio' : ''}`}
        onClick={abrir}
      >
        <span className="ejp-trigger-left">
          <i className="fas fa-dumbbell"></i>
          {ejercicioActual
            ? <>{ejercicioActual.nombre} <span className="ejp-equip-badge">{ejercicioActual.equipamiento}</span></>
            : 'Buscar ejercicio...'
          }
        </span>
        <i className="fas fa-chevron-down ejp-chevron"></i>
      </button>

      {abierto && createPortal(
        <div className="ejp-overlay" onClick={() => { setAbierto(false); setBusqueda(''); }}>
          <div className="ejp-panel" onClick={e => e.stopPropagation()}>

            <div className="ejp-header">
              <span className="ejp-title">
                <i className="fas fa-dumbbell"></i> Ejercicio
              </span>
              <button type="button" className="ejp-close" onClick={() => { setAbierto(false); setBusqueda(''); }}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="ejp-search-wrap">
              <i className="fas fa-search ejp-search-icon"></i>
              <input
                type="text"
                className="ejp-search"
                placeholder="Buscar por nombre o equipamiento..."
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                autoFocus
              />
            </div>

            <div className="ejp-list">
              {filtrados.length === 0 && (
                <p className="ejp-empty">No se encontraron ejercicios</p>
              )}
              {filtrados.map(ej => {
                const idEjercicio = getEjercicioId(ej);
                const activo = String(idEjercicio) === String(valor);
                return (
                  <button
                    key={idEjercicio}
                    type="button"
                    className={`ejp-item${activo ? ' ejp-item--activo' : ''}`}
                    onClick={() => seleccionar(idEjercicio)}
                  >
                    <div className="ejp-item-info">
                      <span className="ejp-item-name">{ej.nombre}</span>
                      {ej.equipamiento && <span className="ejp-item-equip">{ej.equipamiento}</span>}
                    </div>
                    {activo && <i className="fas fa-check ejp-item-check"></i>}
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
