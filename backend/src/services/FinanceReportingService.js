/**
 * FinanceReportingService
 * Reportes contables: Balance, Estado de Resultados, Flujo de Efectivo
 * Finance Enterprise SSOT - Sistema Financiero Unificado
 */

const db = require('../config/database');

class FinanceReportingService {
    /**
     * Generar Balance General
     */
    async getBalanceSheet(companyId, date, options = {}) {
        const { includeComparative = false, comparativeDate = null } = options;

        const period = await db.FinanceFiscalPeriod.getByDate(companyId, date);
        if (!period) {
            throw new Error('No existe período fiscal para la fecha');
        }

        const balances = await db.FinanceAccountBalance.getBalances(
            companyId,
            period.fiscal_year,
            period.period_number
        );

        // Agrupar por tipo de cuenta
        const assets = { current: [], non_current: [], total: 0 };
        const liabilities = { current: [], non_current: [], total: 0 };
        const equity = { items: [], total: 0 };

        for (const balance of balances) {
            const account = await db.FinanceChartOfAccounts.findByPk(balance.account_id);
            if (!account) continue;

            const item = {
                account_code: account.account_code,
                account_name: account.name,
                balance: parseFloat(balance.closing_balance) || 0,
                is_header: account.is_header
            };

            switch (account.account_type) {
                case 'asset':
                    if (account.bs_category?.includes('current')) {
                        assets.current.push(item);
                    } else {
                        assets.non_current.push(item);
                    }
                    if (!account.is_header) {
                        assets.total += item.balance;
                    }
                    break;

                case 'liability':
                    if (account.bs_category?.includes('current')) {
                        liabilities.current.push(item);
                    } else {
                        liabilities.non_current.push(item);
                    }
                    if (!account.is_header) {
                        liabilities.total += item.balance;
                    }
                    break;

                case 'equity':
                    equity.items.push(item);
                    if (!account.is_header) {
                        equity.total += item.balance;
                    }
                    break;
            }
        }

        const report = {
            company_id: companyId,
            report_type: 'balance_sheet',
            as_of_date: date,
            fiscal_year: period.fiscal_year,
            fiscal_period: period.period_number,
            assets,
            liabilities,
            equity,
            total_assets: assets.total,
            total_liabilities_equity: liabilities.total + equity.total,
            is_balanced: Math.abs(assets.total - (liabilities.total + equity.total)) < 0.01
        };

        // Agregar comparativo si se solicita
        if (includeComparative && comparativeDate) {
            report.comparative = await this.getBalanceSheet(companyId, comparativeDate, { includeComparative: false });
        }

        return report;
    }

