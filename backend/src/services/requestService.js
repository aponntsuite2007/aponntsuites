/**
 * REQUEST SERVICE - Gestión de Solicitudes Estructuradas
 *
 * Servicio para crear y gestionar solicitudes con formularios dinámicos,
 * validaciones de negocio, routing automático y flujos de aprobación
 *
 * @version 2.0
 * @date 2025-10-16
 */

const db = require('../config/database');
const moduleService = require('./moduleService');
const crypto = require('crypto');

class RequestService {

    /**
     * Crea una solicitud estructurada
     *
     * @param {string} employeeId - ID del empleado solicitante
     * @param {string} requestTypeCode - Código del tipo de solicitud
     * @param {Object} formData - Datos del formulario
     * @param {number} companyId - ID de la empresa
     * @returns {Promise<Object>} - Grupo de notificación creado
     */
    async createRequest(employeeId, requestTypeCode, formData, companyId) {
        try {
            // 1. Obtener configuración del tipo de solicitud
            const requestType = await this.getRequestType(requestTypeCode);

            if (!requestType || !requestType.active) {
                throw new Error(`Tipo de solicitud "${requestTypeCode}" no válido o inactivo`);
            }

            // 2. Validar formulario contra form_fields
            await this.validateFormData(formData, requestType.form_fields);

            // 3. Aplicar validaciones de negocio
            await this.applyValidationRules(employeeId, formData, requestType.validation_rules, companyId);

            // 4. Determinar routing (quién aprueba primero)
            const approvalChain = requestType.approval_chain;
            const firstApprover = approvalChain[0];

            // 5. Obtener el aprobador específico del empleado
            const approver = await this.getApproverForEmployee(
                employeeId,
                firstApprover.role,
                companyId
            );

            if (!approver) {
                throw new Error(`No se encontró aprobador para rol "${firstApprover.role}"`);
            }

            // 6. Crear grupo de notificación
            const groupResult = await db.query(`
                INSERT INTO notification_groups
                (group_type, initiator_type, initiator_id, subject, status, company_id, metadata, priority)
                VALUES ($1, 'employee', $2, $3, 'open', $4, $5, $6)
                RETURNING *
            `, [
                requestTypeCode,
                employeeId,
                this.buildSubject(requestType, formData, employeeId),
                companyId,
                JSON.stringify({
                    request_type: requestTypeCode,
                    form_data: formData,
                    approval_chain: approvalChain,
                    current_step: 0
                }),
                requestType.priority || 'normal'
            ]);

            const group = groupResult.rows[0];

            // 7. Crear primer mensaje (solicitud inicial)
            const employee = await this.getEmployeeInfo(employeeId, companyId);

            const messageResult = await db.query(`
                INSERT INTO notification_messages
                (group_id, sequence_number, sender_type, sender_id, sender_name,
                 recipient_type, recipient_id, recipient_name, message_type,
                 subject, content, created_at, deadline_at, requires_response,
                 message_hash, company_id, channels)
                VALUES ($1, 1, 'employee', $2, $3, $4, $5, $6, 'request', $7, $8, NOW(),
                        NOW() + INTERVAL '1 hour' * $9, true, $10, $11, $12)
                RETURNING *
            `, [
                group.id,
                employeeId,
                employee.full_name || employee.name || employeeId,
                firstApprover.role,
                approver.id,
                approver.full_name || approver.name || approver.id,
                this.buildSubject(requestType, formData, employeeId),
                this.buildContent(requestType, formData, employee),
                firstApprover.deadline_hours || 24,
                this.generateMessageHash(group.id, employeeId, approver.id),
                companyId,
                JSON.stringify(['web', 'email'])
            ]);

            const message = messageResult.rows[0];

            // 8. Registrar en audit log
            await this.logAuditAction(group.id, message.id, 'created', employeeId, 'employee');

            console.log(`✅ [REQUEST] Solicitud ${requestType.display_name_es} creada: ${group.id}`);

            return {
                group: group,
                message: message,
                requestType: requestType
            };

        } catch (error) {
            console.error(`❌ [REQUEST] Error creando solicitud:`, error);
            throw error;
        }
    }

    /**
     * Obtiene el tipo de solicitud por código
     */
    async getRequestType(code) {
        try {
            const result = await db.query(`
                SELECT * FROM request_types
                WHERE code = $1 AND active = true
            `, [code]);

            if (!result || result.rows.length === 0) {
                return null;
            }

            return result.rows[0];

        } catch (error) {
            console.error(`❌ [REQUEST] Error obteniendo request type:`, error);
            return null;
        }
    }

