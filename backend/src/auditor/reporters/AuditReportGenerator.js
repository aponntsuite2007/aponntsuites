/**
 * AUDIT REPORT GENERATOR
 *
 * Genera reportes detallados en Markdown de auditorías para que Claude Code pueda leerlos y reparar
 *
 * CARACTERÍSTICAS:
 * - Reportes en Markdown profesionales
 * - Versionado automático (timestamp)
 * - Snapshots de código (hashes)
 * - Categorización por severidad
 * - Análisis con Ollama
 * - Datos estructurados JSON
 *
 * @version 1.0.0
 * @date 2025-01-20
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class AuditReportGenerator {
  constructor(assistantService = null) {
    this.assistantService = assistantService;
    this.reportsDir = path.join(__dirname, '../../../audit-reports');

    // Crear directorio si no existe
    if (!fs.existsSync(this.reportsDir)) {
      fs.mkdirSync(this.reportsDir, { recursive: true });
    }
  }

  /**
   * GENERAR REPORTE COMPLETO
   */
  async generateReport(executionId, errors, summary, companyId = 11) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + '_' +
                      new Date().toTimeString().split(' ')[0].replace(/:/g, '-');

    const reportDir = path.join(this.reportsDir, timestamp);

    // Crear directorio del reporte
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    console.log('');
    console.log('📝 [REPORT-GENERATOR] Generando reporte detallado...');
    console.log(`   Directorio: ${reportDir}`);

    // 1. Categorizar errores por severidad
    const categorized = this._categorizeErrors(errors);

    // 2. Generar snapshots de código
    const frontendSnapshot = await this._generateCodeSnapshot('frontend');
    const backendSnapshot = await this._generateCodeSnapshot('backend');

    // 3. Generar análisis con Ollama (si está disponible)
    const aiAnalysis = await this._generateAIAnalysis(errors, companyId);

    // 4. Generar reporte Markdown
    const markdownReport = await this._generateMarkdownReport(
      executionId,
      summary,
      categorized,
      aiAnalysis,
      timestamp
    );

    // 5. Guardar archivos
    fs.writeFileSync(
      path.join(reportDir, 'AUDIT-REPORT.md'),
      markdownReport,
      'utf8'
    );

    fs.writeFileSync(
      path.join(reportDir, 'errors-by-severity.json'),
      JSON.stringify(categorized, null, 2),
      'utf8'
    );

    fs.writeFileSync(
      path.join(reportDir, 'frontend-snapshot.txt'),
      frontendSnapshot,
      'utf8'
    );

    fs.writeFileSync(
      path.join(reportDir, 'backend-snapshot.txt'),
      backendSnapshot,
      'utf8'
    );

    // 6. Guardar análisis de IA si existe
    if (aiAnalysis && aiAnalysis.length > 0) {
      fs.writeFileSync(
        path.join(reportDir, 'ai-analysis.json'),
        JSON.stringify(aiAnalysis, null, 2),
        'utf8'
      );
    }

    console.log('');
    console.log('✅ [REPORT-GENERATOR] Reporte generado exitosamente');
    console.log(`   📄 AUDIT-REPORT.md`);
    console.log(`   📊 errors-by-severity.json`);
    console.log(`   📸 frontend-snapshot.txt`);
    console.log(`   📸 backend-snapshot.txt`);
    if (aiAnalysis && aiAnalysis.length > 0) {
      console.log(`   🧠 ai-analysis.json (${aiAnalysis.length} análisis)`);
    }
    console.log('');

    const reportInfo = {
      reportDir,
      timestamp,
      files: {
        markdown: path.join(reportDir, 'AUDIT-REPORT.md'),
        errorsJson: path.join(reportDir, 'errors-by-severity.json'),
        frontendSnapshot: path.join(reportDir, 'frontend-snapshot.txt'),
        backendSnapshot: path.join(reportDir, 'backend-snapshot.txt'),
        aiAnalysis: aiAnalysis && aiAnalysis.length > 0 ? path.join(reportDir, 'ai-analysis.json') : null
      }
    };

    // NOTIFICAR A CLAUDE CODE - Sistema de ciclo virtuoso
    this._notifyClaudeCode(executionId, reportInfo, categorized, summary);

    return reportInfo;
  }

  /**
   * CATEGORIZAR ERRORES POR SEVERIDAD
   */
  _categorizeErrors(errors) {
    const categorized = {
      critical: [],
      high: [],
      medium: [],
      low: []
    };

    errors.forEach(error => {
      const severity = this._determineSeverity(error);
      categorized[severity].push({
        ...error,
        severity
      });
    });

    return categorized;
  }

  /**
   * DETERMINAR SEVERIDAD DEL ERROR
   */
  _determineSeverity(error) {
    const errorMsg = error.error.toLowerCase();

    // CRITICAL: Errores de base de datos, crashes
    if (errorMsg.includes('column') && errorMsg.includes('does not exist')) return 'critical';
    if (errorMsg.includes('database')) return 'critical';
    if (errorMsg.includes('sql')) return 'critical';
    if (errorMsg.includes('crash')) return 'critical';

    // HIGH: Errores de funcionalidad core
    if (errorMsg.includes('cannot read')) return 'high';
    if (errorMsg.includes('undefined')) return 'high';
    if (errorMsg.includes('null')) return 'high';

    // MEDIUM: Errores de UI
    if (errorMsg.includes('button')) return 'medium';
    if (errorMsg.includes('modal')) return 'medium';
    if (errorMsg.includes('tests fallaron')) return 'medium';

    // LOW: Warnings, errores menores
    return 'low';
  }

  /**
   * GENERAR SNAPSHOT DE CÓDIGO
   */
  async _generateCodeSnapshot(type) {
    const baseDir = type === 'frontend' ?
      path.join(__dirname, '../../../public') :
      path.join(__dirname, '../../../src');

    let snapshot = `# ${type.toUpperCase()} CODE SNAPSHOT\n`;
    snapshot += `Generated: ${new Date().toISOString()}\n\n`;

    try {
      const files = this._getRelevantFiles(baseDir, type);

      snapshot += `Total files: ${files.length}\n\n`;
      snapshot += `## File Hashes (MD5)\n\n`;

      files.forEach(file => {
        const relativePath = path.relative(baseDir, file);
        const content = fs.readFileSync(file, 'utf8');
        const hash = crypto.createHash('md5').update(content).digest('hex');
        const size = Buffer.byteLength(content, 'utf8');

        snapshot += `${hash}  ${relativePath} (${size} bytes)\n`;
      });

    } catch (error) {
      snapshot += `ERROR: ${error.message}\n`;
    }

    return snapshot;
  }

  /**
   * OBTENER ARCHIVOS RELEVANTES
   */
  _getRelevantFiles(dir, type, filesList = []) {
    try {
      const files = fs.readdirSync(dir);

      files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
          // Ignorar node_modules, .git, etc
          if (!file.startsWith('.') && file !== 'node_modules') {
            this._getRelevantFiles(filePath, type, filesList);
          }
        } else {
          // Solo archivos relevantes
          if (type === 'frontend' && (file.endsWith('.js') || file.endsWith('.html'))) {
            filesList.push(filePath);
          } else if (type === 'backend' && file.endsWith('.js')) {
            filesList.push(filePath);
          }
        }
      });
    } catch (error) {
      // Ignorar errores de permisos
    }

    return filesList;
  }

  /**
   * GENERAR ANÁLISIS CON OLLAMA
   */
  async _generateAIAnalysis(errors, companyId) {
    if (!this.assistantService) {
      return [];
    }

    console.log(`   🧠 Generando análisis con Ollama para ${errors.length} errores...`);

    const analyses = [];

    // Limitar a 10 errores para no saturar (puedes ajustar)
    const errorsToAnalyze = errors.slice(0, 10);

    for (const error of errorsToAnalyze) {
      try {
        const prompt = `
ANÁLISIS TÉCNICO REQUERIDO:

MÓDULO: ${error.module}
TEST: ${error.test}
ERROR: ${error.error}

Por favor proporciona:
1. CAUSA RAÍZ: ¿Cuál es la causa técnica exacta del error?
2. IMPACTO: ¿Qué funcionalidad se ve afectada?
3. SOLUCIÓN: Pasos específicos para reparar (incluye código si es necesario)
4. PRIORIDAD: ¿Es crítico, alto, medio o bajo?
5. TIEMPO ESTIMADO: ¿Cuánto tiempo tomaría repararlo?

Sé conciso pero específico. Máximo 500 palabras.
`.trim();

        // ✅ FIX 5: Corregir parámetros de chat() - debe ser { companyId, userId, userRole, question, context }
        const response = await this.assistantService.chat({
          companyId: companyId,
          userId: 'auditor-system',
          userRole: 'admin',
          question: prompt,
          context: { module: error.module }
        });

        analyses.push({
          module: error.module,
          test: error.test,
          error: error.error,
          aiAnalysis: response.answer,
          confidence: response.confidence || 0,
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        console.log(`   ⚠️  Error analizando con IA: ${error.message}`);
      }
    }

    console.log(`   ✅ ${analyses.length} análisis generados`);

    return analyses;
  }

  /**
   * GENERAR REPORTE MARKDOWN
   */
  async _generateMarkdownReport(executionId, summary, categorized, aiAnalysis, timestamp) {
    let md = '';

    // Header
    md += `# 🔍 AUDIT REPORT\n\n`;
    md += `**Generated**: ${new Date().toISOString()}\n`;
    md += `**Execution ID**: ${executionId}\n`;
    md += `**Timestamp**: ${timestamp}\n\n`;

    md += `---\n\n`;

    // Executive Summary
    md += `## 📊 EXECUTIVE SUMMARY\n\n`;
    md += `| Metric | Value |\n`;
    md += `|--------|-------|\n`;
    md += `| Total Tests | ${summary.total} |\n`;
    md += `| ✅ Passed | ${summary.passed} |\n`;
    md += `| ❌ Failed | ${summary.failed} |\n`;
    md += `| ⚠️ Warnings | ${summary.warnings || 0} |\n`;
    md += `| 📈 Success Rate | ${summary.success_rate ? summary.success_rate.toFixed(1) : '0.0'}% |\n`;
    md += `| ⏱️ Duration | ${summary.total_duration_ms ? (summary.total_duration_ms / 1000).toFixed(1) : '0'}s |\n\n`;

    // Errors by Severity
    md += `## 🎯 ERRORS BY SEVERITY\n\n`;

    const totalErrors = Object.values(categorized).flat().length;
    md += `**Total Errors**: ${totalErrors}\n\n`;

    ['critical', 'high', 'medium', 'low'].forEach(severity => {
      const errors = categorized[severity];
      const icon = severity === 'critical' ? '🔴' : severity === 'high' ? '🟠' : severity === 'medium' ? '🟡' : '🟢';

      md += `### ${icon} ${severity.toUpperCase()} (${errors.length})\n\n`;

      if (errors.length > 0) {
        errors.forEach((error, i) => {
          md += `#### ${i + 1}. ${error.test}\n\n`;
          md += `**Module**: \`${error.module}\`\n\n`;
          md += `**Error**:\n\`\`\`\n${error.error}\n\`\`\`\n\n`;

          if (error.context) {
            md += `**Context**: ${error.context}\n\n`;
          }

          md += `---\n\n`;
        });
      } else {
        md += `No errors in this category.\n\n`;
      }
    });

    // AI Analysis
    if (aiAnalysis && aiAnalysis.length > 0) {
      md += `## 🧠 AI ANALYSIS (Ollama)\n\n`;
      md += `**Analyzed Errors**: ${aiAnalysis.length} / ${totalErrors}\n\n`;

      aiAnalysis.forEach((analysis, i) => {
        md += `### Analysis ${i + 1}: ${analysis.test}\n\n`;
        md += `**Module**: \`${analysis.module}\`\n\n`;
        md += `**AI Response**:\n\n${analysis.aiAnalysis}\n\n`;
        md += `**Confidence**: ${(analysis.confidence * 100).toFixed(0)}%\n\n`;
        md += `---\n\n`;
      });
    }

    // Recommendations for Claude Code
    md += `## 🤖 RECOMMENDATIONS FOR CLAUDE CODE\n\n`;
    md += `### Priority Order:\n\n`;
    md += `1. **CRITICAL** (${categorized.critical.length}) - Fix immediately, system stability at risk\n`;
    md += `2. **HIGH** (${categorized.high.length}) - Fix soon, core functionality broken\n`;
    md += `3. **MEDIUM** (${categorized.medium.length}) - Fix when possible, UX degraded\n`;
    md += `4. **LOW** (${categorized.low.length}) - Fix if time permits\n\n`;

    md += `### Next Steps:\n\n`;
    md += `1. Read this report carefully\n`;
    md += `2. Start with CRITICAL errors\n`;
    md += `3. Apply fixes systematically\n`;
    md += `4. Re-run audit after each fix\n`;
    md += `5. Compare results with previous run\n\n`;

    md += `---\n\n`;
    md += `*Report generated by Hybrid Auditor System (Ollama + Claude Code)*\n`;

    return md;
  }

  /**
   * NOTIFICAR A CLAUDE CODE
   * Sistema de ciclo virtuoso: Escribe archivo de notificación para que Claude Code pueda interceptar
   */
  _notifyClaudeCode(executionId, reportInfo, categorized, summary) {
    const notificationDir = path.join(__dirname, '../../../.claude-notifications');

    // Crear directorio si no existe
    if (!fs.existsSync(notificationDir)) {
      fs.mkdirSync(notificationDir, { recursive: true });
    }

    const notification = {
      timestamp: new Date().toISOString(),
      reportPath: reportInfo.files.markdown,
      executionId: executionId,
      summary: {
        total: summary.total,
        passed: summary.passed,
        failed: summary.failed,
        successRate: summary.success_rate || 0,
        critical: categorized.critical.length,
        high: categorized.high.length,
        medium: categorized.medium.length,
        low: categorized.low.length
      },
      status: 'pending_review',
      message: '🔔 Nuevo reporte de auditoría disponible. Claude Code puede leer el reporte y aplicar fixes.',
      actions: {
        readReport: `Read ${reportInfo.files.markdown}`,
        markAsReviewed: 'POST http://localhost:9998/api/audit/reports/mark-reviewed',
        startNextCycle: 'POST http://localhost:9998/api/audit/iterative/start'
      }
    };

    // Escribir archivo de notificación
    fs.writeFileSync(
      path.join(notificationDir, 'latest-report.json'),
      JSON.stringify(notification, null, 2),
      'utf8'
    );

    console.log('');
    console.log('🔔 [NOTIFICATION] Claude Code ha sido notificado');
    console.log(`   📁 Archivo: ${path.join(notificationDir, 'latest-report.json')}`);
    console.log('');
  }

  /**
   * OBTENER ÚLTIMO REPORTE
   */
  getLatestReport() {
    const reports = fs.readdirSync(this.reportsDir);
    if (reports.length === 0) return null;

    reports.sort().reverse();
    const latestDir = path.join(this.reportsDir, reports[0]);

    return {
      dir: latestDir,
      markdown: path.join(latestDir, 'AUDIT-REPORT.md'),
      errorsJson: path.join(latestDir, 'errors-by-severity.json')
    };
  }
}

module.exports = AuditReportGenerator;
