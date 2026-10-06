import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { Boton, Campo } from '../components/UI';

export default function Registro() {
  const { registrarse } = useAuth();
  const [form, setForm] = useState({ nombre: '', apellidos: '', telefono: '', correo: '', password: '', confirmar: '' });
  const [cargando, setCargando] = useState(false);
  const campo = (k) => ({ value: form[k], onChangeText: (v) => setForm({ ...form, [k]: v }) });

  async function enviar() {
    if (!form.nombre || !form.correo || !form.password) return Alert.alert('Faltan datos', 'Nombre, correo y contraseña son obligatorios');
    if (form.password.length < 8) return Alert.alert('Contraseña', 'Debe tener al menos 8 caracteres');
    if (form.password !== form.confirmar) return Alert.alert('Contraseña', 'Las contraseñas no coinciden');
    setCargando(true);
    try {
      const { confirmar, ...datos } = form;
      await registrarse({ ...datos, correo: datos.correo.trim() });
      router.replace('/reportes');
    } catch (e) {
      Alert.alert('No se pudo registrar', e.message);
    } finally {
      setCargando(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
        <Campo etiqueta="Nombre *" {...campo('nombre')} autoComplete="given-name" />
        <Campo etiqueta="Apellidos" {...campo('apellidos')} autoComplete="family-name" />
        <Campo etiqueta="Teléfono" {...campo('telefono')} keyboardType="phone-pad" autoComplete="tel" />
        <Campo etiqueta="Correo *" {...campo('correo')} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
        <Campo etiqueta="Contraseña * (mín. 8 caracteres)" {...campo('password')} secureTextEntry />
        <Campo etiqueta="Confirmar contraseña *" {...campo('confirmar')} secureTextEntry />
        <Boton titulo="Crear cuenta" onPress={enviar} cargando={cargando} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
