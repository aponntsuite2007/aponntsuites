/**
 * ========================================================================
 * SERVICIO: Scheduler de Vencimiento de Exámenes Médicos Ocupacionales
 * ========================================================================
 * Verifica diariamente exámenes médicos próximos a vencer (30 días)
 * y envía notificaciones usando NotificationEnterpriseService
 *
 * Tipos de exámenes monitoreados:
 * - Preocupacional (al ingreso)
 * - Periódico (anual, semestral según configuración)
 * - Reingreso (al retornar después de ausencia prolongada)
 * - Retiro (al desvincularse)
 * - Especial (situaciones particulares)
 * ========================================================================
 */

const cron = require('node-cron');

class MedicalExamExpirationScheduler {
    constructor(database, notificationService) {
        this.database = database;
        this.sequelize = database.sequelize;
        this.notificationService = notificationService;
        this.isRunning = false;
        this.cronJob = null;

        console.log('🏥 [MEDICAL-SCHEDULER] Inicializando scheduler de exámenes médicos...');
    }

    /**
     * Inicia el scheduler (cron job diario a las 11:00 AM)
     */
    start() {
        if (this.isRunning) {
            console.log('⚠️ [MEDICAL-SCHEDULER] Ya está en ejecución');
            return;
        }

        // Ejecutar diariamente a las 11:00 AM
        // Formato: '0 11 * * *' = minuto 0, hora 11, todos los días
        this.cronJob = cron.schedule('0 11 * * *', async () => {
            console.log('🔔 [MEDICAL-SCHEDULER] Verificando exámenes médicos próximos a vencer...');
            await this.checkExpiringMedicalExams();
        }, {
            scheduled: true,
            timezone: "America/Argentina/Buenos_Aires"
        });

        this.isRunning = true;
        console.log('✅ [MEDICAL-SCHEDULER] Scheduler iniciado (diario 11:00 AM)');
    }

    /**
     * Detiene el scheduler
     */
    stop() {
        if (this.cronJob) {
            this.cronJob.stop();
            this.isRunning = false;
            console.log('🛑 [MEDICAL-SCHEDULER] Scheduler detenido');
        }
    }

    /**
     * Verifica exámenes médicos próximos a vencer y envía notificaciones
     */
    async checkExpiringMedicalExams() {
        try {
            console.log('🔍 [MEDICAL-SCHEDULER] Consultando exámenes médicos próximos a vencer...');

            // Query para obtener exámenes que vencen en los próximos 30 días
            const [expiringExams] = await this.sequelize.query(`
                SELECT
                    ume.id,
                    ume.user_id,
                    ume.company_id,
                    ume.exam_type,
                    ume.exam_date,
                    ume.next_exam_date,
                    ume.exam_frequency,
                    ume.medical_center,
                    ume.examining_doctor,
                    ume.result,
                    u.usuario,
                    u."firstName",
                    u."lastName",
                    u.email,
                    u.role,
                    DATE_PART('day', ume.next_exam_date::timestamp - NOW()) AS days_until_expiration
                FROM user_medical_exams ume
                INNER JOIN users u ON ume.user_id = u.user_id
                WHERE ume.next_exam_date IS NOT NULL
                    AND ume.next_exam_date <= (NOW() + INTERVAL '30 days')
                    AND ume.next_exam_date > NOW()
                    AND u."isActive" = true
                ORDER BY ume.next_exam_date ASC
            `, { type: this.sequelize.QueryTypes.SELECT });

            if (!expiringExams || expiringExams.length === 0) {
                console.log('✅ [MEDICAL-SCHEDULER] No hay exámenes médicos próximos a vencer');
                return;
            }

            console.log(`📋 [MEDICAL-SCHEDULER] Encontrados ${expiringExams.length} exámenes médicos próximos a vencer`);

            // Enviar notificaciones por examen
            let notificationsSent = 0;
            for (const exam of expiringExams) {
                await this.sendExpirationNotification(exam);
                notificationsSent++;
            }

            console.log(`✅ [MEDICAL-SCHEDULER] Notificaciones enviadas: ${notificationsSent} usuarios`);

        } catch (error) {
            console.error('❌ [MEDICAL-SCHEDULER] Error verificando exámenes médicos:', error);
        }
    }

