/**
 * 🧪 VALIDACIÓN RÁPIDA DEL SISTEMA E2E ADVANCED
 *
 * Script simple para validar que todos los componentes funcionan sin Jest.
 * Ejecuta validaciones básicas del MasterTestOrchestrator y componentes core.
 */

const path = require('path');

console.log('\n🧪 ====================================');
console.log('   VALIDACIÓN E2E ADVANCED SYSTEM');
console.log('====================================\n');

// Mock database simple
const mockDatabase = {
  sequelize: {
    query: async () => [[], { rowCount: 0 }],
    transaction: async (callback) => {
      const t = { commit: async () => {}, rollback: async () => {} };
      return callback(t);
    },
    QueryTypes: { SELECT: 'SELECT' }
  },
  User: {
    findAll: async () => [],
    create: async (data) => ({ id: 1, ...data }),
    destroy: async () => 1
  },
  Company: {
    findAll: async () => [],
    create: async (data) => ({ id: 1, ...data }),
    destroy: async () => 1
  }
};

async function validateSystem() {
  try {
    // 1. Cargar MasterTestOrchestrator
    console.log('📦 [1/7] Cargando MasterTestOrchestrator...');
    const MasterTestOrchestrator = require('../src/testing/e2e-advanced/MasterTestOrchestrator');
    console.log('   ✅ MasterTestOrchestrator cargado correctamente\n');

    // 2. Crear instancia
    console.log('🔧 [2/7] Creando instancia del orchestrator...');
    const orchestrator = new MasterTestOrchestrator(mockDatabase, {
      baseURL: 'http://localhost:9998',
      saveResults: false, // No persistir en validación
      modules: ['users'] // Solo testear users para velocidad
    });
    console.log('   ✅ Orchestrator instanciado correctamente\n');

    // 3. Verificar phases registradas
    console.log('📊 [3/7] Verificando phases registradas...');
    const registeredPhases = Array.from(orchestrator.phases.keys());
    console.log(`   Phases encontradas: ${registeredPhases.length}/7`);

    const expectedPhases = ['e2e', 'load', 'security', 'multiTenant', 'database', 'monitoring', 'edgeCases'];
    const missing = expectedPhases.filter(p => !registeredPhases.includes(p));

    if (missing.length === 0) {
      console.log(`   ✅ Todas las 7 phases registradas: ${registeredPhases.join(', ')}\n`);
    } else {
      console.log(`   ⚠️  Phases faltantes: ${missing.join(', ')}\n`);
      throw new Error(`Faltan ${missing.length} phases`);
    }

    // 4. Verificar ConfidenceCalculator
    console.log('🧮 [4/7] Verificando ConfidenceCalculator...');
    const ConfidenceCalculator = require('../src/testing/e2e-advanced/core/ConfidenceCalculator');
    const ResultsAggregator = require('../src/testing/e2e-advanced/core/ResultsAggregator');

    const calculator = new ConfidenceCalculator();
    const aggregator = new ResultsAggregator();

    // Resultados de prueba (con score incluido)
    const testResults = {
      e2e: { status: 'passed', total: 10, passed: 10, failed: 0, score: 100 },
      load: { status: 'passed', total: 5, passed: 5, failed: 0, score: 100 },
      security: { status: 'passed', total: 20, passed: 20, failed: 0, score: 100 },
      multiTenant: { status: 'passed', total: 10, passed: 10, failed: 0, score: 100 },
      database: { status: 'passed', total: 15, passed: 15, failed: 0, score: 100 },
      monitoring: { status: 'passed', total: 5, passed: 5, failed: 0, score: 100 },
      edgeCases: { status: 'passed', total: 8, passed: 8, failed: 0, score: 100 }
    };

    const aggregated = aggregator.aggregate(testResults);
    const score = calculator.calculate(aggregated);

    console.log(`   Confidence Score (test): ${score.overall}/100`);

    if (score.overall === 100) {
      console.log('   ✅ ConfidenceCalculator funcionando correctamente\n');
    } else {
      throw new Error(`Score esperado: 100, obtenido: ${score.overall}`);
    }

    // 5. Ejecutar suite completo (modo simulación)
    console.log('🚀 [5/7] Ejecutando suite completo (modo simulación)...');
    console.log('   Módulos: [users]');
    console.log('   Phases: 7\n');

    const startTime = Date.now();
    const result = await orchestrator.runFullSuite(['users'], { companyId: 1 });
    const duration = Date.now() - startTime;

    console.log(`   Execution ID: ${result.executionId}`);

    // Confidence score puede ser número o objeto
    const confidenceScore = typeof result.confidenceScore === 'object'
      ? result.confidenceScore.overall
      : result.confidenceScore;

    console.log(`   Confidence Score: ${confidenceScore.toFixed(1)}/100`);
    console.log(`   Production Ready: ${result.productionReady ? 'YES ✅' : 'NO ❌'}`);
    console.log(`   Duration: ${(duration / 1000).toFixed(1)}s`);
    console.log(`   Phases ejecutadas: ${result.results.summary.phasesExecuted}/${result.results.summary.totalPhases}`);
    console.log(`   Tests: ${result.results.summary.testsPassed} passed, ${result.results.summary.testsFailed} failed, ${result.results.summary.testsSkipped} skipped`);

    if (result.results.summary.phasesExecuted > 0) {
      console.log('   ✅ Suite ejecutado exitosamente\n');
    } else {
      throw new Error('No se ejecutaron phases');
    }

    // 6. Verificar estructura de resultados
    console.log('🔍 [6/7] Verificando estructura de resultados...');
    const requiredFields = ['executionId', 'results', 'confidenceScore', 'productionReady'];
    const missingFields = requiredFields.filter(field => !(field in result));

    if (missingFields.length === 0) {
      console.log('   ✅ Estructura de resultados válida (4 campos principales)\n');
    } else {
      throw new Error(`Campos faltantes: ${missingFields.join(', ')}`);
    }

    // Verificar subestructura de results
    const requiredResultFields = ['summary', 'phases', 'timestamps'];
    const missingResultFields = requiredResultFields.filter(field => !(field in result.results));

    if (missingResultFields.length === 0) {
      console.log('   ✅ Subestructura de results válida\n');
    } else {
      throw new Error(`Campos faltantes en results: ${missingResultFields.join(', ')}`);
    }

    // 7. Verificar phaseResults
    console.log('📋 [7/7] Verificando phaseResults...');
    const phaseResultsCount = Object.keys(result.results.phases).length;
    console.log(`   Phase results recibidos: ${phaseResultsCount}`);

    for (const [phaseName, phaseResult] of Object.entries(result.results.phases)) {
      console.log(`   - ${phaseName}: ${phaseResult.status} (score: ${phaseResult.score}/100)`);
    }

    if (phaseResultsCount > 0) {
      console.log('\n   ✅ PhaseResults válidos\n');
    } else {
      console.log('\n   ⚠️  No se generaron phaseResults\n');
    }

    // Resumen final
    console.log('====================================');
    console.log('🎉 VALIDACIÓN COMPLETADA EXITOSAMENTE');
    console.log('====================================\n');

    console.log('✅ Componentes validados:');
    console.log('   ✓ MasterTestOrchestrator');
    console.log('   ✓ 7 Testing Phases (E2E, Load, Security, MultiTenant, Database, Monitoring, EdgeCases)');
    console.log('   ✓ ConfidenceCalculator');
    console.log('   ✓ Ejecución de suite completo');
    console.log('   ✓ Estructura de resultados');
    console.log('   ✓ PhaseResults\n');

    // Calcular confidence score final
    const finalScore = typeof result.confidenceScore === 'object'
      ? result.confidenceScore.overall
      : result.confidenceScore;

    console.log('📊 Métricas:');
    console.log(`   - Confidence Score: ${finalScore.toFixed(1)}/100`);
    console.log(`   - Production Ready: ${result.productionReady ? 'YES ✅' : 'NO ❌'}`);
    console.log(`   - Phases ejecutadas: ${result.results.summary.phasesExecuted}/${result.results.summary.totalPhases}`);
    console.log(`   - Tests: ${result.results.summary.testsPassed} passed, ${result.results.summary.testsFailed} failed`);
    console.log(`   - Duration: ${(duration / 1000).toFixed(1)}s\n`);

    console.log('🚀 Sistema listo para Integration Testing (CK-12)\n');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ ERROR EN VALIDACIÓN:', error.message);
    console.error('\nStack trace:');
    console.error(error.stack);
    process.exit(1);
  }
}

validateSystem();
