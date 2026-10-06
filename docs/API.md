# API REST — SGI Mexticacán

URL base: `http://<servidor>:4000/api`

- Formato: JSON (excepto subida de fotos, que usa `multipart/form-data`).
- Autenticación: encabezado `Authorization: Bearer <token>` (el token se obtiene en `/auth/login` o `/auth/registro`).
- Errores: `{ "mensaje": "descripción del error" }` con código HTTP 400, 401, 403, 404, 409 o 500.
- Fotos: se sirven en `http://<servidor>:4000/<Ruta>` (ej. `http://localhost:4000/uploads/archivo.jpg`).

## Autenticación

| Método | Ruta              | Acceso  | Body / descripción |
|--------|-------------------|---------|--------------------|
| POST   | `/auth/registro`  | Público | `{ nombre, apellidos?, telefono?, correo, password }` — crea un **Ciudadano**. Devuelve `{ token, usuario }` |
| POST   | `/auth/login`     | Público | `{ correo, password }` → `{ token, usuario }` |
| GET    | `/auth/perfil`    | Sesión  | Datos del usuario actual |

## Catálogos

| Método | Ruta         | Acceso  | Descripción |
|--------|--------------|---------|-------------|
| GET    | `/catalogos` | Público | `{ areas: [{ ..., Categorias: [] }], estatus, roles, prioridades }` |

## Incidencias

| Método | Ruta                             | Acceso | Descripción |
|--------|----------------------------------|--------|-------------|
| GET    | `/incidencias`                   | Sesión | Lista paginada. Query: `estatus, area, prioridad, buscar, desde, hasta, abiertas=1, pagina, limite`. Respuesta `{ datos, total, pagina, limite }`. Cada rol ve solo lo que le corresponde |
| GET    | `/incidencias/mapa`              | Sesión | Puntos para el mapa. Query: `area, estatus, abiertas=1` |
| GET    | `/incidencias/:id`               | Sesión | Detalle con `imagenes`, `comentarios` e `historial` |
| POST   | `/incidencias`                   | Sesión | **multipart**: `titulo, descripcion, idCategoria, latitud, longitud, precision?, direccion?, comunidad?` + `imagenes` (1 a 5 archivos JPG/PNG/WEBP/HEIC) |
| PATCH  | `/incidencias/:id/estatus`       | Personal | `{ idEstatus, comentario? }` (Operativo solo 4 = En proceso, 5 = Resuelta) |
| PATCH  | `/incidencias/:id/asignar`       | Admin, Recepción, Encargado | `{ idAsignado }` |
| PATCH  | `/incidencias/:id/prioridad`     | Admin, Recepción, Encargado | `{ prioridad: "Baja" \| "Media" \| "Alta" \| "Urgente" }` |
| POST   | `/incidencias/:id/comentarios`   | Sesión | `{ texto, esInterno? }` (`esInterno` solo para personal; el ciudadano no lo ve) |
| POST   | `/incidencias/:id/evidencias`    | Personal | **multipart**: `imagenes` (fotos del trabajo realizado) |

Ejemplo con `curl`:

```bash
curl -X POST http://localhost:4000/api/incidencias \
  -H "Authorization: Bearer $TOKEN" \
  -F titulo="Lámpara apagada" -F descripcion="No enciende desde el lunes" \
  -F idCategoria=1 -F latitud=21.2667 -F longitud=-102.7833 \
  -F imagenes=@foto.jpg
```

## Usuarios

| Método | Ruta                  | Acceso | Descripción |
|--------|-----------------------|--------|-------------|
| GET    | `/usuarios`           | Admin  | Query: `rol, buscar` |
| GET    | `/usuarios/personal`  | Admin, Recepción, Encargado | Personal asignable. Query: `area` |
| POST   | `/usuarios`           | Admin  | `{ nombre, apellidos?, correo, telefono?, password, idRol, idArea? }` |
| PUT    | `/usuarios/:id`       | Admin  | `{ nombre, apellidos?, telefono?, idRol, idArea?, activo, password? }` |

## Reportes y estadísticas

| Método | Ruta                  | Acceso | Descripción |
|--------|-----------------------|--------|-------------|
| GET    | `/reportes/resumen`   | Personal | Query: `desde, hasta, area`. `{ totales, porArea, porEstatus, porMes }` |
| GET    | `/reportes/exportar`  | Admin, Recepción, Encargado | Descarga CSV de incidencias. Query: `desde, hasta, area` |

## Notificaciones

| Método | Ruta                             | Acceso | Descripción |
|--------|----------------------------------|--------|-------------|
| GET    | `/notificaciones`                | Sesión | Últimas 30 + `noLeidas` |
| PATCH  | `/notificaciones/:id/leida`      | Sesión | Marca una como leída |
| PATCH  | `/notificaciones/leer-todas`     | Sesión | Marca todas como leídas |

## Tiempo real (Socket.IO)

Conexión: `io("http://<servidor>:4000", { auth: { token } })`

| Evento                    | Quién lo recibe | Datos |
|---------------------------|-----------------|-------|
| `incidencia:nueva`        | Admin, Recepción, área correspondiente, ciudadano que reportó | Incidencia completa |
| `incidencia:actualizada`  | Los mismos + personal asignado | Incidencia completa |
| `incidencia:comentario`   | Los mismos | Incidencia + `comentario` (null si es interno) |
| `notificacion`            | El usuario destinatario | Registro de la tabla `Notificaciones` |
