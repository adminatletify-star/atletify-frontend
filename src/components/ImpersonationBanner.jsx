import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

// F3 / SLICE 2 — Barra fija visible durante una sesión de impersonación (solo lectura).
// Muestra un contador con el tiempo restante y un botón Salir. Al llegar a 0, restaura
// automáticamente la sesión del Developer.
export default function ImpersonationBanner() {
  const { impersonacion, salirImpersonacion } = useAuth();
  const [restante, setRestante] = useState(0);

  useEffect(() => {
    if (!impersonacion?.exp) return;
    const tick = () => {
      const seg = Math.max(0, Math.floor(impersonacion.exp - Date.now() / 1000));
      setRestante(seg);
      if (seg <= 0) salirImpersonacion();
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
    // salirImpersonacion lee localStorage, no necesita estar en deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [impersonacion?.exp]);

  if (!impersonacion) return null;

  const mm = String(Math.floor(restante / 60)).padStart(2, '0');
  const ss = String(restante % 60).padStart(2, '0');

  return (
    <div
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 99999,
        background: '#E63946', color: '#fff', padding: '8px 14px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 14, flexWrap: 'wrap', fontSize: 14, fontWeight: 600,
        boxShadow: '0 2px 10px rgba(0,0,0,.35)',
      }}
      role="alert"
    >
      <i className="fas fa-user-secret"></i>
      <span>Modo impersonación (solo lectura) — sesión iniciada por {impersonacion.actorNombre}.</span>
      <span style={{ fontVariantNumeric: 'tabular-nums', opacity: 0.9 }}>{mm}:{ss}</span>
      <button
        type="button"
        onClick={salirImpersonacion}
        style={{
          background: '#fff', color: '#E63946', border: 'none', borderRadius: 6,
          padding: '4px 14px', fontWeight: 700, cursor: 'pointer',
        }}
      >
        Salir
      </button>
    </div>
  );
}
