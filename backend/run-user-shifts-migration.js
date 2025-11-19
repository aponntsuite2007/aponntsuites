const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'attendance_system',
  user: 'postgres',
  password: 'Aedr15150302'
});

async function runMigration() {
  try {
    console.log('📋 Ejecutando migración: create-user-shifts-table.sql');

    const migrationPath = path.join(__dirname, 'migrations', 'create-user-shifts-table.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    await pool.query(sql);

    console.log('✅ Migración ejecutada exitosamente');
    console.log('📋 Tabla user_shifts creada');

    await pool.end();
  } catch (error) {
    console.error('❌ Error ejecutando migración:', error.message);
    await pool.end();
    process.exit(1);
  }
}

runMigration();
