const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'attendance_system',
  user: 'postgres',
  password: 'Aedr15150302'
});

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log('🔧 [MIGRATION] Agregando valores de prioridad al enum...\n');
    
    // Agregar valores al enum de prioridad
    const values = ['low', 'normal', 'medium', 'high', 'urgent', 'critical'];
    
    for (const value of values) {
      try {
        await client.query(`ALTER TYPE enum_notifications_enterprise_priority ADD VALUE IF NOT EXISTS '${value}'`);
        console.log(`✅ Valor '${value}' agregado`);
      } catch (e) {
        if (e.message.includes('already exists')) {
          console.log(`ℹ️  Valor '${value}' ya existe`);
        } else {
          console.log(`⚠️  Error con '${value}': ${e.message}`);
        }
      }
    }
    
    console.log('\n✅ [SUCCESS] Migración completada\n');
  } catch (error) {
    console.error('❌ [ERROR]', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}
runMigration();
