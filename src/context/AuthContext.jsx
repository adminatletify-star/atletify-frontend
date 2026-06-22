import { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { jwtDecode } from 'jwt-decode';
import { api, COMPETENCIAS_ENDPOINT } from '../services/api';
import { sincronizarSuscripcionesPush, desuscribirCuenta } from '../services/push';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [boxActivo, setBoxActivo] = useState(null);
  const [token, setToken] = useState(null);
  const [cuentasGuardadas, setCuentasGuardadas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [listaBoxes, setListaBoxes] = useState([]);

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

    let parsedUser = null;
    let cuentasFinales = [];

    // Paso 1: parsear y limpiar cuentas guardadas
    if (cuentasGuardadasStorage) {
      try {
        let cuentas = JSON.parse(cuentasGuardadasStorage);
        cuentas = cuentas.map(c => {
          if (typeof c.boxData === 'string') {
            try { c.boxData = JSON.parse(c.boxData); } catch (e) {}
          }
          return c;
        });
        cuentasFinales = cuentas.filter(c => isTokenValid(c.token));
        if (cuentasFinales.length !== cuentas.length) {
          localStorage.setItem('cuentasGuardadas', JSON.stringify(cuentasFinales));
        }
      } catch (e) {
        localStorage.removeItem('cuentasGuardadas');
      }
    }

    // Paso 2: parsear usuario activo
    if (usuarioGuardado) {
      try {
        parsedUser = JSON.parse(usuarioGuardado);

        // Validar que el token activo no haya expirado.
        // Si expiró, limpiar SOLO la sesión activa (no toca cuentasGuardadas).
        // Si el mismo usuario tiene otra entrada válida en cuentasGuardadas,
        // sigue disponible para que el usuario haga clic y vuelva a entrar.
        if (tokenGuardado && !isTokenValid(tokenGuardado)) {
          localStorage.removeItem('usuario');
          localStorage.removeItem('boxActivo');
          localStorage.removeItem('token');
          localStorage.removeItem('box');
          parsedUser = null;
        } else {
          setUsuario(parsedUser);
          if (tokenGuardado) setToken(tokenGuardado);
          const boxGuardado = localStorage.getItem('boxActivo');
          if (boxGuardado) setBoxActivo(JSON.parse(boxGuardado));
          else if (parsedUser.idBoxPredeterminado) setBoxActivo(parsedUser.idBoxPredeterminado);
        }
      } catch (error) {
        localStorage.removeItem('usuario');
        localStorage.removeItem('boxActivo');
        localStorage.removeItem('token');
      }
    }

    // Paso 3: sincronizar foto del usuario activo en cuentasGuardadas
    // (necesario cuando el usuario actualiza su foto en Mi Perfil y recarga)
    if (parsedUser && cuentasFinales.length > 0) {
      const idCurrent = parsedUser.idUsuario || parsedUser.IdUsuario || parsedUser.id || parsedUser.Id;
      let syncNeeded = false;
      const synced = cuentasFinales.map(c => {
        const cId = c.usuario?.idUsuario || c.usuario?.IdUsuario || c.usuario?.id || c.usuario?.Id;
        if (String(cId) === String(idCurrent) && c.usuario?.foto !== parsedUser?.foto) {
          syncNeeded = true;
          return { ...c, usuario: { ...c.usuario, foto: parsedUser.foto } };
        }
        return c;
      });
      if (syncNeeded) {
        localStorage.setItem('cuentasGuardadas', JSON.stringify(synced));
        cuentasFinales = synced;
      }
    }

    setCuentasGuardadas(cuentasFinales);
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
    // Best-effort: que esta cuenta deje de recibir push en este dispositivo.
    const tokenSaliente = token || localStorage.getItem('token');
    if (tokenSaliente) desuscribirCuenta(tokenSaliente);

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

  // Solo escribe en localStorage sin tocar el estado de React.
  // Úsalo cuando inmediatamente después vas a hacer window.location.href / reload,
  // así evitas el ciclo de re-renders que congela la UI antes de navegar.
  const prepararCambioCuenta = (cuenta) => {
    if (!isTokenValid(cuenta.token)) {
      setCuentasGuardadas((prevCuentas) => {
        const nuevas = prevCuentas.filter(c => getIdFromUser(c.usuario) !== getIdFromUser(cuenta.usuario));
        localStorage.setItem('cuentasGuardadas', JSON.stringify(nuevas));
        return nuevas;
      });
      alert(`La sesión de "${cuenta.usuario.nombre}" ha expirado. Necesitas volver a iniciar sesión con esa cuenta.`);
      return false;
    }
    localStorage.setItem('usuario', JSON.stringify(cuenta.usuario));
    if (cuenta.token) localStorage.setItem('token', cuenta.token);
    else localStorage.removeItem('token');
    if (cuenta.boxActivo) localStorage.setItem('boxActivo', JSON.stringify(cuenta.boxActivo));
    else localStorage.removeItem('boxActivo');
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

  const removerCuenta = (cuentaId) => {
    // Best-effort: desuscribir del push la cuenta que se quita del dispositivo.
    try {
      const cuenta = cuentasGuardadas.find(c => getIdFromUser(c.usuario) === cuentaId);
      if (cuenta?.token) desuscribirCuenta(cuenta.token);
    } catch { /* noop */ }

    setCuentasGuardadas((prevCuentas) => {
      const nuevasCuentas = prevCuentas.filter(c => getIdFromUser(c.usuario) !== cuentaId);
      localStorage.setItem('cuentasGuardadas', JSON.stringify(nuevasCuentas));
      return nuevasCuentas;
    });
    // Si la cuenta a eliminar es la que está activa actualmente, cerramos sesión
    if (usuario && getIdFromUser(usuario) === cuentaId) {
      logout();
    }
  };

  const refetchBoxes = useCallback(async () => {
    if (!(usuario?.rol === 'Developer' || usuario?.rol === 'AdminBox')) return;
    try {
      const baseUrl = COMPETENCIAS_ENDPOINT.split('/competencias')[0];
      const res = await fetch(`${baseUrl}/box`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setListaBoxes(data.map(b => ({ idBox: b.idBox || b.IdBox, nombre: b.nombre || b.Nombre })));
      }
    } catch (e) {
      console.error('Error al cargar boxes:', e);
    }
  }, [usuario]);

  useEffect(() => {
    refetchBoxes();
  }, [refetchBoxes]);

  // === WEB PUSH: mantener registradas TODAS las cuentas del dispositivo ===
  // Si el usuario ya activó las notificaciones (permiso concedido + suscripción),
  // cada vez que inicia sesión, agrega o cambia de cuenta, registramos/actualizamos
  // el endpoint de este aparato para todas sus cuentas. Best-effort: si las push no
  // están activas, no hace nada.
  useEffect(() => {
    if (!usuario) return;
    sincronizarSuscripcionesPush();
  }, [usuario, cuentasGuardadas]);

  // === PRESENCIA: heartbeat global ===
  // Mientras haya sesión válida, le avisamos al backend cada 60s que el usuario
  // sigue activo. Sus compas lo verán como "En línea / Ausente / Desconectado"
  // según cuánto haya pasado desde el último latido. Se ejecuta en cualquier
  // pantalla (no solo el panel del atleta), así que la presencia es real en toda la app.
  useEffect(() => {
    const id = getIdFromUser(usuario);
    const tkn = token || localStorage.getItem('token');
    if (!id || !isTokenValid(tkn)) return;

    let cancelado = false;
    const latir = () => {
      if (!cancelado && document.visibilityState !== 'hidden') api.heartbeat(id);
    };

    latir(); // latido inmediato al entrar / cambiar de cuenta
    const intervalo = setInterval(latir, 60000);
    const onVisible = () => { if (document.visibilityState === 'visible') latir(); };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      cancelado = true;
      clearInterval(intervalo);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [usuario, token]);

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

  // Actualiza campos del usuario activo en memoria (estado React) + localStorage,
  // y sincroniza esos mismos campos dentro de cuentasGuardadas. Úsalo cuando el
  // usuario edita su perfil (foto, nombre, etc.) para que el navbar y el selector
  // de cuentas se refresquen al instante SIN recargar la página.
  const actualizarUsuario = (cambios) => {
    if (!cambios) return;
    const actualizado = { ...(usuario || {}), ...cambios };
    setUsuario(actualizado);
    localStorage.setItem('usuario', JSON.stringify(actualizado));

    const idActual = getIdFromUser(actualizado);
    setCuentasGuardadas(prevCuentas => {
      let changed = false;
      const nuevas = prevCuentas.map(c => {
        if (String(getIdFromUser(c.usuario)) === String(idActual)) {
          changed = true;
          return { ...c, usuario: { ...c.usuario, ...cambios } };
        }
        return c;
      });
      if (changed) localStorage.setItem('cuentasGuardadas', JSON.stringify(nuevas));
      return changed ? nuevas : prevCuentas;
    });
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
      listaBoxes,
      refetchBoxes,
      cambiarBox,
      cambiarCuenta,
      prepararCambioCuenta,
      getIdFromUser,
      isTokenValid,
      login,
      logout,
      actualizarUsuario,
      removerCuenta,
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