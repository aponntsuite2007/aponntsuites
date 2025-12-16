/**
 * ============================================================================
 * BIOMETRIC STRESS TEST ORCHESTRATOR
 * ============================================================================
 *
 * Sistema completo de testing masivo para fichajes biométricos.
 * Simula miles de escenarios sin necesidad de cámara real.
 *
 * ESCENARIOS SOPORTADOS:
 * 1. HAPPY_PATH - Fichaje exitoso normal
 * 2. USER_NOT_FOUND - Rostro no reconocido
 * 3. LATE_ARRIVAL - Llegada después de tolerancia
 * 4. EARLY_ARRIVAL - Llegada antes del turno
 * 5. OUTSIDE_SHIFT - Fichaje fuera de turno asignado
 * 6. DUPLICATE_SHORT - Doble fichaje en <5 min
 * 7. DUPLICATE_MEDIUM - Múltiples fichajes en <30 min
 * 8. LOW_QUALITY - Imagen baja calidad
 * 9. SUSPENDED_USER - Usuario con suspensión activa
 * 10. RAPID_FIRE - Ráfaga de fichajes (stress test)
 *
 * FLUJO:
 * Setup → Execute → Validate → Report
 *
 * @version 1.0.0
 * @date 2024-12-14
 * ============================================================================
 */

const { EventEmitter } = require('events');
const crypto = require('crypto');
const BiometricScenarioEngine = require('./BiometricScenarioEngine');
const BiometricMockFactory = require('./BiometricMockFactory');
const BiometricConsistencyValidator = require('./BiometricConsistencyValidator');

