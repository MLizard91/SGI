# Guía para ejecutar SGI desde la terminal en Windows

La aplicación tiene tres procesos de desarrollo: **API (backend)**, **panel web** y **app móvil**. Mantén una terminal abierta para cada proceso. Antes de iniciarlos, SQL Server debe estar instalado y ejecutándose.

## 1. Preparar la base de datos

Si aún no has creado la base, abre SQL Server Management Studio (SSMS), conéctate y ejecuta estos scripts en este orden:

1. `database\01_esquema.sql`
2. `database\02_catalogos.sql`
3. `database\03_procedimientos.sql`

Verifica que SQL Server acepte conexiones por TCP/IP en el puerto `1433`.

## 2. Configurar y ejecutar el backend

Abre una terminal de PowerShell en la carpeta principal del proyecto (la carpeta que contiene `backend`, `web` y `mobile`). Ejecuta el bloque completo para entrar en la carpeta correcta:

```powershell
Set-Location .\backend
npm install
Copy-Item .env.example .env
```

> **Importante:** `npm run dev` debe ejecutarse dentro de `backend`, no desde la carpeta principal del proyecto. Si ya estás en `backend`, no vuelvas a ejecutar `Set-Location .\backend`.

Edita `backend\.env` y coloca los datos de tu SQL Server en `DB_SERVER`, `DB_USER` y `DB_PASSWORD`. Cambia también `JWT_SECRET` por una cadena larga y privada. Guarda el archivo.

La primera vez, crea el usuario administrador:

```powershell
npm run crear-admin -- admin@mexticacan.gob.mx "CambiaEstaClave123!" "Administrador General"
```

Guarda la contraseña de manera segura. Este paso no es necesario en cada inicio; el comando actualiza la cuenta si el correo ya existe.

Arranca la API y deja esta terminal abierta:

```powershell
npm run dev
```

Confirma que aparezcan los mensajes de conexión a SQL Server. Puedes comprobar la API en `http://localhost:4000/api/salud`.

## 3. Ejecutar el panel web

Abre una **segunda terminal de PowerShell** en la carpeta principal del proyecto y ejecuta el bloque completo:

```powershell
Set-Location .\web
npm install
Copy-Item .env.example .env
npm run dev
```

Abre `http://localhost:5173` en el navegador e inicia sesión con el administrador.

## 4. Ejecutar la app móvil

Para probar en un teléfono, conéctalo a la **misma red Wi-Fi** que la computadora. Abre una **tercera terminal de PowerShell** en la carpeta principal del proyecto. Primero consulta la dirección IPv4 de la computadora:

```powershell
ipconfig
```

Busca la dirección IPv4 de tu adaptador Wi-Fi (por ejemplo, `192.168.1.50`). Luego configura y arranca Expo:

```powershell
Set-Location .\mobile
npm install
Copy-Item .env.example .env
notepad .env
```

En `mobile\.env`, reemplaza la dirección de ejemplo por la IP de tu computadora:

```dotenv
EXPO_PUBLIC_API_URL=http://192.168.1.50:4000
```

Guarda el archivo y ejecuta:

```powershell
npx expo start
```

Escanea el QR con Expo Go. Si el teléfono no logra conectar con la API, revisa que ambos dispositivos sigan en la misma red, que la IP sea correcta y que el Firewall de Windows permita conexiones entrantes al puerto `4000`.

> En el teléfono no uses `localhost` en `EXPO_PUBLIC_API_URL`: esa dirección apuntaría al propio teléfono, no a la computadora.

## 5. Cerrar la aplicación

Cuando termines, presiona `Ctrl+C` en cada una de las tres terminales para detener Expo, Vite y la API.

## Opcional: ejecutar las pruebas de integración

Con SQL Server listo, abre otra terminal en la carpeta del proyecto:

```powershell
Set-Location .\backend
npm test
```

Ejecuta estas pruebas solo contra una base de desarrollo: crean datos temporales y los eliminan al terminar.
