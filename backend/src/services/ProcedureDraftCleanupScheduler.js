/**
 * ========================================================================
 * SERVICIO: Scheduler de Limpieza de Borradores de Procedimientos
 * ========================================================================
 * Limpia automáticamente borradores que exceden el TTL (7 días por defecto)
 * y libera bloqueos expirados.
 *
 * Funcionalidades:
 * - Eliminar borradores que excedieron su TTL (7 días)
 * - Liberar bloqueos de edición expirados
 * - Notificar a usuarios afectados
 * - Registro de auditoría de eliminaciones
 * ========================================================================
 */

const cron = require('node-cron');
const ProceduresService = require('./ProceduresService');

class ProcedureDraftCleanupScheduler {
    constructor(database, notificationService = null) {
        this.database = database;
        this.sequelize = database.sequelize;
        this.notificationService = notificationService;
        this.isRunning = false;
        this.cronJob = null;
        this.lastRunStats = null;

        console.log('📝 [DRAFT-CLEANUP] Inicializando scheduler de limpieza de borradores...');
    }

    /**
     * Inicia el scheduler (cron job diario a las 3:30 AM)
     */
    start() {
        if (this.isRunning) {
            console.log('⚠️ [DRAFT-CLEANUP] Ya está en ejecución');
            return;
        }

        // Ejecutar diariamente a las 3:30 AM
        // Formato: '30 3 * * *' = minuto 30, hora 3, todos los días
        this.cronJob = cron.schedule('30 3 * * *', async () => {
            console.log('🧹 [DRAFT-CLEANUP] Iniciando limpieza de borradores expirados...');
            await this.cleanupExpiredDrafts();
        }, {
            scheduled: true,
            timezone: "America/Argentina/Buenos_Aires"
        });

        this.isRunning = true;
        console.log('✅ [DRAFT-CLEANUP] Scheduler iniciado (diario 3:30 AM)');
    }

    /**
     * Detiene el scheduler
     */
    stop() {
        if (this.cronJob) {
            this.cronJob.stop();
            this.isRunning = false;
            console.log('🛑 [DRAFT-CLEANUP] Scheduler detenido');
        }
    }

    /**
     * Limpia borradores expirados y libera bloqueos
     */
    async cleanupExpiredDrafts() {
        const startTime = Date.now();
        const stats = {
            draftsDeleted: 0,
            locksReleased: 0,
            notificationsSent: 0,
            errors: [],
            deletedProcedures: []
        };

        try {
            console.log('🔍 [DRAFT-CLEANUP] Buscando borradores expirados...');

            // 1. Usar la función de PostgreSQL para limpiar borradores
            const result = await ProceduresService.cleanupExpiredDrafts();

            if (result && result.deleted_count > 0) {
                stats.draftsDeleted = result.deleted_count;
                stats.deletedProcedures = result.deleted_procedures || [];

                console.log(`🗑️ [DRAFT-CLEANUP] ${stats.draftsDeleted} borradores eliminados`);

                // 2. Notificar a los usuarios afectados
                if (this.notificationService && stats.deletedProcedures.length > 0) {
                    await this.notifyAffectedUsers(stats.deletedProcedures, stats);
                }
            } else {
                console.log('✅ [DRAFT-CLEANUP] No hay borradores expirados para eliminar');
            }

            // 3. Liberar bloqueos expirados (drafts que no fueron eliminados pero el lock expiró)
            const locksReleased = await this.releaseExpiredLocks();
            stats.locksReleased = locksReleased;

            if (locksReleased > 0) {
                console.log(`🔓 [DRAFT-CLEANUP] ${locksReleased} bloqueos liberados`);
            }

        } catch (error) {
            console.error('❌ [DRAFT-CLEANUP] Error en limpieza:', error);
            stats.errors.push(error.message);
        }

        // Guardar estadísticas de la última ejecución
        const duration = Date.now() - startTime;
        this.lastRunStats = {
            ...stats,
            timestamp: new Date(),
            durationMs: duration
        };

        // Log resumen
        console.log(`📊 [DRAFT-CLEANUP] Resumen: ${stats.draftsDeleted} borradores eliminados, ${stats.locksReleased} bloqueos liberados, ${stats.notificationsSent} notificaciones enviadas (${duration}ms)`);

        return stats;
    }

