// Pruebas de integración de la API contra la base de datos real (SQL Server).
// Ejecutar con: npm test
// Levanta su propio servidor en un puerto libre y al terminar borra todo lo que creó
// (usuarios con correo @prueba.local, sus incidencias, fotos y notificaciones).
process.env.NODE_ENV = 'test';
require('dotenv').config({ quiet: true, path: require('path').join(__dirname, '..', '.env') });

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { io } = require('socket.io-client');
const { app } = require('../src/app');
const { iniciarSocket } = require('../src/socket');
const { getPool, sql } = require('../src/config/db');

const SUFIJO = `${Date.now()}@prueba.local`;
const cuentasPrueba = [];
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

let server;
let BASE;
const tiempos = []; // { etiqueta, ms }
const sockets = [];

// ---------- utilidades ----------
async function llamar(ruta, { method = 'GET', body, formData, token, etiqueta } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body) headers['Content-Type'] = 'application/json';
  const inicio = performance.now();
  const res = await fetch(`${BASE}/api${ruta}`, { method, headers, body: formData || (body ? JSON.stringify(body) : undefined) });
  const ms = performance.now() - inicio;
  tiempos.push({ etiqueta: etiqueta || `${method} ${ruta.split('?')[0].replace(/\/\d+/g, '/:id')}`, ms });
  const texto = await res.text();
  let datos;
  try { datos = JSON.parse(texto); } catch { datos = texto; }
  return { status: res.status, datos, headers: res.headers };
}

function formulario(campos, fotos = 1, tipo = 'image/png') {
  const fd = new FormData();
  Object.entries(campos).forEach(([k, v]) => fd.append(k, String(v)));
  for (let i = 0; i < fotos; i++) fd.append('imagenes', new Blob([PNG], { type: tipo }), `foto${i}.png`);
  return fd;
}

const REPORTE = { titulo: 'Luminaria apagada (prueba)', descripcion: 'No enciende', idCategoria: 1, latitud: 21.2667, longitud: -102.7833, comunidad: 'Cabecera' };

function conectarSocket(token) {
  const s = io(BASE, { auth: { token }, transports: ['websocket'] });
  const recibidos = [];
  s.onAny((evento, datos) => recibidos.push({ evento, datos }));
  sockets.push(s);
  return new Promise((resolve, reject) => {
    s.on('connect', () => resolve({ s, recibidos }));
    s.on('connect_error', reject);
  });
}

async function esperarEvento(recibidos, evento, filtro = () => true, ms = 3000) {
  const fin = Date.now() + ms;
  while (Date.now() < fin) {
    const e = recibidos.find((r) => r.evento === evento && filtro(r.datos));
    if (e) return e.datos;
    await new Promise((r) => setTimeout(r, 50));
  }
  throw new Error(`No llegó el evento "${evento}" en ${ms} ms`);
}

// ---------- estado compartido entre pruebas ----------
const t = {}; // tokens
const u = {}; // usuarios creados
let roles;
let areas;
let categorias;
let incidencia;
const ciudadanosPorArea = {};

before(async () => {
  server = http.createServer(app);
  iniciarSocket(server, '*');
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  BASE = `http://127.0.0.1:${server.address().port}`;
  await getPool();

  // Administrador temporal para las pruebas (se borra al final)
  const bcrypt = require('bcryptjs');
  const pool = await getPool();
  await pool.request()
    .input('Correo', sql.NVarChar, `admin.${SUFIJO}`)
    .input('Hash', sql.NVarChar, await bcrypt.hash('Prueba12345', 10))
    .query(`INSERT INTO Usuarios (Nombre, Correo, PasswordHash, IdRol)
            SELECT N'Admin Pruebas', @Correo, @Hash, IdRol FROM Roles WHERE Nombre = N'Administrador'`);
  cuentasPrueba.push({ usuario: 'Administrador de pruebas', correo: `admin.${SUFIJO}`, rol: 'Administrador', area: null });
  t.admin = (await llamar('/auth/login', { method: 'POST', body: { correo: `admin.${SUFIJO}`, password: 'Prueba12345' } })).datos.token;
});

