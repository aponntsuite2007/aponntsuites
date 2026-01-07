/**
 * Cash Authorization Service
 * Servicio de autorizaciones jerárquicas con biometría/contraseña
 * Integración con organigrama y sistema de notificaciones
 */

const { Op, literal } = require('sequelize');

// 🔥 NCE: Central Telefónica de Notificaciones (elimina bypass)
const NCE = require('./NotificationCentralExchange');

class CashAuthorizationService {
    constructor(db) {
        this.db = db;
    }

    // =========================================================================
    // CONFIGURACIÓN DE RESPONSABLES
    // =========================================================================

    /**
     * Obtener o crear configuración de finanzas para la empresa
     */
    async getFinanceConfig(companyId) {
        let config = await this.db.FinanceResponsibleConfig.findOne({
            where: { company_id: companyId, is_active: true },
            include: [
                { model: this.db.User, as: 'financeResponsible', attributes: ['user_id', 'first_name', 'last_name', 'email'] }
            ]
        });

        if (!config) {
            // Buscar automáticamente en organigrama alguien de finanzas
            const financeUser = await this.findFinanceResponsibleInOrg(companyId);
            if (financeUser) {
                config = await this.db.FinanceResponsibleConfig.create({
                    company_id: companyId,
                    finance_responsible_id: financeUser.user_id,
                    is_active: true
                });
            }
        }

        return config;
    }

    /**
     * Buscar responsable de finanzas en el organigrama
     */
    async findFinanceResponsibleInOrg(companyId) {
        // Buscar usuario con posición relacionada a finanzas
        const user = await this.db.User.findOne({
            where: {
                company_id: companyId,
                is_active: true
            },
            include: [{
                model: this.db.Position,
                as: 'position',
                where: {
                    [Op.or]: [
                        { name: { [Op.iLike]: '%finanz%' } },
                        { name: { [Op.iLike]: '%finance%' } },
                        { name: { [Op.iLike]: '%tesor%' } },
                        { name: { [Op.iLike]: '%treasury%' } },
                        { name: { [Op.iLike]: '%contador%' } },
                        { name: { [Op.iLike]: '%accountant%' } }
                    ]
                }
            }],
            order: [[{ model: this.db.Position, as: 'position' }, 'hierarchy_level', 'ASC']]
        });

        return user;
    }

    /**
     * Obtener supervisor inmediato según organigrama
     */
    async getImmediateSupervisor(userId) {
        const user = await this.db.User.findOne({
            where: { user_id: userId },
            include: [
                { model: this.db.Department, as: 'department' },
                { model: this.db.Position, as: 'position' }
            ]
        });

        if (!user) return null;

        // Buscar supervisor en el mismo departamento
        let supervisor = await this.db.User.findOne({
            where: {
                department_id: user.department_id,
                user_id: { [Op.ne]: userId },
                is_active: true
            },
            include: [{
                model: this.db.Position,
                as: 'position',
                where: {
                    [Op.or]: [
                        { is_supervisor: true },
                        { hierarchy_level: { [Op.lt]: user.position?.hierarchy_level || 999 } }
                    ]
                }
            }],
            order: [[{ model: this.db.Position, as: 'position' }, 'hierarchy_level', 'ASC']]
        });

        // Si no hay en el departamento, buscar jefe del departamento
        if (!supervisor && user.department) {
            supervisor = await this.db.User.findOne({
                where: { user_id: user.department.manager_id }
            });
        }

        return supervisor;
    }

    /**
     * Obtener responsable de finanzas (con escalamiento)
     */
    async getFinanceResponsible(companyId, escalationLevel = 0) {
        const config = await this.getFinanceConfig(companyId);
        if (!config) return null;

        if (escalationLevel === 0) {
            return this.db.User.findOne({
                where: { user_id: config.finance_responsible_id }
            });
        }

        // Usar backup para escalamiento
        if (config.backup_responsibles && config.backup_responsibles.length >= escalationLevel) {
            return this.db.User.findOne({
                where: { user_id: config.backup_responsibles[escalationLevel - 1] }
            });
        }

        // Escalar al nivel superior en el organigrama
        const currentResponsible = await this.db.User.findOne({
            where: { user_id: config.finance_responsible_id }
        });

        if (currentResponsible) {
            return this.getImmediateSupervisor(currentResponsible.user_id);
        }

        return null;
    }

