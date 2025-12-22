/**
 * ============================================================================
 * CIRCUIT TOUR ENGINE
 * ============================================================================
 *
 * Motor de tours guiados para circuitos de negocio.
 * Proporciona capacidades de:
 *
 * 1. TOURS INTERACTIVOS - Guiar paso a paso por un circuito
 * 2. RESPONDER PREGUNTAS - Sobre módulos, relaciones y flujos
 * 3. DESCUBRIMIENTO - Encontrar el circuito adecuado para una necesidad
 * 4. NARRATIVAS IA - Generar explicaciones para el asistente
 *
 * Created: 2025-12-20
 * Phase: 8 - Business Circuits
 */

const {
    getAllCircuits,
    getCircuit,
    getCircuitsByType,
    findCircuitsUsingModule,
    findCircuitsUsingApk,
    getCircuitsSummary,
    CIRCUITS_REGISTRY
} = require('../circuits/BusinessCircuitsRegistry');

/**
 * Clase CircuitTourEngine - Motor de tours y consultas
 */
class CircuitTourEngine {
    constructor() {
        // Estado de tours activos por usuario
        this.activeTours = new Map(); // userId -> TourState

        console.log('🎯 [CIRCUIT-TOUR] Engine inicializado');
    }

    // =========================================================================
    // TOURS INTERACTIVOS
    // =========================================================================

    /**
     * Iniciar un tour por un circuito
     * @param {string} userId - ID del usuario
     * @param {string} circuitKey - Clave del circuito (attendance, payroll, etc.)
     */
    startTour(userId, circuitKey) {
        const circuit = getCircuit(circuitKey);
        if (!circuit) {
            return {
                success: false,
                error: `Circuito '${circuitKey}' no encontrado`,
                available: Object.keys(CIRCUITS_REGISTRY)
            };
        }

        const tourState = {
            circuitKey,
            currentStageIndex: 0,
            stages: circuit.getOrderedStages(),
            startedAt: new Date().toISOString(),
            completedStages: []
        };

        this.activeTours.set(userId, tourState);

        const firstStage = tourState.stages[0];

        return {
            success: true,
            circuit: {
                key: circuit.key,
                name: circuit.name,
                description: circuit.description,
                totalStages: tourState.stages.length,
                estimatedDuration: `${circuit.getEstimatedDuration()} minutos`
            },
            introduction: circuit.tour.introduction,
            currentStep: this._formatStageForTour(circuit, firstStage, 0, tourState.stages.length),
            navigation: {
                hasNext: tourState.stages.length > 1,
                hasPrevious: false,
                currentIndex: 0,
                totalSteps: tourState.stages.length
            }
        };
    }

    /**
     * Avanzar al siguiente paso del tour
     * @param {string} userId
     */
    nextStep(userId) {
        const tourState = this.activeTours.get(userId);
        if (!tourState) {
            return { success: false, error: 'No hay tour activo. Usa startTour() primero.' };
        }

        const circuit = getCircuit(tourState.circuitKey);
        const nextIndex = tourState.currentStageIndex + 1;

        if (nextIndex >= tourState.stages.length) {
            // Fin del tour
            return this.endTour(userId);
        }

        // Marcar stage anterior como completado
        tourState.completedStages.push(tourState.stages[tourState.currentStageIndex].key);
        tourState.currentStageIndex = nextIndex;

        const currentStage = tourState.stages[nextIndex];

        return {
            success: true,
            currentStep: this._formatStageForTour(circuit, currentStage, nextIndex, tourState.stages.length),
            navigation: {
                hasNext: nextIndex < tourState.stages.length - 1,
                hasPrevious: true,
                currentIndex: nextIndex,
                totalSteps: tourState.stages.length
            },
            progress: Math.round((nextIndex / tourState.stages.length) * 100)
        };
    }

    /**
     * Retroceder al paso anterior
     * @param {string} userId
     */
    previousStep(userId) {
        const tourState = this.activeTours.get(userId);
        if (!tourState) {
            return { success: false, error: 'No hay tour activo.' };
        }

        const circuit = getCircuit(tourState.circuitKey);
        const prevIndex = tourState.currentStageIndex - 1;

        if (prevIndex < 0) {
            return { success: false, error: 'Ya estás en el primer paso.' };
        }

        tourState.currentStageIndex = prevIndex;
        const currentStage = tourState.stages[prevIndex];

        return {
            success: true,
            currentStep: this._formatStageForTour(circuit, currentStage, prevIndex, tourState.stages.length),
            navigation: {
                hasNext: true,
                hasPrevious: prevIndex > 0,
                currentIndex: prevIndex,
                totalSteps: tourState.stages.length
            }
        };
    }

