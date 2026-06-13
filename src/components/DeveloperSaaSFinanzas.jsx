import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import AtletifyLoader from '../components/AtletifyLoader';
import ModalAdminBox from './ModalAdminBox';
import ModalModulosBox from './ModalModulosBox';
import '../assets/css/DeveloperSaaSFinanzas.css';

const PAGE_SIZE = 10;

// Quita tildes y pasa a minúsculas para búsquedas tolerantes
const normalizar = (txt = '') =>
  txt.toString().normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

// Metadatos visuales de cada estado del servicio SaaS
const ESTATUS = [
  { value: 'Pendiente',  label: 'Pendiente',  color: 'var(--accent)',      icon: 'fa-hourglass-half', desc: 'Aún sin activar la suscripción' },
  { value: 'Activo',     label: 'Activo',      color: 'var(--success)',     icon: 'fa-circle-check',   desc: 'Servicio operativo y al día' },
  { value: 'Gracia',     label: 'En Gracia',   color: 'var(--accent-cool)', icon: 'fa-clock',          desc: 'Periodo de cortesía antes de suspender' },
  { value: 'Suspendido', label: 'Suspendido',  color: 'var(--primary)',     icon: 'fa-ban',            desc: 'Acceso bloqueado por falta de pago' },
];
const getEstatusMeta = (value) => ESTATUS.find(e => e.value === value) || ESTATUS[0];

