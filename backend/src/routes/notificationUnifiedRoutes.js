/**
 * ============================================================================
 * NOTIFICATION UNIFIED ROUTES v3.0
 * ============================================================================
 * API unificada para todo el ecosistema:
 * - Panel Administrativo (Aponnt)
 * - Panel Empresa
 * - APKs Flutter
 *
 * Base: /api/v2/notifications
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const notificationService = require('../services/NotificationUnifiedService');
const { sequelize } = require('../config/database');
const { QueryTypes } = require('sequelize');

// ============================================================================
// MIDDLEWARE DE AUTENTICACION
// ============================================================================

const authenticate = async (req, res, next) => {
    try {
        // JWT Bearer Token
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
            req.user = {
                user_id: decoded.user_id || decoded.userId || decoded.id,
                company_id: decoded.company_id || decoded.companyId,
                role: decoded.role,
                email: decoded.email,
                name: decoded.name || decoded.fullName
            };
            return next();
        }

        // Headers legacy (para compatibilidad APK)
        const employeeId = req.headers['x-employee-id'];
        const companyId = req.headers['x-company-id'];

        if (employeeId && companyId) {
            req.user = {
                user_id: employeeId,
                company_id: parseInt(companyId),
                role: req.headers['x-role'] || 'employee'
            };
            return next();
        }

        return res.status(401).json({ success: false, error: 'No autorizado' });
    } catch (error) {
        console.error('[NOTIF-API] Auth error:', error.message);
        return res.status(401).json({ success: false, error: 'Token invalido' });
    }
};

// ============================================================================
// THREADS (Conversaciones)
// ============================================================================

/**
 * GET /api/v2/notifications/threads
 * Obtener threads del usuario
 */
