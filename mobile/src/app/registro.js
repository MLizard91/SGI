import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Text } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { Boton, Campo } from '../components/UI';
import { COLORES } from '../config';

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
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, padding: 20, paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      >
        <Campo etiqueta="Nombre *" {...campo('nombre')} autoComplete="given-name" />
        <Campo etiqueta="Apellidos" {...campo('apellidos')} autoComplete="family-name" />
        <Campo etiqueta="Teléfono" {...campo('telefono')} keyboardType="phone-pad" autoComplete="tel" />
        <Campo etiqueta="Correo *" {...campo('correo')} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
        <Campo etiqueta="Contraseña * (mín. 8 caracteres)" {...campo('password')} secureTextEntry />
        <Campo etiqueta="Confirmar contraseña *" {...campo('confirmar')} secureTextEntry />
        <Text style={{ fontSize: 12, color: COLORES.muted, marginBottom: 14, lineHeight: 17 }}>
          Aviso de privacidad: tu correo y teléfono se usan solo para tu cuenta y para darte seguimiento.
          No se muestran a otros usuarios; el personal del municipio únicamente ve tu nombre.
        </Text>
        <Boton titulo="Crear cuenta" onPress={enviar} cargando={cargando} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
