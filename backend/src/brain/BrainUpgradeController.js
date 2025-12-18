/**
 * ============================================================================
 * BRAIN UPGRADE CONTROLLER
 * ============================================================================
 *
 * Sistema de control de cambios para la migración al nuevo Brain Introspectivo.
 *
 * PRINCIPIOS:
 * 1. NO DESTRUCTIVO - El sistema actual sigue funcionando
 * 2. PARALELO - Nuevo sistema convive con el viejo
 * 3. CHECKPOINTS - Cada fase se valida antes de avanzar
 * 4. ROLLBACK - Si algo falla, se revierte automáticamente
 * 5. FEATURE FLAGS - Activación gradual de funcionalidades
 *
 * Created: 2025-12-17
 */

const fs = require('fs').promises;
const path = require('path');

class BrainUpgradeController {
    constructor() {
        this.configPath = path.join(__dirname, 'upgrade-config.json');
        this.checkpointsPath = path.join(__dirname, 'checkpoints');
        this.config = null;
        this.phases = [
            { id: 0, name: 'control-system', description: 'Sistema de control de cambios' },
            { id: 1, name: 'schema-vocabulary', description: 'Schema UniversalNode + Vocabulario' },
            { id: 2, name: 'introspective-brain', description: 'IntrospectiveBrain Core' },
            { id: 3, name: 'migration', description: 'Migración gradual de módulos' },
            { id: 4, name: 'api-routes', description: 'API Routes v2' },
            { id: 5, name: 'phase4-integration', description: 'Integración Phase4TestOrchestrator' },
            { id: 6, name: 'tutorial-generator', description: 'Generador de Tutoriales' },
            { id: 7, name: 'visualization', description: 'Visualización 3D dinámica' }
        ];
    }

    /**
     * Inicializar el controlador
     */
    async init() {
        try {
            // Crear directorio de checkpoints si no existe
            await fs.mkdir(this.checkpointsPath, { recursive: true });

            // Cargar o crear configuración
            try {
                const data = await fs.readFile(this.configPath, 'utf8');
                this.config = JSON.parse(data);
            } catch (e) {
                this.config = this.getDefaultConfig();
                await this.saveConfig();
            }

            console.log('🧠 [BRAIN-UPGRADE] Controller initialized');
            console.log(`   Current phase: ${this.config.currentPhase}`);
            console.log(`   Feature flags: ${JSON.stringify(this.config.featureFlags)}`);

            return true;
        } catch (error) {
            console.error('❌ [BRAIN-UPGRADE] Init failed:', error);
            return false;
        }
    }

