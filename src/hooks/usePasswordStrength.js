import { useMemo } from 'react';

/**
 * usePasswordStrength
 * -------------------
 * Hook reutilizable de validación de fortaleza de contraseña.
 * Recibe el valor del campo de contraseña y devuelve el estado
 * de cada regla + un booleano global `esValida`.
 *
 * Uso en cualquier form:
 *   const reglas = usePasswordStrength(password);
 *   <PasswordRulesHint reglas={reglas} />
 *   <button disabled={!reglas.esValida}>Guardar</button>
 *
 * @param {string} password - El valor actual del campo de contraseña
 * @returns {object} - Objeto con el estado de cada regla
 */
export function usePasswordStrength(password = '') {
  return useMemo(() => {
    const tieneMinCaracteres    = password.length >= 8;
    const tieneMayuscula        = /[A-Z]/.test(password);
    const tieneCaracterEspecial = /[!@#$%^&*()_\-+=\[\]{};':"\\|,.<>\/?`~]/.test(password);
    const tieneNumero           = /[0-9]/.test(password);

    const esValida =
      tieneMinCaracteres &&
      tieneMayuscula     &&
      tieneCaracterEspecial &&
      tieneNumero;

    return {
      tieneMinCaracteres,
      tieneMayuscula,
      tieneCaracterEspecial,
      tieneNumero,
      esValida,
    };
  }, [password]);
}

export default usePasswordStrength;
