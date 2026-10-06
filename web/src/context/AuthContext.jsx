import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('sgi_token'));
  const [cargando, setCargando] = useState(true);

  // Al abrir la página, si hay token guardado recuperamos el perfil
  useEffect(() => {
    if (!token) {
      setCargando(false);
      return;
    }
    api('/auth/perfil')
      .then(setUsuario)
      .catch(() => cerrarSesion())
      .finally(() => setCargando(false));
  }, [token]);

  async function iniciarSesion(correo, password) {
    const datos = await api('/auth/login', { method: 'POST', body: { correo, password } });
    if (datos.usuario.Rol === 'Ciudadano') {
      throw new Error('Este panel es para personal municipal. Los ciudadanos reportan desde la app móvil.');
    }
    localStorage.setItem('sgi_token', datos.token);
    setToken(datos.token);
    setUsuario(datos.usuario);
  }

  function cerrarSesion() {
    localStorage.removeItem('sgi_token');
    setToken(null);
    setUsuario(null);
  }

  return (
    <AuthContext.Provider value={{ usuario, token, cargando, iniciarSesion, cerrarSesion }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
