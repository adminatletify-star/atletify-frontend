import { useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import logoWolfpack from './Wolfpack/logo.jpg';
import '../assets/css/WolfPackPage.css';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.5, delay: i * 0.06, ease: [0.4, 0, 0.2, 1] }
  })
};

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.9 } }
};

function AnimSection({ children, className = '' }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <div ref={ref} className={className}>
      {inView ? children : <div style={{ visibility: 'hidden' }}>{children}</div>}
    </div>
  );
}

function CoachCarousel({ fotos, nombre, color }) {
  const [idx, setIdx] = useState(0);
  const touchStartX = useRef(null);

  function goTo(newIdx) {
    setIdx(Math.max(0, Math.min(newIdx, fotos.length - 1)));
  }

  function onTouchStart(e) {
    touchStartX.current = e.touches[0].clientX;
  }

  function onTouchEnd(e) {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) goTo(diff > 0 ? idx + 1 : idx - 1);
    touchStartX.current = null;
  }

  return (
    <div className="wp-cc-wrap" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <div
        className="wp-cc-track"
        style={{ transform: `translateX(-${idx * 100}%)`, transition: 'transform 0.35s cubic-bezier(0.4,0,0.2,1)' }}
      >
        {fotos.map((src, i) => (
          <div key={i} className="wp-cc-slide">
            {Math.abs(i - idx) <= 1 && (
              <img src={src} alt={`${nombre} ${i + 1}`} draggable={false} loading="lazy" decoding="async" />
            )}
          </div>
        ))}
      </div>

      {fotos.length > 1 && (
        <div className="wp-cc-dots">
          {fotos.map((_, i) => (
            <button
              key={i}
              className={`wp-cc-dot${i === idx ? ' on' : ''}`}
              style={i === idx ? { background: color, width: '18px' } : {}}
              onClick={() => goTo(i)}
              aria-label={`Foto ${i + 1}`}
            />
          ))}
        </div>
      )}

      {idx > 0 && (
        <button className="wp-cc-arrow wp-cc-arrow--prev" onClick={() => goTo(idx - 1)}>
          <i className="fas fa-chevron-left" />
        </button>
      )}
      {idx < fotos.length - 1 && (
        <button className="wp-cc-arrow wp-cc-arrow--next" onClick={() => goTo(idx + 1)}>
          <i className="fas fa-chevron-right" />
        </button>
      )}
    </div>
  );
}

// ─── SILVIA ───────────────────────────────────────────────────────────────────
const SILVIA = {
  nombre: 'Coach Silvia',
  titulo: 'Fundadora · Head Coach',
  bio: [
    'Hace varios años, Silvia tomó una decisión que cambiaría no solo su vida, sino la de decenas de atletas: fundó The Wolf Pack con la visión de crear algo más que un gym — una comunidad donde cada persona, sin importar su nivel, pudiera descubrir lo que realmente es capaz de lograr.',
    'Con años de experiencia en CrossFit y múltiples disciplinas, Silvia ha formado a cientos de atletas y llevado al box a competir a nivel nacional. Su metodología combina técnica de élite con una mentalidad de crecimiento que transforma a cada atleta desde adentro.',
  ],
  especialidades: [
    { icono: 'fas fa-dumbbell', texto: 'CrossFit Certified' },
    { icono: 'fas fa-weight-hanging', texto: 'Olympic Weightlifting' },
    { icono: 'fas fa-running', texto: 'Gymnastics & Skills' },
    { icono: 'fas fa-heartbeat', texto: 'Nutrición Deportiva' },
    { icono: 'fas fa-medal', texto: 'Competition Prep' },
    { icono: 'fas fa-brain', texto: 'Mindset Coaching' },
  ],
  cita: '"Cada atleta llega con una historia distinta. Mi trabajo es ayudarte a escribir el próximo capítulo — el más fuerte de todos."',
  fotos: [
    '/Coaches/Silvia/IMG_9845.jpg',
    '/Coaches/Silvia/IMG_9833.jpg',
    '/Coaches/Silvia/IMG_9824.jpg',
    '/Coaches/Silvia/IMG_0010.jpg',
    '/Coaches/Silvia/IMG_9818.jpg',
    '/Coaches/Silvia/IMG_9841.jpg',
  ],
  heroBg: '/Coaches/Silvia/IMG_9839.jpg',
};

