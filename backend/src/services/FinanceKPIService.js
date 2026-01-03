/**
 * FinanceKPIService
 * KPIs financieros determinísticos y predictivos para Dashboard OLAP
 * Finance Enterprise SSOT - Sistema Financiero Unificado
 */

const db = require('../config/database');

class FinanceKPIService {
    /**
     * Obtener todos los KPIs para el dashboard
     */
    async getDashboardKPIs(companyId, fiscalYear = null, fiscalPeriod = null) {
        // Si no se especifica año fiscal, usar el actual
        if (!fiscalYear) {
            const currentPeriod = await db.FinanceFiscalPeriod.getCurrent(companyId);
            fiscalYear = currentPeriod?.fiscal_year || new Date().getFullYear();
            fiscalPeriod = fiscalPeriod || currentPeriod?.period_number;
        }

        const [
            liquidityKPIs,
            profitabilityKPIs,
            budgetKPIs,
            cashFlowKPIs,
            operationalKPIs
        ] = await Promise.all([
            this.getLiquidityKPIs(companyId, fiscalYear, fiscalPeriod),
            this.getProfitabilityKPIs(companyId, fiscalYear, fiscalPeriod),
            this.getBudgetKPIs(companyId, fiscalYear, fiscalPeriod),
            this.getCashFlowKPIs(companyId),
            this.getOperationalKPIs(companyId, fiscalYear, fiscalPeriod)
        ]);

        return {
            company_id: companyId,
            fiscal_year: fiscalYear,
            fiscal_period: fiscalPeriod,
            generated_at: new Date(),
            liquidity: liquidityKPIs,
            profitability: profitabilityKPIs,
            budget: budgetKPIs,
            cash_flow: cashFlowKPIs,
            operational: operationalKPIs
        };
    }

    /**
     * KPIs de Liquidez
     */
    async getLiquidityKPIs(companyId, fiscalYear, fiscalPeriod) {
        const { Op } = db.Sequelize;

        // Obtener saldos de cuentas
        const balances = await db.FinanceAccountBalance.getBalances(companyId, fiscalYear, fiscalPeriod);

        let currentAssets = 0;
        let inventory = 0;
        let currentLiabilities = 0;
        let cash = 0;

        for (const balance of balances) {
            const account = await db.FinanceChartOfAccounts.findByPk(balance.account_id);
            if (!account) continue;

            const amount = parseFloat(balance.closing_balance) || 0;

            if (account.account_code.startsWith('1.1')) { // Activo Corriente
                currentAssets += amount;

                if (account.account_code.startsWith('1.1.01')) { // Caja y Bancos
                    cash += amount;
                } else if (account.account_code.startsWith('1.1.04')) { // Bienes de Cambio
                    inventory += amount;
                }
            } else if (account.account_code.startsWith('2.1')) { // Pasivo Corriente
                currentLiabilities += amount;
            }
        }

        // Calcular ratios
        const currentRatio = currentLiabilities !== 0 ? currentAssets / currentLiabilities : null;
        const quickRatio = currentLiabilities !== 0 ? (currentAssets - inventory) / currentLiabilities : null;
        const cashRatio = currentLiabilities !== 0 ? cash / currentLiabilities : null;

        return {
            current_assets: currentAssets,
            inventory: inventory,
            current_liabilities: currentLiabilities,
            cash_position: cash,
            current_ratio: {
                value: currentRatio,
                benchmark: { min: 1.5, ideal: 2.0 },
                status: this.getRatioStatus(currentRatio, 1.5, 2.0)
            },
            quick_ratio: {
                value: quickRatio,
                benchmark: { min: 1.0, ideal: 1.5 },
                status: this.getRatioStatus(quickRatio, 1.0, 1.5)
            },
            cash_ratio: {
                value: cashRatio,
                benchmark: { min: 0.2, ideal: 0.5 },
                status: this.getRatioStatus(cashRatio, 0.2, 0.5)
            }
        };
    }