    /**
     * Terminar el tour
     * @param {string} userId
     */
    endTour(userId) {
        const tourState = this.activeTours.get(userId);
        if (!tourState) {
            return { success: false, error: 'No hay tour activo.' };
        }

        const circuit = getCircuit(tourState.circuitKey);
        const duration = Date.now() - new Date(tourState.startedAt).getTime();

        this.activeTours.delete(userId);

        return {
            success: true,
            completed: true,
            message: `Has completado el tour del circuito "${circuit.name}"`,
            summary: {
                circuit: circuit.name,
                stagesVisited: tourState.completedStages.length + 1,
                totalStages: tourState.stages.length,
                durationMinutes: Math.round(duration / 60000)
            },
            relatedCircuits: circuit.tour.relatedCircuits,
            faqs: circuit.tour.faqs,
            nextSuggestions: this._suggestNextTours(tourState.circuitKey)
        };
    }

    /**
     * Obtener estado actual del tour
     * @param {string} userId
     */
    getTourStatus(userId) {
        const tourState = this.activeTours.get(userId);
        if (!tourState) {
            return { active: false };
        }

        const circuit = getCircuit(tourState.circuitKey);
        const currentStage = tourState.stages[tourState.currentStageIndex];

        return {
            active: true,
            circuit: circuit.name,
            currentStep: tourState.currentStageIndex + 1,
            totalSteps: tourState.stages.length,
            currentStage: currentStage.name,
            progress: Math.round(((tourState.currentStageIndex + 1) / tourState.stages.length) * 100)
        };
    }

    // =========================================================================
    // RESPONDER PREGUNTAS
    // =========================================================================

    /**
     * Responder una pregunta sobre circuitos de negocio
     * @param {string} question - Pregunta del usuario
     * @param {string} context - Contexto adicional (módulo actual, etc.)
     */
    answerQuestion(question, context = {}) {
        const q = question.toLowerCase();

        // ¿Qué circuitos hay?
        if (q.includes('qué circuitos') || q.includes('que circuitos') ||
            q.includes('cuáles circuitos') || q.includes('listar circuitos')) {
            return this._listAllCircuits();
        }

        // ¿Cómo funciona el circuito de X?
        const circuitMatch = q.match(/circuito de (\w+)|circuito (\w+)/);
        if (circuitMatch) {
            const circuitName = circuitMatch[1] || circuitMatch[2];
            return this._explainCircuit(circuitName);
        }

        // ¿Qué módulos participan en X?
        if (q.includes('módulos') || q.includes('modulos')) {
            const circuitKey = this._extractCircuitFromQuestion(q);
            if (circuitKey) {
                return this._listCircuitModules(circuitKey);
            }
        }

        // ¿En qué circuitos participa el módulo X?
        if (q.includes('participa') || q.includes('usa') || q.includes('utiliza')) {
            const moduleMatch = q.match(/módulo (\w+)|modulo (\w+)/);
            if (moduleMatch) {
                const moduleName = moduleMatch[1] || moduleMatch[2];
                return this._findCircuitsForModule(moduleName);
            }
        }

        // ¿Cómo llega X a Y? (flujo entre dos puntos)
        if (q.includes('cómo llega') || q.includes('como llega') ||
            q.includes('desde') || q.includes('hasta')) {
            return this._explainFlow(q);
        }

        // ¿Qué pasa después de X?
        if (q.includes('después de') || q.includes('despues de') ||
            q.includes('siguiente') || q.includes('qué sigue')) {
            return this._explainNextSteps(q);
        }

        // ¿Cuánto dura el proceso de X?
        if (q.includes('cuánto dura') || q.includes('cuanto dura') ||
            q.includes('tiempo') || q.includes('duración')) {
            const circuitKey = this._extractCircuitFromQuestion(q);
            if (circuitKey) {
                const circuit = getCircuit(circuitKey);
                return {
                    answer: `El circuito de ${circuit.name} tiene una duración estimada de ${circuit.getEstimatedDuration()} minutos.`,
                    details: circuit.stages.map(s => ({ stage: s.name, time: `${s.estimatedTime} min` }))
                };
            }
        }

        // ¿Qué APK uso para X?
        if (q.includes('apk') || q.includes('app') || q.includes('aplicación') ||
            q.includes('móvil') || q.includes('celular')) {
            return this._findApkForTask(q);
        }

        // Pregunta sobre un circuito específico
        for (const [key, circuit] of Object.entries(CIRCUITS_REGISTRY)) {
            if (q.includes(key) || q.includes(circuit.name.toLowerCase())) {
                return {
                    answer: circuit.answerQuestion(question),
                    circuit: circuit.name
                };
            }
        }

        // Default: generar resumen de circuitos
        return {
            answer: 'No entendí exactamente tu pregunta. ¿Sobre qué circuito quieres saber más?',
            availableCircuits: getCircuitsSummary(),
            suggestions: [
                '¿Cómo funciona el circuito de nómina?',
                '¿Qué módulos participan en asistencia?',
                '¿Desde el fichaje hasta el recibo de sueldo?',
                'Hazme un tour por el circuito de RRHH'
            ]
        };
    }

