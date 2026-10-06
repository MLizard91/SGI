// Servicio de notificaciones: guarda la notificación en la BD y la envía en tiempo real.
const { sql, request } = require('../config/db');
const { emitirAUsuario } = require('../socket');

async function notificar(idUsuarios, { idIncidencia = null, titulo, mensaje }) {
  const unicos = [...new Set(idUsuarios.filter(Boolean))];
  for (const idUsuario of unicos) {
    const r = await (await request())
      .input('IdUsuario', sql.Int, idUsuario)
      .input('IdIncidencia', sql.Int, idIncidencia)
      .input('Titulo', sql.NVarChar(150), titulo)
      .input('Mensaje', sql.NVarChar(500), mensaje)
      .query(`INSERT INTO Notificaciones (IdUsuario, IdIncidencia, Titulo, Mensaje)
              OUTPUT INSERTED.*
              VALUES (@IdUsuario, @IdIncidencia, @Titulo, @Mensaje)`);
    emitirAUsuario(idUsuario, 'notificacion', r.recordset[0]);
  }
}

// IDs del personal que debe enterarse de una nueva incidencia en un área:
// administradores, recepción y encargados de esa área.
async function personalDeArea(idArea) {
  const r = await (await request()).input('IdArea', sql.Int, idArea).query(`
    SELECT u.IdUsuario
      FROM Usuarios u JOIN Roles r ON r.IdRol = u.IdRol
     WHERE u.Activo = 1
       AND (r.Nombre IN (N'Administrador', N'Recepcionista')
            OR (r.Nombre = N'Encargado de Área' AND u.IdArea = @IdArea))`);
  return r.recordset.map((x) => x.IdUsuario);
}

module.exports = { notificar, personalDeArea };
