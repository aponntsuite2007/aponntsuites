/**
 * FinanceBudgetService
 * Generación inteligente de presupuestos con histórico, inflación e inversiones
 * Finance Enterprise SSOT - Sistema Financiero Unificado
 */

const db = require('../config/database');

class FinanceBudgetService {
    /**
     * Crear nuevo presupuesto
     */
    async createBudget(companyId, data, userId) {
        const {
            budgetCode,
            name,
            description,
            fiscalYear,
            budgetType = 'annual',
            category = 'operational',
            generationMethod = 'manual',
            inflationRate = 0,
            growthRate = 0,
            controlLevel = 'warning'
        } = data;

        const budget = await db.FinanceBudget.create({
            company_id: companyId,
            budget_code: budgetCode,
            name,
            description,
            fiscal_year: fiscalYear,
            budget_type: budgetType,
            category,
            generation_method: generationMethod,
            inflation_rate: inflationRate,
            growth_rate: growthRate,
            control_level: controlLevel,
            status: 'draft',
            created_by: userId
        });

        return budget;
    }

    /**
     * Generar presupuesto desde datos históricos
     */
    async generateFromHistorical(companyId, targetYear, options, userId) {
        const {
            baseYear,
            inflationRate = 0,
            growthRate = 0,
            excludeOneTime = true,
            adjustSeasonality = true,
            budgetCode,
            name
        } = options;

        // Obtener datos históricos de asientos contables del año base
        const historicalData = await this.getHistoricalByAccount(companyId, baseYear);

        if (historicalData.length === 0) {
            throw new Error(`No hay datos históricos para el año ${baseYear}`);
        }

        // Crear presupuesto
        const budget = await this.createBudget(companyId, {
            budgetCode: budgetCode || `PPTO-${targetYear}-AUTO`,
            name: name || `Presupuesto ${targetYear} (basado en ${baseYear})`,
            fiscalYear: targetYear,
            category: 'operational',
            generationMethod: 'historical',
            inflationRate,
            growthRate
        }, userId);

        budget.base_year = baseYear;
        await budget.save();

        // Calcular factores de estacionalidad
        const seasonalityFactors = adjustSeasonality
            ? await this.calculateSeasonality(companyId, baseYear)
            : Array(12).fill(1/12);

        // Calcular inflación mensual
        const monthlyInflation = Math.pow(1 + inflationRate / 100, 1/12) - 1;

        // Crear líneas de presupuesto
        for (const historical of historicalData) {
            const baseAmount = parseFloat(historical.annual_total) || 0;
            if (baseAmount === 0) continue;

            const withGrowth = baseAmount * (1 + growthRate / 100);

            // Distribuir por mes con estacionalidad e inflación
            const lineData = {
                budget_id: budget.id,
                account_id: historical.account_id,
                cost_center_id: historical.cost_center_id || null,
                line_type: historical.account_type === 'revenue' ? 'revenue' : 'expense',
                historical_amount: baseAmount,
                historical_source: 'actual',
                inflation_adjustment: baseAmount * inflationRate / 100,
                growth_adjustment: baseAmount * growthRate / 100
            };

            // Calcular monto por período
            for (let m = 1; m <= 12; m++) {
                const seasonalAmount = withGrowth * seasonalityFactors[m - 1];
                const inflationFactor = Math.pow(1 + monthlyInflation, m);
                const periodKey = `period_${m.toString().padStart(2, '0')}`;
                lineData[periodKey] = Math.round(seasonalAmount * inflationFactor * 100) / 100;
            }

            lineData.period_13 = 0;

            const budgetLine = await db.FinanceBudgetLine.create(lineData);
            await budgetLine.recalculateTotal();
        }

        // Recalcular totales del presupuesto
        await budget.recalculateTotals();

        return budget;
    }

