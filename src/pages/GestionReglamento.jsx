import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import html2pdf from 'html2pdf.js';
import { BOXES_ENDPOINT, USUARIOS_ENDPOINT } from '../services/api';
import BackButton from '../components/BackButton';
import BotonSeguro from '../components/BotonSeguro';
import AtletifyLoader from '../components/AtletifyLoader';
import '../assets/css/GestionReglamento.css';

export default function GestionReglamento() {
  const navigate = useNavigate();
  const [user, setUser]   = useState(null);
  const [box,  setBox]    = useState(null);
  const [loading, setLoading] = useState(true);

  const [tabActiva, setTabActiva] = useState('editor');

  // ── Editor ──────────────────────────────────────────────────────
  const [reglamentoHtml, setReglamentoHtml] = useState('');
  const [actualizadoEn, setActualizadoEn]   = useState(null);
  const [guardando, setGuardando]           = useState(false);

  // ── Historial ───────────────────────────────────────────────────
  const [atletas, setAtletas]         = useState([]);
  const [firmas, setFirmas]           = useState([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);
  const [busqueda, setBusqueda]       = useState('');

  // ── Modales ─────────────────────────────────────────────────────
  const [atletaConHistorial, setAtletaConHistorial] = useState(null);
  const [firmaSeleccionada, setFirmaSeleccionada]   = useState(null);
  const [pdfPreviewUrl, setPdfPreviewUrl]           = useState(null);
  const [firmaDelPdf, setFirmaDelPdf]               = useState(null);
  const [generandoPdf, setGenerandoPdf]             = useState(null); // idFirma en proceso

  // ── Helpers ─────────────────────────────────────────────────────

  const firmasDeAtleta = (atleta) =>
    firmas
      .filter(f =>
        (atleta.idUsuario && f.usuario?.idUsuario)
          ? f.usuario.idUsuario === atleta.idUsuario
          : f.usuario?.correo === atleta.correo
      )
      .sort((a, b) => new Date(b.fechaFirma) - new Date(a.fechaFirma));

  const ultimaFirma = (atleta) => {
    const fs = firmasDeAtleta(atleta);
    return fs.length > 0 ? fs[0] : null;
  };

  const esFirmaActualizada = (firma) => {
    if (!actualizadoEn) return true;
    return new Date(firma.fechaFirma) >= new Date(actualizadoEn);
  };

  const atletasFiltrados = atletas.filter(a => {
    if (!busqueda) return true;
    const q = busqueda.toLowerCase();
    const nombre = `${a.nombre || ''} ${a.apellidos || a.apellido || ''}`.toLowerCase();
    return nombre.includes(q) || (a.correo || '').toLowerCase().includes(q);
  });

  const countAlDia     = atletas.filter(a => { const u = ultimaFirma(a); return u && esFirmaActualizada(u); }).length;
  const countPendiente = atletas.length - countAlDia;

  // ── Lifecycle ───────────────────────────────────────────────────

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem('usuario'));
    const b = JSON.parse(localStorage.getItem('box'));
    if (!u || !b) { navigate('/login'); return; }
    setUser(u); setBox(b);
    cargarReglamento(b.idBox);
  }, [navigate]);

  useEffect(() => {
    if (tabActiva === 'historial' && box && atletas.length === 0 && !cargandoHistorial) {
      cargarHistorial(box.idBox);
    }
  }, [tabActiva, box]);

  // ── API ─────────────────────────────────────────────────────────

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

  const cargarHistorial = async (idBox) => {
    setCargandoHistorial(true);
    try {
      const [resFirmas, resAtletas] = await Promise.all([
        fetch(`${BOXES_ENDPOINT}/${idBox}/firmas-reglamento`),
        fetch(`${USUARIOS_ENDPOINT}/box/${idBox}/miembros`)
      ]);

      let firmasData = [];
      if (resFirmas.ok) {
        firmasData = await resFirmas.json();
        setFirmas(firmasData);
      }

      if (resAtletas.ok) {
        const data = await resAtletas.json();
        const miembros = (data.miembros || [])
          .filter(m => m.activo)
          .sort((a, b) => (a.nombre || '').localeCompare(b.nombre || '', 'es'));
        setAtletas(miembros);
      } else {
        // Fallback: derivar atletas únicos desde firmas
        const mapa = new Map();
        firmasData.forEach(f => {
          if (f.usuario?.idUsuario && !mapa.has(f.usuario.idUsuario)) {
            mapa.set(f.usuario.idUsuario, {
              idUsuario: f.usuario.idUsuario,
              nombre:    f.usuario.nombre,
              apellidos: f.usuario.apellidos,
              correo:    f.usuario.correo
            });
          }
        });
        setAtletas([...mapa.values()].sort((a, b) => (a.nombre || '').localeCompare(b.nombre || '', 'es')));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCargandoHistorial(false);
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
        // Forzar recarga de historial al volver a esa tab
        setFirmas([]); setAtletas([]);
        alert("Reglamento guardado. Todos los atletas deberán firmarlo de nuevo.");
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

  // ── PDF ─────────────────────────────────────────────────────────

  const iniciarPdf = (firma, saltarValidacion = false) => {
    if (!saltarValidacion) {
      const fechaFirma  = new Date(firma.fechaFirma);
      const fechaUpdate = actualizadoEn ? new Date(actualizadoEn) : new Date(0);
      if (fechaFirma < fechaUpdate) {
        alert("⚠️ Esta firma pertenece a una versión anterior del reglamento.");
        return;
      }
    }
    setGenerandoPdf(firma.idFirma);
    generarDocumentoPdf(firma);
  };

  const generarDocumentoPdf = async (firma) => {
    const nombreCompleto = `${firma.usuario.nombre} ${firma.usuario.apellidos}`;
    const fechaFirmaStr  = new Date(firma.fechaFirma).toLocaleString('es-MX', {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    const div = document.createElement('div');
    div.style.cssText = 'padding:40px;font-family:Arial,sans-serif;color:#000;background:#fff;';
    div.innerHTML = `
      <div style="text-align:center;margin-bottom:30px;"><h2>Reglamento Oficial y Carta Compromiso</h2></div>
      <p style="font-size:14px;line-height:1.6;text-align:justify;margin-bottom:20px;">
        Yo, <strong>${nombreCompleto}</strong>, el día <strong>${fechaFirmaStr}</strong>,
        declaro haber leído, comprendido y me comprometo a cumplir todo lo estipulado en el reglamento interno del Box:
      </p>
      <hr style="margin-bottom:20px;" />
      <div style="font-size:13px;line-height:1.5;color:#333;margin-bottom:80px;">${reglamentoHtml}</div>
    `;

    try {
      const pdf = await html2pdf()
        .set({
          margin: [15, 15, 25, 15],
          filename: `Reglamento_${firma.usuario.nombre.replace(/\s+/g, '_')}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        })
        .from(div).toPdf().get('pdf');

      const W = pdf.internal.pageSize.getWidth();
      const H = pdf.internal.pageSize.getHeight();
      pdf.setPage(pdf.internal.getNumberOfPages());

      const sigY = H - 55;
      pdf.setDrawColor(180, 180, 180);
      pdf.line(15, sigY, W - 15, sigY);
      pdf.setFontSize(11); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(40, 40, 40);
      pdf.text('Firma de Conformidad', W / 2, sigY + 7, { align: 'center' });

      const imgW = 55, imgH = 22, imgX = (W - imgW) / 2;
      pdf.addImage(firma.firmaBase64, 'PNG', imgX, sigY + 10, imgW, imgH);
      pdf.setDrawColor(0, 0, 0);
      pdf.line(imgX - 5, sigY + 34, imgX + imgW + 5, sigY + 34);
      pdf.setFont('helvetica', 'normal'); pdf.setFontSize(10); pdf.setTextColor(60, 60, 60);
      pdf.text(nombreCompleto, W / 2, sigY + 40, { align: 'center' });
      pdf.text(fechaFirmaStr,  W / 2, sigY + 46, { align: 'center' });

      setPdfPreviewUrl(pdf.output('bloburl'));
      setFirmaDelPdf(firma);
    } catch (err) {
      console.error(err);
      alert('Error al generar el PDF.');
    } finally {
      setGenerandoPdf(null);
    }
  };

  const descargarBlob = () => {
    if (!pdfPreviewUrl || !firmaDelPdf) return;
    const a = document.createElement('a');
    a.href = pdfPreviewUrl;
    a.download = `Reglamento_${firmaDelPdf.usuario.nombre.replace(/\s+/g, '_')}.pdf`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  // ── Render ──────────────────────────────────────────────────────

  if (loading) return <div className="gr-loading"><AtletifyLoader /></div>;

  return (
    <div className="gr-page">

      {/* HEADER */}
      <header className="gr-header">
        <div className="d-flex align-items-center gap-3">
          <BackButton />
          <h1 className="gr-header-title">Reglamento del <span>Box</span></h1>
        </div>
      </header>

      <div className="container-xl px-3 px-md-4">

        {/* TABS */}
        <div className="gr-tabs">
          <button
            className={`gr-tab-btn ${tabActiva === 'editor' ? 'gr-tab-btn--active' : ''}`}
            onClick={() => setTabActiva('editor')}
          >
            <i className="fas fa-edit"></i>Editor
          </button>
          <button
            className={`gr-tab-btn ${tabActiva === 'historial' ? 'gr-tab-btn--active' : ''}`}
            onClick={() => setTabActiva('historial')}
          >
            <i className="fas fa-users"></i>Atletas
            {atletas.length > 0 && (
              <span style={{ background: 'rgba(255,255,255,0.15)', borderRadius: '20px', padding: '0 6px', fontSize: '0.72rem', fontWeight: '700' }}>
                {atletas.length}
              </span>
            )}
          </button>
        </div>

        {/* ── TAB EDITOR ── */}
        {tabActiva === 'editor' && (
          <div className="gr-editor-card">
            <div className="gr-editor-card__header">
              <h5 className="gr-editor-card__title">
                <i className="fas fa-file-alt"></i>Redactar Reglamento
              </h5>
              {actualizadoEn && (
                <span className="gr-editor-card__meta">
                  Última actualización: {new Date(actualizadoEn).toLocaleString('es-MX')}
                </span>
              )}
            </div>
            <div className="gr-editor-card__body">
              <ReactQuill
                theme="snow"
                value={reglamentoHtml}
                onChange={setReglamentoHtml}
                style={{ minHeight: '420px', border: 'none' }}
              />
            </div>
            <div className="gr-editor-card__footer">
              <BotonSeguro
                className="gr-save-btn"
                onClick={guardarReglamento}
                disabled={guardando}
                textoProcesando="Guardando..."
              >
                <i className="fas fa-save"></i>GUARDAR Y EXIGIR FIRMA
              </BotonSeguro>
            </div>
          </div>
        )}

        {/* ── TAB ATLETAS ── */}
        {tabActiva === 'historial' && (
          <div className="gr-historial-card">

            {/* Header */}
            <div className="gr-historial-card__header">
              <div className="d-flex align-items-center gap-2 flex-wrap">
                <h5 className="gr-historial-card__title">
                  <i className="fas fa-users"></i>Atletas
                </h5>
                {atletas.length > 0 && (
                  <>
                    <span className="gr-firma-status gr-firma-status--ok">
                      <i className="fas fa-check-circle"></i>{countAlDia} al día
                    </span>
                    {countPendiente > 0 && (
                      <span className="gr-firma-status gr-firma-status--desactualizada">
                        <i className="fas fa-exclamation-triangle"></i>{countPendiente} pendientes
                      </span>
                    )}
                  </>
                )}
              </div>
              <div className="gr-search-wrapper">
                <span className="gr-search-icon"><i className="fas fa-search"></i></span>
                <input
                  type="text"
                  className="gr-search-input"
                  placeholder="Nombre o correo..."
                  value={busqueda}
                  onChange={e => setBusqueda(e.target.value)}
                />
                {busqueda && (
                  <button className="gr-search-clear" onClick={() => setBusqueda('')}>
                    <i className="fas fa-times"></i>
                  </button>
                )}
              </div>
            </div>

            {/* Lista */}
            <div className="gr-historial-card__body">
              {cargandoHistorial ? (
                <div className="gr-empty"><AtletifyLoader /><p>Cargando atletas...</p></div>
              ) : atletas.length === 0 ? (
                <div className="gr-empty">
                  <i className="fas fa-users"></i>
                  <p>No hay atletas registrados.</p>
                </div>
              ) : atletasFiltrados.length === 0 ? (
                <div className="gr-empty">
                  <i className="fas fa-search"></i>
                  <p>Sin resultados para "{busqueda}".</p>
                </div>
              ) : (
                atletasFiltrados.map(atleta => {
                  const todasFirmas  = firmasDeAtleta(atleta);
                  const ultima       = todasFirmas[0] || null;
                  const haFirmado    = !!ultima;
                  const actualizada  = haFirmado ? esFirmaActualizada(ultima) : false;

                  // Estado visual
                  let rowClass    = 'gr-firma-row--sin-firma';
                  let statusClass = 'gr-firma-status--sin-firma';
                  let statusIcon  = 'fa-minus-circle';
                  let statusLabel = 'Sin firma';

                  if (haFirmado && actualizada) {
                    rowClass    = 'gr-firma-row--ok';
                    statusClass = 'gr-firma-status--ok';
                    statusIcon  = 'fa-check-circle';
                    statusLabel = 'Al día';
                  } else if (haFirmado && !actualizada) {
                    rowClass    = 'gr-firma-row--desactualizada';
                    statusClass = 'gr-firma-status--desactualizada';
                    statusIcon  = 'fa-exclamation-triangle';
                    statusLabel = 'Pendiente';
                  }

                  const pdfLoading = generandoPdf === ultima?.idFirma;

                  return (
                    <div key={atleta.idUsuario} className={`gr-firma-row ${rowClass}`}>

                      <div className="gr-firma-avatar">
                        {atleta.foto
                          ? <img src={atleta.foto} alt={atleta.nombre} className="gr-firma-avatar-img" />
                          : (atleta.nombre || '?').charAt(0).toUpperCase()
                        }
                      </div>

                      <div className="gr-firma-info">
                        <div className="gr-firma-nombre">
                          {atleta.nombre} {atleta.apellidos || atleta.apellido || ''}
                        </div>
                        <div className="gr-firma-correo">{atleta.correo}</div>
                      </div>

                      <span className={`gr-firma-status ${statusClass}`}>
                        <i className={`fas ${statusIcon}`}></i>{statusLabel}
                      </span>

                      {ultima && (
                        <div className="gr-firma-fecha">
                          <i className="fas fa-calendar-check"></i>
                          {new Date(ultima.fechaFirma).toLocaleString('es-MX', {
                            year: 'numeric', month: 'short', day: 'numeric',
                            hour: '2-digit', minute: '2-digit'
                          })}
                        </div>
                      )}

                      <div className="gr-firma-actions">
                        {/* Ver firma actual */}
                        <button
                          className="gr-action-btn gr-action-btn--view"
                          onClick={() => setFirmaSeleccionada(ultima)}
                          title="Ver firma actual"
                          disabled={!haFirmado}
                        >
                          <i className="fas fa-eye"></i>
                        </button>

                        {/* PDF firma actual */}
                        <button
                          className="gr-action-btn gr-action-btn--pdf"
                          onClick={() => iniciarPdf(ultima)}
                          title="Generar PDF"
                          disabled={!haFirmado || !actualizada || pdfLoading}
                        >
                          <i className={pdfLoading ? 'fas fa-spinner fa-spin' : 'fas fa-file-pdf'}></i>
                        </button>

                        {/* Historial de firmas */}
                        <button
                          className="gr-action-btn gr-action-btn--historial"
                          onClick={() => setAtletaConHistorial(atleta)}
                          title="Historial de firmas"
                          disabled={!haFirmado}
                        >
                          <i className="fas fa-history"></i>
                        </button>
                      </div>

                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

      </div>

      {/* ── MODAL HISTORIAL DE FIRMAS (renderiza primero) ── */}
      {atletaConHistorial && createPortal(
        <div
          className="gr-modal-overlay"
          onClick={e => { if (e.target === e.currentTarget) setAtletaConHistorial(null); }}
        >
          <div className="gr-modal" style={{ maxWidth: '500px' }}>
            <div className="gr-modal__header">
              <h5 className="gr-modal__title">
                <i className="fas fa-history"></i>
                Historial — {atletaConHistorial.nombre}
              </h5>
              <button className="gr-modal__close" onClick={() => setAtletaConHistorial(null)} aria-label="Cerrar">
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="gr-modal__body" style={{ maxHeight: '65vh', overflowY: 'auto', padding: '1rem' }}>
              {firmasDeAtleta(atletaConHistorial).length === 0 ? (
                <div className="gr-empty">
                  <i className="fas fa-signature"></i>
                  <p>Sin firmas registradas.</p>
                </div>
              ) : (
                <div className="d-flex flex-column gap-2">
                  {firmasDeAtleta(atletaConHistorial).map((f, idx) => {
                    const esActual    = idx === 0;
                    const pdfCargando = generandoPdf === f.idFirma;
                    return (
                      <div key={f.idFirma} className="gr-historial-item">
                        <div className="gr-historial-item__info">
                          {esActual && (
                            <span className="gr-historial-item__badge">
                              <i className="fas fa-star"></i>Actual
                            </span>
                          )}
                          <div className="gr-historial-item__fecha">
                            <i className="fas fa-calendar-alt"></i>
                            {new Date(f.fechaFirma).toLocaleString('es-MX', {
                              year: 'numeric', month: 'long', day: 'numeric',
                              hour: '2-digit', minute: '2-digit'
                            })}
                          </div>
                        </div>
                        <div className="gr-historial-item__actions">
                          <button
                            className="gr-action-btn gr-action-btn--view"
                            onClick={() => setFirmaSeleccionada(f)}
                            title="Ver firma"
                          >
                            <i className="fas fa-eye"></i>
                          </button>
                          <button
                            className="gr-action-btn gr-action-btn--pdf"
                            onClick={() => iniciarPdf(f, true)}
                            title="Generar PDF"
                            disabled={pdfCargando}
                          >
                            <i className={pdfCargando ? 'fas fa-spinner fa-spin' : 'fas fa-file-pdf'}></i>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── MODAL VER FIRMA (encima del historial por orden DOM) ── */}
      {firmaSeleccionada && createPortal(
        <div
          className="gr-modal-overlay"
          onClick={e => { if (e.target === e.currentTarget) setFirmaSeleccionada(null); }}
        >
          <div className="gr-modal" style={{ maxWidth: '480px' }}>
            <div className="gr-modal__header">
              <h5 className="gr-modal__title">
                <i className="fas fa-signature"></i>
                Firma de {firmaSeleccionada.usuario.nombre}
              </h5>
              <button className="gr-modal__close" onClick={() => setFirmaSeleccionada(null)} aria-label="Cerrar">
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="gr-modal__body" style={{ background: '#fff' }}>
              <img
                src={firmaSeleccionada.firmaBase64}
                alt="Firma"
                className="gr-modal__signature-img"
              />
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── MODAL PDF (siempre al frente, último en DOM) ── */}
      {pdfPreviewUrl && firmaDelPdf && createPortal(
        <div
          className="gr-modal-overlay"
          onClick={e => {
            if (e.target === e.currentTarget) { setPdfPreviewUrl(null); setFirmaDelPdf(null); }
          }}
        >
          <div className="gr-modal gr-modal--xl">
            <div className="gr-modal__header">
              <h5 className="gr-modal__title">
                <i className="fas fa-file-pdf"></i>
                Previsualización — {firmaDelPdf.usuario.nombre}
              </h5>
              <div className="gr-modal__actions">
                <button className="gr-download-btn" onClick={descargarBlob}>
                  <i className="fas fa-download"></i>
                  <span className="gr-download-btn__label">Descargar</span>
                </button>
                <button
                  className="gr-modal__close"
                  onClick={() => { setPdfPreviewUrl(null); setFirmaDelPdf(null); }}
                  aria-label="Cerrar"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
            </div>
            <div className="gr-modal__body--padless">
              <iframe src={pdfPreviewUrl} className="gr-pdf-iframe" title="PDF Preview" />
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
