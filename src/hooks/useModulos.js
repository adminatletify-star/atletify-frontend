import { useState, useEffect, useCallback } from 'react';
import { esModuloCore, leerModulosBox, leerRolUsuario } from '../config/modulosSaaS';

// Hook de gating de módulos por plan SaaS (capa frontend).
// Lee los módulos efectivos del box desde localStorage.box.modulos (inyectados
// por el backend en el login) y expone tieneModulo(clave).
//
// - El rol Developer ve TODO (igual que el bypass del backend).
// - Las claves CORE siempre están activas.
// - Se re-evalúa al cambiar el box (evento 'storage' entre pestañas + evento
//   custom 'box-actualizado' que disparamos al refrescar el box en la misma pestaña).
export function useModulos() {
  const [modulos, setModulos] = useState(leerModulosBox);
  const [rol, setRol] = useState(leerRolUsuario);

  useEffect(() => {
    const refrescar = () => {
      setModulos(leerModulosBox());
      setRol(leerRolUsuario());
    };
    window.addEventListener('storage', refrescar);
    window.addEventListener('box-actualizado', refrescar);
    return () => {
      window.removeEventListener('storage', refrescar);
      window.removeEventListener('box-actualizado', refrescar);
    };
  }, []);

  const esDeveloper = rol === 'Developer';

  const tieneModulo = useCallback(
    (clave) => {
      if (!clave) return true;
      if (esDeveloper) return true;
      if (esModuloCore(clave)) return true;
      return modulos.includes(clave);
    },
    [modulos, esDeveloper]
  );

  return { modulos, tieneModulo, esDeveloper };
}

// Helper para disparar el refresco del gating tras actualizar localStorage.box
// (p. ej. al cambiar de plan o al activar/desactivar un módulo).
export function notificarBoxActualizado() {
  window.dispatchEvent(new Event('box-actualizado'));
}

export default useModulos;
