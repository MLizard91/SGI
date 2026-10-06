// Nombres de roles tal como están en la tabla Roles.
const ROLES = {
  ADMIN: 'Administrador',
  ENCARGADO: 'Encargado de Área',
  RECEPCION: 'Recepcionista',
  OPERATIVO: 'Operativo',
  CIUDADANO: 'Ciudadano',
};

// Roles que trabajan en el panel web (personal municipal)
const PERSONAL = [ROLES.ADMIN, ROLES.ENCARGADO, ROLES.RECEPCION, ROLES.OPERATIVO];

// IDs de la tabla Estatus
const ESTATUS = { RECIBIDA: 1, EN_REVISION: 2, ASIGNADA: 3, EN_PROCESO: 4, RESUELTA: 5, CERRADA: 6, RECHAZADA: 7 };

module.exports = { ROLES, PERSONAL, ESTATUS };
