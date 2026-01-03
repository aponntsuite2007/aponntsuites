/**
 * FinanceCashFlowService
 * Proyección de flujo de caja con escenarios y alertas
 * Finance Enterprise SSOT - Sistema Financiero Unificado
 */

const db = require('../config/database');

class FinanceCashFlowService {
    /**
     * Generar proyección de flujo de caja
     */
    async generateForecast(companyId, days = 30, scenario = 'base') {
        // Obtener saldo inicial (cuentas bancarias)
        const bankTotals = await db.FinanceBankAccount.getTotalByCurrency(companyId);
        let openingBalance = 0;
        for (const bt of bankTotals) {
            if (bt.currency === 'ARS') {
                openingBalance = parseFloat(bt.total_balance) || 0;
            }
        }

        const forecasts = [];
        const today = new Date();
        let currentBalance = openingBalance;

        for (let i = 0; i < days; i++) {
            const forecastDate = new Date(today);
            forecastDate.setDate(today.getDate() + i);

            // Obtener proyecciones de cada fuente
            const inflows = await this.getProjectedInflows(companyId, forecastDate, scenario);
            const outflows = await this.getProjectedOutflows(companyId, forecastDate, scenario);

            const totalInflows = Object.values(inflows).reduce((a, b) => a + b, 0);
            const totalOutflows = Object.values(outflows).reduce((a, b) => a + b, 0);
            const netFlow = totalInflows - totalOutflows;
            const closingBalance = currentBalance + netFlow;

            const forecast = await db.FinanceCashFlowForecast.create({
                company_id: companyId,
                forecast_date: forecastDate,
                forecast_type: 'daily',
                scenario,
                currency: 'ARS',
                opening_balance: currentBalance,
                inflows_receivables: inflows.receivables,
                inflows_sales: inflows.sales,
                inflows_loans: inflows.loans,
                inflows_other: inflows.other,
                total_inflows: totalInflows,
                outflows_payables: outflows.payables,
                outflows_payroll: outflows.payroll,
                outflows_taxes: outflows.taxes,
                outflows_loans: outflows.loans,
                outflows_capex: outflows.capex,
                outflows_rent: outflows.rent,
                outflows_utilities: outflows.utilities,
                outflows_other: outflows.other,
                total_outflows: totalOutflows,
                net_flow: netFlow,
                closing_balance: closingBalance,
                confidence_level: this.calculateConfidence(i),
                generated_at: new Date(),
                generated_by: 'system'
            });

            forecasts.push(forecast);
            currentBalance = closingBalance;
        }

        return {
            opening_balance: openingBalance,
            forecasts,
            summary: await this.getForecastSummary(forecasts)
        };
    }

    /**
     * Obtener proyección de ingresos para una fecha
     */
    async getProjectedInflows(companyId, date, scenario) {
        const { Op } = db.Sequelize;
        const inflows = {
            receivables: 0,
            sales: 0,
            loans: 0,
            other: 0
        };

        // Factor de ajuste según escenario
        const factor = this.getScenarioFactor(scenario, 'inflows');

        // 1. Cobranzas esperadas (facturas por vencer)
        if (db.ProcurementInvoice) {
            const invoices = await db.ProcurementInvoice.findAll({
                where: {
                    company_id: companyId,
                    due_date: date,
                    status: { [Op.in]: ['approved', 'scheduled'] }
                }
            });

            for (const inv of invoices) {
                inflows.receivables += parseFloat(inv.total_amount) * factor;
            }
        }

        // 2. Ventas de contado estimadas (promedio histórico)
        const avgDailySales = await this.getAverageDailySales(companyId);
        inflows.sales = avgDailySales * factor;

        return inflows;
    }

