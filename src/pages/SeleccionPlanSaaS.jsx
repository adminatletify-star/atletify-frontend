import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AtletifyLoader from '../components/AtletifyLoader';
import '../assets/css/HomePricing.css';

const fmt = (n) => `$${Number(n || 0).toLocaleString('es-MX', { maximumFractionDigits: 0 })}`;

export default function SeleccionPlanSaaS() {
  const [planes, setPlanes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [esAnual, setEsAnual] = useState(false);
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState(null);
  const [exito, setExito] = useState(null);
  const navigate = useNavigate();

  // El objeto 'box' tiene idBox + estatusSaaS (boxActivo a veces es solo el id).
  const box = (() => {
    try { return JSON.parse(localStorage.getItem('box') || 'null'); } catch { return null; }
  })();
  const estatus = box?.estatusSaaS;
  const esUpgrade = estatus === 'Activo' || estatus === 'Gracia';

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch(`${import.meta.env.VITE_API_URL}/api/saas/planes`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setPlanes((Array.isArray(d) ? d : []).filter((p) => (p.activo ?? p.Activo))))
      .catch(() => setError('No se pudieron cargar los planes.'))
      .finally(() => setLoading(false));
  }, []);

  const precioMostrar = (p) => {
    const mensual = Number(p.precio ?? p.Precio ?? 0);
    return esAnual ? Math.round(mensual * 12 * 0.8) : mensual; // anual con -20%
  };

  const handleCheckout = async (idPlan) => {
    if (!box?.idBox) { setError('No se encontró tu box. Vuelve a iniciar sesión.'); return; }
    setProcesando(true); setError(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/saas/checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          idBox: box.idBox, idPlan, esAnual,
          successUrl: window.location.origin + '/admin-box-panel?checkout=success',
          cancelUrl: window.location.origin + '/seleccion-plan-saas?checkout=cancel',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.mensaje || 'Error al iniciar el pago.');
      if (data.url) {
        window.location.href = data.url; // a Stripe
      } else {
        // Plan gratis / activación directa
        navigate('/admin-box-panel');
        window.location.reload();
      }
    } catch (err) {
      setError(err.message || 'Error al iniciar el pago.');
      setProcesando(false);
    }
  };

  const handleCanjear = async () => {
    if (!codigo.trim() || !box?.idBox) return;
    setProcesando(true); setError(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/saas/activar-codigo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ idBox: box.idBox, codigo: codigo.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.mensaje || 'Código inválido o expirado.');
      setExito(data.mensaje || 'Suscripción activada.');
      setTimeout(() => { navigate('/admin-box-panel'); window.location.reload(); }, 1800);
    } catch (err) {
      setError(err.message || 'Código inválido o expirado.');
      setProcesando(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    localStorage.removeItem('box');
    localStorage.removeItem('boxActivo');
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="home-pricing-section" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <AtletifyLoader />
      </div>
    );
  }

  const titulo = esUpgrade
    ? <>Cambia tu <span>plan</span></>
    : estatus === 'Vencido'
      ? <>Renueva tu <span>suscripción</span></>
      : <>Activa tu <span>Box</span></>;
  const subtitulo = esUpgrade
    ? 'Sube o cambia el plan de tu box cuando quieras. El cambio aplica de inmediato.'
    : estatus === 'Vencido'
      ? 'Tu suscripción expiró. Elige un plan para recuperar el acceso total a tus herramientas.'
      : 'Aún no has configurado tu suscripción a Atletify. Elige un plan para activar tu box.';

  return (
    <div className="home-pricing-section" style={{ minHeight: '100vh' }}>
      <div className="container py-5">

        <div className="text-center mb-4">
          {!esUpgrade && <i className="fas fa-triangle-exclamation" style={{ fontSize: '2.2rem', color: 'var(--danger)', marginBottom: '0.75rem', display: 'block' }}></i>}
          <h2 className="home-pricing-title">{titulo}</h2>
          <p className="home-pricing-subtitle">{subtitulo}</p>
        </div>

        {error && (
          <div className="alert mb-4 text-center" style={{ background: 'rgba(220,53,69,0.1)', border: '1px solid var(--danger)', color: 'var(--danger)', borderRadius: 12 }}>
            <i className="fas fa-circle-exclamation me-2"></i>{error}
          </div>
        )}
        {exito && (
          <div className="alert mb-4 text-center" style={{ background: 'rgba(46,204,113,0.1)', border: '1px solid var(--success)', color: 'var(--success)', borderRadius: 12 }}>
            <i className="fas fa-circle-check me-2"></i>{exito}
          </div>
        )}

        {/* Toggle Mensual / Anual */}
        <div className="d-flex justify-content-center align-items-center gap-3 mb-4">
          <span style={{ fontWeight: !esAnual ? 700 : 400, color: !esAnual ? 'var(--text-primary)' : 'var(--text-muted)' }}>Mensual</span>
          <button
            type="button"
            onClick={() => setEsAnual((v) => !v)}
            style={{ position: 'relative', width: 56, height: 30, borderRadius: 999, border: 'none', cursor: 'pointer', background: esAnual ? 'var(--danger)' : 'var(--border)' }}
            aria-label="Alternar mensual/anual"
          >
            <span style={{ position: 'absolute', top: 3, left: esAnual ? 29 : 3, width: 24, height: 24, borderRadius: '50%', background: '#fff', transition: 'left .2s ease' }} />
          </button>
          <span style={{ fontWeight: esAnual ? 700 : 400, color: esAnual ? 'var(--text-primary)' : 'var(--text-muted)' }}>
            Anual <span style={{ fontSize: '0.72rem', color: 'var(--success)', background: 'rgba(46,204,113,0.15)', padding: '2px 8px', borderRadius: 999, marginLeft: 4 }}>-20%</span>
          </span>
        </div>

        {/* Tarjetas (mismo estilo que el home) */}
        <div className="row g-4 justify-content-center pricing-row">
          {planes.map((p, index) => {
            const recomendado = !!(p.esRecomendado ?? p.EsRecomendado);
            const limite = p.limiteAtletas ?? p.LimiteAtletas;
            let beneficios = [];
            try { beneficios = JSON.parse(p.beneficiosJSON ?? p.BeneficiosJSON ?? '[]'); } catch { beneficios = []; }
            const costoExtra = Number(p.costoPorAtletaExtra ?? p.CostoPorAtletaExtra ?? 0);
            return (
              <div key={p.idPlan} className="col-12 col-md-6 col-lg-4">
                <div className={`pricing-card ${recomendado ? 'pricing-card-recomendado' : ''}`}>
                  {recomendado && <div className="pricing-badge">RECOMENDADO</div>}
                  <div className="pricing-header">
                    <h3>{p.nombre ?? p.Nombre}</h3>
                    <p>{p.descripcion ?? p.Descripcion ?? ''}</p>
                  </div>
                  <div className="pricing-price">
                    <h2>{fmt(precioMostrar(p))} <span>MXN/{esAnual ? 'año' : 'mes'}</span></h2>
                    <div className="pricing-limit">
                      <i className="fas fa-users"></i> {(limite === 0 || limite == null) ? 'Atletas ilimitados' : `Hasta ${limite} atletas`}
                    </div>
                  </div>
                  <div className="pricing-body">
                    <ul className="pricing-features">
                      {beneficios.map((ben, i) => (
                        <li key={i}><i className={`fas ${i === 0 && index > 0 ? 'fa-plus' : 'fa-check'}`}></i>{ben}</li>
                      ))}
                      {beneficios.length === 0 && (
                        <li><i className="fas fa-check"></i>Hasta {(limite === 0 || limite == null) ? '∞' : limite} atletas</li>
                      )}
                    </ul>
                    {costoExtra > 0 && (
                      <div className="pricing-extra"><i className="fas fa-info-circle"></i> +${costoExtra}/mes por cada atleta extra.</div>
                    )}
                  </div>
                  <div className="pricing-footer">
                    <button
                      className={`btn w-100 ${recomendado ? 'btn-danger' : 'btn-outline-light'}`}
                      disabled={procesando}
                      onClick={() => handleCheckout(p.idPlan ?? p.IdPlan)}
                    >
                      {procesando ? 'Procesando…' : (esUpgrade ? `Cambiar a ${p.nombre ?? p.Nombre}` : `Elegir ${p.nombre ?? p.Nombre}`)}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Código de activación */}
        <div className="mx-auto mt-5" style={{ maxWidth: 560, background: 'rgba(20,20,20,0.6)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '1.5rem' }}>
          <h3 style={{ color: 'var(--text-primary)', fontSize: '1.1rem', marginBottom: '0.75rem' }}>¿Tienes un código de activación?</h3>
          <div className="d-flex flex-column flex-sm-row gap-2">
            <input
              type="text"
              placeholder="Ej. WOLF-PRO-2026"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              className="form-control"
              style={{ background: 'var(--bg-base)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            />
            <button className="btn btn-outline-light" disabled={!codigo.trim() || procesando} onClick={handleCanjear}>
              Canjear
            </button>
          </div>
        </div>

        <div className="text-center mt-4">
          {esUpgrade
            ? <button className="btn btn-link" style={{ color: 'var(--text-muted)' }} onClick={() => navigate('/admin-box-panel')}>Volver al panel</button>
            : <button className="btn btn-link" style={{ color: 'var(--text-muted)' }} onClick={handleLogout}>Cerrar sesión por ahora</button>}
        </div>

      </div>
    </div>
  );
}
