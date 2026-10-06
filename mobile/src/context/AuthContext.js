import { createContext, useContext, useEffect, useState } from 'react';
import { api, borrarToken, guardarToken, leerToken } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [token, setToken] = useState(null);
  const [cargando, setCargando] = useState(true);

  // Al abrir la app intentamos recuperar la sesión guardada
  useEffect(() => {
    (async () => {
      try {
        const t = await leerToken();
        if (t) {
          const perfil = await api('/auth/perfil');
          setToken(t);
          setUsuario(perfil);
        }
      } catch (e) {
        if (e.status === 401 || e.status === 404) await borrarToken();
      } finally {
        setCargando(false);
      }
    })();
  }, []);

  async function entrar(datos) {
    await guardarToken(datos.token);
    setToken(datos.token);
    setUsuario(datos.usuario);
  }

  const iniciarSesion = async (correo, password) =>
    entrar(await api('/auth/login', { method: 'POST', body: { correo, password } }));

  const registrarse = async (form) => entrar(await api('/auth/registro', { method: 'POST', body: form }));

  async function cerrarSesion() {
    await borrarToken();
    setToken(null);
    setUsuario(null);
  }

  return (
    <AuthContext.Provider value={{ usuario, token, cargando, iniciarSesion, registrarse, cerrarSesion }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
