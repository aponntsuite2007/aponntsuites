/**
 * ============================================================================
 * BRAIN KNOWLEDGE PROVIDER
 * ============================================================================
 *
 * Proveedor de conocimiento del Brain para el Asistente IA.
 * Integra:
 * - Circuitos de negocio
 * - Registro de APKs móviles
 * - Módulos del sistema
 * - Tours guiados
 *
 * El AssistantService usa este provider para enriquecer sus respuestas
 * con conocimiento profundo del sistema.
 *
 * Created: 2025-12-20
 * Phase: 8 - Business Circuits
 */

const { getCircuitTourEngine } = require('./CircuitTourEngine');
const {
    getAllCircuits,
    getCircuit,
    findCircuitsUsingModule,
    getCircuitsSummary
} = require('../circuits/BusinessCircuitsRegistry');
const {
    getAllApps,
    getApp,
    findAppsUsingModule,
    recommendAppForTask,
    getAppsSummary
} = require('../registry/MobileAppsRegistry');

/**
 * Clase BrainKnowledgeProvider - Proveedor de conocimiento para IA
 */
class BrainKnowledgeProvider {
    constructor() {
        this.tourEngine = getCircuitTourEngine();
        console.log('🧠 [BRAIN-KNOWLEDGE] Provider inicializado');
    }

    // =========================================================================
    // GENERACIÓN DE CONTEXTO PARA IA
    // =========================================================================

    /**
     * Generar contexto completo del Brain para una pregunta
     * @param {string} question - Pregunta del usuario
     * @param {Object} sessionContext - Contexto de la sesión (módulo actual, etc.)
     */
    generateContextForQuestion(question, sessionContext = {}) {
        const q = question.toLowerCase();
        let context = '';

        // Determinar qué tipo de conocimiento necesita
        const needsCircuits = this._needsCircuitKnowledge(q);
        const needsApps = this._needsAppKnowledge(q);
        const needsModules = this._needsModuleKnowledge(q);
        const needsTour = this._needsTour(q);

        if (needsTour) {
            // Generar respuesta de tour directamente
            return {
                type: 'tour',
                content: this._handleTourRequest(q, sessionContext.userId)
            };
        }

        if (needsCircuits) {
            context += this._getCircuitsContext(q);
        }

        if (needsApps) {
            context += this._getAppsContext(q);
        }

        if (needsModules && sessionContext.currentModule) {
            context += this._getModuleContext(sessionContext.currentModule);
        }

        // Agregar conocimiento general si no hay contexto específico
        if (!context) {
            context = this._getGeneralSystemContext();
        }

        return {
            type: 'context',
            content: context
        };
    }

    /**
     * Responder directamente una pregunta sobre el sistema
     * @param {string} question
     * @param {Object} sessionContext
     */
    answerSystemQuestion(question, sessionContext = {}) {
        const q = question.toLowerCase();

        // Preguntas sobre circuitos
        if (this._needsCircuitKnowledge(q)) {
            return this.tourEngine.answerQuestion(question, sessionContext);
        }

        // Preguntas sobre APKs
        if (this._needsAppKnowledge(q)) {
            return this._answerAppQuestion(q);
        }

        // Preguntas sobre módulos específicos
        if (this._needsModuleKnowledge(q)) {
            return this._answerModuleQuestion(q);
        }

        // Pregunta de tour
        if (this._needsTour(q)) {
            return this._handleTourRequest(q, sessionContext.userId);
        }

        // Pregunta general del sistema
        return {
            answered: false,
            context: this._getGeneralSystemContext()
        };
    }

    // =========================================================================
    // GESTIÓN DE TOURS
    // =========================================================================

    /**
     * Iniciar un tour para un usuario
     */
    startTour(userId, circuitKey) {
        return this.tourEngine.startTour(userId, circuitKey);
    }

    /**
     * Siguiente paso del tour
     */
    nextTourStep(userId) {
        return this.tourEngine.nextStep(userId);
    }

    /**
     * Paso anterior del tour
     */
    previousTourStep(userId) {
        return this.tourEngine.previousStep(userId);
    }

    /**
     * Terminar tour
     */
    endTour(userId) {
        return this.tourEngine.endTour(userId);
    }

    /**
     * Estado del tour
     */
    getTourStatus(userId) {
        return this.tourEngine.getTourStatus(userId);
    }

    // =========================================================================
    // INFORMACIÓN ESTRUCTURADA
    // =========================================================================

    /**
     * Obtener resumen de todos los circuitos
     */
    getCircuitsSummary() {
        return getCircuitsSummary();
    }

