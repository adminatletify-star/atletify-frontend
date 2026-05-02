import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DarkVeil from '../components/ReactBits/DarkVeil';
import BotonSeguro from '../components/BotonSeguro';
import '../assets/css/public-dropin.css';

const API_BASE = 'import.meta.env.VITE_API_URL:7149/api';

export default function PublicDropIn() {
    const navigate = useNavigate();
    const params = useParams();
    const idBox = params.idBox;

    const [boxesDirectorate, setBoxesDirectorate] = useState([]);
    const [box, setBox] = useState(null);
    const [planes, setPlanes] = useState([]);
    const [clases, setClases] = useState([]);
    const [loading, setLoading] = useState(true);

    const [modoVista, setModoVista] = useState('RESERVAR'); // 'RESERVAR' | 'STATUS'

    // ESTADO PARA RESERVAS (MOTOR V2)
    const [paso, setPaso] = useState(1);
    const [form, setForm] = useState({
        nombre: '', email: '', telefono: '', nivelAtleta: 'Principiante', visitas: []
    });

    // ESTADO PARA CONSULTA DE STATUS MÁGICA
    const [consultaCorreo, setConsultaCorreo] = useState('');
    const [statusResult, setStatusResult] = useState(null);

    useEffect(() => {
        if (!idBox) {
            cargarDirectorioCajas();
            return;
        }

        const query = new URLSearchParams(window.location.search);
        if (query.get('pago') === 'exito') {
            setPaso(4);
        } else if (query.get('pago') === 'cancelado') {
            alert('Cancelaste el pago en línea. Tu reserva no fue procesada.');
        }

        cargarDatosPublicos();
    }, [idBox]);

    const cargarDirectorioCajas = async () => {
        try {
            const res = await fetch(`${API_BASE}/box`);
            if (res.ok) setBoxesDirectorate(await res.json());
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const cargarDatosPublicos = async () => {
        try {
            const [resBox, resPlanes, resClases] = await Promise.all([
                fetch(`${API_BASE}/box/${idBox}`),
                fetch(`${API_BASE}/finanzas/planes-publicos/${idBox}`),
                fetch(`${API_BASE}/publicdropin/clases-disponibles/${idBox}`)
            ]);
            if (resBox.ok) setBox(await resBox.json());
            if (resPlanes.ok) setPlanes(await resPlanes.json());
            if (resClases.ok) setClases(await resClases.json());
        } catch (e) { console.error("Error public data", e); }
        finally { setLoading(false); }
    };

    // ===============================================
    // LÓGICA DE FECHAS (Solo Semana Actual)
    // ===============================================
    const dDiasPermitidos = useMemo(() => {
        const dias = [];
        const hoy = new Date();
        const offset = hoy.getDay() === 0 ? 6 : hoy.getDay() - 1; // 0=Lun ... 6=Dom

        for (let i = offset; i < 7; i++) {
            const d = new Date(hoy);
            d.setDate(hoy.getDate() + (i - offset));
            dias.push(d.toISOString().split('T')[0]);
        }
        return dias;
    }, []);

    // ===============================================
    // CALCULADORA DEL CARRITO Y REGLAS DE UI
    // ===============================================
    const getCostoTotal = () => {
        let total = 0;
        form.visitas.forEach(v => {
            if (v.tipoVisita === 'Clase') total += box?.costoDropIn || 0;
            else total += box?.costoVisitaGym || box?.costoDropIn || 0;
        });
        return total;
    };

    const enableStripe = getCostoTotal() >= (box?.compraMinimaTarjeta || 0);

    const getNombreDiaSemana = (fechaIso) => {
        const d = new Date(fechaIso + 'T00:00:00');
        const diasEspanol = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];
        return diasEspanol[d.getDay()];
    };

    const isClaseHabilitadaParaDia = (c, fechaIso) => {
        if (!c.dias) return true; // Si no tiene días configurados asume diario
        const dName = getNombreDiaSemana(fechaIso);

        // Mapear nombre del día al código usado en backend: L, M, X, J, V, S, D
        const mapDias = {
            'Lunes': 'L',
            'Martes': 'M',
            'Miercoles': 'X',
            'Jueves': 'J',
            'Viernes': 'V',
            'Sabado': 'S',
            'Domingo': 'D'
        };
        const dayCode = mapDias[dName];
        return c.dias.toUpperCase().includes(dayCode);
    };

    const esManana = (horaString) => {
        if (!horaString) return true;
        const hrs = parseInt(horaString.split(':')[0], 10);
        return hrs < 13;
    };

    // ===============================================
    // ACCIONES DEL FORMULARIO
    // ===============================================
    const agregarVisita = (fecha, tipo, idClase = 0) => {
        setForm(prev => ({
            ...prev,
            visitas: [...prev.visitas, { fecha, tipoVisita: tipo, idClase }]
        }));
    };

    const quitarVisita = (index) => {
        setForm(prev => ({
            ...prev,
            visitas: prev.visitas.filter((_, i) => i !== index)
        }));
    };

    const confirmarReserva = async (usarStripe = false) => {
        const payload = { ...form, idBox: parseInt(idBox) };
        const endpoint = usarStripe ? '/publicdropin/reservar-stripe' : '/publicdropin/reservar';

        try {
            const res = await fetch(`${API_BASE}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();

            if (!res.ok) {
                alert(data.mensaje || "Error procesando reserva.");
                return;
            }

            if (usarStripe && data.url) {
                window.location.href = data.url;
            } else {
                setPaso(4);
            }
        } catch (e) {
            alert("Error al conectar con la pasarela.");
        }
    };

    // ===============================================
    // CONSULTA STATUS MÁGICA
    // ===============================================
    const consultarStatus = async () => {
        if (!consultaCorreo) return alert("Ingresa tu correo.");
        try {
            const res = await fetch(`${API_BASE}/publicdropin/status?idBox=${idBox}&correo=${encodeURIComponent(consultaCorreo)}`);
            const data = await res.json();
            setStatusResult(data);
        } catch (e) {
            alert("Error al consultar el estatus.");
        }
    };

    // ===============================================
    // VISTAS PRINCIPALES
    // ===============================================
    if (loading) return <div className="text-center py-5" style={{ minHeight: '100vh' }}><div className="spinner-border text-danger"></div></div>;

    if (!idBox) {
        return (
            <div className="public-dropin-root" style={{ minHeight: '100vh' }}>
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: -1 }}><DarkVeil opacity={0.8} /></div>
                <div className="container py-5 position-relative" style={{ zIndex: 1, maxWidth: '900px' }}>
                    <header className="text-center mb-5">
                        <i className="fas fa-map-marked-alt text-danger display-1 mb-3"></i>
                        <h1 className="text-white fw-bold">DIRECTORIO DROP-IN</h1>
                    </header>
                    <div className="row g-4 justify-content-center">
                        {boxesDirectorate.map(b => (
                            <div key={b.idBox} className="col-12 col-md-6 col-lg-4" onClick={() => navigate(`/public-drop-in/${b.idBox}`)}>
                                <div className="p-4 rounded-4 text-center border cursor-pointer bg-dark" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                                    <h5 className="text-white fw-bold">{b.nombre}</h5>
                                    <p className="text-secondary small">{b.ubicacion}</p>
                                    <button className="btn btn-outline-danger btn-sm w-100">VISITAR BOX</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (!box && !loading) return <h2 className="text-white text-center py-5">Box no encontrado</h2>;

    return (
        <div className="public-dropin-root" style={{ minHeight: '100vh' }}>
            <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: -1 }}><DarkVeil opacity={0.8} /></div>

            {/* NAVBAR TURISTA */}
            <div className="bg-black border-bottom border-secondary border-opacity-25 sticky-top p-3 d-flex justify-content-center gap-3" style={{ zIndex: 10 }}>
                <button onClick={() => setModoVista('RESERVAR')} className={`btn fw-bold ${modoVista === 'RESERVAR' ? 'btn-danger' : 'btn-outline-secondary'}`}>
                    NUEVA VISITA
                </button>
                <button onClick={() => setModoVista('STATUS')} className={`btn fw-bold ${modoVista === 'STATUS' ? 'btn-warning text-dark' : 'btn-outline-secondary'}`}>
                    VER MI WOD / ESTATUS
                </button>
            </div>

            <div className="container py-4 position-relative" style={{ zIndex: 1, maxWidth: '900px' }}>

                {/* CABECERA */}
                <header className="text-center mb-4">
                    <h2 className="text-white fw-bold">{box?.nombre?.toUpperCase()}</h2>
                </header>

                {/* MODO: STATUS Y WOD */}
                {modoVista === 'STATUS' && (
                    <div className="bg-dark p-4 rounded-4 border border-secondary border-opacity-25 mx-auto shadow-lg" style={{ maxWidth: '600px' }}>
                        <h4 className="text-white mb-3"><i className="fas fa-search me-2 text-warning"></i>Rastreador de Turista</h4>
                        <p className="text-secondary small mb-4">Ingresa el correo con el que registraste tu visita de HOY para saber tu estatus y revelar la programación si fuiste aprobado.</p>
                        <div className="d-flex gap-2 mb-4">
                            <input type="email" placeholder="Correo Electrónico" className="form-control bg-black text-white" value={consultaCorreo} onChange={e => setConsultaCorreo(e.target.value)} />
                            <BotonSeguro onClick={consultarStatus} className="btn btn-warning fw-bold text-dark px-4" textoProcesando="Buscando...">Verificar</BotonSeguro>
                        </div>

                        {statusResult && (
                            <div className={`p-4 rounded border ${statusResult.Estatus === 'Aprobado' ? 'border-success bg-success bg-opacity-10' : 'border-warning bg-warning bg-opacity-10'}`}>
                                <h5 className={statusResult.Estatus === 'Aprobado' ? 'text-success' : 'text-warning'}>
                                    <i className={`fas ${statusResult.Estatus === 'Aprobado' ? 'fa-check-circle' : 'fa-clock'} me-2`}></i>
                                    {statusResult.Estatus}
                                </h5>
                                <p className="text-white small mb-0">{statusResult.Mensaje}</p>

                                {statusResult.Estatus === 'Aprobado' && statusResult.Wod && (
                                    <div className="mt-4 p-3 bg-black rounded shadow text-center">
                                        <h5 className="text-danger fw-bold"><i className="fas fa-fire me-2"></i>WOD DE HOY</h5>
                                        <pre className="text-white" style={{ whiteSpace: 'pre-wrap', fontFamily: 'Inter' }}>{statusResult.Wod}</pre>
                                        <p className="text-secondary small mt-3 fst-italic">Tu resultado no subirá al pizarrón público por seguridad de cuentas, ¡pero dalo todo!</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* MODO: RESERVAR (V2) */}
                {modoVista === 'RESERVAR' && (
                    <div className="bg-dark p-4 rounded-4 border border-secondary border-opacity-25 shadow-lg">

                        {/* PASO 1: DATOS */}
                        {paso === 1 && (
                            <div>
                                <h4 className="text-white mb-4"><i className="fas fa-id-card me-2 text-danger"></i>Paso 1: ¿Quién eres?</h4>
                                <div className="row g-3">
                                    <div className="col-12 col-md-6">
                                        <label className="text-secondary small">Nombre Completo</label>
                                        <input type="text" className="form-control bg-black text-white" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} />
                                    </div>
                                    <div className="col-12 col-md-6">
                                        <label className="text-secondary small">Correo Electrónico (Para consultar el WOD)</label>
                                        <input type="email" className="form-control bg-black text-white" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                                    </div>
                                    <div className="col-12">
                                        <label className="text-secondary small">Nivel de Atleta (Obligatorio para seguridad)</label>
                                        <select className="form-select bg-black text-white" value={form.nivelAtleta} onChange={e => setForm({ ...form, nivelAtleta: e.target.value })}>
                                            <option value="Novato">Novato (Primeros meses)</option>
                                            <option value="Principiante">Principiante (Escalo movimientos)</option>
                                            <option value="Intermedio">Intermedio (Domino mayoría de pesos RX)</option>
                                            <option value="Avanzado">Avanzado / RX (Domino gimnásticos complejos)</option>
                                        </select>
                                    </div>
                                </div>
                                <button onClick={() => { if (form.nombre && form.email) setPaso(2); else alert("Nombre y correo son requeridos."); }} className="btn btn-danger w-100 fw-bold py-3 mt-4">IR AL CARRITO MULTIDÍA <i className="fas fa-arrow-right ms-2"></i></button>
                            </div>
                        )}

                        {/* PASO 2: CARRITO DE CLASES */}
                        {paso === 2 && (
                            <div>
                                <div className="d-flex justify-content-between align-items-center mb-4">
                                    <h4 className="text-white mb-0"><i className="fas fa-shopping-cart me-2 text-danger"></i>Paso 2: Arma tu Visita</h4>
                                    <h4 className="text-success mb-0 fw-bold">TOTAL: ${getCostoTotal()}</h4>
                                </div>

                                <div className="p-3 bg-black rounded mb-4">
                                    <h6 className="text-secondary text-uppercase fw-bold">Días Agregados:</h6>
                                    {form.visitas.length === 0 ? <p className="text-secondary small mb-0">No has agregado nada. Selecciona abajo.</p> :
                                        <ul className="list-group list-group-flush bg-transparent">
                                            {form.visitas.map((v, idx) => (
                                                <li key={idx} className="list-group-item bg-transparent text-white border-secondary d-flex justify-content-between align-items-center">
                                                    <div>
                                                        <span className="badge bg-danger me-2">{v.fecha}</span>
                                                        {v.tipoVisita === 'Clase' ? `Clase (${clases.find(c => c.idClase == v.idClase)?.nombre || '?'})` : 'Open Gym'}
                                                    </div>
                                                    <button onClick={() => quitarVisita(idx)} className="btn btn-sm btn-outline-secondary border-0"><i className="fas fa-times text-danger"></i></button>
                                                </li>
                                            ))}
                                        </ul>
                                    }
                                </div>

                                {/* GENERADOR DE FECHAS */}
                                <h6 className="text-warning small fw-bold mb-3">CLASES DISPONIBLES ESTA SEMANA (Selecciona para agregar):</h6>
                                {dDiasPermitidos.map(dia => {
                                    const clasesDelDia = clases.filter(c => isClaseHabilitadaParaDia(c, dia));
                                    const clasesManana = clasesDelDia.filter(c => esManana(c.horarioInicio));
                                    const clasesTarde = clasesDelDia.filter(c => !esManana(c.horarioInicio));

                                    return (
                                        <div key={dia} className="border border-secondary border-opacity-25 p-3 rounded mb-3">
                                            <div className="d-flex justify-content-between align-items-center mb-3">
                                                <h6 className="text-white fw-bold mb-0">{new Date(dia + 'T00:00:00').toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'short' }).toUpperCase()}</h6>
                                                {box?.costoVisitaGym > 0 && (
                                                    <button onClick={() => agregarVisita(dia, 'SoloGym')} className="btn btn-sm btn-outline-warning">
                                                        <i className="fas fa-dumbbell me-1"></i> Open Gym Visita (${box.costoVisitaGym})
                                                    </button>
                                                )}
                                            </div>

                                            {clasesDelDia.length === 0 ? (
                                                <p className="text-secondary small fst-italic mb-0">No hay clases programadas para este día.</p>
                                            ) : (
                                                <div className="row g-3">
                                                    {clasesManana.length > 0 && (
                                                        <div className="col-12 col-md-6 border-end border-secondary border-opacity-25">
                                                            <div className="text-warning small fw-bold mb-2"><i className="fas fa-sun me-1"></i> TURNO MAÑANA</div>
                                                            <div className="d-flex gap-2 flex-wrap">
                                                                {clasesManana.map(c => {
                                                                    const nivelesClase = c.nivelesPermitidos || 'Todos';
                                                                    let nivelNoPermitido = false;
                                                                    if (nivelesClase !== 'Todos') {
                                                                        const jerarquia = { "novato": 1, "principiante": 2, "intermedio": 3, "rx": 4, "avanzado": 4 };
                                                                        const nivelAtletaVal = jerarquia[form.nivelAtleta.trim().toLowerCase()] || 1;
                                                                        let nivelClaseVal = 0;
                                                                        Object.keys(jerarquia).forEach(nivel => {
                                                                            if (nivelesClase.toLowerCase().includes(nivel)) {
                                                                                nivelClaseVal = Math.max(nivelClaseVal, jerarquia[nivel]);
                                                                            }
                                                                        });
                                                                        if (nivelClaseVal === 0) nivelClaseVal = 1;
                                                                        if (nivelAtletaVal < nivelClaseVal) {
                                                                            nivelNoPermitido = true;
                                                                        }
                                                                    }
                                                                    return (
                                                                        <button key={c.idClase} disabled={nivelNoPermitido} onClick={() => agregarVisita(dia, 'Clase', c.idClase)} className={`btn btn-sm ${nivelNoPermitido ? 'btn-dark text-secondary border-secondary' : 'btn-outline-danger'}`}>
                                                                            {c.nombre} {nivelesClase !== 'Todos' && <span className="badge bg-secondary bg-opacity-25 ms-1 border border-secondary border-opacity-50 fw-normal" style={{ fontSize: '0.65rem' }}>{nivelesClase}</span>} <br />
                                                                            <small className={nivelNoPermitido ? "opacity-50" : "opacity-75"}>{nivelNoPermitido ? `SOLO ${nivelesClase.toUpperCase()}` : `${c.horarioInicio} (${c.inscritos}/${c.maximoAtletas})`}</small>
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    )}
                                                    {clasesTarde.length > 0 && (
                                                        <div className="col-12 col-md-6">
                                                            <div className="text-info small fw-bold mb-2"><i className="fas fa-moon me-1"></i> TURNO TARDE</div>
                                                            <div className="d-flex gap-2 flex-wrap">
                                                                {clasesTarde.map(c => {
                                                                    const nivelesClase = c.nivelesPermitidos || 'Todos';
                                                                    let nivelNoPermitido = false;
                                                                    if (nivelesClase !== 'Todos') {
                                                                        const jerarquia = { "novato": 1, "principiante": 2, "intermedio": 3, "rx": 4, "avanzado": 4 };
                                                                        const nivelAtletaVal = jerarquia[form.nivelAtleta.trim().toLowerCase()] || 1;
                                                                        let nivelClaseVal = 0;
                                                                        Object.keys(jerarquia).forEach(nivel => {
                                                                            if (nivelesClase.toLowerCase().includes(nivel)) {
                                                                                nivelClaseVal = Math.max(nivelClaseVal, jerarquia[nivel]);
                                                                            }
                                                                        });
                                                                        if (nivelClaseVal === 0) nivelClaseVal = 1;
                                                                        if (nivelAtletaVal < nivelClaseVal) {
                                                                            nivelNoPermitido = true;
                                                                        }
                                                                    }
                                                                    return (
                                                                        <button key={c.idClase} disabled={nivelNoPermitido} onClick={() => agregarVisita(dia, 'Clase', c.idClase)} className={`btn btn-sm ${nivelNoPermitido ? 'btn-dark text-secondary border-secondary' : 'btn-outline-danger'}`}>
                                                                            {c.nombre} {nivelesClase !== 'Todos' && <span className="badge bg-secondary bg-opacity-25 ms-1 border border-secondary border-opacity-50 fw-normal" style={{ fontSize: '0.65rem' }}>{nivelesClase}</span>} <br />
                                                                            <small className={nivelNoPermitido ? "opacity-50" : "opacity-75"}>{nivelNoPermitido ? `SOLO ${nivelesClase.toUpperCase()}` : `${c.horarioInicio} (${c.inscritos}/${c.maximoAtletas})`}</small>
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}

                                <div className="d-flex gap-2 mt-4">
                                    <button onClick={() => setPaso(1)} className="btn btn-outline-secondary w-50">Regresar</button>
                                    <button onClick={() => setPaso(3)} className="btn btn-danger w-50 fw-bold" disabled={form.visitas.length === 0}>SIGUIENTE PASO <i className="fas fa-check ms-2"></i></button>
                                </div>
                            </div>
                        )}

                        {/* PASO 3: CONFIRMACIÓN Y PAGO */}
                        {paso === 3 && (
                            <div className="text-center">
                                <i className="fas fa-bolt text-danger display-1 mb-3"></i>
                                <h2 className="text-white fw-bold">TOTAL: ${getCostoTotal()} MXN</h2>

                                {!enableStripe && getCostoTotal() > 0 && (
                                    <div className="alert alert-warning text-dark text-start mt-4 border-0">
                                        <i className="fas fa-exclamation-circle me-2"></i>
                                        El monto mínimo para pago en línea de este Box es de <strong>${box?.compraMinimaTarjeta} MXN</strong>. <br />
                                        Por favor reserva localmente y paga en mostrador, o regresa y agrega más días a tu pase.
                                    </div>
                                )}

                                <div className="d-flex flex-column gap-3 mt-4">
                                    <BotonSeguro disabled={!enableStripe} onClick={() => confirmarReserva(true)} className="btn btn-primary w-100 py-3 fw-bold fs-5" textoProcesando="Procesando Visa/MC...">
                                        <i className="fab fa-stripe-s me-2"></i> PAGAR EN LÍNEA TUS VISITAS
                                    </BotonSeguro>

                                    <div className="text-secondary small fw-bold">O SI LO PREFIERES:</div>

                                    <BotonSeguro onClick={() => confirmarReserva(false)} className="btn btn-success w-100 py-3 fw-bold shadow-lg" textoProcesando="Reservando en Recepción...">
                                        <i className="fas fa-cash-register me-2"></i> RESERVAR Y PAGAR EN TAQUILLA
                                    </BotonSeguro>
                                </div>

                                <button onClick={() => setPaso(2)} className="btn btn-link text-secondary mt-3">Editar Selección</button>
                            </div>
                        )}

                        {paso === 4 && (
                            <div className="text-center py-5">
                                <i className="fas fa-check-circle text-success display-1 mb-3"></i>
                                <h1 className="text-white fw-bold">¡Reservado Exitosamente!</h1>
                                <p className="text-secondary">Usa tu correo en la pestaña "VER MI WOD / ESTATUS" para revelar las rutinas una vez aprobado el pago. ¡Rómpela! 🐺</p>
                                <button onClick={() => { setPaso(1); setForm({ ...form, visitas: [] }); }} className="btn btn-outline-danger mt-4 px-5">Regresar</button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}