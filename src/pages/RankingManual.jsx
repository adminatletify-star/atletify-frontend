import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import BackButton from '../components/BackButton';
import '../assets/css/RankingManual.css';

const API_BASE = 'https://localhost:7149/api';

export default function RankingManual() {
  const { idEntrenamiento } = useParams();
  const navigate = useNavigate();

  const [wod, setWod] = useState(null);
  const [metricasBase, setMetricasBase] = useState([]);
  const [atletas, setAtletas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const [filtroCategoria, setFiltroCategoria] = useState('Todas'); // 'Todas', 'RX', 'Scaled'
  const [filtroGenero, setFiltroGenero] = useState('Todas');

  useEffect(() => {
    cargarCuartoDeGuerra();
  }, [idEntrenamiento]);

  async function cargarCuartoDeGuerra() {
    try {
      const box = JSON.parse(localStorage.getItem('box'));
      if (!box) { navigate('/'); return; }

      // 1. Extraer los datos del WOD y su Plantilla de Jueceo
      const resWod = await fetch(`${API_BASE}/entrenamientos/${idEntrenamiento}`);
      if (!resWod.ok) throw new Error("WOD no encontrado");
      const wodData = await resWod.json();
      setWod(wodData);

      const bloquePrincipal = wodData.bloques?.find(b => b.tipoBloque === 'WOD') || wodData.bloques?.[0];
      const metricasParsed = bloquePrincipal?.plantillaJueceo ? JSON.parse(bloquePrincipal.plantillaJueceo) : ["Score Principal"];
      setMetricasBase(metricasParsed);

      const fechaStr = wodData.fechaProgramada.split('T')[0];

      // 2. Traer TODAS las clases del día para ese Box
      const resClases = await fetch(`${API_BASE}/asistencias/box/${box.idBox}/fecha/${fechaStr}?idUsuario=0`);
      const clases = await resClases.json();

      // 3. Extraer a los atletas de cada clase
      const promesas = clases.map(c => fetch(`${API_BASE}/asistencias/clase/${c.idClase}/fecha/${fechaStr}`).then(r => r.json()));
      const resultados = await Promise.all(promesas);

      let todos = [];
      resultados.forEach(lista => todos = [...todos, ...lista]);

      // 4. Filtrar la Cuarentena (Solo los que asistieron y tienen un Score guardado)
      let enCuarentena = todos.filter(a => a.resultadoWod && a.resultadoWod !== 'null' && a.estado === 'Asistió');

      enCuarentena = enCuarentena.map(a => {
        let scoreObj = {};
        let valorActual = '';
        try {
          const p = JSON.parse(a.resultadoWod);
          scoreObj = p.metricasDetalle || {};
          // Si ya tenía un valor guardado previamente en manual, lo recuperamos
          if (p.tipoMedida === "MANUAL_TIME") {
            // Si es 9999, lo mostramos en blanco para no asustar a la coach
            valorActual = p.valorOrdenamiento === 9999 ? '' : p.valorOrdenamiento; 
          }
        } catch(e) { scoreObj = { [metricasParsed[0]]: a.resultadoWod }; }

        return { ...a, scoreObj, posicionAsignada: valorActual };
      });

      setAtletas(enCuarentena);
    } catch (err) {
      console.error(err);
      alert("Error al cargar el Cuarto de Guerra");
    } finally {
      setLoading(false);
    }
  }

  const handlePosicionChange = (idAsistencia, valor) => {
    setAtletas(prev => prev.map(a => a.idAsistencia === idAsistencia ? { ...a, posicionAsignada: valor } : a));
  };

  // 🔥 EL BOTÓN NUCLEAR: Guarda y hace visible la Pizarra
// 🔥 EL BOTÓN NUCLEAR: Guarda y hace visible/invisible la Pizarra
  const handleGuardarYPublicar = async (publicar) => {
    if (publicar && !await window.wpConfirm("¿Estás seguro de PUBLICAR la Pizarra? Todos los atletas recibirán una notificación silenciosa con sus medallas.")) return;
    
    setGuardando(true);
    try {
      const box = JSON.parse(localStorage.getItem('box'));

      // 1. Guardar la posición de cada atleta en su Score JSON
      const promesasScores = atletas.map(a => {
        let oldScore = {};
        try { oldScore = JSON.parse(a.resultadoWod); } catch(e){}

        const pos = parseInt(a.posicionAsignada);
        
        // 👈 REPARACIÓN 1: Generamos el texto visible para la Pizarra Pública
        let textoVisible = isNaN(pos) ? '--' : `LUGAR ${pos}`;
        
        // (Opcional) Si quieres que se vea la métrica principal junto al lugar:
        if (!isNaN(pos) && metricasBase.length > 0 && oldScore[metricasBase[0]]) {
           textoVisible = `LUGAR ${pos} (${oldScore[metricasBase[0]]})`;
        }

        const newScore = {
          ...oldScore,
          valorOrdenamiento: isNaN(pos) ? 9999 : pos, 
          tipoMedida: "MANUAL_TIME", 
          textoDisplay: textoVisible,
          nombreWod: wod.titulo 
        };

        return fetch(`${API_BASE}/asistencias/score/${a.idAsistencia}`, {
          method: 'PUT',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ resultadoWod: JSON.stringify(newScore), esRx: a.esRx })
        });
      });
      await Promise.all(promesasScores);

      // 👈 REPARACIÓN 2: SIEMPRE actualizamos el WOD (Para poner o quitar el candado)
      const payloadWod = {
        idBox: box.idBox,
        titulo: wod.titulo,
        fechaProgramada: wod.fechaProgramada.split('T')[0] + "T12:00:00Z",
        estaPublicado: wod.estaPublicado,
        notasAdicionales: wod.notasAdicionales || "",
        clasesIds: wod.clasesIds || [],
        modoRanking: wod.modoRanking,
        metricaPrincipal: wod.metricaPrincipal,
        rankingPublicado: publicar, // 👈 Si es true detona la bomba, si es false le pone candado
        bloques: wod.bloques.map(b => ({
          tipoBloque: b.tipoBloque, tipoModalidad: b.tipoModalidad, modalidadEquipo: b.modalidadEquipo,
          capTimeMinutos: b.capTimeMinutos || null,
          minutosExtraCap: b.minutosExtraCap ? parseInt(b.minutosExtraCap) : null,
          descripcionLibre: b.descripcionLibre || "", plantillaJueceo: b.plantillaJueceo || "[]",
          ejercicios: b.ejercicios.map(ej => ({
            idEjercicio: parseInt(ej.idEjercicio), esquemaRepeticiones: ej.esquemaRepeticiones || "", pesoSugerido: ej.pesoSugerido || ""
          }))
        }))
      };

      const resWod = await fetch(`${API_BASE}/entrenamientos/${wod.idEntrenamiento}`, {
        method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payloadWod)
      });

      if (!resWod.ok) throw new Error("Error al actualizar estado del WOD");

      alert(publicar ? "¡Pizarra Oficial Publicada con Éxito! 🏆" : "Progreso guardado y Pizarra Oculta 🔒");
      if (publicar) navigate('/pase-de-lista');

    } catch (err) {
      console.error(err);
      alert("Error de conexión al procesar la Pizarra.");
    } finally {
      setGuardando(false);
    }
  };

  const atletasVisibles = atletas.filter(a => {
    // Filtro 1: Biológico
    if (filtroGenero !== 'Todas' && a.genero !== filtroGenero) return false;
    // Filtro 2: Categoría
    if (filtroCategoria === 'RX') return a.esRx;
    if (filtroCategoria === 'Scaled') return !a.esRx;
    return true;
  });

  if (loading) return (
    <div className="rm-loading">
      <div className="spinner-border" role="status">
        <span className="visually-hidden">Cargando...</span>
      </div>
    </div>
  );

  return (
    <div className="rm-page">

      {/* NAVBAR TÁCTICO */}
      <nav className="rm-navbar">
        <div className="container-fluid px-0 d-flex align-items-center gap-3">
          <BackButton to="/pase-de-lista" />
          <div className="rm-navbar__icon">
            <i className="fas fa-gavel"></i>
          </div>
          <div>
            <p className="rm-navbar__title">Cuarto de Guerra</p>
            <p className="rm-navbar__subtitle">Modo Manual · {wod?.titulo}</p>
          </div>
        </div>
      </nav>

      <div className="container-fluid px-3 px-md-4 mt-4">

        {/* BANNER DE ADVERTENCIA */}
        <div className="rm-banner d-flex align-items-start gap-3 mb-4">
          <i className="fas fa-radiation rm-banner__icon mt-1"></i>
          <div>
            <p className="rm-banner__title">Scores en Cuarentena</p>
            <p className="rm-banner__text">
              Los atletas listados abajo han terminado el WOD pero sus resultados están ocultos.
              Analiza sus métricas, asígnales una posición (1, 2, 3…) y presiona Publicar.&nbsp;
              <em>Puedes repetir números en empates. Los que dejes en blanco van al fondo.</em>
            </p>
          </div>
        </div>

        {/* TARJETA PRINCIPAL */}
        <div className="rm-card mb-5">

          {/* Header con conteo y filtros */}
          <div className="rm-card__header d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3">
            <p className="rm-card__header-title">
              <i className="fas fa-users rm-card__header-icon"></i>
              Atletas por Evaluar&nbsp;
              <span className="rm-card__count">({atletasVisibles.length})</span>
            </p>

            {/* FILTROS */}
            <div className="d-flex flex-column gap-2 align-items-start align-items-md-end">
              {/* Género */}
              <div className="rm-filter-group">
                <button onClick={() => setFiltroGenero('Todas')} className={`rm-filter-btn ${filtroGenero === 'Todas' ? 'active-white' : ''}`}>
                  Mixto
                </button>
                <button onClick={() => setFiltroGenero('Hombre')} className={`rm-filter-btn ${filtroGenero === 'Hombre' ? 'active-blue' : ''}`}>
                  Hombres
                </button>
                <button onClick={() => setFiltroGenero('Mujer')} className={`rm-filter-btn ${filtroGenero === 'Mujer' ? 'active-red' : ''}`}>
                  Mujeres
                </button>
              </div>
              {/* Categoría */}
              <div className="rm-filter-group">
                <button onClick={() => setFiltroCategoria('Todas')} className={`rm-filter-btn ${filtroCategoria === 'Todas' ? 'active-white' : ''}`}>
                  Todas
                </button>
                <button onClick={() => setFiltroCategoria('RX')} className={`rm-filter-btn ${filtroCategoria === 'RX' ? 'active-gold' : ''}`}>
                  RX
                </button>
                <button onClick={() => setFiltroCategoria('Scaled')} className={`rm-filter-btn ${filtroCategoria === 'Scaled' ? 'active-teal' : ''}`}>
                  Scaled
                </button>
              </div>
            </div>
          </div>

          {/* Tabla */}
          <div className="rm-table-wrapper">
            {atletasVisibles.length === 0 ? (
              <div className="rm-empty">
                <i className="fas fa-ghost"></i>
                <p>No hay atletas en esta categoría con score guardado.</p>
              </div>
            ) : (
              <table className="rm-table">
                <thead>
                  <tr>
                    <th className="text-start ps-4">Atleta</th>
                    <th className="text-center">Categoría</th>
                    {/* 👈 LAS MÉTRICAS PERSONALIZADAS QUE LIZ INVENTÓ */}
                    {metricasBase.map(m => (
                      <th key={m} className="text-center rm-th-metric">
                        <i className="fas fa-clipboard-check me-1"></i>{m}
                      </th>
                    ))}
                    <th className="text-center rm-th-pos pe-4">
                      <i className="fas fa-medal me-1"></i>Posición
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {atletasVisibles.map((a) => (
                    <tr key={a.idAsistencia}>
                      <td className="ps-4">
                        <span className="rm-athlete-name">{a.nombreUsuario}</span>
                      </td>
                      <td className="text-center">
                        {a.esRx
                          ? <span className="rm-badge-rx">RX</span>
                          : <span className="rm-badge-scaled">Scaled</span>}
                      </td>
                      {/* 👈 RELLENAMOS LAS MÉTRICAS DEL ATLETA */}
                      {metricasBase.map(m => (
                        <td key={m} className="text-center">
                          <span className="rm-score-metric">{a.scoreObj[m] || '—'}</span>
                        </td>
                      ))}
                      {/* 👈 EL CAMPO DONDE LIZ INGRESA EL LUGAR (1, 2, 3...) */}
                      <td className="text-center pe-4">
                        <input
                          type="number" min="1"
                          className="rm-position-input"
                          value={a.posicionAsignada}
                          onChange={(e) => handlePosicionChange(a.idAsistencia, e.target.value)}
                          placeholder="#"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>

      {/* FOOTER FLOTANTE (BOTONES NUCLEARES) */}
      <div className="rm-footer">
        <div className="container-fluid d-flex flex-column flex-sm-row justify-content-end gap-3 px-0 px-md-2">
          <button onClick={() => handleGuardarYPublicar(false)} disabled={guardando} className="rm-btn-save">
            <i className="fas fa-save"></i> Guardar Progreso
          </button>
          <button onClick={() => handleGuardarYPublicar(true)} disabled={guardando} className="rm-btn-publish">
            {guardando
              ? <><span className="spinner-border spinner-border-sm"></span> Procesando...</>
              : <><i className="fas fa-rocket"></i> Publicar Pizarra Oficial</>}
          </button>
        </div>
      </div>

    </div>
  );
}