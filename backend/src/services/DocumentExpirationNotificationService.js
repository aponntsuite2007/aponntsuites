/**
 * DocumentExpirationNotificationService.js
 * Sistema de notificaciones proactivas para documentos por vencer
 * Con escalamiento automatico basado en urgencia
 *
 * Niveles de escalamiento:
 * - LEVEL_1 (30 dias): Solo empleado
 * - LEVEL_2 (15 dias): Empleado + Supervisor
 * - LEVEL_3 (7 dias o vencido): Empleado + Supervisor + RRHH Admin
 */

const { Pool } = require('pg');
const cron = require('node-cron');
const NotificationRecipientResolver = require('./NotificationRecipientResolver');

class DocumentExpirationNotificationService {
    constructor() {
        this.pool = new Pool({
            user: process.env.DB_USER || 'postgres',
            host: process.env.DB_HOST || 'localhost',
            database: process.env.DB_NAME || 'attendance_system',
            password: process.env.DB_PASSWORD || 'Aedr15150302',
            port: process.env.DB_PORT || 5432
        });

        // Configuracion de escalamiento (dias antes del vencimiento)
        this.escalationConfig = {
            LEVEL_1: { days: 30, notifyEmployee: true, notifySupervisor: false, notifyHR: false },
            LEVEL_2: { days: 15, notifyEmployee: true, notifySupervisor: true, notifyHR: false },
            LEVEL_3: { days: 7, notifyEmployee: true, notifySupervisor: true, notifyHR: true },
            EXPIRED: { days: 0, notifyEmployee: true, notifySupervisor: true, notifyHR: true }
        };

        this.scheduledJob = null;
        this.isRunning = false;
    }

    /**
     * Iniciar el scheduler de notificaciones
     * Por defecto corre todos los dias a las 8:00 AM
     */
    startScheduler(cronExpression = '0 8 * * *') {
        if (this.scheduledJob) {
            console.log('[DOC-EXPIRATION] Scheduler ya esta corriendo');
            return;
        }

        this.scheduledJob = cron.schedule(cronExpression, async () => {
            console.log(`[DOC-EXPIRATION] ${new Date().toISOString()} - Ejecutando revision de documentos...`);
            await this.processAllCompanies();
        });

        console.log(`[DOC-EXPIRATION] Scheduler iniciado con expresion: ${cronExpression}`);
    }

    /**
     * Detener el scheduler
     */
    stopScheduler() {
        if (this.scheduledJob) {
            this.scheduledJob.stop();
            this.scheduledJob = null;
            console.log('[DOC-EXPIRATION] Scheduler detenido');
        }
    }

    /**
     * Procesar todas las empresas activas
     */
    async processAllCompanies() {
        if (this.isRunning) {
            console.log('[DOC-EXPIRATION] Proceso ya en ejecucion, saltando...');
            return;
        }

        this.isRunning = true;
        const client = await this.pool.connect();

        try {
            // Obtener empresas activas
            const companiesResult = await client.query(`
                SELECT company_id, name, slug
                FROM companies
                WHERE is_active = true
            `);

            console.log(`[DOC-EXPIRATION] Procesando ${companiesResult.rows.length} empresas...`);

            for (const company of companiesResult.rows) {
                await this.processCompanyDocuments(client, company.company_id, company.name);
            }

            console.log('[DOC-EXPIRATION] Proceso completado');

        } catch (error) {
            console.error('[DOC-EXPIRATION] Error procesando empresas:', error);
        } finally {
            client.release();
            this.isRunning = false;
        }
    }

    /**
     * Procesar documentos de una empresa especifica
     */
    async processCompanyDocuments(client, companyId, companyName) {
        try {
            // Buscar documentos proximos a vencer o vencidos
            const docsResult = await client.query(`
                SELECT
                    edd.id as document_id,
                    edd.user_id,
                    edd.expiration_date,
                    edd.status,
                    edd.family_member_type,
                    edd.family_member_name,
                    cd.dependency_name,
                    cd.dependency_code,
                    cd.config as dependency_config,
                    u.first_name || ' ' || u.last_name as employee_name,
                    u.email as employee_email,
                    u.department_id,
                    d.name as department_name
                FROM employee_dependency_documents edd
                JOIN company_dependencies cd ON edd.dependency_id = cd.id
                JOIN users u ON edd.user_id = u.user_id
                LEFT JOIN departments d ON u.department_id = d.department_id
                WHERE edd.company_id = $1
                  AND edd.is_current = true
                  AND edd.expiration_date IS NOT NULL
                  AND edd.expiration_date <= CURRENT_DATE + INTERVAL '30 days'
                ORDER BY edd.expiration_date ASC
            `, [companyId]);

            if (docsResult.rows.length === 0) {
                return;
            }

            console.log(`[DOC-EXPIRATION] Empresa ${companyName}: ${docsResult.rows.length} documentos a procesar`);

            for (const doc of docsResult.rows) {
                await this.processDocument(client, companyId, doc);
            }

        } catch (error) {
            console.error(`[DOC-EXPIRATION] Error procesando empresa ${companyName}:`, error);
        }
    }

