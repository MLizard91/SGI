import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, formatoFecha } from '../api';
import { useSocketEvent } from '../context/SocketContext';

export default function Notificaciones() {
  const [abierto, setAbierto] = useState(false);
  const [datos, setDatos] = useState([]);
  const [noLeidas, setNoLeidas] = useState(0);
  const navigate = useNavigate();

  const cargar = () =>
    api('/notificaciones').then((r) => {
      setDatos(r.datos);
      setNoLeidas(r.noLeidas);
    });

  useEffect(() => {
    cargar();
  }, []);

  // Llega una notificación nueva en tiempo real
  useSocketEvent(
    'notificacion',
    useCallback((n) => {
      setDatos((prev) => [n, ...prev].slice(0, 30));
      setNoLeidas((x) => x + 1);
    }, [])
  );

  async function abrir(n) {
    if (!n.Leida) {
      await api(`/notificaciones/${n.IdNotificacion}/leida`, { method: 'PATCH' });
      setDatos((prev) => prev.map((x) => (x.IdNotificacion === n.IdNotificacion ? { ...x, Leida: true } : x)));
      setNoLeidas((x) => Math.max(0, x - 1));
    }
    setAbierto(false);
    if (n.IdIncidencia) navigate(`/incidencias/${n.IdIncidencia}`);
  }

  async function leerTodas() {
    await api('/notificaciones/leer-todas', { method: 'PATCH' });
    setDatos((prev) => prev.map((x) => ({ ...x, Leida: true })));
    setNoLeidas(0);
  }

  return (
    <div className="notif">
      <button className="btn-icono" onClick={() => setAbierto(!abierto)} aria-label="Notificaciones">
        🔔 {noLeidas > 0 && <span className="contador">{noLeidas}</span>}
      </button>
      {abierto && (
        <div className="notif-panel">
          <div className="notif-header">
            <strong>Notificaciones</strong>
            {noLeidas > 0 && (
              <button className="link" onClick={leerTodas}>
                Marcar todas como leídas
              </button>
            )}
          </div>
          {datos.length === 0 && <p className="vacio">Sin notificaciones</p>}
          {datos.map((n) => (
            <button key={n.IdNotificacion} className={`notif-item ${n.Leida ? '' : 'nueva'}`} onClick={() => abrir(n)}>
              <strong>{n.Titulo}</strong>
              <span>{n.Mensaje}</span>
              <small>{formatoFecha(n.Fecha)}</small>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
