import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import BlurText from '../components/ReactBits/BlurText';
import CountUp from '../components/ReactBits/CountUp';
import HomeStaggeredMenu from '../components/ReactBits/HomeStaggeredMenu';
import HomeWodTimeline from '../components/HomeWodTimeline';
import HomeMitosRealidad from '../components/HomeMitosRealidad';
import HomeLegendasArena from '../components/HomeLegendasArena';
import HomePricingSaaS from '../components/HomePricingSaaS';
import '../assets/css/home.css';

// Logos eliminados, ahora se usan desde public/LogosDeAtletify

// Imágenes del collage
import imgCuerdas from './img/Captura de pantalla 2026-03-26 161213.png';
import imgCrossTraining from './img/Captura de pantalla 2026-03-26 161242.png';
import imgNeumaticos from './img/Captura de pantalla 2026-03-26 161357.png';
import imgImg4 from './img/Captura de pantalla 2026-03-26 161433.png';
import imgImg5 from './img/Captura de pantalla 2026-03-26 161518.png';

// ── WODs famosos ──────────────────────────────────────────────
const WODS_FAMOSOS = [
  {
    nombre: 'FRAN',
    tipo: 'girl',
    descripcion: '21-15-9 reps',
    ejercicios: ['Thrusters (43 kg / 30 kg)', 'Pull-ups'],
    objetivo: 'Tiempo',
    intensidad: 'Extrema',
    icono: 'fas fa-bolt',
    color: '#E63946',
  },
  {
    nombre: 'MURPH',
    tipo: 'heroe',
    descripcion: 'Completar en orden',
    ejercicios: ['1 milla corriendo', '100 Pull-ups', '200 Push-ups', '300 Air Squats', '1 milla corriendo'],
    objetivo: 'Tiempo (con chaleco 20 lb)',
    intensidad: 'Brutal',
    icono: 'fas fa-shield-alt',
    color: '#F5A623',
  },
  {
    nombre: 'ANNIE',
    tipo: 'girl',
    descripcion: '50-40-30-20-10 reps',
    ejercicios: ['Double-unders', 'Sit-ups'],
    objetivo: 'Tiempo',
    intensidad: 'Alta',
    icono: 'fas fa-fire',
    color: '#4FC3F7',
  },
  {
    nombre: 'CINDY',
    tipo: 'girl',
    descripcion: 'AMRAP — 20 minutos',
    ejercicios: ['5 Pull-ups', '10 Push-ups', '15 Air Squats'],
    objetivo: 'Máximas rondas',
    intensidad: 'Moderada-Alta',
    icono: 'fas fa-infinity',
    color: '#2ECC71',
  },
];

// ── Glosario del Box ──────────────────────────────────────────
const GLOSARIO = [
  {
    termino: 'WOD',
    definicion: 'Workout Of the Day — El entrenamiento del día, diseñado para maximizar la intensidad en cada sesión.',
    icono: 'fas fa-calendar-day',
  },
  {
    termino: 'BOX',
    definicion: 'El nombre del gimnasio CrossFit. Un espacio funcional sin máquinas de aislamiento, construido para el movimiento humano real.',
    icono: 'fas fa-warehouse',
  },
  {
    termino: 'PR',
    definicion: 'Personal Record — Tu mejor marca en un levantamiento o WOD. El objetivo siempre es superarlo.',
    icono: 'fas fa-trophy',
  },
  {
    termino: 'AMRAP',
    definicion: 'As Many Rounds As Possible — El máximo de rondas que puedes completar en el tiempo dado.',
    icono: 'fas fa-redo',
  },
  {
    termino: 'RFT',
    definicion: 'Rounds For Time — Completar un número fijo de rondas lo más rápido posible.',
    icono: 'fas fa-stopwatch',
  },
  {
    termino: 'EMOM',
    definicion: 'Every Minute On the Minute — Ejecutar un ejercicio al inicio de cada minuto. La intensidad la decides tú.',
    icono: 'fas fa-clock',
  },
];

const COLLAGE_IMAGES = [imgCuerdas, imgCrossTraining, imgNeumaticos, imgImg4, imgImg5];

