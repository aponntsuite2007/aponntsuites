/**
 * ============================================================================
 * BRAIN ORCHESTRATOR - Cerebro Central del Sistema Autónomo
 * ============================================================================
 *
 * Orquesta todos los agentes IA y servicios del sistema:
 * - Support AI: Soporte 24/7
 * - Trainer AI: Capacitación automática
 * - Tester AI: Testing continuo
 * - Evaluator AI: Evaluación de usuarios
 * - Sales AI: Demos y ventas
 *
 * También coordina:
 * - Knowledge Database: Base de conocimiento central
 * - Flow Recorder: Grabación de flujos
 * - UI Crawler: Descubrimiento de UI
 *
 * @version 1.0.0
 * @date 2025-12-20
 * ============================================================================
 */

const { getInstance: getKnowledgeDB } = require('./services/KnowledgeDatabase');
const { getInstance: getSupportAI } = require('./agents/SupportAIAgent');
const { getInstance: getTrainerAI } = require('./agents/TrainerAIAgent');
const { getInstance: getTesterAI } = require('./agents/TesterAIAgent');
const { getInstance: getEvaluatorAI } = require('./agents/EvaluatorAIAgent');
const { getInstance: getSalesAI } = require('./agents/SalesAIAgent');
const { getInstance: getTourService } = require('./services/TourService');
const { getInstance: getNLUService } = require('./services/NLUService');
const FlowRecorder = require('./crawlers/FlowRecorder');
const StaticHTMLAnalyzer = require('./crawlers/StaticHTMLAnalyzer');

// NUEVO: Integración con Sistema Nervioso y Ecosystem Brain
const brainNervousSystem = require('./services/BrainNervousSystem');
const EcosystemBrainService = require('../services/EcosystemBrainService');
const MetadataWriter = require('./services/MetadataWriter');

class BrainOrchestrator {
    constructor() {
        this.agents = {};
        this.services = {};
        this.status = 'initializing';
        this.startedAt = null;

        this.stats = {
            uptime: 0,
            totalRequests: 0,
            requestsByAgent: {},
            errors: 0
        };
    }

    /**
     * ========================================================================
     * INICIALIZACIÓN
     * ========================================================================
     */

    /**
     * Inicializar todo el sistema
     */
    async initialize() {
        console.log('\n' + '═'.repeat(70));
        console.log('🧠 BRAIN ORCHESTRATOR - Inicializando Sistema Autónomo');
        console.log('═'.repeat(70));
        console.log(`   📅 ${new Date().toISOString()}`);
        console.log('');

        const startTime = Date.now();

        try {
            // 1. Inicializar servicios core
            console.log('📦 Inicializando servicios core...');
            this.services.knowledgeDB = await getKnowledgeDB();
            this.services.flowRecorder = new FlowRecorder();
            this.services.htmlAnalyzer = new StaticHTMLAnalyzer();
            this.services.tours = getTourService();
            this.services.nlu = getNLUService();
            console.log('   ✅ Servicios core listos');
            console.log(`   📚 Tours disponibles: ${this.services.tours.listTours().length}`);

            // 1.5 Inicializar Sistema Nervioso y Ecosystem Brain
            console.log('\n🧠 Inicializando Brain completo...');

            // Inicializar Sistema Nervioso (monitoreo en tiempo real)
            this.services.nervousSystem = brainNervousSystem;
            await this.services.nervousSystem.start();
            this.setupNervousSystemListeners();
            console.log('   ✅ Sistema Nervioso activo');

            // Inicializar Ecosystem Brain (escaneo de código)
            const db = require('../config/database');
            this.services.ecosystemBrain = new EcosystemBrainService(db);
            console.log('   ✅ Ecosystem Brain inicializado');

            // Inicializar MetadataWriter (auto-actualización de metadata)
            this.services.metadataWriter = new MetadataWriter(this.services.ecosystemBrain);
            this.services.metadataWriter.start();
            console.log('   ✅ MetadataWriter activo (auto-update cada 5 min)');

            // 2. Inicializar agentes IA
            console.log('\n🤖 Inicializando agentes IA...');

            console.log('   • Support AI...');
            this.agents.support = await getSupportAI();
            console.log('   ✅ Support AI listo');

            console.log('   • Trainer AI...');
            this.agents.trainer = await getTrainerAI();
            console.log('   ✅ Trainer AI listo');

            console.log('   • Tester AI...');
            this.agents.tester = await getTesterAI();
            console.log('   ✅ Tester AI listo');

            console.log('   • Evaluator AI...');
            this.agents.evaluator = await getEvaluatorAI();
            console.log('   ✅ Evaluator AI listo');

            console.log('   • Sales AI...');
            this.agents.sales = await getSalesAI();
            console.log('   ✅ Sales AI listo');

            // 3. Ejecutar discovery inicial
            console.log('\n🔍 Ejecutando discovery inicial...');
            await this.runInitialDiscovery();

            this.status = 'running';
            this.startedAt = new Date();

            const initTime = Date.now() - startTime;

            console.log('\n' + '═'.repeat(70));
            console.log('✅ BRAIN ORCHESTRATOR - Sistema Autónomo ACTIVO');
            console.log('═'.repeat(70));
            console.log(`   ⏱️ Tiempo de inicialización: ${initTime}ms`);
            console.log(`   🤖 Agentes activos: ${Object.keys(this.agents).length}`);
            console.log(`   📦 Servicios activos: ${Object.keys(this.services).length}`);
            console.log('');

            return this;

        } catch (error) {
            this.status = 'error';
            console.error('\n❌ Error inicializando Brain Orchestrator:', error.message);
            throw error;
        }
    }

