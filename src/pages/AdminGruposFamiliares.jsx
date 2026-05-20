/* eslint-disable no-unused-vars, react-hooks/set-state-in-effect */
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import BackButton from '../components/BackButton';
import GeneroPicker from '../components/GeneroPicker';
import SelectorPlanPicker from '../components/SelectorPlanPicker';
import MetodoPagoPicker from '../components/MetodoPagoPicker';
import { api, API_BASE_URL_CONST } from '../services/api';
import '../assets/css/AdminGruposFamiliares.css';

// ============================================================
//  HELPERS DE VALIDACIÓN (mismo patrón que RegistroManual.jsx)
// ============================================================
// Solo letras (con acentos españoles), eñes y espacios
const REGEX_SOLO_LETRAS = /[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g;
// Solo números, +, -, espacio
const REGEX_TELEFONO = /[^0-9+\-\s]/g;

function limpiarNombre(v) {
  return (v || '').replace(REGEX_SOLO_LETRAS, '').slice(0, 50);
}

function limpiarTelefono(v) {
  return (v || '').replace(REGEX_TELEFONO, '').slice(0, 10);
}

function limpiarCorreo(v) {
  return (v || '').replace(/\s/g, '').slice(0, 100);
}

// ============================================================
//  CONSTANTES
// ============================================================
const DESCUENTOS_PROGRESIVOS = [
  { miembros: 4, porcentaje: 10 },
  { miembros: 5, porcentaje: 12 },
  { miembros: 6, porcentaje: 15 },
  { miembros: 7, porcentaje: 20 }
];

function calcularDescuentoProgresivo(total) {
  if (total >= 7) return 20;
  if (total === 6) return 15;
  if (total === 5) return 12;
  if (total === 4) return 10;
  return 0;
}

// ============================================================
//  COMPONENTE PRINCIPAL
// ============================================================
export default function AdminGruposFamiliares() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [box, setBox] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('panel'); // 'panel' | 'builder'

  // Datos
  const [grupos, setGrupos] = useState([]);
  const [atletasDisponibles, setAtletasDisponibles] = useState([]);
  const [planes, setPlanes] = useState([]);

  // Modales
  const [modalCobro, setModalCobro] = useState({ open: false, grupo: null });
  const [modalDisolver, setModalDisolver] = useState({ open: false, grupo: null });
  const [modalDetalle, setModalDetalle] = useState({ open: false, grupo: null });

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem('usuario'));
    const b = JSON.parse(localStorage.getItem('box'));
    if (!u) { navigate('/login'); return; }
    setUser(u);
    setBox(b);
    if (b?.idBox) cargarTodo(b.idBox);
    else setLoading(false);
  }, [navigate]);

  async function cargarTodo(idBox) {
    setLoading(true);
    try {
      const [g, a, p] = await Promise.all([
        api.obtenerGruposFamiliaresPorBox(idBox).catch(err => {
          console.error("Error al obtener grupos familiares:", err);
          return [];
        }),
        api.obtenerAtletasDisponiblesParaGrupo(idBox).catch(err => {
          console.error("Error al obtener atletas disponibles:", err);
          return [];
        }),
        fetch(`${API_BASE_URL_CONST}/Finanzas/planes/${idBox}`)
          .then(r => {
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            return r.json();
          })
          .catch(err => {
            console.error("Error al obtener planes:", err);
            return [];
          })
      ]);
      setGrupos(Array.isArray(g) ? g : []);
      setAtletasDisponibles(Array.isArray(a) ? a : []);
      setPlanes(Array.isArray(p) ? p : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="agf-loading">
        <div className="agf-spinner" />
        <p>Cargando escuadrones…</p>
      </div>
    );
  }

  return (
    <div className="agf-page">
      {/* ============ HEADER ============ */}
      <header className="agf-header">
        <div className="d-flex align-items-center justify-content-between gap-3">
          <div className="d-flex align-items-center gap-3">
            <BackButton to="/admin-box-panel" />
            <div className="agf-header-icon d-none d-sm-flex">
              <i className="fas fa-users" />
            </div>
            <div>
              <h1 className="agf-title">
                Escuadrones <span>Familiares</span>
              </h1>
              <p className="agf-subtitle">
                Arma manadas, aplica descuentos progresivos y cobra una sola vez al líder.
              </p>
            </div>
          </div>
          <span className="agf-badge-count">{grupos.length}</span>
        </div>

        {/* TABS */}
        <div className="agf-tabs mt-3">
          <button
            className={`agf-tab ${tab === 'panel' ? 'active' : ''}`}
            onClick={() => setTab('panel')}
          >
            <i className="fas fa-shield-alt" />
            <span>Escuadrones Activos</span>
          </button>
          <button
            className={`agf-tab ${tab === 'builder' ? 'active' : ''}`}
            onClick={() => setTab('builder')}
          >
            <i className="fas fa-plus-circle" />
            <span>Squad Builder</span>
          </button>
        </div>
      </header>

      {/* ============ CONTENIDO ============ */}
      <div className="agf-content container px-3 px-md-4 py-4">
        {tab === 'panel' && (
          <PanelEscuadrones
            grupos={grupos}
            onCobrar={(g) => setModalCobro({ open: true, grupo: g })}
            onDisolver={(g) => setModalDisolver({ open: true, grupo: g })}
            onDetalle={(g) => setModalDetalle({ open: true, grupo: g })}
          />
        )}

        {tab === 'builder' && (
          <SquadBuilder
            atletasDisponibles={atletasDisponibles}
            planes={planes}
            idBox={box?.idBox}
            onCreado={() => {
              setTab('panel');
              cargarTodo(box?.idBox);
            }}
          />
        )}
      </div>

      {/* ============ MODALES ============ */}
      <AnimatePresence>
        {modalCobro.open && (
          <ModalCobroGrupo
            grupo={modalCobro.grupo}
            onClose={() => setModalCobro({ open: false, grupo: null })}
            onPagado={() => {
              setModalCobro({ open: false, grupo: null });
              cargarTodo(box?.idBox);
            }}
          />
        )}

        {modalDisolver.open && (
          <ModalConfirmar
            titulo="¿Disolver escuadrón?"
            mensaje={`El escuadrón "${modalDisolver.grupo?.nombreGrupo}" se disolverá y sus miembros (excepto el líder) perderán sus beneficios.`}
            confirmTexto="Sí, disolver"
            tipo="danger"
            onCancel={() => setModalDisolver({ open: false, grupo: null })}
            onConfirm={async () => {
              try {
                await api.disolverGrupoFamiliar(modalDisolver.grupo.idGrupo);
                setModalDisolver({ open: false, grupo: null });
                cargarTodo(box?.idBox);
              } catch (e) {
                alert('No se pudo disolver: ' + e.message);
              }
            }}
          />
        )}

        {modalDetalle.open && (
          <ModalDetalleGrupo
            grupo={modalDetalle.grupo}
            onClose={() => setModalDetalle({ open: false, grupo: null })}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================
//  PESTAÑA 1: PANEL DE ESCUADRONES
// ============================================================
function PanelEscuadrones({ grupos, onCobrar, onDisolver, onDetalle }) {
  if (grupos.length === 0) {
    return (
      <div className="agf-empty">
        <i className="fas fa-users d-block" />
        <h3>Aún no hay escuadrones familiares</h3>
        <p>Crea tu primer escuadrón en la pestaña "Squad Builder".</p>
      </div>
    );
  }

  return (
    <div className="row g-4">
      {grupos.map(g => (
        <div key={g.idGrupo} className="col-12 col-lg-6">
          <CardEscuadron
            grupo={g}
            onCobrar={onCobrar}
            onDisolver={onDisolver}
            onDetalle={onDetalle}
          />
        </div>
      ))}
    </div>
  );
}

function CardEscuadron({ grupo, onCobrar, onDisolver, onDetalle }) {
  const estatus = grupo.estatusPago || 'SinPago';
  const estatusConfig = {
    Pagado:    { label: 'PAGADO',    class: 'agf-status--pagado',    icon: 'fa-check-circle' },
    Vencido:   { label: 'VENCIDO',   class: 'agf-status--vencido',   icon: 'fa-exclamation-triangle' },
    SinPago:   { label: 'SIN PAGO',  class: 'agf-status--sinpago',   icon: 'fa-clock' },
    Congelado: { label: 'CONGELADO', class: 'agf-status--congelado', icon: 'fa-snowflake' }
  }[estatus] || { label: estatus, class: 'agf-status--sinpago', icon: 'fa-info-circle' };

  const fechaVenc = grupo.fechaVencimientoLider
    ? new Date(grupo.fechaVencimientoLider).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
    : 'Sin establecer';

  return (
    <motion.div
      className="agf-squad-card"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="agf-squad-glow" />

      {/* Header */}
      <div className="d-flex justify-content-between align-items-start mb-3">
        <div className="flex-grow-1">
          <h3 className="agf-squad-name" onClick={() => onDetalle(grupo)}>
            <i className="fas fa-shield-alt me-2" />
            {grupo.nombreGrupo}
          </h3>
          <div className="agf-squad-meta">
            {grupo.totalMiembros} integrantes
            <span className="agf-divider">·</span>
            <strong className="agf-discount-tag">
              {Number(grupo.valorDescuentoGrupo || 0).toFixed(0)}% Descuento
            </strong>
          </div>
        </div>

        <span className={`agf-status-badge ${estatusConfig.class}`}>
          <i className={`fas ${estatusConfig.icon}`} />
          {estatusConfig.label}
        </span>
      </div>

      {/* Líder destacado */}
      {grupo.lider && (
        <div className="agf-lider-row">
          <div className="agf-lider-avatar">
            {grupo.lider.foto
              ? <img src={grupo.lider.foto} alt={grupo.lider.nombre} />
              : <span>{grupo.lider.nombre?.charAt(0).toUpperCase()}</span>}
            <i className="fas fa-crown agf-crown" />
          </div>
          <div className="flex-grow-1 overflow-hidden">
            <small className="agf-lider-label">LÍDER DE ESCUADRÓN</small>
            <div className="agf-lider-name text-truncate">
              {grupo.lider.nombre} {grupo.lider.apellidos || ''}
            </div>
            <small className="agf-lider-mail text-truncate d-block">{grupo.lider.correo}</small>
          </div>
        </div>
      )}

      {/* Burbujas de miembros */}
      <div className="agf-miembros-strip">
        {(grupo.miembros || []).filter(m => m.rolEnGrupo !== 'Lider').slice(0, 8).map(m => (
          <div key={m.idMiembro} className="agf-miembro-bubble" title={`${m.nombre} ${m.apellidos || ''}`}>
            {m.foto
              ? <img src={m.foto} alt={m.nombre} />
              : <span>{m.nombre?.charAt(0).toUpperCase()}</span>}
          </div>
        ))}
        {grupo.totalMiembros > 9 && (
          <div className="agf-miembro-bubble agf-miembro-bubble--more">
            +{grupo.totalMiembros - 9}
          </div>
        )}
      </div>

      {/* Fecha de corte */}
      <div className="agf-fecha-row">
        <i className="fas fa-calendar-alt" />
        <span>Próximo corte: <strong>{fechaVenc}</strong></span>
      </div>

      {/* Acciones */}
      <div className="agf-actions">
        <button className="agf-btn agf-btn--primary" onClick={() => onCobrar(grupo)}>
          <i className="fas fa-cash-register" />
          <span>Cobrar Mensualidad</span>
        </button>
        <button className="agf-btn agf-btn--ghost" onClick={() => onDetalle(grupo)}>
          <i className="fas fa-eye" />
          <span>Detalles</span>
        </button>
        <button className="agf-btn agf-btn--danger" onClick={() => onDisolver(grupo)} title="Disolver">
          <i className="fas fa-times" />
        </button>
      </div>
    </motion.div>
  );
}

// ============================================================
//  PESTAÑA 2: SQUAD BUILDER
// ============================================================
function SquadBuilder({ atletasDisponibles, planes, idBox, onCreado }) {
  const [nombreGrupo, setNombreGrupo] = useState('');
  const [slots, setSlots] = useState([
    { id: 1, esLider: true, tipo: null, data: null },
    { id: 2, esLider: false, tipo: null, data: null },
    { id: 3, esLider: false, tipo: null, data: null },
    { id: 4, esLider: false, tipo: null, data: null }
  ]);
  const [modalSlot, setModalSlot] = useState({ open: false, slotIdx: null });
  const [enviando, setEnviando] = useState(false);
  const [descuentoManual, setDescuentoManual] = useState('');

  const totalSlotsLlenos = slots.filter(s => s.data).length;
  const porcentajeAuto = calcularDescuentoProgresivo(totalSlotsLlenos);
  const porcentajeAplicado = descuentoManual !== '' ? Number(descuentoManual) : porcentajeAuto;

  // Suma de precios
  const sumaBruta = useMemo(() => {
    return slots.reduce((sum, s) => {
      if (!s.data) return sum;
      const idPlan = s.data.idPlan;
      const plan = planes.find(p => p.idPlan === idPlan);
      return sum + (plan?.precio || 0);
    }, 0);
  }, [slots, planes]);

  const totalConDescuento = sumaBruta * (1 - porcentajeAplicado / 100);

  function agregarSlot() {
    setSlots(prev => [...prev, { id: Date.now(), esLider: false, tipo: null, data: null }]);
  }

  function quitarSlot(idx) {
    if (slots.length <= 4) return;
    setSlots(prev => prev.filter((_, i) => i !== idx));
  }

  function asignarSlot(idx, tipo, data) {
    setSlots(prev => prev.map((s, i) => i === idx ? { ...s, tipo, data } : s));
    setModalSlot({ open: false, slotIdx: null });
  }

  function limpiarSlot(idx) {
    setSlots(prev => prev.map((s, i) => i === idx ? { ...s, tipo: null, data: null } : s));
  }

  function moverLider(idx) {
    setSlots(prev => prev.map((s, i) => ({ ...s, esLider: i === idx })));
  }

  async function crearEscuadron() {
    if (!nombreGrupo.trim()) {
      alert('Necesitas un nombre para el escuadrón.');
      return;
    }
    if (totalSlotsLlenos < 4) {
      alert('Mínimo 4 integrantes.');
      return;
    }

    const liderIdx = slots.findIndex(s => s.esLider);
    if (liderIdx < 0 || !slots[liderIdx].data) {
      alert('Debes designar un líder (con datos completos).');
      return;
    }

    const existentes = [];
    const nuevos = [];
    let indiceLiderNuevo = null;
    let idUsuarioLider = null;
    let contadorNuevos = 0;

    slots.forEach((s) => {
      if (!s.data) return;
      if (s.tipo === 'existente') {
        existentes.push(s.data.idUsuario);
        if (s.esLider) idUsuarioLider = s.data.idUsuario;
      } else if (s.tipo === 'nuevo') {
        nuevos.push({
          nombre: s.data.nombre,
          apellidos: s.data.apellidos,
          correo: s.data.correo,
          telefono: s.data.telefono,
          genero: s.data.genero,
          fechaNacimiento: s.data.fechaNacimiento || null,
          idPlan: s.data.idPlan
        });
        if (s.esLider) indiceLiderNuevo = contadorNuevos;
        contadorNuevos++;
      }
    });

    setEnviando(true);
    try {
      await api.crearGrupoFamiliar({
        idBox,
        nombreGrupo: nombreGrupo.trim(),
        miembrosExistentesIds: existentes,
        miembrosNuevos: nuevos,
        idUsuarioLider,
        indiceLiderNuevo,
        porcentajeDescuentoManual: descuentoManual !== '' ? Number(descuentoManual) : null,
        notas: null
      });
      alert('¡Escuadrón creado con éxito!');
      onCreado();
    } catch (e) {
      alert('No se pudo crear: ' + e.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="agf-builder">
      {/* Encabezado */}
      <div className="agf-builder-header">
        <div className="flex-grow-1">
          <label className="agf-input-label">Nombre del Escuadrón</label>
          <input
            className="agf-input"
            placeholder="Ej. Familia Ramírez"
            value={nombreGrupo}
            onChange={e => setNombreGrupo(e.target.value)}
          />
        </div>
        <div className="agf-builder-stats">
          <div className="agf-stat">
            <span className="agf-stat-num">{totalSlotsLlenos}</span>
            <span className="agf-stat-label">Integrantes</span>
          </div>
          <div className="agf-stat agf-stat--accent">
            <span className="agf-stat-num">{porcentajeAplicado}%</span>
            <span className="agf-stat-label">Descuento</span>
          </div>
        </div>
      </div>

      {/* Tabla progresiva */}
      <div className="agf-discount-table">
        {DESCUENTOS_PROGRESIVOS.map(d => (
          <div
            key={d.miembros}
            className={`agf-discount-cell ${totalSlotsLlenos >= d.miembros ? 'active' : ''}`}
          >
            <span className="agf-dc-miembros">{d.miembros}{d.miembros === 7 ? '+' : ''}</span>
            <span className="agf-dc-desc">{d.porcentaje}%</span>
          </div>
        ))}
      </div>

      {/* Grid de Slots */}
      <div className="agf-slots-grid">
        {slots.map((slot, idx) => (
          <SlotCard
            key={slot.id}
            slot={slot}
            idx={idx}
            puedeQuitar={slots.length > 4}
            planes={planes}
            onAbrir={() => setModalSlot({ open: true, slotIdx: idx })}
            onLimpiar={() => limpiarSlot(idx)}
            onQuitar={() => quitarSlot(idx)}
            onHacerLider={() => moverLider(idx)}
          />
        ))}

        {/* Agregar slot */}
        <button className="agf-add-slot" onClick={agregarSlot}>
          <i className="fas fa-plus" />
          <span>Añadir slot</span>
        </button>
      </div>

      {/* Calculadora */}
      <div className="agf-calculator">
        <div className="agf-calc-row">
          <span>Suma bruta de planes</span>
          <strong>${sumaBruta.toFixed(2)}</strong>
        </div>
        <div className="agf-calc-row">
          <span>Descuento grupal</span>
          <strong className="text-danger">- ${(sumaBruta * porcentajeAplicado / 100).toFixed(2)}</strong>
        </div>
        <div className="agf-calc-row agf-calc-total">
          <span>Total que pagará el líder</span>
          <strong className="agf-total-amount">${totalConDescuento.toFixed(2)}</strong>
        </div>

        <div className="agf-calc-controls">
          <label className="agf-input-label-sm">Ajuste manual de descuento (%)</label>
          <input
            type="number"
            className="agf-input agf-input--sm"
            placeholder={`Auto: ${porcentajeAuto}%`}
            value={descuentoManual}
            min={0}
            max={100}
            onChange={e => setDescuentoManual(e.target.value)}
          />
        </div>
      </div>

      {/* CTA */}
      <div className="agf-cta-row">
        {totalSlotsLlenos < 4 && (
          <p className="agf-warning">
            <i className="fas fa-exclamation-triangle" />
            Mínimo 4 integrantes para crear el escuadrón.
          </p>
        )}
        <button
          className="agf-btn-create"
          disabled={enviando || totalSlotsLlenos < 4}
          onClick={crearEscuadron}
        >
          {enviando ? <><div className="agf-spinner agf-spinner--sm" /> Creando…</> : <><i className="fas fa-shield-alt" /> Crear Escuadrón</>}
        </button>
      </div>

      {/* Modal slot */}
      <AnimatePresence>
        {modalSlot.open && (
          <ModalSeleccionMiembro
            atletasDisponibles={atletasDisponibles}
            atletasYaUsados={slots.filter(s => s.tipo === 'existente').map(s => s.data?.idUsuario)}
            planes={planes}
            onClose={() => setModalSlot({ open: false, slotIdx: null })}
            onSeleccionar={(tipo, data) => asignarSlot(modalSlot.slotIdx, tipo, data)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================
//  SLOT CARD
// ============================================================
function SlotCard({ slot, idx, puedeQuitar, planes, onAbrir, onLimpiar, onQuitar, onHacerLider }) {
  const tienePersona = !!slot.data;
  const datos = slot.data;
  const planNombre = datos?.idPlan ? (planes.find(p => p.idPlan === datos.idPlan)?.nombre || 'Plan asignado') : 'Sin plan';

  return (
    <motion.div
      className={`agf-slot ${slot.esLider ? 'agf-slot--lider' : ''} ${tienePersona ? 'agf-slot--lleno' : 'agf-slot--vacio'}`}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
    >
      {slot.esLider && (
        <div className="agf-slot-lider-badge">
          <i className="fas fa-crown" />
          <span>LÍDER</span>
        </div>
      )}

      {!tienePersona ? (
        <button className="agf-slot-empty-btn" onClick={onAbrir}>
          <div className="agf-slot-plus-circle">
            <i className="fas fa-plus" />
          </div>
          <span>Slot {idx + 1}</span>
          <small>{slot.esLider ? 'Designa al líder' : 'Añadir integrante'}</small>
        </button>
      ) : (
        <div className="agf-slot-content">
          <div className="agf-slot-avatar">
            {datos.foto
              ? <img src={datos.foto} alt={datos.nombre} />
              : <span>{datos.nombre?.charAt(0).toUpperCase()}</span>}
          </div>
          <div className="agf-slot-info">
            <div className="agf-slot-name">{datos.nombre} {datos.apellidos || ''}</div>
            <small className="agf-slot-mail text-truncate d-block">{datos.correo}</small>
            <span className={`agf-slot-tipo ${slot.tipo === 'nuevo' ? 'agf-slot-tipo--nuevo' : 'agf-slot-tipo--existente'}`}>
              {slot.tipo === 'nuevo' ? <><i className="fas fa-sparkles" /> NUEVO</> : <><i className="fas fa-user-check" /> EXISTENTE</>}
            </span>
            <small className="agf-slot-plan">
              <i className="fas fa-tag" /> {planNombre}
            </small>
          </div>
          <div className="agf-slot-actions">
            {!slot.esLider && (
              <button className="agf-slot-mini-btn" onClick={onHacerLider} title="Hacer líder">
                <i className="fas fa-crown" />
              </button>
            )}
            <button className="agf-slot-mini-btn agf-slot-mini-btn--remove" onClick={onLimpiar} title="Limpiar slot">
              <i className="fas fa-undo" />
            </button>
            {puedeQuitar && (
              <button className="agf-slot-mini-btn agf-slot-mini-btn--remove" onClick={onQuitar} title="Eliminar slot">
                <i className="fas fa-trash" />
              </button>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ============================================================
//  MODAL: SELECCIÓN DE MIEMBRO (existente o nuevo)
// ============================================================
function ModalSeleccionMiembro({ atletasDisponibles, atletasYaUsados, planes, onClose, onSeleccionar }) {
  const [modo, setModo] = useState('existente');
  const [busqueda, setBusqueda] = useState('');
  const [limite, setLimite] = useState(20);

  // Form nuevo
  const [form, setForm] = useState({
    nombre: '', apellidos: '', correo: '', telefono: '',
    genero: '', fechaNacimiento: '', idPlan: ''
  });
  const [errores, setErrores] = useState({});

  // Para el flujo "existente": al hacer click muestra paso 2 para escoger plan
  const [atletaSeleccionado, setAtletaSeleccionado] = useState(null);
  const [planParaExistente, setPlanParaExistente] = useState('');

  // Resetear el límite cuando cambie la búsqueda
  useEffect(() => {
    setLimite(20);
  }, [busqueda]);

  const atletasFiltradosCompleto = useMemo(() => {
    return (atletasDisponibles || [])
      .filter(a => !atletasYaUsados.includes(a.idUsuario))
      .filter(a => {
        // Filtro estricto en frontend: Solo atletas
        const rol = (a.rol || a.Rol || '').toLowerCase();
        return rol === 'atleta';
      })
      .filter(a => {
        const q = busqueda.toLowerCase().trim();
        if (!q) return true;
        const nombreCompleto = `${a.nombre || ''} ${a.apellidos || ''}`.toLowerCase();
        return nombreCompleto.includes(q) || (a.correo || '').toLowerCase().includes(q);
      });
  }, [atletasDisponibles, atletasYaUsados, busqueda]);

  const atletasFiltrados = useMemo(() => {
    return atletasFiltradosCompleto.slice(0, limite);
  }, [atletasFiltradosCompleto, limite]);

  const tieneMasAtletas = atletasFiltradosCompleto.length > limite;

  // ────────────────────────────────────────────
  //  Flujo EXISTENTE — Paso 1: lista, Paso 2: plan
  // ────────────────────────────────────────────
  function elegirAtletaExistente(atleta) {
    // Si ya tenía un plan activo, lo pre-seleccionamos
    setAtletaSeleccionado(atleta);
    setPlanParaExistente(atleta.idPlanActual || planes[0]?.idPlan || '');
  }

  function confirmarExistente() {
    if (!planParaExistente) {
      alert('Debes seleccionar un plan para este atleta.');
      return;
    }
    onSeleccionar('existente', {
      idUsuario: atletaSeleccionado.idUsuario,
      nombre: atletaSeleccionado.nombre,
      apellidos: atletaSeleccionado.apellidos,
      correo: atletaSeleccionado.correo,
      foto: atletaSeleccionado.foto,
      idPlan: Number(planParaExistente)
    });
  }

  // ────────────────────────────────────────────
  //  Flujo NUEVO — validación robusta
  // ────────────────────────────────────────────
  function validarFormNuevo() {
    const errs = {};
    if (!form.nombre.trim()) errs.nombre = 'El nombre es obligatorio.';
    else if (form.nombre.trim().length < 2) errs.nombre = 'Nombre demasiado corto.';

    if (!form.apellidos.trim()) errs.apellidos = 'Los apellidos son obligatorios.';

    if (!form.correo.trim()) errs.correo = 'El correo es obligatorio.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.correo)) errs.correo = 'Correo inválido.';

    if (!form.telefono.trim()) errs.telefono = 'El teléfono es obligatorio.';
    else if (form.telefono.replace(/\D/g, '').length < 10) errs.telefono = 'Debe tener 10 dígitos.';

    if (!form.genero) errs.genero = 'Selecciona el género.';
    if (!form.fechaNacimiento) errs.fechaNacimiento = 'Selecciona la fecha de nacimiento.';
    if (!form.idPlan) errs.idPlan = 'Asigna un plan inicial.';

    setErrores(errs);
    return Object.keys(errs).length === 0;
  }

  function aceptarNuevo() {
    if (!validarFormNuevo()) return;
    onSeleccionar('nuevo', { ...form, idPlan: Number(form.idPlan) });
  }

  return (
    <motion.div
      className="agf-modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="agf-modal"
        onClick={e => e.stopPropagation()}
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
      >
        <button className="agf-modal-close" onClick={onClose}>
          <i className="fas fa-times" />
        </button>

        <h2 className="agf-modal-title">
          <i className="fas fa-user-plus" /> Agregar al escuadrón
        </h2>

        {/* Sub-tabs (se ocultan si estamos en el paso 2 del flujo existente) */}
        {!atletaSeleccionado && (
          <div className="agf-modal-tabs">
            <button
              className={`agf-modal-tab ${modo === 'existente' ? 'active' : ''}`}
              onClick={() => setModo('existente')}
            >
              <i className="fas fa-user-check" /> Lobo Existente
            </button>
            <button
              className={`agf-modal-tab ${modo === 'nuevo' ? 'active' : ''}`}
              onClick={() => setModo('nuevo')}
            >
              <i className="fas fa-paw" /> Alta de Familiar
            </button>
          </div>
        )}

        {/* ============ MODO EXISTENTE — PASO 2 (plan) ============ */}
        {atletaSeleccionado ? (
          <div className="agf-paso2">
            <button className="agf-back-link" onClick={() => setAtletaSeleccionado(null)}>
              <i className="fas fa-arrow-left" /> Volver
            </button>

            <div className="agf-paso2-atleta">
              <div className="agf-atleta-avatar agf-atleta-avatar--lg">
                {atletaSeleccionado.foto
                  ? <img src={atletaSeleccionado.foto} alt={atletaSeleccionado.nombre} />
                  : <span>{atletaSeleccionado.nombre?.charAt(0).toUpperCase()}</span>}
              </div>
              <div>
                <div className="agf-paso2-nombre">{atletaSeleccionado.nombre} {atletaSeleccionado.apellidos || ''}</div>
                <small className="agf-text-muted">{atletaSeleccionado.correo}</small>
                {atletaSeleccionado.nombrePlan && (
                  <div className="agf-paso2-plan-actual">
                    <i className="fas fa-history" /> Plan actual: <strong>{atletaSeleccionado.nombrePlan}</strong>
                  </div>
                )}
              </div>
            </div>

            <div className="agf-paso2-form">
              <label className="agf-input-label">
                <i className="fas fa-tag" /> Plan dentro del escuadrón *
              </label>
              <SelectorPlanPicker
                planes={planes}
                valor={planParaExistente}
                onCambiar={setPlanParaExistente}
              />
              <p className="agf-help-text">
                Este será el plan que se aplicará al unirse al grupo familiar. El descuento grupal se calculará sobre su precio.
              </p>
            </div>

            <button className="agf-btn-create mt-3" onClick={confirmarExistente}>
              <i className="fas fa-check" /> Confirmar e incorporar al escuadrón
            </button>
          </div>
        ) : modo === 'existente' ? (
          /* ============ MODO EXISTENTE — PASO 1 (lista) ============ */
          <div className="agf-existente-pane">
            <div className="agf-search">
              <i className="fas fa-search" />
              <input
                placeholder="Buscar por nombre o correo..."
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
              />
            </div>

            <div className="agf-atletas-count">
              <i className="fas fa-users" />
              <span>{atletasFiltradosCompleto.length} {atletasFiltradosCompleto.length === 1 ? 'lobo disponible' : 'lobos disponibles'}</span>
            </div>

            <div className="agf-atletas-list">
              {atletasFiltrados.length === 0 ? (
                <div className="agf-empty-small">
                  <i className="fas fa-paw" />
                  <p>
                    {(atletasDisponibles || []).length === 0
                      ? 'No hay atletas disponibles en este box. Puedes dar de alta nuevos familiares en la otra pestaña.'
                      : busqueda
                        ? `Ningún atleta coincide con "${busqueda}".`
                        : 'Todos los atletas ya están en escuadrones o asignados.'}
                  </p>
                </div>
              ) : (
                <>
                  {atletasFiltrados.map(a => {
                    const inicial = (a.nombre || a.correo || 'L').charAt(0).toUpperCase();
                    const nombreMostrar = a.nombre ? `${a.nombre} ${a.apellidos || ''}` : (a.correo ? a.correo.split('@')[0] : 'Lobo sin nombre');
                    return (
                      <div
                        key={a.idUsuario}
                        className="agf-atleta-card"
                        role="button"
                        tabIndex={0}
                        onClick={() => elegirAtletaExistente(a)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            elegirAtletaExistente(a);
                          }
                        }}
                      >
                        <div className="agf-atleta-avatar">
                          {a.foto
                            ? <img src={a.foto} alt={nombreMostrar} />
                            : <span>{inicial}</span>}
                        </div>
                        <div className="agf-atleta-info">
                          <div className="agf-atleta-nombre">
                            {nombreMostrar}
                          </div>
                          <small className="agf-atleta-correo">{a.correo}</small>
                          <div className="agf-atleta-tags">
                            {a.nombrePlan && (
                              <span className="agf-mini-tag agf-tag-plan">
                                <i className="fas fa-tag" /> {a.nombrePlan}
                              </span>
                            )}
                            {a.estatusSuscripcion === 'Activa' && (
                              <span className="agf-mini-tag agf-tag-activo">
                                <i className="fas fa-check-circle" /> Activa
                              </span>
                            )}
                            {a.estatusSuscripcion === 'Vencida' && (
                              <span className="agf-mini-tag agf-tag-vencido">
                                <i className="fas fa-exclamation-triangle" /> Vencida
                              </span>
                            )}
                          </div>
                        </div>
                        <i className="fas fa-chevron-right agf-atleta-chevron" />
                      </div>
                    );
                  })}
                  {tieneMasAtletas && (
                    <button
                      className="agf-btn agf-btn--ghost mt-2 mb-2 w-100 py-3"
                      style={{ borderRadius: '12px', borderStyle: 'dashed' }}
                      onClick={() => setLimite(prev => prev + 20)}
                    >
                      <i className="fas fa-chevron-down me-1" /> Cargar más lobos ({atletasFiltradosCompleto.length - limite} restantes)
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        ) : (
          /* ============ MODO NUEVO — FORMULARIO ============ */
          <div className="agf-nuevo-pane">
            <div className="agf-form-grid">
              <div className="agf-field">
                <label className="agf-input-label">
                  <i className="fas fa-user" /> Nombre *
                </label>
                <input
                  className={`agf-input ${errores.nombre ? 'agf-input--error' : ''}`}
                  maxLength={50}
                  placeholder="Ej. Juan"
                  value={form.nombre}
                  onChange={e => setForm({ ...form, nombre: limpiarNombre(e.target.value) })}
                />
                {errores.nombre && <small className="agf-error-msg">{errores.nombre}</small>}
              </div>

              <div className="agf-field">
                <label className="agf-input-label">
                  <i className="fas fa-user" /> Apellidos *
                </label>
                <input
                  className={`agf-input ${errores.apellidos ? 'agf-input--error' : ''}`}
                  maxLength={50}
                  placeholder="Ej. Pérez González"
                  value={form.apellidos}
                  onChange={e => setForm({ ...form, apellidos: limpiarNombre(e.target.value) })}
                />
                {errores.apellidos && <small className="agf-error-msg">{errores.apellidos}</small>}
              </div>

              <div className="agf-field">
                <label className="agf-input-label">
                  <i className="fas fa-envelope" /> Correo *
                </label>
                <input
                  className={`agf-input ${errores.correo ? 'agf-input--error' : ''}`}
                  type="email"
                  maxLength={100}
                  placeholder="familiar@ejemplo.com"
                  value={form.correo}
                  onChange={e => setForm({ ...form, correo: limpiarCorreo(e.target.value) })}
                />
                {errores.correo && <small className="agf-error-msg">{errores.correo}</small>}
              </div>

              <div className="agf-field">
                <label className="agf-input-label">
                  <i className="fas fa-phone" /> Teléfono (10 dígitos) *
                </label>
                <input
                  className={`agf-input ${errores.telefono ? 'agf-input--error' : ''}`}
                  type="tel"
                  placeholder="Ej. 6621234567"
                  value={form.telefono}
                  onChange={e => setForm({ ...form, telefono: limpiarTelefono(e.target.value) })}
                />
                {errores.telefono && <small className="agf-error-msg">{errores.telefono}</small>}
              </div>

              <div className="agf-field">
                <label className="agf-input-label">
                  <i className="fas fa-venus-mars" /> Género *
                </label>
                <GeneroPicker
                  valor={form.genero}
                  onCambiar={v => setForm({ ...form, genero: v })}
                />
                {errores.genero && <small className="agf-error-msg">{errores.genero}</small>}
              </div>

              <div className="agf-field">
                <label className="agf-input-label">
                  <i className="fas fa-birthday-cake" /> Fecha de Nacimiento *
                </label>
                <input
                  className={`agf-input ${errores.fechaNacimiento ? 'agf-input--error' : ''}`}
                  type="date"
                  max={new Date().toISOString().slice(0, 10)}
                  value={form.fechaNacimiento}
                  onChange={e => setForm({ ...form, fechaNacimiento: e.target.value })}
                />
                {errores.fechaNacimiento && <small className="agf-error-msg">{errores.fechaNacimiento}</small>}
              </div>

              <div className="agf-field agf-field--full">
                <label className="agf-input-label">
                  <i className="fas fa-tag" /> Plan Inicial *
                </label>
                <SelectorPlanPicker
                  planes={planes}
                  valor={form.idPlan}
                  onCambiar={v => setForm({ ...form, idPlan: v })}
                />
                {errores.idPlan && <small className="agf-error-msg">{errores.idPlan}</small>}
              </div>
            </div>

            <p className="agf-help-text mt-3">
              <i className="fas fa-info-circle" /> El familiar se dará de alta como Atleta con cuenta activa.
              Su contraseña temporal se generará y podrá cambiarla más tarde.
            </p>

            <button className="agf-btn-create mt-3" onClick={aceptarNuevo}>
              <i className="fas fa-paw" /> Agregar al escuadrón
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

// ============================================================
//  MODAL: COBRO DEL GRUPO
// ============================================================
function ModalCobroGrupo({ grupo, onClose, onPagado }) {
  const [detalle, setDetalle] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [metodoPago1, setMetodoPago1] = useState('Efectivo');
  const [montoMetodo1, setMontoMetodo1] = useState('');
  const [metodoPago2, setMetodoPago2] = useState('');
  const [montoMetodo2, setMontoMetodo2] = useState('');
  const [notas, setNotas] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const d = await api.obtenerDetalleGrupoFamiliar(grupo.idGrupo);
        setDetalle(d);
        setMontoMetodo1(d.resumenFinanciero?.totalAPagar?.toString() || '');
      } catch (e) {
        alert('Error cargando detalle: ' + e.message);
        onClose();
      } finally {
        setCargando(false);
      }
    })();
  }, [grupo.idGrupo, onClose]);

  async function confirmarPago() {
    if (!detalle) return;
    setEnviando(true);
    try {
      await api.pagarGrupoFamiliar(grupo.idGrupo, {
        montoMetodo1: Number(montoMetodo1) || detalle.resumenFinanciero.totalAPagar,
        metodoPago1,
        montoMetodo2: montoMetodo2 ? Number(montoMetodo2) : null,
        metodoPago2: metodoPago2 || null,
        notas,
        generadoPor: JSON.parse(localStorage.getItem('usuario'))?.nombre || 'Coach'
      });
      alert('¡Pago grupal registrado! Cascada aplicada con éxito.');
      onPagado();
    } catch (e) {
      alert('Error: ' + e.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <motion.div className="agf-modal-overlay" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div className="agf-modal agf-modal--cobro" onClick={e => e.stopPropagation()} initial={{ scale: 0.95, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 16 }}>
        <button className="agf-modal-close" onClick={onClose}><i className="fas fa-times" /></button>
        <h2 className="agf-modal-title">
          <i className="fas fa-cash-register" /> Cobrar a {grupo.nombreGrupo}
        </h2>

        {cargando ? (
          <div className="text-center py-4"><div className="agf-spinner" /></div>
        ) : detalle ? (
          <>
            <div className="agf-cobro-summary">
              <div className="agf-calc-row">
                <span>Suma de planes ({detalle.resumenFinanciero.totalMiembros} miembros)</span>
                <strong>${detalle.resumenFinanciero.sumaBruta.toFixed(2)}</strong>
              </div>
              <div className="agf-calc-row">
                <span>Descuento grupal {detalle.resumenFinanciero.porcentajeDescuento}%</span>
                <strong className="text-danger">- ${detalle.resumenFinanciero.montoDescuento.toFixed(2)}</strong>
              </div>
              <div className="agf-calc-row agf-calc-total">
                <span>TOTAL A COBRAR AL LÍDER</span>
                <strong className="agf-total-amount">${detalle.resumenFinanciero.totalAPagar.toFixed(2)}</strong>
              </div>
            </div>

            <div className="row g-2 mt-3">
              <div className="col-12 col-md-6">
                <label className="agf-input-label">
                  <i className="fas fa-wallet" /> Método de pago principal
                </label>
                <MetodoPagoPicker valor={metodoPago1} onCambiar={setMetodoPago1} />
              </div>
              <div className="col-12 col-md-6">
                <label className="agf-input-label">
                  <i className="fas fa-coins" /> Monto
                </label>
                <input
                  className="agf-input"
                  type="number"
                  value={montoMetodo1}
                  onChange={e => {
                    const v = e.target.value;
                    if (v === '' || /^\d{0,7}(\.\d{0,2})?$/.test(v)) setMontoMetodo1(v);
                  }}
                />
              </div>
              <div className="col-12 col-md-6">
                <label className="agf-input-label">
                  <i className="fas fa-wallet" /> Segundo método (opcional)
                </label>
                <div className="d-flex gap-2 align-items-center">
                  {metodoPago2 ? (
                    <>
                      <div style={{ flex: 1 }}>
                        <MetodoPagoPicker valor={metodoPago2} onCambiar={setMetodoPago2} />
                      </div>
                      <button
                        type="button"
                        className="agf-slot-mini-btn agf-slot-mini-btn--remove"
                        onClick={() => { setMetodoPago2(''); setMontoMetodo2(''); }}
                        title="Quitar segundo método"
                      >
                        <i className="fas fa-times" />
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="agf-btn agf-btn--ghost"
                      style={{ flex: 1 }}
                      onClick={() => setMetodoPago2('Efectivo')}
                    >
                      <i className="fas fa-plus" /> Añadir segundo método
                    </button>
                  )}
                </div>
              </div>
              <div className="col-12 col-md-6">
                <label className="agf-input-label">
                  <i className="fas fa-coins" /> Monto método 2
                </label>
                <input
                  className="agf-input"
                  type="number"
                  value={montoMetodo2}
                  disabled={!metodoPago2}
                  onChange={e => {
                    const v = e.target.value;
                    if (v === '' || /^\d{0,7}(\.\d{0,2})?$/.test(v)) setMontoMetodo2(v);
                  }}
                />
              </div>
              <div className="col-12">
                <label className="agf-input-label">
                  <i className="fas fa-sticky-note" /> Notas internas
                </label>
                <textarea
                  className="agf-input"
                  rows={2}
                  maxLength={300}
                  value={notas}
                  onChange={e => setNotas(e.target.value)}
                  placeholder="Notas opcionales para registro interno"
                />
              </div>
            </div>

            <button className="agf-btn-create mt-3" onClick={confirmarPago} disabled={enviando}>
              {enviando ? <><div className="agf-spinner agf-spinner--sm" /> Procesando…</> : <><i className="fas fa-check-circle" /> Confirmar pago en cascada</>}
            </button>
          </>
        ) : null}
      </motion.div>
    </motion.div>
  );
}

// ============================================================
//  MODAL: DETALLE DEL GRUPO
// ============================================================
function ModalDetalleGrupo({ grupo, onClose }) {
  const [detalle, setDetalle] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const d = await api.obtenerDetalleGrupoFamiliar(grupo.idGrupo);
        setDetalle(d);
      } catch (e) {
        console.error(e);
      } finally {
        setCargando(false);
      }
    })();
  }, [grupo.idGrupo]);

  return (
    <motion.div className="agf-modal-overlay" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div className="agf-modal agf-modal--detalle" onClick={e => e.stopPropagation()} initial={{ scale: 0.95 }} animate={{ scale: 1 }}>
        <button className="agf-modal-close" onClick={onClose}><i className="fas fa-times" /></button>
        <h2 className="agf-modal-title"><i className="fas fa-shield-alt" /> {grupo.nombreGrupo}</h2>

        {cargando ? (
          <div className="text-center py-4"><div className="agf-spinner" /></div>
        ) : detalle ? (
          <>
            <div className="agf-cobro-summary">
              <div className="agf-calc-row">
                <span>Total miembros</span>
                <strong>{detalle.resumenFinanciero.totalMiembros}</strong>
              </div>
              <div className="agf-calc-row">
                <span>% Descuento aplicado</span>
                <strong>{detalle.resumenFinanciero.porcentajeDescuento}%</strong>
              </div>
              <div className="agf-calc-row">
                <span>Total mensual con descuento</span>
                <strong className="agf-total-amount">${detalle.resumenFinanciero.totalAPagar.toFixed(2)}</strong>
              </div>
            </div>

            <h3 className="agf-detalle-h3 mt-3">Integrantes</h3>
            <div className="agf-detalle-miembros">
              {detalle.miembros.map(m => (
                <div key={m.idMiembro} className={`agf-detalle-row ${m.rolEnGrupo === 'Lider' ? 'lider' : ''}`}>
                  <div className="agf-detalle-avatar">
                    {m.foto ? <img src={m.foto} alt={m.nombre} /> : <span>{m.nombre?.charAt(0).toUpperCase()}</span>}
                    {m.rolEnGrupo === 'Lider' && <i className="fas fa-crown agf-crown" />}
                  </div>
                  <div className="flex-grow-1 overflow-hidden">
                    <div className="fw-bold text-truncate">{m.nombre} {m.apellidos || ''}</div>
                    <small className="text-muted text-truncate d-block">{m.correo}</small>
                    <small><i className="fas fa-tag me-1" /> {m.nombrePlan} — ${Number(m.precioBase).toFixed(2)}</small>
                  </div>
                  <span className={`agf-mini-status ${m.estatusSuscripcion?.toLowerCase() || ''}`}>{m.estatusSuscripcion || '—'}</span>
                </div>
              ))}
            </div>
          </>
        ) : null}
      </motion.div>
    </motion.div>
  );
}

// ============================================================
//  MODAL CONFIRMACIÓN GENÉRICO
// ============================================================
function ModalConfirmar({ titulo, mensaje, confirmTexto = 'Sí', tipo = 'danger', onCancel, onConfirm }) {
  return (
    <motion.div className="agf-modal-overlay" onClick={onCancel} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div className="agf-modal agf-modal--confirm" onClick={e => e.stopPropagation()} initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}>
        <div className={`agf-confirm-icon agf-confirm-icon--${tipo}`}>
          <i className="fas fa-exclamation-triangle" />
        </div>
        <h3 className="agf-confirm-title">{titulo}</h3>
        <p className="agf-confirm-msg">{mensaje}</p>
        <div className="d-flex gap-2 justify-content-center mt-3">
          <button className="agf-btn agf-btn--ghost" onClick={onCancel}>Cancelar</button>
          <button className={`agf-btn agf-btn--${tipo}`} onClick={onConfirm}>{confirmTexto}</button>
        </div>
      </motion.div>
    </motion.div>
  );
}