after(async () => {
  sockets.forEach((s) => s.close());
  const pool = await getPool();
  const patron = `%.${SUFIJO}`;
  const filtro = `(SELECT IdUsuario FROM Usuarios WHERE Correo LIKE @Patron)`;
  const imgs = await pool.request().input('Patron', sql.NVarChar(150), patron).query(`
    SELECT im.Ruta FROM IncidenciaImagenes im JOIN Incidencias i ON i.IdIncidencia = im.IdIncidencia
     WHERE i.IdCiudadano IN ${filtro}`);
  for (const { Ruta } of imgs.recordset) fs.rmSync(path.join(__dirname, '..', Ruta), { force: true });
  await pool.request().input('Patron', sql.NVarChar(150), patron).query(`
    DELETE FROM Notificaciones WHERE IdUsuario IN ${filtro};
    DELETE FROM Incidencias WHERE IdCiudadano IN ${filtro};
    DELETE FROM Usuarios WHERE Correo LIKE @Patron;`);
  await pool.close();
  server.close();

  // Resumen de tiempos de respuesta
  const grupos = {};
  for (const { etiqueta, ms } of tiempos) (grupos[etiqueta] ||= []).push(ms);
  const filas = Object.entries(grupos).map(([etiqueta, v]) => ({
    endpoint: etiqueta,
    llamadas: v.length,
    promedio_ms: Math.round(v.reduce((a, b) => a + b, 0) / v.length),
    max_ms: Math.round(Math.max(...v)),
  }));
  const carpeta = path.join(__dirname, 'resultados');
  fs.mkdirSync(carpeta, { recursive: true });
  fs.writeFileSync(path.join(carpeta, 'tiempos.json'), JSON.stringify({ fecha: new Date().toISOString(), filas }, null, 2));
  fs.writeFileSync(path.join(carpeta, 'usuarios-prueba.json'), JSON.stringify({
    fecha: new Date().toISOString(),
    resultado: {
      areas: areas.map(({ Nombre }) => Nombre),
      totalCategorias: categorias.length,
      reportesPorCategoria: categorias.length,
    },
    aviso: 'Cuentas temporales eliminadas de SQL Server al terminar la prueba. No hay credenciales activas.',
    usuarios: cuentasPrueba.map((cuenta) => ({ ...cuenta, estado: 'eliminada' })),
    tiemposRespuesta: filas,
  }, null, 2));
  console.log('\nTiempos de respuesta (ms):');
  console.table(filas);
});

// ---------- pruebas ----------
describe('1. Servidor y catálogos', () => {
  it('responde /api/salud', async () => {
    const r = await llamar('/salud');
    assert.equal(r.status, 200);
    assert.equal(r.datos.ok, true);
  });

  it('entrega 5 áreas, 20 categorías, 7 estatus y 5 roles', async () => {
    const r = await llamar('/catalogos');
    assert.equal(r.datos.areas.length, 5);
    assert.equal(r.datos.areas.flatMap((a) => a.Categorias).length, 20);
    assert.equal(r.datos.estatus.length, 7);
    assert.equal(r.datos.roles.length, 5);
    roles = Object.fromEntries(r.datos.roles.map((x) => [x.Nombre, x.IdRol]));
    areas = r.datos.areas;
    categorias = areas.flatMap((area) => area.Categorias.map((categoria) => ({ ...categoria, Area: area.Nombre })));
    REPORTE.idCategoria = areas[0].Categorias[0].IdCategoria;
  });
});

