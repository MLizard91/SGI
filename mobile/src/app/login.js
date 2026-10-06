import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Link, router } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { Boton, Campo } from '../components/UI';
import { COLORES } from '../config';

export default function Login() {
  const { iniciarSesion } = useAuth();
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [cargando, setCargando] = useState(false);

  async function entrar() {
    if (!correo || !password) return Alert.alert('Faltan datos', 'Escribe tu correo y contraseña');
    setCargando(true);
    try {
      await iniciarSesion(correo.trim(), password);
      router.replace('/reportes');
    } catch (e) {
      Alert.alert('No se pudo iniciar sesión', e.message);
    } finally {
      setCargando(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: COLORES.azul }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.contenedor} keyboardShouldPersistTaps="handled">
        <View style={styles.encabezado}>
          <Text style={styles.logo}>SGI</Text>
          <Text style={styles.titulo}>Reporta tu incidencia</Text>
          <Text style={styles.subtitulo}>H. Ayuntamiento de Mexticacán, Jalisco</Text>
        </View>
        <View style={styles.tarjeta}>
          <Campo etiqueta="Correo" value={correo} onChangeText={setCorreo} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
          <Campo etiqueta="Contraseña" value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" />
          <Boton titulo="Iniciar sesión" onPress={entrar} cargando={cargando} />
          <Link href="/registro" style={styles.link}>
            ¿No tienes cuenta? Regístrate
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  contenedor: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  encabezado: { alignItems: 'center', marginBottom: 28 },
  logo: {
    backgroundColor: '#fff', color: COLORES.azul, fontWeight: '900', fontSize: 28,
    paddingHorizontal: 18, paddingVertical: 10, borderRadius: 14, overflow: 'hidden', marginBottom: 14,
  },
  titulo: { color: '#fff', fontSize: 24, fontWeight: '800' },
  subtitulo: { color: '#BFDBFE', marginTop: 4 },
  tarjeta: { backgroundColor: COLORES.fondo, borderRadius: 16, padding: 20 },
  link: { color: COLORES.azulClaro, textAlign: 'center', marginTop: 18, fontSize: 15 },
});
