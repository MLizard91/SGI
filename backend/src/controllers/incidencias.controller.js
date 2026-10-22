const fs = require('fs/promises');
const { sql, request } = require('../config/db');
const { HttpError, requerir, entero } = require('../utils/errores');
const { ROLES, PERSONAL, ESTATUS } = require('../utils/roles');
const { emitirIncidencia } = require('../socket');
const { notificar, personalDeArea } = require('../services/notificaciones.service');

const PRIORIDADES = ['Baja', 'Media', 'Alta', 'Urgente'];

const SELECT_INCIDENCIA = `
  SELECT i.IdIncidencia, i.Folio, i.Titulo, i.Descripcion, i.Prioridad,
         i.Latitud, i.Longitud, i.PrecisionMetros, i.Direccion, i.Comunidad,
         i.FechaCreacion, i.FechaActualizacion, i.FechaResolucion,
         i.IdCategoria, c.Nombre AS Categoria,
         i.IdArea, a.Nombre AS Area, a.Color AS ColorArea,
         i.IdEstatus, e.Nombre AS Estatus, e.Color AS ColorEstatus,
         i.IdCiudadano, uc.Nombre + ISNULL(' ' + uc.Apellidos, '') AS Ciudadano,
         i.IdAsignado, ua.Nombre + ISNULL(' ' + ua.Apellidos, '') AS Asignado,
         (SELECT TOP 1 Ruta FROM IncidenciaImagenes im
           WHERE im.IdIncidencia = i.IdIncidencia AND im.Tipo = 'Reporte' ORDER BY im.IdImagen) AS ImagenPrincipal
    FROM Incidencias i
    JOIN Categorias c ON c.IdCategoria = i.IdCategoria
    JOIN Areas a      ON a.IdArea = i.IdArea
    JOIN Estatus e    ON e.IdEstatus = i.IdEstatus
    JOIN Usuarios uc  ON uc.IdUsuario = i.IdCiudadano
    LEFT JOIN Usuarios ua ON ua.IdUsuario = i.IdAsignado`;

/* Agrega al request el filtro según el rol:
   - Ciudadano: solo sus reportes
   - Encargado de Área: solo su área
   - Operativo: solo lo que tiene asignado
   - Administrador / Recepcionista: todo */
function filtroPorRol(req, usuario) {
  switch (usuario.rol) {
    case ROLES.CIUDADANO:
      req.input('UsrId', sql.Int, usuario.id);
      return 'i.IdCiudadano = @UsrId';
    case ROLES.ENCARGADO:
      req.input('UsrArea', sql.Int, usuario.idArea ?? -1);
      return 'i.IdArea = @UsrArea';
    case ROLES.OPERATIVO:
      req.input('UsrId', sql.Int, usuario.id);
      return 'i.IdAsignado = @UsrId';
    default:
      return '1 = 1';
  }
}

// Obtiene una incidencia verificando que el usuario tenga acceso a ella.
async function obtenerConAcceso(id, usuario) {
  const req = await request();
  req.input('Id', sql.Int, id);
  const r = await req.query(`${SELECT_INCIDENCIA} WHERE i.IdIncidencia = @Id AND ${filtroPorRol(req, usuario)}`);
  if (!r.recordset[0]) throw new HttpError(404, 'Incidencia no encontrada');
  return r.recordset[0];
}

async function borrarArchivos(files = []) {
  await Promise.all(files.map((f) => fs.unlink(f.path).catch(() => {})));
}

async function guardarImagenes(idIncidencia, idUsuario, files, tipo) {
  for (const f of files) {
    await (await request())
      .input('IdIncidencia', sql.Int, idIncidencia)
      .input('Ruta', sql.NVarChar(300), `uploads/${f.filename}`)
      .input('Tipo', sql.NVarChar(20), tipo)
      .input('IdUsuario', sql.Int, idUsuario)
      .query(`INSERT INTO IncidenciaImagenes (IdIncidencia, Ruta, Tipo, IdUsuario)
              VALUES (@IdIncidencia, @Ruta, @Tipo, @IdUsuario)`);
  }
}