// ─── COACHES ──────────────────────────────────────────────────────────────────
const COACHES = [
  {
    nombre: 'André',
    rol: 'Coach',
    fotos: [
      '/Coaches/André/IMG_9992.jpg',
      '/Coaches/André/IMG_9990.jpg',
      '/Coaches/André/IMG_9987.jpg',
      '/Coaches/André/IMG_0007.jpg',
      '/Coaches/André/IMG_0004.jpg',
    ],
    especialidades: ['CrossFit', 'Strength & Conditioning', 'Weightlifting'],
    mensaje: '[ Texto escrito por André — su motivación, filosofía de entrenamiento y lo que lo apasiona de ser parte de WolfPack. ]',
    color: '#E63946',
  },
  {
    nombre: 'Edgar',
    rol: 'Coach',
    fotos: [
      '/Coaches/Edgar/IMG_9813.jpg',
      '/Coaches/Edgar/IMG_9806.jpg',
      '/Coaches/Edgar/IMG_9800.jpg',
      '/Coaches/Edgar/IMG_9814.jpg',
    ],
    especialidades: ['CrossFit', 'Endurance', 'Mobility'],
    mensaje: '[ Texto escrito por Edgar — su motivación, filosofía de entrenamiento y lo que lo apasiona de ser parte de WolfPack. ]',
    color: '#F5A623',
  },
  {
    nombre: 'Esperanza',
    rol: 'Coach',
    fotos: [
      '/Coaches/Esperanza/IMG_9936.jpg',
      '/Coaches/Esperanza/IMG_9929.jpg',
      '/Coaches/Esperanza/IMG_9939.jpg',
      '/Coaches/Esperanza/IMG_9943.jpg',
      '/Coaches/Esperanza/IMG_9933.jpg',
    ],
    especialidades: ['CrossFit', 'Gymnastics', 'Foundations'],
    mensaje: '[ Texto escrito por Esperanza — su motivación, filosofía de entrenamiento y lo que la apasiona de ser parte de WolfPack. ]',
    color: '#4FC3F7',
  },
  {
    nombre: 'Liz',
    rol: 'Coach',
    fotos: [
      '/Coaches/Liz/IMG_9850.jpg',
      '/Coaches/Liz/IMG_9860.jpg',
      '/Coaches/Liz/IMG_9872.jpg',
      '/Coaches/Liz/IMG_9873.jpg',
      '/Coaches/Liz/IMG_9853.jpg',
    ],
    especialidades: ['CrossFit', 'Nutrition', 'Beginner Programs'],
    mensaje: '[ Texto escrito por Liz — su motivación, filosofía de entrenamiento y lo que la apasiona de ser parte de WolfPack. ]',
    color: '#A855F7',
  },
  {
    nombre: 'Margarita',
    rol: 'Coach',
    fotos: [
      '/Coaches/Margarita/IMG_9892.jpg',
      '/Coaches/Margarita/IMG_9896.jpg',
      '/Coaches/Margarita/IMG_9908.jpg',
      '/Coaches/Margarita/IMG_9914.jpg',
      '/Coaches/Margarita/IMG_9924.jpg',
    ],
    especialidades: ['CrossFit', 'Olympic Lifting', 'Competition'],
    mensaje: '[ Texto escrito por Margarita — su motivación, filosofía de entrenamiento y lo que la apasiona de ser parte de WolfPack. ]',
    color: '#10B981',
  },
];

// ─── BOX GALLERY ──────────────────────────────────────────────────────────────
const BOX_FOTOS = [
  '/Box interno/IMG_0025.jpg',
  '/Box interno/IMG_0027.jpg',
  '/Box interno/IMG_0029.jpg',
  '/Box interno/IMG_0030.jpg',
  '/Box interno/IMG_0031.jpg',
  '/Box interno/IMG_0032.jpg',
  '/Box interno/IMG_0034.jpg',
  '/Box interno/IMG_0036.jpg',
  '/Box interno/IMG_0038.jpg',
  '/Grupal/IMG_9766.jpg',
  '/Grupal/IMG_9772.jpg',
  '/Grupal/IMG_9784.jpg',
];

