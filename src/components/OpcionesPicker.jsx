import { useState } from 'react';
import { createPortal } from 'react-dom';
import './OpcionesPicker.css';

const normalizar = (s = '') =>
  s.toString().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/**
 * Selector modal genérico (reemplaza <select> nativos).
 * Sigue el lenguaje visual del sistema (igual que MesPicker): trigger tipo input
 * y modal centrado con lista de opciones.
 *
 * @param {string|number} valor        Valor seleccionado actual.
 * @param {(v:any)=>void} onCambiar     Callback con el nuevo valor.
 * @param {{valor:any,label:string,desc?:string}[]} opciones  Opciones a mostrar.
 * @param {string} titulo               Título del modal.
 * @param {string} icono               Clase del ícono (FontAwesome).
 * @param {string} placeholder         Texto cuando no hay selección.
 * @param {boolean} buscador            Muestra un campo de búsqueda dentro del modal (listas largas/dinámicas).
 * @param {string} placeholderBuscar    Texto del campo de búsqueda.
 */
export default function OpcionesPicker({ valor, onCambiar, opciones = [], titulo = 'Selecciona', icono = 'fas fa-list-ul', placeholder = '— Selecciona —', buscador = false, placeholderBuscar = 'Buscar...' }) {
  const [abierto, setAbierto] = useState(false);
  const [buscar, setBuscar] = useState('');
  const actual = opciones.find(o => String(o.valor) === String(valor));

  const cerrar = () => { setAbierto(false); setBuscar(''); };

  const seleccionar = (v) => {
    cerrar();
    if (String(v) !== String(valor)) onCambiar(v);
  };

  const q = normalizar(buscar.trim());
  const opcionesFiltradas = (buscador && q)
    ? opciones.filter(o => normalizar(o.label).includes(q) || (o.desc && normalizar(o.desc).includes(q)))
    : opciones;

  return (
    <>
      <button
        type="button"
        className={`opk-trigger${!actual ? ' opk-trigger--vacio' : ''}`}
        onClick={() => setAbierto(true)}
      >
        <span className="opk-trigger-left">
          <i className={`${icono} opk-trigger-icon`} />
          <span className="opk-trigger-nombre">{actual ? actual.label : placeholder}</span>
        </span>
        <i className="fas fa-chevron-down opk-chevron" />
      </button>

      {abierto && createPortal(
        <div className="opk-overlay" onClick={cerrar}>
          <div className="opk-panel" onClick={e => e.stopPropagation()}>

            <div className="opk-header">
              <span className="opk-title">
                <i className={icono} /> {titulo}
              </span>
              <button type="button" className="opk-close" onClick={cerrar}>
                <i className="fas fa-times" />
              </button>
            </div>

            {buscador && (
              <div className="opk-search">
                <i className="fas fa-search opk-search-icon" />
                <input
                  type="text"
                  className="opk-search-input"
                  placeholder={placeholderBuscar}
                  value={buscar}
                  onChange={e => setBuscar(e.target.value)}
                  autoFocus
                />
              </div>
            )}

            <div className="opk-options">
              {opcionesFiltradas.length === 0 ? (
                <div className="opk-empty">
                  <i className="fas fa-search" />
                  <span>Sin resultados</span>
                </div>
              ) : (
                opcionesFiltradas.map(op => {
                  const activo = String(op.valor) === String(valor);
                  return (
                    <button
                      key={op.valor}
                      type="button"
                      disabled={op.disabled}
                      className={`opk-option${activo ? ' opk-option--activo' : ''}${op.disabled ? ' opk-option--disabled' : ''}`}
                      onClick={() => { if (!op.disabled) seleccionar(op.valor); }}
                    >
                      {(op.color || op.icono) && (
                        <span
                          className="opk-opt-icon"
                          style={op.color ? { color: op.color, background: `${op.color}1f`, borderColor: `${op.color}55` } : undefined}
                        >
                          <i className={`fas ${op.icono || 'fa-circle'}`} />
                        </span>
                      )}
                      <div className="opk-info">
                        <span className="opk-nombre">{op.label}</span>
                        {op.desc && <span className="opk-desc">{op.desc}</span>}
                      </div>
                      {activo && <i className="fas fa-check opk-check" />}
                    </button>
                  );
                })
              )}
            </div>

          </div>
        </div>,
        document.body
      )}
    </>
  );
}
