import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { COMPETENCIAS_ENDPOINT } from '../services/api';
import RedGrayDatePicker from '../components/RedGrayDatePicker';
import BackButton from '../components/BackButton';
import EstatusPickerModal from '../components/EstatusPickerModal';
import FormatoCategoriaPicker from '../components/FormatoCategoriaPicker';
import BotonSeguro from '../components/BotonSeguro';
import PlanesModal from '../components/PlanesModal';
import '../assets/css/AdminCompetencias.css';

export default function AdminCompetencias() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [box, setBox] = useState(null);
  const [configPublica, setConfigPublica] = useState(null);
  const [competencias, setCompetencias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState(false);

  const [mostrarFormComp, setMostrarFormComp] = useState(false);
  const [formComp, setFormComp] = useState({ nombre: '', fechaInicio: '', fechaFin: '' });

  const [compSeleccionada, setCompSeleccionada] = useState(null);
  const [compParaPagar, setCompParaPagar] = useState(null);

  // --- Estados Modal Wizard Categoría ---
  const [mostrarWizard, setMostrarWizard] = useState(false);
  const [pasoWizard, setPasoWizard] = useState(1);

  // --- Estados Modal Detalles Categoría ---
  const [mostrarDetalles, setMostrarDetalles] = useState(false);
  const [categoriaDetalle, setCategoriaDetalle] = useState(null);

  const [formCat, setFormCat] = useState({
    nombre: '', esEquipo: false, cantidadIntegrantes: 1, cupoMaximo: 10, costo: '',
    cupoHombres: 0, cupoMujeres: 0,
    cupoAvanzado: 0, cupoIntermedio: 0, cupoPrincipiante: 0, cupoNovato: 0, cupoMaster: 0
  });
  const [editandoCat, setEditandoCat] = useState(null);

  const [vistaActual, setVistaActual] = useState('lista');
  const [rosterData, setRosterData] = useState([]);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [compRosterActiva, setCompRosterActiva] = useState(null);

  // --- Modal Atleta Detalles ---
  const [mostrarDetallesAtleta, setMostrarDetallesAtleta] = useState(false);
  const [atletaDetalle, setAtletaDetalle] = useState(null);

  // --- Modal Comprar Plan ---
  const [planSeleccionado, setPlanSeleccionado] = useState(null);
  const [nombreCompetenciaExpress, setNombreCompetenciaExpress] = useState('');
  const [creandoExpress, setCreandoExpress] = useState(false);

  useEffect(() => {
    const b = JSON.parse(localStorage.getItem('box'));
    const u = JSON.parse(localStorage.getItem('usuario'));
    if (!b || (u?.rol !== 'AdminBox' && u?.rol !== 'Developer')) { navigate('/login'); return; }
    setUser(u);
    setBox(b); 

    // Revisar si el módulo está inactivo (tanto camelCase como PascalCase)
    const isModuloInactivo = (b.moduloCompetenciasActivo === false || b.ModuloCompetenciasActivo === false);

    if (isModuloInactivo && u.rol !== 'Developer') {
      setLoading(false);
      fetch(`${import.meta.env.VITE_API_URL}/api/homepublic/configuracion`)
        .then(res => res.json())
        .then(data => setConfigPublica(data))
        .catch(err => console.error('Error fetching public config', err));
    } else {
      cargarCompetencias(b.idBox);
    }
  }, [navigate]);

  const cargarCompetencias = async (idBox) => {
    try {
      const res = await fetch(`${COMPETENCIAS_ENDPOINT}/box/${idBox}`, { cache: 'no-store' });
      setCompetencias(await res.json());
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const crearCompetencia = async (e) => {
    e.preventDefault(); setProcesando(true);
    try {
      const payload = { nombre: formComp.nombre, idBox: box.idBox || box.IdBox };
      // Solo enviar fechas si el usuario las puso
      if (formComp.fechaInicio) payload.fechaInicio = formComp.fechaInicio;
      if (formComp.fechaFin) payload.fechaFin = formComp.fechaFin;
      const res = await fetch(COMPETENCIAS_ENDPOINT, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      if (res.ok) {
        setFormComp({ nombre: '', fechaInicio: '', fechaFin: '' });
        setMostrarFormComp(false); cargarCompetencias(box.idBox || box.IdBox);
      } else { const err = await res.json(); alert(`Error: ${err.mensaje}`); }
    } catch (err) { alert('Error de conexión.'); } finally { setProcesando(false); }
  };

  const eliminarCompetencia = async (idComp, nombreComp) => {
    if (!await window.wpConfirm(`¿Seguro que quieres ELIMINAR en cascada la competencia "${nombreComp}"? Se borrarán todas sus categorías, inscripciones, pagos y scores. Esta acción NO se puede deshacer.`)) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${COMPETENCIAS_ENDPOINT}/${idComp}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        cargarCompetencias(box.idBox || box.IdBox);
      } else {
        const errData = await res.json();
        alert(errData.mensaje || 'Error al eliminar.');
      }
    } catch (err) { alert('Error de conexión.'); }
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
      cupoNovato: parseInt(formCat.cupoNovato) || 0,
      cupoMaster: parseInt(formCat.cupoMaster) || 0
    };

    try {
      const res = await fetch(url, {
        method: metodo, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      if (res.ok) {
        cancelarWizardCategoria();
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

  const iniciarWizardCategoria = (comp) => {
    setCompSeleccionada(comp);
    setEditandoCat(null);
    setFormCat({
      nombre: '', esEquipo: false, cantidadIntegrantes: 1, cupoMaximo: 10, costo: '',
      cupoHombres: 0, cupoMujeres: 0, cupoAvanzado: 0, cupoIntermedio: 0, cupoPrincipiante: 0, cupoNovato: 0, cupoMaster: 0
    });
    setPasoWizard(1);
    setMostrarWizard(true);
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
      cupoNovato: cat.cupoNovato || cat.CupoNovato || 0,
      cupoMaster: cat.cupoMaster || cat.CupoMaster || 0
    });
    setPasoWizard(1);
    setMostrarWizard(true);
  };

  const cancelarWizardCategoria = () => {
    setCompSeleccionada(null); setEditandoCat(null);
    setFormCat({
      nombre: '', esEquipo: false, cantidadIntegrantes: 1, cupoMaximo: 10, costo: '',
      cupoHombres: 0, cupoMujeres: 0, cupoAvanzado: 0, cupoIntermedio: 0, cupoPrincipiante: 0, cupoNovato: 0, cupoMaster: 0
    });
    setMostrarWizard(false);
    setPasoWizard(1);
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

  const comprarPlanYCrear = async (e) => {
    e.preventDefault();
    if (!planSeleccionado || !nombreCompetenciaExpress) return;
    setCreandoExpress(true);
    try {
      const token = localStorage.getItem('token');
      const payload = {
        nombreCompetencia: nombreCompetenciaExpress,
        planNombre: planSeleccionado.nombre,
        diasPlan: planSeleccionado.dias,
        atletasIncluidos: planSeleccionado.atletasIncluidos,
        precioAtletaExtra: planSeleccionado.precioAtletaExtra
      };
      
      const res = await fetch(`${COMPETENCIAS_ENDPOINT}/comprar-plan-crear`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        // Update local box state
        const updatedBox = { ...box, moduloCompetenciasActivo: true, ModuloCompetenciasActivo: true };
        setBox(updatedBox);
        localStorage.setItem('box', JSON.stringify(updatedBox));
        
        alert("¡Plan activado! Se ha creado tu competencia con éxito.");
        setPlanSeleccionado(null);
        setNombreCompetenciaExpress('');
        cargarCompetencias(box.idBox || box.IdBox);
      } else {
        const err = await res.json();
        alert(`Error al activar el plan: ${err.mensaje}`);
      }
    } catch (err) {
      alert("Error de conexión al activar el plan.");
    } finally {
      setCreandoExpress(false);
    }
  };

  // ===================================================================================
  // PANTALLA DE BLOQUEO (PAYWALL) PARA ADMINBOX CUANDO EL MÓDULO ESTÁ APAGADO
  // ===================================================================================
  if (box && (box.moduloCompetenciasActivo === false || box.ModuloCompetenciasActivo === false) && user?.rol !== 'Developer') {
    return (
      <div className="d-flex flex-column align-items-center justify-content-center text-center px-4" style={{ minHeight: '80vh', background: 'var(--bg-base)' }}>
        <i className="fas fa-trophy text-secondary mb-4" style={{ fontSize: '4rem', opacity: 0.5 }}></i>
        <h2 className="text-white mb-3 fw-bold">¿Quieres gestionar tu competencia?</h2>
        <p className="text-white-50 mb-5" style={{ maxWidth: '500px' }}>
          El módulo de Gestión de Competencias no se encuentra activo para tu cuenta. 
          Contáctanos para conocer nuestros planes y habilitar todas las herramientas profesionales para tu evento.
        </p>

        {configPublica ? (
          <>
            {/* PRICING CARDS */}
            {(() => {
              let planes = [];
              if (configPublica.planesCompetenciaJson) {
                try { planes = JSON.parse(configPublica.planesCompetenciaJson); } catch (e) {}
              }
              if (planes.length === 0) return null;
              
              return (
                <div className="row g-4 justify-content-center mb-5 w-100" style={{ maxWidth: '1000px' }}>
                  {planes.map((plan, idx) => (
                    <div key={idx} className="col-12 col-md-4">
                      <div className="card h-100 border-secondary text-center p-4 rounded-4 shadow-lg hover-scale" style={{ background: 'linear-gradient(145deg, #1a1a1a, #121212)' }}>
                        <h4 className="text-info fw-bold mb-3 text-uppercase" style={{ letterSpacing: '1px' }}>{plan.nombre}</h4>
                        <h2 className="text-white mb-4 fw-black">${plan.precio} <span className="fs-6 text-white-50 fw-normal">MXN</span></h2>
                        <ul className="list-unstyled text-start text-white-50 mb-4 mx-auto flex-grow-1" style={{ maxWidth: '220px' }}>
                          <li className="mb-3"><i className="fas fa-calendar-day text-success me-3"></i> {plan.dias} {plan.dias === 1 ? 'Día' : 'Días'} de duración</li>
                          <li className="mb-3"><i className="fas fa-users text-primary me-3"></i> {plan.atletasIncluidos} Atletas incluidos</li>
                          <li className="mb-3"><i className="fas fa-plus-circle text-warning me-3"></i> ${plan.precioAtletaExtra} por atleta extra</li>
                        </ul>
                        <button 
                          className="btn btn-outline-info w-100 rounded-pill mt-auto fw-bold py-2"
                          onClick={() => setPlanSeleccionado(plan)}
                        >
                          Seleccionar Plan
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}

            <h5 className="text-white mb-4 fw-bold">¿Listo para llevar tu evento al siguiente nivel?</h5>
            <div className="d-flex flex-wrap gap-3 align-items-center justify-content-center">
            {configPublica.linkInstagram && (
              <a href={configPublica.linkInstagram} target="_blank" rel="noreferrer" className="btn btn-outline-danger px-4 py-2 rounded-pill d-flex align-items-center gap-3 fw-bold" style={{ width: 'auto', minWidth: '200px', justifyContent: 'center' }}>
                <i className="fab fa-instagram fs-5"></i> Instagram
              </a>
            )}
            {configPublica.linkFacebook && (
              <a href={configPublica.linkFacebook} target="_blank" rel="noreferrer" className="btn btn-outline-primary px-4 py-2 rounded-pill d-flex align-items-center gap-3 fw-bold" style={{ width: 'auto', minWidth: '200px', justifyContent: 'center' }}>
                <i className="fab fa-facebook fs-5"></i> Facebook
              </a>
            )}
            {configPublica.telefonoSoporte && (
              <a href={`https://wa.me/${configPublica.telefonoSoporte.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="btn btn-outline-success px-4 py-2 rounded-pill d-flex align-items-center gap-3 fw-bold" style={{ width: 'auto', minWidth: '200px', justifyContent: 'center' }}>
                <i className="fab fa-whatsapp fs-5"></i> WhatsApp
              </a>
            )}
            {configPublica.correoContacto && (
              <a href={`mailto:${configPublica.correoContacto}`} className="btn btn-outline-warning px-4 py-2 rounded-pill d-flex align-items-center gap-3 fw-bold" style={{ width: 'auto', minWidth: '200px', justifyContent: 'center' }}>
                <i className="fas fa-envelope fs-5"></i> Correo
              </a>
            )}
            </div>
            
            {/* Modal Comprar Plan Express */}
            {planSeleccionado && (
              <div className="modal-backdrop-wp d-flex align-items-center justify-content-center px-3" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1050, background: 'rgba(0,0,0,0.8)' }}>
                <div className="tarjeta-panel p-4 w-100 rounded-4" style={{ maxWidth: '500px' }}>
                  <div className="d-flex justify-content-between align-items-center mb-4 border-bottom border-secondary pb-3">
                    <h4 className="text-info m-0 fw-bold">Activar Plan: {planSeleccionado.nombre}</h4>
                    <button type="button" className="btn-close btn-close-white" onClick={() => setPlanSeleccionado(null)}></button>
                  </div>
                  
                  <div className="mb-4 text-center">
                    <h1 className="text-white fw-bold">${planSeleccionado.precio} <span className="fs-5 text-white-50 fw-normal">MXN</span></h1>
                  </div>

                  <form onSubmit={comprarPlanYCrear}>
                    <div className="mb-4">
                      <label className="form-label text-white-50">Nombre de la Competencia <span className="text-danger">*</span></label>
                      <input 
                        type="text" 
                        className="form-control bg-dark text-white border-secondary rounded-pill px-4 py-2" 
                        placeholder="Ej. Wolfpack Throwdown 2026" 
                        value={nombreCompetenciaExpress}
                        onChange={(e) => setNombreCompetenciaExpress(e.target.value)}
                        required
                        autoFocus
                      />
                    </div>
                    
                    <div className="d-flex justify-content-end gap-2">
                      <button type="button" className="btn btn-outline-secondary rounded-pill px-4" onClick={() => setPlanSeleccionado(null)}>Cancelar</button>
                      <button type="submit" className="btn btn-info rounded-pill px-4 text-dark fw-bold" disabled={creandoExpress}>
                        {creandoExpress ? 'Procesando...' : 'Comprar y Crear Competencia'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="spinner-wp mt-4" style={{ transform: 'scale(0.5)' }}></div>
        )}
      </div>
    );
  }


  // ===================================================================================
  // VISTA 2: CUARTO DE GUERRA (ROSTER Y FINANZAS) — dead code, entrada real via Link
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
                          {cat.cupoMaster > 0 && <span className="acomp-receta-tag acomp-receta-tag--nivel">Master: {cat.cupoMaster}</span>}
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
                                              <div className="d-flex flex-column">
                                                <span className="small fw-semibold" style={{ color: 'var(--text-primary)' }}>{atl.nombreCompleto} {atl.apellidos}</span>
                                              </div>
                                            </div>
                                            <div className="d-flex gap-2 align-items-center">
                                              <span className="acomp-tipo-badge">{atl.nivelHabilidad}</span>
                                              <button className="btn btn-sm btn-outline-info rounded-circle p-1 d-flex justify-content-center align-items-center" style={{ width: '28px', height: '28px' }} onClick={() => { setAtletaDetalle({ ...atl, costoCategoria: cat.costo, esEquipo: cat.esEquipo, reqCategoria: cat }); setMostrarDetallesAtleta(true); }} title="Más información">
                                                <i className="fas fa-info-circle"></i>
                                              </button>
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
                                              <a href={`${import.meta.env.VITE_API_URL}${pago.comprobanteUrl}`} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline-info rounded-circle p-1" style={{ width: '28px', height: '28px' }} title="Ver comprobante"><i className="fas fa-image"></i></a>
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
  // VISTA 1: LISTA DE COMPETENCIAS (PRINCIPAL)
  // ===================================================================================
  return (
    <div className="acomp-container">

      {/* ── HEADER ── */}
      <header className="acomp-nav" style={{ marginBottom: '2rem' }}>
        <div className="acomp-nav-left">
          <BackButton to="/admin-box-panel" />
          <div className="acomp-nav-icono d-none d-sm-flex">
            <i className="fas fa-trophy"></i>
          </div>
          <p className="acomp-nav-titulo">Admin <span>Competencias</span></p>
        </div>
        <div className="d-flex align-items-center gap-2">
          <Link to="/admin-competencias/historial" className="acomp-btn-cancel-sm text-decoration-none">
            <i className="fas fa-archive"></i> <span className="d-none d-sm-inline">Historial</span>
          </Link>
          {user?.rol === 'Developer' && (
            <button
              className={`acomp-btn-nueva ${mostrarFormComp ? 'acomp-btn-nueva--cancelar' : ''}`}
              onClick={() => setMostrarFormComp(!mostrarFormComp)}
            >
              <i className={`fas ${mostrarFormComp ? 'fa-times' : 'fa-plus'}`}></i>
              <span className="d-none d-sm-inline">{mostrarFormComp ? 'Cancelar' : 'Nueva'}</span>
            </button>
          )}
        </div>
      </header>

      <div className="container-xl px-3 px-md-4 pb-5">

        {/* ── FORM NUEVA COMPETENCIA ── */}
        {mostrarFormComp && (
          <div className="acomp-form-card mb-4">
            <div className="acomp-form-header">
              <p className="acomp-form-titulo"><i className="fas fa-plus-circle"></i> Nueva Competencia</p>
            </div>
            <div className="acomp-form-body">
              <form onSubmit={crearCompetencia}>
                <div className="row g-3">
                  <div className="col-12 col-md-6">
                    <label className="acomp-label">Nombre del evento</label>
                    <input
                      type="text"
                      className="acomp-input"
                      placeholder="Ej. WolfPack Open 2026"
                      required
                      value={formComp.nombre}
                      onChange={e => setFormComp({ ...formComp, nombre: e.target.value })}
                    />
                  </div>
                  <div className="col-6 col-md-3">
                    <label className="acomp-label">Fecha inicio <span className="text-muted">(opcional)</span></label>
                    <RedGrayDatePicker value={formComp.fechaInicio} onChange={value => setFormComp({ ...formComp, fechaInicio: value })} />
                  </div>
                  <div className="col-6 col-md-3">
                    <label className="acomp-label">Fecha fin <span className="text-muted">(opcional)</span></label>
                    <RedGrayDatePicker value={formComp.fechaFin} onChange={value => setFormComp({ ...formComp, fechaFin: value })} />
                  </div>
                </div>
                <div className="d-flex justify-content-end gap-2 mt-4">
                  <button type="button" className="acomp-btn-cancel-sm" onClick={() => setMostrarFormComp(false)}>Cancelar</button>
                  <BotonSeguro type="submit" disabled={procesando} className="acomp-btn-submit" textoProcesando="Creando...">
                    <i className="fas fa-plus"></i> Crear
                  </BotonSeguro>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── LISTA ── */}
        {competencias.filter(c => c.estatus !== 'Archivada' && c.estatus !== 'Historial').length === 0 ? (
          <div className="acomp-empty">
            <i className="fas fa-trophy"></i>
            <h5>No hay competencias creadas</h5>
          </div>
        ) : (
          <div className="row g-4">
            {competencias.filter(c => c.estatus !== 'Archivada' && c.estatus !== 'Historial').map(comp => (
              <div key={comp.idCompetencia} className="col-12 col-xl-6">
                <div className={`acomp-comp-card acomp-comp-card--${comp.saaS_Estatus === 'Configurando' ? 'secondary' : getEstatusColor(comp.estatus)}`}>

                  {/* Header tarjeta */}
                  <div className="acomp-comp-header">
                    <div className="min-w-0">
                      {comp.saaS_Estatus === 'Configurando' ? (
                        <div className="acomp-comp-nombre text-muted">{comp.nombre}</div>
                      ) : (
                        <Link to={`/admin-competencias/panel/${comp.idCompetencia || comp.IdCompetencia}`} className="acomp-comp-nombre">
                          {comp.nombre} <i className="fas fa-external-link-alt"></i>
                        </Link>
                      )}
                      <p className="acomp-comp-fechas">
                        <i className="fas fa-calendar me-1"></i>
                        {new Date(comp.fechaInicio).getFullYear() >= 2099 
                          ? "Fechas por definir" 
                          : `${new Date(comp.fechaInicio).toLocaleDateString()} — ${new Date(comp.fechaFin).toLocaleDateString()}`}
                      </p>
                    </div>
                    {comp.saaS_Estatus === 'Configurando' ? (
                      <span className="badge bg-warning text-dark"><i className="fas fa-lock me-1"></i>Pago Pendiente</span>
                    ) : (
                      <EstatusPickerModal estatus={comp.estatus} onCambiar={(nuevoEstatus) => cambiarEstatus(comp.idCompetencia || comp.IdCompetencia, nuevoEstatus)} />
                    )}
                    {user?.rol === 'Developer' && (
                      <BotonSeguro
                        className="btn btn-sm btn-outline-danger rounded-circle ms-1"
                        style={{ width: '30px', height: '30px', padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                        title="Eliminar competencia en cascada"
                        textoProcesando=""
                        onClick={() => eliminarCompetencia(comp.idCompetencia || comp.IdCompetencia, comp.nombre)}
                      >
                        <i className="fas fa-trash" style={{ fontSize: '0.7rem' }}></i>
                      </BotonSeguro>
                    )}
                  </div>

                  {/* B2B SaaS Stripe Payment Lock */}
                  {comp.saaS_Estatus === 'Configurando' ? (
                    <div className="p-4 text-center bg-dark border-top border-secondary border-opacity-50">
                      <i className="fas fa-file-contract fs-1 text-warning mb-3"></i>
                      <h5 className="text-white mb-2">Módulo Inactivo</h5>
                      <p className="text-secondary small mb-3">Para abrir inscripciones y gestionar este evento, es necesario activar el paquete base.</p>
                      <button 
                        className="btn btn-warning fw-bold px-4 rounded-pill"
                        onClick={() => setCompParaPagar(comp)}
                      >
                        <i className="fas fa-credit-card me-2"></i>Contratar Evento
                      </button>
                    </div>
                  ) : (
                    <>
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
                      <button className="acomp-btn-add-cat" onClick={() => iniciarWizardCategoria(comp)}>
                        <i className="fas fa-plus"></i> Agregar
                      </button>
                    </div>

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
                                      <button className="acomp-btn-tabla-edit me-1" onClick={() => { setCategoriaDetalle(cat); setMostrarDetalles(true); }} title="Ver Detalles"><i className="fas fa-eye text-info"></i></button>
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
                    </>
                  )}

                </div>
              </div>
            ))}
          </div>
        )}
        {/* === MODAL WIZARD CATEGORÍA === */}
        {mostrarWizard && (
          <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 1050 }} tabIndex="-1">
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content text-light border-danger" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border) !important' }}>
                <div className="modal-header border-bottom border-secondary border-opacity-25">
                  <h5 className="modal-title text-warning" style={{ fontFamily: 'var(--font-heading)' }}>
                    {editandoCat ? 'Editar Categoría' : 'Nueva Categoría'} <span className="fs-6 text-secondary ms-2">(Paso {pasoWizard}/5)</span>
                  </h5>
                  <button type="button" className="btn-close btn-close-white" onClick={cancelarWizardCategoria}></button>
                </div>
                <div className="modal-body">
                  {pasoWizard === 1 && (
                    <div className="animate__animated animate__fadeIn">
                      <label className="form-label text-secondary small text-uppercase fw-bold"><i className="fas fa-tag me-1"></i>Nombre de la categoría</label>
                      <input type="text" className="form-control bg-dark text-light border-secondary" placeholder="Ej. RX Equipo Mixto" value={formCat.nombre} onChange={e => setFormCat({ ...formCat, nombre: e.target.value })} autoFocus />
                    </div>
                  )}

                  {pasoWizard === 2 && (
                    <div className="animate__animated animate__fadeIn">
                      <label className="form-label text-secondary small text-uppercase fw-bold"><i className="fas fa-users me-1"></i>Cantidad de Integrantes</label>
                      <input type="number" min="1" className="form-control bg-dark text-light border-secondary mb-3" value={formCat.cantidadIntegrantes} onChange={e => {
                        const val = parseInt(e.target.value) || 1;
                        setFormCat({ ...formCat, cantidadIntegrantes: val, esEquipo: val > 1 });
                      }} autoFocus />
                      <div className="p-3 rounded bg-dark border border-secondary border-opacity-50 text-center">
                        {formCat.esEquipo ? (
                          <><i className="fas fa-users fs-1 text-info mb-2"></i><h6 className="text-info mb-0">Modalidad por Equipo</h6></>
                        ) : (
                          <><i className="fas fa-user fs-1 text-success mb-2"></i><h6 className="text-success mb-0">Modalidad Individual</h6></>
                        )}
                      </div>
                    </div>
                  )}

                  {pasoWizard === 3 && (() => {
                    const integrantes = Number(formCat.cantidadIntegrantes) || 1;
                    const totalSexo = Number(formCat.cupoHombres) + Number(formCat.cupoMujeres);
                    const sexoOk = totalSexo === integrantes;
                    return (
                      <div className="animate__animated animate__fadeIn">
                        <label className="form-label text-secondary small text-uppercase fw-bold mb-3"><i className="fas fa-venus-mars me-1"></i>Distribución de Sexo</label>
                        <p className="small text-secondary mb-3">Distribuye exactamente <strong>{integrantes}</strong> cupo(s).</p>
                        <div className="row g-3 mb-3">
                          <div className="col-6">
                            <label className="small text-info"><i className="fas fa-male me-1"></i>Hombres</label>
                            <input type="number" min="0" max={integrantes} className="form-control bg-dark text-light border-info" value={formCat.cupoHombres} onChange={e => setFormCat({ ...formCat, cupoHombres: e.target.value })} />
                          </div>
                          <div className="col-6">
                            <label className="small text-danger"><i className="fas fa-female me-1"></i>Mujeres</label>
                            <input type="number" min="0" max={integrantes} className="form-control bg-dark text-light border-danger" value={formCat.cupoMujeres} onChange={e => setFormCat({ ...formCat, cupoMujeres: e.target.value })} />
                          </div>
                        </div>
                        <div className={`text-center small fw-bold ${sexoOk ? 'text-success' : 'text-warning'}`}>
                          {sexoOk ? <><i className="fas fa-check-circle me-1"></i> Distribución Correcta ({totalSexo}/{integrantes})</> : <><i className="fas fa-exclamation-circle me-1"></i> Debes sumar {integrantes} exactos (Actual: {totalSexo})</>}
                        </div>
                      </div>
                    );
                  })()}

                  {pasoWizard === 4 && (() => {
                    const integrantes = Number(formCat.cantidadIntegrantes) || 1;
                    const totalNivel = Number(formCat.cupoAvanzado) + Number(formCat.cupoIntermedio) + Number(formCat.cupoPrincipiante) + Number(formCat.cupoNovato) + Number(formCat.cupoMaster);
                    const nivelOk = totalNivel === integrantes;
                    return (
                      <div className="animate__animated animate__fadeIn">
                        <label className="form-label text-secondary small text-uppercase fw-bold mb-3"><i className="fas fa-layer-group me-1"></i>Distribución de Niveles</label>
                        <p className="small text-secondary mb-3">Distribuye exactamente <strong>{integrantes}</strong> cupo(s).</p>
                        <div className="row g-2 mb-3">
                          <div className="col-4">
                            <label className="small text-secondary">Avanzado</label>
                            <input type="number" min="0" max={integrantes} className="form-control bg-dark text-light border-secondary" value={formCat.cupoAvanzado} onChange={e => setFormCat({ ...formCat, cupoAvanzado: e.target.value })} />
                          </div>
                          <div className="col-4">
                            <label className="small text-secondary">Intermedio</label>
                            <input type="number" min="0" max={integrantes} className="form-control bg-dark text-light border-secondary" value={formCat.cupoIntermedio} onChange={e => setFormCat({ ...formCat, cupoIntermedio: e.target.value })} />
                          </div>
                          <div className="col-4">
                            <label className="small text-secondary">Principiante</label>
                            <input type="number" min="0" max={integrantes} className="form-control bg-dark text-light border-secondary" value={formCat.cupoPrincipiante} onChange={e => setFormCat({ ...formCat, cupoPrincipiante: e.target.value })} />
                          </div>
                          <div className="col-6">
                            <label className="small text-secondary">Novato</label>
                            <input type="number" min="0" max={integrantes} className="form-control bg-dark text-light border-secondary" value={formCat.cupoNovato} onChange={e => setFormCat({ ...formCat, cupoNovato: e.target.value })} />
                          </div>
                          <div className="col-6">
                            <label className="small text-secondary">Master</label>
                            <input type="number" min="0" max={integrantes} className="form-control bg-dark text-light border-secondary" value={formCat.cupoMaster} onChange={e => setFormCat({ ...formCat, cupoMaster: e.target.value })} />
                          </div>
                        </div>
                        <div className={`text-center small fw-bold ${nivelOk ? 'text-success' : 'text-warning'}`}>
                          {nivelOk ? <><i className="fas fa-check-circle me-1"></i> Distribución Correcta ({totalNivel}/{integrantes})</> : <><i className="fas fa-exclamation-circle me-1"></i> Debes sumar {integrantes} exactos (Actual: {totalNivel})</>}
                        </div>
                      </div>
                    );
                  })()}

                  {pasoWizard === 5 && (
                    <div className="animate__animated animate__fadeIn">
                      <label className="form-label text-secondary small text-uppercase fw-bold mb-3"><i className="fas fa-money-bill-wave me-1"></i>Costos y Cupos</label>
                      <div className="row g-3">
                        <div className="col-6">
                          <label className="small text-secondary">Costo de Inscripción ($)</label>
                          <input type="number" className="form-control bg-dark text-light border-secondary text-success fw-bold" placeholder="0.00" value={formCat.costo} onChange={e => setFormCat({ ...formCat, costo: e.target.value })} />
                        </div>
                        <div className="col-6">
                          <label className="small text-secondary">Cupo Máximo (Lugares)</label>
                          <input type="number" min="1" className="form-control bg-dark text-light border-secondary" value={formCat.cupoMaximo} onChange={e => setFormCat({ ...formCat, cupoMaximo: e.target.value })} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="modal-footer border-top border-secondary border-opacity-25 d-flex justify-content-between">
                  {pasoWizard > 1 ? (
                    <button className="btn btn-outline-secondary" onClick={() => setPasoWizard(p => p - 1)}><i className="fas fa-arrow-left me-1"></i>Atrás</button>
                  ) : (
                    <div></div>
                  )}
                  {pasoWizard < 5 ? (
                    <button className="btn btn-warning fw-bold text-dark" onClick={() => {
                      if (pasoWizard === 1 && !formCat.nombre) return alert('Ingresa un nombre');
                      if (pasoWizard === 3 && (Number(formCat.cupoHombres) + Number(formCat.cupoMujeres) !== Number(formCat.cantidadIntegrantes))) return alert('La distribución de sexo no cuadra con la cantidad de integrantes');
                      if (pasoWizard === 4 && (Number(formCat.cupoAvanzado) + Number(formCat.cupoIntermedio) + Number(formCat.cupoPrincipiante) + Number(formCat.cupoNovato) + Number(formCat.cupoMaster) !== Number(formCat.cantidadIntegrantes))) return alert('La distribución de niveles no cuadra con la cantidad de integrantes');
                      setPasoWizard(p => p + 1);
                    }}>Siguiente<i className="fas fa-arrow-right ms-2"></i></button>
                  ) : (
                    <BotonSeguro className="btn btn-success fw-bold px-4" onClick={(e) => {
                      if (!formCat.costo) return alert('Ingresa un costo válido');
                      guardarCategoria(e);
                    }} textoProcesando="Guardando...">
                      <i className="fas fa-check-circle me-1"></i>Finalizar
                    </BotonSeguro>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* === MODAL DETALLES CATEGORÍA === */}
        {mostrarDetalles && categoriaDetalle && (
          <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 1050 }} tabIndex="-1">
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content text-light border-info" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border) !important' }}>
                <div className="modal-header border-bottom border-secondary border-opacity-25">
                  <h5 className="modal-title text-info" style={{ fontFamily: 'var(--font-heading)' }}>
                    <i className="fas fa-info-circle me-2"></i>Detalles de la Categoría
                  </h5>
                  <button type="button" className="btn-close btn-close-white" onClick={() => setMostrarDetalles(false)}></button>
                </div>
                <div className="modal-body">
                  <div className="text-center mb-4">
                    <h4 className="text-white mb-1" style={{ fontFamily: 'var(--font-heading)' }}>{categoriaDetalle.nombre || categoriaDetalle.Nombre}</h4>
                    <span className="badge bg-secondary border border-secondary text-light">
                      {(categoriaDetalle.esEquipo || categoriaDetalle.EsEquipo) ? 'Modalidad por Equipo' : 'Modalidad Individual'}
                    </span>
                  </div>

                  <div className="row g-3 mb-4">
                    <div className="col-6">
                      <div className="p-3 bg-dark rounded border border-secondary border-opacity-25 text-center">
                        <i className="fas fa-users text-secondary mb-2 fs-4"></i>
                        <h6 className="mb-0 text-white">{(categoriaDetalle.cantidadIntegrantes || categoriaDetalle.CantidadIntegrantes)}</h6>
                        <small className="text-muted">Integrantes</small>
                      </div>
                    </div>
                    <div className="col-6">
                      <div className="p-3 bg-dark rounded border border-secondary border-opacity-25 text-center">
                        <i className="fas fa-ticket-alt text-warning mb-2 fs-4"></i>
                        <h6 className="mb-0 text-white">{(categoriaDetalle.cupoMaximo || categoriaDetalle.CupoMaximo)}</h6>
                        <small className="text-muted">Cupo Máximo</small>
                      </div>
                    </div>
                  </div>

                  <h6 className="text-secondary small fw-bold mb-3 border-bottom border-secondary border-opacity-25 pb-2 text-uppercase">La Receta</h6>
                  <div className="d-flex flex-wrap gap-2 mb-4">
                    {(categoriaDetalle.cupoHombres > 0 || categoriaDetalle.CupoHombres > 0) && <span className="badge bg-info bg-opacity-25 text-info border border-info px-3 py-2"><i className="fas fa-male me-1"></i>Hombres: {categoriaDetalle.cupoHombres || categoriaDetalle.CupoHombres}</span>}
                    {(categoriaDetalle.cupoMujeres > 0 || categoriaDetalle.CupoMujeres > 0) && <span className="badge bg-danger bg-opacity-25 text-danger border border-danger px-3 py-2"><i className="fas fa-female me-1"></i>Mujeres: {categoriaDetalle.cupoMujeres || categoriaDetalle.CupoMujeres}</span>}

                    {(categoriaDetalle.cupoAvanzado > 0 || categoriaDetalle.CupoAvanzado > 0) && <span className="badge bg-secondary text-light border border-secondary px-3 py-2">Avanzado: {categoriaDetalle.cupoAvanzado || categoriaDetalle.CupoAvanzado}</span>}
                    {(categoriaDetalle.cupoIntermedio > 0 || categoriaDetalle.CupoIntermedio > 0) && <span className="badge bg-secondary text-light border border-secondary px-3 py-2">Intermedio: {categoriaDetalle.cupoIntermedio || categoriaDetalle.CupoIntermedio}</span>}
                    {(categoriaDetalle.cupoPrincipiante > 0 || categoriaDetalle.CupoPrincipiante > 0) && <span className="badge bg-secondary text-light border border-secondary px-3 py-2">Principiante: {categoriaDetalle.cupoPrincipiante || categoriaDetalle.CupoPrincipiante}</span>}
                    {(categoriaDetalle.cupoNovato > 0 || categoriaDetalle.CupoNovato > 0) && <span className="badge bg-secondary text-light border border-secondary px-3 py-2">Novato: {categoriaDetalle.cupoNovato || categoriaDetalle.CupoNovato}</span>}
                    {(categoriaDetalle.cupoMaster > 0 || categoriaDetalle.CupoMaster > 0) && <span className="badge bg-warning bg-opacity-25 text-warning border border-warning px-3 py-2">Master: {categoriaDetalle.cupoMaster || categoriaDetalle.CupoMaster}</span>}
                  </div>

                  <div className="p-3 bg-success bg-opacity-10 border border-success border-opacity-25 rounded d-flex justify-content-between align-items-center">
                    <span className="text-success fw-bold"><i className="fas fa-dollar-sign me-1"></i>Costo de Inscripción</span>
                    <h4 className="text-success mb-0 fw-bold" style={{ fontFamily: 'var(--font-stats)' }}>${categoriaDetalle.costo || categoriaDetalle.Costo}</h4>
                  </div>

                </div>
                <div className="modal-footer border-top border-secondary border-opacity-25">
                  <button className="btn btn-secondary w-100" onClick={() => setMostrarDetalles(false)}>Cerrar</button>
                </div>
              </div>
            </div>
          </div>
        )}

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
            <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 1060 }} tabIndex="-1">
              <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content text-light border-info" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border) !important' }}>
                  <div className="modal-header border-bottom border-secondary border-opacity-25">
                    <h5 className="modal-title text-info" style={{ fontFamily: 'var(--font-heading)' }}>
                      <i className="fas fa-id-card me-2"></i>Expediente del Atleta
                    </h5>
                    <button type="button" className="btn-close btn-close-white" onClick={() => setMostrarDetallesAtleta(false)}></button>
                  </div>
                  <div className="modal-body py-4">
                    <div className="text-center mb-4">
                      <i className={`fas ${atletaDetalle.genero === 'Hombre' || atletaDetalle.genero === 'Masculino' ? 'fa-male text-info' : 'fa-female'} mb-3`} style={{ fontSize: '3rem', color: atletaDetalle.genero === 'Hombre' || atletaDetalle.genero === 'Masculino' ? '' : '#ff7fa8' }}></i>
                      <h4 className="text-white mb-1">{atletaDetalle.nombreCompleto} {atletaDetalle.apellidos}</h4>
                      <p className="text-secondary small mb-0">{atletaDetalle.correo || 'Sin correo registrado'}</p>
                    </div>

                    <div className="row g-3 mb-3">
                      <div className="col-6">
                        <div className="p-3 bg-dark rounded border border-secondary border-opacity-25">
                          <small className="text-muted d-block mb-1">Edad</small>
                          <h6 className="text-white mb-0">{edad} años</h6>
                        </div>
                      </div>
                      <div className="col-6">
                        <div className="p-3 bg-dark rounded border border-secondary border-opacity-25">
                          <small className="text-muted d-block mb-1">Talla de Playera</small>
                          <h6 className="text-white mb-0">{atletaDetalle.tallaPlayera || 'N/A'}</h6>
                        </div>
                      </div>
                      <div className="col-6">
                        <div className="p-3 bg-dark rounded border border-secondary border-opacity-25">
                          <small className="text-muted d-block mb-1">Tipo de Sangre</small>
                          <h6 className="text-white mb-0">{atletaDetalle.tipoSangre || 'N/A'}</h6>
                        </div>
                      </div>
                      <div className="col-6">
                        <div className="p-3 bg-dark rounded border border-secondary border-opacity-25">
                          <small className="text-muted d-block mb-1">Nivel Declarado</small>
                          <h6 className="text-white mb-0">{atletaDetalle.nivelHabilidad}</h6>
                        </div>
                      </div>
                    </div>

                    {!atletaDetalle.esEquipo && (
                      <div className="mb-3">
                        <div className="p-3 bg-dark rounded border border-secondary border-opacity-25">
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
                  <div className="modal-footer border-top border-secondary border-opacity-25">
                    <button className="btn btn-secondary w-100" onClick={() => setMostrarDetallesAtleta(false)}>Cerrar</button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        <PlanesModal 
          isOpen={!!compParaPagar} 
          onClose={() => setCompParaPagar(null)} 
          idCompetencia={compParaPagar?.idCompetencia || compParaPagar?.IdCompetencia} 
          onSuccess={() => {
            setCompParaPagar(null);
            cargarCompetencias(box.idBox || box.IdBox);
          }} 
        />
      </div>
    </div>
  );
}
