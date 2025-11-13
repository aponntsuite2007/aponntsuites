/**
 * ============================================================================
 * INTELLIGENT TESTING ORCHESTRATOR
 * ============================================================================
 *
 * Coordina la ejecución de tests masivos para los 35+ módulos del sistema.
 *
 * CARACTERÍSTICAS:
 * - Ejecución paralela o secuencial de collectors
 * - Priorización inteligente (módulos críticos primero)
 * - Detección de dependencias entre módulos
 * - Integración con SystemRegistry
 * - Reportes unificados
 * - Auto-retry en caso de fallos temporales
 *
 * MODOS DE EJECUCIÓN:
 * 1. Full: Todos los módulos
 * 2. Critical: Solo módulos core/críticos
 * 3. Selective: Módulos específicos seleccionados
 * 4. Smart: Basado en cambios recientes (git diff)
 *
 * USO:
 * ```javascript
 * const orchestrator = new IntelligentTestingOrchestrator(database, systemRegistry);
 *
 * // Ejecutar todos los módulos
 * await orchestrator.runFullTest(companyId);
 *
 * // Ejecutar solo módulos críticos
 * await orchestrator.runCriticalTest(companyId);
 *
 * // Ejecutar módulos específicos
 * await orchestrator.runSelectiveTest(companyId, ['attendance', 'users', 'reports']);
 * ```
 *
 * @version 1.0.0
 * @date 2025-10-29
 * ============================================================================
 */

const { v4: uuidv4 } = require('uuid');

class IntelligentTestingOrchestrator {
    constructor(database, systemRegistry) {
        this.database = database;
        this.systemRegistry = systemRegistry;

        // Registry de collectors disponibles
        this.collectors = new Map();

        console.log('🎯 [ORCHESTRATOR] Intelligent Testing Orchestrator inicializado');
    }

    /**
     * ========================================================================
     * REGISTRO DE COLLECTORS
     * ========================================================================
     */

    /**
     * Registrar un collector para un módulo específico
     */
    registerCollector(moduleName, CollectorClass) {
        console.log(`📝 [ORCHESTRATOR] Registrando collector: ${moduleName}`);
        this.collectors.set(moduleName, CollectorClass);
    }

    /**
     * Auto-registrar todos los collectors disponibles
     */
    autoRegisterCollectors() {
        console.log('\n🔄 [ORCHESTRATOR] Auto-registrando collectors...\n');

        // Collectors existentes
        const EmployeeProfileCollector = require('../collectors/EmployeeProfileCollector');
        const AttendanceModuleCollector = require('../collectors/AttendanceModuleCollector');

        // Nuevos collectors (2025-10-29)
        const UsersModuleCollector = require('../collectors/UsersModuleCollector');
        const ReportsModuleCollector = require('../collectors/ReportsModuleCollector');
        const DepartmentsModuleCollector = require('../collectors/DepartmentsModuleCollector');
        const ShiftsModuleCollector = require('../collectors/ShiftsModuleCollector');
        const BiometricDevicesCollector = require('../collectors/BiometricDevicesCollector');

        // Nuevo collector con integración de notificaciones (2025-11-08)
        const MedicalDashboardModuleCollector = require('../collectors/MedicalDashboardModuleCollector');

        // Nuevo collector de Kiosks (2025-11-08)
        const KiosksModuleCollector = require('../collectors/KiosksModuleCollector');

        // Registrar collectors
        this.registerCollector('employee_profile', EmployeeProfileCollector);
        this.registerCollector('attendance', AttendanceModuleCollector);
        this.registerCollector('users', UsersModuleCollector);
        this.registerCollector('reports', ReportsModuleCollector);
        this.registerCollector('departments', DepartmentsModuleCollector);
        this.registerCollector('shifts', ShiftsModuleCollector);
        this.registerCollector('biometric_devices', BiometricDevicesCollector);
        this.registerCollector('medical-dashboard', MedicalDashboardModuleCollector);
        this.registerCollector('kiosks', KiosksModuleCollector);

        // TODO: Agregar los 27 collectors restantes aquí a medida que se implementen
        // this.registerCollector('notifications', NotificationsModuleCollector);
        // etc...

        console.log(`✅ ${this.collectors.size} collectors registrados\n`);
    }

    /**
     * ========================================================================
     * EJECUCIÓN DE TESTS
     * ========================================================================
     */

    /**
     * MODO 1: Full Test - Todos los módulos
     */
    async runFullTest(companyId, options = {}) {
        console.log('\n🚀 [ORCHESTRATOR] Iniciando FULL TEST - Todos los módulos\n');
        console.log('='.repeat(70));

        const execution_id = uuidv4();
        const startTime = Date.now();

        // Auto-registrar collectors si no se ha hecho
        if (this.collectors.size === 0) {
            this.autoRegisterCollectors();
        }

        const allModules = Array.from(this.collectors.keys());
        const results = await this.runModules(execution_id, companyId, allModules, options);

        const duration = (Date.now() - startTime) / 1000;

        // Reporte final
        this.printFinalReport(results, duration, 'FULL TEST');

        return {
            execution_id,
            mode: 'full',
            modules_tested: allModules.length,
            results,
            duration_seconds: duration
        };
    }

