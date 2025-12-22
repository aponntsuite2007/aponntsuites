/**
 * SLA ESCALATION SERVICE
 *
 * Servicio de escalamiento automático para notificaciones
 *
 * Funcionalidades:
 * - Detectar notificaciones que excedieron su deadline (SLA breach)
 * - Escalar automáticamente según cadena: empleado → supervisor → RRHH → gerencia
 * - Notificar al remitente cuando su notificación no fue respondida
 * - Registrar impacto en evaluación del empleado
 * - Permitir al empleado presentar descargo
 *
 * @version 1.0.0
 * @created 2025-12-02
 */

const { sequelize } = require('../config/database');
const cron = require('node-cron');
const NotificationRecipientResolver = require('./NotificationRecipientResolver');

class SLAEscalationService {
    constructor() {
        this.isRunning = false;
        this.cronJob = null;
        this.config = {
            // Ejecutar cada hora
            schedule: '0 * * * *',
            // Horas antes de SLA para enviar warning
            warningHours: 4,
            // Cadena de escalamiento por defecto
            defaultEscalationChain: ['supervisor', 'rrhh', 'gerencia'],
            // Impacto por defecto en evaluación
            defaultEvaluationImpact: -2.00
        };
    }

    /**
     * Iniciar el servicio de escalamiento
     */
    start() {
        if (this.isRunning) {
            console.log('⚠️ [SLA-ESCALATION] Servicio ya está corriendo');
            return;
        }

        console.log('🚀 [SLA-ESCALATION] Iniciando servicio de escalamiento automático...');

        // Cron job: cada hora
        this.cronJob = cron.schedule(this.config.schedule, async () => {
            await this.runEscalationCycle();
        }, {
            timezone: 'America/Argentina/Buenos_Aires'
        });

        this.isRunning = true;
        console.log('✅ [SLA-ESCALATION] Servicio iniciado correctamente');
        console.log(`   ⏰ Frecuencia: ${this.config.schedule}`);
        console.log(`   ⚠️ Warning antes de SLA: ${this.config.warningHours}h`);

        // Ejecutar una vez al inicio
        setTimeout(() => this.runEscalationCycle(), 5000);
    }

    /**
     * Detener el servicio
     */
    stop() {
        if (this.cronJob) {
            this.cronJob.stop();
            this.cronJob = null;
        }
        this.isRunning = false;
        console.log('🛑 [SLA-ESCALATION] Servicio detenido');
    }

    /**
     * Ejecutar ciclo de escalamiento
     */
    async runEscalationCycle() {
        console.log('🔄 [SLA-ESCALATION] Ejecutando ciclo de escalamiento...');

        try {
            // 1. Detectar y marcar SLA breaches
            const breaches = await this.detectSLABreaches();
            console.log(`   📊 SLA breaches detectados: ${breaches.length}`);

            // 2. Escalar notificaciones vencidas
            const escalated = await this.escalateOverdueNotifications();
            console.log(`   📤 Notificaciones escaladas: ${escalated.length}`);

            // 3. Enviar warnings de SLA próximo a vencer
            const warnings = await this.sendSLAWarnings();
            console.log(`   ⚠️ Warnings enviados: ${warnings.length}`);

            // 4. Notificar a remitentes de respuestas o falta de ellas
            const senderNotifications = await this.notifySenders();
            console.log(`   📧 Remitentes notificados: ${senderNotifications.length}`);

            // 5. Registrar impactos en evaluación
            const impacts = await this.recordEvaluationImpacts();
            console.log(`   📝 Impactos en evaluación: ${impacts.length}`);

            // 6. Escalar notificaciones del sistema unificado (NUEVO - sin huecos)
            const unifiedEscalated = await this.escalateUnifiedNotifications();
            console.log(`   🔗 Notificaciones unificadas escaladas: ${unifiedEscalated.length}`);

            console.log('✅ [SLA-ESCALATION] Ciclo completado');

            return {
                breaches: breaches.length,
                escalated: escalated.length,
                warnings: warnings.length,
                senderNotifications: senderNotifications.length,
                impacts: impacts.length,
                unifiedEscalated: unifiedEscalated.length
            };

        } catch (error) {
            console.error('❌ [SLA-ESCALATION] Error en ciclo:', error);
            throw error;
        }
    }

