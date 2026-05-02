import './PasswordRulesHint.css';

/**
 * PasswordRulesHint
 * -----------------
 * Componente visual reutilizable que muestra el estado de las reglas
 * de fortaleza de una contraseña en tiempo real.
 *
 * Props:
 *  - reglas        {object}  — Resultado de usePasswordStrength()
 *  - password      {string}  — Valor de la nueva contraseña (para comparar coincidencia)
 *  - passwordConfirm {string} — (opcional) Si se pasa, muestra la regla de coincidencia
 *
 * Ejemplo de uso:
 *   const reglas = usePasswordStrength(passForm.nuevaContrasena);
 *   <PasswordRulesHint
 *     reglas={reglas}
 *     password={passForm.nuevaContrasena}
 *     passwordConfirm={passForm.confirmarContrasena}
 *   />
 */
export default function PasswordRulesHint({ reglas, password = '', passwordConfirm }) {
  const coinciden =
    typeof passwordConfirm === 'string' &&
    password.length > 0 &&
    password === passwordConfirm;

  const items = [
    {
      key: 'min',
      cumple: reglas.tieneMinCaracteres,
      texto: 'Mínimo 8 caracteres',
      icono: 'fas fa-ruler-horizontal',
    },
    {
      key: 'upper',
      cumple: reglas.tieneMayuscula,
      texto: 'Mínimo una mayúscula',
      icono: 'fas fa-font',
    },
    {
      key: 'special',
      cumple: reglas.tieneCaracterEspecial,
      texto: 'Mínimo un carácter especial (!@#$...)',
      icono: 'fas fa-asterisk',
    },
    {
      key: 'number',
      cumple: reglas.tieneNumero,
      texto: 'Mínimo un número',
      icono: 'fas fa-hashtag',
    },
  ];

  // Si se provee passwordConfirm, agrega la regla de coincidencia
  if (typeof passwordConfirm === 'string') {
    items.push({
      key: 'match',
      cumple: coinciden,
      texto: 'Las contraseñas coinciden',
      icono: 'fas fa-lock',
      extraClass: 'prh-item--match',
    });
  }

  return (
    <div className="prh-wrap">
      <ul className="prh-list">
        {items.map(({ key, cumple, texto, icono, extraClass = '' }) => (
          <li
            key={key}
            className={`prh-item${cumple ? ' prh-item--ok' : ''} ${extraClass}`}
          >
            <span className="prh-icon">
              <i className={cumple ? 'fas fa-check' : 'fas fa-times'} />
            </span>
            {texto}
          </li>
        ))}
      </ul>
    </div>
  );
}
