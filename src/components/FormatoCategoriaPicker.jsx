import { useState } from 'react';
import './FormatoCategoriaPicker.css';

export default function FormatoCategoriaPicker({ value, onChange }) {
  const [abierto, setAbierto] = useState(false);

  const seleccionar = (esEquipo) => {
    onChange(esEquipo);
    setAbierto(false);
  };

  return (
    <>
      <button
        type="button"
        className="fcp-trigger"
        onClick={() => setAbierto(true)}
      >
        <i className={`fas ${value ? 'fa-users' : 'fa-user'}`}></i>
        <span>{value ? 'En Equipo' : 'Individual'}</span>
        <i className="fas fa-chevron-down fcp-trigger-arrow"></i>
      </button>

      {abierto && (
        <div className="fcp-overlay" onClick={() => setAbierto(false)}>
          <div className="fcp-modal" onClick={e => e.stopPropagation()}>
            <div className="fcp-modal-header">
              <p className="fcp-modal-titulo">
                <i className="fas fa-layer-group"></i> Formato
              </p>
              <button type="button" className="fcp-close" onClick={() => setAbierto(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="fcp-modal-body">
              <button
                type="button"
                className={`fcp-opcion ${!value ? 'fcp-opcion--activa' : ''}`}
                onClick={() => seleccionar(false)}
              >
                <div className="fcp-opcion-icono fcp-opcion-icono--individual">
                  <i className="fas fa-user"></i>
                </div>
                <div className="fcp-opcion-texto">
                  <span className="fcp-opcion-nombre">Individual</span>
                  <span className="fcp-opcion-desc">1 atleta por inscripción</span>
                </div>
                {!value && <i className="fas fa-check-circle fcp-check"></i>}
              </button>

              <button
                type="button"
                className={`fcp-opcion ${value ? 'fcp-opcion--activa fcp-opcion--equipo' : ''}`}
                onClick={() => seleccionar(true)}
              >
                <div className="fcp-opcion-icono fcp-opcion-icono--equipo">
                  <i className="fas fa-users"></i>
                </div>
                <div className="fcp-opcion-texto">
                  <span className="fcp-opcion-nombre">En Equipo</span>
                  <span className="fcp-opcion-desc">2 o más atletas por inscripción</span>
                </div>
                {value && <i className="fas fa-check-circle fcp-check fcp-check--equipo"></i>}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