describe('2. Registro e inicio de sesión', () => {
  it('registra un ciudadano', async () => {
    const r = await llamar('/auth/registro', { method: 'POST', body: { nombre: 'Ana', apellidos: 'Pruebas', telefono: '3310000000', correo: `ana.${SUFIJO}`, password: 'Ana123456' } });
    assert.equal(r.status, 201);
    assert.equal(r.datos.usuario.Rol, 'Ciudadano');
    assert.ok(!('PasswordHash' in r.datos.usuario), 'no debe devolver el hash de la contraseña');
    t.ana = r.datos.token;
    u.ana = r.datos.usuario;
    ciudadanosPorArea[areas[0].IdArea] = t.ana;
    cuentasPrueba.push({ usuario: 'Ciudadana de pruebas', correo: `ana.${SUFIJO}`, rol: 'Ciudadano', area: areas[0].Nombre });
  });

  it('rechaza correo inválido (400)', async () => {
    const r = await llamar('/auth/registro', { method: 'POST', body: { nombre: 'X', correo: 'no-es-correo', password: 'Abc123456' } });
    assert.equal(r.status, 400);
  });

  it('rechaza contraseña de menos de 8 caracteres (400)', async () => {
    const r = await llamar('/auth/registro', { method: 'POST', body: { nombre: 'X', correo: `corta.${SUFIJO}`, password: '123' } });
    assert.equal(r.status, 400);
  });

  it('rechaza correo duplicado (409)', async () => {
    const r = await llamar('/auth/registro', { method: 'POST', body: { nombre: 'Ana', correo: `ANA.${SUFIJO}`, password: 'Ana123456' } });
    assert.equal(r.status, 409);
  });

  it('rechaza contraseña incorrecta (401)', async () => {
    const r = await llamar('/auth/login', { method: 'POST', body: { correo: `ana.${SUFIJO}`, password: 'incorrecta' } });
    assert.equal(r.status, 401);
  });

  it('rechaza token falso (401)', async () => {
    const r = await llamar('/auth/perfil', { token: 'token.falso.123' });
    assert.equal(r.status, 401);
  });

  it('el administrador crea personal municipal', async () => {
    const crear = async (clave, nombre, rol, idArea) => {
      const r = await llamar('/usuarios', { method: 'POST', token: t.admin, body: { nombre, correo: `${clave}.${SUFIJO}`, password: 'Clave12345', idRol: roles[rol], idArea } });
      assert.equal(r.status, 201, JSON.stringify(r.datos));
      u[clave] = r.datos;
      const login = await llamar('/auth/login', { method: 'POST', body: { correo: `${clave}.${SUFIJO}`, password: 'Clave12345' } });
      assert.equal(login.status, 200, JSON.stringify(login.datos));
      t[clave] = login.datos.token;
      cuentasPrueba.push({ usuario: nombre, correo: `${clave}.${SUFIJO}`, rol, area: idArea ? areas.find((area) => area.IdArea === idArea).Nombre : null });
    };
    for (const [indice, area] of areas.entries()) {
      await crear(`encargado${indice + 1}`, `Encargado ${area.Nombre}`, 'Encargado de Área', area.IdArea);
    }
    t.encargado = t.encargado1;
    u.encargado = u.encargado1;
    const areaAgua = areas.find((area) => area.Nombre === 'Agua Potable');
    t.encargadoAgua = t[`encargado${areas.indexOf(areaAgua) + 1}`];
    await crear('operativo', `Operativo ${areas[0].Nombre}`, 'Operativo', areas[0].IdArea);
    await crear('recepcion', 'Recepción', 'Recepcionista', null);
    for (const [indice, area] of areas.entries()) {
      if (indice === 0) continue;
      const clave = `ciudadano${indice + 1}`;
      const correo = `${clave}.${SUFIJO}`;
      const registrado = await llamar('/auth/registro', { method: 'POST', body: { nombre: `Ciudadano ${area.Nombre}`, correo, password: 'Beto12345' } });
      assert.equal(registrado.status, 201, JSON.stringify(registrado.datos));
      t[clave] = registrado.datos.token;
      u[clave] = registrado.datos.usuario;
      ciudadanosPorArea[area.IdArea] = t[clave];
      cuentasPrueba.push({ usuario: `Ciudadano ${area.Nombre}`, correo, rol: 'Ciudadano', area: area.Nombre });
    }
    t.beto = t.ciudadano2;
    u.beto = u.ciudadano2;
  });
});

