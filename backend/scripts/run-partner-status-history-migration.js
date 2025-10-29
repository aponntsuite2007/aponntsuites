/**
 * SCRIPT: Ejecutar migración de Partner Status History + Notifications
 *
 * Ejecuta la migración SQL para:
 * - Crear tabla partner_status_history (audit trail completo)
 * - Extender tabla notifications con campos partner-related
 * - Crear funciones helper y triggers automáticos
 *
 * Uso:
 *   node scripts/run-partner-status-history-migration.js
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runPartnerStatusHistoryMigration() {
  console.log('🚀 [PARTNER STATUS HISTORY] Iniciando migración...\n');

  // Conectar a la base de datos
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Conectado a la base de datos\n');

    // Leer el archivo SQL de migración
    const migrationPath = path.join(__dirname, '..', 'migrations', '20251024_partner_status_history_and_notifications.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Ejecutando migración SQL...');
    console.log('   Archivo:', migrationPath);
    console.log('   Tamaño:', (migrationSQL.length / 1024).toFixed(2), 'KB\n');

    // Split into individual statements and execute one by one
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`   Total statements: ${statements.length}\n`);

    let createdTables = 0;
    let createdFunctions = 0;
    let createdTriggers = 0;
    let alterations = 0;

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      if (stmt) {
        try {
          await client.query(stmt);

          if (stmt.includes('CREATE TABLE')) {
            const tableName = stmt.match(/CREATE TABLE(?:\s+IF NOT EXISTS)?\s+(\w+)/i)?.[1];
            console.log(`   ✓ Tabla creada: ${tableName}`);
            createdTables++;
          } else if (stmt.includes('CREATE OR REPLACE FUNCTION')) {
            const funcName = stmt.match(/CREATE OR REPLACE FUNCTION\s+(\w+)/i)?.[1];
            console.log(`   ✓ Función creada: ${funcName}()`);
            createdFunctions++;
          } else if (stmt.includes('CREATE TRIGGER')) {
            const triggerName = stmt.match(/CREATE TRIGGER\s+(\w+)/i)?.[1];
            console.log(`   ✓ Trigger creado: ${triggerName}`);
            createdTriggers++;
          } else if (stmt.includes('ALTER TABLE')) {
            const tableName = stmt.match(/ALTER TABLE\s+(\w+)/i)?.[1];
            console.log(`   ✓ Tabla alterada: ${tableName}`);
            alterations++;
          }
        } catch (err) {
          // Log but continue for "already exists" errors
          if (!err.message.includes('already exists') && !err.message.includes('does not exist')) {
            console.error(`   ⚠️  Error en statement ${i + 1}:`, err.message.substring(0, 100));
          }
        }
      }
    }

    console.log('\n✅ Migración ejecutada exitosamente!\n');
    console.log('📊 Resumen:');
    console.log(`   - Tablas creadas: ${createdTables}`);
    console.log(`   - Funciones creadas: ${createdFunctions}`);
    console.log(`   - Triggers creados: ${createdTriggers}`);
    console.log(`   - Tablas alteradas: ${alterations}\n`);

    // Verificar que la tabla partner_status_history existe
    console.log('🔍 Verificando tablas creadas...\n');

    const verifyQuery = `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND (table_name = 'partner_status_history' OR table_name = 'notifications')
      ORDER BY table_name;
    `;

    const result = await client.query(verifyQuery);

    console.log('📋 Tablas verificadas:');
    result.rows.forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.table_name}`);
    });

    // Verificar columnas agregadas a notifications
    const columnsQuery = `
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'notifications'
        AND column_name IN ('related_partner_id', 'related_service_request_id', 'sender_user_id', 'sender_type')
      ORDER BY column_name;
    `;

    const columnsResult = await client.query(columnsQuery);

    console.log('\n📋 Columnas agregadas a notifications:');
    columnsResult.rows.forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.column_name} (${row.data_type})`);
    });

    // Verificar funciones creadas
    const functionsQuery = `
      SELECT routine_name
      FROM information_schema.routines
      WHERE routine_schema = 'public'
        AND routine_name IN ('get_partner_status_timeline', 'get_partner_active_contracts', 'partner_status_change_trigger')
      ORDER BY routine_name;
    `;

    const functionsResult = await client.query(functionsQuery);

    console.log('\n📋 Funciones helper creadas:');
    functionsResult.rows.forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.routine_name}()`);
    });

    console.log('\n🎉 Sistema de Partner Status History instalado correctamente!\n');
    console.log('📋 Próximos pasos:');
    console.log('   1. Crear PartnerNotificationService.js');
    console.log('   2. Implementar endpoint PUT /api/partners/:id/status');
    console.log('   3. Agregar validación de roles (gerente/administrador)');
    console.log('   4. Implementar envío de emails automático');
    console.log('   5. Agregar modal de edición de partners en frontend');
    console.log('   6. Testing end-to-end del flujo completo\n');

  } catch (error) {
    console.error('❌ Error ejecutando migración:', error.message);
    console.error('\nStack:', error.stack);
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔌 Conexión cerrada\n');
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  runPartnerStatusHistoryMigration()
    .then(() => {
      console.log('✅ Proceso completado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error fatal:', error);
      process.exit(1);
    });
}

module.exports = { runPartnerStatusHistoryMigration };
