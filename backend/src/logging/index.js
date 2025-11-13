/**
 * ============================================================================
 * LOGGING SYSTEM - EXPORTS
 * ============================================================================
 *
 * Sistema de logging sistemático profesional
 *
 * @version 1.0.0
 * @date 2025-11-01
 * ============================================================================
 */

const SystemLogger = require('./SystemLogger');
const LogLevels = require('./LogLevels');
const LogCategories = require('./LogCategories');
const PhaseTracker = require('./PhaseTracker');

module.exports = {
    SystemLogger,
    LogLevels,
    LogCategories,
    PhaseTracker,

    // Singleton getter
    getLogger: (config) => SystemLogger.getInstance(config),

    // Factory
    createLogger: (config) => SystemLogger.createLogger(config)
};
