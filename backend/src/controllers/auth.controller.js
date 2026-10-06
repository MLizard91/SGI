const bcrypt = require('bcryptjs');
const { sql, request } = require('../config/db');
const { firmarToken } = require('../middleware/auth');
const { HttpError, requerir } = require('../utils/errores');
const { ROLES } = require('../utils/roles');

const CORREO_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const SELECT_USUARIO = `
  SELECT u.IdUsuario, u.Nombre, u.Apellidos, u.Correo, u.Telefono, u.PasswordHash,
         u.IdArea, a.Nombre AS Area, u.Activo, r.Nombre AS Rol
    FROM Usuarios u
    JOIN Roles r ON r.IdRol = u.IdRol
    LEFT JOIN Areas a ON a.IdArea = u.IdArea`;

function sinPassword({ PasswordHash, ...usuario }) {
  return usuario;
}

// POST /api/auth/registro  -> registro de ciudadanos desde la app móvil
async function registro(req, res) {
  requerir(req.body, ['nombre', 'correo', 'password']);
  const { nombre, apellidos, telefono } = req.body;
  const correo = String(req.body.correo).trim().toLowerCase();
  if (!CORREO_VALIDO.test(correo)) throw new HttpError(400, 'El correo no es válido');
  if (String(req.body.password).length < 8) throw new HttpError(400, 'La contraseña debe tener al menos 8 caracteres');

  const hash = await bcrypt.hash(String(req.body.password), 10);
  await (await request())
    .input('Nombre', sql.NVarChar(100), nombre.trim())
    .input('Apellidos', sql.NVarChar(150), apellidos || null)
    .input('Correo', sql.NVarChar(150), correo)
    .input('Telefono', sql.NVarChar(20), telefono || null)
    .input('Hash', sql.NVarChar(255), hash)
    .input('Rol', sql.NVarChar(50), ROLES.CIUDADANO)
    .query(`INSERT INTO Usuarios (Nombre, Apellidos, Correo, Telefono, PasswordHash, IdRol)
            SELECT @Nombre, @Apellidos, @Correo, @Telefono, @Hash, IdRol FROM Roles WHERE Nombre = @Rol`);

  const r = await (await request()).input('Correo', sql.NVarChar(150), correo).query(`${SELECT_USUARIO} WHERE u.Correo = @Correo`);
  const usuario = sinPassword(r.recordset[0]);
  res.status(201).json({ token: firmarToken(usuario), usuario });
}

// POST /api/auth/login
async function login(req, res) {
  requerir(req.body, ['correo', 'password']);
  const correo = String(req.body.correo).trim().toLowerCase();
  const r = await (await request()).input('Correo', sql.NVarChar(150), correo).query(`${SELECT_USUARIO} WHERE u.Correo = @Correo`);
  const usuario = r.recordset[0];

  if (!usuario || !(await bcrypt.compare(String(req.body.password), usuario.PasswordHash))) {
    throw new HttpError(401, 'Correo o contraseña incorrectos');
  }
  if (!usuario.Activo) throw new HttpError(403, 'Tu cuenta está desactivada');

  await (await request()).input('Id', sql.Int, usuario.IdUsuario)
    .query('UPDATE Usuarios SET UltimoAcceso = SYSUTCDATETIME() WHERE IdUsuario = @Id');

  res.json({ token: firmarToken(usuario), usuario: sinPassword(usuario) });
}

// GET /api/auth/perfil
async function perfil(req, res) {
  const r = await (await request()).input('Id', sql.Int, req.usuario.id).query(`${SELECT_USUARIO} WHERE u.IdUsuario = @Id`);
  if (!r.recordset[0]) throw new HttpError(404, 'Usuario no encontrado');
  res.json(sinPassword(r.recordset[0]));
}

module.exports = { registro, login, perfil };