    // =========================================================================
    // SOLICITUDES DE EGRESO
    // =========================================================================

    /**
     * Crear solicitud de egreso manual
     */
    async createEgressRequest(companyId, data, requestedBy, ipAddress = null) {
        const {
            cashRegisterId,
            sessionId,
            egressType,
            category,
            currency = 'ARS',
            amount,
            paymentMethodId,
            beneficiaryType,
            beneficiaryId,
            beneficiaryName,
            beneficiaryDocument,
            description,
            justification,
            supportingDocuments = []
        } = data;

        // Verificar que el usuario es responsable de esta caja
        const session = await this.db.FinanceCashRegisterSession.findByPk(sessionId);
        if (!session || session.opened_by !== requestedBy) {
            throw new Error('Solo el operador que abrió la caja puede solicitar egresos');
        }

        // Obtener supervisor inmediato
        const supervisor = await this.getImmediateSupervisor(requestedBy);
        if (!supervisor) {
            throw new Error('No se encontró un supervisor inmediato en el organigrama');
        }

        // Obtener responsable de finanzas
        const financeResponsible = await this.getFinanceResponsible(companyId);

        // Generar número de solicitud
        const lastRequest = await this.db.FinanceCashEgressRequest.findOne({
            where: { company_id: companyId },
            order: [['id', 'DESC']]
        });
        const requestNumber = `EGR-${companyId}-${(lastRequest?.id || 0) + 1}`.padStart(12, '0');

        // Crear solicitud
        const request = await this.db.FinanceCashEgressRequest.create({
            company_id: companyId,
            cash_register_id: cashRegisterId,
            session_id: sessionId,
            request_number: requestNumber,
            egress_type: egressType,
            category,
            currency,
            amount,
            payment_method_id: paymentMethodId,
            beneficiary_type: beneficiaryType,
            beneficiary_id: beneficiaryId,
            beneficiary_name: beneficiaryName,
            beneficiary_document: beneficiaryDocument,
            description,
            justification,
            supporting_documents: supportingDocuments,
            status: 'pending',
            requested_by: requestedBy,
            supervisor_id: supervisor.user_id,
            finance_responsible_id: financeResponsible?.user_id,
            ip_address: ipAddress,
            audit_trail: [{
                timestamp: new Date().toISOString(),
                action: 'created',
                user_id: requestedBy,
                notes: 'Solicitud creada'
            }]
        });

        // Enviar notificación al supervisor
        await this.sendNotification(companyId, supervisor.user_id, {
            type: 'egress_request',
            title: 'Nueva Solicitud de Egreso',
            message: `Solicitud de egreso por $${amount} ${currency} requiere su aprobación`,
            data: { request_id: request.id, request_number: requestNumber },
            priority: 'high'
        });

        return request;
    }

    /**
     * Aprobar egreso por supervisor (con biometría/contraseña)
     */
    async supervisorApproveEgress(requestId, supervisorId, authMethod, authData, notes = null, ipAddress = null) {
        const request = await this.db.FinanceCashEgressRequest.findByPk(requestId);
        if (!request) throw new Error('Solicitud no encontrada');
        if (request.status !== 'pending') {
            throw new Error(`La solicitud ya fue ${request.status}`);
        }
        if (request.supervisor_id !== supervisorId) {
            throw new Error('Solo el supervisor asignado puede aprobar');
        }

        // Verificar autorización
        const authResult = await this.verifyAuthorization(
            request.company_id,
            supervisorId,
            authMethod,
            authData,
            'egress',
            requestId,
            'finance_cash_egress_requests',
            'supervisor',
            ipAddress
        );

        if (!authResult.success) {
            throw new Error(`Autorización fallida: ${authResult.reason}`);
        }

        // Actualizar solicitud
        const auditTrail = [...(request.audit_trail || []), {
            timestamp: new Date().toISOString(),
            action: 'supervisor_approved',
            user_id: supervisorId,
            notes: notes || 'Aprobado por supervisor',
            auth_method: authMethod
        }];

        await request.update({
            status: 'supervisor_approved',
            supervisor_approved_at: new Date(),
            supervisor_approval_method: authMethod,
            supervisor_notes: notes,
            audit_trail: auditTrail
        });

        // Notificar al responsable de finanzas
        if (request.finance_responsible_id) {
            await this.sendNotification(request.company_id, request.finance_responsible_id, {
                type: 'egress_supervisor_approved',
                title: 'Egreso Aprobado por Supervisor',
                message: `Solicitud ${request.request_number} por $${request.amount} aprobada por supervisor`,
                data: { request_id: request.id },
                priority: 'normal'
            });

            await request.update({ finance_notified_at: new Date() });
        }

        return request;
    }

