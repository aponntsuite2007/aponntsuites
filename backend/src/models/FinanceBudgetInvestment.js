/**
 * FinanceBudgetInvestment Model
 * Inversiones de capital (CAPEX) con ROI, NPV, IRR
 * Finance Enterprise SSOT - Módulo Financiero Unificado
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const FinanceBudgetInvestment = sequelize.define('FinanceBudgetInvestment', {
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
        investment_code: {
            type: DataTypes.STRING(50),
            allowNull: false
        },
        name: {
            type: DataTypes.STRING(200),
            allowNull: false
        },
        description: {
            type: DataTypes.TEXT
        },
        investment_type: {
            type: DataTypes.STRING(50),
            allowNull: false,
            validate: {
                isIn: [['equipment', 'technology', 'infrastructure', 'intangible', 'real_estate', 'vehicle']]
            }
        },
        category: {
            type: DataTypes.STRING(50),
            validate: {
                isIn: [['expansion', 'replacement', 'mandatory', 'strategic', 'efficiency', null]]
            }
        },
        priority: {
            type: DataTypes.STRING(20),
            validate: {
                isIn: [['critical', 'high', 'medium', 'low', null]]
            }
        },
        total_amount: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false
        },
        currency: {
            type: DataTypes.STRING(3),
            defaultValue: 'ARS'
        },
        disbursement_schedule: {
            type: DataTypes.JSONB,
            defaultValue: {},
            comment: 'Cronograma de desembolso por período: {"01": 100000, "06": 200000}'
        },
        expected_roi_percent: {
            type: DataTypes.DECIMAL(5, 2),
            comment: 'ROI esperado %'
        },
        payback_months: {
            type: DataTypes.INTEGER,
            comment: 'Período de recuperación en meses'
        },
        npv: {
            type: DataTypes.DECIMAL(15, 2),
            comment: 'Net Present Value'
        },
        irr: {
            type: DataTypes.DECIMAL(5, 2),
            comment: 'Internal Rate of Return %'
        },
        future_opex_impact: {
            type: DataTypes.DECIMAL(15, 2),
            comment: 'Gasto operativo anual adicional'
        },
        future_savings: {
            type: DataTypes.DECIMAL(15, 2),
            comment: 'Ahorro anual esperado'
        },
        asset_account_id: {
            type: DataTypes.INTEGER,
            references: { model: 'finance_chart_of_accounts', key: 'id' }
        },
        expense_account_id: {
            type: DataTypes.INTEGER,
            references: { model: 'finance_chart_of_accounts', key: 'id' }
        },
        cost_center_id: {
            type: DataTypes.INTEGER,
            references: { model: 'finance_cost_centers', key: 'id' }
        },
        status: {
            type: DataTypes.STRING(20),
            defaultValue: 'proposed',
            validate: {
                isIn: [['proposed', 'approved', 'in_progress', 'completed', 'cancelled', 'on_hold']]
            }
        },
        requires_board_approval: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        approved_by: {
            type: DataTypes.UUID
        },
        approved_at: {
            type: DataTypes.DATE
        },
        actual_spent: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0
        },
        variance_amount: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0
        },
        variance_percent: {
            type: DataTypes.DECIMAL(5, 2),
            defaultValue: 0
        },
        start_date: {
            type: DataTypes.DATEONLY
        },
        completion_date: {
            type: DataTypes.DATEONLY
        },
        actual_completion_date: {
            type: DataTypes.DATEONLY
        },
        notes: {
            type: DataTypes.TEXT
        }
    }, {
        tableName: 'finance_budget_investments',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            { unique: true, fields: ['budget_id', 'investment_code'] },
            { fields: ['status'] },
            { fields: ['investment_type'] },
            { fields: ['cost_center_id'] }
        ]
    });

    // Calcular varianza
    FinanceBudgetInvestment.prototype.calculateVariance = function() {
        this.variance_amount = this.actual_spent - this.total_amount;
        this.variance_percent = this.total_amount !== 0
            ? (this.variance_amount / this.total_amount) * 100
            : 0;
    };

    // Registrar gasto
    FinanceBudgetInvestment.prototype.recordSpending = async function(amount) {
        this.actual_spent = parseFloat(this.actual_spent) + parseFloat(amount);
        this.calculateVariance();
        return this.save();
    };

    // Aprobar inversión
    FinanceBudgetInvestment.prototype.approve = async function(userId) {
        this.status = 'approved';
        this.approved_by = userId;
        this.approved_at = new Date();
        return this.save();
    };

    // Iniciar inversión
    FinanceBudgetInvestment.prototype.start = async function() {
        if (this.status !== 'approved') {
            throw new Error('La inversión debe estar aprobada');
        }
        this.status = 'in_progress';
        this.start_date = new Date();
        return this.save();
    };

    // Completar inversión
    FinanceBudgetInvestment.prototype.complete = async function() {
        this.status = 'completed';
        this.actual_completion_date = new Date();
        this.calculateVariance();
        return this.save();
    };

    // Cancelar inversión
    FinanceBudgetInvestment.prototype.cancel = async function(reason) {
        this.status = 'cancelled';
        this.notes = reason;
        return this.save();
    };

    // Obtener desembolso de un período
    FinanceBudgetInvestment.prototype.getDisbursementForPeriod = function(periodNumber) {
        const periodKey = periodNumber.toString().padStart(2, '0');
        return parseFloat(this.disbursement_schedule[periodKey]) || 0;
    };

    // Calcular ROI real
    FinanceBudgetInvestment.prototype.calculateActualROI = function(actualSavings, years = 1) {
        if (this.actual_spent === 0) return 0;
        return ((actualSavings * years - this.actual_spent) / this.actual_spent) * 100;
    };

    // Obtener inversiones por estado
    FinanceBudgetInvestment.getByStatus = async function(budgetId, status) {
        return this.findAll({
            where: { budget_id: budgetId, status },
            order: [['priority', 'ASC'], ['total_amount', 'DESC']]
        });
    };

    // Obtener inversiones por tipo
    FinanceBudgetInvestment.getByType = async function(budgetId, investmentType) {
        return this.findAll({
            where: { budget_id: budgetId, investment_type: investmentType },
            order: [['total_amount', 'DESC']]
        });
    };

    // Obtener resumen de CAPEX
    FinanceBudgetInvestment.getSummary = async function(budgetId) {
        const investments = await this.findAll({ where: { budget_id: budgetId } });

        const summary = {
            total_planned: 0,
            total_spent: 0,
            total_variance: 0,
            by_type: {},
            by_status: {},
            by_priority: {}
        };

        for (const inv of investments) {
            summary.total_planned += parseFloat(inv.total_amount) || 0;
            summary.total_spent += parseFloat(inv.actual_spent) || 0;

            // Por tipo
            if (!summary.by_type[inv.investment_type]) {
                summary.by_type[inv.investment_type] = { count: 0, amount: 0, spent: 0 };
            }
            summary.by_type[inv.investment_type].count++;
            summary.by_type[inv.investment_type].amount += parseFloat(inv.total_amount) || 0;
            summary.by_type[inv.investment_type].spent += parseFloat(inv.actual_spent) || 0;

            // Por estado
            if (!summary.by_status[inv.status]) {
                summary.by_status[inv.status] = { count: 0, amount: 0 };
            }
            summary.by_status[inv.status].count++;
            summary.by_status[inv.status].amount += parseFloat(inv.total_amount) || 0;

            // Por prioridad
            const priority = inv.priority || 'unassigned';
            if (!summary.by_priority[priority]) {
                summary.by_priority[priority] = { count: 0, amount: 0 };
            }
            summary.by_priority[priority].count++;
            summary.by_priority[priority].amount += parseFloat(inv.total_amount) || 0;
        }

        summary.total_variance = summary.total_spent - summary.total_planned;

        return summary;
    };

    // Obtener cronograma de desembolsos consolidado
    FinanceBudgetInvestment.getDisbursementSchedule = async function(budgetId) {
        const investments = await this.findAll({
            where: { budget_id: budgetId, status: { [sequelize.Sequelize.Op.in]: ['approved', 'in_progress'] } }
        });

        const schedule = {};
        for (let i = 1; i <= 12; i++) {
            schedule[i.toString().padStart(2, '0')] = 0;
        }

        for (const inv of investments) {
            for (const [period, amount] of Object.entries(inv.disbursement_schedule || {})) {
                if (schedule[period] !== undefined) {
                    schedule[period] += parseFloat(amount) || 0;
                }
            }
        }

        return schedule;
    };

    return FinanceBudgetInvestment;
};
