import React from 'react';
import { motion } from 'framer-motion';

const HomePricingSaaS = () => {
    const fadeUp = {
        hidden: { opacity: 0, y: 40 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.7 } },
    };

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
                    <h2 className="display-4 fw-bold mt-2 mb-4">
                        ¿Quieres utilizar <span className="text-danger">nuestro sistema</span>?
                    </h2>
                    <p className="text-gray-400 text-lg max-w-2xl mx-auto mb-5">
                        Lleva la administración de tu box al siguiente nivel. Contáctanos directamente para ofrecerte una asesoría y una cotización a la medida de tu comunidad.
                    </p>
                </motion.div>

                <div className="row justify-content-center g-4 mt-2">
                    <div className="col-12 col-md-8 col-lg-6">
                        <motion.div
                            className="card bg-dark text-white shadow-lg border-0 rounded-4 overflow-hidden"
                            style={{ border: '2px solid #333' }}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, amount: 0.2 }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                        >
                            <div className="card-body p-5 text-center">
                                <h3 className="card-title text-2xl font-bold mb-4">¡Hablemos!</h3>
                                <p className="text-secondary mb-5">
                                    Estamos listos para ayudarte a optimizar la gestión de tus atletas, clases y finanzas.
                                </p>
                                
                                <div className="d-flex flex-column gap-3 align-items-center">
                                    {/* Botón WhatsApp */}
                                    <a 
                                        href="#" 
                                        className="btn btn-success w-75 py-3 fw-bold rounded-pill d-flex align-items-center justify-content-center gap-2"
                                        style={{ backgroundColor: '#25D366', borderColor: '#25D366', fontSize: '1.1rem' }}
                                    >
                                        <i className="fab fa-whatsapp fs-4"></i>
                                        Contactar por WhatsApp
                                    </a>
                                    
                                    {/* Botón Instagram */}
                                    <a 
                                        href="#" 
                                        className="btn btn-outline-light w-75 py-3 fw-bold rounded-pill d-flex align-items-center justify-content-center gap-2"
                                    >
                                        <i className="fab fa-instagram fs-4 text-danger"></i>
                                        Síguenos en Instagram
                                    </a>

                                    {/* Botón Facebook */}
                                    <a 
                                        href="#" 
                                        className="btn btn-outline-light w-75 py-3 fw-bold rounded-pill d-flex align-items-center justify-content-center gap-2"
                                    >
                                        <i className="fab fa-facebook fs-4 text-primary"></i>
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