class BiometricStressTestOrchestrator extends EventEmitter {
    constructor(config = {}) {
        super();

        this.config = {
            // Cantidad de escenarios a ejecutar
            scenarioCount: config.scenarioCount || 1000,

            // Workers paralelos
            parallelWorkers: config.parallelWorkers || 10,

            // Delay entre requests (ms)
            requestDelay: config.requestDelay || 50,

            // Timeout por request
            requestTimeout: config.requestTimeout || 5000,

            // Base URL del backend
            baseUrl: config.baseUrl || process.env.BASE_URL || 'http://localhost:9998',

            // Company ID para testing
            companyId: config.companyId || 1,

            // Distribución de escenarios (debe sumar 1.0)
            scenarioDistribution: config.scenarioDistribution || {
                HAPPY_PATH: 0.40,       // 40% fichajes exitosos
                USER_NOT_FOUND: 0.10,   // 10% usuario no encontrado
                LATE_ARRIVAL: 0.15,     // 15% llegadas tarde
                EARLY_ARRIVAL: 0.05,    // 5% llegadas temprano
                OUTSIDE_SHIFT: 0.05,    // 5% fuera de turno
                DUPLICATE_SHORT: 0.10,  // 10% duplicados cortos (<5 min)
                DUPLICATE_MEDIUM: 0.05, // 5% duplicados medios (<30 min)
                LOW_QUALITY: 0.05,      // 5% baja calidad
                SUSPENDED_USER: 0.03,   // 3% usuarios suspendidos
                RAPID_FIRE: 0.02        // 2% stress test
            },

            // Configuración de turnos
            shiftConfig: config.shiftConfig || {
                toleranceMinutes: 15,      // Tolerancia de llegada
                earlyEntryMinutes: 30,     // Entrada anticipada permitida
                minDuplicateGapMinutes: 5, // Gap mínimo entre fichajes
            },

            // Logging
            verbose: config.verbose !== false,

            ...config
        };

        // Execution ID único
        this.executionId = `biometric-stress-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

        // Componentes
        this.scenarioEngine = new BiometricScenarioEngine(this.config);
        this.mockFactory = new BiometricMockFactory(this.config);
        this.consistencyValidator = new BiometricConsistencyValidator(this.config);

        // Estado de ejecución
        this.state = {
            status: 'idle',
            startTime: null,
            endTime: null,
            currentScenario: 0,
            completedScenarios: 0,
            errors: [],
            results: []
        };

        // Estadísticas
        this.stats = {
            total: 0,
            passed: 0,
            failed: 0,
            byScenario: {},
            byError: {},
            performance: {
                minTime: Infinity,
                maxTime: 0,
                avgTime: 0,
                totalTime: 0
            },
            consistency: {
                duplicatesFound: 0,
                fkViolations: 0,
                dataIntegrityErrors: 0
            }
        };

        // Usuarios de prueba generados
        this.testUsers = [];

        // Fichajes realizados (para detectar duplicados)
        this.recentClockIns = new Map();

        this.log('🎯 BiometricStressTestOrchestrator inicializado');
        this.log(`📊 Ejecutará ${this.config.scenarioCount} escenarios`);
    }

    /**
     * Log helper
     */
    log(message, level = 'info') {
        if (this.config.verbose) {
            const timestamp = new Date().toISOString();
            const prefix = {
                'info': '📝',
                'success': '✅',
                'error': '❌',
                'warning': '⚠️',
                'debug': '🔍'
            }[level] || '📝';

            console.log(`[${timestamp}] ${prefix} [BIOMETRIC-STRESS] ${message}`);
        }

        this.emit('log', { message, level, timestamp: Date.now() });
    }

    /**
     * ============================================================================
     * FASE 1: SETUP - Preparar datos de prueba
     * ============================================================================
     */
    async setup() {
        this.log('🔧 FASE 1: SETUP - Preparando datos de prueba...');
        this.state.status = 'setup';

        try {
            // 1. Generar usuarios de prueba con embeddings mock
            this.log('👥 Generando usuarios de prueba...');
            this.testUsers = await this.mockFactory.generateTestUsers(100);
            this.log(`✅ ${this.testUsers.length} usuarios de prueba generados`);

            // 2. Crear turnos de prueba
            this.log('⏰ Configurando turnos de prueba...');
            await this.mockFactory.setupTestShifts(this.testUsers);
            this.log('✅ Turnos configurados');

            // 3. Crear algunos usuarios suspendidos
            this.log('🚫 Configurando usuarios suspendidos...');
            await this.mockFactory.setupSuspendedUsers(this.testUsers.slice(0, 5));
            this.log('✅ 5 usuarios marcados como suspendidos');

            // 4. Inicializar estadísticas por escenario
            Object.keys(this.config.scenarioDistribution).forEach(scenario => {
                this.stats.byScenario[scenario] = {
                    total: 0,
                    passed: 0,
                    failed: 0,
                    avgTime: 0
                };
            });

            this.log('✅ SETUP completado', 'success');
            return { success: true, usersCreated: this.testUsers.length };

        } catch (error) {
            this.log(`Error en setup: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * ============================================================================
     * FASE 2: EXECUTE - Ejecutar escenarios de prueba
     * ============================================================================
     */
    async execute() {
        this.log('🚀 FASE 2: EXECUTE - Ejecutando escenarios...');
        this.state.status = 'executing';
        this.state.startTime = Date.now();

        // Generar todos los escenarios
        const scenarios = this.scenarioEngine.generateScenarios(
            this.config.scenarioCount,
            this.config.scenarioDistribution,
            this.testUsers
        );

        this.log(`📋 ${scenarios.length} escenarios generados`);

        // Ejecutar en batches paralelos
        const batchSize = this.config.parallelWorkers;
        const results = [];

        for (let i = 0; i < scenarios.length; i += batchSize) {
            const batch = scenarios.slice(i, i + batchSize);
            const batchNum = Math.floor(i / batchSize) + 1;
            const totalBatches = Math.ceil(scenarios.length / batchSize);

            if (batchNum % 10 === 0 || batchNum === totalBatches) {
                this.log(`📦 Procesando batch ${batchNum}/${totalBatches} (${((i/scenarios.length)*100).toFixed(1)}%)`);
            }

            // Ejecutar batch en paralelo
            const batchResults = await Promise.all(
                batch.map(scenario => this.executeScenario(scenario))
            );

            results.push(...batchResults);
            this.state.completedScenarios = results.length;

            // Emitir progreso
            this.emit('progress', {
                completed: results.length,
                total: scenarios.length,
                percent: ((results.length / scenarios.length) * 100).toFixed(1)
            });

            // Delay entre batches
            if (this.config.requestDelay > 0) {
                await this.wait(this.config.requestDelay);
            }
        }

        this.state.results = results;
        this.state.endTime = Date.now();

        this.log(`✅ ${results.length} escenarios ejecutados`, 'success');
        return results;
    }

    /**
     * Ejecutar un escenario individual
     */
    async executeScenario(scenario) {
        const startTime = Date.now();

        try {
            // Preparar request según el tipo de escenario
            const request = this.scenarioEngine.prepareRequest(scenario);

            // Verificar si es duplicado (para escenarios DUPLICATE_*)
            if (scenario.type.startsWith('DUPLICATE')) {
                const isDuplicate = this.checkDuplicateScenario(scenario);
                if (!isDuplicate.shouldProceed) {
                    // Simular el comportamiento esperado de duplicado
                    return this.createScenarioResult(scenario, {
                        success: false,
                        reason: 'DUPLICATE_DETECTED',
                        expected: true
                    }, startTime);
                }
            }

            // Ejecutar request contra el API
            const response = await this.executeRequest(request);

            // Validar resultado según escenario
            const validation = this.validateScenarioResult(scenario, response);

            // Actualizar estadísticas
            this.updateStats(scenario, validation, Date.now() - startTime);

            // Registrar fichaje para detección de duplicados
            if (response.success && scenario.user) {
                this.recentClockIns.set(scenario.user.id, {
                    timestamp: Date.now(),
                    scenarioId: scenario.id
                });
            }

            return this.createScenarioResult(scenario, validation, startTime);

        } catch (error) {
            this.stats.failed++;
            this.stats.byScenario[scenario.type].failed++;

            this.state.errors.push({
                scenarioId: scenario.id,
                scenarioType: scenario.type,
                error: error.message,
                stack: error.stack
            });

            return this.createScenarioResult(scenario, {
                success: false,
                reason: 'EXECUTION_ERROR',
                error: error.message
            }, startTime);
        }
    }

    /**
     * Ejecutar request HTTP contra el API
     */
    async executeRequest(request) {
        const axios = require('axios');

        try {
            const response = await axios({
                method: request.method || 'POST',
                url: `${this.config.baseUrl}${request.endpoint}`,
                data: request.body,
                headers: {
                    'Content-Type': 'application/json',
                    'X-Company-Id': this.config.companyId.toString(),
                    'X-Test-Mode': 'true',
                    'X-Execution-Id': this.executionId,
                    ...request.headers
                },
                timeout: this.config.requestTimeout,
                validateStatus: () => true // No lanzar error por status codes
            });

            return {
                status: response.status,
                success: response.data?.success || false,
                reason: response.data?.reason,
                message: response.data?.message,
                data: response.data
            };

        } catch (error) {
            if (error.code === 'ECONNREFUSED') {
                return {
                    status: 0,
                    success: false,
                    reason: 'CONNECTION_REFUSED',
                    error: 'No se pudo conectar al servidor'
                };
            }

            return {
                status: error.response?.status || 0,
                success: false,
                reason: 'REQUEST_ERROR',
                error: error.message
            };
        }
    }

    /**
     * Validar resultado según el escenario esperado
     */
    validateScenarioResult(scenario, response) {
        const expectedBehavior = this.scenarioEngine.getExpectedBehavior(scenario.type);

        // Verificar si el resultado coincide con lo esperado
        let passed = false;
        let reason = '';

        switch (scenario.type) {
            case 'HAPPY_PATH':
                passed = response.success === true;
                reason = passed ? 'Fichaje exitoso como esperado' : 'Fichaje debería haber sido exitoso';
                break;

            case 'USER_NOT_FOUND':
                passed = response.success === false &&
                         (response.reason === 'NO_MATCH' || response.reason === 'NO_TEMPLATES');
                reason = passed ? 'Usuario no encontrado como esperado' : 'Debería rechazar usuario desconocido';
                break;

            case 'LATE_ARRIVAL':
                // Puede ser exitoso pero con flag de tardanza
                passed = response.success === true ||
                         (response.success === false && response.reason === 'LATE_BLOCKED');
                reason = passed ? 'Llegada tarde manejada correctamente' : 'Error en manejo de llegada tarde';
                break;

            case 'EARLY_ARRIVAL':
                passed = response.success === true ||
                         (response.success === false && response.reason === 'TOO_EARLY');
                reason = passed ? 'Llegada temprana manejada correctamente' : 'Error en manejo de llegada temprana';
                break;

            case 'OUTSIDE_SHIFT':
                passed = response.success === false &&
                         (response.reason === 'OUTSIDE_SHIFT' || response.reason === 'NO_ACTIVE_SHIFT');
                reason = passed ? 'Fichaje fuera de turno rechazado' : 'Debería rechazar fichaje fuera de turno';
                break;

            case 'DUPLICATE_SHORT':
            case 'DUPLICATE_MEDIUM':
                passed = response.success === false &&
                         (response.reason === 'DUPLICATE_DETECTED' || response.reason === 'ALREADY_CLOCKED_IN');
                reason = passed ? 'Duplicado detectado correctamente' : 'Debería detectar fichaje duplicado';
                break;

            case 'LOW_QUALITY':
                passed = response.success === false &&
                         (response.reason === 'LOW_QUALITY' || response.reason === 'QUALITY_TOO_LOW');
                reason = passed ? 'Imagen de baja calidad rechazada' : 'Debería rechazar imagen de baja calidad';
                break;

            case 'SUSPENDED_USER':
                passed = response.success === false &&
                         (response.reason === 'employee_suspended' || response.blocked === true);
                reason = passed ? 'Usuario suspendido bloqueado' : 'Debería bloquear usuario suspendido';
                break;

            case 'RAPID_FIRE':
                // En stress test, validamos que no haya crash
                passed = response.status !== 0 && response.status !== 500;
                reason = passed ? 'Sistema respondió bajo carga' : 'Sistema falló bajo carga';
                break;

            default:
                passed = false;
                reason = `Tipo de escenario desconocido: ${scenario.type}`;
        }

        return {
            passed,
            reason,
            expected: expectedBehavior,
            actual: response,
            scenarioType: scenario.type
        };
    }

    /**
     * Verificar si el escenario es un duplicado esperado
     */
    checkDuplicateScenario(scenario) {
        if (!scenario.user) {
            return { shouldProceed: true };
        }

        const recentClockIn = this.recentClockIns.get(scenario.user.id);

        if (!recentClockIn) {
            return { shouldProceed: true };
        }

        const timeSinceLastClockIn = Date.now() - recentClockIn.timestamp;
        const gapMinutes = timeSinceLastClockIn / 60000;

        if (scenario.type === 'DUPLICATE_SHORT' && gapMinutes < 5) {
            return { shouldProceed: true, isDuplicate: true };
        }

        if (scenario.type === 'DUPLICATE_MEDIUM' && gapMinutes < 30) {
            return { shouldProceed: true, isDuplicate: true };
        }

        return { shouldProceed: true };
    }

    /**
     * Crear resultado de escenario
     */
    createScenarioResult(scenario, validation, startTime) {
        return {
            scenarioId: scenario.id,
            scenarioType: scenario.type,
            userId: scenario.user?.id,
            passed: validation.passed || validation.success === true,
            reason: validation.reason,
            expected: validation.expected,
            actual: validation.actual,
            executionTime: Date.now() - startTime,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Actualizar estadísticas
     */
    updateStats(scenario, validation, executionTime) {
        this.stats.total++;

        if (validation.passed) {
            this.stats.passed++;
            this.stats.byScenario[scenario.type].passed++;
        } else {
            this.stats.failed++;
            this.stats.byScenario[scenario.type].failed++;

            // Registrar tipo de error
            const errorType = validation.actual?.reason || 'UNKNOWN';
            this.stats.byError[errorType] = (this.stats.byError[errorType] || 0) + 1;
        }

        this.stats.byScenario[scenario.type].total++;

        // Performance
        this.stats.performance.totalTime += executionTime;
        this.stats.performance.minTime = Math.min(this.stats.performance.minTime, executionTime);
        this.stats.performance.maxTime = Math.max(this.stats.performance.maxTime, executionTime);
        this.stats.performance.avgTime = this.stats.performance.totalTime / this.stats.total;
    }

    /**
     * ============================================================================
     * FASE 3: VALIDATE - Validar consistencia de datos
     * ============================================================================
     */
    async validate() {
        this.log('🔍 FASE 3: VALIDATE - Verificando consistencia...');
        this.state.status = 'validating';

        try {
            const validationResults = await this.consistencyValidator.validate({
                executionId: this.executionId,
                companyId: this.config.companyId,
                testUsers: this.testUsers,
                results: this.state.results
            });

            // Actualizar estadísticas de consistencia
            this.stats.consistency = {
                duplicatesFound: validationResults.duplicates?.length || 0,
                fkViolations: validationResults.fkViolations?.length || 0,
                dataIntegrityErrors: validationResults.integrityErrors?.length || 0,
                orphanRecords: validationResults.orphanRecords?.length || 0
            };

            this.log(`✅ Validación completada:`, 'success');
            this.log(`   - Duplicados encontrados: ${this.stats.consistency.duplicatesFound}`);
            this.log(`   - Violaciones FK: ${this.stats.consistency.fkViolations}`);
            this.log(`   - Errores de integridad: ${this.stats.consistency.dataIntegrityErrors}`);

            return validationResults;

        } catch (error) {
            this.log(`Error en validación: ${error.message}`, 'error');
            return { error: error.message };
        }
    }

    /**
     * ============================================================================
     * FASE 4: REPORT - Generar reporte final
     * ============================================================================
     */
    async generateReport() {
        this.log('📊 FASE 4: REPORT - Generando reporte...');
        this.state.status = 'reporting';

        const totalTime = this.state.endTime - this.state.startTime;

        const report = {
            metadata: {
                executionId: this.executionId,
                timestamp: new Date().toISOString(),
                duration: totalTime,
                durationFormatted: this.formatDuration(totalTime),
                config: {
                    scenarioCount: this.config.scenarioCount,
                    parallelWorkers: this.config.parallelWorkers,
                    companyId: this.config.companyId
                }
            },

            summary: {
                total: this.stats.total,
                passed: this.stats.passed,
                failed: this.stats.failed,
                passRate: ((this.stats.passed / this.stats.total) * 100).toFixed(2) + '%',
                avgResponseTime: this.stats.performance.avgTime.toFixed(2) + 'ms',
                minResponseTime: this.stats.performance.minTime + 'ms',
                maxResponseTime: this.stats.performance.maxTime + 'ms'
            },

            byScenario: Object.entries(this.stats.byScenario).map(([type, stats]) => ({
                type,
                total: stats.total,
                passed: stats.passed,
                failed: stats.failed,
                passRate: stats.total > 0 ? ((stats.passed / stats.total) * 100).toFixed(2) + '%' : 'N/A'
            })),

            errorBreakdown: Object.entries(this.stats.byError).map(([error, count]) => ({
                error,
                count,
                percentage: ((count / this.stats.failed) * 100).toFixed(2) + '%'
            })),

            consistency: this.stats.consistency,

            errors: this.state.errors.slice(0, 100), // Primeros 100 errores

            recommendations: this.generateRecommendations()
        };

        // Guardar reporte
        const fs = require('fs');
        const path = require('path');
        const reportPath = path.join(__dirname, '../../../logs', `biometric-stress-${this.executionId}.json`);

        try {
            fs.mkdirSync(path.dirname(reportPath), { recursive: true });
            fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
            this.log(`📄 Reporte guardado en: ${reportPath}`, 'success');
        } catch (error) {
            this.log(`Error guardando reporte: ${error.message}`, 'warning');
        }

        return report;
    }

    /**
     * Generar recomendaciones basadas en resultados
     */
    generateRecommendations() {
        const recommendations = [];

        // Verificar tasa de éxito general
        const passRate = (this.stats.passed / this.stats.total) * 100;
        if (passRate < 80) {
            recommendations.push({
                severity: 'HIGH',
                issue: 'Tasa de éxito baja',
                detail: `Solo ${passRate.toFixed(1)}% de los tests pasaron`,
                suggestion: 'Revisar configuración de matching threshold y validaciones'
            });
        }

        // Verificar duplicados
        if (this.stats.consistency.duplicatesFound > 0) {
            recommendations.push({
                severity: 'HIGH',
                issue: 'Duplicados detectados en BD',
                detail: `${this.stats.consistency.duplicatesFound} fichajes duplicados`,
                suggestion: 'Implementar validación de gap mínimo entre fichajes'
            });
        }

        // Verificar performance
        if (this.stats.performance.avgTime > 1000) {
            recommendations.push({
                severity: 'MEDIUM',
                issue: 'Tiempo de respuesta alto',
                detail: `Promedio: ${this.stats.performance.avgTime.toFixed(0)}ms (objetivo <500ms)`,
                suggestion: 'Optimizar consultas de matching y cachear templates'
            });
        }

        // Verificar escenarios específicos
        Object.entries(this.stats.byScenario).forEach(([type, stats]) => {
            if (stats.total > 0 && stats.failed > stats.passed) {
                recommendations.push({
                    severity: 'MEDIUM',
                    issue: `Fallos en escenario ${type}`,
                    detail: `${stats.failed}/${stats.total} fallaron`,
                    suggestion: `Revisar lógica de manejo para ${type}`
                });
            }
        });

        return recommendations;
    }

    /**
     * ============================================================================
     * MÉTODO PRINCIPAL: RUN - Ejecutar todas las fases
     * ============================================================================
     */
    async run() {
        this.log('═══════════════════════════════════════════════════════════════');
        this.log('🎯 BIOMETRIC STRESS TEST - INICIANDO');
        this.log('═══════════════════════════════════════════════════════════════');

        try {
            // FASE 1: Setup
            await this.setup();

            // FASE 2: Execute
            await this.execute();

            // FASE 3: Validate
            await this.validate();

            // FASE 4: Report
            const report = await this.generateReport();

            this.state.status = 'completed';

            this.log('═══════════════════════════════════════════════════════════════');
            this.log('✅ BIOMETRIC STRESS TEST - COMPLETADO', 'success');
            this.log(`📊 Total: ${this.stats.total} | Passed: ${this.stats.passed} | Failed: ${this.stats.failed}`);
            this.log(`⏱️ Tiempo total: ${this.formatDuration(this.state.endTime - this.state.startTime)}`);
            this.log('═══════════════════════════════════════════════════════════════');

            this.emit('complete', report);
            return report;

        } catch (error) {
            this.state.status = 'error';
            this.log(`❌ Error fatal: ${error.message}`, 'error');
            this.emit('error', error);
            throw error;
        }
    }

    /**
     * Helpers
     */
    wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    formatDuration(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}m ${remainingSeconds}s`;
    }

    /**
     * Cleanup
     */
    async cleanup() {
        this.log('🧹 Limpiando datos de prueba...');

        try {
            await this.mockFactory.cleanup();
            this.testUsers = [];
            this.recentClockIns.clear();
            this.log('✅ Limpieza completada', 'success');
        } catch (error) {
            this.log(`Error en limpieza: ${error.message}`, 'warning');
        }
    }
}

module.exports = BiometricStressTestOrchestrator;
