/**
 * ============================================================================
 * BUSINESS CIRCUIT SCHEMA
 * ============================================================================
 *
 * Define un circuito de negocio completo (flujo end-to-end).
 * Un circuito representa un proceso de negocio desde su inicio hasta su fin.
 *
 * Ejemplos:
 * - Circuito de Asistencia: Fichaje → Cálculo de horas → Reportes
 * - Circuito de Nómina: Asistencia → Cálculo → Liquidación → Recibo de sueldo
 * - Circuito Legal: Incidente → Investigación → Resolución
 *
 * CAPACIDADES:
 * - Definir stages secuenciales y paralelos
 * - Mapear módulos involucrados en cada stage
 * - Definir dependencias entre stages
 * - Generar "tours" guiados del circuito
 * - Calcular camino crítico
 *
 * Created: 2025-12-20
 * Phase: 8 - Business Circuits
 */

/**
 * Tipos de circuito de negocio
 */
const CircuitType = {
    OPERATIONAL: 'operational',     // Operaciones diarias (asistencia, fichaje)
    FINANCIAL: 'financial',         // Procesos financieros (nómina, facturación)
    LEGAL: 'legal',                 // Procesos legales (casos, contratos)
    COMMERCIAL: 'commercial',       // Procesos comerciales (leads, ventas)
    HR: 'hr',                       // Recursos Humanos (onboarding, vacaciones)
    COMPLIANCE: 'compliance',       // Cumplimiento normativo
    SUPPORT: 'support'              // Soporte y atención
};

/**
 * Estado de un stage dentro del circuito
 */
const StageStatus = {
    NOT_STARTED: 'not_started',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed',
    BLOCKED: 'blocked',
    SKIPPED: 'skipped',
    FAILED: 'failed'
};

/**
 * Tipos de transición entre stages
 */
const TransitionType = {
    SEQUENTIAL: 'sequential',       // A → B (uno después del otro)
    PARALLEL: 'parallel',           // A → [B, C] (ambos en paralelo)
    CONDITIONAL: 'conditional',     // A → B si condición, sino C
    LOOP: 'loop',                   // A → B → A (puede repetirse)
    OPTIONAL: 'optional'            // A → B? → C (B es opcional)
};

/**
 * Clase Stage - Un paso dentro de un circuito
 */
class CircuitStage {
    constructor(config = {}) {
        this.id = config.id || `stage_${Date.now()}`;
        this.key = config.key || null;              // Clave única: "biometric_capture"
        this.name = config.name || 'Unknown Stage';
        this.description = config.description || '';
        this.order = config.order || 0;             // Orden en el circuito

        // Módulos involucrados en este stage
        this.modules = config.modules || [];        // ['attendance', 'biometric']

        // Servicios que ejecutan este stage
        this.services = config.services || [];      // ['BiometricService', 'AttendanceService']

        // Endpoints relevantes
        this.endpoints = config.endpoints || [];    // ['/api/v2/biometric/capture']

        // APKs que pueden ejecutar este stage
        this.apks = config.apks || [];              // ['employee', 'kiosk']

        // Datos de entrada requeridos
        this.inputs = config.inputs || [];          // ['user_id', 'company_id']

        // Datos de salida producidos
        this.outputs = config.outputs || [];        // ['attendance_id', 'timestamp']

        // Eventos emitidos
        this.events = config.events || [];          // ['attendance.created']

        // Validaciones requeridas
        this.validations = config.validations || [];

        // Tiempo estimado (en minutos)
        this.estimatedTime = config.estimatedTime || 1;

        // Es stage crítico (no puede fallar)
        this.isCritical = config.isCritical !== false;

        // Stage alternativo si este falla
        this.fallbackStage = config.fallbackStage || null;

        // Metadatos para el tour
        this.tour = config.tour || {
            explanation: '',           // Explicación para el usuario
            businessValue: '',         // Por qué es importante
            commonIssues: [],          // Problemas frecuentes
            tips: []                   // Consejos
        };
    }

    toJSON() {
        return {
            id: this.id,
            key: this.key,
            name: this.name,
            description: this.description,
            order: this.order,
            modules: this.modules,
            services: this.services,
            endpoints: this.endpoints,
            apks: this.apks,
            inputs: this.inputs,
            outputs: this.outputs,
            events: this.events,
            validations: this.validations,
            estimatedTime: this.estimatedTime,
            isCritical: this.isCritical,
            fallbackStage: this.fallbackStage,
            tour: this.tour
        };
    }
}

