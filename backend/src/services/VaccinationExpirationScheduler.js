/**
 * ========================================================================
 * SERVICIO: Scheduler de Vencimiento de Vacunas y Dosis de Refuerzo
 * ========================================================================
 * Verifica diariamente vacunas con dosis de refuerzo pendientes
 * y envía notificaciones usando NotificationEnterpriseService
 *
 * Extiende el sistema existente de alertas médicas proactivas
 * sin duplicar funcionalidad del MedicalExamExpirationScheduler
 *
 * Tipos de alertas:
 * - Dosis de refuerzo próximas (30 días)
 * - Dosis de refuerzo urgentes (7 días)
 * - Esquemas de vacunación incompletos
 * ========================================================================
 */

const cron = require('node-cron');

class VaccinationExpirationScheduler {
    constructor(database, notificationService) {
        this.database = database;
        this.sequelize = database.sequelize;
        this.notificationService = notificationService;
        this.isRunning = false;
        this.cronJob = null;

        console.log('💉 [VACCINATION-SCHEDULER] Inicializando scheduler de vacunas...');
    }

    /**
     * Inicia el scheduler (cron job diario a las 11:30 AM)
     * Media hora después del scheduler de exámenes médicos para distribuir carga
     */
    start() {
        if (this.isRunning) {
            console.log('⚠️ [VACCINATION-SCHEDULER] Ya está en ejecución');
            return;
        }

        // Ejecutar diariamente a las 11:30 AM (30 min después de exámenes médicos)
        // Formato: '30 11 * * *' = minuto 30, hora 11, todos los días
        this.cronJob = cron.schedule('30 11 * * *', async () => {
            console.log('🔔 [VACCINATION-SCHEDULER] Verificando vacunas próximas a vencer...');
            await this.checkExpiringVaccinations();
        }, {
            scheduled: true,
            timezone: "America/Argentina/Buenos_Aires"
        });

        this.isRunning = true;
        console.log('✅ [VACCINATION-SCHEDULER] Scheduler iniciado (diario 11:30 AM)');
    }

    /**
     * Detiene el scheduler
     */
    stop() {
        if (this.cronJob) {
            this.cronJob.stop();
            this.isRunning = false;
            console.log('🛑 [VACCINATION-SCHEDULER] Scheduler detenido');
        }
    }

    /**
     * Verifica vacunas con dosis de refuerzo próximas y envía notificaciones
     */
    async checkExpiringVaccinations() {
        try {
            console.log('🔍 [VACCINATION-SCHEDULER] Consultando vacunas con dosis de refuerzo pendientes...');

            // Query para obtener vacunas con next_dose_date en los próximos 30 días
            const [expiringVaccines] = await this.sequelize.query(`
                SELECT
                    uv.id,
                    uv.user_id,
                    uv.company_id,
                    uv.vaccine_name,
                    uv.vaccine_type,
                    uv.dose_number,
                    uv.total_doses,
                    uv.date_administered,
                    uv.next_dose_date,
                    uv.administering_institution,
                    u.usuario,
                    u."firstName",
                    u."lastName",
                    u.email,
                    u.role,
                    DATE_PART('day', uv.next_dose_date::timestamp - NOW()) AS days_until_next_dose
                FROM user_vaccinations uv
                INNER JOIN users u ON uv.user_id = u.user_id
                WHERE uv.next_dose_date IS NOT NULL
                    AND uv.next_dose_date <= (NOW() + INTERVAL '30 days')
                    AND uv.next_dose_date > NOW()
                    AND u."isActive" = true
                ORDER BY uv.next_dose_date ASC
            `, { type: this.sequelize.QueryTypes.SELECT });

            if (!expiringVaccines || expiringVaccines.length === 0) {
                console.log('✅ [VACCINATION-SCHEDULER] No hay dosis de refuerzo próximas');
                return;
            }

            console.log(`📋 [VACCINATION-SCHEDULER] Encontradas ${expiringVaccines.length} dosis de refuerzo próximas`);

            // Enviar notificaciones por vacuna
            let notificationsSent = 0;
            for (const vaccine of expiringVaccines) {
                await this.sendVaccinationNotification(vaccine);
                notificationsSent++;
            }

            console.log(`✅ [VACCINATION-SCHEDULER] Notificaciones enviadas: ${notificationsSent} usuarios`);

        } catch (error) {
            console.error('❌ [VACCINATION-SCHEDULER] Error verificando vacunas:', error);
        }
    }