    /**
     * Procesar un documento individual
     */
    async processDocument(client, companyId, doc) {
        const today = new Date();
        const expirationDate = new Date(doc.expiration_date);
        const daysUntilExpiration = Math.ceil((expirationDate - today) / (1000 * 60 * 60 * 24));

        // Determinar nivel de escalamiento
        let escalationLevel;
        if (daysUntilExpiration <= 0) {
            escalationLevel = 'EXPIRED';
        } else if (daysUntilExpiration <= 7) {
            escalationLevel = 'LEVEL_3';
        } else if (daysUntilExpiration <= 15) {
            escalationLevel = 'LEVEL_2';
        } else if (daysUntilExpiration <= 30) {
            escalationLevel = 'LEVEL_1';
        } else {
            return; // No necesita notificacion
        }

        // Verificar si ya se envio esta notificacion hoy para este nivel
        const alreadySent = await this.checkNotificationSent(client, doc.document_id, escalationLevel);
        if (alreadySent) {
            return;
        }

        // Crear notificaciones segun nivel de escalamiento
        const config = this.escalationConfig[escalationLevel];
        const notifications = [];

        // Notificacion al empleado
        if (config.notifyEmployee) {
            notifications.push({
                user_id: doc.user_id,
                type: 'EMPLOYEE',
                title: this.getNotificationTitle(escalationLevel, doc),
                message: this.getNotificationMessage(escalationLevel, doc, daysUntilExpiration),
                priority: this.getPriority(escalationLevel)
            });
        }

        // Notificacion al supervisor (usando jerarquía organizacional)
        if (config.notifySupervisor && doc.user_id) {
            const supervisor = await this.getSupervisorByHierarchy(client, doc.user_id, companyId);
            if (supervisor) {
                notifications.push({
                    user_id: supervisor.user_id,
                    type: 'SUPERVISOR',
                    title: `[SUPERVISOR] ${this.getNotificationTitle(escalationLevel, doc)}`,
                    message: `Empleado: ${doc.employee_name}\n${this.getNotificationMessage(escalationLevel, doc, daysUntilExpiration)}`,
                    priority: this.getPriority(escalationLevel)
                });
            } else {
                console.log(`[DOC-EXPIRATION] No se encontró supervisor para empleado ${doc.user_id}`);
            }
        }

        // Notificacion a RRHH/Admin
        if (config.notifyHR) {
            const hrAdmins = await this.getHRAdmins(client, companyId);
            for (const admin of hrAdmins) {
                notifications.push({
                    user_id: admin.user_id,
                    type: 'HR_ADMIN',
                    title: `[RRHH-URGENTE] ${this.getNotificationTitle(escalationLevel, doc)}`,
                    message: `Empleado: ${doc.employee_name}\nDepartamento: ${doc.department_name || 'N/A'}\n${this.getNotificationMessage(escalationLevel, doc, daysUntilExpiration)}`,
                    priority: 'HIGH'
                });
            }
        }

        // Guardar notificaciones
        for (const notif of notifications) {
            await this.createNotification(client, companyId, doc.document_id, escalationLevel, notif);
        }

        console.log(`[DOC-EXPIRATION] Documento ${doc.document_id}: ${escalationLevel} - ${notifications.length} notificaciones enviadas`);
    }

    /**
     * Verificar si ya se envio notificacion hoy para este documento y nivel
     */
    async checkNotificationSent(client, documentId, escalationLevel) {
        const result = await client.query(`
            SELECT id FROM notifications
            WHERE metadata->>'document_id' = $1
              AND metadata->>'escalation_level' = $2
              AND created_at::date = CURRENT_DATE
            LIMIT 1
        `, [documentId.toString(), escalationLevel]);

        return result.rows.length > 0;
    }