/**
 * Clase Transition - Conexión entre stages
 */
class CircuitTransition {
    constructor(config = {}) {
        this.from = config.from;                    // Stage origen
        this.to = config.to;                        // Stage destino (o array para parallel)
        this.type = config.type || TransitionType.SEQUENTIAL;
        this.condition = config.condition || null;  // Condición para CONDITIONAL
        this.label = config.label || '';            // Etiqueta de la transición

        // Para transiciones condicionales
        this.onTrue = config.onTrue || null;        // Stage si true
        this.onFalse = config.onFalse || null;      // Stage si false
    }

    toJSON() {
        return {
            from: this.from,
            to: this.to,
            type: this.type,
            condition: this.condition,
            label: this.label,
            onTrue: this.onTrue,
            onFalse: this.onFalse
        };
    }
}

/**
 * Clase BusinessCircuit - Circuito de negocio completo
 */
class BusinessCircuit {
    constructor(config = {}) {
        // === IDENTIDAD ===
        this.id = config.id || `circuit_${Date.now()}`;
        this.key = config.key || null;              // 'payroll', 'attendance', 'legal'
        this.name = config.name || 'Unknown Circuit';
        this.type = config.type || CircuitType.OPERATIONAL;
        this.version = config.version || '1.0.0';

        // === DESCRIPCIÓN ===
        this.description = config.description || '';
        this.businessPurpose = config.businessPurpose || '';
        this.icon = config.icon || 'fa-project-diagram';
        this.color = config.color || '#3b82f6';

        // === STAGES ===
        this.stages = (config.stages || []).map(s =>
            s instanceof CircuitStage ? s : new CircuitStage(s)
        );

        // === TRANSICIONES ===
        this.transitions = (config.transitions || []).map(t =>
            t instanceof CircuitTransition ? t : new CircuitTransition(t)
        );

        // === PARTICIPANTES ===
        this.roles = config.roles || [];            // Roles involucrados
        this.departments = config.departments || []; // Departamentos

        // === DATOS DEL CIRCUITO ===
        this.startPoint = config.startPoint || null;    // Stage inicial
        this.endPoints = config.endPoints || [];        // Stages finales (puede haber varios)

        // === DEPENDENCIAS ===
        this.dependsOn = config.dependsOn || [];        // Otros circuitos requeridos
        this.provides = config.provides || [];          // Datos que produce para otros circuitos

        // === MÉTRICAS ===
        this.metrics = config.metrics || {
            avgDuration: null,          // Duración promedio
            successRate: null,          // Tasa de éxito
            bottlenecks: [],            // Cuellos de botella detectados
            lastExecution: null
        };

        // === TOUR ===
        this.tour = config.tour || {
            introduction: '',           // Introducción al circuito
            stepsOverview: '',          // Resumen de pasos
            businessImpact: '',         // Impacto en el negocio
            relatedCircuits: [],        // Circuitos relacionados
            faqs: []                    // Preguntas frecuentes
        };

        // === EJEMPLO ===
        this.example = config.example || {
            scenario: '',               // Escenario de ejemplo
            inputData: {},              // Datos de entrada de ejemplo
            expectedOutput: {},         // Salida esperada
            walkthrough: []             // Pasos detallados
        };

        // === TIMESTAMPS ===
        this.createdAt = config.createdAt || new Date().toISOString();
        this.updatedAt = config.updatedAt || new Date().toISOString();
    }

    // =========================================================================
    // MÉTODOS DE ANÁLISIS
    // =========================================================================

    /**
     * Obtener stage por key
     */
    getStage(key) {
        return this.stages.find(s => s.key === key);
    }

    /**
     * Obtener stages ordenados
     */
    getOrderedStages() {
        return [...this.stages].sort((a, b) => a.order - b.order);
    }

    /**
     * Obtener siguiente(s) stage(s) desde uno dado
     */
    getNextStages(stageKey) {
        const transitions = this.transitions.filter(t => t.from === stageKey);
        const nextStages = [];

        for (const t of transitions) {
            if (Array.isArray(t.to)) {
                nextStages.push(...t.to.map(key => ({
                    stage: this.getStage(key),
                    transition: t
                })));
            } else {
                nextStages.push({
                    stage: this.getStage(t.to),
                    transition: t
                });
            }
        }

        return nextStages;
    }

