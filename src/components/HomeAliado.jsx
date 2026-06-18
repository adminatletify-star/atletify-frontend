import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import './HomeAliado.css';

const COACHES = [
  { src: '/Coaches/André/IMG_9963.jpg',       name: 'André'     },
  { src: '/Coaches/Edgar/IMG_9813.jpg',        name: 'Edgar'     },
  { src: '/Coaches/Liz/IMG_9872.jpg',          name: 'Liz'       },
  { src: '/Coaches/Margarita/IMG_9887.jpg',    name: 'Margarita' },
  { src: '/Coaches/Esperanza/IMG_9936.jpg',    name: 'Esperanza' },
];

export default function HomeAliado() {
  const sectionRef = useRef(null);
  const silviaRef  = useRef(null);
  const inView      = useInView(sectionRef, { once: true, margin: '-60px' });
  const silviaInView = useInView(silviaRef, { once: true, margin: '-80px' });

  return (
    <section className="ha-section" ref={sectionRef}>

      {/* ── Fondo ── */}
      <div className="ha-bg">
        <img src="/Grupal/IMG_9766.jpg" alt="" className="ha-bg-img" loading="lazy" decoding="async" />
        <div className="ha-bg-overlay" />
        <div className="ha-bg-vignette" />
      </div>

      {/* ── Hero: animaciones 100% CSS, cero JS por frame ── */}
      <div className={`ha-hero${inView ? ' ha-hero--visible' : ''}`}>
        <div className="ha-badge ha-anim-1">
          <span className="ha-badge-dot" />
          ALIADO OFICIAL
        </div>

        <h2 className="ha-wolfpack-title ha-anim-2">
          WOLF<span className="ha-wolfpack-accent">PACK</span>
        </h2>

        <div className="ha-hero-divider ha-anim-3" />

        <p className="ha-hero-sub ha-anim-4">
          El equipo que hizo posible que Atletify existiera.
        </p>
      </div>

      {/* ── Contenido principal ── */}
      <div className="ha-main">

        <motion.div
          className="ha-text-col"
          initial={{ opacity: 0, y: 32 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        >
          <h3 className="ha-text-heading">
            Más que usuarios,<br />
            <span className="ha-text-accent">nuestros primeros creyentes.</span>
          </h3>
          <p className="ha-text-body">
            Wolfpack CrossFit fue el primer box en confiar en Atletify desde el día cero.
            Su equipo de coaches y atletas entrenó, probó y exigió la plataforma hasta
            convertirla en lo que es hoy: una herramienta real, construida desde adentro
            del box, no desde una oficina.
          </p>
          <p className="ha-text-body">
            Su retroalimentación constante, su disciplina y su mentalidad de pack fueron
            el combustible detrás de cada actualización. Wolfpack no solo usa Atletify —
            <strong> Wolfpack es parte de Atletify.</strong>
          </p>

          <a
            href="/wolfpack"
            className="ha-btn"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className="ha-btn-text">Conoce Wolfpack</span>
            <span className="ha-btn-icon">
              <i className="fas fa-arrow-right" />
            </span>
          </a>

        </motion.div>

        <motion.div
          className="ha-mosaic-col"
          initial={{ opacity: 0, y: 32 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.22, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="ha-mosaic">
            <div className="ha-mosaic-cell">
              <img src="/Grupal/IMG_9772.jpg" alt="Wolfpack grupo" loading="lazy" decoding="async" />
            </div>
            <div className="ha-mosaic-cell">
              <img src="/Grupal/IMG_9774.jpg" alt="Wolfpack grupo" loading="lazy" decoding="async" />
            </div>
            <div className="ha-mosaic-cell">
              <img src="/Grupal/IMG_9778.jpg" alt="Wolfpack grupo" loading="lazy" decoding="async" />
            </div>
            <div className="ha-mosaic-cell">
              <img src="/Grupal/IMG_9780.jpg" alt="Wolfpack grupo" loading="lazy" decoding="async" />
            </div>
          </div>
        </motion.div>

      </div>



      {/* ── Silvia — Fundadora & Dueña ── */}
      <div className="ha-silvia-section" ref={silviaRef}>

        <motion.div
          className="ha-silvia-img-col"
          initial={{ opacity: 0, x: -40 }}
          animate={silviaInView ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="ha-silvia-img-frame">
            <img src="/Coaches/Silvia/IMG_0022.jpg" alt="Coach Silvia — Dueña Wolfpack" loading="lazy" decoding="async" />
            <div className="ha-silvia-img-glow" />
          </div>
          <div className="ha-silvia-img-secondary">
            <img src="/Coaches/Silvia/IMG_0018.jpg" alt="Coach Silvia" loading="lazy" decoding="async" />
          </div>
        </motion.div>

        <motion.div
          className="ha-silvia-text-col"
          initial={{ opacity: 0, x: 40 }}
          animate={silviaInView ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.9, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="ha-silvia-badge">
            <span className="ha-silvia-badge-icon">★</span>
            DUEÑA &amp; FUNDADORA
          </div>

          <h3 className="ha-silvia-name">
            Coach<br />
            <span className="ha-silvia-name-accent">Silvia</span>
          </h3>

          <div className="ha-silvia-divider" />

          <p className="ha-silvia-bio">
            Atletify nació y creció de la mano de Silvia. Desde el primer día, su visión,
            su exigencia y su pasión por el CrossFit le dieron forma a una plataforma que
            realmente entiende lo que vive un box por dentro.
          </p>
          <p className="ha-silvia-bio">
            Como dueña de Wolfpack, Silvia no solo adoptó Atletify — lo moldeó. Cada
            funcionalidad crítica, cada flujo de trabajo y cada detalle de la plataforma
            lleva su huella. Hoy, Atletify sigue creciendo a su lado, porque ella nunca
            deja de exigir más.
          </p>

          <div className="ha-silvia-tag-row">
            <span className="ha-silvia-tag">Wolfpack CrossFit</span>
            <span className="ha-silvia-tag">Head Coach</span>
            <span className="ha-silvia-tag">Co-creadora de Atletify</span>
          </div>
        </motion.div>

      </div>

      {/* ── Coaches ── */}
      <div className="ha-coaches-section">
        <motion.h4
          className="ha-coaches-heading"
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.1 }}
        >
          El equipo detrás del pack
        </motion.h4>
        <div className="ha-coaches-grid">
          {COACHES.map((c, i) => (
            <motion.div
              key={c.name}
              className="ha-coach-card"
              initial={{ opacity: 0, y: 24 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.65, delay: 0.15 + i * 0.08 }}
            >
              <div className="ha-coach-img-wrap">
                <img src={c.src} alt={c.name} loading="lazy" decoding="async" />
                <div className="ha-coach-overlay" />
              </div>
              <span className="ha-coach-name">{c.name}</span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ── CTA final ── */}
      <motion.div
        className="ha-cta-block"
        initial={{ opacity: 0, y: 20 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.7, delay: 0.2 }}
      >
        <p className="ha-cta-text">
          "Sin el pack, no hay comunidad. Sin Wolfpack, no hay Atletify."
        </p>
        <div className="ha-cta-line" />
      </motion.div>

    </section>
  );
}
