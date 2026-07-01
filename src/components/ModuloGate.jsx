import useModulos from '../hooks/useModulos';
import ModuloBloqueado from './ModuloBloqueado';

// Capa FRONTEND del gating. Envuelve una página/ruta:
//   <ModuloGate modulo="kids"><MisKids /></ModuloGate>
// Si el box no tiene el módulo, muestra el paywall <ModuloBloqueado> en vez del contenido.
// El backend ([RequiereModulo]) es la enforcement real; esto es la UX.
export default function ModuloGate({ modulo, volverA, children }) {
  const { tieneModulo, cargado } = useModulos();
  if (tieneModulo(modulo)) return children;
  // Entitlements aún NO cargados (snapshot de login sin `modulos` / refresco de /entitlements/me en
  // vuelo): render OPTIMISTA, no bloqueamos. El backend ([RequiereModulo]) es el enforcement real, así
  // que esto solo evita el paywall FALSO e intermitente mientras llega la respuesta. Cuando cargue, si
  // el box de verdad no tiene el módulo, se re-evalúa y aquí sí se muestra <ModuloBloqueado>.
  if (!cargado) return children;
  return <ModuloBloqueado modulo={modulo} volverA={volverA} />;
}