    /**
     * Detectar notificaciones que superaron su deadline
     */
    async detectSLABreaches() {
        const breaches = [];

        try {
            // Buscar notificaciones que requieren respuesta, no respondidas y vencidas
            const [overdueMessages] = await sequelize.query(`
                UPDATE notification_messages
                SET
                    sla_breach = TRUE,
                    sla_breach_at = NOW()
                WHERE requires_response = TRUE
                  AND responded_at IS NULL
                  AND deadline_at < NOW()
                  AND sla_breach = FALSE
                  AND is_deleted = FALSE
                RETURNING id, recipient_id, sender_id, group_id, deadline_at, company_id
            `);

            // Crear registros en notification_sla_records
            for (const msg of overdueMessages) {
                await sequelize.query(`
                    INSERT INTO notification_sla_records (
                        message_id, employee_id, company_id, sla_type,
                        expected_response_at, sla_met, breach_minutes,
                        escalation_triggered, evaluation_impact
                    ) VALUES (
                        $1, $2, $3, 'response_required',
                        $4, FALSE,
                        EXTRACT(EPOCH FROM (NOW() - $4)) / 60,
                        FALSE, $5
                    )
                    ON CONFLICT (message_id) DO NOTHING
                `, {
                    bind: [
                        msg.id,
                        msg.recipient_id,
                        msg.company_id,
                        msg.deadline_at,
                        this.config.defaultEvaluationImpact
                    ]
                });

                breaches.push(msg);
            }

            return breaches;

        } catch (error) {
            console.error('❌ [SLA-ESCALATION] Error detectando SLA breaches:', error);
            return breaches;
        }
    }

    /**
     * Escalar notificaciones según cadena de escalamiento
     */
    async escalateOverdueNotifications() {
        const escalated = [];

        try {
            // Buscar notificaciones con SLA breach que no han sido escaladas al máximo
            const [toEscalate] = await sequelize.query(`
                SELECT
                    nm.id, nm.recipient_id, nm.sender_id, nm.group_id,
                    nm.company_id, nm.escalation_level, nm.content,
                    ng.subject, ng.escalation_chain, ng.auto_escalate
                FROM notification_messages nm
                JOIN notification_groups ng ON ng.id = nm.group_id
                WHERE nm.sla_breach = TRUE
                  AND nm.responded_at IS NULL
                  AND nm.escalation_status != 'resolved'
                  AND nm.escalation_status != 'discharged'
                  AND nm.is_deleted = FALSE
                  AND ng.auto_escalate = TRUE
                  AND nm.escalation_level < 3
            `);

            for (const msg of toEscalate) {
                const chain = msg.escalation_chain || this.config.defaultEscalationChain;
                const nextLevel = msg.escalation_level + 1;
                const escalateTo = chain[nextLevel - 1] || 'gerencia';

                // Actualizar mensaje con nuevo nivel de escalamiento
                await sequelize.query(`
                    UPDATE notification_messages
                    SET
                        escalation_status = 'escalated',
                        escalation_level = $1,
                        escalated_to_id = $2,
                        escalated_at = NOW()
                    WHERE id = $3
                `, { bind: [nextLevel, escalateTo, msg.id] });

                // Actualizar contador en grupo
                await sequelize.query(`
                    UPDATE notification_groups
                    SET total_escalations = total_escalations + 1
                    WHERE id = $1
                `, { bind: [msg.group_id] });

                // Actualizar registro de SLA
                await sequelize.query(`
                    UPDATE notification_sla_records
                    SET
                        escalation_triggered = TRUE,
                        escalation_level = $1,
                        updated_at = NOW()
                    WHERE message_id = $2
                `, { bind: [nextLevel, msg.id] });

                // Crear notificación para el escalado
                await this.createEscalationNotification(msg, escalateTo, nextLevel);

                escalated.push({
                    messageId: msg.id,
                    from: msg.recipient_id,
                    to: escalateTo,
                    level: nextLevel
                });
            }

            return escalated;

        } catch (error) {
            console.error('❌ [SLA-ESCALATION] Error escalando notificaciones:', error);
            return escalated;
        }
    }

