/**
 * ============================================================================
 * NOTIFICATION UNIFIED SERVICE v3.0
 * ============================================================================
 * Sistema unificado de notificaciones para todo el ecosistema:
 * - Panel Administrativo (Aponnt)
 * - Panel Empresa
 * - APKs Flutter
 *
 * Caracteristicas:
 * - Multi-tenant
 * - Workflows multi-nivel
 * - AI Integration (Ollama)
 * - SLA y escalamiento automatico
 * - Soporte para conversaciones/threads
 * ============================================================================
 */

const { sequelize } = require('../config/database');
const { QueryTypes, Op } = require('sequelize');

class NotificationUnifiedService {
    constructor() {
        this.ollamaUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
        this.ollamaModel = process.env.OLLAMA_MODEL || 'llama3.1:8b';
        console.log('[NOTIFICATION-UNIFIED] Servicio inicializado');
    }

    // ========================================================================
    // THREADS (Conversaciones)
    // ========================================================================

    /**
     * Obtener threads/conversaciones de un usuario
     */
    async getThreads(userId, companyId, options = {}) {
        const {
            status = null,
            category = null,
            module = null,
            priority = null,
            limit = 50,
            offset = 0,
            includeMessages = false
        } = options;

        let whereClause = `WHERE t.company_id = :companyId`;
        const replacements = { companyId, userId, limit, offset };

        if (status) {
            whereClause += ` AND t.status = :status`;
            replacements.status = status;
        }
        if (category) {
            whereClause += ` AND t.category = :category`;
            replacements.category = category;
        }
        if (module) {
            whereClause += ` AND t.module = :module`;
            replacements.module = module;
        }
        if (priority) {
            whereClause += ` AND t.priority = :priority`;
            replacements.priority = priority;
        }

        // Filtrar por participacion del usuario
        whereClause += ` AND (
            t.initiator_id = :userId OR
            EXISTS (
                SELECT 1 FROM unified_notifications n
                WHERE n.thread_id = t.id
                AND (n.recipient_id = :userId OR n.origin_id = :userId)
            )
        )`;

        const query = `
            SELECT
                t.*,
                (SELECT COUNT(*) FROM unified_notifications n WHERE n.thread_id = t.id AND n.is_read = FALSE AND n.recipient_id = :userId) as my_unread_count,
                (SELECT n.message FROM unified_notifications n WHERE n.thread_id = t.id ORDER BY n.created_at DESC LIMIT 1) as last_message
            FROM notification_threads t
            ${whereClause}
            ORDER BY
                CASE t.priority
                    WHEN 'critical' THEN 1
                    WHEN 'high' THEN 2
                    WHEN 'medium' THEN 3
                    ELSE 4
                END,
                t.last_message_at DESC
            LIMIT :limit OFFSET :offset
        `;

        const threads = await sequelize.query(query, {
            replacements,
            type: QueryTypes.SELECT
        });

        // Obtener mensajes si se solicita
        if (includeMessages && threads.length > 0) {
            for (const thread of threads) {
                thread.messages = await this.getThreadMessages(thread.id, userId, companyId, { limit: 5 });
            }
        }

        return threads;
    }

    /**
     * Crear un nuevo thread
     */
    async createThread(data) {
        const {
            companyId,
            subject,
            category,
            module,
            threadType,
            initiatorType,
            initiatorId,
            initiatorName,
            priority = 'medium',
            workflowId = null
        } = data;

        const query = `
            INSERT INTO notification_threads (
                company_id, subject, category, module, thread_type,
                initiator_type, initiator_id, initiator_name, priority, workflow_id
            ) VALUES (
                :companyId, :subject, :category, :module, :threadType,
                :initiatorType, :initiatorId, :initiatorName, :priority, :workflowId
            ) RETURNING *
        `;

        const [thread] = await sequelize.query(query, {
            replacements: {
                companyId, subject, category, module, threadType,
                initiatorType, initiatorId, initiatorName, priority, workflowId
            },
            type: QueryTypes.INSERT
        });

        return thread[0] || thread;
    }