    /**
     * Obtener detalle de un circuito
     */
    getCircuitDetails(circuitKey) {
        const circuit = getCircuit(circuitKey);
        if (!circuit) {
            return null;
        }

        return {
            ...circuit.toJSON(),
            tour: circuit.generateTour()
        };
    }

    /**
     * Obtener resumen de todas las APKs
     */
    getAppsSummary() {
        return getAppsSummary();
    }

    /**
     * Obtener detalle de una APK
     */
    getAppDetails(appKey) {
        const app = getApp(appKey);
        if (!app) {
            return null;
        }

        return {
            ...app.toJSON(),
            endpointsByCategory: app.getEndpointsByCategory(),
            documentation: app.documentation
        };
    }

    /**
     * Encontrar el mejor circuito para una necesidad
     */
    findCircuitForNeed(need) {
        return this.tourEngine.findCircuitForNeed(need);
    }

    /**
     * Recomendar APK para una tarea
     */
    recommendApp(taskDescription) {
        return recommendAppForTask(taskDescription);
    }

    /**
     * Obtener matriz de dependencias entre circuitos
     */
    getCircuitDependencies() {
        return this.tourEngine.getCircuitDependencyMatrix();
    }

    /**
     * Generar el flujo completo de un proceso end-to-end
     * @param {string} startProcess - Proceso inicial (ej: "fichaje")
     * @param {string} endProcess - Proceso final (ej: "recibo de sueldo")
     */
    getEndToEndFlow(startProcess, endProcess) {
        // Flujos conocidos
        const knownFlows = {
            'fichaje-recibo': this._getAttendanceToPayrollFlow(),
            'lead-venta': this._getLeadToSaleFlow(),
            'contratación-activo': this._getHiringToActiveFlow()
        };

        const flowKey = `${startProcess.toLowerCase()}-${endProcess.toLowerCase()}`;

        if (knownFlows[flowKey]) {
            return knownFlows[flowKey];
        }

        // Intentar deducir el flujo
        return this._deduceFlow(startProcess, endProcess);
    }

    // =========================================================================
    // HELPERS PRIVADOS - Detección de necesidades
    // =========================================================================

    _needsCircuitKnowledge(question) {
        const keywords = [
            'circuito', 'proceso', 'flujo', 'cómo funciona', 'como funciona',
            'pasos', 'etapas', 'stages', 'desde', 'hasta',
            'asistencia', 'nómina', 'nomina', 'legal', 'comercial', 'rrhh',
            'recursos humanos', 'payroll', 'attendance'
        ];
        return keywords.some(kw => question.includes(kw));
    }

    _needsAppKnowledge(question) {
        const keywords = [
            'apk', 'app', 'aplicación', 'aplicacion', 'móvil', 'movil',
            'celular', 'android', 'kiosco', 'kiosko', 'employee', 'medical',
            'descargar', 'instalar'
        ];
        return keywords.some(kw => question.includes(kw));
    }

    _needsModuleKnowledge(question) {
        const keywords = [
            'módulo', 'modulo', 'participa', 'usa', 'utiliza',
            'depende', 'dependencia', 'relacionado'
        ];
        return keywords.some(kw => question.includes(kw));
    }

    _needsTour(question) {
        const keywords = [
            'tour', 'guía', 'guia', 'guiame', 'guíame', 'explicame',
            'explícame', 'recorrido', 'paso a paso', 'paso por paso',
            'muéstrame', 'muestrame', 'enséñame', 'enseñame'
        ];
        return keywords.some(kw => question.includes(kw));
    }

    // =========================================================================
    // HELPERS PRIVADOS - Generación de contexto
    // =========================================================================

    _getCircuitsContext(question) {
        let context = `\n## CIRCUITOS DE NEGOCIO\n\n`;

        // Determinar si pregunta por un circuito específico
        const circuitKeys = ['attendance', 'payroll', 'legal', 'commercial', 'hr'];
        const circuitNames = {
            attendance: 'asistencia',
            payroll: 'nómina',
            legal: 'legal',
            commercial: 'comercial',
            hr: 'rrhh'
        };

        let targetCircuit = null;
        for (const key of circuitKeys) {
            if (question.includes(key) || question.includes(circuitNames[key])) {
                targetCircuit = getCircuit(key);
                break;
            }
        }

        if (targetCircuit) {
            context += targetCircuit.generateQuickTour();
        } else {
            // Contexto general de circuitos
            context += `El sistema tiene ${getAllCircuits().length} circuitos principales:\n`;
            for (const circuit of getAllCircuits()) {
                context += `- **${circuit.name}**: ${circuit.description}\n`;
            }
        }

        return context;
    }

