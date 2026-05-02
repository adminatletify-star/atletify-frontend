import { useState, useEffect } from 'react';
import '../assets/css/Directorio.css';

export default function ModalVerExpediente({ atleta, onClose }) {
  const [datos, setDatos] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const idUsuario = atleta.idUsuario || atleta.IdUsuario;
    fetch(`${import.meta.env.VITE_API_URL}/api/ExpedienteMedico/usuario/${idUsuario}`)
      .then(res => res.json())
      .then(data => {
        setDatos(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error al obtener el expediente:", err);
        setLoading(false);
      });
  }, [atleta]);

  const padMedic = [
    { name: 'hipertension', label: 'Hipertensión' },
    { name: 'problemasHabla', label: 'Problemas del Habla' },
    { name: 'problemasExtremidad', label: 'Problemas con alguna extremidad' },
    { name: 'problemasEspalda', label: 'Problemas en la espalda' },
    { name: 'lumbalgia', label: 'Lumbalgia' },
    { name: 'cirugiaReciente', label: 'Cirugía Reciente' },
    { name: 'fracturado', label: 'Se ha fracturado' },
    { name: 'tiroides', label: 'Tiroides' },
    { name: 'tda', label: 'TDA' },
    { name: 'alergias', label: 'Alergias' },
    { name: 'inmunodeficiencia', label: 'Síndrome de Inmunodeficiencia' },
    { name: 'esclerosisMultiple', label: 'Esclerosis Múltiple' },
    { name: 'parkinson', label: 'Parkinson' },
    { name: 'alcohol', label: 'Alcohol' },
    { name: 'calmantes', label: 'Calmantes' },
    { name: 'diabetes', label: 'Diabetes' },
    { name: 'problemasOido', label: 'Problemas de Oído' },
    { name: 'plantilla', label: 'Usa Plantilla' },
    { name: 'escoliosis', label: 'Escoliosis' },
    { name: 'cirugiaMetales', label: 'Cirugía con metales' },
    { name: 'cirugiaMas1Ano', label: 'Cirugía de más de 1 año' },
    { name: 'problemasCorazon', label: 'Problemas del Corazón' },
    { name: 'autismo', label: 'Autismo' },
    { name: 'sindromeDown', label: 'Síndrome de Down' },
    { name: 'cancer', label: 'Cáncer' },
    { name: 'lupus', label: 'Lupus' },
    { name: 'fumador', label: 'Fumador' },
    { name: 'cannabis', label: 'Cannabis' },
  ];

  if (loading) {
    return (
      <div className="directorio-modal-overlay" style={{ zIndex: 10000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div className="spinner-wp"></div>
      </div>
    );
  }

  // Filtrar solo las condiciones que marcó como true
  const padecimientosPositivos = datos ? padMedic.filter(pad => datos[pad.name] === true) : [];

  return (
    <div className="directorio-modal-overlay" style={{ zIndex: 10000, overflowY: 'auto', padding: '20px 0' }} onClick={onClose}>
      <div className="directorio-modal" style={{ maxWidth: '700px', cursor: 'default' }} onClick={(e) => e.stopPropagation()}>

        <button onClick={onClose} className="directorio-modal-close" style={{ top: '15px', right: '15px', zIndex: 10001 }}>
          <i className="fas fa-times"></i>
        </button>

        <div className="directorio-modal-header bg-danger text-white p-4" style={{ borderTopLeftRadius: '15px', borderTopRightRadius: '15px' }}>
          <div className="d-flex align-items-center gap-3">
            <div className="directorio-modal-avatar bg-white text-danger">
              {(atleta.nombre || atleta.Nombre || '?').charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="mb-0 text-white">{atleta.nombre || atleta.Nombre} {atleta.apellidos || atleta.Apellidos}</h3>
              <p className="mb-0 text-white opacity-75 mt-1"><i className="fas fa-notes-medical me-1"></i> Expediente Médico Completo</p>
            </div>
          </div>
        </div>

        <div className="directorio-modal-body p-4">

          {!datos || (!datos.idExpediente) ? (
            <div className="alert alert-warning text-center">
              <i className="fas fa-exclamation-triangle fs-3 mb-2 d-block"></i>
              Este atleta aún no ha llenado su expediente médico.
            </div>
          ) : (
            <>
              {/* FECHA DE ACTUALIZACIÓN */}
              <div className="text-end mb-4">
                <span className="badge bg-secondary">
                  <i className="fas fa-clock me-1"></i>
                  Última actualización: {datos.fechaActualizacion
                    ? new Date(datos.fechaActualizacion).toLocaleDateString()
                    : (datos.fechaRegistro ? new Date(datos.fechaRegistro).toLocaleDateString() : 'Original')}
                </span>
              </div>

              {/* DATOS FÍSICOS Y PERSONALES */}
              <h5 className="border-bottom pb-2 mb-3 text-danger"><i className="fas fa-ruler-combined me-2"></i> Datos Físicos</h5>
              <div className="row mb-4 g-3">
                <div className="col-4">
                  <div className="text-muted small">Estatura</div>
                  <div className="fw-bold">{datos.estatura ? `${datos.estatura} cm` : 'No especificada'}</div>
                </div>
                <div className="col-4">
                  <div className="text-muted small">Peso</div>
                  <div className="fw-bold">{datos.peso ? `${datos.peso} kg` : 'No especificado'}</div>
                </div>
                <div className="col-4">
                  <div className="text-muted small">Tipo de Sangre</div>
                  <div className="fw-bold text-danger">{datos.tipoDeSangre || 'No especificado'}</div>
                </div>
                <div className="col-4">
                  <div className="text-muted small">Estado Civil</div>
                  <div className="fw-bold">{datos.estadoCivil || 'No especificado'}</div>
                </div>
              </div>

              {/* CONTACTO DE EMERGENCIA */}
              <h5 className="border-bottom pb-2 mb-3 text-danger"><i className="fas fa-phone-alt me-2"></i> Contacto de Emergencia</h5>
              <div className="row mb-4 g-3 p-3 bg-light rounded text-dark">
                <div className="col-md-6">
                  <div className="text-muted small">Nombre</div>
                  <div className="fw-bold">{datos.contactoEmergenciaNombre || 'No especificado'}</div>
                </div>
                <div className="col-md-6">
                  <div className="text-muted small">Teléfono</div>
                  <div className="fw-bold">{datos.contactoEmergenciaTelefono || 'No especificado'}</div>
                  {datos.contactoEmergenciaTelefono && (
                    <a href={`https://wa.me/${datos.contactoEmergenciaTelefono}`} target="_blank" rel="noreferrer" className="btn btn-sm btn-success mt-1">
                      <i className="fab fa-whatsapp me-1"></i> Contactar
                    </a>
                  )}
                </div>
              </div>

              {/* EXPERIENCIA Y DISCAPACIDAD */}
              <h5 className="border-bottom pb-2 mb-3 mt-4 text-danger"><i className="fas fa-running me-2"></i> Experiencia y Otras Discapacidades</h5>
              <div className="row mb-4 g-3 p-3 bg-light rounded text-dark">
                <div className="col-md-4">
                  <div className="text-muted small">¿Experiencia previa?</div>
                  <div className="fw-bold">
                    {datos.tieneExperiencia ? <span className="text-success"><i className="fas fa-check-circle me-1"></i> Sí</span> : <span className="text-danger"><i className="fas fa-times-circle me-1"></i> No</span>}
                  </div>
                </div>
                <div className="col-md-8">
                  <div className="text-muted small">Deporte(s) practicado(s)</div>
                  <div className="fw-bold">{datos.tieneExperiencia ? (datos.deporteExperiencia || 'No especificado') : 'N/A'}</div>
                </div>
                <div className="col-12 mt-3">
                  <div className="text-muted small">Otras discapacidades</div>
                  <div className="fw-bold">{datos.tieneDiscapacidad || 'Ninguna registrada'}</div>
                </div>
              </div>

              {/* HISTORIAL MÉDICO */}
              <h5 className="border-bottom pb-2 mb-3 text-danger"><i className="fas fa-heartbeat me-2"></i> Condiciones Médicas Declaradas</h5>
              <div className="mb-4">
                {padecimientosPositivos.length === 0 ? (
                  <div className="text-muted"><i className="fas fa-check-circle text-success me-1"></i> El atleta declaró no tener ninguna condición médica.</div>
                ) : (
                  <div className="d-flex flex-wrap gap-2">
                    {padecimientosPositivos.map(pad => (
                      <span key={pad.name} className="badge bg-danger">
                        {pad.label}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* PREGUNTAS ABIERTAS */}
              <h5 className="border-bottom pb-2 mb-3 text-danger"><i className="fas fa-prescription-bottle-alt me-2"></i> Detalles Adicionales</h5>

              {datos.alergias && (
                <div className="mb-3">
                  <div className="text-muted small">Descripción de Alergias:</div>
                  <div className="p-2 border rounded bg-dark text-light">{datos.alergiasDescripcion || 'Sin descripción'}</div>
                </div>
              )}

              <div className="mb-3">
                <div className="text-muted small">Medicamento Controlado:</div>
                <div className="p-2 border rounded bg-dark text-light">{datos.medicamentoControlado || 'Ninguno'}</div>
              </div>

              <div className="mb-3">
                <div className="text-muted small">Suplementos / Vitaminas:</div>
                <div className="p-2 border rounded bg-dark text-light">{datos.suplementosVitaminas || 'Ninguno'}</div>
              </div>

            </>
          )}

        </div>
      </div>
    </div>
  );
}
