import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { API_BASE_URL_CONST } from '../services/api';
import AtletifyLoader from './AtletifyLoader';
import '../assets/css/cuentas-transferencia.css';

// Fila etiqueta + valor + botón "Copiar".
// Definida fuera del render para no re-instanciar un tipo de componente nuevo cada renderización.
function Dato({ etiqueta, valor, mono = false, claveCopia, valorCopia, copiado, onCopiar }) {
  if (!valor) return null;
  const copia = valorCopia ?? valor;
  const activo = copiado === claveCopia;
  return (
    <div className="ct-dato">
      <span className="ct-dato-label">{etiqueta}</span>
      <div className="ct-dato-valor-wrap">
        <span className={`ct-dato-valor${mono ? ' ct-mono' : ''}`}>{valor}</span>
        <button
          type="button"
          className={`ct-copy-btn${activo ? ' ct-copy-btn--ok' : ''}`}
          onClick={() => onCopiar(claveCopia, copia)}
          aria-label={`Copiar ${etiqueta}`}
          title={`Copiar ${etiqueta}`}
        >
          <i className={`fas ${activo ? 'fa-check' : 'fa-copy'}`}></i>
          <span className="ct-copy-txt">{activo ? '¡Copiado!' : 'Copiar'}</span>
        </button>
      </div>
    </div>
  );
}

// Agrupa una cadena de dígitos en bloques de 4 para leerla más fácil (CLABE / cuenta).
function agruparDigitos(valor) {
  const limpio = (valor || '').replace(/\D/g, '');
  return limpio.replace(/(.{4})/g, '$1 ').trim();
}

