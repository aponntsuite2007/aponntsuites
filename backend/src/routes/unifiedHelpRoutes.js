/**
 * ============================================================================
 * UNIFIED HELP ROUTES v1.0
 * ============================================================================
 * API unificada del Centro de Ayuda
 *
 * Endpoints:
 *
 * CHAT IA:
 * - POST /api/v1/help/ask           - Preguntar a la IA
 * - POST /api/v1/help/feedback/:id  - Dar feedback (👍👎)
 *
 * TICKETS (via notificaciones):
 * - POST /api/v1/help/ticket        - Crear ticket de soporte
 * - GET  /api/v1/help/tickets       - Mis tickets
 * - GET  /api/v1/help/tickets/:id   - Detalle de ticket
 * - POST /api/v1/help/tickets/:id/reply - Responder
 * - POST /api/v1/help/tickets/:id/close - Cerrar ticket
 *
 * AYUDA CONTEXTUAL:
 * - GET  /api/v1/help/module/:key   - Ayuda del módulo
 * - GET  /api/v1/help/walkthrough/:key - Tutorial paso a paso
 *
 * GENERAL:
 * - GET  /api/v1/help/stats         - Estadísticas
 * - GET  /api/v1/help/history       - Historial unificado
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const unifiedHelpService = require('../services/UnifiedHelpService');

// =========================================================================
// MIDDLEWARE: Autenticación JWT
// =========================================================================

const authenticate = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                error: 'Token no proporcionado'
            });
        }

        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'aponnt_2024_secret_key_ultra_secure');

        req.user = {
            id: decoded.id || decoded.user_id,
            companyId: decoded.company_id || decoded.companyId,
            role: decoded.role,
            email: decoded.email
        };

        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            error: 'Token inválido o expirado'
        });
    }
};

// Aplicar autenticación a todas las rutas
router.use(authenticate);

// =========================================================================
// CHAT IA
// =========================================================================

/**
 * POST /api/v1/help/ask
 * Preguntar a la IA
 */
router.post('/ask', async (req, res) => {
    try {
        const { question, context } = req.body;

        if (!question || question.trim().length < 3) {
            return res.status(400).json({
                success: false,
                error: 'La pregunta debe tener al menos 3 caracteres'
            });
        }

        console.log(`[UNIFIED-HELP] Pregunta de ${req.user.id}: "${question.substring(0, 50)}..."`);

        const result = await unifiedHelpService.askQuestion(
            req.user.id,
            req.user.companyId,
            question.trim(),
            context || {}
        );

        res.json(result);

    } catch (error) {
        console.error('[UNIFIED-HELP] Error en /ask:', error);
        res.status(500).json({
            success: false,
            error: 'Error procesando la pregunta',
            suggestTicket: true
        });
    }
});

/**
 * POST /api/v1/help/feedback/:id
 * Dar feedback (👍👎)
 */
