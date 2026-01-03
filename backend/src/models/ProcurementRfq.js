/**
 * ProcurementRfq Model
 * Solicitudes de cotización (RFQ) con gestión de proveedores invitados
 * Módulo Comercial - Gestión de Compras y Proveedores
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const ProcurementRfq = sequelize.define('ProcurementRfq', {
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
        rfq_number: {
            type: DataTypes.STRING(50),
            allowNull: false
        },
        title: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        description: {
            type: DataTypes.TEXT
        },
        requisition_id: {
            type: DataTypes.INTEGER,
            references: { model: 'procurement_requisitions', key: 'id' }
        },
        issue_date: {
            type: DataTypes.DATEONLY,
            allowNull: false,
            defaultValue: DataTypes.NOW
        },
        due_date: {
            type: DataTypes.DATEONLY,
            allowNull: false
        },
        valid_until: {
            type: DataTypes.DATEONLY
        },
        status: {
            type: DataTypes.STRING(50),
            defaultValue: 'draft',
            validate: {
                isIn: [['draft', 'sent', 'in_progress', 'closed', 'awarded', 'cancelled']]
            }
        },
        allow_partial_quotes: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        require_all_items: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        show_quantities: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        payment_terms: {
            type: DataTypes.TEXT
        },
        delivery_terms: {
            type: DataTypes.TEXT
        },
        special_conditions: {
            type: DataTypes.TEXT
        },
        awarded_at: {
            type: DataTypes.DATE
        },
        awarded_by: {
            type: DataTypes.UUID
        },
        notification_template_key: {
            type: DataTypes.STRING(100),
            defaultValue: 'rfq_invitation'
        },
        notification_sent_at: {
            type: DataTypes.DATE
        },
        total_suppliers_invited: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        total_quotes_received: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        audit_trail: {
            type: DataTypes.JSONB,
            defaultValue: []
        },
        created_by: {
            type: DataTypes.UUID
        }
    }, {
        tableName: 'procurement_rfqs',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            { unique: true, fields: ['company_id', 'rfq_number'] },
            { fields: ['company_id', 'status'] },
            { fields: ['due_date'] }
        ]
    });

    // Agregar entrada de auditoría
    ProcurementRfq.prototype.addAuditEntry = function(action, userId, details = {}) {
        const trail = this.audit_trail || [];
        trail.push({
            action,
            user_id: userId,
            timestamp: new Date().toISOString(),
            details
        });
        this.audit_trail = trail;
    };

    // Verificar si puede recibir cotizaciones
    ProcurementRfq.prototype.canReceiveQuotes = function() {
        if (this.status !== 'sent' && this.status !== 'in_progress') return false;
        if (this.due_date && new Date(this.due_date) < new Date()) return false;
        return true;
    };

    // Verificar si está listo para adjudicar
    ProcurementRfq.prototype.canAward = function() {
        return this.status === 'closed' && this.total_quotes_received > 0;
    };

    // Cerrar RFQ
    ProcurementRfq.prototype.close = async function(userId) {
        this.status = 'closed';
        this.addAuditEntry('closed', userId);
        return this.save();
    };

    // Adjudicar RFQ
    ProcurementRfq.prototype.award = async function(userId, awardDetails) {
        this.status = 'awarded';
        this.awarded_at = new Date();
        this.awarded_by = userId;
        this.addAuditEntry('awarded', userId, awardDetails);
        return this.save();
    };

    // Obtener RFQs activos de una empresa
    ProcurementRfq.getActiveByCompany = async function(companyId) {
        const { Op } = sequelize.Sequelize;
        return this.findAll({
            where: {
                company_id: companyId,
                status: { [Op.in]: ['draft', 'sent', 'in_progress'] }
            },
            order: [['due_date', 'ASC']]
        });
    };

    // Obtener RFQs pendientes de cotizar para un proveedor
    ProcurementRfq.getPendingForSupplier = async function(companyId, supplierId) {
        const query = `
            SELECT r.* FROM procurement_rfqs r
            INNER JOIN procurement_rfq_suppliers rs ON rs.rfq_id = r.id
            WHERE r.company_id = :companyId
              AND rs.supplier_id = :supplierId
              AND rs.status = 'pending'
              AND r.status IN ('sent', 'in_progress')
              AND r.due_date >= CURRENT_DATE
            ORDER BY r.due_date ASC
        `;
        return sequelize.query(query, {
            replacements: { companyId, supplierId },
            type: sequelize.QueryTypes.SELECT
        });
    };

    // Obtener estadísticas de RFQ
    ProcurementRfq.getStats = async function(companyId) {
        const { Op } = sequelize.Sequelize;
        const [active, pending, completed] = await Promise.all([
            this.count({ where: { company_id: companyId, status: { [Op.in]: ['sent', 'in_progress'] } } }),
            this.count({ where: { company_id: companyId, status: 'closed' } }),
            this.count({ where: { company_id: companyId, status: 'awarded' } })
        ]);
        return { active, pending, completed };
    };

    return ProcurementRfq;
};
