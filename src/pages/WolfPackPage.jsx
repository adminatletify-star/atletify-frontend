import { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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

function CoachCarousel({ fotos, nombre, color, fotosPos = {}, fotosScale = {}, onPhotoClick }) {
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
              <img
                src={src}
                alt={`${nombre} ${i + 1}`}
                draggable={false}
                loading="lazy"
                decoding="async"
                onClick={() => onPhotoClick?.(i)}
                style={{
                  ...(fotosPos[i] ? { objectPosition: fotosPos[i] } : {}),
                  ...(fotosScale[i] ? { transform: `scale(${fotosScale[i]})`, transformOrigin: 'center center' } : {}),
                  ...(onPhotoClick ? { cursor: 'pointer', pointerEvents: 'auto' } : {}),
                }}
              />
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
    'El Wolf Pack nació de una convicción profunda: que moverse es un derecho de todos, no un privilegio de unos pocos. Silvia fundó este espacio con una misión clara — crear un lugar donde cualquier persona, sin importar su edad, condición física o experiencia previa, pudiera descubrir lo que su cuerpo es capaz de lograr cuando se le da la oportunidad.',
    'Aquí no se trata solo de rendimiento. Se trata de construir salud desde adentro, de fortalecer el cuerpo, equilibrar la mente y encontrar una comunidad que te reciba con los brazos abiertos. Cada persona que entra por primera vez a este box merece sentir que este lugar también es suyo.',
    'Silvia ha acompañado a cientos de personas en ese camino — desde quienes llegaron sin haber hecho ejercicio en años, hasta atletas de competencia. Lo que los une no es su nivel, sino las ganas de mejorar.',
  ],
  certificaciones: {
    formacion: [
      { texto: 'Certificación Entrenadora Personal Pesas y Musculación Nivel 1 y 2', inst: 'Universidad del Deporte (UD)' },
      { texto: 'Certificación Entrenamiento Funcional y CrossTraining', inst: 'UD' },
      { texto: 'Certificación Free Style Exclusivo Mujeres', inst: 'UD' },
      { texto: 'Diplomado en Entrenamiento y Nutrición Deportiva', inst: 'UD' },
      { texto: 'Diplomado en Nutrición Nivel 2', inst: 'UD' },
      { texto: 'CrossFit Level 1', inst: '' },
      { texto: 'Diplomado en Nutrición con Patologías Diferentes', inst: 'RIAET/ILED 2025' },
      { texto: 'Diplomado de Neurociencia Aplicada al Alto Rendimiento', inst: 'RIAET/ILED' },
      { texto: 'Taller de Fisiología en el Deporte', inst: 'Instituto ISAK' },
      { texto: 'Taller de Psicología Deportiva', inst: 'CONADE' },
      { texto: 'Dominio del Idioma Inglés', inst: '' },
    ],
    talleres: [
      { texto: 'Taller de Levantamiento Olímpico', inst: 'Gibrán Rodríguez — Atleta CrossFit Games' },
      { texto: 'Taller de Técnicas Gimnásticas', inst: 'Pablo Pizurno' },
      { texto: 'Taller de Entrenamiento y Dosificación', inst: 'Luis Oscar Mora — Atleta de Games' },
      { texto: 'Taller de Fisiología del Entrenamiento', inst: 'Héctor Tapia — Atleta de Alto Rendimiento' },
      { texto: 'Taller de Barbell Cycling', inst: 'Lukas Parker — Atleta de Games' },
      { texto: 'Taller de Levantamiento Olímpico Nivel 1', inst: 'Fabián Pereyra — CEO Oly Team' },
      { texto: 'Taller Los Secretos del Levantamiento', inst: 'A. Torhykity 2020' },
      { texto: 'Taller Los Secretos del Levantamiento', inst: 'A. Thorikity 2023' },
      { texto: 'Taller de Levantamiento Olímpico Nivel 2', inst: 'Fabián Pereyra 2026' },
    ],
  },
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
      '/Coaches/André/IMG_0007.jpg',
      '/Coaches/André/IMG_0004.jpg',
      '/Coaches/André/IMG_9987.jpg',
    ],
    especialidades: ['CrossFit', 'Strength & Conditioning', 'Weightlifting'],
    bio: ['[ Texto por André — próximamente. ]'],
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
    bio: ['[ Texto por Edgar — próximamente. ]'],
    color: '#F5A623',
  },
  {
    nombre: 'Esperanza',
    rol: 'Coach',
    fotos: [
      '/Coaches/Esperanza/IMG_9936.jpg',
      '/Coaches/Esperanza/IMG_9939.jpg',
      '/Coaches/Esperanza/IMG_9933.jpg',
    ],
    especialidades: ['CrossFit', 'Gymnastics', 'Foundations'],
    bio: ['[ Texto por Esperanza — próximamente. ]'],
    color: '#4FC3F7',
  },
  {
    nombre: 'Liz',
    rol: 'Coach',
    fotos: [
      '/Coaches/Liz/IMG_9872.jpg',
      '/Coaches/Liz/IMG_9873.jpg',
      '/Coaches/Liz/IMG_9860.jpg',
    ],
    especialidades: ['CrossFit'],
    bio: [
      'Mi nombre es Lizet de Guadalupe Cime Lizama. Llevo aproximadamente 10 años practicando CrossFit.',
      'Lo que me llevó a iniciar fue el deseo de bajar de peso. Comencé en un pequeño box cerca de mi casa; tiempo después, un compañero me invitó al que hoy es mi segundo hogar: Wolf Pack.',
      'He participado en competencias individuales y por equipos, logrando llegar al podio. También he debutado dos veces en Hyrox en la modalidad de dúos.',
      'Lo que más amo es ver la capacidad de evolución de un cuerpo — y más allá del cambio físico, la mentalidad tan fuerte que te forja este deporte.',
      'Hace cinco años tuve la oportunidad de entrenar durante ocho meses de mi embarazo, una experiencia que me hizo ser mucho más consciente de mi cuerpo.',
      'Hoy entreno por salud y por pasión — y lo que más espero de este camino es que algún día alguien diga: Liz me inspiró. ❤️🍂',
    ],
    color: '#A855F7',
  },
  {
    nombre: 'Margarita',
    rol: 'Coach',
    fotos: [
      '/Coaches/Margarita/IMG_9892.jpg',
      '/Coaches/Margarita/IMG_9896.jpg',
      '/Coaches/Margarita/IMG_9908.jpg',
      '/Coaches/Margarita/IMG_9924.jpg',
    ],
    fotosPos: { 0: 'top center', 1: 'top center' },
    especialidades: ['CrossFit', 'Olympic Lifting', 'Competition', 'Fisioterapia', 'Gimnasia', 'Mentalidad Deportiva'],
    bio: [
      'Me llamo Margarita, aunque todos me conocen como Magui. Tengo 21 años y llevo 12 dentro del deporte de alto rendimiento, desarrollándome principalmente en el levantamiento de pesas olímpico a nivel nacional — disciplina con la que he representado a mi estado en cuatro ocasiones.',
      'El CrossFit ha sido parte de mi vida desde siempre. Es un deporte que jamás dejaría de lado, porque no exige únicamente fortaleza física: también forja una mentalidad que te transforma por dentro.',
      'Desde hace cuatro años me dedico a la enseñanza, compartiendo todo lo que he aprendido con personas de todas las edades — acompañándolas a superarse, ganar confianza y alcanzar sus metas dentro y fuera del entrenamiento.',
    ],
    color: '#10B981',
  },
];

