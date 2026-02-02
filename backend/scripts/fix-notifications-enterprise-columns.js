/**
 * Fix: Corregir columnas de timestamps en notifications_enterprise
 */
const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'attendance_system',
  user: 'postgres',
  password: 'Aedr15150302'
});

async function fix() {
  const client = await pool.connect();
  try {
    console.log('🔧 Corrigiendo columnas de notifications_enterprise...\n');

    // Ver columnas actuales
    const result = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'notifications_enterprise'
    `);

    const columns = result.rows.map(r => r.column_name);
    console.log('Columnas:', columns.join(', '));

    // Hacer createdAt y updatedAt nullable con default
    const fixes = [
      `ALTER TABLE notifications_enterprise ALTER COLUMN "createdAt" SET DEFAULT NOW()`,
      `ALTER TABLE notifications_enterprise ALTER COLUMN "createdAt" DROP NOT NULL`,
      `ALTER TABLE notifications_enterprise ALTER COLUMN "updatedAt" SET DEFAULT NOW()`,
      `ALTER TABLE notifications_enterprise ALTER COLUMN "updatedAt" DROP NOT NULL`
    ];

    for (const sql of fixes) {
      try {
        await client.query(sql);
        console.log('✅', sql.substring(0, 60) + '...');
      } catch (e) {
        console.log('⚠️', e.message.substring(0, 80));
      }
    }

    console.log('\n✅ Correcciones aplicadas');
  } catch (error) {
    console.error('❌', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}
fix();
