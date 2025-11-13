/**
 * ============================================================================
 * TECHNICAL REPORT GENERATOR - Reportes Técnicos Detallados del Auditor
 * ============================================================================
 *
 * Genera reportes super detallados de las ejecuciones del auditor:
 * - Numeración secuencial de cada paso
 * - Timestamps precisos
 * - Análisis completo de errores
 * - Soluciones aplicadas
 * - Aprendizaje incorporado
 * - Métricas de performance
 * - Comparación con ejecuciones anteriores
 *
 * @version 1.0.0
 * @date 2025-10-29
 * ============================================================================
 */

const fs = require('fs').promises;
const path = require('path');

class TechnicalReportGenerator {
    constructor(database, systemRegistry) {
        this.database = database;
        this.systemRegistry = systemRegistry;
        this.reportsDir = path.join(process.cwd(), 'audit-reports');
    }

    /**
     * ========================================================================
     * GENERAR REPORTE TÉCNICO COMPLETO
     * ========================================================================
     */
    async generateTechnicalReport(execution_id, options = {}) {
        const {
            includeComparison = true,
            includeKnowledge = true,
            includeMetrics = true,
            format = 'markdown' // markdown, json, html
        } = options;

        console.log('\n📝 [REPORT] Generando reporte técnico detallado...');

        const reportData = {
            metadata: await this.generateMetadata(execution_id),
            execution: await this.generateExecutionDetails(execution_id),
            tests: await this.generateTestDetails(execution_id),
            errors: await this.generateErrorAnalysis(execution_id),
            repairs: await this.generateRepairDetails(execution_id),
            learning: includeKnowledge ? await this.generateLearningDetails(execution_id) : null,
            metrics: includeMetrics ? await this.generateMetrics(execution_id) : null,
            comparison: includeComparison ? await this.generateComparison(execution_id) : null
        };

        // Generar reporte en formato solicitado
        let reportContent;
        if (format === 'markdown') {
            reportContent = this.formatAsMarkdown(reportData);
        } else if (format === 'json') {
            reportContent = JSON.stringify(reportData, null, 2);
        } else if (format === 'html') {
            reportContent = this.formatAsHTML(reportData);
        }

        // Guardar reporte
        const filename = await this.saveReport(execution_id, reportContent, format);

        console.log(`✅ [REPORT] Reporte generado: ${filename}\n`);

        return {
            filename,
            reportData,
            path: path.join(this.reportsDir, filename)
        };
    }

    /**
     * ========================================================================
     * METADATA DEL REPORTE
     * ========================================================================
     */
    async generateMetadata(execution_id) {
        return {
            report_id: `REPORT-${execution_id}`,
            generated_at: new Date().toISOString(),
            generated_by: 'TechnicalReportGenerator v1.0.0',
            execution_id: execution_id,
            format_version: '1.0.0'
        };
    }

    /**
     * ========================================================================
     * DETALLES DE LA EJECUCIÓN
     * ========================================================================
     */
    async generateExecutionDetails(execution_id) {
        const logs = await this.database.AuditLog.findAll({
            where: { execution_id },
            order: [['started_at', 'ASC']],
            raw: true
        });

        if (logs.length === 0) {
            return { error: 'No se encontraron logs para esta ejecución' };
        }

        const firstLog = logs[0];
        const lastLog = logs[logs.length - 1];

        const startTime = new Date(firstLog.started_at);
        const endTime = new Date(lastLog.completed_at || lastLog.started_at);
        const durationMs = endTime - startTime;

        // Contar por status
        const statusCounts = {
            passed: logs.filter(l => l.status === 'passed' || l.status === 'pass').length,
            failed: logs.filter(l => l.status === 'failed' || l.status === 'fail').length,
            warning: logs.filter(l => l.status === 'warning').length,
            fixed: logs.filter(l => l.fix_applied).length
        };

        return {
            execution_id,
            started_at: startTime.toISOString(),
            completed_at: endTime.toISOString(),
            duration_ms: durationMs,
            duration_human: this.formatDuration(durationMs),
            environment: firstLog.environment,
            triggered_by: firstLog.triggered_by,
            total_tests: logs.length,
            status_counts: statusCounts,
            success_rate: ((statusCounts.passed / logs.length) * 100).toFixed(2) + '%',
            modules_tested: [...new Set(logs.map(l => l.module_name))],
            test_types: [...new Set(logs.map(l => l.test_type))]
        };
    }

