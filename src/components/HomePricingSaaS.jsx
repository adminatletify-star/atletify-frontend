import React from 'react';
import { motion } from 'framer-motion';

const HomePricingSaaS = () => {
    const fadeUp = {
        hidden: { opacity: 0, y: 40 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.7 } },
    };

    return (
        <section className="pricing-seccion py-5" style={{ background: 'linear-gradient(180deg, var(--bg-base) 0%, #0d0d14 100%)', position: 'relative' }}>
            <div className="container py-5">
                <motion.div
                    className="text-center mb-5"
                    variants={fadeUp}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.4 }}
                >
                    <span className="seccion-tag" style={{ borderColor: 'rgba(46, 204, 113, 0.3)', background: 'rgba(46, 204, 113, 0.06)', color: '#2ECC71' }}>
                        Para Dueños de Box
                    </span>
                    <h2 className="seccion-titulo mt-3">
                        ¿Quieres utilizar <span className="text-danger">nuestro sistema</span>?
                    </h2>
                    <p className="seccion-subtitulo mt-3 mb-5">
                        Lleva la administración de tu box al siguiente nivel. Contáctanos directamente para ofrecerte una asesoría y una cotización a la medida de tu comunidad.
                    </p>
                </motion.div>

                <div className="row justify-content-center g-4 mt-2">
                    <div className="col-12 col-md-8 col-lg-6">
                        <motion.div
                            className="pricing-card text-white overflow-hidden"
                            style={{ 
                                background: 'linear-gradient(145deg, var(--bg-card) 0%, #0a0a10 100%)',
                                border: '1px solid var(--border)',
                                borderRadius: '20px',
                                boxShadow: '0 20px 50px rgba(0, 0, 0, 0.4)'
                            }}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, amount: 0.2 }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                        >
                            <div className="card-body p-5 text-center">
                                <h3 className="card-title text-2xl font-bold mb-4" style={{ fontFamily: 'var(--font-heading)', letterSpacing: '1px' }}>¡Hablemos!</h3>
                                <p className="text-secondary mb-5" style={{ fontFamily: 'var(--font-body)' }}>
                                    Estamos listos para ayudarte a optimizar la gestión de tus atletas, clases y finanzas.
                                </p>
                                
                                <div className="d-flex flex-column gap-3 align-items-center">
                                    {/* Botón WhatsApp */}
                                    <a 
                                        href="#" 
                                        className="btn w-75 py-3 fw-bold rounded-pill d-flex align-items-center justify-content-center gap-2"
                                        style={{ backgroundColor: '#25D366', color: '#fff', border: 'none', fontSize: '1.05rem', boxShadow: '0 4px 15px rgba(37, 211, 102, 0.3)' }}
                                    >
                                        <i className="fab fa-whatsapp fs-4"></i>
                                        Contactar por WhatsApp
                                    </a>
                                    
                                    {/* Botón Instagram */}
                                    <a 
                                        href="#" 
                                        className="btn w-75 py-3 fw-bold rounded-pill d-flex align-items-center justify-content-center gap-2"
                                        style={{ background: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', fontSize: '0.95rem' }}
                                    >
                                        <i className="fab fa-instagram fs-4 text-danger"></i>
                                        Síguenos en Instagram
                                    </a>

                                    {/* Botón Facebook */}
                                    <a 
                                        href="#" 
                                        className="btn w-75 py-3 fw-bold rounded-pill d-flex align-items-center justify-content-center gap-2"
                                        style={{ background: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', fontSize: '0.95rem' }}
                                    >
                                        <i className="fab fa-facebook fs-4" style={{ color: '#4FC3F7' }}></i>
                                        Síguenos en Facebook
                                    </a>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default HomePricingSaaS;
