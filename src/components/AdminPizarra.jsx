import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import html2canvas from 'html2canvas';
import RedGrayDatePicker from './RedGrayDatePicker';
import AtletifyLoader from './AtletifyLoader';
import PizarraTop10Card from './PizarraTop10Card';
import { agruparPorPosicion } from './pizarraHelpers';
import '../assets/css/AdminPizarra.css';

const API_BASE = import.meta.env.VITE_API_URL;

const KIOSKO_REFRESH_MS = 30000;

function toISODateString(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function fechaLargaEsp(date) {
  if (!date) return '';
  return date.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function sanitizeForFilename(str) {
  return (str || '').toString().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 60);
}

export default function AdminPizarra({ box }) {
  const [fechaSel, setFechaSel] = useState(() => toISODateString(new Date()));
  const [todosLosWods, setTodosLosWods] = useState([]);
  const [loadingWods, setLoadingWods] = useState(true);
  const [idWodSeleccionado, setIdWodSeleccionado] = useState(null);
  const [pizarra, setPizarra] = useState([]);
  const [loadingPizarra, setLoadingPizarra] = useState(false);
  const [filtroCategoria, setFiltroCategoria] = useState('General'); // General | RX | Scaled | "HH:MM:SS"
  const [filtroGenero, setFiltroGenero] = useState('Todos'); // Todos | Hombre | Mujer
  const [publicando, setPublicando] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [modoKiosko, setModoKiosko] = useState(false);
  const [ultimaActualizacion, setUltimaActualizacion] = useState(null);
  const tarjetaExportRef = useRef(null);

  // Cargar todos los WODs del box una sola vez
  useEffect(() => {
    if (!box) return;
    const cargarWods = async () => {
      setLoadingWods(true);
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE}/entrenamientos/box/${box.idBox}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) setTodosLosWods(await res.json());
      } catch (e) {
        console.error('Error cargando WODs', e);
      } finally {
        setLoadingWods(false);
      }
    };
    cargarWods();
  }, [box]);

  // WODs de la fecha seleccionada
  const wodsDelDia = useMemo(() => {
    if (!fechaSel) return [];
    return todosLosWods.filter(w => (w.fechaProgramada || '').startsWith(fechaSel));
  }, [todosLosWods, fechaSel]);

  // WOD activo: si el seleccionado existe en la lista de hoy, úsalo; si no,
  // fallback al primero del día. Evita setState-en-effect.
  const wodActual = useMemo(() => {
    if (wodsDelDia.length === 0) return null;
    return wodsDelDia.find(w => w.idEntrenamiento === idWodSeleccionado) || wodsDelDia[0];
  }, [wodsDelDia, idWodSeleccionado]);

  // Cargar pizarra del día (incluye scores de TODOS los WODs del día, se filtra por clase en frontend)
  const cargarPizarra = useCallback(async () => {
    if (!box || !fechaSel) return;
    setLoadingPizarra(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/asistencias/box/${box.idBox}/leaderboard/${fechaSel}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setPizarra(await res.json());
        setUltimaActualizacion(new Date());
      }
    } catch (e) {
      console.error('Error cargando pizarra', e);
    } finally {
      setLoadingPizarra(false);
    }
  }, [box, fechaSel]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- cargarPizarra es un fetch de datos, el setState es indirecto dentro del callback async
  useEffect(() => { cargarPizarra(); }, [cargarPizarra]);

  // Auto-refresh en modo kiosko + bloquear scroll del body
  useEffect(() => {
    if (!modoKiosko) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const interval = setInterval(cargarPizarra, KIOSKO_REFRESH_MS);
    return () => {
      clearInterval(interval);
      document.body.style.overflow = prevOverflow;
    };
  }, [modoKiosko, cargarPizarra]);

  // Reloj en vivo para el modo kiosko
  const [horaKiosko, setHoraKiosko] = useState(new Date());
  useEffect(() => {
    if (!modoKiosko) return;
    const tick = setInterval(() => setHoraKiosko(new Date()), 1000);
    return () => clearInterval(tick);
  }, [modoKiosko]);

  // Atletas filtrados + posiciones con manejo de empates (dense ranking)
  const atletasFiltrados = useMemo(() => {
    if (!wodActual) return [];
    const filtrados = pizarra.filter(res => {
      const clasePerteneceAlWod = !wodActual.clasesAsignadas || wodActual.clasesAsignadas.length === 0
        || wodActual.clasesAsignadas.some(c => c.idClase === res.idClase);
      if (!clasePerteneceAlWod) return false;
      if (filtroGenero !== 'Todos' && (res.genero || 'Hombre') !== filtroGenero) return false;
      if (filtroCategoria === 'General') return true;
      if (filtroCategoria === 'RX') return res.esRx;
      if (filtroCategoria === 'Scaled') return !res.esRx;
      return res.claseHora === filtroCategoria;
    });

    // Asignar posición con empates: mismo valorOrdenamiento + misma modalidad RX = misma posición
    let currentRank = 0;
    let lastValor = null;
    let lastRx = null;
    return filtrados.map((res, i) => {
      if (i === 0) {
        currentRank = 1;
      } else if (res.valorOrdenamiento !== lastValor || res.esRx !== lastRx) {
        currentRank++;
      }
      lastValor = res.valorOrdenamiento;
      lastRx = res.esRx;
      return { ...res, posicion: currentRank };
    });
  }, [pizarra, wodActual, filtroCategoria, filtroGenero]);

  // Top 10 para export: hasta posición 10 (incluye todos los empatados)
  const top10 = useMemo(() => atletasFiltrados.filter(a => a.posicion <= 10), [atletasFiltrados]);

  // Lista única de horas de clase para los chips de filtro
  const horasDeClase = useMemo(() => {
    if (!wodActual) return [];
    const set = new Set(pizarra
      .filter(p => !wodActual.clasesAsignadas?.length || wodActual.clasesAsignadas.some(c => c.idClase === p.idClase))
      .map(p => p.claseHora)
      .filter(Boolean));
    return [...set].sort();
  }, [pizarra, wodActual]);

  const esManual = wodActual?.modoRanking === 'Manual';
  const estaPublicado = !!wodActual?.rankingPublicado;

  const togglePublicar = async () => {
    if (!wodActual) return;
    const nuevoEstado = !estaPublicado;
    const confirmar = window.confirm(nuevoEstado
      ? '¿Publicar la pizarra de este WOD? Los atletas la verán inmediatamente.'
      : '¿Ocultar la pizarra a los atletas?');
    if (!confirmar) return;

    setPublicando(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/entrenamientos/${wodActual.idEntrenamiento}/ranking-publicado`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ publicado: nuevoEstado })
      });
      if (res.ok) {
        setTodosLosWods(prev => prev.map(w =>
          w.idEntrenamiento === wodActual.idEntrenamiento ? { ...w, rankingPublicado: nuevoEstado } : w
        ));
      } else {
        alert('Error al actualizar la pizarra.');
      }
    } catch (e) {
      console.error(e);
      alert('Error de red.');
    } finally {
      setPublicando(false);
    }
  };

  const exportarPNG = async () => {
    if (!tarjetaExportRef.current || top10.length === 0) {
      alert('No hay atletas para exportar.');
      return;
    }
    setExportando(true);
    try {
      const canvas = await html2canvas(tarjetaExportRef.current, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
        logging: false
      });
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      const filtroLabel = [
        filtroCategoria !== 'General' ? filtroCategoria : null,
        filtroGenero !== 'Todos' ? filtroGenero : null
      ].filter(Boolean).join('-') || 'global';
      const filename = `pizarra_${sanitizeForFilename(box?.nombre)}_${fechaSel}_${sanitizeForFilename(wodActual?.titulo)}_${filtroLabel}.png`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Error exportando PNG', e);
      alert('No se pudo generar la imagen.');
    } finally {
      setExportando(false);
    }
  };

  // Etiqueta descriptiva del filtro activo (para la tarjeta exportada)
  const etiquetaFiltro = useMemo(() => {
    const partes = [];
    if (filtroCategoria === 'RX') partes.push('RX');
    else if (filtroCategoria === 'Scaled') partes.push('Scaled');
    else if (filtroCategoria !== 'General') partes.push(`Clase ${String(filtroCategoria).substring(0, 5)}`);
    else partes.push('Global');
    if (filtroGenero !== 'Todos') partes.push(filtroGenero === 'Hombre' ? 'Hombres' : 'Mujeres');
    return partes.join(' · ');
  }, [filtroCategoria, filtroGenero]);

  // === RENDER ===
  return (
    <>
      <div className="ap-root">

        {/* Controles superiores: fecha + WOD */}
        <div className="ap-controles">
            <div className="ap-control-field">
              <label className="ap-label"><i className="fas fa-calendar-day me-2"></i>Fecha</label>
              <RedGrayDatePicker value={fechaSel} onChange={setFechaSel} />
            </div>

            <div className="ap-control-field ap-control-field--wod">
              <label className="ap-label"><i className="fas fa-dumbbell me-2"></i>WOD del día</label>
              {loadingWods ? (
                <div className="ap-wod-loading">Cargando…</div>
              ) : wodsDelDia.length === 0 ? (
                <div className="ap-wod-empty">Sin WODs programados este día.</div>
              ) : (
                <div className="ap-wod-chips">
                  {wodsDelDia.map(w => (
                    <button
                      key={w.idEntrenamiento}
                      onClick={() => setIdWodSeleccionado(w.idEntrenamiento)}
                      className={`ap-wod-chip ${idWodSeleccionado === w.idEntrenamiento ? 'ap-wod-chip--active' : ''}`}
                    >
                      {w.titulo}
                      {w.modoRanking === 'Manual' && (
                        <span className={`ap-wod-chip-badge ${w.rankingPublicado ? 'ap-badge--ok' : 'ap-badge--warn'}`}>
                          <i className={`fas ${w.rankingPublicado ? 'fa-check-circle' : 'fa-user-clock'}`}></i>
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

        {!wodActual ? (
          !loadingWods && (
            <div className="ap-empty-wrap">
              <i className="fas fa-clipboard-list ap-empty-icon"></i>
              <p className="ap-empty-text">Selecciona una fecha con WODs programados para ver la pizarra.</p>
            </div>
          )
        ) : (
          <div className="ap-card">

            {/* Header del WOD seleccionado */}
            <div className="ap-card-header">
              <div className="ap-card-header-info">
                <span className="ap-card-header-eyebrow">
                  <i className="fas fa-trophy me-2"></i>Pizarra del WOD
                </span>
                <h3 className="ap-card-title">{wodActual.titulo}</h3>
                <p className="ap-card-sub">
                  {fechaLargaEsp(new Date(fechaSel + 'T12:00:00'))} · {box?.nombre}
                </p>
              </div>
              <div className="ap-card-header-badges">
                {esManual ? (
                  <span className={`ap-badge ${estaPublicado ? 'ap-badge--ok' : 'ap-badge--warn'}`}>
                    <i className={`fas ${estaPublicado ? 'fa-check-circle' : 'fa-user-clock'} me-1`}></i>
                    {estaPublicado ? 'Pizarra publicada' : 'Pizarra oculta (Manual)'}
                  </span>
                ) : (
                  <span className="ap-badge ap-badge--info">
                    <i className="fas fa-robot me-1"></i> Auto · {wodActual.metricaPrincipal}
                  </span>
                )}
              </div>
            </div>

            {/* Acciones: publicar / exportar / kiosko */}
            <div className="ap-acciones">
              {esManual && (
                <button
                  onClick={togglePublicar}
                  disabled={publicando}
                  className={`ap-btn ${estaPublicado ? 'ap-btn--outline' : 'ap-btn--primary'}`}
                >
                  <i className={`fas ${estaPublicado ? 'fa-lock' : 'fa-bullhorn'} me-2`}></i>
                  <span className="ap-btn-label">{publicando ? 'Procesando…' : estaPublicado ? 'Ocultar pizarra' : 'Publicar pizarra'}</span>
                </button>
              )}
              <button
                onClick={exportarPNG}
                disabled={exportando || top10.length === 0}
                className="ap-btn ap-btn--accent"
              >
                <i className="fas fa-image me-2"></i>
                <span className="ap-btn-label">{exportando ? 'Generando…' : 'Exportar Top 10 (PNG)'}</span>
              </button>
              <button
                onClick={() => setModoKiosko(true)}
                className="ap-btn ap-btn--outline"
              >
                <i className="fas fa-tv me-2"></i>
                <span className="ap-btn-label">Modo pantalla</span>
              </button>
            </div>

            {/* Filtros */}
            <div className="ap-filtros-grupo">
              <div className="ap-filtros-row">
                <span className="ap-filtros-label">Categoría</span>
                <div className="ap-filtros-chips">
                  <button onClick={() => setFiltroCategoria('General')} className={`ap-chip ${filtroCategoria === 'General' ? 'ap-chip--active' : ''}`}>Global</button>
                  <button onClick={() => setFiltroCategoria('RX')} className={`ap-chip ap-chip--rx ${filtroCategoria === 'RX' ? 'ap-chip--active' : ''}`}>RX</button>
                  <button onClick={() => setFiltroCategoria('Scaled')} className={`ap-chip ap-chip--scaled ${filtroCategoria === 'Scaled' ? 'ap-chip--active' : ''}`}>Scaled</button>
                  {horasDeClase.map(hora => (
                    <button
                      key={hora}
                      onClick={() => setFiltroCategoria(hora)}
                      className={`ap-chip ${filtroCategoria === hora ? 'ap-chip--active' : ''}`}
                    >
                      <i className="far fa-clock me-1"></i>{String(hora).substring(0, 5)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="ap-filtros-row">
                <span className="ap-filtros-label">Género</span>
                <div className="ap-filtros-chips">
                  <button onClick={() => setFiltroGenero('Todos')} className={`ap-chip ${filtroGenero === 'Todos' ? 'ap-chip--active' : ''}`}>Todos</button>
                  <button onClick={() => setFiltroGenero('Hombre')} className={`ap-chip ${filtroGenero === 'Hombre' ? 'ap-chip--active' : ''}`}>Hombres</button>
                  <button onClick={() => setFiltroGenero('Mujer')} className={`ap-chip ${filtroGenero === 'Mujer' ? 'ap-chip--active' : ''}`}>Mujeres</button>
                </div>
              </div>
            </div>

            {/* Tabla del ranking */}
            <div className="ap-tabla-wrap">
              {loadingPizarra ? (
                <div className="ap-tabla-loading"><AtletifyLoader /></div>
              ) : !esManual || estaPublicado ? (
                atletasFiltrados.length === 0 ? (
                  <div className="ap-tabla-empty">
                    <i className="fas fa-ghost ap-empty-icon"></i>
                    <p>Nadie registró score con estos filtros.</p>
                  </div>
                ) : (
                  <table className="ap-tabla">
                    <thead>
                      <tr>
                        <th className="ap-th-pos">Pos</th>
                        <th>Atleta</th>
                        <th className="ap-th-score">Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {atletasFiltrados.map((res) => {
                        const pos = res.posicion;
                        return (
                          <tr key={`${res.idUsuario}-${res.idClase}`} className="ap-tr">
                            <td className="ap-td-pos">
                              {pos === 1 ? <i className="fas fa-medal ap-medal-gold"></i> :
                                pos === 2 ? <i className="fas fa-medal ap-medal-silver"></i> :
                                  pos === 3 ? <i className="fas fa-medal ap-medal-bronze"></i> :
                                    <span className="ap-pos-num">{pos}</span>}
                            </td>
                            <td>
                              <div className="ap-atleta">
                                {res.foto ? (
                                  <img
                                    src={res.foto}
                                    alt={res.apodo || res.nombreAtleta || ''}
                                    className="ap-atleta-avatar ap-atleta-avatar--img"
                                    crossOrigin="anonymous"
                                    onError={e => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'flex'; }}
                                  />
                                ) : null}
                                <div className="ap-atleta-avatar" style={{ display: res.foto ? 'none' : 'flex' }}>
                                  {(res.apodo || res.nombreAtleta || '?').charAt(0).toUpperCase()}
                                </div>
                                <div className="ap-atleta-info">
                                  <div className="ap-atleta-nombre">
                                    {res.apodo || res.nombreAtleta?.split(' ')[0]}
                                    {res.esRx && <span className="ap-tag-rx"><i className="fas fa-fire"></i> RX</span>}
                                  </div>
                                  <div className="ap-atleta-sub">
                                    {res.claseHora && <span><i className="far fa-clock me-1"></i>{String(res.claseHora).substring(0, 5)}</span>}
                                    {res.comentarios && <span className="ap-atleta-coment"><i className="fas fa-comment-alt me-1"></i>{res.comentarios}</span>}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="ap-td-score">
                              <span className={`ap-score ${(res.textoDisplay || '').toUpperCase().includes('DNF') ? 'ap-score--dnf' : ''}`}>
                                {res.textoDisplay || '--'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )
              ) : (
                <div className="ap-tabla-empty">
                  <i className="fas fa-user-secret ap-empty-icon"></i>
                  <p>Pizarra oculta — publícala para que los atletas la vean.</p>
                </div>
              )}
            </div>

          </div>
        )}
      </div>

      {/* Tarjeta oculta para exportar a PNG */}
      {wodActual && top10.length > 0 && (
        <div className="ap-export-hidden">
          <PizarraTop10Card
            ref={tarjetaExportRef}
            box={box}
            fecha={new Date(fechaSel + 'T12:00:00')}
            wod={wodActual}
            atletas={top10}
            etiquetaFiltro={etiquetaFiltro}
          />
        </div>
      )}

      {/* Modo Kiosko vía portal — escapa de cualquier stacking context */}
      {modoKiosko && wodActual && createPortal(
        <KioskoOverlay
          box={box}
          fecha={new Date(fechaSel + 'T12:00:00')}
          wod={wodActual}
          atletas={atletasFiltrados}
          etiquetaFiltro={etiquetaFiltro}
          horaActual={horaKiosko}
          ultimaActualizacion={ultimaActualizacion}
          onSalir={() => setModoKiosko(false)}
        />,
        document.body
      )}
    </>
  );
}

// ====================================================================
// Modo Kiosko / Pantalla — diseñado para TV del box
// ====================================================================
function fechaCortaEsp(date) {
  return date ? date.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' }) : '';
}

function KioskoOverlay({ box, fecha, wod, atletas, etiquetaFiltro, horaActual, ultimaActualizacion, onSalir }) {
  const grupos = useMemo(() => agruparPorPosicion(atletas), [atletas]);
  const podio = grupos.filter(g => g.posicion <= 3);
  const resto = grupos.filter(g => g.posicion > 3 && g.posicion <= 10);

  const horaTxt = horaActual.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  const refreshTxt = ultimaActualizacion
    ? ultimaActualizacion.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '—';

  const renderAvatar = (atleta, size) => (
    atleta?.foto ? (
      <img src={atleta.foto} alt={atleta.apodo || atleta.nombreAtleta || ''} className={`apk-foto apk-foto--${size}`} crossOrigin="anonymous" />
    ) : (
      <div className={`apk-foto apk-foto--${size} apk-foto--fallback`}>
        {(atleta?.apodo || atleta?.nombreAtleta || '?').charAt(0).toUpperCase()}
      </div>
    )
  );

  const renderAtletaChip = (a, size = 'sm') => (
    <div className="apk-atleta-chip" key={`${a.idUsuario}-${a.idClase}`}>
      {renderAvatar(a, size)}
      <div className="apk-atleta-chip-info">
        <div className="apk-atleta-chip-nombre" title={a.apodo || a.nombreAtleta}>{a.apodo || a.nombreAtleta}</div>
        {a.esRx && <span className="apk-rx apk-rx--sm">RX</span>}
      </div>
    </div>
  );

  const podioClass = `apk-podio apk-podio--${podio.length}`;

  // Renderiza una columna del podio con todos los atletas empatados de esa posición
  const renderPodioColumna = (grupo, colTipo) => {
    // Tamaño del avatar: col 1 con 1 solo atleta = lg; resto = md o sm si hay muchos empatados
    const multi = grupo.atletas.length > 1;
    const chipSize = colTipo === '1'
      ? (multi ? 'md' : 'lg')
      : (multi ? 'sm' : 'md');
    return (
      <div className={`apk-podio-col apk-podio-col--${colTipo}`}>
        {colTipo === '1' && <i className="fas fa-crown apk-podio-corona"></i>}
        <div className="apk-podio-rank">{grupo.posicion}</div>
        <div className={`apk-podio-atletas ${multi ? 'apk-podio-atletas--multi' : ''}`}>
          {grupo.atletas.map(a => renderAtletaChip(a, chipSize))}
        </div>
        <div className="apk-podio-score">{grupo.textoDisplay}</div>
      </div>
    );
  };

  return (
    <div className="apk-overlay">
      {/* Header */}
      <header className="apk-header">
        <div className="apk-header-left">
          <div className="apk-box-tag">{box?.nombre || 'Atletify'}</div>
          <h1 className="apk-wod-title">{wod.titulo}</h1>
          <div className="apk-meta">
            <span className="apk-meta-chip"><i className="fas fa-calendar-day"></i> {fechaCortaEsp(fecha)}</span>
            <span className="apk-meta-chip apk-meta-chip--accent"><i className="fas fa-filter"></i> {etiquetaFiltro}</span>
          </div>
        </div>
        <div className="apk-header-right">
          <div className="apk-clock">{horaTxt}</div>
          <button onClick={onSalir} className="apk-salir-btn" aria-label="Salir">
            <i className="fas fa-times"></i>
          </button>
        </div>
      </header>

      {atletas.length === 0 ? (
        <div className="apk-empty">
          <i className="fas fa-ghost"></i>
          <p>Sin scores con los filtros activos.</p>
        </div>
      ) : (
        <main className="apk-main">
          {/* Podio Top 3 — cada columna es UNA posición (no UN atleta).
              Los empatados se apilan en su columna correspondiente. */}
          {podio.length > 0 && (
            <div className={podioClass}>
              {/* Orden visual con 3 grupos: [2°, 1° centrado, 3°] */}
              {podio.length === 3 && podio[1] && renderPodioColumna(podio[1], '2')}
              {podio[0] && renderPodioColumna(podio[0], '1')}
              {podio.length === 2 && podio[1] && renderPodioColumna(podio[1], '2')}
              {podio.length === 3 && podio[2] && renderPodioColumna(podio[2], '3')}
            </div>
          )}

          {/* Lista 4-10 — agrupada: una fila por posición con todos los empatados */}
          {resto.length > 0 && (
            <ol className="apk-lista">
              {resto.map((grupo) => (
                <li key={`pos-${grupo.posicion}`} className="apk-lista-row">
                  <span className="apk-lista-pos">#{grupo.posicion}</span>
                  <div className={`apk-lista-atletas ${grupo.atletas.length > 1 ? 'apk-lista-atletas--multi' : ''}`}>
                    {grupo.atletas.map(a => renderAtletaChip(a, 'sm'))}
                  </div>
                  <span className="apk-lista-score">{grupo.textoDisplay}</span>
                </li>
              ))}
            </ol>
          )}
        </main>
      )}

      {/* Footer */}
      <footer className="apk-footer">
        <span className="apk-footer-stamp">
          <i className="fas fa-sync-alt"></i> Actualizado {refreshTxt} · auto-refresh cada 30s
        </span>
        <span className="apk-footer-brand">atletify</span>
      </footer>
    </div>
  );
}
