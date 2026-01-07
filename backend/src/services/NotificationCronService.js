/**
 * ============================================================================
 * NOTIFICATION CRON SERVICE
 * ============================================================================
 *
 * Servicio de tareas programadas para el sistema de notificaciones:
 * - Escalamiento automático de notificaciones vencidas
 * - Advertencias de SLA próximo a vencer
 * - Limpieza de notificaciones antiguas
 * - Notificaciones proactivas periódicas
 *
 * ============================================================================
 */

const cron = require('node-cron');
const { sequelize } = require('../config/database');
const { QueryTypes } = require('sequelize');

class NotificationCronService {

    constructor() {
        this.jobs = [];
        this.isRunning = false;
        console.log('⏰ [CRON] NotificationCronService inicializado');
    }

    /**
     * INICIAR TODOS LOS CRON JOBS
     */
    start() {
        if (this.isRunning) {
            console.log('⏰ [CRON] Los jobs ya están corriendo');
            return;
        }

        console.log('⏰ [CRON] Iniciando cron jobs del sistema de notificaciones...');

        // Job 1: Verificar SLA y escalar (cada 5 minutos)
        this.jobs.push(cron.schedule('*/5 * * * *', async () => {
            await this.checkSLAAndEscalate();
        }));

        // Job 2: Advertencias de SLA próximo a vencer (cada 15 minutos)
        this.jobs.push(cron.schedule('*/15 * * * *', async () => {
            await this.sendSLAWarnings();
        }));

        // Job 3: Limpieza de notificaciones antiguas (diario a las 3 AM)
        this.jobs.push(cron.schedule('0 3 * * *', async () => {
            await this.cleanupOldNotifications();
        }));

        // Job 4: Notificaciones proactivas (cada 6 horas)
        this.jobs.push(cron.schedule('0 */6 * * *', async () => {
            await this.triggerProactiveNotifications();
        }));

        this.isRunning = true;
        console.log('✅ [CRON] 4 cron jobs iniciados:');
        console.log('   - Escalamiento SLA: cada 5 minutos');
        console.log('   - Advertencias SLA: cada 15 minutos');
        console.log('   - Limpieza: diario 3 AM');
        console.log('   - Proactivas: cada 6 horas');
    }

    /**
     * DETENER TODOS LOS CRON JOBS
     */
    stop() {
        this.jobs.forEach(job => job.stop());
        this.jobs = [];
        this.isRunning = false;
        console.log('⏰ [CRON] Todos los jobs detenidos');
    }

    // ========================================================================
    // JOB 1: VERIFICAR SLA Y ESCALAR
    // ========================================================================

    /**
     * Busca notificaciones que excedieron su SLA y las escala automáticamente
     */
    async checkSLAAndEscalate() {
        try {
            console.log('⏰ [CRON] Verificando notificaciones con SLA vencido...');

            // Buscar notificaciones con SLA vencido que requieren acción
            const breachedNotifications = await sequelize.query(`
                SELECT
                    un.id,
                    un.company_id,
                    un.module,
                    un.workflow_key,
                    un.recipient_user_id,
                    un.recipient_role,
                    un.title,
                    un.message,
                    un.priority,
                    un.sla_hours,
                    un.sla_deadline,
                    un.escalation_level,
                    un.metadata,
                    un.origin_type,
                    un.origin_id,
                    un.created_at,
                    EXTRACT(EPOCH FROM (NOW() - un.sla_deadline))/3600 as hours_overdue
                FROM unified_notifications un
                WHERE un.deleted_at IS NULL
                  AND un.requires_action = TRUE
                  AND un.action_status IN ('pending', 'in_progress')
                  AND un.sla_deadline IS NOT NULL
                  AND un.sla_deadline < NOW()
                  AND un.sla_breached = FALSE
                ORDER BY un.sla_deadline ASC
                LIMIT 100
            `, { type: QueryTypes.SELECT });

            if (breachedNotifications.length === 0) {
                console.log('   ✅ No hay notificaciones con SLA vencido');
                return;
            }

            console.log(`   ⚠️  ${breachedNotifications.length} notificaciones con SLA vencido`);

            // Marcar como breached y escalar cada una
            for (const notif of breachedNotifications) {
                await this.escalateNotification(notif);
            }

            console.log(`   ✅ ${breachedNotifications.length} notificaciones escaladas`);

        } catch (error) {
            console.error('❌ [CRON] Error en checkSLAAndEscalate:', error.message);
        }
    }