    /**
     * Generar Estado de Resultados
     */
    async getIncomeStatement(companyId, startDate, endDate, options = {}) {
        const { includeComparative = false, comparativeStartDate = null, comparativeEndDate = null } = options;

        const startPeriod = await db.FinanceFiscalPeriod.getByDate(companyId, startDate);
        const endPeriod = await db.FinanceFiscalPeriod.getByDate(companyId, endDate);

        if (!startPeriod || !endPeriod) {
            throw new Error('No existe período fiscal para las fechas');
        }

        // Obtener movimientos del período
        const { Op } = db.Sequelize;
        const lines = await db.FinanceJournalEntryLine.findAll({
            include: [{
                model: db.FinanceJournalEntry,
                as: 'entry',
                where: {
                    company_id: companyId,
                    fiscal_year: startPeriod.fiscal_year,
                    fiscal_period: {
                        [Op.between]: [startPeriod.period_number, endPeriod.period_number]
                    },
                    status: 'posted'
                }
            }, {
                model: db.FinanceChartOfAccounts,
                as: 'account',
                where: {
                    account_type: { [Op.in]: ['revenue', 'expense'] }
                }
            }]
        });

        // Agrupar por cuenta
        const accountTotals = {};
        for (const line of lines) {
            const accountId = line.account_id;
            if (!accountTotals[accountId]) {
                accountTotals[accountId] = {
                    account: line.account,
                    debit: 0,
                    credit: 0
                };
            }
            accountTotals[accountId].debit += parseFloat(line.debit_amount) || 0;
            accountTotals[accountId].credit += parseFloat(line.credit_amount) || 0;
        }

        // Construir reporte
        const revenue = { items: [], total: 0 };
        const costOfSales = { items: [], total: 0 };
        const operatingExpenses = { items: [], total: 0 };
        const otherIncome = { items: [], total: 0 };
        const otherExpenses = { items: [], total: 0 };
        const financialItems = { items: [], total: 0 };

        for (const [accountId, data] of Object.entries(accountTotals)) {
            const account = data.account;
            const net = account.account_nature === 'credit'
                ? data.credit - data.debit
                : data.debit - data.credit;

            const item = {
                account_code: account.account_code,
                account_name: account.name,
                amount: Math.abs(net)
            };

            // Clasificar según is_category
            if (account.account_type === 'revenue') {
                if (account.is_category === 'operating_revenue') {
                    revenue.items.push(item);
                    revenue.total += Math.abs(net);
                } else {
                    otherIncome.items.push(item);
                    otherIncome.total += Math.abs(net);
                }
            } else if (account.account_type === 'expense') {
                if (account.is_category === 'cost_of_sales') {
                    costOfSales.items.push(item);
                    costOfSales.total += Math.abs(net);
                } else if (account.is_category === 'operating_expense') {
                    operatingExpenses.items.push(item);
                    operatingExpenses.total += Math.abs(net);
                } else if (account.is_category === 'financial') {
                    financialItems.items.push(item);
                    financialItems.total += Math.abs(net);
                } else {
                    otherExpenses.items.push(item);
                    otherExpenses.total += Math.abs(net);
                }
            }
        }

        const grossProfit = revenue.total - costOfSales.total;
        const operatingIncome = grossProfit - operatingExpenses.total;
        const incomeBeforeTax = operatingIncome + otherIncome.total - otherExpenses.total - financialItems.total;
        const netIncome = incomeBeforeTax; // Tax calculation would go here

        const report = {
            company_id: companyId,
            report_type: 'income_statement',
            period_start: startDate,
            period_end: endDate,
            fiscal_year: startPeriod.fiscal_year,
            revenue,
            cost_of_sales: costOfSales,
            gross_profit: grossProfit,
            gross_margin_percent: revenue.total !== 0 ? (grossProfit / revenue.total) * 100 : 0,
            operating_expenses: operatingExpenses,
            operating_income: operatingIncome,
            operating_margin_percent: revenue.total !== 0 ? (operatingIncome / revenue.total) * 100 : 0,
            other_income: otherIncome,
            other_expenses: otherExpenses,
            financial_items: financialItems,
            income_before_tax: incomeBeforeTax,
            net_income: netIncome,
            net_margin_percent: revenue.total !== 0 ? (netIncome / revenue.total) * 100 : 0
        };

        if (includeComparative && comparativeStartDate && comparativeEndDate) {
            report.comparative = await this.getIncomeStatement(companyId, comparativeStartDate, comparativeEndDate, { includeComparative: false });
        }

        return report;
    }

