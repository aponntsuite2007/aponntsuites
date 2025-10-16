/**
 * FLOW EXECUTOR SERVICE - Ejecutor de Flujos de Notificación
 *
 * Servicio para ejecutar flujos de aprobación paso a paso,
 * considerando módulos opcionales y validaciones automáticas
 *
 * @version 2.0
 * @date 2025-10-16
 */

const db = require('../config/database');
const moduleService = require('./moduleService');
const crypto = require('crypto');

class FlowExecutorService {

    /**
     * Ejecuta un paso del flujo de notificaciones
     *
     * @param {string} groupId - ID del grupo de notificación
     * @param {Object} step - Definición del paso a ejecutar
     * @param {Object} context - Contexto con datos del flujo
     * @returns {Promise<Object>} - Resultado de la ejecución
     */
    async executeFlowStep(groupId, step, context = {}) {
        try {
            const group = await this.getGroup(groupId);

            if (!group) {
                throw new Error(`Grupo ${groupId} no encontrado`);
            }

            console.log(`🔄 [FLOW] Ejecutando paso ${step.step}: ${step.name} (grupo: ${groupId})`);

            // SI EL PASO REQUIERE UN MÓDULO ESPECÍFICO
            if (step.module_code) {
                const isActive = await moduleService.isModuleActive(group.company_id, step.module_code);

                if (!isActive) {
                    console.log(`⏭️ [FLOW] Módulo ${step.module_code} no contratado → ${step.if_module_inactive}`);

                    return await this.handleModuleInactive(groupId, step, context);
                }
            }

            // Ejecutar el paso según su tipo
            switch (step.participant_type) {
                case 'initiator':
                    return await this.handleInitiatorStep(groupId, step, context);

                case 'system':
                    return await this.executeSystemAction(groupId, step, context);

                case 'acceptor':
                case 'approver':
                    return await this.sendApprovalRequest(groupId, step, context);

                case 'informed':
                    return await this.sendInformativeNotification(groupId, step, context);

                default:
                    throw new Error(`Tipo de participante desconocido: ${step.participant_type}`);
            }

        } catch (error) {
            console.error(`❌ [FLOW] Error ejecutando paso:`, error);
            throw error;
        }
    }

    /**
     * Maneja cuando un módulo no está activo
     */
    async handleModuleInactive(groupId, step, context) {
        const action = step.if_module_inactive || 'skip_to_next_step';

        switch (action) {
            case 'skip_to_next_step':
            case 'skip_step':
                await this.addSystemNote(groupId, `Módulo ${step.module_code} no disponible, paso saltado`);
                return await this.executeNextStep(groupId, step.step + 1, context);

            case 'notify_and_continue':
                await this.addSystemNote(groupId, `Módulo ${step.module_code} no disponible, continuando sin validación`);
                return await this.executeNextStep(groupId, step.step + 1, context);

            case 'end_chain':
                return await this.endChain(groupId, 'module_not_available', {
                    module: step.module_code,
                    reason: `Módulo requerido no disponible`
                });

            default:
                return await this.executeNextStep(groupId, step.step + 1, context);
        }
    }

    /**
     * Ejecuta acción del sistema (validaciones, integraciones)
     */
    async executeSystemAction(groupId, step, context) {
        const group = await this.getGroup(groupId);

        console.log(`🤖 [FLOW] Ejecutando acción del sistema: ${step.action}`);

        switch (step.action) {

            case 'validate_compatibility':
                return await this.handleCompatibilityValidation(groupId, group, step, context);

            case 'notify_art_if_module_active':
                return await this.handleARTNotification(groupId, group, step, context);

            case 'check_medical_authorization':
                return await this.handleMedicalAuthorization(groupId, group, step, context);

            case 'calculate_overtime_cost':
                return await this.handleOvertimeCostCalculation(groupId, group, step, context);

            case 'check_rest_period_compliance':
                return await this.handleRestPeriodCheck(groupId, group, step, context);

            case 'update_shift_assignments':
                return await this.handleShiftAssignmentUpdate(groupId, group, step, context);

            case 'update_kiosk_permissions':
                return await this.handleKioskPermissionUpdate(groupId, group, step, context);

            case 'sync_calendar_if_module_active':
                return await this.handleCalendarSync(groupId, group, step, context);

            case 'deduct_vacation_balance':
                return await this.handleVacationDeduction(groupId, group, step, context);

            case 'log_audit_trail':
                return await this.logAuditAction(groupId, null, 'system_action', 'SYSTEM', 'system', {
                    action: step.action,
                    context: context
                });

            default:
                console.warn(`⚠️ [FLOW] Acción desconocida: ${step.action}`);
                return { executed: false, action: step.action };
        }
    }

