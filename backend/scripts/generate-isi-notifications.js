/**
 * ============================================================================
 * SCRIPT: Generate ISI Notifications
 * ============================================================================
 *
 * Genera notificaciones para los módulos RRHH de ISI (company_id=11):
 * - Tardanzas (late_arrival_authorizations)
 * - Vacaciones (vacation_requests)
 * - Capacitaciones (training_assignments)
 * - Licencias médicas (medical_leaves)
 *
 * Uso: node scripts/generate-isi-notifications.js
 *
 * @version 1.0.0
 * @date 2025-01-25
 * ============================================================================
 */

const { Client } = require('pg');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

const COMPANY_ID = 11;
const CONNECTION_STRING = 'postgresql://postgres:Aedr15150302@localhost:5432/attendance_system';

// Notification group types by module
const GROUP_TYPES = {
    TARDANZA_PENDING: 'tardanza_pending_approval',
    TARDANZA_APPROVED: 'tardanza_approved',
    TARDANZA_REJECTED: 'tardanza_rejected',
    TARDANZA_ESCALATED: 'tardanza_escalated',
    VACATION_PENDING: 'vacation_pending_approval',
    VACATION_APPROVED: 'vacation_approved',
    VACATION_REJECTED: 'vacation_rejected',
    TRAINING_ASSIGNED: 'training_assigned',
    TRAINING_PENDING: 'training_pending',
    TRAINING_DUE_SOON: 'training_due_soon',
    MEDICAL_LEAVE_CREATED: 'medical_leave_created',
    MEDICAL_LEAVE_APPROVED: 'medical_leave_approved'
};

class ISINotificationGenerator {
    constructor() {
        this.client = new Client({ connectionString: CONNECTION_STRING });
        this.stats = {
            tardanzas: { created: 0, skipped: 0 },
            vacaciones: { created: 0, skipped: 0 },
            capacitaciones: { created: 0, skipped: 0 },
            licenciasMedicas: { created: 0, skipped: 0 }
        };
        this.admins = [];
    }

    async connect() {
        await this.client.connect();
        console.log('✅ Conectado a la base de datos');

        // Load admins for ISI
        const result = await this.client.query(`
            SELECT user_id, "firstName", "lastName"
            FROM users
            WHERE company_id = $1 AND role = 'admin'
            LIMIT 5
        `, [COMPANY_ID]);
        this.admins = result.rows;
        console.log(`✅ Cargados ${this.admins.length} admins de ISI`);
    }

    async disconnect() {
        await this.client.end();
        console.log('✅ Desconectado de la base de datos');
    }

    /**
     * Create a notification group
     */
    async createNotificationGroup(groupType, subject, metadata, priority = 'normal') {
        const groupId = uuidv4();
        const participants = this.admins.slice(0, 3).map(a => a.user_id);

        await this.client.query(`
            INSERT INTO notification_groups (
                id, group_type, initiator_type, initiator_id, subject, status, priority,
                company_id, created_at, metadata, last_activity_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9, NOW())
        `, [
            groupId,
            groupType,
            'system',
            'notification-generator',
            subject,
            'active',
            priority,
            COMPANY_ID,
            JSON.stringify({ ...metadata, participants })
        ]);

        return groupId;
    }

    /**
     * Generate SHA-256 hash for message content
     */
    generateMessageHash(content) {
        return crypto.createHash('sha256').update(content).digest('hex');
    }

    /**
     * Create a notification message
     */
    async createNotificationMessage(groupId, content, messageType, metadata = {}) {
        const messageId = uuidv4();
        const recipientId = this.admins[0]?.user_id || 'system';
        const messageHash = this.generateMessageHash(content + groupId + Date.now());

        // Get next sequence number
        const seqResult = await this.client.query(
            'SELECT COALESCE(MAX(sequence_number), 0) + 1 as next_seq FROM notification_messages WHERE group_id = $1',
            [groupId]
        );
        const sequenceNumber = seqResult.rows[0].next_seq;

        await this.client.query(`
            INSERT INTO notification_messages (
                id, group_id, sequence_number, sender_type, sender_id, sender_name,
                recipient_type, recipient_id, message_type, subject, content,
                created_at, company_id, channels, message_hash, hash_algorithm
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), $12, $13, $14, $15)
        `, [
            messageId,
            groupId,
            sequenceNumber,
            'system',
            'notification-generator',
            'Sistema de Notificaciones',
            'user',
            recipientId,
            messageType,
            metadata.subject || 'Notificación del sistema',
            content,
            COMPANY_ID,
            JSON.stringify(['inbox', 'email']),
            messageHash,
            'SHA-256'
        ]);

        return messageId;
    }

