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

// ═══════════════════════════════════════════════════════════════
// ENDPOINTS DE NOTIFICACIONES DE EMPLEADO (Mi Espacio)
// ═══════════════════════════════════════════════════════════════

/**
 * POST /api/inbox/employee-notification
 * Crea notificación desde Mi Espacio del empleado
 * SSOT para flujo médico - Si es enfermedad y empresa tiene módulo médico,
 * crea caso médico y notifica a RRHH + médico asignado
 */
router.post('/employee-notification', async (req, res) => {
    try {
        const { employee_id, company_id, role } = req.user;
        const {
            category,
            date,
            time,
            end_date,
            reason,
            symptoms,
            attachments
        } = req.body;

        console.log('📬 [EMPLOYEE-NOTIFICATION] Nueva notificación de empleado');
        console.log('   📁 Categoría:', category);
        console.log('   👤 Empleado:', employee_id);
        console.log('   🏢 Empresa:', company_id);

        // Validar campos requeridos
        if (!category || !date) {
            return res.status(400).json({
                success: false,
                error: 'Categoría y fecha son requeridos'
            });
        }

        // Mapeo de categorías a tipos y destinos
        const CATEGORY_CONFIG = {
            late_arrival: {
                group_type: 'attendance_late',
                subject: 'Notificación de Llegada Tarde',
                priority: 'normal',
                absence_type: null
            },
            absence: {
                group_type: 'attendance_absence',
                subject: 'Notificación de Inasistencia',
                priority: 'high',
                absence_type: 'absence'
            },
            illness: {
                group_type: 'medical_illness',
                subject: 'Notificación de Enfermedad',
                priority: 'high',
                absence_type: 'medical_illness'
            },
            force_majeure: {
                group_type: 'force_majeure',
                subject: 'Notificación de Fuerza Mayor',
                priority: 'urgent',
                absence_type: 'force_majeure'
            },
            permission_request: {
                group_type: 'permission_request',
                subject: 'Solicitud de Permiso',
                priority: 'normal',
                absence_type: null
            }
        };

        const categoryConfig = CATEGORY_CONFIG[category];
        if (!categoryConfig) {
            return res.status(400).json({
                success: false,
                error: 'Categoría no válida'
            });
        }

        const { sequelize } = require('../config/database');

        // Obtener datos del empleado - soporta tanto UUID como employeeId (string)
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(employee_id);

        let employeeQuery = '';
        if (isUUID) {
            employeeQuery = `u.user_id = :employeeId`;
        } else {
            employeeQuery = `u."employeeId" = :employeeId`;
        }

        const [employeeData] = await sequelize.query(`
            SELECT
                u.user_id,
                u."firstName",
                u."lastName",
                u."employeeId" as legajo,
                u.email,
                u.department_id,
                d.name as department_name,
                u.branch_id
            FROM users u
            LEFT JOIN departments d ON u.department_id = d.id
            WHERE ${employeeQuery} AND u.company_id = :companyId
            LIMIT 1
        `, {
            replacements: { employeeId: employee_id, companyId: company_id },
            type: sequelize.QueryTypes.SELECT
        });

        if (!employeeData || employeeData.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Empleado no encontrado'
            });
        }

        const employee = employeeData[0] || employeeData;
        const employeeName = `${employee.firstName} ${employee.lastName}`;
        const employeeUserId = employee.user_id;

        // Verificar si la empresa tiene módulo médico contratado
        let hasMedicalModule = false;
        try {
            const [moduleCheck] = await sequelize.query(`
                SELECT EXISTS(
                    SELECT 1 FROM company_modules cm
                    JOIN system_modules sm ON cm.system_module_id = sm.id
                    WHERE cm.company_id = :companyId
                    AND sm.module_key IN ('medical', 'medical-dashboard', 'occupational-health', 'medical-cases')
                    AND cm.is_active = true
                ) as has_medical
            `, {
                replacements: { companyId: company_id },
                type: sequelize.QueryTypes.SELECT
            });
            hasMedicalModule = moduleCheck?.has_medical || moduleCheck?.[0]?.has_medical || false;
        } catch (e) {
            console.log('⚠️ [EMPLOYEE-NOTIFICATION] No se pudo verificar módulo médico:', e.message);
        }

        console.log('   🏥 ¿Tiene módulo médico?:', hasMedicalModule);

        // 1. Crear grupo de notificación
        const [groupResult] = await sequelize.query(`
            INSERT INTO notification_groups (
                group_type,
                initiator_type,
                initiator_id,
                subject,
                priority,
                company_id,
                metadata
            ) VALUES (
                :group_type,
                'employee',
                :initiator_id,
                :subject,
                :priority,
                :company_id,
                :metadata
            )
            RETURNING *
        `, {
            replacements: {
                group_type: categoryConfig.group_type,
                initiator_id: employee_id,
                subject: `${categoryConfig.subject} - ${employeeName}`,
                priority: categoryConfig.priority,
                company_id: company_id,
                metadata: JSON.stringify({
                    category,
                    date,
                    time,
                    end_date,
                    reason,
                    symptoms,
                    employee_name: employeeName,
                    employee_id: employee_id,
                    legajo: employee.legajo,
                    department: employee.department_name,
                    has_medical_module: hasMedicalModule,
                    attachments: attachments || []
                })
            }
        });

        const notificationGroup = groupResult[0];
        console.log('   ✅ Grupo creado:', notificationGroup.id);

        // 2. Buscar un usuario de RRHH/admin para el mensaje inicial
        let rrhhRecipientId = 'RRHH-GENERAL';
        let rrhhRecipientName = 'Recursos Humanos';
        try {
            const [rrhhFirst] = await sequelize.query(`
                SELECT user_id, "firstName", "lastName"
                FROM users
                WHERE company_id = :companyId
                AND role IN ('admin', 'rrhh')
                AND is_active = true
                LIMIT 1
            `, {
                replacements: { companyId: company_id },
                type: sequelize.QueryTypes.SELECT
            });

            if (rrhhFirst && (rrhhFirst.length > 0 || rrhhFirst.user_id)) {
                const rrhh = rrhhFirst[0] || rrhhFirst;
                rrhhRecipientId = rrhh.user_id;
                rrhhRecipientName = `${rrhh.firstName} ${rrhh.lastName}`;
            }
        } catch (e) {
            console.log('⚠️ No se encontró usuario RRHH, usando valor por defecto');
        }

        // 3. Crear mensaje inicial del empleado
        const messageContent = buildNotificationMessage(category, {
            date, time, end_date, reason, symptoms, employeeName
        });

        // Generar hash para el mensaje
        const crypto = require('crypto');
        const hashContent = `${notificationGroup.id}|1|${employee_id}|${rrhhRecipientId}|${messageContent}|${new Date().toISOString()}`;
        const messageHash = crypto.createHash('sha256').update(hashContent).digest('hex');

        await sequelize.query(`
            INSERT INTO notification_messages (
                group_id,
                sequence_number,
                sender_type,
                sender_id,
                sender_name,
                recipient_type,
                recipient_id,
                recipient_name,
                message_type,
                subject,
                content,
                requires_response,
                channels,
                message_hash,
                company_id
            ) VALUES (
                :group_id,
                1,
                'employee',
                :sender_id,
                :sender_name,
                'rrhh',
                :recipient_id,
                :recipient_name,
                'notification',
                :subject,
                :content,
                true,
                '["web", "email"]',
                :message_hash,
                :company_id
            )
        `, {
            replacements: {
                group_id: notificationGroup.id,
                sender_id: employee_id,
                sender_name: employeeName,
                recipient_id: rrhhRecipientId,
                recipient_name: rrhhRecipientName,
                subject: categoryConfig.subject,
                content: messageContent,
                message_hash: messageHash,
                company_id: company_id
            }
        });

        let medicalCaseId = null;
        let assignedDoctorId = null;
        let assignedDoctorName = null;

        // 3. Si es ENFERMEDAD y tiene módulo médico → Crear caso médico
        if (category === 'illness' && hasMedicalModule) {
            console.log('   🏥 Iniciando caso médico (SSOT)...');

            // Buscar médico asignado para la sucursal/empresa
            try {
                const [doctorResult] = await sequelize.query(`
                    SELECT
                        p.id,
                        p.first_name,
                        p.last_name,
                        p.email,
                        p.specialty,
                        cms.is_primary
                    FROM company_medical_staff cms
                    JOIN partners p ON cms.partner_id = p.id
                    WHERE cms.company_id = :companyId
                    AND cms.is_active = true
                    AND p.is_medical_staff = true
                    ORDER BY cms.is_primary DESC, cms.assigned_at ASC
                    LIMIT 1
                `, {
                    replacements: { companyId: company_id },
                    type: sequelize.QueryTypes.SELECT
                });

                if (doctorResult && (doctorResult.length > 0 || doctorResult.id)) {
                    const doctor = doctorResult[0] || doctorResult;
                    assignedDoctorId = doctor.id;
                    assignedDoctorName = `${doctor.first_name} ${doctor.last_name}`;
                    console.log('   👨‍⚕️ Médico asignado:', assignedDoctorName);
                }
            } catch (e) {
                console.log('⚠️ No se encontró médico asignado:', e.message);
            }

            // Crear caso médico (absence_case)
            const [caseResult] = await sequelize.query(`
                INSERT INTO absence_cases (
                    company_id,
                    employee_id,
                    absence_type,
                    start_date,
                    end_date,
                    requested_days,
                    employee_description,
                    employee_attachments,
                    case_status,
                    assigned_doctor_id,
                    assignment_date,
                    created_by,
                    notification_group_id
                ) VALUES (
                    :company_id,
                    :employee_id,
                    'medical_illness',
                    :start_date,
                    :end_date,
                    :requested_days,
                    :description,
                    :attachments,
                    'pending',
                    :doctor_id,
                    ${assignedDoctorId ? 'NOW()' : 'NULL'},
                    :created_by,
                    :notification_group_id
                )
                RETURNING id
            `, {
                replacements: {
                    company_id: company_id,
                    employee_id: employeeUserId,
                    start_date: date,
                    end_date: end_date || null,
                    requested_days: end_date ?
                        Math.ceil((new Date(end_date) - new Date(date)) / (1000 * 60 * 60 * 24)) + 1 : 1,
                    description: `${reason || ''}\n\nSíntomas: ${symptoms || 'No especificados'}`,
                    attachments: JSON.stringify(attachments || []),
                    doctor_id: assignedDoctorId,
                    created_by: employeeUserId,
                    notification_group_id: notificationGroup.id
                }
            });

            medicalCaseId = caseResult[0]?.id;
            console.log('   ✅ Caso médico creado:', medicalCaseId);

            // Actualizar metadata del grupo con el caso médico
            await sequelize.query(`
                UPDATE notification_groups
                SET metadata = metadata || :additional_metadata
                WHERE id = :group_id
            `, {
                replacements: {
                    group_id: notificationGroup.id,
                    additional_metadata: JSON.stringify({
                        medical_case_id: medicalCaseId,
                        assigned_doctor_id: assignedDoctorId,
                        assigned_doctor_name: assignedDoctorName
                    })
                }
            });

            // Notificar al médico asignado
            if (assignedDoctorId) {
                await sequelize.query(`
                    INSERT INTO notification_messages (
                        group_id,
                        sequence_number,
                        sender_type,
                        sender_id,
                        sender_name,
                        recipient_type,
                        recipient_id,
                        recipient_name,
                        message_type,
                        subject,
                        content,
                        requires_response,
                        channels,
                        company_id
                    ) VALUES (
                        :group_id,
                        2,
                        'system',
                        'SYSTEM',
                        'Sistema',
                        'doctor',
                        :doctor_id,
                        :doctor_name,
                        'medical_case_assignment',
                        'Nuevo caso médico asignado',
                        :content,
                        true,
                        '["web", "email", "push"]',
                        :company_id
                    )
                `, {
                    replacements: {
                        group_id: notificationGroup.id,
                        doctor_id: assignedDoctorId,
                        doctor_name: assignedDoctorName,
                        content: `Nuevo caso médico asignado.\n\nEmpleado: ${employeeName}\nLegajo: ${employee.legajo}\nDepartamento: ${employee.department_name || 'N/A'}\n\nMotivo: ${reason || 'No especificado'}\nSíntomas: ${symptoms || 'No especificados'}\nFecha inicio: ${date}\n\nPor favor, revise el caso en el Dashboard Médico.`,
                        company_id: company_id
                    }
                });
                console.log('   ✅ Notificación enviada al médico');
            }

            // Crear comunicación médica inicial
            await sequelize.query(`
                INSERT INTO medical_communications (
                    company_id,
                    absence_case_id,
                    sender_type,
                    sender_id,
                    receiver_type,
                    receiver_id,
                    message_type,
                    message
                ) VALUES (
                    :company_id,
                    :case_id,
                    'employee',
                    :employee_id,
                    'doctor',
                    :doctor_id,
                    'initial_notification',
                    :message
                )
            `, {
                replacements: {
                    company_id: company_id,
                    case_id: medicalCaseId,
                    employee_id: employeeUserId,
                    doctor_id: assignedDoctorId,
                    message: `Notificación inicial de enfermedad.\n\nMotivo: ${reason || 'No especificado'}\nSíntomas: ${symptoms || 'No especificados'}\nFecha: ${date}`
                }
            });
        }

        // 4. Notificar a RRHH (buscar usuarios con rol rrhh o admin)
        try {
            const [rrhhUsers] = await sequelize.query(`
                SELECT user_id, "firstName", "lastName", email
                FROM users
                WHERE company_id = :companyId
                AND role IN ('admin', 'rrhh', 'supervisor')
                AND is_active = true
                LIMIT 5
            `, {
                replacements: { companyId: company_id },
                type: sequelize.QueryTypes.SELECT
            });

            // Crear notificaciones para RRHH
            if (rrhhUsers && rrhhUsers.length > 0) {
                for (const rrhhUser of rrhhUsers) {
                    await sequelize.query(`
                        INSERT INTO notification_messages (
                            group_id,
                            sequence_number,
                            sender_type,
                            sender_id,
                            sender_name,
                            recipient_type,
                            recipient_id,
                            recipient_name,
                            message_type,
                            subject,
                            content,
                            requires_response,
                            channels,
                            company_id
                        ) VALUES (
                            :group_id,
                            (SELECT COALESCE(MAX(sequence_number), 0) + 1 FROM notification_messages WHERE group_id = :group_id),
                            'system',
                            'SYSTEM',
                            'Sistema',
                            'rrhh',
                            :recipient_id,
                            :recipient_name,
                            'rrhh_notification',
                            :subject,
                            :content,
                            true,
                            '["web", "email"]',
                            :company_id
                        )
                    `, {
                        replacements: {
                            group_id: notificationGroup.id,
                            recipient_id: rrhhUser.user_id,
                            recipient_name: `${rrhhUser.firstName} ${rrhhUser.lastName}`,
                            subject: `${categoryConfig.subject} - Requiere atención`,
                            content: `El empleado ${employeeName} (${employee.legajo}) ha reportado: ${categoryConfig.subject}\n\nFecha: ${date}\nMotivo: ${reason || 'No especificado'}${category === 'illness' && medicalCaseId ? `\n\n🏥 Caso médico #${medicalCaseId} creado automáticamente.` : ''}`,
                            company_id: company_id
                        }
                    });
                }
                console.log(`   ✅ Notificado a ${rrhhUsers.length} usuario(s) de RRHH`);
            }
        } catch (e) {
            console.log('⚠️ Error notificando a RRHH:', e.message);
        }

        // 5. Respuesta exitosa
        res.json({
            success: true,
            message: 'Notificación enviada correctamente',
            data: {
                notification_group_id: notificationGroup.id,
                category,
                medical_case_id: medicalCaseId,
                assigned_doctor: assignedDoctorName,
                has_medical_integration: category === 'illness' && hasMedicalModule
            }
        });

    } catch (error) {
        console.error('❌ [EMPLOYEE-NOTIFICATION] Error:', error);
        res.status(500).json({
            success: false,
            error: 'Error al procesar la notificación',
            details: error.message
        });
    }
});

