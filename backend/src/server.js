require('dotenv').config({ quiet: true });
const http = require('http');
const { app, corsOrigin } = require('./app');
const { iniciarSocket } = require('./socket');
const { getPool } = require('./config/db');

if (!process.env.JWT_SECRET) {
  console.error('Falta JWT_SECRET en el archivo .env');
  process.exit(1);
}

const PORT = Number(process.env.PORT || 4000);
const server = http.createServer(app);
iniciarSocket(server, corsOrigin());

getPool()
  .then(() => console.log('✔ Conectado a SQL Server'))
  .catch((err) => console.error('✖ No se pudo conectar a SQL Server:', err.message));

// 0.0.0.0 permite que el celular se conecte usando la IP de la computadora en la red local
server.listen(PORT, '0.0.0.0', () => console.log(`API SGI escuchando en http://localhost:${PORT}`));
