import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import AtletifyLoader from './AtletifyLoader';

const API_BASE = import.meta.env.VITE_API_URL;

const fmtFechaHora = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

// Nombre a mostrar en el timeline: username primero (lo que pidió el usuario);
// si ese actor no tiene username, caemos a nombre completo para no dejarlo vacío.
const nombreLink = (ev) => {
  if (ev.username) return `@${ev.username}`;
  const completo = `${ev.nombre || ''} ${ev.apellidos || ''}`.trim();
  return completo || `Usuario #${ev.idUsuario}`;
};

// Modal secundario: datos básicos del usuario al pulsar su username en el historial.
function ModalUsuarioBasico({ usuario, onCerrar }) {
  const nombreCompleto = `${usuario.nombre || ''} ${usuario.apellidos || ''}`.trim();
  return createPortal(
    <div className="cw-det-overlay cw-det-overlay--top" onClick={onCerrar}>
      <div className="cw-det-modal cw-det-modal--user" onClick={(e) => e.stopPropagation()}>
        <button className="cw-det-close" onClick={onCerrar} aria-label="Cerrar">
          <i className="fas fa-times"></i>
        </button>

        <div className="cw-det-user-head">
          <div className="cw-det-user-avatar"><i className="fas fa-user"></i></div>
          <div className="cw-det-user-head-text">
            <p className="cw-det-user-username">@{usuario.username || 'sin-username'}</p>
            <p className="cw-det-user-fullname">{nombreCompleto || 'Sin nombre'}</p>
          </div>
        </div>

        <ul className="cw-det-user-list">
          <li><span><i className="fas fa-id-badge"></i> Username</span><strong>{usuario.username || '—'}</strong></li>
          <li><span><i className="fas fa-user"></i> Nombre</span><strong>{usuario.nombre || '—'}</strong></li>
          <li><span><i className="fas fa-user-tag"></i> Apellidos</span><strong>{usuario.apellidos || '—'}</strong></li>
          <li><span><i className="fas fa-phone"></i> Teléfono</span><strong>{usuario.telefono || '—'}</strong></li>
          <li><span><i className="fas fa-envelope"></i> Correo</span><strong>{usuario.correo || '—'}</strong></li>
        </ul>
      </div>
    </div>,
    document.body
  );
}

export default function ModalDetallesWod({ wod, onCerrar }) {
  const [eventos, setEventos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [usuarioVer, setUsuarioVer] = useState(null);

  useEffect(() => {
    let activo = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_BASE}/entrenamientos/${wod.idEntrenamiento}/historial`);
        if (!res.ok) throw new Error('No se pudo cargar el historial');
        const data = await res.json();
        if (activo) setEventos(Array.isArray(data) ? data : []);
      } catch (e) {
        if (activo) setError(e.message || 'Error al cargar el historial');
      } finally {
        if (activo) setLoading(false);
      }
    })();
    return () => { activo = false; };
  }, [wod.idEntrenamiento]);

  const meta = (accion) => accion === 'CREAR'
    ? { label: 'Creó el WOD', icon: 'fa-calendar-plus', cls: 'cw-det-dot--crear' }
    : { label: 'Editó el WOD', icon: 'fa-pen', cls: 'cw-det-dot--editar' };

  return createPortal(
    <div className="cw-det-overlay" onClick={onCerrar}>
      <div className="cw-det-modal" onClick={(e) => e.stopPropagation()}>
        <button className="cw-det-close" onClick={onCerrar} aria-label="Cerrar">
          <i className="fas fa-times"></i>
        </button>

        <div className="cw-det-header">
          <p className="cw-det-eyebrow"><i className="fas fa-clock-rotate-left"></i> Historial del WOD</p>
          <h3 className="cw-det-title">{wod.titulo}</h3>
        </div>

        <div className="cw-det-body">
          {loading ? (
            <div className="cw-det-loading"><AtletifyLoader /></div>
          ) : error ? (
            <div className="cw-det-empty">
              <i className="fas fa-triangle-exclamation"></i>
              <p>{error}</p>
            </div>
          ) : eventos.length === 0 ? (
            <div className="cw-det-empty">
              <i className="fas fa-clock-rotate-left"></i>
              <p>Aún no hay registros de historial para este WOD.</p>
            </div>
          ) : (
            <ul className="cw-det-timeline">
              {eventos.map((ev) => {
                const m = meta(ev.accion);
                return (
                  <li key={ev.idHistorial} className="cw-det-event">
                    <span className={`cw-det-dot ${m.cls}`}><i className={`fas ${m.icon}`}></i></span>
                    <div className="cw-det-event-body">
                      <p className="cw-det-event-action">{m.label}</p>
                      <p className="cw-det-event-meta">
                        Por{' '}
                        <button
                          type="button"
                          className="cw-det-user-link"
                          onClick={() => setUsuarioVer({
                            idUsuario: ev.idUsuario,
                            username: ev.username,
                            nombre: ev.nombre,
                            apellidos: ev.apellidos,
                            telefono: ev.telefono,
                            correo: ev.correo,
                          })}
                          title="Ver datos del usuario"
                        >
                          {nombreLink(ev)}
                        </button>
                      </p>
                      <p className="cw-det-event-date">
                        <i className="fas fa-clock"></i> {fmtFechaHora(ev.fechaHora)}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {usuarioVer && (
        <ModalUsuarioBasico usuario={usuarioVer} onCerrar={() => setUsuarioVer(null)} />
      )}
    </div>,
    document.body
  );
}
