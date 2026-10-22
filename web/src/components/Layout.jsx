import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Notificaciones from './Notificaciones';

export default function Layout() {
  const { usuario, cerrarSesion } = useAuth();
  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="marca">
          <img
            className="marca-imagen"
            src="/logo-mexticacan.png"
            alt="Mexticacán Incidencias: tu reporte, un mejor municipio"
          />
        </div>
        <nav>
          <NavLink to="/" end>📊 Dashboard</NavLink>
          <NavLink to="/incidencias">📋 Incidencias</NavLink>
          <NavLink to="/mapa">🗺️ Mapa</NavLink>
          {usuario.Rol === 'Administrador' && <NavLink to="/usuarios">👥 Usuarios</NavLink>}
        </nav>
      </aside>
      <div className="contenido">
        <header className="topbar">
          <div>
            <strong>{usuario.Nombre} {usuario.Apellidos}</strong>
            <small>
              {usuario.Rol}
              {usuario.Area ? ` · ${usuario.Area}` : ''}
            </small>
          </div>
          <div className="topbar-acciones">
            <Notificaciones />
            <button className="btn secundario" onClick={cerrarSesion}>
              Salir
            </button>
          </div>
        </header>
        <main>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
