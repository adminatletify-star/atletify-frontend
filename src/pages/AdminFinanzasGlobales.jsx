import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import BackButton from '../components/BackButton';
import AtletifyLoader from '../components/AtletifyLoader';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import '../assets/css/AdminFinanzasGlobales.css';

const API_BASE = `${import.meta.env.VITE_API_URL}/api/finanzas-globales`;

export default function AdminFinanzasGlobales() {
  const navigate = useNavigate();
  const [box, setBox] = useState(null);
  const [loading, setLoading] = useState(true);
  const [resumen, setResumen] = useState(null);
  const [egresos, setEgresos] = useState([]);
  const [ingresos, setIngresos] = useState([]);
  const [dashboardData, setDashboardData] = useState(null);
  
  const [pestaña, setPestaña] = useState('dashboard');
  const tabRefs = useRef({});
  const [sliderStyle, setSliderStyle] = useState(null);

  useLayoutEffect(() => {
    const el = tabRefs.current[pestaña];
    if (el) setSliderStyle({ left: el.offsetLeft, width: el.offsetWidth });
  }, [pestaña]);

  // Filtros
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [anio, setAnio] = useState(new Date().getFullYear());

  // Formulario Egreso
  const [formEgreso, setFormEgreso] = useState({
    monto: '',
    categoria: 'Mantenimiento',
    notas: '',
    comprobanteUrl: ''
  });

  useEffect(() => {
    const b = JSON.parse(localStorage.getItem('box'));
    if (!b) { navigate('/login'); return; }
    setBox(b);
    cargarDatos(b.idBox, mes, anio);
  }, [navigate, mes, anio]);

  const cargarDatos = async (idBox, m, a) => {
    setLoading(true);
    try {
      const headers = { 'Authorization': `Bearer ${localStorage.getItem('token')}` };
      const [resResumen, resEgresos, resIngresos, resDashboard] = await Promise.all([
        fetch(`${API_BASE}/resumen/${idBox}?mes=${m}&anio=${a}`, { headers }),
        fetch(`${API_BASE}/egresos/${idBox}?mes=${m}&anio=${a}`, { headers }),
        fetch(`${API_BASE}/ingresos/${idBox}?mes=${m}&anio=${a}`, { headers }),
        fetch(`${import.meta.env.VITE_API_URL}/api/finanzas/dashboard/${idBox}`, { headers })
      ]);
      if (resResumen.ok) setResumen(await resResumen.json());
      if (resEgresos.ok) setEgresos(await resEgresos.json());
      if (resIngresos.ok) setIngresos(await resIngresos.json());
      if (resDashboard.ok) setDashboardData(await resDashboard.json());
    } catch (error) {
      console.error('Error al cargar finanzas globales', error);
    } finally {
      setLoading(false);
    }
  };

  const registrarEgreso = async (e) => {
    e.preventDefault();
    if (!formEgreso.monto || !formEgreso.categoria) return alert('Completa los campos requeridos.');

    try {
      const res = await fetch(`${API_BASE}/egresos`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          idBox: box.idBox,
          monto: parseFloat(formEgreso.monto),
          categoria: formEgreso.categoria,
          notas: formEgreso.notas,
          comprobanteUrl: formEgreso.comprobanteUrl,
          generadoPor: 'Admin'
        })
      });

      if (res.ok) {
        alert('Egreso registrado correctamente');
        setFormEgreso({ monto: '', categoria: 'Mantenimiento', notas: '', comprobanteUrl: '' });
        cargarDatos(box.idBox, mes, anio);
      } else {
        alert('Error al registrar egreso');
      }
    } catch (error) {
      alert('Error de conexión');
    }
  };

  const eliminarEgreso = async (id) => {
    if (!window.confirm('¿Seguro que deseas eliminar este registro de egreso?')) return;
    try {
      const res = await fetch(`${API_BASE}/egresos/${id}`, { 
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        cargarDatos(box.idBox, mes, anio);
      } else {
        alert('Error al eliminar');
      }
    } catch (e) {
      alert('Error de conexión');
    }
  };

  // Colores para las gráficas
  const COLORS = ['#4fc3f7', '#2ecc71', '#f1c40f', '#e74c3c', '#9b59b6', '#e67e22', '#1abc9c'];
  
  const getBadgeClass = (categoria) => {
    const normalize = categoria.toLowerCase().replace(" ", "-");
    return `finanzas-globales-badge badge-${normalize}`;
  };

  const formatearDinero = (monto) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(monto || 0);
  };

  return (
    <div className="finanzas-globales-container">
      <nav className="finanzas-globales-nav">
        <BackButton to="/admin-box-panel" />
        <div className="finanzas-globales-nav-icono"><i className="fas fa-globe-americas"></i></div>
        <h1 className="finanzas-globales-nav-titulo">Finanzas Globales</h1>
      </nav>

      <div className="container-xl py-4 px-3 px-md-4">
        
        {/* Filtros de Fecha */}
        <div className="d-flex align-items-center gap-3 mb-4 flex-wrap">
          <div className="d-flex align-items-center gap-2">
            <label className="text-secondary fw-bold mb-0">Mes:</label>
            <select className="form-select form-select-sm bg-dark text-white border-secondary" value={mes} onChange={e => setMes(e.target.value)}>
              {[...Array(12)].map((_, i) => (
                <option key={i+1} value={i+1}>{new Date(0, i).toLocaleString('es', { month: 'long' }).toUpperCase()}</option>
              ))}
            </select>
          </div>
          <div className="d-flex align-items-center gap-2">
            <label className="text-secondary fw-bold mb-0">Año:</label>
            <select className="form-select form-select-sm bg-dark text-white border-secondary" value={anio} onChange={e => setAnio(e.target.value)}>
              {[2024, 2025, 2026, 2027].map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        </div>

        <div className="finanzas-globales-tabs-wrapper mb-4">
          <div className="finanzas-globales-tabs">
            {sliderStyle && <div className="finanzas-globales-tab-slider" style={sliderStyle} />}
            <button ref={el => tabRefs.current['dashboard'] = el} className={`finanzas-globales-tab ${pestaña === 'dashboard' ? 'activo' : ''}`} onClick={() => setPestaña('dashboard')}><i className="fas fa-chart-line"></i> Dashboard</button>
            <button ref={el => tabRefs.current['ingresos'] = el} className={`finanzas-globales-tab ${pestaña === 'ingresos' ? 'activo' : ''}`} onClick={() => setPestaña('ingresos')}><i className="fas fa-hand-holding-usd"></i> Historial Ingresos</button>
            <button ref={el => tabRefs.current['egresos'] = el} className={`finanzas-globales-tab ${pestaña === 'egresos' ? 'activo' : ''}`} onClick={() => setPestaña('egresos')}><i className="fas fa-file-invoice-dollar"></i> Historial Egresos</button>
            <button ref={el => tabRefs.current['nuevo_egreso'] = el} className={`finanzas-globales-tab ${pestaña === 'nuevo_egreso' ? 'activo' : ''}`} onClick={() => setPestaña('nuevo_egreso')}><i className="fas fa-plus-circle"></i> Registrar Egreso</button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-5"><AtletifyLoader /></div>
        ) : (
          <>
            {/* TAB DASHBOARD */}
            {pestaña === 'dashboard' && resumen && (
              <>
                <div className="row g-3 mb-4">
                  <div className="col-12 col-md-4">
                    <div className="finanzas-globales-kpi-card" style={{ borderColor: 'rgba(46, 204, 113, 0.3)' }}>
                      <div className="finanzas-globales-kpi-title"><i className="fas fa-arrow-up text-success"></i> Ingresos Totales</div>
                      <div className="finanzas-globales-kpi-value ingresos">{formatearDinero(resumen.totalIngresos)}</div>
                    </div>
                  </div>
                  <div className="col-12 col-md-4">
                    <div className="finanzas-globales-kpi-card" style={{ borderColor: 'rgba(231, 76, 60, 0.3)' }}>
                      <div className="finanzas-globales-kpi-title"><i className="fas fa-arrow-down text-danger"></i> Egresos Totales</div>
                      <div className="finanzas-globales-kpi-value egresos">{formatearDinero(resumen.totalEgresos)}</div>
                    </div>
                  </div>
                  <div className="col-12 col-md-4">
                    <div className="finanzas-globales-kpi-card" style={{ borderColor: 'rgba(79, 195, 247, 0.3)' }}>
                      <div className="finanzas-globales-kpi-title"><i className="fas fa-balance-scale text-info"></i> Balance (Utilidad)</div>
                      <div className="finanzas-globales-kpi-value balance">{formatearDinero(resumen.balanceGeneral)}</div>
                    </div>
                  </div>
                  
                  {resumen.estadisticas && (
                    <>
                      <div className="col-12 col-md-4">
                        <Link to="/gestion-finanzas" state={{ fromTab: 'semaforo' }} style={{ textDecoration: 'none' }}>
                          <div className="finanzas-globales-kpi-card finanzas-globales-clickable-card" style={{ borderColor: 'rgba(46, 204, 113, 0.25)' }}>
                            <div className="finanzas-globales-kpi-title text-secondary"><i className="fas fa-users text-primary"></i> Mensualidades Activas</div>
                            <div className="finanzas-globales-kpi-value fs-4 text-white">
                              {dashboardData?.estadoAtletas?.alDia ?? 0} <span className="fs-6 text-secondary">atletas al día</span>
                            </div>
                          </div>
                        </Link>
                      </div>
                      <div className="col-12 col-md-4">
                        <div className="finanzas-globales-kpi-card" style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}>
                          <div className="finanzas-globales-kpi-title text-secondary"><i className="fas fa-shopping-bag text-warning"></i> Operaciones en Tienda</div>
                          <div className="finanzas-globales-kpi-value fs-4 text-white">{resumen.estadisticas.ventasTienda} <span className="fs-6 text-secondary">ventas/abonos</span></div>
                        </div>
                      </div>
                      <div className="col-12 col-md-4">
                        <div className="finanzas-globales-kpi-card" style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}>
                          <div className="finanzas-globales-kpi-title text-secondary"><i className="fas fa-plane-arrival text-purple"></i> Turistas / Drop-Ins</div>
                          <div className="finanzas-globales-kpi-value fs-4 text-white">{resumen.estadisticas.dropIns} <span className="fs-6 text-secondary">visitas</span></div>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <div className="row g-4 mb-4">
                  <div className="col-md-6">
                    <div className="finanzas-globales-card">
                      <div className="finanzas-globales-card-title"><i className="fas fa-chart-pie text-success"></i> Desglose de Ingresos</div>
                      <div className="finanzas-globales-chart-container">
                        {resumen.ingresosPorCategoria.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie data={resumen.ingresosPorCategoria} dataKey="total" nameKey="categoria" cx="50%" cy="50%" innerRadius={60} outerRadius={100}>
                                {resumen.ingresosPorCategoria.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                              </Pie>
                              <Tooltip formatter={(value) => formatearDinero(value)} contentStyle={{ backgroundColor: '#1e1e26', border: '1px solid #333' }} />
                              <Legend wrapperStyle={{ paddingTop: '10px' }} />
                            </PieChart>
                          </ResponsiveContainer>
                        ) : <div className="finanzas-globales-empty"><i className="fas fa-folder-open"></i><p>Sin ingresos este mes</p></div>}
                      </div>
                    </div>
                  </div>

                  <div className="col-md-6">
                    <div className="finanzas-globales-card">
                      <div className="finanzas-globales-card-title"><i className="fas fa-balance-scale text-info"></i> Balance del Mes (Ingresos vs Egresos)</div>
                      <div className="finanzas-globales-chart-container">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={[{ name: 'Mes Actual', Ingresos: resumen.totalIngresos, Egresos: resumen.totalEgresos }]} margin={{ top: 15, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                            <XAxis dataKey="name" stroke="#ccc" />
                            <YAxis type="number" stroke="#ccc" tickFormatter={(value) => `$${value}`} />
                            <Tooltip formatter={(value) => formatearDinero(value)} cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{ backgroundColor: '#1e1e26', border: '1px solid #333', borderRadius: '8px' }} />
                            <Legend wrapperStyle={{ paddingTop: '10px' }} />
                            <Bar dataKey="Ingresos" fill="#2ecc71" radius={[4, 4, 0, 0]} barSize={60} />
                            <Bar dataKey="Egresos" fill="#e74c3c" radius={[4, 4, 0, 0]} barSize={60} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* TAB EGRESOS HISTORIAL */}
            {pestaña === 'egresos' && (
              <div className="finanzas-globales-card">
                <div className="finanzas-globales-card-title"><i className="fas fa-list text-warning"></i> Egresos de {new Date(anio, mes - 1).toLocaleString('es', {month: 'long'}).toUpperCase()}</div>
                {egresos.length === 0 ? (
                  <div className="finanzas-globales-empty"><i className="fas fa-receipt"></i><p>No se han registrado egresos este mes.</p></div>
                ) : (
                  <div className="table-responsive">
                    <table className="finanzas-globales-table">
                      <thead>
                        <tr>
                          <th>Fecha</th>
                          <th>Categoría</th>
                          <th>Descripción</th>
                          <th>Monto</th>
                          <th style={{ textAlign: 'right' }}>Acción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {egresos.map(e => (
                          <tr key={e.idEgreso}>
                            <td>{new Date(e.fechaEgreso).toLocaleDateString()}</td>
                            <td><span className={getBadgeClass(e.categoria)}>{e.categoria}</span></td>
                            <td className="text-secondary">{e.notas || 'Sin notas'}</td>
                            <td className="text-danger fw-bold">{formatearDinero(e.monto)}</td>
                            <td style={{ textAlign: 'right' }}>
                              <button className="finanzas-globales-btn-danger" onClick={() => eliminarEgreso(e.idEgreso)}>
                                <i className="fas fa-trash"></i>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB INGRESOS HISTORIAL */}
            {pestaña === 'ingresos' && (
              <div className="finanzas-globales-card">
                <div className="finanzas-globales-card-title"><i className="fas fa-hand-holding-usd text-success"></i> Ingresos de {new Date(anio, mes - 1).toLocaleString('es', {month: 'long'}).toUpperCase()}</div>
                {ingresos.length === 0 ? (
                  <div className="finanzas-globales-empty"><i className="fas fa-wallet"></i><p>No hay ingresos registrados este mes.</p></div>
                ) : (
                  <div className="table-responsive">
                    <table className="finanzas-globales-table">
                      <thead>
                        <tr>
                          <th>Fecha</th>
                          <th>Categoría</th>
                          <th>Detalle / Origen</th>
                          <th style={{ textAlign: 'right' }}>Monto</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ingresos.map((i, index) => (
                          <tr key={`${i.id}-${index}`}>
                            <td>{new Date(i.fecha).toLocaleDateString()}</td>
                            <td><span className={getBadgeClass(i.categoria)}>{i.categoria}</span></td>
                            <td className="text-secondary">{i.notas || 'Ingreso del sistema'}</td>
                            <td className="text-success fw-bold" style={{ textAlign: 'right' }}>+{formatearDinero(i.monto)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB NUEVO EGRESO */}
            {pestaña === 'nuevo_egreso' && (
              <div className="row justify-content-center">
                <div className="col-md-8 col-lg-6">
                  <div className="finanzas-globales-card">
                    <div className="finanzas-globales-card-title"><i className="fas fa-hand-holding-usd text-danger"></i> Registrar Salida de Dinero</div>
                    <form onSubmit={registrarEgreso}>
                      <div className="mb-3">
                        <label className="text-secondary small fw-bold mb-1">Monto ($)</label>
                        <input type="number" step="0.01" className="finanzas-globales-input" placeholder="Ej. 1500.00" value={formEgreso.monto} onChange={e => setFormEgreso({...formEgreso, monto: e.target.value})} required />
                      </div>
                      
                      <div className="mb-3">
                        <label className="text-secondary small fw-bold mb-1">Categoría</label>
                        <select className="finanzas-globales-input" value={formEgreso.categoria} onChange={e => setFormEgreso({...formEgreso, categoria: e.target.value})}>
                          <option value="Pago Coach">Pago Coach</option>
                          <option value="Mantenimiento">Mantenimiento</option>
                          <option value="Servicios">Servicios (Luz, Agua, Internet)</option>
                          <option value="Equipo">Compra de Equipo</option>
                          <option value="Otros">Otros Gastos</option>
                        </select>
                      </div>

                      <div className="mb-3">
                        <label className="text-secondary small fw-bold mb-1">Descripción / Notas</label>
                        <textarea className="finanzas-globales-input" rows="3" placeholder="Ej. Pago quincenal Coach Juan" value={formEgreso.notas} onChange={e => setFormEgreso({...formEgreso, notas: e.target.value})}></textarea>
                      </div>

                      <div className="mb-4">
                        <label className="text-secondary small fw-bold mb-1">URL Comprobante (Opcional)</label>
                        <input type="url" className="finanzas-globales-input" placeholder="https://..." value={formEgreso.comprobanteUrl} onChange={e => setFormEgreso({...formEgreso, comprobanteUrl: e.target.value})} />
                      </div>

                      <button type="submit" className="finanzas-globales-btn w-100">
                        <i className="fas fa-save"></i> Guardar Egreso
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