    /**
     * Envía notificación a un usuario sobre dosis de refuerzo pendiente
     * @param {Object} vaccine - Datos de la vacunación
     */
    async sendVaccinationNotification(vaccine) {
        try {
            const companyId = vaccine.company_id.toString();
            const daysUntilNextDose = Math.ceil(vaccine.days_until_next_dose);

            // Determinar prioridad según días restantes (igual que exámenes médicos)
            let priority = 'medium';
            let emoji = '💉';

            if (daysUntilNextDose <= 7) {
                priority = 'urgent';
                emoji = '🚨';
            } else if (daysUntilNextDose <= 15) {
                priority = 'high';
                emoji = '⚠️';
            }

            // Construir mensaje
            const daysText = daysUntilNextDose === 1 ? '1 día' : `${daysUntilNextDose} días`;
            const nextDoseDate = new Date(vaccine.next_dose_date).toLocaleDateString('es-AR');
            const lastDoseDate = new Date(vaccine.date_administered).toLocaleDateString('es-AR');

            let message = `Su dosis de refuerzo de ${vaccine.vaccine_name} requiere aplicación.\n\n`;
            message += `• Vacuna: ${vaccine.vaccine_name}\n`;

            if (vaccine.vaccine_type) {
                message += `• Tipo: ${vaccine.vaccine_type}\n`;
            }

            message += `• Última dosis: ${lastDoseDate}`;
            if (vaccine.dose_number && vaccine.total_doses) {
                message += ` (Dosis ${vaccine.dose_number} de ${vaccine.total_doses})`;
            }
            message += `\n`;

            message += `• Próxima dosis: ${nextDoseDate} (en ${daysText})\n`;

            if (vaccine.administering_institution) {
                message += `• Institución: ${vaccine.administering_institution}\n`;
            }

            message += `\nPor favor, coordine con RRHH para aplicar su dosis de refuerzo.`;

            // Crear notificación usando el servicio enterprise (SSOT)
            await this.notificationService.createNotification({
                companyId: companyId,
                fromModule: 'hr', // Módulo de recursos humanos
                fromUserId: null, // Notificación del sistema
                toUserId: vaccine.user_id,
                toRole: vaccine.role || 'employee',
                notificationType: 'hr_notification',
                title: `${emoji} Dosis de Refuerzo de ${vaccine.vaccine_name} Pendiente`,
                message: message,
                priority: priority,
                channels: ['internal', 'email'],
                metadata: {
                    type: 'vaccination_expiration',
                    userId: vaccine.user_id,
                    vaccinationId: vaccine.id,
                    vaccineName: vaccine.vaccine_name,
                    vaccineType: vaccine.vaccine_type,
                    doseNumber: vaccine.dose_number,
                    totalDoses: vaccine.total_doses,
                    lastDoseDate: vaccine.date_administered,
                    nextDoseDate: vaccine.next_dose_date,
                    daysRemaining: daysUntilNextDose,
                    institution: vaccine.administering_institution
                },
                requiresResponse: false
            });

            console.log(`📧 [VACCINATION-SCHEDULER] Notificación enviada a ${vaccine.usuario} (${vaccine.vaccine_name}, ${daysText} restantes)`);

        } catch (error) {
            console.error(`❌ [VACCINATION-SCHEDULER] Error enviando notificación:`, error.message);
        }
    }

    /**
     * Ejecuta manualmente la verificación (útil para testing)
     */
    async runManually() {
        console.log('🔧 [VACCINATION-SCHEDULER] Ejecución manual solicitada...');
        await this.checkExpiringVaccinations();
    }
}

module.exports = VaccinationExpirationScheduler;
