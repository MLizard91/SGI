import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, formatoFecha, imagenUrl } from '../api';
import { useSocketEvent } from '../context/SocketContext';
import useCatalogos from '../components/useCatalogos';
import { EstatusBadge, PrioridadBadge } from '../components/Badges';

const LIMITE = 15;

export default function Incidencias() {
  const catalogos = useCatalogos();
  const [filtros, setFiltros] = useState({ estatus: '', area: '', prioridad: '', buscar: '', desde: '', hasta: '' });
  const [pagina, setPagina] = useState(1);
  const [resultado, setResultado] = useState({ datos: [], total: 0 });
  const [nuevas, setNuevas] = useState(0);

  const cargar = useCallback(() => {
    const params = new URLSearchParams({ pagina, limite: LIMITE });
    Object.entries(filtros).forEach(([k, v]) => v && params.set(k, v));
    api(`/incidencias?${params}`).then(setResultado);
    setNuevas(0);
  }, [filtros, pagina]);

  useEffect(cargar, [cargar]);

  // Tiempo real: avisar de reportes nuevos y actualizar filas que cambian
  useSocketEvent('incidencia:nueva', useCallback(() => setNuevas((n) => n + 1), []));
  useSocketEvent(
    'incidencia:actualizada',
    useCallback((inc) => {
      setResultado((r) => ({ ...r, datos: r.datos.map((d) => (d.IdIncidencia === inc.IdIncidencia ? inc : d)) }));
    }, [])
  );

  const cambiar = (campo) => (e) => {
    setPagina(1);
    setFiltros({ ...filtros, [campo]: e.target.value });
  };
  const paginas = Math.max(1, Math.ceil(resultado.total / LIMITE));

  return (
    <>
      <div className="encabezado">
        <h2>Incidencias</h2>
        <span className="muted">{resultado.total} resultado(s)</span>
      </div>

      <div className="tarjeta filtros">
        <input placeholder="Buscar folio, título, dirección…" value={filtros.buscar} onChange={cambiar('buscar')} />
        <select value={filtros.area} onChange={cambiar('area')}>
          <option value="">Todas las áreas</option>
          {catalogos?.areas.map((a) => <option key={a.IdArea} value={a.IdArea}>{a.Nombre}</option>)}
        </select>
        <select value={filtros.estatus} onChange={cambiar('estatus')}>
          <option value="">Todos los estatus</option>
          {catalogos?.estatus.map((e) => <option key={e.IdEstatus} value={e.IdEstatus}>{e.Nombre}</option>)}
        </select>
        <select value={filtros.prioridad} onChange={cambiar('prioridad')}>
          <option value="">Todas las prioridades</option>
          {catalogos?.prioridades.map((p) => <option key={p}>{p}</option>)}
        </select>
        <input type="date" value={filtros.desde} onChange={cambiar('desde')} title="Desde" />
        <input type="date" value={filtros.hasta} onChange={cambiar('hasta')} title="Hasta" />
      </div>

      {nuevas > 0 && (
        <button className="aviso-nuevas" onClick={cargar}>
          🔔 {nuevas} reporte(s) nuevo(s) — clic para actualizar
        </button>
      )}

      <div className="tarjeta tabla-contenedor">
        <table>
          <thead>
            <tr>
              <th></th><th>Folio</th><th>Incidencia</th><th>Área</th><th>Estatus</th><th>Prioridad</th><th>Asignado</th><th>Fecha</th>
            </tr>
          </thead>
          <tbody>
            {resultado.datos.map((i) => (
              <tr key={i.IdIncidencia}>
                <td>{i.ImagenPrincipal && <img className="miniatura" src={imagenUrl(i.ImagenPrincipal)} alt="" />}</td>
                <td><Link to={`/incidencias/${i.IdIncidencia}`}><strong>{i.Folio}</strong></Link></td>
                <td>
                  <Link to={`/incidencias/${i.IdIncidencia}`}>{i.Titulo}</Link>
                  <small className="bloque muted">{i.Categoria}{i.Comunidad ? ` · ${i.Comunidad}` : ''}</small>
                </td>
                <td><span className="punto" style={{ background: i.ColorArea }} />{i.Area}</td>
                <td><EstatusBadge nombre={i.Estatus} color={i.ColorEstatus} /></td>
                <td><PrioridadBadge prioridad={i.Prioridad} /></td>
                <td>{i.Asignado || <span className="muted">Sin asignar</span>}</td>
                <td><small>{formatoFecha(i.FechaCreacion)}</small></td>
              </tr>
            ))}
            {resultado.datos.length === 0 && (
              <tr><td colSpan="8" className="vacio">No hay incidencias con esos filtros</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="paginacion">
        <button className="btn secundario" disabled={pagina <= 1} onClick={() => setPagina(pagina - 1)}>← Anterior</button>
        <span>Página {pagina} de {paginas}</span>
        <button className="btn secundario" disabled={pagina >= paginas} onClick={() => setPagina(pagina + 1)}>Siguiente →</button>
      </div>
    </>
  );
}
