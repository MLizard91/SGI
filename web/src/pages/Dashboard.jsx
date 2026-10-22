import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, descargar, formatoFecha } from '../api';
import { useSocketEvent } from '../context/SocketContext';
import MapaIncidencias from '../components/MapaIncidencias';
import { EstatusBadge, PrioridadBadge } from '../components/Badges';
import ReportePdf from '../components/ReportePdf';
import { useAuth } from '../context/AuthContext';

function Barras({ filas, etiqueta, valor, color }) {
  const max = Math.max(1, ...filas.map(valor));
  return (
    <div className="barras">
      {filas.map((f, i) => (
        <div className="barra-fila" key={i}>
          <span className="barra-etiqueta">{etiqueta(f)}</span>
          <div className="barra-pista">
            <div className="barra" style={{ width: `${(valor(f) / max) * 100}%`, background: color(f) }} />
          </div>
          <span className="barra-valor">{valor(f)}</span>
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const { usuario } = useAuth();
  const [resumen, setResumen] = useState(null);
  const [abiertas, setAbiertas] = useState([]);
  const [recientes, setRecientes] = useState([]);

  const cargar = useCallback(() => {
    api('/reportes/resumen').then(setResumen);
    api('/incidencias/mapa?abiertas=1').then(setAbiertas);
    api('/incidencias?limite=8').then((r) => setRecientes(r.datos));
  }, []);

  useEffect(cargar, [cargar]);
  // Cuando llega o cambia una incidencia, refrescamos los indicadores
  useSocketEvent('incidencia:nueva', cargar);
  useSocketEvent('incidencia:actualizada', cargar);

  if (!resumen) return <p>Cargando…</p>;
  const t = resumen.totales;

  return (
    <>
      <div className="encabezado">
        <h2>Dashboard</h2>
        <button className="btn secundario" onClick={() => descargar('/reportes/exportar', 'incidencias.csv')}>
          ⬇ Exportar CSV
        </button>
      </div>

      <div className="kpis">
        <div className="kpi"><span>Total (12 meses)</span><strong>{t.Total}</strong></div>
        <div className="kpi"><span>Pendientes</span><strong>{t.Pendientes}</strong></div>
        <div className="kpi"><span>En atención</span><strong>{t.EnAtencion}</strong></div>
        <div className="kpi"><span>Resueltas</span><strong>{t.Resueltas}</strong></div>
        <div className="kpi alerta"><span>Urgentes abiertas</span><strong>{t.UrgentesAbiertas}</strong></div>
        <div className="kpi">
          <span>Tiempo prom. resolución</span>
          <strong>{t.HorasPromedioResolucion == null ? '—' : `${Number(t.HorasPromedioResolucion).toFixed(1)} h`}</strong>
        </div>
      </div>

      {usuario.Rol !== 'Operativo' && <ReportePdf />}

      <div className="grid-2">
        <section className="tarjeta">
          <h3>Incidencias por área</h3>
          <Barras filas={resumen.porArea} etiqueta={(f) => f.Nombre} valor={(f) => f.Total} color={(f) => f.Color} />
        </section>
        <section className="tarjeta">
          <h3>Incidencias por estatus</h3>
          <Barras filas={resumen.porEstatus} etiqueta={(f) => f.Nombre} valor={(f) => f.Total} color={(f) => f.Color} />
        </section>
      </div>

      <div className="grid-2">
        <section className="tarjeta">
          <h3>Incidencias abiertas en el municipio ({abiertas.length})</h3>
          <MapaIncidencias puntos={abiertas} altura={360} />
        </section>
        <section className="tarjeta">
          <h3>Reportes recientes</h3>
          <ul className="lista-recientes">
            {recientes.map((i) => (
              <li key={i.IdIncidencia}>
                <Link to={`/incidencias/${i.IdIncidencia}`}>
                  <strong>{i.Folio}</strong> {i.Titulo}
                </Link>
                <div>
                  <EstatusBadge nombre={i.Estatus} color={i.ColorEstatus} /> <PrioridadBadge prioridad={i.Prioridad} />{' '}
                  <small>{i.Area} · {formatoFecha(i.FechaCreacion)}</small>
                </div>
              </li>
            ))}
            {recientes.length === 0 && <p className="vacio">Aún no hay reportes</p>}
          </ul>
        </section>
      </div>
    </>
  );
}
