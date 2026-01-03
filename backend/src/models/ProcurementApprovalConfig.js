/**
 * ProcurementApprovalConfig Model
 * Configuración de niveles de aprobación por tipo de documento y monto
 * Módulo Procurement - Gestión de Compras P2P
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const ProcurementApprovalConfig = sequelize.define('ProcurementApprovalConfig', {
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

        document_type: {
            type: DataTypes.STRING(30),
            allowNull: false,
            validate: {
                isIn: [['requisition', 'order', 'receipt', 'invoice', 'payment']]
            }
        },

        // Umbral de monto
        min_amount: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0
        },
        max_amount: {
            type: DataTypes.DECIMAL(15, 2),
            comment: 'NULL = sin límite'
        },

        // Nivel requerido
        approval_level: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        approval_role: {
            type: DataTypes.STRING(50),
            allowNull: false,
            comment: 'supervisor, area_manager, finance, management, board'
        },
        approval_role_name: {
            type: DataTypes.STRING(100)
        },

        // Puede ser aprobado por
        can_approve_roles: {
            type: DataTypes.JSONB,
            defaultValue: [],
            comment: 'Roles que pueden aprobar'
        },
        can_approve_users: {
            type: DataTypes.JSONB,
            defaultValue: [],
            comment: 'UUIDs de usuarios específicos'
        },

        // Configuración adicional
        requires_justification: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        requires_budget_check: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        auto_approve_if_budget_ok: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },

        // Notificaciones
        notify_on_pending: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        notify_on_approved: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        notify_on_rejected: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        notification_users: {
            type: DataTypes.JSONB,
            defaultValue: []
        },

        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        }
    }, {
        tableName: 'procurement_approval_config',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            { unique: true, fields: ['company_id', 'document_type', 'approval_level'] },
            { fields: ['company_id', 'document_type', 'is_active'] }
        ]
    });

    // Obtener configuración de aprobación para un documento
    ProcurementApprovalConfig.getForDocument = async function(companyId, documentType, amount) {
        const configs = await this.findAll({
            where: {
                company_id: companyId,
                document_type: documentType,
                is_active: true
            },
            order: [['approval_level', 'ASC']]
        });

        // Filtrar por monto
        return configs.filter(c => {
            const min = parseFloat(c.min_amount) || 0;
            const max = c.max_amount ? parseFloat(c.max_amount) : Infinity;
            return amount >= min && amount <= max;
        });
    };

    // Verificar si un usuario puede aprobar
    ProcurementApprovalConfig.canUserApprove = async function(companyId, documentType, amount, userId, userRole) {
        const configs = await this.getForDocument(companyId, documentType, amount);

        for (const config of configs) {
            // Verificar por usuario específico
            if (config.can_approve_users && config.can_approve_users.includes(userId)) {
                return { canApprove: true, config };
            }
            // Verificar por rol
            if (config.can_approve_roles && config.can_approve_roles.includes(userRole)) {
                return { canApprove: true, config };
            }
            // Verificar rol de aprobación
            if (config.approval_role === userRole) {
                return { canApprove: true, config };
            }
        }

        return { canApprove: false, config: null };
    };

    // Obtener pasos de aprobación necesarios
    ProcurementApprovalConfig.getApprovalSteps = async function(companyId, documentType, amount) {
        const configs = await this.getForDocument(companyId, documentType, amount);

        return configs.map(c => ({
            level: c.approval_level,
            role: c.approval_role,
            roleName: c.approval_role_name,
            requiresJustification: c.requires_justification,
            requiresBudgetCheck: c.requires_budget_check
        }));
    };

    // Inicializar configuración por defecto para una empresa
    ProcurementApprovalConfig.initializeDefaults = async function(companyId) {
        const defaults = [
            // Requisiciones
            { document_type: 'requisition', min_amount: 0, max_amount: 50000, approval_level: 1, approval_role: 'supervisor', approval_role_name: 'Supervisor Directo' },
            { document_type: 'requisition', min_amount: 50000, max_amount: 200000, approval_level: 2, approval_role: 'area_manager', approval_role_name: 'Jefe de Área' },
            { document_type: 'requisition', min_amount: 200000, max_amount: 500000, approval_level: 3, approval_role: 'management', approval_role_name: 'Gerencia' },
            { document_type: 'requisition', min_amount: 500000, max_amount: null, approval_level: 4, approval_role: 'board', approval_role_name: 'Directorio' },
            // Órdenes de compra
            { document_type: 'order', min_amount: 0, max_amount: 100000, approval_level: 1, approval_role: 'purchasing', approval_role_name: 'Compras' },
            { document_type: 'order', min_amount: 100000, max_amount: 500000, approval_level: 2, approval_role: 'finance', approval_role_name: 'Finanzas' },
            { document_type: 'order', min_amount: 500000, max_amount: null, approval_level: 3, approval_role: 'management', approval_role_name: 'Gerencia' },
            // Pagos
            { document_type: 'payment', min_amount: 0, max_amount: 100000, approval_level: 1, approval_role: 'finance_operator', approval_role_name: 'Operador Financiero' },
            { document_type: 'payment', min_amount: 100000, max_amount: 500000, approval_level: 2, approval_role: 'finance', approval_role_name: 'Finanzas' },
            { document_type: 'payment', min_amount: 500000, max_amount: null, approval_level: 3, approval_role: 'management', approval_role_name: 'Gerencia' }
        ];

        for (const config of defaults) {
            await this.findOrCreate({
                where: {
                    company_id: companyId,
                    document_type: config.document_type,
                    approval_level: config.approval_level
                },
                defaults: {
                    ...config,
                    company_id: companyId
                }
            });
        }
    };

    return ProcurementApprovalConfig;
};
