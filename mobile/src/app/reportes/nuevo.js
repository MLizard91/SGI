import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { api } from '../../api';
import { Boton, Campo, Chip, Tarjeta, Titulo } from '../../components/UI';
import MapaOSM from '../../components/MapaOSM';
import { COLORES } from '../../config';
import { useAuth } from '../../context/AuthContext';
import { esPersonal } from '../../roles';

const MAX_FOTOS = 5;

export default function NuevoReporte() {
  const { usuario } = useAuth();
  const [catalogos, setCatalogos] = useState(null);
  const [idArea, setIdArea] = useState(null);
  const [idCategoria, setIdCategoria] = useState(null);
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [fotos, setFotos] = useState([]);
  const [ubicacion, setUbicacion] = useState(null); // { latitude, longitude, accuracy }
  const [direccion, setDireccion] = useState('');
  const [comunidad, setComunidad] = useState('');
  const [estadoGps, setEstadoGps] = useState('Buscando tu ubicación…');
  const [enviando, setEnviando] = useState(false);
  const ajusteManual = useRef(false);
  const [seguirGps, setSeguirGps] = useState(true); // centrar el mapa en cada lectura del GPS

  useEffect(() => {
    api('/catalogos').then(setCatalogos).catch((e) => Alert.alert('Error', e.message));
  }, []);

  // GPS en tiempo real: seguimos la posición mientras el usuario llena el formulario,
  // hasta que él mueva el marcador manualmente.
  useEffect(() => {
    let suscripcion;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setEstadoGps('Sin permiso de ubicación. Toca el mapa para marcar el lugar.');
        return;
      }
      suscripcion = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 3000, distanceInterval: 3 },
        (pos) => {
          if (ajusteManual.current) return;
          const punto = { latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy };
          setUbicacion(punto);
          setEstadoGps(`Ubicación GPS (precisión ±${Math.round(pos.coords.accuracy || 0)} m)`);
        }
      );
    })();
    return () => suscripcion?.remove();
  }, []);

  // Obtener la dirección aproximada del punto seleccionado
  useEffect(() => {
    if (!ubicacion) return;
    const t = setTimeout(async () => {
      try {
        const [d] = await Location.reverseGeocodeAsync(ubicacion);
        if (d) {
          setDireccion([d.street, d.streetNumber].filter(Boolean).join(' ') || d.name || '');
          setComunidad(d.district || d.subregion || d.city || '');
        }
      } catch {
        // si falla la geocodificación el usuario puede escribir la dirección
      }
    }, 800);
    return () => clearTimeout(t);
  }, [ubicacion?.latitude, ubicacion?.longitude]);

  function marcarManual(coordinate) {
    ajusteManual.current = true;
    setSeguirGps(false);
    setUbicacion({ ...coordinate, accuracy: null });
    setEstadoGps('Ubicación ajustada manualmente');
  }

  async function usarGpsDeNuevo() {
    ajusteManual.current = false;
    setSeguirGps(true);
    setEstadoGps('Buscando tu ubicación…');
    try {
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const punto = { latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy };
      setUbicacion(punto);
      setEstadoGps(`Ubicación GPS (precisión ±${Math.round(pos.coords.accuracy || 0)} m)`);
    } catch {
      setEstadoGps('No se pudo obtener el GPS. Toca el mapa para marcar el lugar.');
    }
  }

  async function agregarFotos(origen) {
    const restantes = MAX_FOTOS - fotos.length;
    if (restantes <= 0) return Alert.alert('Límite', `Máximo ${MAX_FOTOS} fotografías`);

    const permiso = origen === 'camara'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permiso.granted) return Alert.alert('Permiso requerido', 'Activa el permiso en la configuración del teléfono');

    const opciones = { mediaTypes: ['images'], quality: 0.6 }; // quality comprime la imagen para subirla más rápido
    const resultado = origen === 'camara'
      ? await ImagePicker.launchCameraAsync(opciones)
      : await ImagePicker.launchImageLibraryAsync({ ...opciones, allowsMultipleSelection: true, selectionLimit: restantes });

    if (!resultado.canceled) setFotos((prev) => [...prev, ...resultado.assets].slice(0, MAX_FOTOS));
  }

  async function enviar() {
    if (!idCategoria) return Alert.alert('Falta información', 'Selecciona el área y el tipo de incidencia');
    if (!titulo.trim() || !descripcion.trim()) return Alert.alert('Falta información', 'Escribe un título y una descripción');
    if (!fotos.length) return Alert.alert('Falta información', 'Agrega al menos una fotografía');
    if (!ubicacion) return Alert.alert('Falta información', 'Indica la ubicación en el mapa');

    const fd = new FormData();
    fd.append('titulo', titulo.trim());
    fd.append('descripcion', descripcion.trim());
    fd.append('idCategoria', String(idCategoria));
    fd.append('latitud', String(ubicacion.latitude));
    fd.append('longitud', String(ubicacion.longitude));
    if (ubicacion.accuracy) fd.append('precision', String(ubicacion.accuracy));
    if (direccion) fd.append('direccion', direccion);
    if (comunidad) fd.append('comunidad', comunidad);
    fotos.forEach((f, i) => {
      const tipo = f.mimeType || 'image/jpeg';
      // En React Native los archivos se envían como { uri, name, type }
      fd.append('imagenes', { uri: f.uri, name: f.fileName || `foto_${i + 1}.jpg`, type: tipo });
    });

    setEnviando(true);
    try {
      const inc = await api('/incidencias', { method: 'POST', formData: fd });
      if (esPersonal(usuario)) {
        Alert.alert('Reporte registrado', `Folio ${inc.Folio}. Ya puedes asignarlo y darle seguimiento.`);
        router.replace(`/gestion/${inc.IdIncidencia}`);
      } else {
        Alert.alert('¡Reporte enviado!', `Tu folio es ${inc.Folio}. Te avisaremos cuando cambie de estatus.`);
        router.replace(`/reportes/${inc.IdIncidencia}`);
      }
    } catch (e) {
      Alert.alert('No se pudo enviar', e.message);
    } finally {
      setEnviando(false);
    }
  }

  if (!catalogos) return <ActivityIndicator style={{ marginTop: 40 }} size="large" color={COLORES.guinda} />;
  const area = catalogos.areas.find((a) => a.IdArea === idArea);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      >
      <Tarjeta>
        <Titulo>1. ¿Qué tipo de problema es?</Titulo>
        <View style={styles.chips}>
          {catalogos.areas.map((a) => (
            <Chip key={a.IdArea} texto={a.Nombre} color={a.Color} activo={a.IdArea === idArea}
              onPress={() => { setIdArea(a.IdArea); setIdCategoria(null); }} />
          ))}
        </View>
        {area && (
          <>
            <Text style={styles.sub}>Tipo de incidencia</Text>
            <View style={styles.chips}>
              {area.Categorias.map((c) => (
                <Chip key={c.IdCategoria} texto={c.Nombre} color={area.Color} activo={c.IdCategoria === idCategoria}
                  onPress={() => { setIdCategoria(c.IdCategoria); if (!titulo) setTitulo(c.Nombre); }} />
              ))}
            </View>
          </>
        )}
      </Tarjeta>

      <Tarjeta>
        <Titulo>2. Describe la incidencia</Titulo>
        <Campo etiqueta="Título" value={titulo} onChangeText={setTitulo} maxLength={150} placeholder="Ej. Lámpara apagada frente a la plaza" />
        <Campo etiqueta="Descripción" value={descripcion} onChangeText={setDescripcion} multiline placeholder="Detalles que ayuden al personal a atenderla" />
      </Tarjeta>

      <Tarjeta>
        <Titulo>3. Fotografías ({fotos.length}/{MAX_FOTOS})</Titulo>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {fotos.map((f, i) => (
            <View key={f.uri} style={{ marginRight: 8 }}>
              <Image source={{ uri: f.uri }} style={styles.foto} />
              <Pressable style={styles.quitar} onPress={() => setFotos(fotos.filter((_, j) => j !== i))}>
                <Text style={{ color: '#fff', fontWeight: '800' }}>✕</Text>
              </Pressable>
            </View>
          ))}
        </ScrollView>
        <View style={styles.filaBotones}>
          <Boton titulo="📷 Tomar foto" variante="secundario" onPress={() => agregarFotos('camara')} estilo={{ flex: 1 }} />
          <Boton titulo="🖼️ Galería" variante="secundario" onPress={() => agregarFotos('galeria')} estilo={{ flex: 1 }} />
        </View>
      </Tarjeta>

      <Tarjeta>
        <Titulo>4. Ubicación</Titulo>
        <Text style={styles.sub}>{estadoGps}</Text>
        <MapaOSM
          punto={ubicacion}
          centrar={seguirGps}
          color={area?.Color || COLORES.rojo}
          interactivo
          onCambiar={marcarManual}
          altura={260}
        />
        <Text style={styles.ayuda}>Toca el mapa o arrastra el marcador si el punto no es exacto.</Text>
        <Boton titulo="📍 Usar mi ubicación actual" variante="secundario" onPress={usarGpsDeNuevo} estilo={{ marginBottom: 14 }} />
        <Campo etiqueta="Dirección / referencia" value={direccion} onChangeText={setDireccion} placeholder="Calle, número, entre calles…" />
        <Campo etiqueta="Comunidad / colonia" value={comunidad} onChangeText={setComunidad} />
      </Tarjeta>

      <Boton titulo="Enviar reporte" onPress={enviar} cargando={enviando} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap' },
  sub: { color: COLORES.muted, marginBottom: 8, marginTop: 4 },
  foto: { width: 96, height: 96, borderRadius: 10 },
  quitar: {
    position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.6)', width: 24, height: 24,
    borderRadius: 12, alignItems: 'center', justifyContent: 'center',
  },
  filaBotones: { flexDirection: 'row', gap: 10, marginTop: 12 },
  ayuda: { color: COLORES.muted, fontSize: 12, marginTop: 8, marginBottom: 12 },
});
