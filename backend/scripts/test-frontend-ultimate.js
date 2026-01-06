/**
 * SCRIPT: Test ULTIMATE de FrontendCollector
 * Ejecuta test completo de todos los 43 módulos de ISI company
 */

const FrontendCollector = require('../src/auditor/collectors/FrontendCollector');
const SystemRegistry = require('../src/auditor/registry/SystemRegistry');
const database = require('../src/config/database');
const { v4: uuidv4 } = require('uuid');

async function runUltimateTest() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🧪 TEST ULTIMATE - FrontendCollector (43 módulos ISI)');
  console.log('═══════════════════════════════════════════════════════════\n');

  const companyId = 11; // ISI

  try {
    // Conectar a la base de datos primero
    console.log('🐘 Conectando a PostgreSQL...');
    await database.sequelize.authenticate();
    console.log('✅ PostgreSQL conectado\n');

    // Inicializar SystemRegistry
    console.log('📚 Inicializando SystemRegistry...');
    const systemRegistry = new SystemRegistry(database);
    await systemRegistry.initialize();
    console.log(`✅ SystemRegistry: ${systemRegistry.getAllModules().length} módulos cargados\n`);

    // Crear FrontendCollector
    const frontendCollector = new FrontendCollector(database, systemRegistry);

    // Ejecutar test frontend
    console.log('🚀 Iniciando test frontend...\n');
    const execution_id = uuidv4(); // UUID válido para la BD
    const config = { company_id: companyId };
    console.log(`   📋 Execution ID: ${execution_id}\n`);
    const results = await frontendCollector.collect(execution_id, config);

    // Resumen de resultados
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('📊 RESUMEN DE RESULTADOS');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Total tests ejecutados: ${results.length}`);
    console.log(`Tests PASSED: ${results.filter(r => r.status === 'passed').length}`);
    console.log(`Tests FAILED: ${results.filter(r => r.status === 'failed').length}`);
    console.log(`Tests WARNING: ${results.filter(r => r.status === 'warning').length}\n`);

    // Detalles de tests fallidos
    const failed = results.filter(r => r.status === 'failed');
    if (failed.length > 0) {
      console.log('❌ TESTS FALLIDOS:');
      failed.forEach(r => {
        console.log(`   - ${r.module_name || r.test_type}: ${r.error_message || r.error_type || 'Sin mensaje'}`);
      });
      console.log('');
    }

    // Detalles de tests exitosos
    const passed = results.filter(r => r.status === 'passed');
    if (passed.length > 0) {
      console.log('✅ TESTS EXITOSOS:');
      passed.forEach(r => {
        console.log(`   - ${r.module_name || r.test_type}`);
      });
      console.log('');
    }

    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ TEST COMPLETO');
    console.log('═══════════════════════════════════════════════════════════\n');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ ERROR FATAL:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Ejecutar
runUltimateTest();
