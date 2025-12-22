/**
 * ============================================================================
 * BRAIN INTEGRATION HUB
 * ============================================================================
 *
 * Hub central que conecta el IntrospectiveBrain con todos los sistemas:
 *
 * 1. PHASE4 TEST ORCHESTRATOR
 *    - Provee test specs desde SmartTestGenerator
 *    - Determina orden de ejecución basado en dependencias
 *    - Detecta módulos afectados cuando algo cambia
 *
 * 2. TUTORIAL SYSTEM (para usuarios)
 *    - Genera tutoriales automáticos desde TutorialGenerator
 *    - Provee assessments y evaluaciones
 *    - Genera onboarding flows personalizados
 *
 * 3. AI ASSISTANT (ayuda contextual)
 *    - Provee información de módulos y dependencias
 *    - Sugiere módulos relacionados
 *    - Responde "¿qué pasa si X falla?" usando whatIfFails()
 *    - Genera tips contextuales para cada módulo
 *
 * USO:
 *   const hub = require('./BrainIntegrationHub');
 *   await hub.initialize();
 *
 *   // Para Phase4
 *   const testConfig = hub.getPhase4TestConfig();
 *
 *   // Para Tutoriales
 *   const tutorial = hub.getTutorialForModule('attendance');
 *
 *   // Para AI Assistant
 *   const context = hub.getAssistantContext('users', 'crear usuario');
 *
 * @version 1.0.0
 * @date 2025-12-17
 * ============================================================================
 */

const path = require('path');
const EventEmitter = require('events');

// Lazy-load Brain components to avoid circular dependencies
let IntrospectiveBrain = null;
let ModuleMigrator = null;
let TutorialGenerator = null;
let SmartTestGenerator = null;
let VisualizationAdapter = null;

class BrainIntegrationHub extends EventEmitter {
    constructor() {
        super();

        this.brain = null;
        this.tutorialGenerator = null;
        this.testGenerator = null;
        this.visualizationAdapter = null;

        this.isInitialized = false;
        this.initializationError = null;

        // Cache para optimizar consultas frecuentes
        this.cache = {
            tutorials: new Map(),
            testSpecs: new Map(),
            assistantContexts: new Map(),
            lastRefresh: null,
            ttl: 5 * 60 * 1000 // 5 minutos
        };
    }

    /**
     * Inicializar el hub con todos los componentes del Brain
     */
    async initialize() {
        if (this.isInitialized) {
            return this;
        }

        console.log('');
        console.log('╔════════════════════════════════════════════════════════════╗');
        console.log('║       🧠 BRAIN INTEGRATION HUB                             ║');
        console.log('╚════════════════════════════════════════════════════════════╝');

        try {
            // Lazy load modules
            const brainPath = path.join(__dirname, '..');

            const { resetBrain } = require(path.join(brainPath, 'core', 'IntrospectiveBrain.js'));
            ModuleMigrator = require(path.join(brainPath, 'core', 'ModuleMigrator.js')).ModuleMigrator;
            TutorialGenerator = require(path.join(brainPath, 'integrations', 'TutorialGenerator.js')).TutorialGenerator;
            SmartTestGenerator = require(path.join(brainPath, 'integrations', 'SmartTestGenerator.js')).SmartTestGenerator;
            VisualizationAdapter = require(path.join(brainPath, 'integrations', 'VisualizationAdapter.js')).VisualizationAdapter;

            // 1. Inicializar Brain
            console.log('\n📦 [1/4] Inicializando IntrospectiveBrain...');
            this.brain = resetBrain();

            // 2. Migrar módulos
            console.log('📦 [2/4] Migrando módulos al Brain...');
            const migrator = new ModuleMigrator();
            const nodes = await migrator.migrateAll();

            for (const node of nodes) {
                this.brain.register(node);
            }
            this.brain.buildRelationGraph();

            console.log(`   ✅ ${nodes.length} nodos registrados`);
            console.log(`   ✅ ${this.brain.exportGraph().edges?.length || 0} relaciones`);

            // 3. Crear generadores
            console.log('📦 [3/4] Inicializando generadores...');
            this.tutorialGenerator = new TutorialGenerator(this.brain);
            this.testGenerator = new SmartTestGenerator(this.brain);
            this.visualizationAdapter = new VisualizationAdapter(this.brain);
            console.log('   ✅ TutorialGenerator');
            console.log('   ✅ SmartTestGenerator');
            console.log('   ✅ VisualizationAdapter');

            // 4. Pre-calentar cache
            console.log('📦 [4/4] Pre-calentando cache...');
            this._warmupCache();

            this.isInitialized = true;
            this.cache.lastRefresh = Date.now();

            console.log('\n✅ Brain Integration Hub inicializado correctamente');
            console.log('═'.repeat(60) + '\n');

            this.emit('initialized', { nodesCount: nodes.length });
            return this;

        } catch (error) {
            this.initializationError = error;
            console.error('❌ Error inicializando Brain Integration Hub:', error.message);
            throw error;
        }
    }