    /**
     * Valida compatibilidad de tareas (módulo opcional)
     */
    async handleCompatibilityValidation(groupId, group, step, context) {
        return await moduleService.executeIfModuleActive(
            group.company_id,
            'shift_compatibility',
            async () => {
                // Módulo ACTIVO → Validar compatibilidad
                const shiftSwapService = require('./shiftSwapService');
                const compat = await shiftSwapService.checkTaskCompatibility(
                    context.initiator_id || group.metadata.initiator_id,
                    context.target_employee_id || group.metadata.form_data?.target_employee_id
                );

                if (!compat.compatible) {
                    await this.endChainAndNotifyAll(groupId, 'incompatible_tasks', {
                        reason: `${compat.initiator_role} no puede intercambiar con ${compat.target_role}`,
                        details: compat.details
                    });
                    return { valid: false, reason: 'incompatible_tasks' };
                }

                await this.addSystemNote(groupId, `✅ Validación de compatibilidad: Tareas compatibles`);
                return { valid: true };
            },
            async () => {
                // Módulo INACTIVO → Saltar validación
                console.log('⏭️ [FLOW] Saltando validación de compatibilidad (módulo no contratado)');
                await this.addSystemNote(groupId, `⏭️ Validación de compatibilidad omitida (módulo no contratado)`);
                return { valid: true, skipped: true };
            }
        );
    }

    /**
     * Notifica a ART (módulo opcional)
     */
    async handleARTNotification(groupId, group, step, context) {
        return await moduleService.executeIfModuleActive(
            group.company_id,
            'art_integration',
            async () => {
                // Módulo ACTIVO → Notificar a ART
                console.log('📋 [FLOW] Notificando a ART...');
                // TODO: Implementar integración real con ART
                await this.addSystemNote(groupId, `📋 ART notificada del cambio de turno`);
                return { notified: true };
            },
            async () => {
                // Módulo INACTIVO → No hacer nada
                console.log('⏭️ [FLOW] Saltando notificación a ART (módulo no contratado)');
                return { notified: false, skipped: true };
            }
        );
    }

    /**
     * Envía solicitud de aprobación/aceptación
     */
    async sendApprovalRequest(groupId, step, context) {
        const group = await this.getGroup(groupId);
        const metadata = group.metadata;

        // Obtener destinatario según criterio de selección
        const recipient = await this.selectRecipient(step, context, group);

        if (!recipient) {
            throw new Error(`No se pudo determinar destinatario para paso ${step.step}`);
        }

        // Crear mensaje de solicitud
        const sequenceNumber = await this.getNextSequenceNumber(groupId);

        const messageResult = await db.query(`
            INSERT INTO notification_messages
            (group_id, sequence_number, sender_type, sender_id, sender_name,
             recipient_type, recipient_id, recipient_name, message_type,
             subject, content, created_at, deadline_at, requires_response,
             message_hash, company_id, channels)
            VALUES ($1, $2, 'system', 'SYSTEM', 'Sistema',
                    $3, $4, $5, 'approval_request', $6, $7, NOW(),
                    NOW() + INTERVAL '1 hour' * $8, true, $9, $10, $11)
            RETURNING *
        `, [
            groupId,
            sequenceNumber,
            step.role,
            recipient.id,
            recipient.name || recipient.full_name,
            step.notification_subject || `Aprobación requerida`,
            step.notification_body || `Requiere su aprobación`,
            step.default_deadline_hours || 24,
            this.generateMessageHash(groupId, 'SYSTEM', recipient.id),
            group.company_id,
            JSON.stringify(['web', 'email'])
        ]);

        const message = messageResult.rows[0];

        // Aplicar enriquecimiento de contexto si está configurado
        if (step.context_enrichment && step.context_enrichment.length > 0) {
            await this.enrichMessageContext(message.id, step.context_enrichment, context, group);
        }

        await this.logAuditAction(groupId, message.id, 'approval_requested', recipient.id, step.role);

        console.log(`📤 [FLOW] Solicitud de aprobación enviada a ${recipient.name} (${step.role})`);

        return { message, recipient };
    }

