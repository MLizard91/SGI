// Detalle de una incidencia para el personal: atender, asignar, priorizar, evidencias y comentarios
// (mismas acciones y permisos que el panel web).
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Image, KeyboardAvoidingView, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { api, formatoFecha, imagenUrl } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useSocketEvent } from '../../context/SocketContext';
import useCatalogos from '../../hooks/useCatalogos';
import { Boton, Campo, EstatusBadge, PrioridadBadge, Selector, Tarjeta, Titulo } from '../../components/UI';
import MapaOSM from '../../components/MapaOSM';
import { ROLES, puedeGestionar } from '../../roles';
import { COLORES } from '../../config';

const MAX_EVIDENCIAS = 5;

export default function GestionIncidencia() {
  const { id } = useLocalSearchParams();
  const { usuario } = useAuth();
  const catalogos = useCatalogos();
  const gestiona = puedeGestionar(usuario);

  const [inc, setInc] = useState(null);
  const [error, setError] = useState('');
  const [personal, setPersonal] = useState([]);
  const [estatus, setEstatus] = useState('');
  const [nota, setNota] = useState('');
  const [comentario, setComentario] = useState('');
  const [interno, setInterno] = useState(false);
  const [ocupado, setOcupado] = useState(''); // qué acción está en curso
  const [imagenGrande, setImagenGrande] = useState(null);

  const cargar = useCallback(() => {
    api(`/incidencias/${id}`)
      .then((d) => { setInc(d); setError(''); })
      .catch((e) => setError(e.message));
  }, [id]);

  useEffect(cargar, [cargar]);

  useEffect(() => {
    if (inc && gestiona) api(`/usuarios/personal?area=${inc.IdArea}`).then(setPersonal).catch(() => {});
  }, [inc?.IdArea, gestiona]);

  // Tiempo real: si otra persona la actualiza o comenta, recargamos
  const siEsEsta = useCallback((d) => String(d.IdIncidencia) === String(id) && cargar(), [id, cargar]);
  useSocketEvent('incidencia:actualizada', siEsEsta);
  useSocketEvent('incidencia:comentario', siEsEsta);

  async function ejecutar(nombre, accion, exito) {
    setOcupado(nombre);
    try {
      await accion();
      cargar();
      if (exito) Alert.alert('Listo', exito);
    } catch (e) {
      Alert.alert('No se pudo completar', e.message);
    } finally {
      setOcupado('');
    }
  }

  function actualizarEstatus() {
    const nombre = catalogos?.estatus.find((e) => e.IdEstatus === Number(estatus))?.Nombre;
    const enviar = () =>
      ejecutar('estatus', async () => {
        await api(`/incidencias/${id}/estatus`, { method: 'PATCH', body: { idEstatus: Number(estatus), comentario: nota.trim() } });
        setEstatus('');
        setNota('');
      }, `La incidencia ahora está: ${nombre}. Se notificó al ciudadano.`);
    // Rechazar es definitivo para el ciudadano: pedimos confirmación
    if (nombre === 'Rechazada') {
      Alert.alert('Rechazar incidencia', '¿Seguro que deseas rechazar este reporte?', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Rechazar', style: 'destructive', onPress: enviar },
      ]);
    } else enviar();
  }

  async function subirEvidencias(origen) {
    const permiso = origen === 'camara'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permiso.granted) return Alert.alert('Permiso requerido', 'Activa el permiso en la configuración del teléfono');

    const opciones = { mediaTypes: ['images'], quality: 0.6 };
    const r = origen === 'camara'
      ? await ImagePicker.launchCameraAsync(opciones)
      : await ImagePicker.launchImageLibraryAsync({ ...opciones, allowsMultipleSelection: true, selectionLimit: MAX_EVIDENCIAS });
    if (r.canceled) return;

    const fd = new FormData();
    r.assets.slice(0, MAX_EVIDENCIAS).forEach((f, i) => {
      // En React Native los archivos se envían como { uri, name, type }
      fd.append('imagenes', { uri: f.uri, name: f.fileName || `evidencia_${i + 1}.jpg`, type: f.mimeType || 'image/jpeg' });
    });
    ejecutar('evidencias', () => api(`/incidencias/${id}/evidencias`, { method: 'POST', formData: fd }), 'Evidencias guardadas');
  }

  if (error && !inc) return <Text style={[styles.error, { margin: 16 }]}>{error}</Text>;
  if (!inc) return <ActivityIndicator style={{ marginTop: 40 }} size="large" color={COLORES.guinda} />;

  const opcionesEstatus = (catalogos?.estatus || [])
    .filter((e) => e.IdEstatus !== inc.IdEstatus && (usuario.Rol !== ROLES.OPERATIVO || [4, 5].includes(e.IdEstatus)))
    .map((e) => ({ valor: e.IdEstatus, texto: e.Nombre }));
  const fotos = inc.imagenes.filter((i) => i.Tipo === 'Reporte');
  const evidencias = inc.imagenes.filter((i) => i.Tipo === 'Evidencia');
  const coordenada = { latitude: Number(inc.Latitud), longitude: Number(inc.Longitud) };

  const Galeria = ({ imagenes }) => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      {imagenes.map((im) => (
        <Pressable key={im.IdImagen} onPress={() => setImagenGrande(im.Ruta)}>
          <Image source={{ uri: imagenUrl(im.Ruta) }} style={styles.foto} />
        </Pressable>
      ))}
    </ScrollView>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <Stack.Screen options={{ title: inc.Folio }} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      >
        {/* Resumen */}
        <Tarjeta>
          <Text style={styles.folio}>{inc.Folio} · {inc.Area} › {inc.Categoria}</Text>
          <Text style={styles.titulo}>{inc.Titulo}</Text>
          <View style={styles.badges}>
            <EstatusBadge nombre={inc.Estatus} color={inc.ColorEstatus} />
            <PrioridadBadge prioridad={inc.Prioridad} />
          </View>
          <Text style={styles.texto}>{inc.Descripcion}</Text>
          <View style={styles.datos}>
            <Dato etiqueta="Reportó" valor={inc.Ciudadano} />
            <Dato etiqueta="Fecha" valor={formatoFecha(inc.FechaCreacion)} />
            <Dato etiqueta="Dirección" valor={`${inc.Direccion || '—'}${inc.Comunidad ? ` (${inc.Comunidad})` : ''}`} />
            <Dato etiqueta="Asignado a" valor={inc.Asignado || 'Sin asignar'} />
            {inc.FechaResolucion && <Dato etiqueta="Resuelta" valor={formatoFecha(inc.FechaResolucion)} />}
          </View>
        </Tarjeta>

        {/* Atender */}
        <Tarjeta>
          <Titulo>Atender incidencia</Titulo>
          <Selector etiqueta="Cambiar estatus" valor={estatus} onCambiar={setEstatus} opciones={opcionesEstatus} />
          <Campo etiqueta="Nota para el ciudadano (opcional)" value={nota} onChangeText={setNota} placeholder="Ej. La cuadrilla acudirá mañana" />
          <Boton titulo="Actualizar estatus" onPress={actualizarEstatus} deshabilitado={!estatus} cargando={ocupado === 'estatus'} />

          {gestiona && (
            <>
              <View style={styles.separador} />
              <Selector
                etiqueta="Asignar a"
                valor={inc.IdAsignado || ''}
                placeholder="Selecciona personal…"
                deshabilitado={!!ocupado}
                opciones={personal.map((p) => ({ valor: p.IdUsuario, texto: `${p.Nombre}${p.Apellidos ? ` ${p.Apellidos}` : ''} (${p.Rol})` }))}
                onCambiar={(v) =>
                  v !== inc.IdAsignado &&
                  ejecutar('asignar', () => api(`/incidencias/${id}/asignar`, { method: 'PATCH', body: { idAsignado: Number(v) } }), 'Incidencia asignada')
                }
              />
              {personal.length === 0 && <Text style={styles.meta}>No hay personal activo en esta área.</Text>}
              <Selector
                etiqueta="Prioridad"
                valor={inc.Prioridad}
                deshabilitado={!!ocupado}
                opciones={(catalogos?.prioridades || []).map((p) => ({ valor: p, texto: p }))}
                onCambiar={(v) =>
                  v !== inc.Prioridad &&
                  ejecutar('prioridad', () => api(`/incidencias/${id}/prioridad`, { method: 'PATCH', body: { prioridad: v } }))
                }
              />
            </>
          )}

          <View style={styles.separador} />
          <Text style={styles.etiqueta}>Evidencias del trabajo realizado</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Boton titulo="📷 Cámara" variante="secundario" estilo={{ flex: 1 }} onPress={() => subirEvidencias('camara')}
              cargando={ocupado === 'evidencias'} deshabilitado={!!ocupado} />
            <Boton titulo="🖼️ Galería" variante="secundario" estilo={{ flex: 1 }} onPress={() => subirEvidencias('galeria')}
              deshabilitado={!!ocupado} />
          </View>
        </Tarjeta>

        {/* Fotos */}
        <Tarjeta>
          <Titulo>Fotografías del reporte</Titulo>
          <Galeria imagenes={fotos} />
          {evidencias.length > 0 && (
            <>
              <Text style={[styles.etiqueta, { marginTop: 12 }]}>Evidencias de atención</Text>
              <Galeria imagenes={evidencias} />
            </>
          )}
        </Tarjeta>

        {/* Ubicación */}
        <Tarjeta>
          <Titulo>Ubicación</Titulo>
          <MapaOSM punto={coordenada} color={inc.ColorArea} altura={200} />
          <Text style={styles.meta}>
            {inc.Latitud}, {inc.Longitud}{inc.PrecisionMetros ? ` (±${Math.round(inc.PrecisionMetros)} m)` : ''}
          </Text>
          <Pressable onPress={() => Linking.openURL(`https://www.google.com/maps?q=${coordenada.latitude},${coordenada.longitude}`)}>
            <Text style={styles.link}>Abrir en Google Maps (cómo llegar)</Text>
          </Pressable>
        </Tarjeta>

        {/* Comentarios */}
        <Tarjeta>
          <Titulo>Comentarios</Titulo>
          {inc.comentarios.length === 0 && <Text style={styles.meta}>Sin comentarios</Text>}
          {inc.comentarios.map((c) => (
            <View
              key={c.IdComentario}
              style={[styles.comentario, c.Rol === ROLES.CIUDADANO && styles.comentarioCiudadano, c.EsInterno && styles.comentarioInterno]}
            >
              <Text style={{ fontWeight: '700', color: COLORES.texto }}>
                {c.Usuario} <Text style={styles.meta}>{c.Rol}{c.EsInterno ? ' · interno' : ''}</Text>
              </Text>
              <Text style={styles.texto}>{c.Texto}</Text>
              <Text style={styles.meta}>{formatoFecha(c.Fecha)}</Text>
            </View>
          ))}
          <Campo value={comentario} onChangeText={setComentario} placeholder="Escribe un comentario…" multiline />
          <View style={styles.interruptor}>
            <Text style={{ color: COLORES.texto, flex: 1 }}>Comentario interno (no lo ve el ciudadano)</Text>
            <Switch value={interno} onValueChange={setInterno} trackColor={{ true: COLORES.guindaClaro }} />
          </View>
          <Boton
            titulo="Enviar comentario"
            deshabilitado={!comentario.trim()}
            cargando={ocupado === 'comentario'}
            onPress={() =>
              ejecutar('comentario', async () => {
                await api(`/incidencias/${id}/comentarios`, { method: 'POST', body: { texto: comentario.trim(), esInterno: interno } });
                setComentario('');
              })
            }
          />
        </Tarjeta>

        {/* Historial */}
        <Tarjeta>
          <Titulo>Historial</Titulo>
          {inc.historial.map((h) => (
            <View key={h.IdHistorial} style={[styles.evento, { borderLeftColor: h.ColorEstatusNuevo || COLORES.borde }]}>
              <Text style={{ fontWeight: '700', color: COLORES.texto }}>
                {h.Accion === 'CambioEstatus' ? `Estatus: ${h.EstatusNuevo}` : h.Accion === 'Creación' ? 'Reporte creado' : h.Accion}
              </Text>
              {h.Detalle ? <Text style={styles.texto}>{h.Detalle}</Text> : null}
              <Text style={styles.meta}>{h.Usuario || 'Sistema'} · {formatoFecha(h.Fecha)}</Text>
            </View>
          ))}
        </Tarjeta>
      </ScrollView>

      <Modal visible={!!imagenGrande} transparent animationType="fade" onRequestClose={() => setImagenGrande(null)}>
        <Pressable style={styles.modal} onPress={() => setImagenGrande(null)}>
          {imagenGrande && <Image source={{ uri: imagenUrl(imagenGrande) }} style={{ width: '100%', height: '80%' }} resizeMode="contain" />}
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