    /**
     * Obtener mensajes de un thread
     */
    async getThreadMessages(threadId, userId, companyId, options = {}) {
        const { limit = 50, offset = 0, markAsRead = true } = options;

        const messages = await sequelize.query(`
            SELECT n.*,
                   CASE WHEN n.origin_id = :userId THEN true ELSE false END as is_mine
            FROM unified_notifications n
            WHERE n.thread_id = :threadId
              AND n.company_id = :companyId
              AND n.deleted_at IS NULL
            ORDER BY n.sequence_in_thread ASC, n.created_at ASC
            LIMIT :limit OFFSET :offset
        `, {
            replacements: { threadId, userId, companyId, limit, offset },
            type: QueryTypes.SELECT
        });

        // Marcar como leidos
        if (markAsRead && messages.length > 0) {
            await sequelize.query(`
                UPDATE unified_notifications
                SET is_read = TRUE, read_at = NOW(), read_by = :userId
                WHERE thread_id = :threadId
                  AND recipient_id = :userId
                  AND is_read = FALSE
            `, {
                replacements: { threadId, userId },
                type: QueryTypes.UPDATE
            });
        }

        return messages;
    }

    // ========================================================================
    // NOTIFICACIONES
    // ========================================================================

    /**
     * Enviar notificacion (metodo principal)
     */
    async send(data) {
        const {
            companyId,
            threadId = null,
            originType,
            originId,
            originName,
            originRole = null,
            recipientType,
            recipientId,
            recipientName = null,
            recipientRole = null,
            recipientDepartmentId = null,
            recipientHierarchyLevel = 0,
            category = 'general',
            module = null,
            notificationType = null,
            priority = 'medium',
            title,
            message,
            shortMessage = null,
            metadata = {},
            relatedEntityType = null,
            relatedEntityId = null,
            requiresAction = false,
            actionType = null,
            actionOptions = [],
            actionDeadline = null,
            slaHours = null,
            channels = ['app'],
            createdBy = null
        } = data;

        // Calcular SLA deadline
        let slaDeadline = null;
        if (slaHours) {
            slaDeadline = new Date(Date.now() + slaHours * 60 * 60 * 1000);
        } else if (actionDeadline) {
            slaDeadline = new Date(actionDeadline);
        }

        // Obtener siguiente numero de secuencia en thread
        let sequenceInThread = 1;
        if (threadId) {
            const [result] = await sequelize.query(`
                SELECT COALESCE(MAX(sequence_in_thread), 0) + 1 as next_seq
                FROM unified_notifications WHERE thread_id = :threadId
            `, { replacements: { threadId }, type: QueryTypes.SELECT });
            sequenceInThread = result.next_seq;
        }

        const query = `
            INSERT INTO unified_notifications (
                company_id, thread_id, sequence_in_thread,
                origin_type, origin_id, origin_name, origin_role,
                recipient_type, recipient_id, recipient_name, recipient_role,
                recipient_department_id, recipient_hierarchy_level,
                category, module, notification_type, priority,
                title, message, short_message, metadata,
                related_entity_type, related_entity_id,
                requires_action, action_type, action_options, action_deadline,
                sla_hours, sla_deadline, channels, created_by
            ) VALUES (
                :companyId, :threadId, :sequenceInThread,
                :originType, :originId, :originName, :originRole,
                :recipientType, :recipientId, :recipientName, :recipientRole,
                :recipientDepartmentId, :recipientHierarchyLevel,
                :category, :module, :notificationType, :priority,
                :title, :message, :shortMessage, :metadata,
                :relatedEntityType, :relatedEntityId,
                :requiresAction, :actionType, :actionOptions, :actionDeadline,
                :slaHours, :slaDeadline, :channels, :createdBy
            ) RETURNING *
        `;

        const [notification] = await sequelize.query(query, {
            replacements: {
                companyId, threadId, sequenceInThread,
                originType, originId, originName, originRole,
                recipientType, recipientId, recipientName, recipientRole,
                recipientDepartmentId, recipientHierarchyLevel,
                category, module, notificationType, priority,
                title, message, shortMessage: shortMessage || message.substring(0, 280),
                metadata: JSON.stringify(metadata),
                relatedEntityType, relatedEntityId,
                requiresAction, actionType,
                actionOptions: JSON.stringify(actionOptions),
                actionDeadline,
                slaHours, slaDeadline,
                channels: JSON.stringify(channels),
                createdBy
            },
            type: QueryTypes.INSERT
        });

        const result = notification[0] || notification;

        // Registrar accion
        await this.logAction(result.id, threadId, companyId, 'created', createdBy, null, null, 'pending');

        // Intentar respuesta AI si esta habilitado
        if (category !== 'system') {
            this.tryAIResponse(result).catch(err =>
                console.error('[NOTIFICATION-UNIFIED] Error en AI:', err.message)
            );
        }

        return result;
    }