    /**
     * Generar Estado de Flujo de Efectivo (método indirecto)
     */
    async getCashFlowStatement(companyId, startDate, endDate) {
        const startPeriod = await db.FinanceFiscalPeriod.getByDate(companyId, startDate);
        const endPeriod = await db.FinanceFiscalPeriod.getByDate(companyId, endDate);

        if (!startPeriod || !endPeriod) {
            throw new Error('No existe período fiscal para las fechas');
        }

        // Obtener resultado neto del estado de resultados
        const incomeStatement = await this.getIncomeStatement(companyId, startDate, endDate);
        const netIncome = incomeStatement.net_income;

        // Actividades de operación
        const operatingActivities = {
            net_income: netIncome,
            adjustments: [],
            changes_in_working_capital: [],
            net_cash_from_operations: netIncome
        };

        // Actividades de inversión
        const investingActivities = {
            items: [],
            net_cash_from_investing: 0
        };

        // Actividades de financiamiento
        const financingActivities = {
            items: [],
            net_cash_from_financing: 0
        };

        // Obtener cambios en cuentas de balance
        const { Op } = db.Sequelize;
        const lines = await db.FinanceJournalEntryLine.findAll({
            include: [{
                model: db.FinanceJournalEntry,
                as: 'entry',
                where: {
                    company_id: companyId,
                    fiscal_year: startPeriod.fiscal_year,
                    fiscal_period: { [Op.between]: [startPeriod.period_number, endPeriod.period_number] },
                    status: 'posted'
                }
            }, {
                model: db.FinanceChartOfAccounts,
                as: 'account'
            }]
        });

        // Agrupar por categoría de flujo de caja
        for (const line of lines) {
            const account = line.account;
            if (!account?.cf_category) continue;

            const net = (parseFloat(line.debit_amount) || 0) - (parseFloat(line.credit_amount) || 0);
            if (net === 0) continue;

            const item = {
                account_code: account.account_code,
                account_name: account.name,
                amount: net
            };

            switch (account.cf_category) {
                case 'operating':
                    operatingActivities.changes_in_working_capital.push(item);
                    operatingActivities.net_cash_from_operations += net;
                    break;
                case 'investing':
                    investingActivities.items.push(item);
                    investingActivities.net_cash_from_investing += net;
                    break;
                case 'financing':
                    financingActivities.items.push(item);
                    financingActivities.net_cash_from_financing += net;
                    break;
            }
        }

        // Obtener saldos de caja inicial y final
        const cashAccounts = await db.FinanceChartOfAccounts.findAll({
            where: {
                company_id: companyId,
                account_code: { [Op.like]: '1101%' },
                is_header: false
            }
        });

        let beginningCash = 0;
        let endingCash = 0;

        for (const account of cashAccounts) {
            const startBalance = await db.FinanceAccountBalance.getBalance(companyId, account.id, startPeriod.fiscal_year, startPeriod.period_number - 1);
            const endBalance = await db.FinanceAccountBalance.getBalance(companyId, account.id, endPeriod.fiscal_year, endPeriod.period_number);

            beginningCash += parseFloat(startBalance?.closing_balance) || 0;
            endingCash += parseFloat(endBalance?.closing_balance) || 0;
        }

        const netChangeInCash = operatingActivities.net_cash_from_operations +
            investingActivities.net_cash_from_investing +
            financingActivities.net_cash_from_financing;

        return {
            company_id: companyId,
            report_type: 'cash_flow_statement',
            period_start: startDate,
            period_end: endDate,
            fiscal_year: startPeriod.fiscal_year,
            operating_activities: operatingActivities,
            investing_activities: investingActivities,
            financing_activities: financingActivities,
            net_change_in_cash: netChangeInCash,
            beginning_cash: beginningCash,
            ending_cash: endingCash,
            reconciliation_check: Math.abs(endingCash - beginningCash - netChangeInCash) < 0.01
        };
    }

    /**
     * Generar Balance de Sumas y Saldos
     */
    async getTrialBalance(companyId, fiscalYear, fiscalPeriod) {
        return db.FinanceAccountBalance.getTrialBalance(companyId, fiscalYear, fiscalPeriod);
    }