    /**
     * Check if notification already exists for a record
     */
    async notificationExists(groupType, recordId) {
        const result = await this.client.query(`
            SELECT id FROM notification_groups
            WHERE company_id = $1
            AND group_type = $2
            AND metadata->>'record_id' = $3
        `, [COMPANY_ID, groupType, recordId]);
        return result.rows.length > 0;
    }

    /**
     * Generate notifications for tardanzas (late arrivals)
     */
    async generateTardanzaNotifications() {
        console.log('\n📋 Generando notificaciones de TARDANZAS...');

        // Get all tardanzas
        const tardanzas = await this.client.query(`
            SELECT
                la.id, la.employee_id, la.status, la.minutes_late, la.reason,
                la.request_date, la.decision_reason, la.escalation_level,
                u."firstName", u."lastName"
            FROM late_arrival_authorizations la
            INNER JOIN users u ON la.employee_id = u.user_id
            WHERE la.company_id = $1
            ORDER BY la.created_at DESC
        `, [COMPANY_ID]);

        console.log(`   Encontradas ${tardanzas.rows.length} tardanzas`);

        for (const tardanza of tardanzas.rows) {
            const recordId = tardanza.id;
            let groupType, subject, content, priority;

            switch (tardanza.status) {
                case 'pending':
                    groupType = GROUP_TYPES.TARDANZA_PENDING;
                    subject = `Tardanza pendiente: ${tardanza.firstName} ${tardanza.lastName}`;
                    content = `${tardanza.firstName} ${tardanza.lastName} llegó ${tardanza.minutes_late} minutos tarde el ${new Date(tardanza.request_date).toLocaleDateString()}. Motivo: ${tardanza.reason || 'No especificado'}. Requiere autorización.`;
                    priority = 'normal';
                    break;
                case 'approved':
                    groupType = GROUP_TYPES.TARDANZA_APPROVED;
                    subject = `Tardanza aprobada: ${tardanza.firstName} ${tardanza.lastName}`;
                    content = `La tardanza de ${tardanza.firstName} ${tardanza.lastName} (${tardanza.minutes_late} min) del ${new Date(tardanza.request_date).toLocaleDateString()} fue APROBADA.`;
                    priority = 'low';
                    break;
                case 'rejected':
                    groupType = GROUP_TYPES.TARDANZA_REJECTED;
                    subject = `Tardanza rechazada: ${tardanza.firstName} ${tardanza.lastName}`;
                    content = `La tardanza de ${tardanza.firstName} ${tardanza.lastName} (${tardanza.minutes_late} min) del ${new Date(tardanza.request_date).toLocaleDateString()} fue RECHAZADA. Motivo: ${tardanza.decision_reason || 'No especificado'}.`;
                    priority = 'normal';
                    break;
                case 'escalated':
                    groupType = GROUP_TYPES.TARDANZA_ESCALATED;
                    subject = `⚠️ Tardanza escalada: ${tardanza.firstName} ${tardanza.lastName}`;
                    content = `La tardanza de ${tardanza.firstName} ${tardanza.lastName} fue ESCALADA al nivel ${tardanza.escalation_level || 1}. Requiere atención inmediata.`;
                    priority = 'high';
                    break;
                default:
                    continue;
            }

            // Check if notification already exists
            if (await this.notificationExists(groupType, recordId)) {
                this.stats.tardanzas.skipped++;
                continue;
            }

            // Create notification group
            const groupId = await this.createNotificationGroup(groupType, subject, {
                record_id: recordId,
                employee_id: tardanza.employee_id,
                employee_name: `${tardanza.firstName} ${tardanza.lastName}`,
                minutes_late: tardanza.minutes_late,
                status: tardanza.status,
                module: 'tardanzas'
            }, priority);

            // Create notification message
            await this.createNotificationMessage(groupId, content, 'tardanza_notification', { subject });

            this.stats.tardanzas.created++;
        }

        console.log(`   ✅ Creadas: ${this.stats.tardanzas.created}, Omitidas: ${this.stats.tardanzas.skipped}`);
    }

