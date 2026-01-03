/**
 * Finance Enterprise SSOT - Presupuestos
 * Rutas para Budget, Budget Lines, Investments, Inflation
 */

const express = require('express');
const router = express.Router();
const db = require('../config/database');
const FinanceBudgetService = require('../services/FinanceBudgetService');
const { auth } = require('../middleware/auth');

// =============================================
// PRESUPUESTOS
// =============================================

/**
 * GET /api/finance/budget/list
 * Listar presupuestos
 */
router.get('/list', auth, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const { fiscal_year, status, category } = req.query;

        const where = { company_id: companyId };

        if (fiscal_year) where.fiscal_year = parseInt(fiscal_year);
        if (status) where.status = status;
        if (category) where.category = category;

        const budgets = await db.FinanceBudget.findAll({
            where,
            order: [['fiscal_year', 'DESC'], ['created_at', 'DESC']]
        });

        res.json({
            success: true,
            data: budgets,
            count: budgets.length
        });
    } catch (error) {
        console.error('Error listing budgets:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/finance/budget/:id
 * Obtener presupuesto por ID con líneas
 */
router.get('/:id', auth, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const { id } = req.params;

        const budget = await db.FinanceBudget.findOne({
            where: { id, company_id: companyId },
            include: [
                {
                    model: db.FinanceBudgetLine,
                    as: 'lines',
                    include: [
                        { model: db.FinanceChartOfAccounts, as: 'account', attributes: ['id', 'account_code', 'name'] },
                        { model: db.FinanceCostCenter, as: 'costCenter', attributes: ['id', 'code', 'name'] }
                    ]
                },
                {
                    model: db.FinanceBudgetInvestment,
                    as: 'investments'
                }
            ]
        });

        if (!budget) {
            return res.status(404).json({
                success: false,
                error: 'Presupuesto no encontrado'
            });
        }

        res.json({
            success: true,
            data: budget
        });
    } catch (error) {
        console.error('Error getting budget:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/finance/budget
 * Crear presupuesto manualmente
 */
router.post('/', auth, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const userId = req.user.user_id;

        const budgetData = {
            ...req.body,
            company_id: companyId,
            created_by: userId
        };

        const budget = await db.FinanceBudget.create(budgetData);

        res.status(201).json({
            success: true,
            message: 'Presupuesto creado correctamente',
            data: budget
        });
    } catch (error) {
        console.error('Error creating budget:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/finance/budget/generate-from-historical
 * Generar presupuesto desde datos históricos
 */
router.post('/generate-from-historical', auth, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const userId = req.user.user_id;
        const { targetYear, options } = req.body;

        if (!targetYear) {
            return res.status(400).json({
                success: false,
                error: 'targetYear es requerido'
            });
        }

        const budget = await FinanceBudgetService.generateFromHistorical(
            companyId,
            targetYear,
            options || {},
            userId
        );

        res.status(201).json({
            success: true,
            message: `Presupuesto ${targetYear} generado desde datos históricos`,
            data: budget
        });
    } catch (error) {
        console.error('Error generating budget from historical:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * PUT /api/finance/budget/:id
 * Actualizar presupuesto
 */
router.put('/:id', auth, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const { id } = req.params;

        const budget = await db.FinanceBudget.findOne({
            where: { id, company_id: companyId }
        });

        if (!budget) {
            return res.status(404).json({
                success: false,
                error: 'Presupuesto no encontrado'
            });
        }

        if (budget.status === 'locked') {
            return res.status(400).json({
                success: false,
                error: 'Presupuesto está bloqueado'
            });
        }

        await budget.update(req.body);

        res.json({
            success: true,
            message: 'Presupuesto actualizado correctamente',
            data: budget
        });
    } catch (error) {
        console.error('Error updating budget:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * PUT /api/finance/budget/:id/status
 * Cambiar estado del presupuesto
 */
router.put('/:id/status', auth, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const userId = req.user.user_id;
        const { id } = req.params;
        const { status } = req.body;

        const budget = await db.FinanceBudget.findOne({
            where: { id, company_id: companyId }
        });

        if (!budget) {
            return res.status(404).json({
                success: false,
                error: 'Presupuesto no encontrado'
            });
        }

        const validStatuses = ['draft', 'pending_approval', 'approved', 'active', 'closed'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                error: `Estado inválido. Usar: ${validStatuses.join(', ')}`
            });
        }

        const updateData = { status };

        if (status === 'approved') {
            updateData.approved_by = userId;
            updateData.approved_at = new Date();
        }

        await budget.update(updateData);

        res.json({
            success: true,
            message: `Presupuesto cambiado a ${status}`,
            data: budget
        });
    } catch (error) {
        console.error('Error changing budget status:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// =============================================
// LÍNEAS DE PRESUPUESTO
// =============================================

/**
 * GET /api/finance/budget/:id/lines
 * Listar líneas de un presupuesto
 */
router.get('/:id/lines', auth, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const { id } = req.params;
        const { line_type } = req.query;

        // Verificar que el budget pertenece a la empresa
        const budget = await db.FinanceBudget.findOne({
            where: { id, company_id: companyId }
        });

        if (!budget) {
            return res.status(404).json({
                success: false,
                error: 'Presupuesto no encontrado'
            });
        }

        const where = { budget_id: id };
        if (line_type) where.line_type = line_type;

        const lines = await db.FinanceBudgetLine.findAll({
            where,
            include: [
                { model: db.FinanceChartOfAccounts, as: 'account', attributes: ['id', 'account_code', 'name', 'account_type'] },
                { model: db.FinanceCostCenter, as: 'costCenter', attributes: ['id', 'code', 'name'] }
            ],
            order: [['line_type', 'ASC'], ['account_id', 'ASC']]
        });

        res.json({
            success: true,
            data: lines,
            count: lines.length
        });
    } catch (error) {
        console.error('Error listing budget lines:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/finance/budget/:id/lines
 * Agregar línea al presupuesto
 */
router.post('/:id/lines', auth, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const { id } = req.params;

        const budget = await db.FinanceBudget.findOne({
            where: { id, company_id: companyId }
        });

        if (!budget) {
            return res.status(404).json({
                success: false,
                error: 'Presupuesto no encontrado'
            });
        }

        if (!['draft', 'pending_approval'].includes(budget.status)) {
            return res.status(400).json({
                success: false,
                error: 'Solo se pueden agregar líneas a presupuestos en borrador'
            });
        }

        const lineData = {
            ...req.body,
            budget_id: id
        };

        // Calcular annual_total
        let annualTotal = 0;
        for (let i = 1; i <= 13; i++) {
            const periodKey = `period_${i.toString().padStart(2, '0')}`;
            annualTotal += parseFloat(lineData[periodKey]) || 0;
        }
        lineData.annual_total = annualTotal;

        const line = await db.FinanceBudgetLine.create(lineData);

        // Actualizar totales del presupuesto
        await FinanceBudgetService.recalculateBudgetTotals(id);

        res.status(201).json({
            success: true,
            message: 'Línea agregada correctamente',
            data: line
        });
    } catch (error) {
        console.error('Error adding budget line:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * PUT /api/finance/budget/lines/:lineId
 * Actualizar línea de presupuesto
 */
router.put('/lines/:lineId', auth, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const { lineId } = req.params;

        const line = await db.FinanceBudgetLine.findByPk(lineId, {
            include: [{
                model: db.FinanceBudget,
                as: 'budget',
                where: { company_id: companyId }
            }]
        });

        if (!line) {
            return res.status(404).json({
                success: false,
                error: 'Línea no encontrada'
            });
        }

        if (!['draft', 'pending_approval'].includes(line.budget.status)) {
            return res.status(400).json({
                success: false,
                error: 'Solo se pueden modificar líneas de presupuestos en borrador'
            });
        }

        // Recalcular annual_total si se modifican períodos
        const updateData = { ...req.body };
        let annualTotal = 0;
        for (let i = 1; i <= 13; i++) {
            const periodKey = `period_${i.toString().padStart(2, '0')}`;
            const value = updateData[periodKey] !== undefined ? updateData[periodKey] : line[periodKey];
            annualTotal += parseFloat(value) || 0;
        }
        updateData.annual_total = annualTotal;

        await line.update(updateData);

        // Actualizar totales del presupuesto
        await FinanceBudgetService.recalculateBudgetTotals(line.budget_id);

        res.json({
            success: true,
            message: 'Línea actualizada correctamente',
            data: line
        });
    } catch (error) {
        console.error('Error updating budget line:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * DELETE /api/finance/budget/lines/:lineId
 * Eliminar línea de presupuesto
 */
router.delete('/lines/:lineId', auth, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const { lineId } = req.params;

        const line = await db.FinanceBudgetLine.findByPk(lineId, {
            include: [{
                model: db.FinanceBudget,
                as: 'budget',
                where: { company_id: companyId }
            }]
        });

        if (!line) {
            return res.status(404).json({
                success: false,
                error: 'Línea no encontrada'
            });
        }

        if (!['draft', 'pending_approval'].includes(line.budget.status)) {
            return res.status(400).json({
                success: false,
                error: 'Solo se pueden eliminar líneas de presupuestos en borrador'
            });
        }

        const budgetId = line.budget_id;
        await line.destroy();

        // Actualizar totales del presupuesto
        await FinanceBudgetService.recalculateBudgetTotals(budgetId);

        res.json({
            success: true,
            message: 'Línea eliminada correctamente'
        });
    } catch (error) {
        console.error('Error deleting budget line:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// =============================================
// INVERSIONES (CAPEX)
// =============================================

/**
 * GET /api/finance/budget/:id/investments
 * Listar inversiones de un presupuesto
 */
router.get('/:id/investments', auth, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const { id } = req.params;
        const { status, investment_type } = req.query;

        // Verificar que el budget pertenece a la empresa
        const budget = await db.FinanceBudget.findOne({
            where: { id, company_id: companyId }
        });

        if (!budget) {
            return res.status(404).json({
                success: false,
                error: 'Presupuesto no encontrado'
            });
        }

        const where = { budget_id: id };
        if (status) where.status = status;
        if (investment_type) where.investment_type = investment_type;

        const investments = await db.FinanceBudgetInvestment.findAll({
            where,
            include: [
                { model: db.FinanceChartOfAccounts, as: 'assetAccount', attributes: ['id', 'account_code', 'name'] },
                { model: db.FinanceCostCenter, as: 'costCenter', attributes: ['id', 'code', 'name'] }
            ],
            order: [['priority', 'ASC'], ['total_amount', 'DESC']]
        });

        res.json({
            success: true,
            data: investments,
            count: investments.length
        });
    } catch (error) {
        console.error('Error listing investments:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/finance/budget/:id/investments
 * Agregar inversión al presupuesto
 */
router.post('/:id/investments', auth, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const userId = req.user.user_id;
        const { id } = req.params;

        const budget = await db.FinanceBudget.findOne({
            where: { id, company_id: companyId }
        });

        if (!budget) {
            return res.status(404).json({
                success: false,
                error: 'Presupuesto no encontrado'
            });
        }

        const investment = await FinanceBudgetService.addInvestment(id, req.body, userId);

        res.status(201).json({
            success: true,
            message: 'Inversión agregada correctamente',
            data: investment
        });
    } catch (error) {
        console.error('Error adding investment:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * PUT /api/finance/budget/investments/:investmentId
 * Actualizar inversión
 */
router.put('/investments/:investmentId', auth, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const { investmentId } = req.params;

        const investment = await db.FinanceBudgetInvestment.findByPk(investmentId, {
            include: [{
                model: db.FinanceBudget,
                as: 'budget',
                where: { company_id: companyId }
            }]
        });

        if (!investment) {
            return res.status(404).json({
                success: false,
                error: 'Inversión no encontrada'
            });
        }

        await investment.update(req.body);

        // Actualizar totales del presupuesto
        await FinanceBudgetService.recalculateBudgetTotals(investment.budget_id);

        res.json({
            success: true,
            message: 'Inversión actualizada correctamente',
            data: investment
        });
    } catch (error) {
        console.error('Error updating investment:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * PUT /api/finance/budget/investments/:investmentId/status
 * Cambiar estado de inversión
 */
router.put('/investments/:investmentId/status', auth, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const userId = req.user.user_id;
        const { investmentId } = req.params;
        const { status } = req.body;

        const investment = await db.FinanceBudgetInvestment.findByPk(investmentId, {
            include: [{
                model: db.FinanceBudget,
                as: 'budget',
                where: { company_id: companyId }
            }]
        });

        if (!investment) {
            return res.status(404).json({
                success: false,
                error: 'Inversión no encontrada'
            });
        }

        const validStatuses = ['proposed', 'approved', 'in_progress', 'completed', 'cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                error: `Estado inválido. Usar: ${validStatuses.join(', ')}`
            });
        }

        const updateData = { status };

        if (status === 'approved') {
            updateData.approved_by = userId;
            updateData.approved_at = new Date();
        }

        await investment.update(updateData);

        res.json({
            success: true,
            message: `Inversión cambiada a ${status}`,
            data: investment
        });
    } catch (error) {
        console.error('Error changing investment status:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// =============================================
// EJECUCIÓN PRESUPUESTARIA
// =============================================

/**
 * GET /api/finance/budget/:id/execution
 * Ver ejecución presupuestaria
 */
router.get('/:id/execution', auth, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const { id } = req.params;
        const { period } = req.query;

        const budget = await db.FinanceBudget.findOne({
            where: { id, company_id: companyId }
        });

        if (!budget) {
            return res.status(404).json({
                success: false,
                error: 'Presupuesto no encontrado'
            });
        }

        const execution = await FinanceBudgetService.getBudgetVsActual(id, period ? parseInt(period) : null);

        res.json({
            success: true,
            data: execution
        });
    } catch (error) {
        console.error('Error getting budget execution:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/finance/budget/:id/projection
 * Proyección de fin de año
 */
router.get('/:id/projection', auth, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const { id } = req.params;

        const budget = await db.FinanceBudget.findOne({
            where: { id, company_id: companyId }
        });

        if (!budget) {
            return res.status(404).json({
                success: false,
                error: 'Presupuesto no encontrado'
            });
        }

        const projection = await FinanceBudgetService.getYearEndProjection(id);

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

// =============================================
// TASAS DE INFLACIÓN
// =============================================

/**
 * GET /api/finance/budget/inflation-rates
 * Listar tasas de inflación
 */
router.get('/inflation-rates', auth, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const { year } = req.query;

        const where = {};
        if (year) where.year = parseInt(year);

        // Buscar tasas globales (company_id = null) o de la empresa
        const { Op } = db.Sequelize;
        where[Op.or] = [
            { company_id: null },
            { company_id: companyId }
        ];

        const rates = await db.FinanceInflationRate.findAll({
            where,
            order: [['year', 'DESC'], ['month', 'ASC']]
        });

        res.json({
            success: true,
            data: rates
        });
    } catch (error) {
        console.error('Error listing inflation rates:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/finance/budget/inflation-rates
 * Crear/actualizar tasa de inflación
 */
router.post('/inflation-rates', auth, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const { year, month, monthly_rate, source, is_projected } = req.body;

        if (!year || !month || monthly_rate === undefined) {
            return res.status(400).json({
                success: false,
                error: 'year, month y monthly_rate son requeridos'
            });
        }

        // Buscar si ya existe
        const existing = await db.FinanceInflationRate.findOne({
            where: { company_id: companyId, year, month }
        });

        if (existing) {
            await existing.update({ monthly_rate, source, is_projected });
            res.json({
                success: true,
                message: 'Tasa de inflación actualizada',
                data: existing
            });
        } else {
            const rate = await db.FinanceInflationRate.create({
                company_id: companyId,
                year,
                month,
                monthly_rate,
                source,
                is_projected
            });

            res.status(201).json({
                success: true,
                message: 'Tasa de inflación creada',
                data: rate
            });
        }
    } catch (error) {
        console.error('Error creating inflation rate:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
