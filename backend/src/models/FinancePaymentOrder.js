/**
 * Finance Payment Order Model
 * Órdenes de Pago - Completa el circuito P2P (Procure to Pay)
 * Integración con: ProcurementInvoice, CashMovement, NotificationService
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const FinancePaymentOrder = sequelize.define('FinancePaymentOrder', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        company_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'companies', key: 'company_id' }
        },
        branch_id: {
            type: DataTypes.INTEGER,
            references: { model: 'branches', key: 'id' }
        },

        // Identificación
        order_number: {
            type: DataTypes.STRING(50),
            allowNull: false,
            comment: 'Número de orden de pago ej: OP-2025-00001'
        },
        order_date: {
            type: DataTypes.DATEONLY,
            allowNull: false,
            defaultValue: DataTypes.NOW
        },

        // Estado del workflow
        status: {
            type: DataTypes.STRING(30),
            allowNull: false,
            defaultValue: 'draft',
            validate: {
                isIn: [[
                    'draft',              // Borrador
                    'pending_approval',   // Pendiente de aprobación
                    'approved',           // Aprobada
                    'scheduled',          // Programada para pago
                    'executing',          // En proceso de pago
                    'executed',           // Pagada
                    'cancelled'           // Cancelada
                ]]
            }
        },

        // Fechas de pago
        scheduled_payment_date: {
            type: DataTypes.DATEONLY,
            comment: 'Fecha programada para el pago'
        },
        actual_payment_date: {
            type: DataTypes.DATEONLY,
            comment: 'Fecha real de ejecución del pago'
        },

        // Totales
        total_amount: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false,
            comment: 'Total bruto de facturas incluidas'
        },
        total_retentions: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0,
            comment: 'Total de retenciones aplicadas'
        },
        total_discounts: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0,
            comment: 'Total de descuentos por pronto pago'
        },
        net_payment_amount: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false,
            comment: 'Monto neto a pagar'
        },

        // Moneda
        currency: {
            type: DataTypes.STRING(3),
            defaultValue: 'ARS'
        },
        exchange_rate: {
            type: DataTypes.DECIMAL(15, 6),
            defaultValue: 1.000000
        },
        amount_in_base_currency: {
            type: DataTypes.DECIMAL(15, 2),
            comment: 'Monto en moneda base de la empresa'
        },

        // Beneficiario (proveedor)
        supplier_id: {
            type: DataTypes.INTEGER,
            references: { model: 'wms_suppliers', key: 'id' }
        },
        supplier_name: {
            type: DataTypes.STRING(200),
            comment: 'Nombre desnormalizado para reportes'
        },
        supplier_cuit: {
            type: DataTypes.STRING(20)
        },
        supplier_bank_account: {
            type: DataTypes.JSONB,
            defaultValue: {},
            comment: 'Datos bancarios: {bank, account_type, account_number, cbu, alias}'
        },

        // Método de pago
        payment_method: {
            type: DataTypes.STRING(30),
            allowNull: false,
            validate: {
                isIn: [['transfer', 'check', 'cash', 'multiple', 'credit_card', 'debit_card']]
            }
        },
        payment_details: {
            type: DataTypes.JSONB,
            defaultValue: {},
            comment: 'Detalles específicos según método: {transfer_ref, check_number, etc}'
        },

        // Autorización (workflow jerárquico)
        requires_authorization: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        authorization_level: {
            type: DataTypes.STRING(30),
            validate: {
                isIn: [['operator', 'supervisor', 'finance', 'management', 'board', null]]
            },
            comment: 'Nivel mínimo requerido según monto'
        },
        authorization_amount_threshold: {
            type: DataTypes.DECIMAL(15, 2),
            comment: 'Umbral de monto para autorización'
        },
        approvals: {
            type: DataTypes.JSONB,
            defaultValue: [],
            comment: 'Historial de aprobaciones: [{user_id, role, approved_at, method}]'
        },

        // Integración con Finance (Cash Management)
        cash_register_id: {
            type: DataTypes.INTEGER,
            references: { model: 'finance_cash_registers', key: 'id' }
        },
        cash_movement_id: {
            type: DataTypes.INTEGER,
            references: { model: 'finance_cash_movements', key: 'id' }
        },
        journal_entry_id: {
            type: DataTypes.INTEGER,
            references: { model: 'finance_journal_entries', key: 'id' }
        },

        // Notificaciones
        notification_sent: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        notification_sent_at: {
            type: DataTypes.DATE
        },
        notification_email: {
            type: DataTypes.STRING(200),
            comment: 'Email donde se envió la notificación'
        },

        // Centro de costo (para OLAP)
        cost_center_id: {
            type: DataTypes.INTEGER,
            references: { model: 'finance_cost_centers', key: 'id' }
        },

        // Notas y descripción
        notes: {
            type: DataTypes.TEXT
        },
        internal_notes: {
            type: DataTypes.TEXT,
            comment: 'Notas internas no visibles al proveedor'
        },

        // Audit trail
        audit_trail: {
            type: DataTypes.JSONB,
            defaultValue: [],
            comment: 'Historial completo de acciones'
        },

        // Cancelación
        cancelled_at: {
            type: DataTypes.DATE
        },
        cancelled_by: {
            type: DataTypes.UUID,
            references: { model: 'users', key: 'user_id' }
        },
        cancellation_reason: {
            type: DataTypes.TEXT
        },

        // Auditoría de creación/modificación
        created_by: {
            type: DataTypes.UUID,
            references: { model: 'users', key: 'user_id' }
        },
        approved_by: {
            type: DataTypes.UUID,
            references: { model: 'users', key: 'user_id' }
        },
        executed_by: {
            type: DataTypes.UUID,
            references: { model: 'users', key: 'user_id' }
        }
    }, {
        tableName: 'finance_payment_orders',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            { unique: true, fields: ['company_id', 'order_number'] },
            { fields: ['company_id', 'status'] },
            { fields: ['company_id', 'scheduled_payment_date'] },
            { fields: ['supplier_id'] },
            { fields: ['branch_id'] },
            { fields: ['cost_center_id'] },
            { fields: ['created_at'] }
        ]
    });

    // Configuración de umbrales de autorización
    FinancePaymentOrder.AUTHORIZATION_THRESHOLDS = {
        operator: 100000,      // Hasta $100.000
        supervisor: 500000,    // $100.001 - $500.000
        finance: 1000000,      // $500.001 - $1.000.000
        management: 5000000,   // $1.000.001 - $5.000.000
        board: Infinity        // > $5.000.000
    };

    // Determinar nivel de autorización requerido
    FinancePaymentOrder.getRequiredAuthorizationLevel = function(amount) {
        const thresholds = this.AUTHORIZATION_THRESHOLDS;
        if (amount <= thresholds.operator) return 'operator';
        if (amount <= thresholds.supervisor) return 'supervisor';
        if (amount <= thresholds.finance) return 'finance';
        if (amount <= thresholds.management) return 'management';
        return 'board';
    };

    // Generar número de orden
    FinancePaymentOrder.generateOrderNumber = async function(companyId) {
        const year = new Date().getFullYear();
        const prefix = `OP-${year}-`;

        const lastOrder = await this.findOne({
            where: {
                company_id: companyId,
                order_number: { [sequelize.Sequelize.Op.like]: `${prefix}%` }
            },
            order: [['order_number', 'DESC']]
        });

        let sequence = 1;
        if (lastOrder) {
            const lastNum = parseInt(lastOrder.order_number.replace(prefix, ''));
            sequence = lastNum + 1;
        }

        return `${prefix}${sequence.toString().padStart(5, '0')}`;
    };

    // Agregar entrada de auditoría
    FinancePaymentOrder.prototype.addAuditEntry = function(action, userId, details = {}) {
        const trail = this.audit_trail || [];
        trail.push({
            action,
            user_id: userId,
            timestamp: new Date().toISOString(),
            details
        });
        this.audit_trail = trail;
    };

    // Enviar a aprobación
    FinancePaymentOrder.prototype.submitForApproval = async function(userId) {
        if (this.status !== 'draft') {
            throw new Error('Solo órdenes en borrador pueden enviarse a aprobación');
        }

        this.status = 'pending_approval';
        this.authorization_level = FinancePaymentOrder.getRequiredAuthorizationLevel(this.net_payment_amount);
        this.addAuditEntry('submitted_for_approval', userId, {
            required_level: this.authorization_level,
            amount: this.net_payment_amount
        });

        return this.save();
    };

    // Aprobar orden
    FinancePaymentOrder.prototype.approve = async function(userId, userRole, authMethod = 'password') {
        if (this.status !== 'pending_approval') {
            throw new Error('Solo órdenes pendientes pueden aprobarse');
        }

        // Verificar que el rol del usuario puede aprobar
        const roleHierarchy = ['operator', 'supervisor', 'finance', 'management', 'board'];
        const requiredLevel = roleHierarchy.indexOf(this.authorization_level);
        const userLevel = roleHierarchy.indexOf(userRole);

        if (userLevel < requiredLevel) {
            throw new Error(`Se requiere nivel ${this.authorization_level} para aprobar. Usuario tiene nivel ${userRole}`);
        }

        const approvals = this.approvals || [];
        approvals.push({
            user_id: userId,
            role: userRole,
            approved_at: new Date().toISOString(),
            method: authMethod // 'biometric' o 'password'
        });
        this.approvals = approvals;

        this.status = 'approved';
        this.approved_by = userId;
        this.addAuditEntry('approved', userId, {
            role: userRole,
            method: authMethod
        });

        return this.save();
    };

    // Programar para pago
    FinancePaymentOrder.prototype.schedulePayment = async function(paymentDate, userId) {
        if (this.status !== 'approved') {
            throw new Error('Solo órdenes aprobadas pueden programarse');
        }

        this.status = 'scheduled';
        this.scheduled_payment_date = paymentDate;
        this.addAuditEntry('scheduled', userId, { payment_date: paymentDate });

        return this.save();
    };

    // Ejecutar pago
    FinancePaymentOrder.prototype.execute = async function(userId, paymentDetails = {}) {
        if (!['approved', 'scheduled'].includes(this.status)) {
            throw new Error('Solo órdenes aprobadas o programadas pueden ejecutarse');
        }

        this.status = 'executing';
        this.addAuditEntry('executing', userId, paymentDetails);

        return this.save();
    };

    // Marcar como ejecutada
    FinancePaymentOrder.prototype.markExecuted = async function(userId, cashMovementId, journalEntryId) {
        if (this.status !== 'executing') {
            throw new Error('Solo órdenes en ejecución pueden completarse');
        }

        this.status = 'executed';
        this.actual_payment_date = new Date();
        this.executed_by = userId;
        this.cash_movement_id = cashMovementId;
        this.journal_entry_id = journalEntryId;
        this.addAuditEntry('executed', userId, {
            cash_movement_id: cashMovementId,
            journal_entry_id: journalEntryId
        });

        return this.save();
    };

    // Cancelar orden
    FinancePaymentOrder.prototype.cancel = async function(userId, reason) {
        if (['executed', 'cancelled'].includes(this.status)) {
            throw new Error('No se puede cancelar una orden ejecutada o ya cancelada');
        }

        this.status = 'cancelled';
        this.cancelled_at = new Date();
        this.cancelled_by = userId;
        this.cancellation_reason = reason;
        this.addAuditEntry('cancelled', userId, { reason });

        return this.save();
    };

    // Marcar notificación enviada
    FinancePaymentOrder.prototype.markNotificationSent = async function(email) {
        this.notification_sent = true;
        this.notification_sent_at = new Date();
        this.notification_email = email;
        this.addAuditEntry('notification_sent', null, { email });
        return this.save();
    };

    // Obtener órdenes pendientes de aprobación
    FinancePaymentOrder.getPendingApproval = async function(companyId, userRole) {
        const roleHierarchy = ['operator', 'supervisor', 'finance', 'management', 'board'];
        const userLevel = roleHierarchy.indexOf(userRole);
        const approverLevels = roleHierarchy.slice(0, userLevel + 1);

        return this.findAll({
            where: {
                company_id: companyId,
                status: 'pending_approval',
                authorization_level: { [sequelize.Sequelize.Op.in]: approverLevels }
            },
            order: [['created_at', 'ASC']]
        });
    };

    // Obtener estadísticas
    FinancePaymentOrder.getStats = async function(companyId, dateFrom, dateTo) {
        const { Op } = sequelize.Sequelize;
        const where = {
            company_id: companyId
        };

        if (dateFrom && dateTo) {
            where.order_date = { [Op.between]: [dateFrom, dateTo] };
        }

        const [
            totalOrders,
            pendingApproval,
            scheduled,
            executed,
            totalAmount,
            executedAmount
        ] = await Promise.all([
            this.count({ where }),
            this.count({ where: { ...where, status: 'pending_approval' } }),
            this.count({ where: { ...where, status: 'scheduled' } }),
            this.count({ where: { ...where, status: 'executed' } }),
            this.sum('net_payment_amount', { where }),
            this.sum('net_payment_amount', { where: { ...where, status: 'executed' } })
        ]);

        return {
            total_orders: totalOrders || 0,
            pending_approval: pendingApproval || 0,
            scheduled: scheduled || 0,
            executed: executed || 0,
            total_amount: parseFloat(totalAmount) || 0,
            executed_amount: parseFloat(executedAmount) || 0
        };
    };

    // Asociaciones
    FinancePaymentOrder.associate = (models) => {
        FinancePaymentOrder.belongsTo(models.Company, {
            foreignKey: 'company_id',
            as: 'company'
        });
        FinancePaymentOrder.belongsTo(models.Branch, {
            foreignKey: 'branch_id',
            as: 'branch'
        });
        FinancePaymentOrder.belongsTo(models.ProcurementSupplier, {
            foreignKey: 'supplier_id',
            as: 'supplier'
        });
        FinancePaymentOrder.belongsTo(models.FinanceCashRegister, {
            foreignKey: 'cash_register_id',
            as: 'cashRegister'
        });
        FinancePaymentOrder.belongsTo(models.FinanceCashMovement, {
            foreignKey: 'cash_movement_id',
            as: 'cashMovement'
        });
        FinancePaymentOrder.belongsTo(models.FinanceJournalEntry, {
            foreignKey: 'journal_entry_id',
            as: 'journalEntry'
        });
        FinancePaymentOrder.belongsTo(models.FinanceCostCenter, {
            foreignKey: 'cost_center_id',
            as: 'costCenter'
        });
        FinancePaymentOrder.belongsTo(models.User, {
            foreignKey: 'created_by',
            as: 'creator'
        });
        FinancePaymentOrder.belongsTo(models.User, {
            foreignKey: 'approved_by',
            as: 'approver'
        });
        FinancePaymentOrder.belongsTo(models.User, {
            foreignKey: 'executed_by',
            as: 'executor'
        });
        FinancePaymentOrder.belongsTo(models.User, {
            foreignKey: 'cancelled_by',
            as: 'canceller'
        });
        FinancePaymentOrder.hasMany(models.FinancePaymentOrderItem, {
            foreignKey: 'payment_order_id',
            as: 'items'
        });
        FinancePaymentOrder.hasMany(models.FinanceIssuedCheck, {
            foreignKey: 'payment_order_id',
            as: 'issuedChecks'
        });
    };

    return FinancePaymentOrder;
};
