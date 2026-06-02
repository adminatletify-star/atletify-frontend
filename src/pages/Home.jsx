import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import HomeLoQueOfrece from '../components/HomeLoQueOfrece';
import HomeAliado from '../components/HomeAliado';
import HomeRedesContacto from '../components/HomeRedesContacto';
import BannerInstalarPwa from '../components/BannerInstalarPwa';
import HomePricing from '../components/HomePricing';
import '../assets/css/home.css';

export default function Home() {
  return (
    <div className="home-wrapper">

      {/* Aviso flotante de instalación de la PWA (solo se muestra una vez) */}
      <BannerInstalarPwa />

      {/* ══════════════════════════════════════════════════════
          HERO — FOTO FULLSCREEN + BRANDING SAAS
          ══════════════════════════════════════════════════════ */}
      <section className="hero-saas">

        {/* Imagen de fondo */}
        <div className="hero-saas-bg">
          <img
            src="/Box%20interno/IMG_0030.jpg"
            alt="CrossFit box Atletify"
            className="hero-saas-img"
            fetchPriority="high"
          />
          <div className="hero-saas-overlay" />
          <div className="hero-saas-glow-bottom" />
        </div>

        {/* Contenido dividido: logo izq / texto der */}
        <div className="hero-saas-content">

          {/* LADO IZQUIERDO — Logo */}
          <motion.div
            className="hero-saas-left"
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <img
              src="/LogosDeAtletify/LogoBlanco.png"
              alt="Atletify"
              className="hero-saas-logo"
            />
          </motion.div>

          {/* LADO DERECHO — Texto */}
          <div className="hero-saas-right">

            {/* Badge SaaS */}
            <motion.div
              className="hero-saas-badge"
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.3 }}
            >
              <span className="hero-saas-badge-dot" />
              Plataforma SaaS para CrossFit
            </motion.div>

            {/* Nombre de marca */}
            <motion.div
              className="hero-saas-brand"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.45, ease: [0.16, 1, 0.3, 1] }}
            >
              <span className="hero-saas-atletify">ATLETIFY</span>
              <span className="hero-saas-system">SYSTEM</span>
            </motion.div>

            {/* Línea separadora */}
            <motion.div
              className="hero-saas-divider"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.8, delay: 0.75, ease: [0.16, 1, 0.3, 1] }}
            />

            {/* Tagline */}
            <motion.p
              className="hero-saas-tagline"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.9 }}
            >
              Gestiona clases, atletas, competencias y finanzas<br />
              desde una sola plataforma.
            </motion.p>

            {/* CTA */}
            <motion.div
              className="hero-saas-ctas"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 1.1 }}
            >
              <button className="hero-saas-cta-primary" type="button">
                Únete
              </button>
            </motion.div>

          </div>

        </div>


      </section>

      {/* ══════════════════════════════════════════════════════
          SECCIÓN LO QUE OFRECEMOS
          ══════════════════════════════════════════════════════ */}
      <HomeLoQueOfrece />

      {/* ══════════════════════════════════════════════════════
          SECCIÓN NUESTRO ALIADO — WOLFPACK
          ══════════════════════════════════════════════════════ */}
      <HomeAliado />

      {/* ══════════════════════════════════════════════════════
          SECCIÓN REDES Y CONTACTO
          ══════════════════════════════════════════════════════ */}
      <HomeRedesContacto />

      {/* ══════════════════════════════════════════════════════
          SECCIÓN DE PRECIOS
          ══════════════════════════════════════════════════════ */}
      <HomePricing />

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
            <Link to="/terminos" className="text-secondary small text-decoration-none">Términos y Condiciones</Link>
            <span className="text-secondary small">|</span>
            <Link to="/politica-cookies" className="text-secondary small text-decoration-none">Política de Cookies</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
