/**
 * ============================================================================
 * AUTO-REPAIR API ROUTES - API REST para Sistema de Auto-Reparación
 * ============================================================================
 *
 * Endpoints para controlar el servicio de auto-reparación desde el frontend.
 *
 * @version 1.0.0
 * @date 2025-10-30
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const ClaudeCodeAutoRepairService = require('../services/ClaudeCodeAutoRepairService');

// Instancia singleton del servicio
let autoRepairService = null;

/**
 * Inicializar servicio si no existe
 */
function getService() {
    if (!autoRepairService) {
        autoRepairService = new ClaudeCodeAutoRepairService({
            mode: process.env.AUTO_REPAIR_MODE || 'manual',
            claudeCodeApiPath: process.env.CLAUDE_CODE_CLI_PATH || null,
            claudeCodeApiUrl: process.env.CLAUDE_CODE_API_URL || null
        });
    }
    return autoRepairService;
}

/**
 * GET /api/auto-repair/status
 * Obtener estado del servicio
 */
router.get('/status', async (req, res) => {
    try {
        const service = getService();
        const status = service.getStatus();

        res.json({
            success: true,
            status
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/auto-repair/start
 * Iniciar servicio
 */
router.post('/start', async (req, res) => {
    try {
        const service = getService();

        if (service.state.running) {
            return res.json({
                success: true,
                message: 'Servicio ya está corriendo',
                status: service.getStatus()
            });
        }

        await service.start();

        res.json({
            success: true,
            message: 'Servicio iniciado correctamente',
            status: service.getStatus()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/auto-repair/stop
 * Detener servicio
 */
router.post('/stop', async (req, res) => {
    try {
        const service = getService();

        if (!service.state.running) {
            return res.json({
                success: true,
                message: 'Servicio ya está detenido',
                status: service.getStatus()
            });
        }

        await service.stop();

        res.json({
            success: true,
            message: 'Servicio detenido correctamente',
            status: service.getStatus()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/auto-repair/restart
 * Reiniciar servicio
 */
router.post('/restart', async (req, res) => {
    try {
        const service = getService();
        await service.restart();

        res.json({
            success: true,
            message: 'Servicio reiniciado correctamente',
            status: service.getStatus()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/auto-repair/mode
 * Cambiar modo de operación
 * Body: { mode: 'manual' | 'auto' }
 */
router.post('/mode', async (req, res) => {
    try {
        const { mode } = req.body;

        if (!mode || !['manual', 'auto'].includes(mode)) {
            return res.status(400).json({
                success: false,
                error: 'Modo inválido. Usar: manual | auto'
            });
        }

        const service = getService();
        await service.setMode(mode);

        res.json({
            success: true,
            message: `Modo cambiado a: ${mode}`,
            status: service.getStatus()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/auto-repair/config
 * Configurar API de Claude Code
 * Body: { cliPath?: string, apiUrl?: string }
 */
router.post('/config', async (req, res) => {
    try {
        const { cliPath, apiUrl } = req.body;

        if (!cliPath && !apiUrl) {
            return res.status(400).json({
                success: false,
                error: 'Debe proporcionar cliPath o apiUrl'
            });
        }

        const service = getService();
        service.setClaudeCodeApi({ cliPath, apiUrl });

        res.json({
            success: true,
            message: 'API de Claude Code configurada',
            config: {
                hasCliPath: !!service.config.claudeCodeApiPath,
                hasApiUrl: !!service.config.claudeCodeApiUrl
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/auto-repair/queue
 * Obtener cola de tickets pendientes (MODO MANUAL)
 */
router.get('/queue', async (req, res) => {
    try {
        const service = getService();
        const queue = service.getQueue();

        res.json({
            success: true,
            queue,
            count: queue.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/auto-repair/history
 * Obtener historial de procesamiento
 * Query: ?limit=50
 */
router.get('/history', async (req, res) => {
    try {
        const service = getService();
        const limit = parseInt(req.query.limit) || 50;
        const history = service.getHistory(limit);

        res.json({
            success: true,
            history,
            count: history.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/auto-repair/process-ticket
 * Marcar ticket como procesado manualmente (MODO MANUAL)
 * Body: { ticketId: string, success: boolean, message?: string }
 */
router.post('/process-ticket', async (req, res) => {
    try {
        const { ticketId, success, message } = req.body;

        if (!ticketId || success === undefined) {
            return res.status(400).json({
                success: false,
                error: 'Debe proporcionar ticketId y success'
            });
        }

        const service = getService();

        await service.markTicketAsProcessed(ticketId, {
            success,
            message: message || (success ? 'Procesado manualmente' : 'Falló al procesar'),
            mode: 'manual',
            processedAt: new Date().toISOString()
        });

        res.json({
            success: true,
            message: `Ticket ${ticketId} marcado como procesado`
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/auto-repair/next-ticket
 * Obtener siguiente ticket de la cola (MODO MANUAL)
 */
router.get('/next-ticket', async (req, res) => {
    try {
        const service = getService();
        const ticket = service.getNextTicket();

        if (!ticket) {
            return res.json({
                success: true,
                ticket: null,
                message: 'No hay tickets pendientes'
            });
        }

        res.json({
            success: true,
            ticket
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
