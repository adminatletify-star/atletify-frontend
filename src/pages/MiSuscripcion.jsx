import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AtletifyLoader from '../components/AtletifyLoader';
import BackButton from '../components/BackButton';
import { CATALOGO_MODULOS } from '../config/modulosSaaS';
import '../assets/css/MiSuscripcion.css';

const fmtDinero = (m) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(m || 0);
const fmtFecha = (f) => f ? new Date(f).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';

const ESTATUS_META = {
  Activo: { txt: 'Activo', cls: 'ok' },
  Pendiente: { txt: 'Pendiente', cls: 'warn' },
  Gracia: { txt: 'En gracia', cls: 'warn' },
  Vencido: { txt: 'Vencido', cls: 'bad' },
  Suspendido: { txt: 'Suspendido', cls: 'bad' },
};

export default function MiSuscripcion() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const cargar = async () => {
      try {
        const base = import.meta.env.VITE_API_URL;
        const res = await fetch(`${base}/api/saas/mi-suscripcion`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        if (!res.ok) throw new Error('No se pudo cargar tu suscripción.');
        setData(await res.json());
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, []);

  if (loading) {
    return <div className="msus-root msus-loading"><AtletifyLoader /></div>;
  }

  if (error || !data) {
    return (
      <div className="msus-root">
        <header className="msus-header"><BackButton to="/admin-box-panel" /><p className="msus-header-titulo">Mi <span>Suscripción</span></p></header>
        <div className="msus-empty"><i className="fas fa-triangle-exclamation"></i><p>{error || 'Sin datos de suscripción.'}</p></div>
      </div>
    );
  }

  const { plan, precio, estatusSaaS, fechaVencimientoSaaS, modulos = [], cupo } = data;
  const est = ESTATUS_META[estatusSaaS] || { txt: estatusSaaS || '—', cls: 'warn' };
  const modulosActivos = modulos.filter(m => CATALOGO_MODULOS[m]);
  const pctCupo = cupo && !cupo.ilimitado && cupo.limite > 0
    ? Math.min(100, Math.round((cupo.atletasActivos / cupo.limite) * 100))
    : 0;

  return (
    <div className="msus-root">
      <header className="msus-header">
        <BackButton to="/admin-box-panel" />
        <p className="msus-header-titulo">Mi <span>Suscripción</span></p>
      </header>

      <div className="msus-grid">
        {/* Plan actual */}
        <div className="msus-card msus-card--plan">
          <div className="msus-card-head">
            <span className="msus-card-label">Plan actual</span>
            <span className={`msus-estatus msus-estatus--${est.cls}`}>{est.txt}</span>
          </div>
          <h2 className="msus-plan-nombre">{plan?.nombre || 'Sin plan asignado'}</h2>
          {plan?.descripcion && <p className="msus-plan-desc">{plan.descripcion}</p>}
          <div className="msus-precio"><span className="msus-precio-num">{fmtDinero(precio)}</span><span className="msus-precio-unit">/mes</span></div>
          <div className="msus-vence"><i className="fas fa-calendar-day"></i> Próximo cobro: <strong>{fmtFecha(fechaVencimientoSaaS)}</strong></div>
          <button className="msus-btn-primary" onClick={() => navigate('/seleccion-plan-saas')}>
            <i className="fas fa-rocket"></i> Cambiar / subir de plan
          </button>
        </div>

        {/* Cupo de atletas */}
        <div className="msus-card">
          <span className="msus-card-label">Atletas activos</span>
          {cupo?.ilimitado ? (
            <div className="msus-cupo-ilimitado"><span className="msus-cupo-num">{cupo.atletasActivos}</span><span className="msus-cupo-inf">Ilimitado</span></div>
          ) : (
            <>
              <div className="msus-cupo-num">
                {cupo?.atletasActivos ?? 0} <span className="msus-cupo-de">/ {cupo?.limite ?? 0}</span>
              </div>
              <div className="msus-barra"><div className={`msus-barra-fill ${pctCupo >= 100 ? 'msus-barra-fill--over' : ''}`} style={{ width: `${pctCupo}%` }}></div></div>
              {cupo?.excedente > 0 ? (
                <div className="msus-excedente">
                  <i className="fas fa-circle-exclamation"></i>
                  <span><strong>{cupo.excedente}</strong> atleta(s) extra · <strong>{fmtDinero(cupo.montoExtra)}</strong> adicional este periodo</span>
                </div>
              ) : (
                <p className="msus-cupo-ok"><i className="fas fa-circle-check"></i> Dentro de tu límite de plan</p>
              )}
            </>
          )}
          <p className="msus-hint">Solo se cuentan atletas con membresía activa al día.</p>
        </div>

        {/* Módulos incluidos */}
        <div className="msus-card msus-card--full">
          <span className="msus-card-label">Módulos incluidos en tu plan</span>
          {modulosActivos.length === 0 ? (
            <p className="msus-cupo-ok">Tu plan incluye las funciones núcleo de operación.</p>
          ) : (
            <div className="msus-modulos">
              {modulosActivos.map(m => (
                <span key={m} className="msus-mod-chip"><i className={`fas ${CATALOGO_MODULOS[m].icono}`}></i> {CATALOGO_MODULOS[m].nombre}</span>
              ))}
            </div>
          )}
        </div>

        {/* Historial de auditorías de cupo */}
        {Array.isArray(data.historial) && data.historial.length > 0 && (
          <div className="msus-card msus-card--full">
            <span className="msus-card-label">Historial de excedentes</span>
            <div className="msus-hist">
              {data.historial.map(h => (
                <div key={h.idAuditoria} className="msus-hist-row">
                  <span>{fmtFecha(h.fecha)}</span>
                  <span>{h.atletasActivos} activos · +{h.excedente} extra</span>
                  <span className="msus-hist-monto">{fmtDinero(h.montoExtra)}</span>
                  <span className={`msus-hist-estado ${h.cobrado ? 'pagado' : 'pend'}`}>{h.cobrado ? 'Cobrado' : 'Pendiente'}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
