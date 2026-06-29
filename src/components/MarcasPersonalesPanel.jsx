import { useState, useEffect, useCallback } from 'react';
import AtletifyLoader from './AtletifyLoader';

const API_BASE = import.meta.env.VITE_API_URL;

// Panel de marcas / PRs reutilizable. Lo usa el perfil de coach/admin para que el staff
// pueda subir sus récords igual que un atleta (el backend valida que sea su propia marca).
// Usa las clases mp-* (MiPerfil.css) para verse nativo donde se monte.
export default function MarcasPersonalesPanel({ idUsuario, idBox }) {
  const [ejercicios, setEjercicios] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ idEjercicio: '', valor: '', unidad: 'lbs' });
  const [guardando, setGuardando] = useState(false);
  const [prCalc, setPrCalc] = useState(''); // idMarca para la calculadora de %

  const PORCENTAJES = [95, 90, 85, 80, 75, 70, 65, 60];

  const cargar = useCallback(async () => {
    if (!idUsuario) return;
    setLoading(true);
    try {
      const reqs = [fetch(`${API_BASE}/marcaspersonales/usuario/${idUsuario}`)];
      if (idBox) reqs.push(fetch(`${API_BASE}/marcaspersonales/ejercicios-olimpicos/${idBox}`));
      const [rMarcas, rEj] = await Promise.all(reqs);
      if (rMarcas.ok) { const d = await rMarcas.json(); setRecords(d.recordsMaximos || []); }
      if (rEj && rEj.ok) setEjercicios(await rEj.json());
    } catch (e) {
      console.error('Error cargando marcas', e);
    } finally {
      setLoading(false);
    }
  }, [idUsuario, idBox]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch de datos; el setState ocurre dentro del callback async
  useEffect(() => { cargar(); }, [cargar]);

  const guardar = async (e) => {
    e.preventDefault();
    if (!form.idEjercicio || !form.valor) return;
    setGuardando(true);
    try {
      const res = await fetch(`${API_BASE}/marcaspersonales`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idUsuario,
          idEjercicio: parseInt(form.idEjercicio),
          valor: parseFloat(form.valor),
          unidad: form.unidad
        })
      });
      if (res.ok) {
        setForm({ idEjercicio: '', valor: '', unidad: 'lbs' });
        cargar();
      } else {
        const d = await res.json().catch(() => ({}));
        alert(d.mensaje || 'No se pudo guardar el PR.');
      }
    } catch {
      alert('Error de conexión.');
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async (idMarca) => {
    if (!await window.wpConfirm('¿Eliminar este PR de tu historial?')) return;
    try {
      const res = await fetch(`${API_BASE}/marcaspersonales/${idMarca}`, { method: 'DELETE' });
      if (res.ok) cargar();
      else alert('No se pudo eliminar.');
    } catch {
      alert('Error de conexión.');
    }
  };

  return (
    <div className="mp-card">
      <div className="mp-card-body-lg">
        <h5 className="mp-section-title mp-section-title--physical">
          <i className="fas fa-trophy"></i> Mis Marcas / PRs
        </h5>
        <p className="mp-medical-note" style={{ borderColor: 'transparent', background: 'transparent' }}>
          Registra tus récords como cualquier atleta. Aparecen en tu perfil y en comunidad.
        </p>

        <form
          onSubmit={guardar}
          style={{ display: 'grid', gap: '0.85rem', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', alignItems: 'end', marginBottom: '1.25rem' }}
        >
          <div>
            <label className="mp-label">Ejercicio</label>
            <select className="mp-input" value={form.idEjercicio} onChange={e => setForm({ ...form, idEjercicio: e.target.value })} required>
              <option value="">Elige...</option>
              {ejercicios.map(ej => <option key={ej.idEjercicio} value={ej.idEjercicio}>{ej.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="mp-label">Marca</label>
            <input type="number" step="0.1" className="mp-input" placeholder="Ej. 100" value={form.valor} onChange={e => setForm({ ...form, valor: e.target.value })} required />
          </div>
          <div>
            <label className="mp-label">Unidad</label>
            <select className="mp-input" value={form.unidad} onChange={e => setForm({ ...form, unidad: e.target.value })}>
              <option value="lbs">lbs</option>
              <option value="kg">kg</option>
            </select>
          </div>
          <button type="submit" className="mp-btn-save" disabled={guardando}>
            <i className="fas fa-plus"></i> {guardando ? 'Guardando...' : 'Registrar PR'}
          </button>
        </form>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '1.5rem 0' }}><AtletifyLoader /></div>
        ) : records.length === 0 ? (
          <p className="mp-medical-note">Aún no registras marcas. ¡Sube tu primer PR! 🔥</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {records.map(pr => (
              <div
                key={pr.idMarca}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '10px', padding: '0.6rem 0.9rem' }}
              >
                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{pr.nombreEjercicio}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <strong style={{ color: 'var(--accent)', fontFamily: 'var(--font-stats)', fontSize: '1.05rem' }}>{pr.valor} {pr.unidad}</strong>
                  <button onClick={() => eliminar(pr.idMarca)} title="Eliminar PR" style={{ background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer' }}>
                    <i className="fas fa-trash-alt"></i>
                  </button>
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Calculadora de porcentajes sobre un PR */}
        {records.length > 0 && (
          <div style={{ marginTop: '1.25rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
            <h5 className="mp-section-title mp-section-title--physical">
              <i className="fas fa-percent"></i> Calculadora de %
            </h5>
            <select
              className="mp-input"
              value={prCalc}
              onChange={e => setPrCalc(e.target.value)}
              style={{ marginBottom: '0.75rem' }}
            >
              <option value="">Elige un récord...</option>
              {records.map(pr => (
                <option key={pr.idMarca} value={pr.idMarca}>{pr.nombreEjercicio} — {pr.valor} {pr.unidad}</option>
              ))}
            </select>
            {(() => {
              const pr = records.find(r => String(r.idMarca) === String(prCalc));
              if (!pr) return null;
              return (
                <div style={{ display: 'grid', gap: '0.5rem', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))' }}>
                  {PORCENTAJES.map(p => (
                    <div key={p} style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '10px', padding: '0.5rem', textAlign: 'center' }}>
                      <div style={{ color: 'var(--accent-cool)', fontSize: '0.72rem', fontWeight: 700 }}>{p}%</div>
                      <div style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-stats)', fontWeight: 700, fontSize: '1.05rem' }}>
                        {(pr.valor * p / 100).toFixed(1)}
                      </div>
                      <div style={{ color: 'var(--secondary)', fontSize: '0.65rem' }}>{pr.unidad}</div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
