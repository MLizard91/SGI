// Administración de usuarios (solo administrador). Por protección de datos no se muestran correos ni teléfonos.
import { useCallback, useEffect, useState } from 'react';
import {
  Alert, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Switch, Text, View,
} from 'react-native';
import { Redirect } from 'expo-router';
import { api, formatoFecha } from '../../api';
import { useAuth } from '../../context/AuthContext';
import useCatalogos from '../../hooks/useCatalogos';
import { Boton, Campo, Chip, Selector } from '../../components/UI';
import { ROLES } from '../../roles';
import { COLORES } from '../../config';

const VACIO = { nombre: '', apellidos: '', correo: '', telefono: '', password: '', idRol: '', idArea: '', activo: true };
const CON_AREA = [ROLES.ENCARGADO, ROLES.OPERATIVO];

export default function Usuarios() {
  const { usuario } = useAuth();
  const catalogos = useCatalogos();
  const [usuarios, setUsuarios] = useState([]);
  const [buscar, setBuscar] = useState('');
  const [rol, setRol] = useState('');
  const [cargando, setCargando] = useState(false);
  const [form, setForm] = useState(null); // null = cerrado; objeto = creando/editando
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    if (usuario.Rol !== ROLES.ADMIN) return;
    setCargando(true);
    try {
      const params = new URLSearchParams();
      if (buscar.trim()) params.set('buscar', buscar.trim());
      if (rol) params.set('rol', String(rol));
      setUsuarios(await api(`/usuarios?${params}`));
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setCargando(false);
    }
  }, [buscar, rol, usuario.Rol]);

  useEffect(() => {
    const t = setTimeout(cargar, 350);
    return () => clearTimeout(t);
  }, [cargar]);

  if (usuario.Rol !== ROLES.ADMIN) return <Redirect href="/panel" />;

  const editar = (u) =>
    setForm({
      id: u.IdUsuario, nombre: u.Nombre, apellidos: u.Apellidos || '', correo: '', telefono: '',
      password: '', idRol: u.IdRol, idArea: u.IdArea || '', activo: !!u.Activo,
    });

  const campo = (k) => ({ value: form[k], onChangeText: (v) => setForm((f) => ({ ...f, [k]: v })) });
  const rolSeleccionado = catalogos?.roles.find((r) => r.IdRol === Number(form?.idRol))?.Nombre;
  const requiereArea = CON_AREA.includes(rolSeleccionado);

  async function guardar() {
    if (!form.nombre.trim() || !form.idRol) return Alert.alert('Faltan datos', 'Nombre y rol son obligatorios');
    if (!form.id && (!form.correo.trim() || form.password.length < 8)) {
      return Alert.alert('Faltan datos', 'El correo es obligatorio y la contraseña debe tener al menos 8 caracteres');
    }
    if (form.id && form.password && form.password.length < 8) return Alert.alert('Contraseña', 'Debe tener al menos 8 caracteres');
    if (requiereArea && !form.idArea) return Alert.alert('Falta el área', `El rol ${rolSeleccionado} necesita un área asignada`);

    const body = {
      ...form,
      correo: form.correo.trim(),
      idRol: Number(form.idRol),
      idArea: form.idArea ? Number(form.idArea) : null,
    };
    // Al editar, el teléfono vacío significa "sin cambios" (el actual no se muestra por privacidad)
    if (form.id && !form.telefono) delete body.telefono;
    if (form.id) delete body.correo;

    setGuardando(true);
    try {
      if (form.id) await api(`/usuarios/${form.id}`, { method: 'PUT', body });
      else await api('/usuarios', { method: 'POST', body });
      setForm(null);
      cargar();
    } catch (e) {
      Alert.alert('No se pudo guardar', e.message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={usuarios}
        keyExtractor={(u) => String(u.IdUsuario)}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={cargando} onRefresh={cargar} />}
        ListHeaderComponent={
          <View>
            <Campo value={buscar} onChangeText={setBuscar} placeholder="Buscar por nombre…" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Chip texto="Todos" activo={!rol} onPress={() => setRol('')} />
              {catalogos?.roles.map((r) => (
                <Chip key={r.IdRol} texto={r.Nombre} activo={rol === r.IdRol} onPress={() => setRol(r.IdRol)} />
              ))}
            </ScrollView>
            <Text style={styles.total}>{usuarios.length} usuario(s)</Text>
          </View>
        }
        ListEmptyComponent={!cargando && <Text style={styles.vacio}>No hay usuarios con esos filtros</Text>}
        renderItem={({ item }) => (
          <Pressable style={styles.tarjeta} onPress={() => editar(item)}>
            <View style={styles.avatar}>
              <Text style={styles.avatarTexto}>{item.Nombre.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.nombre}>{item.Nombre} {item.Apellidos}</Text>
              <Text style={styles.meta}>{item.Rol}{item.Area ? ` · ${item.Area}` : ''}</Text>
              <Text style={styles.meta}>Último acceso: {formatoFecha(item.UltimoAcceso)}</Text>
            </View>
            <Text style={[styles.estado, !item.Activo && { color: COLORES.rojo }]}>{item.Activo ? 'Activo' : 'Inactivo'}</Text>
          </Pressable>
        )}
      />

      <Pressable style={styles.fab} onPress={() => setForm(VACIO)} accessibilityLabel="Nuevo usuario">
        <Text style={styles.fabTexto}>＋ Nuevo</Text>
      </Pressable>

      <Modal visible={!!form} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setForm(null)}>
        {form && (
          <KeyboardAvoidingView style={{ flex: 1, backgroundColor: COLORES.fondo }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <View style={styles.modalEncabezado}>
              <Pressable onPress={() => setForm(null)} hitSlop={10}><Text style={styles.modalCancelar}>Cancelar</Text></Pressable>
              <Text style={styles.modalTitulo}>{form.id ? 'Editar usuario' : 'Nuevo usuario'}</Text>
              <View style={{ width: 60 }} />
            </View>
            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
              <Campo etiqueta="Nombre *" {...campo('nombre')} />
              <Campo etiqueta="Apellidos" {...campo('apellidos')} />
              {!form.id && (
                <Campo etiqueta="Correo *" {...campo('correo')} keyboardType="email-address" autoCapitalize="none" />
              )}
              <Campo
                etiqueta={form.id ? 'Nuevo teléfono (opcional)' : 'Teléfono'}
                {...campo('telefono')}
                keyboardType="phone-pad"
                placeholder={form.id ? 'Oculto por privacidad · vacío = sin cambios' : ''}
              />
              <Selector etiqueta="Rol *" valor={form.idRol} onCambiar={(v) => setForm((f) => ({ ...f, idRol: v }))}
                opciones={(catalogos?.roles || []).map((r) => ({ valor: r.IdRol, texto: r.Nombre }))} />
              <Selector etiqueta={`Área${requiereArea ? ' *' : ''}`} valor={form.idArea} onCambiar={(v) => setForm((f) => ({ ...f, idArea: v }))}
                opciones={[{ valor: '', texto: 'Ninguna' }, ...(catalogos?.areas || []).map((a) => ({ valor: a.IdArea, texto: a.Nombre }))]} />
              <Campo etiqueta={form.id ? 'Nueva contraseña (opcional)' : 'Contraseña * (mín. 8)'} {...campo('password')} secureTextEntry />
              {form.id && (
                <View style={styles.interruptor}>
                  <Text style={{ color: COLORES.texto, fontSize: 16 }}>Cuenta activa</Text>
                  <Switch
                    value={form.activo}
                    onValueChange={(v) => setForm((f) => ({ ...f, activo: v }))}
                    trackColor={{ true: COLORES.guindaClaro }}
                    disabled={form.id === usuario.IdUsuario}
                  />
                </View>
              )}
              <Boton titulo="Guardar" onPress={guardar} cargando={guardando} />
            </ScrollView>
          </KeyboardAvoidingView>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  total: { color: COLORES.muted, fontSize: 13, marginBottom: 8, marginTop: 4 },
  vacio: { color: COLORES.muted, textAlign: 'center', marginTop: 40 },
  tarjeta: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 14, padding: 12, marginBottom: 10,
    borderWidth: 1, borderColor: COLORES.borde,
  },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: COLORES.beige, alignItems: 'center', justifyContent: 'center' },
  avatarTexto: { color: COLORES.guinda, fontWeight: '800', fontSize: 18 },
  nombre: { fontWeight: '700', color: COLORES.texto, fontSize: 15 },
  meta: { color: COLORES.muted, fontSize: 12, marginTop: 2 },
  estado: { color: '#15803D', fontWeight: '700', fontSize: 12 },
  fab: {
    position: 'absolute', right: 20, bottom: 20, backgroundColor: COLORES.guinda, paddingHorizontal: 20, paddingVertical: 14,
    borderRadius: 999, elevation: 6, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
  },
  fabTexto: { color: '#fff', fontWeight: '800', fontSize: 15 },
  modalEncabezado: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingTop: Platform.OS === 'ios' ? 16 : 40,
    backgroundColor: COLORES.guinda,
  },
  modalTitulo: { color: '#fff', fontWeight: '800', fontSize: 17 },
  modalCancelar: { color: '#fff', fontWeight: '600', width: 60 },
  interruptor: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10,
    borderWidth: 1, borderColor: COLORES.borde, padding: 12, marginBottom: 16,
  },
});
