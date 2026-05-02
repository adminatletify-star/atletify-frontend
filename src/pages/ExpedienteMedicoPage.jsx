import React from 'react';
import { useNavigate } from 'react-router-dom';
import ModalExpedienteMedico from '../components/ModalExpedienteMedico';

export default function ExpedienteMedicoPage() {
  const navigate = useNavigate();
  const u = JSON.parse(localStorage.getItem('usuario'));
  const idUsuario = u?.idUsuario || u?.id;

  if (!idUsuario) {
    return <div className="text-white text-center p-5">Error: Usuario no identificado.</div>;
  }

  return (
    <div className="container" style={{ padding: '20px 0', minHeight: '80vh', display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: '800px', position: 'relative' }}>
         <ModalExpedienteMedico 
            idUsuario={idUsuario} 
            onCompletado={() => {
              // Simplemente mostramos mensaje o redirigimos
              navigate('/user-panel');
            }} 
            isPage={true} 
         />
      </div>
    </div>
  );
}