    /**
     * Pre-calentar cache con datos frecuentes
     */
    _warmupCache() {
        try {
            // Cache de cobertura de tests
            const coverage = this.testGenerator.generateCoverageReport();
            this.cache.testSpecs.set('coverage', coverage);

            // Cache de smoke tests
            const smokeTests = this.testGenerator.generateSmokeTests();
            this.cache.testSpecs.set('smoke', smokeTests);

            // Cache de orden de ejecución
            const executionOrder = this.testGenerator.generateTestExecutionOrder();
            this.cache.testSpecs.set('executionOrder', executionOrder);

            console.log('   ✅ Cache pre-calentado');
        } catch (error) {
            console.warn('   ⚠️ Error pre-calentando cache:', error.message);
        }
    }

    // =========================================================================
    // PHASE4 TEST ORCHESTRATOR INTEGRATION
    // =========================================================================

    /**
     * Obtener configuración completa para Phase4TestOrchestrator
     */
    getPhase4TestConfig() {
        this._ensureInitialized();
        return this.testGenerator.exportPhase4Config();
    }

    /**
     * Obtener tests para un módulo específico
     * @param {string} moduleKey
     */
    getTestsForModule(moduleKey) {
        this._ensureInitialized();

        if (this.cache.testSpecs.has(moduleKey)) {
            return this.cache.testSpecs.get(moduleKey);
        }

        const tests = this.testGenerator.generateTestsForModule(moduleKey);
        this.cache.testSpecs.set(moduleKey, tests);
        return tests;
    }

    /**
     * Detectar qué módulos testear cuando uno cambia
     * @param {string} changedModule
     */
    detectAffectedModules(changedModule) {
        this._ensureInitialized();
        return this.testGenerator.detectAffectedTests(changedModule);
    }

    /**
     * Obtener smoke tests para verificación rápida
     */
    getSmokeTests() {
        this._ensureInitialized();
        return this.cache.testSpecs.get('smoke') || this.testGenerator.generateSmokeTests();
    }

    /**
     * Obtener orden de ejecución optimizado
     */
    getTestExecutionOrder() {
        this._ensureInitialized();
        return this.cache.testSpecs.get('executionOrder') || this.testGenerator.generateTestExecutionOrder();
    }

    /**
     * Obtener cobertura de tests
     */
    getTestCoverage() {
        this._ensureInitialized();
        return this.cache.testSpecs.get('coverage') || this.testGenerator.generateCoverageReport();
    }

    // =========================================================================
    // TUTORIAL SYSTEM INTEGRATION (para usuarios)
    // =========================================================================

    /**
     * Obtener tutorial completo para un módulo
     * @param {string} moduleKey
     */
    getTutorialForModule(moduleKey) {
        this._ensureInitialized();

        if (this.cache.tutorials.has(moduleKey)) {
            return this.cache.tutorials.get(moduleKey);
        }

        const tutorial = this.tutorialGenerator.generateModuleTutorial(moduleKey);
        if (!tutorial.error) {
            this.cache.tutorials.set(moduleKey, tutorial);
        }
        return tutorial;
    }

    /**
     * Obtener assessment (evaluación) para un módulo
     * @param {string} moduleKey
     */
    getAssessmentForModule(moduleKey) {
        this._ensureInitialized();
        return this.tutorialGenerator.generateAssessment(moduleKey);
    }

    /**
     * Obtener flujo de onboarding
     * @param {string} role - Rol del usuario (admin, operator, employee)
     */
    getOnboardingFlow(role = 'employee') {
        this._ensureInitialized();
        return this.tutorialGenerator.generateOnboardingFlow(role);
    }

    /**
     * Exportar todos los tutoriales disponibles
     */
    getAllTutorials() {
        this._ensureInitialized();
        return this.tutorialGenerator.exportAllTutorials();
    }

    /**
     * Obtener tips rápidos para un módulo
     * @param {string} moduleKey
     */
    getQuickTips(moduleKey) {
        this._ensureInitialized();

        const tutorial = this.getTutorialForModule(moduleKey);
        if (tutorial.error) {
            return { tips: [], error: tutorial.error };
        }

        // Extraer tips de las secciones
        const tips = [];
        for (const section of tutorial.sections || []) {
            if (section.content?.tips) {
                tips.push(...section.content.tips);
            }
        }

        return {
            moduleKey,
            moduleName: tutorial.title,
            tips: tips.slice(0, 5), // Top 5 tips
            difficulty: tutorial.difficulty,
            estimatedTime: tutorial.estimatedTime
        };
    }