/* GET /api/incidencias
   Filtros opcionales: estatus, area, prioridad, buscar, desde, hasta, pagina, limite */
async function listar(req, res) {
  const q = req.query;
  const pagina = Math.max(1, Number(q.pagina) || 1);
  const limite = Math.min(100, Math.max(1, Number(q.limite) || 20));

  const r = await request();
  const condiciones = [filtroPorRol(r, req.usuario)];

  if (q.estatus) { r.input('Estatus', sql.Int, Number(q.estatus)); condiciones.push('i.IdEstatus = @Estatus'); }
  if (q.area) { r.input('Area', sql.Int, Number(q.area)); condiciones.push('i.IdArea = @Area'); }
  if (q.prioridad) { r.input('Prioridad', sql.NVarChar(10), q.prioridad); condiciones.push('i.Prioridad = @Prioridad'); }
  if (q.abiertas === '1') condiciones.push('e.EsFinal = 0');
  if (q.desde) { r.input('Desde', sql.Date, q.desde); condiciones.push('CAST(i.FechaCreacion AS DATE) >= @Desde'); }
  if (q.hasta) { r.input('Hasta', sql.Date, q.hasta); condiciones.push('CAST(i.FechaCreacion AS DATE) <= @Hasta'); }
  if (q.buscar) {
    r.input('Buscar', sql.NVarChar(160), `%${q.buscar}%`);
    condiciones.push('(i.Folio LIKE @Buscar OR i.Titulo LIKE @Buscar OR i.Direccion LIKE @Buscar OR i.Comunidad LIKE @Buscar)');
  }

  r.input('Offset', sql.Int, (pagina - 1) * limite);
  r.input('Limite', sql.Int, limite);
  const where = condiciones.join(' AND ');

  const resultado = await r.query(`
    ${SELECT_INCIDENCIA} WHERE ${where}
     ORDER BY i.FechaCreacion DESC
    OFFSET @Offset ROWS FETCH NEXT @Limite ROWS ONLY;

    SELECT COUNT(*) AS Total
      FROM Incidencias i JOIN Estatus e ON e.IdEstatus = i.IdEstatus
     WHERE ${where};`);

  res.json({ datos: resultado.recordsets[0], total: resultado.recordsets[1][0].Total, pagina, limite });
}

// GET /api/incidencias/mapa  -> puntos ligeros para pintar en el mapa
async function mapa(req, res) {
  const r = await request();
  const condiciones = [filtroPorRol(r, req.usuario)];
  if (req.query.area) { r.input('Area', sql.Int, Number(req.query.area)); condiciones.push('i.IdArea = @Area'); }
  if (req.query.estatus) { r.input('Estatus', sql.Int, Number(req.query.estatus)); condiciones.push('i.IdEstatus = @Estatus'); }
  if (req.query.abiertas === '1') condiciones.push('e.EsFinal = 0');

  const resultado = await r.query(`
    SELECT TOP 2000 i.IdIncidencia, i.Folio, i.Titulo, i.Latitud, i.Longitud, i.Prioridad, i.FechaCreacion,
           i.IdArea, a.Nombre AS Area, a.Color AS ColorArea, i.IdEstatus, e.Nombre AS Estatus, e.Color AS ColorEstatus
      FROM Incidencias i
      JOIN Areas a ON a.IdArea = i.IdArea
      JOIN Estatus e ON e.IdEstatus = i.IdEstatus
     WHERE ${condiciones.join(' AND ')}
     ORDER BY i.FechaCreacion DESC`);
  res.json(resultado.recordset);
}

