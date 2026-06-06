import { useState, useEffect } from 'react';
import AtletifyLoader from './AtletifyLoader';
import '../assets/css/ExpedienteMedico.css';

const TIPOS_SANGRE = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

const ESTADOS_CIVILES = [
  { value: 'Soltero(a)',     icon: 'fa-user' },
  { value: 'Casado(a)',      icon: 'fa-ring' },
  { value: 'Divorciado(a)', icon: 'fa-heart-broken' },
  { value: 'Viudo(a)',       icon: 'fa-leaf' },
  { value: 'Unión Libre',    icon: 'fa-home' },
];

const PAD_MEDIC = [
  { name: 'hipertension',       label: 'Hipertensión' },
  { name: 'problemasHabla',     label: 'Problemas del habla' },
  { name: 'problemasExtremidad',label: 'Problemas con alguna extremidad' },
  { name: 'problemasEspalda',   label: 'Problemas en la espalda' },
  { name: 'lumbalgia',          label: 'Lumbalgia' },
  { name: 'cirugiaReciente',    label: 'Cirugía reciente' },
  { name: 'fracturado',         label: 'Te has fracturado' },
  { name: 'tiroides',           label: 'Tiroides' },
  { name: 'tda',                label: 'TDA' },
  { name: 'alergias',           label: 'Alergias' },
  { name: 'inmunodeficiencia',  label: 'Síndrome de inmunodeficiencia' },
  { name: 'esclerosisMultiple', label: 'Esclerosis múltiple' },
  { name: 'parkinson',          label: 'Parkinson' },
  { name: 'alcohol',            label: 'Alcohol' },
  { name: 'calmantes',          label: 'Calmantes' },
  { name: 'diabetes',           label: 'Diabetes' },
  { name: 'problemasOido',      label: 'Problemas de oído' },
  { name: 'plantilla',          label: 'Plantilla' },
  { name: 'escoliosis',         label: 'Escoliosis' },
  { name: 'cirugiaMetales',     label: 'Cirugía con metales' },
  { name: 'cirugiaMas1Ano',     label: 'Cirugía de más de 1 año' },
  { name: 'problemasCorazon',   label: 'Problemas del corazón' },
  { name: 'autismo',            label: 'Autismo' },
  { name: 'sindromeDown',       label: 'Síndrome de Down' },
  { name: 'cancer',             label: 'Cáncer' },
  { name: 'lupus',              label: 'Lupus' },
  { name: 'fumador',            label: 'Fumador' },
  { name: 'cannabis',           label: 'Cannabis' },
];

const FORM_INICIAL = {
  estatura: '', estadoCivil: '', peso: '', tipoDeSangre: '',
  contactoEmergenciaNombre: '', contactoEmergenciaTelefono: '',
  alergiasDescripcion: '', correo: '', telefono: '', fechaNacimiento: '',
  tieneExperiencia: false, deporteExperiencia: '', tieneDiscapacidad: '',
  hipertension: false, problemasHabla: false, problemasExtremidad: false,
  problemasEspalda: false, lumbalgia: false, cirugiaReciente: false,
  fracturado: false, tiroides: false, tda: false, alergias: false,
  inmunodeficiencia: false, esclerosisMultiple: false, parkinson: false,
  alcohol: false, calmantes: false, diabetes: false, problemasOido: false,
  plantilla: false, escoliosis: false, cirugiaMetales: false,
  cirugiaMas1Ano: false, problemasCorazon: false, autismo: false,
  sindromeDown: false, cancer: false, lupus: false, fumador: false,
  cannabis: false, medicamentoControlado: '', suplementosVitaminas: ''
};

