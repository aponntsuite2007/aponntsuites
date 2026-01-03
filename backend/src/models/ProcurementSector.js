/**
 * ProcurementSector Model
 * Sectores organizacionales para clasificación de compras
 * Módulo Procurement - Gestión de Compras P2P
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const ProcurementSector = sequelize.define('ProcurementSector', {
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
        department_id: {
            type: DataTypes.INTEGER,
            references: { model: 'departments', key: 'id' }
        },
        code: {
            type: DataTypes.STRING(20),
            allowNull: false
        },
        name: {
            type: DataTypes.STRING(100),
            allowNull: false
        },
        description: {
            type: DataTypes.TEXT
        },
        manager_id: {
            type: DataTypes.UUID,
            references: { model: 'users', key: 'user_id' }
        },
        parent_sector_id: {
            type: DataTypes.INTEGER,
            references: { model: 'procurement_sectors', key: 'id' }
        },
        level: {
            type: DataTypes.INTEGER,
            defaultValue: 1
        },
        path: {
            type: DataTypes.STRING(500),
            comment: 'Ruta jerárquica para queries'
        },
        default_cost_center_id: {
            type: DataTypes.INTEGER,
            comment: 'FK a finance_cost_centers'
        },
        default_budget_code: {
            type: DataTypes.STRING(50)
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        created_by: {
            type: DataTypes.UUID,
            references: { model: 'users', key: 'user_id' }
        }
    }, {
        tableName: 'procurement_sectors',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            { unique: true, fields: ['company_id', 'code'] },
            { fields: ['company_id', 'is_active'] },
            { fields: ['department_id'] },
            { fields: ['parent_sector_id'] }
        ]
    });

    // Obtener sectores activos de una empresa
    ProcurementSector.getByCompany = async function(companyId, includeInactive = false) {
        const where = { company_id: companyId };
        if (!includeInactive) where.is_active = true;

        return this.findAll({
            where,
            order: [['level', 'ASC'], ['name', 'ASC']]
        });
    };

    // Obtener jerarquía completa
    ProcurementSector.getHierarchy = async function(companyId) {
        const sectors = await this.findAll({
            where: { company_id: companyId, is_active: true },
            order: [['path', 'ASC']]
        });

        // Construir árbol
        const buildTree = (items, parentId = null) => {
            return items
                .filter(item => item.parent_sector_id === parentId)
                .map(item => ({
                    ...item.toJSON(),
                    children: buildTree(items, item.id)
                }));
        };

        return buildTree(sectors);
    };

    // Obtener todos los hijos de un sector
    ProcurementSector.prototype.getDescendants = async function() {
        return ProcurementSector.findAll({
            where: {
                company_id: this.company_id,
                path: { [sequelize.Sequelize.Op.like]: `${this.path}.%` },
                is_active: true
            },
            order: [['path', 'ASC']]
        });
    };

    return ProcurementSector;
};