    /**
     * Obtener notificaciones de un usuario
     */
    async getForUser(userId, companyId, options = {}) {
        const {
            category = null,
            module = null,
            priority = null,
            isRead = null,
            requiresAction = null,
            limit = 50,
            offset = 0
        } = options;

        let whereClause = `WHERE n.company_id = :companyId AND n.deleted_at IS NULL`;
        const replacements = { userId, companyId, limit, offset };

        // Filtrar por destinatario (usuario, rol, broadcast)
        whereClause += ` AND (
            n.recipient_id = :userId OR
            n.recipient_type = 'broadcast' OR
            (n.recipient_type = 'role' AND n.recipient_role IN (
                SELECT role FROM users WHERE user_id = :userId::uuid
            ))
        )`;

        if (category) {
            whereClause += ` AND n.category = :category`;
            replacements.category = category;
        }
        if (module) {
            whereClause += ` AND n.module = :module`;
            replacements.module = module;
        }
        if (priority) {
            whereClause += ` AND n.priority = :priority`;
            replacements.priority = priority;
        }
        if (isRead !== null) {
            whereClause += ` AND n.is_read = :isRead`;
            replacements.isRead = isRead;
        }
        if (requiresAction !== null) {
            whereClause += ` AND n.requires_action = :requiresAction`;
            replacements.requiresAction = requiresAction;
        }

        const notifications = await sequelize.query(`
            SELECT n.*,
                   t.subject as thread_subject,
                   t.status as thread_status
            FROM unified_notifications n
            LEFT JOIN notification_threads t ON n.thread_id = t.id
            ${whereClause}
            ORDER BY
                CASE n.priority
                    WHEN 'critical' THEN 1
                    WHEN 'high' THEN 2
                    WHEN 'medium' THEN 3
                    ELSE 4
                END,
                n.created_at DESC
            LIMIT :limit OFFSET :offset
        `, {
            replacements,
            type: QueryTypes.SELECT
        });

        return notifications;
    }

