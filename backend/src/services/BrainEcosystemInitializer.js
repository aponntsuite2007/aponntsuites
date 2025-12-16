/**
 * ============================================================================
 * BRAIN ECOSYSTEM INITIALIZER
 * ============================================================================
 *
 * Inicializa y conecta todos los componentes del ecosistema Brain:
 * - EcosystemBrainService (Cerebro central)
 * - UniversalWorkflowGenerator (Generador de workflows)
 * - WorkflowFileWatcher (Observador de cambios)
 * - BrainPhase4Integration (Integración con testing)
 * - Phase4TestOrchestrator (Orquestador de tests)
 * - HybridHealer (Auto-reparación)
 *
 * USO:
 * const initializer = require('./BrainEcosystemInitializer');
 * const ecosystem = await initializer.initialize(database);
 *
 * @version 1.0.0
 * @date 2025-12-14
 * ============================================================================
 */

const path = require('path');

class BrainEcosystemInitializer {
    constructor() {
        this.ecosystem = {
            brainService: null,
            workflowGenerator: null,
            fileWatcher: null,
            phase4Integration: null,
            phase4Orchestrator: null,
            hybridHealer: null,
            isInitialized: false
        };
    }

    /**
     * Inicializar todo el ecosistema
     */
    async initialize(database, options = {}) {
        console.log('');
        console.log('═══════════════════════════════════════════════════════════');
        console.log('🧠 BRAIN ECOSYSTEM INITIALIZER');
        console.log('═══════════════════════════════════════════════════════════');

        const startTime = Date.now();

        try {
            // 1. BRAIN SERVICE (ya debería existir, pero creamos si no)
            console.log('');
            console.log('📦 [1/6] Inicializando Brain Service...');
            this.ecosystem.brainService = await this.initBrainService(database);

            // 2. UNIVERSAL WORKFLOW GENERATOR
            console.log('');
            console.log('📦 [2/6] Inicializando Universal Workflow Generator...');
            this.ecosystem.workflowGenerator = await this.initWorkflowGenerator();

            // 3. WORKFLOW FILE WATCHER
            console.log('');
            console.log('📦 [3/6] Inicializando Workflow File Watcher...');
            this.ecosystem.fileWatcher = await this.initFileWatcher(options);

            // 4. PHASE4 TEST ORCHESTRATOR
            console.log('');
            console.log('📦 [4/6] Inicializando Phase4 Test Orchestrator...');
            this.ecosystem.phase4Orchestrator = await this.initPhase4Orchestrator(database);

            // 5. HYBRID HEALER
            console.log('');
            console.log('📦 [5/6] Inicializando Hybrid Healer...');
            this.ecosystem.hybridHealer = await this.initHybridHealer();

            // 6. BRAIN PHASE4 INTEGRATION (conecta todo)
            console.log('');
            console.log('📦 [6/6] Inicializando Brain-Phase4 Integration...');
            this.ecosystem.phase4Integration = await this.initPhase4Integration(database);

            // Marcar como inicializado
            this.ecosystem.isInitialized = true;

            const duration = Date.now() - startTime;
            console.log('');
            console.log('═══════════════════════════════════════════════════════════');
            console.log(`✅ BRAIN ECOSYSTEM INICIALIZADO (${duration}ms)`);
            console.log('═══════════════════════════════════════════════════════════');
            console.log('');
            console.log('Componentes activos:');
            console.log(`   🧠 Brain Service: ${this.ecosystem.brainService ? '✅' : '❌'}`);
            console.log(`   📝 Workflow Generator: ${this.ecosystem.workflowGenerator ? '✅' : '❌'}`);
            console.log(`   👁️ File Watcher: ${this.ecosystem.fileWatcher ? '✅' : '❌'}`);
            console.log(`   🧪 Phase4 Orchestrator: ${this.ecosystem.phase4Orchestrator ? '✅' : '❌'}`);
            console.log(`   🔧 Hybrid Healer: ${this.ecosystem.hybridHealer ? '✅' : '❌'}`);
            console.log(`   🔗 Phase4 Integration: ${this.ecosystem.phase4Integration ? '✅' : '❌'}`);
            console.log('');

            return this.ecosystem;

        } catch (error) {
            console.error('');
            console.error('❌ ERROR INICIALIZANDO BRAIN ECOSYSTEM:', error.message);
            console.error('');
            throw error;
        }
    }

