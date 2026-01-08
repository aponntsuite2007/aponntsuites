/**
 * Ejecutar migración de templates de notificaciones
 */

const fs = require('fs');
const path = require('path');
const { sequelize } = require('../src/config/database');

async function runMigration() {
  console.log('\n🔧 EJECUTANDO MIGRACIÓN: Sistema de Templates de Notificaciones\n');

  try {
    await sequelize.authenticate();
    console.log('✅ Conexión a BD establecida');

    // Leer archivo de migración
    const migrationPath = path.join(__dirname, '..', 'migrations', '20260108_create_notification_templates.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    // Ejecutar migración
    console.log('\n📝 Ejecutando SQL...');
    await sequelize.query(sql);

    console.log('\n✅ MIGRACIÓN COMPLETADA EXITOSAMENTE\n');
    console.log('📊 Resultados:');
    console.log('   - Tabla notification_templates creada');
    console.log('   - Función replace_template_variables() creada');
    console.log('   - Función get_processed_template() creada');
    console.log('   - 21 templates por defecto insertados');

    // Verificar templates insertados
    const [templates] = await sequelize.query(`
      SELECT module, COUNT(*) as count
      FROM notification_templates
      WHERE company_id IS NULL
      GROUP BY module
      ORDER BY module
    `);

    console.log('\n📦 Templates por módulo:');
    templates.forEach(t => {
      console.log(`   - ${t.module}: ${t.count} templates`);
    });

    console.log('\n💡 Próximos pasos:');
    console.log('   1. Personalizar templates por empresa (opcional)');
    console.log('   2. Usar NotificationTemplateService.send() en lugar de NCE.send()');
    console.log('   3. Testear con: node scripts/test-notification-templates.js\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ ERROR EN MIGRACIÓN:', error.message);
    console.error(error);
    process.exit(1);
  }
}

runMigration();
