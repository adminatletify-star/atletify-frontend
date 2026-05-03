import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

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
            
            const resPlanes = await fetch(`${import.meta.env.VITE_API_URL}/api/developer/planes`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (resPlanes.status === 401 || resPlanes.status === 403) {
                navigate('/dashboard');
                return;
            }
            const dataPlanes = await resPlanes.json();
            setPlanes(dataPlanes);

            const resCodigos = await fetch(`${import.meta.env.VITE_API_URL}/api/developer/codigos`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const dataCodigos = await resCodigos.json();
            setCodigos(dataCodigos);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleCrearPlan = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/developer/planes`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}` 
                },
                body: JSON.stringify(nuevoPlan)
            });
            if (!res.ok) throw new Error();
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
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/developer/codigos`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}` 
                },
                body: JSON.stringify(payload)
            });
            if (!res.ok) throw new Error();
            alert('Código generado con éxito');
            cargarData();
        } catch (error) {
            alert('Error al generar código');
        }
    };

    const handleEliminarPlan = async (id) => {
        if (!window.confirm("¿Seguro que deseas eliminar este plan?")) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/developer/planes/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.mensaje || 'Error al eliminar');
            alert(data.mensaje || 'Plan eliminado exitosamente');
            cargarData();
        } catch (error) {
            alert(error.message || 'Error al eliminar plan');
        }
    };

    const handleEliminarCodigo = async (id) => {
        if (!window.confirm("¿Seguro que deseas eliminar este código?")) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${import.meta.env.VITE_API_URL}/api/developer/codigos/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.mensaje || 'Error al eliminar');
            alert(data.mensaje || 'Código eliminado exitosamente');
            cargarData();
        } catch (error) {
            alert(error.message || 'Error al eliminar código');
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
                            <h4 className="text-sm font-semibold mb-4 text-gray-300 uppercase tracking-wider border-bottom border-gray-700 pb-2">Crear Nuevo Plan</h4>
                            <div className="row g-4">
                                <div className="col-12">
                                    <label className="form-label text-muted small fw-bold mb-1">Nombre del Plan</label>
                                    <input type="text" className="form-control bg-dark text-white border-secondary shadow-none" placeholder="Ej. Pro Box" required value={nuevoPlan.nombre} onChange={e => setNuevoPlan({...nuevoPlan, nombre: e.target.value})} />
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label text-muted small fw-bold mb-1">Precio Mensual (MXN)</label>
                                    <div className="input-group">
                                        <span className="input-group-text bg-dark text-muted border-secondary">$</span>
                                        <input type="number" className="form-control bg-dark text-white border-secondary shadow-none" placeholder="0" required value={nuevoPlan.precioMensual} onChange={e => setNuevoPlan({...nuevoPlan, precioMensual: e.target.value})} />
                                    </div>
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label text-muted small fw-bold mb-1">Precio Anual (MXN)</label>
                                    <div className="input-group">
                                        <span className="input-group-text bg-dark text-muted border-secondary">$</span>
                                        <input type="number" className="form-control bg-dark text-white border-secondary shadow-none" placeholder="0" required value={nuevoPlan.precioAnual} onChange={e => setNuevoPlan({...nuevoPlan, precioAnual: e.target.value})} />
                                    </div>
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label text-muted small fw-bold mb-1">Límite de Atletas Incluidos</label>
                                    <input type="number" className="form-control bg-dark text-white border-secondary shadow-none" placeholder="100" required value={nuevoPlan.limiteAtletas} onChange={e => setNuevoPlan({...nuevoPlan, limiteAtletas: e.target.value})} />
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label text-muted small fw-bold mb-1">Costo por Atleta Extra (MXN)</label>
                                    <div className="input-group">
                                        <span className="input-group-text bg-dark text-muted border-secondary">$</span>
                                        <input type="number" className="form-control bg-dark text-white border-secondary shadow-none" placeholder="15" required value={nuevoPlan.costoPorAtletaExtra} onChange={e => setNuevoPlan({...nuevoPlan, costoPorAtletaExtra: e.target.value})} />
                                    </div>
                                </div>
                                <div className="col-12 pt-2 d-flex flex-wrap gap-4">
                                    <div className="form-check form-switch">
                                        <input className="form-check-input cursor-pointer" type="checkbox" id="checkCompetencias" checked={nuevoPlan.incluyeCompetencias} onChange={e => setNuevoPlan({...nuevoPlan, incluyeCompetencias: e.target.checked})} />
                                        <label className="form-check-label text-white cursor-pointer" htmlFor="checkCompetencias">Incluye Módulo Competencias</label>
                                    </div>
                                    <div className="form-check form-switch">
                                        <input className="form-check-input cursor-pointer" type="checkbox" id="checkDestacado" checked={nuevoPlan.esRecomendado} onChange={e => setNuevoPlan({...nuevoPlan, esRecomendado: e.target.checked})} />
                                        <label className="form-check-label text-warning cursor-pointer fw-bold" htmlFor="checkDestacado"><i className="fas fa-star me-1"></i> Plan Destacado</label>
                                    </div>
                                </div>
                                <div className="col-12 text-end mt-4">
                                    <button type="submit" className="btn px-4 py-2 bg-emerald-600 text-white font-bold rounded shadow hover:bg-emerald-500 transition-all">
                                        <i className="fas fa-save me-2"></i> Crear Plan
                                    </button>
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
                                        <th>Acciones</th>
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
                                            <td>
                                                <button onClick={() => handleEliminarPlan(p.idPlan)} className="btn btn-sm btn-outline-danger">
                                                    <i className="fas fa-trash"></i>
                                                </button>
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
                            <h4 className="text-sm font-semibold mb-4 text-gray-300 uppercase tracking-wider border-bottom border-gray-700 pb-2">Generar Nuevo Código</h4>
                            <div className="row g-4">
                                <div className="col-md-8">
                                    <label className="form-label text-muted small fw-bold mb-1">Token Alfanumérico</label>
                                    <div className="input-group">
                                        <input type="text" className="form-control bg-dark text-white border-secondary font-monospace shadow-none" placeholder="Ej. VIP-BOX-2026" required value={nuevoCodigo.codigo} onChange={e => setNuevoCodigo({...nuevoCodigo, codigo: e.target.value.toUpperCase()})} />
                                        <button type="button" className="btn btn-outline-secondary" onClick={() => setNuevoCodigo({...nuevoCodigo, codigo: 'TOKEN-' + Math.random().toString(36).substring(2, 10).toUpperCase()})}>
                                            <i className="fas fa-random"></i>
                                        </button>
                                    </div>
                                </div>
                                <div className="col-md-4">
                                    <label className="form-label text-muted small fw-bold mb-1">Meses Gratis</label>
                                    <input type="number" className="form-control bg-dark text-white border-secondary shadow-none" placeholder="1" required value={nuevoCodigo.mesesGratis} onChange={e => setNuevoCodigo({...nuevoCodigo, mesesGratis: e.target.value})} />
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label text-muted small fw-bold mb-1">Límite de Usos</label>
                                    <input type="number" className="form-control bg-dark text-white border-secondary shadow-none" placeholder="1" required value={nuevoCodigo.limiteUsos} onChange={e => setNuevoCodigo({...nuevoCodigo, limiteUsos: e.target.value})} />
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label text-muted small fw-bold mb-1">Plan Específico (Opcional)</label>
                                    <select className="form-select bg-dark text-white border-secondary shadow-none" value={nuevoCodigo.idPlanSaaS} onChange={e => setNuevoCodigo({...nuevoCodigo, idPlanSaaS: e.target.value})}>
                                        <option value="">Aplica a cualquier Plan</option>
                                        {planes.map(p => <option key={p.idPlan} value={p.idPlan}>{p.nombre}</option>)}
                                    </select>
                                </div>
                                <div className="col-12 text-end mt-4">
                                    <button type="submit" className="btn py-2 px-4 bg-purple-600 text-white font-bold rounded shadow hover:bg-purple-500 transition-all">
                                        <i className="fas fa-magic me-2"></i> Generar Token
                                    </button>
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
                                        <th>Acciones</th>
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
                                            <td>
                                                <button onClick={() => handleEliminarCodigo(c.idCodigo)} className="btn btn-sm btn-outline-danger">
                                                    <i className="fas fa-trash"></i>
                                                </button>
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
