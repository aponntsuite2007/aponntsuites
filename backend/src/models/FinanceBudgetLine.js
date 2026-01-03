/**
 * FinanceBudgetLine Model
 * Líneas de presupuesto por cuenta, centro de costo y período
 * Finance Enterprise SSOT - Módulo Financiero Unificado
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const FinanceBudgetLine = sequelize.define('FinanceBudgetLine', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        budget_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'finance_budgets', key: 'id' },
            onDelete: 'CASCADE'
        },
        account_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'finance_chart_of_accounts', key: 'id' }
        },
        cost_center_id: {
            type: DataTypes.INTEGER,
            references: { model: 'finance_cost_centers', key: 'id' }
        },
        line_type: {
            type: DataTypes.STRING(20),
            allowNull: false,
            validate: {
                isIn: [['revenue', 'expense', 'capex', 'transfer']]
            }
        },
        // Montos por período (12 meses + 1 ajuste)
        period_01: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
        period_02: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
        period_03: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
        period_04: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
        period_05: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
        period_06: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
        period_07: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
        period_08: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
        period_09: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
        period_10: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
        period_11: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
        period_12: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
        period_13: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, comment: 'Período de ajuste' },
        annual_total: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0
        },
        historical_amount: {
            type: DataTypes.DECIMAL(15, 2),
            comment: 'Monto del año base'
        },
        historical_source: {
            type: DataTypes.STRING(50),
            validate: {
                isIn: [['actual', 'budget', 'forecast', null]]
            }
        },
        inflation_adjustment: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0
        },
        growth_adjustment: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0
        },
        manual_adjustment: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0
        },
        driver_type: {
            type: DataTypes.STRING(50),
            validate: {
                isIn: [['headcount', 'revenue_percent', 'fixed', 'custom', null]]
            },
            comment: 'Tipo de driver para presupuesto basado en drivers'
        },
        driver_value: {
            type: DataTypes.DECIMAL(15, 4)
        },
        driver_unit_cost: {
            type: DataTypes.DECIMAL(15, 4)
        },
        notes: {
            type: DataTypes.TEXT
        }
    }, {
        tableName: 'finance_budget_lines',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            { unique: true, fields: ['budget_id', 'account_id', 'cost_center_id'] },
            { fields: ['account_id'] },
            { fields: ['cost_center_id'] }
        ]
    });

    // Recalcular total anual
    FinanceBudgetLine.prototype.recalculateTotal = async function() {
        let total = 0;
        for (let i = 1; i <= 13; i++) {
            const periodKey = `period_${i.toString().padStart(2, '0')}`;
            total += parseFloat(this[periodKey]) || 0;
        }
        this.annual_total = total;
        return this.save();
    };

    // Obtener monto de un período
    FinanceBudgetLine.prototype.getPeriodAmount = function(periodNumber) {
        const periodKey = `period_${periodNumber.toString().padStart(2, '0')}`;
        return parseFloat(this[periodKey]) || 0;
    };

    // Establecer monto de un período
    FinanceBudgetLine.prototype.setPeriodAmount = async function(periodNumber, amount) {
        const periodKey = `period_${periodNumber.toString().padStart(2, '0')}`;
        this[periodKey] = amount;
        await this.recalculateTotal();
    };

    // Distribuir monto anual uniformemente
    FinanceBudgetLine.prototype.distributeEvenly = async function(annualAmount) {
        const monthlyAmount = Math.round((annualAmount / 12) * 100) / 100;
        const remainder = annualAmount - (monthlyAmount * 12);

        for (let i = 1; i <= 12; i++) {
            const periodKey = `period_${i.toString().padStart(2, '0')}`;
            this[periodKey] = monthlyAmount;
        }

        // Ajustar diferencia en diciembre
        this.period_12 = parseFloat(this.period_12) + remainder;
        this.period_13 = 0;

        await this.recalculateTotal();
    };

    // Distribuir con estacionalidad
    FinanceBudgetLine.prototype.distributeWithSeasonality = async function(annualAmount, seasonalityFactors) {
        // seasonalityFactors es un array de 12 factores que suman 1
        const factorSum = seasonalityFactors.reduce((a, b) => a + b, 0);

        for (let i = 0; i < 12; i++) {
            const periodKey = `period_${(i + 1).toString().padStart(2, '0')}`;
            const factor = seasonalityFactors[i] / factorSum;
            this[periodKey] = Math.round(annualAmount * factor * 100) / 100;
        }

        this.period_13 = 0;
        await this.recalculateTotal();
    };

    // Aplicar inflación mensual
    FinanceBudgetLine.prototype.applyInflation = async function(annualInflationRate) {
        const monthlyRate = Math.pow(1 + annualInflationRate / 100, 1/12) - 1;

        for (let i = 1; i <= 12; i++) {
            const periodKey = `period_${i.toString().padStart(2, '0')}`;
            const currentAmount = parseFloat(this[periodKey]) || 0;
            const inflationFactor = Math.pow(1 + monthlyRate, i);
            this[periodKey] = Math.round(currentAmount * inflationFactor * 100) / 100;
        }

        await this.recalculateTotal();
        this.inflation_adjustment = this.annual_total - (this.historical_amount || 0);
        return this.save();
    };

    // Obtener líneas por cuenta
    FinanceBudgetLine.getByAccount = async function(budgetId, accountId) {
        return this.findAll({
            where: { budget_id: budgetId, account_id: accountId },
            order: [['cost_center_id', 'ASC']]
        });
    };

    // Obtener líneas por centro de costo
    FinanceBudgetLine.getByCostCenter = async function(budgetId, costCenterId) {
        return this.findAll({
            where: { budget_id: budgetId, cost_center_id: costCenterId },
            order: [['account_id', 'ASC']]
        });
    };

    // Obtener resumen por tipo
    FinanceBudgetLine.getSummaryByType = async function(budgetId) {
        return this.findAll({
            where: { budget_id: budgetId },
            attributes: [
                'line_type',
                [sequelize.fn('SUM', sequelize.col('annual_total')), 'total'],
                [sequelize.fn('COUNT', sequelize.col('id')), 'count']
            ],
            group: ['line_type'],
            raw: true
        });
    };

    // Obtener resumen mensual
    FinanceBudgetLine.getMonthlySummary = async function(budgetId) {
        const lines = await this.findAll({ where: { budget_id: budgetId } });

        const summary = {
            revenue: Array(12).fill(0),
            expense: Array(12).fill(0),
            net: Array(12).fill(0)
        };

        for (const line of lines) {
            for (let i = 1; i <= 12; i++) {
                const periodKey = `period_${i.toString().padStart(2, '0')}`;
                const amount = parseFloat(line[periodKey]) || 0;

                if (line.line_type === 'revenue') {
                    summary.revenue[i - 1] += amount;
                } else if (line.line_type === 'expense') {
                    summary.expense[i - 1] += amount;
                }
            }
        }

        for (let i = 0; i < 12; i++) {
            summary.net[i] = summary.revenue[i] - summary.expense[i];
        }

        return summary;
    };

    return FinanceBudgetLine;
};
