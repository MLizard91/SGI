// Manejo centralizado de errores: cualquier error lanzado en una ruta llega aquí.
const multer = require('multer');

// eslint-disable-next-line no-unused-vars
function manejadorErrores(err, _req, res, _next) {
  if (err instanceof multer.MulterError) {
    const mensajes = {
      LIMIT_FILE_SIZE: 'La imagen es demasiado grande',
      LIMIT_FILE_COUNT: 'Máximo 5 imágenes por envío',
      LIMIT_UNEXPECTED_FILE: 'Campo de archivo no esperado (usa "imagenes")',
    };
    return res.status(400).json({ mensaje: mensajes[err.code] || err.message });
  }
  // Errores lanzados con THROW 5xxxx desde los procedimientos almacenados
  if (err.number >= 50000 && err.number < 60000) {
    return res.status(400).json({ mensaje: err.message });
  }
  // Violación de llave única (por ejemplo correo duplicado)
  if (err.number === 2627 || err.number === 2601) {
    return res.status(409).json({ mensaje: 'El registro ya existe' });
  }
  const status = err.status || 500;
  if (status === 500) console.error(err);
  res.status(status).json({ mensaje: status === 500 ? 'Error interno del servidor' : err.message });
}

module.exports = manejadorErrores;
