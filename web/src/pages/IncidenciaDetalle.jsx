import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, formatoFecha, imagenUrl } from '../api';
import { useAuth } from '../context/AuthContext';
import { useSocketEvent } from '../context/SocketContext';
import useCatalogos from '../components/useCatalogos';
import MapaIncidencias from '../components/MapaIncidencias';
import { EstatusBadge, PrioridadBadge } from '../components/Badges';

const GESTION = ['Administrador', 'Encargado de Área', 'Recepcionista'];

export default function IncidenciaDetalle() {
  const { id } = useParams();
  const { usuario } = useAuth();
  const catalogos = useCatalogos();
  const [inc, setInc] = useState(null);
  const [error, setError] = useState('');
  const [personal, setPersonal] = useState([]);
  const [estatus, setEstatus] = useState('');
  const [nota, setNota] = useState('');
  const [comentario, setComentario] = useState('');
  const [interno, setInterno] = useState(false);
  const [imagenGrande, setImagenGrande] = useState(null);
  const [ocupado, setOcupado] = useState(false);

  const puedeGestionar = GESTION.includes(usuario.Rol);

  const cargar = useCallback(() => {
    api(`/incidencias/${id}`).then(setInc).catch((e) => setError(e.message));
  }, [id]);

  useEffect(cargar, [cargar]);

  useEffect(() => {
    if (inc && puedeGestionar) api(`/usuarios/personal?area=${inc.IdArea}`).then(setPersonal);
  }, [inc?.IdArea, puedeGestionar]);

  const siEsEsta = useCallback((d) => String(d.IdIncidencia) === String(id) && cargar(), [id, cargar]);
  useSocketEvent('incidencia:actualizada', siEsEsta);
  useSocketEvent('incidencia:comentario', siEsEsta);

  async function ejecutar(accion) {
    setOcupado(true);
    setError('');
    try {
      await accion();
      cargar();
    } catch (e) {
      setError(e.message);
    } finally {
      setOcupado(false);
    }
  }

  if (error && !inc) return <p className="error">{error}</p>;
  if (!inc) return <p>Cargando…</p>;

  const opcionesEstatus = (catalogos?.estatus || []).filter(
    (e) => e.IdEstatus !== inc.IdEstatus && (usuario.Rol !== 'Operativo' || [4, 5].includes(e.IdEstatus))
  );
  const fotosReporte = inc.imagenes.filter((i) => i.Tipo === 'Reporte');
  const evidencias = inc.imagenes.filter((i) => i.Tipo === 'Evidencia');

  return (
    <>
      <div className="encabezado">
        <div>
          <Link to="/incidencias" className="muted">← Incidencias</Link>
          <h2>{inc.Folio} · {inc.Titulo}</h2>
          <EstatusBadge nombre={inc.Estatus} color={inc.ColorEstatus} /> <PrioridadBadge prioridad={inc.Prioridad} />{' '}
          <span className="muted">{inc.Area} › {inc.Categoria}</span>
        </div>
      </div>
      {error && <p className="error">{error}</p>}

      <div className="detalle">
        <div className="columna">
          <section className="tarjeta">
            <h3>Descripción</h3>
            <p className="texto">{inc.Descripcion}</p>
            <dl className="datos">
              <dt>Reportó</dt><dd>{inc.Ciudadano}</dd>
              <dt>Fecha</dt><dd>{formatoFecha(inc.FechaCreacion)}</dd>
              <dt>Dirección</dt><dd>{inc.Direccion || '—'}{inc.Comunidad ? ` (${inc.Comunidad})` : ''}</dd>
              <dt>Coordenadas</dt>
              <dd>
                {inc.Latitud}, {inc.Longitud}
                {inc.PrecisionMetros ? ` (±${Math.round(inc.PrecisionMetros)} m)` : ''} ·{' '}
                <a href={`https://www.google.com/maps?q=${inc.Latitud},${inc.Longitud}`} target="_blank" rel="noreferrer">
                  Abrir en Google Maps
                </a>
              </dd>
              <dt>Asignado a</dt><dd>{inc.Asignado || 'Sin asignar'}</dd>
              {inc.FechaResolucion && (<><dt>Resuelta</dt><dd>{formatoFecha(inc.FechaResolucion)}</dd></>)}
            </dl>
          </section>

          <section className="tarjeta">
            <h3>Fotografías del reporte</h3>
            <div className="galeria">
              {fotosReporte.map((im) => (
                <img key={im.IdImagen} src={imagenUrl(im.Ruta)} alt="" onClick={() => setImagenGrande(im.Ruta)} />
              ))}
            </div>
            {evidencias.length > 0 && (
              <>
                <h3>Evidencias de atención</h3>
                <div className="galeria">
                  {evidencias.map((im) => (
                    <img key={im.IdImagen} src={imagenUrl(im.Ruta)} alt="" onClick={() => setImagenGrande(im.Ruta)} />
                  ))}
                </div>
              </>
            )}
          </section>

          <section className="tarjeta">
            <h3>Ubicación</h3>
            <MapaIncidencias puntos={[inc]} altura={300} />
          </section>

          <section className="tarjeta">
            <h3>Historial</h3>
            <ol className="linea-tiempo">
              {inc.historial.map((h) => (
                <li key={h.IdHistorial} style={{ borderColor: h.ColorEstatusNuevo || '#94A3B8' }}>
                  <strong>{h.Accion === 'CambioEstatus' ? `Estatus: ${h.EstatusNuevo}` : h.Accion === 'Creación' ? 'Reporte creado' : h.Accion}</strong>
                  {h.Detalle && <span> — {h.Detalle}</span>}
                  <small className="bloque muted">{h.Usuario || 'Sistema'} · {formatoFecha(h.Fecha)}</small>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <div className="columna">
          <section className="tarjeta">
            <h3>Atender incidencia</h3>
            <label>
              Cambiar estatus
              <select value={estatus} onChange={(e) => setEstatus(e.target.value)}>
                <option value="">Selecciona…</option>
                {opcionesEstatus.map((e) => <option key={e.IdEstatus} value={e.IdEstatus}>{e.Nombre}</option>)}
              </select>
            </label>
            <label>
              Nota para el ciudadano (opcional)
              <input value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Ej. La cuadrilla acudirá mañana" />
            </label>
            <button
              className="btn"
              disabled={!estatus || ocupado}
              onClick={() =>
                ejecutar(async () => {
                  await api(`/incidencias/${id}/estatus`, { method: 'PATCH', body: { idEstatus: Number(estatus), comentario: nota } });
                  setEstatus('');
                  setNota('');
                })
              }
            >
              Actualizar estatus
            </button>

            {puedeGestionar && (
              <>
                <hr />
                <label>
                  Asignar a
                  <select
                    value={inc.IdAsignado || ''}
                    disabled={ocupado}
                    onChange={(e) =>
                      e.target.value &&
                      ejecutar(() => api(`/incidencias/${id}/asignar`, { method: 'PATCH', body: { idAsignado: Number(e.target.value) } }))
                    }
                  >
                    <option value="">Selecciona personal…</option>
                    {personal.map((p) => (
                      <option key={p.IdUsuario} value={p.IdUsuario}>{p.Nombre} {p.Apellidos} ({p.Rol})</option>
                    ))}
                  </select>
                </label>
                <label>
                  Prioridad
                  <select
                    value={inc.Prioridad}
                    disabled={ocupado}
                    onChange={(e) => ejecutar(() => api(`/incidencias/${id}/prioridad`, { method: 'PATCH', body: { prioridad: e.target.value } }))}
                  >
                    {catalogos?.prioridades.map((p) => <option key={p}>{p}</option>)}
                  </select>
                </label>
              </>
            )}

            <hr />
            <label>
              Subir evidencias (fotos del trabajo realizado)
              <input
                type="file"
                accept="image/*"
                multiple
                disabled={ocupado}
                onChange={(e) => {
                  const fd = new FormData();
                  [...e.target.files].slice(0, 5).forEach((f) => fd.append('imagenes', f));
                  e.target.value = '';
                  ejecutar(() => api(`/incidencias/${id}/evidencias`, { method: 'POST', formData: fd }));
                }}
              />
            </label>
          </section>

          <section className="tarjeta">
            <h3>Comentarios</h3>
            <div className="comentarios">
              {inc.comentarios.map((c) => (
                <div key={c.IdComentario} className={`comentario ${c.Rol === 'Ciudadano' ? 'ciudadano' : ''} ${c.EsInterno ? 'interno' : ''}`}>
                  <strong>{c.Usuario}</strong> <small className="muted">{c.Rol}{c.EsInterno ? ' · interno' : ''}</small>
                  <p>{c.Texto}</p>
                  <small className="muted">{formatoFecha(c.Fecha)}</small>
                </div>
              ))}
              {inc.comentarios.length === 0 && <p className="vacio">Sin comentarios</p>}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                ejecutar(async () => {
                  await api(`/incidencias/${id}/comentarios`, { method: 'POST', body: { texto: comentario, esInterno: interno } });
                  setComentario('');
                });
              }}
            >
              <textarea rows="3" value={comentario} onChange={(e) => setComentario(e.target.value)} placeholder="Escribe un comentario…" required />
              <label className="check">
                <input type="checkbox" checked={interno} onChange={(e) => setInterno(e.target.checked)} /> Comentario interno (no lo ve el ciudadano)
              </label>
              <button className="btn" disabled={ocupado}>Enviar</button>
            </form>
          </section>
        </div>
      </div>

      {imagenGrande && (
        <div className="modal" onClick={() => setImagenGrande(null)}>
          <img src={imagenUrl(imagenGrande)} alt="" />
        </div>
      )}
    </>
  );
}
