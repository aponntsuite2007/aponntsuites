/**
 * ProcurementInvoice Model
 * Facturas de proveedor con three-way matching (tolerancia 2%)
 * Módulo Comercial - Gestión de Compras y Proveedores
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const ProcurementInvoice = sequelize.define('ProcurementInvoice', {
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
        invoice_number: {
            type: DataTypes.STRING(100),
            allowNull: false
        },
        supplier_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'procurement_suppliers', key: 'id' }
        },
        order_ids: {
            type: DataTypes.JSONB,
            allowNull: false,
            defaultValue: [],
            comment: 'IDs de órdenes de compra asociadas'
        },
        invoice_date: {
            type: DataTypes.DATEONLY,
            allowNull: false
        },
        due_date: {
            type: DataTypes.DATEONLY,
            allowNull: false
        },
        cae: {
            type: DataTypes.STRING(50),
            comment: 'CAE de factura electrónica (Argentina)'
        },
        cae_expiry: {
            type: DataTypes.DATEONLY
        },
        invoice_type: {
            type: DataTypes.STRING(10),
            defaultValue: 'A',
            validate: {
                isIn: [['A', 'B', 'C', 'M', 'E', null]]
            }
        },
        subtotal: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false
        },
        tax_amount: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0
        },
        other_taxes: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0,
            comment: 'Percepciones, retenciones, etc.'
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
        total_in_base_currency: {
            type: DataTypes.DECIMAL(15, 2)
        },
        // Three-Way Matching
        matching_status: {
            type: DataTypes.STRING(50),
            defaultValue: 'pending',
            validate: {
                isIn: [['pending', 'matched', 'discrepancy', 'approved_with_tolerance', 'rejected']]
            }
        },
        matching_discrepancy: {
            type: DataTypes.DECIMAL(15, 2)
        },
        matching_discrepancy_percent: {
            type: DataTypes.DECIMAL(5, 2)
        },
        matching_details: {
            type: DataTypes.JSONB,
            defaultValue: {},
            comment: 'Detalle del three-way matching'
        },
        matching_notes: {
            type: DataTypes.TEXT
        },
        tolerance_approved_by: {
            type: DataTypes.UUID
        },
        tolerance_approved_at: {
            type: DataTypes.DATE
        },
        // Estado general
        status: {
            type: DataTypes.STRING(50),
            defaultValue: 'pending',
            validate: {
                isIn: [['pending', 'verified', 'approved', 'scheduled', 'paid', 'rejected', 'cancelled']]
            }
        },
        // Documento adjunto
        document_url: {
            type: DataTypes.TEXT
        },
        document_uploaded_at: {
            type: DataTypes.DATE
        },
        // Verificación
        verified_at: {
            type: DataTypes.DATE
        },
        verified_by: {
            type: DataTypes.UUID
        },
        // Aprobación para pago
        approved_for_payment_at: {
            type: DataTypes.DATE
        },
        approved_for_payment_by: {
            type: DataTypes.UUID
        },
        // Pago
        payment_id: {
            type: DataTypes.INTEGER,
            references: { model: 'procurement_payments', key: 'id' }
        },
        payment_scheduled_date: {
            type: DataTypes.DATEONLY
        },
        payment_method: {
            type: DataTypes.STRING(50)
        },
        payment_reference: {
            type: DataTypes.STRING(100)
        },
        paid_at: {
            type: DataTypes.DATE
        },
        paid_amount: {
            type: DataTypes.DECIMAL(15, 2)
        },
        audit_trail: {
            type: DataTypes.JSONB,
            defaultValue: []
        }
    }, {
        tableName: 'procurement_invoices',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            { unique: true, fields: ['company_id', 'supplier_id', 'invoice_number'] },
            { fields: ['company_id', 'status'] },
            { fields: ['company_id', 'matching_status'] },
            { fields: ['supplier_id'] },
            { fields: ['due_date'] }
        ]
    });

    // Configuración de tolerancia (2% según requisito del usuario)
    ProcurementInvoice.TOLERANCE_CONFIG = {
        percent: 2.0,           // Tolerancia máxima 2%
        auto_approve_below: true,
        require_approval_above: true,
        block_above_percent: 10.0
    };

    // Agregar entrada de auditoría
    ProcurementInvoice.prototype.addAuditEntry = function(action, userId, details = {}) {
        const trail = this.audit_trail || [];
        trail.push({
            action,
            user_id: userId,
            timestamp: new Date().toISOString(),
            details
        });
        this.audit_trail = trail;
    };

    // Ejecutar three-way matching
    ProcurementInvoice.prototype.performThreeWayMatch = async function(orders, receipts) {
        const tolerance = ProcurementInvoice.TOLERANCE_CONFIG.percent;
        const blockThreshold = ProcurementInvoice.TOLERANCE_CONFIG.block_above_percent;

        let expectedTotal = 0;
        let receivedTotal = 0;
        const details = {
            orders: [],
            receipts: [],
            items: []
        };

        // Calcular totales de órdenes
        for (const order of orders) {
            expectedTotal += parseFloat(order.total_amount);
            details.orders.push({
                order_id: order.id,
                order_number: order.order_number,
                total: order.total_amount
            });
        }

        // Calcular totales de recepciones
        for (const receipt of receipts) {
            // Sumar valores de items recibidos
            const receiptItems = await sequelize.models.ProcurementReceiptItem.findAll({
                where: { receipt_id: receipt.id }
            });
            let receiptValue = 0;
            for (const item of receiptItems) {
                const orderItem = await sequelize.models.ProcurementOrderItem.findByPk(item.order_item_id);
                if (orderItem) {
                    receiptValue += parseFloat(item.quantity_received) * parseFloat(orderItem.unit_price);
                }
            }
            receivedTotal += receiptValue;
            details.receipts.push({
                receipt_id: receipt.id,
                receipt_number: receipt.receipt_number,
                value: receiptValue
            });
        }

        const invoicedTotal = parseFloat(this.total_amount);
        const discrepancy = invoicedTotal - expectedTotal;
        const discrepancyPercent = expectedTotal > 0 ? (Math.abs(discrepancy) / expectedTotal) * 100 : 0;

        this.matching_discrepancy = discrepancy;
        this.matching_discrepancy_percent = discrepancyPercent;
        this.matching_details = {
            ...details,
            expected_total: expectedTotal,
            received_total: receivedTotal,
            invoiced_total: invoicedTotal,
            discrepancy,
            discrepancy_percent: discrepancyPercent
        };

        // Determinar estado
        if (Math.abs(discrepancyPercent) === 0) {
            this.matching_status = 'matched';
            this.status = 'verified';
        } else if (discrepancyPercent <= tolerance) {
            this.matching_status = 'approved_with_tolerance';
            this.status = 'verified';
        } else if (discrepancyPercent <= blockThreshold) {
            this.matching_status = 'discrepancy';
            this.matching_notes = `Discrepancia de ${discrepancyPercent.toFixed(2)}% requiere aprobación manual`;
        } else {
            this.matching_status = 'rejected';
            this.status = 'rejected';
            this.matching_notes = `Discrepancia de ${discrepancyPercent.toFixed(2)}% excede el límite permitido`;
        }

        this.addAuditEntry('three_way_match', null, {
            result: this.matching_status,
            discrepancy_percent: discrepancyPercent
        });

        return this.save();
    };

    // Aprobar discrepancia
    ProcurementInvoice.prototype.approveWithTolerance = async function(userId, notes = '') {
        if (this.matching_status !== 'discrepancy') {
            throw new Error('Solo se pueden aprobar facturas con discrepancia');
        }
        this.matching_status = 'approved_with_tolerance';
        this.status = 'verified';
        this.tolerance_approved_by = userId;
        this.tolerance_approved_at = new Date();
        this.matching_notes = notes;
        this.addAuditEntry('tolerance_approved', userId, { notes });
        return this.save();
    };

    // Aprobar para pago
    ProcurementInvoice.prototype.approveForPayment = async function(userId) {
        if (this.status !== 'verified') {
            throw new Error('La factura debe estar verificada');
        }
        this.status = 'approved';
        this.approved_for_payment_at = new Date();
        this.approved_for_payment_by = userId;
        this.addAuditEntry('approved_for_payment', userId);
        return this.save();
    };

    // Programar pago
    ProcurementInvoice.prototype.schedulePayment = async function(date, method) {
        this.status = 'scheduled';
        this.payment_scheduled_date = date;
        this.payment_method = method;
        this.addAuditEntry('payment_scheduled', null, { date, method });
        return this.save();
    };

    // Marcar como pagada
    ProcurementInvoice.prototype.markPaid = async function(paymentId, reference, paidAmount = null) {
        this.status = 'paid';
        this.payment_id = paymentId;
        this.payment_reference = reference;
        this.paid_at = new Date();
        this.paid_amount = paidAmount || this.total_amount;
        this.addAuditEntry('paid', null, { payment_id: paymentId, reference });
        return this.save();
    };

    // Obtener facturas pendientes de matching
    ProcurementInvoice.getPendingMatching = async function(companyId) {
        return this.findAll({
            where: { company_id: companyId, matching_status: 'pending' },
            order: [['created_at', 'ASC']]
        });
    };

    // Obtener facturas con discrepancia
    ProcurementInvoice.getWithDiscrepancy = async function(companyId) {
        return this.findAll({
            where: { company_id: companyId, matching_status: 'discrepancy' },
            order: [['created_at', 'ASC']]
        });
    };

    // Obtener facturas pendientes de pago
    ProcurementInvoice.getPendingPayment = async function(companyId) {
        const { Op } = sequelize.Sequelize;
        return this.findAll({
            where: {
                company_id: companyId,
                status: { [Op.in]: ['approved', 'scheduled'] }
            },
            order: [['due_date', 'ASC']]
        });
    };

    // Obtener facturas vencidas
    ProcurementInvoice.getOverdue = async function(companyId) {
        const { Op } = sequelize.Sequelize;
        return this.findAll({
            where: {
                company_id: companyId,
                status: { [Op.in]: ['approved', 'scheduled'] },
                due_date: { [Op.lt]: new Date() }
            },
            order: [['due_date', 'ASC']]
        });
    };

    // Estadísticas de facturas
    ProcurementInvoice.getStats = async function(companyId) {
        const { Op } = sequelize.Sequelize;
        const today = new Date();

        const [pending, approved, overdue, totalPayable, paidThisMonth] = await Promise.all([
            this.count({ where: { company_id: companyId, status: 'pending' } }),
            this.count({ where: { company_id: companyId, status: 'approved' } }),
            this.count({
                where: {
                    company_id: companyId,
                    status: { [Op.in]: ['approved', 'scheduled'] },
                    due_date: { [Op.lt]: today }
                }
            }),
            this.sum('total_amount', {
                where: { company_id: companyId, status: { [Op.in]: ['approved', 'scheduled'] } }
            }),
            this.sum('paid_amount', {
                where: {
                    company_id: companyId,
                    status: 'paid',
                    paid_at: {
                        [Op.gte]: new Date(today.getFullYear(), today.getMonth(), 1)
                    }
                }
            })
        ]);

        return {
            pending,
            approved,
            overdue,
            total_payable: totalPayable || 0,
            paid_this_month: paidThisMonth || 0
        };
    };

    return ProcurementInvoice;
};
