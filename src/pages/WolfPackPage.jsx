import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import logoWolfpack from './Wolfpack/logo.jpg';
import imgComunidad from './Wolfpack/img1.png';
import imgFamilia from './Wolfpack/img2.png';
import '../assets/css/WolfPackPage.css';

const VALORES = [
  {
    titulo: 'Disciplina',
    icono: 'fas fa-fire',
    color: '#E63946',
    texto: 'Cada repetición cuenta, cada gota de sudor te acerca a tu mejor versión. Aquí no existen atajos — solo trabajo duro y constancia.',
    cita: '"El dolor de hoy es la fuerza de mañana."'
  },
  {
    titulo: 'Comunidad',
    icono: 'fas fa-users',
    color: '#F5A623',
    texto: 'No entrenas solo. Entrenas con una manada que te empuja, te motiva y celebra cada logro contigo. Somos familia.',
    cita: '"Juntos somos más fuertes que cualquier WOD."'
  },
  {
    titulo: 'Resultados',
    icono: 'fas fa-trophy',
    color: '#4FC3F7',
    texto: 'CrossFit para todos los niveles. Desde tu primer burpee hasta tu primer muscle-up, cada día es una oportunidad de romper límites.',
    cita: '"No importa qué tan lento vayas, sigues adelantando a los que están en el sofá."'
  }
];

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.12, ease: [0.4, 0, 0.2, 1] }
  })
};

function AnimSection({ children, className = '' }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <div ref={ref} className={className}>
      {inView ? children : <div style={{ opacity: 0 }}>{children}</div>}
    </div>
  );
}

