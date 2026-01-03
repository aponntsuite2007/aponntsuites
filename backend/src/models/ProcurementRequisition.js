/**
 * ProcurementRequisition Model
 * Solicitudes de compra con workflow de aprobación multi-nivel
 * Módulo Comercial - Gestión de Compras y Proveedores
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const ProcurementRequisition = sequelize.define('ProcurementRequisition', {
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
        requisition_number: {
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
        requester_id: {
            type: DataTypes.UUID,
            allowNull: false
        },
        requester_department_id: {
            type: DataTypes.INTEGER
        },
        requester_name: {
            type: DataTypes.STRING(200)
        },
        requester_email: {
            type: DataTypes.STRING(255)
        },
        priority: {
            type: DataTypes.STRING(20),
            defaultValue: 'medium',
            validate: { isIn: [['low', 'medium', 'high', 'critical']] }
        },
        required_date: {
            type: DataTypes.DATEONLY
        },
        justification: {
            type: DataTypes.TEXT
        },
        status: {
            type: DataTypes.STRING(50),
            defaultValue: 'draft',
            validate: {
                isIn: [['draft', 'pending_approval', 'approved', 'rejected', 'in_quotation',
                        'quoted', 'in_purchase', 'partially_ordered', 'ordered', 'completed', 'cancelled']]
            }
        },
        current_approval_step: {
            type: DataTypes.INTEGER,
            defaultValue: 1
        },
        max_approval_steps: {
            type: DataTypes.INTEGER,
            defaultValue: 1
        },
        estimated_total: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0
        },
        currency: {
            type: DataTypes.STRING(3),
            defaultValue: 'ARS'
        },
        item_count: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        cost_center: {
            type: DataTypes.STRING(50)
        },
        budget_code: {
            type: DataTypes.STRING(50)
        },
        project_code: {
            type: DataTypes.STRING(50)
        },
        approved_at: {
            type: DataTypes.DATE
        },
        approved_by: {
            type: DataTypes.UUID
        },
        rejection_reason: {
            type: DataTypes.TEXT
        },
        rejected_at: {
            type: DataTypes.DATE
        },
        rejected_by: {
            type: DataTypes.UUID
        },
        approval_workflow: {
            type: DataTypes.JSONB,
            defaultValue: [],
            comment: '[{step, role, user_id, user_name, status, action_at, comments}]'
        },
        rfq_ids: {
            type: DataTypes.JSONB,
            defaultValue: []
        },
        order_ids: {
            type: DataTypes.JSONB,
            defaultValue: []
        },
        notification_id: {
            type: DataTypes.BIGINT
        },
        audit_trail: {
            type: DataTypes.JSONB,
            defaultValue: []
        },

        // ========== CAMPOS AGREGADOS P2P COMPLETE ==========
        branch_id: {
            type: DataTypes.INTEGER,
            comment: 'FK a wms_branches (sucursal)'
        },
        sector_id: {
            type: DataTypes.INTEGER,
            references: { model: 'procurement_sectors', key: 'id' },
            comment: 'Sector organizacional'
        },
        finance_cost_center_id: {
            type: DataTypes.INTEGER,
            comment: 'FK a finance_cost_centers'
        },
        finance_account_id: {
            type: DataTypes.INTEGER,
            comment: 'FK a finance_chart_of_accounts (imputación contable)'
        },
        delivery_warehouse_id: {
            type: DataTypes.INTEGER,
            comment: 'FK a wms_warehouses (depósito destino)'
        },
        observations: {
            type: DataTypes.TEXT,
            comment: 'Observaciones generales'
        },
        internal_notes: {
            type: DataTypes.TEXT,
            comment: 'Notas internas (no visibles al solicitante)'
        },
        urgency_reason: {
            type: DataTypes.TEXT,
            comment: 'Justificación de urgencia si priority = critical'
        },
        attachments: {
            type: DataTypes.JSONB,
            defaultValue: [],
            comment: '[{name, url, type, uploaded_at}]'
        },
        tags: {
            type: DataTypes.JSONB,
            defaultValue: [],
            comment: 'Etiquetas para búsqueda y clasificación'
        }
    }, {
        tableName: 'procurement_requisitions',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            { unique: true, fields: ['company_id', 'requisition_number'] },
            { fields: ['company_id', 'status'] },
            { fields: ['requester_id', 'status'] },
            { fields: ['created_at'] }
        ]
    });

    // Determinar pasos de aprobación según monto
    ProcurementRequisition.prototype.calculateApprovalSteps = function() {
        const total = parseFloat(this.estimated_total) || 0;

        // Thresholds configurables
        const steps = [];
        steps.push({ step: 1, role: 'supervisor', name: 'Supervisor Directo' });

        if (total > 50000) {
            steps.push({ step: 2, role: 'area_manager', name: 'Jefe de Área' });
        }
        if (total > 200000) {
            steps.push({ step: 3, role: 'management', name: 'Gerencia' });
        }
        if (total > 500000) {
            steps.push({ step: 4, role: 'director', name: 'Dirección' });
        }

        this.max_approval_steps = steps.length;
        return steps;
    };

    // Aprobar requisición
    ProcurementRequisition.prototype.approve = async function(userId, userName, comments = '') {
        const workflow = this.approval_workflow || [];
        workflow.push({
            step: this.current_approval_step,
            user_id: userId,
            user_name: userName,
            status: 'approved',
            action_at: new Date().toISOString(),
            comments
        });

        if (this.current_approval_step >= this.max_approval_steps) {
            this.status = 'approved';
            this.approved_at = new Date();
            this.approved_by = userId;
        } else {
            this.current_approval_step += 1;
        }

        this.approval_workflow = workflow;
        return this.save();
    };

    // Rechazar requisición
    ProcurementRequisition.prototype.reject = async function(userId, userName, reason) {
        const workflow = this.approval_workflow || [];
        workflow.push({
            step: this.current_approval_step,
            user_id: userId,
            user_name: userName,
            status: 'rejected',
            action_at: new Date().toISOString(),
            comments: reason
        });

        this.status = 'rejected';
        this.rejected_at = new Date();
        this.rejected_by = userId;
        this.rejection_reason = reason;
        this.approval_workflow = workflow;

        return this.save();
    };

    // Obtener requisiciones pendientes de aprobación
    ProcurementRequisition.getPendingApproval = async function(companyId, role) {
        return this.findAll({
            where: {
                company_id: companyId,
                status: 'pending_approval'
            },
            order: [['priority', 'DESC'], ['created_at', 'ASC']]
        });
    };

    // Obtener mis requisiciones (solicitante)
    ProcurementRequisition.getMyRequisitions = async function(companyId, requesterId, status = null) {
        const where = { company_id: companyId, requester_id: requesterId };
        if (status) where.status = status;

        return this.findAll({
            where,
            order: [['created_at', 'DESC']]
        });
    };

    return ProcurementRequisition;
};
