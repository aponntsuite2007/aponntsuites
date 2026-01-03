/**
 * POST-RUN LEARNING REPORT
 *
 * Script que se ejecuta automáticamente después de cada batch E2E
 * para generar reporte de mejora continua
 *
 * Uso:
 *   node tests/e2e/scripts/post-run-learning-report.js
 */

const fs = require('fs');
const path = require('path');

const KNOWLEDGE_DIR = path.join(__dirname, '../knowledge');
const LEARNED_PATTERNS_FILE = path.join(KNOWLEDGE_DIR, 'learned-patterns.json');
const EXECUTION_HISTORY_FILE = path.join(KNOWLEDGE_DIR, 'execution-history.json');
const REPORTS_DIR = path.join(__dirname, '../reports');

function generateLearningReport() {
  console.log('\n══════════════════════════════════════════════════════════');
  console.log('📊 GENERANDO REPORTE DE MEJORA CONTINUA');
  console.log('══════════════════════════════════════════════════════════\n');

  // Cargar datos
  const learnedPatterns = loadJSON(LEARNED_PATTERNS_FILE);
  const executionHistory = loadJSON(EXECUTION_HISTORY_FILE);

  if (!learnedPatterns || !executionHistory) {
    console.log('⚠️  No hay datos de aprendizaje disponibles');
    return;
  }

  // Generar reporte Markdown
  const report = generateMarkdownReport(learnedPatterns, executionHistory);

  // Guardar reporte
  const reportFile = path.join(REPORTS_DIR, `learning-report-${Date.now()}.md`);
  ensureDirExists(REPORTS_DIR);
  fs.writeFileSync(reportFile, report);

  console.log(`✅ Reporte generado: ${reportFile}\n`);

  // Mostrar resumen en consola
  displaySummary(learnedPatterns, executionHistory);
}

function loadJSON(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch (error) {
    console.error(`❌ Error cargando ${filePath}:`, error.message);
  }
  return null;
}

