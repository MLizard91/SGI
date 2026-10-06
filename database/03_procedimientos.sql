/* =====================================================================
   Script 03: Procedimientos almacenados para operaciones complejas
   ===================================================================== */

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO
USE SGI_Mexticacan;
GO

/* Crea una incidencia y registra el evento en el historial.
   Devuelve IdIncidencia y Folio. */
CREATE OR ALTER PROCEDURE sp_CrearIncidencia
    @Titulo          NVARCHAR(150),
    @Descripcion     NVARCHAR(MAX),
    @IdCategoria     INT,
    @Latitud         DECIMAL(9,6),
    @Longitud        DECIMAL(9,6),
    @PrecisionMetros DECIMAL(8,2) = NULL,
    @Direccion       NVARCHAR(300) = NULL,
    @Comunidad       NVARCHAR(100) = NULL,
    @IdCiudadano     INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @IdArea INT = (SELECT IdArea FROM Categorias WHERE IdCategoria = @IdCategoria AND Activa = 1);
    IF @IdArea IS NULL
        THROW 50001, N'La categoría seleccionada no existe.', 1;

    BEGIN TRAN;
        INSERT INTO Incidencias (Titulo, Descripcion, IdCategoria, IdArea, Latitud, Longitud,
                                 PrecisionMetros, Direccion, Comunidad, IdCiudadano)
        VALUES (@Titulo, @Descripcion, @IdCategoria, @IdArea, @Latitud, @Longitud,
                @PrecisionMetros, @Direccion, @Comunidad, @IdCiudadano);

        DECLARE @Id INT = SCOPE_IDENTITY();

        INSERT INTO HistorialIncidencia (IdIncidencia, IdUsuario, Accion, IdEstatusNuevo, Detalle)
        VALUES (@Id, @IdCiudadano, N'Creación', 1, N'Reporte registrado por el ciudadano');
    COMMIT;

    SELECT IdIncidencia, Folio, IdArea FROM Incidencias WHERE IdIncidencia = @Id;
END
GO

/* Cambia el estatus de una incidencia y deja registro en el historial. */
CREATE OR ALTER PROCEDURE sp_CambiarEstatus
    @IdIncidencia  INT,
    @IdEstatus     INT,
    @IdUsuario     INT,
    @Detalle       NVARCHAR(500) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @Anterior INT = (SELECT IdEstatus FROM Incidencias WHERE IdIncidencia = @IdIncidencia);
    IF @Anterior IS NULL
        THROW 50002, N'La incidencia no existe.', 1;
    IF NOT EXISTS (SELECT 1 FROM Estatus WHERE IdEstatus = @IdEstatus)
        THROW 50003, N'El estatus no es válido.', 1;

    BEGIN TRAN;
        UPDATE Incidencias
           SET IdEstatus = @IdEstatus,
               FechaActualizacion = SYSUTCDATETIME(),
               FechaResolucion = CASE WHEN @IdEstatus IN (5, 6) THEN COALESCE(FechaResolucion, SYSUTCDATETIME())
                                      WHEN @IdEstatus IN (1, 2, 3, 4) THEN NULL
                                      ELSE FechaResolucion END
         WHERE IdIncidencia = @IdIncidencia;

        INSERT INTO HistorialIncidencia (IdIncidencia, IdUsuario, Accion, IdEstatusAnterior, IdEstatusNuevo, Detalle)
        VALUES (@IdIncidencia, @IdUsuario, N'CambioEstatus', @Anterior, @IdEstatus, @Detalle);
    COMMIT;
END
GO

/* Asigna una incidencia a un miembro del personal municipal.
   Si estaba Recibida o En revisión pasa automáticamente a Asignada. */
