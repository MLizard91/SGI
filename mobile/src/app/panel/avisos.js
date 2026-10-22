// Notificaciones del personal (nuevos reportes, asignaciones, comentarios de ciudadanos).
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { formatoFecha } from '../../api';
import { useNotificaciones } from '../../context/NotificacionesContext';
import { COLORES } from '../../config';

export default function Avisos() {
  const { datos, noLeidas, cargando, cargar, marcarLeida, leerTodas } = useNotificaciones();

  async function abrir(n) {
    await marcarLeida(n).catch(() => {});
    if (n.IdIncidencia) router.push(`/gestion/${n.IdIncidencia}`);
  }

  return (
    <FlatList
      data={datos}
      keyExtractor={(n) => String(n.IdNotificacion)}
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={cargando} onRefresh={cargar} />}
      ListHeaderComponent={
        noLeidas > 0 ? (
          <View style={styles.encabezado}>
            <Text style={styles.muted}>{noLeidas} sin leer</Text>
            <Pressable onPress={() => leerTodas().catch(() => {})} hitSlop={8}>
              <Text style={styles.link}>Marcar todas como leídas</Text>
            </Pressable>
          </View>
        ) : null
      }
      ListEmptyComponent={
        !cargando && (
          <View style={{ alignItems: 'center', marginTop: 60 }}>
            <Text style={{ fontSize: 44 }}>🔔</Text>
            <Text style={[styles.muted, { marginTop: 8 }]}>Sin notificaciones</Text>
          </View>
        )
      }
      renderItem={({ item }) => (
        <Pressable style={[styles.item, !item.Leida && styles.nueva]} onPress={() => abrir(item)}>
          {!item.Leida && <View style={styles.indicador} />}
          <View style={{ flex: 1 }}>
            <Text style={styles.titulo}>{item.Titulo}</Text>
            <Text style={styles.mensaje}>{item.Mensaje}</Text>
            <Text style={styles.fecha}>{formatoFecha(item.Fecha)}</Text>
          </View>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  encabezado: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  muted: { color: COLORES.muted },
  link: { color: COLORES.guindaClaro, fontWeight: '700' },
  item: {
    flexDirection: 'row', gap: 10, backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: COLORES.borde,
  },
  nueva: { backgroundColor: '#FFF8F0', borderColor: '#E9C9A8' },
  indicador: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORES.guinda, marginTop: 5 },
  titulo: { fontWeight: '700', color: COLORES.texto, fontSize: 15 },
  mensaje: { color: COLORES.texto, marginTop: 2 },
  fecha: { color: COLORES.muted, fontSize: 12, marginTop: 4 },
});