export default function WolfPackPage() {
  const navigate = useNavigate();
  const heroRef = useRef(null);
  const heroInView = useInView(heroRef, { once: true });

  return (
    <div className="wp-page">

      {/* ── HERO ── */}
      <section className="wp-hero" ref={heroRef}>
        <div className="wp-hero-backbtn">
          <button
            onClick={() => navigate('/')}
            className="wp-back-arrow"
            title="Volver al inicio"
            aria-label="Volver al inicio"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11.5 3.5L5.5 9l6 5.5" />
            </svg>
          </button>
        </div>
        <div className="wp-hero-overlay" />
        <div className="container position-relative" style={{ zIndex: 2 }}>

          <motion.div
            className="wp-hero-content text-center"
            initial={{ opacity: 0, y: 50 }}
            animate={heroInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
          >
            <img src={logoWolfpack} alt="The Wolf Pack" className="wp-hero-logo" />
            <h1 className="wp-hero-title">
              THE WOLF <span>PACK</span>
            </h1>
            <p className="wp-hero-tagline">Cross Training</p>
            <div className="wp-hero-divider" />
            <p className="wp-hero-phrase">
              Entrena duro. Cree en ti. <span>Rompe límites.</span>
            </p>
            <p className="wp-hero-sub">CrossFit para todos los niveles</p>
            <div className="wp-hero-badges">
              <span className="wp-badge"><i className="fas fa-fire"></i> Disciplina</span>
              <span className="wp-badge gold"><i className="fas fa-users"></i> Comunidad</span>
              <span className="wp-badge cool"><i className="fas fa-trophy"></i> Resultados</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── VALORES ── */}
      <section className="wp-section">
        <div className="container">
          <AnimSection>
            <motion.div className="text-center mb-5" variants={fadeUp} initial="hidden" animate="visible">
              <span className="wp-section-tag">Nuestra Esencia</span>
              <h2 className="wp-section-titulo">
                Más que un gym, <span>una manada</span>
              </h2>
              <p className="wp-section-sub">
                En WolfPack creemos que el verdadero poder nace cuando entrenas con propósito y rodeado de los tuyos.
              </p>
            </motion.div>
          </AnimSection>

          <div className="row g-4">
            {VALORES.map((valor, i) => (
              <div className="col-12 col-md-6 col-lg-4" key={valor.titulo}>
                <AnimSection>
                  <motion.div
                    className="wp-valor-card"
                    style={{ '--wp-color': valor.color }}
                    variants={fadeUp}
                    initial="hidden"
                    animate="visible"
                    custom={i}
                  >
                    <span className="wp-valor-watermark">{valor.titulo}</span>
                    <div className="wp-valor-header">
                      <div className="wp-valor-icono">
                        <i className={valor.icono}></i>
                      </div>
                      <h3 className="wp-valor-titulo">{valor.titulo}</h3>
                    </div>
                    <p className="wp-valor-texto">{valor.texto}</p>
                    <blockquote className="wp-valor-cita">{valor.cita}</blockquote>
                    <div className="wp-valor-glow" aria-hidden="true" />
                  </motion.div>
                </AnimSection>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── COMUNIDAD ── */}
      <section className="wp-section wp-section--alt">
        <div className="container">
          <AnimSection>
            <motion.div className="text-center mb-5" variants={fadeUp} initial="hidden" animate="visible">
              <span className="wp-section-tag">La Manada</span>
              <h2 className="wp-section-titulo">
                Una familia que <span>entrena junta</span>
              </h2>
              <p className="wp-section-sub">
                Aquí celebramos cada PR, cada competencia y cada momento — dentro y fuera del box.
              </p>
            </motion.div>
          </AnimSection>

          <div className="row g-4">
            <div className="col-12 col-md-6">
              <AnimSection>
                <motion.div className="wp-img-card" variants={fadeUp} initial="hidden" animate="visible" custom={0}>
                  <img src={imgComunidad} alt="WolfPack en competencia" className="wp-img" />
                  <div className="wp-img-overlay">
                    <span className="wp-img-badge"><i className="fas fa-medal"></i> Competencia</span>
                    <h4 className="wp-img-title">Unidos en la arena</h4>
                    <p className="wp-img-text">Representando a la manada en cada competencia, dando todo por el equipo.</p>
                  </div>
                </motion.div>
              </AnimSection>
            </div>
            <div className="col-12 col-md-6">
              <AnimSection>
                <motion.div className="wp-img-card" variants={fadeUp} initial="hidden" animate="visible" custom={1}>
                  <img src={imgFamilia} alt="WolfPack familia" className="wp-img" />
                  <div className="wp-img-overlay">
                    <span className="wp-img-badge gold"><i className="fas fa-heart"></i> Familia</span>
                    <h4 className="wp-img-title">Más que compañeros</h4>
                    <p className="wp-img-text">Celebramos juntos cada momento — cumpleaños, logros y la vida misma.</p>
                  </div>
                </motion.div>
              </AnimSection>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA / UBICACIÓN ── */}
      <section className="wp-section wp-cta-section">
        <div className="container">
          <AnimSection>
            <motion.div className="wp-cta-card text-center" variants={fadeUp} initial="hidden" animate="visible">
              <div className="wp-cta-icon">
                <i className="fas fa-map-marker-alt"></i>
              </div>
              <h2 className="wp-cta-titulo">
                Tu mejor versión <span>empieza aquí</span>
              </h2>
              <p className="wp-cta-texto">
                No importa tu nivel, tu edad o tu experiencia. Si tienes ganas de cambiar tu vida, esta es tu manada.
              </p>
              <div className="wp-cta-actions">
                <a
                  href="https://maps.app.goo.gl/8myTn2wN3VVRjPNj6?g_st=ic"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="wp-cta-btn"
                >
                  <i className="fas fa-directions"></i>
                  Cómo llegar
                </a>
              </div>
              <div className="wp-cta-badges">
                <span><i className="fas fa-dumbbell"></i> Cross Training</span>
                <span><i className="fas fa-users"></i> Todos los niveles</span>
                <span><i className="fas fa-clock"></i> Horarios flexibles</span>
              </div>
            </motion.div>
          </AnimSection>
        </div>
      </section>

    </div>
  );
}
