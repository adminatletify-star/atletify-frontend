import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { api, COMPETENCIAS_ENDPOINT } from '../services/api';
import EjercicioPicker from './EjercicioPicker';
import PlantillaJueceo from './PlantillaJueceo';
import './ConstructorWodComp.css';

// La "naturaleza" del WOD: de aquí se deriva la plantilla de jueceo (capa 3).
const TIPOS_SCORE = [
  { valor: 'ForTime', label: 'For Time', icon: 'fa-stopwatch', desc: 'Menor tiempo gana. Time cap opcional.' },
  { valor: 'AMRAP', label: 'AMRAP', icon: 'fa-repeat', desc: 'Máximas repeticiones en el tiempo fijado. Mayor gana.' },
  { valor: 'Carga', label: 'Carga / RM', icon: 'fa-weight-hanging', desc: 'Mayor peso levantado gana.' },
  { valor: 'RondasReps', label: 'Rondas + Reps', icon: 'fa-layer-group', desc: 'Rondas completas + reps extra. Mayor gana.' },
  { valor: 'Puntos', label: 'Puntos', icon: 'fa-star', desc: 'Puntaje manual definido por el juez. Mayor gana.' },
];

const movVacio = () => ({ modo: 'biblioteca', idEjercicioDiccionario: null, nombreCustom: '', esquemaReps: '', pesoHombre: '', pesoMujer: '', notas: '' });
const critVacio = () => ({ descripcion: '', esDesempate: false, activo: true });