    /**
     * ========================================================================
     * DETALLES DE TESTS (NUMERADOS)
     * ========================================================================
     */
    async generateTestDetails(execution_id) {
        const logs = await this.database.AuditLog.findAll({
            where: { execution_id },
            order: [['started_at', 'ASC']],
            raw: true
        });

        return logs.map((log, index) => {
            const startTime = new Date(log.started_at);
            const endTime = log.completed_at ? new Date(log.completed_at) : startTime;
            const durationMs = endTime - startTime;

            return {
                number: index + 1,
                test_id: log.id,
                timestamp: log.started_at,
                module: log.module_name,
                test_name: log.test_name,
                test_type: log.test_type,
                status: log.status,
                duration_ms: durationMs,
                duration_human: this.formatDuration(durationMs),
                error: log.error_message ? {
                    message: log.error_message,
                    type: log.error_type,
                    file: log.error_file,
                    line: log.error_line
                } : null,
                fix_attempted: log.fix_attempted,
                fix_applied: log.fix_applied
            };
        });
    }

    /**
     * ========================================================================
     * ANÁLISIS DE ERRORES
     * ========================================================================
     */
    async generateErrorAnalysis(execution_id) {
        const logs = await this.database.AuditLog.findAll({
            where: {
                execution_id,
                status: ['failed', 'fail']
            },
            order: [['started_at', 'ASC']],
            raw: true
        });

        const errorPatterns = {};
        const errorsByModule = {};
        const errorsByType = {};

        logs.forEach((log, index) => {
            // Agrupar por patrón de error
            const pattern = this.extractErrorPattern(log.error_message);
            if (!errorPatterns[pattern]) {
                errorPatterns[pattern] = {
                    pattern,
                    count: 0,
                    examples: []
                };
            }
            errorPatterns[pattern].count++;
            if (errorPatterns[pattern].examples.length < 3) {
                errorPatterns[pattern].examples.push({
                    test_number: index + 1,
                    module: log.module_name,
                    message: log.error_message
                });
            }

            // Agrupar por módulo
            if (!errorsByModule[log.module_name]) {
                errorsByModule[log.module_name] = 0;
            }
            errorsByModule[log.module_name]++;

            // Agrupar por tipo
            const errorType = log.error_type || 'unknown';
            if (!errorsByType[errorType]) {
                errorsByType[errorType] = 0;
            }
            errorsByType[errorType]++;
        });

        return {
            total_errors: logs.length,
            error_patterns: Object.values(errorPatterns).sort((a, b) => b.count - a.count),
            errors_by_module: errorsByModule,
            errors_by_type: errorsByType,
            detailed_errors: logs.map((log, index) => ({
                number: index + 1,
                timestamp: log.started_at,
                module: log.module_name,
                test_name: log.test_name,
                error_message: log.error_message,
                error_stack: log.error_stack,
                severity: this.calculateErrorSeverity(log)
            }))
        };
    }

    /**
     * ========================================================================
     * DETALLES DE REPARACIONES
     * ========================================================================
     */
    async generateRepairDetails(execution_id) {
        const logs = await this.database.AuditLog.findAll({
            where: {
                execution_id,
                fix_attempted: true
            },
            order: [['started_at', 'ASC']],
            raw: true
        });

        return {
            total_repairs_attempted: logs.length,
            repairs_successful: logs.filter(l => l.fix_applied).length,
            repairs_failed: logs.filter(l => !l.fix_applied).length,
            success_rate: logs.length > 0
                ? ((logs.filter(l => l.fix_applied).length / logs.length) * 100).toFixed(2) + '%'
                : 'N/A',
            detailed_repairs: logs.map((log, index) => ({
                number: index + 1,
                timestamp: log.started_at,
                module: log.module_name,
                test_name: log.test_name,
                error_original: log.error_message,
                fix_strategy: log.fix_strategy,
                fix_result: log.fix_result,
                fix_applied: log.fix_applied,
                suggestions: log.suggestions
            }))
        };
    }

