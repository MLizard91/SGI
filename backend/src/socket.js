// Comunicación en tiempo real con Socket.IO.
// Cada usuario se une a "salas" según su rol para recibir solo lo que le corresponde:
//   usuario:<id>  -> notificaciones personales y cambios de sus reportes
//   todas         -> administradores y recepción (ven todas las incidencias)
//   area:<id>     -> encargados y operativos de un área
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const { ROLES } = require('./utils/roles');

let io;

function iniciarSocket(httpServer, corsOrigin) {
  io = new Server(httpServer, { cors: { origin: corsOrigin } });

  io.use((socket, next) => {
    try {
      socket.usuario = jwt.verify(socket.handshake.auth?.token, process.env.JWT_SECRET);
      next();
    } catch {
      next(new Error('No autorizado'));
    }
  });

  io.on('connection', (socket) => {
    const { id, rol, idArea } = socket.usuario;
    socket.join(`usuario:${id}`);
    if (rol === ROLES.ADMIN || rol === ROLES.RECEPCION) socket.join('todas');
    if ((rol === ROLES.ENCARGADO || rol === ROLES.OPERATIVO) && idArea) socket.join(`area:${idArea}`);
  });

  return io;
}

// Avisa a todos los interesados que una incidencia se creó o cambió.
function emitirIncidencia(evento, inc) {
  if (!io) return;
  const salas = ['todas', `area:${inc.IdArea}`, `usuario:${inc.IdCiudadano}`];
  if (inc.IdAsignado) salas.push(`usuario:${inc.IdAsignado}`);
  io.to(salas).emit(evento, inc);
}

function emitirAUsuario(idUsuario, evento, datos) {
  if (io) io.to(`usuario:${idUsuario}`).emit(evento, datos);
}

module.exports = { iniciarSocket, emitirIncidencia, emitirAUsuario };
