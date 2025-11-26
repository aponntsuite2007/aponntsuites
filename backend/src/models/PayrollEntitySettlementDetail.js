/**
 * Modelo: PayrollEntitySettlementDetail
 * Detalle por empleado de cada liquidacion consolidada
 */
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const PayrollEntitySettlementDetail = sequelize.define('PayrollEntitySettlementDetail', {
        detail_id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        settlement_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'payroll_entity_settlements', key: 'settlement_id' }
        },
        user_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: { model: 'users', key: 'user_id' }
        },
        run_detail_id: {
            type: DataTypes.INTEGER,
            references: { model: 'payroll_run_details', key: 'id' }
        },

        // Datos del empleado (snapshot)
        employee_name: DataTypes.STRING(200),
        employee_tax_id: {
            type: DataTypes.STRING(30),
            comment: 'CUIL/CUIT'
        },
        employee_code: DataTypes.STRING(50),

        // Montos
        base_amount: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0,
            comment: 'Base de calculo'
        },
        employee_amount: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0,
            comment: 'Aporte del empleado'
        },
        employer_amount: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0,
            comment: 'Aporte patronal'
        },
        total_amount: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0
        },

        // Desglose por concepto
        concepts_breakdown: {
            type: DataTypes.JSONB,
            defaultValue: []
        }
    }, {
        tableName: 'payroll_entity_settlement_details',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: false
    });

    PayrollEntitySettlementDetail.associate = (models) => {
        PayrollEntitySettlementDetail.belongsTo(models.PayrollEntitySettlement, {
            foreignKey: 'settlement_id',
            as: 'settlement'
        });
        PayrollEntitySettlementDetail.belongsTo(models.User, {
            foreignKey: 'user_id',
            as: 'user'
        });
    };

    return PayrollEntitySettlementDetail;
};