    /**
     * Generate notifications for vacation requests
     */
    async generateVacationNotifications() {
        console.log('\n🏖️ Generando notificaciones de VACACIONES...');

        const vacaciones = await this.client.query(`
            SELECT
                vr.id, vr.user_id, vr.status, vr.start_date, vr.end_date,
                vr.total_days, vr.reason, vr.approval_comments,
                u."firstName", u."lastName"
            FROM vacation_requests vr
            INNER JOIN users u ON vr.user_id = u.user_id
            WHERE vr.company_id = $1
            ORDER BY vr.created_at DESC
        `, [COMPANY_ID]);

        console.log(`   Encontradas ${vacaciones.rows.length} solicitudes de vacaciones`);

        for (const vacacion of vacaciones.rows) {
            const recordId = vacacion.id.toString();
            let groupType, subject, content, priority;

            switch (vacacion.status) {
                case 'pending':
                    groupType = GROUP_TYPES.VACATION_PENDING;
                    subject = `Vacaciones pendientes: ${vacacion.firstName} ${vacacion.lastName}`;
                    content = `${vacacion.firstName} ${vacacion.lastName} solicita ${vacacion.total_days} días de vacaciones del ${new Date(vacacion.start_date).toLocaleDateString()} al ${new Date(vacacion.end_date).toLocaleDateString()}. Motivo: ${vacacion.reason || 'No especificado'}.`;
                    priority = 'normal';
                    break;
                case 'approved':
                    groupType = GROUP_TYPES.VACATION_APPROVED;
                    subject = `Vacaciones aprobadas: ${vacacion.firstName} ${vacacion.lastName}`;
                    content = `Las vacaciones de ${vacacion.firstName} ${vacacion.lastName} (${vacacion.total_days} días) del ${new Date(vacacion.start_date).toLocaleDateString()} al ${new Date(vacacion.end_date).toLocaleDateString()} fueron APROBADAS.`;
                    priority = 'low';
                    break;
                case 'rejected':
                    groupType = GROUP_TYPES.VACATION_REJECTED;
                    subject = `Vacaciones rechazadas: ${vacacion.firstName} ${vacacion.lastName}`;
                    content = `Las vacaciones de ${vacacion.firstName} ${vacacion.lastName} fueron RECHAZADAS. ${vacacion.approval_comments ? 'Comentarios: ' + vacacion.approval_comments : ''}`;
                    priority = 'normal';
                    break;
                default:
                    continue;
            }

            if (await this.notificationExists(groupType, recordId)) {
                this.stats.vacaciones.skipped++;
                continue;
            }

            const groupId = await this.createNotificationGroup(groupType, subject, {
                record_id: recordId,
                employee_id: vacacion.user_id,
                employee_name: `${vacacion.firstName} ${vacacion.lastName}`,
                total_days: vacacion.total_days,
                start_date: vacacion.start_date,
                end_date: vacacion.end_date,
                status: vacacion.status,
                module: 'vacaciones'
            }, priority);

            await this.createNotificationMessage(groupId, content, 'vacation_notification', { subject });

            this.stats.vacaciones.created++;
        }

        console.log(`   ✅ Creadas: ${this.stats.vacaciones.created}, Omitidas: ${this.stats.vacaciones.skipped}`);
    }

