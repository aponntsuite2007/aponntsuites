/**
 * Modelo: PayrollEntitySettlement
 * Liquidaciones consolidadas por entidad para presentacion y pago
 */
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const PayrollEntitySettlement = sequelize.define('PayrollEntitySettlement', {
        settlement_id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        company_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'companies', key: 'company_id' }
        },
        branch_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: { model: 'company_branches', key: 'id' }
        },
        entity_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'payroll_entities', key: 'entity_id' }
        },

        // Periodo
        period_year: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        period_month: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        period_start: {
            type: DataTypes.DATEONLY,
            allowNull: false
        },
        period_end: {
            type: DataTypes.DATEONLY,
            allowNull: false
        },

        run_id: {
            type: DataTypes.INTEGER,
            references: { model: 'payroll_runs', key: 'id' }
        },

        settlement_code: {
            type: DataTypes.STRING(50),
            allowNull: false
        },

        // Totales
        total_employees: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        total_amount: {
            type: DataTypes.DECIMAL(18, 2),
            defaultValue: 0
        },
        total_employer_contribution: {
            type: DataTypes.DECIMAL(18, 2),
            defaultValue: 0
        },
        total_employee_contribution: {
            type: DataTypes.DECIMAL(18, 2),
            defaultValue: 0
        },
        grand_total: {
            type: DataTypes.DECIMAL(18, 2),
            defaultValue: 0
        },

        status: {
            type: DataTypes.STRING(20),
            defaultValue: 'pending',
            comment: 'pending, generated, reviewed, approved, submitted, paid, rejected'
        },

        // Fechas de proceso
        generated_at: DataTypes.DATE,
        reviewed_at: DataTypes.DATE,
        approved_at: DataTypes.DATE,
        submitted_at: DataTypes.DATE,
        paid_at: DataTypes.DATE,

        // Usuarios responsables
        generated_by: {
            type: DataTypes.UUID,
            references: { model: 'users', key: 'user_id' }
        },
        reviewed_by: {
            type: DataTypes.UUID,
            references: { model: 'users', key: 'user_id' }
        },
        approved_by: {
            type: DataTypes.UUID,
            references: { model: 'users', key: 'user_id' }
        },

        // Datos de pago
        payment_reference: DataTypes.STRING(100),
        payment_date: DataTypes.DATEONLY,
        payment_method: DataTypes.STRING(30),
        payment_receipt_url: DataTypes.STRING(500),

        // Datos de presentacion
        presentation_file_url: DataTypes.STRING(500),
        presentation_format: DataTypes.STRING(50),
        presentation_response: DataTypes.JSONB,

        notes: DataTypes.TEXT,
        metadata: {
            type: DataTypes.JSONB,
            defaultValue: {}
        }
    }, {
        tableName: 'payroll_entity_settlements',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            { fields: ['company_id', 'entity_id', 'period_year', 'period_month'], unique: true }
        ]
    });

    PayrollEntitySettlement.associate = (models) => {
        PayrollEntitySettlement.belongsTo(models.Company, {
            foreignKey: 'company_id',
            as: 'company'
        });
        PayrollEntitySettlement.belongsTo(models.PayrollEntity, {
            foreignKey: 'entity_id',
            as: 'entity'
        });
        PayrollEntitySettlement.belongsTo(models.PayrollRun, {
            foreignKey: 'run_id',
            as: 'payrollRun'
        });
        PayrollEntitySettlement.hasMany(models.PayrollEntitySettlementDetail, {
            foreignKey: 'settlement_id',
            as: 'details'
        });
    };

    return PayrollEntitySettlement;
};
