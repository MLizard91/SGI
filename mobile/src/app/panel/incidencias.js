// Lista de incidencias con búsqueda, filtros y carga por páginas (equivalente a la tabla del panel web).
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { api, formatoFecha, imagenUrl } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useSocketEvent } from '../../context/SocketContext';
import useCatalogos from '../../hooks/useCatalogos';
import { Campo, Chip, EstatusBadge, PrioridadBadge, Selector } from '../../components/UI';
import { eligeArea, puedeGestionar } from '../../roles';
import { COLORES } from '../../config';

const LIMITE = 15;
const SIN_FILTROS = { area: '', estatus: '', prioridad: '', abiertas: false };

export default function Incidencias() {
  const { usuario } = useAuth();
  const catalogos = useCatalogos();
  const [buscar, setBuscar] = useState('');
  const [busqueda, setBusqueda] = useState(''); // valor ya "asentado" (con retraso) para no consultar en cada tecla
  const [filtros, setFiltros] = useState(SIN_FILTROS);
  const [verFiltros, setVerFiltros] = useState(false);
  const [lista, setLista] = useState([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [nuevas, setNuevas] = useState(0);
  const consulta = useRef(0);

  useEffect(() => {
    const t = setTimeout(() => setBusqueda(buscar.trim()), 400);
    return () => clearTimeout(t);
  }, [buscar]);

  const cargar = useCallback(async (numPagina = 1) => {
    const id = ++consulta.current;
    setCargando(true);
    try {
      const params = new URLSearchParams({ pagina: String(numPagina), limite: String(LIMITE) });
      if (busqueda) params.set('buscar', busqueda);
      if (filtros.area) params.set('area', String(filtros.area));
      if (filtros.estatus) params.set('estatus', String(filtros.estatus));
      if (filtros.prioridad) params.set('prioridad', filtros.prioridad);
      if (filtros.abiertas) params.set('abiertas', '1');
      const r = await api(`/incidencias?${params}`);
      if (id !== consulta.current) return; // llegó una respuesta vieja
      setLista((prev) => (numPagina === 1 ? r.datos : [...prev, ...r.datos]));
      setTotal(r.total);
      setPagina(numPagina);
      setError('');
      if (numPagina === 1) setNuevas(0);
    } catch (e) {
      if (id === consulta.current) setError(e.message);
    } finally {
      if (id === consulta.current) setCargando(false);
    }
  }, [busqueda, filtros]);

  useEffect(() => { cargar(1); }, [cargar]);

  // Tiempo real: avisar de reportes nuevos y actualizar los que cambian
  useSocketEvent('incidencia:nueva', useCallback(() => setNuevas((n) => n + 1), []));
  useSocketEvent(
    'incidencia:actualizada',
    useCallback((inc) => setLista((prev) => prev.map((d) => (d.IdIncidencia === inc.IdIncidencia ? { ...d, ...inc } : d))), [])
  );

  const cambiar = (campo) => (valor) => setFiltros((f) => ({ ...f, [campo]: valor }));
  const filtrosActivos = [filtros.area, filtros.estatus, filtros.prioridad, filtros.abiertas].filter(Boolean).length;
  const hayMas = lista.length < total;

  const encabezado = (
    <View>
      <View style={styles.busqueda}>
        <View style={{ flex: 1 }}>
          <Campo value={buscar} onChangeText={setBuscar} placeholder="Buscar folio, título, dirección…" returnKeyType="search" />
        </View>
        <Pressable style={[styles.botonFiltros, filtrosActivos > 0 && styles.botonFiltrosActivo]} onPress={() => setVerFiltros(!verFiltros)}>
          <Text style={[styles.botonFiltrosTexto, filtrosActivos > 0 && { color: '#fff' }]}>
            Filtros{filtrosActivos ? ` (${filtrosActivos})` : ''}
          </Text>
        </Pressable>
      </View>

      {verFiltros && (
        <View style={styles.panelFiltros}>
          {eligeArea(usuario) && (
            <Selector etiqueta="Área" valor={filtros.area} onCambiar={cambiar('area')}
              opciones={[{ valor: '', texto: 'Todas las áreas' }, ...(catalogos?.areas || []).map((a) => ({ valor: a.IdArea, texto: a.Nombre }))]} />
          )}
          <Selector etiqueta="Estatus" valor={filtros.estatus} onCambiar={cambiar('estatus')}
            opciones={[{ valor: '', texto: 'Todos los estatus' }, ...(catalogos?.estatus || []).map((e) => ({ valor: e.IdEstatus, texto: e.Nombre }))]} />
          <Selector etiqueta="Prioridad" valor={filtros.prioridad} onCambiar={cambiar('prioridad')}
            opciones={[{ valor: '', texto: 'Todas las prioridades' }, ...(catalogos?.prioridades || []).map((p) => ({ valor: p, texto: p }))]} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            <Chip texto="Solo abiertas" activo={filtros.abiertas} onPress={() => cambiar('abiertas')(!filtros.abiertas)} />
            {filtrosActivos > 0 && <Chip texto="Limpiar filtros" onPress={() => setFiltros(SIN_FILTROS)} />}
          </View>
        </View>
      )}

      {nuevas > 0 && (
        <Pressable style={styles.avisoNuevas} onPress={() => cargar(1)}>
          <Text style={styles.avisoNuevasTexto}>🔔 {nuevas} reporte(s) nuevo(s) · toca para actualizar</Text>
        </Pressable>
      )}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Text style={styles.total}>{total} resultado(s)</Text>
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={lista}
        keyExtractor={(i) => String(i.IdIncidencia)}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={encabezado}
        refreshControl={<RefreshControl refreshing={cargando && pagina === 1} onRefresh={() => cargar(1)} />}
        onEndReachedThreshold={0.4}
        onEndReached={() => hayMas && !cargando && cargar(pagina + 1)}
        ListFooterComponent={cargando && pagina >= 1 && lista.length > 0 ? <ActivityIndicator color={COLORES.guinda} style={{ margin: 16 }} /> : null}
        ListEmptyComponent={!cargando && <Text style={styles.vacio}>No hay incidencias con esos filtros</Text>}
        renderItem={({ item }) => (
          <Pressable style={styles.tarjeta} onPress={() => router.push(`/gestion/${item.IdIncidencia}`)}>
            {item.ImagenPrincipal ? (
              <Image source={{ uri: imagenUrl(item.ImagenPrincipal) }} style={styles.imagen} />
            ) : (
              <View style={[styles.imagen, { backgroundColor: COLORES.borde }]} />
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.folio}>{item.Folio} · {formatoFecha(item.FechaCreacion)}</Text>
              <Text style={styles.titulo} numberOfLines={2}>{item.Titulo}</Text>
              <View style={styles.area}>
                <View style={[styles.punto, { backgroundColor: item.ColorArea }]} />
                <Text style={styles.meta} numberOfLines={1}>{item.Area} › {item.Categoria}</Text>
              </View>
              <View style={styles.badges}>
                <EstatusBadge nombre={item.Estatus} color={item.ColorEstatus} />
                <PrioridadBadge prioridad={item.Prioridad} />
              </View>
              <Text style={styles.meta} numberOfLines={1}>👷 {item.Asignado || 'Sin asignar'}</Text>
            </View>
          </Pressable>
        )}
      />
      {puedeGestionar(usuario) && (
        <Pressable style={styles.fab} onPress={() => router.push('/reportes/nuevo')} accessibilityLabel="Registrar reporte">
          <Text style={styles.fabTexto}>＋ Registrar</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  busqueda: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  botonFiltros: {
    borderWidth: 1, borderColor: COLORES.borde, backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 12,
    height: 50, justifyContent: 'center',
  },
  botonFiltrosActivo: { backgroundColor: COLORES.guinda, borderColor: COLORES.guinda },
  botonFiltrosTexto: { color: COLORES.guinda, fontWeight: '700' },
  panelFiltros: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: COLORES.borde, padding: 14, marginBottom: 12 },
  avisoNuevas: { backgroundColor: '#FEF3C7', borderRadius: 10, padding: 12, marginBottom: 10 },
  avisoNuevasTexto: { color: '#92400E', fontWeight: '700', textAlign: 'center' },
  error: { color: COLORES.rojo, backgroundColor: '#FEF2F2', padding: 10, borderRadius: 8, marginBottom: 10 },
  total: { color: COLORES.muted, marginBottom: 8, fontSize: 13 },
  vacio: { color: COLORES.muted, textAlign: 'center', marginTop: 40 },
  tarjeta: {
    flexDirection: 'row', gap: 12, backgroundColor: '#fff', borderRadius: 14, padding: 12, marginBottom: 12,
    borderWidth: 1, borderColor: COLORES.borde,
  },
  imagen: { width: 76, height: 76, borderRadius: 10 },
  folio: { color: COLORES.muted, fontSize: 11, fontWeight: '700' },
  titulo: { fontSize: 15, fontWeight: '700', color: COLORES.texto, marginVertical: 2 },
  area: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  punto: { width: 8, height: 8, borderRadius: 4 },
  meta: { color: COLORES.muted, fontSize: 12, flexShrink: 1 },
  badges: { flexDirection: 'row', gap: 6, marginVertical: 6 },
  fab: {
    position: 'absolute', right: 20, bottom: 20, backgroundColor: COLORES.guinda, paddingHorizontal: 20, paddingVertical: 14,
    borderRadius: 999, elevation: 6, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
  },
  fabTexto: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
