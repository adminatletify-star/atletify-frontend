import { motion } from 'framer-motion';
import './HomeLegendasArena.css';

const LEYENDAS = [
  {
    nombre: 'MURPH',
    tipo: 'hero',
    dedicado: 'Lt. Michael P. Murphy',
    periodo: '† 2005 · Afghanistan',
    historia:
      'Navy SEAL y recipiente de la Medal of Honor. "Body Armor" era su WOD personal favorito. Hoy, cada Memorial Day, millones de atletas cargan 20 libras y hacen Murph para recordar que algunos pagaron el precio máximo por la libertad.',
    cita: '"No cargamos el chaleco para sentir el peso. Lo cargamos para no olvidar el suyo."',
    color: '#F5A623',
    icono: 'fas fa-star',
    ejercicios: '1 mi Run · 100 Pull-ups · 200 Push-ups · 300 Squats · 1 mi Run',
  },
  {
    nombre: 'FRAN',
    tipo: 'girl',
    dedicado: 'El WOD original',
    periodo: '~1996 · Santa Cruz, CA',
    historia:
      'Uno de los primeros benchmarks documentados por Greg Glassman. El nombre sigue la tradición de nombrar huracanes — porque así se siente al llegar al set de 9. Thrusters más pull-ups: la ecuación más brutal de la simplicidad extrema.',
    cita: '"Si puedes hablar al terminar Fran, no la hiciste bien."',
    color: '#E63946',
    icono: 'fas fa-bolt',
    ejercicios: '21-15-9 · Thrusters 43 kg · Pull-ups',
  },
  {
    nombre: 'DIANE',
    tipo: 'girl',
    dedicado: 'El poder invertido',
    periodo: '~2003 · CrossFit HQ',
    historia:
      'Una de las primeras WODs publicadas en el sitio web original de CrossFit. Deadlifts pesados seguidos de handstand push-ups — dos extremos del espectro de la fuerza humana. Diane revela qué tan completo es realmente tu fitness.',
    cita: '"El handstand push-up es el press de hombro que nunca supiste que necesitabas."',
    color: '#4FC3F7',
    icono: 'fas fa-arrows-alt-v',
    ejercicios: '21-15-9 · Deadlift 102 kg · HSPU',
  },
  {
    nombre: 'JACKIE',
    tipo: 'girl',
    dedicado: 'La triada perfecta',
    periodo: '2009 · CrossFit Journal',
    historia:
      'Remo, Thrusters y Pull-ups. Jackie apareció como un test de fitness total en menos de 10 minutos. Combina potencia aeróbica, fuerza funcional y habilidad técnica en un paquete devastadoramente eficiente para medir tu condición real.',
    cita: '"El remo te mentirá sobre tu estado. Los Thrusters dirán la verdad."',
    color: '#2ECC71',
    icono: 'fas fa-water',
    ejercicios: '1000 m Row · 50 Thrusters 20 kg · 30 Pull-ups',
  },
];

export default function HomeLegendasArena() {
  return (
    <section className="leyendas-seccion">
      <div className="container">

        <motion.div
          className="text-center mb-5"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.7 }}
        >
          <span className="seccion-tag">El Origen</span>
          <h2 className="seccion-titulo">
            Leyendas de <span className="text-danger">la Arena</span>
          </h2>
          <p className="seccion-subtitulo">
            Cada WOD lleva un nombre. Cada nombre tiene una historia que vale la pena conocer.
          </p>
        </motion.div>

        <div className="row g-4">
          {LEYENDAS.map((leyenda, i) => (
            <div key={leyenda.nombre} className="col-12 col-md-6">
              <motion.div
                className="leyenda-card"
                style={{ '--leyenda-color': leyenda.color }}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.6, delay: i * 0.1 }}
              >
                {/* Watermark del nombre de fondo */}
                <span className="leyenda-watermark" aria-hidden="true">
                  {leyenda.nombre}
                </span>

                {/* Header */}
                <div className="leyenda-header d-flex align-items-start gap-3">
                  <div className="leyenda-icono">
                    <i className={leyenda.icono} />
                  </div>
                  <div className="flex-grow-1 min-w-0">
                    <div className="d-flex align-items-center gap-2 flex-wrap mb-1">
                      <h3 className="leyenda-nombre mb-0">{leyenda.nombre}</h3>
                      <span className={`leyenda-badge leyenda-badge--${leyenda.tipo}`}>
                        {leyenda.tipo === 'hero' ? '☆ Hero WOD' : '♀ The Girls'}
                      </span>
                    </div>
                    <span className="leyenda-dedicado">{leyenda.dedicado}</span>
                    <span className="leyenda-periodo">{leyenda.periodo}</span>
                  </div>
                </div>

                {/* Historia */}
                <p className="leyenda-historia">{leyenda.historia}</p>

                {/* Ejercicios */}
                <div className="leyenda-ejercicios">
                  <i className="fas fa-list-ul" />
                  <span>{leyenda.ejercicios}</span>
                </div>

                {/* Cita */}
                <blockquote className="leyenda-cita">
                  {leyenda.cita}
                </blockquote>

                {/* Glow inferior */}
                <div className="leyenda-glow" aria-hidden="true" />
              </motion.div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
