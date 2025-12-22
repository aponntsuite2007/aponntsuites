/**
 * ============================================================================
 * NOTIFICATION WORKFLOW ROUTES - API del Sistema de Notificaciones
 * ============================================================================
 *
 * Endpoints para gestionar workflows de notificaciones multi-canal.
 *
 * SCOPE:
 * - /workflows - Gestión de workflows (Aponnt + Empresas)
 * - /trigger - Disparar workflows manualmente
 * - /response - Registrar respuestas de usuarios
 * - /log - Historial de notificaciones enviadas
 * - /metrics - Métricas y analytics
 *
 * SEGURIDAD:
 * - Requiere autenticación JWT
 * - Workflows scope='aponnt' → Solo staff de Aponnt
 * - Workflows scope='company' → Solo admins de la empresa
 *
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const { sequelize } = require('../config/database');
const { QueryTypes } = require('sequelize');
const jwt = require('jsonwebtoken');
const NotificationOrchestrator = require('../services/NotificationOrchestrator');

// =========================================================================
// MIDDLEWARE DE AUTENTICACIÓN
// =========================================================================

const authenticateJWT = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({ error: 'Token requerido' });
        }

        const secret = process.env.JWT_SECRET || 'your-secret-key';
        const decoded = jwt.verify(token, secret);

        req.user = {
            id: decoded.id || decoded.userId,
            staffId: decoded.staffId || decoded.staff_id,
            companyId: decoded.company_id || decoded.companyId,
            role: decoded.role || decoded.role_code || decoded.roleCode
        };

        console.log('[NOTIFICATION-API] User authenticated:', req.user);

        next();
    } catch (error) {
        console.error('[NOTIFICATION-API] Auth error:', error.message);
        return res.status(401).json({ error: 'Token inválido', detail: error.message });
    }
};

// =========================================================================
// ENDPOINTS - GESTIÓN DE WORKFLOWS
// =========================================================================

/**
 * GET /api/notifications/workflows - Listar todos los workflows
 * Query params:
 * - scope: 'aponnt' | 'company' | 'all'
 * - module: filtrar por módulo
 * - priority: filtrar por prioridad
 * - is_active: filtrar por activos/inactivos
 */