    /**
     * Generar narrativa completa de un circuito para el asistente IA
     * @param {string} circuitKey
     */
    generateNarrative(circuitKey) {
        const circuit = getCircuit(circuitKey);
        if (!circuit) {
            return `No encontré el circuito "${circuitKey}". Los circuitos disponibles son: ${Object.keys(CIRCUITS_REGISTRY).join(', ')}.`;
        }

        return circuit.generateQuickTour();
    }

    /**
     * Generar contexto completo para que la IA responda preguntas
     */
    generateAIContext() {
        let context = `# CIRCUITOS DE NEGOCIO DEL SISTEMA\n\n`;
        context += `El sistema tiene ${Object.keys(CIRCUITS_REGISTRY).length} circuitos de negocio principales:\n\n`;

        for (const [key, circuit] of Object.entries(CIRCUITS_REGISTRY)) {
            context += `## ${circuit.name} (${key})\n`;
            context += `- Tipo: ${circuit.type}\n`;
            context += `- Propósito: ${circuit.businessPurpose}\n`;
            context += `- Stages: ${circuit.stages.length}\n`;
            context += `- Módulos: ${circuit.getAllModules().join(', ')}\n`;
            context += `- APKs: ${circuit.getAllApks().join(', ') || 'Solo web'}\n`;
            context += `- Duración estimada: ${circuit.getEstimatedDuration()} minutos\n`;
            context += `\n`;
        }

        context += `\n## RELACIONES ENTRE CIRCUITOS\n\n`;

        for (const circuit of Object.values(CIRCUITS_REGISTRY)) {
            if (circuit.dependsOn.length > 0) {
                context += `- ${circuit.name} depende de: ${circuit.dependsOn.join(', ')}\n`;
            }
            if (circuit.provides.length > 0) {
                context += `- ${circuit.name} provee: ${circuit.provides.join(', ')}\n`;
            }
        }

        return context;
    }

    // =========================================================================
    // DESCUBRIMIENTO Y RECOMENDACIONES
    // =========================================================================

