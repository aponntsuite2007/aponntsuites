/**
 * NOTIFICATION MODULE COLLECTOR
 * Test Phase4 para el Sistema de Notificaciones con SLA y Escalamiento
 *
 * Incluye:
 * - CRUD completo de notificaciones
 * - Datos reales de empleados
 * - Sistema de SLA y escalamiento
 * - Verificación de filtros por empleado
 * - Escenarios de respuesta/no respuesta
 *
 * @version 2.0
 * @date 2025-12-02
 */

const { sequelize } = require('../../config/database');
const crypto = require('crypto');

class NotificationModuleCollector {
    constructor() {
        this.companyId = 11;
        this.testResults = [];
        this.createdData = {
            groups: [],
            messages: [],
            employees: []
        };
    }

    /**
     * FUENTE ÚNICA DE VERDAD - Datos de empleados reales
     */
    async loadRealEmployees() {
        const [employees] = await sequelize.query(`
            SELECT
                user_id, "employeeId", "firstName", "lastName",
                email, role, company_id, department_id
            FROM users
            WHERE company_id = $1 AND "isActive" = true
            ORDER BY "createdAt"
            LIMIT 10
        `, { bind: [this.companyId] });

        this.createdData.employees = employees;
        console.log(`📋 Empleados cargados: ${employees.length}`);
        return employees;
    }

