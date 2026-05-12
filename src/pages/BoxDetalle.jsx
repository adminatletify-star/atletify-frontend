import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../services/api';
import BackButton from '../components/BackButton';
import '../assets/css/BoxDetalle.css';
import '../assets/css/WolfBeneficios.css';

const PLACEHOLDER_LOGO = 'https://ui-avatars.com/api/?name=Box&background=1C1C26&color=E63946&size=256&bold=true&font-size=0.5';

export default function BoxDetalle() {
  const { id } = useParams();
  const [box, setBox] = useState(null);
  const [planes, setPlanes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const contentRef = useRef(null);

  // Scroll-reveal: cada .bxd-reveal se anima al entrar al viewport
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('bxd-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );

    const targets = contentRef.current?.querySelectorAll('.bxd-reveal') ?? [];
    targets.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [box]);

  useEffect(() => {
    const cargar = async () => {
      try {
        const [boxData, planesData] = await Promise.all([
          api.obtenerBoxPorId(id),
          api.obtenerPlanesBox(id).catch(() => []),
        ]);
        setBox(boxData);
        setPlanes(planesData);
      } catch (err) {
        setError('No se pudo cargar la información del Box.');
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, [id]);

  if (loading) {
    return (
      <div className="bxd-page bxd-page--center">
        <div className="bxd-state-wrap text-center">
          <div className="bxd-loader">
            <div className="bxd-loader-ring" />
            <div className="bxd-loader-ring bxd-loader-ring--2" />
          </div>
          <p className="bxd-state-text mt-3">Cargando box...</p>
        </div>
      </div>
    );
  }

  if (error || !box) {
    return (
      <div className="bxd-page bxd-page--center">
        <BackButton to="/directorio-boxes" className="bxd-back-fixed" />
        <div className="bxd-state-wrap text-center">
          <div className="bxd-error-glyph">
            <i className="fas fa-exclamation-triangle" />
          </div>
          <p className="bxd-state-text mt-3">{error || 'Box no encontrado.'}</p>
        </div>
      </div>
    );
  }

  const logoSrc = box.logo && box.logo.trim() !== ''
    ? box.logo
    : `https://ui-avatars.com/api/?name=${encodeURIComponent(box.nombre)}&background=1C1C26&color=E63946&size=256&bold=true&font-size=0.4`;

  const redes = [
    { icon: 'fab fa-whatsapp', value: box.whatsApp, label: 'WhatsApp', href: box.whatsApp ? `https://wa.me/${box.whatsApp.replace(/\D/g, '')}` : null, cls: 'bxd-red--wa' },
    { icon: 'fab fa-instagram', value: box.instagram, label: 'Instagram', href: box.instagram, cls: 'bxd-red--ig' },
    { icon: 'fab fa-facebook', value: box.facebook, label: 'Facebook', href: box.facebook, cls: 'bxd-red--fb' },
  ].filter(r => r.value && r.value.trim() !== '');

  const politicas = [
    { icon: 'fas fa-ban', label: 'Cancelación', value: box.politicasCancelacion },
    { icon: 'fas fa-snowflake', label: 'Congelación', value: box.politicasCongelacion },
    { icon: 'fas fa-undo', label: 'Reembolso', value: box.politicasReembolso },
    { icon: 'fas fa-clock', label: 'Tolerancia de Retardos', value: box.toleranciaRetardos },
  ].filter(p => p.value && p.value.trim() !== '');

  const formatDuracion = (plan) => {
    if (plan.mesesDuracion) {
      return plan.mesesDuracion === 1 ? '1 Mes' : `${plan.mesesDuracion} Meses`;
    }
    if (plan.diasDuracion) {
      if (plan.diasDuracion === 7) return 'Semanal';
      if (plan.diasDuracion === 15) return 'Quincenal';
      if (plan.diasDuracion === 30) return 'Mensual';
      if (plan.diasDuracion === 365) return 'Anual';
      return `${plan.diasDuracion} días`;
    }
    return '30 días';
  };

  const calcularAhorro = (precioTotal, precioReferenciaMensual, diasDuracion) => {
    if (!precioReferenciaMensual || !precioTotal || !diasDuracion) return null;
    const meses = Math.max(1, Math.round(diasDuracion / 30));
    const precioBaseTotal = precioReferenciaMensual * meses;
    if (precioBaseTotal <= precioTotal) return null;
    const ahorroDinero = precioBaseTotal - precioTotal;
    const ahorroPorcentaje = Math.round((ahorroDinero / precioBaseTotal) * 100);
    return { ahorroDinero, ahorroPorcentaje, meses };
  };

  return (
    <div className="bxd-page">
      <BackButton to="/directorio-boxes" className="bxd-back-fixed" />

      {/* ─────────────── HERO ─────────────── */}
      <section className="bxd-hero">
        {/* Atmosphere layers */}
        <div className="bxd-hero-bg" aria-hidden="true">
          <div className="bxd-orb bxd-orb--top" />
          <div className="bxd-orb bxd-orb--bottom" />
          <div className="bxd-lines" />
          <div className="bxd-grain" />
        </div>

        {/* Main hero content */}
        <div className="bxd-hero-body">
          {/* Logo */}
          <div className="bxd-logo-wrap">
            <div className="bxd-logo-pulse" />
            <div className="bxd-logo-ring" />
            <div className="bxd-logo-ring-inner" />
            <img
              src={logoSrc}
              alt={`Logo de ${box.nombre}`}
              className="bxd-logo"
              onError={e => { e.target.src = PLACEHOLDER_LOGO; }}
            />
          </div>

          {/* Name */}
          <h1 className="bxd-nombre">{box.nombre}</h1>

          {/* Slogan */}
          {box.slogan && (
            <p className="bxd-slogan">
              <span className="bxd-slogan-mark">"</span>
              {box.slogan}
              <span className="bxd-slogan-mark">"</span>
            </p>
          )}

          {/* Social / action buttons */}
          {(box.whatsApp || box.instagram || box.facebook || box.linkMaps) && (
            <div className="bxd-hero-actions">
              {box.whatsApp && (
                <a href={`https://wa.me/${box.whatsApp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="bxd-hero-btn bxd-hero-btn--wa">
                  <i className="fab fa-whatsapp" />
                  <span>WhatsApp</span>
                </a>
              )}
              {box.instagram && (
                <a href={box.instagram} target="_blank" rel="noopener noreferrer" className="bxd-hero-btn bxd-hero-btn--ig">
                  <i className="fab fa-instagram" />
                  <span>Instagram</span>
                </a>
              )}
              {box.facebook && (
                <a href={box.facebook} target="_blank" rel="noopener noreferrer" className="bxd-hero-btn bxd-hero-btn--fb">
                  <i className="fab fa-facebook" />
                  <span>Facebook</span>
                </a>
              )}
              {box.linkMaps && (
                <a href={box.linkMaps} target="_blank" rel="noopener noreferrer" className="bxd-hero-btn bxd-hero-btn--maps">
                  <i className="fas fa-directions" />
                  <span>Cómo llegar</span>
                </a>
              )}
            </div>
          )}
        </div>

        {/* Stats dateline strip */}
        <div className="bxd-hero-strip">
          <div className="container">
            <div className="bxd-hero-strip-inner">
              {box.ubicacion && (
                <span className="bxd-strip-item">
                  <i className="fas fa-map-marker-alt" />
                  {box.ubicacion}
                </span>
              )}
              {box.telefono && (
                <span className="bxd-strip-item">
                  <i className="fas fa-phone" />
                  {box.telefono}
                </span>
              )}
              {redes.length > 0 && (
                <span className="bxd-strip-item">
                  <i className="fas fa-share-alt" />
                  {redes.length} {redes.length === 1 ? 'red social' : 'redes sociales'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Diagonal cut */}
        <div className="bxd-hero-cut" />
      </section>

      {/* ─────────────── CONTENT ─────────────── */}
      <section className="bxd-content" ref={contentRef}>
        <div className="container">
          <div className="row g-4">

            {/* Descripcion */}
            {box.descripcion && (
              <div className="col-12 bxd-reveal" style={{ '--bxd-delay': '0s' }}>
                <div className="bxd-card bxd-card--sobre">
                  <div className="bxd-card-label">
                    <span className="bxd-label-accent" />
                    <span>Sobre Nosotros</span>
                  </div>
                  <div className="bxd-sobre-body">
                    <div className="bxd-sobre-quote">"</div>
                    <p className="bxd-card-text">{box.descripcion}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Contacto & Ubicacion */}
            <div className="col-12 col-lg-6 bxd-reveal" style={{ '--bxd-delay': '0.05s' }}>
              <div className="bxd-card h-100">
                <div className="bxd-card-label">
                  <span className="bxd-label-accent" />
                  <span>Ubicación y Contacto</span>
                </div>

                <div className="bxd-info-list">
                  {box.ubicacion && (
                    <div className="bxd-info-row">
                      <div className="bxd-info-icon-wrap bxd-info-icon-wrap--primary">
                        <i className="fas fa-map-marker-alt" />
                      </div>
                      <div className="bxd-info-content">
                        <span className="bxd-info-label">Dirección</span>
                        <span className="bxd-info-value">{box.ubicacion}</span>
                      </div>
                    </div>
                  )}

                  {box.telefono && (
                    <div className="bxd-info-row">
                      <div className="bxd-info-icon-wrap bxd-info-icon-wrap--cool">
                        <i className="fas fa-phone" />
                      </div>
                      <div className="bxd-info-content">
                        <span className="bxd-info-label">Teléfono</span>
                        <a href={`tel:${box.telefono}`} className="bxd-info-value bxd-link">{box.telefono}</a>
                      </div>
                    </div>
                  )}

                  {box.linkMaps && (
                    <div className="bxd-info-row">
                      <div className="bxd-info-icon-wrap bxd-info-icon-wrap--accent">
                        <i className="fas fa-directions" />
                      </div>
                      <div className="bxd-info-content">
                        <span className="bxd-info-label">Google Maps</span>
                        <a href={box.linkMaps} target="_blank" rel="noopener noreferrer" className="bxd-info-value bxd-link">
                          Ver en Maps <i className="fas fa-external-link-alt" style={{ fontSize: '0.65rem', marginLeft: '4px' }} />
                        </a>
                      </div>
                    </div>
                  )}

                  {box.instruccionesLlegada && (
                    <div className="bxd-info-row">
                      <div className="bxd-info-icon-wrap bxd-info-icon-wrap--cool">
                        <i className="fas fa-route" />
                      </div>
                      <div className="bxd-info-content">
                        <span className="bxd-info-label">Cómo llegar</span>
                        <span className="bxd-info-value">{box.instruccionesLlegada}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Redes Sociales */}
            <div className="col-12 col-lg-6 bxd-reveal" style={{ '--bxd-delay': '0.14s' }}>
              <div className="bxd-card h-100">
                <div className="bxd-card-label">
                  <span className="bxd-label-accent" />
                  <span>Redes Sociales</span>
                </div>

                {redes.length > 0 ? (
                  <div className="bxd-redes-list">
                    {redes.map((red, i) => (
                      <a
                        key={i}
                        href={red.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`bxd-red-item ${red.cls}`}
                      >
                        <div className="bxd-red-icon-wrap">
                          <i className={red.icon} />
                        </div>
                        <div className="bxd-red-text">
                          <span className="bxd-red-label">{red.label}</span>
                          <span className="bxd-red-value">{red.value}</span>
                        </div>
                        <i className="fas fa-arrow-right bxd-red-arrow" />
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="bxd-empty-text">No hay redes sociales registradas.</p>
                )}
              </div>
            </div>

            {/* Políticas */}
            {politicas.length > 0 && (
              <div className="col-12 bxd-reveal" style={{ '--bxd-delay': '0.21s' }}>
                <div className="bxd-card">
                  <div className="bxd-card-label">
                    <span className="bxd-label-accent" />
                    <span>Políticas del Box</span>
                  </div>
                  <div className="row g-3">
                    {politicas.map((pol, i) => (
                      <div key={i} className="col-12 col-sm-6 col-xl-3">
                        <div className="bxd-politica-item">
                          <div className="bxd-politica-icon-wrap">
                            <i className={pol.icon} />
                          </div>
                          <span className="bxd-politica-label">{pol.label}</span>
                          <p className="bxd-politica-value">{pol.value}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Planes */}
            <div className="col-12 bxd-reveal" style={{ '--bxd-delay': '0.28s' }}>
              <div className="bxd-card">
                <div className="bxd-card-label">
                  <span className="bxd-label-accent" />
                  <span>Planes de Membresía</span>
                </div>

                {planes.filter(p => p.esVisible).length > 0 ? (
                  <div className="row g-3 g-md-4 mt-3">
                    {planes.filter(p => p.esVisible).map(p => {
                      const ahorro = calcularAhorro(p.precio, p.precioReferenciaMensual, p.diasDuracion);
                      
                      return (
                        <div key={p.idPlan} className="col-12 col-sm-6 col-xl-4">
                          <div className="wb-card">
                            <div className="wb-card-stripe" />
                            <div className="wb-card-body">
                              <p className="wb-plan-nombre">{p.nombre}</p>

                              <div className="wb-precio-row">
                                <span className="wb-precio-monto">${p.precio}</span>
                                <span className="wb-precio-periodo">/ {formatDuracion(p)}</span>
                              </div>

                              {ahorro && (
                                <span className="wb-ahorro-badge">
                                  <i className="fas fa-piggy-bank"></i>
                                  Ahorra ${ahorro.ahorroDinero} ({ahorro.ahorroPorcentaje}%)
                                </span>
                              )}

                              <hr className="wb-divider" />
                              <h6 className="text-secondary small fw-bold mb-3 text-start px-3" style={{ fontSize: '0.75rem', letterSpacing: '1px' }}>EL PLAN INCLUYE:</h6>

                              <ul className="wb-features">
                                <li className="wb-feature-item">
                                  <i className={`fas fa-dumbbell ${p.nivelAcceso !== 'OpenGym' ? 'text-primary' : 'text-muted'}`}></i>
                                  {p.nivelAcceso === 'CrossFit' ? 'Clases de CrossFit' : p.nivelAcceso === 'OpenGym' ? 'Solo Open Gym' : 'CrossFit + Gym'}
                                </li>
                                <li className="wb-feature-item">
                                  <i className={`fas fa-building ${p.incluyeGym ? 'text-success' : 'text-danger'}`}></i>
                                  {p.incluyeGym ? 'Incluye Open Gym' : 'Sin Open Gym'}
                                </li>
                                <li className="wb-feature-item">
                                  <i className={`fas fa-crown ${p.requiereInscripcion ? 'text-warning' : 'text-muted'}`}></i>
                                  {p.requiereInscripcion ? 'Suma racha de lealtad' : 'Sin racha de lealtad'}
                                </li>
                                <li className="wb-feature-item">
                                  <i className={`fas fa-chart-line ${p.permiteScore ? 'text-info' : 'text-danger'}`}></i>
                                  {p.permiteScore ? 'Sube scores a la pizarra' : 'Sin acceso a pizarra'}
                                </li>
                              </ul>

                              {p.descripcionDetallada && (
                                <>
                                  <hr className="wb-divider" />
                                  <h6 className="text-secondary small fw-bold mb-3 text-start px-3" style={{ fontSize: '0.75rem', letterSpacing: '1px' }}>BENEFICIOS:</h6>
                                  <ul className="wb-features">
                                    {p.descripcionDetallada.split('\n').filter(l => l.trim()).map((linea, i) => (
                                      <li key={i} className="wb-feature-item">
                                        <i className="fas fa-circle wb-bullet-dot" style={{ fontSize: '0.5rem', color: 'var(--primary)' }}></i>
                                        {linea.replace(/^[•\s]+/, '')}
                                      </li>
                                    ))}
                                  </ul>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="bxd-empty-state">
                    <i className="fas fa-id-card bxd-empty-icon" />
                    <p className="bxd-empty-text">Este box aún no ha publicado planes.</p>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </section>
    </div>
  );
}
