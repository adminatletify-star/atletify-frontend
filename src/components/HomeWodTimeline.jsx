import { motion } from 'framer-motion';
import './HomeWodTimeline.css';

const WOD_FASES = [
  {
    num: '01',
    titulo: 'Calentamiento',
    duracion: '10–15 min',
    descripcion:
      'Movilidad articular, activación muscular y preparación cardiovascular. El cuerpo enciende sus sistemas energéticos para el trabajo intenso que viene.',
    icono: 'fas fa-fire-alt',
    color: '#4FC3F7',
  },
  {
    num: '02',
    titulo: 'Skill / Strength',
    duracion: '15–20 min',
    descripcion:
      'Práctica de movimiento técnico o trabajo de fuerza. El cerebro y el músculo aprendiendo juntos a través de repetición intencional y deliberada.',
    icono: 'fas fa-dumbbell',
    color: '#F5A623',
  },
  {
    num: '03',
    titulo: 'Briefing del WOD',
    duracion: '5 min',
    descripcion:
      'El coach explica movimientos, escalados y estrategia. Aquí nace el plan de batalla y cada atleta decide cómo va a atacar el WOD.',
    icono: 'fas fa-chalkboard-teacher',
    color: '#E63946',
  },
  {
    num: '04',
    titulo: 'Ejecución del WOD',
    duracion: 'AMRAP · RFT · EMOM',
    descripcion:
      'El momento de verdad. Cada repetición cuenta, cada segundo importa. La mente se convierte en el músculo más importante del cuerpo.',
    icono: 'fas fa-bolt',
    color: '#E63946',
  },
  {
    num: '05',
    titulo: 'Cool Down',
    duracion: '10 min',
    descripcion:
      'Estiramientos y recuperación activa. El trabajo no termina cuando suena el timer — el cuerpo merece un cierre consciente y honesto.',
    icono: 'fas fa-wind',
    color: '#2ECC71',
  },
  {
    num: '06',
    titulo: 'Score & Log',
    duracion: '2–3 min',
    descripcion:
      'Registras tu tiempo, rondas o peso en el sistema. La accountability es parte del protocolo CrossFit. Lo que no se mide, no mejora.',
    icono: 'fas fa-clipboard-check',
    color: '#A8B2D1',
  },
];

function WodFaseContent({ fase }) {
  return (
    <>
      <div className="wod-tl-header d-flex align-items-center gap-3 mb-3">
        <div className="wod-tl-icono">
          <i className={fase.icono} />
        </div>
        <div>
          <span className="wod-tl-num">{fase.num}</span>
          <span className="wod-tl-duracion d-block">{fase.duracion}</span>
        </div>
      </div>
      <h4 className="wod-tl-titulo">{fase.titulo}</h4>
      <p className="wod-tl-desc mb-0">{fase.descripcion}</p>
    </>
  );
}

export default function HomeWodTimeline() {
  return (
    <section className="wod-tl-seccion">
      <div className="container">

        <motion.div
          className="text-center mb-5"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.7 }}
        >
          <span className="seccion-tag">El Protocolo</span>
          <h2 className="seccion-titulo">
            Anatomía de un <span className="text-danger">WOD</span>
          </h2>
          <p className="seccion-subtitulo">
            Cada sesión tiene una estructura exacta. Conocerla te da ventaja.
          </p>
        </motion.div>

        <div className="wod-tl-wrapper position-relative">

          {/* Eje vertical central — solo visible en desktop (md+) */}
          <div className="wod-tl-axis d-none d-md-block" />

          {WOD_FASES.map((fase, i) => {
            const esImpar = i % 2 !== 0;
            return (
              <div key={fase.num} className="row g-0 align-items-center wod-tl-entry">

                {/* Columna izquierda */}
                <div className={`col-md-5 ${!esImpar ? 'col-12' : 'd-none d-md-block'}`}>
                  {!esImpar && (
                    <motion.div
                      className="wod-tl-card"
                      style={{ '--fase-color': fase.color }}
                      initial={{ opacity: 0, x: -45 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true, amount: 0.25 }}
                      transition={{ duration: 0.55, delay: i * 0.06 }}
                    >
                      <WodFaseContent fase={fase} />
                    </motion.div>
                  )}
                </div>

                {/* Dot central — solo desktop */}
                <div className="col-md-2 d-none d-md-flex justify-content-center align-items-center">
                  <div className="wod-tl-dot" style={{ '--fase-color': fase.color }}>
                    <i className={fase.icono} />
                  </div>
                </div>

                {/* Columna derecha */}
                <div className={`col-md-5 ${esImpar ? 'col-12' : 'd-none d-md-block'}`}>
                  {esImpar && (
                    <motion.div
                      className="wod-tl-card"
                      style={{ '--fase-color': fase.color }}
                      initial={{ opacity: 0, x: 45 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true, amount: 0.25 }}
                      transition={{ duration: 0.55, delay: i * 0.06 }}
                    >
                      <WodFaseContent fase={fase} />
                    </motion.div>
                  )}
                </div>

              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