router.get('/workflows', authenticateJWT, async (req, res) => {
    try {
        const {
            scope = 'all',
            module,
            priority,
            is_active = 'true',
            limit = 100,
            offset = 0
        } = req.query;

        let query = `
            SELECT
                id, process_key, process_name, module, description,
                scope, company_id, channels, priority,
                requires_response, response_type, response_options,
                is_active, metadata,
                created_at, updated_at
            FROM notification_workflows
            WHERE 1=1
        `;

        const replacements = {};

        // Filtro por scope
        if (scope === 'aponnt') {
            query += ` AND scope = 'aponnt'`;
        } else if (scope === 'company') {
            query += ` AND scope = 'company'`;
            // Si es empresa, solo ver sus propios workflows
            if (req.user.companyId) {
                query += ` AND (company_id = :companyId OR company_id IS NULL)`;
                replacements.companyId = req.user.companyId;
            }
        }

        // Filtro por módulo
        if (module) {
            query += ` AND module = :module`;
            replacements.module = module;
        }

        // Filtro por prioridad
        if (priority) {
            query += ` AND priority = :priority`;
            replacements.priority = priority;
        }

        // Filtro por activo
        if (is_active !== 'all') {
            query += ` AND is_active = :is_active`;
            replacements.is_active = is_active === 'true';
        }

        query += ` ORDER BY module ASC, priority DESC, process_name ASC`;
        query += ` LIMIT :limit OFFSET :offset`;

        replacements.limit = parseInt(limit);
        replacements.offset = parseInt(offset);

        const workflows = await sequelize.query(query, {
            replacements,
            type: QueryTypes.SELECT
        });

        // Contar total
        let countQuery = query.split('LIMIT')[0].replace(/SELECT.*FROM/, 'SELECT COUNT(*) as total FROM');
        const [countResult] = await sequelize.query(countQuery, {
            replacements,
            type: QueryTypes.SELECT
        });

        res.json({
            success: true,
            total: parseInt(countResult.total),
            count: workflows.length,
            workflows
        });

    } catch (error) {
        console.error('❌ [NOTIFICATION-API] Error listing workflows:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/notifications/workflows/stats - Estadísticas globales
 */
router.get('/workflows/stats', authenticateJWT, async (req, res) => {
    try {
        const query = `
            SELECT
                scope,
                module,
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE requires_response = true) as with_response,
                COUNT(*) FILTER (WHERE is_active = true) as active,
                COUNT(*) FILTER (WHERE is_active = false) as inactive
            FROM notification_workflows
            GROUP BY scope, module
            ORDER BY scope, module
        `;

        const stats = await sequelize.query(query, { type: QueryTypes.SELECT });

        // Agrupar por scope
        const grouped = {
            aponnt: stats.filter(s => s.scope === 'aponnt'),
            company: stats.filter(s => s.scope === 'company'),
            summary: {
                total_aponnt: stats.filter(s => s.scope === 'aponnt').reduce((sum, s) => sum + parseInt(s.total), 0),
                total_company: stats.filter(s => s.scope === 'company').reduce((sum, s) => sum + parseInt(s.total), 0)
            }
        };

        res.json({
            success: true,
            stats: grouped
        });

    } catch (error) {
        console.error('❌ [NOTIFICATION-API] Error getting stats:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/notifications/workflows/:id - Obtener workflow específico
 */
router.get('/workflows/:id', authenticateJWT, async (req, res) => {
    try {
        const { id } = req.params;

        const [workflow] = await sequelize.query(`
            SELECT * FROM notification_workflows WHERE id = :id
        `, {
            replacements: { id },
            type: QueryTypes.SELECT
        });

        if (!workflow) {
            return res.status(404).json({ error: 'Workflow no encontrado' });
        }

        // Verificar permisos
        if (workflow.scope === 'company' && workflow.company_id !== req.user.companyId) {
            return res.status(403).json({ error: 'Acceso denegado' });
        }

        res.json({
            success: true,
            workflow
        });

    } catch (error) {
        console.error('❌ [NOTIFICATION-API] Error getting workflow:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * PATCH /api/notifications/workflows/:id - Actualizar workflow
 */
router.patch('/workflows/:id', authenticateJWT, async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        // Verificar que existe
        const [workflow] = await sequelize.query(`
            SELECT * FROM notification_workflows WHERE id = :id
        `, {
            replacements: { id },
            type: QueryTypes.SELECT
        });

        if (!workflow) {
            return res.status(404).json({ error: 'Workflow no encontrado' });
        }

        // Verificar permisos
        if (workflow.scope === 'company' && workflow.company_id !== req.user.companyId) {
            return res.status(403).json({ error: 'Acceso denegado' });
        }

        // Campos permitidos para actualizar
        const allowedFields = [
            'process_name', 'description', 'channels', 'priority',
            'requires_response', 'response_type', 'response_options',
            'response_timeout_hours', 'auto_action_on_timeout',
            'is_active', 'metadata', 'workflow_steps'
        ];

        const setParts = [];
        const replacements = { id };

        for (const field of allowedFields) {
            if (updates[field] !== undefined) {
                setParts.push(`${field} = :${field}`);
                replacements[field] = typeof updates[field] === 'object' ?
                    JSON.stringify(updates[field]) : updates[field];
            }
        }

        if (setParts.length === 0) {
            return res.status(400).json({ error: 'No hay campos para actualizar' });
        }

        setParts.push(`updated_at = CURRENT_TIMESTAMP`);
        setParts.push(`updated_by = :userId`);
        replacements.userId = req.user.id;

        const updateQuery = `
            UPDATE notification_workflows
            SET ${setParts.join(', ')}
            WHERE id = :id
        `;

        await sequelize.query(updateQuery, { replacements });

        res.json({
            success: true,
            message: 'Workflow actualizado correctamente'
        });

    } catch (error) {
        console.error('❌ [NOTIFICATION-API] Error updating workflow:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/notifications/workflows - Crear nuevo workflow
 */
router.post('/workflows', authenticateJWT, async (req, res) => {
    try {
        const {
            process_key,
            process_name,
            module,
            description,
            scope = 'company',
            channels = ['email'],
            priority = 'medium',
            requires_response = false,
            response_type,
            response_options,
            workflow_steps,
            metadata = {}
        } = req.body;

        // Validaciones
        if (!process_key || !process_name || !module) {
            return res.status(400).json({
                error: 'Campos requeridos: process_key, process_name, module'
            });
        }

        // Si es scope='company', requiere company_id
        const company_id = scope === 'company' ? req.user.companyId : null;

        if (scope === 'company' && !company_id) {
            return res.status(400).json({
                error: 'company_id requerido para workflows de tipo company'
            });
        }

        const query = `
            INSERT INTO notification_workflows (
                process_key, process_name, module, description,
                scope, company_id, channels, priority,
                requires_response, response_type, response_options,
                workflow_steps, metadata, created_by
            ) VALUES (
                :process_key, :process_name, :module, :description,
                :scope, :company_id, :channels::jsonb, :priority,
                :requires_response, :response_type, :response_options::jsonb,
                :workflow_steps::jsonb, :metadata::jsonb, :created_by
            )
            RETURNING id
        `;

        const [result] = await sequelize.query(query, {
            replacements: {
                process_key,
                process_name,
                module,
                description,
                scope,
                company_id,
                channels: JSON.stringify(channels),
                priority,
                requires_response,
                response_type,
                response_options: JSON.stringify(response_options || []),
                workflow_steps: JSON.stringify(workflow_steps || { steps: [] }),
                metadata: JSON.stringify(metadata),
                created_by: req.user.id
            },
            type: QueryTypes.SELECT
        });

        res.json({
            success: true,
            message: 'Workflow creado correctamente',
            workflowId: result.id
        });

    } catch (error) {
        console.error('❌ [NOTIFICATION-API] Error creating workflow:', error);
        res.status(500).json({ error: error.message });
    }
});

// =========================================================================
// ENDPOINTS - TRIGGER Y RESPUESTAS
// =========================================================================

/**
 * POST /api/notifications/trigger - Disparar workflow manualmente
 */
router.post('/trigger', authenticateJWT, async (req, res) => {
    try {
        const {
            processKey,
            recipientId,
            recipientType,
            recipientEmail,
            recipientPhone,
            metadata,
            templateVars
        } = req.body;

        if (!processKey) {
            return res.status(400).json({ error: 'processKey requerido' });
        }

        const result = await NotificationOrchestrator.trigger(processKey, {
            companyId: req.user.companyId,
            recipientId,
            recipientType,
            recipientEmail,
            recipientPhone,
            metadata,
            templateVars
        });

        res.json({
            success: true,
            message: 'Workflow disparado correctamente',
            result
        });

    } catch (error) {
        console.error('❌ [NOTIFICATION-API] Error triggering workflow:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/notifications/response/:logId - Registrar respuesta de usuario
 * Se usa desde botones en emails (ACEPTO, RECHAZO, etc.)
 */
router.get('/response/:logId', async (req, res) => {
    try {
        const { logId } = req.params;
        const { response } = req.query;

        if (!response) {
            return res.status(400).send('Respuesta no proporcionada');
        }

        const result = await NotificationOrchestrator.processUserResponse(logId, response, {
            ip_address: req.ip,
            user_agent: req.headers['user-agent'],
            timestamp: new Date().toISOString()
        });

        // Mostrar página de confirmación
        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Respuesta Registrada</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        height: 100vh;
                        margin: 0;
                        background: #f5f5f5;
                    }
                    .container {
                        background: white;
                        padding: 40px;
                        border-radius: 10px;
                        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                        text-align: center;
                    }
                    .success {
                        color: #28a745;
                        font-size: 48px;
                        margin-bottom: 20px;
                    }
                    h1 {
                        color: #333;
                        margin: 0 0 10px 0;
                    }
                    p {
                        color: #666;
                        font-size: 16px;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="success">✓</div>
                    <h1>¡Respuesta Registrada!</h1>
                    <p>Tu respuesta "<strong>${response}</strong>" ha sido registrada correctamente.</p>
                    <p style="margin-top: 20px; font-size: 14px; color: #999;">
                        Puedes cerrar esta ventana.
                    </p>
                </div>
            </body>
            </html>
        `);

    } catch (error) {
        console.error('❌ [NOTIFICATION-API] Error processing response:', error);
        res.status(500).send('Error procesando respuesta');
    }
});

// =========================================================================
// ENDPOINTS - HISTORIAL Y LOGS
// =========================================================================

/**
 * GET /api/notifications/log - Historial de notificaciones
 */
router.get('/log', authenticateJWT, async (req, res) => {
    try {
        const {
            process_key,
            channel,
            status,
            limit = 50,
            offset = 0
        } = req.query;

        let query = `
            SELECT
                id, workflow_id, process_key, channel,
                recipient_type, recipient_email,
                sent_at, delivered_at, read_at, response_at,
                response, status, error_message
            FROM notification_log
            WHERE 1=1
        `;

        const replacements = {};

        // Si es empresa, solo ver sus notificaciones
        if (req.user.companyId) {
            query += ` AND company_id = :companyId`;
            replacements.companyId = req.user.companyId;
        }

        // Filtros
        if (process_key) {
            query += ` AND process_key = :process_key`;
            replacements.process_key = process_key;
        }

        if (channel) {
            query += ` AND channel = :channel`;
            replacements.channel = channel;
        }

        if (status) {
            query += ` AND status = :status`;
            replacements.status = status;
        }

        query += ` ORDER BY sent_at DESC LIMIT :limit OFFSET :offset`;

        replacements.limit = parseInt(limit);
        replacements.offset = parseInt(offset);

        const logs = await sequelize.query(query, {
            replacements,
            type: QueryTypes.SELECT
        });

        res.json({
            success: true,
            count: logs.length,
            logs
        });

    } catch (error) {
        console.error('❌ [NOTIFICATION-API] Error getting logs:', error);
        res.status(500).json({ error: error.message });
    }
});

// =========================================================================
// ENDPOINTS - MÉTRICAS
// =========================================================================

/**
 * GET /api/notifications/metrics/process/:processKey - Métricas de un proceso
 */
router.get('/metrics/process/:processKey', authenticateJWT, async (req, res) => {
    try {
        const { processKey } = req.params;
        const { days = 30 } = req.query;

        const metrics = await NotificationOrchestrator.getProcessMetrics(
            processKey,
            req.user.companyId,
            parseInt(days)
        );

        res.json({
            success: true,
            processKey,
            days: parseInt(days),
            metrics
        });

    } catch (error) {
        console.error('❌ [NOTIFICATION-API] Error getting metrics:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/notifications/metrics/channels - Stats por canal
 */
router.get('/metrics/channels', authenticateJWT, async (req, res) => {
    try {
        const { days = 30 } = req.query;

        const stats = await NotificationOrchestrator.getChannelStats(parseInt(days));

        res.json({
            success: true,
            days: parseInt(days),
            stats
        });

    } catch (error) {
        console.error('❌ [NOTIFICATION-API] Error getting channel stats:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
