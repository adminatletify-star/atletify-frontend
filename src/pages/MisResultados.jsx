import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import html2canvas from 'html2canvas';
import BackButton from '../components/BackButton';
import MesPicker from '../components/MesPicker';
import AñoPicker from '../components/AñoPicker';
import AtletifyLoader from '../components/AtletifyLoader';
import ResultadoExportCard from '../components/ResultadoExportCard';
import '../assets/css/MisResultados.css';

const API_BASE = import.meta.env.VITE_API_URL;

const PAGE_SIZE = 10;

function buildPaginas(pagina, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const out = [1];
  if (pagina > 3) out.push('...');
  const start = Math.max(2, pagina - 1);
  const end = Math.min(total - 1, pagina + 1);
  for (let i = start; i <= end; i++) out.push(i);
  if (pagina < total - 2) out.push('...');
  out.push(total);
  return out;
}

function Paginacion({ pagina, totalPaginas, onCambio }) {
  if (totalPaginas <= 1) return null;
  const paginas = buildPaginas(pagina, totalPaginas);
  return (
    <div className="mr-pag" role="navigation" aria-label="Paginación">
      <button
        type="button"
        className="mr-pag-btn"
        disabled={pagina === 1}
        onClick={() => onCambio(pagina - 1)}
        aria-label="Página anterior"
      >
        <i className="fas fa-chevron-left"></i>
      </button>
      {paginas.map((p, i) =>
        p === '...' ? (
          <span key={`e${i}`} className="mr-pag-ellipsis">…</span>
        ) : (
          <button
            key={p}
            type="button"
            className={`mr-pag-btn ${pagina === p ? 'mr-pag-btn--active' : ''}`}
            onClick={() => onCambio(p)}
          >
            {p}
          </button>
        )
      )}
      <button
        type="button"
        className="mr-pag-btn"
        disabled={pagina === totalPaginas}
        onClick={() => onCambio(pagina + 1)}
        aria-label="Página siguiente"
      >
        <i className="fas fa-chevron-right"></i>
      </button>
    </div>
  );
}

function sanitizeForFilename(str) {
  return (str || '').toString().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 60);
}