    /**
     * Configuración por defecto
     */
    getDefaultConfig() {
        return {
            version: '1.0.0',
            currentPhase: 0,
            startedAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),

            // Feature flags - todo desactivado inicialmente
            featureFlags: {
                useNewSchema: false,           // Usar UniversalNode schema
                useIntrospectiveBrain: false,  // Usar nuevo Brain
                useNewApiRoutes: false,        // Usar /api/brain/v2/*
                useSmartTesting: false,        // Testing inteligente en Phase4
                useAutoTutorials: false,       // Generación automática de tutoriales
                useNewVisualization: false     // Nueva visualización 3D
            },

            // Estado de cada fase
            phases: {
                0: { status: 'in_progress', startedAt: new Date().toISOString() },
                1: { status: 'pending' },
                2: { status: 'pending' },
                3: { status: 'pending' },
                4: { status: 'pending' },
                5: { status: 'pending' },
                6: { status: 'pending' },
                7: { status: 'pending' }
            },

            // Checkpoints de validación
            checkpoints: [],

            // Rollback history
            rollbacks: []
        };
    }

    /**
     * Guardar configuración
     */
    async saveConfig() {
        this.config.lastUpdated = new Date().toISOString();
        await fs.writeFile(this.configPath, JSON.stringify(this.config, null, 2));
    }

    /**
     * Verificar si una feature está activa
     */
    isFeatureEnabled(featureName) {
        return this.config?.featureFlags?.[featureName] === true;
    }

    /**
     * Activar una feature flag
     */
    async enableFeature(featureName, force = false) {
        if (!this.config.featureFlags.hasOwnProperty(featureName)) {
            throw new Error(`Feature flag '${featureName}' no existe`);
        }

        // Verificar que la fase correspondiente esté completada
        const featureToPhase = {
            useNewSchema: 1,
            useIntrospectiveBrain: 2,
            useNewApiRoutes: 4,
            useSmartTesting: 5,
            useAutoTutorials: 6,
            useNewVisualization: 7
        };

        const requiredPhase = featureToPhase[featureName];
        if (requiredPhase && this.config.phases[requiredPhase]?.status !== 'completed' && !force) {
            throw new Error(`Fase ${requiredPhase} debe completarse antes de activar '${featureName}'`);
        }

        this.config.featureFlags[featureName] = true;
        await this.saveConfig();

        console.log(`✅ [BRAIN-UPGRADE] Feature '${featureName}' ACTIVADA`);
        return true;
    }

    /**
     * Desactivar una feature flag (rollback parcial)
     */
    async disableFeature(featureName) {
        if (this.config.featureFlags.hasOwnProperty(featureName)) {
            this.config.featureFlags[featureName] = false;
            await this.saveConfig();
            console.log(`⚠️ [BRAIN-UPGRADE] Feature '${featureName}' DESACTIVADA`);
        }
        return true;
    }

    /**
     * Crear checkpoint antes de cambios importantes
     */
    async createCheckpoint(phaseId, description, data = {}) {
        const checkpoint = {
            id: `CP-${phaseId}-${Date.now()}`,
            phaseId,
            description,
            createdAt: new Date().toISOString(),
            configSnapshot: JSON.parse(JSON.stringify(this.config)),
            data
        };

        // Guardar checkpoint a archivo
        const checkpointFile = path.join(this.checkpointsPath, `${checkpoint.id}.json`);
        await fs.writeFile(checkpointFile, JSON.stringify(checkpoint, null, 2));

        // Registrar en config
        this.config.checkpoints.push({
            id: checkpoint.id,
            phaseId,
            description,
            createdAt: checkpoint.createdAt
        });
        await this.saveConfig();

        console.log(`📍 [BRAIN-UPGRADE] Checkpoint creado: ${checkpoint.id}`);
        return checkpoint.id;
    }

    /**
     * Rollback a un checkpoint específico
     */
    async rollbackToCheckpoint(checkpointId) {
        const checkpointFile = path.join(this.checkpointsPath, `${checkpointId}.json`);

        try {
            const data = await fs.readFile(checkpointFile, 'utf8');
            const checkpoint = JSON.parse(data);

            // Guardar estado actual antes de rollback
            this.config.rollbacks.push({
                from: this.config.currentPhase,
                to: checkpoint.phaseId,
                checkpointId,
                rolledBackAt: new Date().toISOString(),
                previousConfig: JSON.parse(JSON.stringify(this.config))
            });

            // Restaurar configuración del checkpoint
            this.config = checkpoint.configSnapshot;
            await this.saveConfig();

            console.log(`🔄 [BRAIN-UPGRADE] Rollback a checkpoint ${checkpointId} completado`);
            return true;
        } catch (error) {
            console.error(`❌ [BRAIN-UPGRADE] Rollback failed:`, error);
            return false;
        }
    }

    /**
     * Iniciar una fase
     */
    async startPhase(phaseId) {
        const phase = this.phases.find(p => p.id === phaseId);
        if (!phase) {
            throw new Error(`Fase ${phaseId} no existe`);
        }

        // Verificar que fases anteriores estén completadas
        for (let i = 0; i < phaseId; i++) {
            if (this.config.phases[i]?.status !== 'completed') {
                throw new Error(`Fase ${i} debe completarse antes de iniciar fase ${phaseId}`);
            }
        }

        // Crear checkpoint automático
        await this.createCheckpoint(phaseId, `Inicio de fase ${phaseId}: ${phase.name}`);

        this.config.phases[phaseId] = {
            status: 'in_progress',
            startedAt: new Date().toISOString()
        };
        this.config.currentPhase = phaseId;
        await this.saveConfig();

        console.log(`🚀 [BRAIN-UPGRADE] Fase ${phaseId} iniciada: ${phase.name}`);
        return true;
    }

    /**
     * Ejecutar validaciones de una fase
     */
    async validatePhase(phaseId, validationResults) {
        const allPassed = validationResults.every(v => v.passed);

        this.config.phases[phaseId].validations = validationResults;
        this.config.phases[phaseId].validatedAt = new Date().toISOString();
        this.config.phases[phaseId].validationPassed = allPassed;
        await this.saveConfig();

        if (allPassed) {
            console.log(`✅ [BRAIN-UPGRADE] Fase ${phaseId} validaciones PASARON`);
        } else {
            console.log(`❌ [BRAIN-UPGRADE] Fase ${phaseId} validaciones FALLARON`);
            validationResults.filter(v => !v.passed).forEach(v => {
                console.log(`   - ${v.name}: ${v.error}`);
            });
        }

        return allPassed;
    }

    /**
     * Completar una fase
     */
    async completePhase(phaseId) {
        // Verificar que las validaciones pasaron
        if (!this.config.phases[phaseId]?.validationPassed) {
            throw new Error(`Fase ${phaseId} no ha pasado las validaciones`);
        }

        this.config.phases[phaseId].status = 'completed';
        this.config.phases[phaseId].completedAt = new Date().toISOString();
        await this.saveConfig();

        const phase = this.phases.find(p => p.id === phaseId);
        console.log(`🎉 [BRAIN-UPGRADE] Fase ${phaseId} COMPLETADA: ${phase.name}`);

        return true;
    }

    /**
     * Obtener estado actual del upgrade
     */
    getStatus() {
        return {
            currentPhase: this.config.currentPhase,
            phases: this.phases.map(p => ({
                ...p,
                ...this.config.phases[p.id]
            })),
            featureFlags: this.config.featureFlags,
            checkpointsCount: this.config.checkpoints.length,
            rollbacksCount: this.config.rollbacks.length,
            lastUpdated: this.config.lastUpdated
        };
    }

    /**
     * Generar reporte de progreso
     */
    generateProgressReport() {
        const completed = Object.values(this.config.phases).filter(p => p.status === 'completed').length;
        const total = this.phases.length;
        const percentage = Math.round((completed / total) * 100);

        let report = `
╔════════════════════════════════════════════════════════════════╗
║           BRAIN INTROSPECTIVE UPGRADE - PROGRESS               ║
╠════════════════════════════════════════════════════════════════╣
║  Progress: [${'█'.repeat(Math.floor(percentage/5))}${'░'.repeat(20-Math.floor(percentage/5))}] ${percentage}%
║  Completed: ${completed}/${total} phases
║  Current Phase: ${this.config.currentPhase}
╠════════════════════════════════════════════════════════════════╣
║  PHASES:                                                       ║
`;

        this.phases.forEach(phase => {
            const status = this.config.phases[phase.id]?.status || 'pending';
            const icon = status === 'completed' ? '✅' : status === 'in_progress' ? '🔄' : '⏳';
            report += `║  ${icon} Phase ${phase.id}: ${phase.name.padEnd(40)}${status.padEnd(12)}║\n`;
        });

        report += `╠════════════════════════════════════════════════════════════════╣
║  FEATURE FLAGS:                                                ║
`;

        Object.entries(this.config.featureFlags).forEach(([flag, enabled]) => {
            const icon = enabled ? '🟢' : '⚪';
            report += `║  ${icon} ${flag.padEnd(35)}${enabled ? 'ENABLED' : 'DISABLED'}       ║\n`;
        });

        report += `╠════════════════════════════════════════════════════════════════╣
║  Checkpoints: ${String(this.config.checkpoints.length).padEnd(3)} | Rollbacks: ${String(this.config.rollbacks.length).padEnd(3)}                        ║
║  Last Updated: ${this.config.lastUpdated.substring(0, 19).padEnd(30)}       ║
╚════════════════════════════════════════════════════════════════╝`;

        return report;
    }
}

// Singleton instance
let instance = null;

const getBrainUpgradeController = async () => {
    if (!instance) {
        instance = new BrainUpgradeController();
        await instance.init();
    }
    return instance;
};

module.exports = {
    BrainUpgradeController,
    getBrainUpgradeController
};