    /**
     * Encontrar el circuito adecuado para una necesidad
     * @param {string} need - Descripción de la necesidad
     */
    findCircuitForNeed(need) {
        const n = need.toLowerCase();

        // Mapeo de keywords a circuitos
        const keywordMap = {
            attendance: ['asistencia', 'fichaje', 'fichar', 'entrada', 'salida', 'kiosco', 'biométrico', 'presencia', 'tardanza'],
            payroll: ['sueldo', 'salario', 'liquidación', 'nómina', 'recibo', 'pago', 'concepto', 'deducción', 'extra'],
            legal: ['legal', 'demanda', 'juicio', 'contrato laboral', 'despido', 'sanción', 'incidente'],
            commercial: ['venta', 'lead', 'prospecto', 'cliente', 'comercial', 'pipeline', 'propuesta', 'negociación'],
            hr: ['rrhh', 'recursos humanos', 'contratar', 'onboarding', 'empleado nuevo', 'offboarding', 'baja', 'alta']
        };

        const matches = [];
        for (const [circuitKey, keywords] of Object.entries(keywordMap)) {
            const matchCount = keywords.filter(kw => n.includes(kw)).length;
            if (matchCount > 0) {
                matches.push({ circuitKey, matchCount });
            }
        }

        if (matches.length === 0) {
            return {
                found: false,
                message: 'No encontré un circuito específico para esa necesidad.',
                suggestion: 'Describe tu necesidad con más detalle o elige de la lista:',
                available: getCircuitsSummary()
            };
        }

        // Ordenar por cantidad de matches
        matches.sort((a, b) => b.matchCount - a.matchCount);

        const bestMatch = matches[0];
        const circuit = getCircuit(bestMatch.circuitKey);

        return {
            found: true,
            circuit: {
                key: circuit.key,
                name: circuit.name,
                description: circuit.description,
                matchScore: bestMatch.matchCount
            },
            tour: circuit.tour.introduction,
            otherOptions: matches.slice(1).map(m => ({
                key: m.circuitKey,
                name: getCircuit(m.circuitKey).name
            }))
        };
    }

    /**
     * Obtener la matriz de dependencias entre circuitos
     */
    getCircuitDependencyMatrix() {
        const matrix = {};

        for (const [key, circuit] of Object.entries(CIRCUITS_REGISTRY)) {
            matrix[key] = {
                name: circuit.name,
                dependsOn: circuit.dependsOn,
                provides: circuit.provides,
                modules: circuit.getAllModules(),
                sharedModules: {}
            };

            // Calcular módulos compartidos con otros circuitos
            for (const [otherKey, otherCircuit] of Object.entries(CIRCUITS_REGISTRY)) {
                if (key !== otherKey) {
                    const shared = circuit.getAllModules().filter(m =>
                        otherCircuit.getAllModules().includes(m)
                    );
                    if (shared.length > 0) {
                        matrix[key].sharedModules[otherKey] = shared;
                    }
                }
            }
        }

        return matrix;
    }

    // =========================================================================
    // HELPERS PRIVADOS
    // =========================================================================

    _formatStageForTour(circuit, stage, index, total) {
        const nextStages = circuit.getNextStages(stage.key);
        const prevStages = circuit.getPreviousStages(stage.key);

        return {
            stepNumber: index + 1,
            totalSteps: total,
            key: stage.key,
            name: stage.name,
            description: stage.description,
            explanation: stage.tour.explanation,
            businessValue: stage.tour.businessValue,
            modules: stage.modules,
            services: stage.services,
            endpoints: stage.endpoints,
            apks: stage.apks.length > 0 ? stage.apks : ['web'],
            inputs: stage.inputs,
            outputs: stage.outputs,
            estimatedTime: `${stage.estimatedTime} minutos`,
            isCritical: stage.isCritical,
            tips: stage.tour.tips,
            commonIssues: stage.tour.commonIssues,
            navigation: {
                comesFrom: prevStages.map(p => ({ key: p.stage?.key, name: p.stage?.name })),
                goesTo: nextStages.map(n => ({
                    key: n.stage?.key,
                    name: n.stage?.name,
                    condition: n.transition.condition
                }))
            }
        };
    }

    _suggestNextTours(completedCircuit) {
        const circuit = getCircuit(completedCircuit);
        const suggestions = [];

        // Sugerir circuitos relacionados
        for (const relatedKey of circuit.tour.relatedCircuits) {
            const related = getCircuit(relatedKey);
            if (related) {
                suggestions.push({
                    key: relatedKey,
                    name: related.name,
                    reason: 'Circuito relacionado'
                });
            }
        }

        // Sugerir circuitos que dependen de este
        for (const [key, otherCircuit] of Object.entries(CIRCUITS_REGISTRY)) {
            if (otherCircuit.dependsOn.includes(completedCircuit)) {
                suggestions.push({
                    key,
                    name: otherCircuit.name,
                    reason: `Depende de ${circuit.name}`
                });
            }
        }

        return suggestions.slice(0, 3);
    }

