import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BackButton from '../components/BackButton';
import AtletifyLoader from '../components/AtletifyLoader';
import '../assets/css/GestionSolicitudes.css';

export default function GestionSolicitudesAtletas() {
  const navigate = useNavigate();
  const [pendientes, setPendientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [box, setBox] = useState(null);

  // Estados para Modales
  const [modalRechazo, setModalRechazo] = useState({ visible: false, idUsuario: null, motivo: '' });
  const [comprobanteViendo, setComprobanteViendo] = useState(null); // NUEVO: Para ver la foto

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

  async function aprobarAtleta(idUsuario) {
    if (!await window.wpConfirm("¿Aprobar a este usuario para que comience a entrenar en la manada?")) return;

    try {
      const res = await fetch(`${API_URL}/usuarios/${idUsuario}/aprobar`, { method: 'PUT' });
      if (res.ok) {
        alert("¡Atleta y Plan aprobados! Ya es oficialmente parte de Wolfpack.");
        cargarPendientes(box.idBox);
      } else {
        alert("Error al aprobar al atleta.");
      }
    } catch (err) { alert("Error de conexión"); }
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
    } catch (err) { alert("Error de conexión"); }
  }

  return (
    <div className="gs-root">
      <nav className="gs-navbar">
        <BackButton to="/admin-box-panel" />
        <h4 className="gs-navbar-title">Solicitudes de <span>Ingreso</span></h4>
      </nav>

      <div className="container" style={{ maxWidth: '1000px' }}>
        <div className="gs-page-header">
          <h1 className="gs-page-title">SOLICI<span>TUDES</span></h1>
          <div className="gs-accent-line"></div>
          {!loading && (
            <p className="gs-page-count">
              <strong>{pendientes.length}</strong> solicitudes pendientes de revisión
            </p>
          )}
        </div>

        {loading ? (
          <div className="gs-spinner-wrap"><AtletifyLoader /></div>
        ) : pendientes.length === 0 ? (
          <div className="gs-empty">
            <i className="fas fa-check-circle gs-empty-icon"></i>
            <h4 className="gs-empty-title">Todo al día</h4>
            <p className="gs-empty-text">No hay solicitudes pendientes de revisión.</p>
          </div>
        ) : (
          <div className="row g-4">
            {pendientes.map(p => (
              <div key={p.idUsuario} className="col-lg-6">
                <div className={`gs-card${p.vecesRechazado > 0 ? ' gs-card--warned' : ''}`}>

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
                    {p.vecesRechazado > 0 && (
                      <span className="badge bg-danger rounded-pill"><i className="fas fa-exclamation-triangle"></i> Rechazado {p.vecesRechazado}x</span>
                    )}
                  </div>

                  <div className="gs-card-body pt-0">
                    <div className="gs-athlete-header">
                      <div className="gs-avatar">{p.nombre.charAt(0).toUpperCase()}</div>
                      <div>
                        <p className="gs-athlete-name">{p.nombre} {p.apellidos}</p>
                        <p className="gs-athlete-email text-warning fw-bold mb-0">@{p.username}</p>
                        <p className="gs-athlete-email">{p.correo}</p>
                      </div>
                    </div>
                    {/*  EL RADAR DE MEMBRESÍA  */}
                    <div className="bg-black bg-opacity-25 border border-secondary border-opacity-25 rounded p-3 mb-3 mt-3 text-center">
                      <p className="text-secondary small mb-1 fw-bold">PLAN SELECCIONADO</p>
                      <h5 className="text-warning fw-bold mb-1" style={{ fontFamily: 'var(--font-heading)' }}>
                        {p.planElegido ? p.planElegido.nombre : 'Sin Plan'}
                      </h5>
                      <h4 className="text-success mb-0 fw-bold" style={{ fontFamily: 'var(--font-stats)' }}>
                        ${p.planElegido ? p.planElegido.precio : '0.00'}
                      </h4>
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

                    {p.estatus === "Rechazado" && (
                      <div className="gs-rejection-note mt-3">
                        <i className="fas fa-info-circle"></i> Esperando que el atleta corrija: "{p.motivoRechazo}"
                      </div>
                    )}

                    <div className="gs-actions mt-3">
                      <button onClick={() => aprobarAtleta(p.idUsuario)} className="gs-btn-approve">
                        <i className="fas fa-check"></i> Aprobar
                      </button>
                      <button onClick={() => setModalRechazo({ visible: true, idUsuario: p.idUsuario, motivo: '' })} className="gs-btn-reject" title="Rechazar">
                        <i className="fas fa-times"></i>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── MODAL VISOR DE COMPROBANTE ── */}
      {comprobanteViendo && (
        <div className="gs-modal-overlay" onClick={() => setComprobanteViendo(null)}>
          <div className="gs-modal bg-dark p-2 text-center" style={{ maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
            <div className="d-flex justify-content-between align-items-center p-2 mb-2 border-bottom border-secondary">
              <h5 className="text-success m-0"><i className="fas fa-receipt me-2"></i>Comprobante</h5>
              <button className="btn-close btn-close-white" onClick={() => setComprobanteViendo(null)}></button>
            </div>
            <img src={comprobanteViendo} alt="Comprobante" style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: '10px' }} />
          </div>
        </div>
      )}

      {/* ── MODAL DE RECHAZO / BANEO (Queda igual) ── */}
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