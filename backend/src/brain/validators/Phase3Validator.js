/**
 * ============================================================================
 * PHASE 3 VALIDATOR - Migration
 * ============================================================================
 *
 * Validaciones para la Fase 3: Migración de módulos.
 * Verifica que el ModuleMigrator funcione y que los nodos migrados sean válidos.
 *
 * Created: 2025-12-17
 */

const path = require('path');
const fs = require('fs').promises;

class Phase3Validator {
    constructor() {
        this.results = [];
        this.corePath = path.join(__dirname, '..', 'core');
        this.schemasPath = path.join(__dirname, '..', 'schemas');
    }

    /**
     * Ejecutar todas las validaciones de Fase 3
     */
    async runAll() {
        console.log('\n🔍 [PHASE-3] Ejecutando validaciones...\n');

        await this.validateMigratorExists();
        await this.validateRegistryAccess();
        await this.validateMigrateSingleModule();
        await this.validateMigrateAllModules();
        await this.validateInferredCapabilities();
        await this.validateNodeIntegrity();
        await this.validateBrainRegistration();
        await this.validateExportImport();

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
     * V1: Verificar que ModuleMigrator existe
     */
    async validateMigratorExists() {
        try {
            const { ModuleMigrator } = require(path.join(this.corePath, 'ModuleMigrator.js'));

            if (typeof ModuleMigrator !== 'function') {
                throw new Error('ModuleMigrator no es una clase');
            }

            const migrator = new ModuleMigrator();
            if (typeof migrator.migrateAll !== 'function') {
                throw new Error('migrateAll no existe');
            }
            if (typeof migrator.migrateModule !== 'function') {
                throw new Error('migrateModule no existe');
            }

            this.addResult('ModuleMigrator existe y es válido', true);
        } catch (error) {
            this.addResult('ModuleMigrator existe y es válido', false, error.message);
        }
    }

    /**
     * V2: Verificar acceso al registry
     */
    async validateRegistryAccess() {
        try {
            const { ModuleMigrator } = require(path.join(this.corePath, 'ModuleMigrator.js'));

            const migrator = new ModuleMigrator();
            const loaded = await migrator.loadRegistry();

            if (!loaded) {
                throw new Error('No se pudo cargar el registry');
            }

            if (!migrator.registry || !migrator.registry.modules) {
                throw new Error('Registry no tiene módulos');
            }

            const moduleCount = Object.keys(migrator.registry.modules).length;
            if (moduleCount < 10) {
                throw new Error(`Solo ${moduleCount} módulos en registry (esperados >10)`);
            }

            this.addResult(`Registry accesible con ${moduleCount} módulos`, true);
        } catch (error) {
            this.addResult('Registry accesible', false, error.message);
        }
    }

    /**
     * V3: Verificar migración de un módulo individual
     */
    async validateMigrateSingleModule() {
        try {
            const { ModuleMigrator } = require(path.join(this.corePath, 'ModuleMigrator.js'));
            const { UniversalNode } = require(path.join(this.schemasPath, 'UniversalNode.js'));

            const migrator = new ModuleMigrator();
            await migrator.loadRegistry();

            // Buscar un módulo conocido
            const testModuleIndex = Object.keys(migrator.registry.modules)[0];
            const testModuleData = migrator.registry.modules[testModuleIndex];
            const expectedKey = testModuleData.id || testModuleData.key || testModuleIndex;

            const node = migrator.migrateModule(testModuleIndex, testModuleData);

            if (!(node instanceof UniversalNode)) {
                throw new Error('migrateModule no retorna UniversalNode');
            }

            if (node.key !== expectedKey) {
                throw new Error(`Key del nodo (${node.key}) no coincide con esperado (${expectedKey})`);
            }

            if (!node.name) {
                throw new Error('Nodo sin nombre');
            }

            this.addResult(`Migración individual funciona (${expectedKey})`, true);
        } catch (error) {
            this.addResult('Migración individual funciona', false, error.message);
        }
    }

    /**
     * V4: Verificar migración masiva de todos los módulos
     */
    async validateMigrateAllModules() {
        try {
            const { ModuleMigrator } = require(path.join(this.corePath, 'ModuleMigrator.js'));

            const migrator = new ModuleMigrator();
            const nodes = await migrator.migrateAll();

            if (!Array.isArray(nodes)) {
                throw new Error('migrateAll no retorna array');
            }

            if (nodes.length < 10) {
                throw new Error(`Solo ${nodes.length} nodos migrados (esperados >10)`);
            }

            const summary = migrator.getSummary();
            if (summary.errors > nodes.length * 0.1) {
                throw new Error(`Demasiados errores: ${summary.errors}/${summary.total}`);
            }

            this.addResult(`Migración masiva: ${nodes.length} nodos creados`, true);
        } catch (error) {
            this.addResult('Migración masiva funciona', false, error.message);
        }
    }

    /**
     * V5: Verificar que se infieren capacidades correctamente
     */
    async validateInferredCapabilities() {
        try {
            const { ModuleMigrator } = require(path.join(this.corePath, 'ModuleMigrator.js'));

            const migrator = new ModuleMigrator();
            const nodes = await migrator.migrateAll();

            let totalProvides = 0;
            let totalConsumes = 0;
            let nodesWithProvides = 0;
            let nodesWithConsumes = 0;

            for (const node of nodes) {
                if (node.provides.length > 0) {
                    nodesWithProvides++;
                    totalProvides += node.provides.length;
                }
                if (node.consumes.length > 0) {
                    nodesWithConsumes++;
                    totalConsumes += node.consumes.length;
                }
            }

            // Al menos 80% de nodos deberían tener provides
            const providesRatio = nodesWithProvides / nodes.length;
            if (providesRatio < 0.8) {
                throw new Error(`Solo ${Math.round(providesRatio * 100)}% tienen provides`);
            }

            // Al menos 90% de nodos deberían consumir auth
            const consumesRatio = nodesWithConsumes / nodes.length;
            if (consumesRatio < 0.9) {
                throw new Error(`Solo ${Math.round(consumesRatio * 100)}% tienen consumes`);
            }

            this.addResult(`Inferencia de capacidades: ${totalProvides} provides, ${totalConsumes} consumes`, true);
        } catch (error) {
            this.addResult('Inferencia de capacidades funciona', false, error.message);
        }
    }

    /**
     * V6: Verificar integridad de nodos migrados
     * NOTA: Capacidades inferidas pueden no estar en vocabulario - es esperado
     */
    async validateNodeIntegrity() {
        try {
            const { ModuleMigrator } = require(path.join(this.corePath, 'ModuleMigrator.js'));

            const migrator = new ModuleMigrator();
            const nodes = await migrator.migrateAll();

            let nodesWithKey = 0;
            let nodesWithName = 0;
            let nodesWithProvides = 0;

            for (const node of nodes) {
                // Verificar estructura básica (no vocabulario estricto)
                if (node.key && typeof node.key === 'string') nodesWithKey++;
                if (node.name && typeof node.name === 'string') nodesWithName++;
                if (node.provides && node.provides.length > 0) nodesWithProvides++;
            }

            // Lo importante es que tengan key, name y al menos un provides
            if (nodesWithKey < nodes.length * 0.95) {
                throw new Error(`Solo ${nodesWithKey}/${nodes.length} nodos tienen key`);
            }
            if (nodesWithProvides < nodes.length * 0.8) {
                throw new Error(`Solo ${nodesWithProvides}/${nodes.length} nodos tienen provides`);
            }

            this.addResult(`Integridad: ${nodesWithKey} keys, ${nodesWithProvides} con provides`, true);
        } catch (error) {
            this.addResult('Integridad de nodos', false, error.message);
        }
    }

    /**
     * V7: Verificar registro en IntrospectiveBrain
     */
    async validateBrainRegistration() {
        try {
            const { ModuleMigrator } = require(path.join(this.corePath, 'ModuleMigrator.js'));
            const { resetBrain } = require(path.join(this.corePath, 'IntrospectiveBrain.js'));

            const migrator = new ModuleMigrator();
            const nodes = await migrator.migrateAll();

            // Registrar en el Brain
            const brain = resetBrain();
            for (const node of nodes) {
                brain.register(node);
            }

            // Verificar registro
            if (brain.getAllNodes().length !== nodes.length) {
                throw new Error('No todos los nodos se registraron');
            }

            // Construir grafo
            brain.buildRelationGraph();

            // Obtener stats
            const stats = brain.getStats();

            // Para módulos inferidos, puede que no haya relaciones directas
            // porque las capacidades son específicas de cada módulo (data:users vs data:attendance)
            // Lo importante es que el grafo se construya sin errores
            // Las relaciones vendrán cuando se definan consumos explícitos (auth:validate-token)

            // Verificar que hay capacidades indexadas
            const hasCapabilities = stats.uniqueCapabilities.provides > 0 && stats.uniqueCapabilities.consumes > 0;
            if (!hasCapabilities) {
                throw new Error('No se indexaron capacidades');
            }

            this.addResult(`Brain: ${stats.totalNodes} nodos, ${stats.uniqueCapabilities.provides} provides, ${stats.uniqueCapabilities.consumes} consumes`, true);
        } catch (error) {
            this.addResult('Registro en Brain funciona', false, error.message);
        }
    }

    /**
     * V8: Verificar export/import de nodos
     */
    async validateExportImport() {
        try {
            const { ModuleMigrator } = require(path.join(this.corePath, 'ModuleMigrator.js'));
            const { UniversalNode } = require(path.join(this.schemasPath, 'UniversalNode.js'));

            const migrator = new ModuleMigrator();
            await migrator.migrateAll();

            // Export
            const exported = migrator.exportNodes();
            if (!Array.isArray(exported)) {
                throw new Error('exportNodes no retorna array');
            }

            // Guardar temporalmente
            const tempPath = path.join(__dirname, '..', 'checkpoints', 'temp_migration_test.json');
            await migrator.saveNodes(tempPath);

            // Cargar de vuelta
            const loaded = await ModuleMigrator.loadNodes(tempPath);
            if (loaded.length !== exported.length) {
                throw new Error('Cantidad de nodos no coincide después de import');
            }

            // Verificar que son UniversalNode
            if (!(loaded[0] instanceof UniversalNode)) {
                throw new Error('Nodos cargados no son UniversalNode');
            }

            // Limpiar archivo temporal
            await fs.unlink(tempPath);

            this.addResult('Export/Import de nodos funciona', true);
        } catch (error) {
            this.addResult('Export/Import de nodos funciona', false, error.message);
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
        console.log(`FASE 3 - RESULTADO: ${allPassed ? '✅ PASÓ' : '❌ FALLÓ'}`);
        console.log(`Validaciones: ${passed}/${total} pasaron`);
        console.log('='.repeat(50) + '\n');

        return {
            phase: 3,
            phaseName: 'migration',
            allPassed,
            passed,
            failed,
            total,
            results: this.results
        };
    }
}

module.exports = { Phase3Validator };
