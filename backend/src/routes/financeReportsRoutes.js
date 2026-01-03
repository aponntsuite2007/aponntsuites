/**
 * Finance Enterprise SSOT - Reportes Contables
 * Rutas para Balance Sheet, Income Statement, Cash Flow Statement, Trial Balance
 */

const express = require('express');
const router = express.Router();
const db = require('../config/database');
const FinanceReportingService = require('../services/FinanceReportingService');
const { auth } = require('../middleware/auth');

// =============================================
// BALANCE GENERAL
// =============================================

/**
 * GET /api/finance/reports/balance-sheet
 * Balance General / Estado de Situación Patrimonial
 */
router.get('/balance-sheet', auth, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const { date, comparative_date, show_accounts = 'true', level = 4 } = req.query;

        if (!date) {
            return res.status(400).json({
                success: false,
                error: 'date es requerido (formato: YYYY-MM-DD)'
            });
        }

        const options = {
            comparative_date: comparative_date ? new Date(comparative_date) : null,
            show_accounts: show_accounts === 'true',
            level: parseInt(level)
        };

        const balanceSheet = await FinanceReportingService.getBalanceSheet(
            companyId,
            new Date(date),
            options
        );

        res.json({
            success: true,
            data: balanceSheet
        });
    } catch (error) {
        console.error('Error getting balance sheet:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// =============================================
// ESTADO DE RESULTADOS
// =============================================

/**
 * GET /api/finance/reports/income-statement
 * Estado de Resultados
 */
router.get('/income-statement', auth, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const { start_date, end_date, group_by = 'account', cost_center_id, show_ytd = 'true' } = req.query;

        if (!start_date || !end_date) {
            return res.status(400).json({
                success: false,
                error: 'start_date y end_date son requeridos'
            });
        }

        const options = {
            group_by, // 'account', 'cost_center', 'dimension'
            cost_center_id: cost_center_id ? parseInt(cost_center_id) : null,
            show_ytd: show_ytd === 'true'
        };

        const incomeStatement = await FinanceReportingService.getIncomeStatement(
            companyId,
            new Date(start_date),
            new Date(end_date),
            options
        );

        res.json({
            success: true,
            data: incomeStatement
        });
    } catch (error) {
        console.error('Error getting income statement:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// =============================================
// ESTADO DE FLUJO DE EFECTIVO
// =============================================

/**
 * GET /api/finance/reports/cash-flow-statement
 * Estado de Flujo de Efectivo
 */
router.get('/cash-flow-statement', auth, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const { start_date, end_date, method = 'indirect' } = req.query;

        if (!start_date || !end_date) {
            return res.status(400).json({
                success: false,
                error: 'start_date y end_date son requeridos'
            });
        }

        const cashFlowStatement = await FinanceReportingService.getCashFlowStatement(
            companyId,
            new Date(start_date),
            new Date(end_date),
            { method } // 'direct' or 'indirect'
        );

        res.json({
            success: true,
            data: cashFlowStatement
        });
    } catch (error) {
        console.error('Error getting cash flow statement:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// =============================================
// BALANCE DE COMPROBACIÓN
// =============================================

/**
 * GET /api/finance/reports/trial-balance
 * Balance de Comprobación / Balance de Sumas y Saldos
 */
router.get('/trial-balance', auth, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const { fiscal_year, fiscal_period, level = 4, show_zero = 'false' } = req.query;

        if (!fiscal_year) {
            return res.status(400).json({
                success: false,
                error: 'fiscal_year es requerido'
            });
        }

        const options = {
            level: parseInt(level),
            show_zero: show_zero === 'true'
        };

        const trialBalance = await FinanceReportingService.getTrialBalance(
            companyId,
            parseInt(fiscal_year),
            fiscal_period ? parseInt(fiscal_period) : null,
            options
        );

        res.json({
            success: true,
            data: trialBalance
        });
    } catch (error) {
        console.error('Error getting trial balance:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// =============================================
// MAYOR DE CUENTA
// =============================================

/**
 * GET /api/finance/reports/account-ledger/:accountId
 * Mayor de una cuenta específica
 */
router.get('/account-ledger/:accountId', auth, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const { accountId } = req.params;
        const { start_date, end_date, limit = 500, offset = 0 } = req.query;

        if (!start_date || !end_date) {
            return res.status(400).json({
                success: false,
                error: 'start_date y end_date son requeridos'
            });
        }

        // Verificar que la cuenta pertenece a la empresa
        const account = await db.FinanceChartOfAccounts.findOne({
            where: { id: accountId, company_id: companyId }
        });

        if (!account) {
            return res.status(404).json({
                success: false,
                error: 'Cuenta no encontrada'
            });
        }

        const ledger = await FinanceReportingService.getAccountLedger(
            companyId,
            parseInt(accountId),
            new Date(start_date),
            new Date(end_date),
            { limit: parseInt(limit), offset: parseInt(offset) }
        );

        res.json({
            success: true,
            data: ledger
        });
    } catch (error) {
        console.error('Error getting account ledger:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// =============================================
// REPORTE POR CENTRO DE COSTO
// =============================================

/**
 * GET /api/finance/reports/cost-center/:costCenterId
 * Reporte por Centro de Costo
 */
router.get('/cost-center/:costCenterId', auth, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const { costCenterId } = req.params;
        const { start_date, end_date, include_children = 'true' } = req.query;

        if (!start_date || !end_date) {
            return res.status(400).json({
                success: false,
                error: 'start_date y end_date son requeridos'
            });
        }

        // Verificar que el centro de costo pertenece a la empresa
        const costCenter = await db.FinanceCostCenter.findOne({
            where: { id: costCenterId, company_id: companyId }
        });

        if (!costCenter) {
            return res.status(404).json({
                success: false,
                error: 'Centro de costo no encontrado'
            });
        }

        const report = await FinanceReportingService.getCostCenterReport(
            companyId,
            parseInt(costCenterId),
            new Date(start_date),
            new Date(end_date),
            { include_children: include_children === 'true' }
        );

        res.json({
            success: true,
            data: report
        });
    } catch (error) {
        console.error('Error getting cost center report:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// =============================================
// ANÁLISIS DE VARIACIONES
// =============================================

/**
 * GET /api/finance/reports/variance-analysis
 * Análisis de Variaciones (Real vs Presupuesto)
 */
router.get('/variance-analysis', auth, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const { budget_id, period, level = 3, threshold = 5 } = req.query;

        if (!budget_id) {
            return res.status(400).json({
                success: false,
                error: 'budget_id es requerido'
            });
        }

        // Verificar que el presupuesto pertenece a la empresa
        const budget = await db.FinanceBudget.findOne({
            where: { id: budget_id, company_id: companyId }
        });

        if (!budget) {
            return res.status(404).json({
                success: false,
                error: 'Presupuesto no encontrado'
            });
        }

        const analysis = await FinanceReportingService.getVarianceAnalysis(
            companyId,
            parseInt(budget_id),
            period ? parseInt(period) : null,
            { level: parseInt(level), threshold: parseFloat(threshold) }
        );

        res.json({
            success: true,
            data: analysis
        });
    } catch (error) {
        console.error('Error getting variance analysis:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// =============================================
// ANÁLISIS DIMENSIONAL
// =============================================

/**
 * GET /api/finance/reports/dimensional-analysis
 * Análisis por Dimensiones
 */
router.get('/dimensional-analysis', auth, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const { start_date, end_date, group_by, dimension_number } = req.query;

        if (!start_date || !end_date) {
            return res.status(400).json({
                success: false,
                error: 'start_date y end_date son requeridos'
            });
        }

        const options = {
            group_by: group_by || 'dimension', // 'dimension', 'account', 'period'
            dimension_number: dimension_number ? parseInt(dimension_number) : null
        };

        const analysis = await FinanceReportingService.getDimensionalAnalysis(
            companyId,
            new Date(start_date),
            new Date(end_date),
            options
        );

        res.json({
            success: true,
            data: analysis
        });
    } catch (error) {
        console.error('Error getting dimensional analysis:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// =============================================
// EXPORTACIÓN DE REPORTES
// =============================================

/**
 * GET /api/finance/reports/export/:reportType
 * Exportar reporte en formato específico
 */
router.get('/export/:reportType', auth, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const { reportType } = req.params;
        const { format = 'xlsx', ...params } = req.query;

        const validTypes = ['balance-sheet', 'income-statement', 'cash-flow', 'trial-balance'];
        if (!validTypes.includes(reportType)) {
            return res.status(400).json({
                success: false,
                error: `Tipo de reporte inválido. Usar: ${validTypes.join(', ')}`
            });
        }

        const validFormats = ['xlsx', 'csv', 'pdf'];
        if (!validFormats.includes(format)) {
            return res.status(400).json({
                success: false,
                error: `Formato inválido. Usar: ${validFormats.join(', ')}`
            });
        }

        // Obtener datos del reporte según tipo
        let reportData;
        switch (reportType) {
            case 'balance-sheet':
                reportData = await FinanceReportingService.getBalanceSheet(
                    companyId,
                    new Date(params.date || new Date()),
                    {}
                );
                break;
            case 'income-statement':
                reportData = await FinanceReportingService.getIncomeStatement(
                    companyId,
                    new Date(params.start_date),
                    new Date(params.end_date),
                    {}
                );
                break;
            case 'trial-balance':
                reportData = await FinanceReportingService.getTrialBalance(
                    companyId,
                    parseInt(params.fiscal_year),
                    params.fiscal_period ? parseInt(params.fiscal_period) : null,
                    {}
                );
                break;
            default:
                return res.status(400).json({
                    success: false,
                    error: 'Tipo de reporte no soportado para exportación'
                });
        }

        // Por ahora retornamos JSON con indicación de formato solicitado
        // La exportación real a XLSX/PDF requeriría bibliotecas adicionales
        res.json({
            success: true,
            message: `Exportación a ${format} solicitada`,
            data: {
                report_type: reportType,
                format,
                generated_at: new Date(),
                content: reportData
            }
        });
    } catch (error) {
        console.error('Error exporting report:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// =============================================
// RATIOS FINANCIEROS
// =============================================

/**
 * GET /api/finance/reports/financial-ratios
 * Ratios Financieros
 */
router.get('/financial-ratios', auth, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const { date } = req.query;

        const ratios = await FinanceReportingService.getFinancialRatios(
            companyId,
            date ? new Date(date) : new Date()
        );

        res.json({
            success: true,
            data: ratios
        });
    } catch (error) {
        console.error('Error getting financial ratios:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// =============================================
// TENDENCIAS
// =============================================

/**
 * GET /api/finance/reports/trends
 * Análisis de Tendencias
 */
router.get('/trends', auth, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const { metric, periods = 12 } = req.query;

        const validMetrics = ['revenue', 'expenses', 'net_income', 'cash_position', 'working_capital'];

        if (metric && !validMetrics.includes(metric)) {
            return res.status(400).json({
                success: false,
                error: `Métrica inválida. Usar: ${validMetrics.join(', ')}`
            });
        }

        const trends = await FinanceReportingService.getTrends(
            companyId,
            metric || null,
            parseInt(periods)
        );

        res.json({
            success: true,
            data: trends
        });
    } catch (error) {
        console.error('Error getting trends:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