    /**
     * MODO 2: Critical Test - Solo módulos críticos
     */
    async runCriticalTest(companyId, options = {}) {
        console.log('\n⚡ [ORCHESTRATOR] Iniciando CRITICAL TEST - Módulos críticos\n');
        console.log('='.repeat(70));

        const execution_id = uuidv4();
        const startTime = Date.now();

        // Auto-registrar collectors si no se ha hecho
        if (this.collectors.size === 0) {
            this.autoRegisterCollectors();
        }

        // Módulos críticos (core system)
        const criticalModules = [
            'users',
            'attendance',
            'departments',
            'shifts',
            'reports'
        ].filter(module => this.collectors.has(module));

        const results = await this.runModules(execution_id, companyId, criticalModules, options);

        const duration = (Date.now() - startTime) / 1000;

        // Reporte final
        this.printFinalReport(results, duration, 'CRITICAL TEST');

        return {
            execution_id,
            mode: 'critical',
            modules_tested: criticalModules.length,
            results,
            duration_seconds: duration
        };
    }

    /**
     * MODO 3: Selective Test - Módulos específicos
     */
    async runSelectiveTest(companyId, moduleNames, options = {}) {
        console.log(`\n🎯 [ORCHESTRATOR] Iniciando SELECTIVE TEST - ${moduleNames.length} módulos\n`);
        console.log('='.repeat(70));

        const execution_id = uuidv4();
        const startTime = Date.now();

        // Auto-registrar collectors si no se ha hecho
        if (this.collectors.size === 0) {
            this.autoRegisterCollectors();
        }

        // Filtrar solo módulos que tengan collector registrado
        const validModules = moduleNames.filter(module => this.collectors.has(module));

        if (validModules.length < moduleNames.length) {
            const missing = moduleNames.filter(m => !this.collectors.has(m));
            console.log(`⚠️ Módulos sin collector: ${missing.join(', ')}\n`);
        }

        const results = await this.runModules(execution_id, companyId, validModules, options);

        const duration = (Date.now() - startTime) / 1000;

        // Reporte final
        this.printFinalReport(results, duration, 'SELECTIVE TEST');

        return {
            execution_id,
            mode: 'selective',
            modules_tested: validModules.length,
            results,
            duration_seconds: duration
        };
    }

    /**
     * ========================================================================
     * EJECUCIÓN DE MÓDULOS
     * ========================================================================
     */

    /**
     * Ejecutar tests de múltiples módulos (paralelo o secuencial)
     */
    async runModules(execution_id, companyId, moduleNames, options = {}) {
        const {
            parallel = false,      // Ejecutar en paralelo o secuencial
            maxRetries = 0,        // Reintentos en caso de fallo
            continueOnError = true // Continuar si un módulo falla
        } = options;

        console.log(`📋 Módulos a testear: ${moduleNames.join(', ')}\n`);
        console.log(`⚙️  Modo: ${parallel ? 'PARALELO' : 'SECUENCIAL'}`);
        console.log(`🔄 Max reintentos: ${maxRetries}\n`);
        console.log('='.repeat(70) + '\n');

        const results = [];

        if (parallel) {
            // Ejecución PARALELA (más rápido pero consume más recursos)
            console.log('🚀 Ejecutando módulos en PARALELO...\n');

            const promises = moduleNames.map(moduleName =>
                this.runSingleModule(execution_id, companyId, moduleName, maxRetries)
            );

            const moduleResults = await Promise.allSettled(promises);

            moduleResults.forEach((result, index) => {
                if (result.status === 'fulfilled') {
                    results.push(...result.value);
                } else {
                    console.error(`❌ Error en módulo ${moduleNames[index]}:`, result.reason);

                    results.push({
                        execution_id,
                        test_type: 'e2e',
                        module_name: moduleNames[index],
                        test_name: 'module_execution',
                        status: 'failed',
                        error_message: result.reason.message,
                        error_stack: result.reason.stack,
                        completed_at: new Date()
                    });
                }
            });

        } else {
            // Ejecución SECUENCIAL (más lento pero más controlado)
            console.log('📝 Ejecutando módulos en SECUENCIAL...\n');

            for (const moduleName of moduleNames) {
                try {
                    console.log(`\n${'='.repeat(70)}`);
                    console.log(`🧪 MÓDULO: ${moduleName.toUpperCase()}`);
                    console.log('='.repeat(70) + '\n');

                    const moduleResults = await this.runSingleModule(execution_id, companyId, moduleName, maxRetries);
                    results.push(...moduleResults);

                } catch (error) {
                    console.error(`❌ Error ejecutando módulo ${moduleName}:`, error);

                    results.push({
                        execution_id,
                        test_type: 'e2e',
                        module_name: moduleName,
                        test_name: 'module_execution',
                        status: 'failed',
                        error_message: error.message,
                        error_stack: error.stack,
                        completed_at: new Date()
                    });

                    if (!continueOnError) {
                        console.log(`\n❌ Deteniendo ejecución debido a error en ${moduleName}`);
                        break;
                    }
                }
            }
        }

        return results;
    }

