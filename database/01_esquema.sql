/* =====================================================================
   Sistema de Gestión de Incidencias (SGI) - Municipio de Mexticacán, Jal.
   Script 01: Creación de base de datos y tablas (SQL Server)
   ===================================================================== */

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

IF DB_ID('SGI_Mexticacan') IS NULL
    CREATE DATABASE SGI_Mexticacan;
GO

USE SGI_Mexticacan;
GO

/* ---------------------------------------------------------------------
   Catálogos
   --------------------------------------------------------------------- */

-- Perfiles y roles del sistema
CREATE TABLE Roles (
    IdRol        INT IDENTITY(1,1) PRIMARY KEY,
    Nombre       NVARCHAR(50)  NOT NULL UNIQUE,
    Descripcion  NVARCHAR(200) NULL
);
GO

-- Áreas municipales (Alumbrado, Parques, Aseo, Obras, Agua)
CREATE TABLE Areas (
    IdArea       INT IDENTITY(1,1) PRIMARY KEY,
    Nombre       NVARCHAR(100) NOT NULL UNIQUE,
    Descripcion  NVARCHAR(300) NULL,
    Color        VARCHAR(7)    NOT NULL DEFAULT '#1E3A8A',  -- color para mapas y gráficas
    Icono        NVARCHAR(50)  NULL,
    Activa       BIT           NOT NULL DEFAULT 1
);
GO

-- Categorías de incidencia (cada una pertenece a un área)
CREATE TABLE Categorias (
    IdCategoria  INT IDENTITY(1,1) PRIMARY KEY,
    IdArea       INT           NOT NULL REFERENCES Areas(IdArea),
    Nombre       NVARCHAR(100) NOT NULL,
    Activa       BIT           NOT NULL DEFAULT 1,
    CONSTRAINT UQ_Categorias_Area_Nombre UNIQUE (IdArea, Nombre)
);
GO

-- Estatus del ciclo de vida de una incidencia
CREATE TABLE Estatus (
    IdEstatus    INT           PRIMARY KEY,
    Nombre       NVARCHAR(50)  NOT NULL UNIQUE,
    Color        VARCHAR(7)    NOT NULL,
    Orden        INT           NOT NULL,
    EsFinal      BIT           NOT NULL DEFAULT 0
);
GO

/* ---------------------------------------------------------------------
   Usuarios
   --------------------------------------------------------------------- */
CREATE TABLE Usuarios (
    IdUsuario      INT IDENTITY(1,1) PRIMARY KEY,
    Nombre         NVARCHAR(100) NOT NULL,
    Apellidos      NVARCHAR(150) NULL,
    Correo         NVARCHAR(150) NOT NULL UNIQUE,
    Telefono       NVARCHAR(20)  NULL,
    PasswordHash   NVARCHAR(255) NOT NULL,
    IdRol          INT           NOT NULL REFERENCES Roles(IdRol),
    IdArea         INT           NULL REFERENCES Areas(IdArea),  -- solo para encargados / operativos
    Activo         BIT           NOT NULL DEFAULT 1,
    FechaRegistro  DATETIME2(0)  NOT NULL DEFAULT SYSUTCDATETIME(),
    UltimoAcceso   DATETIME2(0)  NULL
);
GO

/* ---------------------------------------------------------------------
   Incidencias
   --------------------------------------------------------------------- */
CREATE TABLE Incidencias (
    IdIncidencia       INT IDENTITY(1,1) PRIMARY KEY,
    -- Folio legible para el ciudadano, p. ej. MEX-000123
    Folio              AS ('MEX-' + RIGHT('000000' + CAST(IdIncidencia AS VARCHAR(10)), 6)) PERSISTED,
    Titulo             NVARCHAR(150) NOT NULL,
    Descripcion        NVARCHAR(MAX) NOT NULL,
    IdCategoria        INT           NOT NULL REFERENCES Categorias(IdCategoria),
    IdArea             INT           NOT NULL REFERENCES Areas(IdArea),
    IdEstatus          INT           NOT NULL DEFAULT 1 REFERENCES Estatus(IdEstatus),
    Prioridad          NVARCHAR(10)  NOT NULL DEFAULT 'Media'
                       CONSTRAINT CK_Incidencias_Prioridad CHECK (Prioridad IN ('Baja','Media','Alta','Urgente')),
    Latitud            DECIMAL(9,6)  NOT NULL,
    Longitud           DECIMAL(9,6)  NOT NULL,
    PrecisionMetros    DECIMAL(8,2)  NULL,
    Direccion          NVARCHAR(300) NULL,
    Comunidad          NVARCHAR(100) NULL,
    IdCiudadano        INT           NOT NULL REFERENCES Usuarios(IdUsuario),
    IdAsignado         INT           NULL REFERENCES Usuarios(IdUsuario),
    FechaCreacion      DATETIME2(0)  NOT NULL DEFAULT SYSUTCDATETIME(),
    FechaActualizacion DATETIME2(0)  NOT NULL DEFAULT SYSUTCDATETIME(),
    FechaResolucion    DATETIME2(0)  NULL
);
GO