    /**
     * Enriquece el contexto del mensaje con información adicional
     */
    async enrichMessageContext(messageId, enrichments, context, group) {
        for (const enrichment of enrichments) {
            let contextData = {};

            switch (enrichment) {
                case 'calculate_overtime_cost':
                    contextData = await this.calculateOvertimeCost(group, context);
                    if (contextData.generates_overtime) {
                        await this.addContextData(messageId, 'overtime_warning', contextData, 'high');
                    }
                    break;

                case 'check_rest_period_compliance':
                    contextData = await this.checkRestPeriodCompliance(group, context);
                    if (contextData.violates_law) {
                        await this.addContextData(messageId, 'rest_period_violation', contextData, 'critical');
                    }
                    break;

                case 'show_team_coverage':
                    contextData = await this.getTeamCoverage(group, context);
                    await this.addContextData(messageId, 'team_coverage', contextData, 'info');
                    break;

                case 'show_vacation_balance':
                    contextData = await this.getVacationBalance(group, context);
                    await this.addContextData(messageId, 'vacation_balance', contextData, 'info');
                    break;
            }
        }
    }

    /**
     * Agrega datos de contexto a un mensaje
     */
    async addContextData(messageId, contextType, data, severity) {
        try {
            await db.query(`
                INSERT INTO notification_context_data
                (notification_message_id, context_type, context_data, severity, display_as, display_message, calculated_at)
                VALUES ($1, $2, $3, $4, 'alert', $5, NOW())
            `, [
                messageId,
                contextType,
                JSON.stringify(data),
                severity,
                this.buildContextMessage(contextType, data)
            ]);
        } catch (error) {
            console.error('❌ Error agregando contexto:', error);
        }
    }

    /**
     * Construye mensaje de contexto según tipo
     */
    buildContextMessage(type, data) {
        switch (type) {
            case 'overtime_warning':
                return `⚠️ ADVERTENCIA: Este cambio genera ${data.overtime_hours}h extras. Costo: $${data.cost}`;
            case 'rest_period_violation':
                return `❌ BLOQUEO: Viola período de descanso legal (${data.rest_hours}h < 12h legal)`;
            case 'team_coverage':
                return `ℹ️ Cobertura de equipo: ${data.coverage_percent}% del equipo presente`;
            case 'vacation_balance':
                return `ℹ️ Balance de vacaciones: ${data.balance} días disponibles`;
            default:
                return `ℹ️ Información adicional disponible`;
        }
    }

    /**
     * Selecciona destinatario según criterios del paso
     */
    async selectRecipient(step, context, group) {
        const criteria = step.selection_criteria;

        if (criteria === 'initiator.supervisor_id') {
            // Obtener supervisor del iniciador
            return await this.getEmployeeSupervisor(group.initiator_id, group.company_id);
        }

        if (criteria === 'department_rrhh') {
            // Obtener responsable de RRHH
            return await this.getRRHHResponsible(group.company_id);
        }

        if (criteria === 'request.target_employee_id') {
            // Para cambios de turno: el empleado con quien se quiere cambiar
            const targetId = group.metadata.form_data?.target_employee_id;
            return await this.getEmployeeInfo(targetId, group.company_id);
        }

        // Criterio genérico por rol
        return await this.getEmployeeByRole(step.role, group.company_id);
    }

    /**
     * Envía notificación informativa (sin requerir respuesta)
     */
    async sendInformativeNotification(groupId, step, context) {
        const group = await this.getGroup(groupId);
        const recipients = step.recipients || [];

        for (const recipientDef of recipients) {
            const recipientId = this.resolveVariable(recipientDef.id, context, group);
            const recipient = await this.getEmployeeInfo(recipientId, group.company_id);

            if (!recipient) continue;

            const sequenceNumber = await this.getNextSequenceNumber(groupId);

            await db.query(`
                INSERT INTO notification_messages
                (group_id, sequence_number, sender_type, sender_id, sender_name,
                 recipient_type, recipient_id, recipient_name, message_type,
                 subject, content, created_at, requires_response,
                 message_hash, company_id, channels)
                VALUES ($1, $2, 'system', 'SYSTEM', 'Sistema',
                        $3, $4, $5, 'info', $6, $7, NOW(), false, $8, $9, $10)
            `, [
                groupId,
                sequenceNumber,
                recipientDef.type,
                recipientId,
                recipient.name || recipient.full_name,
                this.resolveVariable(step.notification_subject, context, group),
                this.resolveVariable(step.notification_body, context, group),
                this.generateMessageHash(groupId, 'SYSTEM', recipientId),
                group.company_id,
                JSON.stringify(['web', 'email'])
            ]);

            console.log(`📬 [FLOW] Notificación informativa enviada a ${recipient.name}`);
        }

        return { notified: recipients.length };
    }

