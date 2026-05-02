import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { COMPETENCIAS_ENDPOINT } from '../services/api';
import BackButton from '../components/BackButton';
import EstatusPickerModal from '../components/EstatusPickerModal';
import FormatoCategoriaPicker from '../components/FormatoCategoriaPicker';
import BotonSeguro from '../components/BotonSeguro';
import '../assets/css/AdminCompetencias.css';

export default function AdminCompetenciasHistorial() {
  const navigate = useNavigate();
  const [box, setBox] = useState(null);
  const [competencias, setCompetencias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState(false);

  const [compSeleccionada, setCompSeleccionada] = useState(null);

  const [formCat, setFormCat] = useState({
    nombre: '', esEquipo: false, cantidadIntegrantes: 1, cupoMaximo: 10, costo: '',
    cupoHombres: 0, cupoMujeres: 0,
    cupoAvanzado: 0, cupoIntermedio: 0, cupoPrincipiante: 0, cupoNovato: 0
  });
  const [editandoCat, setEditandoCat] = useState(null);
  const [filtroEstatus, setFiltroEstatus] = useState('Todos');

  const [vistaActual, setVistaActual] = useState('lista');
  const [rosterData, setRosterData] = useState([]);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [compRosterActiva, setCompRosterActiva] = useState(null);

  useEffect(() => {
    const b = JSON.parse(localStorage.getItem('box'));
    const u = JSON.parse(localStorage.getItem('usuario'));
    if (!b || (u?.rol !== 'AdminBox' && u?.rol !== 'Developer')) { navigate('/login'); return; }
    setBox(b); cargarCompetencias(b.idBox);
  }, [navigate]);

  const cargarCompetencias = async (idBox) => {
    try {
      const res = await fetch(`${COMPETENCIAS_ENDPOINT}/box/${idBox}`, { cache: 'no-store' });
      setCompetencias(await res.json());
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const guardarCategoria = async (e) => {
    e.preventDefault(); setProcesando(true);
    const url = editandoCat ? `${COMPETENCIAS_ENDPOINT}/categorias/${editandoCat}` : `${COMPETENCIAS_ENDPOINT}/${compSeleccionada.idCompetencia || compSeleccionada.IdCompetencia}/categorias`;
    const metodo = editandoCat ? 'PUT' : 'POST';

    const payload = {
      ...formCat,
      costo: parseFloat(formCat.costo) || 0,
      cantidadIntegrantes: parseInt(formCat.cantidadIntegrantes) || 1,
      cupoMaximo: parseInt(formCat.cupoMaximo) || 10,
      cupoHombres: parseInt(formCat.cupoHombres) || 0,
      cupoMujeres: parseInt(formCat.cupoMujeres) || 0,
      cupoAvanzado: parseInt(formCat.cupoAvanzado) || 0,
      cupoIntermedio: parseInt(formCat.cupoIntermedio) || 0,
      cupoPrincipiante: parseInt(formCat.cupoPrincipiante) || 0,
      cupoNovato: parseInt(formCat.cupoNovato) || 0
    };

    try {
      const res = await fetch(url, {
        method: metodo, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      if (res.ok) {
        cancelarEdicionCategoria();
        cargarCompetencias(box.idBox || box.IdBox);
      } else { const errData = await res.json(); alert(`Error: ${errData.mensaje}`); }
    } catch (err) { alert('Error de conexión.'); } finally { setProcesando(false); }
  };

  const eliminarCategoria = async (idCategoria) => {
    if (!await window.wpConfirm('¿Seguro? Si ya hay equipos inscritos, el sistema no te dejará borrarla.')) return;
    try {
      const res = await fetch(`${COMPETENCIAS_ENDPOINT}/categorias/${idCategoria}`, { method: 'DELETE' });
      if (res.ok) cargarCompetencias(box.idBox || box.IdBox);
      else { const errData = await res.json(); alert(errData.mensaje); }
    } catch (err) { alert('Error de conexión.'); }
  };

  const iniciarEdicionCategoria = (comp, cat) => {
    setCompSeleccionada(comp);
    setEditandoCat(cat.idCategoriaComp || cat.IdCategoriaComp);
    setFormCat({
      nombre: cat.nombre || cat.Nombre, esEquipo: cat.esEquipo || cat.EsEquipo,
      cantidadIntegrantes: cat.cantidadIntegrantes || cat.CantidadIntegrantes, cupoMaximo: cat.cupoMaximo || cat.CupoMaximo,
      costo: cat.costo || cat.Costo || '',
      cupoHombres: cat.cupoHombres || cat.CupoHombres || 0,
      cupoMujeres: cat.cupoMujeres || cat.CupoMujeres || 0,
      cupoAvanzado: cat.cupoAvanzado || cat.CupoAvanzado || 0,
      cupoIntermedio: cat.cupoIntermedio || cat.CupoIntermedio || 0,
      cupoPrincipiante: cat.cupoPrincipiante || cat.CupoPrincipiante || 0,
      cupoNovato: cat.cupoNovato || cat.CupoNovato || 0
    });
  };

  const cancelarEdicionCategoria = () => {
    setCompSeleccionada(null); setEditandoCat(null);
    setFormCat({
      nombre: '', esEquipo: false, cantidadIntegrantes: 1, cupoMaximo: 10, costo: '',
      cupoHombres: 0, cupoMujeres: 0, cupoAvanzado: 0, cupoIntermedio: 0, cupoPrincipiante: 0, cupoNovato: 0
    });
  };

  const cambiarEstatus = async (idCompetencia, nuevoEstatus) => {
    if (!await window.wpConfirm(`¿Seguro que deseas cambiar la competencia a: ${nuevoEstatus}?`)) return;
    try {
      const res = await fetch(`${COMPETENCIAS_ENDPOINT}/${idCompetencia}/estatus`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(nuevoEstatus) });
      if (res.ok) cargarCompetencias(box.idBox);
    } catch (err) { alert('Error de conexión'); }
  };

  const cargarDatosRoster = async (idComp) => {
    setLoadingRoster(true);
    try {
      const res = await fetch(`${COMPETENCIAS_ENDPOINT}/${idComp}/roster`);
      if (res.ok) setRosterData(await res.json());
    } catch (error) { alert("Error al cargar Roster"); }
    finally { setLoadingRoster(false); }
  };

  const aprobarPago = async (idPago) => {
    if (!await window.wpConfirm("¿Validar este pago? Se sumará al saldo pagado del equipo.")) return;
    try {
      const res = await fetch(`${COMPETENCIAS_ENDPOINT}/pagos/${idPago}/aprobar`, { method: 'PUT' });
      if (res.ok) {
        alert("Pago Aprobado");
        cargarDatosRoster(compRosterActiva.idCompetencia || compRosterActiva.IdCompetencia);
      }
    } catch (error) { alert("Error al aprobar"); }
  };

  const aplicarPatrocinio = async (idEquipo, restante) => {
    const montoStr = prompt(`¿Cuánto dinero deseas perdonar / patrocinar a este equipo?\nMonto restante sugerido: $${restante}`);
    if (!montoStr) return;
    const monto = parseFloat(montoStr);
    if (isNaN(monto) || monto <= 0) { alert("Monto inválido"); return; }
    try {
      const res = await fetch(`${COMPETENCIAS_ENDPOINT}/equipos/${idEquipo}/credito-admin`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ Monto: monto })
      });
      if (res.ok) {
        alert("Crédito aplicado con éxito 🎟️");
        cargarDatosRoster(compRosterActiva.idCompetencia || compRosterActiva.IdCompetencia);
      }
    } catch (error) { alert("Error al aplicar crédito"); }
  };

  const getEstatusColor = (estatus) => {
    switch (estatus) { case 'Borrador': return 'secondary'; case 'Inscripciones': return 'success'; case 'Activa': return 'danger'; case 'Finalizada': return 'info'; default: return 'secondary'; }
  };

  if (loading) return (
    <div className="d-flex align-items-center justify-content-center" style={{ minHeight: '60vh', background: 'var(--bg-base)' }}>
      <div className="spinner-wp"></div>
    </div>
  );

  // ===================================================================================
  // VISTA 2: CUARTO DE GUERRA (ROSTER Y FINANZAS)
  // ===================================================================================
  if (vistaActual === 'roster') {
    return (
      <div className="acomp-roster-container">
        <header className="acomp-roster-nav">
          <button onClick={() => setVistaActual('lista')} className="acomp-nav-back">
            <i className="fas fa-arrow-left"></i>
          </button>
          <div className="acomp-nav-icono acomp-nav-icono--gold d-none d-sm-flex">
            <i className="fas fa-users-cog"></i>
          </div>
          <div>
            <p className="acomp-nav-titulo acomp-nav-titulo--gold">Roster <span style={{ color: 'var(--accent)' }}>y Finanzas</span></p>
            <p className="acomp-nav-sub">{compRosterActiva?.nombre}</p>
          </div>
        </header>

        <div className="container-xl px-3 px-md-4 py-4">
          {loadingRoster ? (
            <div className="d-flex align-items-center justify-content-center py-5">
              <div className="spinner-wp"></div>
            </div>
          ) : rosterData.length === 0 ? (
            <div className="acomp-empty">
              <i className="fas fa-ghost"></i>
              <h5>No hay categorías creadas aún</h5>
            </div>
          ) : (
            <div className="d-flex flex-column gap-5">
              {rosterData.map(cat => (
                <div key={cat.idCategoriaComp}>
                  <div className="acomp-cat-roster-header mb-4">
                    <div className="d-flex justify-content-between align-items-start flex-wrap gap-2">
                      <div>
                        <div className="acomp-cat-roster-nombre">
                          {cat.categoriaNombre}
                          <span className="acomp-tipo-badge">{cat.esEquipo ? 'Equipo' : 'Individual'}</span>
                        </div>
                        <p className="acomp-cat-roster-costo">Costo total: <strong>${cat.costo}</strong></p>
                        <div className="acomp-receta-tags">
                          {cat.cupoHombres > 0 && <span className="acomp-receta-tag acomp-receta-tag--hombres"><i className="fas fa-male"></i> Hombres: {cat.cupoHombres}</span>}
                          {cat.cupoMujeres > 0 && <span className="acomp-receta-tag acomp-receta-tag--mujeres"><i className="fas fa-female"></i> Mujeres: {cat.cupoMujeres}</span>}
                          {cat.cupoAvanzado > 0 && <span className="acomp-receta-tag acomp-receta-tag--nivel">Avanzados: {cat.cupoAvanzado}</span>}
                          {cat.cupoIntermedio > 0 && <span className="acomp-receta-tag acomp-receta-tag--nivel">Intermedios: {cat.cupoIntermedio}</span>}
                          {cat.cupoPrincipiante > 0 && <span className="acomp-receta-tag acomp-receta-tag--nivel">Principiantes: {cat.cupoPrincipiante}</span>}
                          {cat.cupoNovato > 0 && <span className="acomp-receta-tag acomp-receta-tag--nivel">Novatos: {cat.cupoNovato}</span>}
                        </div>
                      </div>
                      <span className="acomp-cat-equipos-count"><i className="fas fa-users me-1"></i>{cat.equipos.length} Equipos</span>
                    </div>
                  </div>

                  {cat.equipos.length === 0 ? (
                    <div className="acomp-cat-empty"><i className="fas fa-user-slash"></i><p>Sin inscritos en esta categoría.</p></div>
                  ) : (
                    <div className="row g-4">
                      {cat.equipos.map(eq => {
                        const totalPagado = eq.pagos.filter(p => p.estatus === "Aprobado").reduce((sum, p) => sum + p.montoAbonado, 0);
                        const restante = Math.max(0, cat.costo - totalPagado);
                        const estaPagado = restante === 0;
                        return (
                          <div key={eq.idEquipoComp} className="col-12 col-xl-6">
                            <div className="acomp-equipo-card">
                              <div className={`acomp-equipo-header ${estaPagado ? 'acomp-equipo-header--pagado' : 'acomp-equipo-header--deuda'}`}>
                                <div>
                                  <p className="acomp-equipo-nombre">{eq.nombre}</p>
                                  <p className="acomp-equipo-codigo"><i className="fas fa-key"></i> {eq.codigoInvitacion}</p>
                                </div>
                                <span className={`badge rounded-pill ${estaPagado ? 'bg-success' : 'bg-danger'}`}>
                                  {estaPagado ? <><i className="fas fa-check-circle me-1"></i>PAGADO</> : <><i className="fas fa-exclamation-circle me-1"></i>DEUDA</>}
                                </span>
                              </div>
                              <div className="p-3 d-flex flex-column gap-3">
                                <div>
                                  <p className="acomp-label mb-2"><i className="fas fa-users me-1"></i>Roster ({eq.atletas.length}/{cat.cantidadIntegrantes})</p>
                                  <div className="acomp-cat-forma p-0">
                                    {eq.atletas.length === 0 ? <p className="text-muted small text-center py-3 mb-0">Sin atletas registrados.</p> : (
                                      <ul className="list-unstyled mb-0">
                                        {eq.atletas.map(atl => (
                                          <li key={atl.idAtletaComp} className="d-flex justify-content-between align-items-center px-2 py-2 border-bottom" style={{ borderColor: 'var(--border)' }}>
                                            <div className="d-flex align-items-center gap-2">
                                              <i className={`fas ${atl.genero === 'Hombre' || atl.genero === 'Masculino' ? 'fa-male text-info' : 'fa-female'}`} style={{ color: atl.genero === 'Hombre' || atl.genero === 'Masculino' ? '' : '#ff7fa8' }}></i>
                                              <span className="small fw-semibold" style={{ color: 'var(--text-primary)' }}>{atl.nombreCompleto}</span>
                                            </div>
                                            <div className="d-flex gap-2 align-items-center">
                                              <span className="acomp-tipo-badge">{atl.nivelHabilidad}</span>
                                              <a href={`https://wa.me/${atl.telefono}`} target="_blank" rel="noreferrer" style={{ color: '#25d366' }}><i className="fab fa-whatsapp"></i></a>
                                            </div>
                                          </li>
                                        ))}
                                      </ul>
                                    )}
                                  </div>
                                </div>

                                <div>
                                  <p className="acomp-label mb-2"><i className="fas fa-file-invoice-dollar me-1"></i>Estado de Cuenta</p>
                                  <div className="row g-2 text-center mb-3">
                                    <div className="col-4">
                                      <div className="p-2 rounded-3 border" style={{ background: 'rgba(0,0,0,0.2)', borderColor: 'var(--border)' }}>
                                        <div style={{ fontSize: '10px', color: 'var(--secondary)' }}>TOTAL</div>
                                        <div className="fw-bold" style={{ fontFamily: 'var(--font-stats)', color: 'var(--text-primary)' }}>${cat.costo}</div>
                                      </div>
                                    </div>
                                    <div className="col-4">
                                      <div className="p-2 rounded-3 border" style={{ background: 'rgba(46,204,113,0.1)', borderColor: 'rgba(46,204,113,0.3)' }}>
                                        <div style={{ fontSize: '10px', color: 'var(--success)' }}>PAGADO</div>
                                        <div className="fw-bold" style={{ fontFamily: 'var(--font-stats)', color: 'var(--success)' }}>${totalPagado}</div>
                                      </div>
                                    </div>
                                    <div className="col-4">
                                      <div className="p-2 rounded-3 border" style={{ background: restante > 0 ? 'rgba(230,57,70,0.1)' : 'rgba(0,0,0,0.2)', borderColor: restante > 0 ? 'rgba(230,57,70,0.3)' : 'var(--border)' }}>
                                        <div style={{ fontSize: '10px', color: restante > 0 ? 'var(--primary)' : 'var(--secondary)' }}>RESTA</div>
                                        <div className="fw-bold" style={{ fontFamily: 'var(--font-stats)', color: restante > 0 ? 'var(--primary)' : 'var(--text-primary)' }}>${restante}</div>
                                      </div>
                                    </div>
                                  </div>

                                  {eq.pagos.length > 0 && (
                                    <div className="d-flex flex-column gap-2 mb-3">
                                      {eq.pagos.map(pago => (
                                        <div key={pago.idPago} className="d-flex justify-content-between align-items-center p-2 rounded-3 border" style={{ background: 'rgba(0,0,0,0.2)', borderColor: 'var(--border)' }}>
                                          <div className="d-flex align-items-center gap-2">
                                            {pago.estatus === 'Aprobado' ? <i className="fas fa-check-circle text-success"></i> : <i className="fas fa-clock" style={{ color: 'var(--accent)' }}></i>}
                                            <div>
                                              <div className="small fw-semibold" style={{ color: 'var(--text-primary)' }}>${pago.montoAbonado} <span style={{ color: 'var(--secondary)', fontWeight: 400 }}>({pago.metodoPago})</span></div>
                                              <div style={{ fontSize: '9px', color: 'var(--secondary)' }}>{new Date(pago.fechaPago).toLocaleDateString()} — {pago.nombrePagador}</div>
                                            </div>
                                          </div>
                                          <div className="d-flex gap-1 align-items-center">
                                            {pago.comprobanteUrl && pago.comprobanteUrl.includes('uploads') && (
                                              <a href={`https://localhost:7149${pago.comprobanteUrl}`} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline-info rounded-circle p-1" style={{ width: '28px', height: '28px' }} title="Ver comprobante"><i className="fas fa-image"></i></a>
                                            )}
                                            {pago.estatus === 'PendienteVerificacion' && (
                                              <BotonSeguro onClick={() => aprobarPago(pago.idPago)} className="btn btn-sm btn-success rounded-circle p-1" style={{ width: '28px', height: '28px' }} title="Aprobar" textoProcesando="">
                                                <i className="fas fa-check"></i>
                                              </BotonSeguro>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  {!estaPagado && (
                                    <BotonSeguro onClick={() => aplicarPatrocinio(eq.idEquipoComp, restante)} className="acomp-btn-roster w-100" textoProcesando="Aplicando...">
                                      <i className="fas fa-hand-holding-usd"></i> Patrocinio / Crédito
                                    </BotonSeguro>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ===================================================================================
  // VISTA 1: LISTA DE COMPETENCIAS ARCHIVADAS
  // ===================================================================================
  const compsArchivadas = competencias.filter(c => {
    const esArchivo = c.estatus === 'Archivada' || c.estatus === 'Historial';
    if (!esArchivo) return false;
    if (filtroEstatus === 'Todos') return true;
    return c.estatus === filtroEstatus;
  });

  return (
    <div className="acomp-container">

      {/* ── HEADER ── */}
      <header className="acomp-nav" style={{ marginBottom: '2rem' }}>
        <div className="acomp-nav-left">
          <BackButton to="/admin-competencias" />
          <div className="acomp-nav-icono d-none d-sm-flex" style={{ color: 'var(--secondary)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <i className="fas fa-archive"></i>
          </div>
          <p className="acomp-nav-titulo">Historial <span>Competencias</span></p>
        </div>
      </header>

      <div className="container-xl px-3 px-md-4 pb-5">
        
        {/* Filtros */}
        <div className="d-flex gap-2 mb-4">
          <button 
            className={`btn btn-sm ${filtroEstatus === 'Todos' ? 'btn-danger text-white' : 'btn-outline-secondary'}`} 
            style={{ borderRadius: '20px', padding: '0.25rem 1rem' }}
            onClick={() => setFiltroEstatus('Todos')}
          >
            Todos
          </button>
          <button 
            className={`btn btn-sm ${filtroEstatus === 'Historial' ? 'btn-danger text-white' : 'btn-outline-secondary'}`} 
            style={{ borderRadius: '20px', padding: '0.25rem 1rem' }}
            onClick={() => setFiltroEstatus('Historial')}
          >
            <i className="fas fa-history me-1"></i>Historial
          </button>
          <button 
            className={`btn btn-sm ${filtroEstatus === 'Archivada' ? 'btn-danger text-white' : 'btn-outline-secondary'}`} 
            style={{ borderRadius: '20px', padding: '0.25rem 1rem' }}
            onClick={() => setFiltroEstatus('Archivada')}
          >
            <i className="fas fa-archive me-1"></i>Archivado
          </button>
        </div>

        {/* ── LISTA ── */}
        {compsArchivadas.length === 0 ? (
          <div className="acomp-empty">
            <i className="fas fa-archive"></i>
            <h5>No hay competencias en el historial</h5>
          </div>
        ) : (
          <div className="row g-4">
            {compsArchivadas.map(comp => (
              <div key={comp.idCompetencia} className="col-12 col-xl-6">
                <div className={`acomp-comp-card acomp-comp-card--${getEstatusColor(comp.estatus)}`}>

                  {/* Header tarjeta */}
                  <div className="acomp-comp-header">
                    <div className="min-w-0">
                      <Link
                        to={`/admin-competencias/panel/${comp.idCompetencia || comp.IdCompetencia}`}
                        className="acomp-comp-nombre"
                      >
                        {comp.nombre} <i className="fas fa-external-link-alt"></i>
                      </Link>
                      <p className="acomp-comp-fechas">
                        <i className="fas fa-calendar me-1"></i>
                        {new Date(comp.fechaInicio).toLocaleDateString()} — {new Date(comp.fechaFin).toLocaleDateString()}
                      </p>
                    </div>
                    <EstatusPickerModal
                      estatus={comp.estatus}
                      onCambiar={(nuevoEstatus) => cambiarEstatus(comp.idCompetencia || comp.IdCompetencia, nuevoEstatus)}
                    />
                  </div>

                  {/* Franja roster */}
                  <div className="acomp-roster-strip">
                    <Link
                      to={`/admin-competencias/roster/${comp.idCompetencia || comp.IdCompetencia}`}
                      className="acomp-btn-roster text-decoration-none"
                    >
                      <i className="fas fa-external-link-alt"></i> Cobranza y Roster
                    </Link>
                  </div>

                  {/* Sección categorías */}
                  <div className="acomp-cat-section">
                    <div className="acomp-cat-toolbar">
                      <span className="acomp-cat-toolbar-titulo"><i className="fas fa-list-ul me-1"></i>Categorías</span>
                      <button className="acomp-btn-add-cat" onClick={() => setCompSeleccionada(comp)}>
                        <i className="fas fa-plus"></i> Agregar
                      </button>
                    </div>

                    {/* Form inline categoría */}
                    {compSeleccionada?.idCompetencia === comp.idCompetencia && (
                      <div className="acomp-cat-form">
                        <p className="acomp-cat-form-titulo">
                          <i className={`fas ${editandoCat ? 'fa-edit' : 'fa-plus'}`}></i>
                          {editandoCat ? 'Editar' : 'Nueva'} Categoría
                        </p>
                        <form onSubmit={guardarCategoria}>
                          <div className="row g-2 mb-2">
                            <div className="col-12 col-sm-8">
                              <label className="acomp-label">Nombre</label>
                              <input
                                type="text"
                                className="acomp-input"
                                placeholder="Ej. RX Equipo Mixto"
                                required
                                value={formCat.nombre}
                                onChange={e => setFormCat({ ...formCat, nombre: e.target.value })}
                              />
                            </div>
                            <div className="col-12 col-sm-4">
                              <label className="acomp-label">Formato</label>
                              <FormatoCategoriaPicker
                                value={formCat.esEquipo}
                                onChange={esEquipo => setFormCat({
                                  ...formCat,
                                  esEquipo,
                                  cantidadIntegrantes: esEquipo ? (formCat.cantidadIntegrantes < 2 ? 2 : formCat.cantidadIntegrantes) : 1
                                })}
                              />
                            </div>
                            <div className="col-6 col-sm-4">
                              <label className="acomp-label">Costo $</label>
                              <input
                                type="number"
                                className="acomp-input"
                                placeholder="0.00"
                                required
                                value={formCat.costo}
                                onChange={e => setFormCat({ ...formCat, costo: e.target.value })}
                              />
                            </div>
                            <div className="col-6 col-sm-4">
                              <label className="acomp-label">Integrantes</label>
                              <input
                                type="number"
                                min={formCat.esEquipo ? 2 : 1}
                                max={formCat.esEquipo ? undefined : 1}
                                className="acomp-input"
                                required
                                disabled={!formCat.esEquipo}
                                value={formCat.cantidadIntegrantes}
                                onChange={e => {
                                  const val = Number(e.target.value);
                                  if (formCat.esEquipo && val >= 2) setFormCat({ ...formCat, cantidadIntegrantes: val });
                                }}
                              />
                            </div>
                            <div className="col-12 col-sm-4">
                              <label className="acomp-label">Cupo máx.</label>
                              <input
                                type="number"
                                min="1"
                                className="acomp-input"
                                required
                                value={formCat.cupoMaximo}
                                onChange={e => setFormCat({ ...formCat, cupoMaximo: Number(e.target.value) })}
                              />
                            </div>
                          </div>

                          {/* Receta */}
                          {(() => {
                            const integrantes = Number(formCat.cantidadIntegrantes) || 1;
                            const totalSexo  = Number(formCat.cupoHombres)   + Number(formCat.cupoMujeres);
                            const totalNivel = Number(formCat.cupoAvanzado)  + Number(formCat.cupoIntermedio)
                                             + Number(formCat.cupoPrincipiante) + Number(formCat.cupoNovato);
                            const sexoOk     = totalSexo  === integrantes;
                            const nivelOk    = totalNivel === integrantes;
                            const recetaOk   = sexoOk && nivelOk;
                            const estadoSexo  = sexoOk ? 'ok'  : totalSexo  > integrantes ? 'over' : 'pending';
                            const estadoNivel = nivelOk ? 'ok' : totalNivel > integrantes ? 'over' : 'pending';
                            return (
                              <>
                                <div className="acomp-receta-group">
                                  <p className="acomp-receta-titulo"><i className="fas fa-flask"></i> La Receta — Cupos exactos</p>
                                  <p className="acomp-receta-hint">
                                    Distribuye exactamente{' '}
                                    <strong style={{ color: 'var(--accent)', fontFamily: 'var(--font-stats)' }}>{integrantes}</strong>
                                    {' '}cupo{integrantes !== 1 ? 's' : ''} en <strong>sexo</strong> y en <strong>nivel</strong>.
                                  </p>
                                  <div className="acomp-receta-grid">
                                    <div>
                                      <label className="acomp-receta-label">Hombres</label>
                                      <input type="number" min="0" max={integrantes} className="acomp-receta-input acomp-receta-input--hombres" value={formCat.cupoHombres} onChange={e => setFormCat({ ...formCat, cupoHombres: e.target.value })} />
                                    </div>
                                    <div>
                                      <label className="acomp-receta-label">Mujeres</label>
                                      <input type="number" min="0" max={integrantes} className="acomp-receta-input acomp-receta-input--mujeres" value={formCat.cupoMujeres} onChange={e => setFormCat({ ...formCat, cupoMujeres: e.target.value })} />
                                    </div>
                                    <div>
                                      <label className="acomp-receta-label">Avanzado</label>
                                      <input type="number" min="0" max={integrantes} className="acomp-receta-input" value={formCat.cupoAvanzado} onChange={e => setFormCat({ ...formCat, cupoAvanzado: e.target.value })} />
                                    </div>
                                    <div>
                                      <label className="acomp-receta-label">Intermedio</label>
                                      <input type="number" min="0" max={integrantes} className="acomp-receta-input" value={formCat.cupoIntermedio} onChange={e => setFormCat({ ...formCat, cupoIntermedio: e.target.value })} />
                                    </div>
                                    <div>
                                      <label className="acomp-receta-label">Principian.</label>
                                      <input type="number" min="0" max={integrantes} className="acomp-receta-input" value={formCat.cupoPrincipiante} onChange={e => setFormCat({ ...formCat, cupoPrincipiante: e.target.value })} />
                                    </div>
                                    <div>
                                      <label className="acomp-receta-label">Novato</label>
                                      <input type="number" min="0" max={integrantes} className="acomp-receta-input" value={formCat.cupoNovato} onChange={e => setFormCat({ ...formCat, cupoNovato: e.target.value })} />
                                    </div>
                                  </div>
                                  <div className="acomp-receta-totales">
                                    <span className={`acomp-receta-total acomp-receta-total--${estadoSexo}`}>
                                      <i className={`fas ${sexoOk ? 'fa-check-circle' : totalSexo > integrantes ? 'fa-times-circle' : 'fa-dot-circle'}`} />
                                      Sexo {totalSexo}/{integrantes}
                                    </span>
                                    <span className={`acomp-receta-total acomp-receta-total--${estadoNivel}`}>
                                      <i className={`fas ${nivelOk ? 'fa-check-circle' : totalNivel > integrantes ? 'fa-times-circle' : 'fa-dot-circle'}`} />
                                      Nivel {totalNivel}/{integrantes}
                                    </span>
                                  </div>
                                </div>

                                <div className="d-flex justify-content-end gap-2 mt-3">
                                  <button type="button" className="acomp-btn-cancel-sm" onClick={cancelarEdicionCategoria}>Cancelar</button>
                                  <BotonSeguro type="submit" disabled={procesando || !recetaOk} className="acomp-btn-submit" textoProcesando="Guardando...">
                                    <i className="fas fa-save"></i> {editandoCat ? 'Actualizar' : 'Guardar'}
                                  </BotonSeguro>
                                </div>
                              </>
                            );
                          })()}
                        </form>
                      </div>
                    )}

                    {/* Tabla categorías */}
                    <div className="acomp-cat-tabla-wrapper">
                      {!(comp.categorias || comp.Categorias) || (comp.categorias || comp.Categorias).length === 0 ? (
                        <div className="acomp-cat-empty">
                          <i className="fas fa-list-alt"></i>
                          <p>Sin categorías definidas</p>
                        </div>
                      ) : (
                        <div className="table-responsive">
                          <table className="acomp-cat-tabla">
                            <thead>
                              <tr>
                                <th>Categoría</th>
                                <th className="text-center">$</th>
                                <th className="text-center">Cupo</th>
                                <th className="text-end pe-3"></th>
                              </tr>
                            </thead>
                            <tbody>
                              {(comp.categorias || comp.Categorias).map(cat => {
                                const idCat = cat.idCategoriaComp || cat.IdCategoriaComp;
                                return (
                                  <tr key={idCat}>
                                    <td>
                                      <div className="acomp-cat-nombre-text">{cat.nombre || cat.Nombre}</div>
                                      <div className="acomp-cat-tipo-text">
                                        {(cat.esEquipo || cat.EsEquipo) ? `Equipo · ${cat.cantidadIntegrantes || cat.CantidadIntegrantes} pers.` : 'Individual'}
                                      </div>
                                    </td>
                                    <td className="text-center"><span className="acomp-cat-costo">${cat.costo || cat.Costo}</span></td>
                                    <td className="text-center"><span className="acomp-cat-cupo">{cat.cupoMaximo || cat.CupoMaximo}</span></td>
                                    <td className="text-end pe-3">
                                      <button className="acomp-btn-tabla-edit" onClick={() => iniciarEdicionCategoria(comp, cat)} title="Editar"><i className="fas fa-edit"></i></button>
                                      <BotonSeguro className="acomp-btn-tabla-delete" onClick={() => eliminarCategoria(idCat)} title="Eliminar" textoProcesando=""><i className="fas fa-trash"></i></BotonSeguro>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
