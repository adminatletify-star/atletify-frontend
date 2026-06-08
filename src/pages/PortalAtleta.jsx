import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { COMPETENCIAS_ENDPOINT } from '../services/api';
import BackButton from '../components/BackButton';
import BotonSeguro from '../components/BotonSeguro';
import '../assets/css/PortalAtleta.css';

export default function PortalAtleta() {
  const { compId } = useParams(); 
  const [credenciales, setCredenciales] = useState({ codigoInvitacion: '', correoAtleta: '' });
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  // Datos financieros del equipo
  const [equipoAuth, setEquipoAuth] = useState(null);

  // Formulario para nuevo abono
  const [nuevoArchivo, setNuevoArchivo] = useState(null);
  const [montoAbono, setMontoAbono] = useState('');
  const [subiendo, setSubiendo] = useState(false);
  const [misHeats, setMisHeats] = useState([]);

  const hacerLogin = async (e) => {
    e.preventDefault();
    setCargando(true); setError('');

    try {
      const res = await fetch(`${COMPETENCIAS_ENDPOINT}/login-atleta`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credenciales)
      });
      const data = await res.json();
      if (res.ok) setEquipoAuth(data);
      else setError(data.mensaje || 'Error al acceder.');
    } catch (err) { setError('Error de conexión con el servidor.'); } 
    finally { setCargando(false); }
  };

  useEffect(() => {
    if (equipoAuth && equipoAuth.restante === 0 && equipoAuth.estatusPago === 'Aprobado') {
      const buscarMiItinerario = async () => {
        try {
          const res = await fetch(`${COMPETENCIAS_ENDPOINT}/publicas`);
          const data = await res.json();
          if (data.length > 0) {
            const compActiva = data[0];
            const configString = compActiva.heatsConfig || compActiva.HeatsConfig;
            if (configString) {
              const dataHeats = JSON.parse(configString);
              if (dataHeats.publicado) {
                const heatsEncontrados = [];
                for (let wod of (dataHeats.wods || [])) {
                  for (let heat of (wod.lista || [])) {
                    const p = heat.participantes.find(p => p.idEquipo === equipoAuth.idEquipo);
                    if (p) heatsEncontrados.push({ numero: heat.numero, hora: heat.hora, carril: p.carril, nombreWod: wod.nombreWod });
                  }
                }
                setMisHeats(heatsEncontrados);
              }
            }
          }
        } catch (error) { console.error("Error buscando el heat:", error); }
      };
      buscarMiItinerario();
    }
  }, [equipoAuth]);

  const registrarNuevoAbono = async () => {
    if (!montoAbono || isNaN(montoAbono) || Number(montoAbono) <= 0) return alert("Ingresa un monto válido.");
    if (!nuevoArchivo) return alert("Sube la captura de tu comprobante de pago.");
    setSubiendo(true);

    try {
      // 1. Subir Foto
      const formData = new FormData();
      formData.append('file', nuevoArchivo);
      const resFoto = await fetch(`${COMPETENCIAS_ENDPOINT}/upload-comprobante`, { method: 'POST', body: formData });
      if (!resFoto.ok) throw new Error("Error al subir imagen. Usa JPG/PNG.");
      const dataFoto = await resFoto.json();

      // 2. Registrar Abono
      const payload = {
        montoAbonado: parseFloat(montoAbono),
        metodoPago: "Transferencia",
        comprobanteUrl: dataFoto.url,
        nombrePagador: equipoAuth.nombreAtletaLogueado
      };

      const resAbono = await fetch(`${COMPETENCIAS_ENDPOINT}/equipos/${equipoAuth.idEquipo}/abonos`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });

      if (resAbono.ok) {
        alert("¡Abono enviado con éxito! ✅ En espera de validación de la Coach.");
        // Refrescar login para ver los nuevos datos
        hacerLogin(new Event('submit')); 
        setNuevoArchivo(null);
        setMontoAbono('');
      } else {
        const errData = await resAbono.json();
        throw new Error(errData.mensaje);
      }
    } catch (err) { alert(err.message || 'Error de conexión.'); } 
    finally { setSubiendo(false); }
  };

  return (
    <div className="pa-root">
      <div className="pa-top-nav"><BackButton to={compId ? `/portal-competencias/${compId}` : "/competencias"} /></div>

      <div className="pa-card">
        <div className="pa-card-header">
          <div className="pa-card-icon"><i className="fas fa-shield-alt"></i></div>
          <h2 className="pa-card-title">Estado de Cuenta</h2>
          <p className="pa-card-subtitle">Acceso seguro con Código de Equipo</p>
        </div>

        <div className="pa-card-body">
          {!equipoAuth ? (
            <form onSubmit={hacerLogin}>
              {error && <div className="pa-error"><i className="fas fa-exclamation-circle me-2"></i>{error}</div>}
              <div className="pa-form-group">
                <label className="pa-label">Código de Equipo (WOLF-XXXX)</label>
                <input type="text" className="pa-input text-uppercase tracking-widest fw-bold text-center" required placeholder="WOLF-1A2B3C" value={credenciales.codigoInvitacion} onChange={e => setCredenciales({ ...credenciales, codigoInvitacion: e.target.value.toUpperCase() })} />
              </div>
              <div className="pa-form-group">
                <label className="pa-label">Tu Correo Electrónico</label>
                <input type="email" className="pa-input text-center" required placeholder="correo@ejemplo.com" value={credenciales.correoAtleta} onChange={e => setCredenciales({ ...credenciales, correoAtleta: e.target.value })} />
              </div>
              <BotonSeguro type="submit" className="pa-btn-login" disabled={cargando} tiempoBloqueo={3000}>
                <><i className="fas fa-lock"></i> Consultar Estatus</>
              </BotonSeguro>
            </form>
          ) : (
            <div>
              <div className="pa-team-profile">
                <div className="pa-team-avatar">{(equipoAuth.nombre || '?')[0].toUpperCase()}</div>
                <h3 className="pa-team-name">{equipoAuth.nombre.toUpperCase()}</h3>
                <p className="pa-team-location"><i className="fas fa-map-marker-alt"></i> {equipoAuth.box || 'Independiente'}</p>
                
                {/* 📊 RESUMEN FINANCIERO 📊 */}
                <div className="row g-2 mt-3 mb-2 text-center">
                  <div className="col-4">
                    <div className="bg-dark p-2 rounded-3 border border-secondary border-opacity-25">
                      <div className="small text-secondary" style={{fontSize:'10px'}}>COSTO TOTAL</div>
                      <div className="fw-bold text-white">${equipoAuth.costoTotal}</div>
                    </div>
                  </div>
                  <div className="col-4">
                    <div className="bg-success bg-opacity-25 p-2 rounded-3 border border-success border-opacity-50">
                      <div className="small text-success" style={{fontSize:'10px'}}>APROBADO</div>
                      <div className="fw-bold text-success">${equipoAuth.totalPagado}</div>
                    </div>
                  </div>
                  <div className="col-4">
                    <div className={`p-2 rounded-3 border ${equipoAuth.restante > 0 ? 'bg-danger bg-opacity-25 border-danger border-opacity-50' : 'bg-dark border-secondary border-opacity-25'}`}>
                      <div className={`small ${equipoAuth.restante > 0 ? 'text-danger' : 'text-secondary'}`} style={{fontSize:'10px'}}>DEUDA</div>
                      <div className={`fw-bold ${equipoAuth.restante > 0 ? 'text-danger' : 'text-white'}`}>${equipoAuth.restante}</div>
                    </div>
                  </div>
                </div>

                <div className="pa-status-pill mt-3">
                  <span className="pa-status-label">Estatus Final:</span>
                  <span className={ equipoAuth.restante === 0 && equipoAuth.estatusPago === 'Aprobado' ? 'pa-badge-aprobado' : 'pa-badge-pendiente' }>
                    <i className={`fas ${equipoAuth.restante === 0 && equipoAuth.estatusPago === 'Aprobado' ? 'fa-check-circle' : 'fa-clock'} me-1`}></i>
                    {equipoAuth.restante === 0 && equipoAuth.estatusPago === 'Aprobado' ? 'INSCRIPCIÓN COMPLETADA' : 'EN REVISIÓN / PENDIENTE'}
                  </span>
                </div>
              </div>

              {equipoAuth.restante === 0 && equipoAuth.estatusPago === 'Aprobado' ? (
                <div>
                  <div className="pa-success-banner"><i className="fas fa-check-circle pa-success-icon"></i><h5 className="pa-success-title">¡Nos vemos en la Arena!</h5><p className="pa-success-text">Tu equipo no tiene deudas y ha sido verificado.</p></div>
                  {misHeats.length > 0 ? (
                    <div>
                      <p className="pa-heats-label">Tus llamados a la arena:</p>
                      {misHeats.map((heat, index) => (
                        <div key={index} className="pa-heat-card">
                          <div className="pa-heat-stats"><div className="pa-heat-stat"><span className="pa-heat-stat-label">Heat</span><span className="pa-heat-stat-value">{heat.numero}</span></div><div className="pa-heat-divider"></div><div className="pa-heat-stat"><span className="pa-heat-stat-label">Lane</span><span className="pa-heat-stat-value">{heat.carril}</span></div></div>
                          <div className="pa-heat-time"><span className="pa-heat-time-value"><i className="far fa-clock"></i>{heat.hora}</span><div className="small text-secondary mt-1">{heat.nombreWod}</div></div>
                        </div>
                      ))}
                    </div>
                  ) : (<div className="pa-no-heats"><i className="fas fa-stopwatch"></i><p>Los horarios de los Heats aún no han sido publicados.</p></div>)}
                </div>
              ) : (
                <div className="pa-upload-section">
                  <div className="pa-upload-header">
                    <h6 className="pa-upload-title text-warning"><i className="fas fa-exclamation-triangle me-2"></i>Atención Requerida</h6>
                    <p className="pa-upload-desc">Aún tienes un saldo pendiente de <strong>${equipoAuth.restante} MXN</strong> o tienes pagos en revisión. Si tienes otro comprobante, súbelo aquí o liquida en Recepción.</p>
                  </div>
                  
                  <div className="row g-2 mb-3">
                    <div className="col-12"><input type="number" min="0.01" step="0.01" className="form-control bg-dark text-warning border-secondary fw-bold text-center" placeholder="Monto a abonar (Ej. 200)" value={montoAbono} onChange={(e) => { if (Number(e.target.value) >= 0) setMontoAbono(e.target.value); }} /></div>
                    <div className="col-12"><input type="file" className="pa-file-input" accept="image/png, image/jpeg, image/jpg" onChange={(e) => setNuevoArchivo(e.target.files[0])} /></div>
                  </div>

                  <BotonSeguro onClick={registrarNuevoAbono} disabled={subiendo || !nuevoArchivo || !montoAbono} className="pa-btn-upload" tiempoBloqueo={4000}>
                    <><i className="fas fa-paper-plane me-2"></i>Enviar Abono</>
                  </BotonSeguro>
                </div>
              )}
              <button onClick={() => setEquipoAuth(null)} className="pa-btn-logout"><i className="fas fa-sign-out-alt me-2"></i>Salir</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}