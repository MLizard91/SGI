import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { COLORES } from '../config';
import { esPersonal } from '../roles';

// Pantalla inicial: login, panel de gestión (personal municipal) o mis reportes (ciudadano)
export default function Inicio() {
  const { usuario, cargando } = useAuth();
  if (cargando) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', backgroundColor: COLORES.guinda }}>
        <ActivityIndicator color="#fff" size="large" />
      </View>
    );
  }
  if (!usuario) return <Redirect href="/login" />;
  return <Redirect href={esPersonal(usuario) ? '/panel' : '/reportes'} />;
}
