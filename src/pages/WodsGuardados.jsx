import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BackButton from '../components/BackButton';
import AtletifyLoader from '../components/AtletifyLoader';
import BotonSeguro from '../components/BotonSeguro';
import ModalAplicarPlantilla from '../components/ModalAplicarPlantilla';
import { api } from '../services/api';
import '../assets/css/GestionClases.css'; // header gc-*
import '../assets/css/WodsGuardados.css';

const PAGE_SIZE = 10;
const normalizar = s => s?.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase() ?? '';

// Igual que Ejercicios: primera, última y cercanas (±1), colapsando con …
function buildPaginas(pagina, total) {
  return Array.from({ length: total }, (_, idx) => idx + 1)
    .filter(n => n === 1 || n === total || Math.abs(n - pagina) <= 1)
    .reduce((acc, n, i, arr) => {
      if (i > 0 && n - arr[i - 1] > 1) acc.push('...');
      acc.push(n);
      return acc;
    }, []);
}

export default function WodsGuardados() {
  const navigate = useNavigate();
  const [box, setBox] = useState(null);
  const [plantillas, setPlantillas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [pagina, setPagina] = useState(1);
  const [expandida, setExpandida] = useState(null);
  const [detalle, setDetalle] = useState({});
  const [aplicar, setAplicar] = useState(null);

  useEffect(() => {
    const b = JSON.parse(localStorage.getItem('box'));
    const u = JSON.parse(localStorage.getItem('usuario'));
    if (!b || !u || (u.rol !== 'AdminBox' && u.rol !== 'Coach' && u.rol !== 'Developer')) {
      navigate('/');
      return;
    }
    setBox(b);
    cargar(b.idBox);
  }, [navigate]);

  async function cargar(idBox) {
    setLoading(true);
    try {
      const data = await api.obtenerPlantillasBox(idBox);
      setPlantillas(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Error cargando plantillas', e);
      setPlantillas([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { setPagina(1); }, [busqueda]);

  const filtradas = plantillas.filter(p => {
    if (!busqueda.trim()) return true;
    const q = normalizar(busqueda);
    return normalizar(p.nombre).includes(q)
      || normalizar(p.nombreCreador).includes(q)
      || normalizar(p.descripcion).includes(q);
  });

  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / PAGE_SIZE));
  const pagItems = filtradas.slice((pagina - 1) * PAGE_SIZE, pagina * PAGE_SIZE);

  const togglePreview = async (p) => {
    if (expandida === p.idPlantilla) { setExpandida(null); return; }
    setExpandida(p.idPlantilla);
    if (!detalle[p.idPlantilla]) {
      try {
        const full = await api.obtenerPlantilla(p.idPlantilla);
        setDetalle(prev => ({ ...prev, [p.idPlantilla]: full }));
      } catch (e) { /* noop */ }
    }
  };

  const toggleFavorita = async (p) => {
    try {
      await api.toggleFavoritaPlantilla(p.idPlantilla, !p.esFavorita);
      setPlantillas(prev => prev.map(x => x.idPlantilla === p.idPlantilla ? { ...x, esFavorita: !x.esFavorita } : x));
    } catch (e) { alert(e.message || 'Error al actualizar favorita'); }
  };

  const eliminar = async (p) => {
    if (!await window.wpConfirm(`¿Eliminar la plantilla "${p.nombre}"?\n\nLos WODs ya aplicados a un día NO se borran.`)) return;
    try {
      await api.eliminarPlantilla(p.idPlantilla);
      setPlantillas(prev => prev.filter(x => x.idPlantilla !== p.idPlantilla));
    } catch (e) { alert(e.message || 'Error al eliminar'); }
  };

  if (loading) {
    return <div className="wg-page wg-loading-wrap"><AtletifyLoader /></div>;
  }

  return (
    <div className="wg-page">
      <header className="gc-header">
        <div className="d-flex align-items-center gap-3">
          <BackButton to="/calendario-wods" />
          <h1 className="gc-header-title">
            WODs <span>Guardados</span>
          </h1>
        </div>
      </header>

      <div className="container-xl px-3 px-md-4">
        <div className="wg-search">
          <i className="fas fa-search wg-search-icon"></i>
          <input
            type="text"
            className="wg-search-input"
            placeholder="Buscar plantilla o creador..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
          />
        </div>

        {filtradas.length > 0 && (
          <p className="wg-count">
            Mostrando {((pagina - 1) * PAGE_SIZE) + 1}–{Math.min(pagina * PAGE_SIZE, filtradas.length)} de {filtradas.length}
          </p>
        )}

        {filtradas.length === 0 ? (
          <div className="wg-empty">
            <i className="fas fa-bookmark"></i>
            <p>{busqueda
              ? 'Sin resultados para tu búsqueda.'
              : 'Aún no has guardado plantillas. Crea un WOD y usa "Guardar como plantilla".'}</p>
          </div>
        ) : (
          <div className="wg-list">
            {pagItems.map(p => (
              <div key={p.idPlantilla} className="wg-card">
                <div className="wg-card-main">
                  <div className="wg-card-info">
                    <div className="wg-card-title-row">
                      <h3 className="wg-card-title">{p.nombre}</h3>
                      {p.esFavorita && <span className="wg-fav-badge"><i className="fas fa-star"></i></span>}
                    </div>
                    {p.descripcion && <p className="wg-card-desc">{p.descripcion}</p>}
                    <div className="wg-chips">
                      <span className="wg-chip"><i className="fas fa-layer-group"></i>{p.numBloques} bloques</span>
                      <span className="wg-chip"><i className="fas fa-dumbbell"></i>{p.numEjercicios} ejercicios</span>
                      <span className="wg-chip"><i className="fas fa-fire"></i>Usada {p.vecesUsada}×</span>
                      {p.nombreCreador && <span className="wg-chip"><i className="fas fa-user"></i>{p.nombreCreador}</span>}
                    </div>
                  </div>

                  <div className="wg-card-actions">
                    <button className="wg-btn-primary" onClick={() => setAplicar(p)}>
                      <i className="fas fa-bolt"></i><span className="wg-btn-label">Aplicar a un día</span>
                    </button>
                    <button
                      className="wg-icon-btn"
                      title="Editar plantilla"
                      onClick={() => navigate(`/creador-wods?plantilla=${p.idPlantilla}`)}
                    >
                      <i className="fas fa-pen"></i>
                    </button>
                    <button
                      className={`wg-icon-btn ${p.esFavorita ? 'wg-icon-btn--fav' : ''}`}
                      title={p.esFavorita ? 'Quitar de favoritas' : 'Marcar favorita'}
                      onClick={() => toggleFavorita(p)}
                    >
                      <i className={`${p.esFavorita ? 'fas' : 'far'} fa-star`}></i>
                    </button>
                    <button className="wg-icon-btn" title="Ver bloques" onClick={() => togglePreview(p)}>
                      <i className={`fas fa-chevron-${expandida === p.idPlantilla ? 'up' : 'down'}`}></i>
                    </button>
                    <BotonSeguro onClick={() => eliminar(p)} className="wg-icon-btn wg-icon-btn--danger" textoProcesando="…">
                      <i className="fas fa-trash"></i>
                    </BotonSeguro>
                  </div>
                </div>

                {expandida === p.idPlantilla && (
                  <div className="wg-preview">
                    {!detalle[p.idPlantilla] ? (
                      <p className="wg-empty-mini">Cargando…</p>
                    ) : (
                      (detalle[p.idPlantilla].bloques || []).map((b, bi) => (
                        <div key={bi} className="wg-preview-bloque">
                          <span className="wg-preview-tipo">{b.tipoBloque}</span>{' '}
                          <span className="wg-preview-mod">{b.tipoModalidad}</span>
                          {b.descripcionLibre && <p className="wg-preview-desc">{b.descripcionLibre}</p>}
                          {(b.ejercicios || []).length > 0 && (
                            <ul className="wg-preview-ejs">
                              {b.ejercicios.map((ej, ei) => (
                                <li key={ei}>
                                  <strong>{ej.esquemaRepeticiones}</strong>
                                  {ej.ejercicio?.nombre}
                                  {ej.pesoSugerido && <em> ({ej.pesoSugerido})</em>}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {totalPaginas > 1 && (
          <div className="wg-pag">
            <button className="wg-pag-arrow" disabled={pagina === 1} onClick={() => setPagina(p => Math.max(1, p - 1))}>
              <i className="fas fa-chevron-left"></i>
            </button>
            {buildPaginas(pagina, totalPaginas).map((n, i) => n === '...' ? (
              <span key={`e${i}`} className="wg-pag-ellipsis">…</span>
            ) : (
              <button
                key={n}
                className={`wg-pag-num ${n === pagina ? 'wg-pag-num--active' : ''}`}
                onClick={() => setPagina(n)}
              >
                {n}
              </button>
            ))}
            <button className="wg-pag-arrow" disabled={pagina === totalPaginas} onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}>
              <i className="fas fa-chevron-right"></i>
            </button>
          </div>
        )}
      </div>

      {aplicar && box && (
        <ModalAplicarPlantilla
          plantilla={aplicar}
          idBox={box.idBox}
          onCerrar={() => setAplicar(null)}
          onAplicada={() => {
            setAplicar(null);
            alert('Plantilla aplicada. La verás en el calendario.');
            navigate('/calendario-wods');
          }}
        />
      )}
    </div>
  );
}