// ── Variante de animación para secciones ─────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7 } },
};

export default function Home() {
  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  const [user, setUser] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);


  // ── Efectos globales ──────────────────────────────────────
  useEffect(() => {
    const u = localStorage.getItem('usuario');
    if (u) setUser(JSON.parse(u));
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen]);

  const handleProfileClick = (e) => {
    e.stopPropagation();
    if (user) {
      const route = user.rol === 'Developer' ? '/dashboard'
        : user.rol === 'Atleta' || user.rol === 'Usuario' ? '/user-panel'
          : '/admin-box-panel';
      navigate(route);
    } else {
      setDropdownOpen(!dropdownOpen);
    }
  };

  return (
    <div className="home-wrapper">

      {/* ── STAGGERED MENU ─────────────────────────────────── */}
      <HomeStaggeredMenu
        user={user}
        dropdownOpen={dropdownOpen}
        setDropdownOpen={setDropdownOpen}
        handleProfileClick={handleProfileClick}
        dropdownRef={dropdownRef}
      />

      {/* ── NAVBAR ─────────────────────────────────────────── */}
      <nav className="navbar navbar-dark fixed-top home-navbar">
        <div className="container-fluid px-4">
          <Link to="/" className="navbar-brand d-flex align-items-center">
            <img src="/LogosDeAtletify/LogoBlanco.png" alt="Atletify System" className="navbar-logo-img" />
          </Link>
        </div>
      </nav>

      {/* ══════════════════════════════════════════════════════
          SECCIÓN HERO — COLLAGE ESTÁTICO
          ══════════════════════════════════════════════════════ */}
      <div className="hero-scroll-container">
        <div className="hero-sticky-layer">

          {/* Collage de imágenes */}
          <div className="collage-grid">
            {COLLAGE_IMAGES.map((src, i) => (
              <div
                key={i}
                className={`collage-cell collage-cell--${i + 1}`}
              >
                <img src={src} alt={`CrossFit acción ${i + 1}`} className="collage-img" />
                <div className="collage-cell-overlay" />
              </div>
            ))}
          </div>

          {/* Overlay de contraste global */}
          <div className="collage-master-overlay" />

          {/* Tagline */}
          <motion.div
            className="hero-tagline-wrapper"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.3 }}
          >
            {/* Logo hero */}
            <motion.div
              className="hero-logo-block"
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.9, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            >
              <img src="/LogosDeAtletify/LogoBlanco.png" alt="Atletify System" className="hero-logo-icono" />
              <p className="hero-brand-name">
                <span className="hero-brand-letra-roja">A</span>tletify{' '}
                <span className="hero-brand-letra-roja">S</span>ystem
              </p>
            </motion.div>

            <BlurText
              text="¿Listo  para  la  aventura?"
              className="hero-title"
              delay={0.08}
              direction="bottom"
            />
            <p className="hero-subtitle">Tu plataforma de gestión deportiva</p>
            <div className="hero-scroll-hint">
              <span>Scroll</span>
              <i className="fas fa-chevron-down"></i>
            </div>
          </motion.div>

        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          CROSSFIT REVEAL — debajo del collage
          ══════════════════════════════════════════════════════ */}
      <section className="crossfit-reveal-seccion">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, scale: 0.82, y: 60 }}
          whileInView={{ opacity: 1, scale: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className="crossfit-text">CROSSFIT</span>
          <span className="crossfit-sub d-block mt-3">El estándar de la élite</span>
        </motion.div>
      </section>

      {/* ══════════════════════════════════════════════════════
          SECCIÓN NARRATIVA — THE STORY
          ══════════════════════════════════════════════════════ */}
      <section className="narrativa-seccion">
        <div className="container">
          <div className="row align-items-center g-5">

            {/* Texto */}
            <div className="col-lg-6">
              <motion.div
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.3 }}
              >
                <span className="narrativa-tag">El Origen</span>
                <h2 className="narrativa-titulo">
                  No es un deporte.<br />
                  <span className="text-danger">Es una filosofía.</span>
                </h2>
                <p className="narrativa-texto">
                  En 2000, Greg Glassman tenía una idea radical: la aptitud física no debe medirse por
                  la apariencia, sino por la capacidad real de responder a cualquier demanda del mundo.
                  Correr, cargar, saltar, empujar, halar. Dominar el cuerpo en todos sus planos.
                </p>
                <p className="narrativa-texto">
                  Nació así el CrossFit: un sistema de entrenamiento constantemente variado, de alta
                  intensidad y movimientos funcionales. No hay rutinas fijas. No hay zonas de confort.
                  Cada sesión es un reto distinto que forja atletas completos, capaces de cualquier cosa.
                </p>
                <p className="narrativa-texto">
                  Hoy, millones de personas en todo el mundo comparten el mismo ardor, la misma comunidad,
                  el mismo grito al terminar un WOD. Eso no es gimnasio. Eso es un estilo de vida.
                </p>
              </motion.div>
            </div>

            {/* Visual / Stats */}
            <div className="col-lg-6">
              <motion.div
                className="narrativa-visual"
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.3 }}
                transition={{ delay: 0.2 }}
              >
                <div className="narrativa-stats-grid">
                  <div className="narrativa-stat">
                    <span className="narrativa-stat-num">
                      <CountUp to={15000} duration={2.5} separator="," suffix="+" />
                    </span>
                    <span className="narrativa-stat-label">Boxes en el mundo</span>
                  </div>
                  <div className="narrativa-stat">
                    <span className="narrativa-stat-num">
                      <CountUp to={4} duration={1.5} suffix="M+" />
                    </span>
                    <span className="narrativa-stat-label">Atletas activos</span>
                  </div>
                  <div className="narrativa-stat narrativa-stat--full">
                    <span className="narrativa-stat-num">
                      <CountUp to={2000} duration={2} separator="" />
                    </span>
                    <span className="narrativa-stat-label">Año de fundación · Santa Cruz, CA</span>
                  </div>
                </div>

                <div className="narrativa-pilares">
                  <div className="narrativa-pilar">
                    <i className="fas fa-sync-alt"></i>
                    <span>Variado</span>
                  </div>
                  <div className="narrativa-pilar">
                    <i className="fas fa-bolt"></i>
                    <span>Alta Intensidad</span>
                  </div>
                  <div className="narrativa-pilar">
                    <i className="fas fa-running"></i>
                    <span>Funcional</span>
                  </div>
                </div>
              </motion.div>
            </div>

          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          SECCIÓN WODs LEGENDARIOS
          ══════════════════════════════════════════════════════ */}
      <section className="wods-seccion">
        <div className="container">

          <motion.div
            className="text-center mb-5"
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.4 }}
          >
            <span className="seccion-tag">Los Legendarios</span>
            <h2 className="seccion-titulo">
              WODs que <span className="text-danger">Definen Límites</span>
            </h2>
            <p className="seccion-subtitulo">
              Las Chicas y los Héroes son benchmarks que ponen a prueba tu verdadero nivel
            </p>
          </motion.div>

          <div className="row g-4">
            {WODS_FAMOSOS.map((wod, i) => (
              <div key={wod.nombre} className="col-md-6 col-lg-3">
                <motion.div
                  className="wod-card"
                  style={{ '--wod-color': wod.color }}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                >
                  <div className="wod-card-header">
                    <div className="wod-icono">
                      <i className={wod.icono}></i>
                    </div>
                    <span className={`wod-tipo wod-tipo--${wod.tipo}`}>
                      {wod.tipo === 'girl' ? '♀ The Girls' : '☆ Hero WOD'}
                    </span>
                  </div>

                  <div className="wod-card-body">
                    <h3 className="wod-nombre">{wod.nombre}</h3>
                    <p className="wod-descripcion">{wod.descripcion}</p>

                    <ul className="wod-ejercicios">
                      {wod.ejercicios.map((ej, idx) => (
                        <li key={idx}>
                          <i className="fas fa-check-circle"></i>
                          {ej}
                        </li>
                      ))}
                    </ul>

                    <div className="wod-meta">
                      <span className="wod-objetivo">
                        <i className="fas fa-flag"></i> {wod.objetivo}
                      </span>
                      <span className="wod-intensidad">
                        <i className="fas fa-fire"></i> {wod.intensidad}
                      </span>
                    </div>
                  </div>

                  <div className="wod-card-glow" />
                </motion.div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          SECCIÓN GLOSARIO DEL BOX
          ══════════════════════════════════════════════════════ */}
      <section className="glosario-seccion">
        <div className="container">

          <motion.div
            className="text-center mb-5"
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.4 }}
          >
            <span className="seccion-tag">Aprende el idioma</span>
            <h2 className="seccion-titulo">
              El <span className="text-danger">Diccionario</span> del Box
            </h2>
          </motion.div>

          <div className="row g-3">
            {GLOSARIO.map((item, i) => (
              <div key={item.termino} className="col-md-6 col-lg-4">
                <motion.div
                  className="glosario-card"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.25 }}
                  transition={{ duration: 0.4, delay: i * 0.07 }}
                >
                  <div className="glosario-icono">
                    <i className={item.icono}></i>
                  </div>
                  <div className="glosario-contenido">
                    <h4 className="glosario-termino">{item.termino}</h4>
                    <p className="glosario-def">{item.definicion}</p>
                  </div>
                </motion.div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          SECCIÓN ANATOMÍA DE UN WOD — LÍNEA DE TIEMPO
          ══════════════════════════════════════════════════════ */}
      <HomeWodTimeline />

      {/* ══════════════════════════════════════════════════════
          SECCIÓN MITOS VS. REALIDAD — TARJETAS INTERACTIVAS
          ══════════════════════════════════════════════════════ */}
      <HomeMitosRealidad />

      {/* ══════════════════════════════════════════════════════
          SECCIÓN LEYENDAS DE LA ARENA — ORIGEN DE LOS WODs
          ══════════════════════════════════════════════════════ */}
      <HomeLegendasArena />

      {/* ══════════════════════════════════════════════════════
          SECCIÓN PRECIOS SAAS B2B
          ══════════════════════════════════════════════════════ */}
      <HomePricingSaaS />

      {/* ══════════════════════════════════════════════════════
          SECCIÓN CTA — LLAMADA A LA ACCIÓN
          ══════════════════════════════════════════════════════ */}
      <section className="cta-seccion">
        <div className="container position-relative">
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.7 }}
          >
            <div className="cta-logo-banner">
        <img
          src="/LogosDeAtletify/LogoBlanco.png"
          alt="Atletify Logo"
          className="cta-logo-banner-img"
        />    </div>

            <h2 className="cta-titulo">
              ¡Únete hoy y<br />
              <span className="text-danger">transforma tu rendimiento!</span>
            </h2>

            <p className="cta-subtitulo">
              Tu primer WOD te espera. La comunidad te espera.<br />
              Tu mejor versión te espera.
            </p>

            <div className="cta-botones">
              <Link to="/login" className="btn cta-btn-principal">
                <i className="fas fa-user-plus me-2"></i>
                Empieza Hoy
              </Link>
              <Link to="/login" className="btn cta-btn-secundario">
                <i className="fas fa-sign-in-alt me-2"></i>
                Iniciar Sesión
              </Link>
            </div>

            <p className="cta-nota">Sin excusas. Solo resultados.</p>
          </motion.div>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────── */}
      <footer className="home-footer">
        <div className="container text-center py-4">
          <div className="footer-logo-wrapper mb-2">
            <img src="/LogosDeAtletify/LogoBlanco.png" alt="Atletify System" className="footer-logo-icono" />
            <span className="footer-brand-name fw-bold ms-2">
              <span className="text-danger">A</span>tletify{' '}
              <span className="text-danger">S</span>ystem
            </span>
            <span className="text-secondary ms-2">&copy; {new Date().getFullYear()}</span>
          </div>
          <p className="text-secondary small mb-3">El límite lo pones tú.</p>
          <div className="footer-legal-links d-flex justify-content-center gap-3">
            <Link to="/terminos" className="text-secondary small text-decoration-none hover-white transition-all">Términos y Condiciones</Link>
            <span className="text-secondary small">|</span>
            <Link to="/politica-cookies" className="text-secondary small text-decoration-none hover-white transition-all">Política de Cookies</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