    /**
     * KPIs de Rentabilidad
     */
    async getProfitabilityKPIs(companyId, fiscalYear, fiscalPeriod) {
        const { Op } = db.Sequelize;

        // Obtener totales de ingresos y gastos
        const balances = await db.FinanceAccountBalance.getBalances(companyId, fiscalYear, fiscalPeriod);

        let totalRevenue = 0;
        let costOfSales = 0;
        let operatingExpenses = 0;

        for (const balance of balances) {
            const account = await db.FinanceChartOfAccounts.findByPk(balance.account_id);
            if (!account) continue;

            const debit = parseFloat(balance.period_debit) || 0;
            const credit = parseFloat(balance.period_credit) || 0;

            if (account.account_type === 'revenue') {
                totalRevenue += credit - debit;
            } else if (account.account_type === 'expense') {
                if (account.is_category === 'cost_of_sales') {
                    costOfSales += debit - credit;
                } else if (account.is_category === 'operating_expense') {
                    operatingExpenses += debit - credit;
                }
            }
        }

        const grossProfit = totalRevenue - costOfSales;
        const operatingIncome = grossProfit - operatingExpenses;
        const netIncome = operatingIncome; // Simplified

        return {
            revenue: totalRevenue,
            cost_of_sales: costOfSales,
            gross_profit: grossProfit,
            operating_expenses: operatingExpenses,
            operating_income: operatingIncome,
            net_income: netIncome,
            gross_margin: {
                value: totalRevenue !== 0 ? (grossProfit / totalRevenue) * 100 : 0,
                format: 'percent'
            },
            operating_margin: {
                value: totalRevenue !== 0 ? (operatingIncome / totalRevenue) * 100 : 0,
                format: 'percent'
            },
            net_margin: {
                value: totalRevenue !== 0 ? (netIncome / totalRevenue) * 100 : 0,
                format: 'percent'
            }
        };
    }

    /**
     * KPIs de Presupuesto
     */
    async getBudgetKPIs(companyId, fiscalYear, fiscalPeriod) {
        // Obtener presupuesto activo
        const budget = await db.FinanceBudget.getActive(companyId, fiscalYear);
        if (!budget) {
            return {
                has_budget: false,
                message: 'No hay presupuesto activo'
            };
        }

        // Obtener resumen de ejecución
        const executionSummary = await db.FinanceBudgetExecution.getSummary(budget.id);

        // Items sobre presupuesto
        const overBudgetItems = await db.FinanceBudgetExecution.getOverBudgetItems(budget.id);

        return {
            has_budget: true,
            budget_id: budget.id,
            budget_name: budget.name,
            total_budget: executionSummary.total_budget,
            total_committed: executionSummary.total_committed,
            total_actual: executionSummary.total_actual,
            total_available: executionSummary.total_available,
            execution_percent: {
                value: executionSummary.overall_execution_percent,
                format: 'percent'
            },
            budget_vs_actual: {
                value: executionSummary.total_budget !== 0
                    ? ((executionSummary.total_actual + executionSummary.total_committed) / executionSummary.total_budget) * 100
                    : 0,
                thresholds: { danger: 110, warning: 105, success: 100 },
                status: this.getBudgetStatus(executionSummary.overall_execution_percent)
            },
            by_status: executionSummary.by_status,
            top_variances: overBudgetItems.slice(0, 5).map(item => ({
                account_id: item.account_id,
                variance_amount: item.variance_amount,
                variance_percent: item.variance_percent
            }))
        };
    }

