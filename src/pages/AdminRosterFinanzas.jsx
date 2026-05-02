import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { COMPETENCIAS_ENDPOINT } from '../services/api';
import BackButton from '../components/BackButton';
import FiltroEstatusPicker from '../components/FiltroEstatusPicker';
import CategoriaPickerModal from '../components/CategoriaPickerModal';
import MoverCategoriaModal from '../components/MoverCategoriaModal';
import BotonSeguro from '../components/BotonSeguro';
import '../assets/css/AdminRosterFinanzas.css';

export default function AdminRosterFinanzas() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [rosterData, setRosterData] = useState([]);

  // MODALES
  const [atletaEditando, setAtletaEditando] = useState(null);
  const [procesando, setProcesando] = useState(false);

  // MODAL EXPEDIENTE ATLETA
  const [mostrarDetallesAtleta, setMostrarDetallesAtleta] = useState(false);
  const [atletaDetalle, setAtletaDetalle] = useState(null);

  // FILTROS
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstatus, setFiltroEstatus] = useState('todos');
  const [categoriaFiltro, setCategoriaFiltro] = useState('todas');



  useEffect(() => { cargarRoster(); }, [id]);

  const cargarRoster = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`${COMPETENCIAS_ENDPOINT}/${id}/roster`);
      if (res.ok) setRosterData(await res.json());
    } catch (error) { console.error(error); }
    finally { if (!silent) setLoading(false); }
  };

  // CÁLCULOS DEL DASHBOARD FINANCIERO
  const stats = useMemo(() => {
    let totalEfectivo = 0, totalTransferencia = 0, totalTarjeta = 0;
    let equiposPagados = 0, equiposConDeuda = 0;

    rosterData.forEach(cat => {
      (cat.equipos || []).forEach(eq => {
        let pagadoEquipo = 0;
        (eq.pagos || []).forEach(p => {
          if (p.estatus === 'Aprobado') {
            pagadoEquipo += p.montoAbonado;
            if (p.metodoPago === 'Efectivo') totalEfectivo += p.montoAbonado;
            else if (p.metodoPago === 'Tarjeta') totalTarjeta += p.montoAbonado;
            else totalTransferencia += p.montoAbonado;
          }
        });
        if (pagadoEquipo >= cat.costo) equiposPagados++; else equiposConDeuda++;
      });
    });

    return { totalEfectivo, totalTransferencia, totalTarjeta, totalRecaudado: totalEfectivo + totalTransferencia + totalTarjeta, equiposPagados, equiposConDeuda };
  }, [rosterData]);

  // ==========================================
  // ACCIONES
  // ==========================================
  const eliminarEquipo = async (idEq) => {
    if (!window.confirm("¿BORRAR EQUIPO? Esto liberará el cupo y borrará a sus atletas.")) return;
    try { const res = await fetch(`${COMPETENCIAS_ENDPOINT}/equipos/${idEq}`, { method: 'DELETE' }); if (res.ok) cargarRoster(true); } catch (e) { alert("Error"); }
  };

  const eliminarAtleta = async (idAtl) => {
    if (!window.confirm("¿Eliminar a este atleta del equipo?")) return;
    try { const res = await fetch(`${COMPETENCIAS_ENDPOINT}/atletas/${idAtl}`, { method: 'DELETE' }); if (res.ok) cargarRoster(true); } catch (e) { alert("Error"); }
  };

  const aprobarPago = async (idPago) => {
    if (!window.confirm("¿Aprobar esta transferencia? El dinero se sumará al total recaudado.")) return;
    try { const res = await fetch(`${COMPETENCIAS_ENDPOINT}/pagos/${idPago}/aprobar`, { method: 'PUT' }); if (res.ok) cargarRoster(true); } catch (e) { alert("Error"); }
  };

  const darVistoBueno = async (idEq) => {
    try {
      const res = await fetch(`${COMPETENCIAS_ENDPOINT}/equipos/${idEq}/aprobar-total`, { method: 'PUT' });
      const data = await res.json();
      if (res.ok) { alert("¡Equipo Aprobado Oficialmente! ✅"); cargarRoster(true); } else alert(data.mensaje);
    } catch (e) { alert("Error"); }
  };

  const cambiarCategoria = async (idEq, idNueva) => {
    if (!idNueva) return;
    setProcesando(true);
    try {
      const res = await fetch(`${COMPETENCIAS_ENDPOINT}/equipos/${idEq}/cambiar-categoria`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ IdNuevaCategoria: parseInt(idNueva) })
      });
      if (res.ok) cargarRoster(true); else { const err = await res.json(); alert(err.mensaje); }
    } finally { setProcesando(false); }
  };

  const registrarPagoFisico = async (idEquipo, restante) => {
    const monto = prompt(`¿Cuánto vas a recibir en caja en este momento?\nDeuda actual: $${restante}`);
    if (!monto || isNaN(monto) || monto <= 0) return;
    const metodo = window.confirm("¿El pago es en Efectivo? (Da Cancelar si te están pagando con Tarjeta)") ? "Efectivo" : "Tarjeta";
    try {
      const res = await fetch(`${COMPETENCIAS_ENDPOINT}/equipos/${idEquipo}/abono-fisico`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ MontoAbonado: parseFloat(monto), MetodoPago: metodo, NombrePagador: "Pago en Caja" })
      });
      if (res.ok) { alert("¡Cobro registrado! 💰"); cargarRoster(true); }
    } catch (e) { alert("Error al cobrar"); }
  };

  const guardarAtleta = async (e) => {
    e.preventDefault(); setProcesando(true);
    try {
      const res = await fetch(`${COMPETENCIAS_ENDPOINT}/atletas/${atletaEditando.idAtletaComp}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(atletaEditando)
      });
      const data = await res.json();
      if (res.ok) { setAtletaEditando(null); cargarRoster(true); } else alert(data.mensaje);
    } finally { setProcesando(false); }
  };



  if (loading) return (
    <div className="d-flex align-items-center justify-content-center" style={{ minHeight: '60vh', background: 'var(--bg-base)' }}>
      <div className="spinner-wp"></div>
    </div>
  );

  return (
    <div className="arf-page">



      {/* ══════════════════════════════════
          MODAL — EDITAR ATLETA
      ══════════════════════════════════ */}
      {atletaEditando && (
        <div className="arf-modal-overlay">
          <div className="arf-modal-panel arf-modal-panel--edit">
            <div className="arf-modal-header">
              <p className="arf-modal-titulo arf-modal-titulo--edit">
                <i className="fas fa-user-edit"></i> Editar <span style={{ color: 'var(--accent)' }}>Atleta</span>
              </p>
              <button className="arf-modal-close" onClick={() => setAtletaEditando(null)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <form onSubmit={guardarAtleta}>
              <div className="mb-3">
                <label className="arf-label">Nombre completo</label>
                <input type="text" className="arf-input" required value={atletaEditando.nombreCompleto} onChange={e => setAtletaEditando({ ...atletaEditando, nombreCompleto: e.target.value })} />
              </div>
              <div className="row g-3 mb-3">
                <div className="col-6">
                  <label className="arf-label">Teléfono</label>
                  <input type="tel" className="arf-input" maxLength={10} value={atletaEditando.telefono} onChange={e => setAtletaEditando({ ...atletaEditando, telefono: e.target.value.replace(/\D/g, '').slice(0, 10) })} />
                </div>
                <div className="col-6">
                  <label className="arf-label arf-label--accent">Nivel</label>
                  <select className="arf-select" value={atletaEditando.nivelHabilidad} onChange={e => setAtletaEditando({ ...atletaEditando, nivelHabilidad: e.target.value })}>
                    <option value="Novato">Novato</option>
                    <option value="Principiante">Principiante</option>
                    <option value="Intermedio">Intermedio</option>
                    <option value="Avanzado">Avanzado / RX</option>
                  </select>
                </div>
              </div>
              <div className="row g-3 mb-4">
                <div className="col-6">
                  <label className="arf-label">Talla playera</label>
                  <select className="arf-select" value={atletaEditando.tallaPlayera} onChange={e => setAtletaEditando({ ...atletaEditando, tallaPlayera: e.target.value })}>
                    <option value="XS">XS</option>
                    <option value="S">S</option>
                    <option value="M">M</option>
                    <option value="L">L</option>
                    <option value="XL">XL</option>
                  </select>
                </div>
                <div className="col-6">
                  <label className="arf-label">Tipo de sangre</label>
                  <input type="text" className="arf-input" placeholder="Ej. O+" value={atletaEditando.tipoSangre} onChange={e => setAtletaEditando({ ...atletaEditando, tipoSangre: e.target.value })} />
                </div>
              </div>
              <div className="d-flex gap-2">
                <button type="button" className="arf-btn-cancel-modal" onClick={() => setAtletaEditando(null)}>Cancelar</button>
                <BotonSeguro type="submit" className="arf-btn-submit arf-btn-submit--accent" disabled={procesando} style={{ flex: 1 }} textoProcesando="Guardando...">
                  <i className="fas fa-save"></i> Guardar
                </BotonSeguro>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════
          HEADER
      ══════════════════════════════════ */}
      <header className="arf-nav">
        <div className="arf-nav-left">
          <BackButton to="/admin-competencias" />
          <div className="arf-nav-icon d-none d-sm-flex">
            <i className="fas fa-users-cog"></i>
          </div>
          <p className="arf-nav-titulo">
            Cobranza y <span>Roster</span>
          </p>
        </div>
      </header>

      <div className="container-xl px-3 px-md-4">

        {/* ══════════════════════════════════
            DASHBOARD FINANCIERO
        ══════════════════════════════════ */}
        <div className="row g-3 mb-4">
          <div className="col-6 col-md-3">
            <div className="arf-stat-card">
              <p className="arf-stat-label">Total Recaudado</p>
              <p className="arf-stat-value arf-stat-value--success">${stats.totalRecaudado.toFixed(2)}</p>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="arf-desglose-card">
              <div className="arf-desglose-row">
                <i className="fas fa-money-bill-wave" style={{ color: 'var(--success)' }}></i>
                <span className="arf-desglose-nombre">Efectivo</span>
                <span className="arf-desglose-monto">${stats.totalEfectivo.toFixed(2)}</span>
              </div>
              <div className="arf-desglose-row">
                <i className="fas fa-university" style={{ color: 'var(--accent-cool)' }}></i>
                <span className="arf-desglose-nombre">Transferencia</span>
                <span className="arf-desglose-monto">${stats.totalTransferencia.toFixed(2)}</span>
              </div>
              <div className="arf-desglose-row">
                <i className="fas fa-credit-card" style={{ color: 'var(--accent)' }}></i>
                <span className="arf-desglose-nombre">Terminal</span>
                <span className="arf-desglose-monto">${stats.totalTarjeta.toFixed(2)}</span>
              </div>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="arf-stat-card" style={{ borderColor: 'rgba(46,204,113,0.2)' }}>
              <p className="arf-stat-label">Equipos Pagados</p>
              <p className="arf-stat-value arf-stat-value--success">{stats.equiposPagados}</p>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="arf-stat-card" style={{ borderColor: 'rgba(230,57,70,0.2)' }}>
              <p className="arf-stat-label">Con Deuda</p>
              <p className="arf-stat-value arf-stat-value--danger">{stats.equiposConDeuda}</p>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════
            FILTROS Y BUSCADOR
        ══════════════════════════════════ */}
        <div className="arf-filtros">
          <div className="arf-buscador-wrap">
            <i className="fas fa-search"></i>
            <input
              type="text"
              className="arf-buscador"
              placeholder="Buscar por equipo o atleta..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
            />
          </div>
          <CategoriaPickerModal
            categorias={rosterData}
            seleccion={categoriaFiltro}
            onChange={setCategoriaFiltro}
          />
          <FiltroEstatusPicker valor={filtroEstatus} onCambiar={setFiltroEstatus} />
        </div>

        {/* ══════════════════════════════════
            LISTA POR CATEGORÍA
        ══════════════════════════════════ */}
        {rosterData.map(cat => {
          if (categoriaFiltro !== 'todas' && categoriaFiltro !== cat.idCategoriaComp) return null;

          const equiposFiltrados = (cat.equipos || []).filter(eq => {
            const pagado = (eq.pagos || []).filter(p => p.estatus === 'Aprobado').reduce((s, p) => s + p.montoAbonado, 0);
            const deuda = Math.max(0, cat.costo - pagado);
            const matchBusqueda = busqueda.trim() === '' ||
              eq.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
              (eq.atletas || []).some(a => a.nombreCompleto.toLowerCase().includes(busqueda.toLowerCase()));
            const matchEstatus =
              filtroEstatus === 'todos' ||
              (filtroEstatus === 'pagados' && deuda === 0) ||
              (filtroEstatus === 'deuda' && deuda > 0);
            return matchBusqueda && matchEstatus;
          });

          if (equiposFiltrados.length === 0 && (busqueda.trim() !== '' || filtroEstatus !== 'todos')) return null;

          return (
            <div key={cat.idCategoriaComp} className="mb-5">

              <div className="arf-cat-header">
                <h2 className="arf-cat-nombre">{cat.categoriaNombre}</h2>
                <span className="arf-cat-costo">${cat.costo}</span>
              </div>

              {equiposFiltrados.length === 0 ? (
                <p className="arf-cat-empty">
                  <i className="fas fa-ghost"></i> Sin equipos en esta categoría.
                </p>
              ) : (
                <div className="row g-4">
                  {equiposFiltrados.map(eq => {
                    const pagado = (eq.pagos || []).filter(p => p.estatus === "Aprobado").reduce((s, p) => s + p.montoAbonado, 0);
                    const deuda = Math.max(0, cat.costo - pagado);
                    const estaPagado = deuda === 0;

                    return (
                      <div key={eq.idEquipoComp} className="col-12 col-xxl-6">
                        <div className={`arf-equipo-card ${eq.estatusPago === 'Aprobado' ? 'arf-equipo-card--aprobado' : ''}`}>

                          {/* Header equipo */}
                          <div className="arf-equipo-header">
                            <div className="min-w-0">
                              <p className="arf-equipo-nombre">{eq.nombre}</p>
                              <div className="d-flex flex-wrap align-items-center gap-2 mt-1">
                                <p className="arf-equipo-codigo mb-0"><i className="fas fa-key me-1"></i>{eq.codigoInvitacion}</p>
                                {eq.fechaCreacion && <span className="text-secondary" style={{ fontSize: '0.8rem' }}><i className="fas fa-calendar-alt me-1"></i>Creado: {new Date(eq.fechaCreacion).toLocaleDateString('es-MX')}</span>}
                              </div>
                              {eq.estatusPago === 'Aprobado' && (
                                <div className="d-flex align-items-center gap-2 mt-2">
                                  <span className="arf-badge-aprobado">
                                    <i className="fas fa-check-double"></i> Oficial
                                  </span>
                                  {eq.fechaAprobacion && <span className="text-success" style={{ fontSize: '0.8rem' }}><i className="fas fa-calendar-check me-1"></i>Aprobado: {new Date(eq.fechaAprobacion).toLocaleDateString('es-MX')}</span>}
                                </div>
                              )}
                            </div>
                            <div className="arf-equipo-acciones">
                              <MoverCategoriaModal
                                categorias={rosterData.filter(c => c.idCategoriaComp !== cat.idCategoriaComp)}
                                onSeleccionar={(idNueva) => cambiarCategoria(eq.idEquipoComp, idNueva)}
                                disabled={procesando}
                              />
                              <BotonSeguro onClick={() => eliminarEquipo(eq.idEquipoComp)} className="arf-btn-eliminar-eq" title="Eliminar equipo" textoProcesando="">
                                <i className="fas fa-trash"></i>
                              </BotonSeguro>
                            </div>
                          </div>

                          {/* Cuerpo — dos columnas en md+ */}
                          <div className="arf-card-body">
                            <div className="row g-3">

                              {/* Columna Roster */}
                              <div className="col-12 col-md-7">
                                <p className="arf-section-titulo">
                                  <i className="fas fa-users"></i>
                                  Roster ({eq.atletas?.length || 0}/{cat.cantidadIntegrantes})
                                </p>
                                <div className="d-flex flex-column gap-2">
                                  {(eq.atletas || []).map(atl => (
                                    <div key={atl.idAtletaComp} className="arf-atleta-row">
                                      <div className="arf-atleta-info">
                                        <i
                                          className={`fas fa-${atl.genero === 'Femenino' ? 'female' : 'male'}`}
                                          style={{ color: atl.genero === 'Femenino' ? '#ff7fa8' : 'var(--accent-cool)', width: '12px' }}
                                        ></i>
                                        <div className="d-flex flex-column lh-sm">
                                          <span className="text-truncate" style={{ fontSize: '13px' }}>{atl.nombreCompleto} {atl.apellidos}</span>
                                          {atl.fechaRegistro && <span className="text-secondary mt-1" style={{ fontSize: '10px' }}><i className="fas fa-clock me-1"></i>Se unió: {new Date(atl.fechaRegistro).toLocaleDateString('es-MX')}</span>}
                                        </div>
                                        <span className="arf-atleta-nivel">{atl.nivelHabilidad}</span>
                                      </div>
                                      <div className="arf-atleta-acciones">
                                        <button onClick={() => { setAtletaDetalle({ ...atl, costoCategoria: cat.costo, esEquipo: cat.esEquipo, reqCategoria: cat }); setMostrarDetallesAtleta(true); }} className="arf-btn-edit-atl" title="Más información">
                                          <i className="fas fa-info-circle text-info"></i>
                                        </button>
                                        <button onClick={() => setAtletaEditando(atl)} className="arf-btn-edit-atl" title="Editar">
                                          <i className="fas fa-edit"></i>
                                        </button>
                                        <BotonSeguro onClick={() => eliminarAtleta(atl.idAtletaComp)} className="arf-btn-del-atl" title="Quitar" textoProcesando="">
                                          <i className="fas fa-user-minus"></i>
                                        </BotonSeguro>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Columna Finanzas */}
                              <div className="col-12 col-md-5">
                                <p className="arf-section-titulo">
                                  <i className="fas fa-file-invoice-dollar"></i> Finanzas
                                </p>

                                <div className="arf-finanzas-mini">
                                  <div className="arf-fin-row arf-fin-pagado">
                                    <span>Pagado</span>
                                    <span className="arf-fin-monto">${pagado.toFixed(2)}</span>
                                  </div>
                                  <div className={`arf-fin-row ${deuda > 0 ? 'arf-fin-deuda' : 'arf-fin-ok'}`}>
                                    <span>Deuda</span>
                                    <span className="arf-fin-monto">${deuda.toFixed(2)}</span>
                                  </div>
                                </div>

                                {/* Pagos pendientes */}
                                {(eq.pagos || []).map(p => p.estatus === 'PendienteVerificacion' && (
                                  <div key={p.idPago} className="arf-pago-pendiente">
                                    <p className="arf-pago-label" style={{ lineHeight: '1.2' }}>
                                      <span className="d-block mb-1"><i className="fas fa-clock me-1"></i>En revisión: <strong>${p.montoAbonado}</strong></span>
                                      <span className="text-secondary" style={{ fontSize: '0.8rem' }}><i className="fas fa-user-circle me-1"></i>{p.nombrePagador}</span>
                                    </p>
                                    <div className="arf-pago-btns">
                                      {p.comprobanteUrl && (
                                        <a href={`${import.meta.env.VITE_API_URL}${p.comprobanteUrl}`} target="_blank" rel="noreferrer" className="arf-btn-ver-foto">
                                          <i className="fas fa-image"></i> Ver foto
                                        </a>
                                      )}
                                      <BotonSeguro onClick={() => aprobarPago(p.idPago)} className="arf-btn-aprobar-pago" textoProcesando="Aprobando...">
                                        <i className="fas fa-check"></i> Aprobar
                                      </BotonSeguro>
                                    </div>
                                  </div>
                                ))}

                                {/* Pagos aprobados */}
                                {(eq.pagos || []).map(p => p.estatus === 'Aprobado' && (
                                  <div key={p.idPago} className="mt-2 p-2 rounded" style={{ backgroundColor: 'rgba(46, 204, 113, 0.1)', border: '1px solid rgba(46, 204, 113, 0.3)' }}>
                                    <div className="d-flex justify-content-between align-items-center">
                                      <span className="text-success small fw-bold"><i className="fas fa-check-circle me-1"></i>${p.montoAbonado}</span>
                                      <span className="text-secondary" style={{ fontSize: '0.7rem' }}>{p.metodoPago}</span>
                                    </div>
                                    <span className="d-block text-secondary mt-1 text-truncate" style={{ fontSize: '0.75rem' }}><i className="fas fa-user-circle me-1"></i>{p.nombrePagador}</span>
                                    {p.fechaAprobacionPago && (
                                      <span className="d-block text-success mt-1" style={{ fontSize: '0.7rem' }}><i className="fas fa-calendar-check me-1"></i>Aprobado: {new Date(p.fechaAprobacionPago).toLocaleDateString('es-MX')} {new Date(p.fechaAprobacionPago).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</span>
                                    )}
                                  </div>
                                ))}

                                {/* Acciones */}
                                <div className="d-flex flex-column gap-2 mt-2">
                                  {estaPagado && eq.estatusPago !== 'Aprobado' && (
                                    <BotonSeguro onClick={() => darVistoBueno(eq.idEquipoComp)} className="arf-btn-visto-bueno" textoProcesando="Aprobando...">
                                      <i className="fas fa-check-circle"></i> Dar Visto Bueno
                                    </BotonSeguro>
                                  )}
                                  {deuda > 0 && (
                                    <BotonSeguro onClick={() => registrarPagoFisico(eq.idEquipoComp, deuda)} className="arf-btn-cobrar" textoProcesando="Registrando...">
                                      <i className="fas fa-cash-register"></i> Cobrar en Caja
                                    </BotonSeguro>
                                  )}
                                </div>
                              </div>

                            </div>
                          </div>

                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

            </div>
          );
        })}

      </div>

      {/* === MODAL DETALLES DE ATLETA === */}
      {mostrarDetallesAtleta && atletaDetalle && (() => {
        let edad = "N/A";
        if (atletaDetalle.fechaNacimiento) {
          const diff = Date.now() - new Date(atletaDetalle.fechaNacimiento).getTime();
          edad = new Date(diff).getUTCFullYear() - 1970;
        }

        const getLvlVal = (s) => {
          const l = (s || '').toLowerCase();
          if (l.includes('master')) return 4;
          if (l.includes('avanzado') || l.includes('rx')) return 3;
          if (l.includes('intermedio')) return 2;
          if (l.includes('principiante')) return 1;
          return 0;
        };

        let escalo = false;
        let catNivelStr = "";
        if (!atletaDetalle.esEquipo && atletaDetalle.reqCategoria) {
          const c = atletaDetalle.reqCategoria;
          const athLvl = getLvlVal(atletaDetalle.nivelHabilidad);
          let catLvl = 0;
          if (c.cupoMaster > 0) { catLvl = 4; catNivelStr = "Master"; }
          else if (c.cupoAvanzado > 0) { catLvl = 3; catNivelStr = "Avanzado/RX"; }
          else if (c.cupoIntermedio > 0) { catLvl = 2; catNivelStr = "Intermedio"; }
          else if (c.cupoPrincipiante > 0) { catLvl = 1; catNivelStr = "Principiante"; }
          else { catNivelStr = "Novato"; }

          if (athLvl < catLvl) escalo = true;
        }

        return (
          <div className="arf-modal-overlay">
            <div className="arf-modal-panel" style={{ maxWidth: '500px', padding: '0', border: '1px solid var(--info)' }}>
              <div className="arf-modal-header" style={{ padding: '15px 20px', borderBottom: '1px solid var(--border)' }}>
                <p className="arf-modal-titulo text-info" style={{ fontFamily: 'var(--font-heading)' }}>
                  <i className="fas fa-id-card me-2"></i>Expediente del Atleta
                </p>
                <button className="arf-modal-close" onClick={() => setMostrarDetallesAtleta(false)}>
                  <i className="fas fa-times"></i>
                </button>
              </div>
              <div style={{ padding: '20px' }}>
                <div className="text-center mb-4">
                  <i className={`fas ${atletaDetalle.genero === 'Hombre' || atletaDetalle.genero === 'Masculino' ? 'fa-male text-info' : 'fa-female'} mb-3`} style={{ fontSize: '3rem', color: atletaDetalle.genero === 'Hombre' || atletaDetalle.genero === 'Masculino' ? '' : '#ff7fa8' }}></i>
                  <h4 className="text-white mb-1">{atletaDetalle.nombreCompleto} {atletaDetalle.apellidos}</h4>
                  <p className="text-secondary small mb-0">{atletaDetalle.correo || 'Sin correo registrado'}</p>
                </div>

                <div className="row g-3 mb-3">
                  <div className="col-6">
                    <div className="p-3 bg-dark rounded border border-secondary border-opacity-25 text-center">
                      <small className="text-muted d-block mb-1">Edad</small>
                      <h6 className="text-white mb-0">{edad} años</h6>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="p-3 bg-dark rounded border border-secondary border-opacity-25 text-center">
                      <small className="text-muted d-block mb-1">Talla de Playera</small>
                      <h6 className="text-white mb-0">{atletaDetalle.tallaPlayera || 'N/A'}</h6>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="p-3 bg-dark rounded border border-secondary border-opacity-25 text-center">
                      <small className="text-muted d-block mb-1">Tipo de Sangre</small>
                      <h6 className="text-white mb-0">{atletaDetalle.tipoSangre || 'N/A'}</h6>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="p-3 bg-dark rounded border border-secondary border-opacity-25 text-center">
                      <small className="text-muted d-block mb-1">Nivel Declarado</small>
                      <h6 className="text-white mb-0">{atletaDetalle.nivelHabilidad}</h6>
                    </div>
                  </div>
                </div>

                {!atletaDetalle.esEquipo && (
                  <div className="mb-3">
                    <div className="p-3 bg-dark rounded border border-secondary border-opacity-25 text-center">
                      <small className="text-muted d-block mb-1">Costo de Inscripción</small>
                      <h5 className="text-success mb-0 fw-bold">${atletaDetalle.costoCategoria} MXN</h5>
                    </div>
                    {escalo && (
                      <div className="mt-2 p-3 rounded text-center" style={{ backgroundColor: 'rgba(255, 193, 7, 0.1)', border: '1px solid rgba(255, 193, 7, 0.3)' }}>
                        <i className="fas fa-exclamation-triangle text-warning mb-2 fs-5"></i>
                        <p className="small text-warning mb-0"><strong>Escaló de Categoría:</strong> Su nivel real es <strong>{atletaDetalle.nivelHabilidad}</strong> pero asumió el riesgo para competir en <strong>{catNivelStr}</strong>.</p>
                      </div>
                    )}
                  </div>
                )}

                <div className="p-3 bg-dark rounded border border-secondary border-opacity-25 text-center mt-3">
                  <small className="text-muted d-block mb-2">Carta Responsiva</small>
                  {atletaDetalle.aceptoCartaResponsiva ? (
                    <>
                      <i className="fas fa-check-circle text-success fs-4 mb-2"></i>
                      <p className="small text-success mb-0">Aceptada el: {atletaDetalle.fechaAceptacionCartaResponsiva ? new Date(atletaDetalle.fechaAceptacionCartaResponsiva).toLocaleDateString() : 'N/A'}</p>
                    </>
                  ) : (
                    <>
                      <i className="fas fa-times-circle text-danger fs-4 mb-2"></i>
                      <p className="small text-danger mb-0">Falta Aceptar</p>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
}