function generateMarkdownReport(patterns, history) {
  let md = '';

  md += '# 🧠 REPORTE DE MEJORA CONTINUA E2E\n\n';
  md += `**Generado**: ${new Date().toISOString()}\n\n`;
  md += '---\n\n';

  // Estadísticas globales
  md += '## 📊 ESTADÍSTICAS GLOBALES\n\n';
  md += `| Métrica | Valor |\n`;
  md += `|---------|-------|\n`;
  md += `| Total Ejecuciones | ${history.totalExecutions} |\n`;
  md += `| Total Errores Detectados | ${history.totalErrors} |\n`;
  md += `| Total Fixes Aplicados | ${history.totalFixes} |\n`;
  md += `| Total Mejoras Confirmadas | ${history.totalImprovements} |\n`;
  md += `| Tasa de Mejora Global | ${((history.totalImprovements / history.totalFixes) * 100).toFixed(1)}% |\n\n`;

  // Patterns aprendidos
  md += '## 🔍 PATTERNS APRENDIDOS\n\n';

  patterns.patterns.forEach(pattern => {
    const status = pattern.occurrences > 0 ? '🟢 ACTIVO' : '⚪ INACTIVO';
    const successRate = pattern.appliedCount > 0
      ? `${(pattern.successRate * 100).toFixed(1)}%`
      : 'N/A';

    md += `### ${status} ${pattern.name}\n\n`;
    md += `**ID**: \`${pattern.id}\`\n\n`;
    md += `**Descripción**: ${pattern.description}\n\n`;
    md += `**Pattern de Error**: \`${pattern.errorPattern}\`\n\n`;
    md += `**Fix**:\n`;
    md += `- Tipo: \`${pattern.fix.type}\`\n`;
    md += `- Acción: \`${pattern.fix.action}\`\n`;
    md += `- Confidence: ${(pattern.fix.confidence * 100).toFixed(0)}%\n`;
    md += `- Auto-apply: ${pattern.fix.confidence >= 0.90 ? '✅ Sí' : '❌ No (requiere aprobación)'}\n\n`;
    md += `**Métricas**:\n`;
    md += `- Ocurrencias: ${pattern.occurrences}\n`;
    md += `- Fixes aplicados: ${pattern.appliedCount}\n`;
    md += `- Mejoras confirmadas: ${pattern.improvedCount}\n`;
    md += `- Tasa de éxito: ${successRate}\n\n`;
    md += '---\n\n';
  });

  // Historial reciente
  md += '## 📜 HISTORIAL DE EJECUCIONES (Últimas 10)\n\n';

  const recentExecutions = history.executions.slice(-10).reverse();

  md += `| Fecha | Errores | Fixes | Mejoras | Tasa |\n`;
  md += `|-------|---------|-------|---------|------|\n`;

  recentExecutions.forEach(exec => {
    const date = new Date(exec.startTime).toLocaleString();
    const rate = exec.metrics && exec.metrics.totalFixes > 0
      ? `${(exec.metrics.improvementRate * 100).toFixed(1)}%`
      : 'N/A';

    md += `| ${date} | ${exec.metrics?.totalErrors || 0} | ${exec.metrics?.totalFixes || 0} | ${exec.metrics?.totalImprovements || 0} | ${rate} |\n`;
  });

  md += '\n---\n\n';

  // Recomendaciones
  md += '## 💡 RECOMENDACIONES\n\n';

  const lowConfidencePatterns = patterns.patterns.filter(p => p.fix.confidence < 0.90 && p.occurrences > 0);
  const ineffectivePatterns = patterns.patterns.filter(p => p.appliedCount > 5 && p.successRate < 0.50);

  if (lowConfidencePatterns.length > 0) {
    md += '### Patterns con Low Confidence\n\n';
    md += 'Estos patterns requieren revisión manual para aumentar confidence:\n\n';
    lowConfidencePatterns.forEach(p => {
      md += `- **${p.name}** (${(p.fix.confidence * 100).toFixed(0)}% confidence, ${p.occurrences} ocurrencias)\n`;
    });
    md += '\n';
  }

  if (ineffectivePatterns.length > 0) {
    md += '### Patterns Inefectivos\n\n';
    md += 'Estos patterns han sido aplicados pero no mejoran resultados:\n\n';
    ineffectivePatterns.forEach(p => {
      md += `- **${p.name}** (${p.appliedCount} aplicados, ${(p.successRate * 100).toFixed(1)}% éxito)\n`;
    });
    md += '\n';
  }

  if (lowConfidencePatterns.length === 0 && ineffectivePatterns.length === 0) {
    md += '✅ Todos los patterns están funcionando correctamente.\n\n';
  }

  md += '---\n\n';
  md += `_Reporte generado automáticamente por E2E Learning Engine v${patterns.version}_\n`;

  return md;
}

function displaySummary(patterns, history) {
  console.log('══════════════════════════════════════════════════════════');
  console.log('📊 RESUMEN DE APRENDIZAJE');
  console.log('══════════════════════════════════════════════════════════');
  console.log(`Total Patterns: ${patterns.patterns.length}`);
  console.log(`Patterns Activos: ${patterns.patterns.filter(p => p.occurrences > 0).length}`);
  console.log(`Total Ejecuciones: ${history.totalExecutions}`);
  console.log(`Total Fixes Aplicados: ${history.totalFixes}`);
  console.log(`Total Mejoras: ${history.totalImprovements}`);
  console.log(`Tasa de Mejora: ${history.totalFixes > 0 ? ((history.totalImprovements / history.totalFixes) * 100).toFixed(1) : 0}%`);
  console.log('══════════════════════════════════════════════════════════\n');

  // Top 3 patterns más efectivos
  const effectivePatterns = patterns.patterns
    .filter(p => p.appliedCount > 0)
    .sort((a, b) => b.successRate - a.successRate)
    .slice(0, 3);

  if (effectivePatterns.length > 0) {
    console.log('🏆 TOP 3 PATTERNS MÁS EFECTIVOS:\n');
    effectivePatterns.forEach((p, i) => {
      console.log(`${i + 1}. ${p.name}`);
      console.log(`   Tasa de éxito: ${(p.successRate * 100).toFixed(1)}%`);
      console.log(`   Aplicado ${p.appliedCount} veces, ${p.improvedCount} mejoras\n`);
    });
  }
}

function ensureDirExists(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  generateLearningReport();
}

module.exports = { generateLearningReport };
