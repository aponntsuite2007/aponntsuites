/**
 * Finance Enterprise SSOT - Plan de Cuentas y Asientos
 * Rutas para Chart of Accounts, Cost Centers, Journal Entries
 */

const express = require('express');
const router = express.Router();
const db = require('../config/database');
const FinanceAutoPostingService = require('../services/FinanceAutoPostingService');
const { auth } = require('../middleware/auth');

// =============================================
// PLAN DE CUENTAS (Chart of Accounts)
// =============================================

/**
 * GET /api/finance/accounts/chart
 * Listar plan de cuentas
 */
router.get('/chart', auth, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const { level, account_type, is_active, parent_id } = req.query;

        const where = { company_id: companyId };

        if (level) where.level = parseInt(level);
        if (account_type) where.account_type = account_type;
        if (is_active !== undefined) where.is_active = is_active === 'true';
        if (parent_id) where.parent_id = parseInt(parent_id);

        const accounts = await db.FinanceChartOfAccounts.findAll({
            where,
            order: [['account_number', 'ASC']],
            include: [{
                model: db.FinanceChartOfAccounts,
                as: 'parent',
                attributes: ['id', 'account_code', 'name']
            }]
        });

        res.json({
            success: true,
            data: accounts,
            count: accounts.length
        });
    } catch (error) {
        console.error('Error listing chart of accounts:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/finance/accounts/chart/tree
 * Plan de cuentas en estructura de árbol
 */
router.get('/chart/tree', auth, async (req, res) => {
    try {
        const companyId = req.user.company_id;

        const tree = await db.FinanceChartOfAccounts.getAccountTree(companyId);

        res.json({
            success: true,
            data: tree
        });
    } catch (error) {
        console.error('Error getting account tree:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/finance/accounts/chart/:id
 * Obtener cuenta por ID
 */
router.get('/chart/:id', auth, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const { id } = req.params;

        const account = await db.FinanceChartOfAccounts.findOne({
            where: { id, company_id: companyId },
            include: [
                { model: db.FinanceChartOfAccounts, as: 'parent' },
                { model: db.FinanceChartOfAccounts, as: 'children' }
            ]
        });

        if (!account) {
            return res.status(404).json({
                success: false,
                error: 'Cuenta no encontrada'
            });
        }

        res.json({
            success: true,
            data: account
        });
    } catch (error) {
        console.error('Error getting account:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/finance/accounts/chart
 * Crear nueva cuenta
 */
router.post('/chart', auth, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const userId = req.user.user_id;

        const accountData = {
            ...req.body,
            company_id: companyId,
            created_by: userId
        };

        // Calcular account_number desde account_code
        if (accountData.account_code) {
            accountData.account_number = parseInt(accountData.account_code.replace(/\./g, '').padEnd(7, '0'));
        }

        const account = await db.FinanceChartOfAccounts.create(accountData);

        res.status(201).json({
            success: true,
            message: 'Cuenta creada correctamente',
            data: account
        });
    } catch (error) {
        console.error('Error creating account:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * PUT /api/finance/accounts/chart/:id
 * Actualizar cuenta
 */
router.put('/chart/:id', auth, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const { id } = req.params;

        const account = await db.FinanceChartOfAccounts.findOne({
            where: { id, company_id: companyId }
        });

        if (!account) {
            return res.status(404).json({
                success: false,
                error: 'Cuenta no encontrada'
            });
        }

        await account.update(req.body);

        res.json({
            success: true,
            message: 'Cuenta actualizada correctamente',
            data: account
        });
    } catch (error) {
        console.error('Error updating account:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * DELETE /api/finance/accounts/chart/:id
 * Eliminar cuenta (solo si no tiene movimientos)
 */
router.delete('/chart/:id', auth, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const { id } = req.params;

        const account = await db.FinanceChartOfAccounts.findOne({
            where: { id, company_id: companyId }
        });

        if (!account) {
            return res.status(404).json({
                success: false,
                error: 'Cuenta no encontrada'
            });
        }

        // Verificar que no tenga movimientos
        const movementsCount = await db.FinanceJournalEntryLine.count({
            where: { account_id: id }
        });

        if (movementsCount > 0) {
            return res.status(400).json({
                success: false,
                error: `No se puede eliminar: cuenta tiene ${movementsCount} movimientos`
            });
        }

        // Verificar que no tenga hijos
        const childrenCount = await db.FinanceChartOfAccounts.count({
            where: { parent_id: id }
        });

        if (childrenCount > 0) {
            return res.status(400).json({
                success: false,
                error: `No se puede eliminar: cuenta tiene ${childrenCount} subcuentas`
            });
        }

        await account.destroy();

        res.json({
            success: true,
            message: 'Cuenta eliminada correctamente'
        });
    } catch (error) {
        console.error('Error deleting account:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// =============================================
// CENTROS DE COSTO
// =============================================

/**
 * GET /api/finance/accounts/cost-centers
 * Listar centros de costo
 */
router.get('/cost-centers', auth, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const { level, center_type, is_active } = req.query;

        const where = { company_id: companyId };

        if (level) where.level = parseInt(level);
        if (center_type) where.center_type = center_type;
        if (is_active !== undefined) where.is_active = is_active === 'true';

        const costCenters = await db.FinanceCostCenter.findAll({
            where,
            order: [['path', 'ASC']],
            include: [
                { model: db.FinanceCostCenter, as: 'parent', attributes: ['id', 'code', 'name'] },
                { model: db.Department, as: 'department', attributes: ['id', 'name'] }
            ]
        });

        res.json({
            success: true,
            data: costCenters,
            count: costCenters.length
        });
    } catch (error) {
        console.error('Error listing cost centers:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/finance/accounts/cost-centers/tree
 * Centros de costo en estructura de árbol
 */
router.get('/cost-centers/tree', auth, async (req, res) => {
    try {
        const companyId = req.user.company_id;

        const tree = await db.FinanceCostCenter.getHierarchy(companyId);

        res.json({
            success: true,
            data: tree
        });
    } catch (error) {
        console.error('Error getting cost center tree:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/finance/accounts/cost-centers
 * Crear centro de costo
 */
router.post('/cost-centers', auth, async (req, res) => {
    try {
        const companyId = req.user.company_id;

        const costCenterData = {
            ...req.body,
            company_id: companyId
        };

        // Calcular path si tiene parent
        if (costCenterData.parent_id) {
            const parent = await db.FinanceCostCenter.findByPk(costCenterData.parent_id);
            if (parent) {
                costCenterData.path = parent.path ? `${parent.path}.${costCenterData.code}` : costCenterData.code;
                costCenterData.level = parent.level + 1;
            }
        } else {
            costCenterData.path = costCenterData.code;
            costCenterData.level = 1;
        }

        const costCenter = await db.FinanceCostCenter.create(costCenterData);

        res.status(201).json({
            success: true,
            message: 'Centro de costo creado correctamente',
            data: costCenter
        });
    } catch (error) {
        console.error('Error creating cost center:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * PUT /api/finance/accounts/cost-centers/:id
 * Actualizar centro de costo
 */
router.put('/cost-centers/:id', auth, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const { id } = req.params;

        const costCenter = await db.FinanceCostCenter.findOne({
            where: { id, company_id: companyId }
        });

        if (!costCenter) {
            return res.status(404).json({
                success: false,
                error: 'Centro de costo no encontrado'
            });
        }

        await costCenter.update(req.body);

        res.json({
            success: true,
            message: 'Centro de costo actualizado correctamente',
            data: costCenter
        });
    } catch (error) {
        console.error('Error updating cost center:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// =============================================
// PERÍODOS FISCALES
// =============================================

/**
 * GET /api/finance/accounts/fiscal-periods
 * Listar períodos fiscales
 */
router.get('/fiscal-periods', auth, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const { fiscal_year, status } = req.query;

        const where = { company_id: companyId };

        if (fiscal_year) where.fiscal_year = parseInt(fiscal_year);
        if (status) where.status = status;

        const periods = await db.FinanceFiscalPeriod.findAll({
            where,
            order: [['fiscal_year', 'DESC'], ['period_number', 'ASC']]
        });

        res.json({
            success: true,
            data: periods,
            count: periods.length
        });
    } catch (error) {
        console.error('Error listing fiscal periods:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/finance/accounts/fiscal-periods/current
 * Obtener período fiscal actual
 */
router.get('/fiscal-periods/current', auth, async (req, res) => {
    try {
        const companyId = req.user.company_id;

        const current = await db.FinanceFiscalPeriod.getCurrent(companyId);

        res.json({
            success: true,
            data: current
        });
    } catch (error) {
        console.error('Error getting current period:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/finance/accounts/fiscal-periods/create-year
 * Crear períodos para un año fiscal
 */
router.post('/fiscal-periods/create-year', auth, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const { fiscal_year } = req.body;

        if (!fiscal_year) {
            return res.status(400).json({
                success: false,
                error: 'fiscal_year es requerido'
            });
        }

        const periods = await db.FinanceFiscalPeriod.createYearPeriods(companyId, fiscal_year);

        res.status(201).json({
            success: true,
            message: `${periods.length} períodos creados para el año ${fiscal_year}`,
            data: periods
        });
    } catch (error) {
        console.error('Error creating fiscal periods:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * PUT /api/finance/accounts/fiscal-periods/:id/status
 * Cambiar estado de un período (open, closed, locked)
 */
router.put('/fiscal-periods/:id/status', auth, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const userId = req.user.user_id;
        const { id } = req.params;
        const { status } = req.body;

        const period = await db.FinanceFiscalPeriod.findOne({
            where: { id, company_id: companyId }
        });

        if (!period) {
            return res.status(404).json({
                success: false,
                error: 'Período no encontrado'
            });
        }

        if (!['open', 'closed', 'locked'].includes(status)) {
            return res.status(400).json({
                success: false,
                error: 'Estado inválido. Usar: open, closed, locked'
            });
        }

        const updateData = { status };

        if (status === 'closed') {
            updateData.closed_at = new Date();
            updateData.closed_by = userId;
        } else if (status === 'locked') {
            updateData.locked_at = new Date();
            updateData.locked_by = userId;
        }

        await period.update(updateData);

        res.json({
            success: true,
            message: `Período ${period.period_name} cambiado a ${status}`,
            data: period
        });
    } catch (error) {
        console.error('Error changing period status:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// =============================================
// ASIENTOS CONTABLES (Journal Entries)
// =============================================

/**
 * GET /api/finance/accounts/journal-entries
 * Listar asientos contables
 */
router.get('/journal-entries', auth, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const { fiscal_year, fiscal_period, status, source_type, limit = 50, offset = 0 } = req.query;

        const where = { company_id: companyId };

        if (fiscal_year) where.fiscal_year = parseInt(fiscal_year);
        if (fiscal_period) where.fiscal_period = parseInt(fiscal_period);
        if (status) where.status = status;
        if (source_type) where.source_type = source_type;

        const { rows: entries, count } = await db.FinanceJournalEntry.findAndCountAll({
            where,
            order: [['entry_date', 'DESC'], ['entry_number', 'DESC']],
            limit: parseInt(limit),
            offset: parseInt(offset),
            include: [{
                model: db.FinanceJournalEntryLine,
                as: 'lines',
                include: [{
                    model: db.FinanceChartOfAccounts,
                    as: 'account',
                    attributes: ['id', 'account_code', 'name']
                }]
            }]
        });

        res.json({
            success: true,
            data: entries,
            pagination: {
                total: count,
                limit: parseInt(limit),
                offset: parseInt(offset)
            }
        });
    } catch (error) {
        console.error('Error listing journal entries:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/finance/accounts/journal-entries/:id
 * Obtener asiento por ID
 */
router.get('/journal-entries/:id', auth, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const { id } = req.params;

        const entry = await db.FinanceJournalEntry.findOne({
            where: { id, company_id: companyId },
            include: [{
                model: db.FinanceJournalEntryLine,
                as: 'lines',
                include: [
                    { model: db.FinanceChartOfAccounts, as: 'account' },
                    { model: db.FinanceCostCenter, as: 'costCenter' }
                ]
            }]
        });

        if (!entry) {
            return res.status(404).json({
                success: false,
                error: 'Asiento no encontrado'
            });
        }

        res.json({
            success: true,
            data: entry
        });
    } catch (error) {
        console.error('Error getting journal entry:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/finance/accounts/journal-entries
 * Crear asiento contable manual
 */
router.post('/journal-entries', auth, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const userId = req.user.user_id;
        const { entry_date, description, reference, lines } = req.body;

        if (!lines || lines.length < 2) {
            return res.status(400).json({
                success: false,
                error: 'Un asiento debe tener al menos 2 líneas'
            });
        }

        // Verificar que cuadra (debits = credits)
        let totalDebit = 0;
        let totalCredit = 0;
        for (const line of lines) {
            totalDebit += parseFloat(line.debit_amount) || 0;
            totalCredit += parseFloat(line.credit_amount) || 0;
        }

        if (Math.abs(totalDebit - totalCredit) > 0.01) {
            return res.status(400).json({
                success: false,
                error: `Asiento descuadrado: Débitos (${totalDebit}) ≠ Créditos (${totalCredit})`
            });
        }

        // Obtener período fiscal
        const period = await db.FinanceFiscalPeriod.getByDate(companyId, new Date(entry_date));
        if (!period) {
            return res.status(400).json({
                success: false,
                error: 'No existe período fiscal para la fecha indicada'
            });
        }

        if (period.status !== 'open') {
            return res.status(400).json({
                success: false,
                error: `Período ${period.period_name} está ${period.status}`
            });
        }

        // Generar número de asiento
        const lastEntry = await db.FinanceJournalEntry.findOne({
            where: {
                company_id: companyId,
                fiscal_year: period.fiscal_year
            },
            order: [['entry_number', 'DESC']]
        });

        const entryNumber = lastEntry
            ? `${period.fiscal_year}-${(parseInt(lastEntry.entry_number.split('-')[1]) + 1).toString().padStart(6, '0')}`
            : `${period.fiscal_year}-000001`;

        // Crear asiento
        const entry = await db.FinanceJournalEntry.create({
            company_id: companyId,
            entry_number: entryNumber,
            fiscal_year: period.fiscal_year,
            fiscal_period: period.period_number,
            entry_date: new Date(entry_date),
            posting_date: new Date(),
            entry_type: 'standard',
            source_type: 'manual',
            description,
            reference,
            currency: 'ARS',
            total_debit: totalDebit,
            total_credit: totalCredit,
            status: 'draft',
            created_by: userId
        });

        // Crear líneas
        let lineNumber = 1;
        for (const line of lines) {
            await db.FinanceJournalEntryLine.create({
                journal_entry_id: entry.id,
                line_number: lineNumber++,
                account_id: line.account_id,
                cost_center_id: line.cost_center_id,
                debit_amount: parseFloat(line.debit_amount) || 0,
                credit_amount: parseFloat(line.credit_amount) || 0,
                description: line.description
            });
        }

        // Recargar con líneas
        const createdEntry = await db.FinanceJournalEntry.findByPk(entry.id, {
            include: [{ model: db.FinanceJournalEntryLine, as: 'lines' }]
        });

        res.status(201).json({
            success: true,
            message: 'Asiento creado correctamente',
            data: createdEntry
        });
    } catch (error) {
        console.error('Error creating journal entry:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/finance/accounts/journal-entries/:id/post
 * Contabilizar (mayorizar) un asiento
 */
router.post('/journal-entries/:id/post', auth, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const userId = req.user.user_id;
        const { id } = req.params;

        const entry = await db.FinanceJournalEntry.findOne({
            where: { id, company_id: companyId },
            include: [{ model: db.FinanceJournalEntryLine, as: 'lines' }]
        });

        if (!entry) {
            return res.status(404).json({
                success: false,
                error: 'Asiento no encontrado'
            });
        }

        if (entry.status !== 'draft') {
            return res.status(400).json({
                success: false,
                error: `Asiento ya está ${entry.status}`
            });
        }

        // Verificar período abierto
        const period = await db.FinanceFiscalPeriod.findOne({
            where: {
                company_id: companyId,
                fiscal_year: entry.fiscal_year,
                period_number: entry.fiscal_period
            }
        });

        if (period.status !== 'open') {
            return res.status(400).json({
                success: false,
                error: `Período ${period.period_name} está ${period.status}`
            });
        }

        // Actualizar saldos de cuentas
        for (const line of entry.lines) {
            await db.FinanceAccountBalance.updateBalance(
                companyId,
                line.account_id,
                entry.fiscal_year,
                entry.fiscal_period,
                parseFloat(line.debit_amount) || 0,
                parseFloat(line.credit_amount) || 0
            );
        }

        // Marcar como contabilizado
        await entry.update({
            status: 'posted',
            posted_at: new Date(),
            posted_by: userId
        });

        res.json({
            success: true,
            message: 'Asiento contabilizado correctamente',
            data: entry
        });
    } catch (error) {
        console.error('Error posting journal entry:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/finance/accounts/journal-entries/:id/reverse
 * Revertir un asiento contabilizado
 */
router.post('/journal-entries/:id/reverse', auth, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const userId = req.user.user_id;
        const { id } = req.params;
        const { reversal_date, description } = req.body;

        const entry = await db.FinanceJournalEntry.findOne({
            where: { id, company_id: companyId },
            include: [{ model: db.FinanceJournalEntryLine, as: 'lines' }]
        });

        if (!entry) {
            return res.status(404).json({
                success: false,
                error: 'Asiento no encontrado'
            });
        }

        if (entry.status !== 'posted') {
            return res.status(400).json({
                success: false,
                error: 'Solo se pueden revertir asientos contabilizados'
            });
        }

        const reversalEntry = await entry.reverse(userId, description || `Reversión de ${entry.entry_number}`);

        res.json({
            success: true,
            message: 'Asiento revertido correctamente',
            data: reversalEntry
        });
    } catch (error) {
        console.error('Error reversing journal entry:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// =============================================
// DIMENSIONES CONTABLES
// =============================================

/**
 * GET /api/finance/accounts/dimensions
 * Listar dimensiones configuradas
 */
router.get('/dimensions', auth, async (req, res) => {
    try {
        const companyId = req.user.company_id;

        const dimensions = await db.FinanceDimension.findAll({
            where: { company_id: companyId, is_active: true },
            order: [['dimension_number', 'ASC']]
        });

        res.json({
            success: true,
            data: dimensions
        });
    } catch (error) {
        console.error('Error listing dimensions:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/finance/accounts/dimensions/:dimension/values
 * Obtener valores de una dimensión
 */
router.get('/dimensions/:dimension/values', auth, async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const { dimension } = req.params;

        const dim = await db.FinanceDimension.findOne({
            where: { company_id: companyId, dimension_number: parseInt(dimension) }
        });

        if (!dim) {
            return res.status(404).json({
                success: false,
                error: 'Dimensión no encontrada'
            });
        }

        const values = await dim.getValues();

        res.json({
            success: true,
            data: {
                dimension: dim,
                values
            }
        });
    } catch (error) {
        console.error('Error getting dimension values:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
