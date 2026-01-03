/**
 * ProcurementContract Model
 * Contratos marco con proveedores
 * Módulo Comercial - Gestión de Compras y Proveedores
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const ProcurementContract = sequelize.define('ProcurementContract', {
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
        contract_number: {
            type: DataTypes.STRING(50),
            allowNull: false
        },
        supplier_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'procurement_suppliers', key: 'id' }
        },
        contract_type: {
            type: DataTypes.STRING(50),
            allowNull: false,
            validate: { isIn: [['framework', 'fixed_price', 'time_and_materials', 'blanket']] }
        },
        title: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        description: {
            type: DataTypes.TEXT
        },
        start_date: {
            type: DataTypes.DATEONLY,
            allowNull: false
        },
        end_date: {
            type: DataTypes.DATEONLY,
            allowNull: false
        },
        auto_renew: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        renewal_terms: {
            type: DataTypes.TEXT
        },
        renewal_notice_days: {
            type: DataTypes.INTEGER,
            defaultValue: 30
        },
        total_amount: {
            type: DataTypes.DECIMAL(15, 2),
            comment: 'NULL = sin límite'
        },
        consumed_amount: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0
        },
        currency: {
            type: DataTypes.STRING(3),
            defaultValue: 'ARS'
        },
        min_order_amount: {
            type: DataTypes.DECIMAL(15, 2)
        },
        status: {
            type: DataTypes.STRING(50),
            defaultValue: 'draft',
            validate: { isIn: [['draft', 'pending_approval', 'active', 'expired', 'terminated', 'renewed', 'suspended']] }
        },
        payment_terms: {
            type: DataTypes.TEXT
        },
        payment_days: {
            type: DataTypes.INTEGER,
            defaultValue: 30
        },
        payment_method: {
            type: DataTypes.STRING(50)
        },
        delivery_terms: {
            type: DataTypes.TEXT
        },
        incoterm: {
            type: DataTypes.STRING(10)
        },
        penalty_clauses: {
            type: DataTypes.TEXT
        },
        warranty_terms: {
            type: DataTypes.TEXT
        },
        special_conditions: {
            type: DataTypes.TEXT
        },
        document_url: {
            type: DataTypes.TEXT
        },
        document_signed_at: {
            type: DataTypes.DATE
        },
        document_signed_by: {
            type: DataTypes.UUID
        },
        approval_status: {
            type: DataTypes.STRING(50),
            defaultValue: 'pending'
        },
        approved_at: {
            type: DataTypes.DATE
        },
        approved_by: {
            type: DataTypes.UUID
        },
        approval_notes: {
            type: DataTypes.TEXT
        },
        expiry_notified: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        expiry_notification_date: {
            type: DataTypes.DATE
        },
        renewal_notified: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        renewal_notification_date: {
            type: DataTypes.DATE
        },
        consumption_alert_percent: {
            type: DataTypes.DECIMAL(5, 2),
            defaultValue: 80
        },
        consumption_alerted: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        audit_trail: {
            type: DataTypes.JSONB,
            defaultValue: []
        },
        created_by: {
            type: DataTypes.UUID
        }
    }, {
        tableName: 'procurement_contracts',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            { unique: true, fields: ['company_id', 'contract_number'] },
            { fields: ['supplier_id'] },
            { fields: ['company_id', 'status'] },
            { fields: ['start_date', 'end_date'] }
        ]
    });

    // Verificar si el contrato está activo y vigente
    ProcurementContract.prototype.isActiveAndValid = function() {
        if (this.status !== 'active') return false;
        const today = new Date();
        return new Date(this.start_date) <= today && new Date(this.end_date) >= today;
    };

    // Calcular monto restante
    ProcurementContract.prototype.getRemainingAmount = function() {
        if (!this.total_amount) return null;
        return parseFloat(this.total_amount) - parseFloat(this.consumed_amount || 0);
    };

    // Verificar si debe notificar vencimiento
    ProcurementContract.prototype.shouldNotifyExpiry = function() {
        if (this.expiry_notified) return false;
        const today = new Date();
        const expiryDate = new Date(this.end_date);
        const noticeDate = new Date(expiryDate);
        noticeDate.setDate(noticeDate.getDate() - this.renewal_notice_days);
        return today >= noticeDate;
    };

    // Obtener contratos activos de un proveedor
    ProcurementContract.getActiveBySupplier = async function(companyId, supplierId) {
        const { Op } = sequelize.Sequelize;
        const today = new Date();
        return this.findAll({
            where: {
                company_id: companyId,
                supplier_id: supplierId,
                status: 'active',
                start_date: { [Op.lte]: today },
                end_date: { [Op.gte]: today }
            }
        });
    };

    // Obtener contratos próximos a vencer
    ProcurementContract.getExpiringContracts = async function(companyId, daysAhead = 30) {
        const { Op } = sequelize.Sequelize;
        const today = new Date();
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + daysAhead);

        return this.findAll({
            where: {
                company_id: companyId,
                status: 'active',
                end_date: { [Op.between]: [today, futureDate] },
                expiry_notified: false
            },
            order: [['end_date', 'ASC']]
        });
    };

    return ProcurementContract;
};
