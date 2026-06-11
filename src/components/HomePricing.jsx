import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import '../assets/css/HomePricing.css';

// Fallback: se usa SOLO si el backend no devuelve planes activos (para que la landing nunca se vea vacía).
const PLANES_FALLBACK = [
  {
    id: 'starter', nombre: 'Starter', precio: '$1499', limite: 'Hasta 60 atletas',
    descripcion: 'Ideal para boxes chicos o en crecimiento.', costoExtra: 25,
    beneficios: ['Reserva de Clases', 'Control de Asistencia', 'Perfiles de Atletas', 'Calendario WOD', 'Ventas Básico'],
    recomendado: false
  },
  {
    id: 'pro', nombre: 'Pro', precio: '$2499', limite: 'Hasta 120 atletas',
    descripcion: 'El plan estándar para operar un box exitoso.', costoExtra: 25,
    beneficios: ['Todo lo de Starter, más:', 'Módulo de Finanzas', 'Programación de WODs', 'Atletify Kids', 'Drop-in Público', 'Stripe Connect', 'Expediente Médico'],
    recomendado: true
  },
  {
    id: 'premium', nombre: 'Premium', precio: '$3499', limite: 'Hasta 200 atletas',
    descripcion: 'Para boxes grandes o con competencias propias.', costoExtra: 25,
    beneficios: ['Todo lo de Pro, más:', 'Módulo de Competencias', 'Portales en Vivo', 'Portal para Jueces', 'Reportes Globales', 'Exportaciones Avanzadas'],
    recomendado: false
  }
];

// Mapea un PlanSaaS del backend a la forma que renderiza la tarjeta.
function mapPlan(p) {
  const limite = p.limiteAtletas ?? p.LimiteAtletas;
  const beneficiosRaw = p.beneficiosJSON ?? p.BeneficiosJSON;
  let beneficios = [];
  try { beneficios = beneficiosRaw ? JSON.parse(beneficiosRaw) : []; } catch { beneficios = []; }
  let descripcion = p.descripcion ?? p.Descripcion ?? '';
  // Fallback: si el plan no tiene Beneficios cargados pero la descripción trae varios ítems
  // separados por comas, los mostramos como LISTA (palomitas) y no como párrafo, para que se
  // vea como antes. (El jefe puede afinarlos en el editor, campo "Beneficios (uno por línea)").
  if ((!beneficios || beneficios.length === 0) && descripcion.includes(',')) {
    beneficios = descripcion.split(',').map(s => s.trim()).filter(Boolean);
    descripcion = '';
  }
  const precioNum = Number(p.precio ?? p.Precio ?? 0);
  return {
    id: String(p.idPlan ?? p.IdPlan),
    nombre: p.nombre ?? p.Nombre ?? 'Plan',
    precio: `$${precioNum.toLocaleString('es-MX', { maximumFractionDigits: 0 })}`,
    limite: (limite === 0 || limite == null) ? 'Atletas ilimitados' : `Hasta ${limite} atletas`,
    descripcion,
    costoExtra: Number(p.costoPorAtletaExtra ?? p.CostoPorAtletaExtra ?? 0),
    beneficios,
    recomendado: !!(p.esRecomendado ?? p.EsRecomendado)
  };
}

export default function HomePricing() {
  const [planes, setPlanes] = useState(PLANES_FALLBACK);

  useEffect(() => {
    let vivo = true;
    fetch(`${import.meta.env.VITE_API_URL}/api/saas/planes`)
      .then(r => (r.ok ? r.json() : []))
      .then(data => {
        if (!vivo) return;
        // Solo reemplazamos el fallback si el backend trae planes activos.
        if (Array.isArray(data) && data.length > 0) setPlanes(data.map(mapPlan));
      })
      .catch(() => { /* se queda el fallback */ });
    return () => { vivo = false; };
  }, []);

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
                        <i className={`fas ${i === 0 && index > 0 ? 'fa-plus' : 'fa-check'}`}></i>
                        {ben}
                      </li>
                    ))}
                  </ul>
                  {plan.costoExtra > 0 && (
                    <div className="pricing-extra">
                      <i className="fas fa-info-circle"></i> +${plan.costoExtra}/mes por cada atleta extra.
                    </div>
                  )}
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