    /**
     * Obtener supervisor del empleado usando jerarquía organizacional
     * Usa parent_position_id, NO rol genérico
     */
    async getSupervisorByHierarchy(client, userId, companyId) {
        try {
            // Obtener posición organizacional del empleado
            const employeeResult = await client.query(`
                SELECT u.user_id, u.first_name, u.last_name,
                       op.parent_position_id
                FROM users u
                LEFT JOIN organizational_positions op ON u.organizational_position_id = op.id
                WHERE u.user_id = $1 AND u.company_id = $2
            `, [userId, companyId]);

            if (employeeResult.rows.length === 0 || !employeeResult.rows[0].parent_position_id) {
                console.log(`[DOC-EXPIRATION] Usuario ${userId} sin supervisor en jerarquía`);
                return null;
            }

            const parentPositionId = employeeResult.rows[0].parent_position_id;

            // Buscar usuario asignado a la posición del supervisor
            const supervisorResult = await client.query(`
                SELECT u.user_id, u.first_name || ' ' || u.last_name as name, u.email,
                       op.position_name
                FROM users u
                JOIN organizational_positions op ON u.organizational_position_id = op.id
                WHERE u.organizational_position_id = $1
                  AND u.company_id = $2
                  AND u.is_active = true
                LIMIT 1
            `, [parentPositionId, companyId]);

            if (supervisorResult.rows.length === 0) {
                console.log(`[DOC-EXPIRATION] Posición ${parentPositionId} sin usuario asignado`);
                return null;
            }

            console.log(`[DOC-EXPIRATION] Supervisor encontrado: ${supervisorResult.rows[0].name}`);
            return supervisorResult.rows[0];

        } catch (error) {
            console.error('[DOC-EXPIRATION] Error obteniendo supervisor:', error);
            return null;
        }
    }

    /**
     * Obtener supervisor del departamento (legacy fallback)
     * DEPRECADO: Usar getSupervisorByHierarchy() en su lugar
     */
    async getDepartmentSupervisor(client, departmentId) {
        // Este método se mantiene por compatibilidad pero ya NO se usa
        // La nueva lógica usa getSupervisorByHierarchy()
        return null;
    }

    /**
     * 🆕 ACTUALIZADO: Obtener usuarios de RRHH usando NotificationRecipientResolver (SSOT)
     * Ya no usa query directa - delega al servicio centralizado
     */
    async getHRAdmins(client, companyId) {
        try {
            // Usar NotificationRecipientResolver como SSOT
            const recipients = await NotificationRecipientResolver.resolveRRHH(companyId, {
                maxRecipients: 5,
                includeUserDetails: true,
                fallbackToAdmins: true
            });

            if (recipients.length === 0) {
                console.log(`[DOC-EXPIRATION] No se encontró RRHH via NotificationRecipientResolver para empresa ${companyId}`);
            } else {
                console.log(`[DOC-EXPIRATION] ${recipients.length} usuarios RRHH encontrados via NotificationRecipientResolver`);
            }

            // Mapear al formato esperado
            return recipients.map(r => ({
                user_id: r.userId,
                name: r.name || '',
                email: r.email,
                position_name: 'RRHH',
                position_code: 'RRHH'
            }));
        } catch (error) {
            console.error(`[DOC-EXPIRATION] Error obteniendo RRHH via NotificationRecipientResolver:`, error);
            return [];
        }
    }

    /**
     * Crear notificacion en la base de datos
     */
    async createNotification(client, companyId, documentId, escalationLevel, notif) {
        try {
            await client.query(`
                INSERT INTO notifications (
                    company_id, user_id, title, message, type, priority,
                    metadata, is_read, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, false, CURRENT_TIMESTAMP)
            `, [
                companyId,
                notif.user_id,
                notif.title,
                notif.message,
                'DOCUMENT_EXPIRATION',
                notif.priority,
                JSON.stringify({
                    document_id: documentId.toString(),
                    escalation_level: escalationLevel,
                    recipient_type: notif.type,
                    generated_by: 'DocumentExpirationNotificationService'
                })
            ]);
        } catch (error) {
            // Si la tabla notifications no existe, crear log
            if (error.code === '42P01') {
                console.log(`[DOC-EXPIRATION] Tabla notifications no existe. Notificacion: ${notif.title}`);
            } else {
                throw error;
            }
        }
    }

    /**
     * Generar titulo de notificacion
     */
    getNotificationTitle(level, doc) {
        const docName = doc.dependency_name;
        const familyInfo = doc.family_member_name ? ` (${doc.family_member_name})` : '';

        switch (level) {
            case 'EXPIRED':
                return `VENCIDO: ${docName}${familyInfo}`;
            case 'LEVEL_3':
                return `URGENTE: ${docName} por vencer${familyInfo}`;
            case 'LEVEL_2':
                return `Alerta: ${docName} vence pronto${familyInfo}`;
            case 'LEVEL_1':
            default:
                return `Recordatorio: ${docName} vence en 30 dias${familyInfo}`;
        }
    }