    /**
     * Libera bloqueos de edición que han expirado
     */
    async releaseExpiredLocks() {
        try {
            const [results] = await this.sequelize.query(`
                UPDATE procedures
                SET draft_locked_by = NULL,
                    draft_locked_at = NULL,
                    draft_expires_at = NULL,
                    updated_at = NOW()
                WHERE draft_locked_by IS NOT NULL
                  AND draft_expires_at IS NOT NULL
                  AND draft_expires_at < NOW()
                  AND status = 'draft'
                RETURNING id, code, title, company_id, draft_locked_by as was_locked_by
            `);

            if (results && results.length > 0) {
                // Registrar en historial de bloqueos
                for (const proc of results) {
                    await this.sequelize.query(`
                        UPDATE procedure_draft_locks
                        SET unlocked_at = NOW(), unlock_reason = 'expired'
                        WHERE procedure_id = $1 AND unlocked_at IS NULL
                    `, {
                        bind: [proc.id]
                    });
                }

                return results.length;
            }

            return 0;
        } catch (error) {
            console.error('❌ [DRAFT-CLEANUP] Error liberando bloqueos:', error);
            return 0;
        }
    }

    /**
     * Notifica a los usuarios cuyos borradores fueron eliminados
     */
    async notifyAffectedUsers(deletedProcedures, stats) {
        try {
            // Agrupar por usuario creador
            const byUser = {};
            for (const proc of deletedProcedures) {
                const userId = proc.created_by;
                if (!userId) continue;

                if (!byUser[userId]) {
                    byUser[userId] = {
                        userId,
                        companyId: proc.company_id,
                        procedures: []
                    };
                }
                byUser[userId].procedures.push({
                    code: proc.code,
                    title: proc.title,
                    expiredAt: proc.draft_expires_at
                });
            }

            // Enviar notificación a cada usuario
            for (const userData of Object.values(byUser)) {
                try {
                    const procedureList = userData.procedures
                        .map(p => `• ${p.code}: ${p.title}`)
                        .join('\n');

                    const message = userData.procedures.length === 1
                        ? `Tu borrador "${userData.procedures[0].title}" (${userData.procedures[0].code}) ha sido eliminado automáticamente porque excedió el tiempo máximo de 7 días en estado borrador.`
                        : `Los siguientes borradores han sido eliminados automáticamente por exceder el tiempo máximo de 7 días:\n\n${procedureList}`;

                    await this.notificationService.createNotification({
                        companyId: userData.companyId.toString(),
                        fromModule: 'procedures',
                        fromUserId: null, // Sistema
                        toUserId: userData.userId,
                        notificationType: 'system_notification',
                        title: '📝 Borrador(es) de Procedimiento Eliminado(s)',
                        message: message,
                        priority: 'medium',
                        channels: ['internal'],
                        metadata: {
                            type: 'draft_expired',
                            deletedProcedures: userData.procedures
                        },
                        requiresResponse: false
                    });

                    stats.notificationsSent++;
                    console.log(`📧 [DRAFT-CLEANUP] Notificación enviada a usuario ${userData.userId}`);

                } catch (notifError) {
                    console.error(`❌ [DRAFT-CLEANUP] Error notificando a ${userData.userId}:`, notifError.message);
                }
            }

        } catch (error) {
            console.error('❌ [DRAFT-CLEANUP] Error en notificaciones:', error);
        }
    }

    /**
     * Ejecuta manualmente la limpieza (útil para testing)
     */
    async runManually() {
        console.log('🔧 [DRAFT-CLEANUP] Ejecución manual solicitada...');
        return await this.cleanupExpiredDrafts();
    }

    /**
     * Obtiene estadísticas de la última ejecución
     */
    getLastRunStats() {
        return this.lastRunStats;
    }

