import { useState, useEffect } from 'react';
import BotonSeguro from './BotonSeguro';

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

  return (
    <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 1060 }} tabIndex="-1">
      <div className="modal-dialog modal-dialog-centered modal-lg">
        <div className="modal-content text-light border-warning" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border) !important' }}>
          <div className="modal-header border-bottom border-secondary border-opacity-25">
            <h5 className="modal-title text-warning" style={{ fontFamily: 'var(--font-heading)' }}>
              <i className="fas fa-rocket me-2"></i>Activa tu Competencia
            </h5>
            <button type="button" className="btn-close btn-close-white" onClick={onClose} disabled={procesando}></button>
          </div>
          <div className="modal-body p-4">
            
            <ul className="nav nav-pills mb-4 justify-content-center gap-2">
              <li className="nav-item">
                <button className={`nav-link ${modo === 'planes' ? 'active bg-warning text-dark fw-bold' : 'text-light'}`} onClick={() => setModo('planes')}>
                  <i className="fas fa-list-ul me-2"></i>Seleccionar Plan
                </button>
              </li>
              <li className="nav-item">
                <button className={`nav-link ${modo === 'token' ? 'active bg-warning text-dark fw-bold' : 'text-light'}`} onClick={() => setModo('token')}>
                  <i className="fas fa-gift me-2"></i>Tengo un Token
                </button>
              </li>
            </ul>

            {modo === 'planes' && (
              <div>
                <p className="text-center text-secondary mb-4">Selecciona el plan que mejor se adapte a tu evento. Paga seguro a través de Stripe.</p>
                {loading ? (
                  <div className="text-center py-4"><div className="spinner-border text-warning"></div></div>
                ) : planes.length === 0 ? (
                  <div className="text-center py-4 text-muted">No hay planes disponibles en este momento.</div>
                ) : (
                  <div className="row g-3">
                    {planes.map(plan => (
                      <div key={plan.idPlanSaaS} className="col-12 col-md-6">
                        <div 
                          className={`p-3 border rounded cursor-pointer ${idPlanSeleccionado === plan.idPlanSaaS ? 'border-warning bg-warning bg-opacity-10' : 'border-secondary'}`}
                          onClick={() => setIdPlanSeleccionado(plan.idPlanSaaS)}
                          style={{ cursor: 'pointer' }}
                        >
                          <div className="d-flex justify-content-between align-items-center mb-2">
                            <h5 className="mb-0 text-white fw-bold">{plan.nombre}</h5>
                            <h5 className="mb-0 text-success fw-bold">${plan.precio}</h5>
                          </div>
                          <p className="small text-secondary mb-2">{plan.descripcion}</p>
                          <ul className="list-unstyled small mb-0 text-light">
                            <li><i className="fas fa-check text-warning me-2"></i>Hasta {plan.limiteAtletas} atletas</li>
                            <li><i className="fas fa-check text-warning me-2"></i>Excedente: ${plan.costoPorAtletaExtra} c/u</li>
                          </ul>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {modo === 'token' && (
              <div className="text-center py-3">
                <i className="fas fa-ticket-alt fs-1 text-secondary mb-3"></i>
                <p className="text-light">Ingresa el código de regalo proporcionado por Atletify.</p>
                <input 
                  type="text" 
                  className="form-control bg-dark text-light border-secondary text-center fs-4 letter-spacing-2 mx-auto" 
                  style={{ maxWidth: '300px' }}
                  placeholder="XXXX-XXXX"
                  value={tokenString}
                  onChange={(e) => setTokenString(e.target.value.toUpperCase())}
                />
              </div>
            )}

          </div>
          <div className="modal-footer border-top border-secondary border-opacity-25 d-flex justify-content-between">
            <button className="btn btn-outline-secondary" onClick={onClose} disabled={procesando}>Cancelar</button>
            <div className="d-flex gap-2 flex-wrap justify-content-end">
              {modo === 'planes' && (
                <BotonSeguro className="btn btn-outline-warning fw-bold px-3" onClick={() => handlePagar('Transferencia')} textoProcesando="Procesando...">
                  <i className="fas fa-university me-2"></i>Pagar por transferencia
                </BotonSeguro>
              )}
              <BotonSeguro className="btn btn-warning fw-bold text-dark px-4" onClick={() => handlePagar(null)} textoProcesando="Procesando...">
                {modo === 'planes' ? <><i className="fab fa-stripe me-2"></i>Pagar y Activar</> : <><i className="fas fa-check-circle me-2"></i>Canjear Token</>}
              </BotonSeguro>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