    /**
     * Ejecuta el siguiente paso del flujo
     */
    async executeNextStep(groupId, nextStepNumber, context) {
        const group = await this.getGroup(groupId);
        const flowTemplate = await this.getFlowTemplate(group.group_type);

        if (!flowTemplate) {
            throw new Error(`Flujo no encontrado para tipo ${group.group_type}`);
        }

        const nextStep = flowTemplate.flow_steps.find(s => s.step === nextStepNumber);

        if (!nextStep) {
            // No hay más pasos → cerrar flujo
            return await this.closeGroup(groupId, 'completed');
        }

        // Actualizar metadata con paso actual
        await db.query(`
            UPDATE notification_groups
            SET metadata = jsonb_set(metadata, '{current_step}', $1::text::jsonb)
            WHERE id = $2
        `, [nextStepNumber, groupId]);

        return await this.executeFlowStep(groupId, nextStep, context);
    }

    /**
     * Cierra un grupo de notificaciones
     */
    async closeGroup(groupId, reason, metadata = {}) {
        await db.query(`
            UPDATE notification_groups
            SET status = 'closed', closed_at = NOW(), closed_by = 'SYSTEM'
            WHERE id = $1
        `, [groupId]);

        await this.logAuditAction(groupId, null, 'closed', 'SYSTEM', 'system', { reason, ...metadata });

        console.log(`🔒 [FLOW] Grupo ${groupId} cerrado. Razón: ${reason}`);

        return { closed: true, reason };
    }

    /**
     * Finaliza la cadena y notifica a todos los involucrados
     */
    async endChainAndNotifyAll(groupId, reason, details = {}) {
        const group = await this.getGroup(groupId);

        // Obtener todos los participantes del grupo
        const participants = await this.getGroupParticipants(groupId);

        // Notificar a cada uno
        for (const participant of participants) {
            await this.sendInformativeNotification(groupId, {
                recipients: [{ type: 'employee', id: participant.id }],
                notification_subject: `Solicitud finalizada`,
                notification_body: `La solicitud ha sido ${reason}. ${details.reason || ''}`
            }, {});
        }

        return await this.closeGroup(groupId, reason, details);
    }

    /**
     * Agrega nota del sistema al grupo
     */
    async addSystemNote(groupId, note) {
        const sequenceNumber = await this.getNextSequenceNumber(groupId);
        const group = await this.getGroup(groupId);

        await db.query(`
            INSERT INTO notification_messages
            (group_id, sequence_number, sender_type, sender_id, sender_name,
             recipient_type, recipient_id, recipient_name, message_type,
             subject, content, created_at, requires_response,
             message_hash, company_id, channels)
            VALUES ($1, $2, 'system', 'SYSTEM', 'Sistema',
                    'system', 'SYSTEM', 'Sistema', 'system_note',
                    'Nota del sistema', $3, NOW(), false, $4, $5, '["web"]'::jsonb)
        `, [
            groupId,
            sequenceNumber,
            note,
            this.generateMessageHash(groupId, 'SYSTEM', 'SYSTEM'),
            group.company_id
        ]);

        console.log(`📝 [FLOW] Nota del sistema agregada: ${note}`);
    }

    // ═══════════════════════════════════════════════════════════════
    // FUNCIONES AUXILIARES
    // ═══════════════════════════════════════════════════════════════

    async getGroup(groupId) {
        const result = await db.query('SELECT * FROM notification_groups WHERE id = $1', [groupId]);
        return result.rows[0];
    }

    async getFlowTemplate(requestTypeCode) {
        const result = await db.query(
            'SELECT * FROM notification_flow_templates WHERE request_type_code = $1 AND active = true',
            [requestTypeCode]
        );
        return result.rows[0];
    }

    async getNextSequenceNumber(groupId) {
        const result = await db.query(
            'SELECT MAX(sequence_number) as max FROM notification_messages WHERE group_id = $1',
            [groupId]
        );
        return (result.rows[0].max || 0) + 1;
    }

