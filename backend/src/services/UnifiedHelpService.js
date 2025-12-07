/**
 * ============================================================================
 * UNIFIED HELP SERVICE v1.0
 * ============================================================================
 * Sistema unificado de ayuda que integra:
 * - Chat IA (AssistantService)
 * - Tickets de Soporte (via NotificationUnifiedService)
 * - Ayuda Contextual (ContextualHelpService)
 *
 * PRINCIPIO: Las notificaciones centrales son la FUENTE ÚNICA DE VERDAD
 * para todas las comunicaciones de soporte.
 * ============================================================================
 */

const { sequelize } = require('../config/database');
const { QueryTypes } = require('sequelize');
const notificationUnifiedService = require('./NotificationUnifiedService');
const emailService = require('./EmailService');

class UnifiedHelpService {
    constructor() {
        this.ollamaUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
        this.ollamaModel = process.env.OLLAMA_MODEL || 'llama3.1:8b';
        this.minConfidenceForAutoResolve = 0.7;
        console.log('[UNIFIED-HELP] Servicio inicializado');
    }

    // ========================================================================
    // CHAT IA - Preguntas rápidas con Ollama
    // ========================================================================

    /**
     * Procesar pregunta del usuario con IA
     * Flujo:
     * 1. Buscar en knowledge base
     * 2. Si hay match de alta confianza -> responder
     * 3. Si no hay match -> generar con Ollama
     * 4. Si Ollama no disponible -> ofrecer crear ticket
     */
    async askQuestion(userId, companyId, question, context = {}) {
        const startTime = Date.now();
        const { moduleContext, screenContext } = context;

        console.log(`[UNIFIED-HELP] Pregunta de ${userId}: "${question.substring(0, 50)}..."`);

        try {
            // 1. Buscar en knowledge base (respuestas aprendidas)
            const knowledgeMatch = await this.searchKnowledgeBase(question, companyId, moduleContext);

            if (knowledgeMatch && knowledgeMatch.confidence >= this.minConfidenceForAutoResolve) {
                // Respuesta de alta confianza del knowledge base
                await this.logInteraction(userId, companyId, 'chat', question, knowledgeMatch.answer, {
                    source: 'knowledge_base',
                    confidence: knowledgeMatch.confidence,
                    knowledgeId: knowledgeMatch.id,
                    responseTime: Date.now() - startTime
                });

                return {
                    success: true,
                    answer: knowledgeMatch.answer,
                    source: 'knowledge_base',
                    confidence: knowledgeMatch.confidence,
                    suggestTicket: false,
                    responseTime: Date.now() - startTime
                };
            }

            // 2. Intentar con Ollama
            const ollamaResponse = await this.askOllama(question, context, knowledgeMatch);

            if (ollamaResponse.success) {
                // Guardar en knowledge base para aprendizaje
                await this.saveToKnowledgeBase(question, ollamaResponse.answer, companyId, moduleContext, 0.5);

                await this.logInteraction(userId, companyId, 'chat', question, ollamaResponse.answer, {
                    source: 'ollama',
                    confidence: ollamaResponse.confidence || 0.6,
                    model: this.ollamaModel,
                    responseTime: Date.now() - startTime
                });

                return {
                    success: true,
                    answer: ollamaResponse.answer,
                    source: 'ollama',
                    confidence: ollamaResponse.confidence || 0.6,
                    suggestTicket: ollamaResponse.confidence < 0.5,
                    responseTime: Date.now() - startTime
                };
            }

            // 3. Ollama no disponible - sugerir ticket
            const fallbackAnswer = await this.getFallbackAnswer(question, moduleContext);

            await this.logInteraction(userId, companyId, 'chat', question, fallbackAnswer, {
                source: 'fallback',
                confidence: 0.3,
                ollamaError: ollamaResponse.error,
                responseTime: Date.now() - startTime
            });

            return {
                success: true,
                answer: fallbackAnswer,
                source: 'fallback',
                confidence: 0.3,
                suggestTicket: true,
                suggestTicketMessage: 'No encontré una respuesta clara. ¿Deseas crear un ticket de soporte para que un especialista te ayude?',
                responseTime: Date.now() - startTime
            };

        } catch (error) {
            console.error('[UNIFIED-HELP] Error en askQuestion:', error);
            return {
                success: false,
                error: error.message,
                suggestTicket: true
            };
        }
    }