    // =========================================================================
    // AI ASSISTANT INTEGRATION (ayuda contextual)
    // =========================================================================

    /**
     * Obtener contexto completo para el AI Assistant
     * @param {string} moduleKey - Módulo actual del usuario
     * @param {string} userQuestion - Pregunta del usuario (opcional)
     */
    getAssistantContext(moduleKey, userQuestion = null) {
        this._ensureInitialized();

        const cacheKey = `${moduleKey}:${userQuestion || 'general'}`;
        if (this.cache.assistantContexts.has(cacheKey)) {
            const cached = this.cache.assistantContexts.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cache.ttl) {
                return cached.data;
            }
        }

        const node = this.brain.getNode(moduleKey);
        if (!node) {
            return {
                found: false,
                error: `Módulo '${moduleKey}' no encontrado`,
                suggestions: this._suggestSimilarModules(moduleKey)
            };
        }

        // Construir contexto rico
        const context = {
            found: true,
            module: {
                key: node.key,
                name: node.name,
                description: node.description,
                category: node.category,
                version: node.version
            },

            // Dependencias
            dependencies: {
                requires: node.consumes.filter(c => c.required).map(c => c.capability),
                optional: node.consumes.filter(c => !c.required).map(c => c.capability),
                provides: node.provides.map(p => p.capability)
            },

            // Módulos relacionados
            relatedModules: this._getRelatedModules(moduleKey),

            // Tutorial y ayuda
            help: {
                quickStart: node.help?.quickStart || '',
                tips: node.help?.tips || [],
                warnings: node.help?.warnings || [],
                faqs: node.help?.faqs || []
            },

            // Tutorial resumido
            tutorialSummary: this._getTutorialSummary(moduleKey),

            // Análisis de impacto
            impactAnalysis: this._getImpactAnalysis(moduleKey)
        };

        // Si hay pregunta específica, agregar contexto adicional
        if (userQuestion) {
            context.questionContext = this._analyzeQuestion(userQuestion, moduleKey);
        }

        // Cachear
        this.cache.assistantContexts.set(cacheKey, {
            data: context,
            timestamp: Date.now()
        });

