/**
 * ============================================================================
 * SYSTEM LOGGER - SISTEMA DE LOGGING SISTEMÁTICO PROFESIONAL
 * ============================================================================
 *
 * Logger centralizado con:
 * - Niveles jerárquicos (DEBUG → INFO → WARN → ERROR → FATAL)
 * - Categorías por componente ([DB], [WS], [ORCHESTRATOR], etc.)
 * - Tracking de fases del ciclo (INIT → TEST → ANALYZE → REPAIR → VALIDATE → COMPLETE)
 * - Formato consistente ISO 8601
 * - Integración con Knowledge Base
 *
 * @version 1.0.0
 * @date 2025-11-01
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');
const LogLevels = require('./LogLevels');
const LogCategories = require('./LogCategories');
const PhaseTracker = require('./PhaseTracker');

class SystemLogger {
    constructor(config = {}) {
        this.config = {
            minLevel: config.minLevel || process.env.LOG_LEVEL || 'INFO',
            enableColors: config.enableColors !== false,
            enableFile: config.enableFile || false,
            logDir: config.logDir || path.join(__dirname, '../../logs'),
            enableKnowledgeCapture: config.enableKnowledgeCapture !== false,
            includeTimestamp: config.includeTimestamp !== false,
            includePhase: config.includePhase !== false,
            timestampFormat: config.timestampFormat || 'ISO', // ISO | UNIX | HUMAN
            ...config
        };

        this.phaseTracker = new PhaseTracker();
        this.logBuffer = [];
        this.knowledgeEvents = [];

        // Crear directorio de logs si no existe
        if (this.config.enableFile && !fs.existsSync(this.config.logDir)) {
            fs.mkdirSync(this.config.logDir, { recursive: true });
        }

        // Escuchar eventos de fase
        this.phaseTracker.on('phase-changed', (event) => {
            this.capturePhaseEvent('PHASE_CHANGE', event);
        });

        this.phaseTracker.on('cycle-completed', (event) => {
            this.capturePhaseEvent('CYCLE_COMPLETE', event);
        });
    }

    /**
     * Formatear timestamp según configuración
     */
    formatTimestamp() {
        const now = new Date();

        switch (this.config.timestampFormat) {
            case 'ISO':
                return now.toISOString();
            case 'UNIX':
                return now.getTime().toString();
            case 'HUMAN':
                return now.toLocaleString('es-AR', {
                    timeZone: 'America/Argentina/Buenos_Aires'
                });
            default:
                return now.toISOString();
        }
    }

    /**
     * Construir mensaje de log formateado
     */
    buildLogMessage(level, category, message, metadata = {}) {
        const levelObj = LogLevels.getLevel(level);
        const categoryObj = LogCategories.getCategory(category);
        const currentPhase = this.phaseTracker.getCurrentPhase();

        // Componentes del mensaje
        const parts = [];

        // Timestamp
        if (this.config.includeTimestamp) {
            parts.push(`[${this.formatTimestamp()}]`);
        }

        // Level
        const levelStr = this.config.enableColors
            ? `${levelObj.color}[${levelObj.name}]${LogLevels.RESET}`
            : `[${levelObj.name}]`;
        parts.push(levelStr);

        // Category
        const categoryStr = this.config.enableColors
            ? `${categoryObj.color}[${categoryObj.shortName}]${LogCategories.RESET}`
            : `[${categoryObj.shortName}]`;
        parts.push(categoryStr);

        // Phase (si está habilitado y hay fase actual)
        if (this.config.includePhase && currentPhase) {
            parts.push(`[PHASE:${currentPhase.name}]`);
        }

        // Mensaje
        parts.push(message);

        // Metadata (si existe)
        if (Object.keys(metadata).length > 0) {
            parts.push(JSON.stringify(metadata));
        }

        return parts.join(' ');
    }

    /**
     * Log genérico
     */
    log(level, category, message, metadata = {}) {
        // Verificar si debe loggearse según nivel mínimo
        if (!LogLevels.shouldLog(level, this.config.minLevel)) {
            return;
        }

        const formattedMessage = this.buildLogMessage(level, category, message, metadata);

        // Output a consola
        console.log(formattedMessage);

        // Guardar en buffer
        this.logBuffer.push({
            timestamp: this.formatTimestamp(),
            level,
            category,
            phase: this.phaseTracker.getCurrentPhase()?.name || null,
            message,
            metadata
        });

        // Escribir a archivo si está habilitado
        if (this.config.enableFile) {
            this.writeToFile(formattedMessage);
        }

        // Capturar para Knowledge Base
        if (this.config.enableKnowledgeCapture) {
            this.captureForKnowledge(level, category, message, metadata);
        }
    }

    /**
     * Métodos de conveniencia por nivel
     */
    debug(category, message, metadata) {
        this.log('DEBUG', category, message, metadata);
    }

    info(category, message, metadata) {
        this.log('INFO', category, message, metadata);
    }

    warn(category, message, metadata) {
        this.log('WARN', category, message, metadata);
    }

    error(category, message, metadata) {
        this.log('ERROR', category, message, metadata);
    }

    fatal(category, message, metadata) {
        this.log('FATAL', category, message, metadata);
    }

    /**
     * Separador visual para mayor claridad
     */
    separator(char = '=', length = 80) {
        console.log(char.repeat(length));
    }

    /**
     * Header para secciones importantes
     */
    header(title, icon = '🚀') {
        this.separator('=');
        console.log(`${icon} ${title.toUpperCase()}`);
        this.separator('=');
    }

    /**
     * Escribir a archivo
     */
    writeToFile(message) {
        try {
            const logFile = path.join(
                this.config.logDir,
                `system-${new Date().toISOString().split('T')[0]}.log`
            );

            fs.appendFileSync(logFile, message + '\n', 'utf8');
        } catch (error) {
            console.error('Error writing to log file:', error.message);
        }
    }

    /**
     * Capturar evento de fase
     */
    capturePhaseEvent(eventType, eventData) {
        this.knowledgeEvents.push({
            type: eventType,
            timestamp: new Date().toISOString(),
            data: eventData
        });
    }

    /**
     * Capturar para Knowledge Base
     */
    captureForKnowledge(level, category, message, metadata) {
        // Solo capturar eventos importantes (WARN, ERROR, FATAL)
        if (!['WARN', 'ERROR', 'FATAL'].includes(level.toUpperCase())) {
            return;
        }

        this.knowledgeEvents.push({
            type: 'LOG_EVENT',
            level,
            category,
            phase: this.phaseTracker.getCurrentPhase()?.name || null,
            message,
            metadata,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Iniciar ciclo de testing/repair
     */
    startCycle(executionId) {
        this.phaseTracker.startCycle(executionId);
        this.header(`CICLO INICIADO - ${executionId}`, '🔄');
        this.info('SYSTEM', `Nuevo ciclo de testing iniciado`, { executionId });
    }

    /**
     * Entrar a una fase
     */
    enterPhase(phaseName) {
        const phase = PhaseTracker.Phases[phaseName.toUpperCase()];
        if (!phase) {
            this.warn('SYSTEM', `Fase desconocida: ${phaseName}`);
            return;
        }

        this.phaseTracker.enterPhase(phaseName);
        this.separator('-');
        this.info('SYSTEM', `${phase.icon} Entrando a fase: ${phase.name}`, {
            phase: phase.name,
            description: phase.description
        });
    }

    /**
     * Salir de fase actual
     */
    exitPhase() {
        const currentPhase = this.phaseTracker.getCurrentPhase();
        if (!currentPhase) return;

        const duration = this.phaseTracker.getPhaseDuration(currentPhase.name);
        this.phaseTracker.exitPhase();

        this.info('SYSTEM', `Saliendo de fase: ${currentPhase.name}`, {
            phase: currentPhase.name,
            duration: `${duration}ms`
        });
    }

    /**
     * Completar ciclo
     */
    completeCycle() {
        this.phaseTracker.completeCycle();
        const summary = this.phaseTracker.getSummary();

        this.separator('=');
        this.info('SYSTEM', '🎉 Ciclo completado', summary);
        this.separator('=');

        return summary;
    }

    /**
     * Obtener resumen del ciclo actual
     */
    getCycleSummary() {
        return this.phaseTracker.getSummary();
    }

    /**
     * Obtener eventos capturados para Knowledge Base
     */
    getKnowledgeEvents() {
        return [...this.knowledgeEvents];
    }

    /**
     * Limpiar eventos y buffer
     */
    clear() {
        this.logBuffer = [];
        this.knowledgeEvents = [];
    }

    /**
     * Obtener logs del buffer
     */
    getLogs(filter = {}) {
        let logs = [...this.logBuffer];

        if (filter.level) {
            logs = logs.filter(log => log.level === filter.level);
        }

        if (filter.category) {
            logs = logs.filter(log => log.category === filter.category);
        }

        if (filter.phase) {
            logs = logs.filter(log => log.phase === filter.phase);
        }

        if (filter.since) {
            const sinceDate = new Date(filter.since);
            logs = logs.filter(log => new Date(log.timestamp) >= sinceDate);
        }

        return logs;
    }

    /**
     * Exportar logs a archivo JSON
     */
    exportLogs(filename) {
        const exportPath = path.join(this.config.logDir, filename);
        const data = {
            exportedAt: new Date().toISOString(),
            cycleSummary: this.getCycleSummary(),
            logs: this.logBuffer,
            knowledgeEvents: this.knowledgeEvents
        };

        fs.writeFileSync(exportPath, JSON.stringify(data, null, 2), 'utf8');
        this.info('SYSTEM', `Logs exportados a: ${exportPath}`);

        return exportPath;
    }
}

// Singleton instance
let instance = null;

/**
 * Obtener instancia singleton del logger
 */
SystemLogger.getInstance = function(config) {
    if (!instance) {
        instance = new SystemLogger(config);
    }
    return instance;
};

/**
 * Crear nueva instancia independiente
 */
SystemLogger.createLogger = function(config) {
    return new SystemLogger(config);
};

module.exports = SystemLogger;
