/**
 * ProcurementPayment Model
 * Pagos a proveedores con trazabilidad bancaria
 * Módulo Comercial - Gestión de Compras y Proveedores
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const ProcurementPayment = sequelize.define('ProcurementPayment', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        company_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'companies', key: 'id' }
        },
        payment_number: {
            type: DataTypes.STRING(50),
            allowNull: false
        },
        supplier_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'wms_suppliers', key: 'id' }
        },
        invoice_ids: {
            type: DataTypes.JSONB,
            allowNull: false,
            comment: 'IDs de facturas incluidas en este pago'
        },
        total_amount: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false
        },
        currency: {
            type: DataTypes.STRING(3),
            defaultValue: 'ARS'
        },
        exchange_rate: {
            type: DataTypes.DECIMAL(15, 6)
        },
        bank_account: {
            type: DataTypes.JSONB,
            allowNull: false,
            comment: '{bank_name, account_number, cbu, alias, account_holder}'
        },
        payment_method: {
            type: DataTypes.STRING(50),
            allowNull: false,
            validate: {
                isIn: [['wire_transfer', 'check', 'cash', 'credit_card', 'debit_card']]
            }
        },
        status: {
            type: DataTypes.STRING(50),
            defaultValue: 'pending',
            validate: {
                isIn: [['pending', 'approved', 'processing', 'completed', 'failed', 'cancelled']]
            }
        },
        scheduled_date: {
            type: DataTypes.DATEONLY
        },
        approved_at: {
            type: DataTypes.DATE
        },
        approved_by: {
            type: DataTypes.UUID
        },
        executed_at: {
            type: DataTypes.DATE
        },
        executed_by: {
            type: DataTypes.UUID
        },
        bank_reference: {
            type: DataTypes.STRING(100)
        },
        bank_confirmation: {
            type: DataTypes.JSONB,
            comment: 'Datos de confirmación bancaria'
        },
        check_number: {
            type: DataTypes.STRING(50),
            comment: 'Número de cheque si payment_method = check'
        },
        check_date: {
            type: DataTypes.DATEONLY
        },
        notification_sent_at: {
            type: DataTypes.DATE
        },
        notification_id: {
            type: DataTypes.BIGINT,
            references: { model: 'notifications', key: 'id' }
        },
        notes: {
            type: DataTypes.TEXT
        },
        retentions: {
            type: DataTypes.JSONB,
            defaultValue: [],
            comment: '[{type, percent, amount, certificate}]'
        },
        net_amount: {
            type: DataTypes.DECIMAL(15, 2),
            comment: 'Monto neto después de retenciones'
        },
        audit_trail: {
            type: DataTypes.JSONB,
            defaultValue: []
        },
        created_by: {
            type: DataTypes.UUID
        }
    }, {
        tableName: 'procurement_payments',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            { unique: true, fields: ['company_id', 'payment_number'] },
            { fields: ['company_id', 'status'] },
            { fields: ['supplier_id'] },
            { fields: ['scheduled_date'] }
        ]
    });

    // Agregar entrada de auditoría
    ProcurementPayment.prototype.addAuditEntry = function(action, userId, details = {}) {
        const trail = this.audit_trail || [];
        trail.push({
            action,
            user_id: userId,
            timestamp: new Date().toISOString(),
            details
        });
        this.audit_trail = trail;
    };

    // Calcular monto neto con retenciones
    ProcurementPayment.prototype.calculateNetAmount = function() {
        let totalRetentions = 0;
        if (this.retentions && this.retentions.length > 0) {
            for (const ret of this.retentions) {
                totalRetentions += parseFloat(ret.amount) || 0;
            }
        }
        this.net_amount = parseFloat(this.total_amount) - totalRetentions;
        return this.net_amount;
    };

    // Aprobar pago
    ProcurementPayment.prototype.approve = async function(userId) {
        this.status = 'approved';
        this.approved_at = new Date();
        this.approved_by = userId;
        this.addAuditEntry('approved', userId);
        return this.save();
    };

    // Marcar como en proceso
    ProcurementPayment.prototype.startProcessing = async function(userId) {
        this.status = 'processing';
        this.addAuditEntry('processing_started', userId);
        return this.save();
    };

    // Completar pago
    ProcurementPayment.prototype.complete = async function(userId, bankReference, confirmation = null) {
        this.status = 'completed';
        this.executed_at = new Date();
        this.executed_by = userId;
        this.bank_reference = bankReference;
        if (confirmation) {
            this.bank_confirmation = confirmation;
        }
        this.addAuditEntry('completed', userId, { bank_reference: bankReference });

        // Actualizar facturas asociadas
        if (this.invoice_ids && this.invoice_ids.length > 0) {
            await sequelize.models.ProcurementInvoice.update(
                { status: 'paid', payment_id: this.id, paid_at: new Date() },
                { where: { id: this.invoice_ids } }
            );
        }

        return this.save();
    };

    // Marcar como fallido
    ProcurementPayment.prototype.fail = async function(userId, reason) {
        this.status = 'failed';
        this.notes = reason;
        this.addAuditEntry('failed', userId, { reason });
        return this.save();
    };

    // Cancelar pago
    ProcurementPayment.prototype.cancel = async function(userId, reason) {
        this.status = 'cancelled';
        this.notes = reason;
        this.addAuditEntry('cancelled', userId, { reason });
        return this.save();
    };

    // Agregar retención
    ProcurementPayment.prototype.addRetention = async function(type, percent, amount, certificate = null) {
        const retentions = this.retentions || [];
        retentions.push({
            type,
            percent,
            amount,
            certificate,
            added_at: new Date().toISOString()
        });
        this.retentions = retentions;
        this.calculateNetAmount();
        return this.save();
    };

    // Obtener pagos pendientes
    ProcurementPayment.getPending = async function(companyId) {
        const { Op } = sequelize.Sequelize;
        return this.findAll({
            where: {
                company_id: companyId,
                status: { [Op.in]: ['pending', 'approved'] }
            },
            order: [['scheduled_date', 'ASC']]
        });
    };

    // Obtener pagos programados para una fecha
    ProcurementPayment.getScheduledForDate = async function(companyId, date) {
        return this.findAll({
            where: {
                company_id: companyId,
                scheduled_date: date,
                status: 'approved'
            },
            order: [['total_amount', 'DESC']]
        });
    };

    // Obtener pagos de un proveedor
    ProcurementPayment.getBySupplier = async function(companyId, supplierId) {
        return this.findAll({
            where: { company_id: companyId, supplier_id: supplierId },
            order: [['created_at', 'DESC']]
        });
    };

    // Resumen de pagos por período
    ProcurementPayment.getSummary = async function(companyId, startDate, endDate) {
        const { Op } = sequelize.Sequelize;
        const where = {
            company_id: companyId,
            status: 'completed',
            executed_at: { [Op.between]: [startDate, endDate] }
        };

        const [count, total, byMethod] = await Promise.all([
            this.count({ where }),
            this.sum('total_amount', { where }),
            this.findAll({
                where,
                attributes: [
                    'payment_method',
                    [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
                    [sequelize.fn('SUM', sequelize.col('total_amount')), 'total']
                ],
                group: ['payment_method'],
                raw: true
            })
        ]);

        return {
            count,
            total: total || 0,
            by_method: byMethod
        };
    };

    // Dashboard financiero
    ProcurementPayment.getDashboard = async function(companyId) {
        const { Op } = sequelize.Sequelize;
        const today = new Date();
        const thisWeek = new Date(today);
        thisWeek.setDate(thisWeek.getDate() + 7);
        const thisMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

        const [
            pendingCount,
            pendingAmount,
            scheduledThisWeek,
            scheduledThisWeekAmount,
            completedThisMonth,
            completedThisMonthAmount
        ] = await Promise.all([
            this.count({
                where: { company_id: companyId, status: { [Op.in]: ['pending', 'approved'] } }
            }),
            this.sum('total_amount', {
                where: { company_id: companyId, status: { [Op.in]: ['pending', 'approved'] } }
            }),
            this.count({
                where: {
                    company_id: companyId,
                    status: 'approved',
                    scheduled_date: { [Op.between]: [today, thisWeek] }
                }
            }),
            this.sum('total_amount', {
                where: {
                    company_id: companyId,
                    status: 'approved',
                    scheduled_date: { [Op.between]: [today, thisWeek] }
                }
            }),
            this.count({
                where: {
                    company_id: companyId,
                    status: 'completed',
                    executed_at: { [Op.gte]: new Date(today.getFullYear(), today.getMonth(), 1) }
                }
            }),
            this.sum('total_amount', {
                where: {
                    company_id: companyId,
                    status: 'completed',
                    executed_at: { [Op.gte]: new Date(today.getFullYear(), today.getMonth(), 1) }
                }
            })
        ]);

        return {
            pending: { count: pendingCount, amount: pendingAmount || 0 },
            scheduled_this_week: { count: scheduledThisWeek, amount: scheduledThisWeekAmount || 0 },
            completed_this_month: { count: completedThisMonth, amount: completedThisMonthAmount || 0 }
        };
    };

    return ProcurementPayment;
};