    /**
     * Generate notifications for training assignments
     */
    async generateTrainingNotifications() {
        console.log('\n📚 Generando notificaciones de CAPACITACIONES...');

        const capacitaciones = await this.client.query(`
            SELECT
                ta.id, ta.user_id, ta.status, ta.progress_percentage,
                ta.due_date, ta.assigned_at, ta.score,
                t.title as training_title, t.description as training_description,
                u."firstName", u."lastName"
            FROM training_assignments ta
            INNER JOIN trainings t ON ta.training_id = t.id
            INNER JOIN users u ON ta.user_id = u.user_id
            WHERE ta.company_id = $1
            AND ta.status IN ('pending', 'in_progress')
            ORDER BY ta.due_date ASC NULLS LAST
        `, [COMPANY_ID]);

        console.log(`   Encontradas ${capacitaciones.rows.length} capacitaciones pendientes/en progreso`);

        for (const capacitacion of capacitaciones.rows) {
            const recordId = capacitacion.id.toString();
            let groupType, subject, content, priority;

            // Determine if due soon (within 7 days)
            const dueDate = capacitacion.due_date ? new Date(capacitacion.due_date) : null;
            const isDueSoon = dueDate && (dueDate - new Date()) < 7 * 24 * 60 * 60 * 1000;
            const isOverdue = dueDate && dueDate < new Date();

            if (isOverdue) {
                groupType = GROUP_TYPES.TRAINING_DUE_SOON;
                subject = `⚠️ Capacitación VENCIDA: ${capacitacion.firstName} ${capacitacion.lastName}`;
                content = `La capacitación "${capacitacion.training_title}" de ${capacitacion.firstName} ${capacitacion.lastName} está VENCIDA (fecha límite: ${dueDate.toLocaleDateString()}). Progreso actual: ${capacitacion.progress_percentage || 0}%.`;
                priority = 'high';
            } else if (isDueSoon) {
                groupType = GROUP_TYPES.TRAINING_DUE_SOON;
                subject = `⏰ Capacitación próxima a vencer: ${capacitacion.firstName} ${capacitacion.lastName}`;
                content = `La capacitación "${capacitacion.training_title}" de ${capacitacion.firstName} ${capacitacion.lastName} vence el ${dueDate.toLocaleDateString()}. Progreso actual: ${capacitacion.progress_percentage || 0}%.`;
                priority = 'normal';
            } else if (capacitacion.status === 'pending') {
                groupType = GROUP_TYPES.TRAINING_ASSIGNED;
                subject = `Capacitación asignada: ${capacitacion.firstName} ${capacitacion.lastName}`;
                content = `Se asignó la capacitación "${capacitacion.training_title}" a ${capacitacion.firstName} ${capacitacion.lastName}. ${dueDate ? 'Fecha límite: ' + dueDate.toLocaleDateString() : 'Sin fecha límite'}.`;
                priority = 'low';
            } else {
                groupType = GROUP_TYPES.TRAINING_PENDING;
                subject = `Capacitación en progreso: ${capacitacion.firstName} ${capacitacion.lastName}`;
                content = `${capacitacion.firstName} ${capacitacion.lastName} está realizando "${capacitacion.training_title}". Progreso: ${capacitacion.progress_percentage || 0}%.`;
                priority = 'low';
            }

            if (await this.notificationExists(groupType, recordId)) {
                this.stats.capacitaciones.skipped++;
                continue;
            }

            const groupId = await this.createNotificationGroup(groupType, subject, {
                record_id: recordId,
                employee_id: capacitacion.user_id,
                employee_name: `${capacitacion.firstName} ${capacitacion.lastName}`,
                training_title: capacitacion.training_title,
                progress: capacitacion.progress_percentage,
                due_date: capacitacion.due_date,
                status: capacitacion.status,
                module: 'capacitaciones'
            }, priority);

            await this.createNotificationMessage(groupId, content, 'training_notification', { subject });

            this.stats.capacitaciones.created++;
        }

        console.log(`   ✅ Creadas: ${this.stats.capacitaciones.created}, Omitidas: ${this.stats.capacitaciones.skipped}`);
    }

