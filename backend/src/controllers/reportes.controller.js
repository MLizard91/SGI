const { sql, request } = require('../config/db');
const { ROLES } = require('../utils/roles');
const { HttpError } = require('../utils/errores');
const { generarReportePdf } = require('../services/reportePdf.service');

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

// Valida un periodo 'AAAA-MM-DD' (desde <= hasta, máximo un año).
function periodo(q) {
  const valida = (f) => typeof f === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(f)
    && !Number.isNaN(Date.parse(f)) && new Date(`${f}T00:00:00Z`).toISOString().slice(0, 10) === f;
  if (!valida(q.desde) || !valida(q.hasta)) throw new HttpError(400, 'Selecciona un periodo válido (desde y hasta)');
  const dias = (Date.parse(q.hasta) - Date.parse(q.desde)) / 86400000;
  if (dias < 0) throw new HttpError(400, 'La fecha inicial no puede ser posterior a la final');
  if (dias > 366) throw new HttpError(400, 'El periodo del reporte no puede ser mayor a un año');
  return { desde: q.desde, hasta: q.hasta };
}

// GET /api/reportes/pdf?desde=&hasta=&area=  -> reporte de incidencias del periodo en PDF
async function exportarPdf(req, res) {
  const { desde, hasta } = periodo(req.query);
  const idArea = areaFiltro(req);
  const parametros = async () => (await request())
    .input('Desde', sql.Date, desde)
    .input('Hasta', sql.Date, hasta)
    .input('IdArea', sql.Int, idArea);

  const estadisticas = await (await parametros()).execute('sp_EstadisticasGenerales');
  const [[totales], porArea, porEstatus] = estadisticas.recordsets;

  const r = await (await parametros())
    .input('IdUsuario', sql.Int, req.usuario.id)
    .query(`
      SELECT c.Nombre AS Categoria, a.Nombre AS Area, COUNT(*) AS Total
        FROM Incidencias i
        JOIN Categorias c ON c.IdCategoria = i.IdCategoria
        JOIN Areas a ON a.IdArea = i.IdArea
       WHERE CAST(i.FechaCreacion AS DATE) BETWEEN @Desde AND @Hasta
         AND (@IdArea IS NULL OR i.IdArea = @IdArea)
       GROUP BY c.Nombre, a.Nombre
       ORDER BY Total DESC, a.Nombre, c.Nombre;

      SELECT i.Folio, i.FechaCreacion, a.Nombre AS Area, c.Nombre AS Categoria, i.Titulo,
             e.Nombre AS Estatus, i.Prioridad, ua.Nombre + ISNULL(' ' + ua.Apellidos, '') AS Asignado
        FROM Incidencias i
        JOIN Areas a ON a.IdArea = i.IdArea
        JOIN Categorias c ON c.IdCategoria = i.IdCategoria
        JOIN Estatus e ON e.IdEstatus = i.IdEstatus
        LEFT JOIN Usuarios ua ON ua.IdUsuario = i.IdAsignado
       WHERE CAST(i.FechaCreacion AS DATE) BETWEEN @Desde AND @Hasta
         AND (@IdArea IS NULL OR i.IdArea = @IdArea)
       ORDER BY i.FechaCreacion;

      SELECT Nombre + ISNULL(' ' + Apellidos, '') AS Nombre FROM Usuarios WHERE IdUsuario = @IdUsuario;`);
  const [porCategoria, incidencias, [autor]] = r.recordsets;

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="reporte-incidencias_${desde}_${hasta}.pdf"`);
  generarReportePdf(res, {
    desde,
    hasta,
    area: idArea ? porArea[0]?.Nombre || 'Área seleccionada' : 'Todas las áreas',
    generadoPor: autor?.Nombre || req.usuario.nombre,
    totales,
    porArea,
    porEstatus,
    porCategoria,
    incidencias,
  });
}

module.exports = { resumen, exportarCsv, exportarPdf };