    /**
     * Inicializar Brain Service
     */
    async initBrainService(database) {
        try {
            const EcosystemBrainService = require('./EcosystemBrainService');
            const brainService = new EcosystemBrainService(database);
            console.log('   ✅ Brain Service listo');
            return brainService;
        } catch (error) {
            console.log(`   ⚠️ Brain Service no disponible: ${error.message}`);
            return null;
        }
    }

    /**
     * Inicializar Universal Workflow Generator
     */
    async initWorkflowGenerator() {
        try {
            const UniversalWorkflowGenerator = require('./UniversalWorkflowGenerator');
            const generator = new UniversalWorkflowGenerator();

            // Regenerar workflows al inicio (opcional)
            const result = await generator.regenerateChangedWorkflows();
            if (result.regenerated?.length > 0) {
                console.log(`   🔄 Workflows regenerados: ${result.regenerated.join(', ')}`);
            }

            console.log(`   ✅ Workflow Generator listo (${generator.getConfiguredModules().length} módulos)`);
            return generator;
        } catch (error) {
            console.log(`   ⚠️ Workflow Generator no disponible: ${error.message}`);
            return null;
        }
    }

    /**
     * Inicializar File Watcher
     */
    async initFileWatcher(options = {}) {
        try {
            const WorkflowFileWatcher = require('./WorkflowFileWatcher');
            const watcher = new WorkflowFileWatcher({
                servicesDir: path.join(__dirname),
                watchInterval: options.watchInterval || 5000,
                debounceTime: options.debounceTime || 1000
            });

            // Conectar con otros servicios
            watcher.setServices({
                workflowGenerator: this.ecosystem.workflowGenerator,
                brainService: this.ecosystem.brainService
            });

            // Iniciar monitoreo solo en desarrollo
            if (process.env.NODE_ENV !== 'production' && options.startWatching !== false) {
                watcher.start();
                console.log('   ✅ File Watcher activo (monitoreo iniciado)');
            } else {
                console.log('   ✅ File Watcher listo (monitoreo no iniciado)');
            }

            return watcher;
        } catch (error) {
            console.log(`   ⚠️ File Watcher no disponible: ${error.message}`);
            return null;
        }
    }

    /**
     * Inicializar Phase4 Test Orchestrator
     */
    async initPhase4Orchestrator(database) {
        try {
            const Phase4TestOrchestrator = require('../auditor/core/Phase4TestOrchestrator');

            // Phase4 puede necesitar diferentes parámetros según su implementación
            const orchestrator = new Phase4TestOrchestrator({
                database,
                headless: true,
                timeout: 30000
            });

            console.log('   ✅ Phase4 Orchestrator listo');
            return orchestrator;
        } catch (error) {
            console.log(`   ⚠️ Phase4 Orchestrator no disponible: ${error.message}`);
            return null;
        }
    }

    /**
     * Inicializar Hybrid Healer
     */
    async initHybridHealer() {
        try {
            const HybridHealer = require('../auditor/healers/HybridHealer');
            const healer = new HybridHealer();
            console.log('   ✅ Hybrid Healer listo');
            return healer;
        } catch (error) {
            console.log(`   ⚠️ Hybrid Healer no disponible: ${error.message}`);
            return null;
        }
    }

    /**
     * Inicializar Brain-Phase4 Integration
     */
    async initPhase4Integration(database) {
        try {
            const BrainPhase4Integration = require('./BrainPhase4Integration');
            const integration = new BrainPhase4Integration();

            // Inicializar con todos los servicios
            await integration.initialize({
                brainService: this.ecosystem.brainService,
                phase4Orchestrator: this.ecosystem.phase4Orchestrator,
                workflowGenerator: this.ecosystem.workflowGenerator,
                fileWatcher: this.ecosystem.fileWatcher,
                hybridHealer: this.ecosystem.hybridHealer,
                sequelize: database?.sequelize
            });

            console.log('   ✅ Brain-Phase4 Integration listo');
            return integration;
        } catch (error) {
            console.log(`   ⚠️ Brain-Phase4 Integration no disponible: ${error.message}`);
            return null;
        }
    }