// ─── BOX SLIDES ───────────────────────────────────────────────────────────────
const BOX_SLIDES = [
  { src: '/Box interno/IMG_0025.jpg',          frase: 'El lugar donde tu salud se convierte en prioridad' },
  { src: '/Coaches/André/IMG_9951.jpg',         frase: 'Aquí todos empezamos desde cero — Coach André' },
  { src: '/Coaches/André/IMG_9988.jpg',         frase: 'Cada movimiento suma, cada día cuenta — Coach André', pos: '50% 45%' },
  { src: '/Box interno/IMG_0027.jpg',          frase: 'Donde el ejercicio se convierte en estilo de vida' },
  { src: '/Box interno/IMG_0029.jpg',          frase: 'Un espacio pensado para ti, sin importar tu nivel' },
  { src: '/Coaches/André/IMG_9965.jpg',         frase: 'El primer paso es el más valioso — Coach André' },
  { src: '/Box interno/IMG_0036.jpg',          frase: 'Tu segunda casa te está esperando' },
  { src: '/Box interno/IMG_0038.jpg',          frase: 'Muévete. Crece. Siéntete bien en tu cuerpo' },
  { src: '/Coaches/Silvia/IMG_9832.jpg',       frase: 'Fundado con la misión de transformar vidas — Coach Silvia' },
  { src: '/Box interno/IMG_0031.jpg',          frase: 'El ejercicio más importante es el que haces hoy' },
  { src: '/Coaches/Esperanza/IMG_9941.jpg',    frase: 'Moverte es cuidarte — Coach Esperanza' },
];