describe('3. Crear reportes (fotos + GPS)', () => {
  it('rechaza un reporte sin fotos (400)', async () => {
    const r = await llamar('/incidencias', { method: 'POST', token: t.ana, formData: formulario(REPORTE, 0) });
    assert.equal(r.status, 400);
  });

  it('rechaza coordenadas inválidas (400)', async () => {
    const r = await llamar('/incidencias', { method: 'POST', token: t.ana, formData: formulario({ ...REPORTE, latitud: 200 }) });
    assert.equal(r.status, 400);
  });

  it('rechaza archivos que no son imagen (400)', async () => {
    const r = await llamar('/incidencias', { method: 'POST', token: t.ana, formData: formulario(REPORTE, 1, 'application/pdf') });
    assert.equal(r.status, 400);
  });

  it('rechaza más de 5 fotos (400)', async () => {
    const r = await llamar('/incidencias', { method: 'POST', token: t.ana, formData: formulario(REPORTE, 6) });
    assert.equal(r.status, 400);
  });

  it('rechaza una categoría que no existe (400)', async () => {
    const r = await llamar('/incidencias', { method: 'POST', token: t.ana, formData: formulario({ ...REPORTE, idCategoria: 9999 }) });
    assert.equal(r.status, 400);
  });

  it('crea el reporte, avisa en tiempo real al encargado y le genera notificación', async () => {
    const enc = await conectarSocket(t.encargado);
    const r = await llamar('/incidencias', { method: 'POST', token: t.ana, formData: formulario(REPORTE, 2), etiqueta: 'POST /incidencias (2 fotos)' });
    assert.equal(r.status, 201, JSON.stringify(r.datos));
    incidencia = r.datos;
    assert.match(incidencia.Folio, /^MEX-\d{6}$/);
    assert.equal(incidencia.Estatus, 'Recibida');
    assert.equal(incidencia.Area, 'Alumbrado Público');

    const nueva = await esperarEvento(enc.recibidos, 'incidencia:nueva', (d) => d.IdIncidencia === incidencia.IdIncidencia);
    assert.equal(nueva.Folio, incidencia.Folio);
    await esperarEvento(enc.recibidos, 'notificacion', (d) => d.IdIncidencia === incidencia.IdIncidencia);
  });

  it('la foto se puede descargar', async () => {
    const res = await fetch(`${BASE}/${incidencia.ImagenPrincipal}`);
    assert.equal(res.status, 200);
  });
});

describe('4. Privacidad y permisos por rol', () => {
  it('otro ciudadano NO ve el reporte (404)', async () => {
    assert.equal((await llamar(`/incidencias/${incidencia.IdIncidencia}`, { token: t.beto })).status, 404);
    assert.equal((await llamar('/incidencias', { token: t.beto })).datos.total, 0);
  });

  it('el encargado de otra área NO ve el reporte (404)', async () => {
    assert.equal((await llamar(`/incidencias/${incidencia.IdIncidencia}`, { token: t.encargadoAgua })).status, 404);
  });

  it('el operativo no ve el reporte hasta que se lo asignan', async () => {
    assert.equal((await llamar(`/incidencias/${incidencia.IdIncidencia}`, { token: t.operativo })).status, 404);
  });

  it('el ciudadano no puede cambiar estatus ni ver usuarios (403)', async () => {
    assert.equal((await llamar(`/incidencias/${incidencia.IdIncidencia}/estatus`, { method: 'PATCH', token: t.ana, body: { idEstatus: 5 } })).status, 403);
    assert.equal((await llamar('/usuarios', { token: t.ana })).status, 403);
  });

  it('el encargado no puede administrar usuarios (403)', async () => {
    assert.equal((await llamar('/usuarios', { token: t.encargado })).status, 403);
  });

  it('el ciudadano no ve el teléfono de contacto en el detalle', async () => {
    const r = await llamar(`/incidencias/${incidencia.IdIncidencia}`, { token: t.ana });
    assert.ok(!('TelefonoCiudadano' in r.datos));
  });

  it('el personal tampoco recibe correo ni teléfono del ciudadano (solo su nombre)', async () => {
    const r = await llamar(`/incidencias/${incidencia.IdIncidencia}`, { token: t.encargado });
    assert.equal(r.status, 200);
    assert.ok(r.datos.Ciudadano);
    assert.ok(!('TelefonoCiudadano' in r.datos) && !('CorreoCiudadano' in r.datos));
  });

  it('la lista de usuarios no expone correos ni teléfonos', async () => {
    const r = await llamar('/usuarios', { token: t.admin });
    assert.equal(r.status, 200);
    assert.ok(r.datos.length > 0);
    assert.ok(r.datos.every((x) => x.Nombre && !('Correo' in x) && !('Telefono' in x)));
    const personal = await llamar('/usuarios/personal', { token: t.admin });
    assert.ok(personal.datos.every((x) => !('Correo' in x) && !('Telefono' in x)));
  });
});

