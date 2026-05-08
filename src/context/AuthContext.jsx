import { createContext, useState, useContext, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [boxActivo, setBoxActivo] = useState(null);
  const [token, setToken] = useState(null);
  const [cuentasGuardadas, setCuentasGuardadas] = useState([]);
  const [loading, setLoading] = useState(true);

  // Helper robusto para obtener el ID de un usuario sin importar el casing
  const getIdFromUser = (u) => u?.idUsuario || u?.IdUsuario || u?.id || u?.Id || null;

  // Helper para verificar si un token JWT sigue siendo válido
  const isTokenValid = (tkn) => {
    if (!tkn) return false;
    try {
      const decoded = jwtDecode(tkn);
      return decoded.exp > (Date.now() / 1000);
    } catch (e) {
      return false;
    }
  };

  useEffect(() => {
    const usuarioGuardado = localStorage.getItem('usuario');
    const tokenGuardado = localStorage.getItem('token');
    const cuentasGuardadasStorage = localStorage.getItem('cuentasGuardadas');

    if (cuentasGuardadasStorage) {
      try {
        let cuentas = JSON.parse(cuentasGuardadasStorage);
        
        // Parche retroactivo para cuentas corruptas (doble stringify)
        cuentas = cuentas.map(c => {
          if (typeof c.boxData === 'string') {
            try { c.boxData = JSON.parse(c.boxData); } catch (e) {}
          }
          return c;
        });

        // Auto-limpiar cuentas con tokens expirados
        const cuentasValidas = cuentas.filter(c => isTokenValid(c.token));
        if (cuentasValidas.length !== cuentas.length) {
          localStorage.setItem('cuentasGuardadas', JSON.stringify(cuentasValidas));
        }
        setCuentasGuardadas(cuentasValidas);
      } catch (e) {
        localStorage.removeItem('cuentasGuardadas');
      }
    }

    if (usuarioGuardado) {
      try {
        const userObj = JSON.parse(usuarioGuardado);
        setUsuario(userObj);
        if (tokenGuardado) setToken(tokenGuardado);

        const boxGuardado = localStorage.getItem('boxActivo');
        if (boxGuardado) {
          setBoxActivo(JSON.parse(boxGuardado));
        } else if (userObj.idBoxPredeterminado) {
          setBoxActivo(userObj.idBoxPredeterminado);
        }
      } catch (error) {
        localStorage.removeItem('usuario');
        localStorage.removeItem('boxActivo');
        localStorage.removeItem('token');
      }
    }
    setLoading(false);
  }, []);

  const login = (usuarioData, tokenData) => {
    setUsuario(usuarioData);
    setToken(tokenData);
    localStorage.setItem('usuario', JSON.stringify(usuarioData));
    if (tokenData) localStorage.setItem('token', tokenData);

    let boxToSave = null;
    if (usuarioData.idBoxPredeterminado) {
      boxToSave = usuarioData.idBoxPredeterminado;
      cambiarBox(usuarioData.idBoxPredeterminado);
    } else {
      const storedBox = localStorage.getItem('boxActivo');
      if (storedBox) {
        try { boxToSave = JSON.parse(storedBox); } catch (e) { }
      }
    }

    // Guardar también el box completo si viene del login
    const boxCompleto = localStorage.getItem('box');

    setCuentasGuardadas((prevCuentas) => {
      const idUser = getIdFromUser(usuarioData);
      // Primero filtrar cuentas expiradas, luego quitar la actual si existe
      const cuentasLimpias = prevCuentas.filter(c => isTokenValid(c.token));
      const nuevasCuentas = cuentasLimpias.filter(c => getIdFromUser(c.usuario) !== idUser);

      nuevasCuentas.unshift({
        usuario: usuarioData,
        token: tokenData,
        boxActivo: boxToSave,
        boxData: boxCompleto || null
      });

      if (nuevasCuentas.length > 5) nuevasCuentas.pop();
      localStorage.setItem('cuentasGuardadas', JSON.stringify(nuevasCuentas));
      return nuevasCuentas;
    });
  };

  const logout = () => {
    if (usuario) {
      setCuentasGuardadas((prevCuentas) => {
        const idUser = getIdFromUser(usuario);
        const nuevasCuentas = prevCuentas.filter(c => getIdFromUser(c.usuario) !== idUser);
        localStorage.setItem('cuentasGuardadas', JSON.stringify(nuevasCuentas));
        return nuevasCuentas;
      });
    }

    setUsuario(null);
    setBoxActivo(null);
    setToken(null);
    localStorage.removeItem('usuario');
    localStorage.removeItem('boxActivo');
    localStorage.removeItem('token');
  };

  // Retorna true si se pudo cambiar, false si el token estaba expirado
  const cambiarCuenta = (cuenta) => {
    // Validar que el token no haya expirado antes de cambiar
    if (!isTokenValid(cuenta.token)) {
      // Token expirado: eliminar esta cuenta del arreglo
      setCuentasGuardadas((prevCuentas) => {
        const nuevas = prevCuentas.filter(c => getIdFromUser(c.usuario) !== getIdFromUser(cuenta.usuario));
        localStorage.setItem('cuentasGuardadas', JSON.stringify(nuevas));
        return nuevas;
      });
      alert(`La sesión de "${cuenta.usuario.nombre}" ha expirado. Necesitas volver a iniciar sesión con esa cuenta.`);
      return false;
    }

    setUsuario(cuenta.usuario);
    setToken(cuenta.token);
    setBoxActivo(cuenta.boxActivo);

    localStorage.setItem('usuario', JSON.stringify(cuenta.usuario));
    if (cuenta.token) localStorage.setItem('token', cuenta.token);
    else localStorage.removeItem('token');

    if (cuenta.boxActivo) localStorage.setItem('boxActivo', JSON.stringify(cuenta.boxActivo));
    else localStorage.removeItem('boxActivo');

    // Restaurar también el box completo de esa cuenta (asegurando que sea objeto JSON válido)
    if (cuenta.boxData) {
      let dataToSave = cuenta.boxData;
      if (typeof dataToSave === 'string') {
        try { dataToSave = JSON.parse(dataToSave); } catch (e) {}
      }
      localStorage.setItem('box', JSON.stringify(dataToSave));
    } else {
      localStorage.removeItem('box');
    }
    return true;
  };

  const cambiarBox = (idBox) => {
    setBoxActivo(idBox);
    localStorage.setItem('boxActivo', JSON.stringify(idBox));

    let boxDataToSave = null;
    try {
      const boxStr = localStorage.getItem('box');
      if (boxStr) {
         let parsed = JSON.parse(boxStr);
         if (typeof parsed === 'string') parsed = JSON.parse(parsed);
         boxDataToSave = parsed;
      }
    } catch (e) {}

    // Update active box in saved accounts for the current user
    if (usuario) {
      setCuentasGuardadas(prev => {
        const idUser = getIdFromUser(usuario);
        const nuevas = prev.map(c => {
          if (getIdFromUser(c.usuario) === idUser) {
            return { ...c, boxActivo: idBox, boxData: boxDataToSave };
          }
          return c;
        });
        localStorage.setItem('cuentasGuardadas', JSON.stringify(nuevas));
        return nuevas;
      });
    }
  };

  const isAuthenticated = !!usuario;
  const isDeveloper = usuario?.rol === 'Developer';
  const isCoach = usuario?.rol === 'Coach';

  return (
    <AuthContext.Provider value={{
      usuario,
      boxActivo,
      token,
      cuentasGuardadas,
      cambiarBox,
      cambiarCuenta,
      getIdFromUser,
      isTokenValid,
      login,
      logout,
      isAuthenticated,
      isDeveloper,
      isCoach,
      loading
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe ser usado dentro de AuthProvider');
  return context;
}