// ─── EVENTOS ──────────────────────────────────────────────────────────────────
const EVENTOS = [
  {
    titulo: 'Recolecta de Juguetes 2026',
    subtitulo: 'Día del Niño · Día de la Madre',
    fecha: 'Abril 2026',
    desc: 'Para niños de zonas vulnerables de Quintana Roo — Nuevo Valladolid, Agua Azul y San Lorenzo. Donaciones de juguetes, ropa y detalles para las mamás.',
    tag: 'Evento Social',
    tagColor: '#4FC3F7',
    fotos: [
      '/Eventos/29-de-abril/686304845_1555992643204001_8638160989467348741_n.jpg',
      '/Eventos/29-de-abril/686474893_1555992603204005_2468381129148784722_n.jpg',
      '/Eventos/29-de-abril/684320858_1555992616537337_6643287625283010842_n.jpg',
      '/Eventos/29-de-abril/682411529_1555992579870674_996834107073499918_n.jpg',
      '/Eventos/29-de-abril/495869797_18309320461238137_2476432414112300628_n.jpg',
    ],
  },
  {
    titulo: 'Hyrox Fest! The Roof 2025',
    subtitulo: 'The Last!!',
    fecha: 'Diciembre 2025',
    desc: null,
    tag: 'Competencia',
    tagColor: '#E63946',
    fotos: [
      '/Eventos/hyrox-fest-2025/605443231_1443044944498772_8693496682232748958_n.jpg',
      '/Eventos/hyrox-fest-2025/605528475_1443044984498768_2595940694506258966_n.jpg',
      '/Eventos/hyrox-fest-2025/606542734_1443045351165398_5332929914696278678_n.jpg',
    ],
  },
  {
    titulo: 'Novena Competencia Interna',
    subtitulo: null,
    fecha: 'Noviembre 2025',
    desc: null,
    tag: 'Competencia Interna',
    tagColor: '#F5A623',
    photoPos: {
      0: 'center 60%',
      3: 'center 55%',
      4: 'center 55%',
      6: 'center 38%',
    },
    fotos: [
      '/Eventos/novena-competencia-interna/576855213_1397931252343475_4169574231907000286_n.jpg',
      '/Eventos/novena-competencia-interna/574402948_1397931285676805_9077157944728747266_n.jpg',
      '/Eventos/novena-competencia-interna/575182358_1397931319010135_2105564363880403777_n.jpg',
      '/Eventos/novena-competencia-interna/577333795_1397978215672112_1638834214726883492_n.jpg',
      '/Eventos/novena-competencia-interna/577151686_1398098352326765_1901655594816371998_n.jpg',
      '/Eventos/novena-competencia-interna/576108137_1398155795654354_4153971218129543732_n.jpg',
      '/Eventos/novena-competencia-interna/577345935_1400056475464286_3096976716188597781_n.jpg',
      '/Eventos/novena-competencia-interna/575189361_1397931189010148_8792946858020903590_n.jpg',
    ],
  },
  {
    titulo: 'Wolf Pack Games III',
    subtitulo: 'Competencia con Causa',
    fecha: 'Octubre 2025',
    desc: null,
    tag: 'Competencia con Causa',
    tagColor: '#10B981',
    photoPos: {
      5: 'center 35%',
      7: 'center 18%',
    },
    fotos: [
      '/Eventos/wolf-pack-games-III/573885789_1390049499798317_8847793833390620321_n.jpg',
      '/Eventos/wolf-pack-games-III/572987966_1390049546464979_2402129627015401119_n.jpg',
      '/Eventos/wolf-pack-games-III/571333216_1390049709798296_4867535419806264402_n.jpg',
      '/Eventos/wolf-pack-games-III/572274471_1390049803131620_4351670454397691061_n.jpg',
      '/Eventos/wolf-pack-games-III/571614256_1390052473131353_8543219263727372996_n.jpg',
      '/Eventos/wolf-pack-games-III/571441076_1390052609798006_6194332672720857619_n.jpg',
      '/Eventos/wolf-pack-games-III/572794569_1390065693130031_4309291572208170636_n.jpg',
      '/Eventos/wolf-pack-games-III/571404138_1390058156464118_1629385149541753709_n.jpg',
      '/Eventos/wolf-pack-games-III/571435327_1390057949797472_1552109273156183918_n.jpg',
    ],
  },
  {
    titulo: '1ra Carrera Outlet',
    subtitulo: null,
    fecha: 'Junio 2025',
    desc: null,
    tag: 'Carrera',
    tagColor: '#A855F7',
    objPos: 'center 68%',
    fotos: [
      '/Eventos/1ra-carrera-outlet/505134590_1256868076449794_5479770105001373415_n.jpg',
      '/Eventos/1ra-carrera-outlet/505397229_1256868389783096_3864903565154085906_n.jpg',
      '/Eventos/1ra-carrera-outlet/504911875_1256868466449755_7990917209812749335_n.jpg',
      '/Eventos/1ra-carrera-outlet/505414453_1256868536449748_60124540040351113_n.jpg',
      '/Eventos/1ra-carrera-outlet/505084445_1256868553116413_1583536914066184694_n.jpg',
    ],
  },
  {
    titulo: 'Competencia Interna',
    subtitulo: 'Febrero 2024',
    fecha: 'Febrero 2024',
    desc: null,
    tag: 'Competencia Interna',
    tagColor: '#F5A623',
    fotos: [
      '/Eventos/compe-interna-feb-2024/489615927_1204155818387687_1170041116622622614_n.jpg',
      '/Eventos/compe-interna-feb-2024/489692139_1204155751721027_2517337354380662248_n.jpg',
      '/Eventos/compe-interna-feb-2024/489844460_1204155765054359_7560416814955327649_n.jpg',
      '/Eventos/compe-interna-feb-2024/490083036_1204156215054314_6486943340083218424_n.jpg',
      '/Eventos/compe-interna-feb-2024/490367855_1204155941721008_6601053864956903398_n.jpg',
      '/Eventos/compe-interna-feb-2024/490482398_1204156148387654_7440988178774378729_n.jpg',
    ],
  },
  {
    titulo: 'Warrior Games',
    subtitulo: '1ra Edición',
    fecha: 'Septiembre 2023',
    desc: null,
    tag: 'Competencia',
    tagColor: '#E63946',
    objPos: 'center 65%',
    photoPos: {
      0: 'top center',
      1: 'center 35%',
      2: 'center 35%',
    },
    fotos: [
      '/Eventos/warrior-games-1ra-edicion/488370842_1195062505963685_7516181618197352746_n.jpg',
      '/Eventos/warrior-games-1ra-edicion/487406079_1195062719296997_8756033205946325705_n.jpg',
      '/Eventos/warrior-games-1ra-edicion/487418653_1195062809296988_6437910579127228742_n.jpg',
      '/Eventos/warrior-games-1ra-edicion/487507051_1195062715963664_2683282246519753232_n.jpg',
      '/Eventos/warrior-games-1ra-edicion/488186443_1195062805963655_7129128870015200060_n.jpg',
    ],
  },
  {
    titulo: 'Reto Delfines 2023',
    subtitulo: null,
    fecha: 'Junio 2023',
    desc: null,
    tag: 'Reto Atlético',
    tagColor: '#06B6D4',
    objPos: 'center 65%',
    photoPos: {
      0: 'top center',
      2: 'center 45%',
      3: 'center 45%',
    },
    fotos: [
      '/Eventos/reto-delfines-2023/487529673_1192505496219386_2810556489706388214_n.jpg',
      '/Eventos/reto-delfines-2023/487482349_1192505306219405_4969990268029083355_n.jpg',
      '/Eventos/reto-delfines-2023/487557303_1192505699552699_3105330588364120517_n.jpg',
      '/Eventos/reto-delfines-2023/487740996_1192505586219377_7083699175777230955_n.jpg',
      '/Eventos/reto-delfines-2023/487811472_1192505602886042_6514256955789516255_n.jpg',
    ],
  },
];


