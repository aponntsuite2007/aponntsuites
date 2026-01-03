/**
 * FinanceBudgetExecution Model
 * Ejecución presupuestaria con control en tiempo real
 * Finance Enterprise SSOT - Módulo Financiero Unificado
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const FinanceBudgetExecution = sequelize.define('FinanceBudgetExecution', {
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
        budget_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'finance_budgets', key: 'id' }
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
        fiscal_period: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        budget_amount: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0
        },
        committed_amount: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0,
            comment: 'Comprometido (órdenes de compra aprobadas)'
        },
        actual_amount: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0,
            comment: 'Ejecutado (asientos contabilizados)'
        },
        available_amount: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0,
            comment: 'Disponible = presupuesto - comprometido - ejecutado'
        },
        variance_amount: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0
        },
        variance_percent: {
            type: DataTypes.DECIMAL(5, 2),
            defaultValue: 0
        },
        execution_percent: {
            type: DataTypes.DECIMAL(5, 2),
            defaultValue: 0
        },
        status: {
            type: DataTypes.STRING(20),
            defaultValue: 'on_track',
            validate: {
                isIn: [['on_track', 'warning', 'over_budget', 'blocked']]
            }
        },
        last_updated: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW
        }
    }, {
        tableName: 'finance_budget_execution',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            { unique: true, fields: ['budget_id', 'account_id', 'cost_center_id', 'fiscal_period'] },
            { fields: ['company_id', 'fiscal_period'] },
            { fields: ['status'] }
        ]
    });

    // Recalcular métricas
    FinanceBudgetExecution.prototype.recalculate = async function() {
        const budget = parseFloat(this.budget_amount) || 0;
        const committed = parseFloat(this.committed_amount) || 0;
        const actual = parseFloat(this.actual_amount) || 0;

        // Disponible
        this.available_amount = budget - committed - actual;

        // Varianza
        this.variance_amount = actual - budget;
        this.variance_percent = budget !== 0 ? (this.variance_amount / budget) * 100 : 0;

        // Ejecución
        this.execution_percent = budget !== 0 ? ((committed + actual) / budget) * 100 : 0;

        // Estado
        const Budget = sequelize.models.FinanceBudget;
        const budgetConfig = await Budget.findByPk(this.budget_id);

        if (budgetConfig) {
            const tolerance = parseFloat(budgetConfig.overspend_tolerance_percent) || 0;
            const controlLevel = budgetConfig.control_level;

            if (this.execution_percent > 100 + tolerance) {
                this.status = controlLevel === 'block' ? 'blocked' : 'over_budget';
            } else if (this.execution_percent > 90) {
                this.status = 'warning';
            } else {
                this.status = 'on_track';
            }
        }

        this.last_updated = new Date();
        return this.save();
    };

    // Agregar compromiso
    FinanceBudgetExecution.addCommitment = async function(budgetId, accountId, costCenterId, fiscalPeriod, amount) {
        const [execution, created] = await this.findOrCreate({
            where: { budget_id: budgetId, account_id: accountId, cost_center_id: costCenterId, fiscal_period: fiscalPeriod },
            defaults: {
                company_id: (await sequelize.models.FinanceBudget.findByPk(budgetId))?.company_id,
                committed_amount: amount
            }
        });

        if (!created) {
            execution.committed_amount = parseFloat(execution.committed_amount) + parseFloat(amount);
        }

        // Obtener monto presupuestado
        const BudgetLine = sequelize.models.FinanceBudgetLine;
        const budgetLine = await BudgetLine.findOne({
            where: { budget_id: budgetId, account_id: accountId, cost_center_id: costCenterId }
        });

        if (budgetLine) {
            const periodKey = `period_${fiscalPeriod.toString().padStart(2, '0')}`;
            execution.budget_amount = budgetLine[periodKey] || 0;
        }

        await execution.recalculate();
        return execution;
    };

    // Agregar ejecución real
    FinanceBudgetExecution.addActual = async function(budgetId, accountId, costCenterId, fiscalPeriod, amount) {
        const [execution, created] = await this.findOrCreate({
            where: { budget_id: budgetId, account_id: accountId, cost_center_id: costCenterId, fiscal_period: fiscalPeriod },
            defaults: {
                company_id: (await sequelize.models.FinanceBudget.findByPk(budgetId))?.company_id,
                actual_amount: amount
            }
        });

        if (!created) {
            execution.actual_amount = parseFloat(execution.actual_amount) + parseFloat(amount);
            // Reducir comprometido si corresponde
            if (execution.committed_amount > 0) {
                execution.committed_amount = Math.max(0, parseFloat(execution.committed_amount) - parseFloat(amount));
            }
        }

        // Obtener monto presupuestado
        const BudgetLine = sequelize.models.FinanceBudgetLine;
        const budgetLine = await BudgetLine.findOne({
            where: { budget_id: budgetId, account_id: accountId, cost_center_id: costCenterId }
        });

        if (budgetLine) {
            const periodKey = `period_${fiscalPeriod.toString().padStart(2, '0')}`;
            execution.budget_amount = budgetLine[periodKey] || 0;
        }

        await execution.recalculate();
        return execution;
    };

    // Verificar disponibilidad
    FinanceBudgetExecution.checkAvailability = async function(budgetId, accountId, costCenterId, fiscalPeriod, amount) {
        const execution = await this.findOne({
            where: { budget_id: budgetId, account_id: accountId, cost_center_id: costCenterId, fiscal_period: fiscalPeriod }
        });

        if (!execution) {
            // Obtener monto presupuestado
            const BudgetLine = sequelize.models.FinanceBudgetLine;
            const budgetLine = await BudgetLine.findOne({
                where: { budget_id: budgetId, account_id: accountId, cost_center_id: costCenterId }
            });

            if (!budgetLine) {
                return { available: false, reason: 'No existe línea de presupuesto', available_amount: 0 };
            }

            const periodKey = `period_${fiscalPeriod.toString().padStart(2, '0')}`;
            const budgetAmount = parseFloat(budgetLine[periodKey]) || 0;

            return {
                available: amount <= budgetAmount,
                reason: amount > budgetAmount ? 'Monto excede presupuesto' : null,
                available_amount: budgetAmount,
                requested_amount: amount
            };
        }

        const Budget = sequelize.models.FinanceBudget;
        const budgetConfig = await Budget.findByPk(budgetId);

        const tolerance = budgetConfig ? parseFloat(budgetConfig.overspend_tolerance_percent) || 0 : 0;
        const controlLevel = budgetConfig?.control_level || 'warning';
        const allowOverspend = budgetConfig?.allow_overspend || false;

        const available = parseFloat(execution.available_amount) || 0;
        const maxAllowed = allowOverspend
            ? parseFloat(execution.budget_amount) * (1 + tolerance / 100) - parseFloat(execution.committed_amount) - parseFloat(execution.actual_amount)
            : available;

        if (amount <= available) {
            return { available: true, available_amount: available, requested_amount: amount, status: 'on_track' };
        }

        if (amount <= maxAllowed && allowOverspend) {
            return {
                available: true,
                available_amount: available,
                requested_amount: amount,
                status: 'warning',
                message: `Excede presupuesto pero dentro de tolerancia (${tolerance}%)`
            };
        }

        return {
            available: controlLevel !== 'block',
            available_amount: available,
            requested_amount: amount,
            status: controlLevel === 'block' ? 'blocked' : 'over_budget',
            reason: controlLevel === 'block' ? 'Presupuesto bloqueado' : 'Excede presupuesto disponible'
        };
    };

    // Obtener ejecución por presupuesto
    FinanceBudgetExecution.getByBudget = async function(budgetId, fiscalPeriod = null) {
        const where = { budget_id: budgetId };
        if (fiscalPeriod) {
            where.fiscal_period = fiscalPeriod;
        }

        return this.findAll({
            where,
            order: [['account_id', 'ASC'], ['cost_center_id', 'ASC'], ['fiscal_period', 'ASC']]
        });
    };

    // Resumen de ejecución
    FinanceBudgetExecution.getSummary = async function(budgetId) {
        const executions = await this.findAll({ where: { budget_id: budgetId } });

        const summary = {
            total_budget: 0,
            total_committed: 0,
            total_actual: 0,
            total_available: 0,
            overall_execution_percent: 0,
            by_status: { on_track: 0, warning: 0, over_budget: 0, blocked: 0 },
            by_period: {}
        };

        for (const exec of executions) {
            summary.total_budget += parseFloat(exec.budget_amount) || 0;
            summary.total_committed += parseFloat(exec.committed_amount) || 0;
            summary.total_actual += parseFloat(exec.actual_amount) || 0;
            summary.total_available += parseFloat(exec.available_amount) || 0;
            summary.by_status[exec.status]++;

            if (!summary.by_period[exec.fiscal_period]) {
                summary.by_period[exec.fiscal_period] = {
                    budget: 0, committed: 0, actual: 0, available: 0
                };
            }
            summary.by_period[exec.fiscal_period].budget += parseFloat(exec.budget_amount) || 0;
            summary.by_period[exec.fiscal_period].committed += parseFloat(exec.committed_amount) || 0;
            summary.by_period[exec.fiscal_period].actual += parseFloat(exec.actual_amount) || 0;
            summary.by_period[exec.fiscal_period].available += parseFloat(exec.available_amount) || 0;
        }

        summary.overall_execution_percent = summary.total_budget !== 0
            ? ((summary.total_committed + summary.total_actual) / summary.total_budget) * 100
            : 0;

        return summary;
    };

    // Items sobre presupuesto
    FinanceBudgetExecution.getOverBudgetItems = async function(budgetId) {
        const { Op } = sequelize.Sequelize;

        return this.findAll({
            where: {
                budget_id: budgetId,
                status: { [Op.in]: ['over_budget', 'blocked'] }
            },
            order: [['variance_percent', 'DESC']]
        });
    };

    return FinanceBudgetExecution;
};