    /**
     * Envía notificación a un usuario sobre examen médico próximo a vencer
     * @param {Object} exam - Datos del examen médico
     */
    async sendExpirationNotification(exam) {
        try {
            const companyId = exam.company_id.toString();
            const daysUntilExpiration = Math.ceil(exam.days_until_expiration);

            // Determinar prioridad según días restantes
            let priority = 'medium';
            let emoji = '🏥';

            if (daysUntilExpiration <= 7) {
                priority = 'urgent';
                emoji = '🚨';
            } else if (daysUntilExpiration <= 15) {
                priority = 'high';
                emoji = '⚠️';
            }

            // Obtener etiqueta legible del tipo de examen
            const examTypeLabel = this.getExamTypeLabel(exam.exam_type);
            const frequencyLabel = this.getFrequencyLabel(exam.exam_frequency);

            // Construir mensaje
            const daysText = daysUntilExpiration === 1 ? '1 día' : `${daysUntilExpiration} días`;
            const expirationDate = new Date(exam.next_exam_date).toLocaleDateString('es-AR');

            let message = `Su examen médico ${examTypeLabel.toLowerCase()} requiere renovación.\n\n`;
            message += `• Último examen: ${new Date(exam.exam_date).toLocaleDateString('es-AR')}\n`;
            message += `• Próximo examen: ${expirationDate} (en ${daysText})\n`;

            if (exam.exam_frequency) {
                message += `• Periodicidad: ${frequencyLabel}\n`;
            }

            if (exam.medical_center) {
                message += `• Centro médico: ${exam.medical_center}\n`;
            }

            message += `\nPor favor, coordine con RRHH para agendar su examen médico ocupacional.`;

            // Crear notificación usando el servicio enterprise
            await this.notificationService.createNotification({
                companyId: companyId,
                fromModule: 'hr', // Módulo de recursos humanos
                fromUserId: null, // Notificación del sistema
                toUserId: exam.user_id,
                toRole: exam.role || 'employee',
                notificationType: 'hr_notification',
                title: `${emoji} Examen Médico ${examTypeLabel} Próximo a Vencer`,
                message: message,
                priority: priority,
                channels: ['internal', 'email'],
                metadata: {
                    type: 'medical_exam_expiration',
                    userId: exam.user_id,
                    examId: exam.id,
                    examType: exam.exam_type,
                    examDate: exam.exam_date,
                    nextExamDate: exam.next_exam_date,
                    frequency: exam.exam_frequency,
                    daysRemaining: daysUntilExpiration,
                    medicalCenter: exam.medical_center,
                    examiningDoctor: exam.examining_doctor
                },
                requiresResponse: false
            });

            console.log(`📧 [MEDICAL-SCHEDULER] Notificación enviada a ${exam.usuario} (${examTypeLabel}, ${daysText} restantes)`);

        } catch (error) {
            console.error(`❌ [MEDICAL-SCHEDULER] Error enviando notificación:`, error.message);
        }
    }

    /**
     * Obtiene etiqueta legible para el tipo de examen
     */
    getExamTypeLabel(examType) {
        const labels = {
            'preocupacional': 'Preocupacional',
            'periodico': 'Periódico',
            'reingreso': 'Reingreso',
            'retiro': 'Retiro',
            'especial': 'Especial'
        };
        return labels[examType] || 'Examen Médico';
    }

    /**
     * Obtiene etiqueta legible para la frecuencia
     */
    getFrequencyLabel(frequency) {
        const labels = {
            'mensual': 'Mensual',
            'trimestral': 'Trimestral',
            'semestral': 'Semestral',
            'anual': 'Anual',
            'bienal': 'Bienal',
            'personalizado': 'Personalizado'
        };
        return labels[frequency] || 'No especificada';
    }

    /**
     * Ejecuta manualmente la verificación (útil para testing)
     */
    async runManually() {
        console.log('🔧 [MEDICAL-SCHEDULER] Ejecución manual solicitada...');
        await this.checkExpiringMedicalExams();
    }
}

module.exports = MedicalExamExpirationScheduler;