// Copia texto al portapapeles con respaldo para navegadores viejos / contextos sin clipboard API.
async function copiarAlPortapapeles(texto) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(texto);
      return true;
    }
  } catch { /* cae al respaldo */ }
  try {
    // Fallback robusto para iOS Safari: usar readonly + posicionar fuera de pantalla
    // (NO opacity:0, porque select() no funciona si el elemento no es "visible")
    // y forzar la selección con Range API para que execCommand('copy') tome el texto.
    const ta = document.createElement('textarea');
    ta.value = texto;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    ta.style.top = '0';
    document.body.appendChild(ta);
    const range = document.createRange();
    range.selectNodeContents(ta);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    ta.setSelectionRange(0, ta.value.length);
    const ok = document.execCommand('copy');
    sel.removeAllRanges();
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

/**
 * Botón "Ver tarjetas para transferir" + modal con las cuentas del box.
 * Autocontenido: maneja su propio estado de apertura y su propio fetch.
 *
 * props:
 *  - idBox (requerido)
 *  - montoExacto (opcional): número a mostrar como "Monto exacto a transferir".
 *  - label (opcional): texto del botón. Por defecto "Ver tarjetas para transferir".
 *  - className (opcional): clases extra para el botón.
 */
export default function CuentasTransferenciaTrigger({ idBox, montoExacto = null, label = 'Ver tarjetas para transferir', className = '' }) {
  const [abierto, setAbierto] = useState(false);
  const [cuentas, setCuentas] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  const [copiado, setCopiado] = useState(null); // clave del dato recién copiado (para el feedback)
  const copiadoTimeoutRef = useRef(null);

  const cargar = useCallback(async () => {
    if (!idBox) return;
    setCargando(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL_CONST}/configuracionbox/${idBox}/cuentas-transferencia`);
      if (!res.ok) throw new Error('No se pudieron cargar las cuentas.');
      setCuentas(await res.json());
    } catch (e) {
      setError(e.message || 'No se pudieron cargar las cuentas.');
      setCuentas([]);
    } finally {
      setCargando(false);
    }
  }, [idBox]);

  useEffect(() => {
    if (abierto) cargar();
  }, [abierto, cargar]);

  // Bloquea el scroll del fondo mientras el modal está abierto.
  useEffect(() => {
    if (!abierto) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [abierto]);

  const onCopiar = useCallback(async (clave, valor) => {
    const ok = await copiarAlPortapapeles(valor);
    if (!ok) return;
    setCopiado(clave);
    if (copiadoTimeoutRef.current) clearTimeout(copiadoTimeoutRef.current);
    copiadoTimeoutRef.current = setTimeout(() => {
      setCopiado(c => (c === clave ? null : c));
      copiadoTimeoutRef.current = null;
    }, 1600);
  }, []);

  const cerrar = () => {
    setAbierto(false);
    setCopiado(null);
    if (copiadoTimeoutRef.current) {
      clearTimeout(copiadoTimeoutRef.current);
      copiadoTimeoutRef.current = null;
    }
  };

  // Cleanup del timeout al desmontar para no llamar setState en un componente desmontado.
  useEffect(() => () => {
    if (copiadoTimeoutRef.current) clearTimeout(copiadoTimeoutRef.current);
  }, []);

  const montoNum = Number(montoExacto);
  const mostrarMonto = montoExacto != null && !Number.isNaN(montoNum) && montoNum > 0;

  return (
    <>
      <button
        type="button"
        className={`ct-ver-btn ${className}`}
        onClick={() => setAbierto(true)}
      >
        <i className="fas fa-university"></i>
        <span>{label}</span>
      </button>

      {abierto && createPortal(
        <div className="ct-overlay" onClick={cerrar}>
          <div className="ct-modal" onClick={e => e.stopPropagation()}>
            <div className="ct-modal-header">
              <span className="ct-modal-title">
                <i className="fas fa-university"></i> Cuentas para Transferir
              </span>
              <button type="button" className="ct-modal-close" onClick={cerrar} aria-label="Cerrar">
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="ct-modal-body">
              {mostrarMonto && (
                <div className="ct-monto">
                  <span className="ct-monto-label">Monto exacto a transferir</span>
                  <div className="ct-dato-valor-wrap">
                    <span className="ct-monto-valor">${montoNum.toFixed(2)}</span>
                    <button
                      type="button"
                      className={`ct-copy-btn${copiado === 'monto' ? ' ct-copy-btn--ok' : ''}`}
                      onClick={() => onCopiar('monto', montoNum.toFixed(2))}
                      title="Copiar monto"
                    >
                      <i className={`fas ${copiado === 'monto' ? 'fa-check' : 'fa-copy'}`}></i>
                      <span className="ct-copy-txt">{copiado === 'monto' ? '¡Copiado!' : 'Copiar'}</span>
                    </button>
                  </div>
                </div>
              )}

              {cargando ? (
                <div className="ct-loading"><AtletifyLoader /></div>
              ) : error ? (
                <div className="ct-empty">
                  <i className="fas fa-triangle-exclamation"></i>
                  <span>{error}</span>
                </div>
              ) : cuentas.length === 0 ? (
                <div className="ct-empty">
                  <i className="fas fa-building-columns"></i>
                  <span>El box aún no registró cuentas para transferencia. Pídele los datos al administrador del box.</span>
                </div>
              ) : (
                <div className="ct-lista">
                  {cuentas.map((c) => (
                    <div className="ct-cuenta-card" key={c.idCuentaTransferencia}>
                      {c.alias && <div className="ct-cuenta-alias"><i className="fas fa-bookmark"></i> {c.alias}</div>}
                      <Dato etiqueta="Banco" valor={c.banco} claveCopia={`${c.idCuentaTransferencia}-banco`} copiado={copiado} onCopiar={onCopiar} />
                      <Dato etiqueta="Beneficiario" valor={c.beneficiario} claveCopia={`${c.idCuentaTransferencia}-benef`} copiado={copiado} onCopiar={onCopiar} />
                      <Dato
                        etiqueta="CLABE"
                        valor={agruparDigitos(c.clabe)}
                        valorCopia={(c.clabe || '').replace(/\D/g, '')}
                        mono
                        claveCopia={`${c.idCuentaTransferencia}-clabe`}
                        copiado={copiado}
                        onCopiar={onCopiar}
                      />
                      {c.numeroCuenta && (
                        <Dato
                          etiqueta="Número de cuenta"
                          valor={agruparDigitos(c.numeroCuenta)}
                          valorCopia={(c.numeroCuenta || '').replace(/\D/g, '')}
                          mono
                          claveCopia={`${c.idCuentaTransferencia}-cuenta`}
                          copiado={copiado}
                          onCopiar={onCopiar}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}

              <p className="ct-nota">
                <i className="fas fa-circle-info"></i>
                Verifica los datos antes de transferir. Si tienes dudas, contacta al administrador del box.
              </p>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
