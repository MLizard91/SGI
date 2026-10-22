// Mapa de OpenStreetMap (Leaflet en un WebView) con varias incidencias, igual que el panel web.
//
// Props:
//   puntos    [{ IdIncidencia, Folio, Titulo, Latitud, Longitud, Prioridad, Area, Estatus, ColorArea, ColorEstatus }]
//   colorPor  'area' | 'estatus'
//   onAbrir   (idIncidencia) => void  -> al tocar "Ver detalle" en el globo del punto
//   altura    número de píxeles (o undefined para ocupar el espacio disponible con flex)
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { CENTRO_MEXTICACAN, COLORES } from '../config';

const HTML = `<!DOCTYPE html>
<html><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
  html, body, #mapa { margin: 0; height: 100%; background: #e5e7eb; font-family: -apple-system, Roboto, sans-serif; }
  .globo strong { color: ${COLORES.guinda}; }
  .globo button { margin-top: 8px; width: 100%; padding: 8px; border: 0; border-radius: 8px;
                  background: ${COLORES.guinda}; color: #fff; font-weight: 700; font-size: 14px; }
</style>
</head><body><div id="mapa"></div>
<script>
  var enviar = function (d) { window.ReactNativeWebView.postMessage(JSON.stringify(d)); };
  var mapa = L.map('mapa').setView([${CENTRO_MEXTICACAN.latitude}, ${CENTRO_MEXTICACAN.longitude}], 14);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap' }).addTo(mapa);
  var capa = L.layerGroup().addTo(mapa);
  var esc = function (t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };

  window.abrir = function (id) { enviar({ tipo: 'abrir', id: id }); };
  window.pintar = function (puntos, colorPor, ajustar) {
    capa.clearLayers();
    var limites = [];
    puntos.forEach(function (p) {
      var lat = Number(p.Latitud), lng = Number(p.Longitud);
      limites.push([lat, lng]);
      L.circleMarker([lat, lng], {
        radius: p.Prioridad === 'Urgente' ? 11 : 8, color: '#fff', weight: 2,
        fillColor: colorPor === 'estatus' ? p.ColorEstatus : p.ColorArea, fillOpacity: 0.9
      }).bindPopup('<div class="globo"><strong>' + esc(p.Folio) + '</strong> · ' + esc(p.Area) + '<br>' + esc(p.Titulo) +
                   '<br>Estatus: ' + esc(p.Estatus) + ' · ' + esc(p.Prioridad) +
                   '<button onclick="abrir(' + Number(p.IdIncidencia) + ')">Ver detalle</button></div>')
        .addTo(capa);
    });
    if (ajustar && limites.length === 1) mapa.setView(limites[0], 16);
    else if (ajustar && limites.length > 1) mapa.fitBounds(limites, { padding: [30, 30], maxZoom: 16 });
  };
  enviar({ tipo: 'listo' });
</script></body></html>`;

export default function MapaIncidencias({ puntos, colorPor = 'area', onAbrir, altura }) {
  const web = useRef(null);
  const [listo, setListo] = useState(false);
  const ajustado = useRef(false);

  useEffect(() => {
    if (!listo) return;
    // Solo encuadramos la primera vez que hay puntos, para no mover el mapa en cada actualización en vivo
    const ajustar = !ajustado.current && puntos.length > 0;
    if (ajustar) ajustado.current = true;
    web.current?.injectJavaScript(`window.pintar(${JSON.stringify(puntos)}, '${colorPor}', ${ajustar}); true;`);
  }, [listo, puntos, colorPor]);

  function alRecibir(e) {
    const d = JSON.parse(e.nativeEvent.data);
    if (d.tipo === 'listo') setListo(true);
    if (d.tipo === 'abrir') onAbrir?.(d.id);
  }

  return (
    <View style={[styles.contenedor, altura ? { height: altura } : { flex: 1 }]}>
      <WebView
        ref={web}
        originWhitelist={['*']}
        source={{ html: HTML, baseUrl: 'https://localhost/' }}
        onMessage={alRecibir}
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
