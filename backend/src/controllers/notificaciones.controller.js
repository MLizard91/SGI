const { sql, request } = require('../config/db');

// GET /api/notificaciones  -> últimas 30 y el número de no leídas
async function listar(req, res) {
  const r = await (await request()).input('Id', sql.Int, req.usuario.id).query(`
    SELECT TOP 30 IdNotificacion, IdIncidencia, Titulo, Mensaje, Leida, Fecha
      FROM Notificaciones WHERE IdUsuario = @Id ORDER BY Fecha DESC, IdNotificacion DESC;
    SELECT COUNT(*) AS NoLeidas FROM Notificaciones WHERE IdUsuario = @Id AND Leida = 0;`);
  res.json({ datos: r.recordsets[0], noLeidas: r.recordsets[1][0].NoLeidas });
}

// PATCH /api/notificaciones/leer-todas
async function leerTodas(req, res) {
  await (await request()).input('Id', sql.Int, req.usuario.id)
    .query('UPDATE Notificaciones SET Leida = 1 WHERE IdUsuario = @Id AND Leida = 0');
  res.json({ mensaje: 'Listo' });
}

// PATCH /api/notificaciones/:id/leida
async function marcarLeida(req, res) {
  await (await request())
    .input('Id', sql.Int, Number(req.params.id))
    .input('IdUsuario', sql.Int, req.usuario.id)
    .query('UPDATE Notificaciones SET Leida = 1 WHERE IdNotificacion = @Id AND IdUsuario = @IdUsuario');
  res.json({ mensaje: 'Listo' });
}

module.exports = { listar, leerTodas, marcarLeida };