    /**
     * Crear notificación de escalamiento
     */
    async createEscalationNotification(originalMsg, escalateTo, level) {
        try {
            const levelNames = {
                1: 'Supervisor',
                2: 'Recursos Humanos',
                3: 'Gerencia'
            };

            const escalationContent = `
🚨 ESCALAMIENTO AUTOMÁTICO (Nivel ${level}: ${levelNames[level] || escalateTo})

Una notificación no fue respondida en el plazo establecido:

📋 Asunto: ${originalMsg.subject || 'Sin asunto'}
👤 Destinatario original: ${originalMsg.recipient_id}
📅 Fecha límite: ${new Date(originalMsg.deadline_at).toLocaleString('es-AR')}
⏱️ Estado: SLA incumplido

Por favor revise y tome las acciones correspondientes.
            `.trim();

            // Obtener siguiente número de secuencia
            const [seqResult] = await sequelize.query(`
                SELECT COALESCE(MAX(sequence_number), 0) + 1 as next_seq
                FROM notification_messages
                WHERE group_id = $1
            `, { bind: [originalMsg.group_id] });

            const sequenceNumber = seqResult[0].next_seq;

            // Insertar mensaje de escalamiento
            await sequelize.query(`
                INSERT INTO notification_messages (
                    group_id, sequence_number,
                    sender_type, sender_id, sender_name,
                    recipient_type, recipient_id, recipient_name,
                    message_type, subject, content,
                    requires_response, channels, company_id
                ) VALUES (
                    $1, $2,
                    'system', 'SYSTEM', 'Sistema de Escalamiento',
                    $3, $4, $5,
                    'escalation', $6, $7,
                    TRUE, '["web", "email"]', $8
                )
            `, {
                bind: [
                    originalMsg.group_id, sequenceNumber,
                    escalateTo, escalateTo, levelNames[level] || escalateTo,
                    `🚨 Escalamiento: ${originalMsg.subject || 'Notificación sin respuesta'}`,
                    escalationContent,
                    originalMsg.company_id
                ]
            });

        } catch (error) {
            console.error('❌ [SLA-ESCALATION] Error creando notificación de escalamiento:', error);
        }
    }

    /**
     * Enviar warnings de SLA próximo a vencer
     */
    async sendSLAWarnings() {
        const warnings = [];

        try {
            // Buscar notificaciones próximas a vencer (dentro de X horas)
            const [nearExpiry] = await sequelize.query(`
                SELECT
                    nm.id, nm.recipient_id, nm.sender_id, nm.group_id,
                    nm.company_id, nm.deadline_at, nm.content,
                    nm.recipient_notified_at, ng.subject
                FROM notification_messages nm
                JOIN notification_groups ng ON ng.id = nm.group_id
                WHERE nm.requires_response = TRUE
                  AND nm.responded_at IS NULL
                  AND nm.sla_breach = FALSE
                  AND nm.is_deleted = FALSE
                  AND nm.recipient_notified_at IS NULL
                  AND nm.deadline_at BETWEEN NOW() AND NOW() + INTERVAL '${this.config.warningHours} hours'
            `);

            for (const msg of nearExpiry) {
                // Marcar que el destinatario fue notificado
                await sequelize.query(`
                    UPDATE notification_messages
                    SET recipient_notified_at = NOW()
                    WHERE id = $1
                `, { bind: [msg.id] });

                // Crear mensaje de warning en el grupo
                const hoursLeft = Math.round((new Date(msg.deadline_at) - new Date()) / (1000 * 60 * 60));

                await this.createWarningMessage(msg, hoursLeft);

                warnings.push({
                    messageId: msg.id,
                    recipient: msg.recipient_id,
                    hoursLeft: hoursLeft
                });
            }

            return warnings;

        } catch (error) {
            console.error('❌ [SLA-ESCALATION] Error enviando warnings:', error);
            return warnings;
        }
    }

    /**
     * Crear mensaje de warning
     */
    async createWarningMessage(originalMsg, hoursLeft) {
        try {
            const [seqResult] = await sequelize.query(`
                SELECT COALESCE(MAX(sequence_number), 0) + 1 as next_seq
                FROM notification_messages WHERE group_id = $1
            `, { bind: [originalMsg.group_id] });

            const warningContent = `
⚠️ RECORDATORIO: Esta notificación requiere tu respuesta

⏰ Tiempo restante: ${hoursLeft} hora(s)
📅 Fecha límite: ${new Date(originalMsg.deadline_at).toLocaleString('es-AR')}

Por favor, responde antes del vencimiento para evitar escalamiento automático.
            `.trim();

            await sequelize.query(`
                INSERT INTO notification_messages (
                    group_id, sequence_number,
                    sender_type, sender_id, sender_name,
                    recipient_type, recipient_id, recipient_name,
                    message_type, content, channels, company_id
                ) VALUES (
                    $1, $2,
                    'system', 'SYSTEM', 'Sistema SLA',
                    'employee', $3, $3,
                    'warning', $4, '["web"]', $5
                )
            `, {
                bind: [
                    originalMsg.group_id, seqResult[0].next_seq,
                    originalMsg.recipient_id,
                    warningContent,
                    originalMsg.company_id
                ]
            });

        } catch (error) {
            console.error('❌ [SLA-ESCALATION] Error creando warning:', error);
        }
    }

