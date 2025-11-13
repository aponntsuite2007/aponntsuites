/**
 * ========================================================================
 * SERVICIO: Scheduler de Vencimiento de Documentos
 * ========================================================================
 * Verifica diariamente documentos próximos a vencer (30 días)
 * y envía notificaciones usando NotificationEnterpriseService
 *
 * Tipos de documentos monitoreados:
 * - Pasaportes
 * - Licencias de conducir
 * - Visas de trabajo
 * - Certificados de antecedentes
 * - Otros documentos relevantes
 * ========================================================================
 */

const cron = require('node-cron');

class DocumentExpirationScheduler {
    constructor(database, notificationService) {
        this.database = database;
        this.sequelize = database.sequelize;
        this.notificationService = notificationService;
        this.isRunning = false;
        this.cronJob = null;

        console.log('📄 [DOCUMENT-SCHEDULER] Inicializando scheduler de documentos...');
    }

    /**
     * Inicia el scheduler (cron job diario a las 10:00 AM)
     */
    start() {
        if (this.isRunning) {
            console.log('⚠️ [DOCUMENT-SCHEDULER] Ya está en ejecución');
            return;
        }

        // Ejecutar diariamente a las 10:00 AM
        // Formato: '0 10 * * *' = minuto 0, hora 10, todos los días
        this.cronJob = cron.schedule('0 10 * * *', async () => {
            console.log('🔔 [DOCUMENT-SCHEDULER] Verificando documentos próximos a vencer...');
            await this.checkExpiringDocuments();
        }, {
            scheduled: true,
            timezone: "America/Argentina/Buenos_Aires"
        });

        this.isRunning = true;
        console.log('✅ [DOCUMENT-SCHEDULER] Scheduler iniciado (diario 10:00 AM)');
    }

    /**
     * Detiene el scheduler
     */
    stop() {
        if (this.cronJob) {
            this.cronJob.stop();
            this.isRunning = false;
            console.log('🛑 [DOCUMENT-SCHEDULER] Scheduler detenido');
        }
    }

    /**
     * Verifica documentos próximos a vencer y envía notificaciones
     */
    async checkExpiringDocuments() {
        try {
            console.log('🔍 [DOCUMENT-SCHEDULER] Consultando documentos próximos a vencer...');

            // Query para obtener documentos que vencen en los próximos 30 días
            const [expiringDocs] = await this.sequelize.query(`
                SELECT
                    ud.id,
                    ud.user_id,
                    ud.company_id,
                    ud.document_type,
                    ud.document_number,
                    ud.expiration_date,
                    u.usuario,
                    u."firstName",
                    u."lastName",
                    u.email,
                    u.role,
                    DATE_PART('day', ud.expiration_date::timestamp - NOW()) AS days_until_expiration
                FROM user_documents ud
                INNER JOIN users u ON ud.user_id = u.user_id
                WHERE ud.expiration_date IS NOT NULL
                    AND ud.expiration_date <= (NOW() + INTERVAL '30 days')
                    AND ud.expiration_date > NOW()
                    AND u."isActive" = true
                ORDER BY ud.expiration_date ASC
            `, { type: this.sequelize.QueryTypes.SELECT });

            if (!expiringDocs || expiringDocs.length === 0) {
                console.log('✅ [DOCUMENT-SCHEDULER] No hay documentos próximos a vencer');
                return;
            }

            console.log(`📋 [DOCUMENT-SCHEDULER] Encontrados ${expiringDocs.length} documentos próximos a vencer`);

            // Agrupar documentos por usuario para evitar spam
            const docsByUser = this.groupByUser(expiringDocs);

            // Enviar notificaciones por usuario
            let notificationsSent = 0;
            for (const [userId, docs] of Object.entries(docsByUser)) {
                await this.sendExpirationNotification(docs);
                notificationsSent++;
            }

            console.log(`✅ [DOCUMENT-SCHEDULER] Notificaciones enviadas: ${notificationsSent} usuarios`);

        } catch (error) {
            console.error('❌ [DOCUMENT-SCHEDULER] Error verificando documentos:', error);
        }
    }

