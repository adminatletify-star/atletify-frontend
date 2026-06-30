import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import BotonSeguro from './BotonSeguro';
import AtletifyLoader from './AtletifyLoader';
import './PlanesModal.css';

export default function PlanesModal({ isOpen, onClose, idCompetencia, onSuccess }) {
  const [planes, setPlanes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState(false);
  
  const [modo, setModo] = useState('planes'); // 'planes' o 'token'
  const [idPlanSeleccionado, setIdPlanSeleccionado] = useState(null);
  const [tokenString, setTokenString] = useState('');

  useEffect(() => {
    if (isOpen) {
      cargarPlanes();
    }
  }, [isOpen]);

  const cargarPlanes = async () => {
    setLoading(true);
    try {
      // Usamos el endpoint público de SaaS para los planes de competencia
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/saas/planes`);
      if (res.ok) {
        const data = await res.json();
        setPlanes(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handlePagar = async (metodoPago = null) => {
    if (modo === 'planes' && !idPlanSeleccionado) return alert("Selecciona un plan");
    if (modo === 'token' && !tokenString) return alert("Ingresa el token");

    setProcesando(true);
    try {
      const payload = {
        IdPlanSaaS: modo === 'planes' ? idPlanSeleccionado : null,
        TokenString: modo === 'token' ? tokenString : null,
        SuccessUrl: window.location.href,
        CancelUrl: window.location.href,
        MetodoPago: metodoPago // null = pago en línea (Stripe); "Transferencia"/"Efectivo" = manual
      };

      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/competencias/${idCompetencia}/contratar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok && data.manual) {
        // Pago manual: queda pendiente de aprobación del developer.
        alert(data.mensaje || "Registramos tu pago manual. Se activará cuando Atletify lo apruebe.");
        onSuccess();
        onClose();
      } else if (res.ok && data.url) {
        if (data.url === window.location.href) {
          // Fue un pago con token o precio 0
          alert(data.mensaje || "Competencia activada con éxito.");
          onSuccess();
          onClose();
        } else {
          window.location.href = data.url;
        }
      } else {
        alert(data.mensaje || "Error al procesar la activación.");
      }
    } catch (e) {
      alert("Error de conexión");
    } finally {
      setProcesando(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="pm-overlay" onClick={() => { if (!procesando) onClose(); }}>
      <div className="pm-panel" onClick={e => e.stopPropagation()}>
        <div className="pm-head">
          <h3 className="pm-title"><i className="fas fa-rocket"></i>Activa tu Competencia</h3>
          <button type="button" className="pm-close" onClick={onClose} disabled={procesando}><i className="fas fa-times"></i></button>
        </div>

        <div className="pm-body">
          <div className="pm-tabs">
            <button className={`pm-tab ${modo === 'planes' ? 'pm-tab--activo' : ''}`} onClick={() => setModo('planes')}>
              <i className="fas fa-list-ul"></i>Seleccionar Plan
            </button>
            <button className={`pm-tab ${modo === 'token' ? 'pm-tab--activo' : ''}`} onClick={() => setModo('token')}>
              <i className="fas fa-gift"></i>Tengo un Token
            </button>
          </div>

          {modo === 'planes' && (
            <div>
              <p className="pm-intro">Selecciona el plan que mejor se adapte a tu evento. Paga seguro a través de Stripe.</p>
              {loading ? (
                <div className="pm-loader"><AtletifyLoader /></div>
              ) : planes.length === 0 ? (
                <div className="pm-empty">No hay planes disponibles en este momento.</div>
              ) : (
                <div className="pm-planes">
                  {planes.map(plan => (
                    <button
                      type="button"
                      key={plan.idPlanSaaS}
                      className={`pm-plan ${idPlanSeleccionado === plan.idPlanSaaS ? 'pm-plan--sel' : ''}`}
                      onClick={() => setIdPlanSeleccionado(plan.idPlanSaaS)}
                    >
                      <div className="pm-plan-top">
                        <h5 className="pm-plan-nombre">{plan.nombre}</h5>
                        <span className="pm-plan-precio">${plan.precio}</span>
                      </div>
                      {plan.descripcion && <p className="pm-plan-desc">{plan.descripcion}</p>}
                      <ul className="pm-plan-feats">
                        <li className="pm-plan-feat"><i className="fas fa-check"></i>Hasta {plan.limiteAtletas} atletas</li>
                        <li className="pm-plan-feat"><i className="fas fa-check"></i>Excedente: ${plan.costoPorAtletaExtra} c/u</li>
                      </ul>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {modo === 'token' && (
            <div className="pm-token">
              <i className="fas fa-ticket-alt pm-token-icon"></i>
              <p className="pm-token-text">Ingresa el código de regalo proporcionado por Atletify.</p>
              <input
                type="text"
                className="pm-token-input"
                placeholder="XXXX-XXXX"
                value={tokenString}
                onChange={(e) => setTokenString(e.target.value.toUpperCase())}
              />
            </div>
          )}
        </div>

        <div className="pm-foot">
          <button className="pm-btn pm-btn--ghost" onClick={onClose} disabled={procesando}>Cancelar</button>
          <div className="pm-foot-actions">
            {modo === 'planes' && (
              <BotonSeguro className="pm-btn pm-btn--outline-accent" onClick={() => handlePagar('Transferencia')} textoProcesando="Procesando...">
                <i className="fas fa-building-columns"></i>Pagar por transferencia
              </BotonSeguro>
            )}
            <BotonSeguro className="pm-btn pm-btn--accent" onClick={() => handlePagar(null)} textoProcesando="Procesando...">
              {modo === 'planes' ? <><i className="fab fa-stripe"></i>Pagar y Activar</> : <><i className="fas fa-check-circle"></i>Canjear Token</>}
            </BotonSeguro>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
