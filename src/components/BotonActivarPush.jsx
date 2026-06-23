import { useState, useEffect } from 'react';
import { estadoPushAsync, activarPush } from '../services/push';
import '../assets/css/push-activar.css';

// Botón "Activar avisos" que vive junto a la campanita. Pide permiso de
// notificaciones (debe dispararse con un tap del usuario), se suscribe a Web
// Push y registra todas las cuentas del dispositivo. Se oculta solo cuando el
// navegador no soporta push (p. ej. iOS sin instalar la PWA) o cuando ya están
// activadas.
export default function BotonActivarPush({ className = '' }) {
  const [estado, setEstado] = useState('activado'); // valor neutro hasta calcular en cliente
  const [procesando, setProcesando] = useState(false);

  useEffect(() => {
    let vivo = true;
    // Async: comprueba también que exista una suscripción real, no solo el permiso.
    estadoPushAsync().then((e) => { if (vivo) setEstado(e); });
    return () => { vivo = false; };
  }, []);

  // No mostrar si no hay soporte (iOS sin PWA instalada) o si ya está activado.
  if (estado === 'no-soportado' || estado === 'activado') return null;

  const onClick = async () => {
    if (procesando) return;

    if (estado === 'bloqueado') {
      alert('Las notificaciones están bloqueadas en este navegador. Actívalas desde los ajustes del sitio (el candado junto a la dirección) y vuelve a intentarlo.');
      return;
    }

    setProcesando(true);
    try {
      const r = await activarPush();
      if (r.ok) {
        setEstado('activado');
        alert('¡Listo! Te llegarán las notificaciones de esta y tus demás cuentas en este dispositivo.');
      } else if (r.motivo === 'bloqueado') {
        setEstado('bloqueado');
        alert('Bloqueaste las notificaciones. Para recibirlas, actívalas desde los ajustes del navegador.');
      } else if (r.motivo === 'cancelado') {
        // El usuario cerró el aviso de permiso: sin mensaje.
      } else if (r.motivo === 'no-soportado') {
        setEstado('no-soportado');
      } else if (r.motivo === 'sin-sw') {
        alert('Las notificaciones solo funcionan en la app instalada o publicada, no en el modo de desarrollo. Abre la versión instalada en tu pantalla de inicio e inténtalo de nuevo.');
      } else if (r.motivo === 'sin-clave') {
        alert('No se pudo obtener la clave de notificaciones del servidor. Revisa tu conexión e inténtalo de nuevo.');
      } else if (r.motivo === 'error-suscripcion') {
        alert('No se pudo crear la suscripción de notificaciones' + (r.detalle ? `: ${r.detalle}` : '. Inténtalo de nuevo.'));
      } else {
        alert('No se pudieron activar las notificaciones en este momento. Inténtalo de nuevo más tarde.');
      }
    } finally {
      setProcesando(false);
    }
  };

  return (
    <button
      type="button"
      className={`push-activar-btn ${className}`}
      onClick={onClick}
      disabled={procesando}
      title="Activar notificaciones en este dispositivo"
      aria-label="Activar notificaciones"
    >
      <i className={`fas ${procesando ? 'fa-spinner fa-spin' : 'fa-bell'}`}></i>
      <span className="push-activar-label">{procesando ? 'Activando…' : 'Activar avisos'}</span>
    </button>
  );
}