        return context;
    }

    /**
     * Responder "¿Qué pasa si X falla?"
     * @param {string} moduleKey
     */
    whatIfFails(moduleKey) {
        this._ensureInitialized();

        const impact = this.brain.whatIfFails(moduleKey);
        const timeline = this.visualizationAdapter.exportImpactTimeline(moduleKey);

        return {
            moduleKey,
            moduleName: this.brain.getNode(moduleKey)?.name || moduleKey,
            ...impact,
            timeline: timeline.timeline || [],
            recommendation: this._generateFailureRecommendation(impact)
        };
    }

    /**
     * Obtener módulos que dependen de uno específico
     * @param {string} moduleKey
     */
    whoNeedsThis(moduleKey) {
        this._ensureInitialized();
        return this.brain.whatDependsFrom(moduleKey);
    }

    /**
     * Obtener de qué depende un módulo
     * @param {string} moduleKey
     */
    whatDoesThisNeed(moduleKey) {
        this._ensureInitialized();
        return this.brain.whatDependsOn(moduleKey);
    }

    /**
     * Buscar módulos por capacidad
     * @param {string} capability - Ej: 'data:users', 'notification:email'
     */
    findModulesWithCapability(capability) {
        this._ensureInitialized();
        return this.brain.whoProvides(capability);
    }

    /**
     * Obtener todos los módulos del sistema
     */
    getAllModules() {
        this._ensureInitialized();
        return this.brain.getAllNodes().map(n => ({
            key: n.key,
            name: n.name,
            description: n.description,
            category: n.category,
            isCore: n.commercial?.is_core || false
        }));
    }

    // =========================================================================
    // VISUALIZATION INTEGRATION
    // =========================================================================

    /**
     * Obtener datos para visualización 3D
     */
    getVisualizationData() {
        this._ensureInitialized();
        return this.visualizationAdapter.exportForEngineeringDashboard();
    }

    /**
     * Obtener grafo de dependencias
     */
    getDependencyGraph() {
        this._ensureInitialized();
        return this.visualizationAdapter.exportForceGraph();
    }

    /**
     * Obtener heat map de criticidad
     */
    getHeatMap() {
        this._ensureInitialized();
        return this.visualizationAdapter.exportHeatMap();
    }

    // =========================================================================
    // HELPERS PRIVADOS
    // =========================================================================

    _ensureInitialized() {
        if (!this.isInitialized) {
            throw new Error('BrainIntegrationHub no está inicializado. Llama a initialize() primero.');
        }
    }

    _suggestSimilarModules(moduleKey) {
        const allNodes = this.brain.getAllNodes();
        const keyLower = moduleKey.toLowerCase();

        return allNodes
            .filter(n => n.key.toLowerCase().includes(keyLower) || keyLower.includes(n.key.toLowerCase()))
            .map(n => n.key)
            .slice(0, 5);
    }

    _getRelatedModules(moduleKey) {
        const dependsOn = this.brain.whatDependsOn(moduleKey) || [];
        const dependsFrom = this.brain.whatDependsFrom(moduleKey) || [];

        return {
            upstream: dependsOn.slice(0, 5).map(d => ({
                key: d.node?.key || d.key,
                relationship: 'depends_on'
            })),
            downstream: dependsFrom.slice(0, 5).map(d => ({
                key: d.node?.key || d.key,
                relationship: 'depends_from'
            }))
        };
    }

    _getTutorialSummary(moduleKey) {
        const tutorial = this.tutorialGenerator.generateModuleTutorial(moduleKey);
        if (tutorial.error) return null;

        return {
            title: tutorial.title,
            difficulty: tutorial.difficulty,
            estimatedTime: tutorial.estimatedTime,
            sectionsCount: tutorial.sections?.length || 0,
            hasAssessment: !!tutorial.assessment
        };
    }

    _getImpactAnalysis(moduleKey) {
        const impact = this.brain.whatIfFails(moduleKey);
        return {
            directlyAffected: impact.directlyAffected?.length || 0,
            indirectlyAffected: impact.indirectlyAffected?.length || 0,
            totalAffected: impact.totalAffected || 0,
            riskLevel: impact.totalAffected > 10 ? 'HIGH' : impact.totalAffected > 5 ? 'MEDIUM' : 'LOW'
        };
    }

    _analyzeQuestion(question, moduleKey) {
        const qLower = question.toLowerCase();

        // Detectar tipo de pregunta
        let questionType = 'general';
        if (qLower.includes('cómo') || qLower.includes('como')) questionType = 'how_to';
        else if (qLower.includes('qué es') || qLower.includes('que es')) questionType = 'definition';
        else if (qLower.includes('por qué') || qLower.includes('porque')) questionType = 'explanation';
        else if (qLower.includes('error') || qLower.includes('falla') || qLower.includes('no funciona')) questionType = 'troubleshooting';
        else if (qLower.includes('depende') || qLower.includes('relaciona')) questionType = 'dependencies';

        return {
            questionType,
            suggestedApproach: this._getSuggestedApproach(questionType, moduleKey)
        };
    }

    _getSuggestedApproach(questionType, moduleKey) {
        switch (questionType) {
            case 'how_to':
                return `Consulta el tutorial de ${moduleKey} para pasos detallados`;
            case 'definition':
                return `${moduleKey} es un módulo del sistema. Revisa su descripción y capacidades.`;
            case 'troubleshooting':
                return `Verifica las dependencias de ${moduleKey} y ejecuta diagnóstico con el Auditor`;
            case 'dependencies':
                return `Usa whatIfFails() o whatDependsOn() para analizar relaciones`;
            default:
                return 'Consulta la documentación del módulo';
        }
    }

    _generateFailureRecommendation(impact) {
        if (impact.totalAffected > 10) {
            return 'CRÍTICO: Este módulo es fundamental. Implementar alta disponibilidad y monitoreo activo.';
        } else if (impact.totalAffected > 5) {
            return 'IMPORTANTE: Varios módulos dependen de este. Asegurar redundancia y alertas.';
        } else if (impact.totalAffected > 0) {
            return 'MODERADO: Algunos módulos serán afectados. Documentar procedimientos de contingencia.';
        }
        return 'BAJO: Impacto limitado. Monitoreo estándar es suficiente.';
    }

    /**
     * Refrescar cache manualmente
     */
    refreshCache() {
        this.cache.tutorials.clear();
        this.cache.testSpecs.clear();
        this.cache.assistantContexts.clear();
        this._warmupCache();
        this.cache.lastRefresh = Date.now();
        console.log('🔄 [BRAIN-HUB] Cache refrescado');
    }

    /**
     * Obtener estadísticas del hub
     */
    getStats() {
        return {
            isInitialized: this.isInitialized,
            nodesCount: this.brain?.getAllNodes()?.length || 0,
            relationsCount: this.brain?.exportGraph()?.edges?.length || 0,
            cacheStats: {
                tutorials: this.cache.tutorials.size,
                testSpecs: this.cache.testSpecs.size,
                assistantContexts: this.cache.assistantContexts.size,
                lastRefresh: this.cache.lastRefresh
            }
        };
    }
}

// Singleton instance
const brainIntegrationHub = new BrainIntegrationHub();

module.exports = brainIntegrationHub;
