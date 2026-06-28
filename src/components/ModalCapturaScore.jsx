import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { COMPETENCIAS_ENDPOINT } from '../services/api';
import PlantillaJueceo from './PlantillaJueceo';
import FirmaAtletaPad from './FirmaAtletaPad';
import './ModalCapturaScore.css';

// Captura profesional del juez: hoja auto-generada (PlantillaJueceo) + firma del atleta + payload rico.
export default function ModalCapturaScore({ idWod, equipo, nombreJuez, juezToken, onCerrar, onGuardado }) {
  const [wod, setWod] = useState(null);
  const [valor, setValor] = useState(null);
  const [firma, setFirma] = useState('');
  const [mostrarFirma, setMostrarFirma] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let activo = true;
    (async () => {
      try { const r = await fetch(`${COMPETENCIAS_ENDPOINT}/wods/${idWod}/detalle`); if (r.ok && activo) setWod(await r.json()); } catch { /* ignore */ }
    })();
    return () => { activo = false; };
  }, [idWod]);

  const idEquipo = equipo.idEquipoComp || equipo.IdEquipoComp;

  const guardar = async () => {
    setError('');
    if (!valor) { setError('Captura un resultado.'); return; }
    if (valor.dnf || !valor.resultado) { setError('DNF: no se registra score (queda sin marca, al fondo).'); return; }
    if (!valor.esValido) { setError('El resultado no es válido, revísalo.'); return; }
    setGuardando(true);
    try {
      const e = valor.estructurado || {};
      const payload = {
        idEquipoComp: idEquipo,
        resultado: valor.resultado,
        nombreJuez,
        valorNumerico: e.valorNumerico ?? null,
        noTermino: e.termino === false,
        repsAlCap: e.repsAlCap ?? null,
        tiebreak: valor.tiebreak?.valorString ?? null,
        tiebreakValor: valor.tiebreak?.valorNumerico ?? null,
        firmaAtletaUrl: firma || '',
        criteriosJson: JSON.stringify(valor.checklist || []),
      };
      const headers = { 'Content-Type': 'application/json' };
      if (juezToken) headers['X-Juez-Token'] = juezToken;
      const res = await fetch(`${COMPETENCIAS_ENDPOINT}/wods/${idWod}/scores`, { method: 'POST', headers, body: JSON.stringify(payload) });
      if (res.ok) { onGuardado?.(); }
      else { const d = await res.json().catch(() => ({})); setError(d.mensaje || 'No se pudo guardar.'); }
    } catch { setError('Error de conexión.'); } finally { setGuardando(false); }
  };

  // Score que el atleta firma (se le muestra grande en el pad para que no firme a ciegas).
  const resumenScore = valor && valor.resultado
    ? `${valor.resultado}${wod?.tipoScore === 'Carga' ? ' ' + (wod?.unidadPeso || 'kg') : ''}`
    : '';

  return createPortal(
    <div className="mcs-overlay" onClick={onCerrar}>
      <div className="mcs-modal" onClick={e => e.stopPropagation()}>
        <div className="mcs-head">
          <div>
            <h3 className="mcs-title">{equipo.nombre || equipo.Nombre}</h3>
            <span className="mcs-sub">{wod?.nombre || 'Cargando WOD...'}</span>
          </div>
          <button className="mcs-close" onClick={onCerrar}><i className="fas fa-times"></i></button>
        </div>
        <div className="mcs-body">
          {!wod ? <div className="mcs-loading"><i className="fas fa-spinner fa-spin"></i> Cargando hoja...</div> : (
            <PlantillaJueceo wod={wod} nombreJuez={nombreJuez} onChange={setValor} />
          )}
          <div className="mcs-firma">
            <span><i className="fas fa-signature"></i> Firma del atleta {firma ? '✅ firmado' : '(opcional)'}</span>
            <button className="mcs-btn-ghost" onClick={() => setMostrarFirma(true)}>{firma ? 'Volver a firmar' : 'Pedir firma'}</button>
          </div>
          {error && <div className="mcs-error"><i className="fas fa-exclamation-triangle"></i> {error}</div>}
        </div>
        <div className="mcs-foot">
          <button className="mcs-btn-ghost" onClick={onCerrar} disabled={guardando}>Cancelar</button>
          <button className="mcs-btn-solid" onClick={guardar} disabled={guardando || !wod}>{guardando ? 'Guardando...' : 'Guardar score'}</button>
        </div>
      </div>
      {mostrarFirma && (
        <FirmaAtletaPad
          resumen={resumenScore}
          contexto={`${equipo.nombre || equipo.Nombre} · ${wod?.nombre || ''}`}
          onCerrar={() => setMostrarFirma(false)}
          onConfirmar={(b64) => { setFirma(b64); setMostrarFirma(false); }}
        />
      )}
    </div>,
    document.body
  );
}
