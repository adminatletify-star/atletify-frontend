import { useState, useEffect } from 'react';
import { VENTAS_ENDPOINT } from '../services/api';
import AtletifyLoader from './AtletifyLoader';
import './ModalFiar.css';

export default function ModalFiar({ boxId, onClose, onConfirm }) {
  const [atletas, setAtletas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [atletaSeleccionado, setAtletaSeleccionado] = useState(null);

  useEffect(() => { cargarAtletas(); }, [boxId]);

  const cargarAtletas = async () => {
    try {
      const res = await fetch(`${VENTAS_ENDPOINT}/atletas-confianza/${boxId}`);
      if (res.ok) setAtletas(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filtrados = atletas.filter(a =>
    `${a.nombre} ${a.apellidos} ${a.correo || ''}`.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="mf-overlay" onClick={onClose}>
      <div className="mf-panel" onClick={e => e.stopPropagation()}>

        {/* ── Header ── */}
        <div className="mf-header">
          <span className="mf-header-icon">
            <i className="fas fa-hand-holding-usd"></i>
          </span>
          <div className="mf-header-text">
            <h3 className="mf-title">Fiar a Atleta</h3>
            <p className="mf-subtitle">Selecciona el atleta para registrar la deuda</p>
          </div>
          <button type="button" className="mf-close" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* ── Body ── */}
        <div className="mf-body">

          {/* Buscador */}
          <div className="mf-search">
            <i className="fas fa-search mf-search-icon"></i>
            <input
              type="text"
              placeholder="Buscar por nombre o correo..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              className="mf-search-input"
              autoFocus
            />
          </div>

          {/* Atleta seleccionado (resumen) */}
          {atletaSeleccionado && (
            <div className="mf-seleccionado-card">
              {atletaSeleccionado.fotoPerfilUrl
                ? <img src={atletaSeleccionado.fotoPerfilUrl} alt="" className="mf-atleta-foto" />
                : <div className="mf-atleta-inicial">{atletaSeleccionado.nombre.charAt(0)}</div>
              }
              <div>
                <p className="mf-seleccionado-label">Atleta seleccionado</p>
                <p className="mf-seleccionado-nombre">{atletaSeleccionado.nombre} {atletaSeleccionado.apellidos}</p>
              </div>
            </div>
          )}

          {/* Lista */}
          <div className="mf-lista">
            {loading ? (
              <div className="mf-empty">
                <AtletifyLoader />
                <p>Cargando atletas...</p>
              </div>
            ) : filtrados.length === 0 ? (
              <div className="mf-empty">
                <i className="fas fa-user-slash"></i>
                <p>{busqueda ? 'Sin resultados para tu búsqueda.' : 'No hay atletas de confianza registrados.'}</p>
              </div>
            ) : (
              filtrados.map(a => {
                const activo = atletaSeleccionado?.idUsuario === a.idUsuario;
                return (
                  <div
                    key={a.idUsuario}
                    className={`mf-atleta-item ${activo ? 'mf-atleta-item--activo' : ''}`}
                    onClick={() => setAtletaSeleccionado(a)}
                  >
                    <div className="mf-atleta-info">
                      {a.fotoPerfilUrl
                        ? <img src={a.fotoPerfilUrl} alt={a.nombre} className="mf-atleta-foto" />
                        : <div className="mf-atleta-inicial">{a.nombre.charAt(0)}</div>
                      }
                      <div className="mf-atleta-datos">
                        <p className="mf-atleta-nombre">{a.nombre} {a.apellidos}</p>
                        {a.correo && (
                          <p className="mf-atleta-correo">
                            <i className="fas fa-envelope" style={{ marginRight: '0.3rem', fontSize: '0.6rem' }}></i>
                            {a.correo}
                          </p>
                        )}
                        {a.deudaActual > 0 && (
                          <span className="mf-deuda-badge">
                            <i className="fas fa-exclamation-circle" style={{ fontSize: '0.6rem' }}></i>
                            Deuda: ${parseFloat(a.deudaActual).toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                    {activo && <i className="fas fa-check-circle mf-check-icon"></i>}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="mf-footer">
          <button className="mf-btn mf-btn--cancel" onClick={onClose}>
            <i className="fas fa-times"></i> Cancelar
          </button>
          <button
            className="mf-btn mf-btn--confirm"
            disabled={!atletaSeleccionado}
            onClick={() => onConfirm(atletaSeleccionado)}
          >
            <i className="fas fa-check"></i> Confirmar Fiado
          </button>
        </div>

      </div>
    </div>
  );
}