    /**
     * ========================================================================
     * DETALLES DE APRENDIZAJE
     * ========================================================================
     */
    async generateLearningDetails(execution_id) {
        try {
            // Buscar patrones aprendidos de esta ejecución
            const patterns = await this.database.sequelize.query(
                `SELECT * FROM learning_patterns
                 WHERE execution_id = :execution_id
                 ORDER BY learned_at DESC`,
                {
                    replacements: { execution_id },
                    type: this.database.sequelize.QueryTypes.SELECT
                }
            );

            return {
                total_patterns_learned: patterns.length,
                patterns: patterns.map((pattern, index) => ({
                    number: index + 1,
                    pattern_id: pattern.id,
                    learned_at: pattern.learned_at,
                    error_pattern: pattern.error_pattern,
                    solution_pattern: pattern.solution_pattern,
                    success_count: pattern.success_count,
                    confidence_score: pattern.confidence_score,
                    files_affected: pattern.files_affected
                }))
            };
        } catch (error) {
            console.log('⚠️  [REPORT] Learning patterns table not available');
            return {
                total_patterns_learned: 0,
                patterns: [],
                note: 'Learning patterns table not available in database'
            };
        }
    }

    /**
     * ========================================================================
     * MÉTRICAS DE PERFORMANCE
     * ========================================================================
     */
    async generateMetrics(execution_id) {
        const logs = await this.database.AuditLog.findAll({
            where: { execution_id },
            raw: true
        });

        if (logs.length === 0) {
            return { error: 'No metrics available' };
        }

        // Calcular duraciones
        const durations = logs
            .filter(l => l.started_at && l.completed_at)
            .map(l => new Date(l.completed_at) - new Date(l.started_at));

        const avgDuration = durations.length > 0
            ? durations.reduce((a, b) => a + b, 0) / durations.length
            : 0;

        const minDuration = durations.length > 0 ? Math.min(...durations) : 0;
        const maxDuration = durations.length > 0 ? Math.max(...durations) : 0;

        return {
            total_tests: logs.length,
            avg_test_duration_ms: Math.round(avgDuration),
            avg_test_duration_human: this.formatDuration(avgDuration),
            min_test_duration_ms: minDuration,
            min_test_duration_human: this.formatDuration(minDuration),
            max_test_duration_ms: maxDuration,
            max_test_duration_human: this.formatDuration(maxDuration),
            tests_per_minute: logs.length > 0
                ? (logs.length / (avgDuration / 60000)).toFixed(2)
                : 0
        };
    }

    /**
     * ========================================================================
     * COMPARACIÓN CON EJECUCIONES ANTERIORES
     * ========================================================================
     */
    async generateComparison(execution_id) {
        try {
            // Obtener ejecución actual
            const currentLogs = await this.database.AuditLog.findAll({
                where: { execution_id },
                raw: true
            });

            if (currentLogs.length === 0) {
                return { error: 'No data for current execution' };
            }

            const currentModule = currentLogs[0].module_name;

            // Buscar ejecución anterior del mismo módulo
            const previousExecution = await this.database.sequelize.query(
                `SELECT DISTINCT execution_id, started_at
                 FROM audit_logs
                 WHERE module_name = :module
                   AND execution_id != :current_execution_id
                 ORDER BY started_at DESC
                 LIMIT 1`,
                {
                    replacements: {
                        module: currentModule,
                        current_execution_id: execution_id
                    },
                    type: this.database.sequelize.QueryTypes.SELECT
                }
            );

            if (previousExecution.length === 0) {
                return {
                    message: 'No previous execution found for comparison',
                    first_run: true
                };
            }

            const previousExecutionId = previousExecution[0].execution_id;

            // Obtener logs de ejecución anterior
            const previousLogs = await this.database.AuditLog.findAll({
                where: { execution_id: previousExecutionId },
                raw: true
            });

            // Comparar
            const currentPassed = currentLogs.filter(l => l.status === 'passed' || l.status === 'pass').length;
            const previousPassed = previousLogs.filter(l => l.status === 'passed' || l.status === 'pass').length;

            const currentFailed = currentLogs.filter(l => l.status === 'failed' || l.status === 'fail').length;
            const previousFailed = previousLogs.filter(l => l.status === 'failed' || l.status === 'fail').length;

            return {
                previous_execution_id: previousExecutionId,
                previous_execution_date: previousExecution[0].started_at,
                comparison: {
                    tests_passed: {
                        current: currentPassed,
                        previous: previousPassed,
                        delta: currentPassed - previousPassed,
                        improvement: currentPassed > previousPassed ? 'YES' : 'NO'
                    },
                    tests_failed: {
                        current: currentFailed,
                        previous: previousFailed,
                        delta: currentFailed - previousFailed,
                        improvement: currentFailed < previousFailed ? 'YES' : 'NO'
                    },
                    success_rate: {
                        current: ((currentPassed / currentLogs.length) * 100).toFixed(2) + '%',
                        previous: ((previousPassed / previousLogs.length) * 100).toFixed(2) + '%',
                        delta: (((currentPassed / currentLogs.length) - (previousPassed / previousLogs.length)) * 100).toFixed(2) + '%'
                    }
                }
            };
        } catch (error) {
            return {
                error: 'Could not generate comparison',
                message: error.message
            };
        }
    }

