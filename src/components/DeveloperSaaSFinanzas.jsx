import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import AtletifyLoader from '../components/AtletifyLoader';
import '../assets/css/AdminFinanzasGlobales.css'; // Reutilizamos los estilos premium

const DeveloperSaaSFinanzas = () => {
  const [boxes, setBoxes] = useState([]);
  const [planes, setPlanes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { cargarData(); }, []);

  const authHeader = () => ({
    Authorization: `Bearer ${localStorage.getItem('token')}`
  });

  const cargarData = async () => {
    try {
      const base = import.meta.env.VITE_API_URL;
      const [resBoxes, resPlanes] = await Promise.all([
        fetch(`${base}/api/developer/metricas-boxes`, { headers: authHeader() }),
        fetch(`${base}/api/developer/planes`, { headers: authHeader() })
      ]);

      if (!resBoxes.ok || !resPlanes.ok) throw new Error("Error loading data");

      const dataBoxes = await resBoxes.json();
      const dataPlanes = await resPlanes.json();
      
      setBoxes(dataBoxes);
      setPlanes(dataPlanes);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleActualizarBoxSaaS = async (boxId, field, value) => {
    const box = boxes.find(b => b.idBox === boxId);
    if (!box) return;

    const reqBody = {
      estatusSaaS: box.estatusSaaS,
      idPlanSaaS: box.idPlanSaaS,
      precioEspecialSaaS: box.precioEspecialSaaS,
      moduloCompetenciasActivo: box.moduloCompetenciasActivo,
      fechaVencimientoSaaS: box.fechaVencimientoSaaS
    };
    reqBody[field] = value;

    try {
      const base = import.meta.env.VITE_API_URL;
      const res = await fetch(`${base}/api/developer/box-saas/${boxId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify(reqBody)
      });
      
      if (!res.ok) throw new Error('Error al actualizar');
      
      setBoxes(prev => prev.map(b => b.idBox === boxId ? { ...b, [field]: value } : b));
    } catch (e) {
      window.alert('Error al actualizar permisos de SaaS para el Box.');
    }
  };

  if (loading) return (
    <div className="d-flex justify-content-center align-items-center" style={{ height: '400px' }}>
      <AtletifyLoader />
    </div>
  );

  // Calcular métricas
  const boxesActivos = boxes.filter(b => b.estatusSaaS === 'Activo' || b.activo);
  let mrr = 0;
  
  // Data para gráficos
  const ingresosPorPlanMap = {};
  planes.forEach(p => ingresosPorPlanMap[p.nombre] = 0);

  boxes.forEach(b => {
    if (b.estatusSaaS === 'Activo' || b.activo) {
      const plan = planes.find(p => p.idPlan === b.idPlanSaaS);
      if (plan) {
        mrr += plan.precio;
        if (ingresosPorPlanMap[plan.nombre] !== undefined) {
          ingresosPorPlanMap[plan.nombre] += plan.precio;
        }
      }
    }
  });

  const arr = mrr * 12;
  const totalUsuarios = boxes.reduce((acc, curr) => acc + curr.totalAtletas + curr.totalCoaches + curr.totalAdmins, 0);

  const chartDataPlanes = planes.map(p => ({
    nombre: p.nombre,
    ingresos: ingresosPorPlanMap[p.nombre],
    boxes: boxes.filter(b => b.idPlanSaaS === p.idPlan).length
  })).filter(p => p.ingresos > 0 || p.boxes > 0);

  const COLORS = ['#4fc3f7', '#f1c40f', '#e74c3c', '#9b59b6', '#2ecc71'];

  const formatearDinero = (monto) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(monto || 0);

  const getEstatusBadge = (estatus) => {
    switch(estatus) {
      case 'Activo': return 'badge-activo finanzas-globales-badge';
      case 'Suspendido': return 'badge-inactivo finanzas-globales-badge';
      case 'Gracia': return 'badge-pendiente finanzas-globales-badge';
      default: return 'badge-pendiente finanzas-globales-badge';
    }
  };

  return (
    <section className="dash-section pt-0">
      <div className="dash-section-head mb-4">
        <h2 className="dash-section-title">
          <i className="fas fa-chart-pie"></i> Finanzas B2B SaaS
        </h2>
      </div>

      {/* KPIs */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-md-3">
          <div className="finanzas-globales-kpi-card" style={{ borderColor: 'rgba(46, 204, 113, 0.3)' }}>
            <div className="finanzas-globales-kpi-title"><i className="fas fa-money-bill-wave text-success"></i> MRR (Mensual)</div>
            <div className="finanzas-globales-kpi-value text-white">{formatearDinero(mrr)}</div>
          </div>
        </div>
        <div className="col-12 col-md-3">
          <div className="finanzas-globales-kpi-card" style={{ borderColor: 'rgba(52, 152, 219, 0.3)' }}>
            <div className="finanzas-globales-kpi-title"><i className="fas fa-calendar-alt text-info"></i> ARR (Anual)</div>
            <div className="finanzas-globales-kpi-value text-white">{formatearDinero(arr)}</div>
          </div>
        </div>
        <div className="col-12 col-md-3">
          <div className="finanzas-globales-kpi-card" style={{ borderColor: 'rgba(155, 89, 182, 0.3)' }}>
            <div className="finanzas-globales-kpi-title"><i className="fas fa-boxes text-purple"></i> Boxes Activos</div>
            <div className="finanzas-globales-kpi-value fs-2 text-white">{boxesActivos.length}</div>
          </div>
        </div>
        <div className="col-12 col-md-3">
          <div className="finanzas-globales-kpi-card" style={{ borderColor: 'rgba(231, 76, 60, 0.3)' }}>
            <div className="finanzas-globales-kpi-title"><i className="fas fa-users text-danger"></i> Usuarios (Red)</div>
            <div className="finanzas-globales-kpi-value fs-2 text-white">{totalUsuarios}</div>
          </div>
        </div>
      </div>

      {/* Gráficos */}
      <div className="row g-4 mb-4">
        <div className="col-md-6">
          <div className="finanzas-globales-card">
            <div className="finanzas-globales-card-title"><i className="fas fa-chart-pie text-success"></i> MRR por Plan</div>
            <div className="finanzas-globales-chart-container" style={{ height: '250px' }}>
              {chartDataPlanes.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={chartDataPlanes} dataKey="ingresos" nameKey="nombre" cx="50%" cy="50%" innerRadius={50} outerRadius={80}>
                      {chartDataPlanes.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(value) => formatearDinero(value)} contentStyle={{ backgroundColor: '#1e1e26', border: '1px solid #333' }} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : <div className="finanzas-globales-empty"><p>Sin datos</p></div>}
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="finanzas-globales-card">
            <div className="finanzas-globales-card-title"><i className="fas fa-chart-bar text-info"></i> Boxes por Plan</div>
            <div className="finanzas-globales-chart-container" style={{ height: '250px' }}>
              {chartDataPlanes.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartDataPlanes} margin={{ top: 15, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                    <XAxis dataKey="nombre" stroke="#ccc" />
                    <YAxis stroke="#ccc" allowDecimals={false} />
                    <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{ backgroundColor: '#1e1e26', border: '1px solid #333' }} />
                    <Bar dataKey="boxes" fill="#3498db" radius={[4, 4, 0, 0]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <div className="finanzas-globales-empty"><p>Sin datos</p></div>}
            </div>
          </div>
        </div>
      </div>

      {/* Tabla de Control de Permisos */}
      <div className="finanzas-globales-card p-0 overflow-hidden">
        <div className="p-4 border-bottom" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
          <h5 className="mb-0 text-white" style={{ fontFamily: 'var(--font-heading)' }}><i className="fas fa-lock text-warning me-2"></i>Control de Permisos de Cajas (SaaS)</h5>
        </div>
        <div className="table-responsive">
          <table className="finanzas-globales-table m-0">
            <thead>
              <tr>
                <th>Box</th>
                <th>Red de Atletas</th>
                <th>Plan de Suscripción</th>
                <th>Módulo Competencias</th>
                <th style={{ textAlign: 'right' }}>Estado del Servicio</th>
              </tr>
            </thead>
            <tbody>
              {boxes.map(box => (
                <tr key={box.idBox}>
                  <td>
                    <div className="fw-bold text-white">{box.nombre}</div>
                    <div className="text-secondary small"><i className="fas fa-map-marker-alt me-1"></i>{box.ubicacion || 'Sin ubicación'}</div>
                  </td>
                  <td>
                    <div className="badge bg-dark border border-secondary text-light">
                      <i className="fas fa-users me-1 text-primary"></i> {box.totalAtletas}
                    </div>
                  </td>
                  <td>
                    <select 
                      className="form-select form-select-sm bg-dark text-white border-secondary"
                      value={box.idPlanSaaS || ''}
                      onChange={(e) => handleActualizarBoxSaaS(box.idBox, 'idPlanSaaS', parseInt(e.target.value) || null)}
                    >
                      <option value="">Ninguno</option>
                      {planes.map(p => (
                        <option key={p.idPlan} value={p.idPlan}>{p.nombre} ({formatearDinero(p.precio)})</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <div className="form-check form-switch" style={{ margin: 0, paddingLeft: '2.5em' }}>
                      <input 
                        className="form-check-input" 
                        type="checkbox" 
                        checked={box.moduloCompetenciasActivo}
                        onChange={(e) => handleActualizarBoxSaaS(box.idBox, 'moduloCompetenciasActivo', e.target.checked)}
                        style={{ cursor: 'pointer' }}
                      />
                    </div>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <select 
                      className={`form-select form-select-sm d-inline-block text-center ${box.estatusSaaS === 'Activo' ? 'bg-success text-white border-success' : box.estatusSaaS === 'Suspendido' ? 'bg-danger text-white border-danger' : 'bg-warning text-dark border-warning'}`}
                      style={{ width: 'auto', minWidth: '120px', fontWeight: 'bold' }}
                      value={box.estatusSaaS || 'Pendiente'}
                      onChange={(e) => handleActualizarBoxSaaS(box.idBox, 'estatusSaaS', e.target.value)}
                    >
                      <option value="Pendiente">Pendiente</option>
                      <option value="Activo">Activo</option>
                      <option value="Gracia">En Gracia</option>
                      <option value="Suspendido">Suspendido</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </section>
  );
};

export default DeveloperSaaSFinanzas;