    /**
     * Generar mensaje de notificacion
     */
    getNotificationMessage(level, doc, daysUntilExpiration) {
        const docName = doc.dependency_name;
        const expDate = new Date(doc.expiration_date).toLocaleDateString('es-ES');
        const familyInfo = doc.family_member_name ? `\nFamiliar: ${doc.family_member_name}` : '';

        if (daysUntilExpiration <= 0) {
            const daysExpired = Math.abs(daysUntilExpiration);
            return `El documento "${docName}" VENCIO hace ${daysExpired} dia(s) (${expDate}).${familyInfo}\n\nPor favor, renueve este documento lo antes posible para evitar impactos en sus beneficios laborales.`;
        } else if (daysUntilExpiration <= 7) {
            return `URGENTE: El documento "${docName}" vence en ${daysUntilExpiration} dia(s) (${expDate}).${familyInfo}\n\nDebe renovar este documento inmediatamente para no perder beneficios asociados.`;
        } else if (daysUntilExpiration <= 15) {
            return `El documento "${docName}" vence en ${daysUntilExpiration} dias (${expDate}).${familyInfo}\n\nLe recomendamos iniciar el proceso de renovacion.`;
        } else {
            return `Recordatorio: El documento "${docName}" vence el ${expDate} (en ${daysUntilExpiration} dias).${familyInfo}\n\nPlanifique su renovacion con anticipacion.`;
        }
    }

    /**
     * Obtener prioridad segun nivel
     */
    getPriority(level) {
        switch (level) {
            case 'EXPIRED':
            case 'LEVEL_3':
                return 'HIGH';
            case 'LEVEL_2':
                return 'MEDIUM';
            case 'LEVEL_1':
            default:
                return 'LOW';
        }
    }

    /**
     * Ejecutar manualmente para una empresa
     */
    async runForCompany(companyId) {
        const client = await this.pool.connect();
        try {
            const companyResult = await client.query(
                'SELECT company_id, name FROM companies WHERE company_id = $1',
                [companyId]
            );

            if (companyResult.rows.length === 0) {
                return { success: false, error: 'Empresa no encontrada' };
            }

            await this.processCompanyDocuments(client, companyId, companyResult.rows[0].name);

            return { success: true, message: `Notificaciones procesadas para empresa ${companyResult.rows[0].name}` };
        } catch (error) {
            console.error('[DOC-EXPIRATION] Error:', error);
            return { success: false, error: error.message };
        } finally {
            client.release();
        }
    }

    /**
     * Obtener estadisticas de documentos por vencer
     */
    async getExpirationStats(companyId) {
        const client = await this.pool.connect();
        try {
            const result = await client.query(`
                SELECT
                    COUNT(*) FILTER (WHERE expiration_date <= CURRENT_DATE) as expired,
                    COUNT(*) FILTER (WHERE expiration_date > CURRENT_DATE AND expiration_date <= CURRENT_DATE + INTERVAL '7 days') as expiring_7_days,
                    COUNT(*) FILTER (WHERE expiration_date > CURRENT_DATE + INTERVAL '7 days' AND expiration_date <= CURRENT_DATE + INTERVAL '15 days') as expiring_15_days,
                    COUNT(*) FILTER (WHERE expiration_date > CURRENT_DATE + INTERVAL '15 days' AND expiration_date <= CURRENT_DATE + INTERVAL '30 days') as expiring_30_days,
                    COUNT(*) FILTER (WHERE expiration_date > CURRENT_DATE + INTERVAL '30 days') as valid
                FROM employee_dependency_documents
                WHERE company_id = $1
                  AND is_current = true
                  AND expiration_date IS NOT NULL
            `, [companyId]);

            return {
                success: true,
                data: {
                    expired: parseInt(result.rows[0].expired),
                    expiring_7_days: parseInt(result.rows[0].expiring_7_days),
                    expiring_15_days: parseInt(result.rows[0].expiring_15_days),
                    expiring_30_days: parseInt(result.rows[0].expiring_30_days),
                    valid: parseInt(result.rows[0].valid),
                    total: Object.values(result.rows[0]).reduce((a, b) => a + parseInt(b), 0)
                }
            };
        } catch (error) {
            return { success: false, error: error.message };
        } finally {
            client.release();
        }
    }
}

// Singleton instance
const documentExpirationService = new DocumentExpirationNotificationService();

module.exports = {
    DocumentExpirationNotificationService,
    documentExpirationService
};
