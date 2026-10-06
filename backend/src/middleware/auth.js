// Middleware de autenticación (JWT) y autorización por rol.
const jwt = require('jsonwebtoken');
const { HttpError } = require('../utils/errores');

function verificarToken(req, _res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next(new HttpError(401, 'Debes iniciar sesión'));
  try {
    // payload: { id, nombre, rol, idArea }
    req.usuario = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    next(new HttpError(401, 'Sesión inválida o expirada'));
  }
}

// Uso: router.get('/', verificarToken, permitirRoles('Administrador'), handler)
function permitirRoles(...roles) {
  return (req, _res, next) => {
    if (!roles.includes(req.usuario?.rol)) {
      return next(new HttpError(403, 'No tienes permiso para realizar esta acción'));
    }
    next();
  };
}

function firmarToken(usuario) {
  return jwt.sign(
    { id: usuario.IdUsuario, nombre: usuario.Nombre, rol: usuario.Rol, idArea: usuario.IdArea },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

module.exports = { verificarToken, permitirRoles, firmarToken };
