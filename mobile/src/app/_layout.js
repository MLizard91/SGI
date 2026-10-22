import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../context/AuthContext';
import { SocketProvider } from '../context/SocketContext';
import { COLORES } from '../config';

export default function RootLayout() {
  return (
    <AuthProvider>
      <SocketProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: COLORES.guinda },
            headerTintColor: '#fff',
            headerTitleStyle: { fontWeight: '700' },
            contentStyle: { backgroundColor: COLORES.fondo },
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="registro" options={{ title: 'Crear cuenta' }} />
          <Stack.Screen name="reportes/index" options={{ title: 'Mis reportes' }} />
          <Stack.Screen name="reportes/nuevo" options={{ title: 'Nuevo reporte' }} />
          <Stack.Screen name="reportes/[id]" options={{ title: 'Detalle del reporte' }} />
        </Stack>
      </SocketProvider>
    </AuthProvider>
  );
}
