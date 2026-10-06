// Conexión a SQL Server usando el paquete "mssql".
// Se crea un único pool de conexiones que reutiliza toda la aplicación.
const sql = require('mssql');

const config = {
  server: process.env.DB_SERVER || 'localhost',
  port: Number(process.env.DB_PORT || 1433),
  database: process.env.DB_NAME || 'SGI_Mexticacan',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_CERT !== 'false',
  },
  pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
};

let poolPromise;

function getPool() {
  if (!poolPromise) {
    poolPromise = new sql.ConnectionPool(config).connect().catch((err) => {
      poolPromise = null; // permite reintentar en la siguiente petición
      throw err;
    });
  }
  return poolPromise;
}

// Atajo para crear una consulta: const r = await (await request()).input(...).query(...)
async function request() {
  const pool = await getPool();
  return pool.request();
}

module.exports = { sql, getPool, request };