    /**
     * Ejecutar discovery inicial de UI
     */
    async runInitialDiscovery() {
        try {
            // Análisis estático de HTML
            const uiDiscovery = await this.services.htmlAnalyzer.analyzeAll();
            console.log(`   📊 UI Discovery: ${uiDiscovery.stats?.totalButtons || 0} botones, ${uiDiscovery.stats?.totalInputs || 0} inputs`);

            // Generar flujos
            const flows = await this.services.flowRecorder.generateAllFlows();
            console.log(`   📋 Flows generados: ${flows.flowCount}`);

            // Refrescar knowledge DB
            await this.services.knowledgeDB.refresh();
            console.log('   📚 Knowledge DB actualizada');

        } catch (error) {
            console.log(`   ⚠️ Discovery parcial: ${error.message}`);
        }
    }

    /**
     * Configurar listeners del Sistema Nervioso
     */
    setupNervousSystemListeners() {
        // Escuchar eventos de error del sistema nervioso
        this.services.nervousSystem.on('error:detected', (errorData) => {
            console.log(`\n🔔 [BRAIN] Error detectado por Sistema Nervioso: ${errorData.type}`);

            // Broadcast a todos los agentes
            this.broadcastEvent({
                type: 'system:error',
                severity: errorData.severity,
                module: errorData.module,
                message: errorData.message,
                stack: errorData.stack,
                timestamp: new Date()
            });

            // Si es crítico, notificar al Tester AI para ejecutar tests
            if (errorData.severity === 'critical' && this.agents.tester) {
                this.agents.tester.handleEvent({
                    type: 'system:error:critical',
                    module: errorData.module
                });
            }
        });

        // Escuchar cambios de archivos
        this.services.nervousSystem.on('file:changed', (fileData) => {
            console.log(`📝 [BRAIN] Archivo modificado: ${fileData.path}`);

            // Invalidar caché del Ecosystem Brain
            if (this.services.ecosystemBrain) {
                this.services.ecosystemBrain.clearCache();
            }

            // Si MetadataWriter está activo, trigger actualización inmediata
            if (this.services.metadataWriter) {
                this.services.metadataWriter.scheduleUpdate();
            }
        });

        console.log('   🔗 Listeners del Sistema Nervioso configurados');
    }

    /**
     * ========================================================================
     * API DE AGENTES
     * ========================================================================
     */

    /**
     * Procesar pregunta de soporte
     */
    async handleSupportQuestion(question, context = {}) {
        this.recordRequest('support');
        return await this.agents.support.handleQuestion(question, context);
    }

    /**
     * Iniciar onboarding de usuario
     */
    async startUserOnboarding(userId, userRole, userName) {
        this.recordRequest('trainer');
        return await this.agents.trainer.startOnboarding(userId, userRole, userName);
    }

    /**
     * Obtener siguiente tutorial
     */
    getNextTutorial(userId) {
        this.recordRequest('trainer');
        return this.agents.trainer.getNextTutorial(userId);
    }

    /**
     * Completar tutorial
     */
    async completeTutorial(userId, tutorialId, score) {
        this.recordRequest('trainer');
        return await this.agents.trainer.completeTutorial(userId, tutorialId, score);
    }

