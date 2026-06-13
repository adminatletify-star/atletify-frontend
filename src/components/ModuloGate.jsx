import useModulos from '../hooks/useModulos';
import ModuloBloqueado from './ModuloBloqueado';

// Capa FRONTEND del gating. Envuelve una página/ruta:
//   <ModuloGate modulo="kids"><MisKids /></ModuloGate>
// Si el box no tiene el módulo, muestra el paywall <ModuloBloqueado> en vez del contenido.
// El backend ([RequiereModulo]) es la enforcement real; esto es la UX.
export default function ModuloGate({ modulo, volverA, children }) {
  const { tieneModulo } = useModulos();
  if (tieneModulo(modulo)) return children;
  return <ModuloBloqueado modulo={modulo} volverA={volverA} />;
}