router.post('/feedback/:id', async (req, res) => {
    try {
        const { isHelpful, feedbackText } = req.body;

        if (typeof isHelpful !== 'boolean') {
            return res.status(400).json({
                success: false,
                error: 'isHelpful debe ser true o false'
            });
        }

        const result = await unifiedHelpService.recordFeedback(
            req.user.id,
            req.params.id,
            isHelpful,
            feedbackText
        );

        res.json(result);

    } catch (error) {
        console.error('[UNIFIED-HELP] Error en /feedback:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =========================================================================
// TICKETS DE SOPORTE
// =========================================================================

/**
 * POST /api/v1/help/ticket
 * Crear ticket de soporte
 */
router.post('/ticket', async (req, res) => {
    try {
        const { subject, message, category, priority, moduleContext } = req.body;

        if (!subject || !message) {
            return res.status(400).json({
                success: false,
                error: 'Se requiere asunto y mensaje'
            });
        }

        const result = await unifiedHelpService.createSupportTicket(
            req.user.id,
            req.user.companyId,
            {
                subject: subject.trim(),
                message: message.trim(),
                category: category || 'general',
                priority: priority || 'medium',
                moduleContext
            }
        );

        res.status(201).json(result);

    } catch (error) {
        console.error('[UNIFIED-HELP] Error creando ticket:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/v1/help/tickets
 * Obtener mis tickets
 */
router.get('/tickets', async (req, res) => {
    try {
        const { status, limit, offset } = req.query;

        const tickets = await unifiedHelpService.getMyTickets(
            req.user.id,
            req.user.companyId,
            {
                status,
                limit: parseInt(limit) || 20,
                offset: parseInt(offset) || 0
            }
        );

        res.json({
            success: true,
            tickets,
            count: tickets.length
        });

    } catch (error) {
        console.error('[UNIFIED-HELP] Error obteniendo tickets:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/v1/help/tickets/:threadId
 * Obtener detalle de ticket con mensajes
 */
router.get('/tickets/:threadId', async (req, res) => {
    try {
        const messages = await unifiedHelpService.getTicketMessages(
            req.user.id,
            req.user.companyId,
            req.params.threadId
        );

        res.json({
            success: true,
            messages,
            count: messages.length
        });

    } catch (error) {
        console.error('[UNIFIED-HELP] Error obteniendo mensajes:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/v1/help/tickets/:threadId/reply
 * Responder a ticket
 */
router.post('/tickets/:threadId/reply', async (req, res) => {
    try {
        const { message, isInternal } = req.body;

        if (!message || message.trim().length < 2) {
            return res.status(400).json({
                success: false,
                error: 'El mensaje es requerido'
            });
        }

        const result = await unifiedHelpService.replyToTicket(
            req.user.id,
            req.user.companyId,
            req.params.threadId,
            message.trim(),
            isInternal || false
        );

        res.json(result);

    } catch (error) {
        console.error('[UNIFIED-HELP] Error respondiendo ticket:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/v1/help/tickets/:threadId/close
 * Cerrar ticket con evaluación opcional
 */
router.post('/tickets/:threadId/close', async (req, res) => {
    try {
        const { rating, feedback } = req.body;

        const result = await unifiedHelpService.closeTicket(
            req.user.id,
            req.user.companyId,
            req.params.threadId,
            rating ? parseInt(rating) : null,
            feedback || null
        );

        res.json(result);

    } catch (error) {
        console.error('[UNIFIED-HELP] Error cerrando ticket:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =========================================================================
// AYUDA CONTEXTUAL
// =========================================================================

/**
 * GET /api/v1/help/module/:moduleKey
 * Obtener ayuda del módulo actual
 */
router.get('/module/:moduleKey', async (req, res) => {
    try {
        const result = await unifiedHelpService.getContextualHelp(
            req.params.moduleKey,
            req.user.companyId
        );

        res.json(result);

    } catch (error) {
        console.error('[UNIFIED-HELP] Error obteniendo ayuda:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/v1/help/walkthrough/:moduleKey
 * Obtener tutorial paso a paso
 */
router.get('/walkthrough/:moduleKey', async (req, res) => {
    try {
        const result = await unifiedHelpService.getWalkthrough(
            req.params.moduleKey,
            req.user.companyId
        );

        res.json(result);

    } catch (error) {
        console.error('[UNIFIED-HELP] Error obteniendo walkthrough:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =========================================================================
// ESTADÍSTICAS E HISTORIAL
// =========================================================================

/**
 * GET /api/v1/help/stats
 * Estadísticas del centro de ayuda
 */
router.get('/stats', async (req, res) => {
    try {
        const stats = await unifiedHelpService.getStats(
            req.user.id,
            req.user.companyId
        );

        res.json({
            success: true,
            stats
        });

    } catch (error) {
        console.error('[UNIFIED-HELP] Error obteniendo stats:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/v1/help/history
 * Historial unificado (chat + tickets)
 */
router.get('/history', async (req, res) => {
    try {
        const { limit, offset } = req.query;

        const history = await unifiedHelpService.getHistory(
            req.user.id,
            req.user.companyId,
            {
                limit: parseInt(limit) || 20,
                offset: parseInt(offset) || 0
            }
        );

        res.json({
            success: true,
            history,
            count: history.length
        });

    } catch (error) {
        console.error('[UNIFIED-HELP] Error obteniendo historial:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =========================================================================
// HEALTH CHECK
// =========================================================================

/**
 * GET /api/v1/help/health
 * Estado del sistema de ayuda
 */
router.get('/health', async (req, res) => {
    try {
        // Verificar Ollama
        let ollamaStatus = 'offline';
        try {
            const ollamaUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
            const response = await fetch(`${ollamaUrl}/api/tags`, { timeout: 3000 });
            if (response.ok) {
                ollamaStatus = 'online';
            }
        } catch (e) {
            ollamaStatus = 'offline';
        }

        res.json({
            success: true,
            status: 'operational',
            services: {
                chat_ia: ollamaStatus === 'online' ? 'available' : 'fallback_mode',
                tickets: 'available',
                contextual_help: 'available',
                notifications: 'available'
            },
            ollama: {
                status: ollamaStatus,
                model: process.env.OLLAMA_MODEL || 'llama3.1:8b'
            },
            version: '1.0.0'
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            status: 'error',
            error: error.message
        });
    }
});

module.exports = router;
