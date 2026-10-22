# Manual de administración del sistema

## Responsabilidades del administrador

El Administrador es responsable de asignar acceso institucional, mantener configurada la instancia, proteger los datos y coordinar respaldos y recuperación. El acceso administrativo no sustituye las políticas municipales de autorización y privacidad.

## Administrar cuentas desde el panel

1. Inicia sesión con una cuenta de rol **Administrador**.
2. Abre **Usuarios** y utiliza la búsqueda para localizar una cuenta.
3. Pulsa **＋ Nuevo usuario** para crear una cuenta de personal. Captura nombre, correo, rol y contraseña; teléfono y apellidos son opcionales.
4. Asigna un área para los roles **Encargado de Área** y **Operativo**. El área determina el alcance de los reportes asignados al encargado y la adscripción del operativo.
5. Pulsa **Guardar** y confirma que el usuario aparece con el rol, área y estado correctos.
6. Para una cuenta existente, pulsa **Editar**. El correo no se puede modificar desde el formulario. Una contraseña nueva es opcional; para deshabilitar el acceso, desmarca **Cuenta activa** y guarda.

La contraseña inicial debe entregarse por un canal seguro y el usuario debe mantenerla privada. Si se cambia una contraseña, notifica al titular de forma segura. No crees cuentas compartidas.

### Criterio para asignar roles

- **Administrador:** personal técnico/administrativo que necesita mantener usuarios y configuración de la instancia.
- **Recepcionista:** personal que recibe y coordina reportes de todas las áreas.
- **Encargado de Área:** responsable municipal de una de las áreas atendidas.
- **Operativo:** personal de campo; asigna su área y asigna los reportes a su cuenta para que aparezcan en su bandeja.
- **Ciudadano:** cuenta creada por la ciudadanía desde la app. No se debe otorgar este rol al personal para operar el panel.

Aplica el principio de menor privilegio. Revisa periódicamente los usuarios activos, roles y adscripciones. Desactiva las cuentas cuando termine la necesidad de acceso; evita eliminarlas para conservar referencias en el historial de atención.

## Operación y supervisión

- Revisa **Dashboard** para observar pendientes, atención, resoluciones, urgentes y tiempos promedio. Contrasta los indicadores con la lista de incidencias.
- Usa filtros de área, estatus, prioridad y fechas para localizar carga de trabajo.
- La asignación, los comentarios y los cambios de estatus se registran en la incidencia y su historial.
- Exporta CSV únicamente cuando sea necesario. Limita su acceso, evita almacenarlo en carpetas públicas y elimínalo conforme a las políticas municipales de conservación.
- La API responde en `/api/salud`; una respuesta correcta confirma que el servicio HTTP está activo, pero no sustituye la revisión de base de datos y procesos.

## Seguridad y configuración

- Mantén secretos en los archivos `.env` del servidor, fuera del control de versiones. Restringe permisos de lectura.
- Usa un `JWT_SECRET` privado, largo y aleatorio. Rótalo siguiendo un plan: al cambiarlo, las sesiones firmadas con el secreto anterior dejarán de ser válidas.
- Restringe `CORS_ORIGIN` a los orígenes autorizados en el entorno desplegado. No dejes comodines para producción.
- No expongas puertos de desarrollo directamente a Internet. Usa infraestructura, HTTPS, reglas de red y operación administrada por personal técnico.
- Limita el acceso a SQL Server y a la carpeta `backend\uploads`; ahí se guardan archivos de evidencia.
- Actualiza y prueba dependencias y respaldos en un entorno controlado antes de aplicarlos a la instancia operativa.

## Respaldos y continuidad

El repositorio no documenta una tarea automática de respaldo. El responsable técnico debe establecer una política municipal de frecuencia, retención y acceso, y validar la restauración.

1. Programa respaldos de la base `SGI_Mexticacan` mediante SQL Server/SSMS, con destino protegido y acceso restringido.
2. Incluye en el plan la carpeta `backend\uploads`, porque las rutas de imágenes se registran en la base.
3. Guarda las copias cifradas si la infraestructura lo permite y conserva una copia fuera del equipo que ejecuta el servicio.
4. Prueba periódicamente la restauración en una instancia aislada, nunca sobrescribiendo la base operativa durante una prueba.
5. Documenta fecha, responsable, resultado de validación y tiempo de recuperación.

## Atención a incidentes de acceso o datos

Ante pérdida de acceso, posible exposición de credenciales o acceso indebido, informa al responsable municipal/técnico por el canal institucional, desactiva la cuenta comprometida si está autorizado, cambia los secretos afectados mediante un procedimiento controlado y conserva la información necesaria para investigar. No publiques capturas o datos personales en reportes abiertos.
