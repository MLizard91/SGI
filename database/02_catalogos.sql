/* =====================================================================
   Script 02: Datos iniciales de catálogos
   ===================================================================== */

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO
USE SGI_Mexticacan;
GO

INSERT INTO Roles (Nombre, Descripcion) VALUES
 (N'Administrador',      N'Gestión de usuarios, configuración y reportes consolidados'),
 (N'Encargado de Área',  N'Atiende y da seguimiento a las incidencias de su área'),
 (N'Recepcionista',      N'Recibe, valida y canaliza los reportes ciudadanos'),
 (N'Operativo',          N'Personal de campo que resuelve las incidencias asignadas'),
 (N'Ciudadano',          N'Reporta incidencias desde la aplicación móvil');
GO

INSERT INTO Areas (Nombre, Descripcion, Color, Icono) VALUES
 (N'Alumbrado Público',  N'Fallas en luminarias, postes, cables y sistemas de iluminación', '#F59E0B', 'lightbulb'),
 (N'Parques y Jardines', N'Áreas verdes, mobiliario urbano, riego y mantenimiento',          '#16A34A', 'tree'),
 (N'Aseo Público',       N'Acumulación de basura, lotes baldíos y recolección de residuos',  '#7C3AED', 'trash'),
 (N'Obras Públicas',     N'Baches, banquetas, guarniciones, señalización y drenaje',         '#DC2626', 'road'),
 (N'Agua Potable',       N'Fugas, falta de suministro, baja presión, calidad y tuberías',    '#0284C7', 'water');
GO

DECLARE @Alumbrado INT = (SELECT IdArea FROM Areas WHERE Nombre = N'Alumbrado Público');
DECLARE @Parques   INT = (SELECT IdArea FROM Areas WHERE Nombre = N'Parques y Jardines');
DECLARE @Aseo      INT = (SELECT IdArea FROM Areas WHERE Nombre = N'Aseo Público');
DECLARE @Obras     INT = (SELECT IdArea FROM Areas WHERE Nombre = N'Obras Públicas');
DECLARE @Agua      INT = (SELECT IdArea FROM Areas WHERE Nombre = N'Agua Potable');

INSERT INTO Categorias (IdArea, Nombre) VALUES
 (@Alumbrado, N'Luminaria apagada'),
 (@Alumbrado, N'Luminaria intermitente'),
 (@Alumbrado, N'Poste dañado'),
 (@Alumbrado, N'Cables expuestos o caídos'),
 (@Parques,   N'Área verde en mal estado'),
 (@Parques,   N'Mobiliario urbano dañado'),
 (@Parques,   N'Falta de riego'),
 (@Parques,   N'Poda de árboles'),
 (@Aseo,      N'Basura acumulada en vía pública'),
 (@Aseo,      N'Lote baldío con basura'),
 (@Aseo,      N'Falta de recolección'),
 (@Obras,     N'Bache'),
 (@Obras,     N'Banqueta o guarnición dañada'),
 (@Obras,     N'Señalización dañada o faltante'),
 (@Obras,     N'Drenaje obstruido o colapsado'),
 (@Agua,      N'Fuga de agua'),
 (@Agua,      N'Falta de suministro'),
 (@Agua,      N'Baja presión'),
 (@Agua,      N'Calidad del agua'),
 (@Agua,      N'Tubería dañada');
GO

INSERT INTO Estatus (IdEstatus, Nombre, Color, Orden, EsFinal) VALUES
 (1, N'Recibida',    '#64748B', 1, 0),
 (2, N'En revisión', '#0EA5E9', 2, 0),
 (3, N'Asignada',    '#6366F1', 3, 0),
 (4, N'En proceso',  '#F59E0B', 4, 0),
 (5, N'Resuelta',    '#16A34A', 5, 1),
 (6, N'Cerrada',     '#15803D', 6, 1),
 (7, N'Rechazada',   '#DC2626', 7, 1);
GO