export default function WolfPackPage() {
  const heroRef = useRef(null);
  const heroInView = useInView(heroRef, { once: true });
  const [activeCoach, setActiveCoach] = useState(null);

  return (
    <div className="wp-page">

      {/* ══════════════════════ HERO ══════════════════════════════ */}
      <section className="wp-hero" ref={heroRef}>
        {/* Fondo fotográfico */}
        <div className="wp-hero-bg">
          <img src="/Grupal/IMG_9780.jpg" alt="" className="wp-hero-bg-img" />
          <div className="wp-hero-bg-overlay" />
        </div>

        {/* Franja superior */}
        <motion.div
          className="wp-hero-topbar"
          initial={{ opacity: 0, y: -20 }}
          animate={heroInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.3 }}
        >
          <span>Cross Training</span>
          <span className="wp-hero-topbar-dot" />
          <span>Todos los niveles</span>
          <span className="wp-hero-topbar-dot" />
          <span>Comunidad</span>
        </motion.div>

        {/* Contenido central — logo izquierda / texto derecha */}
        <div className="wp-hero-center container">

          {/* Logo — lado izquierdo */}
          <motion.div
            className="wp-hero-logo-side"
            initial={{ opacity: 0, scale: 0.6, x: -50 }}
            animate={heroInView ? { opacity: 1, scale: 1, x: 0 } : {}}
            transition={{ duration: 0.9, delay: 0.35, ease: [0.34, 1.2, 0.64, 1] }}
          >
            <img src={logoWolfpack} alt="The Wolf Pack" />
          </motion.div>

          {/* Texto — lado derecho */}
          <div className="wp-hero-text-side">

            <div className="wp-hero-title-block">
              <motion.span
                className="wp-hero-t-the"
                initial={{ opacity: 0, x: 30 }}
                animate={heroInView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.6, delay: 0.55 }}
              >
                THE
              </motion.span>

              <motion.div
                className="wp-hero-t-wolf-wrap"
                initial={{ opacity: 0, y: 25 }}
                animate={heroInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.65, delay: 0.67 }}
              >
                <span className="wp-hero-t-wolf">WOLF</span>
              </motion.div>

              <motion.div
                className="wp-hero-t-pack-wrap"
                initial={{ opacity: 0, y: 25 }}
                animate={heroInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.65, delay: 0.79 }}
              >
                <span className="wp-hero-t-pack">PACK</span>
              </motion.div>
            </div>

            <motion.div
              className="wp-hero-rule"
              initial={{ scaleX: 0 }}
              animate={heroInView ? { scaleX: 1 } : {}}
              transition={{ duration: 0.8, delay: 0.95 }}
            />

            <motion.p
              className="wp-hero-tagline"
              initial={{ opacity: 0 }}
              animate={heroInView ? { opacity: 1 } : {}}
              transition={{ duration: 0.8, delay: 1.08 }}
            >
              Entrena duro · Confía en el proceso · <em>Rompe límites</em>
            </motion.p>

          </div>
        </div>

        {/* Franja inferior con valores */}
        <motion.div
          className="wp-hero-bottombar"
          initial={{ opacity: 0, y: 30 }}
          animate={heroInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, delay: 1.3 }}
        >
          <div className="wp-hero-val">
            <i className="fas fa-fire" />
            <span>Disciplina</span>
          </div>
          <div className="wp-hero-val-sep" />
          <div className="wp-hero-val">
            <i className="fas fa-users" />
            <span>Comunidad</span>
          </div>
          <div className="wp-hero-val-sep" />
          <div className="wp-hero-val">
            <i className="fas fa-trophy" />
            <span>Resultados</span>
          </div>
        </motion.div>
      </section>

      {/* ══════════════════════ SILVIA ════════════════════════════ */}
      <section className="wp-silvia-section">

        {/* Banner de presentación */}
        <div className="wp-silvia-banner">
          <img src={SILVIA.heroBg} alt="Coach Silvia" className="wp-silvia-banner-img" />
          <div className="wp-silvia-banner-overlay" />
          <div className="container position-relative" style={{ zIndex: 2 }}>
            <AnimSection>
              <motion.div
                className="wp-silvia-banner-content"
                variants={fadeUp}
                initial="hidden"
                animate="visible"
              >
                <span className="wp-stag wp-stag--gold">La Fundadora</span>
                <h2 className="wp-silvia-banner-title">
                  La Visionaria Detrás<br />de <span>La Manada</span>
                </h2>
                <p className="wp-silvia-banner-sub">{SILVIA.titulo}</p>
              </motion.div>
            </AnimSection>
          </div>
        </div>

        {/* Bio + collage */}
        <div className="wp-silvia-body">
          <div className="container">
            <div className="row g-0 align-items-stretch">

              {/* Collage de fotos */}
              <div className="col-12 col-lg-5 order-lg-1 order-2">
                <AnimSection>
                  <motion.div
                    className="wp-silvia-collage"
                    variants={fadeIn}
                    initial="hidden"
                    animate="visible"
                  >
                    <div className="wp-silvia-photo-hero">
                      <img src={SILVIA.fotos[0]} alt="Coach Silvia" />
                      <div className="wp-silvia-photo-hero-badge">
                        <i className="fas fa-star" /> Head Coach
                      </div>
                    </div>
                    <div className="wp-silvia-photo-row">
                      {SILVIA.fotos.slice(1, 4).map((src, i) => (
                        <div key={i} className="wp-silvia-photo-sm">
                          <img src={src} alt={`Coach Silvia ${i + 2}`} />
                        </div>
                      ))}
                    </div>
                  </motion.div>
                </AnimSection>
              </div>

              {/* Texto bio */}
              <div className="col-12 col-lg-7 order-lg-2 order-1">
                <AnimSection>
                  <motion.div
                    className="wp-silvia-bio"
                    variants={fadeUp}
                    initial="hidden"
                    animate="visible"
                  >
                    <span className="wp-stag wp-stag--red">Su Historia</span>
                    <h3 className="wp-silvia-nombre">{SILVIA.nombre}</h3>
                    <p className="wp-silvia-rol">{SILVIA.titulo}</p>

                    {SILVIA.bio.map((p, i) => (
                      <p key={i} className="wp-silvia-texto">{p}</p>
                    ))}

                    <div className="wp-silvia-esp-wrap">
                      <p className="wp-silvia-esp-label">Especialidades</p>
                      <div className="wp-silvia-esp-grid">
                        {SILVIA.especialidades.map((esp, i) => (
                          <motion.div
                            key={i}
                            className="wp-silvia-esp-chip"
                            variants={fadeUp}
                            initial="hidden"
                            animate="visible"
                            custom={i * 0.6}
                          >
                            <i className={esp.icono} />
                            <span>{esp.texto}</span>
                          </motion.div>
                        ))}
                      </div>
                    </div>

                    <blockquote className="wp-silvia-quote">
                      <i className="fas fa-quote-left wp-quote-icon" />
                      <span>{SILVIA.cita}</span>
                    </blockquote>
                  </motion.div>
                </AnimSection>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════ COACHES ══════════════════════════ */}
      <section className="wp-coaches-section">
        <div className="container">
          <motion.div
            className="text-center mb-5"
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
          >
            <span className="wp-stag wp-stag--red">Nuestro Equipo</span>
            <h2 className="wp-section-titulo">
              Los Coaches que te{' '}
              <span>llevan al siguiente nivel</span>
            </h2>
            <p className="wp-section-sub">
              Cada uno con una historia, una especialidad y una pasión genuina
              por transformar vidas a través del movimiento.
            </p>
          </motion.div>

          <div className="row g-4 justify-content-center">
            {COACHES.map((coach, i) => (
              <div className="col-12 col-sm-6 col-xl-4" key={coach.nombre}>
                <motion.div
                  className={`wp-coach-card${activeCoach === i ? ' is-open' : ''}`}
                  style={{ '--cc': coach.color }}
                  variants={fadeUp}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: '-80px' }}
                  custom={i}
                >
                    {/* Carrusel de fotos */}
                    <div className="wp-coach-photo-wrap">
                      <CoachCarousel
                        fotos={coach.fotos}
                        nombre={coach.nombre}
                        color={coach.color}
                      />
                      <div className="wp-coach-photo-tags">
                        {coach.especialidades.slice(0, 2).map((e, j) => (
                          <span key={j} className="wp-coach-ptag">{e}</span>
                        ))}
                      </div>
                    </div>

                    {/* Info */}
                    <div className="wp-coach-body">
                      <div
                        className="wp-coach-header"
                        onClick={() =>
                          setActiveCoach(activeCoach === i ? null : i)
                        }
                        role="button"
                        tabIndex={0}
                        onKeyDown={e =>
                          e.key === 'Enter' &&
                          setActiveCoach(activeCoach === i ? null : i)
                        }
                      >
                        <div className="wp-coach-nameblock">
                          <h4 className="wp-coach-nombre">{coach.nombre}</h4>
                          <p className="wp-coach-rol">{coach.rol}</p>
                        </div>
                        <button
                          className="wp-coach-toggle"
                          aria-label="Ver más"
                          onClick={e => {
                            e.stopPropagation();
                            setActiveCoach(activeCoach === i ? null : i);
                          }}
                        >
                          <i
                            className={`fas fa-${activeCoach === i ? 'minus' : 'plus'}`}
                          />
                        </button>
                      </div>

                      <div
                        className={`wp-coach-expand${activeCoach === i ? ' open' : ''}`}
                      >
                        <p className="wp-coach-mensaje">{coach.mensaje}</p>
                        <div className="wp-coach-chips">
                          {coach.especialidades.map((e, j) => (
                            <span key={j} className="wp-coach-chip">{e}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                </motion.div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════ EL BOX ════════════════════════════ */}
      <section className="wp-box-section">
        <div className="container">
          <AnimSection>
            <motion.div
              className="text-center mb-5"
              variants={fadeUp}
              initial="hidden"
              animate="visible"
            >
              <span className="wp-stag wp-stag--gold">Nuestras Instalaciones</span>
              <h2 className="wp-section-titulo">
                El Box donde nacen<br className="d-none d-md-block" /> los{' '}
                <span>campeones</span>
              </h2>
              <p className="wp-section-sub">
                Un espacio diseñado para sacar lo mejor de ti. Equipamiento de
                primer nivel, ambiente inigualable y una energía que sientes
                desde que entras.
              </p>
            </motion.div>
          </AnimSection>

          <div className="wp-box-grid">
            {BOX_FOTOS.map((src, i) => (
              <AnimSection key={i}>
                <motion.div
                  className={`wp-box-cell wp-box-cell--${i + 1}`}
                  variants={fadeUp}
                  initial="hidden"
                  animate="visible"
                  custom={i * 0.4}
                >
                  <img src={src} alt={`WolfPack Box ${i + 1}`} />
                  <div className="wp-box-cell-overlay" />
                </motion.div>
              </AnimSection>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════ FOOTER ════════════════════════════ */}
      <footer className="wp-footer">
        <div className="container">
          <div className="row g-0 align-items-start wp-footer-row">

            {/* Columna: marca */}
            <div className="col-12 col-md-4 wp-footer-brand">
              <img src={logoWolfpack} alt="The Wolf Pack" className="wp-footer-logo" />
              <div className="wp-footer-brand-text">
                <span className="wp-footer-name">The Wolf Pack</span>
                <span className="wp-footer-tagline">Cross Training Box</span>
              </div>
            </div>

            {/* Columna: ubicación */}
            <div className="col-12 col-md-4 wp-footer-col">
              <p className="wp-footer-col-title">
                <i className="fas fa-map-marker-alt" /> Ubicación
              </p>
              <p className="wp-footer-addr">
                Encuéntranos en nuestra sede.<br />
                Abre Google Maps para ver la ruta.
              </p>
              <a
                href="https://maps.app.goo.gl/8myTn2wN3VVRjPNj6?g_st=ic"
                target="_blank"
                rel="noopener noreferrer"
                className="wp-footer-map-btn"
              >
                <i className="fas fa-directions" /> Cómo llegar
              </a>
            </div>

            {/* Columna: redes */}
            <div className="col-12 col-md-4 wp-footer-col">
              <p className="wp-footer-col-title">
                <i className="fas fa-share-nodes" /> Redes Sociales
              </p>
              <div className="wp-footer-social-links">
                <a
                  href="https://www.facebook.com/TheWolfPackFunctionalTraining"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="wp-footer-slink wp-footer-slink--fb"
                >
                  <div className="wp-footer-slink-icon">
                    <i className="fab fa-facebook-f" />
                  </div>
                  <div className="wp-footer-slink-text">
                    <span className="wp-footer-slink-name">Facebook</span>
                    <span className="wp-footer-slink-handle">The Wolf Pack</span>
                  </div>
                  <i className="fas fa-chevron-right wp-footer-slink-arr" />
                </a>

                <a
                  href="https://www.instagram.com/thewolfpackcrossfit/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="wp-footer-slink wp-footer-slink--ig"
                >
                  <div className="wp-footer-slink-icon">
                    <i className="fab fa-instagram" />
                  </div>
                  <div className="wp-footer-slink-text">
                    <span className="wp-footer-slink-name">Instagram</span>
                    <span className="wp-footer-slink-handle">@thewolfpackcrossfit</span>
                  </div>
                  <i className="fas fa-chevron-right wp-footer-slink-arr" />
                </a>
              </div>
            </div>

          </div>

          {/* Barra inferior */}
          <div className="wp-footer-bottom">
            <span>© {new Date().getFullYear()} The Wolf Pack · Todos los derechos reservados</span>
            <span className="wp-footer-bottom-tag">Cross Training Box</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