CREATE INDEX IX_Incidencias_Estatus    ON Incidencias (IdEstatus);
CREATE INDEX IX_Incidencias_Area       ON Incidencias (IdArea, IdEstatus);
CREATE INDEX IX_Incidencias_Ciudadano  ON Incidencias (IdCiudadano);
CREATE INDEX IX_Incidencias_Asignado   ON Incidencias (IdAsignado);
CREATE INDEX IX_Incidencias_Fecha      ON Incidencias (FechaCreacion DESC);
GO

-- Fotografías del reporte (ciudadano) y evidencias de atención (personal municipal)
CREATE TABLE IncidenciaImagenes (
    IdImagen      INT IDENTITY(1,1) PRIMARY KEY,
    IdIncidencia  INT           NOT NULL REFERENCES Incidencias(IdIncidencia) ON DELETE CASCADE,
    Ruta          NVARCHAR(300) NOT NULL,
    Tipo          NVARCHAR(20)  NOT NULL DEFAULT 'Reporte'
                  CONSTRAINT CK_Imagenes_Tipo CHECK (Tipo IN ('Reporte','Evidencia')),
    IdUsuario     INT           NOT NULL REFERENCES Usuarios(IdUsuario),
    FechaSubida   DATETIME2(0)  NOT NULL DEFAULT SYSUTCDATETIME()
);
GO
CREATE INDEX IX_Imagenes_Incidencia ON IncidenciaImagenes (IdIncidencia);
GO

-- Comentarios y seguimiento
CREATE TABLE Comentarios (
    IdComentario  INT IDENTITY(1,1) PRIMARY KEY,
    IdIncidencia  INT            NOT NULL REFERENCES Incidencias(IdIncidencia) ON DELETE CASCADE,
    IdUsuario     INT            NOT NULL REFERENCES Usuarios(IdUsuario),
    Texto         NVARCHAR(1000) NOT NULL,
    EsInterno     BIT            NOT NULL DEFAULT 0,  -- 1 = solo visible para personal municipal
    Fecha         DATETIME2(0)   NOT NULL DEFAULT SYSUTCDATETIME()
);
GO
CREATE INDEX IX_Comentarios_Incidencia ON Comentarios (IdIncidencia);
GO

-- Historial de actividades (bitácora de cambios de cada incidencia)
CREATE TABLE HistorialIncidencia (
    IdHistorial        INT IDENTITY(1,1) PRIMARY KEY,
    IdIncidencia       INT           NOT NULL REFERENCES Incidencias(IdIncidencia) ON DELETE CASCADE,
    IdUsuario          INT           NULL REFERENCES Usuarios(IdUsuario),
    Accion             NVARCHAR(50)  NOT NULL,   -- Creación, CambioEstatus, Asignación, Prioridad, Evidencia
    IdEstatusAnterior  INT           NULL REFERENCES Estatus(IdEstatus),
    IdEstatusNuevo     INT           NULL REFERENCES Estatus(IdEstatus),
    Detalle            NVARCHAR(500) NULL,
    Fecha              DATETIME2(0)  NOT NULL DEFAULT SYSUTCDATETIME()
);
GO
CREATE INDEX IX_Historial_Incidencia ON HistorialIncidencia (IdIncidencia, Fecha);
GO

-- Notificaciones para los usuarios
CREATE TABLE Notificaciones (
    IdNotificacion  INT IDENTITY(1,1) PRIMARY KEY,
    IdUsuario       INT           NOT NULL REFERENCES Usuarios(IdUsuario),
    IdIncidencia    INT           NULL REFERENCES Incidencias(IdIncidencia) ON DELETE CASCADE,
    Titulo          NVARCHAR(150) NOT NULL,
    Mensaje         NVARCHAR(500) NOT NULL,
    Leida           BIT           NOT NULL DEFAULT 0,
    Fecha           DATETIME2(0)  NOT NULL DEFAULT SYSUTCDATETIME()
);
GO
CREATE INDEX IX_Notificaciones_Usuario ON Notificaciones (IdUsuario, Leida, Fecha DESC);
GO