    /**
     * KPIs de Flujo de Caja
     */
    async getCashFlowKPIs(companyId) {
        const dashboard = await db.FinanceCashFlowForecast.getDashboard(companyId, 30);

        if (!dashboard.has_forecast) {
            // Obtener al menos el saldo bancario actual
            const bankDashboard = await db.FinanceBankAccount.getDashboard(companyId);

            return {
                has_forecast: false,
                current_cash_position: bankDashboard.by_currency?.ARS?.total_balance || 0,
                bank_accounts: bankDashboard.total_accounts
            };
        }

        return {
            has_forecast: true,
            current_balance: dashboard.current_balance,
            projected_end_balance: dashboard.projected_end_balance,
            projected_change: dashboard.projected_end_balance - dashboard.current_balance,
            projected_change_percent: dashboard.current_balance !== 0
                ? ((dashboard.projected_end_balance - dashboard.current_balance) / dashboard.current_balance) * 100
                : 0,
            min_balance: dashboard.min_balance,
            min_balance_date: dashboard.min_balance_date,
            days_negative: dashboard.days_negative,
            liquidity_risk: dashboard.days_negative > 0 ? 'high' : (dashboard.min_balance < 50000 ? 'medium' : 'low'),
            daily_average_net: dashboard.daily_average_net
        };
    }

    /**
     * KPIs Operacionales
     */
    async getOperationalKPIs(companyId, fiscalYear, fiscalPeriod) {
        // DSO (Days Sales Outstanding)
        const dso = await this.calculateDSO(companyId, fiscalYear, fiscalPeriod);

        // DPO (Days Payable Outstanding)
        const dpo = await this.calculateDPO(companyId, fiscalYear, fiscalPeriod);

        // Cash Conversion Cycle
        const ccc = dso.value - dpo.value;

        return {
            dso: {
                ...dso,
                benchmark: { ideal: 30, warning: 45, danger: 60 },
                status: this.getDSOStatus(dso.value)
            },
            dpo: {
                ...dpo,
                benchmark: { ideal: 45, warning: 30, danger: 15 },
                status: this.getDPOStatus(dpo.value)
            },
            cash_conversion_cycle: {
                value: ccc,
                description: ccc < 0 ? 'Favorable (cobramos antes de pagar)' : 'Requiere capital de trabajo'
            }
        };
    }

    /**
     * Calcular DSO
     */
    async calculateDSO(companyId, fiscalYear, fiscalPeriod) {
        // Obtener promedio de cuentas por cobrar
        const { Op } = db.Sequelize;

        const receivableAccounts = await db.FinanceChartOfAccounts.findAll({
            where: {
                company_id: companyId,
                account_code: { [Op.like]: '1103%' }, // Créditos por Ventas
                is_header: false
            }
        });

        let totalReceivables = 0;
        for (const account of receivableAccounts) {
            const balance = await db.FinanceAccountBalance.getBalance(
                companyId, account.id, fiscalYear, fiscalPeriod
            );
            totalReceivables += parseFloat(balance?.closing_balance) || 0;
        }

        // Obtener ventas del período
        const revenueAccounts = await db.FinanceChartOfAccounts.findAll({
            where: {
                company_id: companyId,
                account_type: 'revenue',
                is_header: false
            }
        });

        let totalRevenue = 0;
        for (const account of revenueAccounts) {
            const balance = await db.FinanceAccountBalance.getBalance(
                companyId, account.id, fiscalYear, fiscalPeriod
            );
            totalRevenue += parseFloat(balance?.period_credit) || 0;
        }

        // DSO = (Cuentas por Cobrar / Ventas) * Días del período
        const daysInPeriod = 30; // Simplificado a 30 días
        const dso = totalRevenue !== 0 ? (totalReceivables / totalRevenue) * daysInPeriod : 0;

        return {
            value: Math.round(dso),
            receivables: totalReceivables,
            revenue: totalRevenue,
            unit: 'días'
        };
    }

