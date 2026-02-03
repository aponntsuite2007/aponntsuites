/**
 * Script para ejecutar migraciones en Render PostgreSQL
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const RENDER_DB_URL = 'postgresql://attendance_system_866u_user:Ihb9jdoOTYzb4c0u7cXxGo8XaIb1Iyvt@dpg-d3i4mqjipnbc73dsnd6g-a.oregon-postgres.render.com/attendance_system_866u';

const migrations = [
  '20260202_fix_manual_by_columns_to_varchar.sql',
  '20260203_create_organizational_hierarchy_functions.sql'
];

async function runMigrations() {
  const client = new Client({
    connectionString: RENDER_DB_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔗 Conectando a Render PostgreSQL...');
    await client.connect();
    console.log('✅ Conectado a Render DB\n');

    for (const migrationFile of migrations) {
      const migrationPath = path.join(__dirname, 'migrations', migrationFile);

      if (!fs.existsSync(migrationPath)) {
        console.log(`⚠️  Migración no encontrada: ${migrationFile}`);
        continue;
      }

      console.log(`📄 Ejecutando: ${migrationFile}`);
      const sql = fs.readFileSync(migrationPath, 'utf-8');

      try {
        await client.query(sql);
        console.log(`✅ ${migrationFile} ejecutada exitosamente\n`);
      } catch (error) {
        console.error(`❌ Error en ${migrationFile}:`, error.message);
        if (error.message.includes('already exists')) {
          console.log(`⚠️  Probablemente ya estaba aplicada, continuando...\n`);
        } else {
          throw error;
        }
      }
    }

    console.log('✅ Todas las migraciones completadas');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await client.end();
    console.log('🔌 Conexión cerrada');
  }
}

runMigrations()
  .then(() => {
    console.log('\n✅ Proceso completado');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Proceso falló:', error.message);
    process.exit(1);
  });
