import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import '../assets/css/sobrenosotros.css';

/* ── Lightbox (igual al de WolfPack) ── */
function Lightbox({ fotos, startIndex, onClose }) {
  const [idx, setIdx]     = useState(startIndex);
  const [scale, setScale] = useState(1);
  const total = fotos.length;

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape')     onClose();
      if (e.key === 'ArrowLeft')  setIdx(i => Math.max(0, i - 1));
      if (e.key === 'ArrowRight') setIdx(i => Math.min(total - 1, i + 1));
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [total, onClose]);

  useEffect(() => { setScale(1); }, [idx]);

  const zoomIn  = (e) => { e.stopPropagation(); setScale(s => Math.min(4, +(s + 0.5).toFixed(1))); };
  const zoomOut = (e) => { e.stopPropagation(); setScale(s => Math.max(1, +(s - 0.5).toFixed(1))); };
  const toggleZoom = () => setScale(s => s === 1 ? 2.5 : 1);

  return createPortal(
    <div className="sn-lb-overlay" onClick={onClose}>
      <button className="sn-lb-close" onClick={onClose} aria-label="Cerrar">
        <i className="fas fa-times" />
      </button>
      <div className="sn-lb-counter">{idx + 1} / {total}</div>
      {idx > 0 && (
        <button className="sn-lb-nav sn-lb-prev" onClick={e => { e.stopPropagation(); setIdx(i => i - 1); }} aria-label="Anterior">
          <i className="fas fa-chevron-left" />
        </button>
      )}
      <div
        className={`sn-lb-img-wrap${scale > 1 ? ' sn-lb-zoomed' : ''}`}
        onClick={e => { e.stopPropagation(); toggleZoom(); }}
      >
        <img
          src={fotos[idx]}
          alt={`Foto ${idx + 1}`}
          style={{ transform: `scale(${scale})` }}
          draggable={false}
        />
      </div>
      {idx < total - 1 && (
        <button className="sn-lb-nav sn-lb-next" onClick={e => { e.stopPropagation(); setIdx(i => i + 1); }} aria-label="Siguiente">
          <i className="fas fa-chevron-right" />
        </button>
      )}
      <div className="sn-lb-zoom-bar" onClick={e => e.stopPropagation()}>
        <button onClick={zoomOut} disabled={scale <= 1} aria-label="Alejar"><i className="fas fa-minus" /></button>
        <span>{Math.round(scale * 100)}%</span>
        <button onClick={zoomIn} disabled={scale >= 4} aria-label="Acercar"><i className="fas fa-plus" /></button>
      </div>
    </div>,
    document.body
  );
}

const FOTOS = [
  '/equipo/IMG_20260501_114304.jpg',
  '/equipo/IMG_20260501_114305.jpg',
  '/equipo/IMG_20260501_114306.jpg',
  '/equipo/IMG_20260501_114617.jpg',
  '/equipo/IMG_20260501_114631.jpg',
  '/equipo/IMG_20260501_114632.jpg',
  '/equipo/IMG_20260501_114702.jpg',
  '/equipo/IMG_20260501_114703.jpg',
  '/equipo/IMG_20260501_114721.jpg',
  '/equipo/MVIMG_20260501_114623.jpg',
  '/equipo/MVIMG_20260501_114626.jpg',
  '/equipo/MVIMG_20260501_114709.jpg',
];

