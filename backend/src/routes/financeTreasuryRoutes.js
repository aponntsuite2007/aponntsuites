/**
 * Finance Enterprise SSOT - Tesorería
 * Rutas para Bank Accounts, Transactions, Cash Flow, Reconciliation
 */

const express = require('express');
const router = express.Router();
const db = require('../config/database');
const FinanceCashFlowService = require('../services/FinanceCashFlowService');
const FinanceReconciliationService = require('../services/FinanceReconciliationService');
const { auth } = require('../middleware/auth');

// =============================================
// CUENTAS BANCARIAS
// =============================================

/**
 * GET /api/finance/treasury/bank-accounts
 * Listar cuentas bancarias
 */
router.get('/bank-accounts', auth, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const { is_active, currency, account_type } = req.query;

        const where = { company_id: companyId };

        if (is_active !== undefined) where.is_active = is_active === 'true';
        if (currency) where.currency = currency;
        if (account_type) where.account_type = account_type;

        const accounts = await db.FinanceBankAccount.findAll({
            where,
            order: [['is_primary', 'DESC'], ['account_name', 'ASC']]
        });

        res.json({
            success: true,
            data: accounts,
            count: accounts.length
        });
    } catch (error) {
        console.error('Error listing bank accounts:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/finance/treasury/bank-accounts/dashboard
 * Dashboard de cuentas bancarias
 */
router.get('/bank-accounts/dashboard', auth, async (req, res) => {
    try {
        const companyId = req.user.company_id;

        const dashboard = await db.FinanceBankAccount.getDashboard(companyId);

        res.json({
            success: true,
            data: dashboard
        });
    } catch (error) {
        console.error('Error getting bank dashboard:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/finance/treasury/bank-accounts/:id
 * Obtener cuenta bancaria por ID
 */
router.get('/bank-accounts/:id', auth, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const { id } = req.params;

        const account = await db.FinanceBankAccount.findOne({
            where: { id, company_id: companyId }
        });

        if (!account) {
            return res.status(404).json({
                success: false,
                error: 'Cuenta bancaria no encontrada'
            });
        }

        res.json({
            success: true,
            data: account
        });
    } catch (error) {
        console.error('Error getting bank account:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/finance/treasury/bank-accounts
 * Crear cuenta bancaria
 */
router.post('/bank-accounts', auth, async (req, res) => {
    try {
        const companyId = req.user.company_id;

        const accountData = {
            ...req.body,
            company_id: companyId
        };

        const account = await db.FinanceBankAccount.create(accountData);

        res.status(201).json({
            success: true,
            message: 'Cuenta bancaria creada correctamente',
            data: account
        });
    } catch (error) {
        console.error('Error creating bank account:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * PUT /api/finance/treasury/bank-accounts/:id
 * Actualizar cuenta bancaria
 */
router.put('/bank-accounts/:id', auth, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const { id } = req.params;

        const account = await db.FinanceBankAccount.findOne({
            where: { id, company_id: companyId }
        });

        if (!account) {
            return res.status(404).json({
                success: false,
                error: 'Cuenta bancaria no encontrada'
            });
        }

        await account.update(req.body);

        res.json({
            success: true,
            message: 'Cuenta bancaria actualizada correctamente',
            data: account
        });
    } catch (error) {
        console.error('Error updating bank account:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * PUT /api/finance/treasury/bank-accounts/:id/balance
 * Actualizar saldo de cuenta bancaria
 */
router.put('/bank-accounts/:id/balance', auth, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const { id } = req.params;
        const { current_balance, available_balance } = req.body;

        const account = await db.FinanceBankAccount.findOne({
            where: { id, company_id: companyId }
        });

        if (!account) {
            return res.status(404).json({
                success: false,
                error: 'Cuenta bancaria no encontrada'
            });
        }

        await account.updateBalance(current_balance, available_balance);

        res.json({
            success: true,
            message: 'Saldo actualizado correctamente',
            data: account
        });
    } catch (error) {
        console.error('Error updating bank balance:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// =============================================
// TRANSACCIONES BANCARIAS
// =============================================

/**
 * GET /api/finance/treasury/transactions
 * Listar transacciones bancarias
 */
router.get('/transactions', auth, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const { bank_account_id, transaction_type, is_reconciled, start_date, end_date, limit = 100, offset = 0 } = req.query;

        const where = { company_id: companyId };

        if (bank_account_id) where.bank_account_id = parseInt(bank_account_id);
        if (transaction_type) where.transaction_type = transaction_type;
        if (is_reconciled !== undefined) where.is_reconciled = is_reconciled === 'true';

        if (start_date || end_date) {
            const { Op } = db.Sequelize;
            where.transaction_date = {};
            if (start_date) where.transaction_date[Op.gte] = new Date(start_date);
            if (end_date) where.transaction_date[Op.lte] = new Date(end_date);
        }

        const { rows: transactions, count } = await db.FinanceBankTransaction.findAndCountAll({
            where,
            order: [['transaction_date', 'DESC'], ['id', 'DESC']],
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

        res.json({
            success: true,
            data: transactions,
            pagination: {
                total: count,
                limit: parseInt(limit),
                offset: parseInt(offset)
            }
        });
    } catch (error) {
        console.error('Error listing transactions:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/finance/treasury/transactions
 * Registrar transacción bancaria manual
 */
router.post('/transactions', auth, async (req, res) => {
    try {
        const companyId = req.user.company_id;

        // Verificar que la cuenta bancaria pertenece a la empresa
        const bankAccount = await db.FinanceBankAccount.findOne({
            where: { id: req.body.bank_account_id, company_id: companyId }
        });

        if (!bankAccount) {
            return res.status(404).json({
                success: false,
                error: 'Cuenta bancaria no encontrada'
            });
        }

        const transactionData = {
            ...req.body,
            company_id: companyId,
            status: 'confirmed'
        };

        const transaction = await db.FinanceBankTransaction.create(transactionData);

        // Actualizar saldo de la cuenta
        const amount = parseFloat(transaction.amount);
        const newBalance = parseFloat(bankAccount.current_balance) + amount;
        await bankAccount.updateBalance(newBalance);

        res.status(201).json({
            success: true,
            message: 'Transacción registrada correctamente',
            data: transaction
        });
    } catch (error) {
        console.error('Error creating transaction:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/finance/treasury/transactions/import
 * Importar extracto bancario
 */
router.post('/transactions/import', auth, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const userId = req.user.user_id;
        const { bank_account_id, transactions } = req.body;

        // Verificar cuenta bancaria
        const bankAccount = await db.FinanceBankAccount.findOne({
            where: { id: bank_account_id, company_id: companyId }
        });

        if (!bankAccount) {
            return res.status(404).json({
                success: false,
                error: 'Cuenta bancaria no encontrada'
            });
        }

        if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Se requiere un array de transacciones'
            });
        }

        const results = await FinanceReconciliationService.importBankStatement(
            bank_account_id,
            transactions,
            userId
        );

        res.status(201).json({
            success: true,
            message: `${results.imported} transacciones importadas`,
            data: results
        });
    } catch (error) {
        console.error('Error importing transactions:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// =============================================
// CONCILIACIÓN BANCARIA
// =============================================

/**
 * GET /api/finance/treasury/reconciliation/pending
 * Transacciones pendientes de conciliar
 */
router.get('/reconciliation/pending', auth, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const { bank_account_id } = req.query;

        const transactions = await FinanceReconciliationService.getPendingTransactions(
            companyId,
            bank_account_id ? parseInt(bank_account_id) : null
        );

        res.json({
            success: true,
            data: transactions,
            count: transactions.length
        });
    } catch (error) {
        console.error('Error getting pending transactions:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/finance/treasury/reconciliation/suggestions/:bankAccountId
 * Sugerencias de conciliación
 */
router.get('/reconciliation/suggestions/:bankAccountId', auth, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const { bankAccountId } = req.params;

        // Verificar cuenta bancaria
        const bankAccount = await db.FinanceBankAccount.findOne({
            where: { id: bankAccountId, company_id: companyId }
        });

        if (!bankAccount) {
            return res.status(404).json({
                success: false,
                error: 'Cuenta bancaria no encontrada'
            });
        }

        const suggestions = await FinanceReconciliationService.suggestMatches(companyId, bankAccountId);

        res.json({
            success: true,
            data: suggestions,
            count: suggestions.length
        });
    } catch (error) {
        console.error('Error getting reconciliation suggestions:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/finance/treasury/reconciliation/reconcile
 * Conciliar transacción con asiento
 */
router.post('/reconciliation/reconcile', auth, async (req, res) => {
    try {
        const userId = req.user.user_id;
        const { transaction_id, journal_entry_id } = req.body;

        if (!transaction_id || !journal_entry_id) {
            return res.status(400).json({
                success: false,
                error: 'transaction_id y journal_entry_id son requeridos'
            });
        }

        const transaction = await FinanceReconciliationService.reconcileTransaction(
            transaction_id,
            journal_entry_id,
            userId
        );

        res.json({
            success: true,
            message: 'Transacción conciliada correctamente',
            data: transaction
        });
    } catch (error) {
        console.error('Error reconciling transaction:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/finance/treasury/reconciliation/auto/:bankAccountId
 * Conciliación automática
 */
router.post('/reconciliation/auto/:bankAccountId', auth, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const userId = req.user.user_id;
        const { bankAccountId } = req.params;

        // Verificar cuenta bancaria
        const bankAccount = await db.FinanceBankAccount.findOne({
            where: { id: bankAccountId, company_id: companyId }
        });

        if (!bankAccount) {
            return res.status(404).json({
                success: false,
                error: 'Cuenta bancaria no encontrada'
            });
        }

        const results = await FinanceReconciliationService.autoReconcile(companyId, bankAccountId, userId);

        res.json({
            success: true,
            message: `Conciliación automática: ${results.reconciled} conciliadas, ${results.failed} fallidas`,
            data: results
        });
    } catch (error) {
        console.error('Error in auto reconciliation:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/finance/treasury/reconciliation/unreconcile/:transactionId
 * Deshacer conciliación
 */
router.post('/reconciliation/unreconcile/:transactionId', auth, async (req, res) => {
    try {
        const userId = req.user.user_id;
        const { transactionId } = req.params;

        const transaction = await FinanceReconciliationService.unreconcile(transactionId, userId);

        res.json({
            success: true,
            message: 'Conciliación deshecha correctamente',
            data: transaction
        });
    } catch (error) {
        console.error('Error unreconciling transaction:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/finance/treasury/reconciliation/summary/:bankAccountId
 * Resumen de conciliación
 */
router.get('/reconciliation/summary/:bankAccountId', auth, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const { bankAccountId } = req.params;
        const { as_of_date } = req.query;

        // Verificar cuenta bancaria
        const bankAccount = await db.FinanceBankAccount.findOne({
            where: { id: bankAccountId, company_id: companyId }
        });

        if (!bankAccount) {
            return res.status(404).json({
                success: false,
                error: 'Cuenta bancaria no encontrada'
            });
        }

        const summary = await FinanceReconciliationService.getReconciliationSummary(
            companyId,
            bankAccountId,
            as_of_date ? new Date(as_of_date) : new Date()
        );

        res.json({
            success: true,
            data: summary
        });
    } catch (error) {
        console.error('Error getting reconciliation summary:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// =============================================
// FLUJO DE CAJA
// =============================================

/**
 * GET /api/finance/treasury/cash-flow/forecast
 * Proyección de flujo de caja
 */
router.get('/cash-flow/forecast', auth, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const { days = 30, scenario = 'base' } = req.query;

        const forecast = await FinanceCashFlowService.generateForecast(
            companyId,
            parseInt(days),
            scenario
        );

        res.json({
            success: true,
            data: forecast
        });
    } catch (error) {
        console.error('Error generating cash flow forecast:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/finance/treasury/cash-flow/scenarios
 * Comparación de escenarios de flujo de caja
 */
router.get('/cash-flow/scenarios', auth, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const { days = 30 } = req.query;

        const scenarios = await FinanceCashFlowService.compareScenarios(companyId, parseInt(days));

        res.json({
            success: true,
            data: scenarios
        });
    } catch (error) {
        console.error('Error comparing scenarios:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/finance/treasury/cash-flow/alerts
 * Alertas de liquidez
 */
router.get('/cash-flow/alerts', auth, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const { days = 30 } = req.query;

        const alerts = await FinanceCashFlowService.getLiquidityAlerts(companyId, parseInt(days));

        res.json({
            success: true,
            data: alerts,
            count: alerts.length
        });
    } catch (error) {
        console.error('Error getting liquidity alerts:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/finance/treasury/dashboard
 * Dashboard completo de tesorería
 */
router.get('/dashboard', auth, async (req, res) => {
    try {
        const companyId = req.user.company_id;

        const dashboard = await FinanceCashFlowService.getTreasuryDashboard(companyId);

        res.json({
            success: true,
            data: dashboard
        });
    } catch (error) {
        console.error('Error getting treasury dashboard:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
