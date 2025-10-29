/**
 * SCRIPT: Ejecutar migración del Sistema de Facturación y Comisiones
 *
 * Ejecuta la migración SQL completa para:
 * - Extender companies con seller_id, support_id, comisiones
 * - Extender partners con leader_id, scoring
 * - Crear tablas: invoices, invoice_items, payments, commissions
 * - Crear tablas: support_packages, support_package_auctions, partner_ratings
 * - Crear funciones helper para cálculos automáticos
 *
 * Uso:
 *   node scripts/run-invoicing-migration.js
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runInvoicingMigration() {
  console.log('🚀 [INVOICING SYSTEM] Iniciando migración completa...\n');

  // Conectar a la base de datos
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Conectado a la base de datos\n');

    // Leer el archivo SQL de migración
    const migrationPath = path.join(__dirname, '..', 'migrations', '20251024_invoicing_commissions_support_packages.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Ejecutando migración SQL...');
    console.log('   Archivo:', migrationPath);
    console.log('   Tamaño:', (migrationSQL.length / 1024).toFixed(2), 'KB\n');

    // Ejecutar migración completa
    await client.query(migrationSQL);

    console.log('✅ Migración ejecutada exitosamente!\n');

    // Verificar tablas creadas
    console.log('🔍 Verificando tablas creadas...\n');

    const verifyQuery = `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN (
          'invoices',
          'invoice_items',
          'payments',
          'commissions',
          'support_packages',
          'support_package_auctions',
          'partner_ratings'
        )
      ORDER BY table_name;
    `;

    const result = await client.query(verifyQuery);

    console.log('📋 Tablas creadas:');
    result.rows.forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.table_name} ✅`);
    });

    // Verificar campos agregados a companies
    console.log('\n📋 Campos agregados a companies:');
    const companiesFields = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'companies'
        AND column_name IN ('seller_id', 'support_id', 'seller_commission_rate', 'support_commission_rate', 'operation_approved_by')
      ORDER BY column_name;
    `);
    companiesFields.rows.forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.column_name} (${row.data_type}) ✅`);
    });

    // Verificar campos agregados a partners
    console.log('\n📋 Campos agregados a partners:');
    const partnersFields = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'partners'
        AND column_name IN ('leader_id', 'leader_commission_rate', 'scoring_points', 'total_sales_count', 'average_rating')
      ORDER BY column_name;
    `);
    partnersFields.rows.forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.column_name} (${row.data_type}) ✅`);
    });

    // Verificar funciones creadas
    console.log('\n📋 Funciones PostgreSQL creadas:');
    const functionsQuery = `
      SELECT routine_name
      FROM information_schema.routines
      WHERE routine_schema = 'public'
        AND routine_name IN (
          'generate_invoice_number',
          'calculate_partner_scoring',
          'update_partner_metrics'
        )
      ORDER BY routine_name;
    `;

    const functionsResult = await client.query(functionsQuery);
    functionsResult.rows.forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.routine_name}() ✅`);
    });

    console.log('\n🎉 Sistema de Facturación y Comisiones instalado correctamente!\n');
    console.log('📋 Próximos pasos:');
    console.log('   1. Crear InvoiceGenerationService (generación mensual automática)');
    console.log('   2. Crear CommissionCalculationService (cálculo al registrar pagos)');
    console.log('   3. Crear SupportPackageService (gestión de paquetes y subastas)');
    console.log('   4. Crear ScoringCalculationService (CRON diario)');
    console.log('   5. Crear API endpoints REST');
    console.log('   6. Crear modales en frontend');
    console.log('   7. Configurar CRON jobs\n');

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
  runInvoicingMigration()
    .then(() => {
      console.log('✅ Proceso completado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error fatal:', error);
      process.exit(1);
    });
}

module.exports = { runInvoicingMigration };
