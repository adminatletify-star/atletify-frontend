import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import RedGrayDatePicker from '../components/RedGrayDatePicker';
import BackButton from '../components/BackButton';
import ModoRankingPicker from '../components/ModoRankingPicker';
import MetricaGanarPicker from '../components/MetricaGanarPicker';
import TipoBloquePicker from '../components/TipoBloquePicker';
import ModalidadBloquePicker from '../components/ModalidadBloquePicker';
import EquipoBloquePicker from '../components/EquipoBloquePicker';
import EjercicioPicker from '../components/EjercicioPicker';
import BotonSeguro from '../components/BotonSeguro';
import TimeInputMMSS from '../components/TimeInputMMSS';
import { api } from '../services/api';
import '../assets/css/CreadorWods.css';

const API_BASE = import.meta.env.VITE_API_URL;;

const getFechaLocalString = () => {
  const hoy = new Date();
  return hoy.getFullYear() + '-' +
    String(hoy.getMonth() + 1).padStart(2, '0') + '-' +
    String(hoy.getDate()).padStart(2, '0');
};

export default function CreadorWods() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fechaParam = searchParams.get('fecha');
  const fechaLimpia = fechaParam ? fechaParam.substring(0, 10) : getFechaLocalString();

  const [box, setBox] = useState(null);
  const [glosarioEjercicios, setGlosarioEjercicios] = useState([]);
  const [clasesDisponibles, setClasesDisponibles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modoRanking, setModoRanking] = useState('Auto');
  const [metricaPrincipal, setMetricaPrincipal] = useState('Tiempo');

  const [titulo, setTitulo] = useState('WOD del Día');
  // 👈 USAMOS LA FUNCIÓN LOCAL EN LUGAR DE .toISOString()
  const [fechaProgramada, setFechaProgramada] = useState(fechaLimpia);
  const [estaPublicado, setEstaPublicado] = useState(true);
  const [notasAdicionales, setNotasAdicionales] = useState('');
  const [clasesSeleccionadas, setClasesSeleccionadas] = useState([]);

  // EL ROMPECABEZAS (Ahora incluye la Plantilla de Jueceo)
  const [bloques, setBloques] = useState([
    {
      tipoBloque: 'WOD',
      tipoModalidad: 'For Time',
      modalidadEquipo: 'Individual',
      capTimeMinutos: '',
      minutosExtraCap: '',
      descripcionLibre: '',
      ejercicios: [],
      plantillaJueceo: [], // <--- AQUÍ GUARDAMOS LAS MÉTRICAS (Ej: ["Split R1", "Tiempo Total"])
      inputMetrica: '' // <--- Para controlar lo que escribe el coach antes de darle a "+"
    }
  ]);

  useEffect(() => {
    const b = JSON.parse(localStorage.getItem('box'));
    const u = JSON.parse(localStorage.getItem('usuario'));
    if (!b || !u || (u.rol !== 'AdminBox' && u.rol !== 'Coach' && u.rol !== 'Developer')) {
      navigate('/');
      return;
    }
    setBox(b);
    cargarDatos(b.idBox);
  }, [navigate]);

  async function cargarDatos(idBox) {
    try {
      const [ejerciciosDiccionario, resCl] = await Promise.all([
        api.obtenerEjerciciosDiccionario().catch(() => []),
        fetch(`${API_BASE}/clases/box/${idBox}`)
      ]);

      const ejerciciosMovimientos = Array.isArray(ejerciciosDiccionario)
        ? ejerciciosDiccionario.map(ej => ({
          idEjercicio: ej.id,
          nombre: ej.nombre,
          equipamiento: ej.equipamiento,
          categoria: ej.categoria,
        }))
        : [];

      setGlosarioEjercicios(ejerciciosMovimientos);

      if (resCl.ok) {
        const data = await resCl.json();
        setClasesDisponibles(Array.isArray(data) ? data : (data.data || []));
      }
    } catch (err) { console.error("Error cargando catálogos", err); }
  }

  const toggleClase = (idClase) => setClasesSeleccionadas(prev => prev.includes(idClase) ? prev.filter(id => id !== idClase) : [...prev, idClase]);
  const seleccionarTodasClases = () => setClasesSeleccionadas(clasesSeleccionadas.length === clasesDisponibles.length ? [] : clasesDisponibles.map(c => c.idClase));

  const agregarBloque = () => {
    setBloques([...bloques, {
      tipoBloque: 'Warm-Up', tipoModalidad: 'Not For Time', modalidadEquipo: 'Individual',
      capTimeMinutos: '', minutosExtraCap: '', descripcionLibre: '', ejercicios: [], plantillaJueceo: [], inputMetrica: ''
    }]);
  };

  const actualizarBloque = (index, campo, valor) => {
    const nuevos = [...bloques];
    nuevos[index][campo] = valor;
    setBloques(nuevos);
  };

  const quitarBloque = (index) => setBloques(bloques.filter((_, i) => i !== index));

  const agregarEjercicioABloque = (bloqueIndex) => {
    const nuevos = [...bloques];
    nuevos[bloqueIndex].ejercicios.push({ idEjercicio: '', esquemaRepeticiones: '', pesoSugerido: '' });
    setBloques(nuevos);
  };

  const actualizarEjercicio = (bloqueIndex, ejIndex, campo, valor) => {
    const nuevos = [...bloques];
    nuevos[bloqueIndex].ejercicios[ejIndex][campo] = valor;
    setBloques(nuevos);
  };

  const quitarEjercicio = (bloqueIndex, ejIndex) => {
    const nuevos = [...bloques];
    nuevos[bloqueIndex].ejercicios = nuevos[bloqueIndex].ejercicios.filter((_, i) => i !== ejIndex);
    setBloques(nuevos);
  };

  // --- MAGIA DE LA PLANTILLA DE JUECEO ---
  const agregarMetrica = (bIndex) => {
    const nuevos = [...bloques];
    if (nuevos[bIndex].inputMetrica.trim() !== '') {
      nuevos[bIndex].plantillaJueceo.push(nuevos[bIndex].inputMetrica.trim());
      nuevos[bIndex].inputMetrica = ''; // Limpiamos el input
      setBloques(nuevos);
    }
  };

  const quitarMetrica = (bIndex, mIndex) => {
    const nuevos = [...bloques];
    nuevos[bIndex].plantillaJueceo = nuevos[bIndex].plantillaJueceo.filter((_, i) => i !== mIndex);
    setBloques(nuevos);
  };

  // --- GUARDAR WOD ---
  const handleGuardar = async (e) => {
    e.preventDefault();
    setLoading(true);

    const bloquesLimpios = bloques.map(b => {
      // 👈 LÓGICA DEL CAPITÁN: Definir la métrica según el modo
      let plantillaFinal = b.plantillaJueceo;

      if (modoRanking === 'Auto') {
        if (metricaPrincipal === 'Tiempo') plantillaFinal = ['Tiempo Total (MM:SS)'];
        else if (metricaPrincipal === 'Peso') plantillaFinal = ['Peso Máximo'];
        else if (metricaPrincipal === 'Reps') plantillaFinal = ['Total Repeticiones'];
        else if (metricaPrincipal === 'RondasReps') plantillaFinal = ['Rondas', 'Repeticiones'];
      } else {
        if (plantillaFinal.length === 0) plantillaFinal = ['Score Principal'];
      }

      return {
        ...b,
        capTimeMinutos: b.capTimeMinutos || null,
        minutosExtraCap: b.minutosExtraCap ? parseInt(b.minutosExtraCap) : null,
        ejercicios: b.ejercicios.filter(ej => ej.idEjercicio !== '').map(ej => ({
          ...ej,
          idEjercicioDiccionario: parseInt(ej.idEjercicio)
        })),
        plantillaJueceo: JSON.stringify(plantillaFinal) // 👈 Guardamos la plantilla ya procesada
      };
    });

    //  TRUCO DE ZONA HORARIA: Forzamos el mediodía (T12:00:00Z) para que no cambie de día
    //  MANDAMOS LA FECHA COMO TEXTO PURO (Ej. "2026-03-21"), SIN ZONAS HORARIAS
    const payload = {
      idBox: box.idBox,
      titulo,
      fechaProgramada: fechaProgramada.substring(0, 10),
      estaPublicado,
      notasAdicionales,
      clasesIds: clasesSeleccionadas,
      bloques: bloquesLimpios,
      modoRanking: modoRanking,
      metricaPrincipal: modoRanking === 'Auto' ? metricaPrincipal : null,
      rankingPublicado: modoRanking === 'Auto' ? true : false // Si es automático, se publica de inmediato. Si es manual, espera a que el coach publique la pizarra.
    };

    try {
      const res = await fetch(`${API_BASE}/entrenamientos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        alert("¡WOD guardado con su Plantilla de Jueceo!");
        navigate('/calendario-wods');
      } else {
        const err = await res.json();
        alert(err.mensaje || "Error al guardar");
      }
    } catch (err) { alert("Error de conexión"); }
    finally { setLoading(false); }
  };

  // Mapa de tipoBloque → clase CSS
  const bloqueColorClass = (tipo) => ({
    'WOD': 'crw-bloque--wod',
    'Warm-Up': 'crw-bloque--warmup',
    'Fuerza/Skill': 'crw-bloque--fuerza',
    'Cash-Out': 'crw-bloque--cashout'
  }[tipo] || 'crw-bloque--warmup');

  return (
    <div className="crw-page">

      {/* ══════════════════════════════════
          HEADER
      ══════════════════════════════════ */}
      <header className="crw-header">
        <div className="d-flex align-items-center gap-3">
          <BackButton to="/calendario-wods" />
          <h1 className="crw-header-title">
            Armar <span style={{ color: 'var(--primary)' }}>WOD</span>
          </h1>
        </div>
      </header>

      <div className="container px-3" style={{ maxWidth: '1000px' }}>
        <form onSubmit={handleGuardar}>

          {/* ══════════════════════════════════
              TARJETA 1 — INFO GENERAL
          ══════════════════════════════════ */}
          <div className="tarjeta-panel p-4 mb-4">
            <p className="crw-section-label">
              <i className="fas fa-heading"></i>Información General
            </p>

            <div className="row g-3 mb-4">
              <div className="col-12 col-md-8">
                <label className="etiqueta-campo">Título del Entrenamiento</label>
                <input
                  type="text"
                  className="crw-titulo-input"
                  required
                  value={titulo}
                  onChange={e => setTitulo(e.target.value)}
                  placeholder="Ej: Murph, Lunes de Pierna..."
                />
              </div>
              <div className="col-12 col-md-4">
                <label className="etiqueta-campo">
                  <i className="fas fa-calendar me-1" style={{ color: 'var(--accent-cool)' }}></i>
                  Fecha Programada
                </label>
                <RedGrayDatePicker
                  required
                  value={fechaProgramada}
                  onChange={setFechaProgramada}
                  inputClassName="shadow-none p-3 rounded-4"
                />
              </div>
            </div>

            <hr className="separador" />

            <div className="d-flex justify-content-between align-items-center gap-2 mb-2 flex-wrap">
              <p className="crw-section-label mb-0" style={{ flex: 'none' }}>
                <i className="fas fa-clock"></i>¿A qué clases aplica?
              </p>
              <button type="button" onClick={seleccionarTodasClases} className="crw-select-all-btn">
                <i className="fas fa-check-double me-1"></i>
                <span className="d-none d-sm-inline">Seleccionar </span>Todas
              </button>
            </div>

            <div className="crw-clases-container">
              {clasesDisponibles.length === 0 && (
                <p className="crw-empty-text">No hay clases disponibles</p>
              )}
              {clasesDisponibles.map(c => (
                <button
                  key={c.idClase}
                  type="button"
                  className={`crw-clase-chip ${clasesSeleccionadas.includes(c.idClase) ? 'crw-clase-chip--active' : ''}`}
                  onClick={() => toggleClase(c.idClase)}
                >
                  <i className={`${clasesSeleccionadas.includes(c.idClase) ? 'fas' : 'far'} fa-check-circle`}></i>
                  <span className="d-none d-sm-inline">{c.horarioInicio.substring(0, 5)} — </span>
                  {c.nombre}
                </button>
              ))}
            </div>
          </div>

          {/* ══════════════════════════════════
              TARJETA 2 — LEADERBOARD
          ══════════════════════════════════ */}
          <div className="tarjeta-panel p-4 mb-4 crw-leaderboard-card">
            <p className="crw-section-label crw-section-label--gold">
              <i className="fas fa-trophy"></i>Configuración de Leaderboard
            </p>

            <div className="row g-3">
              <div className="col-12 col-md-6">
                <label className="etiqueta-campo">Modo de Ranking</label>
                <ModoRankingPicker
                  valor={modoRanking}
                  onCambiar={setModoRanking}
                />
              </div>

              {modoRanking === 'Auto' && (
                <div className="col-12 col-md-6">
                  <label className="etiqueta-campo">Métrica para ganar</label>
                  <MetricaGanarPicker
                    valor={metricaPrincipal}
                    onCambiar={setMetricaPrincipal}
                  />
                </div>
              )}

              {modoRanking === 'Manual' && (
                <div className="col-12 col-md-6 d-flex align-items-center">
                  <p className="crw-info-text">
                    <i className="fas fa-info-circle me-1"></i>
                    Los scores se mantendrán ocultos hasta que el Coach los ordene manualmente y publique la Pizarra.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ══════════════════════════════════
              SECCIONES DEL ENTRENAMIENTO
          ══════════════════════════════════ */}
          <p className="titulo-seccion mt-4 mb-3">
            <i className="fas fa-puzzle-piece"></i>Secciones del Entrenamiento
          </p>

          {bloques.map((bloque, bIndex) => (
            <div
              key={bIndex}
              className={`tarjeta-panel mb-4 crw-bloque ${bloqueColorClass(bloque.tipoBloque)}`}
            >
              {bloques.length > 1 && (
                <button
                  type="button"
                  onClick={() => quitarBloque(bIndex)}
                  className="crw-delete-bloque-btn"
                >
                  <i className="fas fa-trash"></i>
                </button>
              )}

              <div className="p-4">

                {/* FILA DE CONFIGURACIÓN DEL BLOQUE */}
                <div className="row g-2 mb-3">
                  <div className="col-6 col-md-3">
                    <label className="etiqueta-campo">Tipo</label>
                    <TipoBloquePicker
                      valor={bloque.tipoBloque}
                      onCambiar={v => actualizarBloque(bIndex, 'tipoBloque', v)}
                    />
                  </div>
                  <div className="col-6 col-md-3">
                    <label className="etiqueta-campo">Modalidad</label>
                    <ModalidadBloquePicker
                      valor={bloque.tipoModalidad}
                      onCambiar={v => actualizarBloque(bIndex, 'tipoModalidad', v)}
                    />
                  </div>
                  <div className="col-6 col-md-3">
                    <label className="etiqueta-campo">Equipo</label>
                    <EquipoBloquePicker
                      valor={bloque.modalidadEquipo}
                      onCambiar={v => actualizarBloque(bIndex, 'modalidadEquipo', v)}
                    />
                  </div>
                  <div className="col-6 col-md-3">
                    <label className="etiqueta-campo">Cap (MM:SS)</label>
                    <TimeInputMMSS
                      value={bloque.capTimeMinutos}
                      onChange={val => actualizarBloque(bIndex, 'capTimeMinutos', val)}
                      className="crw-reps-input border-0 bg-transparent p-0 flex-grow-1"
                    />
                  </div>
                </div>

                {/* DESCRIPCIÓN LIBRE */}
                <div className="mb-3">
                  <label className="etiqueta-campo">
                    <i className="fas fa-align-left me-1"></i>Instrucciones
                  </label>
                  <textarea
                    className="entrada-oscura"
                    rows="2"
                    placeholder="Instrucciones libres..."
                    value={bloque.descripcionLibre}
                    onChange={e => actualizarBloque(bIndex, 'descripcionLibre', e.target.value)}
                  />
                </div>

                {/* MOVIMIENTOS */}
                <div className="crw-movimientos-zone mb-3">
                  <div className="d-flex justify-content-between align-items-center mb-3 gap-2">
                    <p className="crw-sub-label">
                      <i className="fas fa-list-ul me-1"></i>Movimientos
                    </p>
                    <button
                      type="button"
                      onClick={() => agregarEjercicioABloque(bIndex)}
                      className="crw-add-ejercicio-btn"
                    >
                      <i className="fas fa-plus me-1"></i>
                      <span className="d-none d-sm-inline">Añadir </span>Ejercicio
                    </button>
                  </div>

                  {bloque.ejercicios.length === 0 && (
                    <p className="crw-empty-text text-center py-2">No hay ejercicios añadidos</p>
                  )}

                {bloque.ejercicios.map((ej, eIndex) => {
                  const ejercicioInfo = glosarioEjercicios.find(g => g.idEjercicio == ej.idEjercicio);
                  const categoria = ejercicioInfo?.categoria || '';
                  
                  let placeholderReps = "Reps/Dist.";
                  let regexFiltro = /[^0-9xXmcal\s-]/gi;
                  
                  if (categoria === 'Monostructural') {
                    placeholderReps = "Ej: 400m, 15cal";
                    regexFiltro = /[^0-9mcal\s]/gi;
                  } else if (categoria === 'Weightlifting' || categoria === 'Gymnastics') {
                    placeholderReps = "Ej: 4x12, 21-15";
                    regexFiltro = /[^0-9xX\s-]/gi;
                  }

                  return (
                    <div key={eIndex} className="crw-ejercicio-row row g-2 align-items-center">
                      <div className="col-4 col-sm-3 col-md-2">
                        <input
                          type="text"
                          className="crw-reps-input"
                          placeholder={placeholderReps}
                          value={ej.esquemaRepeticiones}
                          maxLength="15"
                          onChange={e => {
                            let val = e.target.value.replace(regexFiltro, '');
                            actualizarEjercicio(bIndex, eIndex, 'esquemaRepeticiones', val);
                          }}
                        />
                      </div>
                      <div className="col-8 col-sm-9 col-md-5">
                        <EjercicioPicker
                          ejercicios={glosarioEjercicios}
                          valor={ej.idEjercicio}
                          onCambiar={v => actualizarEjercicio(bIndex, eIndex, 'idEjercicio', v)}
                        />
                      </div>
                      <div className="col-9 col-sm-8 col-md-4">
                        <input
                          type="text"
                          className="crw-peso-input"
                          placeholder="Peso (Ej: 135/95)"
                          value={ej.pesoSugerido}
                          maxLength="15"
                          onChange={e => {
                            let val = e.target.value.replace(/[^0-9.\s/lbskg]/gi, '');
                            actualizarEjercicio(bIndex, eIndex, 'pesoSugerido', val);
                          }}
                        />
                      </div>
                      <div className="col-3 col-sm-4 col-md-1 text-center">
                        <button
                          type="button"
                          onClick={() => quitarEjercicio(bIndex, eIndex)}
                          className="crw-delete-ej-btn"
                        >
                          <i className="fas fa-times-circle fs-5"></i>
                        </button>
                      </div>
                    </div>
                  );
                })}
                </div>

                {/* PLANTILLA DE JUECEO */}
                {modoRanking === 'Manual' ? (
                  <div className="crw-jueceo-manual">
                    <p className="crw-jueceo-manual-title">
                      <i className="fas fa-clipboard-check me-1"></i>Plantilla de Jueceo (Modo Manual)
                    </p>
                    <p className="crw-info-text mb-3">
                      Define todas las métricas que el Coach deberá llenar para evaluar este bloque y armar el Leaderboard.
                    </p>
                    <div className="d-flex gap-2 mb-3">
                      <input
                        type="text"
                        className="entrada-oscura"
                        style={{ borderColor: 'rgba(46,204,113,0.3)' }}
                        placeholder="Ej: Tiempo R1, Peso Max, Reps..."
                        value={bloque.inputMetrica}
                        onChange={e => actualizarBloque(bIndex, 'inputMetrica', e.target.value)}
                        onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), agregarMetrica(bIndex))}
                      />
                      <button
                        type="button"
                        onClick={() => agregarMetrica(bIndex)}
                        className="crw-add-metrica-btn"
                      >
                        <i className="fas fa-plus"></i>
                      </button>
                    </div>
                    <div className="d-flex flex-wrap gap-2">
                      {bloque.plantillaJueceo.length === 0 && (
                        <small className="crw-empty-text fst-italic">Añade al menos una métrica</small>
                      )}
                      {bloque.plantillaJueceo.map((metrica, mIndex) => (
                        <span key={mIndex} className="crw-metrica-tag">
                          {metrica}
                          <i className="fas fa-times-circle" onClick={() => quitarMetrica(bIndex, mIndex)}></i>
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="crw-jueceo-auto">
                    <p className="crw-jueceo-auto-title">
                      <i className="fas fa-robot me-1"></i>Evaluación Automática
                    </p>
                    <p className="crw-info-text mb-0">
                      El sistema evaluará a los atletas usando únicamente:&nbsp;
                      <strong style={{ color: 'var(--accent)', textTransform: 'uppercase' }}>{metricaPrincipal}</strong>.
                    </p>
                  </div>
                )}

              </div>
            </div>
          ))}

          {/* ══════════════════════════════════
              AGREGAR SECCIÓN
          ══════════════════════════════════ */}
          <button type="button" onClick={agregarBloque} className="crw-add-bloque-btn">
            <i className="fas fa-plus-circle me-2"></i>Agregar Sección
          </button>

          {/* ══════════════════════════════════
              BARRA DE PIE — PUBLICAR + GUARDAR
          ══════════════════════════════════ */}
          <div className="crw-footer-bar">
            <div className="crw-toggle-row">
              <input
                className="form-check-input m-0"
                type="checkbox"
                role="switch"
                checked={estaPublicado}
                onChange={e => setEstaPublicado(e.target.checked)}
                style={{ width: '48px', height: '24px' }}
              />
              <p className="crw-toggle-label mb-0">
                {estaPublicado
                  ? <span style={{ color: 'var(--success)' }}><i className="fas fa-eye me-2"></i>Público</span>
                  : <span style={{ color: 'var(--text-muted)' }}><i className="fas fa-eye-slash me-2"></i>Borrador</span>
                }
              </p>
            </div>

            <BotonSeguro type="button" onClick={handleGuardar} className="crw-save-btn" textoProcesando="Guardando...">
              <i className="fas fa-save"></i>Guardar WOD
            </BotonSeguro>
          </div>

        </form>
      </div>
    </div>
  );
}
