import { useState, useEffect } from 'react';
import { JUECES_COMP_ENDPOINT } from '../services/api';
import AtletifyLoader from './AtletifyLoader';

// Panel de jueces (JuezComp): alta que genera magic-link + PIN y manda correo; lista con
// copiar enlace / reenviar / eliminar. Reemplaza al panel viejo basado en Usuario rol="Juez".
export default function GestionJuecesCompPanel({ idCompetencia }) {
  const [jueces, setJueces] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [form, setForm] = useState({ nombre: '', apellidos: '', correo: '', telefono: '' });
  const [guardando, setGuardando] = useState(false);
  const [copiado, setCopiado] = useState(null);

  const cargar = async () => {
    setCargando(true);
    try {
      const res = await fetch(`${JUECES_COMP_ENDPOINT}/${idCompetencia}`);
      if (res.ok) setJueces(await res.json());
    } catch { /* ignore */ } finally { setCargando(false); }
  };
  useEffect(() => { cargar(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [idCompetencia]);

  const alta = async (e) => {
    e.preventDefault();
    if (!form.nombre.trim()) return;
    setGuardando(true);
    try {
      const res = await fetch(`${JUECES_COMP_ENDPOINT}/${idCompetencia}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
      });
      if (res.ok) { setForm({ nombre: '', apellidos: '', correo: '', telefono: '' }); cargar(); }
      else { const d = await res.json().catch(() => ({})); alert(d.mensaje || 'No se pudo dar de alta.'); }
    } catch { alert('Error de conexión.'); } finally { setGuardando(false); }
  };

  const reenviar = async (id) => {
    try { const res = await fetch(`${JUECES_COMP_ENDPOINT}/${id}/reenviar`, { method: 'POST' }); if (res.ok) { cargar(); alert('Acceso reenviado por correo.'); } } catch { /* ignore */ }
  };
  const eliminar = async (id) => {
    const ok = window.wpConfirm ? await window.wpConfirm('¿Eliminar este juez?') : window.confirm('¿Eliminar este juez?');
    if (!ok) return;
    try { const res = await fetch(`${JUECES_COMP_ENDPOINT}/${id}`, { method: 'DELETE' }); if (res.ok) cargar(); } catch { /* ignore */ }
  };
  const copiar = (texto, id) => { navigator.clipboard?.writeText(texto); setCopiado(id); setTimeout(() => setCopiado(null), 1500); };

  return (
    <div className="cd-tab-fade">
      <div className="cd-section-header">
        <div>
          <h2 className="cd-section-h">Jueces</h2>
          <p className="cd-section-sub">Cada juez entra con un enlace mágico + PIN (sin usuario ni contraseña). El correo puede repetirse.</p>
        </div>
      </div>

      <div className="cd-card cd-card--info mb-5">
        <div className="cd-card-body-lg">
          <form onSubmit={alta}>
            <div className="row g-3">
              <div className="col-md-3"><label className="cd-label">Nombre</label><input className="cd-input" required value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} /></div>
              <div className="col-md-3"><label className="cd-label">Apellidos</label><input className="cd-input" value={form.apellidos} onChange={e => setForm({ ...form, apellidos: e.target.value })} /></div>
              <div className="col-md-3"><label className="cd-label">Correo</label><input className="cd-input" type="email" value={form.correo} onChange={e => setForm({ ...form, correo: e.target.value })} /></div>
              <div className="col-md-3"><label className="cd-label">Teléfono</label><input className="cd-input" value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} /></div>
              <div className="col-12 text-end mt-2">
                <button type="submit" className="cd-btn cd-btn--info-solid" disabled={guardando}><i className="fas fa-user-plus"></i> {guardando ? 'Dando de alta...' : 'Dar de alta juez'}</button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {cargando ? (
        <div className="cd-empty"><AtletifyLoader /></div>
      ) : jueces.length === 0 ? (
        <div className="cd-empty"><i className="fas fa-user-shield"></i><p>Aún no hay jueces dados de alta.</p></div>
      ) : (
        <div className="row g-3">
          {jueces.map(j => (
            <div key={j.idJuezComp} className="col-md-6">
              <div className="cd-card" style={{ padding: '16px' }}>
                <div className="d-flex justify-content-between align-items-start">
                  <div>
                    <h5 style={{ margin: 0 }}>{j.nombre} {j.apellidos}</h5>
                    <small style={{ color: 'var(--text-muted)' }}>{j.correo || 'sin correo'}{j.telefono ? ' · ' + j.telefono : ''}</small>
                  </div>
                  <span className="cd-tipo-badge" style={{ fontSize: '0.7rem', opacity: j.activo ? 1 : 0.5 }}>{j.activo ? 'Activo' : 'Inactivo'}</span>
                </div>
                <div style={{ marginTop: '10px', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'monospace', fontSize: '0.82rem' }}>PIN: <strong>{j.pin}</strong></span>
                  <button className="cd-btn cd-btn--ghost" onClick={() => copiar(j.magicLink, j.idJuezComp)} title="Copiar enlace de acceso">
                    <i className="fas fa-link"></i> {copiado === j.idJuezComp ? '¡Copiado!' : 'Copiar enlace'}
                  </button>
                  <button className="cd-btn cd-btn--ghost" onClick={() => reenviar(j.idJuezComp)} title="Reenviar por correo"><i className="fas fa-paper-plane"></i> Reenviar</button>
                  <button className="cd-btn cd-btn--ghost" onClick={() => eliminar(j.idJuezComp)} title="Eliminar"><i className="fas fa-trash"></i></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
