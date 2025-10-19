/**
 * SCRIPT DE DEPLOY: Sistema de Notificaciones Enterprise
 *
 * Ejecuta todas las migraciones y setup inicial del sistema
 *
 * USO:
 *   node scripts/deploy-notifications-enterprise.js
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const execPromise = promisify(exec);
const path = require('path');

console.log('🚀 Iniciando deploy del Sistema de Notificaciones Enterprise...\n');

async function runMigration(migrationFile) {
  console.log(`📄 Ejecutando: ${migrationFile}`);

  const migrationPath = path.join(__dirname, '..', 'migrations', migrationFile);

  try {
    const { stdout, stderr } = await execPromise(
      `psql "${process.env.DATABASE_URL}" -f "${migrationPath}"`
    );

    if (stdout) console.log(stdout);
    if (stderr && !stderr.includes('NOTICE')) console.error('⚠️', stderr);

    console.log(`✅ ${migrationFile} completado\n`);
    return true;
  } catch (error) {
    console.error(`❌ Error en ${migrationFile}:`, error.message);
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
