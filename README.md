# SGI · Sistema de Gestión de Incidencias — Municipio de Mexticacán, Jalisco

Aplicación para que los ciudadanos reporten incidencias de servicios públicos **desde su celular (con fotos y ubicación GPS)** y para que el personal del H. Ayuntamiento las **administre desde un panel web**, todo conectado en **tiempo real**.

Áreas cubiertas: **Alumbrado Público, Parques y Jardines, Aseo Público, Obras Públicas y Agua Potable**.

```
┌────────────────────┐        API REST + Socket.IO        ┌────────────────────┐
│  App móvil (Expo)  │ ─────────────────────────────────▶ │                    │
│  Ciudadano reporta │ ◀─── avisos en tiempo real ─────── │  Backend Node.js   │ ──▶  SQL Server
│  fotos + GPS       │                                    │  (Express)         │      (SGI_Mexticacan)
└────────────────────┘                                    │                    │
┌────────────────────┐                                    │  /uploads (fotos)  │
│  Panel web (React) │ ─────────────────────────────────▶ │                    │
│  Personal municipal│ ◀─── nuevos reportes al instante ─ │                    │
└────────────────────┘                                    └────────────────────┘
```

Todo está hecho en **JavaScript**: el mismo lenguaje en el servidor, la web y el celular.

| Carpeta     | Qué es                                  | Tecnología                                   |
|-------------|-----------------------------------------|----------------------------------------------|
| `database/` | Scripts de la base de datos             | SQL Server (T-SQL)                           |
| `backend/`  | API REST + tiempo real                  | Node.js, Express, mssql, Socket.IO, JWT      |
| `web/`      | Panel de administración                 | React + Vite, Leaflet (mapas OpenStreetMap)  |
| `mobile/`   | App de reportes para ciudadanos         | React Native + Expo (cámara, GPS, mapas)     |
| `docs/`     | Documentación de la API                 | Markdown                                     |

---

## Funcionalidades

**App móvil (ciudadano)**
- Registro e inicio de sesión.
- Nuevo reporte: área → tipo de incidencia, título, descripción, **hasta 5 fotos** (cámara o galería) y **ubicación GPS en tiempo real** sobre el mapa (se puede ajustar tocando el mapa o arrastrando el marcador). La dirección se llena automáticamente.
- Lista de "Mis reportes" con folio (ej. `MEX-000123`) y estatus que **se actualiza solo** cuando el municipio lo cambia.
- Detalle con barra de avance, fotos, evidencias del trabajo realizado, mapa, historial y comentarios.

**Panel web (personal municipal)**
- Dashboard con indicadores (pendientes, en atención, resueltas, urgentes, tiempo promedio de resolución), gráficas por área y por estatus, mapa de incidencias abiertas y reportes recientes.
- Lista de incidencias con filtros (área, estatus, prioridad, fechas, búsqueda) y aviso **en tiempo real** de reportes nuevos.
- Detalle: cambiar estatus (con nota al ciudadano), asignar personal, prioridad, subir evidencias, comentarios públicos o internos, historial completo.
- Mapa general con colores por área o por estatus.
- Notificaciones en vivo (campana).
- Administración de usuarios y roles. Exportación a CSV (Excel).

**Roles**

| Rol               | Qué puede hacer |
|-------------------|-----------------|
| Administrador     | Todo, incluida la gestión de usuarios |
| Recepcionista     | Ve todas las incidencias, las valida, asigna y prioriza |
| Encargado de Área | Ve y gestiona solo las incidencias de su área |
| Operativo         | Ve solo lo que tiene asignado; puede marcar *En proceso* / *Resuelta* y subir evidencias |
| Ciudadano         | Reporta desde la app y ve solo sus reportes |

**Estatus:** Recibida → En revisión → Asignada → En proceso → Resuelta → Cerrada (o Rechazada).

---

## Requisitos

- **Node.js 20 o superior** — https://nodejs.org
- **SQL Server** 2019/2022 (Express o Developer, gratuitos) y **SSMS** o Azure Data Studio.
- En el celular: la app **Expo Go** (Play Store / App Store) para probar.
- La computadora y el celular deben estar en la **misma red Wi-Fi** durante el desarrollo.

---

## Instalación paso a paso

### 1. Base de datos (SQL Server)

1. Abre SSMS y conéctate a tu servidor.
2. Ejecuta **en orden** los scripts de `database/`:
   1. `01_esquema.sql` — crea la base `SGI_Mexticacan` y las tablas.
   2. `02_catalogos.sql` — áreas, categorías, estatus y roles.
   3. `03_procedimientos.sql` — procedimientos almacenados.
3. Asegúrate de que SQL Server acepte **autenticación SQL** (usuario y contraseña) y que el protocolo **TCP/IP** esté habilitado en *SQL Server Configuration Manager* (puerto 1433). Reinicia el servicio después de cambiarlo.

> Tip: si no tienes SQL Server instalado, con Docker puedes levantar uno en un minuto:
> `docker run -e ACCEPT_EULA=Y -e "MSSQL_SA_PASSWORD=TuPassword123!" -p 1433:1433 -d mcr.microsoft.com/mssql/server:2022-latest`

