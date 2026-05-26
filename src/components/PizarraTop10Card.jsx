import { forwardRef, useMemo } from 'react';
import { agruparPorPosicion } from './pizarraHelpers';

function fechaLargaEsp(date) {
  if (!date) return '';
  return date.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

const PizarraTop10Card = forwardRef(function PizarraTop10Card({ box, fecha, wod, atletas, etiquetaFiltro }, ref) {
  const grupos = useMemo(() => agruparPorPosicion(atletas), [atletas]);
  return (
    <div ref={ref} className="ap-export-card">
      {/* Header centrado con LOGO prominente */}
      <div className="ap-export-header">
        <div className="ap-export-logo-hero">
          <div className="ap-export-logo-ring">
            {box?.logo ? (
              <img src={box.logo} alt={box.nombre} className="ap-export-logo" crossOrigin="anonymous" />
            ) : (
              <div className="ap-export-logo-fallback">
                {(box?.nombre || 'A').charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </div>
        <div className="ap-export-box-name">{box?.nombre || 'Atletify'}</div>
        <div className="ap-export-box-sub">Pizarra Oficial</div>
        <div className="ap-export-fecha-box">
          <i className="fas fa-calendar-day"></i>
          <span>{fechaLargaEsp(fecha)}</span>
        </div>
      </div>

      {/* Título del WOD */}
      <div className="ap-export-wod-titulo">
        <div className="ap-export-wod-tag">WOD</div>
        <h2 className="ap-export-wod-h2">{wod?.titulo}</h2>
        <div className="ap-export-wod-filtro">{etiquetaFiltro}</div>
      </div>

      {/* Top N posiciones — una fila por posición, empatados agrupados */}
      <ol className="ap-export-lista">
        {grupos.map(grupo => {
          const pos = grupo.posicion;
          const esPodio = pos <= 3;
          const multi = grupo.atletas.length > 1;
          return (
            <li key={`pos-${pos}`} className={`ap-export-row ${esPodio ? `ap-export-row--podio-${pos}` : ''} ${multi ? 'ap-export-row--multi' : ''}`}>
              <div className="ap-export-pos">
                {pos === 1 ? <i className="fas fa-trophy"></i> :
                  pos === 2 ? <i className="fas fa-medal"></i> :
                    pos === 3 ? <i className="fas fa-award"></i> :
                      <span>#{pos}</span>}
              </div>
              <div className="ap-export-atletas-grid">
                {grupo.atletas.map((res, i) => (
                  <div className="ap-export-atleta-chip" key={`${res.idUsuario}-${i}`}>
                    {res.foto ? (
                      <img
                        src={res.foto}
                        alt={res.apodo || res.nombreAtleta || ''}
                        className="ap-export-chip-foto"
                        crossOrigin="anonymous"
                      />
                    ) : (
                      <div className="ap-export-chip-foto ap-export-chip-foto--fallback">
                        {(res.apodo || res.nombreAtleta || '?').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="ap-export-chip-nombre">
                      {res.apodo || res.nombreAtleta}
                      {res.esRx && <span className="ap-export-rx">RX</span>}
                    </div>
                  </div>
                ))}
              </div>
              <div className="ap-export-score">
                {grupo.textoDisplay || '--'}
              </div>
            </li>
          );
        })}
      </ol>

      {/* Footer */}
      <div className="ap-export-footer">
        <span className="ap-export-brand">atletify</span>
        <span className="ap-export-footer-tag">crossfit pizarra</span>
      </div>
    </div>
  );
});

export default PizarraTop10Card;
