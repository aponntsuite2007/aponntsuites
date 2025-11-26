/**
 * Rutas API para Sistema Salarial Avanzado
 * Incluye: Convenios Laborales, Categorías Salariales, Config Salarial, Payroll
 */

const express = require('express');
const router = express.Router();
const {
    LaborAgreementsCatalog,
    SalaryCategories,
    UserSalaryConfigV2,
    UserPayrollRecords
} = require('../config/database');

// ============================================================================
// CATÁLOGO DE CONVENIOS LABORALES
// ============================================================================

// GET /api/salary-advanced/labor-agreements - Obtener convenios
router.get('/labor-agreements', async (req, res) => {
    try {
        const data = await LaborAgreementsCatalog.findAll({
            where: { is_active: true },
            order: [['industry', 'ASC'], ['code', 'ASC']]
        });
        res.json({ success: true, data });
    } catch (error) {
        console.error('Error fetching labor agreements:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/salary-advanced/labor-agreements/:id/categories - Categorías por convenio
router.get('/labor-agreements/:id/categories', async (req, res) => {
    try {
        const { id } = req.params;
        const data = await SalaryCategories.findAll({
            where: { labor_agreement_id: id, is_active: true },
            order: [['category_code', 'ASC']]
        });
        res.json({ success: true, data });
    } catch (error) {
        console.error('Error fetching salary categories:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// CATEGORÍAS SALARIALES
// ============================================================================

// GET /api/salary-advanced/categories - Todas las categorías
router.get('/categories', async (req, res) => {
    try {
        const data = await SalaryCategories.findAll({
            where: { is_active: true },
            include: [{ model: LaborAgreementsCatalog, as: 'laborAgreement' }],
            order: [['labor_agreement_id', 'ASC'], ['category_code', 'ASC']]
        });
        res.json({ success: true, data });
    } catch (error) {
        console.error('Error fetching all categories:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// CONFIGURACIÓN SALARIAL DEL USUARIO
// ============================================================================

// GET /api/salary-advanced/config/:userId - Obtener config salarial del usuario
router.get('/config/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { companyId } = req.user || {};
        const { current } = req.query;

        const whereClause = {
            user_id: userId,
            ...(companyId && { company_id: companyId }),
            ...(current === 'true' && { is_current: true })
        };

        const data = await UserSalaryConfigV2.findAll({
            where: whereClause,
            include: [
                { model: LaborAgreementsCatalog, as: 'laborAgreement' },
                { model: SalaryCategories, as: 'salaryCategory' }
            ],
            order: [['is_current', 'DESC'], ['effective_from', 'DESC']]
        });

        res.json({ success: true, data });
    } catch (error) {
        console.error('Error fetching salary config:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/salary-advanced/config/:userId/current - Config actual
router.get('/config/:userId/current', async (req, res) => {
    try {
        const { userId } = req.params;
        const { companyId } = req.user || {};

        const data = await UserSalaryConfigV2.findOne({
            where: {
                user_id: userId,
                is_current: true,
                ...(companyId && { company_id: companyId })
            },
            include: [
                { model: LaborAgreementsCatalog, as: 'laborAgreement' },
                { model: SalaryCategories, as: 'salaryCategory' }
            ]
        });

        res.json({ success: true, data });
    } catch (error) {
        console.error('Error fetching current salary config:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/salary-advanced/config - Crear config salarial
router.post('/config', async (req, res) => {
    try {
        // Si es config actual, desactivar las anteriores
        if (req.body.is_current) {
            await UserSalaryConfigV2.update(
                { is_current: false, effective_to: new Date() },
                { where: { user_id: req.body.user_id, is_current: true } }
            );
        }

        const data = await UserSalaryConfigV2.create(req.body);
        res.json({ success: true, data });
    } catch (error) {
        console.error('Error creating salary config:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// PUT /api/salary-advanced/config/:id - Actualizar config
router.put('/config/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await UserSalaryConfigV2.update(req.body, { where: { id } });
        const data = await UserSalaryConfigV2.findByPk(id, {
            include: [
                { model: LaborAgreementsCatalog, as: 'laborAgreement' },
                { model: SalaryCategories, as: 'salaryCategory' }
            ]
        });
        res.json({ success: true, data });
    } catch (error) {
        console.error('Error updating salary config:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/salary-advanced/config/:userId/update-salary - Actualizar salario (con historial)
router.post('/config/:userId/update-salary', async (req, res) => {
    try {
        const { userId } = req.params;
        const { newBaseSalary, increasePercentage, reason, effectiveFrom } = req.body;

        // Obtener config actual
        const currentConfig = await UserSalaryConfigV2.findOne({
            where: { user_id: userId, is_current: true }
        });

        if (!currentConfig) {
            return res.status(404).json({ success: false, error: 'No current salary config found' });
        }

        // Desactivar config actual
        await UserSalaryConfigV2.update(
            { is_current: false, effective_to: effectiveFrom || new Date() },
            { where: { id: currentConfig.id } }
        );

        // Crear nueva config con salario actualizado
        const newConfig = await UserSalaryConfigV2.create({
            ...currentConfig.toJSON(),
            id: undefined,
            previous_base_salary: currentConfig.base_salary,
            base_salary: newBaseSalary,
            salary_increase_percentage: increasePercentage,
            salary_increase_reason: reason,
            last_salary_update: new Date(),
            effective_from: effectiveFrom || new Date(),
            effective_to: null,
            is_current: true,
            created_at: undefined,
            updated_at: undefined
        });

        res.json({ success: true, data: newConfig, previousSalary: currentConfig.base_salary });
    } catch (error) {
        console.error('Error updating salary:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// REGISTROS DE LIQUIDACIÓN (PAYROLL)
// ============================================================================

// GET /api/salary-advanced/payroll/:userId - Historial de liquidaciones
router.get('/payroll/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { companyId } = req.user || {};
        const { year, limit = 12 } = req.query;

        const whereClause = {
            user_id: userId,
            ...(companyId && { company_id: companyId }),
            ...(year && { period_year: parseInt(year) })
        };

        const data = await UserPayrollRecords.findAll({
            where: whereClause,
            order: [['period_year', 'DESC'], ['period_month', 'DESC']],
            limit: parseInt(limit)
        });

        res.json({ success: true, data });
    } catch (error) {
        console.error('Error fetching payroll records:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/salary-advanced/payroll/:userId/:year/:month - Liquidación específica
router.get('/payroll/:userId/:year/:month', async (req, res) => {
    try {
        const { userId, year, month } = req.params;
        const { companyId } = req.user || {};

        const data = await UserPayrollRecords.findOne({
            where: {
                user_id: userId,
                period_year: parseInt(year),
                period_month: parseInt(month),
                ...(companyId && { company_id: companyId })
            }
        });

        res.json({ success: true, data });
    } catch (error) {
        console.error('Error fetching specific payroll:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/salary-advanced/payroll - Crear liquidación
router.post('/payroll', async (req, res) => {
    try {
        // Verificar si ya existe una liquidación para este período
        const existing = await UserPayrollRecords.findOne({
            where: {
                user_id: req.body.user_id,
                period_year: req.body.period_year,
                period_month: req.body.period_month
            }
        });

        if (existing && existing.status !== 'draft') {
            return res.status(400).json({
                success: false,
                error: 'Ya existe una liquidación para este período',
                existingId: existing.id
            });
        }

        if (existing) {
            // Actualizar borrador existente
            await UserPayrollRecords.update(req.body, { where: { id: existing.id } });
            const data = await UserPayrollRecords.findByPk(existing.id);
            res.json({ success: true, data, updated: true });
        } else {
            // Crear nueva
            const data = await UserPayrollRecords.create(req.body);
            res.json({ success: true, data });
        }
    } catch (error) {
        console.error('Error creating payroll record:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// PUT /api/salary-advanced/payroll/:id - Actualizar liquidación
router.put('/payroll/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const existing = await UserPayrollRecords.findByPk(id);

        if (!existing) {
            return res.status(404).json({ success: false, error: 'Payroll record not found' });
        }

        if (existing.status === 'paid') {
            return res.status(400).json({ success: false, error: 'Cannot modify paid payroll records' });
        }

        await UserPayrollRecords.update(req.body, { where: { id } });
        const data = await UserPayrollRecords.findByPk(id);
        res.json({ success: true, data });
    } catch (error) {
        console.error('Error updating payroll record:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/salary-advanced/payroll/:id/approve - Aprobar liquidación
router.post('/payroll/:id/approve', async (req, res) => {
    try {
        const { id } = req.params;
        const { approvedBy } = req.body;

        await UserPayrollRecords.update(
            { status: 'approved', approved_by: approvedBy },
            { where: { id } }
        );

        const data = await UserPayrollRecords.findByPk(id);
        res.json({ success: true, data });
    } catch (error) {
        console.error('Error approving payroll:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/salary-advanced/payroll/:id/pay - Marcar como pagada
router.post('/payroll/:id/pay', async (req, res) => {
    try {
        const { id } = req.params;
        const { paymentDate, receiptNumber } = req.body;

        await UserPayrollRecords.update(
            {
                status: 'paid',
                payment_date: paymentDate || new Date(),
                receipt_number: receiptNumber
            },
            { where: { id } }
        );

        const data = await UserPayrollRecords.findByPk(id);
        res.json({ success: true, data });
    } catch (error) {
        console.error('Error marking payroll as paid:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================================
// RESUMEN SALARIAL COMPLETO
// ============================================================================

// GET /api/salary-advanced/summary/:userId - Resumen salarial completo
router.get('/summary/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { companyId } = req.user || {};
        const companyFilter = companyId ? { company_id: companyId } : {};

        const currentYear = new Date().getFullYear();

        const [currentConfig, salaryHistory, payrollRecords] = await Promise.all([
            // Config actual
            UserSalaryConfigV2.findOne({
                where: { user_id: userId, is_current: true, ...companyFilter },
                include: [
                    { model: LaborAgreementsCatalog, as: 'laborAgreement' },
                    { model: SalaryCategories, as: 'salaryCategory' }
                ]
            }),
            // Historial de configs (últimas 5)
            UserSalaryConfigV2.findAll({
                where: { user_id: userId, ...companyFilter },
                include: [{ model: LaborAgreementsCatalog, as: 'laborAgreement' }],
                order: [['effective_from', 'DESC']],
                limit: 5
            }),
            // Liquidaciones del año actual
            UserPayrollRecords.findAll({
                where: { user_id: userId, period_year: currentYear, ...companyFilter },
                order: [['period_month', 'DESC']]
            })
        ]);

        // Calcular totales del año
        const yearTotals = payrollRecords.reduce((acc, record) => {
            acc.grossTotal += parseFloat(record.gross_total || 0);
            acc.netTotal += parseFloat(record.net_salary || 0);
            acc.deductionsTotal += parseFloat(record.deductions_total || 0);
            acc.overtimeHours += parseFloat(record.overtime_50_hours || 0) + parseFloat(record.overtime_100_hours || 0);
            acc.overtimeAmount += parseFloat(record.overtime_50_amount || 0) + parseFloat(record.overtime_100_amount || 0);
            return acc;
        }, { grossTotal: 0, netTotal: 0, deductionsTotal: 0, overtimeHours: 0, overtimeAmount: 0 });

        res.json({
            success: true,
            data: {
                currentConfig,
                salaryHistory,
                payrollRecords,
                yearSummary: {
                    year: currentYear,
                    monthsProcessed: payrollRecords.length,
                    ...yearTotals,
                    averageMonthlyGross: payrollRecords.length > 0 ? yearTotals.grossTotal / payrollRecords.length : 0,
                    averageMonthlyNet: payrollRecords.length > 0 ? yearTotals.netTotal / payrollRecords.length : 0
                },
                lastUpdate: currentConfig?.last_salary_update || null,
                previousSalary: currentConfig?.previous_base_salary || null,
                lastIncreasePercentage: currentConfig?.salary_increase_percentage || null
            }
        });
    } catch (error) {
        console.error('Error fetching salary summary:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