### 2. Backend (API)

```bash
cd backend
npm install
cp .env.example .env        # en Windows: copy .env.example .env
```

Edita `.env` con los datos de tu SQL Server (`DB_SERVER`, `DB_USER`, `DB_PASSWORD`) y cambia `JWT_SECRET` por una frase larga.

Crea el primer administrador y arranca el servidor:

```bash
npm run crear-admin -- admin@mexticacan.gob.mx "Admin12345" "Administrador General"
npm run dev
```

Debe aparecer `✔ Conectado a SQL Server` y `API SGI escuchando en http://localhost:4000`.
Prueba en el navegador: http://localhost:4000/api/salud

### 3. Panel web

```bash
cd web
npm install
cp .env.example .env        # VITE_API_URL=http://localhost:4000
npm run dev
```

Abre http://localhost:5173 e inicia sesión con el administrador. Desde **Usuarios** crea encargados de área, recepcionistas y personal operativo.

### 4. App móvil

1. Averigua la IP de tu computadora en la red Wi-Fi (`ipconfig` en Windows, `ifconfig`/`ip a` en Mac/Linux), por ejemplo `192.168.1.50`.
2. Configura y arranca:

```bash
cd mobile
npm install
cp .env.example .env        # EXPO_PUBLIC_API_URL=http://192.168.1.50:4000  (tu IP, NO localhost)
npx expo start
```

3. Escanea el código QR con **Expo Go** (Android) o con la cámara (iPhone).
4. Regístrate como ciudadano y envía tu primer reporte. Verás cómo aparece **al instante** en el panel web.

> Si el celular no conecta: revisa que el Firewall de Windows permita el puerto **4000** y que ambos dispositivos estén en la misma red.

---

## Estructura del código

```
backend/
  src/
    server.js                 Arranque (HTTP + Socket.IO)
    app.js                    Configuración de Express (CORS, JSON, /uploads)
    config/db.js              Conexión a SQL Server (pool de mssql)
    socket.js                 Tiempo real: salas por usuario, área y rol
    routes/index.js           Todos los endpoints de la API
    controllers/              Lógica de cada módulo (auth, incidencias, usuarios, reportes, notificaciones, catálogos)
    middleware/               auth (JWT y roles), upload (fotos con multer), errores
    services/                 notificaciones (BD + envío en vivo)
  scripts/crear-admin.js      Crea el usuario administrador
  uploads/                    Fotos subidas (no se guardan en git)

web/src/
  api.js                      fetch a la API con el token
  context/                    Sesión (AuthContext) y tiempo real (SocketContext)
  components/                 Layout, mapa, notificaciones, badges
  pages/                      Login, Dashboard, Incidencias, Detalle, Mapa, Usuarios

mobile/src/
  config.js                   URL de la API y colores
  api.js                      fetch a la API (token guardado con SecureStore)
  context/                    Sesión y tiempo real
  components/UI.js            Botones, campos, chips, tarjetas
  app/                        Pantallas (Expo Router: cada archivo es una pantalla)
    login.js, registro.js
    reportes/index.js         Mis reportes
    reportes/nuevo.js         Nuevo reporte (cámara + GPS + mapa)
    reportes/[id].js          Detalle y seguimiento
```

La lista completa de endpoints está en [`docs/API.md`](docs/API.md).

---

## Notas importantes

- **Base de datos:** el reporte preliminar menciona MySQL; este proyecto usa **SQL Server** como se decidió. Las fechas se guardan en **UTC** y cada pantalla las muestra en la hora local del dispositivo.
- **Arquitectura:** el reporte describe microservicios (Autenticación, Incidencias, Notificaciones, Reportes, Usuarios). En esta primera versión cada servicio es un **módulo separado dentro de un solo servidor** (`controllers/` + `routes/`), que es más fácil de aprender, desplegar y depurar. Si más adelante se necesita, cada módulo se puede separar en su propio servicio detrás de un API Gateway sin reescribir la lógica.
- **Estado global:** en lugar de Redux se usa React Context (sesión y tiempo real), que es suficiente para este tamaño de aplicación y mucho más sencillo.
- **Mapas:** la web usa OpenStreetMap (gratis, sin API key). En la app, Expo Go funciona sin configuración; para publicar en Play Store con `eas build` necesitarás una API key de Google Maps para Android.
- **Fotos:** se guardan en `backend/uploads/` y en la BD solo se guarda la ruta. Respáldalas junto con la base de datos.
- **Producción:** usa HTTPS, cambia `JWT_SECRET`, restringe `CORS_ORIGIN` al dominio del panel y crea un usuario de SQL Server con permisos solo sobre `SGI_Mexticacan` (no uses `sa`).

---

Proyecto de Residencia Profesional — Ingeniería en Sistemas Computacionales, Instituto Tecnológico Superior de Nochistlán.
Autor: Marco Antonio Gómez Lizardi.
