import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AtletifyLoader from '../components/AtletifyLoader';
import BackButton from '../components/BackButton';
import '../assets/css/admin-saas.css';

const AdminSaaS = () => {
  const [planes, setPlanes] = useState([]);
  const [codigos, setCodigos] = useState([]);
  const [tokensComp, setTokensComp] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const [nuevoPlan, setNuevoPlan] = useState({
    nombre: '', precio: '', mesesDuracion: 1,
    limiteAtletas: '', costoPorAtletaExtra: '',
    incluyeCompetencias: false, esRecomendado: false,
    categoria: 'Administración', costoCapacitacion: 0, beneficiosJSON: ''
  });

  const [nuevoCodigo, setNuevoCodigo] = useState({
    codigo: '', mesesGratis: 1, idPlanSaaS: '', limiteUsos: 1
  });

  const [nuevoTokenComp, setNuevoTokenComp] = useState({
    idPlanSaaS: '', correoDestino: '', diasValidez: 365
  });

  useEffect(() => { cargarData(); }, []);

  const authHeader = () => ({
    Authorization: `Bearer ${localStorage.getItem('token')}`
  });

  const cargarData = async () => {
    try {
      const base = import.meta.env.VITE_API_URL;

      const resPlanes = await fetch(`${base}/api/developer/planes`, { headers: authHeader() });
      if (resPlanes.status === 401 || resPlanes.status === 403) { navigate('/dashboard'); return; }
      setPlanes(await resPlanes.json());

      const resCodigos = await fetch(`${base}/api/developer/codigos`, { headers: authHeader() });
      setCodigos(await resCodigos.json());

      const resTokens = await fetch(`${base}/api/developer/tokens`, { headers: authHeader() });
      if (resTokens.ok) setTokensComp(await resTokens.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCrearPlan = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/developer/planes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({
          nombre: nuevoPlan.nombre,
          precio: parseFloat(nuevoPlan.precio) || 0,
          mesesDuracion: parseInt(nuevoPlan.mesesDuracion) || 1,
          limiteAtletas: parseInt(nuevoPlan.limiteAtletas) || 0,
          costoPorAtletaExtra: parseFloat(nuevoPlan.costoPorAtletaExtra) || 0,
          incluyeCompetencias: nuevoPlan.incluyeCompetencias,
          esRecomendado: nuevoPlan.esRecomendado,
          categoria: nuevoPlan.categoria,
          costoCapacitacion: parseFloat(nuevoPlan.costoCapacitacion) || 0,
          beneficiosJSON: nuevoPlan.beneficiosJSON
        })
      });
      if (!res.ok) throw new Error();
      window.alert('Plan creado con éxito');
      cargarData();
    } catch {
      window.alert('Error al crear plan');
    }
  };

  const handleCrearCodigo = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/developer/codigos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({
          ...nuevoCodigo,
          idPlanSaaS: nuevoCodigo.idPlanSaaS ? parseInt(nuevoCodigo.idPlanSaaS) : null
        })
      });
      if (!res.ok) throw new Error();
      window.alert('Código generado con éxito');
      cargarData();
    } catch {
      window.alert('Error al generar código');
    }
  };

  const handleCrearTokenComp = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/developer/tokens`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({
          idPlanSaaS: parseInt(nuevoTokenComp.idPlanSaaS),
          correoDestino: nuevoTokenComp.correoDestino,
          diasValidez: parseInt(nuevoTokenComp.diasValidez) || 365
        })
      });
      if (!res.ok) throw new Error();
      window.alert('Token de competencia generado con éxito');
      cargarData();
    } catch {
      window.alert('Error al generar token de competencia');
    }
  };

  const handleEliminarPlan = async (id) => {
    if (!await window.wpConfirm('¿Seguro que deseas eliminar este plan?')) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/developer/planes/${id}`, {
        method: 'DELETE', headers: authHeader()
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.mensaje || 'Error al eliminar');
      window.alert(data.mensaje || 'Plan eliminado exitosamente');
      cargarData();
    } catch (e) {
      window.alert(e.message || 'Error al eliminar plan');
    }
  };

  const handleEliminarCodigo = async (id) => {
    if (!await window.wpConfirm('¿Seguro que deseas eliminar este código?')) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/developer/codigos/${id}`, {
        method: 'DELETE', headers: authHeader()
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.mensaje || 'Error al eliminar');
      window.alert(data.mensaje || 'Código eliminado exitosamente');
      cargarData();
    } catch (e) {
      window.alert(e.message || 'Error al eliminar código');
    }
  };

  const handleEliminarTokenComp = async (id) => {
    if (!await window.wpConfirm('¿Seguro que deseas eliminar este token?')) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/developer/tokens/${id}`, {
        method: 'DELETE', headers: authHeader()
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.mensaje || 'Error al eliminar');
      window.alert(data.mensaje || 'Token eliminado exitosamente');
      cargarData();
    } catch (e) {
      window.alert(e.message || 'Error al eliminar token');
    }
  };

  const generarCodigoAleatorio = () =>
    setNuevoCodigo({ ...nuevoCodigo, codigo: 'TOKEN-' + Math.random().toString(36).substring(2, 10).toUpperCase() });

  if (loading) return (
    <div className="min-vh-100 d-flex justify-content-center align-items-center" style={{ background: 'var(--bg-base)' }}>
      <AtletifyLoader />
    </div>
  );

  return (
    <div className="as-page">

      {/* ── HEADER ── */}
      <div className="as-header">
        <div className="d-flex align-items-center gap-3">
          <BackButton />
          <div className="as-header-icon">
            <i className="fas fa-crown"></i>
          </div>
          <div>
            <h1 className="as-header-title mb-0">ADMIN <span>SaaS</span></h1>
            <p className="as-header-sub mb-0">Administración B2B — planes, códigos y tokens</p>
          </div>
        </div>
      </div>

      {/* ── CONTENIDO ── */}
      <div className="container-fluid px-3 px-sm-4">
        <div className="row g-3 g-md-4">

          {/* ════════════════════════════════
              PLANES DE SUSCRIPCIÓN
          ════════════════════════════════ */}
          <div className="col-12 col-xl-6">
            <div className="as-section-card" style={{ '--section-color': 'var(--success)' }}>

              <h2 className="as-section-title">
                <i className="fas fa-tags"></i>
                Planes de Suscripción
              </h2>

              {/* Formulario */}
              <div className="as-form-inner">
                <p className="as-form-title">
                  <i className="fas fa-plus-circle"></i>
                  Crear Nuevo Plan
                </p>
                <form onSubmit={handleCrearPlan}>
                  <div className="row g-3">

                    <div className="col-12">
                      <label className="etiqueta-campo">Nombre del Plan</label>
                      <input type="text" className="entrada-oscura" placeholder="Ej. Pro Box"
                        required value={nuevoPlan.nombre}
                        onChange={e => setNuevoPlan({ ...nuevoPlan, nombre: e.target.value })} />
                    </div>

                    <div className="col-sm-6">
                      <label className="etiqueta-campo">Precio (MXN)</label>
                      <div className="as-addon-group">
                        <span className="as-addon">$</span>
                        <input type="number" className="entrada-oscura" placeholder="0"
                          required value={nuevoPlan.precio}
                          onChange={e => setNuevoPlan({ ...nuevoPlan, precio: e.target.value })} />
                      </div>
                    </div>

                    <div className="col-sm-6">
                      <label className="etiqueta-campo">Frecuencia de Cobro</label>
                      <select className="as-select" value={nuevoPlan.mesesDuracion}
                        onChange={e => setNuevoPlan({ ...nuevoPlan, mesesDuracion: parseInt(e.target.value) })}>
                        <option value={1}>Mensual (1 mes)</option>
                        <option value={3}>Trimestral (3 meses)</option>
                        <option value={6}>Semestral (6 meses)</option>
                        <option value={12}>Anual (12 meses)</option>
                      </select>
                    </div>

                    <div className="col-sm-6">
                      <label className="etiqueta-campo">Categoría</label>
                      <select className="as-select" value={nuevoPlan.categoria}
                        onChange={e => setNuevoPlan({ ...nuevoPlan, categoria: e.target.value })}>
                        <option value="Administración">Administración de Box</option>
                        <option value="Competencias">Competencias</option>
                        <option value="Plataforma Integral">Plataforma Integral</option>
                      </select>
                    </div>

                    <div className="col-sm-6">
                      <label className="etiqueta-campo">Costo Capacitación (MXN)</label>
                      <div className="as-addon-group">
                        <span className="as-addon">$</span>
                        <input type="number" className="entrada-oscura" placeholder="0 (Gratis)"
                          value={nuevoPlan.costoCapacitacion}
                          onChange={e => setNuevoPlan({ ...nuevoPlan, costoCapacitacion: e.target.value })} />
                      </div>
                    </div>

                    <div className="col-sm-6">
                      <label className="etiqueta-campo">Límite de Atletas</label>
                      <input type="number" className="entrada-oscura" placeholder="100 (0 = Ilimitado)"
                        required value={nuevoPlan.limiteAtletas}
                        onChange={e => setNuevoPlan({ ...nuevoPlan, limiteAtletas: e.target.value })} />
                    </div>

                    <div className="col-sm-6">
                      <label className="etiqueta-campo">Costo por Atleta Extra (MXN)</label>
                      <div className="as-addon-group">
                        <span className="as-addon">$</span>
                        <input type="number" className="entrada-oscura" placeholder="15"
                          required value={nuevoPlan.costoPorAtletaExtra}
                          onChange={e => setNuevoPlan({ ...nuevoPlan, costoPorAtletaExtra: e.target.value })} />
                      </div>
                    </div>

                    <div className="col-12">
                      <label className="etiqueta-campo">Beneficios Extras (separados por coma)</label>
                      <input type="text" className="entrada-oscura"
                        placeholder="Soporte 24/7, App Móvil, Diseño Personalizado"
                        value={nuevoPlan.beneficiosJSON}
                        onChange={e => setNuevoPlan({ ...nuevoPlan, beneficiosJSON: e.target.value })} />
                    </div>

                    <div className="col-12">
                      <div className="as-switch-row">
                        <label className="as-switch-item">
                          <input className="form-check-input" type="checkbox"
                            checked={nuevoPlan.incluyeCompetencias}
                            onChange={e => setNuevoPlan({ ...nuevoPlan, incluyeCompetencias: e.target.checked })} />
                          <span className="as-switch-label">Módulo Competencias</span>
                        </label>
                        <label className="as-switch-item">
                          <input className="form-check-input" type="checkbox"
                            checked={nuevoPlan.esRecomendado}
                            onChange={e => setNuevoPlan({ ...nuevoPlan, esRecomendado: e.target.checked })} />
                          <span className="as-switch-label as-switch-label--gold">
                            <i className="fas fa-star me-1"></i>Plan Destacado
                          </span>
                        </label>
                      </div>
                    </div>

                    <div className="col-12 d-flex justify-content-end mt-1">
                      <button type="submit" className="as-save-btn">
                        <i className="fas fa-save"></i>Crear Plan
                      </button>
                    </div>

                  </div>
                </form>
              </div>

              {/* Tabla */}
              <div className="as-table-wrapper">
                <table className="as-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Nombre</th>
                      <th>Precio</th>
                      <th>Atletas</th>
                      <th>Estatus</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {planes.length === 0 && (
                      <tr><td colSpan={6} className="as-empty">Sin planes registrados</td></tr>
                    )}
                    {planes.map(p => (
                      <tr key={p.idPlan}>
                        <td><span className="as-cell-id">#{p.idPlan}</span></td>
                        <td>
                          <span className="as-cell-name">{p.nombre}</span>
                          {p.esRecomendado && <i className="fas fa-star text-warning ms-1" style={{ fontSize: '0.7rem' }}></i>}
                        </td>
                        <td className="as-cell-muted">${p.precioMensual} / ${p.precioAnual}</td>
                        <td className="as-cell-muted">
                          {p.limiteAtletas}
                          <span style={{ fontSize: '0.7rem', marginLeft: '0.3rem' }}>(+${p.costoPorAtletaExtra})</span>
                        </td>
                        <td>
                          <span className={`as-badge ${p.activo ? 'as-badge--green' : 'as-badge--red'}`}>
                            {p.activo ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td>
                          <button className="as-delete-btn" onClick={() => handleEliminarPlan(p.idPlan)}>
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

          {/* ════════════════════════════════
              CÓDIGOS DE ACTIVACIÓN
          ════════════════════════════════ */}
          <div className="col-12 col-xl-6">
            <div className="as-section-card" style={{ '--section-color': 'var(--as-purple)' }}>

              <h2 className="as-section-title">
                <i className="fas fa-ticket-alt"></i>
                Códigos de Activación
              </h2>

              <div className="as-form-inner">
                <p className="as-form-title">
                  <i className="fas fa-magic"></i>
                  Generar Nuevo Código
                </p>
                <form onSubmit={handleCrearCodigo}>
                  <div className="row g-3">

                    <div className="col-sm-8">
                      <label className="etiqueta-campo">Token Alfanumérico</label>
                      <div className="as-input-group">
                        <input type="text" className="entrada-oscura"
                          style={{ fontFamily: "'Monaco','Menlo',monospace", fontSize: '0.82rem' }}
                          placeholder="Ej. VIP-BOX-2026" required
                          value={nuevoCodigo.codigo}
                          onChange={e => setNuevoCodigo({ ...nuevoCodigo, codigo: e.target.value.toUpperCase() })} />
                        <button type="button" className="as-random-btn" onClick={generarCodigoAleatorio} title="Generar aleatorio">
                          <i className="fas fa-random"></i>
                        </button>
                      </div>
                    </div>

                    <div className="col-sm-4">
                      <label className="etiqueta-campo">Meses Gratis</label>
                      <input type="number" className="entrada-oscura" placeholder="1"
                        required value={nuevoCodigo.mesesGratis}
                        onChange={e => setNuevoCodigo({ ...nuevoCodigo, mesesGratis: e.target.value })} />
                    </div>

                    <div className="col-sm-6">
                      <label className="etiqueta-campo">Límite de Usos</label>
                      <input type="number" className="entrada-oscura" placeholder="1"
                        required value={nuevoCodigo.limiteUsos}
                        onChange={e => setNuevoCodigo({ ...nuevoCodigo, limiteUsos: e.target.value })} />
                    </div>

                    <div className="col-sm-6">
                      <label className="etiqueta-campo">Plan Específico (Opcional)</label>
                      <select className="as-select" value={nuevoCodigo.idPlanSaaS}
                        onChange={e => setNuevoCodigo({ ...nuevoCodigo, idPlanSaaS: e.target.value })}>
                        <option value="">Aplica a cualquier plan</option>
                        {planes.map(p => <option key={p.idPlan} value={p.idPlan}>{p.nombre}</option>)}
                      </select>
                    </div>

                    <div className="col-12 d-flex justify-content-end mt-1">
                      <button type="submit" className="as-save-btn">
                        <i className="fas fa-magic"></i>Generar Token
                      </button>
                    </div>

                  </div>
                </form>
              </div>

              {/* Tabla */}
              <div className="as-table-wrapper">
                <table className="as-table">
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Meses</th>
                      <th>Usos</th>
                      <th>Plan</th>
                      <th>Estatus</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {codigos.length === 0 && (
                      <tr><td colSpan={6} className="as-empty">Sin códigos registrados</td></tr>
                    )}
                    {codigos.map(c => (
                      <tr key={c.idCodigo}>
                        <td><span className="as-cell-mono" style={{ color: 'var(--accent-cool)' }}>{c.codigo}</span></td>
                        <td className="as-cell-muted">{c.mesesGratis}</td>
                        <td className="as-cell-muted">{c.usosRestantes} / {c.limiteUsos}</td>
                        <td className="as-cell-muted">{c.planSaaS ? c.planSaaS.nombre : 'Cualquiera'}</td>
                        <td>
                          <span className={`as-badge ${c.activo && c.usosRestantes > 0 ? 'as-badge--green' : 'as-badge--red'}`}>
                            {c.activo && c.usosRestantes > 0 ? 'Válido' : 'Agotado'}
                          </span>
                        </td>
                        <td>
                          <button className="as-delete-btn" onClick={() => handleEliminarCodigo(c.idCodigo)}>
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

          {/* ════════════════════════════════
              TOKENS DE COMPETENCIA
          ════════════════════════════════ */}
          <div className="col-12">
            <div className="as-section-card" style={{ '--section-color': 'var(--accent)' }}>

              <h2 className="as-section-title">
                <i className="fas fa-trophy"></i>
                Tokens de Regalo — Competencias
              </h2>

              <div className="as-form-inner">
                <p className="as-form-title">
                  <i className="fas fa-gift"></i>
                  Generar Nuevo Token de Competencia
                </p>
                <form onSubmit={handleCrearTokenComp}>
                  <div className="row g-3">

                    <div className="col-sm-4">
                      <label className="etiqueta-campo">Plan a Regalar</label>
                      <select className="as-select" required value={nuevoTokenComp.idPlanSaaS}
                        onChange={e => setNuevoTokenComp({ ...nuevoTokenComp, idPlanSaaS: e.target.value })}>
                        <option value="">Selecciona un plan...</option>
                        {planes.filter(p => p.incluyeCompetencias || p.categoria === 'Competencias').map(p => (
                          <option key={p.idPlan} value={p.idPlan}>{p.nombre}</option>
                        ))}
                      </select>
                    </div>

                    <div className="col-sm-5">
                      <label className="etiqueta-campo">Correo Destino (Organizador)</label>
                      <input type="email" className="entrada-oscura"
                        placeholder="organizador@example.com" required
                        value={nuevoTokenComp.correoDestino}
                        onChange={e => setNuevoTokenComp({ ...nuevoTokenComp, correoDestino: e.target.value })} />
                    </div>

                    <div className="col-sm-3">
                      <label className="etiqueta-campo">Días de Validez</label>
                      <input type="number" className="entrada-oscura" placeholder="365"
                        required value={nuevoTokenComp.diasValidez}
                        onChange={e => setNuevoTokenComp({ ...nuevoTokenComp, diasValidez: e.target.value })} />
                    </div>

                    <div className="col-12 d-flex justify-content-end mt-1">
                      <button type="submit" className="as-save-btn">
                        <i className="fas fa-gift"></i>Generar Token de Regalo
                      </button>
                    </div>

                  </div>
                </form>
              </div>

              {/* Tabla */}
              <div className="as-table-wrapper">
                <table className="as-table">
                  <thead>
                    <tr>
                      <th>Token</th>
                      <th>Plan</th>
                      <th>Destino</th>
                      <th>Vence</th>
                      <th>Estatus</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {tokensComp.length === 0 && (
                      <tr><td colSpan={6} className="as-empty">Sin tokens registrados</td></tr>
                    )}
                    {tokensComp.map(t => (
                      <tr key={t.idToken}>
                        <td><span className="as-cell-mono" style={{ color: 'var(--accent)' }}>{t.tokenString}</span></td>
                        <td className="as-cell-muted">{t.planSaaS ? t.planSaaS.nombre : 'Desconocido'}</td>
                        <td className="as-cell-muted">{t.correoDestino}</td>
                        <td className="as-cell-muted">{new Date(t.fechaExpiracion).toLocaleDateString()}</td>
                        <td>
                          {t.usado ? (
                            <span className="as-badge as-badge--gray">
                              Usado {new Date(t.fechaUso).toLocaleDateString()}
                            </span>
                          ) : new Date(t.fechaExpiracion) < new Date() ? (
                            <span className="as-badge as-badge--red">Vencido</span>
                          ) : (
                            <span className="as-badge as-badge--gold">Activo</span>
                          )}
                        </td>
                        <td>
                          <button className="as-delete-btn" disabled={t.usado}
                            onClick={() => handleEliminarTokenComp(t.idToken)}>
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
    </div>
  );
};

export default AdminSaaS;