    /**
     * Obtener proyección de egresos para una fecha
     */
    async getProjectedOutflows(companyId, date, scenario) {
        const { Op } = db.Sequelize;
        const outflows = {
            payables: 0,
            payroll: 0,
            taxes: 0,
            loans: 0,
            capex: 0,
            rent: 0,
            utilities: 0,
            other: 0
        };

        const factor = this.getScenarioFactor(scenario, 'outflows');
        const dateStr = date.toISOString().split('T')[0];
        const dayOfMonth = date.getDate();

        // 1. Pagos a proveedores programados
        const payments = await db.ProcurementPayment.findAll({
            where: {
                company_id: companyId,
                scheduled_date: dateStr,
                status: 'approved'
            }
        });

        for (const payment of payments) {
            outflows.payables += parseFloat(payment.total_amount) * factor;
        }

        // 2. Nómina (típicamente día 5 o último día del mes)
        if (dayOfMonth === 5 || this.isLastDayOfMonth(date)) {
            const avgPayroll = await this.getAveragePayroll(companyId);
            outflows.payroll = avgPayroll * factor;
        }

        // 3. Impuestos (típicamente día 15 o 20)
        if ([15, 20].includes(dayOfMonth)) {
            const avgTaxes = await this.getAverageMonthlyTaxes(companyId);
            outflows.taxes = (avgTaxes / 2) * factor; // Dividido entre 2 pagos
        }

        // 4. Inversiones (CAPEX) programadas
        if (db.FinanceBudgetInvestment) {
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const investments = await db.FinanceBudgetInvestment.findAll({
                where: {
                    status: { [Op.in]: ['approved', 'in_progress'] }
                },
                include: [{
                    model: db.FinanceBudget,
                    as: 'budget',
                    where: { company_id: companyId, status: 'active' }
                }]
            });

            for (const inv of investments) {
                const disbursement = inv.getDisbursementForPeriod(parseInt(month));
                if (disbursement > 0 && dayOfMonth === 15) { // Desembolso a mitad de mes
                    outflows.capex += disbursement * factor;
                }
            }
        }

        // 5. Alquiler (típicamente día 1-5)
        if (dayOfMonth <= 5) {
            const avgRent = await this.getAverageRent(companyId);
            outflows.rent = avgRent * factor;
        }

        // 6. Servicios (típicamente día 10-15)
        if (dayOfMonth >= 10 && dayOfMonth <= 15) {
            const avgUtilities = await this.getAverageUtilities(companyId);
            outflows.utilities = avgUtilities * factor;
        }

        return outflows;
    }

    /**
     * Obtener factor de ajuste según escenario
     */
    getScenarioFactor(scenario, type) {
        const factors = {
            optimistic: { inflows: 1.15, outflows: 0.90 },
            base: { inflows: 1.00, outflows: 1.00 },
            pessimistic: { inflows: 0.80, outflows: 1.10 }
        };

        return factors[scenario]?.[type] || 1.00;
    }

    /**
     * Calcular nivel de confianza basado en días hacia el futuro
     */
    calculateConfidence(daysAhead) {
        if (daysAhead <= 7) return 95;
        if (daysAhead <= 14) return 85;
        if (daysAhead <= 21) return 70;
        if (daysAhead <= 30) return 55;
        return 40;
    }

    /**
     * Verificar si es el último día del mes
     */
    isLastDayOfMonth(date) {
        const nextDay = new Date(date);
        nextDay.setDate(nextDay.getDate() + 1);
        return nextDay.getDate() === 1;
    }

    /**
     * Promedios históricos para proyecciones
     */
    async getAverageDailySales(companyId) {
        // Obtener promedio de los últimos 90 días de transacciones bancarias tipo "deposit"
        const { Op } = db.Sequelize;
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

        const result = await db.FinanceBankTransaction.findOne({
            where: {
                company_id: companyId,
                transaction_type: { [Op.in]: ['deposit', 'transfer_in'] },
                transaction_date: { [Op.gte]: ninetyDaysAgo },
                status: 'confirmed'
            },
            attributes: [[db.sequelize.fn('AVG', db.sequelize.col('amount')), 'avg_amount']],
            raw: true
        });

        return parseFloat(result?.avg_amount) || 0;
    }

    async getAveragePayroll(companyId) {
        // Obtener promedio de nómina de los últimos 6 meses
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        if (!db.PayrollRun) return 0;

        const result = await db.PayrollRun.findOne({
            where: {
                company_id: companyId,
                status: 'closed',
                created_at: { [db.Sequelize.Op.gte]: sixMonthsAgo }
            },
            attributes: [[db.sequelize.fn('AVG', db.sequelize.col('total_net')), 'avg_payroll']],
            raw: true
        });

        return parseFloat(result?.avg_payroll) || 0;
    }

