import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import AtletifyLoader from '../components/AtletifyLoader';
import '../assets/css/DirectorioBoxes.css';

const PLACEHOLDER_LOGO = 'https://ui-avatars.com/api/?name=Box&background=1C1C26&color=E63946&size=128&bold=true&font-size=0.5';
const POR_PAGINA = 9;

export default function DirectorioBoxes() {
  const [boxes, setBoxes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagina, setPagina] = useState(1);
  const [busqueda, setBusqueda] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const cargarBoxes = async () => {
      try {
        const data = await api.obtenerBoxes();
        setBoxes(data.filter(b => b.activo !== false));
      } catch {
        setError('No se pudo cargar el directorio de Boxes.');
      } finally {
        setLoading(false);
      }
    };
    cargarBoxes();
  }, []);

  // Resetear a página 1 cuando cambia la búsqueda
  useEffect(() => { setPagina(1); }, [busqueda]);

  const norm = (s) =>
    (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, '');

  const boxesFiltrados = useMemo(() => {
    const q = norm(busqueda);
    if (!q) return boxes;
    return boxes.filter(b => norm(b.nombre).includes(q) || norm(b.ubicacion).includes(q));
  }, [boxes, busqueda]);

  const totalPaginas = Math.ceil(boxesFiltrados.length / POR_PAGINA);

  const boxesPagina = useMemo(() => {
    const inicio = (pagina - 1) * POR_PAGINA;
    return boxesFiltrados.slice(inicio, inicio + POR_PAGINA);
  }, [boxesFiltrados, pagina]);

  const irPagina = (p) => {
    setPagina(p);
    document.getElementById('db-grid-anchor')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="directorio-boxes-page">

      <section className="db-hero">
        <div className="db-hero-grid-lines" />
        <div className="db-hero-glow-primary" />
        <div className="db-hero-glow-secondary" />
        <div className="db-hero-fade-bottom" />

        <div className="db-hero-inner">
          <div className="db-hero-eyebrow">
            <span className="db-eyebrow-dash" />
            Red WolfPack
            <span className="db-eyebrow-dash" />
          </div>

          <h1 className="db-hero-title">
            <span className="db-title-outline">Directorio</span>
            <span className="db-title-filled">de Boxes</span>
          </h1>

          <p className="db-hero-sub">
            Cada box es un mundo. Encuentra el tuyo.
          </p>

          {!loading && !error && boxes.length > 0 && (
            <div className="db-hero-pill">
              <span className="db-hero-pill-dot" />
              <span className="db-hero-pill-num">{boxes.length}</span>
              <span className="db-hero-pill-text">boxes activos en la red</span>
            </div>
          )}
        </div>
      </section>

      <section className="db-grid-section">
        <div id="db-grid-anchor" className="db-grid-anchor" />
        <div className="db-grid-wrap">

          {/* Buscador */}
          {!loading && !error && boxes.length > 0 && (
            <div className="db-search-wrap">
              <div className="db-search-input-wrap">
                <i className="fas fa-search db-search-icon" />
                <input
                  type="text"
                  className="db-search-input"
                  placeholder="Buscar por nombre o ubicación..."
                  value={busqueda}
                  onChange={e => setBusqueda(e.target.value)}
                />
                {busqueda && (
                  <button
                    type="button"
                    className="db-search-clear"
                    onClick={() => setBusqueda('')}
                    aria-label="Limpiar búsqueda"
                  >
                    <i className="fas fa-times" />
                  </button>
                )}
              </div>
              {busqueda && (
                <p className="db-search-hint">
                  {boxesFiltrados.length === 0
                    ? 'Sin resultados para esta búsqueda.'
                    : `${boxesFiltrados.length} resultado${boxesFiltrados.length !== 1 ? 's' : ''}`}
                </p>
              )}
            </div>
          )}

          {loading && (
            <div className="db-status">
              <AtletifyLoader />
              <p className="db-status-text">Cargando boxes...</p>
            </div>
          )}

          {error && !loading && (
            <div className="db-status">
              <i className="fas fa-exclamation-triangle db-status-icon db-status-icon--error" />
              <p className="db-status-text">{error}</p>
            </div>
          )}

          {!loading && !error && boxes.length === 0 && (
            <div className="db-status">
              <i className="fas fa-inbox db-status-icon" />
              <p className="db-status-text">No hay boxes disponibles por el momento.</p>
            </div>
          )}

          {!loading && !error && boxes.length > 0 && boxesFiltrados.length === 0 && (
            <div className="db-status">
              <i className="fas fa-search db-status-icon" />
              <p className="db-status-text">Sin resultados para "<strong>{busqueda}</strong>".</p>
            </div>
          )}

          {!loading && !error && boxesFiltrados.length > 0 && (
            <>
              <div className="db-grid">
                {boxesPagina.map((box, i) => (
                  <BoxCard
                    key={box.idBox}
                    box={box}
                    index={(pagina - 1) * POR_PAGINA + i}
                    onSaberMas={() => navigate(`/box/${box.idBox}`)}
                    onUnirme={() => navigate(`/registro/${box.idBox}`)}
                  />
                ))}
              </div>

              {totalPaginas > 1 && (
                <Paginador
                  pagina={pagina}
                  total={totalPaginas}
                  onChange={irPagina}
                />
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}

function BoxCard({ box, index, onSaberMas, onUnirme }) {
  const logoSrc = box.logo && box.logo.trim() !== ''
    ? box.logo
    : `https://ui-avatars.com/api/?name=${encodeURIComponent(box.nombre)}&background=0e0e14&color=E63946&size=128&bold=true&font-size=0.4`;

  const num = String(index + 1).padStart(2, '0');

  return (
    <article
      className="db-card"
      style={{ animationDelay: `${Math.min((index % POR_PAGINA) * 0.065, 0.5)}s` }}
    >
      <div className="db-card-header">
        <div className="db-card-header-grid" />
        <div className="db-card-header-glow" />
        <span className="db-card-index">{num}</span>
        <div className="db-card-logo-ring">
          <img
            src={logoSrc}
            alt={`Logo de ${box.nombre}`}
            className="db-card-logo"
            onError={e => { e.target.src = PLACEHOLDER_LOGO; }}
          />
        </div>
      </div>

      <div className="db-card-body">
        <h3 className="db-card-name">{box.nombre}</h3>
        {box.slogan && <p className="db-card-slogan">"{box.slogan}"</p>}

        <div className="db-card-meta">
          {box.ubicacion && (
            <div className="db-meta-row">
              <i className="fas fa-map-marker-alt db-meta-icon" />
              <span>{box.ubicacion}</span>
            </div>
          )}
          {box.telefono && (
            <div className="db-meta-row">
              <i className="fas fa-phone db-meta-icon db-meta-icon--phone" />
              <span>{box.telefono}</span>
            </div>
          )}
        </div>
      </div>

      <div className="db-card-footer">
        <button className="db-btn-primary" onClick={onSaberMas} type="button">
          Ver box <i className="fas fa-arrow-right" />
        </button>
        <button className="db-btn-ghost" onClick={onUnirme} type="button">
          <i className="fas fa-user-plus" /> Unirme
        </button>
      </div>
    </article>
  );
}

function Paginador({ pagina, total, onChange }) {
  const paginas = [];

  if (total <= 7) {
    for (let i = 1; i <= total; i++) paginas.push(i);
  } else {
    paginas.push(1);
    if (pagina > 3) paginas.push('...');
    for (let i = Math.max(2, pagina - 1); i <= Math.min(total - 1, pagina + 1); i++) {
      paginas.push(i);
    }
    if (pagina < total - 2) paginas.push('...');
    paginas.push(total);
  }

  return (
    <div className="db-paginador">
      <button
        className="db-pag-btn db-pag-nav"
        onClick={() => onChange(pagina - 1)}
        disabled={pagina === 1}
        type="button"
        aria-label="Página anterior"
      >
        <i className="fas fa-chevron-left" />
      </button>

      {paginas.map((p, i) =>
        p === '...'
          ? <span key={`ellipsis-${i}`} className="db-pag-ellipsis">…</span>
          : (
            <button
              key={p}
              type="button"
              className={`db-pag-btn${pagina === p ? ' db-pag-btn--active' : ''}`}
              onClick={() => onChange(p)}
            >
              {p}
            </button>
          )
      )}

      <button
        className="db-pag-btn db-pag-nav"
        onClick={() => onChange(pagina + 1)}
        disabled={pagina === total}
        type="button"
        aria-label="Página siguiente"
      >
        <i className="fas fa-chevron-right" />
      </button>
    </div>
  );
}