    /**
     * Notificar a remitentes de respuestas o falta de ellas
     */
    async notifySenders() {
        const notified = [];

        try {
            // Notificar a remitentes cuando su notificación fue respondida
            const [respondedWithoutSenderNotif] = await sequelize.query(`
                SELECT id, sender_id, recipient_id, group_id, company_id, responded_at
                FROM notification_messages
                WHERE responded_at IS NOT NULL
                  AND sender_notified_response = FALSE
                  AND sender_id IS NOT NULL
                  AND sender_id != 'SYSTEM'
                  AND is_deleted = FALSE
            `);

            for (const msg of respondedWithoutSenderNotif) {
                await sequelize.query(`
                    UPDATE notification_messages
                    SET
                        sender_notified_response = TRUE,
                        sender_notified_at = NOW()
                    WHERE id = $1
                `, { bind: [msg.id] });

                notified.push({
                    type: 'response_received',
                    messageId: msg.id,
                    sender: msg.sender_id
                });
            }

            // Notificar a remitentes cuando su notificación tiene SLA breach y no fueron notificados
            const [breachedWithoutSenderNotif] = await sequelize.query(`
                SELECT id, sender_id, recipient_id, group_id, company_id, deadline_at
                FROM notification_messages
                WHERE sla_breach = TRUE
                  AND sender_notified_at IS NULL
                  AND sender_id IS NOT NULL
                  AND sender_id != 'SYSTEM'
                  AND is_deleted = FALSE
            `);

            for (const msg of breachedWithoutSenderNotif) {
                await sequelize.query(`
                    UPDATE notification_messages
                    SET sender_notified_at = NOW()
                    WHERE id = $1
                `, { bind: [msg.id] });

                // Crear notificación para el remitente
                await this.createSenderBreachNotification(msg);

                notified.push({
                    type: 'breach_notification',
                    messageId: msg.id,
                    sender: msg.sender_id
                });
            }

            return notified;

        } catch (error) {
            console.error('❌ [SLA-ESCALATION] Error notificando remitentes:', error);
            return notified;
        }
    }

    /**
     * Crear notificación de breach para el remitente
     */
    async createSenderBreachNotification(originalMsg) {
        try {
            const [seqResult] = await sequelize.query(`
                SELECT COALESCE(MAX(sequence_number), 0) + 1 as next_seq
                FROM notification_messages WHERE group_id = $1
            `, { bind: [originalMsg.group_id] });

            const breachContent = `
📭 Tu notificación no fue respondida a tiempo

👤 Destinatario: ${originalMsg.recipient_id}
📅 Fecha límite: ${new Date(originalMsg.deadline_at).toLocaleString('es-AR')}
⚠️ Estado: El destinatario no respondió dentro del plazo

El sistema ha registrado este incumplimiento y se están tomando las acciones correspondientes según la política de escalamiento.
            `.trim();

            await sequelize.query(`
                INSERT INTO notification_messages (
                    group_id, sequence_number,
                    sender_type, sender_id, sender_name,
                    recipient_type, recipient_id, recipient_name,
                    message_type, content, channels, company_id
                ) VALUES (
                    $1, $2,
                    'system', 'SYSTEM', 'Sistema SLA',
                    'employee', $3, $3,
                    'breach_notification', $4, '["web", "email"]', $5
                )
            `, {
                bind: [
                    originalMsg.group_id, seqResult[0].next_seq,
                    originalMsg.sender_id,
                    breachContent,
                    originalMsg.company_id
                ]
            });

        } catch (error) {
            console.error('❌ [SLA-ESCALATION] Error creando notificación de breach:', error);
        }
    }

