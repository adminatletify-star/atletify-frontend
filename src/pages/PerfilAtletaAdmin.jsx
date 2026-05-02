import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import BackButton from '../components/BackButton';
import DiasCongelarPicker from '../components/DiasCongelarPicker';
import RedGrayDatePicker from '../components/RedGrayDatePicker';
import '../assets/css/PerfilAtletaAdmin.css';
import BotonSeguro from '../components/BotonSeguro';

const API_USUARIOS = 'https://localhost:7149/api/usuarios';
const API_COBRANZA = 'https://localhost:7149/api/cobranza';
const API_PRECIO = 'https://localhost:7149/api/precioespecial';

export default function PerfilAtletaAdmin() {
  const { idUsuario } = useParams();
  const navigate = useNavigate();
  const { usuario } = useAuth();

  const token = localStorage.getItem('token');
  const headersGet = { 'Authorization': `Bearer ${token}` };
  const headersPost = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

  const [atleta, setAtleta] = useState(null);
  const [finanzas, setFinanzas] = useState(null);
  const [loading, setLoading] = useState(true);
  const [descuentosActivos, setDescuentosActivos] = useState([]);
  const [paginaHistorial, setPaginaHistorial] = useState(1);
  const itemsPorPagina = 5;
  const [calculoActivo, setCalculoActivo] = useState(null); // Resultado de la calculadora del backend

  // MODALES V3 - MÁS COMPLETOS Y CON VALIDACIONES
  const [showModalPago, setShowModalPago] = useState(false);
  const [formPago, setFormPago] = useState({ 
    monto1: '', metodo1: 'Efectivo', 
    monto2: '', metodo2: '', 
    notas: '', usarSaldoAFavor: false, idDescuento: '', cobrarInscripcion: false, montoInscripcion: '300' 
  });
  
  const [showModalCongelar, setShowModalCongelar] = useState(false);
  const [formCongelar, setFormCongelar] = useState({ dias: '15', motivo: '' });
  const [showModalEditar, setShowModalEditar] = useState(false);
  const [formEditar, setFormEditar] = useState({ nuevaFechaVencimiento: '', motivoAjuste: '', nuevoEstatus: '' });
   const [precioEspecial, setPrecioEspecial] = useState(null);
  const [showModalPrecio, setShowModalPrecio] = useState(false);
  const [formPrecio, setFormPrecio] = useState({
    tipoDescuento: 'PrecioFijo',
    valorDescuento: '',
    motivo: '',
    exentoInscripcion: false,
    fechaExpiracion: ''
  });

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    try {
      const b = JSON.parse(localStorage.getItem('box'));
      const resPrecio = await fetch(`${API_PRECIO}/atleta/${idUsuario}/box/${b.idBox}`, { headers: headersGet });
      if (resPrecio.ok) {
        const dataPrecio = await resPrecio.json();
        setPrecioEspecial(dataPrecio.existe ? dataPrecio : null);
      }
      const [resAtleta, resFinanzas, resDescuentos] = await Promise.all([
        fetch(`${API_USUARIOS}/${idUsuario}`, { headers: headersGet }),
        fetch(`${API_COBRANZA}/atleta/${idUsuario}`, { headers: headersGet }),
        fetch(`https://localhost:7149/api/finanzas/descuentos/${b.idBox}`, { headers: headersGet })
      ]);
      

      if (resAtleta.ok) setAtleta(await resAtleta.json());
      if (resDescuentos.ok) setDescuentosActivos((await resDescuentos.json()).filter(d => d.activo));
      
      if (resFinanzas.ok) {
        const dataFinanzas = await resFinanzas.json();
        setFinanzas(dataFinanzas);
        if(dataFinanzas.suscripcion) {
          setFormEditar({
            nuevaFechaVencimiento: new Date(dataFinanzas.suscripcion.fechaVencimiento).toISOString().split('T')[0],
            motivoAjuste: '', nuevoEstatus: dataFinanzas.suscripcion.estatus
          });
        }
      }
    } catch (error) { console.error("Error:", error); } finally { setLoading(false); }
  }, [idUsuario]);

  useEffect(() => { cargarDatos(); }, [cargarDatos]);

    // --- PUNTO DE VENTA V4 (Conectado a la Calculadora del Backend) ---
  const precioBase = calculoActivo?.precioBase || 0;
  const precioConDescuento = calculoActivo?.precioFinal || precioBase;
  const montoDescuentoAuto = calculoActivo?.montoDescuento || 0;
  const descuentoTexto = calculoActivo?.descuentoAplicado || 'Ninguno';
 
  // Inscripción: la calculadora ya nos dice si debe o no
  const inscripcionAutomatica = calculoActivo?.debeInscripcion || false;
  const montoInscripcionAuto = calculoActivo?.montoInscripcion || 0;
 
  // La Coach puede agregar una promo ADICIONAL del box (Buen Fin, etc.)
  const descSeleccionado = descuentosActivos.find(d => d.idDescuento === parseInt(formPago.idDescuento));
  const descuentoPromoExtra = descSeleccionado ? (precioConDescuento * (descSeleccionado.porcentaje / 100)) : 0;
 
  // Inscripción: si la calculadora dice que debe, se activa automáticamente.
  // La Coach puede desactivarlo manualmente si quiere perdonar la inscripción.
  const cobrarInscripcionFinal = formPago.cobrarInscripcion ? (parseFloat(formPago.montoInscripcion) || montoInscripcionAuto) : 0;
 
  // Saldo a favor
  const saldoAplicado = formPago.usarSaldoAFavor ? (atleta?.saldoAFavor || 0) : 0;
 
  // TOTAL FINAL: precio con descuento personal - promo extra + inscripción - saldo
  const totalACobrar = Math.max(0, (precioConDescuento - descuentoPromoExtra) + cobrarInscripcionFinal - saldoAplicado);
  const restante = totalACobrar - (parseFloat(formPago.monto1) || 0);
 
  // Auto-calcular el segundo método de pago
  useEffect(() => {
    if (restante > 0 && formPago.monto1 !== '') {
      setFormPago(prev => ({ ...prev, monto2: restante }));
    } else {
      setFormPago(prev => ({ ...prev, monto2: '', metodo2: '' }));
    }
  }, [restante, formPago.monto1]);
 
  // Cuando se abre el modal, pre-activar inscripción si la calculadora dice que debe
  useEffect(() => {
    if (showModalPago && calculoActivo) {
      setFormPago(prev => ({
        ...prev,
        cobrarInscripcion: calculoActivo.debeInscripcion,
        montoInscripcion: String(calculoActivo.montoInscripcion || 0)
      }));
    }
  }, [showModalPago, calculoActivo]);


  useEffect(() => {
    if (restante > 0 && formPago.monto1 !== '') {
      setFormPago(prev => ({ ...prev, monto2: restante }));
    } else {
      setFormPago(prev => ({ ...prev, monto2: '', metodo2: '' }));
    }
  }, [restante, formPago.monto1]);

  const registrarPago = async (e) => {
    e.preventDefault();
    const m1 = parseFloat(formPago.monto1) || 0;
    const m2 = parseFloat(formPago.monto2) || 0;
    
    if ((m1 + m2) < totalACobrar) {
        return alert(`Faltan $${totalACobrar - (m1 + m2)}. El sistema V3 exige el pago completo.`);
    }

    try {
      const res = await fetch(`${API_COBRANZA}/pagar`, {
        method: 'POST', headers: headersPost,
        body: JSON.stringify({
          idSuscripcion: finanzas.suscripcion.idSuscripcion,
          montoMetodo1: m1, metodoPago1: formPago.metodo1,
          montoMetodo2: m2 > 0 ? m2 : null, metodoPago2: m2 > 0 ? formPago.metodo2 : null,
          notas: formPago.notas, usarSaldoAFavor: formPago.usarSaldoAFavor,
          cobrarInscripcion: formPago.cobrarInscripcion, idDescuento: formPago.idDescuento ? parseInt(formPago.idDescuento) : null
        })
      });
      if (res.ok) {
        alert("¡Suscripción Activada con Éxito!");
        setShowModalPago(false);
        setFormPago({ monto1: '', metodo1: 'Efectivo', monto2: '', metodo2: '', notas: '', usarSaldoAFavor: false, idDescuento: '', cobrarInscripcion: false, montoInscripcion: '300' });
        cargarDatos();
      }
    } catch (e) { alert("Error al registrar el pago."); }
  };

  const congelarPlan = async (e) => {
    e.preventDefault();
    if (!formCongelar.motivo.trim()) { alert("Por favor ingresa un motivo de congelación."); return; }
    try {
      const res = await fetch(`${API_COBRANZA}/congelar`, {
        method: 'POST', headers: headersPost,
        body: JSON.stringify({ idSuscripcion: finanzas.suscripcion.idSuscripcion, diasACongelar: parseInt(formCongelar.dias), motivo: formCongelar.motivo })
      });
      if (res.ok) { setShowModalCongelar(false); cargarDatos(); }
      else { const err = await res.json().catch(() => ({})); alert(err.mensaje || "No se pudo congelar el plan."); }
    } catch (e) { alert("Error al congelar."); }
  };

  const descongelarPlan = async (idSuscripcion) => {
    if (!window.confirm("¿Descongelar este plan?")) return;
    try {
      const res = await fetch(`${API_COBRANZA}/descongelar/${idSuscripcion}`, { method: 'PUT', headers: headersPost });
      if (res.ok) cargarDatos();
    } catch (e) { alert("Error al descongelar."); }
  };

  const editarSuscripcionManual = async (e) => {
    e.preventDefault();
    if(!window.confirm("¿Estás seguro de modificar este plan manualmente?")) return;
    try {
      const res = await fetch(`${API_COBRANZA}/editar-suscripcion/${finanzas.suscripcion.idSuscripcion}`, {
        method: 'PUT', headers: headersPost,
        body: JSON.stringify({ nuevaFechaVencimiento: new Date(formEditar.nuevaFechaVencimiento).toISOString(), motivoAjuste: formEditar.motivoAjuste || 'Ajuste', nuevoEstatus: formEditar.nuevoEstatus })
      });
      if (res.ok) { setShowModalEditar(false); cargarDatos(); }
    } catch (e) { alert("Error al editar el plan."); }
  };

  const eliminarTransaccion = async (idTransaccion) => {
    if(!window.confirm("¿Seguro que deseas eliminar este recibo?")) return;
    try {
      const res = await fetch(`${API_COBRANZA}/transaccion/${idTransaccion}`, { method: 'DELETE', headers: headersGet });
      if(res.ok) cargarDatos();
    } catch(e) { alert("Error al eliminar"); }
  };

  const darDeBaja = async () => {
    if(!window.confirm(`🚨 ¿Dar de BAJA a ${atleta.nombre}? Perderá su acceso.`)) return;
    try {
      const res = await fetch(`${API_COBRANZA}/dardebaja/${idUsuario}`, { method: 'PUT', headers: headersGet });
      if (res.ok) navigate('/gestion-finanzas');
    } catch (e) { alert("Error al dar de baja."); }
  };

  const togglePaseLibre = async () => {
    // 👇 ADVERTENCIA DE SEGURIDAD AL QUITAR PASE LIBRE 👇
    if (atleta.exentoDePago) {
      if (!window.confirm("🚨 ¿Seguro que deseas quitarle el Pase Libre?\n\nEl atleta quedará inactivo de inmediato y deberá pagar una membresía normal para poder entrar al Box.")) {
        return;
      }
    }
    try {
      const res = await fetch(`${API_COBRANZA}/toggle-exento/${idUsuario}`, { method: 'PUT', headers: headersGet });
      if (res.ok) cargarDatos();
    } catch (e) { alert("Error al cambiar el pase libre."); }
  };

  const toggleConfianza = async () => {
    try {
      const res = await fetch(`${API_USUARIOS}/toggle-confianza/${idUsuario}`, { method: 'PUT', headers: headersGet });
      if (res.ok) cargarDatos();
    } catch (e) { alert("Error al cambiar confianza"); }
  };


   const guardarPrecioEspecial = async () => {
    const b = JSON.parse(localStorage.getItem('box'));
    
    if (!formPrecio.valorDescuento || parseFloat(formPrecio.valorDescuento) < 0) {
      return alert('Ingresa un valor válido para el descuento.');
    }
 
    try {
      const res = await fetch(`${API_PRECIO}`, {
        method: 'POST',
        headers: headersPost,
        body: JSON.stringify({
          idUsuario: parseInt(idUsuario),
          idBox: b.idBox,
          idPlan: null, // Aplica a cualquier plan
          tipoDescuento: formPrecio.tipoDescuento,
          valorDescuento: parseFloat(formPrecio.valorDescuento),
          motivo: formPrecio.motivo,
          exentoInscripcion: formPrecio.exentoInscripcion,
          fechaExpiracion: formPrecio.fechaExpiracion ? new Date(formPrecio.fechaExpiracion).toISOString() : null
        })
      });
 
      if (res.ok) {
        alert('¡Precio especial asignado con éxito!');
        setShowModalPrecio(false);
        setFormPrecio({ tipoDescuento: 'PrecioFijo', valorDescuento: '', motivo: '', exentoInscripcion: false, fechaExpiracion: '' });
        cargarDatos();
      } else {
        const data = await res.json();
        alert(data.mensaje || 'Error al asignar precio especial.');
      }
    } catch (e) { alert('Error de conexión.'); }
  };
 
  const quitarPrecioEspecial = async () => {
    if (!precioEspecial?.idPrecioEspecial) return;
    if (!window.confirm('¿Quitar el precio especial? El atleta volverá a pagar el precio normal del plan.')) return;
 
    try {
      const res = await fetch(`${API_PRECIO}/desactivar/${precioEspecial.idPrecioEspecial}`, {
        method: 'PUT', headers: headersGet
      });
      if (res.ok) {
        alert('Precio especial eliminado.');
        cargarDatos();
      }
    } catch (e) { alert('Error al quitar precio especial.'); }
  };

   const calcularPrecioReal = useCallback(async () => {
    if (!finanzas?.suscripcion) return;
    const b = JSON.parse(localStorage.getItem('box'));
 
    try {
      const res = await fetch(
        `${API_PRECIO}/calcular/${idUsuario}/box/${b.idBox}/plan/${finanzas.suscripcion.idPlan}`,
        { headers: headersGet }
      );
      if (res.ok) {
        const data = await res.json();
        setCalculoActivo(data);
      }
    } catch (e) {
      console.error('Error al calcular precio:', e);
    }
  }, [finanzas, idUsuario]);
 
  // Disparar el cálculo cada vez que cambien las finanzas
  useEffect(() => {
    if (finanzas?.suscripcion) calcularPrecioReal();
  }, [finanzas, calcularPrecioReal]);

  if (loading) return <div className="paa-loading"><div className="spinner-wp"></div></div>;
  if (!atleta) return <div className="paa-not-found"><i className="fas fa-user-slash" style={{ fontSize: '3rem' }}></i><p>Atleta no encontrado.</p></div>;

  return (
    <div className="paa-page">
      <header className="paa-header">
          <div className="d-flex align-items-center gap-3">
            <BackButton />
            <h1 className="paa-header-title">Expediente del Atleta</h1>
          </div>
      </header>

      <div className="container px-3 mt-4">
        <div className="row g-4">

          {/* COLUMNA IZQUIERDA — PERFIL */}
          <div className="col-lg-4 d-flex flex-column gap-3">
            <div className="tarjeta-panel p-4">
              <div className="d-flex gap-3 align-items-start mb-4">
                {(atleta.foto || atleta.Foto) ? <img src={atleta.foto || atleta.Foto} alt="Perfil" className="paa-avatar-img" /> : <div className="paa-avatar-lg">{atleta.nombre?.charAt(0).toUpperCase()}</div>}
                <div className="flex-grow-1" style={{ minWidth: 0 }}>
                  <p className="paa-atleta-nombre text-truncate">{atleta.nombre}</p>
                  <p className="paa-atleta-dato mt-1"><i className="fas fa-envelope"></i><span className="text-truncate">{atleta.correo}</span></p>
                  <p className="paa-atleta-dato"><i className="fas fa-phone"></i>{atleta.telefono || 'Sin teléfono'}</p>
                  <div className="d-flex gap-2 mt-2 flex-wrap">
                    <span className={`badge ${atleta.activo ? 'bg-success' : 'bg-danger'} bg-opacity-75`}>{atleta.estatus}</span>
                    <span className="badge bg-secondary bg-opacity-75">{atleta.categoriaBase || 'RX'}</span>
                  </div>
                </div>
              </div>

              {/*  LA TARJETA DORADA DE VIP  */}
              {atleta.exentoDePago ? (
                 <div className="mb-3 p-3 text-center rounded" style={{ background: 'linear-gradient(45deg, rgba(241, 196, 15, 0.1), rgba(243, 156, 18, 0.2))', border: '1px solid var(--warning)' }}>
                   <i className="fas fa-crown text-warning fs-1 mb-2"></i>
                   <h6 className="text-warning fw-bold mb-0">PASE LIBRE ACTIVO</h6>
                   <small className="text-light opacity-75">Acceso vitalicio sin cobros.</small>
                 </div>
              ) : (
                finanzas?.nombrePlan && (
                  <div className="paa-medical-item mb-3" style={{ background: 'rgba(231,76,60,0.06)', border: '1px solid rgba(231,76,60,0.2)', borderRadius: '10px', padding: '10px 14px' }}>
                    <span className="paa-medical-key"><i className="fas fa-id-badge me-1"></i>Plan Activo</span>
                    <div className="d-flex align-items-center gap-2 flex-wrap">
                      <span style={{ fontFamily: 'var(--font-heading-alt)', fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 700 }}>{finanzas.nombrePlan}</span>
                      {finanzas.suscripcion && (
                        <span className={`badge bg-opacity-75 ${finanzas.suscripcion.estatus === 'Activa' ? 'bg-success' : finanzas.suscripcion.estatus === 'Congelada' ? 'bg-info text-dark' : 'bg-danger'}`} style={{ fontSize: '0.65rem' }}>
                          {finanzas.suscripcion.estatus}
                        </span>
                      )}
                    </div>
                  </div>
                )
              )}

              <div className="paa-toggle-row mb-3 mt-4">
                <input className="form-check-input fs-5 m-0 flex-shrink-0" type="checkbox" role="switch" id="switchPaseLibre" checked={atleta.exentoDePago || false} onChange={togglePaseLibre} />
                <label className="paa-toggle-label" htmlFor="switchPaseLibre"><i className="fas fa-star text-warning me-1"></i>Pase Libre (Staff / Beca)</label>
              </div>

              <div className="paa-toggle-row mb-4">
                <input className="form-check-input fs-5 m-0 flex-shrink-0" type="checkbox" role="switch" id="switchConfianza" checked={atleta.esDeConfianza || false} onChange={toggleConfianza} />
                <label className="paa-toggle-label" htmlFor="switchConfianza"><i className="fas fa-handshake text-info me-1"></i>Atleta de Confianza (Fiado)</label>
              </div>

                      {/*  PRECIO ESPECIAL  */}
              <div className="mb-3 mt-4 p-3 rounded" style={{ background: 'rgba(155, 89, 182, 0.06)', border: '1px solid rgba(155, 89, 182, 0.25)', borderRadius: '12px' }}>
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <p className="fw-bold mb-0" style={{ color: '#9b59b6', fontSize: '0.85rem', fontFamily: 'var(--font-heading)' }}>
                    <i className="fas fa-gem me-2"></i>Precio Especial
                  </p>
                  {precioEspecial ? (
                    <button className="btn btn-sm" onClick={quitarPrecioEspecial} style={{ fontSize: '0.7rem', color: 'var(--danger)', border: '1px solid rgba(231,76,60,0.3)', borderRadius: '8px', padding: '2px 8px' }}>
                      <i className="fas fa-times me-1"></i>Quitar
                    </button>
                  ) : null}
                </div>
 
                {precioEspecial ? (
                  <div>
                    <div className="d-flex align-items-baseline gap-2 mb-1">
                      <span className="fw-bold" style={{ color: '#9b59b6', fontSize: '1.4rem', fontFamily: 'var(--font-stats)' }}>
                        {precioEspecial.tipoDescuento === 'PrecioFijo' && `$${precioEspecial.valorDescuento}`}
                        {precioEspecial.tipoDescuento === 'DescuentoPesos' && `-$${precioEspecial.valorDescuento}`}
                        {precioEspecial.tipoDescuento === 'DescuentoPorcentaje' && `-${precioEspecial.valorDescuento}%`}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        {precioEspecial.tipoDescuento === 'PrecioFijo' ? 'precio fijo' : precioEspecial.tipoDescuento === 'DescuentoPesos' ? 'descuento en pesos' : 'descuento porcentual'}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                      <i className="fas fa-quote-left me-1" style={{ fontSize: '0.6rem' }}></i>
                      {precioEspecial.motivo || 'Sin motivo registrado'}
                    </p>
                    {precioEspecial.exentoInscripcion && (
                      <span className="badge mt-2" style={{ background: 'rgba(243,156,18,0.15)', color: 'var(--warning)', fontSize: '0.65rem' }}>
                        <i className="fas fa-star me-1"></i>Exento de inscripción anual
                      </span>
                    )}
                    {precioEspecial.fechaExpiracion && (
                      <p className="mt-1 mb-0" style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        <i className="fas fa-clock me-1"></i>Expira: {new Date(precioEspecial.fechaExpiracion).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-2">
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                      Este atleta paga el precio normal del plan.
                    </p>
                    <button className="btn btn-sm" onClick={() => setShowModalPrecio(true)} style={{ background: 'rgba(155,89,182,0.15)', color: '#9b59b6', border: '1px solid rgba(155,89,182,0.3)', borderRadius: '8px', fontSize: '0.8rem', padding: '6px 16px' }}>
                      <i className="fas fa-plus me-1"></i>Asignar Precio Especial
                    </button>
                  </div>
                )}
              </div>

              <hr className="separador" />
              <p className="paa-section-label"><i className="fas fa-notes-medical"></i>Expediente Médico</p>
              <div className="paa-medical-item"><span className="paa-medical-key">Tipo de Sangre</span><span className="paa-medical-val">{atleta.tipoDeSangre || 'No especificado'}</span></div>
              <div className="paa-medical-item"><span className="paa-medical-key">Alergias</span><span className="paa-medical-val">{atleta.alergias || 'Ninguna'}</span></div>
              <div className="paa-medical-item"><span className="paa-medical-key">Condición</span><span className="paa-medical-val">{atleta.tieneDiscapacidad || 'Sano'}</span></div>
              <div className="paa-medical-item mb-4"><span className="paa-medical-key">Contacto Emergencia</span><span className="paa-medical-val">{atleta.contactoEmergenciaNombre || 'No asignado'}</span></div>

              <BotonSeguro onClick={darDeBaja} className="paa-btn-baja" textoProcesando="Procesando..."><i className="fas fa-skull-crossbones"></i>Dar de Baja</BotonSeguro>
            </div>
          </div>

          {/* COLUMNA DERECHA — FINANZAS */}
          <div className="col-lg-8 d-flex flex-column gap-4">

            {/* ESTADO FINANCIERO */}
            <div className="tarjeta-panel p-4">
              <p className="paa-section-label"><i className="fas fa-dollar-sign"></i>Estado Financiero</p>

              {/* 👇 SI ES VIP, NO MOSTRAMOS COBROS 👇 */}
              {atleta.exentoDePago ? (
                <div className="text-center py-5">
                  <i className="fas fa-gem fs-1 text-warning mb-3 opacity-75"></i>
                  <h4 className="text-warning fw-bold">ATLETA VIP</h4>
                  <p className="text-secondary">Este atleta tiene acceso libre a las instalaciones.<br/>No se requiere renovar ni cobrar membresías.</p>
                </div>
              ) : !finanzas?.suscripcion ? (
                <div className="text-center py-4" style={{ color: 'var(--text-muted)' }}>
                  <i className="fas fa-file-invoice-dollar d-block mb-2" style={{ fontSize: '2rem', opacity: 0.4 }}></i>
                  Este atleta no tiene un plan asignado. Ve al Semáforo para renovarlo.
                </div>
              ) : (
                <>
                  <div className="row g-3 mb-3">
                    <div className="col-md-5">
                      <p className="paa-plan-name">Plan Actual</p>
                      <p className="paa-plan-value">{finanzas.nombrePlan}</p>
                      <p className="paa-atleta-dato mt-1"><i className="fas fa-calendar-alt"></i> Vence:&nbsp;<strong style={{ color: 'var(--text-primary)' }}>{finanzas.suscripcion.fechaVencimiento.split('T')[0].split('-').reverse().join('/')}</strong></p>
                    </div>
                    <div className="col-md-7">
                      <div className="paa-deuda-block">
                        <p className="paa-deuda-label">Estatus del Plan</p>
                        <p className="paa-deuda-amount mb-0" style={{ color: finanzas.suscripcion.estatus === 'Activa' ? 'var(--success)' : 'var(--danger)' }}>
                          {finanzas.suscripcion.estatus}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="d-flex gap-2 flex-wrap">
                    <button onClick={() => setShowModalPago(true)} disabled={finanzas.suscripcion.estatus === 'Activa'} className="paa-action-btn paa-action-btn-cobrar">
                      <i className="fas fa-hand-holding-usd"></i>Activar / Cobrar
                    </button>
                    <button onClick={() => setShowModalCongelar(true)} disabled={finanzas.suscripcion.estatus !== 'Activa'} className="paa-action-btn paa-action-btn-congelar">
                      <i className="fas fa-snowflake"></i>Congelar
                    </button>
                    <BotonSeguro onClick={() => descongelarPlan(finanzas.suscripcion.idSuscripcion)} disabled={finanzas.suscripcion.estatus !== 'Congelada'} className="paa-action-btn paa-action-btn-descongelar" textoProcesando="Procesando...">
                      <i className="fas fa-fire"></i>Descongelar
                    </BotonSeguro>
                    <button onClick={() => setShowModalEditar(true)} className="paa-action-btn paa-action-btn-editar">
                      <i className="fas fa-edit"></i>Editar Fechas
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* HISTORIAL DE TRANSACCIONES */}
            <div className="tarjeta-panel p-4">
              <p className="paa-section-label"><i className="fas fa-receipt"></i>Historial de Pagos</p>
              {(() => {
                const historialTotal = finanzas?.historialPagos || [];
                const totalPaginas = Math.ceil(historialTotal.length / itemsPorPagina);
                const historialPaginado = historialTotal.slice((paginaHistorial - 1) * itemsPorPagina, paginaHistorial * itemsPorPagina);

                return (
                  <>
                    <div className="table-responsive">
                      <table className="table table-hover paa-table">
                        <thead>
                          <tr>
                            <th>Fecha</th>
                            <th>Tipo</th>
                            <th>Método</th>
                            <th>Monto</th>
                            <th className="d-none d-md-table-cell">Notas</th>
                            <th className="text-end">Acción</th>
                          </tr>
                        </thead>
                        <tbody>
                          {historialPaginado.length === 0 ? <tr><td colSpan="6" className="text-center py-4 text-muted">No hay pagos registrados.</td></tr> : (
                            historialPaginado.map(t => (
                              <tr key={t.idTransaccion}>
                                <td>{new Date(t.fechaPago).toLocaleDateString()}</td>
                                <td>{t.tipoTransaccion}</td>
                                <td>
                                  <span className="badge bg-secondary bg-opacity-50">{t.metodoPago1}</span>
                                  {t.metodoPago2 && <span className="badge bg-secondary bg-opacity-50 ms-1">{t.metodoPago2}</span>}
                                </td>
                                <td style={{ color: 'var(--success)', fontFamily: 'var(--font-stats)', fontWeight: 700 }}>${t.montoTotal}</td>
                                <td className="d-none d-md-table-cell" style={{ color: 'var(--text-primary)', fontSize: '0.82rem' }}>{t.notas || '—'}</td>
                                <td className="text-end">
                                  <BotonSeguro onClick={() => eliminarTransaccion(t.idTransaccion)} textoProcesando="" style={{ width: '30px', height: '30px', padding: 0, borderRadius: '8px', background: 'rgba(231,76,60,0.08)', border: '1px solid rgba(231,76,60,0.3)', color: 'var(--danger)', cursor: 'pointer', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <i className="fas fa-trash"></i>
                                  </BotonSeguro>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                    {totalPaginas > 1 && (
                      <div className="paa-pagination">
                        <button onClick={() => setPaginaHistorial(p => Math.max(1, p - 1))} disabled={paginaHistorial === 1} className="paa-page-btn">Anterior</button>
                        <span className="paa-page-info">Página {paginaHistorial} de {totalPaginas}</span>
                        <button onClick={() => setPaginaHistorial(p => Math.min(totalPaginas, p + 1))} disabled={paginaHistorial === totalPaginas} className="paa-page-btn">Siguiente</button>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      </div>

    {/* MODAL PUNTO DE VENTA V4 — CON CALCULADORA INTEGRADA */}
      {showModalPago && (
        <div className="paa-modal-overlay">
          <div className="paa-modal" style={{ maxWidth: '480px' }}>
            <p className="paa-modal-title text-success"><i className="fas fa-cash-register me-2"></i>Punto de Venta</p>
 
            {/* ── DESGLOSE AUTOMÁTICO ── */}
            <div className="mb-3 p-3 rounded" style={{ background: 'rgba(46,204,113,0.06)', border: '1px solid rgba(46,204,113,0.2)' }}>
              <div className="d-flex justify-content-between mb-1">
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Plan: {calculoActivo?.nombrePlan || finanzas?.nombrePlan}</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>${precioBase.toFixed(2)}</span>
              </div>
 
              {montoDescuentoAuto > 0 && (
                <div className="d-flex justify-content-between mb-1">
                  <span style={{ fontSize: '0.8rem', color: '#9b59b6' }}>
                    <i className="fas fa-gem me-1"></i>{descuentoTexto}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: '#9b59b6', fontWeight: 600 }}>-${montoDescuentoAuto.toFixed(2)}</span>
                </div>
              )}
 
              {descuentoPromoExtra > 0 && (
                <div className="d-flex justify-content-between mb-1">
                  <span style={{ fontSize: '0.8rem', color: 'var(--warning)' }}>
                    <i className="fas fa-tags me-1"></i>Promo: {descSeleccionado?.nombre}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--warning)', fontWeight: 600 }}>-${descuentoPromoExtra.toFixed(2)}</span>
                </div>
              )}
 
              {cobrarInscripcionFinal > 0 && (
                <div className="d-flex justify-content-between mb-1">
                  <span style={{ fontSize: '0.8rem', color: 'var(--warning)' }}>
                    <i className="fas fa-id-card me-1"></i>Inscripción Anual
                  </span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--warning)', fontWeight: 600 }}>+${cobrarInscripcionFinal.toFixed(2)}</span>
                </div>
              )}
 
              {saldoAplicado > 0 && (
                <div className="d-flex justify-content-between mb-1">
                  <span style={{ fontSize: '0.8rem', color: 'var(--accent-cool)' }}>
                    <i className="fas fa-wallet me-1"></i>Saldo a favor
                  </span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--accent-cool)', fontWeight: 600 }}>-${saldoAplicado.toFixed(2)}</span>
                </div>
              )}
 
              <hr style={{ borderColor: 'rgba(46,204,113,0.3)', margin: '8px 0' }} />
              <div className="d-flex justify-content-between">
                <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--success)' }}>TOTAL A COBRAR</span>
                <span style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--success)', fontFamily: 'var(--font-stats)' }}>${totalACobrar.toFixed(2)}</span>
              </div>
            </div>
 
            <form onSubmit={registrarPago}>
 
              {/* Promo adicional del box */}
              <div className="mb-3">
                <label className="etiqueta-campo">Promoción Adicional del Box</label>
                <select className="paa-select" value={formPago.idDescuento || ''} onChange={e => setFormPago({ ...formPago, idDescuento: e.target.value })}>
                  <option value="">— Sin promoción extra —</option>
                  {descuentosActivos.map(d => <option key={d.idDescuento} value={d.idDescuento}>{d.nombre} (-{d.porcentaje}%)</option>)}
                </select>
                {montoDescuentoAuto > 0 && (
                  <small className="d-block mt-1" style={{ fontSize: '0.7rem', color: '#9b59b6' }}>
                    <i className="fas fa-info-circle me-1"></i>
                    Ya tiene precio especial aplicado ({descuentoTexto}). La promo del box se aplica SOBRE el precio ya descontado.
                  </small>
                )}
              </div>
 
              {/* Inscripción */}
              <div className="form-check form-switch mb-2 p-2 rounded" style={{ background: inscripcionAutomatica ? 'rgba(243,156,18,0.08)' : 'transparent', border: inscripcionAutomatica ? '1px solid rgba(243,156,18,0.25)' : '1px solid transparent' }}>
                <input className="form-check-input bg-warning border-warning ms-1" type="checkbox" id="checkInsc" checked={formPago.cobrarInscripcion} onChange={e => setFormPago({ ...formPago, cobrarInscripcion: e.target.checked })} />
                <label className="form-check-label text-warning ms-3" htmlFor="checkInsc">
                  Cobrar Inscripción
                  {inscripcionAutomatica && <span className="badge bg-warning text-dark ms-2" style={{ fontSize: '0.6rem' }}>PENDIENTE</span>}
                </label>
              </div>
 
              {formPago.cobrarInscripcion && (
                <div className="mb-3 ps-4">
                  <label className="etiqueta-campo text-warning" style={{ fontSize: '0.75rem' }}>Costo de Inscripción ($)</label>
                  <input type="number" className="entrada-oscura border-warning text-warning fw-bold" value={formPago.montoInscripcion} onChange={e => setFormPago({ ...formPago, montoInscripcion: e.target.value })} placeholder="Ej. 250" />
                  {calculoActivo?.exentoInscripcion && (
                    <small className="text-info d-block mt-1" style={{ fontSize: '0.7rem' }}>
                      <i className="fas fa-star me-1"></i>Este atleta tiene exención de inscripción por su precio especial.
                    </small>
                  )}
                </div>
              )}
 
              {/* Saldo a favor */}
              {(atleta?.saldoAFavor || 0) > 0 && (
                <div className="form-check form-switch mb-3 p-2 rounded" style={{ background: 'rgba(52,152,219,0.08)', border: '1px solid rgba(52,152,219,0.25)' }}>
                  <input className="form-check-input bg-info border-info ms-1" type="checkbox" id="checkSaldo" checked={formPago.usarSaldoAFavor} onChange={e => setFormPago({ ...formPago, usarSaldoAFavor: e.target.checked })} />
                  <label className="form-check-label ms-3" htmlFor="checkSaldo" style={{ color: 'var(--accent-cool)' }}>
                    <i className="fas fa-wallet me-1"></i>Usar saldo a favor (${atleta.saldoAFavor.toFixed(2)})
                  </label>
                </div>
              )}
 
              {/* Métodos de pago */}
              <div className="row g-2 mb-3">
                <div className="col-6">
                  <label className="etiqueta-campo">Método 1</label>
                  <select className="paa-select" value={formPago.metodo1} onChange={e => setFormPago({ ...formPago, metodo1: e.target.value })}>
                    <option>Efectivo</option><option>Tarjeta</option><option>Transferencia</option>
                  </select>
                </div>
                <div className="col-6">
                  <label className="etiqueta-campo">Monto ($)</label>
                  <input type="number" step="0.01" className="entrada-oscura fw-bold" required value={formPago.monto1} onChange={e => setFormPago({ ...formPago, monto1: e.target.value })} placeholder="Ej. 500" />
                </div>
              </div>
 
              {restante > 0 && formPago.monto1 !== '' && (
                <div className="row g-2 mb-3 p-2 rounded" style={{ backgroundColor: 'rgba(52, 152, 219, 0.1)', border: '1px solid rgba(52, 152, 219, 0.3)' }}>
                  <div className="col-12"><small className="text-info fw-bold"><i className="fas fa-split me-1"></i>Falta cubrir ${restante.toFixed(2)}</small></div>
                  <div className="col-6">
                    <select className="paa-select border-info" required value={formPago.metodo2} onChange={e => setFormPago({ ...formPago, metodo2: e.target.value })}>
                      <option value="">- Elija -</option>
                      <option value="Efectivo" disabled={formPago.metodo1 === 'Efectivo'}>Efectivo</option>
                      <option value="Tarjeta" disabled={formPago.metodo1 === 'Tarjeta'}>Tarjeta</option>
                      <option value="Transferencia" disabled={formPago.metodo1 === 'Transferencia'}>Transferencia</option>
                    </select>
                  </div>
                  <div className="col-6"><input type="number" className="entrada-oscura fw-bold border-info text-info" value={formPago.monto2} readOnly title="Calculado automáticamente" /></div>
                </div>
              )}
 
              <div className="mb-4">
                <label className="etiqueta-campo">Notas (Opcional)</label>
                <input type="text" className="entrada-oscura" placeholder="Comentarios..." value={formPago.notas} onChange={e => setFormPago({ ...formPago, notas: e.target.value })} />
              </div>
 
              <div className="d-flex gap-2">
                <button type="button" onClick={() => setShowModalPago(false)} className="paa-modal-btn paa-modal-btn-cancel w-50">Cancelar</button>
                <BotonSeguro type="submit" className="btn btn-success w-50 fw-bold" textoProcesando="Activando..."><i className="fas fa-check me-1"></i>Activar Plan</BotonSeguro>
              </div>
            </form>
          </div>
        </div>
      )}

     {/* MODAL EDICIÓN CAMALEÓNICO V3 */}
      {showModalEditar && finanzas?.suscripcion && (
        <div className="paa-modal-overlay">
          <div className="paa-modal" style={{ maxWidth: '400px' }}>
            <p className="paa-modal-title text-accent"><i className="fas fa-wrench"></i>Ajuste de Membresía</p>
            <form onSubmit={editarSuscripcionManual}>
              
              <div className="mb-3">
                <label className="etiqueta-campo">Acción a realizar</label>
                <select className="paa-select" value={formEditar.nuevoEstatus} onChange={e => setFormEditar({ ...formEditar, nuevoEstatus: e.target.value })}>
                  <option value="Activa">Modificar Fecha (Mantener Activo)</option>
                  <option value="Cancelada">Cancelar Plan (Dar de baja membresía)</option>
                </select>
              </div>

              {/* 👇 MAGIA: La fecha solo aparece si NO vamos a cancelar 👇 */}
              {formEditar.nuevoEstatus !== 'Cancelada' && (
                <div className="mb-3 animate__animated animate__fadeIn">
                  <label className="etiqueta-campo">Nueva Fecha de Corte</label>
                  <RedGrayDatePicker
                    value={formEditar.nuevaFechaVencimiento}
                    onChange={v => setFormEditar({ ...formEditar, nuevaFechaVencimiento: v })}
                    placeholder="Selecciona nueva fecha de corte"
                    required={formEditar.nuevoEstatus !== 'Cancelada'}
                  />
                </div>
              )}

              <div className="mb-4">
                <label className="etiqueta-campo">Motivo del Ajuste</label>
                <input type="text" className="entrada-oscura" required placeholder="Ej: Me equivoqué de plan, Cancelación a petición..." value={formEditar.motivoAjuste} onChange={e => setFormEditar({ ...formEditar, motivoAjuste: e.target.value })} />
              </div>

              <div className="d-flex gap-2">
                <button type="button" onClick={() => setShowModalEditar(false)} className="paa-modal-btn paa-modal-btn-cancel">Cancelar</button>
                <button type="submit" className="paa-modal-btn paa-modal-btn-warning" textoProcesando="Guardando...">
                  <i className={`fas ${formEditar.nuevoEstatus === 'Cancelada' ? 'fa-ban' : 'fa-save'}`}></i>
                  {formEditar.nuevoEstatus === 'Cancelada' ? 'Confirmar Cancelación' : 'Guardar Cambios'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {showModalCongelar && finanzas?.suscripcion && (
        <div className="paa-modal-overlay">
          <div className="paa-modal" style={{ maxWidth: '400px' }}>
            <p className="paa-modal-title text-info"><i className="fas fa-snowflake"></i>Congelar Plan</p>
            <div>
              <div className="mb-3"><label className="etiqueta-campo">Días a Congelar</label>
              <DiasCongelarPicker valor={formCongelar.dias} onCambiar={v => setFormCongelar({ ...formCongelar, dias: v })} />

              </div>
              <div className="mb-4">
                <label className="etiqueta-campo">Motivo</label>
                <input type="text" className="entrada-oscura" value={formCongelar.motivo} onChange={e => setFormCongelar({ ...formCongelar, motivo: e.target.value })} />
                </div>
              <div className="d-flex gap-2">
                <button type="button" onClick={() => setShowModalCongelar(false)} className="paa-modal-btn paa-modal-btn-cancel">Cancelar</button>
                <BotonSeguro type="button" onClick={congelarPlan} className="paa-modal-btn paa-modal-btn-info" textoProcesando="Congelando...">
                  <i className="fas fa-snowflake"></i>Congelar</BotonSeguro>
                  </div>
            </div>
          </div>
        </div>
      )}
      {/* MODAL PRECIO ESPECIAL */}
      {showModalPrecio && (
        <div className="paa-modal-overlay">
          <div className="paa-modal" style={{ maxWidth: '420px' }}>
            <p className="paa-modal-title" style={{ color: '#9b59b6' }}>
              <i className="fas fa-gem me-2"></i>Precio Especial para {atleta?.nombre}
            </p>
 
            <div className="mb-3">
              <label className="etiqueta-campo">Tipo de Descuento</label>
              <select className="paa-select" value={formPrecio.tipoDescuento} onChange={e => setFormPrecio({ ...formPrecio, tipoDescuento: e.target.value })}>
                <option value="PrecioFijo">Precio Fijo (Siempre paga esta cantidad)</option>
                <option value="DescuentoPesos">Descuento en Pesos (Se resta al plan)</option>
                <option value="DescuentoPorcentaje">Descuento Porcentual (%)</option>
              </select>
            </div>
 
            <div className="mb-3">
              <label className="etiqueta-campo">
                {formPrecio.tipoDescuento === 'PrecioFijo' && 'Precio que pagará ($)'}
                {formPrecio.tipoDescuento === 'DescuentoPesos' && 'Monto a descontar ($)'}
                {formPrecio.tipoDescuento === 'DescuentoPorcentaje' && 'Porcentaje de descuento (%)'}
              </label>
              <input
                type="number"
                className="entrada-oscura fw-bold"
                value={formPrecio.valorDescuento}
                onChange={e => setFormPrecio({ ...formPrecio, valorDescuento: e.target.value })}
                placeholder={formPrecio.tipoDescuento === 'PrecioFijo' ? 'Ej. 500' : formPrecio.tipoDescuento === 'DescuentoPesos' ? 'Ej. 100' : 'Ej. 20'}
              />
            </div>
 
            <div className="mb-3">
              <label className="etiqueta-campo">Motivo (visible para ti)</label>
              <input
                type="text"
                className="entrada-oscura"
                value={formPrecio.motivo}
                onChange={e => setFormPrecio({ ...formPrecio, motivo: e.target.value })}
                placeholder="Ej. Antigüedad 5 años, Familiar de Coach..."
              />
            </div>
 
            <div className="mb-3">
              <label className="etiqueta-campo">Fecha de Expiración (Opcional)</label>
              <input
                type="date"
                className="entrada-oscura"
                value={formPrecio.fechaExpiracion}
                onChange={e => setFormPrecio({ ...formPrecio, fechaExpiracion: e.target.value })}
              />
              <small className="text-secondary" style={{ fontSize: '0.7rem' }}>Déjalo vacío para que sea permanente.</small>
            </div>
 
            <div className="form-check form-switch mb-4 p-2 rounded" style={{ background: 'rgba(243,156,18,0.08)', border: '1px solid rgba(243,156,18,0.25)' }}>
              <input className="form-check-input bg-warning border-warning ms-1" type="checkbox" id="checkExentoInsc" checked={formPrecio.exentoInscripcion} onChange={e => setFormPrecio({ ...formPrecio, exentoInscripcion: e.target.checked })} />
              <label className="form-check-label text-warning ms-3" htmlFor="checkExentoInsc" style={{ fontSize: '0.85rem' }}>
                <i className="fas fa-star me-1"></i>Exento de inscripción anual
              </label>
            </div>
 
            <div className="d-flex gap-2">
              <button type="button" onClick={() => setShowModalPrecio(false)} className="paa-modal-btn paa-modal-btn-cancel w-50">Cancelar</button>
              <BotonSeguro onClick={guardarPrecioEspecial} className="btn w-50 fw-bold" style={{ background: '#9b59b6', color: '#fff', border: 'none' }} textoProcesando="Guardando...">
                <i className="fas fa-save me-1"></i>Asignar
              </BotonSeguro>
            </div>
          </div>
        </div>
      )}


    </div>
  );
}