    /**
     * Obtener stage(s) anterior(es)
     */
    getPreviousStages(stageKey) {
        const transitions = this.transitions.filter(t => {
            if (Array.isArray(t.to)) {
                return t.to.includes(stageKey);
            }
            return t.to === stageKey;
        });

        return transitions.map(t => ({
            stage: this.getStage(t.from),
            transition: t
        }));
    }

    /**
     * Obtener todos los módulos del circuito
     */
    getAllModules() {
        const modules = new Set();
        for (const stage of this.stages) {
            stage.modules.forEach(m => modules.add(m));
        }
        return Array.from(modules);
    }

    /**
     * Obtener todas las APKs involucradas
     */
    getAllApks() {
        const apks = new Set();
        for (const stage of this.stages) {
            stage.apks.forEach(a => apks.add(a));
        }
        return Array.from(apks);
    }

    /**
     * Obtener todos los servicios del circuito
     */
    getAllServices() {
        const services = new Set();
        for (const stage of this.stages) {
            stage.services.forEach(s => services.add(s));
        }
        return Array.from(services);
    }

    /**
     * Calcular duración total estimada
     */
    getEstimatedDuration() {
        return this.stages.reduce((sum, s) => sum + (s.estimatedTime || 0), 0);
    }

    /**
     * Identificar camino crítico (stages que no pueden fallar)
     */
    getCriticalPath() {
        return this.stages.filter(s => s.isCritical);
    }