/**
 * Construir mensaje de notificación según categoría
 */
function buildNotificationMessage(category, data) {
    const { date, time, end_date, reason, symptoms, employeeName } = data;

    const dateStr = new Date(date).toLocaleDateString('es-AR');
    const timeStr = time || 'No especificada';

    switch(category) {
        case 'late_arrival':
            return `📋 **Notificación de Llegada Tarde**\n\n` +
                   `👤 Empleado: ${employeeName}\n` +
                   `📅 Fecha: ${dateStr}\n` +
                   `🕐 Hora de llegada: ${timeStr}\n\n` +
                   `📝 Motivo:\n${reason || 'No especificado'}`;

        case 'absence':
            return `📋 **Notificación de Inasistencia**\n\n` +
                   `👤 Empleado: ${employeeName}\n` +
                   `📅 Fecha: ${dateStr}\n` +
                   `${end_date ? `📅 Hasta: ${new Date(end_date).toLocaleDateString('es-AR')}\n` : ''}\n` +
                   `📝 Motivo:\n${reason || 'No especificado'}`;

        case 'illness':
            return `🏥 **Notificación de Enfermedad**\n\n` +
                   `👤 Empleado: ${employeeName}\n` +
                   `📅 Fecha inicio: ${dateStr}\n` +
                   `${end_date ? `📅 Fecha estimada retorno: ${new Date(end_date).toLocaleDateString('es-AR')}\n` : ''}\n` +
                   `🩺 Síntomas:\n${symptoms || 'No especificados'}\n\n` +
                   `📝 Observaciones:\n${reason || 'Sin observaciones adicionales'}`;

        case 'force_majeure':
            return `⚡ **Notificación de Fuerza Mayor**\n\n` +
                   `👤 Empleado: ${employeeName}\n` +
                   `📅 Fecha: ${dateStr}\n` +
                   `${end_date ? `📅 Hasta: ${new Date(end_date).toLocaleDateString('es-AR')}\n` : ''}\n` +
                   `📝 Descripción del evento:\n${reason || 'No especificado'}`;

        case 'permission_request':
            return `🙋 **Solicitud de Permiso**\n\n` +
                   `👤 Empleado: ${employeeName}\n` +
                   `📅 Fecha: ${dateStr}\n` +
                   `${end_date ? `📅 Hasta: ${new Date(end_date).toLocaleDateString('es-AR')}\n` : ''}\n` +
                   `🕐 Hora: ${timeStr}\n\n` +
                   `📝 Motivo:\n${reason || 'No especificado'}`;

        default:
            return `📋 **Notificación**\n\n` +
                   `👤 Empleado: ${employeeName}\n` +
                   `📅 Fecha: ${dateStr}\n\n` +
                   `📝 Detalle:\n${reason || 'No especificado'}`;
    }
}

/**
 * GET /api/inbox/my-notifications
 * Obtiene notificaciones del empleado actual (para Mi Espacio)
 */
router.get('/my-notifications', async (req, res) => {
    try {
        const { employee_id, company_id } = req.user;

        const notifications = await inboxService.getEmployeeNotifications(employee_id, company_id);

        res.json({
            success: true,
            notifications,
            count: notifications.length
        });

    } catch (error) {
        console.error('❌ Error obteniendo mis notificaciones:', error);
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
