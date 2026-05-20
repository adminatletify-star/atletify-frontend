import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import AtletifyLoader from '../components/AtletifyLoader';
import '../assets/css/BoxDetalle.css';
import '../assets/css/WolfBeneficios.css';

const PLACEHOLDER_LOGO = 'https://ui-avatars.com/api/?name=Box&background=1C1C26&color=E63946&size=256&bold=true&font-size=0.5';

export default function BoxDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [box, setBox] = useState(null);
  const [planes, setPlanes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const contentRef = useRef(null);

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
        const [boxData, planesData, configData] = await Promise.all([
          api.obtenerBoxPorId(id),
          api.obtenerPlanesBox(id).catch(() => []),
          fetch(`${import.meta.env.VITE_API_URL}/api/configuracionbox/${id}`).then(r => r.ok ? r.json() : {}).catch(() => {}),
        ]);
        setBox({ ...boxData, ...configData });
        setPlanes(planesData);
      } catch {
        setError('No se pudo cargar la información del Box.');
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, [id]);

  if (loading) return (
    <div className="bxd-page bxd-page--center">
      <AtletifyLoader />
    </div>
  );

  if (error || !box) return (
    <div className="bxd-page bxd-page--center">
      <div className="bxd-state-wrap text-center">
        <div className="bxd-error-glyph"><i className="fas fa-exclamation-triangle" /></div>
        <p className="bxd-state-text mt-3">{error || 'Box no encontrado.'}</p>
        <button className="bxd-btn-volver mt-4" onClick={() => navigate('/directorio-boxes')} type="button">
          <i className="fas fa-arrow-left" /> Volver al directorio
        </button>
      </div>
    </div>
  );

  const logoSrc = box.logo && box.logo.trim() !== ''
    ? box.logo
    : `https://ui-avatars.com/api/?name=${encodeURIComponent(box.nombre)}&background=1C1C26&color=E63946&size=256&bold=true&font-size=0.4`;

  const redes = [
    { icon: 'fab fa-whatsapp',  value: box.whatsApp,   label: 'WhatsApp', href: box.whatsApp  ? `https://wa.me/${box.whatsApp.replace(/\D/g, '')}` : null, cls: 'bxd-red--wa' },
    { icon: 'fab fa-instagram', value: box.instagram,  label: 'Instagram', href: box.instagram,  cls: 'bxd-red--ig' },
    { icon: 'fab fa-facebook',  value: box.facebook,   label: 'Facebook',  href: box.facebook,   cls: 'bxd-red--fb' },
  ].filter(r => r.value && r.value.trim() !== '');

  const politicas = [
    { icon: 'fas fa-ban',      label: 'Cancelación',         value: box.politicasCancelacion },
    { icon: 'fas fa-snowflake',label: 'Congelación',         value: box.politicasCongelacion },
    { icon: 'fas fa-undo',     label: 'Reembolso',           value: box.politicasReembolso },
    { icon: 'fas fa-clock',    label: 'Tolerancia Retardos', value: box.toleranciaRetardos },
  ].filter(p => p.value && p.value.trim() !== '');

  const costoDropIn    = Number(box.costoDropIn   ?? 0);
  const costoVisitaGym = Number(box.costoVisitaGym ?? 0);
  const mostrarPrecios = costoDropIn > 0 || costoVisitaGym > 0;

  const formatDuracion = (plan) => {
    if (plan.mesesDuracion) return plan.mesesDuracion === 1 ? '1 Mes' : `${plan.mesesDuracion} Meses`;
    if (plan.diasDuracion) {
      if (plan.diasDuracion === 7)   return 'Semanal';
      if (plan.diasDuracion === 15)  return 'Quincenal';
      if (plan.diasDuracion === 30)  return 'Mensual';
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
    return { ahorroDinero, ahorroPorcentaje };
  };

  const planesVisibles = planes.filter(p => p.esVisible);

  return (
    <div className="bxd-page">

      {/* ── TOPBAR ── */}
      <header className="bxd-topbar">
        <button type="button" className="bxd-topbar-back" onClick={() => navigate('/directorio-boxes')}>
          <i className="fas fa-chevron-left" />
          <span>Directorio</span>
        </button>
        <span className="bxd-topbar-name">{box.nombre}</span>
        <button type="button" className="bxd-topbar-cta" onClick={() => navigate(`/registro/${id}`)}>
          <i className="fas fa-user-plus" />
          <span>Unirme</span>
        </button>
      </header>

      {/* ── HERO ── */}
      <section className="bxd-hero">
        <div className="bxd-hero-glow" />
        <div className="bxd-hero-grid" />
        <div className="bxd-hero-fade" />

        <div className="bxd-hero-inner">
          {/* Logo */}
          <div className="bxd-logo-wrap">
            <div className="bxd-logo-ring-anim" />
            <img
              src={logoSrc}
              alt={`Logo de ${box.nombre}`}
              className="bxd-logo"
              onError={e => { e.target.src = PLACEHOLDER_LOGO; }}
            />
          </div>

          {/* Nombre y slogan */}
          <h1 className="bxd-nombre">{box.nombre}</h1>
          {box.slogan && (
            <p className="bxd-slogan">"{box.slogan}"</p>
          )}

          {/* Info rápida */}
          <div className="bxd-hero-meta">
            {box.ubicacion && (
              <span className="bxd-hero-meta-item">
                <i className="fas fa-map-marker-alt" />{box.ubicacion}
              </span>
            )}
            {box.telefono && (
              <span className="bxd-hero-meta-item">
                <i className="fas fa-phone" />{box.telefono}
              </span>
            )}
          </div>

          {/* CTA principal */}
          <button
            type="button"
            className="bxd-hero-cta"
            onClick={() => navigate(`/registro/${id}`)}
          >
            <i className="fas fa-user-plus" /> Unirme a {box.nombre}
          </button>

          {/* Redes rápidas */}
          {(box.whatsApp || box.instagram || box.facebook || box.linkMaps) && (
            <div className="bxd-hero-socials">
              {box.whatsApp && (
                <a href={`https://wa.me/${box.whatsApp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="bxd-social-btn bxd-social-btn--wa">
                  <i className="fab fa-whatsapp" />
                </a>
              )}
              {box.instagram && (
                <a href={box.instagram} target="_blank" rel="noopener noreferrer" className="bxd-social-btn bxd-social-btn--ig">
                  <i className="fab fa-instagram" />
                </a>
              )}
              {box.facebook && (
                <a href={box.facebook} target="_blank" rel="noopener noreferrer" className="bxd-social-btn bxd-social-btn--fb">
                  <i className="fab fa-facebook" />
                </a>
              )}
              {box.linkMaps && (
                <a href={box.linkMaps} target="_blank" rel="noopener noreferrer" className="bxd-social-btn bxd-social-btn--maps">
                  <i className="fas fa-directions" />
                </a>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ── CONTENT ── */}
      <section className="bxd-content" ref={contentRef}>
        <div className="bxd-content-wrap">

          {/* Sobre nosotros */}
          {box.descripcion && (
            <div className="bxd-reveal" style={{ '--bxd-delay': '0s' }}>
              <div className="bxd-card bxd-card--sobre">
                <div className="bxd-card-label"><span className="bxd-label-accent" /><span>Sobre Nosotros</span></div>
                <div className="bxd-sobre-body">
                  <div className="bxd-sobre-quote">"</div>
                  <p className="bxd-card-text">{box.descripcion}</p>
                </div>
              </div>
            </div>
          )}

          {/* Grid de 2 columnas */}
          <div className="bxd-two-col">

            {/* Contacto */}
            <div className="bxd-reveal" style={{ '--bxd-delay': '0.07s' }}>
              <div className="bxd-card">
                <div className="bxd-card-label"><span className="bxd-label-accent" /><span>Ubicación y Contacto</span></div>
                <div className="bxd-info-list">
                  {box.ubicacion && (
                    <div className="bxd-info-row">
                      <div className="bxd-info-icon-wrap bxd-info-icon-wrap--primary"><i className="fas fa-map-marker-alt" /></div>
                      <div className="bxd-info-content">
                        <span className="bxd-info-label">Dirección</span>
                        <span className="bxd-info-value">{box.ubicacion}</span>
                      </div>
                    </div>
                  )}
                  {box.telefono && (
                    <div className="bxd-info-row">
                      <div className="bxd-info-icon-wrap bxd-info-icon-wrap--cool"><i className="fas fa-phone" /></div>
                      <div className="bxd-info-content">
                        <span className="bxd-info-label">Teléfono</span>
                        <a href={`tel:${box.telefono}`} className="bxd-info-value bxd-link">{box.telefono}</a>
                      </div>
                    </div>
                  )}
                  {box.linkMaps && (
                    <div className="bxd-info-row">
                      <div className="bxd-info-icon-wrap bxd-info-icon-wrap--accent"><i className="fas fa-directions" /></div>
                      <div className="bxd-info-content">
                        <span className="bxd-info-label">Google Maps</span>
                        <a href={box.linkMaps} target="_blank" rel="noopener noreferrer" className="bxd-info-value bxd-link">
                          Ver en Maps <i className="fas fa-external-link-alt" style={{ fontSize: '0.6rem', marginLeft: '3px' }} />
                        </a>
                      </div>
                    </div>
                  )}
                  {box.instruccionesLlegada && (
                    <div className="bxd-info-row">
                      <div className="bxd-info-icon-wrap bxd-info-icon-wrap--cool"><i className="fas fa-route" /></div>
                      <div className="bxd-info-content">
                        <span className="bxd-info-label">Cómo llegar</span>
                        <span className="bxd-info-value">{box.instruccionesLlegada}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Redes + Precios Drop-In */}
            <div className="bxd-reveal" style={{ '--bxd-delay': '0.14s' }}>
              <div className="bxd-col-stack">

                {/* Redes sociales */}
                {redes.length > 0 && (
                  <div className="bxd-card">
                    <div className="bxd-card-label"><span className="bxd-label-accent" /><span>Redes Sociales</span></div>
                    <div className="bxd-redes-list">
                      {redes.map((red, i) => (
                        <a key={i} href={red.href} target="_blank" rel="noopener noreferrer" className={`bxd-red-item ${red.cls}`}>
                          <div className="bxd-red-icon-wrap"><i className={red.icon} /></div>
                          <div className="bxd-red-text">
                            <span className="bxd-red-label">{red.label}</span>
                            <span className="bxd-red-value">{red.value}</span>
                          </div>
                          <i className="fas fa-arrow-right bxd-red-arrow" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Precios Drop-In / Visita */}
                {mostrarPrecios && (
                  <div className="bxd-card bxd-card--precios">
                    <div className="bxd-card-label"><span className="bxd-label-accent bxd-label-accent--green" /><span>Visitas y Drop-In</span></div>
                    <div className="bxd-precios-grid">
                      {costoDropIn > 0 && (
                        <div className="bxd-precio-item">
                          <div className="bxd-precio-icon"><i className="fas fa-dumbbell" /></div>
                          <span className="bxd-precio-label">Drop-In por Clase</span>
                          <span className="bxd-precio-monto">${costoDropIn} <small>MXN</small></span>
                        </div>
                      )}
                      {costoVisitaGym > 0 && (
                        <div className="bxd-precio-item">
                          <div className="bxd-precio-icon bxd-precio-icon--gym"><i className="fas fa-running" /></div>
                          <span className="bxd-precio-label">Visita Suelta al Gym</span>
                          <span className="bxd-precio-monto">${costoVisitaGym} <small>MXN</small></span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>

          {/* Políticas */}
          {politicas.length > 0 && (
            <div className="bxd-reveal" style={{ '--bxd-delay': '0.21s' }}>
              <div className="bxd-card">
                <div className="bxd-card-label"><span className="bxd-label-accent" /><span>Políticas del Box</span></div>
                <div className="bxd-politicas-grid">
                  {politicas.map((pol, i) => (
                    <div key={i} className="bxd-politica-item">
                      <div className="bxd-politica-icon-wrap"><i className={pol.icon} /></div>
                      <span className="bxd-politica-label">{pol.label}</span>
                      <p className="bxd-politica-value">{pol.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Planes */}
          <div className="bxd-reveal" style={{ '--bxd-delay': '0.28s' }}>
            <div className="bxd-card">
              <div className="bxd-card-label"><span className="bxd-label-accent" /><span>Planes de Membresía</span></div>
              {planesVisibles.length > 0 ? (
                <div className="bxd-planes-grid">
                  {planesVisibles.map(p => {
                    const ahorro = calcularAhorro(p.precio, p.precioReferenciaMensual, p.diasDuracion);
                    return (
                      <div key={p.idPlan} className="wb-card">
                        <div className="wb-card-stripe" />
                        <div className="wb-card-body">
                          <p className="wb-plan-nombre">{p.nombre}</p>
                          <div className="wb-precio-row">
                            <span className="wb-precio-monto">${p.precio}</span>
                            <span className="wb-precio-periodo">/ {formatDuracion(p)}</span>
                          </div>
                          {ahorro && (
                            <span className="wb-ahorro-badge">
                              <i className="fas fa-piggy-bank" /> Ahorra ${ahorro.ahorroDinero} ({ahorro.ahorroPorcentaje}%)
                            </span>
                          )}
                          <hr className="wb-divider" />
                          <ul className="wb-features">
                            <li className="wb-feature-item">
                              <i className={`fas fa-dumbbell ${p.nivelAcceso !== 'OpenGym' ? 'text-primary' : 'text-muted'}`} />
                              {p.nivelAcceso === 'CrossFit' ? 'Clases de CrossFit' : p.nivelAcceso === 'OpenGym' ? 'Solo Open Gym' : 'CrossFit + Gym'}
                            </li>
                            <li className="wb-feature-item">
                              <i className={`fas fa-building ${p.incluyeGym ? 'text-success' : 'text-danger'}`} />
                              {p.incluyeGym ? 'Incluye Open Gym' : 'Sin Open Gym'}
                            </li>
                            <li className="wb-feature-item">
                              <i className={`fas fa-crown ${p.requiereInscripcion ? 'text-warning' : 'text-muted'}`} />
                              {p.requiereInscripcion ? 'Suma racha de lealtad' : 'Sin racha de lealtad'}
                            </li>
                            <li className="wb-feature-item">
                              <i className={`fas fa-chart-line ${p.permiteScore ? 'text-info' : 'text-danger'}`} />
                              {p.permiteScore ? 'Sube scores a la pizarra' : 'Sin acceso a pizarra'}
                            </li>
                          </ul>
                          {p.descripcionDetallada && (
                            <>
                              <hr className="wb-divider" />
                              <ul className="wb-features">
                                {p.descripcionDetallada.split('\n').filter(l => l.trim()).map((linea, i) => (
                                  <li key={i} className="wb-feature-item">
                                    <i className="fas fa-circle wb-bullet-dot" style={{ fontSize: '0.5rem', color: 'var(--primary)' }} />
                                    {linea.replace(/^[•\s]+/, '')}
                                  </li>
                                ))}
                              </ul>
                            </>
                          )}
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
      </section>
    </div>
  );
}
