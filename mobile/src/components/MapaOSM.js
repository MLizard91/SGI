// Mapa de OpenStreetMap (Leaflet) dentro de un WebView.
// No requiere API key de Google y se ve igual en Android, iPhone y en el panel web.
//
// Props:
//   punto       { latitude, longitude } | null  -> posición del marcador
//   centrar     boolean  -> mover la vista hacia el punto cuando cambia (ej. GPS)
//   color       color del marcador
//   interactivo boolean  -> permite tocar el mapa / arrastrar el marcador
//   onCambiar   (coord) => void  -> se llama cuando el usuario mueve el marcador
//   altura      número de píxeles
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { CENTRO_MEXTICACAN, COLORES } from '../config';

function crearHtml(inicio, color, interactivo) {
  return `<!DOCTYPE html>
<html><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
  html, body, #mapa { margin: 0; height: 100%; background: #e5e7eb; }
  .pin { width: 26px; height: 26px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg);
         border: 3px solid #fff; box-shadow: 0 2px 6px rgba(0,0,0,.4); }
</style>
</head><body><div id="mapa"></div>
<script>
  var enviar = function (d) { window.ReactNativeWebView.postMessage(JSON.stringify(d)); };
  var interactivo = ${interactivo ? 'true' : 'false'};
  var mapa = L.map('mapa', { zoomControl: interactivo, dragging: interactivo, scrollWheelZoom: interactivo,
                             doubleClickZoom: interactivo, touchZoom: interactivo })
              .setView([${inicio.latitude}, ${inicio.longitude}], ${inicio.zoom});
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19, attribution: '&copy; OpenStreetMap'
  }).addTo(mapa);

  var icono = function (c) {
    return L.divIcon({ className: '', html: '<div class="pin" style="background:' + c + '"></div>',
                       iconSize: [26, 26], iconAnchor: [13, 26] });
  };
  var marcador = null;
  function poner(lat, lng, c) {
    if (!marcador) {
      marcador = L.marker([lat, lng], { icon: icono(c), draggable: interactivo }).addTo(mapa);
      marcador.on('dragend', function () {
        var p = marcador.getLatLng();
        enviar({ tipo: 'cambio', latitude: p.lat, longitude: p.lng });
      });
    } else {
      marcador.setLatLng([lat, lng]);
      marcador.setIcon(icono(c));
    }
  }
  // Llamada desde React Native
  window.actualizar = function (lat, lng, c, centrar) {
    poner(lat, lng, c);
    if (centrar) mapa.setView([lat, lng], Math.max(mapa.getZoom(), 17));
  };
  if (interactivo) {
    mapa.on('click', function (e) {
      poner(e.latlng.lat, e.latlng.lng, '${color}');
      enviar({ tipo: 'cambio', latitude: e.latlng.lat, longitude: e.latlng.lng });
    });
  }
  ${inicio.conPunto ? `poner(${inicio.latitude}, ${inicio.longitude}, '${color}');` : ''}
  enviar({ tipo: 'listo' });
</script></body></html>`;
}

export default function MapaOSM({ punto, centrar = false, color = COLORES.rojo, interactivo = false, onCambiar, altura = 240 }) {
  const web = useRef(null);
  const [listo, setListo] = useState(false);

  // El HTML se genera una sola vez; después se actualiza con injectJavaScript
  const html = useMemo(() => {
    const inicio = punto
      ? { ...punto, zoom: 17, conPunto: true }
      : { ...CENTRO_MEXTICACAN, zoom: 14, conPunto: false };
    return crearHtml(inicio, color, interactivo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!listo || !punto) return;
    web.current?.injectJavaScript(
      `window.actualizar(${punto.latitude}, ${punto.longitude}, '${color}', ${centrar}); true;`
    );
  }, [listo, punto?.latitude, punto?.longitude, color, centrar]);

  function alRecibir(e) {
    const d = JSON.parse(e.nativeEvent.data);
    if (d.tipo === 'listo') setListo(true);
    if (d.tipo === 'cambio') onCambiar?.({ latitude: d.latitude, longitude: d.longitude });
  }

  return (
    <View style={[styles.contenedor, { height: altura }]}>
      <WebView
        ref={web}
        originWhitelist={['*']}
        source={{ html, baseUrl: 'https://localhost/' }}
        onMessage={alRecibir}
        scrollEnabled={false}
        nestedScrollEnabled
        javaScriptEnabled
      />
      {!listo && (
        <View style={styles.cargando}>
          <ActivityIndicator color={COLORES.guinda} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { borderRadius: 12, overflow: 'hidden', backgroundColor: '#E5E7EB' },
  cargando: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
});
