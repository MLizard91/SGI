// Componentes visuales reutilizables.
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { COLORES } from '../config';

export function Boton({ titulo, onPress, cargando, deshabilitado, variante = 'primario', estilo }) {
  const secundario = variante === 'secundario';
  return (
    <Pressable
      onPress={onPress}
      disabled={cargando || deshabilitado}
      style={({ pressed }) => [
        styles.boton,
        secundario && styles.botonSecundario,
        (pressed || cargando || deshabilitado) && { opacity: 0.6 },
        estilo,
      ]}
    >
      {cargando ? (
        <ActivityIndicator color={secundario ? COLORES.guinda : '#fff'} />
      ) : (
        <Text style={[styles.botonTexto, secundario && { color: COLORES.guinda }]}>{titulo}</Text>
      )}
    </Pressable>
  );
}

export function Campo({ etiqueta, ...props }) {
  return (
    <View style={{ marginBottom: 14 }}>
      {etiqueta && <Text style={styles.etiqueta}>{etiqueta}</Text>}
      <TextInput placeholderTextColor="#94A3B8" style={[styles.input, props.multiline && { minHeight: 90, textAlignVertical: 'top' }]} {...props} />
    </View>
  );
}

export function EstatusBadge({ nombre, color }) {
  return (
    <View style={[styles.badge, { backgroundColor: `${color}22`, borderColor: `${color}66` }]}>
      <Text style={[styles.badgeTexto, { color }]}>{nombre}</Text>
    </View>
  );
}

export function Chip({ texto, activo, color = COLORES.guinda, onPress }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, activo && { backgroundColor: color, borderColor: color }]}>
      <Text style={[styles.chipTexto, activo && { color: '#fff' }]}>{texto}</Text>
    </Pressable>
  );
}

export function Tarjeta({ children, estilo }) {
  return <View style={[styles.tarjeta, estilo]}>{children}</View>;
}

export function Titulo({ children }) {
  return <Text style={styles.titulo}>{children}</Text>;
}

const styles = StyleSheet.create({
  boton: { backgroundColor: COLORES.guinda, paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  botonSecundario: { backgroundColor: '#fff', borderWidth: 1, borderColor: COLORES.borde },
  botonTexto: { color: '#fff', fontWeight: '700', fontSize: 16 },
  etiqueta: { color: COLORES.muted, marginBottom: 6, fontSize: 13 },
  input: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: COLORES.borde, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 12, fontSize: 16, color: COLORES.texto,
  },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, borderWidth: 1 },
  badgeTexto: { fontSize: 12, fontWeight: '700' },
  chip: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: COLORES.borde,
    backgroundColor: '#fff', marginRight: 8, marginBottom: 8,
  },
  chipTexto: { color: COLORES.texto, fontSize: 14 },
  tarjeta: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: COLORES.borde },
  titulo: { fontSize: 16, fontWeight: '700', color: COLORES.guinda, marginBottom: 10 },
});
