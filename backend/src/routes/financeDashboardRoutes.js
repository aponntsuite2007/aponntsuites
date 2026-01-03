/**
 * Finance Enterprise SSOT - Dashboard OLAP
 * Rutas para KPIs, métricas y dashboard financiero
 */

const express = require('express');
const router = express.Router();
const db = require('../config/database');
const FinanceKPIService = require('../services/FinanceKPIService');
const FinanceBudgetService = require('../services/FinanceBudgetService');
const FinanceCashFlowService = require('../services/FinanceCashFlowService');
const { auth } = require('../middleware/auth');

// =============================================
// DASHBOARD PRINCIPAL
// =============================================

/**
 * GET /api/finance/dashboard
 * Dashboard financiero completo
 */
router.get('/', auth, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const { fiscal_year, fiscal_period } = req.query;

        // Obtener todos los KPIs
        const kpis = await FinanceKPIService.getDashboardKPIs(
            companyId,
            fiscal_year ? parseInt(fiscal_year) : null,
            fiscal_period ? parseInt(fiscal_period) : null
        );

        res.json({
            success: true,
            data: kpis
        });
    } catch (error) {
        console.error('Error getting finance dashboard:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// =============================================
// KPIs POR CATEGORÍA
// =============================================

/**
 * GET /api/finance/dashboard/kpis/liquidity
 * KPIs de Liquidez
 */
router.get('/kpis/liquidity', auth, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const { fiscal_year, fiscal_period } = req.query;

        const kpis = await FinanceKPIService.getLiquidityKPIs(
            companyId,
            fiscal_year ? parseInt(fiscal_year) : new Date().getFullYear(),
            fiscal_period ? parseInt(fiscal_period) : null
        );

        res.json({
            success: true,
            data: kpis
        });
    } catch (error) {
        console.error('Error getting liquidity KPIs:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/finance/dashboard/kpis/profitability
 * KPIs de Rentabilidad
 */
router.get('/kpis/profitability', auth, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const { fiscal_year, fiscal_period } = req.query;

        const kpis = await FinanceKPIService.getProfitabilityKPIs(
            companyId,
            fiscal_year ? parseInt(fiscal_year) : new Date().getFullYear(),
            fiscal_period ? parseInt(fiscal_period) : null
        );

        res.json({
            success: true,
            data: kpis
        });
    } catch (error) {
        console.error('Error getting profitability KPIs:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/finance/dashboard/kpis/budget
 * KPIs de Presupuesto
 */
router.get('/kpis/budget', auth, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const { fiscal_year, fiscal_period } = req.query;

        const kpis = await FinanceKPIService.getBudgetKPIs(
            companyId,
            fiscal_year ? parseInt(fiscal_year) : new Date().getFullYear(),
            fiscal_period ? parseInt(fiscal_period) : null
        );

        res.json({
            success: true,
            data: kpis
        });
    } catch (error) {
        console.error('Error getting budget KPIs:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/finance/dashboard/kpis/cash-flow
 * KPIs de Flujo de Caja
 */
router.get('/kpis/cash-flow', auth, async (req, res) => {
    try {
        const companyId = req.user.company_id;

        const kpis = await FinanceKPIService.getCashFlowKPIs(companyId);

        res.json({
            success: true,
            data: kpis
        });
    } catch (error) {
        console.error('Error getting cash flow KPIs:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/finance/dashboard/kpis/operational
 * KPIs Operacionales (DSO, DPO, etc.)
 */
router.get('/kpis/operational', auth, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const { fiscal_year, fiscal_period } = req.query;

        const kpis = await FinanceKPIService.getOperationalKPIs(
            companyId,
            fiscal_year ? parseInt(fiscal_year) : new Date().getFullYear(),
            fiscal_period ? parseInt(fiscal_period) : null
        );

        res.json({
            success: true,
            data: kpis
        });
    } catch (error) {
        console.error('Error getting operational KPIs:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// =============================================
// PROYECCIONES PREDICTIVAS
// =============================================

/**
 * GET /api/finance/dashboard/projections/year-end
 * Proyección de fin de año
 */
router.get('/projections/year-end', auth, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const { fiscal_year } = req.query;

        const projection = await FinanceKPIService.getYearEndProjection(
            companyId,
            fiscal_year ? parseInt(fiscal_year) : new Date().getFullYear()
        );

        res.json({
            success: true,
            data: projection
        });
    } catch (error) {
        console.error('Error getting year end projection:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/finance/dashboard/projections/cash-flow
 * Proyección de flujo de caja
 */
router.get('/projections/cash-flow', auth, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const { days = 30 } = req.query;

        const projection = await FinanceCashFlowService.getTreasuryDashboard(companyId);

        res.json({
            success: true,
            data: projection
        });
    } catch (error) {
        console.error('Error getting cash flow projection:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/finance/dashboard/projections/budget
 * Proyección de ejecución presupuestaria
 */
router.get('/projections/budget', auth, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const { fiscal_year } = req.query;

        // Obtener presupuesto activo
        const year = fiscal_year ? parseInt(fiscal_year) : new Date().getFullYear();
        const budget = await db.FinanceBudget.getActive(companyId, year);

        if (!budget) {
            return res.json({
                success: true,
                data: {
                    has_budget: false,
                    message: 'No hay presupuesto activo para el año'
                }
            });
        }

        const projection = await FinanceBudgetService.getYearEndProjection(budget.id);

        res.json({
            success: true,
            data: {
                has_budget: true,
                budget_id: budget.id,
                budget_name: budget.name,
                ...projection
            }
        });
    } catch (error) {
        console.error('Error getting budget projection:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// =============================================
// ALERTAS Y ANOMALÍAS
// =============================================

/**
 * GET /api/finance/dashboard/alerts
 * Alertas financieras
 */
router.get('/alerts', auth, async (req, res) => {
    try {
        const companyId = req.user.company_id;

        const alerts = [];

        // 1. Alertas de liquidez
        const liquidityAlerts = await FinanceCashFlowService.getLiquidityAlerts(companyId, 30);
        alerts.push(...liquidityAlerts.map(a => ({ ...a, category: 'liquidity' })));

        // 2. Alertas de presupuesto (si hay presupuesto activo)
        const year = new Date().getFullYear();
        const budget = await db.FinanceBudget.getActive(companyId, year);

        if (budget) {
            const budgetKPIs = await FinanceKPIService.getBudgetKPIs(companyId, year, null);

            if (budgetKPIs.has_budget) {
                // Alerta si ejecución > 110%
                if (budgetKPIs.budget_vs_actual?.value > 110) {
                    alerts.push({
                        type: 'critical',
                        category: 'budget',
                        message: `Ejecución presupuestaria al ${budgetKPIs.budget_vs_actual.value.toFixed(1)}%`,
                        action: 'Revisar gastos y ajustar proyecciones'
                    });
                }

                // Alertas de items sobre presupuesto
                if (budgetKPIs.top_variances && budgetKPIs.top_variances.length > 0) {
                    for (const variance of budgetKPIs.top_variances.slice(0, 3)) {
                        if (variance.variance_percent > 20) {
                            alerts.push({
                                type: 'warning',
                                category: 'budget',
                                message: `Cuenta ${variance.account_id} excede presupuesto en ${variance.variance_percent.toFixed(1)}%`,
                                variance_amount: variance.variance_amount
                            });
                        }
                    }
                }
            }
        }

        // 3. Alertas de conciliación
        const pendingTransactions = await db.FinanceBankTransaction.count({
            where: {
                company_id: companyId,
                is_reconciled: false,
                status: 'confirmed'
            }
        });

        if (pendingTransactions > 50) {
            alerts.push({
                type: 'warning',
                category: 'reconciliation',
                message: `${pendingTransactions} transacciones bancarias pendientes de conciliar`,
                action: 'Ejecutar conciliación automática o manual'
            });
        }

        // Ordenar por tipo (critical primero)
        const typeOrder = { critical: 0, warning: 1, info: 2 };
        alerts.sort((a, b) => typeOrder[a.type] - typeOrder[b.type]);

        res.json({
            success: true,
            data: alerts,
            count: alerts.length
        });
    } catch (error) {
        console.error('Error getting alerts:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// =============================================
// WIDGETS ESPECÍFICOS
// =============================================

/**
 * GET /api/finance/dashboard/widgets/revenue-expense
 * Widget de Ingresos vs Gastos
 */
router.get('/widgets/revenue-expense', auth, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const { periods = 6 } = req.query;

        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth() + 1;

        const data = [];

        for (let i = parseInt(periods) - 1; i >= 0; i--) {
            let targetMonth = currentMonth - i;
            let targetYear = currentYear;

            if (targetMonth <= 0) {
                targetMonth += 12;
                targetYear -= 1;
            }

            const profitability = await FinanceKPIService.getProfitabilityKPIs(
                companyId,
                targetYear,
                targetMonth
            );

            data.push({
                period: `${targetYear}-${targetMonth.toString().padStart(2, '0')}`,
                year: targetYear,
                month: targetMonth,
                revenue: profitability.revenue,
                expenses: profitability.cost_of_sales + profitability.operating_expenses,
                net_income: profitability.net_income
            });
        }

        res.json({
            success: true,
            data
        });
    } catch (error) {
        console.error('Error getting revenue-expense widget:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/finance/dashboard/widgets/budget-gauge
 * Widget de Gauge de Presupuesto
 */
router.get('/widgets/budget-gauge', auth, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const { fiscal_year } = req.query;

        const year = fiscal_year ? parseInt(fiscal_year) : new Date().getFullYear();
        const budget = await db.FinanceBudget.getActive(companyId, year);

        if (!budget) {
            return res.json({
                success: true,
                data: {
                    has_data: false,
                    message: 'No hay presupuesto activo'
                }
            });
        }

        const execution = await FinanceBudgetService.getBudgetVsActual(budget.id, null);

        res.json({
            success: true,
            data: {
                has_data: true,
                budget_name: budget.name,
                ...execution.summary,
                gauge: {
                    value: execution.summary.overall_execution_percent,
                    min: 0,
                    max: 150,
                    thresholds: {
                        success: [0, 100],
                        warning: [100, 110],
                        danger: [110, 150]
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error getting budget gauge:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/finance/dashboard/widgets/cash-position
 * Widget de Posición de Caja
 */
router.get('/widgets/cash-position', auth, async (req, res) => {
    try {
        const companyId = req.user.company_id;

        const bankDashboard = await db.FinanceBankAccount.getDashboard(companyId);

        res.json({
            success: true,
            data: {
                total_accounts: bankDashboard.total_accounts,
                total_balance: bankDashboard.total_balance,
                by_currency: bankDashboard.by_currency,
                by_account: bankDashboard.accounts
            }
        });
    } catch (error) {
        console.error('Error getting cash position:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/finance/dashboard/widgets/top-expenses
 * Widget de Top Gastos
 */
router.get('/widgets/top-expenses', auth, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const { limit = 10, fiscal_year, fiscal_period } = req.query;

        const year = fiscal_year ? parseInt(fiscal_year) : new Date().getFullYear();
        const period = fiscal_period ? parseInt(fiscal_period) : null;

        // Obtener cuentas de gasto con mayores saldos
        const expenses = await db.FinanceAccountBalance.findAll({
            where: {
                company_id: companyId,
                fiscal_year: year,
                ...(period ? { fiscal_period: period } : {})
            },
            include: [{
                model: db.FinanceChartOfAccounts,
                as: 'account',
                where: { account_type: 'expense' },
                attributes: ['id', 'account_code', 'name']
            }],
            order: [[db.Sequelize.literal('period_debit - period_credit'), 'DESC']],
            limit: parseInt(limit)
        });

        const data = expenses.map(e => ({
            account_id: e.account_id,
            account_code: e.account?.account_code,
            account_name: e.account?.name,
            amount: (parseFloat(e.period_debit) || 0) - (parseFloat(e.period_credit) || 0)
        }));

        res.json({
            success: true,
            data
        });
    } catch (error) {
        console.error('Error getting top expenses:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/finance/dashboard/widgets/ratios-summary
 * Widget de Resumen de Ratios
 */
router.get('/widgets/ratios-summary', auth, async (req, res) => {
    try {
        const companyId = req.user.company_id;

        const [liquidity, operational] = await Promise.all([
            FinanceKPIService.getLiquidityKPIs(companyId, new Date().getFullYear(), null),
            FinanceKPIService.getOperationalKPIs(companyId, new Date().getFullYear(), null)
        ]);

        res.json({
            success: true,
            data: {
                current_ratio: liquidity.current_ratio,
                quick_ratio: liquidity.quick_ratio,
                cash_ratio: liquidity.cash_ratio,
                dso: operational.dso,
                dpo: operational.dpo,
                cash_conversion_cycle: operational.cash_conversion_cycle
            }
        });
    } catch (error) {
        console.error('Error getting ratios summary:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