CREATE OR ALTER PROCEDURE sp_AsignarIncidencia
    @IdIncidencia  INT,
    @IdAsignado    INT,
    @IdUsuario     INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @Anterior INT = (SELECT IdEstatus FROM Incidencias WHERE IdIncidencia = @IdIncidencia);
    IF @Anterior IS NULL
        THROW 50002, N'La incidencia no existe.', 1;

    DECLARE @Nombre NVARCHAR(260) = (
        SELECT u.Nombre + ISNULL(N' ' + u.Apellidos, N'')
          FROM Usuarios u JOIN Roles r ON r.IdRol = u.IdRol
         WHERE u.IdUsuario = @IdAsignado AND u.Activo = 1 AND r.Nombre <> N'Ciudadano');
    IF @Nombre IS NULL
        THROW 50004, N'El usuario a asignar no existe o no es personal municipal.', 1;

    DECLARE @Nuevo INT = CASE WHEN @Anterior IN (1, 2) THEN 3 ELSE @Anterior END;

    BEGIN TRAN;
        UPDATE Incidencias
           SET IdAsignado = @IdAsignado, IdEstatus = @Nuevo, FechaActualizacion = SYSUTCDATETIME()
         WHERE IdIncidencia = @IdIncidencia;

        INSERT INTO HistorialIncidencia (IdIncidencia, IdUsuario, Accion, IdEstatusAnterior, IdEstatusNuevo, Detalle)
        VALUES (@IdIncidencia, @IdUsuario, N'Asignación', @Anterior, @Nuevo, N'Asignada a ' + @Nombre);
    COMMIT;
END
GO

/* Indicadores generales para el dashboard.
   Devuelve 4 conjuntos de resultados: totales, por área, por estatus y por mes. */
CREATE OR ALTER PROCEDURE sp_EstadisticasGenerales
    @Desde  DATE = NULL,
    @Hasta  DATE = NULL,
    @IdArea INT  = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SET @Desde = COALESCE(@Desde, DATEADD(YEAR, -1, CAST(SYSUTCDATETIME() AS DATE)));
    SET @Hasta = COALESCE(@Hasta, CAST(SYSUTCDATETIME() AS DATE));

    ;WITH Base AS (
        SELECT * FROM Incidencias
         WHERE CAST(FechaCreacion AS DATE) BETWEEN @Desde AND @Hasta
           AND (@IdArea IS NULL OR IdArea = @IdArea)
    )
    SELECT
        COUNT(*)                                                     AS Total,
        SUM(CASE WHEN IdEstatus IN (1, 2) THEN 1 ELSE 0 END)         AS Pendientes,
        SUM(CASE WHEN IdEstatus IN (3, 4) THEN 1 ELSE 0 END)         AS EnAtencion,
        SUM(CASE WHEN IdEstatus IN (5, 6) THEN 1 ELSE 0 END)         AS Resueltas,
        SUM(CASE WHEN IdEstatus = 7 THEN 1 ELSE 0 END)               AS Rechazadas,
        SUM(CASE WHEN Prioridad = N'Urgente' AND IdEstatus NOT IN (5, 6, 7) THEN 1 ELSE 0 END) AS UrgentesAbiertas,
        AVG(CASE WHEN FechaResolucion IS NOT NULL
                 THEN DATEDIFF(MINUTE, FechaCreacion, FechaResolucion) / 60.0 END) AS HorasPromedioResolucion
    FROM Base;

    SELECT a.IdArea, a.Nombre, a.Color,
           COUNT(i.IdIncidencia)                                         AS Total,
           SUM(CASE WHEN i.IdEstatus IN (5, 6) THEN 1 ELSE 0 END)        AS Resueltas
      FROM Areas a
      LEFT JOIN Incidencias i ON i.IdArea = a.IdArea
           AND CAST(i.FechaCreacion AS DATE) BETWEEN @Desde AND @Hasta
     WHERE (@IdArea IS NULL OR a.IdArea = @IdArea)
     GROUP BY a.IdArea, a.Nombre, a.Color
     ORDER BY a.IdArea;

    SELECT e.IdEstatus, e.Nombre, e.Color, COUNT(i.IdIncidencia) AS Total
      FROM Estatus e
      LEFT JOIN Incidencias i ON i.IdEstatus = e.IdEstatus
           AND CAST(i.FechaCreacion AS DATE) BETWEEN @Desde AND @Hasta
           AND (@IdArea IS NULL OR i.IdArea = @IdArea)
     GROUP BY e.IdEstatus, e.Nombre, e.Color, e.Orden
     ORDER BY e.Orden;

    SELECT FORMAT(FechaCreacion, 'yyyy-MM') AS Mes, COUNT(*) AS Total
      FROM Incidencias
     WHERE CAST(FechaCreacion AS DATE) BETWEEN @Desde AND @Hasta
       AND (@IdArea IS NULL OR IdArea = @IdArea)
     GROUP BY FORMAT(FechaCreacion, 'yyyy-MM')
     ORDER BY Mes;
END
GO
