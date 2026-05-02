import { useState } from 'react';
import { createPortal } from 'react-dom';
import './EjercicioOlimpicoPicker.css';

export default function EjercicioOlimpicoPicker({ ejercicios = [], valor, onCambiar }) {
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const actual = ejercicios.find(e => e.idEjercicio.toString() === valor?.toString());

  const filtrados = ejercicios.filter(e =>
    e.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  const seleccionar = (id) => {
    setAbierto(false);
    setBusqueda('');
    if (id.toString() !== valor?.toString()) onCambiar(id.toString());
  };

  const cerrar = () => {
    setAbierto(false);
    setBusqueda('');
  };

  return (
    <>
      <button type="button" className={`eop-trigger${!valor ? ' eop-trigger--vacio' : ''}`} onClick={() => setAbierto(true)}>
        <span className="eop-trigger-left">
          <i className="fas fa-dumbbell eop-trigger-icon" />
          <span className="eop-trigger-nombre">{actual ? actual.nombre : 'Selecciona'}</span>
        </span>
        <i className="fas fa-chevron-down eop-chevron" />
      </button>

      {abierto && createPortal(
        <div className="eop-overlay" onClick={cerrar}>
          <div className="eop-panel" onClick={e => e.stopPropagation()}>
            <div className="eop-header">
              <span className="eop-title"><i className="fas fa-dumbbell" /> Movimiento Olímpico</span>
              <button type="button" className="eop-close" onClick={cerrar}><i className="fas fa-times" /></button>
            </div>
            <div className="eop-search-wrap">
              <i className="fas fa-search eop-search-icon" />
              <input
                type="text"
                className="eop-search"
                placeholder="Buscar ejercicio..."
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                autoFocus
              />
              {busqueda && (
                <button type="button" className="eop-search-clear" onClick={() => setBusqueda('')}>
                  <i className="fas fa-times" />
                </button>
              )}
            </div>
            <div className="eop-options">
              {filtrados.length === 0 ? (
                <p className="eop-empty">Sin resultados para "{busqueda}"</p>
              ) : (
                filtrados.map(e => (
                  <button key={e.idEjercicio} type="button" className={`eop-option${e.idEjercicio.toString() === valor?.toString() ? ' eop-option--activo' : ''}`} onClick={() => seleccionar(e.idEjercicio)}>
                    <div className="eop-opt-icon"><i className="fas fa-dumbbell" /></div>
                    <span className="eop-opt-nombre">{e.nombre}</span>
                    {e.idEjercicio.toString() === valor?.toString() && <i className="fas fa-check eop-check" />}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
