import { useMemo, useState } from 'react';
import TipoBarraPicker from '../components/TipoBarraPicker';
import BackButton from '../components/BackButton';
import { useAuth } from '../context/AuthContext';
import '../assets/css/SimuladorBarra.css';

export default function SimuladorBarraPublico() {
  const { usuario } = useAuth();
  const esAtleta = !!usuario;

  const [unidad, setUnidad] = useState('lb');
  const [tipoBarra, setTipoBarra] = useState(45);
  const [pesoObjetivo, setPesoObjetivo] = useState('');
  const [discosLado, setDiscosLado] = useState([]);
  const [pesoTotalCalculado, setPesoTotalCalculado] = useState(0);
  const [modo, setModo] = useState('manual');
  const [sugerencia, setSugerencia] = useState({ visible: false, texto: '', combo: [] });
  const [usarSeguros, setUsarSeguros] = useState(false);
  const [pesoSeguroInput, setPesoSeguroInput] = useState('2.5');
  const [unidadSeguro, setUnidadSeguro] = useState('kg');
  const [modoSimulador, setModoSimulador] = useState('casual');
  const [alternativas, setAlternativas] = useState({ visible: false, objetivoPedido: 0, arriba: null, abajo: null });
  const [discosBloqueados, setDiscosBloqueados] = useState([]);

  const toggleBloqueo = (peso) => {
    setDiscosBloqueados(prev =>
      prev.includes(peso) ? prev.filter(p => p !== peso) : [...prev, peso]
    );
  };

  const LB_PER_KG = 2.20462;

  // All standard barbell weights
  const barrasEstandar = useMemo(() => {
    if (unidad === 'kg') {
      return [
        { id: 'kg-20', nombre: 'Olímpica Masculina', medida: 20, medidaMostrar: 20 },
        { id: 'kg-15', nombre: 'Olímpica Femenina', medida: 15, medidaMostrar: 15 },
        { id: 'kg-10', nombre: 'Técnica / Junior', medida: 10, medidaMostrar: 10 },
        { id: 'kg-7', nombre: 'Junior ligera', medida: 7, medidaMostrar: 7 },
        { id: 'kg-5', nombre: 'Entrenamiento', medida: 5, medidaMostrar: 5 },
      ];
    }
    return [
      { id: 'lb-45', nombre: 'Olímpica Estándar', medida: 45, medidaMostrar: 45 },
      { id: 'lb-35', nombre: 'Olímpica Femenina', medida: 35, medidaMostrar: 35 },
      { id: 'lb-25', nombre: 'Técnica / Junior', medida: 25, medidaMostrar: 25 },
      { id: 'lb-22', nombre: 'Training Bar', medida: 22, medidaMostrar: 22 },
      { id: 'lb-15', nombre: 'Ligera', medida: 15, medidaMostrar: 15 },
    ];
  }, [unidad]);

  const config = useMemo(() => {
    if (unidad === 'kg') {
      return {
        etiqueta: 'kg',
        discos: [0.5, 1, 1.5, 2.5, 5, 10, 15, 20, 25],
        pasoTotal: 1,
        maxDiscosPorLado: 9,
        maxPesoPorLado: 145
      };
    }
    return {
      etiqueta: 'lbs',
      discos: [2.5, 5, 10, 15, 25, 35, 45, 55],
      pasoTotal: 5,
      maxDiscosPorLado: 9,
      maxPesoPorLado: 320
    };
  }, [unidad]);

  // Unlimited discs — always 99 per side
  const disponiblesPorPeso = useMemo(() => {
    const mapa = {};
    for (const peso of config.discos) {
      mapa[peso] = 99;
    }
    return mapa;
  }, [config.discos]);

  const disponiblesPorLado = useMemo(() => disponiblesPorPeso, [disponiblesPorPeso]);

  const colorDisco = (peso) => {
    const mapLb = {
      2.5:  { fondo: '#8f9aa7', texto: '#ffffff', w: 62,  h: 62  },
      5:    { fondo: '#f1f3f5', texto: '#111111', w: 72,  h: 72  },
      10:   { fondo: '#43aa8b', texto: '#ffffff', w: 84,  h: 84  },
      15:   { fondo: '#2a9d8f', texto: '#ffffff', w: 94,  h: 94  },
      25:   { fondo: '#f4c430', texto: '#111111', w: 106, h: 106 },
      35:   { fondo: '#1d6df2', texto: '#ffffff', w: 114, h: 114 },
      45:   { fondo: '#e63946', texto: '#ffffff', w: 124, h: 124 },
      55:   { fondo: '#c1121f', texto: '#ffffff', w: 128, h: 128 }
    };
    const mapKg = {
      0.5:  { fondo: '#d4d8db', texto: '#111111', w: 40,  h: 40  },
      1:    { fondo: '#a8b2d1', texto: '#111111', w: 46,  h: 46  },
      1.5:  { fondo: '#6c8ebf', texto: '#ffffff', w: 52,  h: 52  },
      2.5:  { fondo: '#8f9aa7', texto: '#ffffff', w: 62,  h: 62  },
      5:    { fondo: '#f1f3f5', texto: '#111111', w: 78,  h: 78  },
      10:   { fondo: '#2a9d8f', texto: '#ffffff', w: 94,  h: 94  },
      15:   { fondo: '#f4c430', texto: '#111111', w: 106, h: 106 },
      20:   { fondo: '#1d6df2', texto: '#ffffff', w: 114, h: 114 },
      25:   { fondo: '#e63946', texto: '#ffffff', w: 124, h: 124 }
    };
    const palette = unidad === 'kg' ? mapKg : mapLb;
    return palette[peso] || { fondo: '#6c757d', texto: '#ffffff', w: 56, h: 56 };
  };

  const pesoSeguroPorLado = useMemo(() => {
    if (!usarSeguros) return 0;
    const raw = Number(pesoSeguroInput) || 0;
    if (unidadSeguro === unidad) return raw;
    return unidad === 'kg'
      ? Math.round((raw / LB_PER_KG) * 10000) / 10000
      : Math.round(raw * LB_PER_KG * 10000) / 10000;
  }, [usarSeguros, pesoSeguroInput, unidadSeguro, unidad]);

  const pesoSegurosTotal = useMemo(() => pesoSeguroPorLado * 2, [pesoSeguroPorLado]);

  const formatearPeso = (valor) => {
    const redondeado = Math.round(valor * 100) / 100;
    return Number.isInteger(redondeado) ? `${redondeado}` : `${redondeado.toFixed(2)}`;
  };

  const discosOrdenados = useMemo(() => {
    return [...discosLado].sort((a, b) => b - a);
  }, [discosLado]);

  const usadosTotalesPorPeso = useMemo(() => {
    const mapa = {};
    for (const peso of config.discos) {
      mapa[peso] = discosOrdenados.filter(d => d === peso).length;
    }
    return mapa;
  }, [config.discos, discosOrdenados]);

  const pesoPorLado = useMemo(() => {
    return discosOrdenados.reduce((acc, x) => acc + x, 0);
  }, [discosOrdenados]);

  const pesoDiscosTotal = useMemo(() => {
    return pesoPorLado * 2;
  }, [pesoPorLado]);

  const pesoActualConBarra = useMemo(() => {
    return Number(tipoBarra) + pesoPorLado * 2 + pesoSegurosTotal;
  }, [tipoBarra, pesoPorLado, pesoSegurosTotal]);

  const restricciones = useMemo(() => {
    const items = [
      `Barra seleccionada: ${tipoBarra} ${config.etiqueta}`,
      `Máximo de discos por lado: ${config.maxDiscosPorLado}`,
      `Máximo peso por lado: ${config.maxPesoPorLado} ${config.etiqueta}`,
      'Orden automático: de mayor a menor (pesados al centro)',
      `El peso total debe avanzar en saltos de ${config.pasoTotal} ${config.etiqueta}`,
      'Discos ilimitados'
    ];
    if (discosBloqueados.length > 0) {
      items.push(`🔒 Bloqueados: ${discosBloqueados.map(p => `${p}${config.etiqueta}`).join(', ')}`);
    }
    return items;
  }, [tipoBarra, config, discosBloqueados]);

  const resumenDiscosLado = useMemo(() => {
    if (discosOrdenados.length === 0) return 'Sin discos por lado';
    const conteo = {};
    for (const d of discosOrdenados) {
      conteo[d] = (conteo[d] || 0) + 1;
    }
    return Object.entries(conteo)
      .sort((a, b) => Number(b[0]) - Number(a[0]))
      .map(([peso, cnt]) => `${cnt} x ${peso}${config.etiqueta}`)
      .join(' + ');
  }, [discosOrdenados, config.etiqueta]);

  const actualizarEstado = (nuevosDiscos, nuevoModo = modo) => {
    const ordenados = [...nuevosDiscos].sort((a, b) => b - a);
    const lado = ordenados.reduce((a, b) => a + b, 0);
    const totalDiscos = lado * 2;
    setDiscosLado(ordenados);
    setPesoTotalCalculado(totalDiscos);
    setModo(nuevoModo);
  };

  const obtenerComboMinimoPorLado = (lado) => {
    const objetivoUnidad = Math.round(lado * 4);
    const candidatos = config.discos
      .filter(peso => !discosBloqueados.includes(peso))
      .map((peso) => ({
        peso,
        unidad: Math.round(peso * 4),
        maximoPorLado: disponiblesPorLado[peso] ?? 0
      }));
    let mejor = null;
    function resolver(index, restanteUnidad, comboActual) {
      if (restanteUnidad === 0) {
        if (!mejor || comboActual.length < mejor.length) {
          mejor = [...comboActual].sort((a, b) => b - a);
        }
        return;
      }
      if (index >= candidatos.length) return;
      if (comboActual.length > config.maxDiscosPorLado) return;
      if (mejor && comboActual.length >= mejor.length) return;
      const actual = candidatos[index];
      const maxPorPeso = Math.min(
        actual.maximoPorLado,
        Math.floor(restanteUnidad / actual.unidad),
        config.maxDiscosPorLado - comboActual.length
      );
      for (let cantidad = maxPorPeso; cantidad >= 0; cantidad--) {
        const siguienteResto = restanteUnidad - (cantidad * actual.unidad);
        if (siguienteResto < 0) continue;
        const nuevoCombo = cantidad > 0
          ? [...comboActual, ...Array(cantidad).fill(actual.peso)]
          : comboActual;
        resolver(index + 1, siguienteResto, nuevoCombo);
      }
    }
    resolver(0, objetivoUnidad, []);
    return mejor;
  };

  const evaluarSugerencia = (comboActualOrdenado) => {
    if (!comboActualOrdenado.length) {
      setSugerencia({ visible: false, texto: '', combo: [] });
      return;
    }
    const ladoActual = comboActualOrdenado.reduce((a, b) => a + b, 0);
    const comboMinimo = obtenerComboMinimoPorLado(ladoActual);
    if (!comboMinimo) return;
    if (comboMinimo.length < comboActualOrdenado.length) {
      const resumen = comboMinimo.map(x => `${x}${config.etiqueta}`).join(' + ');
      setSugerencia({
        visible: true,
        texto: `¿Por qué no metes: ${resumen}?`,
        combo: comboMinimo
      });
    } else {
      setSugerencia({ visible: false, texto: '', combo: [] });
    }
  };

  const agregarDiscoManual = (pesoDisco) => {
    const propuesta = [...discosOrdenados, pesoDisco];
    const ladoPropuesto = propuesta.reduce((a, b) => a + b, 0);
    if (propuesta.length > config.maxDiscosPorLado) {
      window.alert(`Error: No puedes superar ${config.maxDiscosPorLado} discos por lado.`);
      return;
    }
    if (ladoPropuesto > config.maxPesoPorLado) {
      window.alert(`Error: No puedes superar ${config.maxPesoPorLado} ${config.etiqueta} por lado.`);
      return;
    }
    actualizarEstado(propuesta, 'manual');
    evaluarSugerencia([...propuesta].sort((a, b) => b - a));
  };

  const quitarUltimoDisco = () => {
    if (discosOrdenados.length === 0) return;
    const copia = [...discosOrdenados];
    copia.pop();
    actualizarEstado(copia, 'manual');
    evaluarSugerencia([...copia].sort((a, b) => b - a));
  };

  const limpiarDiscos = () => {
    actualizarEstado([], 'manual');
    setPesoTotalCalculado(0);
    setSugerencia({ visible: false, texto: '', combo: [] });
  };

  const calcularCombinacionEficiente = () => {
    if (modoSimulador === 'pro') {
      if (!usarSeguros) {
        window.alert('Error: En modo Pro debes incluir seguros (collars) antes de usar la calculadora.');
        return;
      }
    }
    let objetivo = Number(pesoObjetivo);
    if (!Number.isFinite(objetivo) || objetivo <= 0) {
      window.alert(`Error: Ingresa un peso objetivo válido en ${config.etiqueta}.`);
      return;
    }
    if (Math.abs((objetivo / config.pasoTotal) - Math.round(objetivo / config.pasoTotal)) > 0.0001) {
      window.alert(`Error: El peso objetivo debe ser múltiplo de ${config.pasoTotal} ${config.etiqueta}.`);
      return;
    }
    if (modoSimulador === 'pro') {
      objetivo = objetivo - tipoBarra - pesoSegurosTotal;
      if (objetivo <= 0) {
        window.alert(`Error: El peso objetivo debe ser mayor que barra (${tipoBarra} ${config.etiqueta}) + seguros (${formatearPeso(pesoSegurosTotal)} ${config.etiqueta}).`);
        return;
      }
    }
    const lado = objetivo / 2;
    if (Math.abs((lado * 100) - Math.round(lado * 100)) > 0.0001) {
      window.alert('Error: La carga por lado no quedó en un valor válido para los discos disponibles.');
      return;
    }
    if (lado > config.maxPesoPorLado) {
      window.alert(`Error: El peso por lado excede el máximo permitido (${config.maxPesoPorLado} ${config.etiqueta}).`);
      return;
    }
    const ordenados = obtenerComboMinimoPorLado(lado);
    if (!ordenados) {
      const alts = buscarAlternativas(objetivo);
      if (!alts.arriba && !alts.abajo) {
        window.alert('No se encontró una combinación válida para ese peso.');
      } else {
        setAlternativas({ visible: true, objetivoPedido: Number(pesoObjetivo), arriba: alts.arriba, abajo: alts.abajo });
      }
      return;
    }
    setAlternativas({ visible: false, objetivoPedido: 0, arriba: null, abajo: null });
    actualizarEstado(ordenados, 'automatico');
    setPesoTotalCalculado(Number(pesoObjetivo));
    setSugerencia({ visible: false, texto: '', combo: [] });
  };

  const cambiarUnidad = (nuevaUnidad) => {
    setUnidad(nuevaUnidad);
    setTipoBarra(nuevaUnidad === 'kg' ? 20 : 45);
    setPesoObjetivo('');
    setDiscosLado([]);
    setPesoTotalCalculado(0);
    setModo('manual');
    setSugerencia({ visible: false, texto: '', combo: [] });
    setAlternativas({ visible: false, objetivoPedido: 0, arriba: null, abajo: null });
    setDiscosBloqueados([]);
  };

  const aplicarSugerencia = () => {
    if (!sugerencia.combo.length) return;
    actualizarEstado(sugerencia.combo, 'manual-optimo');
    setSugerencia({ visible: false, texto: '', combo: [] });
  };

  const buscarAlternativas = (objetivoDiscos) => {
    const maxPasos = 50;
    let arriba = null;
    let abajo = null;
    for (let i = 1; i <= maxPasos; i++) {
      if (!arriba) {
        const pesoDiscos = objetivoDiscos + config.pasoTotal * i;
        const ladoCandidate = pesoDiscos / 2;
        if (ladoCandidate <= config.maxPesoPorLado) {
          const combo = obtenerComboMinimoPorLado(ladoCandidate);
          if (combo) arriba = { pesoDiscos, combo };
        }
      }
      if (!abajo) {
        const pesoDiscos = objetivoDiscos - config.pasoTotal * i;
        if (pesoDiscos > 0) {
          const ladoCandidate = pesoDiscos / 2;
          const combo = obtenerComboMinimoPorLado(ladoCandidate);
          if (combo) abajo = { pesoDiscos, combo };
        }
      }
      if (arriba && abajo) break;
    }
    return { arriba, abajo };
  };

  const aplicarAlternativa = (combo, pesoDiscosAlt) => {
    actualizarEstado(combo, 'automatico');
    const nuevoPeso = modoSimulador === 'pro'
      ? pesoDiscosAlt + tipoBarra + pesoSegurosTotal
      : pesoDiscosAlt;
    setPesoObjetivo(String(nuevoPeso));
    setPesoTotalCalculado(nuevoPeso);
    setAlternativas({ visible: false, objetivoPedido: 0, arriba: null, abajo: null });
    setSugerencia({ visible: false, texto: '', combo: [] });
  };

  const formatComboLado = (combo) => {
    const conteo = {};
    for (const d of combo) conteo[d] = (conteo[d] || 0) + 1;
    return Object.entries(conteo)
      .sort((a, b) => Number(b[0]) - Number(a[0]))
      .map(([peso, cnt]) => `${cnt}×${peso}`)
      .join(' + ');
  };

  const renderBarraUnilateral = () => {
    const discos = [...discosOrdenados].sort((a, b) => a - b);
    const alturaArea = 320;
    const plateSpecs = discos.map((peso, idx) => {
      const paleta = colorDisco(peso);
      return {
        key: `plate-${idx}-${peso}`,
        peso,
        index: idx,
        color: paleta.fondo,
        textColor: paleta.texto,
        width: Math.max(26, Math.round(paleta.w * 0.42)),
        height: Math.max(48, Math.round(paleta.h * 1.25)),
        fontSize: Math.max(10, Math.round(paleta.h * 0.18))
      };
    });
    const quitarDiscoPorPeso = (peso) => {
      const nuevosDiscos = [...discosOrdenados];
      const idx = nuevosDiscos.indexOf(peso);
      if (idx !== -1) nuevosDiscos.splice(idx, 1);
      actualizarEstado(nuevosDiscos, 'manual');
      evaluarSugerencia([...nuevosDiscos].sort((a, b) => b - a));
    };

    const discosAncho = plateSpecs.reduce((acc, p) => acc + p.width + 2, 0);
    const vizMinWidth = Math.max(380, discosAncho + 200);

    return (
      <div className="rounded-4 p-3 p-md-4" style={{ background: 'var(--bg-elevated)', minHeight: `${alturaArea}px`, border: '1px solid var(--border)' }}>
        <div className="small fw-semibold mb-3" style={{ color: 'var(--text-muted)' }}>Coloca los discos en su lugar</div>
        <div style={{ overflowX: 'auto', overflowY: 'hidden', borderRadius: '14px' }}>
        <div style={{ position: 'relative', height: '240px', borderRadius: '14px', background: 'var(--bg-base)', minWidth: `${vizMinWidth}px` }}>
          <div
            style={{
              position: 'absolute', left: '6%', top: '12px', width: '96px', height: '30px',
              borderRadius: '12px', background: 'rgba(255,255,255,0.13)', color: '#e1e7ed',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, letterSpacing: '0.2px', fontSize: '12px'
            }}
          >
            {formatearPeso(pesoActualConBarra)} {config.etiqueta}
          </div>
          <div style={{ position: 'absolute', right: '8%', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', zIndex: 20 }}>
            <div style={{ width: '12px', height: '64px', borderRadius: '4px', background: 'linear-gradient(180deg, #d6dde5 0%, #a9b3be 100%)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.28)' }}></div>
            <div className="d-flex align-items-center" style={{ gap: '2px', marginLeft: '2px' }}>
              {plateSpecs.length === 0 && (
                <div style={{ width: '12px', height: '94px', borderRadius: '4px', background: 'rgba(255,255,255,0.1)', border: '1px dashed rgba(255,255,255,0.2)' }}></div>
              )}
              {plateSpecs.map((plate) => (
                <div
                  key={plate.key}
                  className="d-flex align-items-center justify-content-center sb-plate-clickable"
                  style={{
                    width: `${plate.width}px`, height: `${plate.height}px`, borderRadius: '4px',
                    background: plate.color, color: plate.textColor, fontSize: `${plate.fontSize}px`,
                    fontWeight: 800, lineHeight: 1,
                    boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.14), 0 8px 14px rgba(0,0,0,0.28)',
                    textShadow: '0 1px 2px rgba(0,0,0,0.35)', cursor: 'pointer',
                    transition: 'transform 0.15s, filter 0.15s', userSelect: 'none',
                    position: 'relative'
                  }}
                  onClick={() => quitarDiscoPorPeso(plate.peso)}
                  title={`Clic para quitar ${plate.peso} ${config.etiqueta}`}
                  role="button"
                  tabIndex={0}
                  onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(1.25)'; e.currentTarget.style.transform = 'scaleX(0.88)'; }}
                  onMouseLeave={e => { e.currentTarget.style.filter = ''; e.currentTarget.style.transform = ''; }}
                  onKeyDown={(e) => e.key === 'Enter' && quitarDiscoPorPeso(plate.peso)}
                >
                  {plate.peso}
                </div>
              ))}
            </div>
            <div style={{ width: '6px' }}></div>
            <div style={{ width: '20px', height: '140px', borderRadius: '5px', background: 'linear-gradient(180deg, #5f6872 0%, #3c434b 100%)', position: 'relative', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.12), 0 8px 16px rgba(0,0,0,0.35)' }}></div>
          </div>
        </div>
        </div>{/* end overflow scroll wrapper */}
      </div>
    );
  };

  return (
    <div className="sb-page">

      {/* ── HEADER STICKY ── */}
      <header className="sb-nav">
        {esAtleta && <BackButton to="/user-panel" />}
        <div className="sb-nav-icon d-none d-sm-flex">
          <i className="fas fa-dumbbell" />
        </div>
        <div>
          <h1 className="sb-title mb-0">Simulador de <span>Barra</span></h1>
          <p className="sb-nav-sub mb-0">Arma tu carga perfecta</p>
        </div>
      </header>

      <div className="container-fluid px-3 px-md-4 px-lg-5" style={{ maxWidth: '1440px', margin: '0 auto' }}>

        {/* CONTROLS */}
        <div className="sb-controls mb-4">
          <div className="sb-seg">
            <button type="button" className={`sb-seg-btn ${modoSimulador === 'casual' ? 'active' : ''}`} onClick={() => setModoSimulador('casual')}>
              <i className="fas fa-dumbbell"></i><span className="sb-btn-label"> Casual</span>
            </button>
            <button type="button" className={`sb-seg-btn ${modoSimulador === 'pro' ? 'active-gold' : ''}`} onClick={() => setModoSimulador('pro')}>
              <i className="fas fa-crown"></i><span className="sb-btn-label"> Pro</span>
            </button>
          </div>
          <div className="sb-seg">
            <button type="button" className={`sb-seg-btn ${unidad === 'lb' ? 'active' : ''}`} onClick={() => cambiarUnidad('lb')}>Libras</button>
            <button type="button" className={`sb-seg-btn ${unidad === 'kg' ? 'active' : ''}`} onClick={() => cambiarUnidad('kg')}>Kilos</button>
          </div>
        </div>

        {/* SUGGESTION MODAL */}
        {sugerencia.visible && (
          <div className="sb-overlay">
            <div className="sb-modal text-center">
              <div className="sb-modal-badge"><i className="fas fa-lightbulb me-1"></i>Optimización sugerida</div>
              <h2 className="sb-modal-title">Sugerencia inteligente</h2>
              <p className="sb-modal-text">{sugerencia.texto}</p>
              <div className="sb-modal-discs">
                {sugerencia.combo.map((peso, index) => {
                  const estilo = colorDisco(peso);
                  return (
                    <div key={`modal-disco-${peso}-${index}`} className="d-flex align-items-center justify-content-center"
                      style={{ width: `${Math.max(70, Math.round(estilo.w * 0.54))}px`, height: `${Math.max(70, Math.round(estilo.h * 0.54))}px`, borderRadius: '50%', backgroundColor: estilo.fondo, color: estilo.texto, fontWeight: 700, fontSize: '1rem', fontFamily: 'var(--font-stats)', boxShadow: '0 8px 20px rgba(0,0,0,0.3)', border: '2px solid rgba(255,255,255,0.15)' }}>
                      {peso}
                    </div>
                  );
                })}
              </div>
              <div className="sb-modal-actions">
                <button type="button" className="sb-btn-accept" onClick={aplicarSugerencia}><i className="fas fa-check me-1"></i>Aplicar</button>
                <button type="button" className="sb-btn-dismiss" onClick={() => setSugerencia({ visible: false, texto: '', combo: [] })}>Ignorar</button>
              </div>
            </div>
          </div>
        )}

        {/* MAIN GRID */}
        <div className="row g-4">

          {/* LEFT */}
          <div className="col-12 col-xl-8 order-1 order-xl-1">

            {/* BARBELL CARD */}
            <div className="sb-card mb-4">
              <div className="sb-card-header">
                <span className="sb-card-title"><i className="fas fa-barbell"></i> Vista de carga</span>
                <span className={`sb-mode-badge ${modoSimulador === 'pro' ? 'pro' : ''}`}>
                  {modoSimulador === 'pro' ? <><i className="fas fa-crown"></i> Pro</> : <><i className="fas fa-dumbbell"></i> Casual</>}
                </span>
              </div>
              <div className="sb-card-body">
                <div className="sb-stats-row">
                  <div className="sb-stat-pill">
                    <span className="sb-stat-pill-label">Total en barra</span>
                    <span className="sb-stat-pill-value highlight">{formatearPeso(pesoActualConBarra)} <small style={{ fontSize: '0.7em', opacity: 0.7 }}>{config.etiqueta}</small></span>
                  </div>
                  <div className="sb-stat-pill">
                    <span className="sb-stat-pill-label">Por lado</span>
                    <span className="sb-stat-pill-value">{formatearPeso(pesoPorLado)} <small style={{ fontSize: '0.7em', opacity: 0.7 }}>{config.etiqueta}</small></span>
                  </div>
                  <div className="sb-stat-pill">
                    <span className="sb-stat-pill-label">Solo en discos</span>
                    <span className="sb-stat-pill-value">{formatearPeso(pesoDiscosTotal)} <small style={{ fontSize: '0.7em', opacity: 0.7 }}>{config.etiqueta}</small></span>
                  </div>
                </div>
                <div className="sb-viz-wrapper">{renderBarraUnilateral()}</div>
              </div>
            </div>

            {/* SETTINGS CARD */}
            <div className="sb-card mb-4">
              <div className="sb-card-header">
                <span className="sb-card-title"><i className="fas fa-sliders-h"></i> Configuración</span>
              </div>
              <div className="sb-card-body">
                <div className="row g-3">
                  <div className="col-12 col-md-6">
                    <div className="sb-field">
                      <label className="sb-label"><i className="fas fa-minus me-1"></i>Tipo de barra</label>
                      <TipoBarraPicker
                        barras={barrasEstandar}
                        valor={tipoBarra}
                        etiqueta={config.etiqueta}
                        onCambiar={(medida) => { setTipoBarra(medida); setPesoTotalCalculado(pesoPorLado * 2); }}
                      />
                    </div>
                  </div>
                  <div className="col-12 col-md-6">
                    <div className="sb-label mb-2"><i className="fas fa-ring me-1"></i>Seguros (collars)</div>
                    <div className="sb-switch-row" onClick={() => setUsarSeguros(v => !v)} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setUsarSeguros(v => !v)}>
                      <span className="sb-switch-label">
                        <i className={`fas ${usarSeguros ? 'fa-check-circle' : 'fa-circle'}`} style={{ color: usarSeguros ? 'var(--success)' : 'var(--text-muted)' }}></i>
                        {usarSeguros ? 'Incluidos' : 'No incluidos'}
                      </span>
                      <div className="form-check form-switch mb-0">
                        <input className="form-check-input" type="checkbox" role="switch" checked={usarSeguros} onChange={(e) => setUsarSeguros(e.target.checked)} onClick={(e) => e.stopPropagation()} />
                      </div>
                    </div>
                    {usarSeguros && (
                      <div className="sb-collar-box">
                        <label className="sb-label mb-2">Peso por seguro</label>
                        <div className="sb-collar-grid">
                          <input type="number" className="sb-input" value={pesoSeguroInput} min="0" step="0.01" onChange={(e) => setPesoSeguroInput(e.target.value)} />
                          <div className="sb-collar-units">
                            <button type="button" className={`sb-unit-btn ${unidadSeguro === 'kg' ? 'active' : ''}`} onClick={() => setUnidadSeguro('kg')}>kg</button>
                            <button type="button" className={`sb-unit-btn ${unidadSeguro === 'lb' ? 'active' : ''}`} onClick={() => setUnidadSeguro('lb')}>lb</button>
                          </div>
                        </div>
                        <p className="sb-collar-hint">
                          2 seguros = {formatearPeso(pesoSegurosTotal)} {config.etiqueta}
                          {unidadSeguro !== unidad && ` (de ${formatearPeso(Number(pesoSeguroInput) || 0)} ${unidadSeguro} c/u)`}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* DISC SELECTOR */}
            <div className="sb-card">
              <div className="sb-card-header">
                <span className="sb-card-title"><i className="fas fa-circle"></i> Selector de discos</span>
                <span className="sb-discs-hint">Ilimitados</span>
              </div>
              <div className="sb-card-body">
                {esAtleta && discosBloqueados.length > 0 && (
                  <div className="sb-bloqueo-hint">
                    <i className="fas fa-lock" /> Los discos bloqueados no se usan en la calculadora ni en sugerencias
                  </div>
                )}
                <div className="sb-discs-grid mb-4">
                  {config.discos.map((peso) => {
                    const estilo = colorDisco(peso);
                    const size = Math.max(52, Math.round(estilo.w * 0.44));
                    const bloqueado = discosBloqueados.includes(peso);
                    return (
                      <div key={`agregar-${peso}`} className="d-flex flex-column align-items-center gap-1">
                        <div style={{ position: 'relative' }}>
                          <button type="button" className="sb-disc-btn"
                            style={{
                              width: `${size}px`, height: `${size}px`,
                              backgroundColor: estilo.fondo, color: estilo.texto,
                              filter: bloqueado ? 'grayscale(1) brightness(0.38)' : 'none',
                            }}
                            onClick={() => agregarDiscoManual(peso)}
                            disabled={bloqueado}
                            title={bloqueado ? `${peso} ${config.etiqueta} — bloqueado` : `${peso} ${config.etiqueta}`}>
                            <span className="sb-disc-num">{peso}</span>
                          </button>
                          {bloqueado && (
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 2 }}>
                              <i className="fas fa-lock" style={{ color: '#e63946', fontSize: '1rem', filter: 'drop-shadow(0 0 5px rgba(230,57,70,0.8))' }} />
                            </div>
                          )}
                        </div>
                        {esAtleta ? (
                          <button
                            type="button"
                            className={`sb-lock-btn${bloqueado ? ' sb-lock-btn--on' : ''}`}
                            onClick={() => toggleBloqueo(peso)}
                            title={bloqueado ? 'Desbloquear disco' : 'Bloquear de calculadora'}
                          >
                            <i className={`fas fa-${bloqueado ? 'lock' : 'lock-open'}`} />
                          </button>
                        ) : (
                          <span className="sb-disc-avail" style={{ color: 'var(--success)' }}>∞</span>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="sb-summary-strip">
                  <div className="sb-summary-row">
                    <span className="sb-summary-label">Discos por lado</span>
                    <span className="sb-summary-value">{resumenDiscosLado}</span>
                  </div>
                  <hr className="sb-summary-divider" />
                  <div className="sb-summary-row">
                    <span className="sb-summary-label">Total en barra</span>
                    <span className="sb-summary-value accent">{formatearPeso(pesoActualConBarra)} {config.etiqueta}</span>
                  </div>
                </div>
                <div className="sb-actions">
                  <button type="button" className="sb-btn-danger" onClick={quitarUltimoDisco}><i className="fas fa-minus-circle"></i><span className="sb-btn-label">Quitar</span></button>
                  <button type="button" className="sb-btn-ghost" onClick={limpiarDiscos}><i className="fas fa-trash-alt"></i><span className="sb-btn-label">Limpiar</span></button>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT */}
          <div className="col-12 col-xl-4 order-2 order-xl-2">
            <div className="sb-big-weight mb-4">
              <div className="sb-big-weight-main">
                {formatearPeso(pesoActualConBarra)}
                <span className="sb-big-weight-unit">{config.etiqueta}</span>
              </div>
              <p className="sb-big-weight-sub mb-0">
                Barra {formatearPeso(tipoBarra)} + discos {formatearPeso(pesoDiscosTotal)}
                {usarSeguros && ` + seguros ${formatearPeso(pesoSegurosTotal)}`} {config.etiqueta}
              </p>
            </div>

            {/* CALCULATOR */}
            <div className="sb-card mb-4">
              <div className="sb-card-header">
                <span className="sb-card-title"><i className="fas fa-calculator"></i> Calculadora</span>
              </div>
              <div className="sb-card-body">
                <div className="sb-field">
                  <label className="sb-label">Peso objetivo en discos ({config.etiqueta})</label>
                  <input type="number" className="sb-input" value={pesoObjetivo} min={config.pasoTotal} step={config.pasoTotal}
                    onChange={(e) => { setPesoObjetivo(e.target.value); if (alternativas.visible) setAlternativas({ visible: false, objetivoPedido: 0, arriba: null, abajo: null }); }} />
                </div>
                {modoSimulador === 'pro' && (
                  <p className="sb-collar-hint mb-3">
                    <i className="fas fa-info-circle me-1" style={{ color: 'var(--accent)' }}></i>
                    Modo Pro: se restará la barra ({formatearPeso(tipoBarra)}{config.etiqueta})
                    {usarSeguros && ` + seguros (${formatearPeso(pesoSegurosTotal)}${config.etiqueta})`} del objetivo.
                  </p>
                )}
                <button type="button" className="sb-btn-calc" onClick={calcularCombinacionEficiente}>
                  <i className="fas fa-bolt"></i><span className="sb-btn-label">Calcular combinación</span>
                </button>
                {alternativas.visible && (
                  <div className="sb-alt-panel">
                    <div className="sb-alt-header">
                      <i className="fas fa-exclamation-triangle"></i>
                      Sin combo exacto para <strong>{formatearPeso(alternativas.objetivoPedido)} {config.etiqueta}</strong>
                      <button type="button" className="sb-alt-close" onClick={() => setAlternativas({ visible: false, objetivoPedido: 0, arriba: null, abajo: null })} aria-label="Cerrar">×</button>
                    </div>
                    <p className="sb-alt-hint">Pesos más cercanos disponibles:</p>
                    <div className="sb-alt-options">
                      {alternativas.arriba && (
                        <button type="button" className="sb-alt-option above" onClick={() => aplicarAlternativa(alternativas.arriba.combo, alternativas.arriba.pesoDiscos)}>
                          <span className="sb-alt-dir"><i className="fas fa-arrow-up"></i> Más pesado</span>
                          <span className="sb-alt-peso">{formatearPeso(alternativas.arriba.pesoDiscos + tipoBarra + pesoSegurosTotal)}<span className="sb-alt-unit">{config.etiqueta}</span></span>
                          <span className="sb-alt-combo">{formatComboLado(alternativas.arriba.combo)} por lado</span>
                          <span className="sb-alt-cta">Usar este →</span>
                        </button>
                      )}
                      {alternativas.abajo && (
                        <button type="button" className="sb-alt-option below" onClick={() => aplicarAlternativa(alternativas.abajo.combo, alternativas.abajo.pesoDiscos)}>
                          <span className="sb-alt-dir"><i className="fas fa-arrow-down"></i> Más ligero</span>
                          <span className="sb-alt-peso">{formatearPeso(alternativas.abajo.pesoDiscos + tipoBarra + pesoSegurosTotal)}<span className="sb-alt-unit">{config.etiqueta}</span></span>
                          <span className="sb-alt-combo">{formatComboLado(alternativas.abajo.combo)} por lado</span>
                          <span className="sb-alt-cta">Usar este →</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* RESTRICTIONS */}
            <div className="sb-card">
              <div className="sb-card-header">
                <span className="sb-card-title">
                  <i className="fas fa-list-ul" style={{ color: 'var(--accent-cool)' }}></i>
                  <span style={{ color: 'var(--accent-cool)' }}>Restricciones activas</span>
                </span>
              </div>
              <div className="sb-card-body">
                <div className="sb-restrictions">
                  <div className="sb-restrictions-title"><i className="fas fa-shield-alt"></i>Límites</div>
                  <ul className="sb-restrictions-list">
                    {restricciones.map((item, i) => (
                      <li key={`rest-${i}`} className="sb-restrictions-item">{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
