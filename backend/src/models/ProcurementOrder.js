/**
 * ProcurementOrder Model
 * Órdenes de compra con tracking completo de estado
 * Módulo Comercial - Gestión de Compras y Proveedores
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const ProcurementOrder = sequelize.define('ProcurementOrder', {
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
        order_number: {
            type: DataTypes.STRING(50),
            allowNull: false
        },
        rfq_id: {
            type: DataTypes.INTEGER,
            references: { model: 'procurement_rfqs', key: 'id' }
        },
        requisition_id: {
            type: DataTypes.INTEGER,
            references: { model: 'procurement_requisitions', key: 'id' }
        },
        contract_id: {
            type: DataTypes.INTEGER,
            references: { model: 'procurement_contracts', key: 'id' }
        },
        supplier_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'procurement_suppliers', key: 'id' }
        },
        order_date: {
            type: DataTypes.DATEONLY,
            allowNull: false,
            defaultValue: DataTypes.NOW
        },
        expected_delivery_date: {
            type: DataTypes.DATEONLY
        },
        status: {
            type: DataTypes.STRING(50),
            defaultValue: 'draft',
            validate: {
                isIn: [['draft', 'pending_approval', 'approved', 'sent', 'acknowledged',
                        'partial_received', 'received', 'closed_complete', 'closed_incomplete', 'cancelled']]
            }
        },
        subtotal: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false,
            defaultValue: 0
        },
        tax_percent: {
            type: DataTypes.DECIMAL(5, 2),
            defaultValue: 21
        },
        tax_amount: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0
        },
        total_amount: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false,
            defaultValue: 0
        },
        currency: {
            type: DataTypes.STRING(3),
            defaultValue: 'ARS'
        },
        exchange_rate: {
            type: DataTypes.DECIMAL(15, 6),
            comment: 'Tipo de cambio al momento de la OC'
        },
        total_in_base_currency: {
            type: DataTypes.DECIMAL(15, 2),
            comment: 'Total convertido a moneda base'
        },
        payment_terms: {
            type: DataTypes.TEXT
        },
        payment_method: {
            type: DataTypes.STRING(50),
            validate: {
                isIn: [['transfer', 'check', 'credit', 'cash', null]]
            }
        },
        payment_days: {
            type: DataTypes.INTEGER,
            comment: '30, 60, 90 días'
        },
        delivery_address: {
            type: DataTypes.TEXT
        },
        delivery_instructions: {
            type: DataTypes.TEXT
        },
        special_conditions: {
            type: DataTypes.TEXT
        },
        approved_at: {
            type: DataTypes.DATE
        },
        approved_by: {
            type: DataTypes.UUID
        },
        approval_workflow: {
            type: DataTypes.JSONB,
            defaultValue: []
        },
        sent_at: {
            type: DataTypes.DATE
        },
        sent_notification_id: {
            type: DataTypes.BIGINT,
            references: { model: 'notifications', key: 'id' }
        },
        acknowledged_at: {
            type: DataTypes.DATE
        },
        received_at: {
            type: DataTypes.DATE
        },
        received_by: {
            type: DataTypes.UUID
        },
        reception_notes: {
            type: DataTypes.TEXT
        },
        invoice_ids: {
            type: DataTypes.JSONB,
            defaultValue: []
        },
        invoice_status: {
            type: DataTypes.STRING(50)
        },
        payment_status: {
            type: DataTypes.STRING(50),
            defaultValue: 'pending',
            validate: {
                isIn: [['pending', 'scheduled', 'partial_paid', 'paid']]
            }
        },
        paid_amount: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0
        },
        paid_at: {
            type: DataTypes.DATE
        },
        audit_trail: {
            type: DataTypes.JSONB,
            defaultValue: []
        },
        created_by: {
            type: DataTypes.UUID
        }
    }, {
        tableName: 'procurement_orders',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            { unique: true, fields: ['company_id', 'order_number'] },
            { fields: ['company_id', 'status'] },
            { fields: ['supplier_id', 'status'] },
            { fields: ['expected_delivery_date'] }
        ]
    });

    // Agregar entrada de auditoría
    ProcurementOrder.prototype.addAuditEntry = function(action, userId, details = {}) {
        const trail = this.audit_trail || [];
        trail.push({
            action,
            user_id: userId,
            timestamp: new Date().toISOString(),
            details
        });
        this.audit_trail = trail;
    };

    // Calcular totales
    ProcurementOrder.prototype.calculateTotals = async function(items) {
        let subtotal = 0;
        for (const item of items) {
            subtotal += parseFloat(item.total_price) || 0;
        }
        this.subtotal = subtotal;
        this.tax_amount = subtotal * (parseFloat(this.tax_percent) / 100);
        this.total_amount = subtotal + this.tax_amount;
        return this.save();
    };

    // Aprobar orden
    ProcurementOrder.prototype.approve = async function(userId, userName, comments = '') {
        const workflow = this.approval_workflow || [];
        workflow.push({
            user_id: userId,
            user_name: userName,
            status: 'approved',
            action_at: new Date().toISOString(),
            comments
        });

        this.status = 'approved';
        this.approved_at = new Date();
        this.approved_by = userId;
        this.approval_workflow = workflow;
        this.addAuditEntry('approved', userId, { comments });
        return this.save();
    };

    // Enviar al proveedor
    ProcurementOrder.prototype.sendToSupplier = async function(userId, notificationId) {
        this.status = 'sent';
        this.sent_at = new Date();
        this.sent_notification_id = notificationId;
        this.addAuditEntry('sent_to_supplier', userId);
        return this.save();
    };

    // Confirmar recepción por proveedor
    ProcurementOrder.prototype.acknowledge = async function() {
        this.status = 'acknowledged';
        this.acknowledged_at = new Date();
        this.addAuditEntry('acknowledged', null, { source: 'supplier' });
        return this.save();
    };

    // Marcar como recibido (parcial o total)
    ProcurementOrder.prototype.markReceived = async function(userId, isPartial = false, notes = '') {
        this.status = isPartial ? 'partial_received' : 'received';
        if (!isPartial) {
            this.received_at = new Date();
            this.received_by = userId;
        }
        this.reception_notes = notes;
        this.addAuditEntry(isPartial ? 'partial_received' : 'fully_received', userId, { notes });
        return this.save();
    };

    // Cerrar orden
    ProcurementOrder.prototype.close = async function(userId, isComplete = true) {
        this.status = isComplete ? 'closed_complete' : 'closed_incomplete';
        this.addAuditEntry('closed', userId, { is_complete: isComplete });
        return this.save();
    };

    // Obtener órdenes por estado
    ProcurementOrder.getByStatus = async function(companyId, status) {
        const where = { company_id: companyId };
        if (status) {
            if (Array.isArray(status)) {
                where.status = { [sequelize.Sequelize.Op.in]: status };
            } else {
                where.status = status;
            }
        }
        return this.findAll({
            where,
            order: [['created_at', 'DESC']]
        });
    };

    // Obtener órdenes pendientes de entrega
    ProcurementOrder.getPendingDelivery = async function(companyId) {
        const { Op } = sequelize.Sequelize;
        return this.findAll({
            where: {
                company_id: companyId,
                status: { [Op.in]: ['sent', 'acknowledged', 'partial_received'] }
            },
            order: [['expected_delivery_date', 'ASC']]
        });
    };

    // Obtener órdenes vencidas
    ProcurementOrder.getOverdue = async function(companyId) {
        const { Op } = sequelize.Sequelize;
        return this.findAll({
            where: {
                company_id: companyId,
                status: { [Op.in]: ['sent', 'acknowledged', 'partial_received'] },
                expected_delivery_date: { [Op.lt]: new Date() }
            },
            order: [['expected_delivery_date', 'ASC']]
        });
    };

    // Obtener órdenes de un proveedor
    ProcurementOrder.getBySupplier = async function(companyId, supplierId, status = null) {
        const where = { company_id: companyId, supplier_id: supplierId };
        if (status) where.status = status;
        return this.findAll({
            where,
            order: [['order_date', 'DESC']]
        });
    };

    // Estadísticas de órdenes
    ProcurementOrder.getStats = async function(companyId) {
        const { Op } = sequelize.Sequelize;
        const [pending, delivered, overdue, total] = await Promise.all([
            this.count({ where: { company_id: companyId, status: { [Op.in]: ['sent', 'acknowledged'] } } }),
            this.count({ where: { company_id: companyId, status: { [Op.in]: ['received', 'closed_complete'] } } }),
            this.count({
                where: {
                    company_id: companyId,
                    status: { [Op.in]: ['sent', 'acknowledged'] },
                    expected_delivery_date: { [Op.lt]: new Date() }
                }
            }),
            this.sum('total_amount', { where: { company_id: companyId } })
        ]);
        return { pending, delivered, overdue, total_amount: total || 0 };
    };

    return ProcurementOrder;
};
