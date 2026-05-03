import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function RegistroBoxSaaS() {
    const { idPlan } = useParams();
    const navigate = useNavigate();
    const [plan, setPlan] = useState(null);
    const [loading, setLoading] = useState(true);
    const [procesando, setProcesando] = useState(false);
    
    const [formData, setFormData] = useState({
        nombreBox: '',
        pais: 'México',
        estado: '',
        ciudad: '',
        nombreAdmin: '',
        apellidosAdmin: '',
        correo: '',
        contrasena: '',
        requiereCapacitacion: false
    });

    useEffect(() => {
        const fetchPlan = async () => {
            try {
                const res = await fetch(`${import.meta.env.VITE_API_URL}/api/saas/planes`);
                const data = await res.json();
                const p = data.find(x => x.idPlan === parseInt(idPlan));
                if (p) {
                    setPlan(p);
                } else {
                    navigate('/'); // Plan no encontrado
                }
            } catch(e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchPlan();
    }, [idPlan, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setProcesando(true);
        try {
            const payload = {
                idPlan: plan.idPlan,
                ...formData,
                successUrl: `${window.location.origin}/login?b2b_success=1`,
                cancelUrl: `${window.location.origin}/registro-b2b/${plan.idPlan}`
            };

            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/saas/onboarding-b2b`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.mensaje || 'Error al procesar el registro');

            if (data.url) {
                window.location.href = data.url; // Redirigir a Stripe
            } else {
                alert('Registro completado.');
                navigate('/login');
            }
        } catch (error) {
            alert(error.message);
            setProcesando(false);
        }
    };

    if (loading) return <div className="min-vh-100 bg-dark d-flex justify-content-center align-items-center"><div className="spinner-border text-info" /></div>;
    if (!plan) return null;

    return (
        <div className="min-vh-100 d-flex align-items-center justify-content-center" style={{ backgroundColor: '#111' }}>
            <div className="container py-5">
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="row justify-content-center"
                >
                    <div className="col-lg-10">
                        <div className="card bg-dark border-0 shadow-lg rounded-4 overflow-hidden">
                            <div className="row g-0">
                                {/* Resumen del Plan */}
                                <div className="col-md-4 p-5 d-flex flex-column" style={{ background: 'linear-gradient(135deg, #2c3e50 0%, #000000 100%)' }}>
                                    <h2 className="text-white fw-bold mb-4">Resumen de tu Suscripción</h2>
                                    
                                    <div className="mb-4">
                                        <div className="text-warning small text-uppercase fw-bold mb-1">{plan.categoria}</div>
                                        <h3 className="text-white display-6 fw-bold mb-0">{plan.nombre}</h3>
                                    </div>
                                    
                                    <div className="mb-4">
                                        <div className="text-white fs-2 fw-bolder">${plan.precio}</div>
                                        <div className="text-muted">MXN / {plan.mesesDuracion === 1 ? 'mes' : plan.mesesDuracion === 12 ? 'año' : plan.mesesDuracion + ' meses'}</div>
                                    </div>

                                    <div className="text-muted small mb-4 flex-grow-1">
                                        Has seleccionado el plan <strong>{plan.nombre}</strong>. Serás redirigido a Stripe para completar el pago de tu primera suscripción y activar tu plataforma.
                                    </div>

                                    {plan.costoCapacitacion > 0 && (
                                        <div className="card bg-black border-secondary p-3 mt-auto">
                                            <div className="d-flex justify-content-between align-items-center">
                                                <div>
                                                    <div className="text-white fw-bold">Capacitación Inicial</div>
                                                    <div className="text-muted small">Opcional (+ ${plan.costoCapacitacion})</div>
                                                </div>
                                                <div className="form-check form-switch fs-4">
                                                    <input 
                                                        className="form-check-input cursor-pointer" 
                                                        type="checkbox" 
                                                        checked={formData.requiereCapacitacion}
                                                        onChange={(e) => setFormData({...formData, requiereCapacitacion: e.target.checked})}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Formulario */}
                                <div className="col-md-8 p-5 text-white">
                                    <h3 className="mb-4 text-emerald-400 font-bold">Crea tu cuenta B2B</h3>
                                    <form onSubmit={handleSubmit}>
                                        <h5 className="mb-3 border-bottom border-secondary pb-2">1. Información del Box</h5>
                                        <div className="row g-3 mb-4">
                                            <div className="col-12">
                                                <label className="form-label text-muted small">Nombre del Box</label>
                                                <input type="text" className="form-control bg-black text-white border-secondary shadow-none" required value={formData.nombreBox} onChange={e => setFormData({...formData, nombreBox: e.target.value})} />
                                            </div>
                                            <div className="col-md-4">
                                                <label className="form-label text-muted small">País</label>
                                                <input type="text" className="form-control bg-black text-white border-secondary shadow-none" required value={formData.pais} onChange={e => setFormData({...formData, pais: e.target.value})} />
                                            </div>
                                            <div className="col-md-4">
                                                <label className="form-label text-muted small">Estado</label>
                                                <input type="text" className="form-control bg-black text-white border-secondary shadow-none" required value={formData.estado} onChange={e => setFormData({...formData, estado: e.target.value})} />
                                            </div>
                                            <div className="col-md-4">
                                                <label className="form-label text-muted small">Ciudad</label>
                                                <input type="text" className="form-control bg-black text-white border-secondary shadow-none" required value={formData.ciudad} onChange={e => setFormData({...formData, ciudad: e.target.value})} />
                                            </div>
                                        </div>

                                        <h5 className="mb-3 border-bottom border-secondary pb-2">2. Administrador Principal</h5>
                                        <div className="row g-3 mb-4">
                                            <div className="col-md-6">
                                                <label className="form-label text-muted small">Nombre(s)</label>
                                                <input type="text" className="form-control bg-black text-white border-secondary shadow-none" required value={formData.nombreAdmin} onChange={e => setFormData({...formData, nombreAdmin: e.target.value})} />
                                            </div>
                                            <div className="col-md-6">
                                                <label className="form-label text-muted small">Apellidos</label>
                                                <input type="text" className="form-control bg-black text-white border-secondary shadow-none" required value={formData.apellidosAdmin} onChange={e => setFormData({...formData, apellidosAdmin: e.target.value})} />
                                            </div>
                                            <div className="col-md-6">
                                                <label className="form-label text-muted small">Correo Electrónico (Login)</label>
                                                <input type="email" className="form-control bg-black text-white border-secondary shadow-none" required value={formData.correo} onChange={e => setFormData({...formData, correo: e.target.value})} />
                                            </div>
                                            <div className="col-md-6">
                                                <label className="form-label text-muted small">Contraseña Segura</label>
                                                <input type="password" className="form-control bg-black text-white border-secondary shadow-none" required value={formData.contrasena} onChange={e => setFormData({...formData, contrasena: e.target.value})} />
                                            </div>
                                        </div>

                                        <div className="d-grid mt-5">
                                            <button type="submit" className="btn btn-warning py-3 fw-bold fs-5 shadow" disabled={procesando}>
                                                {procesando ? 'Creando cuenta...' : 'Proceder al Pago en Stripe <i className="fab fa-stripe ms-2"></i>'}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