    /**
     * Ejecutar tests
     */
    async runTests(options = {}) {
        this.recordRequest('tester');

        if (options.module) {
            return await this.agents.tester.runFlowTest(options.module);
        }

        return await this.agents.tester.runAllTests();
    }

    /**
     * Evaluar usuario
     */
    async evaluateUser(userId, options = {}) {
        this.recordRequest('evaluator');
        return await this.agents.evaluator.evaluateUser(userId, options);
    }

    /**
     * Evaluar departamento
     */
    async evaluateDepartment(departmentId, userIds) {
        this.recordRequest('evaluator');
        return await this.agents.evaluator.evaluateDepartment(departmentId, userIds);
    }

    /**
     * Iniciar demo de ventas
     */
    async startSalesDemo(leadInfo) {
        this.recordRequest('sales');
        return await this.agents.sales.startDemo(leadInfo);
    }

    /**
     * Avanzar demo
     */
    async advanceDemo(sessionId) {
        this.recordRequest('sales');
        return await this.agents.sales.advanceDemo(sessionId);
    }

    /**
     * Manejar objeción de ventas
     */
    handleObjection(objectionText, sessionId) {
        this.recordRequest('sales');
        return this.agents.sales.handleObjection(objectionText, sessionId);
    }

    /**
     * Generar propuesta comercial
     */
    async generateProposal(leadId, options = {}) {
        this.recordRequest('sales');
        return await this.agents.sales.generateProposal(leadId, options);
    }

    /**
     * Calcular pricing
     */
    calculatePricing(employeeCount, modules, options) {
        this.recordRequest('sales');
        return this.agents.sales.calculatePricing(employeeCount, modules, options);
    }

    /**
     * Calcular ROI
     */
    calculateROI(companyInfo) {
        this.recordRequest('sales');
        return this.agents.sales.calculateROI(companyInfo);
    }

    /**
     * ========================================================================
     * TOURS INTERACTIVOS
     * ========================================================================
     */

    /**
     * Listar tours disponibles
     */
    listTours() {
        this.recordRequest('tours');
        return this.services.tours.listTours();
    }

    /**
     * Obtener tours de un módulo
     */
    getToursByModule(module) {
        this.recordRequest('tours');
        return this.services.tours.getToursByModule(module);
    }

    /**
     * Iniciar tour para usuario
     */
    startTour(userId, tourId) {
        this.recordRequest('tours');
        console.log(`\n🎬 [BRAIN] Usuario ${userId} iniciando tour: ${tourId}`);
        return this.services.tours.startTour(userId, tourId);
    }

    /**
     * Avanzar paso en tour
     */
    advanceTourStep(userId) {
        this.recordRequest('tours');
        return this.services.tours.advanceStep(userId);
    }

    /**
     * Retroceder paso en tour
     */
    goBackTourStep(userId) {
        this.recordRequest('tours');
        return this.services.tours.goBack(userId);
    }

    /**
     * Pausar tour
     */
    pauseTour(userId) {
        this.recordRequest('tours');
        return this.services.tours.pauseTour(userId);
    }

    /**
     * Reanudar tour
     */
    resumeTour(userId) {
        this.recordRequest('tours');
        return this.services.tours.resumeTour(userId);
    }

    /**
     * Obtener progreso del tour
     */
    getTourProgress(userId) {
        return this.services.tours.getProgress(userId);
    }

    /**
     * Manejar pregunta durante tour (integración Support AI + Tour)
     */
    async handleTourQuestion(userId, question, tourContext = {}) {
        this.recordRequest('tours');
        this.recordRequest('support');

        // Agregar contexto del tour a la pregunta
        const enrichedContext = {
            ...tourContext,
            isTourMode: true,
            currentTourStep: tourContext.stepIndex,
            tourModule: tourContext.module
        };

        // Procesar pregunta con Support AI
        const answer = await this.agents.support.handleQuestion(question, enrichedContext);

        // Registrar pregunta en el tour
        this.services.tours.recordQuestion(userId, question, answer?.answer);

        return {
            answer: answer,
            tourProgress: this.services.tours.getProgress(userId)
        };
    }

    /**
     * Procesar NLU para detección de intenciones de tour
     */
    processNLU(text, context = {}) {
        return this.services.nlu.process(text, context);
    }

