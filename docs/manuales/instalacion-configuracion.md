# Manual de instalación y configuración

## Alcance

Estas instrucciones son para una instalación local de desarrollo o una instancia controlada por el equipo técnico. No despliegues un servicio de producción exponiendo la API de desarrollo. Las instrucciones paso a paso de Windows están en la [guía de comandos](../GUIA-COMANDOS-WINDOWS.md).

## Requisitos

- Windows con PowerShell (los comandos se pueden adaptar para otros sistemas).
- Node.js 20 o superior y npm.
- SQL Server 2019/2022 con autenticación SQL y TCP/IP habilitado; SSMS o una herramienta equivalente.
- Expo Go para pruebas móviles con Expo.
- Acceso a la red local para que el teléfono alcance el servidor de desarrollo.

## Preparar SQL Server

1. Inicia SQL Server y crea/inicializa la base utilizando los scripts del repositorio, en este orden:
   1. `database\01_esquema.sql`
   2. `database\02_catalogos.sql`
   3. `database\03_procedimientos.sql`
2. Habilita TCP/IP en SQL Server Configuration Manager y configura el puerto que utilizarás (1433 es el valor habitual).
3. Confirma que el servidor acepta la autenticación seleccionada y que las reglas de firewall permiten el acceso solo desde redes y equipos autorizados.

Ejecuta scripts de inicialización solo en una base nueva o tras revisar sus efectos. No los ejecutes a ciegas sobre una base con datos de producción.

## Configurar y arrancar la API

Desde PowerShell, en la raíz del repositorio:

```powershell
Set-Location .\backend
npm install
Copy-Item .env.example .env
notepad .env
```

Configura en `backend\.env` los valores apropiados:

| Variable | Uso |
|---|---|
| `PORT` | Puerto de la API (por defecto `4000`). |
| `DB_SERVER`, `DB_PORT`, `DB_NAME` | Servidor, puerto y base de datos SQL Server. |
| `DB_USER`, `DB_PASSWORD` | Cuenta de base de datos con los permisos requeridos. |
| `DB_ENCRYPT`, `DB_TRUST_CERT` | Opciones TLS de la conexión a SQL Server; define los valores según el certificado y el entorno. |
| `JWT_SECRET` | Secreto largo y aleatorio para firmar sesiones. Debe ser privado y diferente en cada entorno. |
| `JWT_EXPIRES_IN` | Vigencia del token (por defecto `7d`). |
| `CORS_ORIGIN` | Origen u orígenes web permitidos separados por coma. Restringe el valor en despliegues no locales. |
| `MAX_IMAGE_MB` | Tamaño máximo permitido por imagen (por defecto `8` MB). |

No copies secretos reales en el repositorio. No compartas `.env` ni credenciales por correo o chat sin protección.

### Crear el primer administrador

Con la base configurada, crea una cuenta institucional:

```powershell
npm run crear-admin -- admin@mexticacan.gob.mx "UsaUnaClaveSegura" "Administrador General"
```

Sustituye correo, contraseña y nombre por valores seguros. La contraseña debe tener al menos 8 caracteres. El comando puede actualizar una cuenta con el mismo correo; verifica los datos antes de ejecutarlo de nuevo.

Arranca la API:

```powershell
npm run dev
```

Comprueba la salud del servicio abriendo `http://localhost:4000/api/salud`.

## Configurar el panel web

Abre otra terminal en la raíz:

```powershell
Set-Location .\web
npm install
Copy-Item .env.example .env
notepad .env
```

En `web\.env`, ajusta `VITE_API_URL` a la URL de la API. Para desarrollo local, normalmente es `http://localhost:4000`. Inicia Vite:

```powershell
npm run dev
```

Abre `http://localhost:5173` e inicia sesión con una cuenta autorizada.

## Configurar Expo móvil

En una tercera terminal, obtén la IPv4 de la computadora con `ipconfig`. El teléfono debe poder comunicarse por red con esa computadora.

```powershell
Set-Location .\mobile
npm install
Copy-Item .env.example .env
notepad .env
```

En `mobile\.env`, configura la IP alcanzable de la computadora y el puerto de la API:

```dotenv
EXPO_PUBLIC_API_URL=http://192.168.1.50:4000
```

Reemplaza la IP de ejemplo. No uses `localhost` como dirección de API desde el teléfono: apuntaría al propio teléfono. Inicia Expo:

```powershell
npx expo start
```

Escanea el QR con Expo Go. Permite conexiones en el firewall solo en la red de desarrollo necesaria.

## Pruebas y cierre

En una base exclusivamente de desarrollo, ejecuta la suite desde `backend`:

```powershell
npm test
```

Las pruebas crean registros temporales; no las ejecutes en producción. Al terminar, presiona `Ctrl+C` en cada terminal de API, web y Expo. Los comandos completos y las comprobaciones de conectividad están en la [guía de comandos de Windows](../GUIA-COMANDOS-WINDOWS.md).