    /**
     * Obtener estadisticas
     */
    async getStats(userId, companyId, options = {}) {
        const { byModule = false, byCategory = false } = options;

        const baseQuery = `
            SELECT
                COUNT(*) FILTER (WHERE n.deleted_at IS NULL) as total,
                COUNT(*) FILTER (WHERE n.is_read = FALSE AND n.deleted_at IS NULL) as unread,
                COUNT(*) FILTER (WHERE n.requires_action = TRUE AND n.action_status = 'pending' AND n.deleted_at IS NULL) as pending_actions,
                COUNT(*) FILTER (WHERE n.priority IN ('critical', 'high') AND n.is_read = FALSE AND n.deleted_at IS NULL) as urgent,
                COUNT(*) FILTER (WHERE n.sla_breached = TRUE AND n.deleted_at IS NULL) as sla_breached,
                COUNT(*) FILTER (WHERE n.ai_auto_responded = TRUE AND n.deleted_at IS NULL) as ai_responses
            FROM unified_notifications n
            WHERE n.company_id = :companyId
              AND (
                  n.recipient_id = :userId OR
                  n.recipient_type = 'broadcast' OR
                  n.origin_id = :userId
              )
        `;

        const [stats] = await sequelize.query(baseQuery, {
            replacements: { userId, companyId },
            type: QueryTypes.SELECT
        });

        // Por modulo
        if (byModule) {
            stats.byModule = await sequelize.query(`
                SELECT module, COUNT(*) as count,
                       COUNT(*) FILTER (WHERE is_read = FALSE) as unread
                FROM unified_notifications
                WHERE company_id = :companyId AND deleted_at IS NULL AND module IS NOT NULL
                  AND (recipient_id = :userId OR recipient_type = 'broadcast')
                GROUP BY module
            `, { replacements: { userId, companyId }, type: QueryTypes.SELECT });
        }

        // Por categoria
        if (byCategory) {
            stats.byCategory = await sequelize.query(`
                SELECT category, COUNT(*) as count,
                       COUNT(*) FILTER (WHERE is_read = FALSE) as unread
                FROM unified_notifications
                WHERE company_id = :companyId AND deleted_at IS NULL
                  AND (recipient_id = :userId OR recipient_type = 'broadcast')
                GROUP BY category
            `, { replacements: { userId, companyId }, type: QueryTypes.SELECT });
        }

        return stats;
    }

    // ========================================================================
    // ACCIONES
    // ========================================================================

    /**
     * Marcar como leida
     */
    async markAsRead(notificationId, userId) {
        await sequelize.query(`
            UPDATE unified_notifications
            SET is_read = TRUE, read_at = NOW(), read_by = :userId
            WHERE id = :notificationId AND is_read = FALSE
        `, {
            replacements: { notificationId, userId },
            type: QueryTypes.UPDATE
        });

        return { success: true };
    }

    /**
     * Procesar accion (aprobar/rechazar/etc)
     */
    async processAction(notificationId, userId, action, response = null, notes = null) {
        // Obtener notificacion
        const [notification] = await sequelize.query(`
            SELECT * FROM unified_notifications WHERE id = :notificationId
        `, { replacements: { notificationId }, type: QueryTypes.SELECT });

        if (!notification) {
            throw new Error('Notificacion no encontrada');
        }

        const previousStatus = notification.action_status;
        let newStatus;

        switch (action) {
            case 'approve':
                newStatus = 'approved';
                break;
            case 'reject':
                newStatus = 'rejected';
                break;
            case 'acknowledge':
                newStatus = 'acknowledged';
                break;
            default:
                newStatus = action;
        }

        // Actualizar notificacion
        await sequelize.query(`
            UPDATE unified_notifications
            SET action_status = :newStatus,
                action_taken_at = NOW(),
                action_taken_by = :userId,
                action_response = :response,
                action_notes = :notes,
                is_read = TRUE,
                read_at = COALESCE(read_at, NOW()),
                read_by = COALESCE(read_by, :userId)
            WHERE id = :notificationId
        `, {
            replacements: { notificationId, userId, newStatus, response, notes },
            type: QueryTypes.UPDATE
        });

        // Registrar accion
        await this.logAction(notificationId, notification.thread_id, notification.company_id,
            action, userId, null, previousStatus, newStatus, notes);

        // Procesar workflow si existe
        if (notification.workflow_id && notification.workflow_step > 0) {
            await this.processWorkflowStep(notification, action, userId);
        }

        return { success: true, previousStatus, newStatus };
    }

    /**
     * Registrar accion en log
     */
    async logAction(notificationId, threadId, companyId, action, userId, userName = null,
                    previousStatus = null, newStatus = null, notes = null, metadata = {}) {
        await sequelize.query(`
            INSERT INTO notification_actions_log (
                notification_id, thread_id, company_id, action, action_by,
                action_by_name, previous_status, new_status, notes, metadata
            ) VALUES (
                :notificationId, :threadId, :companyId, :action, :userId,
                :userName, :previousStatus, :newStatus, :notes, :metadata
            )
        `, {
            replacements: {
                notificationId, threadId, companyId, action, userId,
                userName, previousStatus, newStatus, notes,
                metadata: JSON.stringify(metadata)
            },
            type: QueryTypes.INSERT
        });
    }

