import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import BackButton from '../components/BackButton';
import AtletifyLoader from '../components/AtletifyLoader';
import '../assets/css/DirectorioBoxes.css';

const PLACEHOLDER_LOGO = 'https://ui-avatars.com/api/?name=Box&background=1C1C26&color=E63946&size=128&bold=true&font-size=0.5';

export default function DirectorioBoxes() {
  const [boxes, setBoxes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const cargarBoxes = async () => {
      try {
        const data = await api.obtenerBoxes();
        setBoxes(data.filter(b => b.activo !== false));
      } catch (err) {
        setError('No se pudo cargar el directorio de Boxes.');
      } finally {
        setLoading(false);
      }
    };
    cargarBoxes();
  }, []);

  return (
    <div className="directorio-boxes-page">
      {/* Botón volver eliminado */}

      {/* Hero */}
      <section className="db-hero">
        <div className="db-hero-overlay" />
        <div className="container position-relative z-1 text-center">
          <p className="db-hero-eyebrow">RED WOLFPACK</p>
          <h1 className="db-hero-title">DIRECTORIO DE BOXES</h1>
          <p className="db-hero-sub">
            Encuentra tu Box. Entrena como manada.
          </p>
        </div>
      </section>

      {/* Grid de Cards */}
      <section className="db-grid-section">
        <div className="container">
          {loading && (
            <div className="db-status text-center">
              <AtletifyLoader />
              <p className="db-status-text mt-3">Cargando boxes...</p>
            </div>
          )}

          {error && !loading && (
            <div className="db-status text-center">
              <i className="fas fa-exclamation-triangle db-error-icon" />
              <p className="db-status-text mt-3">{error}</p>
            </div>
          )}

          {!loading && !error && boxes.length === 0 && (
            <div className="db-status text-center">
              <i className="fas fa-inbox db-empty-icon" />
              <p className="db-status-text mt-3">No hay boxes disponibles por el momento.</p>
            </div>
          )}

          {!loading && !error && boxes.length > 0 && (
            <div className="row g-4 justify-content-center">
              {boxes.map(box => (
                <div key={box.idBox} className="col-12 col-sm-6 col-lg-4">
                  <BoxCard box={box} onSaberMas={() => navigate(`/box/${box.idBox}`)} onUnirme={() => navigate(`/registro/${box.idBox}`)} />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function BoxCard({ box, onSaberMas, onUnirme }) {
  const logoSrc = box.logo && box.logo.trim() !== ''
    ? box.logo
    : `https://ui-avatars.com/api/?name=${encodeURIComponent(box.nombre)}&background=1C1C26&color=E63946&size=128&bold=true&font-size=0.4`;

  return (
    <div className="db-card">
      <div className="db-card-logo-wrap">
        <img
          src={logoSrc}
          alt={`Logo de ${box.nombre}`}
          className="db-card-logo"
          onError={e => { e.target.src = PLACEHOLDER_LOGO; }}
        />
      </div>

      <div className="db-card-body">
        <h3 className="db-card-name">{box.nombre}</h3>

        {box.slogan && (
          <p className="db-card-slogan">"{box.slogan}"</p>
        )}

        <div className="db-card-location">
          <i className="fas fa-map-marker-alt db-card-location-icon" />
          <span>{box.ubicacion}</span>
        </div>

        {box.telefono && (
          <div className="db-card-contact">
            <i className="fas fa-phone db-card-contact-icon" />
            <span>{box.telefono}</span>
          </div>
        )}
      </div>

      <div className="db-card-footer">
        <button className="db-btn-saber-mas" onClick={onSaberMas} type="button">
          Saber más
          <i className="fas fa-arrow-right ms-2" />
        </button>
        <button className="db-btn-unirme" onClick={onUnirme} type="button">
          <i className="fas fa-user-plus me-2" />
          Unirme
        </button>
      </div>
    </div>
  );
}