    /**
     * Valida datos del formulario contra definición de campos
     */
    async validateFormData(formData, formFields) {
        const errors = [];

        for (const field of formFields) {
            const value = formData[field.name];

            // Campo requerido
            if (field.required && (value === null || value === undefined || value === '')) {
                errors.push(`El campo "${field.label}" es obligatorio`);
                continue;
            }

            // Si no hay valor y no es requerido, skip
            if (!value) continue;

            // Validación por tipo
            switch (field.type) {
                case 'date':
                    if (!this.isValidDate(value)) {
                        errors.push(`Fecha inválida en "${field.label}"`);
                    }
                    break;

                case 'email':
                    if (!this.isValidEmail(value)) {
                        errors.push(`Email inválido en "${field.label}"`);
                    }
                    break;

                case 'number':
                    const num = parseFloat(value);
                    if (isNaN(num)) {
                        errors.push(`Número inválido en "${field.label}"`);
                    } else {
                        if (field.min !== undefined && num < field.min) {
                            errors.push(`"${field.label}" debe ser al menos ${field.min}`);
                        }
                        if (field.max !== undefined && num > field.max) {
                            errors.push(`"${field.label}" no puede exceder ${field.max}`);
                        }
                    }
                    break;

                case 'file':
                    if (field.required && !value) {
                        errors.push(`El archivo "${field.label}" es obligatorio`);
                    }
                    break;
            }
        }

        if (errors.length > 0) {
            throw new Error(`Errores de validación: ${errors.join(', ')}`);
        }
    }

    /**
     * Aplica reglas de validación de negocio
     */
    async applyValidationRules(employeeId, formData, rules, companyId) {
        if (!rules) return;

        // Validar días de anticipación
        if (rules.min_notice_days && formData.start_date) {
            const daysUntil = this.getDaysDifference(new Date(), new Date(formData.start_date));
            if (daysUntil < rules.min_notice_days) {
                throw new Error(`Debe solicitar con al menos ${rules.min_notice_days} días de anticipación (tiene ${daysUntil} días)`);
            }
        }

        // Validar balance de días disponibles (ej: vacaciones)
        if (rules.requires_balance_check && formData.start_date && formData.end_date) {
            const balance = await this.getEmployeeVacationBalance(employeeId, companyId);
            const requestedDays = this.getDaysDifference(new Date(formData.start_date), new Date(formData.end_date));

            if (requestedDays > balance) {
                throw new Error(`No tiene suficientes días disponibles. Balance: ${balance} días, solicitado: ${requestedDays} días`);
            }
        }

        // Validar días consecutivos máximos
        if (rules.max_consecutive_days && formData.start_date && formData.end_date) {
            const days = this.getDaysDifference(new Date(formData.start_date), new Date(formData.end_date));
            if (days > rules.max_consecutive_days) {
                throw new Error(`No puede solicitar más de ${rules.max_consecutive_days} días consecutivos (solicitó ${days})`);
            }
        }

        // Validar fechas bloqueadas
        if (rules.blocked_dates && formData.start_date && formData.end_date) {
            const requestedRange = this.getDateRange(formData.start_date, formData.end_date);
            const hasBlockedDate = requestedRange.some(date =>
                rules.blocked_dates.includes(date)
            );
            if (hasBlockedDate) {
                throw new Error('El período solicitado incluye fechas no disponibles (feriados o fechas bloqueadas)');
            }
        }
    }

