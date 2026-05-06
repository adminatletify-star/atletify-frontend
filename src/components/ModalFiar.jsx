import { useState, useEffect } from 'react';
import { VENTAS_ENDPOINT } from '../services/api';
import './ModalFiar.css';

export default function ModalFiar({ boxId, onClose, onConfirm }) {
  const [atletas, setAtletas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [atletaSeleccionado, setAtletaSeleccionado] = useState(null);

  useEffect(() => {
    cargarAtletas();
  }, [boxId]);

  const cargarAtletas = async () => {
    try {
      const res = await fetch(`${VENTAS_ENDPOINT}/atletas-confianza/${boxId}`);
      if (res.ok) {
        const data = await res.json();
        setAtletas(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filtrados = atletas.filter(a => 
    `${a.nombre} ${a.apellidos}`.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="mf-overlay" onClick={onClose}>
      <div className="mf-panel" onClick={e => e.stopPropagation()}>
        
        <div className="mf-header">
          <h3 className="mf-title"><i className="fas fa-hand-holding-usd me-2 text-warning"></i> Fiar a Atleta</h3>
          <button type="button" className="mf-close" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="mf-body">
          <div className="mf-search">
            <i className="fas fa-search mf-search-icon"></i>
            <input 
              type="text" 
              placeholder="Buscar por nombre..." 
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              className="mf-search-input"
            />
          </div>

          <div className="mf-lista">
            {loading ? (
              <div className="text-center py-4 text-muted"><div className="spinner-wp mb-2"></div><br/>Cargando atletas...</div>
            ) : filtrados.length === 0 ? (
              <div className="text-center py-4 text-muted">No se encontraron atletas de confianza.</div>
            ) : (
              filtrados.map(a => (
                <div 
                  key={a.idUsuario} 
                  className={`mf-atleta-item ${atletaSeleccionado?.idUsuario === a.idUsuario ? 'mf-atleta-item--activo' : ''}`}
                  onClick={() => setAtletaSeleccionado(a)}
                >
                  <div className="mf-atleta-info">
                    {a.fotoPerfilUrl ? (
                      <img src={a.fotoPerfilUrl} alt={a.nombre} className="mf-atleta-foto" />
                    ) : (
                      <div className="mf-atleta-inicial">{a.nombre.charAt(0)}</div>
                    )}
                    <div>
                      <p className="mf-atleta-nombre">{a.nombre} {a.apellidos}</p>
                      {a.deudaActual > 0 && (
                        <span className="badge bg-danger rounded-pill mf-deuda-badge">
                          Deuda actual: ${parseFloat(a.deudaActual).toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                  {atletaSeleccionado?.idUsuario === a.idUsuario && (
                    <i className="fas fa-check-circle text-success mf-check"></i>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="mf-footer">
          <button className="btn btn-outline-secondary" onClick={onClose}>Cancelar</button>
          <button 
            className="btn btn-warning" 
            disabled={!atletaSeleccionado}
            onClick={() => onConfirm(atletaSeleccionado)}
          >
            Confirmar Fiado
          </button>
        </div>

      </div>
    </div>
  );
}
