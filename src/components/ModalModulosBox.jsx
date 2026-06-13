import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { CATALOGO_MODULOS, MODULOS_PRO, MODULOS_PREMIUM } from '../config/modulosSaaS';
import '../assets/css/ModalModulosBox.css';

const parsePlanModulos = (plan) => {
  try { const a = JSON.parse(plan?.modulosJSON || '[]'); return Array.isArray(a) ? a : []; }
  catch { return []; }
};
const parseOverrides = (json) => {
  try { const o = JSON.parse(json || '{}'); return (o && typeof o === 'object' && !Array.isArray(o)) ? o : {}; }
  catch { return {}; }
};
const norm = (t = '') => t.toString().normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Modal del Developer para activar/desactivar módulos de un box, independiente
// del plan (override por box). Persiste en Box.ModulosOverrideJSON.
export default function ModalModulosBox({ box, planes, onClose, onSaved }) {
  const plan = planes.find(p => p.idPlan === box.idPlanSaaS) || null;
  const planModulos = useMemo(() => new Set(parsePlanModulos(plan)), [plan]);

  const [overrides, setOverrides] = useState(() => parseOverrides(box.modulosOverrideJSON));
  const [buscar, setBuscar] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [vencimiento, setVencimiento] = useState(box.fechaVencimientoSaaS ? box.fechaVencimientoSaaS.slice(0, 10) : '');

  const enPlan = (clave) => planModulos.has(clave);
  const estadoEfectivo = (clave) => (clave in overrides ? overrides[clave] : enPlan(clave));

  const chip = (clave) => {
    const ov = clave in overrides ? overrides[clave] : null;
    if (ov === true) return { txt: 'Activado extra', cls: 'extra' };
    if (ov === false) return { txt: 'Bloqueado', cls: 'bloq' };
    return enPlan(clave) ? { txt: 'Incluido en el plan', cls: 'incl' } : { txt: 'No incluido', cls: 'no' };
  };

  const toggle = (clave) => {
    const nuevo = !estadoEfectivo(clave);
    setOverrides(prev => {
      const next = { ...prev };
      if (nuevo === enPlan(clave)) delete next[clave]; // coincide con el plan → sin override
      else next[clave] = nuevo;
      return next;
    });
  };
  const restablecer = (clave) => setOverrides(prev => { const n = { ...prev }; delete n[clave]; return n; });

  const nOverrides = Object.keys(overrides).filter(k => overrides[k] !== enPlan(k)).length;

  const authHeader = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

  const guardar = async () => {
    setGuardando(true);
    try {
      // Limpia overrides que ya coinciden con el plan.
      const limpio = {};
      Object.keys(overrides).forEach(k => { if (overrides[k] !== enPlan(k)) limpio[k] = overrides[k]; });
      const base = import.meta.env.VITE_API_URL;
      const body = {
        estatusSaaS: box.estatusSaaS,
        idPlanSaaS: box.idPlanSaaS,
        precioEspecialSaaS: box.precioEspecialSaaS,
        // Mantenemos el flag legacy de competencias en sync con el estado efectivo.
        moduloCompetenciasActivo: estadoEfectivo('competencias'),
        fechaVencimientoSaaS: vencimiento ? new Date(vencimiento + 'T12:00:00').toISOString() : box.fechaVencimientoSaaS,
        modulosOverrideJSON: JSON.stringify(limpio),
      };
      const res = await fetch(`${base}/api/developer/box-saas/${box.idBox}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Error al guardar');
      onSaved?.(box.idBox, JSON.stringify(limpio), estadoEfectivo('competencias'), body.fechaVencimientoSaaS);
      onClose();
    } catch (e) {
      window.alert('No se pudieron guardar los módulos del box.');
    } finally {
      setGuardando(false);
    }
  };

  const grupos = [
    { titulo: 'PRO', claves: MODULOS_PRO },
    { titulo: 'PREMIUM', claves: MODULOS_PREMIUM },
  ];

  const visibles = (claves) => claves.filter(c => {
    const m = CATALOGO_MODULOS[c]; if (!m) return false;
    const q = norm(buscar); if (!q) return true;
    return norm(m.nombre).includes(q) || norm(m.descripcion || '').includes(q) || norm(c).includes(q);
  });

  return createPortal(
    <div className="mmb-overlay" onClick={onClose}>
      <div className="mmb-modal" onClick={e => e.stopPropagation()}>
        <div className="mmb-head">
          <div className="mmb-head-info">
            <i className="fas fa-toggle-on mmb-head-icon"></i>
            <div>
              <p className="mmb-title">Módulos de {box.nombre}</p>
              <p className="mmb-sub">{box.ubicacion || 'Sin ubicación'}</p>
            </div>
          </div>
          <span className="mmb-plan-badge">
            Plan: {plan?.nombre || 'Sin plan'}{nOverrides > 0 ? ` · ${nOverrides} override${nOverrides === 1 ? '' : 's'}` : ''}
          </span>
        </div>

        <div className="mmb-search">
          <i className="fas fa-search mmb-search-icon"></i>
          <input
            className="mmb-search-input"
            placeholder="Buscar módulo…"
            value={buscar}
            onChange={e => setBuscar(e.target.value)}
            autoFocus
          />
        </div>

        <div className="mmb-body">
          <div className="mmb-vence">
            <label className="mmb-vence-label"><i className="fas fa-calendar-day"></i> Próximo cobro / vencimiento</label>
            <input type="date" className="mmb-vence-input" value={vencimiento} onChange={e => setVencimiento(e.target.value)} />
          </div>
          <p className="mmb-nota"><i className="fas fa-circle-info"></i> Las funciones núcleo (plan Starter) están siempre incluidas y no se apagan. Aquí solo controlas los módulos Pro y Premium.</p>
          {grupos.map(g => {
            const items = visibles(g.claves);
            if (items.length === 0) return null;
            return (
              <div key={g.titulo} className="mmb-grupo">
                <p className="mmb-grupo-titulo">{g.titulo}</p>
                {items.map(clave => {
                  const m = CATALOGO_MODULOS[clave];
                  const on = estadoEfectivo(clave);
                  const c = chip(clave);
                  const esOverride = clave in overrides && overrides[clave] !== enPlan(clave);
                  return (
                    <div key={clave} className="mmb-row">
                      <div className="mmb-row-info">
                        <i className={`fas ${m.icono} mmb-row-icon`}></i>
                        <div>
                          <p className="mmb-row-name">{m.nombre}</p>
                          {esOverride
                            ? <button className="mmb-reset" onClick={() => restablecer(clave)}><i className="fas fa-rotate-left"></i> restablecer al plan</button>
                            : <p className="mmb-row-desc">{m.descripcion}</p>}
                        </div>
                      </div>
                      <div className="mmb-row-ctrl">
                        <span className={`mmb-chip mmb-chip--${c.cls}`}>{c.txt}</span>
                        <button
                          type="button"
                          className={`mmb-switch ${on ? 'mmb-switch--on' : ''}`}
                          onClick={() => toggle(clave)}
                          aria-label={`${on ? 'Desactivar' : 'Activar'} ${m.nombre}`}
                        >
                          <span className="mmb-switch-knob"></span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        <div className="mmb-foot">
          <button className="mmb-btn-ghost" onClick={() => setOverrides({})} disabled={guardando}>
            <i className="fas fa-rotate-left"></i> Restablecer todo al plan
          </button>
          <div className="mmb-foot-right">
            <button className="mmb-btn-cancel" onClick={onClose} disabled={guardando}>Cancelar</button>
            <button className="mmb-btn-save" onClick={guardar} disabled={guardando}>
              <i className="fas fa-check"></i> {guardando ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
