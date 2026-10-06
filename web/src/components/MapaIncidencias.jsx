// Mapa con OpenStreetMap (gratuito, no requiere API key).
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from 'react-leaflet';
import { useEffect } from 'react';
import { Link } from 'react-router-dom';

// Centro aproximado de la cabecera municipal de Mexticacán, Jalisco
export const CENTRO_MEXTICACAN = [21.2667, -102.7833];

function AjustarVista({ puntos }) {
  const map = useMap();
  useEffect(() => {
    if (puntos.length === 1) map.setView([puntos[0].Latitud, puntos[0].Longitud], 16);
    else if (puntos.length > 1) map.fitBounds(puntos.map((p) => [p.Latitud, p.Longitud]), { padding: [30, 30], maxZoom: 16 });
  }, [puntos, map]);
  return null;
}

export default function MapaIncidencias({ puntos, altura = 420, colorPor = 'area' }) {
  return (
    <MapContainer center={CENTRO_MEXTICACAN} zoom={14} style={{ height: altura, width: '100%', borderRadius: 12 }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <AjustarVista puntos={puntos} />
      {puntos.map((p) => {
        const color = colorPor === 'estatus' ? p.ColorEstatus : p.ColorArea;
        return (
          <CircleMarker
            key={p.IdIncidencia}
            center={[p.Latitud, p.Longitud]}
            radius={p.Prioridad === 'Urgente' ? 11 : 8}
            pathOptions={{ color: '#fff', weight: 2, fillColor: color, fillOpacity: 0.9 }}
          >
            <Popup>
              <strong>{p.Folio}</strong> · {p.Area}
              <br />
              {p.Titulo}
              <br />
              Estatus: {p.Estatus}
              <br />
              {p.IdIncidencia && <Link to={`/incidencias/${p.IdIncidencia}`}>Ver detalle →</Link>}
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