router.get('/threads', authenticate, async (req, res) => {
    try {
        const { status, category, module, priority, limit = 50, offset = 0, includeMessages } = req.query;

        const threads = await notificationService.getThreads(
            req.user.user_id,
            req.user.company_id,
            {
                status,
                category,
                module,
                priority,
                limit: parseInt(limit),
                offset: parseInt(offset),
                includeMessages: includeMessages === 'true'
            }
        );

        res.json({
            success: true,
            data: threads,
            meta: { limit: parseInt(limit), offset: parseInt(offset), count: threads.length }
        });
    } catch (error) {
        console.error('[NOTIF-API] Error getting threads:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/v2/notifications/threads/:threadId/messages
 * Obtener mensajes de un thread
 */
router.get('/threads/:threadId/messages', authenticate, async (req, res) => {
    try {
        const { threadId } = req.params;
        const { limit = 50, offset = 0, markAsRead = 'true' } = req.query;

        const messages = await notificationService.getThreadMessages(
            threadId,
            req.user.user_id,
            req.user.company_id,
            {
                limit: parseInt(limit),
                offset: parseInt(offset),
                markAsRead: markAsRead === 'true'
            }
        );

        res.json({
            success: true,
            data: messages,
            meta: { threadId, count: messages.length }
        });
    } catch (error) {
        console.error('[NOTIF-API] Error getting messages:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/v2/notifications/threads
 * Crear nuevo thread
 */
router.post('/threads', authenticate, async (req, res) => {
    try {
        const { subject, category, module, threadType, priority } = req.body;

        const thread = await notificationService.createThread({
            companyId: req.user.company_id,
            subject,
            category: category || 'general',
            module,
            threadType: threadType || 'chat',
            initiatorType: 'user',
            initiatorId: req.user.user_id,
            initiatorName: req.user.name,
            priority: priority || 'medium'
        });

        res.status(201).json({ success: true, data: thread });
    } catch (error) {
        console.error('[NOTIF-API] Error creating thread:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// NOTIFICACIONES
// ============================================================================

/**
 * GET /api/v2/notifications
 * Obtener notificaciones del usuario
 */
router.get('/', authenticate, async (req, res) => {
    try {
        const { category, module, priority, isRead, requiresAction, limit = 50, offset = 0 } = req.query;

        const notifications = await notificationService.getForUser(
            req.user.user_id,
            req.user.company_id,
            {
                category,
                module,
                priority,
                isRead: isRead !== undefined ? isRead === 'true' : null,
                requiresAction: requiresAction !== undefined ? requiresAction === 'true' : null,
                limit: parseInt(limit),
                offset: parseInt(offset)
            }
        );

        res.json({
            success: true,
            data: notifications,
            meta: { limit: parseInt(limit), offset: parseInt(offset), count: notifications.length }
        });
    } catch (error) {
        console.error('[NOTIF-API] Error getting notifications:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/v2/notifications/stats
 * Obtener estadisticas
 */
router.get('/stats', authenticate, async (req, res) => {
    try {
        const { byModule, byCategory } = req.query;

        const stats = await notificationService.getStats(
            req.user.user_id,
            req.user.company_id,
            {
                byModule: byModule === 'true',
                byCategory: byCategory === 'true'
            }
        );

        res.json({ success: true, data: stats });
    } catch (error) {
        console.error('[NOTIF-API] Error getting stats:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/v2/notifications/send
 * Enviar notificacion
 */
router.post('/send', authenticate, async (req, res) => {
    try {
        const notification = await notificationService.send({
            companyId: req.user.company_id,
            originType: 'user',
            originId: req.user.user_id,
            originName: req.user.name,
            originRole: req.user.role,
            createdBy: req.user.user_id,
            ...req.body
        });

        res.status(201).json({ success: true, data: notification });
    } catch (error) {
        console.error('[NOTIF-API] Error sending notification:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/v2/notifications/send-template
 * Enviar usando template
 */
router.post('/send-template', authenticate, async (req, res) => {
    try {
        const { templateKey, variables, recipient } = req.body;

        const notification = await notificationService.sendFromTemplate(
            templateKey,
            req.user.company_id,
            variables,
            recipient,
            {
                originType: 'user',
                originId: req.user.user_id,
                originName: req.user.name
            }
        );

        res.status(201).json({ success: true, data: notification });
    } catch (error) {
        console.error('[NOTIF-API] Error sending from template:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/v2/notifications/:id
 * Obtener detalle de notificacion
 */
router.get('/:id', authenticate, async (req, res) => {
    try {
        const [notification] = await sequelize.query(`
            SELECT n.*,
                   t.subject as thread_subject,
                   t.status as thread_status,
                   t.category as thread_category
            FROM unified_notifications n
            LEFT JOIN notification_threads t ON n.thread_id = t.id
            WHERE n.id = :id AND n.company_id = :companyId
        `, {
            replacements: { id: req.params.id, companyId: req.user.company_id },
            type: QueryTypes.SELECT
        });

        if (!notification) {
            return res.status(404).json({ success: false, error: 'Notificacion no encontrada' });
        }

        // Obtener historial de acciones
        const actions = await sequelize.query(`
            SELECT * FROM notification_actions_log
            WHERE notification_id = :id
            ORDER BY action_at DESC
            LIMIT 20
        `, { replacements: { id: req.params.id }, type: QueryTypes.SELECT });

        res.json({
            success: true,
            data: { ...notification, actions }
        });
    } catch (error) {
        console.error('[NOTIF-API] Error getting notification:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * PUT /api/v2/notifications/:id/read
 * Marcar como leida
 */
router.put('/:id/read', authenticate, async (req, res) => {
    try {
        await notificationService.markAsRead(req.params.id, req.user.user_id);
        res.json({ success: true });
    } catch (error) {
        console.error('[NOTIF-API] Error marking as read:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * PUT /api/v2/notifications/:id/action
 * Procesar accion (aprobar/rechazar/etc)
 */
router.put('/:id/action', authenticate, async (req, res) => {
    try {
        const { action, response, notes } = req.body;

        if (!action) {
            return res.status(400).json({ success: false, error: 'Accion requerida' });
        }

        const result = await notificationService.processAction(
            req.params.id,
            req.user.user_id,
            action,
            response,
            notes
        );

        res.json({ success: true, data: result });
    } catch (error) {
        console.error('[NOTIF-API] Error processing action:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * DELETE /api/v2/notifications/:id
 * Eliminar notificacion (soft delete)
 */
router.delete('/:id', authenticate, async (req, res) => {
    try {
        await sequelize.query(`
            UPDATE unified_notifications
            SET deleted_at = NOW(), deleted_by = :userId
            WHERE id = :id AND company_id = :companyId
        `, {
            replacements: {
                id: req.params.id,
                userId: req.user.user_id,
                companyId: req.user.company_id
            },
            type: QueryTypes.UPDATE
        });

        res.json({ success: true });
    } catch (error) {
        console.error('[NOTIF-API] Error deleting notification:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// BULK OPERATIONS
// ============================================================================

/**
 * PUT /api/v2/notifications/bulk/read
 * Marcar multiples como leidas
 */
router.put('/bulk/read', authenticate, async (req, res) => {
    try {
        const { ids, all = false, category, module } = req.body;

        let query = `
            UPDATE unified_notifications
            SET is_read = TRUE, read_at = NOW(), read_by = :userId
            WHERE company_id = :companyId AND is_read = FALSE
        `;
        const replacements = { userId: req.user.user_id, companyId: req.user.company_id };

        if (!all && ids && ids.length > 0) {
            query += ` AND id = ANY(:ids)`;
            replacements.ids = ids;
        }
        if (category) {
            query += ` AND category = :category`;
            replacements.category = category;
        }
        if (module) {
            query += ` AND module = :module`;
            replacements.module = module;
        }

        const [, result] = await sequelize.query(query, { replacements, type: QueryTypes.UPDATE });

        res.json({ success: true, data: { updated: result } });
    } catch (error) {
        console.error('[NOTIF-API] Error bulk marking as read:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// TEMPLATES
// ============================================================================

/**
 * GET /api/v2/notifications/templates
 * Listar templates disponibles
 */
router.get('/config/templates', authenticate, async (req, res) => {
    try {
        const { module, category } = req.query;

        let query = `
            SELECT * FROM notification_templates
            WHERE (company_id IS NULL OR company_id = :companyId)
              AND is_active = TRUE
        `;
        const replacements = { companyId: req.user.company_id };

        if (module) {
            query += ` AND module = :module`;
            replacements.module = module;
        }
        if (category) {
            query += ` AND category = :category`;
            replacements.category = category;
        }

        query += ` ORDER BY company_id DESC NULLS LAST, workflow_key`;

        const templates = await sequelize.query(query, { replacements, type: QueryTypes.SELECT });

        res.json({ success: true, data: templates });
    } catch (error) {
        console.error('[NOTIF-API] Error getting templates:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// WORKFLOWS
// ============================================================================

/**
 * GET /api/v2/notifications/workflows
 * Listar workflows disponibles
 */
router.get('/config/workflows', authenticate, async (req, res) => {
    try {
        const workflows = await sequelize.query(`
            SELECT * FROM notification_workflows
            WHERE (company_id IS NULL OR company_id = :companyId)
              AND is_active = TRUE
            ORDER BY company_id DESC NULLS LAST, process_name
        `, {
            replacements: { companyId: req.user.company_id },
            type: QueryTypes.SELECT
        });

        res.json({ success: true, data: workflows });
    } catch (error) {
        console.error('[NOTIF-API] Error getting workflows:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// APONNT <-> EMPRESA
// ============================================================================

/**
 * POST /api/v2/notifications/aponnt/broadcast
 * (Solo Aponnt) Enviar a todas las empresas o seleccionadas
 */
router.post('/aponnt/broadcast', authenticate, async (req, res) => {
    try {
        // Verificar que es usuario Aponnt (company_id = 1 o role = aponnt_admin)
        if (req.user.company_id !== 1 && req.user.role !== 'aponnt_admin') {
            return res.status(403).json({ success: false, error: 'No autorizado para broadcast' });
        }

        const { targetCompanyIds, title, message, category, priority, metadata } = req.body;

        const results = await notificationService.sendFromAponnt({
            targetCompanyIds,
            title,
            message,
            category: category || 'info',
            priority: priority || 'medium',
            metadata
        });

        res.json({
            success: true,
            data: { sent: results.length, notifications: results }
        });
    } catch (error) {
        console.error('[NOTIF-API] Error sending broadcast:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/v2/notifications/support
 * Enviar mensaje de soporte a Aponnt
 */
router.post('/support', authenticate, async (req, res) => {
    try {
        const { title, message, category, metadata } = req.body;

        const notification = await notificationService.sendToAponnt(
            req.user.company_id,
            req.user.user_id,
            { title, message, category: category || 'support', metadata }
        );

        res.status(201).json({ success: true, data: notification });
    } catch (error) {
        console.error('[NOTIF-API] Error sending support message:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// AI ENDPOINTS
// ============================================================================

/**
 * POST /api/v2/notifications/:id/ai-feedback
 * Feedback sobre respuesta AI
 */
router.post('/:id/ai-feedback', authenticate, async (req, res) => {
    try {
        const { accepted, response } = req.body;

        if (accepted && response) {
            await notificationService.learnFromResponse(
                req.params.id,
                req.user.user_id,
                response
            );
        }

        // Actualizar estadisticas de AI learning
        const [notification] = await sequelize.query(`
            SELECT ai_suggested_response FROM unified_notifications WHERE id = :id
        `, { replacements: { id: req.params.id }, type: QueryTypes.SELECT });

        if (notification?.ai_suggested_response) {
            await sequelize.query(`
                UPDATE notification_ai_learning
                SET ${accepted ? 'times_accepted' : 'times_rejected'} = ${accepted ? 'times_accepted' : 'times_rejected'} + 1,
                    confidence_score = CASE
                        WHEN ${accepted} THEN LEAST(confidence_score + 0.05, 1.0)
                        ELSE GREATEST(confidence_score - 0.05, 0.0)
                    END
                WHERE answer_content = :response
            `, { replacements: { response: notification.ai_suggested_response }, type: QueryTypes.UPDATE });
        }

        res.json({ success: true });
    } catch (error) {
        console.error('[NOTIF-API] Error processing AI feedback:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/v2/notifications/ai/health
 * Estado del servicio AI
 */
router.get('/ai/health', authenticate, async (req, res) => {
    try {
        const ollamaUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';

        // Verificar Ollama
        let ollamaStatus = 'offline';
        let ollamaModels = [];

        try {
            const response = await fetch(`${ollamaUrl}/api/tags`, { timeout: 3000 });
            if (response.ok) {
                const data = await response.json();
                ollamaStatus = 'online';
                ollamaModels = data.models?.map(m => m.name) || [];
            }
        } catch (e) {
            ollamaStatus = 'offline';
        }

        // Estadisticas de AI
        const [aiStats] = await sequelize.query(`
            SELECT
                COUNT(*) as total_learned,
                AVG(confidence_score) as avg_confidence,
                SUM(times_suggested) as total_suggestions,
                SUM(times_accepted) as total_accepted
            FROM notification_ai_learning
            WHERE is_active = TRUE
        `, { type: QueryTypes.SELECT });

        res.json({
            success: true,
            data: {
                ollama: {
                    status: ollamaStatus,
                    url: ollamaUrl,
                    model: process.env.OLLAMA_MODEL || 'llama3.1:8b',
                    availableModels: ollamaModels
                },
                learning: aiStats
            }
        });
    } catch (error) {
        console.error('[NOTIF-API] Error checking AI health:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// APK MOBILE ENDPOINTS
// ============================================================================

/**
 * GET /api/v2/notifications/mobile/unread-count
 * Contador de no leidas (para badge en APK)
 */
router.get('/mobile/unread-count', authenticate, async (req, res) => {
    try {
        const [result] = await sequelize.query(`
            SELECT COUNT(*) as unread
            FROM unified_notifications
            WHERE company_id = :companyId
              AND recipient_id = :userId
              AND is_read = FALSE
              AND deleted_at IS NULL
        `, {
            replacements: { companyId: req.user.company_id, userId: req.user.user_id },
            type: QueryTypes.SELECT
        });

        res.json({ success: true, data: { unread: parseInt(result.unread) } });
    } catch (error) {
        console.error('[NOTIF-API] Error getting unread count:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/v2/notifications/mobile/recent
 * Notificaciones recientes para APK (optimizado)
 */
router.get('/mobile/recent', authenticate, async (req, res) => {
    try {
        const { limit = 20 } = req.query;

        const notifications = await sequelize.query(`
            SELECT
                id, title, short_message, category, module, priority,
                is_read, requires_action, action_status, created_at
            FROM unified_notifications
            WHERE company_id = :companyId
              AND (recipient_id = :userId OR recipient_type = 'broadcast')
              AND deleted_at IS NULL
            ORDER BY created_at DESC
            LIMIT :limit
        `, {
            replacements: {
                companyId: req.user.company_id,
                userId: req.user.user_id,
                limit: parseInt(limit)
            },
            type: QueryTypes.SELECT
        });

        res.json({ success: true, data: notifications });
    } catch (error) {
        console.error('[NOTIF-API] Error getting recent notifications:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/v2/notifications/mobile/register-push
 * Registrar token de push notification
 */
router.post('/mobile/register-push', authenticate, async (req, res) => {
    try {
        const { token, platform } = req.body; // platform: 'android' | 'ios'

        // Guardar token (en tabla user_devices o user_notification_preferences)
        await sequelize.query(`
            INSERT INTO user_notification_preferences (user_id, company_id, receive_push, metadata)
            VALUES (:userId, :companyId, TRUE, :metadata)
            ON CONFLICT (user_id, company_id, module)
            DO UPDATE SET receive_push = TRUE, metadata = COALESCE(user_notification_preferences.metadata, '{}') || :metadata
        `, {
            replacements: {
                userId: req.user.user_id,
                companyId: req.user.company_id,
                metadata: JSON.stringify({ push_token: token, platform, registered_at: new Date() })
            },
            type: QueryTypes.INSERT
        });

        res.json({ success: true });
    } catch (error) {
        console.error('[NOTIF-API] Error registering push token:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// EXPORT
// ============================================================================

console.log('[NOTIFICATION-UNIFIED-API] Rutas v2 cargadas');
module.exports = router;
