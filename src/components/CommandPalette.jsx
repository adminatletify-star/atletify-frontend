// ============================================================================
//  COMMAND PALETTE — Buscador global tipo Spotlight / Cmd+K (panel admin)
// ============================================================================
//  Se monta UNA sola vez (en Layout). Se abre con Ctrl/Cmd+K o con el evento
//  global 'atletify:open-command-palette' (lo dispara la lupa del CardNav).
//  Búsqueda difusa con Fuse.js + normalización de acentos, navegación por
//  teclado, resaltado de coincidencias e historial de búsqueda por usuario.
// ============================================================================

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  getInterfacesParaRol,
  ROLES_CON_BUSCADOR,
} from '../config/adminBoxSearchCatalog';
import {
  construirIndice,
  buscar,
  rangosCoincidenciaTitulo,
  segmentarResaltado,
} from '../utils/fuzzySearch';
import { getRecientes, pushReciente, clearRecientes } from '../utils/searchHistory';
import '../assets/css/command-palette.css';

const OPEN_EVENT = 'atletify:open-command-palette';
const DEBOUNCE_MS = 150;

export default function CommandPalette() {
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const rol = usuario?.rol;
  const userId = usuario?.idUsuario || usuario?.id || usuario?.IdUsuario || usuario?.Id;
  const habilitado = ROLES_CON_BUSCADOR.includes(rol);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [recientes, setRecientes] = useState([]);

  const overlayRef = useRef(null);
  const dialogRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Índice Fuse memoizado por rol — no se reconstruye en cada tecla.
  const interfaces = useMemo(() => getInterfacesParaRol(rol), [rol]);
  const fuse = useMemo(() => construirIndice(interfaces), [interfaces]);

  // ── Apertura / cierre ──────────────────────────────────────────────
  const abrir = useCallback(() => {
    if (!habilitado) return;
    setRecientes(getRecientes(userId));
    setQuery('');
    setDebouncedQuery('');
    setActiveIndex(0);
    setOpen(true);
  }, [habilitado, userId]);

  const cerrar = useCallback(() => setOpen(false), []);

  // Atajo global Ctrl/Cmd+K + evento desde la lupa del navbar
  useEffect(() => {
    if (!habilitado) return undefined;

    const onKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setOpen((prev) => {
          if (prev) return false;
          // abrir: refrescar historial/estado
          setRecientes(getRecientes(userId));
          setQuery('');
          setDebouncedQuery('');
          setActiveIndex(0);
          return true;
        });
      }
    };
    const onOpenEvent = () => abrir();

    document.addEventListener('keydown', onKeyDown);
    window.addEventListener(OPEN_EVENT, onOpenEvent);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener(OPEN_EVENT, onOpenEvent);
    };
  }, [habilitado, userId, abrir]);

  // Debounce de la query (~150 ms)
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [query]);

  // Bloquear scroll del body mientras está abierto + foco al input
  useEffect(() => {
    if (!open) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const raf = requestAnimationFrame(() => inputRef.current?.focus());
    return () => {
      document.body.style.overflow = prevOverflow;
      cancelAnimationFrame(raf);
    };
  }, [open]);

  // ── Construcción de la vista (resultados | recientes | estados vacíos) ──
  const vista = useMemo(() => {
    const q = (debouncedQuery || '').trim();
    if (q.length >= 2) {
      const res = buscar(fuse, debouncedQuery);
      if (res.length === 0) return { modo: 'sin-resultados', items: [] };
      return {
        modo: 'resultados',
        items: res.map((r) => ({
          item: r.item,
          segments: segmentarResaltado(r.item.title, rangosCoincidenciaTitulo(r)),
        })),
      };
    }
    if (recientes.length > 0) {
      return {
        modo: 'recientes',
        items: recientes.map((r) => ({
          item: r,
          segments: [{ text: r.title, match: false }],
        })),
      };
    }
    return { modo: 'inicial', items: [] };
  }, [debouncedQuery, fuse, recientes]);

  const navegables = vista.items;

  // Mantener activeIndex dentro de rango cuando cambian los resultados
  useEffect(() => {
    setActiveIndex((i) => (navegables.length === 0 ? 0 : Math.min(i, navegables.length - 1)));
  }, [navegables.length]);

  // Asegurar que el ítem activo quede visible
  useEffect(() => {
    if (!open || navegables.length === 0) return;
    const el = listRef.current?.querySelector(`[data-idx="${activeIndex}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, open, navegables.length]);

  // ── Selección / navegación ─────────────────────────────────────────
  const seleccionar = useCallback(
    (item) => {
      if (!item?.path) return;
      const nuevo = pushReciente(userId, item, query);
      setRecientes(nuevo);
      cerrar();
      navigate(item.path);
    },
    [userId, query, cerrar, navigate],
  );

  const limpiarHistorial = useCallback(() => {
    clearRecientes(userId);
    setRecientes([]);
  }, [userId]);

  // ── Teclado dentro del modal ───────────────────────────────────────
  const onDialogKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      cerrar();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (navegables.length) setActiveIndex((i) => (i + 1) % navegables.length);
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (navegables.length) setActiveIndex((i) => (i - 1 + navegables.length) % navegables.length);
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const sel = navegables[activeIndex];
      if (sel) seleccionar(sel.item);
      return;
    }
    // Focus trap: mantener el foco dentro del diálogo con Tab
    if (e.key === 'Tab') {
      const foco = dialogRef.current?.querySelectorAll(
        'input, button, [href], [tabindex]:not([tabindex="-1"])',
      );
      if (!foco || foco.length === 0) return;
      const lista = Array.from(foco).filter((el) => !el.disabled && el.offsetParent !== null);
      if (lista.length === 0) return;
      const primero = lista[0];
      const ultimo = lista[lista.length - 1];
      if (e.shiftKey && document.activeElement === primero) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault();
        primero.focus();
      }
    }
  };

  if (!habilitado) return null;

  const listboxId = 'cmd-palette-listbox';

  const contenido = (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={overlayRef}
          className="cmdp-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onMouseDown={(e) => {
            // cerrar solo si el clic empezó en el backdrop, no dentro del panel
            if (e.target === overlayRef.current) cerrar();
          }}
        >
          <motion.div
            ref={dialogRef}
            className="cmdp-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Buscador de interfaces"
            initial={{ opacity: 0, y: -16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.98 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            onKeyDown={onDialogKeyDown}
          >
            {/* ── Input ── */}
            <div className="cmdp-search">
              <i className="fas fa-magnifying-glass cmdp-search-icon" aria-hidden="true" />
              <input
                ref={inputRef}
                type="text"
                className="cmdp-input"
                placeholder="Buscar interfaz… (ej. calendario, mensualidades, ventas)"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActiveIndex(0);
                }}
                role="combobox"
                aria-expanded={navegables.length > 0}
                aria-controls={listboxId}
                aria-activedescendant={
                  navegables.length ? `cmdp-opt-${activeIndex}` : undefined
                }
                aria-autocomplete="list"
                autoComplete="off"
                spellCheck="false"
              />
              <button
                type="button"
                className="cmdp-esc"
                onClick={cerrar}
                aria-label="Cerrar buscador"
              >
                Esc
              </button>
            </div>

            {/* ── Resultados ── */}
            <div className="cmdp-body">
              {(vista.modo === 'recientes') && (
                <div className="cmdp-section-head">
                  <span><i className="fas fa-clock-rotate-left" aria-hidden="true" /> Recientes</span>
                  <button type="button" className="cmdp-clear" onClick={limpiarHistorial}>
                    Limpiar
                  </button>
                </div>
              )}

              {(vista.modo === 'resultados' || vista.modo === 'recientes') && (
                <ul
                  ref={listRef}
                  className="cmdp-list"
                  id={listboxId}
                  role="listbox"
                  aria-label="Resultados"
                >
                  {navegables.map(({ item, segments }, idx) => (
                    <li key={item.id} role="presentation">
                      <button
                        type="button"
                        id={`cmdp-opt-${idx}`}
                        data-idx={idx}
                        role="option"
                        aria-selected={idx === activeIndex}
                        className={`cmdp-option${idx === activeIndex ? ' is-active' : ''}`}
                        onMouseMove={() => setActiveIndex(idx)}
                        onClick={() => seleccionar(item)}
                      >
                        <span className="cmdp-option-icon" aria-hidden="true">
                          <i className={`fas ${item.icon || 'fa-arrow-right'}`} />
                        </span>
                        <span className="cmdp-option-text">
                          <span className="cmdp-option-title">
                            {segments.map((seg, i) =>
                              seg.match ? (
                                <mark key={i} className="cmdp-mark">{seg.text}</mark>
                              ) : (
                                <span key={i}>{seg.text}</span>
                              ),
                            )}
                          </span>
                          {item.section && (
                            <span className="cmdp-option-section">{item.section}</span>
                          )}
                        </span>
                        <i className="fas fa-arrow-turn-down cmdp-option-enter" aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {vista.modo === 'inicial' && (
                <div className="cmdp-empty">
                  <i className="fas fa-keyboard cmdp-empty-icon" aria-hidden="true" />
                  <p className="cmdp-empty-title">Escribe para buscar…</p>
                  <p className="cmdp-empty-sub">
                    Encuentra cualquier interfaz del panel por su nombre o función.
                  </p>
                </div>
              )}

              {vista.modo === 'sin-resultados' && (
                <div className="cmdp-empty">
                  <i className="fas fa-magnifying-glass-minus cmdp-empty-icon" aria-hidden="true" />
                  <p className="cmdp-empty-title">Sin resultados</p>
                  <p className="cmdp-empty-sub">
                    No encontramos interfaces para “{debouncedQuery.trim()}”.
                  </p>
                </div>
              )}
            </div>

            {/* ── Pie con hints de teclado ── */}
            <div className="cmdp-footer">
              <span><kbd>↑</kbd><kbd>↓</kbd> navegar</span>
              <span><kbd>↵</kbd> abrir</span>
              <span><kbd>Esc</kbd> cerrar</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(contenido, document.body);
}
