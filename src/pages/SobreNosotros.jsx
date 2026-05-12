import { Link } from 'react-router-dom';
import ScrollFloat from '../components/ReactBits/ScrollFloat';
import '../assets/css/sobrenosotros.css';
import BackButton from '../components/BackButton';

export default function SobreNosotros() {
  return (
    <div className="sobre-nosotros-wrapper" style={{ paddingTop: '80px' }}>
      {/* Hero Section */}
      <section className="sn-hero">
        <div className="sn-hero-overlay"></div>
        <div className="container">
          <ScrollFloat
            containerClassName="sn-hero-content"
            textClassName="sn-main-title"
            animationDuration={0.8}
            stagger={0.05}
          >
            Sobre Nosotros
          </ScrollFloat>
          <ScrollFloat
            containerClassName="sn-subtitle-container"
            animationDuration={1}
            stagger={0.03}
          >
            <p className="sn-subtitle">
              Uniendo la comunidad CrossFit de México
            </p>
          </ScrollFloat>
        </div>
      </section>

      {/* Quiénes Somos */}
      <section className="sn-section">
        <div className="container">
          <ScrollFloat containerClassName="sn-section-header" animationDuration={0.7}>
            <div className="sn-section-icon">
              <i className="fas fa-users"></i>
            </div>
            <h2 className="sn-section-title">¿Quiénes Somos?</h2>
          </ScrollFloat>

          <div className="row g-4 mt-4">
            <div className="col-lg-6">
              <ScrollFloat containerClassName="sn-card" animationDuration={0.8}>
                <div className="sn-card-inner">
                  <h3 className="sn-card-title">Nuestra Historia</h3>
                  <p className="sn-card-text">
                    WolfPack nació de la pasión por el CrossFit y la necesidad de unificar
                    la gestión de competencias en una sola plataforma. Somos un equipo de
                    atletas y desarrolladores que entendemos las necesidades reales de los
                    boxes y organizadores de competencias.
                  </p>
                  <p className="sn-card-text">
                    Desde nuestra fundación, hemos trabajado para crear una herramienta
                    que simplifique la organización de eventos y fortalezca la comunidad
                    CrossFit en México y Latinoamérica.
                  </p>
                </div>
              </ScrollFloat>
            </div>
            <div className="col-lg-6">
              <ScrollFloat containerClassName="sn-card" animationDuration={0.8}>
                <div className="sn-card-inner">
                  <h3 className="sn-card-title">Nuestra Misión</h3>
                  <p className="sn-card-text">
                    Conectar boxes, atletas y organizadores en una plataforma unificada
                    que facilite la gestión de competencias de CrossFit, desde las
                    inscripciones hasta la publicación de resultados en tiempo real.
                  </p>
                  <p className="sn-card-text">
                    Creemos que la tecnología debe ser una herramienta que potencie
                    el esfuerzo de quienes organizan eventos deportivos, no una barrera.
                  </p>
                </div>
              </ScrollFloat>
            </div>
          </div>
        </div>
      </section>

      {/* Qué Hacemos */}
      <section className="sn-section sn-section-alt">
        <div className="container">
          <ScrollFloat containerClassName="sn-section-header" animationDuration={0.7}>
            <div className="sn-section-icon">
              <i className="fas fa-cogs"></i>
            </div>
            <h2 className="sn-section-title">¿Qué Hacemos?</h2>
          </ScrollFloat>

          <div className="row g-4 mt-4">
            <div className="col-md-6 col-lg-3">
              <ScrollFloat containerClassName="sn-feature-card" animationDuration={0.6}>
                <div className="sn-feature-icon">
                  <i className="fas fa-trophy"></i>
                </div>
                <h4 className="sn-feature-title">Gestión de Competencias</h4>
                <p className="sn-feature-text">
                  Organiza eventos completos: categorías, WODs, equipos y resultados
                  en tiempo real.
                </p>
              </ScrollFloat>
            </div>
            <div className="col-md-6 col-lg-3">
              <ScrollFloat containerClassName="sn-feature-card" animationDuration={0.6}>
                <div className="sn-feature-icon">
                  <i className="fas fa-users-cog"></i>
                </div>
                <h4 className="sn-feature-title">Administración de Boxes</h4>
                <p className="sn-feature-text">
                  Control total sobre atletas, clases, membresías y asistencias
                  de tu box.
                </p>
              </ScrollFloat>
            </div>
            <div className="col-md-6 col-lg-3">
              <ScrollFloat containerClassName="sn-feature-card" animationDuration={0.6}>
                <div className="sn-feature-icon">
                  <i className="fas fa-clipboard-list"></i>
                </div>
                <h4 className="sn-feature-title">Inscripciones Online</h4>
                <p className="sn-feature-text">
                  Sistema de registro fácil y rápido para atletas individuales
                  o equipos completos.
                </p>
              </ScrollFloat>
            </div>
            <div className="col-md-6 col-lg-3">
              <ScrollFloat containerClassName="sn-feature-card" animationDuration={0.6}>
                <div className="sn-feature-icon">
                  <i className="fas fa-chart-line"></i>
                </div>
                <h4 className="sn-feature-title">Leaderboards en Vivo</h4>
                <p className="sn-feature-text">
                  Resultados y clasificaciones actualizadas al instante para
                  todos los participantes.
                </p>
              </ScrollFloat>
            </div>
          </div>
        </div>
      </section>

      {/* Valores */}
      <section className="sn-section">
        <div className="container">
          <ScrollFloat containerClassName="sn-section-header" animationDuration={0.7}>
            <div className="sn-section-icon">
              <i className="fas fa-heart"></i>
            </div>
            <h2 className="sn-section-title">Nuestros Valores</h2>
          </ScrollFloat>

          <div className="row g-4 mt-4">
            <div className="col-md-4">
              <ScrollFloat containerClassName="sn-value-card" animationDuration={0.8}>
                <div className="sn-value-number">01</div>
                <h4 className="sn-value-title">Comunidad</h4>
                <p className="sn-value-text">
                  Creemos en el poder de la comunidad CrossFit. Cada atleta,
                  coach y organizador es parte fundamental de nuestra manada.
                </p>
              </ScrollFloat>
            </div>
            <div className="col-md-4">
              <ScrollFloat containerClassName="sn-value-card" animationDuration={0.8}>
                <div className="sn-value-number">02</div>
                <h4 className="sn-value-title">Excelencia</h4>
                <p className="sn-value-text">
                  Nos esforzamos por ofrecer herramientas de alta calidad que
                  cumplan con las exigencias de competencias profesionales.
                </p>
              </ScrollFloat>
            </div>
            <div className="col-md-4">
              <ScrollFloat containerClassName="sn-value-card" animationDuration={0.8}>
                <div className="sn-value-number">03</div>
                <h4 className="sn-value-title">Innovación</h4>
                <p className="sn-value-text">
                  Constantemente mejoramos nuestra plataforma con nuevas
                  funcionalidades basadas en el feedback de la comunidad.
                </p>
              </ScrollFloat>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="sn-cta-section">
        <div className="container">
          <ScrollFloat containerClassName="sn-cta-content" animationDuration={0.9}>
            <h2 className="sn-cta-title">¿Listo para unirte a la manada?</h2>
            <p className="sn-cta-text">
              Descubre cómo WolfPack puede transformar la gestión de tu box o competencia.
            </p>
            <div className="sn-cta-buttons">
              <Link to="/" className="btn btn-danger btn-lg px-5">
                <i className="fas fa-home me-2"></i>
                Explorar Home
              </Link>
              <Link to="/registro" className="btn btn-outline-light btn-lg px-5">
                <i className="fas fa-user-plus me-2"></i>
                Registrarme
              </Link>
            </div>
          </ScrollFloat>
        </div>
      </section>

      {/* Footer */}
      <footer className="sn-footer">
        <div className="container text-center py-4">
          <p className="mb-2">
            <i className="fas fa-paw text-danger me-2"></i>
            <span className="fw-bold">WOLFPACK</span> &copy; {new Date().getFullYear()}
          </p>
          <p className="text-secondary small mb-0">El límite lo pones tú.</p>
        </div>
      </footer>
    </div>
  );
}