    /**
     * Generar Mayor de una cuenta
     */
    async getAccountLedger(companyId, accountId, startDate, endDate) {
        const entries = await db.FinanceJournalEntry.getByAccount(companyId, accountId, startDate, endDate);

        const ledger = [];
        let runningBalance = 0;

        // Obtener saldo inicial
        const account = await db.FinanceChartOfAccounts.findByPk(accountId);
        const startPeriod = await db.FinanceFiscalPeriod.getByDate(companyId, startDate);
        if (startPeriod) {
            const initialBalance = await db.FinanceAccountBalance.getBalance(
                companyId, accountId, startPeriod.fiscal_year, startPeriod.period_number - 1
            );
            runningBalance = parseFloat(initialBalance?.closing_balance) || 0;
        }

        ledger.push({
            date: startDate,
            entry_number: 'SALDO INICIAL',
            description: 'Saldo anterior',
            debit: account?.account_nature === 'debit' ? runningBalance : 0,
            credit: account?.account_nature === 'credit' ? runningBalance : 0,
            balance: runningBalance
        });

        for (const entry of entries) {
            for (const line of entry.lines || []) {
                const debit = parseFloat(line.debit_amount) || 0;
                const credit = parseFloat(line.credit_amount) || 0;

                if (account?.account_nature === 'debit') {
                    runningBalance += debit - credit;
                } else {
                    runningBalance += credit - debit;
                }

                ledger.push({
                    date: entry.entry_date,
                    entry_number: entry.entry_number,
                    description: line.description || entry.description,
                    debit,
                    credit,
                    balance: runningBalance
                });
            }
        }

        return {
            company_id: companyId,
            account_id: accountId,
            account_code: account?.account_code,
            account_name: account?.name,
            period_start: startDate,
            period_end: endDate,
            entries: ledger,
            final_balance: runningBalance
        };
    }

    /**
     * Reporte por Centro de Costo
     */
    async getCostCenterReport(companyId, costCenterId, startDate, endDate) {
        const { Op } = db.Sequelize;
        const startPeriod = await db.FinanceFiscalPeriod.getByDate(companyId, startDate);
        const endPeriod = await db.FinanceFiscalPeriod.getByDate(companyId, endDate);

        const lines = await db.FinanceJournalEntryLine.findAll({
            where: { cost_center_id: costCenterId },
            include: [{
                model: db.FinanceJournalEntry,
                as: 'entry',
                where: {
                    company_id: companyId,
                    fiscal_year: startPeriod.fiscal_year,
                    fiscal_period: { [Op.between]: [startPeriod.period_number, endPeriod.period_number] },
                    status: 'posted'
                }
            }, {
                model: db.FinanceChartOfAccounts,
                as: 'account'
            }]
        });

        // Agrupar por cuenta
        const byAccount = {};
        for (const line of lines) {
            const key = line.account_id;
            if (!byAccount[key]) {
                byAccount[key] = {
                    account_code: line.account?.account_code,
                    account_name: line.account?.name,
                    account_type: line.account?.account_type,
                    debit: 0,
                    credit: 0,
                    net: 0
                };
            }
            byAccount[key].debit += parseFloat(line.debit_amount) || 0;
            byAccount[key].credit += parseFloat(line.credit_amount) || 0;
        }

        // Calcular netos
        let totalRevenue = 0;
        let totalExpense = 0;

        for (const [key, data] of Object.entries(byAccount)) {
            data.net = data.debit - data.credit;
            if (data.account_type === 'revenue') {
                totalRevenue += Math.abs(data.net);
            } else if (data.account_type === 'expense') {
                totalExpense += Math.abs(data.net);
            }
        }

        const costCenter = await db.FinanceCostCenter.findByPk(costCenterId);

        return {
            company_id: companyId,
            cost_center_id: costCenterId,
            cost_center_code: costCenter?.code,
            cost_center_name: costCenter?.name,
            period_start: startDate,
            period_end: endDate,
            accounts: Object.values(byAccount),
            total_revenue: totalRevenue,
            total_expense: totalExpense,
            net_result: totalRevenue - totalExpense
        };
    }
}

module.exports = new FinanceReportingService();