    // ========================================================================
    // WORKFLOWS
    // ========================================================================

    /**
     * Procesar paso de workflow
     */
    async processWorkflowStep(notification, action, userId) {
        // Obtener workflow
        const [workflow] = await sequelize.query(`
            SELECT * FROM notification_workflows WHERE id = :workflowId
        `, { replacements: { workflowId: notification.workflow_id }, type: QueryTypes.SELECT });

        if (!workflow) return;

        const steps = workflow.steps;
        const currentStep = notification.workflow_step;

        if (action === 'approve' && currentStep < steps.length) {
            // Avanzar al siguiente paso
            const nextStep = steps[currentStep]; // 0-indexed, currentStep ya tiene el siguiente

            if (nextStep) {
                // Crear notificacion para siguiente aprobador
                await this.send({
                    companyId: notification.company_id,
                    threadId: notification.thread_id,
                    originType: 'system',
                    originId: 'workflow',
                    originName: 'Sistema de Workflows',
                    recipientType: 'role',
                    recipientId: null,
                    recipientRole: nextStep.approver_role,
                    category: 'approval',
                    module: notification.module,
                    priority: notification.priority,
                    title: `[Paso ${currentStep + 1}] ${notification.title}`,
                    message: notification.message,
                    metadata: { ...notification.metadata, workflow_step: currentStep + 1 },
                    requiresAction: true,
                    actionType: 'approve_reject',
                    slaHours: nextStep.timeout_hours
                });

                // Actualizar estado del thread
                await sequelize.query(`
                    UPDATE notification_threads
                    SET current_workflow_step = :step, status = 'pending'
                    WHERE id = :threadId
                `, { replacements: { step: currentStep + 1, threadId: notification.thread_id }, type: QueryTypes.UPDATE });
            }
        } else if (action === 'approve' && currentStep >= steps.length) {
            // Workflow completado
            await sequelize.query(`
                UPDATE notification_threads
                SET status = 'resolved', workflow_status = 'completed'
                WHERE id = :threadId
            `, { replacements: { threadId: notification.thread_id }, type: QueryTypes.UPDATE });

            // Ejecutar acciones on_approval
            // TODO: Implementar ejecutor de acciones
        } else if (action === 'reject') {
            // Workflow rechazado
            await sequelize.query(`
                UPDATE notification_threads
                SET status = 'closed', workflow_status = 'rejected'
                WHERE id = :threadId
            `, { replacements: { threadId: notification.thread_id }, type: QueryTypes.UPDATE });

            // Ejecutar acciones on_rejection
            // TODO: Implementar ejecutor de acciones
        }
    }

    // ========================================================================
    // AI INTEGRATION
    // ========================================================================

