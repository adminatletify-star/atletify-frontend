import { useNavigate } from 'react-router-dom';
import ModalExpedienteMedico from '../components/ModalExpedienteMedico';
import BackButton from '../components/BackButton';
import '../assets/css/ExpedienteMedico.css';

export default function ExpedienteMedicoPage() {
  const navigate = useNavigate();
  const u = JSON.parse(localStorage.getItem('usuario'));
  const idUsuario = u?.idUsuario || u?.id;

  if (!idUsuario) {
    return (
      <div className="em-page">
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          Error: Usuario no identificado.
        </div>
      </div>
    );
  }

  return (
    <div className="em-page">
      <header className="em-header">
        <BackButton />
        <h1 className="em-header-title">
          Expediente <span>Médico</span>
        </h1>
      </header>

      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '0 0.75rem' }}>
        <ModalExpedienteMedico
          idUsuario={idUsuario}
          onCompletado={() => navigate('/user-panel')}
          isPage={true}
        />
      </div>
    </div>
  );
}