    /**
     * Obtener datos históricos por cuenta
     */
    async getHistoricalByAccount(companyId, year) {
        const { Op } = db.Sequelize;

        // Obtener líneas de asiento del año
        const lines = await db.FinanceJournalEntryLine.findAll({
            attributes: [
                'account_id',
                [db.sequelize.fn('SUM', db.sequelize.col('debit_amount')), 'total_debit'],
                [db.sequelize.fn('SUM', db.sequelize.col('credit_amount')), 'total_credit']
            ],
            include: [{
                model: db.FinanceJournalEntry,
                as: 'entry',
                where: {
                    company_id: companyId,
                    fiscal_year: year,
                    status: 'posted'
                },
                attributes: []
            }, {
                model: db.FinanceChartOfAccounts,
                as: 'account',
                attributes: ['account_type', 'account_nature']
            }],
            group: ['FinanceJournalEntryLine.account_id', 'account.id', 'account.account_type', 'account.account_nature'],
            raw: true,
            nest: true
        });

        return lines.map(line => {
            const debit = parseFloat(line.total_debit) || 0;
            const credit = parseFloat(line.total_credit) || 0;

            // Calcular monto anual según naturaleza
            let annualTotal;
            if (line.account?.account_nature === 'debit') {
                annualTotal = debit - credit;
            } else {
                annualTotal = credit - debit;
            }

            return {
                account_id: line.account_id,
                account_type: line.account?.account_type,
                annual_total: Math.abs(annualTotal)
            };
        });
    }

    /**
     * Calcular estacionalidad desde datos históricos
     */
    async calculateSeasonality(companyId, year) {
        const monthlyTotals = Array(12).fill(0);
        let grandTotal = 0;

        // Obtener totales mensuales de gastos
        for (let month = 1; month <= 12; month++) {
            const balances = await db.FinanceAccountBalance.findAll({
                where: {
                    company_id: companyId,
                    fiscal_year: year,
                    fiscal_period: month
                },
                include: [{
                    model: db.FinanceChartOfAccounts,
                    as: 'account',
                    where: { account_type: 'expense' }
                }]
            });

            const monthTotal = balances.reduce((sum, b) => sum + (parseFloat(b.period_debit) || 0), 0);
            monthlyTotals[month - 1] = monthTotal;
            grandTotal += monthTotal;
        }

        // Si no hay datos, retornar distribución uniforme
        if (grandTotal === 0) {
            return Array(12).fill(1/12);
        }

        // Calcular factores de estacionalidad
        return monthlyTotals.map(t => t / grandTotal);
    }

    /**
     * Agregar inversión (CAPEX) al presupuesto
     */
    async addInvestment(budgetId, investmentData, userId) {
        const budget = await db.FinanceBudget.findByPk(budgetId);
        if (!budget) {
            throw new Error('Presupuesto no encontrado');
        }

        const investment = await db.FinanceBudgetInvestment.create({
            budget_id: budgetId,
            investment_code: investmentData.code,
            name: investmentData.name,
            description: investmentData.description,
            investment_type: investmentData.type,
            category: investmentData.category,
            priority: investmentData.priority,
            total_amount: investmentData.amount,
            currency: investmentData.currency || 'ARS',
            disbursement_schedule: investmentData.disbursementSchedule || {},
            expected_roi_percent: investmentData.expectedRoi,
            payback_months: investmentData.paybackMonths,
            npv: investmentData.npv,
            irr: investmentData.irr,
            future_opex_impact: investmentData.futureOpexImpact,
            future_savings: investmentData.futureSavings,
            cost_center_id: investmentData.costCenterId,
            requires_board_approval: investmentData.totalAmount > 100000, // >100k requiere directorio
            status: 'proposed'
        });

        // Recalcular totales
        await budget.recalculateTotals();

        return investment;
    }

    /**
     * Aplicar inflación mensual a línea de presupuesto
     */
    async applyInflationToLine(budgetLineId, annualInflationRate) {
        const line = await db.FinanceBudgetLine.findByPk(budgetLineId);
        if (!line) {
            throw new Error('Línea de presupuesto no encontrada');
        }

        await line.applyInflation(annualInflationRate);
        return line;
    }