describe('5. Atención completa de la incidencia', () => {
  it('el encargado asigna al operativo → estatus "Asignada" y aviso en vivo al ciudadano', async () => {
    const ciu = await conectarSocket(t.ana);
    const r = await llamar(`/incidencias/${incidencia.IdIncidencia}/asignar`, { method: 'PATCH', token: t.encargado, body: { idAsignado: u.operativo.IdUsuario } });
    assert.equal(r.status, 200, JSON.stringify(r.datos));
    assert.equal(r.datos.Estatus, 'Asignada');
    const ev = await esperarEvento(ciu.recibidos, 'incidencia:actualizada', (d) => d.IdIncidencia === incidencia.IdIncidencia);
    assert.equal(ev.Estatus, 'Asignada');
  });

  it('no se puede asignar a un ciudadano (400)', async () => {
    const r = await llamar(`/incidencias/${incidencia.IdIncidencia}/asignar`, { method: 'PATCH', token: t.encargado, body: { idAsignado: u.ana.IdUsuario } });
    assert.equal(r.status, 400);
  });

  it('el operativo ya ve el reporte, pero no puede rechazarlo (403)', async () => {
    assert.equal((await llamar('/incidencias', { token: t.operativo })).datos.total, 1);
    const r = await llamar(`/incidencias/${incidencia.IdIncidencia}/estatus`, { method: 'PATCH', token: t.operativo, body: { idEstatus: 7 } });
    assert.equal(r.status, 403);
  });

  it('la recepción cambia la prioridad a Urgente', async () => {
    const r = await llamar(`/incidencias/${incidencia.IdIncidencia}/prioridad`, { method: 'PATCH', token: t.recepcion, body: { prioridad: 'Urgente' } });
    assert.equal(r.datos.Prioridad, 'Urgente');
    assert.equal((await llamar(`/incidencias/${incidencia.IdIncidencia}/prioridad`, { method: 'PATCH', token: t.recepcion, body: { prioridad: 'Altísima' } })).status, 400);
  });

  it('el operativo marca "En proceso" con nota para el ciudadano', async () => {
    const r = await llamar(`/incidencias/${incidencia.IdIncidencia}/estatus`, { method: 'PATCH', token: t.operativo, body: { idEstatus: 4, comentario: 'La cuadrilla va en camino' } });
    assert.equal(r.datos.Estatus, 'En proceso');
  });

  it('comentarios: el interno no lo ve el ciudadano', async () => {
    await llamar(`/incidencias/${incidencia.IdIncidencia}/comentarios`, { method: 'POST', token: t.encargado, body: { texto: 'Nota interna', esInterno: true } });
    await llamar(`/incidencias/${incidencia.IdIncidencia}/comentarios`, { method: 'POST', token: t.operativo, body: { texto: 'Ya estamos en el lugar' } });
    await llamar(`/incidencias/${incidencia.IdIncidencia}/comentarios`, { method: 'POST', token: t.ana, body: { texto: '¡Gracias!', esInterno: true } });
    const ciu = await llamar(`/incidencias/${incidencia.IdIncidencia}`, { token: t.ana });
    const adm = await llamar(`/incidencias/${incidencia.IdIncidencia}`, { token: t.admin });
    assert.equal(ciu.datos.comentarios.length, 2);
    assert.equal(adm.datos.comentarios.length, 3);
    assert.ok(ciu.datos.comentarios.every((c) => !c.EsInterno), 'un ciudadano no puede crear comentarios internos');
  });

  it('el operativo sube evidencia y marca "Resuelta"', async () => {
    const ev = await llamar(`/incidencias/${incidencia.IdIncidencia}/evidencias`, { method: 'POST', token: t.operativo, formData: formulario({}, 1) });
    assert.equal(ev.status, 201);
    const r = await llamar(`/incidencias/${incidencia.IdIncidencia}/estatus`, { method: 'PATCH', token: t.operativo, body: { idEstatus: 5 } });
    assert.equal(r.datos.Estatus, 'Resuelta');
    assert.ok(r.datos.FechaResolucion, 'debe registrar la fecha de resolución');
  });

  it('el historial registra todo el recorrido', async () => {
    const r = await llamar(`/incidencias/${incidencia.IdIncidencia}`, { token: t.admin });
    const acciones = r.datos.historial.map((h) => h.Accion);
    assert.deepEqual(acciones, ['Creación', 'Asignación', 'Prioridad', 'CambioEstatus', 'Evidencia', 'CambioEstatus']);
    assert.deepEqual(r.datos.imagenes.map((i) => i.Tipo), ['Reporte', 'Reporte', 'Evidencia']);
  });

  it('el ciudadano recibió notificaciones de cada avance', async () => {
    const r = await llamar('/notificaciones', { token: t.ana });
    assert.ok(r.datos.noLeidas >= 3, `noLeidas = ${r.datos.noLeidas}`);
    await llamar('/notificaciones/leer-todas', { method: 'PATCH', token: t.ana });
    assert.equal((await llamar('/notificaciones', { token: t.ana })).datos.noLeidas, 0);
  });
});