    /**
     * Validar integridad del circuito
     */
    validate() {
        const errors = [];

        // Debe tener al menos un stage
        if (this.stages.length === 0) {
            errors.push('Circuito debe tener al menos un stage');
        }

        // Debe tener punto de inicio
        if (!this.startPoint) {
            errors.push('Circuito debe tener un punto de inicio (startPoint)');
        } else if (!this.getStage(this.startPoint)) {
            errors.push(`Stage de inicio '${this.startPoint}' no existe`);
        }

        // Debe tener al menos un punto final
        if (!this.endPoints || this.endPoints.length === 0) {
            errors.push('Circuito debe tener al menos un punto final (endPoints)');
        }

        // Verificar que todas las transiciones referencien stages válidos
        for (const t of this.transitions) {
            if (!this.getStage(t.from)) {
                errors.push(`Transición referencia stage origen inexistente: ${t.from}`);
            }
            const destinations = Array.isArray(t.to) ? t.to : [t.to];
            for (const dest of destinations) {
                if (!this.getStage(dest)) {
                    errors.push(`Transición referencia stage destino inexistente: ${dest}`);
                }
            }
        }

        // Verificar que no haya stages huérfanos (sin transiciones)
        for (const stage of this.stages) {
            if (stage.key === this.startPoint) continue;

            const hasIncoming = this.transitions.some(t => {
                const destinations = Array.isArray(t.to) ? t.to : [t.to];
                return destinations.includes(stage.key);
            });

            if (!hasIncoming) {
                errors.push(`Stage '${stage.key}' no tiene transiciones entrantes`);
            }
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    // =========================================================================
    // GENERACIÓN DE TOURS
    // =========================================================================

    /**
     * Generar tour completo del circuito
     */
    generateTour() {
        const orderedStages = this.getOrderedStages();

        return {
            circuit: {
                key: this.key,
                name: this.name,
                type: this.type,
                description: this.description,
                businessPurpose: this.businessPurpose,
                introduction: this.tour.introduction
            },
            overview: {
                totalStages: this.stages.length,
                estimatedDuration: `${this.getEstimatedDuration()} minutos`,
                modulesInvolved: this.getAllModules(),
                apksInvolved: this.getAllApks(),
                servicesInvolved: this.getAllServices(),
                criticalStages: this.getCriticalPath().length
            },
            steps: orderedStages.map((stage, index) => ({
                step: index + 1,
                key: stage.key,
                name: stage.name,
                description: stage.description,
                explanation: stage.tour.explanation,
                businessValue: stage.tour.businessValue,
                modules: stage.modules,
                apks: stage.apks,
                inputs: stage.inputs,
                outputs: stage.outputs,
                endpoints: stage.endpoints,
                estimatedTime: `${stage.estimatedTime} min`,
                isCritical: stage.isCritical,
                tips: stage.tour.tips,
                commonIssues: stage.tour.commonIssues,
                nextStages: this.getNextStages(stage.key).map(n => ({
                    key: n.stage?.key,
                    name: n.stage?.name,
                    transitionType: n.transition.type,
                    condition: n.transition.condition
                }))
            })),
            example: this.example,
            relatedCircuits: this.tour.relatedCircuits,
            faqs: this.tour.faqs
        };
    }

    /**
     * Generar tour resumido (para chat de IA)
     */
    generateQuickTour() {
        const orderedStages = this.getOrderedStages();

        let narrative = `## ${this.name}\n\n`;
        narrative += `${this.tour.introduction || this.description}\n\n`;
        narrative += `### Pasos del proceso:\n\n`;

        for (let i = 0; i < orderedStages.length; i++) {
            const stage = orderedStages[i];
            const nextStages = this.getNextStages(stage.key);

            narrative += `**${i + 1}. ${stage.name}**\n`;
            narrative += `   ${stage.tour.explanation || stage.description}\n`;
            narrative += `   - Módulos: ${stage.modules.join(', ') || 'N/A'}\n`;
            narrative += `   - APKs: ${stage.apks.join(', ') || 'Web'}\n`;

            if (nextStages.length > 0) {
                const nextNames = nextStages
                    .filter(n => n.stage)
                    .map(n => n.stage.name)
                    .join(', ');
                narrative += `   → Siguiente: ${nextNames}\n`;
            }
            narrative += `\n`;
        }

        narrative += `### Resumen\n`;
        narrative += `- Duración estimada: ${this.getEstimatedDuration()} minutos\n`;
        narrative += `- Módulos involucrados: ${this.getAllModules().length}\n`;
        narrative += `- Stages críticos: ${this.getCriticalPath().length}\n`;

        return narrative;
    }

    /**
     * Responder pregunta sobre el circuito
     */
    answerQuestion(question) {
        const q = question.toLowerCase();

        // ¿Cuántos pasos tiene?
        if (q.includes('cuántos pasos') || q.includes('cuantos pasos')) {
            return `El circuito ${this.name} tiene ${this.stages.length} pasos/stages.`;
        }

        // ¿Cuánto dura?
        if (q.includes('cuánto dura') || q.includes('cuanto dura') || q.includes('tiempo')) {
            return `El circuito ${this.name} tiene una duración estimada de ${this.getEstimatedDuration()} minutos.`;
        }

        // ¿Qué módulos usa?
        if (q.includes('módulos') || q.includes('modulos')) {
            return `El circuito ${this.name} involucra estos módulos: ${this.getAllModules().join(', ')}.`;
        }

        // ¿Qué APKs?
        if (q.includes('apk') || q.includes('app') || q.includes('móvil')) {
            const apks = this.getAllApks();
            return apks.length > 0
                ? `El circuito ${this.name} puede ejecutarse desde: ${apks.join(', ')}.`
                : `El circuito ${this.name} solo se ejecuta desde la web.`;
        }

        // ¿Cómo empieza?
        if (q.includes('empieza') || q.includes('inicio') || q.includes('comienza')) {
            const start = this.getStage(this.startPoint);
            return start
                ? `El circuito ${this.name} comienza con: ${start.name} - ${start.description}`
                : `El punto de inicio es: ${this.startPoint}`;
        }

        // ¿Cómo termina?
        if (q.includes('termina') || q.includes('fin') || q.includes('final')) {
            const ends = this.endPoints.map(key => this.getStage(key)?.name || key);
            return `El circuito ${this.name} puede terminar en: ${ends.join(' o ')}.`;
        }

        // Default: generar tour rápido
        return this.generateQuickTour();
    }

    // =========================================================================
    // SERIALIZACIÓN
    // =========================================================================

    toJSON() {
        return {
            id: this.id,
            key: this.key,
            name: this.name,
            type: this.type,
            version: this.version,
            description: this.description,
            businessPurpose: this.businessPurpose,
            icon: this.icon,
            color: this.color,
            stages: this.stages.map(s => s.toJSON()),
            transitions: this.transitions.map(t => t.toJSON()),
            roles: this.roles,
            departments: this.departments,
            startPoint: this.startPoint,
            endPoints: this.endPoints,
            dependsOn: this.dependsOn,
            provides: this.provides,
            metrics: this.metrics,
            tour: this.tour,
            example: this.example,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }

    static fromJSON(data) {
        return new BusinessCircuit(data);
    }
}

module.exports = {
    BusinessCircuit,
    CircuitStage,
    CircuitTransition,
    CircuitType,
    StageStatus,
    TransitionType
};
