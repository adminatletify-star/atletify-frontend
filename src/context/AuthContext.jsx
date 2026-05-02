import { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [boxActivo, setBoxActivo] = useState(null); 
  const [token, setToken] = useState(null); // 👈 NUEVO: Estado para el Token
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const usuarioGuardado = localStorage.getItem('usuario');
    const tokenGuardado = localStorage.getItem('token'); // 👈 NUEVO: Leemos el token
    
    if (usuarioGuardado) {
      try {
        const userObj = JSON.parse(usuarioGuardado);
        setUsuario(userObj);
        if (tokenGuardado) setToken(tokenGuardado); // 👈 NUEVO: Lo guardamos en memoria
        
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

  // 👇 MODIFICADO: Ahora recibe también el token 👇
  const login = (usuarioData, tokenData) => {
    setUsuario(usuarioData);
    setToken(tokenData); 
    localStorage.setItem('usuario', JSON.stringify(usuarioData));
    if (tokenData) localStorage.setItem('token', tokenData); 
    
    if (usuarioData.idBoxPredeterminado) {
      cambiarBox(usuarioData.idBoxPredeterminado);
    }
  };

  const logout = () => {
    setUsuario(null);
    setBoxActivo(null);
    setToken(null);
    localStorage.removeItem('usuario');
    localStorage.removeItem('boxActivo');
    localStorage.removeItem('token'); // 👈 NUEVO: Destruimos la llave al salir
  };

  const cambiarBox = (idBox) => {
    setBoxActivo(idBox);
    localStorage.setItem('boxActivo', JSON.stringify(idBox));
  };

  const isAuthenticated = !!usuario;
  const isDeveloper = usuario?.rol === 'Developer';
  const isCoach = usuario?.rol === 'Coach';

  return (
    <AuthContext.Provider value={{ 
      usuario, 
      boxActivo,      
      token,          // 👈 NUEVO: Lo exportamos para usarlo en las llamadas API
      cambiarBox,     
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