import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import BackButton from '../components/BackButton';
import MesPicker from '../components/MesPicker';
import AñoPicker from '../components/AñoPicker';
import '../assets/css/MisResultados.css';

const API_BASE = 'import.meta.env.VITE_API_URL:7149/api';

export default function MisResultados() {
  const navigate = useNavigate();
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [userId, setUserId] = useState(null);
  const [boxId, setBoxId] = useState(null);

  const [favoritos, setFavoritos] = useState([]);
  const [verSoloFavs, setVerSoloFavs] = useState(false);

  const [mesFiltro, setMesFiltro] = useState(new Date().getMonth() + 1);
  const [añoFiltro, setAñoFiltro] = useState(new Date().getFullYear());

  const [wodSeleccionado, setWodSeleccionado] = useState(null);
  const [loadingWod, setLoadingWod] = useState(false);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('usuario'));
    const box = JSON.parse(localStorage.getItem('box'));
    if (!user || !box) { navigate('/login'); return; }

    setUserId(user.idUsuario || user.id);
    setBoxId(box.idBox);

    const favsGuardados = JSON.parse(localStorage.getItem(`favs_wods_${user.idUsuario || user.id}`)) || [];
    setFavoritos(favsGuardados);

    cargarHistorial(user.idUsuario || user.id);
  }, [navigate]);

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
    let nuevosFavs = favoritos.includes(idAsistencia)
      ? favoritos.filter(id => id !== idAsistencia)
      : [...favoritos, idAsistencia];
    setFavoritos(nuevosFavs);
    localStorage.setItem(`favs_wods_${userId}`, JSON.stringify(nuevosFavs));
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

  // 👇 LA MAGIA CORREGIDA: Buscamos por Fecha Y por Título Exacto 👇
  const abrirDetalleWod = async (fechaWodStr, tituloBuscado) => {
    setLoadingWod(true);
    try {
      const fecha = new Date(fechaWodStr);
      const fechaCorta = fecha.toISOString().split('T')[0];

      const res = await fetch(`${API_BASE}/entrenamientos/box/${boxId}`);
      if (res.ok) {
        const wodsDelBox = await res.json();

        // 1. Obtenemos TODOS los WODs de ese día
        const wodsEseDia = wodsDelBox.filter(w => w.fechaProgramada && w.fechaProgramada.includes(fechaCorta));

        // 2. Buscamos el que se llame EXACTAMENTE como el que el atleta puntuó
        let wodCorrecto = wodsEseDia.find(w => w.titulo.trim().toLowerCase() === tituloBuscado.trim().toLowerCase());

        // 3. Fallback de seguridad (por si el Coach le cambió el nombre al WOD después)
        if (!wodCorrecto && wodsEseDia.length > 0) {
          wodCorrecto = wodsEseDia[0];
        }

        if (wodCorrecto) setWodSeleccionado(wodCorrecto);
        else alert("Los detalles de este WOD ya no están disponibles en la base de datos.");
      }
    } catch (error) { alert("Error al buscar el WOD."); }
    finally { setLoadingWod(false); }
  };

  const listaMostrada = useMemo(() => {
    let filtrada = historial;
    if (verSoloFavs) {
      filtrada = filtrada.filter(h => favoritos.includes(h.idAsistencia));
    } else {
      filtrada = filtrada.filter(h => {
        const f = new Date(h.fecha);
        return (f.getMonth() + 1) === parseInt(mesFiltro) && f.getFullYear() === parseInt(añoFiltro);
      });
    }
    return filtrada;
  }, [historial, verSoloFavs, favoritos, mesFiltro, añoFiltro]);

  return (
    <div className="mr-page">

      <nav className="mr-navbar">
        <BackButton to="/user-panel" />
        <span className="mr-navbar-brand">
          <i className="fas fa-book-open"></i> Diario de Batalla
        </span>
      </nav>

      <div className="container py-4" style={{ maxWidth: '800px' }}>

        {/* Tab Switcher */}
        <div className="mr-tabs">
          <button
            className={`mr-tab ${!verSoloFavs ? 'mr-tab--active-history' : ''}`}
            onClick={() => setVerSoloFavs(false)}
          >
            Historial
          </button>
          <button
            className={`mr-tab ${verSoloFavs ? 'mr-tab--active-favs' : ''}`}
            onClick={() => setVerSoloFavs(true)}
          >
            <i className="fas fa-star"></i> Favoritos
          </button>
        </div>

        {/* Filtros de mes / año */}
        {!verSoloFavs && (
          <div className="mr-filters">
            <div style={{ flex: 1 }}>
              <MesPicker valor={mesFiltro} onCambiar={v => setMesFiltro(v)} />
            </div>
            <div style={{ flex: 0, minWidth: '110px' }}>
              <AñoPicker valor={añoFiltro} onCambiar={v => setAñoFiltro(v)} />
            </div>
          </div>
        )}

        {/* Estados */}
        {loading ? (
          <div className="mr-state-center">
            <div className="spinner-border mr-spinner"></div>
          </div>
        ) : error ? (
          <div className="mr-state-center">
            <i className="fas fa-exclamation-triangle fs-1 mb-3" style={{ color: 'var(--primary)', opacity: 0.5 }}></i>
            <p style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>Error al cargar el historial.</p>
          </div>
        ) : listaMostrada.length === 0 ? (
          <div className={`mr-empty ${verSoloFavs ? 'mr-empty-favs' : ''}`}>
            <i className={`fas ${verSoloFavs ? 'fa-star' : 'fa-calendar-times'}`}></i>
            <p>{verSoloFavs ? 'Aún no tienes WODs favoritos.' : 'No hay scores registrados en este mes.'}</p>
          </div>
        ) : (
          <div className="d-flex flex-column gap-3">
            {listaMostrada.map((item) => {
              const esFav = favoritos.includes(item.idAsistencia);
              return (
                <div key={item.idAsistencia} className={`mr-card ${esFav ? 'mr-card--fav' : ''}`}>

                  {/* Strip lateral */}
                  <div className={`mr-card-strip ${item.esRx ? 'mr-card-strip--rx' : 'mr-card-strip--scaled'}`}></div>

                  {/* Botones de acción */}
                  <div className="mr-card-actions">
                    <button
                      className={`mr-btn-icon mr-btn-fav ${esFav ? 'mr-btn-fav--active' : ''}`}
                      onClick={() => toggleFavorito(item.idAsistencia)}
                      title={esFav ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                    >
                      <i className={`fa-star ${esFav ? 'fas' : 'far'}`}></i>
                    </button>
                    <button
                      className="mr-btn-icon mr-btn-delete"
                      onClick={() => eliminarScore(item.idAsistencia)}
                      title="Eliminar score"
                    >
                      <i className="fas fa-trash-alt"></i>
                    </button>
                  </div>

                  <div className="mr-card-body">
                    {/* Header */}
                    <div className="mr-card-header">
                      <span className="mr-card-date">
                        {new Date(item.fecha).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                      </span>
                      <span className="mr-card-wod-name">{item.nombreRealWod}</span>
                      <span className="mr-card-class">
                        <i className="fas fa-clock"></i> {item.nombreClase}
                      </span>

                      {/* Badge + Ver WOD */}
                      <div className="mr-card-meta">
                        {item.esRx ? (
                          <span className="mr-badge-rx"><i className="fas fa-fire"></i> RX</span>
                        ) : (
                          <span className="mr-badge-scaled">Escalado</span>
                        )}
                        <button
                          className="mr-btn-ver-wod"
                          onClick={() => abrirDetalleWod(item.fecha, item.nombreRealWod)}
                        >
                          {loadingWod
                            ? <i className="fas fa-spinner fa-spin"></i>
                            : <><i className="fas fa-eye"></i> Ver WOD</>
                          }
                        </button>
                      </div>
                    </div>

                    {/* Métricas */}
                    <div className="mr-metrics">
                      {Object.entries(item.metricas).map(([llave, valor], idx) => (
                        <div key={idx} className="mr-metric-card">
                          <span className="mr-metric-label">{llave}</span>
                          <span className="mr-metric-value">{valor || '--'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal detalle WOD */}
      {wodSeleccionado && (
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
        </div>
      )}
    </div>
  );
}
