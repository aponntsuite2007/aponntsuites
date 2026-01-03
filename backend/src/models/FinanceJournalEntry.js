/**
 * FinanceJournalEntry Model
 * Asientos contables con multi-moneda y auto-posting
 * Finance Enterprise SSOT - Módulo Financiero Unificado
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const FinanceJournalEntry = sequelize.define('FinanceJournalEntry', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        company_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: { model: 'companies', key: 'company_id' }
        },
        entry_number: {
            type: DataTypes.STRING(50),
            allowNull: false
        },
        fiscal_year: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        fiscal_period: {
            type: DataTypes.INTEGER,
            allowNull: false,
            comment: '1-12 meses, 13 para ajustes'
        },
        entry_date: {
            type: DataTypes.DATEONLY,
            allowNull: false
        },
        posting_date: {
            type: DataTypes.DATEONLY,
            allowNull: false
        },
        document_date: {
            type: DataTypes.DATEONLY
        },
        entry_type: {
            type: DataTypes.STRING(50),
            allowNull: false,
            validate: {
                isIn: [['standard', 'adjustment', 'closing', 'opening', 'reversal']]
            }
        },
        source_type: {
            type: DataTypes.STRING(50),
            validate: {
                isIn: [['manual', 'payroll', 'billing', 'procurement', 'bank', 'auto', null]]
            }
        },
        source_module: {
            type: DataTypes.STRING(50),
            comment: 'Módulo origen: payroll-liquidation, siac-commercial, etc.'
        },
        source_document_id: {
            type: DataTypes.INTEGER,
            comment: 'FK al documento origen'
        },
        source_document_number: {
            type: DataTypes.STRING(100)
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        reference: {
            type: DataTypes.STRING(200)
        },
        currency: {
            type: DataTypes.STRING(3),
            allowNull: false,
            defaultValue: 'ARS'
        },
        exchange_rate: {
            type: DataTypes.DECIMAL(15, 6),
            defaultValue: 1
        },
        total_debit: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false,
            defaultValue: 0
        },
        total_credit: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false,
            defaultValue: 0
        },
        status: {
            type: DataTypes.STRING(20),
            defaultValue: 'draft',
            validate: {
                isIn: [['draft', 'posted', 'reversed', 'pending_approval']]
            }
        },
        requires_approval: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        approved_by: {
            type: DataTypes.UUID
        },
        approved_at: {
            type: DataTypes.DATE
        },
        is_reversal: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        reversed_entry_id: {
            type: DataTypes.INTEGER,
            references: { model: 'finance_journal_entries', key: 'id' }
        },
        reversal_date: {
            type: DataTypes.DATEONLY
        },
        is_closing_entry: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        posted_at: {
            type: DataTypes.DATE
        },
        posted_by: {
            type: DataTypes.UUID
        },
        created_by: {
            type: DataTypes.UUID
        }
    }, {
        tableName: 'finance_journal_entries',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            { unique: true, fields: ['company_id', 'entry_number', 'fiscal_year'] },
            { fields: ['company_id', 'status'] },
            { fields: ['company_id', 'fiscal_year', 'fiscal_period'] },
            { fields: ['source_module', 'source_document_id'] },
            { fields: ['entry_date'] }
        ]
    });

    // Verificar balance del asiento
    FinanceJournalEntry.prototype.isBalanced = function() {
        return Math.abs(parseFloat(this.total_debit) - parseFloat(this.total_credit)) < 0.01;
    };

    // Recalcular totales desde líneas
    FinanceJournalEntry.prototype.recalculateTotals = async function() {
        const JournalEntryLine = sequelize.models.FinanceJournalEntryLine;

        const totals = await JournalEntryLine.findAll({
            where: { journal_entry_id: this.id },
            attributes: [
                [sequelize.fn('SUM', sequelize.col('debit_amount')), 'total_debit'],
                [sequelize.fn('SUM', sequelize.col('credit_amount')), 'total_credit']
            ],
            raw: true
        });

        this.total_debit = parseFloat(totals[0]?.total_debit) || 0;
        this.total_credit = parseFloat(totals[0]?.total_credit) || 0;

        return this.save();
    };

    // Aprobar asiento
    FinanceJournalEntry.prototype.approve = async function(userId) {
        this.status = 'pending_approval';
        this.approved_by = userId;
        this.approved_at = new Date();
        return this.save();
    };

    // Contabilizar asiento
    FinanceJournalEntry.prototype.post = async function(userId) {
        if (!this.isBalanced()) {
            throw new Error('El asiento no está balanceado');
        }

        // Verificar período abierto
        const FiscalPeriod = sequelize.models.FinanceFiscalPeriod;
        const period = await FiscalPeriod.findOne({
            where: {
                company_id: this.company_id,
                fiscal_year: this.fiscal_year,
                period_number: this.fiscal_period
            }
        });

        if (!period || !period.isOpen()) {
            throw new Error('El período fiscal está cerrado');
        }

        this.status = 'posted';
        this.posted_at = new Date();
        this.posted_by = userId;

        // Actualizar saldos de cuentas
        await this.updateAccountBalances();

        return this.save();
    };

    // Actualizar saldos de cuentas
    FinanceJournalEntry.prototype.updateAccountBalances = async function() {
        const JournalEntryLine = sequelize.models.FinanceJournalEntryLine;
        const AccountBalance = sequelize.models.FinanceAccountBalance;

        const lines = await JournalEntryLine.findAll({
            where: { journal_entry_id: this.id }
        });

        for (const line of lines) {
            await AccountBalance.updateBalance(
                this.company_id,
                line.account_id,
                this.fiscal_year,
                this.fiscal_period,
                parseFloat(line.debit_amount) || 0,
                parseFloat(line.credit_amount) || 0
            );
        }
    };

    // Reversar asiento
    FinanceJournalEntry.prototype.reverse = async function(userId, reversalDate) {
        if (this.status !== 'posted') {
            throw new Error('Solo se pueden reversar asientos contabilizados');
        }

        const JournalEntryLine = sequelize.models.FinanceJournalEntryLine;

        // Crear asiento de reversión
        const reversalEntry = await FinanceJournalEntry.create({
            company_id: this.company_id,
            fiscal_year: this.fiscal_year,
            fiscal_period: this.fiscal_period,
            entry_date: reversalDate,
            posting_date: reversalDate,
            entry_type: 'reversal',
            source_type: 'manual',
            description: `Reversión de asiento ${this.entry_number}`,
            reference: this.entry_number,
            currency: this.currency,
            exchange_rate: this.exchange_rate,
            is_reversal: true,
            reversed_entry_id: this.id,
            created_by: userId
        });

        // Copiar líneas con montos invertidos
        const lines = await JournalEntryLine.findAll({
            where: { journal_entry_id: this.id }
        });

        for (const line of lines) {
            await JournalEntryLine.create({
                journal_entry_id: reversalEntry.id,
                line_number: line.line_number,
                account_id: line.account_id,
                cost_center_id: line.cost_center_id,
                debit_amount: line.credit_amount,  // Invertir
                credit_amount: line.debit_amount,  // Invertir
                description: `Reversión: ${line.description || ''}`,
                aux_type: line.aux_type,
                aux_id: line.aux_id,
                aux_name: line.aux_name
            });
        }

        await reversalEntry.recalculateTotals();
        await reversalEntry.post(userId);

        // Marcar original como reversado
        this.status = 'reversed';
        this.reversal_date = reversalDate;
        await this.save();

        return reversalEntry;
    };

    // Obtener asientos por período
    FinanceJournalEntry.getByPeriod = async function(companyId, fiscalYear, fiscalPeriod) {
        return this.findAll({
            where: {
                company_id: companyId,
                fiscal_year: fiscalYear,
                fiscal_period: fiscalPeriod,
                status: 'posted'
            },
            order: [['entry_date', 'ASC'], ['entry_number', 'ASC']]
        });
    };

    // Obtener asientos por cuenta
    FinanceJournalEntry.getByAccount = async function(companyId, accountId, startDate, endDate) {
        const { Op } = sequelize.Sequelize;
        const JournalEntryLine = sequelize.models.FinanceJournalEntryLine;

        return this.findAll({
            where: {
                company_id: companyId,
                status: 'posted',
                entry_date: { [Op.between]: [startDate, endDate] }
            },
            include: [{
                model: JournalEntryLine,
                as: 'lines',
                where: { account_id: accountId }
            }],
            order: [['entry_date', 'ASC']]
        });
    };

    // Obtener siguiente número de asiento
    FinanceJournalEntry.getNextNumber = async function(companyId, fiscalYear) {
        const lastEntry = await this.findOne({
            where: { company_id: companyId, fiscal_year: fiscalYear },
            order: [['entry_number', 'DESC']]
        });

        if (!lastEntry) {
            return `${fiscalYear}-0001`;
        }

        const lastNumber = parseInt(lastEntry.entry_number.split('-')[1]) || 0;
        return `${fiscalYear}-${(lastNumber + 1).toString().padStart(4, '0')}`;
    };

    // Buscar asientos por documento origen
    FinanceJournalEntry.findBySource = async function(sourceModule, sourceDocumentId) {
        return this.findAll({
            where: {
                source_module: sourceModule,
                source_document_id: sourceDocumentId
            }
        });
    };

    return FinanceJournalEntry;
};
