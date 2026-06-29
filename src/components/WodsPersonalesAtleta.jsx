import { useState, useEffect, useCallback } from 'react';

const API_BASE = import.meta.env.VITE_API_URL;

// Métricas a capturar de un WOD (de su plantilla de jueceo), con fallback.
function metricasDeWod(wod) {
  const bloque = wod.bloques?.find(b => b.tipoBloque === 'WOD') || wod.bloques?.[0];
  try {
    const p = bloque?.plantillaJueceo ? JSON.parse(bloque.plantillaJueceo) : null;
    if (Array.isArray(p) && p.length) return p;
  } catch { /* fallback */ }
  return ['Score'];
}

// Tarjeta "WODs para ti": rutinas personalizadas asignadas al atleta, sin horario fijo.
// El atleta sube su propio score (o solo marca hecho si el WOD no requiere score).
// Se monta dentro de UserPanel, así que reutiliza sus clases up-*.
export default function WodsPersonalesAtleta({ idUsuario }) {
  const [wods, setWods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [abierto, setAbierto] = useState(null);   // idEntrenamiento en captura
  const [valores, setValores] = useState({});
  const [esRx, setEsRx] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    if (!idUsuario) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/entrenamientos/atleta/${idUsuario}/personales`);
      if (res.ok) setWods(await res.json());
    } catch (e) {
      console.error('Error cargando WODs personales', e);
    } finally {
      setLoading(false);
    }
  }, [idUsuario]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch de datos
  useEffect(() => { cargar(); }, [cargar]);

  const abrirCaptura = (wod) => {
    let init = {};
    if (wod.miResultado?.resultadoWod) {
      try { init = JSON.parse(wod.miResultado.resultadoWod).metricasDetalle || {}; } catch { /* */ }
    }
    setValores(init);
    setEsRx(wod.miResultado?.esRx ?? true);
    setAbierto(wod.idEntrenamiento);
  };

  const enviar = async (wod, soloHecho = false) => {
    setGuardando(true);
    try {
      let resultadoWod;
      if (soloHecho) {
        resultadoWod = JSON.stringify({ valorOrdenamiento: 0, textoDisplay: '✓ Hecho', tipoMedida: 'PERSONAL', nombreWod: wod.titulo, metricasDetalle: {} });
      } else {
        const metricas = metricasDeWod(wod);
        const metricasDetalle = {};
        metricas.forEach(m => { metricasDetalle[m] = (valores[m] || '').toString(); });
        const textoDisplay = metricas.map(m => metricasDetalle[m]).filter(Boolean).join(' · ') || '✓';
        resultadoWod = JSON.stringify({ valorOrdenamiento: 0, textoDisplay, tipoMedida: 'PERSONAL', nombreWod: wod.titulo, metricasDetalle });
      }
      const res = await fetch(`${API_BASE}/entrenamientos/${wod.idEntrenamiento}/resultado-personal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idUsuario, esRx: soloHecho ? false : esRx, resultadoWod })
      });
      if (res.ok) { setAbierto(null); cargar(); }
      else { const d = await res.json().catch(() => ({})); alert(d.mensaje || 'No se pudo guardar.'); }
    } catch {
      alert('Error de conexión.');
    } finally {
      setGuardando(false);
    }
  };

  // No mostrar la tarjeta si no hay WODs personales (mientras carga, tampoco).
  if (loading || wods.length === 0) return null;

  return (
    <div className="up-card up-card-accent">
      <div className="up-card-header">
        <h5 className="up-card-title">
          <i className="fas fa-user-check text-info me-2"></i>WODs PARA TI
        </h5>
        <span className="up-date-badge">Personalizado</span>
      </div>
      <div className="up-card-body">
        <div className="d-flex flex-column gap-3">
          {wods.map(wod => {
            const hecho = !!wod.miResultado;
            const sinScore = wod.requiereScore === false;
            const enCaptura = abierto === wod.idEntrenamiento;
            const metricas = metricasDeWod(wod);
            return (
              <div key={wod.idEntrenamiento} className="up-wod-entry">
                <div className="up-wod-title-row">
                  <i className="fas fa-dumbbell up-wod-icon"></i>
                  <span className="up-wod-title">{wod.titulo}</span>
                  {sinScore && <span className="up-sinscore-badge"><i className="fas fa-mug-hot me-1"></i>Sin score</span>}
                  {hecho && <span className="up-sinscore-badge" style={{ color: 'var(--success)', borderColor: 'rgba(46,204,113,0.4)', background: 'rgba(46,204,113,0.1)' }}><i className="fas fa-check me-1"></i>Hecho</span>}
                </div>

                {wod.bloques?.map(bloque => (
                  <div key={bloque.idBloque} className="up-bloque">
                    <div className="up-bloque-header">
                      <div className="d-flex align-items-center gap-2 flex-wrap">
                        <span className="up-bloque-tipo">{bloque.tipoBloque}</span>
                        <span className="up-bloque-mod">{bloque.tipoModalidad}</span>
                        {bloque.rondas ? <span className="up-bloque-rondas"><i className="fas fa-repeat me-1"></i>{bloque.rondas} rondas</span> : null}
                      </div>
                      {bloque.capTimeMinutos && <span className="up-bloque-tc"><i className="fas fa-stopwatch me-1"></i>TC {bloque.capTimeMinutos}</span>}
                    </div>
                    <div className="up-bloque-body">
                      {bloque.descripcionLibre && <p className="up-bloque-desc">{bloque.descripcionLibre}</p>}
                      {bloque.ejercicios?.length > 0 && (
                        <ul className="up-ej-list">
                          {bloque.ejercicios.map((ej, i) => (
                            <li key={i} className="up-ej-item">
                              <span className="up-ej-reps">{ej.esquemaRepeticiones}</span>
                              <span className="up-ej-name">{ej.ejercicio?.nombre}</span>
                              {ej.pesoSugerido && <span className="up-ej-peso">{ej.pesoSugerido}</span>}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                ))}

                {/* Resultado guardado */}
                {hecho && !enCaptura && (
                  <p className="up-bloque-desc" style={{ marginTop: '0.4rem' }}>
                    <i className="fas fa-trophy text-warning me-1"></i>
                    Tu resultado: <strong>{(() => { try { return JSON.parse(wod.miResultado.resultadoWod).textoDisplay; } catch { return '✓'; } })()}</strong>
                  </p>
                )}

                {/* Captura inline */}
                {enCaptura ? (
                  <div className="wpa-captura">
                    {!sinScore && (
                      <>
                        <div className="row g-2">
                          {metricas.map(m => (
                            <div key={m} className="col-12 col-sm-6">
                              <label className="up-bloque-desc" style={{ margin: 0 }}>{m}</label>
                              <input
                                type="text"
                                className="wpa-input"
                                value={valores[m] || ''}
                                onChange={e => setValores(v => ({ ...v, [m]: e.target.value }))}
                                placeholder="Tu marca..."
                              />
                            </div>
                          ))}
                        </div>
                        <div className="d-flex gap-2 mt-2">
                          <button type="button" className={`wpa-rx ${esRx ? 'wpa-rx--on' : ''}`} onClick={() => setEsRx(true)}><i className="fas fa-fire me-1"></i>RX</button>
                          <button type="button" className={`wpa-rx ${!esRx ? 'wpa-rx--on' : ''}`} onClick={() => setEsRx(false)}><i className="fas fa-arrow-down me-1"></i>Scaled</button>
                        </div>
                      </>
                    )}
                    <div className="d-flex gap-2 mt-2">
                      <button type="button" className="wpa-btn wpa-btn--primary" disabled={guardando} onClick={() => enviar(wod, sinScore)}>
                        <i className="fas fa-save me-1"></i>{guardando ? 'Guardando...' : 'Guardar'}
                      </button>
                      <button type="button" className="wpa-btn" onClick={() => setAbierto(null)}>Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <div className="up-wod-social">
                    {sinScore ? (
                      <button className="wpa-btn wpa-btn--primary" disabled={guardando} onClick={() => enviar(wod, true)}>
                        <i className="fas fa-check me-1"></i>{hecho ? 'Hecho ✓' : 'Marcar como hecho'}
                      </button>
                    ) : (
                      <button className="wpa-btn wpa-btn--primary" onClick={() => abrirCaptura(wod)}>
                        <i className="fas fa-pen me-1"></i>{hecho ? 'Editar mi score' : 'Registrar mi score'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
