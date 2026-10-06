// Error con código HTTP para responder al cliente con un mensaje claro.
class HttpError extends Error {
  constructor(status, mensaje) {
    super(mensaje);
    this.status = status;
  }
}

// Verifica que existan los campos obligatorios en el body.
function requerir(body, campos) {
  const faltantes = campos.filter((c) => body[c] === undefined || body[c] === null || String(body[c]).trim() === '');
  if (faltantes.length) {
    throw new HttpError(400, `Faltan campos obligatorios: ${faltantes.join(', ')}`);
  }
}

function entero(valor, nombre) {
  const n = Number(valor);
  if (!Number.isInteger(n) || n <= 0) throw new HttpError(400, `${nombre} no es válido`);
  return n;
}

module.exports = { HttpError, requerir, entero };
