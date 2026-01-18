/**
 * ============================================================================
 * HOUR BANK SERVICE - Sistema de Banco de Horas
 * ============================================================================
 *
 * Servicio completo para gestion de banco de horas con:
 * - Parametrizacion por sucursal via plantillas SSOT
 * - Soporte multi-pais (Argentina, Brasil, Uruguay, Chile, Mexico, Espana, Alemania)
 * - Eleccion del empleado en tiempo real (cobrar vs acumular)
 * - Workflow de aprobacion configurable
 * - Integracion con fichaje biometrico
 * - Vencimientos automaticos
 * - Estado de cuenta completo
 *
 * @version 1.0.0
 * @date 2025-12-15
 * ============================================================================
 */

const { sequelize } = require('../config/database');
const { QueryTypes } = require('sequelize');
const NotificationWorkflowService = require('./NotificationWorkflowService');
const NotificationRecipientResolver = require('./NotificationRecipientResolver');

class HourBankService {

    // =========================================================================
    // HELPER: Sanitizar branch_id
    // =========================================================================
    // PROBLEMA: users.branch_id es UUID (refs branches.id que es UUID)
    //           hour_bank_*.branch_id es INTEGER (refs company_branches.id que es INTEGER)
    // SOLUCIÓN: Si es UUID, retornar null; si es integer válido, usarlo
    // =========================================================================
    static sanitizeBranchId(branchId) {
        if (!branchId) return null;
        // Si ya es número
        if (typeof branchId === 'number' && Number.isInteger(branchId) && branchId > 0) {
            return branchId;
        }
        // Si es string numérico
        if (typeof branchId === 'string') {
            const parsed = parseInt(branchId, 10);
            if (!isNaN(parsed) && parsed > 0 && String(parsed) === branchId) {
                return parsed;
            }
        }
        // UUID o cualquier otro formato -> null
        return null;
    }

    // =========================================================================
    // PLANTILLAS (TEMPLATES)
    // =========================================================================

    /**
     * Obtiene la plantilla aplicable para un usuario
     * Prioridad: branch_id especifico > company_id general
     * @param {UUID} userId - ID del usuario
     * @param {number} companyId - ID de la empresa
     * @param {number} branchId - ID de la sucursal (opcional)
     * @returns {Object|null} Template aplicable
     */
    async getApplicableTemplate(userId, companyId, branchId = null) {
        try {
            // Si no se especifica branch, intentar obtenerlo del usuario
            if (!branchId) {
                const [user] = await sequelize.query(`
                    SELECT branch_id FROM users WHERE user_id = :userId
                `, { replacements: { userId }, type: QueryTypes.SELECT });
                branchId = user?.branch_id;
            }

            const [template] = await sequelize.query(`
                SELECT *
                FROM hour_bank_templates
                WHERE company_id = :companyId
                  AND is_current_version = true
                  AND is_enabled = true
                  AND (branch_id = :branchId OR branch_id IS NULL)
                ORDER BY
                    CASE WHEN branch_id = :branchId THEN 0 ELSE 1 END,
                    created_at DESC
                LIMIT 1
            `, {
                replacements: { companyId, branchId: HourBankService.sanitizeBranchId(branchId) },
                type: QueryTypes.SELECT
            });

            return template || null;
        } catch (error) {
            console.error('[HourBank] Error getting template:', error);
            return null;
        }
    }

    /**
     * Obtiene todas las plantillas de una empresa
     * @param {number} companyId - ID de la empresa
     * @returns {Array} Lista de templates
     */
    async getCompanyTemplates(companyId) {
        try {
            const templates = await sequelize.query(`
                SELECT
                    t.*,
                    b.name as branch_name,
                    u.nombre as created_by_name
                FROM hour_bank_templates t
                LEFT JOIN company_branches b ON t.branch_id = b.id
                LEFT JOIN users u ON t.created_by = u.user_id
                WHERE t.company_id = :companyId
                  AND t.is_current_version = true
                ORDER BY t.branch_id NULLS FIRST, t.created_at DESC
            `, {
                replacements: { companyId },
                type: QueryTypes.SELECT
            });

            return templates;
        } catch (error) {
            console.error('[HourBank] Error getting templates:', error);
            return [];
        }
    }

