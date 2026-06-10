import { motion } from 'framer-motion';
import '../assets/css/HomePricing.css';

export default function HomePricing() {
  const planes = [
    {
      id: 'starter',
      nombre: 'Starter',
      precio: '$1499',
      limite: 'Hasta 60 atletas',
      descripcion: 'Ideal para boxes chicos o en crecimiento.',
      beneficios: [
        'Reserva de Clases',
        'Control de Asistencia',
        'Perfiles de Atletas',
        'Calendario WOD',
        'Ventas Básico'
      ],
      recomendado: false
    },
    {
      id: 'pro',
      nombre: 'Pro',
      precio: '$2499',
      limite: 'Hasta 120 atletas',
      descripcion: 'El plan estándar para operar un box exitoso.',
      beneficios: [
        'Todo lo de Starter, más:',
        'Módulo de Finanzas',
        'Programación de WODs',
        'Atletify Kids',
        'Drop-in Público',
        'Stripe Connect',
        'Expediente Médico'
      ],
      recomendado: true
    },
    {
      id: 'premium',
      nombre: 'Premium',
      precio: '$3499',
      limite: 'Hasta 200 atletas',
      descripcion: 'Para boxes grandes o con competencias propias.',
      beneficios: [
        'Todo lo de Pro, más:',
        'Módulo de Competencias',
        'Portales en Vivo',
        'Portal para Jueces',
        'Reportes Globales',
        'Exportaciones Avanzadas'
      ],
      recomendado: false
    }
  ];

  return (
    <section className="home-pricing-section" id="planes">
      <div className="container py-5">
        <div className="text-center mb-5">
          <motion.h2 
            className="home-pricing-title"
            initial={{ opacity: 0, y: -20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            Planes y <span>Precios</span>
          </motion.h2>
          <motion.p 
            className="home-pricing-subtitle"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            Invierte en el crecimiento de tu Box. Precios transparentes y sin comisiones ocultas.
          </motion.p>
        </div>

        <div className="row g-4 justify-content-center pricing-row">
          {planes.map((plan, index) => (
            <div key={plan.id} className="col-12 col-md-6 col-lg-4">
              <motion.div 
                className={`pricing-card ${plan.recomendado ? 'pricing-card-recomendado' : ''}`}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.2 + (index * 0.1) }}
              >
                {plan.recomendado && (
                  <div className="pricing-badge">RECOMENDADO</div>
                )}
                
                <div className="pricing-header">
                  <h3>{plan.nombre}</h3>
                  <p>{plan.descripcion}</p>
                </div>
                
                <div className="pricing-price">
                  <h2>{plan.precio} <span>MXN/mes</span></h2>
                  <div className="pricing-limit">
                    <i className="fas fa-users"></i> {plan.limite}
                  </div>
                </div>

                <div className="pricing-body">
                  <ul className="pricing-features">
                    {plan.beneficios.map((ben, i) => (
                      <li key={i}>
                        <i className={`fas ${i === 0 && plan.id !== 'starter' ? 'fa-plus' : 'fa-check'}`}></i>
                        {ben}
                      </li>
                    ))}
                  </ul>
                  <div className="pricing-extra">
                    <i className="fas fa-info-circle"></i> +$25/mes por cada atleta extra.
                  </div>
                </div>
                
                <div className="pricing-footer">
                  <button className={`btn w-100 ${plan.recomendado ? 'btn-danger' : 'btn-outline-light'}`}>
                    Elegir {plan.nombre}
                  </button>
                </div>
              </motion.div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
