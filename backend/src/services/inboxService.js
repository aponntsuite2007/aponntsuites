/**
 * INBOX SERVICE - Bandeja de Notificaciones con Grupos/Conversaciones
 *
 * Gestiona notificaciones agrupadas en hilos/conversaciones
 * Integrado con notification_groups y notification_messages
 *
 * @version 1.0
 * @date 2025-10-17
 */

const { sequelize } = require('../config/database');
const crypto = require('crypto');

/**
 * Obtener bandeja de entrada del usuario
 * Muestra grupos de notificaciones según el rol del usuario:
 *
 * FILTRADO POR ROL:
 * - superadmin: TODAS las notificaciones de TODAS las empresas
 * - admin, gerente: TODAS las notificaciones de SU empresa
 * - supervisor, jefe: Propias + subordinados directos
 * - rrhh: Propias + notificaciones de tipo HR (vacation, leave, medical)
 * - employee: Solo las propias (initiator, recipient, sender)
 */
async function getInbox(employeeId, companyId, filters = {}) {
    try {
        const { status = 'all', priority = 'all', limit = 50, offset = 0, userRole = 'employee' } = filters;

        // Base WHERE clause según el rol
        let whereClause = '';
        const params = [];
        let paramIndex = 1;

        // =============== FILTRADO POR ROL ===============
        const normalizedRole = userRole.toLowerCase();

        if (normalizedRole === 'superadmin') {
            // Superadmin ve TODO de TODAS las empresas
            whereClause = '1=1';
            console.log('🔐 [INBOX] Superadmin: acceso global');

        } else if (['admin', 'administrador', 'gerente', 'gerente_general', 'director'].includes(normalizedRole)) {
            // Admin/Gerente ve TODAS las notificaciones de SU empresa
            whereClause = `ng.company_id = $${paramIndex}`;
            params.push(companyId);
            paramIndex++;
            console.log(`🔐 [INBOX] Admin/Gerente: acceso total empresa ${companyId}`);

        } else if (['supervisor', 'jefe', 'lider', 'coordinador'].includes(normalizedRole)) {
            // Supervisor ve propias + subordinados
            whereClause = `ng.company_id = $${paramIndex}`;
            params.push(companyId);
            paramIndex++;

            // Agregar filtro de participación (propias o de subordinados)
            whereClause += ` AND (
                ng.initiator_id = $${paramIndex}
                OR EXISTS (
                    SELECT 1 FROM notification_messages nm2
                    WHERE nm2.group_id = ng.id
                    AND (nm2.recipient_id = $${paramIndex} OR nm2.sender_id = $${paramIndex})
                )
                OR EXISTS (
                    SELECT 1 FROM users u
                    WHERE u.supervisor_id = $${paramIndex}
                    AND (
                        ng.initiator_id = u.user_id::text
                        OR EXISTS (
                            SELECT 1 FROM notification_messages nm3
                            WHERE nm3.group_id = ng.id
                            AND (nm3.recipient_id = u.user_id::text OR nm3.sender_id = u.user_id::text)
                        )
                    )
                )
            )`;
            params.push(employeeId);
            paramIndex++;
            console.log(`🔐 [INBOX] Supervisor: propias + subordinados (${employeeId})`);

        } else if (['rrhh', 'hr', 'recursos_humanos'].includes(normalizedRole)) {
            // RRHH ve propias + notificaciones de tipo HR
            whereClause = `ng.company_id = $${paramIndex}`;
            params.push(companyId);
            paramIndex++;

            whereClause += ` AND (
                ng.initiator_id = $${paramIndex}
                OR EXISTS (
                    SELECT 1 FROM notification_messages nm2
                    WHERE nm2.group_id = ng.id
                    AND (nm2.recipient_id = $${paramIndex} OR nm2.sender_id = $${paramIndex})
                )
                OR ng.group_type IN ('vacation_request', 'leave_request', 'medical_notification', 'late_arrival', 'absence_notification', 'overtime_request')
            )`;
            params.push(employeeId);
            paramIndex++;
            console.log(`🔐 [INBOX] RRHH: propias + tipo HR (${employeeId})`);

        } else {
            // Employee: solo las propias
            whereClause = `ng.company_id = $${paramIndex}`;
            params.push(companyId);
            paramIndex++;

            whereClause += ` AND (
                ng.initiator_id = $${paramIndex}
                OR EXISTS (
                    SELECT 1 FROM notification_messages nm2
                    WHERE nm2.group_id = ng.id
                    AND (nm2.recipient_id = $${paramIndex} OR nm2.sender_id = $${paramIndex})
                )
            )`;
            params.push(employeeId);
            paramIndex++;
            console.log(`🔐 [INBOX] Employee: solo propias (${employeeId})`);
        }

        // Filtros de estado
        if (status !== 'all') {
            whereClause += ` AND ng.status = $${paramIndex}`;
            params.push(status);
            paramIndex++;
        }

        // Filtros de prioridad
        if (priority !== 'all') {
            whereClause += ` AND ng.priority = $${paramIndex}`;
            params.push(priority);
            paramIndex++;
        }

        // Agregar employeeId para unread_count
        const employeeIdParamIndex = paramIndex;
        params.push(employeeId);
        paramIndex++;

        const query = `
            SELECT
                ng.id,
                ng.group_type,
                ng.initiator_type,
                ng.initiator_id,
                ng.subject,
                ng.status,
                ng.priority,
                ng.created_at,
                ng.metadata,
                COUNT(nm.id) as message_count,
                MAX(nm.created_at) as last_message_at,
                (
                    SELECT content
                    FROM notification_messages
                    WHERE group_id = ng.id
                    ORDER BY created_at DESC
                    LIMIT 1
                ) as last_message,
                (
                    SELECT COUNT(*)
                    FROM notification_messages
                    WHERE group_id = ng.id
                    AND read_at IS NULL
                    AND recipient_id = $${employeeIdParamIndex}
                ) as unread_count
            FROM notification_groups ng
            LEFT JOIN notification_messages nm ON nm.group_id = ng.id
            WHERE ${whereClause}
            GROUP BY ng.id
            ORDER BY MAX(nm.created_at) DESC NULLS LAST, ng.created_at DESC
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;

        params.push(limit, offset);

        const [groups] = await sequelize.query(query, {
            bind: params
        });

        // Contar total (sin limit/offset - exclude employeeId param for count and limit/offset)
        const countParamsEndIndex = employeeIdParamIndex - 1;
        const countParams = params.slice(0, countParamsEndIndex);
        const [countResult] = await sequelize.query(
            `SELECT COUNT(DISTINCT ng.id) as total FROM notification_groups ng WHERE ${whereClause}`,
            { bind: countParams }
        );

        return {
            groups,
            total: parseInt(countResult[0]?.total || 0),
            limit,
            offset,
            has_more: (offset + limit) < parseInt(countResult[0]?.total || 0)
        };

    } catch (error) {
        console.error('❌ Error obteniendo inbox:', error);
        throw error;
    }
}

/**
 * Obtener mensajes de un grupo/conversación
 */
async function getGroupMessages(groupId, employeeId, companyId) {
    try {
        // Verificar acceso
        const [group] = await sequelize.query(
            `SELECT * FROM notification_groups WHERE id = $1 AND company_id = $2`,
            { bind: [groupId, companyId] }
        );

        if (!group || group.length === 0) {
            throw new Error('Grupo no encontrado o sin acceso');
        }

        // Obtener mensajes
        const [messages] = await sequelize.query(`
            SELECT
                id,
                sequence_number,
                sender_type,
                sender_id,
                sender_name,
                recipient_type,
                recipient_id,
                recipient_name,
                message_type,
                subject,
                content,
                created_at,
                deadline_at,
                requires_response,
                delivered_at,
                read_at,
                responded_at,
                channels,
                attachments,
                message_hash
            FROM notification_messages
            WHERE group_id = $1
            ORDER BY sequence_number ASC
        `, { bind: [groupId] });

        // Marcar como leídos
        await sequelize.query(`
            UPDATE notification_messages
            SET read_at = NOW()
            WHERE group_id = $1
              AND recipient_id = $2
              AND read_at IS NULL
        `, { bind: [groupId, employeeId] });

        return {
            group: group[0],
            messages
        };

    } catch (error) {
        console.error('❌ Error obteniendo mensajes:', error);
        throw error;
    }
}

/**
 * Crear nueva conversación/notificación
 */
async function createNotificationGroup(companyId, data) {
    try {
        const {
            group_type,
            initiator_type,
            initiator_id,
            subject,
            priority = 'normal',
            metadata = {}
        } = data;

        const [result] = await sequelize.query(`
            INSERT INTO notification_groups (
                group_type, initiator_type, initiator_id,
                subject, priority, company_id, metadata
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `, {
            bind: [
                group_type,
                initiator_type,
                initiator_id,
                subject,
                priority,
                companyId,
                JSON.stringify(metadata)
            ]
        });

        return result[0];

    } catch (error) {
        console.error('❌ Error creando grupo:', error);
        throw error;
    }
}

/**
 * Enviar mensaje a un grupo
 */
async function sendMessage(groupId, companyId, messageData) {
    try {
        const {
            sender_type,
            sender_id,
            sender_name,
            recipient_type,
            recipient_id,
            recipient_name,
            message_type,
            subject = null,
            content,
            deadline_at = null,
            requires_response = false,
            channels = ['web'],
            attachments = null
        } = messageData;

        // Obtener siguiente número de secuencia
        const [seqResult] = await sequelize.query(`
            SELECT COALESCE(MAX(sequence_number), 0) + 1 as next_seq
            FROM notification_messages
            WHERE group_id = $1
        `, { bind: [groupId] });

        const sequenceNumber = seqResult[0].next_seq;

        // Generar hash SHA-256
        const hashContent = `${groupId}|${sequenceNumber}|${sender_id}|${recipient_id}|${content}|${new Date().toISOString()}`;
        const messageHash = crypto.createHash('sha256').update(hashContent).digest('hex');

        // Insertar mensaje
        const [result] = await sequelize.query(`
            INSERT INTO notification_messages (
                group_id, sequence_number,
                sender_type, sender_id, sender_name,
                recipient_type, recipient_id, recipient_name,
                message_type, subject, content,
                deadline_at, requires_response,
                message_hash, channels, attachments,
                company_id
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
            )
            RETURNING *
        `, {
            bind: [
                groupId, sequenceNumber,
                sender_type, sender_id, sender_name,
                recipient_type, recipient_id, recipient_name,
                message_type, subject, content,
                deadline_at, requires_response,
                messageHash,
                JSON.stringify(channels),
                attachments ? JSON.stringify(attachments) : null,
                companyId
            ]
        });

        // Log de auditoría
        await sequelize.query(`
            INSERT INTO notification_audit_log (
                group_id, message_id, action, actor_type, actor_id, metadata
            ) VALUES ($1, $2, 'created', $3, $4, $5)
        `, {
            bind: [
                groupId,
                result[0].id,
                sender_type,
                sender_id,
                JSON.stringify({ message_type, requires_response })
            ]
        });

        return result[0];

    } catch (error) {
        console.error('❌ Error enviando mensaje:', error);
        throw error;
    }
}

/**
 * Marcar mensajes como leídos
 */
async function markAsRead(groupId, employeeId, messageIds = null) {
    try {
        let query = `
            UPDATE notification_messages
            SET read_at = NOW()
            WHERE group_id = $1
              AND recipient_id = $2
              AND read_at IS NULL
        `;

        const params = [groupId, employeeId];

        if (messageIds && messageIds.length > 0) {
            query += ` AND id = ANY($3)`;
            params.push(messageIds);
        }

        await sequelize.query(query, { bind: params });

        return { success: true };

    } catch (error) {
        console.error('❌ Error marcando como leído:', error);
        throw error;
    }
}

/**
 * Cerrar conversación/grupo
 */
async function closeGroup(groupId, companyId, closedBy) {
    try {
        await sequelize.query(`
            UPDATE notification_groups
            SET status = 'closed',
                closed_at = NOW(),
                closed_by = $1
            WHERE id = $2 AND company_id = $3
        `, { bind: [closedBy, groupId, companyId] });

        return { success: true };

    } catch (error) {
        console.error('❌ Error cerrando grupo:', error);
        throw error;
    }
}

/**
 * Obtener estadísticas del inbox
 */
async function getInboxStats(employeeId, companyId) {
    try {
        const [stats] = await sequelize.query(`
            SELECT
                COUNT(DISTINCT ng.id) FILTER (WHERE ng.status = 'open') as open_groups,
                COUNT(DISTINCT ng.id) FILTER (WHERE ng.status = 'pending') as pending_groups,
                COUNT(nm.id) FILTER (WHERE nm.read_at IS NULL AND nm.recipient_id = $1) as unread_messages,
                COUNT(nm.id) FILTER (WHERE nm.requires_response = true AND nm.responded_at IS NULL AND nm.recipient_id = $1) as pending_responses,
                COUNT(nm.id) FILTER (WHERE nm.deadline_at < NOW() AND nm.responded_at IS NULL AND nm.recipient_id = $1) as overdue_messages
            FROM notification_groups ng
            LEFT JOIN notification_messages nm ON nm.group_id = ng.id
            WHERE ng.company_id = $2
        `, { bind: [employeeId, companyId] });

        return stats[0];

    } catch (error) {
        console.error('❌ Error obteniendo estadísticas:', error);
        throw error;
    }
}

/**
 * Obtener notificaciones de un empleado específico
 * Busca en grupos y mensajes donde el empleado es:
 * - Destinatario (recipient_id)
 * - Iniciador (initiator_id)
 * - Mencionado en metadata
 */
async function getEmployeeNotifications(employeeId, companyId) {
    try {
        const query = `
            SELECT DISTINCT
                ng.id,
                ng.group_type,
                ng.initiator_type,
                ng.initiator_id,
                ng.subject,
                ng.status,
                ng.priority,
                ng.created_at,
                ng.metadata,
                COUNT(nm.id) as message_count,
                MAX(nm.created_at) as last_message_at,
                (
                    SELECT content
                    FROM notification_messages
                    WHERE group_id = ng.id
                    ORDER BY created_at DESC
                    LIMIT 1
                ) as last_message,
                (
                    SELECT COUNT(*)
                    FROM notification_messages
                    WHERE group_id = ng.id
                    AND read_at IS NULL
                    AND recipient_id = $1
                ) as unread_count
            FROM notification_groups ng
            LEFT JOIN notification_messages nm ON nm.group_id = ng.id
            WHERE ng.company_id = $2
              AND (
                  -- Empleado es el iniciador del grupo
                  ng.initiator_id = $1
                  OR ng.initiator_id = $3
                  -- O es destinatario de algún mensaje en el grupo
                  OR EXISTS (
                      SELECT 1 FROM notification_messages m
                      WHERE m.group_id = ng.id
                      AND (m.recipient_id = $1 OR m.recipient_id = $3)
                  )
                  -- O es el remitente de algún mensaje
                  OR EXISTS (
                      SELECT 1 FROM notification_messages m
                      WHERE m.group_id = ng.id
                      AND (m.sender_id = $1 OR m.sender_id = $3)
                  )
                  -- O está mencionado en el metadata del grupo
                  OR ng.metadata::text ILIKE '%' || $1 || '%'
              )
            GROUP BY ng.id
            ORDER BY MAX(nm.created_at) DESC NULLS LAST, ng.created_at DESC
            LIMIT 100
        `;

        // Pasamos el employeeId tanto como user_id como employee_id (EMP-XXX)
        const [groups] = await sequelize.query(query, {
            bind: [employeeId, companyId, employeeId]
        });

        return groups;

    } catch (error) {
        console.error('❌ Error obteniendo notificaciones de empleado:', error);
        throw error;
    }
}

/**
 * Obtener resumen de pendientes para globo flotante
 * Incluye: recibidos sin responder, enviados sin respuesta, vencidos
 */
async function getPendingBadgeSummary(employeeId, companyId) {
    try {
        // Notificaciones RECIBIDAS que requieren respuesta
        const [received] = await sequelize.query(`
            SELECT
                COUNT(*) FILTER (WHERE requires_response = TRUE AND responded_at IS NULL) as pending_responses,
                COUNT(*) FILTER (WHERE requires_response = TRUE AND responded_at IS NULL AND deadline_at < NOW()) as overdue_responses,
                COUNT(*) FILTER (WHERE read_at IS NULL) as unread_messages
            FROM notification_messages
            WHERE recipient_id = $1
              AND company_id = $2
              AND is_deleted = FALSE
        `, { bind: [employeeId, companyId] });

        // Notificaciones ENVIADAS que esperan respuesta
        const [sent] = await sequelize.query(`
            SELECT
                COUNT(*) FILTER (WHERE requires_response = TRUE AND responded_at IS NULL) as awaiting_response,
                COUNT(*) FILTER (WHERE requires_response = TRUE AND responded_at IS NULL AND deadline_at < NOW()) as overdue_no_response
            FROM notification_messages
            WHERE sender_id = $1
              AND company_id = $2
              AND is_deleted = FALSE
        `, { bind: [employeeId, companyId] });

        // Notificaciones escaladas (donde el empleado está involucrado)
        const [escalated] = await sequelize.query(`
            SELECT COUNT(*) as escalated_count
            FROM notification_messages
            WHERE (recipient_id = $1 OR sender_id = $1)
              AND company_id = $2
              AND escalation_status = 'escalated'
              AND is_deleted = FALSE
        `, { bind: [employeeId, companyId] });

        const receivedData = received[0] || { pending_responses: 0, overdue_responses: 0, unread_messages: 0 };
        const sentData = sent[0] || { awaiting_response: 0, overdue_no_response: 0 };
        const escalatedData = escalated[0] || { escalated_count: 0 };

        const total_attention_required =
            parseInt(receivedData.pending_responses || 0) +
            parseInt(sentData.overdue_no_response || 0);

        return {
            // Recibidas
            received_pending: parseInt(receivedData.pending_responses || 0),
            received_overdue: parseInt(receivedData.overdue_responses || 0),
            received_unread: parseInt(receivedData.unread_messages || 0),
            // Enviadas
            sent_awaiting: parseInt(sentData.awaiting_response || 0),
            sent_overdue: parseInt(sentData.overdue_no_response || 0),
            // Escaladas
            escalated: parseInt(escalatedData.escalated_count || 0),
            // Total que requiere atención
            total_attention_required,
            // Si hay algo que mostrar
            has_notifications: total_attention_required > 0 || parseInt(receivedData.unread_messages || 0) > 0
        };

    } catch (error) {
        console.error('❌ Error obteniendo badge summary:', error);
        throw error;
    }
}

module.exports = {
    getInbox,
    getGroupMessages,
    createNotificationGroup,
    sendMessage,
    markAsRead,
    closeGroup,
    getInboxStats,
    getEmployeeNotifications,
    getPendingBadgeSummary
};
