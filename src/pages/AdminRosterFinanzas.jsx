import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { COMPETENCIAS_ENDPOINT } from '../services/api';
import AtletifyLoader from '../components/AtletifyLoader';
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

  // MODAL CONFIRMAR APROBACIÓN DE PAGO
  const [pagoAConfirmar, setPagoAConfirmar] = useState(null);

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

  // ALTA MANUAL DE EQUIPO (el admin registra un equipo ya aprobado, incluso con inscripciones cerradas)
  const DEFAULT_ALTA = {
    idCategoriaComp: '', nombreEquipo: '', boxOrigen: '', metodoPago: 'Efectivo',
    cap: { nombreCompleto: '', apellidos: '', correo: '', telefono: '', genero: 'Masculino', nivelHabilidad: 'Intermedio', fechaNacimiento: '', tipoSangre: 'O+', tallaPlayera: 'M' }
  };
  const [mostrarAltaEquipo, setMostrarAltaEquipo] = useState(false);
  const [altaForm, setAltaForm] = useState(DEFAULT_ALTA);
  const [guardandoAlta, setGuardandoAlta] = useState(false);

  const guardarAltaEquipo = async () => {
    if (!altaForm.idCategoriaComp || !altaForm.nombreEquipo.trim() || !altaForm.cap.nombreCompleto.trim()) {
      alert('Completa la categoría, el nombre del equipo y el nombre del capitán.'); return;
    }
    setGuardandoAlta(true);
    try {
      const payload = {
        idCategoriaComp: parseInt(altaForm.idCategoriaComp),
        nombreEquipo: altaForm.nombreEquipo,
        boxOrigen: altaForm.boxOrigen,
        metodoPago: altaForm.metodoPago,
        capitan: { ...altaForm.cap, fechaNacimiento: altaForm.cap.fechaNacimiento || '2000-01-01' },
        montoAbonado: 0, comprobanteUrl: ''
      };
      const res = await fetch(`${COMPETENCIAS_ENDPOINT}/inscripcion-manual`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        alert(`Equipo dado de alta y aprobado. Código: ${data.codigo}`);
        setMostrarAltaEquipo(false); setAltaForm(DEFAULT_ALTA); cargarRoster(true);
      } else {
        alert(data.mensaje || 'No se pudo dar de alta el equipo.');
      }
    } catch (e) { alert('Error de conexión al dar de alta el equipo.'); }
    finally { setGuardandoAlta(false); }
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

  const aprobarPago = (pago) => { setPagoAConfirmar(pago); };

  const confirmarAprobacion = async () => {
    if (!pagoAConfirmar) return;
    const id = pagoAConfirmar.idPago;
    setPagoAConfirmar(null);
    try { const res = await fetch(`${COMPETENCIAS_ENDPOINT}/pagos/${id}/aprobar`, { method: 'PUT' }); if (res.ok) cargarRoster(true); } catch (e) { alert("Error"); }
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
      <AtletifyLoader />
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

        <div className="d-flex justify-content-end mb-3">
          <button className="btn btn-success btn-sm" onClick={() => setMostrarAltaEquipo(true)}>
            <i className="fas fa-user-plus me-2"></i>Dar de alta equipo
          </button>
        </div>

        {mostrarAltaEquipo && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1060, padding: '16px' }} onClick={(e) => { if (e.target === e.currentTarget) setMostrarAltaEquipo(false); }}>
            <div style={{ background: '#fff', borderRadius: '12px', padding: '20px', maxWidth: '600px', width: '100%', maxHeight: '92vh', overflowY: 'auto', color: '#0f172a' }}>
              <h4 style={{ marginBottom: '4px', fontWeight: 700 }}><i className="fas fa-user-plus me-2" style={{ color: '#10b981' }}></i>Alta manual de equipo</h4>
              <p style={{ fontSize: '0.85rem', color: '#64748b' }}>El equipo queda <strong>aprobado al instante</strong> con el pago manual que registres. Funciona aunque las inscripciones estén cerradas.</p>
              <div className="row g-2">
                <div className="col-12 col-md-6">
                  <label className="form-label small mb-1">Categoría *</label>
                  <select className="form-select form-select-sm" value={altaForm.idCategoriaComp} onChange={e => setAltaForm({ ...altaForm, idCategoriaComp: e.target.value })}>
                    <option value="">Selecciona…</option>
                    {rosterData.map(c => <option key={c.idCategoriaComp} value={c.idCategoriaComp}>{c.categoriaNombre} (${c.costo})</option>)}
                  </select>
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label small mb-1">Nombre del equipo *</label>
                  <input className="form-control form-control-sm" value={altaForm.nombreEquipo} onChange={e => setAltaForm({ ...altaForm, nombreEquipo: e.target.value })} />
                </div>
                <div className="col-12"><hr className="my-2" /><strong style={{ fontSize: '0.9rem' }}>Datos del capitán</strong></div>
                <div className="col-12 col-md-6"><label className="form-label small mb-1">Nombre(s) *</label><input className="form-control form-control-sm" value={altaForm.cap.nombreCompleto} onChange={e => setAltaForm({ ...altaForm, cap: { ...altaForm.cap, nombreCompleto: e.target.value } })} /></div>
                <div className="col-12 col-md-6"><label className="form-label small mb-1">Apellidos</label><input className="form-control form-control-sm" value={altaForm.cap.apellidos} onChange={e => setAltaForm({ ...altaForm, cap: { ...altaForm.cap, apellidos: e.target.value } })} /></div>
                <div className="col-12 col-md-6"><label className="form-label small mb-1">Correo</label><input type="email" className="form-control form-control-sm" value={altaForm.cap.correo} onChange={e => setAltaForm({ ...altaForm, cap: { ...altaForm.cap, correo: e.target.value } })} /></div>
                <div className="col-12 col-md-6"><label className="form-label small mb-1">Teléfono</label><input className="form-control form-control-sm" value={altaForm.cap.telefono} onChange={e => setAltaForm({ ...altaForm, cap: { ...altaForm.cap, telefono: e.target.value } })} /></div>
                <div className="col-6 col-md-4"><label className="form-label small mb-1">Género</label><select className="form-select form-select-sm" value={altaForm.cap.genero} onChange={e => setAltaForm({ ...altaForm, cap: { ...altaForm.cap, genero: e.target.value } })}><option>Masculino</option><option>Femenino</option></select></div>
                <div className="col-6 col-md-4"><label className="form-label small mb-1">Nivel</label><select className="form-select form-select-sm" value={altaForm.cap.nivelHabilidad} onChange={e => setAltaForm({ ...altaForm, cap: { ...altaForm.cap, nivelHabilidad: e.target.value } })}><option>Novato</option><option>Principiante</option><option>Intermedio</option><option>Avanzado</option><option>Master</option></select></div>
                <div className="col-12 col-md-4"><label className="form-label small mb-1">Fecha de nacimiento</label><input type="date" className="form-control form-control-sm" value={altaForm.cap.fechaNacimiento} onChange={e => setAltaForm({ ...altaForm, cap: { ...altaForm.cap, fechaNacimiento: e.target.value } })} /></div>
                <div className="col-6 col-md-4"><label className="form-label small mb-1">Talla</label><select className="form-select form-select-sm" value={altaForm.cap.tallaPlayera} onChange={e => setAltaForm({ ...altaForm, cap: { ...altaForm.cap, tallaPlayera: e.target.value } })}><option>XS</option><option>S</option><option>M</option><option>L</option><option>XL</option><option>XXL</option></select></div>
                <div className="col-6 col-md-4"><label className="form-label small mb-1">T. Sangre</label><select className="form-select form-select-sm" value={altaForm.cap.tipoSangre} onChange={e => setAltaForm({ ...altaForm, cap: { ...altaForm.cap, tipoSangre: e.target.value } })}><option>O+</option><option>O-</option><option>A+</option><option>A-</option><option>B+</option><option>B-</option><option>AB+</option><option>AB-</option></select></div>
                <div className="col-12 col-md-4"><label className="form-label small mb-1">Método de pago *</label><select className="form-select form-select-sm" value={altaForm.metodoPago} onChange={e => setAltaForm({ ...altaForm, metodoPago: e.target.value })}><option>Efectivo</option><option>Transferencia</option></select></div>
              </div>
              <div className="d-flex justify-content-end gap-2 mt-3">
                <button className="btn btn-outline-secondary btn-sm" onClick={() => setMostrarAltaEquipo(false)} disabled={guardandoAlta}>Cancelar</button>
                <button className="btn btn-success btn-sm" onClick={guardarAltaEquipo} disabled={guardandoAlta}>{guardandoAlta ? 'Guardando…' : 'Dar de alta y aprobar'}</button>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════
            DASHBOARD FINANCIERO
        ══════════════════════════════════ */}
        <div className="row g-3 mb-4">
          <div className="col-6 col-sm-6 col-md-3">
            <div className="arf-stat-card">
              <p className="arf-stat-label">Total Recaudado</p>
              <p className="arf-stat-value arf-stat-value--success">${stats.totalRecaudado.toFixed(2)}</p>
            </div>
          </div>
          <div className="col-12 col-sm-6 col-md-3">
            <div className="arf-desglose-card">
              <div className="arf-desglose-row">
                <i className="fas fa-money-bill-wave" style={{ color: 'var(--success)' }}></i>
                <span className="arf-desglose-nombre">Efectivo</span>
                <span className="arf-desglose-monto">${stats.totalEfectivo.toFixed(2)}</span>
              </div>
              <div className="arf-desglose-row">
                <i className="fas fa-university" style={{ color: 'var(--accent-cool)' }}></i>
                <span className="arf-desglose-nombre">Transf.</span>
                <span className="arf-desglose-monto">${stats.totalTransferencia.toFixed(2)}</span>
              </div>
              <div className="arf-desglose-row">
                <i className="fas fa-credit-card" style={{ color: 'var(--accent)' }}></i>
                <span className="arf-desglose-nombre">Terminal</span>
                <span className="arf-desglose-monto">${stats.totalTarjeta.toFixed(2)}</span>
              </div>
            </div>
          </div>
          <div className="col-6 col-sm-6 col-md-3">
            <div className="arf-stat-card" style={{ borderColor: 'rgba(46,204,113,0.2)' }}>
              <p className="arf-stat-label">Equipos Pagados</p>
              <p className="arf-stat-value arf-stat-value--success">{stats.equiposPagados}</p>
            </div>
          </div>
          <div className="col-6 col-sm-6 col-md-3">
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
              (eq.nombre || '').toLowerCase().includes(busqueda.toLowerCase()) ||
              (eq.atletas || []).some(a => (a.nombreCompleto || '').toLowerCase().includes(busqueda.toLowerCase()));
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
                            <div className="min-w-0" style={{ flex: '1 1 0', minWidth: 0 }}>
                              <p className="arf-equipo-nombre">{eq.nombre}</p>
                              <div className="d-flex flex-wrap align-items-center gap-2 mt-1">
                                <p className="arf-equipo-codigo mb-0">
                                  <i className="fas fa-key me-1"></i>{eq.codigoInvitacion}
                                </p>
                                {eq.fechaCreacion && (
                                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                                    <i className="fas fa-calendar-alt me-1"></i>
                                    {new Date(eq.fechaCreacion).toLocaleDateString('es-MX')}
                                  </span>
                                )}
                              </div>
                              {eq.estatusPago === 'Aprobado' && (
                                <div className="d-flex flex-wrap align-items-center gap-2 mt-2">
                                  <span className="arf-badge-aprobado">
                                    <i className="fas fa-check-double"></i> Oficial
                                  </span>
                                  {eq.fechaAprobacion && (
                                    <span style={{ fontSize: '0.72rem', color: 'var(--success)', whiteSpace: 'nowrap' }}>
                                      <i className="fas fa-calendar-check me-1"></i>
                                      {new Date(eq.fechaAprobacion).toLocaleDateString('es-MX')}
                                    </span>
                                  )}
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
                                          style={{ color: atl.genero === 'Femenino' ? '#ff7fa8' : 'var(--accent-cool)', width: '12px', flexShrink: 0 }}
                                        ></i>
                                        <div className="arf-atleta-info-text">
                                          <span className="arf-atleta-nombre-text">{atl.nombreCompleto} {atl.apellidos}</span>
                                          {atl.fechaRegistro && (
                                            <span className="arf-atleta-fecha-text">
                                              <i className="fas fa-clock me-1"></i>Se unió: {new Date(atl.fechaRegistro).toLocaleDateString('es-MX')}
                                            </span>
                                          )}
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
                                      <button onClick={() => aprobarPago(p)} className="arf-btn-aprobar-pago">
                                        <i className="fas fa-check"></i> Aprobar
                                      </button>
                                    </div>
                                  </div>
                                ))}

                                {/* Pagos aprobados */}
                                {(eq.pagos || []).map(p => p.estatus === 'Aprobado' && (
                                  <div key={p.idPago} className="mt-2 p-2 rounded" style={{ backgroundColor: 'rgba(46, 204, 113, 0.1)', border: '1px solid rgba(46, 204, 113, 0.3)', minWidth: 0 }}>
                                    <div className="d-flex justify-content-between align-items-center gap-2" style={{ minWidth: 0 }}>
                                      <span className="text-success small fw-bold flex-shrink-0"><i className="fas fa-check-circle me-1"></i>${p.montoAbonado}</span>
                                      <span className="text-secondary text-truncate" style={{ fontSize: '0.7rem' }}>{p.metodoPago}</span>
                                    </div>
                                    <span className="d-block text-secondary mt-1 text-truncate" style={{ fontSize: '0.75rem' }}>
                                      <i className="fas fa-user-circle me-1"></i>{p.nombrePagador}
                                    </span>
                                    {p.fechaAprobacionPago && (
                                      <span className="d-block text-success mt-1" style={{ fontSize: '0.7rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        <i className="fas fa-calendar-check me-1"></i>
                                        {new Date(p.fechaAprobacionPago).toLocaleDateString('es-MX')} {new Date(p.fechaAprobacionPago).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                                      </span>
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
                                  {/* Modelo sin abonos: el pago es por el TOTAL. Para cobrar/aprobar en
                                      recepción, el admin aprueba el pago pendiente del equipo (botón Aprobar
                                      en la lista de pagos) — eso deja el equipo "Aprobado" y envía el token. */}
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
        let edad = 'N/A';
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

        const nivelColor = (s) => {
          const l = (s || '').toLowerCase();
          if (l.includes('master')) return 'var(--accent)';
          if (l.includes('avanzado') || l.includes('rx')) return 'var(--primary)';
          if (l.includes('intermedio')) return '#4FC3F7';
          if (l.includes('principiante')) return 'var(--success)';
          return 'var(--secondary)';
        };

        let escalo = false;
        let catNivelStr = '';
        if (!atletaDetalle.esEquipo && atletaDetalle.reqCategoria) {
          const c = atletaDetalle.reqCategoria;
          const athLvl = getLvlVal(atletaDetalle.nivelHabilidad);
          let catLvl = 0;
          if (c.cupoMaster > 0) { catLvl = 4; catNivelStr = 'Master'; }
          else if (c.cupoAvanzado > 0) { catLvl = 3; catNivelStr = 'Avanzado/RX'; }
          else if (c.cupoIntermedio > 0) { catLvl = 2; catNivelStr = 'Intermedio'; }
          else if (c.cupoPrincipiante > 0) { catLvl = 1; catNivelStr = 'Principiante'; }
          else { catNivelStr = 'Novato'; }
          if (athLvl < catLvl) escalo = true;
        }

        const esMasc = atletaDetalle.genero === 'Hombre' || atletaDetalle.genero === 'Masculino';
        const sexColor = esMasc ? '#4FC3F7' : '#ff7fa8';
        const nivelC = nivelColor(atletaDetalle.nivelHabilidad);

        return (
          <div className="arf-modal-overlay">
            <div className="arf-modal-panel" style={{ maxWidth: '480px', padding: 0 }}>

              {/* Header */}
              <div style={{ padding: '1.1rem 1.4rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
                <div>
                  <p style={{ fontFamily: 'var(--font-heading-alt)', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, color: 'var(--accent-cool)', margin: '0 0 0.15rem' }}>Expediente</p>
                  <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-primary)', margin: 0 }}>Atleta</h2>
                </div>
                <button className="arf-modal-close" onClick={() => setMostrarDetallesAtleta(false)} aria-label="Cerrar">
                  <i className="fas fa-times" />
                </button>
              </div>

              {/* Identity */}
              <div style={{ padding: '1.4rem 1.4rem 0', textAlign: 'center' }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: `color-mix(in srgb, ${sexColor} 12%, var(--bg-card))`, border: `2px solid ${sexColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.85rem' }}>
                  <i className={`fas ${esMasc ? 'fa-male' : 'fa-female'}`} style={{ fontSize: '1.6rem', color: sexColor }} />
                </div>
                <h4 style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-primary)', fontSize: '1.05rem', marginBottom: '0.2rem' }}>
                  {atletaDetalle.nombreCompleto} {atletaDetalle.apellidos}
                </h4>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', margin: '0 0 0.75rem' }}>
                  {atletaDetalle.correo || 'Sin correo registrado'}
                </p>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontFamily: 'var(--font-heading-alt)', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, background: `color-mix(in srgb, ${nivelC} 10%, transparent)`, border: `1px solid color-mix(in srgb, ${nivelC} 35%, transparent)`, color: nivelC, borderRadius: 20, padding: '0.2rem 0.75rem', marginBottom: '0.25rem' }}>
                  <i className="fas fa-layer-group" style={{ fontSize: '0.6rem' }} />
                  {atletaDetalle.nivelHabilidad}
                </span>
              </div>

              <hr style={{ margin: '1rem 1.4rem', borderColor: 'var(--border)' }} />

              {/* Info grid */}
              <div style={{ padding: '0 1.4rem' }}>
                <p className="arf-modal-section-titulo"><i className="fas fa-user-circle" />Datos Personales</p>
                <div className="row g-2 mb-3">
                  {[
                    { label: 'Edad',           value: `${edad} años`,                      icon: 'fa-birthday-cake', color: 'var(--text-muted)' },
                    { label: 'Género',         value: atletaDetalle.genero || 'N/A',        icon: esMasc ? 'fa-mars' : 'fa-venus', color: sexColor },
                    { label: 'Tipo de Sangre', value: atletaDetalle.tipoSangre || 'N/A',    icon: 'fa-tint',          color: 'var(--primary)' },
                    { label: 'Talla Playera',  value: atletaDetalle.tallaPlayera || 'N/A',  icon: 'fa-tshirt',        color: 'var(--text-muted)' },
                  ].map(item => (
                    <div key={item.label} className="col-6">
                      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '0.65rem 0.85rem' }}>
                        <small style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--text-muted)', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: '0.25rem' }}>
                          <i className={`fas ${item.icon}`} style={{ color: item.color }} />{item.label}
                        </small>
                        <span style={{ fontFamily: 'var(--font-heading-alt)', fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }}>{item.value}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {!atletaDetalle.esEquipo && (
                  <>
                    <hr style={{ margin: '0 0 1rem', borderColor: 'var(--border)' }} />
                    <p className="arf-modal-section-titulo"><i className="fas fa-dollar-sign" />Financiero</p>
                    <div style={{ background: 'rgba(46,204,113,0.07)', border: '1px solid rgba(46,204,113,0.22)', borderRadius: 10, padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                      <span style={{ fontFamily: 'var(--font-heading-alt)', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--success)' }}>
                        Costo de Inscripción
                      </span>
                      <span style={{ fontFamily: 'var(--font-stats)', fontSize: '1.25rem', fontWeight: 700, color: 'var(--success)' }}>${atletaDetalle.costoCategoria} MXN</span>
                    </div>
                    {escalo && (
                      <div style={{ background: 'rgba(245,166,35,0.07)', border: '1px solid rgba(245,166,35,0.28)', borderRadius: 10, padding: '0.7rem 0.9rem', marginBottom: '0.6rem', display: 'flex', gap: '0.6rem', alignItems: 'flex-start' }}>
                        <i className="fas fa-exclamation-triangle" style={{ color: 'var(--accent)', flexShrink: 0, marginTop: '0.1rem' }} />
                        <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--accent)', lineHeight: 1.45 }}>
                          <strong>Escaló de Categoría:</strong> Su nivel real es <strong>{atletaDetalle.nivelHabilidad}</strong> pero asumió el riesgo para competir en <strong>{catNivelStr}</strong>.
                        </p>
                      </div>
                    )}
                  </>
                )}

                <hr style={{ margin: '0 0 1rem', borderColor: 'var(--border)' }} />
                <p className="arf-modal-section-titulo"><i className="fas fa-file-signature" />Carta Responsiva</p>
                {atletaDetalle.aceptoCartaResponsiva ? (
                  <div style={{ background: 'rgba(46,204,113,0.07)', border: '1px solid rgba(46,204,113,0.22)', borderRadius: 10, padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                    <i className="fas fa-check-circle" style={{ color: 'var(--success)', fontSize: '1.3rem', flexShrink: 0 }} />
                    <div>
                      <p style={{ margin: 0, fontFamily: 'var(--font-heading-alt)', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--success)' }}>Aceptada</p>
                      <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-muted)' }}>{atletaDetalle.fechaAceptacionCartaResponsiva ? new Date(atletaDetalle.fechaAceptacionCartaResponsiva).toLocaleDateString() : 'N/A'}</p>
                    </div>
                  </div>
                ) : (
                  <div style={{ background: 'rgba(230,57,70,0.07)', border: '1px solid rgba(230,57,70,0.22)', borderRadius: 10, padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                    <i className="fas fa-times-circle" style={{ color: 'var(--primary)', fontSize: '1.3rem', flexShrink: 0 }} />
                    <p style={{ margin: 0, fontFamily: 'var(--font-heading-alt)', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--primary)' }}>Pendiente de aceptar</p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div style={{ padding: '0.9rem 1.4rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
                <button className="arf-btn-accion" onClick={() => setMostrarDetallesAtleta(false)} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-muted)', borderRadius: 8, padding: '0.45rem 1.1rem', fontSize: '0.82rem', cursor: 'pointer' }}>
                  Cerrar
                </button>
              </div>

            </div>
          </div>
        );
      })()}

      {/* === MODAL CONFIRMAR APROBACIÓN DE PAGO === */}
      {pagoAConfirmar && (
        <div className="arf-modal-overlay">
          <div className="arf-modal-panel" style={{ maxWidth: 420, padding: 0 }}>

            <div style={{ padding: '1.1rem 1.4rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
              <div>
                <p style={{ fontFamily: 'var(--font-heading-alt)', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, color: 'var(--success)', margin: '0 0 0.15rem' }}>Pago</p>
                <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-primary)', margin: 0 }}>Confirmar Aprobación</h2>
              </div>
              <button className="arf-modal-close" onClick={() => setPagoAConfirmar(null)} aria-label="Cerrar">
                <i className="fas fa-times" />
              </button>
            </div>

            <div style={{ padding: '1.4rem' }}>
              <div style={{ background: 'rgba(46,204,113,0.07)', border: '1px solid rgba(46,204,113,0.25)', borderRadius: 12, padding: '1rem 1.1rem', marginBottom: '1.1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontFamily: 'var(--font-heading-alt)', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text-muted)' }}>
                    <i className="fas fa-money-bill-wave me-1" />Monto a aprobar
                  </span>
                  <span style={{ fontFamily: 'var(--font-stats)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--success)' }}>
                    ${pagoAConfirmar.montoAbonado}
                  </span>
                </div>
                {pagoAConfirmar.nombrePagador && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                    <i className="fas fa-user-circle" />
                    <span>{pagoAConfirmar.nombrePagador}</span>
                  </div>
                )}
              </div>

              <div style={{ background: 'rgba(245,166,35,0.07)', border: '1px solid rgba(245,166,35,0.25)', borderRadius: 10, padding: '0.75rem 1rem', display: 'flex', gap: '0.55rem', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                <i className="fas fa-info-circle" style={{ color: 'var(--accent)', flexShrink: 0, marginTop: '0.1rem', fontSize: '0.85rem' }} />
                <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--accent)', lineHeight: 1.5 }}>
                  Al aprobar, este monto se sumará al total recaudado del equipo. Esta acción no se puede deshacer.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '0.65rem', justifyContent: 'flex-end' }}>
                <button onClick={() => setPagoAConfirmar(null)}
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-muted)', borderRadius: 8, padding: '0.5rem 1.1rem', fontSize: '0.82rem', cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 600 }}>
                  Cancelar
                </button>
                <button onClick={confirmarAprobacion}
                  style={{ background: 'rgba(46,204,113,0.15)', border: '1px solid rgba(46,204,113,0.45)', color: 'var(--success)', borderRadius: 8, padding: '0.5rem 1.25rem', fontSize: '0.82rem', cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <i className="fas fa-check-circle" />Aprobar
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