    _getAppsContext(question) {
        let context = `\n## APLICACIONES MÓVILES\n\n`;

        const apps = getAllApps();
        for (const app of apps) {
            context += `### ${app.name} (${app.key})\n`;
            context += `- Package: ${app.packageId}\n`;
            context += `- Estado: ${app.status}\n`;
            context += `- Descripción: ${app.description}\n`;
            context += `- Para: ${app.targetUsers.join(', ')}\n`;
            context += `- Endpoints: ${app.endpoints.length}\n\n`;
        }

        return context;
    }

    _getModuleContext(moduleName) {
        let context = `\n## MÓDULO: ${moduleName}\n\n`;

        // Buscar en qué circuitos participa
        const circuits = findCircuitsUsingModule(moduleName);
        if (circuits.length > 0) {
            context += `Participa en ${circuits.length} circuito(s):\n`;
            for (const c of circuits) {
                const stages = c.stages.filter(s => s.modules.includes(moduleName));
                context += `- ${c.name}: ${stages.map(s => s.name).join(', ')}\n`;
            }
        }

        // Buscar qué apps lo usan
        const apps = findAppsUsingModule(moduleName);
        if (apps.length > 0) {
            context += `\nUsado por ${apps.length} APK(s): ${apps.map(a => a.name).join(', ')}\n`;
        }

        return context;
    }

    _getGeneralSystemContext() {
        return `
## SISTEMA DE ASISTENCIA BIOMÉTRICO - CONTEXTO GENERAL

### Circuitos de Negocio (5 principales)
${getCircuitsSummary().map(c => `- ${c.name}: ${c.stagesCount} pasos, ${c.estimatedDuration}`).join('\n')}

### Aplicaciones Móviles (4 APKs)
${getAppsSummary().map(a => `- ${a.name}: ${a.status} - ${a.description}`).join('\n')}

### Capacidades del Brain
- Conoce todos los módulos del sistema y sus dependencias
- Puede explicar flujos de negocio end-to-end
- Puede recomendar la APK correcta para cada tarea
- Puede hacer tours guiados por cada circuito
`;
    }

    // =========================================================================
    // HELPERS PRIVADOS - Respuestas específicas
    // =========================================================================

    _handleTourRequest(question, userId) {
        // Detectar circuito solicitado
        const circuitKeys = ['attendance', 'payroll', 'legal', 'commercial', 'hr'];
        const circuitNames = {
            attendance: ['asistencia', 'fichaje'],
            payroll: ['nómina', 'nomina', 'liquidación', 'sueldo'],
            legal: ['legal'],
            commercial: ['comercial', 'ventas'],
            hr: ['rrhh', 'recursos humanos', 'contratación']
        };

        let targetKey = null;
        for (const [key, names] of Object.entries(circuitNames)) {
            if (names.some(n => question.includes(n))) {
                targetKey = key;
                break;
            }
        }

        if (targetKey) {
            // Iniciar tour
            return this.startTour(userId || 'default', targetKey);
        }

        return {
            success: false,
            message: '¿Sobre qué circuito quieres hacer un tour?',
            available: getCircuitsSummary()
        };
    }

    _answerAppQuestion(question) {
        // ¿Qué APK debo usar?
        if (question.includes('usar') || question.includes('debo') ||
            question.includes('cuál') || question.includes('cual')) {
            return recommendAppForTask(question);
        }

        // Lista de APKs
        if (question.includes('cuáles') || question.includes('cuales') ||
            question.includes('lista') || question.includes('todas')) {
            return {
                answered: true,
                apps: getAppsSummary()
            };
        }

        // APK específica
        for (const app of getAllApps()) {
            if (question.includes(app.key)) {
                return {
                    answered: true,
                    app: {
                        ...app.toJSON(),
                        documentation: app.documentation
                    }
                };
            }
        }

        return {
            answered: false,
            context: this._getAppsContext(question)
        };
    }

    _answerModuleQuestion(question) {
        // Extraer nombre del módulo
        const moduleMatch = question.match(/módulo (\w+[-\w]*)|modulo (\w+[-\w]*)/);
        if (moduleMatch) {
            const moduleName = moduleMatch[1] || moduleMatch[2];

            const circuits = findCircuitsUsingModule(moduleName);
            const apps = findAppsUsingModule(moduleName);

            return {
                answered: true,
                module: moduleName,
                participation: {
                    circuits: circuits.map(c => ({
                        name: c.name,
                        stages: c.stages.filter(s => s.modules.includes(moduleName)).map(s => s.name)
                    })),
                    apps: apps.map(a => a.name)
                }
            };
        }

        return { answered: false };
    }