    /**
     * Registrar impactos en evaluación de empleados
     */
    async recordEvaluationImpacts() {
        const impacts = [];

        try {
            // Buscar notificaciones con SLA breach que no han impactado evaluación
            const [unrecordedBreaches] = await sequelize.query(`
                SELECT
                    nm.id, nm.recipient_id, nm.company_id, nm.deadline_at,
                    nsc.evaluation_impact
                FROM notification_messages nm
                LEFT JOIN notification_sla_config nsc ON
                    nsc.company_id = nm.company_id AND
                    nsc.notification_type = COALESCE(nm.message_type, 'general')
                WHERE nm.sla_breach = TRUE
                  AND nm.impact_on_evaluation = FALSE
                  AND nm.is_deleted = FALSE
            `);

            for (const msg of unrecordedBreaches) {
                const impact = msg.evaluation_impact || this.config.defaultEvaluationImpact;

                // Marcar que ya impactó evaluación
                await sequelize.query(`
                    UPDATE notification_messages
                    SET
                        impact_on_evaluation = TRUE,
                        evaluation_score_impact = $1
                    WHERE id = $2
                `, { bind: [impact, msg.id] });

                // Actualizar registro de SLA
                await sequelize.query(`
                    UPDATE notification_sla_records
                    SET
                        evaluation_impact = $1,
                        updated_at = NOW()
                    WHERE message_id = $2
                `, { bind: [impact, msg.id] });

                impacts.push({
                    messageId: msg.id,
                    employee: msg.recipient_id,
                    impact: impact
                });
            }

            return impacts;

        } catch (error) {
            console.error('❌ [SLA-ESCALATION] Error registrando impactos:', error);
            return impacts;
        }
    }

    /**
     * Permitir a un empleado presentar descargo
     */
    async fileDischarge(messageId, employeeId, reason) {
        try {
            // Verificar que el mensaje existe y pertenece al empleado
            const [message] = await sequelize.query(`
                SELECT id, recipient_id, sla_breach, discharge_at
                FROM notification_messages
                WHERE id = $1 AND recipient_id = $2
            `, { bind: [messageId, employeeId] });

            if (!message || message.length === 0) {
                throw new Error('Mensaje no encontrado o no pertenece al empleado');
            }

            if (message[0].discharge_at) {
                throw new Error('Ya se presentó un descargo para este mensaje');
            }

            if (!message[0].sla_breach) {
                throw new Error('No se puede presentar descargo - no hay incumplimiento de SLA');
            }

            // Registrar descargo
            await sequelize.query(`
                UPDATE notification_messages
                SET
                    discharge_reason = $1,
                    discharge_at = NOW(),
                    discharge_accepted = NULL,
                    escalation_status = 'discharged'
                WHERE id = $2
            `, { bind: [reason, messageId] });

            // Actualizar registro de SLA
            await sequelize.query(`
                UPDATE notification_sla_records
                SET
                    discharge_filed = TRUE,
                    discharge_reason = $1,
                    discharge_verdict = 'pending',
                    updated_at = NOW()
                WHERE message_id = $2
            `, { bind: [reason, messageId] });

            return {
                success: true,
                message: 'Descargo registrado correctamente. RRHH revisará su caso.'
            };

        } catch (error) {
            console.error('❌ [SLA-ESCALATION] Error registrando descargo:', error);
            throw error;
        }
    }

    /**
     * RRHH puede aceptar o rechazar un descargo
     */
    async processDischarge(messageId, verdict, reviewedBy) {
        try {
            const accepted = verdict === 'accepted';

            // Actualizar mensaje
            await sequelize.query(`
                UPDATE notification_messages
                SET
                    discharge_accepted = $1,
                    escalation_status = CASE WHEN $1 = TRUE THEN 'resolved' ELSE 'escalated' END
                WHERE id = $2
            `, { bind: [accepted, messageId] });

            // Actualizar registro de SLA
            await sequelize.query(`
                UPDATE notification_sla_records
                SET
                    discharge_verdict = $1,
                    updated_at = NOW()
                WHERE message_id = $2
            `, { bind: [verdict, messageId] });

            // Si se acepta el descargo, remover impacto en evaluación
            if (accepted) {
                await sequelize.query(`
                    UPDATE notification_messages
                    SET
                        impact_on_evaluation = FALSE,
                        evaluation_score_impact = 0
                    WHERE id = $1
                `, { bind: [messageId] });

                await sequelize.query(`
                    UPDATE notification_sla_records
                    SET evaluation_impact = 0
                    WHERE message_id = $1
                `, { bind: [messageId] });
            }

            return {
                success: true,
                verdict: verdict,
                message: accepted ?
                    'Descargo aceptado. Impacto en evaluación removido.' :
                    'Descargo rechazado. El impacto en evaluación se mantiene.'
            };

        } catch (error) {
            console.error('❌ [SLA-ESCALATION] Error procesando descargo:', error);
            throw error;
        }
    }

