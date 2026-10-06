const { request } = require('../config/db');

// GET /api/catalogos  -> áreas (con sus categorías), estatus y roles en una sola llamada
async function obtenerCatalogos(_req, res) {
  const r = await (await request()).query(`
    SELECT IdArea, Nombre, Descripcion, Color, Icono FROM Areas WHERE Activa = 1 ORDER BY IdArea;
    SELECT IdCategoria, IdArea, Nombre FROM Categorias WHERE Activa = 1 ORDER BY IdArea, Nombre;
    SELECT IdEstatus, Nombre, Color, Orden, EsFinal FROM Estatus ORDER BY Orden;
    SELECT IdRol, Nombre, Descripcion FROM Roles ORDER BY IdRol;`);
  const [areas, categorias, estatus, roles] = r.recordsets;
  res.json({
    areas: areas.map((a) => ({ ...a, Categorias: categorias.filter((c) => c.IdArea === a.IdArea) })),
    estatus,
    roles,
    prioridades: ['Baja', 'Media', 'Alta', 'Urgente'],
  });
}

module.exports = { obtenerCatalogos };
