/**
 * ============================================================================
 * STRESS TEST COLLECTOR
 * ============================================================================
 * Ejecuta el stress test de fichajes realistas y captura métricas
 * para integración con Phase4TestOrchestrator
 *
 * SCRIPT QUE EJECUTA:
 * - backend/scripts/test-realistic-attendance-stress.js
 *
 * MÉTRICAS QUE CAPTURA:
 * - Total de fichajes procesados
 * - Check-ins/check-outs exitosos
 * - Autorizaciones procesadas
 * - Intentos biométricos
 * - Tiempo de ejecución
 *
 * @version 1.0.0
 * @date 2025-12-14
 * ============================================================================
 */

const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

class StressTestCollector {
    constructor(options = {}) {
        this.name = 'StressTestCollector';
        this.backendPath = options.backendPath || path.join(__dirname, '../../../');
        this.scriptPath = path.join(this.backendPath, 'scripts', 'test-realistic-attendance-stress.js');
        this.timeout = options.timeout || 600000; // 10 minutos
        this.config = {
            totalUsers: options.totalUsers || 100,
            totalAttendances: options.totalAttendances || 200, // Default bajo para tests rápidos
            daysToSimulate: options.daysToSimulate || 7
        };
        this.results = {
            metrics: {},
            duration: 0,
            errors: []
        };
    }

    /**
     * Ejecutar stress test
     */
    async collect() {
        console.log('🧪 [STRESS-COLLECTOR] Iniciando stress test...');
        console.log(`   Config: ${this.config.totalAttendances} fichajes, ${this.config.totalUsers} usuarios`);
        const startTime = Date.now();

        try {
            // Verificar que existe el script
            if (!fs.existsSync(this.scriptPath)) {
                throw new Error(`Stress test script not found: ${this.scriptPath}`);
            }

            // Ejecutar stress test
            const testResults = await this.runStressTest();

            this.results.duration = Date.now() - startTime;
            this.results.metrics = testResults;

            console.log(`✅ [STRESS-COLLECTOR] Test completado en ${(this.results.duration / 1000).toFixed(2)}s`);

            return this.formatResults();

        } catch (error) {
            console.error(`❌ [STRESS-COLLECTOR] Error: ${error.message}`);
            this.results.errors.push(error.message);
            this.results.duration = Date.now() - startTime;
            return this.formatResults();
        }
    }

    /**
     * Ejecutar el script de stress test
     */
    async runStressTest() {
        return new Promise((resolve, reject) => {
            const command = `node "${this.scriptPath}"`;

            console.log(`   Ejecutando: ${command}`);

            exec(command, {
                cwd: this.backendPath,
                timeout: this.timeout,
                maxBuffer: 10 * 1024 * 1024, // 10MB buffer
                env: {
                    ...process.env,
                    STRESS_TEST_ATTENDANCES: this.config.totalAttendances.toString(),
                    STRESS_TEST_USERS: this.config.totalUsers.toString(),
                    STRESS_TEST_DAYS: this.config.daysToSimulate.toString()
                }
            }, (error, stdout, stderr) => {
                const metrics = this.parseStressTestOutput(stdout);

                if (error && !metrics.totalProcessed) {
                    metrics.errors = metrics.errors || [];
                    metrics.errors.push(error.message);
                }

                if (stderr && stderr.includes('Error')) {
                    metrics.warnings = stderr.split('\n').filter(l => l.includes('Error'));
                }

                resolve(metrics);
            });
        });
    }

