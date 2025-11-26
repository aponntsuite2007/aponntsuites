/**
 * ============================================================================
 * DEMO: SISTEMA INTELIGENTE DE TAREAS
 * ============================================================================
 *
 * Este script demuestra el flujo completo del sistema inteligente:
 *
 * 1. PRE-ANÁLISIS: Analizar tarea ANTES de empezar
 * 2. EJECUCIÓN: (simulada)
 * 3. POST-SINCRONIZACIÓN: Completar tarea y sincronizar TODO
 * 4. DETECCIÓN: Ver descoordinaciones
 *
 * ============================================================================
 */

const PreTaskAnalyzer = require('../src/services/PreTaskAnalyzer');
const PostTaskSynchronizer = require('../src/services/PostTaskSynchronizer');
const CodeIntelligenceService = require('../src/services/CodeIntelligenceService');

async function demo() {
  console.log('\n' + '='.repeat(80));
  console.log('🚀 DEMO: SISTEMA INTELIGENTE DE TAREAS');
  console.log('='.repeat(80));

  // ============================================================================
  // ESCENARIO 1: NUEVA TAREA QUE YA EXISTE PARCIALMENTE
  // ============================================================================

  console.log('\n\n📝 ESCENARIO 1: Analizar tarea ANTES de empezar');
  console.log('-'.repeat(80));

  const task1 = {
    description: "Implementar sistema de jerarquía y comisiones para vendedores",
    moduleKey: "vendedores"
  };

  console.log(`\n💬 Usuario dice: "${task1.description}"`);
  console.log(`\n🔍 Ejecutando PreTaskAnalyzer...`);

  const analysis1 = await PreTaskAnalyzer.analyzeTask(task1);

  console.log(`\n✨ RESULTADO:`);
  console.log(`   - Ya existe en roadmap: ${analysis1.existsInRoadmap ? '✅ SÍ' : '❌ NO'}`);
  console.log(`   - Ya existe en código: ${analysis1.existsInCode ? '✅ SÍ' : '❌ NO'}`);
  console.log(`   - Completitud estimada: ${analysis1.completionStatus.estimated}%`);
  console.log(`   - ${analysis1.recommendation}`);

  // ============================================================================
  // ESCENARIO 2: COMPLETAR UNA TAREA
  // ============================================================================

  console.log('\n\n✅ ESCENARIO 2: Completar tarea VH-1 y sincronizar');
  console.log('-'.repeat(80));

  const completedTask = {
    taskId: "VH-1",
    phaseKey: "phase1_vendorHierarchy",
    moduleKey: "vendedores",
    completedBy: "claude-code"
  };

  console.log(`\n💬 Claude Code completa tarea: ${completedTask.taskId}`);
  console.log(`\n🚀 Ejecutando PostTaskSynchronizer...`);

  const syncResult = await PostTaskSynchronizer.synchronize(completedTask);

  console.log(`\n✨ SINCRONIZACIÓN COMPLETADA:`);
  console.log(`   - Cambios realizados: ${syncResult.changes.length}`);
  console.log(`   - Módulos afectados: ${syncResult.affectedModules.length}`);
  console.log(`   - Descoordinaciones: ${syncResult.inconsistencies.length}`);
  console.log(`   - Estado: ${syncResult.success ? '✅ ÉXITO' : '❌ ERROR'}`);

  if (syncResult.changes.length > 0) {
    console.log(`\n📝 Cambios realizados:`);
    syncResult.changes.forEach(change => console.log(`   ${change}`));
  }

  // ============================================================================
  // ESCENARIO 3: DETECTAR DESCOORDINACIONES
  // ============================================================================

  console.log('\n\n🔍 ESCENARIO 3: Detectar descoordinaciones');
  console.log('-'.repeat(80));

  console.log(`\n🔍 Ejecutando detección de inconsistencias...`);

  const inconsistencyReport = await CodeIntelligenceService.generateInconsistencyReport();

  console.log(`\n✨ DESCOORDINACIONES ENCONTRADAS: ${inconsistencyReport.totalInconsistencies}`);

  if (inconsistencyReport.totalInconsistencies > 0) {
    console.log(`\n⚠️  Por severidad:`);
    console.log(`   - HIGH: ${inconsistencyReport.bySeverity.HIGH}`);
    console.log(`   - MEDIUM: ${inconsistencyReport.bySeverity.MEDIUM}`);
    console.log(`   - LOW: ${inconsistencyReport.bySeverity.LOW}`);

    console.log(`\n📋 Detalles:`);
    inconsistencyReport.details.forEach((inc, i) => {
      console.log(`\n   ${i + 1}. ${inc.type} (${inc.severity})`);
      console.log(`      - Módulo: ${inc.module} (progress: ${inc.moduleProgress}%)`);
      console.log(`      - Roadmap: ${inc.roadmapKey} (progress: ${inc.roadmapProgress}%)`);
      console.log(`      - Diferencia: ${inc.difference}%`);
      console.log(`      - Sugerencia: ${inc.suggestion}`);
    });
  } else {
    console.log(`   ✅ No hay descoordinaciones!`);
  }

  // ============================================================================
  // ESCENARIO 4: NUEVA TAREA COMPLETAMENTE NUEVA
  // ============================================================================

  console.log('\n\n📝 ESCENARIO 4: Analizar tarea NUEVA (no existe)');
  console.log('-'.repeat(80));

  const task2 = {
    description: "Implementar sistema de blockchain para certificados biométricos",
    moduleKey: null
  };

  console.log(`\n💬 Usuario dice: "${task2.description}"`);
  console.log(`\n🔍 Ejecutando PreTaskAnalyzer...`);

  const analysis2 = await PreTaskAnalyzer.analyzeTask(task2);

  console.log(`\n✨ RESULTADO:`);
  console.log(`   - Ya existe en roadmap: ${analysis2.existsInRoadmap ? '✅ SÍ' : '❌ NO'}`);
  console.log(`   - Ya existe en código: ${analysis2.existsInCode ? '✅ SÍ' : '❌ NO'}`);
  console.log(`   - Completitud estimada: ${analysis2.completionStatus.estimated}%`);
  console.log(`   - ${analysis2.recommendation}`);

  console.log(`\n📋 Plan de ejecución sugerido:`);
  analysis2.executionPlan.forEach((step, i) => {
    console.log(`   ${step}`);
  });

  // ============================================================================
  // RESUMEN FINAL
  // ============================================================================

  console.log('\n\n' + '='.repeat(80));
  console.log('🎉 DEMO COMPLETADA');
  console.log('='.repeat(80));

  console.log(`\n✅ Sistema Inteligente funcionando correctamente:`);
  console.log(`   1. ✅ PreTaskAnalyzer - Analiza tareas ANTES de empezar`);
  console.log(`   2. ✅ PostTaskSynchronizer - Sincroniza AL COMPLETAR`);
  console.log(`   3. ✅ CodeIntelligenceService - Detecta descoordinaciones`);

  console.log(`\n📚 Para usar en tu código:`);
  console.log(`   - POST /api/task-intelligence/analyze { "description": "..." }`);
  console.log(`   - POST /api/task-intelligence/complete { "taskId": "...", "phaseKey": "..." }`);
  console.log(`   - GET  /api/task-intelligence/inconsistencies`);

  console.log(`\n🤖 Para asignar tareas a Claude:`);
  console.log(`   - POST /api/task-intelligence/assign-to-claude { "taskId": "...", "phaseKey": "..." }`);

  console.log('\n');
}

// Ejecutar demo
demo().catch(error => {
  console.error(`\n❌ Error en demo: ${error.message}`);
  console.error(error.stack);
  process.exit(1);
});
