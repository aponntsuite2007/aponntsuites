/**
 * Petty Cash Service
 * Gestión de Fondos Fijos por departamento
 */

const { Op, literal } = require('sequelize');

class PettyCashService {
    constructor(db) {
        this.db = db;
    }

    // =========================================================================
    // GESTIÓN DE FONDOS FIJOS
    // =========================================================================

    /**
     * Obtener todos los fondos fijos de una empresa
     */
    async getFunds(companyId, options = {}) {
        const { departmentId, isActive = true, includeCustodian = true } = options;

        const where = { company_id: companyId };
        if (departmentId) where.department_id = departmentId;
        if (isActive !== null) where.is_active = isActive;

        const include = [];
        if (includeCustodian) {
            include.push({
                model: this.db.User,
                as: 'custodian',
                attributes: ['user_id', 'name', 'email']
            });
        }
        include.push({
            model: this.db.Department,
            as: 'department',
            attributes: ['id', 'name']
        });

        return this.db.FinancePettyCashFund.findAll({
            where,
            include,
            order: [['name', 'ASC']]
        });
    }

    /**
     * Obtener fondo fijo por ID
     */
    async getFundById(fundId, includeExpenses = false) {
        const include = [
            { model: this.db.User, as: 'custodian', attributes: ['user_id', 'name', 'email'] },
            { model: this.db.Department, as: 'department', attributes: ['id', 'name'] }
        ];

        if (includeExpenses) {
            include.push({
                model: this.db.FinancePettyCashExpense,
                as: 'expenses',
                where: { status: { [Op.ne]: 'replenished' } },
                required: false,
                order: [['expense_date', 'DESC']]
            });
        }

        return this.db.FinancePettyCashFund.findByPk(fundId, { include });
    }

    /**
     * Crear fondo fijo
     */
    async createFund(companyId, data, createdBy) {
        const {
            code,
            name,
            description,
            custodianId,
            departmentId,
            fundAmount,
            currency = 'ARS',
            maxExpenseAmount,
            replenishmentThreshold = 20,
            allowedExpenseCategories = [],
            fundAccountId,
            expenseAccountId,
            mainRegisterId
        } = data;

        // Verificar que no exista código duplicado
        const existing = await this.db.FinancePettyCashFund.findOne({
            where: { company_id: companyId, code }
        });
        if (existing) {
            throw new Error(`Ya existe un fondo fijo con el código ${code}`);
        }

        return this.db.FinancePettyCashFund.create({
            company_id: companyId,
            code,
            name,
            description,
            custodian_id: custodianId,
            department_id: departmentId,
            fund_amount: fundAmount,
            current_balance: fundAmount, // Inicia con el monto total
            currency,
            max_expense_amount: maxExpenseAmount,
            replenishment_threshold: replenishmentThreshold,
            allowed_expense_categories: allowedExpenseCategories,
            fund_account_id: fundAccountId,
            expense_account_id: expenseAccountId,
            main_register_id: mainRegisterId,
            is_active: true,
            created_by: createdBy
        });
    }

    /**
     * Actualizar fondo fijo
     */
    async updateFund(fundId, data) {
        const fund = await this.db.FinancePettyCashFund.findByPk(fundId);
        if (!fund) throw new Error('Fondo fijo no encontrado');

        return fund.update(data);
    }

    // =========================================================================
    // GASTOS DE FONDO FIJO
    // =========================================================================

    /**
     * Obtener gastos de un fondo
     */
    async getExpenses(fundId, options = {}) {
        const { status, dateFrom, dateTo, limit = 100, offset = 0 } = options;

        const where = { fund_id: fundId };
        if (status) where.status = status;
        if (dateFrom || dateTo) {
            where.expense_date = {};
            if (dateFrom) where.expense_date[Op.gte] = dateFrom;
            if (dateTo) where.expense_date[Op.lte] = dateTo;
        }

        return this.db.FinancePettyCashExpense.findAndCountAll({
            where,
            include: [
                { model: this.db.User, as: 'approvedByUser', attributes: ['user_id', 'name'] }
            ],
            order: [['expense_date', 'DESC']],
            limit,
            offset
        });
    }