function Dato({ etiqueta, valor }) {
  return (
    <View style={styles.dato}>
      <Text style={styles.datoEtiqueta}>{etiqueta}</Text>
      <Text style={styles.datoValor}>{valor}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  folio: { color: COLORES.muted, fontWeight: '700', fontSize: 12 },
  titulo: { fontSize: 20, fontWeight: '800', color: COLORES.texto, marginVertical: 6 },
  badges: { flexDirection: 'row', gap: 6 },
  texto: { color: COLORES.texto, fontSize: 15, lineHeight: 21, marginTop: 6 },
  meta: { color: COLORES.muted, fontSize: 12, marginTop: 4 },
  etiqueta: { color: COLORES.muted, marginBottom: 6, fontSize: 13 },
  link: { color: COLORES.guindaClaro, marginTop: 8, fontWeight: '600' },
  error: { color: COLORES.rojo, backgroundColor: '#FEF2F2', padding: 10, borderRadius: 8 },
  datos: { marginTop: 12, borderTopWidth: 1, borderTopColor: COLORES.fondo, paddingTop: 8 },
  dato: { flexDirection: 'row', paddingVertical: 5 },
  datoEtiqueta: { width: 92, color: COLORES.muted, fontSize: 13 },
  datoValor: { flex: 1, color: COLORES.texto, fontSize: 14 },
  separador: { height: 1, backgroundColor: COLORES.borde, marginVertical: 16 },
  foto: { width: 120, height: 120, borderRadius: 10, marginRight: 8 },
  comentario: { backgroundColor: COLORES.fondo, padding: 10, borderRadius: 10, marginBottom: 8 },
  comentarioCiudadano: { backgroundColor: '#EFF6FF' },
  comentarioInterno: { backgroundColor: '#FEF3C7' },
  interruptor: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  evento: { borderLeftWidth: 4, paddingLeft: 10, marginBottom: 12 },
  modal: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
});