    /**
     * Ejecutar egreso (después de aprobaciones)
     */
    async executeEgress(requestId, executorId, authMethod, authData, cashRegisterService, ipAddress = null) {
        const request = await this.db.FinanceCashEgressRequest.findByPk(requestId, {
            include: [{ model: this.db.FinanceCashRegister, as: 'cashRegister' }]
        });

        if (!request) throw new Error('Solicitud no encontrada');
        if (request.status !== 'supervisor_approved' && request.status !== 'finance_approved') {
            throw new Error('La solicitud debe estar aprobada para ejecutar');
        }

        // Verificar que el ejecutor es el operador de la caja
        const session = await this.db.FinanceCashRegisterSession.findByPk(request.session_id);
        if (!session || session.opened_by !== executorId) {
            throw new Error('Solo el operador de la caja puede ejecutar el egreso');
        }

        // Verificar autorización
        const authResult = await this.verifyAuthorization(
            request.company_id,
            executorId,
            authMethod,
            authData,
            'egress_execute',
            requestId,
            'finance_cash_egress_requests',
            'operator',
            ipAddress
        );

        if (!authResult.success) {
            throw new Error(`Autorización fallida: ${authResult.reason}`);
        }

        // Crear movimiento de egreso
        const movement = await cashRegisterService.createMovement(request.company_id, {
            cashRegisterId: request.cash_register_id,
            sessionId: request.session_id,
            movementType: 'expense',
            amount: request.amount,
            paymentMethodId: request.payment_method_id,
            sourceModule: 'egress_request',
            sourceDocumentId: request.id,
            sourceDocumentNumber: request.request_number,
            category: request.category || request.egress_type,
            description: request.description,
            createdBy: executorId,
            metadata: {
                beneficiary: request.beneficiary_name,
                justification: request.justification
            }
        });

        // Actualizar solicitud
        const auditTrail = [...(request.audit_trail || []), {
            timestamp: new Date().toISOString(),
            action: 'executed',
            user_id: executorId,
            notes: 'Egreso ejecutado',
            auth_method: authMethod,
            movement_id: movement.id
        }];

        await request.update({
            status: 'executed',
            executed_by: executorId,
            executed_at: new Date(),
            execution_method: authMethod,
            movement_id: movement.id,
            audit_trail: auditTrail
        });

        return { request, movement };
    }

    /**
     * Rechazar egreso
     */
    async rejectEgress(requestId, rejectorId, reason, ipAddress = null) {
        if (!reason) throw new Error('Debe proporcionar un motivo de rechazo');

        const request = await this.db.FinanceCashEgressRequest.findByPk(requestId);
        if (!request) throw new Error('Solicitud no encontrada');

        // Verificar que quien rechaza es supervisor o finanzas
        if (request.supervisor_id !== rejectorId && request.finance_responsible_id !== rejectorId) {
            throw new Error('Solo el supervisor o responsable de finanzas puede rechazar');
        }

        const auditTrail = [...(request.audit_trail || []), {
            timestamp: new Date().toISOString(),
            action: 'rejected',
            user_id: rejectorId,
            notes: reason
        }];

        await request.update({
            status: 'rejected',
            rejected_by: rejectorId,
            rejected_at: new Date(),
            rejection_reason: reason,
            audit_trail: auditTrail
        });

        // Notificar al solicitante
        await this.sendNotification(request.company_id, request.requested_by, {
            type: 'egress_rejected',
            title: 'Solicitud de Egreso Rechazada',
            message: `Su solicitud ${request.request_number} fue rechazada: ${reason}`,
            data: { request_id: request.id },
            priority: 'high'
        });

        return request;
    }

    // =========================================================================
    // AJUSTES DE CAJA
    // =========================================================================

