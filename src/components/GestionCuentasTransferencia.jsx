import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { API_BASE_URL_CONST } from '../services/api';
import BotonSeguro from './BotonSeguro';
import AtletifyLoader from './AtletifyLoader';
import '../assets/css/cuentas-transferencia.css';

const FORM_VACIO = { banco: '', beneficiario: '', clabe: '', numeroCuenta: '', alias: '', activo: true };

function agruparDigitos(valor) {
  const limpio = (valor || '').replace(/\D/g, '');
  return limpio.replace(/(.{4})/g, '$1 ').trim();
}

/**
 * Administración (alta/edición/baja) de las cuentas de transferencia del box.
 * Autocontenido: se inserta con una sola línea en editar-box (sección financiera).
 * props: idBox (requerido).
 */
export default function GestionCuentasTransferencia({ idBox }) {
  const [cuentas, setCuentas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [modal, setModal] = useState(null);    // null | { id|null, ...form }
  const [errorForm, setErrorForm] = useState(null);
  const [ayudaAbierta, setAyudaAbierta] = useState(false);

  const headersAuth = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
  });

  const cargar = useCallback(async () => {
    if (!idBox) { setCargando(false); return; }
    setCargando(true);
    try {
      const res = await fetch(`${API_BASE_URL_CONST}/configuracionbox/${idBox}/cuentas-transferencia/gestion`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      });
      if (res.ok) setCuentas(await res.json());
    } catch (e) {
      console.error('Error cargando cuentas de transferencia:', e);
    } finally {
      setCargando(false);
    }
  }, [idBox]);

  useEffect(() => { cargar(); }, [cargar]);

  const abrirNueva = () => {
    setErrorForm(null);
    setModal({ id: null, ...FORM_VACIO });
  };

  const abrirEditar = (c) => {
    setErrorForm(null);
    setModal({
      id: c.idCuentaTransferencia,
      banco: c.banco || '',
      beneficiario: c.beneficiario || '',
      clabe: c.clabe || '',
      numeroCuenta: c.numeroCuenta || '',
      alias: c.alias || '',
      activo: c.activo,
    });
  };

  const setCampo = (campo, valor) => setModal(m => ({ ...m, [campo]: valor }));

  const guardar = async () => {
    if (!modal) return;
    const banco = modal.banco.trim();
    const beneficiario = modal.beneficiario.trim();
    const clabeDigitos = (modal.clabe || '').replace(/\D/g, '');
    const cuentaDigitos = (modal.numeroCuenta || '').replace(/\D/g, '');

    if (!banco) { setErrorForm('El banco es obligatorio.'); return; }
    if (!beneficiario) { setErrorForm('El beneficiario (titular) es obligatorio.'); return; }
    if (clabeDigitos.length !== 18) { setErrorForm('La CLABE debe tener exactamente 18 dígitos.'); return; }
    if (cuentaDigitos && (cuentaDigitos.length < 4 || cuentaDigitos.length > 20)) {
      setErrorForm('El número de cuenta debe tener entre 4 y 20 dígitos.'); return;
    }
    setErrorForm(null);

    const payload = {
      banco,
      beneficiario,
      clabe: clabeDigitos,
      numeroCuenta: cuentaDigitos || null,
      alias: modal.alias.trim() || null,
      activo: !!modal.activo,
    };

    const esEdicion = modal.id != null;
    const url = esEdicion
      ? `${API_BASE_URL_CONST}/configuracionbox/${idBox}/cuentas-transferencia/${modal.id}`
      : `${API_BASE_URL_CONST}/configuracionbox/${idBox}/cuentas-transferencia`;

    try {
      const res = await fetch(url, {
        method: esEdicion ? 'PUT' : 'POST',
        headers: headersAuth(),
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorForm(data?.mensaje || 'No se pudo guardar la cuenta.');
        return;
      }
      setModal(null);
      await cargar();
      alert(esEdicion ? 'Cuenta de transferencia actualizada con éxito.' : 'Cuenta de transferencia creada con éxito.');
    } catch (e) {
      setErrorForm('Error de conexión al guardar la cuenta.');
    }
  };

  const eliminar = async (c) => {
    const ok = await window.wpConfirm(
      `¿Eliminar la cuenta "${c.alias || c.banco}"? Los atletas dejarán de verla al transferir. Esta acción no se puede deshacer.`
    );
    if (!ok) return;
    try {
      const res = await fetch(`${API_BASE_URL_CONST}/configuracionbox/${idBox}/cuentas-transferencia/${c.idCuentaTransferencia}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data?.mensaje || 'No se pudo eliminar la cuenta.');
        return;
      }
      await cargar();
      alert('Cuenta de transferencia eliminada.');
    } catch (e) {
      alert('Error de conexión al eliminar la cuenta.');
    }
  };

  return (
    <div className="mb-4 p-3 rounded ct-admin" style={{ background: 'rgba(22, 160, 133, 0.06)', border: '1px solid rgba(22, 160, 133, 0.2)' }}>
      <div className="d-flex flex-column flex-sm-row justify-content-sm-between align-items-start align-items-sm-center gap-2 mb-2">
        <p className="fw-bold mb-0 d-flex align-items-center" style={{ color: '#16a085', fontFamily: 'var(--font-heading)', fontSize: '0.9rem' }}>
          <i className="fas fa-building-columns me-2"></i>Tarjetas para Transferir
          <button type="button" className="ct-help-btn" onClick={() => setAyudaAbierta(true)} aria-label="¿Qué es esto?" title="¿Qué es esto?">
            <i className="fas fa-question"></i>
          </button>
        </p>
        <button type="button" className="ct-add-btn" onClick={abrirNueva}>
          <i className="fas fa-plus"></i>
          <span className="ct-add-label">Agregar cuenta</span>
        </button>
      </div>

      <p className="ct-admin-desc">
        Cuentas bancarias a las que tus atletas te transfieren. Aparecen (solo las activas) cuando eligen pagar por transferencia.
      </p>

      {cargando ? (
        <div className="ct-loading"><AtletifyLoader /></div>
      ) : cuentas.length === 0 ? (
        <div className="ct-empty ct-empty--admin">
          <i className="fas fa-building-columns"></i>
          <span>Aún no agregas ninguna cuenta. Pulsa "Agregar cuenta" para registrar la primera.</span>
        </div>
      ) : (
        <div className="ct-admin-lista">
          {cuentas.map(c => (
            <div className={`ct-admin-item${c.activo ? '' : ' ct-admin-item--inactiva'}`} key={c.idCuentaTransferencia}>
              <div className="ct-admin-item-info">
                <div className="ct-admin-item-top">
                  <span className="ct-admin-item-nombre">{c.alias || c.banco}</span>
                  {c.activo
                    ? <span className="ct-estado ct-estado--on">Activa</span>
                    : <span className="ct-estado ct-estado--off">Oculta</span>}
                </div>
                <div className="ct-admin-item-banco">{c.banco} · {c.beneficiario}</div>
                <div className="ct-admin-item-clabe">CLABE {agruparDigitos(c.clabe)}</div>
              </div>
              <div className="ct-admin-item-acciones">
                <button type="button" className="ct-icon-btn ct-icon-btn--edit" onClick={() => abrirEditar(c)} aria-label="Editar" title="Editar">
                  <i className="fas fa-pen"></i>
                </button>
                <button type="button" className="ct-icon-btn ct-icon-btn--del" onClick={() => eliminar(c)} aria-label="Eliminar" title="Eliminar">
                  <i className="fas fa-trash"></i>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Modal de alta / edición ── */}
      {modal && createPortal(
        <div className="ct-overlay" onClick={() => setModal(null)}>
          <div className="ct-modal ct-modal--form" onClick={e => e.stopPropagation()}>
            <div className="ct-modal-header">
              <span className="ct-modal-title">
                <i className="fas fa-building-columns"></i> {modal.id != null ? 'Editar cuenta' : 'Nueva cuenta'}
              </span>
              <button type="button" className="ct-modal-close" onClick={() => setModal(null)} aria-label="Cerrar">
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="ct-modal-body">
              <div className="ct-form-grid">
                <div className="ct-form-campo">
                  <label className="ct-form-label">Banco <span className="ct-req">*</span></label>
                  <input className="ct-form-input" value={modal.banco} maxLength={80}
                    onChange={e => setCampo('banco', e.target.value)} placeholder="Ej. BBVA Bancomer" />
                </div>
                <div className="ct-form-campo">
                  <label className="ct-form-label">Beneficiario / Titular <span className="ct-req">*</span></label>
                  <input className="ct-form-input" value={modal.beneficiario} maxLength={120}
                    onChange={e => setCampo('beneficiario', e.target.value)} placeholder="Ej. Atletify Box S.A. de C.V." />
                </div>
                <div className="ct-form-campo ct-form-campo--full">
                  <label className="ct-form-label">CLABE interbancaria <span className="ct-req">*</span></label>
                  <input className="ct-form-input ct-mono" value={modal.clabe} inputMode="numeric" maxLength={23}
                    onChange={e => setCampo('clabe', e.target.value)} placeholder="18 dígitos" />
                  <small className="ct-form-hint">18 dígitos. Es la cuenta a donde llega el dinero — verifícala bien.</small>
                </div>
                <div className="ct-form-campo">
                  <label className="ct-form-label">Número de cuenta <span className="ct-opt">(opcional)</span></label>
                  <input className="ct-form-input ct-mono" value={modal.numeroCuenta} inputMode="numeric" maxLength={25}
                    onChange={e => setCampo('numeroCuenta', e.target.value)} placeholder="Cuenta del banco" />
                </div>
                <div className="ct-form-campo ct-form-campo--full">
                  <label className="ct-form-label">Alias interno <span className="ct-opt">(opcional)</span></label>
                  <input className="ct-form-input" value={modal.alias} maxLength={60}
                    onChange={e => setCampo('alias', e.target.value)} placeholder="Ej. BBVA principal" />
                </div>
                <div className="ct-form-campo ct-form-campo--switch">
                  <label className="ct-switch">
                    <input type="checkbox" checked={!!modal.activo} onChange={e => setCampo('activo', e.target.checked)} />
                    <span className="ct-switch-track"><span className="ct-switch-thumb"></span></span>
                    <span className="ct-switch-label">{modal.activo ? 'Visible para los atletas' : 'Oculta'}</span>
                  </label>
                </div>
              </div>

              {errorForm && (
                <div className="ct-form-error"><i className="fas fa-triangle-exclamation"></i> {errorForm}</div>
              )}

              <div className="ct-form-acciones">
                <button type="button" className="ct-btn-cancelar" onClick={() => setModal(null)}>Cancelar</button>
                <BotonSeguro type="button" className="ct-btn-guardar" onClick={guardar} textoProcesando="Guardando...">
                  {modal.id != null ? 'Guardar cambios' : 'Agregar cuenta'}
                </BotonSeguro>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Modal de ayuda "?" ── */}
      {ayudaAbierta && createPortal(
        <div className="ct-overlay" onClick={() => setAyudaAbierta(false)}>
          <div className="ct-modal ct-modal--ayuda" onClick={e => e.stopPropagation()}>
            <div className="ct-modal-header">
              <span className="ct-modal-title"><i className="fas fa-circle-question"></i> ¿Qué son las tarjetas para transferir?</span>
              <button type="button" className="ct-modal-close" onClick={() => setAyudaAbierta(false)} aria-label="Cerrar">
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="ct-modal-body">
              <p className="ct-ayuda-p">
                Aquí registras las <strong>cuentas bancarias</strong> a las que tus atletas te harán las transferencias.
              </p>
              <ul className="ct-ayuda-lista">
                <li>
                  <i className="fas fa-eye"></i>
                  <span>Cada cuenta <strong>activa</strong> aparece cuando un atleta elige pagar por <strong>transferencia</strong>, al pulsar “Ver tarjetas para transferir”.</span>
                </li>
                <li>
                  <i className="fas fa-copy"></i>
                  <span>El atleta podrá <strong>copiar</strong> la CLABE y el número de cuenta para no equivocarse al teclear.</span>
                </li>
                <li>
                  <i className="fas fa-triangle-exclamation"></i>
                  <span>La <strong>CLABE (18 dígitos)</strong> es a dónde llega el dinero: revísala con cuidado.</span>
                </li>
                <li>
                  <i className="fas fa-eye-slash"></i>
                  <span>Puedes <strong>ocultar</strong> una cuenta sin borrarla (interruptor “Visible”), o <strong>eliminarla</strong> de forma permanente.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
