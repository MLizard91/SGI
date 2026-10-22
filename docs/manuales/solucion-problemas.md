# Guía de solución de problemas comunes

Antes de reiniciar o repetir una operación, anota el mensaje visible, la hora y los pasos realizados. No compartas contraseñas, tokens, cookies ni archivos `.env`.

| Síntoma | Causa probable | Qué hacer |
|---|---|---|
| `npm` muestra `ENOENT` y no encuentra `package.json` | El comando se ejecutó desde la raíz, no desde el proyecto correspondiente. | En PowerShell entra en `backend`, `web` o `mobile` con `Set-Location .\backend` (cambia la carpeta según el proceso), instala dependencias allí y ejecuta su comando. Sigue la [guía de comandos](../GUIA-COMANDOS-WINDOWS.md). |
| La API no inicia o SQL Server rechaza la conexión | Servicio detenido, valores incorrectos en `.env`, TCP/IP deshabilitado o firewall. | Verifica que SQL Server esté activo; revisa en privado `DB_SERVER`, `DB_PORT`, `DB_NAME`, `DB_USER` y `DB_PASSWORD`; confirma TCP/IP y el puerto configurado. No pegues el `.env` en una solicitud de soporte. |
| `http://localhost:4000/api/salud` no responde | API no está iniciada, el puerto cambió o el proceso falló al arrancar. | Revisa la terminal del backend, confirma `PORT` y vuelve a probar. Si hay error de base de datos, resuélvelo antes de reiniciar el resto. |
| El panel web no abre o muestra error de red | Vite no está ejecutándose o la URL de API no coincide. | Revisa la terminal de `web`, abre `http://localhost:5173` y confirma que `VITE_API_URL` apunte al backend activo. |
| El teléfono no conecta a la API | Se configuró `localhost`, la IP cambió o ambos equipos no comparten una ruta de red. | En `mobile\.env`, establece `EXPO_PUBLIC_API_URL` con la IPv4 de la computadora y el puerto API. Comprueba que teléfono y computadora estén en la red autorizada y que el firewall permita la conexión. Reinicia Expo después de editar variables. |
| Expo Go no abre el QR o muestra un error de conexión | Metro no está activo, el QR es anterior o la red bloquea el modo LAN. | Mantén activa la terminal móvil, ejecuta `npx expo start` y escanea el QR actual. Verifica que el teléfono pueda alcanzar el equipo. Consulta al soporte antes de cambiar el modo de red. |
| No hay reportes visibles | Filtros activos o el rol limita los datos. | Limpia los filtros. Confirma que el usuario tenga el área correcta y, para Operativo, que el reporte esté asignado a su cuenta. Ciudadanía solo ve reportes propios. |
| El ciudadano no encuentra un reporte enviado | Sesión distinta, conectividad interrumpida o el envío no se completó. | Confirma que inició sesión con la cuenta usada al reportar, actualiza **Mis reportes** y revisa si aparece el folio. Antes de reenviar, comprueba que no exista ya para evitar duplicados. |
| La ubicación GPS es incorrecta o no aparece | Permiso denegado, GPS apagado o señal débil. | Activa ubicación en el teléfono y concede permiso a la app. En el formulario, mueve el marcador o toca el punto correcto. |
| No se puede subir una fotografía | Falta permiso de cámara/galería, tipo no admitido o tamaño sobre el límite configurado. | Concede permiso, prueba con JPG/PNG/WEBP/HEIC y reduce el tamaño. Los reportes admiten hasta 5 imágenes y el servidor aplica un límite por archivo. |
| El teclado cubre un campo móvil | Área de pantalla reducida o pantalla de la app antigua. | Desplaza el formulario y toca el campo para llevarlo a la vista; cierra el teclado arrastrando o usando atrás. Actualiza/reinicia Expo Go con el bundle vigente. Si persiste, informa modelo de teléfono, sistema y pantalla afectada. |
| Un botón de gestión no aparece o devuelve acceso denegado | El rol no tiene permiso para esa acción o el reporte está fuera de su alcance. | Pide al administrador confirmar rol, área y asignación. No cambies permisos por fuera del proceso municipal. |
| El cambio no se refleja inmediatamente | Conectividad intermitente o notificación de tiempo real no recibida. | Actualiza la lista o vuelve a abrir el detalle y confirma el estatus/historial antes de repetir la operación. |

## Escalamiento técnico

Si el problema persiste:

1. Guarda el texto del error y los pasos reproducibles, sin incluir secretos.
2. Para un error de API, el responsable técnico puede revisar la terminal del backend y la conectividad con SQL Server.
3. Para web o móvil, registra navegador/dispositivo, versión, red y pantalla afectada.
4. Reporta el folio si se trata de una incidencia.
5. Usa el canal oficial que indique el Ayuntamiento. No adjuntes bases de datos, fotos de ciudadanos ni credenciales a canales públicos.

En un entorno de desarrollo, al terminar una prueba puede detenerse cada proceso con `Ctrl+C` en su propia terminal. No reinicies servicios ni restaures respaldos de producción sin autorización.
