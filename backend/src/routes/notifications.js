/**
 * NOTIFICATION ROUTES - API Endpoints de Notificaciones
 *
 * Rutas para gestionar notificaciones, grupos y flujos de aprobación
 *
 * @version 2.0
 * @date 2025-10-16
 */

const express = require('express');
const router = express.Router();
const requestService = require('../services/requestService');
const flowExecutorService = require('../services/flowExecutorService');
const moduleService = require('../services/moduleService');
const db = require('../config/database');

// Middleware de autenticación (placeholder - ajustar según tu sistema)
const authenticate = (req, res, next) => {
    // TODO: Implementar autenticación real
    req.user = {
        employee_id: req.headers['x-employee-id'] || 'EMP-ISI-001',
        company_id: parseInt(req.headers['x-company-id']) || 11,
        role: req.headers['x-role'] || 'employee'
    };
    next();
};

router.use(authenticate);

// ═══════════════════════════════════════════════════════════════
// ENDPOINTS DE SOLICITUDES
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/notifications/request-types
 * Obtiene tipos de solicitud disponibles
 */
router.get('/request-types', async (req, res) => {
    try {
        const result = await db.query(`
            SELECT
                code,
                category,
                display_name_es,
                display_name_en,
                description,
                icon,
                color,
                form_fields,
                validation_rules
            FROM request_types
            WHERE active = true
            ORDER BY category, display_name_es
        `);

        res.json({
            success: true,
            request_types: result.rows
        });

    } catch (error) {
        console.error('❌ Error obteniendo request types:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/notifications/request-types/:code
 * Obtiene detalle de un tipo de solicitud
 */
router.get('/request-types/:code', async (req, res) => {
    try {
        const { code } = req.params;

        const requestType = await requestService.getRequestType(code);

        if (!requestType) {
            return res.status(404).json({
                success: false,
                error: 'Tipo de solicitud no encontrado'
            });
        }

        res.json({
            success: true,
            request_type: requestType
        });

    } catch (error) {
        console.error('❌ Error obteniendo request type:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/notifications/requests
 * Crea una nueva solicitud estructurada
 */
router.post('/requests', async (req, res) => {
    try {
        const { request_type_code, form_data } = req.body;
        const { employee_id, company_id } = req.user;

        if (!request_type_code || !form_data) {
            return res.status(400).json({
                success: false,
                error: 'request_type_code y form_data son requeridos'
            });
        }

        const result = await requestService.createRequest(
            employee_id,
            request_type_code,
            form_data,
            company_id
        );

        res.status(201).json({
            success: true,
            message: 'Solicitud creada exitosamente',
            group: result.group,
            message: result.message
        });

    } catch (error) {
        console.error('❌ Error creando solicitud:', error);
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

// ═══════════════════════════════════════════════════════════════
// ENDPOINTS DE GRUPOS DE NOTIFICACIONES
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/notifications/groups
 * Obtiene grupos de notificaciones del usuario
 */
router.get('/groups', async (req, res) => {
    try {
        const { employee_id, company_id } = req.user;
        const { status, limit = 50, offset = 0 } = req.query;

        let query = `
            SELECT
                ng.*,
                (
                    SELECT COUNT(*)
                    FROM notification_messages nm
                    WHERE nm.group_id = ng.id AND nm.read_at IS NULL AND nm.recipient_id = $1
                ) as unread_count,
                (
                    SELECT COUNT(*)
                    FROM notification_messages nm
                    WHERE nm.group_id = ng.id
                ) as message_count
            FROM notification_groups ng
            WHERE ng.company_id = $2
            AND (
                ng.initiator_id = $1
                OR EXISTS (
                    SELECT 1 FROM notification_messages nm
                    WHERE nm.group_id = ng.id
                    AND (nm.sender_id = $1 OR nm.recipient_id = $1)
                )
            )
        `;

        const params = [employee_id, company_id];
        let paramCount = 2;

        if (status) {
            paramCount++;
            query += ` AND ng.status = $${paramCount}`;
            params.push(status);
        }

        query += ` ORDER BY ng.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
        params.push(parseInt(limit), parseInt(offset));

        const result = await db.query(query, params);

        res.json({
            success: true,
            groups: result.rows,
            total: result.rows.length
        });

    } catch (error) {
        console.error('❌ Error obteniendo grupos:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/notifications/groups/:groupId
 * Obtiene detalle de un grupo específico
 */
router.get('/groups/:groupId', async (req, res) => {
    try {
        const { groupId } = req.params;
        const { company_id } = req.user;

        const groupResult = await db.query(`
            SELECT * FROM notification_groups
            WHERE id = $1 AND company_id = $2
        `, [groupId, company_id]);

        if (groupResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Grupo no encontrado'
            });
        }

        res.json({
            success: true,
            group: groupResult.rows[0]
        });

    } catch (error) {
        console.error('❌ Error obteniendo grupo:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/notifications/groups/:groupId/messages
 * Obtiene todos los mensajes de un grupo (cadena completa)
 */
router.get('/groups/:groupId/messages', async (req, res) => {
    try {
        const { groupId } = req.params;
        const { company_id } = req.user;

        // Verificar que el grupo pertenece a la empresa
        const groupCheck = await db.query(
            'SELECT id FROM notification_groups WHERE id = $1 AND company_id = $2',
            [groupId, company_id]
        );

        if (groupCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Grupo no encontrado'
            });
        }

        // Obtener mensajes con contexto enriquecido
        const result = await db.query(`
            SELECT
                nm.*,
                (
                    SELECT json_agg(ncd.*)
                    FROM notification_context_data ncd
                    WHERE ncd.notification_message_id = nm.id
                ) as context_data
            FROM notification_messages nm
            WHERE nm.group_id = $1
            ORDER BY nm.sequence_number ASC
        `, [groupId]);

        res.json({
            success: true,
            messages: result.rows
        });

    } catch (error) {
        console.error('❌ Error obteniendo mensajes:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/notifications/groups/:groupId/respond
 * Responde a una notificación (aprobar/rechazar)
 */
router.post('/groups/:groupId/respond', async (req, res) => {
    try {
        const { groupId } = req.params;
        const { message_id, action, comments } = req.body;
        const { employee_id, company_id } = req.user;

        if (!message_id || !action) {
            return res.status(400).json({
                success: false,
                error: 'message_id y action son requeridos'
            });
        }

        if (!['approve', 'reject'].includes(action)) {
            return res.status(400).json({
                success: false,
                error: 'action debe ser "approve" o "reject"'
            });
        }

        // Verificar que el mensaje existe y requiere respuesta
        const messageResult = await db.query(`
            SELECT nm.*, ng.group_type, ng.metadata
            FROM notification_messages nm
            JOIN notification_groups ng ON nm.group_id = ng.id
            WHERE nm.id = $1 AND nm.group_id = $2 AND ng.company_id = $3
            AND nm.requires_response = true AND nm.responded_at IS NULL
        `, [message_id, groupId, company_id]);

        if (messageResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Mensaje no encontrado o ya fue respondido'
            });
        }

        const message = messageResult.rows[0];

        // Verificar que el usuario es el destinatario
        if (message.recipient_id !== employee_id) {
            return res.status(403).json({
                success: false,
                error: 'No tiene permisos para responder este mensaje'
            });
        }

        // Registrar respuesta
        await db.query(`
            UPDATE notification_messages
            SET responded_at = NOW()
            WHERE id = $1
        `, [message_id]);

        // Crear mensaje de respuesta
        const sequenceNumber = await flowExecutorService.getNextSequenceNumber(groupId);

        await db.query(`
            INSERT INTO notification_messages
            (group_id, sequence_number, sender_type, sender_id, sender_name,
             recipient_type, recipient_id, recipient_name, message_type,
             subject, content, created_at, requires_response,
             message_hash, company_id, channels)
            VALUES ($1, $2, 'employee', $3, $4, 'system', 'SYSTEM', 'Sistema',
                    $5, $6, $7, NOW(), false, $8, $9, '["web"]'::jsonb)
        `, [
            groupId,
            sequenceNumber,
            employee_id,
            employee_id, // TODO: Obtener nombre real
            action === 'approve' ? 'approval' : 'rejection',
            action === 'approve' ? 'Aprobado' : 'Rechazado',
            comments || `${action === 'approve' ? 'Aprobado' : 'Rechazado'} por ${employee_id}`,
            crypto.createHash('sha256').update(`${groupId}${employee_id}${Date.now()}`).digest('hex'),
            company_id
        ]);

        // Ejecutar siguiente paso del flujo
        const flowTemplate = await flowExecutorService.getFlowTemplate(message.group_type);
        const currentStep = message.metadata?.current_step || 1;
        const nextStep = flowTemplate.flow_steps.find(s => s.step === currentStep + 1);

        if (action === 'approve' && nextStep) {
            await flowExecutorService.executeNextStep(groupId, currentStep + 1, {
                approved_by: employee_id,
                comments: comments
            });
        } else if (action === 'reject') {
            await flowExecutorService.endChainAndNotifyAll(groupId, 'rejected', {
                rejected_by: employee_id,
                reason: comments
            });
        }

        res.json({
            success: true,
            message: `Solicitud ${action === 'approve' ? 'aprobada' : 'rechazada'} exitosamente`
        });

    } catch (error) {
        console.error('❌ Error respondiendo notificación:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/notifications/messages/:messageId/read
 * Marca un mensaje como leído
 */
router.post('/messages/:messageId/read', async (req, res) => {
    try {
        const { messageId } = req.params;
        const { employee_id, company_id } = req.user;

        const result = await db.query(`
            UPDATE notification_messages nm
            SET read_at = NOW()
            FROM notification_groups ng
            WHERE nm.id = $1
            AND nm.group_id = ng.id
            AND ng.company_id = $2
            AND nm.recipient_id = $3
            AND nm.read_at IS NULL
            RETURNING nm.*
        `, [messageId, company_id, employee_id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Mensaje no encontrado o ya fue leído'
            });
        }

        res.json({
            success: true,
            message: 'Mensaje marcado como leído'
        });

    } catch (error) {
        console.error('❌ Error marcando mensaje como leído:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/notifications/stats
 * Obtiene estadísticas de notificaciones del usuario
 */
router.get('/stats', async (req, res) => {
    try {
        const { employee_id, company_id } = req.user;

        const result = await db.query(`
            SELECT
                COUNT(DISTINCT ng.id) FILTER (WHERE ng.status = 'open') as open_groups,
                COUNT(DISTINCT ng.id) FILTER (WHERE ng.status = 'closed') as closed_groups,
                COUNT(nm.id) FILTER (WHERE nm.read_at IS NULL AND nm.recipient_id = $1) as unread_messages,
                COUNT(nm.id) FILTER (WHERE nm.requires_response = true AND nm.responded_at IS NULL AND nm.recipient_id = $1) as pending_responses
            FROM notification_groups ng
            LEFT JOIN notification_messages nm ON nm.group_id = ng.id
            WHERE ng.company_id = $2
            AND (
                ng.initiator_id = $1
                OR nm.sender_id = $1
                OR nm.recipient_id = $1
            )
        `, [employee_id, company_id]);

        res.json({
            success: true,
            stats: result.rows[0]
        });

    } catch (error) {
        console.error('❌ Error obteniendo estadísticas:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ═══════════════════════════════════════════════════════════════
// ENDPOINTS DE MÓDULOS
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/notifications/modules
 * Obtiene módulos activos de la empresa
 */
router.get('/modules', async (req, res) => {
    try {
        const { company_id } = req.user;

        const modules = await moduleService.getActiveModules(company_id);

        res.json({
            success: true,
            modules: modules
        });

    } catch (error) {
        console.error('❌ Error obteniendo módulos:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/notifications/modules/catalog
 * Obtiene catálogo completo de módulos disponibles
 */
router.get('/modules/catalog', async (req, res) => {
    try {
        const modules = await moduleService.getAllModules();

        res.json({
            success: true,
            catalog: modules
        });

    } catch (error) {
        console.error('❌ Error obteniendo catálogo:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
