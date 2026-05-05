import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { BOXES_ENDPOINT } from '../services/api';
import BackButton from '../components/BackButton';
import BotonSeguro from '../components/BotonSeguro';
import '../assets/css/AdminBoxPanel.css'; // Reusing existing styles for consistency

export default function GestionReglamento() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [box, setBox] = useState(null);
  const [loading, setLoading] = useState(true);

  const [tabActiva, setTabActiva] = useState('editor'); // 'editor' | 'historial'

  // Editor State
  const [reglamentoHtml, setReglamentoHtml] = useState('');
  const [actualizadoEn, setActualizadoEn] = useState(null);
  const [guardando, setGuardando] = useState(false);

  // Historial State
  const [firmas, setFirmas] = useState([]);
  const [cargandoFirmas, setCargandoFirmas] = useState(false);
  const [firmaSeleccionada, setFirmaSeleccionada] = useState(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState(null);
  const [firmaSeleccionadaParaPdf, setFirmaSeleccionadaParaPdf] = useState(null);
  const [generandoPdf, setGenerandoPdf] = useState(false);
  const [busquedaFirma, setBusquedaFirma] = useState('');

  const firmasFiltradas = firmas.filter(f => {
    if (!busquedaFirma) return true;
    const b = busquedaFirma.toLowerCase();
    const nombre = `${f.usuario.nombre} ${f.usuario.apellidos}`.toLowerCase();
    const correo = (f.usuario.correo || '').toLowerCase();
    const fecha = new Date(f.fechaFirma).toLocaleString('es-MX').toLowerCase();
    return nombre.includes(b) || correo.includes(b) || fecha.includes(b);
  });

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem('usuario'));
    const b = JSON.parse(localStorage.getItem('box'));

    if (!u || !b) {
      navigate('/login');
      return;
    }

    setUser(u);
    setBox(b);
    cargarReglamento(b.idBox);
  }, [navigate]);

  useEffect(() => {
    if (tabActiva === 'historial' && box && firmas.length === 0) {
      cargarFirmas(box.idBox);
    }
  }, [tabActiva, box]);

  const cargarReglamento = async (idBox) => {
    try {
      const res = await fetch(`${BOXES_ENDPOINT}/${idBox}/reglamento`);
      if (res.ok) {
        const data = await res.json();
        setReglamentoHtml(data.reglamentoHtml || '');
        setActualizadoEn(data.reglamentoActualizadoEn);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const cargarFirmas = async (idBox) => {
    setCargandoFirmas(true);
    try {
      const res = await fetch(`${BOXES_ENDPOINT}/${idBox}/firmas-reglamento`);
      if (res.ok) {
        const data = await res.json();
        setFirmas(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCargandoFirmas(false);
    }
  };

  const guardarReglamento = async () => {
    if (!await window.wpConfirm("¿Estás seguro de guardar los cambios? Esto obligará a TODOS los atletas a volver a firmar al iniciar sesión.")) return;
    
    setGuardando(true);
    try {
      const res = await fetch(`${BOXES_ENDPOINT}/${box.idBox}/reglamento`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reglamentoHtml })
      });
      if (res.ok) {
        const data = await res.json();
        setActualizadoEn(data.actualizadoEn);
        alert("Reglamento guardado exitosamente. Todos los atletas deberán firmarlo de nuevo.");
      } else {
        alert("Error al guardar el reglamento.");
      }
    } catch (err) {
      console.error(err);
      alert("Error de conexión.");
    } finally {
      setGuardando(false);
    }
  };

  const previsualizarPdf = (firma) => {
    // 1. Verificación: ¿El atleta firmó antes o después de la última actualización?
    const fechaFirma = new Date(firma.fechaFirma);
    const fechaActualizacion = actualizadoEn ? new Date(actualizadoEn) : new Date(0);
    
    if (fechaFirma < fechaActualizacion) {
      alert("⚠️ Esta firma pertenece a una versión anterior del reglamento. El atleta debe firmar el reglamento actual para generar su documento PDF.");
      return;
    }

    setGenerandoPdf(true);

    // 2. Cargar html2pdf si no existe
    if (!window.html2pdf) {
      const script = document.createElement('script');
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
      script.onload = () => generarDocumentoPdf(firma);
      document.body.appendChild(script);
    } else {
      generarDocumentoPdf(firma);
    }
  };

  const generarDocumentoPdf = (firma) => {
    const contenedor = document.createElement('div');
    contenedor.style.padding = '40px';
    contenedor.style.fontFamily = 'Arial, sans-serif';
    contenedor.style.color = '#000';
    contenedor.style.backgroundColor = '#fff';

    const fechaFirmaStr = new Date(firma.fechaFirma).toLocaleString('es-MX', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });

    const nombreCompleto = `${firma.usuario.nombre} ${firma.usuario.apellidos}`;

    contenedor.innerHTML = `
      <div style="text-align: center; margin-bottom: 30px;">
        <h2>Reglamento Oficial y Carta Compromiso</h2>
      </div>
      <p style="font-size: 14px; line-height: 1.6; text-align: justify; margin-bottom: 20px;">
        Yo, <strong>${nombreCompleto}</strong>, el día <strong>${fechaFirmaStr}</strong>, declaro haber leído, comprendido y me comprometo a cumplir estrictamente con todo lo estipulado en el siguiente reglamento interno del Box:
      </p>
      <hr style="margin-bottom: 20px;" />
      <div style="font-size: 13px; line-height: 1.5; color: #333;">
        ${reglamentoHtml}
      </div>
      <hr style="margin-top: 30px; margin-bottom: 30px;" />
      <div style="text-align: center; margin-top: 40px; page-break-inside: avoid;">
        <p style="margin-bottom: 10px; font-weight: bold;">Firma de Conformidad</p>
        <img src="${firma.firmaBase64}" style="max-height: 120px; max-width: 300px; border-bottom: 1px solid #000; padding-bottom: 5px;" />
        <p style="margin-top: 5px;">${nombreCompleto}</p>
      </div>
    `;

    const opt = {
      margin:       10,
      filename:     `Reglamento_${firma.usuario.nombre.replace(/\s+/g, '_')}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    window.html2pdf().set(opt).from(contenedor).toPdf().get('pdf').then((pdf) => {
      const pdfUrl = pdf.output('bloburl');
      setPdfPreviewUrl(pdfUrl);
      setFirmaSeleccionadaParaPdf(firma);
      setGenerandoPdf(false);
    });
  };

  const descargarBlob = () => {
    if (!pdfPreviewUrl || !firmaSeleccionadaParaPdf) return;
    const a = document.createElement('a');
    a.href = pdfPreviewUrl;
    a.download = `Reglamento_${firmaSeleccionadaParaPdf.usuario.nombre.replace(/\s+/g, '_')}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (loading) {
    return (
      <div className="abp-loading">
        <div className="spinner-border text-danger" role="status" style={{ width: '3rem', height: '3rem' }}></div>
      </div>
    );
  }

  return (
    <div className="abp-page" style={{ paddingBottom: '5rem' }}>
      <div className="container-xl px-3 px-md-4">
        
        {/* Header */}
        <section className="abp-hero" style={{ paddingBottom: '1.5rem', marginBottom: '1.5rem' }}>
          <div className="d-flex justify-content-between align-items-start gap-3">
            <div>
              <BackButton />
              <h1 className="abp-box-title mt-2">Reglamento del Box</h1>
              <p className="abp-hero-sub">Define las reglas que todos los atletas deben aceptar y firmar.</p>
            </div>
          </div>
        </section>

        {/* Tabs */}
        <ul className="nav nav-pills mb-4 gap-2">
          <li className="nav-item">
            <button 
              className={`nav-link ${tabActiva === 'editor' ? 'active bg-danger text-white' : 'bg-dark text-light'}`}
              onClick={() => setTabActiva('editor')}
              style={{ borderRadius: '20px', fontWeight: 'bold' }}
            >
              <i className="fas fa-edit me-2"></i>Editor del Reglamento
            </button>
          </li>
          <li className="nav-item">
            <button 
              className={`nav-link ${tabActiva === 'historial' ? 'active bg-danger text-white' : 'bg-dark text-light'}`}
              onClick={() => setTabActiva('historial')}
              style={{ borderRadius: '20px', fontWeight: 'bold' }}
            >
              <i className="fas fa-file-signature me-2"></i>Historial de Firmas
            </button>
          </li>
        </ul>

        {/* Tab Content: Editor */}
        {tabActiva === 'editor' && (
          <div className="card bg-dark text-light border-secondary shadow-lg">
            <div className="card-header border-secondary d-flex justify-content-between align-items-center py-3">
              <h5 className="mb-0 text-danger" style={{ fontWeight: '800' }}>
                <i className="fas fa-file-alt me-2"></i>Redactar Reglamento
              </h5>
              {actualizadoEn && (
                <small className="text-muted">
                  Última actualización: {new Date(actualizadoEn).toLocaleString('es-MX')}
                </small>
              )}
            </div>
            <div className="card-body bg-white text-dark p-0" style={{ borderRadius: '0 0 0.375rem 0.375rem' }}>
              {/* Quill Editor */}
              <ReactQuill 
                theme="snow" 
                value={reglamentoHtml} 
                onChange={setReglamentoHtml} 
                style={{ minHeight: '400px', border: 'none' }}
              />
            </div>
            <div className="card-footer bg-dark border-secondary text-end py-3">
              <BotonSeguro 
                className="btn btn-danger px-4" 
                style={{ borderRadius: '20px', fontWeight: 'bold' }}
                onClick={guardarReglamento}
                disabled={guardando}
                textoProcesando="Guardando..."
              >
                <i className="fas fa-save me-2"></i>GUARDAR Y EXIGIR FIRMA
              </BotonSeguro>
            </div>
          </div>
        )}

        {/* Tab Content: Historial de Firmas */}
        {tabActiva === 'historial' && (
          <div className="card bg-dark text-light border-secondary shadow-lg">
            <div className="card-header border-secondary py-3 d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
              <h5 className="mb-0 text-danger" style={{ fontWeight: '800' }}>
                <i className="fas fa-list me-2"></i>Atletas que han firmado
              </h5>
              <div className="input-group" style={{ maxWidth: '350px' }}>
                <span className="input-group-text bg-dark border-secondary text-muted">
                  <i className="fas fa-search"></i>
                </span>
                <input 
                  type="text" 
                  className="form-control bg-dark text-light border-secondary" 
                  placeholder="Buscar nombre, correo o fecha..."
                  value={busquedaFirma}
                  onChange={(e) => setBusquedaFirma(e.target.value)}
                />
                {busquedaFirma && (
                  <button 
                    className="btn btn-outline-secondary" 
                    type="button" 
                    onClick={() => setBusquedaFirma('')}
                  >
                    <i className="fas fa-times"></i>
                  </button>
                )}
              </div>
            </div>
            <div className="card-body p-0">
              {cargandoFirmas ? (
                <div className="text-center py-5 text-muted">
                  <div className="spinner-border text-danger mb-3" role="status"></div>
                  <p>Cargando firmas...</p>
                </div>
              ) : firmas.length === 0 ? (
                <div className="text-center py-5 text-muted">
                  <i className="fas fa-signature fa-3x mb-3" style={{ opacity: 0.3 }}></i>
                  <p>Aún no hay firmas registradas.</p>
                </div>
              ) : firmasFiltradas.length === 0 ? (
                <div className="text-center py-5 text-muted">
                  <i className="fas fa-search fa-3x mb-3" style={{ opacity: 0.3 }}></i>
                  <p>No se encontraron firmas que coincidan con "{busquedaFirma}".</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-dark table-hover mb-0">
                    <thead>
                      <tr>
                        <th className="text-muted border-secondary">Atleta</th>
                        <th className="text-muted border-secondary">Correo</th>
                        <th className="text-muted border-secondary">Fecha de Firma</th>
                        <th className="text-muted border-secondary text-center">Firma</th>
                      </tr>
                    </thead>
                    <tbody>
                      {firmasFiltradas.map((f) => (
                        <tr key={f.idFirma}>
                          <td className="border-secondary fw-bold text-light">
                            {f.usuario.nombre} {f.usuario.apellidos}
                          </td>
                          <td className="border-secondary">{f.usuario.correo}</td>
                          <td className="border-secondary text-info">
                            {new Date(f.fechaFirma).toLocaleString('es-MX')}
                          </td>
                          <td className="border-secondary text-center">
                            <button 
                              className="btn btn-sm btn-outline-info rounded-pill me-2"
                              onClick={() => setFirmaSeleccionada(f)}
                              title="Ver firma"
                            >
                              <i className="fas fa-eye"></i>
                            </button>
                            <button 
                              className="btn btn-sm btn-outline-danger rounded-pill"
                              onClick={() => previsualizarPdf(f)}
                              title="Previsualizar PDF"
                              disabled={generandoPdf}
                            >
                              <i className={generandoPdf ? "fas fa-spinner fa-spin" : "fas fa-file-pdf"}></i>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* Modal para ver la firma en grande */}
      {firmaSeleccionada && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content bg-dark text-light border-secondary">
              <div className="modal-header border-secondary">
                <h5 className="modal-title text-danger fw-bold">
                  Firma de {firmaSeleccionada.usuario.nombre}
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setFirmaSeleccionada(null)}></button>
              </div>
              <div className="modal-body text-center bg-white p-4" style={{ borderBottomLeftRadius: '0.375rem', borderBottomRightRadius: '0.375rem' }}>
                <img 
                  src={firmaSeleccionada.firmaBase64} 
                  alt="Firma del Atleta" 
                  style={{ maxWidth: '100%', border: '1px dashed #ccc' }} 
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal para PREVISUALIZAR el PDF */}
      {pdfPreviewUrl && firmaSeleccionadaParaPdf && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.9)', zIndex: 1060 }}>
          <div className="modal-dialog modal-xl modal-dialog-centered">
            <div className="modal-content bg-dark text-light border-secondary" style={{ height: '85vh' }}>
              <div className="modal-header border-secondary">
                <h5 className="modal-title text-danger fw-bold">
                  <i className="fas fa-file-pdf me-2"></i>Previsualización de Documento
                </h5>
                <div>
                  <button 
                    type="button" 
                    className="btn btn-danger me-3" 
                    onClick={descargarBlob}
                    style={{ borderRadius: '20px', fontWeight: 'bold' }}
                  >
                    <i className="fas fa-download me-2"></i>Descargar PDF
                  </button>
                  <button type="button" className="btn-close btn-close-white" onClick={() => {
                    setPdfPreviewUrl(null);
                    setFirmaSeleccionadaParaPdf(null);
                  }}></button>
                </div>
              </div>
              <div className="modal-body p-0 bg-white">
                <iframe 
                  src={pdfPreviewUrl} 
                  style={{ width: '100%', height: '100%', border: 'none' }} 
                  title="PDF Preview"
                ></iframe>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
