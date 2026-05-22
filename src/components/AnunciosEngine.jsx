import React, { useState, useEffect } from 'react';

const AnunciosEngine = ({ box, user }) => {
  const [anuncios, setAnuncios] = useState([]);
  const [popupObligatorio, setPopupObligatorio] = useState(null);
  const [anuncioDetalle, setAnuncioDetalle] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [iniciandoPago, setIniciandoPago] = useState(false);
  const [montoDonacion, setMontoDonacion] = useState(50); // Por defecto 50 pesos

  useEffect(() => {
    if (box && user) {
      fetchAnuncios();
    }
  }, [box, user]);

  const fetchAnuncios = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/anuncios/box/${box.idBox || box.IdBox}/atleta/${user.idUsuario || user.id}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAnuncios(data);
        
        // Buscar si hay alguno que NO ha visto para lanzarlo como popup obligatorio
        const noVisto = data.find(a => !a.yaVisto);
        if (noVisto) {
          setPopupObligatorio(noVisto);
        }
      }
    } catch (error) {
      console.error(error);
    }
  };

  const marcarComoVisto = async (idAnuncio) => {
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/api/anuncios/${idAnuncio}/marcar-visto/${user.idUsuario || user.id}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      // Cerrar popup
      setPopupObligatorio(null);
      // Actualizar estado local para que no vuelva a saltar
      setAnuncios(prev => prev.map(a => a.idAnuncio === idAnuncio ? { ...a, yaVisto: true } : a));
    } catch (error) {
      console.error(error);
      setPopupObligatorio(null);
    }
  };

  const abrirDetalle = async (anuncio) => {
    setAnuncioDetalle(anuncio);
    if (anuncio.mostrarRankingDonadores) {
      cargarLeaderboard(anuncio.idAnuncio);
    } else {
      setLeaderboard([]);
    }
  };

  const cargarLeaderboard = async (idAnuncio) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/anuncios/${idAnuncio}/leaderboard`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        setLeaderboard(await res.json());
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleDonarStripe = async () => {
    if (montoDonacion < 20) return alert('El monto mínimo es de $20 MXN.');
    setIniciandoPago(true);
    try {
      const payload = {
        idAnuncio: anuncioDetalle.idAnuncio,
        idUsuario: user.idUsuario || user.id,
        monto: parseFloat(montoDonacion)
      };

      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/finanzas/checkout-donacion/${box.idBox || box.IdBox}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      if (res.ok && data.url) {
        window.location.href = data.url;
      } else {
        alert(data.mensaje || 'Error al conectar con el procesador de pagos.');
      }
    } catch (error) {
      alert('Error de red.');
    } finally {
      setIniciandoPago(false);
    }
  };
  const getDiffDays = (fechaFinStr) => {
    if (!fechaFinStr) return null;
    const fin = new Date(fechaFinStr);
    const hoy = new Date();
    fin.setHours(0,0,0,0);
    hoy.setHours(0,0,0,0);
    const diffTime = fin - hoy;
    if (isNaN(diffTime)) return null;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const formatDateRange = (inicioStr, finStr) => {
    if (!inicioStr || !finStr) return '';
    const inicio = new Date(inicioStr);
    const fin = new Date(finStr);
    if (isNaN(inicio.getTime()) || isNaN(fin.getTime())) return '';
    
    const optionsShort = { day: '2-digit', month: 'short' };
    const optionsLong = { day: '2-digit', month: 'short', year: 'numeric' };
    return `${inicio.toLocaleDateString('es-MX', optionsShort)} al ${fin.toLocaleDateString('es-MX', optionsLong)}`;
  };

  // Validaciones de UI paramétricas
  if (!anuncios || anuncios.length === 0) return null;

  // Extracción de datos del Popup Obligatorio de forma segura
  const pTitulo = popupObligatorio ? (popupObligatorio.titulo || popupObligatorio.Titulo) : '';
  const pMensaje = popupObligatorio ? (popupObligatorio.mensaje || popupObligatorio.Mensaje) : '';
  const pAceptarDonaciones = popupObligatorio ? (popupObligatorio.aceptarDonaciones || popupObligatorio.AceptarDonaciones) : false;
  const pMetaDonacion = popupObligatorio ? (popupObligatorio.metaDonacion || popupObligatorio.MetaDonacion || 0) : 0;
  const pTotalRecaudado = popupObligatorio ? (popupObligatorio.totalRecaudado || popupObligatorio.TotalRecaudado || 0) : 0;
  const pFechaInicio = popupObligatorio ? (popupObligatorio.fechaInicio || popupObligatorio.FechaInicio) : null;
  const pFechaFin = popupObligatorio ? (popupObligatorio.fechaFin || popupObligatorio.FechaFin) : null;
  const pIdAnuncio = popupObligatorio ? (popupObligatorio.idAnuncio || popupObligatorio.IdAnuncio) : null;

  // Extracción de datos del Anuncio Detalle de forma segura
  const dTitulo = anuncioDetalle ? (anuncioDetalle.titulo || anuncioDetalle.Titulo) : '';
  const dMensaje = anuncioDetalle ? (anuncioDetalle.mensaje || anuncioDetalle.Mensaje) : '';
  const dAceptarDonaciones = anuncioDetalle ? (anuncioDetalle.aceptarDonaciones || anuncioDetalle.AceptarDonaciones) : false;
  const dMetaDonacion = anuncioDetalle ? (anuncioDetalle.metaDonacion || anuncioDetalle.MetaDonacion || 0) : 0;
  const dTotalRecaudado = anuncioDetalle ? (anuncioDetalle.totalRecaudado || anuncioDetalle.TotalRecaudado || 0) : 0;
  const dFechaInicio = anuncioDetalle ? (anuncioDetalle.fechaInicio || anuncioDetalle.FechaInicio) : null;
  const dFechaFin = anuncioDetalle ? (anuncioDetalle.fechaFin || anuncioDetalle.FechaFin) : null;
  const dIdAnuncio = anuncioDetalle ? (anuncioDetalle.idAnuncio || anuncioDetalle.IdAnuncio) : null;
  const dMostrarRankingDonadores = anuncioDetalle ? (anuncioDetalle.mostrarRankingDonadores || anuncioDetalle.MostrarRankingDonadores) : false;

  return (
    <>
      {/* ========================================================
          BANNER PRINCIPAL (Renderiza arriba en el UserPanel)
      ======================================================== */}
      <div className="d-flex flex-column gap-2 mb-4">
        {anuncios.map(anuncio => (
          <div 
            key={anuncio.idAnuncio || anuncio.IdAnuncio} 
            className="w-100 bg-dark text-white rounded p-3 d-flex justify-content-between align-items-center shadow cursor-pointer border border-warning border-opacity-50"
            style={{ 
              background: 'linear-gradient(90deg, #1f1015 0%, #2a0000 100%)',
              cursor: 'pointer', transition: 'all 0.3s ease'
            }}
            onClick={() => abrirDetalle(anuncio)}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.01)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            <div className="d-flex align-items-center gap-3">
              <div className="bg-warning text-dark rounded-circle d-flex justify-content-center align-items-center" style={{ width: '45px', height: '45px' }}>
                <i className="fas fa-bullhorn fs-5"></i>
              </div>
              <div>
                <h6 className="mb-0 fw-bold text-warning" style={{ color: '#f5a623' }}>{anuncio.titulo || anuncio.Titulo}</h6>
                <small className="text-white opacity-75 d-block" style={{ maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {anuncio.mensaje || anuncio.Mensaje}
                </small>
              </div>
            </div>
            <div className="text-end d-none d-md-block">
              {(anuncio.aceptarDonaciones || anuncio.AceptarDonaciones) && (
                <span className="badge bg-danger rounded-pill px-3 py-2 fw-bold" style={{ backgroundColor: '#e63946', color: '#ffffff' }}>
                  <i className="fas fa-heart me-1"></i> Apoyar Causa
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ========================================================
          MODAL DE POPUP OBLIGATORIO (Aparece 1 vez)
      ======================================================== */}
      {popupObligatorio && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.9)', zIndex: 1060 }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content bg-dark text-white border border-danger border-opacity-50" style={{ borderRadius: '20px', overflow: 'hidden' }}>
              <div className="bg-danger text-center p-4" style={{ backgroundColor: '#e63946' }}>
                <i className="fas fa-bullhorn fa-3x mb-2 text-white"></i>
                <h3 className="fw-bold text-white m-0" style={{ fontFamily: 'var(--font-heading)', color: '#ffffff' }}>
                  {pTitulo}
                </h3>
              </div>
              <div className="modal-body p-4 p-md-5 text-center" style={{ color: '#ffffff' }}>
                {/* Fechas de vigencia y Días restantes para Popup */}
                {pFechaInicio && pFechaFin && (
                  <div className="d-flex flex-wrap gap-2 align-items-center justify-content-center mb-4">
                    <span className="badge px-3 py-2 rounded-pill small border" style={{ fontSize: '0.78rem', color: '#ffffff', backgroundColor: 'rgba(255, 255, 255, 0.1)', borderColor: 'rgba(255, 255, 255, 0.2)' }}>
                      <i className="far fa-calendar-alt text-warning me-2" style={{ color: '#f5a623' }}></i>
                      Vigencia: {formatDateRange(pFechaInicio, pFechaFin)}
                    </span>
                    {(() => {
                      const diffDays = getDiffDays(pFechaFin);
                      if (diffDays === null) return null;
                      if (diffDays > 0) {
                        return (
                          <span className="badge px-3 py-2 rounded-pill small border fw-bold" style={{ fontSize: '0.78rem', color: '#f5a623', backgroundColor: 'rgba(245, 166, 35, 0.15)', borderColor: 'rgba(245, 166, 35, 0.3)' }}>
                            <i className="fas fa-hourglass-half me-2" style={{ color: '#f5a623' }}></i>
                            {diffDays} {diffDays === 1 ? 'día restante' : 'días restantes'}
                          </span>
                        );
                      } else if (diffDays === 0) {
                        return (
                          <span className="badge px-3 py-2 rounded-pill small border fw-bold" style={{ fontSize: '0.78rem', color: '#e63946', backgroundColor: 'rgba(230, 57, 70, 0.15)', borderColor: 'rgba(230, 57, 70, 0.3)' }}>
                            <i className="fas fa-hourglass-end me-2" style={{ color: '#e63946' }}></i>
                            ¡Último día hoy!
                          </span>
                        );
                      } else {
                        return (
                          <span className="badge px-3 py-2 rounded-pill small border" style={{ fontSize: '0.78rem', color: '#a0aec0', backgroundColor: 'rgba(255, 255, 255, 0.05)', borderColor: 'rgba(255, 255, 255, 0.1)' }}>
                            Finalizada
                          </span>
                        );
                      }
                    })()}
                  </div>
                )}

                <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6', color: '#ffffff', fontSize: '1.1rem' }} className="mb-4">
                  {pMensaje}
                </div>
                
                {pAceptarDonaciones && (
                  <div className="bg-black bg-opacity-50 p-4 rounded-4 mb-4 border border-warning border-opacity-25" style={{ backgroundColor: '#000000', borderColor: 'rgba(245, 166, 35, 0.25)' }}>
                    <h5 className="fw-bold mb-3" style={{ color: '#f5a623' }}><i className="fas fa-hand-holding-heart me-2"></i>Campaña de Recaudación</h5>
                    {pMetaDonacion > 0 && (
                      <div className="mb-3">
                        <div className="d-flex justify-content-between small fw-bold mb-1" style={{ color: '#ffffff' }}>
                          <span>Recaudado: ${pTotalRecaudado.toFixed(2)}</span>
                          <span style={{ color: '#a0aec0' }}>Meta: ${pMetaDonacion}</span>
                        </div>
                        <div className="progress" style={{ height: '15px', backgroundColor: '#333' }}>
                          <div className="progress-bar bg-warning progress-bar-striped progress-bar-animated" role="progressbar" style={{ width: `${Math.min((pTotalRecaudado / pMetaDonacion) * 100, 100)}%`, backgroundColor: '#f5a623' }}></div>
                        </div>
                      </div>
                    )}
                    <button 
                      className="btn btn-warning fw-bold px-4 py-2 rounded-pill mt-2"
                      style={{ backgroundColor: '#f5a623', color: '#000000' }}
                      onClick={() => {
                        // Pasar al modal de detalle directamente para que donen ahí
                        const elAnuncio = popupObligatorio;
                        marcarComoVisto(pIdAnuncio).then(() => {
                          abrirDetalle(elAnuncio);
                        });
                      }}
                    >
                      <i className="fas fa-heart me-2"></i> Ver Detalles y Apoyar
                    </button>

                    {/* Banner de donación física en recepción dentro del popup */}
                    <div className="mt-4 p-3 rounded-3" style={{ backgroundColor: 'rgba(245, 166, 35, 0.1)', border: '1px dashed #f5a623', textAlign: 'left' }}>
                      <span className="small fw-bold d-block mb-1" style={{ color: '#f5a623' }}>
                        <i className="fas fa-cash-register me-2"></i>¿Prefieres donar físicamente?
                      </span>
                      <span className="d-block" style={{ fontSize: '0.8rem', lineHeight: '1.4', color: '#e2e8f0' }}>
                        ¡También es posible! Puedes registrar tu aportación en efectivo, transferencia bancaria o tarjeta directamente en la recepción del Box con el Administrador.
                      </span>
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer border-0 justify-content-center pb-4">
                <button type="button" className="btn btn-outline-light rounded-pill px-5 fw-bold" style={{ color: '#ffffff', borderColor: '#ffffff' }} onClick={() => marcarComoVisto(pIdAnuncio)}>
                  Entendido
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL DE DETALLE / LEADERBOARD / DONAR
      ======================================================== */}
      {anuncioDetalle && !popupObligatorio && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable">
            <div className="modal-content bg-dark text-white border-secondary" style={{ borderRadius: '15px' }}>
              <div className="modal-header border-secondary border-opacity-25">
                <h5 className="modal-title fw-bold text-warning" style={{ color: '#f5a623' }}>
                  <i className="fas fa-info-circle me-2"></i>{dTitulo}
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setAnuncioDetalle(null)}></button>
              </div>
              <div className="modal-body p-4" style={{ color: '#ffffff' }}>
                
                {/* Período de vigencia y Días restantes en Modal Detalle */}
                {dFechaInicio && dFechaFin && (
                  <div className="d-flex flex-wrap gap-2 align-items-center mb-4">
                    <span className="badge px-3 py-2 rounded-pill small border" style={{ fontSize: '0.78rem', color: '#ffffff', backgroundColor: 'rgba(255, 255, 255, 0.1)', borderColor: 'rgba(255, 255, 255, 0.2)' }}>
                      <i className="far fa-calendar-alt text-warning me-2" style={{ color: '#f5a623' }}></i>
                      Vigencia: {formatDateRange(dFechaInicio, dFechaFin)}
                    </span>
                    {(() => {
                      const diffDays = getDiffDays(dFechaFin);
                      if (diffDays === null) return null;
                      if (diffDays > 0) {
                        return (
                          <span className="badge px-3 py-2 rounded-pill small border fw-bold" style={{ fontSize: '0.78rem', color: '#f5a623', backgroundColor: 'rgba(245, 166, 35, 0.15)', borderColor: 'rgba(245, 166, 35, 0.3)' }}>
                            <i className="fas fa-hourglass-half me-2" style={{ color: '#f5a623' }}></i>
                            {diffDays} {diffDays === 1 ? 'día restante' : 'días restantes'}
                          </span>
                        );
                      } else if (diffDays === 0) {
                        return (
                          <span className="badge px-3 py-2 rounded-pill small border fw-bold" style={{ fontSize: '0.78rem', color: '#e63946', backgroundColor: 'rgba(230, 57, 70, 0.15)', borderColor: 'rgba(230, 57, 70, 0.3)' }}>
                            <i className="fas fa-hourglass-end me-2" style={{ color: '#e63946' }}></i>
                            ¡Último día hoy!
                          </span>
                        );
                      } else {
                        return (
                          <span className="badge px-3 py-2 rounded-pill small border" style={{ fontSize: '0.78rem', color: '#a0aec0', backgroundColor: 'rgba(255, 255, 255, 0.05)', borderColor: 'rgba(255, 255, 255, 0.1)' }}>
                            Finalizada
                          </span>
                        );
                      }
                    })()}
                  </div>
                )}

                <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6', color: '#ffffff', fontSize: '1rem' }} className="mb-4">
                  {dMensaje}
                </div>

                {dAceptarDonaciones && (
                  <div className="row g-4 mt-2">
                    
                    {/* Zona de Donación */}
                    <div className={dMostrarRankingDonadores ? "col-12 col-md-6" : "col-12"}>
                      <div className="p-4 rounded h-100 border d-flex flex-column justify-content-center align-items-center text-center" style={{ backgroundColor: '#000000', borderColor: 'rgba(245, 166, 35, 0.5)' }}>
                        <i className="fas fa-hand-holding-usd fa-3x text-warning mb-3" style={{ color: '#f5a623' }}></i>
                        <h5 className="fw-bold mb-3" style={{ color: '#ffffff' }}>Apoyar a la causa</h5>
                        
                        {dMetaDonacion > 0 && (
                          <div className="w-100 mb-4 text-start">
                            <div className="d-flex justify-content-between small fw-bold mb-1" style={{ color: '#ffffff' }}>
                              <span style={{ color: '#ffffff' }}>${dTotalRecaudado.toFixed(2)}</span>
                              <span style={{ color: '#a0aec0' }}>Meta: ${dMetaDonacion}</span>
                            </div>
                            <div className="progress" style={{ height: '10px', backgroundColor: '#333' }}>
                              <div className="progress-bar" role="progressbar" style={{ width: `${Math.min((dTotalRecaudado / dMetaDonacion) * 100, 100)}%`, backgroundColor: '#f5a623' }}></div>
                            </div>
                          </div>
                        )}

                        <div className="input-group mb-3 px-md-3">
                          <span className="input-group-text bg-dark text-white border-secondary fw-bold" style={{ color: '#ffffff', backgroundColor: '#1A1A24', borderColor: 'rgba(255,255,255,0.1)' }}>$</span>
                          <input 
                            type="number" 
                            className="form-control bg-dark text-white border-secondary fw-bold text-center" 
                            style={{ color: '#ffffff', backgroundColor: '#1A1A24', borderColor: 'rgba(255,255,255,0.1)' }}
                            value={montoDonacion}
                            onChange={(e) => setMontoDonacion(e.target.value)}
                            min="20"
                            step="10"
                          />
                          <span className="input-group-text bg-dark text-white border-secondary fw-bold" style={{ color: '#ffffff', backgroundColor: '#1A1A24', borderColor: 'rgba(255,255,255,0.1)' }}>MXN</span>
                        </div>
                        
                        <button 
                          className="btn btn-danger w-100 rounded-pill fw-bold" 
                          style={{ backgroundColor: '#e63946', borderColor: '#e63946', color: '#ffffff' }}
                          onClick={handleDonarStripe}
                          disabled={iniciandoPago}
                        >
                          {iniciandoPago ? <i className="fas fa-spinner fa-spin me-2"></i> : <i className="fab fa-stripe me-2 fs-5"></i>}
                          Pagar Donativo
                        </button>
                        <div className="mt-2 d-block px-3 text-center" style={{ fontSize: '0.75rem', color: '#cbd5e1', opacity: 0.9 }}>
                          Pago seguro procesado por Stripe. Esta aportación va directo al Box.
                        </div>

                        {/* Banner alternativo para donar en recepción */}
                        <div className="mt-4 w-100 p-3 rounded-3" style={{ backgroundColor: 'rgba(245, 166, 35, 0.1)', border: '1px dashed #f5a623', textAlign: 'left' }}>
                          <span className="small fw-bold d-block mb-1" style={{ color: '#f5a623' }}>
                            <i className="fas fa-cash-register me-2"></i>¿Prefieres aportar en efectivo?
                          </span>
                          <span className="d-block" style={{ fontSize: '0.78rem', lineHeight: '1.4', color: '#e2e8f0' }}>
                            ¡No te preocupes! También puedes registrar tu aportación en efectivo, transferencia o tarjeta directamente en la recepción del Box con el Administrador.
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Leaderboard */}
                    {dMostrarRankingDonadores && (
                      <div className="col-12 col-md-6">
                        <div className="bg-black bg-opacity-50 p-3 rounded h-100 border border-secondary border-opacity-25" style={{ backgroundColor: 'rgba(0,0,0,0.5)', borderColor: 'rgba(255,255,255,0.1)' }}>
                          <h6 className="fw-bold text-center mb-3" style={{ color: '#ffffff' }}>
                            <i className="fas fa-medal text-warning me-2" style={{ color: '#f5a623' }}></i>Top Donadores
                          </h6>
                          
                          {leaderboard.length === 0 ? (
                            <div className="text-center py-4 small" style={{ color: '#a0aec0' }}>
                              <i className="fas fa-ghost mb-2 fs-4 opacity-50"></i><br/>
                              Aún no hay aportaciones.<br/>¡Sé el primero de la manada!
                            </div>
                          ) : (
                            <div className="overflow-auto" style={{ maxHeight: '250px' }}>
                              {leaderboard.map((item, index) => (
                                <div key={index} className="d-flex align-items-center justify-content-between bg-dark p-2 rounded mb-2 border border-secondary border-opacity-10" style={{ backgroundColor: '#14141A', borderColor: 'rgba(255,255,255,0.05)' }}>
                                  <div className="d-flex align-items-center gap-2">
                                    <div className="fw-bold" style={{ width: '20px', color: '#a0aec0' }}>#{index + 1}</div>
                                    <div className="bg-danger bg-opacity-25 text-white fw-bold rounded-circle d-flex align-items-center justify-content-center" style={{ width: '30px', height: '30px', fontSize: '0.8rem', backgroundColor: 'rgba(230,57,70,0.25)', color: '#ffffff' }}>
                                      {(item.atleta?.nombre || '?').charAt(0).toUpperCase()}
                                    </div>
                                    <div className="small fw-bold text-white text-truncate" style={{ maxWidth: '100px', color: '#ffffff' }}>
                                      {item.atleta?.nombre.split(' ')[0]}
                                    </div>
                                  </div>
                                  <div className="fw-bold text-warning small" style={{ color: '#f5a623' }}>
                                    ${item.totalDonado.toFixed(0)}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

              </div>
              <div className="modal-footer border-0 justify-content-center pb-4">
                <button type="button" className="btn btn-outline-light rounded-pill px-5 fw-bold" style={{ color: '#ffffff', borderColor: '#ffffff' }} onClick={() => setAnuncioDetalle(null)}>
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AnunciosEngine;