    /**
     * Crear solicitud de ajuste
     */
    async createAdjustmentRequest(companyId, data, requestedBy, ipAddress = null) {
        const {
            cashRegisterId,
            sessionId,
            adjustmentType,
            adjustmentReason,
            currency = 'ARS',
            amount,
            description,
            supportingDocument
        } = data;

        // Obtener saldo actual
        const currentBalance = await this.getCurrentBalance(cashRegisterId, currency);
        const newBalance = adjustmentType === 'positive'
            ? parseFloat(currentBalance) + parseFloat(amount)
            : parseFloat(currentBalance) - parseFloat(amount);

        // Obtener responsable de finanzas
        const financeResponsible = await this.getFinanceResponsible(companyId);
        if (!financeResponsible) {
            throw new Error('No se encontró un responsable de finanzas configurado');
        }

        // Generar número de ajuste
        const lastAdjustment = await this.db.FinanceCashAdjustment.findOne({
            where: { company_id: companyId },
            order: [['id', 'DESC']]
        });
        const adjustmentNumber = `ADJ-${companyId}-${(lastAdjustment?.id || 0) + 1}`.padStart(12, '0');

        // Crear ajuste
        const adjustment = await this.db.FinanceCashAdjustment.create({
            company_id: companyId,
            cash_register_id: cashRegisterId,
            session_id: sessionId,
            adjustment_number: adjustmentNumber,
            adjustment_type: adjustmentType,
            adjustment_reason: adjustmentReason,
            currency,
            amount,
            previous_balance: currentBalance,
            new_balance: newBalance,
            description,
            supporting_document: supportingDocument,
            status: 'pending',
            requested_by: requestedBy,
            requires_finance_approval: true,
            ip_address: ipAddress
        });

        // Notificar al responsable de finanzas
        await this.sendNotification(companyId, financeResponsible.user_id, {
            type: 'adjustment_request',
            title: 'Nueva Solicitud de Ajuste',
            message: `Ajuste de $${amount} ${currency} requiere su aprobación`,
            data: { adjustment_id: adjustment.id, adjustment_number: adjustmentNumber },
            priority: 'high'
        });

        return adjustment;
    }

    /**
     * Aprobar ajuste (solo finanzas, con biometría/contraseña)
     */
    async approveAdjustment(adjustmentId, financeUserId, authMethod, authData, notes = null, ipAddress = null) {
        const adjustment = await this.db.FinanceCashAdjustment.findByPk(adjustmentId);
        if (!adjustment) throw new Error('Ajuste no encontrado');
        if (adjustment.status !== 'pending') {
            throw new Error(`El ajuste ya fue ${adjustment.status}`);
        }

        // Verificar que es el responsable de finanzas
        const config = await this.getFinanceConfig(adjustment.company_id);
        if (!config || (config.finance_responsible_id !== financeUserId &&
            !(config.backup_responsibles || []).includes(financeUserId))) {
            throw new Error('Solo el responsable de finanzas puede aprobar ajustes');
        }

        // Verificar autorización
        const authResult = await this.verifyAuthorization(
            adjustment.company_id,
            financeUserId,
            authMethod,
            authData,
            'adjustment',
            adjustmentId,
            'finance_cash_adjustments',
            'finance_responsible',
            ipAddress
        );

        if (!authResult.success) {
            throw new Error(`Autorización fallida: ${authResult.reason}`);
        }

        // Aplicar ajuste al saldo
        await this.applyBalanceAdjustment(
            adjustment.cash_register_id,
            adjustment.currency,
            adjustment.adjustment_type === 'positive' ? adjustment.amount : -adjustment.amount
        );

        // Actualizar ajuste
        await adjustment.update({
            status: 'approved',
            finance_approver_id: financeUserId,
            finance_approved_at: new Date(),
            finance_approval_method: authMethod,
            finance_approval_notes: notes
        });

        return adjustment;
    }

    /**
     * Rechazar ajuste
     */
    async rejectAdjustment(adjustmentId, financeUserId, reason, ipAddress = null) {
        if (!reason) throw new Error('Debe proporcionar un motivo de rechazo');

        const adjustment = await this.db.FinanceCashAdjustment.findByPk(adjustmentId);
        if (!adjustment) throw new Error('Ajuste no encontrado');

        await adjustment.update({
            status: 'rejected',
            rejected_by: financeUserId,
            rejected_at: new Date(),
            rejection_reason: reason
        });

        // Notificar al solicitante
        await this.sendNotification(adjustment.company_id, adjustment.requested_by, {
            type: 'adjustment_rejected',
            title: 'Ajuste Rechazado',
            message: `Su ajuste ${adjustment.adjustment_number} fue rechazado: ${reason}`,
            data: { adjustment_id: adjustment.id },
            priority: 'high'
        });

        return adjustment;
    }

