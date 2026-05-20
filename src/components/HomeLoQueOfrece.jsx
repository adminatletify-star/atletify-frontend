import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './HomeLoQueOfrece.css';

const TABS = [
  {
    id: 'wods',
    label: 'Programa tus WODs',
    icon: 'fas fa-dumbbell',
    tag: 'Entrenamiento',
    titulo: 'Programa tus WODs con total control',
    bullets: [
      'Crea y publica el WOD del día en segundos',
      'Tus atletas lo ven antes de llegar al box',
      'Historial completo de entrenamientos',
      'Añade notas y escalas por nivel',
    ],
  },
  {
    id: 'clases',
    label: 'Declara tus clases',
    icon: 'fas fa-calendar-alt',
    tag: 'Gestión',
    titulo: 'Declara tus clases a tu medida',
    bullets: [
      'Configura horarios y capacidad por clase',
      'Asigna coaches a cada sesión',
      'Control de inscripciones en tiempo real',
      'Pase de lista integrado y sin papel',
    ],
  },
  {
    id: 'atletas',
    label: 'Gestiona atletas',
    icon: 'fas fa-users',
    tag: 'Atletas',
    titulo: 'Gestiona a tus atletas en un solo lugar',
    bullets: [
      'Perfil completo de cada atleta',
      'Seguimiento de asistencia',
      'Membresías activas e historial de pagos',
      'Consulta los PRs y récords de cada atleta',
    ],
  },
  {
    id: 'finanzas',
    label: 'Controla finanzas',
    icon: 'fas fa-chart-line',
    tag: 'Finanzas',
    titulo: 'Controla las finanzas de tu box',
    bullets: [
      'Registro de pagos y membresías al día',
      'Reportes de ingresos por período',
      'Alertas de pagos vencidos automáticas',
      'Vista clara de tu flujo de caja mensual',
    ],
  },
];

const SWIPE_THRESHOLD = 60;

export default function HomeLoQueOfrece() {
  const [activo, setActivo] = useState(0);
  const [direction, setDirection] = useState(1);
  const tab = TABS[activo];

  const irA = (idx) => {
    if (idx === activo) return;
    setDirection(idx > activo ? 1 : -1);
    setActivo(idx);
  };

  const siguiente = () => irA((activo + 1) % TABS.length);
  const anterior  = () => irA((activo - 1 + TABS.length) % TABS.length);

  const handleDragEnd = (_, info) => {
    if (info.offset.x < -SWIPE_THRESHOLD) siguiente();
    else if (info.offset.x > SWIPE_THRESHOLD) anterior();
  };

  const variants = {
    enter:  (d) => ({ opacity: 0, x: d > 0 ? 60 : -60 }),
    center: { opacity: 1, x: 0 },
    exit:   (d) => ({ opacity: 0, x: d > 0 ? -60 : 60 }),
  };

  return (
    <section className="ofrece-seccion">

      <motion.div
        className="ofrece-header"
        initial={{ opacity: 0, y: 28 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 0.7 }}
      >
        <h2 className="ofrece-titulo-principal">
          Todo lo que tu box necesita,<br />
          <span className="ofrece-titulo-acento">en un solo lugar</span>
        </h2>
      </motion.div>

      {/* ── Tabs ── */}
      <motion.div
        className="ofrece-tabs"
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 0.6, delay: 0.15 }}
      >
        {TABS.map((t, i) => (
          <button
            key={t.id}
            className={`ofrece-tab${activo === i ? ' ofrece-tab--activo' : ''}`}
            onClick={() => irA(i)}
          >
            {t.label}
          </button>
        ))}
      </motion.div>

      {/* ── Card con swipe ── */}
      <div className="ofrece-card-wrap">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={tab.id}
            className="ofrece-card"
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.4, ease: [0.32, 0, 0.67, 0] }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.12}
            onDragEnd={handleDragEnd}
            style={{ cursor: 'grab' }}
            whileDrag={{ cursor: 'grabbing' }}
          >
            <div className="ofrece-card-icon">
              <i className={tab.icon} />
            </div>
            <span className="ofrece-tag">{tab.tag}</span>
            <h3 className="ofrece-subtitulo">{tab.titulo}</h3>
            <ul className="ofrece-bullets">
              {tab.bullets.map(b => (
                <li key={b}>
                  <i className="fas fa-bolt ofrece-bullet-icono" />
                  {b}
                </li>
              ))}
            </ul>
          </motion.div>
        </AnimatePresence>

        {/* Dots */}
        <div className="ofrece-dots">
          {TABS.map((_, i) => (
            <button
              key={i}
              className={`ofrece-dot${activo === i ? ' ofrece-dot--activo' : ''}`}
              onClick={() => irA(i)}
              aria-label={`Tab ${i + 1}`}
            />
          ))}
        </div>
      </div>

    </section>
  );
}
