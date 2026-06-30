import './Paginacion.css';

/**
 * Control de paginación con el estilo canónico de Ejercicios (.pag-* == .ej-pag-*).
 * Colapsa los números con "…" mostrando primera, última y vecinas (±1).
 *
 * @param {number} pagina        Página actual (1-based).
 * @param {number} totalPaginas  Total de páginas.
 * @param {(n:number)=>void} onCambiar  Callback con la nueva página.
 */
export default function Paginacion({ pagina, totalPaginas, onCambiar }) {
  if (totalPaginas <= 1) return null;

  const ir = (n) => {
    const x = Math.min(Math.max(1, n), totalPaginas);
    if (x !== pagina) onCambiar(x);
  };

  const items = Array.from({ length: totalPaginas }, (_, idx) => idx + 1)
    .filter(n => n === 1 || n === totalPaginas || Math.abs(n - pagina) <= 1)
    .reduce((acc, n, i, arr) => {
      if (i > 0 && n - arr[i - 1] > 1) acc.push('...');
      acc.push(n);
      return acc;
    }, []);

  return (
    <div className="pag-pagination">
      <button className="pag-btn" onClick={() => ir(pagina - 1)} disabled={pagina === 1} aria-label="Página anterior">
        <i className="fas fa-chevron-left" />
      </button>

      <div className="pag-numeros">
        {items.map((item, idx) =>
          item === '...' ? (
            <span key={`dots-${idx}`} className="pag-dots">…</span>
          ) : (
            <button
              key={item}
              className={`pag-num${item === pagina ? ' activo' : ''}`}
              onClick={() => ir(item)}
            >
              {item}
            </button>
          )
        )}
      </div>

      <button className="pag-btn" onClick={() => ir(pagina + 1)} disabled={pagina === totalPaginas} aria-label="Página siguiente">
        <i className="fas fa-chevron-right" />
      </button>
    </div>
  );
}