    /**
     * Registrar gasto de fondo fijo
     */
    async createExpense(fundId, data, createdBy) {
        const fund = await this.db.FinancePettyCashFund.findByPk(fundId);
        if (!fund) throw new Error('Fondo fijo no encontrado');
        if (!fund.is_active) throw new Error('El fondo fijo está inactivo');

        const {
            category,
            description,
            amount,
            hasReceipt = true,
            receiptType,
            receiptNumber,
            receiptDate,
            vendorName,
            vendorTaxId
        } = data;

        // Validar monto máximo
        if (fund.max_expense_amount && parseFloat(amount) > parseFloat(fund.max_expense_amount)) {
            throw new Error(`El monto excede el máximo permitido de $${fund.max_expense_amount}`);
        }

        // Validar categoría permitida
        if (fund.allowed_expense_categories?.length > 0 &&
            !fund.allowed_expense_categories.includes(category)) {
            throw new Error(`La categoría "${category}" no está permitida para este fondo`);
        }

        // Validar saldo disponible
        if (parseFloat(amount) > parseFloat(fund.current_balance)) {
            throw new Error(`Saldo insuficiente. Disponible: $${fund.current_balance}`);
        }

        // Generar número de gasto
        const lastExpense = await this.db.FinancePettyCashExpense.findOne({
            where: { company_id: fund.company_id },
            order: [['id', 'DESC']]
        });
        const expenseNumber = `GFF-${fund.company_id}-${(lastExpense?.id || 0) + 1}`.padStart(10, '0');

        // Crear gasto
        const expense = await this.db.FinancePettyCashExpense.create({
            company_id: fund.company_id,
            fund_id: fundId,
            expense_number: expenseNumber,
            expense_date: new Date(),
            category,
            description,
            amount,
            has_receipt: hasReceipt,
            receipt_type: receiptType,
            receipt_number: receiptNumber,
            receipt_date: receiptDate,
            vendor_name: vendorName,
            vendor_tax_id: vendorTaxId,
            status: 'pending',
            created_by: createdBy
        });

        // Actualizar saldo del fondo
        await fund.update({
            current_balance: literal(`current_balance - ${amount}`)
        });

        // Verificar si necesita reposición
        const newBalance = parseFloat(fund.current_balance) - parseFloat(amount);
        const threshold = parseFloat(fund.fund_amount) * (parseFloat(fund.replenishment_threshold) / 100);

        if (newBalance <= threshold) {
            expense.setDataValue('replenishment_needed', true);
            expense.setDataValue('current_balance', newBalance);
            expense.setDataValue('threshold', threshold);
        }

        return expense;
    }

    /**
     * Aprobar gasto
     */
    async approveExpense(expenseId, userId, notes = null) {
        const expense = await this.db.FinancePettyCashExpense.findByPk(expenseId);
        if (!expense) throw new Error('Gasto no encontrado');
        if (expense.status !== 'pending') {
            throw new Error(`El gasto ya fue ${expense.status}`);
        }

        return expense.update({
            status: 'approved',
            approved_by: userId,
            approved_at: new Date()
        });
    }

    /**
     * Rechazar gasto
     */
    async rejectExpense(expenseId, userId, reason) {
        if (!reason) throw new Error('Debe proporcionar un motivo de rechazo');

        const expense = await this.db.FinancePettyCashExpense.findByPk(expenseId, {
            include: [{ model: this.db.FinancePettyCashFund, as: 'fund' }]
        });
        if (!expense) throw new Error('Gasto no encontrado');
        if (expense.status !== 'pending') {
            throw new Error(`El gasto ya fue ${expense.status}`);
        }

        // Revertir el saldo al fondo
        await expense.fund.update({
            current_balance: literal(`current_balance + ${expense.amount}`)
        });

        return expense.update({
            status: 'rejected',
            rejection_reason: reason,
            approved_by: userId,
            approved_at: new Date()
        });
    }

