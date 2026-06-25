import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import BackButton from '../components/BackButton';
import BotonSeguro from '../components/BotonSeguro';
import AtletifyLoader from '../components/AtletifyLoader';
import { globalAlert } from '../utils/globalAlert';
import '../assets/css/GestionClases.css'; // .gc-header / .gc-header-title (header estándar)
import './PagesCSS/ControlCampania.css';

const API = import.meta.env.VITE_API_URL;
const PAGE_SIZE = 10;

const ICONO_METODO = {
  'Efectivo': 'fa-money-bill-wave',
  'Transferencia': 'fa-building-columns',
  'Tarjeta (Terminal)': 'fa-credit-card',
  'Tarjeta (Stripe)': 'fa-stripe-s',
};
const money = (n) => `$${(Number(n) || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtFecha = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '—' : d.toLocaleString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const ESTADO_BADGE = {
  Aprobada: { txt: 'Aprobada', cls: 'cc-badge--ok', icon: 'fa-check-circle' },
  Pendiente: { txt: 'Pendiente', cls: 'cc-badge--pend', icon: 'fa-hourglass-half' },
  Correccion: { txt: 'En corrección', cls: 'cc-badge--corr', icon: 'fa-triangle-exclamation' },
};

// Estatus de vigencia: Activa (verde) · Programada (ámbar) · Finalizada (gris).
const ccEstadoClase = (control) => {
  const estatus = control?.estatus || (control?.activo ? 'Activa' : 'Finalizada');
  if (estatus === 'Activa') return 'on';
  if (estatus === 'Programada') return 'prog';
  return 'off';
};

function buildPaginas(pagina, total) {
  return Array.from({ length: total }, (_, idx) => idx + 1)
    .filter(n => n === 1 || n === total || Math.abs(n - pagina) <= 1)
    .reduce((acc, n, i, arr) => {
      if (i > 0 && n - arr[i - 1] > 1) acc.push('...');
      acc.push(n);
      return acc;
    }, []);
}

export default function ControlCampania() {
  const { idAnuncio } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [control, setControl] = useState(null);
  const [donaciones, setDonaciones] = useState([]);
  const [tab, setTab] = useState('resumen'); // resumen | comprobantes | todas
  const [pagina, setPagina] = useState(1);

  const [imagenModal, setImagenModal] = useState(null);
  const [revisar, setRevisar] = useState(null);   // donación a aprobar { ...d, montoEdit }
  const [correccion, setCorreccion] = useState(null); // donación a corregir { ...d, nota }

  const authHeaders = () => ({ 'Authorization': `Bearer ${localStorage.getItem('token')}` });

  const cargar = useCallback(async () => {
    try {
      const [rc, rd] = await Promise.all([
        fetch(`${API}/api/anuncios/${idAnuncio}/control`, { headers: authHeaders() }),
        fetch(`${API}/api/anuncios/${idAnuncio}/donaciones`, { headers: authHeaders() }),
      ]);
      if (rc.ok) setControl(await rc.json());
      if (rd.ok) setDonaciones(await rd.json());
    } catch (e) {
      console.error(e);
      globalAlert.showError('No se pudo cargar el panel de la campaña.');
    } finally {
      setLoading(false);
    }
  }, [idAnuncio]);

  useEffect(() => { cargar(); }, [cargar]);

  const pendientes = donaciones.filter(d => d.estado === 'Pendiente' || d.estado === 'Correccion');

  const aprobar = async () => {
    if (!revisar) return;
    const monto = parseFloat(revisar.montoEdit);
    if (!monto || monto <= 0) { globalAlert.showError('Ingresa el monto real del comprobante.'); return; }
    try {
      const res = await fetch(`${API}/api/anuncios/donaciones/${revisar.idDonacion}/aprobar`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ montoAjustado: monto })
      });
      if (res.ok) {
        globalAlert.showSuccess('Aportación aprobada y sumada a la campaña.');
        setRevisar(null);
        await cargar();
      } else {
        const err = await res.json().catch(() => ({}));
        globalAlert.showError(err.mensaje || 'No se pudo aprobar.');
      }
    } catch { globalAlert.showError('Error de conexión.'); }
  };

  const eliminarRegistro = async (d) => {
    const ok = await window.wpConfirm(`¿Eliminar el registro de aportación de ${d.nombreAtleta} (${money(d.montoReportado ?? d.monto)})? Esta acción no se puede deshacer.`);
    if (!ok) return;
    try {
      const res = await fetch(`${API}/api/anuncios/donaciones/${d.idDonacion}`, { method: 'DELETE', headers: authHeaders() });
      if (res.ok) {
        globalAlert.showSuccess('Registro eliminado.');
        await cargar();
      } else {
        const err = await res.json().catch(() => ({}));
        globalAlert.showError(err.mensaje || 'No se pudo eliminar.');
      }
    } catch { globalAlert.showError('Error de conexión.'); }
  };

  const mandarCorreccion = async () => {
    if (!correccion) return;
    try {
      const res = await fetch(`${API}/api/anuncios/donaciones/${correccion.idDonacion}/correccion`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ nota: correccion.nota })
      });
      if (res.ok) {
        globalAlert.showSuccess('Comprobante devuelto a corrección.');
        setCorreccion(null);
        await cargar();
      } else {
        const err = await res.json().catch(() => ({}));
        globalAlert.showError(err.mensaje || 'No se pudo enviar a corrección.');
      }
    } catch { globalAlert.showError('Error de conexión.'); }
  };

  if (loading) {
    return <div className="cc-page cc-loading-wrap"><AtletifyLoader /></div>;
  }

  const totalPaginas = Math.max(1, Math.ceil(donaciones.length / PAGE_SIZE));
  const donacionesPagina = donaciones.slice((pagina - 1) * PAGE_SIZE, pagina * PAGE_SIZE);

  const meta = control?.meta || 0;
  const total = control?.totalAprobado || 0;
  const pct = control?.porcentaje || 0;

  return (
    <div className="cc-page">
      <header className="gc-header">
        <div className="d-flex align-items-center gap-3">
          <BackButton to="/gestion-anuncios" />
          <h1 className="gc-header-title">Panel de <span>Campaña</span></h1>
        </div>
      </header>

      <div className="container-xl px-3 px-md-4">
        <div className="cc-headline">
          <h2 className="cc-titulo">{control?.titulo}</h2>
          <div className="cc-vigencia">
            <span className="cc-vig-item"><i className="far fa-calendar-alt"></i> {fmtFecha(control?.fechaInicio)} → {fmtFecha(control?.fechaFin)}</span>
            <span className="cc-vig-item"><i className="fas fa-flag-checkered"></i> Creada: {fmtFecha(control?.fechaCreacion)}</span>
            <span className={`cc-estado-chip ${ccEstadoClase(control)}`}>
              <span className="cc-estado-dot"></span>{control?.estatus || (control?.activo ? 'Activa' : 'Finalizada')}
            </span>
          </div>
        </div>

        {/* TABS */}
        <div className="cc-tabs">
          <button className={`cc-tab ${tab === 'resumen' ? 'activo' : ''}`} onClick={() => setTab('resumen')}>
            <i className="fas fa-chart-pie"></i><span>Resumen</span>
          </button>
          <button className={`cc-tab ${tab === 'comprobantes' ? 'activo' : ''}`} onClick={() => setTab('comprobantes')}>
            <i className="fas fa-receipt"></i><span>Comprobantes</span>
            {control?.comprobantesPendientes > 0 && <span className="cc-tab-badge">{control.comprobantesPendientes}</span>}
          </button>
          <button className={`cc-tab ${tab === 'todas' ? 'activo' : ''}`} onClick={() => setTab('todas')}>
            <i className="fas fa-list"></i><span>Aportaciones</span>
          </button>
        </div>

        {/* ════ RESUMEN ════ */}
        {tab === 'resumen' && (
          <div className="cc-resumen">
            <div className="cc-progress-card">
              {control?.metaCumplida && meta > 0 && (
                <div className="cc-progress-trophy"><i className="fas fa-trophy"></i></div>
              )}
              <div className="cc-progress-top">
                <div>
                  <span className="cc-progress-label">Recaudado (aprobado)</span>
                  <div className="cc-progress-monto">{money(total)}</div>
                </div>
                {meta > 0 && (
                  <div className="text-end">
                    <span className="cc-progress-label">Meta</span>
                    <div className="cc-progress-meta">{money(meta)}</div>
                  </div>
                )}
              </div>
              {meta > 0 ? (
                <>
                  <div className="cc-bar"><div className="cc-bar-fill" style={{ width: `${Math.min(pct, 100)}%` }}></div></div>
                  <div className="cc-progress-bottom">
                    <span className="cc-pct"><i className="fas fa-arrow-trend-up"></i>{pct}% de avance</span>
                    {control?.metaCumplida
                      ? <span className="cc-excedente"><i className="fas fa-trophy"></i>Meta cumplida · excedente {money(control.excedente)}</span>
                      : <span className="cc-faltante"><i className="fas fa-bullseye"></i>Faltan {money(control.faltante)}</span>}
                  </div>
                </>
              ) : (
                <p className="cc-sin-meta"><i className="fas fa-circle-info me-1"></i>Esta campaña no tiene meta definida.</p>
              )}
            </div>

            <div className="cc-stats-grid">
              <div className="cc-stat">
                <div className="cc-stat-ico-wrap"><i className="fas fa-users cc-stat-ico"></i></div>
                <span className="cc-stat-num">{control?.conteoDonadoresUnicos || 0}</span>
                <span className="cc-stat-lbl">Donadores</span>
              </div>
              <div className="cc-stat">
                <div className="cc-stat-ico-wrap"><i className="fas fa-hand-holding-heart cc-stat-ico"></i></div>
                <span className="cc-stat-num">{control?.conteoAprobadas || 0}</span>
                <span className="cc-stat-lbl">Aportaciones</span>
              </div>
              <div className="cc-stat cc-stat--warn">
                <div className="cc-stat-ico-wrap"><i className="fas fa-receipt cc-stat-ico"></i></div>
                <span className="cc-stat-num">{control?.comprobantesPendientes || 0}</span>
                <span className="cc-stat-lbl">Por revisar</span>
              </div>
              <div className="cc-stat">
                <div className="cc-stat-ico-wrap"><i className="fab fa-stripe-s cc-stat-ico"></i></div>
                <span className="cc-stat-num">{money(control?.comisionStripeTotal || 0)}</span>
                <span className="cc-stat-lbl">Comisión absorbida por donantes</span>
              </div>
            </div>

            <div className="cc-metodos-card">
              <h3 className="cc-subtitulo"><i className="fas fa-wallet"></i>Desglose por método de pago</h3>
              {(!control?.porMetodo || control.porMetodo.length === 0) ? (
                <p className="cc-empty-inline">Aún no hay aportaciones aprobadas.</p>
              ) : (
                <div className="cc-metodos-lista">
                  {control.porMetodo.map(m => {
                    const pctMetodo = total > 0 ? Math.round((m.total / total) * 100) : 0;
                    return (
                      <div key={m.metodo} className="cc-metodo-row">
                        <div className="cc-metodo-head">
                          <span className="cc-metodo-nombre"><i className={`fas ${ICONO_METODO[m.metodo] || 'fa-coins'}`}></i>{m.metodo}</span>
                          <span className="cc-metodo-total">{money(m.total)} <small>({m.conteo})</small></span>
                        </div>
                        <div className="cc-bar cc-bar--sm"><div className="cc-bar-fill" style={{ width: `${pctMetodo}%` }}></div></div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ════ COMPROBANTES (pendientes / corrección) ════ */}
        {tab === 'comprobantes' && (
          <div className="cc-comprobantes">
            {pendientes.length === 0 ? (
              <div className="cc-empty">
                <i className="fas fa-circle-check"></i>
                <p>No hay comprobantes por revisar.</p>
              </div>
            ) : (
              pendientes.map(d => (
                <div key={d.idDonacion} className="cc-comp-card">
                  <div className="cc-comp-info">
                    <div className="cc-comp-atleta">
                      <div className="cc-avatar">{d.fotoAtleta ? <img src={d.fotoAtleta} alt="" /> : <span>{(d.nombreAtleta || '?').charAt(0)}</span>}</div>
                      <div className="cc-comp-atleta-txt">
                        <span className="cc-comp-nombre">{d.nombreAtleta}</span>
                        <span className="cc-comp-fecha"><i className="far fa-clock"></i>{fmtFecha(d.fecha)}</span>
                      </div>
                    </div>
                    <div className="cc-comp-monto">
                      <span className="cc-comp-monto-lbl">Reportó</span>
                      <span className="cc-comp-monto-val">{money(d.montoReportado ?? d.monto)}</span>
                    </div>
                    <div className="cc-comp-estado">
                      <span className={`cc-badge ${ESTADO_BADGE[d.estado]?.cls}`}><i className={`fas ${ESTADO_BADGE[d.estado]?.icon} me-1`}></i>{ESTADO_BADGE[d.estado]?.txt}</span>
                      {d.vecesCorregido > 0 && (
                        <span className="cc-corr-count" title="Veces devuelto a corrección">
                          <i className="fas fa-rotate-left me-1"></i>{d.vecesCorregido}× corregido
                        </span>
                      )}
                    </div>
                  </div>
                  {d.notaCorreccion && <div className="cc-comp-nota"><i className="fas fa-comment-dots"></i><span>{d.notaCorreccion}</span></div>}
                  <div className="cc-comp-acciones">
                    {d.comprobanteUrl && (
                      <button className="cc-btn cc-btn--ver" onClick={() => setImagenModal(d.comprobanteUrl)}>
                        <i className="fas fa-image"></i> Ver comprobante
                      </button>
                    )}
                    <button className="cc-btn cc-btn--ok" onClick={() => setRevisar({ ...d, montoEdit: String(d.montoReportado ?? d.monto) })}>
                      <i className="fas fa-check"></i> Aprobar
                    </button>
                    <button className="cc-btn cc-btn--corr" onClick={() => setCorreccion({ ...d, nota: '' })}>
                      <i className="fas fa-rotate-left"></i> Corrección
                    </button>
                    <button className="cc-btn cc-btn--del" onClick={() => eliminarRegistro(d)}>
                      <i className="fas fa-trash"></i> Eliminar
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ════ TODAS LAS APORTACIONES (paginadas) ════ */}
        {tab === 'todas' && (
          <div className="cc-todas">
            {donaciones.length === 0 ? (
              <div className="cc-empty"><i className="fas fa-hand-holding-dollar"></i><p>Aún no hay aportaciones.</p></div>
            ) : (
              <>
                <p className="cc-conteo">Mostrando {(pagina - 1) * PAGE_SIZE + 1}–{Math.min(pagina * PAGE_SIZE, donaciones.length)} de {donaciones.length}</p>
                <div className="cc-lista">
                  {donacionesPagina.map(d => (
                    <div key={d.idDonacion} className="cc-don-row">
                      <div className="cc-avatar cc-avatar--sm">{d.fotoAtleta ? <img src={d.fotoAtleta} alt="" /> : <span>{(d.nombreAtleta || '?').charAt(0)}</span>}</div>
                      <div className="cc-don-main">
                        <span className="cc-don-nombre">{d.nombreAtleta}</span>
                        <span className="cc-don-meta">
                          <i className={`fas ${ICONO_METODO[d.metodoPago] || 'fa-coins'} me-1`}></i>{d.metodoPago} · {fmtFecha(d.fecha)}
                        </span>
                        {d.metodoPago === 'Tarjeta (Stripe)' && d.comisionStripe > 0 && (
                          <span className="cc-don-desglose">Bruto {money(d.montoBruto)} · Comisión -{money(d.comisionStripe)}</span>
                        )}
                      </div>
                      <div className="cc-don-right">
                        <span className="cc-don-monto">{money(d.monto)}</span>
                        <span className={`cc-badge cc-badge--mini ${ESTADO_BADGE[d.estado]?.cls}`}>{ESTADO_BADGE[d.estado]?.txt}</span>
                      </div>
                    </div>
                  ))}
                </div>
                {totalPaginas > 1 && (
                  <div className="cc-pagination">
                    <button className="cc-pag-btn" disabled={pagina === 1} onClick={() => setPagina(p => p - 1)}><i className="fas fa-chevron-left" /></button>
                    <div className="cc-pag-numeros">
                      {buildPaginas(pagina, totalPaginas).map((it, i) => it === '...'
                        ? <span key={`d${i}`} className="cc-pag-dots">…</span>
                        : <button key={it} className={`cc-pag-num ${it === pagina ? 'activo' : ''}`} onClick={() => setPagina(it)}>{it}</button>)}
                    </div>
                    <button className="cc-pag-btn" disabled={pagina === totalPaginas} onClick={() => setPagina(p => p + 1)}><i className="fas fa-chevron-right" /></button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Visor de comprobante */}
      {imagenModal && createPortal(
        <div className="cc-overlay" onClick={() => setImagenModal(null)}>
          <div className="cc-img-modal" onClick={e => e.stopPropagation()}>
            <button className="cc-img-close" onClick={() => setImagenModal(null)}><i className="fas fa-times"></i></button>
            <img src={imagenModal.startsWith('http') || imagenModal.startsWith('data:') ? imagenModal : `${API}${imagenModal}`} alt="Comprobante" />
          </div>
        </div>,
        document.body
      )}

      {/* Modal aprobar (ajustar monto) */}
      {revisar && createPortal(
        <div className="cc-overlay" onClick={() => setRevisar(null)}>
          <div className="cc-modal" onClick={e => e.stopPropagation()}>
            <div className="cc-modal-head"><span><i className="fas fa-check-circle me-2"></i>Aprobar aportación</span>
              <button onClick={() => setRevisar(null)}><i className="fas fa-times"></i></button></div>
            <div className="cc-modal-body">
              <p className="cc-modal-p">{revisar.nombreAtleta} reportó <strong>{money(revisar.montoReportado ?? revisar.monto)}</strong>. Confirma o ajusta el monto al que realmente dice el comprobante; ese será el que sume y aparezca en el leaderboard.</p>
              {revisar.comprobanteUrl && (
                <button className="cc-btn cc-btn--ver w-100 mb-3" onClick={() => setImagenModal(revisar.comprobanteUrl)}><i className="fas fa-image me-1"></i> Ver comprobante</button>
              )}
              <label className="cc-modal-label">Monto a aprobar (MXN)</label>
              <div className="cc-monto-wrapper">
                <span>$</span>
                <input type="number" min="1" step="any" value={revisar.montoEdit}
                  onChange={(e) => setRevisar(r => ({ ...r, montoEdit: e.target.value }))} />
              </div>
            </div>
            <div className="cc-modal-foot">
              <button className="cc-btn cc-btn--ghost" onClick={() => setRevisar(null)}>Cancelar</button>
              <BotonSeguro type="button" className="cc-btn cc-btn--ok" onClick={aprobar} textoProcesando="Aprobando...">Aprobar y sumar</BotonSeguro>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal mandar a corrección */}
      {correccion && createPortal(
        <div className="cc-overlay" onClick={() => setCorreccion(null)}>
          <div className="cc-modal" onClick={e => e.stopPropagation()}>
            <div className="cc-modal-head"><span><i className="fas fa-rotate-left me-2"></i>Mandar a corrección</span>
              <button onClick={() => setCorreccion(null)}><i className="fas fa-times"></i></button></div>
            <div className="cc-modal-body">
              <p className="cc-modal-p">Explica al donante qué debe corregir (monto, comprobante ilegible, etc.). Recibirá una notificación y podrá reenviar su comprobante.</p>
              <label className="cc-modal-label">Motivo</label>
              <textarea className="cc-textarea" rows="3" value={correccion.nota} placeholder="Ej. El comprobante no coincide con el monto reportado."
                onChange={(e) => setCorreccion(c => ({ ...c, nota: e.target.value }))}></textarea>
            </div>
            <div className="cc-modal-foot">
              <button className="cc-btn cc-btn--ghost" onClick={() => setCorreccion(null)}>Cancelar</button>
              <BotonSeguro type="button" className="cc-btn cc-btn--corr" onClick={mandarCorreccion} textoProcesando="Enviando...">Mandar a corrección</BotonSeguro>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