    _listAllCircuits() {
        const circuits = getCircuitsSummary();
        let answer = '## Circuitos de Negocio Disponibles\n\n';

        for (const c of circuits) {
            answer += `### ${c.name} (${c.key})\n`;
            answer += `- Tipo: ${c.type}\n`;
            answer += `- Pasos: ${c.stagesCount}\n`;
            answer += `- Duración: ${c.estimatedDuration}\n`;
            answer += `- APKs: ${c.apksInvolved.join(', ') || 'Solo web'}\n\n`;
        }

        return {
            answer,
            circuits
        };
    }

    _explainCircuit(circuitName) {
        // Buscar circuito por nombre o key
        let circuit = null;
        for (const [key, c] of Object.entries(CIRCUITS_REGISTRY)) {
            if (key.includes(circuitName) || c.name.toLowerCase().includes(circuitName)) {
                circuit = c;
                break;
            }
        }

        if (!circuit) {
            return {
                answer: `No encontré el circuito "${circuitName}".`,
                available: Object.keys(CIRCUITS_REGISTRY)
            };
        }

        return {
            answer: circuit.generateQuickTour(),
            circuit: circuit.name,
            details: circuit.toJSON()
        };
    }

    _listCircuitModules(circuitKey) {
        const circuit = getCircuit(circuitKey);
        if (!circuit) {
            return { answer: `Circuito "${circuitKey}" no encontrado.` };
        }

        const modules = circuit.getAllModules();
        const byStage = circuit.stages.map(s => ({
            stage: s.name,
            modules: s.modules
        }));

        return {
            answer: `El circuito ${circuit.name} utiliza ${modules.length} módulos: ${modules.join(', ')}.`,
            totalModules: modules.length,
            modules,
            modulesByStage: byStage
        };
    }

    _findCircuitsForModule(moduleName) {
        const circuits = findCircuitsUsingModule(moduleName);

        if (circuits.length === 0) {
            return {
                answer: `El módulo "${moduleName}" no participa en ningún circuito definido.`,
                suggestion: 'Verifica el nombre del módulo o busca en el registry de módulos.'
            };
        }

        const participation = circuits.map(c => {
            const stages = c.stages.filter(s => s.modules.includes(moduleName));
            return {
                circuit: c.name,
                stagesCount: stages.length,
                stages: stages.map(s => s.name)
            };
        });

        return {
            answer: `El módulo "${moduleName}" participa en ${circuits.length} circuito(s): ${circuits.map(c => c.name).join(', ')}.`,
            participation
        };
    }

    _extractCircuitFromQuestion(question) {
        for (const key of Object.keys(CIRCUITS_REGISTRY)) {
            if (question.includes(key)) {
                return key;
            }
        }

        // Buscar por nombre
        const nameMap = {
            'asistencia': 'attendance',
            'nómina': 'payroll',
            'nomina': 'payroll',
            'legal': 'legal',
            'comercial': 'commercial',
            'ventas': 'commercial',
            'rrhh': 'hr',
            'recursos humanos': 'hr'
        };

        for (const [name, key] of Object.entries(nameMap)) {
            if (question.includes(name)) {
                return key;
            }
        }

        return null;
    }

    _explainFlow(question) {
        // Buscar si menciona un flujo conocido
        if (question.includes('fichaje') && (question.includes('sueldo') || question.includes('recibo'))) {
            return this._explainAttendanceToPayroll();
        }

        if (question.includes('lead') && question.includes('venta')) {
            const circuit = getCircuit('commercial');
            return { answer: circuit.generateQuickTour() };
        }

        return {
            answer: 'No entendí el flujo que quieres conocer. ¿Puedes ser más específico?',
            examples: [
                '¿Cómo llega el fichaje al recibo de sueldo?',
                '¿Cómo va un lead hasta convertirse en venta?',
                '¿Qué pasa desde que contratan a alguien hasta que está activo?'
            ]
        };
    }

