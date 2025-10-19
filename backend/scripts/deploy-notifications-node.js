/**
 * SCRIPT DE DEPLOY: Sistema de Notificaciones Enterprise (Node.js)
 *
 * Ejecuta todas las migraciones usando pg directamente
 *
 * USO:
 *   node scripts/deploy-notifications-node.js
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

console.log('🚀 Iniciando deploy del Sistema de Notificaciones Enterprise...\n');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function runMigration(migrationFile) {
  console.log(`📄 Ejecutando: ${migrationFile}`);

  const migrationPath = path.join(__dirname, '..', 'migrations', migrationFile);

  try {
    const sql = fs.readFileSync(migrationPath, 'utf8');

    const client = await pool.connect();

    try {
      await client.query(sql);
      console.log(`✅ ${migrationFile} completado\n`);
      return true;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(`❌ Error en ${migrationFile}:`, error.message);
    console.error('Detalles:', error.detail || error.hint || '');
    return false;
  }
}

async function main() {
  console.log('📊 DATABASE_URL:', process.env.DATABASE_URL ? 'Configurado ✓' : 'NO CONFIGURADO ✗\n');

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL no está configurado. Saliendo...');
    process.exit(1);
  }

  const migrations = [
    '20251019_create_notifications_enterprise.sql',
    '20251019_update_user_attendance_roles.sql'
  ];

  let allSuccess = true;

  for (const migration of migrations) {
    const success = await runMigration(migration);
    if (!success) {
      allSuccess = false;
      break;
    }
  }

  await pool.end();

  if (allSuccess) {
    console.log('✨ ¡Deploy completado exitosamente!\n');
    console.log('📋 Resumen:');
    console.log('  ✓ Tablas creadas: notifications, notification_workflows, notification_actions_log, notification_templates, user_notification_preferences');
    console.log('  ✓ Campos agregados en: users, departments, shifts, attendances');
    console.log('  ✓ Roles agregados: rrhh, medical');
    console.log('  ✓ Funciones y triggers: calculate_attendance_tolerance, auto-cálculo de tolerancia');
    console.log('  ✓ Templates iniciales: 3 templates para asistencia');
    console.log('  ✓ Workflow inicial: attendance_late_arrival_approval\n');
    console.log('🎯 Siguiente paso: Reiniciar el servidor Node.js para cargar los nuevos modelos\n');
  } else {
    console.log('\n❌ Deploy falló. Revisa los errores arriba.\n');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('💥 Error fatal:', error);
  process.exit(1);
});