// ─── BOX CAROUSEL COMPONENT ───────────────────────────────────────────────────
function BoxCarousel({ slides }) {
  const [current, setCurrent] = useState(0);
  const total = slides.length;
  const touchStartX = useRef(null);

  const goTo = (idx) => setCurrent((idx + total) % total);
  const next  = () => goTo(current + 1);
  const back  = () => goTo(current - 1);

  useEffect(() => {
    const t = setTimeout(next, 5500);
    return () => clearTimeout(t);
  }, [current]); // eslint-disable-line react-hooks/exhaustive-deps

  function onTouchStart(e) {
    touchStartX.current = e.touches[0].clientX;
  }

  function onTouchEnd(e) {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) diff > 0 ? next() : back();
    touchStartX.current = null;
  }

  return (
    <div className="wp-bc" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      {/* Fotos */}
      {slides.map((s, i) => (
        <div key={i} className={`wp-bc-slide${i === current ? ' wp-bc-slide--active' : ''}`}>
          <img src={s.src} alt={s.frase} loading="lazy" decoding="async" style={s.pos ? { objectPosition: s.pos } : undefined} />
        </div>
      ))}

      {/* Degradado inferior */}
      <div className="wp-bc-overlay" />

      {/* Caption */}
      <div className="wp-bc-caption">
        <span className="wp-bc-caption-tag">Wolf Pack CrossFit</span>
        <p className="wp-bc-frase">"{slides[current].frase}"</p>
      </div>

      {/* Flechas */}
      <button className="wp-bc-arrow wp-bc-arrow--prev" onClick={back} aria-label="Anterior">
        <i className="fas fa-chevron-left" />
      </button>
      <button className="wp-bc-arrow wp-bc-arrow--next" onClick={next} aria-label="Siguiente">
        <i className="fas fa-chevron-right" />
      </button>

      {/* Progreso */}
      <div className="wp-bc-progress">
        <div
          className="wp-bc-progress-bar"
          style={{ width: `${((current + 1) / total) * 100}%` }}
        />
      </div>

      {/* Contador */}
      <div className="wp-bc-counter">
        <span className="wp-bc-counter-current">{String(current + 1).padStart(2, '0')}</span>
        <span className="wp-bc-counter-sep"> / </span>
        <span className="wp-bc-counter-total">{String(total).padStart(2, '0')}</span>
      </div>
    </div>
  );
}

