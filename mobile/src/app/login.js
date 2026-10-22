import { useState } from 'react';
import { Alert, Image, Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Link, router } from 'expo-router';
import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Boton, Campo } from '../components/UI';
import { COLORES } from '../config';

export default function Login() {
  const { iniciarSesion } = useAuth();
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [cargando, setCargando] = useState(false);
  const [tecladoVisible, setTecladoVisible] = useState(false);

  useEffect(() => {
    const mostrar = Keyboard.addListener('keyboardDidShow', () => setTecladoVisible(true));
    const ocultar = Keyboard.addListener('keyboardDidHide', () => setTecladoVisible(false));
    return () => {
      mostrar.remove();
      ocultar.remove();
    };
  }, []);

  async function entrar() {
    if (!correo || !password) return Alert.alert('Faltan datos', 'Escribe tu correo y contraseña');
    setCargando(true);
    try {
      await iniciarSesion(correo.trim(), password);
      router.replace('/');
    } catch (e) {
      Alert.alert('No se pudo iniciar sesión', e.message);
    } finally {
      setCargando(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.pantalla}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.contenedor, tecladoVisible && styles.contenedorConTeclado]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      >
        <View style={[styles.encabezado, tecladoVisible && styles.encabezadoCompacto]}>
          <Image
            source={require('../../assets/logo-mexticacan.png')}
            style={[styles.logoImagen, tecladoVisible && styles.logoImagenCompacto]}
            resizeMode="contain"
            accessibilityLabel="Mexticacán Incidencias: tu reporte, un mejor municipio"
          />
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
  pantalla: { flex: 1, backgroundColor: COLORES.guinda },
  scroll: { flex: 1 },
  contenedor: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  contenedorConTeclado: { justifyContent: 'flex-start', paddingTop: 12, paddingBottom: 20 },
  encabezado: { alignItems: 'center', marginBottom: 28 },
  encabezadoCompacto: { marginBottom: 12 },
  logoImagen: { width: 220, height: 220, backgroundColor: COLORES.beige, borderRadius: 14, marginBottom: 14 },
  logoImagenCompacto: { width: 104, height: 104, marginBottom: 8 },
  titulo: { color: '#fff', fontSize: 24, fontWeight: '800' },
  subtitulo: { color: COLORES.beige, marginTop: 4 },
  tarjeta: { backgroundColor: COLORES.fondo, borderRadius: 16, padding: 20 },
  link: { color: COLORES.guindaClaro, textAlign: 'center', marginTop: 18, fontSize: 15 },
});
