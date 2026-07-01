import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';

// Panel Developer para migrar atletas existentes: subir Excel → dry-run → enviar por etapas → métricas.
const BASE = `${import.meta.env.VITE_API_URL}/api/developer/migracion`;
const API = `${import.meta.env.VITE_API_URL}/api`;

const ETAPAS = { 1: 'Normal', 2: 'Familia', 3: 'Preferencial' };
const COLOR_ESTADO = {
  Borrador: '#64748b', Validado: '#0891b2', EnProgreso: '#b45309', Completado: '#16a34a', Cancelado: '#94a3b8'
};

export default function AdminMigracion() {
  const navigate = useNavigate();
  const authHeaders = () => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` });

  const [boxes, setBoxes] = useState([]);
  const [idBox, setIdBox] = useState('');
  const [nombreLote, setNombreLote] = useState('');
  const [tamanoOla, setTamanoOla] = useState(10);
  const [intervalo, setIntervalo] = useState(30);
  const [filas, setFilas] = useState([]);
  const [lotes, setLotes] = useState([]);
  const [sel, setSel] = useState(null);       // lote seleccionado
  const [panel, setPanel] = useState(null);    // 'report' | 'metrics'
  const [reporte, setReporte] = useState(null);
  const [metricas, setMetricas] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem('usuario') || 'null');
    if (!u || u.rol !== 'Developer') { navigate('/login'); return; }
    cargarBoxes();
    cargarLotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cargarBoxes = async () => {
    try { const r = await fetch(`${API}/box`); const d = await r.json(); setBoxes(Array.isArray(d) ? d : []); } catch {}
  };
  const cargarLotes = async () => {
    try { const r = await fetch(`${BASE}/lotes`, { headers: authHeaders() }); const d = await r.json(); setLotes(Array.isArray(d) ? d : []); } catch {}
  };

  // ── Parseo de Excel ──
  const pick = (obj, ...names) => {
    const keys = Object.keys(obj);
    for (const n of names) {
      const k = keys.find(k => k.trim().toLowerCase() === n);
      if (k != null && obj[k] !== '' && obj[k] != null) return obj[k];
    }
    return undefined;
  };
  const num = (v) => { if (v == null || v === '') return null; const n = Number(String(v).replace(/[^0-9.]/g, '')); return isNaN(n) ? null : n; };
  const parseFecha = (v) => {
    if (v == null || v === '') return null;
    if (v instanceof Date && !isNaN(v)) return v.toISOString().slice(0, 10);
    const s = String(v).trim();
    let m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
    if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
    m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
    if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
    const d = new Date(s);
    return isNaN(d) ? null : d.toISOString().slice(0, 10);
  };
  const mapRow = (r) => ({
    correo: pick(r, 'correo', 'email', 'e-mail', 'mail') ?? '',
    nombre: pick(r, 'nombre', 'nombres', 'name'),
    apellidos: pick(r, 'apellidos', 'apellido'),
    telefono: pick(r, 'telefono', 'teléfono', 'tel', 'celular'),
    planActual: pick(r, 'plan', 'planactual', 'plan actual', 'membresia', 'membresía'),
    precioPaga: num(pick(r, 'precio', 'preciopaga', 'precio paga', 'monto', 'precio preferencial', 'preciopreferencial')),
    motivoPrecioEspecial: pick(r, 'motivo', 'motivoprecioespecial', 'motivo precio especial', 'motivo preferencial'),
    fechaVencimiento: parseFecha(pick(r, 'fechavencimiento', 'fecha vencimiento', 'vencimiento', 'corte', 'fecha de corte', 'fechacorte')),
    fechaPagoInscripcion: parseFecha(pick(r, 'inscripcion', 'inscripción', 'fechapagoinscripcion', 'pago inscripcion', 'fecha inscripcion')),
    grupoFamiliar: pick(r, 'grupofamiliar', 'grupo familiar', 'familia', 'grupo'),
    categoria: pick(r, 'categoria', 'categoría', 'nivel'),
    genero: pick(r, 'genero', 'género', 'sexo'),
  });

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target.result, { type: 'binary', cellDates: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(ws, { raw: false });
        const mapped = json.map(mapRow).filter(r => (r.correo || '').trim() !== '');
        setFilas(mapped);
        setMsg(`Excel leído: ${mapped.length} atletas con correo.`);
      } catch { setMsg('No se pudo leer el Excel. Verifica el formato.'); }
    };
    reader.readAsBinaryString(file);
  };

  const crearLote = async () => {
    if (!idBox) { setMsg('Selecciona un box.'); return; }
    if (filas.length === 0) { setMsg('Sube un Excel con atletas primero.'); return; }
    setBusy(true); setMsg('');
    try {
      const r = await fetch(`${BASE}/lotes`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({ idBox: Number(idBox), nombre: nombreLote, tamanoOla: Number(tamanoOla), intervaloMinutos: Number(intervalo), atletas: filas })
      });
      const d = await r.json();
      setMsg(d.mensaje || 'Lote creado.');
      if (r.ok) { setFilas([]); setNombreLote(''); cargarLotes(); }
    } catch { setMsg('Error al crear el lote.'); }
    setBusy(false);
  };

  const validar = async (lote) => {
    setBusy(true); setSel(lote); setPanel('report'); setReporte(null);
    try {
      const r = await fetch(`${BASE}/lotes/${lote.idLote}/validar`, { method: 'POST', headers: authHeaders() });
      const d = await r.json();
      setReporte(d); cargarLotes();
    } catch { setMsg('Error al validar.'); }
    setBusy(false);
  };

  const verMetricas = async (lote) => {
    setBusy(true); setSel(lote); setPanel('metrics'); setMetricas(null);
    try {
      const r = await fetch(`${BASE}/lotes/${lote.idLote}/metricas`, { headers: authHeaders() });
      setMetricas(await r.json());
    } catch { setMsg('Error al cargar métricas.'); }
    setBusy(false);
  };

  const enviarEtapa = async (lote, etapa) => {
    if (!window.confirm(`¿Enviar la etapa ${etapa} (${ETAPAS[etapa]}) del lote "${lote.nombre}"? Se generarán los enlaces y se enviarán por olas.`)) return;
    setBusy(true);
    try {
      const r = await fetch(`${BASE}/lotes/${lote.idLote}/enviar-etapa/${etapa}`, { method: 'POST', headers: authHeaders() });
      const d = await r.json();
      setMsg(d.mensaje || 'Etapa programada.'); cargarLotes();
    } catch { setMsg('Error al enviar la etapa.'); }
    setBusy(false);
  };

  const eliminar = async (lote) => {
    if (!window.confirm(`¿Eliminar el lote "${lote.nombre}"? (solo si nada se ha enviado)`)) return;
    setBusy(true);
    try {
      const r = await fetch(`${BASE}/lotes/${lote.idLote}`, { method: 'DELETE', headers: authHeaders() });
      const d = await r.json();
      setMsg(d.mensaje || 'Lote eliminado.');
      if (sel?.idLote === lote.idLote) { setSel(null); setPanel(null); }
      cargarLotes();
    } catch { setMsg('Error al eliminar.'); }
    setBusy(false);
  };

  const reenviar = async (idPre) => {
    setBusy(true);
    try {
      const r = await fetch(`${BASE}/atletas/${idPre}/reenviar`, { method: 'POST', headers: authHeaders() });
      const d = await r.json(); setMsg(d.mensaje || 'Reprogramado.');
      if (sel) verMetricas(sel);
    } catch { setMsg('Error al reenviar.'); }
    setBusy(false);
  };

  // ── estilos ──
  const S = {
    page: { maxWidth: 1100, margin: '0 auto', padding: 24, fontFamily: "'Helvetica Neue',Arial,sans-serif", color: '#0f172a' },
    h1: { fontSize: 24, fontWeight: 700, margin: '0 0 4px' },
    sub: { color: '#64748b', margin: '0 0 20px', fontSize: 14 },
    card: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 20, marginBottom: 20 },
    label: { display: 'block', fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5, margin: '0 0 6px' },
    input: { width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12 },
    btn: { padding: '9px 16px', background: '#f59e0b', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, fontSize: 13, cursor: 'pointer' },
    btnSm: { padding: '6px 10px', border: '1px solid #cbd5e1', background: '#fff', borderRadius: 6, fontSize: 12, cursor: 'pointer', color: '#334155' },
    chip: (c) => ({ display: 'inline-block', padding: '2px 9px', borderRadius: 999, background: `${c}18`, color: c, fontSize: 11.5, fontWeight: 700 }),
    msg: { background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e40af', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16 },
    kpi: { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '12px 14px', textAlign: 'center' },
    kpiN: { fontSize: 22, fontWeight: 700 }, kpiL: { fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 },
    th: { textAlign: 'left', fontSize: 11, color: '#64748b', textTransform: 'uppercase', padding: '8px', borderBottom: '2px solid #e2e8f0' },
    td: { padding: '8px', borderBottom: '1px solid #f1f5f9', fontSize: 13 },
  };

  const nombreBox = (id) => boxes.find(b => (b.idBox || b.IdBox) === id)?.nombre || boxes.find(b => (b.idBox || b.IdBox) === id)?.Nombre || `Box ${id}`;

  return (
    <div style={S.page}>
      <h1 style={S.h1}>Migración de atletas</h1>
      <p style={S.sub}>Sube el Excel de tu box, valida sin enviar (dry-run), corrige y envía los enlaces por etapas.</p>

      {msg && <div style={S.msg}>{msg}</div>}

      {/* Crear lote */}
      <div style={S.card}>
        <h3 style={{ margin: '0 0 14px' }}>1 · Nuevo lote (staging, no envía nada)</h3>
        <div style={S.grid}>
          <div>
            <label style={S.label}>Box</label>
            <select style={S.input} value={idBox} onChange={e => setIdBox(e.target.value)}>
              <option value="">Selecciona…</option>
              {boxes.map(b => <option key={b.idBox || b.IdBox} value={b.idBox || b.IdBox}>{b.nombre || b.Nombre}</option>)}
            </select>
          </div>
          <div><label style={S.label}>Nombre del lote</label><input style={S.input} value={nombreLote} onChange={e => setNombreLote(e.target.value)} placeholder="Ej. Migración inicial" /></div>
          <div><label style={S.label}>Tamaño de ola</label><input style={S.input} type="number" min="1" value={tamanoOla} onChange={e => setTamanoOla(e.target.value)} /></div>
          <div><label style={S.label}>Intervalo (min)</label><input style={S.input} type="number" min="0" value={intervalo} onChange={e => setIntervalo(e.target.value)} /></div>
        </div>
        <div style={{ marginTop: 14 }}>
          <label style={S.label}>Archivo Excel (.xlsx / .xls)</label>
          <input type="file" accept=".xlsx,.xls" onChange={handleFile} />
          <p style={{ fontSize: 12, color: '#94a3b8', margin: '6px 0 0' }}>
            Columnas reconocidas: correo, nombre, apellidos, teléfono, plan, precio, motivo, fecha de corte, inscripción, grupo familiar, categoría, género.
          </p>
        </div>
        {filas.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <p style={{ fontSize: 13, color: '#334155' }}><strong>{filas.length}</strong> atletas listos para staging.</p>
            <button style={{ ...S.btn, opacity: busy ? 0.6 : 1 }} disabled={busy} onClick={crearLote}>Crear lote en Borrador</button>
          </div>
        )}
      </div>

      {/* Lotes */}
      <div style={S.card}>
        <h3 style={{ margin: '0 0 14px' }}>2 · Lotes</h3>
        {lotes.length === 0 && <p style={{ color: '#94a3b8', fontSize: 14 }}>Aún no hay lotes.</p>}
        {lotes.map(l => (
          <div key={l.idLote} style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 14, marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <div>
                <strong>{l.nombre}</strong> <span style={S.chip(COLOR_ESTADO[l.estado] || '#64748b')}>{l.estado}</span>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 3 }}>
                  {l.nombreBox || nombreBox(l.idBox)} · {l.totalAtletas} atletas · {l.enviados} enviados · {l.activados} activados · {l.fallidos} fallidos
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button style={S.btnSm} disabled={busy} onClick={() => validar(l)}>Validar (dry-run)</button>
                <button style={S.btnSm} disabled={busy} onClick={() => enviarEtapa(l, 1)}>Enviar Normal</button>
                <button style={S.btnSm} disabled={busy} onClick={() => enviarEtapa(l, 2)}>Familia</button>
                <button style={S.btnSm} disabled={busy} onClick={() => enviarEtapa(l, 3)}>Preferencial</button>
                <button style={S.btnSm} disabled={busy} onClick={() => verMetricas(l)}>Métricas</button>
                <button style={{ ...S.btnSm, color: '#dc2626' }} disabled={busy} onClick={() => eliminar(l)}>Eliminar</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Panel de reporte / métricas */}
      {sel && panel === 'report' && reporte && (
        <div style={S.card}>
          <h3 style={{ margin: '0 0 6px' }}>Dry-run · {sel.nombre}</h3>
          <p style={{ fontSize: 14, color: reporte.puedeEnviar ? '#16a34a' : '#dc2626', margin: '0 0 12px' }}>{reporte.mensaje}</p>
          <div style={{ ...S.grid, marginBottom: 14 }}>
            <div style={S.kpi}><div style={S.kpiN}>{reporte.totalFilas}</div><div style={S.kpiL}>Filas</div></div>
            <div style={S.kpi}><div style={{ ...S.kpiN, color: '#dc2626' }}>{reporte.filasConError}</div><div style={S.kpiL}>Con error</div></div>
            <div style={S.kpi}><div style={{ ...S.kpiN, color: '#b45309' }}>{reporte.totalAdvertencias}</div><div style={S.kpiL}>Advertencias</div></div>
          </div>
          <div style={{ maxHeight: 380, overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr><th style={S.th}>Correo</th><th style={S.th}>Plan</th><th style={S.th}>Estado</th></tr></thead>
              <tbody>
                {reporte.reporte?.map(f => (
                  <tr key={f.idPreregistro}>
                    <td style={S.td}>{f.correo}<div style={{ fontSize: 11, color: '#94a3b8' }}>{f.nombre}</div></td>
                    <td style={S.td}>{f.planActual || '—'}</td>
                    <td style={S.td}>
                      {f.ok ? <span style={S.chip('#16a34a')}>OK</span> : <span style={S.chip('#dc2626')}>Error</span>}
                      {f.errores?.map((e, i) => <div key={i} style={{ fontSize: 11.5, color: '#dc2626' }}>• {e}</div>)}
                      {f.advertencias?.map((a, i) => <div key={i} style={{ fontSize: 11.5, color: '#b45309' }}>• {a}</div>)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {sel && panel === 'metrics' && metricas && (
        <div style={S.card}>
          <h3 style={{ margin: '0 0 12px' }}>Métricas · {sel.nombre}</h3>
          <div style={{ ...S.grid, marginBottom: 16 }}>
            <div style={S.kpi}><div style={S.kpiN}>{metricas.total}</div><div style={S.kpiL}>Total</div></div>
            <div style={S.kpi}><div style={S.kpiN}>{metricas.enviados}</div><div style={S.kpiL}>Enviados</div></div>
            <div style={S.kpi}><div style={S.kpiN}>{metricas.entregados}</div><div style={S.kpiL}>Entregados</div></div>
            <div style={S.kpi}><div style={S.kpiN}>{metricas.abiertos}</div><div style={S.kpiL}>Abiertos</div></div>
            <div style={S.kpi}><div style={S.kpiN}>{metricas.clics}</div><div style={S.kpiL}>Clics</div></div>
            <div style={S.kpi}><div style={{ ...S.kpiN, color: '#16a34a' }}>{metricas.activados}</div><div style={S.kpiL}>Activados</div></div>
            <div style={S.kpi}><div style={{ ...S.kpiN, color: '#dc2626' }}>{metricas.rebotados + metricas.fallidos}</div><div style={S.kpiL}>Rebote/Fallo</div></div>
            <div style={S.kpi}><div style={S.kpiN}>{metricas.tasaConversion}%</div><div style={S.kpiL}>Conversión</div></div>
          </div>

          {metricas.porEtapa?.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={S.label}>Por etapa</div>
              {metricas.porEtapa.map(e => (
                <div key={e.etapa} style={{ fontSize: 13, color: '#334155', padding: '3px 0' }}>
                  {e.nombre}: {e.activados}/{e.enviados} activados de {e.total}
                </div>
              ))}
            </div>
          )}

          {(metricas.problematicos?.length > 0 || metricas.noActivados?.length > 0) && (
            <div>
              <div style={S.label}>Rebotes / fallidos / sin activar</div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr><th style={S.th}>Correo</th><th style={S.th}>Estado</th><th style={S.th}></th></tr></thead>
                <tbody>
                  {[...(metricas.problematicos || []), ...(metricas.noActivados || [])].map(f => (
                    <tr key={f.idPreregistro}>
                      <td style={S.td}>{f.correo}<div style={{ fontSize: 11, color: '#94a3b8' }}>{f.nombre}</div></td>
                      <td style={S.td}><span style={S.chip('#b45309')}>{f.estadoEnvio}</span>{f.motivoRebote && <div style={{ fontSize: 11, color: '#dc2626' }}>{f.motivoRebote}</div>}</td>
                      <td style={S.td}><button style={S.btnSm} disabled={busy} onClick={() => reenviar(f.idPreregistro)}>Reenviar</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
