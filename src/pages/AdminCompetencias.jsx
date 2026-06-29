import { useState, useEffect, Fragment } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { COMPETENCIAS_ENDPOINT } from '../services/api';
import AtletifyLoader from '../components/AtletifyLoader';
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
  // F2.4: tipo de cobro de la NUEVA competencia + input del calculador (Tipo B)
  const [tipoNuevaComp, setTipoNuevaComp] = useState('Paquete'); // 'Paquete' (Tipo A) | 'Comision' (Tipo B / WodReps)
  const [precioCalc, setPrecioCalc] = useState('');

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

  // Developer: cobra los atletas excedentes de una competencia finalizada (a la tarjeta retenida del
  // organizador) y la archiva. Cuenta solo atletas con pago aprobado.
  const cobrarExcedentes = async (idComp, nombreComp) => {
    if (!await window.wpConfirm(`¿Cobrar los atletas EXCEDENTES de "${nombreComp}"? Se cobrará a la tarjeta retenida del organizador y la competencia quedará archivada (solo lectura).`)) return;
    try {
      const token = localStorage.getItem('token');
      const base = COMPETENCIAS_ENDPOINT.replace(/\/competencias$/, '');
      const res = await fetch(`${base}/developer/competencias/${idComp}/cobrar-excedentes`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      alert(data.mensaje || (res.ok ? 'Cobro procesado.' : 'No se pudo cobrar el excedente.'));
      if (res.ok) cargarCompetencias(box.idBox || box.IdBox);
    } catch (err) { alert('Error de conexión al cobrar excedentes.'); }
  };

  // Developer: aprueba un pago MANUAL del módulo (transferencia/efectivo que el box reportó) -> activa.
  const aprobarPagoModulo = async (idComp, nombreComp) => {
    if (!await window.wpConfirm(`¿Aprobar el pago manual del módulo de "${nombreComp}"? Se activará la competencia.`)) return;
    try {
      const token = localStorage.getItem('token');
      const base = COMPETENCIAS_ENDPOINT.replace(/\/competencias$/, '');
      const res = await fetch(`${base}/developer/competencias/${idComp}/aprobar-pago-modulo`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      alert(data.mensaje || (res.ok ? 'Pago aprobado.' : 'No se pudo aprobar.'));
      if (res.ok) cargarCompetencias(box.idBox || box.IdBox);
    } catch (err) { alert('Error de conexión al aprobar el pago del módulo.'); }
  };

  // Developer: fuerza el estatus a mano para pruebas (queda "fijo", la auto-transición por fechas lo respeta).
  // Enviar 'Auto' suelta el control y deja que las fechas vuelvan a mandar.
  const cambiarEstatusDev = async (idComp, nuevoEstatus, nombreComp) => {
    if (nuevoEstatus !== 'Auto' && !await window.wpConfirm(`¿Forzar el estatus de "${nombreComp}" a "${nuevoEstatus}"? Quedará FIJO (no cambiará solo por fechas) hasta que elijas "Automático".`)) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${COMPETENCIAS_ENDPOINT}/${idComp}/estatus`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(nuevoEstatus),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) cargarCompetencias(box.idBox || box.IdBox);
      else alert(data.mensaje || 'No se pudo cambiar el estatus.');
    } catch { alert('Error de conexión al cambiar el estatus.'); }
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
      <AtletifyLoader />
    </div>
  );

  const comprarPlanYCrear = async (e) => {
    e.preventDefault();
    const esComision = tipoNuevaComp === 'Comision';
    if (!nombreCompetenciaExpress) return;
    if (!esComision && !planSeleccionado) {
      alert('Selecciona un paquete o elige "Atletas ilimitados (comisión)".');
      return;
    }
    setCreandoExpress(true);
    try {
      const token = localStorage.getItem('token');
      const payload = esComision
        ? { nombreCompetencia: nombreCompetenciaExpress, modeloCobro: 'Comision' }
        : {
            nombreCompetencia: nombreCompetenciaExpress,
            planNombre: planSeleccionado.nombre,
            diasPlan: planSeleccionado.dias,
            atletasIncluidos: planSeleccionado.atletasIncluidos,
            precioAtletaExtra: planSeleccionado.precioAtletaExtra,
            modeloCobro: 'Paquete'
          };

      const res = await fetch(`${COMPETENCIAS_ENDPOINT}/comprar-plan-crear`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const updatedBox = { ...box, moduloCompetenciasActivo: true, ModuloCompetenciasActivo: true };
        setBox(updatedBox);
        localStorage.setItem('box', JSON.stringify(updatedBox));

        alert('¡Competencia creada con éxito!');
        setPlanSeleccionado(null);
        setNombreCompetenciaExpress('');
        setPrecioCalc('');
        setMostrarFormComp(false);
        cargarCompetencias(box.idBox || box.IdBox);
      } else {
        const err = await res.json();
        alert(`Error: ${err.mensaje}`);
      }
    } catch (err) {
      alert('Error de conexión.');
    } finally {
      setCreandoExpress(false);
    }
  };

  // ===================================================================================
  // PANTALLA DE BLOQUEO (PAYWALL) PARA ADMINBOX CUANDO EL MÓDULO ESTÁ APAGADO
  // ===================================================================================
  // Tiene competencias si el flag legacy está activo (compra por evento) O si el plan lo incluye
  // (Premium): box.modulos lo inyecta el login desde ModuloService. Así un box Premium no ve el paywall.
  const tieneCompetencias = box?.moduloCompetenciasActivo === true || box?.ModuloCompetenciasActivo === true
    || (box?.modulos || box?.Modulos || []).includes('competencias');
  // F2.4: paywall por flag legacy DEPRECADO (competencias es add-on por evento, abierto a todos).
  // Se desactiva la condición; el bloque queda como dead-code a limpiar en una pasada posterior.
  if (false && box && !tieneCompetencias && user?.rol !== 'Developer') {
    let planes = [];
    if (configPublica?.planesCompetenciaJson) {
      try { planes = JSON.parse(configPublica.planesCompetenciaJson); } catch (e) {}
    }
    const maxPrecio = planes.length > 0 ? Math.max(...planes.map(p => p.precio)) : 0;

    return (
      <div className="acomp-paywall-wrapper">

        {/* Header */}
        <header className="acomp-nav" style={{ marginBottom: 0 }}>
          <div className="acomp-nav-left">
            <BackButton to="/admin-box-panel" />
            <div className="acomp-nav-icono d-none d-sm-flex">
              <i className="fas fa-trophy"></i>
            </div>
            <p className="acomp-nav-titulo">Admin <span>Competencias</span></p>
          </div>
        </header>

        {/* Hero */}
        <div className="acomp-paywall-hero">
          <div className="acomp-paywall-icon-wrap">
            <i className="fas fa-trophy"></i>
          </div>
          <h2 className="acomp-paywall-title">
            ¿Quieres gestionar tu <span>competencia?</span>
          </h2>
          <p className="acomp-paywall-desc">
            El módulo de Gestión de Competencias no se encuentra activo para tu cuenta.
            Selecciona un plan para habilitar todas las herramientas profesionales para tu evento.
          </p>
        </div>

        {/* Pricing Cards */}
        {configPublica ? (
          <>
            {planes.length > 0 && (
              <div className="container-xl px-3 px-md-4 mb-5">
                <div className="row g-4 justify-content-center">
                  {planes.map((plan, idx) => {
                    const esFeatured = plan.precio === maxPrecio;
                    return (
                      <div key={idx} className="col-12 col-sm-6 col-lg-4">
                        <div className={`acomp-plan-card${esFeatured ? ' acomp-plan-card--featured' : ''}`}>
                          <p className="acomp-plan-nombre">{plan.nombre}</p>
                          <div className="acomp-plan-precio-wrap">
                            <span className="acomp-plan-precio">${plan.precio}</span>
                            <span className="acomp-plan-precio-currency">MXN</span>
                          </div>
                          <ul className="acomp-plan-features">
                            <li className="acomp-plan-feature acomp-plan-feature--dias">
                              <i className="fas fa-calendar-day"></i>
                              <span>{plan.dias} {plan.dias === 1 ? 'Día' : 'Días'} de duración</span>
                            </li>
                            <li className="acomp-plan-feature acomp-plan-feature--cupo">
                              <i className="fas fa-users"></i>
                              <span>{plan.atletasIncluidos} Atletas incluidos</span>
                            </li>
                            <li className="acomp-plan-feature acomp-plan-feature--extra">
                              <i className="fas fa-plus-circle"></i>
                              <span>${plan.precioAtletaExtra} por atleta extra</span>
                            </li>
                          </ul>
                          <button
                            className={`acomp-plan-btn${esFeatured ? ' acomp-plan-btn--featured' : ''}`}
                            onClick={() => setPlanSeleccionado(plan)}
                          >
                            <i className="fas fa-bolt"></i> Seleccionar Plan
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* CTA Contacto */}
            <div className="acomp-paywall-cta">
              <p className="acomp-paywall-cta-title">
                ¿Listo para llevar tu evento al siguiente nivel?
              </p>
              <div className="acomp-contact-btns">
                {configPublica.linkInstagram && (
                  <a href={configPublica.linkInstagram} target="_blank" rel="noreferrer" className="acomp-contact-btn acomp-contact-btn--ig">
                    <i className="fab fa-instagram"></i> Instagram
                  </a>
                )}
                {configPublica.linkFacebook && (
                  <a href={configPublica.linkFacebook} target="_blank" rel="noreferrer" className="acomp-contact-btn acomp-contact-btn--fb">
                    <i className="fab fa-facebook"></i> Facebook
                  </a>
                )}
                {configPublica.telefonoSoporte && (
                  <a href={`https://wa.me/${configPublica.telefonoSoporte.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="acomp-contact-btn acomp-contact-btn--wa">
                    <i className="fab fa-whatsapp"></i> WhatsApp
                  </a>
                )}
                {configPublica.correoContacto && (
                  <a href={`mailto:${configPublica.correoContacto}`} className="acomp-contact-btn acomp-contact-btn--email">
                    <i className="fas fa-envelope"></i> Correo
                  </a>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="d-flex justify-content-center py-5">
            <div style={{ transform: 'scale(0.6)' }}><AtletifyLoader /></div>
          </div>
        )}

        {/* Modal Activar Plan Express */}
        {planSeleccionado && (
          <div className="acomp-plan-modal-overlay">
            <div className="acomp-plan-modal">
              <div className="acomp-plan-modal-header">
                <div>
                  <p className="acomp-plan-modal-supertitle">Activar Plan</p>
                  <h4 className="acomp-plan-modal-title">{planSeleccionado.nombre}</h4>
                </div>
                <button className="acomp-plan-modal-close" onClick={() => setPlanSeleccionado(null)}>
                  <i className="fas fa-times"></i>
                </button>
              </div>

              <div className="acomp-plan-modal-precio">
                <span className="acomp-plan-precio">${planSeleccionado.precio}</span>
                <span className="acomp-plan-precio-currency">MXN</span>
              </div>

              <form onSubmit={comprarPlanYCrear}>
                <div style={{ marginBottom: '1.25rem' }}>
                  <label className="acomp-label">
                    Nombre de la Competencia <span style={{ color: 'var(--primary)' }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="acomp-input"
                    placeholder="Ej. Wolfpack Throwdown 2026"
                    value={nombreCompetenciaExpress}
                    onChange={(e) => setNombreCompetenciaExpress(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
                <div className="d-flex justify-content-end gap-2">
                  <button type="button" className="acomp-btn-cancel-sm" onClick={() => setPlanSeleccionado(null)}>
                    Cancelar
                  </button>
                  <BotonSeguro type="submit" disabled={creandoExpress} className="acomp-btn-submit" textoProcesando="Procesando...">
                    <i className="fas fa-bolt"></i> Comprar y Crear
                  </BotonSeguro>
                </div>
              </form>
            </div>
          </div>
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
              <AtletifyLoader />
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
          {(user?.rol === 'Developer' || user?.rol === 'AdminBox') && (
            <button
              className={`acomp-btn-nueva ${mostrarFormComp ? 'acomp-btn-nueva--cancelar' : ''}`}
              onClick={() => { setTipoNuevaComp('Paquete'); setPlanSeleccionado(null); setPrecioCalc(''); setMostrarFormComp(!mostrarFormComp); }}
            >
              <i className={`fas ${mostrarFormComp ? 'fa-times' : 'fa-plus'}`}></i>
              <span className="d-none d-sm-inline">{mostrarFormComp ? 'Cancelar' : 'Nueva'}</span>
            </button>
          )}
        </div>
      </header>

      <div className="container-xl px-3 px-md-4 pb-5">

        {/* ── FORM NUEVA COMPETENCIA ── */}
        {mostrarFormComp && (() => {
          // F2.4: creación unificada con selector Tipo A (Paquete) / Tipo B (Comisión / WodReps).
          let planesComp = [];
          if (configPublica?.planesCompetenciaJson) {
            try { planesComp = JSON.parse(configPublica.planesCompetenciaJson); } catch (e) { planesComp = []; }
          }
          const tarifaComision = Number(configPublica?.comisionPorAtletaWodReps ?? 10);
          const esB = tipoNuevaComp === 'Comision';
          const precioNum = parseFloat(precioCalc) || 0;
          const stripeAprox = precioNum > 0 ? (precioNum * 0.041 + 3) : 0; // estimado ≈4.1% + $3
          const netoAtletaAbsorbe = Math.max(0, precioNum - tarifaComision);
          const netoBoxAbsorbe = Math.max(0, precioNum - tarifaComision - stripeAprox);
          return (
          <div className="acomp-form-card mb-4">
            <div className="acomp-form-header">
              <p className="acomp-form-titulo"><i className="fas fa-plus-circle"></i> Nueva Competencia</p>
            </div>
            <div className="acomp-form-body">
              {/* Selector de tipo de cobro */}
              <div className="d-flex gap-2 mb-4 flex-wrap">
                <button type="button"
                  className={esB ? 'acomp-btn-cancel-sm' : 'acomp-btn-nueva'}
                  onClick={() => setTipoNuevaComp('Paquete')}>
                  <i className="fas fa-box"></i> Por paquete
                </button>
                <button type="button"
                  className={!esB ? 'acomp-btn-cancel-sm' : 'acomp-btn-nueva'}
                  onClick={() => setTipoNuevaComp('Comision')}>
                  <i className="fas fa-infinity"></i> Atletas ilimitados (comisión)
                </button>
              </div>

              <form onSubmit={comprarPlanYCrear}>
                <div className="mb-3">
                  <label className="acomp-label">Nombre del evento</label>
                  <input
                    type="text"
                    className="acomp-input"
                    placeholder="Ej. WolfPack Open 2026"
                    required
                    value={nombreCompetenciaExpress}
                    onChange={e => setNombreCompetenciaExpress(e.target.value)}
                  />
                </div>

                {!esB ? (
                  <div className="mb-3">
                    <label className="acomp-label">Paquete</label>
                    {planesComp.length === 0 ? (
                      <p className="text-muted small mb-0">No hay paquetes configurados por la plataforma. Usa "Atletas ilimitados (comisión)" o pide que configuren los paquetes.</p>
                    ) : (
                      <div className="row g-2">
                        {planesComp.map((p, i) => (
                          <div key={i} className="col-12 col-sm-6 col-lg-4">
                            <button
                              type="button"
                              className={`acomp-plan-card w-100 ${planSeleccionado?.nombre === p.nombre ? 'acomp-plan-card--featured' : ''}`}
                              onClick={() => setPlanSeleccionado(p)}
                            >
                              <p className="acomp-plan-nombre mb-1">{p.nombre}</p>
                              <div><span className="acomp-plan-precio">${p.precio}</span> <span className="acomp-plan-precio-currency">MXN</span></div>
                              <p className="small mb-0 mt-1">{p.atletasIncluidos} atletas · {p.dias} {p.dias === 1 ? 'día' : 'días'}</p>
                              <p className="small mb-0">+${p.precioAtletaExtra}/atleta extra</p>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="mb-3 p-3 rounded-3" style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)' }}>
                    <p className="acomp-label mb-1"><i className="fas fa-infinity"></i> Modo comisión (WodReps)</p>
                    <p className="small mb-3" style={{ color: 'var(--secondary)' }}>
                      Atletas <strong>ilimitados</strong> e inscripciones <strong>100% en línea</strong>. La plataforma cobra
                      <strong> ${tarifaComision} MXN por atleta</strong> inscrito. No pagas nada por crear la competencia.
                    </p>
                    <label className="acomp-label">Calculadora — ¿cuánto cobras de inscripción por atleta?</label>
                    <input
                      type="number" min="0" className="acomp-input mb-2" placeholder="Ej. 350"
                      value={precioCalc} onChange={e => setPrecioCalc(e.target.value)}
                    />
                    {precioNum > 0 && (
                      <div className="small" style={{ color: 'var(--text-primary)' }}>
                        <div>Comisión plataforma: <strong>−${tarifaComision.toFixed(2)}</strong> por atleta</div>
                        <div>Si el <strong>atleta</strong> absorbe la comisión bancaria → recibes ≈ <strong>${netoAtletaAbsorbe.toFixed(2)}</strong> por atleta</div>
                        <div>Si <strong>tú</strong> absorbes la comisión bancaria → recibes ≈ <strong>${netoBoxAbsorbe.toFixed(2)}</strong> por atleta</div>
                        <div className="text-muted mt-1" style={{ fontSize: '10px' }}>* Comisión bancaria estimada (≈4.1% + $3); el cálculo exacto se aplica al cobrar. Quién la absorbe se configura en tu Stripe.</div>
                      </div>
                    )}
                  </div>
                )}

                <div className="d-flex justify-content-end gap-2 mt-3">
                  <button type="button" className="acomp-btn-cancel-sm" onClick={() => setMostrarFormComp(false)}>Cancelar</button>
                  <BotonSeguro type="submit" disabled={creandoExpress || (!esB && !planSeleccionado)} className="acomp-btn-submit" textoProcesando="Creando...">
                    <i className="fas fa-bolt"></i> {esB ? 'Crear competencia (gratis)' : 'Crear con paquete'}
                  </BotonSeguro>
                </div>
              </form>
            </div>
          </div>
          );
        })()}

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
                          : `${new Date(comp.fechaInicio).toLocaleDateString('es-MX', { timeZone: 'UTC' })} — ${new Date(comp.fechaFin).toLocaleDateString('es-MX', { timeZone: 'UTC' })}`}
                      </p>
                    </div>
                    {comp.saaS_Estatus === 'Configurando' ? (
                      <span className="badge bg-warning text-dark"><i className="fas fa-lock me-1"></i>Pago Pendiente</span>
                    ) : user?.rol === 'Developer' ? (
                      // Developer: puede forzar cualquier estatus para pruebas; "Automático" suelta el control.
                      <EstatusPickerModal
                        estatus={comp.estatus || 'Borrador'}
                        manualFijo={comp.estadoManualFijo}
                        todasLasOpciones
                        incluirAuto
                        onCambiar={(v) => cambiarEstatusDev(comp.idCompetencia || comp.IdCompetencia, v, comp.nombre)}
                      />
                    ) : (
                      // El estatus es AUTOMÁTICO según las fechas: badge de solo lectura (ya no se cambia a mano).
                      <span
                        className={`badge ${
                          comp.estatus === 'Inscripciones' ? 'bg-info' :
                          comp.estatus === 'Activa' ? 'bg-success' :
                          comp.estatus === 'Historial' ? 'bg-secondary' :
                          comp.estatus === 'Archivada' ? 'bg-dark' : 'bg-light text-dark'
                        }`}
                        title="El estatus se actualiza automáticamente según las fechas de inscripción y del evento"
                      >
                        {comp.estatus === 'Activa' ? 'En Vivo' : (comp.estatus || 'Borrador')}
                      </span>
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
                    {user?.rol === 'Developer' && comp.estatus === 'Historial' && comp.saaS_Estatus !== 'Archivada_SoloLectura' && comp.saaS_Estatus !== 'Configurando' && (
                      <BotonSeguro
                        className="btn btn-sm btn-outline-warning ms-1"
                        title="Cobrar atletas excedentes a la tarjeta retenida del organizador y archivar"
                        textoProcesando="Cobrando..."
                        onClick={() => cobrarExcedentes(comp.idCompetencia || comp.IdCompetencia, comp.nombre)}
                      >
                        <i className="fas fa-coins me-1" style={{ fontSize: '0.7rem' }}></i>Excedentes
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
                  ) : comp.saaS_Estatus === 'PendientePagoManual' ? (
                    <div className="p-4 text-center bg-dark border-top border-secondary border-opacity-50">
                      <i className="fas fa-clock fs-1 text-info mb-3"></i>
                      <h5 className="text-white mb-2">Pago manual en revisión</h5>
                      <p className="text-secondary small mb-3">{user?.rol === 'Developer' ? 'El box reportó un pago manual del módulo. Apruébalo para activar la competencia.' : 'Registramos tu pago manual. En cuanto Atletify lo confirme, se activará tu competencia.'}</p>
                      {user?.rol === 'Developer' && (
                        <button className="btn btn-success fw-bold px-4 rounded-pill" onClick={() => aprobarPagoModulo(comp.idCompetencia || comp.IdCompetencia, comp.nombre)}>
                          <i className="fas fa-check-circle me-2"></i>Aprobar pago del módulo
                        </button>
                      )}
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
      </div>

      {/* === MODAL WIZARD CATEGORÍA === */}
      {mostrarWizard && (
        <div className="acomp-wiz-overlay" tabIndex="-1">
          <div className="acomp-wiz-panel">
            <div className="acomp-wiz-header">
              <div>
                <p className="acomp-wiz-supertitle">{editandoCat ? 'Editar Categoría' : 'Nueva Categoría'}</p>
                <h2 className="acomp-wiz-title">
                  {pasoWizard === 1 && 'Nombre'}
                  {pasoWizard === 2 && 'Integrantes'}
                  {pasoWizard === 3 && 'Distribución de Sexo'}
                  {pasoWizard === 4 && 'Distribución de Niveles'}
                  {pasoWizard === 5 && 'Costos y Cupos'}
                </h2>
              </div>
              <button className="acomp-wiz-close" onClick={cancelarWizardCategoria} aria-label="Cerrar">
                <i className="fas fa-times" />
              </button>
            </div>

            <div className="acomp-wiz-steps">
              {['Nombre', 'Integrantes', 'Sexo', 'Niveles', 'Costos'].map((label, idx) => {
                const stepNum = idx + 1;
                const isActive = pasoWizard === stepNum;
                const isDone = pasoWizard > stepNum;
                return (
                  <Fragment key={stepNum}>
                    <div className="acomp-wiz-step">
                      <span className={`acomp-wiz-step-dot${isActive ? ' acomp-wiz-step-dot--active' : isDone ? ' acomp-wiz-step-dot--done' : ''}`}>
                        {isDone ? <i className="fas fa-check" style={{ fontSize: '0.55rem' }} /> : stepNum}
                      </span>
                      <span className={`acomp-wiz-step-label${isActive ? ' acomp-wiz-step-label--active' : ''}`}>{label}</span>
                    </div>
                    {idx < 4 && <div className="acomp-wiz-step-line" />}
                  </Fragment>
                );
              })}
            </div>

            <div className="acomp-wiz-body">
              {pasoWizard === 1 && (
                <div>
                  <label className="acomp-label"><i className="fas fa-tag me-1" />Nombre de la categoría</label>
                  <input
                    type="text"
                    className="acomp-input"
                    placeholder="Ej. RX Equipo Mixto"
                    value={formCat.nombre}
                    onChange={e => setFormCat({ ...formCat, nombre: e.target.value })}
                    autoFocus
                  />
                </div>
              )}

              {pasoWizard === 2 && (
                <div>
                  <label className="acomp-label"><i className="fas fa-users me-1" />Cantidad de Integrantes</label>
                  <input
                    type="number"
                    min="1"
                    max={9999}
                    className="acomp-input"
                    value={formCat.cantidadIntegrantes}
                    onFocus={e => e.target.select()}
                    onBlur={e => { if (e.target.value === '') setFormCat({ ...formCat, cantidadIntegrantes: 1, esEquipo: false }); }}
                    onChange={e => {
                      const val = Math.min(parseInt(e.target.value) || 1, 9999);
                      setFormCat({ ...formCat, cantidadIntegrantes: val, esEquipo: val > 1 });
                    }}
                    autoFocus
                    style={{ fontSize: '1.5rem', fontFamily: 'var(--font-stats)', textAlign: 'center', fontWeight: 700 }}
                  />
                  <div className="acomp-wiz-status mt-3" style={{ background: formCat.esEquipo ? 'rgba(79,195,247,0.1)' : 'rgba(46,204,113,0.1)', border: `1px solid ${formCat.esEquipo ? 'rgba(79,195,247,0.3)' : 'rgba(46,204,113,0.3)'}`, color: formCat.esEquipo ? 'var(--accent-cool)' : 'var(--success)' }}>
                    {formCat.esEquipo
                      ? <><i className="fas fa-users me-2" />Modalidad por Equipo</>
                      : <><i className="fas fa-user me-2" />Modalidad Individual</>
                    }
                  </div>
                </div>
              )}

              {pasoWizard === 3 && (() => {
                const integrantes = Number(formCat.cantidadIntegrantes) || 1;
                const totalSexo = Number(formCat.cupoHombres) + Number(formCat.cupoMujeres);
                const sexoOk = totalSexo === integrantes;
                return (
                  <div>
                    <p className="acomp-label mb-2">Distribuye exactamente <strong style={{ color: 'var(--text-primary)' }}>{integrantes}</strong> cupo(s).</p>
                    <div className="acomp-wiz-sexo-grid">
                      <div className="acomp-wiz-sexo-card" style={{ '--sx-c': '#4FC3F7' }}>
                        <div className="acomp-wiz-sexo-label" style={{ color: '#4FC3F7' }}>
                          <i className="fas fa-mars" /><span>Hombres</span>
                        </div>
                        <input
                          type="number"
                          min="0"
                          max={integrantes}
                          className="acomp-wiz-sexo-input"
                          style={{ color: '#4FC3F7' }}
                          value={formCat.cupoHombres}
                          onFocus={e => e.target.select()}
                          onBlur={e => { if (e.target.value === '') setFormCat({ ...formCat, cupoHombres: 0 }); }}
                          onChange={e => { if (e.target.value.length <= 4) setFormCat({ ...formCat, cupoHombres: e.target.value }); }}
                        />
                      </div>
                      <div className="acomp-wiz-sexo-card" style={{ '--sx-c': '#ff7fa8' }}>
                        <div className="acomp-wiz-sexo-label" style={{ color: '#ff7fa8' }}>
                          <i className="fas fa-venus" /><span>Mujeres</span>
                        </div>
                        <input
                          type="number"
                          min="0"
                          max={integrantes}
                          className="acomp-wiz-sexo-input"
                          style={{ color: '#ff7fa8' }}
                          value={formCat.cupoMujeres}
                          onFocus={e => e.target.select()}
                          onBlur={e => { if (e.target.value === '') setFormCat({ ...formCat, cupoMujeres: 0 }); }}
                          onChange={e => { if (e.target.value.length <= 4) setFormCat({ ...formCat, cupoMujeres: e.target.value }); }}
                        />
                      </div>
                    </div>
                    <div className={`acomp-wiz-status ${sexoOk ? 'acomp-wiz-status--ok' : 'acomp-wiz-status--warn'}`}>
                      {sexoOk
                        ? <><i className="fas fa-check-circle me-1" /><span>Distribución correcta ({totalSexo}/{integrantes})</span></>
                        : <><i className="fas fa-exclamation-circle me-1" /><span>Debes sumar {integrantes} exactos (Actual: {totalSexo})</span></>
                      }
                    </div>
                  </div>
                );
              })()}

              {pasoWizard === 4 && (() => {
                const integrantes = Number(formCat.cantidadIntegrantes) || 1;
                const totalNivel = Number(formCat.cupoMaster) + Number(formCat.cupoAvanzado) + Number(formCat.cupoIntermedio) + Number(formCat.cupoPrincipiante) + Number(formCat.cupoNovato);
                const nivelOk = totalNivel === integrantes;
                const niveles = [
                  { key: 'cupoMaster',       nombre: 'Master',        desc: 'Élite — alto rendimiento',  color: 'var(--accent)' },
                  { key: 'cupoAvanzado',     nombre: 'Avanzado / RX', desc: 'Competitivo avanzado',      color: 'var(--primary)' },
                  { key: 'cupoIntermedio',   nombre: 'Intermedio',     desc: 'Nivel intermedio',          color: '#4FC3F7' },
                  { key: 'cupoPrincipiante', nombre: 'Principiante',   desc: 'En desarrollo',             color: 'var(--success)' },
                  { key: 'cupoNovato',       nombre: 'Novato',         desc: 'Comenzando',                color: 'var(--secondary)' },
                ];
                return (
                  <div>
                    <p className="acomp-label mb-2">Distribuye exactamente <strong style={{ color: 'var(--text-primary)' }}>{integrantes}</strong> cupo(s).</p>
                    <div className="acomp-wiz-nivel-grid">
                      {niveles.map(niv => (
                        <div key={niv.key} className="acomp-wiz-nivel-row" style={{ '--niv-c': niv.color }}>
                          <div className="acomp-wiz-nivel-info">
                            <p className="acomp-wiz-nivel-nombre" style={{ color: niv.color }}>{niv.nombre}</p>
                            <p className="acomp-wiz-nivel-desc">{niv.desc}</p>
                          </div>
                          <input
                            type="number"
                            min="0"
                            max={integrantes}
                            className="acomp-wiz-nivel-input"
                            style={{ color: niv.color }}
                            value={formCat[niv.key]}
                            onFocus={e => e.target.select()}
                            onBlur={e => { if (e.target.value === '') setFormCat({ ...formCat, [niv.key]: 0 }); }}
                            onChange={e => { if (e.target.value.length <= 4) setFormCat({ ...formCat, [niv.key]: e.target.value }); }}
                          />
                        </div>
                      ))}
                    </div>
                    <div className={`acomp-wiz-status ${nivelOk ? 'acomp-wiz-status--ok' : 'acomp-wiz-status--warn'}`}>
                      {nivelOk
                        ? <><i className="fas fa-check-circle me-1" /><span>Distribución correcta ({totalNivel}/{integrantes})</span></>
                        : <><i className="fas fa-exclamation-circle me-1" /><span>Debes sumar {integrantes} exactos (Actual: {totalNivel})</span></>
                      }
                    </div>
                  </div>
                );
              })()}

              {pasoWizard === 5 && (
                <div className="row g-3">
                  <div className="col-6">
                    <label className="acomp-label"><i className="fas fa-dollar-sign me-1" />Costo de Inscripción</label>
                    <input
                      type="number"
                      min="0"
                      max={9999}
                      className="acomp-input"
                      placeholder="0.00"
                      value={formCat.costo}
                      onFocus={e => e.target.select()}
                      onBlur={e => { if (e.target.value === '') setFormCat({ ...formCat, costo: 0 }); }}
                      onChange={e => { if (e.target.value.length <= 5) setFormCat({ ...formCat, costo: e.target.value }); }}
                      style={{ color: 'var(--success)', fontFamily: 'var(--font-stats)', fontWeight: 700, fontSize: '1.3rem', textAlign: 'center' }}
                      autoFocus
                    />
                  </div>
                  <div className="col-6">
                    <label className="acomp-label"><i className="fas fa-ticket-alt me-1" />Cupo Máximo</label>
                    <input
                      type="number"
                      min="1"
                      max={9999}
                      className="acomp-input"
                      value={formCat.cupoMaximo}
                      onFocus={e => e.target.select()}
                      onBlur={e => { if (e.target.value === '') setFormCat({ ...formCat, cupoMaximo: 1 }); }}
                      onChange={e => { if (e.target.value.length <= 4) setFormCat({ ...formCat, cupoMaximo: e.target.value }); }}
                      style={{ fontFamily: 'var(--font-stats)', fontWeight: 700, fontSize: '1.3rem', textAlign: 'center' }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="acomp-wiz-footer">
              {pasoWizard > 1 ? (
                <button className="acomp-btn-cancel-sm" onClick={() => setPasoWizard(p => p - 1)}>
                  <i className="fas fa-arrow-left me-1" />Atrás
                </button>
              ) : (
                <button className="acomp-btn-cancel-sm" onClick={cancelarWizardCategoria}>Cancelar</button>
              )}
              {pasoWizard < 5 ? (
                <button className="acomp-btn-submit" onClick={() => {
                  if (pasoWizard === 1 && !formCat.nombre) return alert('Ingresa un nombre');
                  if (pasoWizard === 3 && (Number(formCat.cupoHombres) + Number(formCat.cupoMujeres) !== Number(formCat.cantidadIntegrantes))) return alert('La distribución de sexo no cuadra con la cantidad de integrantes');
                  if (pasoWizard === 4 && (Number(formCat.cupoMaster) + Number(formCat.cupoAvanzado) + Number(formCat.cupoIntermedio) + Number(formCat.cupoPrincipiante) + Number(formCat.cupoNovato) !== Number(formCat.cantidadIntegrantes))) return alert('La distribución de niveles no cuadra con la cantidad de integrantes');
                  setPasoWizard(p => p + 1);
                }}>
                  Siguiente<i className="fas fa-arrow-right ms-2" />
                </button>
              ) : (
                <BotonSeguro className="acomp-btn-submit" onClick={(e) => {
                  if (!formCat.costo) return alert('Ingresa un costo válido');
                  guardarCategoria(e);
                }} textoProcesando="Guardando...">
                  <i className="fas fa-check-circle me-1" />Finalizar
                </BotonSeguro>
              )}
            </div>
          </div>
        </div>
      )}

      {/* === MODAL DETALLES CATEGORÍA === */}
      {mostrarDetalles && categoriaDetalle && (
        <div className="acomp-wiz-overlay" tabIndex="-1">
          <div className="acomp-wiz-panel acomp-wiz-panel--accent">
            <div className="acomp-wiz-header">
              <div>
                <p className="acomp-wiz-supertitle" style={{ color: 'var(--accent)' }}>Detalle</p>
                <h2 className="acomp-wiz-title">La Receta</h2>
              </div>
              <button className="acomp-wiz-close" onClick={() => setMostrarDetalles(false)} aria-label="Cerrar">
                <i className="fas fa-times" />
              </button>
            </div>

            <div className="acomp-wiz-body">
              <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
                <h3 style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                  {categoriaDetalle.nombre || categoriaDetalle.Nombre}
                </h3>
                <span style={{ fontFamily: 'var(--font-heading-alt)', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, color: 'var(--text-muted)', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, padding: '0.2rem 0.85rem' }}>
                  {(categoriaDetalle.esEquipo || categoriaDetalle.EsEquipo) ? 'Modalidad por Equipo' : 'Modalidad Individual'}
                </span>
              </div>

              <div className="row g-2 mb-3">
                <div className="col-6">
                  <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '0.85rem', textAlign: 'center' }}>
                    <i className="fas fa-users mb-1" style={{ color: 'var(--text-muted)', display: 'block' }} />
                    <span style={{ fontFamily: 'var(--font-stats)', fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block' }}>{categoriaDetalle.cantidadIntegrantes || categoriaDetalle.CantidadIntegrantes}</span>
                    <small style={{ color: 'var(--text-muted)', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: 1 }}>Integrantes</small>
                  </div>
                </div>
                <div className="col-6">
                  <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '0.85rem', textAlign: 'center' }}>
                    <i className="fas fa-ticket-alt mb-1" style={{ color: 'var(--accent)', display: 'block' }} />
                    <span style={{ fontFamily: 'var(--font-stats)', fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block' }}>{categoriaDetalle.cupoMaximo || categoriaDetalle.CupoMaximo}</span>
                    <small style={{ color: 'var(--text-muted)', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: 1 }}>Cupo Máximo</small>
                  </div>
                </div>
              </div>

              <p className="acomp-label mb-2">Distribución</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1rem' }}>
                {(categoriaDetalle.cupoHombres > 0 || categoriaDetalle.CupoHombres > 0) && (
                  <span style={{ fontFamily: 'var(--font-heading-alt)', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, background: 'rgba(79,195,247,0.1)', border: '1px solid rgba(79,195,247,0.3)', color: '#4FC3F7', borderRadius: 20, padding: '0.25rem 0.75rem' }}>
                    <i className="fas fa-mars me-1" />{categoriaDetalle.cupoHombres || categoriaDetalle.CupoHombres} Hombres
                  </span>
                )}
                {(categoriaDetalle.cupoMujeres > 0 || categoriaDetalle.CupoMujeres > 0) && (
                  <span style={{ fontFamily: 'var(--font-heading-alt)', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, background: 'rgba(255,127,168,0.1)', border: '1px solid rgba(255,127,168,0.3)', color: '#ff7fa8', borderRadius: 20, padding: '0.25rem 0.75rem' }}>
                    <i className="fas fa-venus me-1" />{categoriaDetalle.cupoMujeres || categoriaDetalle.CupoMujeres} Mujeres
                  </span>
                )}
                {(categoriaDetalle.cupoMaster > 0 || categoriaDetalle.CupoMaster > 0) && (
                  <span style={{ fontFamily: 'var(--font-heading-alt)', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, background: 'rgba(245,166,35,0.1)', border: '1px solid rgba(245,166,35,0.3)', color: 'var(--accent)', borderRadius: 20, padding: '0.25rem 0.75rem' }}>
                    🏆 {categoriaDetalle.cupoMaster || categoriaDetalle.CupoMaster} Master
                  </span>
                )}
                {(categoriaDetalle.cupoAvanzado > 0 || categoriaDetalle.CupoAvanzado > 0) && (
                  <span style={{ fontFamily: 'var(--font-heading-alt)', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, background: 'rgba(230,57,70,0.1)', border: '1px solid rgba(230,57,70,0.3)', color: 'var(--primary)', borderRadius: 20, padding: '0.25rem 0.75rem' }}>
                    ⚡ {categoriaDetalle.cupoAvanzado || categoriaDetalle.CupoAvanzado} Avanzado
                  </span>
                )}
                {(categoriaDetalle.cupoIntermedio > 0 || categoriaDetalle.CupoIntermedio > 0) && (
                  <span style={{ fontFamily: 'var(--font-heading-alt)', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, background: 'rgba(79,195,247,0.1)', border: '1px solid rgba(79,195,247,0.3)', color: '#4FC3F7', borderRadius: 20, padding: '0.25rem 0.75rem' }}>
                    💪 {categoriaDetalle.cupoIntermedio || categoriaDetalle.CupoIntermedio} Intermedio
                  </span>
                )}
                {(categoriaDetalle.cupoPrincipiante > 0 || categoriaDetalle.CupoPrincipiante > 0) && (
                  <span style={{ fontFamily: 'var(--font-heading-alt)', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, background: 'rgba(46,204,113,0.1)', border: '1px solid rgba(46,204,113,0.3)', color: 'var(--success)', borderRadius: 20, padding: '0.25rem 0.75rem' }}>
                    🌱 {categoriaDetalle.cupoPrincipiante || categoriaDetalle.CupoPrincipiante} Principiante
                  </span>
                )}
                {(categoriaDetalle.cupoNovato > 0 || categoriaDetalle.CupoNovato > 0) && (
                  <span style={{ fontFamily: 'var(--font-heading-alt)', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, background: 'rgba(108,117,125,0.1)', border: '1px solid rgba(108,117,125,0.3)', color: 'var(--secondary)', borderRadius: 20, padding: '0.25rem 0.75rem' }}>
                    🔰 {categoriaDetalle.cupoNovato || categoriaDetalle.CupoNovato} Novato
                  </span>
                )}
              </div>

              <div style={{ background: 'rgba(46,204,113,0.08)', border: '1px solid rgba(46,204,113,0.25)', borderRadius: 12, padding: '0.85rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: 'var(--font-heading-alt)', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--success)' }}>
                  <i className="fas fa-dollar-sign me-1" />Costo de Inscripción
                </span>
                <span style={{ fontFamily: 'var(--font-stats)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--success)' }}>
                  ${categoriaDetalle.costo || categoriaDetalle.Costo}
                </span>
              </div>
            </div>

            <div className="acomp-wiz-footer" style={{ justifyContent: 'flex-end' }}>
              <button className="acomp-btn-cancel-sm" onClick={() => setMostrarDetalles(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* === MODAL DETALLES ATLETA === */}
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

        return (
          <div className="acomp-wiz-overlay" tabIndex="-1">
            <div className="acomp-wiz-panel">
              <div className="acomp-wiz-header">
                <div>
                  <p className="acomp-wiz-supertitle">Expediente</p>
                  <h2 className="acomp-wiz-title">Atleta</h2>
                </div>
                <button className="acomp-wiz-close" onClick={() => setMostrarDetallesAtleta(false)} aria-label="Cerrar">
                  <i className="fas fa-times" />
                </button>
              </div>

              <div className="acomp-wiz-body">
                <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
                  <i className={`fas ${esMasc ? 'fa-male' : 'fa-female'}`} style={{ fontSize: '2.5rem', color: sexColor, marginBottom: '0.5rem', display: 'block' }} />
                  <h4 style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-primary)', marginBottom: '0.2rem' }}>
                    {atletaDetalle.nombreCompleto} {atletaDetalle.apellidos}
                  </h4>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: 0 }}>{atletaDetalle.correo || 'Sin correo registrado'}</p>
                </div>

                <div className="row g-2 mb-3">
                  {[
                    { label: 'Edad',           value: `${edad} años`,                      icon: 'fa-birthday-cake', color: 'var(--text-muted)' },
                    { label: 'Playera',        value: atletaDetalle.tallaPlayera || 'N/A', icon: 'fa-tshirt',        color: 'var(--text-muted)' },
                    { label: 'Tipo de Sangre', value: atletaDetalle.tipoSangre || 'N/A',   icon: 'fa-tint',          color: 'var(--primary)' },
                    { label: 'Nivel Declarado',value: atletaDetalle.nivelHabilidad,        icon: 'fa-layer-group',   color: 'var(--accent)' },
                  ].map(item => (
                    <div key={item.label} className="col-6">
                      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '0.7rem 0.85rem' }}>
                        <small style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem', fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                          <i className={`fas ${item.icon} me-1`} style={{ color: item.color }} />{item.label}
                        </small>
                        <span style={{ fontFamily: 'var(--font-heading-alt)', fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>{item.value}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {!atletaDetalle.esEquipo && (
                  <>
                    <div style={{ background: 'rgba(46,204,113,0.08)', border: '1px solid rgba(46,204,113,0.25)', borderRadius: 10, padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                      <span style={{ fontFamily: 'var(--font-heading-alt)', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--success)' }}>
                        <i className="fas fa-dollar-sign me-1" />Costo de Inscripción
                      </span>
                      <span style={{ fontFamily: 'var(--font-stats)', fontSize: '1.3rem', fontWeight: 700, color: 'var(--success)' }}>${atletaDetalle.costoCategoria} MXN</span>
                    </div>
                    {escalo && (
                      <div style={{ background: 'rgba(245,166,35,0.08)', border: '1px solid rgba(245,166,35,0.3)', borderRadius: 10, padding: '0.75rem 1rem', marginBottom: '0.6rem' }}>
                        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--accent)' }}>
                          <i className="fas fa-exclamation-triangle me-2" />
                          <strong>Escaló de Categoría:</strong> Su nivel real es <strong>{atletaDetalle.nivelHabilidad}</strong> pero asumió el riesgo para competir en <strong>{catNivelStr}</strong>.
                        </p>
                      </div>
                    )}
                  </>
                )}

                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '0.75rem 1rem', textAlign: 'center' }}>
                  <small style={{ color: 'var(--text-muted)', fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: '0.4rem' }}>Carta Responsiva</small>
                  {atletaDetalle.aceptoCartaResponsiva ? (
                    <>
                      <i className="fas fa-check-circle" style={{ color: 'var(--success)', fontSize: '1.4rem', display: 'block', marginBottom: '0.25rem' }} />
                      <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--success)' }}>Aceptada el: {atletaDetalle.fechaAceptacionCartaResponsiva ? new Date(atletaDetalle.fechaAceptacionCartaResponsiva).toLocaleDateString() : 'N/A'}</p>
                    </>
                  ) : (
                    <>
                      <i className="fas fa-times-circle" style={{ color: 'var(--primary)', fontSize: '1.4rem', display: 'block', marginBottom: '0.25rem' }} />
                      <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--primary)' }}>Falta Aceptar</p>
                    </>
                  )}
                </div>
              </div>

              <div className="acomp-wiz-footer" style={{ justifyContent: 'flex-end' }}>
                <button className="acomp-btn-cancel-sm" onClick={() => setMostrarDetallesAtleta(false)}>Cerrar</button>
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
  );
}
