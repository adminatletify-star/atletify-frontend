import { useState } from 'react';
import { createPortal } from 'react-dom';
import './HorarioClasePicker.css';

const NIVEL_RANK = { 'Novato': 1, 'Principiante': 2, 'Intermedio': 3, 'RX': 4 };

const DIAS_MAP = { L: 'Lun', M: 'Mar', X: 'Mié', J: 'Jue', V: 'Vie', S: 'Sáb', D: 'Dom' };
const DIAS_ORDER = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

function parseDias(diasStr) {
  if (!diasStr) return [];
  return diasStr.split(',').map(d => d.trim()).filter(d => DIAS_MAP[d]);
}

const NIVEL_INFO = {
  'Todos':        { color: '#A8B2D1', emoji: '📊', label: 'Todos' },
  'Novato':       { color: '#adb5bd', emoji: '🐣', label: 'Novato' },
  'Principiante': { color: '#2ECC71', emoji: '🏃', label: 'Principiante' },
  'Intermedio':   { color: '#4FC3F7', emoji: '💪', label: 'Intermedio' },
  'RX':           { color: '#F5A623', emoji: '🔥', label: 'RX' },
};

function esAccesible(clase, categoriaUsuario) {
  const np = clase.nivelesPermitidos;
  if (!np || np === 'Todos') return true;
  if (!categoriaUsuario) return true;
  const rankClase   = NIVEL_RANK[np] || 0;
  const rankUsuario = NIVEL_RANK[categoriaUsuario] || 0;
  return rankClase <= rankUsuario;
}

export default function HorarioClasePicker({ clases, valor, onCambiar, categoriaUsuario }) {
  const [abierto, setAbierto] = useState(false);
  const claseActual = clases.find(c => String(c.idClase) === String(valor));

  const seleccionar = (v) => {
    setAbierto(false);
    if (String(v) !== String(valor)) onCambiar(v);
  };

  const clasesFiltradas = categoriaUsuario
    ? clases.filter(c => esAccesible(c, categoriaUsuario))
    : clases;

  return (
    <>
      <button
        type="button"
        className={`hcp-trigger${!valor ? ' hcp-trigger--vacio' : ''}`}
        onClick={() => setAbierto(true)}
      >
        <span className="hcp-trigger-left">
          <i className="fas fa-clock"></i>
          {claseActual
            ? <>
                <span className="hcp-hora-badge">
                  {claseActual.horarioInicio?.substring(0, 5)}
                </span>
                {claseActual.nombre}
                {parseDias(claseActual.diasRecurrentes).map(d => (
                  <span key={d} className="hcp-dia-pip hcp-dia-pip--active">{DIAS_MAP[d]}</span>
                ))}
              </>
            : 'Horario Libre (Open Box)'
          }
        </span>
        <i className="fas fa-chevron-down hcp-chevron"></i>
      </button>

      {abierto && createPortal(
        <div className="hcp-overlay" onClick={() => setAbierto(false)}>
          <div className="hcp-panel" onClick={e => e.stopPropagation()}>

            <div className="hcp-header">
              <span className="hcp-title">
                <i className="fas fa-clock"></i> Horario Fijo
              </span>
              <button type="button" className="hcp-close" onClick={() => setAbierto(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            {categoriaUsuario && (
              <div className="hcp-filtro-hint">
                <i className="fas fa-filter"></i>
                Clases disponibles para <strong>{categoriaUsuario}</strong> o inferior
              </div>
            )}

            <div className="hcp-options">
              {/* Opción sin clase fija */}
              <button
                type="button"
                className={`hcp-option hcp-option--libre${!valor ? ' hcp-option--activo' : ''}`}
                onClick={() => seleccionar('')}
              >
                <div className="hcp-icon-wrap hcp-icon--libre">
                  <i className="fas fa-door-open"></i>
                </div>
                <div className="hcp-info">
                  <span className="hcp-nombre">Open Box</span>
                  <span className="hcp-desc">Sin clase fija — horario libre</span>
                </div>
                {!valor && <i className="fas fa-check hcp-check"></i>}
              </button>

              {clasesFiltradas.map(c => {
                const activo = String(c.idClase) === String(valor);
                const np = c.nivelesPermitidos;
                const nivelInfo = NIVEL_INFO[np] || NIVEL_INFO['Todos'];
                return (
                  <button
                    key={c.idClase}
                    type="button"
                    className={`hcp-option${activo ? ' hcp-option--activo' : ''}`}
                    onClick={() => seleccionar(c.idClase)}
                  >
                    <div className="hcp-icon-wrap">
                      <i className="fas fa-dumbbell"></i>
                    </div>
                    <div className="hcp-info">
                      <span className="hcp-nombre">{c.nombre}</span>
                      <span className="hcp-desc">
                        {c.horarioInicio?.substring(0, 5)} – {c.horarioFin?.substring(0, 5)}
                      </span>
                      <div className="hcp-meta-row">
                        {parseDias(c.diasRecurrentes).map(d => (
                          <span key={d} className="hcp-dia-pip hcp-dia-pip--active">{DIAS_MAP[d]}</span>
                        ))}
                        <span
                          className="hcp-nivel-chip"
                          style={{ '--nivel-color': nivelInfo.color }}
                        >
                          {nivelInfo.emoji} {np && np !== 'Todos' ? np : 'Todos'}
                        </span>
                      </div>
                    </div>
                    {activo && <i className="fas fa-check hcp-check"></i>}
                  </button>
                );
              })}

              {clasesFiltradas.length === 0 && (
                <div className="hcp-empty">
                  <i className="fas fa-lock"></i>
                  <p>No hay clases disponibles para la categoría <strong>{categoriaUsuario}</strong>.</p>
                </div>
              )}
            </div>

          </div>
        </div>,
        document.body
      )}
    </>
  );
}
