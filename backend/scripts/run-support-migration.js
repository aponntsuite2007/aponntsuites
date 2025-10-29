/**
 * EJECUTAR MIGRACIÓN DEL MÓDULO DE SOPORTE
 *
 * Script para aplicar la migración del sistema de soporte completo
 */

require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs').promises;
const path = require('path');

async function runMigration() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║  🎫 MIGRACIÓN: MÓDULO DE SOPORTE                          ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('');

    // Conectar
    console.log('🔌 Conectando a PostgreSQL...');
    await client.connect();
    console.log('✅ Conectado');
    console.log('');

    // Leer archivo SQL
    const migrationPath = path.join(__dirname, '..', 'migrations', '20251023_create_support_system.sql');
    console.log(`📄 Leyendo migración: ${migrationPath}`);
    const sql = await fs.readFile(migrationPath, 'utf8');
    console.log('✅ Archivo leído');
    console.log('');

    // Ejecutar migración
    console.log('⚙️  Ejecutando migración...');
    console.log('');
    console.log('   📋 Creando tablas:');
    console.log('      • support_tickets');
    console.log('      • support_ticket_messages');
    console.log('      • support_activity_log');
    console.log('      • company_support_assignments');
    console.log('      • support_vendor_stats');
    console.log('');
    console.log('   🔧 Creando funciones:');
    console.log('      • generate_ticket_number()');
    console.log('      • get_company_support_vendor()');
    console.log('      • expire_temp_password_on_close()');
    console.log('      • get_vendor_pending_tickets()');
    console.log('');

    await client.query(sql);

    console.log('✅ Migración ejecutada exitosamente');
    console.log('');

    // Verificar tablas creadas
    console.log('🔍 Verificando tablas creadas...');
    const result = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name LIKE 'support%'
      ORDER BY table_name
    `);

    console.log('');
    console.log('✅ Tablas creadas:');
    result.rows.forEach(row => {
      console.log(`   ✓ ${row.table_name}`);
    });
    console.log('');

    // Verificar funciones creadas
    const functionsResult = await client.query(`
      SELECT routine_name
      FROM information_schema.routines
      WHERE routine_schema = 'public'
        AND routine_name LIKE '%ticket%' OR routine_name LIKE '%support%'
      ORDER BY routine_name
    `);

    console.log('✅ Funciones creadas:');
    functionsResult.rows.forEach(row => {
      console.log(`   ✓ ${row.routine_name}()`);
    });
    console.log('');

    console.log('════════════════════════════════════════════════════════════');
    console.log('🎉 MIGRACIÓN COMPLETADA EXITOSAMENTE');
    console.log('════════════════════════════════════════════════════════════');
    console.log('');
    console.log('📝 PRÓXIMOS PASOS:');
    console.log('   1. Crear modelos Sequelize');
    console.log('   2. Crear API REST para tickets');
    console.log('   3. Integrar con sistema de notificaciones');
    console.log('   4. Crear frontend del módulo');
    console.log('');

  } catch (error) {
    console.error('');
    console.error('❌ ERROR ejecutando migración:');
    console.error('');
    console.error(error.message);
    console.error('');
    if (error.stack) {
      console.error('Stack trace:');
      console.error(error.stack);
    }
    console.error('');
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
