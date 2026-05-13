import { useEffect, useMemo, useState } from 'react';
import BackButton from '../components/BackButton';
import TipoBarraPicker from '../components/TipoBarraPicker';
import { API_BASE_URL_CONST } from '../services/api';
import '../assets/css/SimuladorBarra.css';

export default function SimuladorBarra() {
  const [unidad, setUnidad] = useState('lb');
  const [tipoBarra, setTipoBarra] = useState(45);
  const [pesoObjetivo, setPesoObjetivo] = useState('');
  const [discosLado, setDiscosLado] = useState([]);
  const [pesoTotalCalculado, setPesoTotalCalculado] = useState(0);
  const [modo, setModo] = useState('manual');
  const [sugerencia, setSugerencia] = useState({ visible: false, texto: '', combo: [] });
  const [inventarioBumpers, setInventarioBumpers] = useState({ kg: {}, lb: {} });
  const [inventarioBarras, setInventarioBarras] = useState({ kg: [], lb: [] });
  const [usarSeguros, setUsarSeguros] = useState(false);
  const [pesoSeguroInput, setPesoSeguroInput] = useState('2.5');
  const [unidadSeguro, setUnidadSeguro] = useState('kg');
  const [cargandoInventario, setCargandoInventario] = useState(true);
  const [modoSimulador, setModoSimulador] = useState('casual');
  const [alternativas, setAlternativas] = useState({ visible: false, objetivoPedido: 0, arriba: null, abajo: null });

  const config = useMemo(() => {
    if (unidad === 'kg') {
      return {
        etiqueta: 'kg',
        opcionesBarra: [20, 15, 10, 7.5, 5],
        discos: [0.5, 1, 1.5, 2.5, 5, 10, 15, 20, 25],
        pasoTotal: 1,
        maxDiscosPorLado: 9,
        maxPesoPorLado: 145
      };
    }

    return {
      etiqueta: 'lbs',
      opcionesBarra: [45, 35, 25, 15, 10],
      discos: [2.5, 5, 10, 15, 25, 35, 45, 55],
      pasoTotal: 5,
      maxDiscosPorLado: 9,
      maxPesoPorLado: 320
    };
  }, [unidad]);

  useEffect(() => {
    let isActive = true;

    async function cargarInventarioBumpers() {
      try {
        setCargandoInventario(true);
        const boxGuardado = JSON.parse(localStorage.getItem('box'));
        const idBox = boxGuardado?.idBox ?? boxGuardado?.IdBox;

        if (!idBox) {
          if (isActive) {
            setInventarioBumpers({ kg: {}, lb: {} });
            window.alert('No se encontró box activo para cargar inventario de bumpers.');
          }
          return;
        }

        const res = await fetch(`${API_BASE_URL_CONST}/herramientas/box/${idBox}`);
        if (!res.ok) throw new Error('No se pudo cargar inventario de bumpers.');

        const data = await res.json();
        const kg = {};
        const lb = {};

        const barras = [];
        for (const item of Array.isArray(data) ? data : []) {
          const esBumpers = item.esBumpers ?? item.EsBumpers ?? false;
          const esBarra = item.esBarra ?? item.EsBarra ?? false;
          const medida = Number(item.medida ?? item.Medida ?? 0);
          const esKilo = item.esKilo ?? item.EsKilo ?? false;
          const esLibra = item.esLibra ?? item.EsLibra ?? false;

          if (esBumpers && medida > 0) {
            const cantidad = Number(item.cantidad ?? item.Cantidad ?? 0);
            if (cantidad > 0) {
              const key = String(medida);
              if (esKilo) kg[key] = (kg[key] ?? 0) + cantidad;
              if (esLibra) lb[key] = (lb[key] ?? 0) + cantidad;
            }
          }

          if (esBarra && medida > 0) {
            barras.push({
              id: item.idHerramienta ?? item.IdHerramienta,
              nombre: item.nombre ?? item.Nombre ?? '',
              medida, esKilo, esLibra
            });
          }
        }

        if (isActive) {
          setInventarioBumpers({ kg, lb });
          setInventarioBarras({
            kg: barras.filter(b => b.esKilo).sort((a, b) => b.medida - a.medida),
            lb: barras.filter(b => b.esLibra).sort((a, b) => b.medida - a.medida)
          });
        }
      } catch (err) {
        if (isActive) {
          setInventarioBumpers({ kg: {}, lb: {} });
          window.alert(err.message || 'Error cargando inventario de bumpers.');
        }
      } finally {
        if (isActive) setCargandoInventario(false);
      }
    }

    cargarInventarioBumpers();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (cargandoInventario) return;
    setTipoBarra(unidad === 'kg' ? 20 : 45);
  }, [cargandoInventario]); // eslint-disable-line react-hooks/exhaustive-deps

  const disponibilidadActual = useMemo(() => {
    return unidad === 'kg' ? inventarioBumpers.kg : inventarioBumpers.lb;
  }, [unidad, inventarioBumpers]);

  const disponiblesPorPeso = useMemo(() => {
    const mapa = {};
    for (const peso of config.discos) {
      // divide by 2 because bumpers go one on each side
      mapa[peso] = Math.floor(Number(disponibilidadActual[String(peso)] ?? 0) / 2);
    }
    return mapa;
  }, [config.discos, disponibilidadActual]);

  const LB_PER_KG = 2.20462;

  const barrasActuales = useMemo(() => {
    const nombres = unidad === 'kg'
      ? { 20: 'Olímpica Masculina', 15: 'Olímpica Femenina', 10: 'Técnica / Junior', 7.5: 'Junior ligera', 5: 'Entrenamiento' }
      : { 45: 'Olímpica Estándar', 35: 'Olímpica Femenina', 25: 'Técnica / Junior', 15: 'Ligera', 10: 'Training Bar' };
    return config.opcionesBarra.map(m => ({
      id: `${unidad}-${m}`,
      nombre: nombres[m] || `Barra ${m}`,
      medida: m,
      medidaMostrar: m
    }));
  }, [config.opcionesBarra, unidad]);

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
    // convert
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
      // count only one side; disponiblesPorPeso is already per-side
      mapa[peso] = discosOrdenados.filter(d => d === peso).length;
    }
    return mapa;
  }, [config.discos, discosOrdenados]);

  // disponiblesPorPeso is already per-side, reuse it for backtracking
  const disponiblesPorLado = useMemo(() => disponiblesPorPeso, [disponiblesPorPeso]);

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
    return [
      `Barra seleccionada: ${tipoBarra} ${config.etiqueta}`,
      `Máximo de discos por lado: ${config.maxDiscosPorLado}`,
      `Máximo peso por lado: ${config.maxPesoPorLado} ${config.etiqueta}`,
      'Orden automático: de mayor a menor (pesados al centro)',
      `El peso total debe avanzar en saltos de ${config.pasoTotal} ${config.etiqueta}`,
      'No se pueden usar más bumpers que el inventario disponible del box'
    ];
  }, [tipoBarra, config]);

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
    const candidatos = config.discos.map((peso) => ({
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

    const disponibles = disponiblesPorPeso[pesoDisco] ?? 0; // per side
    const usadosActuales = usadosTotalesPorPeso[pesoDisco] ?? 0; // per side

    if (disponibles <= 0) {
      window.alert(`Error: No hay bumpers de ${pesoDisco}${config.etiqueta} en el box.`);
      return;
    }

    if (usadosActuales >= disponibles) {
      window.alert(`Error: No puedes usar más de ${disponibles} bumper(s) de ${pesoDisco}${config.etiqueta} por lado.`);
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
    window.alert('Barra limpiada.');
    actualizarEstado([], 'manual');
    setPesoTotalCalculado(0);
    setSugerencia({ visible: false, texto: '', combo: [] });
  };

  const calcularCombinacionEficiente = () => {
    let objetivo = Number(pesoObjetivo);

    if (!Number.isFinite(objetivo) || objetivo <= 0) {
      window.alert(`Error: Ingresa un peso objetivo válido en ${config.etiqueta}.`);
      return;
    }

    // Validar que el objetivo sea múltiplo del pasoTotal ANTES de restar
    if (Math.abs((objetivo / config.pasoTotal) - Math.round(objetivo / config.pasoTotal)) > 0.0001) {
      window.alert(`Error: El peso objetivo debe ser múltiplo de ${config.pasoTotal} ${config.etiqueta}.`);
      return;
    }

    // En modo Pro, restar barra y seguros del objetivo
    if (modoSimulador === 'pro') {
      objetivo = objetivo - tipoBarra - pesoSegurosTotal;

      if (objetivo <= 0) {
        window.alert(`Error: El peso objetivo debe ser mayor que la barra (${tipoBarra} ${config.etiqueta})${usarSeguros ? ` + seguros (${formatearPeso(pesoSegurosTotal)} ${config.etiqueta})` : ''}.`);
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
        // Último recurso: buscar el peso máximo posible con el inventario
        const maxCombo = buscarMaximoPosible();
        if (maxCombo) {
          setAlternativas({ visible: true, objetivoPedido: Number(pesoObjetivo), arriba: null, abajo: maxCombo });
        } else {
          window.alert('No hay bumpers disponibles en el inventario del box.');
        }
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
    window.alert(`Unidad cambiada a ${nuevaUnidad === 'kg' ? 'kilogramos' : 'libras'}.`);
  };

  const aplicarSugerencia = () => {
    if (!sugerencia.combo.length) return;
    actualizarEstado(sugerencia.combo, 'manual-optimo');
    window.alert('Se aplicó la recomendación de combinación más eficiente.');
    setSugerencia({ visible: false, texto: '', combo: [] });
  };

  const buscarMaximoPosible = () => {
    const discosDesc = [...config.discos].sort((a, b) => b - a);
    const combo = [];
    let pesoLado = 0;
    for (const peso of discosDesc) {
      const maxDisp = disponiblesPorLado[peso] ?? 0;
      for (let i = 0; i < maxDisp && combo.length < config.maxDiscosPorLado && pesoLado + peso <= config.maxPesoPorLado; i++) {
        combo.push(peso);
        pesoLado += peso;
      }
    }
    if (combo.length === 0) return null;
    return { pesoDiscos: pesoLado * 2, combo: combo.sort((a, b) => b - a) };
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

    const quitarDiscoPorIndice = (idx) => {
      const nuevosDiscos = [...discosOrdenados];
      nuevosDiscos.splice(idx, 1);
      actualizarEstado(nuevosDiscos, 'manual');
      evaluarSugerencia([...nuevosDiscos].sort((a, b) => b - a));
    };

    return (
      <div className="rounded-4 p-3 p-md-4" style={{ background: 'var(--bg-card)', minHeight: `${alturaArea}px`, border: '1px solid var(--border)' }}>
        <div className="small fw-semibold mb-3" style={{ color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Coloca los discos en su lugar</div>
        <div style={{ position: 'relative', height: '240px', overflow: 'hidden', borderRadius: '12px', background: 'var(--bg-input)' }}>
          <div
            style={{
              position: 'absolute',
              left: '6%',
              top: '12px',
              width: '96px',
              height: '30px',
              borderRadius: '12px',
              background: 'rgba(255,255,255,0.13)',
              color: '#e1e7ed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              letterSpacing: '0.2px',
              fontSize: '12px'
            }}
          >
            {formatearPeso(pesoActualConBarra)} {config.etiqueta}
          </div>

          <div
            style={{
              position: 'absolute',
              right: '8%',
              top: '50%',
              transform: 'translateY(-50%)',
              display: 'flex',
              alignItems: 'center',
              zIndex: 20
            }}
          >
            <div
              style={{
                width: '12px',
                height: '64px',
                borderRadius: '4px',
                background: 'linear-gradient(180deg, #d6dde5 0%, #a9b3be 100%)',
                boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.28)'
              }}
            ></div>

            <div className="d-flex align-items-center" style={{ gap: '2px', marginLeft: '2px' }}>
              {plateSpecs.length === 0 && (
                <div
                  style={{
                    width: '12px',
                    height: '94px',
                    borderRadius: '4px',
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px dashed rgba(255,255,255,0.2)'
                  }}
                ></div>
              )}

              {plateSpecs.map((plate) => (
                <div key={plate.key}>
                  <div
                    className="d-flex align-items-center justify-content-center"
                    style={{
                      width: `${plate.width}px`,
                      height: `${plate.height}px`,
                      borderRadius: '4px',
                      background: plate.color,
                      color: plate.textColor,
                      fontSize: `${plate.fontSize}px`,
                      fontWeight: 800,
                      lineHeight: 1,
                      boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.14), 0 8px 14px rgba(0,0,0,0.28)',
                      textShadow: '0 1px 2px rgba(0,0,0,0.35)',
                      cursor: 'pointer',
                      transition: 'transform 0.15s',
                      userSelect: 'none'
                    }}
                    onClick={() => quitarDiscoPorIndice(plate.index)}
                    title="Click para quitar disco"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && quitarDiscoPorIndice(plate.index)}
                  >
                    {plate.peso}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ width: '6px' }}></div>

            <div
              style={{
                width: '20px',
                height: '140px',
                borderRadius: '5px',
                background: 'linear-gradient(180deg, #5f6872 0%, #3c434b 100%)',
                position: 'relative',
                boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.12), 0 8px 16px rgba(0,0,0,0.35)'
              }}
            >
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="sb-page">

      {/* ── HEADER ── */}
      <header className="sb-nav">
        <BackButton to="/user-panel" />
        <div className="sb-nav-icon d-none d-sm-flex">
          <i className="fas fa-dumbbell"></i>
        </div>
        <div>
          <h1 className="sb-title mb-0">Simulador de <span>Barra</span></h1>
          <p className="sb-subtitle mb-0">Construye tu carga — un disco a la vez</p>
        </div>
      </header>

      <div className="container-fluid px-3 px-md-4" style={{ maxWidth: '1280px', margin: '0 auto' }}>

        {/* ── CONTROLS ── */}
        <div className="sb-controls mb-4">
          {/* Mode */}
          <div className="sb-seg">
            <button
              type="button"
              className={`sb-seg-btn ${modoSimulador === 'casual' ? 'active' : ''}`}
              onClick={() => setModoSimulador('casual')}
            >
              <i className="fas fa-dumbbell"></i>
              Casual
            </button>
            <button
              type="button"
              className={`sb-seg-btn ${modoSimulador === 'pro' ? 'active-gold' : ''}`}
              onClick={() => setModoSimulador('pro')}
            >
              <i className="fas fa-crown"></i>
              Pro
            </button>
          </div>

          {/* Unit */}
          <div className="sb-seg">
            <button
              type="button"
              className={`sb-seg-btn ${unidad === 'lb' ? 'active' : ''}`}
              onClick={() => cambiarUnidad('lb')}
            >
              Libras
            </button>
            <button
              type="button"
              className={`sb-seg-btn ${unidad === 'kg' ? 'active' : ''}`}
              onClick={() => cambiarUnidad('kg')}
            >
              Kilos
            </button>
          </div>
        </div>

        {/* ── SUGGESTION MODAL ── */}
        {sugerencia.visible && (
          <div className="sb-overlay">
            <div className="sb-modal text-center">
              <div className="sb-modal-badge">
                <i className="fas fa-lightbulb me-1"></i>
                Optimización sugerida
              </div>
              <h2 className="sb-modal-title">Sugerencia inteligente</h2>
              <p className="sb-modal-text">{sugerencia.texto}</p>

              <div className="sb-modal-discs">
                {sugerencia.combo.map((peso, index) => {
                  const estilo = colorDisco(peso);
                  return (
                    <div
                      key={`modal-disco-${peso}-${index}`}
                      className="d-flex align-items-center justify-content-center"
                      style={{
                        width: `${Math.max(70, Math.round(estilo.w * 0.54))}px`,
                        height: `${Math.max(70, Math.round(estilo.h * 0.54))}px`,
                        borderRadius: '50%',
                        backgroundColor: estilo.fondo,
                        color: estilo.texto,
                        fontWeight: 700,
                        fontSize: '1rem',
                        fontFamily: 'var(--font-stats)',
                        boxShadow: '0 8px 20px rgba(0,0,0,0.3)',
                        border: '2px solid rgba(255,255,255,0.15)'
                      }}
                    >
                      {peso}
                    </div>
                  );
                })}
              </div>

              <div className="sb-modal-actions">
                <button type="button" className="sb-btn-accept" onClick={aplicarSugerencia}>
                  <i className="fas fa-check me-1"></i>Aplicar
                </button>
                <button type="button" className="sb-btn-dismiss" onClick={() => setSugerencia({ visible: false, texto: '', combo: [] })}>
                  Ignorar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── MAIN GRID ── */}
        <div className="row g-4">

          {/* ── LEFT: Visualization + Disc Selector ── */}
          <div className="col-12 col-xl-8 order-1 order-xl-1">

            {/* BARBELL CARD */}
            <div className="sb-card mb-4">
              <div className="sb-card-header">
                <span className="sb-card-title">
                  <i className="fas fa-barbell"></i>
                  Vista de carga
                </span>
                <div className="d-flex align-items-center gap-2">
                  <span className={`sb-mode-badge ${modoSimulador === 'pro' ? 'pro' : ''}`}>
                    {modoSimulador === 'pro' ? <><i className="fas fa-crown"></i> Pro</> : <><i className="fas fa-dumbbell"></i> Casual</>}
                  </span>
                  {cargandoInventario && (
                    <span className="sb-loading-badge">
                      <i className="fas fa-circle-notch fa-spin"></i>
                      Cargando
                    </span>
                  )}
                </div>
              </div>

              <div className="sb-card-body">
                {/* Weight pills row */}
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

                {/* BARBELL VISUALIZATION — preserved exactly */}
                <div className="sb-viz-wrapper">
                  {renderBarraUnilateral()}
                </div>
              </div>
            </div>

            {/* SETTINGS CARD (barbell type + collar) */}
            <div className="sb-card mb-4">
              <div className="sb-card-header">
                <span className="sb-card-title">
                  <i className="fas fa-sliders-h"></i>
                  Configuración
                </span>
              </div>
              <div className="sb-card-body">
                <div className="row g-3">
                  <div className="col-12 col-md-6">
                    <div className="sb-field">
                      <label className="sb-label">
                        <i className="fas fa-minus me-1"></i>Tipo de barra
                      </label>
                      <TipoBarraPicker
                        barras={barrasActuales}
                        valor={tipoBarra}
                        etiqueta={config.etiqueta}
                        onCambiar={(medida) => {
                          setTipoBarra(medida);
                          setPesoTotalCalculado(pesoPorLado * 2);
                        }}
                      />
                    </div>
                  </div>

                  <div className="col-12 col-md-6">
                    <div className="sb-label mb-2">
                      <i className="fas fa-ring me-1"></i>Seguros (collars)
                    </div>
                    <div
                      className="sb-switch-row"
                      onClick={() => setUsarSeguros(v => !v)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && setUsarSeguros(v => !v)}
                    >
                      <span className="sb-switch-label">
                        <i className={`fas ${usarSeguros ? 'fa-check-circle' : 'fa-circle'}`} style={{ color: usarSeguros ? 'var(--success)' : 'var(--text-muted)' }}></i>
                        {usarSeguros ? 'Incluidos' : 'No incluidos'}
                      </span>
                      <div className="form-check form-switch mb-0">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          role="switch"
                          id="switchSeguros"
                          checked={usarSeguros}
                          onChange={(e) => setUsarSeguros(e.target.checked)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </div>

                    {usarSeguros && (
                      <div className="sb-collar-box">
                        <label className="sb-label mb-2">Peso por seguro</label>
                        <div className="sb-collar-grid">
                          <input
                            type="number"
                            className="sb-input"
                            value={pesoSeguroInput}
                            min="0"
                            step="0.01"
                            onChange={(e) => setPesoSeguroInput(e.target.value)}
                          />
                          <div className="sb-collar-units">
                            <button
                              type="button"
                              className={`sb-unit-btn ${unidadSeguro === 'kg' ? 'active' : ''}`}
                              onClick={() => setUnidadSeguro('kg')}
                            >kg</button>
                            <button
                              type="button"
                              className={`sb-unit-btn ${unidadSeguro === 'lb' ? 'active' : ''}`}
                              onClick={() => setUnidadSeguro('lb')}
                            >lb</button>
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

            {/* DISC SELECTOR CARD */}
            <div className="sb-card">
              <div className="sb-card-header">
                <span className="sb-card-title">
                  <i className="fas fa-circle"></i>
                  Selector de discos
                </span>
                <span className="sb-discs-hint">
                  {cargandoInventario ? 'Cargando...' : 'Restantes / Total por peso'}
                </span>
              </div>
              <div className="sb-card-body">
                <div className="sb-discs-grid mb-4">
                  {config.discos.map((peso) => {
                    const estilo = colorDisco(peso);
                    const totalDisponible = disponiblesPorPeso[peso] ?? 0;
                    const totalUsado = usadosTotalesPorPeso[peso] ?? 0;
                    const restante = Math.max(totalDisponible - totalUsado, 0);
                    const sinStock = restante < 1;
                    const size = Math.max(52, Math.round(estilo.w * 0.44));

                    return (
                      <div key={`agregar-${peso}`} className="d-flex flex-column align-items-center gap-1">
                        <button
                          type="button"
                          className="sb-disc-btn"
                          style={{
                            width: `${size}px`,
                            height: `${size}px`,
                            backgroundColor: estilo.fondo,
                            color: estilo.texto,
                            opacity: sinStock ? 0.35 : 1
                          }}
                          onClick={() => agregarDiscoManual(peso)}
                          title={`${peso} ${config.etiqueta} — ${restante} disponibles`}
                          disabled={sinStock}
                        >
                          <span className="sb-disc-num">{peso}</span>
                        </button>
                        <span className="sb-disc-avail">{restante}/{totalDisponible}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Summary strip */}
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

                {/* Actions */}
                <div className="sb-actions">
                  <button type="button" className="sb-btn-danger" onClick={quitarUltimoDisco}>
                    <i className="fas fa-minus-circle"></i>Quitar
                  </button>
                  <button type="button" className="sb-btn-ghost" onClick={limpiarDiscos}>
                    <i className="fas fa-trash-alt"></i>Limpiar
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ── RIGHT: Calculator + Weight + Restrictions ── */}
          <div className="col-12 col-xl-4 order-2 order-xl-2">

            {/* BIG WEIGHT */}
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
                <span className="sb-card-title">
                  <i className="fas fa-calculator"></i>
                  Calculadora
                </span>
              </div>
              <div className="sb-card-body">
                <div className="sb-field">
                  <label className="sb-label">
                    Peso objetivo en discos ({config.etiqueta})
                  </label>
                  <input
                    type="number"
                    className="sb-input"
                    value={pesoObjetivo}
                    min={config.pasoTotal}
                    step={config.pasoTotal}
                    onChange={(e) => {
                      setPesoObjetivo(e.target.value);
                      if (alternativas.visible) setAlternativas({ visible: false, objetivoPedido: 0, arriba: null, abajo: null });
                    }}
                  />
                </div>

                {modoSimulador === 'pro' && (
                  <p className="sb-collar-hint mb-3">
                    <i className="fas fa-info-circle me-1" style={{ color: 'var(--accent)' }}></i>
                    Modo Pro: se restará la barra ({formatearPeso(tipoBarra)}{config.etiqueta})
                    {usarSeguros && ` + seguros (${formatearPeso(pesoSegurosTotal)}${config.etiqueta})`} del objetivo.
                  </p>
                )}

                <button type="button" className="sb-btn-calc" onClick={calcularCombinacionEficiente}>
                  <i className="fas fa-bolt"></i>Calcular combinación
                </button>

                {alternativas.visible && (
                  <div className="sb-alt-panel">
                    <div className="sb-alt-header">
                      <i className="fas fa-exclamation-triangle"></i>
                      Sin combo exacto para <strong>{formatearPeso(alternativas.objetivoPedido)} {config.etiqueta}</strong>
                      <button
                        type="button"
                        className="sb-alt-close"
                        onClick={() => setAlternativas({ visible: false, objetivoPedido: 0, arriba: null, abajo: null })}
                        aria-label="Cerrar"
                      >×</button>
                    </div>
                    <p className="sb-alt-hint">Pesos más cercanos disponibles con tu inventario:</p>
                    <div className="sb-alt-options">
                      {alternativas.arriba && (
                        <button
                          type="button"
                          className="sb-alt-option above"
                          onClick={() => aplicarAlternativa(alternativas.arriba.combo, alternativas.arriba.pesoDiscos)}
                        >
                          <span className="sb-alt-dir"><i className="fas fa-arrow-up"></i> Más pesado</span>
                          <span className="sb-alt-peso">
                            {formatearPeso(alternativas.arriba.pesoDiscos + tipoBarra + pesoSegurosTotal)}
                            <span className="sb-alt-unit">{config.etiqueta}</span>
                          </span>
                          <span className="sb-alt-combo">{formatComboLado(alternativas.arriba.combo)} por lado</span>
                          <span className="sb-alt-cta">Usar este →</span>
                        </button>
                      )}
                      {alternativas.abajo && (
                        <button
                          type="button"
                          className="sb-alt-option below"
                          onClick={() => aplicarAlternativa(alternativas.abajo.combo, alternativas.abajo.pesoDiscos)}
                        >
                          <span className="sb-alt-dir"><i className="fas fa-arrow-down"></i> Más ligero</span>
                          <span className="sb-alt-peso">
                            {formatearPeso(alternativas.abajo.pesoDiscos + tipoBarra + pesoSegurosTotal)}
                            <span className="sb-alt-unit">{config.etiqueta}</span>
                          </span>
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
                  <div className="sb-restrictions-title">
                    <i className="fas fa-shield-alt"></i>Límites del box
                  </div>
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
