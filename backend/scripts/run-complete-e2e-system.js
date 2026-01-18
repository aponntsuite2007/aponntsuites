/**
 * ═══════════════════════════════════════════════════════════════════════════
 * RUN COMPLETE E2E SYSTEM - 72 Módulos + 7 Phases + Auto-Reparación
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Ejecuta el sistema completo:
 * - 72 módulos
 * - 7 Phases (E2E, Load, Security, MultiTenant, Database, Monitoring, EdgeCases)
 * - Auto-reparación con HybridHealer
 * - Genera reporte completo
 *
 * @version 1.0.0
 * @date 2026-01-08
 * ═══════════════════════════════════════════════════════════════════════════
 */

require('dotenv').config();
const MasterTestOrchestrator = require('../src/testing/e2e-advanced/MasterTestOrchestrator');
const database = require('../src/config/database');
const fs = require('fs').promises;
const path = require('path');

async function main() {
  console.log('\n' + '═'.repeat(80));
  console.log('🚀 MASTER TEST ORCHESTRATOR - Sistema Completo E2E');
  console.log('═'.repeat(80));
  console.log('\n📊 ALCANCE:');
  console.log('   • Módulos: 72');
  console.log('   • Phases: 7 (E2E, Load, Security, MultiTenant, Database, Monitoring, EdgeCases)');
  console.log('   • Auto-reparación: HybridHealer activado');
  console.log('   • Objetivo: 95%+ confidence score\n');

  let orchestrator = null;

  try {
    // 1. Crear orchestrator
    console.log('🔧 Inicializando MasterTestOrchestrator...\n');

    orchestrator = new MasterTestOrchestrator(database, {
      baseURL: `http://localhost:${process.env.PORT || 9998}`,
      saveResults: true,
      autoHeal: true,
      stopOnFailure: false,
      mode: 'sequential',
      onProgress: (update) => {
        console.log(`📡 [${update.phase}] ${update.message}`);
      }
    });

    console.log('✅ Orchestrator inicializado\n');

    // 2. Ejecutar todas las phases
    console.log('🚀 Iniciando ejecución de 7 phases...\n');
    console.log('⏰ Tiempo estimado: 3-5 horas (depende de los módulos)\n');

    const startTime = Date.now();

    const executionResult = await orchestrator.runFullSuite({
      modules: [], // [] = todos los 72 módulos
      parallel: false // Sequential para estabilidad
    });

    const duration = ((Date.now() - startTime) / 1000 / 60).toFixed(2);

    // 3. Mostrar resultados
    console.log('\n' + '═'.repeat(80));
    console.log('✅ EJECUCIÓN COMPLETADA');
    console.log('═'.repeat(80));
    console.log(`\n⏱️  Duración: ${duration} minutos\n`);

    // 4. Extraer confidence score (ya viene calculado)
    const confidenceScore = executionResult.confidenceScore;
    const results = executionResult.results.phases || {};

    console.log('📊 RESULTADOS POR PHASE:\n');
    Object.entries(results).forEach(([phase, result]) => {
      const status = result.status === 'passed' ? '✅' : '❌';
      const score = result.score || 0;
      console.log(`   ${status} ${phase.padEnd(15)}: ${score}/100 (${result.passed}/${result.total} tests)`);
    });

    console.log(`\n🎯 CONFIDENCE SCORE TOTAL: ${confidenceScore.overall}/100\n`);

    if (confidenceScore.overall >= 95) {
      console.log('🎉 ¡EXCELENTE! Sistema listo para producción\n');
    } else if (confidenceScore.overall >= 85) {
      console.log('⚠️  Bueno, pero requiere mejoras menores\n');
    } else {
      console.log('❌ Requiere trabajo adicional antes de producción\n');
    }

    // 5. Guardar reporte
    const reportPath = path.join(__dirname, '../TESTING-FINAL-REPORT.md');
    await fs.writeFile(reportPath, generateReport(results, confidenceScore, duration), 'utf8');
    console.log(`📄 Reporte guardado en: ${reportPath}\n`);

    // 6. Auto-reparación
    if (orchestrator.healedIssues && orchestrator.healedIssues.length > 0) {
      console.log('🔧 AUTO-REPARACIONES APLICADAS:\n');
      orchestrator.healedIssues.forEach((fix, i) => {
        console.log(`   ${i + 1}. ${fix.file}: ${fix.issue}`);
        console.log(`      ✅ ${fix.fix}\n`);
      });
    }

    process.exit(confidenceScore.overall >= 85 ? 0 : 1);

  } catch (error) {
    console.error('\n❌ ERROR FATAL:\n', error);
    console.error(error.stack);
    process.exit(1);
  }
}

function generateReport(results, confidenceScore, duration) {
  let report = `# 📊 TESTING FINAL REPORT - Sistema Completo E2E\n\n`;
  report += `**Fecha**: ${new Date().toISOString()}\n`;
  report += `**Duración**: ${duration} minutos\n`;
  report += `**Confidence Score**: ${confidenceScore.overall}/100\n\n`;

  report += `## ✅ RESUMEN EJECUTIVO\n\n`;
  report += `\`\`\`\n`;
  report += `Total Phases: 7\n`;

  const passed = Object.values(results).filter(r => r.status === 'passed').length;
  const failed = Object.values(results).filter(r => r.status === 'failed').length;

  report += `✅ Passed:    ${passed} (${((passed/7)*100).toFixed(1)}%)\n`;
  report += `❌ Failed:    ${failed}\n`;
  report += `\`\`\`\n\n`;

  report += `## 📋 RESULTADOS POR PHASE\n\n`;

  Object.entries(results).forEach(([phase, result]) => {
    const status = result.status === 'passed' ? '✅ PASS' : '❌ FAIL';
    report += `### ${phase}\n\n`;
    report += `**Status**: ${status}\n`;
    report += `**Score**: ${result.score || 0}/100\n`;
    report += `**Tests**: ${result.passed}/${result.total}\n\n`;

    if (result.errors && result.errors.length > 0) {
      report += `**Errores**:\n`;
      result.errors.slice(0, 5).forEach(err => {
        report += `- ${err}\n`;
      });
      report += `\n`;
    }
  });

  report += `## 🎯 CONCLUSIÓN\n\n`;
  if (confidenceScore.overall >= 95) {
    report += `✅ Sistema listo para producción\n`;
  } else if (confidenceScore.overall >= 85) {
    report += `⚠️ Sistema funcional, requiere mejoras menores\n`;
  } else {
    report += `❌ Sistema requiere trabajo adicional\n`;
  }

  return report;
}

// Ejecutar
main();
