import { forwardRef } from 'react';

function fechaLargaEsp(date) {
  if (!date) return '';
  return date.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function inicial(str) {
  return String(str || '?').charAt(0).toUpperCase();
}

function ordinalEsp(n) {
  if (n == null) return '';
  // 1° 2° 3° ... — en español se usa el indicador ordinal °
  return `${n}°`;
}

const ResultadoExportCard = forwardRef(function ResultadoExportCard({ box, usuario, item, wod, ranking }, ref) {
  const fecha = item?.fecha ? new Date(item.fecha) : null;
  const metricas = item?.metricas || {};
  const entries = Object.entries(metricas);
  // Primera métrica = "headline" gigante; el resto se muestran abajo
  const [headlineEntry, ...restoEntries] = entries;
  const nombreAtleta = usuario?.apodo || usuario?.nombre || 'Atleta';
  const subAtleta = usuario?.apodo && usuario?.nombre ? usuario.nombre : '';

  return (
    <div ref={ref} className="rec-card">
      {/* Banda diagonal agresiva arriba */}
      <div className="rec-stripe"></div>
      <div className="rec-stripe-shadow"></div>

      {/* HEADER: BOX */}
      <div className="rec-header">
        <div className="rec-box-logo-wrap">
          {box?.logo ? (
            <img src={box.logo} alt={box.nombre} className="rec-box-logo" crossOrigin="anonymous" />
          ) : (
            <div className="rec-box-logo rec-box-logo--fallback">{inicial(box?.nombre)}</div>
          )}
        </div>
        <div className="rec-box-info">
          <div className="rec-box-name">{box?.nombre || 'Atletify'}</div>
          <div className="rec-box-sub">Pizarra Personal</div>
          <div className="rec-fecha">
            <i className="fas fa-calendar-day"></i>
            <span>{fechaLargaEsp(fecha)}</span>
          </div>
        </div>
      </div>

      {/* ATLETA */}
      <div className="rec-atleta">
        <div className="rec-atleta-foto-ring">
          {usuario?.foto ? (
            <img src={usuario.foto} alt={nombreAtleta} className="rec-atleta-foto" crossOrigin="anonymous" />
          ) : (
            <div className="rec-atleta-foto rec-atleta-foto--fallback">{inicial(nombreAtleta)}</div>
          )}
        </div>
        <div className="rec-atleta-info">
          <div className="rec-atleta-nombre">{nombreAtleta}</div>
          {subAtleta && <div className="rec-atleta-sub">{subAtleta}</div>}
          <div className="rec-atleta-tags">
            {item?.esRx ? (
              <span className="rec-tag rec-tag--rx"><i className="fas fa-fire"></i> RX</span>
            ) : (
              <span className="rec-tag rec-tag--scaled">Escalado</span>
            )}
            {item?.nombreClase && (
              <span className="rec-tag rec-tag--clase"><i className="far fa-clock"></i> {item.nombreClase}</span>
            )}
          </div>
        </div>
      </div>

      {/* WOD */}
      <div className="rec-wod">
        <div className="rec-wod-tag">WOD</div>
        <h2 className="rec-wod-titulo">{item?.nombreRealWod || wod?.titulo || 'Workout'}</h2>
        {wod?.bloques?.length > 0 && (
          <div className="rec-bloques">
            {wod.bloques.map(bloque => (
              <div key={bloque.idBloque} className="rec-bloque">
                <div className="rec-bloque-head">
                  <span className="rec-bloque-tipo">
                    {bloque.tipoBloque}
                    {bloque.tipoModalidad && <span className="rec-bloque-mod"> · {bloque.tipoModalidad}</span>}
                  </span>
                  {bloque.capTimeMinutos && (
                    <span className="rec-bloque-cap">TC: {bloque.capTimeMinutos}</span>
                  )}
                </div>
                {bloque.descripcionLibre && (
                  <p className="rec-bloque-desc">{bloque.descripcionLibre}</p>
                )}
                {bloque.ejercicios?.length > 0 && (
                  <ul className="rec-ejercicios">
                    {bloque.ejercicios.map((ej, i) => (
                      <li key={i} className="rec-ejercicio">
                        {ej.esquemaRepeticiones && <span className="rec-ejercicio-reps">{ej.esquemaRepeticiones}</span>}
                        <span className="rec-ejercicio-nombre">{ej.ejercicio?.nombre || '—'}</span>
                        {ej.pesoSugerido && <span className="rec-ejercicio-peso">{ej.pesoSugerido}</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* RESULTADO */}
      <div className="rec-resultado">
        <div className="rec-resultado-label">Resultado</div>
        {headlineEntry ? (
          <>
            <div className="rec-resultado-valor">{headlineEntry[1] || '--'}</div>
            <div className="rec-resultado-tipo">{headlineEntry[0]}</div>
          </>
        ) : (
          <div className="rec-resultado-valor">--</div>
        )}
        {restoEntries.length > 0 && (
          <div className="rec-metricas-extras">
            {restoEntries.map(([k, v], i) => (
              <div key={i} className="rec-metrica-extra">
                <span className="rec-metrica-extra-label">{k}</span>
                <span className="rec-metrica-extra-valor">{v || '--'}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* RANKING */}
      {ranking && (ranking.global || ranking.clase) && (
        <div className="rec-ranking">
          <div className="rec-ranking-label">Tu Ranking</div>
          <div className="rec-ranking-grid">
            {ranking.global && (
              <div className="rec-ranking-card rec-ranking-card--global">
                <div className="rec-ranking-card-tag">
                  <i className="fas fa-globe"></i>
                  <span>Global</span>
                </div>
                <div className="rec-ranking-pos">{ordinalEsp(ranking.global.posicion)}</div>
                <div className="rec-ranking-total">de {ranking.global.total}</div>
              </div>
            )}
            {ranking.clase && (
              <div className="rec-ranking-card rec-ranking-card--clase">
                <div className="rec-ranking-card-tag">
                  <i className="far fa-clock"></i>
                  <span>En tu clase</span>
                </div>
                <div className="rec-ranking-pos">{ordinalEsp(ranking.clase.posicion)}</div>
                <div className="rec-ranking-total">de {ranking.clase.total}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* FOOTER */}
      <div className="rec-footer">
        <span className="rec-brand">atletify</span>
        <span className="rec-brand-tag">crossfit · diario de batalla</span>
      </div>
    </div>
  );
});

export default ResultadoExportCard;
