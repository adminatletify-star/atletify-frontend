import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import BackButton from '../components/BackButton';
import BotonSeguro from '../components/BotonSeguro';
import AtletifyLoader from '../components/AtletifyLoader';
import '../assets/css/GestionClases.css';
import '../assets/css/SugerenciasAtletas.css';

const API_BASE = import.meta.env.VITE_API_URL;
const PAGE_SIZE = 10;
const EMOJIS = ['🔥', '💪', '👏', '❤️', '👍'];

const token = () => localStorage.getItem('token');
const authHeaders = () => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${token()}` });

const fechaCorta = (f) => {
  if (!f) return '';
  const d = new Date(f);
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }) + ' · ' +
    d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
};

function buildPaginas(pagina, total) {
  return Array.from({ length: total }, (_, i) => i + 1)
    .filter(n => n === 1 || n === total || Math.abs(n - pagina) <= 1)
    .reduce((acc, n, i, arr) => {
      if (i > 0 && n - arr[i - 1] > 1) acc.push('...');
      acc.push(n);
      return acc;
    }, []);
}

export default function MisSugerencias() {
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [sugerencias, setSugerencias] = useState([]);
  const [respuestas, setRespuestas] = useState({}); // { [id]: textoBorrador }
  const [pagina, setPagina] = useState(1);

  const miId = useRef(null);
  const destacada = location.state?.destacada || null;
  const refsCards = useRef({});
  const yaMarque = useRef(false);

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem('usuario') || localStorage.getItem('user') || '{}');
      miId.current = u.idUsuario || u.id || u.IdUsuario || null;
    } catch { /* noop */ }
    cargar();
    /* eslint-disable-next-line */
  }, []);

  const cargar = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/sugerencias-coach/mias`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setSugerencias(data);
        marcarVistasUnaVez(data);
      }
    } catch (e) {
      console.error('Error al cargar sugerencias:', e);
    } finally {
      setLoading(false);
    }
  };

  // Al entrar (una sola vez), marcar como leídas las que aún están "Enviada".
  const marcarVistasUnaVez = (data) => {
    if (yaMarque.current) return;
    yaMarque.current = true;
    const pendientes = data.filter(s => s.estatus === 'Enviada');
    if (pendientes.length === 0) return;
    // Optimista local
    setSugerencias(prev => prev.map(s => s.estatus === 'Enviada' ? { ...s, estatus: 'Leida' } : s));
    pendientes.forEach(s => {
      fetch(`${API_BASE}/api/sugerencias-coach/${s.idSugerenciaCoach}/leer`, {
        method: 'PUT', headers: authHeaders(),
      }).catch(() => { /* best-effort */ });
    });
  };

  useEffect(() => {
    if (!destacada || loading) return;
    const el = refsCards.current[destacada];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('sca-card--flash');
      setTimeout(() => el.classList.remove('sca-card--flash'), 1800);
    }
  }, [destacada, loading, sugerencias]);

  const responder = async (s) => {
    const texto = (respuestas[s.idSugerenciaCoach] || '').trim();
    if (!texto) { window.alert('Escribe tu respuesta.'); return; }
    // Optimista
    const prev = sugerencias;
    setSugerencias(p => p.map(x => x.idSugerenciaCoach === s.idSugerenciaCoach
      ? { ...x, respuesta: texto, estatus: 'Respondida' } : x));
    setRespuestas(p => ({ ...p, [s.idSugerenciaCoach]: '' }));
    try {
      const res = await fetch(`${API_BASE}/api/sugerencias-coach/${s.idSugerenciaCoach}/responder`, {
        method: 'POST', headers: authHeaders(), body: JSON.stringify({ respuesta: texto }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        window.alert(d.mensaje || 'No se pudo enviar la respuesta.');
        setSugerencias(prev); // revertir
      }
    } catch (e) {
      window.alert('Error de conexión.');
      setSugerencias(prev);
    }
  };

  // El atleta reacciona al MENSAJE del administrador (Objetivo="Sugerencia"). Optimista + revert.
  // Solo el atleta puede reaccionar al mensaje, así que la reacción siempre es suya.
  const reaccionarMensaje = async (s, emoji) => {
    const yo = miId.current;
    const actual = s.reaccionMensaje;
    const quita = actual && actual.emoji === emoji;
    const nueva = quita ? null : { emoji, idUsuario: yo };
    setSugerencias(prev => prev.map(x =>
      x.idSugerenciaCoach === s.idSugerenciaCoach ? { ...x, reaccionMensaje: nueva } : x));
    try {
      const res = await fetch(`${API_BASE}/api/sugerencias-coach/${s.idSugerenciaCoach}/reaccionar`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({ emoji, objetivo: 'Sugerencia' }),
      });
      if (!res.ok) throw new Error();
    } catch (e) {
      setSugerencias(prev => prev.map(x =>
        x.idSugerenciaCoach === s.idSugerenciaCoach ? { ...x, reaccionMensaje: actual } : x));
    }
  };

  const totalPaginas = Math.max(1, Math.ceil(sugerencias.length / PAGE_SIZE));
  const paginaSegura = Math.min(pagina, totalPaginas);
  const itemsPagina = sugerencias.slice((paginaSegura - 1) * PAGE_SIZE, paginaSegura * PAGE_SIZE);

  if (loading) {
    return <div className="gc-page sca-loading-wrap"><AtletifyLoader /></div>;
  }

  return (
    <div className="gc-page">
      <header className="gc-header">
        <div className="d-flex align-items-center gap-3">
          <BackButton />
          <h1 className="gc-header-title">Sugerencias del <span>Administrador</span></h1>
        </div>
      </header>

      <div className="container-xl px-3 px-md-4">
        {sugerencias.length === 0 ? (
          <div className="sca-empty">
            <i className="fas fa-comment-dots"></i>
            <p>Aún no tienes sugerencias. Cuando tu administrador del box te envíe una, aparecerá aquí.</p>
          </div>
        ) : (
          <>
            <div className="sca-resumen">
              Mostrando {(paginaSegura - 1) * PAGE_SIZE + 1}–{Math.min(paginaSegura * PAGE_SIZE, sugerencias.length)} de {sugerencias.length}
            </div>

            <div className="sca-cards">
              {itemsPagina.map(s => {
                const miReacc = s.reaccionMensaje ? s.reaccionMensaje.emoji : null;
                const yaRespondio = !!s.respuesta;
                return (
                  <article
                    key={s.idSugerenciaCoach}
                    className="sca-card"
                    ref={el => { if (el) refsCards.current[s.idSugerenciaCoach] = el; }}
                  >
                    <div className="sca-card-top">
                      <div className="sca-atleta">
                        {s.otroFoto
                          ? <img src={s.otroFoto} alt="" className="sca-avatar" />
                          : <div className="sca-avatar sca-avatar--ph"><i className="fas fa-user-shield"></i></div>}
                        <div className="sca-atleta-info">
                          <span className="sca-atleta-nombre">{s.otroNombre}</span>
                          <span className="sca-fecha">{fechaCorta(s.fechaCreacion)}</span>
                        </div>
                      </div>
                      {s.categoria && <span className="sca-cat-tag" style={{ marginTop: 0 }}>{s.categoria}</span>}
                    </div>

                    {/* Mensaje del administrador + mi reacción */}
                    <div className="sca-burbuja sca-burbuja--coach">
                      <p className="sca-msg">{s.mensaje}</p>
                    </div>
                    <div className="sca-reacc-picker">
                      {EMOJIS.map(e => (
                        <button
                          key={e}
                          type="button"
                          className={`sca-reacc-btn ${miReacc === e ? 'sca-reacc-btn--activo' : ''}`}
                          onClick={() => reaccionarMensaje(s, e)}
                        >{e}</button>
                      ))}
                    </div>

                    {/* Respuesta: una sola vez */}
                    {yaRespondio ? (
                      <div className="sca-respuesta">
                        <div className="sca-burbuja sca-burbuja--atleta">
                          <span className="sca-resp-label">
                            <i className="fas fa-reply"></i> Tu respuesta
                            {s.fechaRespuesta && <span className="sca-resp-fecha"> · {fechaCorta(s.fechaRespuesta)}</span>}
                          </span>
                          <p className="sca-msg">{s.respuesta}</p>
                          {s.reaccionRespuesta && (
                            <span className="sca-reacc-tag" title="Reacción de tu administrador">{s.reaccionRespuesta.emoji}</span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="sca-reply-form">
                        <textarea
                          className="sca-textarea"
                          placeholder="Responde una vez a tu administrador..."
                          maxLength={500}
                          rows={2}
                          value={respuestas[s.idSugerenciaCoach] || ''}
                          onChange={e => setRespuestas(p => ({ ...p, [s.idSugerenciaCoach]: e.target.value }))}
                        />
                        <BotonSeguro
                          onClick={() => responder(s)}
                          className="sca-btn-primary"
                          textoProcesando="Enviando..."
                          tiempoBloqueo={1200}
                          disabled={!(respuestas[s.idSugerenciaCoach] || '').trim()}
                        >
                          <i className="fas fa-reply me-2"></i>Responder
                        </BotonSeguro>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>

            {totalPaginas > 1 && (
              <div className="sca-pag">
                <button className="sca-pag-arrow" disabled={paginaSegura === 1}
                  onClick={() => setPagina(p => Math.max(1, p - 1))}>‹</button>
                {buildPaginas(paginaSegura, totalPaginas).map((n, i) =>
                  n === '...'
                    ? <span key={`e${i}`} className="sca-pag-ellipsis">…</span>
                    : <button key={n}
                        className={`sca-pag-num ${n === paginaSegura ? 'sca-pag-num--activo' : ''}`}
                        onClick={() => setPagina(n)}>{n}</button>
                )}
                <button className="sca-pag-arrow" disabled={paginaSegura === totalPaginas}
                  onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}>›</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
