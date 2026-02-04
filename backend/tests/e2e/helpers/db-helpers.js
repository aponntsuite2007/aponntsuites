/**
 * ═══════════════════════════════════════════════════════════════════════
 * DATABASE HELPERS - Funciones para verificar persistencia en PostgreSQL
 * ═══════════════════════════════════════════════════════════════════════
 */

const { Pool } = require('pg');

// Pool de conexiones PostgreSQL
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'attendance_system',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD
});

/**
 * Verificar que un registro existe en la BD
 */
async function verifyRecordExists(tableName, whereClause, values) {
  try {
    const query = `SELECT * FROM ${tableName} WHERE ${whereClause} LIMIT 1`;
    console.log(`   🔍 [DB] Query: ${query} | Values: ${JSON.stringify(values)}`);

    const result = await pool.query(query, values);
    const exists = result.rows.length > 0;

    if (exists) {
      console.log(`   ✅ [DB] Registro encontrado:`, result.rows[0]);
    } else {
      console.log(`   ❌ [DB] Registro NO encontrado`);
    }

    return {
      exists,
      data: result.rows[0] || null
    };
  } catch (error) {
    console.error(`   ❌ [DB] Error verificando registro:`, error.message);
    return {
      exists: false,
      error: error.message
    };
  }
}

/**
 * Verificar que un registro NO existe en la BD (fue eliminado)
 */
async function verifyRecordDeleted(tableName, whereClause, values) {
  const result = await verifyRecordExists(tableName, whereClause, values);
  return !result.exists; // Invertir: success si NO existe
}

/**
 * Obtener un registro por ID
 */
async function getRecordById(tableName, id) {
  try {
    const query = `SELECT * FROM ${tableName} WHERE id = $1 LIMIT 1`;
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  } catch (error) {
    console.error(`   ❌ [DB] Error obteniendo registro:`, error.message);
    return null;
  }
}

/**
 * Obtener el último registro creado (por timestamp o ID)
 */
async function getLastCreatedRecord(tableName, orderBy = 'created_at') {
  try {
    const query = `SELECT * FROM ${tableName} ORDER BY ${orderBy} DESC LIMIT 1`;
    const result = await pool.query(query);
    return result.rows[0] || null;
  } catch (error) {
    console.error(`   ❌ [DB] Error obteniendo último registro:`, error.message);
    return null;
  }
}

/**
 * Limpiar registros de test (por email, nombre, etc.)
 */
async function cleanupTestRecords(tableName, whereClause, values) {
  try {
    const query = `DELETE FROM ${tableName} WHERE ${whereClause}`;
    console.log(`   🧹 [DB] Limpiando registros de test...`);

    const result = await pool.query(query, values);
    console.log(`   ✅ [DB] ${result.rowCount} registros eliminados`);

    return result.rowCount;
  } catch (error) {
    console.error(`   ⚠️ [DB] Error limpiando registros:`, error.message);
    return 0;
  }
}

/**
 * Contar registros en una tabla
 */
async function countRecords(tableName, whereClause = '', values = []) {
  try {
    const query = whereClause
      ? `SELECT COUNT(*) FROM ${tableName} WHERE ${whereClause}`
      : `SELECT COUNT(*) FROM ${tableName}`;

    const result = await pool.query(query, values);
    return parseInt(result.rows[0].count);
  } catch (error) {
    console.error(`   ❌ [DB] Error contando registros:`, error.message);
    return 0;
  }
}

/**
 * Ejecutar query custom
 */
async function executeQuery(query, values = []) {
  try {
    const result = await pool.query(query, values);
    return {
      success: true,
      rows: result.rows,
      rowCount: result.rowCount
    };
  } catch (error) {
    console.error(`   ❌ [DB] Error ejecutando query:`, error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Cerrar pool de conexiones
 */
async function closePool() {
  await pool.end();
}

module.exports = {
  pool,
  verifyRecordExists,
  verifyRecordDeleted,
  getRecordById,
  getLastCreatedRecord,
  cleanupTestRecords,
  countRecords,
  executeQuery,
  closePool
};