    _explainAttendanceToPayroll() {
        let narrative = `## Del Fichaje al Recibo de Sueldo\n\n`;
        narrative += `Este flujo atraviesa **2 circuitos** principales:\n\n`;

        narrative += `### Parte 1: Circuito de Asistencia\n`;
        const attendance = getCircuit('attendance');
        const attendanceStages = attendance.getOrderedStages().slice(0, 6);
        attendanceStages.forEach((s, i) => {
            narrative += `${i + 1}. **${s.name}**: ${s.description}\n`;
        });

        narrative += `\n### Parte 2: Circuito de Nómina\n`;
        const payroll = getCircuit('payroll');
        payroll.getOrderedStages().forEach((s, i) => {
            if (s.key !== 'liquidation_error') {
                narrative += `${i + 1}. **${s.name}**: ${s.description}\n`;
            }
        });

        narrative += `\n### Conexión entre circuitos\n`;
        narrative += `- El circuito de Asistencia **provee**: ${attendance.provides.join(', ')}\n`;
        narrative += `- El circuito de Nómina **consume**: datos de asistencia en el stage "Recolección de Datos"\n`;

        return {
            answer: narrative,
            circuitsInvolved: ['attendance', 'payroll'],
            totalStages: attendanceStages.length + payroll.stages.length - 1
        };
    }

    _explainNextSteps(question) {
        // Buscar stage mencionado
        for (const circuit of Object.values(CIRCUITS_REGISTRY)) {
            for (const stage of circuit.stages) {
                if (question.includes(stage.name.toLowerCase()) ||
                    question.includes(stage.key)) {
                    const nextStages = circuit.getNextStages(stage.key);

                    return {
                        answer: `Después de "${stage.name}" en el circuito ${circuit.name}:`,
                        nextStages: nextStages.map(n => ({
                            name: n.stage?.name,
                            description: n.stage?.description,
                            condition: n.transition.condition || 'Siempre'
                        }))
                    };
                }
            }
        }

        return {
            answer: 'No encontré ese paso en ningún circuito. ¿Puedes ser más específico?'
        };
    }

    _findApkForTask(question) {
        const apkCapabilities = {
            employee: [
                'fichar', 'fichaje', 'asistencia', 'check-in', 'check-out',
                'recibo', 'sueldo', 'vacaciones', 'solicitar permiso',
                'ver capacitaciones', 'datos personales', 'mi perfil'
            ],
            kiosk: [
                'kiosco', 'punto de fichaje', 'múltiples empleados',
                'fichaje masivo', 'entrada principal'
            ],
            medical: [
                'médico', 'salud', 'licencia', 'certificado',
                'historial médico', 'exámenes'
            ],
            admin: [
                'administrar', 'gestionar empresa', 'configurar',
                'reportes generales'
            ]
        };

        const matches = [];
        for (const [apk, keywords] of Object.entries(apkCapabilities)) {
            const matchCount = keywords.filter(kw => question.includes(kw)).length;
            if (matchCount > 0) {
                matches.push({ apk, matchCount });
            }
        }

        if (matches.length === 0) {
            return {
                answer: 'No pude determinar qué APK necesitas. Las opciones son:',
                apks: {
                    employee: 'Para empleados: fichar, ver recibos, solicitar vacaciones',
                    kiosk: 'Para puntos de fichaje: entrada masiva de empleados',
                    medical: 'Para personal médico: gestión de casos de salud',
                    admin: 'Para administradores: gestión general (en desarrollo)'
                }
            };
        }

        matches.sort((a, b) => b.matchCount - a.matchCount);
        const bestMatch = matches[0];

        const apkDescriptions = {
            employee: 'APK Employee (com.aponnt.attendance.employee) - Para que los empleados fichen, vean sus recibos, soliciten vacaciones, etc.',
            kiosk: 'APK Kiosk (com.aponnt.attendance.kiosk) - Para puntos de fichaje donde múltiples empleados registran asistencia.',
            medical: 'APK Medical (com.aponnt.attendance.medical) - Para personal médico que gestiona casos de salud ocupacional.',
            admin: 'APK Admin (com.aponnt.attendance.admin) - Para administradores del sistema (en desarrollo).'
        };

        return {
            answer: `Para esa tarea deberías usar: **${apkDescriptions[bestMatch.apk]}**`,
            recommendedApk: bestMatch.apk,
            downloadPath: `frontend_flutter/dist/aponnt-${bestMatch.apk}.apk`
        };
    }
}

// Singleton instance
let engineInstance = null;

function getCircuitTourEngine() {
    if (!engineInstance) {
        engineInstance = new CircuitTourEngine();
    }
    return engineInstance;
}

module.exports = {
    CircuitTourEngine,
    getCircuitTourEngine
};
