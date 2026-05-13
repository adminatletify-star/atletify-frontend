import { useState, useEffect } from 'react';
import { COMPETENCIAS_ENDPOINT } from '../services/api';
import AtletifyLoader from '../components/AtletifyLoader';
import BackButton from '../components/BackButton';
import '../assets/css/AdminRoster.css';

export default function AdminRoster() {
  const [competencias, setCompetencias] = useState([]);
  const [compSeleccionada, setCompSeleccionada] = useState('');
  const [roster, setRoster] = useState([]);
  const [loading, setLoading] = useState(false);
  const [procesando, setProcesando] = useState(false);

  useEffect(() => {
    const box = JSON.parse(localStorage.getItem('box'));
    if (box) cargarCompetencias(box.idBox || box.IdBox);
  }, []);

  useEffect(() => {
    if (compSeleccionada) cargarRoster(compSeleccionada);
  }, [compSeleccionada]);

  const cargarCompetencias = async (idBox) => {
    try {
      const res = await fetch(`${COMPETENCIAS_ENDPOINT}/box/${idBox}`, { cache: 'no-store' });
      const data = await res.json();
      setCompetencias(data);
      // Seleccionar por defecto la primera que esté en inscripciones
      const activa = data.find(c => c.estatus === 'Inscripciones' || c.estatus === 'Activa');
      if (activa) setCompSeleccionada(activa.idCompetencia || activa.IdCompetencia);
    } catch (error) { console.error(error); }
  };

  const cargarRoster = async (idComp) => {
    setLoading(true);
    try {
      const res = await fetch(`${COMPETENCIAS_ENDPOINT}/${idComp}/roster`, { cache: 'no-store' });
      const data = await res.json();
      setRoster(data);
    } catch (error) { console.error(error); } 
    finally { setLoading(false); }
  };

  const cambiarEstatusPago = async (idEquipo, nuevoEstatus) => {
    if (!await window.wpConfirm(`¿Seguro que deseas marcar este pago como ${nuevoEstatus.toUpperCase()}?`)) return;
    setProcesando(true);
    try {
      const res = await fetch(`${COMPETENCIAS_ENDPOINT}/equipos/${idEquipo}/pago`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estatus: nuevoEstatus })
      });
      if (res.ok) cargarRoster(compSeleccionada);
      else alert('Error al cambiar el estatus del pago.');
    } catch (err) { alert('Error de conexión.'); }
    finally { setProcesando(false); }
  };

  const getBadgeColor = (estatus) => {
    if (estatus === 'Aprobado') return 'success';
    if (estatus === 'Rechazado') return 'danger';
    return 'warning text-dark';
  };

  const getEstatusKey = (estatus) => {
    if (estatus === 'Aprobado') return 'ok';
    if (estatus === 'Rechazado') return 'mal';
    return 'pend';
  };

  return (
    <div className="ar-container">

      {/* ── HEADER ── */}
      <div className="ar-header">
        <div className="ar-header-left">
          <BackButton />
          <div className="ar-header-icono">
            <i className="fas fa-clipboard-check"></i>
          </div>
          <div>
            <h1 className="ar-titulo">Bandeja de <span>Pagos</span> y Roster</h1>
            <p className="ar-subtitulo">Aprueba las transferencias para asegurar el lugar de los atletas.</p>
          </div>
        </div>

        <div className="ar-header-right">
          <div className="ar-selector-wrap">
            <i className="fas fa-trophy ar-selector-icon"></i>
            <select
              className="ar-selector"
              value={compSeleccionada}
              onChange={(e) => setCompSeleccionada(e.target.value)}
            >
              <option value="">Selecciona una competencia...</option>
              {competencias.map(c => (
                <option key={c.idCompetencia || c.IdCompetencia} value={c.idCompetencia || c.IdCompetencia}>
                  {c.nombre || c.Nombre} ({c.estatus || c.Estatus})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── CONTENIDO ── */}
      <div className="ar-content">
        {loading ? (
          <div className="ar-estado-centro">
            <AtletifyLoader />
          </div>
        ) : roster.length === 0 ? (
          <div className="ar-empty">
            <i className="fas fa-inbox"></i>
            <p>No hay categorías registradas en esta competencia.</p>
          </div>
        ) : (
          <div className="d-flex flex-column gap-4">
            {roster.map(cat => (
              <div key={cat.idCategoriaComp || cat.IdCategoriaComp} className="ar-cat-section">

                {/* Header de categoría */}
                <div className="ar-cat-header">
                  <div className="d-flex align-items-center gap-2 flex-wrap">
                    <h3 className="ar-cat-nombre">{cat.categoriaNombre || cat.CategoriaNombre}</h3>
                    <span className="ar-tipo-badge">
                      <i className={`fas fa-${(cat.esEquipo || cat.EsEquipo) ? 'users' : 'user'}`}></i>
                      {(cat.esEquipo || cat.EsEquipo) ? 'Equipo' : 'Individual'}
                    </span>
                  </div>
                  <span className="ar-cat-count">
                    <i className="fas fa-list-ul me-1"></i>
                    {(cat.equipos || cat.Equipos).length} Registros
                  </span>
                </div>

                {/* Grid de equipos */}
                <div className="ar-cat-equipos">
                  {!(cat.equipos || cat.Equipos) || (cat.equipos || cat.Equipos).length === 0 ? (
                    <div className="ar-cat-empty">
                      <i className="fas fa-ghost"></i>
                      <p>Sin inscritos en esta categoría.</p>
                    </div>
                  ) : (
                    <div className="row g-3">
                      {(cat.equipos || cat.Equipos).map(eq => {
                        const estatus = eq.estatusPago || eq.EstatusPago;
                        const estatusKey = getEstatusKey(estatus);
                        return (
                          <div key={eq.idEquipoComp || eq.IdEquipoComp} className="col-12 col-md-6 col-xl-4">
                            <div className={`ar-equipo-card ar-equipo-card--${estatusKey}`}>

                              {/* Header del equipo */}
                              <div className="ar-equipo-header">
                                <p className="ar-equipo-nombre">{eq.nombre || eq.Nombre}</p>
                                <span className={`ar-pago-badge ar-pago-badge--${estatusKey}`}>
                                  <i className={`fas ${estatusKey === 'ok' ? 'fa-check-circle' : estatusKey === 'mal' ? 'fa-times-circle' : 'fa-clock'}`}></i>
                                  {estatus?.toUpperCase()}
                                </span>
                              </div>

                              {/* Cuerpo */}
                              <div className="ar-equipo-body">
                                <p className="ar-box-origen">
                                  <i className="fas fa-map-marker-alt"></i>
                                  {eq.boxOrigen || eq.BoxOrigen || 'Independiente'}
                                </p>

                                <div>
                                  <span className="ar-atletas-label">
                                    <i className="fas fa-users"></i> Integrantes
                                  </span>
                                  <ul className="ar-atleta-list">
                                    {(eq.atletas || eq.Atletas).map(atl => (
                                      <li key={atl.idAtletaComp || atl.IdAtletaComp} className="ar-atleta-item">
                                        <i className="fas fa-circle ar-atleta-dot"></i>
                                        <span className="ar-atleta-nombre">{atl.nombreCompleto || atl.NombreCompleto}</span>
                                        <span className="ar-atleta-meta">
                                          {atl.tallaPlayera || atl.TallaPlayera} · {atl.tipoSangre || atl.TipoSangre}
                                        </span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              </div>

                              {/* Acciones */}
                              <div className="ar-equipo-footer">
                                <button
                                  className="ar-btn-aprobar"
                                  disabled={procesando || estatus === 'Aprobado'}
                                  onClick={() => cambiarEstatusPago(eq.idEquipoComp || eq.IdEquipoComp, 'Aprobado')}
                                  title="Aprobar Pago"
                                >
                                  <i className="fas fa-check"></i>
                                  <span>Aprobar</span>
                                </button>
                                <button
                                  className="ar-btn-rechazar"
                                  disabled={procesando || estatus === 'Rechazado'}
                                  onClick={() => cambiarEstatusPago(eq.idEquipoComp || eq.IdEquipoComp, 'Rechazado')}
                                  title="Rechazar Pago"
                                >
                                  <i className="fas fa-times"></i>
                                  <span>Rechazar</span>
                                </button>
                              </div>

                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}