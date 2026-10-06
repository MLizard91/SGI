import { useCallback, useState } from 'react';
import { FlatList, Image, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Redirect, Stack, router, useFocusEffect } from 'expo-router';
import { api, formatoFecha, imagenUrl } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useSocketEvent } from '../../context/SocketContext';
import { EstatusBadge } from '../../components/UI';
import { COLORES } from '../../config';

export default function MisReportes() {
  const { usuario, cerrarSesion } = useAuth();
  const [reportes, setReportes] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const r = await api('/incidencias?limite=50');
      setReportes(r.datos);
      setError('');
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  }, []);

  // Recargar cada vez que regresamos a esta pantalla
  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar])
  );

  // Tiempo real: cuando el municipio actualiza un reporte, lo reflejamos al instante
  useSocketEvent(
    'incidencia:actualizada',
    useCallback((inc) => setReportes((prev) => prev.map((r) => (r.IdIncidencia === inc.IdIncidencia ? inc : r))), [])
  );

  if (!usuario) return <Redirect href="/login" />;

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable onPress={cerrarSesion} hitSlop={10}>
              <Text style={{ color: '#fff', fontWeight: '600' }}>Salir</Text>
            </Pressable>
          ),
        }}
      />
      <FlatList
        data={reportes}
        keyExtractor={(r) => String(r.IdIncidencia)}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={cargando} onRefresh={cargar} />}
        ListHeaderComponent={
          <>
            <Text style={styles.saludo}>Hola, {usuario.Nombre} 👋</Text>
            {error ? <Text style={styles.error}>{error}</Text> : null}
          </>
        }
        ListEmptyComponent={
          !cargando && (
            <View style={styles.vacio}>
              <Text style={{ fontSize: 48 }}>📍</Text>
              <Text style={styles.vacioTexto}>Aún no tienes reportes.{'\n'}Toca “Reportar” para enviar el primero.</Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <Pressable style={styles.tarjeta} onPress={() => router.push(`/reportes/${item.IdIncidencia}`)}>
            {item.ImagenPrincipal ? (
              <Image source={{ uri: imagenUrl(item.ImagenPrincipal) }} style={styles.imagen} />
            ) : (
              <View style={[styles.imagen, { backgroundColor: COLORES.borde }]} />
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.folio}>{item.Folio}</Text>
              <Text style={styles.tituloReporte} numberOfLines={2}>{item.Titulo}</Text>
              <Text style={styles.area}>{item.Area}</Text>
              <View style={styles.fila}>
                <EstatusBadge nombre={item.Estatus} color={item.ColorEstatus} />
                <Text style={styles.fecha}>{formatoFecha(item.FechaCreacion)}</Text>
              </View>
            </View>
          </Pressable>
        )}
      />
      <Pressable style={styles.fab} onPress={() => router.push('/reportes/nuevo')}>
        <Text style={styles.fabTexto}>＋ Reportar</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  saludo: { fontSize: 20, fontWeight: '700', color: COLORES.texto, marginBottom: 12 },
  error: { color: COLORES.rojo, backgroundColor: '#FEF2F2', padding: 10, borderRadius: 8, marginBottom: 12 },
  tarjeta: {
    flexDirection: 'row', gap: 12, backgroundColor: '#fff', borderRadius: 14, padding: 12, marginBottom: 12,
    borderWidth: 1, borderColor: COLORES.borde,
  },
  imagen: { width: 84, height: 84, borderRadius: 10 },
  folio: { color: COLORES.muted, fontSize: 12, fontWeight: '700' },
  tituloReporte: { fontSize: 16, fontWeight: '700', color: COLORES.texto, marginVertical: 2 },
  area: { color: COLORES.muted, fontSize: 13, marginBottom: 6 },
  fila: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  fecha: { color: COLORES.muted, fontSize: 11 },
  vacio: { alignItems: 'center', marginTop: 60 },
  vacioTexto: { textAlign: 'center', color: COLORES.muted, marginTop: 10, fontSize: 15, lineHeight: 22 },
  fab: {
    position: 'absolute', right: 20, bottom: 30, backgroundColor: COLORES.azul, paddingHorizontal: 22, paddingVertical: 16,
    borderRadius: 999, elevation: 6, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
  },
  fabTexto: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
