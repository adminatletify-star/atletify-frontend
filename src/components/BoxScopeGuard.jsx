import { cloneElement, isValidElement } from 'react';
import { useAuth } from '../context/AuthContext';
import BoxPickerModal from './BoxPickerModal';

// Rediseño Developer: las páginas con SCOPE DE BOX necesitan un box en contexto. Un Developer
// no tiene box propio; si entra sin elegir uno, varias páginas lo EXPULSABAN a /login. Este guard
// lo intercepta ANTES de montar la página: muestra un selector inline "Elige un box para auditar".
// Para los demás roles (que sí tienen su box) es transparente.
export default function BoxScopeGuard({ children }) {
  const { usuario, boxActivo, listaBoxes, auditarBox } = useAuth();

  let boxLocal = null;
  try { boxLocal = JSON.parse(localStorage.getItem('box') || 'null'); } catch { boxLocal = null; }
  if (typeof boxLocal !== 'object') boxLocal = null;
  const hayBox = !!boxActivo || !!(boxLocal && (boxLocal.idBox || boxLocal.IdBox));

  // Solo el Developer SIN box ve el selector; cualquier otro caso pasa directo a la página.
  if (usuario?.rol === 'Developer' && !hayBox) {
    return (
      <div style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ maxWidth: 460, textAlign: 'center', background: '#1C1C26', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '32px 26px' }}>
          <div style={{ width: 64, height: 64, margin: '0 auto 16px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, color: '#fff', background: 'linear-gradient(135deg, var(--primary,#dc3545), #ff6b6b)' }}>
            <i className="fas fa-magnifying-glass-chart"></i>
          </div>
          <h3 style={{ color: '#fff', fontWeight: 800, marginBottom: 8 }}>Elige un box para auditar</h3>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, marginBottom: 20 }}>
            Esta sección muestra datos de un box específico. Selecciona el box que quieres auditar para continuar.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <BoxPickerModal boxes={listaBoxes} boxSeleccionado={boxActivo} onChange={(boxId) => auditarBox(boxId)} />
          </div>
        </div>
      </div>
    );
  }

  // Developer CON box: banner discreto de "estás auditando un box ajeno".
  const banner = (usuario?.rol === 'Developer' && hayBox) ? (
    <div style={{
      background: 'linear-gradient(90deg, rgba(220,53,69,0.18), rgba(255,107,107,0.10))',
      borderBottom: '1px solid rgba(220,53,69,0.35)', color: '#ffd9dd',
      padding: '6px 14px', fontSize: 13, fontWeight: 600, textAlign: 'center',
    }}>
      <i className="fas fa-magnifying-glass-chart" style={{ marginRight: 8 }}></i>
      Auditando box ajeno: <strong>{boxLocal?.nombre || boxLocal?.Nombre || `#${boxActivo}`}</strong>
    </div>
  ) : null;

  // key={boxActivo} fuerza el remount de la página al cambiar de box (re-carga sus datos sin reload).
  return (
    <>
      {banner}
      {isValidElement(children) ? cloneElement(children, { key: String(boxActivo ?? 'sin-box') }) : children}
    </>
  );
}
