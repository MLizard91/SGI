// Crea (o actualiza) el usuario Administrador inicial.
// Uso: npm run crear-admin -- correo@mexticacan.gob.mx "Contraseña123" "Nombre"
require('dotenv').config({ quiet: true });
const bcrypt = require('bcryptjs');
const { sql, getPool } = require('../src/config/db');

async function main() {
  const [correo, password, nombre = 'Administrador'] = process.argv.slice(2);
  if (!correo || !password || password.length < 8) {
    console.log('Uso: npm run crear-admin -- <correo> <contraseña (mín. 8)> [nombre]');
    process.exit(1);
  }
  const pool = await getPool();
  const hash = await bcrypt.hash(password, 10);
  await pool.request()
    .input('Correo', sql.NVarChar(150), correo.toLowerCase())
    .input('Nombre', sql.NVarChar(100), nombre)
    .input('Hash', sql.NVarChar(255), hash)
    .query(`
      DECLARE @Rol INT = (SELECT IdRol FROM Roles WHERE Nombre = N'Administrador');
      IF EXISTS (SELECT 1 FROM Usuarios WHERE Correo = @Correo)
        UPDATE Usuarios SET PasswordHash = @Hash, IdRol = @Rol, Activo = 1 WHERE Correo = @Correo;
      ELSE
        INSERT INTO Usuarios (Nombre, Correo, PasswordHash, IdRol) VALUES (@Nombre, @Correo, @Hash, @Rol);`);
  console.log(`✔ Administrador listo: ${correo}`);
  await pool.close();
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