    /**
     * Detectar si usuario quiere iniciar un tour
     */
    detectTourIntent(text) {
        const tourPatterns = [
            /^(muéstrame|enséñame|dame)\s+(un\s+)?tour/i,
            /^(cómo|como)\s+(funciona|uso|usar)/i,
            /^(quiero|necesito)\s+(aprender|ver)/i,
            /^tour\s+(de|del|para)/i,
            /^(guíame|guiame)/i
        ];

        for (const pattern of tourPatterns) {
            if (pattern.test(text)) {
                // Detectar módulo mencionado
                const modulePatterns = {
                    users: /usuario|empleado|personal/i,
                    attendance: /asistencia|marcación|marcaciones/i,
                    dashboard: /dashboard|panel|inicio/i,
                    shifts: /turno|horario/i,
                    vacation: /vacacion|permiso|licencia/i
                };

                for (const [module, modulePattern] of Object.entries(modulePatterns)) {
                    if (modulePattern.test(text)) {
                        return { wantsTour: true, module };
                    }
                }

                return { wantsTour: true, module: 'general' };
            }
        }

        return { wantsTour: false };
    }

    /**
     * ========================================================================
     * INTER-AGENT COMMUNICATION
     * ========================================================================
     */

    /**
     * Solicitar ayuda cruzada entre agentes
     */
    async crossAgentRequest(fromAgent, toAgent, request) {
        console.log(`\n🔄 [BRAIN] Cross-agent: ${fromAgent} → ${toAgent}`);
        console.log(`   Request: ${request.type}`);

        const targetAgent = this.agents[toAgent];
        if (!targetAgent) {
            return { error: `Agent ${toAgent} not found` };
        }

        switch (request.type) {
            case 'get-tutorial':
                return this.agents.trainer.getTutorial(request.tutorialId);

            case 'run-test':
                return await this.agents.tester.runFlowTest(request.flowId);

            case 'get-evaluation':
                return await this.agents.evaluator.evaluateUser(request.userId);

            case 'search-knowledge':
                return await this.services.knowledgeDB.search(request.query);

            default:
                return { error: `Unknown request type: ${request.type}` };
        }
    }

    /**
     * Notificar evento a todos los agentes
     */
    broadcastEvent(event) {
        console.log(`\n📢 [BRAIN] Broadcasting: ${event.type}`);

        for (const [name, agent] of Object.entries(this.agents)) {
            if (typeof agent.handleEvent === 'function') {
                try {
                    agent.handleEvent(event);
                } catch (e) {
                    console.log(`   ⚠️ ${name} failed to handle event`);
                }
            }
        }
    }

    /**
     * ========================================================================
     * ESTADÍSTICAS Y MONITOREO
     * ========================================================================
     */

    /**
     * Registrar request
     */
    recordRequest(agentName) {
        this.stats.totalRequests++;
        this.stats.requestsByAgent[agentName] = (this.stats.requestsByAgent[agentName] || 0) + 1;
    }

    /**
     * ========================================================================
     * FULL SYSTEM STATUS - INTEGRACIÓN COMPLETA
     * ========================================================================
     */