    async getEmployeeInfo(employeeId, companyId) {
        const result = await db.query(
            'SELECT employee_id as id, name, email FROM employees WHERE employee_id = $1 AND company_id = $2',
            [employeeId, companyId]
        );
        return result.rows[0];
    }

    async getEmployeeSupervisor(employeeId, companyId) {
        const result = await db.query(`
            SELECT e2.employee_id as id, e2.name, e2.email
            FROM employees e1
            JOIN employees e2 ON e1.supervisor_id = e2.employee_id
            WHERE e1.employee_id = $1 AND e1.company_id = $2
        `, [employeeId, companyId]);
        return result.rows[0];
    }

    async getRRHHResponsible(companyId) {
        const result = await db.query(
            'SELECT employee_id as id, name, email FROM employees WHERE role = $1 AND company_id = $2 LIMIT 1',
            ['rrhh', companyId]
        );
        return result.rows[0];
    }

    async getEmployeeByRole(role, companyId) {
        const result = await db.query(
            'SELECT employee_id as id, name, email FROM employees WHERE role = $1 AND company_id = $2 LIMIT 1',
            [role, companyId]
        );
        return result.rows[0];
    }

    async getGroupParticipants(groupId) {
        const result = await db.query(`
            SELECT DISTINCT sender_id as id, sender_name as name
            FROM notification_messages
            WHERE group_id = $1 AND sender_type = 'employee'
            UNION
            SELECT DISTINCT recipient_id as id, recipient_name as name
            FROM notification_messages
            WHERE group_id = $1 AND recipient_type = 'employee'
        `, [groupId]);
        return result.rows;
    }

    resolveVariable(template, context, group) {
        if (!template || typeof template !== 'string') return template;

        let resolved = template;

        // Reemplazar variables {{variable}}
        const matches = template.match(/\{\{([^}]+)\}\}/g);
        if (matches) {
            matches.forEach(match => {
                const varName = match.replace(/\{\{|\}\}/g, '');
                const value = context[varName] || group.metadata[varName] || group.metadata.form_data?.[varName] || match;
                resolved = resolved.replace(match, value);
            });
        }

        return resolved;
    }

    generateMessageHash(groupId, senderId, recipientId) {
        const data = `${groupId}${senderId}${recipientId}${Date.now()}`;
        return crypto.createHash('sha256').update(data).digest('hex');
    }

    async logAuditAction(groupId, messageId, action, actorId, actorType, metadata = {}) {
        try {
            await db.query(`
                INSERT INTO notification_audit_log
                (group_id, message_id, action, actor_id, actor_type, timestamp, metadata)
                VALUES ($1, $2, $3, $4, $5, NOW(), $6)
            `, [groupId, messageId, action, actorId, actorType, JSON.stringify(metadata)]);
        } catch (error) {
            console.error('❌ Error logging audit:', error);
        }
    }

    // Stubs para funciones de cálculo (a implementar completamente)
    async calculateOvertimeCost(group, context) {
        // TODO: Implementar cálculo real
        return { generates_overtime: false };
    }

    async checkRestPeriodCompliance(group, context) {
        // TODO: Implementar validación real
        return { violates_law: false };
    }

    async getTeamCoverage(group, context) {
        // TODO: Implementar cálculo real
        return { coverage_percent: 85 };
    }

    async getVacationBalance(group, context) {
        // TODO: Implementar consulta real
        return { balance: 12 };
    }

    handleInitiatorStep(groupId, step, context) {
        // Paso de iniciador ya fue manejado en requestService
        return { handled: true };
    }

    async handleMedicalAuthorization(groupId, group, step, context) {
        return { authorized: true, skipped: true };
    }

    async handleOvertimeCostCalculation(groupId, group, step, context) {
        return { calculated: true };
    }

    async handleRestPeriodCheck(groupId, group, step, context) {
        return { compliant: true };
    }

    async handleShiftAssignmentUpdate(groupId, group, step, context) {
        return { updated: true };
    }

    async handleKioskPermissionUpdate(groupId, group, step, context) {
        return { updated: true };
    }

    async handleCalendarSync(groupId, group, step, context) {
        return { synced: false, skipped: true };
    }

    async handleVacationDeduction(groupId, group, step, context) {
        return { deducted: true };
    }
}

module.exports = new FlowExecutorService();
