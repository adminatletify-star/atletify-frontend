import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import './BoxPicker.css';

/**
 * Selector de Box estilo WolfPack (reemplaza al <select> nativo, según CLAUDE.md).
 * Trigger + modal centrado con buscador (createPortal).
 *
 * Props:
 *  - valor: idBox seleccionado (string|number)
 *  - opciones: array de boxes { idBox, nombre, ubicacion? }
 *  - onCambiar: (idBox:string) => void
 *  - placeholder: texto cuando no hay selección
 *  - titulo: título del modal
 *  - incluirIndependiente: muestra la opción "Usuario independiente" (registro público)
 */
export default function BoxPicker({
  valor,
  opciones = [],
  onCambiar,
  placeholder = 'Selecciona un Box...',
  titulo = 'Selecciona un Box',
  incluirIndependiente = false,
}) {
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState('');

  const boxActual = opciones.find(b => String(b.idBox) === String(valor));

  const filtrados = useMemo(() => {
    if (!busqueda.trim()) return opciones;
    const q = busqueda.toLowerCase();
    return opciones.filter(b =>
      b.nombre.toLowerCase().includes(q) ||
      (b.ubicacion && b.ubicacion.toLowerCase().includes(q))
    );
  }, [opciones, busqueda]);

  const cerrar = () => { setAbierto(false); setBusqueda(''); };
  const seleccionar = (idBox) => { onCambiar(idBox); cerrar(); };
  const abrir = () => { setBusqueda(''); setAbierto(true); };

  return (
    <>
      <button
        type="button"
        className={`bxp-trigger${boxActual ? ' bxp-trigger--activo' : ''}`}
        onClick={abrir}
      >
        <span className="bxp-trigger-left">
          <i className={boxActual ? 'fas fa-store' : 'fas fa-store-alt'} />
          {boxActual ? boxActual.nombre : placeholder}
        </span>
        <i className="fas fa-chevron-down bxp-chevron" />
      </button>

      {abierto && createPortal(
        <div className="bxp-overlay" onClick={cerrar}>
          <div className="bxp-panel" onClick={e => e.stopPropagation()}>

            <div className="bxp-header">
              <div className="bxp-header-left">
                <div className="bxp-header-icon">
                  <i className="fas fa-store-alt" />
                </div>
                <span className="bxp-title">{titulo}</span>
              </div>
              <button type="button" className="bxp-close" onClick={cerrar}>
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
              {incluirIndependiente && (
                <>
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
                </>
              )}

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
                    {box.ubicacion && <span className="bxp-opt-desc">{box.ubicacion}</span>}
                  </div>
                  {String(box.idBox) === String(valor) && <i className="fas fa-check bxp-check" />}
                </button>
              ))}

              {filtrados.length === 0 && (
                <div className="bxp-empty">
                  <i className="fas fa-search" />
                  <span>{busqueda.trim() ? `Sin resultados para "${busqueda}"` : 'No hay boxes disponibles'}</span>
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
