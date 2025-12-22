/**
 * ============================================================================
 * PHASE 4 VALIDATOR - API Routes v2
 * ============================================================================
 *
 * Validaciones para la Fase 4: API Routes del Brain.
 * Verifica que los endpoints del Brain V2 funcionen correctamente.
 *
 * Created: 2025-12-17
 */

const path = require('path');

class Phase4Validator {
    constructor() {
        this.results = [];
        this.routesPath = path.join(__dirname, '..', '..', 'routes');
    }

    /**
     * Ejecutar todas las validaciones de Fase 4
     */
    async runAll() {
        console.log('\n🔍 [PHASE-4] Ejecutando validaciones...\n');

        await this.validateRoutesExist();
        await this.validateRouterExports();
        await this.validateEndpointDefinitions();
        await this.validateMiddleware();
        await this.validateCapabilitiesEndpoint();

        return this.getSummary();
    }

    /**
     * Agregar resultado de validación
     */
    addResult(name, passed, error = null) {
        this.results.push({
            name,
            passed,
            error,
            timestamp: new Date().toISOString()
        });

        const icon = passed ? '✅' : '❌';
        console.log(`${icon} ${name}${error ? `: ${error}` : ''}`);
    }

    /**
     * V1: Verificar que brainV2Routes.js existe
     */
    async validateRoutesExist() {
        try {
            const fs = require('fs').promises;
            const routesFile = path.join(this.routesPath, 'brainV2Routes.js');

            await fs.access(routesFile);

            const content = await fs.readFile(routesFile, 'utf8');
            if (content.length < 1000) {
                throw new Error('Archivo muy pequeño - puede estar incompleto');
            }

            this.addResult('brainV2Routes.js existe', true);
        } catch (error) {
            this.addResult('brainV2Routes.js existe', false, error.message);
        }
    }

    /**
     * V2: Verificar que el router exporta correctamente
     */
    async validateRouterExports() {
        try {
            const router = require(path.join(this.routesPath, 'brainV2Routes.js'));

            if (!router) {
                throw new Error('Router no exportado');
            }

            // Verificar que es un router de Express
            if (typeof router !== 'function' && !router.stack) {
                throw new Error('No es un router de Express válido');
            }

            this.addResult('Router exporta correctamente', true);
        } catch (error) {
            this.addResult('Router exporta correctamente', false, error.message);
        }
    }

    /**
     * V3: Verificar que los endpoints principales están definidos
     */
    async validateEndpointDefinitions() {
        try {
            const router = require(path.join(this.routesPath, 'brainV2Routes.js'));

            // Obtener las rutas definidas
            const routes = router.stack
                .filter(layer => layer.route)
                .map(layer => ({
                    path: layer.route.path,
                    methods: Object.keys(layer.route.methods)
                }));

            const requiredEndpoints = [
                { path: '/status', method: 'get' },
                { path: '/nodes', method: 'get' },
                { path: '/nodes/:key', method: 'get' },
                { path: '/relations', method: 'get' },
                { path: '/graph', method: 'get' },
                { path: '/query', method: 'post' },
                { path: '/health', method: 'get' },
                { path: '/capabilities', method: 'get' }
            ];

            const missing = [];
            for (const required of requiredEndpoints) {
                const found = routes.find(r =>
                    r.path === required.path && r.methods.includes(required.method)
                );
                if (!found) {
                    missing.push(`${required.method.toUpperCase()} ${required.path}`);
                }
            }

            if (missing.length > 0) {
                throw new Error(`Faltan endpoints: ${missing.join(', ')}`);
            }

            this.addResult(`${routes.length} endpoints definidos correctamente`, true);
        } catch (error) {
            this.addResult('Endpoints definidos', false, error.message);
        }
    }

    /**
     * V4: Verificar middleware de inicialización
     */
    async validateMiddleware() {
        try {
            const fs = require('fs').promises;
            const routesFile = path.join(this.routesPath, 'brainV2Routes.js');
            const content = await fs.readFile(routesFile, 'utf8');

            // Verificar que hay middleware de Brain
            if (!content.includes('ensureBrain')) {
                throw new Error('Middleware ensureBrain no encontrado');
            }

            // Verificar función de inicialización
            if (!content.includes('initializeBrain')) {
                throw new Error('Función initializeBrain no encontrada');
            }

            // Verificar lazy loading
            if (!content.includes('isInitialized')) {
                throw new Error('Control de inicialización no encontrado');
            }

            this.addResult('Middleware de Brain configurado', true);
        } catch (error) {
            this.addResult('Middleware de Brain configurado', false, error.message);
        }
    }

    /**
     * V5: Verificar endpoint de capabilities (no requiere Brain)
     */
    async validateCapabilitiesEndpoint() {
        try {
            // Este endpoint no requiere que el Brain esté inicializado
            // Solo verifica que el vocabulario se puede cargar
            const { CapabilitiesVocabulary } = require(path.join(__dirname, '..', 'schemas', 'CapabilitiesVocabulary.js'));

            const stats = CapabilitiesVocabulary.getStats();

            if (stats.totalCapabilities < 50) {
                throw new Error(`Solo ${stats.totalCapabilities} capacidades (esperadas >50)`);
            }

            const capabilities = CapabilitiesVocabulary.getAllCapabilities();
            if (capabilities.length !== stats.totalCapabilities) {
                throw new Error('Inconsistencia en conteo de capacidades');
            }

            this.addResult(`Vocabulario: ${stats.totalCapabilities} capacidades en ${stats.totalDomains} dominios`, true);
        } catch (error) {
            this.addResult('Vocabulario de capacidades', false, error.message);
        }
    }

    /**
     * Obtener resumen de validaciones
     */
    getSummary() {
        const passed = this.results.filter(r => r.passed).length;
        const failed = this.results.filter(r => !r.passed).length;
        const total = this.results.length;
        const allPassed = failed === 0;

        console.log('\n' + '='.repeat(50));
        console.log(`FASE 4 - RESULTADO: ${allPassed ? '✅ PASÓ' : '❌ FALLÓ'}`);
        console.log(`Validaciones: ${passed}/${total} pasaron`);
        console.log('='.repeat(50) + '\n');

        return {
            phase: 4,
            phaseName: 'api-routes',
            allPassed,
            passed,
            failed,
            total,
            results: this.results
        };
    }
}

module.exports = { Phase4Validator };
