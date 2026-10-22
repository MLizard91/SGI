# Material de soporte y guías rápidas

## Guía rápida: iniciar el sistema en desarrollo

Se necesitan tres terminales y una instancia de SQL Server activa.

| Terminal | Carpeta | Comando de inicio | Verificación |
|---|---|---|---|
| API | `backend` | `npm run dev` | Abrir `http://localhost:4000/api/salud`. |
| Panel web | `web` | `npm run dev` | Abrir `http://localhost:5173`. |
| Móvil | `mobile` | `npx expo start` | Abrir Expo Go y escanear el QR. |

Todos los comandos de instalación y configuración están en [Comandos para Windows](../GUIA-COMANDOS-WINDOWS.md).

## Guía rápida: ciudadanía

1. Abre SGI Mexticacán y regístrate o inicia sesión.
2. Pulsa **＋ Reportar**.
3. Elige área y categoría; describe el problema.
4. Adjunta entre 1 y 5 fotografías.
5. Confirma el punto del mapa y envía.
6. Guarda el folio y consulta **Mis reportes** para ver avances o escribir un comentario.

## Guía rápida: personal municipal

1. Inicia sesión en el panel web con tu cuenta institucional.
2. Abre **Incidencias**; busca o filtra el reporte.
3. Abre el folio, revisa descripción, fotos y ubicación.
4. Actualiza el estatus; si tu rol lo permite, asigna personal y prioridad.
5. Adjunta evidencia y deja una nota pública o un comentario interno según corresponda.
6. Verifica el resultado en el historial.

## Lista de comprobación para abrir atención

- [ ] SQL Server se encuentra activo y la API logra conectar.
- [ ] `http://localhost:4000/api/salud` responde desde el equipo de prueba.
- [ ] El panel web carga y permite iniciar sesión.
- [ ] Expo abre la app y el teléfono puede llegar a la dirección configurada de API.
- [ ] Se comprobó la red y no se está usando una base de producción para pruebas.

## Datos que conviene incluir al solicitar soporte

- Fecha y hora aproximadas, incluido el huso horario.
- Módulo y pantalla donde ocurrió el problema.
- Pasos para reproducirlo y resultado esperado frente al resultado obtenido.
- Tipo de dispositivo, sistema operativo y navegador o versión de Expo Go.
- Folio del reporte, si aplica; no adjuntes datos personales que no sean necesarios.
- Texto del error sin contraseñas, tokens, cookies ni valores de `.env`.

## Canales de atención

Los canales oficiales de soporte técnico y atención ciudadana deben ser comunicados por el H. Ayuntamiento. Este repositorio no configura un canal de soporte público; confirma con el área responsable antes de publicar teléfonos o correos.
