// Conexión en tiempo real: el ciudadano ve al instante cuando su reporte cambia de estatus.
import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { API_URL } from '../config';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { token } = useAuth();
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!token) return;
    const s = io(API_URL, { auth: { token }, transports: ['websocket'] });
    setSocket(s);
    return () => {
      s.close();
      setSocket(null);
    };
  }, [token]);

  return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>;
}

export function useSocketEvent(evento, callback) {
  const socket = useContext(SocketContext);
  useEffect(() => {
    if (!socket) return;
    socket.on(evento, callback);
    return () => socket.off(evento, callback);
  }, [socket, evento, callback]);
}
