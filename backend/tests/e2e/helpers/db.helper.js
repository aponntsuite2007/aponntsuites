/**
 * ═══════════════════════════════════════════════════════════
 * DATABASE HELPER - Sistema Unificado de BD
 * ═══════════════════════════════════════════════════════════
 *
 * Funciones reutilizables para interactuar con PostgreSQL
 * Queries comunes, verificaciones, cleanup
 */

const { Client } = require('pg');
const crypto = require('crypto');

const DB_CONFIG = {
  host: 'localhost',
  port: 5432,
  database: 'attendance_system',
  user: 'postgres',
  password: 'Aedr15150302'
};

/**
 * Crear conexión a BD
 * @returns {Promise<Client>}
 */
async function createDBConnection() {
  const client = new Client(DB_CONFIG);
  await client.connect();
  console.log('   ✅ Conectado a PostgreSQL');
  return client;
}

/**
 * Cerrar conexión a BD
 * @param {Client} client
 */
async function closeDBConnection(client) {
  await client.end();
  console.log('   ✅ Desconectado de PostgreSQL');
}

/**
 * Crear usuario de prueba en BD
 * @param {Client} dbClient
 * @param {object} data - Datos del usuario
 * @returns {Promise<string>} user_id creado
 */
async function createTestUser(dbClient, data = {}) {
  const timestamp = Date.now();
  const userId = crypto.randomUUID();

  const userData = {
    user_id: userId,
    employeeId: data.employeeId || `EMP-TEST-${timestamp}`,
    firstName: data.firstName || 'Test',
    lastName: data.lastName || `User ${timestamp}`,
    email: data.email || `test.${timestamp}@demo.com`,
    dni: data.dni || `${timestamp}`.substring(0, 8),
    password: data.password || '$2a$10$dummyhashedpassword',
    role: data.role || 'employee',
    company_id: data.company_id || 11,
    usuario: data.usuario || `User Test ${timestamp}`,
    is_active: true,
    email_verified: true,
    account_status: 'active'
  };

  await dbClient.query(
    `INSERT INTO users (
      user_id, "employeeId", "firstName", "lastName", email, dni,
      password, role, company_id, usuario,
      is_active, email_verified, account_status,
      "createdAt", "updatedAt"
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())`,
    [
      userData.user_id,
      userData.employeeId,
      userData.firstName,
      userData.lastName,
      userData.email,
      userData.dni,
      userData.password,
      userData.role,
      userData.company_id,
      userData.usuario,
      userData.is_active,
      userData.email_verified,
      userData.account_status
    ]
  );

  console.log(`   ✅ Usuario creado en BD: ${userId}`);

  return userId;
}

/**
 * Obtener usuario por email
 * @param {Client} dbClient
 * @param {string} email
 * @returns {Promise<object|null>}
 */
async function getUserByEmail(dbClient, email) {
  const result = await dbClient.query(
    'SELECT * FROM users WHERE email = $1',
    [email]
  );

  return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * Obtener usuario por ID
 * @param {Client} dbClient
 * @param {string} userId
 * @returns {Promise<object|null>}
 */
async function getUserById(dbClient, userId) {
  const result = await dbClient.query(
    'SELECT * FROM users WHERE user_id = $1',
    [userId]
  );

  return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * Actualizar usuario
 * @param {Client} dbClient
 * @param {string} userId
 * @param {object} updates - Campos a actualizar
 */
async function updateUser(dbClient, userId, updates) {
  const fields = Object.keys(updates);
  const values = Object.values(updates);

  const setClause = fields
    .map((field, idx) => `"${field}" = $${idx + 2}`)
    .join(', ');

  await dbClient.query(
    `UPDATE users SET ${setClause}, "updatedAt" = NOW() WHERE user_id = $1`,
    [userId, ...values]
  );

  console.log(`   ✅ Usuario ${userId} actualizado`);
}

/**
 * Eliminar usuario
 * @param {Client} dbClient
 * @param {string} userId
 */
async function deleteUser(dbClient, userId) {
  await dbClient.query('DELETE FROM users WHERE user_id = $1', [userId]);
  console.log(`   ✅ Usuario ${userId} eliminado`);
}

/**
 * Contar usuarios de una empresa
 * @param {Client} dbClient
 * @param {number} companyId
 * @returns {Promise<number>}
 */
async function countUsers(dbClient, companyId) {
  const result = await dbClient.query(
    'SELECT COUNT(*) as count FROM users WHERE company_id = $1',
    [companyId]
  );

  return parseInt(result.rows[0].count);
}

/**
 * Limpiar usuarios de prueba
 * @param {Client} dbClient
 */
async function cleanupTestUsers(dbClient) {
  const result = await dbClient.query(
    `DELETE FROM users WHERE email LIKE '%@demo.com' OR email LIKE 'test.%@%'`
  );

  console.log(`   🧹 ${result.rowCount} usuarios de prueba eliminados`);
}

/**
 * Verificar que un registro existe
 * @param {Client} dbClient
 * @param {string} table
 * @param {string} field
 * @param {any} value
 * @returns {Promise<boolean>}
 */
async function recordExists(dbClient, table, field, value) {
  const result = await dbClient.query(
    `SELECT EXISTS(SELECT 1 FROM ${table} WHERE ${field} = $1)`,
    [value]
  );

  return result.rows[0].exists;
}

module.exports = {
  DB_CONFIG,
  createDBConnection,
  closeDBConnection,
  // Aliases para compatibilidad con tests
  connect: createDBConnection,
  disconnect: closeDBConnection,
  // Funciones de usuarios
  createTestUser,
  getUserByEmail,
  getUserById,
  updateUser,
  deleteUser,
  countUsers,
  cleanupTestUsers,
  recordExists
};
