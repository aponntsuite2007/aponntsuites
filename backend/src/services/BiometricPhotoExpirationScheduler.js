/**
 * ========================================================================
 * SERVICIO: Scheduler de Vencimiento de Fotos Biométricas
 * ========================================================================
 * Verifica diariamente fotos biométricas próximas a vencer (30 días)
 * y envía notificaciones usando NotificationEnterpriseService
 * ========================================================================
 */

const cron = require('node-cron');

class BiometricPhotoExpirationScheduler {
    constructor(database, notificationService) {
        this.database = database;
        this.sequelize = database.sequelize;
        this.notificationService = notificationService;
        this.isRunning = false;
        this.cronJob = null;

        console.log('📸 [BIOMETRIC-SCHEDULER] Inicializando scheduler de fotos biométricas...');
    }

    /**
     * Inicia el scheduler (cron job diario a las 9:00 AM)
     */
    start() {
        if (this.isRunning) {
            console.log('⚠️ [BIOMETRIC-SCHEDULER] Ya está en ejecución');
            return;
        }

        // Ejecutar diariamente a las 9:00 AM
        // Formato: '0 9 * * *' = minuto 0, hora 9, todos los días
        this.cronJob = cron.schedule('0 9 * * *', async () => {
            console.log('🔔 [BIOMETRIC-SCHEDULER] Verificando fotos próximas a vencer...');
            await this.checkExpiringPhotos();
        }, {
            scheduled: true,
            timezone: "America/Argentina/Buenos_Aires"
        });

        this.isRunning = true;
        console.log('✅ [BIOMETRIC-SCHEDULER] Scheduler iniciado (diario 9:00 AM)');

        // Ejecutar una vez inmediatamente al iniciar (para testing)
        // this.checkExpiringPhotos();
    }

    /**
     * Detiene el scheduler
     */
    stop() {
        if (this.cronJob) {
            this.cronJob.stop();
            this.isRunning = false;
            console.log('🛑 [BIOMETRIC-SCHEDULER] Scheduler detenido');
        }
    }

    /**
     * Verifica fotos biométricas próximas a vencer y envía notificaciones
     */
    async checkExpiringPhotos() {
        try {
            console.log('🔍 [BIOMETRIC-SCHEDULER] Consultando usuarios con fotos próximas a vencer...');

            // Usar la función SQL que creamos en la migración
            const [usersWithExpiringPhotos] = await this.sequelize.query(
                `SELECT * FROM get_users_with_expiring_photos(30)`,
                { type: this.sequelize.QueryTypes.SELECT }
            );

            if (!usersWithExpiringPhotos || usersWithExpiringPhotos.length === 0) {
                console.log('✅ [BIOMETRIC-SCHEDULER] No hay fotos próximas a vencer');
                return;
            }

            console.log(`📋 [BIOMETRIC-SCHEDULER] Encontrados ${usersWithExpiringPhotos.length} usuarios con fotos próximas a vencer`);

            // Agrupar usuarios por empresa para batch processing
            const usersByCompany = this.groupByCompany(usersWithExpiringPhotos);

            // Enviar notificaciones por empresa
            let notificationsSent = 0;
            for (const [companyId, users] of Object.entries(usersByCompany)) {
                for (const user of users) {
                    await this.sendExpirationNotification(user);
                    notificationsSent++;
                }
            }

            console.log(`✅ [BIOMETRIC-SCHEDULER] Notificaciones enviadas: ${notificationsSent}`);

        } catch (error) {
            console.error('❌ [BIOMETRIC-SCHEDULER] Error verificando fotos:', error);
        }
    }

    /**
     * Envía notificación a un usuario sobre foto próxima a vencer
     */
    async sendExpirationNotification(user) {
        try {
            const daysUntilExpiration = user.days_until_expiration;

            // Determinar prioridad según días restantes
            let priority = 'medium';
            let emoji = '📸';
            if (daysUntilExpiration <= 7) {
                priority = 'urgent';
                emoji = '🚨';
            } else if (daysUntilExpiration <= 15) {
                priority = 'high';
                emoji = '⚠️';
            }

            // Crear notificación usando el servicio enterprise
            await this.notificationService.createNotification({
                companyId: user.company_id.toString(),
                fromModule: 'hr', // Módulo de recursos humanos
                fromUserId: null, // Notificación del sistema
                toUserId: user.user_id,
                toRole: user.role || 'employee',
                notificationType: 'hr_notification',
                title: `${emoji} Renovación de Foto Biométrica Requerida`,
                message: `Su foto biométrica vencerá en ${daysUntilExpiration} días (${new Date(user.biometric_photo_expiration).toLocaleDateString('es-AR')}). Por favor, diríjase a RRHH para renovar su registro biométrico.`,
                priority: priority,
                channels: ['internal', 'email'],
                metadata: {
                    type: 'biometric_photo_expiration',
                    userId: user.user_id,
                    photoDate: user.biometric_photo_date,
                    expirationDate: user.biometric_photo_expiration,
                    daysRemaining: daysUntilExpiration
                },
                requiresResponse: false
            });

            console.log(`📧 [BIOMETRIC-SCHEDULER] Notificación enviada a usuario ${user.usuario} (${daysUntilExpiration} días restantes)`);

        } catch (error) {
            console.error(`❌ [BIOMETRIC-SCHEDULER] Error enviando notificación a ${user.usuario}:`, error.message);
        }
    }

    /**
     * Agrupa usuarios por empresa para procesamiento optimizado
     */
    groupByCompany(users) {
        const grouped = {};
        for (const user of users) {
            const companyId = user.company_id;
            if (!grouped[companyId]) {
                grouped[companyId] = [];
            }
            grouped[companyId].push(user);
        }
        return grouped;
    }

    /**
     * Ejecuta manualmente la verificación (útil para testing)
     */
    async runManually() {
        console.log('🔧 [BIOMETRIC-SCHEDULER] Ejecución manual solicitada...');
        await this.checkExpiringPhotos();
    }
}

module.exports = BiometricPhotoExpirationScheduler;
