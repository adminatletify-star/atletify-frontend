import { useState, useEffect } from 'react';
import Paginacion from './Paginacion';

/**
 * Envoltura reutilizable que pagina cualquier lista (de 20 en 20 por defecto).
 * Maneja su propio estado de página, corta el arreglo, muestra el resumen
 * "Mostrando X–Y de Z" y pinta el control de paginación debajo.
 *
 * Uso (render-prop):
 *   <ListaPaginada items={lista} pageSize={20} resetKey={busqueda}>
 *     {(itemsPagina) => <div className="row">{itemsPagina.map(...)}</div>}
 *   </ListaPaginada>
 *
 * @param {any[]}  items      Lista completa.
 * @param {number} pageSize   Tamaño de página (default 20).
 * @param {any}    resetKey   Cuando cambia, vuelve a la página 1 (búsqueda/filtro).
 * @param {boolean} resumen   Mostrar "Mostrando X–Y de Z" (default true).
 * @param {(itemsPagina:any[], info:{pagina:number, inicio:number})=>React.ReactNode} children
 */
export default function ListaPaginada({ items = [], pageSize = 20, resetKey, resumen = true, children }) {
  const [pagina, setPagina] = useState(1);
  const total = items.length;
  const totalPaginas = Math.max(1, Math.ceil(total / pageSize));

  // Reset a la página 1 cuando cambia el filtro/búsqueda.
  useEffect(() => { setPagina(1); }, [resetKey]);
  // Si la lista encoge por debajo de la página actual, ajusta.
  useEffect(() => { if (pagina > totalPaginas) setPagina(totalPaginas); }, [pagina, totalPaginas]);

  const inicio = (pagina - 1) * pageSize;
  const itemsPagina = items.slice(inicio, inicio + pageSize);

  return (
    <>
      {resumen && total > pageSize && (
        <p className="pag-resumen">Mostrando {inicio + 1}–{Math.min(inicio + pageSize, total)} de {total}</p>
      )}
      {children(itemsPagina, { pagina, inicio })}
      <Paginacion pagina={pagina} totalPaginas={totalPaginas} onCambiar={setPagina} />
    </>
  );
}