describe('6. Reportes, mapa y exportación', () => {
  it('el resumen cuenta la incidencia resuelta', async () => {
    const r = await llamar('/reportes/resumen', { token: t.admin });
    assert.equal(r.status, 200);
    assert.ok(r.datos.totales.Resueltas >= 1);
    assert.equal(r.datos.porArea.length, 5);
  });

  it('el encargado solo ve estadísticas de su área', async () => {
    for (const [indice, area] of areas.entries()) {
      const r = await llamar('/reportes/resumen', { token: t[`encargado${indice + 1}`] });
      assert.equal(r.datos.porArea.length, 1);
      assert.equal(r.datos.porArea[0].Nombre, area.Nombre);
    }
  });

  it('el mapa devuelve coordenadas', async () => {
    const r = await llamar('/incidencias/mapa', { token: t.admin });
    const p = r.datos.find((x) => x.IdIncidencia === incidencia.IdIncidencia);
    assert.equal(p.Latitud, 21.2667);
  });

  it('exporta CSV con acentos', async () => {
    const r = await llamar('/reportes/exportar', { token: t.admin });
    assert.equal(r.status, 200);
    assert.match(r.headers.get('content-type'), /text\/csv/);
    assert.ok(r.datos.includes(incidencia.Folio));
    assert.ok(r.datos.includes('Alumbrado Público'));
  });

  it('genera el reporte PDF del periodo seleccionado', async () => {
    const dia = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
    const r = await llamar(`/reportes/pdf?desde=${dia(-7)}&hasta=${dia(1)}`, { token: t.admin });
    assert.equal(r.status, 200);
    assert.match(r.headers.get('content-type'), /application\/pdf/);
    assert.ok(r.datos.startsWith('%PDF'));
    const encargado = await llamar(`/reportes/pdf?desde=${dia(-30)}&hasta=${dia(0)}`, { token: t.encargado });
    assert.equal(encargado.status, 200);
  });

  it('el PDF valida el periodo y los permisos', async () => {
    assert.equal((await llamar('/reportes/pdf', { token: t.admin })).status, 400);
    assert.equal((await llamar('/reportes/pdf?desde=2026-10-20&hasta=2026-10-01', { token: t.admin })).status, 400);
    assert.equal((await llamar('/reportes/pdf?desde=2026-02-31&hasta=2026-03-05', { token: t.admin })).status, 400);
    assert.equal((await llamar('/reportes/pdf?desde=2024-01-01&hasta=2026-01-01', { token: t.admin })).status, 400);
    assert.equal((await llamar('/reportes/pdf?desde=2026-10-01&hasta=2026-10-07', { token: t.ana })).status, 403);
    assert.equal((await llamar('/reportes/pdf?desde=2026-10-01&hasta=2026-10-07', { token: t.operativo })).status, 403);
  });
});

describe('7. Carga ligera', () => {
  it('las 20 categorías de las cinco áreas aceptan reportes simultáneos', async () => {
    const resultados = await Promise.all(
      categorias.map((categoria, i) =>
        llamar('/incidencias', {
          method: 'POST',
          token: ciudadanosPorArea[categoria.IdArea],
          formData: formulario({ ...REPORTE, titulo: `Carga ${i}`, idCategoria: categoria.IdCategoria, latitud: 21.26 + i / 1000 }),
          etiqueta: 'POST /incidencias (20 categorías simultáneas)',
        })
      )
    );
    assert.deepEqual(resultados.map((r) => r.status), Array(20).fill(201));
    assert.equal(new Set(resultados.map((r) => r.datos.Folio)).size, 20, 'los folios deben ser únicos');
    resultados.forEach((r, indice) => {
      assert.equal(r.datos.IdArea, categorias[indice].IdArea);
      assert.equal(r.datos.Categoria, categorias[indice].Nombre);
      assert.equal(r.datos.Area, categorias[indice].Area);
    });
  });

  it('la lista paginada responde con filtros', async () => {
    const r = await llamar('/incidencias?limite=10&pagina=2&area=1&buscar=Carga', { token: t.admin, etiqueta: 'GET /incidencias (filtros)' });
    assert.equal(r.status, 200);
    assert.equal(r.datos.pagina, 2);
  });
});