export default function ConstructorWodComp({ idCompetencia, categorias = [], idWodEditar, onCerrar, onGuardado, onClonado }) {
  const editando = !!idWodEditar;

  const [ejercicios, setEjercicios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    nombre: '', descripcion: '', tipoScore: 'ForTime', idCategoriaComp: '',
    unidadPeso: 'kg',
    timeCapMinutos: 0, permiteCapReps: false,
    tiebreakActivo: false, tiebreakTipo: 'Tiempo', tiebreakDescripcion: '',
    usaChecklist: false,
  });
  const [movimientos, setMovimientos] = useState([movVacio()]);
  const [criterios, setCriterios] = useState([]);
  const [mostrarPreview, setMostrarPreview] = useState(false);

  // Cargar la biblioteca del developer + (si edita) el detalle del WOD
  useEffect(() => {
    let activo = true;
    (async () => {
      setCargando(true);
      try {
        const dic = await api.obtenerEjerciciosDiccionario();
        if (activo) setEjercicios(Array.isArray(dic) ? dic : []);
      } catch { /* sin biblioteca: el juez/admin puede usar custom */ }

      if (editando) {
        try {
          const res = await fetch(`${COMPETENCIAS_ENDPOINT}/wods/${idWodEditar}/detalle`);
          if (res.ok && activo) {
            const d = await res.json();
            setForm({
              nombre: d.nombre || '',
              descripcion: d.descripcion || '',
              tipoScore: d.tipoScore || 'ForTime',
              unidadPeso: d.unidadPeso || 'kg',
              idCategoriaComp: d.idCategoriaComp ?? '',
              timeCapMinutos: d.timeCapMinutos || 0,
              permiteCapReps: !!d.permiteCapReps,
              tiebreakActivo: !!d.tiebreakActivo,
              tiebreakTipo: d.tiebreakTipo || 'Tiempo',
              tiebreakDescripcion: d.tiebreakDescripcion || '',
              usaChecklist: !!d.usaChecklist,
            });
            const movs = (d.movimientos || []).map(m => ({
              modo: m.idEjercicioDiccionario ? 'biblioteca' : 'custom',
              idEjercicioDiccionario: m.idEjercicioDiccionario ?? null,
              nombreCustom: m.nombreCustom || '',
              esquemaReps: m.esquemaReps || '',
              pesoHombre: m.pesoHombre || '',
              pesoMujer: m.pesoMujer || '',
              notas: m.notas || '',
            }));
            setMovimientos(movs.length ? movs : [movVacio()]);
            setCriterios((d.criterios || []).map(c => ({
              descripcion: c.descripcion || '', esDesempate: !!c.esDesempate, activo: c.activo !== false,
            })));
          }
        } catch { /* ignore */ }
      }
      if (activo) setCargando(false);
    })();
    return () => { activo = false; };
  }, [idWodEditar, editando]);

  const tipoActual = useMemo(() => TIPOS_SCORE.find(t => t.valor === form.tipoScore) || TIPOS_SCORE[0], [form.tipoScore]);
  const usaTiempo = form.tipoScore === 'ForTime' || form.tipoScore === 'RondasReps';

  // WOD sintetizado desde el form actual para previsualizar la hoja del juez en vivo.
  const previewWod = useMemo(() => ({
    tipoScore: form.tipoScore,
    unidadPeso: form.unidadPeso,
    timeCapMinutos: Number(form.timeCapMinutos) || 0,
    permiteCapReps: form.permiteCapReps,
    tiebreakActivo: form.tiebreakActivo,
    tiebreakTipo: form.tiebreakTipo,
    tiebreakDescripcion: form.tiebreakDescripcion,
    usaChecklist: form.usaChecklist,
    criterios: criterios.map((c, i) => ({ idCriterioJueceo: i, descripcion: c.descripcion, esDesempate: c.esDesempate, activo: c.activo, orden: i })),
    movimientos: movimientos.map(m => ({ esquemaReps: m.esquemaReps, pesoHombre: m.pesoHombre, pesoMujer: m.pesoMujer })),
  }), [form, criterios, movimientos]);

  const setMov = (i, campo, valor) => setMovimientos(prev => prev.map((m, idx) => idx === i ? { ...m, [campo]: valor } : m));
  const addMov = () => setMovimientos(prev => [...prev, movVacio()]);
  const delMov = (i) => setMovimientos(prev => prev.length === 1 ? prev : prev.filter((_, idx) => idx !== i));

  const setCrit = (i, campo, valor) => setCriterios(prev => prev.map((c, idx) => idx === i ? { ...c, [campo]: valor } : c));
  const addCrit = () => setCriterios(prev => [...prev, critVacio()]);
  const delCrit = (i) => setCriterios(prev => prev.filter((_, idx) => idx !== i));

  const construirBody = () => ({
    nombre: form.nombre.trim(),
    descripcion: form.descripcion,
    tipoScore: form.tipoScore,
    unidadPeso: form.unidadPeso,
    orden: 0,
    idCategoriaComp: form.idCategoriaComp === '' ? null : Number(form.idCategoriaComp),
    timeCapMinutos: Number(form.timeCapMinutos) || 0,
    permiteCapReps: form.permiteCapReps,
    tiebreakActivo: form.tiebreakActivo,
    tiebreakTipo: form.tiebreakTipo,
    tiebreakDescripcion: form.tiebreakDescripcion,
    usaChecklist: form.usaChecklist,
    movimientos: movimientos
      .filter(m => (m.modo === 'biblioteca' && m.idEjercicioDiccionario) || (m.modo === 'custom' && m.nombreCustom.trim()))
      .map((m, idx) => ({
        orden: idx,
        idEjercicioDiccionario: m.modo === 'biblioteca' ? Number(m.idEjercicioDiccionario) : null,
        nombreCustom: m.modo === 'custom' ? m.nombreCustom.trim() : '',
        esquemaReps: m.esquemaReps,
        pesoHombre: m.pesoHombre,
        pesoMujer: m.pesoMujer,
        notas: m.notas,
      })),
    criterios: form.usaChecklist
      ? criterios.filter(c => c.descripcion.trim()).map((c, idx) => ({ orden: idx, descripcion: c.descripcion.trim(), activo: c.activo, esDesempate: c.esDesempate }))
      : [],
  });

  const guardar = async () => {
    setError('');
    if (!form.nombre.trim()) { setError('El WOD necesita un nombre.'); return; }
    setGuardando(true);
    try {
      const url = editando ? `${COMPETENCIAS_ENDPOINT}/wods/${idWodEditar}` : `${COMPETENCIAS_ENDPOINT}/${idCompetencia}/wods`;
      const res = await fetch(url, {
        method: editando ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(construirBody()),
      });
      if (res.ok) {
        onGuardado?.();
        onCerrar?.();
      } else {
        const d = await res.json().catch(() => ({}));
        setError(d.mensaje || 'No se pudo guardar el WOD.');
      }
    } catch {
      setError('Error de conexión.');
    } finally {
      setGuardando(false);
    }
  };

  const clonar = async () => {
    if (!editando) return;
    setError('');
    setGuardando(true);
    try {
      const res = await fetch(`${COMPETENCIAS_ENDPOINT}/wods/${idWodEditar}/clonar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok && d.id) {
        onGuardado?.();
        onClonado?.(d.id); // el padre reabre el constructor sobre la copia para ajustar categoría/pesos
      } else {
        setError(d.mensaje || 'No se pudo clonar el WOD.');
      }
    } catch {
      setError('Error de conexión.');
    } finally {
      setGuardando(false);
    }
  };

  return createPortal(
    <div className="cw-overlay" onClick={onCerrar}>
      <div className="cw-modal" onClick={e => e.stopPropagation()}>

        <div className="cw-header">
          <h3 className="cw-title"><i className="fas fa-dumbbell"></i> {editando ? 'Editar WOD' : 'Diseñar WOD'}</h3>
          <button className="cw-close" onClick={onCerrar}><i className="fas fa-times"></i></button>
        </div>

        {cargando ? (
          <div className="cw-loading"><i className="fas fa-spinner fa-spin"></i> Cargando...</div>
        ) : (
          <div className="cw-body">
            {error && <div className="cw-error"><i className="fas fa-exclamation-triangle"></i> {error}</div>}

            <div className="cw-grid2">
              <div className="cw-field">
                <label className="cw-label">Nombre del WOD</label>
                <input className="cw-input" placeholder="Ej: E1 — Fran" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} />
              </div>
              <div className="cw-field">
                <label className="cw-label">Categoría</label>
                <select className="cw-input" value={form.idCategoriaComp} onChange={e => setForm({ ...form, idCategoriaComp: e.target.value })}>
                  <option value="">Todas las categorías</option>
                  {categorias.map(c => {
                    const cid = c.idCategoriaComp || c.IdCategoriaComp;
                    return <option key={cid} value={cid}>{c.nombre || c.Nombre}</option>;
                  })}
                </select>
              </div>
            </div>

            <div className="cw-field">
              <label className="cw-label">Tipo de score <span className="cw-hint">— define la plantilla de jueceo</span></label>
              <div className="cw-tipos">
                {TIPOS_SCORE.map(t => (
                  <button key={t.valor} type="button" className={`cw-tipo${form.tipoScore === t.valor ? ' cw-tipo--activo' : ''}`} onClick={() => setForm({ ...form, tipoScore: t.valor })}>
                    <i className={`fas ${t.icon}`}></i>
                    <span>{t.label}</span>
                  </button>
                ))}
              </div>
              <p className="cw-tipo-desc">{tipoActual.desc}</p>
              {form.tipoScore === 'Carga' && (
                <div className="cw-mt">
                  <label className="cw-label">Unidad de peso del WOD <span className="cw-hint">— se fija una vez; los jueces NO la cambian</span></label>
                  <div className="cw-tipos">
                    {['kg', 'lb'].map(u => (
                      <button key={u} type="button" className={`cw-tipo${form.unidadPeso === u ? ' cw-tipo--activo' : ''}`} onClick={() => setForm({ ...form, unidadPeso: u })}>
                        <i className="fas fa-weight-hanging"></i>
                        <span>{u === 'kg' ? 'Kilos (kg)' : 'Libras (lb)'}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="cw-grid2">
              <div className="cw-field">
                <label className="cw-label">Time cap (minutos)</label>
                <input type="number" min="0" className="cw-input" value={form.timeCapMinutos} onChange={e => setForm({ ...form, timeCapMinutos: e.target.value })} />
              </div>
              {usaTiempo && (
                <div className="cw-field cw-field--check">
                  <label className="cw-check">
                    <input type="checkbox" checked={form.permiteCapReps} onChange={e => setForm({ ...form, permiteCapReps: e.target.checked })} />
                    <span>Permitir <b>CAP + reps</b>: quien no termina se ordena por reps, tras los que sí cerraron</span>
                  </label>
                </div>
              )}
            </div>

            <div className="cw-field">
              <label className="cw-label">Descripción</label>
              <textarea className="cw-input cw-textarea" rows="2" placeholder="Ej: 21-15-9 Thrusters + Pull-ups" value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })}></textarea>
            </div>

            {/* MOVIMIENTOS */}
            <div className="cw-section">
              <div className="cw-section-head">
                <span><i className="fas fa-list-ol"></i> Movimientos</span>
                <button type="button" className="cw-add" onClick={addMov}><i className="fas fa-plus"></i> Agregar</button>
              </div>
              {movimientos.map((m, i) => (
                <div key={i} className="cw-mov">
                  <div className="cw-mov-top">
                    <div className="cw-modo">
                      <button type="button" className={`cw-modo-btn${m.modo === 'biblioteca' ? ' cw-modo-btn--on' : ''}`} onClick={() => setMov(i, 'modo', 'biblioteca')}>Biblioteca</button>
                      <button type="button" className={`cw-modo-btn${m.modo === 'custom' ? ' cw-modo-btn--on' : ''}`} onClick={() => setMov(i, 'modo', 'custom')}>Custom</button>
                    </div>
                    <button type="button" className="cw-del" onClick={() => delMov(i)} title="Quitar movimiento"><i className="fas fa-trash"></i></button>
                  </div>
                  <div className="cw-mov-grid">
                    <div className="cw-mov-ej">
                      {m.modo === 'biblioteca' ? (
                        <EjercicioPicker ejercicios={ejercicios} valor={m.idEjercicioDiccionario} onCambiar={(idv) => setMov(i, 'idEjercicioDiccionario', idv)} />
                      ) : (
                        <input className="cw-input" placeholder="Nombre del movimiento" value={m.nombreCustom} onChange={e => setMov(i, 'nombreCustom', e.target.value)} />
                      )}
                    </div>
                    <input className="cw-input" placeholder="Reps (21-15-9, 400m...)" value={m.esquemaReps} onChange={e => setMov(i, 'esquemaReps', e.target.value)} />
                    <input className="cw-input" placeholder="Peso ♂" value={m.pesoHombre} onChange={e => setMov(i, 'pesoHombre', e.target.value)} />
                    <input className="cw-input" placeholder="Peso ♀" value={m.pesoMujer} onChange={e => setMov(i, 'pesoMujer', e.target.value)} />
                  </div>
                  <input className="cw-input cw-mov-notas" placeholder="Notas / estándar del movimiento (opcional)" value={m.notas} onChange={e => setMov(i, 'notas', e.target.value)} />
                </div>
              ))}
            </div>

            {/* TIEBREAK */}
            <div className="cw-section">
              <label className="cw-check cw-check--head">
                <input type="checkbox" checked={form.tiebreakActivo} onChange={e => setForm({ ...form, tiebreakActivo: e.target.checked })} />
                <span><i className="fas fa-flag-checkered"></i> Desempate (tiebreak)</span>
              </label>
              {form.tiebreakActivo && (
                <div className="cw-grid2 cw-mt">
                  <div className="cw-field">
                    <label className="cw-label">Tipo de desempate</label>
                    <select className="cw-input" value={form.tiebreakTipo} onChange={e => setForm({ ...form, tiebreakTipo: e.target.value })}>
                      <option value="Tiempo">Tiempo (menor gana)</option>
                      <option value="Reps">Reps (mayor gana)</option>
                    </select>
                  </div>
                  <div className="cw-field">
                    <label className="cw-label">¿Dónde se toma?</label>
                    <input className="cw-input" placeholder="Ej: tiempo al cerrar los thrusters" value={form.tiebreakDescripcion} onChange={e => setForm({ ...form, tiebreakDescripcion: e.target.value })} />
                  </div>
                </div>
              )}
            </div>

            {/* CHECKLIST */}
            <div className="cw-section">
              <label className="cw-check cw-check--head">
                <input type="checkbox" checked={form.usaChecklist} onChange={e => setForm({ ...form, usaChecklist: e.target.checked })} />
                <span><i className="fas fa-clipboard-check"></i> Checklist de criterios (estándares / no-reps)</span>
              </label>
              {form.usaChecklist && (
                <div className="cw-mt">
                  {criterios.map((c, i) => (
                    <div key={i} className="cw-crit">
                      <input className="cw-input" placeholder="Ej: cadera por debajo de la rodilla" value={c.descripcion} onChange={e => setCrit(i, 'descripcion', e.target.value)} />
                      <label className="cw-check cw-check--sm" title="Este criterio cuenta para el desempate">
                        <input type="checkbox" checked={c.esDesempate} onChange={e => setCrit(i, 'esDesempate', e.target.checked)} />
                        <span>Desempate</span>
                      </label>
                      <button type="button" className="cw-del" onClick={() => delCrit(i)}><i className="fas fa-trash"></i></button>
                    </div>
                  ))}
                  <button type="button" className="cw-add" onClick={addCrit}><i className="fas fa-plus"></i> Agregar criterio</button>
                </div>
              )}
            </div>

            {/* VISTA PREVIA: la hoja de jueceo que se auto-genera segun el tipo de score */}
            <div className="cw-section">
              <div className="cw-section-head">
                <span><i className="fas fa-eye"></i> Vista previa de la hoja del juez</span>
                <button type="button" className="cw-add" onClick={() => setMostrarPreview(v => !v)}>
                  {mostrarPreview ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>
              {mostrarPreview && <PlantillaJueceo key={previewWod.tipoScore} wod={previewWod} nombreJuez="(preview)" />}
            </div>
          </div>
        )}

        <div className="cw-footer">
          {editando && (
            <button type="button" className="cw-btn cw-btn--ghost" onClick={clonar} disabled={guardando || cargando} title="Crear una copia (para otra categoría)">
              <i className="fas fa-clone"></i> Clonar
            </button>
          )}
          <div className="cw-footer-right">
            <button type="button" className="cw-btn cw-btn--ghost" onClick={onCerrar} disabled={guardando}>Cancelar</button>
            <button type="button" className="cw-btn cw-btn--solid" onClick={guardar} disabled={guardando || cargando}>
              <i className="fas fa-save"></i> {guardando ? 'Guardando...' : (editando ? 'Guardar cambios' : 'Crear WOD')}
            </button>
          </div>
        </div>

      </div>
    </div>,
    document.body
  );
}
