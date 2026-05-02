import { useState, useEffect } from 'react';
import '../assets/css/Directorio.css'; // Reutilizamos estilos

export default function ModalExpedienteMedico({ idUsuario, onCompletado, isPage = false }) {
  const [loadingDatos, setLoadingDatos] = useState(true);
  const [enviando, setEnviando] = useState(false);

  const [form, setForm] = useState({
    estatura: '',
    estadoCivil: '',
    peso: '',
    tipoDeSangre: '',
    contactoEmergenciaNombre: '',
    contactoEmergenciaTelefono: '',
    alergiasDescripcion: '',
    correo: '',
    telefono: '',
    fechaNacimiento: '',

    tieneExperiencia: false,
    deporteExperiencia: '',
    tieneDiscapacidad: '',

    // Booleanos
    hipertension: false,
    problemasHabla: false,
    problemasExtremidad: false,
    problemasEspalda: false,
    lumbalgia: false,
    cirugiaReciente: false,
    fracturado: false,
    tiroides: false,
    tda: false,
    alergias: false,
    inmunodeficiencia: false,
    esclerosisMultiple: false,
    parkinson: false,
    alcohol: false,
    calmantes: false,
    diabetes: false,
    problemasOido: false,
    plantilla: false,
    escoliosis: false,
    cirugiaMetales: false,
    cirugiaMas1Ano: false,
    problemasCorazon: false,
    autismo: false,
    sindromeDown: false,
    cancer: false,
    lupus: false,
    fumador: false,
    cannabis: false,

    // Textos finales
    medicamentoControlado: '',
    suplementosVitaminas: ''
  });

  const [usuarioData, setUsuarioData] = useState(null); // Para leer fecha de nacimiento y nombre si es necesario mostrarlo

  useEffect(() => {
    // 1. Obtener los datos actuales del usuario para llenar los campos ya existentes
    const fetchDatos = async () => {
      try {
        const u = JSON.parse(localStorage.getItem('usuario'));
        setUsuarioData(u);

        const res = await fetch(`import.meta.env.VITE_API_URL:7149/api/ExpedienteMedico/usuario/${idUsuario}`);
        if (res.ok) {
          const data = await res.json();
          // Pre-llenar form con lo que ya tenga en Usuario
          setForm(prev => ({
            ...prev,
            peso: data.peso || u.peso || u.Peso || '',
            tipoDeSangre: data.tipoDeSangre || u.tipoDeSangre || u.TipoDeSangre || '',
            contactoEmergenciaNombre: data.contactoEmergenciaNombre || '',
            contactoEmergenciaTelefono: data.contactoEmergenciaTelefono || '',
            alergiasDescripcion: data.alergiasDescripcion || '',
            correo: data.correo || u.correo || u.Correo || '',
            telefono: data.telefono || u.telefono || u.Telefono || '',
            fechaNacimiento: data.fechaNacimiento ? data.fechaNacimiento.split('T')[0] : (u.fechaNacimiento || u.FechaNacimiento ? (u.fechaNacimiento || u.FechaNacimiento).split('T')[0] : ''),
            tieneExperiencia: data.tieneExperiencia || false,
            deporteExperiencia: data.deporteExperiencia || '',
            tieneDiscapacidad: data.tieneDiscapacidad || '',

            // Si ya tuviera algo de expediente guardado, pre-llenar todo:
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
            cannabis: data.cannabis || false
          }));
        }
      } catch (error) {
        console.error("Error cargando expediente base", error);
      } finally {
        setLoadingDatos(false);
      }
    };
    fetchDatos();
  }, [idUsuario]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    // Validación especial para teléfonos (solo números, max 10)
    if ((name === 'telefono' || name === 'contactoEmergenciaTelefono')) {
      const numericValue = value.replace(/\D/g, '');
      if (numericValue.length > 10) return;
      setForm(prev => ({ ...prev, [name]: numericValue }));
      return;
    }

    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const calcularEdad = (fechaStr) => {
    if (!fechaStr) return 'Edad desconocida';
    const hoy = new Date();
    const cumple = new Date(fechaStr);
    let edad = hoy.getFullYear() - cumple.getFullYear();
    const m = hoy.getMonth() - cumple.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < cumple.getDate())) { edad--; }
    return edad;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setEnviando(true);

    try {
      const payload = {
        idUsuario: idUsuario,
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
        suplementosVitaminas: form.suplementosVitaminas
      };

      const res = await fetch(`import.meta.env.VITE_API_URL:7149/api/ExpedienteMedico`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        alert("Expediente médico guardado correctamente.");
        onCompletado();
      } else {
        alert("Error al guardar el expediente.");
      }
    } catch (error) {
      console.error(error);
      alert("Error de conexión al guardar.");
    } finally {
      setEnviando(false);
    }
  };

  const padMedic = [
    { name: 'hipertension', label: 'HIPERTENSIÓN' },
    { name: 'problemasHabla', label: 'PROBLEMAS DEL HABLA' },
    { name: 'problemasExtremidad', label: 'PROBLEMAS CON ALGUNA EXTREMIDAD' },
    { name: 'problemasEspalda', label: 'PROBLEMAS EN LA ESPALDA' },
    { name: 'lumbalgia', label: 'LUMBALGIA' },
    { name: 'cirugiaReciente', label: 'CIRUGÍA RECIENTE' },
    { name: 'fracturado', label: 'TE HAS FRACTURADO' },
    { name: 'tiroides', label: 'TIROIDES' },
    { name: 'tda', label: 'TDA' },
    { name: 'alergias', label: 'ALERGIAS' },
    { name: 'inmunodeficiencia', label: 'SÍNDROME DE INMUNODEFICIENCIA' },
    { name: 'esclerosisMultiple', label: 'ESCLEROSIS MÚLTIPLE' },
    { name: 'parkinson', label: 'PARKINSON' },
    { name: 'alcohol', label: 'ALCOHOL' },
    { name: 'calmantes', label: 'CALMANTES' },
    { name: 'diabetes', label: 'DIABETES' },
    { name: 'problemasOido', label: 'PROBLEMAS DE OÍDO' },
    { name: 'plantilla', label: 'PLANTILLA' },
    { name: 'escoliosis', label: 'ESCOLIOSIS' },
    { name: 'cirugiaMetales', label: 'CIRUGÍA CON METALES' },
    { name: 'cirugiaMas1Ano', label: 'CIRUGÍA DE MÁS DE 1 AÑO' },
    { name: 'problemasCorazon', label: 'PROBLEMAS DEL CORAZÓN' },
    { name: 'autismo', label: 'AUTISMO' },
    { name: 'sindromeDown', label: 'SÍNDROME DE DOWN' },
    { name: 'cancer', label: 'CÁNCER' },
    { name: 'lupus', label: 'LUPUS' },
    { name: 'fumador', label: 'FUMADOR' },
    { name: 'cannabis', label: 'CANNABIS' },
  ];

  if (loadingDatos) {
    return (
      <div className={isPage ? "" : "directorio-modal-overlay d-flex justify-content-center align-items-center"} style={isPage ? { padding: '50px', textAlign: 'center' } : { zIndex: 9999 }}>
        <div className="spinner-wp"></div>
      </div>
    );
  }

  return (
    <div className={isPage ? "" : "directorio-modal-overlay"} style={isPage ? {} : { zIndex: 9999, overflowY: 'auto', padding: '20px 0' }}>
      <div className="directorio-modal" style={isPage ? { maxWidth: '100%', margin: '0', boxShadow: 'none' } : { maxWidth: '800px', cursor: 'default' }}>

        <div className="directorio-modal-header bg-danger text-white p-4" style={{ borderTopLeftRadius: '15px', borderTopRightRadius: '15px' }}>
          <h3 className="mb-0 text-white"><i className="fas fa-notes-medical me-2"></i> {isPage ? "Mi Expediente Médico" : "Expediente Médico Obligatorio"}</h3>
          <p className="mb-0 text-white opacity-75 mt-1">
            {isPage ? "Actualiza o revisa tu historial médico para que tus coaches estén enterados." : "Por reglamento y tu seguridad, no puedes continuar sin completar tu historial médico."}
          </p>
        </div>

        <div className="directorio-modal-body p-4">
          <form onSubmit={handleSubmit}>

            {/* DATOS PERSONALES */}
            <h5 className="border-bottom pb-2 mb-3 text-danger"><i className="fas fa-user-circle me-2"></i> Datos Personales</h5>
            <div className="row g-3 mb-4">
              <div className="col-md-6">
                <label className="etiqueta-campo">Nombre Completo (Sólo lectura)</label>
                <input type="text" className="entrada-oscura directorio-input" value={`${usuarioData?.nombre || ''} ${usuarioData?.apellidos || ''}`} disabled />
              </div>
              <div className="col-md-6">
                <label className="etiqueta-campo text-danger">Correo *</label>
                <input type="email" required name="correo" className="entrada-oscura directorio-input" value={form.correo} onChange={handleChange} />
              </div>
              <div className="col-md-6">
                <label className="etiqueta-campo text-danger">Teléfono (10 dígitos) *</label>
                <input type="text" required name="telefono" maxLength="10" minLength="10" className="entrada-oscura directorio-input" value={form.telefono} onChange={handleChange} placeholder="Ej: 5512345678" />
              </div>
              <div className="col-md-3">
                <label className="etiqueta-campo text-danger">Fecha de Nac. *</label>
                <input type="date" required name="fechaNacimiento" className="entrada-oscura directorio-input" value={form.fechaNacimiento} onChange={handleChange} />
              </div>
              <div className="col-md-3">
                <label className="etiqueta-campo">Edad</label>
                <input type="text" className="entrada-oscura directorio-input" value={calcularEdad(form.fechaNacimiento)} disabled />
              </div>

              <div className="col-md-3">
                <label className="etiqueta-campo text-danger">Estatura (cm) *</label>
                <input type="number" required name="estatura" className="entrada-oscura directorio-input" value={form.estatura} onChange={handleChange} placeholder="Ej: 175" />
              </div>
              <div className="col-md-3">
                <label className="etiqueta-campo text-danger">Peso (kg) *</label>
                <input type="number" required step="0.1" name="peso" className="entrada-oscura directorio-input" value={form.peso} onChange={handleChange} placeholder="Ej: 70.5" />
              </div>
              <div className="col-md-3">
                <label className="etiqueta-campo text-danger">Tipo de Sangre *</label>
                <select required name="tipoDeSangre" className="entrada-oscura directorio-input" value={form.tipoDeSangre} onChange={handleChange}>
                  <option value="">Selecciona...</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                </select>
              </div>
              <div className="col-md-3">
                <label className="etiqueta-campo text-danger">Estado Civil *</label>
                <select required name="estadoCivil" className="entrada-oscura directorio-input" value={form.estadoCivil} onChange={handleChange}>
                  <option value="">Selecciona...</option>
                  <option value="Soltero(a)">Soltero(a)</option>
                  <option value="Casado(a)">Casado(a)</option>
                  <option value="Divorciado(a)">Divorciado(a)</option>
                  <option value="Viudo(a)">Viudo(a)</option>
                  <option value="Union Libre">Unión Libre</option>
                </select>
              </div>
            </div>

            {/* CONTACTO DE EMERGENCIA */}
            <h5 className="border-bottom pb-2 mb-3 text-danger"><i className="fas fa-phone-alt me-2"></i> Contacto de Emergencia</h5>
            <div className="row g-3 mb-4">
              <div className="col-md-6">
                <label className="etiqueta-campo text-danger">Nombre de Contacto *</label>
                <input type="text" required name="contactoEmergenciaNombre" className="entrada-oscura directorio-input" value={form.contactoEmergenciaNombre} onChange={handleChange} placeholder="Nombre completo" />
              </div>
              <div className="col-md-6">
                <label className="etiqueta-campo text-danger">Teléfono de Contacto (10 dígitos) *</label>
                <input type="text" required name="contactoEmergenciaTelefono" maxLength="10" minLength="10" className="entrada-oscura directorio-input" value={form.contactoEmergenciaTelefono} onChange={handleChange} placeholder="Teléfono a 10 dígitos" />
              </div>
            </div>

            {/* EXPERIENCIA Y DISCAPACIDAD */}
            <h5 className="border-bottom pb-2 mb-3 text-danger"><i className="fas fa-running me-2"></i> Experiencia y Otras Condiciones</h5>
            <div className="row g-3 mb-4">
              <div className="col-md-4">
                <div className="form-check custom-checkbox mt-4">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    name="tieneExperiencia"
                    id="tieneExperiencia"
                    checked={form.tieneExperiencia}
                    onChange={handleChange}
                    style={{ cursor: 'pointer' }}
                  />
                  <label className="form-check-label text-light fw-bold" htmlFor="tieneExperiencia" style={{ cursor: 'pointer' }}>
                    ¿Tienes experiencia deportiva previa?
                  </label>
                </div>
              </div>
              {form.tieneExperiencia && (
                <div className="col-md-8">
                  <label className="etiqueta-campo text-danger">¿Qué deporte(s) practicabas? *</label>
                  <input type="text" required name="deporteExperiencia" className="entrada-oscura directorio-input" value={form.deporteExperiencia} onChange={handleChange} placeholder="Ej. Fútbol, CrossFit, Natación..." />
                </div>
              )}
              <div className="col-12">
                <label className="etiqueta-campo">Otras discapacidades (Opcional)</label>
                <textarea name="tieneDiscapacidad" className="entrada-oscura directorio-input" value={form.tieneDiscapacidad} onChange={handleChange} rows="2" placeholder="Describa si tiene alguna otra discapacidad no listada..."></textarea>
              </div>
            </div>

            {/* HISTORIAL MÉDICO */}
            <h5 className="border-bottom pb-2 mb-3 text-danger"><i className="fas fa-heartbeat me-2"></i> Historial Médico</h5>
            <p className="text-muted small mb-3">Marca las opciones si has padecido o padeces actualmente alguna de las siguientes condiciones:</p>
            <div className="row g-2 mb-4">
              {padMedic.map(pad => (
                <div key={pad.name} className="col-md-4 col-sm-6">
                  <div className="form-check custom-checkbox">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      name={pad.name}
                      id={pad.name}
                      checked={form[pad.name]}
                      onChange={handleChange}
                      style={{ cursor: 'pointer' }}
                    />
                    <label className="form-check-label text-light small" htmlFor={pad.name} style={{ cursor: 'pointer' }}>
                      {pad.label}
                    </label>
                  </div>
                </div>
              ))}
            </div>

            {/* PREGUNTAS FINALES */}
            <h5 className="border-bottom pb-2 mb-3 text-danger"><i className="fas fa-prescription-bottle-alt me-2"></i> Adicionales</h5>

            {form.alergias && (
              <div className="mb-3">
                <label className="etiqueta-campo text-danger">Mencionaste tener Alergias. Especifíca a qué: *</label>
                <textarea required name="alergiasDescripcion" className="entrada-oscura directorio-input" value={form.alergiasDescripcion} onChange={handleChange} rows="2" placeholder="Describa sus alergias..."></textarea>
              </div>
            )}

            <div className="mb-3">
              <label className="etiqueta-campo text-danger">¿Estás tomando ahora algún medicamento controlado? Describa: *</label>
              <textarea required name="medicamentoControlado" className="entrada-oscura directorio-input" value={form.medicamentoControlado} onChange={handleChange} rows="2" placeholder="Si no toma ninguno, escriba 'Ninguno'"></textarea>
            </div>

            <div className="mb-4">
              <label className="etiqueta-campo text-danger">¿Consumes algún suplemento o vitaminas? Describa: *</label>
              <textarea required name="suplementosVitaminas" className="entrada-oscura directorio-input" value={form.suplementosVitaminas} onChange={handleChange} rows="2" placeholder="Si no consume, escriba 'Ninguno'"></textarea>
            </div>

            <div className="d-grid mt-4">
              <button type="submit" className="btn btn-danger btn-lg fw-bold" disabled={enviando}>
                {enviando ? <span className="spinner-border spinner-border-sm me-2"></span> : <i className="fas fa-check-circle me-2"></i>}
                Guardar y Continuar
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}
