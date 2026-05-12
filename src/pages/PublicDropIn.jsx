import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DarkVeil from '../components/ReactBits/DarkVeil';
import BotonSeguro from '../components/BotonSeguro';
import CategoriaBasePicker from '../components/CategoriaBasePicker';
import '../assets/css/public-dropin.css';

const API_BASE = import.meta.env.VITE_API_URL;;

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
            const [resBox, resPlanes, resClases, resConfig] = await Promise.all([
                fetch(`${API_BASE}/box/${idBox}`),
                fetch(`${API_BASE}/finanzas/planes-publicos/${idBox}`),
                fetch(`${API_BASE}/publicdropin/clases-disponibles/${idBox}`),
                fetch(`${API_BASE}/configuracionbox/${idBox}`)
            ]);

            let boxData = null;
            let configData = null;

            if (resBox.ok) boxData = await resBox.json();
            if (resConfig.ok) configData = await resConfig.json();

            if (boxData) {
                setBox({ ...boxData, ...configData });
            }

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
            <div className="public-dropin-root" style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: -1 }}><DarkVeil opacity={0.8} /></div>

                {/* LOGO ARRIBA */}
                <div className="pt-5 pb-2 text-center position-relative" style={{ zIndex: 1 }}>
                    <img src="/LogosDeAtletify/LogoBlanco.png" alt="Atletify" style={{ width: '120px', cursor: 'pointer' }} onClick={() => navigate('/')} />
                </div>

                <div className="container pb-5 position-relative" style={{ zIndex: 1, maxWidth: '1000px' }}>
                    <header className="text-center mb-5">
                        <span className="seccion-tag text-danger border-danger px-3 py-1 rounded-pill small fw-bold mb-3 d-inline-block" style={{ background: 'rgba(230, 57, 70, 0.1)', borderColor: 'rgba(230, 57, 70, 0.3)' }}>ECOSISTEMA</span>
                        <h1 className="text-white fw-bold display-5" style={{ fontFamily: 'var(--font-heading)' }}>DIRECTORIO DROP-IN</h1>
                        <p className="text-secondary">Encuentra un box cerca de ti y entrena sin fronteras.</p>
                    </header>
                    <div className="row g-4 justify-content-center">
                        {boxesDirectorate.map(b => (
                            <div key={b.idBox} className="col-12 col-md-6 col-lg-4">
                                <div
                                    className="p-4 rounded-4 text-center cursor-pointer h-100 d-flex flex-column"
                                    style={{
                                        background: 'linear-gradient(145deg, var(--bg-card) 0%, #0a0a10 100%)',
                                        border: '1px solid var(--border)',
                                        boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
                                        transition: 'all 0.3s ease'
                                    }}
                                    onClick={() => navigate(`/public-drop-in/${b.idBox}`)}
                                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-6px)'; e.currentTarget.style.borderColor = 'rgba(230, 57, 70, 0.4)'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
                                >
                                    <div className="mb-4 d-flex justify-content-center">
                                        {b.logo && b.logo.trim() !== '' ? (
                                            <img src={b.logo} alt={b.nombre} style={{ width: '85px', height: '85px', borderRadius: '18px', objectFit: 'cover', border: '1px solid var(--border)' }} />
                                        ) : (
                                            <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(b.nombre)}&background=1C1C26&color=E63946&size=128&bold=true`} alt={b.nombre} style={{ width: '85px', height: '85px', borderRadius: '18px', objectFit: 'cover', border: '1px solid var(--border)' }} />
                                        )}
                                    </div>
                                    <h5 className="text-white fw-bold mb-2" style={{ fontFamily: 'var(--font-heading)', letterSpacing: '0.5px' }}>{b.nombre}</h5>
                                    <p className="text-secondary small mb-4 flex-grow-1"><i className="fas fa-map-marker-alt text-danger me-1"></i> {b.ubicacion || 'Ubicación no especificada'}</p>

                                    <div className="d-flex flex-column gap-2 mt-auto">
                                        <button className="btn w-100 py-2" style={{ background: 'var(--primary)', color: 'white', borderRadius: '50px', fontWeight: 'bold', border: 'none', transition: 'all 0.3s' }}
                                            onClick={(e) => { e.stopPropagation(); navigate(`/public-drop-in/${b.idBox}`); }}
                                            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--primary-dark)'}
                                            onMouseLeave={(e) => e.currentTarget.style.background = 'var(--primary)'}>
                                            <i className="fas fa-calendar-plus me-2"></i>RESERVAR DROP-IN
                                        </button>
                                        <button className="btn w-100 py-2" style={{ background: 'transparent', color: 'white', borderRadius: '50px', fontWeight: 'bold', border: '1px solid var(--border)', transition: 'all 0.3s' }}
                                            onClick={(e) => { e.stopPropagation(); navigate(`/box/${b.idBox}`); }}
                                            onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)'}
                                            onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}>
                                            <i className="fas fa-eye me-2"></i>VER BOX
                                        </button>
                                    </div>
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
        <div style={{ minHeight: '100vh', backgroundColor: '#0a0a0b', color: '#f0f0ff', paddingTop: '80px', paddingBottom: '40px' }}>
            {/* NAVBAR TURISTA */}
            <div className="sticky-top p-3 d-flex justify-content-center gap-3 mb-4" style={{ zIndex: 10, background: 'rgba(11, 11, 15, 0.85)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--border)' }}>
                <button onClick={() => setModoVista('RESERVAR')} className={`btn fw-bold rounded-pill px-4 ${modoVista === 'RESERVAR' ? 'btn-danger' : 'btn-outline-secondary'}`} style={{ border: modoVista === 'RESERVAR' ? 'none' : '' }}>
                    <i className="fas fa-calendar-plus me-2"></i> NUEVA VISITA
                </button>
                <button onClick={() => setModoVista('STATUS')} className={`btn fw-bold rounded-pill px-4 ${modoVista === 'STATUS' ? 'btn-warning text-dark' : 'btn-outline-secondary'}`} style={{ border: modoVista === 'STATUS' ? 'none' : '' }}>
                    <i className="fas fa-search me-2"></i> VER ESTATUS
                </button>
            </div>

            <div className="container position-relative pb-5" style={{ zIndex: 1, maxWidth: '900px' }}>

                {/* CABECERA BOX */}
                <header className="text-center mb-5 d-flex flex-column align-items-center">
                    {box?.logo && box?.logo.trim() !== '' ? (
                        <img src={box?.logo} alt={box?.nombre} className="mb-3" style={{ width: '110px', height: '110px', borderRadius: '24px', objectFit: 'cover', border: '2px solid var(--border)', boxShadow: '0 10px 20px rgba(0,0,0,0.5)' }} />
                    ) : (
                        <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(box?.nombre || 'Box')}&background=1C1C26&color=E63946&size=128&bold=true`} alt={box?.nombre} className="mb-3" style={{ width: '110px', height: '110px', borderRadius: '24px', objectFit: 'cover', border: '2px solid var(--border)', boxShadow: '0 10px 20px rgba(0,0,0,0.5)' }} />
                    )}
                    <h2 className="text-white fw-bold display-6" style={{ fontFamily: 'var(--font-heading)' }}>{box?.nombre?.toUpperCase()}</h2>
                    <p className="text-secondary"><i className="fas fa-map-marker-alt text-danger me-2"></i>{box?.ubicacion || 'Ubicación no especificada'}</p>
                </header>

                {/* MODO: STATUS Y WOD */}
                {modoVista === 'STATUS' && (
                    <div className="p-4 p-md-5 rounded-4 mx-auto shadow-lg" style={{ maxWidth: '600px', background: 'linear-gradient(145deg, var(--bg-card) 0%, #0a0a10 100%)', border: '1px solid var(--border)' }}>
                        <h4 className="text-white mb-3" style={{ fontFamily: 'var(--font-heading)' }}><i className="fas fa-search me-2 text-warning"></i>Rastreador de Turista</h4>
                        <p className="text-secondary small mb-4">Ingresa el correo con el que registraste tu visita de HOY para saber tu estatus y revelar la programación si fuiste aprobado.</p>
                        <div className="d-flex flex-column mb-4">
                            <label className="text-secondary small fw-bold mb-2">Correo Electrónico</label>
                            <div className="d-flex flex-column flex-sm-row gap-3">
                                <input
                                    type="email"
                                    placeholder="tu@correo.com"
                                    className="form-control"
                                    style={{ background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '12px', padding: '0.8rem 1rem' }}
                                    value={consultaCorreo}
                                    onChange={e => setConsultaCorreo(e.target.value)}
                                />
                                <BotonSeguro onClick={consultarStatus} className="btn btn-warning fw-bold text-dark px-4 py-2" style={{ borderRadius: '12px', whiteSpace: 'nowrap' }} textoProcesando="Buscando...">Verificar</BotonSeguro>
                            </div>
                        </div>

                        {statusResult && (
                            <div className={`p-4 rounded border ${statusResult.estatus === 'Aprobado' ? 'border-success bg-success bg-opacity-10' : 'border-warning bg-warning bg-opacity-10'}`}>
                                <h5 className={statusResult.estatus === 'Aprobado' ? 'text-success' : 'text-warning'}>
                                    <i className={`fas ${statusResult.estatus === 'Aprobado' ? 'fa-check-circle' : 'fa-clock'} me-2`}></i>
                                    {statusResult.estatus || (statusResult.encontrado === false ? 'No Encontrado' : 'Estatus Desconocido')}
                                </h5>
                                <p className="text-white small mb-0">{statusResult.mensaje}</p>

                                {statusResult.estatus === 'Aprobado' && statusResult.wodObj && (
                                    <div className="mt-4 p-3 rounded text-center" style={{ backgroundColor: '#0a0a0b', borderTop: '2px solid rgba(255,255,255,0.05)' }}>
                                        <h2 className="text-danger fw-light mb-1" style={{ fontFamily: 'var(--font-heading)', textTransform: 'uppercase', letterSpacing: '2px' }}>WOD DEL DÍA</h2>
                                        <div className="d-flex justify-content-center mb-4">
                                            <span className="badge bg-danger rounded-pill px-3 py-1 fw-bold">Benchmark</span>
                                        </div>

                                        <div className="text-start">
                                            {statusResult.wodObj.bloques?.map((bloque, index) => (
                                                <div key={index} className="mb-4 p-4 rounded" style={{ backgroundColor: '#18181b', borderLeft: '4px solid #ff4d4f' }}>
                                                    <div className="d-flex justify-content-between align-items-center mb-3">
                                                        <h6 className="fw-bold mb-0 text-white opacity-75" style={{ letterSpacing: '1px' }}>{bloque.tipoBloque.toUpperCase()}</h6>
                                                    </div>
                                                    
                                                    {bloque.descripcionLibre && <p className="text-white fw-bold mb-3 fs-5">{bloque.descripcionLibre}</p>}

                                                    {bloque.ejercicios?.length > 0 && (
                                                        <ul className="list-unstyled mb-0">
                                                            {bloque.ejercicios.map((ej, i) => (
                                                                <li key={i} className="mb-2 d-flex align-items-center">
                                                                    <span className="fw-bold me-3 fs-4" style={{ color: '#4fc3f7' }}>{ej.esquemaRepeticiones}</span>
                                                                    <span className="text-white fs-4 fw-bold">{ej.ejercicio?.nombre}</span>
                                                                    {ej.pesoSugerido && <span className="ms-auto fw-bold" style={{ color: '#ffb74d' }}>({ej.pesoSugerido})</span>}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    )}
                                                </div>
                                            ))}
                                            {statusResult.wodObj.notasAdicionales && (
                                                <p className="text-secondary small mt-3 fst-italic text-center">{statusResult.wodObj.notasAdicionales}</p>
                                            )}
                                        </div>
                                        <p className="text-secondary small mt-4 fst-italic">Tu resultado no subirá al pizarrón público por seguridad de cuentas, ¡pero dalo todo!</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* MODO: RESERVAR (V2) */}
                {modoVista === 'RESERVAR' && (
                    <div className="p-4 p-md-5 rounded-4 shadow-lg" style={{ background: 'linear-gradient(145deg, var(--bg-card) 0%, #0a0a10 100%)', border: '1px solid var(--border)' }}>

                        {/* PASO 1: DATOS */}
                        {paso === 1 && (
                            <div>
                                <h4 className="text-white mb-4" style={{ fontFamily: 'var(--font-heading)' }}><i className="fas fa-id-card me-2 text-danger"></i>Paso 1: ¿Quién eres?</h4>
                                <div className="row g-4">
                                    <div className="col-12 col-md-6">
                                        <label className="text-secondary small fw-bold mb-2">Nombre Completo</label>
                                        <input
                                            type="text"
                                            className="form-control shadow-none"
                                            style={{ background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '12px', padding: '0.8rem 1rem' }}
                                            value={form.nombre}
                                            onChange={e => setForm({ ...form, nombre: e.target.value })}
                                        />
                                    </div>
                                    <div className="col-12 col-md-6">
                                        <label className="text-secondary small fw-bold mb-2">Correo Electrónico (Para consultar el WOD)</label>
                                        <input
                                            type="email"
                                            className="form-control shadow-none"
                                            style={{ background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '12px', padding: '0.8rem 1rem' }}
                                            value={form.email}
                                            onChange={e => setForm({ ...form, email: e.target.value })}
                                        />
                                    </div>
                                    <div className="col-12">
                                        <label className="text-secondary small fw-bold mb-2">Nivel de Atleta (Obligatorio para seguridad)</label>
                                        <CategoriaBasePicker
                                            valor={form.nivelAtleta}
                                            onCambiar={v => setForm({ ...form, nivelAtleta: v })}
                                        />
                                    </div>
                                </div>
                                <button onClick={() => { if (form.nombre && form.email) setPaso(2); else alert("Nombre y correo son requeridos."); }} className="btn btn-danger w-100 fw-bold py-3 mt-4" style={{ borderRadius: '12px' }}>IR AL CARRITO MULTIDÍA <i className="fas fa-arrow-right ms-2"></i></button>
                            </div>
                        )}

                        {/* PASO 2: CARRITO DE CLASES */}
                        {paso === 2 && (
                            <div>
                                <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
                                    <h4 className="text-white mb-0" style={{ fontFamily: 'var(--font-heading)' }}><i className="fas fa-calendar-check me-2 text-danger"></i>Paso 2: Arma tu Visita</h4>
                                    <div className="d-flex align-items-center gap-3">
                                        <h4 className="text-success mb-0 fw-bold" style={{ letterSpacing: '1px' }}>TOTAL: ${getCostoTotal()}</h4>
                                        <button onClick={() => setPaso(1)} className="btn btn-sm" style={{ background: 'rgba(255,255,255,0.05)', color: 'white', borderRadius: '50px', border: '1px solid rgba(255,255,255,0.2)', transition: 'all 0.3s' }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'} onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}><i className="fas fa-undo-alt me-2"></i>Volver</button>
                                    </div>
                                </div>

                                <div className="p-4 rounded-4 mb-5 shadow" style={{ background: 'rgba(230, 57, 70, 0.05)', border: '1px solid rgba(230, 57, 70, 0.15)' }}>
                                    <h6 className="text-danger small text-uppercase fw-bold mb-3" style={{ letterSpacing: '1px' }}><i className="fas fa-shopping-cart me-2"></i>Tus Visitas Seleccionadas ({form.visitas.length}):</h6>
                                    {form.visitas.length === 0 ? <p className="text-secondary small mb-0 fst-italic">Aún no has seleccionado ninguna clase u Open Gym. Revisa las opciones abajo.</p> :
                                        <div className="d-flex flex-wrap gap-2">
                                            {form.visitas.map((v, idx) => (
                                                <div key={idx} className="badge d-flex align-items-center p-2 rounded-pill shadow-sm" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', fontSize: '0.8rem', color: 'var(--text-primary)' }}>
                                                    <span className="badge bg-danger rounded-pill me-2">{v.fecha}</span>
                                                    <span className="me-2">{v.tipoVisita === 'Clase' ? `Clase (${clases.find(c => c.idClase == v.idClase)?.nombre || '?'})` : 'Open Gym'}</span>
                                                    <button onClick={() => quitarVisita(idx)} className="btn btn-sm p-0 text-secondary ms-1" style={{ transition: 'color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.color = '#ff4d4f'} onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}><i className="fas fa-times-circle fs-6"></i></button>
                                                </div>
                                            ))}
                                        </div>
                                    }
                                </div>

                                {/* GENERADOR DE FECHAS */}
                                <h6 className="text-secondary small fw-bold mb-4" style={{ letterSpacing: '1px' }}><i className="fas fa-list-ul me-2"></i>CLASES DISPONIBLES ESTA SEMANA:</h6>
                                {dDiasPermitidos.map(dia => {
                                    const clasesDelDia = clases.filter(c => isClaseHabilitadaParaDia(c, dia));
                                    const clasesManana = clasesDelDia.filter(c => esManana(c.horarioInicio));
                                    const clasesTarde = clasesDelDia.filter(c => !esManana(c.horarioInicio));

                                    return (
                                        <div key={dia} className="p-4 rounded-4 mb-4 shadow-sm" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-2 border-bottom border-secondary border-opacity-25 pb-3">
                                                <h5 className="text-white fw-bold mb-0" style={{ letterSpacing: '0.5px' }}><i className="far fa-calendar text-primary me-2"></i>{new Date(dia + 'T00:00:00').toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'short' }).toUpperCase()}</h5>
                                                {box?.costoVisitaGym > 0 && (
                                                    <button onClick={() => agregarVisita(dia, 'SoloGym')} className="btn btn-sm fw-bold px-3 py-2 rounded-pill" style={{ background: 'rgba(245, 166, 35, 0.1)', color: 'var(--warning)', border: '1px solid rgba(245, 166, 35, 0.3)', transition: 'all 0.3s' }} onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(245, 166, 35, 0.2)'; e.currentTarget.style.transform = 'translateY(-2px)' }} onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(245, 166, 35, 0.1)'; e.currentTarget.style.transform = 'translateY(0)' }}>
                                                        <i className="fas fa-dumbbell me-2"></i>Open Gym (${box.costoVisitaGym})
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
                                                                        <button
                                                                            key={c.idClase}
                                                                            disabled={nivelNoPermitido}
                                                                            onClick={() => agregarVisita(dia, 'Clase', c.idClase)}
                                                                            className="btn text-start p-2 rounded-3"
                                                                            style={{
                                                                                background: nivelNoPermitido ? 'rgba(255,255,255,0.02)' : 'rgba(230, 57, 70, 0.08)',
                                                                                color: 'white',
                                                                                border: `1px solid ${nivelNoPermitido ? 'rgba(255,255,255,0.05)' : 'rgba(230, 57, 70, 0.25)'}`,
                                                                                minWidth: '150px',
                                                                                transition: 'all 0.3s'
                                                                            }}
                                                                            onMouseEnter={(e) => { if (!nivelNoPermitido) { e.currentTarget.style.background = 'rgba(230, 57, 70, 0.15)'; e.currentTarget.style.transform = 'translateY(-2px)' } }}
                                                                            onMouseLeave={(e) => { if (!nivelNoPermitido) { e.currentTarget.style.background = 'rgba(230, 57, 70, 0.08)'; e.currentTarget.style.transform = 'translateY(0)' } }}
                                                                        >
                                                                            <div className="fw-bold mb-1" style={{ fontSize: '0.85rem' }}>{c.nombre} <span className="text-success ms-1">(${box?.costoDropIn || 0})</span> {nivelesClase !== 'Todos' && <span className="badge bg-danger bg-opacity-25 ms-1 border border-danger border-opacity-50 text-danger fw-normal" style={{ fontSize: '0.6rem' }}>{nivelesClase}</span>}</div>
                                                                            <div className={nivelNoPermitido ? "text-secondary small fw-bold" : "text-light small opacity-75"}>{nivelNoPermitido ? <><i className="fas fa-lock me-1"></i>Solo {nivelesClase.toUpperCase()}</> : <><i className="far fa-clock me-1"></i>{c.horarioInicio} &bull; <i className="fas fa-user-friends ms-1 me-1"></i>{c.inscritos}/{c.maximoAtletas}</>}</div>
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
                                                                        <button
                                                                            key={c.idClase}
                                                                            disabled={nivelNoPermitido}
                                                                            onClick={() => agregarVisita(dia, 'Clase', c.idClase)}
                                                                            className="btn text-start p-2 rounded-3"
                                                                            style={{
                                                                                background: nivelNoPermitido ? 'rgba(255,255,255,0.02)' : 'rgba(79, 195, 247, 0.08)',
                                                                                color: 'white',
                                                                                border: `1px solid ${nivelNoPermitido ? 'rgba(255,255,255,0.05)' : 'rgba(79, 195, 247, 0.25)'}`,
                                                                                minWidth: '150px',
                                                                                transition: 'all 0.3s'
                                                                            }}
                                                                            onMouseEnter={(e) => { if (!nivelNoPermitido) { e.currentTarget.style.background = 'rgba(79, 195, 247, 0.15)'; e.currentTarget.style.transform = 'translateY(-2px)' } }}
                                                                            onMouseLeave={(e) => { if (!nivelNoPermitido) { e.currentTarget.style.background = 'rgba(79, 195, 247, 0.08)'; e.currentTarget.style.transform = 'translateY(0)' } }}
                                                                        >
                                                                            <div className="fw-bold mb-1" style={{ fontSize: '0.85rem' }}>{c.nombre} <span className="text-success ms-1">(${box?.costoDropIn || 0})</span> {nivelesClase !== 'Todos' && <span className="badge bg-info bg-opacity-25 ms-1 border border-info border-opacity-50 text-info fw-normal" style={{ fontSize: '0.6rem' }}>{nivelesClase}</span>}</div>
                                                                            <div className={nivelNoPermitido ? "text-secondary small fw-bold" : "text-light small opacity-75"}>{nivelNoPermitido ? <><i className="fas fa-lock me-1"></i>Solo {nivelesClase.toUpperCase()}</> : <><i className="far fa-clock me-1"></i>{c.horarioInicio} &bull; <i className="fas fa-user-friends ms-1 me-1"></i>{c.inscritos}/{c.maximoAtletas}</>}</div>
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
                            <div className="text-center px-md-4 py-3">
                                <div className="mb-4">
                                    <div className="d-inline-flex justify-content-center align-items-center rounded-circle bg-danger bg-opacity-10 mb-3" style={{ width: '80px', height: '80px' }}>
                                        <i className="fas fa-receipt text-danger fs-1"></i>
                                    </div>
                                    <h3 className="text-white fw-bold mb-1" style={{ fontFamily: 'var(--font-heading)' }}>Resumen de Pago</h3>
                                    <p className="text-secondary small mb-0">Confirma tus visitas y elige el método de pago</p>
                                </div>

                                <div className="p-4 rounded-4 shadow mb-4" style={{ background: 'linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.08) 100%)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                    <div className="text-secondary text-uppercase small fw-bold mb-2" style={{ letterSpacing: '1.5px' }}>Monto Total a Pagar</div>
                                    <h1 className="text-success fw-bold mb-0" style={{ fontSize: '3rem', textShadow: '0 0 20px rgba(46, 204, 113, 0.3)' }}>${getCostoTotal()} <span className="fs-4 text-white opacity-50 fw-normal">MXN</span></h1>
                                </div>

                                {!enableStripe && getCostoTotal() > 0 && (
                                    <div className="alert p-3 rounded-3 text-start mt-4 mb-4" style={{ background: 'rgba(245, 166, 35, 0.1)', border: '1px solid rgba(245, 166, 35, 0.3)', color: '#ffb74d' }}>
                                        <div className="d-flex align-items-center mb-2">
                                            <i className="fas fa-exclamation-triangle fs-4 me-3 text-warning"></i>
                                            <strong className="fw-bold">Monto Mínimo No Alcanzado</strong>
                                        </div>
                                        <div className="small opacity-75" style={{ marginLeft: '2.8rem' }}>
                                            El monto mínimo para pago en línea de este Box es de <strong>${box?.compraMinimaTarjeta} MXN</strong>. <br />
                                            Por favor reserva localmente y paga en mostrador, o regresa y agrega más días a tu pase.
                                        </div>
                                    </div>
                                )}

                                <div className="d-flex flex-column gap-3 mt-4">
                                    <BotonSeguro disabled={!enableStripe} onClick={() => confirmarReserva(true)} className="btn w-100 py-3 fw-bold fs-5 shadow-lg rounded-3" style={{ background: 'linear-gradient(135deg, #635bff 0%, #4238db 100%)', color: 'white', border: 'none', transition: 'all 0.3s' }} onMouseEnter={(e) => { if (enableStripe) e.currentTarget.style.transform = 'translateY(-3px)' }} onMouseLeave={(e) => { if (enableStripe) e.currentTarget.style.transform = 'translateY(0)' }} textoProcesando="Procesando Visa/MC...">
                                        <i className="fab fa-stripe-s me-2"></i> PAGAR EN LÍNEA TUS VISITAS
                                    </BotonSeguro>

                                    <div className="d-flex align-items-center my-2">
                                        <hr className="flex-grow-1 border-secondary opacity-25" />
                                        <span className="px-3 text-secondary small fw-bold" style={{ letterSpacing: '1px' }}>O SI LO PREFIERES</span>
                                        <hr className="flex-grow-1 border-secondary opacity-25" />
                                    </div>

                                    <BotonSeguro onClick={() => confirmarReserva(false)} className="btn w-100 py-3 fw-bold rounded-3 shadow-sm" style={{ background: 'rgba(46, 204, 113, 0.1)', color: '#2ecc71', border: '1px solid rgba(46, 204, 113, 0.4)', transition: 'all 0.3s' }} onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(46, 204, 113, 0.2)'; e.currentTarget.style.transform = 'translateY(-2px)' }} onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(46, 204, 113, 0.1)'; e.currentTarget.style.transform = 'translateY(0)' }} textoProcesando="Reservando en Recepción...">
                                        <i className="fas fa-cash-register me-2"></i> RESERVAR Y PAGAR EN TAQUILLA
                                    </BotonSeguro>
                                </div>

                                <button onClick={() => setPaso(2)} className="btn btn-link text-secondary mt-4 text-decoration-none shadow-none"><i className="fas fa-arrow-left me-2"></i>Editar Selección de Días</button>
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