    /**
     * Obtener estado completo del sistema (Brain + Nervous + Ecosystem)
     * Este es el método más importante - combina TODO el cerebro
     */
    async getFullSystemStatus() {
        console.log('\n📊 [BRAIN] Generando Full System Status...');

        try {
            const [
                orchestratorStats,
                nervousStats,
                ecosystemOverview,
                roadmap,
                loosePieces
            ] = await Promise.all([
                this.getStats(),
                this.services.nervousSystem?.getStatus(),
                this.services.ecosystemBrain?.getOverview(),
                this.services.ecosystemBrain?.getRoadmap(),
                this.services.ecosystemBrain?.detectLoosePieces()
            ]);

            return {
                timestamp: new Date().toISOString(),
                system: {
                    status: this.status,
                    uptime: orchestratorStats.uptime,
                    startedAt: this.startedAt?.toISOString()
                },

                // Orchestrator (agentes IA + servicios)
                orchestrator: {
                    status: this.status,
                    activeAgents: Object.keys(this.agents).length,
                    activeServices: Object.keys(this.services).length,
                    totalRequests: orchestratorStats.totalRequests,
                    requestsByAgent: orchestratorStats.requestsByAgent,
                    agents: orchestratorStats.agents,
                    services: {
                        knowledgeDB: orchestratorStats.services.knowledgeDB,
                        tours: orchestratorStats.services.tours,
                        nlu: orchestratorStats.services.nlu
                    }
                },

                // Sistema Nervioso (monitoreo en tiempo real)
                nervousSystem: nervousStats ? {
                    running: nervousStats.running,
                    errorsDetected: nervousStats.stats.errorsDetected,
                    ssotViolations: nervousStats.stats.ssotViolations,
                    fileChangesDetected: nervousStats.stats.fileChangesDetected,
                    healthChecks: nervousStats.stats.healthChecks,
                    lastHealthCheck: nervousStats.lastHealthCheck,
                    activeIncidents: nervousStats.activeIncidents?.length || 0
                } : null,

                // Ecosystem Brain (código vivo)
                ecosystemBrain: ecosystemOverview ? {
                    totalModules: ecosystemOverview.totalModules,
                    totalFiles: ecosystemOverview.stats?.totalFiles,
                    totalEndpoints: ecosystemOverview.stats?.totalEndpoints,
                    totalLines: ecosystemOverview.stats?.totalLines,
                    applications: ecosystemOverview.applications?.length || 0,
                    modulesByCategory: ecosystemOverview.modulesByCategory
                } : null,

                // Roadmap (estado del desarrollo)
                roadmap: roadmap ? {
                    totalPhases: Object.keys(roadmap).length,
                    completedPhases: Object.values(roadmap).filter(p => p.status === 'COMPLETE').length,
                    inProgressPhases: Object.values(roadmap).filter(p => p.status === 'IN_PROGRESS').length,
                    plannedPhases: Object.values(roadmap).filter(p => p.status === 'PLANNED').length
                } : null,

                // MetadataWriter
                metadataWriter: this.services.metadataWriter ? {
                    running: this.services.metadataWriter.isRunning,
                    lastUpdate: this.services.metadataWriter.lastUpdate,
                    updateCount: this.services.metadataWriter.updateCount
                } : null,

                // Loose Pieces Detection (piezas sueltas)
                loosePieces: loosePieces ? {
                    totalLoosePieces: loosePieces.summary?.totalLoosePieces || 0,
                    byCategory: loosePieces.summary?.byCategory || {},
                    categories: loosePieces.categories || {}
                } : null,

                // Health general
                health: {
                    orchestrator: this.status === 'running' ? 'healthy' : 'unhealthy',
                    nervousSystem: nervousStats?.running ? 'healthy' : 'stopped',
                    ecosystemBrain: ecosystemOverview ? 'healthy' : 'unavailable',
                    loosePiecesDetected: (loosePieces?.summary?.totalLoosePieces || 0) > 0,
                    overall: this.calculateOverallHealth(orchestratorStats, nervousStats, ecosystemOverview)
                }
            };

        } catch (error) {
            console.error('❌ [BRAIN] Error generando Full System Status:', error);
            return {
                error: true,
                message: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * Calcular salud general del sistema
     */
    calculateOverallHealth(orchestratorStats, nervousStats, ecosystemOverview) {
        const checks = [];

        // Orchestrator health
        checks.push(this.status === 'running');

        // Nervous System health
        checks.push(nervousStats?.running === true);

        // Ecosystem Brain health
        checks.push(ecosystemOverview !== null);

        // Agentes activos
        checks.push(Object.keys(this.agents).length >= 5);

        const healthyCount = checks.filter(c => c).length;
        const percentage = (healthyCount / checks.length) * 100;

        if (percentage >= 90) return 'excellent';
        if (percentage >= 70) return 'good';
        if (percentage >= 50) return 'degraded';
        return 'critical';
    }

    /**
     * Obtener estadísticas completas
     */
    getStats() {
        const uptime = this.startedAt
            ? Math.floor((Date.now() - this.startedAt.getTime()) / 1000)
            : 0;

        return {
            status: this.status,
            startedAt: this.startedAt?.toISOString(),
            uptime: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${uptime % 60}s`,
            totalRequests: this.stats.totalRequests,
            requestsByAgent: this.stats.requestsByAgent,
            errors: this.stats.errors,
            agents: {
                support: this.agents.support?.getStats(),
                trainer: this.agents.trainer?.getStats(),
                tester: this.agents.tester?.getStats(),
                evaluator: this.agents.evaluator?.getStats(),
                sales: this.agents.sales?.getStats()
            },
            services: {
                knowledgeDB: this.services.knowledgeDB?.getStats(),
                tours: this.services.tours?.getStats(),
                nlu: { status: 'active', patterns: 'loaded' }
            }
        };
    }

    /**
     * Health check
     */
    healthCheck() {
        return {
            status: this.status,
            agents: Object.keys(this.agents).reduce((acc, name) => {
                acc[name] = this.agents[name] ? 'healthy' : 'unavailable';
                return acc;
            }, {}),
            services: Object.keys(this.services).reduce((acc, name) => {
                acc[name] = this.services[name] ? 'healthy' : 'unavailable';
                return acc;
            }, {}),
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Obtener resumen para dashboard
     */
    getDashboardSummary() {
        const stats = this.getStats();

        return {
            systemStatus: this.status === 'running' ? '🟢 Activo' : '🔴 Inactivo',
            uptime: stats.uptime,
            activeAgents: Object.keys(this.agents).length,
            totalRequests: stats.totalRequests,
            agentHighlights: {
                support: {
                    questionsAnswered: stats.agents.support?.questionsAnswered || 0,
                    resolutionRate: stats.agents.support?.resolutionRate || 'N/A'
                },
                trainer: {
                    tutorialsCompleted: stats.agents.trainer?.tutorialsCompleted || 0,
                    badgesAwarded: stats.agents.trainer?.badgesAwarded || 0
                },
                tester: {
                    testsRun: stats.agents.tester?.totalTests || 0,
                    successRate: stats.agents.tester?.successRate || 'N/A'
                },
                evaluator: {
                    evaluationsCompleted: stats.agents.evaluator?.evaluationsCompleted || 0,
                    avgScore: stats.agents.evaluator?.avgScoreFormatted || 'N/A'
                },
                sales: {
                    demosCompleted: stats.agents.sales?.demosCompleted || 0,
                    proposalsGenerated: stats.agents.sales?.proposalsGenerated || 0
                }
            }
        };
    }

    /**
     * ========================================================================
     * API DE NUEVOS SERVICIOS INTEGRADOS
     * ========================================================================
     */

    /**
     * Obtener Sistema Nervioso
     */
    getNervousSystem() {
        return this.services.nervousSystem;
    }

    /**
     * Obtener Ecosystem Brain
     */
    getEcosystemBrain() {
        return this.services.ecosystemBrain;
    }

    /**
     * Obtener MetadataWriter
     */
    getMetadataWriter() {
        return this.services.metadataWriter;
    }

    /**
     * Reportar problema al Sistema Nervioso
     */
    async reportProblem(problemData) {
        if (this.services.nervousSystem) {
            return await this.services.nervousSystem.reportProblem(problemData);
        }
        console.warn('⚠️ [BRAIN] Sistema Nervioso no disponible');
        return null;
    }

    /**
     * Trigger actualización inmediata de metadata
     */
    async updateMetadataImmediate() {
        if (this.services.metadataWriter) {
            return await this.services.metadataWriter.updateNow();
        }
        console.warn('⚠️ [BRAIN] MetadataWriter no disponible');
        return null;
    }

    /**
     * Obtener metadata de módulo específico (desde Ecosystem Brain)
     */
    async getModuleMetadata(moduleKey) {
        if (this.services.ecosystemBrain) {
            return await this.services.ecosystemBrain.generateLiveModuleMetadata(moduleKey);
        }
        console.warn('⚠️ [BRAIN] Ecosystem Brain no disponible');
        return null;
    }

    /**
     * Detectar piezas sueltas (loose pieces) en el código
     */
    async detectLoosePieces() {
        if (this.services.ecosystemBrain) {
            return await this.services.ecosystemBrain.detectLoosePieces();
        }
        console.warn('⚠️ [BRAIN] Ecosystem Brain no disponible');
        return null;
    }

    /**
     * ========================================================================
     * CICLO DE VIDA
     * ========================================================================
     */

    /**
     * Detener el sistema
     */
    async shutdown() {
        console.log('\n🛑 [BRAIN] Deteniendo sistema...');
        this.status = 'stopping';

        // Detener MetadataWriter
        if (this.services.metadataWriter) {
            this.services.metadataWriter.stop();
            console.log('   ✅ MetadataWriter detenido');
        }

        // Detener Sistema Nervioso
        if (this.services.nervousSystem) {
            this.services.nervousSystem.stop();
            console.log('   ✅ Sistema Nervioso detenido');
        }

        this.status = 'stopped';
        console.log('✅ [BRAIN] Sistema detenido');
    }

    /**
     * Reiniciar el sistema
     */
    async restart() {
        await this.shutdown();
        await this.initialize();
    }
}

// Singleton
let instance = null;

module.exports = {
    BrainOrchestrator,
    getInstance: async () => {
        if (!instance) {
            instance = new BrainOrchestrator();
            await instance.initialize();
        }
        return instance;
    },
    getInstanceSync: () => instance
};
