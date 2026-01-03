/**
 * FinanceJournalEntryLine Model
 * Líneas de asiento con 8 dimensiones contables
 * Finance Enterprise SSOT - Módulo Financiero Unificado
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const FinanceJournalEntryLine = sequelize.define('FinanceJournalEntryLine', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        journal_entry_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'finance_journal_entries', key: 'id' },
            onDelete: 'CASCADE'
        },
        line_number: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        account_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'finance_chart_of_accounts', key: 'id' }
        },
        cost_center_id: {
            type: DataTypes.INTEGER,
            references: { model: 'finance_cost_centers', key: 'id' }
        },
        project_id: {
            type: DataTypes.INTEGER,
            references: { model: 'finance_cost_centers', key: 'id' }
        },
        // 8 Dimensiones adicionales (Sage Intacct style)
        dimension_1: {
            type: DataTypes.STRING(50),
            comment: 'Dimensión 1: Sucursal'
        },
        dimension_2: {
            type: DataTypes.STRING(50),
            comment: 'Dimensión 2: Producto/Servicio'
        },
        dimension_3: {
            type: DataTypes.STRING(50),
            comment: 'Dimensión 3: Canal'
        },
        dimension_4: {
            type: DataTypes.STRING(50),
            comment: 'Dimensión 4: Cliente Tipo'
        },
        dimension_5: {
            type: DataTypes.STRING(50),
            comment: 'Dimensión 5: Región'
        },
        dimension_6: {
            type: DataTypes.STRING(50),
            comment: 'Dimensión 6: Campaña'
        },
        dimension_7: {
            type: DataTypes.STRING(50),
            comment: 'Dimensión 7: Contrato'
        },
        dimension_8: {
            type: DataTypes.STRING(50),
            comment: 'Dimensión 8: Personalizada'
        },
        // Auxiliar (detalle de tercero)
        aux_type: {
            type: DataTypes.STRING(50),
            validate: {
                isIn: [['supplier', 'customer', 'employee', 'bank', 'asset', null]]
            },
            comment: 'Tipo de auxiliar'
        },
        aux_id: {
            type: DataTypes.INTEGER,
            comment: 'ID de proveedor, cliente, empleado, etc.'
        },
        aux_name: {
            type: DataTypes.STRING(200),
            comment: 'Nombre para reportes'
        },
        // Montos
        debit_amount: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0
        },
        credit_amount: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0
        },
        // Moneda original (multi-moneda)
        original_currency: {
            type: DataTypes.STRING(3)
        },
        original_amount: {
            type: DataTypes.DECIMAL(15, 2)
        },
        exchange_rate: {
            type: DataTypes.DECIMAL(15, 6)
        },
        // Descripción
        description: {
            type: DataTypes.TEXT
        },
        // Presupuesto
        budget_id: {
            type: DataTypes.INTEGER,
            references: { model: 'finance_budgets', key: 'id' }
        },
        budget_line_id: {
            type: DataTypes.INTEGER,
            references: { model: 'finance_budget_lines', key: 'id' }
        },
        // Reconciliación
        is_reconciled: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        reconciled_at: {
            type: DataTypes.DATE
        },
        reconciliation_id: {
            type: DataTypes.INTEGER
        }
    }, {
        tableName: 'finance_journal_entry_lines',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            { unique: true, fields: ['journal_entry_id', 'line_number'] },
            { fields: ['account_id'] },
            { fields: ['cost_center_id'] },
            { fields: ['aux_type', 'aux_id'] }
        ]
    });

    // Obtener monto neto (débito - crédito)
    FinanceJournalEntryLine.prototype.getNetAmount = function() {
        return parseFloat(this.debit_amount) - parseFloat(this.credit_amount);
    };

    // Verificar si es débito
    FinanceJournalEntryLine.prototype.isDebit = function() {
        return parseFloat(this.debit_amount) > 0;
    };

    // Verificar si es crédito
    FinanceJournalEntryLine.prototype.isCredit = function() {
        return parseFloat(this.credit_amount) > 0;
    };

    // Obtener dimensiones como objeto
    FinanceJournalEntryLine.prototype.getDimensions = function() {
        return {
            dimension_1: this.dimension_1,
            dimension_2: this.dimension_2,
            dimension_3: this.dimension_3,
            dimension_4: this.dimension_4,
            dimension_5: this.dimension_5,
            dimension_6: this.dimension_6,
            dimension_7: this.dimension_7,
            dimension_8: this.dimension_8
        };
    };

    // Establecer dimensiones desde objeto
    FinanceJournalEntryLine.prototype.setDimensions = function(dimensions) {
        for (let i = 1; i <= 8; i++) {
            const key = `dimension_${i}`;
            if (dimensions[key] !== undefined) {
                this[key] = dimensions[key];
            }
        }
    };

    // Marcar como reconciliado
    FinanceJournalEntryLine.prototype.reconcile = async function(reconciliationId) {
        this.is_reconciled = true;
        this.reconciled_at = new Date();
        this.reconciliation_id = reconciliationId;
        return this.save();
    };

    // Obtener líneas por cuenta
    FinanceJournalEntryLine.getByAccount = async function(accountId, startDate, endDate) {
        const { Op } = sequelize.Sequelize;
        const JournalEntry = sequelize.models.FinanceJournalEntry;

        return this.findAll({
            where: { account_id: accountId },
            include: [{
                model: JournalEntry,
                as: 'entry',
                where: {
                    status: 'posted',
                    entry_date: { [Op.between]: [startDate, endDate] }
                }
            }],
            order: [[{ model: JournalEntry, as: 'entry' }, 'entry_date', 'ASC']]
        });
    };

    // Obtener líneas por auxiliar
    FinanceJournalEntryLine.getByAux = async function(auxType, auxId, startDate, endDate) {
        const { Op } = sequelize.Sequelize;
        const JournalEntry = sequelize.models.FinanceJournalEntry;

        return this.findAll({
            where: { aux_type: auxType, aux_id: auxId },
            include: [{
                model: JournalEntry,
                as: 'entry',
                where: {
                    status: 'posted',
                    entry_date: { [Op.between]: [startDate, endDate] }
                }
            }],
            order: [[{ model: JournalEntry, as: 'entry' }, 'entry_date', 'ASC']]
        });
    };

    // Obtener saldo por auxiliar
    FinanceJournalEntryLine.getAuxBalance = async function(auxType, auxId, accountId = null) {
        const { Op } = sequelize.Sequelize;
        const JournalEntry = sequelize.models.FinanceJournalEntry;

        const where = { aux_type: auxType, aux_id: auxId };
        if (accountId) {
            where.account_id = accountId;
        }

        const result = await this.findAll({
            where,
            attributes: [
                [sequelize.fn('SUM', sequelize.col('debit_amount')), 'total_debit'],
                [sequelize.fn('SUM', sequelize.col('credit_amount')), 'total_credit']
            ],
            include: [{
                model: JournalEntry,
                as: 'entry',
                where: { status: 'posted' },
                attributes: []
            }],
            raw: true
        });

        const totalDebit = parseFloat(result[0]?.total_debit) || 0;
        const totalCredit = parseFloat(result[0]?.total_credit) || 0;

        return {
            total_debit: totalDebit,
            total_credit: totalCredit,
            balance: totalDebit - totalCredit
        };
    };

    // Análisis por dimensión
    FinanceJournalEntryLine.analyzeByDimension = async function(companyId, dimensionNumber, fiscalYear, fiscalPeriod = null) {
        const { Op } = sequelize.Sequelize;
        const JournalEntry = sequelize.models.FinanceJournalEntry;

        const dimensionField = `dimension_${dimensionNumber}`;

        const entryWhere = {
            company_id: companyId,
            fiscal_year: fiscalYear,
            status: 'posted'
        };

        if (fiscalPeriod) {
            entryWhere.fiscal_period = fiscalPeriod;
        }

        return this.findAll({
            attributes: [
                [sequelize.col(dimensionField), 'dimension_value'],
                [sequelize.fn('SUM', sequelize.col('debit_amount')), 'total_debit'],
                [sequelize.fn('SUM', sequelize.col('credit_amount')), 'total_credit']
            ],
            include: [{
                model: JournalEntry,
                as: 'entry',
                where: entryWhere,
                attributes: []
            }],
            group: [dimensionField],
            having: sequelize.literal(`${dimensionField} IS NOT NULL`),
            raw: true
        });
    };

    // Líneas no reconciliadas
    FinanceJournalEntryLine.getUnreconciled = async function(accountId) {
        const JournalEntry = sequelize.models.FinanceJournalEntry;

        return this.findAll({
            where: {
                account_id: accountId,
                is_reconciled: false
            },
            include: [{
                model: JournalEntry,
                as: 'entry',
                where: { status: 'posted' }
            }],
            order: [[{ model: JournalEntry, as: 'entry' }, 'entry_date', 'ASC']]
        });
    };

    return FinanceJournalEntryLine;
};
