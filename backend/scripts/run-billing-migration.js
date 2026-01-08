/**
 * Ejecutar migración del sistema de billing y tarifación
 */

const fs = require('fs');
const path = require('path');
const { sequelize } = require('../src/config/database');

async function runMigration() {
  console.log('\n💰 EJECUTANDO MIGRACIÓN: Sistema de Tarifación y Facturación\n');

  try {
    await sequelize.authenticate();
    console.log('✅ Conexión a BD establecida');

    // Leer archivo de migración
    const migrationPath = path.join(__dirname, '..', 'migrations', '20260108_create_notification_billing_system.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    // Ejecutar migración
    console.log('\n📝 Ejecutando SQL...');
    await sequelize.query(sql);

    console.log('\n✅ MIGRACIÓN COMPLETADA EXITOSAMENTE\n');
    console.log('📊 Resultados:');
    console.log('   - Tabla company_notification_pricing creada');
    console.log('   - Tabla company_notification_usage creada');
    console.log('   - Tabla company_notification_billing_log creada');
    console.log('   - Tabla notification_incoming_messages creada');
    console.log('   - Función can_company_send_notification() creada');
    console.log('   - Función register_notification_billing() creada');
    console.log('   - Función get_monthly_billing_summary() creada');
    console.log('   - Función mark_period_as_invoiced() creada');

    // Verificar tablas creadas
    const [tables] = await sequelize.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name LIKE '%notification%'
      ORDER BY table_name
    `);

    console.log('\n📦 Tablas de notificaciones en BD:');
    tables.forEach(t => {
      console.log(`   - ${t.table_name}`);
    });

    console.log('\n💡 Próximos pasos:');
    console.log('   1. Configurar tarifas por empresa (API o panel admin)');
    console.log('   2. Configurar webhooks Twilio para respuestas SMS/WhatsApp');
    console.log('   3. Implementar frontend de gestión de canales de pago');
    console.log('   4. Testear con: node scripts/test-billing-system.js\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ ERROR EN MIGRACIÓN:', error.message);
    console.error(error);
    process.exit(1);
  }
}

runMigration();
