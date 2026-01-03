/**
 * Finance Enterprise SSOT - Router Principal
 * Consolidador de todas las rutas financieras
 */

const express = require('express');
const router = express.Router();

// Importar sub-routers
const accountsRoutes = require('./financeAccountsRoutes');
const budgetRoutes = require('./financeBudgetRoutes');
const treasuryRoutes = require('./financeTreasuryRoutes');
const reportsRoutes = require('./financeReportsRoutes');
const dashboardRoutes = require('./financeDashboardRoutes');

// Servicios
const FinanceModuleIntegration = require('../services/FinanceModuleIntegration');
const db = require('../config/database');

// Middleware de autenticación
const { auth } = require('../middleware/auth');

// =============================================
// RUTAS PRINCIPALES DE FINANCE
// =============================================

/**
 * GET /api/finance/status
 * Estado general del módulo Finance para la empresa
 */
router.get('/status', auth, async (req, res) => {
    try {
        const companyId = req.user.company_id;

        // Verificar estado de integraciones
        const integrationStatus = await FinanceModuleIntegration.getIntegrationStatus(companyId);

        // Verificar si Finance está inicializado
        const accountsCount = await db.FinanceChartOfAccounts.count({
            where: { company_id: companyId }
        });

        const periodsCount = await db.FinanceFiscalPeriod.count({
            where: { company_id: companyId }
        });

        const currentPeriod = await db.FinanceFiscalPeriod.getCurrent(companyId);

        res.json({
            success: true,
            data: {
                is_initialized: accountsCount > 0,
                chart_of_accounts: accountsCount,
                fiscal_periods: periodsCount,
                current_period: currentPeriod ? {
                    year: currentPeriod.fiscal_year,
                    period: currentPeriod.period_number,
                    name: currentPeriod.period_name,
                    status: currentPeriod.status
                } : null,
                integrations: integrationStatus
            }
        });
    } catch (error) {
        console.error('Error getting finance status:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/finance/initialize
 * Inicializar Finance para una empresa (primera vez)
 */
router.post('/initialize', auth, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const userId = req.user.user_id;

        // Verificar si ya está inicializado
        const existingAccounts = await db.FinanceChartOfAccounts.count({
            where: { company_id: companyId }
        });

        if (existingAccounts > 0) {
            return res.status(400).json({
                success: false,
                error: 'Finance ya está inicializado para esta empresa'
            });
        }

        // Inicializar
        const results = await FinanceModuleIntegration.initializeForCompany(companyId, userId);

        res.json({
            success: true,
            message: 'Finance inicializado correctamente',
            data: results
        });
    } catch (error) {
        console.error('Error initializing finance:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/finance/integrations
 * Estado de integraciones con otros módulos
 */
router.get('/integrations', auth, async (req, res) => {
    try {
        const companyId = req.user.company_id;

        const status = await FinanceModuleIntegration.getIntegrationStatus(companyId);
        const autoPostingConfig = await FinanceModuleIntegration.getAutoPostingConfig(companyId);

        res.json({
            success: true,
            data: {
                modules: status,
                auto_posting: autoPostingConfig
            }
        });
    } catch (error) {
        console.error('Error getting integrations:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * PUT /api/finance/integrations/:integration/auto-posting
 * Configurar auto-posting para una integración
 */
router.put('/integrations/:integration/auto-posting', auth, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const { integration } = req.params;
        const { debitAccountId, creditAccountId } = req.body;

        await FinanceModuleIntegration.configureAutoPosting(companyId, integration, {
            debitAccountId,
            creditAccountId
        });

        res.json({
            success: true,
            message: 'Configuración de auto-posting actualizada'
        });
    } catch (error) {
        console.error('Error configuring auto-posting:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/finance/bundles
 * Sugerencias de bundles comerciales
 */
router.get('/bundles', auth, async (req, res) => {
    try {
        const companyId = req.user.company_id;

        const suggestions = await FinanceModuleIntegration.suggestBundles(companyId);

        res.json({
            success: true,
            data: suggestions
        });
    } catch (error) {
        console.error('Error getting bundle suggestions:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/finance/deactivation-impact/:module
 * Analizar impacto de desactivar un módulo
 */
router.get('/deactivation-impact/:module', auth, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const { module } = req.params;

        const impact = await FinanceModuleIntegration.analyzeDeactivationImpact(companyId, module);

        res.json({
            success: true,
            data: impact
        });
    } catch (error) {
        console.error('Error analyzing deactivation impact:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/finance/sync-cost-centers
 * Sincronizar centros de costo con departamentos
 */
router.post('/sync-cost-centers', auth, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const userId = req.user.user_id;

        const results = await FinanceModuleIntegration.syncCostCentersWithDepartments(companyId, userId);

        res.json({
            success: true,
            message: `Sincronización completada: ${results.created} creados, ${results.updated} actualizados`,
            data: results
        });
    } catch (error) {
        console.error('Error syncing cost centers:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// =============================================
// MONTAR SUB-ROUTERS
// =============================================

router.use('/accounts', accountsRoutes);
router.use('/budget', budgetRoutes);
router.use('/treasury', treasuryRoutes);
router.use('/reports', reportsRoutes);
router.use('/dashboard', dashboardRoutes);

module.exports = router;
