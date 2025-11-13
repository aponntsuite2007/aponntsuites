/**
 * ============================================================================
 * LOG LEVELS - NIVELES JERÁRQUICOS DE LOGGING
 * ============================================================================
 *
 * Jerarquía estándar de severidad:
 * DEBUG → INFO → WARN → ERROR → FATAL
 *
 * @version 1.0.0
 * @date 2025-11-01
 * ============================================================================
 */

const LogLevels = {
    DEBUG: {
        name: 'DEBUG',
        priority: 0,
        color: '\x1b[36m',  // Cyan
        icon: '🔍',
        description: 'Información detallada para debugging'
    },
    INFO: {
        name: 'INFO',
        priority: 1,
        color: '\x1b[32m',  // Green
        icon: '✅',
        description: 'Información general del sistema'
    },
    WARN: {
        name: 'WARN',
        priority: 2,
        color: '\x1b[33m',  // Yellow
        icon: '⚠️',
        description: 'Advertencias que no detienen el sistema'
    },
    ERROR: {
        name: 'ERROR',
        priority: 3,
        color: '\x1b[31m',  // Red
        icon: '❌',
        description: 'Errores recuperables'
    },
    FATAL: {
        name: 'FATAL',
        priority: 4,
        color: '\x1b[35m',  // Magenta
        icon: '💀',
        description: 'Errores críticos que detienen el sistema'
    }
};

// Color reset
LogLevels.RESET = '\x1b[0m';

/**
 * Determinar si un nivel debe ser loggeado según el nivel mínimo configurado
 */
LogLevels.shouldLog = function(currentLevel, minLevel) {
    const current = LogLevels[currentLevel];
    const minimum = LogLevels[minLevel];

    if (!current || !minimum) return false;

    return current.priority >= minimum.priority;
};

/**
 * Obtener el nivel por nombre
 */
LogLevels.getLevel = function(name) {
    return LogLevels[name.toUpperCase()] || LogLevels.INFO;
};

module.exports = LogLevels;