    // =========================================================================
    // VERIFICACIÓN DE AUTORIZACIÓN
    // =========================================================================

    /**
     * Verificar autorización (biometría o contraseña)
     */
    async verifyAuthorization(companyId, userId, method, authData, operationType, operationId, operationTable, role, ipAddress) {
        let result = { success: false, reason: 'Método no soportado' };

        switch (method) {
            case 'password':
                result = await this.verifyPassword(userId, authData.password);
                break;
            case 'biometric_fingerprint':
                result = await this.verifyBiometric(userId, 'fingerprint', authData);
                break;
            case 'biometric_face':
                result = await this.verifyBiometric(userId, 'face', authData);
                break;
            case 'pin':
                result = await this.verifyPin(userId, authData.pin);
                break;
            default:
                result = { success: false, reason: 'Método de autorización no reconocido' };
        }

        // Registrar intento de autorización
        await this.db.FinanceAuthorizationLog.create({
            company_id: companyId,
            operation_type: operationType,
            operation_id: operationId,
            operation_table: operationTable,
            authorizer_id: userId,
            authorization_role: role,
            authorization_method: method,
            authorization_device: authData.device_id,
            authorization_confidence: result.confidence,
            authorization_result: result.success ? 'success' : 'failed',
            failure_reason: result.reason,
            ip_address: ipAddress,
            user_agent: authData.user_agent,
            location_data: authData.location
        });

        return result;
    }

    /**
     * Verificar contraseña
     */
    async verifyPassword(userId, password) {
        const user = await this.db.User.findOne({ where: { user_id: userId } });
        if (!user) return { success: false, reason: 'Usuario no encontrado' };

        const bcrypt = require('bcryptjs');
        const isValid = await bcrypt.compare(password, user.password);

        return {
            success: isValid,
            reason: isValid ? null : 'Contraseña incorrecta'
        };
    }

    /**
     * Verificar biometría (integración con sistema biométrico existente)
     */
    async verifyBiometric(userId, type, authData) {
        // Integrar con el sistema biométrico existente
        // Por ahora, simular verificación
        // TODO: Conectar con BiometricService real

        if (authData.biometric_template && authData.biometric_match_score) {
            return {
                success: authData.biometric_match_score >= 0.8,
                confidence: authData.biometric_match_score * 100,
                reason: authData.biometric_match_score >= 0.8 ? null : 'Score biométrico insuficiente'
            };
        }

        return { success: false, reason: 'Datos biométricos no proporcionados' };
    }

    /**
     * Verificar PIN
     */
    async verifyPin(userId, pin) {
        const user = await this.db.User.findOne({ where: { user_id: userId } });
        if (!user || !user.pin_hash) {
            return { success: false, reason: 'PIN no configurado' };
        }

        const bcrypt = require('bcryptjs');
        const isValid = await bcrypt.compare(pin, user.pin_hash);

        return {
            success: isValid,
            reason: isValid ? null : 'PIN incorrecto'
        };
    }

    // =========================================================================
    // UTILIDADES
    // =========================================================================

    /**
     * Obtener saldo actual de una caja por moneda
     */
    async getCurrentBalance(registerId, currency) {
        const balance = await this.db.sequelize.query(`
            SELECT COALESCE(current_balance, 0) as balance
            FROM finance_cash_register_balances
            WHERE cash_register_id = :registerId AND currency = :currency
        `, {
            replacements: { registerId, currency },
            type: this.db.sequelize.QueryTypes.SELECT
        });

        return balance[0]?.balance || 0;
    }

    /**
     * Aplicar ajuste al saldo
     */
    async applyBalanceAdjustment(registerId, currency, amount) {
        await this.db.sequelize.query(`
            INSERT INTO finance_cash_register_balances (cash_register_id, currency, current_balance, last_adjustment_at, updated_at)
            VALUES (:registerId, :currency, :amount, NOW(), NOW())
            ON CONFLICT (cash_register_id, currency)
            DO UPDATE SET
                current_balance = finance_cash_register_balances.current_balance + :amount,
                last_adjustment_at = NOW(),
                updated_at = NOW()
        `, {
            replacements: { registerId, currency, amount }
        });
    }

