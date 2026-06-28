import { useEffect, useRef } from 'react';
import * as signalR from '@microsoft/signalr';

// Suscribe a la competencia en el CompetenciaHub y dispara handlers en vivo.
// handlers: { onScore?(data), onHeat?(data) }. El polling de cada vista queda como respaldo.
// CORS del backend es AllowAnyOrigin sin credenciales → withCredentials: false (el hub es anónimo).
export function useCompetenciaLive(idCompetencia, handlers) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!idCompetencia) return;

    const apiUrl = import.meta.env.VITE_API_URL || '';
    const host = apiUrl.replace(/\/api\/?$/, ''); // el hub vive en /hubs/competencia, fuera de /api
    const hubUrl = `${host}/hubs/competencia`;

    const conn = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, { withCredentials: false })
      .withAutomaticReconnect()
      .build();

    conn.on('scoreActualizado', (data) => handlersRef.current?.onScore?.(data));
    conn.on('heatActualizado', (data) => handlersRef.current?.onHeat?.(data));

    let activo = true;
    conn.start()
      .then(() => { if (activo) return conn.invoke('JoinCompetencia', String(idCompetencia)); })
      .catch(() => { /* sin tiempo real: el polling de la vista sigue funcionando */ });

    return () => {
      activo = false;
      try { conn.stop(); } catch { /* ignore */ }
    };
  }, [idCompetencia]);
}