    // =========================================================================
    // REPOSICIONES DE FONDO FIJO
    // =========================================================================

    /**
     * Obtener reposiciones de un fondo
     */
    async getReplenishments(fundId, options = {}) {
        const { status, limit = 50, offset = 0 } = options;

        const where = { fund_id: fundId };
        if (status) where.status = status;

        return this.db.FinancePettyCashReplenishment.findAndCountAll({
            where,
            include: [
                { model: this.db.User, as: 'requestedByUser', attributes: ['user_id', 'name'] },
                { model: this.db.FinanceCashRegister, as: 'sourceRegister', attributes: ['id', 'name'] }
            ],
            order: [['replenishment_date', 'DESC']],
            limit,
            offset
        });
    }

    /**
     * Solicitar reposición de fondo fijo
     */
    async requestReplenishment(fundId, data, requestedBy) {
        const fund = await this.db.FinancePettyCashFund.findByPk(fundId);
        if (!fund) throw new Error('Fondo fijo no encontrado');

        const { periodFrom, periodTo, sourceRegisterId, paymentMethodId, notes } = data;

        // Obtener gastos aprobados no repuestos
        const expenses = await this.db.FinancePettyCashExpense.findAll({
            where: {
                fund_id: fundId,
                status: 'approved',
                replenishment_id: null
            }
        });

        if (expenses.length === 0) {
            throw new Error('No hay gastos aprobados pendientes de reposición');
        }

        const totalExpenses = expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);
        const expenseIds = expenses.map(e => e.id);

        // Generar número de reposición
        const lastReplenishment = await this.db.FinancePettyCashReplenishment.findOne({
            where: { company_id: fund.company_id },
            order: [['id', 'DESC']]
        });
        const replenishmentNumber = `REP-${fund.company_id}-${(lastReplenishment?.id || 0) + 1}`.padStart(10, '0');

        // Crear solicitud de reposición
        const replenishment = await this.db.FinancePettyCashReplenishment.create({
            company_id: fund.company_id,
            fund_id: fundId,
            replenishment_number: replenishmentNumber,
            replenishment_date: new Date(),
            period_from: periodFrom,
            period_to: periodTo,
            expense_ids: expenseIds,
            expense_count: expenses.length,
            total_expenses: totalExpenses,
            replenishment_amount: totalExpenses,
            source_register_id: sourceRegisterId,
            payment_method_id: paymentMethodId,
            status: 'pending',
            requested_by: requestedBy,
            requested_at: new Date(),
            notes
        });

