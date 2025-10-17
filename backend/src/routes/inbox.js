/**
 * INBOX ROUTES - Bandeja de Notificaciones
 *
 * API para gestionar notificaciones agrupadas en conversaciones
 *
 * @version 1.0
 * @date 2025-10-17
 */

const express = require('express');
const router = express.Router();
const inboxService = require('../services/inboxService');

// Middleware de autenticación simple
const authenticate = (req, res, next) => {
    req.user = {
        employee_id: req.headers['x-employee-id'] || 'EMP-001',
        company_id: parseInt(req.headers['x-company-id']) || 11,
        role: req.headers['x-role'] || 'employee'
    };
    next();
};

router.use(authenticate);

// ═══════════════════════════════════════════════════════════════
// ENDPOINTS DE INBOX
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/inbox
 * Obtiene bandeja de entrada con grupos de notificaciones
 */
router.get('/', async (req, res) => {
    try {
        const { employee_id, company_id } = req.user;
        const {
            status = 'all',
            priority = 'all',
            limit = 50,
            offset = 0
        } = req.query;

        const inbox = await inboxService.getInbox(employee_id, company_id, {
            status,
            priority,
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

        res.json({
            success: true,
            inbox
        });

    } catch (error) {
        console.error('❌ Error obteniendo inbox:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/inbox/stats
 * Obtiene estadísticas del inbox (no leídos, pendientes, etc)
 */
router.get('/stats', async (req, res) => {
    try {
        const { employee_id, company_id } = req.user;

        const stats = await inboxService.getInboxStats(employee_id, company_id);

        res.json({
            success: true,
            stats
        });

    } catch (error) {
        console.error('❌ Error obteniendo stats inbox:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/inbox/group/:group_id
 * Obtiene mensajes de una conversación/grupo específico
 */
router.get('/group/:group_id', async (req, res) => {
    try {
        const { employee_id, company_id } = req.user;
        const { group_id } = req.params;

        const conversation = await inboxService.getGroupMessages(
            group_id,
            employee_id,
            company_id
        );

        res.json({
            success: true,
            conversation
        });

    } catch (error) {
        console.error('❌ Error obteniendo conversación:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/inbox/group
 * Crea nuevo grupo/conversación de notificaciones
 */
router.post('/group', async (req, res) => {
    try {
        const { company_id } = req.user;
        const data = req.body;

        const group = await inboxService.createNotificationGroup(company_id, data);

        res.json({
            success: true,
            group
        });

    } catch (error) {
        console.error('❌ Error creando grupo:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/inbox/group/:group_id/message
 * Envía mensaje a un grupo/conversación
 */
router.post('/group/:group_id/message', async (req, res) => {
    try {
        const { company_id } = req.user;
        const { group_id } = req.params;
        const messageData = req.body;

        const message = await inboxService.sendMessage(
            group_id,
            company_id,
            messageData
        );

        res.json({
            success: true,
            message
        });

    } catch (error) {
        console.error('❌ Error enviando mensaje:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * PUT /api/inbox/group/:group_id/read
 * Marca mensajes como leídos
 */
router.put('/group/:group_id/read', async (req, res) => {
    try {
        const { employee_id } = req.user;
        const { group_id } = req.params;
        const { message_ids } = req.body;

        await inboxService.markAsRead(group_id, employee_id, message_ids);

        res.json({
            success: true,
            message: 'Mensajes marcados como leídos'
        });

    } catch (error) {
        console.error('❌ Error marcando como leído:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * PUT /api/inbox/group/:group_id/close
 * Cierra un grupo/conversación
 */
router.put('/group/:group_id/close', async (req, res) => {
    try {
        const { employee_id, company_id } = req.user;
        const { group_id } = req.params;

        await inboxService.closeGroup(group_id, company_id, employee_id);

        res.json({
            success: true,
            message: 'Conversación cerrada'
        });

    } catch (error) {
        console.error('❌ Error cerrando conversación:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