    /**
     * Obtener score de SLA de un empleado
     */
    async getEmployeeSLAScore(employeeId, companyId) {
        try {
            const [result] = await sequelize.query(`
                SELECT * FROM get_employee_sla_score($1, $2)
            `, { bind: [employeeId, companyId] });

            return result[0] || {
                total_sla_records: 0,
                sla_met_count: 0,
                sla_breach_count: 0,
                compliance_rate: 100.00,
                total_breach_minutes: 0,
                avg_response_minutes: 0,
                total_evaluation_impact: 0
            };

        } catch (error) {
            console.error('❌ [SLA-ESCALATION] Error obteniendo SLA score:', error);
            throw error;
        }
    }

    /**
     * 🆕 NUEVO: Resolver destinatarios de escalamiento usando SSOT
     * Cuando el target es 'rrhh', usa NotificationRecipientResolver
     * @param {string} escalateTo - Tipo de destino ('supervisor', 'rrhh', 'gerencia')
     * @param {number} companyId - ID de la empresa
     * @returns {Promise<Array>} - Lista de usuarios destino [{userId, name, email}]
     */
    async resolveEscalationTarget(escalateTo, companyId) {
        try {
            // Para RRHH, usar NotificationRecipientResolver como SSOT
            if (escalateTo === 'rrhh' || escalateTo === 'RRHH' || escalateTo === 'hr') {
                const recipients = await NotificationRecipientResolver.resolveRRHH(companyId, {
                    maxRecipients: 5,
                    includeUserDetails: true,
                    fallbackToAdmins: true
                });

                console.log(`[SLA-ESCALATION] Resueltos ${recipients.length} destinatarios RRHH via NotificationRecipientResolver`);
                return recipients;
            }

            // Para Legal, usar NotificationRecipientResolver
            if (escalateTo === 'legal' || escalateTo === 'Legal') {
                const recipients = await NotificationRecipientResolver.resolve(companyId, 'Legal', {
                    maxRecipients: 5,
                    includeUserDetails: true,
                    fallbackToAdmins: true
                });

                console.log(`[SLA-ESCALATION] Resueltos ${recipients.length} destinatarios Legal via NotificationRecipientResolver`);
                return recipients;
            }

            // Para otros tipos (supervisor, gerencia), retornar vacío (se resuelven por jerarquía)
            console.log(`[SLA-ESCALATION] Tipo de escalamiento "${escalateTo}" se resuelve por jerarquía organizacional`);
            return [];

        } catch (error) {
            console.error(`❌ [SLA-ESCALATION] Error resolviendo escalamiento a "${escalateTo}":`, error);
            return [];
        }
    }

    /**
     * ========================================================================
     * ESCALAMIENTO PARA UNIFIED_NOTIFICATIONS (Sistema Central)
     * ========================================================================
     * Escala notificaciones del sistema unificado usando cadena completa SIN HUECOS
     */

