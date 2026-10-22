// Componentes visuales reutilizables.
import { useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
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

const COLORES_PRIORIDAD = { Baja: '#64748B', Media: '#0284C7', Alta: '#EA580C', Urgente: '#DC2626' };

export function PrioridadBadge({ prioridad }) {
  return <EstatusBadge nombre={prioridad} color={COLORES_PRIORIDAD[prioridad] || '#64748B'} />;
}

/* Lista de opciones que se abre como hoja inferior (sustituye al <select> de la web).
   opciones: [{ valor, texto }] */
export function Selector({ etiqueta, valor, opciones, onCambiar, placeholder = 'Selecciona…', deshabilitado, estilo }) {
  const [abierto, setAbierto] = useState(false);
  const actual = opciones.find((o) => String(o.valor) === String(valor));
  return (
    <View style={[{ marginBottom: 14 }, estilo]}>
      {etiqueta && <Text style={styles.etiqueta}>{etiqueta}</Text>}
      <Pressable
        style={[styles.input, styles.selector, deshabilitado && { opacity: 0.5 }]}
        onPress={() => setAbierto(true)}
        disabled={deshabilitado}
        accessibilityRole="button"
        accessibilityLabel={etiqueta || placeholder}
      >
        <Text style={[styles.selectorTexto, !actual && { color: '#94A3B8' }]} numberOfLines={1}>
          {actual ? actual.texto : placeholder}
        </Text>
        <Text style={{ color: COLORES.muted }}>▾</Text>
      </Pressable>
      <Modal visible={abierto} transparent animationType="slide" onRequestClose={() => setAbierto(false)}>
        <View style={styles.fondoModal}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setAbierto(false)} />
          <View style={styles.hoja}>
            <Text style={styles.titulo}>{etiqueta || placeholder}</Text>
            <FlatList
              data={opciones}
              keyExtractor={(o) => String(o.valor)}
              renderItem={({ item }) => {
                const elegido = String(item.valor) === String(valor);
                return (
                  <Pressable
                    style={({ pressed }) => [styles.opcion, pressed && { backgroundColor: COLORES.fondo }]}
                    onPress={() => {
                      setAbierto(false);
                      onCambiar(item.valor);
                    }}
                  >
                    <Text style={[styles.opcionTexto, elegido && { color: COLORES.guinda, fontWeight: '700' }]}>{item.texto}</Text>
                    {elegido && <Text style={{ color: COLORES.guinda, fontWeight: '700' }}>✓</Text>}
                  </Pressable>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

export function Kpi({ etiqueta, valor, alerta }) {
  return (
    <View style={[styles.kpi, alerta && { borderColor: '#F5C2C7', backgroundColor: '#FEF2F2' }]}>
      <Text style={styles.kpiEtiqueta}>{etiqueta}</Text>
      <Text style={[styles.kpiValor, alerta && { color: COLORES.rojo }]}>{valor}</Text>
    </View>
  );
}

// Gráfica de barras horizontales: funciones para obtener etiqueta, valor y color de cada fila
export function Barras({ filas, etiqueta, valor, color }) {
  const max = Math.max(1, ...filas.map(valor));
  return (
    <View>
      {filas.map((f, i) => (
        <View key={i} style={{ marginBottom: 10 }}>
          <View style={styles.barraEncabezado}>
            <Text style={styles.barraEtiqueta} numberOfLines={1}>{etiqueta(f)}</Text>
            <Text style={styles.barraValor}>{valor(f)}</Text>
          </View>
          <View style={styles.barraPista}>
            <View style={[styles.barra, { width: `${(valor(f) / max) * 100}%`, backgroundColor: color(f) }]} />
          </View>
        </View>
      ))}
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
  selector: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  selectorTexto: { flex: 1, fontSize: 16, color: COLORES.texto },
  fondoModal: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  hoja: { backgroundColor: '#fff', borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 18, paddingBottom: 34, maxHeight: '70%' },
  opcion: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 6,
    borderBottomWidth: 1, borderBottomColor: COLORES.fondo,
  },
  opcionTexto: { fontSize: 16, color: COLORES.texto, flex: 1 },
  kpi: { flexGrow: 1, flexBasis: '46%', backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: COLORES.borde, padding: 12 },
  kpiEtiqueta: { color: COLORES.muted, fontSize: 12 },
  kpiValor: { color: COLORES.guinda, fontSize: 24, fontWeight: '800', marginTop: 2 },
  barraEncabezado: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  barraEtiqueta: { color: COLORES.texto, fontSize: 13, flex: 1 },
  barraValor: { color: COLORES.texto, fontSize: 13, fontWeight: '700', marginLeft: 8 },
  barraPista: { height: 10, backgroundColor: COLORES.fondo, borderRadius: 5, overflow: 'hidden' },
  barra: { height: 10, borderRadius: 5 },
});