    /**
     * Generate notifications for medical leaves
     */
    async generateMedicalLeaveNotifications() {
        console.log('\n🏥 Generando notificaciones de LICENCIAS MÉDICAS...');

        const licencias = await this.client.query(`
            SELECT
                ml.id, ml.user_id, ml.status, ml.start_date, ml.end_date,
                ml.leave_type, ml.diagnosis, ml.doctor_name, ml.medical_institution,
                ml.notes,
                u."firstName", u."lastName"
            FROM medical_leaves ml
            INNER JOIN users u ON ml.user_id = u.user_id
            WHERE ml.company_id = $1
            ORDER BY ml.created_at DESC
        `, [COMPANY_ID]);

        console.log(`   Encontradas ${licencias.rows.length} licencias médicas`);

        for (const licencia of licencias.rows) {
            const recordId = licencia.id;
            let groupType, subject, content, priority;

            switch (licencia.status) {
                case 'approved':
                    groupType = GROUP_TYPES.MEDICAL_LEAVE_APPROVED;
                    subject = `Licencia médica: ${licencia.firstName} ${licencia.lastName}`;
                    content = `${licencia.firstName} ${licencia.lastName} tiene licencia médica del ${new Date(licencia.start_date).toLocaleDateString()} al ${new Date(licencia.end_date).toLocaleDateString()}. Tipo: ${licencia.leave_type || 'Médica'}. Diagnóstico: ${licencia.diagnosis || 'No especificado'}. Doctor: ${licencia.doctor_name || 'No especificado'}.`;
                    priority = 'normal';
                    break;
                case 'pending':
                    groupType = GROUP_TYPES.MEDICAL_LEAVE_CREATED;
                    subject = `Nueva licencia médica: ${licencia.firstName} ${licencia.lastName}`;
                    content = `${licencia.firstName} ${licencia.lastName} ha registrado una licencia médica. Pendiente de aprobación.`;
                    priority = 'normal';
                    break;
                default:
                    continue;
            }

            if (await this.notificationExists(groupType, recordId)) {
                this.stats.licenciasMedicas.skipped++;
                continue;
            }

            const groupId = await this.createNotificationGroup(groupType, subject, {
                record_id: recordId,
                employee_id: licencia.user_id,
                employee_name: `${licencia.firstName} ${licencia.lastName}`,
                leave_type: licencia.leave_type,
                start_date: licencia.start_date,
                end_date: licencia.end_date,
                status: licencia.status,
                module: 'licencias_medicas'
            }, priority);

            await this.createNotificationMessage(groupId, content, 'medical_leave_notification', { subject });

            this.stats.licenciasMedicas.created++;
        }

        console.log(`   ✅ Creadas: ${this.stats.licenciasMedicas.created}, Omitidas: ${this.stats.licenciasMedicas.skipped}`);
    }

    /**
     * Print final summary
     */
    printSummary() {
        console.log('\n' + '='.repeat(60));
        console.log('📊 RESUMEN DE NOTIFICACIONES GENERADAS PARA ISI (company_id=11)');
        console.log('='.repeat(60));
        console.log(`\n📋 TARDANZAS:`);
        console.log(`   - Creadas: ${this.stats.tardanzas.created}`);
        console.log(`   - Omitidas (ya existían): ${this.stats.tardanzas.skipped}`);
        console.log(`\n🏖️ VACACIONES:`);
        console.log(`   - Creadas: ${this.stats.vacaciones.created}`);
        console.log(`   - Omitidas (ya existían): ${this.stats.vacaciones.skipped}`);
        console.log(`\n📚 CAPACITACIONES:`);
        console.log(`   - Creadas: ${this.stats.capacitaciones.created}`);
        console.log(`   - Omitidas (ya existían): ${this.stats.capacitaciones.skipped}`);
        console.log(`\n🏥 LICENCIAS MÉDICAS:`);
        console.log(`   - Creadas: ${this.stats.licenciasMedicas.created}`);
        console.log(`   - Omitidas (ya existían): ${this.stats.licenciasMedicas.skipped}`);

        const totalCreated = this.stats.tardanzas.created + this.stats.vacaciones.created +
                           this.stats.capacitaciones.created + this.stats.licenciasMedicas.created;
        const totalSkipped = this.stats.tardanzas.skipped + this.stats.vacaciones.skipped +
                           this.stats.capacitaciones.skipped + this.stats.licenciasMedicas.skipped;

        console.log('\n' + '-'.repeat(60));
        console.log(`📈 TOTAL NOTIFICACIONES CREADAS: ${totalCreated}`);
        console.log(`📉 TOTAL OMITIDAS: ${totalSkipped}`);
        console.log('='.repeat(60));
    }

    /**
     * Run the full generation process
     */
    async run() {
        console.log('='.repeat(60));
        console.log('🚀 GENERADOR DE NOTIFICACIONES ISI');
        console.log('='.repeat(60));
        console.log(`Company ID: ${COMPANY_ID}`);
        console.log(`Fecha: ${new Date().toISOString()}`);

        try {
            await this.connect();

            await this.generateTardanzaNotifications();
            await this.generateVacationNotifications();
            await this.generateTrainingNotifications();
            await this.generateMedicalLeaveNotifications();

            this.printSummary();

        } catch (error) {
            console.error('❌ Error:', error.message);
            console.error(error.stack);
        } finally {
            await this.disconnect();
        }
    }
}

// Run the script
const generator = new ISINotificationGenerator();
generator.run();
