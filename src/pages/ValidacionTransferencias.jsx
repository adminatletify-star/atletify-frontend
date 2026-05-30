import React, { useEffect, useState } from 'react';
import { API_BASE_URL_CONST as API_URL } from '../services/api';

const ValidacionTransferencias = () => {
  const [transferencias, setTransferencias] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [imagenModal, setImagenModal] = useState(null);

  // Obtener sesión AdminBox
  const storedUser = JSON.parse(localStorage.getItem('usuario'));
  const box = JSON.parse(localStorage.getItem('box'));
  const idBox = box?.idBox || storedUser?.idBoxPredeterminado;
  const token = localStorage.getItem('token');

  const cargarTransferencias = async () => {
    if (!idBox) return;
    try {
      setCargando(true);
      const res = await fetch(`${API_URL}/validaciones/pendientes/${idBox}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTransferencias(data);
      }
    } catch (error) {
      console.error("Error cargando transferencias", error);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarTransferencias();
  }, [idBox]);

  const procesarTransferencia = async (item, aprobado) => {
    try {
      const confirmMsg = aprobado ? "¿Aprobar esta transferencia?" : "¿Rechazar esta transferencia?";
      if (!window.confirm(confirmMsg)) return;

      let url = '';
      let payload = {};

      if (item.modulo === 'suscripcion') {
        url = `${API_URL}/usuarios/suscripcion/${item.idElemento}/aprobar-cambio`;
        if (!aprobado) {
          alert('Para rechazar una suscripción, por favor hágalo desde Gestión de Finanzas.');
          return;
        }
      } else if (item.modulo === 'registro') {
        url = `${API_URL}/usuarios/${item.idElemento}/aprobar`;
        payload = { metodoPago: "Transferencia", requiereComprobante: false };
        if (!aprobado) {
          alert('Para rechazar un registro, por favor elimine al usuario en Gestión de Atletas.');
          return;
        }
      } else if (item.modulo === 'tienda') {
        url = `${API_URL}/ventas/fiados/abonos/${item.idElemento}/aprobar`;
        payload = { aprobado }; 
      } else if (item.modulo === 'competencia') {
        alert('Por favor apruebe las competencias directamente en el panel de Competencias.');
        return;
      }

      if (url) {
        let res;
        const headers = { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        };

        if (item.modulo === 'suscripcion') {
          res = await fetch(url, { method: 'PUT', headers, body: JSON.stringify({}) });
        } else if (item.modulo === 'registro') {
          res = await fetch(url, { method: 'PUT', headers, body: JSON.stringify(payload) });
        } else if (item.modulo === 'tienda') {
          res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(payload) });
        }

        if (res && !res.ok) {
           const errorText = await res.text();
           let errMsg = "Ocurrió un error al procesar la transferencia.";
           try {
             const errorData = JSON.parse(errorText);
             if (errorData.mensaje) errMsg = errorData.mensaje;
           } catch(e) {}
           throw new Error(errMsg);
        }

        alert(`Transferencia ${aprobado ? 'Aprobada' : 'Rechazada'} con éxito.`);
        cargarTransferencias(); // recargar
      }

    } catch (error) {
      console.error("Error al procesar", error);
      alert(error.message || "Ocurrió un error al procesar la transferencia.");
    }
  };

  return (
    <div className="container-fluid py-4" style={{ minHeight: '100vh', backgroundColor: 'transparent' }}>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold mb-0 text-white">
          <i className="fas fa-university text-primary me-2"></i> 
          Bandeja de Validaciones
        </h2>
        <div>
          <a 
            href="https://www.banxico.org.mx/cep/" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="btn btn-outline-info btn-sm me-2"
            title="Verificar Comprobante Electrónico de Pago (CEP)"
          >
            <i className="fas fa-external-link-alt"></i> Portal Banxico
          </a>
          <button className="btn btn-outline-light btn-sm" onClick={cargarTransferencias}>
            <i className="fas fa-sync-alt"></i> Actualizar
          </button>
        </div>
      </div>

      <div className="card bg-dark border-0 shadow-sm rounded-4">
        <div className="card-body p-4">
          {cargando ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status"></div>
              <p className="mt-2 text-secondary">Buscando transferencias pendientes...</p>
            </div>
          ) : transferencias.length === 0 ? (
            <div className="text-center py-5">
              <i className="fas fa-check-circle text-success mb-3" style={{ fontSize: '4rem' }}></i>
              <h4 className="fw-bold text-white">¡Todo al día!</h4>
              <p className="text-secondary">No tienes transferencias pendientes de revisión.</p>
            </div>
          ) : (
            <div className="row g-4">
              {transferencias.map((item, idx) => (
                <div key={idx} className="col-12 col-md-6 col-lg-4">
                  <div className="card h-100 bg-secondary bg-opacity-10 border-0 rounded-4 position-relative overflow-hidden">
                    
                    {/* Etiqueta de Módulo */}
                    <div className="position-absolute top-0 start-0 w-100 bg-primary bg-opacity-25 py-1 px-3 border-bottom border-primary border-opacity-25">
                      <small className="text-primary fw-bold text-uppercase" style={{ fontSize: '0.7rem', letterSpacing: '1px' }}>
                        {item.modulo}
                      </small>
                    </div>

                    <div className="card-body pt-5 d-flex flex-column">
                      <h5 className="fw-bold text-white mb-1">{item.nombreAtleta}</h5>
                      <p className="text-info fw-bold mb-3 fs-5">${item.monto?.toFixed(2)} MXN</p>
                      
                      <div className="mb-3 text-secondary small">
                        <div><i className="fas fa-tag me-1"></i> {item.tipoOperacion}</div>
                        <div><i className="fas fa-info-circle me-1"></i> {item.descripcion}</div>
                        <div><i className="fas fa-calendar-alt me-1"></i> {new Date(item.fecha).toLocaleString()}</div>
                      </div>

                      <div className="mt-auto pt-3 border-top border-secondary border-opacity-25">
                        <button 
                          className="btn btn-sm btn-outline-info w-100 mb-2 rounded-pill fw-bold"
                          onClick={() => setImagenModal(item.comprobanteUrl)}
                        >
                          <i className="fas fa-image me-1"></i> Ver Comprobante
                        </button>
                        <div className="d-flex gap-2">
                          <button 
                            className="btn btn-sm btn-success flex-grow-1 rounded-pill fw-bold"
                            onClick={() => procesarTransferencia(item, true)}
                          >
                            <i className="fas fa-check"></i> Aprobar
                          </button>
                          <button 
                            className="btn btn-sm btn-outline-danger flex-grow-1 rounded-pill fw-bold"
                            onClick={() => procesarTransferencia(item, false)}
                          >
                            <i className="fas fa-times"></i> Rechazar
                          </button>
                        </div>
                      </div>

                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal Visor de Imagen */}
      {imagenModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 1050 }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content bg-transparent border-0">
              <div className="modal-header border-0 pb-0 justify-content-end">
                <button type="button" className="btn-close btn-close-white" onClick={() => setImagenModal(null)}></button>
              </div>
              <div className="modal-body text-center pt-0">
                <img 
                  src={imagenModal.startsWith('http') || imagenModal.startsWith('data:') ? imagenModal : `${API_URL}${imagenModal}`} 
                  alt="Comprobante" 
                  className="img-fluid rounded shadow-lg" 
                  style={{ maxHeight: '80vh', objectFit: 'contain' }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ValidacionTransferencias;