// ─── LIGHTBOX ─────────────────────────────────────────────────────────────────
function Lightbox({ evento, startIndex, onClose }) {
  const [idx, setIdx] = useState(startIndex);
  const [scale, setScale] = useState(1);
  const total = evento.fotos.length;

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
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
    <div className="wp-lb-overlay" onClick={onClose}>
      <button className="wp-lb-close" onClick={onClose} aria-label="Cerrar">
        <i className="fas fa-times" />
      </button>

      <div className="wp-lb-counter">{idx + 1} / {total}</div>

      {idx > 0 && (
        <button className="wp-lb-nav wp-lb-prev" onClick={e => { e.stopPropagation(); setIdx(i => i - 1); }} aria-label="Anterior">
          <i className="fas fa-chevron-left" />
        </button>
      )}

      <div
        className={`wp-lb-img-wrap${scale > 1 ? ' wp-lb-zoomed' : ''}`}
        onClick={e => { e.stopPropagation(); toggleZoom(); }}
      >
        <img
          src={evento.fotos[idx]}
          alt={`${evento.titulo} ${idx + 1}`}
          style={{ transform: `scale(${scale})` }}
          draggable={false}
        />
      </div>

      {idx < total - 1 && (
        <button className="wp-lb-nav wp-lb-next" onClick={e => { e.stopPropagation(); setIdx(i => i + 1); }} aria-label="Siguiente">
          <i className="fas fa-chevron-right" />
        </button>
      )}

      <div className="wp-lb-zoom-bar" onClick={e => e.stopPropagation()}>
        <button onClick={zoomOut} disabled={scale <= 1} aria-label="Alejar"><i className="fas fa-minus" /></button>
        <span>{Math.round(scale * 100)}%</span>
        <button onClick={zoomIn}  disabled={scale >= 4}  aria-label="Acercar"><i className="fas fa-plus" /></button>
      </div>
    </div>,
    document.body
  );
}

