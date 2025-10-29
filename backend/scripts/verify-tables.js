/**
 * SCRIPT: Verificar que las tablas de notificaciones existen
 */

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

async function verifyTables() {
  const client = await pool.connect();

  try {
    console.log('🔍 Verificando tablas de notificaciones enterprise...\n');

    const tables = [
      'notifications',
      'notification_workflows',
      'notification_actions_log',
      'notification_templates',
      'user_notification_preferences'
    ];

    for (const table of tables) {
      const result = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_name = $1
        );
      `, [table]);

      const exists = result.rows[0].exists;

      if (exists) {
        const countResult = await client.query(`SELECT COUNT(*) FROM ${table}`);
        const count = countResult.rows[0].count;
        console.log(`✅ ${table}: EXISTE (${count} registros)`);
      } else {
        console.log(`❌ ${table}: NO EXISTE`);
      }
    }

    console.log('\n✅ Verificación completada\n');

  } catch (error) {
    console.error('❌ Error verificando tablas:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

verifyTables();
