import { useState } from 'react';
import { createPortal } from 'react-dom';
import { ESTADOS } from './EstadoDelDiaPicker';
import './ModalEstadoDelDia.css';

const API_BASE = `${import.meta.env.VITE_API_URL}/api`;

/**
 * Modal diario "Estado de Hoy" que aparece una vez al día en el UserPanel.
 * Solo cierra (y marca el día como visto en el padre) si el guardado se confirma;
 * si la red falla, avisa y se queda abierto para reintentar (no quema el gate diario).
 * Cerrar sin elegir (X o backdrop) sí cuenta como "ya visto hoy" (lo gestiona el padre).
 *
 * Props:
 *  - idUsuario    id del atleta
 *  - valorActual  estado actual (para resaltar el seleccionado)
 *  - onCerrar     (valorElegido | null) => void  — solo se llama tras guardar OK, o al saltar
 */
export default function ModalEstadoDelDia({ idUsuario, valorActual = '', onCerrar }) {
  const [guardando, setGuardando] = useState(false);

  const seleccionar = async (valor) => {
    if (guardando) return; // anti doble-tap mientras viaja la petición
    setGuardando(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/usuarios/${idUsuario}/estado-del-dia`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ estadoDelDia: valor }),
      });
      if (!res.ok) throw new Error('estado');
      // Reflejar en localStorage para que el resto de la app lo lea al instante.
      try {
        const u = JSON.parse(localStorage.getItem('usuario'));
        if (u) { u.estadoDelDia = valor; localStorage.setItem('usuario', JSON.stringify(u)); }
      } catch { /* ignore */ }
      onCerrar(valor); // éxito → cierra y marca el día como visto
    } catch {
      setGuardando(false); // permite reintentar; NO se consume el día ni se cierra
      alert('No se pudo guardar tu estado de hoy. Inténtalo más tarde.');
    }
  };

  return createPortal(
    <div className="med-overlay" onClick={() => { if (!guardando) onCerrar(null); }}>
      <div className="med-panel" onClick={e => e.stopPropagation()}>
        <div className="med-header">
          <span className="med-title"><i className="fas fa-theater-masks" /> Estado de Hoy</span>
          <button type="button" className="med-close" onClick={() => onCerrar(null)} disabled={guardando} aria-label="Cerrar">
            <i className="fas fa-times" />
          </button>
        </div>

        <p className="med-sub">¿Cómo amaneciste hoy? Tu estado se verá en la comunidad y el ranking.</p>

        <div className={`med-grid${guardando ? ' med-grid--guardando' : ''}`}>
          {ESTADOS.map(e => (
            <button
              key={e.valor}
              type="button"
              className={`med-item${e.valor === valorActual ? ' med-item--activo' : ''}`}
              onClick={() => seleccionar(e.valor)}
              disabled={guardando}
            >
              <span className="med-item-emoji">{e.emoji}</span>
              <span className="med-item-nombre">{e.nombre}</span>
              <span className="med-item-desc">{e.desc}</span>
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
}
