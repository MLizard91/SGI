// Definición de todos los endpoints de la API REST.
const { Router } = require('express');
const { verificarToken, permitirRoles } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const { ROLES, PERSONAL } = require('../utils/roles');

const auth = require('../controllers/auth.controller');
const catalogos = require('../controllers/catalogos.controller');
const incidencias = require('../controllers/incidencias.controller');
const usuarios = require('../controllers/usuarios.controller');
const reportes = require('../controllers/reportes.controller');
const notificaciones = require('../controllers/notificaciones.controller');

const { ADMIN, ENCARGADO, RECEPCION, CIUDADANO } = ROLES;
const GESTION = [ADMIN, ENCARGADO, RECEPCION]; // pueden asignar y priorizar

const router = Router();

// --- Autenticación ---
router.post('/auth/registro', auth.registro);
router.post('/auth/login', auth.login);
router.get('/auth/perfil', verificarToken, auth.perfil);

// --- Catálogos (áreas, categorías, estatus, roles) ---
router.get('/catalogos', catalogos.obtenerCatalogos);

// --- Incidencias ---
router.get('/incidencias', verificarToken, incidencias.listar);
router.get('/incidencias/mapa', verificarToken, incidencias.mapa);
router.get('/incidencias/:id', verificarToken, incidencias.detalle);
router.post('/incidencias', verificarToken, permitirRoles(CIUDADANO, ...PERSONAL), upload.array('imagenes', 5), incidencias.crear);
router.patch('/incidencias/:id/estatus', verificarToken, permitirRoles(...PERSONAL), incidencias.cambiarEstatus);
router.patch('/incidencias/:id/asignar', verificarToken, permitirRoles(...GESTION), incidencias.asignar);
router.patch('/incidencias/:id/prioridad', verificarToken, permitirRoles(...GESTION), incidencias.cambiarPrioridad);
router.post('/incidencias/:id/comentarios', verificarToken, incidencias.comentar);
router.post('/incidencias/:id/evidencias', verificarToken, permitirRoles(...PERSONAL), upload.array('imagenes', 5), incidencias.subirEvidencias);

// --- Usuarios ---
router.get('/usuarios', verificarToken, permitirRoles(ADMIN), usuarios.listar);
router.get('/usuarios/personal', verificarToken, permitirRoles(...GESTION), usuarios.personal);
router.post('/usuarios', verificarToken, permitirRoles(ADMIN), usuarios.crear);
router.put('/usuarios/:id', verificarToken, permitirRoles(ADMIN), usuarios.actualizar);

// --- Reportes y estadísticas ---
router.get('/reportes/resumen', verificarToken, permitirRoles(...PERSONAL), reportes.resumen);
router.get('/reportes/exportar', verificarToken, permitirRoles(ADMIN, ENCARGADO, RECEPCION), reportes.exportarCsv);
router.get('/reportes/pdf', verificarToken, permitirRoles(...GESTION), reportes.exportarPdf);

// --- Notificaciones ---
router.get('/notificaciones', verificarToken, notificaciones.listar);
router.patch('/notificaciones/leer-todas', verificarToken, notificaciones.leerTodas);
router.patch('/notificaciones/:id/leida', verificarToken, notificaciones.marcarLeida);

module.exports = router;