// GET /api/incidencias/:id  -> detalle con imágenes, comentarios e historial
async function detalle(req, res) {
  const id = entero(req.params.id, 'Id');
  const incidencia = await obtenerConAcceso(id, req.usuario);
  const esCiudadano = req.usuario.rol === ROLES.CIUDADANO;

  const r = await (await request()).input('Id', sql.Int, id).query(`
    SELECT IdImagen, Ruta, Tipo, FechaSubida FROM IncidenciaImagenes WHERE IdIncidencia = @Id ORDER BY IdImagen;

    SELECT c.IdComentario, c.Texto, c.EsInterno, c.Fecha, c.IdUsuario,
           u.Nombre + ISNULL(' ' + u.Apellidos, '') AS Usuario, r.Nombre AS Rol
      FROM Comentarios c
      JOIN Usuarios u ON u.IdUsuario = c.IdUsuario
      JOIN Roles r ON r.IdRol = u.IdRol
     WHERE c.IdIncidencia = @Id ${esCiudadano ? 'AND c.EsInterno = 0' : ''}
     ORDER BY c.Fecha;

    SELECT h.IdHistorial, h.Accion, h.Detalle, h.Fecha,
           ea.Nombre AS EstatusAnterior, en.Nombre AS EstatusNuevo, en.Color AS ColorEstatusNuevo,
           u.Nombre + ISNULL(' ' + u.Apellidos, '') AS Usuario
      FROM HistorialIncidencia h
      LEFT JOIN Estatus ea ON ea.IdEstatus = h.IdEstatusAnterior
      LEFT JOIN Estatus en ON en.IdEstatus = h.IdEstatusNuevo
      LEFT JOIN Usuarios u ON u.IdUsuario = h.IdUsuario
     WHERE h.IdIncidencia = @Id
     ORDER BY h.Fecha, h.IdHistorial;`);

  const [imagenes, comentarios, historial] = r.recordsets;
  res.json({ ...incidencia, imagenes, comentarios, historial });
}

/* POST /api/incidencias  (multipart/form-data)
   Campos: titulo, descripcion, idCategoria, latitud, longitud, precision?, direccion?, comunidad?
   Archivos: imagenes (hasta 5) */
async function crear(req, res) {
  const files = req.files || [];
  try {
    requerir(req.body, ['titulo', 'descripcion', 'idCategoria', 'latitud', 'longitud']);
    if (!files.length) throw new HttpError(400, 'Agrega al menos una fotografía de la incidencia');

    const lat = Number(req.body.latitud);
    const lng = Number(req.body.longitud);
    if (!(lat >= -90 && lat <= 90) || !(lng >= -180 && lng <= 180)) {
      throw new HttpError(400, 'La ubicación no es válida');
    }

    const r = await (await request())
      .input('Titulo', sql.NVarChar(150), String(req.body.titulo).trim().slice(0, 150))
      .input('Descripcion', sql.NVarChar(sql.MAX), String(req.body.descripcion).trim())
      .input('IdCategoria', sql.Int, entero(req.body.idCategoria, 'Categoría'))
      .input('Latitud', sql.Decimal(9, 6), lat)
      .input('Longitud', sql.Decimal(9, 6), lng)
      .input('PrecisionMetros', sql.Decimal(8, 2), req.body.precision ? Math.min(Number(req.body.precision), 999999) : null)
      .input('Direccion', sql.NVarChar(300), req.body.direccion ? String(req.body.direccion).slice(0, 300) : null)
      .input('Comunidad', sql.NVarChar(100), req.body.comunidad ? String(req.body.comunidad).slice(0, 100) : null)
      .input('IdCiudadano', sql.Int, req.usuario.id)
      .execute('sp_CrearIncidencia');

    const { IdIncidencia, Folio, IdArea } = r.recordset[0];
    await guardarImagenes(IdIncidencia, req.usuario.id, files, 'Reporte');

    const incidencia = await obtenerConAcceso(IdIncidencia, { rol: ROLES.ADMIN });
    emitirIncidencia('incidencia:nueva', incidencia);
    await notificar(await personalDeArea(IdArea), {
      idIncidencia: IdIncidencia,
      titulo: `Nuevo reporte ${Folio}`,
      mensaje: `${incidencia.Categoria} - ${incidencia.Titulo}`,
    });

    res.status(201).json(incidencia);
  } catch (err) {
    await borrarArchivos(files);
    throw err;
  }
}

