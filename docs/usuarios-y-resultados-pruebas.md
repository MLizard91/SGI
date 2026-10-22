# Usuarios y resultados de pruebas

**Fecha:** 15 de octubre de 2026  
**Entorno:** SQL Server configurado para desarrollo  
**Resultado API:** 37 pruebas aprobadas, 0 fallidas

## Cuentas temporales utilizadas

Se crearon cuentas de prueba con correos `@prueba.local` para recorrer cada área. Las cuentas se eliminaron de SQL Server al terminar; esta lista es evidencia de prueba, no contiene usuarios activos ni contraseñas.

| Usuario de prueba | Correo utilizado | Rol | Área | Estado |
|---|---|---|---|---|
| Administrador de pruebas | `admin.1792081206224@prueba.local` | Administrador | — | Eliminada |
| Encargado de Alumbrado | `encargado1.1792081206224@prueba.local` | Encargado de Área | Alumbrado Público | Eliminada |
| Encargado de Parques | `encargado2.1792081206224@prueba.local` | Encargado de Área | Parques y Jardines | Eliminada |
| Encargado de Aseo | `encargado3.1792081206224@prueba.local` | Encargado de Área | Aseo Público | Eliminada |
| Encargado de Obras | `encargado4.1792081206224@prueba.local` | Encargado de Área | Obras Públicas | Eliminada |
| Encargado de Agua | `encargado5.1792081206224@prueba.local` | Encargado de Área | Agua Potable | Eliminada |
| Operativo de Alumbrado | `operativo.1792081206224@prueba.local` | Operativo | Alumbrado Público | Eliminada |
| Recepción | `recepcion.1792081206224@prueba.local` | Recepcionista | — | Eliminada |
| Ciudadana de Alumbrado | `ana.1792081206224@prueba.local` | Ciudadano | Alumbrado Público | Eliminada |
| Ciudadano de Parques | `ciudadano2.1792081206224@prueba.local` | Ciudadano | Parques y Jardines | Eliminada |
| Ciudadano de Aseo | `ciudadano3.1792081206224@prueba.local` | Ciudadano | Aseo Público | Eliminada |
| Ciudadano de Obras | `ciudadano4.1792081206224@prueba.local` | Ciudadano | Obras Públicas | Eliminada |
| Ciudadano de Agua | `ciudadano5.1792081206224@prueba.local` | Ciudadano | Agua Potable | Eliminada |
| Administrador de verificación web | `web.1792081674816@prueba.local` | Administrador | — | Eliminada |

## Cobertura

- Catálogos: 5 áreas, 20 categorías, 7 estatus y 5 roles.
- Registro, acceso, validaciones, permisos por rol y privacidad de datos.
- Reportes con ubicación y fotografías: formatos inválidos, límites de archivos y una incidencia en cada categoría.
- Asignación de personal, prioridades, cambios de estatus, comentarios públicos/internos, evidencias, historial y notificaciones en tiempo real.
- Dashboard, estadísticas por área, filtros, mapa y exportación CSV.
- 20 reportes simultáneos; todos fueron creados con folios únicos.
- Web: inicio de sesión temporal, dashboard, lista de incidencias y administración de usuarios cargaron en navegador.
- Móvil: Expo Doctor pasó 21/21 verificaciones y se generó el bundle Android. No se hizo una prueba táctil en un teléfono o emulador.

La limpieza se comprobó en SQL Server: **0 usuarios y 0 incidencias** asociados a las cuentas de la suite. El administrador temporal usado para la revisión web también se eliminó.

El archivo local generado con los correos, áreas y tiempos de respuesta se guarda en `backend/tests/resultados/usuarios-prueba.json`; está excluido de Git y se regenera al ejecutar `npm test`.

## Observaciones

- `npm run build` de web finalizó correctamente.
- Expo Doctor inicialmente reportó cinco versiones de parche desalineadas. Se actualizaron con `npx expo install --fix`; después, las 21 verificaciones pasaron.
- Durante esa actualización npm reportó 28 avisos de vulnerabilidad (10 moderados y 18 altos). No se aplicó una actualización forzada de dependencias como parte de estas pruebas.