    /**
     * Escala una notificación al siguiente nivel de la jerarquía
     */
    async escalateNotification(notification) {
        try {
            const {
                id, company_id, module, workflow_key, escalation_level,
                title, message, metadata, origin_type, origin_id, hours_overdue
            } = notification;

            // Marcar la notificación original como breached
            await sequelize.query(`
                UPDATE unified_notifications
                SET sla_breached = TRUE,
                    sla_breach_at = NOW(),
                    updated_at = NOW()
                WHERE id = :notificationId
            `, {
                replacements: { notificationId: id },
                type: QueryTypes.UPDATE
            });

            // Obtener cadena de escalamiento desde BD
            const escalationChain = await this.getEscalationChain(
                company_id,
                notification.recipient_user_id,
                workflow_key
            );

            if (!escalationChain || escalationChain.length === 0) {
                console.log(`   ⚠️  No hay cadena de escalamiento para notif ${id}`);
                return;
            }

            const nextLevel = escalation_level + 1;
            const nextRecipient = escalationChain[nextLevel];

            if (!nextRecipient) {
                console.log(`   ⚠️  No hay nivel ${nextLevel} en cadena de escalamiento para notif ${id}`);
                // TODO: Auto-aprobar o tomar acción por defecto
                return;
            }

            // Crear notificación escalada
            const escalatedTitle = `⬆️ ESCALADO - ${title}`;
            const escalatedMessage = `Esta notificación fue escalada automáticamente después de ${Math.round(hours_overdue)} horas sin respuesta.\n\n${message}`;

            await sequelize.query(`
                INSERT INTO unified_notifications (
                    company_id,
                    module,
                    workflow_key,
                    recipient_user_id,
                    recipient_role,
                    recipient_type,
                    title,
                    message,
                    priority,
                    category,
                    requires_action,
                    action_type,
                    action_status,
                    sla_hours,
                    sla_deadline,
                    escalation_level,
                    escalated_from_id,
                    metadata,
                    origin_type,
                    origin_id,
                    created_at,
                    updated_at
                )
                VALUES (
                    :companyId,
                    :module,
                    :workflowKey,
                    :recipientUserId,
                    :recipientRole,
                    'user',
                    :title,
                    :message,
                    'urgent',
                    'alert',
                    TRUE,
                    'approval',
                    'pending',
                    :slaHours,
                    NOW() + INTERVAL ':slaHours hours',
                    :escalationLevel,
                    :escalatedFromId,
                    :metadata::jsonb,
                    :originType,
                    :originId,
                    NOW(),
                    NOW()
                )
            `, {
                replacements: {
                    companyId: company_id,
                    module,
                    workflowKey: workflow_key,
                    recipientUserId: nextRecipient.user_id,
                    recipientRole: nextRecipient.role,
                    title: escalatedTitle,
                    message: escalatedMessage,
                    slaHours: 8, // SLA más corto para niveles escalados
                    escalationLevel: nextLevel,
                    escalatedFromId: id,
                    metadata: JSON.stringify(metadata || {}),
                    originType: origin_type,
                    originId: origin_id
                },
                type: QueryTypes.INSERT
            });

            console.log(`   ✅ Notificación ${id} escalada a nivel ${nextLevel} (${nextRecipient.role})`);

            // TODO: Dispatch a canales (email, push)
            // await NCE.send({...escalatedNotification})

        } catch (error) {
            console.error(`   ❌ Error escalando notificación ${notification.id}:`, error.message);
        }
    }

    /**
     * Obtiene la cadena de escalamiento desde la BD
     */
    async getEscalationChain(companyId, userId, workflowKey) {
        try {
            // Obtener jerarquía organizacional del usuario
            const result = await sequelize.query(`
                SELECT * FROM get_complete_escalation_chain(
                    :userId,
                    :companyId,
                    :workflowKey,
                    NULL
                )
            `, {
                replacements: { userId, companyId, workflowKey },
                type: QueryTypes.SELECT
            });

            return result;
        } catch (error) {
            console.error('Error obteniendo cadena de escalamiento:', error.message);
            return [];
        }
    }

    // ========================================================================
    // JOB 2: ADVERTENCIAS DE SLA PRÓXIMO A VENCER
    // ========================================================================

    /**
     * Envía advertencias para notificaciones cuyo SLA está próximo a vencer
     */
    async sendSLAWarnings() {
        try {
            console.log('⏰ [CRON] Verificando SLA próximo a vencer...');

            // Buscar notificaciones que vencen en las próximas 2 horas
            const warnings = await sequelize.query(`
                SELECT
                    un.id,
                    un.company_id,
                    un.recipient_user_id,
                    un.title,
                    un.sla_deadline,
                    EXTRACT(EPOCH FROM (un.sla_deadline - NOW()))/3600 as hours_remaining
                FROM unified_notifications un
                WHERE un.deleted_at IS NULL
                  AND un.requires_action = TRUE
                  AND un.action_status = 'pending'
                  AND un.sla_deadline IS NOT NULL
                  AND un.sla_deadline > NOW()
                  AND un.sla_deadline < NOW() + INTERVAL '2 hours'
                  AND un.sla_breached = FALSE
                  AND un.sla_warning_sent = FALSE
                LIMIT 50
            `, { type: QueryTypes.SELECT });

            if (warnings.length === 0) {
                console.log('   ✅ No hay advertencias de SLA pendientes');
                return;
            }

            console.log(`   ⚠️  ${warnings.length} notificaciones próximas a vencer`);

            for (const warning of warnings) {
                await this.sendSLAWarning(warning);
            }

            console.log(`   ✅ ${warnings.length} advertencias enviadas`);

        } catch (error) {
            console.error('❌ [CRON] Error en sendSLAWarnings:', error.message);
        }
    }