// PATCH /api/incidencias/:id/estatus   body: { idEstatus, comentario? }
async function cambiarEstatus(req, res) {
  const id = entero(req.params.id, 'Id');
  const idEstatus = entero(req.body.idEstatus, 'Estatus');
  const actual = await obtenerConAcceso(id, req.usuario);

  // El personal operativo solo puede marcar "En proceso" o "Resuelta"
  if (req.usuario.rol === ROLES.OPERATIVO && ![ESTATUS.EN_PROCESO, ESTATUS.RESUELTA].includes(idEstatus)) {
    throw new HttpError(403, 'Solo puedes marcar la incidencia como En proceso o Resuelta');
  }
  if (actual.IdEstatus === idEstatus) throw new HttpError(400, 'La incidencia ya tiene ese estatus');

  const comentario = req.body.comentario ? String(req.body.comentario).slice(0, 500) : null;
  await (await request())
    .input('IdIncidencia', sql.Int, id)
    .input('IdEstatus', sql.Int, idEstatus)
    .input('IdUsuario', sql.Int, req.usuario.id)
    .input('Detalle', sql.NVarChar(500), comentario)
    .execute('sp_CambiarEstatus');

  const incidencia = await obtenerConAcceso(id, { rol: ROLES.ADMIN });
  emitirIncidencia('incidencia:actualizada', incidencia);
  await notificar([incidencia.IdCiudadano], {
    idIncidencia: id,
    titulo: `Tu reporte ${incidencia.Folio} cambió de estatus`,
    mensaje: `Ahora está: ${incidencia.Estatus}${comentario ? `. ${comentario}` : ''}`,
  });
  res.json(incidencia);
}

// PATCH /api/incidencias/:id/asignar   body: { idAsignado }
async function asignar(req, res) {
  const id = entero(req.params.id, 'Id');
  const idAsignado = entero(req.body.idAsignado, 'Usuario asignado');
  await obtenerConAcceso(id, req.usuario);

  await (await request())
    .input('IdIncidencia', sql.Int, id)
    .input('IdAsignado', sql.Int, idAsignado)
    .input('IdUsuario', sql.Int, req.usuario.id)
    .execute('sp_AsignarIncidencia');

  const incidencia = await obtenerConAcceso(id, { rol: ROLES.ADMIN });
  emitirIncidencia('incidencia:actualizada', incidencia);
  await notificar([idAsignado], {
    idIncidencia: id,
    titulo: `Se te asignó la incidencia ${incidencia.Folio}`,
    mensaje: `${incidencia.Area}: ${incidencia.Titulo}`,
  });
  res.json(incidencia);
}

// PATCH /api/incidencias/:id/prioridad   body: { prioridad }
async function cambiarPrioridad(req, res) {
  const id = entero(req.params.id, 'Id');
  const { prioridad } = req.body;
  if (!PRIORIDADES.includes(prioridad)) throw new HttpError(400, `Prioridad inválida (${PRIORIDADES.join(', ')})`);
  const actual = await obtenerConAcceso(id, req.usuario);

  await (await request())
    .input('Id', sql.Int, id)
    .input('Prioridad', sql.NVarChar(10), prioridad)
    .input('IdUsuario', sql.Int, req.usuario.id)
    .input('Detalle', sql.NVarChar(500), `Prioridad: ${actual.Prioridad} → ${prioridad}`)
    .query(`UPDATE Incidencias SET Prioridad = @Prioridad, FechaActualizacion = SYSUTCDATETIME() WHERE IdIncidencia = @Id;
            INSERT INTO HistorialIncidencia (IdIncidencia, IdUsuario, Accion, Detalle)
            VALUES (@Id, @IdUsuario, N'Prioridad', @Detalle);`);

  const incidencia = await obtenerConAcceso(id, { rol: ROLES.ADMIN });
  emitirIncidencia('incidencia:actualizada', incidencia);
  res.json(incidencia);
}

