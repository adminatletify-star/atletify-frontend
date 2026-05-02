import { useState } from 'react';
import { motion } from 'framer-motion';
import './HomeMitosRealidad.css';

const MITOS = [
  {
    mito: 'El CrossFit te lesiona inevitablemente',
    realidad:
      'Las lesiones ocurren por mala técnica o ego descontrolado. Con coaching adecuado y escalado correcto, el riesgo es comparable a cualquier deporte bien practicado.',
    iconoMito: 'fas fa-skull-crossbones',
    iconoRealidad: 'fas fa-shield-alt',
  },
  {
    mito: 'Solo es para atletas de élite',
    realidad:
      'Cada WOD tiene variaciones escaladas. No importa si eres principiante o competidor — el CrossFit se adapta a ti. La única comparación válida eres tú mismo.',
    iconoMito: 'fas fa-medal',
    iconoRealidad: 'fas fa-users',
  },
  {
    mito: 'Las mujeres se "masculinizan"',
    realidad:
      'El CrossFit tonifica, define y desarrolla fuerza funcional. Las atletas que lo practican tienen cuerpos fuertes y mayor salud hormonal a largo plazo.',
    iconoMito: 'fas fa-question-circle',
    iconoRealidad: 'fas fa-venus',
  },
  {
    mito: 'Es solo cardio extremo y caótico',
    realidad:
      'Integra fuerza, potencia, resistencia cardiovascular, movilidad y habilidades técnicas. Es fitness completo con programación científica, no una sola dimensión.',
    iconoMito: 'fas fa-heartbeat',
    iconoRealidad: 'fas fa-layer-group',
  },
  {
    mito: 'El WOD es siempre igual y monótono',
    realidad:
      '"Constantly varied" es un pilar del CrossFit. No hay dos WODs iguales en la semana. La variación constante genera adaptación real y elimina el estancamiento.',
    iconoMito: 'fas fa-times-circle',
    iconoRealidad: 'fas fa-infinity',
  },
  {
    mito: 'Necesitas estar en forma para empezar',
    realidad:
      'Empiezas exactamente donde estás hoy. El primer WOD te encontrará en tu nivel y te llevará al siguiente. Ese es el diseño. Ese es el propósito.',
    iconoMito: 'fas fa-ban',
    iconoRealidad: 'fas fa-rocket',
  },
];

function MitoCard({ item, index }) {
  const [flipped, setFlipped] = useState(false);

  return (
    <motion.div
      className="col-12 col-sm-6 col-lg-4"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.5, delay: index * 0.07 }}
    >
      <div
        className={`mito-flip-container ${flipped ? 'mito-flip-container--flipped' : ''}`}
        onClick={() => setFlipped(!flipped)}
        role="button"
        aria-label={flipped ? 'Ver el mito' : 'Revelar la realidad'}
      >
        <div className="mito-flip-inner">

          {/* Frente — MITO */}
          <div className="mito-face mito-face--front">
            <div className="mito-icono mito-icono--mito">
              <i className={item.iconoMito} />
            </div>
            <span className="mito-etiqueta mito-etiqueta--mito">MITO</span>
            <h4 className="mito-texto">{item.mito}</h4>
            <div className="mito-hint">
              <i className="fas fa-sync-alt me-1" />
              Toca para revelar la realidad
            </div>
          </div>

          {/* Dorso — REALIDAD */}
          <div className="mito-face mito-face--back">
            <div className="mito-icono mito-icono--realidad">
              <i className={item.iconoRealidad} />
            </div>
            <span className="mito-etiqueta mito-etiqueta--realidad">REALIDAD</span>
            <p className="mito-realidad-texto">{item.realidad}</p>
            <div className="mito-hint mito-hint--back">
              <i className="fas fa-undo me-1" />
              Toca para volver
            </div>
          </div>

        </div>
      </div>
    </motion.div>
  );
}

export default function HomeMitosRealidad() {
  return (
    <section className="mitos-seccion">
      <div className="container">

        <motion.div
          className="text-center mb-5"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.7 }}
        >
          <span className="seccion-tag">Rompe las cadenas</span>
          <h2 className="seccion-titulo">
            Mitos vs. <span className="text-danger">Realidad</span>
          </h2>
          <p className="seccion-subtitulo">
            Toca cada tarjeta para descubrir la verdad detrás del CrossFit
          </p>
        </motion.div>

        <div className="row g-4">
          {MITOS.map((item, i) => (
            <MitoCard key={i} item={item} index={i} />
          ))}
        </div>

      </div>
    </section>
  );
}
