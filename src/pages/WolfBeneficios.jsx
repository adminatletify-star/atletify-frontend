import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BackButton from '../components/BackButton';
import RedGrayDatePicker from '../components/RedGrayDatePicker';
import '../assets/css/WolfBeneficios.css';

const API_BASE = `${import.meta.env.VITE_API_URL}/api/finanzas`;
const todayISO = new Date().toISOString().split('T')[0];

export default function WolfBeneficios() {
  const navigate = useNavigate();
  const [planes, setPlanes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [box, setBox] = useState(null);

  // Estados del Modal Maestro
  const [showModal, setShowModal] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [form, setForm] = useState({
    nombre: '', precio: '', duracionDias: '30', limiteClasesMensual: '',
    descripcion: '', descripcionDetallada: '', precioReferenciaMensual: '',
    nivelAcceso: 'CrossFit', prioridadReserva: '1', requiereInscripcion: true,
    permiteScore: true, esVisible: true, incluyeGym: true,
    fechaActivacion: '', fechaExpiracion: '', precioProgramado: '', fechaCambioPrecio: ''
  });

  const token = localStorage.getItem('token');
  const headersPost = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

  useEffect(() => {
    const b = JSON.parse(localStorage.getItem('box'));
    if (!b) { navigate('/login'); return; }
    setBox(b);
    cargarPlanes(b.idBox);
  }, [navigate]);

  const cargarPlanes = async (idBox) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/planes/${idBox}`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) setPlanes(await res.json());
    } catch (e) { console.error('Error al cargar planes', e); }
    finally { setLoading(false); }
  };

  const abrirModal = (plan = null) => {
    if (plan) {
      setEditandoId(plan.idPlan);
      setForm({
        nombre: plan.nombre || '', precio: plan.precio || '', duracionDias: plan.diasDuracion || '30',
        limiteClasesMensual: plan.limiteClasesMensual || '', descripcion: plan.descripcion || '',
        descripcionDetallada: plan.descripcionDetallada || '', precioReferenciaMensual: plan.precioReferenciaMensual || '',
        nivelAcceso: plan.nivelAcceso || 'CrossFit', prioridadReserva: plan.prioridadReserva || '1',
        requiereInscripcion: plan.requiereInscripcion ?? true, permiteScore: plan.permiteScore ?? true,
        esVisible: plan.esVisible ?? true, incluyeGym: plan.incluyeGym ?? true,
        fechaActivacion: plan.fechaActivacion ? plan.fechaActivacion.split('T')[0] : '',
        fechaExpiracion: plan.fechaExpiracion ? plan.fechaExpiracion.split('T')[0] : '',
        precioProgramado: plan.precioProgramado || '',
        fechaCambioPrecio: plan.fechaCambioPrecio ? plan.fechaCambioPrecio.split('T')[0] : ''
      });
    } else {
      setEditandoId(null);
      setForm({
        nombre: '', precio: '', duracionDias: '30', limiteClasesMensual: '', descripcion: '', descripcionDetallada: '',
        precioReferenciaMensual: '', nivelAcceso: 'CrossFit', prioridadReserva: '1', requiereInscripcion: true,
        permiteScore: true, esVisible: true, incluyeGym: true,
        fechaActivacion: '', fechaExpiracion: '', precioProgramado: '', fechaCambioPrecio: ''
      });
    }
    setShowModal(true);
  };

  const guardarPlan = async (e) => {
    e.preventDefault();
    const endpoint = editandoId ? `${API_BASE}/planes/${editandoId}` : `${API_BASE}/planes`;
    const method = editandoId ? 'PUT' : 'POST';

    const payload = {
      ...form,
      idBox: box.idBox,
      precio: parseFloat(form.precio),
      diasDuracion: parseInt(form.duracionDias) || null,
      limiteClasesMensual: form.limiteClasesMensual ? parseInt(form.limiteClasesMensual) : null,
      prioridadReserva: parseInt(form.prioridadReserva) || 1,
      precioReferenciaMensual: form.precioReferenciaMensual ? parseFloat(form.precioReferenciaMensual) : null,
      precioProgramado: form.precioProgramado ? parseFloat(form.precioProgramado) : null,
      fechaActivacion: form.fechaActivacion ? new Date(form.fechaActivacion).toISOString() : null,
      fechaExpiracion: form.fechaExpiracion ? new Date(form.fechaExpiracion).toISOString() : null,
      fechaCambioPrecio: form.fechaCambioPrecio ? new Date(form.fechaCambioPrecio).toISOString() : null
    };

    try {
      const res = await fetch(endpoint, { method, headers: headersPost, body: JSON.stringify(payload) });
      if (res.ok) {
        setShowModal(false);
        cargarPlanes(box.idBox);
      } else { alert('Error al guardar el plan'); }
    } catch (e) { alert('Error de conexión'); }
  };

  const handleBeneficiosKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const ta = e.target;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const val = ta.value;
      const newVal = val.substring(0, start) + '\n• ' + val.substring(end);
      setForm({ ...form, descripcionDetallada: newVal });
      requestAnimationFrame(() => {
        ta.selectionStart = start + 3;
        ta.selectionEnd = start + 3;
      });
    }
  };

  // Calcula el porcentaje de ahorro para planes de varios meses
  const calcularAhorro = (precioTotal, precioReferenciaMensual, diasDuracion) => {
    if (!precioReferenciaMensual || !precioTotal || !diasDuracion) return null;
    const meses = Math.max(1, Math.round(diasDuracion / 30));
    const precioBaseTotal = precioReferenciaMensual * meses;
    if (precioBaseTotal <= precioTotal) return null;
    const ahorroDinero = precioBaseTotal - precioTotal;
    const ahorroPorcentaje = Math.round((ahorroDinero / precioBaseTotal) * 100);
    return { ahorroDinero, ahorroPorcentaje, meses };
  };

  return (
    <div className="wb-page">

      {/* ── NAVBAR ── */}
      <header className="wb-header">
        <div className="d-flex align-items-center justify-content-between gap-2">
          <div className="d-flex align-items-center gap-2 overflow-hidden">
            <BackButton to="/admin-box-panel" />
            <div className="wb-header-icon"><i className="fas fa-gem"></i></div>
            <h1 className="wb-header-title">Estrategia de <span>Membresías</span></h1>
          </div>
          <button onClick={() => abrirModal()} className="wb-nuevo-btn">
            <i className="fas fa-plus"></i>
            <span className="d-none d-sm-inline">Crear Plan</span>
            <span className="d-sm-none">Nuevo</span>
          </button>
        </div>
      </header>

      {/* ── CONTENIDO ── */}
      <div className="container-fluid px-3 px-md-4">

        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-wp"></div>
          </div>
        ) : planes.length === 0 ? (
          <div className="wb-empty">
            <i className="fas fa-tags wb-empty-icon"></i>
            <p className="wb-empty-text">No hay planes creados todavía.</p>
          </div>
        ) : (
          <div className="row g-3 g-md-4">
            {planes.map(p => {
              const ahorro = calcularAhorro(p.precio, p.precioReferenciaMensual, p.diasDuracion);
              const esFuturo = p.fechaActivacion && new Date(p.fechaActivacion) > new Date();
              const cambioProgramado = p.fechaCambioPrecio && new Date(p.fechaCambioPrecio) > new Date();

              return (
                <div key={p.idPlan} className="col-12 col-sm-6 col-xl-4">
                  <div className={`wb-card${esFuturo ? ' wb-card--futuro' : ''}${!p.esVisible ? ' wb-card--oculto' : ''}`}>

                    <div className="wb-card-stripe" />

                    {/* Badges */}
                    {!p.esVisible && !esFuturo && (
                      <span className="wb-badge-abs wb-badge-abs--oculto">
                        <i className="fas fa-eye-slash"></i> Oculto
                      </span>
                    )}
                    {esFuturo && (
                      <span className="wb-badge-abs wb-badge-abs--futuro">
                        <i className="fas fa-clock"></i> {new Date(p.fechaActivacion).toLocaleDateString()}
                      </span>
                    )}

                    <div className="wb-card-body">
                      <p className="wb-plan-nombre">{p.nombre}</p>

                      <div className="wb-precio-row">
                        <span className="wb-precio-monto">${p.precio}</span>
                        <span className="wb-precio-periodo">/ {p.diasDuracion} días</span>
                      </div>

                      {ahorro && (
                        <span className="wb-ahorro-badge">
                          <i className="fas fa-piggy-bank"></i>
                          Ahorra ${ahorro.ahorroDinero} ({ahorro.ahorroPorcentaje}%)
                        </span>
                      )}

                      <hr className="wb-divider" />

                      <ul className="wb-features">
                        <li className="wb-feature-item">
                          <i className={`fas fa-dumbbell ${p.nivelAcceso !== 'OpenGym' ? 'text-primary' : 'text-muted'}`}></i>
                          {p.nivelAcceso === 'CrossFit' ? 'Clases de CrossFit' : p.nivelAcceso === 'OpenGym' ? 'Solo Open Gym' : 'CrossFit + Gym'}
                        </li>
                        <li className="wb-feature-item">
                          <i className={`fas fa-building ${p.incluyeGym ? 'text-success' : 'text-danger'}`}></i>
                          {p.incluyeGym ? 'Incluye Open Gym' : 'Sin Open Gym'}
                        </li>
                        <li className="wb-feature-item">
                          <i className={`fas fa-crown ${p.requiereInscripcion ? 'text-warning' : 'text-muted'}`}></i>
                          {p.requiereInscripcion ? 'Suma racha de lealtad' : 'Sin racha de lealtad'}
                        </li>
                        <li className="wb-feature-item">
                          <i className={`fas fa-chart-line ${p.permiteScore ? 'text-info' : 'text-danger'}`}></i>
                          {p.permiteScore ? 'Sube scores a la pizarra' : 'Sin acceso a pizarra'}
                        </li>
                      </ul>

                      {p.descripcionDetallada && (
                        <>
                          <hr className="wb-divider" />
                          <ul className="wb-features">
                            {p.descripcionDetallada.split('\n').filter(l => l.trim()).map((linea, i) => (
                              <li key={i} className="wb-feature-item">
                                <i className="fas fa-circle wb-bullet-dot"></i>
                                {linea.replace(/^[•\s]+/, '')}
                              </li>
                            ))}
                          </ul>
                        </>
                      )}

                      {cambioProgramado && (
                        <div className="wb-alerta-precio">
                          <i className="fas fa-rocket"></i>
                          <span>El <strong>{new Date(p.fechaCambioPrecio).toLocaleDateString()}</strong> sube a <strong>${p.precioProgramado}</strong></span>
                        </div>
                      )}
                    </div>

                    <div className="wb-card-footer">
                      <button onClick={() => abrirModal(p)} className="wb-btn-configurar">
                        <i className="fas fa-sliders-h"></i> Configurar estrategia
                      </button>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── MODAL MAESTRO ── */}
      {showModal && (
        <div className="wb-overlay" onClick={() => setShowModal(false)}>
          <div className="wb-modal" onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="wb-modal-header">
              <h4 className="wb-modal-titulo">
                <i className="fas fa-dna"></i>
                {editandoId ? 'Editar ADN del Plan' : 'Crear Plan Maestro'}
              </h4>
              <button className="wb-modal-close" type="button" onClick={() => setShowModal(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <form onSubmit={guardarPlan}>
              <div className="wb-modal-body">
                <div className="row g-4">

                  {/* ─── 1. Comercial ─── */}
                  <div className="col-12">
                    <p className="wb-section-label wb-section-label--rojo">
                      <i className="fas fa-tag"></i> 1. Comercial y Precio
                    </p>
                    <div className="row g-3">
                      <div className="col-12 col-md-6">
                        <label className="wb-label">Nombre del Plan</label>
                        <input type="text" className="wb-input" required
                          value={form.nombre}
                          onChange={e => setForm({ ...form, nombre: e.target.value })} />
                      </div>
                      <div className="col-6 col-md-3">
                        <label className="wb-label">Precio ($)</label>
                        <input type="number" className="wb-input" required
                          value={form.precio}
                          onChange={e => setForm({ ...form, precio: e.target.value })} />
                      </div>
                      <div className="col-6 col-md-3">
                        <label className="wb-label">Duración (días)</label>
                        <input type="number" className="wb-input" required
                          value={form.duracionDias}
                          onChange={e => setForm({ ...form, duracionDias: e.target.value })} />
                      </div>
                    </div>
                  </div>

                  {/* ─── 2. Marketing ─── */}
                  <div className="col-12">
                    <p className="wb-section-label wb-section-label--verde">
                      <i className="fas fa-bullhorn"></i> 2. Marketing y Beneficios
                    </p>
                    <div className="row g-3">
                      <div className="col-12 col-md-4">
                        <label className="wb-label">Precio ref. mensual ($)</label>
                        <input type="number" className="wb-input" placeholder="Ej: 800"
                          value={form.precioReferenciaMensual}
                          onChange={e => setForm({ ...form, precioReferenciaMensual: e.target.value })} />
                        <p className="wb-helper">Para calcular % de ahorro en planes de 3+ meses</p>
                      </div>
                      <div className="col-12 col-md-8">
                        <label className="wb-label">Beneficios visibles al atleta</label>
                        <textarea className="wb-input" rows="3"
                          placeholder="• Playera al cumplir el año&#10;• Acceso a regaderas"
                          value={form.descripcionDetallada}
                          onFocus={() => { if (!form.descripcionDetallada) setForm({ ...form, descripcionDetallada: '• ' }); }}
                          onKeyDown={handleBeneficiosKeyDown}
                          onChange={e => setForm({ ...form, descripcionDetallada: e.target.value })}>
                        </textarea>
                      </div>
                    </div>
                  </div>

                  {/* ─── 3. Reglas ─── */}
                  <div className="col-12">
                    <p className="wb-section-label wb-section-label--warn">
                      <i className="fas fa-shield-alt"></i> 3. Reglas y Lealtad
                    </p>
                    <div className="row g-3">
                      <div className="col-12 col-md-6">
                        <label className="wb-label">Nivel de acceso</label>
                        <select className="wb-input"
                          value={form.nivelAcceso}
                          onChange={e => setForm({ ...form, nivelAcceso: e.target.value })}>
                          <option value="CrossFit">CrossFit</option>
                          <option value="OpenGym">Solo Gym</option>
                          <option value="Hibrido">Ambos</option>
                        </select>
                      </div>
                      <div className="col-12 col-md-6">
                        <label className="wb-label">Límite de visitas (vacío = ilimitado)</label>
                        <input type="number" className="wb-input" placeholder="Ej: 8 para cuponeras"
                          value={form.limiteClasesMensual}
                          onChange={e => setForm({ ...form, limiteClasesMensual: e.target.value })} />
                      </div>
                      <div className="col-12">
                        <div className="wb-switches-box">
                          <div className="form-check form-switch">
                            <input className="form-check-input bg-warning border-warning" type="checkbox" id="reqInsc"
                              checked={form.requiereInscripcion}
                              onChange={e => setForm({ ...form, requiereInscripcion: e.target.checked })} />
                            <label className="form-check-label text-warning small ms-1" htmlFor="reqInsc">
                              Requiere Inscripción (Lealtad)
                            </label>
                          </div>
                          <div className="form-check form-switch">
                            <input className="form-check-input" type="checkbox" id="incGym"
                              checked={form.incluyeGym}
                              onChange={e => setForm({ ...form, incluyeGym: e.target.checked })} />
                            <label className="form-check-label text-light small ms-1" htmlFor="incGym">
                              Incluye Open Gym
                            </label>
                          </div>
                          <div className="form-check form-switch">
                            <input className="form-check-input" type="checkbox" id="permScore"
                              checked={form.permiteScore}
                              onChange={e => setForm({ ...form, permiteScore: e.target.checked })} />
                            <label className="form-check-label text-light small ms-1" htmlFor="permScore">
                              Sube Scores a Pizarra
                            </label>
                          </div>
                          <div className="form-check form-switch">
                            <input className="form-check-input" type="checkbox" id="esVis"
                              checked={form.esVisible}
                              onChange={e => setForm({ ...form, esVisible: e.target.checked })} />
                            <label className="form-check-label text-light small ms-1" htmlFor="esVis">
                              Visible en App
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ─── 4. Programador ─── */}
                  <div className="col-12">
                    <p className="wb-section-label wb-section-label--info">
                      <i className="fas fa-rocket"></i> 4. Programador (Automatización)
                    </p>
                    <div className="wb-prog-box">
                      <div className="row g-3">
                        <div className="col-12 col-sm-6">
                          <label className="wb-label">Fecha de activación</label>
                          <RedGrayDatePicker
                            value={form.fechaActivacion}
                            onChange={v => setForm({ ...form, fechaActivacion: v })}
                            placeholder="Selecciona fecha de activación"
                            min={todayISO}
                          />
                        </div>
                        <div className="col-12 col-sm-6">
                          <label className="wb-label">Fecha de expiración</label>
                          <RedGrayDatePicker
                            value={form.fechaExpiracion}
                            onChange={v => setForm({ ...form, fechaExpiracion: v })}
                            placeholder="Selecciona fecha de expiración"
                            min={todayISO}
                          />
                        </div>
                        <div className="col-12">
                          <span className="wb-prog-sublabel">
                            <i className="fas fa-coins me-1"></i> Subida de precio programada
                          </span>
                        </div>
                        <div className="col-12 col-sm-6">
                          <label className="wb-label">Nuevo precio futuro ($)</label>
                          <input type="number" className="wb-input" placeholder="Ej: 900"
                            value={form.precioProgramado}
                            onChange={e => setForm({ ...form, precioProgramado: e.target.value })} />
                        </div>
                        <div className="col-12 col-sm-6">
                          <label className="wb-label">Fecha del aumento</label>
                          <RedGrayDatePicker
                            value={form.fechaCambioPrecio}
                            onChange={v => setForm({ ...form, fechaCambioPrecio: v })}
                            placeholder="Selecciona fecha del aumento"
                            min={todayISO}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              {/* Footer */}
              <div className="wb-modal-footer">
                <button type="button" onClick={() => setShowModal(false)} className="wb-btn-cancel">
                  Cancelar
                </button>
                <button type="submit" className="wb-btn-save">
                  <i className="fas fa-save"></i> Confirmar Estrategia
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