    /**
     * ========================================================================
     * FORMATEAR COMO MARKDOWN
     * ========================================================================
     */
    formatAsMarkdown(data) {
        const lines = [];

        // Header
        lines.push('# 📊 REPORTE TÉCNICO DE AUDITORÍA');
        lines.push('');
        lines.push(`**Generado**: ${new Date(data.metadata.generated_at).toLocaleString('es-ES')}`);
        lines.push(`**Execution ID**: \`${data.metadata.execution_id}\``);
        lines.push(`**Versión del Reporte**: ${data.metadata.format_version}`);
        lines.push('');
        lines.push('---');
        lines.push('');

        // Execution Details
        lines.push('## 1. RESUMEN DE EJECUCIÓN');
        lines.push('');
        lines.push(`- **Inicio**: ${new Date(data.execution.started_at).toLocaleString('es-ES')}`);
        lines.push(`- **Fin**: ${new Date(data.execution.completed_at).toLocaleString('es-ES')}`);
        lines.push(`- **Duración**: ${data.execution.duration_human}`);
        lines.push(`- **Ambiente**: ${data.execution.environment}`);
        lines.push(`- **Total de Tests**: ${data.execution.total_tests}`);
        lines.push(`- **Success Rate**: ${data.execution.success_rate}`);
        lines.push('');
        lines.push('### Estados de Tests');
        lines.push('');
        lines.push(`| Estado | Cantidad |`);
        lines.push(`|--------|----------|`);
        lines.push(`| ✅ Pasados | ${data.execution.status_counts.passed} |`);
        lines.push(`| ❌ Fallidos | ${data.execution.status_counts.failed} |`);
        lines.push(`| ⚠️  Warnings | ${data.execution.status_counts.warning} |`);
        lines.push(`| 🔧 Reparados | ${data.execution.status_counts.fixed} |`);
        lines.push('');

        // Tests Details
        lines.push('## 2. DETALLE DE TESTS EJECUTADOS');
        lines.push('');
        data.tests.forEach(test => {
            const icon = test.status === 'passed' || test.status === 'pass' ? '✅' :
                        test.status === 'failed' || test.status === 'fail' ? '❌' : '⚠️';

            lines.push(`### ${icon} Test #${test.number}: ${test.test_name}`);
            lines.push('');
            lines.push(`- **Módulo**: ${test.module}`);
            lines.push(`- **Tipo**: ${test.test_type}`);
            lines.push(`- **Timestamp**: ${new Date(test.timestamp).toLocaleString('es-ES')}`);
            lines.push(`- **Duración**: ${test.duration_human}`);
            lines.push(`- **Estado**: ${test.status.toUpperCase()}`);

            if (test.error) {
                lines.push('');
                lines.push('**Error detectado**:');
                lines.push('```');
                lines.push(test.error.message);
                lines.push('```');
            }

            if (test.fix_attempted) {
                lines.push('');
                lines.push(`**Fix intentado**: ${test.fix_applied ? '✅ APLICADO' : '❌ FALLIDO'}`);
            }

            lines.push('');
        });

        // Error Analysis
        if (data.errors.total_errors > 0) {
            lines.push('## 3. ANÁLISIS DE ERRORES');
            lines.push('');
            lines.push(`**Total de errores detectados**: ${data.errors.total_errors}`);
            lines.push('');

            lines.push('### Patrones de Errores Más Comunes');
            lines.push('');
            data.errors.error_patterns.slice(0, 5).forEach((pattern, index) => {
                lines.push(`${index + 1}. **${pattern.pattern}** (${pattern.count} ocurrencias)`);
                pattern.examples.forEach(ex => {
                    lines.push(`   - Test #${ex.test_number} en módulo ${ex.module}`);
                });
                lines.push('');
            });

            lines.push('### Errores por Módulo');
            lines.push('');
            Object.entries(data.errors.errors_by_module).forEach(([module, count]) => {
                lines.push(`- **${module}**: ${count} errores`);
            });
            lines.push('');
        }

        // Repairs
        if (data.repairs.total_repairs_attempted > 0) {
            lines.push('## 4. REPARACIONES AUTOMÁTICAS');
            lines.push('');
            lines.push(`- **Total intentadas**: ${data.repairs.total_repairs_attempted}`);
            lines.push(`- **Exitosas**: ${data.repairs.repairs_successful}`);
            lines.push(`- **Fallidas**: ${data.repairs.repairs_failed}`);
            lines.push(`- **Success Rate**: ${data.repairs.success_rate}`);
            lines.push('');

            if (data.repairs.detailed_repairs.length > 0) {
                lines.push('### Detalle de Reparaciones');
                lines.push('');
                data.repairs.detailed_repairs.forEach(repair => {
                    const icon = repair.fix_applied ? '✅' : '❌';
                    lines.push(`${icon} **Reparación #${repair.number}**`);
                    lines.push(`- Módulo: ${repair.module}`);
                    lines.push(`- Test: ${repair.test_name}`);
                    lines.push(`- Estrategia: ${repair.fix_strategy || 'N/A'}`);
                    lines.push(`- Resultado: ${repair.fix_result || 'N/A'}`);
                    lines.push('');
                });
            }
        }

        // Learning
        if (data.learning && data.learning.total_patterns_learned > 0) {
            lines.push('## 5. APRENDIZAJE INCORPORADO');
            lines.push('');
            lines.push(`**Total de patrones aprendidos**: ${data.learning.total_patterns_learned}`);
            lines.push('');

            data.learning.patterns.forEach(pattern => {
                lines.push(`### Patrón #${pattern.number}`);
                lines.push('');
                lines.push(`- **Aprendido**: ${new Date(pattern.learned_at).toLocaleString('es-ES')}`);
                lines.push(`- **Error Pattern**: ${pattern.error_pattern}`);
                lines.push(`- **Solución**: ${pattern.solution_pattern}`);
                lines.push(`- **Éxitos**: ${pattern.success_count}`);
                lines.push(`- **Confianza**: ${(pattern.confidence_score * 100).toFixed(1)}%`);
                lines.push('');
            });
        }

        // Metrics
        if (data.metrics) {
            lines.push('## 6. MÉTRICAS DE PERFORMANCE');
            lines.push('');
            lines.push(`- **Tests ejecutados**: ${data.metrics.total_tests}`);
            lines.push(`- **Duración promedio**: ${data.metrics.avg_test_duration_human}`);
            lines.push(`- **Test más rápido**: ${data.metrics.min_test_duration_human}`);
            lines.push(`- **Test más lento**: ${data.metrics.max_test_duration_human}`);
            lines.push(`- **Tests por minuto**: ${data.metrics.tests_per_minute}`);
            lines.push('');
        }

        // Comparison
        if (data.comparison && !data.comparison.first_run && !data.comparison.error) {
            lines.push('## 7. COMPARACIÓN CON EJECUCIÓN ANTERIOR');
            lines.push('');
            lines.push(`**Ejecución anterior**: ${new Date(data.comparison.previous_execution_date).toLocaleString('es-ES')}`);
            lines.push('');

            const comp = data.comparison.comparison;
            lines.push('### Tests Pasados');
            lines.push(`- Anterior: ${comp.tests_passed.previous}`);
            lines.push(`- Actual: ${comp.tests_passed.current}`);
            lines.push(`- Delta: ${comp.tests_passed.delta > 0 ? '+' : ''}${comp.tests_passed.delta}`);
            lines.push(`- ¿Mejora?: ${comp.tests_passed.improvement}`);
            lines.push('');

            lines.push('### Tests Fallidos');
            lines.push(`- Anterior: ${comp.tests_failed.previous}`);
            lines.push(`- Actual: ${comp.tests_failed.current}`);
            lines.push(`- Delta: ${comp.tests_failed.delta > 0 ? '+' : ''}${comp.tests_failed.delta}`);
            lines.push(`- ¿Mejora?: ${comp.tests_failed.improvement}`);
            lines.push('');

            lines.push('### Success Rate');
            lines.push(`- Anterior: ${comp.success_rate.previous}`);
            lines.push(`- Actual: ${comp.success_rate.current}`);
            lines.push(`- Delta: ${comp.success_rate.delta}`);
            lines.push('');
        }

        // Footer
        lines.push('---');
        lines.push('');
        lines.push(`*Reporte generado automáticamente por TechnicalReportGenerator v1.0.0*`);
        lines.push(`*Fecha: ${new Date().toLocaleString('es-ES')}*`);

        return lines.join('\n');
    }

