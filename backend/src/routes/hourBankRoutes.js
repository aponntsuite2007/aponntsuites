/**
 * ============================================================================
 * HOUR BANK ROUTES - API de Banco de Horas
 * ============================================================================
 *
 * Endpoints para gestion completa del banco de horas:
 * - Plantillas (templates) por sucursal
 * - Saldos y transacciones
 * - Solicitudes de uso
 * - Decisiones pendientes
 * - Aprobaciones
 * - Reportes
 *
 * @version 1.0.0
 * @date 2025-12-15
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const { auth, supervisorOrAdmin, adminOnly } = require('../middleware/auth');
const HourBankService = require('../services/HourBankService');

// ============================================================================
// PLANTILLAS (TEMPLATES) - Solo Admin/HR
// ============================================================================

/**
 * @route GET /api/hour-bank/templates
 * @desc Obtener todas las plantillas de la empresa
 * @access Admin/HR
 */
router.get('/templates', auth, adminOnly, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const templates = await HourBankService.getCompanyTemplates(companyId);

        res.json({
            success: true,
            templates
        });
    } catch (error) {
        console.error('[HourBank Routes] Error getting templates:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * @route GET /api/hour-bank/templates/:id
 * @desc Obtener plantilla por ID
 * @access Admin/HR
 */
router.get('/templates/:id', auth, adminOnly, async (req, res) => {
    try {
        const template = await HourBankService.getTemplateById(req.params.id);

        if (!template) {
            return res.status(404).json({ success: false, error: 'Template no encontrado' });
        }

        res.json({
            success: true,
            template
        });
    } catch (error) {
        console.error('[HourBank Routes] Error getting template:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * @route POST /api/hour-bank/templates
 * @desc Crear nueva plantilla
 * @access Admin/HR
 */
router.post('/templates', auth, adminOnly, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const templateData = {
            ...req.body,
            company_id: companyId
        };

        const result = await HourBankService.saveTemplate(templateData, req.user.user_id);

        if (result.success) {
            res.status(201).json(result);
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        console.error('[HourBank Routes] Error creating template:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * @route PUT /api/hour-bank/templates/:id
 * @desc Actualizar plantilla (crea nueva version)
 * @access Admin/HR
 */
router.put('/templates/:id', auth, adminOnly, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const templateData = {
            ...req.body,
            id: parseInt(req.params.id),
            company_id: companyId
        };

        const result = await HourBankService.saveTemplate(templateData, req.user.user_id);

        if (result.success) {
            res.json(result);
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        console.error('[HourBank Routes] Error updating template:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * @route GET /api/hour-bank/templates/defaults
 * @desc Obtener configuracion por defecto para crear plantillas
 * @access Admin/HR
 */
router.get('/templates/defaults', auth, adminOnly, async (req, res) => {
    try {
        const defaults = HourBankService.getDefaultConfig();

        // Agregar descripciones para cada campo
        const fieldsWithDescriptions = {
            // === CONVERSION ===
            conversion_rate_normal: {
                value: defaults.conversion_rate_normal,
                label: 'Conversion HE Dia Normal',
                description: 'Multiplicador para horas extras en dias normales. 1.0 = 1:1, 1.5 = 50% adicional',
                type: 'decimal',
                min: 0.5,
                max: 3,
                step: 0.1
            },
            conversion_rate_weekend: {
                value: defaults.conversion_rate_weekend,
                label: 'Conversion HE Fin de Semana',
                description: 'Multiplicador para HE en sabados y domingos',
                type: 'decimal',
                min: 0.5,
                max: 3,
                step: 0.1
            },
            conversion_rate_holiday: {
                value: defaults.conversion_rate_holiday,
                label: 'Conversion HE Feriado',
                description: 'Multiplicador para HE en feriados nacionales',
                type: 'decimal',
                min: 1,
                max: 4,
                step: 0.1
            },
            conversion_rate_night: {
                value: defaults.conversion_rate_night,
                label: 'Adicional Nocturno',
                description: 'Multiplicador adicional para horario nocturno (se acumula con otros)',
                type: 'decimal',
                min: 1,
                max: 2,
                step: 0.05
            },

            // === LIMITES ===
            max_accumulation_hours: {
                value: defaults.max_accumulation_hours,
                label: 'Maximo Acumulable (horas)',
                description: 'Tope maximo de horas que un empleado puede tener en el banco',
                type: 'number',
                min: 20,
                max: 500
            },
            max_monthly_accrual: {
                value: defaults.max_monthly_accrual,
                label: 'Maximo Mensual (horas)',
                description: 'Maximo de HE convertibles a banco por mes',
                type: 'number',
                min: 10,
                max: 60
            },
            min_balance_for_use: {
                value: defaults.min_balance_for_use,
                label: 'Saldo Minimo para Uso',
                description: 'Minimo de horas requerido para solicitar uso',
                type: 'decimal',
                min: 0.25,
                max: 4,
                step: 0.25
            },

            // === VENCIMIENTO ===
            expiration_enabled: {
                value: defaults.expiration_enabled,
                label: 'Habilitar Vencimiento',
                description: 'Si las horas acumuladas vencen despues de cierto tiempo',
                type: 'boolean'
            },
            expiration_months: {
                value: defaults.expiration_months,
                label: 'Meses hasta Vencimiento',
                description: 'Cantidad de meses hasta que vencen las horas. 0 = no vencen',
                type: 'number',
                min: 0,
                max: 24
            },
            expiration_warning_days: {
                value: defaults.expiration_warning_days,
                label: 'Dias de Aviso Pre-Vencimiento',
                description: 'Dias antes del vencimiento para notificar al empleado',
                type: 'number',
                min: 7,
                max: 90
            },
            expired_hours_action: {
                value: defaults.expired_hours_action,
                label: 'Accion al Vencer',
                description: 'Que hacer cuando vencen las horas',
                type: 'select',
                options: [
                    { value: 'payout', label: 'Pagar automaticamente' },
                    { value: 'forfeit', label: 'Perder (donde legal)' },
                    { value: 'extend', label: 'Extender (req. aprobacion)' },
                    { value: 'notify', label: 'Solo notificar' }
                ]
            },

            // === ELECCION EMPLEADO ===
            employee_choice_enabled: {
                value: defaults.employee_choice_enabled,
                label: 'Empleado Elige',
                description: 'Si el empleado puede elegir entre cobrar o acumular cada HE',
                type: 'boolean'
            },
            choice_timeout_hours: {
                value: defaults.choice_timeout_hours,
                label: 'Timeout Decision (horas)',
                description: 'Horas para decidir antes de aplicar accion por defecto. 0 = sin limite',
                type: 'number',
                min: 0,
                max: 72
            },
            default_action: {
                value: defaults.default_action,
                label: 'Accion por Defecto',
                description: 'Que hacer si el empleado no elige a tiempo',
                type: 'select',
                options: [
                    { value: 'bank', label: 'Acumular en banco' },
                    { value: 'pay', label: 'Pagar en liquidacion' }
                ]
            },
            choice_reminder_hours: {
                value: defaults.choice_reminder_hours,
                label: 'Recordatorio (horas antes)',
                description: 'Horas antes del timeout para enviar recordatorio. 0 = sin recordatorio',
                type: 'number',
                min: 0,
                max: 24
            },

            // === USO ===
            min_usage_hours: {
                value: defaults.min_usage_hours,
                label: 'Uso Minimo (horas)',
                description: 'Minimo de horas por solicitud de uso',
                type: 'decimal',
                min: 0.25,
                max: 4,
                step: 0.25
            },
            max_usage_hours_per_day: {
                value: defaults.max_usage_hours_per_day,
                label: 'Uso Maximo por Dia',
                description: 'Maximo de horas usables en un solo dia',
                type: 'number',
                min: 1,
                max: 12
            },
            allow_partial_day_usage: {
                value: defaults.allow_partial_day_usage,
                label: 'Permitir Uso Parcial',
                description: 'Permite usar fracciones de dia (salir temprano, llegar tarde)',
                type: 'boolean'
            },
            allow_full_day_usage: {
                value: defaults.allow_full_day_usage,
                label: 'Permitir Dia Completo',
                description: 'Permite usar un dia completo como licencia',
                type: 'boolean'
            },
            allow_early_departure: {
                value: defaults.allow_early_departure,
                label: 'Salida Anticipada',
                description: 'Permite marcar salida anticipada descontando del banco',
                type: 'boolean'
            },
            allow_late_arrival_compensation: {
                value: defaults.allow_late_arrival_compensation,
                label: 'Compensar Tardanzas',
                description: 'Permite compensar tardanzas con saldo del banco',
                type: 'boolean'
            },

            // === APROBACIONES ===
            requires_supervisor_approval: {
                value: defaults.requires_supervisor_approval,
                label: 'Aprobacion Supervisor (Acumulacion)',
                description: 'Si el supervisor debe aprobar cada acumulacion',
                type: 'boolean'
            },
            requires_hr_approval: {
                value: defaults.requires_hr_approval,
                label: 'Aprobacion RRHH (Acumulacion)',
                description: 'Si RRHH debe aprobar ademas del supervisor',
                type: 'boolean'
            },
            usage_requires_approval: {
                value: defaults.usage_requires_approval,
                label: 'Aprobacion para Uso',
                description: 'Si el uso de horas requiere aprobacion previa',
                type: 'boolean'
            },
            auto_approve_under_hours: {
                value: defaults.auto_approve_under_hours,
                label: 'Auto-aprobar bajo X horas',
                description: 'Aprobar automaticamente solicitudes menores a X horas. 0 = siempre manual',
                type: 'decimal',
                min: 0,
                max: 8,
                step: 0.5
            },
            advance_notice_days: {
                value: defaults.advance_notice_days,
                label: 'Anticipacion Minima (dias)',
                description: 'Dias de anticipacion requeridos para solicitar uso. 0 = mismo dia',
                type: 'number',
                min: 0,
                max: 15
            },

            // === NOTIFICACIONES ===
            notify_employee_on_accrual: {
                value: defaults.notify_employee_on_accrual,
                label: 'Notificar Empleado (Acreditacion)',
                description: 'Notificar al empleado cuando se acreditan horas',
                type: 'boolean'
            },
            notify_supervisor_on_accrual: {
                value: defaults.notify_supervisor_on_accrual,
                label: 'Notificar Supervisor (Acreditacion)',
                description: 'Notificar al supervisor cuando su equipo acumula horas',
                type: 'boolean'
            },
            notify_hr_on_accrual: {
                value: defaults.notify_hr_on_accrual,
                label: 'Notificar RRHH (Acreditacion)',
                description: 'Notificar a RRHH de todas las acumulaciones',
                type: 'boolean'
            },
            notify_on_low_balance: {
                value: defaults.notify_on_low_balance,
                label: 'Alerta Saldo Bajo',
                description: 'Alertar cuando el saldo baja del umbral',
                type: 'boolean'
            },
            low_balance_threshold: {
                value: defaults.low_balance_threshold,
                label: 'Umbral Saldo Bajo (horas)',
                description: 'Cantidad de horas para activar alerta de saldo bajo',
                type: 'number',
                min: 1,
                max: 20
            },
            notify_on_high_balance: {
                value: defaults.notify_on_high_balance,
                label: 'Alerta Saldo Alto',
                description: 'Alertar cuando hay acumulacion excesiva (riesgo laboral)',
                type: 'boolean'
            },
            high_balance_threshold: {
                value: defaults.high_balance_threshold,
                label: 'Umbral Saldo Alto (horas)',
                description: 'Cantidad de horas para activar alerta de acumulacion excesiva',
                type: 'number',
                min: 40,
                max: 200
            },

            // === RESTRICCIONES ===
            blackout_dates_enabled: {
                value: defaults.blackout_dates_enabled,
                label: 'Habilitar Fechas Bloqueadas',
                description: 'Habilitar periodos donde no se puede usar el banco',
                type: 'boolean'
            },
            max_concurrent_users_percent: {
                value: defaults.max_concurrent_users_percent,
                label: 'Max % Concurrente',
                description: 'Maximo % de empleados que pueden usar banco el mismo dia. 0 = sin limite',
                type: 'number',
                min: 0,
                max: 100
            },

            // === LEGAL ===
            requires_written_agreement: {
                value: defaults.requires_written_agreement,
                label: 'Requiere Acuerdo Escrito',
                description: 'Si requiere acuerdo escrito con cada empleado (Brasil, otros)',
                type: 'boolean'
            },
            union_agreement_required: {
                value: defaults.union_agreement_required,
                label: 'Requiere Convenio Sindical',
                description: 'Si requiere convenio colectivo con sindicato',
                type: 'boolean'
            },
            legal_reference: {
                value: defaults.legal_reference,
                label: 'Referencia Legal',
                description: 'Articulos de ley aplicables (ej: LCT Art. 201)',
                type: 'text'
            }
        };

        res.json({
            success: true,
            fields: fieldsWithDescriptions,
            categories: [
                { key: 'conversion', label: 'Conversion de Horas', fields: ['conversion_rate_normal', 'conversion_rate_weekend', 'conversion_rate_holiday', 'conversion_rate_night'] },
                { key: 'limits', label: 'Limites', fields: ['max_accumulation_hours', 'max_monthly_accrual', 'min_balance_for_use'] },
                { key: 'expiration', label: 'Vencimiento', fields: ['expiration_enabled', 'expiration_months', 'expiration_warning_days', 'expired_hours_action'] },
                { key: 'choice', label: 'Eleccion del Empleado', fields: ['employee_choice_enabled', 'choice_timeout_hours', 'default_action', 'choice_reminder_hours'] },
                { key: 'usage', label: 'Uso de Horas', fields: ['min_usage_hours', 'max_usage_hours_per_day', 'allow_partial_day_usage', 'allow_full_day_usage', 'allow_early_departure', 'allow_late_arrival_compensation'] },
                { key: 'approval', label: 'Aprobaciones', fields: ['requires_supervisor_approval', 'requires_hr_approval', 'usage_requires_approval', 'auto_approve_under_hours', 'advance_notice_days'] },
                { key: 'notifications', label: 'Notificaciones', fields: ['notify_employee_on_accrual', 'notify_supervisor_on_accrual', 'notify_hr_on_accrual', 'notify_on_low_balance', 'low_balance_threshold', 'notify_on_high_balance', 'high_balance_threshold'] },
                { key: 'restrictions', label: 'Restricciones', fields: ['blackout_dates_enabled', 'max_concurrent_users_percent'] },
                { key: 'legal', label: 'Legal', fields: ['requires_written_agreement', 'union_agreement_required', 'legal_reference'] }
            ]
        });
    } catch (error) {
        console.error('[HourBank Routes] Error getting defaults:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * @route POST /api/hour-bank/templates/init-defaults
 * @desc Inicializar plantillas predefinidas por pais
 * @access Admin
 */
router.post('/templates/init-defaults', auth, adminOnly, async (req, res) => {
    try {
        const companyId = req.user.company_id;

        await sequelize.query(`SELECT create_default_hour_bank_templates(:companyId)`, {
            replacements: { companyId }
        });

        const templates = await HourBankService.getCompanyTemplates(companyId);

        res.json({
            success: true,
            message: 'Plantillas predefinidas creadas',
            templates
        });
    } catch (error) {
        console.error('[HourBank Routes] Error initializing defaults:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// SALDOS (BALANCES) - Empleado ve el suyo, Admin ve todos
// ============================================================================

/**
 * @route GET /api/hour-bank/balance
 * @desc Obtener mi saldo de banco de horas
 * @access Empleado autenticado
 */
router.get('/balance', auth, async (req, res) => {
    try {
        const userId = req.user.user_id;
        const companyId = req.user.company_id;

        const result = await HourBankService.getBalance(userId, companyId);

        res.json(result);
    } catch (error) {
        console.error('[HourBank Routes] Error getting balance:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * @route GET /api/hour-bank/balance/:userId
 * @desc Obtener saldo de un empleado especifico
 * @access Supervisor/Admin
 */
router.get('/balance/:userId', auth, supervisorOrAdmin, async (req, res) => {
    try {
        const userId = req.params.userId;
        const companyId = req.user.company_id;

        const result = await HourBankService.getBalance(userId, companyId);

        res.json(result);
    } catch (error) {
        console.error('[HourBank Routes] Error getting balance:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * @route GET /api/hour-bank/balances
 * @desc Obtener saldos de todos los empleados
 * @access Admin/HR
 */
router.get('/balances', auth, adminOnly, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const { branchId, minBalance, maxBalance, limit = 100, offset = 0 } = req.query;

        let whereClause = 'WHERE b.company_id = :companyId';
        const replacements = { companyId, limit: parseInt(limit), offset: parseInt(offset) };

        if (branchId) {
            whereClause += ' AND b.branch_id = :branchId';
            replacements.branchId = branchId;
        }
        if (minBalance) {
            whereClause += ' AND b.current_balance >= :minBalance';
            replacements.minBalance = parseFloat(minBalance);
        }
        if (maxBalance) {
            whereClause += ' AND b.current_balance <= :maxBalance';
            replacements.maxBalance = parseFloat(maxBalance);
        }

        const balances = await sequelize.query(`
            SELECT
                b.*,
                u.nombre as employee_name,
                u.legajo as employee_id,
                u.email as employee_email,
                br.name as branch_name
            FROM hour_bank_balances b
            INNER JOIN users u ON b.user_id = u.user_id
            LEFT JOIN company_branches br ON b.branch_id = br.id
            ${whereClause}
            ORDER BY b.current_balance DESC
            LIMIT :limit OFFSET :offset
        `, {
            replacements,
            type: QueryTypes.SELECT
        });

        res.json({
            success: true,
            balances
        });
    } catch (error) {
        console.error('[HourBank Routes] Error getting balances:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// TRANSACCIONES (HISTORY)
// ============================================================================

/**
 * @route GET /api/hour-bank/transactions
 * @desc Obtener mi historial de transacciones
 * @access Empleado autenticado
 */
router.get('/transactions', auth, async (req, res) => {
    try {
        const userId = req.user.user_id;
        const companyId = req.user.company_id;
        const { type, startDate, endDate, limit, offset } = req.query;

        const result = await HourBankService.getTransactionHistory(userId, companyId, {
            type,
            startDate,
            endDate,
            limit: parseInt(limit) || 50,
            offset: parseInt(offset) || 0
        });

        res.json(result);
    } catch (error) {
        console.error('[HourBank Routes] Error getting transactions:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * @route GET /api/hour-bank/transactions/:userId
 * @desc Obtener historial de un empleado especifico
 * @access Supervisor/Admin
 */
router.get('/transactions/:userId', auth, supervisorOrAdmin, async (req, res) => {
    try {
        const userId = req.params.userId;
        const companyId = req.user.company_id;
        const { type, startDate, endDate, limit, offset } = req.query;

        const result = await HourBankService.getTransactionHistory(userId, companyId, {
            type,
            startDate,
            endDate,
            limit: parseInt(limit) || 50,
            offset: parseInt(offset) || 0
        });

        res.json(result);
    } catch (error) {
        console.error('[HourBank Routes] Error getting transactions:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// SOLICITUDES DE USO (REQUESTS)
// ============================================================================

/**
 * @route POST /api/hour-bank/requests
 * @desc Crear solicitud de uso de horas
 * @access Empleado autenticado
 */
router.post('/requests', auth, async (req, res) => {
    try {
        const userId = req.user.user_id;
        const companyId = req.user.company_id;
        const branchId = req.user.branch_id;

        const {
            requestType,
            requestedDate,
            endDate,
            hoursRequested,
            startTime,
            endTime,
            reason
        } = req.body;

        if (!requestType || !requestedDate || !hoursRequested) {
            return res.status(400).json({
                success: false,
                error: 'Campos requeridos: requestType, requestedDate, hoursRequested'
            });
        }

        const result = await HourBankService.createUsageRequest({
            userId,
            companyId,
            branchId,
            requestType,
            requestedDate,
            endDate,
            hoursRequested: parseFloat(hoursRequested),
            startTime,
            endTime,
            reason
        });

        if (result.success) {
            res.status(201).json(result);
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        console.error('[HourBank Routes] Error creating request:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * @route GET /api/hour-bank/requests
 * @desc Obtener mis solicitudes
 * @access Empleado autenticado
 */
router.get('/requests', auth, async (req, res) => {
    try {
        const userId = req.user.user_id;
        const companyId = req.user.company_id;
        const { status } = req.query;

        let whereClause = 'WHERE r.user_id = :userId AND r.company_id = :companyId';
        const replacements = { userId, companyId };

        if (status) {
            whereClause += ' AND r.status = :status';
            replacements.status = status;
        }

        const requests = await sequelize.query(`
            SELECT r.*
            FROM hour_bank_requests r
            ${whereClause}
            ORDER BY r.created_at DESC
            LIMIT 50
        `, {
            replacements,
            type: QueryTypes.SELECT
        });

        res.json({ success: true, requests });
    } catch (error) {
        console.error('[HourBank Routes] Error getting requests:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * @route GET /api/hour-bank/requests/pending
 * @desc Obtener solicitudes pendientes de aprobacion
 * @access Supervisor/Admin
 */
router.get('/requests/pending', auth, supervisorOrAdmin, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const supervisorId = req.user.role !== 'admin' ? req.user.user_id : null;

        const result = await HourBankService.getPendingRequests(companyId, supervisorId);

        res.json(result);
    } catch (error) {
        console.error('[HourBank Routes] Error getting pending requests:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * @route PUT /api/hour-bank/requests/:id/approve
 * @desc Aprobar solicitud de uso
 * @access Supervisor/Admin
 */
router.put('/requests/:id/approve', auth, supervisorOrAdmin, async (req, res) => {
    try {
        const requestId = req.params.id;
        const approverId = req.user.user_id;
        const role = req.user.role === 'admin' ? 'hr' : 'supervisor';
        const { notes } = req.body;

        const result = await HourBankService.processRequestApproval(
            requestId,
            'approve',
            approverId,
            role,
            notes
        );

        if (result.success) {
            res.json(result);
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        console.error('[HourBank Routes] Error approving request:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * @route PUT /api/hour-bank/requests/:id/reject
 * @desc Rechazar solicitud de uso
 * @access Supervisor/Admin
 */
router.put('/requests/:id/reject', auth, supervisorOrAdmin, async (req, res) => {
    try {
        const requestId = req.params.id;
        const approverId = req.user.user_id;
        const role = req.user.role === 'admin' ? 'hr' : 'supervisor';
        const { notes } = req.body;

        if (!notes) {
            return res.status(400).json({
                success: false,
                error: 'Debe indicar motivo de rechazo'
            });
        }

        const result = await HourBankService.processRequestApproval(
            requestId,
            'reject',
            approverId,
            role,
            notes
        );

        if (result.success) {
            res.json(result);
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        console.error('[HourBank Routes] Error rejecting request:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * @route DELETE /api/hour-bank/requests/:id
 * @desc Cancelar mi solicitud (si esta pendiente)
 * @access Empleado autenticado
 */
router.delete('/requests/:id', auth, async (req, res) => {
    try {
        const requestId = req.params.id;
        const userId = req.user.user_id;

        const [updated] = await sequelize.query(`
            UPDATE hour_bank_requests
            SET status = 'cancelled', updated_at = NOW()
            WHERE id = :requestId AND user_id = :userId AND status = 'pending'
            RETURNING id
        `, {
            replacements: { requestId, userId },
            type: QueryTypes.UPDATE
        });

        if (updated?.length > 0) {
            res.json({ success: true, message: 'Solicitud cancelada' });
        } else {
            res.status(400).json({
                success: false,
                error: 'Solicitud no encontrada o no puede ser cancelada'
            });
        }
    } catch (error) {
        console.error('[HourBank Routes] Error cancelling request:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// DECISIONES PENDIENTES
// ============================================================================

/**
 * @route GET /api/hour-bank/decisions/pending
 * @desc Obtener mis decisiones pendientes (cobrar vs banco)
 * @access Empleado autenticado
 */
router.get('/decisions/pending', auth, async (req, res) => {
    try {
        const userId = req.user.user_id;
        const companyId = req.user.company_id;

        const decisions = await sequelize.query(`
            SELECT *
            FROM hour_bank_pending_decisions
            WHERE user_id = :userId AND company_id = :companyId AND status = 'pending'
            ORDER BY expires_at ASC
        `, {
            replacements: { userId, companyId },
            type: QueryTypes.SELECT
        });

        res.json({ success: true, decisions });
    } catch (error) {
        console.error('[HourBank Routes] Error getting pending decisions:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * @route POST /api/hour-bank/decisions/:id
 * @desc Tomar decision sobre hora extra
 * @access Empleado autenticado
 */
router.post('/decisions/:id', auth, async (req, res) => {
    try {
        const decisionId = req.params.id;
        const userId = req.user.user_id;
        const { choice } = req.body;  // 'pay' o 'bank'

        if (!choice || !['pay', 'bank'].includes(choice)) {
            return res.status(400).json({
                success: false,
                error: 'choice debe ser "pay" o "bank"'
            });
        }

        const result = await HourBankService.processEmployeeDecision(decisionId, choice, userId);

        if (result.success) {
            res.json(result);
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        console.error('[HourBank Routes] Error processing decision:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// ESTADISTICAS Y REPORTES
// ============================================================================

/**
 * @route GET /api/hour-bank/stats
 * @desc Obtener estadisticas de banco de horas de la empresa
 * @access Admin/HR
 */
router.get('/stats', auth, adminOnly, async (req, res) => {
    try {
        const companyId = req.user.company_id;

        const result = await HourBankService.getCompanyStats(companyId);

        res.json(result);
    } catch (error) {
        console.error('[HourBank Routes] Error getting stats:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * @route GET /api/hour-bank/config
 * @desc Obtener configuracion aplicable al usuario actual
 * @access Empleado autenticado
 */
router.get('/config', auth, async (req, res) => {
    try {
        const userId = req.user.user_id;
        const companyId = req.user.company_id;
        const branchId = req.user.branch_id;

        const template = await HourBankService.getApplicableTemplate(userId, companyId, branchId);

        if (!template) {
            return res.json({
                success: true,
                enabled: false,
                message: 'Banco de horas no configurado para esta sucursal'
            });
        }

        // Retornar solo campos relevantes para el empleado
        res.json({
            success: true,
            enabled: template.is_enabled,
            config: {
                templateName: template.template_name,
                countryCode: template.country_code,
                conversionRates: {
                    normal: template.conversion_rate_normal,
                    weekend: template.conversion_rate_weekend,
                    holiday: template.conversion_rate_holiday,
                    night: template.conversion_rate_night
                },
                limits: {
                    maxAccumulation: template.max_accumulation_hours,
                    maxMonthly: template.max_monthly_accrual
                },
                expiration: {
                    enabled: template.expiration_enabled,
                    months: template.expiration_months
                },
                employeeChoice: template.employee_choice_enabled,
                allowedUsage: {
                    partialDay: template.allow_partial_day_usage,
                    fullDay: template.allow_full_day_usage,
                    earlyDeparture: template.allow_early_departure,
                    lateCompensation: template.allow_late_arrival_compensation
                },
                minUsageHours: template.min_usage_hours,
                maxUsagePerDay: template.max_usage_hours_per_day,
                advanceNoticeDays: template.advance_notice_days,
                legalReference: template.legal_reference
            }
        });
    } catch (error) {
        console.error('[HourBank Routes] Error getting config:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// INTEGRACION CON FICHAJE
// ============================================================================

/**
 * @route POST /api/hour-bank/validate-early-departure
 * @desc Validar si puede salir anticipado con banco de horas
 * @access Empleado autenticado (usado por kiosco/app)
 */
router.post('/validate-early-departure', auth, async (req, res) => {
    try {
        const userId = req.user.user_id;
        const companyId = req.user.company_id;
        const { minutesEarly } = req.body;

        if (!minutesEarly || minutesEarly <= 0) {
            return res.status(400).json({
                success: false,
                error: 'minutesEarly debe ser mayor a 0'
            });
        }

        const result = await HourBankService.validateEarlyDeparture(userId, companyId, minutesEarly);

        res.json({
            success: true,
            ...result
        });
    } catch (error) {
        console.error('[HourBank Routes] Error validating early departure:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * @route POST /api/hour-bank/process-early-departure
 * @desc Procesar salida anticipada descontando del banco
 * @access Sistema (usado por attendance service)
 */
router.post('/process-early-departure', auth, async (req, res) => {
    try {
        const userId = req.user.user_id;
        const companyId = req.user.company_id;
        const { minutesEarly, attendanceId } = req.body;

        const result = await HourBankService.processEarlyDeparture(
            userId,
            companyId,
            minutesEarly,
            attendanceId
        );

        if (result.success) {
            res.json(result);
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        console.error('[HourBank Routes] Error processing early departure:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Importar sequelize para queries directas
const { sequelize } = require('../config/database');
const { QueryTypes } = require('sequelize');

// ============================================================================
// ANALISIS DE RIESGO Y SALUD DE CUENTA
// ============================================================================

/**
 * @route GET /api/hour-bank/health/:userId
 * @desc Analisis de salud de cuenta de un empleado
 * @access Supervisor/Admin o el mismo empleado
 */
router.get('/health/:userId', auth, async (req, res) => {
    try {
        const targetUserId = req.params.userId;
        const companyId = req.user.company_id;
        const requestingUserId = req.user.user_id;
        const isAdmin = ['admin', 'hr', 'supervisor'].includes(req.user.role);

        // Solo puede ver si es admin/supervisor o es su propia cuenta
        if (!isAdmin && targetUserId != requestingUserId) {
            return res.status(403).json({ success: false, error: 'No autorizado' });
        }

        const result = await HourBankService.analyzeAccountHealth(companyId, targetUserId);
        res.json(result);
    } catch (error) {
        console.error('[HourBank Routes] Error analyzing health:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * @route GET /api/hour-bank/my-health
 * @desc Mi analisis de salud de cuenta
 * @access Empleado autenticado
 */
router.get('/my-health', auth, async (req, res) => {
    try {
        const userId = req.user.user_id;
        const companyId = req.user.company_id;

        const result = await HourBankService.analyzeAccountHealth(companyId, userId);
        res.json(result);
    } catch (error) {
        console.error('[HourBank Routes] Error analyzing health:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * @route GET /api/hour-bank/vicious-cycle/:userId
 * @desc Analisis de riesgo de ciclo vicioso
 * @access Supervisor/Admin
 */
router.get('/vicious-cycle/:userId', auth, supervisorOrAdmin, async (req, res) => {
    try {
        const userId = req.params.userId;
        const companyId = req.user.company_id;
        const months = parseInt(req.query.months) || 6;

        const result = await HourBankService.analyzeViciousCycleRisk(companyId, userId, months);
        res.json(result);
    } catch (error) {
        console.error('[HourBank Routes] Error analyzing vicious cycle:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * @route GET /api/hour-bank/employees-at-risk
 * @desc Obtener lista de empleados en riesgo
 * @access Admin/HR
 */
router.get('/employees-at-risk', auth, adminOnly, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const riskLevel = req.query.level || 'medium'; // low, medium, high, critical

        const result = await HourBankService.getEmployeesAtRisk(companyId, riskLevel);
        res.json(result);
    } catch (error) {
        console.error('[HourBank Routes] Error getting employees at risk:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// PRESUPUESTOS
// ============================================================================

/**
 * @route GET /api/hour-bank/budget
 * @desc Ver estado del presupuesto
 * @access Admin/HR
 */
router.get('/budget', auth, adminOnly, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const branchId = req.query.branchId || null;

        const result = await HourBankService.checkBudgetAvailability(companyId, branchId, 0);
        res.json(result);
    } catch (error) {
        console.error('[HourBank Routes] Error checking budget:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * @route POST /api/hour-bank/budget
 * @desc Crear o actualizar presupuesto
 * @access Admin
 */
router.post('/budget', auth, adminOnly, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const { branchId, departmentId, periodStart, periodEnd, budgetHours, periodLabel } = req.body;

        const result = await HourBankService.createOrUpdateBudget({
            companyId,
            branchId,
            departmentId,
            periodStart,
            periodEnd,
            budgetHours,
            periodLabel
        });

        res.json(result);
    } catch (error) {
        console.error('[HourBank Routes] Error creating budget:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * @route GET /api/hour-bank/budgets
 * @desc Listar presupuestos
 * @access Admin
 */
router.get('/budgets', auth, adminOnly, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const { status } = req.query;

        let whereClause = 'WHERE company_id = :companyId';
        const replacements = { companyId };

        if (status) {
            whereClause += ' AND status = :status';
            replacements.status = status;
        }

        const budgets = await sequelize.query(`
            SELECT
                hb.*,
                cb.name as branch_name,
                d.name as department_name
            FROM hour_bank_budgets hb
            LEFT JOIN company_branches cb ON hb.branch_id = cb.id
            LEFT JOIN departments d ON hb.department_id = d.id
            ${whereClause}
            ORDER BY period_start DESC
        `, {
            replacements,
            type: QueryTypes.SELECT
        });

        res.json({ success: true, budgets });
    } catch (error) {
        console.error('[HourBank Routes] Error listing budgets:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// METRICAS JERARQUICAS PARA DASHBOARD (RUTAS ESPECIFICAS PRIMERO)
// ============================================================================

/**
 * @route GET /api/hour-bank/metrics/company
 * @desc Obtener metricas a nivel empresa para dashboard
 * @access Admin/HR
 */
router.get('/metrics/company', auth, adminOnly, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const result = await HourBankService.getCompanyDashboardMetrics(companyId);
        res.json(result);
    } catch (error) {
        console.error('[HourBank Routes] Error getting company metrics:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * @route GET /api/hour-bank/metrics/branches
 * @desc Obtener metricas agrupadas por sucursal
 * @access Admin/HR
 */
router.get('/metrics/branches', auth, adminOnly, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const result = await HourBankService.getBranchMetrics(companyId);
        res.json(result);
    } catch (error) {
        console.error('[HourBank Routes] Error getting branch metrics:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * @route GET /api/hour-bank/metrics/departments
 * @desc Obtener metricas agrupadas por departamento
 * @access Admin/HR/Supervisor
 */
router.get('/metrics/departments', auth, supervisorOrAdmin, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const { branchId } = req.query;
        const result = await HourBankService.getDepartmentMetrics(companyId, branchId || null);
        res.json(result);
    } catch (error) {
        console.error('[HourBank Routes] Error getting department metrics:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * @route GET /api/hour-bank/employees-list
 * @desc Obtener lista de empleados con balances (paginado)
 * @access Admin/HR/Supervisor
 */
router.get('/employees-list', auth, supervisorOrAdmin, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const { branchId, departmentId, search, sortBy, sortOrder, limit, offset } = req.query;

        const result = await HourBankService.getEmployeeBalancesList({
            companyId,
            branchId: branchId || null,
            departmentId: departmentId || null,
            search: search || null,
            sortBy: sortBy || 'balance',
            sortOrder: sortOrder || 'DESC',
            limit: parseInt(limit) || 50,
            offset: parseInt(offset) || 0
        });

        res.json(result);
    } catch (error) {
        console.error('[HourBank Routes] Error getting employees list:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// METRICAS DRILL-DOWN (RUTA GENERAL AL FINAL)
// ============================================================================

/**
 * @route GET /api/hour-bank/metrics
 * @desc Obtener metricas con drill-down
 * @access Admin/HR/Supervisor
 */
router.get('/metrics', auth, supervisorOrAdmin, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const { branchId, departmentId, userId, dateFrom, dateTo } = req.query;

        const result = await HourBankService.getDrillDownMetrics({
            companyId,
            branchId: branchId || null,
            departmentId: departmentId || null,
            userId: userId || null,
            dateFrom: dateFrom || null,
            dateTo: dateTo || null
        });

        res.json(result);
    } catch (error) {
        console.error('[HourBank Routes] Error getting metrics:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * @route GET /api/hour-bank/my-summary
 * @desc Resumen completo para Mi Espacio del empleado
 * @access Empleado autenticado
 */
router.get('/my-summary', auth, async (req, res) => {
    try {
        const userId = req.user.user_id;
        const companyId = req.user.company_id;

        const result = await HourBankService.getEmployeeSummary(companyId, userId);
        res.json(result);
    } catch (error) {
        console.error('[HourBank Routes] Error getting employee summary:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * @route GET /api/hour-bank/employee-summary/:userId
 * @desc Resumen de un empleado especifico (para Expediente 360)
 * @access Supervisor/Admin
 */
router.get('/employee-summary/:userId', auth, supervisorOrAdmin, async (req, res) => {
    try {
        const userId = req.params.userId;
        const companyId = req.user.company_id;

        const result = await HourBankService.getEmployeeSummary(companyId, userId);
        res.json(result);
    } catch (error) {
        console.error('[HourBank Routes] Error getting employee summary:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * @route POST /api/hour-bank/record-impact
 * @desc Registrar impacto de devolucion (ciclo vicioso)
 * @access Sistema interno
 */
router.post('/record-impact', auth, adminOnly, async (req, res) => {
    try {
        const { transactionId, overtimeGenerated } = req.body;

        const result = await HourBankService.recordReturnImpact(transactionId, overtimeGenerated);
        res.json(result);
    } catch (error) {
        console.error('[HourBank Routes] Error recording impact:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// SISTEMA DE CANJE DE HORAS CON WORKFLOW
// ============================================================================

/**
 * @route POST /api/hour-bank/redemption
 * @desc Crear solicitud de canje de horas
 * @access Empleado autenticado
 */
router.post('/redemption', auth, async (req, res) => {
    try {
        const userId = req.user.user_id;
        const companyId = req.user.company_id;
        const { hoursRequested, scheduledDate, redemptionType, reason, loanJustification } = req.body;

        if (!hoursRequested || !scheduledDate) {
            return res.status(400).json({
                success: false,
                error: 'Campos requeridos: hoursRequested, scheduledDate'
            });
        }

        const result = await HourBankService.createRedemptionRequest({
            userId,
            companyId,
            hoursRequested: parseFloat(hoursRequested),
            scheduledDate,
            redemptionType: redemptionType || 'early_departure',
            reason,
            loanJustification  // Para solicitudes de préstamo
        });

        if (result.success) {
            res.status(201).json(result);
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        console.error('[HourBank Routes] Error creating redemption request:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * @route GET /api/hour-bank/redemption/my-requests
 * @desc Obtener mis solicitudes de canje
 * @access Empleado autenticado
 */
router.get('/redemption/my-requests', auth, async (req, res) => {
    try {
        const userId = req.user.user_id;
        const companyId = req.user.company_id;
        const { status } = req.query;

        const result = await HourBankService.getRedemptionRequests({
            companyId,
            userId,
            status: status || null
        });

        res.json(result);
    } catch (error) {
        console.error('[HourBank Routes] Error getting my redemption requests:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * @route GET /api/hour-bank/redemption/pending-approval
 * @desc Obtener solicitudes pendientes de aprobacion (supervisor/HR)
 * @access Supervisor/Admin/HR
 */
router.get('/redemption/pending-approval', auth, supervisorOrAdmin, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const userRole = req.user.role;
        const userId = req.user.user_id;

        const params = {
            companyId,
            forApproval: true
        };

        // Si es supervisor, filtrar por su equipo
        if (userRole === 'supervisor') {
            params.supervisorId = userId;
        }

        // Si es HR/admin, mostrar las que estan aprobadas por supervisor
        if (['admin', 'rrhh', 'hr'].includes(userRole)) {
            params.hrApproverId = userId;
        }

        const result = await HourBankService.getRedemptionRequests(params);
        res.json(result);
    } catch (error) {
        console.error('[HourBank Routes] Error getting pending approvals:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * @route PUT /api/hour-bank/redemption/:id/approve
 * @desc Aprobar solicitud de canje
 * @access Supervisor/Admin/HR
 */
router.put('/redemption/:id/approve', auth, supervisorOrAdmin, async (req, res) => {
    try {
        const requestId = req.params.id;
        const approverId = req.user.user_id;
        const userRole = req.user.role;
        const { comments } = req.body;

        // Determinar rol de aprobador
        const approverRole = ['admin', 'rrhh', 'hr'].includes(userRole) ? 'hr' : 'supervisor';

        const result = await HourBankService.processRedemptionApproval({
            requestId,
            approverId,
            approverRole,
            action: 'approve',
            comments
        });

        if (result.success) {
            res.json(result);
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        console.error('[HourBank Routes] Error approving redemption:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * @route PUT /api/hour-bank/redemption/:id/reject
 * @desc Rechazar solicitud de canje
 * @access Supervisor/Admin/HR
 */
router.put('/redemption/:id/reject', auth, supervisorOrAdmin, async (req, res) => {
    try {
        const requestId = req.params.id;
        const approverId = req.user.user_id;
        const userRole = req.user.role;
        const { comments } = req.body;

        if (!comments) {
            return res.status(400).json({
                success: false,
                error: 'Debe indicar motivo de rechazo'
            });
        }

        const approverRole = ['admin', 'rrhh', 'hr'].includes(userRole) ? 'hr' : 'supervisor';

        const result = await HourBankService.processRedemptionApproval({
            requestId,
            approverId,
            approverRole,
            action: 'reject',
            comments
        });

        if (result.success) {
            res.json(result);
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        console.error('[HourBank Routes] Error rejecting redemption:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * @route DELETE /api/hour-bank/redemption/:id
 * @desc Cancelar mi solicitud de canje
 * @access Empleado autenticado
 */
router.delete('/redemption/:id', auth, async (req, res) => {
    try {
        const requestId = req.params.id;
        const userId = req.user.user_id;

        const result = await HourBankService.cancelRedemptionRequest(requestId, userId);

        if (result.success) {
            res.json(result);
        } else {
            res.status(400).json(result);
        }
    } catch (error) {
        console.error('[HourBank Routes] Error cancelling redemption:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * @route GET /api/hour-bank/redemption/scheduled
 * @desc Obtener canjes programados para una fecha
 * @access Supervisor/Admin
 */
router.get('/redemption/scheduled', auth, supervisorOrAdmin, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const date = req.query.date || new Date().toISOString().split('T')[0];

        const result = await HourBankService.getScheduledRedemptions(companyId, date);
        res.json(result);
    } catch (error) {
        console.error('[HourBank Routes] Error getting scheduled redemptions:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * @route POST /api/hour-bank/redemption/process-checkout
 * @desc Procesar checkout con canje (llamado por sistema de asistencia)
 * @access Sistema/Admin
 */
router.post('/redemption/process-checkout', auth, async (req, res) => {
    try {
        const userId = req.body.userId || req.user.user_id;
        const companyId = req.user.company_id;
        const { checkoutTime } = req.body;

        if (!checkoutTime) {
            return res.status(400).json({
                success: false,
                error: 'checkoutTime es requerido (formato HH:MM)'
            });
        }

        const result = await HourBankService.processRedemptionCheckout(userId, companyId, checkoutTime);
        res.json(result);
    } catch (error) {
        console.error('[HourBank Routes] Error processing redemption checkout:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * @route GET /api/hour-bank/redemption/summary
 * @desc Resumen de canje para Mi Espacio
 * @access Empleado autenticado
 */
router.get('/redemption/summary', auth, async (req, res) => {
    try {
        const userId = req.user.user_id;
        const companyId = req.user.company_id;

        const result = await HourBankService.getRedemptionSummary(companyId, userId);
        res.json(result);
    } catch (error) {
        console.error('[HourBank Routes] Error getting redemption summary:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * @route GET /api/hour-bank/account-statement
 * @desc Obtener estado de cuenta (cuenta corriente)
 * @access Empleado autenticado
 */
router.get('/account-statement', auth, async (req, res) => {
    try {
        const userId = req.user.user_id;
        const companyId = req.user.company_id;
        const { fromDate, toDate } = req.query;

        const result = await HourBankService.getAccountStatement(companyId, userId, fromDate, toDate);
        res.json(result);
    } catch (error) {
        console.error('[HourBank Routes] Error getting account statement:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * @route GET /api/hour-bank/account-statement/:userId
 * @desc Obtener estado de cuenta de un empleado (para RRHH/Admin)
 * @access Supervisor/Admin
 */
router.get('/account-statement/:userId', auth, supervisorOrAdmin, async (req, res) => {
    try {
        const userId = req.params.userId;
        const companyId = req.user.company_id;
        const { fromDate, toDate } = req.query;

        const result = await HourBankService.getAccountStatement(companyId, userId, fromDate, toDate);
        res.json(result);
    } catch (error) {
        console.error('[HourBank Routes] Error getting account statement:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// SISTEMA DE PRÉSTAMOS DE HORAS (Hour Loans)
// ============================================================================

/**
 * @route GET /api/hour-bank/loans/my-status
 * @desc Obtener mi estado de préstamos/deudas
 * @access Empleado autenticado
 */
router.get('/loans/my-status', auth, async (req, res) => {
    try {
        const userId = req.user.user_id;
        const companyId = req.user.company_id;

        const result = await HourBankService.getUserLoanStatus(companyId, userId);
        res.json(result);
    } catch (error) {
        console.error('[HourBank Routes] Error getting loan status:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * @route GET /api/hour-bank/loans/employee-status/:userId
 * @desc Obtener estado de préstamos de un empleado (para RRHH/Admin)
 * @access Supervisor/Admin
 */
router.get('/loans/employee-status/:userId', auth, supervisorOrAdmin, async (req, res) => {
    try {
        const userId = req.params.userId;
        const companyId = req.user.company_id;

        const result = await HourBankService.getUserLoanStatus(companyId, userId);
        res.json(result);
    } catch (error) {
        console.error('[HourBank Routes] Error getting employee loan status:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * @route POST /api/hour-bank/redemption/execute-with-loan
 * @desc Ejecutar checkout con canje (crea préstamo si aplica)
 * @access Sistema/Admin
 */
router.post('/redemption/execute-with-loan', auth, async (req, res) => {
    try {
        const userId = req.body.userId || req.user.user_id;
        const companyId = req.user.company_id;
        const { checkoutTime } = req.body;

        if (!checkoutTime) {
            return res.status(400).json({
                success: false,
                error: 'checkoutTime es requerido (formato HH:MM)'
            });
        }

        const result = await HourBankService.executeRedemptionWithLoan(userId, companyId, checkoutTime);
        res.json(result);
    } catch (error) {
        console.error('[HourBank Routes] Error executing redemption with loan:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// FICHAJES CON HORAS EXTRAS (SSOT para Dashboard)
// ============================================================================

/**
 * @route GET /api/hour-bank/fichajes
 * @desc Obtener fichajes con información de horas extras y destino
 * @access Admin/HR/Supervisor
 * @description SSOT para la grilla de fichajes con columnas Extras vs Banco
 */
router.get('/fichajes', auth, supervisorOrAdmin, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const {
            branchId,
            departmentId,
            overtimeDestination,
            dateFrom,
            dateTo,
            search,
            limit = 50,
            offset = 0
        } = req.query;

        // Construir filtros
        let whereClause = 'WHERE a.company_id = :companyId';
        const replacements = {
            companyId,
            limit: parseInt(limit),
            offset: parseInt(offset)
        };

        // Filtro por sucursal
        if (branchId) {
            whereClause += ' AND u.branch_id = :branchId';
            replacements.branchId = branchId;
        }

        // Filtro por departamento
        if (departmentId) {
            whereClause += ' AND u.department_id = :departmentId';
            replacements.departmentId = departmentId;
        }

        // Filtro por destino de horas extras
        if (overtimeDestination) {
            whereClause += ' AND a.overtime_destination = :overtimeDestination';
            replacements.overtimeDestination = overtimeDestination;
        }

        // Filtro por rango de fechas
        if (dateFrom) {
            whereClause += ' AND a.date >= :dateFrom';
            replacements.dateFrom = dateFrom;
        }
        if (dateTo) {
            whereClause += ' AND a.date <= :dateTo';
            replacements.dateTo = dateTo;
        }

        // Filtro por búsqueda de nombre
        if (search) {
            whereClause += ` AND (u."firstName" ILIKE :search OR u."lastName" ILIKE :search OR u.legajo ILIKE :search)`;
            replacements.search = `%${search}%`;
        }

        // Consulta principal: fichajes con info de usuario, sucursal, depto, sector y decisiones
        const fichajes = await sequelize.query(`
            SELECT
                a.id,
                a.date,
                a."checkInTime" as check_in,
                a."checkOutTime" as check_out,
                a.overtime_hours,
                a.overtime_destination,
                a.company_id,
                EXTRACT(EPOCH FROM (a."checkOutTime" - a."checkInTime"))/3600 as hours_worked,
                u.user_id,
                u."firstName" || ' ' || u."lastName" as employee_name,
                u.legajo,
                cb.id as branch_id,
                cb.branch_name as branch_name,
                d.id as department_id,
                d.name as department_name,
                s.id as sector_id,
                s.name as sector_name,
                pd.status as decision_status,
                pd.decision as employee_decision
            FROM attendances a
            INNER JOIN users u ON a."UserId" = u.user_id
            LEFT JOIN company_branches cb ON u.branch_id::text = cb.id::text
            LEFT JOIN departments d ON u.department_id = d.id
            LEFT JOIN sectors s ON u.sector_id = s.id
            LEFT JOIN hour_bank_pending_decisions pd ON pd.attendance_id = a.id AND pd.company_id = a.company_id
            ${whereClause}
            ORDER BY a.date DESC, a."checkInTime" DESC
            LIMIT :limit OFFSET :offset
        `, {
            replacements,
            type: QueryTypes.SELECT
        });

        // Contar total para paginación
        const [countResult] = await sequelize.query(`
            SELECT COUNT(*) as total
            FROM attendances a
            INNER JOIN users u ON a."UserId" = u.user_id
            ${whereClause}
        `, {
            replacements,
            type: QueryTypes.SELECT
        });

        res.json({
            success: true,
            fichajes,
            total: parseInt(countResult?.total || 0),
            pagination: {
                limit: parseInt(limit),
                offset: parseInt(offset),
                hasMore: (parseInt(offset) + fichajes.length) < parseInt(countResult?.total || 0)
            }
        });
    } catch (error) {
        console.error('[HourBank Routes] Error getting fichajes:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
