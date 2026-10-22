// Roles del sistema (mismos nombres que la tabla Roles del backend).
export const ROLES = {
  ADMIN: 'Administrador',
  ENCARGADO: 'Encargado de Área',
  RECEPCION: 'Recepcionista',
  OPERATIVO: 'Operativo',
  CIUDADANO: 'Ciudadano',
};

// Personal municipal: usa el panel de gestión en lugar de "Mis reportes"
export const esPersonal = (usuario) => !!usuario && usuario.Rol !== ROLES.CIUDADANO;

// Pueden asignar, cambiar prioridad y generar reportes PDF
export const puedeGestionar = (usuario) => [ROLES.ADMIN, ROLES.ENCARGADO, ROLES.RECEPCION].includes(usuario?.Rol);

// El encargado solo trabaja con su área, así que no se le muestra el filtro de área
export const eligeArea = (usuario) => usuario?.Rol !== ROLES.ENCARGADO;