    /**
     * Obtiene el aprobador correspondiente para un empleado según su rol
     */
    async getApproverForEmployee(employeeId, approverRole, companyId) {
        try {
            let query, params;

            switch (approverRole) {
                case 'supervisor':
                case 'immediate_supervisor':
                    // Obtener supervisor directo del empleado
                    query = `
                        SELECT e2.employee_id as id, e2.name as full_name, e2.email
                        FROM employees e1
                        JOIN employees e2 ON e1.supervisor_id = e2.employee_id
                        WHERE e1.employee_id = $1 AND e1.company_id = $2
                    `;
                    params = [employeeId, companyId];
                    break;

                case 'rrhh':
                case 'hr':
                    // Obtener primer usuario de RRHH de la empresa
                    query = `
                        SELECT employee_id as id, name as full_name, email
                        FROM employees
                        WHERE role = 'rrhh' AND company_id = $1 AND active = true
                        LIMIT 1
                    `;
                    params = [companyId];
                    break;

                case 'medical':
                    // Obtener médico laboral
                    query = `
                        SELECT employee_id as id, name as full_name, email
                        FROM employees
                        WHERE department_id IN (
                            SELECT id FROM departments WHERE name ILIKE '%medico%' OR name ILIKE '%salud%'
                        )
                        AND company_id = $1 AND active = true
                        LIMIT 1
                    `;
                    params = [companyId];
                    break;

                case 'target_employee':
                    // Para cambios de turno: el empleado con quien se quiere cambiar
                    const targetId = formData?.target_employee_id;
                    if (!targetId) {
                        throw new Error('target_employee_id requerido');
                    }
                    query = `
                        SELECT employee_id as id, name as full_name, email
                        FROM employees
                        WHERE employee_id = $1 AND company_id = $2 AND active = true
                    `;
                    params = [targetId, companyId];
                    break;

                default:
                    throw new Error(`Rol de aprobador desconocido: ${approverRole}`);
            }

            const result = await db.query(query, params);

            if (!result || result.rows.length === 0) {
                return null;
            }

            return result.rows[0];

        } catch (error) {
            console.error(`❌ [REQUEST] Error obteniendo aprobador:`, error);
            return null;
        }
    }

    /**
     * Construye el asunto de la notificación
     */
    buildSubject(requestType, formData, employeeId) {
        let subject = requestType.email_subject_template || requestType.display_name_es;

        // Reemplazar variables {{variable}}
        Object.keys(formData).forEach(key => {
            const placeholder = `{{${key}}}`;
            if (subject.includes(placeholder)) {
                subject = subject.replace(placeholder, formData[key]);
            }
        });

        subject = subject.replace('{{employee_name}}', employeeId);

        return subject;
    }

    /**
     * Construye el contenido de la notificación
     */
    buildContent(requestType, formData, employee) {
        let content = `Solicitud: ${requestType.display_name_es}\n\n`;
        content += `Solicitante: ${employee.full_name || employee.name || employee.employee_id}\n`;
        content += `Legajo: ${employee.employee_id}\n\n`;

        content += `Detalles de la solicitud:\n`;
        requestType.form_fields.forEach(field => {
            const value = formData[field.name];
            if (value) {
                content += `• ${field.label}: ${value}\n`;
            }
        });

        return content;
    }

    /**
     * Genera hash SHA-256 para el mensaje
     */
    generateMessageHash(groupId, senderId, recipientId) {
        const data = `${groupId}${senderId}${recipientId}${Date.now()}`;
        return crypto.createHash('sha256').update(data).digest('hex');
    }

    /**
     * Obtiene información del empleado
     */
    async getEmployeeInfo(employeeId, companyId) {
        try {
            const result = await db.query(`
                SELECT employee_id, name, email, supervisor_id, department_id
                FROM employees
                WHERE employee_id = $1 AND company_id = $2
            `, [employeeId, companyId]);

            return result.rows[0] || {};
        } catch (error) {
            return {};
        }
    }

    /**
     * Obtiene balance de vacaciones del empleado
     */
    async getEmployeeVacationBalance(employeeId, companyId) {
        try {
            const result = await db.query(`
                SELECT balance FROM vacation_balances
                WHERE employee_id = $1 AND company_id = $2 AND expiry_date > NOW()
            `, [employeeId, companyId]);

            if (!result || result.rows.length === 0) {
                return 0;
            }

            return result.rows[0].balance || 0;
        } catch (error) {
            return 0;
        }
    }

    /**
     * Registra acción en audit log
     */
    async logAuditAction(groupId, messageId, action, actorId, actorType) {
        try {
            await db.query(`
                INSERT INTO notification_audit_log
                (group_id, message_id, action, actor_id, actor_type, timestamp)
                VALUES ($1, $2, $3, $4, $5, NOW())
            `, [groupId, messageId, action, actorId, actorType]);
        } catch (error) {
            console.error('❌ Error logging audit action:', error);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // FUNCIONES AUXILIARES
    // ═══════════════════════════════════════════════════════════════

    isValidDate(dateString) {
        const date = new Date(dateString);
        return date instanceof Date && !isNaN(date);
    }

    isValidEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    getDaysDifference(date1, date2) {
        const diffTime = Math.abs(date2 - date1);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    }

    getDateRange(startDate, endDate) {
        const dates = [];
        let currentDate = new Date(startDate);
        const end = new Date(endDate);

        while (currentDate <= end) {
            dates.push(currentDate.toISOString().split('T')[0]);
            currentDate.setDate(currentDate.getDate() + 1);
        }

        return dates;
    }
}

module.exports = new RequestService();
