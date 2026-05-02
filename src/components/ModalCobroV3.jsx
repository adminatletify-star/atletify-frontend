import { useState, useEffect } from 'react';

export default function ModalCobroV3({ atleta, suscripcion, onClose, onSuccess }) {
  const API_URL = 'https://localhost:7149/api';
  const precioBase = suscripcion?.totalAPagar || 0; // El precio del plan
  const saldoAtleta = atleta?.saldoAFavor || 0;

  // Estados del formulario
  const [cobrarInscripcion, setCobrarInscripcion] = useState(false);
  const [precioInscripcion, setPrecioInscripcion] = useState(300); // Lo que cobres de inscripción
  const [usarSaldo, setUsarSaldo] = useState(false);
  
  const [metodo1, setMetodo1] = useState('Efectivo');
  const [monto1, setMonto1] = useState('');
  
  const [metodo2, setMetodo2] = useState('');
  const [monto2, setMonto2] = useState('');
  
  const [notas, setNotas] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 🧠 CÁLCULO DINÁMICO DEL TOTAL 🧠
  const totalACobrar = precioBase + (cobrarInscripcion ? precioInscripcion : 0) - (usarSaldo ? saldoAtleta : 0);
  const restante = totalACobrar - (parseFloat(monto1) || 0);

  // Auto-rellenar monto2 si hay restante
  useEffect(() => {
    if (restante > 0 && monto1 !== '') {
      setMonto2(restante);
    } else {
      setMonto2('');
      setMetodo2(''); // Limpiamos el método 2 si ya se cubrió todo
    }
  }, [restante, monto1]);

  const handleCobrar = async (e) => {
    e.preventDefault();
    setError('');

    const m1 = parseFloat(monto1) || 0;
    const m2 = parseFloat(monto2) || 0;
    const totalEntregado = m1 + m2;

    // Validación estricta V3 (Cero deudas)
    if (totalEntregado < totalACobrar) {
      return setError(`Faltan $${totalACobrar - totalEntregado} para cubrir el plan. El sistema V3 no acepta abonos incompletos.`);
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/cobranza/pagar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}` // Asegúrate de mandar el token si está protegido
        },
        body: JSON.stringify({
          idSuscripcion: suscripcion.idSuscripcion,
          montoMetodo1: m1,
          metodoPago1: metodo1,
          montoMetodo2: m2 > 0 ? m2 : null,
          metodoPago2: m2 > 0 ? metodo2 : null,
          usarSaldoAFavor: usarSaldo,
          cobrarInscripcion: cobrarInscripcion,
          notas: notas
        })
      });

      const data = await response.json();

      if (response.ok) {
        onSuccess(data.mensaje); // Cerramos y avisamos que fue un éxito
      } else {
        setError(data.mensaje || 'Error al procesar el pago.');
      }
    } catch (err) {
      setError('Error de conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  if (!suscripcion) return null;

  return (
    <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content bg-dark text-white border-warning">
          <div className="modal-header border-bottom border-warning border-opacity-25">
            <h5 className="modal-title fw-bold text-warning">
              <i className="fas fa-cash-register me-2"></i>Caja Registradora
            </h5>
            <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
          </div>

          <div className="modal-body">
            <h6 className="text-info fw-bold mb-3">Atleta: {atleta?.nombre}</h6>
            
            {/* RESUMEN DEL COBRO */}
            <div className="bg-black p-3 rounded mb-3 border border-secondary">
              <div className="d-flex justify-content-between mb-1">
                <span>Plan Mensual:</span>
                <span className="fw-bold">${precioBase}</span>
              </div>
              
              <div className="form-check form-switch mb-1 text-warning">
                <input className="form-check-input bg-warning border-warning" type="checkbox" checked={cobrarInscripcion} onChange={(e) => setCobrarInscripcion(e.target.checked)} />
                <label className="form-check-label d-flex justify-content-between w-100">
                  <span>Inscripción (+${precioInscripcion})</span>
                </label>
              </div>

              {saldoAtleta > 0 && (
                <div className="form-check form-switch mb-1 text-success">
                  <input className="form-check-input bg-success border-success" type="checkbox" checked={usarSaldo} onChange={(e) => setUsarSaldo(e.target.checked)} />
                  <label className="form-check-label d-flex justify-content-between w-100">
                    <span>Usar Billetera Virtual (-${saldoAtleta})</span>
                  </label>
                </div>
              )}

              <hr className="border-secondary my-2" />
              <div className="d-flex justify-content-between text-white fs-5 fw-bold">
                <span>Total a Pagar:</span>
                <span className="text-success">${totalACobrar}</span>
              </div>
            </div>

            {error && <div className="alert alert-danger p-2 small text-center">{error}</div>}

            {/* ZONA DE PAGOS HÍBRIDOS */}
            <form onSubmit={handleCobrar}>
              <div className="row g-2 mb-3">
                <div className="col-7">
                  <label className="form-label small text-secondary">Método de Pago 1</label>
                  <select className="form-select bg-dark text-white" value={metodo1} onChange={(e) => setMetodo1(e.target.value)}>
                    <option value="Efectivo">💵 Efectivo</option>
                    <option value="Tarjeta">💳 Tarjeta</option>
                    <option value="Transferencia">📱 Transferencia</option>
                  </select>
                </div>
                <div className="col-5">
                  <label className="form-label small text-secondary">Monto</label>
                  <input type="number" className="form-control bg-dark text-white fw-bold" placeholder="0.00" value={monto1} onChange={(e) => setMonto1(e.target.value)} required />
                </div>
              </div>

              {/* MAGIA: Aparece el Método 2 solo si falta dinero */}
              {restante > 0 && monto1 !== '' && (
                <div className="row g-2 mb-3 border border-info rounded p-2 bg-info bg-opacity-10 animate__animated animate__fadeIn">
                  <div className="col-12"><small className="text-info fw-bold"><i className="fas fa-split me-1"></i>Pago Dividido Detectado</small></div>
                  <div className="col-7">
                    <select className="form-select bg-dark text-white border-info" value={metodo2} onChange={(e) => setMetodo2(e.target.value)} required>
                      <option value="">-- Elija Método 2 --</option>
                      <option value="Efectivo" disabled={metodo1 === 'Efectivo'}>💵 Efectivo</option>
                      <option value="Tarjeta" disabled={metodo1 === 'Tarjeta'}>💳 Tarjeta</option>
                      <option value="Transferencia" disabled={metodo1 === 'Transferencia'}>📱 Transferencia</option>
                    </select>
                  </div>
                  <div className="col-5">
                    <input type="number" className="form-control bg-dark text-info fw-bold border-info" value={monto2} readOnly title="Calculado automáticamente" />
                  </div>
                </div>
              )}

              <div className="mb-3">
                <label className="form-label small text-secondary">Notas (Opcional)</label>
                <input type="text" className="form-control bg-dark text-white" placeholder="Ej: Me transfirió desde la cuenta de su mamá" value={notas} onChange={(e) => setNotas(e.target.value)} />
              </div>

              <button type="submit" className="btn btn-warning w-100 fw-bold py-2" disabled={loading}>
                {loading ? <i className="fas fa-spinner fa-spin me-2"></i> : <i className="fas fa-check-circle me-2"></i>}
                {totalACobrar <= 0 ? 'Aplicar Saldo y Activar' : `Cobrar $${totalACobrar}`}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}