    /**
     * Envía advertencia de SLA próximo a vencer
     */
    async sendSLAWarning(notification) {
        try {
            // Marcar advertencia como enviada
            await sequelize.query(`
                UPDATE unified_notifications
                SET sla_warning_sent = TRUE,
                    sla_warning_sent_at = NOW(),
                    updated_at = NOW()
                WHERE id = :notificationId
            `, {
                replacements: { notificationId: notification.id },
                type: QueryTypes.UPDATE
            });

            console.log(`   ⚠️  Advertencia SLA enviada para notif ${notification.id} (${Math.round(notification.hours_remaining * 60)} min restantes)`);

            // TODO: Enviar email/push de advertencia
            // await NCE.send({...warningNotification})

        } catch (error) {
            console.error(`   ❌ Error enviando advertencia SLA ${notification.id}:`, error.message);
        }
    }

    // ========================================================================
    // JOB 3: LIMPIEZA DE NOTIFICACIONES ANTIGUAS
    // ========================================================================

    /**
     * Limpia notificaciones antiguas (soft delete)
     */
    async cleanupOldNotifications() {
        try {
            console.log('⏰ [CRON] Limpiando notificaciones antiguas...');

            // Soft delete de notificaciones leídas con más de 90 días
            const result = await sequelize.query(`
                UPDATE unified_notifications
                SET deleted_at = NOW(),
                    updated_at = NOW()
                WHERE deleted_at IS NULL
                  AND read_at IS NOT NULL
                  AND created_at < NOW() - INTERVAL '90 days'
            `, { type: QueryTypes.UPDATE });

            const deletedCount = result[1] || 0; // rowCount
            console.log(`   ✅ ${deletedCount} notificaciones antiguas marcadas como eliminadas`);

        } catch (error) {
            console.error('❌ [CRON] Error en cleanupOldNotifications:', error.message);
        }
    }

    // ========================================================================
    // JOB 4: NOTIFICACIONES PROACTIVAS PERIÓDICAS
    // ========================================================================

    /**
     * Dispara verificaciones proactivas (documentos venciendo, EPP, etc.)
     */
    async triggerProactiveNotifications() {
        try {
            console.log('⏰ [CRON] Verificando alertas proactivas...');

            // Delegar al servicio proactivo
            const ProactiveService = require('./proactiveNotificationService');

            // Ejecutar verificaciones proactivas para todas las empresas activas
            const companies = await sequelize.query(`
                SELECT id, name FROM companies WHERE is_active = TRUE
            `, { type: QueryTypes.SELECT });

            let totalAlerts = 0;

            for (const company of companies) {
                try {
                    const alerts = await ProactiveService.checkAll(company.id);
                    totalAlerts += alerts.length;
                } catch (error) {
                    console.error(`   ❌ Error en alertas proactivas para empresa ${company.id}:`, error.message);
                }
            }

            console.log(`   ✅ ${totalAlerts} alertas proactivas generadas para ${companies.length} empresas`);

        } catch (error) {
            console.error('❌ [CRON] Error en triggerProactiveNotifications:', error.message);
        }
    }

    // ========================================================================
    // UTILIDADES
    // ========================================================================

    /**
     * Ejecutar manualmente un job específico (para testing)
     */
    async runJob(jobName) {
        console.log(`⏰ [CRON] Ejecutando job manual: ${jobName}`);

        switch (jobName) {
            case 'sla':
                await this.checkSLAAndEscalate();
                break;
            case 'warnings':
                await this.sendSLAWarnings();
                break;
            case 'cleanup':
                await this.cleanupOldNotifications();
                break;
            case 'proactive':
                await this.triggerProactiveNotifications();
                break;
            default:
                console.log(`   ❌ Job desconocido: ${jobName}`);
        }
    }

    /**
     * Status de los cron jobs
     */
    getStatus() {
        return {
            isRunning: this.isRunning,
            totalJobs: this.jobs.length,
            jobs: [
                { name: 'SLA Escalation', schedule: '*/5 * * * *', active: this.isRunning },
                { name: 'SLA Warnings', schedule: '*/15 * * * *', active: this.isRunning },
                { name: 'Cleanup', schedule: '0 3 * * *', active: this.isRunning },
                { name: 'Proactive', schedule: '0 */6 * * *', active: this.isRunning }
            ]
        };
    }
}

// Exportar singleton
const cronService = new NotificationCronService();
module.exports = cronService;
