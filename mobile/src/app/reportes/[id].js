import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import MapView, { Marker } from 'react-native-maps';
import { api, formatoFecha, imagenUrl } from '../../api';
import { useSocketEvent } from '../../context/SocketContext';
import { Boton, Campo, EstatusBadge, Tarjeta, Titulo } from '../../components/UI';
import { COLORES } from '../../config';

// Pasos que ve el ciudadano para entender en qué va su reporte
const PASOS = ['Recibida', 'En revisión', 'Asignada', 'En proceso', 'Resuelta'];

export default function DetalleReporte() {
  const { id } = useLocalSearchParams();
  const [inc, setInc] = useState(null);
  const [comentario, setComentario] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [imagenGrande, setImagenGrande] = useState(null);

  const cargar = useCallback(() => {
    api(`/incidencias/${id}`).then(setInc).catch((e) => Alert.alert('Error', e.message));
  }, [id]);

  useEffect(cargar, [cargar]);

  // Tiempo real: si el municipio cambia el estatus o comenta, recargamos
  const siEsEste = useCallback((d) => String(d.IdIncidencia) === String(id) && cargar(), [id, cargar]);
  useSocketEvent('incidencia:actualizada', siEsEste);
  useSocketEvent('incidencia:comentario', siEsEste);

  async function comentar() {
    if (!comentario.trim()) return;
    setEnviando(true);
    try {
      await api(`/incidencias/${id}/comentarios`, { method: 'POST', body: { texto: comentario } });
      setComentario('');
      cargar();
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setEnviando(false);
    }
  }

  if (!inc) return <ActivityIndicator style={{ marginTop: 40 }} size="large" color={COLORES.azul} />;

  const pasoActual = PASOS.indexOf(inc.Estatus);
  const coordenada = { latitude: Number(inc.Latitud), longitude: Number(inc.Longitud) };
  const evidencias = inc.imagenes.filter((i) => i.Tipo === 'Evidencia');

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <Tarjeta>
        <Text style={styles.folio}>{inc.Folio} · {inc.Area}</Text>
        <Text style={styles.titulo}>{inc.Titulo}</Text>
        <EstatusBadge nombre={inc.Estatus} color={inc.ColorEstatus} />

        {inc.Estatus === 'Rechazada' ? (
          <Text style={[styles.texto, { color: COLORES.rojo, marginTop: 12 }]}>El reporte fue rechazado. Revisa los comentarios.</Text>
        ) : (
          <View style={styles.pasos}>
            {PASOS.map((p, i) => {
              const hecho = i <= pasoActual || inc.Estatus === 'Cerrada';
              return (
                <View key={p} style={styles.paso}>
                  <View style={[styles.circulo, hecho && { backgroundColor: inc.ColorEstatus, borderColor: inc.ColorEstatus }]} />
                  <Text style={[styles.pasoTexto, hecho && { color: COLORES.texto, fontWeight: '700' }]}>{p}</Text>
                </View>
              );
            })}
          </View>
        )}
        <Text style={styles.texto}>{inc.Descripcion}</Text>
        <Text style={styles.meta}>Reportado: {formatoFecha(inc.FechaCreacion)}</Text>
        {inc.FechaResolucion && <Text style={styles.meta}>Resuelto: {formatoFecha(inc.FechaResolucion)}</Text>}
      </Tarjeta>

      <Tarjeta>
        <Titulo>Fotografías</Titulo>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {inc.imagenes.filter((i) => i.Tipo === 'Reporte').map((im) => (
            <Pressable key={im.IdImagen} onPress={() => setImagenGrande(im.Ruta)}>
              <Image source={{ uri: imagenUrl(im.Ruta) }} style={styles.foto} />
            </Pressable>
          ))}
        </ScrollView>
        {evidencias.length > 0 && (
          <>
            <Text style={[styles.meta, { marginTop: 12, marginBottom: 6 }]}>Evidencia del trabajo realizado</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {evidencias.map((im) => (
                <Pressable key={im.IdImagen} onPress={() => setImagenGrande(im.Ruta)}>
                  <Image source={{ uri: imagenUrl(im.Ruta) }} style={styles.foto} />
                </Pressable>
              ))}
            </ScrollView>
          </>
        )}
      </Tarjeta>

      <Tarjeta>
        <Titulo>Ubicación</Titulo>
        <MapView
          style={styles.mapa}
          initialRegion={{ ...coordenada, latitudeDelta: 0.004, longitudeDelta: 0.004 }}
          scrollEnabled={false}
          zoomEnabled={false}
        >
          <Marker coordinate={coordenada} pinColor={inc.ColorArea} />
        </MapView>
        {inc.Direccion ? <Text style={styles.texto}>{inc.Direccion}{inc.Comunidad ? `, ${inc.Comunidad}` : ''}</Text> : null}
        <Pressable onPress={() => Linking.openURL(`https://www.google.com/maps?q=${coordenada.latitude},${coordenada.longitude}`)}>
          <Text style={styles.link}>Abrir en Google Maps</Text>
        </Pressable>
      </Tarjeta>

      <Tarjeta>
        <Titulo>Seguimiento</Titulo>
        {inc.historial.map((h) => (
          <View key={h.IdHistorial} style={[styles.evento, { borderLeftColor: h.ColorEstatusNuevo || COLORES.borde }]}>
            <Text style={{ fontWeight: '700', color: COLORES.texto }}>
              {h.Accion === 'Creación' ? 'Reporte creado' : h.EstatusNuevo ? `Estatus: ${h.EstatusNuevo}` : h.Accion}
            </Text>
            {h.Detalle && h.Accion === 'CambioEstatus' ? <Text style={styles.texto}>{h.Detalle}</Text> : null}
            <Text style={styles.meta}>{formatoFecha(h.Fecha)}</Text>
          </View>
        ))}
      </Tarjeta>

      <Tarjeta>
        <Titulo>Comentarios</Titulo>
        {inc.comentarios.length === 0 && <Text style={styles.meta}>Aún no hay comentarios.</Text>}
        {inc.comentarios.map((c) => (
          <View key={c.IdComentario} style={[styles.comentario, c.Rol === 'Ciudadano' && styles.comentarioPropio]}>
            <Text style={{ fontWeight: '700' }}>{c.Rol === 'Ciudadano' ? 'Tú' : `${c.Usuario} (Municipio)`}</Text>
            <Text style={styles.texto}>{c.Texto}</Text>
            <Text style={styles.meta}>{formatoFecha(c.Fecha)}</Text>
          </View>
        ))}
        <Campo value={comentario} onChangeText={setComentario} placeholder="Escribe un comentario…" multiline />
        <Boton titulo="Enviar comentario" onPress={comentar} cargando={enviando} />
      </Tarjeta>

      <Modal visible={!!imagenGrande} transparent animationType="fade" onRequestClose={() => setImagenGrande(null)}>
        <Pressable style={styles.modal} onPress={() => setImagenGrande(null)}>
          {imagenGrande && <Image source={{ uri: imagenUrl(imagenGrande) }} style={{ width: '100%', height: '80%' }} resizeMode="contain" />}
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  folio: { color: COLORES.muted, fontWeight: '700', fontSize: 13 },
  titulo: { fontSize: 20, fontWeight: '800', color: COLORES.texto, marginVertical: 6 },
  texto: { color: COLORES.texto, fontSize: 15, lineHeight: 21, marginTop: 6 },
  meta: { color: COLORES.muted, fontSize: 12, marginTop: 4 },
  link: { color: COLORES.azulClaro, marginTop: 8, fontWeight: '600' },
  pasos: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 16 },
  paso: { alignItems: 'center', flex: 1 },
  circulo: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: COLORES.borde, backgroundColor: '#fff', marginBottom: 4 },
  pasoTexto: { fontSize: 10, color: COLORES.muted, textAlign: 'center' },
  foto: { width: 120, height: 120, borderRadius: 10, marginRight: 8 },
  mapa: { height: 200, borderRadius: 12 },
  evento: { borderLeftWidth: 4, paddingLeft: 10, marginBottom: 12 },
  comentario: { backgroundColor: COLORES.fondo, padding: 10, borderRadius: 10, marginBottom: 8 },
  comentarioPropio: { backgroundColor: '#EFF6FF' },
  modal: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
});