export default function WolfPackPage() {
  const heroRef = useRef(null);
  const heroInView = useInView(heroRef, { once: true });
  const [activeCoach, setActiveCoach] = useState(null); // eslint-disable-line no-unused-vars
  const [lightbox, setLightbox] = useState(null);

  return (
    <>
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
          <span>Salud & Bienestar</span>
          <span className="wp-hero-topbar-dot" />
          <span>Todos los Niveles</span>
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
              Tu salud es tu mayor inversión · Empieza donde estás · <em>Aquí todos son bienvenidos</em>
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
            <i className="fas fa-heartbeat" />
            <span>Salud</span>
          </div>
          <div className="wp-hero-val-sep" />
          <div className="wp-hero-val">
            <i className="fas fa-users" />
            <span>Comunidad</span>
          </div>
          <div className="wp-hero-val-sep" />
          <div className="wp-hero-val">
            <i className="fas fa-leaf" />
            <span>Bienestar</span>
          </div>
        </motion.div>
      </section>

      {/* ══════════════════════ HISTORIA ═════════════════════════ */}
      <section className="wp-historia-section">
        <div className="container">
          <motion.div
            className="wp-historia-header"
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
          >
            <span className="wp-stag wp-stag--gold">Nuestra Historia</span>
            <h2 className="wp-section-titulo">
              La Historia de <span>WolfPack</span>
            </h2>
          </motion.div>

          <div className="row g-4 align-items-start">
            <div className="col-12 col-lg-8">
              <motion.div
                className="wp-historia-texto-wrap"
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
              >
                <p className="wp-historia-p">
                  No nació como un proyecto; no planeamos iniciar un centro de entrenamiento.
                  Fue una decisión tomada a partir de que el box donde la fundadora entrenaba tuvo
                  la necesidad de cerrar, y los pocos alumnos que asistían no querían entrenar con
                  alguien más ni en algún otro lugar. Así fue como en par de días nació{' '}
                  <strong>The WolfPack</strong>.
                </p>

                <div className="wp-historia-porque">
                  <p className="wp-historia-porque-q">¿Por qué el nombre?</p>
                  <p className="wp-historia-p">
                    Éramos y seguimos siendo una familia — una manada que se apoyó, se quedó y que
                    algunos aún forman parte de ella.
                  </p>
                </div>

                <p className="wp-historia-p">
                  Y luego vino lo demás: las competencias internas, la organización para repartir
                  comida en hospitales, celebraciones para el Día del Niño en comunidades alejadas.
                  Pero sobre todo, el enfoque más grande ha sido apoyar a la población perruna de
                  nuestra ciudad. En estos 10 años se han organizado muchas competencias, de las
                  cuales <strong>3 han sido a nivel peninsular</strong>, recibiendo varios atletas.
                </p>

                <p className="wp-historia-p">
                  Estos 10 años hemos cambiado la vida de muchísimas personas. Hemos celebrado
                  bodas, nacimientos y festejado cada logro de la manada.
                </p>
              </motion.div>
            </div>

            <div className="col-12 col-lg-4">
              <motion.div
                className="wp-historia-stats"
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={1}
              >
                <div className="wp-historia-stat">
                  <span className="wp-historia-stat-num">10</span>
                  <span className="wp-historia-stat-label">Años de historia</span>
                </div>
                <div className="wp-historia-stat">
                  <span className="wp-historia-stat-num">3</span>
                  <span className="wp-historia-stat-label">Competencias peninsulares</span>
                </div>
              </motion.div>
            </div>
          </div>

          <div className="row g-4 mt-3">
            <div className="col-12 col-md-6">
              <motion.div
                className="wp-ov-card"
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
              >
                <div className="wp-ov-icon"><i className="fas fa-bullseye" /></div>
                <h4 className="wp-ov-title">Objetivo</h4>
                <p className="wp-ov-text">
                  El objetivo primordial siempre será mejorar la salud de nuestros atletas, así
                  como también su aspecto físico. Las competencias son parte importante de esta
                  comunidad y siempre apoyamos el talento de alto rendimiento en disciplinas como
                  halterofilia, natación y atletismo. Cualquier persona puede entrenar con la
                  manada sin importar edad ni condición física — nuestros entrenadores están 100%
                  capacitados para brindar ayuda a cualquier nivel.
                </p>
              </motion.div>
            </div>
            <div className="col-12 col-md-6">
              <motion.div
                className="wp-ov-card wp-ov-card--vision"
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={1}
              >
                <div className="wp-ov-icon"><i className="fas fa-eye" /></div>
                <h4 className="wp-ov-title">Visión</h4>
                <p className="wp-ov-text">
                  Mantener la costumbre de unir la comunidad de CrossFit en Cancún organizando
                  competencias sobre todo con causa, e incentivar a más lugares a unirse a todos
                  nuestros proyectos sin fines de lucro.
                </p>
              </motion.div>
            </div>
          </div>
        </div>
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
                <span className="wp-stag wp-stag--gold">Nuestra Misión</span>
                <h2 className="wp-silvia-banner-title">
                  Salud y Bienestar<br />para <span>Todos</span>
                </h2>
                <p className="wp-silvia-banner-sub">Un espacio que te recibe sin importar tu punto de partida</p>
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
                    <div className="wp-silvia-photo-hero" style={{ cursor: 'pointer' }} onClick={() => setLightbox({ evento: { fotos: SILVIA.fotos, titulo: 'Coach Silvia' }, index: 0 })}>
                      <img src={SILVIA.fotos[0]} alt="Coach Silvia" />
                      <div className="wp-silvia-photo-hero-badge">
                        <i className="fas fa-star" /> Head Coach
                      </div>
                    </div>
                    <div className="wp-silvia-photo-row">
                      {SILVIA.fotos.slice(1, 4).map((src, i) => (
                        <div key={i} className="wp-silvia-photo-sm" style={{ cursor: 'pointer' }} onClick={() => setLightbox({ evento: { fotos: SILVIA.fotos, titulo: 'Coach Silvia' }, index: i + 1 })}>
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
                    <span className="wp-stag wp-stag--red">La Fundadora</span>
                    <h3 className="wp-silvia-nombre">{SILVIA.nombre}</h3>
                    <p className="wp-silvia-rol">{SILVIA.titulo}</p>

                    {SILVIA.bio.map((p, i) => (
                      <p key={i} className="wp-silvia-texto">{p}</p>
                    ))}

                    <div className="wp-silvia-certs-wrap">
                      <div className="row g-3">
                        <div className="col-12 col-md-6">
                          <div className="wp-certs-card">
                            <div className="wp-certs-card-head">
                              <i className="fas fa-graduation-cap" />
                              <span>Formación Académica</span>
                            </div>
                            <div className="wp-silvia-certs-list">
                              {SILVIA.certificaciones.formacion.map((cert, i) => (
                                <div key={i} className="wp-cert-item">
                                  <i className="fas fa-check-circle wp-cert-check" />
                                  <span>
                                    {cert.texto}
                                    {cert.inst && <em className="wp-cert-inst"> — {cert.inst}</em>}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="col-12 col-md-6">
                          <div className="wp-certs-card wp-certs-card--talleres">
                            <div className="wp-certs-card-head">
                              <i className="fas fa-trophy" />
                              <span>Talleres Internacionales</span>
                            </div>
                            <div className="wp-silvia-certs-list">
                              {SILVIA.certificaciones.talleres.map((taller, i) => (
                                <div key={i} className="wp-cert-item wp-cert-item--taller">
                                  <i className="fas fa-star wp-cert-check" />
                                  <span>
                                    {taller.texto}
                                    <em className="wp-cert-inst"> — {taller.inst}</em>
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
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
              Coaches dedicados a{' '}
              <span>tu salud y bienestar</span>
            </h2>
            <p className="wp-section-sub mt-3">
              Cada coach de Wolf Pack está comprometido a guiarte desde donde estás — con paciencia, técnica y la motivación que necesitas para construir un estilo de vida más saludable.
            </p>
          </motion.div>

          <div className="wp-coaches-list">
            {COACHES.map((coach, i) => (
              <motion.div
                key={coach.nombre}
                className={`wp-coach-row${i % 2 === 1 ? ' wp-coach-row--reverse' : ''}`}
                style={{ '--cc': coach.color }}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-80px' }}
                custom={i * 0.1}
              >
                {/* Foto */}
                <div className="wp-coach-photo-col">
                  <div className="wp-coach-photo-wrap">
                    <CoachCarousel
                      fotos={coach.fotos}
                      nombre={coach.nombre}
                      color={coach.color}
                      fotosPos={coach.fotosPos}
                      fotosScale={coach.fotosScale}
                      onPhotoClick={(photoIdx) => setLightbox({ evento: { fotos: coach.fotos, titulo: coach.nombre }, index: photoIdx })}
                    />
                  </div>
                </div>

                {/* Texto */}
                <div className="wp-coach-text-col">
                  <span className="wp-coach-tag">{coach.rol}</span>
                  <h3 className="wp-coach-nombre">{coach.nombre}</h3>
                  <div className="wp-coach-divider" />
                  <div className="wp-coach-chips">
                    {coach.especialidades.map((e, j) => (
                      <span key={j} className="wp-coach-chip">{e}</span>
                    ))}
                  </div>
                  <div className="wp-coach-bio">
                    {coach.bio.map((p, j) => {
                      if (p.startsWith('¿')) {
                        const qEnd = p.indexOf('?') + 1;
                        const question = p.slice(0, qEnd);
                        const answer = p.slice(qEnd).trim();
                        return (
                          <div key={j} className="wp-coach-qa">
                            <span className="wp-coach-q">{question}</span>
                            {answer && <p className="wp-coach-a">{answer}</p>}
                          </div>
                        );
                      }
                      return <p key={j}>{p}</p>;
                    })}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════ EL BOX ════════════════════════════ */}
      <section className="wp-box-section">
        <motion.div
          className="wp-box-header"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          <span className="wp-stag wp-stag--gold">Nuestras Instalaciones</span>
          <h2 className="wp-section-titulo">
            Tu nuevo espacio de <span>salud y movimiento</span>
          </h2>
          <p className="wp-section-sub mt-2">
            Un ambiente diseñado para que te sientas cómodo desde el primer día — sin juicios, sin comparaciones, solo tú y tus metas.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.15 }}
        >
          <BoxCarousel slides={BOX_SLIDES} />
        </motion.div>
      </section>

      {/* ══════════════════════ EVENTOS ═════════════════════════ */}
      <section className="wp-eventos-section">
        <div className="container">
          <motion.div
            className="text-center mb-5"
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-80px' }}
          >
            <span className="wp-stag wp-stag--gold">Comunidad en Acción</span>
            <h2 className="wp-section-titulo">
              Eventos & <span>Actividades</span>
            </h2>
            <p className="wp-section-sub mt-3">
              Más allá del entrenamiento — competencias, causas sociales y momentos que nos unen como manada.
            </p>
          </motion.div>

          <div className="wp-evs-list">
            {EVENTOS.map((evento, i) => (
              <motion.div
                key={i}
                className="wp-evs-item"
                style={{ '--ec': evento.tagColor }}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-60px' }}
                custom={i * 0.05}
              >
                {/* Cabecera del evento */}
                <div className="wp-evs-head">
                  <div className="wp-evs-head-main">
                    <span className="wp-evs-tag">{evento.tag}</span>
                    <h3 className="wp-evs-titulo">{evento.titulo}</h3>
                    {evento.subtitulo && <p className="wp-evs-sub">{evento.subtitulo}</p>}
                    {evento.desc && <p className="wp-evs-desc">{evento.desc}</p>}
                  </div>
                  <span className="wp-evs-fecha">
                    <i className="fas fa-calendar-alt" /> {evento.fecha}
                  </span>
                </div>

                {/* Collage de fotos */}
                <div
                  className={`wp-evs-collage wp-evs-n${Math.min(evento.fotos.length, 8)}`}
                  style={evento.objPos ? { '--evs-obj-pos': evento.objPos } : undefined}
                >
                  {evento.fotos.slice(0, 8).map((src, j) => (
                    <div
                      key={j}
                      className={`wp-evs-photo wp-evs-p${j}`}
                      onClick={() => setLightbox({ evento, index: j })}
                    >
                      <img
                        src={src}
                        alt={`${evento.titulo} ${j + 1}`}
                        style={evento.photoPos?.[j] ? { objectPosition: evento.photoPos[j] } : undefined}
                      />
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════ CTA SALUD ════════════════════════ */}
      <section className="wp-final-cta">
        <div className="wp-final-cta-bg">
          <img src="/Grupal/IMG_9780.jpg" alt="" className="wp-final-cta-img" />
          <div className="wp-final-cta-overlay" />
        </div>
        <div className="container position-relative" style={{ zIndex: 2 }}>
          <motion.div
            className="wp-final-cta-head text-center"
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.75 }}
          >
            <span className="wp-stag wp-stag--red">Da el primer paso</span>
            <h2 className="wp-final-cta-title">
              Tu cuerpo merece<br /><span>moverse y sentirse bien</span>
            </h2>
            <p className="wp-final-cta-sub">
              No necesitas experiencia, no necesitas estar "en forma". Solo necesitas querer empezar. En Wolf Pack te recibimos donde estás y te acompañamos en cada paso del camino hacia una vida más saludable.
            </p>

            {/* Tres pilares de salud */}
            <div className="row justify-content-center g-4 mb-5">
              {[
                { icon: 'fas fa-heartbeat', titulo: 'Salud Cardiovascular', texto: 'Fortalece tu corazón y mejora tu resistencia con movimientos funcionales adaptados a ti.' },
                { icon: 'fas fa-brain',     titulo: 'Bienestar Mental',     texto: 'El ejercicio reduce el estrés, mejora el sueño y eleva tu estado de ánimo de forma natural.' },
                { icon: 'fas fa-users',     titulo: 'Comunidad que Motiva', texto: 'Rodearte de personas con las mismas metas es la herramienta más poderosa para mantenerte constante.' },
              ].map((p, i) => (
                <motion.div
                  key={i}
                  className="col-12 col-md-4"
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: i * 0.12 }}
                >
                  <div style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.09)',
                    borderRadius: '16px',
                    padding: '1.8rem 1.5rem',
                    height: '100%',
                  }}>
                    <i className={p.icon} style={{ fontSize: '1.6rem', color: '#E63946', marginBottom: '0.8rem', display: 'block' }} />
                    <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#F0F0F5', marginBottom: '0.6rem' }}>{p.titulo}</h4>
                    <p style={{ fontSize: '0.88rem', color: 'rgba(200,208,225,0.72)', lineHeight: 1.75, margin: 0 }}>{p.texto}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            <a
              href="https://www.instagram.com/thewolfpackcrossfit/"
              target="_blank"
              rel="noopener noreferrer"
              className="wp-final-btn"
            >
              <i className="fab fa-instagram" />
              Escríbenos y empieza hoy
            </a>
          </motion.div>
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

      {lightbox && (
        <Lightbox
          evento={lightbox.evento}
          startIndex={lightbox.index}
          onClose={() => setLightbox(null)}
        />
      )}
    </>
  );
}
