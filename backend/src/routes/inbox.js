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
 * GET /api/inbox/employee/:employee_id
 * Obtiene notificaciones de un empleado específico (para ficha de usuario)
 * Filtra por: recipient_id, initiator_id o metadata que mencione al empleado
 */
router.get('/employee/:employee_id', async (req, res) => {
    try {
        const { company_id } = req.user;
        const { employee_id } = req.params;

        const notifications = await inboxService.getEmployeeNotifications(employee_id, company_id);

        res.json({
            success: true,
            notifications
        });

    } catch (error) {
        console.error('❌ Error obteniendo notificaciones de empleado:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/inbox/pending-badge
 * Obtiene contadores para el globo flotante de notificaciones
 * Retorna: pendientes recibidos, enviados sin responder, vencidos
 */
router.get('/pending-badge', async (req, res) => {
    try {
        const { employee_id, company_id } = req.user;

        const summary = await inboxService.getPendingBadgeSummary(employee_id, company_id);

        res.json({
            success: true,
            badge: summary
        });

    } catch (error) {
        console.error('❌ Error obteniendo badge de pendientes:', error);
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

// ═══════════════════════════════════════════════════════════════
// ENDPOINTS DE SLA Y ESCALAMIENTO
// ═══════════════════════════════════════════════════════════════

/**
 * POST /api/inbox/message/:message_id/discharge
 * Permite al empleado presentar un descargo por incumplimiento de SLA
 */
router.post('/message/:message_id/discharge', async (req, res) => {
    try {
        const { employee_id } = req.user;
        const { message_id } = req.params;
        const { reason } = req.body;

        if (!reason || reason.trim().length < 10) {
            return res.status(400).json({
                success: false,
                error: 'El descargo debe tener al menos 10 caracteres'
            });
        }

        const slaEscalationService = require('../services/SLAEscalationService');
        const result = await slaEscalationService.fileDischarge(message_id, employee_id, reason);

        res.json({
            success: true,
            ...result
        });

    } catch (error) {
        console.error('❌ Error presentando descargo:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * PUT /api/inbox/message/:message_id/discharge/process
 * RRHH procesa (acepta/rechaza) un descargo presentado
 * Requiere rol admin o rrhh
 */
router.put('/message/:message_id/discharge/process', async (req, res) => {
    try {
        const { employee_id, role } = req.user;
        const { message_id } = req.params;
        const { verdict } = req.body;

        // Verificar permisos (solo admin o rrhh)
        if (!['admin', 'rrhh', 'supervisor'].includes(role)) {
            return res.status(403).json({
                success: false,
                error: 'No tienes permisos para procesar descargos'
            });
        }

        if (!['accepted', 'rejected'].includes(verdict)) {
            return res.status(400).json({
                success: false,
                error: 'Veredicto inválido. Use "accepted" o "rejected"'
            });
        }

        const slaEscalationService = require('../services/SLAEscalationService');
        const result = await slaEscalationService.processDischarge(message_id, verdict, employee_id);

        res.json({
            success: true,
            ...result
        });

    } catch (error) {
        console.error('❌ Error procesando descargo:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/inbox/sla-score
 * Obtiene el score de SLA del empleado actual
 */
router.get('/sla-score', async (req, res) => {
    try {
        const { employee_id, company_id } = req.user;

        const slaEscalationService = require('../services/SLAEscalationService');
        const score = await slaEscalationService.getEmployeeSLAScore(employee_id, company_id);

        res.json({
            success: true,
            score
        });

    } catch (error) {
        console.error('❌ Error obteniendo SLA score:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/inbox/sla-score/:employee_id
 * Obtiene el score de SLA de un empleado específico (para supervisores/RRHH)
 */
router.get('/sla-score/:employee_id', async (req, res) => {
    try {
        const { company_id, role } = req.user;
        const { employee_id } = req.params;

        // Verificar permisos
        if (!['admin', 'rrhh', 'supervisor'].includes(role)) {
            return res.status(403).json({
                success: false,
                error: 'No tienes permisos para ver el score de otros empleados'
            });
        }

        const slaEscalationService = require('../services/SLAEscalationService');
        const score = await slaEscalationService.getEmployeeSLAScore(employee_id, company_id);

        res.json({
            success: true,
            employee_id,
            score
        });

    } catch (error) {
        console.error('❌ Error obteniendo SLA score:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/inbox/escalation-status
 * Obtiene el estado del servicio de escalamiento
 */
router.get('/escalation-status', async (req, res) => {
    try {
        const slaEscalationService = require('../services/SLAEscalationService');
        const status = slaEscalationService.getStatus();

        res.json({
            success: true,
            status
        });

    } catch (error) {
        console.error('❌ Error obteniendo estado de escalamiento:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ═══════════════════════════════════════════════════════════════
// ENDPOINTS DE INTELIGENCIA ARTIFICIAL (Ollama)
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/inbox/ai/suggestions
 * Obtiene sugerencias de respuesta pendientes para el usuario actual
 */
router.get('/ai/suggestions', async (req, res) => {
    try {
        const { employee_id, company_id } = req.user;

        const ollamaAnalyzer = require('../services/OllamaNotificationAnalyzer');
        const suggestions = await ollamaAnalyzer.getPendingSuggestions(employee_id, company_id);

        res.json({
            success: true,
            suggestions,
            count: suggestions.length
        });

    } catch (error) {
        console.error('❌ Error obteniendo sugerencias IA:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/inbox/ai/suggestions/:id/accept
 * Acepta una sugerencia de IA
 */
router.post('/ai/suggestions/:id/accept', async (req, res) => {
    try {
        const { employee_id } = req.user;
        const { id } = req.params;
        const { modified_response } = req.body;

        const ollamaAnalyzer = require('../services/OllamaNotificationAnalyzer');
        const result = await ollamaAnalyzer.acceptSuggestion(id, employee_id, modified_response);

        res.json({
            success: true,
            ...result
        });

    } catch (error) {
        console.error('❌ Error aceptando sugerencia:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/inbox/ai/suggestions/:id/reject
 * Rechaza una sugerencia de IA
 */
router.post('/ai/suggestions/:id/reject', async (req, res) => {
    try {
        const { employee_id } = req.user;
        const { id } = req.params;
        const { reason } = req.body;

        const ollamaAnalyzer = require('../services/OllamaNotificationAnalyzer');
        const result = await ollamaAnalyzer.rejectSuggestion(id, employee_id, reason);

        res.json({
            success: true,
            ...result
        });

    } catch (error) {
        console.error('❌ Error rechazando sugerencia:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/inbox/ai/status
 * Obtiene el estado del servicio de IA
 */
router.get('/ai/status', async (req, res) => {
    try {
        const ollamaAnalyzer = require('../services/OllamaNotificationAnalyzer');
        const status = ollamaAnalyzer.getStatus();

        res.json({
            success: true,
            status
        });

    } catch (error) {
        console.error('❌ Error obteniendo estado IA:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/inbox/ai/analyze-message
 * Analiza un mensaje específico para obtener sugerencias
 */
router.post('/ai/analyze-message', async (req, res) => {
    try {
        const { company_id } = req.user;
        const { content, context } = req.body;

        if (!content) {
            return res.status(400).json({
                success: false,
                error: 'El contenido del mensaje es requerido'
            });
        }

        const ollamaAnalyzer = require('../services/OllamaNotificationAnalyzer');

        // Buscar respuestas similares
        const similarResponses = await ollamaAnalyzer.findSimilarResponses(content, company_id);

        // Analizar con Ollama si está disponible
        let aiAnalysis = null;
        if (ollamaAnalyzer.ollamaAvailable) {
            aiAnalysis = await ollamaAnalyzer.analyzeWithOllama(content, context);
        }

        res.json({
            success: true,
            similar_responses: similarResponses,
            ai_analysis: aiAnalysis,
            has_suggestions: similarResponses.length > 0
        });

    } catch (error) {
        console.error('❌ Error analizando mensaje:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/inbox/ai/knowledge-base
 * Obtiene la base de conocimiento de respuestas aprendidas
 */
router.get('/ai/knowledge-base', async (req, res) => {
    try {
        const { company_id, role } = req.user;
        const { category, limit = 50 } = req.query;

        // Solo admin/rrhh pueden ver toda la base
        if (!['admin', 'rrhh', 'supervisor'].includes(role)) {
            return res.status(403).json({
                success: false,
                error: 'No tienes permisos para ver la base de conocimiento'
            });
        }

        const { sequelize } = require('../config/database');

        let whereClause = '(company_id IS NULL OR company_id = $1)';
        const params = [company_id];

        if (category) {
            whereClause += ' AND category = $2';
            params.push(category);
        }

        const [responses] = await sequelize.query(`
            SELECT
                id, category, subcategory, department,
                question_pattern, answer_summary,
                confidence_score, times_suggested, times_accepted, times_rejected,
                is_verified, verified_by, verified_at,
                is_temporal, valid_until,
                created_at
            FROM notification_learned_responses
            WHERE ${whereClause} AND is_active = TRUE
            ORDER BY confidence_score DESC, times_accepted DESC
            LIMIT $${params.length + 1}
        `, { bind: [...params, parseInt(limit)] });

        res.json({
            success: true,
            responses,
            count: responses.length
        });

    } catch (error) {
        console.error('❌ Error obteniendo KB:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/inbox/ai/knowledge-base
 * Agrega una respuesta a la base de conocimiento manualmente
 */
router.post('/ai/knowledge-base', async (req, res) => {
    try {
        const { company_id, role, employee_id } = req.user;
        const {
            category, subcategory, department,
            question_pattern, answer_content, answer_summary,
            is_temporal, valid_until
        } = req.body;

        // Solo admin/rrhh pueden agregar
        if (!['admin', 'rrhh'].includes(role)) {
            return res.status(403).json({
                success: false,
                error: 'No tienes permisos para agregar a la base de conocimiento'
            });
        }

        if (!category || !question_pattern || !answer_content) {
            return res.status(400).json({
                success: false,
                error: 'Categoría, pregunta y respuesta son requeridos'
            });
        }

        const { sequelize } = require('../config/database');

        // Extraer keywords
        const ollamaAnalyzer = require('../services/OllamaNotificationAnalyzer');
        const keywords = ollamaAnalyzer.extractKeywords(question_pattern);

        const [result] = await sequelize.query(`
            INSERT INTO notification_learned_responses (
                category, subcategory, department,
                question_pattern, question_keywords,
                answer_content, answer_summary,
                is_temporal, valid_until,
                is_verified, verified_by, verified_at,
                company_id, confidence_score
            ) VALUES (
                $1, $2, $3,
                $4, $5,
                $6, $7,
                $8, $9,
                TRUE, $10, NOW(),
                $11, 0.8
            )
            RETURNING id
        `, {
            bind: [
                category, subcategory || null, department || 'rrhh',
                question_pattern, keywords,
                answer_content, answer_summary || answer_content.substring(0, 200),
                is_temporal || false, valid_until || null,
                employee_id,
                company_id
            ]
        });

        res.json({
            success: true,
            message: 'Respuesta agregada a la base de conocimiento',
            id: result[0].id
        });

    } catch (error) {
        console.error('❌ Error agregando a KB:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * PUT /api/inbox/ai/knowledge-base/:id/verify
 * Verifica/valida una respuesta de la base de conocimiento
 */
router.put('/ai/knowledge-base/:id/verify', async (req, res) => {
    try {
        const { role, employee_id } = req.user;
        const { id } = req.params;

        // Solo admin/rrhh pueden verificar
        if (!['admin', 'rrhh'].includes(role)) {
            return res.status(403).json({
                success: false,
                error: 'No tienes permisos para verificar respuestas'
            });
        }

        const { sequelize } = require('../config/database');

        await sequelize.query(`
            UPDATE notification_learned_responses
            SET
                is_verified = TRUE,
                verified_by = $1,
                verified_at = NOW(),
                confidence_score = LEAST(confidence_score + 0.15, 0.95)
            WHERE id = $2
        `, { bind: [employee_id, id] });

        res.json({
            success: true,
            message: 'Respuesta verificada correctamente'
        });

    } catch (error) {
        console.error('❌ Error verificando respuesta:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
