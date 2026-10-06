import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import { useSocketEvent } from '../context/SocketContext';
import useCatalogos from '../components/useCatalogos';
import MapaIncidencias from '../components/MapaIncidencias';

export default function Mapa() {
  const catalogos = useCatalogos();
  const [puntos, setPuntos] = useState([]);
  const [area, setArea] = useState('');
  const [soloAbiertas, setSoloAbiertas] = useState(true);
  const [colorPor, setColorPor] = useState('area');

  const cargar = useCallback(() => {
    const params = new URLSearchParams();
    if (area) params.set('area', area);
    if (soloAbiertas) params.set('abiertas', '1');
    api(`/incidencias/mapa?${params}`).then(setPuntos);
  }, [area, soloAbiertas]);

  useEffect(cargar, [cargar]);
  useSocketEvent('incidencia:nueva', cargar);
  useSocketEvent('incidencia:actualizada', cargar);

  const leyenda = colorPor === 'area' ? catalogos?.areas : catalogos?.estatus;

  return (
    <>
      <div className="encabezado">
        <h2>Mapa de incidencias</h2>
        <span className="muted">{puntos.length} punto(s) · se actualiza en tiempo real</span>
      </div>
      <div className="tarjeta filtros">
        <select value={area} onChange={(e) => setArea(e.target.value)}>
          <option value="">Todas las áreas</option>
          {catalogos?.areas.map((a) => <option key={a.IdArea} value={a.IdArea}>{a.Nombre}</option>)}
        </select>
        <select value={colorPor} onChange={(e) => setColorPor(e.target.value)}>
          <option value="area">Color por área</option>
          <option value="estatus">Color por estatus</option>
        </select>
        <label className="check">
          <input type="checkbox" checked={soloAbiertas} onChange={(e) => setSoloAbiertas(e.target.checked)} /> Solo abiertas
        </label>
      </div>
      <div className="tarjeta">
        <MapaIncidencias puntos={puntos} altura="calc(100vh - 290px)" colorPor={colorPor} />
        <div className="leyenda">
          {leyenda?.map((l) => (
            <span key={l.Nombre}><span className="punto" style={{ background: l.Color }} />{l.Nombre}</span>
          ))}
        </div>
      </div>
    </>
  );
}
