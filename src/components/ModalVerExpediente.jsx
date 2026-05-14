import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import AtletifyLoader from './AtletifyLoader';
import '../assets/css/Directorio.css';

const padMedic = [
  { name: 'hipertension',       label: 'Hipertensión' },
  { name: 'problemasHabla',     label: 'Problemas del Habla' },
  { name: 'problemasExtremidad',label: 'Problemas de extremidad' },
  { name: 'problemasEspalda',   label: 'Problemas en la espalda' },
  { name: 'lumbalgia',          label: 'Lumbalgia' },
  { name: 'cirugiaReciente',    label: 'Cirugía Reciente' },
  { name: 'fracturado',         label: 'Se ha fracturado' },
  { name: 'tiroides',           label: 'Tiroides' },
  { name: 'tda',                label: 'TDA' },
  { name: 'alergias',           label: 'Alergias' },
  { name: 'inmunodeficiencia',  label: 'Inmunodeficiencia' },
  { name: 'esclerosisMultiple', label: 'Esclerosis Múltiple' },
  { name: 'parkinson',          label: 'Parkinson' },
  { name: 'alcohol',            label: 'Alcohol' },
  { name: 'calmantes',          label: 'Calmantes' },
  { name: 'diabetes',           label: 'Diabetes' },
  { name: 'problemasOido',      label: 'Problemas de Oído' },
  { name: 'plantilla',          label: 'Usa Plantilla' },
  { name: 'escoliosis',         label: 'Escoliosis' },
  { name: 'cirugiaMetales',     label: 'Cirugía con metales' },
  { name: 'cirugiaMas1Ano',     label: 'Cirugía +1 año' },
  { name: 'problemasCorazon',   label: 'Problemas del Corazón' },
  { name: 'autismo',            label: 'Autismo' },
  { name: 'sindromeDown',       label: 'Síndrome de Down' },
  { name: 'cancer',             label: 'Cáncer' },
  { name: 'lupus',              label: 'Lupus' },
  { name: 'fumador',            label: 'Fumador' },
  { name: 'cannabis',           label: 'Cannabis' },
];

