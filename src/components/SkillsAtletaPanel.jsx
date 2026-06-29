import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

// Panel para que el atleta marque qué skills (movimientos avanzados) domina.
// Usa clases mp-* (MiPerfil.css) + skill-* para los chips.
export default function SkillsAtletaPanel({ idUsuario }) {
  const [disponibles, setDisponibles] = useState([]);
  const [seleccionadas, setSeleccionadas] = useState(() => new Set());
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [dirty, setDirty] = useState(false);

  const cargar = useCallback(async () => {
    if (!idUsuario) return;
    setLoading(true);
    try {
      const [disp, mias] = await Promise.all([
        api.obtenerSkillsDisponibles(),
        api.obtenerSkillsUsuario(idUsuario)
      ]);
      setDisponibles(Array.isArray(disp) ? disp : []);
      setSeleccionadas(new Set((mias || []).map(s => s.id)));
      setDirty(false);
    } catch (e) {
      console.error('Error cargando skills', e);
    } finally {
      setLoading(false);
    }
  }, [idUsuario]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch de datos
  useEffect(() => { cargar(); }, [cargar]);

  const toggle = (id) => {
    setSeleccionadas(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
    setDirty(true);
  };

  const guardar = async () => {
    setGuardando(true);
    try {
      await api.setSkillsUsuario(idUsuario, [...seleccionadas]);
      setDirty(false);
    } catch (e) {
      alert(e.message || 'No se pudieron guardar las skills.');
    } finally {
      setGuardando(false);
    }
  };

  // Si el box aún no tiene skills definidas en el diccionario, no mostramos nada.
  if (loading || disponibles.length === 0) return null;

  return (
    <div className="mp-card">
      <div className="mp-card-body-lg">
        <h5 className="mp-section-title mp-section-title--physical">
          <i className="fas fa-star"></i> Mis Skills
        </h5>
        <p className="mp-medical-note" style={{ border: 'none', background: 'none' }}>
          Marca los movimientos avanzados que ya dominas. Aparecen en tu perfil de comunidad.
        </p>
        <div className="skill-grid">
          {disponibles.map(s => {
            const on = seleccionadas.has(s.id);
            return (
              <label key={s.id} className={`skill-chip ${on ? 'skill-chip--on' : ''}`}>
                <input type="checkbox" checked={on} onChange={() => toggle(s.id)} style={{ display: 'none' }} />
                <i className={s.icono || 'fas fa-star'}></i>
                <span>{s.nombre}</span>
                {on && <i className="fas fa-check skill-chip-check"></i>}
              </label>
            );
          })}
        </div>
        {dirty && (
          <button className="mp-btn-save" style={{ marginTop: '1rem' }} onClick={guardar} disabled={guardando}>
            <i className="fas fa-save"></i> {guardando ? 'Guardando...' : 'Guardar skills'}
          </button>
        )}
      </div>
    </div>
  );
}
