const { sql, request } = require('../config/db');
const { ROLES } = require('../utils/roles');

// Los encargados solo ven las estadísticas de su propia área.
function areaFiltro(req) {
  if (req.usuario.rol === ROLES.ENCARGADO) return req.usuario.idArea;
  return req.query.area ? Number(req.query.area) : null;
}

// GET /api/reportes/resumen?desde=&hasta=&area=
async function resumen(req, res) {
  const r = await (await request())
    .input('Desde', sql.Date, req.query.desde || null)
    .input('Hasta', sql.Date, req.query.hasta || null)
    .input('IdArea', sql.Int, areaFiltro(req))
    .execute('sp_EstadisticasGenerales');

  const [[totales], porArea, porEstatus, porMes] = r.recordsets;
  res.json({ totales, porArea, porEstatus, porMes });
}

// GET /api/reportes/exportar?desde=&hasta=&area=  -> archivo CSV (se abre en Excel)
async function exportarCsv(req, res) {
  const r = await (await request())
    .input('Desde', sql.Date, req.query.desde || '2000-01-01')
    .input('Hasta', sql.Date, req.query.hasta || '2999-12-31')
    .input('IdArea', sql.Int, areaFiltro(req))
    .query(`
      SELECT i.Folio, i.FechaCreacion, a.Nombre AS Area, c.Nombre AS Categoria, i.Titulo, e.Nombre AS Estatus,
             i.Prioridad, i.Comunidad, i.Direccion, i.Latitud, i.Longitud,
             ua.Nombre + ISNULL(' ' + ua.Apellidos, '') AS Asignado, i.FechaResolucion,
             CASE WHEN i.FechaResolucion IS NOT NULL
                  THEN CAST(DATEDIFF(MINUTE, i.FechaCreacion, i.FechaResolucion) / 60.0 AS DECIMAL(10,1)) END AS HorasResolucion
        FROM Incidencias i
        JOIN Areas a ON a.IdArea = i.IdArea
        JOIN Categorias c ON c.IdCategoria = i.IdCategoria
        JOIN Estatus e ON e.IdEstatus = i.IdEstatus
        LEFT JOIN Usuarios ua ON ua.IdUsuario = i.IdAsignado
       WHERE CAST(i.FechaCreacion AS DATE) BETWEEN @Desde AND @Hasta
         AND (@IdArea IS NULL OR i.IdArea = @IdArea)
       ORDER BY i.FechaCreacion DESC`);

  const filas = r.recordset;
  const columnas = Object.keys(r.recordset.columns);
  const celda = (v) => {
    if (v === null || v === undefined) return '';
    const s = v instanceof Date ? v.toISOString().replace('T', ' ').slice(0, 19) : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [columnas.join(','), ...filas.map((f) => columnas.map((c) => celda(f[c])).join(','))].join('\r\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="incidencias.csv"');
  res.send('﻿' + csv); // BOM para que Excel respete los acentos
}

module.exports = { resumen, exportarCsv };
