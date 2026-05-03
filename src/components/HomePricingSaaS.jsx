import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const HomePricingSaaS = () => {
    const [planes, setPlanes] = useState([]);
    const [anual, setAnual] = useState(false);

    useEffect(() => {
        const fetchPlanes = async () => {
            try {
                const res = await fetch(`${import.meta.env.VITE_API_URL}/api/saas/planes`);
                const data = await res.json();
                setPlanes(data);
            } catch (err) {
                console.error("Error al cargar planes:", err);
            }
        };
        fetchPlanes();
    }, []);

    const fadeUp = {
        hidden: { opacity: 0, y: 40 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.7 } },
    };

    if (planes.length === 0) return null;

    return (
        <section className="pricing-seccion py-5" style={{ backgroundColor: '#111', color: '#fff' }}>
            <div className="container py-5">
                <motion.div
                    className="text-center mb-5"
                    variants={fadeUp}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.4 }}
                >
                    <span className="seccion-tag text-emerald-400 font-bold tracking-wider uppercase" style={{ color: '#2ECC71' }}>Para Dueños de Box</span>
                    <h2 className="display-4 fw-bold mt-2 mb-3">
                        Lleva la administración al <span className="text-danger">siguiente nivel</span>
                    </h2>
                    <p className="text-gray-400 text-lg max-w-2xl mx-auto mb-4">
                        Elige el plan B2B SaaS que mejor se adapte al tamaño de tu comunidad y comienza a automatizar hoy.
                    </p>

                    {/* Filtros de Categoría */}
                    <div className="d-flex justify-content-center align-items-center gap-3 flex-wrap mb-5">
                        {['Administración', 'Competencias', 'Plataforma Integral'].map(cat => (
                            <button 
                                key={cat} 
                                className={`btn rounded-pill px-4 ${anual === cat ? 'btn-danger' : 'btn-outline-light'}`}
                                onClick={() => setAnual(cat)}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </motion.div>

                <div className="row justify-content-center g-4">
                    {planes.filter(p => !anual || p.categoria === anual || (anual === false && true)).map((plan, i) => {
                        let beneficios = [];
                        if (plan.beneficiosJSON) {
                            beneficios = plan.beneficiosJSON.split(',').map(b => b.trim());
                        }
                        
                        return (
                        <div key={plan.idPlan} className="col-12 col-md-6 col-lg-4">
                            <motion.div
                                className={`card h-100 bg-dark text-white shadow-lg border-0 position-relative rounded-4 overflow-hidden ${plan.esRecomendado ? 'border-2 border-warning transform scale-105' : ''}`}
                                style={plan.esRecomendado ? { border: '2px solid #F5A623', transform: 'scale(1.05)', zIndex: 2 } : { border: '1px solid #333' }}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, amount: 0.2 }}
                                transition={{ duration: 0.5, delay: i * 0.15 }}
                            >
                                {plan.esRecomendado && (
                                    <div className="position-absolute top-0 end-0 bg-warning text-dark px-4 py-1 fw-bold" style={{ borderBottomLeftRadius: '1rem' }}>
                                        <i className="fas fa-star me-1"></i> Recomendado
                                    </div>
                                )}
                                
                                <div className="card-body p-5">
                                    <h3 className="card-title text-center mb-1 text-2xl font-bold">{plan.nombre}</h3>
                                    <div className="text-center text-secondary small mb-2">{plan.categoria}</div>
                                    
                                    <div className="text-center my-4">
                                        <span className="fs-1 fw-bolder">${plan.precio}</span>
                                        <span className="text-muted"> MXN / {plan.mesesDuracion === 1 ? 'mes' : plan.mesesDuracion === 12 ? 'año' : plan.mesesDuracion + ' meses'}</span>
                                    </div>

                                    <ul className="list-unstyled mb-5">
                                        <li className="mb-3">
                                            <i className="fas fa-check-circle text-success me-2"></i> 
                                            Hasta <strong>{plan.limiteAtletas === 0 ? 'Ilimitados' : plan.limiteAtletas} atletas</strong>
                                        </li>
                                        <li className="mb-3">
                                            <i className="fas fa-check-circle text-success me-2"></i> 
                                            Coaches y Admins ilimitados
                                        </li>
                                        {plan.costoPorAtletaExtra > 0 && (
                                            <li className="mb-3">
                                                <i className="fas fa-check-circle text-success me-2"></i> 
                                                Costo por atleta extra: <span className="text-info">${plan.costoPorAtletaExtra}</span>
                                            </li>
                                        )}
                                        {beneficios.map((ben, idx) => (
                                            <li key={idx} className="mb-3">
                                                <i className="fas fa-check-circle text-success me-2"></i> 
                                                {ben}
                                            </li>
                                        ))}
                                    </ul>

                                    <div className="text-center mt-auto">
                                        <a href={`/registro-b2b/${plan.idPlan}`} className={`btn w-100 py-3 fw-bold rounded-3 ${plan.esRecomendado ? 'btn-warning text-dark' : 'btn-outline-light'}`}>
                                            Seleccionar Plan
                                        </a>
                                    </div>
                                </div>
                                </motion.div>
                        </div>
                    )})}
                </div>
            </div>
        </section>
    );
};

export default HomePricingSaaS;
