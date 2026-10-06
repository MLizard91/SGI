const bcrypt = require('bcryptjs');
const { sql, request } = require('../config/db');
const { HttpError, requerir, entero } = require('../utils/errores');
const { ROLES } = require('../utils/roles');

const SELECT = `
  SELECT u.IdUsuario, u.Nombre, u.Apellidos, u.Correo, u.Telefono, u.Activo,
         u.FechaRegistro, u.UltimoAcceso, u.IdRol, r.Nombre AS Rol, u.IdArea, a.Nombre AS Area
    FROM Usuarios u
    JOIN Roles r ON r.IdRol = u.IdRol
    LEFT JOIN Areas a ON a.IdArea = u.IdArea`;

// GET /api/usuarios?rol=&buscar=   (solo administrador)
async function listar(req, res) {
  const r = await request();
  const cond = ['1 = 1'];
  if (req.query.rol) { r.input('Rol', sql.Int, Number(req.query.rol)); cond.push('u.IdRol = @Rol'); }
  if (req.query.buscar) {
    r.input('Buscar', sql.NVarChar(160), `%${req.query.buscar}%`);
    cond.push('(u.Nombre LIKE @Buscar OR u.Apellidos LIKE @Buscar OR u.Correo LIKE @Buscar)');
  }
  const resultado = await r.query(`${SELECT} WHERE ${cond.join(' AND ')} ORDER BY r.IdRol, u.Nombre`);
  res.json(resultado.recordset);
}

// GET /api/usuarios/personal?area=  -> personal activo al que se le pueden asignar incidencias
async function personal(req, res) {
  const r = await request();
  const cond = [`u.Activo = 1`, `r.Nombre IN (N'Encargado de Área', N'Operativo')`];
  const area = req.usuario.rol === ROLES.ENCARGADO ? req.usuario.idArea : req.query.area;
  if (area) { r.input('Area', sql.Int, Number(area)); cond.push('u.IdArea = @Area'); }
  const resultado = await r.query(`${SELECT} WHERE ${cond.join(' AND ')} ORDER BY u.Nombre`);
  res.json(resultado.recordset);
}

// POST /api/usuarios   body: { nombre, apellidos?, correo, telefono?, password, idRol, idArea? }
async function crear(req, res) {
  requerir(req.body, ['nombre', 'correo', 'password', 'idRol']);
  if (String(req.body.password).length < 8) throw new HttpError(400, 'La contraseña debe tener al menos 8 caracteres');
  const hash = await bcrypt.hash(String(req.body.password), 10);

  const r = await (await request())
    .input('Nombre', sql.NVarChar(100), req.body.nombre.trim())
    .input('Apellidos', sql.NVarChar(150), req.body.apellidos || null)
    .input('Correo', sql.NVarChar(150), String(req.body.correo).trim().toLowerCase())
    .input('Telefono', sql.NVarChar(20), req.body.telefono || null)
    .input('Hash', sql.NVarChar(255), hash)
    .input('IdRol', sql.Int, entero(req.body.idRol, 'Rol'))
    .input('IdArea', sql.Int, req.body.idArea ? Number(req.body.idArea) : null)
    .query(`INSERT INTO Usuarios (Nombre, Apellidos, Correo, Telefono, PasswordHash, IdRol, IdArea)
            OUTPUT INSERTED.IdUsuario
            VALUES (@Nombre, @Apellidos, @Correo, @Telefono, @Hash, @IdRol, @IdArea)`);

  const nuevo = await (await request()).input('Id', sql.Int, r.recordset[0].IdUsuario).query(`${SELECT} WHERE u.IdUsuario = @Id`);
  res.status(201).json(nuevo.recordset[0]);
}

// PUT /api/usuarios/:id   body: { nombre, apellidos, telefono, idRol, idArea, activo, password? }
async function actualizar(req, res) {
  const id = entero(req.params.id, 'Id');
  requerir(req.body, ['nombre', 'idRol']);
  if (id === req.usuario.id && req.body.activo === false) {
    throw new HttpError(400, 'No puedes desactivar tu propia cuenta');
  }

  const r = (await request())
    .input('Id', sql.Int, id)
    .input('Nombre', sql.NVarChar(100), req.body.nombre.trim())
    .input('Apellidos', sql.NVarChar(150), req.body.apellidos || null)
    .input('Telefono', sql.NVarChar(20), req.body.telefono || null)
    .input('IdRol', sql.Int, entero(req.body.idRol, 'Rol'))
    .input('IdArea', sql.Int, req.body.idArea ? Number(req.body.idArea) : null)
    .input('Activo', sql.Bit, req.body.activo !== false);

  let setPassword = '';
  if (req.body.password) {
    if (String(req.body.password).length < 8) throw new HttpError(400, 'La contraseña debe tener al menos 8 caracteres');
    r.input('Hash', sql.NVarChar(255), await bcrypt.hash(String(req.body.password), 10));
    setPassword = ', PasswordHash = @Hash';
  }

  const resultado = await r.query(`
    UPDATE Usuarios SET Nombre = @Nombre, Apellidos = @Apellidos, Telefono = @Telefono,
           IdRol = @IdRol, IdArea = @IdArea, Activo = @Activo ${setPassword}
     WHERE IdUsuario = @Id`);
  if (!resultado.rowsAffected[0]) throw new HttpError(404, 'Usuario no encontrado');

  const actualizado = await (await request()).input('Id', sql.Int, id).query(`${SELECT} WHERE u.IdUsuario = @Id`);
  res.json(actualizado.recordset[0]);
}

module.exports = { listar, personal, crear, actualizar };
