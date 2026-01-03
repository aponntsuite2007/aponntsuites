/**
 * Cash Management Routes
 * API para Cajas, Transferencias, Fondos Fijos y Medios de Pago
 */

const express = require('express');
const router = express.Router();
const { auth, checkPermission } = require('../middleware/auth');
const db = require('../config/database');
const CashRegisterService = require('../services/CashRegisterService');
const PettyCashService = require('../services/PettyCashService');
const CashAuthorizationService = require('../services/CashAuthorizationService');

// Instanciar servicios
const cashService = new CashRegisterService(db);
const pettyCashService = new PettyCashService(db);
const authService = new CashAuthorizationService(db);

// =========================================================================
// MEDIOS DE PAGO
// =========================================================================

/**
 * GET /api/finance/payment-methods
 * Obtener medios de pago de la empresa
 */
router.get('/payment-methods', auth, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const { isActive } = req.query;

        const where = { company_id: companyId };
        if (isActive !== undefined) where.is_active = isActive === 'true';

        const methods = await db.FinancePaymentMethod.findAll({
            where,
            order: [['display_order', 'ASC'], ['name', 'ASC']]
        });

        res.json({ success: true, data: methods });
    } catch (error) {
        console.error('Error getting payment methods:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/finance/payment-methods
 * Crear medio de pago
 */
router.post('/payment-methods', auth, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const method = await db.FinancePaymentMethod.create({
            company_id: companyId,
            ...req.body,
            created_by: req.user.user_id
        });

        res.json({ success: true, data: method });
    } catch (error) {
        console.error('Error creating payment method:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * PUT /api/finance/payment-methods/:id
 * Actualizar medio de pago
 */
router.put('/payment-methods/:id', auth, async (req, res) => {
    try {
        const method = await db.FinancePaymentMethod.findByPk(req.params.id);
        if (!method || method.company_id !== req.user.company_id) {
            return res.status(404).json({ success: false, error: 'Medio de pago no encontrado' });
        }

        await method.update(req.body);
        res.json({ success: true, data: method });
    } catch (error) {
        console.error('Error updating payment method:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =========================================================================
// CAJAS
// =========================================================================

/**
 * GET /api/finance/cash-registers
 * Obtener cajas de la empresa
 */
router.get('/cash-registers', auth, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const { type, includeAssignments } = req.query;

        const registers = await cashService.getRegisters(companyId, {
            type,
            includeAssignments: includeAssignments === 'true'
        });

        res.json({ success: true, data: registers });
    } catch (error) {
        console.error('Error getting cash registers:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/finance/cash-registers/my-register
 * Obtener la caja asignada al usuario actual
 */
router.get('/cash-registers/my-register', auth, async (req, res) => {
    try {
        const register = await cashService.getUserAssignedRegister(
            req.user.user_id,
            req.user.company_id
        );

        if (!register) {
            return res.json({
                success: true,
                data: null,
                message: 'No tiene una caja asignada'
            });
        }

        // Obtener sesión abierta si existe
        const session = await db.FinanceCashRegisterSession.findOne({
            where: { cash_register_id: register.id, status: 'open' }
        });

        res.json({
            success: true,
            data: {
                register,
                currentSession: session
            }
        });
    } catch (error) {
        console.error('Error getting user register:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/finance/cash-registers
 * Crear caja
 */
router.post('/cash-registers', auth, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const register = await cashService.createRegister(
            companyId,
            req.body,
            req.user.user_id
        );

        res.json({ success: true, data: register });
    } catch (error) {
        console.error('Error creating cash register:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * PUT /api/finance/cash-registers/:id
 * Actualizar caja
 */
router.put('/cash-registers/:id', auth, async (req, res) => {
    try {
        const register = await db.FinanceCashRegister.findByPk(req.params.id);
        if (!register || register.company_id !== req.user.company_id) {
            return res.status(404).json({ success: false, error: 'Caja no encontrada' });
        }

        await register.update(req.body);
        res.json({ success: true, data: register });
    } catch (error) {
        console.error('Error updating cash register:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/finance/cash-registers/:id/assign-user
 * Asignar usuario a caja
 */
router.post('/cash-registers/:id/assign-user', auth, async (req, res) => {
    try {
        const { userId, permissions } = req.body;

        const assignment = await cashService.assignUserToRegister(
            parseInt(req.params.id),
            userId,
            permissions,
            req.user.user_id
        );

        res.json({ success: true, data: assignment });
    } catch (error) {
        console.error('Error assigning user to register:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/finance/cash-registers/:id/summary
 * Obtener resumen de caja
 */
router.get('/cash-registers/:id/summary', auth, async (req, res) => {
    try {
        const { dateFrom, dateTo } = req.query;
        const summary = await cashService.getRegisterSummary(
            parseInt(req.params.id),
            dateFrom,
            dateTo
        );

        res.json({ success: true, data: summary });
    } catch (error) {
        console.error('Error getting register summary:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =========================================================================
// SESIONES DE CAJA
// =========================================================================

/**
 * POST /api/finance/cash-sessions/open
 * Abrir sesión de caja
 */
router.post('/cash-sessions/open', auth, async (req, res) => {
    try {
        const { registerId, openingAmount, notes } = req.body;

        const session = await cashService.openSession(
            registerId,
            req.user.user_id,
            openingAmount,
            notes
        );

        res.json({ success: true, data: session });
    } catch (error) {
        console.error('Error opening session:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/finance/cash-sessions/:id/can-close
 * Verificar si se puede cerrar la sesión
 */
router.get('/cash-sessions/:id/can-close', auth, async (req, res) => {
    try {
        const result = await cashService.canCloseSession(parseInt(req.params.id));
        res.json({ success: true, data: result });
    } catch (error) {
        console.error('Error checking can close:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/finance/cash-sessions/:id/close
 * Cerrar sesión de caja
 */
router.post('/cash-sessions/:id/close', auth, async (req, res) => {
    try {
        const { closingAmount, notes, forceClose } = req.body;

        const result = await cashService.closeSession(
            parseInt(req.params.id),
            req.user.user_id,
            { closingAmount, notes, forceClose }
        );

        res.json({ success: true, data: result });
    } catch (error) {
        console.error('Error closing session:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/finance/cash-sessions/:id/movements
 * Obtener movimientos de una sesión
 */
router.get('/cash-sessions/:id/movements', auth, async (req, res) => {
    try {
        const { limit, offset } = req.query;
        const result = await cashService.getSessionMovements(
            parseInt(req.params.id),
            { limit: parseInt(limit) || 100, offset: parseInt(offset) || 0 }
        );

        res.json({
            success: true,
            data: result.rows,
            total: result.count
        });
    } catch (error) {
        console.error('Error getting movements:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =========================================================================
// MOVIMIENTOS (PLUG-AND-PLAY)
// =========================================================================

/**
 * POST /api/finance/cash-movements
 * Crear movimiento de caja (usado por otros módulos)
 */
router.post('/cash-movements', auth, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const movement = await cashService.createMovement(
            companyId,
            { ...req.body, createdBy: req.user.user_id }
        );

        res.json({ success: true, data: movement });
    } catch (error) {
        console.error('Error creating movement:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =========================================================================
// TRANSFERENCIAS
// =========================================================================

/**
 * GET /api/finance/cash-transfers/pending
 * Obtener transferencias pendientes de la caja del usuario
 */
router.get('/cash-transfers/pending', auth, async (req, res) => {
    try {
        const register = await cashService.getUserAssignedRegister(
            req.user.user_id,
            req.user.company_id
        );

        if (!register) {
            return res.json({ success: true, data: { incoming: [], outgoing: [] } });
        }

        const incoming = await cashService.getPendingTransfers(register.id, 'incoming');
        const outgoing = await cashService.getPendingTransfers(register.id, 'outgoing');

        res.json({
            success: true,
            data: { incoming, outgoing }
        });
    } catch (error) {
        console.error('Error getting pending transfers:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/finance/cash-transfers
 * Crear transferencia entre cajas
 */
router.post('/cash-transfers', auth, async (req, res) => {
    try {
        const transfer = await cashService.createTransfer(
            req.user.company_id,
            req.body,
            req.user.user_id
        );

        res.json({ success: true, data: transfer });
    } catch (error) {
        console.error('Error creating transfer:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/finance/cash-transfers/:id/confirm
 * Confirmar transferencia
 */
router.post('/cash-transfers/:id/confirm', auth, async (req, res) => {
    try {
        const { notes } = req.body;

        const transfer = await cashService.confirmTransfer(
            parseInt(req.params.id),
            req.user.user_id,
            notes
        );

        res.json({ success: true, data: transfer });
    } catch (error) {
        console.error('Error confirming transfer:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/finance/cash-transfers/:id/reject
 * Rechazar transferencia (auto-reversión)
 */
router.post('/cash-transfers/:id/reject', auth, async (req, res) => {
    try {
        const { reason } = req.body;

        const transfer = await cashService.rejectTransfer(
            parseInt(req.params.id),
            req.user.user_id,
            reason
        );

        res.json({ success: true, data: transfer });
    } catch (error) {
        console.error('Error rejecting transfer:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/finance/cash-transfers/:id/cancel
 * Cancelar transferencia (solo origen)
 */
router.post('/cash-transfers/:id/cancel', auth, async (req, res) => {
    try {
        const { reason } = req.body;

        const transfer = await cashService.cancelTransfer(
            parseInt(req.params.id),
            req.user.user_id,
            reason
        );

        res.json({ success: true, data: transfer });
    } catch (error) {
        console.error('Error cancelling transfer:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =========================================================================
// ARQUEOS
// =========================================================================

/**
 * POST /api/finance/cash-counts
 * Registrar arqueo de caja
 */
router.post('/cash-counts', auth, async (req, res) => {
    try {
        const count = await cashService.createCashCount(
            req.body.sessionId,
            req.body,
            req.user.user_id
        );

        res.json({ success: true, data: count });
    } catch (error) {
        console.error('Error creating cash count:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =========================================================================
// FONDOS FIJOS
// =========================================================================

/**
 * GET /api/finance/petty-cash/funds
 * Obtener fondos fijos
 */
router.get('/petty-cash/funds', auth, async (req, res) => {
    try {
        const { departmentId } = req.query;
        const funds = await pettyCashService.getFunds(req.user.company_id, { departmentId });
        res.json({ success: true, data: funds });
    } catch (error) {
        console.error('Error getting petty cash funds:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/finance/petty-cash/funds/:id
 * Obtener fondo fijo por ID
 */
router.get('/petty-cash/funds/:id', auth, async (req, res) => {
    try {
        const { includeExpenses } = req.query;
        const fund = await pettyCashService.getFundById(
            parseInt(req.params.id),
            includeExpenses === 'true'
        );

        if (!fund) {
            return res.status(404).json({ success: false, error: 'Fondo no encontrado' });
        }

        res.json({ success: true, data: fund });
    } catch (error) {
        console.error('Error getting petty cash fund:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/finance/petty-cash/funds/:id/summary
 * Obtener resumen de fondo fijo
 */
router.get('/petty-cash/funds/:id/summary', auth, async (req, res) => {
    try {
        const summary = await pettyCashService.getFundSummary(parseInt(req.params.id));
        res.json({ success: true, data: summary });
    } catch (error) {
        console.error('Error getting fund summary:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/finance/petty-cash/funds
 * Crear fondo fijo
 */
router.post('/petty-cash/funds', auth, async (req, res) => {
    try {
        const fund = await pettyCashService.createFund(
            req.user.company_id,
            req.body,
            req.user.user_id
        );

        res.json({ success: true, data: fund });
    } catch (error) {
        console.error('Error creating petty cash fund:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * PUT /api/finance/petty-cash/funds/:id
 * Actualizar fondo fijo
 */
router.put('/petty-cash/funds/:id', auth, async (req, res) => {
    try {
        const fund = await pettyCashService.updateFund(parseInt(req.params.id), req.body);
        res.json({ success: true, data: fund });
    } catch (error) {
        console.error('Error updating petty cash fund:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =========================================================================
// GASTOS DE FONDO FIJO
// =========================================================================

/**
 * GET /api/finance/petty-cash/funds/:id/expenses
 * Obtener gastos de un fondo
 */
router.get('/petty-cash/funds/:id/expenses', auth, async (req, res) => {
    try {
        const { status, dateFrom, dateTo, limit, offset } = req.query;
        const result = await pettyCashService.getExpenses(parseInt(req.params.id), {
            status,
            dateFrom,
            dateTo,
            limit: parseInt(limit) || 100,
            offset: parseInt(offset) || 0
        });

        res.json({
            success: true,
            data: result.rows,
            total: result.count
        });
    } catch (error) {
        console.error('Error getting expenses:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/finance/petty-cash/funds/:id/expenses
 * Registrar gasto de fondo fijo
 */
router.post('/petty-cash/funds/:id/expenses', auth, async (req, res) => {
    try {
        const expense = await pettyCashService.createExpense(
            parseInt(req.params.id),
            req.body,
            req.user.user_id
        );

        res.json({ success: true, data: expense });
    } catch (error) {
        console.error('Error creating expense:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/finance/petty-cash/expenses/:id/approve
 * Aprobar gasto
 */
router.post('/petty-cash/expenses/:id/approve', auth, async (req, res) => {
    try {
        const expense = await pettyCashService.approveExpense(
            parseInt(req.params.id),
            req.user.user_id
        );

        res.json({ success: true, data: expense });
    } catch (error) {
        console.error('Error approving expense:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/finance/petty-cash/expenses/:id/reject
 * Rechazar gasto
 */
router.post('/petty-cash/expenses/:id/reject', auth, async (req, res) => {
    try {
        const { reason } = req.body;
        const expense = await pettyCashService.rejectExpense(
            parseInt(req.params.id),
            req.user.user_id,
            reason
        );

        res.json({ success: true, data: expense });
    } catch (error) {
        console.error('Error rejecting expense:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =========================================================================
// REPOSICIONES DE FONDO FIJO
// =========================================================================

/**
 * GET /api/finance/petty-cash/funds/:id/replenishments
 * Obtener reposiciones de un fondo
 */
router.get('/petty-cash/funds/:id/replenishments', auth, async (req, res) => {
    try {
        const { status, limit, offset } = req.query;
        const result = await pettyCashService.getReplenishments(parseInt(req.params.id), {
            status,
            limit: parseInt(limit) || 50,
            offset: parseInt(offset) || 0
        });

        res.json({
            success: true,
            data: result.rows,
            total: result.count
        });
    } catch (error) {
        console.error('Error getting replenishments:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/finance/petty-cash/funds/:id/replenishments
 * Solicitar reposición
 */
router.post('/petty-cash/funds/:id/replenishments', auth, async (req, res) => {
    try {
        const replenishment = await pettyCashService.requestReplenishment(
            parseInt(req.params.id),
            req.body,
            req.user.user_id
        );

        res.json({ success: true, data: replenishment });
    } catch (error) {
        console.error('Error requesting replenishment:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/finance/petty-cash/replenishments/:id/approve
 * Aprobar reposición
 */
router.post('/petty-cash/replenishments/:id/approve', auth, async (req, res) => {
    try {
        const replenishment = await pettyCashService.approveReplenishment(
            parseInt(req.params.id),
            req.user.user_id
        );

        res.json({ success: true, data: replenishment });
    } catch (error) {
        console.error('Error approving replenishment:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/finance/petty-cash/replenishments/:id/pay
 * Ejecutar pago de reposición
 */
router.post('/petty-cash/replenishments/:id/pay', auth, async (req, res) => {
    try {
        const replenishment = await pettyCashService.payReplenishment(
            parseInt(req.params.id),
            req.user.user_id,
            cashService
        );

        res.json({ success: true, data: replenishment });
    } catch (error) {
        console.error('Error paying replenishment:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =========================================================================
// INTEGRACIÓN PLUG-AND-PLAY
// =========================================================================

/**
 * GET /api/finance/integration-config/:module
 * Obtener configuración de integración para un módulo
 */
router.get('/integration-config/:module', auth, async (req, res) => {
    try {
        const config = await cashService.getModuleIntegration(
            req.user.company_id,
            req.params.module
        );

        res.json({ success: true, data: config });
    } catch (error) {
        console.error('Error getting integration config:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/finance/integration-config
 * Configurar integración de módulo con cajas
 */
router.post('/integration-config', auth, async (req, res) => {
    try {
        const config = await cashService.configureModuleIntegration(
            req.user.company_id,
            req.body
        );

        res.json({ success: true, data: config });
    } catch (error) {
        console.error('Error configuring integration:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =========================================================================
// MONEDAS (Multi-Currency Support)
// =========================================================================

/**
 * GET /api/finance/currencies
 * Obtener monedas disponibles
 */
router.get('/currencies', auth, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const { isActive } = req.query;

        const where = { company_id: companyId };
        if (isActive !== undefined) where.is_active = isActive === 'true';

        const currencies = await db.FinanceCurrency.findAll({
            where,
            order: [['is_default', 'DESC'], ['code', 'ASC']]
        });

        res.json({ success: true, data: currencies });
    } catch (error) {
        console.error('Error getting currencies:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/finance/currencies
 * Crear moneda
 */
router.post('/currencies', auth, async (req, res) => {
    try {
        const currency = await db.FinanceCurrency.create({
            company_id: req.user.company_id,
            ...req.body
        });

        res.json({ success: true, data: currency });
    } catch (error) {
        console.error('Error creating currency:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * PUT /api/finance/currencies/:id/exchange-rate
 * Actualizar tipo de cambio
 */
router.put('/currencies/:id/exchange-rate', auth, async (req, res) => {
    try {
        const currency = await db.FinanceCurrency.findByPk(req.params.id);
        if (!currency || currency.company_id !== req.user.company_id) {
            return res.status(404).json({ success: false, error: 'Moneda no encontrada' });
        }

        await currency.update({
            exchange_rate: req.body.exchangeRate,
            last_rate_update: new Date()
        });

        res.json({ success: true, data: currency });
    } catch (error) {
        console.error('Error updating exchange rate:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =========================================================================
// EGRESOS CON AUTORIZACIÓN JERÁRQUICA
// =========================================================================

/**
 * GET /api/finance/egress-requests
 * Obtener solicitudes de egreso
 */
router.get('/egress-requests', auth, async (req, res) => {
    try {
        const { status, registerId, limit, offset } = req.query;
        const companyId = req.user.company_id;

        const where = { company_id: companyId };
        if (status) where.status = status;
        if (registerId) where.cash_register_id = parseInt(registerId);

        const requests = await db.FinanceCashEgressRequest.findAndCountAll({
            where,
            include: [
                { model: db.FinanceCashRegister, as: 'cashRegister', attributes: ['id', 'name', 'code'] },
                { model: db.User, as: 'requestedByUser', attributes: ['user_id', 'first_name', 'last_name'] },
                { model: db.User, as: 'supervisor', attributes: ['user_id', 'first_name', 'last_name'] },
                { model: db.User, as: 'financeResponsible', attributes: ['user_id', 'first_name', 'last_name'] }
            ],
            order: [['created_at', 'DESC']],
            limit: parseInt(limit) || 50,
            offset: parseInt(offset) || 0
        });

        res.json({
            success: true,
            data: requests.rows,
            total: requests.count
        });
    } catch (error) {
        console.error('Error getting egress requests:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/finance/egress-requests/pending-approval
 * Obtener egresos pendientes de aprobación (para supervisor o finance)
 */
router.get('/egress-requests/pending-approval', auth, async (req, res) => {
    try {
        const userId = req.user.user_id;
        const companyId = req.user.company_id;

        // Obtener como supervisor (pendientes de aprobación de supervisor)
        const asSupervisor = await db.FinanceCashEgressRequest.findAll({
            where: {
                company_id: companyId,
                supervisor_id: userId,
                status: 'pending'
            },
            include: [
                { model: db.FinanceCashRegister, as: 'cashRegister' },
                { model: db.User, as: 'requestedByUser', attributes: ['user_id', 'first_name', 'last_name'] }
            ],
            order: [['created_at', 'ASC']]
        });

        // Obtener como responsable de finanzas (aprobados por supervisor, pendientes de finance)
        const asFinance = await db.FinanceCashEgressRequest.findAll({
            where: {
                company_id: companyId,
                finance_responsible_id: userId,
                status: 'supervisor_approved'
            },
            include: [
                { model: db.FinanceCashRegister, as: 'cashRegister' },
                { model: db.User, as: 'requestedByUser', attributes: ['user_id', 'first_name', 'last_name'] },
                { model: db.User, as: 'supervisor', attributes: ['user_id', 'first_name', 'last_name'] }
            ],
            order: [['created_at', 'ASC']]
        });

        res.json({
            success: true,
            data: {
                asSupervisor,
                asFinance
            }
        });
    } catch (error) {
        console.error('Error getting pending egress approvals:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/finance/egress-requests
 * Crear solicitud de egreso (requiere autorización)
 */
router.post('/egress-requests', auth, async (req, res) => {
    try {
        // FIX: Orden correcto de parámetros: companyId, data, requestedBy, ipAddress
        const result = await authService.createEgressRequest(
            req.user.company_id,
            req.body,              // data con todos los campos del egreso
            req.user.user_id,      // requestedBy (quien solicita)
            req.ip                 // ipAddress
        );

        res.json({ success: true, data: result });
    } catch (error) {
        console.error('Error creating egress request:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/finance/egress-requests/:id/supervisor-approve
 * Aprobación del supervisor inmediato
 */
router.post('/egress-requests/:id/supervisor-approve', auth, async (req, res) => {
    try {
        const { authorizationMethod, authorizationData, notes } = req.body;

        // FIX: Parámetros separados, no objeto
        const result = await authService.supervisorApproveEgress(
            parseInt(req.params.id),
            req.user.user_id,
            authorizationMethod,                           // authMethod string
            { ...authorizationData, user_agent: req.headers['user-agent'] },  // authData object
            notes,                                         // notes
            req.ip                                         // ipAddress
        );

        res.json({ success: true, data: result });
    } catch (error) {
        console.error('Error supervisor approving egress:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/finance/egress-requests/:id/finance-approve
 * Aprobación del responsable de finanzas
 */
router.post('/egress-requests/:id/finance-approve', auth, async (req, res) => {
    try {
        const { authorizationMethod, authorizationData, notes } = req.body;

        const egressRequest = await db.FinanceCashEgressRequest.findByPk(req.params.id);
        if (!egressRequest || egressRequest.company_id !== req.user.company_id) {
            return res.status(404).json({ success: false, error: 'Solicitud no encontrada' });
        }

        if (egressRequest.status !== 'supervisor_approved') {
            return res.status(400).json({
                success: false,
                error: 'La solicitud debe ser aprobada por el supervisor primero'
            });
        }

        // FIX: verifyAuthorization requiere 9 parámetros completos
        const authResult = await authService.verifyAuthorization(
            req.user.company_id,                           // companyId
            req.user.user_id,                              // userId
            authorizationMethod,                           // method
            { ...authorizationData, user_agent: req.headers['user-agent'] },  // authData
            'egress',                                      // operationType
            egressRequest.id,                              // operationId
            'finance_cash_egress_requests',                // operationTable
            'finance_responsible',                         // role
            req.ip                                         // ipAddress
        );

        if (!authResult.success) {
            // El log ya se crea dentro de verifyAuthorization
            return res.status(401).json({ success: false, error: authResult.reason });
        }

        // Aprobar
        await egressRequest.update({
            status: 'finance_approved',
            finance_approved_at: new Date(),
            finance_approval_method: authorizationMethod,
            finance_notes: notes,
            audit_trail: [
                ...(egressRequest.audit_trail || []),
                {
                    timestamp: new Date(),
                    action: 'finance_approved',
                    user_id: req.user.user_id,
                    notes
                }
            ]
        });

        // Log de autorización exitosa
        await db.FinanceAuthorizationLog.create({
            company_id: req.user.company_id,
            operation_type: 'egress',
            operation_id: egressRequest.id,
            operation_table: 'finance_cash_egress_requests',
            authorizer_id: req.user.user_id,
            authorization_role: 'finance_responsible',
            authorization_method: authorizationMethod,
            authorization_confidence: authResult.confidence,
            authorization_result: 'success',
            ip_address: req.ip,
            user_agent: req.headers['user-agent']
        });

        res.json({ success: true, data: egressRequest });
    } catch (error) {
        console.error('Error finance approving egress:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/finance/egress-requests/:id/execute
 * Ejecutar egreso aprobado
 */
router.post('/egress-requests/:id/execute', auth, async (req, res) => {
    try {
        const { authorizationMethod, authorizationData } = req.body;

        // FIX: Parámetros en orden correcto según firma del servicio
        const result = await authService.executeEgress(
            parseInt(req.params.id),                       // requestId
            req.user.user_id,                              // executorId
            authorizationMethod,                           // authMethod string
            { ...authorizationData, user_agent: req.headers['user-agent'] },  // authData
            cashService,                                   // cashRegisterService
            req.ip                                         // ipAddress
        );

        res.json({ success: true, data: result });
    } catch (error) {
        console.error('Error executing egress:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/finance/egress-requests/:id/reject
 * Rechazar solicitud de egreso
 */
router.post('/egress-requests/:id/reject', auth, async (req, res) => {
    try {
        const { reason } = req.body;

        const egressRequest = await db.FinanceCashEgressRequest.findByPk(req.params.id);
        if (!egressRequest || egressRequest.company_id !== req.user.company_id) {
            return res.status(404).json({ success: false, error: 'Solicitud no encontrada' });
        }

        await egressRequest.update({
            status: 'rejected',
            rejected_by: req.user.user_id,
            rejected_at: new Date(),
            rejection_reason: reason,
            audit_trail: [
                ...(egressRequest.audit_trail || []),
                {
                    timestamp: new Date(),
                    action: 'rejected',
                    user_id: req.user.user_id,
                    notes: reason
                }
            ]
        });

        res.json({ success: true, data: egressRequest });
    } catch (error) {
        console.error('Error rejecting egress:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =========================================================================
// AJUSTES (Solo Responsable de Finanzas)
// =========================================================================

/**
 * GET /api/finance/adjustments
 * Obtener ajustes
 */
router.get('/adjustments', auth, async (req, res) => {
    try {
        const { status, registerId, limit, offset } = req.query;
        const companyId = req.user.company_id;

        const where = { company_id: companyId };
        if (status) where.status = status;
        if (registerId) where.cash_register_id = parseInt(registerId);

        const adjustments = await db.FinanceCashAdjustment.findAndCountAll({
            where,
            include: [
                { model: db.FinanceCashRegister, as: 'cashRegister', attributes: ['id', 'name', 'code'] },
                { model: db.User, as: 'requestedByUser', attributes: ['user_id', 'first_name', 'last_name'] },
                { model: db.User, as: 'financeApprover', attributes: ['user_id', 'first_name', 'last_name'] }
            ],
            order: [['created_at', 'DESC']],
            limit: parseInt(limit) || 50,
            offset: parseInt(offset) || 0
        });

        res.json({
            success: true,
            data: adjustments.rows,
            total: adjustments.count
        });
    } catch (error) {
        console.error('Error getting adjustments:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/finance/adjustments/pending
 * Obtener ajustes pendientes de aprobación
 */
router.get('/adjustments/pending', auth, async (req, res) => {
    try {
        const companyId = req.user.company_id;

        // Verificar si el usuario es responsable de finanzas
        const financeConfig = await db.FinanceResponsibleConfig.findOne({
            where: { company_id: companyId, is_active: true }
        });

        const isFinanceResponsible = financeConfig && (
            financeConfig.finance_responsible_id === req.user.user_id ||
            (financeConfig.backup_responsibles || []).includes(req.user.user_id)
        );

        if (!isFinanceResponsible) {
            return res.json({ success: true, data: [], message: 'No es responsable de finanzas' });
        }

        const adjustments = await db.FinanceCashAdjustment.findAll({
            where: {
                company_id: companyId,
                status: 'pending'
            },
            include: [
                { model: db.FinanceCashRegister, as: 'cashRegister' },
                { model: db.User, as: 'requestedByUser', attributes: ['user_id', 'first_name', 'last_name'] }
            ],
            order: [['created_at', 'ASC']]
        });

        res.json({ success: true, data: adjustments });
    } catch (error) {
        console.error('Error getting pending adjustments:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/finance/adjustments
 * Solicitar ajuste (solo puede hacerlo responsable de finanzas o crea solicitud)
 */
router.post('/adjustments', auth, async (req, res) => {
    try {
        const result = await authService.createAdjustmentRequest(
            req.user.company_id,
            req.user.user_id,
            req.body
        );

        res.json({ success: true, data: result });
    } catch (error) {
        console.error('Error creating adjustment:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/finance/adjustments/:id/approve
 * Aprobar ajuste (solo responsable de finanzas)
 */
router.post('/adjustments/:id/approve', auth, async (req, res) => {
    try {
        const { authorizationMethod, authorizationData, notes } = req.body;

        const result = await authService.approveAdjustment(
            parseInt(req.params.id),
            req.user.user_id,
            {
                method: authorizationMethod,
                data: authorizationData,
                notes,
                ipAddress: req.ip,
                userAgent: req.headers['user-agent']
            },
            cashService
        );

        res.json({ success: true, data: result });
    } catch (error) {
        console.error('Error approving adjustment:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/finance/adjustments/:id/reject
 * Rechazar ajuste
 */
router.post('/adjustments/:id/reject', auth, async (req, res) => {
    try {
        const { reason } = req.body;

        const adjustment = await db.FinanceCashAdjustment.findByPk(req.params.id);
        if (!adjustment || adjustment.company_id !== req.user.company_id) {
            return res.status(404).json({ success: false, error: 'Ajuste no encontrado' });
        }

        await adjustment.update({
            status: 'rejected',
            rejection_reason: reason,
            audit_trail: [
                ...(adjustment.audit_trail || []),
                {
                    timestamp: new Date(),
                    action: 'rejected',
                    user_id: req.user.user_id,
                    notes: reason
                }
            ]
        });

        res.json({ success: true, data: adjustment });
    } catch (error) {
        console.error('Error rejecting adjustment:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =========================================================================
// CONFIGURACIÓN DE RESPONSABLE DE FINANZAS
// =========================================================================

/**
 * GET /api/finance/responsible-config
 * Obtener configuración del responsable de finanzas
 */
router.get('/responsible-config', auth, async (req, res) => {
    try {
        const config = await db.FinanceResponsibleConfig.findOne({
            where: { company_id: req.user.company_id },
            include: [
                { model: db.User, as: 'financeResponsible', attributes: ['user_id', 'first_name', 'last_name', 'email'] }
            ]
        });

        res.json({ success: true, data: config });
    } catch (error) {
        console.error('Error getting responsible config:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/finance/responsible-config
 * Crear/actualizar configuración de responsable de finanzas
 */
router.post('/responsible-config', auth, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const {
            financeResponsibleId,
            backupResponsibles,
            escalationTimeoutMinutes,
            maxEscalationLevel,
            maxAdjustmentWithoutApproval,
            maxEgressWithoutApproval,
            notifyOnAllAdjustments,
            notifyOnAllEgress,
            notifyOnCashDiscrepancy,
            notifyThresholdPercent
        } = req.body;

        let config = await db.FinanceResponsibleConfig.findOne({
            where: { company_id: companyId }
        });

        if (config) {
            await config.update({
                finance_responsible_id: financeResponsibleId,
                backup_responsibles: backupResponsibles || [],
                escalation_timeout_minutes: escalationTimeoutMinutes || 60,
                max_escalation_level: maxEscalationLevel || 3,
                max_adjustment_without_approval: maxAdjustmentWithoutApproval || 0,
                max_egress_without_approval: maxEgressWithoutApproval || 0,
                notify_on_all_adjustments: notifyOnAllAdjustments ?? true,
                notify_on_all_egress: notifyOnAllEgress ?? true,
                notify_on_cash_discrepancy: notifyOnCashDiscrepancy ?? true,
                notify_threshold_percent: notifyThresholdPercent || 1.00
            });
        } else {
            config = await db.FinanceResponsibleConfig.create({
                company_id: companyId,
                finance_responsible_id: financeResponsibleId,
                backup_responsibles: backupResponsibles || [],
                escalation_timeout_minutes: escalationTimeoutMinutes || 60,
                max_escalation_level: maxEscalationLevel || 3,
                max_adjustment_without_approval: maxAdjustmentWithoutApproval || 0,
                max_egress_without_approval: maxEgressWithoutApproval || 0,
                notify_on_all_adjustments: notifyOnAllAdjustments ?? true,
                notify_on_all_egress: notifyOnAllEgress ?? true,
                notify_on_cash_discrepancy: notifyOnCashDiscrepancy ?? true,
                notify_threshold_percent: notifyThresholdPercent || 1.00
            });
        }

        res.json({ success: true, data: config });
    } catch (error) {
        console.error('Error saving responsible config:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =========================================================================
// LOGS DE AUTORIZACIÓN
// =========================================================================

/**
 * GET /api/finance/authorization-logs
 * Obtener logs de autorización
 */
router.get('/authorization-logs', auth, async (req, res) => {
    try {
        const { operationType, dateFrom, dateTo, limit, offset } = req.query;
        const companyId = req.user.company_id;

        const where = { company_id: companyId };
        if (operationType) where.operation_type = operationType;

        if (dateFrom || dateTo) {
            const { Op } = require('sequelize');
            where.created_at = {};
            if (dateFrom) where.created_at[Op.gte] = new Date(dateFrom);
            if (dateTo) where.created_at[Op.lte] = new Date(dateTo);
        }

        const logs = await db.FinanceAuthorizationLog.findAndCountAll({
            where,
            include: [
                { model: db.User, as: 'authorizer', attributes: ['user_id', 'first_name', 'last_name'] }
            ],
            order: [['created_at', 'DESC']],
            limit: parseInt(limit) || 100,
            offset: parseInt(offset) || 0
        });

        res.json({
            success: true,
            data: logs.rows,
            total: logs.count
        });
    } catch (error) {
        console.error('Error getting authorization logs:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =========================================================================
// DASHBOARD EJECUTIVO DE FINANZAS
// =========================================================================

/**
 * GET /api/finance/executive-dashboard
 * Dashboard completo para el responsable de finanzas
 */
router.get('/executive-dashboard', auth, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const summary = await authService.getFinanceDashboardSummary(companyId);

        // Agregar información adicional
        const { Op } = require('sequelize');
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // ✅ FIX: Obtener arrays de requests pendientes (no solo counts)
        const pendingEgressRequests = await db.FinanceCashEgressRequest.findAll({
            where: {
                company_id: companyId,
                status: { [Op.in]: ['pending', 'supervisor_approved'] }
            },
            include: [
                { model: db.FinanceCashRegister, as: 'cashRegister', attributes: ['id', 'name', 'code'] },
                { model: db.User, as: 'requestedByUser', attributes: ['user_id', 'first_name', 'last_name'] },
                { model: db.User, as: 'supervisor', attributes: ['user_id', 'first_name', 'last_name'] }
            ],
            order: [['created_at', 'ASC']],
            limit: 20
        });

        const pendingAdjustmentRequests = await db.FinanceCashAdjustment.findAll({
            where: {
                company_id: companyId,
                status: 'pending'
            },
            include: [
                { model: db.FinanceCashRegister, as: 'cashRegister', attributes: ['id', 'name', 'code'] },
                { model: db.User, as: 'requestedByUser', attributes: ['user_id', 'first_name', 'last_name'] }
            ],
            order: [['created_at', 'ASC']],
            limit: 20
        });

        // Movimientos del día agrupados por tipo
        const todayMovements = await db.FinanceCashMovement.findAll({
            where: {
                company_id: companyId,
                movement_date: { [Op.gte]: today }
            },
            attributes: [
                'movement_type',
                'currency',
                [db.sequelize.fn('SUM', db.sequelize.col('amount')), 'total'],
                [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']
            ],
            group: ['movement_type', 'currency']
        });

        // Movimientos por medio de pago
        const movementsByPaymentMethod = await db.FinanceCashMovement.findAll({
            where: {
                company_id: companyId,
                movement_date: { [Op.gte]: today }
            },
            include: [
                { model: db.FinancePaymentMethod, as: 'paymentMethod', attributes: ['id', 'name', 'payment_type'] }
            ],
            attributes: [
                'payment_method_id',
                [db.sequelize.fn('SUM', db.sequelize.col('amount')), 'total'],
                [db.sequelize.fn('COUNT', db.sequelize.col('FinanceCashMovement.id')), 'count']
            ],
            group: ['payment_method_id', 'paymentMethod.id', 'paymentMethod.name', 'paymentMethod.payment_type']
        });

        // Últimas 10 autorizaciones
        const recentAuthorizations = await db.FinanceAuthorizationLog.findAll({
            where: { company_id: companyId },
            include: [
                { model: db.User, as: 'authorizer', attributes: ['user_id', 'first_name', 'last_name'] }
            ],
            order: [['created_at', 'DESC']],
            limit: 10
        });

        // Sesiones activas
        const activeSessions = await db.FinanceCashRegisterSession.findAll({
            where: { status: 'open' },
            include: [
                {
                    model: db.FinanceCashRegister,
                    as: 'cashRegister',
                    where: { company_id: companyId },
                    attributes: ['id', 'name', 'code']
                },
                { model: db.User, as: 'openedByUser', attributes: ['user_id', 'first_name', 'last_name'] }
            ]
        });

        // Fondos fijos - estado actual
        const pettyCashStatus = await db.FinancePettyCashFund.findAll({
            where: { company_id: companyId, is_active: true },
            attributes: ['id', 'name', 'fund_amount', 'current_balance', 'minimum_balance']
        });

        res.json({
            success: true,
            data: {
                ...summary,
                // ✅ FIX: Incluir arrays de requests pendientes para la tabla de aprobaciones
                pendingEgressRequests,
                pendingAdjustmentRequests,
                todayMovements,
                movementsByPaymentMethod,
                recentAuthorizations,
                activeSessions,
                pettyCashStatus,
                timestamp: new Date()
            }
        });
    } catch (error) {
        console.error('Error getting executive dashboard:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/finance/executive-dashboard/registers-status
 * Estado de todas las cajas en tiempo real
 */
router.get('/executive-dashboard/registers-status', auth, async (req, res) => {
    try {
        const companyId = req.user.company_id;

        const registers = await db.FinanceCashRegister.findAll({
            where: { company_id: companyId, is_active: true },
            include: [
                {
                    model: db.FinanceCashRegisterSession,
                    as: 'sessions',
                    where: { status: 'open' },
                    required: false,
                    include: [
                        { model: db.User, as: 'openedByUser', attributes: ['user_id', 'first_name', 'last_name'] }
                    ]
                },
                { model: db.Department, as: 'department', attributes: ['id', 'name'] }
            ],
            order: [['name', 'ASC']]
        });

        // Calcular saldos para cada caja
        const registersWithBalances = await Promise.all(
            registers.map(async (register) => {
                const session = register.sessions && register.sessions[0];

                if (session) {
                    // Sumar movimientos de la sesión
                    const movements = await db.FinanceCashMovement.findAll({
                        where: { session_id: session.id },
                        attributes: [
                            'movement_type',
                            'currency',
                            [db.sequelize.fn('SUM', db.sequelize.col('amount')), 'total']
                        ],
                        group: ['movement_type', 'currency']
                    });

                    let currentBalance = parseFloat(session.opening_amount || 0);
                    movements.forEach(m => {
                        const amount = parseFloat(m.getDataValue('total') || 0);
                        if (['income', 'adjustment_in', 'transfer_in'].includes(m.movement_type)) {
                            currentBalance += amount;
                        } else {
                            currentBalance -= amount;
                        }
                    });

                    return {
                        ...register.toJSON(),
                        currentBalance,
                        status: 'open',
                        operator: session.openedByUser,
                        openedAt: session.opened_at
                    };
                }

                return {
                    ...register.toJSON(),
                    currentBalance: null,
                    status: 'closed',
                    operator: null,
                    openedAt: null
                };
            })
        );

        res.json({ success: true, data: registersWithBalances });
    } catch (error) {
        console.error('Error getting registers status:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/finance/executive-dashboard/financial-summary
 * Resumen financiero con plan de cuentas
 */
router.get('/executive-dashboard/financial-summary', auth, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const { dateFrom, dateTo } = req.query;
        const { Op } = require('sequelize');

        // Período por defecto: mes actual
        const startDate = dateFrom ? new Date(dateFrom) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const endDate = dateTo ? new Date(dateTo) : new Date();

        // Movimientos del período
        const movements = await db.FinanceCashMovement.findAll({
            where: {
                company_id: companyId,
                movement_date: { [Op.between]: [startDate, endDate] }
            },
            attributes: [
                'movement_type',
                'currency',
                [db.sequelize.fn('SUM', db.sequelize.col('amount')), 'total'],
                [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']
            ],
            group: ['movement_type', 'currency']
        });

        // Resumen por categoría (si existe campo category)
        const byCategory = await db.FinanceCashMovement.findAll({
            where: {
                company_id: companyId,
                movement_date: { [Op.between]: [startDate, endDate] }
            },
            attributes: [
                'category',
                'movement_type',
                [db.sequelize.fn('SUM', db.sequelize.col('amount')), 'total']
            ],
            group: ['category', 'movement_type']
        });

        // Totales
        let totalIncome = 0;
        let totalExpense = 0;

        movements.forEach(m => {
            const amount = parseFloat(m.getDataValue('total') || 0);
            if (['income', 'adjustment_in', 'transfer_in', 'exchange_in'].includes(m.movement_type)) {
                totalIncome += amount;
            } else if (['expense', 'adjustment_out', 'transfer_out', 'exchange_out'].includes(m.movement_type)) {
                totalExpense += amount;
            }
        });

        res.json({
            success: true,
            data: {
                period: { from: startDate, to: endDate },
                movements,
                byCategory,
                totals: {
                    income: totalIncome,
                    expense: totalExpense,
                    net: totalIncome - totalExpense
                }
            }
        });
    } catch (error) {
        console.error('Error getting financial summary:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =========================================================================
// TIPOS DE CAMBIO (Exchange Rates)
// =========================================================================

/**
 * GET /api/finance/exchange-rates
 * Obtener historial de tipos de cambio
 */
router.get('/exchange-rates', auth, async (req, res) => {
    try {
        const { currencyId, dateFrom, dateTo, limit } = req.query;
        const { Op } = require('sequelize');
        const companyId = req.user.company_id;

        const where = { company_id: companyId };
        if (currencyId) where.currency_id = parseInt(currencyId);
        if (dateFrom && dateTo) {
            where.effective_date = { [Op.between]: [dateFrom, dateTo] };
        }

        const rates = await db.FinanceExchangeRate.findAll({
            where,
            include: [{ model: db.FinanceCurrency, as: 'currency', attributes: ['code', 'name', 'symbol'] }],
            order: [['effective_date', 'DESC'], ['effective_time', 'DESC']],
            limit: parseInt(limit) || 100
        });

        res.json({ success: true, data: rates });
    } catch (error) {
        console.error('Error getting exchange rates:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/finance/exchange-rates
 * Registrar nuevo tipo de cambio
 */
router.post('/exchange-rates', auth, async (req, res) => {
    try {
        const rate = await db.FinanceExchangeRate.create({
            company_id: req.user.company_id,
            ...req.body,
            created_by: req.user.user_id
        });

        // Actualizar también el tipo de cambio en la moneda
        if (req.body.currency_id && req.body.mid_rate) {
            await db.FinanceCurrency.update(
                { exchange_rate: req.body.mid_rate, last_rate_update: new Date() },
                { where: { id: req.body.currency_id, company_id: req.user.company_id } }
            );
        }

        res.json({ success: true, data: rate });
    } catch (error) {
        console.error('Error creating exchange rate:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/finance/exchange-rates/current
 * Obtener tipos de cambio actuales (último por moneda)
 */
router.get('/exchange-rates/current', auth, async (req, res) => {
    try {
        const companyId = req.user.company_id;

        const rates = await db.sequelize.query(`
            SELECT DISTINCT ON (currency_id)
                fer.*,
                fc.code as currency_code,
                fc.name as currency_name,
                fc.symbol as currency_symbol
            FROM finance_exchange_rates fer
            JOIN finance_currencies fc ON fer.currency_id = fc.id
            WHERE fer.company_id = :companyId
            ORDER BY currency_id, effective_date DESC, effective_time DESC
        `, {
            replacements: { companyId },
            type: db.sequelize.QueryTypes.SELECT
        });

        res.json({ success: true, data: rates });
    } catch (error) {
        console.error('Error getting current exchange rates:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =========================================================================
// CAMBIO DE MONEDA (Currency Exchange Operations)
// =========================================================================

/**
 * GET /api/finance/currency-exchanges
 * Obtener historial de operaciones de cambio
 */
router.get('/currency-exchanges', auth, async (req, res) => {
    try {
        const { registerId, sessionId, dateFrom, dateTo, limit, offset } = req.query;
        const { Op } = require('sequelize');
        const companyId = req.user.company_id;

        const where = { company_id: companyId };
        if (registerId) where.cash_register_id = parseInt(registerId);
        if (sessionId) where.session_id = parseInt(sessionId);
        if (dateFrom && dateTo) {
            where.exchange_date = { [Op.between]: [dateFrom, dateTo] };
        }

        const exchanges = await db.FinanceCurrencyExchange.findAndCountAll({
            where,
            include: [
                { model: db.FinanceCashRegister, as: 'cashRegister', attributes: ['id', 'name', 'code'] },
                { model: db.FinanceCurrency, as: 'fromCurrency', attributes: ['code', 'name', 'symbol'] },
                { model: db.FinanceCurrency, as: 'toCurrency', attributes: ['code', 'name', 'symbol'] },
                { model: db.User, as: 'creator', attributes: ['user_id', 'first_name', 'last_name'] }
            ],
            order: [['exchange_date', 'DESC']],
            limit: parseInt(limit) || 50,
            offset: parseInt(offset) || 0
        });

        res.json({ success: true, data: exchanges.rows, total: exchanges.count });
    } catch (error) {
        console.error('Error getting currency exchanges:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/finance/currency-exchanges
 * Realizar operación de cambio de moneda
 */
router.post('/currency-exchanges', auth, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const {
            cashRegisterId,
            sessionId,
            exchangeType,
            fromCurrencyId,
            fromAmount,
            toCurrencyId,
            toAmount,
            exchangeRate,
            rateType,
            spreadPercent,
            clientType,
            clientName,
            clientDocument,
            description
        } = req.body;

        // Generar número de operación
        const lastExchange = await db.FinanceCurrencyExchange.findOne({
            where: { company_id: companyId },
            order: [['id', 'DESC']]
        });
        const exchangeNumber = `EXC-${companyId}-${(lastExchange?.id || 0) + 1}`.padStart(12, '0');

        // Obtener códigos de moneda
        const fromCurrency = await db.FinanceCurrency.findByPk(fromCurrencyId);
        const toCurrency = await db.FinanceCurrency.findByPk(toCurrencyId);

        // Crear operación de cambio
        const exchange = await db.FinanceCurrencyExchange.create({
            company_id: companyId,
            cash_register_id: cashRegisterId,
            session_id: sessionId,
            exchange_number: exchangeNumber,
            exchange_date: new Date(),
            exchange_type: exchangeType,
            from_currency_id: fromCurrencyId,
            from_currency_code: fromCurrency.code,
            from_amount: fromAmount,
            to_currency_id: toCurrencyId,
            to_currency_code: toCurrency.code,
            to_amount: toAmount,
            exchange_rate: exchangeRate,
            rate_type: rateType || 'sell',
            spread_percent: spreadPercent || 0,
            client_type: clientType,
            client_name: clientName,
            client_document: clientDocument,
            description,
            status: 'completed',
            created_by: req.user.user_id
        });

        // Crear movimientos de entrada y salida
        const movementIn = await cashService.createMovement(companyId, {
            cashRegisterId,
            sessionId,
            movementType: 'exchange_in',
            amount: fromAmount,
            currencyId: fromCurrencyId,
            currencyCode: fromCurrency.code,
            exchangeRate,
            sourceModule: 'currency_exchange',
            sourceDocumentId: exchange.id,
            sourceDocumentNumber: exchangeNumber,
            description: `Ingreso cambio: ${fromAmount} ${fromCurrency.code}`,
            createdBy: req.user.user_id
        });

        const movementOut = await cashService.createMovement(companyId, {
            cashRegisterId,
            sessionId,
            movementType: 'exchange_out',
            amount: toAmount,
            currencyId: toCurrencyId,
            currencyCode: toCurrency.code,
            exchangeRate,
            sourceModule: 'currency_exchange',
            sourceDocumentId: exchange.id,
            sourceDocumentNumber: exchangeNumber,
            description: `Egreso cambio: ${toAmount} ${toCurrency.code}`,
            createdBy: req.user.user_id
        });

        // Actualizar exchange con IDs de movimientos
        await exchange.update({
            movement_in_id: movementIn.id,
            movement_out_id: movementOut.id
        });

        res.json({ success: true, data: exchange });
    } catch (error) {
        console.error('Error creating currency exchange:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =========================================================================
// ARRASTRE DE SALDOS (Balance Carryover)
// =========================================================================

/**
 * GET /api/finance/balance-carryovers
 * Obtener historial de arrastres
 */
router.get('/balance-carryovers', auth, async (req, res) => {
    try {
        const { registerId, status, limit, offset } = req.query;
        const companyId = req.user.company_id;

        const where = { company_id: companyId };
        if (registerId) where.cash_register_id = parseInt(registerId);
        if (status) where.status = status;

        const carryovers = await db.FinanceBalanceCarryover.findAndCountAll({
            where,
            include: [
                { model: db.FinanceCashRegister, as: 'cashRegister', attributes: ['id', 'name', 'code'] },
                { model: db.FinanceCurrency, as: 'currency', attributes: ['code', 'name', 'symbol'] },
                { model: db.User, as: 'creator', attributes: ['user_id', 'first_name', 'last_name'] }
            ],
            order: [['carryover_date', 'DESC']],
            limit: parseInt(limit) || 50,
            offset: parseInt(offset) || 0
        });

        res.json({ success: true, data: carryovers.rows, total: carryovers.count });
    } catch (error) {
        console.error('Error getting balance carryovers:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/finance/balance-carryovers/pending/:registerId
 * Obtener saldos pendientes de arrastre para una caja
 */
router.get('/balance-carryovers/pending/:registerId', auth, async (req, res) => {
    try {
        const registerId = parseInt(req.params.registerId);
        const companyId = req.user.company_id;

        const pendingCarryovers = await db.FinanceBalanceCarryover.findAll({
            where: {
                company_id: companyId,
                cash_register_id: registerId,
                status: 'pending'
            },
            include: [
                { model: db.FinanceCurrency, as: 'currency', attributes: ['code', 'name', 'symbol'] }
            ],
            order: [['currency_id', 'ASC']]
        });

        res.json({ success: true, data: pendingCarryovers });
    } catch (error) {
        console.error('Error getting pending carryovers:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/finance/balance-carryovers/create-from-close
 * Crear arrastres al cerrar sesión
 */
router.post('/balance-carryovers/create-from-close', auth, async (req, res) => {
    try {
        const { sessionId, balances, notes } = req.body;
        const companyId = req.user.company_id;

        const session = await db.FinanceCashRegisterSession.findByPk(sessionId);
        if (!session) {
            return res.status(404).json({ success: false, error: 'Sesión no encontrada' });
        }

        const carryovers = [];
        for (const balance of balances) {
            if (parseFloat(balance.amount) > 0) {
                const carryover = await db.FinanceBalanceCarryover.create({
                    company_id: companyId,
                    cash_register_id: session.cash_register_id,
                    from_session_id: sessionId,
                    currency_id: balance.currencyId,
                    currency_code: balance.currencyCode,
                    carryover_amount: balance.amount,
                    exchange_rate: balance.exchangeRate || 1,
                    carryover_date: new Date(),
                    status: 'pending',
                    closing_notes: notes,
                    created_by: req.user.user_id
                });
                carryovers.push(carryover);
            }
        }

        res.json({ success: true, data: carryovers });
    } catch (error) {
        console.error('Error creating carryovers from close:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/finance/balance-carryovers/apply-to-session
 * Aplicar arrastres pendientes a nueva sesión
 */
router.post('/balance-carryovers/apply-to-session', auth, async (req, res) => {
    try {
        const { sessionId, carryoverIds, notes } = req.body;
        const { Op } = require('sequelize');

        const appliedCarryovers = [];
        for (const carryoverId of carryoverIds) {
            const carryover = await db.FinanceBalanceCarryover.findByPk(carryoverId);
            if (carryover && carryover.status === 'pending') {
                await carryover.update({
                    to_session_id: sessionId,
                    applied_at: new Date(),
                    applied_by: req.user.user_id,
                    opening_notes: notes,
                    status: 'applied'
                });
                appliedCarryovers.push(carryover);
            }
        }

        res.json({ success: true, data: appliedCarryovers });
    } catch (error) {
        console.error('Error applying carryovers:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// =========================================================================
// SALDOS POR SESIÓN MULTI-MONEDA
// =========================================================================

/**
 * GET /api/finance/session-balances/:sessionId
 * Obtener saldos multi-moneda de una sesión
 */
router.get('/session-balances/:sessionId', auth, async (req, res) => {
    try {
        const sessionId = parseInt(req.params.sessionId);

        const balances = await db.FinanceCashSessionBalance.findAll({
            where: { session_id: sessionId },
            include: [
                { model: db.FinanceCurrency, as: 'currency', attributes: ['code', 'name', 'symbol', 'decimal_places'] }
            ],
            order: [['currency_code', 'ASC']]
        });

        res.json({ success: true, data: balances });
    } catch (error) {
        console.error('Error getting session balances:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * PUT /api/finance/session-balances/:id/reconcile
 * Reconciliar saldo de moneda en sesión
 */
router.put('/session-balances/:id/reconcile', auth, async (req, res) => {
    try {
        const balanceId = parseInt(req.params.id);
        const { closingBalance, cashCountDetail } = req.body;

        const balance = await db.FinanceCashSessionBalance.findByPk(balanceId);
        if (!balance) {
            return res.status(404).json({ success: false, error: 'Saldo no encontrado' });
        }

        const difference = parseFloat(closingBalance) - parseFloat(balance.current_balance);

        await balance.update({
            closing_balance: closingBalance,
            system_balance: balance.current_balance,
            difference,
            cash_count_detail: cashCountDetail || {},
            is_reconciled: true,
            reconciled_at: new Date(),
            reconciled_by: req.user.user_id
        });

        res.json({ success: true, data: balance });
    } catch (error) {
        console.error('Error reconciling session balance:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