    /**
     * Calcular DPO
     */
    async calculateDPO(companyId, fiscalYear, fiscalPeriod) {
        const { Op } = db.Sequelize;

        // Obtener promedio de cuentas por pagar
        const payableAccounts = await db.FinanceChartOfAccounts.findAll({
            where: {
                company_id: companyId,
                account_code: { [Op.like]: '2101%' }, // Deudas Comerciales
                is_header: false
            }
        });

        let totalPayables = 0;
        for (const account of payableAccounts) {
            const balance = await db.FinanceAccountBalance.getBalance(
                companyId, account.id, fiscalYear, fiscalPeriod
            );
            totalPayables += parseFloat(balance?.closing_balance) || 0;
        }

        // Obtener compras del período (simplificado: gastos operativos)
        const expenseAccounts = await db.FinanceChartOfAccounts.findAll({
            where: {
                company_id: companyId,
                account_type: 'expense',
                is_header: false
            }
        });

        let totalExpenses = 0;
        for (const account of expenseAccounts) {
            const balance = await db.FinanceAccountBalance.getBalance(
                companyId, account.id, fiscalYear, fiscalPeriod
            );
            totalExpenses += parseFloat(balance?.period_debit) || 0;
        }

        // DPO = (Cuentas por Pagar / Compras) * Días del período
        const daysInPeriod = 30;
        const dpo = totalExpenses !== 0 ? (totalPayables / totalExpenses) * daysInPeriod : 0;

        return {
            value: Math.round(dpo),
            payables: totalPayables,
            purchases: totalExpenses,
            unit: 'días'
        };
    }

    /**
     * Helpers de estado
     */
    getRatioStatus(value, min, ideal) {
        if (value === null) return 'unknown';
        if (value >= ideal) return 'excellent';
        if (value >= min) return 'good';
        return 'warning';
    }

    getBudgetStatus(executionPercent) {
        if (executionPercent > 110) return 'danger';
        if (executionPercent > 105) return 'warning';
        if (executionPercent >= 90) return 'on_track';
        return 'under_execution';
    }

    getDSOStatus(days) {
        if (days <= 30) return 'excellent';
        if (days <= 45) return 'good';
        if (days <= 60) return 'warning';
        return 'danger';
    }

    getDPOStatus(days) {
        if (days >= 45) return 'excellent';
        if (days >= 30) return 'good';
        if (days >= 15) return 'warning';
        return 'danger';
    }

    /**
     * Proyección de fin de año
     */
    async getYearEndProjection(companyId, fiscalYear) {
        const currentPeriod = await db.FinanceFiscalPeriod.getCurrent(companyId);
        if (!currentPeriod || currentPeriod.fiscal_year !== fiscalYear) {
            return null;
        }

        const currentMonth = currentPeriod.period_number;

        // Obtener YTD
        const profitability = await this.getProfitabilityKPIs(companyId, fiscalYear, currentMonth);

        // Proyección lineal simple
        const revenueYTD = profitability.revenue;
        const expensesYTD = profitability.operating_expenses + profitability.cost_of_sales;
        const netIncomeYTD = profitability.net_income;

        const monthlyAverageRevenue = revenueYTD / currentMonth;
        const monthlyAverageExpenses = expensesYTD / currentMonth;
        const monthlyAverageNet = netIncomeYTD / currentMonth;

        return {
            current_month: currentMonth,
            ytd_revenue: revenueYTD,
            ytd_expenses: expensesYTD,
            ytd_net_income: netIncomeYTD,
            projected_revenue: monthlyAverageRevenue * 12,
            projected_expenses: monthlyAverageExpenses * 12,
            projected_net_income: monthlyAverageNet * 12,
            confidence_level: this.getProjectionConfidence(currentMonth),
            scenarios: {
                optimistic: monthlyAverageNet * 12 * 1.1,
                base: monthlyAverageNet * 12,
                pessimistic: monthlyAverageNet * 12 * 0.9
            }
        };
    }

    getProjectionConfidence(currentMonth) {
        if (currentMonth >= 10) return 95;
        if (currentMonth >= 7) return 80;
        if (currentMonth >= 4) return 60;
        return 40;
    }
}

module.exports = new FinanceKPIService();