    /**
     * TEST: Obtener estadísticas iniciales
     */
    async testGetInitialStats() {
        const testName = 'GET_INITIAL_STATS';
        try {
            const [stats] = await sequelize.query(`
                SELECT
                    (SELECT COUNT(*) FROM notification_groups WHERE company_id = $1) as total_groups,
                    (SELECT COUNT(*) FROM notification_messages WHERE company_id = $1) as total_messages,
                    (SELECT COUNT(*) FROM notification_sla_records WHERE company_id = $1) as total_sla_records
            `, { bind: [this.companyId] });

            this.addResult(testName, 'PASSED', 'Estadísticas iniciales obtenidas', stats[0]);
            return { success: true, stats: stats[0] };
        } catch (error) {
            this.addResult(testName, 'FAILED', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * TEST: CREATE - Crear grupo de notificación
     */
    async testCreateNotificationGroup(groupData) {
        const testName = 'CREATE_NOTIFICATION_GROUP';
        try {
            const {
                group_type, initiator_type, initiator_id,
                subject, priority = 'normal', requires_sla = true,
                default_sla_hours = 24, auto_escalate = true
            } = groupData;

            const [result] = await sequelize.query(`
                INSERT INTO notification_groups (
                    group_type, initiator_type, initiator_id, subject,
                    priority, company_id, requires_sla, default_sla_hours,
                    auto_escalate, last_activity_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
                RETURNING *
            `, {
                bind: [
                    group_type, initiator_type, initiator_id, subject,
                    priority, this.companyId, requires_sla, default_sla_hours,
                    auto_escalate
                ]
            });

            const group = result[0];
            this.createdData.groups.push(group);
            this.addResult(testName, 'PASSED', `Grupo creado: ${group.id}`, group);
            return { success: true, group };
        } catch (error) {
            this.addResult(testName, 'FAILED', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * TEST: CREATE - Crear mensaje de notificación
     */
    async testCreateNotificationMessage(messageData) {
        const testName = 'CREATE_NOTIFICATION_MESSAGE';
        try {
            const {
                group_id, sender_type, sender_id, sender_name,
                recipient_type, recipient_id, recipient_name,
                message_type, subject, content,
                requires_response = false, sla_response_hours = 24
            } = messageData;

            // Obtener siguiente número de secuencia
            const [seqResult] = await sequelize.query(`
                SELECT COALESCE(MAX(sequence_number), 0) + 1 as next_seq
                FROM notification_messages WHERE group_id = $1
            `, { bind: [group_id] });

            const sequenceNumber = seqResult[0].next_seq;

            // Generar hash
            const hashContent = `${group_id}|${sequenceNumber}|${sender_id}|${recipient_id}|${content}|${new Date().toISOString()}`;
            const messageHash = crypto.createHash('sha256').update(hashContent).digest('hex');

            // Calcular deadline si requiere respuesta
            const deadline = requires_response
                ? new Date(Date.now() + sla_response_hours * 60 * 60 * 1000)
                : null;

            const [result] = await sequelize.query(`
                INSERT INTO notification_messages (
                    group_id, sequence_number, sender_type, sender_id, sender_name,
                    recipient_type, recipient_id, recipient_name, message_type,
                    subject, content, message_hash, company_id,
                    requires_response, deadline_at, sla_response_hours,
                    recipient_notified_at
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
                    $14, $15, $16, NOW()
                )
                RETURNING *
            `, {
                bind: [
                    group_id, sequenceNumber, sender_type, sender_id, sender_name,
                    recipient_type, recipient_id, recipient_name, message_type,
                    subject, content, messageHash, this.companyId,
                    requires_response, deadline, sla_response_hours
                ]
            });

            const message = result[0];
            this.createdData.messages.push(message);
            this.addResult(testName, 'PASSED', `Mensaje creado: ${message.id}`, message);
            return { success: true, message };
        } catch (error) {
            this.addResult(testName, 'FAILED', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * TEST: READ - Obtener notificaciones por empleado
     */
    async testGetNotificationsByEmployee(employeeId) {
        const testName = 'GET_NOTIFICATIONS_BY_EMPLOYEE';
        try {
            const [notifications] = await sequelize.query(`
                SELECT DISTINCT
                    ng.id, ng.group_type, ng.subject, ng.status, ng.priority,
                    ng.created_at, ng.last_activity_at,
                    COUNT(nm.id) as message_count,
                    COUNT(nm.id) FILTER (WHERE nm.read_at IS NULL AND nm.recipient_id = $1) as unread_count,
                    COUNT(nm.id) FILTER (WHERE nm.requires_response = TRUE AND nm.responded_at IS NULL AND nm.recipient_id = $1) as pending_responses
                FROM notification_groups ng
                LEFT JOIN notification_messages nm ON nm.group_id = ng.id
                WHERE ng.company_id = $2
                  AND (
                      ng.initiator_id = $1
                      OR EXISTS (
                          SELECT 1 FROM notification_messages m
                          WHERE m.group_id = ng.id AND (m.recipient_id = $1 OR m.sender_id = $1)
                      )
                  )
                GROUP BY ng.id
                ORDER BY ng.last_activity_at DESC NULLS LAST
            `, { bind: [employeeId, this.companyId] });

            this.addResult(testName, 'PASSED', `Notificaciones de ${employeeId}: ${notifications.length}`, notifications);
            return { success: true, notifications, count: notifications.length };
        } catch (error) {
            this.addResult(testName, 'FAILED', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * TEST: READ - Obtener mensajes de un grupo
     */
    async testGetGroupMessages(groupId) {
        const testName = 'GET_GROUP_MESSAGES';
        try {
            const [messages] = await sequelize.query(`
                SELECT
                    id, sequence_number, sender_name, recipient_name,
                    message_type, content, created_at, read_at, responded_at,
                    requires_response, deadline_at, sla_breach, escalation_status
                FROM notification_messages
                WHERE group_id = $1
                ORDER BY sequence_number ASC
            `, { bind: [groupId] });

            this.addResult(testName, 'PASSED', `Mensajes en grupo: ${messages.length}`, messages);
            return { success: true, messages };
        } catch (error) {
            this.addResult(testName, 'FAILED', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * TEST: UPDATE - Marcar mensaje como leído
     */
    async testMarkAsRead(messageId, employeeId) {
        const testName = 'UPDATE_MARK_AS_READ';
        try {
            await sequelize.query(`
                UPDATE notification_messages
                SET read_at = NOW()
                WHERE id = $1 AND recipient_id = $2 AND read_at IS NULL
            `, { bind: [messageId, employeeId] });

            this.addResult(testName, 'PASSED', `Mensaje ${messageId} marcado como leído`);
            return { success: true };
        } catch (error) {
            this.addResult(testName, 'FAILED', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * TEST: UPDATE - Responder a mensaje (actualizar responded_at)
     */
    async testRespondToMessage(messageId, employeeId, responseContent) {
        const testName = 'UPDATE_RESPOND_TO_MESSAGE';
        try {
            // Marcar mensaje original como respondido
            await sequelize.query(`
                UPDATE notification_messages
                SET responded_at = NOW(),
                    sender_notified_response = TRUE,
                    sender_notified_at = NOW()
                WHERE id = $1 AND recipient_id = $2
            `, { bind: [messageId, employeeId] });

            // Registrar cumplimiento de SLA
            const [originalMsg] = await sequelize.query(`
                SELECT * FROM notification_messages WHERE id = $1
            `, { bind: [messageId] });

            if (originalMsg.length > 0) {
                const msg = originalMsg[0];
                const slaMet = !msg.deadline_at || new Date() <= new Date(msg.deadline_at);
                const breachMinutes = !slaMet
                    ? Math.round((new Date() - new Date(msg.deadline_at)) / 60000)
                    : 0;

                await sequelize.query(`
                    INSERT INTO notification_sla_records (
                        message_id, employee_id, company_id, sla_type,
                        expected_response_at, actual_response_at, sla_met,
                        breach_minutes
                    ) VALUES ($1, $2, $3, 'response_required', $4, NOW(), $5, $6)
                `, {
                    bind: [messageId, employeeId, this.companyId, msg.deadline_at, slaMet, breachMinutes]
                });
            }

            this.addResult(testName, 'PASSED', `Respuesta registrada para mensaje ${messageId}`);
            return { success: true };
        } catch (error) {
            this.addResult(testName, 'FAILED', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * TEST: UPDATE - Simular incumplimiento de SLA
     */
    async testSimulateSLABreach(messageId) {
        const testName = 'UPDATE_SLA_BREACH';
        try {
            // Marcar mensaje como con incumplimiento de SLA
            await sequelize.query(`
                UPDATE notification_messages
                SET sla_breach = TRUE,
                    sla_breach_at = NOW(),
                    escalation_status = 'pending'
                WHERE id = $1
            `, { bind: [messageId] });

            this.addResult(testName, 'PASSED', `SLA breach simulado para mensaje ${messageId}`);
            return { success: true };
        } catch (error) {
            this.addResult(testName, 'FAILED', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * TEST: UPDATE - Escalar mensaje
     */
    async testEscalateMessage(messageId, escalateTo, level) {
        const testName = 'UPDATE_ESCALATE_MESSAGE';
        try {
            await sequelize.query(`
                UPDATE notification_messages
                SET escalation_status = 'escalated',
                    escalation_level = $2,
                    escalated_to_id = $3,
                    escalated_at = NOW(),
                    impact_on_evaluation = TRUE,
                    evaluation_score_impact = -2.00
                WHERE id = $1
            `, { bind: [messageId, level, escalateTo] });

            // Actualizar contador en grupo
            const [msg] = await sequelize.query(`SELECT group_id FROM notification_messages WHERE id = $1`, { bind: [messageId] });
            if (msg.length > 0) {
                await sequelize.query(`
                    UPDATE notification_groups SET total_escalations = total_escalations + 1 WHERE id = $1
                `, { bind: [msg[0].group_id] });
            }

            this.addResult(testName, 'PASSED', `Mensaje ${messageId} escalado a ${escalateTo} nivel ${level}`);
            return { success: true };
        } catch (error) {
            this.addResult(testName, 'FAILED', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * TEST: UPDATE - Registrar descargo
     */
    async testFileDischarge(messageId, employeeId, reason) {
        const testName = 'UPDATE_FILE_DISCHARGE';
        try {
            await sequelize.query(`
                UPDATE notification_messages
                SET discharge_reason = $2,
                    discharge_at = NOW(),
                    escalation_status = 'discharged'
                WHERE id = $1 AND recipient_id = $3
            `, { bind: [messageId, reason, employeeId] });

            this.addResult(testName, 'PASSED', `Descargo registrado para mensaje ${messageId}`);
            return { success: true };
        } catch (error) {
            this.addResult(testName, 'FAILED', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * TEST: DELETE - Cerrar grupo de notificación
     */
    async testCloseNotificationGroup(groupId, closedBy) {
        const testName = 'DELETE_CLOSE_GROUP';
        try {
            await sequelize.query(`
                UPDATE notification_groups
                SET status = 'closed',
                    closed_at = NOW(),
                    closed_by = $2
                WHERE id = $1 AND company_id = $3
            `, { bind: [groupId, closedBy, this.companyId] });

            this.addResult(testName, 'PASSED', `Grupo ${groupId} cerrado por ${closedBy}`);
            return { success: true };
        } catch (error) {
            this.addResult(testName, 'FAILED', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * TEST: Verificar SLA Score de empleado
     */
    async testGetEmployeeSLAScore(employeeId) {
        const testName = 'GET_EMPLOYEE_SLA_SCORE';
        try {
            const [score] = await sequelize.query(`
                SELECT * FROM get_employee_sla_score($1, $2)
            `, { bind: [employeeId, this.companyId] });

            this.addResult(testName, 'PASSED', `SLA Score de ${employeeId}`, score[0]);
            return { success: true, score: score[0] };
        } catch (error) {
            this.addResult(testName, 'FAILED', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * TEST: Obtener pendientes del empleado (para globo flotante)
     */
    async testGetPendingForEmployee(employeeId) {
        const testName = 'GET_PENDING_FOR_EMPLOYEE';
        try {
            const [pending] = await sequelize.query(`
                SELECT * FROM get_pending_notifications_for_employee($1, $2)
            `, { bind: [employeeId, this.companyId] });

            const [sent] = await sequelize.query(`
                SELECT * FROM v_sent_notifications_awaiting_response
                WHERE employee_id = $1 AND company_id = $2
            `, { bind: [employeeId, this.companyId] });

            const result = {
                receivedPending: pending,
                sentAwaiting: sent[0] || { awaiting_response: 0, overdue_no_response: 0 }
            };

            this.addResult(testName, 'PASSED', `Pendientes de ${employeeId}`, result);
            return { success: true, ...result };
        } catch (error) {
            this.addResult(testName, 'FAILED', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Agregar resultado al log
     */
    addResult(testName, status, message, data = null) {
        this.testResults.push({
            test: testName,
            status,
            message,
            data,
            timestamp: new Date().toISOString()
        });
        console.log(`${status === 'PASSED' ? '✅' : '❌'} [${testName}] ${message}`);
    }

    /**
     * EJECUTAR TODOS LOS TESTS con escenarios reales
     */
    async runAllTests() {
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('  PHASE4 TEST: Sistema de Notificaciones con SLA y Escalamiento');
        console.log('═══════════════════════════════════════════════════════════════\n');

        // 1. Cargar empleados reales
        const employees = await this.loadRealEmployees();
        if (employees.length < 2) {
            console.error('❌ Se necesitan al menos 2 empleados para ejecutar los tests');
            return { success: false, error: 'Insufficient employees' };
        }

        const admin = employees.find(e => e.role === 'admin') || employees[0];
        const emp1 = employees.find(e => e.role !== 'admin') || employees[1];
        const emp2 = employees.length > 2 ? employees[2] : emp1;

        console.log(`\n👤 Admin: ${admin.firstName} ${admin.lastName} (${admin.employeeId})`);
        console.log(`👤 Empleado 1: ${emp1.firstName} ${emp1.lastName} (${emp1.employeeId})`);
        console.log(`👤 Empleado 2: ${emp2.firstName} ${emp2.lastName} (${emp2.employeeId})\n`);

        // 2. Stats iniciales
        await this.testGetInitialStats();

        // 3. ESCENARIO 1: Admin envía solicitud de vacaciones a Juan
        console.log('\n📋 ESCENARIO 1: Solicitud de vacaciones (Admin → Juan)\n');

        const group1 = await this.testCreateNotificationGroup({
            group_type: 'vacation_request',
            initiator_type: 'employee',
            initiator_id: admin.employeeId,
            subject: `Solicitud de Vacaciones - ${admin.firstName} ${admin.lastName}`,
            priority: 'medium',
            default_sla_hours: 48
        });

        if (group1.success) {
            const msg1 = await this.testCreateNotificationMessage({
                group_id: group1.group.id,
                sender_type: 'employee',
                sender_id: admin.employeeId,
                sender_name: `${admin.firstName} ${admin.lastName}`,
                recipient_type: 'employee',
                recipient_id: emp1.employeeId,
                recipient_name: `${emp1.firstName} ${emp1.lastName}`,
                message_type: 'vacation_request',
                subject: 'Solicitud de vacaciones',
                content: 'Solicito 5 días de vacaciones del 15 al 20 de diciembre. Por favor aprobar.',
                requires_response: true,
                sla_response_hours: 48
            });

            // Juan lee y responde a tiempo
            if (msg1.success) {
                await this.testMarkAsRead(msg1.message.id, emp1.employeeId);
                await this.testRespondToMessage(msg1.message.id, emp1.employeeId, 'Aprobado');
            }
        }

        // 4. ESCENARIO 2: María envía solicitud que NO es respondida (SLA breach)
        console.log('\n📋 ESCENARIO 2: Llegada tarde sin respuesta (Sistema → María)\n');

        const group2 = await this.testCreateNotificationGroup({
            group_type: 'late_arrival',
            initiator_type: 'system',
            initiator_id: 'attendance_system',
            subject: `Llegada Tardía - ${emp2.firstName} ${emp2.lastName}`,
            priority: 'high',
            default_sla_hours: 8
        });

        if (group2.success) {
            const msg2 = await this.testCreateNotificationMessage({
                group_id: group2.group.id,
                sender_type: 'system',
                sender_id: 'attendance_system',
                sender_name: 'Sistema de Asistencia',
                recipient_type: 'employee',
                recipient_id: emp2.employeeId,
                recipient_name: `${emp2.firstName} ${emp2.lastName}`,
                message_type: 'late_arrival_notice',
                subject: 'Justificación requerida',
                content: `Se registró llegada tardía de 30 minutos el día ${new Date().toLocaleDateString()}. Se requiere justificación.`,
                requires_response: true,
                sla_response_hours: 8
            });

            // María NO responde - Simular breach y escalamiento
            if (msg2.success) {
                await this.testSimulateSLABreach(msg2.message.id);
                await this.testEscalateMessage(msg2.message.id, 'rrhh', 1);

                // María hace descargo (pero el hilo ya escaló)
                await this.testFileDischarge(
                    msg2.message.id,
                    emp2.employeeId,
                    'Hubo un accidente en la ruta. Adjunto foto del embotellamiento.'
                );
            }
        }

        // 5. ESCENARIO 3: Solicitud de horas extra aprobada
        console.log('\n📋 ESCENARIO 3: Solicitud de horas extra\n');

        const group3 = await this.testCreateNotificationGroup({
            group_type: 'overtime_request',
            initiator_type: 'employee',
            initiator_id: emp1.employeeId,
            subject: `Solicitud Horas Extra - ${emp1.firstName}`,
            priority: 'normal'
        });

        if (group3.success) {
            await this.testCreateNotificationMessage({
                group_id: group3.group.id,
                sender_type: 'employee',
                sender_id: emp1.employeeId,
                sender_name: `${emp1.firstName} ${emp1.lastName}`,
                recipient_type: 'role',
                recipient_id: admin.employeeId,
                recipient_name: 'Administrador',
                message_type: 'overtime_request',
                subject: 'Necesito 4 horas extra',
                content: 'Solicito autorización para trabajar 4 horas extra el viernes para completar el informe mensual.',
                requires_response: true,
                sla_response_hours: 12
            });
        }

        // 6. Verificar filtros por empleado
        console.log('\n📋 VERIFICACIÓN DE FILTROS POR EMPLEADO\n');

        await this.testGetNotificationsByEmployee(admin.employeeId);
        await this.testGetNotificationsByEmployee(emp1.employeeId);
        await this.testGetNotificationsByEmployee(emp2.employeeId);

        // 7. Verificar SLA Scores
        console.log('\n📊 SLA SCORES\n');

        await this.testGetEmployeeSLAScore(emp1.employeeId);
        await this.testGetEmployeeSLAScore(emp2.employeeId);

        // 8. Verificar pendientes para globo flotante
        console.log('\n🔔 PENDIENTES PARA GLOBO FLOTANTE\n');

        await this.testGetPendingForEmployee(admin.employeeId);
        await this.testGetPendingForEmployee(emp1.employeeId);
        await this.testGetPendingForEmployee(emp2.employeeId);

        // 9. Stats finales
        console.log('\n📈 ESTADÍSTICAS FINALES\n');
        await this.testGetInitialStats();

        // Resumen
        const passed = this.testResults.filter(r => r.status === 'PASSED').length;
        const failed = this.testResults.filter(r => r.status === 'FAILED').length;

        console.log('\n═══════════════════════════════════════════════════════════════');
        console.log(`  RESUMEN: ${passed} PASSED | ${failed} FAILED`);
        console.log('═══════════════════════════════════════════════════════════════\n');

        return {
            success: failed === 0,
            passed,
            failed,
            results: this.testResults,
            createdData: this.createdData
        };
    }

    /**
     * Limpiar datos de prueba
     */
    async cleanup() {
        console.log('\n🧹 Limpiando datos de prueba...\n');

        for (const group of this.createdData.groups) {
            await sequelize.query('DELETE FROM notification_groups WHERE id = $1', { bind: [group.id] });
        }

        console.log(`   ✅ ${this.createdData.groups.length} grupos eliminados`);
        this.createdData = { groups: [], messages: [], employees: [] };
    }
}

module.exports = NotificationModuleCollector;
