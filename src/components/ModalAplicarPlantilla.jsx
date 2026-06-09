import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import RedGrayDatePicker from './RedGrayDatePicker';
import BotonSeguro from './BotonSeguro';
import { api } from '../services/api';
import '../assets/css/WodsGuardados.css';

const API_BASE = import.meta.env.VITE_API_URL;

const hoyStr = () => {
  const h = new Date();
  return h.getFullYear() + '-' +
    String(h.getMonth() + 1).padStart(2, '0') + '-' +
    String(h.getDate()).padStart(2, '0');
};

// Modal centrado para aplicar una plantilla a un día concreto (clona el molde a un WOD real).
export default function ModalAplicarPlantilla({ plantilla, idBox, onCerrar, onAplicada }) {
  const [fecha, setFecha] = useState(hoyStr());
  const [clases, setClases] = useState([]);
  const [clasesSel, setClasesSel] = useState([]);
  const [estaPublicado, setEstaPublicado] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/clases/box/${idBox}`)
      .then(r => (r.ok ? r.json() : []))
      .then(d => setClases(Array.isArray(d) ? d : (d.data || [])))
      .catch(() => {});
  }, [idBox]);

  const toggleClase = (id) =>
    setClasesSel(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const aplicar = async () => {
    try {
      const res = await api.aplicarPlantilla(plantilla.idPlantilla, {
        fechaProgramada: fecha.substring(0, 10),
        clasesIds: clasesSel,
        estaPublicado
      });
      onAplicada(res?.id);
    } catch (err) {
      alert(err.message || 'Error al aplicar la plantilla');
    }
  };

  return createPortal(
    <div className="wg-modal-overlay" onClick={onCerrar}>
      <div className="wg-modal" onClick={e => e.stopPropagation()}>
        <button type="button" className="wg-modal-close" onClick={onCerrar}>
          <i className="fas fa-times"></i>
        </button>

        <h3 className="wg-modal-title">
          <i className="fas fa-calendar-plus me-2" style={{ color: 'var(--primary)' }}></i>Aplicar plantilla
        </h3>
        <p className="wg-modal-sub">{plantilla.nombre}</p>

        <label className="wg-label">Fecha</label>
        <div className="mb-3">
          <RedGrayDatePicker value={fecha} onChange={setFecha} inputClassName="shadow-none p-3 rounded-4" />
        </div>

        <label className="wg-label">Clases (opcional — vacío = todo el box)</label>
        <div className="wg-clases-wrap mb-3">
          {clases.length === 0 && <p className="wg-empty-mini">Sin clases configuradas</p>}
          {clases.map(c => (
            <button
              type="button"
              key={c.idClase}
              className={`wg-clase-chip ${clasesSel.includes(c.idClase) ? 'wg-clase-chip--active' : ''}`}
              onClick={() => toggleClase(c.idClase)}
            >
              <i className={`${clasesSel.includes(c.idClase) ? 'fas' : 'far'} fa-check-circle`}></i>
              {c.horarioInicio ? `${c.horarioInicio.substring(0, 5)} — ` : ''}{c.nombre}
            </button>
          ))}
        </div>

        <label className="wg-label">Visibilidad</label>
        <div className="wg-toggle-row mb-3">
          <input
            className="form-check-input m-0"
            type="checkbox"
            role="switch"
            checked={estaPublicado}
            onChange={e => setEstaPublicado(e.target.checked)}
            style={{ width: '48px', height: '24px' }}
          />
          <span className="wg-toggle-label">
            {estaPublicado
              ? <span style={{ color: 'var(--success)' }}><i className="fas fa-eye me-2"></i>Publicado</span>
              : <span style={{ color: 'var(--text-muted)' }}><i className="fas fa-eye-slash me-2"></i>Borrador</span>}
          </span>
        </div>

        <div className="wg-modal-footer">
          <button type="button" className="wg-modal-cancel" onClick={onCerrar}>Cancelar</button>
          <BotonSeguro type="button" onClick={aplicar} className="wg-btn-primary" textoProcesando="Aplicando...">
            <i className="fas fa-bolt"></i>Aplicar a este día
          </BotonSeguro>
        </div>
      </div>
    </div>,
    document.body
  );
}
