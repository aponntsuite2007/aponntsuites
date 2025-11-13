/**
 * ============================================================================
 * LOG CATEGORIES - CATEGORÍAS POR COMPONENTE DEL SISTEMA
 * ============================================================================
 *
 * Cada componente tiene su categoría para filtrado y análisis sistemático.
 *
 * @version 1.0.0
 * @date 2025-11-01
 * ============================================================================
 */

const LogCategories = {
    // Core System
    SYSTEM: {
        name: 'SYSTEM',
        shortName: 'SYS',
        color: '\x1b[37m',  // White
        description: 'Sistema general'
    },

    // Database
    DB: {
        name: 'DATABASE',
        shortName: 'DB',
        color: '\x1b[34m',  // Blue
        description: 'Operaciones de base de datos'
    },

    // WebSocket
    WS: {
        name: 'WEBSOCKET',
        shortName: 'WS',
        color: '\x1b[36m',  // Cyan
        description: 'Comunicación WebSocket'
    },

    // Test Orchestrator
    ORCHESTRATOR: {
        name: 'ORCHESTRATOR',
        shortName: 'ORCH',
        color: '\x1b[35m',  // Magenta
        description: 'Orquestador de tests'
    },

    // Test Execution
    TEST: {
        name: 'TEST',
        shortName: 'TEST',
        color: '\x1b[33m',  // Yellow
        description: 'Ejecución de tests'
    },

    // Ollama AI
    OLLAMA: {
        name: 'OLLAMA',
        shortName: 'AI',
        color: '\x1b[95m',  // Bright Magenta
        description: 'Análisis con Ollama'
    },

    // Auto-Repair
    REPAIR: {
        name: 'REPAIR',
        shortName: 'FIX',
        color: '\x1b[32m',  // Green
        description: 'Sistema de auto-reparación'
    },

    // Puppeteer
    BROWSER: {
        name: 'BROWSER',
        shortName: 'BROW',
        color: '\x1b[96m',  // Bright Cyan
        description: 'Navegador Puppeteer'
    },

    // Knowledge Base
    KNOWLEDGE: {
        name: 'KNOWLEDGE',
        shortName: 'KB',
        color: '\x1b[94m',  // Bright Blue
        description: 'Base de conocimiento'
    },

    // Ticket Generation
    TICKET: {
        name: 'TICKET',
        shortName: 'TIK',
        color: '\x1b[93m',  // Bright Yellow
        description: 'Generación de tickets'
    }
};

// Color reset
LogCategories.RESET = '\x1b[0m';

/**
 * Obtener categoría por nombre
 */
LogCategories.getCategory = function(name) {
    const upperName = name.toUpperCase();
    return LogCategories[upperName] || LogCategories.SYSTEM;
};

/**
 * Listar todas las categorías disponibles
 */
LogCategories.listAll = function() {
    return Object.keys(LogCategories)
        .filter(key => typeof LogCategories[key] === 'object')
        .map(key => LogCategories[key]);
};

module.exports = LogCategories;
