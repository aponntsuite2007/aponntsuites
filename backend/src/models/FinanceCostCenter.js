/**
 * FinanceCostCenter Model
 * Centros de Costo con jerarquía de 4 niveles (SAP CO style)
 * Finance Enterprise SSOT - Módulo Financiero Unificado
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const FinanceCostCenter = sequelize.define('FinanceCostCenter', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        company_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'companies', key: 'company_id' }
        },
        code: {
            type: DataTypes.STRING(20),
            allowNull: false
        },
        parent_id: {
            type: DataTypes.INTEGER,
            references: { model: 'finance_cost_centers', key: 'id' }
        },
        level: {
            type: DataTypes.INTEGER,
            allowNull: false,
            comment: '1=Segment, 2=Profit Center, 3=Cost Center, 4=Project'
        },
        path: {
            type: DataTypes.STRING(200),
            comment: 'Path jerárquico: 001.010.001'
        },
        name: {
            type: DataTypes.STRING(200),
            allowNull: false
        },
        description: {
            type: DataTypes.TEXT
        },
        center_type: {
            type: DataTypes.STRING(50),
            allowNull: false,
            validate: {
                isIn: [['segment', 'profit_center', 'cost_center', 'project']]
            }
        },
        manager_id: {
            type: DataTypes.UUID,
            comment: 'Responsable del centro de costo'
        },
        department_id: {
            type: DataTypes.INTEGER,
            references: { model: 'departments', key: 'id' }
        },
        has_budget: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        budget_control_type: {
            type: DataTypes.STRING(20),
            defaultValue: 'warning',
            validate: {
                isIn: [['none', 'warning', 'block']]
            }
        },
        valid_from: {
            type: DataTypes.DATEONLY
        },
        valid_until: {
            type: DataTypes.DATEONLY
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        allows_posting: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        payroll_entity_id: {
            type: DataTypes.INTEGER,
            comment: 'Link a PayrollEntity si existe'
        }
    }, {
        tableName: 'finance_cost_centers',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            { unique: true, fields: ['company_id', 'code'] },
            { fields: ['parent_id'] },
            { fields: ['center_type'] },
            { fields: ['manager_id'] }
        ]
    });

    // Obtener path completo
    FinanceCostCenter.prototype.getFullPath = async function() {
        const path = [this.name];
        let current = this;

        while (current.parent_id) {
            current = await FinanceCostCenter.findByPk(current.parent_id);
            if (current) {
                path.unshift(current.name);
            } else {
                break;
            }
        }

        return path.join(' > ');
    };

    // Obtener todos los hijos (recursivo)
    FinanceCostCenter.prototype.getAllChildren = async function() {
        const children = await FinanceCostCenter.findAll({
            where: { parent_id: this.id }
        });

        let allChildren = [...children];
        for (const child of children) {
            const grandChildren = await child.getAllChildren();
            allChildren = allChildren.concat(grandChildren);
        }

        return allChildren;
    };

    // Verificar si permite imputaciones
    FinanceCostCenter.prototype.isPostable = function() {
        if (!this.is_active) return false;
        if (!this.allows_posting) return false;

        const today = new Date();
        if (this.valid_from && new Date(this.valid_from) > today) return false;
        if (this.valid_until && new Date(this.valid_until) < today) return false;

        return true;
    };

    // Obtener centros de costo por tipo
    FinanceCostCenter.getByType = async function(companyId, centerType) {
        return this.findAll({
            where: {
                company_id: companyId,
                center_type: centerType,
                is_active: true
            },
            order: [['code', 'ASC']]
        });
    };

    // Obtener centros imputables
    FinanceCostCenter.getPostable = async function(companyId) {
        const { Op } = sequelize.Sequelize;
        const today = new Date();

        return this.findAll({
            where: {
                company_id: companyId,
                is_active: true,
                allows_posting: true,
                [Op.or]: [
                    { valid_from: null },
                    { valid_from: { [Op.lte]: today } }
                ],
                [Op.or]: [
                    { valid_until: null },
                    { valid_until: { [Op.gte]: today } }
                ]
            },
            order: [['level', 'ASC'], ['code', 'ASC']]
        });
    };

    // Obtener jerarquía completa
    FinanceCostCenter.getHierarchy = async function(companyId, parentId = null) {
        const centers = await this.findAll({
            where: {
                company_id: companyId,
                parent_id: parentId,
                is_active: true
            },
            order: [['code', 'ASC']]
        });

        const result = [];
        for (const center of centers) {
            const children = await this.getHierarchy(companyId, center.id);
            result.push({
                ...center.toJSON(),
                children
            });
        }

        return result;
    };

    // Obtener centros por responsable
    FinanceCostCenter.getByManager = async function(companyId, managerId) {
        return this.findAll({
            where: {
                company_id: companyId,
                manager_id: managerId,
                is_active: true
            },
            order: [['level', 'ASC'], ['code', 'ASC']]
        });
    };

    // Obtener proyectos activos
    FinanceCostCenter.getActiveProjects = async function(companyId) {
        const { Op } = sequelize.Sequelize;
        const today = new Date();

        return this.findAll({
            where: {
                company_id: companyId,
                center_type: 'project',
                is_active: true,
                [Op.or]: [
                    { valid_until: null },
                    { valid_until: { [Op.gte]: today } }
                ]
            },
            order: [['code', 'ASC']]
        });
    };

    // Generar path automáticamente antes de guardar
    FinanceCostCenter.beforeSave(async (center) => {
        if (center.parent_id) {
            const parent = await FinanceCostCenter.findByPk(center.parent_id);
            if (parent) {
                center.path = parent.path ? `${parent.path}.${center.code}` : center.code;
                center.level = parent.level + 1;
            }
        } else {
            center.path = center.code;
            center.level = 1;
        }
    });

    return FinanceCostCenter;
};