    /**
     * Buscar en knowledge base (respuestas aprendidas)
     */
    async searchKnowledgeBase(question, companyId, module = null) {
        try {
            // Buscar en assistant_knowledge_base (global) y notification_ai_learning
            const results = await sequelize.query(`
                SELECT
                    id,
                    answer AS answer,
                    confidence_score AS confidence,
                    'knowledge' AS source_table
                FROM assistant_knowledge_base
                WHERE is_helpful = TRUE
                  AND (company_id IS NULL OR company_id = :companyId)
                  AND (module IS NULL OR module = :module)
                  AND similarity(LOWER(question), LOWER(:question)) > 0.3
                ORDER BY
                    similarity(LOWER(question), LOWER(:question)) DESC,
                    confidence_score DESC
                LIMIT 1
            `, {
                replacements: { question, companyId, module },
                type: QueryTypes.SELECT
            });

            if (results.length > 0) {
                return {
                    id: results[0].id,
                    answer: results[0].answer,
                    confidence: parseFloat(results[0].confidence) || 0.5,
                    source: results[0].source_table
                };
            }

            return null;
        } catch (error) {
            console.error('[UNIFIED-HELP] Error buscando en knowledge base:', error.message);
            return null;
        }
    }

    /**
     * Preguntar a Ollama
     */
    async askOllama(question, context, knowledgeHint = null) {
        try {
            const { moduleContext, screenContext } = context;

            let systemPrompt = `Eres el asistente de ayuda del Sistema de Gestión de Recursos Humanos "Aponnt".
Tu rol es ayudar a los usuarios con preguntas sobre el sistema.
Responde de forma concisa, clara y profesional.
Si no estás seguro de algo, indica que sugieres contactar soporte.`;

            if (moduleContext) {
                systemPrompt += `\n\nEl usuario está actualmente en el módulo: ${moduleContext}`;
            }

            if (knowledgeHint) {
                systemPrompt += `\n\nPosible respuesta relacionada (úsala como referencia): ${knowledgeHint.answer.substring(0, 500)}`;
            }

            const response = await fetch(`${this.ollamaUrl}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: this.ollamaModel,
                    prompt: question,
                    system: systemPrompt,
                    stream: false,
                    options: {
                        temperature: 0.7,
                        num_predict: 500
                    }
                }),
                timeout: 30000
            });

            if (!response.ok) {
                throw new Error(`Ollama responded with status ${response.status}`);
            }

            const result = await response.json();
            const answer = result.response?.trim();

            if (!answer) {
                throw new Error('Ollama returned empty response');
            }

            return {
                success: true,
                answer,
                confidence: 0.6
            };

        } catch (error) {
            console.error('[UNIFIED-HELP] Error con Ollama:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Respuesta de fallback cuando Ollama no está disponible
     */
    async getFallbackAnswer(question, module) {
        const lowerQuestion = question.toLowerCase();

        // Respuestas básicas por keywords
        if (lowerQuestion.includes('usuario') || lowerQuestion.includes('empleado')) {
            return 'Para gestionar usuarios, ve al módulo "Gestión de Usuarios" donde puedes agregar, editar o desactivar empleados. Si necesitas ayuda específica, te recomiendo crear un ticket de soporte.';
        }

        if (lowerQuestion.includes('asistencia') || lowerQuestion.includes('marcaje')) {
            return 'El registro de asistencia se realiza desde el módulo "Control de Asistencia". Los empleados pueden marcar desde la app móvil o kioscos. Para configuraciones avanzadas, contacta a soporte.';
        }

        if (lowerQuestion.includes('vacacion') || lowerQuestion.includes('licencia')) {
            return 'Las solicitudes de vacaciones se gestionan desde "Mi Espacio" para empleados, y desde "Gestión de Vacaciones" para supervisores. ¿Necesitas ayuda específica? Puedo crear un ticket.';
        }

        return `Entiendo tu consulta sobre "${question.substring(0, 50)}...". Para brindarte la mejor ayuda, te recomiendo crear un ticket de soporte donde un especialista podrá asistirte directamente.`;
    }

    // ========================================================================
    // TICKETS DE SOPORTE - Via Sistema de Notificaciones Central
    // ========================================================================

    /**
     * Buscar staff de Aponnt asignado a una empresa
     * Prioridad: support > vendor > cualquier rol activo
     */
    async getAssignedStaff(companyId) {
        try {
            // Buscar staff asignado a esta empresa específica
            const assignedStaff = await sequelize.query(`
                SELECT
                    s.staff_id,
                    s.first_name,
                    s.last_name,
                    s.email,
                    s.phone,
                    r.role_code,
                    r.role_name,
                    sc.assignment_note
                FROM aponnt_staff_companies sc
                JOIN aponnt_staff s ON s.staff_id = sc.staff_id
                JOIN aponnt_staff_roles r ON r.role_id = s.role_id
                WHERE sc.company_id = :companyId
                  AND sc.is_active = true
                  AND s.is_active = true
                ORDER BY
                    r.level ASC,
                    sc.assigned_at DESC
                LIMIT 1
            `, {
                replacements: { companyId },
                type: QueryTypes.SELECT
            });

            if (assignedStaff.length > 0) {
                const staff = assignedStaff[0];
                console.log(`[UNIFIED-HELP] Staff asignado encontrado: ${staff.first_name} ${staff.last_name} (${staff.role_code})`);
                return {
                    found: true,
                    staffId: staff.staff_id,
                    name: `${staff.first_name} ${staff.last_name}`,
                    email: staff.email,
                    phone: staff.phone,
                    role: staff.role_code,
                    roleName: staff.role_name
                };
            }

            console.log(`[UNIFIED-HELP] No hay staff asignado para empresa ${companyId}, usando role genérico`);
            return { found: false };
        } catch (error) {
            console.error('[UNIFIED-HELP] Error buscando staff asignado:', error.message);
            return { found: false };
        }
    }

    /**
     * Crear ticket de soporte (usa notificaciones como fuente de verdad)
     * ROUTING INTELIGENTE: Si hay staff asignado -> envía directo, sino -> role genérico
     */
    async createSupportTicket(userId, companyId, data) {
        const { subject, message, category = 'general', priority = 'medium', moduleContext } = data;

        console.log(`[UNIFIED-HELP] Creando ticket para empresa ${companyId}: ${subject}`);

        try {
            // Obtener info del usuario y empresa
            const [user] = await sequelize.query(`
                SELECT "firstName", "lastName", email, role FROM users WHERE user_id = :userId
            `, { replacements: { userId }, type: QueryTypes.SELECT });

            const [company] = await sequelize.query(`
                SELECT name, slug FROM companies WHERE company_id = :companyId
            `, { replacements: { companyId }, type: QueryTypes.SELECT });

            const userName = user ? `${user.firstName} ${user.lastName}` : 'Usuario';
            const companyName = company?.name || 'Empresa';

            // NUEVO: Buscar staff asignado a esta empresa
            const assignedStaff = await this.getAssignedStaff(companyId);

            // 1. Crear thread en sistema de notificaciones
            const thread = await notificationUnifiedService.createThread({
                companyId: 1, // Aponnt (destino del soporte)
                subject: `[${companyName}] ${subject}`,
                category: 'support',
                module: moduleContext || 'general',
                threadType: 'support_ticket',
                initiatorType: 'user',
                initiatorId: userId,
                initiatorName: userName,
                priority
            });

            // 2. Preparar destinatario: staff específico o role genérico
            const recipientConfig = assignedStaff.found
                ? {
                    recipientType: 'aponnt_staff',
                    recipientId: assignedStaff.staffId,
                    recipientName: assignedStaff.name,
                    recipientRole: assignedStaff.role
                }
                : {
                    recipientType: 'role',
                    recipientId: null,
                    recipientName: null,
                    recipientRole: 'aponnt_support'
                };

            // 3. Enviar primera notificación (el mensaje del ticket)
            const notification = await notificationUnifiedService.send({
                companyId: 1, // Aponnt
                threadId: thread.id,
                originType: 'user',
                originId: userId,
                originName: userName,
                originRole: user?.role,
                ...recipientConfig,
                recipientHierarchyLevel: 4,
                category: 'support',
                module: moduleContext || 'general',
                notificationType: 'support_ticket_created',
                priority,
                title: subject,
                message,
                metadata: {
                    source_company_id: companyId,
                    source_company_name: companyName,
                    source_user_email: user?.email,
                    ticket_category: category,
                    created_via: 'unified_help_center',
                    assigned_staff_id: assignedStaff.found ? assignedStaff.staffId : null,
                    assigned_staff_name: assignedStaff.found ? assignedStaff.name : null
                },
                requiresAction: true,
                actionType: 'respond',
                slaHours: priority === 'urgent' ? 2 : priority === 'high' ? 4 : 24,
                channels: ['app', 'email']
            });

            // 3. Crear entrada en support_tickets para compatibilidad
            const ticketNumber = await this.generateTicketNumber();

            await sequelize.query(`
                INSERT INTO support_tickets (
                    ticket_number, company_id, created_by_user_id, module_name,
                    module_display_name, subject, description, priority, status,
                    thread_id, notification_id
                ) VALUES (
                    :ticketNumber, :companyId, :userId, :moduleName,
                    :moduleDisplayName, :subject, :description, :priority, 'open',
                    :threadId, :notificationId
                )
            `, {
                replacements: {
                    ticketNumber,
                    companyId,
                    userId,
                    moduleName: moduleContext || 'general',
                    moduleDisplayName: category || 'General',
                    subject,
                    description: message,
                    priority,
                    threadId: thread.id,
                    notificationId: notification.id
                },
                type: QueryTypes.INSERT
            });

            // 4. Enviar notificación de confirmación al usuario
            await notificationUnifiedService.send({
                companyId,
                threadId: thread.id,
                originType: 'system',
                originId: 'unified-help',
                originName: 'Centro de Ayuda',
                recipientType: 'user',
                recipientId: userId,
                recipientName: userName,
                category: 'support',
                module: 'support',
                notificationType: 'ticket_created_confirmation',
                priority: 'low',
                title: `Ticket ${ticketNumber} creado`,
                message: `Tu solicitud "${subject}" ha sido recibida. Te notificaremos cuando haya una respuesta.`,
                metadata: {
                    ticket_number: ticketNumber,
                    thread_id: thread.id
                },
                channels: ['app']
            });

            await this.logInteraction(userId, companyId, 'ticket_created', subject, null, {
                ticketNumber,
                threadId: thread.id,
                category,
                priority
            });

            // 5. ENVIAR EMAIL al staff asignado o soporte general
            await this.sendTicketEmail({
                ticketNumber,
                subject,
                message,
                priority,
                category,
                userName,
                userEmail: user?.email,
                companyName,
                companyId,
                assignedStaff
            });

            return {
                success: true,
                ticketNumber,
                threadId: thread.id,
                assignedTo: assignedStaff.found ? assignedStaff.name : 'Equipo de Soporte',
                message: `Ticket ${ticketNumber} creado exitosamente. ${assignedStaff.found ? `Asignado a: ${assignedStaff.name}` : 'Será atendido por nuestro equipo de soporte.'}`
            };

        } catch (error) {
            console.error('[UNIFIED-HELP] Error creando ticket:', error);
            throw error;
        }
    }

    /**
     * Responder a ticket (crea notificación en el thread)
     */
    async replyToTicket(userId, companyId, threadId, message, isInternal = false) {
        try {
            // Obtener info del usuario
            const [user] = await sequelize.query(`
                SELECT "firstName", "lastName", role FROM users WHERE user_id = :userId
            `, { replacements: { userId }, type: QueryTypes.SELECT });

            const userName = user ? `${user.firstName} ${user.lastName}` : 'Usuario';
            const isSupport = ['admin', 'super_admin', 'aponnt_support'].includes(user?.role);

            // Obtener info del thread
            const [thread] = await sequelize.query(`
                SELECT * FROM notification_threads WHERE id = :threadId
            `, { replacements: { threadId }, type: QueryTypes.SELECT });

            if (!thread) {
                throw new Error('Thread no encontrado');
            }

            // Determinar destinatario
            let recipientId, recipientRole, recipientType, targetCompanyId;

            if (isSupport) {
                // Soporte respondiendo al usuario
                recipientType = 'user';
                recipientId = thread.initiator_id;
                recipientRole = null;
                targetCompanyId = parseInt(thread.metadata?.source_company_id) || companyId;
            } else {
                // Usuario respondiendo a soporte
                recipientType = 'role';
                recipientId = null;
                recipientRole = 'aponnt_support';
                targetCompanyId = 1; // Aponnt
            }

            // Enviar mensaje como notificación
            const notification = await notificationUnifiedService.send({
                companyId: targetCompanyId,
                threadId,
                originType: isSupport ? 'support' : 'user',
                originId: userId,
                originName: userName,
                originRole: user?.role,
                recipientType,
                recipientId,
                recipientRole,
                category: 'support',
                module: 'support',
                notificationType: isInternal ? 'internal_note' : 'ticket_reply',
                priority: 'medium',
                title: `Respuesta en ticket`,
                message,
                metadata: {
                    is_internal: isInternal,
                    is_support_reply: isSupport
                },
                requiresAction: !isInternal,
                channels: isInternal ? ['app'] : ['app', 'email']
            });

            // Actualizar estado del thread
            await sequelize.query(`
                UPDATE notification_threads
                SET status = :status, last_message_at = NOW()
                WHERE id = :threadId
            `, {
                replacements: {
                    threadId,
                    status: isSupport ? 'waiting_customer' : 'pending'
                },
                type: QueryTypes.UPDATE
            });

            // Aprender de la respuesta si es de soporte
            if (isSupport && !isInternal) {
                await notificationUnifiedService.learnFromResponse(notification.id, userId, message);
            }

            return {
                success: true,
                notificationId: notification.id,
                message: 'Respuesta enviada'
            };

        } catch (error) {
            console.error('[UNIFIED-HELP] Error respondiendo ticket:', error);
            throw error;
        }
    }

    /**
     * Obtener tickets del usuario (desde threads de notificaciones)
     */
    async getMyTickets(userId, companyId, options = {}) {
        const { status, limit = 20, offset = 0 } = options;

        try {
            let whereClause = `
                WHERE t.thread_type = 'support_ticket'
                  AND (
                      t.initiator_id = :userId OR
                      EXISTS (
                          SELECT 1 FROM unified_notifications n
                          WHERE n.thread_id = t.id
                          AND n.recipient_id = :userId
                      )
                  )
            `;

            const replacements = { userId, limit, offset };

            if (status) {
                whereClause += ` AND t.status = :status`;
                replacements.status = status;
            }

            const tickets = await sequelize.query(`
                SELECT
                    t.*,
                    st.ticket_number,
                    st.module_display_name AS category,
                    st.module_name,
                    (SELECT COUNT(*) FROM unified_notifications n
                     WHERE n.thread_id = t.id AND n.is_read = FALSE AND n.recipient_id = :userId) as unread_count,
                    (SELECT n.message FROM unified_notifications n
                     WHERE n.thread_id = t.id ORDER BY n.created_at DESC LIMIT 1) as last_message,
                    (SELECT n.created_at FROM unified_notifications n
                     WHERE n.thread_id = t.id ORDER BY n.created_at DESC LIMIT 1) as last_activity
                FROM notification_threads t
                LEFT JOIN support_tickets st ON st.thread_id = t.id
                ${whereClause}
                ORDER BY t.last_message_at DESC NULLS LAST
                LIMIT :limit OFFSET :offset
            `, {
                replacements,
                type: QueryTypes.SELECT
            });

            return tickets;

        } catch (error) {
            console.error('[UNIFIED-HELP] Error obteniendo tickets:', error);
            return [];
        }
    }

    /**
     * Obtener mensajes de un ticket (desde notificaciones del thread)
     */
    async getTicketMessages(userId, companyId, threadId) {
        try {
            // Usar el servicio de notificaciones para obtener mensajes
            const messages = await notificationUnifiedService.getThreadMessages(
                threadId, userId, companyId, { limit: 100, markAsRead: true }
            );

            return messages.map(msg => ({
                id: msg.id,
                message: msg.message,
                senderName: msg.origin_name,
                senderType: msg.origin_type,
                isInternal: msg.metadata?.is_internal || false,
                isSupportReply: msg.metadata?.is_support_reply || false,
                createdAt: msg.created_at,
                isRead: msg.is_read
            }));

        } catch (error) {
            console.error('[UNIFIED-HELP] Error obteniendo mensajes:', error);
            return [];
        }
    }

    /**
     * Cerrar ticket
     */
    async closeTicket(userId, companyId, threadId, rating = null, feedback = null) {
        try {
            // Actualizar thread
            await sequelize.query(`
                UPDATE notification_threads
                SET status = 'closed', closed_at = NOW()
                WHERE id = :threadId
            `, { replacements: { threadId }, type: QueryTypes.UPDATE });

            // Actualizar support_tickets
            await sequelize.query(`
                UPDATE support_tickets
                SET status = 'closed', closed_at = NOW(),
                    rating = :rating, feedback = :feedback
                WHERE thread_id = :threadId
            `, { replacements: { threadId, rating, feedback }, type: QueryTypes.UPDATE });

            // Enviar notificación de cierre
            const [user] = await sequelize.query(`
                SELECT "firstName", "lastName" FROM users WHERE user_id = :userId
            `, { replacements: { userId }, type: QueryTypes.SELECT });

            await notificationUnifiedService.send({
                companyId: 1,
                threadId,
                originType: 'user',
                originId: userId,
                originName: `${user?.firstName} ${user?.lastName}`,
                recipientType: 'role',
                recipientRole: 'aponnt_support',
                category: 'support',
                notificationType: 'ticket_closed',
                priority: 'low',
                title: 'Ticket cerrado',
                message: rating ? `Ticket cerrado con calificación: ${rating}/5` : 'Ticket cerrado por el usuario',
                metadata: { rating, feedback }
            });

            return { success: true };

        } catch (error) {
            console.error('[UNIFIED-HELP] Error cerrando ticket:', error);
            throw error;
        }
    }

    // ========================================================================
    // EMAIL PARA TICKETS
    // ========================================================================

    /**
     * Enviar email de notificación de nuevo ticket
     * Usa el EmailService existente con nodemailer
     */
    async sendTicketEmail(data) {
        const {
            ticketNumber,
            subject,
            message,
            priority,
            category,
            userName,
            userEmail,
            companyName,
            companyId,
            assignedStaff
        } = data;

        try {
            const priorityLabels = {
                urgent: '🔴 URGENTE',
                high: '🟠 Alta',
                medium: '🟡 Media',
                low: '🟢 Baja'
            };

            const priorityLabel = priorityLabels[priority] || priority;

            // Determinar destinatario del email
            const recipientEmail = assignedStaff.found ? assignedStaff.email : 'soporte@aponnt.com';
            const recipientName = assignedStaff.found ? assignedStaff.name : 'Equipo de Soporte';

            // Construir HTML del email
            const emailHtml = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
                    <div style="background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%); color: white; padding: 20px; text-align: center;">
                        <h1 style="margin: 0; font-size: 24px;">🎫 Nuevo Ticket de Soporte</h1>
                        <p style="margin: 10px 0 0 0; opacity: 0.9;">Sistema Aponnt</p>
                    </div>

                    <div style="padding: 20px;">
                        <div style="background: #f8fafc; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
                            <p style="margin: 0; color: #64748b; font-size: 14px;">Ticket</p>
                            <p style="margin: 5px 0 0 0; font-size: 20px; font-weight: bold; color: #0f172a;">${ticketNumber}</p>
                        </div>

                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; color: #64748b; width: 120px;">Empresa:</td>
                                <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; font-weight: 500;">${companyName}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; color: #64748b;">Solicitante:</td>
                                <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0;">${userName} (${userEmail || 'Sin email'})</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; color: #64748b;">Prioridad:</td>
                                <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0;">${priorityLabel}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; color: #64748b;">Categoría:</td>
                                <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0;">${category}</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; color: #64748b;">Asunto:</td>
                                <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; font-weight: 500;">${subject}</td>
                            </tr>
                        </table>

                        <div style="margin-top: 20px;">
                            <p style="color: #64748b; font-size: 14px; margin-bottom: 10px;">Mensaje:</p>
                            <div style="background: #f1f5f9; border-radius: 8px; padding: 15px; white-space: pre-wrap; color: #334155;">${message}</div>
                        </div>

                        ${assignedStaff.found ? `
                        <div style="margin-top: 20px; padding: 15px; background: #ecfdf5; border-radius: 8px; border-left: 4px solid #10b981;">
                            <p style="margin: 0; color: #059669; font-weight: 500;">✓ Asignado a: ${assignedStaff.name}</p>
                            <p style="margin: 5px 0 0 0; color: #059669; font-size: 14px;">${assignedStaff.roleName || assignedStaff.role}</p>
                        </div>
                        ` : ''}

                        <div style="margin-top: 30px; text-align: center;">
                            <a href="${process.env.APP_URL || 'http://localhost:9998'}/panel-administrativo.html#tickets"
                               style="display: inline-block; background: #3b82f6; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500;">
                                Ver Ticket en Panel
                            </a>
                        </div>
                    </div>

                    <div style="background: #f8fafc; padding: 15px; text-align: center; color: #64748b; font-size: 12px;">
                        <p style="margin: 0;">Este es un email automático del Sistema Aponnt</p>
                        <p style="margin: 5px 0 0 0;">© ${new Date().getFullYear()} Aponnt - Sistema de Gestión de Recursos Humanos</p>
                    </div>
                </div>
            `;

            // Enviar email usando el EmailService existente
            await emailService.sendFromAponnt('support', {
                to: recipientEmail,
                recipientName,
                subject: `[${ticketNumber}] ${priorityLabel} - ${subject}`,
                html: emailHtml,
                text: `Nuevo ticket ${ticketNumber} de ${companyName}\n\nSolicitante: ${userName}\nAsunto: ${subject}\nPrioridad: ${priority}\n\nMensaje:\n${message}`,
                category: 'support_ticket'
            });

            console.log(`[UNIFIED-HELP] 📧 Email enviado a ${recipientEmail} para ticket ${ticketNumber}`);
            return { success: true, sentTo: recipientEmail };

        } catch (error) {
            // No fallar si el email no se envía - el ticket ya está creado
            console.error(`[UNIFIED-HELP] ⚠️ Error enviando email (ticket ya creado):`, error.message);
            return { success: false, error: error.message };
        }
    }

    // ========================================================================
    // AYUDA CONTEXTUAL
    // ========================================================================

    /**
     * Obtener ayuda contextual del módulo actual
     */
    async getContextualHelp(moduleKey, companyId) {
        try {
            // Buscar ayuda específica del módulo
            // NOTA: La tabla usa 'content' en lugar de 'description'
            // NOTA: La tabla no tiene company_id, es global para todos
            const help = await sequelize.query(`
                SELECT
                    title, content AS description, quick_start, common_issues,
                    video_url, documentation_url, walkthrough_steps
                FROM contextual_help
                WHERE module_key = :moduleKey
                  AND is_active = TRUE
                ORDER BY priority DESC
                LIMIT 1
            `, {
                replacements: { moduleKey },
                type: QueryTypes.SELECT
            });

            if (help.length > 0) {
                return {
                    success: true,
                    help: help[0]
                };
            }

            // Fallback a ayuda genérica
            return {
                success: true,
                help: {
                    title: `Ayuda: ${moduleKey}`,
                    description: 'Módulo del sistema de gestión.',
                    quick_start: 'Navega por las opciones disponibles en este módulo.',
                    common_issues: null
                }
            };

        } catch (error) {
            console.error('[UNIFIED-HELP] Error obteniendo ayuda contextual:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Obtener walkthrough (tutorial paso a paso)
     */
    async getWalkthrough(moduleKey, companyId) {
        try {
            // NOTA: La tabla no tiene company_id, es global para todos
            const [help] = await sequelize.query(`
                SELECT walkthrough_steps FROM contextual_help
                WHERE module_key = :moduleKey
                  AND walkthrough_steps IS NOT NULL
                ORDER BY priority DESC
                LIMIT 1
            `, {
                replacements: { moduleKey },
                type: QueryTypes.SELECT
            });

            return {
                success: true,
                steps: help?.walkthrough_steps || []
            };

        } catch (error) {
            console.error('[UNIFIED-HELP] Error obteniendo walkthrough:', error);
            return { success: false, steps: [] };
        }
    }

    // ========================================================================
    // ESTADÍSTICAS Y HISTORIAL
    // ========================================================================

    /**
     * Obtener estadísticas del centro de ayuda
     */
    async getStats(userId, companyId) {
        try {
            const stats = await sequelize.query(`
                SELECT
                    (SELECT COUNT(*) FROM notification_threads t
                     WHERE t.thread_type = 'support_ticket'
                       AND t.initiator_id = :userId) as total_tickets,
                    (SELECT COUNT(*) FROM notification_threads t
                     WHERE t.thread_type = 'support_ticket'
                       AND t.initiator_id = :userId
                       AND t.status NOT IN ('closed', 'resolved')) as open_tickets,
                    (SELECT COUNT(*) FROM unified_notifications n
                     WHERE n.recipient_id = :userId
                       AND n.is_read = FALSE
                       AND n.category = 'support') as unread_support,
                    (SELECT COUNT(*) FROM unified_help_interactions
                     WHERE user_id = :userId
                       AND interaction_type = 'chat') as chat_interactions
            `, {
                replacements: { userId },
                type: QueryTypes.SELECT
            });

            return stats[0] || {
                total_tickets: 0,
                open_tickets: 0,
                unread_support: 0,
                chat_interactions: 0
            };

        } catch (error) {
            console.error('[UNIFIED-HELP] Error obteniendo stats:', error);
            return {};
        }
    }

    /**
     * Obtener historial unificado (chat + tickets)
     */
    async getHistory(userId, companyId, options = {}) {
        const { limit = 20, offset = 0 } = options;

        try {
            const history = await sequelize.query(`
                (
                    SELECT
                        'chat' as type,
                        id,
                        question as title,
                        answer as content,
                        metadata->>'confidence' as confidence,
                        created_at
                    FROM unified_help_interactions
                    WHERE user_id = :userId AND company_id = :companyId
                    ORDER BY created_at DESC
                    LIMIT :limit
                )
                UNION ALL
                (
                    SELECT
                        'ticket' as type,
                        t.id,
                        t.subject as title,
                        (SELECT message FROM unified_notifications n
                         WHERE n.thread_id = t.id ORDER BY created_at DESC LIMIT 1) as content,
                        t.status as confidence,
                        t.created_at
                    FROM notification_threads t
                    WHERE t.initiator_id = :userId
                      AND t.thread_type = 'support_ticket'
                    ORDER BY t.created_at DESC
                    LIMIT :limit
                )
                ORDER BY created_at DESC
                LIMIT :limit OFFSET :offset
            `, {
                replacements: { userId, companyId, limit, offset },
                type: QueryTypes.SELECT
            });

            return history;

        } catch (error) {
            console.error('[UNIFIED-HELP] Error obteniendo historial:', error);
            return [];
        }
    }

    // ========================================================================
    // HELPERS
    // ========================================================================

    /**
     * Generar número de ticket único
     */
    async generateTicketNumber() {
        const year = new Date().getFullYear();
        const [result] = await sequelize.query(`
            SELECT COUNT(*) + 1 as next_num FROM support_tickets
            WHERE ticket_number LIKE :pattern
        `, {
            replacements: { pattern: `TICKET-${year}-%` },
            type: QueryTypes.SELECT
        });

        const num = String(result.next_num).padStart(6, '0');
        return `TICKET-${year}-${num}`;
    }

    /**
     * Guardar en knowledge base
     */
    async saveToKnowledgeBase(question, answer, companyId, module, confidence = 0.5) {
        try {
            await sequelize.query(`
                INSERT INTO assistant_knowledge_base (
                    question, answer, company_id, module,
                    confidence_score, source, is_helpful
                ) VALUES (
                    :question, :answer, NULL, :module,
                    :confidence, 'ollama_generated', NULL
                )
                ON CONFLICT DO NOTHING
            `, {
                replacements: { question, answer, module, confidence },
                type: QueryTypes.INSERT
            });
        } catch (error) {
            console.error('[UNIFIED-HELP] Error guardando en knowledge base:', error.message);
        }
    }

    /**
     * Registrar interacción
     */
    async logInteraction(userId, companyId, type, question, answer, metadata = {}) {
        try {
            await sequelize.query(`
                INSERT INTO unified_help_interactions (
                    user_id, company_id, interaction_type,
                    question, answer, metadata
                ) VALUES (
                    :userId, :companyId, :type,
                    :question, :answer, :metadata
                )
            `, {
                replacements: {
                    userId, companyId, type, question, answer,
                    metadata: JSON.stringify(metadata)
                },
                type: QueryTypes.INSERT
            });
        } catch (error) {
            // Tabla puede no existir todavía
            console.log('[UNIFIED-HELP] Log interaction skipped:', error.message);
        }
    }

    /**
     * Registrar feedback (👍👎)
     */
    async recordFeedback(userId, interactionId, isHelpful, feedbackText = null) {
        try {
            // Actualizar knowledge base
            await sequelize.query(`
                UPDATE assistant_knowledge_base
                SET is_helpful = :isHelpful,
                    feedback_text = :feedbackText,
                    confidence_score = CASE
                        WHEN :isHelpful THEN LEAST(confidence_score + 0.1, 1.0)
                        ELSE GREATEST(confidence_score - 0.1, 0.0)
                    END
                WHERE id = :interactionId
            `, {
                replacements: { interactionId, isHelpful, feedbackText },
                type: QueryTypes.UPDATE
            });

            return { success: true };

        } catch (error) {
            console.error('[UNIFIED-HELP] Error registrando feedback:', error);
            return { success: false };
        }
    }
}

// Singleton
const unifiedHelpService = new UnifiedHelpService();
module.exports = unifiedHelpService;