    /**
     * Escalar notificaciones del sistema unificado que excedieron SLA
     * Usa get_complete_escalation_chain() para garantizar escalamiento hasta gerente general
     */
    async escalateUnifiedNotifications() {
        const NotificationUnifiedService = require('./NotificationUnifiedService');
        const EmailService = require('./EmailService');
        const escalated = [];

        try {
            console.log('[SLA-ESCALATION-UNIFIED] 🔄 Buscando notificaciones vencidas...');

            // Buscar notificaciones que:
            // 1. Tienen SLA deadline vencido
            // 2. Requieren acción
            // 3. No han sido completadas
            // 4. No han escalado al nivel máximo (3)
            const [overdueNotifications] = await sequelize.query(`
                SELECT
                    id,
                    company_id,
                    thread_id,
                    origin_id,
                    recipient_id,
                    notification_type,
                    partner_category,
                    title,
                    message,
                    priority,
                    escalation_level,
                    escalation_path,
                    sla_deadline,
                    created_at
                FROM unified_notifications
                WHERE requires_action = TRUE
                  AND completed_at IS NULL
                  AND sla_deadline IS NOT NULL
                  AND sla_deadline < NOW()
                  AND (escalation_level IS NULL OR escalation_level < 3)
                  AND is_deleted = FALSE
                ORDER BY sla_deadline ASC
                LIMIT 100
            `);

            console.log(`[SLA-ESCALATION-UNIFIED] 📊 Encontradas ${overdueNotifications.length} notificaciones vencidas`);

            for (const notification of overdueNotifications) {
                try {
                    // Obtener o generar cadena de escalamiento completa
                    let escalationPath = notification.escalation_path;

                    if (!escalationPath) {
                        // Primera vez: Generar cadena completa
                        console.log(`[SLA-ESCALATION-UNIFIED] 🔗 Generando cadena para notificación ${notification.id}`);

                        const notificationService = new NotificationUnifiedService();
                        const chain = await notificationService.getCompleteEscalationChain(
                            notification.origin_id,
                            notification.company_id,
                            notification.notification_type,
                            notification.partner_category
                        );

                        escalationPath = JSON.stringify(chain);

                        // Guardar la cadena en la notificación
                        await sequelize.query(`
                            UPDATE unified_notifications
                            SET escalation_path = $1, escalation_level = 0
                            WHERE id = $2
                        `, { bind: [escalationPath, notification.id] });
                    }

                    // Parsear cadena
                    const chain = JSON.parse(escalationPath);
                    const currentLevel = notification.escalation_level || 0;
                    const nextLevel = currentLevel + 1;

                    // Buscar siguiente nivel en la cadena
                    const nextRecipient = chain.find(c => c.level === nextLevel);

                    if (!nextRecipient) {
                        console.log(`[SLA-ESCALATION-UNIFIED] ⚠️ No hay más niveles para escalar (notificación ${notification.id})`);
                        // Marcar como escalada al máximo
                        await sequelize.query(`
                            UPDATE unified_notifications
                            SET escalation_level = 99
                            WHERE id = $1
                        `, { bind: [notification.id] });
                        continue;
                    }

                    console.log(`[SLA-ESCALATION-UNIFIED] 📤 Escalando notificación ${notification.id} a nivel ${nextLevel}: ${nextRecipient.userName} (${nextRecipient.roleType})`);

                    // Actualizar notificación original
                    await sequelize.query(`
                        UPDATE unified_notifications
                        SET escalation_level = $1, escalated_at = NOW()
                        WHERE id = $2
                    `, { bind: [nextLevel, notification.id] });

                    // Crear notificación escalada para el siguiente nivel
                    await sequelize.query(`
                        INSERT INTO unified_notifications (
                            company_id, thread_id, sequence_in_thread,
                            origin_type, origin_id, origin_name,
                            recipient_type, recipient_id, recipient_name,
                            category, module, notification_type, priority,
                            title, message, short_message,
                            partner_category, partner_id,
                            requires_action, escalation_level, escalation_path,
                            metadata, created_by
                        ) VALUES (
                            $1, $2, (SELECT COALESCE(MAX(sequence_in_thread), 0) + 1 FROM unified_notifications WHERE thread_id = $2),
                            'system', NULL, 'Sistema de Escalamiento',
                            'user', $3, $4,
                            'escalation', $5, $6, 'high',
                            $7, $8, $9,
                            $10, $11,
                            TRUE, $12, $13,
                            $14, 'sla_escalation_service'
                        )
                    `, {
                        bind: [
                            notification.company_id,
                            notification.thread_id,
                            nextRecipient.userId,
                            nextRecipient.userName,
                            notification.module || 'general',
                            notification.notification_type,
                            `🚨 ESCALAMIENTO AUTOMÁTICO - Nivel ${nextLevel}: ${nextRecipient.roleType}`,
                            `Una notificación no fue respondida en el plazo establecido.\n\n` +
                            `📋 Título original: ${notification.title}\n` +
                            `📅 Venció: ${new Date(notification.sla_deadline).toLocaleString('es-AR')}\n` +
                            `👤 Destinatario original: ${notification.recipient_id}\n\n` +
                            `**Se requiere acción inmediata.**`,
                            `Escalamiento automático nivel ${nextLevel}`,
                            notification.partner_category,
                            notification.partner_id,
                            nextLevel,
                            escalationPath,
                            JSON.stringify({
                                escalation_reason: 'sla_breach',
                                original_notification_id: notification.id,
                                escalation_level: nextLevel,
                                escalated_from: notification.recipient_id,
                                escalated_to: nextRecipient.userId
                            })
                        ]
                    });

                    // Enviar email si el destinatario tiene email
                    if (nextRecipient.userEmail) {
                        try {
                            const emailService = require('./EmailService');
                            let emailResult;

                            // Determinar si es empleado de empresa o coordinador de partner
                            const isPartnerCoordinator = nextRecipient.roleType.startsWith('coordinator_');

                            if (isPartnerCoordinator) {
                                // Coordinador de partners → enviar desde Aponnt (neutral)
                                console.log(`[SLA-ESCALATION-UNIFIED] Enviando desde Aponnt a coordinador: ${nextRecipient.userName}`);
                                emailResult = await emailService.sendFromAponnt('transactional', {
                                    to: nextRecipient.userEmail,
                                    subject: `🚨 Escalamiento Automático - ${notification.title}`,
                                    html: `
                                        <h2>Escalamiento Automático</h2>
                                        <p>Hola <strong>${nextRecipient.userName}</strong>,</p>
                                        <p>Se te ha escalado una notificación que no fue respondida en el plazo establecido.</p>
                                        <hr>
                                        <p><strong>Título:</strong> ${notification.title}</p>
                                        <p><strong>Venció:</strong> ${new Date(notification.sla_deadline).toLocaleString('es-AR')}</p>
                                        <p><strong>Destinatario original:</strong> ${notification.recipient_id}</p>
                                        <hr>
                                        <p><strong>Por favor, revisa el panel de notificaciones para tomar acción.</strong></p>
                                        <p>Saludos,<br>Sistema de Notificaciones Aponnt</p>
                                    `,
                                    text: `Hola ${nextRecipient.userName},\n\nSe te ha escalado una notificación que no fue respondida en el plazo establecido.\n\nTítulo: ${notification.title}\nVenció: ${new Date(notification.sla_deadline).toLocaleString('es-AR')}\n\nPor favor, revisa el panel de notificaciones para tomar acción.\n\nSaludos,\nSistema de Notificaciones Aponnt`,
                                    recipientName: nextRecipient.userName,
                                    category: 'escalation',
                                    notificationId: notification.id
                                });
                            } else {
                                // Empleado de la empresa → enviar desde la empresa
                                console.log(`[SLA-ESCALATION-UNIFIED] Enviando desde empresa ${notification.company_id} a empleado: ${nextRecipient.userName}`);
                                emailResult = await emailService.sendFromCompany(notification.company_id, {
                                    to: nextRecipient.userEmail,
                                    subject: `🚨 Escalamiento Automático - ${notification.title}`,
                                    html: `
                                        <h2>Escalamiento Automático</h2>
                                        <p>Hola <strong>${nextRecipient.userName}</strong>,</p>
                                        <p>Se te ha escalado una notificación que no fue respondida en el plazo establecido.</p>
                                        <hr>
                                        <p><strong>Título:</strong> ${notification.title}</p>
                                        <p><strong>Venció:</strong> ${new Date(notification.sla_deadline).toLocaleString('es-AR')}</p>
                                        <hr>
                                        <p><strong>Por favor, revisa el panel de notificaciones para tomar acción.</strong></p>
                                        <p>Saludos,<br>Sistema de Notificaciones</p>
                                    `,
                                    text: `Hola ${nextRecipient.userName},\n\nSe te ha escalado una notificación que no fue respondida en el plazo establecido.\n\nTítulo: ${notification.title}\nVenció: ${new Date(notification.sla_deadline).toLocaleString('es-AR')}\n\nPor favor, revisa el panel de notificaciones para tomar acción.\n\nSaludos,\nSistema de Notificaciones`,
                                    recipientName: nextRecipient.userName,
                                    recipientType: 'employee',
                                    recipientId: nextRecipient.userId,
                                    category: 'escalation',
                                    notificationId: notification.id
                                });
                            }

                            // Marcar email como enviado en unified_notifications
                            await sequelize.query(`
                                UPDATE unified_notifications
                                SET email_sent = TRUE, email_sent_at = NOW()
                                WHERE id = $1
                            `, { bind: [notification.id] });

                            console.log(`[SLA-ESCALATION-UNIFIED] ✅ Email enviado a ${nextRecipient.userEmail}`);

                        } catch (emailError) {
                            console.error('[SLA-ESCALATION-UNIFIED] ❌ Error enviando email:', emailError.message);
                        }
                    }

                    escalated.push({
                        notificationId: notification.id,
                        fromLevel: currentLevel,
                        toLevel: nextLevel,
                        recipient: nextRecipient.userName,
                        roleType: nextRecipient.roleType
                    });

                } catch (notifError) {
                    console.error(`[SLA-ESCALATION-UNIFIED] ❌ Error procesando notificación ${notification.id}:`, notifError);
                }
            }

            console.log(`[SLA-ESCALATION-UNIFIED] ✅ Escaladas ${escalated.length} notificaciones`);
            return escalated;

        } catch (error) {
            console.error('[SLA-ESCALATION-UNIFIED] ❌ Error general:', error);
            return escalated;
        }
    }

    /**
     * Obtener estado del servicio
     */
    getStatus() {
        return {
            isRunning: this.isRunning,
            config: this.config,
            lastRun: this._lastRun || null
        };
    }
}

// Singleton
const slaEscalationService = new SLAEscalationService();

module.exports = slaEscalationService;
