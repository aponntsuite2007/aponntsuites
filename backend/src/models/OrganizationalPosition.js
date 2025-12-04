/**
 * Modelo: OrganizationalPosition
 * Posiciones/cargos organizacionales con template de recibo asignado
 */
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const OrganizationalPosition = sequelize.define('OrganizationalPosition', {
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
        position_code: {
            type: DataTypes.STRING(30),
            allowNull: false
        },
        position_name: {
            type: DataTypes.STRING(100),
            allowNull: false
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        parent_position_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: { model: 'organizational_positions', key: 'id' }
        },
        level_order: {
            type: DataTypes.INTEGER,
            defaultValue: 1,
            comment: '1=operativo, 2=supervisor, 3=gerente, etc.'
        },
        salary_category_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: { model: 'salary_categories_v2', key: 'id' }
        },
        payslip_template_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: { model: 'payroll_payslip_templates', key: 'id' }
        },
        payroll_template_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: { model: 'payroll_templates', key: 'id' }
        },
        department_id: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        }
    }, {
        tableName: 'organizational_positions',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    });

    OrganizationalPosition.associate = (models) => {
        // Empresa
        if (models.Company) {
            OrganizationalPosition.belongsTo(models.Company, {
                foreignKey: 'company_id',
                as: 'company'
            });
        }

        // Template de recibo
        if (models.PayrollPayslipTemplate) {
            OrganizationalPosition.belongsTo(models.PayrollPayslipTemplate, {
                foreignKey: 'payslip_template_id',
                as: 'payslipTemplate'
            });
        }

        // Template de liquidación
        if (models.PayrollTemplate) {
            OrganizationalPosition.belongsTo(models.PayrollTemplate, {
                foreignKey: 'payroll_template_id',
                as: 'payrollTemplate'
            });
        }

        // Auto-referencia (jerarquía)
        OrganizationalPosition.belongsTo(OrganizationalPosition, {
            foreignKey: 'parent_position_id',
            as: 'parentPosition'
        });
        OrganizationalPosition.hasMany(OrganizationalPosition, {
            foreignKey: 'parent_position_id',
            as: 'childPositions'
        });

        // Usuarios con esta posición
        if (models.User) {
            OrganizationalPosition.hasMany(models.User, {
                foreignKey: 'organizational_position_id',
                as: 'employees'
            });
        }
    };

    return OrganizationalPosition;
};