export default function MisResultados() {
  const navigate = useNavigate();
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [usuario, setUsuario] = useState(null);
  const [box, setBox] = useState(null);

  const [favoritos, setFavoritos] = useState([]);
  const [verSoloFavs, setVerSoloFavs] = useState(false);

  // Filtro de mes/año es OPCIONAL: por defecto se ven todos
  const [filtroPorMes, setFiltroPorMes] = useState(false);
  const [mesFiltro, setMesFiltro] = useState(new Date().getMonth() + 1);
  const [añoFiltro, setAñoFiltro] = useState(new Date().getFullYear());

  const [pagina, setPagina] = useState(1);

  const [wodSeleccionado, setWodSeleccionado] = useState(null);
  const [loadingWod, setLoadingWod] = useState(false);

  // Estado para exportar
  const [exportando, setExportando] = useState({ idAsistencia: null, wod: null, ranking: null, item: null });
  const exportRef = useRef(null);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('usuario'));
    const b = JSON.parse(localStorage.getItem('box'));
    if (!user || !b) { navigate('/login'); return; }

    setUsuario(user);
    setBox(b);

    const idU = user.idUsuario || user.id;
    const favsGuardados = JSON.parse(localStorage.getItem(`favs_wods_${idU}`)) || [];
    setFavoritos(favsGuardados);
    cargarHistorial(idU);
  }, [navigate]);

  // Reset pagina cuando cambian los filtros
  useEffect(() => { setPagina(1); }, [filtroPorMes, mesFiltro, añoFiltro, verSoloFavs]);

  const cargarHistorial = async (idUsuario) => {
    try {
      const res = await fetch(`${API_BASE}/asistencias/usuario/${idUsuario}/historial`);
      if (res.ok) {
        const data = await res.json();
        const historialParseado = data.map(item => {
          let metricas = {};
          let nombreRealWod = "WOD DE LA CLASE";

          try {
            if (item.resultadoWod && item.resultadoWod.startsWith('{')) {
              const paquete = JSON.parse(item.resultadoWod);
              if (paquete.nombreWod) nombreRealWod = paquete.nombreWod;

              if (paquete.metricasDetalle) { metricas = paquete.metricasDetalle; }
              else {
                metricas = { ...paquete };
                delete metricas.valorOrdenamiento; delete metricas.textoDisplay; delete metricas.tipoMedida; delete metricas.comentarios; delete metricas.nombreWod;
              }
            } else if (item.resultadoWod) {
              metricas = { "Score": item.resultadoWod };
            }
          } catch (e) { metricas = { "Score": item.resultadoWod || '--' }; }
          return { ...item, metricas, nombreRealWod };
        });

        const historialLimpio = historialParseado.filter(h => Object.keys(h.metricas).length > 0 && h.resultadoWod !== null);
        const historialOrdenado = historialLimpio.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

        setHistorial(historialOrdenado);
      } else { setError(true); }
    } catch (err) { setError(true); }
    finally { setLoading(false); }
  };

  const toggleFavorito = (idAsistencia) => {
    const idU = usuario?.idUsuario || usuario?.id;
    let nuevosFavs = favoritos.includes(idAsistencia)
      ? favoritos.filter(id => id !== idAsistencia)
      : [...favoritos, idAsistencia];
    setFavoritos(nuevosFavs);
    localStorage.setItem(`favs_wods_${idU}`, JSON.stringify(nuevosFavs));
  };

  const eliminarScore = async (idAsistencia) => {
    if (!window.confirm("¿Seguro que deseas eliminar este score?")) return;
    try {
      const res = await fetch(`${API_BASE}/asistencias/score/${idAsistencia}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resultadoWod: null, esRx: false })
      });
      if (res.ok) setHistorial(prev => prev.filter(item => item.idAsistencia !== idAsistencia));
    } catch (err) { alert("Error de conexión"); }
  };

  const fetchWodDetalle = useCallback(async (fechaWodStr, tituloBuscado) => {
    if (!box?.idBox) return null;
    const fecha = new Date(fechaWodStr);
    const fechaCorta = fecha.toISOString().split('T')[0];

    const res = await fetch(`${API_BASE}/entrenamientos/box/${box.idBox}`);
    if (!res.ok) return null;
    const wodsDelBox = await res.json();
    const wodsEseDia = wodsDelBox.filter(w => w.fechaProgramada && w.fechaProgramada.includes(fechaCorta));
    let wodCorrecto = wodsEseDia.find(w => w.titulo.trim().toLowerCase() === tituloBuscado.trim().toLowerCase());
    if (!wodCorrecto && wodsEseDia.length > 0) wodCorrecto = wodsEseDia[0];
    return wodCorrecto || null;
  }, [box]);

  // Trae el leaderboard del día y calcula posiciones global (en el WOD) y de clase.
  // Usa dense ranking: empatados en mismo valor + modalidad RX comparten posición.
  // NOTA: El endpoint /historial no devuelve idClase, así que matcheamos por idUsuario
  // y derivamos la clase del propio entry del leaderboard.
  const calcularRankings = useCallback(async (item, wod) => {
    if (!box?.idBox || !item?.fecha) return null;
    const idU = Number(usuario?.idUsuario || usuario?.id);
    if (!idU) return null;
    try {
      const fechaCorta = new Date(item.fecha).toISOString().split('T')[0];
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/asistencias/box/${box.idBox}/leaderboard/${fechaCorta}?incluirOcultos=true`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!res.ok) return null;
      const leaderboard = await res.json();
      if (!Array.isArray(leaderboard) || leaderboard.length === 0) return null;

      const clasesDelWod = wod?.clasesAsignadas?.length
        ? new Set(wod.clasesAsignadas.map(c => Number(c.idClase)))
        : null;

      const asignarPosiciones = (lista) => {
        let rank = 0, lastVal = null, lastRx = null;
        return lista.map((r, i) => {
          if (i === 0) rank = 1;
          else if (r.valorOrdenamiento !== lastVal || r.esRx !== lastRx) rank++;
          lastVal = r.valorOrdenamiento;
          lastRx = r.esRx;
          return { ...r, posicion: rank };
        });
      };

      // 1. Filtra por clases del WOD (si las tiene) y asigna posición global
      const enWod = clasesDelWod
        ? leaderboard.filter(r => clasesDelWod.has(Number(r.idClase)))
        : leaderboard;
      const conPosGlobal = asignarPosiciones(enWod);
      const meGlobal = conPosGlobal.find(r => Number(r.idUsuario) === idU);

      // 2. Si encontramos al atleta, usamos SU idClase del leaderboard (el historial no la trae)
      let conPosClase = [];
      let meClase = null;
      if (meGlobal) {
        const idClaseUsuario = Number(meGlobal.idClase);
        const enClase = conPosGlobal.filter(r => Number(r.idClase) === idClaseUsuario);
        conPosClase = asignarPosiciones(enClase);
        meClase = conPosClase.find(r => Number(r.idUsuario) === idU);
      }

      return {
        global: meGlobal ? { posicion: meGlobal.posicion, total: conPosGlobal.length } : null,
        clase: meClase ? { posicion: meClase.posicion, total: conPosClase.length } : null
      };
    } catch (e) { return null; }
  }, [box, usuario]);

  const abrirDetalleWod = async (fechaWodStr, tituloBuscado) => {
    setLoadingWod(true);
    try {
      const wod = await fetchWodDetalle(fechaWodStr, tituloBuscado);
      if (wod) setWodSeleccionado(wod);
      else alert("Los detalles de este WOD ya no están disponibles en la base de datos.");
    } catch (e) { alert("Error al buscar el WOD."); }
    finally { setLoadingWod(false); }
  };

  // ─── EXPORT PNG ───────────────────────────────────────────
  const iniciarExport = async (item) => {
    if (exportando.idAsistencia) return;
    // Marcamos como "exportando" para deshabilitar el botón, pero SIN item (no renderiza la tarjeta).
    // Así el effect de captura no dispara hasta que la data esté completa.
    setExportando({ idAsistencia: item.idAsistencia, wod: null, ranking: null, item: null });
    let wod = null, ranking = null;
    try { wod = await fetchWodDetalle(item.fecha, item.nombreRealWod); } catch (e) { /* sin detalle */ }
    try { ranking = await calcularRankings(item, wod); } catch (e) { /* sin ranking */ }
    // Ahora SÍ renderizamos la tarjeta con datos completos. Esto dispara el effect UNA sola vez.
    setExportando({ idAsistencia: item.idAsistencia, wod, ranking, item });
  };

  // Cuando la tarjeta de export se renderizó con los datos, capturamos a PNG
  useEffect(() => {
    if (!exportando.item || !exportRef.current) return;
    const id = exportando.idAsistencia;
    // Pequeño delay para asegurar render
    const t = setTimeout(async () => {
      try {
        const canvas = await html2canvas(exportRef.current, {
          backgroundColor: null, scale: 2, useCORS: true, logging: false
        });
        const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
        const fecha = exportando.item.fecha ? new Date(exportando.item.fecha).toISOString().split('T')[0] : 'fecha';
        const filename = `resultado_${sanitizeForFilename(exportando.item.nombreRealWod)}_${fecha}.png`;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = filename;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (e) {
        console.error(e);
        alert('No se pudo generar la imagen.');
      } finally {
        // limpiar si seguimos en el mismo ID (evita carrera con el siguiente click)
        setExportando(prev => prev.idAsistencia === id ? { idAsistencia: null, wod: null, ranking: null, item: null } : prev);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [exportando]);

  // ─── LISTA FILTRADA + PAGINADA ───────────────────────────
  const listaFiltrada = useMemo(() => {
    let filtrada = historial;
    if (verSoloFavs) {
      filtrada = filtrada.filter(h => favoritos.includes(h.idAsistencia));
    } else if (filtroPorMes) {
      filtrada = filtrada.filter(h => {
        const f = new Date(h.fecha);
        return (f.getMonth() + 1) === parseInt(mesFiltro) && f.getFullYear() === parseInt(añoFiltro);
      });
    }
    return filtrada;
  }, [historial, verSoloFavs, favoritos, filtroPorMes, mesFiltro, añoFiltro]);

  const totalPaginas = Math.max(1, Math.ceil(listaFiltrada.length / PAGE_SIZE));
  const paginaSegura = Math.min(pagina, totalPaginas);
  const itemsPagina = useMemo(() => {
    const start = (paginaSegura - 1) * PAGE_SIZE;
    return listaFiltrada.slice(start, start + PAGE_SIZE);
  }, [listaFiltrada, paginaSegura]);

  const rangoInicio = listaFiltrada.length === 0 ? 0 : (paginaSegura - 1) * PAGE_SIZE + 1;
  const rangoFin = Math.min(paginaSegura * PAGE_SIZE, listaFiltrada.length);

  return (
    <div className="mr-page">

      <nav className="mr-navbar">
        <BackButton to="/user-panel" />
        <span className="mr-navbar-brand">
          <i className="fas fa-book-open"></i> Diario de Batalla
        </span>
      </nav>

      <div className="mr-container">

        {/* Tabs */}
        <div className="mr-tabs">
          <button
            className={`mr-tab ${!verSoloFavs ? 'mr-tab--active-history' : ''}`}
            onClick={() => setVerSoloFavs(false)}
          >
            <i className="fas fa-history"></i>
            <span className="mr-tab-label">Historial</span>
          </button>
          <button
            className={`mr-tab ${verSoloFavs ? 'mr-tab--active-favs' : ''}`}
            onClick={() => setVerSoloFavs(true)}
          >
            <i className="fas fa-star"></i>
            <span className="mr-tab-label">Favoritos</span>
          </button>
        </div>

        {/* Toolbar de filtros — opcional, no fuerza nada */}
        {!verSoloFavs && (
          <div className="mr-toolbar">
            <button
              type="button"
              className={`mr-filter-toggle ${filtroPorMes ? 'mr-filter-toggle--on' : ''}`}
              onClick={() => setFiltroPorMes(v => !v)}
              title={filtroPorMes ? 'Mostrando solo el mes seleccionado' : 'Mostrando todos los meses'}
            >
              <i className={`fas ${filtroPorMes ? 'fa-filter' : 'fa-infinity'}`}></i>
              <span className="mr-filter-toggle-label">
                {filtroPorMes ? 'Filtrando por mes' : 'Todos los meses'}
              </span>
            </button>

            {filtroPorMes && (
              <div className="mr-filters-pickers">
                <MesPicker valor={mesFiltro} onCambiar={v => setMesFiltro(v)} />
                <AñoPicker valor={añoFiltro} onCambiar={v => setAñoFiltro(v)} />
              </div>
            )}
          </div>
        )}

        {/* Estados */}
        {loading ? (
          <div className="mr-loading-wrap"><AtletifyLoader /></div>
        ) : error ? (
          <div className="mr-empty">
            <i className="fas fa-exclamation-triangle"></i>
            <p>Error al cargar el historial.</p>
          </div>
        ) : listaFiltrada.length === 0 ? (
          <div className={`mr-empty ${verSoloFavs ? 'mr-empty--favs' : ''}`}>
            <i className={`fas ${verSoloFavs ? 'fa-star' : 'fa-calendar-times'}`}></i>
            <p>{verSoloFavs ? 'Aún no tienes WODs favoritos.' : filtroPorMes ? 'No hay scores registrados con este filtro.' : 'No tienes scores registrados todavía.'}</p>
          </div>
        ) : (
          <>
            <div className="mr-resumen">
              <span>
                Mostrando <strong>{rangoInicio}–{rangoFin}</strong> de <strong>{listaFiltrada.length}</strong>
              </span>
            </div>

            <div className="mr-lista">
              {itemsPagina.map((item) => {
                const esFav = favoritos.includes(item.idAsistencia);
                const exportandoEste = exportando.idAsistencia === item.idAsistencia;
                return (
                  <div key={item.idAsistencia} className={`mr-card ${esFav ? 'mr-card--fav' : ''}`}>
                    <div className={`mr-card-strip ${item.esRx ? 'mr-card-strip--rx' : 'mr-card-strip--scaled'}`}></div>

                    <div className="mr-card-body">
                      <div className="mr-card-header">
                        <span className="mr-card-date">
                          {new Date(item.fecha).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                        </span>
                        <span className="mr-card-wod-name">{item.nombreRealWod}</span>
                        <span className="mr-card-class">
                          <i className="fas fa-clock"></i> {item.nombreClase}
                        </span>
                        <div className="mr-card-meta">
                          {item.esRx ? (
                            <span className="mr-badge-rx"><i className="fas fa-fire"></i> RX</span>
                          ) : (
                            <span className="mr-badge-scaled">Escalado</span>
                          )}
                          <button
                            className="mr-btn-ver-wod"
                            onClick={() => abrirDetalleWod(item.fecha, item.nombreRealWod)}
                            disabled={loadingWod}
                          >
                            {loadingWod
                              ? <i className="fas fa-spinner fa-spin"></i>
                              : <><i className="fas fa-eye"></i><span className="mr-btn-label"> Ver WOD</span></>}
                          </button>
                        </div>
                      </div>

                      <div className="mr-metrics">
                        {Object.entries(item.metricas).map(([llave, valor], idx) => (
                          <div key={idx} className="mr-metric-card">
                            <span className="mr-metric-label">{llave}</span>
                            <span className="mr-metric-value">{valor || '--'}</span>
                          </div>
                        ))}
                      </div>

                      <div className="mr-card-foot">
                        <button
                          className={`mr-btn-fav-foot ${esFav ? 'mr-btn-fav-foot--active' : ''}`}
                          onClick={() => toggleFavorito(item.idAsistencia)}
                          title={esFav ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                        >
                          <i className={`fa-star ${esFav ? 'fas' : 'far'}`}></i>
                          <span className="mr-btn-label">{esFav ? 'Favorito' : 'Favorito'}</span>
                        </button>
                        <button
                          className="mr-btn-export"
                          onClick={() => iniciarExport(item)}
                          disabled={exportandoEste}
                          title="Exportar como imagen PNG"
                        >
                          {exportandoEste
                            ? <><i className="fas fa-spinner fa-spin"></i><span className="mr-btn-label"> Generando…</span></>
                            : <><i className="fas fa-image"></i><span className="mr-btn-label"> Exportar PNG</span></>}
                        </button>
                        <button
                          className="mr-btn-delete-foot"
                          onClick={() => eliminarScore(item.idAsistencia)}
                          title="Eliminar score"
                        >
                          <i className="fas fa-trash-alt"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <Paginacion pagina={paginaSegura} totalPaginas={totalPaginas} onCambio={setPagina} />
          </>
        )}
      </div>

      {/* Modal detalle WOD */}
      {wodSeleccionado && createPortal(
        <div className="mr-modal-overlay" onClick={() => setWodSeleccionado(null)}>
          <div className="mr-modal" onClick={e => e.stopPropagation()}>
            <div className="mr-modal-header">
              <h5 className="mr-modal-title">
                <i className="fas fa-dumbbell"></i> {wodSeleccionado.titulo}
              </h5>
              <button className="mr-modal-close" onClick={() => setWodSeleccionado(null)}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="mr-modal-body">
              {wodSeleccionado.bloques?.map(bloque => (
                <div key={bloque.idBloque} className="mr-bloque">
                  <div className="mr-bloque-header">
                    <h6 className="mr-bloque-tipo">
                      {bloque.tipoBloque}
                      <span className="mr-bloque-modalidad">({bloque.tipoModalidad})</span>
                    </h6>
                    {bloque.capTimeMinutos && (
                      <span className="mr-bloque-cap">TC: {bloque.capTimeMinutos}</span>
                    )}
                  </div>
                  {bloque.descripcionLibre && (
                    <p className="mr-bloque-desc">{bloque.descripcionLibre}</p>
                  )}
                  {bloque.ejercicios?.length > 0 && (
                    <ul className="mr-ejercicio-list">
                      {bloque.ejercicios.map((ej, index) => (
                        <li key={index} className="mr-ejercicio-item">
                          <i className="fas fa-angle-right"></i>
                          <span className="mr-ejercicio-reps">{ej.esquemaRepeticiones}</span>
                          {ej.ejercicio?.nombre}
                          {ej.pesoSugerido && (
                            <span className="mr-ejercicio-peso">{ej.pesoSugerido}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Tarjeta de export oculta (capturada por html2canvas) */}
      {exportando.item && (
        <div className="mr-export-hidden">
          <ResultadoExportCard
            ref={exportRef}
            box={box}
            usuario={usuario}
            item={exportando.item}
            wod={exportando.wod}
            ranking={exportando.ranking}
          />
        </div>
      )}
    </div>
  );
}
