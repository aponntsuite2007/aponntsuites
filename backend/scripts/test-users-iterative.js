/**
 * ============================================================================
 * TEST ITERATIVO DEL MÓDULO USERS - Con Brain + Auto-Healing
 * ============================================================================
 *
 * Ejecuta IterativeTestOrchestrator en módulo users hasta alcanzar 100%
 *
 * @version 1.0.0
 * @date 2026-01-10
 * ============================================================================
 */

const IterativeTestOrchestrator = require('../src/testing/e2e-advanced/IterativeTestOrchestrator');
const AutonomousQAAgent = require('../src/testing/AutonomousQAAgent');
const SystemRegistry = require('../src/auditor/registry/SystemRegistry');
const EcosystemBrainService = require('../src/services/EcosystemBrainService');
const AuditorEngine = require('../src/auditor/core/AuditorEngine');
const database = require('../src/config/database');  // ⭐ NUEVO: Import database

async function main() {
  console.log('\n' + '='.repeat(80));
  console.log('🔄 TEST ITERATIVO - MÓDULO USERS (con Brain + Auto-Healing)');
  console.log('='.repeat(80) + '\n');

  try {
    // =========================================================================
    // 1. SETUP - Inicializar componentes del sistema
    // =========================================================================
    console.log('📦 [SETUP] Inicializando componentes del sistema...\n');

    const systemRegistry = new SystemRegistry(database);  // ⭐ FIX: Pasar database
    const brainService = new EcosystemBrainService();

    systemRegistry.setBrainService(brainService);

    const agent = new AutonomousQAAgent({
      systemRegistry,
      brainService,
      headless: false,  // Visible para ver el testing
      timeout: 60000,
      learningEnabled: true,
      brainIntegration: true
    });

    await agent.init();
    console.log('   ✅ AutonomousQAAgent inicializado\n');

    // =========================================================================
    // 2. LOGIN
    // =========================================================================
    console.log('🔐 [SETUP] Haciendo login...\n');

    await agent.login({
      empresa: 'isi',
      usuario: 'admin',
      password: 'admin123'
    });

    console.log('   ✅ Login completado\n');

    // =========================================================================
    // 3. INICIALIZAR AUDITOR ENGINE (para auto-healing)
    // =========================================================================
    console.log('🔧 [SETUP] Inicializando AuditorEngine...\n');

    const auditorEngine = new AuditorEngine({
      systemRegistry,
      brainService
    });

    console.log('   ✅ AuditorEngine listo\n');

    // =========================================================================
    // 4. CREAR ITERATIVE ORCHESTRATOR
    // =========================================================================
    console.log('🎯 [SETUP] Creando IterativeTestOrchestrator...\n');

    const orchestrator = new IterativeTestOrchestrator({
      agent,
      auditorEngine,
      systemRegistry,
      brainService,
      maxCycles: 5,          // Máximo 5 ciclos
      targetSuccessRate: 100 // Objetivo: 100%
    });

    console.log('   ✅ Orchestrator configurado\n');

    // =========================================================================
    // 5. EJECUTAR TESTING ITERATIVO
    // =========================================================================
    console.log('🚀 [TEST] Iniciando testing iterativo de módulo users...\n');

    const result = await orchestrator.runUntilSuccess('users', {
      agent,
      companyId: 11
    });

    // =========================================================================
    // 6. REPORTE FINAL
    // =========================================================================
    console.log('\n' + '='.repeat(80));
    console.log('📊 RESULTADOS FINALES');
    console.log('='.repeat(80));
    console.log(`✅ Success: ${result.success}`);
    console.log(`🔄 Cycles: ${result.cycles}`);
    console.log(`📈 Final Success Rate: ${result.finalSuccessRate.toFixed(1)}%`);
    console.log(`🎯 Target: 100%`);
    console.log('='.repeat(80) + '\n');

    if (result.success) {
      console.log('🎉 MÓDULO USERS ALCANZÓ 100% DE SUCCESS RATE!');
    } else {
      console.log('⚠️  No se alcanzó 100% en el máximo de ciclos permitidos');
    }

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