    /**
     * Comparar presupuesto vs ejecución real
     */
    async getBudgetVsActual(budgetId, period = null) {
        const budget = await db.FinanceBudget.findByPk(budgetId);
        if (!budget) {
            throw new Error('Presupuesto no encontrado');
        }

        const lines = await db.FinanceBudgetLine.findAll({
            where: { budget_id: budgetId },
            include: [{
                model: db.FinanceChartOfAccounts,
                as: 'account',
                attributes: ['account_code', 'name', 'account_type']
            }, {
                model: db.FinanceCostCenter,
                as: 'costCenter',
                attributes: ['code', 'name']
            }]
        });

        const comparison = [];

        for (const line of lines) {
            // Obtener ejecución real
            const execution = await db.FinanceBudgetExecution.findOne({
                where: {
                    budget_id: budgetId,
                    account_id: line.account_id,
                    cost_center_id: line.cost_center_id,
                    ...(period ? { fiscal_period: period } : {})
                }
            });

            // Calcular presupuesto hasta el período
            let budgetAmount = 0;
            if (period) {
                budgetAmount = line.getPeriodAmount(period);
            } else {
                budgetAmount = parseFloat(line.annual_total) || 0;
            }

            const actualAmount = execution ? parseFloat(execution.actual_amount) : 0;
            const committedAmount = execution ? parseFloat(execution.committed_amount) : 0;
            const variance = actualAmount - budgetAmount;
            const variancePercent = budgetAmount !== 0 ? (variance / budgetAmount) * 100 : 0;

            comparison.push({
                account_code: line.account?.account_code,
                account_name: line.account?.name,
                cost_center: line.costCenter?.name,
                budget_amount: budgetAmount,
                committed_amount: committedAmount,
                actual_amount: actualAmount,
                available_amount: budgetAmount - committedAmount - actualAmount,
                variance_amount: variance,
                variance_percent: variancePercent,
                status: execution?.status || 'on_track'
            });
        }

        return {
            budget: {
                id: budget.id,
                name: budget.name,
                fiscal_year: budget.fiscal_year,
                status: budget.status
            },
            period,
            lines: comparison,
            summary: this.calculateComparisonSummary(comparison)
        };
    }

    /**
     * Calcular resumen de comparación
     */
    calculateComparisonSummary(comparison) {
        const summary = {
            total_budget: 0,
            total_committed: 0,
            total_actual: 0,
            total_available: 0,
            total_variance: 0,
            lines_over_budget: 0,
            lines_on_track: 0,
            lines_under_budget: 0
        };

        for (const line of comparison) {
            summary.total_budget += parseFloat(line.budget_amount) || 0;
            summary.total_committed += parseFloat(line.committed_amount) || 0;
            summary.total_actual += parseFloat(line.actual_amount) || 0;
            summary.total_available += parseFloat(line.available_amount) || 0;
            summary.total_variance += parseFloat(line.variance_amount) || 0;

            if (line.variance_amount > 0) {
                summary.lines_over_budget++;
            } else if (line.variance_amount < 0) {
                summary.lines_under_budget++;
            } else {
                summary.lines_on_track++;
            }
        }

        summary.execution_percent = summary.total_budget !== 0
            ? ((summary.total_committed + summary.total_actual) / summary.total_budget) * 100
            : 0;

        return summary;
    }

    /**
     * Proyección de fin de año basada en tendencia actual
     */
    async getYearEndProjection(budgetId) {
        const budget = await db.FinanceBudget.findByPk(budgetId);
        if (!budget) {
            throw new Error('Presupuesto no encontrado');
        }

        // Obtener período actual
        const currentPeriod = await db.FinanceFiscalPeriod.getCurrent(budget.company_id);
        if (!currentPeriod) {
            return null;
        }

        const currentMonth = currentPeriod.period_number;

        // Obtener ejecución hasta el período actual
        const executions = await db.FinanceBudgetExecution.findAll({
            where: {
                budget_id: budgetId,
                fiscal_period: { [db.Sequelize.Op.lte]: currentMonth }
            }
        });

        // Calcular ejecución acumulada
        let executedYTD = 0;
        for (const exec of executions) {
            executedYTD += parseFloat(exec.actual_amount) || 0;
        }

        // Proyección lineal
        const monthlyAverage = executedYTD / currentMonth;
        const projectedYearEnd = monthlyAverage * 12;
        const annualBudget = parseFloat(budget.total_expense) + parseFloat(budget.total_revenue);

        return {
            fiscal_year: budget.fiscal_year,
            current_period: currentMonth,
            executed_ytd: executedYTD,
            monthly_average: monthlyAverage,
            projected_year_end: projectedYearEnd,
            annual_budget: annualBudget,
            projected_variance: projectedYearEnd - annualBudget,
            projected_variance_percent: annualBudget !== 0
                ? ((projectedYearEnd - annualBudget) / annualBudget) * 100
                : 0,
            confidence_level: this.calculateConfidenceLevel(currentMonth)
        };
    }

    /**
     * Calcular nivel de confianza de la proyección
     */
    calculateConfidenceLevel(currentMonth) {
        // Mayor confianza a medida que avanza el año
        if (currentMonth >= 10) return 90;
        if (currentMonth >= 7) return 75;
        if (currentMonth >= 4) return 60;
        return 40;
    }
}

module.exports = new FinanceBudgetService();