export default function SobreNosotros() {
  const [lightbox, setLightbox] = useState(null);
  const abrirFoto = (arr, idx) => setLightbox({ fotos: arr, idx });

  return (
    <div className="sn-root">

      {/* ── HERO ── */}
      <section className="sn-hero">
        <div
          className="sn-hero-bg"
          style={{ backgroundImage: `url(${FOTOS[0]})` }}
        />
        <div className="sn-hero-overlay" />
        <div className="sn-hero-content">
          <span className="sn-hero-eyebrow">Atletify System</span>
          <h1 className="sn-hero-name">Equipo de<br />Trabajo</h1>
          <p className="sn-hero-sub">Las personas detrás del proyecto — Cancún, México</p>
        </div>
        <div className="sn-hero-scroll">
          <i className="fas fa-chevron-down" />
        </div>
      </section>

      {/* ── INTRO ── */}
      <section className="sn-section sn-intro">
        <div className="container">
          <div className="row align-items-center g-5">
            <div className="col-lg-5">
              <div className="sn-portrait-wrap">
                <img
                  src={FOTOS[11]}
                  alt="Cristopher Alonso Tun Aguilar"
                  className="sn-portrait"
                />
                <div className="sn-portrait-badge">
                  <i className="fas fa-user" />
                  <div className="sn-portrait-badge-info">
                    <span className="sn-portrait-badge-name">Cristopher Alonso Tun Aguilar</span>
                    <span className="sn-portrait-badge-role">Full Stack Developer &amp; Director</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-lg-7">
              <div className="sn-intro-text">
                <div className="sn-tag">Sobre mí</div>
                <h2 className="sn-section-title">Director y Desarrollador<br />de Atletify System</h2>
                <p className="sn-body-text">
                  Mi nombre es <strong>Cristopher Alonso Tun Aguilar</strong>, tengo 20 años y soy
                  desarrollador full stack, director y líder del proyecto Atletify System. Esta
                  iniciativa nació al observar el crecimiento de la comunidad deportiva en Cancún,
                  particularmente en las competencias de CrossFit y halterofilia, dos disciplinas
                  que practico y admiro profundamente.
                </p>
                <p className="sn-body-text">
                  Soy un apasionado del deporte. Llevo aproximadamente cinco años practicando
                  CrossFit, y durante un par de meses entrené halterofilia con el objetivo de
                  representar a mi estado en una competencia oficial. Más allá del rendimiento,
                  ambas disciplinas se han convertido en una parte esencial de mi vida.
                </p>
                <div className="sn-chips">
                  <span className="sn-chip"><i className="fas fa-dumbbell" /> CrossFit</span>
                  <span className="sn-chip"><i className="fas fa-weight-hanging" /> Halterofilia</span>
                  <span className="sn-chip"><i className="fas fa-laptop-code" /> Full Stack</span>
                  <span className="sn-chip"><i className="fas fa-trophy" /> 4 Competencias</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOTO WIDE ── */}
      <div
        className="sn-wide-photo"
        style={{ backgroundImage: `url(${FOTOS[9]})` }}
      >
        <div className="sn-wide-overlay" />
        <blockquote className="sn-wide-quote">
          "Observar a personas avanzadas suele intimidar, pues asumimos —equivocadamente—
          que ellas comenzaron ya dominando el deporte."
        </blockquote>
      </div>

      {/* ── MIS INICIOS EN WOLF PACK ── */}
      <section className="sn-section">
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-lg-9 col-xl-8">
              <div className="sn-tag">12 de octubre de 2021</div>
              <h2 className="sn-section-title">Mis inicios en Wolf Pack</h2>
              <p className="sn-body-text">
                Mi historia en Wolf Pack comenzó en plena pandemia. Buscaba una forma de
                aprovechar mejor mi tiempo y decidí probar algo nuevo. Con honestidad, jamás
                imaginé que llegaría a destacar en un deporte de este estilo.
              </p>
              <p className="sn-body-text">
                El acompañamiento de un buen coach fue determinante para que no soltara la
                disciplina. La <strong>coach Silvia</strong> y la <strong>coach Liz</strong> han
                sido pilares fundamentales en mi formación. Encuentro una belleza particular en
                la ejecución técnica de un movimiento: un snatch, un envión, un salto de caja o
                incluso un burpee bien realizado dicen mucho de una persona.
              </p>
              <p className="sn-body-text">
                La coach Silvia me enseñó los fundamentos: el aspecto nutricional, la correcta
                denominación de cada ejercicio, la técnica en su ejecución, la forma adecuada de
                tomar una barra olímpica, de realizar un squat e incluso de ejecutar un burpee.
              </p>
              <p className="sn-body-text">
                La coach Liz fue mi inspiración tanto a corto como a largo plazo. Ella me enseñó
                a no soltar la barra; a entender que siempre hay un empujón extra disponible,
                siempre hay repeticiones por arrancar, tiempos por mejorar y kilos por sumar.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── APRENDIZAJE / COMPETENCIAS ── */}
      <section className="sn-section sn-section-alt">
        <div className="container">
          <div className="row g-5 align-items-center flex-lg-row-reverse">
            <div className="col-lg-6">
              <div className="sn-tag sn-tag-accent">Crecimiento</div>
              <h2 className="sn-section-title">Aprendizaje a través<br />de los tropiezos</h2>
              <p className="sn-body-text">
                A lo largo de mi trayectoria me he lesionado, he caído y me he golpeado en
                innumerables ocasiones. Pero son precisamente esos tropiezos los que enseñan al
                cuerpo qué errores no debe repetir.
              </p>
              <p className="sn-body-text">
                He tenido el privilegio de competir en cuatro ocasiones: una en halterofilia y
                tres en CrossFit. Cada una de ellas me ha permitido entender, desde adentro, lo
                que significa prepararse, presentarse y dejarlo todo en el piso de competencia.
              </p>
              <p className="sn-body-text">
                He participado también en la organización de eventos deportivos junto a la coach
                Silvia, entre ellos los <strong>Wolf Pack Games</strong> — un evento con causa
                cuyo objetivo era recaudar croquetas para los perros en situación de calle. Una
                iniciativa profundamente noble que reforzó la convicción que hoy da forma a
                Atletify System.
              </p>
              <p className="sn-body-text sn-italic">
                Si algo tengo claro es que lo más difícil de cualquier disciplina es comenzar.
                Yo he intentado muchas cosas y he fallado cien veces; siempre las he conseguido
                en el intento ciento uno.
              </p>
            </div>
            <div className="col-lg-6">
              <button type="button" className="sn-single-photo-wrap sn-photo-btn" onClick={() => abrirFoto(FOTOS, 7)}>
                <img src={FOTOS[7]} alt="Cristopher compitiendo" className="sn-single-photo" />
                <span className="sn-photo-hint sn-photo-hint-lg"><i className="fas fa-expand-alt" /></span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── ATLETIFY SYSTEM ── */}
      <section className="sn-section sn-atletify">
        <div className="container">
          <div className="row justify-content-center mb-5">
            <div className="col-lg-8 text-center">
              <div className="sn-tag">El proyecto</div>
              <h2 className="sn-section-title sn-title-center">Sobre Atletify System</h2>
              <p className="sn-body-text sn-text-center">
                Atletify System es una respuesta a las carencias de organización que he observado
                en eventos, competencias y administraciones del medio deportivo. Es un proyecto
                ambicioso, técnicamente complejo, del que me siento profundamente orgulloso de
                dirigir.
              </p>
            </div>
          </div>

          <div className="row g-4">
            <div className="col-md-6 col-lg-3">
              <div className="sn-pillar-card">
                <div className="sn-pillar-icon"><i className="fas fa-lightbulb" /></div>
                <h4 className="sn-pillar-title">Idea original</h4>
                <p className="sn-pillar-text">Definí el concepto y evalué la viabilidad y factibilidad de un proyecto de este alcance.</p>
              </div>
            </div>
            <div className="col-md-6 col-lg-3">
              <div className="sn-pillar-card">
                <div className="sn-pillar-icon"><i className="fas fa-layer-group" /></div>
                <h4 className="sn-pillar-title">Stack tecnológico</h4>
                <p className="sn-pillar-text">Seleccioné las tecnologías y diseñé la base de datos inicial del sistema.</p>
              </div>
            </div>
            <div className="col-md-6 col-lg-3">
              <div className="sn-pillar-card">
                <div className="sn-pillar-icon"><i className="fas fa-trophy" /></div>
                <h4 className="sn-pillar-title">Sistema de competencias</h4>
                <p className="sn-pillar-text">Programé personalmente el módulo de competencias, objetivo central de la primera etapa.</p>
              </div>
            </div>
            <div className="col-md-6 col-lg-3">
              <div className="sn-pillar-card">
                <div className="sn-pillar-icon"><i className="fas fa-users-cog" /></div>
                <h4 className="sn-pillar-title">Liderazgo técnico</h4>
                <p className="sn-pillar-text">Dirijo al equipo de desarrollo combinando experiencia deportiva y formación como desarrollador.</p>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* ── VISIÓN ── */}
      <section className="sn-section">
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-lg-8">
              <div className="sn-tag sn-tag-accent">El futuro</div>
              <h2 className="sn-section-title">Hacia dónde vamos</h2>
              <p className="sn-body-text">
                Atletify nació para responder a un llamado, pero su visión es mucho más amplia.
                Aspiramos a que el sistema sea adoptado por otros boxes de CrossFit y
                organizaciones deportivas de la región, para luego escalar a otros estados del país.
              </p>
              <p className="sn-body-text">
                Buscamos integrar nuevas disciplinas más allá del CrossFit y la halterofilia, así
                como ofrecer más opciones para coaches y roles personalizables dentro de la
                plataforma. Atletify responde hoy a una necesidad concreta, pero su arquitectura
                está pensada para adaptarse al deporte en su sentido más amplio.
              </p>
              <p className="sn-body-text">
                Espero que disfruten todo lo que hemos construido para ustedes. Cualquier
                sugerencia o consejo será siempre bienvenido. Gracias a todos los que hicieron
                esto posible, y a mi comunidad, porque también gracias a ella pude desarrollar
                este hermoso proyecto.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── QUOTE FINAL ── */}
      <section className="sn-quote-section">
        <div
          className="sn-quote-bg"
          style={{ backgroundImage: `url(${FOTOS[8]})` }}
        />
        <div className="sn-quote-overlay" />
        <div className="sn-quote-content">
          <i className="fas fa-quote-left sn-quote-icon" />
          <blockquote className="sn-final-quote">
            ¿Qué tan grande soñarías,<br />si supieras que no puedes fallar?
          </blockquote>
          <cite className="sn-quote-author">— Cristopher A.</cite>
          <Link to="/" className="sn-quote-btn">
            <i className="fas fa-home" />
            <span>Volver al inicio</span>
          </Link>
        </div>
      </section>

      {lightbox && (
        <Lightbox
          fotos={lightbox.fotos}
          startIndex={lightbox.idx}
          onClose={() => setLightbox(null)}
        />
      )}

    </div>
  );
}
