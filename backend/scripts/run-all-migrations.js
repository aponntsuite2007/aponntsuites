/**
 * SCRIPT: Ejecutar todas las migraciones de notificaciones enterprise
 * Este script ejecuta todas las migraciones SQL en orden
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const migrations = [
  '20251019_create_notifications_enterprise.sql',
  '20251019_update_user_attendance_roles.sql',
  '20251019_medical_notification_templates.sql',
  '20251019_vacation_notification_templates.sql',
  '20251019_legal_notification_templates.sql'
];

async function runAllMigrations() {
  const client = await pool.connect();

  try {
    console.log('🔧 [MIGRATIONS] Iniciando ejecución de migraciones...\n');

    for (const migrationFile of migrations) {
      const migrationPath = path.join(__dirname, '../migrations', migrationFile);

      if (!fs.existsSync(migrationPath)) {
        console.warn(`⚠️  [SKIP] Archivo no encontrado: ${migrationFile}`);
        continue;
      }

      try {
        console.log(`📋 [RUNNING] ${migrationFile}...`);
        const sql = fs.readFileSync(migrationPath, 'utf8');

        await client.query(sql);
        console.log(`✅ [SUCCESS] ${migrationFile} ejecutada correctamente\n`);
      } catch (error) {
        // Si el error es porque la tabla ya existe, lo ignoramos
        if (error.message.includes('already exists')) {
          console.log(`ℹ️  [INFO] ${migrationFile} - Objetos ya existen (OK)\n`);
        } else {
          console.error(`❌ [ERROR] ${migrationFile}:`, error.message);
          throw error;
        }
      }
    }

    console.log('✅ [COMPLETE] Todas las migraciones ejecutadas exitosamente\n');

  } catch (error) {
    console.error('❌ [FATAL] Error ejecutando migraciones:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Solo ejecutar si se llama directamente (no si se importa)
if (require.main === module) {
  runAllMigrations();
}

module.exports = runAllMigrations;
