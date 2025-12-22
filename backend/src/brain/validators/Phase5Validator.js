/**
 * ============================================================================
 * PHASE 5 VALIDATOR - Phase4 Integration
 * ============================================================================
 *
 * Validaciones para la Fase 5: Integración con Phase4TestOrchestrator.
 *
 * Created: 2025-12-17
 */

const path = require('path');

class Phase5Validator {
    constructor() {
        this.results = [];
        this.integrationsPath = path.join(__dirname, '..', 'integrations');
        this.corePath = path.join(__dirname, '..', 'core');
    }

    /**
     * Ejecutar todas las validaciones de Fase 5
     */
    async runAll() {
        console.log('\n🔍 [PHASE-5] Ejecutando validaciones...\n');

        await this.validateSmartTestGeneratorExists();
        await this.validateTestGeneration();
        await this.validateExecutionOrder();
        await this.validateSmokeTests();
        await this.validateAffectedDetection();
        await this.validatePhase4Export();

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
     * V1: Verificar que SmartTestGenerator existe
     */
    async validateSmartTestGeneratorExists() {
        try {
            const { SmartTestGenerator } = require(path.join(this.integrationsPath, 'SmartTestGenerator.js'));

            if (typeof SmartTestGenerator !== 'function') {
                throw new Error('SmartTestGenerator no es una clase');
            }

            this.addResult('SmartTestGenerator existe', true);
        } catch (error) {
            this.addResult('SmartTestGenerator existe', false, error.message);
        }
    }

    /**
     * V2: Verificar generación de tests para un módulo
     */
    async validateTestGeneration() {
        try {
            const { SmartTestGenerator } = require(path.join(this.integrationsPath, 'SmartTestGenerator.js'));
            const { resetBrain } = require(path.join(this.corePath, 'IntrospectiveBrain.js'));
            const { ModuleMigrator } = require(path.join(this.corePath, 'ModuleMigrator.js'));

            // Inicializar Brain con módulos
            const brain = resetBrain();
            const migrator = new ModuleMigrator();
            const nodes = await migrator.migrateAll();
            for (const node of nodes) {
                brain.register(node);
            }
            brain.buildRelationGraph();

            // Crear generador
            const generator = new SmartTestGenerator(brain);

            // Generar tests para un módulo
            const testSpec = generator.generateTestsForModule('attendance');

            if (!testSpec || testSpec.error) {
                throw new Error(testSpec?.error || 'No se generaron tests');
            }

            if (testSpec.totalTests < 1) {
                throw new Error('No se generaron casos de prueba');
            }

            this.addResult(`Generación de tests: ${testSpec.totalTests} tests para attendance`, true);
        } catch (error) {
            this.addResult('Generación de tests', false, error.message);
        }
    }

    /**
     * V3: Verificar orden de ejecución
     */
    async validateExecutionOrder() {
        try {
            const { SmartTestGenerator } = require(path.join(this.integrationsPath, 'SmartTestGenerator.js'));
            const { resetBrain } = require(path.join(this.corePath, 'IntrospectiveBrain.js'));
            const { ModuleMigrator } = require(path.join(this.corePath, 'ModuleMigrator.js'));

            const brain = resetBrain();
            const migrator = new ModuleMigrator();
            const nodes = await migrator.migrateAll();
            for (const node of nodes) {
                brain.register(node);
            }
            brain.buildRelationGraph();

            const generator = new SmartTestGenerator(brain);
            const order = generator.generateTestExecutionOrder();

            if (!Array.isArray(order)) {
                throw new Error('Orden de ejecución no es un array');
            }

            if (order.length < 10) {
                throw new Error(`Solo ${order.length} módulos en orden (esperados >10)`);
            }

            // Verificar que tiene estructura correcta
            const first = order[0];
            if (!first.module || !first.name || typeof first.priority !== 'number') {
                throw new Error('Estructura de orden incorrecta');
            }

            // Verificar que están ordenados por prioridad
            for (let i = 1; i < order.length; i++) {
                if (order[i].priority > order[i-1].priority) {
                    throw new Error('No está ordenado por prioridad');
                }
            }

            this.addResult(`Orden de ejecución: ${order.length} módulos ordenados`, true);
        } catch (error) {
            this.addResult('Orden de ejecución', false, error.message);
        }
    }

    /**
     * V4: Verificar smoke tests
     */
    async validateSmokeTests() {
        try {
            const { SmartTestGenerator } = require(path.join(this.integrationsPath, 'SmartTestGenerator.js'));
            const { resetBrain } = require(path.join(this.corePath, 'IntrospectiveBrain.js'));
            const { ModuleMigrator } = require(path.join(this.corePath, 'ModuleMigrator.js'));

            const brain = resetBrain();
            const migrator = new ModuleMigrator();
            const nodes = await migrator.migrateAll();
            for (const node of nodes) {
                brain.register(node);
            }
            brain.buildRelationGraph();

            const generator = new SmartTestGenerator(brain);
            const smokeTests = generator.generateSmokeTests();

            if (!smokeTests.tests || smokeTests.tests.length === 0) {
                throw new Error('No se generaron smoke tests');
            }

            if (!smokeTests.estimatedTime) {
                throw new Error('No hay tiempo estimado');
            }

            this.addResult(`Smoke tests: ${smokeTests.tests.length} tests, ~${smokeTests.estimatedTime}s`, true);
        } catch (error) {
            this.addResult('Smoke tests', false, error.message);
        }
    }

    /**
     * V5: Verificar detección de módulos afectados
     */
    async validateAffectedDetection() {
        try {
            const { SmartTestGenerator } = require(path.join(this.integrationsPath, 'SmartTestGenerator.js'));
            const { resetBrain } = require(path.join(this.corePath, 'IntrospectiveBrain.js'));
            const { ModuleMigrator } = require(path.join(this.corePath, 'ModuleMigrator.js'));

            const brain = resetBrain();
            const migrator = new ModuleMigrator();
            const nodes = await migrator.migrateAll();
            for (const node of nodes) {
                brain.register(node);
            }
            brain.buildRelationGraph();

            const generator = new SmartTestGenerator(brain);

            // Probar con un módulo que debería tener dependientes
            const affected = generator.detectAffectedTests('attendance');

            if (!affected.affectedModules || !Array.isArray(affected.affectedModules)) {
                throw new Error('No se detectaron módulos afectados');
            }

            if (!affected.recommendation) {
                throw new Error('No hay recomendación');
            }

            this.addResult(`Detección afectados: ${affected.totalAffected} módulos`, true);
        } catch (error) {
            this.addResult('Detección de afectados', false, error.message);
        }
    }

    /**
     * V6: Verificar export para Phase4
     */
    async validatePhase4Export() {
        try {
            const { SmartTestGenerator } = require(path.join(this.integrationsPath, 'SmartTestGenerator.js'));
            const { resetBrain } = require(path.join(this.corePath, 'IntrospectiveBrain.js'));
            const { ModuleMigrator } = require(path.join(this.corePath, 'ModuleMigrator.js'));

            const brain = resetBrain();
            const migrator = new ModuleMigrator();
            const nodes = await migrator.migrateAll();
            for (const node of nodes) {
                brain.register(node);
            }
            brain.buildRelationGraph();

            const generator = new SmartTestGenerator(brain);
            const config = generator.exportPhase4Config();

            // Verificar estructura
            if (!config.version) throw new Error('Sin version');
            if (!config.execution) throw new Error('Sin execution config');
            if (!config.smokeTests) throw new Error('Sin smokeTests');
            if (!config.priorityGroups) throw new Error('Sin priorityGroups');
            if (!config.stats) throw new Error('Sin stats');

            // Verificar estadísticas
            if (config.stats.totalModules < 10) {
                throw new Error('Muy pocos módulos');
            }

            this.addResult(`Export Phase4: ${config.stats.totalModules} módulos, ${config.stats.coveragePercent}% cobertura`, true);
        } catch (error) {
            this.addResult('Export Phase4', false, error.message);
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
        console.log(`FASE 5 - RESULTADO: ${allPassed ? '✅ PASÓ' : '❌ FALLÓ'}`);
        console.log(`Validaciones: ${passed}/${total} pasaron`);
        console.log('='.repeat(50) + '\n');

        return {
            phase: 5,
            phaseName: 'phase4-integration',
            allPassed,
            passed,
            failed,
            total,
            results: this.results
        };
    }
}

module.exports = { Phase5Validator };
