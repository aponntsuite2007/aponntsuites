/**
 * ============================================================================
 * TEST ITERATIVE E2E - Prueba del sistema test-fix-retest
 * ============================================================================
 *
 * Ejecuta el sistema completo de testing inteligente con Brain integration:
 * - IterativeTestOrchestrator
 * - AutonomousQAAgent con DI
 * - Loop hasta 100% success rate
 *
 * Uso: node backend/scripts/test-iterative-e2e.js [moduleId]
 *
 * @version 1.0.0
 * @date 2026-01-09
 * ============================================================================
 */

const IterativeTestOrchestrator = require('../src/testing/e2e-advanced/IterativeTestOrchestrator');
const AutonomousQAAgent = require('../src/testing/AutonomousQAAgent');
const SystemRegistry = require('../src/auditor/registry/SystemRegistry');
const EcosystemBrainService = require('../src/services/EcosystemBrainService');
const AuditorEngine = require('../src/auditor/core/AuditorEngine');
const database = require('../src/config/database');

async function main() {
  console.log('\n' + '='.repeat(80));
  console.log('🧪 TEST SISTEMA ITERATIVO DE TESTING INTELIGENTE');
  console.log('='.repeat(80));
  console.log('');
  console.log('Sistema: Brain + AutonomousQAAgent + IterativeTestOrchestrator');
  console.log('Objetivo: Loop test-fix-retest hasta 100% success rate');
  console.log('');
  console.log('='.repeat(80) + '\n');

  try {
    // =========================================================================
    // 1. INICIALIZAR DEPENDENCIAS
    // =========================================================================
    console.log('📦 [SETUP] Inicializando dependencias...\n');

    // SystemRegistry
    const systemRegistry = new SystemRegistry();
    console.log('   ✅ SystemRegistry inicializado');

    // EcosystemBrainService
    const brainService = new EcosystemBrainService();
    console.log('   ✅ EcosystemBrainService inicializado');

    // Conectar Brain con Registry
    systemRegistry.setBrainService(brainService);
    console.log('   ✅ Brain conectado con Registry');

    // AuditorEngine
    const auditorEngine = new AuditorEngine(database, systemRegistry);
    console.log('   ✅ AuditorEngine inicializado');

    // AutonomousQAAgent con DI
    const agent = new AutonomousQAAgent({
      systemRegistry,
      brainService,
      headless: true,
      timeout: 60000,
      learningEnabled: true,
      brainIntegration: true
    });

    await agent.init();
    console.log('   ✅ AutonomousQAAgent inicializado');

    // Login
    await agent.login({
      empresa: 'isi',
      usuario: 'admin',
      password: 'admin123'
    });
    console.log('   ✅ Login completado\n');

    // =========================================================================
    // 2. CREAR ITERATIVE TEST ORCHESTRATOR
    // =========================================================================
    console.log('🔄 [SETUP] Creando IterativeTestOrchestrator...\n');

    const orchestrator = new IterativeTestOrchestrator({
      agent,
      auditorEngine,
      systemRegistry,
      brainService,
      maxCycles: 5,           // Máximo 5 ciclos para la prueba
      targetSuccessRate: 100  // Objetivo: 100%
    });

    console.log('   ✅ IterativeTestOrchestrator configurado');
    console.log('   📊 Max cycles: 5');
    console.log('   🎯 Target success rate: 100%\n');

    // =========================================================================
    // 3. EJECUTAR TEST ITERATIVO EN MÓDULO
    // =========================================================================
    const moduleId = process.argv[2] || 'users';

    console.log('='.repeat(80));
    console.log(`🚀 INICIANDO TEST ITERATIVO EN MÓDULO: ${moduleId}`);
    console.log('='.repeat(80) + '\n');

    const startTime = Date.now();

    const result = await orchestrator.runUntilSuccess(moduleId, {
      agent,
      companyId: 11
    });

    const duration = Date.now() - startTime;

    // =========================================================================
    // 4. MOSTRAR RESULTADOS
    // =========================================================================
    console.log('\n' + '='.repeat(80));
    console.log('📊 RESULTADOS FINALES');
    console.log('='.repeat(80) + '\n');

    console.log(`Módulo: ${moduleId}`);
    console.log(`Success: ${result.success ? '✅ SÍ' : '❌ NO'}`);
    console.log(`Cycles ejecutados: ${result.cycles}/${orchestrator.maxCycles}`);
    console.log(`Final Success Rate: ${result.finalSuccessRate.toFixed(1)}%`);
    console.log(`Duración total: ${(duration / 1000).toFixed(1)}s`);

    if (result.results) {
      console.log('\n📈 Stats del último ciclo:');
      console.log(`   Total tests: ${result.results.totalTests || 0}`);
      console.log(`   Passed: ${result.results.passed || 0}`);
      console.log(`   Failed: ${result.results.failed || 0}`);
      console.log(`   Skipped: ${result.results.skipped || 0}`);
      console.log(`   Timeouts: ${result.results.timeouts || 0}`);
    }

    console.log('\n' + '='.repeat(80));

    if (result.success) {
      console.log('✅ TEST COMPLETADO - Módulo alcanzó 100% success rate');
    } else {
      console.log('⚠️  TEST COMPLETADO - Módulo NO alcanzó 100% (revise logs)');
    }

    console.log('='.repeat(80) + '\n');

    // Cleanup
    await agent.cleanup?.();

    process.exit(result.success ? 0 : 1);

  } catch (error) {
    console.error('\n' + '='.repeat(80));
    console.error('❌ ERROR EN EJECUCIÓN');
    console.error('='.repeat(80));
    console.error(error);
    console.error('='.repeat(80) + '\n');

    process.exit(1);
  }
}

// Ejecutar
main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