    async getAverageMonthlyTaxes(companyId) {
        // Placeholder - obtener de cuentas de impuestos
        return 0;
    }

    async getAverageRent(companyId) {
        // Placeholder - obtener de gastos fijos
        return 0;
    }

    async getAverageUtilities(companyId) {
        // Placeholder - obtener de gastos fijos
        return 0;
    }

    /**
     * Obtener resumen del forecast
     */
    async getForecastSummary(forecasts) {
        if (forecasts.length === 0) return null;

        let minBalance = Infinity;
        let minBalanceDate = null;
        let daysNegative = 0;
        let totalInflows = 0;
        let totalOutflows = 0;

        for (const f of forecasts) {
            const balance = parseFloat(f.closing_balance) || 0;
            if (balance < minBalance) {
                minBalance = balance;
                minBalanceDate = f.forecast_date;
            }
            if (balance < 0) daysNegative++;
            totalInflows += parseFloat(f.total_inflows) || 0;
            totalOutflows += parseFloat(f.total_outflows) || 0;
        }

        return {
            opening_balance: forecasts[0].opening_balance,
            projected_end_balance: forecasts[forecasts.length - 1].closing_balance,
            min_balance: minBalance === Infinity ? 0 : minBalance,
            min_balance_date: minBalanceDate,
            days_negative: daysNegative,
            total_inflows: totalInflows,
            total_outflows: totalOutflows,
            net_flow: totalInflows - totalOutflows,
            daily_average_net: (totalInflows - totalOutflows) / forecasts.length,
            has_liquidity_risk: daysNegative > 0 || minBalance < 0
        };
    }

    /**
     * Comparar escenarios
     */
    async compareScenarios(companyId, days = 30) {
        const scenarios = ['optimistic', 'base', 'pessimistic'];
        const results = {};

        for (const scenario of scenarios) {
            const forecast = await this.generateForecast(companyId, days, scenario);
            results[scenario] = forecast.summary;
        }

        return results;
    }

    /**
     * Obtener alertas de liquidez
     */
    async getLiquidityAlerts(companyId, days = 30) {
        const forecast = await db.FinanceCashFlowForecast.getForecast(
            companyId,
            new Date(),
            new Date(Date.now() + days * 24 * 60 * 60 * 1000),
            'daily',
            'base'
        );

        const alerts = [];

        for (const f of forecast) {
            const balance = parseFloat(f.closing_balance) || 0;

            if (balance < 0) {
                alerts.push({
                    type: 'critical',
                    date: f.forecast_date,
                    message: `Saldo negativo proyectado: ${balance.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}`,
                    action: 'Considerar financiamiento o postergar pagos'
                });
            } else if (balance < 50000) { // Umbral configurable
                alerts.push({
                    type: 'warning',
                    date: f.forecast_date,
                    message: `Saldo bajo proyectado: ${balance.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}`,
                    action: 'Revisar cobranzas y optimizar gastos'
                });
            }
        }

        return alerts;
    }

    /**
     * Dashboard de tesorería
     */
    async getTreasuryDashboard(companyId) {
        const bankDashboard = await db.FinanceBankAccount.getDashboard(companyId);
        const cashFlowDashboard = await db.FinanceCashFlowForecast.getDashboard(companyId, 30);
        const alerts = await this.getLiquidityAlerts(companyId, 30);

        // KPIs adicionales
        const dso = await this.calculateDSO(companyId);
        const dpo = await this.calculateDPO(companyId);

        return {
            bank_accounts: bankDashboard,
            cash_flow: cashFlowDashboard,
            alerts,
            kpis: {
                dso,
                dpo,
                cash_conversion_cycle: dso - dpo
            }
        };
    }

    /**
     * Calcular DSO (Days Sales Outstanding)
     */
    async calculateDSO(companyId) {
        // Placeholder - requiere integración con cuentas por cobrar
        return 30;
    }

    /**
     * Calcular DPO (Days Payable Outstanding)
     */
    async calculateDPO(companyId) {
        // Placeholder - requiere integración con cuentas por pagar
        return 45;
    }
}

module.exports = new FinanceCashFlowService();
