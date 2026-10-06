import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { COLORES } from '../config';

// Pantalla inicial: decide si mostrar el login o los reportes
export default function Inicio() {
  const { usuario, cargando } = useAuth();
  if (cargando) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', backgroundColor: COLORES.azul }}>
        <ActivityIndicator color="#fff" size="large" />
      </View>
    );
  }
  return <Redirect href={usuario ? '/reportes' : '/login'} />;
}