export default function ModalExpedienteMedico({ idUsuario, onCompletado, isPage = false }) {
  const [loadingDatos, setLoadingDatos] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [form, setForm] = useState(FORM_INICIAL);
  const [usuarioData, setUsuarioData] = useState(null);

  const [modalSangreOpen, setModalSangreOpen] = useState(false);
  const [modalCivilOpen, setModalCivilOpen] = useState(false);
  const [modalPadOpen, setModalPadOpen] = useState(false);

  useEffect(() => {
    const fetchDatos = async () => {
      try {
        const u = JSON.parse(localStorage.getItem('usuario'));
        setUsuarioData(u);
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/ExpedienteMedico/usuario/${idUsuario}`);
        if (res.ok) {
          const data = await res.json();
          setForm(prev => ({
            ...prev,
            peso: data.peso || u?.peso || u?.Peso || '',
            tipoDeSangre: data.tipoDeSangre || u?.tipoDeSangre || u?.TipoDeSangre || '',
            contactoEmergenciaNombre: data.contactoEmergenciaNombre || '',
            contactoEmergenciaTelefono: data.contactoEmergenciaTelefono || '',
            alergiasDescripcion: data.alergiasDescripcion || '',
            correo: data.correo || u?.correo || u?.Correo || '',
            telefono: data.telefono || u?.telefono || u?.Telefono || '',
            fechaNacimiento: data.fechaNacimiento
              ? data.fechaNacimiento.split('T')[0]
              : (u?.fechaNacimiento || u?.FechaNacimiento
                  ? (u?.fechaNacimiento || u?.FechaNacimiento).split('T')[0]
                  : ''),
            tieneExperiencia: data.tieneExperiencia || false,
            deporteExperiencia: data.deporteExperiencia || '',
            tieneDiscapacidad: data.tieneDiscapacidad || '',
            estatura: data.estatura || '',
            estadoCivil: data.estadoCivil || '',
            medicamentoControlado: data.medicamentoControlado || '',
            suplementosVitaminas: data.suplementosVitaminas || '',
            hipertension: data.hipertension || false,
            problemasHabla: data.problemasHabla || false,
            problemasExtremidad: data.problemasExtremidad || false,
            problemasEspalda: data.problemasEspalda || false,
            lumbalgia: data.lumbalgia || false,
            cirugiaReciente: data.cirugiaReciente || false,
            fracturado: data.fracturado || false,
            tiroides: data.tiroides || false,
            tda: data.tda || false,
            alergias: data.alergias || false,
            inmunodeficiencia: data.inmunodeficiencia || false,
            esclerosisMultiple: data.esclerosisMultiple || false,
            parkinson: data.parkinson || false,
            alcohol: data.alcohol || false,
            calmantes: data.calmantes || false,
            diabetes: data.diabetes || false,
            problemasOido: data.problemasOido || false,
            plantilla: data.plantilla || false,
            escoliosis: data.escoliosis || false,
            cirugiaMetales: data.cirugiaMetales || false,
            cirugiaMas1Ano: data.cirugiaMas1Ano || false,
            problemasCorazon: data.problemasCorazon || false,
            autismo: data.autismo || false,
            sindromeDown: data.sindromeDown || false,
            cancer: data.cancer || false,
            lupus: data.lupus || false,
            fumador: data.fumador || false,
            cannabis: data.cannabis || false,
          }));
        }
      } catch (err) {
        console.error('Error cargando expediente', err);
      } finally {
        setLoadingDatos(false);
      }
    };
    fetchDatos();
  }, [idUsuario]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === 'telefono' || name === 'contactoEmergenciaTelefono') {
      const num = value.replace(/\D/g, '');
      if (num.length > 10) return;
      setForm(prev => ({ ...prev, [name]: num }));
      return;
    }
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const togglePad = (name) => {
    setForm(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const calcularEdad = (fechaStr) => {
    if (!fechaStr) return '—';
    const hoy = new Date();
    const cumple = new Date(fechaStr);
    let edad = hoy.getFullYear() - cumple.getFullYear();
    const m = hoy.getMonth() - cumple.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < cumple.getDate())) edad--;
    return `${edad} años`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setEnviando(true);
    try {
      const payload = {
        idUsuario,
        estatura: form.estatura ? parseFloat(form.estatura) : null,
        estadoCivil: form.estadoCivil,
        peso: form.peso ? parseFloat(form.peso) : null,
        tipoDeSangre: form.tipoDeSangre,
        contactoEmergenciaNombre: form.contactoEmergenciaNombre,
        contactoEmergenciaTelefono: form.contactoEmergenciaTelefono,
        alergiasDescripcion: form.alergiasDescripcion,
        correo: form.correo,
        telefono: form.telefono,
        fechaNacimiento: form.fechaNacimiento ? new Date(form.fechaNacimiento).toISOString() : null,
        tieneExperiencia: form.tieneExperiencia,
        deporteExperiencia: form.deporteExperiencia,
        tieneDiscapacidad: form.tieneDiscapacidad,
        hipertension: form.hipertension,
        problemasHabla: form.problemasHabla,
        problemasExtremidad: form.problemasExtremidad,
        problemasEspalda: form.problemasEspalda,
        lumbalgia: form.lumbalgia,
        cirugiaReciente: form.cirugiaReciente,
        fracturado: form.fracturado,
        tiroides: form.tiroides,
        tda: form.tda,
        alergias: form.alergias,
        inmunodeficiencia: form.inmunodeficiencia,
        esclerosisMultiple: form.esclerosisMultiple,
        parkinson: form.parkinson,
        alcohol: form.alcohol,
        calmantes: form.calmantes,
        diabetes: form.diabetes,
        problemasOido: form.problemasOido,
        plantilla: form.plantilla,
        escoliosis: form.escoliosis,
        cirugiaMetales: form.cirugiaMetales,
        cirugiaMas1Ano: form.cirugiaMas1Ano,
        problemasCorazon: form.problemasCorazon,
        autismo: form.autismo,
        sindromeDown: form.sindromeDown,
        cancer: form.cancer,
        lupus: form.lupus,
        fumador: form.fumador,
        cannabis: form.cannabis,
        medicamentoControlado: form.medicamentoControlado,
        suplementosVitaminas: form.suplementosVitaminas,
      };
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/ExpedienteMedico`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        alert('Expediente médico guardado correctamente.');
        onCompletado();
      } else {
        alert('Error al guardar el expediente.');
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión al guardar.');
    } finally {
      setEnviando(false);
    }
  };

  const padActivos = PAD_MEDIC.filter(p => form[p.name]);
  const padCount = padActivos.length;

  if (loadingDatos) {
    return (
      <div className="em-loading" style={!isPage ? { position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.7)' } : {}}>
        <AtletifyLoader />
      </div>
    );
  }

  const formContent = (
    <form onSubmit={handleSubmit} className="em-form-content">

      {/* ── DATOS PERSONALES ── */}
      <div className="em-section-card">
        <p className="em-section-title"><i className="fas fa-user-circle"></i> Datos Personales</p>
        <div style={{ display: 'grid', gap: '0.75rem', gridTemplateColumns: '1fr' }}>

          <div>
            <label className="etiqueta-campo">Nombre completo</label>
            <input
              type="text"
              className="em-input-readonly"
              value={`${usuarioData?.nombre || ''} ${usuarioData?.apellidos || ''}`.trim()}
              disabled
            />
          </div>

          <div style={{ display: 'grid', gap: '0.75rem', gridTemplateColumns: 'repeat(auto-fit, minmax(min(200px, 100%), 1fr))' }}>
            <div>
              <label className="etiqueta-campo">Correo <span style={{ color: 'var(--primary)' }}>*</span></label>
              <input type="email" required name="correo" className="entrada-oscura" value={form.correo} onChange={handleChange} placeholder="ejemplo@correo.com" />
            </div>
            <div>
              <label className="etiqueta-campo">Teléfono (10 dígitos) <span style={{ color: 'var(--primary)' }}>*</span></label>
              <input type="text" required name="telefono" maxLength="10" minLength="10" className="entrada-oscura" value={form.telefono} onChange={handleChange} placeholder="5512345678" />
            </div>
          </div>

          <div style={{ display: 'grid', gap: '0.75rem', gridTemplateColumns: 'repeat(auto-fit, minmax(min(160px, 100%), 1fr))' }}>
            <div>
              <label className="etiqueta-campo">Fecha de nacimiento <span style={{ color: 'var(--primary)' }}>*</span></label>
              <input type="date" required name="fechaNacimiento" className="entrada-oscura" value={form.fechaNacimiento} onChange={handleChange} />
            </div>
            <div>
              <label className="etiqueta-campo">Edad</label>
              <input type="text" className="em-input-readonly" value={calcularEdad(form.fechaNacimiento)} disabled />
            </div>
            <div>
              <label className="etiqueta-campo">Estatura (cm) <span style={{ color: 'var(--primary)' }}>*</span></label>
              <input type="number" required name="estatura" className="entrada-oscura" value={form.estatura} onChange={handleChange} placeholder="175" />
            </div>
            <div>
              <label className="etiqueta-campo">Peso (kg) <span style={{ color: 'var(--primary)' }}>*</span></label>
              <input type="number" required step="0.1" name="peso" className="entrada-oscura" value={form.peso} onChange={handleChange} placeholder="70.5" />
            </div>
          </div>

          <div style={{ display: 'grid', gap: '0.75rem', gridTemplateColumns: 'repeat(auto-fit, minmax(min(200px, 100%), 1fr))' }}>
            <div>
              <label className="etiqueta-campo">Tipo de sangre <span style={{ color: 'var(--primary)' }}>*</span></label>
              <button type="button" className="em-select-btn" onClick={() => setModalSangreOpen(true)}>
                <span className="em-select-btn__left">
                  <i className="fas fa-tint em-select-btn__icon"></i>
                  <span className={`em-select-btn__label ${!form.tipoDeSangre ? 'em-select-btn__placeholder' : ''}`}>
                    {form.tipoDeSangre || 'Seleccionar...'}
                  </span>
                </span>
                <i className="fas fa-chevron-right em-select-btn__arrow"></i>
              </button>
              <input type="hidden" required name="tipoDeSangre" value={form.tipoDeSangre} onChange={() => {}} />
            </div>
            <div>
              <label className="etiqueta-campo">Estado civil <span style={{ color: 'var(--primary)' }}>*</span></label>
              <button type="button" className="em-select-btn" onClick={() => setModalCivilOpen(true)}>
                <span className="em-select-btn__left">
                  <i className="fas fa-heart em-select-btn__icon"></i>
                  <span className={`em-select-btn__label ${!form.estadoCivil ? 'em-select-btn__placeholder' : ''}`}>
                    {form.estadoCivil || 'Seleccionar...'}
                  </span>
                </span>
                <i className="fas fa-chevron-right em-select-btn__arrow"></i>
              </button>
              <input type="hidden" required name="estadoCivil" value={form.estadoCivil} onChange={() => {}} />
            </div>
          </div>
        </div>
      </div>

      {/* ── CONTACTO DE EMERGENCIA ── */}
      <div className="em-section-card">
        <p className="em-section-title"><i className="fas fa-phone-alt"></i> Contacto de Emergencia</p>
        <div style={{ display: 'grid', gap: '0.75rem', gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px, 100%), 1fr))' }}>
          <div>
            <label className="etiqueta-campo">Nombre del contacto <span style={{ color: 'var(--primary)' }}>*</span></label>
            <input type="text" required name="contactoEmergenciaNombre" className="entrada-oscura" value={form.contactoEmergenciaNombre} onChange={handleChange} placeholder="Nombre completo" />
          </div>
          <div>
            <label className="etiqueta-campo">Teléfono del contacto <span style={{ color: 'var(--primary)' }}>*</span></label>
            <input type="text" required name="contactoEmergenciaTelefono" maxLength="10" minLength="10" className="entrada-oscura" value={form.contactoEmergenciaTelefono} onChange={handleChange} placeholder="5512345678" />
          </div>
        </div>
      </div>

      {/* ── EXPERIENCIA ── */}
      <div className="em-section-card">
        <p className="em-section-title"><i className="fas fa-running"></i> Experiencia y Otras Condiciones</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>

          <div
            className={`em-toggle-row ${form.tieneExperiencia ? 'em-toggle-row--active' : ''}`}
            onClick={() => setForm(prev => ({ ...prev, tieneExperiencia: !prev.tieneExperiencia }))}
          >
            <span className="em-toggle-label">¿Tienes experiencia deportiva previa?</span>
            <span className="em-toggle-switch"></span>
          </div>

          {form.tieneExperiencia && (
            <div>
              <label className="etiqueta-campo">¿Qué deporte(s) practicabas? <span style={{ color: 'var(--primary)' }}>*</span></label>
              <input type="text" required name="deporteExperiencia" className="entrada-oscura" value={form.deporteExperiencia} onChange={handleChange} placeholder="Fútbol, CrossFit, Natación..." />
            </div>
          )}

          <div>
            <label className="etiqueta-campo">Otras discapacidades (Opcional)</label>
            <textarea name="tieneDiscapacidad" className="entrada-oscura" value={form.tieneDiscapacidad} onChange={handleChange} rows="2" placeholder="Describa si tiene alguna discapacidad no listada..." style={{ resize: 'vertical' }}></textarea>
          </div>
        </div>
      </div>

      {/* ── HISTORIAL MÉDICO ── */}
      <div className="em-section-card">
        <p className="em-section-title"><i className="fas fa-heartbeat"></i> Historial Médico</p>
        <button type="button" className="em-padecimientos-btn" onClick={() => setModalPadOpen(true)}>
          <span className="em-padecimientos-btn__left">
            <span className="em-padecimientos-btn__icon">
              <i className="fas fa-notes-medical"></i>
            </span>
            <span className="em-padecimientos-btn__info">
              <p className="em-padecimientos-btn__title">Padecimientos y condiciones</p>
              <p className="em-padecimientos-btn__sub">Toca para seleccionar las condiciones que padeces o has padecido</p>
            </span>
          </span>
          <span className={`em-pad-count ${padCount === 0 ? 'em-pad-count--zero' : ''}`}>
            <i className="fas fa-check-circle" style={{ fontSize: '0.7rem' }}></i>
            {padCount} seleccionado{padCount !== 1 ? 's' : ''}
          </span>
        </button>
        {padCount > 0 && (
          <div className="em-pad-tags">
            {padActivos.slice(0, 3).map(p => (
              <span key={p.name} className="em-pad-tag">
                <i className="fas fa-circle" style={{ fontSize: '0.4rem' }}></i>
                {p.label}
              </span>
            ))}
            {padCount > 3 && (
              <span className="em-pad-tag em-pad-tag--more">+{padCount - 3} más</span>
            )}
          </div>
        )}
      </div>

      {/* ── ADICIONALES ── */}
      <div className="em-section-card">
        <p className="em-section-title"><i className="fas fa-prescription-bottle-alt"></i> Adicionales</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>

          {form.alergias && (
            <div>
              <label className="etiqueta-campo">Especifica tus alergias <span style={{ color: 'var(--primary)' }}>*</span></label>
              <textarea required name="alergiasDescripcion" className="entrada-oscura" value={form.alergiasDescripcion} onChange={handleChange} rows="2" placeholder="Describa sus alergias..." style={{ resize: 'vertical' }}></textarea>
            </div>
          )}

          <div>
            <label className="etiqueta-campo">¿Estás tomando algún medicamento controlado? <span style={{ color: 'var(--primary)' }}>*</span></label>
            <textarea required name="medicamentoControlado" className="entrada-oscura" value={form.medicamentoControlado} onChange={handleChange} rows="2" placeholder="Si no toma ninguno, escriba 'Ninguno'" style={{ resize: 'vertical' }}></textarea>
          </div>

          <div>
            <label className="etiqueta-campo">¿Consumes algún suplemento o vitaminas? <span style={{ color: 'var(--primary)' }}>*</span></label>
            <textarea required name="suplementosVitaminas" className="entrada-oscura" value={form.suplementosVitaminas} onChange={handleChange} rows="2" placeholder="Si no consume, escriba 'Ninguno'" style={{ resize: 'vertical' }}></textarea>
          </div>
        </div>
      </div>

      <p className="em-required-note"><span>*</span> Campos obligatorios</p>

      <button type="submit" className="em-save-btn" disabled={enviando}>
        {enviando
          ? <><span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }}></span> Guardando...</>
          : <><i className="fas fa-check-circle"></i> Guardar expediente</>
        }
      </button>

    </form>
  );

  const subModales = (
    <>
      {/* PICKER — TIPO DE SANGRE */}
      {modalSangreOpen && (
        <div className="em-picker-overlay" onClick={() => setModalSangreOpen(false)}>
          <div className="em-picker-modal" onClick={e => e.stopPropagation()}>
            <div className="em-picker-modal__header">
              <div>
                <p className="em-picker-modal__supertitle">Seleccionar</p>
                <p className="em-picker-modal__title">Tipo de Sangre</p>
              </div>
              <button type="button" className="em-picker-close" onClick={() => setModalSangreOpen(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <p className="em-picker-modal__hint">Elige tu grupo sanguíneo. Este dato es vital en emergencias.</p>
            <div className="em-picker-scroll">
              <div className="em-sangre-grid">
                {TIPOS_SANGRE.map(tipo => (
                  <button
                    key={tipo}
                    type="button"
                    className={`em-sangre-btn ${form.tipoDeSangre === tipo ? 'em-sangre-btn--active' : ''}`}
                    onClick={() => { setForm(prev => ({ ...prev, tipoDeSangre: tipo })); setModalSangreOpen(false); }}
                  >
                    <span className="em-sangre-btn__tipo">{tipo}</span>
                    {form.tipoDeSangre === tipo && <i className="fas fa-check em-sangre-btn__check"></i>}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PICKER — ESTADO CIVIL */}
      {modalCivilOpen && (
        <div className="em-picker-overlay" onClick={() => setModalCivilOpen(false)}>
          <div className="em-picker-modal" onClick={e => e.stopPropagation()}>
            <div className="em-picker-modal__header">
              <div>
                <p className="em-picker-modal__supertitle">Seleccionar</p>
                <p className="em-picker-modal__title">Estado Civil</p>
              </div>
              <button type="button" className="em-picker-close" onClick={() => setModalCivilOpen(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="em-picker-scroll">
              <div className="em-picker-list">
                {ESTADOS_CIVILES.map(ec => (
                  <button
                    key={ec.value}
                    type="button"
                    className={`em-picker-option ${form.estadoCivil === ec.value ? 'em-picker-option--active' : ''}`}
                    onClick={() => { setForm(prev => ({ ...prev, estadoCivil: ec.value })); setModalCivilOpen(false); }}
                  >
                    <span className="em-picker-option__icon"><i className={`fas ${ec.icon}`}></i></span>
                    <span className="em-picker-option__label">{ec.value}</span>
                    {form.estadoCivil === ec.value && <i className="fas fa-check em-picker-option__check"></i>}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PICKER — PADECIMIENTOS */}
      {modalPadOpen && (
        <div className="em-picker-overlay" onClick={() => setModalPadOpen(false)}>
          <div className="em-picker-modal em-picker-modal--wide" onClick={e => e.stopPropagation()}>
            <div className="em-picker-modal__header">
              <div>
                <p className="em-picker-modal__supertitle">Seleccionar</p>
                <p className="em-picker-modal__title">Historial Médico</p>
              </div>
              <button type="button" className="em-picker-close" onClick={() => setModalPadOpen(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <p className="em-picker-modal__hint">Marca las condiciones que padeces o has padecido. Esta información es confidencial.</p>
            <div className="em-picker-scroll">
              <div className="em-pad-list">
                {PAD_MEDIC.map(pad => (
                  <button
                    key={pad.name}
                    type="button"
                    className={`em-pad-item ${form[pad.name] ? 'em-pad-item--active' : ''}`}
                    onClick={() => togglePad(pad.name)}
                  >
                    <span className="em-pad-item__name">{pad.label}</span>
                    <span className="em-pad-item__dot">
                      {form[pad.name] && <i className="fas fa-check" style={{ fontSize: '0.55rem' }}></i>}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <div className="em-pad-footer">
              <p className="em-pad-footer__count">
                <strong>{padCount}</strong> condición{padCount !== 1 ? 'es' : ''} seleccionada{padCount !== 1 ? 's' : ''}
              </p>
              <button type="button" className="em-save-btn" style={{ width: 'auto', padding: '0.55rem 1.2rem', fontSize: '0.78rem' }} onClick={() => setModalPadOpen(false)}>
                <i className="fas fa-check"></i> Listo
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );

  /* ── MODO PÁGINA (isPage=true) ── */
  if (isPage) {
    return (
      <>
        {formContent}
        {subModales}
      </>
    );
  }

  /* ── MODO MODAL BLOQUEANTE (isPage=false) ── */
  return (
    <div className="em-overlay">
      <div className="em-modal-wrap">
        <div className="em-modal-header" style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem' }}>
          <span className="em-modal-header-icon"><i className="fas fa-notes-medical"></i></span>
          <div>
            <p className="em-modal-header-title">Expediente Médico Obligatorio</p>
            <p className="em-modal-header-sub">Por reglamento y tu seguridad no puedes continuar sin completar tu historial médico.</p>
          </div>
        </div>
        <div className="em-modal-scroll">
          {formContent}
        </div>
      </div>
      {subModales}
    </div>
  );
}