        return replenishment;
    }

    /**
     * Aprobar reposición
     */
    async approveReplenishment(replenishmentId, userId) {
        const replenishment = await this.db.FinancePettyCashReplenishment.findByPk(replenishmentId);
        if (!replenishment) throw new Error('Reposición no encontrada');
        if (replenishment.status !== 'pending') {
            throw new Error(`La reposición ya fue ${replenishment.status}`);
        }

        return replenishment.update({
            status: 'approved',
            approved_by: userId,
            approved_at: new Date()
        });
    }

    /**
     * Ejecutar pago de reposición
     */
    async payReplenishment(replenishmentId, userId, cashRegisterService) {
        const replenishment = await this.db.FinancePettyCashReplenishment.findByPk(replenishmentId, {
            include: [
                { model: this.db.FinancePettyCashFund, as: 'fund' },
                { model: this.db.FinanceCashRegister, as: 'sourceRegister' }
            ]
        });

        if (!replenishment) throw new Error('Reposición no encontrada');
        if (replenishment.status !== 'approved') {
            throw new Error('La reposición debe estar aprobada para ejecutar el pago');
        }

        const fund = replenishment.fund;

        // Crear movimiento de salida en la caja origen
        if (replenishment.source_register_id) {
            await cashRegisterService.createMovement(fund.company_id, {
                cashRegisterId: replenishment.source_register_id,
                movementType: 'expense',
                amount: replenishment.replenishment_amount,
                paymentMethodId: replenishment.payment_method_id,
                sourceModule: 'petty_cash_replenishment',
                sourceDocumentId: replenishment.id,
                sourceDocumentNumber: replenishment.replenishment_number,
                category: 'petty_cash',
                description: `Reposición de fondo fijo: ${fund.name}`,
                createdBy: userId
            });
        }

        // Actualizar gastos como repuestos
        await this.db.FinancePettyCashExpense.update(
            { status: 'replenished', replenishment_id: replenishment.id },
            { where: { id: { [Op.in]: replenishment.expense_ids } } }
        );

        // Actualizar saldo del fondo
        await fund.update({
            current_balance: literal(`current_balance + ${replenishment.replenishment_amount}`),
            last_replenishment_date: new Date(),
            last_replenishment_amount: replenishment.replenishment_amount
        });

        // Actualizar reposición
        return replenishment.update({
            status: 'paid',
            paid_by: userId,
            paid_at: new Date()
        });
    }

    // =========================================================================
    // REPORTES
    // =========================================================================

    /**
     * Obtener resumen de fondo fijo
     */
    async getFundSummary(fundId) {
        const fund = await this.db.FinancePettyCashFund.findByPk(fundId);
        if (!fund) throw new Error('Fondo fijo no encontrado');

        const expensesSummary = await this.db.FinancePettyCashExpense.findAll({
            where: { fund_id: fundId },
            attributes: [
                [literal('COUNT(*)'), 'totalExpenses'],
                [literal("SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END)"), 'pendingCount'],
                [literal("SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END)"), 'approvedCount'],
                [literal("SUM(CASE WHEN status = 'replenished' THEN 1 ELSE 0 END)"), 'replenishedCount'],
                [literal("SUM(CASE WHEN status = 'approved' AND replenishment_id IS NULL THEN amount ELSE 0 END)"), 'pendingReplenishment']
            ],
            raw: true
        });

        const threshold = parseFloat(fund.fund_amount) * (parseFloat(fund.replenishment_threshold) / 100);

        return {
            fund: {
                id: fund.id,
                code: fund.code,
                name: fund.name,
                fundAmount: parseFloat(fund.fund_amount),
                currentBalance: parseFloat(fund.current_balance),
                usedAmount: parseFloat(fund.fund_amount) - parseFloat(fund.current_balance),
                usedPercent: ((parseFloat(fund.fund_amount) - parseFloat(fund.current_balance)) / parseFloat(fund.fund_amount) * 100).toFixed(1),
                threshold,
                needsReplenishment: parseFloat(fund.current_balance) <= threshold
            },
            expenses: expensesSummary[0],
            lastReplenishment: {
                date: fund.last_replenishment_date,
                amount: fund.last_replenishment_amount
            }
        };
    }

    /**
     * Obtener gastos por categoría
     */
    async getExpensesByCategory(fundId, dateFrom, dateTo) {
        const where = { fund_id: fundId };
        if (dateFrom || dateTo) {
            where.expense_date = {};
            if (dateFrom) where.expense_date[Op.gte] = dateFrom;
            if (dateTo) where.expense_date[Op.lte] = dateTo;
        }

        return this.db.FinancePettyCashExpense.findAll({
            where,
            attributes: [
                'category',
                [literal('COUNT(*)'), 'count'],
                [literal('SUM(amount)'), 'total']
            ],
            group: ['category'],
            order: [[literal('SUM(amount)'), 'DESC']],
            raw: true
        });
    }
}

module.exports = PettyCashService;