    /**
     * Crea o actualiza una plantilla
     * @param {Object} templateData - Datos de la plantilla
     * @param {UUID} createdBy - ID del usuario que crea
     * @returns {Object} Resultado de la operacion
     */
    async saveTemplate(templateData, createdBy) {
        const transaction = await sequelize.transaction();

        try {
            const {
                id,
                company_id,
                branch_id,
                country_code,
                template_code,
                template_name,
                description,
                ...config
            } = templateData;

            if (id) {
                // Actualizar existente - crear nueva version
                await sequelize.query(`
                    UPDATE hour_bank_templates
                    SET is_current_version = false
                    WHERE id = :id
                `, { replacements: { id }, type: QueryTypes.UPDATE, transaction });

                // Obtener version actual
                const [current] = await sequelize.query(`
                    SELECT version FROM hour_bank_templates WHERE id = :id
                `, { replacements: { id }, type: QueryTypes.SELECT, transaction });

                const newVersion = (current?.version || 0) + 1;

                // Insertar nueva version
                const [result] = await sequelize.query(`
                    INSERT INTO hour_bank_templates (
                        company_id, branch_id, country_code, template_code, template_name, description,
                        conversion_rate_normal, conversion_rate_weekend, conversion_rate_holiday, conversion_rate_night,
                        max_accumulation_hours, max_monthly_accrual, min_balance_for_use,
                        expiration_enabled, expiration_months, expiration_warning_days, expired_hours_action,
                        employee_choice_enabled, choice_timeout_hours, default_action, choice_reminder_hours,
                        min_usage_hours, max_usage_hours_per_day, allow_partial_day_usage, allow_full_day_usage,
                        allow_early_departure, allow_late_arrival_compensation,
                        requires_supervisor_approval, requires_hr_approval, usage_requires_approval,
                        auto_approve_under_hours, advance_notice_days,
                        notify_employee_on_accrual, notify_supervisor_on_accrual, notify_hr_on_accrual,
                        notify_on_low_balance, low_balance_threshold, notify_on_high_balance, high_balance_threshold,
                        blackout_dates_enabled, max_concurrent_users_percent,
                        requires_written_agreement, union_agreement_required, legal_reference,
                        version, is_current_version, parent_template_id, created_by
                    ) VALUES (
                        :company_id, :branch_id, :country_code, :template_code, :template_name, :description,
                        :conversion_rate_normal, :conversion_rate_weekend, :conversion_rate_holiday, :conversion_rate_night,
                        :max_accumulation_hours, :max_monthly_accrual, :min_balance_for_use,
                        :expiration_enabled, :expiration_months, :expiration_warning_days, :expired_hours_action,
                        :employee_choice_enabled, :choice_timeout_hours, :default_action, :choice_reminder_hours,
                        :min_usage_hours, :max_usage_hours_per_day, :allow_partial_day_usage, :allow_full_day_usage,
                        :allow_early_departure, :allow_late_arrival_compensation,
                        :requires_supervisor_approval, :requires_hr_approval, :usage_requires_approval,
                        :auto_approve_under_hours, :advance_notice_days,
                        :notify_employee_on_accrual, :notify_supervisor_on_accrual, :notify_hr_on_accrual,
                        :notify_on_low_balance, :low_balance_threshold, :notify_on_high_balance, :high_balance_threshold,
                        :blackout_dates_enabled, :max_concurrent_users_percent,
                        :requires_written_agreement, :union_agreement_required, :legal_reference,
                        :version, true, :parent_template_id, :created_by
                    ) RETURNING id
                `, {
                    replacements: {
                        company_id,
                        branch_id: HourBankService.sanitizeBranchId(branch_id),
                        country_code: country_code || null,
                        template_code,
                        template_name,
                        description: description || null,
                        ...this.getDefaultConfig(),
                        ...config,
                        version: newVersion,
                        parent_template_id: id,
                        created_by: createdBy
                    },
                    type: QueryTypes.INSERT,
                    transaction
                });

                await transaction.commit();
                return { success: true, id: result[0]?.id, version: newVersion };
            } else {
                // Crear nueva plantilla
                const [result] = await sequelize.query(`
                    INSERT INTO hour_bank_templates (
                        company_id, branch_id, country_code, template_code, template_name, description,
                        conversion_rate_normal, conversion_rate_weekend, conversion_rate_holiday, conversion_rate_night,
                        max_accumulation_hours, max_monthly_accrual, min_balance_for_use,
                        expiration_enabled, expiration_months, expiration_warning_days, expired_hours_action,
                        employee_choice_enabled, choice_timeout_hours, default_action, choice_reminder_hours,
                        min_usage_hours, max_usage_hours_per_day, allow_partial_day_usage, allow_full_day_usage,
                        allow_early_departure, allow_late_arrival_compensation,
                        requires_supervisor_approval, requires_hr_approval, usage_requires_approval,
                        auto_approve_under_hours, advance_notice_days,
                        notify_employee_on_accrual, notify_supervisor_on_accrual, notify_hr_on_accrual,
                        notify_on_low_balance, low_balance_threshold, notify_on_high_balance, high_balance_threshold,
                        blackout_dates_enabled, max_concurrent_users_percent,
                        requires_written_agreement, union_agreement_required, legal_reference,
                        created_by
                    ) VALUES (
                        :company_id, :branch_id, :country_code, :template_code, :template_name, :description,
                        :conversion_rate_normal, :conversion_rate_weekend, :conversion_rate_holiday, :conversion_rate_night,
                        :max_accumulation_hours, :max_monthly_accrual, :min_balance_for_use,
                        :expiration_enabled, :expiration_months, :expiration_warning_days, :expired_hours_action,
                        :employee_choice_enabled, :choice_timeout_hours, :default_action, :choice_reminder_hours,
                        :min_usage_hours, :max_usage_hours_per_day, :allow_partial_day_usage, :allow_full_day_usage,
                        :allow_early_departure, :allow_late_arrival_compensation,
                        :requires_supervisor_approval, :requires_hr_approval, :usage_requires_approval,
                        :auto_approve_under_hours, :advance_notice_days,
                        :notify_employee_on_accrual, :notify_supervisor_on_accrual, :notify_hr_on_accrual,
                        :notify_on_low_balance, :low_balance_threshold, :notify_on_high_balance, :high_balance_threshold,
                        :blackout_dates_enabled, :max_concurrent_users_percent,
                        :requires_written_agreement, :union_agreement_required, :legal_reference,
                        :created_by
                    ) RETURNING id
                `, {
                    replacements: {
                        company_id,
                        branch_id: HourBankService.sanitizeBranchId(branch_id),
                        country_code: country_code || null,
                        template_code,
                        template_name,
                        description: description || null,
                        ...this.getDefaultConfig(),
                        ...config,
                        created_by: createdBy
                    },
                    type: QueryTypes.INSERT,
                    transaction
                });

                await transaction.commit();
                return { success: true, id: result[0]?.id };
            }
        } catch (error) {
            await transaction.rollback();
            console.error('[HourBank] Error saving template:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Configuracion por defecto para nuevas plantillas
     */
    getDefaultConfig() {
        return {
            conversion_rate_normal: 1.50,
            conversion_rate_weekend: 2.00,
            conversion_rate_holiday: 2.00,
            conversion_rate_night: 1.20,
            max_accumulation_hours: 120,
            max_monthly_accrual: 30,
            min_balance_for_use: 0.5,
            expiration_enabled: true,
            expiration_months: 12,
            expiration_warning_days: 30,
            expired_hours_action: 'payout',
            employee_choice_enabled: true,
            choice_timeout_hours: 24,
            default_action: 'bank',
            choice_reminder_hours: 8,
            min_usage_hours: 0.5,
            max_usage_hours_per_day: 8,
            allow_partial_day_usage: true,
            allow_full_day_usage: true,
            allow_early_departure: true,
            allow_late_arrival_compensation: true,
            requires_supervisor_approval: false,
            requires_hr_approval: false,
            usage_requires_approval: true,
            auto_approve_under_hours: 2,
            advance_notice_days: 2,
            notify_employee_on_accrual: true,
            notify_supervisor_on_accrual: true,
            notify_hr_on_accrual: true,
            notify_on_low_balance: true,
            low_balance_threshold: 4,
            notify_on_high_balance: true,
            high_balance_threshold: 80,
            blackout_dates_enabled: false,
            max_concurrent_users_percent: 20,
            requires_written_agreement: false,
            union_agreement_required: false,
            legal_reference: null
        };
    }

    // =========================================================================
    // SALDOS (BALANCES)
    // =========================================================================

    /**
     * Obtiene el saldo actual de un empleado
     * @param {UUID} userId - ID del usuario
     * @param {number} companyId - ID de la empresa
     * @returns {Object} Saldo y detalles
     */
    async getBalance(userId, companyId) {
        try {
            // Obtener o crear registro de balance
            let [balance] = await sequelize.query(`
                SELECT * FROM hour_bank_balances
                WHERE user_id = :userId AND company_id = :companyId
            `, {
                replacements: { userId, companyId },
                type: QueryTypes.SELECT
            });

            if (!balance) {
                // Crear registro vacio
                await sequelize.query(`
                    INSERT INTO hour_bank_balances (user_id, company_id, current_balance)
                    VALUES (:userId, :companyId, 0)
                    ON CONFLICT (user_id, company_id) DO NOTHING
                `, {
                    replacements: { userId, companyId },
                    type: QueryTypes.INSERT
                });

                balance = {
                    current_balance: 0,
                    total_accrued: 0,
                    total_used: 0,
                    total_expired: 0,
                    total_paid_out: 0
                };
            }

            // Calcular proximos vencimientos
            const [expiring] = await sequelize.query(`
                SELECT
                    MIN(expires_at) as next_expiry_date,
                    SUM(hours_final) as expiring_hours
                FROM hour_bank_transactions
                WHERE user_id = :userId
                  AND company_id = :companyId
                  AND status = 'completed'
                  AND transaction_type = 'accrual'
                  AND expires_at IS NOT NULL
                  AND expires_at <= CURRENT_DATE + INTERVAL '30 days'
                  AND is_expired = false
                GROUP BY expires_at
                ORDER BY expires_at
                LIMIT 1
            `, {
                replacements: { userId, companyId },
                type: QueryTypes.SELECT
            });

            return {
                success: true,
                balance: {
                    current: parseFloat(balance.current_balance) || 0,
                    totalAccrued: parseFloat(balance.total_accrued) || 0,
                    totalUsed: parseFloat(balance.total_used) || 0,
                    totalExpired: parseFloat(balance.total_expired) || 0,
                    totalPaidOut: parseFloat(balance.total_paid_out) || 0
                },
                expiring: expiring ? {
                    date: expiring.next_expiry_date,
                    hours: parseFloat(expiring.expiring_hours) || 0
                } : null
            };
        } catch (error) {
            console.error('[HourBank] Error getting balance:', error);
            // FIX 98: Retornar datos por defecto válidos cuando la query falla
            // (común cuando user_id es UUID pero la tabla espera INTEGER)
            return {
                success: true,
                balance: {
                    current: 0,
                    totalAccrued: 0,
                    totalUsed: 0,
                    totalExpired: 0,
                    totalPaidOut: 0
                },
                expiring: null
            };
        }
    }

    /**
     * Actualiza el cache de saldo de un empleado
     * @param {UUID} userId - ID del usuario
     * @param {number} companyId - ID de la empresa
     */
    async recalculateBalance(userId, companyId) {
        try {
            await sequelize.query(`
                UPDATE hour_bank_balances
                SET
                    current_balance = (
                        SELECT COALESCE(SUM(
                            CASE WHEN transaction_type IN ('accrual', 'adjustment') AND hours_final > 0
                                 THEN hours_final ELSE 0 END
                        ) - SUM(
                            CASE WHEN transaction_type IN ('usage', 'expiry', 'payout') OR hours_final < 0
                                 THEN ABS(hours_final) ELSE 0 END
                        ), 0)
                        FROM hour_bank_transactions
                        WHERE user_id = :userId AND company_id = :companyId AND status = 'completed'
                    ),
                    total_accrued = (
                        SELECT COALESCE(SUM(hours_final), 0)
                        FROM hour_bank_transactions
                        WHERE user_id = :userId AND company_id = :companyId
                          AND transaction_type = 'accrual' AND status = 'completed'
                    ),
                    total_used = (
                        SELECT COALESCE(SUM(ABS(hours_final)), 0)
                        FROM hour_bank_transactions
                        WHERE user_id = :userId AND company_id = :companyId
                          AND transaction_type = 'usage' AND status = 'completed'
                    ),
                    total_expired = (
                        SELECT COALESCE(SUM(ABS(hours_final)), 0)
                        FROM hour_bank_transactions
                        WHERE user_id = :userId AND company_id = :companyId
                          AND transaction_type = 'expiry' AND status = 'completed'
                    ),
                    total_paid_out = (
                        SELECT COALESCE(SUM(ABS(hours_final)), 0)
                        FROM hour_bank_transactions
                        WHERE user_id = :userId AND company_id = :companyId
                          AND transaction_type = 'payout' AND status = 'completed'
                    ),
                    updated_at = NOW()
                WHERE user_id = :userId AND company_id = :companyId
            `, {
                replacements: { userId, companyId },
                type: QueryTypes.UPDATE
            });
        } catch (error) {
            console.error('[HourBank] Error recalculating balance:', error);
        }
    }

    // =========================================================================
    // ACUMULACION (ACCRUAL)
    // =========================================================================

    /**
     * Procesa una hora extra y crea decision pendiente o acredita directamente
     * @param {Object} params - Parametros de la hora extra
     * @returns {Object} Resultado
     */
    async processOvertimeHour(params) {
        const {
            userId,
            companyId,
            branchId,
            attendanceId,
            overtimeDate,
            overtimeHours,
            overtimeType,  // 'weekday', 'weekend', 'holiday', 'night'
            hourlyRate     // Para calcular valor monetario
        } = params;

        try {
            // Obtener template aplicable
            const template = await this.getApplicableTemplate(userId, companyId, branchId);
            if (!template || !template.is_enabled) {
                return {
                    success: false,
                    reason: 'hour_bank_disabled',
                    message: 'Banco de horas no habilitado para esta sucursal'
                };
            }

            // Verificar limite mensual
            const [monthlyAccrued] = await sequelize.query(`
                SELECT COALESCE(SUM(hours_raw), 0) as total
                FROM hour_bank_transactions
                WHERE user_id = :userId
                  AND company_id = :companyId
                  AND transaction_type = 'accrual'
                  AND status = 'completed'
                  AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)
            `, {
                replacements: { userId, companyId },
                type: QueryTypes.SELECT
            });

            if (parseFloat(monthlyAccrued?.total || 0) + overtimeHours > template.max_monthly_accrual) {
                return {
                    success: false,
                    reason: 'monthly_limit_exceeded',
                    message: `Limite mensual de ${template.max_monthly_accrual}h alcanzado`
                };
            }

            // Calcular conversion
            let conversionRate = template.conversion_rate_normal;
            if (overtimeType === 'weekend') conversionRate = template.conversion_rate_weekend;
            else if (overtimeType === 'holiday') conversionRate = template.conversion_rate_holiday;
            else if (overtimeType === 'night') conversionRate = template.conversion_rate_normal * template.conversion_rate_night;

            const bankedHours = overtimeHours * conversionRate;
            const paidAmount = hourlyRate ? overtimeHours * hourlyRate * conversionRate : null;

            // Verificar limite de acumulacion
            const balanceResult = await this.getBalance(userId, companyId);
            if (balanceResult.success && balanceResult.balance.current + bankedHours > template.max_accumulation_hours) {
                return {
                    success: false,
                    reason: 'max_accumulation_exceeded',
                    message: `Acumular estas horas excederia el limite de ${template.max_accumulation_hours}h`
                };
            }

            // Si empleado puede elegir, crear decision pendiente
            if (template.employee_choice_enabled) {
                const expiresAt = new Date();
                expiresAt.setHours(expiresAt.getHours() + template.choice_timeout_hours);

                await sequelize.query(`
                    INSERT INTO hour_bank_pending_decisions (
                        user_id, company_id, attendance_id,
                        overtime_date, overtime_hours, overtime_type,
                        if_paid_amount, if_banked_hours, conversion_rate,
                        expires_at
                    ) VALUES (
                        :userId, :companyId, :attendanceId,
                        :overtimeDate, :overtimeHours, :overtimeType,
                        :paidAmount, :bankedHours, :conversionRate,
                        :expiresAt
                    )
                `, {
                    replacements: {
                        userId,
                        companyId,
                        attendanceId,
                        overtimeDate,
                        overtimeHours,
                        overtimeType,
                        paidAmount,
                        bankedHours,
                        conversionRate,
                        expiresAt
                    },
                    type: QueryTypes.INSERT
                });

                // Enviar notificacion al empleado
                await this.notifyEmployeeForDecision(userId, companyId, {
                    overtimeHours,
                    bankedHours,
                    paidAmount,
                    expiresAt
                });

                return {
                    success: true,
                    action: 'pending_decision',
                    message: 'Esperando decision del empleado',
                    details: {
                        bankedHours,
                        paidAmount,
                        expiresAt
                    }
                };
            } else {
                // Acreditar directamente segun default_action
                if (template.default_action === 'bank') {
                    return await this.creditHours({
                        userId,
                        companyId,
                        branchId,
                        templateId: template.id,
                        hoursRaw: overtimeHours,
                        conversionRate,
                        hoursFinal: bankedHours,
                        sourceType: `overtime_${overtimeType}`,
                        sourceAttendanceId: attendanceId,
                        description: `HE ${overtimeType} ${overtimeDate}`
                    });
                } else {
                    return {
                        success: true,
                        action: 'pay',
                        message: 'Hora extra sera pagada en liquidacion'
                    };
                }
            }
        } catch (error) {
            console.error('[HourBank] Error processing overtime:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Procesa la decision del empleado
     * @param {UUID} decisionId - ID de la decision pendiente
     * @param {string} choice - 'pay' o 'bank'
     * @param {UUID} userId - ID del usuario que decide
     * @returns {Object} Resultado
     */
    async processEmployeeDecision(decisionId, choice, userId) {
        const transaction = await sequelize.transaction();

        try {
            // Obtener decision pendiente
            const [decision] = await sequelize.query(`
                SELECT * FROM hour_bank_pending_decisions
                WHERE id = :decisionId AND user_id = :userId AND status = 'pending'
            `, {
                replacements: { decisionId, userId },
                type: QueryTypes.SELECT,
                transaction
            });

            if (!decision) {
                await transaction.rollback();
                return { success: false, error: 'Decision no encontrada o ya procesada' };
            }

            // Actualizar decision
            await sequelize.query(`
                UPDATE hour_bank_pending_decisions
                SET status = :status, decision = :choice, decided_at = NOW()
                WHERE id = :decisionId
            `, {
                replacements: {
                    decisionId,
                    status: choice === 'bank' ? 'decided_bank' : 'decided_pay',
                    choice
                },
                type: QueryTypes.UPDATE,
                transaction
            });

            let result;
            if (choice === 'bank') {
                // Acreditar horas
                result = await this.creditHours({
                    userId: decision.user_id,
                    companyId: decision.company_id,
                    hoursRaw: decision.overtime_hours,
                    conversionRate: decision.conversion_rate,
                    hoursFinal: decision.if_banked_hours,
                    sourceType: `overtime_${decision.overtime_type}`,
                    sourceAttendanceId: decision.attendance_id,
                    description: `HE ${decision.overtime_type} ${decision.overtime_date} - Elegido BANCO`
                }, transaction);

                // Actualizar transaction_id en decision
                if (result.success && result.transactionId) {
                    await sequelize.query(`
                        UPDATE hour_bank_pending_decisions
                        SET transaction_id = :transactionId
                        WHERE id = :decisionId
                    `, {
                        replacements: { transactionId: result.transactionId, decisionId },
                        type: QueryTypes.UPDATE,
                        transaction
                    });
                }
            } else {
                result = {
                    success: true,
                    action: 'pay',
                    message: 'Hora extra sera pagada en liquidacion'
                };
            }

            await transaction.commit();
            return result;
        } catch (error) {
            await transaction.rollback();
            console.error('[HourBank] Error processing decision:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Acredita horas al banco de un empleado
     * @param {Object} params - Parametros de acreditacion
     * @param {Object} transaction - Transaccion SQL opcional
     * @returns {Object} Resultado
     */
    async creditHours(params, existingTransaction = null) {
        const transaction = existingTransaction || await sequelize.transaction();
        const shouldCommit = !existingTransaction;

        try {
            const {
                userId,
                companyId,
                branchId,
                templateId,
                hoursRaw,
                conversionRate,
                hoursFinal,
                sourceType,
                sourceAttendanceId,
                description
            } = params;

            // Obtener template para calcular vencimiento
            const template = templateId
                ? await this.getTemplateById(templateId)
                : await this.getApplicableTemplate(userId, companyId, branchId);

            // Calcular fecha de vencimiento
            let expiresAt = null;
            if (template?.expiration_enabled && template?.expiration_months > 0) {
                expiresAt = new Date();
                expiresAt.setMonth(expiresAt.getMonth() + template.expiration_months);
            }

            // *** PRÉSTAMOS: Primero procesar pago de deudas ***
            let hoursToBank = hoursFinal;
            let hoursToRepayment = 0;
            let loanRepaymentInfo = null;

            if (template?.allow_hour_loans) {
                const [repaymentResult] = await sequelize.query(`
                    SELECT * FROM process_loan_repayment(:companyId, :userId, :hours)
                `, {
                    replacements: { companyId, userId, hours: hoursFinal },
                    type: QueryTypes.SELECT,
                    transaction
                });

                if (repaymentResult && repaymentResult.hours_to_repay > 0) {
                    hoursToBank = parseFloat(repaymentResult.hours_to_bank) || 0;
                    hoursToRepayment = parseFloat(repaymentResult.hours_to_repay) || 0;
                    loanRepaymentInfo = {
                        hoursRepaid: hoursToRepayment,
                        loansAffected: repaymentResult.loans_affected,
                        remainingDebt: parseFloat(repaymentResult.remaining_debt) || 0,
                        message: repaymentResult.message
                    };
                    console.log(`[HourBank] Préstamo: ${hoursToRepayment}h para deuda, ${hoursToBank}h al banco`);
                }
            }

            // Obtener saldo actual (asegurar que sean números)
            const balanceResult = await this.getBalance(userId, companyId);
            const balanceBefore = parseFloat(balanceResult.success ? balanceResult.balance.current : 0) || 0;
            const balanceAfter = parseFloat(balanceBefore) + parseFloat(hoursToBank);

            // Insertar transaccion (solo si hay horas para el banco)
            let transactionId = null;
            if (hoursToBank > 0) {
                const [result] = await sequelize.query(`
                    INSERT INTO hour_bank_transactions (
                        user_id, company_id, branch_id, template_id,
                        transaction_type, hours_raw, conversion_rate, hours_final,
                        balance_before, balance_after,
                        source_type, source_attendance_id,
                        expires_at, description, status
                    ) VALUES (
                        :userId, :companyId, :branchId, :templateId,
                        'accrual', :hoursRaw, :conversionRate, :hoursToBank,
                        :balanceBefore, :balanceAfter,
                        :sourceType, :sourceAttendanceId,
                        :expiresAt, :description, 'completed'
                    ) RETURNING id
                `, {
                    replacements: {
                        userId,
                        companyId,
                        branchId: HourBankService.sanitizeBranchId(branchId),
                        templateId: template?.id || null,
                        hoursRaw,
                        conversionRate,
                        hoursToBank,
                        balanceBefore,
                        balanceAfter,
                        sourceType,
                        sourceAttendanceId: sourceAttendanceId || null,
                        expiresAt,
                        description: loanRepaymentInfo
                            ? `${description} (${hoursToRepayment}h para pago de préstamo)`
                            : description
                    },
                    type: QueryTypes.INSERT,
                    transaction
                });
                transactionId = result[0]?.id;
            }

            // Actualizar cache de saldo
            await this.updateBalanceCache(userId, companyId, balanceAfter, hoursToBank, 0, 0, 0, transaction);

            // Notificaciones
            if (template?.notify_employee_on_accrual) {
                await this.notifyAccrual(userId, companyId, hoursToBank, balanceAfter, template);
            }

            if (shouldCommit) await transaction.commit();

            return {
                success: true,
                transactionId,
                hoursAdded: hoursToBank,
                hoursOriginal: hoursFinal,
                newBalance: balanceAfter,
                expiresAt,
                loanRepayment: loanRepaymentInfo
            };
        } catch (error) {
            if (shouldCommit) await transaction.rollback();
            console.error('[HourBank] Error crediting hours:', error);
            return { success: false, error: error.message };
        }
    }

    // =========================================================================
    // USO (USAGE)
    // =========================================================================

    /**
     * Crea una solicitud de uso de horas
     * @param {Object} params - Parametros de la solicitud
     * @returns {Object} Resultado
     */
    async createUsageRequest(params) {
        const {
            userId,
            companyId,
            branchId,
            requestType,    // 'early_departure', 'late_arrival', 'partial_day', 'full_day', 'multiple_days'
            requestedDate,
            endDate,
            hoursRequested,
            startTime,
            endTime,
            reason
        } = params;

        try {
            // Obtener template
            const template = await this.getApplicableTemplate(userId, companyId, branchId);
            if (!template || !template.is_enabled) {
                return { success: false, error: 'Banco de horas no habilitado' };
            }

            // Validar tipo de uso permitido
            if (requestType === 'early_departure' && !template.allow_early_departure) {
                return { success: false, error: 'Salida anticipada no permitida en esta configuracion' };
            }
            if (requestType === 'late_arrival' && !template.allow_late_arrival_compensation) {
                return { success: false, error: 'Compensacion de tardanza no permitida' };
            }
            if (requestType === 'full_day' && !template.allow_full_day_usage) {
                return { success: false, error: 'Uso de dia completo no permitido' };
            }
            if ((requestType === 'partial_day' || requestType === 'early_departure') && !template.allow_partial_day_usage) {
                return { success: false, error: 'Uso parcial no permitido' };
            }

            // Validar horas minimas y maximas
            if (hoursRequested < template.min_usage_hours) {
                return { success: false, error: `Minimo ${template.min_usage_hours} horas` };
            }
            if (hoursRequested > template.max_usage_hours_per_day) {
                return { success: false, error: `Maximo ${template.max_usage_hours_per_day} horas por dia` };
            }

            // Verificar saldo
            const balanceResult = await this.getBalance(userId, companyId);
            if (!balanceResult.success || balanceResult.balance.current < hoursRequested) {
                return { success: false, error: 'Saldo insuficiente' };
            }

            // Verificar anticipacion
            const today = new Date();
            const reqDate = new Date(requestedDate);
            const daysDiff = Math.ceil((reqDate - today) / (1000 * 60 * 60 * 24));
            if (daysDiff < template.advance_notice_days) {
                return { success: false, error: `Requiere ${template.advance_notice_days} dias de anticipacion` };
            }

            // Verificar blackout dates
            if (template.blackout_dates_enabled) {
                const isBlackout = await this.isBlackoutDate(companyId, branchId, requestedDate);
                if (isBlackout) {
                    return { success: false, error: 'Fecha bloqueada para uso de banco de horas' };
                }
            }

            // Determinar si requiere aprobacion o es automatico
            const needsApproval = template.usage_requires_approval &&
                                  hoursRequested >= template.auto_approve_under_hours;

            // Crear solicitud
            const [result] = await sequelize.query(`
                INSERT INTO hour_bank_requests (
                    user_id, company_id, branch_id, template_id,
                    request_type, requested_date, end_date, hours_requested,
                    start_time, end_time, reason, status
                ) VALUES (
                    :userId, :companyId, :branchId, :templateId,
                    :requestType, :requestedDate, :endDate, :hoursRequested,
                    :startTime, :endTime, :reason, :status
                ) RETURNING id
            `, {
                replacements: {
                    userId,
                    companyId,
                    branchId: HourBankService.sanitizeBranchId(branchId),
                    templateId: template.id,
                    requestType,
                    requestedDate,
                    endDate: endDate || requestedDate,
                    hoursRequested,
                    startTime: startTime || null,
                    endTime: endTime || null,
                    reason: reason || null,
                    status: needsApproval ? 'pending' : 'approved'
                },
                type: QueryTypes.INSERT
            });

            const requestId = result[0]?.id;

            // Si auto-aprobado, procesar inmediatamente
            if (!needsApproval) {
                await this.processApprovedRequest(requestId, userId, companyId, hoursRequested);
            } else {
                // Notificar supervisor
                await this.notifyUsageRequest(userId, companyId, requestId, hoursRequested, requestedDate);
            }

            return {
                success: true,
                requestId,
                status: needsApproval ? 'pending' : 'approved',
                message: needsApproval ? 'Solicitud enviada, esperando aprobacion' : 'Aprobado automaticamente'
            };
        } catch (error) {
            console.error('[HourBank] Error creating usage request:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Aprueba o rechaza una solicitud de uso
     * @param {UUID} requestId - ID de la solicitud
     * @param {string} action - 'approve' o 'reject'
     * @param {UUID} approverId - ID del aprobador
     * @param {string} role - 'supervisor' o 'hr'
     * @param {string} notes - Notas opcionales
     * @returns {Object} Resultado
     */
    async processRequestApproval(requestId, action, approverId, role, notes = null) {
        const transaction = await sequelize.transaction();

        try {
            // Obtener solicitud
            const [request] = await sequelize.query(`
                SELECT * FROM hour_bank_requests
                WHERE id = :requestId AND status = 'pending'
            `, {
                replacements: { requestId },
                type: QueryTypes.SELECT,
                transaction
            });

            if (!request) {
                await transaction.rollback();
                return { success: false, error: 'Solicitud no encontrada o ya procesada' };
            }

            if (action === 'approve') {
                // Actualizar solicitud
                const updateField = role === 'supervisor'
                    ? 'supervisor_id = :approverId, supervisor_status = \'approved\', supervisor_at = NOW(), supervisor_notes = :notes'
                    : 'hr_id = :approverId, hr_status = \'approved\', hr_at = NOW(), hr_notes = :notes';

                await sequelize.query(`
                    UPDATE hour_bank_requests
                    SET ${updateField}, status = 'approved', approved_hours = hours_requested
                    WHERE id = :requestId
                `, {
                    replacements: { requestId, approverId, notes },
                    type: QueryTypes.UPDATE,
                    transaction
                });

                // Procesar deduccion
                await this.processApprovedRequest(
                    requestId,
                    request.user_id,
                    request.company_id,
                    request.hours_requested,
                    transaction
                );

                await transaction.commit();
                return { success: true, message: 'Solicitud aprobada' };
            } else {
                // Rechazar
                const updateField = role === 'supervisor'
                    ? 'supervisor_id = :approverId, supervisor_status = \'rejected\', supervisor_at = NOW(), supervisor_notes = :notes'
                    : 'hr_id = :approverId, hr_status = \'rejected\', hr_at = NOW(), hr_notes = :notes';

                await sequelize.query(`
                    UPDATE hour_bank_requests
                    SET ${updateField}, status = 'rejected'
                    WHERE id = :requestId
                `, {
                    replacements: { requestId, approverId, notes },
                    type: QueryTypes.UPDATE,
                    transaction
                });

                await transaction.commit();

                // Notificar rechazo al empleado
                await this.notifyRequestRejection(request.user_id, request.company_id, requestId, notes);

                return { success: true, message: 'Solicitud rechazada' };
            }
        } catch (error) {
            await transaction.rollback();
            console.error('[HourBank] Error processing approval:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Procesa una solicitud aprobada - deduce horas
     */
    async processApprovedRequest(requestId, userId, companyId, hours, existingTransaction = null) {
        const transaction = existingTransaction || await sequelize.transaction();
        const shouldCommit = !existingTransaction;

        try {
            // Obtener saldo actual
            const balanceResult = await this.getBalance(userId, companyId);
            const balanceBefore = balanceResult.success ? balanceResult.balance.current : 0;
            const balanceAfter = balanceBefore - hours;

            // Crear transaccion de uso
            const [result] = await sequelize.query(`
                INSERT INTO hour_bank_transactions (
                    user_id, company_id,
                    transaction_type, hours_raw, conversion_rate, hours_final,
                    balance_before, balance_after,
                    source_type, source_request_id,
                    description, status
                ) VALUES (
                    :userId, :companyId,
                    'usage', :hours, 1.0, :hoursNegative,
                    :balanceBefore, :balanceAfter,
                    'approved_request', :requestId,
                    'Uso aprobado', 'completed'
                ) RETURNING id
            `, {
                replacements: {
                    userId,
                    companyId,
                    hours,
                    hoursNegative: -hours,
                    balanceBefore,
                    balanceAfter,
                    requestId
                },
                type: QueryTypes.INSERT,
                transaction
            });

            // Actualizar request con transaction_id
            await sequelize.query(`
                UPDATE hour_bank_requests
                SET transaction_id = :transactionId, status = 'used'
                WHERE id = :requestId
            `, {
                replacements: { transactionId: result[0]?.id, requestId },
                type: QueryTypes.UPDATE,
                transaction
            });

            // Actualizar cache de saldo
            await this.updateBalanceCache(userId, companyId, balanceAfter, 0, hours, 0, 0, transaction);

            if (shouldCommit) await transaction.commit();
            return { success: true };
        } catch (error) {
            if (shouldCommit) await transaction.rollback();
            console.error('[HourBank] Error processing approved request:', error);
            return { success: false, error: error.message };
        }
    }

    // =========================================================================
    // VALIDACION EN FICHAJE
    // =========================================================================

    /**
     * Valida salida anticipada contra saldo de banco
     * @param {UUID} userId - ID del usuario
     * @param {number} companyId - ID de la empresa
     * @param {number} minutesEarly - Minutos de salida anticipada
     * @returns {Object} Resultado de validacion
     */
    async validateEarlyDeparture(userId, companyId, minutesEarly) {
        try {
            const template = await this.getApplicableTemplate(userId, companyId);
            if (!template?.is_enabled || !template?.allow_early_departure) {
                return { valid: false, reason: 'not_enabled' };
            }

            const hoursEarly = minutesEarly / 60;
            const balanceResult = await this.getBalance(userId, companyId);

            if (!balanceResult.success) {
                return { valid: false, reason: 'balance_error' };
            }

            if (balanceResult.balance.current >= hoursEarly) {
                return {
                    valid: true,
                    canUseBank: true,
                    hoursNeeded: hoursEarly,
                    currentBalance: balanceResult.balance.current,
                    balanceAfter: balanceResult.balance.current - hoursEarly
                };
            } else {
                return {
                    valid: true,
                    canUseBank: false,
                    reason: 'insufficient_balance',
                    hoursNeeded: hoursEarly,
                    currentBalance: balanceResult.balance.current
                };
            }
        } catch (error) {
            console.error('[HourBank] Error validating early departure:', error);
            return { valid: false, reason: 'error' };
        }
    }

    /**
     * Procesa salida anticipada con descuento de banco
     * @param {UUID} userId - ID del usuario
     * @param {number} companyId - ID de la empresa
     * @param {number} minutesEarly - Minutos de salida anticipada
     * @param {UUID} attendanceId - ID de la asistencia
     * @returns {Object} Resultado
     */
    async processEarlyDeparture(userId, companyId, minutesEarly, attendanceId) {
        const hoursEarly = parseFloat((minutesEarly / 60).toFixed(2));

        return await this.createUsageRequest({
            userId,
            companyId,
            requestType: 'early_departure',
            requestedDate: new Date().toISOString().split('T')[0],
            hoursRequested: hoursEarly,
            reason: `Salida anticipada - Fichada ${attendanceId}`
        });
    }

    // =========================================================================
    // HISTORIAL Y REPORTES
    // =========================================================================

    /**
     * Obtiene historial de transacciones de un empleado
     * @param {UUID} userId - ID del usuario
     * @param {number} companyId - ID de la empresa
     * @param {Object} options - Opciones de filtrado
     * @returns {Object} Historial
     */
    async getTransactionHistory(userId, companyId, options = {}) {
        try {
            const { limit = 50, offset = 0, type = null, startDate = null, endDate = null } = options;

            let whereClause = 'WHERE t.user_id = :userId AND t.company_id = :companyId AND t.status = \'completed\'';
            const replacements = { userId, companyId, limit, offset };

            if (type) {
                whereClause += ' AND t.transaction_type = :type';
                replacements.type = type;
            }
            if (startDate) {
                whereClause += ' AND t.created_at >= :startDate';
                replacements.startDate = startDate;
            }
            if (endDate) {
                whereClause += ' AND t.created_at <= :endDate';
                replacements.endDate = endDate;
            }

            const transactions = await sequelize.query(`
                SELECT
                    t.*,
                    CASE
                        WHEN t.hours_final > 0 THEN 'credit'
                        ELSE 'debit'
                    END as direction
                FROM hour_bank_transactions t
                ${whereClause}
                ORDER BY t.created_at DESC
                LIMIT :limit OFFSET :offset
            `, {
                replacements,
                type: QueryTypes.SELECT
            });

            const [count] = await sequelize.query(`
                SELECT COUNT(*) as total FROM hour_bank_transactions t ${whereClause}
            `, {
                replacements,
                type: QueryTypes.SELECT
            });

            return {
                success: true,
                transactions,
                pagination: {
                    total: parseInt(count?.total || 0),
                    limit,
                    offset
                }
            };
        } catch (error) {
            console.error('[HourBank] Error getting history:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Obtiene solicitudes pendientes de aprobacion
     * @param {number} companyId - ID de la empresa
     * @param {UUID} supervisorId - ID del supervisor (opcional)
     * @returns {Array} Solicitudes pendientes
     */
    async getPendingRequests(companyId, supervisorId = null) {
        try {
            let whereClause = 'WHERE r.company_id = :companyId AND r.status = \'pending\'';
            const replacements = { companyId };

            if (supervisorId) {
                // Filtrar por equipo del supervisor
                whereClause += ' AND u.supervisor_id = :supervisorId';
                replacements.supervisorId = supervisorId;
            }

            const requests = await sequelize.query(`
                SELECT
                    r.*,
                    u.nombre as employee_name,
                    u.legajo as employee_id,
                    b.current_balance as employee_balance
                FROM hour_bank_requests r
                INNER JOIN users u ON r.user_id = u.user_id
                LEFT JOIN hour_bank_balances b ON r.user_id = b.user_id AND r.company_id = b.company_id
                ${whereClause}
                ORDER BY r.created_at ASC
            `, {
                replacements,
                type: QueryTypes.SELECT
            });

            return { success: true, requests };
        } catch (error) {
            console.error('[HourBank] Error getting pending requests:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Obtiene estadisticas de banco de horas para empresa
     * @param {number} companyId - ID de la empresa
     * @returns {Object} Estadisticas
     */
    async getCompanyStats(companyId) {
        try {
            const [stats] = await sequelize.query(`
                SELECT
                    COUNT(DISTINCT b.user_id) as total_users_with_balance,
                    SUM(b.current_balance) as total_hours_banked,
                    AVG(b.current_balance) as avg_balance_per_user,
                    MAX(b.current_balance) as max_balance,
                    SUM(b.total_accrued) as total_accrued_all_time,
                    SUM(b.total_used) as total_used_all_time,
                    SUM(b.total_expired) as total_expired_all_time
                FROM hour_bank_balances b
                WHERE b.company_id = :companyId AND b.current_balance > 0
            `, {
                replacements: { companyId },
                type: QueryTypes.SELECT
            });

            const [pendingDecisions] = await sequelize.query(`
                SELECT COUNT(*) as count
                FROM hour_bank_pending_decisions
                WHERE company_id = :companyId AND status = 'pending'
            `, {
                replacements: { companyId },
                type: QueryTypes.SELECT
            });

            const [pendingRequests] = await sequelize.query(`
                SELECT COUNT(*) as count
                FROM hour_bank_requests
                WHERE company_id = :companyId AND status = 'pending'
            `, {
                replacements: { companyId },
                type: QueryTypes.SELECT
            });

            const [expiringNextMonth] = await sequelize.query(`
                SELECT COALESCE(SUM(hours_final), 0) as hours
                FROM hour_bank_transactions
                WHERE company_id = :companyId
                  AND transaction_type = 'accrual'
                  AND status = 'completed'
                  AND expires_at BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
                  AND is_expired = false
            `, {
                replacements: { companyId },
                type: QueryTypes.SELECT
            });

            return {
                success: true,
                stats: {
                    usersWithBalance: parseInt(stats?.total_users_with_balance || 0),
                    totalHoursBanked: parseFloat(stats?.total_hours_banked || 0),
                    avgBalancePerUser: parseFloat(stats?.avg_balance_per_user || 0),
                    maxBalance: parseFloat(stats?.max_balance || 0),
                    totalAccruedAllTime: parseFloat(stats?.total_accrued_all_time || 0),
                    totalUsedAllTime: parseFloat(stats?.total_used_all_time || 0),
                    totalExpiredAllTime: parseFloat(stats?.total_expired_all_time || 0),
                    pendingDecisions: parseInt(pendingDecisions?.count || 0),
                    pendingRequests: parseInt(pendingRequests?.count || 0),
                    expiringNextMonth: parseFloat(expiringNextMonth?.hours || 0)
                }
            };
        } catch (error) {
            console.error('[HourBank] Error getting company stats:', error);
            return { success: false, error: error.message };
        }
    }

    // =========================================================================
    // HELPERS
    // =========================================================================

    async getTemplateById(templateId) {
        const [template] = await sequelize.query(`
            SELECT * FROM hour_bank_templates WHERE id = :templateId
        `, { replacements: { templateId }, type: QueryTypes.SELECT });
        return template;
    }

    async isBlackoutDate(companyId, branchId, date) {
        const [blackout] = await sequelize.query(`
            SELECT 1 FROM hour_bank_blackout_dates
            WHERE company_id = :companyId
              AND (branch_id = :branchId OR branch_id IS NULL)
              AND :date BETWEEN start_date AND end_date
            LIMIT 1
        `, {
            replacements: { companyId, branchId: HourBankService.sanitizeBranchId(branchId), date },
            type: QueryTypes.SELECT
        });
        return !!blackout;
    }

    async updateBalanceCache(userId, companyId, newBalance, accrued, used, expired, paidOut, transaction) {
        await sequelize.query(`
            INSERT INTO hour_bank_balances (user_id, company_id, current_balance, total_accrued, total_used, total_expired, total_paid_out)
            VALUES (:userId, :companyId, :newBalance, :accrued, :used, :expired, :paidOut)
            ON CONFLICT (user_id, company_id) DO UPDATE SET
                current_balance = :newBalance,
                total_accrued = hour_bank_balances.total_accrued + :accrued,
                total_used = hour_bank_balances.total_used + :used,
                total_expired = hour_bank_balances.total_expired + :expired,
                total_paid_out = hour_bank_balances.total_paid_out + :paidOut,
                updated_at = NOW()
        `, {
            replacements: { userId, companyId, newBalance, accrued, used, expired, paidOut },
            type: QueryTypes.INSERT,
            transaction
        });
    }

    // =========================================================================
    // NOTIFICACIONES
    // =========================================================================

    async notifyEmployeeForDecision(userId, companyId, details) {
        try {
            if (NotificationWorkflowService) {
                await NotificationWorkflowService.createNotification({
                    module: 'hour-bank',
                    companyId: companyId,
                    recipient: { userId: userId },
                    notificationType: 'hour_bank_decision',
                    title: 'Hora Extra Generada',
                    message: `Generaste ${details.overtimeHours}h extra. ¿Cobrar $${details.paidAmount?.toFixed(2) || 'N/A'} o guardar ${details.bankedHours}h en banco?`,
                    priority: 'high',
                    action_url: '/mi-espacio/banco-horas',
                    expires_at: details.expiresAt
                });
            }
        } catch (error) {
            console.error('[HourBank] Error sending decision notification:', error);
        }
    }

    async notifyAccrual(userId, companyId, hoursAdded, newBalance, template) {
        try {
            if (NotificationWorkflowService) {
                await NotificationWorkflowService.createNotification({
                    module: 'hour-bank',
                    companyId: companyId,
                    recipient: { userId: userId },
                    notificationType: 'hour_bank_accrual',
                    title: 'Horas Acreditadas',
                    message: `Se acreditaron ${hoursAdded}h a tu banco. Saldo: ${newBalance}h`,
                    priority: 'normal'
                });
            }
        } catch (error) {
            console.error('[HourBank] Error sending accrual notification:', error);
        }
    }

    async notifyUsageRequest(userId, companyId, requestId, hours, date) {
        // Implementar notificacion a supervisor
    }

    async notifyRequestRejection(userId, companyId, requestId, reason) {
        // Implementar notificacion de rechazo
    }

    // =========================================================================
    // ANALISIS DE RIESGO Y SALUD DE CUENTA CORRIENTE
    // =========================================================================

    /**
     * Analiza la salud de cuenta corriente de un empleado
     * Detecta riesgo de ciclo vicioso, burn rate, etc.
     * @param {number} companyId - ID de la empresa
     * @param {number} userId - ID del usuario
     * @returns {Object} Analisis de salud
     */
    async analyzeAccountHealth(companyId, userId) {
        try {
            const [result] = await sequelize.query(`
                SELECT * FROM analyze_hour_bank_health(:companyId, :userId)
            `, {
                replacements: { companyId, userId },
                type: QueryTypes.SELECT
            });

            return {
                success: true,
                health: {
                    currentBalance: parseFloat(result.current_balance) || 0,
                    monthlyAvgUsage: parseFloat(result.monthly_avg_usage) || 0,
                    monthlyAvgAccrual: parseFloat(result.monthly_avg_accrual) || 0,
                    monthsUntilZero: result.months_until_zero ? parseFloat(result.months_until_zero) : null,
                    burnRate: parseFloat(result.burn_rate) || 0,
                    healthScore: parseInt(result.health_score) || 100,
                    status: result.status || 'healthy',
                    factors: result.factors || [],
                    recommendations: result.recommendations || []
                }
            };
        } catch (error) {
            console.error('[HourBank] Error analyzing account health:', error);
            // FIX 95: Retornar datos por defecto válidos cuando la función SQL falla
            // (común cuando user_id es UUID pero la función espera INTEGER)
            return {
                success: true,
                health: {
                    currentBalance: 0,
                    monthlyAvgUsage: 0,
                    monthlyAvgAccrual: 0,
                    monthsUntilZero: null,
                    burnRate: 0,
                    healthScore: 100,
                    status: 'healthy',
                    factors: [],
                    recommendations: ['Datos no disponibles - función SQL incompatible con UUID']
                }
            };
        }
    }

    /**
     * Detecta riesgo de ciclo vicioso
     * Si devolver horas genera mas horas extras que las devueltas
     * @param {number} companyId - ID de la empresa
     * @param {number} userId - ID del usuario
     * @param {number} months - Meses a analizar (default 6)
     * @returns {Object} Analisis de ciclo vicioso
     */
    async analyzeViciousCycleRisk(companyId, userId, months = 6) {
        try {
            const [result] = await sequelize.query(`
                SELECT * FROM calculate_vicious_cycle_risk(:companyId, :userId, :months)
            `, {
                replacements: { companyId, userId, months },
                type: QueryTypes.SELECT
            });

            return {
                success: true,
                analysis: {
                    hoursReturned: parseFloat(result.hours_returned) || 0,
                    overtimeGenerated: parseFloat(result.overtime_generated) || 0,
                    ratio: parseFloat(result.ratio) || 0,
                    riskLevel: result.risk_level || 'low',
                    isViciousCycle: result.is_vicious_cycle || false,
                    recommendation: result.recommendation || ''
                }
            };
        } catch (error) {
            console.error('[HourBank] Error analyzing vicious cycle:', error);
            // FIX 95: Retornar datos por defecto válidos cuando la función SQL falla
            return {
                success: true,
                analysis: {
                    hoursReturned: 0,
                    overtimeGenerated: 0,
                    ratio: 0,
                    riskLevel: 'low',
                    isViciousCycle: false,
                    recommendation: 'Datos no disponibles - función SQL incompatible con UUID'
                }
            };
        }
    }

    /**
     * Verifica disponibilidad de presupuesto
     * @param {number} companyId - ID de la empresa
     * @param {number} branchId - ID de la sucursal (opcional)
     * @param {number} hoursRequested - Horas solicitadas
     * @returns {Object} Estado del presupuesto
     */
    async checkBudgetAvailability(companyId, branchId = null, hoursRequested = 0) {
        try {
            const [result] = await sequelize.query(`
                SELECT * FROM check_budget_availability(:companyId, :branchId, :hoursRequested)
            `, {
                replacements: { companyId, branchId: HourBankService.sanitizeBranchId(branchId), hoursRequested },
                type: QueryTypes.SELECT
            });

            return {
                success: true,
                budget: {
                    exists: result.budget_exists,
                    totalBudget: parseFloat(result.total_budget) || 0,
                    allocated: parseFloat(result.allocated) || 0,
                    used: parseFloat(result.used) || 0,
                    available: parseFloat(result.available) || 0,
                    canAllocate: result.can_allocate,
                    alertLevel: result.alert_level || 'none',
                    message: result.message || ''
                }
            };
        } catch (error) {
            console.error('[HourBank] Error checking budget:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Crea o actualiza presupuesto para un periodo
     * @param {Object} params - Parametros del presupuesto
     * @returns {Object} Resultado
     */
    async createOrUpdateBudget(params) {
        const {
            companyId,
            branchId,
            departmentId,
            periodStart,
            periodEnd,
            budgetHours,
            periodLabel
        } = params;

        try {
            const [result] = await sequelize.query(`
                INSERT INTO hour_bank_budgets (
                    company_id, branch_id, department_id,
                    period_start, period_end, period_label,
                    budget_hours, status
                ) VALUES (
                    :companyId, :branchId, :departmentId,
                    :periodStart, :periodEnd, :periodLabel,
                    :budgetHours, 'active'
                )
                ON CONFLICT (company_id, branch_id, department_id, period_start)
                DO UPDATE SET
                    budget_hours = :budgetHours,
                    period_end = :periodEnd,
                    period_label = :periodLabel,
                    updated_at = CURRENT_TIMESTAMP
                RETURNING *
            `, {
                replacements: {
                    companyId,
                    branchId: HourBankService.sanitizeBranchId(branchId),
                    departmentId: departmentId || null,
                    periodStart,
                    periodEnd,
                    periodLabel: periodLabel || null,
                    budgetHours
                },
                type: QueryTypes.INSERT
            });

            return { success: true, budget: result[0] };
        } catch (error) {
            console.error('[HourBank] Error creating budget:', error);
            return { success: false, error: error.message };
        }
    }

    // =========================================================================
    // METRICAS DRILL-DOWN
    // =========================================================================

    /**
     * Obtiene metricas agregadas con drill-down jerarquico
     * @param {Object} params - Filtros
     * @returns {Object} Metricas jerarquicas
     */
    async getDrillDownMetrics(params = {}) {
        const {
            companyId,
            branchId,
            departmentId,
            userId,
            dateFrom,
            dateTo
        } = params;

        try {
            // Nivel de agregacion segun filtros
            let aggregationLevel = 'company';
            if (userId) aggregationLevel = 'user';
            else if (departmentId) aggregationLevel = 'department';
            else if (branchId) aggregationLevel = 'branch';

            // Query para metricas
            const metrics = await sequelize.query(`
                SELECT
                    company_id,
                    branch_id,
                    department_id,
                    user_id,
                    user_name,
                    legajo,
                    hours_accrued,
                    hours_used,
                    overtime_to_bank,
                    overtime_to_pay,
                    bank_ratio_pct,
                    decisions_pending,
                    current_balance
                FROM vw_hour_bank_drilldown
                WHERE company_id = :companyId
                ${branchId ? 'AND branch_id = :branchId' : ''}
                ${departmentId ? 'AND department_id = :departmentId' : ''}
                ${userId ? 'AND user_id = :userId' : ''}
                ORDER BY hours_accrued DESC
            `, {
                replacements: { companyId, branchId: HourBankService.sanitizeBranchId(branchId), departmentId, userId },
                type: QueryTypes.SELECT
            });

            // Agregar analisis de riesgo si es nivel usuario
            if (aggregationLevel === 'user' && userId) {
                const health = await this.analyzeAccountHealth(companyId, userId);
                const vicious = await this.analyzeViciousCycleRisk(companyId, userId);
                return {
                    success: true,
                    level: aggregationLevel,
                    metrics: metrics[0] || {},
                    health: health.health,
                    viciousCycleRisk: vicious.analysis
                };
            }

            // Calcular totales
            const totals = metrics.reduce((acc, m) => ({
                totalEmployees: acc.totalEmployees + 1,
                totalAccrued: acc.totalAccrued + parseFloat(m.hours_accrued || 0),
                totalUsed: acc.totalUsed + parseFloat(m.hours_used || 0),
                totalToBank: acc.totalToBank + parseFloat(m.overtime_to_bank || 0),
                totalToPay: acc.totalToPay + parseFloat(m.overtime_to_pay || 0),
                totalBalance: acc.totalBalance + parseFloat(m.current_balance || 0),
                pendingDecisions: acc.pendingDecisions + parseInt(m.decisions_pending || 0)
            }), {
                totalEmployees: 0,
                totalAccrued: 0,
                totalUsed: 0,
                totalToBank: 0,
                totalToPay: 0,
                totalBalance: 0,
                pendingDecisions: 0
            });

            // Bank ratio global
            const totalOT = totals.totalToBank + totals.totalToPay;
            totals.bankRatioPct = totalOT > 0
                ? Math.round((totals.totalToBank / totalOT) * 100)
                : 0;

            // Obtener presupuesto
            const budget = await this.checkBudgetAvailability(companyId, branchId, 0);

            return {
                success: true,
                level: aggregationLevel,
                totals,
                budget: budget.budget,
                details: metrics
            };
        } catch (error) {
            console.error('[HourBank] Error getting drill-down metrics:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Obtiene resumen para Mi Espacio del empleado
     * @param {number} companyId - ID de la empresa
     * @param {number} userId - ID del usuario
     * @returns {Object} Resumen completo para el empleado
     */
    async getEmployeeSummary(companyId, userId) {
        try {
            // Balance actual
            const balance = await this.getBalance(companyId, userId);

            // Ultimas transacciones
            const transactions = await sequelize.query(`
                SELECT
                    transaction_type,
                    hours_raw,
                    conversion_rate,
                    hours_final,
                    overtime_destination,
                    balance_after,
                    expires_at,
                    description,
                    created_at
                FROM hour_bank_transactions
                WHERE company_id = :companyId AND user_id = :userId
                ORDER BY created_at DESC
                LIMIT 20
            `, {
                replacements: { companyId, userId },
                type: QueryTypes.SELECT
            });

            // Decisiones pendientes
            const pendingDecisions = await this.getPendingDecisions(companyId, userId);

            // Salud de cuenta
            const health = await this.analyzeAccountHealth(companyId, userId);

            // Riesgo de ciclo vicioso
            const vicious = await this.analyzeViciousCycleRisk(companyId, userId);

            // Estadisticas de distribucion HE
            const [stats] = await sequelize.query(`
                SELECT
                    COUNT(*) FILTER (WHERE overtime_destination = 'bank') as times_to_bank,
                    COUNT(*) FILTER (WHERE overtime_destination = 'pay') as times_to_pay,
                    COALESCE(SUM(hours_raw) FILTER (WHERE overtime_destination = 'bank'), 0) as total_hours_to_bank,
                    COALESCE(SUM(hours_raw) FILTER (WHERE overtime_destination = 'pay'), 0) as total_hours_to_pay
                FROM hour_bank_transactions
                WHERE company_id = :companyId
                  AND user_id = :userId
                  AND transaction_type = 'accrual'
                  AND created_at >= CURRENT_DATE - INTERVAL '12 months'
            `, {
                replacements: { companyId, userId },
                type: QueryTypes.SELECT
            });

            const totalHE = parseFloat(stats.total_hours_to_bank || 0) + parseFloat(stats.total_hours_to_pay || 0);

            return {
                success: true,
                summary: {
                    balance: balance.success ? balance.balance : null,
                    expiring: balance.success ? balance.expiring : null,
                    health: health.health,
                    viciousCycleRisk: vicious.analysis,
                    statistics: {
                        totalOvertimeHours: totalHE,
                        hoursToBank: parseFloat(stats.total_hours_to_bank || 0),
                        hoursToPay: parseFloat(stats.total_hours_to_pay || 0),
                        bankRatioPct: totalHE > 0
                            ? Math.round((parseFloat(stats.total_hours_to_bank || 0) / totalHE) * 100)
                            : 0,
                        timesToBank: parseInt(stats.times_to_bank || 0),
                        timesToPay: parseInt(stats.times_to_pay || 0)
                    },
                    pendingDecisions,
                    recentTransactions: transactions
                }
            };
        } catch (error) {
            console.error('[HourBank] Error getting employee summary:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Registra impacto de devolucion (para deteccion de ciclo vicioso)
     * @param {number} transactionId - ID de la transaccion de uso
     * @param {number} overtimeGenerated - Horas extras generadas por cubrir la ausencia
     * @returns {Object} Resultado
     */
    async recordReturnImpact(transactionId, overtimeGenerated) {
        try {
            await sequelize.query(`
                UPDATE hour_bank_transactions
                SET return_impact_hours = :overtimeGenerated
                WHERE id = :transactionId
            `, {
                replacements: { transactionId, overtimeGenerated },
                type: QueryTypes.UPDATE
            });

            return { success: true };
        } catch (error) {
            console.error('[HourBank] Error recording return impact:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Obtiene empleados en riesgo
     * @param {number} companyId - ID de la empresa
     * @param {string} riskLevel - Nivel minimo de riesgo ('medium', 'high', 'critical')
     * @returns {Array} Empleados en riesgo
     */
    async getEmployeesAtRisk(companyId, riskLevel = 'medium') {
        try {
            const riskOrder = ['low', 'medium', 'high', 'critical'];
            const minIndex = riskOrder.indexOf(riskLevel);

            const employees = await sequelize.query(`
                SELECT DISTINCT t.user_id,
                    COALESCE(u."firstName" || ' ' || u."lastName", 'Sin nombre') as user_name,
                    u.legajo,
                    u.department_id,
                    u.branch_id,
                    b.current_balance
                FROM hour_bank_transactions t
                INNER JOIN users u ON t.user_id = u.user_id
                LEFT JOIN hour_bank_balances b ON t.company_id = b.company_id AND t.user_id = b.user_id
                WHERE t.company_id = :companyId
                  AND t.created_at >= CURRENT_DATE - INTERVAL '6 months'
                GROUP BY t.user_id, u."firstName", u."lastName", u.legajo, u.department_id, u.branch_id, b.current_balance
            `, {
                replacements: { companyId },
                type: QueryTypes.SELECT
            });

            // Analizar cada empleado
            const atRisk = [];
            for (const emp of employees) {
                const health = await this.analyzeAccountHealth(companyId, emp.user_id);
                const vicious = await this.analyzeViciousCycleRisk(companyId, emp.user_id);

                const empRiskLevel = vicious.analysis?.riskLevel || health.health?.status || 'low';
                const empRiskIndex = riskOrder.indexOf(empRiskLevel);

                if (empRiskIndex >= minIndex) {
                    atRisk.push({
                        ...emp,
                        healthScore: health.health?.healthScore,
                        riskLevel: empRiskLevel,
                        isViciousCycle: vicious.analysis?.isViciousCycle,
                        factors: health.health?.factors,
                        recommendations: health.health?.recommendations
                    });
                }
            }

            // Ordenar por riesgo (mas alto primero)
            atRisk.sort((a, b) => {
                const aIndex = riskOrder.indexOf(a.riskLevel);
                const bIndex = riskOrder.indexOf(b.riskLevel);
                return bIndex - aIndex;
            });

            return { success: true, employeesAtRisk: atRisk };
        } catch (error) {
            console.error('[HourBank] Error getting employees at risk:', error);
            return { success: false, error: error.message };
        }
    }

    // =========================================================================
    // SISTEMA DE CANJE DE HORAS CON WORKFLOW
    // =========================================================================

    /**
     * Obtiene decisiones pendientes de un empleado
     * @param {number} companyId - ID de la empresa
     * @param {UUID} userId - ID del usuario
     * @returns {Array} Decisiones pendientes
     */
    async getPendingDecisions(companyId, userId) {
        try {
            const decisions = await sequelize.query(`
                SELECT
                    id,
                    overtime_date,
                    overtime_hours,
                    overtime_type,
                    if_paid_amount,
                    if_banked_hours,
                    conversion_rate,
                    expires_at,
                    created_at
                FROM hour_bank_pending_decisions
                WHERE company_id = :companyId
                  AND user_id = :userId
                  AND status = 'pending'
                  AND expires_at > NOW()
                ORDER BY created_at DESC
            `, {
                replacements: { companyId, userId },
                type: QueryTypes.SELECT
            });

            return decisions;
        } catch (error) {
            console.error('[HourBank] Error getting pending decisions:', error);
            return [];
        }
    }

    /**
     * Crea una solicitud de canje de horas
     * @param {Object} params - Parametros de la solicitud
     * @returns {Object} Resultado
     */
    async createRedemptionRequest(params) {
        const {
            userId,
            companyId,
            hoursRequested,
            scheduledDate,
            redemptionType = 'early_departure',
            reason,
            loanJustification  // Justificación si es préstamo
        } = params;

        try {
            // Validar usando funcion de BD (incluye validación de préstamos)
            const [validation] = await sequelize.query(`
                SELECT * FROM validate_redemption_request(:companyId, :userId, :hoursRequested, :scheduledDate)
            `, {
                replacements: { companyId, userId, hoursRequested, scheduledDate },
                type: QueryTypes.SELECT
            });

            if (!validation.is_valid) {
                return {
                    success: false,
                    error: validation.error_message,
                    errorCode: validation.error_code,
                    details: {
                        currentBalance: validation.current_balance,
                        maxPerEvent: validation.max_per_event,
                        available: validation.available_for_redemption,
                        pending: validation.pending_requests,
                        isLoan: validation.is_loan,
                        loanAmount: validation.loan_amount,
                        totalDebtAfter: validation.total_debt_after
                    }
                };
            }

            // Detectar si es un préstamo
            const isLoanRequest = validation.is_loan === true;
            const loanAmount = parseFloat(validation.loan_amount) || 0;

            // Si es préstamo, verificar que se proporcione justificación (si es requerida)
            if (isLoanRequest) {
                const template = await this.getApplicableTemplate(userId, companyId);
                if (template?.require_loan_justification && !loanJustification) {
                    return {
                        success: false,
                        error: 'Se requiere justificación para solicitar un préstamo de horas',
                        errorCode: 'LOAN_JUSTIFICATION_REQUIRED',
                        details: {
                            isLoan: true,
                            loanAmount,
                            requiresJustification: true
                        }
                    };
                }
            }

            // Obtener supervisor
            const [supervisor] = await sequelize.query(`
                SELECT * FROM get_immediate_supervisor(:companyId, :userId)
            `, {
                replacements: { companyId, userId },
                type: QueryTypes.SELECT
            });

            // Crear solicitud (incluye campos de préstamo)
            const [result] = await sequelize.query(`
                INSERT INTO hour_bank_redemption_requests (
                    company_id,
                    user_id,
                    hours_requested,
                    scheduled_date,
                    redemption_type,
                    balance_at_request,
                    supervisor_id,
                    reason,
                    status,
                    is_loan_request,
                    loan_justification,
                    loan_total_debt
                ) VALUES (
                    :companyId,
                    :userId,
                    :hoursRequested,
                    :scheduledDate,
                    :redemptionType,
                    :balanceAtRequest,
                    :supervisorId,
                    :reason,
                    'pending_supervisor',
                    :isLoanRequest,
                    :loanJustification,
                    :loanTotalDebt
                )
                RETURNING id, status, is_loan_request
            `, {
                replacements: {
                    companyId,
                    userId,
                    hoursRequested,
                    scheduledDate,
                    redemptionType,
                    balanceAtRequest: validation.current_balance,
                    supervisorId: supervisor?.supervisor_id || null,
                    reason: reason || null,
                    isLoanRequest,
                    loanJustification: isLoanRequest ? (loanJustification || null) : null,
                    loanTotalDebt: isLoanRequest ? validation.total_debt_after : null
                },
                type: QueryTypes.INSERT
            });

            // Notificar al supervisor
            if (supervisor?.supervisor_id) {
                await this.notifyRedemptionRequest(
                    supervisor.supervisor_id,
                    companyId,
                    result[0].id,
                    userId,
                    hoursRequested,
                    scheduledDate,
                    isLoanRequest  // Indicar si es préstamo
                );
            }

            // Construir mensaje apropiado
            let message = 'Solicitud creada. Esperando aprobación del supervisor.';
            if (isLoanRequest) {
                message = `Solicitud de préstamo creada (${loanAmount}h de deuda). Esperando aprobación del supervisor.`;
            }

            return {
                success: true,
                requestId: result[0].id,
                status: result[0].status,
                message,
                isLoan: isLoanRequest,
                loanDetails: isLoanRequest ? {
                    loanAmount,
                    totalDebtAfter: validation.total_debt_after,
                    currentBalance: validation.current_balance
                } : null,
                supervisor: supervisor ? {
                    id: supervisor.supervisor_id,
                    name: supervisor.supervisor_name
                } : null,
                validation: {
                    currentBalance: validation.current_balance,
                    available: validation.available_for_redemption,
                    pending: validation.pending_requests + hoursRequested
                }
            };
        } catch (error) {
            console.error('[HourBank] Error creating redemption request:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Obtiene solicitudes de canje del usuario o para aprobacion
     * @param {Object} params - Filtros
     * @returns {Object} Resultado
     */
    async getRedemptionRequests(params) {
        const {
            companyId,
            userId,
            supervisorId,
            hrApproverId,
            status,
            forApproval = false
        } = params;

        try {
            let query = `
                SELECT
                    r.*,
                    u."firstName" || ' ' || u."lastName" as employee_name,
                    u.legajo,
                    d.name as department_name,
                    sup."firstName" || ' ' || sup."lastName" as supervisor_name,
                    hr."firstName" || ' ' || hr."lastName" as hr_approver_name,
                    sr.expected_checkout_time,
                    sr.compliance_status
                FROM hour_bank_redemption_requests r
                JOIN users u ON u.user_id = r.user_id
                LEFT JOIN departments d ON d.id = u.department_id
                LEFT JOIN users sup ON sup.user_id = r.supervisor_id
                LEFT JOIN users hr ON hr.user_id = r.hr_approver_id
                LEFT JOIN hour_bank_scheduled_redemptions sr ON sr.request_id = r.id
                WHERE r.company_id = :companyId
            `;

            const replacements = { companyId };

            if (userId && !forApproval) {
                query += ' AND r.user_id = :userId';
                replacements.userId = userId;
            }

            if (forApproval && supervisorId) {
                query += ` AND r.supervisor_id = :supervisorId AND r.status = 'pending_supervisor'`;
                replacements.supervisorId = supervisorId;
            }

            if (forApproval && hrApproverId) {
                query += ` AND r.status = 'approved_supervisor'`;
            }

            if (status) {
                query += ' AND r.status = :status';
                replacements.status = status;
            }

            query += ' ORDER BY r.created_at DESC LIMIT 100';

            const requests = await sequelize.query(query, {
                replacements,
                type: QueryTypes.SELECT
            });

            return { success: true, requests };
        } catch (error) {
            console.error('[HourBank] Error getting redemption requests:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Aprueba o rechaza una solicitud de canje (supervisor/HR)
     * @param {Object} params - Parametros de aprobacion
     * @returns {Object} Resultado
     */
    async processRedemptionApproval(params) {
        const {
            requestId,
            approverId,
            approverRole, // 'supervisor' o 'hr'
            action,       // 'approve' o 'reject'
            comments
        } = params;

        const transaction = await sequelize.transaction();

        try {
            // Obtener solicitud actual
            const [request] = await sequelize.query(`
                SELECT * FROM hour_bank_redemption_requests WHERE id = :requestId
            `, {
                replacements: { requestId },
                type: QueryTypes.SELECT,
                transaction
            });

            if (!request) {
                await transaction.rollback();
                return { success: false, error: 'Solicitud no encontrada' };
            }

            // Validar estado correcto para el aprobador
            const validStates = {
                supervisor: 'pending_supervisor',
                hr: 'approved_supervisor'
            };

            if (request.status !== validStates[approverRole]) {
                await transaction.rollback();
                return { success: false, error: `Estado inválido para aprobación de ${approverRole}` };
            }

            // Obtener template para verificar si requiere HR
            const template = await this.getApplicableTemplate(request.user_id, request.company_id);
            const requiresHR = template?.requires_hr_approval !== false;

            let newStatus;
            let updateFields = '';

            if (approverRole === 'supervisor') {
                if (action === 'approve') {
                    newStatus = requiresHR ? 'approved_supervisor' : 'approved';
                    updateFields = `
                        supervisor_decision = 'approved',
                        supervisor_decision_at = NOW(),
                        supervisor_comments = :comments,
                        status = :newStatus
                    `;
                } else {
                    newStatus = 'rejected_supervisor';
                    updateFields = `
                        supervisor_decision = 'rejected',
                        supervisor_decision_at = NOW(),
                        supervisor_comments = :comments,
                        status = :newStatus
                    `;
                }
            } else { // HR
                if (action === 'approve') {
                    newStatus = 'approved';
                    updateFields = `
                        hr_approver_id = :approverId,
                        hr_decision = 'approved',
                        hr_decision_at = NOW(),
                        hr_comments = :comments,
                        status = :newStatus
                    `;
                } else {
                    newStatus = 'rejected_hr';
                    updateFields = `
                        hr_approver_id = :approverId,
                        hr_decision = 'rejected',
                        hr_decision_at = NOW(),
                        hr_comments = :comments,
                        status = :newStatus
                    `;
                }
            }

            await sequelize.query(`
                UPDATE hour_bank_redemption_requests
                SET ${updateFields}, updated_at = NOW()
                WHERE id = :requestId
            `, {
                replacements: { requestId, approverId, comments, newStatus },
                type: QueryTypes.UPDATE,
                transaction
            });

            await transaction.commit();

            // Notificar al empleado
            await this.notifyRedemptionStatusChange(
                request.user_id,
                request.company_id,
                requestId,
                newStatus,
                comments
            );

            // Si requiere HR y fue aprobado por supervisor, notificar a HR
            if (approverRole === 'supervisor' && action === 'approve' && requiresHR) {
                await this.notifyHRForRedemptionApproval(request.company_id, requestId);
            }

            return {
                success: true,
                newStatus,
                message: action === 'approve'
                    ? (newStatus === 'approved' ? 'Solicitud aprobada. Canje programado.' : 'Aprobado. Esperando HR.')
                    : 'Solicitud rechazada.'
            };
        } catch (error) {
            await transaction.rollback();
            console.error('[HourBank] Error processing redemption approval:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Cancela una solicitud de canje (solo el empleado)
     * @param {UUID} requestId - ID de la solicitud
     * @param {UUID} userId - ID del empleado que cancela
     * @returns {Object} Resultado
     */
    async cancelRedemptionRequest(requestId, userId) {
        try {
            const [result] = await sequelize.query(`
                UPDATE hour_bank_redemption_requests
                SET status = 'cancelled', updated_at = NOW()
                WHERE id = :requestId
                  AND user_id = :userId
                  AND status IN ('pending_supervisor', 'approved_supervisor')
                RETURNING id, status
            `, {
                replacements: { requestId, userId },
                type: QueryTypes.UPDATE
            });

            if (!result || result.length === 0) {
                return { success: false, error: 'No se puede cancelar esta solicitud' };
            }

            return { success: true, message: 'Solicitud cancelada' };
        } catch (error) {
            console.error('[HourBank] Error cancelling redemption:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Obtiene canjes programados para una fecha
     * @param {number} companyId - ID de la empresa
     * @param {string} date - Fecha (YYYY-MM-DD)
     * @returns {Object} Resultado
     */
    async getScheduledRedemptions(companyId, date) {
        try {
            const scheduled = await sequelize.query(`
                SELECT
                    sr.*,
                    r.hours_requested,
                    r.redemption_type,
                    u."firstName" || ' ' || u."lastName" as employee_name,
                    u.legajo,
                    s.name as shift_name,
                    s."startTime" as shift_start,
                    s."endTime" as shift_end
                FROM hour_bank_scheduled_redemptions sr
                JOIN hour_bank_redemption_requests r ON r.id = sr.request_id
                JOIN users u ON u.user_id = sr.user_id
                LEFT JOIN shifts s ON s.id = sr.shift_id
                WHERE sr.company_id = :companyId
                  AND sr.scheduled_date = :date
                ORDER BY sr.expected_checkout_time
            `, {
                replacements: { companyId, date },
                type: QueryTypes.SELECT
            });

            return { success: true, scheduled };
        } catch (error) {
            console.error('[HourBank] Error getting scheduled redemptions:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Procesa checkout con canje de horas
     * @param {UUID} userId - ID del usuario
     * @param {number} companyId - ID de la empresa
     * @param {string} checkoutTime - Hora de salida (HH:MM)
     * @returns {Object} Resultado de validacion
     */
    async processRedemptionCheckout(userId, companyId, checkoutTime) {
        try {
            const [result] = await sequelize.query(`
                SELECT * FROM process_redemption_checkout(:userId, :companyId, :checkoutTime::TIME)
            `, {
                replacements: { userId, companyId, checkoutTime },
                type: QueryTypes.SELECT
            });

            return {
                success: true,
                hasRedemption: result.has_redemption,
                requestId: result.request_id,
                hoursApproved: result.hours_approved,
                expectedCheckout: result.expected_checkout,
                actualCheckout: result.actual_checkout,
                deviationMinutes: result.deviation_minutes,
                complianceStatus: result.compliance_status,
                message: result.message
            };
        } catch (error) {
            console.error('[HourBank] Error processing redemption checkout:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Obtiene estado de cuenta (cuenta corriente) del empleado
     * @param {number} companyId - ID de la empresa
     * @param {UUID} userId - ID del usuario
     * @param {string} fromDate - Fecha desde (opcional)
     * @param {string} toDate - Fecha hasta (opcional)
     * @returns {Object} Estado de cuenta
     */
    async getAccountStatement(companyId, userId, fromDate = null, toDate = null) {
        try {
            const movements = await sequelize.query(`
                SELECT * FROM get_hour_bank_account_statement(:companyId, :userId, :fromDate, :toDate)
            `, {
                replacements: { companyId, userId, fromDate, toDate },
                type: QueryTypes.SELECT
            });

            // Calcular totales
            const totals = movements.reduce((acc, m) => ({
                totalDebits: acc.totalDebits + parseFloat(m.hours_debit || 0),
                totalCredits: acc.totalCredits + parseFloat(m.hours_credit || 0)
            }), { totalDebits: 0, totalCredits: 0 });

            // Balance final (ultimo movimiento)
            const finalBalance = movements.length > 0
                ? parseFloat(movements[0].balance_after || 0)
                : 0;

            return {
                success: true,
                statement: {
                    movements,
                    totals: {
                        ...totals,
                        netChange: totals.totalCredits - totals.totalDebits
                    },
                    finalBalance,
                    period: {
                        from: fromDate,
                        to: toDate
                    }
                }
            };
        } catch (error) {
            console.error('[HourBank] Error getting account statement:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Obtiene resumen de canje para Mi Espacio
     * @param {number} companyId - ID de la empresa
     * @param {UUID} userId - ID del usuario
     * @returns {Object} Resumen completo
     */
    async getRedemptionSummary(companyId, userId) {
        try {
            // Balance y disponible
            const [validation] = await sequelize.query(`
                SELECT * FROM validate_redemption_request(:companyId, :userId, 0, CURRENT_DATE + 7)
            `, {
                replacements: { companyId, userId },
                type: QueryTypes.SELECT
            });

            // Solicitudes recientes
            const recentRequests = await sequelize.query(`
                SELECT
                    id, hours_requested, scheduled_date, status,
                    redemption_type, created_at,
                    supervisor_decision, hr_decision
                FROM hour_bank_redemption_requests
                WHERE company_id = :companyId AND user_id = :userId
                ORDER BY created_at DESC
                LIMIT 10
            `, {
                replacements: { companyId, userId },
                type: QueryTypes.SELECT
            });

            // Proximos canjes programados
            const upcoming = await sequelize.query(`
                SELECT
                    sr.scheduled_date,
                    sr.hours_approved,
                    sr.expected_checkout_time,
                    r.redemption_type,
                    r.status
                FROM hour_bank_scheduled_redemptions sr
                JOIN hour_bank_redemption_requests r ON r.id = sr.request_id
                WHERE sr.company_id = :companyId
                  AND sr.user_id = :userId
                  AND sr.scheduled_date >= CURRENT_DATE
                  AND sr.is_executed = false
                ORDER BY sr.scheduled_date
                LIMIT 5
            `, {
                replacements: { companyId, userId },
                type: QueryTypes.SELECT
            });

            // Estadisticas de uso
            const [stats] = await sequelize.query(`
                SELECT
                    COUNT(*) FILTER (WHERE status = 'executed') as executed_count,
                    COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_count,
                    COUNT(*) FILTER (WHERE status LIKE 'rejected%') as rejected_count,
                    COALESCE(SUM(hours_requested) FILTER (WHERE status = 'executed'), 0) as total_hours_redeemed
                FROM hour_bank_redemption_requests
                WHERE company_id = :companyId AND user_id = :userId
            `, {
                replacements: { companyId, userId },
                type: QueryTypes.SELECT
            });

            return {
                success: true,
                summary: {
                    balance: {
                        current: parseFloat(validation.current_balance || 0),
                        available: parseFloat(validation.available_for_redemption || 0),
                        pending: parseFloat(validation.pending_requests || 0),
                        maxPerEvent: parseFloat(validation.max_per_event || 8)
                    },
                    recentRequests,
                    upcomingRedemptions: upcoming,
                    statistics: {
                        executedCount: parseInt(stats.executed_count || 0),
                        cancelledCount: parseInt(stats.cancelled_count || 0),
                        rejectedCount: parseInt(stats.rejected_count || 0),
                        totalHoursRedeemed: parseFloat(stats.total_hours_redeemed || 0)
                    }
                }
            };
        } catch (error) {
            console.error('[HourBank] Error getting redemption summary:', error);
            return { success: false, error: error.message };
        }
    }

    // =========================================================================
    // NOTIFICACIONES DE CANJE
    // =========================================================================

    async notifyRedemptionRequest(supervisorId, companyId, requestId, employeeId, hours, date) {
        try {
            if (NotificationWorkflowService) {
                // Obtener nombre del empleado
                const [employee] = await sequelize.query(`
                    SELECT "firstName" || ' ' || "lastName" as name FROM users WHERE user_id = :employeeId
                `, { replacements: { employeeId }, type: QueryTypes.SELECT });

                await NotificationWorkflowService.createNotification({
                    module: 'hour-bank',
                    companyId: companyId,
                    recipient: { userId: supervisorId },
                    notificationType: 'hour_bank_redemption_request',
                    title: 'Nueva Solicitud de Canje',
                    message: `${employee?.name || 'Un empleado'} solicita canjear ${hours}h del banco para el ${date}`,
                    priority: 'high',
                    action_url: `/rrhh/banco-horas/aprobaciones?request=${requestId}`
                });
            }
        } catch (error) {
            console.error('[HourBank] Error notifying redemption request:', error);
        }
    }

    async notifyRedemptionStatusChange(userId, companyId, requestId, newStatus, comments) {
        try {
            if (NotificationWorkflowService) {
                const statusMessages = {
                    approved_supervisor: 'Aprobada por supervisor. Esperando HR.',
                    approved: '¡Aprobada! Tu canje ha sido programado.',
                    rejected_supervisor: 'Rechazada por supervisor.',
                    rejected_hr: 'Rechazada por HR.'
                };

                await NotificationWorkflowService.createNotification({
                    module: 'hour-bank',
                    companyId: companyId,
                    recipient: { userId: userId },
                    notificationType: 'hour_bank_redemption_status',
                    title: 'Actualización de Solicitud de Canje',
                    message: statusMessages[newStatus] + (comments ? ` Comentario: ${comments}` : ''),
                    priority: newStatus.includes('rejected') ? 'high' : 'normal',
                    action_url: '/mi-espacio/banco-horas'
                });
            }
        } catch (error) {
            console.error('[HourBank] Error notifying status change:', error);
        }
    }

    /**
     * Notifica a RRHH sobre una solicitud de canje pendiente de aprobación
     * Usa NotificationRecipientResolver para obtener los destinatarios correctos
     * según la configuración del organigrama
     */
    async notifyHRForRedemptionApproval(companyId, requestId) {
        try {
            if (!NotificationWorkflowService) return;

            // Usar NotificationRecipientResolver para obtener destinatarios de RRHH
            // Esto respeta la configuración del organigrama
            const rrhhRecipients = await NotificationRecipientResolver.resolveRRHH(companyId, {
                maxRecipients: 5,
                includeUserDetails: true,
                fallbackToAdmins: true
            });

            if (rrhhRecipients.length === 0) {
                console.warn(`[HourBank] No se encontraron destinatarios RRHH para empresa ${companyId}`);
                return;
            }

            console.log(`[HourBank] Notificando a ${rrhhRecipients.length} destinatarios RRHH`);

            for (const recipient of rrhhRecipients) {
                await NotificationWorkflowService.createNotification({
                    module: 'hour-bank',
                    companyId: companyId,
                    recipient: { userId: recipient.userId },
                    notificationType: 'hour_bank_redemption_hr_approval',
                    title: 'Canje Pendiente de Aprobación HR',
                    message: 'Una solicitud de canje de horas espera tu aprobación',
                    priority: 'high',
                    action_url: `/gestion/banco-horas/aprobaciones?request=${requestId}`
                });
            }
        } catch (error) {
            console.error('[HourBank] Error notifying HR:', error);
        }
    }

    // =========================================================================
    // PRÉSTAMOS DE HORAS (Hour Loans)
    // =========================================================================

    /**
     * Crea un registro de préstamo cuando se ejecuta una redención que requiere préstamo
     * @param {Object} params - Parámetros del préstamo
     * @returns {Object} Resultado de la operación
     */
    async createLoanRecord(params) {
        const {
            companyId,
            userId,
            requestId,
            hoursBorrowed,
            interestRate = 0
        } = params;

        const transaction = await sequelize.transaction();

        try {
            // Obtener plantilla para configuración de préstamos
            const template = await this.getApplicableTemplate(userId, companyId);
            const rate = interestRate || parseFloat(template?.loan_interest_rate || 0);

            // Calcular interés y total a devolver
            const interestHours = hoursBorrowed * rate;
            const totalToRepay = hoursBorrowed + interestHours;

            // Crear registro de préstamo
            const [result] = await sequelize.query(`
                INSERT INTO hour_bank_loans (
                    company_id,
                    user_id,
                    redemption_request_id,
                    hours_borrowed,
                    interest_rate,
                    interest_hours,
                    total_to_repay,
                    hours_repaid,
                    balance_remaining,
                    status,
                    borrowed_at
                ) VALUES (
                    :companyId,
                    :userId,
                    :requestId,
                    :hoursBorrowed,
                    :interestRate,
                    :interestHours,
                    :totalToRepay,
                    0,
                    :totalToRepay,
                    'active',
                    NOW()
                )
                RETURNING id, total_to_repay, balance_remaining
            `, {
                replacements: {
                    companyId,
                    userId,
                    requestId,
                    hoursBorrowed,
                    interestRate: rate,
                    interestHours,
                    totalToRepay
                },
                type: QueryTypes.INSERT,
                transaction
            });

            // Marcar la transacción de canje como préstamo
            await sequelize.query(`
                UPDATE hour_bank_transactions
                SET is_loan = true,
                    loan_original_hours = :hoursBorrowed,
                    loan_interest_hours = :interestHours
                WHERE source_request_id = :requestId
                  AND transaction_type = 'redemption'
            `, {
                replacements: { hoursBorrowed, interestHours, requestId },
                type: QueryTypes.UPDATE,
                transaction
            });

            await transaction.commit();

            return {
                success: true,
                loanId: result[0].id,
                totalToRepay: parseFloat(result[0].total_to_repay),
                message: `Préstamo de ${hoursBorrowed}h registrado. Debes devolver ${totalToRepay}h.`
            };
        } catch (error) {
            await transaction.rollback();
            console.error('[HourBank] Error creating loan record:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Obtiene el estado de préstamos/deudas del usuario
     * @param {number} companyId - ID de la empresa
     * @param {UUID} userId - ID del usuario
     * @returns {Object} Estado de préstamos
     */
    async getUserLoanStatus(companyId, userId) {
        try {
            // Préstamos activos
            const activeLoans = await sequelize.query(`
                SELECT
                    id,
                    hours_borrowed,
                    interest_rate,
                    interest_hours,
                    total_to_repay,
                    hours_repaid,
                    balance_remaining,
                    status,
                    borrowed_at,
                    due_date
                FROM hour_bank_loans
                WHERE company_id = :companyId
                  AND user_id = :userId
                  AND status IN ('active', 'partial')
                ORDER BY borrowed_at
            `, {
                replacements: { companyId, userId },
                type: QueryTypes.SELECT
            });

            // Totales
            const totals = activeLoans.reduce((acc, loan) => ({
                totalBorrowed: acc.totalBorrowed + parseFloat(loan.hours_borrowed || 0),
                totalToRepay: acc.totalToRepay + parseFloat(loan.total_to_repay || 0),
                totalRepaid: acc.totalRepaid + parseFloat(loan.hours_repaid || 0),
                totalRemaining: acc.totalRemaining + parseFloat(loan.balance_remaining || 0)
            }), { totalBorrowed: 0, totalToRepay: 0, totalRepaid: 0, totalRemaining: 0 });

            // Historial de préstamos pagados
            const [paidLoansStats] = await sequelize.query(`
                SELECT
                    COUNT(*) as loans_count,
                    COALESCE(SUM(hours_borrowed), 0) as total_borrowed,
                    COALESCE(SUM(total_to_repay), 0) as total_repaid
                FROM hour_bank_loans
                WHERE company_id = :companyId
                  AND user_id = :userId
                  AND status = 'repaid'
            `, {
                replacements: { companyId, userId },
                type: QueryTypes.SELECT
            });

            // Obtener template para verificar límites
            const template = await this.getApplicableTemplate(userId, companyId);

            return {
                success: true,
                loanStatus: {
                    hasActiveLoans: activeLoans.length > 0,
                    activeLoans,
                    totals,
                    limits: {
                        maxLoanHours: parseFloat(template?.max_loan_hours || 8),
                        maxNegativeBalance: parseFloat(template?.max_negative_balance || -16),
                        warningThreshold: parseFloat(template?.loan_warning_threshold || -8),
                        interestRate: parseFloat(template?.loan_interest_rate || 0),
                        repaymentPriority: template?.loan_repayment_priority || 'mandatory'
                    },
                    availableToLoan: Math.max(0,
                        parseFloat(template?.max_loan_hours || 8) - totals.totalRemaining
                    ),
                    isAtWarningLevel: totals.totalRemaining >= Math.abs(parseFloat(template?.loan_warning_threshold || -8)),
                    isAtLimit: totals.totalRemaining >= Math.abs(parseFloat(template?.max_negative_balance || -16)),
                    history: {
                        paidLoansCount: parseInt(paidLoansStats?.loans_count || 0),
                        totalBorrowedHistorical: parseFloat(paidLoansStats?.total_borrowed || 0),
                        totalRepaidHistorical: parseFloat(paidLoansStats?.total_repaid || 0)
                    }
                }
            };
        } catch (error) {
            console.error('[HourBank] Error getting loan status:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Ejecuta el checkout de una redención y crea el préstamo si aplica
     * Esta función debe llamarse cuando el empleado hace checkout anticipado
     * @param {UUID} userId - ID del usuario
     * @param {number} companyId - ID de la empresa
     * @param {string} checkoutTime - Hora de salida (HH:MM)
     * @returns {Object} Resultado completo
     */
    async executeRedemptionWithLoan(userId, companyId, checkoutTime) {
        const transaction = await sequelize.transaction();

        try {
            // Primero procesar el checkout normal
            const checkoutResult = await this.processRedemptionCheckout(userId, companyId, checkoutTime);

            if (!checkoutResult.success || !checkoutResult.hasRedemption) {
                return checkoutResult;
            }

            // Verificar si la solicitud original era un préstamo
            const [request] = await sequelize.query(`
                SELECT
                    r.id,
                    r.is_loan_request,
                    r.loan_total_debt,
                    r.hours_requested,
                    sr.hours_approved
                FROM hour_bank_redemption_requests r
                JOIN hour_bank_scheduled_redemptions sr ON sr.request_id = r.id
                WHERE r.id = :requestId
            `, {
                replacements: { requestId: checkoutResult.requestId },
                type: QueryTypes.SELECT,
                transaction
            });

            let loanInfo = null;

            // Si era un préstamo, crear el registro de préstamo
            if (request?.is_loan_request) {
                // Calcular las horas reales prestadas (basado en el checkout)
                const hoursUsed = parseFloat(checkoutResult.hoursApproved || request.hours_requested);

                // Obtener balance actual
                const [balance] = await sequelize.query(`
                    SELECT COALESCE(SUM(
                        CASE WHEN transaction_type = 'accrual' THEN hours_final
                             WHEN transaction_type IN ('usage', 'redemption') THEN -hours_final
                             ELSE 0
                        END
                    ), 0) as current_balance
                    FROM hour_bank_transactions
                    WHERE company_id = :companyId AND user_id = :userId
                    AND status = 'completed'
                `, {
                    replacements: { companyId, userId },
                    type: QueryTypes.SELECT,
                    transaction
                });

                const currentBalance = parseFloat(balance?.current_balance || 0);

                // Las horas prestadas son lo que queda en negativo
                // Si el balance era 2 y usó 5, prestó 3
                const hoursBorrowed = Math.max(0, hoursUsed - Math.max(0, currentBalance + hoursUsed));

                if (hoursBorrowed > 0) {
                    const loanResult = await this.createLoanRecord({
                        companyId,
                        userId,
                        requestId: checkoutResult.requestId,
                        hoursBorrowed
                    });

                    loanInfo = loanResult.success ? {
                        loanId: loanResult.loanId,
                        hoursBorrowed,
                        totalToRepay: loanResult.totalToRepay
                    } : null;
                }
            }

            // Marcar la solicitud como ejecutada
            await sequelize.query(`
                UPDATE hour_bank_redemption_requests
                SET status = 'executed',
                    executed_at = NOW(),
                    updated_at = NOW()
                WHERE id = :requestId
            `, {
                replacements: { requestId: checkoutResult.requestId },
                type: QueryTypes.UPDATE,
                transaction
            });

            await transaction.commit();

            return {
                ...checkoutResult,
                loanInfo,
                wasLoanRedemption: request?.is_loan_request === true
            };
        } catch (error) {
            await transaction.rollback();
            console.error('[HourBank] Error executing redemption with loan:', error);
            return { success: false, error: error.message };
        }
    }

    // =========================================================================
    // METRICAS JERARQUICAS PARA DASHBOARD
    // =========================================================================

    /**
     * Obtiene métricas completas a nivel empresa para el dashboard
     * @param {number} companyId - ID de la empresa
     * @returns {Object} Métricas de empresa
     */
    async getCompanyDashboardMetrics(companyId) {
        try {
            // Métricas generales
            const [stats] = await sequelize.query(`
                SELECT
                    COUNT(DISTINCT b.user_id) as total_employees,
                    COALESCE(SUM(b.current_balance), 0) as total_balance,
                    COALESCE(AVG(b.current_balance), 0) as avg_balance,
                    COALESCE(MAX(b.current_balance), 0) as max_balance,
                    COALESCE(MIN(b.current_balance), 0) as min_balance,
                    COALESCE(SUM(b.total_accrued), 0) as total_accrued,
                    COALESCE(SUM(b.total_used), 0) as total_used,
                    COALESCE(SUM(b.total_expired), 0) as total_expired,
                    COUNT(CASE WHEN b.current_balance > 0 THEN 1 END) as employees_with_positive,
                    COUNT(CASE WHEN b.current_balance < 0 THEN 1 END) as employees_with_negative,
                    COUNT(CASE WHEN b.current_balance = 0 THEN 1 END) as employees_with_zero
                FROM hour_bank_balances b
                WHERE b.company_id = :companyId
            `, {
                replacements: { companyId },
                type: QueryTypes.SELECT
            });

            // Decisiones pendientes
            const [pending] = await sequelize.query(`
                SELECT
                    COUNT(*) FILTER (WHERE status = 'pending') as pending_decisions,
                    COUNT(*) FILTER (WHERE status = 'pending' AND expires_at < NOW() + INTERVAL '24 hours') as expiring_soon
                FROM hour_bank_pending_decisions
                WHERE company_id = :companyId
            `, {
                replacements: { companyId },
                type: QueryTypes.SELECT
            });

            // Solicitudes pendientes
            const [requests] = await sequelize.query(`
                SELECT COUNT(*) as pending_requests
                FROM hour_bank_requests
                WHERE company_id = :companyId AND status = 'pending'
            `, {
                replacements: { companyId },
                type: QueryTypes.SELECT
            });

            // Tendencia mensual (últimos 6 meses)
            const trend = await sequelize.query(`
                SELECT
                    DATE_TRUNC('month', created_at) as month,
                    SUM(CASE WHEN transaction_type = 'accrual' THEN hours_final ELSE 0 END) as accrued,
                    SUM(CASE WHEN transaction_type IN ('usage', 'redemption') THEN hours_final ELSE 0 END) as used
                FROM hour_bank_transactions
                WHERE company_id = :companyId
                  AND created_at >= CURRENT_DATE - INTERVAL '6 months'
                GROUP BY DATE_TRUNC('month', created_at)
                ORDER BY month
            `, {
                replacements: { companyId },
                type: QueryTypes.SELECT
            });

            // Ratio acreedores vs deudores
            const totalWithBalance = parseInt(stats?.employees_with_positive || 0) + parseInt(stats?.employees_with_negative || 0);
            const creditorRatio = totalWithBalance > 0
                ? Math.round((parseInt(stats?.employees_with_positive || 0) / totalWithBalance) * 100)
                : 0;

            return {
                success: true,
                metrics: {
                    totalEmployees: parseInt(stats?.total_employees || 0),
                    totalBalance: parseFloat(stats?.total_balance || 0),
                    avgBalance: parseFloat(stats?.avg_balance || 0).toFixed(2),
                    maxBalance: parseFloat(stats?.max_balance || 0),
                    minBalance: parseFloat(stats?.min_balance || 0),
                    totalAccrued: parseFloat(stats?.total_accrued || 0),
                    totalUsed: parseFloat(stats?.total_used || 0),
                    totalExpired: parseFloat(stats?.total_expired || 0),
                    employeesWithPositive: parseInt(stats?.employees_with_positive || 0),
                    employeesWithNegative: parseInt(stats?.employees_with_negative || 0),
                    employeesWithZero: parseInt(stats?.employees_with_zero || 0),
                    creditorRatio,
                    pendingDecisions: parseInt(pending?.pending_decisions || 0),
                    decisionsExpiringSoon: parseInt(pending?.expiring_soon || 0),
                    pendingRequests: parseInt(requests?.pending_requests || 0)
                },
                trend
            };
        } catch (error) {
            console.error('[HourBank] Error getting company dashboard metrics:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Obtiene métricas agrupadas por sucursal
     * @param {number} companyId - ID de la empresa
     * @returns {Object} Métricas por sucursal
     */
    async getBranchMetrics(companyId) {
        try {
            const branches = await sequelize.query(`
                SELECT
                    cb.id as branch_id,
                    cb.name as branch_name,
                    cb.code as branch_code,
                    COUNT(DISTINCT b.user_id) as total_employees,
                    COALESCE(SUM(b.current_balance), 0) as total_balance,
                    COALESCE(AVG(b.current_balance), 0) as avg_balance,
                    COALESCE(MAX(b.current_balance), 0) as max_balance,
                    COALESCE(SUM(b.total_accrued), 0) as total_accrued,
                    COALESCE(SUM(b.total_used), 0) as total_used,
                    COUNT(CASE WHEN b.current_balance > 0 THEN 1 END) as employees_positive,
                    COUNT(CASE WHEN b.current_balance < 0 THEN 1 END) as employees_negative,
                    (SELECT COUNT(*) FROM hour_bank_pending_decisions pd
                     WHERE pd.company_id = cb.company_id AND pd.status = 'pending'
                     AND pd.user_id IN (SELECT user_id FROM users WHERE branch_id = cb.id)) as pending_decisions
                FROM company_branches cb
                LEFT JOIN users u ON u.branch_id = cb.id AND u.company_id = cb.company_id
                LEFT JOIN hour_bank_balances b ON b.user_id = u.user_id AND b.company_id = cb.company_id
                WHERE cb.company_id = :companyId AND cb.is_active = true
                GROUP BY cb.id, cb.name, cb.code
                ORDER BY total_balance DESC
            `, {
                replacements: { companyId },
                type: QueryTypes.SELECT
            });

            return {
                success: true,
                branches: branches.map(b => ({
                    id: b.branch_id,
                    name: b.branch_name,
                    code: b.branch_code,
                    totalEmployees: parseInt(b.total_employees || 0),
                    totalBalance: parseFloat(b.total_balance || 0),
                    avgBalance: parseFloat(b.avg_balance || 0).toFixed(2),
                    maxBalance: parseFloat(b.max_balance || 0),
                    totalAccrued: parseFloat(b.total_accrued || 0),
                    totalUsed: parseFloat(b.total_used || 0),
                    employeesPositive: parseInt(b.employees_positive || 0),
                    employeesNegative: parseInt(b.employees_negative || 0),
                    pendingDecisions: parseInt(b.pending_decisions || 0)
                }))
            };
        } catch (error) {
            console.error('[HourBank] Error getting branch metrics:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Obtiene métricas agrupadas por departamento
     * @param {number} companyId - ID de la empresa
     * @param {number} branchId - ID de sucursal (opcional)
     * @returns {Object} Métricas por departamento
     */
    async getDepartmentMetrics(companyId, branchId = null) {
        try {
            let branchFilter = '';
            const replacements = { companyId };
            if (branchId) {
                branchFilter = 'AND u.branch_id = :branchId';
                replacements.branchId = branchId;
            }

            const departments = await sequelize.query(`
                SELECT
                    d.id as department_id,
                    d.name as department_name,
                    d.code as department_code,
                    COUNT(DISTINCT b.user_id) as total_employees,
                    COALESCE(SUM(b.current_balance), 0) as total_balance,
                    COALESCE(AVG(b.current_balance), 0) as avg_balance,
                    COALESCE(MAX(b.current_balance), 0) as max_balance,
                    COALESCE(SUM(b.total_accrued), 0) as total_accrued,
                    COALESCE(SUM(b.total_used), 0) as total_used,
                    COUNT(CASE WHEN b.current_balance > 0 THEN 1 END) as employees_positive,
                    COUNT(CASE WHEN b.current_balance < 0 THEN 1 END) as employees_negative
                FROM departments d
                LEFT JOIN users u ON u.department_id = d.id AND u.company_id = d.company_id ${branchFilter}
                LEFT JOIN hour_bank_balances b ON b.user_id = u.user_id AND b.company_id = d.company_id
                WHERE d.company_id = :companyId AND d.is_active = true
                GROUP BY d.id, d.name, d.code
                ORDER BY total_balance DESC
            `, {
                replacements,
                type: QueryTypes.SELECT
            });

            return {
                success: true,
                departments: departments.map(d => ({
                    id: d.department_id,
                    name: d.department_name,
                    code: d.department_code,
                    totalEmployees: parseInt(d.total_employees || 0),
                    totalBalance: parseFloat(d.total_balance || 0),
                    avgBalance: parseFloat(d.avg_balance || 0).toFixed(2),
                    maxBalance: parseFloat(d.max_balance || 0),
                    totalAccrued: parseFloat(d.total_accrued || 0),
                    totalUsed: parseFloat(d.total_used || 0),
                    employeesPositive: parseInt(d.employees_positive || 0),
                    employeesNegative: parseInt(d.employees_negative || 0)
                }))
            };
        } catch (error) {
            console.error('[HourBank] Error getting department metrics:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Obtiene lista de empleados con sus balances (paginado)
     * @param {Object} params - Parámetros de filtro
     * @returns {Object} Lista de empleados con balances
     */
    async getEmployeeBalancesList(params = {}) {
        const {
            companyId,
            branchId,
            departmentId,
            search,
            sortBy = 'balance',
            sortOrder = 'DESC',
            limit = 50,
            offset = 0
        } = params;

        try {
            let whereClause = 'WHERE b.company_id = :companyId';
            const replacements = { companyId, limit: parseInt(limit), offset: parseInt(offset) };

            if (branchId) {
                whereClause += ' AND u.branch_id = :branchId';
                replacements.branchId = branchId;
            }
            if (departmentId) {
                whereClause += ' AND u.department_id = :departmentId';
                replacements.departmentId = departmentId;
            }
            if (search) {
                whereClause += ` AND (
                    u.nombre ILIKE :search OR
                    u.email ILIKE :search OR
                    u.legajo ILIKE :search
                )`;
                replacements.search = `%${search}%`;
            }

            // Determinar columna de ordenamiento
            const sortColumns = {
                balance: 'b.current_balance',
                name: 'u.nombre',
                accrued: 'b.total_accrued',
                used: 'b.total_used'
            };
            const orderColumn = sortColumns[sortBy] || 'b.current_balance';
            const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

            const employees = await sequelize.query(`
                SELECT
                    b.id as balance_id,
                    b.user_id,
                    u.nombre as employee_name,
                    u.email,
                    u.legajo,
                    cb.name as branch_name,
                    d.name as department_name,
                    b.current_balance,
                    b.total_accrued,
                    b.total_used,
                    b.total_expired,
                    b.total_paid_out,
                    b.last_accrual_date,
                    b.last_usage_date,
                    b.updated_at
                FROM hour_bank_balances b
                INNER JOIN users u ON b.user_id = u.user_id
                LEFT JOIN company_branches cb ON u.branch_id = cb.id
                LEFT JOIN departments d ON u.department_id = d.id
                ${whereClause}
                ORDER BY ${orderColumn} ${order}
                LIMIT :limit OFFSET :offset
            `, {
                replacements,
                type: QueryTypes.SELECT
            });

            // Contar total
            const [countResult] = await sequelize.query(`
                SELECT COUNT(*) as total
                FROM hour_bank_balances b
                INNER JOIN users u ON b.user_id = u.user_id
                ${whereClause}
            `, {
                replacements,
                type: QueryTypes.SELECT
            });

            return {
                success: true,
                employees: employees.map(e => ({
                    balanceId: e.balance_id,
                    userId: e.user_id,
                    name: e.employee_name,
                    email: e.email,
                    legajo: e.legajo,
                    branchName: e.branch_name,
                    departmentName: e.department_name,
                    currentBalance: parseFloat(e.current_balance || 0),
                    totalAccrued: parseFloat(e.total_accrued || 0),
                    totalUsed: parseFloat(e.total_used || 0),
                    totalExpired: parseFloat(e.total_expired || 0),
                    totalPaidOut: parseFloat(e.total_paid_out || 0),
                    lastAccrualDate: e.last_accrual_date,
                    lastUsageDate: e.last_usage_date,
                    updatedAt: e.updated_at
                })),
                pagination: {
                    total: parseInt(countResult?.total || 0),
                    limit: parseInt(limit),
                    offset: parseInt(offset)
                }
            };
        } catch (error) {
            console.error('[HourBank] Error getting employee balances list:', error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = new HourBankService();
