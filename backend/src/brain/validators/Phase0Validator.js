/**
 * ============================================================================
 * PHASE 0 VALIDATOR - Sistema de Control de Cambios
 * ============================================================================
 *
 * Validaciones para la Fase 0: Sistema de control de cambios.
 * Verifica que BrainUpgradeController funcione correctamente.
 *
 * Created: 2025-12-17
 */

const path = require('path');
const fs = require('fs').promises;

class Phase0Validator {
    constructor() {
        this.results = [];
        this.brainPath = path.join(__dirname, '..');
    }

    /**
     * Ejecutar todas las validaciones de Fase 0
     */
    async runAll() {
        console.log('\n🔍 [PHASE-0] Ejecutando validaciones...\n');

        await this.validateControllerExists();
        await this.validateControllerInit();
        await this.validateCheckpointCreation();
        await this.validateFeatureFlags();
        await this.validateRollbackCapability();
        await this.validateStatusReport();

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
     * V1: Verificar que BrainUpgradeController existe
     */
    async validateControllerExists() {
        try {
            const controllerPath = path.join(this.brainPath, 'BrainUpgradeController.js');
            await fs.access(controllerPath);

            // Verificar que se puede importar
            const { BrainUpgradeController } = require(controllerPath);

            if (typeof BrainUpgradeController !== 'function') {
                throw new Error('BrainUpgradeController no es una clase');
            }

            this.addResult('BrainUpgradeController existe y es importable', true);
        } catch (error) {
            this.addResult('BrainUpgradeController existe y es importable', false, error.message);
        }
    }

    /**
     * V2: Verificar inicialización del controlador
     */
    async validateControllerInit() {
        try {
            const { getBrainUpgradeController } = require(path.join(this.brainPath, 'BrainUpgradeController.js'));

            const controller = await getBrainUpgradeController();

            if (!controller.config) {
                throw new Error('Config no inicializado');
            }
            if (typeof controller.config.currentPhase !== 'number') {
                throw new Error('currentPhase no es un número');
            }
            if (!controller.config.featureFlags) {
                throw new Error('featureFlags no existe');
            }

            this.addResult('Controller inicializa correctamente', true);
        } catch (error) {
            this.addResult('Controller inicializa correctamente', false, error.message);
        }
    }

    /**
     * V3: Verificar creación de checkpoints
     */
    async validateCheckpointCreation() {
        try {
            const { getBrainUpgradeController } = require(path.join(this.brainPath, 'BrainUpgradeController.js'));

            const controller = await getBrainUpgradeController();
            const checkpointId = await controller.createCheckpoint(0, 'Test checkpoint from validator');

            if (!checkpointId || !checkpointId.startsWith('CP-')) {
                throw new Error('Checkpoint ID inválido');
            }

            // Verificar que el archivo existe
            const checkpointPath = path.join(controller.checkpointsPath, `${checkpointId}.json`);
            await fs.access(checkpointPath);

            // Verificar contenido
            const data = JSON.parse(await fs.readFile(checkpointPath, 'utf8'));
            if (!data.configSnapshot) {
                throw new Error('Checkpoint no tiene configSnapshot');
            }

            this.addResult('Creación de checkpoints funciona', true);
        } catch (error) {
            this.addResult('Creación de checkpoints funciona', false, error.message);
        }
    }

    /**
     * V4: Verificar feature flags
     */
    async validateFeatureFlags() {
        try {
            const { getBrainUpgradeController } = require(path.join(this.brainPath, 'BrainUpgradeController.js'));

            const controller = await getBrainUpgradeController();

            // Verificar que todas las flags existen
            const expectedFlags = [
                'useNewSchema',
                'useIntrospectiveBrain',
                'useNewApiRoutes',
                'useSmartTesting',
                'useAutoTutorials',
                'useNewVisualization'
            ];

            for (const flag of expectedFlags) {
                if (!controller.config.featureFlags.hasOwnProperty(flag)) {
                    throw new Error(`Flag '${flag}' no existe`);
                }
            }

            // Verificar que todas están desactivadas por defecto
            const anyEnabled = Object.values(controller.config.featureFlags).some(v => v === true);
            if (anyEnabled) {
                console.log('   ⚠️  Algunas flags ya están activadas (puede ser intencional)');
            }

            // Verificar método isFeatureEnabled
            const result = controller.isFeatureEnabled('useNewSchema');
            if (typeof result !== 'boolean') {
                throw new Error('isFeatureEnabled no retorna boolean');
            }

            this.addResult('Feature flags configurados correctamente', true);
        } catch (error) {
            this.addResult('Feature flags configurados correctamente', false, error.message);
        }
    }

    /**
     * V5: Verificar capacidad de rollback
     */
    async validateRollbackCapability() {
        try {
            const { getBrainUpgradeController } = require(path.join(this.brainPath, 'BrainUpgradeController.js'));

            const controller = await getBrainUpgradeController();

            // Verificar que existe el método
            if (typeof controller.rollbackToCheckpoint !== 'function') {
                throw new Error('Método rollbackToCheckpoint no existe');
            }

            // Verificar que existen checkpoints para rollback
            if (!controller.config.checkpoints || !Array.isArray(controller.config.checkpoints)) {
                throw new Error('Lista de checkpoints no existe');
            }

            // Verificar historial de rollbacks
            if (!controller.config.rollbacks || !Array.isArray(controller.config.rollbacks)) {
                throw new Error('Historial de rollbacks no existe');
            }

            this.addResult('Sistema de rollback disponible', true);
        } catch (error) {
            this.addResult('Sistema de rollback disponible', false, error.message);
        }
    }

    /**
     * V6: Verificar generación de reporte de estado
     */
    async validateStatusReport() {
        try {
            const { getBrainUpgradeController } = require(path.join(this.brainPath, 'BrainUpgradeController.js'));

            const controller = await getBrainUpgradeController();

            // Verificar getStatus
            const status = controller.getStatus();
            if (!status.currentPhase && status.currentPhase !== 0) {
                throw new Error('getStatus no retorna currentPhase');
            }
            if (!status.phases || !Array.isArray(status.phases)) {
                throw new Error('getStatus no retorna phases');
            }
            if (!status.featureFlags) {
                throw new Error('getStatus no retorna featureFlags');
            }

            // Verificar generateProgressReport
            const report = controller.generateProgressReport();
            if (typeof report !== 'string' || report.length < 100) {
                throw new Error('generateProgressReport no genera reporte válido');
            }

            this.addResult('Generación de reportes funciona', true);
        } catch (error) {
            this.addResult('Generación de reportes funciona', false, error.message);
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
        console.log(`FASE 0 - RESULTADO: ${allPassed ? '✅ PASÓ' : '❌ FALLÓ'}`);
        console.log(`Validaciones: ${passed}/${total} pasaron`);
        console.log('='.repeat(50) + '\n');

        return {
            phase: 0,
            phaseName: 'control-system',
            allPassed,
            passed,
            failed,
            total,
            results: this.results
        };
    }
}

module.exports = { Phase0Validator };
