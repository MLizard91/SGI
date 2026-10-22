// Notificaciones del personal: lista, contador de no leídas y avisos en tiempo real.
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '../api';
import { useSocketEvent } from './SocketContext';

const NotificacionesContext = createContext(null);

export function NotificacionesProvider({ children }) {
  const [datos, setDatos] = useState([]);
  const [noLeidas, setNoLeidas] = useState(0);
  const [cargando, setCargando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const r = await api('/notificaciones');
      setDatos(r.datos);
      setNoLeidas(r.noLeidas);
    } catch {
      // sin conexión: se reintenta al refrescar
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  useSocketEvent(
    'notificacion',
    useCallback((n) => {
      setDatos((prev) => [n, ...prev].slice(0, 30));
      setNoLeidas((x) => x + 1);
    }, [])
  );

  async function marcarLeida(n) {
    if (n.Leida) return;
    await api(`/notificaciones/${n.IdNotificacion}/leida`, { method: 'PATCH' });
    setDatos((prev) => prev.map((x) => (x.IdNotificacion === n.IdNotificacion ? { ...x, Leida: true } : x)));
    setNoLeidas((x) => Math.max(0, x - 1));
  }

  async function leerTodas() {
    await api('/notificaciones/leer-todas', { method: 'PATCH' });
    setDatos((prev) => prev.map((x) => ({ ...x, Leida: true })));
    setNoLeidas(0);
  }

  return (
    <NotificacionesContext.Provider value={{ datos, noLeidas, cargando, cargar, marcarLeida, leerTodas }}>
      {children}
    </NotificacionesContext.Provider>
  );
}

export const useNotificaciones = () => useContext(NotificacionesContext);
