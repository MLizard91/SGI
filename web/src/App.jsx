import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Incidencias from './pages/Incidencias';
import IncidenciaDetalle from './pages/IncidenciaDetalle';
import Mapa from './pages/Mapa';
import Usuarios from './pages/Usuarios';

function RutaPrivada({ children, roles }) {
  const { usuario, cargando } = useAuth();
  if (cargando) return <div className="centrado">Cargando…</div>;
  if (!usuario) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(usuario.Rol)) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <RutaPrivada>
            <Layout />
          </RutaPrivada>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="incidencias" element={<Incidencias />} />
        <Route path="incidencias/:id" element={<IncidenciaDetalle />} />
        <Route path="mapa" element={<Mapa />} />
        <Route
          path="usuarios"
          element={
            <RutaPrivada roles={['Administrador']}>
              <Usuarios />
            </RutaPrivada>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
