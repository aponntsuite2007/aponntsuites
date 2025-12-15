/**
 * ============================================================================
 * FLUTTER INTEGRATION COLLECTOR
 * ============================================================================
 * Ejecuta los integration tests de Flutter y parsea los resultados
 * para integración con Phase4TestOrchestrator
 *
 * TESTS QUE EJECUTA:
 * - frontend_flutter/test/integration/backend_api_test.dart
 * - frontend_flutter/test/integration/attendance_workflow_test.dart
 *
 * @version 1.0.0
 * @date 2025-12-14
 * ============================================================================
 */

const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

class FlutterIntegrationCollector {
    constructor(options = {}) {
        this.name = 'FlutterIntegrationCollector';
        this.flutterPath = options.flutterPath || path.join(__dirname, '../../../../frontend_flutter');
        this.timeout = options.timeout || 120000; // 2 minutos
        this.results = {
            passed: 0,
            failed: 0,
            skipped: 0,
            tests: [],
            duration: 0,
            errors: []
        };
    }

    /**
     * Ejecutar todos los integration tests de Flutter
     */
    async collect() {
        console.log('🧪 [FLUTTER-COLLECTOR] Iniciando integration tests...');
        const startTime = Date.now();

        try {
            // Verificar que existe el directorio de Flutter
            if (!fs.existsSync(this.flutterPath)) {
                throw new Error(`Flutter path not found: ${this.flutterPath}`);
            }

            const testPath = path.join(this.flutterPath, 'test', 'integration');
            if (!fs.existsSync(testPath)) {
                throw new Error(`Integration test path not found: ${testPath}`);
            }

            // Ejecutar tests
            const testResults = await this.runFlutterTests();

            this.results.duration = Date.now() - startTime;
            this.results = { ...this.results, ...testResults };

            console.log(`✅ [FLUTTER-COLLECTOR] Tests completados en ${this.results.duration}ms`);
            console.log(`   Passed: ${this.results.passed}, Failed: ${this.results.failed}`);

            return this.formatResults();

        } catch (error) {
            console.error(`❌ [FLUTTER-COLLECTOR] Error: ${error.message}`);
            this.results.errors.push(error.message);
            this.results.duration = Date.now() - startTime;
            return this.formatResults();
        }
    }

    /**
     * Ejecutar flutter test
     */
    async runFlutterTests() {
        return new Promise((resolve, reject) => {
            const testDir = path.join(this.flutterPath, 'test', 'integration');
            const command = `flutter test "${testDir}" --reporter json`;

            console.log(`   Ejecutando: ${command}`);

            exec(command, {
                cwd: this.flutterPath,
                timeout: this.timeout,
                maxBuffer: 10 * 1024 * 1024 // 10MB buffer
            }, (error, stdout, stderr) => {
                const results = this.parseFlutterOutput(stdout, stderr);

                if (error && results.failed === 0) {
                    // Error de ejecución, no de tests
                    results.errors.push(error.message);
                }

                resolve(results);
            });
        });
    }

    /**
     * Parsear output de flutter test
     */
    parseFlutterOutput(stdout, stderr) {
        const results = {
            passed: 0,
            failed: 0,
            skipped: 0,
            tests: [],
            errors: []
        };

        try {
            // Flutter con --reporter json emite múltiples JSON por línea
            const lines = stdout.split('\n').filter(line => line.trim());

            for (const line of lines) {
                try {
                    const event = JSON.parse(line);

                    if (event.type === 'testDone') {
                        const test = {
                            name: event.name || `Test ${event.testID}`,
                            passed: event.result === 'success',
                            duration: event.time || 0,
                            error: event.error || null
                        };

                        results.tests.push(test);

                        if (event.result === 'success') {
                            results.passed++;
                        } else if (event.result === 'failure' || event.result === 'error') {
                            results.failed++;
                        } else if (event.skipped) {
                            results.skipped++;
                        }
                    }
                } catch (parseError) {
                    // No es JSON válido, puede ser output normal
                    // Intentar parsear formato tradicional
                    if (line.includes('+') && line.includes(':')) {
                        const match = line.match(/(\d+:\d+)\s+\+(\d+)(?:\s+-(\d+))?/);
                        if (match) {
                            results.passed = parseInt(match[2]) || 0;
                            results.failed = parseInt(match[3]) || 0;
                        }
                    }
                }
            }

            // Si no se parseó nada, intentar formato simple
            if (results.tests.length === 0) {
                const passMatch = stdout.match(/\+(\d+)/);
                const failMatch = stdout.match(/-(\d+)/);

                if (passMatch) results.passed = parseInt(passMatch[1]);
                if (failMatch) results.failed = parseInt(failMatch[1]);

                // Agregar test genérico
                if (results.passed > 0 || results.failed > 0) {
                    results.tests.push({
                        name: 'Flutter Integration Tests',
                        passed: results.failed === 0,
                        duration: 0,
                        error: results.failed > 0 ? 'Some tests failed' : null
                    });
                }
            }

            // Capturar errores de stderr
            if (stderr && stderr.trim()) {
                const errorLines = stderr.split('\n').filter(l =>
                    l.includes('Error') || l.includes('Exception') || l.includes('Failed')
                );
                results.errors.push(...errorLines);
            }

        } catch (error) {
            results.errors.push(`Parse error: ${error.message}`);
        }

        return results;
    }

    /**
     * Formatear resultados para Phase4
     */
    formatResults() {
        const passRate = this.results.passed + this.results.failed > 0
            ? (this.results.passed / (this.results.passed + this.results.failed) * 100).toFixed(1)
            : 0;

        return {
            collector: this.name,
            timestamp: new Date().toISOString(),
            summary: {
                total: this.results.passed + this.results.failed + this.results.skipped,
                passed: this.results.passed,
                failed: this.results.failed,
                skipped: this.results.skipped,
                passRate: parseFloat(passRate),
                duration: this.results.duration
            },
            tests: this.results.tests,
            errors: this.results.errors,
            status: this.results.failed === 0 && this.results.errors.length === 0 ? 'passed' : 'failed'
        };
    }

    /**
     * Verificar si Flutter está disponible
     */
    async checkFlutterAvailable() {
        return new Promise((resolve) => {
            exec('flutter --version', { timeout: 10000 }, (error) => {
                resolve(!error);
            });
        });
    }

    /**
     * Obtener información del collector
     */
    getInfo() {
        return {
            name: this.name,
            description: 'Ejecuta integration tests de Flutter para validar la APK',
            testPath: path.join(this.flutterPath, 'test', 'integration'),
            timeout: this.timeout,
            testsIncluded: [
                'backend_api_test.dart - Conectividad con backend',
                'attendance_workflow_test.dart - Flujo de fichaje'
            ]
        };
    }
}

module.exports = FlutterIntegrationCollector;
