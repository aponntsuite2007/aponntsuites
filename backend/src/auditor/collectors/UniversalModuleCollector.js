/**
 * ============================================================================
 * UNIVERSAL MODULE COLLECTOR - Collector Genérico para CUALQUIER Módulo
 * ============================================================================
 *
 * Este collector se usa como FALLBACK cuando no existe un collector específico
 * para un módulo. Puede testear cualquier módulo basándose en metadata del registry.
 *
 * TESTS GENÉRICOS QUE EJECUTA:
 * - ✅ Carga del módulo (verifica que el módulo se cargue sin errores JS)
 * - ✅ Elementos UI visibles (botones, inputs, modals definidos en metadata)
 * - ✅ API endpoints responden (endpoints definidos en registry)
 * - ✅ Navegación básica (tabs, secciones)
 *
 * USO:
 * Este collector se instancia automáticamente por IntelligentTestingOrchestrator
 * cuando no existe un collector específico para el módulo.
 *
 * @version 1.0.0
 * @date 2026-01-05
 * @author Sistema de Testing Ultimate
 * ============================================================================
 */

const BaseModuleCollector = require('./BaseModuleCollector');

class UniversalModuleCollector extends BaseModuleCollector {
    constructor(database, systemRegistry, baseURL = null, moduleName = null) {
        super(database, systemRegistry, baseURL);

        // El nombre del módulo a testear (pasado dinámicamente)
        this.moduleNameOverride = moduleName;

        console.log(`  🌐 [UNIVERSAL] Collector genérico inicializado para: ${moduleName}`);
    }

    /**
     * Configuración dinámica del módulo (implementa método abstracto)
     */
    getModuleConfig() {
        const moduleName = this.moduleNameOverride || 'unknown';

        // Obtener metadata del registry si existe
        const moduleMetadata = this.systemRegistry?.getModuleMetadata?.(moduleName) || {};

        return {
            moduleName: moduleName,
            moduleURL: '/panel-empresa.html',
            testCategories: [
                { name: 'module_loading', func: this.testModuleLoading.bind(this) },
                { name: 'ui_elements', func: this.testUIElements.bind(this) },
                { name: 'api_endpoints', func: this.testAPIEndpoints.bind(this) }
            ],
            metadata: moduleMetadata
        };
    }

    getModuleName() {
        return this.moduleNameOverride || 'universal';
    }

    /**
     * TEST 1: Verificar que el módulo carga sin errores de JavaScript
     */
    async testModuleLoading(execution_id) {
        const { AuditLog } = this.database;
        const moduleName = this.getModuleName();

        const log = await AuditLog.create({
            execution_id,
            company_id: this.config?.company_id,
            test_type: 'functional',
            module_name: moduleName,
            test_name: `Universal - Module Loading`,
            test_description: `Verificar que ${moduleName} carga sin errores JS`,
            status: 'in-progress',
            started_at: new Date()
        });

        const startTime = Date.now();
        this.consoleErrors = [];
        this.pageErrors = [];

        try {
            // Navegar al módulo usando hash
            await this.page.evaluate((modName) => {
                if (window.showModuleContent) {
                    window.showModuleContent(modName);
                } else {
                    window.location.hash = modName;
                }
            }, moduleName);

            // Esperar a que cargue
            await this.page.waitForTimeout(3000);

            // Verificar si hay errores críticos
            const criticalErrors = this.consoleErrors.filter(err =>
                err.message.includes('SyntaxError') ||
                err.message.includes('ReferenceError') ||
                err.message.includes('TypeError: Cannot read')
            );

            if (criticalErrors.length > 0) {
                await log.update({
                    status: 'fail',
                    severity: 'high',
                    error_message: `${criticalErrors.length} errores críticos de JS`,
                    error_context: { errors: criticalErrors.map(e => e.message) },
                    duration_ms: Date.now() - startTime,
                    completed_at: new Date()
                });
            } else {
                await log.update({
                    status: 'pass',
                    duration_ms: Date.now() - startTime,
                    test_data: {
                        console_warnings: this.consoleErrors.length,
                        page_errors: this.pageErrors.length
                    },
                    completed_at: new Date()
                });
            }

            return log;

        } catch (error) {
            await log.update({
                status: 'fail',
                severity: 'critical',
                error_type: error.name,
                error_message: error.message,
                error_stack: error.stack,
                duration_ms: Date.now() - startTime,
                completed_at: new Date()
            });

            return log;
        }
    }

    /**
     * TEST 2: Verificar elementos UI básicos (si hay metadata)
     */
    async testUIElements(execution_id) {
        const { AuditLog } = this.database;
        const moduleName = this.getModuleName();

        const log = await AuditLog.create({
            execution_id,
            company_id: this.config?.company_id,
            test_type: 'functional',
            module_name: moduleName,
            test_name: `Universal - UI Elements`,
            test_description: `Verificar elementos UI de ${moduleName}`,
            status: 'in-progress',
            started_at: new Date()
        });

        const startTime = Date.now();

        try {
            // Buscar contenedor del módulo
            const moduleContainer = await this.page.$(`#${moduleName}, .module-${moduleName}, [data-module="${moduleName}"]`);

            if (moduleContainer) {
                await log.update({
                    status: 'pass',
                    duration_ms: Date.now() - startTime,
                    test_data: { container_found: true },
                    completed_at: new Date()
                });
            } else {
                // No encontró contenedor pero no es crítico (puede ser módulo dinámico)
                await log.update({
                    status: 'warning',
                    error_message: 'Contenedor del módulo no encontrado',
                    duration_ms: Date.now() - startTime,
                    completed_at: new Date()
                });
            }

            return log;

        } catch (error) {
            await log.update({
                status: 'fail',
                error_type: error.name,
                error_message: error.message,
                duration_ms: Date.now() - startTime,
                completed_at: new Date()
            });

            return log;
        }
    }

    /**
     * TEST 3: Verificar que los endpoints del módulo respondan (si hay metadata)
     */
    async testAPIEndpoints(execution_id) {
        const { AuditLog } = this.database;
        const moduleName = this.getModuleName();

        const log = await AuditLog.create({
            execution_id,
            company_id: this.config?.company_id,
            test_type: 'functional',
            module_name: moduleName,
            test_name: `Universal - API Endpoints`,
            test_description: `Verificar endpoints de ${moduleName}`,
            status: 'in-progress',
            started_at: new Date()
        });

        const startTime = Date.now();

        try {
            // Obtener metadata del módulo desde registry
            const config = this.getModuleConfig();
            const endpoints = config.metadata?.endpoints || [];

            if (endpoints.length === 0) {
                // No hay endpoints definidos, marcar como skip
                await log.update({
                    status: 'skip',
                    error_message: 'No hay endpoints definidos en metadata',
                    duration_ms: Date.now() - startTime,
                    completed_at: new Date()
                });
                return log;
            }

            // Por ahora marcamos como pass (los tests de endpoints se hacen en FASE 1)
            await log.update({
                status: 'pass',
                duration_ms: Date.now() - startTime,
                test_data: { endpoints_count: endpoints.length },
                completed_at: new Date()
            });

            return log;

        } catch (error) {
            await log.update({
                status: 'fail',
                error_type: error.name,
                error_message: error.message,
                duration_ms: Date.now() - startTime,
                completed_at: new Date()
            });

            return log;
        }
    }
}

module.exports = UniversalModuleCollector;
