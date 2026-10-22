// Mapa de incidencias del municipio, actualizado en tiempo real.
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { api } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useSocketEvent } from '../../context/SocketContext';
import useCatalogos from '../../hooks/useCatalogos';
import { Chip, Selector } from '../../components/UI';
import MapaIncidencias from '../../components/MapaIncidencias';
import { eligeArea } from '../../roles';
import { COLORES } from '../../config';

export default function Mapa() {
  const { usuario } = useAuth();
  const catalogos = useCatalogos();
  const [puntos, setPuntos] = useState([]);
  const [area, setArea] = useState('');
  const [soloAbiertas, setSoloAbiertas] = useState(true);
  const [colorPor, setColorPor] = useState('area');
  const [error, setError] = useState('');

  const cargar = useCallback(() => {
    const params = new URLSearchParams();
    if (area) params.set('area', String(area));
    if (soloAbiertas) params.set('abiertas', '1');
    api(`/incidencias/mapa?${params}`)
      .then((p) => { setPuntos(p); setError(''); })
      .catch((e) => setError(e.message));
  }, [area, soloAbiertas]);

  useEffect(cargar, [cargar]);
  useSocketEvent('incidencia:nueva', cargar);
  useSocketEvent('incidencia:actualizada', cargar);

  const leyenda = colorPor === 'area' ? catalogos?.areas : catalogos?.estatus;

  return (
    <View style={{ flex: 1, padding: 12 }}>
      <View style={styles.filtros}>
        <Chip texto="Solo abiertas" activo={soloAbiertas} onPress={() => setSoloAbiertas(!soloAbiertas)} />
        <Chip texto="Color por área" activo={colorPor === 'area'} onPress={() => setColorPor('area')} />
        <Chip texto="Por estatus" activo={colorPor === 'estatus'} onPress={() => setColorPor('estatus')} />
      </View>
      {eligeArea(usuario) && (
        <Selector valor={area} onCambiar={setArea} estilo={{ marginBottom: 8 }}
          opciones={[{ valor: '', texto: 'Todas las áreas' }, ...(catalogos?.areas || []).map((a) => ({ valor: a.IdArea, texto: a.Nombre }))]} />
      )}
      <Text style={styles.conteo}>{puntos.length} punto(s) · se actualiza en tiempo real · toca un punto para ver el detalle</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <MapaIncidencias puntos={puntos} colorPor={colorPor} onAbrir={(id) => router.push(`/gestion/${id}`)} />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, marginTop: 8 }}>
        {leyenda?.map((l) => (
          <View key={l.Nombre} style={styles.leyenda}>
            <View style={[styles.punto, { backgroundColor: l.Color }]} />
            <Text style={styles.leyendaTexto}>{l.Nombre}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  filtros: { flexDirection: 'row', flexWrap: 'wrap' },
  conteo: { color: COLORES.muted, fontSize: 12, marginBottom: 8 },
  error: { color: COLORES.rojo, backgroundColor: '#FEF2F2', padding: 10, borderRadius: 8, marginBottom: 8 },
  leyenda: { flexDirection: 'row', alignItems: 'center', marginRight: 14 },
  punto: { width: 10, height: 10, borderRadius: 5, marginRight: 5 },
  leyendaTexto: { color: COLORES.texto, fontSize: 12 },
});
