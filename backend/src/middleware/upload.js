// Subida de imágenes con multer. Los archivos se guardan en /uploads
// y en la base de datos solo se guarda la ruta relativa.
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const { HttpError } = require('../utils/errores');

const CARPETA = path.join(__dirname, '..', '..', 'uploads');
const TIPOS = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/heic': '.heic' };

const storage = multer.diskStorage({
  destination: CARPETA,
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${crypto.randomUUID()}${TIPOS[file.mimetype]}`),
});

const upload = multer({
  storage,
  limits: { fileSize: Number(process.env.MAX_IMAGE_MB || 8) * 1024 * 1024, files: 5 },
  fileFilter: (_req, file, cb) => {
    if (TIPOS[file.mimetype]) cb(null, true);
    else cb(new HttpError(400, 'Solo se permiten imágenes JPG, PNG, WEBP o HEIC'));
  },
});

module.exports = { upload, CARPETA };