    /**
     * Obtener el ecosistema inicializado
     */
    getEcosystem() {
        return this.ecosystem;
    }

    /**
     * Verificar estado del ecosistema
     */
    getStatus() {
        return {
            isInitialized: this.ecosystem.isInitialized,
            components: {
                brainService: !!this.ecosystem.brainService,
                workflowGenerator: !!this.ecosystem.workflowGenerator,
                fileWatcher: !!this.ecosystem.fileWatcher,
                phase4Orchestrator: !!this.ecosystem.phase4Orchestrator,
                hybridHealer: !!this.ecosystem.hybridHealer,
                phase4Integration: !!this.ecosystem.phase4Integration
            },
            fileWatcher: this.ecosystem.fileWatcher?.getStatus(),
            integration: this.ecosystem.phase4Integration?.getStatus()
        };
    }

    /**
     * Ejecutar test inteligente de un módulo
     */
    async runSmartTest(moduleKey, reason = 'manual') {
        if (!this.ecosystem.phase4Integration) {
            throw new Error('Phase4 Integration not initialized');
        }
        return await this.ecosystem.phase4Integration.queueSmartTest(moduleKey, reason);
    }

    /**
     * Ejecutar test completo del sistema
     */
    async runFullSystemTest() {
        if (!this.ecosystem.phase4Integration) {
            throw new Error('Phase4 Integration not initialized');
        }
        return await this.ecosystem.phase4Integration.runFullSystemTest();
    }

    /**
     * Regenerar todos los workflows
     */
    async regenerateAllWorkflows() {
        if (!this.ecosystem.workflowGenerator) {
            throw new Error('Workflow Generator not initialized');
        }
        return await this.ecosystem.workflowGenerator.regenerateAllWorkflows();
    }

    /**
     * Obtener tutorial de un módulo
     */
    getTutorial(moduleKey) {
        if (!this.ecosystem.brainService) {
            return null;
        }
        return this.ecosystem.brainService.getTutorial(moduleKey);
    }

    /**
     * Obtener todos los tutoriales
     */
    getAllTutorials() {
        if (!this.ecosystem.brainService) {
            return [];
        }
        return this.ecosystem.brainService.getAllTutorials();
    }

    /**
     * Detener todos los servicios
     */
    async shutdown() {
        console.log('🛑 [BRAIN ECOSYSTEM] Deteniendo servicios...');

        if (this.ecosystem.fileWatcher) {
            this.ecosystem.fileWatcher.stop();
        }

        this.ecosystem.isInitialized = false;
        console.log('✅ [BRAIN ECOSYSTEM] Servicios detenidos');
    }
}

// Singleton para uso global
let instance = null;

module.exports = {
    /**
     * Obtener instancia del inicializador
     */
    getInstance() {
        if (!instance) {
            instance = new BrainEcosystemInitializer();
        }
        return instance;
    },

    /**
     * Inicializar ecosistema
     */
    async initialize(database, options = {}) {
        const initializer = this.getInstance();
        return await initializer.initialize(database, options);
    },

    /**
     * Obtener ecosistema (después de inicializar)
     */
    getEcosystem() {
        if (!instance) {
            throw new Error('Brain Ecosystem not initialized. Call initialize() first.');
        }
        return instance.getEcosystem();
    },

    /**
     * Obtener estado
     */
    getStatus() {
        if (!instance) {
            return { isInitialized: false };
        }
        return instance.getStatus();
    },

    /**
     * Shortcuts para operaciones comunes
     */
    async runSmartTest(moduleKey, reason) {
        return await this.getInstance().runSmartTest(moduleKey, reason);
    },

    async runFullSystemTest() {
        return await this.getInstance().runFullSystemTest();
    },

    async regenerateAllWorkflows() {
        return await this.getInstance().regenerateAllWorkflows();
    },

    getTutorial(moduleKey) {
        return this.getInstance().getTutorial(moduleKey);
    },

    getAllTutorials() {
        return this.getInstance().getAllTutorials();
    },

    async shutdown() {
        if (instance) {
            await instance.shutdown();
        }
    }
};
