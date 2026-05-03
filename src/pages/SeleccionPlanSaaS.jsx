import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

const SeleccionPlanSaaS = () => {
    const [planes, setPlanes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [procesando, setProcesando] = useState(false);
    const [esAnual, setEsAnual] = useState(false);
    const [codigo, setCodigo] = useState('');
    const [error, setError] = useState(null);
    const [exito, setExito] = useState(null);
    const navigate = useNavigate();

    const boxActivo = JSON.parse(localStorage.getItem('boxActivo'));

    useEffect(() => {
        if (!boxActivo || (boxActivo.estatusSaaS === 'Activo' || boxActivo.estatusSaaS === 'Gracia')) {
            navigate('/admin-box-panel');
            return;
        }

        const fetchPlanes = async () => {
            try {
                const token = localStorage.getItem('token');
                const config = { headers: { Authorization: `Bearer ${token}` } };
                const res = await fetch(`${import.meta.env.VITE_API_URL}/api/saas/planes`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (!res.ok) throw new Error('Error al cargar planes');
                const data = await res.json();
                setPlanes(data.filter(p => p.activo));
            } catch (err) {
                console.error('Error fetching planes:', err);
                setError('No se pudieron cargar los planes.');
            } finally {
                setLoading(false);
            }
        };

        fetchPlanes();
    }, [navigate, boxActivo]);

    const handleCheckout = async (idPlan) => {
        setProcesando(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const payload = {
                idBox: boxActivo.idBox,
                idPlan,
                esAnual,
                successUrl: window.location.origin + '/admin-box-panel?checkout=success',
                cancelUrl: window.location.origin + '/seleccion-plan-saas?checkout=cancel'
            };
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/saas/checkout-session`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}` 
                },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.mensaje || 'Error al iniciar el pago.');
            window.location.href = data.url;
        } catch (err) {
            setError(err.message || 'Error al iniciar el pago.');
            setProcesando(false);
        }
    };

    const handleCanjearCodigo = async () => {
        if (!codigo) return;
        setProcesando(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const payload = { idBox: boxActivo.idBox, codigo };
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/saas/canjear`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}` 
                },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.mensaje || 'Código inválido o expirado.');
            
            // Actualizar el localstorage con el nuevo estatus
            const boxActualizado = { ...boxActivo, estatusSaaS: data.estatusSaaS };
            localStorage.setItem('boxActivo', JSON.stringify(boxActualizado));
            
            setExito(data.mensaje);
            setTimeout(() => {
                navigate('/admin-box-panel');
                window.location.reload(); // Forzar actualización de guardias
            }, 2000);
        } catch (err) {
            setError(err.message || 'Código inválido o expirado.');
            setProcesando(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('usuario');
        localStorage.removeItem('boxActivo');
        navigate('/login');
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-900"><div className="animate-spin h-10 w-10 border-4 border-emerald-500 border-t-transparent rounded-full"></div></div>;

    return (
        <div className="min-h-screen bg-gray-900 text-white font-sans flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl w-full space-y-8">
                
                {/* Cabecera de Alerta */}
                <div className="bg-red-900/50 border border-red-500/50 rounded-xl p-6 text-center space-y-4 shadow-xl">
                    <AlertTriangle className="h-16 w-16 text-red-500 mx-auto animate-pulse" />
                    <h2 className="text-3xl font-bold text-white tracking-tight">Acceso Restringido</h2>
                    <p className="text-gray-300 text-lg">
                        {boxActivo.estatusSaaS === 'Vencido' 
                            ? "Tu suscripción ha expirado. Por favor, regulariza tu pago para recuperar el acceso total a las herramientas de Atletify y permitir las reservas de tus atletas."
                            : "Aún no has configurado tu suscripción a Atletify. Elige un plan para activar tu Box."}
                    </p>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500 text-red-400 p-4 rounded-lg flex items-center justify-center">
                        <AlertTriangle className="h-5 w-5 mr-2" />
                        {error}
                    </div>
                )}
                
                {exito && (
                    <div className="bg-emerald-500/10 border border-emerald-500 text-emerald-400 p-4 rounded-lg flex items-center justify-center">
                        <CheckCircle className="h-5 w-5 mr-2" />
                        {exito}
                    </div>
                )}

                {/* Toggle Mensual/Anual */}
                <div className="flex justify-center items-center space-x-4 pt-8">
                    <span className={`text-lg ${!esAnual ? 'text-emerald-400 font-bold' : 'text-gray-400'}`}>Mensual</span>
                    <button 
                        onClick={() => setEsAnual(!esAnual)}
                        className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors duration-300 ${esAnual ? 'bg-emerald-500' : 'bg-gray-600'}`}
                    >
                        <span className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform duration-300 ${esAnual ? 'translate-x-9' : 'translate-x-1'}`} />
                    </button>
                    <span className={`text-lg ${esAnual ? 'text-emerald-400 font-bold' : 'text-gray-400'}`}>
                        Anual <span className="text-xs text-emerald-500 ml-1 px-2 py-0.5 bg-emerald-500/20 rounded-full">-20%</span>
                    </span>
                </div>

                {/* Grid de Planes */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-12">
                    {planes.map(plan => (
                        <div key={plan.idPlan} className={`relative flex flex-col p-8 rounded-2xl border ${plan.esRecomendado ? 'border-emerald-500 bg-gray-800 shadow-2xl shadow-emerald-500/20 scale-105' : 'border-gray-700 bg-gray-800/50'} transition-all hover:border-emerald-400`}>
                            {plan.esRecomendado && (
                                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                                    <span className="bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                                        Recomendado
                                    </span>
                                </div>
                            )}
                            <h3 className="text-2xl font-bold text-white text-center mb-2">{plan.nombre}</h3>
                            
                            <div className="text-center mb-6">
                                <span className="text-4xl font-extrabold text-white">${esAnual ? plan.precioAnual : plan.precioMensual}</span>
                                <span className="text-gray-400 ml-2">MXN / {esAnual ? 'año' : 'mes'}</span>
                            </div>

                            <ul className="space-y-4 mb-8 flex-1">
                                <li className="flex items-center text-gray-300">
                                    <CheckCircle className="h-5 w-5 text-emerald-500 mr-3 flex-shrink-0" />
                                    <span>Hasta <strong className="text-white">{plan.limiteAtletas}</strong> atletas activos</span>
                                </li>
                                <li className="flex items-center text-gray-300">
                                    <CheckCircle className="h-5 w-5 text-emerald-500 mr-3 flex-shrink-0" />
                                    <span>Excedentes: <strong className="text-white">${plan.costoPorAtletaExtra}</strong> / atleta</span>
                                </li>
                                {plan.incluyeCompetencias && (
                                    <li className="flex items-center text-gray-300">
                                        <CheckCircle className="h-5 w-5 text-emerald-500 mr-3 flex-shrink-0" />
                                        <span className="text-emerald-400 font-semibold">Módulo de Competencias</span>
                                    </li>
                                )}
                            </ul>

                            <button
                                onClick={() => handleCheckout(plan.idPlan)}
                                disabled={procesando}
                                className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${plan.esRecomendado ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30' : 'bg-gray-700 hover:bg-gray-600 text-white'} disabled:opacity-50`}
                            >
                                {procesando ? 'Procesando...' : 'Suscribirse'}
                            </button>
                        </div>
                    ))}
                </div>

                {/* Sección de Canje de Códigos */}
                <div className="mt-16 bg-gray-800/80 rounded-2xl p-8 border border-gray-700">
                    <h3 className="text-xl font-bold text-white mb-4">¿Tienes un Código de Activación?</h3>
                    <div className="flex flex-col sm:flex-row gap-4">
                        <input
                            type="text"
                            placeholder="Ej. VIP-BOX-2026"
                            value={codigo}
                            onChange={(e) => setCodigo(e.target.value)}
                            className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                        />
                        <button
                            onClick={handleCanjearCodigo}
                            disabled={!codigo || procesando}
                            className="px-8 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl font-bold text-white transition-colors disabled:opacity-50"
                        >
                            Canjear
                        </button>
                    </div>
                </div>

                <div className="text-center mt-8">
                    <button onClick={handleLogout} className="text-gray-400 hover:text-white transition-colors underline">
                        Cerrar Sesión por ahora
                    </button>
                </div>

            </div>
        </div>
    );
};

export default SeleccionPlanSaaS;