    /**
     * Intentar respuesta automatica con AI
     */
    async tryAIResponse(notification) {
        try {
            // Buscar respuestas aprendidas similares
            const similarResponses = await sequelize.query(`
                SELECT * FROM notification_ai_learning
                WHERE is_active = TRUE
                  AND (company_id IS NULL OR company_id = :companyId)
                  AND (module IS NULL OR module = :module)
                  AND confidence_score >= 0.7
                ORDER BY
                    CASE WHEN company_id = :companyId THEN 0 ELSE 1 END,
                    confidence_score DESC
                LIMIT 5
            `, {
                replacements: { companyId: notification.company_id, module: notification.module },
                type: QueryTypes.SELECT
            });

            if (similarResponses.length === 0) return;

            // Verificar similitud con Ollama
            const prompt = `
Analiza si alguna de estas respuestas predefinidas es apropiada para el siguiente mensaje:

MENSAJE: "${notification.message}"

RESPUESTAS DISPONIBLES:
${similarResponses.map((r, i) => `${i + 1}. [${r.category}] ${r.answer_summary || r.answer_content.substring(0, 200)}`).join('\n')}

Responde SOLO con el numero de la respuesta mas apropiada (1-${similarResponses.length}) o "0" si ninguna aplica.
Si la confianza es alta (>80%), responde con el numero. Si no, responde "0".
`;

            const response = await fetch(`${this.ollamaUrl}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: this.ollamaModel,
                    prompt,
                    stream: false,
                    options: { temperature: 0.1 }
                })
            });

            if (!response.ok) return;

            const result = await response.json();
            const answer = result.response?.trim();
            const selectedIndex = parseInt(answer) - 1;

            if (selectedIndex >= 0 && selectedIndex < similarResponses.length) {
                const selectedResponse = similarResponses[selectedIndex];

                // Actualizar notificacion con sugerencia AI
                await sequelize.query(`
                    UPDATE unified_notifications
                    SET ai_analyzed = TRUE,
                        ai_analyzed_at = NOW(),
                        ai_suggested_response = :response,
                        ai_confidence = :confidence
                    WHERE id = :notificationId
                `, {
                    replacements: {
                        notificationId: notification.id,
                        response: selectedResponse.answer_content,
                        confidence: selectedResponse.confidence_score
                    },
                    type: QueryTypes.UPDATE
                });

                // Incrementar contador de sugerencias
                await sequelize.query(`
                    UPDATE notification_ai_learning
                    SET times_suggested = times_suggested + 1
                    WHERE id = :id
                `, { replacements: { id: selectedResponse.id }, type: QueryTypes.UPDATE });

                console.log(`[NOTIFICATION-AI] Sugerencia aplicada para notificacion ${notification.id}`);
            }
        } catch (error) {
            console.error('[NOTIFICATION-AI] Error:', error.message);
        }
    }

    /**
     * Aprender de respuesta humana
     */
    async learnFromResponse(notificationId, userId, response) {
        const [notification] = await sequelize.query(`
            SELECT * FROM unified_notifications WHERE id = :notificationId
        `, { replacements: { notificationId }, type: QueryTypes.SELECT });

        if (!notification) return;

        // Obtener rol del usuario
        const [user] = await sequelize.query(`
            SELECT role, CONCAT(first_name, ' ', last_name) as name FROM users WHERE user_id = :userId
        `, { replacements: { userId }, type: QueryTypes.SELECT });

        // Insertar aprendizaje
        await sequelize.query(`
            INSERT INTO notification_ai_learning (
                company_id, category, module, question_pattern,
                answer_content, answer_summary,
                learned_from_notification_id, answered_by_user_id, answered_by_role,
                confidence_score
            ) VALUES (
                :companyId, :category, :module, :question,
                :answer, :summary,
                :notificationId, :userId, :role,
                0.5
            )
        `, {
            replacements: {
                companyId: notification.company_id,
                category: notification.category,
                module: notification.module,
                question: notification.message,
                answer: response,
                summary: response.substring(0, 500),
                notificationId,
                userId,
                role: user?.role
            },
            type: QueryTypes.INSERT
        });

        console.log(`[NOTIFICATION-AI] Aprendizaje registrado desde notificacion ${notificationId}`);
    }

    // ========================================================================
    // TEMPLATES
    // ========================================================================

    /**
     * Enviar usando template
     */
    async sendFromTemplate(templateKey, companyId, variables, recipientData, originData) {
        // Obtener template
        const [template] = await sequelize.query(`
            SELECT * FROM notification_templates
            WHERE template_key = :templateKey
              AND (company_id IS NULL OR company_id = :companyId)
              AND is_active = TRUE
            ORDER BY company_id DESC NULLS LAST
            LIMIT 1
        `, { replacements: { templateKey, companyId }, type: QueryTypes.SELECT });

        if (!template) {
            throw new Error(`Template no encontrado: ${templateKey}`);
        }

        // Reemplazar variables
        let title = template.title_template || '';
        let message = template.message_template || '';
        let shortMessage = template.short_message_template || '';

        for (const [key, value] of Object.entries(variables)) {
            const regex = new RegExp(`{{${key}}}`, 'g');
            title = title.replace(regex, value);
            message = message.replace(regex, value);
            shortMessage = shortMessage.replace(regex, value);
        }

        // Enviar notificacion
        return this.send({
            companyId,
            ...originData,
            ...recipientData,
            category: template.category,
            module: template.module,
            notificationType: templateKey,
            priority: template.default_priority,
            title,
            message,
            shortMessage,
            requiresAction: template.requires_action,
            actionType: template.default_action_type,
            channels: template.default_channels || ['app']
        });
    }

    // ========================================================================
    // APONNT <-> EMPRESA
    // ========================================================================

    /**
     * Enviar notificacion desde Aponnt a empresa(s)
     */
    async sendFromAponnt(data) {
        const {
            targetCompanyIds, // Array de company_ids o null para todas
            title,
            message,
            category = 'info',
            priority = 'medium',
            metadata = {}
        } = data;

        let companies;
        if (targetCompanyIds && targetCompanyIds.length > 0) {
            companies = await sequelize.query(`
                SELECT company_id FROM companies WHERE company_id = ANY(:ids) AND is_active = TRUE
            `, { replacements: { ids: targetCompanyIds }, type: QueryTypes.SELECT });
        } else {
            companies = await sequelize.query(`
                SELECT company_id FROM companies WHERE is_active = TRUE
            `, { type: QueryTypes.SELECT });
        }

        const results = [];
        for (const company of companies) {
            const notification = await this.send({
                companyId: company.company_id,
                originType: 'aponnt',
                originId: 'aponnt-system',
                originName: 'Aponnt',
                recipientType: 'broadcast',
                recipientId: null,
                recipientHierarchyLevel: 4, // Admin level
                category,
                module: 'aponnt',
                priority,
                title,
                message,
                metadata: { ...metadata, from_aponnt: true },
                channels: ['app', 'email']
            });
            results.push(notification);
        }

        return results;
    }

    /**
     * Enviar desde empresa a Aponnt (soporte, feedback, etc)
     */
    async sendToAponnt(companyId, userId, data) {
        const { title, message, category = 'support', metadata = {} } = data;

        // Obtener info de empresa y usuario
        const [company] = await sequelize.query(`
            SELECT name FROM companies WHERE company_id = :companyId
        `, { replacements: { companyId }, type: QueryTypes.SELECT });

        const [user] = await sequelize.query(`
            SELECT CONCAT(first_name, ' ', last_name) as name, email FROM users WHERE user_id = :userId
        `, { replacements: { userId }, type: QueryTypes.SELECT });

        // Crear thread especial para comunicacion con Aponnt
        const thread = await this.createThread({
            companyId: 1, // Company 1 = Aponnt
            subject: `[${company?.name}] ${title}`,
            category,
            module: 'support',
            threadType: 'support',
            initiatorType: 'company',
            initiatorId: companyId.toString(),
            initiatorName: company?.name,
            priority: 'medium'
        });

        // Enviar notificacion
        return this.send({
            companyId: 1, // Aponnt
            threadId: thread.id,
            originType: 'company',
            originId: companyId.toString(),
            originName: company?.name,
            recipientType: 'role',
            recipientRole: 'aponnt_support',
            recipientHierarchyLevel: 4,
            category,
            module: 'support',
            priority: 'medium',
            title,
            message,
            metadata: {
                ...metadata,
                source_company_id: companyId,
                source_company_name: company?.name,
                source_user_id: userId,
                source_user_name: user?.name,
                source_user_email: user?.email
            },
            requiresAction: true,
            actionType: 'respond'
        });
    }
}

// Singleton
const notificationUnifiedService = new NotificationUnifiedService();
module.exports = notificationUnifiedService;
