import { useNavigate } from 'react-router-dom';
import { CATALOGO_MODULOS, NOMBRES_TIER } from '../config/modulosSaaS';
import BackButton from './BackButton';
import '../assets/css/ModuloBloqueado.css';

// Paywall genérico para un módulo no incluido en el plan del box.
// Se muestra cuando <ModuloGate> detecta que el box no tiene la clave.
export default function ModuloBloqueado({ modulo, volverA = '/admin-box-panel' }) {
  const navigate = useNavigate();
  const meta = CATALOGO_MODULOS[modulo] || {};
  const nombre = meta.nombre || 'Este módulo';
  const tier = NOMBRES_TIER[meta.tier] || 'un plan superior';
  const icono = meta.icono || 'fa-lock';

  return (
    <div className="mb-root">
      <header className="mb-header">
        <BackButton to={volverA} />
        <p className="mb-header-titulo">Acceso <span>bloqueado</span></p>
      </header>

      <div className="mb-card">
        <div className="mb-icon-wrap">
          <i className={`fas ${icono}`}></i>
        </div>
        <span className="mb-tier-badge">Disponible en {tier}</span>
        <h2 className="mb-titulo">{nombre} no está en tu plan</h2>
        <p className="mb-desc">
          {meta.descripcion ? `${meta.descripcion}. ` : ''}
          Este módulo se desbloquea al actualizar el plan de tu box. Sube de plan para
          habilitarlo de inmediato.
        </p>
        <div className="mb-acciones">
          <button className="mb-btn-primary" onClick={() => navigate('/seleccion-plan-saas')}>
            <i className="fas fa-rocket"></i>
            <span>Subir de plan</span>
          </button>
          <button className="mb-btn-ghost" onClick={() => navigate(volverA)}>
            Volver
          </button>
        </div>
        <p className="mb-hint">
          ¿Crees que deberías tener acceso? Contacta al administrador de la plataforma.
        </p>
      </div>
    </div>
  );
}