    // =========================================================================
    // HELPERS PRIVADOS - Flujos end-to-end
    // =========================================================================

    _getAttendanceToPayrollFlow() {
        const attendance = getCircuit('attendance');
        const payroll = getCircuit('payroll');

        return {
            name: 'Del Fichaje al Recibo de Sueldo',
            circuits: ['attendance', 'payroll'],
            connection: 'El circuito de Asistencia provee datos de horas trabajadas que el circuito de Nómina consume',
            totalStages: attendance.stages.length + payroll.stages.length,
            flow: [
                ...attendance.getOrderedStages().map((s, i) => ({
                    circuit: 'attendance',
                    order: i + 1,
                    name: s.name,
                    description: s.description
                })),
                { circuit: 'transition', name: '→ Datos pasan a Nómina', description: 'Horas trabajadas, ausencias, etc.' },
                ...payroll.getOrderedStages().filter(s => s.key !== 'liquidation_error').map((s, i) => ({
                    circuit: 'payroll',
                    order: attendance.stages.length + i + 1,
                    name: s.name,
                    description: s.description
                }))
            ]
        };
    }

    _getLeadToSaleFlow() {
        const commercial = getCircuit('commercial');

        return {
            name: 'Del Lead a la Venta',
            circuits: ['commercial'],
            totalStages: commercial.stages.length,
            flow: commercial.getOrderedStages().map((s, i) => ({
                circuit: 'commercial',
                order: i + 1,
                name: s.name,
                description: s.description
            }))
        };
    }

    _getHiringToActiveFlow() {
        const hr = getCircuit('hr');

        return {
            name: 'De la Contratación al Empleado Activo',
            circuits: ['hr'],
            totalStages: hr.stages.filter(s => s.order <= 9).length,
            flow: hr.getOrderedStages().filter(s => s.order <= 9).map((s, i) => ({
                circuit: 'hr',
                order: i + 1,
                name: s.name,
                description: s.description
            }))
        };
    }

    _deduceFlow(start, end) {
        // Buscar en qué circuitos aparecen los términos
        const startCircuits = [];
        const endCircuits = [];

        for (const circuit of getAllCircuits()) {
            for (const stage of circuit.stages) {
                if (stage.name.toLowerCase().includes(start) ||
                    stage.description.toLowerCase().includes(start)) {
                    startCircuits.push({ circuit, stage });
                }
                if (stage.name.toLowerCase().includes(end) ||
                    stage.description.toLowerCase().includes(end)) {
                    endCircuits.push({ circuit, stage });
                }
            }
        }

        if (startCircuits.length === 0 || endCircuits.length === 0) {
            return {
                found: false,
                message: `No pude encontrar un flujo desde "${start}" hasta "${end}"`,
                suggestion: 'Intenta con términos más específicos o pregunta por un circuito en particular'
            };
        }

        // Si están en el mismo circuito
        const sameCircuit = startCircuits.find(s =>
            endCircuits.some(e => e.circuit.key === s.circuit.key)
        );

        if (sameCircuit) {
            const circuit = sameCircuit.circuit;
            const startStage = startCircuits.find(s => s.circuit.key === circuit.key).stage;
            const endStage = endCircuits.find(e => e.circuit.key === circuit.key).stage;

            const orderedStages = circuit.getOrderedStages();
            const startIdx = orderedStages.findIndex(s => s.key === startStage.key);
            const endIdx = orderedStages.findIndex(s => s.key === endStage.key);

            const flowStages = orderedStages.slice(
                Math.min(startIdx, endIdx),
                Math.max(startIdx, endIdx) + 1
            );

            return {
                found: true,
                circuit: circuit.name,
                flow: flowStages.map((s, i) => ({
                    order: i + 1,
                    name: s.name,
                    description: s.description
                }))
            };
        }

        return {
            found: false,
            message: 'Los puntos están en circuitos diferentes. Necesito más información para conectarlos.',
            startIn: startCircuits.map(s => s.circuit.name),
            endIn: endCircuits.map(e => e.circuit.name)
        };
    }
}

// Singleton
let providerInstance = null;

function getBrainKnowledgeProvider() {
    if (!providerInstance) {
        providerInstance = new BrainKnowledgeProvider();
    }
    return providerInstance;
}

module.exports = {
    BrainKnowledgeProvider,
    getBrainKnowledgeProvider
};