    /**
     * Envía notificación a un usuario sobre documentos próximos a vencer
     * @param {Array} documents - Array de documentos del mismo usuario
     */
    async sendExpirationNotification(documents) {
        try {
            if (documents.length === 0) return;

            const user = documents[0]; // Todos son del mismo usuario
            const companyId = user.company_id.toString();

            // Determinar prioridad global basada en el documento más urgente
            let minDays = Math.min(...documents.map(d => d.days_until_expiration));
            let priority = 'medium';
            let emoji = '📄';

            if (minDays <= 7) {
                priority = 'urgent';
                emoji = '🚨';
            } else if (minDays <= 15) {
                priority = 'high';
                emoji = '⚠️';
            }

            // Construir mensaje con lista de documentos
            const documentList = documents.map(doc => {
                const docTypeLabel = this.getDocumentTypeLabel(doc.document_type);
                const daysText = doc.days_until_expiration === 1 ? '1 día' : `${Math.ceil(doc.days_until_expiration)} días`;
                const expirationDate = new Date(doc.expiration_date).toLocaleDateString('es-AR');

                return `• ${docTypeLabel}${doc.document_number ? ` (${doc.document_number})` : ''}: Vence en ${daysText} (${expirationDate})`;
            }).join('\n');

            const title = documents.length === 1
                ? `${emoji} Documento Próximo a Vencer`
                : `${emoji} ${documents.length} Documentos Próximos a Vencer`;

            const message = `Los siguientes documentos requieren renovación:\n\n${documentList}\n\nPor favor, diríjase a RRHH para iniciar el proceso de renovación.`;

            // Crear notificación usando el servicio enterprise
            await this.notificationService.createNotification({
                companyId: companyId,
                fromModule: 'hr', // Módulo de recursos humanos
                fromUserId: null, // Notificación del sistema
                toUserId: user.user_id,
                toRole: user.role || 'employee',
                notificationType: 'hr_notification',
                title: title,
                message: message,
                priority: priority,
                channels: ['internal', 'email'],
                metadata: {
                    type: 'document_expiration',
                    userId: user.user_id,
                    documents: documents.map(d => ({
                        id: d.id,
                        type: d.document_type,
                        number: d.document_number,
                        expirationDate: d.expiration_date,
                        daysRemaining: Math.ceil(d.days_until_expiration)
                    })),
                    mostUrgentDays: minDays
                },
                requiresResponse: false
            });

            console.log(`📧 [DOCUMENT-SCHEDULER] Notificación enviada a ${user.usuario} (${documents.length} documentos)`);

        } catch (error) {
            console.error(`❌ [DOCUMENT-SCHEDULER] Error enviando notificación:`, error.message);
        }
    }

    /**
     * Agrupa documentos por usuario para procesamiento optimizado
     */
    groupByUser(documents) {
        const grouped = {};
        for (const doc of documents) {
            const userId = doc.user_id;
            if (!grouped[userId]) {
                grouped[userId] = [];
            }
            grouped[userId].push(doc);
        }
        return grouped;
    }

    /**
     * Obtiene etiqueta legible para el tipo de documento
     */
    getDocumentTypeLabel(documentType) {
        const labels = {
            'dni': 'DNI',
            'pasaporte': 'Pasaporte',
            'licencia_conducir': 'Licencia de Conducir',
            'visa': 'Visa de Trabajo',
            'certificado_antecedentes': 'Certificado de Antecedentes',
            'otro': 'Documento'
        };
        return labels[documentType] || 'Documento';
    }

    /**
     * Ejecuta manualmente la verificación (útil para testing)
     */
    async runManually() {
        console.log('🔧 [DOCUMENT-SCHEDULER] Ejecución manual solicitada...');
        await this.checkExpiringDocuments();
    }
}

module.exports = DocumentExpirationScheduler;