    /**
     * Enviar notificación
     * 🔥 MIGRADO A NCE: Central Telefónica
     */
    async sendNotification(companyId, userId, notification) {
        try {
            // 🔥 NCE: Central Telefónica de Notificaciones
            await NCE.send({
                companyId: companyId,
                module: 'finance',
                originType: 'cash_authorization',
                originId: `cash-auth-${Date.now()}`,

                workflowKey: `finance.${notification.type || 'authorization'}`,

                recipientType: 'user',
                recipientId: userId,

                title: notification.title,
                message: notification.message,

                metadata: notification.data || {},

                priority: notification.priority || 'normal',
                requiresAction: notification.type === 'authorization_request',

                channels: ['inbox', 'websocket'],
            });

            // Socket ya lo maneja NCE via websocket channel, pero mantener fallback
            if (global.io) {
                global.io.to(`user_${userId}`).emit('notification', notification);
            }

            return true;
        } catch (error) {
            console.error('Error sending notification:', error);
            return false;
        }
    }

    /**
     * Escalar solicitud si no hay respuesta
     */
    async escalateRequest(requestId, type = 'egress') {
        const table = type === 'egress' ? 'FinanceCashEgressRequest' : 'FinanceCashAdjustment';
        const request = await this.db[table].findByPk(requestId);

        if (!request || request.status !== 'pending') return null;

        const config = await this.getFinanceConfig(request.company_id);
        if (!config) return null;

        const newLevel = (request.escalation_level || 0) + 1;
        if (newLevel > config.max_escalation_level) {
            // No se puede escalar más
            return null;
        }

        const escalatedTo = await this.getFinanceResponsible(request.company_id, newLevel);
        if (!escalatedTo) return null;

        await request.update({
            escalation_level: newLevel,
            escalated_to: escalatedTo.user_id,
            escalated_at: new Date(),
            escalation_reason: `Escalado automáticamente después de ${config.escalation_timeout_minutes} minutos sin respuesta`
        });

        // Notificar al nuevo responsable
        await this.sendNotification(request.company_id, escalatedTo.user_id, {
            type: `${type}_escalated`,
            title: `Solicitud Escalada - Nivel ${newLevel}`,
            message: `Solicitud ${request.request_number || request.adjustment_number} requiere atención urgente`,
            data: { request_id: request.id },
            priority: 'urgent'
        });

        return request;
    }

    // =========================================================================
    // DASHBOARD DATA
    // =========================================================================

    /**
     * Obtener resumen para dashboard de finanzas
     */
    async getFinanceDashboardSummary(companyId) {
        // Pendientes de aprobación
        const pendingAdjustments = await this.db.FinanceCashAdjustment.count({
            where: { company_id: companyId, status: 'pending' }
        });

        const pendingEgress = await this.db.FinanceCashEgressRequest.count({
            where: {
                company_id: companyId,
                status: { [Op.in]: ['pending', 'supervisor_approved'] }
            }
        });

        // Totales del día
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const todayMovements = await this.db.sequelize.query(`
            SELECT
                currency,
                SUM(CASE WHEN movement_type = 'income' THEN amount ELSE 0 END) as total_income,
                SUM(CASE WHEN movement_type = 'expense' THEN amount ELSE 0 END) as total_expense,
                SUM(CASE WHEN movement_type IN ('transfer_in', 'transfer_out') THEN amount ELSE 0 END) as total_transfers
            FROM finance_cash_movements
            WHERE company_id = :companyId AND movement_date >= :today
            GROUP BY currency
        `, {
            replacements: { companyId, today },
            type: this.db.sequelize.QueryTypes.SELECT
        });

        // Saldos por caja
        const registerBalances = await this.db.sequelize.query(`
            SELECT
                cr.id,
                cr.name,
                cr.register_type,
                crs.status as session_status,
                jsonb_object_agg(crb.currency, crb.current_balance) as balances
            FROM finance_cash_registers cr
            LEFT JOIN finance_cash_register_sessions crs ON cr.current_session_id = crs.id
            LEFT JOIN finance_cash_register_balances crb ON cr.id = crb.cash_register_id
            WHERE cr.company_id = :companyId AND cr.is_active = true
            GROUP BY cr.id, cr.name, cr.register_type, crs.status
        `, {
            replacements: { companyId },
            type: this.db.sequelize.QueryTypes.SELECT
        });

        return {
            pending: {
                adjustments: pendingAdjustments,
                egress: pendingEgress,
                total: pendingAdjustments + pendingEgress
            },
            today: todayMovements,
            registers: registerBalances
        };
    }
}

module.exports = CashAuthorizationService;
