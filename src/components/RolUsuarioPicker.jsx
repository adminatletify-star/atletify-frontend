import { useState } from 'react';
import { createPortal } from 'react-dom';
import './RolUsuarioPicker.css';

const ROLES_BASE = [
  { valor: 'Usuario',  label: 'Usuario',  desc: 'En espera de aprobación',    icono: 'fas fa-user-clock',   key: 'usuario'  },
  { valor: 'Atleta',   label: 'Atleta',   desc: 'Miembro oficial del Box',    icono: 'fas fa-running',      key: 'atleta'   },
  { valor: 'Coach',    label: 'Coach',    desc: 'Staff del Box',              icono: 'fas fa-whistle',      key: 'coach'    },
];

const ROLES_DEV = [
  { valor: 'AdminBox',  label: 'Admin Box',   desc: 'Administrador del Box',     icono: 'fas fa-user-shield',  key: 'adminbox'  },
  { valor: 'Developer', label: 'Developer',   desc: 'Desarrollador (Global)',    icono: 'fas fa-code',         key: 'developer' },
];

export default function RolUsuarioPicker({ valor, onCambiar, esDeveloper }) {
  const [abierto, setAbierto] = useState(false);

  const todosRoles = esDeveloper ? [...ROLES_BASE, ...ROLES_DEV] : ROLES_BASE;
  const rolActual = todosRoles.find(r => r.valor === valor) || ROLES_BASE[0];

  const seleccionar = (v) => {
    setAbierto(false);
    if (v !== valor) onCambiar(v);
  };

  return (
    <>
      <button
        type="button"
        className={`rup-trigger rup-trigger--${rolActual.key}`}
        onClick={() => setAbierto(true)}
      >
        <span className="rup-trigger-left">
          <i className={rolActual.icono}></i>
          {rolActual.label}
        </span>
        <i className="fas fa-chevron-down rup-chevron"></i>
      </button>

      {abierto && createPortal(
        <div className="rup-overlay" onClick={() => setAbierto(false)}>
          <div className="rup-panel" onClick={e => e.stopPropagation()}>

            <div className="rup-header">
              <span className="rup-title">
                <i className="fas fa-shield-alt"></i> Rol del Usuario
              </span>
              <button type="button" className="rup-close" onClick={() => setAbierto(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="rup-options">
              {ROLES_BASE.map(r => (
                <button
                  key={r.valor}
                  type="button"
                  className={`rup-option rup-option--${r.key}${r.valor === valor ? ' rup-option--activo' : ''}`}
                  onClick={() => seleccionar(r.valor)}
                >
                  <div className="rup-icon-wrap">
                    <i className={r.icono}></i>
                  </div>
                  <div className="rup-info">
                    <span className="rup-nombre">{r.label}</span>
                    <span className="rup-desc">{r.desc}</span>
                  </div>
                  {r.valor === valor && <i className="fas fa-check rup-check"></i>}
                </button>
              ))}

              {esDeveloper && (
                <>
                  <div className="rup-separator">
                    <span>Privilegiados</span>
                  </div>
                  {ROLES_DEV.map(r => (
                    <button
                      key={r.valor}
                      type="button"
                      className={`rup-option rup-option--${r.key}${r.valor === valor ? ' rup-option--activo' : ''}`}
                      onClick={() => seleccionar(r.valor)}
                    >
                      <div className="rup-icon-wrap">
                        <i className={r.icono}></i>
                      </div>
                      <div className="rup-info">
                        <span className="rup-nombre">{r.label}</span>
                        <span className="rup-desc">{r.desc}</span>
                      </div>
                      {r.valor === valor && <i className="fas fa-check rup-check"></i>}
                    </button>
                  ))}
                </>
              )}
            </div>

          </div>
        </div>,
        document.body
      )}
    </>
  );
}
