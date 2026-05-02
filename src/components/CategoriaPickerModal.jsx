import { useState } from 'react';
import './CategoriaPickerModal.css';

export default function CategoriaPickerModal({ categorias = [], seleccion = 'todas', onChange }) {
  const [abierto, setAbierto] = useState(false);

  const categoriaActual = seleccion === 'todas'
    ? null
    : categorias.find(c => c.idCategoriaComp === seleccion);

  const totalEquipos = categorias.reduce((s, c) => s + (c.equipos?.length || 0), 0);

  const seleccionar = (valor) => {
    setAbierto(false);
    if (valor !== seleccion) onChange(valor);
  };

  const getStats = (cat) => {
    let pagados = 0, deuda = 0;
    (cat.equipos || []).forEach(eq => {
      const pagado = (eq.pagos || []).filter(p => p.estatus === 'Aprobado').reduce((s, p) => s + p.montoAbonado, 0);
      if (pagado >= cat.costo) pagados++; else deuda++;
    });
    return { pagados, deuda, total: cat.equipos?.length || 0 };
  };

  return (
    <>
      <button
        type="button"
        className={`cpm-trigger ${seleccion === 'todas' ? 'cpm-trigger--todas' : ''}`}
        onClick={() => setAbierto(true)}
      >
        <i className="fas fa-layer-group cpm-trigger-icon"></i>
        <span>
          {seleccion === 'todas' ? 'Todas las categorías' : (categoriaActual?.categoriaNombre || 'Categoría')}
        </span>
        <i className="fas fa-chevron-down cpm-trigger-chevron"></i>
      </button>

      {abierto && (
        <div className="cpm-overlay" onClick={() => setAbierto(false)}>
          <div className="cpm-panel" onClick={e => e.stopPropagation()}>

            <div className="cpm-panel-header">
              <span className="cpm-panel-title">
                <i className="fas fa-layer-group"></i> Filtrar por Categoría
              </span>
              <button type="button" className="cpm-panel-close" onClick={() => setAbierto(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="cpm-options">

              {/* Opción "Todas" */}
              <button
                type="button"
                className={`cpm-option cpm-option--todas${seleccion === 'todas' ? ' cpm-option--activo' : ''}`}
                onClick={() => seleccionar('todas')}
              >
                <span className="cpm-option-dot cpm-option-dot--todas"></span>
                <div className="cpm-option-info">
                  <span className="cpm-option-nombre">Todas las categorías</span>
                  <span className="cpm-option-meta">{totalEquipos} equipos en total</span>
                </div>
                <div className="cpm-option-stats">
                  <span className="cpm-stat-pill cpm-stat-pill--total">
                    <i className="fas fa-users"></i> {totalEquipos}
                  </span>
                </div>
                {seleccion === 'todas' && <i className="fas fa-check cpm-check"></i>}
              </button>

              {/* Una opción por categoría */}
              {categorias.map(cat => {
                const st = getStats(cat);
                const isActiva = seleccion === cat.idCategoriaComp;
                return (
                  <button
                    key={cat.idCategoriaComp}
                    type="button"
                    className={`cpm-option${isActiva ? ' cpm-option--activo' : ''}`}
                    onClick={() => seleccionar(cat.idCategoriaComp)}
                  >
                    <span className="cpm-option-dot cpm-option-dot--cat"></span>
                    <div className="cpm-option-info">
                      <span className="cpm-option-nombre">{cat.categoriaNombre}</span>
                      <span className="cpm-option-meta">
                        <span>${cat.costo} · {st.total} equipos</span>
                        {st.pagados > 0 && <span className="cpm-meta-pagados">· {st.pagados} pagados</span>}
                        {st.deuda > 0 && <span className="cpm-meta-deuda">· {st.deuda} con deuda</span>}
                      </span>
                    </div>
                    <div className="cpm-option-stats">
                      {st.pagados > 0 && (
                        <span className="cpm-stat-pill cpm-stat-pill--pagado">
                          <i className="fas fa-check"></i> {st.pagados}
                        </span>
                      )}
                      {st.deuda > 0 && (
                        <span className="cpm-stat-pill cpm-stat-pill--deuda">
                          <i className="fas fa-exclamation"></i> {st.deuda}
                        </span>
                      )}
                    </div>
                    {isActiva && <i className="fas fa-check cpm-check"></i>}
                  </button>
                );
              })}

            </div>
          </div>
        </div>
      )}
    </>
  );
}
