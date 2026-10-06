const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const routes = require('./routes');
const manejadorErrores = require('./middleware/errores');
const { CARPETA } = require('./middleware/upload');

function corsOrigin() {
  const v = process.env.CORS_ORIGIN || '*';
  return v === '*' ? '*' : v.split(',').map((s) => s.trim());
}

const app = express();
app.use(cors({ origin: corsOrigin() }));
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev')); // bitácora de peticiones en consola

// Imágenes subidas: http://servidor:4000/uploads/archivo.jpg
app.use('/uploads', express.static(CARPETA, { maxAge: '7d' }));

app.get('/api/salud', (_req, res) => res.json({ ok: true, servicio: 'SGI Mexticacán' }));
app.use('/api', routes);
app.use((_req, res) => res.status(404).json({ mensaje: 'Ruta no encontrada' }));
app.use(manejadorErrores);

module.exports = { app, corsOrigin };