    /**
     * Ejecutar test de un solo módulo (con reintentos)
     */
    async runSingleModule(execution_id, companyId, moduleName, maxRetries = 0, externalPage = null) {
        const CollectorClass = this.collectors.get(moduleName);

        if (!CollectorClass) {
            throw new Error(`Collector no encontrado para módulo: ${moduleName}`);
        }

        let attempt = 0;
        let lastError = null;

        while (attempt <= maxRetries) {
            try {
                if (attempt > 0) {
                    console.log(`\n🔄 Reintento ${attempt}/${maxRetries} para módulo ${moduleName}...\n`);
                }

                const collector = new CollectorClass(this.database, this.systemRegistry);
                const config = { company_id: companyId };

                // Si hay un navegador externo, usarlo (skip login)
                if (externalPage) {
                    config.page = externalPage;
                }

                const results = await collector.collect(execution_id, config);

                return results;

            } catch (error) {
                lastError = error;
                attempt++;

                if (attempt <= maxRetries) {
                    console.log(`⚠️ Error en intento ${attempt}, reintentando...`);
                    await new Promise(resolve => setTimeout(resolve, 2000)); // Esperar 2s antes de reintentar
                }
            }
        }

        // Si llegamos aquí, todos los reintentos fallaron
        throw lastError;
    }

    /**
     * ========================================================================
     * REPORTES
     * ========================================================================
     */

    /**
     * Imprimir reporte final consolidado
     */
    printFinalReport(results, duration, testMode) {
        console.log('\n' + '='.repeat(70));
        console.log(`📊 REPORTE FINAL - ${testMode}`);
        console.log('='.repeat(70) + '\n');

        // Agrupar por módulo
        const byModule = {};
        results.forEach(result => {
            const moduleName = result.module_name || 'unknown';
            if (!byModule[moduleName]) {
                byModule[moduleName] = { passed: 0, failed: 0, warning: 0, total: 0 };
            }

            byModule[moduleName].total++;

            if (result.status === 'passed' || result.status === 'pass') {
                byModule[moduleName].passed++;
            } else if (result.status === 'failed' || result.status === 'fail') {
                byModule[moduleName].failed++;
            } else if (result.status === 'warning') {
                byModule[moduleName].warning++;
            }
        });

        // Imprimir estadísticas por módulo
        Object.keys(byModule).forEach(moduleName => {
            const stats = byModule[moduleName];
            const successRate = ((stats.passed / stats.total) * 100).toFixed(1);

            console.log(`📦 ${moduleName.toUpperCase()}:`);
            console.log(`   ✅ PASSED:  ${stats.passed}/${stats.total}`);
            console.log(`   ❌ FAILED:  ${stats.failed}/${stats.total}`);
            console.log(`   ⚠️  WARNING: ${stats.warning}/${stats.total}`);
            console.log(`   📈 SUCCESS RATE: ${successRate}%\n`);
        });

        // Estadísticas globales
        const totalPassed = results.filter(r => r.status === 'passed' || r.status === 'pass').length;
        const totalFailed = results.filter(r => r.status === 'failed' || r.status === 'fail').length;
        const totalWarning = results.filter(r => r.status === 'warning').length;
        const total = results.length;
        const globalSuccessRate = ((totalPassed / total) * 100).toFixed(1);

        console.log('='.repeat(70));
        console.log('📊 ESTADÍSTICAS GLOBALES');
        console.log('='.repeat(70));
        console.log(`✅ TOTAL PASSED:  ${totalPassed}/${total}`);
        console.log(`❌ TOTAL FAILED:  ${totalFailed}/${total}`);
        console.log(`⚠️  TOTAL WARNING: ${totalWarning}/${total}`);
        console.log(`📈 GLOBAL SUCCESS RATE: ${globalSuccessRate}%`);
        console.log(`⏱️  DURATION: ${duration.toFixed(2)}s`);
        console.log('='.repeat(70) + '\n');

        // Listar tests fallidos
        if (totalFailed > 0) {
            console.log('❌ TESTS FALLIDOS:\n');
            results.filter(r => r.status === 'failed' || r.status === 'fail').forEach(test => {
                console.log(`   📛 ${test.module_name} → ${test.test_name}`);
                console.log(`      Error: ${test.error_message}\n`);
            });
        }
    }

    /**
     * Obtener resumen de ejecución desde BD
     */
    async getExecutionSummary(execution_id) {
        const results = await this.database.AuditLog.findAll({
            where: { execution_id },
            raw: true
        });

        const passed = results.filter(r => r.status === 'passed' || r.status === 'pass').length;
        const failed = results.filter(r => r.status === 'failed' || r.status === 'fail').length;
        const warnings = results.filter(r => r.status === 'warning').length;

        return {
            execution_id,
            total_tests: results.length,
            passed,
            failed,
            warnings,
            success_rate: ((passed / results.length) * 100).toFixed(1) + '%',
            tests: results
        };
    }
}

module.exports = IntelligentTestingOrchestrator;