    /**
     * ========================================================================
     * FORMATEAR COMO HTML
     * ========================================================================
     */
    formatAsHTML(data) {
        // TODO: Implement HTML formatting
        return '<html><body><h1>Technical Report</h1><pre>' +
               JSON.stringify(data, null, 2) +
               '</pre></body></html>';
    }

    /**
     * ========================================================================
     * GUARDAR REPORTE
     * ========================================================================
     */
    async saveReport(execution_id, content, format) {
        // Crear directorio si no existe
        try {
            await fs.mkdir(this.reportsDir, { recursive: true });
        } catch (error) {
            // Directory already exists
        }

        // Generar filename con timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
        const time = new Date().toISOString().split('T')[1].substring(0, 8).replace(/:/g, '-');
        const extension = format === 'json' ? 'json' : format === 'html' ? 'html' : 'md';
        const filename = `AUDIT-REPORT-${timestamp}-${time}-${execution_id.substring(0, 8)}.${extension}`;

        const filepath = path.join(this.reportsDir, filename);
        await fs.writeFile(filepath, content, 'utf-8');

        return filename;
    }

    /**
     * ========================================================================
     * HELPERS
     * ========================================================================
     */

    formatDuration(ms) {
        if (ms < 1000) return `${ms}ms`;
        if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
        const minutes = Math.floor(ms / 60000);
        const seconds = ((ms % 60000) / 1000).toFixed(0);
        return `${minutes}m ${seconds}s`;
    }

    extractErrorPattern(errorMessage) {
        if (!errorMessage) return 'Unknown Error';

        // Common patterns
        if (errorMessage.includes('timeout')) return 'Timeout Error';
        if (errorMessage.includes('selector')) return 'Selector Not Found';
        if (errorMessage.includes('modal')) return 'Modal Issue';
        if (errorMessage.includes('click')) return 'Click Error';
        if (errorMessage.includes('navigation')) return 'Navigation Error';
        if (errorMessage.includes('database') || errorMessage.includes('columna')) return 'Database Error';

        // Extract first meaningful word
        const words = errorMessage.split(' ');
        return words.slice(0, 3).join(' ');
    }

    calculateErrorSeverity(log) {
        // Critical: database errors, authentication failures
        if (log.error_message && (
            log.error_message.includes('database') ||
            log.error_message.includes('auth') ||
            log.error_message.includes('security')
        )) {
            return 'CRITICAL';
        }

        // High: tests that completely failed
        if (log.status === 'failed') {
            return 'HIGH';
        }

        // Medium: warnings
        if (log.status === 'warning') {
            return 'MEDIUM';
        }

        return 'LOW';
    }
}

module.exports = TechnicalReportGenerator;