    /**
     * Obtiene borradores próximos a expirar (para alertas)
     * @param {number} daysThreshold - Días antes de expirar (default 2)
     */
    async getDraftsAboutToExpire(daysThreshold = 2) {
        try {
            const [drafts] = await this.sequelize.query(`
                SELECT
                    p.id,
                    p.code,
                    p.title,
                    p.company_id,
                    p.created_by,
                    p.draft_expires_at,
                    DATE_PART('day', p.draft_expires_at - NOW()) as days_remaining,
                    u."firstName" || ' ' || u."lastName" as created_by_name,
                    u.email as created_by_email
                FROM procedures p
                LEFT JOIN users u ON p.created_by = u.user_id
                WHERE p.status = 'draft'
                  AND p.draft_expires_at IS NOT NULL
                  AND p.draft_expires_at <= (NOW() + INTERVAL '${daysThreshold} days')
                  AND p.draft_expires_at > NOW()
                ORDER BY p.draft_expires_at ASC
            `);

            return drafts || [];
        } catch (error) {
            console.error('❌ [DRAFT-CLEANUP] Error obteniendo borradores próximos a expirar:', error);
            return [];
        }
    }

    /**
     * Envía alertas de borradores próximos a expirar
     */
    async sendExpirationWarnings() {
        try {
            const draftsToExpire = await this.getDraftsAboutToExpire(2);

            if (draftsToExpire.length === 0) {
                console.log('✅ [DRAFT-CLEANUP] No hay borradores próximos a expirar');
                return 0;
            }

            console.log(`⚠️ [DRAFT-CLEANUP] ${draftsToExpire.length} borradores próximos a expirar`);

            // Agrupar por usuario
            const byUser = {};
            for (const draft of draftsToExpire) {
                const userId = draft.created_by;
                if (!userId) continue;

                if (!byUser[userId]) {
                    byUser[userId] = {
                        userId,
                        companyId: draft.company_id,
                        drafts: []
                    };
                }
                byUser[userId].drafts.push(draft);
            }

            let warningsSent = 0;

            // Enviar advertencias
            for (const userData of Object.values(byUser)) {
                try {
                    if (!this.notificationService) continue;

                    const draftList = userData.drafts
                        .map(d => {
                            const daysText = Math.ceil(d.days_remaining) === 1 ? '1 día' : `${Math.ceil(d.days_remaining)} días`;
                            return `• ${d.code}: ${d.title} (expira en ${daysText})`;
                        })
                        .join('\n');

                    const message = userData.drafts.length === 1
                        ? `Tu borrador "${userData.drafts[0].title}" expirará en ${Math.ceil(userData.drafts[0].days_remaining)} días. Publícalo o será eliminado automáticamente.`
                        : `Los siguientes borradores expirarán pronto:\n\n${draftList}\n\nPublícalos o serán eliminados automáticamente.`;

                    await this.notificationService.createNotification({
                        companyId: userData.companyId.toString(),
                        fromModule: 'procedures',
                        fromUserId: null,
                        toUserId: userData.userId,
                        notificationType: 'system_notification',
                        title: '⚠️ Borrador(es) Próximo(s) a Expirar',
                        message: message,
                        priority: 'high',
                        channels: ['internal'],
                        metadata: {
                            type: 'draft_expiring_soon',
                            drafts: userData.drafts.map(d => ({
                                id: d.id,
                                code: d.code,
                                title: d.title,
                                expiresAt: d.draft_expires_at,
                                daysRemaining: Math.ceil(d.days_remaining)
                            }))
                        },
                        requiresResponse: false
                    });

                    warningsSent++;

                } catch (notifError) {
                    console.error(`❌ [DRAFT-CLEANUP] Error enviando advertencia a ${userData.userId}:`, notifError.message);
                }
            }

            console.log(`📧 [DRAFT-CLEANUP] ${warningsSent} advertencias enviadas`);
            return warningsSent;

        } catch (error) {
            console.error('❌ [DRAFT-CLEANUP] Error enviando advertencias:', error);
            return 0;
        }
    }
}

module.exports = ProcedureDraftCleanupScheduler;