const DeveloperSaaSFinanzas = ({ onDataChanged }) => {
  const [boxes, setBoxes] = useState([]);
  const [planes, setPlanes] = useState([]);
  const [loading, setLoading] = useState(true);

  // ── Buscador + paginación de cajas ──
  const [busqueda, setBusqueda] = useState('');
  const [pagina, setPagina] = useState(1);

  // ── Selectores modales (reemplazan a los <select> nativos) ──
  const [planPicker, setPlanPicker] = useState(null);       // { idBox, nombre, actualId }
  const [planBuscar, setPlanBuscar] = useState('');
  const [estatusPicker, setEstatusPicker] = useState(null); // { idBox, nombre, actual }

  // ── Agregar admin a un box (chooser + manual + link por correo) ──
  const [chooser, setChooser]       = useState(null); // { idBox, nombre }
  const [modalManual, setModalManual] = useState(null); // { idBox, nombre }
  const [modalLink, setModalLink]   = useState(null); // { idBox, nombre }
  const [correoInvite, setCorreoInvite] = useState('');
  const [enviandoInvite, setEnviandoInvite] = useState(false);

  // ── Eliminar box (confirmación + texto de seguridad) ──
  const [confirmDelete, setConfirmDelete] = useState(null); // { idBox, nombre }
  const [textoConfirm, setTextoConfirm] = useState('');
  const [eliminando, setEliminando] = useState(false);

  // ── Modal de módulos por box (override del plan) ──
  const [modulosPicker, setModulosPicker] = useState(null); // el objeto box completo

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

  useEffect(() => { cargarData(); }, []);

  const eliminarBox = async () => {
    if (!confirmDelete) return;
    setEliminando(true);
    try {
      const base = import.meta.env.VITE_API_URL;
      const res = await fetch(`${base}/api/box/${confirmDelete.idBox}/cascade`, {
        method: 'DELETE',
        headers: authHeader()
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.mensaje || data.detalle || 'No se pudo eliminar el box');
      window.alert(data.mensaje || 'Box eliminado.');
      setConfirmDelete(null);
      setTextoConfirm('');
      cargarData();
      onDataChanged?.(); // refresca Control Global de Roles + selector de boxes del dev
    } catch (e) {
      window.alert(`Error: ${e.message}`);
    } finally {
      setEliminando(false);
    }
  };

  const enviarInvitacionLink = async () => {
    const correo = correoInvite.trim();
    if (!correo || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
      window.alert('Ingresa un correo válido.');
      return;
    }
    setEnviandoInvite(true);
    try {
      const base = import.meta.env.VITE_API_URL;
      const res = await fetch(`${base}/api/developer/invitar-admin-box-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({ correo, idBox: modalLink.idBox })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.mensaje || 'No se pudo enviar la invitación');
      window.alert(data.mensaje || 'Invitación enviada.');
      setModalLink(null);
      setCorreoInvite('');
    } catch (e) {
      window.alert(`Error: ${e.message}`);
    } finally {
      setEnviandoInvite(false);
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
    } catch {
      window.alert('Error al actualizar permisos de SaaS para el Box.');
    }
  };

  const formatearDinero = (monto) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(monto || 0);
  const nombrePlan = (idPlan) => planes.find(p => p.idPlan === idPlan)?.nombre || null;

  // ── Cajas filtradas por buscador (nombre, ubicación, plan, estado) ──
  const boxesFiltrados = useMemo(() => {
    const q = normalizar(busqueda);
    if (!q) return boxes;
    return boxes.filter(b => {
      const hay = [
        b.nombre,
        b.ubicacion,
        nombrePlan(b.idPlanSaaS),
        getEstatusMeta(b.estatusSaaS).label,
        b.moduloCompetenciasActivo ? 'competencias' : ''
      ].map(normalizar).join(' ');
      return hay.includes(q);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boxes, busqueda, planes]);

  // ── Paginación de 10 en 10 ──
  const totalPaginas = Math.max(1, Math.ceil(boxesFiltrados.length / PAGE_SIZE));
  const paginaSegura = Math.min(pagina, totalPaginas);
  const itemsPagina = boxesFiltrados.slice((paginaSegura - 1) * PAGE_SIZE, paginaSegura * PAGE_SIZE);
  const desde = boxesFiltrados.length === 0 ? 0 : (paginaSegura - 1) * PAGE_SIZE + 1;
  const hasta = Math.min(paginaSegura * PAGE_SIZE, boxesFiltrados.length);

  // Reset a página 1 al cambiar el buscador (sin efecto: evita renders en cascada)
  const handleBuscar = (valor) => { setBusqueda(valor); setPagina(1); };

  if (loading) return (
    <div className="dsf-root dsf-loading-wrap">
      <AtletifyLoader />
    </div>
  );

  // ── Métricas ──
  const boxesActivos = boxes.filter(b => b.estatusSaaS === 'Activo' || b.activo);
  let mrr = 0;

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

  const COLORS = ['#4FC3F7', '#F5A623', '#E63946', '#9b59b6', '#2ECC71'];
  const tooltipStyle = { backgroundColor: '#1C1C26', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, color: '#F0F0F5' };

  const KPIS = [
    { label: 'MRR (Mensual)', value: formatearDinero(mrr), color: 'var(--success)', icon: 'fa-money-bill-wave' },
    { label: 'ARR (Anual)', value: formatearDinero(arr), color: 'var(--accent-cool)', icon: 'fa-calendar-alt' },
    { label: 'Boxes Activos', value: boxesActivos.length, color: '#9b59b6', icon: 'fa-boxes' },
    { label: 'Usuarios (Red)', value: totalUsuarios, color: 'var(--primary)', icon: 'fa-users' },
  ];

  // ── Filtrado de planes dentro del modal selector ──
  const planesFiltrados = (() => {
    const q = normalizar(planBuscar);
    if (!q) return planes;
    return planes.filter(p => normalizar(`${p.nombre} ${p.precio}`).includes(q));
  })();

  // Construye los números de página visibles (con elipsis)
  const numerosPagina = () => {
    const nums = [];
    const max = totalPaginas;
    const cur = paginaSegura;
    const push = (n) => nums.push(n);
    if (max <= 7) { for (let i = 1; i <= max; i++) push(i); return nums; }
    push(1);
    if (cur > 3) push('…');
    for (let i = Math.max(2, cur - 1); i <= Math.min(max - 1, cur + 1); i++) push(i);
    if (cur < max - 2) push('…');
    push(max);
    return nums;
  };

  return (
    <section className="dash-section pt-0 dsf-root">
      {/* ── Encabezado ── */}
      <div className="dsf-head">
        <p className="dsf-supertitle">Control B2B</p>
        <h2 className="dsf-title">
          <i className="fas fa-chart-pie"></i> Control de SaaS &amp; Finanzas
        </h2>
      </div>

      {/* ── KPIs ── */}
      <div className="row g-3 mb-4">
        {KPIS.map((k, i) => (
          <div className="col-6 col-lg-3" key={i}>
            <div className="dsf-kpi" style={{ '--k': k.color }}>
              <div className="dsf-kpi-head">
                <span className="dsf-kpi-icon"><i className={`fas ${k.icon}`}></i></span>
                <span className="dsf-kpi-label">{k.label}</span>
              </div>
              <div className="dsf-kpi-value">{k.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Gráficos ── */}
      <div className="row g-3 g-md-4 mb-4">
        <div className="col-12 col-lg-6">
          <div className="dsf-panel dsf-panel--chart">
            <div className="dsf-panel-head">
              <h3 className="dsf-panel-title"><i className="fas fa-chart-pie"></i> MRR por Plan</h3>
            </div>
            <div className="dsf-chart-wrap">
              {chartDataPlanes.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={chartDataPlanes} dataKey="ingresos" nameKey="nombre" cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={2}>
                      {chartDataPlanes.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="#14141A" strokeWidth={2} />)}
                    </Pie>
                    <Tooltip formatter={(value) => formatearDinero(value)} contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="dsf-chart-empty">
                  <i className="fas fa-chart-pie"></i>
                  <p>Sin datos de ingresos</p>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="col-12 col-lg-6">
          <div className="dsf-panel dsf-panel--chart">
            <div className="dsf-panel-head">
              <h3 className="dsf-panel-title"><i className="fas fa-chart-bar"></i> Boxes por Plan</h3>
            </div>
            <div className="dsf-chart-wrap">
              {chartDataPlanes.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartDataPlanes} margin={{ top: 15, right: 20, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                    <XAxis dataKey="nombre" stroke="#6B7280" fontSize={12} tickLine={false} />
                    <YAxis stroke="#6B7280" fontSize={12} allowDecimals={false} tickLine={false} axisLine={false} />
                    <Tooltip cursor={{ fill: 'rgba(255,255,255,0.04)' }} contentStyle={tooltipStyle} />
                    <Bar dataKey="boxes" fill="#4FC3F7" radius={[6, 6, 0, 0]} barSize={42} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="dsf-chart-empty">
                  <i className="fas fa-chart-bar"></i>
                  <p>Sin datos de planes</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Panel: Control de Permisos ── */}
      <div className="dsf-panel">
        <div className="dsf-panel-head">
          <h3 className="dsf-panel-title dsf-panel-title--lock"><i className="fas fa-lock"></i> Control de Permisos de Cajas (SaaS)</h3>
        </div>

        {/* Buscador */}
        <div className="dsf-toolbar">
          <div className="dsf-search">
            <i className="fas fa-search dsf-search-icon"></i>
            <input
              type="text"
              className="dsf-search-input"
              placeholder="Buscar box, ubicación, plan o estado…"
              value={busqueda}
              onChange={(e) => handleBuscar(e.target.value)}
            />
          </div>
        </div>

        {boxesFiltrados.length > 0 && (
          <div className="dsf-summary">
            Mostrando <strong>{desde}–{hasta}</strong> de <strong>{boxesFiltrados.length}</strong> {boxesFiltrados.length === 1 ? 'box' : 'boxes'}
          </div>
        )}

        {boxesFiltrados.length === 0 ? (
          <div className="dsf-empty">
            <i className="fas fa-box-open"></i>
            <p>{busqueda ? 'Ningún box coincide con tu búsqueda.' : 'Sin boxes registrados.'}</p>
          </div>
        ) : (
          <>
            {/* ── Desktop (≥1200px): tabla ── */}
            <div className="dsf-table-wrap d-none d-xl-block">
              <table className="dsf-table">
                <thead>
                  <tr>
                    <th>Box</th>
                    <th>Red de Atletas</th>
                    <th>Plan de Suscripción</th>
                    <th style={{ textAlign: 'center' }}>Módulo Competencias</th>
                    <th>Estado del Servicio</th>
                    <th style={{ textAlign: 'center' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {itemsPagina.map(box => {
                    const est = getEstatusMeta(box.estatusSaaS);
                    const plan = nombrePlan(box.idPlanSaaS);
                    return (
                      <tr key={box.idBox}>
                        <td>
                          <div className="dsf-box-name">{box.nombre}</div>
                          <div className="dsf-box-loc"><i className="fas fa-map-marker-alt"></i>{box.ubicacion || 'Sin ubicación'}</div>
                        </td>
                        <td>
                          <span className="dsf-pill"><i className="fas fa-users"></i> {box.totalAtletas}</span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="dsf-picker-btn"
                            onClick={() => { setPlanBuscar(''); setPlanPicker({ idBox: box.idBox, nombre: box.nombre, actualId: box.idPlanSaaS || null }); }}
                          >
                            <span className={`dsf-picker-label ${plan ? '' : 'dsf-picker-label--vacio'}`}>{plan || 'Sin plan'}</span>
                            <i className="fas fa-chevron-down dsf-picker-arrow"></i>
                          </button>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            className="dsf-toggle"
                            checked={!!box.moduloCompetenciasActivo}
                            onChange={(e) => handleActualizarBoxSaaS(box.idBox, 'moduloCompetenciasActivo', e.target.checked)}
                          />
                        </td>
                        <td>
                          <button
                            type="button"
                            className="dsf-status-btn"
                            style={{ '--st': est.color }}
                            onClick={() => setEstatusPicker({ idBox: box.idBox, nombre: box.nombre, actual: box.estatusSaaS || 'Pendiente' })}
                          >
                            <span className="dsf-status-btn__txt"><i className={`fas ${est.icon}`}></i>{est.label}</span>
                            <i className="fas fa-chevron-down dsf-status-btn__arrow"></i>
                          </button>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div className="dsf-actions">
                            <button type="button" className="dsf-icon-btn" title="Módulos del box" onClick={() => setModulosPicker(box)}>
                              <i className="fas fa-sliders-h"></i>
                            </button>
                            <button type="button" className="dsf-add-btn" onClick={() => setChooser({ idBox: box.idBox, nombre: box.nombre })}>
                              <i className="fas fa-user-plus"></i>
                              <span className="dsf-add-btn-label">Admin</span>
                            </button>
                            <button
                              type="button"
                              className="dsf-icon-btn dsf-icon-btn--delete"
                              title="Eliminar box"
                              onClick={() => { setConfirmDelete({ idBox: box.idBox, nombre: box.nombre }); setTextoConfirm(''); }}
                            >
                              <i className="fas fa-trash-alt"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ── Móvil / tablet (<1200px): tarjetas ── */}
            <div className="dsf-cards d-xl-none">
              {itemsPagina.map(box => {
                const est = getEstatusMeta(box.estatusSaaS);
                const plan = nombrePlan(box.idPlanSaaS);
                return (
                  <div key={box.idBox} className="dsf-box-card">
                    <div className="dsf-card-top">
                      <div className="dsf-card-top-info">
                        <div className="dsf-box-name">{box.nombre}</div>
                        <div className="dsf-box-loc"><i className="fas fa-map-marker-alt"></i>{box.ubicacion || 'Sin ubicación'}</div>
                      </div>
                      <span className="dsf-pill"><i className="fas fa-users"></i> {box.totalAtletas}</span>
                    </div>

                    <div className="dsf-field">
                      <label className="dsf-field-label">Plan de Suscripción</label>
                      <button
                        type="button"
                        className="dsf-picker-btn"
                        onClick={() => { setPlanBuscar(''); setPlanPicker({ idBox: box.idBox, nombre: box.nombre, actualId: box.idPlanSaaS || null }); }}
                      >
                        <span className={`dsf-picker-label ${plan ? '' : 'dsf-picker-label--vacio'}`}>{plan || 'Sin plan'}</span>
                        <i className="fas fa-chevron-down dsf-picker-arrow"></i>
                      </button>
                    </div>

                    <div className="dsf-field dsf-field--row">
                      <label className="dsf-field-label">Módulo Competencias</label>
                      <input
                        type="checkbox"
                        className="dsf-toggle"
                        checked={!!box.moduloCompetenciasActivo}
                        onChange={(e) => handleActualizarBoxSaaS(box.idBox, 'moduloCompetenciasActivo', e.target.checked)}
                      />
                    </div>

                    <div className="dsf-field">
                      <label className="dsf-field-label">Estado del Servicio</label>
                      <button
                        type="button"
                        className="dsf-status-btn"
                        style={{ '--st': est.color }}
                        onClick={() => setEstatusPicker({ idBox: box.idBox, nombre: box.nombre, actual: box.estatusSaaS || 'Pendiente' })}
                      >
                        <span className="dsf-status-btn__txt"><i className={`fas ${est.icon}`}></i>{est.label}</span>
                        <i className="fas fa-chevron-down dsf-status-btn__arrow"></i>
                      </button>
                    </div>

                    <div className="dsf-card-actions">
                      <button type="button" className="dsf-add-btn" onClick={() => setModulosPicker(box)}>
                        <i className="fas fa-sliders-h"></i>
                        <span className="dsf-add-btn-label">Módulos</span>
                      </button>
                      <button type="button" className="dsf-add-btn" onClick={() => setChooser({ idBox: box.idBox, nombre: box.nombre })}>
                        <i className="fas fa-user-plus"></i>
                        <span className="dsf-add-btn-label">Agregar admin</span>
                      </button>
                      <button
                        type="button"
                        className="dsf-icon-btn dsf-icon-btn--delete"
                        title="Eliminar box"
                        onClick={() => { setConfirmDelete({ idBox: box.idBox, nombre: box.nombre }); setTextoConfirm(''); }}
                      >
                        <i className="fas fa-trash-alt"></i>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── Paginación ── */}
            {totalPaginas > 1 && (
              <div className="dsf-pag">
                <button className="dsf-pag-btn" disabled={paginaSegura === 1} onClick={() => setPagina(p => Math.max(1, p - 1))}>
                  <i className="fas fa-chevron-left"></i>
                </button>
                {numerosPagina().map((n, i) => n === '…' ? (
                  <span key={`e-${i}`} className="dsf-pag-ellipsis">…</span>
                ) : (
                  <button
                    key={n}
                    className={`dsf-pag-btn ${n === paginaSegura ? 'dsf-pag-btn--active' : ''}`}
                    onClick={() => setPagina(n)}
                  >
                    {n}
                  </button>
                ))}
                <button className="dsf-pag-btn" disabled={paginaSegura === totalPaginas} onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}>
                  <i className="fas fa-chevron-right"></i>
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ════ MODAL: MÓDULOS DEL BOX (override del plan) ════ */}
      {modulosPicker && (
        <ModalModulosBox
          box={modulosPicker}
          planes={planes}
          onClose={() => setModulosPicker(null)}
          onSaved={(idBox, overrideJSON, compActivo, vencISO) => {
            setBoxes(prev => prev.map(b => b.idBox === idBox
              ? { ...b, modulosOverrideJSON: overrideJSON, moduloCompetenciasActivo: compActivo, fechaVencimientoSaaS: vencISO ?? b.fechaVencimientoSaaS }
              : b));
          }}
        />
      )}

      {/* ════ MODAL: SELECCIONAR PLAN ════ */}
      {planPicker && createPortal(
        <div className="dsf-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setPlanPicker(null); }}>
          <div className="dsf-modal">
            <div className="dsf-modal-header">
              <div>
                <p className="dsf-modal-supertitle">Plan de Suscripción</p>
                <h3 className="dsf-modal-title">{planPicker.nombre}</h3>
              </div>
              <button type="button" className="dsf-modal-close" onClick={() => setPlanPicker(null)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="dsf-modal-search">
              <i className="fas fa-search dsf-modal-search-icon"></i>
              <input
                type="text"
                className="dsf-modal-search-input"
                placeholder="Buscar plan…"
                value={planBuscar}
                onChange={(e) => setPlanBuscar(e.target.value)}
                autoFocus
              />
            </div>
            <div className="dsf-pick-list">
              {!planBuscar && (
                <button
                  type="button"
                  className={`dsf-pick-opt ${planPicker.actualId == null ? 'dsf-pick-opt--active' : ''}`}
                  onClick={() => { handleActualizarBoxSaaS(planPicker.idBox, 'idPlanSaaS', null); setPlanPicker(null); }}
                >
                  <span className="dsf-pick-dot"><i className="fas fa-ban"></i></span>
                  <div className="dsf-pick-info">
                    <span className="dsf-pick-name">Sin plan</span>
                    <span className="dsf-pick-desc">El box no tiene suscripción asignada</span>
                  </div>
                  {planPicker.actualId == null && <i className="fas fa-check dsf-pick-check"></i>}
                </button>
              )}
              {planesFiltrados.length === 0 ? (
                <div className="dsf-pick-empty">No hay planes que coincidan.</div>
              ) : planesFiltrados.map((p, idx) => {
                const activo = planPicker.actualId === p.idPlan;
                const color = COLORS[idx % COLORS.length];
                return (
                  <button
                    key={p.idPlan}
                    type="button"
                    className={`dsf-pick-opt ${activo ? 'dsf-pick-opt--active' : ''}`}
                    style={{ '--oc': color }}
                    onClick={() => { handleActualizarBoxSaaS(planPicker.idBox, 'idPlanSaaS', p.idPlan); setPlanPicker(null); }}
                  >
                    <span className="dsf-pick-dot"><i className="fas fa-tag"></i></span>
                    <div className="dsf-pick-info">
                      <span className="dsf-pick-name">{p.nombre}</span>
                      <span className="dsf-pick-desc">{formatearDinero(p.precio)} / mes</span>
                    </div>
                    {activo && <i className="fas fa-check dsf-pick-check"></i>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>, document.body
      )}

      {/* ════ MODAL: SELECCIONAR ESTADO DEL SERVICIO ════ */}
      {estatusPicker && createPortal(
        <div className="dsf-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setEstatusPicker(null); }}>
          <div className="dsf-modal">
            <div className="dsf-modal-header">
              <div>
                <p className="dsf-modal-supertitle">Estado del Servicio</p>
                <h3 className="dsf-modal-title">{estatusPicker.nombre}</h3>
              </div>
              <button type="button" className="dsf-modal-close" onClick={() => setEstatusPicker(null)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="dsf-pick-list">
              {ESTATUS.map(e => {
                const activo = estatusPicker.actual === e.value;
                return (
                  <button
                    key={e.value}
                    type="button"
                    className={`dsf-pick-opt ${activo ? 'dsf-pick-opt--active' : ''}`}
                    style={{ '--oc': e.color }}
                    onClick={() => { handleActualizarBoxSaaS(estatusPicker.idBox, 'estatusSaaS', e.value); setEstatusPicker(null); }}
                  >
                    <span className="dsf-pick-dot"><i className={`fas ${e.icon}`}></i></span>
                    <div className="dsf-pick-info">
                      <span className="dsf-pick-name">{e.label}</span>
                      <span className="dsf-pick-desc">{e.desc}</span>
                    </div>
                    {activo && <i className="fas fa-check dsf-pick-check"></i>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>, document.body
      )}

      {/* ── Confirmar eliminación de box ── */}
      {confirmDelete && createPortal(
        <div className="dsf-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget && !eliminando) { setConfirmDelete(null); setTextoConfirm(''); } }}>
          <div className="dsf-modal" style={{ borderTopColor: 'var(--danger)' }}>
            <div className="dsf-modal-header">
              <div>
                <p className="dsf-modal-supertitle" style={{ color: 'var(--danger)' }}>ELIMINAR BOX</p>
                <h3 className="dsf-modal-title">{confirmDelete.nombre}</h3>
              </div>
              <button type="button" className="dsf-modal-close" onClick={() => { if (!eliminando) { setConfirmDelete(null); setTextoConfirm(''); } }}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="dsf-modal-body">
              <div className="dsf-danger-note">
                <i className="fas fa-exclamation-triangle"></i>
                <span>
                  Esta acción es <strong>permanente</strong>. Se eliminarán el box y <strong>todos sus datos</strong>:
                  usuarios (admins, coaches y atletas), clases, finanzas, ventas, competencias y configuración. No se puede deshacer.
                </span>
              </div>
              <label className="dsf-label">Para confirmar, escribe el nombre del box:</label>
              <input
                type="text"
                className="dsf-input"
                placeholder={confirmDelete.nombre}
                value={textoConfirm}
                onChange={(e) => setTextoConfirm(e.target.value)}
                autoFocus
                disabled={eliminando}
              />
              <button
                type="button"
                className="dsf-send-btn"
                style={{ background: 'var(--danger)' }}
                disabled={eliminando || textoConfirm.trim() !== confirmDelete.nombre.trim()}
                onClick={eliminarBox}
              >
                {eliminando
                  ? <><span className="spinner-border spinner-border-sm me-2"></span>Eliminando...</>
                  : <><i className="fas fa-trash-alt me-2"></i>Eliminar definitivamente</>}
              </button>
            </div>
          </div>
        </div>, document.body
      )}

      {/* ── Chooser: cómo agregar el admin ── */}
      {chooser && createPortal(
        <div className="dsf-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setChooser(null); }}>
          <div className="dsf-modal">
            <div className="dsf-modal-header">
              <div>
                <p className="dsf-modal-supertitle">AGREGAR ADMIN</p>
                <h3 className="dsf-modal-title">{chooser.nombre}</h3>
              </div>
              <button type="button" className="dsf-modal-close" onClick={() => setChooser(null)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="dsf-modal-body">
              <button
                type="button"
                className="dsf-option"
                onClick={() => { setModalManual({ idBox: chooser.idBox, nombre: chooser.nombre }); setChooser(null); }}
              >
                <i className="fas fa-keyboard dsf-option-icon"></i>
                <div className="dsf-option-text">
                  <span className="dsf-option-title">Registrar manual</span>
                  <span className="dsf-option-desc">Capturas los datos del admin y se crea al instante con su contraseña.</span>
                </div>
                <i className="fas fa-chevron-right dsf-option-arrow"></i>
              </button>
              <button
                type="button"
                className="dsf-option"
                onClick={() => { setModalLink({ idBox: chooser.idBox, nombre: chooser.nombre }); setCorreoInvite(''); setChooser(null); }}
              >
                <i className="fas fa-paper-plane dsf-option-icon"></i>
                <div className="dsf-option-text">
                  <span className="dsf-option-title">Enviar link por correo</span>
                  <span className="dsf-option-desc">Envías un enlace de un solo uso (24 h) para que el admin complete su registro.</span>
                </div>
                <i className="fas fa-chevron-right dsf-option-arrow"></i>
              </button>
            </div>
          </div>
        </div>, document.body
      )}

      {/* ── Modal: invitar por correo ── */}
      {modalLink && createPortal(
        <div className="dsf-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget && !enviandoInvite) setModalLink(null); }}>
          <div className="dsf-modal">
            <div className="dsf-modal-header">
              <div>
                <p className="dsf-modal-supertitle">INVITACIÓN POR CORREO</p>
                <h3 className="dsf-modal-title">{modalLink.nombre}</h3>
              </div>
              <button type="button" className="dsf-modal-close" onClick={() => !enviandoInvite && setModalLink(null)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="dsf-modal-body">
              <label className="dsf-label">Correo del nuevo administrador</label>
              <input
                type="email"
                className="dsf-input"
                placeholder="correo@ejemplo.com"
                value={correoInvite}
                onChange={(e) => setCorreoInvite(e.target.value)}
                autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter') enviarInvitacionLink(); }}
              />
              <p className="dsf-hint">Se enviará un enlace de un solo uso que expira en 24 horas.</p>
              <button type="button" className="dsf-send-btn" onClick={enviarInvitacionLink} disabled={enviandoInvite}>
                {enviandoInvite
                  ? <><span className="spinner-border spinner-border-sm me-2"></span>Enviando...</>
                  : <><i className="fas fa-paper-plane me-2"></i>Enviar invitación</>}
              </button>
            </div>
          </div>
        </div>, document.body
      )}

      {/* ── Modal: registrar manual (box existente) ── */}
      {modalManual && (
        <ModalAdminBox
          abierto={true}
          boxExistente={{ idBox: modalManual.idBox, nombre: modalManual.nombre }}
          onClose={() => setModalManual(null)}
          onSuccess={() => { setModalManual(null); cargarData(); onDataChanged?.(); }}
        />
      )}

    </section>
  );
};

export default DeveloperSaaSFinanzas;
