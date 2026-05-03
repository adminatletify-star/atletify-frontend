import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const AdminSaaS = () => {
    const [planes, setPlanes] = useState([]);
    const [codigos, setCodigos] = useState([]);
    
    // Formulario de Plan
    const [nuevoPlan, setNuevoPlan] = useState({
        nombre: '', precioMensual: 0, precioAnual: 0, limiteAtletas: 100, costoPorAtletaExtra: 15, incluyeCompetencias: false, activo: true, esRecomendado: false
    });

    // Formulario de Código
    const [nuevoCodigo, setNuevoCodigo] = useState({
        codigo: '', mesesGratis: 1, idPlanSaaS: '', limiteUsos: 1
    });

    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        cargarData();
    }, []);

    const cargarData = async () => {
        try {
            const token = localStorage.getItem('token');
            const config = { headers: { Authorization: `Bearer ${token}` } };
            
            const resPlanes = await axios.get('/api/developer/planes', config);
            setPlanes(resPlanes.data);

            const resCodigos = await axios.get('/api/developer/codigos', config);
            setCodigos(resCodigos.data);
        } catch (error) {
            console.error(error);
            if (error.response?.status === 401 || error.response?.status === 403) {
                navigate('/dashboard');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleCrearPlan = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            await axios.post('/api/developer/planes', nuevoPlan, { headers: { Authorization: `Bearer ${token}` } });
            alert('Plan creado con éxito');
            cargarData();
        } catch (error) {
            alert('Error al crear plan');
        }
    };

    const handleCrearCodigo = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const payload = {
                ...nuevoCodigo,
                idPlanSaaS: nuevoCodigo.idPlanSaaS ? parseInt(nuevoCodigo.idPlanSaaS) : null
            };
            await axios.post('/api/developer/codigos', payload, { headers: { Authorization: `Bearer ${token}` } });
            alert('Código generado con éxito');
            cargarData();
        } catch (error) {
            alert('Error al generar código');
        }
    };

    if (loading) return <div className="min-vh-100 d-flex justify-content-center align-items-center"><div className="spinner-border text-info" /></div>;

    return (
        <div className="container py-5 text-white font-sans min-h-screen">
            <h1 className="mb-4 text-3xl font-bold"><i className="fas fa-crown text-warning"></i> Administración B2B SaaS</h1>
            <p className="text-gray-400 mb-8">Crea planes de suscripción para los Boxes y genera códigos de regalo o activación.</p>

            <div className="row g-4">
                {/* ── PLANES SAAS ── */}
                <div className="col-12 col-xl-6">
                    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-lg h-100">
                        <h2 className="text-xl font-bold mb-4 text-emerald-400"><i className="fas fa-tags"></i> Planes de Suscripción</h2>
                        
                        <form onSubmit={handleCrearPlan} className="bg-gray-900/50 p-4 rounded-lg mb-6 border border-gray-700">
                            <h4 className="text-sm font-semibold mb-3 text-gray-300 uppercase tracking-wider">Crear Nuevo Plan</h4>
                            <div className="row g-3">
                                <div className="col-12">
                                    <input type="text" className="form-control bg-dark text-white border-secondary" placeholder="Nombre (Ej. Pro Box)" required value={nuevoPlan.nombre} onChange={e => setNuevoPlan({...nuevoPlan, nombre: e.target.value})} />
                                </div>
                                <div className="col-6">
                                    <input type="number" className="form-control bg-dark text-white border-secondary" placeholder="Precio Mensual MXN" required value={nuevoPlan.precioMensual} onChange={e => setNuevoPlan({...nuevoPlan, precioMensual: e.target.value})} />
                                </div>
                                <div className="col-6">
                                    <input type="number" className="form-control bg-dark text-white border-secondary" placeholder="Precio Anual MXN" required value={nuevoPlan.precioAnual} onChange={e => setNuevoPlan({...nuevoPlan, precioAnual: e.target.value})} />
                                </div>
                                <div className="col-6">
                                    <input type="number" className="form-control bg-dark text-white border-secondary" placeholder="Límite Atletas" required value={nuevoPlan.limiteAtletas} onChange={e => setNuevoPlan({...nuevoPlan, limiteAtletas: e.target.value})} />
                                </div>
                                <div className="col-6">
                                    <input type="number" className="form-control bg-dark text-white border-secondary" placeholder="Costo Atleta Extra MXN" required value={nuevoPlan.costoPorAtletaExtra} onChange={e => setNuevoPlan({...nuevoPlan, costoPorAtletaExtra: e.target.value})} />
                                </div>
                                <div className="col-12 d-flex gap-4">
                                    <label className="d-flex align-items-center gap-2">
                                        <input type="checkbox" checked={nuevoPlan.incluyeCompetencias} onChange={e => setNuevoPlan({...nuevoPlan, incluyeCompetencias: e.target.checked})} />
                                        Módulo Competencias
                                    </label>
                                    <label className="d-flex align-items-center gap-2 text-warning">
                                        <input type="checkbox" checked={nuevoPlan.esRecomendado} onChange={e => setNuevoPlan({...nuevoPlan, esRecomendado: e.target.checked})} />
                                        Destacado
                                    </label>
                                </div>
                                <div className="col-12 text-end">
                                    <button type="submit" className="btn btn-emerald px-4 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-500">Crear Plan</button>
                                </div>
                            </div>
                        </form>

                        <div className="table-responsive">
                            <table className="table table-dark table-hover align-middle">
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Nombre</th>
                                        <th>Precio (M/A)</th>
                                        <th>Atletas</th>
                                        <th>Estatus</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {planes.map(p => (
                                        <tr key={p.idPlan}>
                                            <td className="text-muted">#{p.idPlan}</td>
                                            <td className="fw-bold">{p.nombre} {p.esRecomendado && <i className="fas fa-star text-warning small ms-1"></i>}</td>
                                            <td>${p.precioMensual} / ${p.precioAnual}</td>
                                            <td>{p.limiteAtletas} <span className="text-muted small">(+${p.costoPorAtletaExtra})</span></td>
                                            <td>
                                                <span className={`badge ${p.activo ? 'bg-success' : 'bg-danger'}`}>{p.activo ? 'Activo' : 'Inactivo'}</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* ── CÓDIGOS DE ACTIVACIÓN ── */}
                <div className="col-12 col-xl-6">
                    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-lg h-100">
                        <h2 className="text-xl font-bold mb-4 text-purple-400"><i className="fas fa-ticket-alt"></i> Códigos de Activación (Magic Tokens)</h2>
                        
                        <form onSubmit={handleCrearCodigo} className="bg-gray-900/50 p-4 rounded-lg mb-6 border border-gray-700">
                            <h4 className="text-sm font-semibold mb-3 text-gray-300 uppercase tracking-wider">Generar Nuevo Código</h4>
                            <div className="row g-3">
                                <div className="col-8">
                                    <input type="text" className="form-control bg-dark text-white border-secondary font-monospace" placeholder="Ej. VIP-BOX-2026" required value={nuevoCodigo.codigo} onChange={e => setNuevoCodigo({...nuevoCodigo, codigo: e.target.value.toUpperCase()})} />
                                </div>
                                <div className="col-4">
                                    <button type="button" className="btn btn-outline-secondary w-100" onClick={() => setNuevoCodigo({...nuevoCodigo, codigo: 'TOKEN-' + Math.random().toString(36).substring(2, 10).toUpperCase()})}>Random</button>
                                </div>
                                <div className="col-4">
                                    <input type="number" className="form-control bg-dark text-white border-secondary" placeholder="Meses Gratis" required value={nuevoCodigo.mesesGratis} onChange={e => setNuevoCodigo({...nuevoCodigo, mesesGratis: e.target.value})} />
                                </div>
                                <div className="col-4">
                                    <input type="number" className="form-control bg-dark text-white border-secondary" placeholder="Límite Usos" required value={nuevoCodigo.limiteUsos} onChange={e => setNuevoCodigo({...nuevoCodigo, limiteUsos: e.target.value})} />
                                </div>
                                <div className="col-4">
                                    <select className="form-select bg-dark text-white border-secondary" value={nuevoCodigo.idPlanSaaS} onChange={e => setNuevoCodigo({...nuevoCodigo, idPlanSaaS: e.target.value})}>
                                        <option value="">Cualquier Plan</option>
                                        {planes.map(p => <option key={p.idPlan} value={p.idPlan}>{p.nombre}</option>)}
                                    </select>
                                </div>
                                <div className="col-12 text-end">
                                    <button type="submit" className="btn bg-purple-600 text-white px-4 font-bold rounded-lg hover:bg-purple-500">Generar Código</button>
                                </div>
                            </div>
                        </form>

                        <div className="table-responsive">
                            <table className="table table-dark table-hover align-middle">
                                <thead>
                                    <tr>
                                        <th>Código</th>
                                        <th>Meses</th>
                                        <th>Usos</th>
                                        <th>Plan Específico</th>
                                        <th>Estatus</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {codigos.map(c => (
                                        <tr key={c.idCodigo}>
                                            <td className="font-monospace text-info fw-bold">{c.codigo}</td>
                                            <td>{c.mesesGratis}</td>
                                            <td>{c.usosRestantes} / {c.limiteUsos}</td>
                                            <td className="text-muted">{c.planSaaS ? c.planSaaS.nombre : 'Cualquiera'}</td>
                                            <td>
                                                <span className={`badge ${c.activo && c.usosRestantes > 0 ? 'bg-success' : 'bg-danger'}`}>
                                                    {c.activo && c.usosRestantes > 0 ? 'Válido' : 'Agotado'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default AdminSaaS;