// POST /api/incidencias/:id/comentarios   body: { texto, esInterno? }
async function comentar(req, res) {
  const id = entero(req.params.id, 'Id');
  requerir(req.body, ['texto']);
  const incidencia = await obtenerConAcceso(id, req.usuario);
  const esPersonal = PERSONAL.includes(req.usuario.rol);
  const esInterno = esPersonal && (req.body.esInterno === true || req.body.esInterno === 'true');

  const r = await (await request())
    .input('Id', sql.Int, id)
    .input('IdUsuario', sql.Int, req.usuario.id)
    .input('Texto', sql.NVarChar(1000), String(req.body.texto).trim().slice(0, 1000))
    .input('EsInterno', sql.Bit, esInterno)
    .query(`INSERT INTO Comentarios (IdIncidencia, IdUsuario, Texto, EsInterno)
            OUTPUT INSERTED.IdComentario, INSERTED.Texto, INSERTED.EsInterno, INSERTED.Fecha, INSERTED.IdUsuario
            VALUES (@Id, @IdUsuario, @Texto, @EsInterno);
            UPDATE Incidencias SET FechaActualizacion = SYSUTCDATETIME() WHERE IdIncidencia = @Id;`);

  const comentario = { ...r.recordset[0], Usuario: req.usuario.nombre, Rol: req.usuario.rol };
  emitirIncidencia('incidencia:comentario', { ...incidencia, comentario: esInterno ? null : comentario });

  // Avisar a la otra parte
  if (esPersonal && !esInterno) {
    await notificar([incidencia.IdCiudadano], {
      idIncidencia: id,
      titulo: `Nuevo comentario en tu reporte ${incidencia.Folio}`,
      mensaje: comentario.Texto.slice(0, 200),
    });
  } else if (!esPersonal) {
    const destinatarios = incidencia.IdAsignado ? [incidencia.IdAsignado] : await personalDeArea(incidencia.IdArea);
    await notificar(destinatarios, {
      idIncidencia: id,
      titulo: `El ciudadano comentó en ${incidencia.Folio}`,
      mensaje: comentario.Texto.slice(0, 200),
    });
  }
  res.status(201).json(comentario);
}

// POST /api/incidencias/:id/evidencias  (multipart, campo "imagenes") -> fotos del trabajo realizado
async function subirEvidencias(req, res) {
  const files = req.files || [];
  try {
    const id = entero(req.params.id, 'Id');
    if (!files.length) throw new HttpError(400, 'Adjunta al menos una imagen');
    await obtenerConAcceso(id, req.usuario);
    await guardarImagenes(id, req.usuario.id, files, 'Evidencia');
    await (await request())
      .input('Id', sql.Int, id)
      .input('IdUsuario', sql.Int, req.usuario.id)
      .input('Detalle', sql.NVarChar(500), `${files.length} imagen(es) de evidencia`)
      .query(`INSERT INTO HistorialIncidencia (IdIncidencia, IdUsuario, Accion, Detalle) VALUES (@Id, @IdUsuario, N'Evidencia', @Detalle);
              UPDATE Incidencias SET FechaActualizacion = SYSUTCDATETIME() WHERE IdIncidencia = @Id;`);

    const incidencia = await obtenerConAcceso(id, { rol: ROLES.ADMIN });
    emitirIncidencia('incidencia:actualizada', incidencia);
    res.status(201).json({ mensaje: 'Evidencias guardadas', total: files.length });
  } catch (err) {
    await borrarArchivos(files);
    throw err;
  }
}

module.exports = { listar, mapa, detalle, crear, cambiarEstatus, asignar, cambiarPrioridad, comentar, subirEvidencias };
