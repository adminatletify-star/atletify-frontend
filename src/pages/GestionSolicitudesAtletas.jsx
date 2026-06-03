import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BackButton from '../components/BackButton';
import AtletifyLoader from '../components/AtletifyLoader';
import '../assets/css/GestionClases.css';
import '../assets/css/GestionSolicitudes.css';

const METODOS_PAGO = [
  { id: 'Efectivo',      label: 'Efectivo',      icon: 'fa-money-bill-wave' },
  { id: 'Tarjeta',       label: 'Tarjeta',       icon: 'fa-credit-card' },
  { id: 'Transferencia', label: 'Transferencia', icon: 'fa-mobile-alt' }
];

export default function GestionSolicitudesAtletas() {
  const navigate = useNavigate();
  const [pendientes, setPendientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [box, setBox] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [ahora, setAhora] = useState(Date.now());

  // Tic cada minuto para refrescar los contadores de vencimiento
  useEffect(() => {
    const t = setInterval(() => setAhora(Date.now()), 60000);
    return () => clearInterval(t);
  }, []);

  // Modales
  const [modalRechazo, setModalRechazo] = useState({ visible: false, idUsuario: null, motivo: '' });
  const [comprobanteViendo, setComprobanteViendo] = useState(null);
  const [modalAprobar, setModalAprobar] = useState({ visible: false, atleta: null, metodoPago: 'Efectivo', notas: '' });

  const API_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    const b = JSON.parse(localStorage.getItem('box'));
    const u = JSON.parse(localStorage.getItem('usuario'));

    if (!b || !u || (u.rol !== 'AdminBox' && u.rol !== 'Developer' && u.rol !== 'Coach')) {
      navigate('/login');
      return;
    }

    setBox(b);
    cargarPendientes(b.idBox);
  }, [navigate]);

  async function cargarPendientes(idBox) {
    try {
      const res = await fetch(`${API_URL}/usuarios/box/${idBox}/pendientes`);
      if (res.ok) {
        const data = await res.json();
        setPendientes(data);
      }
    } catch (err) {
      console.error("Error cargando solicitudes:", err);
    } finally {
      setLoading(false);
    }
  }

  function abrirAprobacion(p) {
    setModalAprobar({
      visible: true,
      atleta: p,
      metodoPago: p.metodoPago || 'Efectivo',
      notas: ''
    });
  }

  async function confirmarAprobacion() {
    if (!modalAprobar.atleta) return;
    const idUsuario = modalAprobar.atleta.idUsuario;
    try {
      const res = await fetch(`${API_URL}/usuarios/${idUsuario}/aprobar`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metodoPago: modalAprobar.metodoPago,
          notas: modalAprobar.notas || null
        })
      });
      if (res.ok) {
        alert("¡Atleta aprobado! El movimiento se registró en Gestión de Finanzas.");
        setModalAprobar({ visible: false, atleta: null, metodoPago: 'Efectivo', notas: '' });
        cargarPendientes(box.idBox);
      } else {
        alert("Error al aprobar al atleta.");
      }
    } catch { alert("Error de conexión"); }
  }

  async function enviarRechazo(banear = false) {
    if (!banear && !modalRechazo.motivo.trim()) {
      alert("Debes escribir un motivo para que el atleta sepa qué corregir.");
      return;
    }

    if (banear && !await window.wpConfirm("¿Estás seguro de BANEAR a esta persona? No podrá volver a enviar solicitudes.")) return;

    try {
      const payload = { Motivo: modalRechazo.motivo, Banear: banear };
      const res = await fetch(`${API_URL}/usuarios/${modalRechazo.idUsuario}/rechazar`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        alert(banear ? "Usuario baneado permanentemente." : "Solicitud rechazada. El atleta ha sido notificado.");
        setModalRechazo({ visible: false, idUsuario: null, motivo: '' });
        cargarPendientes(box.idBox);
      }
    } catch { alert("Error de conexión"); }
  }

  async function enviarRecordatorio(idUsuario) {
    if (!await window.wpConfirm('¿Enviar un recordatorio al atleta? Esto le suma 1 día más al plazo antes de eliminar su cuenta.')) return;
    try {
      const res = await fetch(`${API_URL}/usuarios/${idUsuario}/recordar-rechazo`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        alert(`Recordatorio enviado. Recordatorios totales: ${data.vecesRecordado}. Se sumó 1 día al plazo.`);
        cargarPendientes(box.idBox);
      } else {
        const e = await res.json().catch(() => null);
        alert(e?.mensaje || 'No se pudo enviar el recordatorio.');
      }
    } catch { alert('Error de conexión'); }
  }

  // Plazo = FechaRechazo + 2 días + 1 día por cada recordatorio.
  const calcRestante = (fechaRechazo, vecesRecordado) => {
    if (!fechaRechazo) return null;
    const iso = String(fechaRechazo).endsWith('Z') ? fechaRechazo : `${fechaRechazo}Z`;
    const limite = new Date(iso).getTime() + (2 + Number(vecesRecordado || 0)) * 86400000;
    const ms = limite - ahora;
    if (ms <= 0) return { vencido: true, texto: 'Vencido — se eliminará pronto' };
    const dias = Math.floor(ms / 86400000);
    const horas = Math.floor((ms % 86400000) / 3600000);
    const mins = Math.floor((ms % 3600000) / 60000);
    const texto = dias > 0 ? `${dias}d ${horas}h` : horas > 0 ? `${horas}h ${mins}m` : `${mins}m`;
    return { vencido: false, texto };
  };

  const fmt = (n) => `$${Number(n || 0).toFixed(2)}`;

  return (
    <div className="gs-root">
      <header className="gc-header">
        <div className="d-flex align-items-center gap-3">
          <BackButton to="/admin-box-panel" />
          <h1 className="gc-header-title">Solicitudes de <span>Ingreso</span></h1>
        </div>
      </header>

      <div className="container" style={{ maxWidth: '1000px' }}>
        <div className="gs-page-header">
          <h1 className="gs-page-title">SOLICI<span>TUDES</span></h1>
          <div className="gs-accent-line"></div>
          {!loading && (() => {
            const correcciones = pendientes.filter(p => Number(p.vecesRechazado || 0) > 0 && p.estatus !== 'Rechazado' && p.estadoSolicitud !== 'Rechazado').length;
            return (
              <p className="gs-page-count">
                <strong>{pendientes.length}</strong> solicitudes pendientes de revisión
                {correcciones > 0 && (
                  <span className="gs-page-count-correcciones">
                    <i className="fas fa-redo-alt"></i> {correcciones} corrección{correcciones === 1 ? '' : 'es'}
                  </span>
                )}
              </p>
            );
          })()}

          {!loading && pendientes.length > 0 && (
            <div className="gs-search">
              <i className="fas fa-search gs-search-icon"></i>
              <input
                type="text"
                className="gs-search-input"
                placeholder="Buscar por nombre, apellido, usuario o correo..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                aria-label="Buscar solicitud"
              />
              {busqueda && (
                <button
                  type="button"
                  className="gs-search-clear"
                  onClick={() => setBusqueda('')}
                  aria-label="Limpiar búsqueda"
                >
                  <i className="fas fa-times"></i>
                </button>
              )}
            </div>
          )}
        </div>

        {(() => {
          if (loading) {
            return <div className="gs-spinner-wrap"><AtletifyLoader /></div>;
          }
          if (pendientes.length === 0) {
            return (
              <div className="gs-empty">
                <i className="fas fa-check-circle gs-empty-icon"></i>
                <h4 className="gs-empty-title">Todo al día</h4>
                <p className="gs-empty-text">No hay solicitudes pendientes de revisión.</p>
              </div>
            );
          }
          const normalizar = (s) => String(s || '')
            .normalize('NFD')
            .replace(/[̀-ͯ]/g, '')
            .toLowerCase()
            .trim();
          const tokens = normalizar(busqueda).split(/\s+/).filter(Boolean);
          const pendientesFiltrados = tokens.length === 0
            ? pendientes
            : pendientes.filter(p => {
                const haystack = normalizar(
                  [p.username, p.correo, p.nombre, p.apellidos].filter(Boolean).join(' ')
                );
                return tokens.every(token => haystack.includes(token));
              });

          if (pendientesFiltrados.length === 0) {
            return (
              <div className="gs-empty">
                <i className="fas fa-search gs-empty-icon"></i>
                <h4 className="gs-empty-title">Sin resultados</h4>
                <p className="gs-empty-text">
                  No se encontró ninguna solicitud que coincida con <strong style={{ color: '#fff' }}>"{busqueda}"</strong>.
                </p>
                <button
                  type="button"
                  className="gs-empty-action"
                  onClick={() => setBusqueda('')}
                >
                  <i className="fas fa-times me-1"></i> Limpiar búsqueda
                </button>
              </div>
            );
          }

          return (
          <div className="row g-4">
            {pendientesFiltrados.map(p => {
              const precioPlan = Number(p.planElegido?.precio || 0);
              const requiereInscripcion = p.planElegido?.requiereInscripcion ?? false;
              const inscripcion = requiereInscripcion ? Number(p.montoInscripcion || 0) : 0;
              const total = Number(p.montoCobrar ?? (precioPlan + inscripcion));
              const intentos = Number(p.vecesRechazado || 0);
              const fueRechazado = p.estatus === 'Rechazado' || p.estadoSolicitud === 'Rechazado';
              const esCorreccion = intentos > 0 && !fueRechazado;

              return (
                <div key={p.idUsuario} className="col-lg-6">
                  <div className={`gs-card${esCorreccion ? ' gs-card--corrected' : intentos > 0 ? ' gs-card--warned' : ''}`}>

                    {/*  ETIQUETAS DE MUDANZA Y PAGOS  */}
                    <div className="d-flex justify-content-between p-2">
                      {p.esMudanza ? (
                        <span className="badge bg-info text-dark rounded-pill"><i className="fas fa-truck-moving me-1"></i> Mudanza</span>
                      ) : (
                        <span className={`badge rounded-pill ${p.metodoPago === 'Transferencia' ? 'bg-success' : 'bg-warning text-dark'}`}>
                          <i className={`fas ${p.metodoPago === 'Transferencia' ? 'fa-mobile-alt' : 'fa-money-bill-wave'} me-1`}></i>
                          {p.metodoPago || 'Sin pago'}
                        </span>
                      )}
                      {esCorreccion ? (
                        <span className="badge gs-badge-correccion rounded-pill"><i className="fas fa-redo-alt me-1"></i> Corrección</span>
                      ) : intentos > 0 ? (
                        <span className="badge bg-danger rounded-pill"><i className="fas fa-exclamation-triangle me-1"></i> Rechazado {intentos}x</span>
                      ) : null}
                    </div>

                    {esCorreccion && (
                      <div className="gs-correction-banner">
                        <div className="gs-correction-banner-icon">
                          <i className="fas fa-redo-alt"></i>
                        </div>
                        <div className="gs-correction-banner-text">
                          <strong>Solicitud corregida</strong>
                          <span>
                            El atleta reenvió su solicitud tras {intentos} rechazo{intentos === 1 ? '' : 's'} previo{intentos === 1 ? '' : 's'}. Revisa los cambios antes de aprobar.
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="gs-card-body pt-0">
                      <div className="gs-athlete-header">
                        <div className="gs-avatar">{p.nombre.charAt(0).toUpperCase()}</div>
                        <div>
                          <p className="gs-athlete-name">{p.nombre} {p.apellidos}</p>
                          <p className="gs-athlete-email text-warning fw-bold mb-0">@{p.username}</p>
                          <p className="gs-athlete-email">{p.correo}</p>
                        </div>
                      </div>

                      {/* PLAN + DESGLOSE */}
                      <div className="bg-black bg-opacity-25 border border-secondary border-opacity-25 rounded p-3 mb-3 mt-3 text-center">
                        <p className="text-secondary small mb-1 fw-bold">PLAN SELECCIONADO</p>
                        <h5 className="text-warning fw-bold mb-1" style={{ fontFamily: 'var(--font-heading)' }}>
                          {p.planElegido ? p.planElegido.nombre : 'Sin Plan'}
                        </h5>
                        {p.planElegido && (
                          <div className="d-flex justify-content-between align-items-center px-1 mt-2" style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.55)' }}>
                            <span>Plan</span>
                            <span>{fmt(precioPlan)}</span>
                          </div>
                        )}
                        {inscripcion > 0 && (
                          <div className="d-flex justify-content-between align-items-center px-1" style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.55)' }}>
                            <span>Inscripción</span>
                            <span>{fmt(inscripcion)}</span>
                          </div>
                        )}
                        <hr className="my-2" style={{ borderColor: 'rgba(255,255,255,0.1)' }} />
                        <div className="d-flex justify-content-between align-items-center px-1">
                          <span className="text-secondary fw-bold" style={{ fontSize: '0.8rem' }}>TOTAL</span>
                          <h4 className="text-success mb-0 fw-bold" style={{ fontFamily: 'var(--font-stats)' }}>
                            {fmt(total)}
                          </h4>
                        </div>
                      </div>

                      {/* BOTÓN PARA VER EL COMPROBANTE */}
                      {!p.esMudanza && p.comprobante && (
                        <button className="btn btn-outline-success w-100 mb-3" onClick={() => setComprobanteViendo(p.comprobante)}>
                          <i className="fas fa-eye me-2"></i> Ver Comprobante de Pago
                        </button>
                      )}

                      <div className="gs-expediente mt-2">
                        <div className="gs-stats-row">
                          <div className="gs-stat-cell"><span className="gs-stat-label">Peso</span><span className="gs-stat-value">{p.peso || '--'} kg</span></div>
                          <div className="gs-stat-cell"><span className="gs-stat-label">Talla</span><span className="gs-stat-value">{p.tallaPlayera || '--'}</span></div>
                          <div className="gs-stat-cell"><span className="gs-stat-label">Nivel</span><span className="gs-stat-value gs-stat-value--accent">{p.categoriaBase || '--'}</span></div>
                        </div>
                      </div>

                      {p.estatus === "Rechazado" && (() => {
                        const r = calcRestante(p.fechaRechazo, p.vecesRecordado);
                        const recordado = Number(p.vecesRecordado || 0);
                        return (
                          <div className={`gs-rejection-note mt-3${r?.vencido ? ' gs-rejection-note--expired' : ''}`}>
                            <div className="gs-rejection-motivo">
                              <i className="fas fa-info-circle"></i> Esperando que el atleta corrija: "{p.motivoRechazo}"
                            </div>
                            <div className="gs-rejection-meta">
                              <span className={`gs-rejection-timer${r?.vencido ? ' gs-rejection-timer--expired' : ''}`}>
                                <i className="fas fa-hourglass-half"></i>
                                {r ? (r.vencido ? r.texto : `Vence en ${r.texto}`) : 'Sin plazo registrado'}
                              </span>
                              {recordado > 0 && (
                                <span className="gs-rejection-recordado">
                                  <i className="fas fa-bell"></i> Recordado {recordado}x
                                </span>
                              )}
                            </div>
                            <button type="button" className="gs-btn-recordar" onClick={() => enviarRecordatorio(p.idUsuario)}>
                              <i className="fas fa-paper-plane"></i> Enviar recordatorio (+1 día)
                            </button>
                          </div>
                        );
                      })()}

                      <div className="gs-actions mt-3">
                        <button onClick={() => abrirAprobacion(p)} className="gs-btn-approve">
                          <i className="fas fa-check"></i> Aprobar
                        </button>
                        <button onClick={() => setModalRechazo({ visible: true, idUsuario: p.idUsuario, motivo: '' })} className="gs-btn-reject" title="Rechazar">
                          <i className="fas fa-times"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          );
        })()}
      </div>

      {/* ── MODAL APROBAR (con método de pago) ── */}
      {modalAprobar.visible && modalAprobar.atleta && (() => {
        const a = modalAprobar.atleta;
        const precioPlan = Number(a.planElegido?.precio || 0);
        const inscripcion = a.planElegido?.requiereInscripcion ? Number(a.montoInscripcion || 0) : 0;
        const total = Number(a.montoCobrar ?? (precioPlan + inscripcion));
        const cambioMetodo = (a.metodoPago || 'Efectivo') !== modalAprobar.metodoPago;

        return (
          <div className="gs-modal-overlay">
            <div className="gs-modal" style={{ maxWidth: '520px' }}>
              <div className="gs-modal-header">
                <h5 className="gs-modal-title"><i className="fas fa-check-circle"></i> Confirmar Aprobación</h5>
                <button className="gs-modal-close" onClick={() => setModalAprobar({ visible: false, atleta: null, metodoPago: 'Efectivo', notas: '' })}><i className="fas fa-times"></i></button>
              </div>
              <div className="gs-modal-body">

                <div className="text-center mb-3">
                  <p className="mb-1 text-secondary small fw-bold">APROBARÁS A</p>
                  <h5 className="text-white mb-0">{a.nombre} {a.apellidos}</h5>
                  <p className="text-warning small mb-0">@{a.username}</p>
                </div>

                <div className="bg-black bg-opacity-25 rounded p-3 mb-3" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div className="d-flex justify-content-between" style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>
                    <span>Plan {a.planElegido?.nombre || '—'}</span>
                    <span>{fmt(precioPlan)}</span>
                  </div>
                  {inscripcion > 0 && (
                    <div className="d-flex justify-content-between" style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>
                      <span>Inscripción</span>
                      <span>{fmt(inscripcion)}</span>
                    </div>
                  )}
                  <hr style={{ borderColor: 'rgba(255,255,255,0.1)', margin: '0.5rem 0' }} />
                  <div className="d-flex justify-content-between align-items-center">
                    <span className="text-secondary fw-bold" style={{ fontSize: '0.85rem' }}>TOTAL</span>
                    <span className="text-success fw-bold" style={{ fontFamily: 'var(--font-stats)', fontSize: '1.15rem' }}>{fmt(total)}</span>
                  </div>
                </div>

                <label className="gs-modal-label">El atleta eligió: <strong className="text-warning">{a.metodoPago || 'Sin método'}</strong></label>

                <div className="d-grid gap-2 mb-3">
                  {METODOS_PAGO.map(m => {
                    const activo = modalAprobar.metodoPago === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setModalAprobar(prev => ({ ...prev, metodoPago: m.id }))}
                        className={`btn d-flex align-items-center justify-content-between ${activo ? 'btn-success' : 'btn-outline-secondary'}`}
                        style={{ borderRadius: '10px', padding: '0.65rem 0.95rem', fontWeight: 600 }}
                      >
                        <span><i className={`fas ${m.icon} me-2`}></i> {m.label}</span>
                        {activo && <i className="fas fa-check"></i>}
                      </button>
                    );
                  })}
                </div>

                {cambioMetodo && (
                  <div className="alert alert-warning py-2 mb-3" style={{ fontSize: '0.82rem' }}>
                    <i className="fas fa-exclamation-triangle me-2"></i>
                    Cambiarás el método de pago de <strong>{a.metodoPago}</strong> a <strong>{modalAprobar.metodoPago}</strong>.
                  </div>
                )}

                <label className="gs-modal-label">Notas (opcional)</label>
                <textarea
                  className="gs-modal-textarea"
                  rows="2"
                  placeholder="Ej. Confirmé el comprobante en mi cuenta..."
                  value={modalAprobar.notas}
                  onChange={(e) => setModalAprobar({ ...modalAprobar, notas: e.target.value })}
                />

                <button onClick={confirmarAprobacion} className="gs-btn-approve w-100 mt-3">
                  <i className="fas fa-check"></i> Aprobar y Registrar Movimiento
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── MODAL VISOR DE COMPROBANTE ── */}
      {comprobanteViendo && (
        <div className="gs-modal-overlay" onClick={() => setComprobanteViendo(null)}>
          <div className="gs-modal" style={{ maxWidth: '520px' }} onClick={e => e.stopPropagation()}>
            <div className="gs-modal-header">
              <h5 className="gs-modal-title"><i className="fas fa-receipt"></i> Comprobante</h5>
              <button className="gs-modal-close" onClick={() => setComprobanteViendo(null)}><i className="fas fa-times"></i></button>
            </div>
            <div className="gs-modal-body gs-comprobante-body">
              <img src={comprobanteViendo} alt="Comprobante" className="gs-comprobante-img" />
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL DE RECHAZO / BANEO ── */}
      {modalRechazo.visible && (
        <div className="gs-modal-overlay">
          <div className="gs-modal">
            <div className="gs-modal-header">
              <h5 className="gs-modal-title"><i className="fas fa-exclamation-triangle"></i> Rechazar Solicitud</h5>
              <button className="gs-modal-close" onClick={() => setModalRechazo({ visible: false, idUsuario: null, motivo: '' })}><i className="fas fa-times"></i></button>
            </div>
            <div className="gs-modal-body">
              <div>
                <label className="gs-modal-label">Motivo del rechazo (El atleta lo leerá):</label>
                <textarea className="gs-modal-textarea" rows="3" placeholder="Ej: La foto del comprobante no es legible..." value={modalRechazo.motivo} onChange={(e) => setModalRechazo({ ...modalRechazo, motivo: e.target.value })}></textarea>
              </div>
              <button onClick={() => enviarRechazo(false)} className="gs-btn-regano"><i className="fas fa-paper-plane"></i> Enviar Regaño / Rechazar</button>
              <p className="gs-modal-divider">O si es una cuenta falsa/spam</p>
              <button onClick={() => enviarRechazo(true)} className="gs-btn-banear"><i className="fas fa-ban"></i> Banear Permanente</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