export default function ModalVerExpediente({ atleta, onClose }) {
  const [datos, setDatos] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const idUsuario = atleta.idUsuario || atleta.IdUsuario;
    fetch(`${import.meta.env.VITE_API_URL}/api/ExpedienteMedico/usuario/${idUsuario}`)
      .then(res => res.json())
      .then(data => { setDatos(data); setLoading(false); })
      .catch(err => { console.error('Error al obtener el expediente:', err); setLoading(false); });
  }, [atleta]);

  const padecimientosPositivos = datos ? padMedic.filter(p => datos[p.name] === true) : [];

  const fechaFormateada = datos
    ? (datos.fechaActualizacion || datos.fechaRegistro
        ? new Date(datos.fechaActualizacion || datos.fechaRegistro).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
        : 'Registro original')
    : null;

  const modal = (
    <div
      className="directorio-modal-overlay"
      style={{ zIndex: 10000 }}
      onClick={onClose}
    >
      <div
        className="directorio-modal directorio-modal--expediente"
        style={{ cursor: 'default' }}
        onClick={e => e.stopPropagation()}
      >
        <button onClick={onClose} className="directorio-modal-close">
          <i className="fas fa-times"></i>
        </button>

        {/* HEADER */}
        <div className="exp-modal-header">
          <div className="exp-modal-avatar">
            {(atleta.foto || atleta.Foto)
              ? <img src={atleta.foto || atleta.Foto} alt={atleta.nombre || atleta.Nombre} className="atleta-avatar-img" />
              : (atleta.nombre || atleta.Nombre || '?').charAt(0).toUpperCase()
            }
          </div>
          <div>
            <h3 className="exp-modal-titulo">
              {atleta.nombre || atleta.Nombre} {atleta.apellidos || atleta.Apellidos}
            </h3>
            <p className="exp-modal-subtitulo">
              <i className="fas fa-notes-medical me-1"></i> Expediente Médico Completo
            </p>
          </div>
        </div>

        {/* BODY */}
        <div className="directorio-modal-body">

          {loading ? (
            <div className="d-flex justify-content-center py-4">
              <AtletifyLoader />
            </div>
          ) : (!datos || !datos.idExpediente) ? (
            <div className="exp-alerta-sin-expediente">
              <i className="fas fa-clipboard-list"></i>
              <p>Este atleta aún no ha llenado su expediente médico.</p>
            </div>
          ) : (
            <>
              {/* FECHA */}
              <div className="d-flex justify-content-end mb-3">
                <span className="exp-badge-fecha">
                  <i className="fas fa-clock"></i>
                  Actualizado: {fechaFormateada}
                </span>
              </div>

              {/* DATOS FÍSICOS */}
              <div className="exp-seccion-titulo">
                <i className="fas fa-ruler-combined"></i> Datos Físicos
              </div>
              <div className="exp-stats-grid mb-3">
                <div className="exp-stats-cell">
                  <div className="exp-stats-label">Estatura</div>
                  <div className={`exp-stats-value ${!datos.estatura ? 'exp-data-value--muted' : ''}`}>
                    {datos.estatura ? `${datos.estatura} cm` : '—'}
                  </div>
                </div>
                <div className="exp-stats-cell">
                  <div className="exp-stats-label">Peso</div>
                  <div className={`exp-stats-value ${!datos.peso ? 'exp-data-value--muted' : ''}`}>
                    {datos.peso ? `${datos.peso} kg` : '—'}
                  </div>
                </div>
                <div className="exp-stats-cell">
                  <div className="exp-stats-label">Tipo de Sangre</div>
                  <div className={`exp-stats-value ${datos.tipoDeSangre ? 'exp-data-value--danger' : 'exp-data-value--muted'}`}>
                    {datos.tipoDeSangre || '—'}
                  </div>
                </div>
                <div className="exp-stats-cell">
                  <div className="exp-stats-label">Estado Civil</div>
                  <div className={`exp-stats-value ${!datos.estadoCivil ? 'exp-data-value--muted' : ''}`}>
                    {datos.estadoCivil || '—'}
                  </div>
                </div>
              </div>

              {/* CONTACTO DE EMERGENCIA */}
              <div className="exp-seccion-titulo">
                <i className="fas fa-phone-alt"></i> Contacto de Emergencia
              </div>
              <div className="exp-contacto-card mb-3">
                <div className="exp-data-row" style={{ borderBottom: '1px solid rgba(79,195,247,0.15)' }}>
                  <div className="exp-data-label">Nombre</div>
                  <div className={`exp-data-value ${!datos.contactoEmergenciaNombre ? 'exp-data-value--muted' : ''}`}>
                    {datos.contactoEmergenciaNombre || 'No especificado'}
                  </div>
                </div>
                <div className="exp-data-row">
                  <div className="exp-data-label">Teléfono</div>
                  <div className="d-flex align-items-center gap-2 justify-content-end flex-wrap">
                    <span className={`exp-data-value ${!datos.contactoEmergenciaTelefono ? 'exp-data-value--muted' : ''}`}>
                      {datos.contactoEmergenciaTelefono || 'No especificado'}
                    </span>
                    {datos.contactoEmergenciaTelefono && (
                      <a
                        href={`https://wa.me/${datos.contactoEmergenciaTelefono}`}
                        target="_blank"
                        rel="noreferrer"
                        className="directorio-btn-wa"
                        title="Contactar por WhatsApp"
                      >
                        <i className="fab fa-whatsapp"></i>
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* EXPERIENCIA */}
              <div className="exp-seccion-titulo">
                <i className="fas fa-running"></i> Experiencia y Discapacidades
              </div>
              <div className="exp-data-grid mb-3">
                <div className="exp-data-row" style={{ borderBottom: '1px solid var(--border)' }}>
                  <div className="exp-data-label">Experiencia previa</div>
                  <div className="exp-data-value">
                    {datos.tieneExperiencia
                      ? <span className="exp-data-value--success"><i className="fas fa-check-circle me-1"></i>Sí</span>
                      : <span style={{ color: '#f08090' }}><i className="fas fa-times-circle me-1"></i>No</span>}
                  </div>
                </div>
                {datos.tieneExperiencia && (
                  <div className="exp-data-row" style={{ borderBottom: '1px solid var(--border)' }}>
                    <div className="exp-data-label">Deportes</div>
                    <div className={`exp-data-value ${!datos.deporteExperiencia ? 'exp-data-value--muted' : ''}`}>
                      {datos.deporteExperiencia || 'No especificado'}
                    </div>
                  </div>
                )}
                <div className="exp-data-row">
                  <div className="exp-data-label">Otras discapacidades</div>
                  <div className={`exp-data-value ${!datos.tieneDiscapacidad ? 'exp-data-value--muted' : ''}`}
                    style={{ textAlign: 'right', wordBreak: 'break-word' }}
                  >
                    {datos.tieneDiscapacidad || 'Ninguna registrada'}
                  </div>
                </div>
              </div>

              {/* CONDICIONES MÉDICAS */}
              <div className="exp-seccion-titulo">
                <i className="fas fa-heartbeat"></i> Condiciones Médicas Declaradas
              </div>
              <div className="mb-3">
                {padecimientosPositivos.length === 0 ? (
                  <div className="exp-sin-condicion">
                    <i className="fas fa-check-circle"></i>
                    <span>El atleta no declaró condiciones médicas.</span>
                  </div>
                ) : (
                  <div className="d-flex flex-wrap gap-2">
                    {padecimientosPositivos.map(pad => (
                      <span key={pad.name} className="exp-condition-badge">
                        <i className="fas fa-exclamation-circle"></i>
                        {pad.label}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* DETALLES ADICIONALES */}
              <div className="exp-seccion-titulo">
                <i className="fas fa-prescription-bottle-alt"></i> Detalles Adicionales
              </div>

              {datos.alergias && (
                <div className="mb-2">
                  <div className="exp-data-label mb-1">Descripción de Alergias</div>
                  <div className={`exp-text-block ${!datos.alergiasDescripcion ? 'exp-text-block--empty' : ''}`}>
                    {datos.alergiasDescripcion || 'Sin descripción'}
                  </div>
                </div>
              )}

              <div className="mb-2">
                <div className="exp-data-label mb-1">Medicamento Controlado</div>
                <div className={`exp-text-block ${!datos.medicamentoControlado ? 'exp-text-block--empty' : ''}`}>
                  {datos.medicamentoControlado || 'Ninguno'}
                </div>
              </div>

              <div className="mb-2">
                <div className="exp-data-label mb-1">Suplementos / Vitaminas</div>
                <div className={`exp-text-block ${!datos.suplementosVitaminas ? 'exp-text-block--empty' : ''}`}>
                  {datos.suplementosVitaminas || 'Ninguno'}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
