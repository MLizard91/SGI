// Panel de gestión para el personal municipal (equivalente móvil del panel web).
import { Alert, Pressable, Text } from 'react-native';
import { Redirect, Tabs } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { NotificacionesProvider, useNotificaciones } from '../../context/NotificacionesContext';
import { ROLES, esPersonal } from '../../roles';
import { COLORES } from '../../config';

const icono = (emoji) => ({ focused }) => <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.55 }}>{emoji}</Text>;

function Pestanas() {
  const { usuario, cerrarSesion } = useAuth();
  const { noLeidas } = useNotificaciones();

  const salir = () =>
    Alert.alert('Cerrar sesión', '¿Deseas salir de tu cuenta?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: cerrarSesion },
    ]);

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: COLORES.guinda },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
        headerRight: () => (
          <Pressable onPress={salir} hitSlop={10} style={{ marginRight: 16 }}>
            <Text style={{ color: '#fff', fontWeight: '600' }}>Salir</Text>
          </Pressable>
        ),
        tabBarActiveTintColor: COLORES.guinda,
        tabBarInactiveTintColor: COLORES.muted,
        tabBarStyle: { backgroundColor: '#fff', borderTopColor: COLORES.borde },
        sceneStyle: { backgroundColor: COLORES.fondo },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Dashboard', tabBarLabel: 'Inicio', tabBarIcon: icono('📊') }} />
      <Tabs.Screen name="incidencias" options={{ title: 'Incidencias', tabBarIcon: icono('📋') }} />
      <Tabs.Screen name="mapa" options={{ title: 'Mapa de incidencias', tabBarLabel: 'Mapa', tabBarIcon: icono('🗺️') }} />
      <Tabs.Screen
        name="avisos"
        options={{
          title: 'Notificaciones',
          tabBarLabel: 'Avisos',
          tabBarIcon: icono('🔔'),
          tabBarBadge: noLeidas > 0 ? (noLeidas > 99 ? '99+' : noLeidas) : undefined,
          tabBarBadgeStyle: { backgroundColor: COLORES.rojo, color: '#fff' },
        }}
      />
      <Tabs.Screen
        name="usuarios"
        options={{ title: 'Usuarios', tabBarIcon: icono('👥'), href: usuario.Rol === ROLES.ADMIN ? undefined : null }}
      />
    </Tabs>
  );
}

export default function PanelLayout() {
  const { usuario } = useAuth();
  if (!usuario) return <Redirect href="/login" />;
  if (!esPersonal(usuario)) return <Redirect href="/reportes" />;
  return (
    <NotificacionesProvider>
      <Pestanas />
    </NotificacionesProvider>
  );
}
