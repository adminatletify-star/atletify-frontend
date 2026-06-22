import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import BackButton from '../components/BackButton';
import BotonSeguro from '../components/BotonSeguro';
import AtletifyLoader from '../components/AtletifyLoader';
import '../assets/css/GestionClases.css';
import '../assets/css/SugerenciasAtletas.css';

const API_BASE = import.meta.env.VITE_API_URL;
const PAGE_SIZE = 10;
const EMOJIS = ['🔥', '💪', '👏', '❤️', '👍'];
const CATEGORIAS = ['Técnica', 'Movilidad', 'Motivación', 'Nutrición', 'Asistencia'];

const normalizar = (s = '') =>
  s.toString().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

const token = () => localStorage.getItem('token');
const authHeaders = () => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${token()}` });

const ESTADOS = {
  Enviada: { label: 'Sin leer', clase: 'sca-badge--enviada', icono: 'fa-paper-plane' },
  Leida: { label: 'Leída', clase: 'sca-badge--leida', icono: 'fa-eye' },
  Respondida: { label: 'Respondida', clase: 'sca-badge--respondida', icono: 'fa-reply' },
};

const fechaCorta = (f) => {
  if (!f) return '';
  const d = new Date(f);
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }) + ' · ' +
    d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
};

// Números de página colapsados con "…" (igual que Ejercicios)
function buildPaginas(pagina, total) {
  return Array.from({ length: total }, (_, i) => i + 1)
    .filter(n => n === 1 || n === total || Math.abs(n - pagina) <= 1)
    .reduce((acc, n, i, arr) => {
      if (i > 0 && n - arr[i - 1] > 1) acc.push('...');
      acc.push(n);
      return acc;
    }, []);
}

export default function SugerenciasAtletas() {
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [atletas, setAtletas] = useState([]);
  const [enviadas, setEnviadas] = useState([]);

  // Composición
  const [idAtleta, setIdAtleta] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [categoria, setCategoria] = useState('');
  const [modalAtleta, setModalAtleta] = useState(false);

  // Edición (modal)
  const [editar, setEditar] = useState(null); // { id, mensaje, categoria }

  // Lista
  const [buscar, setBuscar] = useState('');
  const [pagina, setPagina] = useState(1);
  const [ayudaOpen, setAyudaOpen] = useState(false);

  const destacada = location.state?.destacada || null;
  const refsCards = useRef({});

  const cargar = async () => {
    try {
      const [rA, rE] = await Promise.all([
        fetch(`${API_BASE}/api/sugerencias-coach/atletas`, { headers: authHeaders() }),
        fetch(`${API_BASE}/api/sugerencias-coach/enviadas`, { headers: authHeaders() }),
      ]);
      if (rA.ok) setAtletas(await rA.json());
      if (rE.ok) setEnviadas(await rE.json());
    } catch (e) {
      console.error('Error al cargar sugerencias:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); /* eslint-disable-next-line */ }, []);

  // Resaltar y hacer scroll a la sugerencia abierta desde la campanita
  useEffect(() => {
    if (!destacada || loading) return;
    const el = refsCards.current[destacada];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('sca-card--flash');
      setTimeout(() => el.classList.remove('sca-card--flash'), 1800);
    }
  }, [destacada, loading, enviadas]);

  const atletaSel = useMemo(
    () => atletas.find(a => String(a.idUsuario) === String(idAtleta)) || null,
    [atletas, idAtleta]
  );

  const enviar = async () => {
    if (!idAtleta) { window.alert('Elige un atleta primero.'); return; }
    if (!mensaje.trim()) { window.alert('Escribe la sugerencia.'); return; }
    try {
      const res = await fetch(`${API_BASE}/api/sugerencias-coach`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ idAtleta: Number(idAtleta), mensaje: mensaje.trim(), categoria: categoria || null }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { window.alert(data.mensaje || 'No se pudo enviar.'); return; }
      window.alert('Sugerencia enviada con éxito.');
      setMensaje(''); setCategoria(''); setIdAtleta('');
      cargar();
    } catch (e) {
      window.alert('Error de conexión al enviar.');
    }
  };

  const guardarEdicion = async () => {
    if (!editar?.mensaje.trim()) { window.alert('El mensaje no puede quedar vacío.'); return; }
    try {
      const res = await fetch(`${API_BASE}/api/sugerencias-coach/${editar.id}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ idAtleta: 0, mensaje: editar.mensaje.trim(), categoria: editar.categoria || null }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { window.alert(data.mensaje || 'No se pudo editar.'); return; }
      window.alert('Sugerencia actualizada.');
      setEditar(null);
      cargar();
    } catch (e) {
      window.alert('Error de conexión al editar.');
    }
  };

  const borrar = async (s) => {
    const ok = await window.wpConfirm(`¿Eliminar esta sugerencia para ${s.otroNombre}? El atleta aún no la ha visto.`);
    if (!ok) return;
    // Optimista
    setEnviadas(prev => prev.filter(x => x.idSugerenciaCoach !== s.idSugerenciaCoach));
    try {
      const res = await fetch(`${API_BASE}/api/sugerencias-coach/${s.idSugerenciaCoach}`, {
        method: 'DELETE', headers: authHeaders(),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); window.alert(d.mensaje || 'No se pudo borrar.'); cargar(); }
    } catch (e) { window.alert('Error de conexión al borrar.'); cargar(); }
  };

  // El coach reacciona a la RESPUESTA del atleta (Objetivo="Respuesta"). Optimista + revert.
  const reaccionarRespuesta = async (s, emoji) => {
    const miId = s.idCoach;
    const actual = s.reaccionRespuesta;
    const quita = actual && actual.idUsuario === miId && actual.emoji === emoji;
    const nueva = quita ? null : { emoji, idUsuario: miId };
    setEnviadas(prev => prev.map(x =>
      x.idSugerenciaCoach === s.idSugerenciaCoach ? { ...x, reaccionRespuesta: nueva } : x));
    try {
      const res = await fetch(`${API_BASE}/api/sugerencias-coach/${s.idSugerenciaCoach}/reaccionar`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({ emoji, objetivo: 'Respuesta' }),
      });
      if (!res.ok) throw new Error();
    } catch (e) {
      // Revertir
      setEnviadas(prev => prev.map(x =>
        x.idSugerenciaCoach === s.idSugerenciaCoach ? { ...x, reaccionRespuesta: actual } : x));
    }
  };

  // Filtro + paginación
  const filtradas = useMemo(() => {
    const tokens = normalizar(buscar).split(/\s+/).filter(Boolean);
    if (!tokens.length) return enviadas;
    return enviadas.filter(s => {
      const hay = normalizar(`${s.otroNombre} ${s.otroApodo || ''} ${s.otroCorreo || ''} ${s.mensaje} ${s.categoria || ''} ${s.respuesta || ''}`);
      return tokens.every(t => hay.includes(t));
    });
  }, [enviadas, buscar]);

  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / PAGE_SIZE));
  const paginaSegura = Math.min(pagina, totalPaginas);
  const itemsPagina = filtradas.slice((paginaSegura - 1) * PAGE_SIZE, paginaSegura * PAGE_SIZE);

  useEffect(() => { setPagina(1); }, [buscar]);

  if (loading) {
    return <div className="gc-page sca-loading-wrap"><AtletifyLoader /></div>;
  }

  return (
    <div className="gc-page">
      <header className="gc-header">
        <div className="d-flex align-items-center gap-3">
          <BackButton />
          <h1 className="gc-header-title">Sugerencias a <span>Atletas</span></h1>
          <button type="button" className="sca-help-btn ms-auto" onClick={() => setAyudaOpen(true)} aria-label="Ayuda">
            <i className="fas fa-question"></i>
          </button>
        </div>
      </header>

      <div className="container-xl px-3 px-md-4">
        {/* COMPOSICIÓN */}
        <section className="sca-compose">
          <h2 className="sca-compose-title"><i className="fas fa-lightbulb"></i> Nueva sugerencia</h2>

          <button type="button" className="sca-atleta-picker" onClick={() => setModalAtleta(true)}>
            <i className="fas fa-user sca-atleta-picker-icon"></i>
            <span className={`sca-atleta-picker-text ${atletaSel ? 'sca-atleta-picker-text--activo' : ''}`}>
              {atletaSel ? `${atletaSel.nombre} ${atletaSel.apellidos || ''}`.trim() : '— Elige un atleta —'}
            </span>
            <i className="fas fa-chevron-down sca-atleta-picker-arrow"></i>
          </button>

          <textarea
            className="sca-textarea"
            placeholder="Ej: Mejora la profundidad en tus sentadillas. ¡Vas muy bien!"
            value={mensaje}
            maxLength={500}
            onChange={e => setMensaje(e.target.value)}
            rows={3}
          />

          <div className="sca-cat-row">
            <span className="sca-cat-label">Tema (opcional):</span>
            <div className="sca-cat-chips">
              {CATEGORIAS.map(c => (
                <button
                  key={c}
                  type="button"
                  className={`sca-cat-chip ${categoria === c ? 'sca-cat-chip--activo' : ''}`}
                  onClick={() => setCategoria(categoria === c ? '' : c)}
                >{c}</button>
              ))}
            </div>
          </div>

          <BotonSeguro
            onClick={enviar}
            className="sca-btn-primary"
            textoProcesando="Enviando..."
            disabled={!idAtleta || !mensaje.trim()}
          >
            <i className="fas fa-paper-plane me-2"></i>Enviar sugerencia
          </BotonSeguro>
        </section>

        {/* LISTA DE ENVIADAS */}
        <section className="sca-lista">
          <div className="sca-lista-head">
            <h2 className="sca-section-title"><i className="fas fa-inbox"></i> Enviadas</h2>
            <div className="sca-search">
              <i className="fas fa-search sca-search-icon"></i>
              <input
                type="text"
                className="sca-search-input"
                placeholder="Buscar por nombre, correo o texto..."
                value={buscar}
                onChange={e => setBuscar(e.target.value)}
              />
            </div>
          </div>

          {filtradas.length === 0 ? (
            <div className="sca-empty">
              <i className="fas fa-comment-dots"></i>
              <p>{buscar ? `Sin resultados para "${buscar}"` : 'Aún no has enviado sugerencias. Escribe la primera arriba.'}</p>
            </div>
          ) : (
            <>
              <div className="sca-resumen">
                Mostrando {(paginaSegura - 1) * PAGE_SIZE + 1}–{Math.min(paginaSegura * PAGE_SIZE, filtradas.length)} de {filtradas.length}
              </div>

              <div className="sca-cards">
                {itemsPagina.map(s => {
                  const est = ESTADOS[s.estatus] || ESTADOS.Enviada;
                  const editable = s.estatus === 'Enviada';
                  const miReacc = s.reaccionRespuesta && s.reaccionRespuesta.idUsuario === s.idCoach
                    ? s.reaccionRespuesta.emoji : null;
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
                            : <div className="sca-avatar sca-avatar--ph"><i className="fas fa-user"></i></div>}
                          <div className="sca-atleta-info">
                            <span className="sca-atleta-nombre">{s.otroNombre || s.otroApodo}</span>
                            {s.otroCorreo && <span className="sca-atleta-correo">{s.otroCorreo}</span>}
                            <span className="sca-fecha">{fechaCorta(s.fechaCreacion)}</span>
                          </div>
                        </div>
                        <span className={`sca-badge ${est.clase}`}><i className={`fas ${est.icono}`}></i>{est.label}</span>
                      </div>

                      {s.categoria && <span className="sca-cat-tag">{s.categoria}</span>}

                      <div className="sca-burbuja sca-burbuja--coach">
                        <p className="sca-msg">{s.mensaje}</p>
                        {s.reaccionMensaje && (
                          <span className="sca-reacc-tag" title="Reacción del atleta">{s.reaccionMensaje.emoji}</span>
                        )}
                      </div>

                      {/* Acciones de edición SOLO mientras el atleta no la haya visto */}
                      {editable && (
                        <div className="sca-acciones">
                          <button type="button" className="sca-icon-btn sca-icon-btn--edit"
                            onClick={() => setEditar({ id: s.idSugerenciaCoach, mensaje: s.mensaje, categoria: s.categoria || '' })}
                            title="Editar">
                            <i className="fas fa-pen"></i>
                          </button>
                          <BotonSeguro
                            onClick={() => borrar(s)}
                            className="sca-icon-btn sca-icon-btn--del"
                            tiempoBloqueo={400}
                            textoProcesando=""
                            title="Eliminar"
                          >
                            <i className="fas fa-trash"></i>
                          </BotonSeguro>
                        </div>
                      )}

                      {/* Respuesta del atleta + reacción del coach */}
                      {s.respuesta && (
                        <div className="sca-respuesta">
                          <div className="sca-burbuja sca-burbuja--atleta">
                            <span className="sca-resp-label">
                              <i className="fas fa-reply"></i> Respuesta de {s.otroNombre || s.otroApodo}
                              {s.fechaRespuesta && <span className="sca-resp-fecha"> · {fechaCorta(s.fechaRespuesta)}</span>}
                            </span>
                            <p className="sca-msg">{s.respuesta}</p>
                          </div>
                          <div className="sca-reacc-picker">
                            {EMOJIS.map(e => (
                              <button
                                key={e}
                                type="button"
                                className={`sca-reacc-btn ${miReacc === e ? 'sca-reacc-btn--activo' : ''}`}
                                onClick={() => reaccionarRespuesta(s, e)}
                              >{e}</button>
                            ))}
                          </div>
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
        </section>
      </div>

      {/* MODAL: selección de atleta con buscador */}
      {modalAtleta && (
        <ModalSeleccionAtleta
          atletas={atletas}
          seleccionadoId={idAtleta}
          onSeleccionar={(id) => { setIdAtleta(id); setModalAtleta(false); }}
          onCerrar={() => setModalAtleta(false)}
        />
      )}

      {/* MODAL: editar sugerencia */}
      {editar && createPortal(
        <div className="sca-modal-overlay" onClick={() => setEditar(null)}>
          <div className="sca-modal" onClick={e => e.stopPropagation()}>
            <div className="sca-modal-header">
              <h2>Editar sugerencia</h2>
              <button type="button" className="sca-modal-close" onClick={() => setEditar(null)}><i className="fas fa-times"></i></button>
            </div>
            <div className="sca-modal-body">
              <textarea
                className="sca-textarea"
                value={editar.mensaje}
                maxLength={500}
                rows={3}
                onChange={e => setEditar(prev => ({ ...prev, mensaje: e.target.value }))}
              />
              <div className="sca-cat-row">
                <span className="sca-cat-label">Tema (opcional):</span>
                <div className="sca-cat-chips">
                  {CATEGORIAS.map(c => (
                    <button key={c} type="button"
                      className={`sca-cat-chip ${editar.categoria === c ? 'sca-cat-chip--activo' : ''}`}
                      onClick={() => setEditar(prev => ({ ...prev, categoria: prev.categoria === c ? '' : c }))}
                    >{c}</button>
                  ))}
                </div>
              </div>
            </div>
            <div className="sca-modal-footer">
              <button type="button" className="sca-btn-ghost" onClick={() => setEditar(null)}>Cancelar</button>
              <BotonSeguro onClick={guardarEdicion} className="sca-btn-primary" textoProcesando="Guardando..." disabled={!editar.mensaje.trim()}>
                Guardar cambios
              </BotonSeguro>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL: ayuda */}
      {ayudaOpen && createPortal(
        <div className="sca-modal-overlay" onClick={() => setAyudaOpen(false)}>
          <div className="sca-modal" onClick={e => e.stopPropagation()}>
            <div className="sca-modal-header">
              <h2>¿Cómo funcionan las sugerencias?</h2>
              <button type="button" className="sca-modal-close" onClick={() => setAyudaOpen(false)}><i className="fas fa-times"></i></button>
            </div>
            <div className="sca-modal-body sca-ayuda">
              <p><i className="fas fa-paper-plane"></i> <strong>Envías</strong> una sugerencia breve a un atleta de tu box (ej: "mejora tus movimientos", "vas muy bien").</p>
              <p><i className="fas fa-pen"></i> <strong>Puedes corregirla o borrarla</strong> solo mientras el atleta no la haya visto. En cuanto la abre, queda fija.</p>
              <p><i className="fas fa-reply"></i> El atleta puede <strong>responder una sola vez</strong>. Es una ida y una vuelta.</p>
              <p><i className="fas fa-heart"></i> Ambos pueden <strong>reaccionar</strong> al mensaje del otro con un emoji.</p>
              <p><i className="fas fa-bell"></i> Cuando el atleta responde o reacciona, te llega un <strong>aviso en la campanita</strong>.</p>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

// ── Modal selector de atleta con buscador (createPortal) ──
function ModalSeleccionAtleta({ atletas, seleccionadoId, onSeleccionar, onCerrar }) {
  const [buscar, setBuscar] = useState('');
  const filtrados = useMemo(() => {
    const tokens = normalizar(buscar).split(/\s+/).filter(Boolean);
    if (!tokens.length) return atletas;
    return atletas.filter(a => {
      const hay = normalizar(`${a.nombre} ${a.apellidos || ''} ${a.apodo || ''} ${a.correo || ''}`);
      return tokens.every(t => hay.includes(t));
    });
  }, [atletas, buscar]);

  return createPortal(
    <div className="sca-modal-overlay" onClick={onCerrar}>
      <div className="sca-modal" onClick={e => e.stopPropagation()}>
        <div className="sca-modal-header">
          <h2>Selecciona un atleta</h2>
          <button type="button" className="sca-modal-close" onClick={onCerrar}><i className="fas fa-times"></i></button>
        </div>
        <div className="sca-modal-search">
          <i className="fas fa-search"></i>
          <input type="text" placeholder="Buscar por nombre o correo..." value={buscar} onChange={e => setBuscar(e.target.value)} autoFocus />
        </div>
        <div className="sca-modal-list">
          {filtrados.length === 0 ? (
            <div className="sca-empty sca-empty--sm"><i className="fas fa-search"></i><p>Sin resultados</p></div>
          ) : filtrados.map(a => {
            const activo = String(seleccionadoId) === String(a.idUsuario);
            const nom = `${a.nombre} ${a.apellidos || ''}`.trim();
            return (
              <button key={a.idUsuario} type="button"
                className={`sca-opt ${activo ? 'sca-opt--activa' : ''}`}
                onClick={() => onSeleccionar(a.idUsuario)}>
                {a.foto
                  ? <img src={a.foto} alt="" className="sca-avatar sca-avatar--sm" />
                  : <div className="sca-avatar sca-avatar--sm sca-avatar--ph"><i className="fas fa-user"></i></div>}
                <div className="sca-opt-info">
                  <span className="sca-opt-nombre">{nom}</span>
                  {a.correo && <span className="sca-opt-correo">{a.correo}</span>}
                </div>
                {activo && <i className="fas fa-check sca-opt-check"></i>}
              </button>
            );
          })}
        </div>
      </div>
    </div>,
    document.body
  );
}