    /**
     * Parsear output del stress test
     */
    parseStressTestOutput(stdout) {
        const metrics = {
            totalProcessed: 0,
            successfulCheckIns: 0,
            successfulCheckOuts: 0,
            rejectedCheckIns: 0,
            noShows: 0,
            errors: 0,
            lateArrivals: {
                total: 0,
                approved: 0,
                rejected: 0,
                noAuthorizer: 0,
                approvalRate: 0
            },
            biometric: {
                totalAttempts: 0,
                avgAttemptsPerCheckIn: 0
            },
            performance: {
                durationSeconds: 0,
                checkInsPerSecond: 0
            }
        };

        try {
            const lines = stdout.split('\n');

            for (const line of lines) {
                // Métricas generales
                if (line.includes('Total fichajes procesados:')) {
                    metrics.totalProcessed = this.extractNumber(line);
                }
                if (line.includes('Check-ins exitosos:')) {
                    metrics.successfulCheckIns = this.extractNumber(line);
                }
                if (line.includes('Check-outs exitosos:')) {
                    metrics.successfulCheckOuts = this.extractNumber(line);
                }
                if (line.includes('Check-ins rechazados:')) {
                    metrics.rejectedCheckIns = this.extractNumber(line);
                }
                if (line.includes('No-shows:')) {
                    metrics.noShows = this.extractNumber(line);
                }
                if (line.includes('Errores:')) {
                    metrics.errors = this.extractNumber(line);
                }
                if (line.includes('Duración total:')) {
                    const match = line.match(/([\d.]+)s/);
                    if (match) {
                        metrics.performance.durationSeconds = parseFloat(match[1]);
                    }
                }

                // Métricas de llegadas tardías
                if (line.includes('Llegadas tardías totales:')) {
                    metrics.lateArrivals.total = this.extractNumber(line);
                }
                if (line.includes('Autorizaciones aprobadas:')) {
                    metrics.lateArrivals.approved = this.extractNumber(line);
                }
                if (line.includes('Autorizaciones rechazadas:')) {
                    metrics.lateArrivals.rejected = this.extractNumber(line);
                }
                if (line.includes('Sin autorizador disponible:')) {
                    metrics.lateArrivals.noAuthorizer = this.extractNumber(line);
                }
                if (line.includes('Tasa de aprobación:')) {
                    const match = line.match(/([\d.]+)%/);
                    if (match) {
                        metrics.lateArrivals.approvalRate = parseFloat(match[1]);
                    }
                }

                // Métricas biométricas
                if (line.includes('Total intentos de captura:')) {
                    metrics.biometric.totalAttempts = this.extractNumber(line);
                }
                if (line.includes('Promedio intentos/fichaje:')) {
                    const match = line.match(/([\d.]+)/);
                    if (match) {
                        metrics.biometric.avgAttemptsPerCheckIn = parseFloat(match[1]);
                    }
                }
            }

            // Calcular check-ins por segundo
            if (metrics.performance.durationSeconds > 0 && metrics.successfulCheckIns > 0) {
                metrics.performance.checkInsPerSecond =
                    (metrics.successfulCheckIns / metrics.performance.durationSeconds).toFixed(2);
            }

        } catch (error) {
            metrics.parseError = error.message;
        }

        return metrics;
    }

    /**
     * Extraer número de una línea
     */
    extractNumber(line) {
        const match = line.match(/:\s*(\d+)/);
        return match ? parseInt(match[1]) : 0;
    }

    /**
     * Formatear resultados para Phase4
     */
    formatResults() {
        const metrics = this.results.metrics;
        const hasErrors = metrics.errors > 0 || this.results.errors.length > 0;

        // Calcular score de salud (0-100)
        let healthScore = 100;
        if (metrics.totalProcessed > 0) {
            const successRate = metrics.successfulCheckIns / metrics.totalProcessed * 100;
            healthScore = Math.min(100, Math.max(0, successRate));
        }

        return {
            collector: this.name,
            timestamp: new Date().toISOString(),
            config: this.config,
            summary: {
                totalProcessed: metrics.totalProcessed || 0,
                successfulCheckIns: metrics.successfulCheckIns || 0,
                successfulCheckOuts: metrics.successfulCheckOuts || 0,
                errorCount: metrics.errors || 0,
                healthScore: healthScore.toFixed(1),
                duration: this.results.duration
            },
            lateArrivals: metrics.lateArrivals || {},
            biometric: metrics.biometric || {},
            performance: metrics.performance || {},
            errors: this.results.errors,
            status: hasErrors ? 'warning' : 'passed'
        };
    }

    /**
     * Ejecutar test rápido (menos fichajes)
     */
    async collectQuick() {
        this.config.totalAttendances = 50;
        this.config.daysToSimulate = 3;
        return this.collect();
    }

    /**
     * Ejecutar test completo (más fichajes)
     */
    async collectFull() {
        this.config.totalAttendances = 1000;
        this.config.daysToSimulate = 30;
        return this.collect();
    }

    /**
     * Obtener información del collector
     */
    getInfo() {
        return {
            name: this.name,
            description: 'Ejecuta stress test de fichajes realistas con autorizaciones',
            scriptPath: this.scriptPath,
            timeout: this.timeout,
            defaultConfig: this.config,
            metricsCollected: [
                'Check-ins/outs exitosos',
                'Autorizaciones de llegada tardía',
                'Intentos biométricos',
                'Performance (fichajes/segundo)'
            ]
        };
    }
}

module.exports = StressTestCollector;
